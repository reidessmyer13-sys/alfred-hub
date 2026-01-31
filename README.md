# Alfred Hub

An always-on AI assistant that integrates Salesforce, Slack, Gmail, Google Calendar, and Granola meeting notes to provide proactive briefings and intelligent task management.

## Features

- **Morning Briefing**: Daily summary of calendar, emails needing response, stalled deals
- **End-of-Day Recap**: Review what was accomplished, what needs follow-up
- **Cross-Platform Intelligence**: Combines data from multiple sources for context-aware assistance
- **Multiple Channels**: Responds via Slack DM or WhatsApp

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Alfred Hub                           │
├─────────────────────────────────────────────────────────────┤
│  Data Sources          │  Channels        │  Storage        │
│  ─────────────         │  ────────        │  ───────        │
│  • Gmail API           │  • Slack Bot     │  • Supabase     │
│  • Google Calendar     │  • WhatsApp      │    (tokens,     │
│  • Salesforce          │    (Twilio)      │     memory)     │
│  • Granola (local)     │                  │                 │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

### Required for Core Functionality

```bash
# Supabase (Database & Auth Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-...

# Cron Job Authentication
CRON_SECRET=your-random-secret-for-cron-jobs
```

### Google Integration (Gmail & Calendar)

```bash
# OAuth 2.0 Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
```

### Salesforce Integration (Optional)

```bash
# Connected App Credentials
SALESFORCE_CLIENT_ID=your-connected-app-consumer-key
SALESFORCE_CLIENT_SECRET=your-connected-app-consumer-secret

# User Credentials for API Access
SALESFORCE_USERNAME=your-salesforce-username
SALESFORCE_PASSWORD=your-salesforce-password
SALESFORCE_SECURITY_TOKEN=your-security-token

# Optional: Use sandbox instead of production
SALESFORCE_LOGIN_URL=https://test.salesforce.com
```

### Slack Integration (Optional)

```bash
# Slack App Credentials (from api.slack.com)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=your-signing-secret
USER_SLACK_ID=U0XXXXXXX  # Your Slack user ID
```

### WhatsApp/Twilio Integration (Optional)

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
USER_WHATSAPP_NUMBER=whatsapp:+1XXXXXXXXXX
```

### Granola Integration (Optional)

```bash
# Local Granola API (usually running on localhost)
GRANOLA_API_URL=http://localhost:3131
```

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/alfred-hub.git
cd alfred-hub
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the SQL migrations in `supabase/migrations/`
3. Copy your project URL and service role key

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API and Google Calendar API
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized redirect URI: `https://your-app.vercel.app/api/auth/google/callback`
6. Copy Client ID and Client Secret

### 4. Salesforce Setup (Optional)

1. Create a Connected App in Salesforce Setup
2. Enable OAuth and add required scopes: `api`, `refresh_token`, `offline_access`
3. Get your security token (Setup > Reset My Security Token)

### 5. Slack App Setup (Optional)

1. Create a new app at [api.slack.com](https://api.slack.com/apps)
2. Add Bot Token Scopes: `chat:write`, `im:read`, `im:write`, `im:history`
3. Install to workspace
4. Copy Bot Token and Signing Secret

### 6. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all environment variables in Vercel Dashboard > Settings > Environment Variables.

### 7. Configure Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/morning-briefing",
      "schedule": "0 8 * * 1-5"
    },
    {
      "path": "/api/cron/end-of-day",
      "schedule": "0 17 * * 1-5"
    },
    {
      "path": "/api/cron/check-reminders",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/google` | GET | Start Google OAuth flow |
| `/api/auth/google/callback` | GET | OAuth callback handler |
| `/api/auth/status` | GET | Check integration statuses |
| `/api/slack/events` | POST | Slack event webhook |
| `/api/whatsapp` | POST | Twilio WhatsApp webhook |
| `/api/cron/morning-briefing` | GET | Trigger morning briefing |
| `/api/cron/end-of-day` | GET | Trigger EOD recap |
| `/api/cron/check-reminders` | GET | Process pending reminders |

## Development

```bash
# Run locally
npm run dev

# Type check
npm run lint

# Build for production
npm run build
```

## Graceful Degradation

Alfred Hub is designed to work with partial integrations. Each data source checks if it's configured before attempting to fetch data:

- **No Salesforce?** Briefings skip opportunity data
- **No Granola?** Meeting notes are excluded
- **No Slack?** Use WhatsApp or API directly

## License

MIT
