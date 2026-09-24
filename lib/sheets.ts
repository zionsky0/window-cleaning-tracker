import { google } from 'googleapis';
import { Customer, FrequencyWeeks, SheetConnectionInfo } from './types';
import { getInitialDemoCustomers } from './demoData';
import { getTodayDateString, addWeeksToDate } from './dateUtils';

// In-memory demo cache for unauthenticated users
let demoCustomersCache: Customer[] = [];

const SHEET_NAME = 'ClearView - My Window Cleaning Rounds';
const TAB_NAME = 'Customers';
const SHEET_RANGE = `${TAB_NAME}!A:M`;
const HEADER_ROW = [
  'ID', 'Name', 'Phone', 'Address', 'Price', 'FrequencyWeeks',
  'LastCleanedDate', 'NextDueDate', 'Status', 'PaymentStatus', 'PaymentDate', 'Notes', 'PreferredContact',
];

/**
 * Creates a Google Sheets client authenticated with the user's own OAuth access token.
 * No service accounts needed — each user's data lives in their own Google Drive.
 */
function getUserSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth });
}

function getUserDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// ──────────────────────────────────────────────────
// Sheet Discovery & Auto-Creation
// ──────────────────────────────────────────────────

/**
 * Finds the user's ClearView spreadsheet in their Google Drive.
 * Returns the spreadsheet ID if found, null otherwise.
 */
async function findUserSheet(accessToken: string): Promise<string | null> {
  try {
    const drive = getUserDriveClient(accessToken);
    const res = await drive.files.list({
      q: `name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = res.data.files || [];
    if (files.length > 0 && files[0].id) {
      return files[0].id;
    }
    return null;
  } catch (err: any) {
    console.error('Error searching for user sheet:', err.message);
    return null;
  }
}

/**
 * Creates a new ClearView spreadsheet in the user's Google Drive
 * with the correct headers and formatting.
 */
async function createUserSheet(accessToken: string): Promise<string> {
  const sheets = getUserSheetsClient(accessToken);

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: SHEET_NAME,
      },
      sheets: [
        {
          properties: {
            title: TAB_NAME,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    },
  });

  const spreadsheetId = res.data.spreadsheetId!;

  // Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB_NAME}!A1:K1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [HEADER_ROW] },
  });

  // Bold the header row and set column widths
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.95, blue: 1 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
      ],
    },
  });

  return spreadsheetId;
}

/**
 * Gets or creates the user's ClearView spreadsheet.
 * This is the main entry point — completely automatic.
 */
export async function getOrCreateUserSheet(accessToken: string): Promise<string> {
  const existingId = await findUserSheet(accessToken);
  if (existingId) return existingId;
  return createUserSheet(accessToken);
}

// ──────────────────────────────────────────────────
// CRUD Operations (using user's OAuth token)
// ──────────────────────────────────────────────────

function parseRow(row: any[], index: number): Customer {
  const [id, name, phone, address, price, frequencyWeeks, lastCleanedDate, nextDueDate, status, paymentStatus, paymentDate, notes, preferredContact] = row;
  return {
    id: id || `cust-row-${index + 2}`,
    name: name || 'Unnamed Customer',
    phone: phone || '',
    address: address || '',
    price: Number(price) || 0,
    frequencyWeeks: (Number(frequencyWeeks) || 4) as FrequencyWeeks,
    lastCleanedDate: lastCleanedDate || undefined,
    nextDueDate: nextDueDate || getTodayDateString(),
    status: (status === 'paused' ? 'paused' : 'active') as 'active' | 'paused',
    paymentStatus: (paymentStatus === 'cash' || paymentStatus === 'card') ? paymentStatus : 'unpaid',
    paymentDate: paymentDate || undefined,
    notes: notes || '',
    preferredContact: preferredContact === 'whatsapp' ? 'whatsapp' : 'sms',
  };
}

/**
 * Fetch all customers
 */
export async function getCustomers(accessToken?: string): Promise<{ customers: Customer[]; isDemoMode: boolean }> {
  if (!accessToken) {
    return { customers: demoCustomersCache, isDemoMode: true };
  }

  try {
    const sheetId = await getOrCreateUserSheet(accessToken);
    const sheets = getUserSheetsClient(accessToken);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: SHEET_RANGE,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return { customers: [], isDemoMode: false };
    }

    const customers = rows.slice(1)
      .filter((row: any[]) => row.length > 0 && row[0])
      .map((row: any[], i: number) => parseRow(row, i));

    return { customers, isDemoMode: false };
  } catch (error: any) {
    console.error('Error fetching customers:', error.message);
    return { customers: demoCustomersCache, isDemoMode: true };
  }
}

/**
 * Add a new customer
 */
export async function addCustomer(customer: Omit<Customer, 'id'>, accessToken?: string): Promise<{ success: boolean; customer: Customer; isDemoMode: boolean }> {
  const newId = `cust-${Date.now()}`;
  const fullCustomer: Customer = { ...customer, id: newId } as Customer;

  if (!accessToken) {
    demoCustomersCache.unshift(fullCustomer);
    return { success: true, customer: fullCustomer, isDemoMode: true };
  }

  try {
    const sheetId = await getOrCreateUserSheet(accessToken);
    const sheets = getUserSheetsClient(accessToken);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${TAB_NAME}!A:M`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          fullCustomer.id, fullCustomer.name, fullCustomer.phone, fullCustomer.address,
          fullCustomer.price, fullCustomer.frequencyWeeks, fullCustomer.lastCleanedDate || '',
          fullCustomer.nextDueDate, fullCustomer.status, fullCustomer.paymentStatus || 'unpaid',
          fullCustomer.paymentDate || '', fullCustomer.notes || '',
          fullCustomer.preferredContact || 'sms',
        ]],
      },
    });

    return { success: true, customer: fullCustomer, isDemoMode: false };
  } catch (error: any) {
    console.error('Error adding customer:', error.message);
    demoCustomersCache.unshift(fullCustomer);
    return { success: true, customer: fullCustomer, isDemoMode: true };
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(id: string, updates: Partial<Customer>, accessToken?: string): Promise<{ success: boolean; customer?: Customer; isDemoMode: boolean }> {
  if (!accessToken) {
    const idx = demoCustomersCache.findIndex((c) => c.id === id);
    if (idx === -1) return { success: false, isDemoMode: true };
    demoCustomersCache[idx] = { ...demoCustomersCache[idx], ...updates };
    return { success: true, customer: demoCustomersCache[idx], isDemoMode: true };
  }

  try {
    const sheetId = await getOrCreateUserSheet(accessToken);
    const sheets = getUserSheetsClient(accessToken);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: SHEET_RANGE,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, isDemoMode: false };
    }

    const currentRow = rows[rowIndex - 1];
    const updatedRow = [
      currentRow[0],
      updates.name !== undefined ? updates.name : currentRow[1],
      updates.phone !== undefined ? updates.phone : currentRow[2],
      updates.address !== undefined ? updates.address : currentRow[3],
      updates.price !== undefined ? updates.price : currentRow[4],
      updates.frequencyWeeks !== undefined ? updates.frequencyWeeks : currentRow[5],
      updates.lastCleanedDate !== undefined ? updates.lastCleanedDate : currentRow[6],
      updates.nextDueDate !== undefined ? updates.nextDueDate : currentRow[7],
      updates.status !== undefined ? updates.status : currentRow[8],
      updates.paymentStatus !== undefined ? updates.paymentStatus : (currentRow[9] || 'unpaid'),
      updates.paymentDate !== undefined ? updates.paymentDate : (currentRow[10] || ''),
      updates.notes !== undefined ? updates.notes : currentRow[11],
      updates.preferredContact !== undefined ? updates.preferredContact : currentRow[12],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${TAB_NAME}!A${rowIndex}:M${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });

    return {
      success: true,
      isDemoMode: false,
      customer: parseRow(updatedRow, rowIndex - 2),
    };
  } catch (error: any) {
    console.error('Error updating customer:', error.message);
    return { success: false, isDemoMode: false };
  }
}

