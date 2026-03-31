import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TradeData from '@/models/TradeData';
import TempCSVData from '@/models/TempCSVData';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { tempId, mappings, editedData } = await request.json();

    if (!tempId) {
      return NextResponse.json({ error: 'Temp ID is required' }, { status: 400 });
    }

    // Fetch temp data
    const tempData = await TempCSVData.findById(tempId);
    if (!tempData) {
      return NextResponse.json({ error: 'Temp data not found or expired' }, { status: 404 });
    }

    // Apply mappings and edits
    const transformedData = tempData.data.map((row: any, index: number) => {
      const transformedRow: any = {};
      Object.keys(row).forEach(csvField => {
        const dbField = mappings[csvField];
        if (dbField && row[csvField] !== undefined && row[csvField] !== '') {
          transformedRow[dbField] = row[csvField];
        }
      });

      // Apply any edits
      if (editedData && editedData[index]) {
        Object.assign(transformedRow, editedData[index]);
      }

      return transformedRow;
    });

    // Insert data into database
    const insertedData = await TradeData.insertMany(transformedData);

    // Clean up temp data
    await TempCSVData.findByIdAndDelete(tempId);

    return NextResponse.json({
      message: 'Data imported successfully',
      insertedCount: insertedData.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}