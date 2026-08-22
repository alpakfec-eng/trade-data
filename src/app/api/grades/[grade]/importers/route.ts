import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ grade: string }> }
) {
  try {
    await connectToDatabase();

    const { grade } = await params;
    const decodedGrade = decodeURIComponent(grade);

    // Get unique importers for this grade (match normalizedGrade, Grade, or Item Description) with aggregated values
    const importers = await TradeData.aggregate([
      {
        $match: {
          $or: [
            { 'Item Description': decodedGrade },
            { normalizedGrade: decodedGrade },
            { normalizedgrade: decodedGrade },
            { Grade: decodedGrade },
            { grade: decodedGrade },
            // also match when numeric fields were stored as numbers by comparing their string form
            { $expr: { $eq: [ { $toString: '$normalizedGrade' }, decodedGrade ] } },
            { $expr: { $eq: [ { $toString: '$normalizedgrade' }, decodedGrade ] } },
            { $expr: { $eq: [ { $toString: '$Grade' }, decodedGrade ] } },
            { $expr: { $eq: [ { $toString: '$grade' }, decodedGrade ] } }
          ]
        }
      },

      {
        $group: {
          _id: '$Importer Name',
          importerName: { $first: '$Importer Name' },
          totalDECLVal: {
            $sum: {
              $convert: {
                input: '$DECL VAL',
                to: 'double',
                onError: 0,
                onNull: 0
              }
            }
          },
          totalQuantity: {
            $sum: {
              $convert: {
                input: '$Quantity',
                to: 'double',
                onError: 0,
                onNull: 0
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          $and: [
            { importerName: { $ne: null } },
            { importerName: { $ne: '' } }
          ]
        }
      },
      { $sort: { totalDECLVal: -1 } }
    ]);

    return NextResponse.json({ importers });
  } catch (error) {
    console.error('Error fetching grade importers:', error);
    return NextResponse.json({ error: 'Failed to fetch grade importers' }, { status: 500 });
  }
}
