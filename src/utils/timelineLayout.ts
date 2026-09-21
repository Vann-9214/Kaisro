import * as schema from '@/db/schema';
import { TransactionWithCategory } from '@/hooks/useCalendarDay';

export const START_HOUR = 0; // 12:00 AM (midnight start of day)
export const END_HOUR = 24; // 12:00 AM (midnight end of day / closing line)
export const HOUR_HEIGHT = 72; // 72px per 1-hour slot

/**
 * Vertical pixel distance threshold within which the live "now" indicator
 * collides with an hour grid label. When Math.abs(nowLineTop - hourSlot.top) < 16,
 * the hour label is hidden to prevent unreadable text overlap.
 * Evaluated strictly in pixel space, ensuring invariance to HOUR_HEIGHT.
 */
export const COLLISION_THRESHOLD_PX = 16;

/**
 * Calculates the top pixel offset for the now line given hour and minute.
 */
export function computeNowTop(
  hour: number,
  minute: number,
  startHour: number = START_HOUR,
  hourHeight: number = HOUR_HEIGHT
): number {
  const totalMinutesSinceStart = (hour - startHour) * 60 + minute;
  return (totalMinutesSinceStart / 60) * hourHeight;
}

/**
 * Checks whether the now indicator collides with an hour label at a given slotTop.
 * Operates purely on pixel positions, ensuring strict invariance to HOUR_HEIGHT.
 */
export function isHourLabelColliding(
  nowLineTop: number,
  hourSlotTop: number,
  thresholdPx: number = COLLISION_THRESHOLD_PX
): boolean {
  return Math.abs(nowLineTop - hourSlotTop) < thresholdPx;
}

/**
 * Finds which hour slot in [startHour, endHour] is colliding with the now line.
 * Returns the hour number (0..24) or null if none collides.
 */
export function findCollidingHour(
  nowLineTop: number,
  startHour: number = START_HOUR,
  endHour: number = END_HOUR,
  hourHeight: number = HOUR_HEIGHT,
  thresholdPx: number = COLLISION_THRESHOLD_PX
): number | null {
  for (let h = startHour; h <= endHour; h++) {
    const slotTop = (h - startHour) * hourHeight;
    if (isHourLabelColliding(nowLineTop, slotTop, thresholdPx)) {
      return h;
    }
  }
  return null;
}

export type TimelineItemType = 'event' | 'task' | 'expense';

export interface TimelineLayoutItem {
  id: string;
  type: TimelineItemType;
  event?: schema.Event;
  task?: schema.Task;
  transaction?: TransactionWithCategory;
  startMinutes: number;
  endMinutes: number;
  top: number;
  height: number;
  colIndex: number;
  totalCols: number;
}

/**
 * Extracts hour and minute numbers from an ISO 8601 string.
 */
