// Granola meeting notes integration
// Pulls meeting transcripts, notes, and action items

import { UnifiedTask } from './types';
import * as GranolaClient from '../granola/client';

export interface GranolaDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  meetingDate?: string;
  attendees?: string[];
}

export interface GranolaTranscript {
  id: string;
  documentId: string;
  content: string;
  speakers: { name: string; segments: { text: string; startTime: number }[] }[];
}

export interface GranolaPanel {
  id: string;
  documentId: string;
  type: string; // 'action_items', 'summary', 'decisions', etc.
  content: string;
}

// Extract action items from Granola panels
export function extractActionItems(panels: GranolaPanel[]): UnifiedTask[] {
  const actionPanel = panels.find((p) => p.type === 'action_items' || p.type === 'action-items');
  if (!actionPanel) return [];

  // Parse action items from content (typically bullet points)
  const items = actionPanel.content
    .split('\n')
    .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./))
    .map((line, index) => ({
      id: `granola_action_${actionPanel.documentId}_${index}`,
      title: line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim(),
      priority: 'medium' as const,
      status: 'pending' as const,
      source: 'granola' as const,
      sourceId: actionPanel.documentId,
    }));

  return items;
}

// Search Granola notes for context about a contact/company
export async function searchNotes(query: string, limit: number = 5): Promise<GranolaDocument[]> {
  const isAvailable = await GranolaClient.isAvailable();
  if (!isAvailable) {
    console.log('[Granola] Service not available, skipping searchNotes');
    return [];
  }

  console.log(`[Granola] Searching notes: ${query} (limit ${limit})`);
  return GranolaClient.searchNotes(query, limit);
}

// Get recent meeting notes
export async function getRecentMeetingNotes(daysBack: number = 7): Promise<GranolaDocument[]> {
  const isAvailable = await GranolaClient.isAvailable();
  if (!isAvailable) {
    console.log('[Granola] Service not available, skipping getRecentMeetingNotes');
    return [];
  }

  console.log(`[Granola] Fetching meeting notes from last ${daysBack} days`);

  // Get all documents and filter by date
  const allDocs = await GranolaClient.listDocuments(100);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  return allDocs.filter((doc) => {
    const docDate = new Date(doc.createdAt || doc.updatedAt);
    return docDate >= cutoffDate;
  });
}

// Get meeting notes for a specific date
export async function getMeetingNotesForDate(date: Date): Promise<GranolaDocument[]> {
  const isAvailable = await GranolaClient.isAvailable();
  if (!isAvailable) {
    console.log('[Granola] Service not available, skipping getMeetingNotesForDate');
    return [];
  }

  console.log(`[Granola] Fetching notes for ${date.toDateString()}`);

  const allDocs = await GranolaClient.listDocuments(100);
  const targetDate = date.toDateString();

  return allDocs.filter((doc) => {
    const docDate = new Date(doc.meetingDate || doc.createdAt);
    return docDate.toDateString() === targetDate;
  });
}

// Get transcript for a document
export async function getTranscript(documentId: string): Promise<GranolaTranscript | null> {
  const isAvailable = await GranolaClient.isAvailable();
  if (!isAvailable) {
    console.log('[Granola] Service not available, skipping getTranscript');
    return null;
  }

  console.log(`[Granola] Fetching transcript for ${documentId}`);
  const transcript = await GranolaClient.getTranscript(documentId);

  if (!transcript) return null;

  return {
    id: transcript.id,
    documentId: transcript.documentId || documentId,
    content: transcript.content,
    speakers: [],
  };
}

// Get all panels (action items, summary, etc.) for a document
export async function getDocumentPanels(documentId: string): Promise<GranolaPanel[]> {
  const isAvailable = await GranolaClient.isAvailable();
  if (!isAvailable) {
    console.log('[Granola] Service not available, skipping getDocumentPanels');
    return [];
  }

  console.log(`[Granola] Fetching panels for ${documentId}`);

  // Search for panels related to this document
  const panels = await GranolaClient.searchPanels(documentId, 10);

  return panels.map((p) => ({
    id: p.id,
    documentId: p.documentId || documentId,
    type: p.type,
    content: p.content,
  }));
}

// Find notes mentioning a specific person
export async function getNotesForPerson(personName: string): Promise<GranolaDocument[]> {
  const isAvailable = await GranolaClient.isAvailable();
  if (!isAvailable) {
    console.log('[Granola] Service not available, skipping getNotesForPerson');
    return [];
  }

  console.log(`[Granola] Searching notes mentioning ${personName}`);
  return GranolaClient.searchNotes(personName, 10);
}

// Get action items from recent meetings
export async function getRecentActionItems(daysBack: number = 7): Promise<UnifiedTask[]> {
  const isAvailable = await GranolaClient.isAvailable();
  if (!isAvailable) {
    console.log('[Granola] Service not available, skipping getRecentActionItems');
    return [];
  }

  // Search for action items directly
  const actionPanels = await GranolaClient.searchPanels('action items', 20);
  const allActionItems: UnifiedTask[] = [];

  for (const panel of actionPanels) {
    const items = extractActionItems([{
      id: panel.id,
      documentId: panel.documentId,
      type: 'action_items',
      content: panel.content,
    }]);
    allActionItems.push(...items);
  }

  return allActionItems;
}

// Get document content by ID
export async function getDocument(documentId: string): Promise<GranolaDocument | null> {
  const isAvailable = await GranolaClient.isAvailable();
  if (!isAvailable) {
    console.log('[Granola] Service not available, skipping getDocument');
    return null;
  }

  return GranolaClient.getDocument(documentId);
}
