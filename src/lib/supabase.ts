import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { emitTaskCreated, emitFollowUpCreated } from './events';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// Create client lazily to avoid build errors
let _supabase: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured');
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
};

// For backwards compatibility
export const supabase = {
  from: (table: string) => getSupabase().from(table),
};

// Types for Alfred Memory
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  completed_at?: string;
  source?: string;
  notes?: string;
}

export interface FollowUp {
  id: string;
  contact_name: string;
  contact_email?: string;
  context: string;
  urgency: 'low' | 'medium' | 'high';
  trigger_type: 'date' | 'before_meeting' | 'manual';
  reminder_date: string;
  status: 'pending' | 'completed' | 'snoozed';
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  salesforce_id?: string;
  notes?: string;
  last_interaction?: string;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_datetime: string;
  attendees: string[];
  prep_notes?: string;
  action_items?: string[];
  calendar_id?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export interface MemoryLog {
  id: string;
  category: 'conversation' | 'preference' | 'context' | 'decision' | 'other';
  content: string;
  tags?: string[];
  source?: string;
  created_at: string;
}

// Helper functions
export async function getTasks(status?: string) {
  let query = supabase.from('tasks').select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data as Task[];
}

export async function getFollowUps(status?: string) {
  let query = supabase.from('follow_ups').select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('reminder_date', { ascending: true });
  if (error) throw error;
  return data as FollowUp[];
}

export async function getContacts() {
  const { data, error } = await supabase.from('contacts').select('*');
  if (error) throw error;
  return data as Contact[];
}

export async function getUpcomingMeetings(daysAhead: number = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .gte('meeting_datetime', now.toISOString())
    .lte('meeting_datetime', future.toISOString())
    .order('meeting_datetime', { ascending: true });

  if (error) throw error;
  return data as Meeting[];
}

export async function addMemory(memory: Omit<MemoryLog, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('memory_logs')
    .insert(memory)
    .select()
    .single();
  if (error) throw error;
  return data as MemoryLog;
}

export async function searchMemory(query: string, category?: string) {
  let dbQuery = supabase
    .from('memory_logs')
    .select('*')
    .ilike('content', `%${query}%`);

  if (category) dbQuery = dbQuery.eq('category', category);

  const { data, error } = await dbQuery.order('created_at', { ascending: false }).limit(10);
  if (error) throw error;
  return data as MemoryLog[];
}

// Task CRUD operations
export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'status'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, status: 'pending' })
    .select()
    .single();
  if (error) throw error;

  // Emit TaskCreated event (non-blocking)
  emitTaskCreated(data as Record<string, unknown>).catch(() => {});

  return data as Task;
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function completeTask(id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

// Follow-up CRUD operations
export async function createFollowUp(followUp: Omit<FollowUp, 'id' | 'created_at' | 'status'>) {
  const { data, error } = await supabase
    .from('follow_ups')
    .insert({ ...followUp, status: 'pending' })
    .select()
    .single();
  if (error) throw error;

  // Emit FollowUpCreated event (non-blocking)
  emitFollowUpCreated(data as Record<string, unknown>).catch(() => {});

  return data as FollowUp;
}

export async function completeFollowUp(id: string) {
  const { data, error } = await supabase
    .from('follow_ups')
    .update({ status: 'completed' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as FollowUp;
}
