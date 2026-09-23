import { Event, Task, Transaction, Category } from '@/db/schema';
import { parseISODate, shiftDateByDays, formatDateToISO } from '@/utils/dateUtils';
import { formatCurrency } from '@/constants/currency';
import { expandEventForDate } from '@/utils/recurrence';

export type AgendaItemType = 'event' | 'task' | 'expense';

export interface BaseAgendaItem {
  id: string; // Unique string key for React lists, e.g. "event-1"
  numericId: number;
  itemType: AgendaItemType;
  dateStr: string; // YYYY-MM-DD
  title: string;
  subtitle?: string | null;
  timeLabel: string;
  isAllDay: boolean;
  sortMinutes: number; // -1 for all day / untimed, 0..1439 for timed
}

export interface AgendaEventItem extends BaseAgendaItem {
  itemType: 'event';
  raw: Event;
  isRecurring: boolean;
  location?: string | null;
}

export interface AgendaTaskItem extends BaseAgendaItem {
  itemType: 'task';
  raw: Task;
  done: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AgendaExpenseItem extends BaseAgendaItem {
  itemType: 'expense';
  raw: Transaction;
  amountCentavos: number;
  category?: Category | null;
}

export type AgendaItem = AgendaEventItem | AgendaTaskItem | AgendaExpenseItem;

export interface AgendaDaySection {
  dateStr: string;
  dateLabel: string;
  isToday: boolean;
  summaryLabel: string;
  isEmptyToday: boolean;
  data: AgendaDayCardData[]; // SectionList item: 1 card container per day section
}

export interface AgendaDayCardData {
  dateStr: string;
  isEmptyToday: boolean;
  items: AgendaItem[];
}

/**
 * Format hour and minute into "9:00 AM" or "12:30 PM".
 */
export function formatTimeDisplay(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMin} ${period}`;
}

/**
 * Extracts hour and minute from an ISO date-time string (e.g. "2026-09-20T09:30:00").
 */
export function extractTimeFromISO(isoString: string): { hour: number; minute: number } | null {
  if (!isoString.includes('T')) return null;
  const timePart = isoString.split('T')[1];
  if (!timePart) return null;
  const [hStr, mStr] = timePart.split(':');
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  if (isNaN(hour) || isNaN(minute)) return null;
  return { hour, minute };
}

/**
 * Comparator for sorting agenda items within a day:
 * 1. All-day / anytime items first.
 * 2. Then chronologically by time.
 * 3. For equal times (or both untimed/all-day): events before tasks, tasks before expenses.
 * 4. Tie-break by numeric ID.
 */
export function compareAgendaItems(a: AgendaItem, b: AgendaItem): number {
  // 1. All-day items first
  if (a.isAllDay && !b.isAllDay) return -1;
  if (!a.isAllDay && b.isAllDay) return 1;

  // 2. Chronologically by time if neither is all-day
  if (!a.isAllDay && !b.isAllDay) {
    if (a.sortMinutes !== b.sortMinutes) {
      return a.sortMinutes - b.sortMinutes;
    }
  }

  // 3. For equal times (or both all-day): events < tasks < expenses
  const typeOrder: Record<AgendaItemType, number> = {
    event: 1,
    task: 2,
    expense: 3,
  };
  const typeDiff = typeOrder[a.itemType] - typeOrder[b.itemType];
  if (typeDiff !== 0) return typeDiff;

  // 4. Tie-break: by numeric ID
  return a.numericId - b.numericId;
}

const DAY_OF_WEEK_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_ABBRS = [
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

/**
 * Format Day Header Date Label:
 * - "Today · Sun, Sep 20" (in primary color)
 * - "Tomorrow · Mon, Sep 21"
 * - Otherwise "Wed, Sep 23" (same year) or "Wed, Jan 6, 2027" (different year)
 */
export function formatAgendaHeaderDate(
  dateStr: string,
  todayStr: string
): { label: string; isToday: boolean } {
  const tomorrowStr = shiftDateByDays(todayStr, 1);
  const targetYear = dateStr.split('-')[0];
  const todayYear = todayStr.split('-')[0];

  const d = parseISODate(dateStr);
  const dayAbbr = DAY_OF_WEEK_ABBRS[d.getDay()] ?? 'Sun';
  const monthAbbr = MONTH_ABBRS[d.getMonth()] ?? 'Sep';
  const dayNum = d.getDate();

  if (dateStr === todayStr) {
    return {
      label: `Today · ${dayAbbr}, ${monthAbbr} ${dayNum}`,
      isToday: true,
    };
  }

  if (dateStr === tomorrowStr) {
    return {
      label: `Tomorrow · ${dayAbbr}, ${monthAbbr} ${dayNum}`,
      isToday: false,
    };
  }

  if (targetYear !== todayYear) {
    return {
      label: `${dayAbbr}, ${monthAbbr} ${dayNum}, ${targetYear}`,
      isToday: false,
    };
  }

  return {
    label: `${dayAbbr}, ${monthAbbr} ${dayNum}`,
    isToday: false,
  };
}

/**
 * Format Day Header Summary on the right:
 * - When all items that day are one type, use that type's noun ("1 event", "2 tasks", "2 expenses").
 * - Otherwise "N items".
 * - Append " · ₱total" when the day has spending.
 */
export function formatAgendaHeaderSummary(items: AgendaItem[]): string {
  if (items.length === 0) return '';

  let eventCount = 0;
  let taskCount = 0;
  let expenseCount = 0;
  let totalSpentCentavos = 0;

  for (const item of items) {
    if (item.itemType === 'event') {
      eventCount++;
    } else if (item.itemType === 'task') {
      taskCount++;
    } else if (item.itemType === 'expense') {
      expenseCount++;
      if (item.raw.type === 'expense') {
        totalSpentCentavos += item.amountCentavos;
      }
    }
  }

  const distinctTypes =
    (eventCount > 0 ? 1 : 0) + (taskCount > 0 ? 1 : 0) + (expenseCount > 0 ? 1 : 0);

  let nounPart = '';
  if (distinctTypes === 1) {
    if (eventCount > 0) {
      nounPart = eventCount === 1 ? '1 event' : `${eventCount} events`;
    } else if (taskCount > 0) {
      nounPart = taskCount === 1 ? '1 task' : `${taskCount} tasks`;
    } else if (expenseCount > 0) {
      nounPart = expenseCount === 1 ? '1 expense' : `${expenseCount} expenses`;
    }
  } else {
    nounPart = items.length === 1 ? '1 item' : `${items.length} items`;
  }

  if (totalSpentCentavos > 0) {
    const showDecimals = totalSpentCentavos % 100 !== 0;
    nounPart += ` · ${formatCurrency(totalSpentCentavos, showDecimals)}`;
  }

  return nounPart;
}

/**
 * Transforms raw database events, dated tasks, and transactions into structured AgendaItems.
 */
export function transformDbItemsToAgendaItems(
  dateStr: string,
  events: Event[],
  tasks: Task[],
  transactions: Transaction[],
  categoriesMap: Map<number, Category>
): AgendaItem[] {
  const items: AgendaItem[] = [];

  // 1. Events for dateStr
  for (const ev of events) {
    const isAllDay = Boolean(ev.allDay);
    let timeLabel = 'All day';
    let sortMinutes = -1;

    if (!isAllDay) {
      const time = extractTimeFromISO(ev.start);
      if (time) {
        timeLabel = formatTimeDisplay(time.hour, time.minute);
        sortMinutes = time.hour * 60 + time.minute;
      }
    }

    const isRecurring = Boolean(ev.recurrence && ev.recurrence !== 'none');

    items.push({
      id: `event-${ev.id}-${dateStr}`,
      numericId: ev.id,
      itemType: 'event',
      dateStr,
      title: ev.title,
      subtitle: ev.location ?? null,
      timeLabel,
      isAllDay,
      sortMinutes,
      raw: ev,
      isRecurring,
      location: ev.location,
    });
  }

  // 2. Tasks for dateStr (dated tasks only)
  for (const tsk of tasks) {
    if (!tsk.dueAt) continue;
    const isTimed = tsk.dueAt.includes('T');
    let timeLabel = 'Anytime';
    let isAllDay = true;
    let sortMinutes = -1;

    if (isTimed) {
      const time = extractTimeFromISO(tsk.dueAt);
      if (time) {
        timeLabel = formatTimeDisplay(time.hour, time.minute);
        isAllDay = false;
        sortMinutes = time.hour * 60 + time.minute;
      }
    }

    const priority = tsk.priority ?? 'medium';
    const priorityLabel = `${priority.charAt(0).toUpperCase() + priority.slice(1)} priority`;

    items.push({
      id: `task-${tsk.id}`,
      numericId: tsk.id,
      itemType: 'task',
      dateStr,
      title: tsk.title,
      subtitle: priorityLabel,
      timeLabel,
      isAllDay,
      sortMinutes,
      raw: tsk,
      done: Boolean(tsk.done),
      priority,
    });
  }

  // 3. Transactions for dateStr
  for (const tx of transactions) {
    const isTimed = tx.date.includes('T');
    let timeLabel = 'Anytime';
    let isAllDay = true;
    let sortMinutes = -1;

    if (isTimed) {
      const time = extractTimeFromISO(tx.date);
      if (time) {
        timeLabel = formatTimeDisplay(time.hour, time.minute);
        isAllDay = false;
        sortMinutes = time.hour * 60 + time.minute;
      }
    }

    const category = tx.categoryId ? categoriesMap.get(tx.categoryId) ?? null : null;
    const subtitle = category?.name ?? (tx.type === 'expense' ? 'Expense' : 'Transaction');
    const title = tx.note && tx.note.trim().length > 0 ? tx.note : (category?.name ?? 'Expense');

    items.push({
      id: `expense-${tx.id}`,
      numericId: tx.id,
      itemType: 'expense',
      dateStr,
      title,
      subtitle,
      timeLabel,
      isAllDay,
      sortMinutes,
      raw: tx,
      amountCentavos: tx.amount,
      category,
    });
  }

  return items.sort(compareAgendaItems);
}

/**
 * Builds the array of AgendaDaySections for a given range of calendar days.
 * - Skips empty days, EXCEPT today if today falls in the range.
 * - If today has nothing, it shows a single muted line "Nothing planned".
 */
export function buildAgendaSections(
  calendarDays: string[],
  itemsByDate: Map<string, AgendaItem[]>,
  todayStr: string
): AgendaDaySection[] {
  const sections: AgendaDaySection[] = [];

  for (const dateStr of calendarDays) {
    const items = itemsByDate.get(dateStr) ?? [];
    const isToday = dateStr === todayStr;

    // Skip empty days, except today
    if (items.length === 0 && !isToday) {
      continue;
    }

    const { label: dateLabel } = formatAgendaHeaderDate(dateStr, todayStr);
    const summaryLabel = formatAgendaHeaderSummary(items);
    const isEmptyToday = isToday && items.length === 0;

    sections.push({
      dateStr,
      dateLabel,
      isToday,
      summaryLabel,
      isEmptyToday,
      data: [
        {
          dateStr,
          isEmptyToday,
          items,
        },
      ],
    });
  }

  return sections;
}

/**
 * Returns the quiet footer label based on days loaded:
 * - >= 365 days: "Showing the next year"
 * - otherwise: "Showing the next N weeks"
 */
export function getAgendaFooterLabel(daysLoaded: number): {
  label: string;
  canLoadMore: boolean;
} {
  if (daysLoaded >= 365) {
    return {
      label: 'Showing the next year',
      canLoadMore: false,
    };
  }

  const weeks = Math.round(daysLoaded / 7);
  return {
    label: `Showing the next ${weeks} weeks`,
    canLoadMore: true,
  };
}
