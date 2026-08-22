/**
 * Grade Query Helpers
 * 
 * Convenience functions for querying grades and related trade data.
 */

import dbConnect from './mongodb';
import TradeData from '@/models/TradeData';
import Grade from '@/models/Grade';

/**
 * Get all unique grades with statistics
 */
export async function getAllGrades(options?: {
  polymerType?: string;
  minRecords?: number;
  sortBy?: 'totalRecords' | 'gradeCode' | 'lastSeen';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}) {
  await dbConnect();

  const query: any = {};
  
  if (options?.polymerType) {
    query.polymerType = options.polymerType;
  }
  
  if (options?.minRecords) {
    query.totalRecords = { $gte: options.minRecords };
  }

  const sortField = options?.sortBy || 'totalRecords';
  const sortOrder = options?.sortOrder === 'asc' ? 1 : -1;

  let queryBuilder = Grade.find(query)
    .sort({ [sortField]: sortOrder });

  if (options?.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  return queryBuilder.lean();
}

/**
 * Get a single grade by normalizedGrade
 */
export async function getGradeByNormalizedGrade(normalizedGrade: string) {
  await dbConnect();
  return Grade.findOne({ normalizedGrade }).lean();
}

/**
 * Get all records for a specific grade
 */
export async function getRecordsByGrade(
  normalizedGrade: string,
  options?: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) {
  await dbConnect();

  const sortField = options?.sortBy || 'CASH DATE';
  const sortOrder = options?.sortOrder === 'asc' ? 1 : -1;

  const query = TradeData.find({ normalizedGrade })
    .sort({ [sortField]: sortOrder });

  if (options?.skip) {
    query.skip(options.skip);
  }
  
  if (options?.limit) {
    query.limit(options.limit);
  }

  const [records, total] = await Promise.all([
    query.lean(),
    TradeData.countDocuments({ normalizedGrade }),
  ]);

  return { records, total };
}

/**
 * Get records by polymer type
 */
export async function getRecordsByPolymerType(
  polymerType: string,
  options?: {
    limit?: number;
    skip?: number;
  }
) {
  await dbConnect();

  const query = TradeData.find({ polymerType })
    .sort({ 'CASH DATE': -1 });

  if (options?.skip) {
    query.skip(options.skip);
  }
  
  if (options?.limit) {
    query.limit(options.limit);
  }

  const [records, total] = await Promise.all([
    query.lean(),
    TradeData.countDocuments({ polymerType }),
  ]);

  return { records, total };
}

/**
 * Get grade statistics by polymer type
 */
export async function getGradeStatsByPolymerType() {
  await dbConnect();

  const stats = await Grade.aggregate([
    {
      $group: {
        _id: '$polymerType',
        totalGrades: { $sum: 1 },
        totalRecords: { $sum: '$totalRecords' },
        totalQuantity: { $sum: '$totalQuantity' },
        totalAssessedValuePKR: { $sum: '$totalAssessedValuePKR' },
        avgRecordsPerGrade: { $avg: '$totalRecords' },
      },
    },
    {
      $sort: { totalRecords: -1 },
    },
  ]);

  return stats;
}

/**
 * Get top grades by value or quantity
 */
export async function getTopGrades(options?: {
  by?: 'value' | 'quantity' | 'records';
  limit?: number;
  polymerType?: string;
}) {
  await dbConnect();

  const sortField = options?.by === 'value' 
    ? 'totalAssessedValuePKR' 
    : options?.by === 'quantity' 
      ? 'totalQuantity' 
      : 'totalRecords';

  const query: any = {};
  if (options?.polymerType) {
    query.polymerType = options.polymerType;
  }

  return Grade.find(query)
    .sort({ [sortField]: -1 })
    .limit(options?.limit || 10)
    .lean();
}

/**
 * Search grades by grade code or description variant
 */
export async function searchGrades(searchTerm: string, options?: {
  limit?: number;
}) {
  await dbConnect();

  const regex = new RegExp(searchTerm, 'i');

  return Grade.find({
    $or: [
      { gradeCode: regex },
      { normalizedGrade: regex },
      { 'descriptionVariants.rawDescription': regex },
    ],
  })
    .limit(options?.limit || 20)
    .lean();
}

/**
 * Get importers for a specific grade
 */
export async function getImportersForGrade(normalizedGrade: string, options?: {
  limit?: number;
}) {
  await dbConnect();

  const result = await TradeData.aggregate([
    { $match: { normalizedGrade } },
    {
      $group: {
        _id: '$Importer Name',
        importerName: { $first: '$Importer Name' },
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
        totalValue: {
          $sum: {
            $convert: {
              input: '$TOTAL PKR VALU ASSESSED',
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
        recordCount: { $sum: 1 },
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  if (options?.limit) {
    return result.slice(0, options.limit);
  }

  return result;
}

/**
 * Get consignors for a specific grade
 */
export async function getConsignorsForGrade(normalizedGrade: string, options?: {
  limit?: number;
}) {
  await dbConnect();

  const result = await TradeData.aggregate([
    { $match: { normalizedGrade } },
    {
      $group: {
        _id: '$Consignor Name',
        consignorName: { $first: '$Consignor Name' },
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
        totalValue: {
          $sum: {
            $convert: {
              input: '$TOTAL PKR VALU ASSESSED',
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
        recordCount: { $sum: 1 },
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  if (options?.limit) {
    return result.slice(0, options.limit);
  }

  return result;
}

/**
 * Get grade trends over time (by month)
 */
export async function getGradeTrends(normalizedGrade: string, options?: {
  months?: number;
}) {
  await dbConnect();

  const months = options?.months || 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const result = await TradeData.aggregate([
    {
      $match: {
        normalizedGrade,
        parsedCashDate: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$parsedCashDate' },
          month: { $month: '$parsedCashDate' },
        },
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
        totalValue: {
          $sum: {
            $convert: {
              input: '$TOTAL PKR VALU ASSESSED',
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
        recordCount: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  return result;
}
