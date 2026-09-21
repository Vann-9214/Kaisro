/**
 * Kaisro Date & Week Utilities
 *
 * Implements ISO 8601 week calculations, Monday-start week strip generation,
 * and date string formatting helpers using local calendar dates.
 */

/**
 * Constant controlling the first day of the week.
 * Set to true for Monday-first (ISO 8601 standard), or false for Sunday-first.
 */
export const WEEK_STARTS_ON_MONDAY = true;

/**
 * First weekday index: 1 = Monday, 0 = Sunday.
 */
export const START_WEEKDAY = 1;

export interface WeekDayItem {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayAbbr: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  dayNum: number;
  isWeekend: boolean;
  isToday: boolean;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Formats a Date instance into a YYYY-MM-DD string using local calendar time.
 */
export function formatDateToISO(d: Date): string {
  const yr = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  const da = d.getDate().toString().padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date instance at 00:00:00.
 */
export function parseISODate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0] || '2026', 10);
  const month = parseInt(parts[1] || '1', 10) - 1;
  const day = parseInt(parts[2] || '1', 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Returns the ISO 8601 week number for a given date.
 *
 * In ISO 8601:
 * - Weeks start on Monday.
 * - Week 1 of any year is the week that contains the first Thursday of that year (or Jan 4).
 * - Days at the end of December may belong to Week 1 of the following year.
 * - Days at the beginning of January may belong to Week 52 or 53 of the preceding year.
 */
export function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Day of week in UTC: Sunday is 0 -> convert to 7
  const dayNum = date.getUTCDay() || 7;
  // Set date to nearest Thursday (current date + 4 - current day number)
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  // Get first day of that year
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Returns the ISO 8601 week label, e.g. "WEEK 39".
 */
export function getISOWeekLabel(d: Date): string {
  return `WEEK ${getISOWeekNumber(d)}`;
}

/**
 * Generates the 7 real consecutive calendar dates of the week containing the given date.
 *
 * - Returns exactly 7 days, Monday to Sunday (when startOnMonday is true).
 * - Starts from the week start on or before the given date.
 * - Crosses month and year boundaries naturally with zero blank cells.
 * - Performs date arithmetic strictly on local calendar dates (year, month, day) via
 *   Date constructors and setDate, never adding milliseconds, so daylight-saving or
 *   timezone shifts can never shift a day.
 *
 * @param selectedDate The anchor date
 * @param startOnMonday Whether the week starts on Monday (default: WEEK_STARTS_ON_MONDAY)
 * @param todayStr Optional reference YYYY-MM-DD string for today (defaults to now)
 */
export function getWeekDays(
  selectedDate: Date,
  startOnMonday: boolean = WEEK_STARTS_ON_MONDAY,
  todayStr?: string
): WeekDayItem[] {
  const currentTodayStr = todayStr ?? formatDateToISO(new Date());

  // Anchor to 00:00:00 local time
  const anchorYear = selectedDate.getFullYear();
  const anchorMonth = selectedDate.getMonth();
  const anchorDay = selectedDate.getDate();
  const anchor = new Date(anchorYear, anchorMonth, anchorDay, 0, 0, 0, 0);

  const dayOfWeek = anchor.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday

  // Day offset to start of the week:
  // If startOnMonday: Mon is 0, Tue is 1 ... Sun is 6
  // If Sunday-start: Sun is 0, Mon is 1 ... Sat is 6
  const offsetFromStart = startOnMonday
    ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    : dayOfWeek;

  const startYear = anchorYear;
  const startMonth = anchorMonth;
  const startDay = anchorDay - offsetFromStart;

  const abbrsMonday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const abbrsSunday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const abbrs = startOnMonday ? abbrsMonday : abbrsSunday;

  const days: WeekDayItem[] = [];

  for (let i = 0; i < 7; i++) {
    // Local date construction handles month and year rollovers deterministically
    const d = new Date(startYear, startMonth, startDay + i, 0, 0, 0, 0);
    const dStr = formatDateToISO(d);
    const dDay = d.getDay();
    const isWeekend = dDay === 0 || dDay === 6;

    days.push({
      date: d,
      dateStr: dStr,
      dayAbbr: abbrs[i] ?? '',
      dayNum: d.getDate(),
      isWeekend,
      isToday: dStr === currentTodayStr,
    });
  }

  return days;
}

/**
 * Backwards compatibility alias for getWeekDays.
 */
export const getWeekDates = getWeekDays;

/**
 * Shifts an ISO date string by a number of days using local calendar arithmetic.
 */
export function shiftDateByDays(dateStr: string, days: number): string {
  const date = parseISODate(dateStr);
  const shifted = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    0,
    0,
    0,
    0
  );
  return formatDateToISO(shifted);
}

