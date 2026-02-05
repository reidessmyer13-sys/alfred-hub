# Claude Code Project Memory - Alfred Hub

**Last Updated:** 2026-02-04

## CRITICAL: Development Process

**Always follow this workflow for Alfred development:**

1. **Update local files** in `/Users/reidessmyer/Desktop/App Projects/alfred-hub`
2. **Save persistent memory** to `CLAUDE.md` and `docs/ARCHITECTURE_SNAPSHOT.md`
3. **Commit and push** to GitHub (`reidessmyer13-sys/alfred-hub`)
4. **Vercel auto-deploys** to `alfred-hub-iota.vercel.app`

**IMPORTANT: Always ask clarifying questions before implementing features to ensure alignment with Reid's vision.**

---

## Vercel Account Information

**IMPORTANT: Only use Reid's personal Vercel account (NOT Enterprise/work accounts).**

### Account Details
- **User ID:** `iJNwTjbEjQUggUtciJMc0HAB`
- **Username:** `reidessmyer13-9981`
- **Dashboard:** `vercel.com/reidessmyer13-9981`
- **Email:** `reid.essmyer13@gmail.com`
- **Plan:** Hobby

### Alfred Hub Project (DEPLOYED)
- **Project ID:** `prj_kE6PNtxoH2uwreeu7ewIfk84H0gD`
- **Org/Team ID:** `team_vpQJxyPW7AXC16F7JeiDmr8J` (reid-essmyers-projects)
- **Production URL:** `https://alfred-hub-iota.vercel.app`
- **Dashboard UI:** `https://alfred-hub-iota.vercel.app/dashboard`
- **Chat UI:** `https://alfred-hub-iota.vercel.app/dashboard/chat`
- **Local Path:** `/Users/reidessmyer/Desktop/App Projects/alfred-hub`
- **GitHub Repo:** `https://github.com/reidessmyer13-sys/alfred-hub.git`
- **Auto-deploy:** Enabled (pushes to main trigger deployments)

---

## GitHub Account Information

- **Username:** `reidessmyer13-sys`
- **Email:** `reid.essmyer13@gmail.com`
- **Alfred Hub Repo:** `https://github.com/reidessmyer13-sys/alfred-hub.git`

### DO NOT USE
- ❌ `reidessmyer` (work GitHub account)
- ❌ `reid.essmyer@vercel.com` (work email)
- ❌ Any Vercel Enterprise/work teams
- ❌ Any v0.app or v0-related references

---

## Alfred Hub - Standalone Next.js App

### Production URLs
- **Dashboard:** `https://alfred-hub-iota.vercel.app/dashboard`
- **Chat:** `https://alfred-hub-iota.vercel.app/dashboard/chat`
- **Tasks:** `https://alfred-hub-iota.vercel.app/dashboard/tasks`
- **Follow-ups:** `https://alfred-hub-iota.vercel.app/dashboard/follow-ups`
- **Contacts:** `https://alfred-hub-iota.vercel.app/dashboard/contacts`
- **Meetings:** `https://alfred-hub-iota.vercel.app/dashboard/meetings`
- **Integrations:** `https://alfred-hub-iota.vercel.app/dashboard/integrations`
- **Settings:** `https://alfred-hub-iota.vercel.app/dashboard/settings`

