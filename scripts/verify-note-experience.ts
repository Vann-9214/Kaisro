import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDatabase } from './testDatabase';
import { saveNote, deleteNote, filterNotes, type NoteDraft } from '../src/db/noteActions';
import { notes } from '../src/db/schema';

const { db, close } = testDatabase();

try {
  // 1. Initial State: No notes
  assert.equal(db.select().from(notes).all().length, 0);

  // 2. Create note with title & body
  const draft1: NoteDraft = {
    title: 'Morning Routine Ideas',
    body: 'Drink water, stretch 10m, review calendar.',
  };
  const note1 = saveNote(db, draft1);
  assert.equal(note1.title, 'Morning Routine Ideas');
  assert.equal(note1.body, 'Drink water, stretch 10m, review calendar.');
  assert.ok(note1.id);
  assert.ok(note1.createdAt);
  assert.ok(note1.updatedAt);

  // 3. Create note with empty title - auto derives from first line
  const draft2: NoteDraft = {
    title: '   ',
    body: 'Grocery list:\nEggs\nMilk\nBread',
  };
  const note2 = saveNote(db, draft2);
  assert.equal(note2.title, 'Grocery list:');
  assert.equal(note2.body, 'Grocery list:\nEggs\nMilk\nBread');

  // 4. Create empty note - defaults to 'Untitled Note'
  const draft3: NoteDraft = {
    title: '',
    body: '',
  };
  const note3 = saveNote(db, draft3);
  assert.equal(note3.title, 'Untitled Note');
  assert.equal(note3.body, '');

  assert.equal(db.select().from(notes).all().length, 3);

  // 5. Update note (simulating debounced auto-save)
  const updatedNote1 = saveNote(
    db,
    {
      title: 'Morning Routine (Updated)',
      body: 'Drink warm water with lemon, stretch 15m.',
    },
    note1.id
  );
  assert.equal(updatedNote1.id, note1.id);
  assert.equal(updatedNote1.title, 'Morning Routine (Updated)');
  assert.equal(updatedNote1.body, 'Drink warm water with lemon, stretch 15m.');

  // 6. Test search / filtering
  const allNotes = db
    .select()
    .from(notes)
    .orderBy(sql`${notes.updatedAt} DESC`)
    .all();

  // Search by title match
  const matchTitle = filterNotes(allNotes, 'routine');
  assert.equal(matchTitle.length, 1);
  assert.equal(matchTitle[0].id, note1.id);

  // Search by body match
  const matchBody = filterNotes(allNotes, 'milk');
  assert.equal(matchBody.length, 1);
  assert.equal(matchBody[0].id, note2.id);

  // Search case-insensitivity
  const matchCase = filterNotes(allNotes, 'GROCERY');
  assert.equal(matchCase.length, 1);
  assert.equal(matchCase[0].id, note2.id);

  // Search non-match
  const matchNone = filterNotes(allNotes, 'nonexistent query 123');
  assert.equal(matchNone.length, 0);

  // 7. Delete note
  deleteNote(db, note3.id);
  assert.equal(db.select().from(notes).all().length, 2);

  deleteNote(db, note1.id);
  deleteNote(db, note2.id);
  assert.equal(db.select().from(notes).all().length, 0);

  console.log('PASS: Note CRUD, title auto-generation, auto-save update, search filtering, and deletion.');
} finally {
  close();
}
