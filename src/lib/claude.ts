import Anthropic from '@anthropic-ai/sdk';
import { getTasks, getFollowUps, getContacts, getUpcomingMeetings, searchMemory, addMemory } from './supabase';
import { generateDailyBriefing as getAggregatedBriefing, getContactIntelligence, getContextForPrompt } from './data-sources/aggregator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Enhanced system prompt with cross-source intelligence
const ALFRED_SYSTEM_PROMPT = `You are Alfred, Reid Essmyer's personal AI executive assistant. You help him manage his work as a Commercial Greenfield - Platforms sales professional at Vercel.

## Your Capabilities
You have access to Reid's data across multiple systems:
- **Alfred Memory**: Tasks, follow-ups, contacts, meeting prep, conversation history
- **Salesforce**: Opportunities, accounts, contacts, activities (when connected)
- **Gmail**: Email threads, response tracking (when connected)
- **Google Calendar**: Meetings, scheduling, free/busy time (when connected)
- **Granola**: Meeting notes, transcripts, action items (when connected)

## Your Personality
- Professional but personable, like a trusted chief of staff
- Proactive - anticipate needs, surface risks, suggest actions
- Concise - Reid is busy, get to the point
- Context-aware - connect dots across ALL data sources
- Insight-driven - don't just report data, interpret it

## Cross-Source Intelligence
Your superpower is connecting information across sources:
- Before a meeting, pull context from Salesforce (opportunities), Granola (past meeting notes), Gmail (recent correspondence)
- When discussing a contact, know their opportunity status, last email, upcoming meetings
- Identify patterns: stalled deals, ignored contacts, overdue follow-ups
- Proactively surface risks: "You haven't touched Reltio in 22 days and the deal closes in 6 weeks"

## Current Channel
Responding via: ${process.env.CURRENT_CHANNEL || 'direct message'}
Keep responses appropriate for mobile/chat format (concise, scannable).

## Response Guidelines
1. When asked about tasks/follow-ups/meetings, always check the actual data
2. Offer to take action when appropriate (create tasks, set reminders, draft emails)
3. Proactively connect information: "You have a meeting with Joe tomorrow. Note: you haven't followed up since your Dec call, and the Newfront opportunity has been stalled for 44 days."
4. For meeting prep requests, pull comprehensive context from all sources
5. When creating reminders or tasks, confirm the details before saving

Be conversational but efficient. Skip formalities. Be the assistant Reid wishes he had.`;

// Enhanced tool definitions
const tools: Anthropic.Tool[] = [
  {
    name: 'get_tasks',
    description: 'Get tasks from Alfred memory. Can filter by status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Filter by task status',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_follow_ups',
    description: 'Get follow-up reminders. Can filter by status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'completed', 'snoozed'],
          description: 'Filter by follow-up status',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_contacts',
    description: 'Get saved contact information',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_upcoming_meetings',
    description: 'Get upcoming meetings within specified days',
    input_schema: {
      type: 'object' as const,
      properties: {
        days_ahead: {
          type: 'number',
          description: 'Number of days ahead to look (default 7)',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_memory',
    description: 'Search Alfred memory for past context, decisions, or conversations',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        category: {
          type: 'string',
          enum: ['conversation', 'preference', 'context', 'decision', 'other'],
          description: 'Filter by category',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_memory',
    description: 'Save something to Alfred memory for future reference',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'What to remember',
        },
        category: {
          type: 'string',
          enum: ['conversation', 'preference', 'context', 'decision', 'other'],
          description: 'Category of memory',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for easier retrieval',
        },
      },
      required: ['content', 'category'],
    },
  },
  {
    name: 'get_contact_intelligence',
    description: 'Get comprehensive intelligence about a contact including emails, meetings, opportunities, and suggested actions',
    input_schema: {
      type: 'object' as const,
      properties: {
        contact: {
          type: 'string',
          description: 'Contact name or email address',
        },
      },
      required: ['contact'],
    },
  },
  {
    name: 'get_daily_briefing',
    description: 'Get a comprehensive daily briefing with cross-source intelligence',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_follow_up',
    description: 'Create a new follow-up reminder for a contact',
    input_schema: {
      type: 'object' as const,
      properties: {
        contact_name: {
          type: 'string',
          description: 'Name of the contact',
        },
        contact_email: {
          type: 'string',
          description: 'Email of the contact (optional)',
        },
        context: {
          type: 'string',
          description: 'What to follow up about',
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Urgency level',
        },
        reminder_date: {
          type: 'string',
          description: 'When to remind (ISO date string)',
        },
      },
      required: ['contact_name', 'context', 'urgency', 'reminder_date'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description (optional)',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority level',
        },
        due_date: {
          type: 'string',
          description: 'Due date (ISO date string, optional)',
        },
      },
      required: ['title', 'priority'],
    },
  },
];

