// Google Calendar Direct API Integration
// Fetches calendar data directly using OAuth tokens

import { google, calendar_v3 } from 'googleapis';
import { getAuthenticatedClient, hasValidCredentials } from './auth';
import { UnifiedMeeting, AttendeeContext } from '../data-sources/types';
import { emitCalendarEventFetched } from '../events';

// Get authenticated Calendar API client
async function getCalendarClient(): Promise<calendar_v3.Calendar | null> {
  try {
    if (!(await hasValidCredentials())) {
      console.log('[Google Calendar] No valid credentials, skipping');
      return null;
    }
    const auth = await getAuthenticatedClient();
    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('[Google Calendar] Failed to get client:', error);
    return null;
  }
}

// Transform Google Calendar event to UnifiedMeeting
function transformEvent(event: calendar_v3.Schema$Event): UnifiedMeeting {
  const startTime = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : event.start?.date
    ? new Date(event.start.date)
    : new Date();

  const endTime = event.end?.dateTime
    ? new Date(event.end.dateTime)
    : event.end?.date
    ? new Date(event.end.date)
    : new Date();

  const attendees = (event.attendees || [])
    .filter((a) => a.email && !a.self)
    .map((a) => a.email || '');

  return {
    id: `gcal_${event.id}`,
    title: event.summary || 'Untitled Meeting',
    startTime,
    endTime,
    attendees,
    location: event.location || undefined,
    description: event.description || undefined,
    source: 'calendar',
    sourceId: event.id || undefined,
  };
}

// Get today's meetings
export async function getTodaysMeetings(): Promise<UnifiedMeeting[]> {
  const calendar = await getCalendarClient();
  if (!calendar) return [];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    const meetings = events
      .filter((e) => e.status !== 'cancelled')
      .map(transformEvent);

    // Emit events for each fetched meeting (non-blocking)
    for (const meeting of meetings) {
      emitCalendarEventFetched(
        meeting as unknown as Record<string, unknown>,
        meeting.startTime
      ).catch(() => {}); // Fire and forget - don't block on event emission
    }

    return meetings;
  } catch (error) {
    console.error('[Google Calendar] Failed to fetch today\'s meetings:', error);
    return [];
  }
}

// Get upcoming meetings within specified hours
export async function getUpcomingMeetings(hoursAhead: number = 168): Promise<UnifiedMeeting[]> {
  const calendar = await getCalendarClient();
  if (!calendar) return [];

  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    const events = response.data.items || [];
    const meetings = events
      .filter((e) => e.status !== 'cancelled')
      .map(transformEvent);

    // Emit events for each fetched meeting (non-blocking)
    for (const meeting of meetings) {
      emitCalendarEventFetched(
        meeting as unknown as Record<string, unknown>,
        meeting.startTime
      ).catch(() => {}); // Fire and forget
    }

    return meetings;
  } catch (error) {
    console.error('[Google Calendar] Failed to fetch upcoming meetings:', error);
    return [];
  }
}

// Get meetings for a specific date range
export async function getMeetingsInRange(
  startDate: Date,
  endDate: Date
): Promise<UnifiedMeeting[]> {
  const calendar = await getCalendarClient();
  if (!calendar) return [];

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    const events = response.data.items || [];
    const meetings = events
      .filter((e) => e.status !== 'cancelled')
      .map(transformEvent);

    // Emit events for each fetched meeting (non-blocking)
    for (const meeting of meetings) {
      emitCalendarEventFetched(
        meeting as unknown as Record<string, unknown>,
        meeting.startTime
      ).catch(() => {}); // Fire and forget
    }

    return meetings;
  } catch (error) {
    console.error('[Google Calendar] Failed to fetch meetings in range:', error);
    return [];
  }
}

// Get meetings with a specific attendee
export async function getMeetingsWithAttendee(
  attendeeEmail: string,
  daysAhead: number = 30
): Promise<UnifiedMeeting[]> {
  const upcoming = await getUpcomingMeetings(daysAhead * 24);
  return upcoming.filter((m) =>
    m.attendees.some((a) => a.toLowerCase() === attendeeEmail.toLowerCase())
  );
}

// Get free/busy information for scheduling
export async function getFreeBusy(
  startTime: Date,
  endTime: Date
): Promise<{ start: Date; end: Date }[]> {
  const calendar = await getCalendarClient();
  if (!calendar) return [];

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busy = response.data.calendars?.primary?.busy || [];
    return busy.map((b) => ({
      start: new Date(b.start || ''),
      end: new Date(b.end || ''),
    }));
  } catch (error) {
    console.error('[Google Calendar] Failed to get free/busy:', error);
    return [];
  }
}
