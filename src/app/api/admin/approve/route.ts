import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !['admin', 'super-admin'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();

    const { userId, action } = await request.json(); // action: 'approve' or 'reject'

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'approve') {
      user.approved = true;
      await user.save();
      return NextResponse.json({ message: 'User approved successfully' });
    } else if (action === 'reject') {
      await User.findByIdAndDelete(userId);
      return NextResponse.json({ message: 'User rejected and removed' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error approving user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}