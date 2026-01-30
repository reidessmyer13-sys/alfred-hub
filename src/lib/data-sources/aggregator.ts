// Data Aggregator - Combines all sources into unified context
// This is Alfred's brain for cross-source intelligence

import {
  DailyBriefingData,
  ContactIntelligence,
  UnifiedMeeting,
  UnifiedOpportunity,
  UnifiedEmail,
  UnifiedTask,
  UnifiedFollowUp,
  UnifiedContact,
} from './types';

import { getStalledOpportunities, getOpportunitiesClosingSoon } from './salesforce';
import { getEmailsNeedingResponse, getEmailsForContact } from './gmail';
import { getTodaysMeetings, getUpcomingMeetings } from './calendar';
import { getRecentMeetingNotes, searchNotes, getRecentActionItems } from './granola';
import { getTasks, getFollowUps, getContacts, getUpcomingMeetings as getAlfredMeetings } from '../supabase';

// Generate comprehensive daily briefing
export async function generateDailyBriefing(): Promise<DailyBriefingData> {
  const now = new Date();

  // Fetch from all sources in parallel
  const [
    todayMeetings,
    alfredTasks,
    alfredFollowUps,
    stalledOpps,
    emailsToRespond,
    granolaActionItems,
  ] = await Promise.all([
    getTodaysMeetings(),
    getTasks('pending'),
    getFollowUps('pending'),
    getStalledOpportunities(14),
    getEmailsNeedingResponse(10),
    getRecentActionItems(7),
  ]);

  // Transform Alfred data to unified format
  const tasks: UnifiedTask[] = alfredTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueDate: t.due_date ? new Date(t.due_date) : undefined,
    priority: t.priority,
    status: t.status,
    source: 'alfred' as const,
  }));

  const followUps: UnifiedFollowUp[] = alfredFollowUps.map((f) => ({
    id: f.id,
    contactName: f.contact_name,
    contactEmail: f.contact_email,
    context: f.context,
    urgency: f.urgency,
    dueDate: new Date(f.reminder_date),
    source: 'alfred' as const,
  }));

  // Combine tasks from multiple sources
  const allTasks = [...tasks, ...granolaActionItems];

  // Filter tasks
  const tasksOverdue = allTasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.status === 'pending'
  );
  const tasksDueToday = allTasks.filter((t) => {
    if (!t.dueDate || t.status !== 'pending') return false;
    return (
      t.dueDate.getFullYear() === now.getFullYear() &&
      t.dueDate.getMonth() === now.getMonth() &&
      t.dueDate.getDate() === now.getDate()
    );
  });

  // Urgent follow-ups (due today or overdue, or high urgency)
  const urgentFollowUps = followUps.filter((f) => {
    const isOverdue = f.dueDate <= now;
    const isDueToday =
      f.dueDate.getFullYear() === now.getFullYear() &&
      f.dueDate.getMonth() === now.getMonth() &&
      f.dueDate.getDate() === now.getDate();
    return isOverdue || isDueToday || f.urgency === 'high';
  });

  // Generate insights by analyzing patterns
  const insights = generateInsights({
    meetings: todayMeetings,
    followUps: urgentFollowUps,
    opportunities: stalledOpps,
    emails: emailsToRespond,
    tasks: allTasks,
  });

  return {
    date: now,
    meetings: todayMeetings,
    urgentFollowUps,
    stalledOpportunities: stalledOpps,
    emailsNeedingResponse: emailsToRespond,
    tasksOverdue,
    tasksDueToday,
    insights,
  };
}

// Generate cross-source insights
function generateInsights(data: {
  meetings: UnifiedMeeting[];
  followUps: UnifiedFollowUp[];
  opportunities: UnifiedOpportunity[];
  emails: UnifiedEmail[];
  tasks: UnifiedTask[];
}): string[] {
  const insights: string[] = [];

  // Check for meeting prep opportunities
  for (const meeting of data.meetings) {
    // Find related follow-ups
    const relatedFollowUp = data.followUps.find((f) =>
      meeting.attendees.some(
        (a) => a.toLowerCase().includes(f.contactName.toLowerCase()) ||
               (f.contactEmail && a.toLowerCase() === f.contactEmail.toLowerCase())
      )
    );
    if (relatedFollowUp) {
      insights.push(
        `Meeting "${meeting.title}" includes ${relatedFollowUp.contactName} who has a pending follow-up: "${relatedFollowUp.context.slice(0, 50)}..."`
      );
    }

    // Find related opportunities
    const relatedOpp = data.opportunities.find((o) =>
      meeting.title.toLowerCase().includes(o.accountName.toLowerCase()) ||
      meeting.attendees.some((a) => a.toLowerCase().includes(o.accountName.toLowerCase()))
    );
    if (relatedOpp) {
      insights.push(
        `Meeting "${meeting.title}" relates to ${relatedOpp.name} (${relatedOpp.stage}, $${relatedOpp.amount?.toLocaleString() || 'TBD'})`
      );
    }
  }

  // Check for stalled opportunities with no recent contact
  for (const opp of data.opportunities) {
    if (opp.daysSinceActivity && opp.daysSinceActivity > 21) {
      insights.push(
        `${opp.accountName} opportunity has been stalled for ${opp.daysSinceActivity} days - consider re-engagement`
      );
    }
  }

  // Check for email patterns
  if (data.emails.length > 5) {
    insights.push(
      `You have ${data.emails.length} emails that may need responses - consider blocking time to clear inbox`
    );
  }

  // Task overload warning
  const highPriorityTasks = data.tasks.filter(
    (t) => t.priority === 'high' || t.priority === 'urgent'
  );
  if (highPriorityTasks.length > 3) {
    insights.push(
      `${highPriorityTasks.length} high-priority tasks pending - consider re-prioritizing or delegating`
    );
  }

  return insights;
}

