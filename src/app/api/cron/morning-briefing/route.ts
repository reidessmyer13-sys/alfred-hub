import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBriefing } from '@/lib/claude';
import { sendReminder as sendSlackReminder } from '@/lib/slack';
import { sendReminder as sendWhatsAppReminder } from '@/lib/twilio';

// Vercel Cron: runs at 7:30 AM Mountain Time (Reid's timezone)
// Configure in vercel.json

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running morning briefing cron job...');

    // Generate the briefing
    const briefing = await generateDailyBriefing();

    // Send via both channels
    const slackMessage = `*Good morning, Reid!*\n\nHere's your daily briefing:\n\n${briefing}`;

    await Promise.all([
      sendSlackReminder(slackMessage),
      sendWhatsAppReminder(`Good morning, Reid!\n\n${briefing}`),
    ]);

    console.log('Morning briefing sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Morning briefing sent',
      briefing,
    });
  } catch (error) {
    console.error('Morning briefing cron error:', error);
    return NextResponse.json(
      { error: 'Failed to send morning briefing' },
      { status: 500 }
    );
  }
}
