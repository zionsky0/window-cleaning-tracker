export type FrequencyWeeks = 2 | 4 | 6 | 8 | 12;

export type PaymentStatus = 'unpaid' | 'cash' | 'card' | 'bacs';

export interface CleanHistoryItem {
  id: string;
  date: string; // YYYY-MM-DD
  price: number;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  notes?: string;
}

export interface BankDetails {
  accountName?: string;
  sortCode?: string;
  accountNumber?: string;
  payLinkUrl?: string; // e.g. monzo.me/username, revolut.me/username, stripe link
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  postcode?: string;
  price: number; // e.g. 25
  frequencyWeeks: FrequencyWeeks; // e.g. 4
  lastCleanedDate?: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  status: 'active' | 'paused';
  paymentStatus?: PaymentStatus; // 'unpaid' | 'cash' | 'card' | 'bacs'
  paymentDate?: string; // YYYY-MM-DD
  notes?: string; // e.g. "Gate code #1234, watch dog"
  preferredContact?: 'sms' | 'whatsapp';
  lat?: number;
  lng?: number;
  createdAt?: string;
  cleanHistory?: CleanHistoryItem[];
  balance?: number; // accumulated arrears or credit
}

export type NavApp = 'google' | 'apple' | 'waze';
export type TravelMode = 'walking' | 'driving';

export interface RouteStop {
  customer: Customer;
  stopIndex: number; // 1-based index (Stop #1, #2...)
  distanceFromPrevMiles?: number;
  driveMinutesFromPrev?: number; // kept for backwards compatibility
  travelMinutesFromPrev?: number;
  streetName?: string;
  isDoneToday?: boolean;
}

export interface ActiveRouteState {
  isActive: boolean;
  stopIds: string[]; // customer IDs in optimal sequence
  currentStopIndex: number; // 0-based index of current active stop
  totalDistanceMiles?: number;
  totalDurationMinutes?: number;
  travelMode?: TravelMode;
  startAddress?: string;
  startLat?: number;
  startLng?: number;
  finishAddress?: string;
  finishLat?: number;
  finishLng?: number;
  lastOptimizedAt: string;
}

export type DueCategory = 'overdue' | 'due_today' | 'due_this_week' | 'upcoming' | 'completed_today';

export interface AppStats {
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  totalActiveCount: number;
  todayEstimatedEarnings: number;
  completedTodayCount: number;
  completedTodayEarnings: number;
  // Payment Breakdown
  unpaidCount: number;
  unpaidAmount: number;
  cashCount: number;
  cashAmount: number;
  cardCount: number;
  cardAmount: number;
  bacsCount: number;
  bacsAmount: number;
}

export interface SheetConnectionInfo {
  isConnected: boolean;
  sheetId?: string;
  isDemoMode: boolean;
  error?: string;
  rowCount?: number;
}
