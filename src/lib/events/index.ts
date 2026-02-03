// Canonical Event System for Alfred
// Rules:
// 1. Events are append-only
// 2. No event is ever mutated or deleted
// 3. All writes go through eventWriter
// 4. No reasoning, no Claude calls, no reads from events

import { writeEvent, writeEvents } from './eventWriter';
import type { EventType, SourceSystem, EventEntities, EventPayload } from './eventWriter';

// Re-export types
export type { EventType, SourceSystem, EventEntities, EventPayload };

// Re-export writer functions
export { writeEvent, writeEvents };

// ============================================
// Convenience functions for specific event types
// All use eventWriter under the hood
// ============================================

/**
 * Emit CalendarEventFetched when a meeting is pulled from Google Calendar
 */
export async function emitCalendarEventFetched(
  meeting: Record<string, unknown>,
  occurredAt: Date
): Promise<void> {
  return writeEvent({
    type: 'CalendarEventFetched',
    source: 'google_calendar',
    occurred_at: occurredAt,
    entities: {
      meeting_id: meeting.id as string | undefined,
      person_ids: (meeting.attendees as string[] | undefined) || [],
    },
    raw_payload: meeting,
  });
}

/**
 * Emit EmailThreadFetched when an email thread is pulled from Gmail
 */
export async function emitEmailThreadFetched(
  email: Record<string, unknown>,
  occurredAt: Date
): Promise<void> {
  return writeEvent({
    type: 'EmailThreadFetched',
    source: 'gmail',
    occurred_at: occurredAt,
    entities: {
      thread_id: email.threadId as string | undefined,
    },
    raw_payload: email,
  });
}

/**
 * Emit EmailSent when an email is sent via Gmail
 */
export async function emitEmailSent(
  email: Record<string, unknown>,
  occurredAt: Date
): Promise<void> {
  return writeEvent({
    type: 'EmailSent',
    source: 'gmail',
    occurred_at: occurredAt,
    entities: {
      thread_id: email.threadId as string | undefined,
    },
    raw_payload: email,
  });
}

/**
 * Emit TaskCreated when a new task is created
 */
export async function emitTaskCreated(
  task: Record<string, unknown>
): Promise<void> {
  return writeEvent({
    type: 'TaskCreated',
    source: 'alfred_internal',
    occurred_at: new Date(),
    entities: {},
    raw_payload: task,
    derived_metadata: {
      priority: task.priority,
      source: task.source,
    },
  });
}

/**
 * Emit FollowUpCreated when a new follow-up is created
 */
export async function emitFollowUpCreated(
  followUp: Record<string, unknown>
): Promise<void> {
  return writeEvent({
    type: 'FollowUpCreated',
    source: 'alfred_internal',
    occurred_at: new Date(),
    entities: {
      person_ids: followUp.contact_email ? [followUp.contact_email as string] : [],
    },
    raw_payload: followUp,
    derived_metadata: {
      urgency: followUp.urgency,
      contact_name: followUp.contact_name,
    },
  });
}

/**
 * Emit ReminderTriggered when a scheduled reminder fires
 */
export async function emitReminderTriggered(
  reminderType: 'follow_up' | 'meeting' | 'task',
  details: Record<string, unknown>
): Promise<void> {
  return writeEvent({
    type: 'ReminderTriggered',
    source: 'alfred_internal',
    occurred_at: new Date(),
    entities: {
      meeting_id: details.meeting_id as string | undefined,
    },
    raw_payload: details,
    derived_metadata: {
      reminder_type: reminderType,
    },
  });
}
