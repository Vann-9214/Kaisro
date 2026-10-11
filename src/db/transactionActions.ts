import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { transactions, recurringTransactions, noteLinks, categories, events } from './schema';
import { localDay, monthlyDate, shiftMonth } from '../utils/budgetUtils';
import { formatDateToISO, formatLocalDateTime } from '../utils/dateUtils';
import { nextRecurrenceDate, recurrenceAfter } from '../utils/recurrence';
import { replaceTargetNotes } from './linkActions';

export interface TransactionDraft {
  type: 'expense' | 'income'; amount: number; categoryId: number | null; date: string; note: string; repeats: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  updateFuture?: boolean;
  noteIds?: number[];
  eventId?: number | null;
}
function nextMonthlyDate(start: string, after: string) {
  return monthlyDate(start, shiftMonth(localDay(after).slice(0, 7), 1));
}
export function catchUpMonthly(db: AppDatabase, now = new Date()) {
  const today = formatDateToISO(now);
  return db.transaction(tx => {
    let created = 0;
    for (const rule of tx.select().from(recurringTransactions).all()) {
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(rule.frequency)) continue;
      let next = localDay(rule.nextDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) throw new Error('A recurring date is invalid.');
      while (next <= today && (!rule.endDate || next <= localDay(rule.endDate))) {
        const time = rule.startDate.includes('T') ? formatLocalDateTime(new Date(rule.startDate)).slice(10) : 'T09:00:00';
        tx.insert(transactions).values({ type: rule.type, amount: rule.amount, categoryId: rule.categoryId,
          date: next + time, note: rule.note, recurringId: rule.id, eventId: rule.eventId }).run();
        next = nextRecurrenceDate(next, rule.frequency.toUpperCase(), rule.startDate).slice(0, 10);
        created++;
      }
      if (next !== rule.nextDate) tx.update(recurringTransactions).set({ nextDate: next, updatedAt: now.toISOString() }).where(eq(recurringTransactions.id, rule.id)).run();
    }
    return created;
  });
}
export function saveTransaction(db: AppDatabase, draft: TransactionDraft, id?: number, now = new Date()) {
  if (!Number.isSafeInteger(draft.amount) || draft.amount <= 0) throw new Error('Enter an amount greater than zero, with at most two decimal places.');
  if (Number.isNaN(new Date(draft.date).getTime())) throw new Error('Choose a valid date.');
  return db.transaction(tx => {
    if (draft.categoryId !== null && !tx.select().from(categories).where(eq(categories.id, draft.categoryId)).get()) throw new Error('Choose an existing category.');
    if (draft.eventId != null && !tx.select().from(events).where(eq(events.id, draft.eventId)).get()) throw new Error('The linked event no longer exists.');
    const existing = id === undefined ? undefined : tx.select().from(transactions).where(eq(transactions.id, id)).get();
    if (id !== undefined && !existing) throw new Error('This entry no longer exists.');
    let recurringId = existing?.recurringId ?? null;
    if (draft.repeats && recurringId !== null) {
      const rule = tx.select().from(recurringTransactions).where(eq(recurringTransactions.id, recurringId)).get();
      if (rule?.endDate) tx.update(recurringTransactions).set({ endDate: null,
        nextDate: recurrenceAfter(rule.startDate, rule.frequency.toUpperCase(), formatDateToISO(now)).slice(0, 10) }).where(eq(recurringTransactions.id, recurringId)).run();
    }
    if (draft.repeats && recurringId === null) {
      recurringId = tx.insert(recurringTransactions).values({ type: draft.type, amount: draft.amount, categoryId: draft.categoryId,
        frequency: draft.frequency ?? 'monthly', startDate: draft.date, nextDate: nextRecurrenceDate(draft.date, (draft.frequency ?? 'monthly').toUpperCase()).slice(0, 10), note: draft.note.trim() || null, eventId: draft.eventId }).returning().get().id;
    } else if (!draft.repeats && recurringId !== null) {
      const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      tx.update(recurringTransactions).set({ endDate: formatDateToISO(cutoff), updatedAt: now.toISOString() }).where(eq(recurringTransactions.id, recurringId)).run();
    }
    if (draft.repeats && draft.updateFuture && recurringId !== null) {
      catchUpMonthly(tx, now); // Past due entries retain the old rule price.
      const rule = tx.select().from(recurringTransactions).where(eq(recurringTransactions.id, recurringId)).get()!;
      const frequency = draft.frequency ?? rule.frequency;
      tx.update(recurringTransactions).set({ amount: draft.amount, type: draft.type, categoryId: draft.categoryId, note: draft.note.trim() || null, ...(draft.eventId !== undefined ? { eventId: draft.eventId } : {}),
        frequency, nextDate: frequency === rule.frequency ? rule.nextDate : recurrenceAfter(rule.startDate, frequency.toUpperCase(), formatDateToISO(now)).slice(0, 10), updatedAt: now.toISOString() }).where(eq(recurringTransactions.id, recurringId)).run();
    }
    const values = { type: draft.type, amount: draft.amount, categoryId: draft.categoryId, date: draft.date,
      note: draft.note.trim() || null, recurringId, ...(draft.eventId !== undefined ? { eventId: draft.eventId } : {}), updatedAt: new Date().toISOString() };
    const row = id === undefined ? tx.insert(transactions).values(values).returning().get()
      : tx.update(transactions).set(values).where(eq(transactions.id, id)).returning().get()!;
    if (draft.noteIds) replaceTargetNotes(tx, { targetType: 'transaction', targetId: row.id }, draft.noteIds);
    return row;
  });
}

export function updateRecurringAmount(db: AppDatabase, id: number, amount: number, now = new Date()) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Enter a positive amount with at most two decimal places.');
  db.transaction(tx => {
    const rule = tx.select().from(recurringTransactions).where(eq(recurringTransactions.id, id)).get();
    if (!rule || rule.endDate) throw new Error('This recurring rule is no longer active.');
    catchUpMonthly(tx, now);
    tx.update(recurringTransactions).set({ amount, updatedAt: now.toISOString() }).where(eq(recurringTransactions.id, id)).run();
  });
}
export function cancelRecurringRule(db: AppDatabase, id: number, now = new Date()) {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  db.update(recurringTransactions).set({ endDate: formatDateToISO(cutoff), updatedAt: now.toISOString() }).where(eq(recurringTransactions.id, id)).run();
}
export function deleteTransaction(db: AppDatabase, id: number) {
  db.transaction(tx => {
    tx.delete(noteLinks).where(and(eq(noteLinks.targetType, 'transaction'), eq(noteLinks.targetId, id))).run();
    tx.delete(transactions).where(eq(transactions.id, id)).run();
    // The recurring cursor is untouched: a deleted occurrence cannot be caught up again.
  });
}
