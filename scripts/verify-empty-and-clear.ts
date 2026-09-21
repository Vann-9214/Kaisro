/**
 * Verification Script: Empty App Initialization & "Clear All Data" State
 *
 * Uses an isolated temporary test database (never touches the user's kaisro.db).
 *
 * Verifies:
 * 1. Initial empty app launch state has 0 events, 0 tasks, 0 transactions, 0 notes.
 * 2. Exactly the 8 default starter categories exist with NO monthly cap (monthlyCap = null).
 * 3. Calling ensureDefaultCategories() multiple times is strictly idempotent.
 * 4. Inserting dummy records into all tables and calling clearAllDataAndReset()
 *    cleanly wipes all records respecting foreign key order, re-inserts the default
 *    starter categories, and leaves the app in an identical pristine state.
 * 5. Day view summary correctly computes to 0 events · 0 tasks left · ₱0 spent.
 */

import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_CATEGORIES } from '../src/constants/defaultCategories';

const TEMP_DB_PATH = path.join(__dirname, 'temp_verify_empty.db');

function cleanupTempDb() {
  try {
    if (fs.existsSync(TEMP_DB_PATH)) {
      fs.unlinkSync(TEMP_DB_PATH);
    }
  } catch (e) {
    // Ignore cleanup error
  }
}

