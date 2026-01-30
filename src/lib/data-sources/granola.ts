// Granola meeting notes integration
// Pulls meeting transcripts, notes, and action items

import { UnifiedMeeting, UnifiedTask } from './types';

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
  const actionPanel = panels.find((p) => p.type === 'action_items');
  if (!actionPanel) return [];

  // Parse action items from content (typically bullet points)
  const items = actionPanel.content
    .split('\n')
    .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map((line, index) => ({
      id: `granola_action_${actionPanel.documentId}_${index}`,
      title: line.replace(/^[-•]\s*/, '').trim(),
      priority: 'medium' as const,
      status: 'pending' as const,
      source: 'granola' as const,
      sourceId: actionPanel.documentId,
    }));

  return items;
}

// Search Granola notes for context about a contact/company
export async function searchNotes(query: string, limit: number = 5): Promise<GranolaDocument[]> {
  console.log(`[Granola] Searching notes: ${query} (limit ${limit})`);
  // This would call the Granola MCP
  return [];
}

// Get recent meeting notes
export async function getRecentMeetingNotes(daysBack: number = 7): Promise<GranolaDocument[]> {
  console.log(`[Granola] Fetching meeting notes from last ${daysBack} days`);
  return [];
}

// Get meeting notes for a specific date
export async function getMeetingNotesForDate(date: Date): Promise<GranolaDocument[]> {
  console.log(`[Granola] Fetching notes for ${date.toDateString()}`);
  return [];
}

// Get transcript for a document
export async function getTranscript(documentId: string): Promise<GranolaTranscript | null> {
  console.log(`[Granola] Fetching transcript for ${documentId}`);
  return null;
}

// Get all panels (action items, summary, etc.) for a document
export async function getDocumentPanels(documentId: string): Promise<GranolaPanel[]> {
  console.log(`[Granola] Fetching panels for ${documentId}`);
  return [];
}

// Find notes mentioning a specific person
export async function getNotesForPerson(personName: string): Promise<GranolaDocument[]> {
  console.log(`[Granola] Searching notes mentioning ${personName}`);
  return [];
}

// Get action items from recent meetings
export async function getRecentActionItems(daysBack: number = 7): Promise<UnifiedTask[]> {
  const notes = await getRecentMeetingNotes(daysBack);
  const allActionItems: UnifiedTask[] = [];

  for (const note of notes) {
    const panels = await getDocumentPanels(note.id);
    const actionItems = extractActionItems(panels);
    allActionItems.push(...actionItems);
  }

  return allActionItems;
}
