import { and, eq, sql } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { categories, transactions, recurringTransactions } from './schema';

export interface CategoryDraft { name: string; icon: string; monthlyCap: number | null }
export function saveCategory(db: AppDatabase, draft: CategoryDraft, id?: number) {
  const name = draft.name.trim();
  if (!name) throw new Error('Enter a category name.');
  if (draft.monthlyCap !== null && (!Number.isSafeInteger(draft.monthlyCap) || draft.monthlyCap <= 0)) throw new Error('Enter a positive cap in pesos.');
  return db.transaction(tx => {
    const old = id === undefined ? undefined : tx.select().from(categories).where(eq(categories.id, id)).get();
    if (id !== undefined && !old) throw new Error('Category no longer exists.');
    if (old?.name.toLowerCase() === 'other' && name.toLowerCase() !== 'other') throw new Error('Other must keep its name.');
    const duplicate = tx.select().from(categories).where(sql`lower(${categories.name}) = ${name.toLowerCase()}`).all().some(row => row.id !== id);
    if (duplicate) throw new Error('A category with that name already exists.');
    const values = { name, icon: draft.icon, monthlyCap: draft.monthlyCap };
    return id === undefined ? tx.insert(categories).values(values).returning().get()
      : tx.update(categories).set(values).where(eq(categories.id, id)).returning().get()!;
  });
}
export function categoryUsage(db: AppDatabase, id: number) {
  return db.select({ count: sql<number>`count(*)` }).from(transactions).where(eq(transactions.categoryId, id)).get()!.count
    + db.select({ count: sql<number>`count(*)` }).from(recurringTransactions).where(eq(recurringTransactions.categoryId, id)).get()!.count;
}
export function deleteCategory(db: AppDatabase, id: number, moveTo?: number) {
  db.transaction(tx => {
    const row = tx.select().from(categories).where(eq(categories.id, id)).get();
    if (!row) throw new Error('Category no longer exists.');
    if (row.name.toLowerCase() === 'other') throw new Error('Other cannot be deleted.');
    const dependent = categoryUsage(db, id);
    if (dependent) {
      const target = moveTo === undefined ? undefined : tx.select().from(categories).where(eq(categories.id, moveTo)).get();
      if (!target || target.id === id) throw new Error('Choose a different category to move these entries to.');
      tx.update(transactions).set({ categoryId: target.id }).where(eq(transactions.categoryId, id)).run();
      tx.update(recurringTransactions).set({ categoryId: target.id }).where(eq(recurringTransactions.categoryId, id)).run();
    }
    tx.delete(categories).where(eq(categories.id, id)).run();
  });
}
