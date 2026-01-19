import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export async function GET() {
  try {
    await connectToDatabase();

    const grades = await TradeData.distinct('Grade');

    return NextResponse.json({ grades: grades.filter(grade => grade && grade.trim()) });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
  }
}