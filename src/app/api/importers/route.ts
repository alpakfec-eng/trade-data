import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export async function GET() {
  try {
    await connectToDatabase();

    const importers = await TradeData.aggregate([
      {
        $group: {
          _id: '$Actual Importer Name',
          importerName: { $first: '$Actual Importer Name' },
          importerAddress: { $first: '$Importer Address' },
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
      { $sort: { importerName: 1 } }
    ]);

    return NextResponse.json({ importers });
  } catch (error) {
    console.error('Error fetching importers:', error);
    return NextResponse.json({ error: 'Failed to fetch importers' }, { status: 500 });
  }
}