import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { chat } from '@/lib/claude';
import { WebClient } from '@slack/web-api';

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET!;
const slackBotToken = process.env.SLACK_BOT_TOKEN!;
const web = new WebClient(slackBotToken);

// Store conversation history per channel/user
const conversationHistory: Map<string, { role: 'user' | 'assistant'; content: string }[]> = new Map();

// Verify Slack signature
function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', slackSigningSecret);
  hmac.update(baseString);
  const computedSignature = `v0=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-slack-signature') || '';
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';

    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!verifySlackSignature(signature, timestamp, body)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const payload = JSON.parse(body);

    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge });
    }

    // Handle events
    if (payload.type === 'event_callback') {
      const event = payload.event;

      // Handle direct messages or app mentions
      if (
        (event.type === 'message' && event.channel_type === 'im' && !event.bot_id) ||
        event.type === 'app_mention'
      ) {
        // Don't respond to bot messages
        if (event.bot_id || event.subtype === 'bot_message') {
          return NextResponse.json({ ok: true });
        }

        const userId = event.user;
        const channelId = event.channel;
        const text = event.text?.replace(/<@[A-Z0-9]+>/g, '').trim() || '';

        if (!text) {
          return NextResponse.json({ ok: true });
        }

        console.log(`Slack message from ${userId} in ${channelId}: ${text}`);

        // Get or create conversation history
        const historyKey = `${channelId}:${userId}`;
        if (!conversationHistory.has(historyKey)) {
          conversationHistory.set(historyKey, []);
        }
        const history = conversationHistory.get(historyKey)!;

        // Get response from Claude
        const response = await chat(text, history, 'slack');

        // Update conversation history (keep last 10 exchanges)
        history.push({ role: 'user', content: text });
        history.push({ role: 'assistant', content: response });
        if (history.length > 20) {
          history.splice(0, 2);
        }

        // Send response back to Slack
        await web.chat.postMessage({
          channel: channelId,
          text: response,
          thread_ts: event.thread_ts || event.ts, // Reply in thread if applicable
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Slack uses GET for verification sometimes
export async function GET() {
  return NextResponse.json({ status: 'Slack events webhook active' });
}
