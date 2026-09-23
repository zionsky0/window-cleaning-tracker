export type FrequencyWeeks = 2 | 4 | 6 | 8 | 12;

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
  notes?: string; // e.g. "Gate code #1234, watch dog"
  preferredContact?: 'sms' | 'whatsapp';
  createdAt?: string;
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
}

export interface SheetConnectionInfo {
  isConnected: boolean;
  sheetId?: string;
  serviceAccount?: string;
  isDemoMode: boolean;
  error?: string;
  rowCount?: number;
}

export interface UserProfile {
  id: string;
  businessName: string;
  cleanerName: string;
  phone?: string;
  sheetId?: string;
  sheetUrl?: string;
  createdAt: string;
}

