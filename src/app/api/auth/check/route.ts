// Auth Check API - Verify if user is authenticated
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth/simple-auth';

export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    return NextResponse.json({ authenticated });
  } catch (error) {
    console.error('[Auth Check API] Error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
