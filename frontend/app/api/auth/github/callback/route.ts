import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/profile?github_error=${error}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/profile?github_error=no_code`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/profile?github_error=${tokenData.error}`
      );
    }

    const accessToken = tokenData.access_token;

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const githubUser = await userResponse.json();

    // Get user from cookie/localStorage (we'll need to pass the token in the state parameter)
    // For now, let's use a temporary approach - store in a temporary table or session
    // Better approach: Use state parameter to pass JWT token

    // For simplicity, we'll redirect back and handle it on the client side
    // The client will need to send a request with their JWT token to link the GitHub account

    // Create a temporary token that expires in 5 minutes
    const tempToken = Buffer.from(
      JSON.stringify({
        githubAccessToken: accessToken,
        githubUsername: githubUser.login,
        timestamp: Date.now(),
      })
    ).toString('base64');

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/profile?github_temp_token=${tempToken}`
    );
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/profile?github_error=callback_failed`
    );
  }
}
