// Context Graph Supabase Client
// READ-ONLY access to events table

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Get read-only Supabase client for context graph queries
 * Separate from main client to enforce read-only semantics
 */
export function getContextGraphClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_KEY || '';
    if (!url || !key) {
      throw new Error('Supabase environment variables not configured');
    }
    _client = createClient(url, key);
  }
  return _client;
}
