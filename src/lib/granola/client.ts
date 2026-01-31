// Granola API Client
// Connects to Granola's local database for meeting notes

// Granola stores data locally - we access it via their API
const GRANOLA_API_BASE = process.env.GRANOLA_API_URL || 'http://localhost:3131';

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
}

export interface GranolaPanel {
  id: string;
  documentId: string;
  type: string;
  content: string;
}

export interface GranolaEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
}

// Check if Granola is accessible
export async function isAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${GRANOLA_API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Search documents/notes
export async function searchNotes(query: string, limit: number = 10): Promise<GranolaDocument[]> {
  try {
    const response = await fetch(`${GRANOLA_API_BASE}/api/search/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      console.error('[Granola] Search failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[Granola] Search error:', error);
    return [];
  }
}

// Search transcripts
export async function searchTranscripts(query: string, limit: number = 10): Promise<GranolaTranscript[]> {
  try {
    const response = await fetch(`${GRANOLA_API_BASE}/api/search/transcripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      console.error('[Granola] Transcript search failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[Granola] Transcript search error:', error);
    return [];
  }
}

// List documents
export async function listDocuments(limit: number = 50): Promise<GranolaDocument[]> {
  try {
    const response = await fetch(`${GRANOLA_API_BASE}/api/documents?limit=${limit}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('[Granola] List documents failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.error('[Granola] List documents error:', error);
    return [];
  }
}

// Get document by ID
export async function getDocument(id: string): Promise<GranolaDocument | null> {
  try {
    const response = await fetch(`${GRANOLA_API_BASE}/api/documents/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('[Granola] Get document failed:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[Granola] Get document error:', error);
    return null;
  }
}

// Get transcript by ID
export async function getTranscript(id: string): Promise<GranolaTranscript | null> {
  try {
    const response = await fetch(`${GRANOLA_API_BASE}/api/transcripts/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('[Granola] Get transcript failed:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[Granola] Get transcript error:', error);
    return null;
  }
}

// Search panels (structured sections like action items, summaries)
export async function searchPanels(query: string, limit: number = 10): Promise<GranolaPanel[]> {
  try {
    const response = await fetch(`${GRANOLA_API_BASE}/api/search/panels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      console.error('[Granola] Panel search failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[Granola] Panel search error:', error);
    return [];
  }
}

// Search calendar events
export async function searchEvents(query: string, limit: number = 10): Promise<GranolaEvent[]> {
  try {
    const response = await fetch(`${GRANOLA_API_BASE}/api/search/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      console.error('[Granola] Event search failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[Granola] Event search error:', error);
    return [];
  }
}
