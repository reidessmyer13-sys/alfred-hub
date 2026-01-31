export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Alfred Hub</h1>
        <p className="text-gray-400 mb-8">
          Your AI executive assistant is always listening.
        </p>

        <div className="space-y-6">
          <section className="border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">Communication Channels</h2>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Slack DM - Active
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                WhatsApp - Pending Setup
              </li>
            </ul>
          </section>

          <section className="border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">Automated Reminders</h2>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>☀️ Morning Briefing - 7:30 AM MT (Mon-Fri)</li>
              <li>🔔 Reminder Check - Every hour</li>
              <li>🌙 End of Day Summary - 5:00 PM MT (Mon-Fri)</li>
            </ul>
          </section>

          <section className="border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">Connected Sources</h2>
            <ul className="space-y-2 text-gray-300">
              <li>✅ Alfred Memory (Supabase)</li>
              <li>🔄 Salesforce (via MCP)</li>
              <li>🔄 Gmail (via MCP)</li>
              <li>🔄 Google Calendar (via MCP)</li>
              <li>🔄 Granola (via MCP)</li>
            </ul>
          </section>

          <section className="border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">API Endpoints</h2>
            <ul className="space-y-2 text-gray-400 text-sm font-mono">
              <li>POST /api/whatsapp - Twilio webhook</li>
              <li>POST /api/slack/events - Slack events</li>
              <li>GET /api/cron/morning-briefing</li>
              <li>GET /api/cron/check-reminders</li>
              <li>GET /api/cron/end-of-day</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
