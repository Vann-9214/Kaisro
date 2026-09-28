# Kaisro build progress

Branch: `kaisro-build`. Never push or change main. Current run: 1b, 2a, 2b, 2c,
2d, 3a, 3b, 4, 7. Phases 5 and 6 are explicitly excluded.

## Status

| Step | Status | Verification / commit |
| --- | --- | --- |
| 1a | Done; phone check passed | Baseline preserved on this branch |
| 1b | Done with judgment calls | tsc + verify-task-crud.ts + verify-tasks-list.ts; commit follows |
| 2a | Done with judgment calls | tsc + verify-budget.ts; commit follows |
| 2b | Done with judgment calls | tsc + verify-transactions.ts; commit follows |
| 2c–2d | Pending | Categories and alerts |
| 3a–3b | Pending | Notes |
| 4 | Pending | Linking |
| 7 | Pending | Dark mode |

## Baseline

The branch began with the approved 1a changes still uncommitted. Preserve them
in a separate baseline commit before the requested step commits. No real app
database is used in verification. See phase-1a-verification.md for prior judgments.

## Run judgments and deviations

Record each step here after verifying. Screens come only from local screenshots;
tokens come from the saved design-system definitions and existing semantic theme.

### 1b

- Opened quick-add-task screenshot. Reused native pickers (iOS inline spinner with
  Done, Android dialogs), the existing segmented control, and offset chips rather
  than reproducing a custom picker. Dates are controlled in the UI store.
- Optional date/time can be cleared independently. Reminder offsets are stored
  even without a date, but nothing is scheduled. Default reminder is off.
- Legacy urgent priorities display/edit as High; only Low/Medium/High are offered.
- Task title taps edit; the trailing chevron expands subtasks. Parent completion
  is independent of subtask completion. Editing preserves subtask IDs and checks.
- Calm delete uses neutral text and confirmation. Linking row comes in Phase 4.
- The existing lifted-input host now shows the shared Save footer above its input
  bar while editing, with a short entrance fade. The bar remains docked directly
  above the keyboard. This needs real-device checks for small screens/keyboards.
- Verification uses the actual Expo Drizzle adapter with an isolated in-memory
  SQLite client shim, including rollback and completion timestamp checks.

### 2a

- Opened budget and empty-budget screenshots. The requested income/expenses/
  remaining summary replaces the screenshot's monthly buffer/daily-average panel;
  remaining is income minus expenses, not the sum of category caps minus spending.
- No Balance/Needs/Wants or Mindful Archive features were added. No target caps,
  counts, or recurring bills are invented. The empty design's dollar sign uses ₱.
- Categories remain visible at zero; uncapped categories show an amount without a
  bar. Only monthly obligations active in the viewed month appear; none means hidden.
- Reused flat cards and shared icons instead of tiny screenshot-specific tiles.
  Month selection lives in the existing UI store. Entries are grouped by local date.

### 2b

- The supplied quick-add-expense screenshot is cropped at the top. Used its date,
  repeats, and footer details; reused existing amount/category/description fields
  for the absent top portion. Added the requested Expense/Income selector. No
  Account field was added (accounts are outside the roadmap). Linking waits for 4.
- Amount strings permit only positive values with up to two decimals; malformed
  or over-precision values are rejected rather than silently rounded.
- Monthly rules keep the original day and local time, clamp shorter months, and
  catch up on cold start and foreground resume. Occurrence edits affect only that
  entry. Turning repeats off ends future entries; re-enabling resumes next month.
  Deleting an occurrence leaves the rule/cursor intact and does not recreate it.
- Save uses the neutral label Save Entry for both income and expense. Native
  pickers use local timestamps to match Calendar's stored-date convention.

## Device verification

Final checks will cover Android/iOS native pickers, lifted fields/keyboard,
safe areas, notifications excluded from this run, and light/dark contrast.
