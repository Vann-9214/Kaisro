import assert from 'node:assert/strict';
import { recurrenceAfter } from '../src/utils/recurrence';

assert.equal(recurrenceAfter('2026-01-31', 'MONTHLY', '2026-10-11'), '2026-10-31');
assert.equal(recurrenceAfter('2026-01-05', 'WEEKLY', '2026-10-11'), '2026-10-12');
assert.equal(recurrenceAfter('2025-12-31', 'YEARLY', '2026-10-11'), '2026-12-31');
import { eq } from 'drizzle-orm';
import { testDatabase } from './testDatabase';
import { transactions, recurringTransactions, categories } from '../src/db/schema';
import { saveTransaction, catchUpMonthly, updateRecurringAmount, cancelRecurringRule } from '../src/db/transactionActions';
import { saveCategory, deleteCategory } from '../src/db/categoryActions';
import { budgetAlert, buildBudget } from '../src/utils/budgetUtils';

const { db, close } = testDatabase();
try {
  assert.equal(budgetAlert(7999, 10000), null);
  assert.equal(budgetAlert(8000, 10000), 'near');
  assert.equal(budgetAlert(10000, 10000), 'reached');
  assert.equal(budgetAlert(10001, 10000), 'over');
  assert.equal(budgetAlert(10000, null), null);
  const category = saveCategory(db, { name: 'Subscriptions', icon: 'tag', monthlyCap: 10000 });
  const first = saveTransaction(db, { type: 'expense', amount: 1000, categoryId: category.id, date: '2026-01-31T09:00:00', note: 'Subscription', repeats: true });
  const ruleId = first.recurringId!;
  updateRecurringAmount(db, ruleId, 2000, new Date(2026, 2, 15, 12));
  const february = db.select().from(transactions).all().find(row => row.date.startsWith('2026-02'))!;
  assert.equal(february.amount, 1000);
  assert.equal(catchUpMonthly(db, new Date(2026, 2, 31, 12)), 1);
  assert.equal(db.select().from(transactions).all().find(row => row.date.startsWith('2026-03'))!.amount, 2000);
  assert.equal(db.select().from(transactions).where(eq(transactions.id, first.id)).get()!.amount, 1000);
  assert.throws(() => updateRecurringAmount(db, ruleId, 1.5));
  cancelRecurringRule(db, ruleId, new Date(2026, 3, 1));
  const count = db.select().from(transactions).all().length;
  assert.equal(catchUpMonthly(db, new Date(2026, 4, 31)), 0);
  assert.equal(db.select().from(transactions).all().length, count);
  deleteCategory(db, category.id);
  const other = db.select().from(categories).all().find(row => row.name === 'Other')!;
  assert.ok(other);
  assert.ok(db.select().from(transactions).all().every(row => row.categoryId === other.id));
  assert.equal(db.select().from(recurringTransactions).get()!.categoryId, other.id);
  const daily = saveTransaction(db, { type: 'expense', amount: 29, categoryId: other.id, date: '2026-05-01T09:00:00', note: 'Daily', repeats: true, frequency: 'daily' });
  assert.equal(catchUpMonthly(db, new Date(2026, 4, 3, 12)), 2);
  assert.equal(catchUpMonthly(db, new Date(2026, 4, 3, 12)), 0);
  const budget = buildBudget('2026-05', db.select().from(categories).all(), db.select().from(transactions).all(), db.select().from(recurringTransactions).all());
  assert.equal(budget.expenses, 87);
  assert.ok(budget.recurring.some(rule => rule.id === daily.recurringId));
  console.log('PASS: cap thresholds, future-price edits, historical preservation, cancellation, uncategorized reassignment and daily generation (migrated SQLite).');
} finally { close(); }
