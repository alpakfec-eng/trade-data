import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TradeData from '@/models/TradeData';
import TempCSVData from '@/models/TempCSVData';
import { resolveGrade, refreshOverridesIfNeeded } from '@/lib/resolveGrade';
import { parseIGMDate, cleanFieldValue, cleanCurrencyField } from '@/lib/gradeExtraction';

export const runtime = 'nodejs';

/**
 * Sanitizes a value for MongoDB storage
 * - Handles Machine No specifically to ensure it's a number
 * - Trims strings
 * - Returns null for empty strings
 */
// helper to test plain object
function isPlainObject(v: any) {
  if (!v || typeof v !== 'object') return false;
  if (Array.isArray(v)) return false;
  // Preserve Date objects as non-plain
  if (v instanceof Date) return false;
  return Object.prototype.toString.call(v) === '[object Object]';
}

function sanitizeValue(value: any, fieldName?: string): string | number | null {
  // Handle null/undefined
  if (value === null || value === undefined) return null;
  
  // Handle Machine No field specifically - convert to number
  if (fieldName === 'Machine No') {
    if (typeof value === 'object') {
      // If it's an empty object, return null
      if (Object.keys(value).length === 0) return null;
      // Try to extract a number from the object by checking common keys then falling back to string extraction
      const candidates = ['value', 'v', '#text', 'text'];
      for (const k of candidates) {
        if (k in value) {
          const cand = (value as any)[k];
          if (typeof cand === 'number') return cand;
          if (typeof cand === 'string') {
            const n = parseFloat(cand);
            if (!isNaN(n)) return n;
          }
        }
      }
      try {
        const strVal = JSON.stringify(value);
        const match = strVal.match(/-?\d+(?:\.\d+)?/);
        return match ? parseFloat(match[0]) : null;
      } catch {
        return null;
      }
    }
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return null;
      const num = parseFloat(trimmed);
      return isNaN(num) ? null : num;
    }
    return null;
  }
  
  // Handle objects and arrays (including empty {})
  if (typeof value === 'object') {
    return null;
  }
  
  // Handle non-string types
  if (typeof value !== 'string') {
    return String(value);
  }
  
  // Trim and check for empty
  const trimmed = value.trim();
  if (trimmed === '') return null;
  
  return trimmed;
}

