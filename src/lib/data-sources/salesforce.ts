// Salesforce data fetching via API calls to our MCP-connected instance
// This makes HTTP calls to a proxy endpoint that uses the Salesforce MCP

import { UnifiedOpportunity, UnifiedContact } from './types';

const SALESFORCE_PROXY_URL = process.env.SALESFORCE_PROXY_URL;

// For now, we'll define the expected data structure
// In production, this would call the Salesforce MCP or API directly

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  AccountName: string;
  Amount: number;
  StageName: string;
  CloseDate: string;
  NextStep: string;
  LastActivityDate: string;
  OwnerId: string;
  OwnerName: string;
}

export interface SalesforceContact {
  Id: string;
  Name: string;
  Email: string;
  Phone: string;
  AccountId: string;
  AccountName: string;
  Title: string;
}

export interface SalesforceActivity {
  Id: string;
  Subject: string;
  ActivityDate: string;
  WhoId: string;
  WhatId: string;
  Description: string;
}

// Transform Salesforce opportunity to unified format
export function transformOpportunity(sfOpp: SalesforceOpportunity): UnifiedOpportunity {
  const lastActivity = sfOpp.LastActivityDate ? new Date(sfOpp.LastActivityDate) : undefined;
  const daysSinceActivity = lastActivity
    ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  return {
    id: `sf_${sfOpp.Id}`,
    name: sfOpp.Name,
    accountName: sfOpp.AccountName,
    amount: sfOpp.Amount,
    stage: sfOpp.StageName,
    closeDate: sfOpp.CloseDate ? new Date(sfOpp.CloseDate) : undefined,
    nextStep: sfOpp.NextStep,
    lastActivity,
    daysSinceActivity,
    ownerName: sfOpp.OwnerName,
    source: 'salesforce',
    sourceId: sfOpp.Id,
  };
}

// Transform Salesforce contact to unified format
export function transformContact(sfContact: SalesforceContact): UnifiedContact {
  return {
    id: `sf_${sfContact.Id}`,
    name: sfContact.Name,
    email: sfContact.Email,
    phone: sfContact.Phone,
    company: sfContact.AccountName,
    role: sfContact.Title,
    source: 'salesforce',
    sourceId: sfContact.Id,
  };
}

// Get stalled opportunities (no activity in X days)
export async function getStalledOpportunities(daysThreshold: number = 14): Promise<UnifiedOpportunity[]> {
  // This would typically call the Salesforce API/MCP
  // For now, return empty array - will be populated when we wire up the MCP proxy
  console.log(`[Salesforce] Fetching opportunities stalled > ${daysThreshold} days`);
  return [];
}

// Get opportunities closing soon
export async function getOpportunitiesClosingSoon(daysAhead: number = 30): Promise<UnifiedOpportunity[]> {
  console.log(`[Salesforce] Fetching opportunities closing within ${daysAhead} days`);
  return [];
}

// Get contacts for an account
export async function getAccountContacts(accountId: string): Promise<UnifiedContact[]> {
  console.log(`[Salesforce] Fetching contacts for account ${accountId}`);
  return [];
}

// Get recent activities for a contact
export async function getContactActivities(contactId: string, limit: number = 10): Promise<SalesforceActivity[]> {
  console.log(`[Salesforce] Fetching activities for contact ${contactId}`);
  return [];
}
