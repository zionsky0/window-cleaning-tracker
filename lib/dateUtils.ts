import { Customer, DueCategory } from './types';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds specified number of weeks to a date and returns YYYY-MM-DD
 */
export function addWeeksToDate(dateString: string, weeks: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + weeks * 7);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes difference in calendar days between targetDate and today.
 */
export function getDaysDifference(targetDateString: string, baseDateString = getTodayDateString()): number {
  const [y1, m1, d1] = targetDateString.split('-').map(Number);
  const [y2, m2, d2] = baseDateString.split('-').map(Number);

  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();

  const diffTime = t1 - t2;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determines which queue category a customer falls into
 */
export function getCustomerDueCategory(customer: Customer, todayStr = getTodayDateString()): DueCategory {
  if (customer.lastCleanedDate === todayStr) {
    return 'completed_today';
  }

  const diffDays = getDaysDifference(customer.nextDueDate, todayStr);

  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays === 0) {
    return 'due_today';
  } else if (diffDays <= 7) {
    return 'due_this_week';
  } else {
    return 'upcoming';
  }
}

/**
 * Human friendly display of due dates
 */
export function formatFriendlyDue(targetDateString: string, todayStr = getTodayDateString()): {
  text: string;
  isUrgent: boolean;
  isToday: boolean;
  colorClass: string;
} {
  const diffDays = getDaysDifference(targetDateString, todayStr);

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      text: daysAgo === 1 ? '1 day overdue' : `${daysAgo} days overdue`,
      isUrgent: true,
      isToday: false,
      colorClass: 'text-red-700 bg-red-100 border-red-300 font-semibold',
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Due Today',
      isUrgent: false,
      isToday: true,
      colorClass: 'text-amber-800 bg-amber-100 border-amber-300 font-bold',
    };
  }

  if (diffDays === 1) {
    return {
      text: 'Due Tomorrow',
      isUrgent: false,
      isToday: false,
      colorClass: 'text-blue-700 bg-blue-100 border-blue-200',
    };
  }

  if (diffDays <= 7) {
    return {
      text: `In ${diffDays} days`,
      isUrgent: false,
      isToday: false,
      colorClass: 'text-emerald-700 bg-emerald-100 border-emerald-200',
    };
  }

  return {
    text: formatDateDisplay(targetDateString),
    isUrgent: false,
    isToday: false,
    colorClass: 'text-slate-600 bg-slate-100 border-slate-200',
  };
}

/**
 * Formats "2026-09-23" to "Wed, 23 Sep"
 */
export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export interface WeekDayInfo {
  dateString: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Returns the 7 days of the current week (Monday to Sunday)
 */
export function getCurrentWeekDates(todayStr = getTodayDateString()): WeekDayInfo[] {
  const [y, m, d] = todayStr.split('-').map(Number);
  const today = new Date(y, m - 1, d);

  // Monday is day 1 in UK weeks (Sunday is 0 in JS)
  const dayOfWeek = today.getDay();
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + distanceToMonday);

  const days: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);

    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    days.push({
      dateString,
      dayName: cur.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNumber: cur.getDate(),
      monthName: cur.toLocaleDateString('en-GB', { month: 'short' }),
      isToday: dateString === todayStr,
      isPast: dateString < todayStr,
    });
  }

  return days;
}

export interface MonthDayInfo {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Returns a 35 or 42 day grid representing a month calendar (Monday to Sunday)
 */
export function getMonthMatrix(year: number, month: number, todayStr = getTodayDateString()): MonthDayInfo[] {
  // First day of target month (1-indexed month)
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Day of week: 0 = Sun, 1 = Mon ... 6 = Sat
  let firstDayOfWeek = firstDay.getDay();
  // Convert so Monday = 0, Sunday = 6
  let startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const days: MonthDayInfo[] = [];

  // Previous month padding
  for (let i = startOffset; i > 0; i--) {
    const prevDate = new Date(year, month - 1, 1 - i);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    const d = String(prevDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;
    days.push({
      dateString,
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isPast: dateString < todayStr,
    });
  }

  // Current month days
  const totalDaysInMonth = lastDay.getDate();
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const curDate = new Date(year, month - 1, i);
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, '0');
    const d = String(curDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;
    days.push({
      dateString,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      isPast: dateString < todayStr,
    });
  }

  // Next month padding to round up to full weeks (multiples of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month, i);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    const d = String(nextDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;
    days.push({
      dateString,
      dayNumber: nextDate.getDate(),
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isPast: dateString < todayStr,
    });
  }

  return days;
}

/**
 * Extracts a recognizable street or neighborhood name from an address
 * e.g., "14 High Street, Manchester, M20 4AB" -> "High Street"
 */
export function extractStreetOrArea(address: string): string {
  if (!address) return 'Unspecified Area';
  // Split on comma
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return address;

  // The first part often has house number + street name (e.g. "124 Victoria Road")
  // Strip leading house numbers or flat numbers: "12A High Street" -> "High Street"
  const firstPart = parts[0];
  const cleaned = firstPart.replace(/^(\d+[\w\/-]*|\bFlat\s+\w+|\bUnit\s+\w+)\s+/i, '').trim();

  if (cleaned.length > 2) {
    return cleaned;
  }

  // Fallback to second part or full first part
  return parts.length > 1 ? parts[1] : firstPart;
}
