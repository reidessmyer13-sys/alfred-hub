-- Granola Notes Table for storing meeting notes from Zapier webhook
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS granola_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  granola_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  attendees JSONB DEFAULT '[]'::jsonb,
  meeting_date TIMESTAMPTZ,
  duration_minutes INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_granola_notes_granola_id ON granola_notes(granola_id);
CREATE INDEX IF NOT EXISTS idx_granola_notes_meeting_date ON granola_notes(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_granola_notes_title ON granola_notes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_granola_notes_content ON granola_notes USING gin(to_tsvector('english', content));

-- Enable RLS (Row Level Security)
ALTER TABLE granola_notes ENABLE ROW LEVEL SECURITY;

-- Policy for service role (allows full access for the backend)
CREATE POLICY "Service role can manage granola_notes" ON granola_notes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_granola_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_granola_notes_updated_at ON granola_notes;
CREATE TRIGGER trigger_granola_notes_updated_at
  BEFORE UPDATE ON granola_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_granola_notes_updated_at();
