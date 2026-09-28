import { and, eq, notInArray } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { tasks, subtasks, noteLinks } from './schema';

export interface TaskDraft {
  title: string;
  dueAt: string | null;
  priority: 'low' | 'medium' | 'high';
  reminderMinutes: number | null;
  subtasks: { id?: number; title: string; done: boolean }[];
}

export function saveTask(db: AppDatabase, draft: TaskDraft, id?: number) {
  if (!draft.title.trim()) throw new Error('Task title is required.');
  if (draft.dueAt && Number.isNaN(new Date(draft.dueAt).getTime())) throw new Error('Choose a valid due date.');
  return db.transaction(tx => {
    const values = { title: draft.title.trim(), dueAt: draft.dueAt, priority: draft.priority,
      reminderMinutes: draft.reminderMinutes, updatedAt: new Date().toISOString() };
    const row = id === undefined ? tx.insert(tasks).values(values).returning().get()
      : tx.update(tasks).set(values).where(eq(tasks.id, id)).returning().get();
    if (!row) throw new Error('This task no longer exists.');
    const children = draft.subtasks.filter(child => child.title.trim());
    const ids = children.flatMap(child => child.id === undefined ? [] : [child.id]);
    tx.delete(subtasks).where(ids.length ? and(eq(subtasks.taskId, row.id), notInArray(subtasks.id, ids)) : eq(subtasks.taskId, row.id)).run();
    children.forEach((child, sortOrder) => {
      const data = { title: child.title.trim(), done: child.done, sortOrder };
      if (child.id !== undefined) {
        const updated = tx.update(subtasks).set(data).where(and(eq(subtasks.id, child.id), eq(subtasks.taskId, row.id))).returning().get();
        if (!updated) throw new Error('A subtask changed. Reopen the task and try again.');
      } else tx.insert(subtasks).values({ ...data, taskId: row.id }).run();
    });
    return row;
  });
}

export function toggleTaskCompletion(db: AppDatabase, id: number) {
  return db.transaction(tx => {
    const task = tx.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) throw new Error('This task no longer exists.');
    const now = new Date().toISOString();
    tx.update(tasks).set({ done: !task.done, doneAt: task.done ? null : now, updatedAt: now }).where(eq(tasks.id, id)).run();
  });
}
export function toggleSubtaskCompletion(db: AppDatabase, id: number) {
  const child = db.select().from(subtasks).where(eq(subtasks.id, id)).get();
  if (!child) throw new Error('This subtask no longer exists.');
  db.update(subtasks).set({ done: !child.done }).where(eq(subtasks.id, id)).run();
}
export function deleteTask(db: AppDatabase, id: number) {
  db.transaction(tx => {
    tx.delete(noteLinks).where(and(eq(noteLinks.targetType, 'task'), eq(noteLinks.targetId, id))).run();
    tx.delete(tasks).where(eq(tasks.id, id)).run();
  });
}
