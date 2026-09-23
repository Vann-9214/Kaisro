import { useState, useEffect, useCallback } from 'react';
import { eq, or, isNull, and, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { expandEventForDate } from '@/utils/recurrence';
import {
  getVisibleWeeksForMonth,
  calculateBusiestDayIndex,
  sortWeekItems,
  WeekRangeInfo,
  SchedulableItem,
} from '@/utils/weekViewUtils';
import { parseTimeFromISO } from '@/utils/timelineLayout';

export interface WeekItemRow extends SchedulableItem {
  id: string;
  type: 'event' | 'task' | 'expense';
  dayStr: string; // YYYY-MM-DD
  title: string;
  subtitle: string;
  isAllDay: boolean;
  sortTime: string; // HH:mm:ss
  event?: schema.Event;
  task?: schema.Task;
  transaction?: schema.Transaction & { category?: schema.Category | null };
}

export interface WeekData {
  info: WeekRangeInfo;
  eventsCount: number;
  tasksDoneCount: number;
  tasksTotalCount: number;
  totalSpentCentavos: number;
  busiestDayIndex: number;
  dotsMap: Record<string, { hasEvents: boolean; hasTasks: boolean; hasExpenses: boolean }>;
  items: WeekItemRow[];
  dayCounts: number[];
}

export function useCalendarWeekView(
  year: number,
  month: number, // 0 to 11
  todayStr: string
) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMonthEmpty, setIsMonthEmpty] = useState<boolean>(false);

  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  const fetchWeekViewData = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = getDb();

      // 1. Generate the 4, 5, or 6 Monday-first visible weeks
      const visibleWeeks = getVisibleWeeksForMonth(year, month, todayStr);
      if (visibleWeeks.length === 0) {
        setWeeks([]);
        setIsMonthEmpty(true);
        setIsLoading(false);
        return;
      }

      const firstWeekStart = visibleWeeks[0].startDateStr;
      const lastWeekEnd = visibleWeeks[visibleWeeks.length - 1].endDateStr;
      const startBound = `${firstWeekStart}T00:00:00`;
      const endBound = `${lastWeekEnd}T23:59:59`;

      // 2. Single query for categories
      const allCategories = await db.select().from(schema.categories);
      const categoryMap = new Map<number, schema.Category>();
      allCategories.forEach((c) => categoryMap.set(c.id, c));

      // 3. Single query for non-recurring events in range
      const nonRecurringEvents = await db
        .select()
        .from(schema.events)
        .where(
          and(
            or(
              isNull(schema.events.recurrence),
              eq(schema.events.recurrence, 'none'),
              eq(schema.events.recurrence, 'NONE')
            ),
            sql`${schema.events.start} <= ${endBound}`,
            sql`COALESCE(${schema.events.end}, ${schema.events.start}) >= ${startBound}`
          )
        );

      // 4. Single query for recurring candidates starting on or before endBound
      const recurringCandidates = await db
        .select()
        .from(schema.events)
        .where(
          and(
            sql`${schema.events.recurrence} IS NOT NULL`,
            sql`${schema.events.recurrence} != 'none'`,
            sql`${schema.events.recurrence} != 'NONE'`,
            sql`${schema.events.start} <= ${endBound}`
          )
        );

      // 5. Single query for tasks due in visible range
      const rangeTasks = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            sql`${schema.tasks.dueAt} IS NOT NULL`,
            sql`${schema.tasks.dueAt} >= ${firstWeekStart}`,
            sql`${schema.tasks.dueAt} <= ${endBound}`
          )
        );

      // 6. Single query for expense transactions in visible range
      const rangeTransactions = await db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.type, 'expense'),
            sql`${schema.transactions.date} >= ${firstWeekStart}`,
            sql`${schema.transactions.date} <= ${endBound}`
          )
        );

      // Pre-group tasks and expenses by date string (YYYY-MM-DD)
      const tasksByDate = new Map<string, schema.Task[]>();
      for (const t of rangeTasks) {
        if (!t.dueAt) continue;
        const d = t.dueAt.split('T')[0];
        const existing = tasksByDate.get(d) ?? [];
        existing.push(t);
        tasksByDate.set(d, existing);
      }

      const expensesByDate = new Map<
        string,
        (schema.Transaction & { category?: schema.Category | null })[]
      >();
      for (const tx of rangeTransactions) {
        if (!tx.date) continue;
        const d = tx.date.split('T')[0];
        const enriched = {
          ...tx,
          category: tx.categoryId ? categoryMap.get(tx.categoryId) ?? null : null,
        };
        const existing = expensesByDate.get(d) ?? [];
        existing.push(enriched);
        expensesByDate.set(d, existing);
      }

      let totalMonthItemsCount = 0;

      // Build WeekData for each week
      const computedWeeks: WeekData[] = visibleWeeks.map((weekInfo) => {
        let eventsCount = 0;
        let tasksDoneCount = 0;
        let tasksTotalCount = 0;
        let totalSpentCentavos = 0;

        const dotsMap: Record<
          string,
          { hasEvents: boolean; hasTasks: boolean; hasExpenses: boolean }
        > = {};
        const dayCounts: number[] = [];
        const weekItems: WeekItemRow[] = [];

        // Iterate through the 7 days of the week (Mon to Sun)
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
          const dayItem = weekInfo.days[dayIdx];
          const dStr = dayItem.dateStr;

          dotsMap[dStr] = {
            hasEvents: false,
            hasTasks: false,
            hasExpenses: false,
          };

          // Find events for this day
          // A. Non-recurring events covering dStr
          const dayNonRecurring = nonRecurringEvents.filter((ev) => {
            const startDay = ev.start.split('T')[0];
            const endDay = ev.end ? ev.end.split('T')[0] : startDay;
            return startDay <= dStr && endDay >= dStr;
          });

          // B. Recurring events expanded onto dStr
          const dayRecurring: schema.Event[] = [];
          for (const cand of recurringCandidates) {
            const expanded = expandEventForDate(cand, dStr);
            if (expanded) {
              dayRecurring.push(expanded);
            }
          }

          const dayEvents = [...dayNonRecurring, ...dayRecurring];
          if (dayEvents.length > 0) {
            dotsMap[dStr].hasEvents = true;
            eventsCount += dayEvents.length;

            for (const ev of dayEvents) {
              const isAllDay = Boolean(ev.allDay);
              const timeParts = parseTimeFromISO(ev.start);
              const sortTime = isAllDay
                ? '00:00:00'
                : timeParts
                ? `${timeParts.hour.toString().padStart(2, '0')}:${timeParts.minute
                    .toString()
                    .padStart(2, '0')}:00`
                : '09:00:00';

              weekItems.push({
                id: `event-${ev.id}-${dStr}`,
                type: 'event',
                dayStr: dStr,
                title: ev.title,
                subtitle: ev.location ?? '',
                isAllDay,
                sortTime,
                event: ev,
              });
            }
          }

          // Tasks for this day
          const dayTasks = tasksByDate.get(dStr) ?? [];
          if (dayTasks.length > 0) {
            dotsMap[dStr].hasTasks = true;
            tasksTotalCount += dayTasks.length;

            for (const tsk of dayTasks) {
              if (tsk.done) {
                tasksDoneCount += 1;
              }
              const isAllDay = !tsk.dueAt?.includes('T');
              const timeParts = parseTimeFromISO(tsk.dueAt);
              const sortTime = isAllDay
                ? '12:00:00'
                : timeParts
                ? `${timeParts.hour.toString().padStart(2, '0')}:${timeParts.minute
                    .toString()
                    .padStart(2, '0')}:00`
                : '12:00:00';

              const priorityLabel = tsk.priority
                ? `${tsk.priority.charAt(0).toUpperCase() + tsk.priority.slice(1)} priority`
                : '';

              weekItems.push({
                id: `task-${tsk.id}`,
                type: 'task',
                dayStr: dStr,
                title: tsk.title,
                subtitle: priorityLabel,
                isAllDay,
                sortTime,
                task: tsk,
              });
            }
          }

          // Expenses for this day
          const dayExpenses = expensesByDate.get(dStr) ?? [];
          if (dayExpenses.length > 0) {
            dotsMap[dStr].hasExpenses = true;

            for (const tx of dayExpenses) {
              totalSpentCentavos += tx.amount;
              const isAllDay = !tx.date?.includes('T');
              const timeParts = parseTimeFromISO(tx.date);
              const sortTime = isAllDay
                ? '12:00:00'
                : timeParts
                ? `${timeParts.hour.toString().padStart(2, '0')}:${timeParts.minute
                    .toString()
                    .padStart(2, '0')}:00`
                : '12:00:00';

              const categoryName = tx.category?.name || 'Expense';

              weekItems.push({
                id: `expense-${tx.id}`,
                type: 'expense',
                dayStr: dStr,
                title: tx.note || categoryName,
                subtitle: categoryName,
                isAllDay,
                sortTime,
                transaction: tx,
              });
            }
          }

          // Total events + tasks for busiest-day rule
          dayCounts.push(dayEvents.length + dayTasks.length);
        }

        const busiestDayIndex = calculateBusiestDayIndex(dayCounts);
        const sortedItems = sortWeekItems(weekItems);

        totalMonthItemsCount += weekItems.length;

        return {
          info: weekInfo,
          eventsCount,
          tasksDoneCount,
          tasksTotalCount,
          totalSpentCentavos,
          busiestDayIndex,
          dotsMap,
          items: sortedItems,
          dayCounts,
        };
      });

      setWeeks(computedWeeks);
      setIsMonthEmpty(totalMonthItemsCount === 0);
    } catch (err) {
      console.error('[useCalendarWeekView] Failed to fetch week view data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, todayStr, refreshCounter]);

  useEffect(() => {
    fetchWeekViewData();
  }, [fetchWeekViewData]);

  // Toggle task completion with SQLite sync and triggerRefresh
  const toggleTask = useCallback(
    async (taskId: number, currentDone: boolean) => {
      const nextDone = !currentDone;
      const nowIso = new Date().toISOString();

      // Optimistic update
      setWeeks((prev) =>
        prev.map((wk) => {
          let updated = false;
          const nextItems = wk.items.map((item) => {
            if (item.type === 'task' && item.task?.id === taskId) {
              updated = true;
              return {
                ...item,
                task: {
                  ...item.task,
                  done: nextDone,
                  doneAt: nextDone ? nowIso : null,
                },
              };
            }
            return item;
          });

          if (!updated) return wk;

          const doneDelta = nextDone ? 1 : -1;
          return {
            ...wk,
            items: nextItems,
            tasksDoneCount: Math.max(0, wk.tasksDoneCount + doneDelta),
          };
        })
      );

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

        useCalendarSync.getState().triggerRefresh();
      } catch (err) {
        console.error('[useCalendarWeekView] Failed to toggle task in SQLite:', err);
        // Re-fetch on error to revert
        fetchWeekViewData();
      }
    },
    [fetchWeekViewData]
  );

  return {
    weeks,
    isLoading,
    isMonthEmpty,
    toggleTask,
    refetch: fetchWeekViewData,
  };
}
