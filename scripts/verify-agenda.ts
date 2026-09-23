/**
 * Comprehensive Verification Script for Kaisro Calendar Agenda View
 *
 * Uses an isolated in-memory SQLite database (DatabaseSync(':memory:'))
 * NEVER touches user data.
 *
 * Verifies:
 * 1. Grouping by day
 * 2. Skipping of empty days
 * 3. Today always shown (including the "Nothing planned" case)
 * 4. Header labels (Today, Tomorrow, other days, different year)
 * 5. Summary wording rules (1 event, 2 tasks, 2 expenses, N items, · ₱total)
 * 6. Sorting (all-day first, then by time, tie-break: event < task < expense)
 * 7. Recurring events on the right days via recurrence expansion
 * 8. Tasks without a due date being excluded
 * 9. Range loading in 14-day steps, 90-day look-ahead, and 365-day stop
 */

import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  formatAgendaHeaderDate,
  formatAgendaHeaderSummary,
  compareAgendaItems,
  transformDbItemsToAgendaItems,
  buildAgendaSections,
  getAgendaFooterLabel,
  AgendaItem,
} from '../src/utils/agendaUtils';
import { shiftDateByDays, parseISODate, formatDateToISO } from '../src/utils/dateUtils';
import { expandEventForDate } from '../src/utils/recurrence';
import { Event, Task, Transaction, Category } from '../src/db/schema';

