// Build Assistant Context
// Compiles comprehensive context from Alfred's data for Claude reasoning
// This supplements the existing aggregator-based context with Context Graph data

import { getActivityFeed, getRecentTranscripts, getTodaysEvents, getEventStats } from '@/lib/contextGraph/queries';
import { generateDailyBriefing } from '@/lib/data-sources/aggregator';
import { getTasks, getFollowUps, getContacts, getUpcomingMeetings } from '@/lib/supabase';

export interface AssistantContext {
  timestamp: Date;
  summary: string;
  structured: {
    todaysMeetings: Array<{ title: string; time: string; attendees: number }>;
    pendingTasks: Array<{ title: string; priority: string; dueDate?: string }>;
    urgentFollowUps: Array<{ contactName: string; context: string; urgency: string }>;
    recentActivity: Array<{ type: string; summary: string; when: string }>;
    recentTranscripts: Array<{ title: string; when: string }>;
    upcomingDeadlines: Array<{ item: string; dueDate: string; type: string }>;
    eventStats: { total: number; byType: Record<string, number> };
  };
}

/**
 * Build comprehensive context for the AI assistant
 * Combines data from:
 * - Context Graph (events, transcripts, activity)
 * - Aggregator (briefings, insights)
 * - Supabase (tasks, follow-ups, contacts, meetings)
 */
export async function buildAssistantContext(): Promise<AssistantContext> {
  const now = new Date();

  // Fetch all data in parallel
  const [
    activityFeed,
    recentTranscripts,
    todaysEvents,
    eventStats,
    dailyBriefing,
    tasks,
    followUps,
    contacts,
    upcomingMeetings,
  ] = await Promise.all([
    getActivityFeed(30),
    getRecentTranscripts(7, 10),
    getTodaysEvents(),
    getEventStats(7),
    generateDailyBriefing(),
    getTasks('pending'),
    getFollowUps('pending'),
    getContacts(),
    getUpcomingMeetings(7),
  ]);

  // Process today's meetings
  const todaysMeetings = (dailyBriefing.meetings || []).map((m) => ({
    title: m.title,
    time: m.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    attendees: m.attendees?.length || 0,
  }));

  // Process pending tasks with deadlines
  const pendingTasks = (tasks || []).map((t) => ({
    title: t.title,
    priority: t.priority,
    dueDate: t.due_date,
  }));

  // Process urgent follow-ups
  const urgentFollowUps = (followUps || [])
    .filter((f) => {
      const dueDate = new Date(f.reminder_date);
      return dueDate <= now || f.urgency === 'high';
    })
    .map((f) => ({
      contactName: f.contact_name,
      context: f.context,
      urgency: f.urgency,
    }));

  // Process recent activity
  const recentActivity = activityFeed.slice(0, 15).map((e) => ({
    type: e.type,
    summary: e.summary,
    when: formatRelativeTime(e.occurred_at),
  }));

  // Process recent transcripts
  const recentTranscriptsList = recentTranscripts.map((t) => ({
    title: t.summary.replace('Transcript: ', ''),
    when: formatRelativeTime(t.occurred_at),
  }));

  // Build upcoming deadlines
  const upcomingDeadlines: Array<{ item: string; dueDate: string; type: string }> = [];

  // Add task deadlines
  pendingTasks
    .filter((t) => t.dueDate)
    .forEach((t) => {
      upcomingDeadlines.push({
        item: t.title,
        dueDate: t.dueDate!,
        type: 'task',
      });
    });

  // Add follow-up deadlines
  (followUps || []).forEach((f) => {
    upcomingDeadlines.push({
      item: `Follow up with ${f.contact_name}`,
      dueDate: f.reminder_date,
      type: 'follow-up',
    });
  });

  // Sort by date
  upcomingDeadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Build summary string for prompt
  const summary = buildSummaryString({
    todaysMeetings,
    pendingTasks,
    urgentFollowUps,
    recentActivity,
    eventStats,
    insights: dailyBriefing.insights,
    contacts: contacts?.length || 0,
  });

  return {
    timestamp: now,
    summary,
    structured: {
      todaysMeetings,
      pendingTasks,
      urgentFollowUps,
      recentActivity,
      recentTranscripts: recentTranscriptsList,
      upcomingDeadlines: upcomingDeadlines.slice(0, 10),
      eventStats,
    },
  };
}

function buildSummaryString(data: {
  todaysMeetings: Array<{ title: string; time: string; attendees: number }>;
  pendingTasks: Array<{ title: string; priority: string }>;
  urgentFollowUps: Array<{ contactName: string; context: string }>;
  recentActivity: Array<{ type: string; summary: string; when: string }>;
  eventStats: { total: number; byType: Record<string, number> };
  insights: string[];
  contacts: number;
}): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  let summary = `## Current Context (${dateStr} at ${timeStr})\n\n`;

  // Today's Meetings
  if (data.todaysMeetings.length > 0) {
    summary += `### Today's Meetings (${data.todaysMeetings.length})\n`;
    data.todaysMeetings.forEach((m) => {
      summary += `- ${m.time}: ${m.title} (${m.attendees} attendees)\n`;
    });
    summary += '\n';
  } else {
    summary += `### Today's Meetings\nNo meetings scheduled for today.\n\n`;
  }

  // Pending Tasks
  if (data.pendingTasks.length > 0) {
    const highPriority = data.pendingTasks.filter((t) => t.priority === 'high' || t.priority === 'urgent');
    summary += `### Pending Tasks (${data.pendingTasks.length} total, ${highPriority.length} high priority)\n`;
    data.pendingTasks.slice(0, 8).forEach((t) => {
      summary += `- [${t.priority.toUpperCase()}] ${t.title}\n`;
    });
    if (data.pendingTasks.length > 8) {
      summary += `- ... and ${data.pendingTasks.length - 8} more\n`;
    }
    summary += '\n';
  }

  // Urgent Follow-ups
  if (data.urgentFollowUps.length > 0) {
    summary += `### Urgent Follow-ups (${data.urgentFollowUps.length})\n`;
    data.urgentFollowUps.slice(0, 5).forEach((f) => {
      summary += `- ${f.contactName}: ${f.context.slice(0, 80)}${f.context.length > 80 ? '...' : ''}\n`;
    });
    summary += '\n';
  }

  // Recent Activity
  if (data.recentActivity.length > 0) {
    summary += `### Recent Activity (last 7 days: ${data.eventStats.total} events)\n`;
    data.recentActivity.slice(0, 8).forEach((a) => {
      summary += `- ${a.when}: ${a.summary}\n`;
    });
    summary += '\n';
  }

  // Insights
  if (data.insights && data.insights.length > 0) {
    summary += `### AI Insights\n`;
    data.insights.slice(0, 4).forEach((i) => {
      summary += `- ${i}\n`;
    });
    summary += '\n';
  }

  // Quick Stats
  summary += `### Quick Stats\n`;
  summary += `- Total contacts: ${data.contacts}\n`;
  summary += `- Events this week: ${data.eventStats.total}\n`;
  if (data.eventStats.byType['CalendarEventFetched']) {
    summary += `- Calendar events: ${data.eventStats.byType['CalendarEventFetched']}\n`;
  }
  if (data.eventStats.byType['EmailThreadFetched']) {
    summary += `- Emails tracked: ${data.eventStats.byType['EmailThreadFetched']}\n`;
  }
  if (data.eventStats.byType['GranolaTranscriptFetched']) {
    summary += `- Meeting transcripts: ${data.eventStats.byType['GranolaTranscriptFetched']}\n`;
  }

  return summary;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