// Get comprehensive intelligence for a specific contact
export async function getContactIntelligence(
  contactNameOrEmail: string
): Promise<ContactIntelligence | null> {
  // Search across all sources for this contact
  const [
    alfredContacts,
    emails,
    upcomingMeetings,
    granolaNote,
    alfredFollowUps,
  ] = await Promise.all([
    getContacts(),
    getEmailsForContact(contactNameOrEmail, 5),
    getUpcomingMeetings(168), // Next week
    searchNotes(contactNameOrEmail, 3),
    getFollowUps('pending'),
  ]);

  // Find matching contact
  const contact = alfredContacts.find(
    (c) =>
      c.name.toLowerCase().includes(contactNameOrEmail.toLowerCase()) ||
      c.email?.toLowerCase() === contactNameOrEmail.toLowerCase()
  );

  if (!contact) {
    return null;
  }

  // Filter relevant data
  const contactMeetings = upcomingMeetings.filter((m) =>
    m.attendees.some(
      (a) =>
        a.toLowerCase().includes(contact.name.toLowerCase()) ||
        (contact.email && a.toLowerCase() === contact.email.toLowerCase())
    )
  );

  const contactFollowUps = alfredFollowUps
    .filter(
      (f) =>
        f.contact_name.toLowerCase().includes(contact.name.toLowerCase()) ||
        f.contact_email?.toLowerCase() === contact.email?.toLowerCase()
    )
    .map((f) => ({
      id: f.id,
      contactName: f.contact_name,
      contactEmail: f.contact_email,
      context: f.context,
      urgency: f.urgency,
      dueDate: new Date(f.reminder_date),
      source: 'alfred' as const,
    }));

  // Generate suggested actions
  const suggestedActions: string[] = [];

  if (contactFollowUps.length > 0) {
    suggestedActions.push(`Complete follow-up: ${contactFollowUps[0].context.slice(0, 50)}...`);
  }

  if (emails.length > 0 && emails.some((e) => e.needsResponse)) {
    suggestedActions.push('Respond to pending emails');
  }

  if (contactMeetings.length > 0) {
    const nextMeeting = contactMeetings[0];
    suggestedActions.push(`Prepare for meeting: ${nextMeeting.title}`);
  }

  if (granolaNote.length > 0) {
    suggestedActions.push('Review recent meeting notes for context');
  }

  return {
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      role: contact.role,
      source: 'alfred',
      lastInteraction: contact.last_interaction ? new Date(contact.last_interaction) : undefined,
      notes: contact.notes,
    },
    recentEmails: emails,
    upcomingMeetings: contactMeetings,
    openOpportunities: [], // Would need Salesforce integration
    pendingFollowUps: contactFollowUps,
    lastMeetingNotes: granolaNote.length > 0 ? granolaNote[0].content : undefined,
    suggestedActions,
  };
}

// Get meeting prep bundle
export async function getMeetingPrepBundle(meetingId: string): Promise<{
  meeting: UnifiedMeeting | null;
  attendeeContext: ContactIntelligence[];
  relatedNotes: string[];
  suggestedTopics: string[];
}> {
  // This would fetch the meeting and enrich with context
  return {
    meeting: null,
    attendeeContext: [],
    relatedNotes: [],
    suggestedTopics: [],
  };
}

// Export for use in Claude prompts
export async function getContextForPrompt(): Promise<string> {
  const briefing = await generateDailyBriefing();

  let context = `## Current Context (${briefing.date.toLocaleDateString()})\n\n`;

  if (briefing.meetings.length > 0) {
    context += `### Today's Meetings (${briefing.meetings.length})\n`;
    briefing.meetings.forEach((m) => {
      context += `- ${m.startTime.toLocaleTimeString()}: ${m.title} (${m.attendees.length} attendees)\n`;
    });
    context += '\n';
  }

  if (briefing.urgentFollowUps.length > 0) {
    context += `### Urgent Follow-ups (${briefing.urgentFollowUps.length})\n`;
    briefing.urgentFollowUps.slice(0, 5).forEach((f) => {
      context += `- ${f.contactName}: ${f.context.slice(0, 60)}...\n`;
    });
    context += '\n';
  }

  if (briefing.stalledOpportunities.length > 0) {
    context += `### Stalled Opportunities (${briefing.stalledOpportunities.length})\n`;
    briefing.stalledOpportunities.slice(0, 3).forEach((o) => {
      context += `- ${o.accountName}: ${o.stage}, ${o.daysSinceActivity} days since activity\n`;
    });
    context += '\n';
  }

  if (briefing.insights.length > 0) {
    context += `### Insights\n`;
    briefing.insights.forEach((i) => {
      context += `- ${i}\n`;
    });
  }

  return context;
}
