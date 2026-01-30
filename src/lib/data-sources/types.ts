// Unified types for cross-source data

export interface UnifiedContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  source: 'salesforce' | 'alfred' | 'gmail' | 'calendar';
  sourceId?: string;
  lastInteraction?: Date;
  notes?: string;
}

export interface UnifiedMeeting {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  description?: string;
  source: 'calendar' | 'granola' | 'alfred';
  sourceId?: string;
  // Enriched data
  prepNotes?: string;
  actionItems?: string[];
  relatedOpportunity?: string;
  attendeeContext?: AttendeeContext[];
}

export interface AttendeeContext {
  name: string;
  email: string;
  company?: string;
  role?: string;
  lastEmailDate?: Date;
  openOpportunities?: number;
  recentNotes?: string;
}

export interface UnifiedOpportunity {
  id: string;
  name: string;
  accountName: string;
  amount?: number;
  stage: string;
  closeDate?: Date;
  nextStep?: string;
  lastActivity?: Date;
  daysSinceActivity?: number;
  ownerName?: string;
  contacts?: UnifiedContact[];
  source: 'salesforce';
  sourceId: string;
}

export interface UnifiedEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  snippet: string;
  isUnread: boolean;
  needsResponse: boolean;
  daysSinceReceived: number;
  relatedAccount?: string;
  source: 'gmail';
}

export interface UnifiedTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  source: 'alfred' | 'salesforce' | 'granola';
  sourceId?: string;
  relatedTo?: {
    type: 'contact' | 'opportunity' | 'meeting';
    id: string;
    name: string;
  };
}

export interface UnifiedFollowUp {
  id: string;
  contactName: string;
  contactEmail?: string;
  context: string;
  urgency: 'low' | 'medium' | 'high';
  dueDate: Date;
  source: 'alfred' | 'salesforce';
  relatedOpportunity?: string;
  daysSinceLastContact?: number;
}

export interface DailyBriefingData {
  date: Date;
  meetings: UnifiedMeeting[];
  urgentFollowUps: UnifiedFollowUp[];
  stalledOpportunities: UnifiedOpportunity[];
  emailsNeedingResponse: UnifiedEmail[];
  tasksOverdue: UnifiedTask[];
  tasksDueToday: UnifiedTask[];
  insights: string[];
}

export interface ContactIntelligence {
  contact: UnifiedContact;
  recentEmails: UnifiedEmail[];
  upcomingMeetings: UnifiedMeeting[];
  openOpportunities: UnifiedOpportunity[];
  pendingFollowUps: UnifiedFollowUp[];
  lastMeetingNotes?: string;
  suggestedActions: string[];
}
