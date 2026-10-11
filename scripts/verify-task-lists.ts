import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { testDatabase } from './testDatabase';
import { tasks } from '../src/db/schema';
import { saveTask, reorderTasks, toggleTaskCompletion } from '../src/db/taskActions';
import { buildTaskList } from '../src/utils/taskListUtils';

const { db, close } = testDatabase();
try {
  const draft = { title: 'Work', dueAt: '2026-10-11T09:00:00', priority: 'high' as const, reminderMinutes: null, subtasks: [], listName: 'Work', recurrence: 'DAILY' };
  const work = saveTask(db, draft);
  const personal = saveTask(db, { ...draft, title: 'Personal', listName: 'Personal', priority: 'low', recurrence: null as any });
  const another = saveTask(db, { ...draft, title: 'Another', listName: 'work', recurrence: null as any });
  assert.equal(another.listName, 'Work');
  let rows = db.select().from(tasks).all();
  const now = new Date(2026, 9, 11, 8);
  assert.equal(buildTaskList(rows, [], 'today', now, 'Work').remaining, 3);
  assert.equal(buildTaskList(rows, [], 'all', now, 'Work').remaining, 2);
  reorderTasks(db, [personal.id, another.id, work.id]);
  rows = db.select().from(tasks).all();
  assert.deepEqual(buildTaskList(rows, [], 'today', now).groups[0].data.map(task => task.id), [personal.id, another.id, work.id]);
  assert.throws(() => reorderTasks(db, [work.id, 99999]));
  assert.equal(db.select().from(tasks).where(eq(tasks.id, work.id)).get()!.manualOrder, 2, 'Invalid reorder rolls back');
  toggleTaskCompletion(db, work.id);
  const next = db.select().from(tasks).where(eq(tasks.generatedFrom, work.id)).get()!;
  assert.equal(next.listName, 'Work'); assert.equal(next.manualOrder, null);
  assert.equal(next.dueAt, '2026-10-12T09:00:00');
  saveTask(db, { ...draft, title: 'Moved', listName: '' }, another.id);
  assert.equal(db.select().from(tasks).where(eq(tasks.id, another.id)).get()!.listName, 'Inbox');
  console.log('PASS: list normalization, cross-list Today, filtered lists, manual ordering/rollback and repeating list membership.');
} finally { close(); }
