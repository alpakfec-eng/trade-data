import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TradeData from '@/models/TradeData';
import TempCSVData from '@/models/TempCSVData';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('csv') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvText = await file.text();

    // Parse CSV
    const { data, errors, meta } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: 'CSV parsing error', details: errors }, { status: 400 });
    }

    console.log('CSV Headers found:', meta.fields);
    console.log('First row sample:', data[0]);

    // Store parsed data temporarily
    const tempData = new TempCSVData({
      headers: meta.fields || [],
      data: data,
    });

    const savedTempData = await tempData.save();

    return NextResponse.json({
      message: 'CSV parsed successfully',
      tempId: savedTempData._id.toString(),
      headers: meta.fields,
      rowCount: data.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}