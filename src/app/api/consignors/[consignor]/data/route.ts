import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consignor: string }> }
) {
  try {
    await connectToDatabase();

    const { consignor } = await params;
    const decodedConsignor = decodeURIComponent(consignor);

    const data = await TradeData.find(
      { 'Actual Consignor Name': decodedConsignor },
      {
        'Actual Importer Name': 1,
        'Item Description': 1,
        'Grade': 1,
        'Qty (Kg)': 1,
        'Price/Kg': 1,
        'Cash Date': 1,
        'Month': 1,
        'Year': 1
      }
    ).sort({ 'Year': -1, 'Month': -1 });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching consignor data:', error);
    return NextResponse.json({ error: 'Failed to fetch consignor data' }, { status: 500 });
  }
}