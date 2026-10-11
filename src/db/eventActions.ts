import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { events, noteLinks } from './schema';

/** Keep notes when an event is removed, and remove only links to that event. */
export function deleteEventAndUnlinkNotes(db: AppDatabase, id: number) {
  db.transaction(tx => {
    tx.delete(noteLinks).where(and(eq(noteLinks.targetType, 'event'), eq(noteLinks.targetId, id))).run();
    tx.delete(events).where(eq(events.id, id)).run();
  });
}
