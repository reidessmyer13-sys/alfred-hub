// Google Calendar data fetching
// Uses direct Google Calendar API when OAuth is configured

import { UnifiedMeeting } from './types';
import * as GoogleCalendar from '../google/calendar';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  location?: string;
  htmlLink?: string;
  conferenceData?: {
    entryPoints?: { uri: string; entryPointType: string }[];
  };
}

// Transform calendar event to unified format
export function transformMeeting(event: CalendarEvent): UnifiedMeeting {
  return {
    id: `gcal_${event.id}`,
    title: event.summary || 'Untitled Meeting',
    startTime: new Date(event.start.dateTime),
    endTime: new Date(event.end.dateTime),
    attendees: event.attendees?.map((a) => a.email) || [],
    location: event.location || extractMeetingLink(event),
    description: event.description,
    source: 'calendar',
    sourceId: event.id,
  };
}

// Extract meeting link from event
function extractMeetingLink(event: CalendarEvent): string | undefined {
  // Check conference data first
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (e) => e.entryPointType === 'video'
    );
    if (videoEntry) return videoEntry.uri;
  }

  // Check description for common meeting URLs
  if (event.description) {
    const zoomMatch = event.description.match(/https:\/\/[^\s]*zoom\.us\/[^\s]*/);
    if (zoomMatch) return zoomMatch[0];

    const meetMatch = event.description.match(/https:\/\/meet\.google\.com\/[^\s]*/);
    if (meetMatch) return meetMatch[0];

    const teamsMatch = event.description.match(/https:\/\/teams\.microsoft\.com\/[^\s]*/);
    if (teamsMatch) return teamsMatch[0];
  }

  return event.location;
}

// Get upcoming meetings - uses direct Google API
export async function getUpcomingMeetings(hoursAhead: number = 24): Promise<UnifiedMeeting[]> {
  console.log(`[Calendar] Fetching meetings for next ${hoursAhead} hours`);
  try {
    return await GoogleCalendar.getUpcomingMeetings(hoursAhead);
  } catch (error) {
    console.error('[Calendar] Failed to fetch upcoming meetings:', error);
    return [];
  }
}

// Get meetings for today - uses direct Google API
export async function getTodaysMeetings(): Promise<UnifiedMeeting[]> {
  console.log(`[Calendar] Fetching today's meetings`);
  try {
    return await GoogleCalendar.getTodaysMeetings();
  } catch (error) {
    console.error('[Calendar] Failed to fetch today\'s meetings:', error);
    return [];
  }
}

// Get meetings for a specific date range - uses direct Google API
export async function getMeetingsInRange(start: Date, end: Date): Promise<UnifiedMeeting[]> {
  console.log(`[Calendar] Fetching meetings from ${start.toISOString()} to ${end.toISOString()}`);
  try {
    return await GoogleCalendar.getMeetingsInRange(start, end);
  } catch (error) {
    console.error('[Calendar] Failed to fetch meetings in range:', error);
    return [];
  }
}

// Get free/busy time for a date - uses direct Google API
export async function getFreeBusy(date: Date): Promise<{ start: Date; end: Date }[]> {
  console.log(`[Calendar] Fetching free/busy for ${date.toDateString()}`);
  try {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return await GoogleCalendar.getFreeBusy(startOfDay, endOfDay);
  } catch (error) {
    console.error('[Calendar] Failed to get free/busy:', error);
    return [];
  }
}

// Find next available slot
export async function findNextAvailableSlot(
  durationMinutes: number,
  afterDate?: Date
): Promise<{ start: Date; end: Date } | null> {
  console.log(`[Calendar] Finding ${durationMinutes}min slot after ${afterDate?.toISOString() || 'now'}`);

  const startDate = afterDate || new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Look 7 days ahead

  try {
    const busy = await GoogleCalendar.getFreeBusy(startDate, endDate);
    const durationMs = durationMinutes * 60 * 1000;

    // Simple slot finder - look for gaps in busy periods
    // Start from the next hour
    let current = new Date(startDate);
    current.setMinutes(0, 0, 0);
    current.setHours(current.getHours() + 1);

    // Only look during business hours (9 AM - 5 PM)
    const maxIterations = 7 * 24; // Max one week of hours
    for (let i = 0; i < maxIterations; i++) {
      const hour = current.getHours();

      // Skip non-business hours
      if (hour < 9 || hour >= 17) {
        current.setHours(current.getHours() + 1);
        continue;
      }

      // Skip weekends
      const day = current.getDay();
      if (day === 0 || day === 6) {
        current.setDate(current.getDate() + 1);
        current.setHours(9);
        continue;
      }

      const slotEnd = new Date(current.getTime() + durationMs);

      // Check if this slot conflicts with any busy period
      const hasConflict = busy.some(
        (b) => !(slotEnd <= b.start || current >= b.end)
      );

      if (!hasConflict) {
        return { start: current, end: slotEnd };
      }

      current.setHours(current.getHours() + 1);
    }

    return null;
  } catch (error) {
    console.error('[Calendar] Failed to find available slot:', error);
    return null;
  }
}