### Framework
- **Next.js:** 16.1.6 with TypeScript (strict mode)
- **UI:** Tailwind CSS with light/dark mode toggle
- **Auth:** Simple password authentication (env: `ALFRED_PASSWORD`)
- **Integrations:** Supabase, Google Calendar, Gmail, Salesforce, Granola, Anthropic Claude

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Redirects to /dashboard |
| `/login` | GET | Login page |
| `/dashboard` | GET | Main dashboard with insights, agenda, tasks |
| `/dashboard/chat` | GET | Chat with Alfred |
| `/dashboard/tasks` | GET | Task management |
| `/dashboard/follow-ups` | GET | Follow-up tracking |
| `/dashboard/contacts` | GET | Contact directory |
| `/dashboard/meetings` | GET | Meeting calendar |
| `/dashboard/integrations` | GET | Integration status |
| `/dashboard/settings` | GET | User settings |
| `/api/chat` | POST | Claude-powered conversational interface |
| `/api/dashboard` | GET | Aggregated dashboard data |
| `/api/activity` | GET | Activity feed from events table |
| `/api/tasks` | GET/POST/PUT | Task CRUD operations |
| `/api/follow-ups` | GET/POST/PUT | Follow-up reminders |
| `/api/contacts` | GET | Contact list |
| `/api/meetings` | GET | Calendar meetings |
| `/api/opportunities` | GET | Salesforce opportunities |
| `/api/auth/login` | POST | Password authentication |
| `/api/auth/logout` | POST | Clear auth session |
| `/api/auth/check` | GET | Check auth status |
| `/api/auth/status` | GET | Integration status check |
| `/api/auth/google` | GET | Google OAuth flow |
| `/api/auth/google/callback` | GET | OAuth callback |
| `/api/webhooks/granola` | POST | Granola transcript ingestion |
| `/api/debug/events` | GET | Event debugging (dev/auth) |
| `/api/cron/morning-briefing` | GET | Daily briefing (7:30 AM MT) |
| `/api/cron/check-reminders` | GET | Hourly reminder check |
| `/api/cron/end-of-day` | GET | EOD summary (5:00 PM MT) |

---

## Architecture

```
https://alfred-hub-iota.vercel.app
         │
    ┌────┴────┐
    │   UI    │ ← Dashboard, Chat, Tasks, Follow-ups, etc.
    └────┬────┘
         │
    ┌────┴────┐
    │  APIs   │ ← /api/chat, /api/dashboard, /api/activity, etc.
    └────┬────┘
         │
    ┌────┴────────────────────────────────────────┐
    │            Data & Intelligence              │
    ├────────────────────────────────────────────┤
    │  • Context Graph (queries.ts)              │
    │  • buildAssistantContext (AI context)      │
    │  • Event Writer (canonical events)         │
    │  • Slack Notifier (notifications)          │
    └────┬────────────────────────────────────────┘
         │
         ▼ Data Sources
    ┌────┴────┬─────────┬──────────┬──────────┐
    │         │         │          │          │
 Supabase  Gmail   Calendar  Salesforce  Granola
```

---

## Environment Variables (Vercel)

### Currently Configured
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_KEY`
- ✅ `ANTHROPIC_API_KEY`
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `GOOGLE_REDIRECT_URI`
- ✅ `GRANOLA_WEBHOOK_SECRET`

### To Be Added
- ⏳ `ALFRED_PASSWORD` (for UI authentication)
- ⏳ `SLACK_WEBHOOK_URL` (for Slack notifications)
- ⏳ `CRON_SECRET` (for authenticated cron endpoints)

---

## Key Source Files

### UI Components
- `src/components/layout/Sidebar.tsx` - Navigation sidebar
- `src/components/layout/DashboardLayout.tsx` - Dashboard wrapper
- `src/components/providers/ThemeProvider.tsx` - Light/dark mode
- `src/components/providers/AuthProvider.tsx` - Auth context

### Dashboard Pages
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/app/dashboard/chat/page.tsx` - Chat with Alfred
- `src/app/dashboard/tasks/page.tsx` - Task management
- `src/app/dashboard/follow-ups/page.tsx` - Follow-up tracking
- `src/app/dashboard/contacts/page.tsx` - Contact directory
- `src/app/dashboard/meetings/page.tsx` - Meeting calendar
- `src/app/dashboard/integrations/page.tsx` - Integration status
- `src/app/dashboard/settings/page.tsx` - User settings

### AI & Intelligence
- `src/lib/ai/buildAssistantContext.ts` - Builds context for Claude
- `src/lib/notifications/slackNotifier.ts` - Slack webhook notifications

### Event System
- `src/lib/events/eventWriter.ts` - Canonical event writer (append-only)
- `src/lib/events/index.ts` - Event type exports and convenience functions

### Context Graph (Read-Only)
- `src/lib/contextGraph/queries.ts` - All read-only context queries
- `src/lib/contextGraph/types.ts` - TimelineEvent, PersonInteraction types

