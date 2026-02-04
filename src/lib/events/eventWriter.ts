// Canonical Event Writer for Alfred
// ALL event writes MUST go through this module
// Rules:
// 1. Events are append-only
// 2. No event is ever mutated or deleted
// 3. Write-only - no reads, no reasoning, no Claude calls

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-loaded Supabase client for events (avoids circular dependency)
let _eventSupabase: SupabaseClient | null = null;

function getEventSupabase(): SupabaseClient {
  if (!_eventSupabase) {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_KEY || '';
    if (!url || !key) {
      throw new Error('Supabase environment variables not configured');
    }
    _eventSupabase = createClient(url, key);
  }
  return _eventSupabase;
}

// Event Types
export type EventType =
  | 'CalendarEventFetched'
  | 'EmailThreadFetched'
  | 'EmailSent'
  | 'TaskCreated'
  | 'FollowUpCreated'
  | 'ReminderTriggered'
  | 'GranolaTranscriptFetched';

// Source Systems
export type SourceSystem =
  | 'google_calendar'
  | 'gmail'
  | 'salesforce'
  | 'granola'
  | 'slack'
  | 'alfred_internal';

// Entity references for linking events
export interface EventEntities {
  person_ids?: string[];
  account_id?: string;
  opportunity_id?: string;
  meeting_id?: string;
  thread_id?: string;
  transcript_id?: string;
}

// Event payload for writing
export interface EventPayload {
  type: EventType;
  source: SourceSystem;
  occurred_at: Date;
  entities: EventEntities;
  raw_payload: Record<string, unknown>;
  derived_metadata?: Record<string, unknown>;
}

/**
 * Write a single event to the canonical event store
 * Non-blocking, fire-and-forget
 */
export async function writeEvent(event: EventPayload): Promise<void> {
  try {
    const supabase = getEventSupabase();

    const { error } = await supabase.from('events').insert({
      type: event.type,
      source: event.source,
      occurred_at: event.occurred_at.toISOString(),
      entities: event.entities,
      raw_payload: event.raw_payload,
      derived_metadata: event.derived_metadata || null,
    });

    if (error) {
      console.error('[EventWriter] Failed to write event:', error.message);
      return;
    }

    console.log(`[EventWriter] ${event.type} from ${event.source}`);
  } catch (err) {
    console.error('[EventWriter] Error:', err);
  }
}

/**
 * Write multiple events in a batch
 * Non-blocking, fire-and-forget
 */
export async function writeEvents(events: EventPayload[]): Promise<void> {
  if (events.length === 0) return;

  try {
    const supabase = getEventSupabase();

    const rows = events.map((event) => ({
      type: event.type,
      source: event.source,
      occurred_at: event.occurred_at.toISOString(),
      entities: event.entities,
      raw_payload: event.raw_payload,
      derived_metadata: event.derived_metadata || null,
    }));

    const { error } = await supabase.from('events').insert(rows);

    if (error) {
      console.error('[EventWriter] Failed to write batch:', error.message);
      return;
    }

    console.log(`[EventWriter] Wrote ${events.length} events in batch`);
  } catch (err) {
    console.error('[EventWriter] Batch error:', err);
  }
}
