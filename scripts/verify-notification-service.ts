import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { eq } from 'drizzle-orm';
import { testDatabase } from './testDatabase';
import * as schema from '../src/db/schema';
import * as preferenceActions from '../src/db/preferencesActions';
import * as taskActions from '../src/db/taskActions';
import * as transactionActions from '../src/db/transactionActions';
import * as planner from '../src/notifications/planner';
import * as reconcile from '../src/notifications/reconcile';

async function main() {
  const { db, close } = testDatabase();
  const due = new Date(Date.now() + 3600000).toISOString();
  const task = taskActions.saveTask(db, { title: 'Reminder task', dueAt: due, priority: 'low', reminderMinutes: 15, recurrence: 'DAILY', subtasks: [] });
  let background: any; let registrations = 0; let permission = 1; let migrations = 0;
  const scheduled = new Map<string, any>(); const displayed = new Map<string, any>();
  const cancelled: string[] = []; let writes = 0;
  const native: any = {
    AuthorizationStatus: { AUTHORIZED: 1 }, AndroidImportance: { DEFAULT: 3, LOW: 2 },
    AndroidNotificationSetting: { ENABLED: 1 }, TriggerType: { TIMESTAMP: 0 },
    EventType: { ACTION_PRESS: 1, DISMISSED: 2, DELIVERED: 3, TRIGGER_NOTIFICATION_CREATED: 4 },
    AndroidForegroundServiceType: { FOREGROUND_SERVICE_TYPE_SPECIAL_USE: 1 },
    default: {
      getNotificationSettings: async () => ({ authorizationStatus: permission, android: { alarm: 0 } }),
      createChannel: async () => {}, getTriggerNotifications: async () => [...scheduled.values()],
      createTriggerNotification: async (notification: any, trigger: any) => { writes++; scheduled.set(notification.id, { notification, trigger }); },
      cancelTriggerNotifications: async (ids?: string[]) => { for (const id of ids ?? [...scheduled.keys()]) { cancelled.push(id); scheduled.delete(id); } },
      getDisplayedNotifications: async () => [...displayed.entries()].map(([id, notification]) => ({ id, notification })),
      cancelDisplayedNotification: async (id: string) => { displayed.delete(id); },
      displayNotification: async (notification: any) => { displayed.set(notification.id, notification); },
      cancelNotification: async (id: string) => { scheduled.delete(id); displayed.delete(id); },
      stopForegroundService: async () => {}, setNotificationCategories: async () => {},
      onBackgroundEvent: (handler: any) => { registrations++; background = handler; },
      onForegroundEvent: () => {}, registerForegroundService: () => {},
    },
  };
  const code = ts.transpileModule(readFileSync('src/notifications/service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const load = (available: boolean) => {
    const module = { exports: {} as any };
    const modules: Record<string, any> = {
      'react-native': { NativeModules: available ? { NotifeeApiModule: {} } : {}, Platform: { OS: 'android' }, AppState: { currentState: 'active' } },
      '@notifee/react-native': native, 'drizzle-orm': { eq },
      'zustand': { create: (init: any) => { let state = init(); return { getState: () => state, setState: (patch: any) => { state = { ...state, ...patch }; } }; } },
      '@/db': { ...schema, getDb: () => db, runMigrations: async () => { migrations++; } },
      '@/db/preferencesActions': preferenceActions, '@/db/taskActions': taskActions, '@/db/transactionActions': transactionActions,
      '@/hooks/useCalendarDay': { useCalendarSync: { getState: () => ({ triggerRefresh: () => {} }) } },
      '@/store/usePreferencesStore': { usePreferencesStore: { getState: () => ({ hydrate: () => {} }) } },
      './planner': planner, './reconcile': reconcile,
    };
    runInNewContext(code, { exports: module.exports, module, require: (id: string) => { assert.ok(id in modules, id); return modules[id]; }, Date, console, setInterval, clearInterval });
    return module.exports;
  };
  try {
    const fallback = load(false); assert.equal(fallback.notificationsAvailable(), false); await fallback.syncNotifications();
    const service = load(true); service.registerNotificationHandlers(); service.registerNotificationHandlers(); assert.equal(registrations, 1);
    await background({ type: 3, detail: {} }); await background({ type: 4, detail: {} });
    assert.equal(migrations, 0, 'Native delivery events cannot trigger sync loops');
    await Promise.all([service.syncNotifications(), service.syncNotifications()]);
    assert.equal(scheduled.size, 1); assert.equal(writes, 1);
    const prior = [...scheduled.keys()][0];
    const shifted = new Date(Date.now() + 7200000).toISOString();
    db.update(schema.tasks).set({ dueAt: shifted }).where(eq(schema.tasks.id, task.id)).run();
    await service.syncNotifications(); assert.ok(cancelled.includes(prior)); assert.equal(scheduled.size, 1);
    await background({ type: 1, detail: { notification: { id: prior, data: { taskId: String(task.id), dueAt: due } }, pressAction: { id: 'task-done' } } });
    assert.equal(db.select().from(schema.tasks).where(eq(schema.tasks.id, task.id)).get()!.done, false, 'Stale reminders cannot complete rescheduled tasks');
    const reminder = [...scheduled.values()][0].notification;
    await background({ type: 1, detail: { notification: reminder, pressAction: { id: 'task-snooze' } } });
    assert.ok(db.select().from(schema.preferences).where(eq(schema.preferences.key, 'task-notification:' + task.id)).get()!.value.includes('snoozedUntil'));
    await background({ type: 1, detail: { notification: reminder, pressAction: { id: 'task-done' } } });
    await background({ type: 1, detail: { notification: reminder, pressAction: { id: 'task-done' } } });
    assert.equal(db.select().from(schema.tasks).all().length, 2, 'Duplicate Done actions generate exactly one next task');
    assert.equal(db.select().from(schema.tasks).where(eq(schema.tasks.id, task.id)).get()!.done, true);
    permission = 0; await service.syncNotifications(); assert.equal(scheduled.size, 0);
    assert.match(service.useNotificationStatus.getState().message, /permission is off/);
    console.log('PASS: actual notification service with mocked native driver: fallback, registration, no delivery loop, reconciliation, stale actions, snooze, idempotent Done and denied permission.');
  } finally { close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
