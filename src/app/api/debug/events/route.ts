// DEBUG ENDPOINT - For internal verification only
// NOT for production use
// Access: GET /api/debug/events?hours=48

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Only allow in development or with secret
  const authHeader = request.headers.get('authorization');
  const isDev = process.env.NODE_ENV === 'development';
  const hasSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isDev && !hasSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || '';

  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const hours = parseInt(request.nextUrl.searchParams.get('hours') || '48', 10);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('events')
    .select('id, type, source, occurred_at, ingested_at, entities')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Summarize
  const byType: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const event of data || []) {
    byType[event.type] = (byType[event.type] || 0) + 1;
    bySource[event.source] = (bySource[event.source] || 0) + 1;
  }

  return NextResponse.json({
    summary: {
      total: data?.length || 0,
      hours,
      byType,
      bySource,
    },
    timeline: data?.map((e) => ({
      type: e.type,
      source: e.source,
      occurred_at: e.occurred_at,
      entities: e.entities,
    })),
  });
}
