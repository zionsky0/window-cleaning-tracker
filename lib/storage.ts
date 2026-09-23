import { Customer } from './types';

const STORAGE_KEY_CUSTOMERS = 'clearview_rounds_v2';
const STORAGE_KEY_USER = 'clearview_user_v2';

export interface CleanerUser {
  identifier: string; // phone or email
  type: 'phone' | 'email';
  businessName: string;
  cleanerName: string;
  lastSyncedAt?: string;
}

export function getLocalCustomers(): Customer[] {
  if (typeof window === 'undefined') return [];
  try {
    // Clear any legacy demo data from earlier versions
    if (localStorage.getItem('clearview_customers_v1')) {
      localStorage.removeItem('clearview_customers_v1');
    }

    const data = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading local customers:', err);
  }

  // All new users start with a clean, blank slate
  return [];
}

export function setLocalCustomers(customers: Customer[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.error('Error saving local customers:', err);
  }
}

export function getLocalUser(): CleanerUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_USER);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local user:', err);
  }
  return null;
}

export function setLocalUser(user: CleanerUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch (err) {
    console.error('Error saving local user:', err);
  }
}