export function parseTimeFromISO(isoString?: string | null): { hour: number; minute: number } | null {
  if (!isoString) return null;
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (match && match[1] !== undefined && match[2] !== undefined) {
    return {
      hour: parseInt(match[1], 10),
      minute: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Formats hour and minute into a readable 12-hour format string (e.g. "12:00 AM", "9:00 AM", "2:30 PM").
 */
export function formatTimeDisplay(hour: number, minute: number = 0): string {
  if (hour === 0 || hour === 24) {
    return `12:${minute.toString().padStart(2, '0')} AM`;
  }
  const period = hour >= 12 && hour < 24 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Formats a start and optional end time ISO string into a concise range string.
 * Example: "2:00 PM – 3:30 PM" or "9:00 AM"
 */
export function formatTimeRange(startIso: string, endIso?: string | null): string {
  const start = parseTimeFromISO(startIso);
  if (!start) return '';
  const startFormatted = formatTimeDisplay(start.hour, start.minute);

  if (!endIso) return startFormatted;
  const end = parseTimeFromISO(endIso);
  if (!end) return startFormatted;
  const endFormatted = formatTimeDisplay(end.hour, end.minute);

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Computes Y top offset for any timed item on the timeline.
 */
export function computeItemTop(
  timeIso: string,
  startHour: number = START_HOUR,
  hourHeight: number = HOUR_HEIGHT
): number | null {
  const time = parseTimeFromISO(timeIso);
  if (!time) return null;
  const minutesSinceStart = (time.hour - startHour) * 60 + time.minute;
  return (minutesSinceStart / 60) * hourHeight;
}

/**
 * Calculates positioning and side-by-side column allocation for all timed timeline entries
 * across the full 24-hour day (START_HOUR = 0 to END_HOUR = 24).
 * Clamps events starting before midnight to the top and events running past midnight to the bottom.
 */
export function computeUnifiedTimelineLayout(
  events: schema.Event[],
  tasks: schema.Task[],
  transactions: TransactionWithCategory[],
  startHour: number = START_HOUR,
  hourHeight: number = HOUR_HEIGHT,
  selectedDateStr?: string
): TimelineLayoutItem[] {
  interface RawEntry {
    id: string;
    type: TimelineItemType;
    event?: schema.Event;
    task?: schema.Task;
    transaction?: TransactionWithCategory;
    startMinutes: number;
    endMinutes: number;
    durationMinutes: number;
  }

  const rawEntries: RawEntry[] = [];
  const maxDayMinutes = (END_HOUR - startHour) * 60; // 1440 minutes for 24 hours

  // 1. Process Timed Events
  for (const ev of events) {
    if (ev.allDay) continue;

    let startMinutes = 0;
    let endMinutes = maxDayMinutes;

    const startPart = ev.start.split('T');
    const startDate = startPart[0];
    const startTime = parseTimeFromISO(ev.start);

    // Event starting before midnight starts at the top (startMinutes = 0)
    if (selectedDateStr && startDate && startDate < selectedDateStr) {
      startMinutes = 0;
    } else if (startTime) {
      startMinutes = (startTime.hour - startHour) * 60 + startTime.minute;
    }

    if (ev.end) {
      const endPart = ev.end.split('T');
      const endDate = endPart[0];
      const endTime = parseTimeFromISO(ev.end);

      // Event running past midnight clamps to the bottom of the day
      if (selectedDateStr && endDate && endDate > selectedDateStr) {
        endMinutes = maxDayMinutes;
      } else if (endTime) {
        const calculatedEnd = (endTime.hour - startHour) * 60 + endTime.minute;
        if (calculatedEnd < startMinutes) {
          endMinutes = maxDayMinutes;
        } else {
          endMinutes = calculatedEnd;
        }
      } else {
        endMinutes = startMinutes + 45;
      }
    } else {
      endMinutes = startMinutes + 45;
    }

    // Strict boundary clamping
    startMinutes = Math.max(0, Math.min(maxDayMinutes, startMinutes));
    endMinutes = Math.max(startMinutes, Math.min(maxDayMinutes, endMinutes));

    const durationMinutes = Math.max(30, endMinutes - startMinutes);
    const clampedDuration = Math.min(durationMinutes, maxDayMinutes - startMinutes);

    rawEntries.push({
      id: `event-${ev.id}`,
      type: 'event',
      event: ev,
      startMinutes,
      endMinutes: startMinutes + clampedDuration,
      durationMinutes: clampedDuration,
    });
  }

  // 2. Process Timed Tasks
  for (const tsk of tasks) {
    if (!tsk.dueAt || !tsk.dueAt.includes('T')) continue;
    const due = parseTimeFromISO(tsk.dueAt);
    if (!due) continue;

    let startMinutes = (due.hour - startHour) * 60 + due.minute;
    startMinutes = Math.max(0, Math.min(maxDayMinutes - 34, startMinutes));
    const durationMinutes = 34; // task card visual height

    rawEntries.push({
      id: `task-${tsk.id}`,
      type: 'task',
      task: tsk,
      startMinutes,
      endMinutes: startMinutes + durationMinutes,
      durationMinutes,
    });
  }

  // 3. Process Timed Expenses
  for (const tx of transactions) {
    if (!tx.date || !tx.date.includes('T')) continue;
    const txTime = parseTimeFromISO(tx.date);
    if (!txTime) continue;

    let startMinutes = (txTime.hour - startHour) * 60 + txTime.minute;
    startMinutes = Math.max(0, Math.min(maxDayMinutes - 30, startMinutes));
    const durationMinutes = 30; // expense pill visual height

    rawEntries.push({
      id: `tx-${tx.id}`,
      type: 'expense',
      transaction: tx,
      startMinutes,
      endMinutes: startMinutes + durationMinutes,
      durationMinutes,
    });
  }

  if (rawEntries.length === 0) return [];

  // Sort ascending by start time, then descending by duration
  rawEntries.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return b.durationMinutes - a.durationMinutes;
  });

  // Group into overlapping clusters
  const clusters: RawEntry[][] = [];
  let currentCluster: RawEntry[] = [];
  let clusterEnd = -Infinity;

  for (const item of rawEntries) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMinutes;
    } else {
      if (item.startMinutes < clusterEnd) {
        currentCluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.endMinutes);
      } else {
        clusters.push(currentCluster);
        currentCluster = [item];
        clusterEnd = item.endMinutes;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns per cluster
  const result: TimelineLayoutItem[] = [];

  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const itemCols = new Map<RawEntry, number>();

    for (const item of cluster) {
      let placedCol = -1;
      for (let c = 0; c < columnEnds.length; c++) {
        const colEnd = columnEnds[c];
        if (colEnd !== undefined && colEnd <= item.startMinutes) {
          placedCol = c;
          columnEnds[c] = item.endMinutes;
          break;
        }
      }

      if (placedCol === -1) {
        placedCol = columnEnds.length;
        columnEnds.push(item.endMinutes);
      }

      itemCols.set(item, placedCol);
    }

    const totalCols = columnEnds.length;

    for (const item of cluster) {
      const colIndex = itemCols.get(item) ?? 0;
      const top = (item.startMinutes / 60) * hourHeight;
      const height = (item.durationMinutes / 60) * hourHeight;

      result.push({
        id: item.id,
        type: item.type,
        event: item.event,
        task: item.task,
        transaction: item.transaction,
        startMinutes: item.startMinutes,
        endMinutes: item.endMinutes,
        top,
        height: Math.max(30, height),
        colIndex,
        totalCols,
      });
    }
  }

  return result;
}

export interface ScrollTargetOptions {
  dateStr: string;
  todayStr: string;
  timelineOffsetY: number;
  viewportHeight: number;
  contentHeight: number;
  nowMinutes?: number;
  earliestItemTop?: number | null;
  hourHeight?: number;
  startHour?: number;
  isEmpty?: boolean;
}

/**
 * Calculates initial and day-switch scroll target Y offset.
 * - On empty day: returns 0 so the day summary card and inline empty banner are immediately visible.
 * - On Today (with items): scrolls so "now" line sits ~35% from top of timeline area.
 * - On other days (with items): scrolls to earliest item, or 7:00 AM if empty.
 * - Strictly clamped to [0, contentHeight - viewportHeight] so it never overscrolls.
 */
export function calculateTimelineScrollTarget({
  dateStr,
  todayStr,
  timelineOffsetY,
  viewportHeight,
  contentHeight,
  nowMinutes,
  earliestItemTop,
  hourHeight = HOUR_HEIGHT,
  startHour = START_HOUR,
  isEmpty = false,
}: ScrollTargetOptions): number {
  if (isEmpty) {
    return 0;
  }

  const isToday = dateStr === todayStr;
  let targetY: number;

  if (isToday) {
    let minutes = nowMinutes;
    if (minutes === undefined) {
      const now = new Date();
      minutes = now.getHours() * 60 + now.getMinutes();
    }
    const nowTop = ((minutes - startHour * 60) / 60) * hourHeight;
    // Scroll so the "now" line sits ~35% from top of visible timeline/viewport area
    targetY = timelineOffsetY + nowTop - Math.round(viewportHeight * 0.35);
  } else {
    // For other days: earliest item or 7:00 AM if empty
    let itemTop = 7 * hourHeight; // 504px for 7:00 AM
    if (earliestItemTop !== undefined && earliestItemTop !== null) {
      itemTop = earliestItemTop;
    }
    targetY = timelineOffsetY + itemTop - 16;
  }

  // Clamping: never scroll past start (0) or end (contentHeight - viewportHeight)
  const maxScrollY = Math.max(0, contentHeight - viewportHeight);
  return Math.max(0, Math.min(maxScrollY, Math.round(targetY)));
}
