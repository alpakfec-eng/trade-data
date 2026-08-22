import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectToDatabase();

    const consignors = await TradeData.aggregate([
      {
        $group: {
          _id: '$Consignor Name',
          consignorName: { $first: '$Consignor Name' },
          consignorAddress: { $first: '$Consignor Address' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          $and: [
            { consignorName: { $ne: null } },
            { consignorName: { $ne: '' } }
          ]
        }
      },
      { $sort: { consignorName: 1 } }
    ]);

    return NextResponse.json({ consignors });
  } catch (error) {
    console.error('Error fetching consignors:', error);
    return NextResponse.json({ error: 'Failed to fetch consignors' }, { status: 500 });
  }
}
