import { Customer, FrequencyWeeks } from './types';

export function customersToCSV(customers: Customer[]): string {
  const headers = [
    'ID',
    'Name',
    'Phone',
    'Address',
    'Price (£)',
    'Frequency (Weeks)',
    'Last Cleaned Date',
    'Next Due Date',
    'Status',
    'Notes',
    'Preferred Contact',
  ];

  const escapeCSV = (str: string | number | undefined) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = customers.map((c) => [
    escapeCSV(c.id),
    escapeCSV(c.name),
    escapeCSV(c.phone),
    escapeCSV(c.address),
    escapeCSV(c.price),
    escapeCSV(c.frequencyWeeks),
    escapeCSV(c.lastCleanedDate || ''),
    escapeCSV(c.nextDueDate),
    escapeCSV(c.status),
    escapeCSV(c.notes || ''),
    escapeCSV(c.preferredContact || 'sms'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function downloadCSV(csvContent: string, filename: string = 'clearview-rounds.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVToCustomers(csvText: string): Omit<Customer, 'id'>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const customers: Omit<Customer, 'id'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length < 4) continue;

    const name = cols[1] || cols[0];
    const phone = cols[2] || '';
    const address = cols[3] || '';
    const price = Number(cols[4]?.replace(/[^0-9.]/g, '')) || 25;
    const freq = (Number(cols[5]) || 4) as FrequencyWeeks;
    const lastCleanedDate = cols[6] || undefined;
    const nextDueDate = cols[7] || new Date().toISOString().split('T')[0];
    const status = cols[8]?.toLowerCase() === 'paused' ? 'paused' : 'active';
    const notes = cols[9] || '';
    const preferredContact = cols[10]?.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'sms';

    if (name && address) {
      customers.push({
        name,
        phone,
        address,
        price,
        frequencyWeeks: freq,
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
