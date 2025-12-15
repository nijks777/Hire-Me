import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { jobDescription, customInstructions } = body;

    if (!jobDescription || !jobDescription.trim()) {
      return NextResponse.json(
        { message: 'Job description is required' },
        { status: 400 }
      );
    }

    // Get user's resume
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        resumeFileName: true,
        resumeData: true,
        resumeMimeType: true,
        githubAccessToken: true,
        githubUsername: true,
        profile: true,
      },
    });

    if (!user || !user.resumeData) {
      return NextResponse.json(
        { message: 'No resume found. Please upload a resume first.' },
        { status: 404 }
      );
    }

    // TODO: This is where the multi-agent LangGraph flow will be triggered
    // For now, we'll just return the input data to confirm it works

    const responseData = {
      message: 'Resume customization request received',
      status: 'pending',
      input: {
        jobDescription,
        customInstructions: customInstructions || null,
        resumeFileName: user.resumeFileName,
        hasGithubConnected: !!user.githubAccessToken,
        hasProfile: !!user.profile,
      },
      nextSteps: [
        'Multi-agent flow will be implemented next',
        'Agents: JD Analyzer → Resume Analyzer → Context Enrichment → Resume Customizer → ATS Validator',
      ],
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error processing resume customization:', error);
    return NextResponse.json(
      { message: 'Failed to process request', error: String(error) },
      { status: 500 }
    );
  }
}
