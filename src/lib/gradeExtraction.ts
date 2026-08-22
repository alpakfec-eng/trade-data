/**
 * Grade Extraction and Normalization Module
 * 
 * Parses Item Description fields from customs import records to extract
 * polymer type and grade code, producing a normalized grade identifier.
 */

export interface ExtractedGrade {
  polymerType: string | null;      // LLDPE | LDPE | HDPE | MDPE | PP
  gradeCode: string | null;        // e.g., "Q1018H"
  normalizedGrade: string | null;  // e.g., "LLDPE Q1018H"
  confidence: 'high' | 'medium' | 'low';
}

// Polymer type patterns - order matters! Check longer/more specific first
const POLYMER_PATTERNS = [
  // OFFGRADE should be detected first to group all 'off grade' items together
  { pattern: /\bOFF[-\s]?GRADE\b/i, name: 'OFFGRADE' },
  { pattern: /\bLLDPE\b/i, name: 'LLDPE' },  // Linear Low Density Polyethylene
  { pattern: /\bLDPE\b/i, name: 'LDPE' },    // Low Density Polyethylene  
  { pattern: /\bHDPE\b/i, name: 'HDPE' },    // High Density Polyethylene
  { pattern: /\bMDPE\b/i, name: 'MDPE' },    // Medium Density Polyethylene
  // PP needs special handling - only match standalone, not in words like "APPROX" or "PACKED IN PP BAGS"
  // Will be handled separately below
  // Full names as fallback
  { pattern: /\bLINEAR\s+LOW\s+DENSITY\s+POLYETHYLENE\b/i, name: 'LLDPE' },
  { pattern: /\bLOW\s+DENSITY\s+POLYETHYLENE\b/i, name: 'LDPE' },
  { pattern: /\bHIGH\s+DENSITY\s+POLYETHYLENE\b/i, name: 'HDPE' },
  { pattern: /\bMEDIUM\s+DENSITY\s+POLYETHYLENE\b/i, name: 'MDPE' },
  { pattern: /\bPOLYPROPYLENE\b/i, name: 'PP' },
  { pattern: /\bOFF GRADE\b/i, name: 'OFFRADE' },
];

// Tokens to exclude from grade code detection
const EXCLUDED_TOKENS = new Set([
  'KG', 'KGS', 'MT', 'MTS', 'MM', 'CM', 'M', 'L', 'ML',
  'APPROX', 'NET', 'GROSS', 'WEIGHT', 'TOTAL',
  'USD', 'US', 'PKR', 'EUR', 'CIF', 'FOB',
  'LC', 'BL', 'NO', 'NUM', 'NUMER',
  'BAGS', 'BAG', 'PACKING', 'PACKED', 'NETWEIGHT',
  'QATAR', 'SAUDI', 'UAE', 'CHINA', 'KOREA', 'SINGAPORE',
  'BRAND', 'ORIGIN', 'GRADE', 'TYPE', 'CODE', 'HS',
]);

// HS code pattern (4 digits with optional decimal)
const HS_CODE_PATTERN = /^\d{4}(\.\d+)?$/;

/**
 * Normalizes whitespace and removes extra spaces
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/["'"]/g, '"')
    .trim();
}

/**
 * Detects polymer type from description text
 * Returns the first matching polymer type
 */
function detectPolymerType(description: string): string | null {
  for (const { pattern, name } of POLYMER_PATTERNS) {
    if (pattern.test(description)) {
      return name;
    }
  }
  
  // Special handling for PP - only match standalone "PP" not within words
  // Match PP when it appears as a standalone product identifier, not in phrases like "PP BAGS"
  const ppStandaloneMatch = description.match(/\bPP\b(?!\s*(?:BAGS?|BAG|FILM|SHEET|PACKING))/i);
  if (ppStandaloneMatch) {
    // Additional check: make sure it's not just part of packaging description
    const context = description.toUpperCase();
    // If we find POLYPROPYLENE explicitly, it's definitely PP
    if (/\bPOLYPROPYLENE\b/i.test(description)) {
      return 'PP';
    }
    // Check if PP appears in a product context (not just packaging)
    // Look for patterns like "PP GRADE", "PP Q1018H", standalone "PP"
    const ppProductMatch = description.match(/(?:^|,|\s)PP(?:\s+(?:GRADE|NO\s*[:\-]?\s*[A-Z0-9]+|[A-Z0-9]{3,}))?(?:,|\s|$)/i);
    if (ppProductMatch) {
      return 'PP';
    }
  }
  
  return null;
}

