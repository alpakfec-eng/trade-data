import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbConnect();

    const products = await TradeData.distinct('Product Name');

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}