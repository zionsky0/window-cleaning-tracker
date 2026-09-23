import { google } from 'googleapis';
import { Customer, FrequencyWeeks, SheetConnectionInfo } from './types';
import { getInitialDemoCustomers } from './demoData';
import { getTodayDateString, addWeeksToDate } from './dateUtils';

// In-memory cache for demo mode so changes persist during runtime
let demoCustomersCache: Customer[] = getInitialDemoCustomers();

export function getServiceAccountEmail(): string {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
}

export function isGoogleSheetsConfigured(customSheetId?: string): boolean {
  const targetId = customSheetId || process.env.GOOGLE_SHEET_ID;
  return Boolean(
    targetId &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

function getGoogleSheetsClient(customSheetId?: string) {
  const sheetId = customSheetId || process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !privateKey) {
    throw new Error('Google Sheets service credentials are not configured on the server.');
  }

  // Handle newlines in private key
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, sheetId };
}

const SHEET_RANGE = 'Customers!A:K';
const HEADER_ROW = [
  'ID',
  'Name',
  'Phone',
  'Address',
  'Price',
  'FrequencyWeeks',
  'LastCleanedDate',
  'NextDueDate',
  'Status',
  'Notes',
  'PreferredContact'
];

/**
 * Ensures header row exists if the sheet is blank
 */
async function ensureHeaders(sheets: any, sheetId: string) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Customers!A1:K1',
    });
    const values = res.data.values;
    if (!values || values.length === 0 || values[0].length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Customers!A1:K1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [HEADER_ROW] },
      });
    }
  } catch (err: any) {
    // If the "Customers" tab doesn't exist yet, we can try Sheet1 or default
    console.warn('Note on ensureHeaders:', err.message);
  }
}

/**
 * Fetch all customers (From Google Sheets or Demo fallback)
 */
export async function getCustomers(customSheetId?: string): Promise<{ customers: Customer[]; isDemoMode: boolean }> {
  if (!isGoogleSheetsConfigured(customSheetId)) {
    return { customers: demoCustomersCache, isDemoMode: true };
  }

  try {
    const { sheets, sheetId } = getGoogleSheetsClient(customSheetId);
    await ensureHeaders(sheets, sheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: SHEET_RANGE,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      // Empty sheet or only headers
      return { customers: [], isDemoMode: false };
    }

    // Skip header row
    const dataRows = rows.slice(1);
    const customers: Customer[] = dataRows.map((row: any[], index: number) => {
      const [
        id,
        name,
        phone,
        address,
        price,
        frequencyWeeks,
        lastCleanedDate,
        nextDueDate,
        status,
        notes,
        preferredContact
      ] = row;

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
        notes: notes || '',
        preferredContact: preferredContact === 'whatsapp' ? 'whatsapp' : 'sms',
      };
    });

    return { customers, isDemoMode: false };
  } catch (error: any) {
    console.error('Error fetching from Google Sheets, falling back to demo data:', error.message);
    return { customers: demoCustomersCache, isDemoMode: true };
  }
}

/**
 * Add a new customer
 */