/**
 * Checks if a token looks like a valid grade code
 * Grade codes typically: 3-15 chars, contain both letters and digits,
 * or are short numeric codes (3-5 digits) that appear after polymer type
 */
function isValidGradeCode(token: string, context?: string): boolean {
  // Length check
  if (token.length < 3 || token.length > 15) return false;
  
  // Must contain at least one letter and one digit, OR be a short numeric code
  const hasLetter = /[A-Z]/i.test(token);
  const hasDigit = /\d/.test(token);
  
  // Allow short numeric codes (3-5 digits) that appear to be grade identifiers
  // These are commonly seen after polymer type, e.g., "LDPE 722"
  if (/^\d{3,5}$/.test(token)) {
    // Check context - if preceded by polymer type, it's likely a grade code
    if (context) {
      const polymerTypes = ['LLDPE', 'LDPE', 'HDPE', 'MDPE', 'PP'];
      for (const polymer of polymerTypes) {
        const polymerPattern = new RegExp(`\\b${polymer}\\s+${token}\\b`, 'i');
        if (polymerPattern.test(context)) {
          return true;
        }
      }
    }
    // Without context, we'll be more conservative and reject pure numbers
    // unless they're 3-4 digits (common grade code pattern)
    if (token.length <= 4) {
      return true; // Allow short numeric codes like "722"
    }
    return false;
  }
  
  // Must contain at least one letter and one digit for alphanumeric codes
  if (!hasLetter || !hasDigit) return false;
  
  // Exclude excluded tokens
  if (EXCLUDED_TOKENS.has(token.toUpperCase())) return false;
  
  // Exclude HS-code-like patterns
  if (HS_CODE_PATTERN.test(token)) return false;
  
  // Exclude patterns that look like dates
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return false;
  
  return true;
}

/**
 * Extracts grade code using priority-based detection
 * 
 * Priority order:
 * 1. Explicit "GRADE:" or "GRADE NO" label
 * 2. Code immediately following quoted brand name (e.g., "LOTRENE" Q1018H)
 * 3. First standalone alphanumeric token matching grade code shape
 */
