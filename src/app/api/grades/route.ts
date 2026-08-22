import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TradeData from '@/models/TradeData';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectToDatabase();

    // Get unique grades preferring normalizedGrade (fallback to Item Description) with count
    const grades = await TradeData.aggregate([
      {
        $addFields: {
          preferredGrade: {
            $ifNull: [
              '$normalizedGrade',
              {
                $ifNull: [
                  '$normalizedgrade',
                  {
                    $ifNull: [
                      '$Grade',
                      {
                        $ifNull: [
                          '$grade',
                          '$Item Description'
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$preferredGrade',
          label: { $first: '$preferredGrade' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          $and: [
            { label: { $ne: null } },
            { label: { $ne: '' } }
          ]
        }
      },
      { $sort: { label: 1 } }
    ]);

    return NextResponse.json({ grades });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
  }
}
