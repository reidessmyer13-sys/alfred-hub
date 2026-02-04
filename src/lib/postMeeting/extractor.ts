// Post-Meeting Action Extractor
// READ-ONLY - deterministic extraction of explicit actions
// No inference, no scoring, no guessing

import type { ExtractedAction } from './types';

/**
 * Patterns for detecting explicit action items
 * These match clear, stated commitments - not inferred intent
 */
const ACTION_ITEM_PATTERNS = [
  // Explicit action item markers
  /action item[s]?[:\s]+(.+)/i,
  /to[- ]?do[:\s]+(.+)/i,
  /task[:\s]+(.+)/i,
  /next step[s]?[:\s]+(.+)/i,
];

/**
 * Patterns for detecting commitments
 * Matches "I'll...", "We'll...", "I will...", etc.
 */
const COMMITMENT_PATTERNS = [
  // First person commitments
  /\b(i['']ll|i will|i['']m going to)\s+(.+?)(?:\.|$)/i,
  /\b(we['']ll|we will|we['']re going to)\s+(.+?)(?:\.|$)/i,
  // Direct promises
  /\b(let me|allow me to)\s+(.+?)(?:\.|$)/i,
  /\b(i can|i could)\s+(send|share|provide|schedule|set up|arrange|follow up|reach out|check|review|update|prepare|draft|create)(.+?)(?:\.|$)/i,
];

/**
 * Patterns for time-bound actions
 * Matches explicit time references with actions
 */
const TIME_BOUND_PATTERNS = [
  // By specific time
  /\b(by|before)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|end of (?:day|week|month)|eod|eow|eom)\b[,\s]*(.+?)(?:\.|$)/i,
  // On specific time
  /\b(on|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[,\s]*(.+?)(?:\.|$)/i,
  // Within timeframe
  /\b(within|in)\s+(\d+)\s+(day|days|week|weeks|hour|hours)\b[,\s]*(.+?)(?:\.|$)/i,
  // Specific date patterns
  /\b(by|before|on)\s+(\d{1,2}[\/\-]\d{1,2}|\w+\s+\d{1,2}(?:st|nd|rd|th)?)\b[,\s]*(.+?)(?:\.|$)/i,
];

/**
 * Patterns for explicit follow-up mentions
 */
const FOLLOW_UP_PATTERNS = [
  /\bfollow[- ]?up\s+(?:with\s+)?(.+?)(?:\.|$)/i,
  /\breach out to\s+(.+?)(?:\.|$)/i,
  /\bget back to\s+(.+?)(?:\.|$)/i,
  /\btouch base with\s+(.+?)(?:\.|$)/i,
  /\bcheck in with\s+(.+?)(?:\.|$)/i,
  /\bschedule\s+(?:a\s+)?(?:call|meeting|sync)\s+(?:with\s+)?(.+?)(?:\.|$)/i,
];

/**
 * Extract person names/emails from action text
 */
function extractPersonReferences(text: string, attendees: string[]): string[] {
  const found: string[] = [];

  // Check if any attendee is mentioned
  for (const attendee of attendees) {
    const name = attendee.split('@')[0].replace(/[._]/g, ' ');
    if (text.toLowerCase().includes(name.toLowerCase())) {
      found.push(attendee);
    }
    if (text.toLowerCase().includes(attendee.toLowerCase())) {
      found.push(attendee);
    }
  }

  return [...new Set(found)];
}

/**
 * Extract speaker from a line if present
 * Handles formats like "John: ...", "[John] ...", "John said..."
 */
function extractSpeaker(line: string): string | undefined {
  // "Name: text" format
  const colonMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:\s*/);
  if (colonMatch) return colonMatch[1];

  // "[Name] text" format
  const bracketMatch = line.match(/^\[([^\]]+)\]\s*/);
  if (bracketMatch) return bracketMatch[1];

  return undefined;
}

/**
 * Extract actions from a single line of text
 */
