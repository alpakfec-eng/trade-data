import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine role and approval status
    const isSuperAdmin = email === process.env.SUPER_ADMIN_EMAIL;
    const role = isSuperAdmin ? 'super-admin' : 'user';
    const approved = isSuperAdmin;

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role,
      approved,
    });

    await user.save();

    return NextResponse.json({ 
      message: 'User created successfully', 
      approved: user.approved 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}