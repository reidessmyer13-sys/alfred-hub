# Alfred Hub Architecture Snapshot

**Snapshot Date:** 2026-02-04
**Last Deploy Commit:** Pending – "feat: complete UI with dashboard, chat, tasks, follow-ups, contacts, meetings, integrations, settings"
**Production URL:** `https://alfred-hub-iota.vercel.app`
**Dashboard UI:** `https://alfred-hub-iota.vercel.app/dashboard`

---

## Overview

Alfred is an AI-powered sales assistant built on an event-sourced architecture. All data flows through a canonical event system, with read-only intelligence layers that derive insights without mutation.

### Core Principles
1. **Events are append-only** – no event is ever mutated or deleted
2. **All reasoning happens on top of events** – never raw APIs
3. **Read-only intelligence layers** – no writes, no automation, no inference beyond explicit extraction
4. **Deterministic extraction** – no scoring, no guessing

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ALFRED UI                                       │
│  Dashboard • Chat • Tasks • Follow-ups • Contacts • Meetings • Settings     │
│  src/app/dashboard/                                                          │
│  - Light/dark mode toggle                                                   │
│  - Simple password authentication                                           │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  /api/chat • /api/dashboard • /api/activity • /api/tasks • /api/follow-ups  │
│  /api/contacts • /api/meetings • /api/auth/* • /api/webhooks/*              │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  AI CONTEXT BUILDER  │ │  SLACK NOTIFIER      │ │  DATA AGGREGATOR     │
│  src/lib/ai/         │ │  src/lib/            │ │  src/lib/            │
│  buildAssistant      │ │  notifications/      │ │  data-sources/       │
│  Context.ts          │ │  slackNotifier.ts    │ │  aggregator.ts       │
│                      │ │                      │ │                      │
│  Compiles context    │ │  Sends notifications │ │  Combines all        │
│  for Claude from     │ │  via Slack webhook   │ │  sources into        │
│  Context Graph +     │ │  for urgent items    │ │  unified briefing    │
│  Aggregator          │ │                      │ │                      │
└──────────┬───────────┘ └──────────────────────┘ └──────────┬───────────┘
           │                                                  │
           └──────────────────────┬───────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                          │
├──────────┬──────────┬──────────┬──────────┬────────────────────────────────┤
│ Google   │ Gmail    │Salesforce│ Granola  │ Alfred Internal                 │
│ Calendar │          │          │Transcripts│ (Tasks/Follow-ups)              │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────────┬──────────────────────┘
     │          │          │          │               │
     ▼          ▼          ▼          ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EVENT INGESTION LAYER                                   │
│  src/lib/events/eventWriter.ts                                               │
│  - writeEvent() / writeEvents()                                              │
│  - Emit functions for each event type                                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CANONICAL EVENTS TABLE                                  │
│  Supabase: events                                                            │
│  - id, type, source, occurred_at, ingested_at                               │
│  - entities (JSONB): person_ids, account_id, opportunity_id,                │
│    meeting_id, thread_id, transcript_id                                     │
│  - raw_payload, derived_metadata                                            │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONTEXT GRAPH LAYER                                     │
│  src/lib/contextGraph/ (READ-ONLY)                                           │
│  - getTimelineForPerson()          - getEventsForOpportunity()              │
│  - getEventsForMeeting()           - getEventsForTranscript()               │
│  - getEventsForThread()            - getRecentTranscripts()                 │
│  - getRecentInteractionsForPerson()- getTranscriptsForMeeting()             │
│  - getPersonCooccurrences()        - getTranscriptsForPerson()              │
│  - getEventsForAccount()           - getActivityFeed() [NEW]                │
│                                    - getTodaysEvents() [NEW]                │
│                                    - getEventStats() [NEW]                  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  PRE-MEETING         │ │  POST-MEETING        │ │  GRANOLA             │
│  INTELLIGENCE        │ │  INTELLIGENCE        │ │  LINKER              │
│  src/lib/            │ │  src/lib/            │ │  src/lib/granola     │
│  preMeeting/         │ │  postMeeting/        │ │  /linker.ts          │
│                      │ │                      │ │                      │
│  Generates           │ │  Extracts            │ │  Links               │
│  structured          │ │  explicit            │ │  transcripts         │
│  briefings           │ │  actions from        │ │  to meetings &       │
│  before meetings     │ │  transcripts         │ │  opportunities       │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## Completed Modules

### 1. UI Layer (NEW - 2026-02-04)
**Location:** `src/app/dashboard/`, `src/components/`

| Component | Purpose |
|-----------|---------|
| `dashboard/page.tsx` | Main dashboard with stats, insights, agenda, tasks |
| `dashboard/chat/page.tsx` | Chat interface with Alfred |
| `dashboard/tasks/page.tsx` | Task management CRUD |
| `dashboard/follow-ups/page.tsx` | Follow-up tracking |
| `dashboard/contacts/page.tsx` | Contact directory |
| `dashboard/meetings/page.tsx` | Meeting calendar |
| `dashboard/integrations/page.tsx` | Integration status |
| `dashboard/settings/page.tsx` | User preferences |
| `components/layout/Sidebar.tsx` | Navigation sidebar |
| `components/layout/DashboardLayout.tsx` | Dashboard wrapper |
| `components/providers/ThemeProvider.tsx` | Light/dark mode |
| `components/providers/AuthProvider.tsx` | Auth context |
| `login/page.tsx` | Login page |

**Features:**
- Light/dark mode toggle with persistence
- Simple password authentication
- Responsive design with Tailwind CSS
- Real-time data from API endpoints

### 2. AI Context Builder (NEW - 2026-02-04)
**Location:** `src/lib/ai/buildAssistantContext.ts`

Builds comprehensive context for Claude by combining:
- Context Graph queries (events, transcripts, activity)
- Data aggregator (briefings, insights)
- Supabase data (tasks, follow-ups, contacts, meetings)

**Output:**
```typescript
interface AssistantContext {
  timestamp: Date;
  summary: string;  // Formatted string for Claude prompt
  structured: {
    todaysMeetings: Array<{ title, time, attendees }>;
    pendingTasks: Array<{ title, priority, dueDate }>;
    urgentFollowUps: Array<{ contactName, context, urgency }>;
    recentActivity: Array<{ type, summary, when }>;
    recentTranscripts: Array<{ title, when }>;
    upcomingDeadlines: Array<{ item, dueDate, type }>;
    eventStats: { total, byType };
  };
}
```

### 3. Slack Notifier (NEW - 2026-02-04)
**Location:** `src/lib/notifications/slackNotifier.ts`

Sends notifications via Slack Incoming Webhook:
- `notifyUrgentTask()` - Urgent task due soon
- `notifyOverdueFollowUp()` - Follow-up overdue
- `notifyMeetingReminder()` - Meeting starts soon
- `notifyActionItems()` - Action items from transcript
- `notifyDailyBriefing()` - Morning briefing
- `notifyEndOfDay()` - End of day summary

### 4. Activity Feed API (NEW - 2026-02-04)
**Location:** `src/app/api/activity/route.ts`

New API endpoint for activity feed:
- `GET /api/activity?view=feed&limit=50` - Recent activity
- `GET /api/activity?view=today` - Today's events
- `GET /api/activity?view=stats&days=7` - Event statistics

New Context Graph queries:
- `getActivityFeed(limit, types)` - Chronological event feed
- `getTodaysEvents()` - Events for current day
- `getEventStats(daysBack)` - Event counts by type/source

### 5. Canonical Event System
**Location:** `src/lib/events/`

| File | Purpose |
|------|---------|
| `eventWriter.ts` | Single source of truth for all event writes |
| `index.ts` | Re-exports + convenience emit functions |
| `debugReader.ts` | Debug endpoint helper |

**Event Types:**
- `CalendarEventFetched` – from Google Calendar
- `EmailThreadFetched` – from Gmail
- `EmailSent` – outbound emails
- `TaskCreated` – internal tasks
- `FollowUpCreated` – follow-up reminders
- `ReminderTriggered` – reminder notifications
- `GranolaTranscriptFetched` – meeting transcripts

### 6. Context Graph Layer
**Location:** `src/lib/contextGraph/`

| File | Purpose |
|------|---------|
| `client.ts` | Supabase client for read-only queries |
| `queries.ts` | All query functions (including new activity queries) |
| `types.ts` | TimelineEvent, PersonInteraction, CooccurrenceResult |
| `index.ts` | Public exports |

**Key Constraint:** This layer is strictly READ-ONLY. No writes, no Claude calls, no inference.

### 7. Pre-Meeting Intelligence
**Location:** `src/lib/preMeeting/`

Generates structured briefings before meetings.

### 8. Post-Meeting Intelligence
**Location:** `src/lib/postMeeting/`

Extracts explicit actions from transcripts using deterministic patterns.

### 9. Granola Integration
**Location:** `src/lib/granola/`, `src/app/api/webhooks/granola/`

Links transcripts to calendar events and opportunities.

---

## Database Schema

### Events Table
```sql
CREATE TYPE event_type AS ENUM (
  'CalendarEventFetched', 'EmailThreadFetched', 'EmailSent',
  'TaskCreated', 'FollowUpCreated', 'ReminderTriggered',
  'GranolaTranscriptFetched'
);

CREATE TYPE source_system AS ENUM (
  'google_calendar', 'gmail', 'salesforce', 'granola', 'slack', 'alfred_internal'
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type event_type NOT NULL,
  source source_system NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entities JSONB NOT NULL DEFAULT '{}',
  raw_payload JSONB NOT NULL,
  derived_metadata JSONB
);
```

---

## Environment Variables

### Required in Vercel
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Claude API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `GRANOLA_WEBHOOK_SECRET` | Webhook authentication |
| `ALFRED_PASSWORD` | UI authentication (NEW) |
| `SLACK_WEBHOOK_URL` | Slack notifications (NEW) |

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Chat with Alfred (Claude) |
| `/api/dashboard` | GET | Aggregated dashboard data |
| `/api/activity` | GET | Activity feed from events |
| `/api/tasks` | GET/POST/PUT | Task CRUD |
| `/api/follow-ups` | GET/POST/PUT | Follow-up CRUD |
| `/api/contacts` | GET | Contact list |
| `/api/meetings` | GET | Calendar meetings |
| `/api/opportunities` | GET | Salesforce opportunities |
| `/api/auth/login` | POST | Password authentication |
| `/api/auth/logout` | POST | Clear session |
| `/api/auth/check` | GET | Check auth status |
| `/api/auth/status` | GET | Integration status |
| `/api/auth/google` | GET | Google OAuth flow |
| `/api/auth/google/callback` | GET | OAuth callback |
| `/api/webhooks/granola` | POST | Transcript ingestion |
| `/api/cron/*` | GET | Scheduled tasks |

---

## Accounts & Deployment

| Service | Account | Notes |
|---------|---------|-------|
| GitHub | `reidessmyer13-sys` | Personal account only |
| Vercel | `reidessmyer13-9981` | Hobby plan, personal account |
| Vercel Project ID | `prj_kE6PNtxoH2uwreeu7ewIfk84H0gD` | reid-essmyers-projects/alfred-hub |
| Supabase | (configured in env) | Events table lives here |

**Production URL:** `https://alfred-hub-iota.vercel.app`

**Important:** Do NOT use work accounts (reid.essmyer@vercel.com, reidessmyer)

---

## Recent Updates (2026-02-04)

### Complete UI Build
1. **Dashboard** - Stats, insights, agenda, tasks, follow-ups, activity feed
2. **Chat** - Enhanced context with buildAssistantContext
3. **Tasks** - Full CRUD with filtering and priority
4. **Follow-ups** - Full CRUD with urgency tracking
5. **Contacts** - Directory with search and detail panel
6. **Meetings** - Calendar view grouped by date
7. **Integrations** - Status page with connect buttons
8. **Settings** - Theme, notifications, account

### New Modules
- `src/lib/ai/buildAssistantContext.ts` - AI context builder
- `src/lib/notifications/slackNotifier.ts` - Slack notifications
- `src/app/api/activity/route.ts` - Activity feed API

### New Context Graph Queries
- `getActivityFeed()` - Chronological event feed
- `getTodaysEvents()` - Today's events
- `getEventStats()` - Event statistics

---

## Post-Deployment Checklist

- [ ] Set `ALFRED_PASSWORD` in Vercel env
- [ ] Create Slack Incoming Webhook
- [ ] Set `SLACK_WEBHOOK_URL` in Vercel env
- [ ] Test login flow
- [ ] Verify dashboard data loads
- [ ] Test chat with Alfred
- [ ] Create sample tasks/follow-ups

---

*This snapshot represents Alfred Hub with complete UI. Production deployment pending commit and push.*
