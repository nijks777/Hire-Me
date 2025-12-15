import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Octokit } from 'octokit';

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
    const { owner, repo } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { message: 'Owner and repo are required' },
        { status: 400 }
      );
    }

    // Get user from database with GitHub info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        githubAccessToken: true,
      },
    });

    if (!user || !user.githubAccessToken) {
      return NextResponse.json(
        { message: 'GitHub account not connected' },
        { status: 400 }
      );
    }

    // Initialize Octokit with user's access token
    const octokit = new Octokit({ auth: user.githubAccessToken });

    // Fetch README
    let readmeContent = null;
    let readmeUrl = null;
    try {
      const { data: readme } = await octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      readmeContent = Buffer.from(readme.content, 'base64').toString('utf-8');
      readmeUrl = readme.html_url;
    } catch (error) {
      // README not found
      console.log(`No README found for ${owner}/${repo}`);
    }

    // Fetch languages/tech stack
    const { data: languages } = await octokit.rest.repos.listLanguages({
      owner,
      repo,
    });

    const totalBytes = Object.values(languages).reduce((a: number, b: number) => a + b, 0);
    const languagePercentages: Record<string, string> = {};

    for (const [lang, bytes] of Object.entries(languages)) {
      languagePercentages[lang] = ((bytes / totalBytes) * 100).toFixed(2);
    }

    // Get repository details
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    return NextResponse.json({
      repo: `${owner}/${repo}`,
      description: repoData.description,
      url: repoData.html_url,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      readme: {
        content: readmeContent,
        url: readmeUrl,
      },
      techStack: {
        languages: languagePercentages,
        primaryLanguage: repoData.language,
        topics: repoData.topics || [],
        license: repoData.license?.name || null,
      },
    });
  } catch (error) {
    console.error('Error fetching repository details:', error);
    return NextResponse.json(
      { message: 'Failed to fetch repository details', error: String(error) },
      { status: 500 }
    );
  }
}
