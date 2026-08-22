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
      { 'Importer Name': decodedImporter },
      {
        'HS CODE': 1,
        'Item Description': 1,
        'Consignor Name': 1,
        'Consignor Address': 1,
        'Origin': 1,
        'Quantity': 1,
        'Unit': 1,
        'USA VAL': 1,
        'DECL VAL': 1,
        'TOTAL PKR VALU ASSESSED': 1,
        'CASH DATE': 1,
        'LC No': 1,
        'BL Number': 1,
        'PORT': 1
      }
    ).sort({ 'CASH DATE': -1 });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching importer data:', error);
    return NextResponse.json({ error: 'Failed to fetch importer data' }, { status: 500 });
  }
}
