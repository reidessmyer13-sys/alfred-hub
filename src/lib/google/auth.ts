// Google OAuth Authentication
// Handles OAuth flow and token management for Google APIs

import { google, Auth } from 'googleapis';
import { getSupabase } from '../supabase';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
];

// OAuth2 client singleton
let oauth2Client: Auth.OAuth2Client | null = null;

function getOAuth2Client() {
  if (!oauth2Client) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.VERCEL_URL}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }
  return oauth2Client;
}

// Generate OAuth authorization URL
export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  // Store tokens in Supabase
  await storeTokens(tokens);

  return tokens;
}

// Store tokens securely in Supabase
async function storeTokens(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('oauth_tokens')
    .upsert({
      provider: 'google',
      user_id: 'reid', // Single user system
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'provider,user_id',
    });

  if (error) {
    console.error('Failed to store tokens:', error);
    throw error;
  }
}

// Get stored tokens from Supabase
async function getStoredTokens(): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
} | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('access_token, refresh_token, expiry_date')
    .eq('provider', 'google')
    .eq('user_id', 'reid')
    .single();

  if (error || !data) {
    return null;
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date ? new Date(data.expiry_date).getTime() : 0,
  };
}

// Get authenticated OAuth client with valid tokens
export async function getAuthenticatedClient() {
  const client = getOAuth2Client();
  const tokens = await getStoredTokens();

  if (!tokens) {
    throw new Error('No Google tokens found. Please authenticate at /api/auth/google');
  }

  client.setCredentials(tokens);

  // Check if token needs refresh
  const now = Date.now();
  if (tokens.expiry_date && tokens.expiry_date < now + 60000) {
    // Token expires in less than a minute, refresh it
    const { credentials } = await client.refreshAccessToken();
    await storeTokens(credentials);
    client.setCredentials(credentials);
  }

  return client;
}

// Check if we have valid Google credentials
export async function hasValidCredentials(): Promise<boolean> {
  try {
    const tokens = await getStoredTokens();
    return tokens !== null && tokens.refresh_token !== null;
  } catch {
    return false;
  }
}
