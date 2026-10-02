import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { calculateLiftedBarPosition } from '../src/utils/keyboardLayout';
import { calculateTimelineScrollTarget, computeNowTop } from '../src/utils/timelineLayout';
import { testDatabase } from './testDatabase';
import { saveTask } from '../src/db/taskActions';
import { saveTransaction } from '../src/db/transactionActions';
import { tasks, transactions } from '../src/db/schema';

// The app window and native modal can report different sizes while the IME opens.
// For each case, the input's bottom must land at the keyboard's top, never below it.
for (const scenario of [
  { name: 'full-height modal', window: 800, top: 0, height: 800, keyboard: 480 },
  { name: 'modal resized before app window', window: 800, top: 0, height: 480, keyboard: 480 },
  { name: 'app window resized before modal', window: 480, top: 0, height: 800, keyboard: 480 },
  { name: 'both resized', window: 480, top: 0, height: 480, keyboard: 480 },
  { name: 'status and navigation bars', window: 752, top: 24, height: 728, keyboard: 460 },
  { name: 'taller keyboard', window: 800, top: 0, height: 800, keyboard: 380 },
]) {
  const { bottomOffset } = calculateLiftedBarPosition({
    initialWindowHeight: 800, currentWindowHeight: scenario.window,
    keyboardScreenY: scenario.keyboard, keyboardHeight: 800 - scenario.keyboard,
    bottomInset: 48, viewport: { screenY: scenario.top, height: scenario.height },
  });
  assert.equal(scenario.top + scenario.height - bottomOffset, scenario.keyboard, scenario.name);
}
assert.equal(calculateLiftedBarPosition({
  initialWindowHeight: 800, currentWindowHeight: 800, keyboardScreenY: 800,
  keyboardHeight: 0, bottomInset: 48, viewport: { screenY: 0, height: 752 },
}).bottomOffset, 0, 'dismissed keyboard does not reserve keyboard space');

const { db, close } = testDatabase();
try {
  assert.equal(db.select().from(tasks).all().length, 0);
  assert.equal(db.select().from(transactions).all().length, 0);
  const taskDraft = { title: 'Date picker verification', priority: 'medium' as const,
    dueAt: null, reminderMinutes: null, subtasks: [] };
  const task = saveTask(db, taskDraft);
  for (const dueAt of ['2026-10-02', '2026-10-02T16:28:00', null]) {
    saveTask(db, { ...taskDraft, dueAt }, task.id);
    assert.equal(db.select().from(tasks).where(eq(tasks.id, task.id)).get()!.dueAt, dueAt);
  }
  const entry = saveTransaction(db, { type: 'expense', amount: 12550,
    categoryId: null, date: '2026-10-02T16:28:00', note: '', repeats: false });
  assert.equal(entry.amount, 12550);
  assert.equal(entry.date, '2026-10-02T16:28:00');

  const nowMinutes = 16 * 60 + 28;
  const viewportHeight = 450;
  const timelineOffsetY = 100;
  const target = calculateTimelineScrollTarget({ dateStr: entry.date.slice(0, 10),
    todayStr: '2026-10-02', timelineOffsetY, viewportHeight, contentHeight: 2000, nowMinutes });
  const nowInViewport = timelineOffsetY + computeNowTop(16, 28) - target;
  assert.ok(Math.abs(nowInViewport - Math.round(viewportHeight * 0.35)) < 1,
    'Today places 4:28 PM inside the viewport');
  assert.equal(calculateTimelineScrollTarget({ dateStr: '2026-10-03', todayStr: '2026-10-02',
    timelineOffsetY, viewportHeight, contentHeight: 2000, isEmpty: true }), 0,
    'empty days show their summary and empty state');
  console.log('PASS: modal keyboard docking, task date/time edits, exact centavos, Today and empty-day positioning (isolated SQLite)');
} finally {
  close();
}
