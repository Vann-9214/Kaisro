import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { testDatabase } from './testDatabase';
import { notes, events, tasks, transactions, noteLinks } from '../src/db/schema';
import { saveNote, readNoteTags, filterNotes, deleteNote } from '../src/db/noteActions';
import { replaceTargetNotes, readNoteTargets } from '../src/db/linkActions';
import { deleteTask, saveTask } from '../src/db/taskActions';
import { deleteEventAndUnlinkNotes } from '../src/db/eventActions';
import { formatNoteSelection } from '../src/utils/noteFormatting';

const { db, close } = testDatabase();
try {
  const event = db.insert(events).values({ title: 'Appointment', start: '2026-10-11' }).returning().get();
  const task = db.insert(tasks).values({ title: 'Follow-up' }).returning().get();
  const entry = db.insert(transactions).values({ amount: 1234, date: '2026-10-11', eventId: event.id }).returning().get();
  const note = saveNote(db, { title: 'Planning', body: '**Important**\n- Follow up', pinned: true, favorite: true,
    tags: [' Ideas ', 'ideas', 'Personal'], links: [{ targetType: 'event', targetId: event.id }, { targetType: 'task', targetId: task.id }, { targetType: 'transaction', targetId: entry.id }] });
  assert.equal(note.pinned, true); assert.equal(note.favorite, true);
  assert.deepEqual(readNoteTags(db, note.id), ['Ideas', 'Personal']);
  assert.equal(readNoteTargets(db, note.id).length, 3);
  assert.equal(filterNotes([{ ...note, tagNames: readNoteTags(db, note.id) }], 'ideas').length, 1);
  replaceTargetNotes(db, { targetType: 'event', targetId: event.id }, [note.id, note.id]);
  assert.equal(readNoteTargets(db, note.id).length, 3);
  assert.throws(() => saveNote(db, { title: 'Must roll back', body: 'changed', links: [{ targetType: 'task', targetId: 99999 }] }, note.id));
  assert.equal(db.select().from(notes).where(eq(notes.id, note.id)).get()!.title, 'Planning');
  assert.equal(readNoteTargets(db, note.id).length, 3);
  const count = db.select().from(tasks).all().length;
  assert.throws(() => saveTask(db, { title: 'Invalid note', dueAt: null, priority: 'low', reminderMinutes: null, subtasks: [], noteIds: [9999] }));
  assert.equal(db.select().from(tasks).all().length, count);
  deleteTask(db, task.id); deleteEventAndUnlinkNotes(db, event.id);
  assert.equal(db.select().from(transactions).where(eq(transactions.id, entry.id)).get()!.eventId, null);
  assert.equal(db.select().from(notes).all().length, 1);
  assert.deepEqual(readNoteTargets(db, note.id), [{ targetType: 'transaction', targetId: entry.id }]);
  assert.equal(formatNoteSelection('hello', { start: 0, end: 5 }, 'bold').body, '**hello**');
  assert.equal(formatNoteSelection('a\nb', { start: 0, end: 3 }, 'list').body, '- a\n- b\n');
  deleteNote(db, note.id);
  assert.equal(db.select().from(noteLinks).all().length, 0);
  console.log('PASS: note tags, metadata, formatting, multi-target links, stale-link rollback and deletion cleanup (migrated SQLite).');
} finally { close(); }
