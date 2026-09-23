import { useState, useEffect, useCallback, useRef } from 'react';
import { sql, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { shiftDateByDays, formatDateToISO } from '@/utils/dateUtils';
import { expandEventForDate } from '@/utils/recurrence';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import {
  AgendaItem,
  AgendaDaySection,
  transformDbItemsToAgendaItems,
  buildAgendaSections,
  getAgendaFooterLabel,
} from '@/utils/agendaUtils';

const STEP_DAYS = 14;
const MAX_LOOKAHEAD_DAYS = 90;
const MAX_TOTAL_DAYS = 365;

export interface UseCalendarAgendaResult {
  sections: AgendaDaySection[];
  daysLoaded: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isEmpty: boolean;
  footerLabel: string;
  canLoadMore: boolean;
  loadMore: () => Promise<void>;
  resetToToday: () => void;
  toggleTask: (taskId: number, currentDone: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCalendarAgenda(startDayStr: string, todayStr: string): UseCalendarAgendaResult {
  const [sections, setSections] = useState<AgendaDaySection[]>([]);
  const [daysLoaded, setDaysLoaded] = useState<number>(STEP_DAYS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  // Store items by date in a ref for fast lookups and updates
  const itemsByDateRef = useRef<Map<string, AgendaItem[]>>(new Map());
  const categoriesMapRef = useRef<Map<number, schema.Category>>(new Map());
  const currentStartDayRef = useRef<string>(startDayStr);

  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  /**
   * Fetches data for an arbitrary date range using exactly 1 query per data type.
   */
  const fetchRangeRawData = useCallback(
    async (rangeStart: string, rangeEnd: string) => {
      const db = getDb();

      // Ensure categories are loaded
      if (categoriesMapRef.current.size === 0) {
        const allCats = await db.select().from(schema.categories);
        allCats.forEach((c) => categoriesMapRef.current.set(c.id, c));
      }

      // Query 1: Events (1 query: both non-recurring overlapping range and recurring candidates)
      const rawEvents = await db
        .select()
        .from(schema.events)
        .where(
          sql`(
            ((${schema.events.recurrence} IS NULL OR ${schema.events.recurrence} = 'none')
              AND substr(${schema.events.start}, 1, 10) <= ${rangeEnd}
              AND substr(COALESCE(${schema.events.end}, ${schema.events.start}), 1, 10) >= ${rangeStart})
            OR
            (${schema.events.recurrence} IS NOT NULL
              AND ${schema.events.recurrence} != 'none'
              AND substr(${schema.events.start}, 1, 10) <= ${rangeEnd})
          )`
        );

      // Query 2: Tasks (1 query: dated tasks only)
      const rawTasks = await db
        .select()
        .from(schema.tasks)
        .where(
          sql`${schema.tasks.dueAt} IS NOT NULL
            AND ${schema.tasks.dueAt} != ''
            AND substr(${schema.tasks.dueAt}, 1, 10) >= ${rangeStart}
            AND substr(${schema.tasks.dueAt}, 1, 10) <= ${rangeEnd}`
        );

      // Query 3: Transactions (1 query: dated in range)
      const rawTransactions = await db
        .select()
        .from(schema.transactions)
        .where(
          sql`substr(${schema.transactions.date}, 1, 10) >= ${rangeStart}
            AND substr(${schema.transactions.date}, 1, 10) <= ${rangeEnd}`
        );

      return {
        events: rawEvents,
        tasks: rawTasks,
        transactions: rawTransactions,
      };
    },
    []
  );

  /**
   * Maps raw items into the per-date item map for a slice of calendar days.
   */
  const populateDaysMap = useCallback(
    (
      calendarDays: string[],
      raw: {
        events: schema.Event[];
        tasks: schema.Task[];
        transactions: schema.Transaction[];
      }
    ): number => {
      let totalNewItems = 0;

      const nonRecurringEvents = raw.events.filter(
        (e) => !e.recurrence || e.recurrence === 'none'
      );
      const recurringCandidates = raw.events.filter(
        (e) => e.recurrence && e.recurrence !== 'none'
      );

      for (const d of calendarDays) {
        // Collect events for date d
        const dayEvents: schema.Event[] = [];

        // Direct non-recurring
        for (const ev of nonRecurringEvents) {
          const evStart = ev.start.split('T')[0];
          const evEnd = ev.end ? ev.end.split('T')[0] : evStart;
          if (evStart <= d && evEnd >= d) {
            dayEvents.push(ev);
          }
        }

        // Expanded recurring
        for (const cand of recurringCandidates) {
          const expanded = expandEventForDate(cand, d);
          if (expanded) {
            dayEvents.push(expanded);
          }
        }

        // Collect tasks due on date d
        const dayTasks = raw.tasks.filter((t) => t.dueAt && t.dueAt.startsWith(d));

        // Collect transactions on date d
        const dayTransactions = raw.transactions.filter((tx) => tx.date.startsWith(d));

        const agendaItems = transformDbItemsToAgendaItems(
          d,
          dayEvents,
          dayTasks,
          dayTransactions,
          categoriesMapRef.current
        );

        itemsByDateRef.current.set(d, agendaItems);
        totalNewItems += agendaItems.length;
      }

      return totalNewItems;
    },
    []
  );

  /**
   * Initial load: Loads the next 14 days from startDayStr.
   * If range has no items at all, automatically keeps looking ahead in 14-day steps
   * (up to 90 days) before deciding the list is empty.
   */
  const loadInitialAgenda = useCallback(async () => {
    setIsLoading(true);
    itemsByDateRef.current.clear();
    currentStartDayRef.current = startDayStr;

    try {
      let currentLoaded = STEP_DAYS;
      let rangeStart = startDayStr;
      let hasAnyItems = false;
      const allCalendarDays: string[] = [];

      // Step 1: Initial 14 days
      const firstChunkEnd = shiftDateByDays(rangeStart, STEP_DAYS - 1);
      const firstDays: string[] = [];
      for (let i = 0; i < STEP_DAYS; i++) {
        firstDays.push(shiftDateByDays(rangeStart, i));
      }
      allCalendarDays.push(...firstDays);

      const firstRaw = await fetchRangeRawData(rangeStart, firstChunkEnd);
      const firstCount = populateDaysMap(firstDays, firstRaw);

      if (firstCount > 0) {
        hasAnyItems = true;
      } else {
        // Look-ahead in 14-day steps up to MAX_LOOKAHEAD_DAYS
        while (currentLoaded < MAX_LOOKAHEAD_DAYS && !hasAnyItems) {
          const nextStart = shiftDateByDays(rangeStart, currentLoaded);
          const nextStep = Math.min(STEP_DAYS, MAX_LOOKAHEAD_DAYS - currentLoaded);
          const nextEnd = shiftDateByDays(nextStart, nextStep - 1);

          const nextDays: string[] = [];
          for (let i = 0; i < nextStep; i++) {
            nextDays.push(shiftDateByDays(nextStart, i));
          }
          allCalendarDays.push(...nextDays);

          const nextRaw = await fetchRangeRawData(nextStart, nextEnd);
          const nextCount = populateDaysMap(nextDays, nextRaw);

          currentLoaded += nextStep;
          if (nextCount > 0) {
            hasAnyItems = true;
            break;
          }
        }
      }

      setDaysLoaded(currentLoaded);

      if (!hasAnyItems) {
        setIsEmpty(true);
        setSections([]);
      } else {
        setIsEmpty(false);
        const builtSections = buildAgendaSections(
          allCalendarDays,
          itemsByDateRef.current,
          todayStr
        );
        setSections(builtSections);
      }
    } catch (err) {
      console.error('[useCalendarAgenda] Failed initial load:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDayStr, todayStr, fetchRangeRawData, populateDaysMap]);

  // Load initially or when startDayStr or refreshCounter changes
  useEffect(() => {
    loadInitialAgenda();
  }, [loadInitialAgenda, refreshCounter]);

  /**
   * Load more: Loads the next 14 days, appends them without re-rendering days already loaded
   * or jumping scroll position. Stops at 365 days ahead.
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || daysLoaded >= MAX_TOTAL_DAYS) return;

    try {
      setIsLoadingMore(true);
      const nextStart = shiftDateByDays(currentStartDayRef.current, daysLoaded);
      const nextStep = Math.min(STEP_DAYS, MAX_TOTAL_DAYS - daysLoaded);
      const nextEnd = shiftDateByDays(nextStart, nextStep - 1);

      const nextDays: string[] = [];
      for (let i = 0; i < nextStep; i++) {
        nextDays.push(shiftDateByDays(nextStart, i));
      }

      const nextRaw = await fetchRangeRawData(nextStart, nextEnd);
      populateDaysMap(nextDays, nextRaw);

      const newDaysLoaded = daysLoaded + nextStep;
      setDaysLoaded(newDaysLoaded);

      // Rebuild sections for all days loaded from start to end
      const allDays: string[] = [];
      for (let i = 0; i < newDaysLoaded; i++) {
        allDays.push(shiftDateByDays(currentStartDayRef.current, i));
      }

      const builtSections = buildAgendaSections(allDays, itemsByDateRef.current, todayStr);
      setSections(builtSections);

      // If we were previously showing empty state and now found items, update isEmpty
      if (builtSections.length > 0) {
        setIsEmpty(false);
      }
    } catch (err) {
      console.error('[useCalendarAgenda] Failed to load more:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [daysLoaded, isLoadingMore, todayStr, fetchRangeRawData, populateDaysMap]);

  /**
   * Toggles task completion in SQLite with instant optimistic update.
   */
  const toggleTask = useCallback(
    async (taskId: number, currentDone: boolean) => {
      const nextDone = !currentDone;
      const nowIso = new Date().toISOString();

      // 1. Optimistic update
      setSections((prevSections) =>
        prevSections.map((sec) => ({
          ...sec,
          data: sec.data.map((card) => ({
            ...card,
            items: card.items.map((it) =>
              it.itemType === 'task' && it.numericId === taskId
                ? { ...it, done: nextDone, raw: { ...it.raw, done: nextDone } }
                : it
            ),
          })),
        }))
      );

      // Also update ref map
      for (const [date, items] of itemsByDateRef.current.entries()) {
        const updated = items.map((it) =>
          it.itemType === 'task' && it.numericId === taskId
            ? { ...it, done: nextDone, raw: { ...it.raw, done: nextDone } }
            : it
        );
        itemsByDateRef.current.set(date, updated);
      }

      try {
        const db = getDb();
        await db
          .update(schema.tasks)
          .set({
            done: nextDone,
            doneAt: nextDone ? nowIso : null,
            updatedAt: nowIso,
          })
          .where(eq(schema.tasks.id, taskId));

        // Immediately notify all other tabs, views, and summaries
        useCalendarSync.getState().triggerRefresh();
      } catch (err) {
        console.error('[useCalendarAgenda] Failed to update task in SQLite:', err);
        // Rollback on error
        setSections((prevSections) =>
          prevSections.map((sec) => ({
            ...sec,
            data: sec.data.map((card) => ({
              ...card,
              items: card.items.map((it) =>
                it.itemType === 'task' && it.numericId === taskId
                  ? { ...it, done: currentDone, raw: { ...it.raw, done: currentDone } }
                : it
              ),
            })),
          }))
        );
      }
    },
    []
  );

  const resetToToday = useCallback(() => {
    currentStartDayRef.current = todayStr;
    setDaysLoaded(STEP_DAYS);
    loadInitialAgenda();
  }, [todayStr, loadInitialAgenda]);

  const { label: footerLabel, canLoadMore } = getAgendaFooterLabel(daysLoaded);

  return {
    sections,
    daysLoaded,
    isLoading,
    isLoadingMore,
    isEmpty,
    footerLabel,
    canLoadMore,
    loadMore,
    resetToToday,
    toggleTask,
    refresh: loadInitialAgenda,
  };
}

export default useCalendarAgenda;
