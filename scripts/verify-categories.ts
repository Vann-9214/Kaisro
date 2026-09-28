import assert from 'node:assert/strict';
import { testDatabase } from './testDatabase';
import { categories, transactions, recurringTransactions } from '../src/db/schema';
import { saveCategory, deleteCategory, categoryUsage } from '../src/db/categoryActions';
const { db, close } = testDatabase();
try {
  const other = saveCategory(db, { name: 'Other', icon: 'more-horizontal', monthlyCap: null });
  assert.throws(() => deleteCategory(db, other.id));
  assert.throws(() => saveCategory(db, { name: 'Renamed', icon: 'tag', monthlyCap: null }, other.id));
  const groceries = saveCategory(db, { name: 'Groceries', icon: 'shopping-cart', monthlyCap: 10000 });
  assert.throws(() => saveCategory(db, { name: ' groceries ', icon: 'tag', monthlyCap: null }));
  assert.throws(() => saveCategory(db, { name: 'Bad', icon: 'tag', monthlyCap: -100 }));
  saveCategory(db, { name: 'Food', icon: 'utensils', monthlyCap: null }, groceries.id);
  db.insert(transactions).values({ type: 'expense', amount: 500, date: '2026-09-28', categoryId: groceries.id }).run();
  db.insert(recurringTransactions).values({ type: 'expense', amount: 500, categoryId: groceries.id, startDate: '2026-09-28', nextDate: '2026-10-28' }).run();
  assert.equal(categoryUsage(db, groceries.id), 2);
  assert.throws(() => deleteCategory(db, groceries.id));
  assert.equal(db.select().from(transactions).get()!.categoryId, groceries.id);
  deleteCategory(db, groceries.id, other.id);
  assert.equal(db.select().from(transactions).get()!.categoryId, other.id);
  assert.equal(db.select().from(recurringTransactions).get()!.categoryId, other.id);
  assert.equal(db.select().from(categories).all().length, 1);
  console.log('PASS: category create/edit, unique name and cap validation, protected Other, atomic move-or-cancel deletion for entries and rules');
} finally { close(); }
