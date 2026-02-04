// Pre-Meeting Intelligence Module
// READ-ONLY - generates structured briefings from Context Graph
// No writes, no inference, no Claude calls

export { generatePreMeetingBrief, findUpcomingMeetingBrief } from './generator';

export type {
  PreMeetingBrief,
  MeetingInfo,
  AttendeeContext,
  RelatedFollowUp,
  RelatedThread,
} from './types';