### Intelligence Layers
- `src/lib/postMeeting/extractor.ts` - Deterministic action extraction
- `src/lib/postMeeting/generator.ts` - Post-meeting insights
- `src/lib/preMeeting/generator.ts` - Pre-meeting briefings

### Integrations
- `src/lib/granola/linker.ts` - Links transcripts to meetings/opportunities
- `src/lib/google/calendar.ts` - Google Calendar integration
- `src/lib/google/gmail.ts` - Gmail integration
- `src/lib/google/auth.ts` - Google OAuth handling

---

## Recent Session Progress (2026-02-04)

### Completed - Full UI Build
1. ✅ **Authentication System**
   - Simple password authentication (`ALFRED_PASSWORD` env var)
   - Login page at `/login`
   - Auth provider with session cookies

2. ✅ **Dashboard Layout**
   - Sidebar navigation with 8 pages
   - Light/dark mode toggle
   - Responsive design with Tailwind CSS

3. ✅ **Dashboard Page**
   - Stats cards (pipeline value, meetings, tasks, follow-ups)
   - Insights section from AI analysis
   - Today's agenda
   - Priority tasks
   - Urgent follow-ups
   - Activity feed from events table

4. ✅ **Chat Page**
   - Enhanced with `buildAssistantContext`
   - Pulls context from Context Graph + aggregator
   - Suggested questions
   - Conversation history

5. ✅ **Tasks Page**
   - List/filter tasks by status
   - Create new tasks
   - Mark tasks complete
   - Priority badges

6. ✅ **Follow-ups Page**
   - List/filter follow-ups
   - Create new follow-ups
   - Mark follow-ups complete
   - Urgency indicators

7. ✅ **Contacts Page**
   - Contact directory with search
   - Detail panel for selected contact
   - Avatar colors based on name

8. ✅ **Meetings Page**
   - Calendar view grouped by date
   - Timeline with meeting details
   - Opportunity linking

9. ✅ **Integrations Page**
   - Status of all integrations
   - Connect buttons for OAuth flows

10. ✅ **Settings Page**
    - Theme toggle
    - Notification preferences
    - Account info

11. ✅ **Activity Feed API**
    - New `/api/activity` endpoint
    - `getActivityFeed()` query in Context Graph
    - `getTodaysEvents()` query
    - `getEventStats()` query

12. ✅ **Slack Notifier Module**
    - `src/lib/notifications/slackNotifier.ts`
    - Functions for urgent tasks, follow-ups, meetings, action items
    - Daily briefing and end-of-day summaries

### Build Status
- ✅ `npm run build` passes locally
- ✅ All 35 routes compiled successfully
- ⏳ Vercel deployment pending (after commit)

---

## Testing Alfred

### Quick Test (Dashboard)
Visit: `https://alfred-hub-iota.vercel.app/dashboard`
(Requires `ALFRED_PASSWORD` to be set in Vercel env)

### API Tests
```bash
# Health check
curl https://alfred-hub-iota.vercel.app/api/auth/status

# Chat with Alfred
curl -X POST https://alfred-hub-iota.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What do I have going on today?"}'

# Get activity feed
curl https://alfred-hub-iota.vercel.app/api/activity?limit=20

# Get tasks
curl https://alfred-hub-iota.vercel.app/api/tasks?status=pending

# Get follow-ups
curl https://alfred-hub-iota.vercel.app/api/follow-ups?status=pending
```

---

## To-Do: After Deployment

1. **Set `ALFRED_PASSWORD` in Vercel** - Required for UI access
2. **Create Slack Incoming Webhook** - Set `SLACK_WEBHOOK_URL` in Vercel
3. **Complete Google OAuth** - Test calendar/email integration
4. **Add sample data** - Create some tasks/follow-ups for testing

---

## Notes

- All deployments go through personal Vercel account (reid.essmyer13@gmail.com)
- All code pushed to personal GitHub account (reidessmyer13-sys)
- Do NOT use work/Enterprise accounts
- TypeScript strict mode is enabled - all builds must pass type checking
- Always ask clarifying questions before implementing new features
