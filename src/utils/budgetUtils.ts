import type { Category, Transaction, RecurringTransaction } from '../db/schema';
import { formatDateToISO, parseISODate } from './dateUtils';

export const localDay = (value: string) => value.includes('T') ? formatDateToISO(new Date(value)) : value.slice(0, 10);
export function shiftMonth(month: string, delta: number) {
  const date = parseISODate(month + '-01');
  return formatDateToISO(new Date(date.getFullYear(), date.getMonth() + delta, 1)).slice(0, 7);
}
export function monthlyDate(anchor: string, month: string) {
  const start = parseISODate(localDay(anchor));
  const target = parseISODate(month + '-01');
  const day = Math.min(start.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate());
  return formatDateToISO(new Date(target.getFullYear(), target.getMonth(), day));
}
export function buildBudget(month: string, categories: Category[], transactions: Transaction[], rules: RecurringTransaction[]) {
  const entries = transactions.filter(entry => localDay(entry.date).startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const income = entries.filter(entry => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = entries.filter(entry => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
  const categoryRows = categories.map(category => ({ ...category,
    spent: entries.filter(entry => entry.type === 'expense' && entry.categoryId === category.id).reduce((sum, entry) => sum + entry.amount, 0),
  }));
  const byDay = new Map<string, Transaction[]>();
  for (const entry of entries) {
    const day = localDay(entry.date);
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  }
  const recurring = rules.filter(rule => rule.frequency === 'monthly').map(rule => ({ ...rule, dueDate: monthlyDate(rule.startDate, month) }))
    .filter(rule => rule.dueDate >= localDay(rule.startDate) && (!rule.endDate || rule.dueDate <= localDay(rule.endDate)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { income, expenses, remaining: income - expenses, entries, categoryRows, recurring,
    groups: [...byDay].sort(([a], [b]) => b.localeCompare(a)).map(([day, entries]) => ({ day, entries })) };
}
