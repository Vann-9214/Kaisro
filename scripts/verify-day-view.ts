import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { computeUnifiedTimelineLayout, formatTimeRange, parseTimeFromISO } from '../src/utils/timelineLayout';
import { formatCurrency } from '../src/constants/currency';

console.log('=== VERIFYING KAISRO CALENDAR DAY VIEW ===\n');

// 1. Setup in-memory SQLite with the migrations
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

// 2. Insert standard seed data
sqlite.exec(`
  INSERT INTO categories (id, name, icon, monthly_cap, color) VALUES
  (1, 'Housing & Rent', 'home', 2500000, '#3A4A7A'),
  (2, 'Food & Dining', 'utensils', 1500000, '#E8C99B'),
  (3, 'Groceries', 'shopping-cart', 1200000, '#E8C99B'),
  (4, 'Utilities & Bills', 'zap', 800000, '#6FA8A0'),
  (5, 'Transportation', 'car', 500000, '#3A4A7A'),
  (6, 'Coffee & Snacks', 'coffee', 350000, '#E8C99B'),
  (7, 'Personal & Health', 'heart', 400000, '#6FA8A0');

  INSERT INTO events (id, title, start, end, all_day, location, reminder_minutes) VALUES
  (1, 'Database Engine & Schema Review', '2026-09-18T15:00:00', '2026-09-18T16:00:00', 0, 'Virtual Sync', 15),
  (2, 'Morning Review & Weekly Planning', '2026-09-20T09:00:00', '2026-09-20T10:00:00', 0, 'Home Workspace', 15),
  (3, 'Kaisro Architecture & Roadmap Sync', '2026-09-20T14:00:00', '2026-09-20T15:30:00', 0, 'Studio / Virtual', 30),
  (4, 'Design System Stitch Alignment (Ad-hoc Sync)', '2026-09-20T14:30:00', '2026-09-20T15:15:00', 0, 'Design Channel', 15),
  (5, 'Evening Recovery Run & Stretch', '2026-09-20T18:00:00', '2026-09-20T19:30:00', 0, 'Track Oval & Fitness Center', 30),
  (6, 'Client Stakeholder Demo & Walkthrough', '2026-09-21T10:30:00', '2026-09-21T11:30:00', 0, 'Makati Office, Level 14', 60);

  INSERT INTO tasks (id, title, due_at, priority, done, done_at, reminder_minutes) VALUES
  (1, 'Finalize Q3 consulting contract documentation', '2026-09-18T17:00:00', 'urgent', 0, NULL, 30),
  (2, 'Reconcile bi-weekly supermarket receipts', '2026-09-19T12:00:00', 'medium', 0, NULL, 15),
  (3, 'Morning inbox zero & journal entry', '2026-09-20T09:30:00', 'low', 1, '2026-09-20T09:25:00', NULL),
  (4, 'Establish Kaisro foundational SQLite schema and Drizzle migrations', '2026-09-20T16:00:00', 'urgent', 1, '2026-09-20T11:00:00', 30),
  (5, 'Review Meralco electricity invoice and record expenses', '2026-09-20T17:30:00', 'high', 0, NULL, 15),
  (6, 'Review monthly coffee expenditure cap (above 90%)', '2026-09-20', 'high', 0, NULL, NULL),
  (7, 'Confirm weekend running route and hydration stops', NULL, 'low', 1, '2026-09-20T08:00:00', NULL);

  INSERT INTO transactions (id, type, amount, category_id, date, note) VALUES
  (1, 'expense', 38000, 6, '2026-09-20T08:15:00', 'Morning artisan flat white & croissant'),
  (2, 'expense', 32000, 2, '2026-09-20T12:30:00', 'Salmon teriyaki lunch bento box'),
  (3, 'expense', 28000, 5, '2026-09-20T16:00:00', 'Grab ride to dental appointment');
`);

// 3. Query items for 2026-09-20
const selectedDateStr = '2026-09-20';

const events = sqlite.prepare("SELECT * FROM events WHERE start LIKE ?").all(`${selectedDateStr}%`) as any[];
const tasks = sqlite.prepare("SELECT * FROM tasks WHERE due_at LIKE ? OR due_at IS NULL").all(`${selectedDateStr}%`) as any[];
const transactions = sqlite.prepare("SELECT * FROM transactions WHERE date LIKE ?").all(`${selectedDateStr}%`) as any[];
const categories = sqlite.prepare("SELECT * FROM categories").all() as any[];
const catMap = new Map(categories.map((c) => [c.id, c]));

