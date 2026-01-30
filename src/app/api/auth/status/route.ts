// Auth status endpoint - check which services are connected

import { NextResponse } from 'next/server';
import { hasValidCredentials } from '@/lib/google/auth';

export async function GET() {
  const googleConnected = await hasValidCredentials();

  return NextResponse.json({
    google: {
      connected: googleConnected,
      authUrl: googleConnected ? null : '/api/auth/google',
    },
    slack: {
      connected: !!process.env.SLACK_BOT_TOKEN,
      note: 'Requires IT approval for bot token',
    },
    twilio: {
      connected: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    },
    salesforce: {
      connected: false,
      note: 'Planned - requires OAuth setup',
    },
    granola: {
      connected: false,
      note: 'Planned - requires API access',
    },
  });
}
