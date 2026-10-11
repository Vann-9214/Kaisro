import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { testDatabase } from './testDatabase';
import * as schema from '../src/db/schema';

async function main() {
  const { db, sqlite, close } = testDatabase();
  const journal = JSON.parse(readFileSync('src/db/migrations/meta/_journal.json', 'utf8'));
  const bundle = { journal, migrations: Object.fromEntries(journal.entries.map((entry: any) => ['m' + String(entry.idx).padStart(4, '0'), readFileSync('src/db/migrations/' + entry.tag + '.sql', 'utf8')])) };
  const code = ts.transpileModule(readFileSync('src/db/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  let attempts = 0; let fail = false;
  const load = () => {
    const module = { exports: {} as any };
    const modules: Record<string, any> = {
      'expo-sqlite': { openDatabaseSync: () => ({ execSync: (sql: string) => sqlite.exec(sql), getAllSync: (sql: string) => sqlite.prepare(sql).all() }) },
      'drizzle-orm/expo-sqlite': { drizzle: () => db },
      'drizzle-orm/expo-sqlite/migrator': { migrate: async (...args: Parameters<typeof migrate>) => { attempts++; if (fail) throw new Error('Simulated upgrade failure'); return migrate(...args); } },
      './migrations/migrations': { __esModule: true, default: bundle }, './schema': schema,
    };
    runInNewContext(code, { exports: module.exports, module, require: (id: string) => { assert.ok(id in modules, id); return modules[id]; } });
    return module.exports;
  };
  try {
    const production = load(); const first = production.runMigrations(); const second = production.runMigrations();
    assert.equal(first, second, 'Startup and notification initialization share one upgrade');
    await Promise.all([first, second]); await production.runMigrations(); assert.equal(attempts, 1);
    assert.equal(sqlite.prepare('PRAGMA foreign_keys').get()!.foreign_keys, 1);
    const retry = load(); fail = true; await assert.rejects(retry.runMigrations(), /Simulated upgrade failure/);
    assert.equal(sqlite.prepare('PRAGMA foreign_keys').get()!.foreign_keys, 1, 'Failure restores constraint enforcement');
    fail = false; await retry.runMigrations(); assert.equal(attempts, 3);
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
    console.log('PASS: actual database initialization shares concurrent upgrades, caches success, restores constraints on failure and retries safely.');
  } finally { close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
