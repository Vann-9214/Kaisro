import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';

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

// 1. Categories (7 rows)
sqlite.exec(`
  INSERT INTO categories (name, icon, monthly_cap, color) VALUES
  ('Housing & Rent', 'home', 2500000, '#3A4A7A'),
  ('Food & Dining', 'utensils', 1500000, '#E8C99B'),
  ('Groceries', 'shopping-cart', 1200000, '#E8C99B'),
  ('Utilities & Bills', 'zap', 800000, '#6FA8A0'),
  ('Transportation', 'car', 500000, '#3A4A7A'),
  ('Coffee & Snacks', 'coffee', 350000, '#E8C99B'),
  ('Personal & Health', 'heart', 400000, '#6FA8A0');
`);

// 2. Recurring Transactions (3 rows)
sqlite.exec(`
  INSERT INTO recurring_transactions (type, amount, category_id, frequency, start_date, next_date, note) VALUES
  ('expense', 2200000, 1, 'monthly', '2026-01-01', '2026-10-01', 'Apartment monthly lease payment'),
  ('expense', 189900, 4, 'monthly', '2026-01-15', '2026-10-15', 'PLDT Home Fiber Internet'),
  ('expense', 14900, 4, 'monthly', '2026-02-22', '2026-09-22', 'Cloud Storage & Spotify subscription');
`);

// 3. Transactions (21 rows)
sqlite.exec(`
  INSERT INTO transactions (type, amount, category_id, date, note, recurring_id) VALUES
  ('expense', 2200000, 1, '2026-09-01T08:30:00', 'September Apartment Rent', 1),
  ('expense', 384250, 3, '2026-09-03T16:15:00', 'Landers Superstore bi-weekly grocery run', NULL),
  ('expense', 210000, 5, '2026-09-05T09:40:00', 'Shell V-Power gas full tank', NULL),
  ('expense', 68000, 6, '2026-09-06T11:15:00', 'Yardstick artisan coffee beans (250g)', NULL),
  ('expense', 85000, 2, '2026-09-08T13:00:00', 'Client project lunch meeting at Wildflour', NULL),
  ('expense', 54000, 6, '2026-09-10T14:30:00', 'Blue Wonders cold brew pack (4-bottle set)', NULL),
  ('expense', 165000, 2, '2026-09-11T19:30:00', 'Team weekend dinner at BGC High Street', NULL),
  ('expense', 32000, 6, '2026-09-12T10:20:00', 'Iced Americano & butter croissant', NULL),
  ('expense', 86000, 7, '2026-09-13T11:10:00', 'Mercury Drug vitamin C & maintenance supplements', NULL),
  ('expense', 48000, 6, '2026-09-14T15:40:00', 'Afternoon pour-over & pastry at Curator', NULL),
  ('income', 4500000, NULL, '2026-09-15T07:00:00', 'Mid-month consulting retainer payout', NULL),
  ('expense', 432000, 4, '2026-09-15T10:00:00', 'Meralco electricity bill - Sep 2026 billing', NULL),
  ('expense', 189900, 4, '2026-09-15T10:05:00', 'PLDT Home Fiber auto-charge', 2),
  ('expense', 36000, 6, '2026-09-16T09:10:00', 'Morning oat latte & matcha cookie', NULL),
  ('expense', 142000, 3, '2026-09-17T17:45:00', 'Fresh market produce, vegetables & sourdough bread', NULL),
  ('expense', 38000, 5, '2026-09-18T13:10:00', 'Grab ride to BGC studio meeting', NULL),
  ('expense', 52000, 6, '2026-09-19T11:00:00', 'Filter coffee tasting flight', NULL),
  ('expense', 50000, 5, '2026-09-19T16:30:00', 'Beep / MRT transportation card reload', NULL),
  ('expense', 38000, 6, '2026-09-20T08:15:00', 'Morning artisan flat white & croissant', NULL),
  ('expense', 32000, 2, '2026-09-20T12:30:00', 'Salmon teriyaki lunch bento box', NULL),
  ('expense', 28000, 5, '2026-09-20T16:00:00', 'Grab ride to dental appointment', NULL);
`);

// 4. Events (8 rows)
sqlite.exec(`
  INSERT INTO events (title, start, end, all_day, location, reminder_minutes) VALUES
  ('Database Engine & Schema Review', '2026-09-18T15:00:00', '2026-09-18T16:00:00', 0, 'Virtual Sync', 15),
  ('Morning Review & Weekly Planning', '2026-09-20T09:00:00', '2026-09-20T10:00:00', 0, 'Home Workspace', 15),
  ('Kaisro Architecture & Roadmap Sync', '2026-09-20T14:00:00', '2026-09-20T15:30:00', 0, 'Studio / Virtual', 30),
  ('Design System Stitch Alignment (Ad-hoc Sync)', '2026-09-20T14:30:00', '2026-09-20T15:15:00', 0, 'Design Channel', 15),
  ('Evening Recovery Run & Stretch', '2026-09-20T18:00:00', '2026-09-20T19:30:00', 0, 'Track Oval & Fitness Center', 30),
  ('Client Stakeholder Demo & Walkthrough', '2026-09-21T10:30:00', '2026-09-21T11:30:00', 0, 'Makati Office, Level 14', 60),
  ('Dentist Appointment & Dental Cleaning', '2026-09-23T15:00:00', '2026-09-23T16:00:00', 0, 'Centuria Medical Suite 702', 60),
  ('Quarterly Financial & Budget Reflection', '2026-09-25T14:00:00', '2026-09-25T15:00:00', 0, 'Home Studio', 30);
`);

