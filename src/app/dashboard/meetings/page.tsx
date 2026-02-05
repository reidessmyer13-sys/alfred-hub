'use client';

import { useState, useEffect } from 'react';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  attendees: string[];
  location?: string;
  description?: string;
  prepReady?: boolean;
  opportunity?: {
    name: string;
    accountName: string;
    amount?: number;
  };
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'today' | 'week'>('week');

  useEffect(() => {
    fetchMeetings();
  }, [view]);

  const fetchMeetings = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const isToday = (startTime: string) => {
    const date = new Date(startTime);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Group meetings by date
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const dateKey = new Date(meeting.startTime).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  const sortedDates = Object.keys(groupedMeetings).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meetings</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} this week
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        {(['today', 'week'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {v === 'today' ? 'Today' : 'This Week'}
          </button>
        ))}
      </div>

      {/* Meetings List */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3 animate-pulse" />
              <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : sortedDates.length > 0 ? (
        <div className="space-y-8">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                {isToday(groupedMeetings[dateKey][0].startTime) && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs normal-case">
                    Today
                  </span>
                )}
                {formatDate(groupedMeetings[dateKey][0].startTime)}
              </h2>
              <div className="space-y-3">
                {groupedMeetings[dateKey].map((meeting) => (
                  <div
                    key={meeting.id}
                    className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 transition-colors ${
                      isUpcoming(meeting.startTime)
                        ? 'hover:border-blue-300 dark:hover:border-blue-700'
                        : 'opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Time Column */}
                      <div className="w-20 shrink-0 text-right">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatTime(meeting.startTime)}
                        </div>
                        {meeting.endTime && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {getDuration(meeting.startTime, meeting.endTime)}
                          </div>
                        )}
                      </div>

                      {/* Timeline Dot */}
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${isUpcoming(meeting.startTime) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <div className="absolute top-3 left-1.5 w-px h-full bg-slate-200 dark:bg-slate-700 -translate-x-1/2" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-slate-900 dark:text-white">
                              {meeting.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {meeting.attendees?.length || 0}
                              </span>
                              {meeting.location && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {meeting.location}
                                </span>
                              )}
                            </div>
                          </div>

                          {meeting.opportunity && (
                            <div className="text-right shrink-0">
                              <span className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded">
                                {meeting.opportunity.accountName}
                              </span>
                              {meeting.opportunity.amount && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  ${meeting.opportunity.amount.toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {meeting.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                            {meeting.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No meetings found</h3>
          <p className="text-slate-500 dark:text-slate-400">
            {view === 'today' ? 'No meetings scheduled for today' : 'No meetings scheduled this week'}
          </p>
        </div>
      )}
    </div>
  );
}
