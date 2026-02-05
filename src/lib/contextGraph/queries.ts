// Context Graph Queries
// READ-ONLY queries against the events table
// No writes, no inference, no Claude calls

import { getContextGraphClient } from './client';
import type {
  EventRow,
  TimelineEvent,
  PersonInteraction,
  CooccurrenceResult,
} from './types';

/**
 * Generate a human-readable summary from an event
 */
function generateEventSummary(event: EventRow): string {
  const payload = event.raw_payload;

  switch (event.type) {
    case 'CalendarEventFetched':
      return `Meeting: ${payload.title || 'Untitled'}`;

    case 'EmailThreadFetched':
      return `Email: ${payload.subject || 'No subject'} from ${payload.from || 'Unknown'}`;

    case 'EmailSent':
      return `Sent email: ${payload.subject || 'No subject'}`;

    case 'TaskCreated':
      return `Task created: ${payload.title || 'Untitled'}`;

    case 'FollowUpCreated':
      return `Follow-up: ${payload.contact_name || 'Unknown contact'}`;

    case 'ReminderTriggered':
      const reminderType = event.derived_metadata?.reminder_type || 'unknown';
      return `Reminder triggered (${reminderType})`;

    case 'GranolaTranscriptFetched':
      return `Transcript: ${payload.title || 'Untitled meeting'}`;

    default:
      return `Event: ${event.type}`;
  }
}

/**
 * Transform raw event row to TimelineEvent
 */
function toTimelineEvent(row: EventRow): TimelineEvent {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    occurred_at: new Date(row.occurred_at),
    summary: generateEventSummary(row),
    entities: row.entities,
    raw_payload: row.raw_payload,
  };
}

/**
 * Get all events involving a specific person, ordered chronologically
 *
 * @param personId - Email address or person identifier
 * @param limit - Maximum number of events to return (default 100)
 */
