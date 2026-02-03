// Event Debug Reader - FOR INTERNAL VERIFICATION ONLY
// NOT for production use - purely for human verification and debugging
// No reasoning, no Claude calls, read-only

import { createClient } from '@supabase/supabase-js';

interface EventRow {
  id: string;
  type: string;
  source: string;
  occurred_at: string;
  ingested_at: string;
  entities: Record<string, unknown>;
  raw_payload: Record<string, unknown>;
  derived_metadata: Record<string, unknown> | null;
}

interface EventSummary {
  id: string;
  type: string;
  source: string;
  occurred_at: string;
  entities: Record<string, unknown>;
}

/**
 * Fetch recent events for debugging/verification
 * @param hours - How many hours back to look (default 48)
 */
export async function getRecentEvents(hours: number = 48): Promise<EventSummary[]> {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || '';

  if (!url || !key) {
    console.error('[DebugReader] Supabase not configured');
    return [];
  }

  const supabase = createClient(url, key);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('id, type, source, occurred_at, ingested_at, entities')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('[DebugReader] Query failed:', error.message);
    return [];
  }

  return (data as EventRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    source: row.source,
    occurred_at: row.occurred_at,
    entities: row.entities,
  }));
}

/**
 * Print a summary of recent events to console
 * For human verification only
 */
export async function logEventSummary(hours: number = 48): Promise<void> {
  console.log(`\n========== EVENT SUMMARY (last ${hours} hours) ==========\n`);

  const events = await getRecentEvents(hours);

  if (events.length === 0) {
    console.log('No events found in the specified time range.\n');
    return;
  }

  // Count by type
  const byType: Record<string, number> = {};
  // Count by source
  const bySource: Record<string, number> = {};

  for (const event of events) {
    byType[event.type] = (byType[event.type] || 0) + 1;
    bySource[event.source] = (bySource[event.source] || 0) + 1;
  }

  console.log('EVENT TYPES FLOWING:');
  console.log('--------------------');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('\nSOURCES EMITTING:');
  console.log('-----------------');
  for (const [source, count] of Object.entries(bySource)) {
    console.log(`  ${source}: ${count}`);
  }

  console.log('\nTIMELINE (chronological):');
  console.log('-------------------------');
  for (const event of events) {
    const time = new Date(event.occurred_at).toLocaleString();
    const entitiesStr = Object.keys(event.entities).length > 0
      ? JSON.stringify(event.entities)
      : '{}';
    console.log(`  [${time}] ${event.type} (${event.source})`);
    console.log(`    entities: ${entitiesStr}`);
  }

  console.log(`\nTOTAL: ${events.length} events\n`);
  console.log('='.repeat(50) + '\n');
}

// If run directly: node -r ts-node/register src/lib/events/debugReader.ts
if (require.main === module) {
  logEventSummary(48).catch(console.error);
}
