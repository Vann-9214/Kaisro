import { useState, useEffect, useCallback, useMemo } from 'react';
import { eq, like, or, isNull, and, sql } from 'drizzle-orm';
import { create } from 'zustand';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { eventsForDate } from '@/utils/recurrence';
import { toggleTaskCompletion } from '@/db/taskActions';
import { formatDateToISO } from '@/utils/dateUtils';
import { deleteEventAndUnlinkNotes } from '@/db/eventActions';
import { replaceTargetNotes } from '@/db/linkActions';

export interface CalendarDaySummary {
  eventsCount: number;
  tasksLeftCount: number;
  totalTasksCount: number;
  totalSpentCentavos: number;
}

export interface TransactionWithCategory extends schema.Transaction {
  category?: schema.Category | null;
}

interface CalendarSyncState {
  refreshCounter: number;
  triggerRefresh: () => void;
}

export const useCalendarSync = create<CalendarSyncState>((set) => ({
  refreshCounter: 0,
  triggerRefresh: () => set((s) => ({ refreshCounter: s.refreshCounter + 1 })),
}));

export async function createEvent(data: schema.NewEvent, noteIds?: number[]): Promise<schema.Event> {
  if (!data.title.trim()) throw new Error('Event title is required.');
  if (!Number.isFinite(new Date(data.start).getTime()) || (data.end && (!Number.isFinite(new Date(data.end).getTime()) || new Date(data.end) < new Date(data.start)))) throw new Error('Choose a valid event time range.');
  const db = getDb();
  const now = new Date().toISOString();
  const created = db.transaction(tx => {
    const row = tx.insert(schema.events).values({
    ...data,
    createdAt: now,
    updatedAt: now,
    }).returning().get();
    if (noteIds) replaceTargetNotes(tx, { targetType: 'event', targetId: row.id }, noteIds);
    return row;
  });
  useCalendarSync.getState().triggerRefresh();
  return created;
}

export async function updateEvent(
  id: number,
  data: Partial<schema.NewEvent>
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .update(schema.events)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(schema.events.id, id));
  useCalendarSync.getState().triggerRefresh();
}

export async function deleteEvent(id: number): Promise<void> {
  const db = getDb();
  deleteEventAndUnlinkNotes(db, id);
  useCalendarSync.getState().triggerRefresh();
}

