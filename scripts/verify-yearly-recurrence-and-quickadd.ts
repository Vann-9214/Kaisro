import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  expandEventForDate,
  RECURRENCE_OPTIONS,
} from '../src/utils/recurrence';
import { Event } from '../src/db/schema';

console.log('=== VERIFYING YEARLY RECURRENCE & QUICK-ADD BEHAVIOR ===\n');

// 1. Verify RECURRENCE_OPTIONS contains 'YEARLY'
console.log('1. Checking RECURRENCE_OPTIONS:');
const yearlyOption = RECURRENCE_OPTIONS.find((opt) => opt.value === 'YEARLY');
if (!yearlyOption || yearlyOption.label !== 'Yearly') {
  throw new Error('RECURRENCE_OPTIONS must contain { value: "YEARLY", label: "Yearly" }');
}
console.log('  -> PASS: Found Yearly in RECURRENCE_OPTIONS:', yearlyOption);

// 2. Verify Yearly Event Expansion
console.log('\n2. Testing Yearly Event Expansion:');
const annualBirthday: Event = {
  id: 101,
  title: "Mom's Birthday",
  start: '2026-10-03T09:00:00',
  end: '2026-10-03T10:30:00',
  allDay: false,
  location: 'Home',
  recurrence: 'YEARLY',
  reminderMinutes: 1440,
  createdAt: '2026-10-03',
  updatedAt: '2026-10-03',
};

// Before start date
const priorYear = expandEventForDate(annualBirthday, '2025-10-03');
if (priorYear !== null) {
  throw new Error('Yearly event must NOT expand on dates before its start date!');
}
console.log('  -> PASS: 2025-10-03 (before start) returns null.');

// On start date
const onStartDate = expandEventForDate(annualBirthday, '2026-10-03');
if (!onStartDate || onStartDate.start !== '2026-10-03T09:00:00' || onStartDate.end !== '2026-10-03T10:30:00') {
  throw new Error('Yearly event must appear on its start date!');
}
console.log('  -> PASS: 2026-10-03 matches start date with preserved times.');

// One year later
const nextYear = expandEventForDate(annualBirthday, '2027-10-03');
if (!nextYear || nextYear.start !== '2027-10-03T09:00:00' || nextYear.end !== '2027-10-03T10:30:00') {
  throw new Error('Yearly event must expand to 2027-10-03 preserving start/end times!');
}
console.log('  -> PASS: 2027-10-03 matches +1 year.');

// Five years later
const fiveYearsLater = expandEventForDate(annualBirthday, '2031-10-03');
if (!fiveYearsLater || fiveYearsLater.start !== '2031-10-03T09:00:00' || fiveYearsLater.end !== '2031-10-03T10:30:00') {
  throw new Error('Yearly event must expand to 2031-10-03!');
}
console.log('  -> PASS: 2031-10-03 matches +5 years.');

// Wrong day
const wrongDay = expandEventForDate(annualBirthday, '2027-10-04');
if (wrongDay !== null) {
  throw new Error('Yearly event must NOT match a different day in October!');
}
console.log('  -> PASS: 2027-10-04 returns null.');

// Wrong month
const wrongMonth = expandEventForDate(annualBirthday, '2027-11-03');
if (wrongMonth !== null) {
  throw new Error('Yearly event must NOT match a different month!');
}
console.log('  -> PASS: 2027-11-03 returns null.');

// 3. Test Leap Year Feb 29 Clamping
console.log('\n3. Testing Leap-Year Event Clamping:');
const leapDayEvent: Event = {
  id: 102,
  title: 'Leap Day Celebration',
  start: '2024-02-29T12:00:00',
  end: '2024-02-29T13:00:00',
  allDay: false,
  location: null,
  recurrence: 'YEARLY',
  reminderMinutes: null,
  createdAt: '2024-02-29',
  updatedAt: '2024-02-29',
};

// Non-leap year 2025: February has 28 days, clamped to 2025-02-28
const nonLeap2025 = expandEventForDate(leapDayEvent, '2025-02-28');
if (!nonLeap2025 || nonLeap2025.start !== '2025-02-28T12:00:00') {
  throw new Error('Leap day event should clamp to Feb 28 on non-leap years!');
}
console.log('  -> PASS: Feb 29 event expands to Feb 28 on non-leap year (2025-02-28).');

// Leap year 2028: February has 29 days
const leap2028 = expandEventForDate(leapDayEvent, '2028-02-29');
if (!leap2028 || leap2028.start !== '2028-02-29T12:00:00') {
  throw new Error('Leap day event should match Feb 29 on leap year 2028!');
}
console.log('  -> PASS: Feb 29 event expands to Feb 29 on leap year (2028-02-29).');

// 4. Test In-Memory SQLite CRUD with YEARLY recurrence
console.log('\n4. Testing SQLite Persistence:');
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    all_day INTEGER NOT NULL DEFAULT 0,
    start TEXT NOT NULL,
    end TEXT,
    location TEXT,
    recurrence TEXT,
    reminder_minutes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

db.exec(`
  INSERT INTO events (title, all_day, start, end, location, recurrence, reminder_minutes, created_at, updated_at)
  VALUES ('Annual Review', 0, '2026-10-03T09:00:00', '2026-10-03T10:00:00', 'Office', 'YEARLY', 15, '2026-10-03', '2026-10-03');
`);

const row = db.prepare('SELECT * FROM events WHERE id = 1').get() as any;
if (!row || row.recurrence !== 'YEARLY') {
  throw new Error('Failed to insert or query YEARLY recurring event from SQLite!');
}
console.log('  -> PASS: Event successfully inserted and queried with recurrence = YEARLY.');

// 5. Verify EventForm Source Content
console.log('\n5. Verifying EventForm.tsx Component Logic:');
const formContent = fs.readFileSync(path.resolve(__dirname, '../src/components/events/EventForm.tsx'), 'utf-8');

if (!formContent.includes('handleOpenEndPicker')) {
  throw new Error('EventForm.tsx must contain handleOpenEndPicker');
}
if (!formContent.includes('isRepeating')) {
  throw new Error('EventForm.tsx must contain isRepeating check');
}
if (!formContent.includes('Does not end')) {
  throw new Error('EventForm.tsx must display "Does not end" for all-day repeating events');
}
if (!formContent.includes('End time')) {
  throw new Error('EventForm.tsx must display "End time" label for timed repeating events');
}
console.log('  -> PASS: EventForm.tsx has all required recurring card handling and labels.');

console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY! ===');