console.log(`Date: ${selectedDateStr}`);
console.log(`- Events count: ${events.length}`);
console.log(`- Tasks count: ${tasks.length}`);
console.log(`- Transactions count: ${transactions.length}`);

// 4. Compute Day Summary
const eventsCount = events.length;
const tasksLeft = tasks.filter((t) => !t.done).length;
const totalSpentCentavos = transactions
  .filter((t) => t.type === 'expense')
  .reduce((acc, t) => acc + t.amount, 0);

console.log('\n[Summary Row]');
console.log(`  "${eventsCount} events · ${tasksLeft} tasks left · ${formatCurrency(totalSpentCentavos, false)} spent"`);

if (eventsCount !== 4) throw new Error(`Expected 4 events on 2026-09-20, got ${eventsCount}`);
if (tasksLeft !== 2) throw new Error(`Expected 2 tasks left on 2026-09-20, got ${tasksLeft}`);
if (totalSpentCentavos !== 98000) throw new Error(`Expected 98000 centavos, got ${totalSpentCentavos}`);

// 5. Test Timeline Layout and Overlapping Events in 24-Hour Range
const enrichedTx = transactions.map((t) => ({ ...t, category: catMap.get(t.category_id) }));
const layoutItems = computeUnifiedTimelineLayout(events, tasks, enrichedTx);

console.log('\n[Timeline Layout Check (24-Hour Range)]');
console.log(`Total layout items generated: ${layoutItems.length}`);

// Find overlapping events (id 3 and 4)
const itemEv3 = layoutItems.find((i) => i.event?.id === 3);
const itemEv4 = layoutItems.find((i) => i.event?.id === 4);

if (!itemEv3 || !itemEv4) {
  throw new Error('Overlapping events (id 3 and 4) not found in layout!');
}

console.log(`\nOverlapping Events:`);
console.log(`- "${itemEv3.event?.title}": colIndex=${itemEv3.colIndex}, totalCols=${itemEv3.totalCols}, top=${itemEv3.top}, height=${itemEv3.height}`);
console.log(`- "${itemEv4.event?.title}": colIndex=${itemEv4.colIndex}, totalCols=${itemEv4.totalCols}, top=${itemEv4.top}, height=${itemEv4.height}`);

// At START_HOUR = 0, 14:00 is 14 * 72 = 1008px. Height 90m = 108px.
if (itemEv3.top !== 1008 || itemEv3.height !== 108) {
  throw new Error(`Event 3 coordinates incorrect in 24h range: expected top=1008, height=108, got top=${itemEv3.top}, height=${itemEv3.height}`);
}
// At START_HOUR = 0, 14:30 is 14.5 * 72 = 1044px. Height 45m = 54px.
if (itemEv4.top !== 1044 || itemEv4.height !== 54) {
  throw new Error(`Event 4 coordinates incorrect in 24h range: expected top=1044, height=54, got top=${itemEv4.top}, height=${itemEv4.height}`);
}

if (itemEv3.totalCols < 2 || itemEv4.totalCols < 2) {
  throw new Error('Events 3 & 4 should have totalCols >= 2 for side-by-side rendering!');
}
if (itemEv3.colIndex === itemEv4.colIndex) {
  throw new Error('Events 3 & 4 should have different colIndex!');
}
console.log('  -> PASS: Overlapping events are placed side-by-side cleanly at 24h positions!');

// 6. Test Midnight Clamping Across Days
console.log('\n[Midnight Clamping Check]');
// Event that started yesterday (23:00) and ends today at 02:00
const yesterdayMidnightEv = [{
  id: 101,
  title: 'Late Night Deploy & Migration',
  start: '2026-09-19T23:00:00',
  end: '2026-09-20T02:00:00',
  allDay: 0,
}];
const clampedYesterday = computeUnifiedTimelineLayout(yesterdayMidnightEv as any, [], [], 0, 72, '2026-09-20');
if (clampedYesterday.length !== 1 || clampedYesterday[0].top !== 0 || clampedYesterday[0].height !== 144) {
  throw new Error(`Yesterday midnight crossing event not clamped correctly: top=${clampedYesterday[0]?.top}, height=${clampedYesterday[0]?.height}`);
}
console.log('  -> PASS: Yesterday event crossing midnight clamped to top (00:00, top=0, height=144)!');