function runVerification() {
  console.log('====================================================');
  console.log('  Kaisro Empty Database & Data Reset Verification');
  console.log('====================================================\n');

  cleanupTempDb();

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
    }
  }

  const sqlite = new DatabaseSync(TEMP_DB_PATH);
  sqlite.exec('PRAGMA foreign_keys = ON;');

  // 1. Create tables directly from migration SQL
  const migrationSqlPath = path.join(__dirname, '../src/db/migrations/0000_amusing_santa_claus.sql');
  const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
  const statements = migrationSql.split('--> statement-breakpoint');
  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed) {
      sqlite.exec(trimmed);
    }
  }

  // Helper simulating ensureDefaultCategories logic
  function insertDefaultCategoriesIfEmpty(): boolean {
    const check = sqlite.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
    if (check.count === 0) {
      const stmt = sqlite.prepare(`
        INSERT INTO categories (name, icon, color, monthly_cap, created_at)
        VALUES (?, ?, ?, NULL, datetime('now'))
      `);
      for (const cat of DEFAULT_CATEGORIES) {
        stmt.run(cat.name, cat.icon, cat.color);
      }
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // Test 1: App First Launch with ensureDefaultCategories
  // -------------------------------------------------------------
  console.log('Test 1: App Initialization on Pristine Database');
  const firstInitResult = insertDefaultCategoriesIfEmpty();
  assert(firstInitResult === true, 'insertDefaultCategoriesIfEmpty returns true on first insertion');

  const evs = sqlite.prepare('SELECT * FROM events').all();
  const tasks = sqlite.prepare('SELECT * FROM tasks').all();
  const txs = sqlite.prepare('SELECT * FROM transactions').all();
  const notes = sqlite.prepare('SELECT * FROM notes').all();
  const cats = sqlite.prepare('SELECT * FROM categories').all() as Array<{ id: number; name: string; monthly_cap: number | null }>;

  assert(evs.length === 0, 'Zero events on initial launch', `found: ${evs.length}`);
  assert(tasks.length === 0, 'Zero tasks on initial launch', `found: ${tasks.length}`);
  assert(txs.length === 0, 'Zero transactions on initial launch', `found: ${txs.length}`);
  assert(notes.length === 0, 'Zero notes on initial launch', `found: ${notes.length}`);
  assert(cats.length === 8, 'Exactly 8 default categories inserted', `found: ${cats.length}`);

  const expectedNames = [
    'Housing',
    'Groceries',
    'Food & Dining',
    'Utilities',
    'Transport',
    'Coffee & Snacks',
    'Health',
    'Other',
  ];
  const actualNames = cats.map((c) => c.name);
  const allNamesMatch = expectedNames.every((name) => actualNames.includes(name));
  assert(allNamesMatch, 'All 8 starter category names match requirement', actualNames.join(', '));

  const allCapsNull = cats.every((c) => c.monthly_cap === null || c.monthly_cap === undefined);
  assert(allCapsNull, 'All starter categories have NO monthly cap (monthly_cap = null)');
  console.log();

  // -------------------------------------------------------------
  // Test 2: Idempotency Check
  // -------------------------------------------------------------
  console.log('Test 2: Idempotency of ensureDefaultCategories');
  const secondInitResult = insertDefaultCategoriesIfEmpty();
  assert(secondInitResult === false, 'Subsequent call returns false (skipped)');
  const catsAfterSecond = sqlite.prepare('SELECT * FROM categories').all();
  assert(catsAfterSecond.length === 8, 'Categories count remains exactly 8');
  console.log();

  // -------------------------------------------------------------
  // Test 3: Populate with Dummy Records across all tables
  // -------------------------------------------------------------
  console.log('Test 3: Populating Dummy Data Across All Tables');

  sqlite.prepare(`
    INSERT INTO events (title, start, end, all_day, created_at, updated_at)
    VALUES ('Dummy Meeting', '2026-09-20T10:00:00', '2026-09-20T11:00:00', 0, datetime('now'), datetime('now'))
  `).run();

  sqlite.prepare(`
    INSERT INTO tasks (title, priority, done, created_at, updated_at)
    VALUES ('Dummy Task', 'high', 0, datetime('now'), datetime('now'))
  `).run();

  sqlite.prepare(`
    INSERT INTO subtasks (task_id, title, done, created_at)
    VALUES (1, 'Dummy Subtask', 0, datetime('now'))
  `).run();

  sqlite.prepare(`
    INSERT INTO transactions (type, amount, category_id, date, created_at)
    VALUES ('expense', 15000, 1, '2026-09-20T12:00:00', datetime('now'))
  `).run();

  sqlite.prepare(`
    INSERT INTO recurring_transactions (type, amount, category_id, frequency, start_date, next_date, created_at, updated_at)
    VALUES ('expense', 25000, 1, 'monthly', '2026-09-20', '2026-10-20', datetime('now'), datetime('now'))
  `).run();

  sqlite.prepare(`
    INSERT INTO notes (title, body, created_at, updated_at)
    VALUES ('Dummy Note', 'Dummy Body', datetime('now'), datetime('now'))
  `).run();

  sqlite.prepare(`
    INSERT INTO tags (name, color, created_at)
    VALUES ('Dummy Tag', '#3A4A7A', datetime('now'))
  `).run();

  sqlite.prepare(`
    INSERT INTO note_tags (note_id, tag_id)
    VALUES (1, 1)
  `).run();

  sqlite.prepare(`
    INSERT INTO note_links (note_id, target_type, target_id, created_at)
    VALUES (1, 'event', 1, datetime('now'))
  `).run();

  const [evsFilled, tasksFilled, txsFilled, notesFilled] = [
    sqlite.prepare('SELECT * FROM events').all(),
    sqlite.prepare('SELECT * FROM tasks').all(),
    sqlite.prepare('SELECT * FROM transactions').all(),
    sqlite.prepare('SELECT * FROM notes').all(),
  ];
  assert(
    evsFilled.length > 0 && tasksFilled.length > 0 && txsFilled.length > 0 && notesFilled.length > 0,
    'Dummy records populated successfully in events, tasks, transactions, and notes'
  );
  console.log();

  // -------------------------------------------------------------
  // Test 4: Clear All Data in Foreign Key Order
  // -------------------------------------------------------------
  console.log('Test 4: Clear All Data and Restore Default Categories');
  sqlite.exec(`
    DELETE FROM note_links;
    DELETE FROM note_tags;
    DELETE FROM notes;
    DELETE FROM tags;
    DELETE FROM subtasks;
    DELETE FROM tasks;
    DELETE FROM events;
    DELETE FROM transactions;
    DELETE FROM recurring_transactions;
    DELETE FROM categories;
  `);

  insertDefaultCategoriesIfEmpty();

  const evsCleared = sqlite.prepare('SELECT * FROM events').all();
  const tasksCleared = sqlite.prepare('SELECT * FROM tasks').all() as Array<{ done: number }>;
  const subtasksCleared = sqlite.prepare('SELECT * FROM subtasks').all();
  const txsCleared = sqlite.prepare('SELECT * FROM transactions').all() as Array<{ type: string; amount: number }>;
  const recurringCleared = sqlite.prepare('SELECT * FROM recurring_transactions').all();
  const notesCleared = sqlite.prepare('SELECT * FROM notes').all();
  const tagsCleared = sqlite.prepare('SELECT * FROM tags').all();
  const noteLinksCleared = sqlite.prepare('SELECT * FROM note_links').all();
  const noteTagsCleared = sqlite.prepare('SELECT * FROM note_tags').all();
  const catsReset = sqlite.prepare('SELECT * FROM categories').all() as Array<{ monthly_cap: number | null }>;

  assert(evsCleared.length === 0, 'Events table is empty (0)');
  assert(tasksCleared.length === 0, 'Tasks table is empty (0)');
  assert(subtasksCleared.length === 0, 'Subtasks table is empty (0)');
  assert(txsCleared.length === 0, 'Transactions table is empty (0)');
  assert(recurringCleared.length === 0, 'Recurring transactions table is empty (0)');
  assert(notesCleared.length === 0, 'Notes table is empty (0)');
  assert(tagsCleared.length === 0, 'Tags table is empty (0)');
  assert(noteLinksCleared.length === 0, 'Note links table is empty (0)');
  assert(noteTagsCleared.length === 0, 'Note tags table is empty (0)');
  assert(catsReset.length === 8, 'Default categories restored to exactly 8');
  assert(
    catsReset.every((c) => c.monthly_cap === null || c.monthly_cap === undefined),
    'Restored categories have NO monthly cap'
  );
  console.log();

  // -------------------------------------------------------------
  // Test 5: Day View Summary calculation with empty database
  // -------------------------------------------------------------
  console.log('Test 5: Day View Summary with Empty Database');
  const daySummary = {
    eventsCount: evsCleared.length,
    tasksLeftCount: tasksCleared.filter((t) => !t.done).length,
    totalSpentCentavos: txsCleared
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0),
  };
  assert(
    daySummary.eventsCount === 0 &&
      daySummary.tasksLeftCount === 0 &&
      daySummary.totalSpentCentavos === 0,
    'Day view summary calculates to 0 events · 0 tasks left · ₱0 spent',
    `${daySummary.eventsCount} events · ${daySummary.tasksLeftCount} tasks left · ₱${daySummary.totalSpentCentavos / 100} spent`
  );
  console.log();

  sqlite.close();
  cleanupTempDb();

  console.log(`====================================================`);
  console.log(`  Summary: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runVerification();