function extractFromLine(
  line: string,
  attendees: string[],
  lineContext: string
): ExtractedAction[] {
  const actions: ExtractedAction[] = [];
  const speaker = extractSpeaker(line);

  // Check action item patterns
  for (const pattern of ACTION_ITEM_PATTERNS) {
    const match = line.match(pattern);
    if (match && match[1]) {
      actions.push({
        text: match[1].trim(),
        mentioned_by: speaker,
        related_person_ids: extractPersonReferences(match[1], attendees),
        match_type: 'action_item',
        source_context: lineContext,
      });
    }
  }

  // Check commitment patterns
  for (const pattern of COMMITMENT_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      const actionText = match.slice(1).filter(Boolean).join(' ').trim();
      if (actionText.length > 5) {
        actions.push({
          text: actionText,
          mentioned_by: speaker,
          related_person_ids: extractPersonReferences(actionText, attendees),
          match_type: 'commitment',
          source_context: lineContext,
        });
      }
    }
  }

  // Check time-bound patterns
  for (const pattern of TIME_BOUND_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      const timeRef = match[2];
      const actionText = match.slice(3).filter(Boolean).join(' ').trim() || match[0];
      if (actionText.length > 3) {
        actions.push({
          text: actionText,
          mentioned_by: speaker,
          mentioned_time: timeRef,
          related_person_ids: extractPersonReferences(actionText, attendees),
          match_type: 'time_bound',
          source_context: lineContext,
        });
      }
    }
  }

  // Check follow-up patterns
  for (const pattern of FOLLOW_UP_PATTERNS) {
    const match = line.match(pattern);
    if (match && match[1]) {
      actions.push({
        text: `Follow up ${match[1].trim()}`,
        mentioned_by: speaker,
        related_person_ids: extractPersonReferences(match[1], attendees),
        match_type: 'follow_up',
        source_context: lineContext,
      });
    }
  }

  return actions;
}

/**
 * Extract actions from pre-parsed action items list
 * (Granola often provides these explicitly)
 */
function extractFromActionItemsList(
  actionItems: string[],
  attendees: string[]
): ExtractedAction[] {
  return actionItems.map((item) => ({
    text: item.replace(/^[-•*]\s*/, '').trim(),
    related_person_ids: extractPersonReferences(item, attendees),
    match_type: 'action_item' as const,
    source_context: 'Granola action_items field',
  }));
}

/**
 * Main extraction function
 * Deterministically extracts explicit actions from transcript content
 *
 * @param content - Full transcript content
 * @param actionItems - Pre-parsed action items from Granola (if available)
 * @param attendees - List of attendee emails
 */
export function extractActionsFromTranscript(
  content: string,
  actionItems: string[] = [],
  attendees: string[] = []
): ExtractedAction[] {
  const allActions: ExtractedAction[] = [];
  const seenTexts = new Set<string>();

  // First, include explicitly parsed action items from Granola
  if (actionItems.length > 0) {
    const granolaActions = extractFromActionItemsList(actionItems, attendees);
    for (const action of granolaActions) {
      const key = action.text.toLowerCase();
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        allActions.push(action);
      }
    }
  }

  // Then, scan the transcript content line by line
  const lines = content.split(/[\n\r]+/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 10) continue;

    // Provide context (surrounding lines)
    const contextStart = Math.max(0, i - 1);
    const contextEnd = Math.min(lines.length, i + 2);
    const lineContext = lines.slice(contextStart, contextEnd).join(' ').substring(0, 200);

    const lineActions = extractFromLine(line, attendees, lineContext);

    for (const action of lineActions) {
      const key = action.text.toLowerCase();
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        allActions.push(action);
      }
    }
  }

  return allActions;
}

/**
 * Compute extraction statistics
 */
export function computeExtractionStats(actions: ExtractedAction[]): {
  total_actions: number;
  action_items: number;
  commitments: number;
  time_bound: number;
  follow_ups: number;
} {
  return {
    total_actions: actions.length,
    action_items: actions.filter((a) => a.match_type === 'action_item').length,
    commitments: actions.filter((a) => a.match_type === 'commitment').length,
    time_bound: actions.filter((a) => a.match_type === 'time_bound').length,
    follow_ups: actions.filter((a) => a.match_type === 'follow_up').length,
  };
}
