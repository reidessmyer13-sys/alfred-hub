'use client';

import { useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState({
    morningBriefing: true,
    meetingReminders: true,
    followUpAlerts: true,
    endOfDaySummary: true,
    slackNotifications: true,
  });

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Customize your Alfred experience
        </p>
      </div>

      {/* Appearance */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Appearance</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Theme</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Choose your preferred color scheme
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light
                </span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notifications</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {[
            { key: 'morningBriefing', label: 'Morning Briefing', description: 'Daily summary at 7:30 AM MT' },
            { key: 'meetingReminders', label: 'Meeting Reminders', description: '10 minutes before each meeting' },
            { key: 'followUpAlerts', label: 'Follow-up Alerts', description: 'When follow-ups are due or overdue' },
            { key: 'endOfDaySummary', label: 'End of Day Summary', description: 'Daily wrap-up at 5:00 PM MT' },
            { key: 'slackNotifications', label: 'Slack Notifications', description: 'Send notifications to Slack DM' },
          ].map((item) => (
            <div key={item.key} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">{item.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[item.key as keyof typeof notifications]}
                  onChange={() => handleNotificationChange(item.key as keyof typeof notifications)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Account */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Reid Essmyer</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Enterprise Account Executive at Vercel</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">About</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Alfred</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">AI Executive Assistant</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Alfred is your personal AI assistant that helps you stay on top of meetings, tasks,
            follow-ups, and relationships. Powered by Claude and connected to your calendar,
            email, CRM, and meeting transcripts.
          </p>
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>Version: 0.1.0</p>
            <p>Deployed on Vercel</p>
            <p>Data stored in Supabase</p>
          </div>
        </div>
      </section>
    </div>
  );
}
