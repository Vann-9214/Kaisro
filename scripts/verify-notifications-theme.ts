import assert from 'node:assert/strict';
import { testDatabase } from './testDatabase';
import { events, tasks, categories, transactions } from '../src/db/schema';
import { readPreferences, savePreferences, DEFAULT_PREFERENCES } from '../src/db/preferencesActions';
import { planNotifications, dailySummary, planBudgetAlerts, MAX_TRIGGER_COUNT, type PlannedNotification } from '../src/notifications/planner';
import { reconcileNotifications, type ScheduledRecord } from '../src/notifications/reconcile';
import { applyTheme, colors, lightTokens, darkTokens, createThemedStyles, themeVariables } from '../src/constants/theme';

async function main() {
  const { db, close } = testDatabase();
  try {
    assert.deepEqual(readPreferences(db), DEFAULT_PREFERENCES);
    savePreferences(db, { theme: 'dark', dailyDigest: true, escalatingTasks: true });
    assert.equal(readPreferences(db).theme, 'dark');
    assert.throws(() => savePreferences(db, { digestHour: 24 }));
    assert.equal(readPreferences(db).digestHour, 8);
    const date = new Date(2026, 9, 11, 7);
    const event = db.insert(events).values({ title: 'Event', start: '2026-10-11T09:00:00', end: '2026-10-11T10:00:00', reminderMinutes: 30, reminderOffsets: '[30,60]' }).returning().get();
    const task = db.insert(tasks).values({ title: 'Task', dueAt: '2026-10-11T09:00:00', reminderMinutes: 15 }).returning().get();
    db.insert(tasks).values({ title: 'Undated task' }).run();
    const cat = db.insert(categories).values({ name: 'Food', icon: 'tag', monthlyCap: 10000 }).returning().get();
    db.insert(transactions).values({ amount: 8000, categoryId: cat.id, date: '2026-10-11T06:00:00' }).run();
    const data = { events: db.select().from(events).all(), tasks: db.select().from(tasks).all(), categories: db.select().from(categories).all(), transactions: db.select().from(transactions).all() };
    const prefs = readPreferences(db);
    const plans = planNotifications(data, prefs, date);
    assert.equal(plans.filter(plan => plan.kind === 'event').length, 2);
    assert.equal(plans.filter(plan => plan.kind === 'task').length, 4);
    assert.equal(plans.filter(plan => plan.kind === 'digest').length, 7);
    assert.equal(dailySummary(data, date).remaining, 2);
    assert.equal(planBudgetAlerts(data, prefs, date)[0].stage, 1);
    const dismissed = planNotifications(data, prefs, date, { [task.id]: { dismissedDueAt: task.dueAt! } });
    assert.equal(dismissed.filter(plan => plan.kind === 'task').length, 0);
    const snoozed = planNotifications(data, prefs, date, { [task.id]: { snoozedUntil: date.getTime() + 900000, snoozedDueAt: task.dueAt! } });
    assert.equal(snoozed.filter(plan => plan.kind === 'task').length, 1);
    assert.ok(snoozed.some(plan => plan.id.endsWith('-snooze')));
    const stale = planNotifications(data, prefs, date, { [task.id]: { snoozedUntil: date.getTime() + 900000, snoozedDueAt: '2026-10-10T09:00:00' } });
    assert.equal(stale.filter(plan => plan.kind === 'task').length, 4);
    const complete = planNotifications({ ...data, tasks: data.tasks.map(row => row.id === task.id ? { ...row, done: true } : row) }, prefs, date);
    assert.equal(complete.filter(plan => plan.kind === 'task').length, 0);
    assert.equal(planNotifications({ ...data, events: Array.from({ length: 100 }, (_, i) => ({ ...event, id: 100 + i })) }, prefs, date).length, MAX_TRIGGER_COUNT);
    const records = new Map<string, ScheduledRecord>([['kaisro-old', { id: 'kaisro-old' }], ['unrelated', { id: 'unrelated' }]]);
    let puts = 0;
    const driver = { list: async () => [...records.values()], remove: async (ids: string[]) => { ids.forEach(id => records.delete(id)); }, put: async (plan: PlannedNotification, signature: string) => { puts++; records.set(plan.id, { id: plan.id, signature }); } };
    await reconcileNotifications(driver, plans);
    assert.equal(records.has('kaisro-old'), false); assert.equal(records.has('unrelated'), true);
    const before = puts; await reconcileNotifications(driver, plans); assert.equal(puts, before);
    await reconcileNotifications(driver, plans.map(plan => plan.kind === 'event' ? { ...plan, title: 'Edited event', timestamp: plan.timestamp + 60000 } : plan));
    assert.equal(puts, before + 2);
    const themed = createThemedStyles(() => ({ background: colors.background, text: colors.text }));
    applyTheme(false); assert.equal(themed.background, lightTokens.background);
    applyTheme(true); assert.equal(themed.background, darkTokens.background); assert.notEqual(themed.background, lightTokens.background);
    assert.equal(themeVariables()['--color-background'].split(' ').length, 3);
    applyTheme(false);
    const previous = process.env.TZ;
    try {
      process.env.TZ = 'Asia/Manila';
      assert.equal(dailySummary(data, new Date('2026-10-11T00:30:00+08:00')).remaining, 2);
    } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
    console.log('PASS: saved preferences, reminder planning, cap alerts, snooze/dismiss/complete, trigger reconciliation, capacity and theme updates (migrated SQLite).');
  } finally { close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
