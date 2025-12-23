import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || typeof decoded === 'string') {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user's resume from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        resumeFileName: true,
        resumeData: true,
        resumeMimeType: true,
        resumeUploadedAt: true,
      },
    });

    if (!user || !user.resumeData) {
      return NextResponse.json(
        { message: 'No resume found' },
        { status: 404 }
      );
    }

    // Convert buffer to base64 for sending to client
    const resumeBase64 = Buffer.from(user.resumeData).toString('base64');

    return NextResponse.json({
      resume: {
        fileName: user.resumeFileName,
        content: resumeBase64,
        mimeType: user.resumeMimeType,
        uploadedAt: user.resumeUploadedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    return NextResponse.json(
      { message: 'Failed to fetch resume', error: String(error) },
      { status: 500 }
    );
  }
}