function extractGradeCode(description: string): { code: string | null; confidence: 'high' | 'medium' | 'low' } {
  const normalizedDesc = normalizeText(description);
  
  // Priority 1: Explicit GRADE: or GRADE NO label (highest confidence)
  const gradeLabelMatch = normalizedDesc.match(/GRADE\s*(?:NO\s*)?[:\-]?\s*([A-Z0-9]{3,15})/i);
  if (gradeLabelMatch && isValidGradeCode(gradeLabelMatch[1], normalizedDesc)) {
    return { code: gradeLabelMatch[1].toUpperCase(), confidence: 'high' };
  }
  
  // Priority 2: Code following quoted brand name (e.g., "LOTRENE" Q1018H)
  const quotedBrandMatch = normalizedDesc.match(/"([^"]+)"\s*([A-Z0-9]{3,15})/i);
  if (quotedBrandMatch && isValidGradeCode(quotedBrandMatch[2], normalizedDesc)) {
    return { code: quotedBrandMatch[2].toUpperCase(), confidence: 'high' };
  }
  
  // Priority 3: Look for patterns like "GRADE Q1018H" or just "Q1018H"
  const gradeWordMatch = normalizedDesc.match(/\bGRADE\s+([A-Z0-9]{3,15})\b/i);
  if (gradeWordMatch && isValidGradeCode(gradeWordMatch[1], normalizedDesc)) {
    return { code: gradeWordMatch[1].toUpperCase(), confidence: 'high' };
  }
  
  // Priority 4: First valid alphanumeric token matching grade code shape
  // Split on common delimiters and check each token
  const tokens = normalizedDesc.split(/[\s,;:\-()[\]]+/);
  
  for (const token of tokens) {
    const cleanToken = token.replace(/["']/g, '').trim();
    if (cleanToken && isValidGradeCode(cleanToken, normalizedDesc)) {
      // Medium confidence since we're guessing based on pattern
      return { code: cleanToken.toUpperCase(), confidence: 'medium' };
    }
  }
  
  // No valid grade code found
  return { code: null, confidence: 'low' };
}

/**
 * Main export: Extracts grade information from an Item Description
 * 
 * @param description - Raw Item Description text from customs record
 * @returns ExtractedGrade object with polymerType, gradeCode, normalizedGrade, and confidence
 */
export function extractGrade(description: string): ExtractedGrade {
  if (!description || typeof description !== 'string') {
    return {
      polymerType: null,
      gradeCode: null,
      normalizedGrade: null,
      confidence: 'low',
    };
  }
  
  // If description explicitly mentions OFF GRADE, treat it as OFFGRADE and place all such
  // items into a single normalized group 'OFFGRADE' regardless of any extracted code.
  if (/\bOFF[-\s]?GRADE\b/i.test(description)) {
    return {
      polymerType: 'OFFGRADE',
      gradeCode: null,
      // Group all OFF GRADE descriptions under a single normalized label as requested
      normalizedGrade: 'One Off Grade',
      confidence: 'high',
    };
  }

  const polymerType = detectPolymerType(description);
  const { code: gradeCode, confidence } = extractGradeCode(description);
  
  let normalizedGrade: string | null = null;
  
  if (polymerType && gradeCode) {
    normalizedGrade = `${polymerType} ${gradeCode}`;
  }
  
  // If we have polymer type but no grade code, still useful for partial matching
  const finalConfidence = gradeCode ? confidence : 'low';
  
  return {
    polymerType,
    gradeCode,
    normalizedGrade,
    confidence: finalConfidence,
  };
}

/**
 * Parses IGM Date which can be in various formats
 * Handles Excel-style float dates (e.g., 20251205.0) and date strings
 */
export function parseIGMDate(dateValue: string | number | null | undefined): Date | null {
  if (!dateValue) return null;
  
  // If it's a number, treat as Excel-style date (YYYYMMDD as integer/float)
  if (typeof dateValue === 'number' || !isNaN(Number(dateValue))) {
    const numValue = typeof dateValue === 'number' ? dateValue : Number(dateValue);
    
    // Check if it looks like YYYYMMDD format
    const dateStr = Math.floor(numValue).toString();
    if (dateStr.length === 8) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }
  
  // Try parsing as standard date string
  if (typeof dateValue === 'string') {
    // Handle DD-MMM-YY format (e.g., "12-Aug-26")
    const shortMonthMatch = dateValue.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2})/);
    if (shortMonthMatch) {
      const months: Record<string, number> = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11,
      };
      const day = parseInt(shortMonthMatch[1]);
      const month = months[shortMonthMatch[2].toUpperCase()];
      let year = parseInt(shortMonthMatch[3]);
      // Handle 2-digit year (assume 20xx for years 00-99)
      year = year < 100 ? 2000 + year : year;
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    // Try standard date parsing
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  return null;
}

/**
 * Cleans a field value by trimming whitespace and normalizing
 */
export function cleanFieldValue(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Cleans currency field (e.g., "US $" -> "USD")
 */
export function cleanCurrencyField(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase();
  // Normalize common currency representations
  if (cleaned.includes('US') || cleaned === '$' || cleaned === 'USD') return 'USD';
  if (cleaned.includes('PKR')) return 'PKR';
  if (cleaned.includes('EUR')) return 'EUR';
  return cleaned || null;
}