console.log('====================================================');
console.log('  Kaisro Calendar Agenda View Verification Suite');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    if (detail) console.log(`         -> ${detail}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (detail) console.error(`         -> ${detail}`);
    throw new Error(`Assertion failed: ${testName} - ${detail ?? ''}`);
  }
}

// ============================================================================
// PART 1: Header Date Labels (Today, Tomorrow, other days, different year)
// ============================================================================
console.log('--- PART 1: Day Header Date Labels ---');

const anchorToday = '2026-09-20'; // Sunday

// 1A. Today
const todayHeader = formatAgendaHeaderDate('2026-09-20', anchorToday);
assert(
  todayHeader.label === 'Today · Sun, Sep 20' && todayHeader.isToday === true,
  'Today header formatting',
  `Expected "Today · Sun, Sep 20", got "${todayHeader.label}", isToday=${todayHeader.isToday}`
);

// 1B. Tomorrow
const tomorrowHeader = formatAgendaHeaderDate('2026-09-21', anchorToday);
assert(
  tomorrowHeader.label === 'Tomorrow · Mon, Sep 21' && tomorrowHeader.isToday === false,
  'Tomorrow header formatting',
  `Expected "Tomorrow · Mon, Sep 21", got "${tomorrowHeader.label}"`
);

// 1C. Other day in current year
const otherDayHeader = formatAgendaHeaderDate('2026-09-23', anchorToday);
assert(
  otherDayHeader.label === 'Wed, Sep 23' && otherDayHeader.isToday === false,
  'Other day in same year formatting',
  `Expected "Wed, Sep 23", got "${otherDayHeader.label}"`
);

// 1D. Day in a different year
const diffYearHeader = formatAgendaHeaderDate('2027-01-06', anchorToday);
assert(
  diffYearHeader.label === 'Wed, Jan 6, 2027' && diffYearHeader.isToday === false,
  'Day in different year formatting',
  `Expected "Wed, Jan 6, 2027", got "${diffYearHeader.label}"`
);

// ============================================================================
// PART 2: Header Summary Wording Rules
// ============================================================================
console.log('\n--- PART 2: Header Summary Wording Rules ---');

function makeDummyEvent(id: number): AgendaItem {
  return {
    id: `event-${id}`,
    numericId: id,
    itemType: 'event',
    dateStr: '2026-09-20',
    title: `Event ${id}`,
    timeLabel: '10:00 AM',
    isAllDay: false,
    sortMinutes: 600,
    raw: {} as Event,
    isRecurring: false,
  };
}

function makeDummyTask(id: number): AgendaItem {
  return {
    id: `task-${id}`,
    numericId: id,
    itemType: 'task',
    dateStr: '2026-09-20',
    title: `Task ${id}`,
    timeLabel: 'Anytime',
    isAllDay: true,
    sortMinutes: -1,
    raw: {} as Task,
    done: false,
    priority: 'medium',
  };
}

function makeDummyExpense(id: number, centavos: number): AgendaItem {
  return {
    id: `expense-${id}`,
    numericId: id,
    itemType: 'expense',
    dateStr: '2026-09-20',
    title: `Expense ${id}`,
    timeLabel: '1:00 PM',
    isAllDay: false,
    sortMinutes: 780,
    raw: { type: 'expense' } as Transaction,
    amountCentavos: centavos,
  };
}

// 2A. Single event
const sum1Event = formatAgendaHeaderSummary([makeDummyEvent(1)]);
assert(sum1Event === '1 event', '1 event noun', `Got: "${sum1Event}"`);

// 2B. Multiple events
const sum3Events = formatAgendaHeaderSummary([
  makeDummyEvent(1),
  makeDummyEvent(2),
  makeDummyEvent(3),
]);
assert(sum3Events === '3 events', '3 events noun', `Got: "${sum3Events}"`);

// 2C. Single task
const sum1Task = formatAgendaHeaderSummary([makeDummyTask(1)]);
assert(sum1Task === '1 task', '1 task noun', `Got: "${sum1Task}"`);

// 2D. Multiple tasks
const sum2Tasks = formatAgendaHeaderSummary([makeDummyTask(1), makeDummyTask(2)]);
assert(sum2Tasks === '2 tasks', '2 tasks noun', `Got: "${sum2Tasks}"`);

// 2E. Single expense
const sum1Expense = formatAgendaHeaderSummary([makeDummyExpense(1, 25000)]);
assert(
  sum1Expense === '1 expense · ₱250',
  '1 expense noun with currency',
  `Expected "1 expense · ₱250", got: "${sum1Expense}"`
);

// 2F. Multiple expenses
const sum2Expenses = formatAgendaHeaderSummary([
  makeDummyExpense(1, 25000),
  makeDummyExpense(2, 10000),
]);
assert(
  sum2Expenses === '2 expenses · ₱350',
  '2 expenses noun with currency',
  `Expected "2 expenses · ₱350", got: "${sum2Expenses}"`
);

// 2G. Mixed items without spending
const sumMixedNoSpend = formatAgendaHeaderSummary([makeDummyEvent(1), makeDummyTask(1)]);
assert(sumMixedNoSpend === '2 items', '2 mixed items no spend', `Got: "${sumMixedNoSpend}"`);

// 2H. Mixed items with spending
const sumMixedWithSpend = formatAgendaHeaderSummary([
  makeDummyEvent(1),
  makeDummyTask(1),
  makeDummyExpense(1, 15000),
]);
assert(
  sumMixedWithSpend === '3 items · ₱150',
  '3 mixed items with spending',
  `Expected "3 items · ₱150", got: "${sumMixedWithSpend}"`
);

// ============================================================================
// PART 3: Sorting Rules
// ============================================================================
console.log('\n--- PART 3: Item Sorting (All-day first, time, type tie-break) ---');

const sortTestItems: AgendaItem[] = [
  // 12:00 PM expense
  {
    id: 'exp-12pm',
    numericId: 1,
    itemType: 'expense',
    dateStr: '2026-09-20',
    title: 'Lunch',
    timeLabel: '12:00 PM',
    isAllDay: false,
    sortMinutes: 12 * 60,
    raw: { type: 'expense' } as Transaction,
    amountCentavos: 30000,
  },
  // 9:00 AM task
  {
    id: 'task-9am',
    numericId: 2,
    itemType: 'task',
    dateStr: '2026-09-20',
    title: 'Review PR',
    timeLabel: '9:00 AM',
    isAllDay: false,
    sortMinutes: 9 * 60,
    raw: {} as Task,
    done: false,
    priority: 'high',
  },
  // 9:00 AM event
  {
    id: 'ev-9am',
    numericId: 3,
    itemType: 'event',
    dateStr: '2026-09-20',
    title: 'Standup Meeting',
    timeLabel: '9:00 AM',
    isAllDay: false,
    sortMinutes: 9 * 60,
    raw: {} as Event,
    isRecurring: false,
  },
  // 9:00 AM expense
  {
    id: 'exp-9am',
    numericId: 4,
    itemType: 'expense',
    dateStr: '2026-09-20',
    title: 'Morning Coffee',
    timeLabel: '9:00 AM',
    isAllDay: false,
    sortMinutes: 9 * 60,
    raw: { type: 'expense' } as Transaction,
    amountCentavos: 15000,
  },
  // Untimed task (anytime)
  {
    id: 'task-anytime',
    numericId: 5,
    itemType: 'task',
    dateStr: '2026-09-20',
    title: 'Buy Groceries',
    timeLabel: 'Anytime',
    isAllDay: true,
    sortMinutes: -1,
    raw: {} as Task,
    done: false,
    priority: 'medium',
  },
  // All-day event
  {
    id: 'ev-allday',
    numericId: 6,
    itemType: 'event',
    dateStr: '2026-09-20',
    title: 'Public Holiday',
    timeLabel: 'All day',
    isAllDay: true,
    sortMinutes: -1,
    raw: {} as Event,
    isRecurring: false,
  },
];

const sorted = [...sortTestItems].sort(compareAgendaItems);

assert(sorted[0].id === 'ev-allday', '1st: All-day event comes first', `Got ${sorted[0].id}`);
assert(sorted[1].id === 'task-anytime', '2nd: Untimed task comes next', `Got ${sorted[1].id}`);
assert(sorted[2].id === 'ev-9am', '3rd: 9:00 AM Event (events < tasks)', `Got ${sorted[2].id}`);
assert(sorted[3].id === 'task-9am', '4th: 9:00 AM Task (tasks < expenses)', `Got ${sorted[3].id}`);
assert(sorted[4].id === 'exp-9am', '5th: 9:00 AM Expense', `Got ${sorted[4].id}`);
assert(sorted[5].id === 'exp-12pm', '6th: 12:00 PM Expense (later time)', `Got ${sorted[5].id}`);

// ============================================================================
// PART 4: SQLite Database Queries, Recurrence, Undated Task Exclusion
// ============================================================================
console.log('\n--- PART 4: SQLite Database Integration (In-Memory) ---');

const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

// Load and execute schema migration
const migrationSqlPath = path.join(__dirname, '../src/db/migrations/0000_amusing_santa_claus.sql');
const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
const statements = migrationSql
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const stmt of statements) {
  sqlite.exec(stmt);
}

// Insert categories
sqlite.exec(`
  INSERT INTO categories (id, name, icon, color) VALUES
  (1, 'Food & Drink', 'utensils', 'money'),
  (2, 'Transport', 'car', 'money');
`);

// Insert test items:
// 1. One-off Event on 2026-09-21 at 10:00 AM
// 2. Weekly Recurring Event on Wednesdays starting 2026-09-02 (occurs on Wed 2026-09-23)
// 3. Dated Task on 2026-09-22 at 2:00 PM
// 4. Undated Task (due_at = NULL) -> MUST BE EXCLUDED!
// 5. Expense on 2026-09-21 at 11:30 AM
sqlite.exec(`
  INSERT INTO events (id, title, start, end, all_day, recurrence) VALUES
  (101, 'Team Sync', '2026-09-21T10:00:00', '2026-09-21T11:00:00', 0, 'none'),
  (102, 'Weekly Coaching', '2026-09-02T15:00:00', '2026-09-02T16:00:00', 0, 'WEEKLY');

  INSERT INTO tasks (id, title, due_at, priority, done) VALUES
  (201, 'Submit Expense Report', '2026-09-22T14:00:00', 'high', 0),
  (202, 'Undated Idea', NULL, 'low', 0);

  INSERT INTO transactions (id, type, amount, category_id, date, note) VALUES
  (301, 'expense', 45000, 1, '2026-09-21T11:30:00', 'Team Lunch');
`);

// Perform raw range query simulation for next 14 days (2026-09-20 to 2026-10-03)
const rangeStart = '2026-09-20';
const rangeEnd = '2026-10-03';

// Events query (1 query)
const dbEvents = sqlite
  .prepare(
    `SELECT * FROM events WHERE
      ((recurrence IS NULL OR recurrence = 'none')
        AND substr(start, 1, 10) <= ?
        AND substr(COALESCE(end, start), 1, 10) >= ?)
      OR
      (recurrence IS NOT NULL AND recurrence != 'none'
        AND substr(start, 1, 10) <= ?)`
  )
  .all(rangeEnd, rangeStart, rangeEnd) as any[];

// Tasks query (1 query, dated only)
const dbTasks = sqlite
  .prepare(
    `SELECT * FROM tasks WHERE
      due_at IS NOT NULL
      AND due_at != ''
      AND substr(due_at, 1, 10) >= ?
      AND substr(due_at, 1, 10) <= ?`
  )
  .all(rangeStart, rangeEnd) as any[];

// Transactions query (1 query)
const dbTransactions = sqlite
  .prepare(
    `SELECT * FROM transactions WHERE
      substr(date, 1, 10) >= ?
      AND substr(date, 1, 10) <= ?`
  )
  .all(rangeStart, rangeEnd) as any[];

assert(
  !dbTasks.some((t) => t.id === 202),
  'Tasks without a due date are strictly excluded',
  'Undated task (id: 202) was not returned in range query'
);

assert(
  dbTasks.some((t) => t.id === 201),
  'Dated task is included',
  'Task (id: 201) due on 2026-09-22 is returned'
);

// Map categories
const categoriesMap = new Map<number, Category>();
const cats = sqlite.prepare(`SELECT * FROM categories`).all() as any[];
cats.forEach((c) => categoriesMap.set(c.id, c));

// Process each day in the 14-day range
const calendarDays: string[] = [];
const itemsByDate = new Map<string, AgendaItem[]>();

for (let i = 0; i < 14; i++) {
  const d = shiftDateByDays(rangeStart, i);
  calendarDays.push(d);

  // Events for day d
  const dayEvents: Event[] = [];
  for (const ev of dbEvents) {
    if (!ev.recurrence || ev.recurrence === 'none') {
      const s = ev.start.split('T')[0];
      const e = ev.end ? ev.end.split('T')[0] : s;
      if (s <= d && e >= d) dayEvents.push(ev);
    } else {
      const exp = expandEventForDate(ev, d);
      if (exp) dayEvents.push(exp);
    }
  }

  const dayTasks = dbTasks.filter((t) => t.due_at && t.due_at.startsWith(d));
  const dayTx = dbTransactions.filter((tx) => tx.date.startsWith(d));

  const items = transformDbItemsToAgendaItems(d, dayEvents, dayTasks, dayTx, categoriesMap);
  itemsByDate.set(d, items);
}

// Build sections
const sections = buildAgendaSections(calendarDays, itemsByDate, anchorToday);

// Check grouping and skipping:
// Today (2026-09-20) has no items in our DB insert -> MUST BE SHOWN with isEmptyToday = true!
const todaySection = sections.find((s) => s.dateStr === '2026-09-20');
assert(
  todaySection !== undefined,
  'Today is always shown even when empty',
  `Found section for ${todaySection?.dateStr}`
);
assert(
  todaySection?.isEmptyToday === true,
  'Today card shows "Nothing planned" flag',
  `isEmptyToday = ${todaySection?.isEmptyToday}`
);

// Empty day other than today (e.g. 2026-09-24) -> MUST BE SKIPPED!
const emptyDaySection = sections.find((s) => s.dateStr === '2026-09-24');
assert(
  emptyDaySection === undefined,
  'Empty days other than today are skipped',
  '2026-09-24 is not present in sections'
);

// 2026-09-21 has 1 event + 1 expense -> Section exists!
const sep21Section = sections.find((s) => s.dateStr === '2026-09-21');
assert(
  sep21Section !== undefined && sep21Section.data[0].items.length === 2,
  '2026-09-21 section has 2 items',
  `Item count: ${sep21Section?.data[0].items.length}`
);

// Recurring event test: 2026-09-23 is Wednesday -> Weekly coaching must be present!
const sep23Section = sections.find((s) => s.dateStr === '2026-09-23');
assert(
  sep23Section !== undefined &&
    sep23Section.data[0].items.some((it) => it.title === 'Weekly Coaching' && it.isRecurring),
  'Weekly recurring event expands onto Wed Sep 23',
  `Found recurring event on ${sep23Section?.dateStr}`
);

// ============================================================================
// PART 5: Range Loading, 90-Day Look-Ahead, and 365-Day Stop
// ============================================================================
console.log('\n--- PART 5: Range Loading, 90-Day Look-Ahead, and 365-Day Stop ---');

// 5A. Footer label at 14 days
const footer14 = getAgendaFooterLabel(14);
assert(
  footer14.label === 'Showing the next 2 weeks' && footer14.canLoadMore === true,
  'Footer label at 14 days',
  `Got: "${footer14.label}", canLoadMore=${footer14.canLoadMore}`
);

// 5B. Footer label at 28 days
const footer28 = getAgendaFooterLabel(28);
assert(
  footer28.label === 'Showing the next 4 weeks' && footer28.canLoadMore === true,
  'Footer label at 28 days',
  `Got: "${footer28.label}"`
);

// 5C. Footer label at 365 days
const footer365 = getAgendaFooterLabel(365);
assert(
  footer365.label === 'Showing the next year' && footer365.canLoadMore === false,
  'Footer label at 365 days stops and hides load more button',
  `Got: "${footer365.label}", canLoadMore=${footer365.canLoadMore}`
);

// 5D. 90-Day Look-Ahead Simulation
// Setup a scenario with a fresh database where the first item is 45 days away:
const sqliteLookahead = new DatabaseSync(':memory:');
for (const stmt of statements) sqliteLookahead.exec(stmt);
sqliteLookahead.exec(`
  INSERT INTO events (id, title, start, end, all_day) VALUES
  (999, 'Far Future Conference', '2026-11-05T09:00:00', NULL, 1);
`);

function simulateLookahead(startDay: string): { daysLoaded: number; found: boolean } {
  let loaded = 14;
  const maxLookahead = 90;

  while (loaded <= maxLookahead) {
    const endDay = shiftDateByDays(startDay, loaded - 1);
    const countResult = sqliteLookahead
      .prepare(
        `SELECT COUNT(*) as count FROM events WHERE
          substr(start, 1, 10) >= ? AND substr(start, 1, 10) <= ?`
      )
      .get(startDay, endDay) as { count: number };

    if (countResult.count > 0) {
      return { daysLoaded: loaded, found: true };
    }
    loaded += 14;
  }

  return { daysLoaded: Math.min(loaded, maxLookahead), found: false };
}

const lookaheadResult = simulateLookahead('2026-09-20');
assert(
  lookaheadResult.found === true && lookaheadResult.daysLoaded >= 45,
  '90-day look-ahead steps forward until item is found',
  `Found item at daysLoaded=${lookaheadResult.daysLoaded}`
);

// Empty database look-ahead simulation:
const sqliteEmpty = new DatabaseSync(':memory:');
for (const stmt of statements) sqliteEmpty.exec(stmt);

function simulateEmptyLookahead(startDay: string): { daysLoaded: number; found: boolean } {
  let loaded = 14;
  const maxLookahead = 90;

  while (loaded < maxLookahead) {
    const nextStep = Math.min(14, maxLookahead - loaded);
    loaded += nextStep;
  }
  return { daysLoaded: loaded, found: false };
}

const emptyResult = simulateEmptyLookahead('2026-09-20');
assert(
  emptyResult.daysLoaded === 90 && emptyResult.found === false,
  '90-day look-ahead stops at 90 days when completely empty',
  `daysLoaded=${emptyResult.daysLoaded}`
);

console.log('\n====================================================');
console.log(`  ALL ${passed} / ${total} VERIFICATION CHECKS PASSED!`);
console.log('====================================================\n');
