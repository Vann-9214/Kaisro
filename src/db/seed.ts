import { getDb, getExpoDb } from './index';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

export interface SeedResult {
  categories: number;
  recurringTransactions: number;
  transactions: number;
  events: number;
  tasks: number;
  subtasks: number;
  tags: number;
  notes: number;
  noteTags: number;
  noteLinks: number;
}

/**
 * Seeds realistic sample data for Kaisro for the current month (September 2026).
 * Amounts are stored strictly in integer centavos (e.g. ₱150.00 -> 15000).
 * Strictly idempotent (only runs if the database is empty) and development-only.
 */
export async function seedDatabase(options: { forceReset?: boolean } = {}): Promise<SeedResult | null> {
  // Development-only guard: Never seed in production builds
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  if (!isDev) {
    return null;
  }

  const db = getDb();
  const expoDb = getExpoDb();

  // Strict Idempotency check: Only run when the database is completely empty
  if (!options.forceReset) {
    const [catCount, evCount, taskCount, txCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.categories),
      db.select({ count: sql<number>`count(*)` }).from(schema.events),
      db.select({ count: sql<number>`count(*)` }).from(schema.tasks),
      db.select({ count: sql<number>`count(*)` }).from(schema.transactions),
    ]);

    const totalRows =
      (catCount[0]?.count ?? 0) +
      (evCount[0]?.count ?? 0) +
      (taskCount[0]?.count ?? 0) +
      (txCount[0]?.count ?? 0);

    if (totalRows > 0) {
      console.log('[Kaisro Seed] Database already contains records. Skipping seed.');
      return null;
    }
  }

  if (options.forceReset) {
    console.log('[Kaisro Seed] Force resetting tables...');
    expoDb.execSync(`
      DELETE FROM note_tags;
      DELETE FROM note_links;
      DELETE FROM notes;
      DELETE FROM tags;
      DELETE FROM subtasks;
      DELETE FROM tasks;
      DELETE FROM transactions;
      DELETE FROM recurring_transactions;
      DELETE FROM categories;
      DELETE FROM events;
    `);
  }

  console.log('[Kaisro Seed] Seeding realistic sample data for September 2026...');

  // ----------------------------------------------------------------------
  // 1. Seed Categories (Budgets in Centavos) - 7 categories
  // ----------------------------------------------------------------------
  const insertedCategories = await db
    .insert(schema.categories)
    .values([
      { name: 'Housing & Rent', icon: 'home', monthlyCap: 2500000, color: '#3A4A7A' }, // ₱25,000.00
      { name: 'Food & Dining', icon: 'utensils', monthlyCap: 1500000, color: '#E8C99B' },  // ₱15,000.00
      { name: 'Groceries', icon: 'shopping-cart', monthlyCap: 1200000, color: '#E8C99B' }, // ₱12,000.00
      { name: 'Utilities & Bills', icon: 'zap', monthlyCap: 800000, color: '#6FA8A0' },    // ₱8,000.00
      { name: 'Transportation', icon: 'car', monthlyCap: 500000, color: '#3A4A7A' },        // ₱5,000.00
      { name: 'Coffee & Snacks', icon: 'coffee', monthlyCap: 350000, color: '#E8C99B' },    // ₱3,500.00 (will exceed 90% cap!)
      { name: 'Personal & Health', icon: 'heart', monthlyCap: 400000, color: '#6FA8A0' },   // ₱4,000.00
    ])
    .returning();

  const catMap = Object.fromEntries(insertedCategories.map((c) => [c.name, c.id]));

  // ----------------------------------------------------------------------
  // 2. Seed Recurring Transactions (3 rules)
  // ----------------------------------------------------------------------
  const insertedRecurring = await db
    .insert(schema.recurringTransactions)
    .values([
      {
        type: 'expense',
        amount: 2200000, // ₱22,000.00
        categoryId: catMap['Housing & Rent'],
        frequency: 'monthly',
        startDate: '2026-01-01',
        nextDate: '2026-10-01',
        note: 'Apartment monthly lease payment',
      },
      {
        type: 'expense',
        amount: 189900, // ₱1,899.00
        categoryId: catMap['Utilities & Bills'],
        frequency: 'monthly',
        startDate: '2026-01-15',
        nextDate: '2026-10-15',
        note: 'PLDT Home Fiber Internet',
      },
      {
        type: 'expense',
        amount: 14900, // ₱149.00
        categoryId: catMap['Utilities & Bills'],
        frequency: 'monthly',
        startDate: '2026-02-22',
        nextDate: '2026-09-22',
        note: 'Cloud Storage & Spotify subscription',
      },
    ])
    .returning();

  // ----------------------------------------------------------------------
  // 3. Seed Transactions (21 transactions across all categories)
  // Note: Coffee & Snacks total = 68,000 + 54,000 + 32,000 + 48,000 + 36,000 + 52,000 + 38,000 = 328,000 centavos
  // 328,000 / 350,000 = 93.7% of cap (>90% threshold for budget warning!)
  // ----------------------------------------------------------------------
  const insertedTransactions = await db
    .insert(schema.transactions)
    .values([
      {
        type: 'expense',
        amount: 2200000, // ₱22,000.00
        categoryId: catMap['Housing & Rent'],
        date: '2026-09-01T08:30:00',
        note: 'September Apartment Rent',
        recurringId: insertedRecurring[0]?.id,
      },
      {
        type: 'expense',
        amount: 384250, // ₱3,842.50
        categoryId: catMap['Groceries'],
        date: '2026-09-03T16:15:00',
        note: 'Landers Superstore bi-weekly grocery run',
      },
      {
        type: 'expense',
        amount: 210000, // ₱2,100.00
        categoryId: catMap['Transportation'],
        date: '2026-09-05T09:40:00',
        note: 'Shell V-Power gas full tank',
      },
      {
        type: 'expense',
        amount: 68000, // ₱680.00
        categoryId: catMap['Coffee & Snacks'],
        date: '2026-09-06T11:15:00',
        note: 'Yardstick artisan coffee beans (250g)',
      },
      {
        type: 'expense',
        amount: 85000, // ₱850.00
        categoryId: catMap['Food & Dining'],
        date: '2026-09-08T13:00:00',
        note: 'Client project lunch meeting at Wildflour',
      },
      {
        type: 'expense',
        amount: 54000, // ₱540.00
        categoryId: catMap['Coffee & Snacks'],
        date: '2026-09-10T14:30:00',
        note: 'Blue Wonders cold brew pack (4-bottle set)',
      },
      {
        type: 'expense',
        amount: 165000, // ₱1,650.00
        categoryId: catMap['Food & Dining'],
        date: '2026-09-11T19:30:00',
        note: 'Team weekend dinner at BGC High Street',
      },
      {
        type: 'expense',
        amount: 32000, // ₱320.00
        categoryId: catMap['Coffee & Snacks'],
        date: '2026-09-12T10:20:00',
        note: 'Iced Americano & butter croissant',
      },
      {
        type: 'expense',
        amount: 86000, // ₱860.00
        categoryId: catMap['Personal & Health'],
        date: '2026-09-13T11:10:00',
        note: 'Mercury Drug vitamin C & maintenance supplements',
      },
      {
        type: 'expense',
        amount: 48000, // ₱480.00
        categoryId: catMap['Coffee & Snacks'],
        date: '2026-09-14T15:40:00',
        note: 'Afternoon pour-over & pastry at Curator',
      },
      {
        type: 'income',
        amount: 4500000, // ₱45,000.00
        date: '2026-09-15T07:00:00',
        note: 'Mid-month consulting retainer payout',
      },
      {
        type: 'expense',
        amount: 432000, // ₱4,320.00
        categoryId: catMap['Utilities & Bills'],
        date: '2026-09-15T10:00:00',
        note: 'Meralco electricity bill - Sep 2026 billing',
      },
      {
        type: 'expense',
        amount: 189900, // ₱1,899.00
        categoryId: catMap['Utilities & Bills'],
        date: '2026-09-15T10:05:00',
        note: 'PLDT Home Fiber auto-charge',
        recurringId: insertedRecurring[1]?.id,
      },
      {
        type: 'expense',
        amount: 36000, // ₱360.00
        categoryId: catMap['Coffee & Snacks'],
        date: '2026-09-16T09:10:00',
        note: 'Morning oat latte & matcha cookie',
      },
      {
        type: 'expense',
        amount: 142000, // ₱1,420.00
        categoryId: catMap['Groceries'],
        date: '2026-09-17T17:45:00',
        note: 'Fresh market produce, vegetables & sourdough bread',
      },
      {
        type: 'expense',
        amount: 38000, // ₱380.00
        categoryId: catMap['Transportation'],
        date: '2026-09-18T13:10:00',
        note: 'Grab ride to BGC studio meeting',
      },
      {
        type: 'expense',
        amount: 52000, // ₱520.00
        categoryId: catMap['Coffee & Snacks'],
        date: '2026-09-19T11:00:00',
        note: 'Filter coffee tasting flight',
      },
      {
        type: 'expense',
        amount: 50000, // ₱500.00
        categoryId: catMap['Transportation'],
        date: '2026-09-19T16:30:00',
        note: 'Beep / MRT transportation card reload',
      },
      {
        type: 'expense',
        amount: 38000, // ₱380.00
        categoryId: catMap['Coffee & Snacks'],
        date: '2026-09-20T08:15:00', // Today
        note: 'Morning artisan flat white & croissant',
      },
      {
        type: 'expense',
        amount: 32000, // ₱320.00
        categoryId: catMap['Food & Dining'],
        date: '2026-09-20T12:30:00', // Today
        note: 'Salmon teriyaki lunch bento box',
      },
      {
        type: 'expense',
        amount: 28000, // ₱280.00
        categoryId: catMap['Transportation'],
        date: '2026-09-20T16:00:00', // Today
        note: 'Grab ride to dental appointment',
      },
    ])
    .returning();

  // ----------------------------------------------------------------------
  // 4. Seed Events (8 events across week, including 2 overlapping today)
  // ----------------------------------------------------------------------
  const insertedEvents = await db
    .insert(schema.events)
    .values([
      {
        title: 'Database Engine & Schema Review',
        start: '2026-09-18T15:00:00',
        end: '2026-09-18T16:00:00',
        allDay: false,
        location: 'Virtual Sync',
        reminderMinutes: 15,
      },
      {
        title: 'Morning Review & Weekly Planning',
        start: '2026-09-20T09:00:00',
        end: '2026-09-20T10:00:00',
        allDay: false,
        location: 'Home Workspace',
        recurrence: 'DAILY',
        reminderMinutes: 15,
      },
      // OVERLAPPING EVENT 1 TODAY: 14:00 - 15:30
      {
        title: 'Kaisro Architecture & Roadmap Sync',
        start: '2026-09-20T14:00:00',
        end: '2026-09-20T15:30:00',
        allDay: false,
        location: 'Studio / Virtual',
        reminderMinutes: 30,
      },
      // OVERLAPPING EVENT 2 TODAY: 14:30 - 15:15 (overlaps with 14:00 - 15:30!)
      {
        title: 'Design System Stitch Alignment (Ad-hoc Sync)',
        start: '2026-09-20T14:30:00',
        end: '2026-09-20T15:15:00',
        allDay: false,
        location: 'Design Channel',
        reminderMinutes: 15,
      },
      {
        title: 'Evening Recovery Run & Stretch',
        start: '2026-09-20T18:00:00',
        end: '2026-09-20T19:30:00',
        allDay: false,
        location: 'Track Oval & Fitness Center',
        reminderMinutes: 30,
      },
      {
        title: 'Client Stakeholder Demo & Walkthrough',
        start: '2026-09-21T10:30:00',
        end: '2026-09-21T11:30:00',
        allDay: false,
        location: 'Makati Office, Level 14',
        reminderMinutes: 60,
      },
      {
        title: 'Dentist Appointment & Dental Cleaning',
        start: '2026-09-23T15:00:00',
        end: '2026-09-23T16:00:00',
        allDay: false,
        location: 'Centuria Medical Suite 702',
        reminderMinutes: 60,
      },
      {
        title: 'Quarterly Financial & Budget Reflection',
        start: '2026-09-25T14:00:00',
        end: '2026-09-25T15:00:00',
        allDay: false,
        location: 'Home Studio',
        reminderMinutes: 30,
      },
    ])
    .returning();

  // ----------------------------------------------------------------------
  // 5. Seed Tasks (9 tasks spread across morning/afternoon/anytime, overdue, done)
  // ----------------------------------------------------------------------
  const insertedTasks = await db
    .insert(schema.tasks)
    .values([
      // Task 1: Overdue
      {
        title: 'Finalize Q3 consulting contract documentation',
        dueAt: '2026-09-18T17:00:00',
        priority: 'urgent',
        done: false,
        reminderMinutes: 30,
      },
      // Task 2: Overdue
      {
        title: 'Reconcile bi-weekly supermarket receipts',
        dueAt: '2026-09-19T12:00:00',
        priority: 'medium',
        done: false,
        reminderMinutes: 15,
      },
      // Task 3: Today Morning (Done)
      {
        title: 'Morning inbox zero & journal entry',
        dueAt: '2026-09-20T09:30:00',
        priority: 'low',
        done: true,
        doneAt: '2026-09-20T09:25:00',
      },
      // Task 4: Today Afternoon (Done with subtasks)
      {
        title: 'Establish Kaisro foundational SQLite schema and Drizzle migrations',
        dueAt: '2026-09-20T16:00:00',
        priority: 'urgent',
        done: true,
        doneAt: '2026-09-20T11:00:00',
        reminderMinutes: 30,
      },
      // Task 5: Today Afternoon (High priority, pending)
      {
        title: 'Review Meralco electricity invoice and record expenses',
        dueAt: '2026-09-20T17:30:00',
        priority: 'high',
        done: false,
        reminderMinutes: 15,
      },
      // Task 6: Today Anytime (Date only, pending with subtasks)
      {
        title: 'Review monthly coffee expenditure cap (above 90%)',
        dueAt: '2026-09-20',
        priority: 'high',
        done: false,
      },
      // Task 7: Today Anytime (No due time, done)
      {
        title: 'Confirm weekend running route and hydration stops',
        dueAt: null,
        priority: 'low',
        done: true,
        doneAt: '2026-09-20T08:00:00',
      },
      // Task 8: Future task
      {
        title: 'Schedule annual routine vehicle maintenance',
        dueAt: '2026-09-24T12:00:00',
        priority: 'low',
        done: false,
        reminderMinutes: 60,
      },
      // Task 9: Future task
      {
        title: 'Draft Q4 budget targets and savings allocation',
        dueAt: '2026-09-28T19:00:00',
        priority: 'medium',
        done: false,
      },
    ])
    .returning();

  // ----------------------------------------------------------------------
  // 6. Seed Subtasks (7 subtasks across tasks 4, 5, and 6)
  // ----------------------------------------------------------------------
  const task4 = insertedTasks[3];
  const task5 = insertedTasks[4];
  const task6 = insertedTasks[5];

  const subtasksToInsert: typeof schema.subtasks.$inferInsert[] = [];

  if (task4) {
    subtasksToInsert.push(
      { taskId: task4.id, title: 'Draft events and tasks tables', done: true, sortOrder: 0 },
      { taskId: task4.id, title: 'Store currency strictly in integer centavos', done: true, sortOrder: 1 },
      { taskId: task4.id, title: 'Generate Drizzle migrations and test rollback', done: true, sortOrder: 2 }
    );
  }

  if (task5) {
    subtasksToInsert.push(
      { taskId: task5.id, title: 'Check kWh consumption vs August statement', done: false, sortOrder: 0 },
      { taskId: task5.id, title: 'Confirm online bank payment reference number', done: true, sortOrder: 1 }
    );
  }

  if (task6) {
    subtasksToInsert.push(
      { taskId: task6.id, title: 'Verify Yardstick and Curator charges', done: true, sortOrder: 0 },
      { taskId: task6.id, title: 'Calculate remaining coffee allowance for September', done: false, sortOrder: 1 }
    );
  }

  const insertedSubtasks = await db.insert(schema.subtasks).values(subtasksToInsert).returning();

  // ----------------------------------------------------------------------
  // 7. Seed Tags (5 tags)
  // ----------------------------------------------------------------------
  const insertedTags = await db
    .insert(schema.tags)
    .values([
      { name: 'Kaisro', color: '#3A4A7A' },
      { name: 'Finance', color: '#E8C99B' },
      { name: 'Focus', color: '#6FA8A0' },
      { name: 'Home', color: '#33312E' },
      { name: 'Health', color: '#2E6861' },
    ])
    .returning();

  const tagMap = Object.fromEntries(insertedTags.map((t) => [t.name, t.id]));

  // ----------------------------------------------------------------------
  // 8. Seed Notes (4 notes)
  // ----------------------------------------------------------------------
  const insertedNotes = await db
    .insert(schema.notes)
    .values([
      {
        title: 'Kaisro Architectural Intentions & Principles',
        body: 'Private, single-user, local-first mobile app. Unified daily view integrating calendar events, tasks, and spending into one clean timeline track. Clean hairline borders (#E2DED7), warm linen canvas (#FAF7F2), archival ink blue (#3A4A7A). Tabular numerals throughout for distraction-free clarity.',
      },
      {
        title: 'September Utility & Consumption Review',
        body: 'Dining out stayed nicely within cap despite two weekend dinners with friends. Meralco bill reflects lower AC usage during the cooler rainy week. Planned October goal: Keep coffee shop runs under ₱3,000 total.',
      },
      {
        title: 'Coffee Tasting & Bean Sourcing Log',
        body: 'Yardstick Ethiopia Guji had wonderful floral and apricot notes. Blue Wonders cold brew pack is great for high-focus deep work sessions. Expenditure has reached 93.7% of the monthly cap, so slow down on bean restocks until October.',
      },
      {
        title: 'Weekly Focus Retrospective',
        body: 'Completed foundational SQLite schema migrations. The serene Japanese stationery aesthetic feels calming and friction-free.',
      },
    ])
    .returning();

  // ----------------------------------------------------------------------
  // 9. Seed Note Tags (7 links)
  // ----------------------------------------------------------------------
  const noteTagsToInsert = [
    { noteId: insertedNotes[0].id, tagId: tagMap['Kaisro'] },
    { noteId: insertedNotes[0].id, tagId: tagMap['Focus'] },
    { noteId: insertedNotes[1].id, tagId: tagMap['Finance'] },
    { noteId: insertedNotes[1].id, tagId: tagMap['Home'] },
    { noteId: insertedNotes[2].id, tagId: tagMap['Finance'] },
    { noteId: insertedNotes[3].id, tagId: tagMap['Focus'] },
    { noteId: insertedNotes[3].id, tagId: tagMap['Kaisro'] },
  ];
  const insertedNoteTags = await db.insert(schema.noteTags).values(noteTagsToInsert).returning();

  // ----------------------------------------------------------------------
  // 10. Seed Note Links (4 links to events, tasks, transactions)
  // ----------------------------------------------------------------------
  const architectureEvent = insertedEvents.find((e) => e.title.includes('Architecture'));
  const morningEvent = insertedEvents.find((e) => e.title.includes('Morning Review'));
  const meralcoTransaction = insertedTransactions.find((t) => t.note?.includes('Meralco'));
  const coffeeTask = insertedTasks.find((t) => t.title.includes('coffee'));

  const noteLinksToInsert = [];

  if (insertedNotes[0] && architectureEvent) {
    noteLinksToInsert.push({
      noteId: insertedNotes[0].id,
      targetType: 'event' as const,
      targetId: architectureEvent.id,
    });
  }

  if (insertedNotes[1] && meralcoTransaction) {
    noteLinksToInsert.push({
      noteId: insertedNotes[1].id,
      targetType: 'transaction' as const,
      targetId: meralcoTransaction.id,
    });
  }

  if (insertedNotes[2] && coffeeTask) {
    noteLinksToInsert.push({
      noteId: insertedNotes[2].id,
      targetType: 'task' as const,
      targetId: coffeeTask.id,
    });
  }

  if (insertedNotes[3] && morningEvent) {
    noteLinksToInsert.push({
      noteId: insertedNotes[3].id,
      targetType: 'event' as const,
      targetId: morningEvent.id,
    });
  }

  const insertedNoteLinks = await db.insert(schema.noteLinks).values(noteLinksToInsert).returning();

  const result: SeedResult = {
    categories: insertedCategories.length,
    recurringTransactions: insertedRecurring.length,
    transactions: insertedTransactions.length,
    events: insertedEvents.length,
    tasks: insertedTasks.length,
    subtasks: insertedSubtasks.length,
    tags: insertedTags.length,
    notes: insertedNotes.length,
    noteTags: insertedNoteTags.length,
    noteLinks: insertedNoteLinks.length,
  };

  console.log('[Kaisro Seed] Successfully seeded sample data:', result);
  return result;
}

export default seedDatabase;
