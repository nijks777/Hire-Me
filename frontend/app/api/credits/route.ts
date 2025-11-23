import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET - Check user credits
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ credits: user.credits }, { status: 200 });
  } catch (error) {
    console.error('Get credits error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Decrement user credits
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

    // Get current credits
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has enough credits
    if (user.credits <= 0) {
      return NextResponse.json(
        { message: 'Insufficient credits' },
        { status: 403 }
      );
    }

    // Decrement credits
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        credits: {
          decrement: 1,
        },
      },
      select: { credits: true },
    });

    return NextResponse.json(
      {
        message: 'Credit deducted successfully',
        credits: updatedUser.credits,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Decrement credits error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 }
    );
  }
}
