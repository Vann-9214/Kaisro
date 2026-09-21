import { sql } from 'drizzle-orm';
import { getDb, getExpoDb } from './index';
import * as schema from './schema';
import { DEFAULT_CATEGORIES } from '@/constants/defaultCategories';

export { DEFAULT_CATEGORIES };

/**
 * Idempotently inserts default starter categories if the categories table is empty.
 * Safe to call on every app startup.
 */
export async function ensureDefaultCategories(database = getDb()): Promise<boolean> {
  const existing = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.categories);

  const count = existing[0]?.count ?? 0;
  if (count === 0) {
    const now = new Date().toISOString();
    await database.insert(schema.categories).values(
      DEFAULT_CATEGORIES.map((cat) => ({
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        monthlyCap: null,
        createdAt: now,
      }))
    );
    return true;
  }
  return false;
}

/**
 * Deletes all records from all tables in strict foreign-key order:
 * 1. note_links (references notes)
 * 2. note_tags (references notes, tags)
 * 3. notes
 * 4. tags
 * 5. subtasks (references tasks)
 * 6. tasks
 * 7. events
 * 8. transactions (references categories)
 * 9. recurring_transactions (references categories)
 * 10. categories
 *
 * Then re-inserts the default starter categories.
 */
export async function clearAllDataAndReset(
  database = getDb(),
  sqliteDb = getExpoDb(),
  onComplete?: () => void
): Promise<void> {
  // Execute deletion in strict foreign key order
  sqliteDb.execSync(`
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

  // Re-insert default starter categories
  await ensureDefaultCategories(database);

  if (onComplete) {
    onComplete();
  }
}

