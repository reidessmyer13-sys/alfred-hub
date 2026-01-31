// Salesforce data fetching via direct API connection
// Uses jsforce for SOQL queries

import { UnifiedOpportunity, UnifiedContact } from './types';
import { query, isConfigured } from '../salesforce/client';

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Account?: { Name: string };
  Amount: number;
  StageName: string;
  CloseDate: string;
  NextStep: string;
  LastActivityDate: string;
  Owner?: { Name: string };
}

export interface SalesforceContact {
  Id: string;
  Name: string;
  Email: string;
  Phone: string;
  Account?: { Id: string; Name: string };
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
    accountName: sfOpp.Account?.Name || 'Unknown Account',
    amount: sfOpp.Amount,
    stage: sfOpp.StageName,
    closeDate: sfOpp.CloseDate ? new Date(sfOpp.CloseDate) : undefined,
    nextStep: sfOpp.NextStep,
    lastActivity,
    daysSinceActivity,
    ownerName: sfOpp.Owner?.Name,
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
    company: sfContact.Account?.Name,
    role: sfContact.Title,
    source: 'salesforce',
    sourceId: sfContact.Id,
  };
}

// Get stalled opportunities (no activity in X days)
export async function getStalledOpportunities(daysThreshold: number = 14): Promise<UnifiedOpportunity[]> {
  if (!(await isConfigured())) {
    console.log('[Salesforce] Not configured, skipping getStalledOpportunities');
    return [];
  }

  console.log(`[Salesforce] Fetching opportunities stalled > ${daysThreshold} days`);

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
  const dateStr = thresholdDate.toISOString().split('T')[0];

  const soql = `
    SELECT Id, Name, Account.Name, Amount, StageName, CloseDate, NextStep, LastActivityDate, Owner.Name
    FROM Opportunity
    WHERE IsClosed = false
    AND (LastActivityDate < ${dateStr} OR LastActivityDate = null)
    ORDER BY Amount DESC NULLS LAST
    LIMIT 20
  `;

  const opportunities = await query<SalesforceOpportunity>(soql);
  return opportunities.map(transformOpportunity);
}

// Get opportunities closing soon
export async function getOpportunitiesClosingSoon(daysAhead: number = 30): Promise<UnifiedOpportunity[]> {
  if (!(await isConfigured())) {
    console.log('[Salesforce] Not configured, skipping getOpportunitiesClosingSoon');
    return [];
  }

  console.log(`[Salesforce] Fetching opportunities closing within ${daysAhead} days`);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const dateStr = futureDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const soql = `
    SELECT Id, Name, Account.Name, Amount, StageName, CloseDate, NextStep, LastActivityDate, Owner.Name
    FROM Opportunity
    WHERE IsClosed = false
    AND CloseDate >= ${todayStr}
    AND CloseDate <= ${dateStr}
    ORDER BY CloseDate ASC
    LIMIT 20
  `;

  const opportunities = await query<SalesforceOpportunity>(soql);
  return opportunities.map(transformOpportunity);
}

// Get contacts for an account
export async function getAccountContacts(accountId: string): Promise<UnifiedContact[]> {
  if (!(await isConfigured())) {
    console.log('[Salesforce] Not configured, skipping getAccountContacts');
    return [];
  }

  console.log(`[Salesforce] Fetching contacts for account ${accountId}`);

  const soql = `
    SELECT Id, Name, Email, Phone, Account.Id, Account.Name, Title
    FROM Contact
    WHERE AccountId = '${accountId}'
    ORDER BY Name ASC
    LIMIT 50
  `;

  const contacts = await query<SalesforceContact>(soql);
  return contacts.map(transformContact);
}

// Search contacts by name or email
export async function searchContacts(searchTerm: string, limit: number = 10): Promise<UnifiedContact[]> {
  if (!(await isConfigured())) {
    console.log('[Salesforce] Not configured, skipping searchContacts');
    return [];
  }

  console.log(`[Salesforce] Searching contacts: ${searchTerm}`);

  const soql = `
    SELECT Id, Name, Email, Phone, Account.Id, Account.Name, Title
    FROM Contact
    WHERE Name LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%'
    ORDER BY Name ASC
    LIMIT ${limit}
  `;

  const contacts = await query<SalesforceContact>(soql);
  return contacts.map(transformContact);
}

// Get recent activities for a contact
export async function getContactActivities(contactId: string, limit: number = 10): Promise<SalesforceActivity[]> {
  if (!(await isConfigured())) {
    console.log('[Salesforce] Not configured, skipping getContactActivities');
    return [];
  }

  console.log(`[Salesforce] Fetching activities for contact ${contactId}`);

  const soql = `
    SELECT Id, Subject, ActivityDate, WhoId, WhatId, Description
    FROM Task
    WHERE WhoId = '${contactId}'
    ORDER BY ActivityDate DESC
    LIMIT ${limit}
  `;

  return query<SalesforceActivity>(soql);
}

// Get opportunities by account name
export async function getOpportunitiesByAccount(accountName: string): Promise<UnifiedOpportunity[]> {
  if (!(await isConfigured())) {
    console.log('[Salesforce] Not configured, skipping getOpportunitiesByAccount');
    return [];
  }

  console.log(`[Salesforce] Fetching opportunities for account: ${accountName}`);

  const soql = `
    SELECT Id, Name, Account.Name, Amount, StageName, CloseDate, NextStep, LastActivityDate, Owner.Name
    FROM Opportunity
    WHERE Account.Name LIKE '%${accountName}%'
    ORDER BY CloseDate ASC NULLS LAST
    LIMIT 20
  `;

  const opportunities = await query<SalesforceOpportunity>(soql);
  return opportunities.map(transformOpportunity);
}
