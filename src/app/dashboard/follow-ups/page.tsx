'use client';

import { useState, useEffect } from 'react';

interface FollowUp {
  id: string;
  contactName: string;
  contactEmail?: string;
  context: string;
  urgency: 'low' | 'medium' | 'high';
  dueDate: string;
  status: string;
}

const URGENCY_CONFIG = {
  high: { label: 'High', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' },
  medium: { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' },
  low: { label: 'Low', color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20' },
};

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    contactName: '',
    contactEmail: '',
    context: '',
    urgency: 'medium' as FollowUp['urgency'],
    reminderDate: '',
  });

  useEffect(() => {
    fetchFollowUps();
  }, [filter]);

  const fetchFollowUps = async () => {
    try {
      const response = await fetch(`/api/follow-ups?status=${filter}`);
      const data = await response.json();
      setFollowUps(data.followUps || []);
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUp.contactName.trim() || !newFollowUp.context.trim() || !newFollowUp.reminderDate) return;

    try {
      const response = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: newFollowUp.contactName,
          contactEmail: newFollowUp.contactEmail || undefined,
          context: newFollowUp.context,
          urgency: newFollowUp.urgency,
          reminderDate: newFollowUp.reminderDate,
        }),
      });

      if (response.ok) {
        setNewFollowUp({ contactName: '', contactEmail: '', context: '', urgency: 'medium', reminderDate: '' });
        setShowNewForm(false);
        fetchFollowUps();
      }
    } catch (error) {
      console.error('Failed to create follow-up:', error);
    }
  };

  const completeFollowUp = async (id: string) => {
    try {
      await fetch('/api/follow-ups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'complete' }),
      });
      fetchFollowUps();
    } catch (error) {
      console.error('Failed to complete follow-up:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (dateString: string) => new Date(dateString) < new Date();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Follow-ups</h1>
          <p className="text-slate-500 dark:text-slate-400">Track people you need to follow up with</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Follow-up
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* New Follow-up Form */}
      {showNewForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <form onSubmit={createFollowUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={newFollowUp.contactName}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, contactName: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={newFollowUp.contactEmail}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, contactEmail: e.target.value })}
                  placeholder="john@company.com"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Context
              </label>
              <textarea
                value={newFollowUp.context}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, context: e.target.value })}
                placeholder="What do you need to follow up about?"
                rows={2}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Urgency
                </label>
                <select
                  value={newFollowUp.urgency}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, urgency: e.target.value as FollowUp['urgency'] })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reminder Date
                </label>
                <input
                  type="date"
                  value={newFollowUp.reminderDate}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, reminderDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFollowUp.contactName.trim() || !newFollowUp.context.trim() || !newFollowUp.reminderDate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Follow-up
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Follow-ups List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : followUps.length > 0 ? (
        <div className="space-y-3">
          {followUps.map((followUp) => (
            <div
              key={followUp.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-slate-900 dark:text-white">{followUp.contactName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CONFIG[followUp.urgency].color}`}>
                      {URGENCY_CONFIG[followUp.urgency].label}
                    </span>
                    {isOverdue(followUp.dueDate) && followUp.status === 'pending' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-red-600 bg-red-50 dark:bg-red-900/20">
                        Overdue
                      </span>
                    )}
                  </div>
                  {followUp.contactEmail && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{followUp.contactEmail}</p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{followUp.context}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Due: {formatDate(followUp.dueDate)}
                  </p>
                </div>
                {filter === 'pending' && (
                  <button
                    onClick={() => completeFollowUp(followUp.id)}
                    className="px-3 py-1.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No follow-ups found</h3>
          <p className="text-slate-500 dark:text-slate-400">
            {filter === 'completed' ? 'No completed follow-ups yet' : 'Create a new follow-up to get started'}
          </p>
        </div>
      )}
    </div>
  );
}
