import { eq } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { preferences } from './schema';

export interface PlannerPreferences {
  theme: 'system' | 'light' | 'dark';
  eventReminders: boolean;
  taskReminders: boolean;
  dailyDigest: boolean;
  budgetAlerts: boolean;
  persistentTasks: boolean;
  escalatingTasks: boolean;
  digestHour: number;
  digestMinute: number;
  budgetThreshold: number;
}
export const DEFAULT_PREFERENCES: PlannerPreferences = { theme: 'system', eventReminders: true, taskReminders: true,
  dailyDigest: false, budgetAlerts: true, persistentTasks: false, escalatingTasks: false, digestHour: 8, digestMinute: 0, budgetThreshold: 80 };
export function readPreferences(db: AppDatabase): PlannerPreferences {
  const stored = db.select().from(preferences).where(eq(preferences.key, 'planner')).get();
  try { return validatePreferences({ ...DEFAULT_PREFERENCES, ...(stored ? JSON.parse(stored.value) : {}) }); }
  catch { return { ...DEFAULT_PREFERENCES }; }
}
function validatePreferences(value: PlannerPreferences): PlannerPreferences {
  if (!['system', 'light', 'dark'].includes(value.theme)) throw new Error('Choose a supported theme.');
  for (const key of ['eventReminders', 'taskReminders', 'dailyDigest', 'budgetAlerts', 'persistentTasks', 'escalatingTasks'] as const) if (typeof value[key] !== 'boolean') throw new Error('Choose valid notification settings.');
  if (!Number.isInteger(value.digestHour) || value.digestHour < 0 || value.digestHour > 23 || !Number.isInteger(value.digestMinute) || value.digestMinute < 0 || value.digestMinute > 59) throw new Error('Choose a valid digest time.');
  if (!Number.isInteger(value.budgetThreshold) || value.budgetThreshold < 1 || value.budgetThreshold > 100) throw new Error('Choose a threshold from 1 to 100.');
  return value;
}
export function savePreferences(db: AppDatabase, patch: Partial<PlannerPreferences>) {
  const value = validatePreferences({ ...readPreferences(db), ...patch });
  db.insert(preferences).values({ key: 'planner', value: JSON.stringify(value) }).onConflictDoUpdate({ target: preferences.key, set: { value: JSON.stringify(value) } }).run();
  return value;
}
