# Kaisro build progress

Branch: `kaisro-build`. Never push or change main. Current run: 1b, 2a, 2b, 2c,
2d, 3a, 3b, 4, 7. Phases 5 and 6 are explicitly excluded.

## Status

| Step | Status | Verification / commit |
| --- | --- | --- |
| 1a | Done; phone check passed | Baseline preserved on this branch |
| 1b | Done with judgment calls | tsc + verify-task-crud.ts + verify-tasks-list.ts; commit follows |
| 2a–2d | Pending | Budget |
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

## Device verification

Final checks will cover Android/iOS native pickers, lifted fields/keyboard,
safe areas, notifications excluded from this run, and light/dark contrast.
