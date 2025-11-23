import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('coverLetter') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (PDF and TXT)
    const allowedTypes = [
      'application/pdf',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Please upload PDF or TXT file.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Update user with cover letter data
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        coverLetterFileName: file.name,
        coverLetterData: buffer,
        coverLetterMimeType: file.type,
        coverLetterUploadedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        coverLetterFileName: true,
        coverLetterUploadedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Cover letter uploaded successfully',
        user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cover letter upload error:', error);
    return NextResponse.json(
      { message: 'An error occurred during upload' },
      { status: 500 }
    );
  }
}

// GET endpoint to download cover letter
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user cover letter from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        coverLetterFileName: true,
        coverLetterData: true,
        coverLetterMimeType: true,
      },
    });

    if (!user || !user.coverLetterData) {
      return NextResponse.json(
        { message: 'Cover letter not found' },
        { status: 404 }
      );
    }

    // Return file as download
    return new NextResponse(user.coverLetterData, {
      headers: {
        'Content-Type': user.coverLetterMimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${user.coverLetterFileName}"`,
      },
    });
  } catch (error) {
    console.error('Cover letter download error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 }
    );
  }
}
