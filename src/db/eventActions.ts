import { and, eq, inArray } from 'drizzle-orm';
import type { AppDatabase } from './types';
import { events, noteLinks, type NewEvent } from './schema';
import { parseExcludedDates, projectEventOntoDate } from '../utils/recurrence';
import { shiftDateByDays, parseISODate } from '../utils/dateUtils';
import { replaceTargetNotes } from './linkActions';

export type EventScope = 'this' | 'future' | 'all';

function validateEvent(draft: NewEvent) {
  if (!draft.title.trim()) throw new Error('Event title is required.');
  if (!Number.isFinite(new Date(draft.start).getTime()) || (draft.end && (!Number.isFinite(new Date(draft.end).getTime()) || new Date(draft.end) < new Date(draft.start)))) throw new Error('Choose a valid event time range.');
}

export function saveScopedEvent(db: AppDatabase, id: number, occurrenceStart: string, draft: NewEvent, scope: EventScope, noteIds?: number[]) {
  validateEvent(draft);
  return db.transaction(tx => {
    const finish = (row: typeof events.$inferSelect) => {
      if (noteIds) replaceTargetNotes(tx, { targetType: 'event', targetId: row.id }, noteIds);
      return row;
    };
    const current = tx.select().from(events).where(eq(events.id, id)).get();
    if (!current) throw new Error('This event no longer exists.');
    const repeating = current.recurrence && current.recurrence.toLowerCase() !== 'none';
    const day = occurrenceStart.slice(0, 10);
    const now = new Date().toISOString();
    if (repeating && scope === 'this') {
      if (parseExcludedDates(current.excludedDates).includes(day)) throw new Error('This occurrence has already changed. Reopen it from the calendar.');
      tx.update(events).set({ excludedDates: JSON.stringify([...new Set([...parseExcludedDates(current.excludedDates), day])]), updatedAt: now }).where(eq(events.id, id)).run();
      return finish(tx.insert(events).values({ ...draft, id: undefined, recurrence: null, recurrenceUntil: null, excludedDates: null, seriesId: current.seriesId ?? current.id, occurrenceDate: day }).returning().get());
    }
    if (repeating && scope === 'future' && day > current.start.slice(0, 10)) {
      tx.update(events).set({ recurrenceUntil: shiftDateByDays(day, -1), updatedAt: now }).where(eq(events.id, id)).run();
      const future = tx.insert(events).values({ ...draft, id: undefined, recurrenceUntil: current.recurrenceUntil,
        excludedDates: JSON.stringify(parseExcludedDates(current.excludedDates).filter(date => date >= day)), seriesId: null, occurrenceDate: null }).returning().get();
      for (const child of tx.select().from(events).where(eq(events.seriesId, id)).all()) {
        if ((child.occurrenceDate ?? child.start.slice(0, 10)) >= day) tx.update(events).set({ seriesId: future.id }).where(eq(events.id, child.id)).run();
      }
      return finish(future);
    }
    let values = { ...draft, updatedAt: now };
    if (repeating && scope === 'all') {
      const dayShift = Math.round((parseISODate(draft.start.slice(0, 10)).getTime() - parseISODate(day).getTime()) / 86400000);
      const originalDay = shiftDateByDays(current.start.slice(0, 10), dayShift);
      const projected = projectEventOntoDate({ ...current, ...draft, id }, originalDay);
      values = { ...values, start: projected.start, end: projected.end };
    }
    return finish(tx.update(events).set(values).where(eq(events.id, id)).returning().get()!);
  });
}

export function deleteScopedEvent(db: AppDatabase, id: number, occurrenceStart: string, scope: EventScope) {
  db.transaction(tx => {
    const event = tx.select().from(events).where(eq(events.id, id)).get();
    if (!event) throw new Error('This event no longer exists.');
    const day = occurrenceStart.slice(0, 10);
    if (event.recurrence && event.recurrence.toLowerCase() !== 'none' && scope !== 'all') {
      tx.update(events).set(scope === 'this'
        ? { excludedDates: JSON.stringify([...new Set([...parseExcludedDates(event.excludedDates), day])]) }
        : { recurrenceUntil: shiftDateByDays(day, -1) }).where(eq(events.id, id)).run();
      const children = tx.select().from(events).where(eq(events.seriesId, id)).all().filter(child => scope === 'future' ? (child.occurrenceDate ?? child.start.slice(0, 10)) >= day : child.occurrenceDate === day);
      if (children.length) {
        const ids = children.map(child => child.id);
        tx.delete(noteLinks).where(and(eq(noteLinks.targetType, 'event'), inArray(noteLinks.targetId, ids))).run();
        tx.delete(events).where(inArray(events.id, ids)).run();
      }
      return;
    }
    const rootId = event.seriesId ?? event.id;
    const ids = scope === 'all'
      ? tx.select().from(events).all().filter(row => row.id === rootId || row.seriesId === rootId).map(row => row.id)
      : [id];
    tx.delete(noteLinks).where(and(eq(noteLinks.targetType, 'event'), inArray(noteLinks.targetId, ids))).run();
    tx.delete(events).where(inArray(events.id, ids)).run();
  });
}

export function duplicateEvent(db: AppDatabase, id: number, occurrenceStart?: string) {
  const event = db.select().from(events).where(eq(events.id, id)).get();
  if (!event) throw new Error('This event no longer exists.');
  const copy = occurrenceStart ? projectEventOntoDate(event, occurrenceStart.slice(0, 10)) : event;
  return db.insert(events).values({ ...copy, id: undefined, title: copy.title + ' (copy)',
    excludedDates: null, recurrenceUntil: null, seriesId: null, occurrenceDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).returning().get();
}

/** Keep notes when an event is removed, and remove only links to that event. */
export function deleteEventAndUnlinkNotes(db: AppDatabase, id: number) {
  db.transaction(tx => {
    tx.delete(noteLinks).where(and(eq(noteLinks.targetType, 'event'), eq(noteLinks.targetId, id))).run();
    tx.delete(events).where(eq(events.id, id)).run();
  });
}
