import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { emitGranolaTranscriptFetched } from '@/lib/events';
import { findLinkedMeeting, findLinkedOpportunity } from '@/lib/granola/linker';

// Webhook secret for Zapier authentication
const WEBHOOK_SECRET = process.env.GRANOLA_WEBHOOK_SECRET;

export interface GranolaMeetingNote {
  id: string;
  title: string;
  content: string;
  summary?: string;
  action_items?: string[];
  attendees?: string[];
  meeting_date?: string;
  duration_minutes?: number;
  tags?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.log('[Granola Webhook] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[Granola Webhook] Received:', JSON.stringify(body, null, 2));

    // Handle different payload formats from Zapier
    const note: GranolaMeetingNote = {
      id: body.id || body.granola_id || `granola_${Date.now()}`,
      title: body.title || body.meeting_title || 'Untitled Meeting',
      content: body.content || body.notes || body.summary || '',
      summary: body.summary || body.ai_summary,
      action_items: parseActionItems(body.action_items || body.actionItems),
      attendees: parseAttendees(body.attendees || body.participants),
      meeting_date: body.meeting_date || body.date || body.created_at,
      duration_minutes: body.duration_minutes || body.duration,
      tags: body.tags || [],
    };

    // Store in Supabase
    const supabase = getSupabase();

    // Upsert to handle duplicate webhook calls
    const { data, error } = await supabase
      .from('granola_notes')
      .upsert({
        granola_id: note.id,
        title: note.title,
        content: note.content,
        summary: note.summary,
        action_items: note.action_items,
        attendees: note.attendees,
        meeting_date: note.meeting_date ? new Date(note.meeting_date).toISOString() : null,
        duration_minutes: note.duration_minutes,
        tags: note.tags,
        raw_payload: body,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'granola_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[Granola Webhook] Database error:', error);
      return NextResponse.json({ error: 'Failed to store note' }, { status: 500 });
    }

    console.log('[Granola Webhook] Stored note:', data.id);

    // Also store key points in memory_logs for cross-source intelligence
    if (note.summary) {
      await supabase.from('memory_logs').insert({
        category: 'context',
        content: `Meeting: ${note.title}\n\nSummary: ${note.summary}${note.action_items?.length ? `\n\nAction Items:\n${note.action_items.map(a => `- ${a}`).join('\n')}` : ''}`,
        tags: ['granola', 'meeting', ...(note.tags || [])],
        source: 'granola-webhook',
      });
    }

    // === EMIT CANONICAL EVENT ===
    // Link transcript to meeting and opportunity if possible
    const linkedMeeting = await findLinkedMeeting(note.title, note.meeting_date, note.attendees);
    const linkedOpportunity = await findLinkedOpportunity(note.attendees);

    await emitGranolaTranscriptFetched(
      {
        id: note.id,
        title: note.title,
        content: note.content,
        summary: note.summary,
        action_items: note.action_items,
        attendees: note.attendees,
        meeting_date: note.meeting_date,
        duration_minutes: note.duration_minutes,
        tags: note.tags,
      },
      {
        transcript_id: note.id,
        meeting_id: linkedMeeting?.meeting_id,
        person_ids: note.attendees || [],
        account_id: linkedOpportunity?.account_id,
        opportunity_id: linkedOpportunity?.opportunity_id,
      }
    );

    console.log('[Granola Webhook] Emitted GranolaTranscriptFetched event');

    return NextResponse.json({
      success: true,
      message: 'Note stored and event emitted',
      id: data.id,
      linked: {
        meeting_id: linkedMeeting?.meeting_id,
        opportunity_id: linkedOpportunity?.opportunity_id,
      },
    });
  } catch (error) {
    console.error('[Granola Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Parse action items from various formats
function parseActionItems(items: unknown): string[] {
  if (!items) return [];
  if (Array.isArray(items)) return items.map(String);
  if (typeof items === 'string') {
    // Split by newlines or bullet points
    return items
      .split(/[\n\r]+/)
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

// Parse attendees from various formats
function parseAttendees(attendees: unknown): string[] {
  if (!attendees) return [];
  if (Array.isArray(attendees)) return attendees.map(String);
  if (typeof attendees === 'string') {
    return attendees.split(/[,;\n]+/).map(a => a.trim()).filter(Boolean);
  }
  return [];
}

// GET endpoint for Zapier to verify webhook
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Granola webhook endpoint is ready',
    timestamp: new Date().toISOString(),
  });
}
