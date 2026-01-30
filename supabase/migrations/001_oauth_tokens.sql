-- OAuth Tokens Table for storing refresh tokens
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider_user ON oauth_tokens(provider, user_id);

-- Enable RLS (Row Level Security) but allow service role full access
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role can manage tokens" ON oauth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
