import type { Event, Task, Transaction, Category } from '../db/schema';
import type { PlannerPreferences } from '../db/preferencesActions';
import { formatDateToISO, parseISODate, shiftDateByDays } from '../utils/dateUtils';
import { eventsForDate, reminderOffsets } from '../utils/recurrence';
import { buildTaskList } from '../utils/taskListUtils';
import { buildBudget, budgetAlert, localDay } from '../utils/budgetUtils';
import { formatCurrency } from '../constants/currency';

export interface PlannedNotification {
  id: string; timestamp: number; title: string; body: string;
  kind: 'event' | 'task' | 'digest'; taskId?: number; dueAt?: string;
}
export interface TaskNotificationState { snoozedUntil?: number; snoozedDueAt?: string; dismissedDueAt?: string }
export interface PlannerData { events: Event[]; tasks: Task[]; transactions: Transaction[]; categories: Category[] }
export const MAX_TRIGGER_COUNT = 45; // Leaves room for explicit snoozes and platform bookkeeping.
export function dailySummary(data: PlannerData, date: Date) {
  const day = formatDateToISO(date);
  const events = data.events.flatMap(event => eventsForDate(event, day));
  const today = buildTaskList(data.tasks, [], 'today', date);
  const spending = data.transactions.filter(entry => entry.type === 'expense' && localDay(entry.date) === day).reduce((sum, entry) => sum + entry.amount, 0);
  return { remaining: today.remaining, body: `${events.length} events · ${today.remaining} tasks left · ${formatCurrency(spending)} spent` };
}
export function planNotifications(data: PlannerData, settings: PlannerPreferences, now: Date, taskState: Record<number, TaskNotificationState> = {}): PlannedNotification[] {
  const candidates: PlannedNotification[] = [];
  const today = formatDateToISO(now);
  const add = (notification: PlannedNotification) => { if (Number.isFinite(notification.timestamp) && notification.timestamp > now.getTime()) candidates.push(notification); };
  if (settings.eventReminders) for (let offset = 0; offset < 60; offset++) {
    const day = shiftDateByDays(today, offset);
    for (const event of data.events.flatMap(row => eventsForDate(row, day))) {
      if (event.start.slice(0, 10) !== day) continue;
      const starts = event.start.includes('T') ? new Date(event.start) : parseISODate(event.start);
      if (!event.start.includes('T')) starts.setHours(9);
      for (const minutes of reminderOffsets(event)) add({ id: `kaisro-event-${event.id}-${day}-${minutes}`, timestamp: starts.getTime() - minutes * 60000,
        title: event.title, body: event.location || (event.allDay ? 'All-day event' : 'Event reminder'), kind: 'event' });
    }
  }
  if (settings.taskReminders) for (const task of data.tasks) {
    if (task.done || !task.dueAt?.includes('T') || task.reminderMinutes == null) continue;
    const state = taskState[task.id];
    if (state?.dismissedDueAt === task.dueAt) continue;
    const due = new Date(task.dueAt);
    const end = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59).getTime();
    if (state?.snoozedDueAt === task.dueAt && state.snoozedUntil && state.snoozedUntil > now.getTime()) {
      add({ id: `kaisro-task-${task.id}-snooze`, timestamp: state.snoozedUntil, title: task.title, body: 'Snoozed task reminder', kind: 'task', taskId: task.id, dueAt: task.dueAt });
      continue;
    }
    add({ id: `kaisro-task-${task.id}-reminder`, timestamp: due.getTime() - task.reminderMinutes * 60000, title: task.title, body: 'Task reminder', kind: 'task', taskId: task.id, dueAt: task.dueAt });
    if (settings.escalatingTasks) for (const [index, minutes] of [15, 30, 60].entries()) {
      const timestamp = due.getTime() + minutes * 60000;
      if (timestamp <= end) add({ id: `kaisro-task-${task.id}-escalation-${index}`, timestamp, title: task.title, body: `Still to do · reminder ${index + 1} of 3`, kind: 'task', taskId: task.id, dueAt: task.dueAt });
    }
  }
  if (settings.dailyDigest) for (let offset = 0; offset < 7; offset++) {
    const day = shiftDateByDays(today, offset);
    const date = parseISODate(day); date.setHours(settings.digestHour, settings.digestMinute);
    add({ id: `kaisro-digest-${day}`, timestamp: date.getTime(), title: 'Your day in Kaisro', body: dailySummary(data, date).body, kind: 'digest' });
  }
  return [...new Map(candidates.map(item => [item.id, item])).values()].sort((a,b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)).slice(0, MAX_TRIGGER_COUNT);
}
export function planBudgetAlerts(data: PlannerData, settings: PlannerPreferences, now: Date) {
  if (!settings.budgetAlerts) return [];
  const month = formatDateToISO(now).slice(0, 7);
  return buildBudget(month, data.categories, data.transactions, []).categoryRows.flatMap(category => {
    const status = budgetAlert(category.spent, category.monthlyCap, settings.budgetThreshold);
    return status ? [{ key: `budget-alert:${month}:${category.id}`, stage: status === 'near' ? 1 : status === 'reached' ? 2 : 3,
      title: `${category.name}: ${status === 'near' ? 'approaching cap' : status === 'reached' ? 'cap reached' : 'over cap'}`,
      body: `${formatCurrency(category.spent)} of ${formatCurrency(category.monthlyCap!)} spent` }] : [];
  });
}
