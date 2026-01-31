// Gmail data fetching
// Integrates with Gmail API directly using OAuth tokens

import { UnifiedEmail } from './types';
import * as GmailAPI from '../google/gmail';

// Re-export all functions from the Gmail API module
// These now use the actual Google Gmail API

// Get emails that likely need a response
export async function getEmailsNeedingResponse(maxResults: number = 20): Promise<UnifiedEmail[]> {
  return GmailAPI.getEmailsNeedingResponse(maxResults);
}

// Get recent emails from/to a specific contact
export async function getEmailsForContact(email: string, maxResults: number = 10): Promise<UnifiedEmail[]> {
  return GmailAPI.getEmailsForContact(email, maxResults);
}

// Get email thread count by sender (for identifying who you're ignoring)
export async function getUnreadCountBySender(maxResults: number = 100): Promise<Map<string, number>> {
  return GmailAPI.getUnreadCountBySender(maxResults);
}

// Search emails with custom query
export async function searchEmails(query: string, maxResults: number = 20): Promise<UnifiedEmail[]> {
  return GmailAPI.searchEmails(query, maxResults);
}

// Get unread email summary for daily briefing
export async function getUnreadSummary(): Promise<{
  total: number;
  needingResponse: number;
  topSenders: { email: string; count: number }[];
}> {
  return GmailAPI.getUnreadSummary();
}

// Get full email thread
export async function getThread(threadId: string): Promise<UnifiedEmail[]> {
  return GmailAPI.getThread(threadId);
}
