import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export async function GET() {
  try {
    await connectToDatabase();

    const consignors = await TradeData.distinct('Actual Consignor Name');

    return NextResponse.json({ consignors: consignors.filter(consignor => consignor && consignor.trim()) });
  } catch (error) {
    console.error('Error fetching consignors:', error);
    return NextResponse.json({ error: 'Failed to fetch consignors' }, { status: 500 });
  }
}