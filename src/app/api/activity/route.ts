// Activity Feed API - Returns events from the canonical events table
import { NextRequest, NextResponse } from 'next/server';
import { getActivityFeed, getTodaysEvents, getEventStats } from '@/lib/contextGraph/queries';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const types = searchParams.get('types')?.split(',').filter(Boolean);
    const view = searchParams.get('view') || 'feed'; // 'feed', 'today', 'stats'

    let data;

    switch (view) {
      case 'today':
        data = await getTodaysEvents();
        break;
      case 'stats':
        const daysBack = parseInt(searchParams.get('days') || '7', 10);
        data = await getEventStats(daysBack);
        break;
      case 'feed':
      default:
        data = await getActivityFeed(limit, types);
        break;
    }

    return NextResponse.json(
      {
        data,
        view,
        fetchedAt: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Activity API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data', details: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
