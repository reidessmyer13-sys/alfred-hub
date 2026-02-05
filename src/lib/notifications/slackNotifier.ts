// Slack Notifier
// Sends notifications to Slack via Incoming Webhook
// Triggers: urgent tasks, overdue follow-ups, meeting reminders, action items from transcripts

export type NotificationType =
  | 'urgent_task'
  | 'overdue_followup'
  | 'meeting_reminder'
  | 'action_items'
  | 'daily_briefing'
  | 'end_of_day';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  details?: Record<string, unknown>;
  urgency?: 'low' | 'medium' | 'high';
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string;
    style?: string;
  }>;
}

const EMOJI_MAP: Record<NotificationType, string> = {
  urgent_task: '🚨',
  overdue_followup: '⏰',
  meeting_reminder: '📅',
  action_items: '✅',
  daily_briefing: '☀️',
  end_of_day: '🌙',
};

const COLOR_MAP: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

/**
 * Send a notification to Slack via Incoming Webhook
 */
export async function sendSlackNotification(payload: NotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[SlackNotifier] SLACK_WEBHOOK_URL not configured');
    return false;
  }

  try {
    const emoji = EMOJI_MAP[payload.type] || '📌';
    const color = payload.urgency ? COLOR_MAP[payload.urgency] : COLOR_MAP.low;

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${payload.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.message,
        },
      },
    ];

    // Add details if provided
    if (payload.details && Object.keys(payload.details).length > 0) {
      const detailLines = Object.entries(payload.details)
        .map(([key, value]) => `*${formatKey(key)}:* ${value}`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: detailLines,
        },
      });
    }

    // Add footer with timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_Alfred • ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })} MT_`,
        },
      ],
    });

    const slackPayload = {
      attachments: [
        {
          color,
          blocks,
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      console.error('[SlackNotifier] Failed to send:', response.statusText);
      return false;
    }

    console.log(`[SlackNotifier] Sent ${payload.type} notification: ${payload.title}`);
    return true;
  } catch (error) {
    console.error('[SlackNotifier] Error:', error);
    return false;
  }
}

/**
 * Send notification for urgent task due soon
 */
export async function notifyUrgentTask(task: {
  title: string;
  dueDate: Date;
  priority: string;
}): Promise<boolean> {
  return sendSlackNotification({
    type: 'urgent_task',
    title: 'Urgent Task Due Soon',
    message: `*${task.title}*\nDue: ${task.dueDate.toLocaleDateString()}`,
    details: {
      priority: task.priority.toUpperCase(),
    },
    urgency: 'high',
  });
}

/**
 * Send notification for overdue follow-up
 */
export async function notifyOverdueFollowUp(followUp: {
  contactName: string;
  context: string;
  dueDate: Date;
}): Promise<boolean> {
  const daysOverdue = Math.floor(
    (new Date().getTime() - followUp.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return sendSlackNotification({
    type: 'overdue_followup',
    title: 'Overdue Follow-up',
    message: `Follow up with *${followUp.contactName}*\n_${followUp.context}_`,
    details: {
      daysOverdue: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
    },
    urgency: daysOverdue > 3 ? 'high' : 'medium',
  });
}

/**
 * Send notification for upcoming meeting
 */
export async function notifyMeetingReminder(meeting: {
  title: string;
  startTime: Date;
  attendees: string[];
  minutesUntil: number;
}): Promise<boolean> {
  return sendSlackNotification({
    type: 'meeting_reminder',
    title: `Meeting in ${meeting.minutesUntil} minutes`,
    message: `*${meeting.title}*`,
    details: {
      time: meeting.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      attendees: meeting.attendees.length.toString(),
    },
    urgency: meeting.minutesUntil <= 5 ? 'high' : 'medium',
  });
}

/**
 * Send notification for action items extracted from transcript
 */
export async function notifyActionItems(
  meetingTitle: string,
  actionItems: string[]
): Promise<boolean> {
  if (actionItems.length === 0) return true;

  const itemsList = actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n');

  return sendSlackNotification({
    type: 'action_items',
    title: 'Action Items from Meeting',
    message: `From *${meetingTitle}*:\n${itemsList}`,
    urgency: 'medium',
  });
}

/**
 * Send daily briefing summary
 */
export async function notifyDailyBriefing(briefing: {
  meetingCount: number;
  taskCount: number;
  followUpCount: number;
  insights: string[];
}): Promise<boolean> {
  const sections = [
    `📅 *${briefing.meetingCount}* meetings today`,
    `✅ *${briefing.taskCount}* open tasks`,
    `🔔 *${briefing.followUpCount}* follow-ups due`,
  ];

  if (briefing.insights.length > 0) {
    sections.push('\n*Key Insights:*');
    briefing.insights.slice(0, 3).forEach((insight) => {
      sections.push(`• ${insight}`);
    });
  }

  return sendSlackNotification({
    type: 'daily_briefing',
    title: 'Good Morning, Reid!',
    message: sections.join('\n'),
    urgency: 'low',
  });
}

/**
 * Send end of day summary
 */
export async function notifyEndOfDay(summary: {
  completedTasks: number;
  meetingsAttended: number;
  followUpsCompleted: number;
  pendingItems: number;
}): Promise<boolean> {
  const sections = [
    `✅ Completed *${summary.completedTasks}* tasks`,
    `📅 Attended *${summary.meetingsAttended}* meetings`,
    `🔔 Completed *${summary.followUpsCompleted}* follow-ups`,
  ];

  if (summary.pendingItems > 0) {
    sections.push(`\n⚠️ *${summary.pendingItems}* items still pending`);
  }

  return sendSlackNotification({
    type: 'end_of_day',
    title: 'End of Day Summary',
    message: sections.join('\n'),
    urgency: 'low',
  });
}

// Helper to format camelCase keys to Title Case
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
