// Meetings API - Fetch from Google Calendar and Supabase
import { NextRequest, NextResponse } from 'next/server';
import { getTodaysMeetings, getUpcomingMeetings } from '@/lib/data-sources/calendar';
import { getUpcomingMeetings as getAlfredMeetings } from '@/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.V0_DASHBOARD_URL || 'https://v0-alfred-hub.vercel.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'today';
    const hoursAhead = parseInt(searchParams.get('hours') || '168'); // Default 1 week

    let meetings: any[] = [];

    if (filter === 'today') {
      meetings = await getTodaysMeetings();
    } else {
      meetings = await getUpcomingMeetings(hoursAhead);
    }

    // Also get prep notes from Alfred memory
    const alfredMeetings = await getAlfredMeetings(7);

    // Merge prep notes with calendar meetings
    const transformed = meetings.map((m: any) => {
      // Try to find matching Alfred meeting for prep notes
      const alfredMatch = alfredMeetings?.find((am: any) =>
        am.title?.toLowerCase() === m.title?.toLowerCase() ||
        (am.calendar_id && am.calendar_id === m.id)
      );

      return {
        id: m.id,
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime,
        duration: m.endTime && m.startTime
          ? Math.round((new Date(m.endTime).getTime() - new Date(m.startTime).getTime()) / 60000)
          : null,
        attendees: m.attendees || [],
        location: m.location,
        description: m.description,
        meetLink: m.meetLink,
        prepNotes: alfredMatch?.prep_notes || null,
        actionItems: alfredMatch?.action_items || [],
        prepReady: !!alfredMatch?.prep_notes,
      };
    });

    return NextResponse.json(
      {
        meetings: transformed,
        count: transformed.length,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Meetings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500, headers: corsHeaders }
    );
  }
}
