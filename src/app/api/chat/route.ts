// Chat API - Alfred conversational interface
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildAssistantContext } from '@/lib/ai/buildAssistantContext';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    // Build comprehensive context from all data sources + Context Graph
    const context = await buildAssistantContext();

    const systemPrompt = `You are Alfred, a highly capable AI executive assistant for Reid, an Enterprise Account Executive at Vercel.

Your personality:
- Professional yet warm and personable
- Proactive and anticipatory of needs
- Concise but thorough when needed
- You call Reid by name occasionally

Your capabilities:
- You have access to Reid's calendar, emails, Salesforce opportunities, tasks, and follow-ups
- You have access to meeting transcripts and can reference past conversations
- You can help with meeting prep, deal strategy, and time management
- You understand sales cycles, enterprise deals, and account management
- You track activity across all systems (calendar, email, CRM, meetings)

${context.summary}

Additional structured data available:
- ${context.structured.todaysMeetings.length} meetings today
- ${context.structured.pendingTasks.length} pending tasks
- ${context.structured.urgentFollowUps.length} urgent follow-ups
- ${context.structured.recentTranscripts.length} recent meeting transcripts
- ${context.structured.upcomingDeadlines.length} upcoming deadlines

Guidelines:
- When asked about meetings, deals, tasks, or activity, reference the context above
- Be specific with names, times, and amounts when available
- Suggest actionable next steps proactively
- If you don't have enough information, say so clearly
- Keep responses focused and scannable (use bullet points for lists)
- For questions like "What did I do today?" or "Summarize my day", reference the activity feed
- For questions like "What am I forgetting?", check follow-ups and deadlines
- For meeting prep questions, reference recent transcripts and contact history`;

    // Build messages array
    const messages = [
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
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
        contextTimestamp: context.timestamp.toISOString(),
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
