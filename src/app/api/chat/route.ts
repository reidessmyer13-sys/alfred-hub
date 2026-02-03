// Chat API - Alfred conversational interface
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getContextForPrompt } from '@/lib/data-sources/aggregator';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.V0_DASHBOARD_URL || 'https://v0-alfred-hub.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Get current context from all data sources
    const context = await getContextForPrompt();

    const systemPrompt = `You are Alfred, a highly capable AI executive assistant for Reid, an Enterprise Account Executive at Vercel.

Your personality:
- Professional yet warm and personable
- Proactive and anticipatory of needs
- Concise but thorough when needed
- You call Reid by name occasionally

Your capabilities:
- You have access to Reid's calendar, emails, Salesforce opportunities, tasks, and follow-ups
- You can help with meeting prep, deal strategy, and time management
- You understand sales cycles, enterprise deals, and account management

Current context (today's data):
${context}

Guidelines:
- When asked about meetings, deals, or tasks, reference the context above
- Be specific with names, times, and amounts when available
- Suggest actionable next steps
- If you don't have enough information, say so clearly
- Keep responses focused and scannable (use bullet points for lists)`;

    // Build messages array
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I could not generate a response.';

    return NextResponse.json(
      {
        response: assistantMessage,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