export async function addCustomer(customer: Omit<Customer, 'id'>, customSheetId?: string): Promise<{ success: boolean; customer: Customer; isDemoMode: boolean }> {
  const newId = `cust-${Date.now()}`;
  const fullCustomer: Customer = {
    ...customer,
    id: newId,
  };

  if (!isGoogleSheetsConfigured(customSheetId)) {
    demoCustomersCache.unshift(fullCustomer);
    return { success: true, customer: fullCustomer, isDemoMode: true };
  }

  try {
    const { sheets, sheetId } = getGoogleSheetsClient(customSheetId);
    const rowValues = [
      fullCustomer.id,
      fullCustomer.name,
      fullCustomer.phone,
      fullCustomer.address,
      fullCustomer.price,
      fullCustomer.frequencyWeeks,
      fullCustomer.lastCleanedDate || '',
      fullCustomer.nextDueDate,
      fullCustomer.status,
      fullCustomer.notes || '',
      fullCustomer.preferredContact || 'sms'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Customers!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    return { success: true, customer: fullCustomer, isDemoMode: false };
  } catch (error: any) {
    console.error('Error adding customer to Google Sheet, falling back to demo mode:', error.message);
    demoCustomersCache.unshift(fullCustomer);
    return { success: true, customer: fullCustomer, isDemoMode: true };
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(id: string, updates: Partial<Customer>, customSheetId?: string): Promise<{ success: boolean; customer?: Customer; isDemoMode: boolean }> {
  if (!isGoogleSheetsConfigured(customSheetId)) {
    const idx = demoCustomersCache.findIndex((c) => c.id === id);
    if (idx === -1) {
      return { success: false, isDemoMode: true };
    }
    demoCustomersCache[idx] = { ...demoCustomersCache[idx], ...updates };
    return { success: true, customer: demoCustomersCache[idx], isDemoMode: true };
  }

  try {
    const { sheets, sheetId } = getGoogleSheetsClient(customSheetId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: SHEET_RANGE,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i + 1; // 1-indexed row for Sheets API
        break;
      }
    }

    if (rowIndex === -1) {
      // Fallback: check demo cache
      const idx = demoCustomersCache.findIndex((c) => c.id === id);
      if (idx !== -1) {
        demoCustomersCache[idx] = { ...demoCustomersCache[idx], ...updates };
        return { success: true, customer: demoCustomersCache[idx], isDemoMode: true };
      }
      return { success: false, isDemoMode: false };
    }

    const currentRow = rows[rowIndex - 1];
    const updatedRow = [
      currentRow[0], // id
      updates.name !== undefined ? updates.name : currentRow[1],
      updates.phone !== undefined ? updates.phone : currentRow[2],
      updates.address !== undefined ? updates.address : currentRow[3],
      updates.price !== undefined ? updates.price : currentRow[4],
      updates.frequencyWeeks !== undefined ? updates.frequencyWeeks : currentRow[5],
      updates.lastCleanedDate !== undefined ? updates.lastCleanedDate : currentRow[6],
      updates.nextDueDate !== undefined ? updates.nextDueDate : currentRow[7],
      updates.status !== undefined ? updates.status : currentRow[8],
      updates.notes !== undefined ? updates.notes : currentRow[9],
      updates.preferredContact !== undefined ? updates.preferredContact : currentRow[10],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Customers!A${rowIndex}:K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    });

    return {
      success: true,
      isDemoMode: false,
      customer: {
        id: updatedRow[0],
        name: updatedRow[1],
        phone: updatedRow[2],
        address: updatedRow[3],
        price: Number(updatedRow[4]) || 0,
        frequencyWeeks: (Number(updatedRow[5]) || 4) as FrequencyWeeks,
        lastCleanedDate: updatedRow[6] || undefined,
        nextDueDate: updatedRow[7],
        status: updatedRow[8] as 'active' | 'paused',
        notes: updatedRow[9] || '',
        preferredContact: updatedRow[10] || 'sms',
      },
    };
  } catch (error: any) {
    console.error('Error updating row in Google Sheet:', error.message);
    const idx = demoCustomersCache.findIndex((c) => c.id === id);
    if (idx !== -1) {
      demoCustomersCache[idx] = { ...demoCustomersCache[idx], ...updates };
      return { success: true, customer: demoCustomersCache[idx], isDemoMode: true };
    }
    return { success: false, isDemoMode: true };
  }
}

/**
 * Mark a customer clean completed for today:
 * Updates lastCleanedDate = today
 * Updates nextDueDate = today + frequencyWeeks
 */
export async function markCustomerCompleted(id: string, customSheetId?: string): Promise<{ success: boolean; customer?: Customer; isDemoMode: boolean }> {
  const today = getTodayDateString();

  // Find customer to get their frequency
  let frequency: FrequencyWeeks = 4;
  if (!isGoogleSheetsConfigured(customSheetId)) {
    const current = demoCustomersCache.find((c) => c.id === id);
    if (current) {
      frequency = current.frequencyWeeks;
    }
  } else {
    const all = await getCustomers(customSheetId);
    const found = all.customers.find((c) => c.id === id);
    if (found) {
      frequency = found.frequencyWeeks;
    }
  }

  const nextDueDate = addWeeksToDate(today, frequency);

  return updateCustomer(id, {
    lastCleanedDate: today,
    nextDueDate: nextDueDate,
  }, customSheetId);
}

/**
 * Delete a customer
 */
export async function deleteCustomer(id: string, customSheetId?: string): Promise<{ success: boolean; isDemoMode: boolean }> {
  if (!isGoogleSheetsConfigured(customSheetId)) {
    demoCustomersCache = demoCustomersCache.filter((c) => c.id !== id);
    return { success: true, isDemoMode: true };
  }

  try {
    const { sheets, sheetId } = getGoogleSheetsClient(customSheetId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: SHEET_RANGE,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i; // 0-indexed in sheet rows
        break;
      }
    }

    if (rowIndex === -1) {
      demoCustomersCache = demoCustomersCache.filter((c) => c.id !== id);
      return { success: true, isDemoMode: true };
    }

    // Clear row values in Google Sheets
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `Customers!A${rowIndex + 1}:K${rowIndex + 1}`,
    });

    return { success: true, isDemoMode: false };
  } catch (error: any) {
    console.error('Error deleting from Google Sheet:', error.message);
    demoCustomersCache = demoCustomersCache.filter((c) => c.id !== id);
    return { success: true, isDemoMode: true };
  }
}

/**
 * Reset demo data back to default initial seed
 */
export function resetDemoData(): void {
  demoCustomersCache = getInitialDemoCustomers();
}

/**
 * Test Google Sheets connection for a specific sheet ID
 */
export async function testConnection(customSheetId?: string): Promise<SheetConnectionInfo> {
  const targetId = customSheetId || process.env.GOOGLE_SHEET_ID;

  if (!isGoogleSheetsConfigured(customSheetId)) {
    return {
      isConnected: false,
      isDemoMode: true,
      serviceAccount: getServiceAccountEmail(),
      rowCount: demoCustomersCache.length,
    };
  }

  try {
    const { sheets, sheetId } = getGoogleSheetsClient(customSheetId);
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    await ensureHeaders(sheets, sheetId);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Customers!A:A',
    });

    const rows = res.data.values || [];

    return {
      isConnected: true,
      sheetId,
      serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      isDemoMode: false,
      rowCount: Math.max(0, rows.length - 1),
    };
  } catch (err: any) {
    return {
      isConnected: false,
      sheetId: targetId,
      serviceAccount: getServiceAccountEmail(),
      isDemoMode: false,
      error: err.message,
    };
  }
}
