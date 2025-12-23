import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Octokit } from 'octokit';

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

    // Get user from database with GitHub info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        githubAccessToken: true,
        githubUsername: true,
        githubConnectedAt: true,
      },
    });

    if (!user || !user.githubAccessToken || !user.githubUsername) {
      return NextResponse.json(
        { message: 'GitHub account not connected' },
        { status: 400 }
      );
    }

    // Initialize Octokit with user's access token
    const octokit = new Octokit({ auth: user.githubAccessToken });

    // Fetch repositories
    const { data: repos } = await octokit.rest.repos.listForUser({
      username: user.githubUsername,
      type: 'all',
      sort: 'updated',
      per_page: 100,
    });

    const repoData = repos.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updatedAt: repo.updated_at,
      topics: repo.topics || [],
    }));

    return NextResponse.json({
      username: user.githubUsername,
      totalRepos: repoData.length,
      repositories: repoData,
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { message: 'Failed to fetch repositories', error: String(error) },
      { status: 500 }
    );
  }
}
