# Alfred Hub Architecture Snapshot

**Snapshot Date:** 2026-02-04
**Last Deploy Commit:** `c0e7117` – "feat: add chat UI page for direct Alfred interaction"
**Production URL:** `https://alfred-hub-iota.vercel.app`
**Chat UI:** `https://alfred-hub-iota.vercel.app/chat`

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
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
├──────────┬──────────┬──────────┬──────────┬────────────────────┤
│ Google   │ Gmail    │Salesforce│ Granola  │ Alfred Internal    │
│ Calendar │          │          │Transcripts│ (Tasks/Follow-ups) │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────────┬──────────┘
     │          │          │          │               │
     ▼          ▼          ▼          ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT INGESTION LAYER                         │
│  src/lib/events/eventWriter.ts                                   │
│  - writeEvent() / writeEvents()                                  │
│  - Emit functions for each event type                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CANONICAL EVENTS TABLE                        │
│  Supabase: events                                                │
│  - id, type, source, occurred_at, ingested_at                   │
│  - entities (JSONB): person_ids, account_id, opportunity_id,    │
│    meeting_id, thread_id, transcript_id                         │
│  - raw_payload, derived_metadata                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT GRAPH LAYER                           │
│  src/lib/contextGraph/ (READ-ONLY)                               │
│  - getTimelineForPerson()                                        │
│  - getEventsForMeeting()                                         │
│  - getEventsForThread()                                          │
│  - getRecentInteractionsForPerson()                              │
│  - getPersonCooccurrences()                                      │
│  - getEventsForAccount()                                         │
│  - getEventsForOpportunity()                                     │
│  - getEventsForTranscript()                                      │
│  - getRecentTranscripts()                                        │
│  - getTranscriptsForMeeting()                                    │
│  - getTranscriptsForPerson()                                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  PRE-MEETING     │ │  POST-MEETING    │ │  GRANOLA         │
│  INTELLIGENCE    │ │  INTELLIGENCE    │ │  LINKER          │
│  src/lib/        │ │  src/lib/        │ │  src/lib/granola │
│  preMeeting/     │ │  postMeeting/    │ │  /linker.ts      │
│                  │ │                  │ │                  │
│  Generates       │ │  Extracts        │ │  Links           │
│  structured      │ │  explicit        │ │  transcripts     │
│  briefings       │ │  actions from    │ │  to meetings &   │
│  before meetings │ │  transcripts     │ │  opportunities   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Completed Modules

### 1. Canonical Event System
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

**Source Systems:**
- `google_calendar`, `gmail`, `salesforce`, `granola`, `slack`, `alfred_internal`

### 2. Context Graph Layer
**Location:** `src/lib/contextGraph/`

| File | Purpose |
|------|---------|
| `client.ts` | Supabase client for read-only queries |
| `queries.ts` | All query functions |
| `types.ts` | TimelineEvent, PersonInteraction, CooccurrenceResult |
| `index.ts` | Public exports |

**Key Constraint:** This layer is strictly READ-ONLY. No writes, no Claude calls, no inference.

### 3. Pre-Meeting Intelligence
**Location:** `src/lib/preMeeting/`

| File | Purpose |
|------|---------|
| `generator.ts` | Generates PreMeetingBrief from Context Graph |
| `types.ts` | PreMeetingBrief, AttendeeContext interfaces |
| `index.ts` | Public exports |

**Output Structure:**
```typescript
interface PreMeetingBrief {
  meeting_id: string;
  meeting_title: string;
  meeting_time: Date;
  attendees: AttendeeContext[];
  recent_interactions: PersonInteraction[];
  open_follow_ups: TimelineEvent[];
  related_threads: TimelineEvent[];
  related_opportunity?: { opportunity_id, account_id };
  generated_at: Date;
}
```

### 4. Post-Meeting Intelligence
**Location:** `src/lib/postMeeting/`

| File | Purpose |
|------|---------|
| `extractor.ts` | Deterministic action extraction with regex patterns |
| `generator.ts` | Combines extraction with context correlation |
| `types.ts` | ExtractedAction, SurfacedContext, PostMeetingInsights |
| `index.ts` | Public exports |

**Extraction Patterns:**
- Action item markers: `action item:`, `to-do:`, `task:`, `next step:`
- Commitments: `I'll`, `We'll`, `I will`, `Let me`
- Time-bound: `by Monday`, `within 3 days`, `before EOD`
- Follow-ups: `follow up with`, `reach out to`, `schedule a call`

