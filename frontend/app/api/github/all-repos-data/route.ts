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

    // Get limit from query params (default: 10)
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get user from database with GitHub info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        githubAccessToken: true,
        githubUsername: true,
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
      per_page: limit,
    });

    const allData = [];

    // Fetch README and tech stack for each repo
    for (const repo of repos) {
      try {
        const owner = repo.owner.login;
        const repoName = repo.name;

        // Get README
        let readmeContent = null;
        let readmeUrl = null;
        try {
          const { data: readme } = await octokit.rest.repos.getReadme({
            owner,
            repo: repoName,
          });
          readmeContent = Buffer.from(readme.content, 'base64').toString('utf-8');
          readmeUrl = readme.html_url;
        } catch (error) {
          // README not found
        }

        // Get languages/tech stack
        const { data: languages } = await octokit.rest.repos.listLanguages({
          owner,
          repo: repoName,
        });

        const totalBytes = Object.values(languages).reduce((a: number, b: number) => a + b, 0);
        const languagePercentages: Record<string, string> = {};

        for (const [lang, bytes] of Object.entries(languages)) {
          languagePercentages[lang] = ((bytes / totalBytes) * 100).toFixed(2);
        }

        allData.push({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          updatedAt: repo.updated_at,
          readme: {
            content: readmeContent,
            url: readmeUrl,
            preview: readmeContent ? readmeContent.substring(0, 500) + '...' : null,
          },
          techStack: {
            languages: languagePercentages,
            primaryLanguage: repo.language,
            topics: repo.topics || [],
          },
        });
      } catch (error) {
        console.error(`Error fetching data for ${repo.name}:`, error);
        // Continue with next repo
      }
    }

    return NextResponse.json({
      username: user.githubUsername,
      totalRepos: repos.length,
      repositories: allData,
    });
  } catch (error) {
    console.error('Error fetching all repos data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch all repos data', error: String(error) },
      { status: 500 }
    );
  }
}
