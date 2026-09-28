import type { Task, Subtask } from '../db/schema';
import { formatDateToISO, parseISODate, shiftDateByDays } from './dateUtils';

export type TaskListFilter = 'today' | 'upcoming' | 'all';
export type TaskGroup = 'Overdue' | 'Morning' | 'Afternoon' | 'Anytime';
export type TaskListItem = Task & { subtasks: Subtask[] };

/** Date-only values stay local; timestamps with offsets are converted to local time. */
export function taskDue(value: string | null) {
  if (!value) return null;
  const timed = value.includes('T');
  const date = timed ? new Date(value) : parseISODate(value);
  if (Number.isNaN(date.getTime())) return null;
  return { date, day: formatDateToISO(date), timed };
}

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

function compareTasks(a: Task, b: Task) {
  const ad = taskDue(a.dueAt);
  const bd = taskDue(b.dueAt);
  if (ad && !bd) return -1;
  if (!ad && bd) return 1;
  return (ad && bd ? ad.date.getTime() - bd.date.getTime() : 0)
    || priorityOrder[a.priority] - priorityOrder[b.priority] || a.id - b.id;
}

export function buildTaskList(tasks: Task[], subtasks: Subtask[], filter: TaskListFilter, now: Date) {
  const today = formatDateToISO(now);
  const children = new Map<number, Subtask[]>();
  for (const child of subtasks) {
    const list = children.get(child.taskId) ?? [];
    list.push(child);
    children.set(child.taskId, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  const selected = tasks.filter(task => {
    if (filter === 'all') return true;
    const due = taskDue(task.dueAt);
    if (filter === 'upcoming') return Boolean(due && due.day > today);
    // Carry unfinished overdue/undated work into Today. Done only shows today's work.
    if (!task.done) return !due || due.day <= today;
    return due?.day === today || taskDue(task.doneAt)?.day === today;
  }).sort(compareTasks).map(task => ({ ...task, subtasks: children.get(task.id) ?? [] }));

  const groups: { title: TaskGroup; data: TaskListItem[] }[] =
    ['Overdue', 'Morning', 'Afternoon', 'Anytime'].map(title => ({ title: title as TaskGroup, data: [] }));
  const done: TaskListItem[] = [];
  for (const task of selected) {
    if (task.done) { done.push(task); continue; }
    const due = taskDue(task.dueAt);
    const group = due && due.day < today ? 0 : !due?.timed ? 3 : due.date.getHours() < 12 ? 1 : 2;
    groups[group].data.push(task);
  }
  const remaining = selected.length - done.length;
  const next = tasks.filter(task => !task.done && (taskDue(task.dueAt)?.day ?? '') > today).sort(compareTasks)[0];
  return {
    groups: groups.filter(group => group.data.length > 0), done, remaining,
    total: selected.length, progress: selected.length ? done.length / selected.length : 0,
    completedToday: tasks.filter(task => task.done && taskDue(task.doneAt)?.day === today).length,
    next: next ?? null,
  };
}

export function formatTaskDue(value: string | null, today: string, alwaysShowDate = false): string {
  const due = taskDue(value);
  if (!due) return 'No due date';
  const time = due.timed ? due.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  let day = due.day === today ? 'Today'
    : due.day === shiftDateByDays(today, -1) ? 'Yesterday'
    : due.day === shiftDateByDays(today, 1) ? 'Tomorrow'
    : due.date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', ...(due.date.getFullYear() !== parseISODate(today).getFullYear() ? { year: 'numeric' } : {}),
    });
  return time ? (due.day === today && !alwaysShowDate ? time : `${day}, ${time}`) : day;
}