// Execute tool calls
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'get_tasks':
      const tasks = await getTasks(input.status as string | undefined);
      return JSON.stringify(tasks, null, 2);

    case 'get_follow_ups':
      const followUps = await getFollowUps(input.status as string | undefined);
      return JSON.stringify(followUps, null, 2);

    case 'get_contacts':
      const contacts = await getContacts();
      return JSON.stringify(contacts, null, 2);

    case 'get_upcoming_meetings':
      const meetings = await getUpcomingMeetings(input.days_ahead as number | undefined);
      return JSON.stringify(meetings, null, 2);

    case 'search_memory':
      const memories = await searchMemory(input.query as string, input.category as string | undefined);
      return JSON.stringify(memories, null, 2);

    case 'save_memory':
      const memory = await addMemory({
        content: input.content as string,
        category: input.category as 'conversation' | 'preference' | 'context' | 'decision' | 'other',
        tags: input.tags as string[] | undefined,
        source: 'alfred-hub',
      });
      return `Saved to memory: ${memory.id}`;

    case 'get_contact_intelligence':
      const intel = await getContactIntelligence(input.contact as string);
      if (!intel) {
        return `No contact found matching "${input.contact}"`;
      }
      return JSON.stringify(intel, null, 2);

    case 'get_daily_briefing':
      const briefing = await getAggregatedBriefing();
      return JSON.stringify(briefing, null, 2);

    case 'create_follow_up':
      const { getSupabase } = await import('./supabase');
      const supabase = getSupabase();
      const { data: newFollowUp, error: followUpError } = await supabase
        .from('follow_ups')
        .insert({
          contact_name: input.contact_name,
          contact_email: input.contact_email || null,
          context: input.context,
          urgency: input.urgency,
          reminder_date: input.reminder_date,
          trigger_type: 'date',
          status: 'pending',
        })
        .select()
        .single();
      if (followUpError) throw followUpError;
      return `Created follow-up for ${input.contact_name}: ${newFollowUp.id}`;

    case 'create_task':
      const { getSupabase: getSupabaseForTask } = await import('./supabase');
      const supabaseForTask = getSupabaseForTask();
      const { data: newTask, error: taskError } = await supabaseForTask
        .from('tasks')
        .insert({
          title: input.title,
          description: input.description || null,
          priority: input.priority,
          due_date: input.due_date || null,
          status: 'pending',
          source: 'alfred-hub-whatsapp',
        })
        .select()
        .single();
      if (taskError) throw taskError;
      return `Created task: ${newTask.title} (${newTask.id})`;

    default:
      return `Unknown tool: ${name}`;
  }
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(
  userMessage: string,
  conversationHistory: ConversationMessage[] = [],
  channel: string = 'direct'
): Promise<string> {
  // Get current context to include in system prompt
  let contextSummary = '';
  try {
    contextSummary = await getContextForPrompt();
  } catch (e) {
    console.error('Failed to get context:', e);
  }

  const systemPromptWithContext = ALFRED_SYSTEM_PROMPT + (contextSummary ? `\n\n${contextSummary}` : '');

  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  // Set current channel for context
  process.env.CURRENT_CHANNEL = channel;

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPromptWithContext,
    tools,
    messages,
  });

  // Handle tool use loop
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => ({
        type: 'tool_result' as const,
        tool_use_id: toolUse.id,
        content: await executeTool(toolUse.name, toolUse.input as Record<string, unknown>),
      }))
    );

    // Continue conversation with tool results
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPromptWithContext,
      tools,
      messages,
    });
  }

  // Extract text response
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  return textBlock?.text || 'I encountered an issue processing your request.';
}

// Enhanced daily briefing using aggregated data
export async function generateDailyBriefing(): Promise<string> {
  const briefing = await getAggregatedBriefing();

  const briefingPrompt = `Generate a concise, actionable morning briefing for Reid based on this data:

${JSON.stringify(briefing, null, 2)}

Format:
1. **Top Priority** - The single most important thing to address today
2. **Today's Meetings** (${briefing.meetings.length}) - Brief list with any context/prep notes
3. **Urgent Follow-ups** (${briefing.urgentFollowUps.length}) - Who needs attention and why
4. **Stalled Opportunities** (${briefing.stalledOpportunities.length}) - Deals at risk
5. **Insights** - 2-3 cross-source observations or recommendations

Keep it scannable for mobile. Use bullet points. Be direct about risks.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: ALFRED_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: briefingPrompt }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  return textBlock?.text || 'Unable to generate briefing.';
}

// Generate meeting prep
export async function generateMeetingPrep(meetingTitle: string, attendees: string[]): Promise<string> {
  // Get intelligence for each attendee
  const attendeeIntel = await Promise.all(
    attendees.slice(0, 5).map((a) => getContactIntelligence(a))
  );

  const prepPrompt = `Generate meeting prep for: "${meetingTitle}"

Attendees and their context:
${attendeeIntel
  .filter(Boolean)
  .map((intel) => JSON.stringify(intel, null, 2))
  .join('\n\n')}

Provide:
1. **Key Context** - What you should know about each attendee
2. **Talking Points** - Suggested topics based on open items
3. **Risks/Opportunities** - Things to watch for
4. **Follow-up Actions** - Likely next steps to prepare for`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: ALFRED_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prepPrompt }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  return textBlock?.text || 'Unable to generate meeting prep.';
}
