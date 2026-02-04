// Post-Meeting Insights Generator
// READ-ONLY - combines extraction with context correlation
// No writes, no automation, no inference

import {
  getEventsForMeeting,
  getRecentInteractionsForPerson,
  getEventsForTranscript,
  type TimelineEvent,
} from '../contextGraph';

import {
  extractActionsFromTranscript,
  computeExtractionStats,
} from './extractor';

import type {
  PostMeetingInsights,
  SurfacedContext,
} from './types';

/**
 * Extract related follow-ups from person events
 */
function extractRelatedFollowUps(
  events: TimelineEvent[]
): SurfacedContext['related_follow_ups'] {
  return events
    .filter((e) => e.type === 'FollowUpCreated')
    .map((e) => ({
      event_id: e.id,
      contact_name: (e.raw_payload.contact_name as string) || 'Unknown',
      context: (e.raw_payload.context as string) || '',
      urgency: (e.raw_payload.urgency as string) || 'medium',
    }));
}

/**
 * Extract related email threads from person events
 */
function extractRelatedThreads(
  events: TimelineEvent[]
): SurfacedContext['related_threads'] {
  const threadMap = new Map<string, SurfacedContext['related_threads'][0]>();

  for (const event of events) {
    if (event.type !== 'EmailThreadFetched') continue;

    const threadId = event.entities.thread_id;
    if (!threadId) continue;

    const existing = threadMap.get(threadId);
    if (!existing || event.occurred_at > existing.last_activity) {
      threadMap.set(threadId, {
        thread_id: threadId,
        subject: (event.raw_payload.subject as string) || 'No subject',
        last_activity: event.occurred_at,
      });
    }
  }

  return Array.from(threadMap.values())
    .sort((a, b) => b.last_activity.getTime() - a.last_activity.getTime())
    .slice(0, 5);
}

/**
 * Build surfaced context from related events
 */
async function buildSurfacedContext(
  attendees: string[],
  meetingId?: string,
  opportunityId?: string,
  accountId?: string
): Promise<SurfacedContext> {
  const context: SurfacedContext = {};

  // Add opportunity context if available
  if (opportunityId || accountId) {
    context.related_opportunity = {
      opportunity_id: opportunityId || '',
      account_id: accountId,
    };
  }

  // Gather events for all attendees
  const allAttendeeEvents: TimelineEvent[] = [];

  for (const attendee of attendees.slice(0, 5)) { // Limit to avoid excessive queries
    const interactions = await getRecentInteractionsForPerson(attendee, 30);
    // Convert PersonInteraction to TimelineEvent format for consistency
    // We need to re-fetch as TimelineEvents
    const events = await getEventsForMeeting(meetingId || '');
    allAttendeeEvents.push(...events);
  }

  // Also get events directly linked to the meeting
  if (meetingId) {
    const meetingEvents = await getEventsForMeeting(meetingId);
    allAttendeeEvents.push(...meetingEvents);
  }

  // Deduplicate
  const uniqueEvents = new Map<string, TimelineEvent>();
  for (const event of allAttendeeEvents) {
    if (!uniqueEvents.has(event.id)) {
      uniqueEvents.set(event.id, event);
    }
  }
  const events = Array.from(uniqueEvents.values());

  // Extract follow-ups and threads
  context.related_follow_ups = extractRelatedFollowUps(events);
  context.related_threads = extractRelatedThreads(events);

  return context;
}

/**
 * Generate post-meeting insights from a transcript event
 *
 * @param transcriptEvent - The GranolaTranscriptFetched event
 */
export async function generatePostMeetingInsights(
  transcriptEvent: TimelineEvent
): Promise<PostMeetingInsights> {
  const payload = transcriptEvent.raw_payload;

  // Extract basic info
  const transcriptId = transcriptEvent.entities.transcript_id || transcriptEvent.id;
  const meetingId = transcriptEvent.entities.meeting_id;
  const meetingTitle = (payload.title as string) || 'Untitled Meeting';
  const meetingDate = transcriptEvent.occurred_at;
  const attendees = (payload.attendees as string[]) || transcriptEvent.entities.person_ids || [];

  // Get transcript content and action items
  const content = (payload.content as string) || '';
  const actionItems = (payload.action_items as string[]) || [];

  // Extract actions deterministically
  const extractedActions = extractActionsFromTranscript(content, actionItems, attendees);
  const stats = computeExtractionStats(extractedActions);

  // Build correlated context
  const surfacedContext = await buildSurfacedContext(
    attendees,
    meetingId,
    transcriptEvent.entities.opportunity_id,
    transcriptEvent.entities.account_id
  );

  return {
    meeting_id: meetingId,
    transcript_id: transcriptId,
    meeting_title: meetingTitle,
    meeting_date: meetingDate,
    attendees,
    extracted_actions: extractedActions,
    surfaced_context: surfacedContext,
    generated_at: new Date(),
    extraction_stats: stats,
  };
}

/**
 * Generate insights for a transcript by ID
 *
 * @param transcriptId - The Granola transcript ID
 */
export async function generateInsightsForTranscript(
  transcriptId: string
): Promise<PostMeetingInsights | null> {
  const events = await getEventsForTranscript(transcriptId);

  const transcriptEvent = events.find(
    (e) => e.type === 'GranolaTranscriptFetched'
  );

  if (!transcriptEvent) {
    console.log(`[PostMeeting] No transcript found for ID: ${transcriptId}`);
    return null;
  }

  return generatePostMeetingInsights(transcriptEvent);
}

/**
 * Generate insights for a meeting by ID
 * Finds the associated transcript and generates insights
 *
 * @param meetingId - The meeting ID
 */
export async function generateInsightsForMeeting(
  meetingId: string
): Promise<PostMeetingInsights | null> {
  const events = await getEventsForMeeting(meetingId);

  const transcriptEvent = events.find(
    (e) => e.type === 'GranolaTranscriptFetched'
  );

  if (!transcriptEvent) {
    console.log(`[PostMeeting] No transcript found for meeting: ${meetingId}`);
    return null;
  }

  return generatePostMeetingInsights(transcriptEvent);
}
