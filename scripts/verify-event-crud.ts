import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  expandEventForDate,
  shiftEndDatePreservingDuration,
  formatReminderLabel,
  RECURRENCE_OPTIONS,
  REMINDER_OPTIONS,
} from '../src/utils/recurrence';
import { Event } from '../src/db/schema';

console.log('=== VERIFYING RECURRENCE ENGINE & DURATION HELPERS ===\n');

// 1. Test Future Event Not Appearing on Earlier Days
console.log('1. Testing future event start date restriction:');
const futureEvent: Event = {
  id: 1,
  title: 'Future Workshop',
  start: '2026-10-01T14:00:00',
  end: '2026-10-01T15:30:00',
  allDay: false,
  location: 'Studio 1',
  recurrence: 'DAILY',
  reminderMinutes: 15,
  createdAt: '2026-09-20',
  updatedAt: '2026-09-20',
};

const beforeStart = expandEventForDate(futureEvent, '2026-09-25');
if (beforeStart !== null) {
  throw new Error('Future event should NOT appear before its start date!');
}
console.log('  -> PASS: Event does not appear before its start date (2026-09-25 returns null).');

const onStart = expandEventForDate(futureEvent, '2026-10-01');
if (!onStart || onStart.start !== '2026-10-01T14:00:00') {
  throw new Error('Future event should appear on its start date!');
}
console.log('  -> PASS: Event appears on its start date (2026-10-01).');

const afterStart = expandEventForDate(futureEvent, '2026-10-05');
if (!afterStart || afterStart.start !== '2026-10-05T14:00:00' || afterStart.end !== '2026-10-05T15:30:00') {
  throw new Error('Daily recurring event should appear on dates after start date!');
}
console.log('  -> PASS: Daily event appears with preserved time on 2026-10-05.');

// 2. Test Weekly Recurrence
console.log('\n2. Testing weekly recurrence:');
const weeklyEvent: Event = {
  id: 2,
  title: 'Wednesday Team Alignment',
  start: '2026-09-16T10:00:00', // 2026-09-16 is a Wednesday
  end: '2026-09-16T11:00:00',
  allDay: false,
  location: null,
  recurrence: 'WEEKLY',
  reminderMinutes: 10,
  createdAt: '2026-09-16',
  updatedAt: '2026-09-16',
};

// 2026-09-23 is Wednesday (+7 days)
const nextWed = expandEventForDate(weeklyEvent, '2026-09-23');
if (!nextWed || nextWed.start !== '2026-09-23T10:00:00') {
  throw new Error('Weekly event should recur on next Wednesday!');
}
console.log('  -> PASS: Weekly event occurs on 2026-09-23 (Wednesday).');

// 2026-09-24 is Thursday (+8 days)
const nextThu = expandEventForDate(weeklyEvent, '2026-09-24');
if (nextThu !== null) {
  throw new Error('Weekly event should NOT recur on Thursday!');
}
console.log('  -> PASS: Weekly event does not occur on 2026-09-24 (Thursday returns null).');

// 3. Test Monthly Recurrence & Month-End Clamping
console.log('\n3. Testing monthly recurrence and month-end clamping:');
const monthly31Event: Event = {
  id: 3,
  title: 'End of Month Review',
  start: '2026-01-31T18:00:00', // Jan 31
  end: '2026-01-31T19:00:00',
  allDay: false,
  location: 'Studio B',
  recurrence: 'MONTHLY',
  reminderMinutes: 30,
  createdAt: '2026-01-31',
  updatedAt: '2026-01-31',
};

// March has 31 days -> should recur on March 31
const march31 = expandEventForDate(monthly31Event, '2026-03-31');
if (!march31 || march31.start !== '2026-03-31T18:00:00') {
  throw new Error('Monthly 31st event should occur on March 31!');
}
console.log('  -> PASS: Monthly 31st event occurs on March 31.');

// February 2026 has 28 days -> should clamp to Feb 28
const feb28 = expandEventForDate(monthly31Event, '2026-02-28');
if (!feb28 || feb28.start !== '2026-02-28T18:00:00') {
  throw new Error('Monthly 31st event should clamp to Feb 28!');
}
console.log('  -> PASS: Monthly 31st event clamps to Feb 28 (last day of Feb 2026).');

