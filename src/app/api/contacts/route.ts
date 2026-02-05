// Contacts API - CRUD operations for contacts
import { NextRequest, NextResponse } from 'next/server';
import { getContacts } from '@/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let contacts = await getContacts();

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.company?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ contacts }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Contacts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500, headers: corsHeaders }
    );
  }
}
