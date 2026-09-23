import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  getVisibleWeeksForMonth,
  formatWeekDateRange,
  calculateBusiestDayIndex,
  sortWeekItems,
  SchedulableItem,
} from '../src/utils/weekViewUtils';
import { getISOWeekNumber, parseISODate, formatDateToISO } from '../src/utils/dateUtils';
import { expandEventForDate } from '../src/utils/recurrence';
import { formatCurrency } from '../src/constants/currency';
import { Event } from '../src/db/schema';

console.log('=== VERIFYING KAISRO CALENDAR WEEK VIEW DATA & LOGIC ===\n');

let failed = false;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// -------------------------------------------------------------
// 1. Check week counts for 4, 5, and 6-week months
// -------------------------------------------------------------
console.log('\n--- 1. Week Counts (4, 5, 6-week months) ---');

// February 2027: starts Monday Feb 1, ends Sunday Feb 28 -> exactly 4 weeks
const weeksFeb2027 = getVisibleWeeksForMonth(2027, 1); // Month 1 = February
assert(weeksFeb2027.length === 4, `February 2027 has 4 weeks (got ${weeksFeb2027.length})`);
assert(weeksFeb2027[0].startDateStr === '2027-02-01', `Feb 2027 week 1 starts 2027-02-01`);
assert(weeksFeb2027[3].endDateStr === '2027-02-28', `Feb 2027 week 4 ends 2027-02-28`);

// September 2026: starts Tuesday Sep 1 (Aug 31 Mon), ends Wednesday Sep 30 (Oct 4 Sun) -> exactly 5 weeks
const weeksSep2026 = getVisibleWeeksForMonth(2026, 8); // Month 8 = September
assert(weeksSep2026.length === 5, `September 2026 has 5 weeks (got ${weeksSep2026.length})`);
assert(weeksSep2026[0].startDateStr === '2026-08-31', `Sep 2026 week 1 starts 2026-08-31`);
assert(weeksSep2026[4].endDateStr === '2026-10-04', `Sep 2026 week 5 ends 2026-10-04`);

// August 2026: starts Saturday Aug 1 (Jul 27 Mon), ends Monday Aug 31 (Sep 6 Sun) -> exactly 6 weeks
const weeksAug2026 = getVisibleWeeksForMonth(2026, 7); // Month 7 = August
assert(weeksAug2026.length === 6, `August 2026 has 6 weeks (got ${weeksAug2026.length})`);
assert(weeksAug2026[0].startDateStr === '2026-07-27', `Aug 2026 week 1 starts 2026-07-27`);
assert(weeksAug2026[5].endDateStr === '2026-09-06', `Aug 2026 week 6 ends 2026-09-06`);

// -------------------------------------------------------------
// 2. Check ISO week numbers
// -------------------------------------------------------------
console.log('\n--- 2. ISO Week Numbers ---');

// Sunday September 20, 2026 is in week 38
const sunSep20 = parseISODate('2026-09-20');
const weekNumSunSep20 = getISOWeekNumber(sunSep20);
assert(weekNumSunSep20 === 38, `Sunday Sep 20, 2026 is in ISO week 38 (got ${weekNumSunSep20})`);

// Monday September 14, 2026 is also in week 38
const monSep14 = parseISODate('2026-09-14');
assert(getISOWeekNumber(monSep14) === 38, `Monday Sep 14, 2026 is in ISO week 38`);

// September 2026 Week 3 in getVisibleWeeksForMonth
const sepWeek3 = weeksSep2026[2];
assert(sepWeek3.isoWeekNumber === 38, `September 2026 Week 3 has isoWeekNumber 38`);
assert(sepWeek3.isoWeekLabel === 'Week 38', `September 2026 Week 3 has label "Week 38"`);
assert(sepWeek3.shortWeekLabel === 'W38', `September 2026 Week 3 has short label "W38"`);

// -------------------------------------------------------------
// 3. Date range labels across month and year boundaries
// -------------------------------------------------------------
console.log('\n--- 3. Date Range Labels ---');

// Same month: Sep 14 – 20
const rangeSameMonth = formatWeekDateRange(new Date(2026, 8, 14), new Date(2026, 8, 20));
assert(rangeSameMonth === 'Sep 14 – 20', `Same month range formatted as "Sep 14 – 20" (got "${rangeSameMonth}")`);