// Deep clean object tree: remove empty-string keys and ensure nested structures are plain objects/arrays/primitives
function deepClean(value: any): any {
  if (Array.isArray(value)) {
    return value.map(deepClean);
  }
  // Preserve Date objects and other non-plain objects
  if (!isPlainObject(value)) {
    return value;
  }
  const out: any = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === '') continue; // drop empty-string keys
    const cleaned = deepClean(v);
    // skip undefined
    if (cleaned === undefined) continue;
    out[k] = cleaned;
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { tempId, mappings, editedData } = await request.json();

    if (!tempId) {
      return NextResponse.json({ error: 'Temp ID is required' }, { status: 400 });
    }

    // Fetch temp data
    const tempData = await TempCSVData.findById(tempId);
    if (!tempData) {
      return NextResponse.json({ error: 'Temp data not found or expired' }, { status: 404 });
    }

    // Refresh grade overrides cache once before processing batch
    await refreshOverridesIfNeeded();

    // Collect all Item Descriptions for batch grade resolution
    const itemDescriptions = tempData.data.map((row: any) => {
      const csvItemDescField = Object.keys(mappings).find(
        csvField => mappings[csvField] === 'Item Description'
      );
      const value = csvItemDescField ? row[csvItemDescField] : '';
      return typeof value === 'string' ? value : '';
    });

    // Resolve grades in batch for efficiency
    const resolvedGrades = await Promise.all(
      itemDescriptions.map((desc: string) => resolveGrade(desc, true))
    );

    // Apply mappings, edits, and grade extraction
    let transformedData = tempData.data.map((row: any, index: number) => {
      const transformedRow: any = {};
      
      // Apply field mappings
      Object.keys(row).forEach(csvField => {
        const dbFieldRaw = mappings[csvField];
        if (!dbFieldRaw) return;
        // sanitize db field name to avoid dots/empty segments that become Mongo path navigation
        const dbField = typeof dbFieldRaw === 'string' ? dbFieldRaw.replace(/\./g, '').trim() : dbFieldRaw;
        if (!dbField) return;
        
        // Sanitize the value first (pass db field so Machine No is handled specially)
        let value = sanitizeValue(row[csvField], dbField);
        // If value is null, for Machine No explicitly set null in the transformed row,
        // otherwise skip mapping this field.
        if (value === null) {
          if (dbField === 'Machine No') {
            transformedRow['Machine No'] = null;
          }
          return;
        }
        
        // Clean known messy fields
        if (dbField === 'HS CODE' || dbField === 'Origin') {
          value = cleanFieldValue(value as string);
        } else if (dbField === 'Curr' || dbField === 'DECL CURR') {
          value = cleanCurrencyField(value as string);
        } else if (dbField === 'IGM Date') {
          // Parse IGM Date and store both original and parsed versions
          const parsedDate = parseIGMDate(value as string);
          if (parsedDate) {
            transformedRow.parsedIGMDate = parsedDate;
          }
        } else if (dbField === 'CASH DATE') {
          // Also try to parse cash date
          const parsedDate = parseIGMDate(value as string);
          if (parsedDate) {
            transformedRow.parsedCashDate = parsedDate;
          }
        }
        
        if (value !== null) {
          transformedRow[dbField] = value;
        }
      });

      // Add extracted grade fields
      const gradeInfo = resolvedGrades[index];
      if (gradeInfo) {
        // Only allow known polymer types; otherwise store null to avoid schema enum errors
        const allowedPolymerTypes = new Set(['LLDPE','LDPE','HDPE','MDPE','PP','OFFGRADE', null]);
        transformedRow.polymerType = allowedPolymerTypes.has(gradeInfo.polymerType) ? gradeInfo.polymerType : null;
        transformedRow.gradeCode = gradeInfo.gradeCode;
        transformedRow.normalizedGrade = gradeInfo.normalizedGrade;
        transformedRow.gradeExtractionConfidence = gradeInfo.confidence;
      }

      // Apply any edits
      if (editedData && editedData[index]) {
        Object.assign(transformedRow, editedData[index]);
        // If edits introduced a Machine No that is not a number, normalize it to null
        if ('Machine No' in transformedRow) {
          transformedRow['Machine No'] = sanitizeValue(transformedRow['Machine No'], 'Machine No');
        }
      }

      // Also ensure Machine No is normalized even if it came from mappings
      if ('Machine No' in transformedRow) {
        transformedRow['Machine No'] = sanitizeValue(transformedRow['Machine No'], 'Machine No');
      }

      return transformedRow;
    });

    // Ensure every transformed item is an object (somehow a primitive slipped through in mapping/edits)
    transformedData = transformedData.map((r: any) => (typeof r === 'object' && r !== null ? r : {}));

    // Deep-clean each row to remove nested empty-string keys and other problematic shapes
    transformedData = transformedData.map((r: any) => deepClean(r));

    // Final safety pass: ensure Machine No is always a number or null (catch any odd keys/edits)
    transformedData.forEach((row: any, idx: number) => {
      if (typeof row !== 'object' || row === null) return;
      if (typeof row !== 'object' || row === null) return;

      // Ensure polymerType conforms to schema enum - set to null if not allowed
      try {
        const allowedPolymerTypes = new Set(['LLDPE','LDPE','HDPE','MDPE','PP','OFFGRADE', null]);
        if ('polymerType' in row && !allowedPolymerTypes.has(row.polymerType)) {
          row.polymerType = null;
        }
      } catch (err) {
        // ignore
      }

      // If there's an empty-string key, move its value to Machine No if appropriate then delete it
      if (Object.prototype.hasOwnProperty.call(row, '')) {
        try {
          const emptyVal = row[''];
          // if Machine No not already set, try to use empty key as Machine No
          if (!Object.prototype.hasOwnProperty.call(row, 'Machine No')) {
            row['Machine No'] = sanitizeValue(emptyVal, 'Machine No');
          }
        } catch (err) {
          console.warn('Error handling empty-string key for row', idx, err);
        }
        // remove the empty key to avoid Mongoose issues
        try { delete row['']; } catch {}
      }

      // If exact key present, sanitize it
      if (Object.prototype.hasOwnProperty.call(row, 'Machine No')) {
        row['Machine No'] = sanitizeValue(row['Machine No'], 'Machine No');
        return;
      }
      // Otherwise, detect any key that semantically matches 'Machine No' (ignore punctuation/case)
      for (const k of Object.keys(row)) {
        try {
          const norm = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (norm === 'machineno') {
            row['Machine No'] = sanitizeValue(row[k], 'Machine No');
            break;
          }
        } catch (err) {
          // Defensive: if key processing fails, skip
          console.warn('Error normalizing Machine No key for row', idx, k, err);
        }
      }
      // If still no Machine No key, explicitly set it to null to avoid cast issues
      if (!Object.prototype.hasOwnProperty.call(row, 'Machine No')) {
        row['Machine No'] = null;
      }
    });

    // Insert data into database
    let insertedData;
    try {
      insertedData = await TradeData.insertMany(transformedData);
    } catch (e) {
      console.error('InsertMany failed:', e);
      // Log a small sample of transformedData to help debugging
      try {
        console.error('Sample transformed rows:', JSON.stringify(transformedData.slice(0, 5)));
      } catch (jsonErr) {
        console.error('Could not stringify transformedData sample', jsonErr);
      }
      throw e; // rethrow so outer catch returns 500 as before
    }

    // Clean up temp data
    await TempCSVData.findByIdAndDelete(tempId);


    // Summary statistics
    const gradeStats = {
      total: insertedData.length,
      withGrade: resolvedGrades.filter(g => g.normalizedGrade).length,
      highConfidence: resolvedGrades.filter(g => g.confidence === 'high').length,
      mediumConfidence: resolvedGrades.filter(g => g.confidence === 'medium').length,
      lowConfidence: resolvedGrades.filter(g => g.confidence === 'low').length,
    };

    return NextResponse.json({
      message: 'Data imported successfully',
      insertedCount: insertedData.length,
      gradeStats,
    }, { status: 201 });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
