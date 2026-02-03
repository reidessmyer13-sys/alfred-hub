// Google Gmail Direct API Integration
// Fetches email data directly using OAuth tokens

import { google, gmail_v1 } from 'googleapis';
import { getAuthenticatedClient, hasValidCredentials } from './auth';
import { UnifiedEmail } from '../data-sources/types';
import { emitEmailThreadFetched } from '../events';

// Get authenticated Gmail API client
async function getGmailClient(): Promise<gmail_v1.Gmail | null> {
  try {
    if (!(await hasValidCredentials())) {
      console.log('[Gmail] No valid credentials, skipping');
      return null;
    }
    const auth = await getAuthenticatedClient();
    return google.gmail({ version: 'v1', auth });
  } catch (error) {
    console.error('[Gmail] Failed to get client:', error);
    return null;
  }
}

// Parse email address from header (e.g., "John Doe <john@example.com>" -> "john@example.com")
function parseEmailAddress(header: string): string {
  const match = header.match(/<([^>]+)>/);
  return match ? match[1] : header;
}

// Parse sender name from header (e.g., "John Doe <john@example.com>" -> "John Doe")
function parseSenderName(header: string): string {
  const match = header.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : header;
}

// Get header value from message
function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string {
  const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

// Transform Gmail message to UnifiedEmail
function transformMessage(message: gmail_v1.Schema$Message): UnifiedEmail | null {
  if (!message.id || !message.threadId || !message.payload?.headers) {
    return null;
  }

  const headers = message.payload.headers;
  const subject = getHeader(headers, 'Subject');
  const from = getHeader(headers, 'From');
  const to = getHeader(headers, 'To');
  const dateStr = getHeader(headers, 'Date');

  const emailDate = dateStr ? new Date(dateStr) : new Date();
  const daysSinceReceived = Math.floor(
    (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const labelIds = message.labelIds || [];
  const isUnread = labelIds.includes('UNREAD');

  // Heuristic: needs response if unread, from external sender, and > 1 day old
  const fromEmail = parseEmailAddress(from).toLowerCase();
  const isExternal = !fromEmail.includes('@vercel.com') &&
                     !fromEmail.includes('noreply') &&
                     !fromEmail.includes('no-reply') &&
                     !fromEmail.includes('notifications') &&
                     !fromEmail.includes('mailer-daemon');
  const needsResponse = isUnread && isExternal && daysSinceReceived >= 1;

  return {
    id: message.id,
    threadId: message.threadId,
    subject: subject || '(No Subject)',
    from: from,
    to: to.split(',').map((e) => e.trim()),
    date: emailDate,
    snippet: message.snippet || '',
    isUnread,
    needsResponse,
    daysSinceReceived,
    source: 'gmail',
  };
}

// Get emails that likely need a response
export async function getEmailsNeedingResponse(maxResults: number = 20): Promise<UnifiedEmail[]> {
  const gmail = await getGmailClient();
  if (!gmail) return [];

  console.log(`[Gmail] Fetching emails needing response (max ${maxResults})`);

  try {
    // Query: unread emails in inbox, not from mailing lists or automated senders
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox -from:noreply -from:no-reply -from:notifications -from:newsletter -from:mailer-daemon category:primary',
      maxResults,
    });

    const messages = response.data.messages || [];
    if (messages.length === 0) {
      return [];
    }

    // Fetch full message details for each
    const emails: UnifiedEmail[] = [];
    for (const msg of messages) {
      if (!msg.id) continue;

      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        const email = transformMessage(fullMessage.data);
        if (email && email.needsResponse) {
          emails.push(email);
          // Emit event for fetched email thread (non-blocking)
          emitEmailThreadFetched(
            email as unknown as Record<string, unknown>,
            email.date
          ).catch(() => {}); // Fire and forget
        }
      } catch (err) {
        console.error(`[Gmail] Failed to fetch message ${msg.id}:`, err);
      }
    }

    return emails;
  } catch (error) {
    console.error('[Gmail] Failed to fetch emails needing response:', error);
    return [];
  }
}