export function useCalendarDay(selectedDateStr: string | null) {
  const [events, setEvents] = useState<schema.Event[]>([]);
  const [tasks, setTasks] = useState<schema.Task[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<schema.Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  const fetchDayData = useCallback(async () => {
    if (!selectedDateStr) {
      setEvents([]);
      setTasks([]);
      setTransactions([]);
      setCategories([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const db = getDb();

      // Today's ISO date string (YYYY-MM-DD)
      const todayStr = formatDateToISO(new Date());
      const isViewingToday = selectedDateStr === todayStr;

      // 1. Fetch Categories for transaction enrichment
      const allCategories = await db.select().from(schema.categories);
      setCategories(allCategories);
      const categoryMap = new Map<number, schema.Category>();
      allCategories.forEach((cat) => categoryMap.set(cat.id, cat));

      // 2. Fetch Events for the selected date
      const endOfDay = `${selectedDateStr}T23:59:59`;
      const startOfDay = `${selectedDateStr}T00:00:00`;

      // 2A. Direct non-recurring events
      const nonRecurringEvents = await db
        .select()
        .from(schema.events)
        .where(
          and(
            or(
              isNull(schema.events.recurrence),
              eq(schema.events.recurrence, 'none')
            ),
            or(
              like(schema.events.start, `${selectedDateStr}%`),
              and(
                sql`${schema.events.start} <= ${endOfDay}`,
                sql`COALESCE(${schema.events.end}, ${schema.events.start}) >= ${startOfDay}`
              )
            )
          )
        );

      // 2B. Recurring events that started on or before endOfDay
      const recurringCandidates = await db
        .select()
        .from(schema.events)
        .where(
          and(
            sql`${schema.events.recurrence} IS NOT NULL`,
            sql`${schema.events.recurrence} != 'none'`,
            sql`${schema.events.start} <= ${endOfDay}`
          )
        );

      const expandedRecurring: schema.Event[] = [];
      for (const cand of recurringCandidates) {
        expandedRecurring.push(...eventsForDate(cand, selectedDateStr));
      }

      // Merge and sort
      const dayEvents = [...nonRecurringEvents, ...expandedRecurring].sort(
        (a, b) => a.start.localeCompare(b.start)
      );

      // 3. Fetch Tasks due on this day (or undated tasks if viewing today)
      const dayTasks = isViewingToday
        ? await db
            .select()
            .from(schema.tasks)
            .where(
              or(
                like(schema.tasks.dueAt, `${selectedDateStr}%`),
                isNull(schema.tasks.dueAt)
              )
            )
        : await db
            .select()
            .from(schema.tasks)
            .where(like(schema.tasks.dueAt, `${selectedDateStr}%`));

      // 4. Fetch Transactions on the selected date
      const dayTransactions = await db
        .select()
        .from(schema.transactions)
        .where(like(schema.transactions.date, `${selectedDateStr}%`));

      const enrichedTransactions: TransactionWithCategory[] = dayTransactions.map((tx) => ({
        ...tx,
        category: tx.categoryId ? categoryMap.get(tx.categoryId) ?? null : null,
      }));

      setEvents(dayEvents);
      setTasks(dayTasks);
      setTransactions(enrichedTransactions);
    } catch (err) {
      console.error('[useCalendarDay] Failed to fetch calendar day data:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateStr, refreshCounter]);

  useEffect(() => {
    fetchDayData();
  }, [fetchDayData]);

  // Toggle task completion with instant optimistic update
  const toggleTask = useCallback(
    async (taskId: number, currentDone: boolean) => {
      const nextDone = !currentDone;
      const nowIso = new Date().toISOString();

      // Optimistic update for 0ms UI lag
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                done: nextDone,
                doneAt: nextDone ? nowIso : null,
                updatedAt: nowIso,
              }
            : t
        )
      );

      try {
        const db = getDb();
        toggleTaskCompletion(db, taskId);
        useCalendarSync.getState().triggerRefresh();
      } catch (err) {
        console.error('[useCalendarDay] Failed to update task in SQLite:', err);
        // Rollback on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  done: currentDone,
                  doneAt: currentDone ? t.doneAt : null,
                }
              : t
          )
        );
      }
    },
    []
  );

  // Groupings and calculations
  const allDayEvents = useMemo(() => events.filter((e) => e.allDay), [events]);
  const timedEvents = useMemo(() => events.filter((e) => !e.allDay), [events]);

  const untimedTasks = useMemo(
    () => tasks.filter((t) => !t.dueAt || !t.dueAt.includes('T')),
    [tasks]
  );
  const timedTasks = useMemo(
    () => tasks.filter((t) => t.dueAt && t.dueAt.includes('T')),
    [tasks]
  );

  const timedTransactions = useMemo(
    () => transactions.filter((t) => t.date && t.date.includes('T')),
    [transactions]
  );

  const summary = useMemo<CalendarDaySummary>(() => {
    const eventsCount = events.length;
    const totalTasksCount = tasks.length;
    const tasksLeftCount = tasks.filter((t) => !t.done).length;
    const totalSpentCentavos = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      eventsCount,
      tasksLeftCount,
      totalTasksCount,
      totalSpentCentavos,
    };
  }, [events, tasks, transactions]);

  return {
    events,
    tasks,
    transactions,
    categories,
    summary,
    allDayEvents,
    timedEvents,
    untimedTasks,
    timedTasks,
    timedTransactions,
    toggleTask,
    refresh: fetchDayData,
    createEvent,
    updateEvent,
    deleteEvent,
    isLoading,
    error,
  };
}

export default useCalendarDay;
