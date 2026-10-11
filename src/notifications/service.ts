import { NativeModules, Platform, AppState } from 'react-native';
import type { Notification, Event, TimestampTrigger } from '@notifee/react-native';
import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { getDb, runMigrations, events, tasks, transactions, categories, preferences } from '@/db';
import { readPreferences, savePreferences } from '@/db/preferencesActions';
import { toggleTaskCompletion } from '@/db/taskActions';
import { catchUpMonthly } from '@/db/transactionActions';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { planNotifications, dailySummary, planBudgetAlerts, type PlannedNotification, type TaskNotificationState, type PlannerData } from './planner';
import { reconcileNotifications } from './reconcile';

export const useNotificationStatus = create<{ message: string }>(() => ({ message: 'Notifications need a development build.' }));
type NativeNotifee = typeof import('@notifee/react-native');
let native: NativeNotifee | null = null;
let handlersRegistered = false;
let serviceRunning = false;
let releaseService: (() => void) | null = null;
let requested = false;
let syncWork: Promise<void> | null = null;
function api(): NativeNotifee | null {
  if (native) return native;
  if (!NativeModules.NotifeeApiModule) return null;
  native = require('@notifee/react-native') as NativeNotifee;
  return native;
}
export function notificationsAvailable() { return Boolean(api()); }
function data(): PlannerData {
  const db = getDb();
  return { events: db.select().from(events).all(), tasks: db.select().from(tasks).all(), transactions: db.select().from(transactions).all(), categories: db.select().from(categories).all() };
}
function ledger(key: string, value: string) {
  getDb().insert(preferences).values({ key, value }).onConflictDoUpdate({ target: preferences.key, set: { value } }).run();
}
function readTaskState(): Record<number, TaskNotificationState> {
  const result: Record<number, TaskNotificationState> = {};
  for (const row of getDb().select().from(preferences).all()) if (row.key.startsWith('task-notification:')) {
    try { result[Number(row.key.split(':')[1])] = JSON.parse(row.value); } catch { /* Ignore damaged optional delivery state. */ }
  }
  return result;
}
function content(plan: PlannedNotification, signature: string): Notification {
  return { id: plan.id, title: plan.title, body: plan.body, data: { kind: plan.kind, signature, taskId: String(plan.taskId ?? ''), dueAt: plan.dueAt ?? '' },
    android: { channelId: 'kaisro-reminders', smallIcon: 'ic_notification', pressAction: { id: 'default' }, onlyAlertOnce: true,
      ...(plan.taskId ? { actions: [{ title: 'Done', pressAction: { id: 'task-done' } }, { title: 'Snooze 15 min', pressAction: { id: 'task-snooze' } }] } : {}) },
    ios: { foregroundPresentationOptions: { banner: true, list: true, sound: true }, ...(plan.taskId ? { categoryId: 'kaisro-task' } : {}) } };
}
async function stopPersistent() {
  if (releaseService) releaseService();
  releaseService = null; serviceRunning = false;
  const module = api();
  if (module && Platform.OS === 'android') { await module.default.stopForegroundService(); await module.default.cancelNotification('kaisro-tasks-left'); }
}
async function syncOnce() {
  const module = api();
  if (!module) { useNotificationStatus.setState({ message: 'Notifications need a development build.' }); return; }
  const notifee = module.default;
  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus < module.AuthorizationStatus.AUTHORIZED) {
    await notifee.cancelTriggerNotifications(); await stopPersistent();
    useNotificationStatus.setState({ message: 'Notification permission is off. Enable it below.' }); return;
  }
  if (Platform.OS === 'android') {
    await notifee.createChannel({ id: 'kaisro-reminders', name: 'Reminders and digest', importance: module.AndroidImportance.DEFAULT });
    await notifee.createChannel({ id: 'kaisro-tasks', name: 'Tasks left', importance: module.AndroidImportance.LOW, sound: undefined, vibration: false });
  }
  const db = getDb();
  const prefs = readPreferences(db);
  const now = new Date();
  if (catchUpMonthly(db, now) > 0) useCalendarSync.getState().triggerRefresh();
  const records = data();
  const plans = planNotifications(records, prefs, now, readTaskState());
  const exact = Platform.OS === 'android' && settings.android?.alarm === module.AndroidNotificationSetting.ENABLED;
  await reconcileNotifications({
    list: async () => (await notifee.getTriggerNotifications()).map(item => ({ id: item.notification.id!, signature: item.notification.data?.signature as string | undefined })),
    remove: ids => notifee.cancelTriggerNotifications(ids),
    put: async (plan, signature) => {
      const trigger: TimestampTrigger = { type: module.TriggerType.TIMESTAMP, timestamp: plan.timestamp, ...(exact ? { alarmManager: { allowWhileIdle: true } } : {}) };
      await notifee.createTriggerNotification(content(plan, signature), trigger);
    },
  }, plans);
  // Completion/deletion also removes delivered task reminders and their action buttons.
  for (const item of await notifee.getDisplayedNotifications()) {
    const id = Number(item.notification.data?.taskId);
    if (id && item.id && !records.tasks.some(task => task.id === id && !task.done)) await notifee.cancelDisplayedNotification(item.id);
  }
  for (const alert of planBudgetAlerts(records, prefs, now)) {
    const old = db.select().from(preferences).where(eq(preferences.key, alert.key)).get();
    if (Number(old?.value ?? 0) >= alert.stage) continue;
    await notifee.displayNotification({ id: 'kaisro-' + alert.key, title: alert.title, body: alert.body,
      android: { channelId: 'kaisro-reminders', smallIcon: 'ic_notification', pressAction: { id: 'default' } } });
    ledger(alert.key, String(alert.stage));
  }
  if (Platform.OS === 'android' && prefs.persistentTasks) {
    if (serviceRunning || AppState.currentState === 'active') {
      const summary = dailySummary(records, now);
      await notifee.displayNotification({ id: 'kaisro-tasks-left', title: `${summary.remaining} tasks left`, body: summary.body,
        android: { channelId: 'kaisro-tasks', smallIcon: 'ic_notification', asForegroundService: true, foregroundServiceTypes: [module.AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_SPECIAL_USE], ongoing: true, onlyAlertOnce: true,
          pressAction: { id: 'default' }, actions: [{ title: 'Stop', pressAction: { id: 'stop-tasks' } }] } });
    }
  } else if (serviceRunning) await stopPersistent();
  useNotificationStatus.setState({ message: `${plans.length} reminders/digests scheduled.${Platform.OS === 'android' && !exact ? ' Exact timing is off; Android may delay reminders.' : ''}` });
}
/** Serialize writes, and repeat if data changes while an earlier native sync is pending. */
export function syncNotifications(): Promise<void> {
  requested = true;
  if (!syncWork) syncWork = (async () => {
    while (requested) {
      requested = false;
      try { await syncOnce(); }
      catch (error) { useNotificationStatus.setState({ message: error instanceof Error ? error.message : 'Notifications could not be updated. Reopen to retry.' }); }
    }
  })().finally(() => { syncWork = null; if (requested) void syncNotifications(); });
  return syncWork;
}
export async function requestNotificationPermission() {
  const module = api();
  if (!module) return false;
  const result = await module.default.requestPermission();
  await syncNotifications();
  return result.authorizationStatus >= module.AuthorizationStatus.AUTHORIZED;
}
export async function openNotificationSettings() { const module = api(); if (module) await module.default.openNotificationSettings(); }
export async function openTimingSettings() { const module = api(); if (module && Platform.OS === 'android') await module.default.openAlarmPermissionSettings(); }
export async function openBatterySettings() { const module = api(); if (module && Platform.OS === 'android') await module.default.openBatteryOptimizationSettings(); }
async function handleEvent(event: Event) {
  const module = api(); if (!module) return;
  if (event.type !== module.EventType.ACTION_PRESS && event.type !== module.EventType.DISMISSED) return;
  await runMigrations();
  const { detail, type } = event;
  const taskId = Number(detail.notification?.data?.taskId);
  const dueAt = String(detail.notification?.data?.dueAt ?? '');
  if (type === module.EventType.ACTION_PRESS && detail.pressAction?.id === 'stop-tasks') {
    savePreferences(getDb(), { persistentTasks: false }); usePreferencesStore.getState().hydrate(); await stopPersistent(); return;
  }
  if (taskId) {
    const task = getDb().select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task || task.done || task.dueAt !== dueAt) {
      // The same stable ID may already hold a replacement trigger. An old
      // action must not cancel the newly scheduled reminder for an edited task.
      if (detail.notification?.id) await module.default.cancelDisplayedNotification(detail.notification.id);
      await syncNotifications(); return;
    }
    if (type === module.EventType.ACTION_PRESS && detail.pressAction?.id === 'task-done') {
      toggleTaskCompletion(getDb(), taskId); useCalendarSync.getState().triggerRefresh();
    } else if (type === module.EventType.ACTION_PRESS && detail.pressAction?.id === 'task-snooze') {
      ledger('task-notification:' + taskId, JSON.stringify({ snoozedUntil: Date.now() + 15 * 60000, snoozedDueAt: dueAt }));
      if (detail.notification?.id) await module.default.cancelDisplayedNotification(detail.notification.id);
    } else if (type === module.EventType.DISMISSED) {
      ledger('task-notification:' + taskId, JSON.stringify({ dismissedDueAt: dueAt }));
    }
  }
  await syncNotifications();
}
export function registerNotificationHandlers() {
  const module = api(); if (!module || handlersRegistered) return;
  handlersRegistered = true;
  module.default.onBackgroundEvent(handleEvent);
  module.default.onForegroundEvent(event => { void handleEvent(event).catch(error => console.warn('[Notifications]', error)); });
  void module.default.setNotificationCategories([{ id: 'kaisro-task', actions: [{ id: 'task-done', title: 'Done' }, { id: 'task-snooze', title: 'Snooze 15 min' }] }]).catch(error => console.warn('[Notification categories]', error));
  if (Platform.OS === 'android') module.default.registerForegroundService(() => new Promise<void>(resolve => {
    serviceRunning = true;
    const interval = setInterval(() => { void syncNotifications(); }, 30000);
    releaseService = () => { clearInterval(interval); serviceRunning = false; resolve(); };
  }));
}