// Crossing months: Aug 31 – Sep 6
const rangeCrossMonth = formatWeekDateRange(new Date(2026, 7, 31), new Date(2026, 8, 6));
assert(rangeCrossMonth === 'Aug 31 – Sep 6', `Crossing month range formatted as "Aug 31 – Sep 6" (got "${rangeCrossMonth}")`);

// Crossing years: Dec 28, 2026 – Jan 3, 2027
const rangeCrossYear = formatWeekDateRange(new Date(2026, 11, 28), new Date(2027, 0, 3));
assert(
  rangeCrossYear === 'Dec 28, 2026 – Jan 3, 2027',
  `Crossing year range formatted as "Dec 28, 2026 – Jan 3, 2027" (got "${rangeCrossYear}")`
);

// -------------------------------------------------------------
// 4. Busiest day calculation rule
// -------------------------------------------------------------
console.log('\n--- 4. Busiest Day Rule ---');

// Count < 2 everywhere -> -1 (no busiest day)
const noBusiest = calculateBusiestDayIndex([1, 0, 1, 0, 1, 0, 0]);
assert(noBusiest === -1, `Max count < 2 returns -1 (got ${noBusiest})`);

// Count >= 2 with ties: [0, 3, 1, 3, 0, 0, 0] -> first wins ties -> index 1
const tieBusiest = calculateBusiestDayIndex([0, 3, 1, 3, 0, 0, 0]);
assert(tieBusiest === 1, `Ties win first day: [0, 3, 1, 3, 0, 0, 0] returns index 1 (got ${tieBusiest})`);

// Normal clear winner
const clearBusiest = calculateBusiestDayIndex([0, 0, 4, 1, 0, 0, 0]);
assert(clearBusiest === 2, `Clear busiest returns index 2 (got ${clearBusiest})`);

// -------------------------------------------------------------
// 5. Item Grouping & Sorting inside a week
// -------------------------------------------------------------
console.log('\n--- 5. Item Sorting (all-day first, then by time) ---');

interface TestItem extends SchedulableItem {
  id: string;
}

const unsortedItems: TestItem[] = [
  { id: '1', dayStr: '2026-09-20', isAllDay: false, sortTime: '14:00:00', title: 'Afternoon Sync' },
  { id: '2', dayStr: '2026-09-20', isAllDay: true, title: 'All Day Workshop' },
  { id: '3', dayStr: '2026-09-20', isAllDay: false, sortTime: '09:00:00', title: 'Morning Review' },
  { id: '4', dayStr: '2026-09-18', isAllDay: false, sortTime: '15:00:00', title: 'Friday Meeting' },
];

const sorted = sortWeekItems(unsortedItems);
assert(sorted[0].id === '4', `Friday item comes first by day`);
assert(sorted[1].id === '2', `Sunday all-day comes before timed items on Sunday`);
assert(sorted[2].id === '3', `Sunday 09:00 comes before Sunday 14:00`);
assert(sorted[3].id === '1', `Sunday 14:00 comes last`);

// -------------------------------------------------------------
// 6. Isolated In-Memory SQLite Test: Recurring Events, Tasks, Spending
// -------------------------------------------------------------
console.log('\n--- 6. Isolated In-Memory SQLite Database Stats ---');

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

// Seed categories
sqlite.exec(`
  INSERT INTO categories (id, name, icon, monthly_cap, color) VALUES
  (1, 'Groceries', 'shopping-cart', 100000, '#E8C99B'),
  (2, 'Dining', 'utensils', 50000, '#E8C99B');
`);

// Insert:
// 1. One non-recurring event on 2026-09-18 (Friday, Week 38)
// 2. One weekly recurring event on Sundays starting 2026-09-06 (appears on 2026-09-06, 2026-09-13, 2026-09-20, 2026-09-27)
sqlite.exec(`
  INSERT INTO events (id, title, start, end, all_day, recurrence) VALUES
  (1, 'Friday Sync', '2026-09-18T10:00:00', '2026-09-18T11:00:00', 0, 'none'),
  (2, 'Weekly Sunday Planning', '2026-09-06T09:00:00', '2026-09-06T10:00:00', 0, 'WEEKLY');
`);

