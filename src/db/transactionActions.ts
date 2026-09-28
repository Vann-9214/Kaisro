import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { transactions, recurringTransactions, noteLinks, categories } from './schema';
import { localDay, monthlyDate, shiftMonth } from '../utils/budgetUtils';
import { formatDateToISO, formatLocalDateTime } from '../utils/dateUtils';

export interface TransactionDraft {
  type: 'expense' | 'income'; amount: number; categoryId: number | null; date: string; note: string; repeats: boolean;
}
function nextMonthlyDate(start: string, after: string) {
  return monthlyDate(start, shiftMonth(localDay(after).slice(0, 7), 1));
}
export function catchUpMonthly(db: AppDatabase, now = new Date()) {
  const today = formatDateToISO(now);
  return db.transaction(tx => {
    let created = 0;
    for (const rule of tx.select().from(recurringTransactions).all()) {
      if (rule.frequency !== 'monthly') continue;
      let next = localDay(rule.nextDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) throw new Error('A recurring date is invalid.');
      while (next <= today && (!rule.endDate || next <= localDay(rule.endDate))) {
        const time = rule.startDate.includes('T') ? formatLocalDateTime(new Date(rule.startDate)).slice(10) : 'T09:00:00';
        tx.insert(transactions).values({ type: rule.type, amount: rule.amount, categoryId: rule.categoryId,
          date: next + time, note: rule.note, recurringId: rule.id }).run();
        next = nextMonthlyDate(rule.startDate, next);
        created++;
      }
      if (next !== rule.nextDate) tx.update(recurringTransactions).set({ nextDate: next, updatedAt: now.toISOString() }).where(eq(recurringTransactions.id, rule.id)).run();
    }
    return created;
  });
}
export function saveTransaction(db: AppDatabase, draft: TransactionDraft, id?: number) {
  if (!Number.isSafeInteger(draft.amount) || draft.amount <= 0) throw new Error('Enter an amount greater than zero, with at most two decimal places.');
  if (Number.isNaN(new Date(draft.date).getTime())) throw new Error('Choose a valid date.');
  return db.transaction(tx => {
    if (draft.categoryId !== null && !tx.select().from(categories).where(eq(categories.id, draft.categoryId)).get()) throw new Error('Choose an existing category.');
    const existing = id === undefined ? undefined : tx.select().from(transactions).where(eq(transactions.id, id)).get();
    if (id !== undefined && !existing) throw new Error('This entry no longer exists.');
    let recurringId = existing?.recurringId ?? null;
    if (draft.repeats && recurringId !== null) {
      const rule = tx.select().from(recurringTransactions).where(eq(recurringTransactions.id, recurringId)).get();
      if (rule?.endDate) tx.update(recurringTransactions).set({ endDate: null,
        nextDate: nextMonthlyDate(rule.startDate, formatDateToISO(new Date())) }).where(eq(recurringTransactions.id, recurringId)).run();
    }
    if (draft.repeats && recurringId === null) {
      recurringId = tx.insert(recurringTransactions).values({ type: draft.type, amount: draft.amount, categoryId: draft.categoryId,
        frequency: 'monthly', startDate: draft.date, nextDate: nextMonthlyDate(draft.date, draft.date), note: draft.note.trim() || null }).returning().get().id;
    } else if (!draft.repeats && recurringId !== null) {
      tx.update(recurringTransactions).set({ endDate: formatDateToISO(new Date()), updatedAt: new Date().toISOString() }).where(eq(recurringTransactions.id, recurringId)).run();
    }
    const values = { type: draft.type, amount: draft.amount, categoryId: draft.categoryId, date: draft.date,
      note: draft.note.trim() || null, recurringId, updatedAt: new Date().toISOString() };
    return id === undefined ? tx.insert(transactions).values(values).returning().get()
      : tx.update(transactions).set(values).where(eq(transactions.id, id)).returning().get()!;
  });
}
export function deleteTransaction(db: AppDatabase, id: number) {
  db.transaction(tx => {
    tx.delete(noteLinks).where(and(eq(noteLinks.targetType, 'transaction'), eq(noteLinks.targetId, id))).run();
    tx.delete(transactions).where(eq(transactions.id, id)).run();
    // The recurring cursor is untouched: a deleted occurrence cannot be caught up again.
  });
}
