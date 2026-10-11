import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import * as schema from '../src/db/schema';

/** Run the production Drizzle adapter against an isolated SQLite :memory: database. */
export function testDatabase(beforeUpgrade?: (sqlite: DatabaseSync) => void) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const dir = resolve('src/db/migrations');
  const journal = JSON.parse(readFileSync(resolve(dir, 'meta/_journal.json'), 'utf8'));
  const client = {
    prepareSync(query: string) {
      return {
        executeSync(params: any[]) {
          const statement = sqlite.prepare(query);
          if (/^\s*(select|pragma|with)\b/i.test(query) || /\breturning\b/i.test(query)) {
            const rows = statement.all(...params);
            return { getAllSync: () => rows, getFirstSync: () => rows[0] };
          }
          const result = statement.run(...params);
          return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
        executeForRawResultSync(params: any[]) {
          const statement = sqlite.prepare(query);
          statement.setReturnArrays(true);
          const rows = statement.all(...params);
          return { getAllSync: () => rows };
        },
      };
    },
  };
  const db = drizzle(client as any, { schema });
  const migrations = journal.entries.map((entry: any) => ({
    sql: readFileSync(resolve(dir, entry.tag + '.sql'), 'utf8').split('--> statement-breakpoint'),
    folderMillis: entry.when, hash: '', bps: entry.breakpoints,
  }));
  const apply = (list: typeof migrations) => {
    sqlite.exec('PRAGMA foreign_keys = OFF');
    try {
      // Same dialect/transaction as the production Expo migrator.
      (db as any).dialect.migrate(list, (db as any).session);
      if (sqlite.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Invalid migrated references');
    } finally { sqlite.exec('PRAGMA foreign_keys = ON'); }
  };
  if (beforeUpgrade) { apply(migrations.slice(0, 1)); beforeUpgrade(sqlite); }
  apply(migrations);
  return { db, sqlite, close: () => sqlite.close() };
}