**Key Constraint:** Extraction is deterministic – no inference, no scoring, no guessing.

### 5. Granola Integration
**Location:** `src/lib/granola/`, `src/app/api/webhooks/granola/`

| File | Purpose |
|------|---------|
| `linker.ts` | READ-ONLY context linker for meetings & opportunities |
| `route.ts` | Webhook handler that emits GranolaTranscriptFetched events |

**Linking Logic:**
- Matches transcripts to calendar events by title similarity + attendee overlap
- Finds related Salesforce opportunities by attendee overlap

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

### Indexes
- `idx_events_occurred_at` – for time-range queries
- `idx_events_account_id` – for account lookups
- `idx_events_opportunity_id` – for opportunity lookups
- `idx_events_person_ids` – GIN index for person array containment
- `idx_events_transcript_id` – for transcript lookups

### Migrations
| Migration | Purpose |
|-----------|---------|
| `001_create_events_table.sql` | Initial events table + indexes |
| `002_add_granola_event_type.sql` | Add GranolaTranscriptFetched type |

---

## Constraints & Design Decisions

### What We DON'T Do
1. **No event mutation** – events are immutable once written
2. **No inference in extraction** – only explicit, stated actions
3. **No Claude calls in Context Graph** – purely deterministic queries
4. **No automated actions** – intelligence is surfaced for human review

### Naming Conventions
- Event types use PascalCase with past tense verbs: `CalendarEventFetched`
- Source systems use snake_case: `google_calendar`
- Entity fields use snake_case: `person_ids`, `meeting_id`

### Error Handling
- All event writes include error logging
- Context Graph queries return empty arrays on error (never throw)
- Webhook handlers respond 200 even on partial failure (to avoid retries)

---

## Recovery Instructions

### To Resume Development
1. Clone the repository:
   ```bash
   git clone https://github.com/reidessmyer13-sys/alfred-hub.git
   cd alfred-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see `.env.example` or CLAUDE.md)

4. Run migrations in Supabase:
   - `001_create_events_table.sql` (if not already run)
   - `002_add_granola_event_type.sql`

5. Start development server:
   ```bash
   npm run dev
   ```

### To Verify System Health
1. Check events are flowing:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://your-domain.vercel.app/api/debug/events
   ```

2. Verify event counts in Supabase:
   ```sql
   SELECT type, COUNT(*) FROM events GROUP BY type;
   ```

### Key Files to Review When Resuming
1. `src/lib/events/eventWriter.ts` – understand event structure
2. `src/lib/contextGraph/queries.ts` – see available queries
3. `src/lib/postMeeting/extractor.ts` – see extraction patterns
4. `CLAUDE.md` – project memory and account information

---

## Accounts & Deployment

| Service | Account | Notes |
|---------|---------|-------|
| GitHub | `reidessmyer13-sys` | Personal account only |
| Vercel | `reidessmyer13-9981` | Hobby plan, personal account |
| Vercel Project ID | `prj_kE6PNtxoH2uwreeu7ewIfk84H0gD` | reid-essmyers-projects/alfred-hub |
| Vercel User ID | `iJNwTjbEjQUggUtciJMc0HAB` | For API access |
| Supabase | (configured in env) | Events table lives here |

**Production URL:** `https://alfred-hub-iota.vercel.app`

**Important:** Do NOT use work accounts (reid.essmyer@vercel.com, reidessmyer)

---

## Recent Updates (2026-02-04)

### Deployed Features
1. **Chat UI** – Browser-based chat at `/chat` for direct Alfred interaction
2. **Chat API** – POST `/api/chat` with conversation history support
3. **TypeScript Fixes** – All build errors resolved, strict mode passing

### TypeScript Fixes Applied
- Removed unused `AttendeeContext` import in `calendar.ts`
- Added missing `trigger_type` field in follow-ups API route
- Extracted `RelatedThread` and `RelatedFollowUp` as standalone interfaces in postMeeting types

### Environment Variables Configured in Vercel
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `GRANOLA_WEBHOOK_SECRET`

---

## Next Steps (Not Yet Implemented)

1. **Dashboard Integration** – Connect v0 frontend to intelligence endpoints
2. **Scheduled Briefings** – Configure Vercel cron jobs
3. **Slack Integration** – Surface insights in Slack channels
4. **Google OAuth Flow** – Complete OAuth setup for Calendar/Gmail access

---

*This snapshot represents the state of Alfred Hub as of commit `c0e7117`. Production deployment is live at https://alfred-hub-iota.vercel.app*
