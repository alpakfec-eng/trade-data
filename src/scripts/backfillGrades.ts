/**
 * Backfill Grades Migration Script
 * 
 * One-time script to populate grade extraction fields on all existing
 * TradeData documents. Run with: npm run backfill-grades
 * 
 * Options:
 *   --force    Reprocess all documents (even those with normalizedGrade)
 *   --dry-run  Show what would be updated without making changes
 *   --limit N  Process only N documents (for testing)
 */

// IMPORTANT: Load environment variables BEFORE any other imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import TradeData from '../models/TradeData';
import { resolveGrade, refreshOverridesIfNeeded } from '../lib/resolveGrade';
import { parseIGMDate, cleanFieldValue, cleanCurrencyField } from '../lib/gradeExtraction';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not defined');
  process.exit(1);
}

interface BackfillStats {
  totalProcessed: number;
  updated: number;
  skipped: number;
  errors: number;
  confidenceCounts: {
    high: number;
    medium: number;
    low: number;
    null: number;
  };
  nullGradeCount: number;
}

interface LowConfidenceRecord {
  recordId: string;
  itemDescription: string;
  polymerType: string | null;
  gradeCode: string | null;
  normalizedGrade: string | null;
  confidence: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const forceMode = args.includes('--force');
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit'));
const limit = limitArg ? parseInt(limitArg.split('=')[1] || limitArg.replace('--limit', '')) : null;

async function connectDB() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

async function backfillGrades(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    totalProcessed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    confidenceCounts: { high: 0, medium: 0, low: 0, null: 0 },
    nullGradeCount: 0,
  };

  const lowConfidenceRecords: LowConfidenceRecord[] = [];

  // Refresh overrides cache
  await refreshOverridesIfNeeded();

  // Build query
  const query = forceMode ? {} : { normalizedGrade: { $exists: false } };
  
  // Get total count
  const totalCount = await TradeData.countDocuments(query);
  const processCount = limit ? Math.min(limit, totalCount) : totalCount;
  
  console.log(`\nFound ${totalCount} documents to process${limit ? ` (limited to ${processCount})` : ''}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}`);
  console.log(`Force mode: ${forceMode ? 'Yes (reprocessing all)' : 'No (only documents without normalizedGrade)'}`);
  console.log('');

  if (processCount === 0) {
    console.log('No documents to process. Use --force to reprocess all documents.');
    return stats;
  }

  // Process in batches of 1000
  const batchSize = 1000;
  let processed = 0;

  while (processed < processCount) {
    // Fetch batch
    const docs = await TradeData.find(query)
      .skip(processed)
      .limit(Math.min(batchSize, processCount - processed))
      .lean();

    if (docs.length === 0) break;

    // Prepare bulk operations
    const bulkOps: any[] = [];

    for (const doc of docs) {
      try {
        const itemDescription = doc['Item Description'] || '';
        
        // Resolve grade
        const gradeInfo = await resolveGrade(itemDescription, true);

        // Parse dates
        const parsedIGMDate = parseIGMDate(doc['IGM Date']);
        const parsedCashDate = parseIGMDate(doc['CASH DATE']);

        // Clean fields
        const cleanedHSCode = cleanFieldValue(doc['HS CODE']);
        const cleanedOrigin = cleanFieldValue(doc['Origin']);
        const cleanedCurr = cleanCurrencyField(doc['Curr']);
        const cleanedDeclCurr = cleanCurrencyField(doc['DECL CURR']);

        // Build update object
        const updateData: any = {
          polymerType: gradeInfo.polymerType,
          gradeCode: gradeInfo.gradeCode,
          normalizedGrade: gradeInfo.normalizedGrade,
          gradeExtractionConfidence: gradeInfo.confidence,
        };

        // Add parsed dates
        if (parsedIGMDate) updateData.parsedIGMDate = parsedIGMDate;
        if (parsedCashDate) updateData.parsedCashDate = parsedCashDate;

        // Add cleaned fields
        if (cleanedHSCode) updateData['HS CODE'] = cleanedHSCode;
        if (cleanedOrigin) updateData['Origin'] = cleanedOrigin;
        if (cleanedCurr) updateData['Curr'] = cleanedCurr;
        if (cleanedDeclCurr) updateData['DECL CURR'] = cleanedDeclCurr;

        if (!dryRun) {
          bulkOps.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: updateData },
            },
          });
        }

        // Update stats
        stats.totalProcessed++;
        if (gradeInfo.confidence) {
          stats.confidenceCounts[gradeInfo.confidence]++;
        } else {
          stats.confidenceCounts.null++;
        }

        if (!gradeInfo.normalizedGrade) {
          stats.nullGradeCount++;
        }

        // Track low/medium confidence records for review
        if (gradeInfo.confidence === 'low' || gradeInfo.confidence === 'medium') {
          lowConfidenceRecords.push({
            recordId: doc._id.toString(),
            itemDescription: itemDescription.substring(0, 200),
            polymerType: gradeInfo.polymerType,
            gradeCode: gradeInfo.gradeCode,
            normalizedGrade: gradeInfo.normalizedGrade,
            confidence: gradeInfo.confidence || 'none',
          });
        }

      } catch (error) {
        console.error(`Error processing document ${doc._id}:`, error);
        stats.errors++;
      }
    }

    // Execute bulk write
    if (!dryRun && bulkOps.length > 0) {
      await TradeData.bulkWrite(bulkOps);
      stats.updated += bulkOps.length;
    }

    processed += docs.length;

    // Progress update
    const progress = Math.round((processed / processCount) * 100);
    process.stdout.write(`\rProgress: ${processed}/${processCount} (${progress}%)`);
  }

  console.log('\n');

  // Write low confidence records report
  if (lowConfidenceRecords.length > 0) {
    const reportDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `low-confidence-grades-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(lowConfidenceRecords, null, 2));
    console.log(`\nLow/Medium confidence report saved to: ${reportPath}`);
    console.log(`Records needing manual review: ${lowConfidenceRecords.length}`);
  }

  return stats;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Grade Backfill Migration Script');
  console.log('='.repeat(60));

  try {
    await connectDB();
    
    const stats = await backfillGrades();

    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Total processed:    ${stats.totalProcessed}`);
    console.log(`Updated:            ${stats.updated}`);
    console.log(`Skipped:            ${stats.skipped}`);
    console.log(`Errors:             ${stats.errors}`);
    console.log('');
    console.log('Confidence Distribution:');
    console.log(`  High confidence:  ${stats.confidenceCounts.high}`);
    console.log(`  Medium confidence: ${stats.confidenceCounts.medium}`);
    console.log(`  Low confidence:   ${stats.confidenceCounts.low}`);
    console.log(`  Null:             ${stats.confidenceCounts.null}`);
    console.log('');
    console.log(`Records without grade: ${stats.nullGradeCount}`);
    console.log('='.repeat(60));

    if (dryRun) {
      console.log('\nThis was a DRY RUN. No changes were made to the database.');
      console.log('Run without --dry-run to apply changes.');
    }

  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

main();
