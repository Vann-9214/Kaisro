import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import * as schema from '../src/db/schema';

/** Run the production Drizzle adapter against an isolated SQLite :memory: database. */
export function testDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const dir = resolve('src/db/migrations');
  const journal = JSON.parse(readFileSync(resolve(dir, 'meta/_journal.json'), 'utf8'));
  for (const entry of journal.entries) sqlite.exec(readFileSync(resolve(dir, entry.tag + '.sql'), 'utf8'));
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
  return { db: drizzle(client as any, { schema }), close: () => sqlite.close() };
}
