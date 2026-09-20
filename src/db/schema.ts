import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ----------------------------------------------------------------------
// 1. Events Table
// ----------------------------------------------------------------------
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  start: text('start').notNull(), // ISO-8601 formatted date-time string
  end: text('end'),              // ISO-8601 formatted date-time string (optional)
  allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
  location: text('location'),
  recurrence: text('recurrence'), // e.g. 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'RRULE:...'
  reminderMinutes: integer('reminder_minutes'), // e.g. 15, 30, 60
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const eventsRelations = relations(events, ({ many }) => ({
  noteLinks: many(noteLinks),
}));

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// ----------------------------------------------------------------------
// 2. Tasks Table
// ----------------------------------------------------------------------
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  dueAt: text('due_at'), // ISO-8601 formatted date-time or date string
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
    .notNull()
    .default('medium'),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  doneAt: text('done_at'), // ISO-8601 timestamp when marked done
  reminderMinutes: integer('reminder_minutes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tasksRelations = relations(tasks, ({ many }) => ({
  subtasks: many(subtasks),
  noteLinks: many(noteLinks),
}));

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

// ----------------------------------------------------------------------
// 3. Subtasks Table
// ----------------------------------------------------------------------
export const subtasks = sqliteTable('subtasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, {
    fields: [subtasks.taskId],
    references: [tasks.id],
  }),
}));

export type Subtask = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;

// ----------------------------------------------------------------------
// 4. Categories Table (for Budget & Expenses)
// ----------------------------------------------------------------------
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(), // Icon identifier (e.g. 'utensils', 'coffee', 'home', 'car')
  monthlyCap: integer('monthly_cap'), // Monthly budget limit in integer centavos (e.g. 1500000 = ₱15,000.00)
  color: text('color'), // Semantic color code or identifier
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  recurringTransactions: many(recurringTransactions),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// ----------------------------------------------------------------------
// 5. Recurring Transactions Table
// ----------------------------------------------------------------------
export const recurringTransactions = sqliteTable('recurring_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['expense', 'income'] })
    .notNull()
    .default('expense'),
  amount: integer('amount').notNull(), // Integer centavos (₱100.50 -> 10050)
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly', 'yearly'] })
    .notNull()
    .default('monthly'),
  startDate: text('start_date').notNull(), // ISO-8601 date string
  endDate: text('end_date'),             // Optional termination date
  nextDate: text('next_date').notNull(),  // Upcoming occurrence date
  note: text('note'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const recurringTransactionsRelations = relations(
  recurringTransactions,
  ({ one, many }) => ({
    category: one(categories, {
      fields: [recurringTransactions.categoryId],
      references: [categories.id],
    }),
    transactions: many(transactions),
  })
);

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;

// ----------------------------------------------------------------------
// 6. Transactions Table
// ----------------------------------------------------------------------
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['expense', 'income', 'transfer'] })
    .notNull()
    .default('expense'),
  amount: integer('amount').notNull(), // Integer centavos (₱100.50 -> 10050)
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  date: text('date').notNull(), // ISO-8601 date or date-time string
  note: text('note'),
  recurringId: integer('recurring_id').references(
    () => recurringTransactions.id,
    { onDelete: 'set null' }
  ),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  recurring: one(recurringTransactions, {
    fields: [transactions.recurringId],
    references: [recurringTransactions.id],
  }),
  noteLinks: many(noteLinks),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

// ----------------------------------------------------------------------
// 7. Notes Table
// ----------------------------------------------------------------------
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const notesRelations = relations(notes, ({ many }) => ({
  links: many(noteLinks),
  noteTags: many(noteTags),
}));

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

// ----------------------------------------------------------------------
// 8. Note Links Table (Connect notes to events, tasks, transactions)
// ----------------------------------------------------------------------
export const noteLinks = sqliteTable('note_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  targetType: text('target_type', { enum: ['event', 'task', 'transaction'] }).notNull(),
  targetId: integer('target_id').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const noteLinksRelations = relations(noteLinks, ({ one }) => ({
  note: one(notes, {
    fields: [noteLinks.noteId],
    references: [notes.id],
  }),
  event: one(events, {
    fields: [noteLinks.targetId],
    references: [events.id],
  }),
  task: one(tasks, {
    fields: [noteLinks.targetId],
    references: [tasks.id],
  }),
  transaction: one(transactions, {
    fields: [noteLinks.targetId],
    references: [transactions.id],
  }),
}));

export type NoteLink = typeof noteLinks.$inferSelect;
export type NewNoteLink = typeof noteLinks.$inferInsert;

// ----------------------------------------------------------------------
// 9. Tags & Note Tags Tables
// ----------------------------------------------------------------------
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tagsRelations = relations(tags, ({ many }) => ({
  noteTags: many(noteTags),
}));

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export const noteTags = sqliteTable(
  'note_tags',
  {
    noteId: integer('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.noteId, t.tagId] }),
  })
);

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(notes, {
    fields: [noteTags.noteId],
    references: [notes.id],
  }),
  tag: one(tags, {
    fields: [noteTags.tagId],
    references: [tags.id],
  }),
}));

export type NoteTag = typeof noteTags.$inferSelect;
export type NewNoteTag = typeof noteTags.$inferInsert;
