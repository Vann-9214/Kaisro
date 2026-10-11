import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './migrations/migrations';
import * as schema from './schema';

let _expoDb: SQLiteDatabase | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _migrationWork: Promise<void> | null = null;

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
export function runMigrations(): Promise<void> {
  // Startup and background notification actions can arrive together. Share one
  // upgrade and keep its successful promise; retry only after a failure.
  if (_migrationWork) return _migrationWork;
  _migrationWork = applyMigrations();
  void _migrationWork.catch(() => { _migrationWork = null; });
  return _migrationWork;
}

async function applyMigrations(): Promise<void> {
  const instance = getDb();
  const sqlite = getExpoDb();
  // Drizzle wraps upgrades in a transaction. SQLite cannot change this pragma
  // inside that transaction; disable it beforehand so generated table rebuilds
  // preserve references instead of executing ON DELETE actions on old tables.
  sqlite.execSync('PRAGMA foreign_keys = OFF;');
  try {
    await migrate(instance, migrations);
    if (sqlite.getAllSync('PRAGMA foreign_key_check').length) {
      throw new Error('Database upgrade found invalid references.');
    }
  } finally {
    sqlite.execSync('PRAGMA foreign_keys = ON;');
  }
}

export * from './schema';
export { migrations };
