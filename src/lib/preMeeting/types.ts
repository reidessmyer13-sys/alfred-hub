// Pre-Meeting Intelligence Types
// READ-ONLY data structures for meeting briefings

import type { TimelineEvent, PersonInteraction } from '../contextGraph';

/**
 * Core meeting information
 */
export interface MeetingInfo {
  meeting_id: string;
  title: string;
  start_time: Date;
  end_time?: Date;
  location?: string;
  description?: string;
}

/**
 * Attendee with their interaction history
 */
export interface AttendeeContext {
  email: string;
  name?: string;
  interaction_count: number;
  last_interaction?: Date;
  recent_interactions: PersonInteraction[];
}

/**
 * Open follow-up related to the meeting or attendees
 */
export interface RelatedFollowUp {
  event_id: string;
  contact_name: string;
  contact_email?: string;
  context: string;
  urgency: string;
  created_at: Date;
}

/**
 * Email thread related to attendees
 */
export interface RelatedThread {
  thread_id: string;
  subject: string;
  from: string;
  last_activity: Date;
  snippet?: string;
}

/**
 * The complete pre-meeting briefing
 */
export interface PreMeetingBrief {
  // Meeting details
  meeting: MeetingInfo;

  // Attendee context
  attendees: AttendeeContext[];

  // Recent interactions across all attendees
  recentInteractions: TimelineEvent[];

  // Open follow-ups tied to attendees
  openFollowUps: RelatedFollowUp[];

  // Related email threads
  relatedThreads: RelatedThread[];

  // Metadata
  generated_at: Date;
  data_sources: string[];
}
