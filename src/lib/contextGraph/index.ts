// Context Graph Layer for Alfred
// READ-ONLY - derives relationships from events table
// No writes, no inference, no scoring, no Claude calls

export {
  getTimelineForPerson,
  getEventsForMeeting,
  getEventsForThread,
  getRecentInteractionsForPerson,
  getPersonCooccurrences,
  getEventsForAccount,
  getEventsForOpportunity,
  // Transcript-specific queries
  getEventsForTranscript,
  getRecentTranscripts,
  getTranscriptsForMeeting,
  getTranscriptsForPerson,
} from './queries';

export type {
  TimelineEvent,
  PersonInteraction,
  CooccurrenceResult,
  EventRow,
} from './types';
