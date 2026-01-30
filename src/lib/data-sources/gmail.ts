// Gmail data fetching
// Integrates with Gmail MCP to find emails needing response

import { UnifiedEmail } from './types';

export interface GmailThread {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  snippet: string;
  labelIds: string[];
  isUnread: boolean;
}

// Transform Gmail thread to unified format
export function transformEmail(gmailThread: GmailThread): UnifiedEmail {
  const emailDate = new Date(gmailThread.date);
  const daysSinceReceived = Math.floor(
    (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Heuristic: needs response if unread and from external sender and > 1 day old
  const isExternal = !gmailThread.from.includes('@vercel.com');
  const needsResponse = gmailThread.isUnread && isExternal && daysSinceReceived >= 1;

  return {
    id: gmailThread.id,
    threadId: gmailThread.threadId,
    subject: gmailThread.subject,
    from: gmailThread.from,
    to: gmailThread.to,
    date: emailDate,
    snippet: gmailThread.snippet,
    isUnread: gmailThread.isUnread,
    needsResponse,
    daysSinceReceived,
    source: 'gmail',
  };
}

// Get emails that likely need a response
export async function getEmailsNeedingResponse(maxResults: number = 20): Promise<UnifiedEmail[]> {
  // Query: unread emails from external senders, not newsletters/marketing
  console.log(`[Gmail] Fetching emails needing response (max ${maxResults})`);

  // This would call the Gmail MCP
  // For now, return empty - will wire up when MCP proxy is ready
  return [];
}

// Get recent emails from/to a specific contact
export async function getEmailsForContact(email: string, maxResults: number = 10): Promise<UnifiedEmail[]> {
  console.log(`[Gmail] Fetching emails for ${email} (max ${maxResults})`);
  return [];
}

// Get email thread count by sender (for identifying who you're ignoring)
export async function getUnreadCountBySender(): Promise<Map<string, number>> {
  console.log(`[Gmail] Fetching unread counts by sender`);
  return new Map();
}

// Search emails with custom query
export async function searchEmails(query: string, maxResults: number = 20): Promise<UnifiedEmail[]> {
  console.log(`[Gmail] Searching: ${query}`);
  return [];
}
