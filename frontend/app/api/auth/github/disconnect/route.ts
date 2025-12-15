import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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

    // Remove GitHub connection
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        githubAccessToken: null,
        githubUsername: null,
        githubConnectedAt: null,
      },
    });

    return NextResponse.json({
      message: 'GitHub account disconnected successfully',
    });
  } catch (error) {
    console.error('Disconnect GitHub error:', error);
    return NextResponse.json(
      { message: 'Failed to disconnect GitHub account' },
      { status: 500 }
    );
  }
}