// Insert tasks in week 38 (2026-09-14 to 2026-09-20):
// 2 done, 1 pending -> total 3 tasks, 2 done
sqlite.exec(`
  INSERT INTO tasks (id, title, due_at, done) VALUES
  (1, 'Task 1', '2026-09-15T12:00:00', 1),
  (2, 'Task 2', '2026-09-18T17:00:00', 1),
  (3, 'Task 3', '2026-09-20T16:00:00', 0),
  (4, 'Task in Week 39', '2026-09-22T10:00:00', 0);
`);

// Insert transactions in week 38:
// 2 expenses (₱250.00 = 25000 centavos, ₱150.50 = 15050 centavos) -> total 40050 centavos
// 1 income (₱1,000.00 = 100000 centavos) -> MUST BE EXCLUDED!
sqlite.exec(`
  INSERT INTO transactions (id, type, amount, category_id, date, note) VALUES
  (1, 'expense', 25000, 1, '2026-09-16T10:00:00', 'Supermarket'),
  (2, 'expense', 15050, 2, '2026-09-20T12:00:00', 'Lunch'),
  (3, 'income', 100000, 1, '2026-09-19T09:00:00', 'Salary payment');
`);

// Query Week 38 (2026-09-14 to 2026-09-20)
const week38Start = '2026-09-14';
const week38End = '2026-09-20';
const startBound = `${week38Start}T00:00:00`;
const endBound = `${week38End}T23:59:59`;

// A. Events
const rawEvents = sqlite.prepare(`
  SELECT id, title, start, end, all_day as allDay, recurrence, location
  FROM events
  WHERE start <= ?
`).all(endBound) as unknown as Event[];

const week38Events: Event[] = [];
for (let d = 14; d <= 20; d++) {
  const dStr = `2026-09-${d.toString().padStart(2, '0')}`;
  for (const ev of rawEvents) {
    const expanded = expandEventForDate(ev, dStr);
    if (expanded) {
      week38Events.push(expanded);
    }
  }
}

// Expect 2 events: Friday Sync (2026-09-18) + Weekly Sunday Planning (2026-09-20)
assert(
  week38Events.length === 2,
  `Week 38 has 2 event occurrences including weekly recurrence (got ${week38Events.length})`
);
const hasFridaySync = week38Events.some((e) => e.title === 'Friday Sync');
const hasSundayPlanning = week38Events.some((e) => e.title === 'Weekly Sunday Planning');
assert(hasFridaySync && hasSundayPlanning, `Both Friday Sync and expanded Sunday Planning are present`);

// B. Tasks in Week 38
const week38Tasks = sqlite.prepare(`
  SELECT id, title, due_at as dueAt, done
  FROM tasks
  WHERE due_at IS NOT NULL AND due_at >= ? AND due_at <= ?
`).all(week38Start, endBound) as { id: number; title: string; dueAt: string; done: number }[];

const tasksTotal = week38Tasks.length;
const tasksDone = week38Tasks.filter((t) => t.done === 1).length;
assert(tasksTotal === 3, `Week 38 tasks total is 3 (got ${tasksTotal})`);
assert(tasksDone === 2, `Week 38 tasks done is 2 (got ${tasksDone})`);

// C. Spending (expenses only, income excluded)
const week38Expenses = sqlite.prepare(`
  SELECT id, type, amount, date
  FROM transactions
  WHERE type = 'expense' AND date >= ? AND date <= ?
`).all(week38Start, endBound) as { id: number; type: string; amount: number; date: string }[];

const totalSpentCentavos = week38Expenses.reduce((sum, tx) => sum + tx.amount, 0);
assert(totalSpentCentavos === 40050, `Week 38 total expenses is 40,050 centavos (₱400.50) (got ${totalSpentCentavos})`);
const formattedSpending = formatCurrency(totalSpentCentavos);
assert(formattedSpending === '₱400.50', `Formatted spending is ₱400.50 (got "${formattedSpending}")`);

// Verify income excluded
const anyIncome = week38Expenses.some((tx) => tx.type === 'income');
assert(!anyIncome, `Income transactions are strictly excluded from spending`);

sqlite.close();

if (failed) {
  console.error('\n❌ VERIFICATION FAILED!');
  process.exit(1);
} else {
  console.log('\n🎉 ALL VERIFICATION CHECKS PASSED PERFECTLY!\n');
}
