import { Customer, FrequencyWeeks, PaymentStatus } from './types';

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
    'Payment Status',
    'Payment Date',
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
    escapeCSV(c.paymentStatus || 'unpaid'),
    escapeCSV(c.paymentDate || ''),
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
  // Strip Markdown code blocks if user copied from ChatGPT/Claude with ```csv ... ```
  let cleanText = csvText.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```[a-z]*\r?\n/, '').replace(/\r?\n```$/, '');
  }

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
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

  const rawHeaders = parseRow(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));

  // Intelligent header detection
  const nameIdx = headers.findIndex((h) => h.includes('name'));
  const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('tel'));
  const addressIdx = headers.findIndex((h) => h.includes('address') || h.includes('street') || h.includes('location'));
  const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('cost') || h.includes('rate') || h.includes('amount'));
  const freqIdx = headers.findIndex((h) => h.includes('freq') || h.includes('every') || h.includes('interval') || h.includes('weeks'));
  const lastCleanIdx = headers.findIndex((h) => h.includes('lastclean') || h.includes('lastdate'));
  const nextDueIdx = headers.findIndex((h) => h.includes('nextdue') || h.includes('duedate') || h.includes('due'));
  const statusIdx = headers.findIndex((h) => h.includes('status') && !h.includes('pay'));
  const payStatusIdx = headers.findIndex((h) => h.includes('pay') || h.includes('paid') || h.includes('method'));
  const payDateIdx = headers.findIndex((h) => h.includes('paydate') || h.includes('paiddate') || h.includes('datepaid'));
  const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('comment') || h.includes('info'));
  const contactIdx = headers.findIndex((h) => h.includes('contact') || h.includes('preferred'));

  const customers: Omit<Customer, 'id'>[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length < 2) continue;

    const name = nameIdx !== -1 ? cols[nameIdx] : (cols[1] || cols[0]);
    const phone = phoneIdx !== -1 ? cols[phoneIdx] : (cols[2] || '');
    const address = addressIdx !== -1 ? cols[addressIdx] : (cols[3] || cols[1] || '');
    const rawPrice = priceIdx !== -1 ? cols[priceIdx] : cols[4];
    const price = Number(rawPrice?.replace(/[^0-9.]/g, '')) || 25;
    const rawFreq = freqIdx !== -1 ? cols[freqIdx] : cols[5];
    const freqNum = Number(rawFreq?.replace(/[^0-9]/g, '')) || 4;
    const freq: FrequencyWeeks = [2, 4, 6, 8, 12].includes(freqNum) ? (freqNum as FrequencyWeeks) : 4;
    const lastCleanedDate = lastCleanIdx !== -1 && cols[lastCleanIdx] ? cols[lastCleanIdx] : undefined;
    const nextDueDate = (nextDueIdx !== -1 && cols[nextDueIdx]) ? cols[nextDueIdx] : todayStr;
    const status = statusIdx !== -1 && cols[statusIdx]?.toLowerCase() === 'paused' ? 'paused' : 'active';
    
    // Parse payment status
    let paymentStatus: PaymentStatus = 'unpaid';
    if (payStatusIdx !== -1 && cols[payStatusIdx]) {
      const p = cols[payStatusIdx].toLowerCase().trim();
      if (p.includes('cash')) paymentStatus = 'cash';
      else if (p.includes('card') || p.includes('bank') || p.includes('transfer')) paymentStatus = 'card';
    }
    const paymentDate = (payDateIdx !== -1 && cols[payDateIdx]) ? cols[payDateIdx] : undefined;

    const notes = notesIdx !== -1 ? cols[notesIdx] : '';
    const preferredContact = contactIdx !== -1 && cols[contactIdx]?.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'sms';

    if (name && (address || phone)) {
      customers.push({
        name: name.replace(/^["']|["']$/g, ''),
        phone: phone.replace(/^["']|["']$/g, ''),
        address: (address || 'Address pending').replace(/^["']|["']$/g, ''),
        price,
        frequencyWeeks: freq,
        lastCleanedDate,
        nextDueDate,
        status,
        paymentStatus,
        paymentDate,
        notes: notes.replace(/^["']|["']$/g, ''),
        preferredContact,
      });
    }
  }

  return customers;
}
