'use client';

import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  last_interaction?: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.company?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contacts</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} in your network
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Contacts List */}
        <div className="flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${getAvatarColor(contact.name)} flex items-center justify-center text-white font-medium`}>
                      {getInitials(contact.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">
                        {contact.name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {contact.role ? `${contact.role}${contact.company ? ` at ${contact.company}` : ''}` : contact.company || contact.email || 'No details'}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-400 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No contacts found</h3>
              <p className="text-slate-500 dark:text-slate-400">
                {search ? 'Try a different search term' : 'Contacts will appear here from your interactions'}
              </p>
            </div>
          )}
        </div>

        {/* Contact Detail Panel */}
        {selectedContact && (
          <div className="w-80 shrink-0">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className={`w-20 h-20 rounded-full ${getAvatarColor(selectedContact.name)} flex items-center justify-center text-white text-2xl font-medium mx-auto mb-4`}>
                  {getInitials(selectedContact.name)}
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {selectedContact.name}
                </h2>
                {selectedContact.role && (
                  <p className="text-slate-500 dark:text-slate-400">{selectedContact.role}</p>
                )}
                {selectedContact.company && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedContact.company}</p>
                )}
              </div>

              <div className="space-y-4">
                {selectedContact.email && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Email
                    </label>
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="block text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
                    >
                      {selectedContact.email}
                    </a>
                  </div>
                )}

                {selectedContact.phone && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Phone
                    </label>
                    <a
                      href={`tel:${selectedContact.phone}`}
                      className="block text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
                    >
                      {selectedContact.phone}
                    </a>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Last Interaction
                  </label>
                  <p className="text-sm text-slate-900 dark:text-white mt-1">
                    {formatDate(selectedContact.last_interaction)}
                  </p>
                </div>

                {selectedContact.notes && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Notes
                    </label>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {selectedContact.notes}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedContact(null)}
                className="w-full mt-6 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
