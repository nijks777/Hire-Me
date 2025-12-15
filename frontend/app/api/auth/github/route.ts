import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/github/callback`;

  if (!clientId) {
    return NextResponse.json(
      { message: 'GitHub OAuth is not configured' },
      { status: 500 }
    );
  }

  // GitHub OAuth authorization URL
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=read:user,user:email,repo`;

  return NextResponse.redirect(githubAuthUrl);
}
