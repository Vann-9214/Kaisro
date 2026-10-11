import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { events, tasks, transactions, notes, noteLinks } from './schema';

export interface NoteTarget { targetType: 'event' | 'task' | 'transaction'; targetId: number }
export function validateTarget(db: AppDatabase, target: NoteTarget) {
  const table = target.targetType === 'event' ? events : target.targetType === 'task' ? tasks : transactions;
  if (!db.select({ id: table.id }).from(table).where(eq(table.id, target.targetId)).get()) throw new Error('A linked item no longer exists.');
}
export function replaceNoteLinks(db: AppDatabase, noteId: number, targets: NoteTarget[]) {
  if (!db.select().from(notes).where(eq(notes.id, noteId)).get()) throw new Error('This note no longer exists.');
  db.transaction(tx => {
    const unique = [...new Map(targets.map(target => [target.targetType + ':' + target.targetId, target])).values()];
    unique.forEach(target => validateTarget(tx, target));
    tx.delete(noteLinks).where(eq(noteLinks.noteId, noteId)).run();
    for (const target of unique) tx.insert(noteLinks).values({ noteId, ...target }).run();
  });
}
export function replaceTargetNotes(db: AppDatabase, target: NoteTarget, noteIds: number[]) {
  db.transaction(tx => {
    validateTarget(tx, target);
    for (const id of noteIds) if (!tx.select().from(notes).where(eq(notes.id, id)).get()) throw new Error('A selected note no longer exists.');
    tx.delete(noteLinks).where(and(eq(noteLinks.targetType, target.targetType), eq(noteLinks.targetId, target.targetId))).run();
    for (const noteId of new Set(noteIds)) tx.insert(noteLinks).values({ noteId, ...target }).run();
  });
}
export function linkedNoteIds(db: AppDatabase, target?: NoteTarget): number[] {
  return target ? db.select().from(noteLinks).where(and(eq(noteLinks.targetType, target.targetType), eq(noteLinks.targetId, target.targetId))).all().map(link => link.noteId) : [];
}
export function readNoteTargets(db: AppDatabase, noteId: number): NoteTarget[] {
  return db.select().from(noteLinks).where(eq(noteLinks.noteId, noteId)).all().map(({ targetType, targetId }) => ({ targetType, targetId }));
}
