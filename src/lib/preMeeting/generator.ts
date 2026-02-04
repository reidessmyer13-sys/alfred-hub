// Pre-Meeting Brief Generator
// READ-ONLY - uses Context Graph to build meeting briefings
// No writes, no inference, no Claude calls

import {
  getEventsForMeeting,
  getRecentInteractionsForPerson,
  getTimelineForPerson,
  type TimelineEvent,
  type PersonInteraction,
} from '../contextGraph';

import type {
  PreMeetingBrief,
  MeetingInfo,
  AttendeeContext,
  RelatedFollowUp,
  RelatedThread,
} from './types';

/**
 * Extract meeting info from a CalendarEventFetched event
 */
function extractMeetingInfo(event: TimelineEvent): MeetingInfo {
  const payload = event.raw_payload;

  return {
    meeting_id: event.entities.meeting_id || event.id,
    title: (payload.title as string) || 'Untitled Meeting',
    start_time: payload.startTime
      ? new Date(payload.startTime as string)
      : event.occurred_at,
    end_time: payload.endTime
      ? new Date(payload.endTime as string)
      : undefined,
    location: payload.location as string | undefined,
    description: payload.description as string | undefined,
  };
}

/**
 * Extract attendee emails from meeting event
 */
function extractAttendeeEmails(event: TimelineEvent): string[] {
  // Check entities first
  if (event.entities.person_ids && event.entities.person_ids.length > 0) {
    return event.entities.person_ids;
  }

  // Fall back to raw_payload.attendees
  const attendees = event.raw_payload.attendees;
  if (Array.isArray(attendees)) {
    return attendees.filter((a): a is string => typeof a === 'string');
  }

  return [];
}

/**
 * Build attendee context from their recent interactions
 */
async function buildAttendeeContext(
  email: string,
  daysBack: number = 30
): Promise<AttendeeContext> {
  const interactions = await getRecentInteractionsForPerson(email, daysBack);

  return {
    email,
    name: undefined, // Could be enriched later from contacts
    interaction_count: interactions.length,
    last_interaction: interactions.length > 0
      ? interactions[0].occurred_at
      : undefined,
    recent_interactions: interactions.slice(0, 5), // Limit to 5 most recent
  };
}

/**
 * Extract follow-ups from events for attendees
 */
function extractFollowUps(events: TimelineEvent[]): RelatedFollowUp[] {
  return events
    .filter((e) => e.type === 'FollowUpCreated')
    .map((e) => ({
      event_id: e.id,
      contact_name: (e.raw_payload.contact_name as string) || 'Unknown',
      contact_email: e.entities.person_ids?.[0],
      context: (e.raw_payload.context as string) || '',
      urgency: (e.raw_payload.urgency as string) || 'medium',
      created_at: e.occurred_at,
    }));
}

/**
 * Extract email threads from events for attendees
 */
function extractThreads(events: TimelineEvent[]): RelatedThread[] {
  const threadMap = new Map<string, RelatedThread>();

  for (const event of events) {
    if (event.type !== 'EmailThreadFetched') continue;

    const threadId = event.entities.thread_id;
    if (!threadId) continue;

    const existing = threadMap.get(threadId);
    const eventTime = event.occurred_at;

    // Keep most recent activity per thread
    if (!existing || eventTime > existing.last_activity) {
      threadMap.set(threadId, {
        thread_id: threadId,
        subject: (event.raw_payload.subject as string) || 'No subject',
        from: (event.raw_payload.from as string) || 'Unknown',
        last_activity: eventTime,
        snippet: event.raw_payload.snippet as string | undefined,
      });
    }
  }

  return Array.from(threadMap.values()).sort(
    (a, b) => b.last_activity.getTime() - a.last_activity.getTime()
  );
}

/**
 * Generate a pre-meeting brief for a given meeting
 *
 * @param meetingId - The meeting identifier
 * @param daysBack - How many days of history to include (default 30)
 */
export async function generatePreMeetingBrief(
  meetingId: string,
  daysBack: number = 30
): Promise<PreMeetingBrief | null> {
  const dataSources: string[] = [];

  // Step 1: Get the meeting event
  const meetingEvents = await getEventsForMeeting(meetingId);
  dataSources.push('getEventsForMeeting');

  const calendarEvent = meetingEvents.find(
    (e) => e.type === 'CalendarEventFetched'
  );

  if (!calendarEvent) {
    console.log(`[PreMeeting] No calendar event found for meeting ${meetingId}`);
    return null;
  }

  // Step 2: Extract meeting info and attendees
  const meeting = extractMeetingInfo(calendarEvent);
  const attendeeEmails = extractAttendeeEmails(calendarEvent);

  // Step 3: Build context for each attendee
  const attendees: AttendeeContext[] = [];
  const allAttendeeEvents: TimelineEvent[] = [];

  for (const email of attendeeEmails) {
    const context = await buildAttendeeContext(email, daysBack);
    attendees.push(context);
    dataSources.push(`getRecentInteractionsForPerson(${email})`);

    // Also get full timeline for richer context
    const timeline = await getTimelineForPerson(email, 20);
    allAttendeeEvents.push(...timeline);
    dataSources.push(`getTimelineForPerson(${email})`);
  }

  // Step 4: Deduplicate and sort all attendee events
  const uniqueEvents = new Map<string, TimelineEvent>();
  for (const event of allAttendeeEvents) {
    if (!uniqueEvents.has(event.id)) {
      uniqueEvents.set(event.id, event);
    }
  }
  const recentInteractions = Array.from(uniqueEvents.values())
    .sort((a, b) => b.occurred_at.getTime() - a.occurred_at.getTime())
    .slice(0, 10); // Top 10 most recent

  // Step 5: Extract follow-ups and threads
  const openFollowUps = extractFollowUps(Array.from(uniqueEvents.values()));
  const relatedThreads = extractThreads(Array.from(uniqueEvents.values()));

  return {
    meeting,
    attendees,
    recentInteractions,
    openFollowUps,
    relatedThreads,
    generated_at: new Date(),
    data_sources: [...new Set(dataSources)], // Deduplicate
  };
}

/**
 * Generate a brief by looking up meeting from recent calendar events
 * Useful when you have attendee email but not meeting_id
 *
 * @param attendeeEmail - Email of an attendee
 * @param daysAhead - How many days ahead to look for meetings
 */
export async function findUpcomingMeetingBrief(
  attendeeEmail: string,
  daysAhead: number = 7
): Promise<PreMeetingBrief | null> {
  // Get recent calendar events for this person
  const timeline = await getTimelineForPerson(attendeeEmail, 50);

  // Find the most recent CalendarEventFetched
  const upcomingMeeting = timeline
    .filter((e) => e.type === 'CalendarEventFetched')
    .sort((a, b) => b.occurred_at.getTime() - a.occurred_at.getTime())[0];

  if (!upcomingMeeting) {
    console.log(`[PreMeeting] No upcoming meetings found for ${attendeeEmail}`);
    return null;
  }

  const meetingId = upcomingMeeting.entities.meeting_id || upcomingMeeting.id;
  return generatePreMeetingBrief(meetingId);
}
