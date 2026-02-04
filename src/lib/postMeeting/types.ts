// Post-Meeting Intelligence Types
// READ-ONLY structures for extracted meeting insights
// No inference, no scoring, no automation

/**
 * An action explicitly stated in the transcript
 */
export interface ExtractedAction {
  // The exact text or phrase from the transcript
  text: string;
  // Who said it (if identifiable from transcript)
  mentioned_by?: string;
  // Timestamp or time reference from transcript
  mentioned_time?: string;
  // People referenced in this action
  related_person_ids?: string[];
  // The pattern that matched this action
  match_type: 'action_item' | 'commitment' | 'time_bound' | 'follow_up';
  // Original source line/section
  source_context?: string;
}

/**
 * Related context from other data sources
 */
export interface SurfacedContext {
  // Related Salesforce opportunity (if linked)
  related_opportunity?: {
    opportunity_id: string;
    account_id?: string;
  };
  // Existing follow-ups for attendees
  related_follow_ups?: {
    event_id: string;
    contact_name: string;
    context: string;
    urgency: string;
  }[];
  // Recent email threads with attendees
  related_threads?: {
    thread_id: string;
    subject: string;
    last_activity: Date;
  }[];
}

/**
 * Complete post-meeting insights
 * READ-ONLY - for review, not execution
 */
export interface PostMeetingInsights {
  // Meeting identifiers
  meeting_id?: string;
  transcript_id: string;
  meeting_title: string;
  meeting_date: Date;

  // Attendees from the transcript
  attendees: string[];

  // Explicitly extracted actions
  extracted_actions: ExtractedAction[];

  // Correlated context from other sources
  surfaced_context: SurfacedContext;

  // Metadata
  generated_at: Date;
  extraction_stats: {
    total_actions: number;
    action_items: number;
    commitments: number;
    time_bound: number;
    follow_ups: number;
  };
}
