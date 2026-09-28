import assert from 'node:assert/strict';
import { testDatabase } from './testDatabase';
import { categories, transactions, recurringTransactions } from '../src/db/schema';
import { buildBudget, shiftMonth, monthlyDate } from '../src/utils/budgetUtils';
const { db, close } = testDatabase();
try {
  const read = (month = '2026-09') => buildBudget(month, db.select().from(categories).all(), db.select().from(transactions).all(), db.select().from(recurringTransactions).all());
  assert.equal(read().entries.length, 0); assert.equal(read().remaining, 0); assert.equal(read().recurring.length, 0);
  const capped = db.insert(categories).values({ name: 'Capped', icon: 'home', monthlyCap: 10000 }).returning().get();
  db.insert(categories).values({ name: 'Uncapped', icon: 'tag' }).run();
  db.insert(transactions).values([
    { type: 'income', amount: 50000, date: '2026-09-01' },
    { type: 'expense', amount: 9001, date: '2026-09-28', categoryId: capped.id },
    { type: 'expense', amount: 101, date: '2026-09-28' },
    { type: 'transfer', amount: 20000, date: '2026-09-28' },
    { type: 'expense', amount: 999, date: '2026-08-31' },
  ]).run();
  db.insert(recurringTransactions).values({ type: 'expense', amount: 100, categoryId: capped.id, startDate: '2026-01-31', nextDate: '2026-09-30' }).run();
  const result = read();
  assert.equal(result.income, 50000); assert.equal(result.expenses, 9102); assert.equal(result.remaining, 40898);
  assert.equal(result.categoryRows[0].spent, 9001); assert.equal(result.categoryRows[1].monthlyCap, null);
  assert.equal(result.groups[0].entries.length, 3); assert.equal(result.groups[0].day, '2026-09-28');
  assert.equal(result.recurring[0].dueDate, '2026-09-30');
  assert.equal(monthlyDate('2024-01-31', '2024-02'), '2024-02-29');
  assert.equal(shiftMonth('2026-12', 1), '2027-01'); assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(read('2026-08').expenses, 999);
  console.log('PASS: budget empty state, integer totals, month isolation/navigation, category caps, date grouping, recurring month-end display');
} finally { close(); }