/**
 * Mark customer clean complete: sets lastCleaned=today, computes next due date
 */
export async function markCustomerCompleted(id: string, accessToken?: string): Promise<{ success: boolean; customer?: Customer; isDemoMode: boolean }> {
  const today = getTodayDateString();

  let frequency: FrequencyWeeks = 4;
  const all = await getCustomers(accessToken);
  const found = all.customers.find((c) => c.id === id);
  if (found) frequency = found.frequencyWeeks;

  const nextDueDate = addWeeksToDate(today, frequency);

  return updateCustomer(id, { lastCleanedDate: today, nextDueDate }, accessToken);
}

/**
 * Delete a customer
 */
export async function deleteCustomer(id: string, accessToken?: string): Promise<{ success: boolean; isDemoMode: boolean }> {
  if (!accessToken) {
    demoCustomersCache = demoCustomersCache.filter((c) => c.id !== id);
    return { success: true, isDemoMode: true };
  }

  try {
    const sheetId = await getOrCreateUserSheet(accessToken);
    const sheets = getUserSheetsClient(accessToken);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: SHEET_RANGE,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, isDemoMode: false };

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${TAB_NAME}!A${rowIndex + 1}:K${rowIndex + 1}`,
    });

    return { success: true, isDemoMode: false };
  } catch (error: any) {
    console.error('Error deleting customer:', error.message);
    return { success: false, isDemoMode: false };
  }
}

/**
 * Reset demo data
 */
export function resetDemoData(): void {
  demoCustomersCache = getInitialDemoCustomers();
}

/**
 * Test connection / get sheet info
 */
export async function testConnection(accessToken?: string): Promise<SheetConnectionInfo> {
  if (!accessToken) {
    return { isConnected: false, isDemoMode: true, rowCount: demoCustomersCache.length };
  }

  try {
    const sheetId = await getOrCreateUserSheet(accessToken);
    const sheets = getUserSheetsClient(accessToken);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${TAB_NAME}!A:A`,
    });

    const rows = res.data.values || [];

    return {
      isConnected: true,
      sheetId,
      isDemoMode: false,
      rowCount: Math.max(0, rows.length - 1),
    };
  } catch (err: any) {
    return { isConnected: false, isDemoMode: false, error: err.message };
  }
}