// Event that starts tonight at 23:00 and runs past midnight until 02:00 tomorrow
const tomorrowMidnightEv = [{
  id: 102,
  title: 'Overnight System Maintenance',
  start: '2026-09-20T23:00:00',
  end: '2026-09-21T02:00:00',
  allDay: 0,
}];
const clampedTomorrow = computeUnifiedTimelineLayout(tomorrowMidnightEv as any, [], [], 0, 72, '2026-09-20');
if (clampedTomorrow.length !== 1 || clampedTomorrow[0].top !== 1656 || clampedTomorrow[0].height !== 72) {
  throw new Error(`Tomorrow midnight crossing event not clamped correctly: top=${clampedTomorrow[0]?.top}, height=${clampedTomorrow[0]?.height}`);
}
console.log('  -> PASS: Tonight event running past midnight clamped to bottom (24:00, top=1656, height=72)!');

// 7. Test 24-Hour Hour Labels and Closing Midnight Line
console.log('\n[Hour Labels and Closing Midnight Line Check]');
import { formatTimeDisplay, START_HOUR, END_HOUR } from '../src/utils/timelineLayout';
if (START_HOUR !== 0 || END_HOUR !== 24) {
  throw new Error(`Expected START_HOUR=0 and END_HOUR=24, got ${START_HOUR}, ${END_HOUR}`);
}
const labelStart = formatTimeDisplay(0, 0);
const labelNoon = formatTimeDisplay(12, 0);
const label11PM = formatTimeDisplay(23, 0);
const labelClosingMidnight = formatTimeDisplay(24, 0);

console.log(`  Hour 0 (Start):     ${labelStart}`);
console.log(`  Hour 12 (Noon):     ${labelNoon}`);
console.log(`  Hour 23 (11 PM):    ${label11PM}`);
console.log(`  Hour 24 (Closing):  ${labelClosingMidnight}`);

if (labelStart !== '12:00 AM') throw new Error(`Expected '12:00 AM' for hour 0, got ${labelStart}`);
if (labelNoon !== '12:00 PM') throw new Error(`Expected '12:00 PM' for hour 12, got ${labelNoon}`);
if (label11PM !== '11:00 PM') throw new Error(`Expected '11:00 PM' for hour 23, got ${label11PM}`);
if (labelClosingMidnight !== '12:00 AM') throw new Error(`Expected '12:00 AM' for hour 24 closing line, got ${labelClosingMidnight}`);
console.log('  -> PASS: Hour labels match 12-hour format with closing midnight line!');

// 8. Test Task Toggle in SQLite
console.log('\n[Task Toggling in SQLite]');
const taskToToggle = tasks.find((t) => t.id === 5); // Review Meralco electricity invoice (currently done = 0)
console.log(`Before toggle: Task 5 "${taskToToggle.title}" done = ${taskToToggle.done}`);

sqlite.prepare("UPDATE tasks SET done = 1, done_at = CURRENT_TIMESTAMP WHERE id = 5").run();
const updatedTask = sqlite.prepare("SELECT * FROM tasks WHERE id = 5").get() as any;
console.log(`After toggle:  Task 5 "${updatedTask.title}" done = ${updatedTask.done}`);

if (updatedTask.done !== 1) {
  throw new Error('Failed to update task in SQLite!');
}

// Re-calculate tasks left
const updatedTasks = sqlite.prepare("SELECT * FROM tasks WHERE due_at LIKE ? OR due_at IS NULL").all(`${selectedDateStr}%`) as any[];
const updatedTasksLeft = updatedTasks.filter((t) => !t.done).length;
console.log(`Updated tasks left: ${updatedTasksLeft} (was ${tasksLeft})`);
if (updatedTasksLeft !== tasksLeft - 1) {
  throw new Error(`Expected tasks left to decrement to ${tasksLeft - 1}, got ${updatedTasksLeft}`);
}

console.log('\nAll 24-hour timeline layout, midnight clamping, SQLite, and summary calculations PASSED with 100% accuracy!\n');
