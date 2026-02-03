// Tasks API - CRUD operations for tasks
import { NextRequest, NextResponse } from 'next/server';
import { getTasks, createTask, updateTask, completeTask } from '@/lib/supabase';

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

    const tasks = await getTasks(status);

    return NextResponse.json({ tasks }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Tasks API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, dueDate, source, notes } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const task = await createTask({
      title,
      description,
      priority: priority || 'medium',
      due_date: dueDate,
      source,
      notes,
    });

    return NextResponse.json({ task }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Tasks API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // If marking as complete, use completeTask
    if (updates.status === 'completed') {
      const task = await completeTask(id);
      return NextResponse.json({ task }, { headers: corsHeaders });
    }

    const task = await updateTask(id, updates);
    return NextResponse.json({ task }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Tasks API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500, headers: corsHeaders }
    );
  }
}
