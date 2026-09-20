import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './migrations/migrations';
import * as schema from './schema';

let _expoDb: SQLiteDatabase | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getExpoDb(): SQLiteDatabase {
  if (!_expoDb) {
    _expoDb = openDatabaseSync('kaisro.db');
  }
  return _expoDb;
}

export function getDb() {
  if (!_db) {
    const sqlite = getExpoDb();
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDb();
    // @ts-ignore
    return instance[prop];
  },
});

/**
 * Runs Drizzle migrations using the official expo-sqlite migrator.
 * Migration files in src/db/migrations/ are the single source of truth for creating and updating tables.
 */
export async function runMigrations(): Promise<void> {
  const instance = getDb();
  // Enable SQLite foreign key constraint enforcement
  getExpoDb().execSync('PRAGMA foreign_keys = ON;');
  await migrate(instance, migrations);
}

export * from './schema';
export { migrations };
