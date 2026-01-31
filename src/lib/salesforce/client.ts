// Salesforce API Client using jsforce
// Authenticates via OAuth and provides query methods

import jsforce, { Connection, QueryResult } from 'jsforce';

let connection: Connection | null = null;

// Get or create Salesforce connection
async function getConnection(): Promise<Connection | null> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const username = process.env.SALESFORCE_USERNAME;
  const password = process.env.SALESFORCE_PASSWORD;
  const securityToken = process.env.SALESFORCE_SECURITY_TOKEN || '';
  const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId || !clientSecret || !username || !password) {
    console.log('[Salesforce] Missing credentials, skipping');
    return null;
  }

  if (connection) {
    return connection;
  }

  try {
    connection = new jsforce.Connection({
      oauth2: {
        loginUrl,
        clientId,
        clientSecret,
      },
    });

    await connection.login(username, password + securityToken);
    console.log('[Salesforce] Connected successfully');
    return connection;
  } catch (error) {
    console.error('[Salesforce] Connection failed:', error);
    return null;
  }
}

// Execute SOQL query
export async function query<T extends object>(soql: string): Promise<T[]> {
  const conn = await getConnection();
  if (!conn) return [];

  try {
    const result: QueryResult<T> = await conn.query<T>(soql);
    return result.records;
  } catch (error) {
    console.error('[Salesforce] Query failed:', error);
    return [];
  }
}

// Check if Salesforce is configured
export async function isConfigured(): Promise<boolean> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const username = process.env.SALESFORCE_USERNAME;
  return !!(clientId && username);
}
