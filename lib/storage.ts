import { Customer, NavApp, ActiveRouteState, TravelMode, BankDetails } from './types';

const STORAGE_KEY_CUSTOMERS = 'clearview_rounds_v2';
const STORAGE_KEY_USER = 'clearview_user_v2';
const STORAGE_KEY_ACTIVE_ROUTE = 'clearview_active_route_v1';
const STORAGE_KEY_START_LOCATION = 'clearview_start_loc_v1';
const STORAGE_KEY_FINISH_LOCATION = 'clearview_finish_loc_v1';
const STORAGE_KEY_TRAVEL_MODE = 'clearview_travel_mode_v1';
const STORAGE_KEY_NAV_APP = 'clearview_nav_app_v1';

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
    // Safely migrate any v1 data if v2 is not yet populated
    const v1Data = localStorage.getItem('clearview_customers_v1');
    const v2Data = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (v1Data && !v2Data) {
      try {
        const parsedV1 = JSON.parse(v1Data);
        if (Array.isArray(parsedV1) && parsedV1.length > 0) {
          localStorage.setItem(STORAGE_KEY_CUSTOMERS, v1Data);
          localStorage.removeItem('clearview_customers_v1');
          return parsedV1;
        }
      } catch {}
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

export function getLocalStartLocation(): { address?: string; lat?: number; lng?: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_START_LOCATION);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error reading start location:', err);
  }
  return null;
}

export function setLocalStartLocation(loc: { address?: string; lat?: number; lng?: number } | null): void {
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

export function getLocalFinishLocation(): { address?: string; lat?: number; lng?: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_FINISH_LOCATION);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.address === 'string' && parsed.address.trim()) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading finish location:', err);
  }
  return null;
}

export function setLocalFinishLocation(loc: { address?: string; lat?: number; lng?: number } | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (loc) {
      localStorage.setItem(STORAGE_KEY_FINISH_LOCATION, JSON.stringify(loc));
    } else {
      localStorage.removeItem(STORAGE_KEY_FINISH_LOCATION);
    }
  } catch (err) {
    console.error('Error saving finish location:', err);
  }
}

export function getLocalTravelMode(): TravelMode {
  if (typeof window === 'undefined') return 'walking';
  try {
    const val = localStorage.getItem(STORAGE_KEY_TRAVEL_MODE);
    if (val === 'driving' || val === 'walking') return val;
  } catch (err) {
    console.error('Error reading travel mode:', err);
  }
  // Default to walking as window cleaners walk on foot with trolley/backpack
  return 'walking';
}

export function setLocalTravelMode(mode: TravelMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TRAVEL_MODE, mode);
  } catch (err) {
    console.error('Error saving travel mode:', err);
  }
}

const STORAGE_KEY_BANK_DETAILS = 'clearview_bank_details_v1';

export function getLocalBankDetails(): BankDetails {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY_BANK_DETAILS);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error reading bank details:', err);
  }
  return {};
}

export function setLocalBankDetails(details: BankDetails): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BANK_DETAILS, JSON.stringify(details));
  } catch (err) {
    console.error('Error saving bank details:', err);
  }
}


