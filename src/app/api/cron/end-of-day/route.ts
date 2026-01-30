import { NextRequest, NextResponse } from 'next/server';
import { getFollowUps, getTasks } from '@/lib/supabase';
import { sendReminder as sendSlackReminder } from '@/lib/slack';
import { chat } from '@/lib/claude';

// Vercel Cron: runs at 5:00 PM Mountain Time
// Configure in vercel.json

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running end-of-day summary cron job...');

    const [tasks, followUps] = await Promise.all([
      getTasks('pending'),
      getFollowUps('pending'),
    ]);

    // Filter for items that needed attention today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const tasksDueToday = tasks.filter((t) => t.due_date?.startsWith(todayStr));
    const followUpsDueToday = followUps.filter((fu) =>
      fu.reminder_date.startsWith(todayStr)
    );

    // Generate summary using Claude
    const summaryPrompt = `Generate a brief end-of-day summary for Reid. Be encouraging but honest.

Data:
- Tasks due today that are still pending: ${tasksDueToday.length}
- Follow-ups due today that are still pending: ${followUpsDueToday.length}
- Total pending tasks: ${tasks.length}
- Total pending follow-ups: ${followUps.length}

${tasksDueToday.length > 0 ? `Tasks that were due today:\n${tasksDueToday.map((t) => `- ${t.title}`).join('\n')}` : ''}

${followUpsDueToday.length > 0 ? `Follow-ups that were due today:\n${followUpsDueToday.map((fu) => `- ${fu.contact_name}`).join('\n')}` : ''}

Provide:
1. Quick assessment of the day
2. Anything that should be top priority tomorrow
3. Keep it to 3-4 sentences max`;

    const summary = await chat(summaryPrompt, [], 'cron');

    const message = `*End of Day Summary*\n\n${summary}`;
    await sendSlackReminder(message);

    console.log('End-of-day summary sent');

    return NextResponse.json({
      success: true,
      message: 'End-of-day summary sent',
      tasksDueToday: tasksDueToday.length,
      followUpsDueToday: followUpsDueToday.length,
    });
  } catch (error) {
    console.error('End-of-day cron error:', error);
    return NextResponse.json(
      { error: 'Failed to send end-of-day summary' },
      { status: 500 }
    );
  }
}
