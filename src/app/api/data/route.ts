import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const product = searchParams.get('product') || '';
    const sortField = searchParams.get('sortField') || '_id';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;

    const query: Record<string, unknown> = {};

    if (product) {
      query['Product Name'] = product;
    }

    if (search) {
      query.$or = [
        { 'HS CODE': { $regex: search, $options: 'i' } },
        { 'Product Name': { $regex: search, $options: 'i' } },
        { 'Item Description': { $regex: search, $options: 'i' } },
        { 'Grade': { $regex: search, $options: 'i' } },
        { 'Grade Category': { $regex: search, $options: 'i' } },
        { 'Importer Name': { $regex: search, $options: 'i' } },
        { 'Actual Importer Name': { $regex: search, $options: 'i' } },
        { 'Consignor Name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      TradeData.find(query).sort({ [sortField]: sortOrder }).skip(skip).limit(limit),
      TradeData.countDocuments(query),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const newData = new TradeData(body);
    await newData.save();

    return NextResponse.json({ message: 'Data added successfully', data: newData }, { status: 201 });
  } catch (error) {
    console.error('Error adding data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}