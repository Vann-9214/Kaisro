import { Event } from '@/db/schema';
import { expandEventForDate } from '@/utils/recurrence';

export interface DayDots {
  hasEvents: boolean;
  hasTasks: boolean;
  hasExpenses: boolean;
}

export type WeekDotsMap = Record<string, DayDots>;

export interface WeekTaskItem {
  id: number;
  dueAt: string | null;
}

export interface WeekTransactionItem {
  id: number;
  type: string;
  date: string;
}

/**
 * Pure function that computes the indicator dots for a 7-day week
 * given arrays of events, tasks, and transactions.
 *
 * Reuses recurring event expansion logic so recurring events show dots
 * on all their occurrence days on and after start date.
 */
export function computeWeekDots(
  weekDates: string[],
  events: Event[],
  tasks: WeekTaskItem[],
  transactions: WeekTransactionItem[]
): WeekDotsMap {
  const dotsMap: WeekDotsMap = {};

  for (const d of weekDates) {
    dotsMap[d] = {
      hasEvents: false,
      hasTasks: false,
      hasExpenses: false,
    };
  }

  // 1. Compute event dots
  const nonRecurringEvents = events.filter(
    (e) => !e.recurrence || e.recurrence === 'none'
  );
  const recurringEvents = events.filter(
    (e) => e.recurrence && e.recurrence !== 'none'
  );

  for (const d of weekDates) {
    const dayDots = dotsMap[d];
    if (!dayDots) continue;

    // Check non-recurring events
    for (const ev of nonRecurringEvents) {
      const startDay = ev.start.split('T')[0];
      const endDay = ev.end ? ev.end.split('T')[0] : startDay;
      if (startDay <= d && endDay >= d) {
        dayDots.hasEvents = true;
        break;
      }
    }

    if (dayDots.hasEvents) continue;

    // Check recurring events
    for (const recEv of recurringEvents) {
      const expanded = expandEventForDate(recEv, d);
      if (expanded) {
        dayDots.hasEvents = true;
        break;
      }
    }
  }

  // 2. Compute task dots
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const taskDay = t.dueAt.split('T')[0];
    if (dotsMap[taskDay]) {
      dotsMap[taskDay].hasTasks = true;
    }
  }

  // 3. Compute expense transaction dots
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.date) continue;
    const txDay = tx.date.split('T')[0];
    if (dotsMap[txDay]) {
      dotsMap[txDay].hasExpenses = true;
    }
  }

  return dotsMap;
}
