import { Customer } from './types';
import { getInitialDemoCustomers } from './demoData';

const STORAGE_KEY_CUSTOMERS = 'clearview_customers_v1';
const STORAGE_KEY_USER = 'clearview_user_v1';

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
    const data = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading local customers:', err);
  }

  // First time opening the app: seed with realistic starter data
  const initial = getInitialDemoCustomers();
  setLocalCustomers(initial);
  return initial;
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