// 5. Tasks (9 rows)
sqlite.exec(`
  INSERT INTO tasks (title, due_at, priority, done, done_at, reminder_minutes) VALUES
  ('Finalize Q3 consulting contract documentation', '2026-09-18T17:00:00', 'urgent', 0, NULL, 30),
  ('Reconcile bi-weekly supermarket receipts', '2026-09-19T12:00:00', 'medium', 0, NULL, 15),
  ('Morning inbox zero & journal entry', '2026-09-20T09:30:00', 'low', 1, '2026-09-20T09:25:00', NULL),
  ('Establish Kaisro foundational SQLite schema and Drizzle migrations', '2026-09-20T16:00:00', 'urgent', 1, '2026-09-20T11:00:00', 30),
  ('Review Meralco electricity invoice and record expenses', '2026-09-20T17:30:00', 'high', 0, NULL, 15),
  ('Review monthly coffee expenditure cap (above 90%)', '2026-09-20', 'high', 0, NULL, NULL),
  ('Confirm weekend running route and hydration stops', NULL, 'low', 1, '2026-09-20T08:00:00', NULL),
  ('Schedule annual routine vehicle maintenance', '2026-09-24T12:00:00', 'low', 0, NULL, 60),
  ('Draft Q4 budget targets and savings allocation', '2026-09-28T19:00:00', 'medium', 0, NULL, NULL);
`);

// 6. Subtasks (7 rows)
sqlite.exec(`
  INSERT INTO subtasks (task_id, title, done, sort_order) VALUES
  (4, 'Draft events and tasks tables', 1, 0),
  (4, 'Store currency strictly in integer centavos', 1, 1),
  (4, 'Generate Drizzle migrations and test rollback', 1, 2),
  (5, 'Check kWh consumption vs August statement', 0, 0),
  (5, 'Confirm online bank payment reference number', 1, 1),
  (6, 'Verify Yardstick and Curator charges', 1, 0),
  (6, 'Calculate remaining coffee allowance for September', 0, 1);
`);

// 7. Tags (5 rows)
sqlite.exec(`
  INSERT INTO tags (name, color) VALUES
  ('Kaisro', '#3A4A7A'),
  ('Finance', '#E8C99B'),
  ('Focus', '#6FA8A0'),
  ('Home', '#33312E'),
  ('Health', '#2E6861');
`);

// 8. Notes (4 rows)
sqlite.exec(`
  INSERT INTO notes (title, body) VALUES
  ('Kaisro Architectural Intentions & Principles', 'Private, single-user, local-first mobile app...'),
  ('September Utility & Consumption Review', 'Dining out stayed nicely within cap despite two weekend dinners...'),
  ('Coffee Tasting & Bean Sourcing Log', 'Yardstick Ethiopia Guji had wonderful floral and apricot notes...'),
  ('Weekly Focus Retrospective', 'Completed foundational SQLite schema migrations...');
`);

// 9. Note Tags (7 rows)
sqlite.exec(`
  INSERT INTO note_tags (note_id, tag_id) VALUES
  (1, 1),
  (1, 3),
  (2, 2),
  (2, 4),
  (3, 2),
  (4, 3),
  (4, 1);
`);

// 10. Note Links (4 rows)
sqlite.exec(`
  INSERT INTO note_links (note_id, target_type, target_id) VALUES
  (1, 'event', 3),
  (2, 'transaction', 12),
  (3, 'task', 6),
  (4, 'event', 2);
`);

console.log('=== ACTUAL SEED ROW COUNTS PER TABLE ===');
const tables = [
  'categories',
  'recurring_transactions',
  'transactions',
  'events',
  'tasks',
  'subtasks',
  'tags',
  'notes',
  'note_tags',
  'note_links',
];

const counts: Record<string, number> = {};
for (const table of tables) {
  const count = (sqlite.prepare(`SELECT count(*) as c FROM ${table}`).get() as any).c;
  counts[table] = count;
  console.log(`  ${table}: ${count} rows`);
}

// Check Coffee & Snacks cap calculation
const coffeeCap = (sqlite.prepare("SELECT monthly_cap FROM categories WHERE name = 'Coffee & Snacks'").get() as any).monthly_cap;
const coffeeSpent = (sqlite.prepare("SELECT sum(amount) as s FROM transactions WHERE category_id = 6").get() as any).s;
const coffeePct = (coffeeSpent / coffeeCap) * 100;
console.log(`\nCoffee & Snacks Budget:`);
console.log(`  Cap: ₱${(coffeeCap / 100).toFixed(2)} (${coffeeCap} centavos)`);
console.log(`  Spent: ₱${(coffeeSpent / 100).toFixed(2)} (${coffeeSpent} centavos)`);
console.log(`  Percentage: ${coffeePct.toFixed(1)}% (Exceeds 90% cap: ${coffeePct > 90})`);

// Check Overlapping Events
console.log(`\nOverlapping Events Check (Sep 20, 2026):`);
const ev1 = sqlite.prepare("SELECT title, start, end FROM events WHERE id = 3").get() as any;
const ev2 = sqlite.prepare("SELECT title, start, end FROM events WHERE id = 4").get() as any;
console.log(`  Event 1: "${ev1.title}" (${ev1.start} to ${ev1.end})`);
console.log(`  Event 2: "${ev2.title}" (${ev2.start} to ${ev2.end})`);
console.log(`  Overlaps: ${ev1.start < ev2.end && ev2.start < ev1.end}`);