// Get recent emails from/to a specific contact
export async function getEmailsForContact(email: string, maxResults: number = 10): Promise<UnifiedEmail[]> {
  const gmail = await getGmailClient();
  if (!gmail) return [];

  console.log(`[Gmail] Fetching emails for ${email} (max ${maxResults})`);

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${email} OR to:${email}`,
      maxResults,
    });

    const messages = response.data.messages || [];
    if (messages.length === 0) {
      return [];
    }

    const emails: UnifiedEmail[] = [];
    for (const msg of messages) {
      if (!msg.id) continue;

      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        const emailData = transformMessage(fullMessage.data);
        if (emailData) {
          emails.push(emailData);
          // Emit event for fetched email thread (non-blocking)
          emitEmailThreadFetched(
            emailData as unknown as Record<string, unknown>,
            emailData.date
          ).catch(() => {}); // Fire and forget
        }
      } catch (err) {
        console.error(`[Gmail] Failed to fetch message ${msg.id}:`, err);
      }
    }

    return emails;
  } catch (error) {
    console.error(`[Gmail] Failed to fetch emails for ${email}:`, error);
    return [];
  }
}

// Get email thread count by sender (for identifying who you're ignoring)
export async function getUnreadCountBySender(maxResults: number = 100): Promise<Map<string, number>> {
  const gmail = await getGmailClient();
  if (!gmail) return new Map();

  console.log(`[Gmail] Fetching unread counts by sender`);

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults,
    });

    const messages = response.data.messages || [];
    const senderCounts = new Map<string, number>();

    for (const msg of messages) {
      if (!msg.id) continue;

      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From'],
        });

        const from = getHeader(fullMessage.data.payload?.headers || [], 'From');
        const senderEmail = parseEmailAddress(from).toLowerCase();

        senderCounts.set(senderEmail, (senderCounts.get(senderEmail) || 0) + 1);
      } catch (err) {
        // Skip failed messages
      }
    }

    return senderCounts;
  } catch (error) {
    console.error('[Gmail] Failed to fetch unread counts:', error);
    return new Map();
  }
}

// Search emails with custom query
export async function searchEmails(query: string, maxResults: number = 20): Promise<UnifiedEmail[]> {
  const gmail = await getGmailClient();
  if (!gmail) return [];

  console.log(`[Gmail] Searching: ${query}`);

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = response.data.messages || [];
    if (messages.length === 0) {
      return [];
    }

    const emails: UnifiedEmail[] = [];
    for (const msg of messages) {
      if (!msg.id) continue;

      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        const email = transformMessage(fullMessage.data);
        if (email) {
          emails.push(email);
          // Emit event for fetched email thread (non-blocking)
          emitEmailThreadFetched(
            email as unknown as Record<string, unknown>,
            email.date
          ).catch(() => {}); // Fire and forget
        }
      } catch (err) {
        console.error(`[Gmail] Failed to fetch message ${msg.id}:`, err);
      }
    }

    return emails;
  } catch (error) {
    console.error(`[Gmail] Search failed for "${query}":`, error);
    return [];
  }
}

// Get recent unread emails summary (for daily briefing)
export async function getUnreadSummary(): Promise<{
  total: number;
  needingResponse: number;
  topSenders: { email: string; count: number }[];
}> {
  const gmail = await getGmailClient();
  if (!gmail) {
    return { total: 0, needingResponse: 0, topSenders: [] };
  }

  console.log(`[Gmail] Getting unread summary`);

  try {
    // Get total unread count
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const total = profile.data.messagesTotal || 0;

    // Get emails needing response
    const needingResponse = await getEmailsNeedingResponse(50);

    // Get top senders
    const senderCounts = await getUnreadCountBySender(100);
    const topSenders = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, count]) => ({ email, count }));

    return {
      total,
      needingResponse: needingResponse.length,
      topSenders,
    };
  } catch (error) {
    console.error('[Gmail] Failed to get unread summary:', error);
    return { total: 0, needingResponse: 0, topSenders: [] };
  }
}

// Get threads (for conversation view)
export async function getThread(threadId: string): Promise<UnifiedEmail[]> {
  const gmail = await getGmailClient();
  if (!gmail) return [];

  try {
    const response = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Subject', 'Date'],
    });

    const messages = response.data.messages || [];
    return messages
      .map(transformMessage)
      .filter((e): e is UnifiedEmail => e !== null);
  } catch (error) {
    console.error(`[Gmail] Failed to get thread ${threadId}:`, error);
    return [];
  }
}
