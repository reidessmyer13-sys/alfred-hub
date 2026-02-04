// Granola Context Linker
// READ-ONLY - finds related meetings and opportunities from Context Graph
// No inference, no scoring, no Claude calls

import { getContextGraphClient } from '../contextGraph/client';

export interface LinkedMeeting {
  meeting_id: string;
  title: string;
  start_time: Date;
  match_reason: 'title' | 'attendees' | 'date';
}

export interface LinkedOpportunity {
  opportunity_id: string;
  account_id?: string;
  match_reason: 'attendee_email';
}

/**
 * Find a calendar event that matches this transcript
 * Uses title, date, and attendee matching
 * READ-ONLY - queries events table only
 */
export async function findLinkedMeeting(
  title?: string,
  meetingDate?: string,
  attendees?: string[]
): Promise<LinkedMeeting | null> {
  const client = getContextGraphClient();

  // Build search window around meeting date
  let startDate: Date;
  let endDate: Date;

  if (meetingDate) {
    const date = new Date(meetingDate);
    // Look within 24 hours of the meeting date
    startDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    endDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // Default to last 7 days
    endDate = new Date();
    startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Query CalendarEventFetched events in the time window
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('type', 'CalendarEventFetched')
    .gte('occurred_at', startDate.toISOString())
    .lte('occurred_at', endDate.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    return null;
  }

  // Try to match by title first (most reliable)
  if (title) {
    const normalizedTitle = normalizeTitle(title);
    for (const event of data) {
      const eventTitle = normalizeTitle(event.raw_payload?.title as string || '');
      if (eventTitle && titlesMatch(normalizedTitle, eventTitle)) {
        return {
          meeting_id: event.entities?.meeting_id || event.id,
          title: event.raw_payload?.title as string,
          start_time: new Date(event.occurred_at),
          match_reason: 'title',
        };
      }
    }
  }

  // Try to match by attendees (if title didn't match)
  if (attendees && attendees.length > 0) {
    const normalizedAttendees = attendees.map(a => normalizeEmail(a));

    for (const event of data) {
      const eventAttendees = (event.entities?.person_ids || []) as string[];
      const normalizedEventAttendees = eventAttendees.map(a => normalizeEmail(a));

      // Check for overlap
      const overlap = normalizedAttendees.filter(a =>
        normalizedEventAttendees.includes(a)
      );

      if (overlap.length > 0) {
        return {
          meeting_id: event.entities?.meeting_id || event.id,
          title: event.raw_payload?.title as string,
          start_time: new Date(event.occurred_at),
          match_reason: 'attendees',
        };
      }
    }
  }

  // If we have a date but no other match, return the closest event
  if (meetingDate && data.length > 0) {
    const targetTime = new Date(meetingDate).getTime();
    let closest = data[0];
    let closestDiff = Math.abs(new Date(data[0].occurred_at).getTime() - targetTime);

    for (const event of data) {
      const diff = Math.abs(new Date(event.occurred_at).getTime() - targetTime);
      if (diff < closestDiff) {
        closest = event;
        closestDiff = diff;
      }
    }

    // Only return if within 2 hours
    if (closestDiff < 2 * 60 * 60 * 1000) {
      return {
        meeting_id: closest.entities?.meeting_id || closest.id,
        title: closest.raw_payload?.title as string,
        start_time: new Date(closest.occurred_at),
        match_reason: 'date',
      };
    }
  }

  return null;
}

/**
 * Find a Salesforce opportunity linked to any of the attendees
 * READ-ONLY - queries events table only
 */
export async function findLinkedOpportunity(
  attendees?: string[]
): Promise<LinkedOpportunity | null> {
  if (!attendees || attendees.length === 0) {
    return null;
  }

  const client = getContextGraphClient();

  // Look for events with opportunity_id that have matching person_ids
  // This would typically come from Salesforce events when we have them
  const { data, error } = await client
    .from('events')
    .select('entities')
    .not('entities->opportunity_id', 'is', null)
    .limit(100);

  if (error || !data || data.length === 0) {
    return null;
  }

  const normalizedAttendees = attendees.map(a => normalizeEmail(a));

  for (const event of data) {
    const eventPersonIds = (event.entities?.person_ids || []) as string[];
    const normalizedEventPersons = eventPersonIds.map(a => normalizeEmail(a));

    // Check for overlap
    const hasOverlap = normalizedAttendees.some(a =>
      normalizedEventPersons.includes(a)
    );

    if (hasOverlap && event.entities?.opportunity_id) {
      return {
        opportunity_id: event.entities.opportunity_id as string,
        account_id: event.entities.account_id as string | undefined,
        match_reason: 'attendee_email',
      };
    }
  }

  return null;
}

// Helper functions

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function titlesMatch(a: string, b: string): boolean {
  // Exact match
  if (a === b) return true;

  // One contains the other
  if (a.includes(b) || b.includes(a)) return true;

  // Word overlap > 50%
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.length / union.size > 0.5;
}