export async function getTimelineForPerson(
  personId: string,
  limit: number = 100
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  // Query events where person_id appears in entities.person_ids array
  const { data, error } = await client
    .from('events')
    .select('*')
    .contains('entities->person_ids', [personId])
    .order('occurred_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[ContextGraph] getTimelineForPerson error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get all events related to a specific meeting
 *
 * @param meetingId - Meeting identifier (calendar ID or internal ID)
 */
export async function getEventsForMeeting(
  meetingId: string
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entities->meeting_id', meetingId)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('[ContextGraph] getEventsForMeeting error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get all events related to a specific email thread
 *
 * @param threadId - Gmail thread ID
 */
export async function getEventsForThread(
  threadId: string
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entities->thread_id', threadId)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('[ContextGraph] getEventsForThread error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get recent interactions for a person within a time window
 *
 * @param personId - Email address or person identifier
 * @param daysBack - Number of days to look back (default 30)
 */
export async function getRecentInteractionsForPerson(
  personId: string,
  daysBack: number = 30
): Promise<PersonInteraction[]> {
  const client = getContextGraphClient();

  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data, error } = await client
    .from('events')
    .select('*')
    .contains('entities->person_ids', [personId])
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('[ContextGraph] getRecentInteractionsForPerson error:', error.message);
    return [];
  }

  return (data as EventRow[]).map((row) => ({
    person_id: personId,
    event_id: row.id,
    event_type: row.type,
    source: row.source,
    occurred_at: new Date(row.occurred_at),
    context: generateEventSummary(row),
    related_entities: {
      meeting_id: row.entities.meeting_id,
      thread_id: row.entities.thread_id,
      account_id: row.entities.account_id,
    },
  }));
}

/**
 * Find people who frequently appear together in events
 * Uses in-memory join to avoid complex SQL
 *
 * @param limit - Maximum number of co-occurrences to return
 */
export async function getPersonCooccurrences(
  limit: number = 50
): Promise<CooccurrenceResult[]> {
  const client = getContextGraphClient();

  // Fetch all events with person_ids
  const { data, error } = await client
    .from('events')
    .select('id, type, occurred_at, entities->person_ids')
    .not('entities->person_ids', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(500); // Cap to avoid memory issues

  if (error) {
    console.error('[ContextGraph] getPersonCooccurrences error:', error.message);
    return [];
  }

  // Build co-occurrence map in memory
  const cooccurrenceMap = new Map<string, {
    count: number;
    types: Set<string>;
    mostRecent: Date;
  }>();

  for (const row of data || []) {
    const personIds = row.person_ids as string[] | null;
    if (!personIds || personIds.length < 2) continue;

    // Generate all pairs
    for (let i = 0; i < personIds.length; i++) {
      for (let j = i + 1; j < personIds.length; j++) {
        const [a, b] = [personIds[i], personIds[j]].sort();
        const key = `${a}||${b}`;

        const existing = cooccurrenceMap.get(key);
        const eventDate = new Date(row.occurred_at);

        if (existing) {
          existing.count++;
          existing.types.add(row.type);
          if (eventDate > existing.mostRecent) {
            existing.mostRecent = eventDate;
          }
        } else {
          cooccurrenceMap.set(key, {
            count: 1,
            types: new Set([row.type]),
            mostRecent: eventDate,
          });
        }
      }
    }
  }

  // Convert to sorted array
  const results: CooccurrenceResult[] = [];
  for (const [key, value] of cooccurrenceMap.entries()) {
    const [person_a, person_b] = key.split('||');
    results.push({
      person_a,
      person_b,
      shared_events: value.count,
      event_types: Array.from(value.types) as CooccurrenceResult['event_types'],
      most_recent: value.mostRecent,
    });
  }

  // Sort by shared_events descending, then by most_recent
  results.sort((a, b) => {
    if (b.shared_events !== a.shared_events) {
      return b.shared_events - a.shared_events;
    }
    return b.most_recent.getTime() - a.most_recent.getTime();
  });

  return results.slice(0, limit);
}

/**
 * Get all events for an account (if account_id exists in entities)
 *
 * @param accountId - Salesforce account ID or similar
 */
export async function getEventsForAccount(
  accountId: string
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entities->account_id', accountId)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('[ContextGraph] getEventsForAccount error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get all events for an opportunity (if opportunity_id exists in entities)
 *
 * @param opportunityId - Salesforce opportunity ID or similar
 */
export async function getEventsForOpportunity(
  opportunityId: string
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entities->opportunity_id', opportunityId)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('[ContextGraph] getEventsForOpportunity error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get all events for a transcript
 *
 * @param transcriptId - Granola transcript ID
 */
export async function getEventsForTranscript(
  transcriptId: string
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('entities->transcript_id', transcriptId)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('[ContextGraph] getEventsForTranscript error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get all transcripts (GranolaTranscriptFetched events)
 * Optionally filter by time range
 *
 * @param daysBack - Number of days to look back (default 30)
 * @param limit - Maximum number to return (default 50)
 */
export async function getRecentTranscripts(
  daysBack: number = 30,
  limit: number = 50
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('type', 'GranolaTranscriptFetched')
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ContextGraph] getRecentTranscripts error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get transcripts for a specific meeting
 *
 * @param meetingId - Meeting identifier
 */
export async function getTranscriptsForMeeting(
  meetingId: string
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('type', 'GranolaTranscriptFetched')
    .eq('entities->meeting_id', meetingId)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('[ContextGraph] getTranscriptsForMeeting error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get transcripts involving a specific person
 *
 * @param personId - Email address or person identifier
 * @param limit - Maximum number to return (default 20)
 */
export async function getTranscriptsForPerson(
  personId: string,
  limit: number = 20
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('type', 'GranolaTranscriptFetched')
    .contains('entities->person_ids', [personId])
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ContextGraph] getTranscriptsForPerson error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get recent activity feed - all events ordered chronologically (newest first)
 * Used for the Activity Feed in the dashboard
 *
 * @param limit - Maximum number of events to return (default 50)
 * @param types - Optional filter by event types
 */
export async function getActivityFeed(
  limit: number = 50,
  types?: string[]
): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  let query = client
    .from('events')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (types && types.length > 0) {
    query = query.in('type', types);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ContextGraph] getActivityFeed error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get today's events
 * Used for the dashboard agenda
 */
export async function getTodaysEvents(): Promise<TimelineEvent[]> {
  const client = getContextGraphClient();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const { data, error } = await client
    .from('events')
    .select('*')
    .gte('occurred_at', startOfDay.toISOString())
    .lt('occurred_at', endOfDay.toISOString())
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('[ContextGraph] getTodaysEvents error:', error.message);
    return [];
  }

  return (data as EventRow[]).map(toTimelineEvent);
}

/**
 * Get event counts by type for a given time range
 * Used for dashboard stats
 */
export async function getEventStats(daysBack: number = 7): Promise<{
  total: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}> {
  const client = getContextGraphClient();

  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data, error } = await client
    .from('events')
    .select('type, source')
    .gte('occurred_at', since.toISOString());

  if (error) {
    console.error('[ContextGraph] getEventStats error:', error.message);
    return { total: 0, byType: {}, bySource: {} };
  }

  const byType: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const row of data || []) {
    byType[row.type] = (byType[row.type] || 0) + 1;
    bySource[row.source] = (bySource[row.source] || 0) + 1;
  }

  return {
    total: data?.length || 0,
    byType,
    bySource,
  };
}
