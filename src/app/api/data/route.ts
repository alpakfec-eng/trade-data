import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export const runtime = 'nodejs';

function normalizeMachineNo(val: any) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseInt(val.replace(/[^\d.-]/g, ''), 10);
    return Number.isNaN(n) ? undefined : n;
  }
  if (typeof val === 'object') {
    const candidates = ['value', 'v', '#text', 'text'];
    for (const k of candidates) {
      if (k in val) return normalizeMachineNo((val as any)[k]);
    }
    try {
      const s = JSON.stringify(val);
      const match = s.match(/-?\d+/);
      return match ? parseInt(match[0], 10) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const rawSortField = searchParams.get('sortField') || 'CASH DATE';
    const sortField = rawSortField === 'cashDate' || rawSortField.toLowerCase() === 'cash date' ? 'CASH DATE' : rawSortField;
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { 'HS CODE': { $regex: search, $options: 'i' } },
        { 'Item Description': { $regex: search, $options: 'i' } },
        { 'Importer Name': { $regex: search, $options: 'i' } },
        { 'Consignor Name': { $regex: search, $options: 'i' } },
        { 'Origin': { $regex: search, $options: 'i' } },
        { 'PORT': { $regex: search, $options: 'i' } },
        { 'Agent Name': { $regex: search, $options: 'i' } },
        { 'GD Number': { $regex: search, $options: 'i' } },
        { 'BL Number': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      TradeData.find(query).sort({ [sortField]: sortOrder }).skip(skip).limit(limit),
      TradeData.countDocuments(query),
    ]);

    // transform documents to ensure fields are normalized for frontend:
    const transformed = data.map((doc) => {
      const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
      // ensure Machine No is numeric
      obj['Machine No'] = normalizeMachineNo(obj['Machine No']);

      // ensure normalizedGrade exists and is exposed as normalizedGrade
      obj.normalizedGrade = obj.normalizedGrade ?? obj['normalizedgrade'] ?? obj['normalizedGrade'] ?? obj['Grade'] ?? obj['grade'] ?? null;

      // cashDate standardized (for frontend sorting and display)
      const cash = obj['CASH DATE'] ?? obj['Cash Date'] ?? obj['cashDate'];
      obj.cashDate = cash ? new Date(cash) : null;

      // USA RATE concatenated with Curr
      const usa = obj['USA RATE'] ?? obj['USA_RATE'] ?? '';
      const curr = obj['Curr'] ?? obj['Currency'] ?? obj['CURR'] ?? '';
      obj.usaRateWithCurr = usa ? `${usa}${curr ? ' ' + curr : ''}` : '';
      return obj;
    });

    return NextResponse.json({
      data: transformed,
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
    // Normalize Machine No before saving
    body['Machine No'] = normalizeMachineNo(body['Machine No']);

    // Keep data model unchanged otherwise; save as-is
    const newData = new TradeData(body);
    await newData.save();
    return NextResponse.json({ message: 'Data added successfully', data: newData }, { status: 201 });
  } catch (error) {
    console.error('Error adding data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
