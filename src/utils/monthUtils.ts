import { formatDateToISO, MONTH_NAMES } from '@/utils/dateUtils';

/**
 * Parses a YYYY-MM or YYYY-MM-DD string into year and month (1-based).
 */
export function parseYearMonth(str: string): { year: number; month: number } {
  const parts = str.split('-');
  const year = parseInt(parts[0] || '2026', 10);
  const month = parseInt(parts[1] || '1', 10);
  return { year, month };
}

/**
 * Formats year and month into "YYYY-MM" string.
 */
export function formatYearMonth(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Returns month name and year string, e.g. "September 2026".
 */
export function formatMonthYearHeader(year: number, month: number): string {
  const name = MONTH_NAMES[month - 1] ?? 'September';
  return `${name} ${year}`;
}

/**
 * Returns previous month year and 1-based month.
 */
export function getPrevMonth(year: number, month: number): { year: number; month: number; dateString: string } {
  if (month === 1) {
    const prevYear = year - 1;
    const prevMonth = 12;
    return { year: prevYear, month: prevMonth, dateString: `${prevYear}-12-01` };
  }
  const prevMonth = month - 1;
  return {
    year,
    month: prevMonth,
    dateString: `${year}-${prevMonth.toString().padStart(2, '0')}-01`,
  };
}

/**
 * Returns next month year and 1-based month.
 */
export function getNextMonth(year: number, month: number): { year: number; month: number; dateString: string } {
  if (month === 12) {
    const nextYear = year + 1;
    const nextMonth = 1;
    return { year: nextYear, month: nextMonth, dateString: `${nextYear}-01-01` };
  }
  const nextMonth = month + 1;
  return {
    year,
    month: nextMonth,
    dateString: `${year}-${nextMonth.toString().padStart(2, '0')}-01`,
  };
}

/**
 * Generates an array of 42 ISO date strings (YYYY-MM-DD) representing the 6-week
 * grid for a given month, starting with Monday (when firstDayOfWeek = 1).
 *
 * This guarantees coverage for all days visible in react-native-calendars,
 * including leading days from the previous month and trailing days from the next month.
 */
export function getMonthGridDates(
  year: number,
  month: number, // 1 to 12
  firstDayOfWeek: number = 1 // 1 for Monday
): string[] {
  // First day of month at local midnight
  const firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const dayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Offset from start of week:
  // If firstDayOfWeek = 1 (Monday): Mon is 0, Tue is 1, ..., Sun is 6
  const leadDays = firstDayOfWeek === 1
    ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    : dayOfWeek;

  const startDay = 1 - leadDays;
  const dates: string[] = [];

  // Generate 42 days (6 full 7-day weeks)
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month - 1, startDay + i, 0, 0, 0, 0);
    dates.push(formatDateToISO(d));
  }

  return dates;
}
