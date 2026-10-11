import assert from 'node:assert/strict';
import { testDatabase } from './testDatabase';

const { sqlite, close } = testDatabase(old => {
  old.prepare('INSERT INTO events (id, title, start) VALUES (?, ?, ?)').run(10, 'Existing event', '2026-10-11');
  old.prepare('INSERT INTO recurring_transactions (id, amount, start_date, next_date) VALUES (?, ?, ?, ?)').run(20, 12345, '2026-01-31', '2026-11-30');
  old.prepare('INSERT INTO transactions (id, amount, date, recurring_id) VALUES (?, ?, ?, ?)').run(30, 12345, '2026-10-31', 20);
  old.prepare('INSERT INTO notes (id, title, body) VALUES (?, ?, ?)').run(40, 'Existing note', 'Keep this');
  old.prepare('INSERT INTO note_links (note_id, target_type, target_id) VALUES (?, ?, ?)').run(40, 'transaction', 30);
});
try {
  assert.equal(sqlite.prepare('SELECT recurring_id FROM transactions WHERE id=30').get()!.recurring_id, 20);
  assert.equal(sqlite.prepare('SELECT amount FROM transactions WHERE id=30').get()!.amount, 12345);
  assert.equal(sqlite.prepare('SELECT body FROM notes WHERE id=40').get()!.body, 'Keep this');
  assert.equal(sqlite.prepare('SELECT target_id FROM note_links WHERE note_id=40').get()!.target_id, 30);
  sqlite.exec('UPDATE transactions SET event_id=10 WHERE id=30');
  sqlite.exec('UPDATE recurring_transactions SET event_id=10 WHERE id=20');
  sqlite.exec('DELETE FROM events WHERE id=10');
  assert.equal(sqlite.prepare('SELECT event_id FROM transactions WHERE id=30').get()!.event_id, null);
  assert.equal(sqlite.prepare('SELECT event_id FROM recurring_transactions WHERE id=20').get()!.event_id, null);
  assert.equal(sqlite.prepare('SELECT recurring_id FROM transactions WHERE id=30').get()!.recurring_id, 20);
  assert.equal(sqlite.prepare('PRAGMA foreign_keys').get()!.foreign_keys, 1);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  console.log('PASS: production transaction upgrade preserves spending history, repeat links and notes; event deletion clears only event links.');
} finally { close(); }
