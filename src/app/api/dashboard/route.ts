// Dashboard API - Aggregates all data sources for the v0 frontend
import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBriefing } from '@/lib/data-sources/aggregator';
import { getTasks, getFollowUps, getContacts, getUpcomingMeetings } from '@/lib/supabase';
import { getStalledOpportunities, getOpportunitiesClosingSoon, getPipelineValue } from '@/lib/data-sources/salesforce';
import { getTodaysMeetings } from '@/lib/data-sources/calendar';

// Allow CORS from v0 dashboard
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.V0_DASHBOARD_URL || 'https://v0-alfred-hub.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    // Verify API key if provided
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.DASHBOARD_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Fetch all data in parallel
    const [
      tasks,
      followUps,
      contacts,
      meetings,
      todayMeetings,
      stalledOpps,
      closingOpps,
      pipelineValue,
    ] = await Promise.all([
      getTasks('pending'),
      getFollowUps('pending'),
      getContacts(),
      getUpcomingMeetings(7),
      getTodaysMeetings(),
      getStalledOpportunities(14),
      getOpportunitiesClosingSoon(30),
      getPipelineValue(),
    ]);

    // Calculate stats
    const stats = {
      pipelineValue: pipelineValue || 0,
      meetingsThisWeek: meetings?.length || 0,
      openTasks: tasks?.length || 0,
      followUpsDueToday: followUps?.filter((f: any) => {
        const dueDate = new Date(f.reminder_date);
        const today = new Date();
        return dueDate.toDateString() === today.toDateString();
      }).length || 0,
    };

    // Transform tasks for frontend
    const transformedTasks = (tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      source: t.source,
    }));

    // Transform follow-ups for frontend
    const transformedFollowUps = (followUps || []).map((f: any) => ({
      id: f.id,
      contactName: f.contact_name,
      contactEmail: f.contact_email,
      context: f.context,
      urgency: f.urgency,
      dueDate: f.reminder_date,
      company: f.company || contacts?.find((c: any) => c.email === f.contact_email)?.company,
    }));

    // Transform meetings for frontend
    const transformedMeetings = (todayMeetings || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      startTime: m.startTime,
      endTime: m.endTime,
      attendees: m.attendees,
      location: m.location,
      description: m.description,
      prepReady: m.prepNotes ? true : false,
      // Try to match with Salesforce opportunity
      opportunity: closingOpps?.find((o: any) =>
        m.title?.toLowerCase().includes(o.accountName?.toLowerCase())
      ),
    }));

    // Transform opportunities for frontend
    const transformedOpportunities = [...(stalledOpps || []), ...(closingOpps || [])].map((o: any) => ({
      id: o.id,
      name: o.name,
      accountName: o.accountName,
      amount: o.amount,
      stage: o.stage,
      closeDate: o.closeDate,
      probability: o.probability,
      daysSinceActivity: o.daysSinceActivity,
      nextStep: o.nextStep,
      isStalled: o.daysSinceActivity > 14,
      isAtRisk: o.probability && o.probability < 50,
    }));

    // Generate AI insights
    const briefing = await generateDailyBriefing();

    const response = {
      stats,
      tasks: transformedTasks,
      followUps: transformedFollowUps,
      meetings: transformedMeetings,
      opportunities: transformedOpportunities,
      insights: briefing.insights || [],
      contacts: (contacts || []).slice(0, 20),
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
