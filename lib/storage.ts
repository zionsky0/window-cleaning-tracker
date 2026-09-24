import { Customer } from './types';

const STORAGE_KEY_CUSTOMERS = 'clearview_rounds_v2';
const STORAGE_KEY_USER = 'clearview_user_v2';

export interface CleanerUser {
  identifier: string; // phone or email
  type: 'phone' | 'email';
  businessName: string;
  cleanerName: string;
  token?: string;
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

const STORAGE_KEY_ACTIVE_ROUTE = 'clearview_active_route_v1';
const STORAGE_KEY_START_LOCATION = 'clearview_start_loc_v1';
const STORAGE_KEY_NAV_APP = 'clearview_nav_app_v1';

import { ActiveRouteState, NavApp } from './types';

export function getLocalActiveRoute(): ActiveRouteState | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_ACTIVE_ROUTE);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local active route:', err);
  }
  return null;
}

export function setLocalActiveRoute(route: ActiveRouteState | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (route) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ROUTE, JSON.stringify(route));
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ROUTE);
    }
  } catch (err) {
    console.error('Error saving local active route:', err);
  }
}

export function getLocalStartLocation(): { address: string; lat?: number; lng?: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_START_LOCATION);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error reading start location:', err);
  }
  return null;
}

export function setLocalStartLocation(loc: { address: string; lat?: number; lng?: number } | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (loc) {
      localStorage.setItem(STORAGE_KEY_START_LOCATION, JSON.stringify(loc));
    } else {
      localStorage.removeItem(STORAGE_KEY_START_LOCATION);
    }
  } catch (err) {
    console.error('Error saving start location:', err);
  }
}

export function getLocalNavApp(): NavApp {
  if (typeof window === 'undefined') return 'google';
  try {
    const val = localStorage.getItem(STORAGE_KEY_NAV_APP);
    if (val === 'apple' || val === 'waze' || val === 'google') return val;
  } catch (err) {
    console.error('Error reading nav app:', err);
  }
  return 'google';
}

export function setLocalNavApp(app: NavApp): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_NAV_APP, app);
  } catch (err) {
    console.error('Error saving nav app:', err);
  }
}
