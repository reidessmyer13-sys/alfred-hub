-- Add GranolaTranscriptFetched to event_type enum
-- This enables automated transcript ingestion into the canonical event system

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'GranolaTranscriptFetched';

-- Add transcript_id to entities for linking transcripts
-- (No schema change needed - entities is JSONB and already supports arbitrary keys)

-- Add index for transcript lookups
CREATE INDEX IF NOT EXISTS idx_events_transcript_id
  ON events ((entities->>'transcript_id'))
  WHERE entities->>'transcript_id' IS NOT NULL;
