import { NextRequest, NextResponse } from 'next/server';
import { getFollowUps, getUpcomingMeetings, getTasks } from '@/lib/supabase';
import { sendReminder as sendSlackReminder } from '@/lib/slack';
import { chat } from '@/lib/claude';

// Vercel Cron: runs every hour to check for reminders
// Configure in vercel.json

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running reminder check cron job...');

    const now = new Date();
    const reminders: string[] = [];

    // Check for overdue follow-ups
    const followUps = await getFollowUps('pending');
    const overdueFollowUps = followUps.filter((fu) => {
      const reminderDate = new Date(fu.reminder_date);
      return reminderDate <= now;
    });

    if (overdueFollowUps.length > 0) {
      const highUrgency = overdueFollowUps.filter((fu) => fu.urgency === 'high');
      if (highUrgency.length > 0) {
        reminders.push(
          `*🔴 ${highUrgency.length} high-urgency follow-up(s) need attention:*\n` +
            highUrgency
              .map((fu) => `• ${fu.contact_name}: ${fu.context.slice(0, 100)}...`)
              .join('\n')
        );
      }
    }

    // Check for meetings in the next 30 minutes
    const meetings = await getUpcomingMeetings(1);
    const upcomingMeetings = meetings.filter((m) => {
      const meetingTime = new Date(m.meeting_datetime);
      const diffMinutes = (meetingTime.getTime() - now.getTime()) / (1000 * 60);
      return diffMinutes > 0 && diffMinutes <= 30;
    });

    if (upcomingMeetings.length > 0) {
      for (const meeting of upcomingMeetings) {
        // Generate meeting prep if not already done
        if (!meeting.prep_notes) {
          const prepPrompt = `Generate a quick meeting prep summary for: ${meeting.title}. Attendees: ${meeting.attendees?.join(', ') || 'Unknown'}. Be brief - 2-3 bullet points max.`;
          const prep = await chat(prepPrompt, [], 'cron');
          reminders.push(`*📅 Meeting in 30 min: ${meeting.title}*\n${prep}`);
        } else {
          reminders.push(
            `*📅 Meeting in 30 min: ${meeting.title}*\nPrep: ${meeting.prep_notes}`
          );
        }
      }
    }

    // Check for urgent tasks due today
    const tasks = await getTasks('pending');
    const urgentTasks = tasks.filter((t) => {
      if (t.priority !== 'urgent' && t.priority !== 'high') return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return (
        dueDate.getFullYear() === now.getFullYear() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getDate() === now.getDate()
      );
    });

    if (urgentTasks.length > 0) {
      reminders.push(
        `*⚡ ${urgentTasks.length} urgent/high-priority task(s) due today:*\n` +
          urgentTasks.map((t) => `• ${t.title}`).join('\n')
      );
    }

    // Send reminders if any
    if (reminders.length > 0) {
      const message = `*Alfred Reminder*\n\n${reminders.join('\n\n')}`;
      await sendSlackReminder(message);
      console.log(`Sent ${reminders.length} reminder(s)`);
    } else {
      console.log('No reminders needed at this time');
    }

    return NextResponse.json({
      success: true,
      remindersCount: reminders.length,
      overdueFollowUps: overdueFollowUps.length,
      upcomingMeetings: upcomingMeetings.length,
      urgentTasks: urgentTasks.length,
    });
  } catch (error) {
    console.error('Reminder check cron error:', error);
    return NextResponse.json(
      { error: 'Failed to check reminders' },
      { status: 500 }
    );
  }
}
