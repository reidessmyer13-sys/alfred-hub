-- Canonical Event Store for Alfred
-- Rules: Append-only, never mutated, never deleted
-- All reasoning happens on events, not raw APIs

-- Create EventType enum (only what exists today)
CREATE TYPE event_type AS ENUM (
  'CalendarEventFetched',
  'EmailThreadFetched',
  'EmailSent',
  'TaskCreated',
  'FollowUpCreated',
  'ReminderTriggered'
);

-- Create SourceSystem enum
CREATE TYPE source_system AS ENUM (
  'google_calendar',
  'gmail',
  'salesforce',
  'granola',
  'slack',
  'alfred_internal'
);

-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type event_type NOT NULL,
  source source_system NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entities JSONB NOT NULL DEFAULT '{}',
  raw_payload JSONB NOT NULL,
  derived_metadata JSONB
);

-- Table comment
COMMENT ON TABLE events IS 'Canonical event store - append-only, never mutated or deleted. All reasoning happens on events, not raw APIs.';

-- Required indexes
CREATE INDEX idx_events_occurred_at ON events (occurred_at);
CREATE INDEX idx_events_account_id ON events ((entities->>'account_id')) WHERE entities->>'account_id' IS NOT NULL;
CREATE INDEX idx_events_opportunity_id ON events ((entities->>'opportunity_id')) WHERE entities->>'opportunity_id' IS NOT NULL;

-- Additional indexes for common queries
CREATE INDEX idx_events_type ON events (type);
CREATE INDEX idx_events_source ON events (source);
CREATE INDEX idx_events_person_ids ON events USING GIN ((entities->'person_ids')) WHERE entities->'person_ids' IS NOT NULL;
