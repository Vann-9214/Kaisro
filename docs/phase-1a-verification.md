# Phase 1a: Tasks UI

Implemented from the locally viewed `tasks/screenshot.png` and
`empty-tasks/screenshot.png`, with the light definition in
`.stitch-reference/design-system.md`. No downloads or Stitch source calls.

## Scope and verification

- The Tasks list reads the existing database. Task and subtask checkboxes are
  read-only in 1a. List filters, subtask expansion, and the Done disclosure work.
- Add a task and the existing floating + open the existing Task quick-add sheet.
  Task form changes and task editing/completion are reserved for 1b.
- No sample data is loaded automatically; schema, seed tools, and app data are untouched.
- `npx.cmd tsc --noEmit` passes. Windows blocks the `npx.ps1` wrapper, so `.cmd`
  runs the same TypeScript command.
- `npx.cmd tsx scripts/verify-tasks-list.ts` uses SQLite `:memory:`, applies the
  existing migrations, and checks empty states, list filters, grouping, progress,
  ordered subtasks, local dates/offsets/midnight, read-only selection, all-complete,
  and clearing with cascade. It never opens `kaisro.db`.
- Native rendering still needs the phone checks below; no web target was used.

## Screenshot comparison and judgment calls

- Kept the screenshot hierarchy: Tasks top bar, Today heading and date, three
  segments, progress card, grouped task cards with metadata, subtasks, Done.
  The empty state has a check icon, All caught up, Add a task, and summary cards.
- Reused TopBar, SegmentedControl, FormCard/FormRow, Checkbox, Chip, ProgressBar,
  EmptyState, and the existing FAB. Their header typography, pill shapes,
  borders, icon geometry, and internal spacing differ from the screenshot.
  Added SheetSection because no implementation existed in this checkout.
- New section/card gaps use the shared 20/12/8/4 spacing values. FormCard retains
  its existing internal padding. The empty card grows with its content and uses
  32-unit vertical padding instead of an inferred fixed screenshot height.
- Used the empty screenshot's title-above-date order for both populated and
  empty states. The populated screenshot puts the date above Today.
- Reused existing semantic colors. Overdue uses text rather than the screenshot's
  red accent; priorities use neutral labeled flag chips rather than a sand
  Medium pill. An expanded task's time chip uses the tasks token.
- Omitted profile, search, filter-settings icons, Balanced/Mindful badges,
  Reviewed today text, and decorative empty-state circles. No corresponding
  behavior or data is specified for 1a; the app has no account/profile.
- Empty summary cards show actual completed-today count and the next future
  due date, or 0 tasks / Nothing scheduled. They never copy the design's sample
  values. Done (0) remains visible but disabled on an entirely empty list.
- Today includes unfinished past dates and undated work. Overdue means a date
  before today; earlier times today stay in their time group. Completed tasks
  appear in Today's Done if due today or completed today. Upcoming includes
  dated tasks after today; All lists includes everything. Progress follows the
  selected list, excludes subtasks, and is 0 for an empty list.
- Morning covers before noon; Afternoon covers noon onward, including evening.
  The screenshot's 10 AM–noon and 1 PM–5 PM labels would leave tasks out, so the
  displayed range labels are broader. Date-only/undated work goes in Anytime.
  Future/overdue chips include dates to distinguish them in Upcoming/All lists.
- Existing urgent values display as High, consistent with the planned three
  priority levels. Subtasks initially collapse (the screenshot has one expanded).
  Read-only checkboxes use the shared disabled appearance in this step.
- The shared bottom tab bar already reserves its height and safe inset. Extra
  scroll padding clears the existing 52-unit floating button and its gap.

## Phone checks

1. With an empty database, open Tasks: check the header clears the status bar,
   all three segments show All caught up, summary values are empty/zero, and
   no progress card or sample tasks appear. Done (0) is disabled.
2. Tap Add a task, close it, then tap +: both should open the existing Task tab
   without opening the keyboard. Check the existing Save footer remains visible;
   close without saving. Task-form behavior itself is reviewed in 1b.
3. If you want to inspect populated rows, use the existing dev-only Settings
   Load sample data tool. Its fixtures use fixed September 2026 dates, so current
   date determines which groups appear. All lists should show all fixture tasks.
4. Check overdue dates, priorities, long title wrapping, and subtask counts. Tap
   a task with subtasks to expand/collapse it; verify ordering and checked marks.
   Task/subtask checkboxes must not change values in this read-only phase.
5. Expand Done in All lists, check strikethrough titles, then switch lists:
   Done should collapse. Confirm totals and the progress bar agree with rows.
6. Scroll to the last row; verify it can clear the + button and bottom tab bar.
   Check larger system text for clipping, including metadata and summary cards.
7. If testing on a disposable sample database, use Settings Clear all data and
   return to Tasks; it should immediately show the empty state. Do not clear
   personal data just to run this check.

Stop here. Phase 1b starts only after phone approval.
