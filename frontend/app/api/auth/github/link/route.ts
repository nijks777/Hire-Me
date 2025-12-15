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

    const body = await request.json();
    const { githubTempToken } = body;

    if (!githubTempToken) {
      return NextResponse.json(
        { message: 'No GitHub token provided' },
        { status: 400 }
      );
    }

    // Decode the temporary token
    const tempData = JSON.parse(
      Buffer.from(githubTempToken, 'base64').toString('utf-8')
    );

    // Check if token is expired (5 minutes)
    if (Date.now() - tempData.timestamp > 5 * 60 * 1000) {
      return NextResponse.json(
        { message: 'GitHub token expired, please try again' },
        { status: 400 }
      );
    }

    // Update user with GitHub info
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        githubAccessToken: tempData.githubAccessToken,
        githubUsername: tempData.githubUsername,
        githubConnectedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'GitHub account linked successfully',
      githubUsername: user.githubUsername,
      githubConnectedAt: user.githubConnectedAt,
    });
  } catch (error) {
    console.error('Link GitHub error:', error);
    return NextResponse.json(
      { message: 'Failed to link GitHub account' },
      { status: 500 }
    );
  }
}
