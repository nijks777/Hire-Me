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
    const file = formData.get('coldEmail') as File;

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

    // Update user with cold email data
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        coldEmailFileName: file.name,
        coldEmailData: buffer,
        coldEmailMimeType: file.type,
        coldEmailUploadedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        coldEmailFileName: true,
        coldEmailUploadedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Cold email uploaded successfully',
        user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cold email upload error:', error);
    return NextResponse.json(
      { message: 'An error occurred during upload' },
      { status: 500 }
    );
  }
}

// GET endpoint to download cold email
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

    // Get user cold email from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        coldEmailFileName: true,
        coldEmailData: true,
        coldEmailMimeType: true,
      },
    });

    if (!user || !user.coldEmailData) {
      return NextResponse.json(
        { message: 'Cold email not found' },
        { status: 404 }
      );
    }

    // Return file as download
    return new NextResponse(user.coldEmailData, {
      headers: {
        'Content-Type': user.coldEmailMimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${user.coldEmailFileName}"`,
      },
    });
  } catch (error) {
    console.error('Cold email download error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 }
    );
  }
}
