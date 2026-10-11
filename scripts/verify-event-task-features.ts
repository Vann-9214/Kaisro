import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { testDatabase } from './testDatabase';
import { events, tasks, subtasks } from '../src/db/schema';
import { saveScopedEvent, deleteScopedEvent, duplicateEvent } from '../src/db/eventActions';
import { eventsForDate, reminderOffsets } from '../src/utils/recurrence';
import { saveTask, toggleTaskCompletion } from '../src/db/taskActions';

const { db, close } = testDatabase();
try {
  const original = db.insert(events).values({ title: 'Weekly', start: '2026-10-05T09:00:00', end: '2026-10-05T10:00:00', recurrence: 'WEEKLY',
    note: 'Agenda', colorToken: 'tasks', reminderMinutes: 30, reminderOffsets: '[30,60]' }).returning().get();
  const detached = saveScopedEvent(db, original.id, '2026-10-12T09:00:00', { ...original, title: 'One change', start: '2026-10-13T09:00:00', end: '2026-10-13T10:00:00' }, 'this')!;
  const updated = db.select().from(events).where(eq(events.id, original.id)).get()!;
  assert.equal(eventsForDate(updated, '2026-10-12').length, 0);
  assert.equal(eventsForDate(updated, '2026-10-19').length, 1);
  assert.equal(detached.recurrence, null);
  assert.equal(detached.seriesId, original.id);
  assert.deepEqual(reminderOffsets(detached), [30, 60]);
  const future = saveScopedEvent(db, original.id, '2026-10-19T09:00:00', { ...original, title: 'Future', start: '2026-10-19T11:00:00', end: '2026-10-19T12:00:00' }, 'future')!;
  assert.equal(eventsForDate(db.select().from(events).where(eq(events.id, original.id)).get()!, '2026-10-19').length, 0);
  assert.equal(eventsForDate(future, '2026-10-26')[0].start, '2026-10-26T11:00:00');
  const all = saveScopedEvent(db, future.id, '2026-10-26T11:00:00', { ...future, start: '2026-10-26T13:00:00', end: '2026-10-26T14:00:00' }, 'all')!;
  assert.equal(all.start, '2026-10-19T13:00:00');
  const copied = duplicateEvent(db, all.id);
  assert.equal(copied.note, original.note);
  assert.deepEqual(reminderOffsets(copied), [30, 60]);
  deleteScopedEvent(db, all.id, '2026-10-26T13:00:00', 'this');
  assert.equal(eventsForDate(db.select().from(events).where(eq(events.id, all.id)).get()!, '2026-10-26').length, 0);
  const span = db.insert(events).values({ title: 'Spanning', allDay: true, start: '2026-10-30', end: '2026-11-02', recurrence: 'MONTHLY' }).returning().get();
  assert.equal(eventsForDate(span, '2026-11-01')[0].start, '2026-10-30');
  assert.equal(eventsForDate(span, '2026-12-01')[0].start, '2026-11-30');
  const task = saveTask(db, { title: 'Month end', dueAt: '2026-01-31T09:00:00', priority: 'high', reminderMinutes: 15, recurrence: 'MONTHLY', subtasks: [{ title: 'Checklist', done: true }] });
  toggleTaskCompletion(db, task.id);
  const next = db.select().from(tasks).where(eq(tasks.generatedFrom, task.id)).get()!;
  assert.equal(next.dueAt, '2026-02-28T09:00:00');
  assert.equal(db.select().from(subtasks).where(eq(subtasks.taskId, next.id)).get()!.done, false);
  toggleTaskCompletion(db, task.id);
  toggleTaskCompletion(db, task.id);
  assert.equal(db.select().from(tasks).all().length, 2);
  toggleTaskCompletion(db, next.id);
  assert.equal(db.select().from(tasks).where(eq(tasks.generatedFrom, next.id)).get()!.dueAt, '2026-03-31T09:00:00');
  assert.throws(() => saveTask(db, { title: 'No date', dueAt: null, priority: 'low', reminderMinutes: null, recurrence: 'DAILY', subtasks: [] }));
  console.log('PASS: event scope, exceptions, duplicate metadata, multi-day recurrence and idempotent recurring tasks (migrated SQLite).');
} finally { close(); }
