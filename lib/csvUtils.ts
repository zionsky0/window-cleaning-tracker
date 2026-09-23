import { Customer, FrequencyWeeks } from './types';
import { getTodayDateString } from './dateUtils';

const CSV_HEADERS = [
  'Name',
  'Phone',
  'Address',
  'Price',
  'FrequencyWeeks',
  'LastCleanedDate',
  'NextDueDate',
  'Status',
  'Notes',
  'PreferredContact',
];

/**
 * Converts customers array to CSV string
 */
export function customersToCSV(customers: Customer[]): string {
  const lines = [CSV_HEADERS.join(',')];

  customers.forEach((c) => {
    const row = [
      escapeCSV(c.name),
      escapeCSV(c.phone),
      escapeCSV(c.address),
      c.price,
      c.frequencyWeeks,
      c.lastCleanedDate || '',
      c.nextDueDate || '',
      c.status || 'active',
      escapeCSV(c.notes || ''),
      c.preferredContact || 'sms',
    ];
    lines.push(row.join(','));
  });

  return lines.join('\n');
}

/**
 * Escapes CSV field
 */
function escapeCSV(str: string): string {
  if (!str) return '""';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Downloads a CSV file in the browser
 */
export function downloadCSV(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses CSV text into Customer objects
 */
export function parseCSVToCustomers(csvText: string): Omit<Customer, 'id'>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const today = getTodayDateString();
  const customers: Omit<Customer, 'id'>[] = [];

  // Simple CSV line parser handling quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let insideQuote = false;
    let entry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        result.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  };

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length >= 3 && cols[0]) {
      const name = cols[0];
      const phone = cols[1] || '';
      const address = cols[2] || '';
      const price = Number(cols[3]) || 25;
      const frequencyWeeks = (Number(cols[4]) || 4) as FrequencyWeeks;
      const lastCleanedDate = cols[5] || undefined;
      const nextDueDate = cols[6] || today;
      const status = (cols[7] === 'paused' ? 'paused' : 'active') as 'active' | 'paused';
      const notes = cols[8] || '';
      const preferredContact = cols[9] === 'whatsapp' ? 'whatsapp' : 'sms';

      customers.push({
        name,
        phone,
        address,
        price,
        frequencyWeeks,
        lastCleanedDate,
        nextDueDate,
        status,
        notes,
        preferredContact,
      });
    }
  }

  return customers;
}
