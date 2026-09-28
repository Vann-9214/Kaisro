/** Phase 1a. Uses only an isolated in-memory SQLite database and existing migrations. */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { tasks, subtasks } from '../src/db/schema';
import { buildTaskList, formatTaskDue, taskDue } from '../src/utils/taskListUtils';

async function main() {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec('PRAGMA foreign_keys = ON');
    const migrationDir = resolve('src/db/migrations');
    const journal = JSON.parse(readFileSync(resolve(migrationDir, 'meta/_journal.json'), 'utf8'));
    for (const entry of journal.entries) sqlite.exec(readFileSync(resolve(migrationDir, entry.tag + '.sql'), 'utf8'));
    // Drizzle decodes booleans and column names just as the native adapter does.
    const db = drizzle(async (query, params, method) => {
      const statement = sqlite.prepare(query);
      if (method === 'run') { statement.run(...params); return { rows: [] }; }
      statement.setReturnArrays(true);
      const rows = statement.all(...params);
      return { rows: method === 'get' ? rows[0] : rows };
    });
    const now = new Date(2026, 8, 28, 14, 0);
    const snapshot = async () => ({ tasks: await db.select().from(tasks), subtasks: await db.select().from(subtasks) });
    const read = async (filter: 'today' | 'upcoming' | 'all', date = now) => {
      const data = await snapshot();
      return buildTaskList(data.tasks, data.subtasks, filter, date);
    };

    for (const filter of ['today', 'upcoming', 'all'] as const) {
      const empty = await read(filter);
      assert.equal(empty.total, 0); assert.equal(empty.progress, 0);
      assert.deepEqual(empty.groups, []); assert.equal(empty.next, null);
    }
    console.log('PASS: migrated empty database produces empty lists and zero progress');

    await db.insert(tasks).values([
      { id: 1, title: 'Past dated', dueAt: '2026-09-27', priority: 'high' },
      { id: 2, title: 'Before noon', dueAt: '2026-09-28T11:59:00' },
      { id: 3, title: 'Noon', dueAt: '2026-09-28T12:00:00' },
      { id: 4, title: 'Evening', dueAt: '2026-09-28T23:59:00' },
      { id: 5, title: 'Date only', dueAt: '2026-09-28' },
      { id: 6, title: 'Undated', dueAt: null },
      { id: 7, title: 'Done today', dueAt: null, done: true, doneAt: '2026-09-28T09:00:00' },
      { id: 8, title: 'Future', dueAt: '2026-09-29T08:30:00' },
      { id: 9, title: 'Old done', dueAt: '2026-09-27', done: true, doneAt: '2026-09-27T09:00:00' },
      { id: 10, title: 'Future done', dueAt: '2026-09-30', done: true, doneAt: '2026-09-27T09:00:00' },
    ]);
    await db.insert(subtasks).values([
      { id: 1, taskId: 2, title: 'Second', sortOrder: 1 },
      { id: 2, taskId: 2, title: 'First', sortOrder: 0, done: true },
    ]);
    const before = await snapshot();
    const today = await read('today');
    assert.deepEqual(today.groups.map(group => [group.title, group.data.map(task => task.id)]), [
      ['Overdue', [1]], ['Morning', [2]], ['Afternoon', [3, 4]], ['Anytime', [5, 6]],
    ]);
    assert.equal(today.remaining, 6); assert.equal(today.total, 7);
    assert.equal(today.progress, 1 / 7); assert.equal(today.completedToday, 1);
    assert.deepEqual(today.done.map(task => task.id), [7]);
    assert.equal(today.next?.id, 8);
    assert.deepEqual(today.groups[1].data[0].subtasks.map(child => child.id), [2, 1]);
    assert.equal(today.groups[1].data[0].subtasks.filter(child => child.done).length, 1);
    console.log('PASS: overdue/morning/afternoon/anytime, Done, progress, subtask order/count');

    const upcoming = await read('upcoming');
    assert.equal(upcoming.total, 2); assert.equal(upcoming.remaining, 1);
    assert.equal(upcoming.progress, 0.5); assert.deepEqual(upcoming.done.map(task => task.id), [10]);
    assert.equal((await read('all')).total, 10);
    assert.equal((await read('all')).remaining, 7);
    assert.deepEqual(await snapshot(), before, 'Reading lists must never write to the database');
    console.log('PASS: Upcoming and All include the right dates; all operations are read-only');

    const tomorrow = await read('today', new Date(2026, 8, 29, 0, 0));
    assert.deepEqual(tomorrow.groups[0].data.map(task => task.id), [1, 5, 2, 3, 4]);
    assert.equal(tomorrow.done.length, 0);
    assert.equal(tomorrow.groups.find(group => group.title === 'Morning')?.data[0].id, 8);
    const offsetInstant = '2026-09-28T23:30:00-07:00';
    const local = new Date(offsetInstant);
    assert.equal(taskDue(offsetInstant)?.date.getHours(), local.getHours());
    assert.equal(taskDue('2026-09-28')?.date.getDate(), 28);
    assert.equal(taskDue('2026-09-28')?.timed, false);
    assert.equal(formatTaskDue(null, '2026-09-28'), 'No due date');
    assert.equal(formatTaskDue('2026-09-27', '2026-09-28'), 'Yesterday');
    assert.equal(formatTaskDue('2026-09-29T08:30:00', '2026-09-28'), 'Tomorrow, 8:30 AM');
    await db.insert(tasks).values({ id: 11, title: 'Offset timestamp', dueAt: offsetInstant });
    const offsetDay = new Date(local.getFullYear(), local.getMonth(), local.getDate(), 0, 0);
    const offsetList = await read('today', offsetDay);
    const expectedGroup = local.getHours() < 12 ? 'Morning' : 'Afternoon';
    assert.ok(offsetList.groups.find(group => group.title === expectedGroup)?.data.some(task => task.id === 11));
    console.log('PASS: midnight rollover, timezone offsets, date-only and due labels');

    await db.update(tasks).set({ done: true, doneAt: '2026-09-28T14:00:00' });
    const finished = await read('all');
    assert.equal(finished.remaining, 0); assert.equal(finished.progress, 1);
    assert.equal(finished.done.length, 11); assert.deepEqual(finished.groups, []);
    console.log('PASS: all-complete state keeps Done entries and reports 100%');

    // Clear only this temporary database, then verify the empty state returns.
    await db.delete(tasks);
    assert.equal((await db.select().from(subtasks)).length, 0);
    assert.equal((await read('all')).total, 0);
    console.log('PASS: clear removes subtasks by cascade and returns empty lists');
  } finally {
    sqlite.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
