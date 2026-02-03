// Opportunities API - Fetch Salesforce opportunities
import { NextRequest, NextResponse } from 'next/server';
import {
  getStalledOpportunities,
  getOpportunitiesClosingSoon,
  getOpportunitiesByAccount,
  getPipelineValue,
} from '@/lib/data-sources/salesforce';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.V0_DASHBOARD_URL || 'https://v0-alfred-hub.vercel.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const accountName = searchParams.get('account');

    let opportunities: any[] = [];
    let pipelineValue = 0;

    // Fetch based on filter
    if (accountName) {
      opportunities = await getOpportunitiesByAccount(accountName);
    } else if (filter === 'stalled') {
      opportunities = await getStalledOpportunities(14);
    } else if (filter === 'closing') {
      opportunities = await getOpportunitiesClosingSoon(30);
    } else {
      // Get both stalled and closing
      const [stalled, closing] = await Promise.all([
        getStalledOpportunities(14),
        getOpportunitiesClosingSoon(30),
      ]);

      // Merge and dedupe by ID
      const seen = new Set();
      opportunities = [...stalled, ...closing].filter((o) => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
    }

    // Always get pipeline value
    pipelineValue = await getPipelineValue();

    // Transform for frontend
    const transformed = opportunities.map((o: any) => ({
      id: o.id,
      name: o.name,
      accountName: o.accountName,
      amount: o.amount,
      stage: o.stage,
      closeDate: o.closeDate,
      probability: o.probability,
      nextStep: o.nextStep,
      daysSinceActivity: o.daysSinceActivity,
      ownerName: o.ownerName,
      isStalled: o.daysSinceActivity && o.daysSinceActivity > 14,
      isAtRisk: o.probability && o.probability < 50,
    }));

    return NextResponse.json(
      {
        opportunities: transformed,
        pipelineValue,
        count: transformed.length,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Opportunities API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500, headers: corsHeaders }
    );
  }
}
