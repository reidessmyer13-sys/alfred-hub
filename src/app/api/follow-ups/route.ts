// Follow-ups API - CRUD operations for follow-ups
import { NextRequest, NextResponse } from 'next/server';
import { getFollowUps, createFollowUp, completeFollowUp } from '@/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.V0_DASHBOARD_URL || 'https://v0-alfred-hub.vercel.app',
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
    const { contactName, contactEmail, context, urgency, reminderDate } = body;

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const followUp = await createFollowUp({
      contact_name: contactName,
      contact_email: contactEmail,
      context,
      urgency: urgency || 'medium',
      reminder_date: reminderDate,
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
