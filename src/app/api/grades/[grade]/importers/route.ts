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

    // Get unique importers for this grade with aggregated DCL Val
    const importers = await TradeData.aggregate([
      { $match: { 'Grade': decodedGrade } },
      {
        $group: {
          _id: '$Actual Importer Name',
          importerName: { $first: '$Actual Importer Name' },
          totalDCLVal: {
            $sum: {
              $convert: {
                input: '$DCL Val',
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
      { $sort: { totalDCLVal: -1 } }
    ]);

    return NextResponse.json({ importers });
  } catch (error) {
    console.error('Error fetching grade importers:', error);
    return NextResponse.json({ error: 'Failed to fetch grade importers' }, { status: 500 });
  }
}