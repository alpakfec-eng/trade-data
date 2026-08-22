/**
 * Build Grades Reference Collection
 * 
 * Populates the 'grades' collection by scanning all TradeData documents
 * and aggregating by normalizedGrade. Run after backfill-grades.
 * 
 * Usage: npm run build-grades-reference
 * 
 * Options:
 *   --dry-run  Show what would be created without making changes
 */

// IMPORTANT: Load environment variables BEFORE any other imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import TradeData from '../models/TradeData';
import Grade from '../models/Grade';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not defined');
  process.exit(1);
}

interface BuildStats {
  gradesCreated: number;
  gradesUpdated: number;
  recordsProcessed: number;
  unresolvedRecords: number;
  errors: number;
}

interface UnresolvedDescription {
  recordId: string;
  itemDescription: string;
  occurrenceCount: number;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

async function connectDB() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

async function buildGradesReference(): Promise<BuildStats> {
  const stats: BuildStats = {
    gradesCreated: 0,
    gradesUpdated: 0,
    recordsProcessed: 0,
    unresolvedRecords: 0,
    errors: 0,
  };

  console.log('\nAggregating data from TradeData collection...\n');

  // Aggregation pipeline to group by normalizedGrade
  const aggregationPipeline = [
    {
      $match: {
        normalizedGrade: { $ne: null, $exists: true },
      },
    },
    {
      $group: {
        _id: '$normalizedGrade',
        polymerType: { $first: '$polymerType' },
        gradeCode: { $first: '$gradeCode' },
        totalRecords: { $sum: 1 },
        totalQuantity: {
          $sum: {
            $convert: {
              input: '$Quantity',
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
        totalAssessedValuePKR: {
          $sum: {
            $convert: {
              input: '$TOTAL PKR VALU ASSESSED',
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
        firstSeen: { $min: '$createdAt' },
        lastSeen: { $max: '$createdAt' },
        descriptions: { $addToSet: '$Item Description' },
      },
    },
    {
      $sort: { totalRecords: -1 },
    },
  ];

  const aggregatedGrades = await TradeData.aggregate(aggregationPipeline as any);
  
  console.log(`Found ${aggregatedGrades.length} unique grades with normalized values\n`);

  if (aggregatedGrades.length === 0) {
    console.log('No grades found. Make sure to run backfill-grades first.');
    return stats;
  }

  // Now get description variants with counts for each grade
  const variantsPipeline = [
    {
      $match: {
        normalizedGrade: { $ne: null, $exists: true },
      },
    },
    {
      $group: {
        _id: {
          grade: '$normalizedGrade',
          description: '$Item Description',
        },
        count: { $sum: 1 },
        firstSeen: { $min: '$createdAt' },
        lastSeen: { $max: '$createdAt' },
      },
    },
  ];

  const variants = await TradeData.aggregate(variantsPipeline as any);

  // Build a map of grade -> description variants
  const variantsMap = new Map<string, Array<{
    rawDescription: string;
    occurrenceCount: number;
    firstSeen: Date;
    lastSeen: Date;
  }>>();

  for (const v of variants) {
    const grade = v._id.grade;
    if (!variantsMap.has(grade)) {
      variantsMap.set(grade, []);
    }
    variantsMap.get(grade)!.push({
      rawDescription: v._id.description || '',
      occurrenceCount: v.count,
      firstSeen: v.firstSeen,
      lastSeen: v.lastSeen,
    });
  }

  // Prepare bulk operations for grades collection
  const bulkOps: any[] = [];

  for (const agg of aggregatedGrades) {
    const normalizedGrade = agg._id;
    const descriptionVariants = variantsMap.get(normalizedGrade) || [];

    const gradeDoc = {
      normalizedGrade,
      polymerType: agg.polymerType,
      gradeCode: agg.gradeCode,
      descriptionVariants: descriptionVariants.sort((a, b) => b.occurrenceCount - a.occurrenceCount),
      totalRecords: agg.totalRecords,
      totalQuantity: agg.totalQuantity,
      totalAssessedValuePKR: agg.totalAssessedValuePKR,
      firstSeen: agg.firstSeen,
      lastSeen: agg.lastSeen,
    };

    bulkOps.push({
      updateOne: {
        filter: { normalizedGrade },
        update: { $set: gradeDoc },
        upsert: true,
      },
    });

    stats.recordsProcessed += agg.totalRecords;
  }

  if (!dryRun && bulkOps.length > 0) {
    console.log('Writing to grades collection...');
    const result = await Grade.bulkWrite(bulkOps);
    stats.gradesCreated = result.upsertedCount;
    stats.gradesUpdated = result.modifiedCount;
  }

  // Find unresolved descriptions (where normalizedGrade is null)
  const unresolvedPipeline = [
    {
      $match: {
        $or: [
          { normalizedGrade: null },
          { normalizedGrade: { $exists: false } },
        ],
      },
    },
    {
      $group: {
        _id: '$Item Description',
        recordIds: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
  ];

  const unresolved = await TradeData.aggregate(unresolvedPipeline as any);
  stats.unresolvedRecords = unresolved.reduce((sum: number, u: any) => sum + u.count, 0);

  // Save unresolved descriptions report
  if (unresolved.length > 0) {
    const reportDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `unresolved-descriptions-${timestamp}.json`);

    const unresolvedReport = unresolved.map((u: any) => ({
      itemDescription: u._id,
      occurrenceCount: u.count,
      sampleRecordIds: u.recordIds.slice(0, 3),
    }));

    fs.writeFileSync(reportPath, JSON.stringify(unresolvedReport, null, 2));
    console.log(`\nUnresolved descriptions report saved to: ${reportPath}`);
    console.log(`Unresolved descriptions needing manual grade assignment: ${unresolved.length}`);
  }

  return stats;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Build Grades Reference Collection');
  console.log('='.repeat(60));

  try {
    await connectDB();

    console.log(`\nMode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}\n`);

    const stats = await buildGradesReference();

    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Grades created:     ${stats.gradesCreated}`);
    console.log(`Grades updated:     ${stats.gradesUpdated}`);
    console.log(`Records processed:  ${stats.recordsProcessed}`);
    console.log(`Unresolved records: ${stats.unresolvedRecords}`);
    console.log(`Errors:             ${stats.errors}`);
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
