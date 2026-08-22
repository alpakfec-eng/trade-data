/**
 * Grade Resolution Module
 * 
 * Resolves grade from Item Description by checking manual overrides first,
 * then falling back to automatic extraction.
 */

import dbConnect from './mongodb';
import GradeOverride from '@/models/GradeOverride';
import { extractGrade, ExtractedGrade } from './gradeExtraction';

// In-memory cache for overrides to avoid DB round-trips during bulk imports
let overridesCache: {
  overrides: Map<string, string>;  // pattern -> normalizedGrade
  regexOverrides: Array<{ pattern: RegExp; normalizedGrade: string }>;
  lastRefresh: Date;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Loads overrides from database into memory cache
 */
async function loadOverridesCache(): Promise<void> {
  await dbConnect();
  
  const overrides = await GradeOverride.find({}).lean();
  
  const substringMap = new Map<string, string>();
  const regexList: Array<{ pattern: RegExp; normalizedGrade: string }> = [];
  
  for (const override of overrides) {
    if (override.matchType === 'substring') {
      // Use lowercase key for case-insensitive substring matching
      substringMap.set(override.matchPattern.toLowerCase(), override.normalizedGrade);
    } else if (override.matchType === 'regex') {
      try {
        regexList.push({
          pattern: new RegExp(override.matchPattern, 'i'),
          normalizedGrade: override.normalizedGrade,
        });
      } catch (e) {
        console.error(`Invalid regex pattern in override: ${override.matchPattern}`, e);
      }
    }
  }
  
  overridesCache = {
    overrides: substringMap,
    regexOverrides: regexList,
    lastRefresh: new Date(),
  };
}

/**
 * Clears the in-memory cache (call this when overrides are updated)
 */
export function clearOverridesCache(): void {
  overridesCache = null;
}

/**
 * Refreshes the cache if stale or not loaded
 */
export async function refreshOverridesIfNeeded(): Promise<void> {
  if (!overridesCache || (Date.now() - overridesCache.lastRefresh.getTime()) > CACHE_TTL_MS) {
    await loadOverridesCache();
  }
}

/**
 * Checks if any override matches the given description
 */
function checkOverride(description: string): string | null {
  if (!overridesCache) return null;
  
  const normalizedDesc = description.toLowerCase();
  
  // Check substring matches
  for (const [pattern, grade] of overridesCache.overrides) {
    if (normalizedDesc.includes(pattern)) {
      return grade;
    }
  }
  
  // Check regex matches
  for (const { pattern, normalizedGrade } of overridesCache.regexOverrides) {
    if (pattern.test(description)) {
      return normalizedGrade;
    }
  }
  
  return null;
}

/**
 * Parses a normalized grade string into components
 * e.g., "LLDPE Q1018H" -> { polymerType: "LLDPE", gradeCode: "Q1018H" }
 */
function parseNormalizedGrade(normalizedGrade: string): { polymerType: string | null; gradeCode: string | null } {
  const parts = normalizedGrade.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    return {
      polymerType: parts[0].toUpperCase(),
      gradeCode: parts.slice(1).join(' ').toUpperCase(),
    };
  } else if (parts.length === 1) {
    // Could be just polymer type or just grade code
    const token = parts[0].toUpperCase();
    const polymerTypes = ['LLDPE', 'LDPE', 'HDPE', 'MDPE', 'PP'];
    
    if (polymerTypes.includes(token)) {
      return { polymerType: token, gradeCode: null };
    }
    return { polymerType: null, gradeCode: token };
  }
  
  return { polymerType: null, gradeCode: null };
}

/**
 * Main export: Resolves grade by checking overrides first, then using automatic extraction
 * 
 * @param description - Raw Item Description text from customs record
 * @param skipCacheRefresh - Set true during bulk imports after manual cache refresh
 * @returns Promise<ExtractedGrade> with polymerType, gradeCode, normalizedGrade, and confidence
 */
export async function resolveGrade(
  description: string,
  skipCacheRefresh: boolean = false
): Promise<ExtractedGrade> {
  if (!description || typeof description !== 'string') {
    return {
      polymerType: null,
      gradeCode: null,
      normalizedGrade: null,
      confidence: 'low',
    };
  }
  
  // Refresh cache if needed (unless in bulk import mode)
  if (!skipCacheRefresh) {
    await refreshOverridesIfNeeded();
  }
  
  // Check for manual override first
  const overrideGrade = checkOverride(description);
  
  if (overrideGrade) {
    const { polymerType, gradeCode } = parseNormalizedGrade(overrideGrade);
    return {
      polymerType,
      gradeCode,
      normalizedGrade: overrideGrade,
      confidence: 'high', // Override always gets high confidence
    };
  }
  
  // Fall back to automatic extraction
  return extractGrade(description);
}

/**
 * Batch resolves grades for bulk import operations
 * Refreshes cache once at the start, then processes all descriptions
 */
export async function resolveGradesBatch(
  descriptions: string[]
): Promise<ExtractedGrade[]> {
  // Ensure cache is loaded once
  await refreshOverridesIfNeeded();
  
  return Promise.all(
    descriptions.map(desc => resolveGrade(desc, true))
  );
}

/**
 * Adds a new override and clears cache
 */
export async function addGradeOverride(
  matchPattern: string,
  matchType: 'substring' | 'regex',
  normalizedGrade: string,
  note?: string
): Promise<void> {
  await dbConnect();
  
  await GradeOverride.findOneAndUpdate(
    { matchPattern, matchType },
    { matchPattern, matchType, normalizedGrade, note },
    { upsert: true, new: true }
  );
  
  // Clear cache so it refreshes on next use
  clearOverridesCache();
}

/**
 * Removes an override and clears cache
 */
export async function removeGradeOverride(matchPattern: string): Promise<void> {
  await dbConnect();
  
  await GradeOverride.deleteOne({ matchPattern });
  
  clearOverridesCache();
}

/**
 * Lists all current overrides
 */
export async function listGradeOverrides(): Promise<Array<{
  matchPattern: string;
  matchType: string;
  normalizedGrade: string;
  note?: string;
}>> {
  await dbConnect();
  
  const overrides = await GradeOverride.find({}).lean();
  
  return overrides.map(o => ({
    matchPattern: o.matchPattern,
    matchType: o.matchType,
    normalizedGrade: o.normalizedGrade,
    note: o.note,
  }));
}
