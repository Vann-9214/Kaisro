import { useState, useEffect, useCallback, useMemo } from 'react';
import { eq, or, isNull, and, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { computeWeekDots, DayDots } from '@/utils/weekDots';
import { getMonthGridDates } from '@/utils/monthUtils';

export type MonthDotsMap = Record<string, DayDots>;

/**
 * Hook to compute indicator dots for all visible dates of a calendar month grid.
 *
 * Requirements:
 * - Up to 3 small colored dots under each date:
 *   - Primary for events
 *   - Tasks color for tasks
 *   - Deep amber / money color for spending
 * - Dates with nothing show no dots.
 * - Single queries per data type for the whole month (not one per date).
 * - Recurring events expanded onto every date they repeat on (daily, weekly, monthly).
 * - Reactive to changes via useCalendarSync.
 */
export function useMonthDots(year: number, month: number) {
  // Generate all 42 visible grid dates (6 weeks) for the given month
  const gridDates = useMemo(() => {
    return getMonthGridDates(year, month, 1);
  }, [year, month]);

  const [dotsMap, setDotsMap] = useState<MonthDotsMap>(() => {
    const initial: MonthDotsMap = {};
    for (const d of gridDates) {
      initial[d] = { hasEvents: false, hasTasks: false, hasExpenses: false };
    }
    return initial;
  });

  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  const fetchMonthDots = useCallback(async () => {
    if (!gridDates || gridDates.length === 0) return;

    try {
      const db = getDb();
      const startDateStr = gridDates[0];
      const endDateStr = gridDates[gridDates.length - 1];

      const startBound = `${startDateStr}T00:00:00`;
      const endBound = `${endDateStr}T23:59:59`;

      // 1. Single query for non-recurring events spanning the visible grid
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

      // 2. Single query for recurring candidates starting on or before end of visible grid
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

      // 3. Single query for tasks due in this visible month grid
      const monthTasks = await db
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

      // 4. Single query for expense transactions in this visible month grid
      const monthTransactions = await db
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

      // Pure dot computation reusing existing recurrence expansion
      const computed = computeWeekDots(
        gridDates,
        allEvents,
        monthTasks,
        monthTransactions
      );

      setDotsMap(computed);
    } catch (err) {
      console.error('[useMonthDots] Failed to fetch month indicator dots:', err);
    }
  }, [gridDates, refreshCounter]);

  useEffect(() => {
    fetchMonthDots();
  }, [fetchMonthDots]);

  return dotsMap;
}

export default useMonthDots;
