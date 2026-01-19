import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importer: string }> }
) {
  try {
    await connectToDatabase();

    const { importer } = await params;
    const decodedImporter = decodeURIComponent(importer);

    const data = await TradeData.find(
      { 'Actual Importer Name': decodedImporter },
      {
        'Item Description': 1,
        'Grade': 1,
        'Qty (Kg)': 1,
        'Price/Kg': 1,
        'DCL Val': 1,
        'Assessed Value': 1,
        'Cash Date': 1,
        'Month': 1,
        'Year': 1,
        'Actual Consignor Name': 1
      }
    ).sort({ 'Year': -1, 'Month': -1 });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching importer data:', error);
    return NextResponse.json({ error: 'Failed to fetch importer data' }, { status: 500 });
  }
}