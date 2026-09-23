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
 * Negative means in the past (overdue).
 * 0 means today.
 * Positive means in the future.
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
 * Human friendly display of due dates (e.g. "Today", "Yesterday", "3 days overdue", "In 2 days")
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
