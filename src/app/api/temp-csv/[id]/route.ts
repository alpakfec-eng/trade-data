import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TempCSVData from '@/models/TempCSVData';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();

    const { id } = await params;

    const tempData = await TempCSVData.findById(id);
    if (!tempData) {
      return NextResponse.json({ error: 'Temp data not found or expired' }, { status: 404 });
    }

    return NextResponse.json({
      headers: tempData.headers,
      data: tempData.data,
      rowCount: tempData.data.length,
    });
  } catch (error) {
    console.error('Error fetching temp data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE - Delete specific temp CSV data by ID
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();

    const { id } = await params;

    const deletedData = await TempCSVData.findByIdAndDelete(id);
    if (!deletedData) {
      return NextResponse.json({ error: 'Temp data not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Temp CSV data deleted successfully' });
  } catch (error) {
    console.error('Error deleting temp data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}