// April has 30 days -> should clamp to April 30
const apr30 = expandEventForDate(monthly31Event, '2026-04-30');
if (!apr30 || apr30.start !== '2026-04-30T18:00:00') {
  throw new Error('Monthly 31st event should clamp to April 30!');
}
console.log('  -> PASS: Monthly 31st event clamps to April 30.');

// April 29 should return null
const apr29 = expandEventForDate(monthly31Event, '2026-04-29');
if (apr29 !== null) {
  throw new Error('Monthly 31st event should NOT occur on April 29!');
}
console.log('  -> PASS: April 29 returns null.');

// 4. Test Duration-Preserving Helper
console.log('\n4. Testing duration-preserving start shift helper:');
const origStart = new Date('2026-09-20T10:00:00');
const origEnd = new Date('2026-09-20T11:45:00'); // 1 hour 45 min duration
const newStart = new Date('2026-09-20T14:15:00'); // shifted by +4h 15m

const shiftedEnd = shiftEndDatePreservingDuration(origStart, newStart, origEnd);
const expectedEndMs = newStart.getTime() + (origEnd.getTime() - origStart.getTime());

if (shiftedEnd.getTime() !== expectedEndMs) {
  throw new Error(`Duration preservation failed: expected ${new Date(expectedEndMs)}, got ${shiftedEnd}`);
}
console.log(`  -> PASS: End shifted from 11:45 AM to ${shiftedEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (duration 105 min preserved).`);

// 5. Test Reminder Label Formatter
console.log('\n5. Testing reminder labels:');
if (formatReminderLabel(null) !== 'None') throw new Error('Expected None for null');
if (formatReminderLabel(0) !== 'At time of event') throw new Error('Expected At time of event for 0');
if (formatReminderLabel(15) !== '15 minutes before') throw new Error('Expected 15 minutes before for 15');
if (formatReminderLabel(60) !== '1 hour before') throw new Error('Expected 1 hour before for 60');
if (formatReminderLabel(1440) !== '1 day before') throw new Error('Expected 1 day before for 1440');
console.log('  -> PASS: Reminder labels formatted correctly.');

// 6. Test SQLite Event CRUD Operations
console.log('\n6. Testing SQLite Event CRUD operations:');
const migrationSqlPath = path.join(__dirname, '../src/db/migrations/0000_amusing_santa_claus.sql');
const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');
const statements = migrationSql
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const stmt of statements) {
  sqlite.exec(stmt);
}

// 6A. Insert Event
sqlite.prepare(`
  INSERT INTO events (title, start, end, all_day, location, recurrence, reminder_minutes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run('Design Studio Catchup', '2026-09-20T15:00:00', '2026-09-20T16:00:00', 0, 'Studio B', 'WEEKLY', 15);

const inserted = sqlite.prepare('SELECT * FROM events WHERE title = ?').get('Design Studio Catchup') as any;
if (!inserted || inserted.id !== 1) {
  throw new Error('Failed to insert event into SQLite!');
}
console.log(`  -> PASS: Inserted event id=${inserted.id}, title="${inserted.title}", recurrence="${inserted.recurrence}".`);

// 6B. Update Event
sqlite.prepare(`
  UPDATE events SET title = ?, location = ?, reminder_minutes = ? WHERE id = ?
`).run('Design Studio Catchup (Updated)', 'Studio B, Floor 2', 30, inserted.id);

const updated = sqlite.prepare('SELECT * FROM events WHERE id = ?').get(inserted.id) as any;
if (updated.title !== 'Design Studio Catchup (Updated)' || updated.reminder_minutes !== 30) {
  throw new Error('Failed to update event in SQLite!');
}
console.log(`  -> PASS: Updated event title="${updated.title}", reminder_minutes=${updated.reminder_minutes}.`);

// 6C. Delete Event
sqlite.prepare('DELETE FROM events WHERE id = ?').run(inserted.id);
const deleted = sqlite.prepare('SELECT * FROM events WHERE id = ?').get(inserted.id);
if (deleted !== undefined) {
  throw new Error('Failed to delete event from SQLite!');
}
console.log('  -> PASS: Deleted event successfully from SQLite.');

console.log('\nAll recurrence, duration preservation, labels, and SQLite CRUD tests PASSED with 100% accuracy!\n');