/**
 * Shifts an ISO date string by a number of weeks using local calendar arithmetic.
 */
export function shiftDateByWeeks(dateStr: string, weeks: number): string {
  return shiftDateByDays(dateStr, weeks * 7);
}

/**
 * Calculates the number of calendar week chunks in a specific month.
 * Months typically span 4, 5, or 6 weeks depending on day offsets and length.
 */
export function getNumWeeksInMonth(
  year: number,
  month: number, // 0 to 11
  startOnMonday: boolean = WEEK_STARTS_ON_MONDAY
): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon
  const offsetDay1 = startOnMonday
    ? (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1)
    : firstDayOfWeek;
  return Math.ceil((offsetDay1 + daysInMonth) / 7);
}

/**
 * Returns the 1-based week chunk number (1 to numWeeks) within a month for a given Date.
 */
export function getWeekNumberOfDate(
  date: Date,
  startOnMonday: boolean = WEEK_STARTS_ON_MONDAY
): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const offsetDay1 = startOnMonday
    ? (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1)
    : firstDayOfWeek;
  const slotIndex = offsetDay1 + (day - 1);
  return Math.floor(slotIndex / 7) + 1;
}

/**
 * Calculates the 1-based calendar week of the month (1 to 5).
 * Each Monday (when startOnMonday = true) starts a new week of the month.
 */
export function getWeekOfMonth(
  date: Date,
  startOnMonday: boolean = WEEK_STARTS_ON_MONDAY
): number {
  return getWeekNumberOfDate(date, startOnMonday);
}

/**
 * Returns an uppercase ordinal week label for a week of the month,
 * e.g. 1 -> "1ST WEEK", 2 -> "2ND WEEK", 3 -> "3RD WEEK", 4 -> "4TH WEEK", 5 -> "5TH WEEK"
 */
export function getOrdinalWeekLabel(weekNum: number): string {
  const suffixes = ['TH', 'ST', 'ND', 'RD'];
  const v = weekNum % 100;
  const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  return `${weekNum}${suffix} WEEK`;
}

export interface MonthWeekDayItem {
  dateStr: string; // YYYY-MM-DD
  dayAbbr: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  dayNum: number; // e.g. 28, 29, 30, 1, 2, ...
  isWeekend: boolean;
  isToday: boolean;
  isGhost: boolean; // true if this slot falls outside the viewed month
  targetYear: number;
  targetMonth: number; // 0 to 11
  targetWeekNumber: number; // 1-based week chunk in targetMonth
}

/**
 * Generates the 7 slots of a specific week in a month.
 * Days that fall outside the month boundary are marked as `isGhost: true` with their
 * actual adjacent month date, day number, and navigation target coordinates.
 */
export function getMonthWeekDays(
  year: number,
  month: number, // 0 to 11
  weekNumber: number, // 1-based (1 to numWeeks)
  startOnMonday: boolean = WEEK_STARTS_ON_MONDAY,
  todayStr?: string
): MonthWeekDayItem[] {
  const currentTodayStr = todayStr ?? formatDateToISO(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const offsetDay1 = startOnMonday
    ? (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1)
    : firstDayOfWeek;

  const abbrsMonday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const abbrsSunday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const abbrs = startOnMonday ? abbrsMonday : abbrsSunday;

  const startIndex = (weekNumber - 1) * 7;
  const days: MonthWeekDayItem[] = [];

  for (let i = 0; i < 7; i++) {
    const slotIndex = startIndex + i;
    const rawDayNum = slotIndex - offsetDay1 + 1;
    const isWeekend = startOnMonday ? (i === 5 || i === 6) : (i === 0 || i === 6);

    // Calculate actual date (JavaScript Date cleanly handles offsets < 1 and > daysInMonth)
    const resolvedDate = new Date(year, month, rawDayNum, 0, 0, 0, 0);
    const dateStr = formatDateToISO(resolvedDate);
    const dayNum = resolvedDate.getDate();
    const isGhost = rawDayNum < 1 || rawDayNum > daysInMonth;
    const targetYear = resolvedDate.getFullYear();
    const targetMonth = resolvedDate.getMonth();
    const targetWeekNumber = isGhost
      ? getWeekNumberOfDate(resolvedDate, startOnMonday)
      : weekNumber;

    days.push({
      dateStr,
      dayAbbr: abbrs[i] ?? '',
      dayNum,
      isWeekend,
      isToday: dateStr === currentTodayStr,
      isGhost,
      targetYear,
      targetMonth,
      targetWeekNumber,
    });
  }

  return days;
}

