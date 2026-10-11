import assert from 'node:assert/strict';
import { testDatabase } from './testDatabase';
import { deleteEventAndUnlinkNotes } from '../src/db/eventActions';
import { events, tasks, notes, noteLinks } from '../src/db/schema';
import { formatDateToISO } from '../src/utils/dateUtils';

const { db, close } = testDatabase();
try {
  const event = db.insert(events).values({ title: 'Linked event', start: '2026-10-11T09:00:00' }).returning().get();
  const task = db.insert(tasks).values({ title: 'Linked task' }).returning().get();
  const note = db.insert(notes).values({ title: 'Keep this note', body: 'Keep the content too.' }).returning().get();
  db.insert(noteLinks).values([
    { noteId: note.id, targetType: 'event', targetId: event.id },
    { noteId: note.id, targetType: 'task', targetId: task.id },
  ]).run();
  deleteEventAndUnlinkNotes(db, event.id);
  assert.equal(db.select().from(events).all().length, 0);
  assert.deepEqual(db.select().from(notes).all(), [note]);
  assert.equal(db.select().from(tasks).all().length, 1);
  const links = db.select().from(noteLinks).all();
  assert.equal(links.length, 1);
  assert.equal(links[0].targetType, 'task');
  deleteEventAndUnlinkNotes(db, event.id);
  assert.equal(db.select().from(noteLinks).all().length, 1);

  // Force UTC+8 to reproduce the Manila midnight boundary regardless of host timezone.
  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Manila';
    const midnight = new Date('2026-10-11T00:30:00+08:00');
    assert.equal(midnight.toISOString().slice(0, 10), '2026-10-10');
    assert.equal(formatDateToISO(midnight), '2026-10-11');
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
  console.log('PASS: event deletion preserves notes and unrelated links; Today uses the local date (isolated SQLite).');
} finally {
  close();
}
