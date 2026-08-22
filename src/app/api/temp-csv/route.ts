import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TempCSVData from '@/models/TempCSVData';

export const runtime = 'nodejs';

// GET - List all temp CSV data
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const tempDataList = await TempCSVData.find({})
      .select('headers createdAt')
      .sort({ createdAt: -1 });

    const formattedData = tempDataList.map(item => ({
      _id: item._id,
      headers: item.headers,
      rowCount: item.headers?.length || 0,
      createdAt: item.createdAt,
      expiresAt: new Date(new Date(item.createdAt).getTime() + 60 * 60 * 1000), // 1 hour from creation
    }));

    return NextResponse.json({ tempData: formattedData });
  } catch (error) {
    console.error('Error fetching temp CSV list:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE - Delete all temp CSV data
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    await TempCSVData.deleteMany({});

    return NextResponse.json({ message: 'All temp CSV data deleted successfully' });
  } catch (error) {
    console.error('Error deleting temp CSV data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
