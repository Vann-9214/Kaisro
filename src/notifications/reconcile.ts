import type { PlannedNotification } from './planner';
export interface ScheduledRecord { id: string; signature?: string }
export interface ScheduleDriver {
  list: () => Promise<ScheduledRecord[]>;
  remove: (ids: string[]) => Promise<void>;
  put: (plan: PlannedNotification, signature: string) => Promise<void>;
}
export async function reconcileNotifications(driver: ScheduleDriver, plans: PlannedNotification[]) {
  const current = await driver.list();
  const desired = new Map(plans.map(plan => [plan.id, { plan, signature: JSON.stringify(plan) }]));
  const obsolete = current.filter(record => record.id.startsWith('kaisro-') && (!desired.has(record.id) || desired.get(record.id)!.signature !== record.signature)).map(record => record.id);
  if (obsolete.length) await driver.remove(obsolete);
  for (const { plan, signature } of desired.values()) if (!current.some(record => record.id === plan.id && record.signature === signature)) await driver.put(plan, signature);
}
