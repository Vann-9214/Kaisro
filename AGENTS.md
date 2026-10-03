# Kaisro

Private, single-user, local-only mobile planner combining events, tasks, and spending on a calendar.
No backend, accounts, or analytics.

## Stack and folder layout

Expo React Native + TypeScript, Expo Router, NativeWind, Zustand, expo-sqlite,
Drizzle ORM, and React Hook Form.

- `app/`: Expo Router layouts, tab screens, and detail routes.
- `src/components/`: Shared UI, calendar views, quick-add forms, and lifted inputs.
- `src/db/`: SQLite connection, Drizzle schema and migrations, categories, and dev seed tools.
- `src/hooks/`: Calendar data hooks, date indicators, and keyboard/scroll helpers.
- `src/store/`: Zustand UI/date context and current-time stores.
- `src/constants/`: Semantic theme, spacing/layout, currency helpers, and default categories.

## Established conventions

- Mobile-only (Android and iOS). Never target, test, or add code for web.
- Use only existing semantic theme tokens: background, surface, surface-raised,
  overlay, text, text-muted, border, primary, tasks, money, on-primary, on-tasks,
  and on-money. Never hardcode hex values.
- Reuse TopBar, EmptyState (inline and full), BottomSheet, SegmentedControl,
  FloatingAddButton, Checkbox, Chip, ProgressBar, and the quick-add sheet shell
  with its Zustand UI store. Do not create duplicates.
- Quick-add must never auto-focus a field on opening. Use the existing lifted
  field pattern: tapping a field opens a small input bar docked directly above
  the keyboard, animated in, with Next/Done chaining. Do not introduce another
  keyboard-avoidance approach.
- Every quick-add tab and edit sheet always shows a fixed, visible Save button
  in the sheet footer above the bottom safe-area inset; the lifted typing bar contains only Next/Done navigation without duplicate Save buttons.
- Follow space-xs 4, space-sm 8, space-md 14, space-lg 20, space-xl 32, and card
  gap 12 via shared SheetSection/FormCard/FormRow components. Do not hand-set spacing.
- Respect safe areas: headers clear the status bar; content clears the tab bar
  and floating + button; sheets and lifted fields clear the keyboard.
- Start and stay empty of sample data. Never add dummy data to screens, hooks,
  or components. Only the existing dev-only Settings Load sample data / Clear
  all data tools may provide sample data; keep those tools working.
- Store and compute money as integer centavos; format with existing peso (₱) helpers.
- Schema changes go through Drizzle migrations (`npm run db:generate`). Never hand-write DDL.
- Selected date/time state lives in exactly one place: the existing Zustand store.
  Never duplicate it per screen or component.
- Open matching local `.stitch-reference/<screen-folder>/screenshot.png` images
  before building; record a blocker if missing or unreadable. Read `.stitch-reference/design-system.md`
  for definitions, reuse existing tokens, and report visual judgment calls.
  HTML is unavailable: do not download designs, use urls.md, or fetch Stitch screen source.
- After each roadmap step, run `npx tsc --noEmit` and fix every error. Write and
  run a small verification script for that step's logic using a temporary test
  database, never real app data. Compare against matching Stitch screens and
  list mismatches. For the current authorized run, continue through 1b, 2a–2d,
  3a–3b, 4, and 7 without stopping. Do not start 5 or 6. Work only on
  `kaisro-build`, never push. Commit each step only after both checks pass.
  If a step cannot be fixed, revert only that step, record docs/BLOCKERS.md,
  and continue independent steps. Update docs/build-progress.md after each step;
  read it after a session reset. Finish with one report and phone checklist.

## Current build status

- Calendar (Day, Week, Month, Agenda): done.
- Tasks 1a: phone check passed. Task forms and completion 1b: implemented.
- Budget 2a–2c: implemented. Budget alert 2d: blocked by missing image.
- Notes, linking, and dark mode: blocked by missing local design references.
- Dev build and notifications: explicitly deferred by the user.
