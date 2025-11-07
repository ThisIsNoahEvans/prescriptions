import { normalizeDate as normalizeDateUtil } from './dateUtils';

/**
 * Normalizes a date to midnight (start of the day).
 */
export function normalizeDate(date: Date): Date {
  return normalizeDateUtil(date);
}

/**
 * Gets the first day of the month
 */
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Gets the last day of the month
 */
export function getLastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Gets the first day of the week for the calendar view (Sunday = 0)
 */
export function getFirstDayOfWeek(date: Date): number {
  const firstDay = getFirstDayOfMonth(date);
  return firstDay.getDay();
}

/**
 * Gets all days in a month for calendar display
 */
export function getDaysInMonth(date: Date): Date[] {
  const firstDay = getFirstDayOfMonth(date);
  const lastDay = getLastDayOfMonth(date);
  const days: Date[] = [];
  
  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(firstDay);
    prevDate.setDate(prevDate.getDate() - i - 1);
    days.push(prevDate);
  }
  
  // Add all days in the current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(date.getFullYear(), date.getMonth(), day));
  }
  
  // Add days from next month to fill the last week (42 days total for 6 weeks)
  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    days.push(new Date(date.getFullYear(), date.getMonth() + 1, day));
  }
  
  return days;
}

/**
 * Checks if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Formats month and year for display
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Gets the day name abbreviation
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

