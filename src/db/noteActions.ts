import { eq } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { notes, noteLinks, noteTags, tags, type Note } from './schema';
import { replaceNoteLinks, type NoteTarget } from './linkActions';

export interface NoteDraft {
  title?: string;
  body?: string;
  pinned?: boolean;
  favorite?: boolean;
  tags?: string[];
  links?: NoteTarget[];
}

/**
 * Saves a note (either inserts a new note or updates an existing note).
 * Trims whitespace. If title is empty but body exists, extracts up to the first 40 chars of the first line.
 * Defaults title to 'Untitled Note' if neither title nor first line exists.
 */
export function saveNote(db: AppDatabase, draft: NoteDraft, id?: number): Note {
  return db.transaction(tx => {
    const note = saveNoteContent(tx, draft, id);
    if (draft.tags !== undefined) {
      const unique = new Map<string, string>();
      for (const name of draft.tags.map(tag => tag.trim()).filter(Boolean)) if (!unique.has(name.toLocaleLowerCase())) unique.set(name.toLocaleLowerCase(), name);
      const names = [...unique.values()];
      tx.delete(noteTags).where(eq(noteTags.noteId, note.id)).run();
      for (const name of names) {
        let tag = tx.select().from(tags).all().find(row => row.name.toLocaleLowerCase() === name.toLocaleLowerCase());
        if (!tag) tag = tx.insert(tags).values({ name }).returning().get();
        tx.insert(noteTags).values({ noteId: note.id, tagId: tag.id }).run();
      }
    }
    if (draft.links !== undefined) replaceNoteLinks(tx, note.id, draft.links);
    return note;
  });
}

export function readNoteTags(db: AppDatabase, id: number): string[] {
  return db.select({ name: tags.name }).from(noteTags).innerJoin(tags, eq(tags.id, noteTags.tagId)).where(eq(noteTags.noteId, id)).all().map(row => row.name);
}

function saveNoteContent(db: AppDatabase, draft: NoteDraft, id?: number): Note {
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
        ...(draft.pinned !== undefined ? { pinned: draft.pinned } : {}),
        ...(draft.favorite !== undefined ? { favorite: draft.favorite } : {}),
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
      pinned: draft.pinned ?? false,
      favorite: draft.favorite ?? false,
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
export function filterNotes<T extends Note & { tagNames?: string[] }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      (item.body && item.body.toLowerCase().includes(q)) ||
      item.tagNames?.some(tag => tag.toLowerCase().includes(q))
  );
}
