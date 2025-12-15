import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET user profile
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user profile and GitHub connection status
    const profile = await prisma.userProfile.findUnique({
      where: { userId: decoded.userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        githubUsername: true,
        githubConnectedAt: true,
      },
    });

    return NextResponse.json(
      {
        profile: profile || null,
        github: user || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST/UPDATE user profile
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Convert empty strings to null and handle number fields
    const profileData: any = {};

    Object.keys(body).forEach((key) => {
      const value = body[key];

      // Handle number fields
      if (key === 'yearsOfExperience') {
        profileData[key] = value ? parseFloat(value) : null;
      } else if (key === 'graduationYear') {
        profileData[key] = value ? parseInt(value) : null;
      } else {
        // Convert empty strings to null for all other fields
        profileData[key] = value === '' ? null : value;
      }
    });

    // Upsert profile (create or update)
    const profile = await prisma.userProfile.upsert({
      where: { userId: decoded.userId },
      create: {
        userId: decoded.userId,
        ...profileData,
      },
      update: profileData,
    });

    return NextResponse.json(
      {
        message: 'Profile saved successfully',
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Save profile error:', error);
    return NextResponse.json(
      { message: 'An error occurred while saving profile' },
      { status: 500 }
    );
  }
}
