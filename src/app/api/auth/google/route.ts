// Google OAuth initiation endpoint
// Redirects user to Google consent screen

import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/auth';

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
