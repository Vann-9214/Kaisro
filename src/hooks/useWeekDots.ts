import { useState, useEffect, useCallback } from 'react';
import { eq, or, isNull, and, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { computeWeekDots, WeekDotsMap } from '@/utils/weekDots';

/**
 * Hook to compute indicator dots for the visible 7 days of the week strip.
 *
 * Requirements:
 * - Up to 3 small colored dots (~5dp): primary for events, tasks color for tasks, deep amber for spending.
 * - Empty days show nothing.
 * - Computed using single queries per data type (not one per day).
 * - Reuses recurring event expansion logic.
 * - Reactive to calendar updates via useCalendarSync.
 */
export function useWeekDots(weekDates: string[]) {
  const [dotsMap, setDotsMap] = useState<WeekDotsMap>(() => {
    const initial: WeekDotsMap = {};
    for (const d of weekDates) {
      initial[d] = { hasEvents: false, hasTasks: false, hasExpenses: false };
    }
    return initial;
  });

  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  const fetchWeekDots = useCallback(async () => {
    if (!weekDates || weekDates.length === 0) return;

    try {
      const db = getDb();
      const startDateStr = weekDates[0];
      const endDateStr = weekDates[weekDates.length - 1];

      const startBound = `${startDateStr}T00:00:00`;
      const endBound = `${endDateStr}T23:59:59`;

      // 1. Single query for non-recurring events spanning the week
      const nonRecurringEvents = await db
        .select()
        .from(schema.events)
        .where(
          and(
            or(
              isNull(schema.events.recurrence),
              eq(schema.events.recurrence, 'none')
            ),
            sql`${schema.events.start} <= ${endBound}`,
            sql`COALESCE(${schema.events.end}, ${schema.events.start}) >= ${startBound}`
          )
        );

      // 2. Single query for recurring candidates starting on or before end of the week
      const recurringCandidates = await db
        .select()
        .from(schema.events)
        .where(
          and(
            sql`${schema.events.recurrence} IS NOT NULL`,
            sql`${schema.events.recurrence} != 'none'`,
            sql`${schema.events.start} <= ${endBound}`
          )
        );

      const allEvents = [...nonRecurringEvents, ...recurringCandidates];

      // 3. Single query for tasks due in this week
      const weekTasks = await db
        .select({
          id: schema.tasks.id,
          dueAt: schema.tasks.dueAt,
        })
        .from(schema.tasks)
        .where(
          and(
            sql`${schema.tasks.dueAt} IS NOT NULL`,
            sql`${schema.tasks.dueAt} >= ${startDateStr}`,
            sql`${schema.tasks.dueAt} <= ${endBound}`
          )
        );

      // 4. Single query for expense transactions in this week
      const weekTransactions = await db
        .select({
          id: schema.transactions.id,
          type: schema.transactions.type,
          date: schema.transactions.date,
        })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.type, 'expense'),
            sql`${schema.transactions.date} >= ${startDateStr}`,
            sql`${schema.transactions.date} <= ${endBound}`
          )
        );

      const computed = computeWeekDots(
        weekDates,
        allEvents,
        weekTasks,
        weekTransactions
      );
      setDotsMap(computed);
    } catch (err) {
      console.error('[useWeekDots] Failed to fetch week indicator dots:', err);
    }
  }, [weekDates.join(','), refreshCounter]);

  useEffect(() => {
    fetchWeekDots();
  }, [fetchWeekDots]);

  return dotsMap;
}

export default useWeekDots;
