'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    pipelineValue: number;
    meetingsThisWeek: number;
    openTasks: number;
    followUpsDueToday: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: string;
  }>;
  followUps: Array<{
    id: string;
    contactName: string;
    context: string;
    urgency: string;
    dueDate: string;
  }>;
  meetings: Array<{
    id: string;
    title: string;
    startTime: string;
    attendees: string[];
  }>;
  insights: string[];
}

interface ActivityEvent {
  id: string;
  type: string;
  source: string;
  occurred_at: string;
  summary: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getEventIcon(type: string): string {
  switch (type) {
    case 'CalendarEventFetched': return '📅';
    case 'EmailThreadFetched': return '📧';
    case 'EmailSent': return '📤';
    case 'TaskCreated': return '✅';
    case 'FollowUpCreated': return '🔔';
    case 'ReminderTriggered': return '⏰';
    case 'GranolaTranscriptFetched': return '🎙️';
    default: return '📌';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    default: return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20';
  }
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'high': return 'text-red-600 dark:text-red-400';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    default: return 'text-slate-600 dark:text-slate-400';
  }
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, activityRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/activity?limit=20'),
      ]);

      if (!dashboardRes.ok) throw new Error('Failed to fetch dashboard data');

      const dashboard = await dashboardRes.json();
      const activity = await activityRes.json();

      setDashboardData(dashboard);
      setActivityFeed(activity.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-8" />
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h2 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || { pipelineValue: 0, meetingsThisWeek: 0, openTasks: 0, followUpsDueToday: 0 };
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Reid
        </h1>
        <p className="text-slate-500 dark:text-slate-400">{today}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 card-hover">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pipeline Value</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(stats.pipelineValue)}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Total active opportunities</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 card-hover">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Meetings This Week</span>
            <span className="text-2xl">📅</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {stats.meetingsThisWeek}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Scheduled meetings</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 card-hover">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Open Tasks</span>
            <span className="text-2xl">✅</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {stats.openTasks}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pending completion</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 card-hover">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Follow-ups Today</span>
            <span className="text-2xl">🔔</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {stats.followUpsDueToday}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Due for action</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Agenda & Tasks */}
        <div className="lg:col-span-2 space-y-8">
          {/* Insights */}
          {dashboardData?.insights && dashboardData.insights.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>💡</span> Insights
              </h2>
              <ul className="space-y-3">
                {dashboardData.insights.slice(0, 4).map((insight, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-blue-500 mt-0.5">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Today's Agenda */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📅</span> Today&apos;s Agenda
              </h2>
              <Link href="/dashboard/meetings" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dashboardData?.meetings && dashboardData.meetings.length > 0 ? (
                dashboardData.meetings.slice(0, 5).map((meeting) => (
                  <div key={meeting.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">{meeting.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {formatTime(meeting.startTime)} • {meeting.attendees?.length || 0} attendees
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                        {formatTime(meeting.startTime)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No meetings scheduled for today
                </div>
              )}
            </div>
          </div>

          {/* Priority Tasks */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>✅</span> Priority Tasks
              </h2>
              <Link href="/dashboard/tasks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dashboardData?.tasks && dashboardData.tasks.length > 0 ? (
                dashboardData.tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                          onChange={() => {}}
                        />
                        <span className="text-slate-900 dark:text-white">{task.title}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No pending tasks
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed & Follow-ups */}
        <div className="space-y-8">
          {/* Urgent Follow-ups */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔔</span> Follow-ups
              </h2>
              <Link href="/dashboard/follow-ups" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dashboardData?.followUps && dashboardData.followUps.length > 0 ? (
                dashboardData.followUps.slice(0, 4).map((followUp) => (
                  <div key={followUp.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-medium ${getUrgencyColor(followUp.urgency)}`}>
                          {followUp.contactName}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {followUp.context}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No pending follow-ups
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📊</span> Recent Activity
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
              {activityFeed.length > 0 ? (
                activityFeed.map((event) => (
                  <div key={event.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getEventIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-white truncate">
                          {event.summary}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {formatRelativeTime(event.occurred_at)} • {event.source.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
