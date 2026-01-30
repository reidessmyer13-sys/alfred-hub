import { WebClient } from '@slack/web-api';

const slackToken = process.env.SLACK_BOT_TOKEN;
const web = slackToken ? new WebClient(slackToken) : null;

export async function sendSlackDM(userId: string, text: string): Promise<void> {
  if (!web) {
    console.log('[Slack] Bot token not configured, skipping Slack message');
    return;
  }
  await web.chat.postMessage({
    channel: userId,
    text,
    mrkdwn: true,
  });
}

export async function sendReminder(text: string): Promise<void> {
  const userId = process.env.USER_SLACK_ID;
  if (!userId || !web) {
    console.log('[Slack] Not configured, skipping reminder');
    return;
  }
  await sendSlackDM(userId, text);
}

// Format message for Slack (convert markdown-ish to Slack mrkdwn)
export function formatForSlack(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold: ** to *
    .replace(/__(.*?)__/g, '_$1_'); // Italic: __ to _
}
