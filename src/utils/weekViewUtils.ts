import {
  formatDateToISO,
  parseISODate,
  getISOWeekNumber,
  WEEK_STARTS_ON_MONDAY,
  MONTH_NAMES,
} from '@/utils/dateUtils';

export interface WeekDayMiniItem {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayLetter: string; // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  dayNum: number;
  isToday: boolean;
  isGhost: boolean; // Outside the viewed month
}

export interface WeekRangeInfo {
  weekIndex: number; // 0 to N-1
  isoWeekNumber: number; // e.g. 38
  isoWeekLabel: string; // e.g. "Week 38"
  shortWeekLabel: string; // e.g. "W38"
  dateRangeLabel: string; // e.g. "Sep 14 – 20", "Aug 31 – Sep 6", "Dec 28, 2026 – Jan 3, 2027"
  startDate: Date; // Monday 00:00:00
  endDate: Date; // Sunday 23:59:59
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string; // YYYY-MM-DD
  days: WeekDayMiniItem[]; // 7 days Mon-Sun
  isCurrentWeek: boolean; // Contains today
  isPastWeek: boolean; // All 7 days are before today
}

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/**
 * Formats a week's Monday and Sunday dates into human-readable date range labels:
 * - Within same month: "Sep 14 – 20"
 * - Crossing month: "Aug 31 – Sep 6"
 * - Crossing year: "Dec 28, 2026 – Jan 3, 2027"
 */
export function formatWeekDateRange(startDate: Date, endDate: Date): string {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const startMonthIdx = startDate.getMonth();
  const endMonthIdx = endDate.getMonth();
  const startMonthStr = SHORT_MONTH_NAMES[startMonthIdx];
  const endMonthStr = SHORT_MONTH_NAMES[endMonthIdx];
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  if (startYear !== endYear) {
    return `${startMonthStr} ${startDay}, ${startYear} – ${endMonthStr} ${endDay}, ${endYear}`;
  }

  if (startMonthIdx !== endMonthIdx) {
    return `${startMonthStr} ${startDay} – ${endMonthStr} ${endDay}`;
  }

  return `${startMonthStr} ${startDay} – ${endDay}`;
}

/**
 * Generates all Monday-first weeks overlapping the given month (0-indexed).
 * From Monday on or before the 1st of the month to Sunday on or after the last day.
 * Returns 4, 5, or 6 weeks.
 */
export function getVisibleWeeksForMonth(
  year: number,
  month: number, // 0 to 11
  todayStr?: string
): WeekRangeInfo[] {
  const currentTodayStr = todayStr ?? formatDateToISO(new Date());

  // 1st of viewed month
  const firstOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  // Last day of viewed month
  const lastOfMonth = new Date(year, month + 1, 0, 0, 0, 0, 0);

  // Offset to Monday on or before the 1st:
  // getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const firstDayOfWeek = firstOfMonth.getDay();
  const offsetToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const currentMonday = new Date(year, month, 1 - offsetToMonday, 0, 0, 0, 0);
  const weeks: WeekRangeInfo[] = [];
  let weekIndex = 0;

  while (true) {
    const monday = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate(),
      0,
      0,
      0,
      0
    );
    const sunday = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate() + 6,
      23,
      59,
      59,
      999
    );

    // Thursday of this week defines its ISO week number
    const thursday = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate() + 3,
      0,
      0,
      0,
      0
    );
    const isoWeekNumber = getISOWeekNumber(thursday);

    const days: WeekDayMiniItem[] = [];
    let containsToday = false;
    let allDaysBeforeToday = true;

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(
        currentMonday.getFullYear(),
        currentMonday.getMonth(),
        currentMonday.getDate() + d,
        0,
        0,
        0,
        0
      );
      const dateStr = formatDateToISO(dayDate);
      const isToday = dateStr === currentTodayStr;
      if (isToday) {
        containsToday = true;
      }
      if (dateStr >= currentTodayStr) {
        allDaysBeforeToday = false;
      }

      const isGhost = dayDate.getMonth() !== month;

      days.push({
        date: dayDate,
        dateStr,
        dayLetter: WEEKDAY_LETTERS[d] ?? 'M',
        dayNum: dayDate.getDate(),
        isToday,
        isGhost,
      });
    }

    const startDateStr = formatDateToISO(monday);
    const endDateStr = formatDateToISO(sunday);

    weeks.push({
      weekIndex,
      isoWeekNumber,
      isoWeekLabel: `Week ${isoWeekNumber}`,
      shortWeekLabel: `W${isoWeekNumber}`,
      dateRangeLabel: formatWeekDateRange(monday, sunday),
      startDate: monday,
      endDate: sunday,
      startDateStr,
      endDateStr,
      days,
      isCurrentWeek: containsToday,
      isPastWeek: allDaysBeforeToday,
    });

    // Advance to next Monday
    currentMonday.setDate(currentMonday.getDate() + 7);
    weekIndex++;

    // Terminate if the Sunday of the week just created is on or after the last day of the month
    if (sunday.getTime() >= lastOfMonth.getTime()) {
      break;
    }
  }

  return weeks;
}

/**
 * Busiest day calculation rule:
 * - Highest count of events plus tasks.
 * - First one wins ties (lowest index 0-6).
 * - ONLY when the count is at least 2.
 * - Returns -1 if no day has count >= 2.
 */
export function calculateBusiestDayIndex(counts: number[]): number {
  if (!counts || counts.length === 0) return -1;

  let maxCount = 0;
  let busiestIdx = -1;

  for (let i = 0; i < counts.length; i++) {
    const c = counts[i] ?? 0;
    if (c >= 2 && c > maxCount) {
      maxCount = c;
      busiestIdx = i;
    }
  }

  return busiestIdx;
}

export interface SchedulableItem {
  dayStr: string; // YYYY-MM-DD
  isAllDay?: boolean;
  sortTime?: string; // e.g. "09:00:00" or ISO time
  title: string;
}

/**
 * Sort items for "What's inside":
 * 1. By day ascending (e.g. 2026-09-14 before 2026-09-15)
 * 2. All-day items first (isAllDay === true before false)
 * 3. By time ascending (e.g. "09:00" before "14:00")
 * 4. By title ascending
 */
export function sortWeekItems<T extends SchedulableItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 1. Day comparison
    if (a.dayStr !== b.dayStr) {
      return a.dayStr.localeCompare(b.dayStr);
    }

    // 2. All-day first
    const aAllDay = Boolean(a.isAllDay);
    const bAllDay = Boolean(b.isAllDay);
    if (aAllDay !== bAllDay) {
      return aAllDay ? -1 : 1;
    }

    // 3. Time comparison
    const aTime = a.sortTime || '99:99:99';
    const bTime = b.sortTime || '99:99:99';
    if (aTime !== bTime) {
      return aTime.localeCompare(bTime);
    }

    // 4. Title fallback
    return a.title.localeCompare(b.title);
  });
}
