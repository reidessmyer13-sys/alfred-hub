// Post-Meeting Intelligence Module
// READ-ONLY - extracts explicit actions from transcripts
// No writes, no automation, no inference

export {
  generatePostMeetingInsights,
  generateInsightsForTranscript,
  generateInsightsForMeeting,
} from './generator';

export {
  extractActionsFromTranscript,
  computeExtractionStats,
} from './extractor';

export type {
  PostMeetingInsights,
  ExtractedAction,
  SurfacedContext,
  RelatedThread,
  RelatedFollowUp,
} from './types';
