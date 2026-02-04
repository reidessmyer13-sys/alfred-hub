// Context Graph Types
// READ-ONLY data structures derived from events

import type { EventType, SourceSystem } from '../events/eventWriter';

/**
 * A single event in a timeline view
 */
export interface TimelineEvent {
  id: string;
  type: EventType;
  source: SourceSystem;
  occurred_at: Date;
  summary: string;
  entities: {
    person_ids?: string[];
    account_id?: string;
    opportunity_id?: string;
    meeting_id?: string;
    thread_id?: string;
    transcript_id?: string;
  };
  raw_payload: Record<string, unknown>;
}

/**
 * An interaction with a specific person
 */
export interface PersonInteraction {
  person_id: string;
  event_id: string;
  event_type: EventType;
  source: SourceSystem;
  occurred_at: Date;
  context: string;
  related_entities: {
    meeting_id?: string;
    thread_id?: string;
    account_id?: string;
    transcript_id?: string;
  };
}

/**
 * Co-occurrence of people in events
 */
export interface CooccurrenceResult {
  person_a: string;
  person_b: string;
  shared_events: number;
  event_types: EventType[];
  most_recent: Date;
}

/**
 * Raw event row from Supabase
 */
export interface EventRow {
  id: string;
  type: EventType;
  source: SourceSystem;
  occurred_at: string;
  ingested_at: string;
  entities: {
    person_ids?: string[];
    account_id?: string;
    opportunity_id?: string;
    meeting_id?: string;
    thread_id?: string;
    transcript_id?: string;
  };
  raw_payload: Record<string, unknown>;
  derived_metadata?: Record<string, unknown>;
}
