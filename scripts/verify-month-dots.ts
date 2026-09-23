import { DatabaseSync } from 'node:sqlite';
import { computeWeekDots } from '../src/utils/weekDots';
import { Event } from '../src/db/schema';
import { getMonthGridDates } from '../src/utils/monthUtils';

/**
 * Isolated verification script that tests dot computation for Month view
 * using a temporary in-memory SQLite database.
 * NEVER connects to or modifies the real application database.
 */
async function main() {
  console.log('=== Month View Recurring Event Dot Computation Verification ===\n');

  // 1. Create completely isolated in-memory SQLite database
  const tempDb = new DatabaseSync(':memory:');
  console.log('✔ Created temporary in-memory SQLite database (isolated from app data)');

  // 2. Set up minimal schema
  tempDb.exec(`
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT,
      all_day INTEGER DEFAULT 0,
      location TEXT,
      recurrence TEXT,
      reminder_minutes INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      due_at TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      done INTEGER NOT NULL DEFAULT 0,
      done_at TEXT,
      reminder_minutes INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category_id INTEGER,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  console.log('✔ Schema initialized in temporary database');

  // 3. Insert test fixtures:
  // - Event 1: Weekly recurring event on Wednesdays starting Sep 2, 2026
  // - Event 2: Daily recurring event starting Sep 5, 2026
  // - Event 3: Monthly recurring event on the 15th starting Aug 15, 2026
  // - Task 1: Due on Sep 12, 2026
  // - Transaction 1: Expense on Sep 15, 2026
  const insertEvent = tempDb.prepare(`
    INSERT INTO events (title, start, end, all_day, recurrence, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  insertEvent.run('Weekly Team Sync', '2026-09-02T10:00:00', '2026-09-02T11:00:00', 0, 'WEEKLY');
  insertEvent.run('Daily Morning Habit', '2026-09-05T07:30:00', '2026-09-05T08:00:00', 0, 'DAILY');
  insertEvent.run('Monthly Subscription Review', '2026-08-15T14:00:00', '2026-08-15T14:30:00', 0, 'MONTHLY');

  const insertTask = tempDb.prepare(`
    INSERT INTO tasks (title, due_at, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `);
  insertTask.run('Submit monthly report', '2026-09-12T17:00:00');

  const insertTx = tempDb.prepare(`
    INSERT INTO transactions (type, amount, date, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  insertTx.run('expense', 250000, '2026-09-15T12:30:00', 'Groceries');

  console.log('✔ Test fixtures inserted:');
  console.log('   - Event: WEEKLY on Wednesdays (starts 2026-09-02)');
  console.log('   - Event: DAILY (starts 2026-09-05)');
  console.log('   - Event: MONTHLY on 15th (starts 2026-08-15)');
  console.log('   - Task: Due on 2026-09-12');
  console.log('   - Expense: Spent ₱2,500.00 on 2026-09-15\n');

  // 4. Query the visible grid for September 2026 in 1 query per data type
  const gridDates = getMonthGridDates(2026, 9, 1);
  const startDateStr = gridDates[0];
  const endDateStr = gridDates[gridDates.length - 1];
  const startBound = `${startDateStr}T00:00:00`;
  const endBound = `${endDateStr}T23:59:59`;

  // Query 1: Non-recurring events
  const nonRecurringStmt = tempDb.prepare(`
    SELECT id, title, start, end, all_day as allDay, location, recurrence, reminder_minutes as reminderMinutes, created_at as createdAt, updated_at as updatedAt
    FROM events
    WHERE (recurrence IS NULL OR recurrence = 'none')
      AND start <= ?
      AND COALESCE(end, start) >= ?
  `);
  const nonRecurring = nonRecurringStmt.all(endBound, startBound) as unknown as Event[];

  // Query 2: Recurring event candidates
  const recurringStmt = tempDb.prepare(`
    SELECT id, title, start, end, all_day as allDay, location, recurrence, reminder_minutes as reminderMinutes, created_at as createdAt, updated_at as updatedAt
    FROM events
    WHERE recurrence IS NOT NULL AND recurrence != 'none' AND start <= ?
  `);
  const recurring = recurringStmt.all(endBound) as unknown as Event[];
  const allEvents = [...nonRecurring, ...recurring];

  // Query 3: Tasks
  const tasksStmt = tempDb.prepare(`
    SELECT id, due_at as dueAt
    FROM tasks
    WHERE due_at IS NOT NULL AND due_at >= ? AND due_at <= ?
  `);
  const tasks = tasksStmt.all(startDateStr, endBound) as unknown as { id: number; dueAt: string | null }[];

  // Query 4: Expense transactions
  const txStmt = tempDb.prepare(`
    SELECT id, type, date
    FROM transactions
    WHERE type = 'expense' AND date >= ? AND date <= ?
  `);
  const transactions = txStmt.all(startDateStr, endBound) as unknown as { id: number; type: string; date: string }[];

  console.log(`✔ Single-query fetch completed for visible month window (${startDateStr} to ${endDateStr}):`);
  console.log(`   - Events found: ${allEvents.length}`);
  console.log(`   - Tasks found: ${tasks.length}`);
  console.log(`   - Transactions found: ${transactions.length}\n`);

  // 5. Compute dots using pure function
  const dotsMap = computeWeekDots(gridDates, allEvents, tasks, transactions);

  // 6. Verify assertions
  let allPassed = true;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(` PASS: ${description}`);
    } else {
      console.error(` FAIL: ${description}`);
      allPassed = false;
    }
  }

  console.log('--- Verifying Dot Computations ---');

  // Test 1: 2026-09-01 (Tuesday) - before weekly starts on Sep 2, before daily starts on Sep 5
  assert(
    !dotsMap['2026-09-01']?.hasEvents &&
    !dotsMap['2026-09-01']?.hasTasks &&
    !dotsMap['2026-09-01']?.hasExpenses,
    '2026-09-01 (Tuesday): No dots on empty date'
  );

  // Test 2: 2026-09-02 (Wednesday) - Weekly event start day
  assert(
    dotsMap['2026-09-02']?.hasEvents === true &&
    !dotsMap['2026-09-02']?.hasTasks &&
    !dotsMap['2026-09-02']?.hasExpenses,
    '2026-09-02 (Wednesday): Event dot present for weekly recurring event start'
  );

  // Test 3: 2026-09-03 & 2026-09-04 - Between weekly events and before daily starts
  assert(
    !dotsMap['2026-09-03']?.hasEvents && !dotsMap['2026-09-04']?.hasEvents,
    '2026-09-03 & 2026-09-04: No event dots before daily starts and non-Wednesday'
  );

  // Test 4: 2026-09-05 (Saturday) - Daily event start day
  assert(
    dotsMap['2026-09-05']?.hasEvents === true,
    '2026-09-05 (Saturday): Event dot present for daily event start'
  );

  // Test 5: 2026-09-06 (Sunday) - Daily event repeats
  assert(
    dotsMap['2026-09-06']?.hasEvents === true,
    '2026-09-06 (Sunday): Event dot present for daily event repeat'
  );

  // Test 6: 2026-09-09 (Wednesday) - Both daily and weekly repeat
  assert(
    dotsMap['2026-09-09']?.hasEvents === true,
    '2026-09-09 (Wednesday): Event dot present when daily and weekly both repeat'
  );

  // Test 7: 2026-09-12 (Saturday) - Daily event + Task due
  assert(
    dotsMap['2026-09-12']?.hasEvents === true &&
    dotsMap['2026-09-12']?.hasTasks === true &&
    !dotsMap['2026-09-12']?.hasExpenses,
    '2026-09-12 (Saturday): Event dot (primary) AND Task dot (teal) both present'
  );

  // Test 8: 2026-09-15 (Tuesday) - Daily event + Monthly event + Expense
  assert(
    dotsMap['2026-09-15']?.hasEvents === true &&
    !dotsMap['2026-09-15']?.hasTasks &&
    dotsMap['2026-09-15']?.hasExpenses === true,
    '2026-09-15 (Tuesday): Event dot (monthly + daily) AND Expense dot (money) both present'
  );

  // Test 9: 2026-09-16, 2026-09-23, 2026-09-30 (all Wednesdays) - Weekly repeats throughout the month
  assert(
    dotsMap['2026-09-16']?.hasEvents === true &&
    dotsMap['2026-09-23']?.hasEvents === true &&
    dotsMap['2026-09-30']?.hasEvents === true,
    'All subsequent Wednesdays in September have event dots from weekly recurrence'
  );

  // Test 10: Daily recurrence continues on every day through end of month
  let dailyCheckPass = true;
  for (let d = 5; d <= 30; d++) {
    const dayStr = `2026-09-${d.toString().padStart(2, '0')}`;
    if (!dotsMap[dayStr]?.hasEvents) {
      dailyCheckPass = false;
      break;
    }
  }
  assert(dailyCheckPass, 'Every day from Sep 5 through Sep 30 has event dot from daily recurrence');

  // Close temp database
  tempDb.close();
  console.log('\n✔ Temporary test database safely closed and destroyed');

  if (!allPassed) {
    console.error('\n❌ Some dot computation tests failed!');
    process.exit(1);
  }

  console.log('\n🎉 ALL DOT COMPUTATION TESTS PASSED SUCCESSFULLY!\n');
}

main().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
