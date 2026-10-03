import { eq } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { notes, noteLinks, noteTags, type Note } from './schema';

export interface NoteDraft {
  title?: string;
  body?: string;
}

/**
 * Saves a note (either inserts a new note or updates an existing note).
 * Trims whitespace. If title is empty but body exists, extracts up to the first 40 chars of the first line.
 * Defaults title to 'Untitled Note' if neither title nor first line exists.
 */
export function saveNote(db: AppDatabase, draft: NoteDraft, id?: number): Note {
  const trimmedBody = (draft.body ?? '').trim();
  let trimmedTitle = (draft.title ?? '').trim();

  if (!trimmedTitle) {
    if (trimmedBody) {
      const firstLine = trimmedBody.split('\n')[0].trim();
      trimmedTitle = firstLine.length > 40 ? firstLine.slice(0, 37) + '...' : firstLine;
    } else {
      trimmedTitle = 'Untitled Note';
    }
  }

  const now = new Date().toISOString();

  if (id !== undefined) {
    const existing = db.select().from(notes).where(eq(notes.id, id)).get();
    if (!existing) {
      throw new Error('This note no longer exists.');
    }
    const updated = db
      .update(notes)
      .set({
        title: trimmedTitle,
        body: trimmedBody,
        updatedAt: now,
      })
      .where(eq(notes.id, id))
      .returning()
      .get();
    return updated!;
  }

  const inserted = db
    .insert(notes)
    .values({
      title: trimmedTitle,
      body: trimmedBody,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return inserted!;
}

/**
 * Deletes a note and all its links and tag relations.
 */
export function deleteNote(db: AppDatabase, id: number): void {
  db.transaction((tx) => {
    tx.delete(noteLinks).where(eq(noteLinks.noteId, id)).run();
    tx.delete(noteTags).where(eq(noteTags.noteId, id)).run();
    tx.delete(notes).where(eq(notes.id, id)).run();
  });
}

/**
 * Filters a list of notes matching a search query in either title or body (case-insensitive).
 */
export function filterNotes(items: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      (item.body && item.body.toLowerCase().includes(q))
  );
}
