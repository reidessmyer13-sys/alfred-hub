// Logout API - Clear auth cookie
import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth/simple-auth';

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
