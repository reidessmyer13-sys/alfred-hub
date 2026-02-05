// Simple password authentication for Alfred UI
// Uses environment variable ALFRED_PASSWORD

import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'alfred_auth';
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function verifyPassword(password: string): Promise<boolean> {
  const correctPassword = process.env.ALFRED_PASSWORD;

  if (!correctPassword) {
    // If no password is set, allow access (for development)
    console.warn('[Auth] ALFRED_PASSWORD not set - authentication disabled');
    return true;
  }

  return password === correctPassword;
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = generateToken();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const correctPassword = process.env.ALFRED_PASSWORD;

  // If no password is set, allow access
  if (!correctPassword) {
    return true;
  }

  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

  return !!authCookie?.value;
}

function generateToken(): string {
  // Simple token generation - just needs to exist
  return `alfred_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
