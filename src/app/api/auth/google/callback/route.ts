// Google OAuth callback endpoint
// Exchanges authorization code for tokens and stores them

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: 'OAuth error', details: error },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code provided' },
      { status: 400 }
    );
  }

  try {
    await exchangeCodeForTokens(code);

    // Redirect to success page or return success JSON
    return NextResponse.json({
      success: true,
      message: 'Google authentication successful! Alfred can now access your calendar and email.',
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Failed to exchange authorization code', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
