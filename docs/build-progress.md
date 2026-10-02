# Kaisro build progress

Branch: `kaisro-build`. Never push or change main. Current run: 1b, 2a, 2b, 2c,
2d, 3a, 3b, 4, 7. Phases 5 and 6 are explicitly excluded.

## Status

| Step | Status | Verification / commit |
| --- | --- | --- |
| 1a | Done; phone check passed | `eb33758` baseline |
| 1b | Done with judgment calls | tsc + verify-task-crud.ts + verify-tasks-list.ts; `9237bf0` |
| 2a | Done with judgment calls | tsc + verify-budget.ts; `8b2a233` |
| 2b | Done with judgment calls | tsc + verify-transactions.ts; `2234aa0` |
| 2c | Done with judgment calls | tsc + verify-categories.ts; `bd6c6ed` |
| 2d | Blocked | Local alert screenshot missing; see BLOCKERS.md |
| 3a | Blocked | Local Notes screenshot missing; see BLOCKERS.md |
| 3b | Blocked | Local quick-add Note screenshot missing; see BLOCKERS.md |
| 4 | Blocked | Local linking screenshots missing; see BLOCKERS.md |
| 7 | Blocked | Local dark screenshots and design system missing; see BLOCKERS.md |

## Baseline

The branch began with the approved 1a changes still uncommitted. They were
preserved in the baseline commit. No real app database was used in verification.
See phase-1a-verification.md for prior judgments.

## Run judgments and deviations

Screens were read only from local screenshots while they were present; tokens
came from the saved design-system definitions and existing semantic theme.

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

### 2c

- No Stitch design exists. The manage screen uses TopBar, FormCard/FormRow,
  Chips, and a shared BottomSheet with the lifted-input host and fixed Save.
- Existing icons are selected from the bundled category icon set. Cap entry is
  optional positive integer centavos. Names are unique without case sensitivity.
- Protected Other stays present on app start and after the dev seed tool runs;
  it cannot be renamed to something else or deleted. Deleting a used category
  requires selecting a destination and confirming the move. Rules move too.

## Device verification

Final checks will cover Android/iOS native pickers, lifted fields/keyboard,
safe areas, notifications excluded from this run, and light/dark contrast.

## UI repair and Expo patches — 2026-10-02

Implemented repairs from the four supplied phone screenshots. Restored shared
pressable card geometry, reset Quick Add scroll position when changing forms,
and docked lifted inputs using the native modal's measured viewport. Save stays
visible and invalid submissions reveal the form errors. Fixed Today to use the
current time and removed duplicate bottom safe-area spacing from Day view.

The same NativeWind style callback problem affected Month, Agenda, and shared
empty-state buttons; those controls now use static styles with pressed classes.
The UI checker rejects this pattern to prevent recurrence.

Installed Expo 57.0.26, Constants 57.0.20, Linking 57.0.11, Router 57.0.24.
Checks passed: TypeScript, UI rules, verify-ui-repairs.ts with isolated SQLite,
existing keyboard/Save/day-layout scripts, Expo dependency check, Android bundle
export. Native phone verification remains pending; ADB found no connected device.

See [UI repair verification](ui-repair-verification.md) for screenshot findings,
visual judgments, and the phone checklist. Original Stitch comparisons remain
blocked because `.stitch-reference/` and its design-system file are absent.
