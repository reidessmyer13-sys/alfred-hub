// Follow-ups API - CRUD operations for follow-ups
import { NextRequest, NextResponse } from 'next/server';
import { getFollowUps, createFollowUp, completeFollowUp } from '@/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.V0_DASHBOARD_URL || 'https://v0-sales-assistant-dashboard-gd.vercel.sh',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const followUps = await getFollowUps(status);

    // Transform for frontend
    const transformed = followUps.map((f: any) => ({
      id: f.id,
      contactName: f.contact_name,
      contactEmail: f.contact_email,
      context: f.context,
      urgency: f.urgency,
      dueDate: f.reminder_date,
      status: f.status,
    }));

    return NextResponse.json({ followUps: transformed }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Follow-ups API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactName, contactEmail, context, urgency, reminderDate, triggerType } = body;

    if (!contactName || !context || !reminderDate) {
      return NextResponse.json(
        { error: 'contactName, context, and reminderDate are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate urgency value
    const validUrgency: 'low' | 'medium' | 'high' =
      urgency === 'low' || urgency === 'high' ? urgency : 'medium';

    // Validate trigger_type value
    const validTriggerType: 'date' | 'before_meeting' | 'manual' =
      triggerType === 'before_meeting' || triggerType === 'manual' ? triggerType : 'date';

    const followUp = await createFollowUp({
      contact_name: contactName as string,
      contact_email: contactEmail as string | undefined,
      context: context as string,
      urgency: validUrgency,
      trigger_type: validTriggerType,
      reminder_date: reminderDate as string,
    });

    return NextResponse.json({ followUp }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Follow-ups API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create follow-up' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Follow-up ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'complete') {
      const followUp = await completeFollowUp(id);
      return NextResponse.json({ followUp }, { headers: corsHeaders });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Follow-ups API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update follow-up' },
      { status: 500, headers: corsHeaders }
    );
  }
}
