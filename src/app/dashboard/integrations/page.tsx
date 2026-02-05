'use client';

import { useState, useEffect } from 'react';

interface IntegrationStatus {
  name: string;
  id: string;
  connected: boolean;
  description: string;
  icon: string;
  setupUrl?: string;
}

const INTEGRATIONS: IntegrationStatus[] = [
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Connect Google Calendar and Gmail for meeting and email tracking',
    icon: '📧',
    connected: false,
    setupUrl: '/api/auth/google',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync opportunities, accounts, and contacts from your CRM',
    icon: '☁️',
    connected: false,
  },
  {
    id: 'granola',
    name: 'Granola',
    description: 'Automatic meeting transcripts and note extraction',
    icon: '🎙️',
    connected: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Receive notifications and interact with Alfred via Slack',
    icon: '💬',
    connected: false,
  },
  {
    id: 'supabase',
    name: 'Alfred Memory',
    description: 'Core data storage for tasks, follow-ups, and memory',
    icon: '🧠',
    connected: false,
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>(INTEGRATIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkIntegrationStatus();
  }, []);

  const checkIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();

      setIntegrations((prev) =>
        prev.map((integration) => ({
          ...integration,
          connected:
            integration.id === 'supabase'
              ? data.supabase?.connected || false
              : integration.id === 'google'
              ? data.google?.connected || false
              : integration.id === 'salesforce'
              ? data.salesforce?.connected || false
              : integration.id === 'granola'
              ? data.granola?.connected || false
              : integration.id === 'slack'
              ? data.slack?.connected || false
              : false,
        }))
      );
    } catch (error) {
      console.error('Failed to check integration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (integration: IntegrationStatus) => {
    if (integration.setupUrl) {
      window.location.href = integration.setupUrl;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Integrations</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Connect your tools to give Alfred more context
        </p>
      </div>

      {/* Integration Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl">
                    {integration.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {integration.name}
                      </h3>
                      {integration.connected ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">
                          Connected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
                          Not connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {integration.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                {integration.connected ? (
                  <button
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    Configure
                  </button>
                ) : integration.setupUrl ? (
                  <button
                    onClick={() => handleConnect(integration)}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Connect
                  </button>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-500">
                    Contact admin to set up
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <h2 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Need help connecting an integration?
        </h2>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Some integrations require API keys or OAuth setup. Check the documentation or contact
          support for assistance with configuration.
        </p>
      </div>
    </div>
  );
}
