import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type * as schema from './schema';
export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;
