# Kaisro build progress

Branch: `kaisro-build`. Never push or change main. Current run: 1b, 2a, 2b, 2c,
2d, 3a, 3b, 4, 7. The later feature-completion request also authorizes native
setup/notifications (5/6); earlier exclusions below are historical.

## Status

### Modern UI, 3D Tactile Affordance & TopBar Overhaul - 2026-10-20

Comprehensive mobile UI overhaul guided by `ui-ux-pro-max` and `make-interfaces-feel-better`:
1. **TopBar Elevation & Branding**:
   - `TopBar.tsx`: Replaced flat text with a tactile 3D brand badge `[K]` in primary blue with layered elevation, semibold `Kaisro` title, and a 3D tactile feature capsule pill with semantic micro-icon (`CalendarDays`, `CheckSquare2`, `Wallet`, `FileText`, `Sliders`) and border rim.
   - Added a live date pill (`[• Oct 20]`) in the right slot when no custom rightAction is provided.
   - Added clean bottom separator border for crisp header structure.
2. **Tactile 3D Affordance Across Components**:
   - `Card.tsx` and `FormCard.tsx`: Added physical keycap bottom rim (`borderBottomWidth: 2.5`), multi-stop elevation shadows (`elevation: 3`), and spring scale compression.
   - `Button.tsx`: Added 3D tactile keycap rim (`borderBottomWidth: 3`) and elevation shadow on primary, tasks, money, and secondary buttons.
   - `FloatingAddButton.tsx`: Added 3D keycap float rim (`borderBottomWidth: 3.5`), rotation spring, and deep elevation shadow.
   - `SegmentedControl.tsx`: Added 3D sliding keycap pill (`borderBottomWidth: 2`, `elevation: 2`) and track bottom rim.
   - `CategoryIcon.tsx`: Wrapped category icons in an embossed 3D squircle badge (`borderBottomWidth: 2.5`, elevation).
   - `Chip.tsx`: Added 3D pill rim (`borderBottomWidth: 2`, `elevation: 1`) and tactile spring compression.
   - `budget.tsx` & `tasks.tsx`: Upgraded hero stat breakdown cards with 3D keycap rims and elevation.
3. **Modern Fluid Navigation**:
   - `TabBar.tsx`: Modern floating pill dock with active tab pill highlight (`bg-surface`, crisp border, subtle elevation), `Inter_600SemiBold` typography, and active indicator dot.
4. **Delight & Animations**:
   - `EmptyState.tsx`: Added fade-in and spring slide-up entrance animation.
   - Strict adherence to 44dp touch targets, semantic theme tokens, and non-blocking layout rules.
5. **Expo SDK Dependencies**:
   - Updated `expo` (~57.0.30), `expo-constants` (~57.0.22), `expo-dev-client` (~57.0.20), `expo-linking` (~57.0.13), and `expo-router` (~57.0.28).

TypeScript (`tsc --noEmit`), `check:ui`, and all verification test scripts pass.


### Integrated feature completion - 2026-10-11

Added tagged/formatted/pinned/favorite notes and validated links with navigation;
task lists/manual ordering; all-frequency recurring budget entries, future-price
editing, cancellation and threshold alerts; persisted theme/notification settings;
Notifee scheduling/actions/digests/escalation and optional Android task status;
development-client/native configuration. See project-alignment.md for policies
and operational limits. Simple shared controls are authorized despite missing
Stitch images; no design sources were fetched.

Generated migrations 0002-0004. Production-dialect upgrade transaction tests
confirm amounts, repeat associations and notes survive. Foreign keys are disabled
before the migration transaction and restored afterward; one migration promise
protects simultaneous startup/background initialization. Stale notification
actions preserve replacement triggers. Reactivating repeat spending rules keeps
the current-month future scheduled date.

Data/migrations committed as `d030722` after checks passed. The actual database
initialization test also confirms shared concurrent upgrades, cached success,
constraint restoration on failure and safe retry.

TypeScript and UI rules pass. Feature/regression scripts cover upgrade
preservation; events/tasks/notes/budget CRUD; task lists; recurrence/DST;
notification planning and actual service with a fake native driver; week/agenda/
month calendar data; Save footer; lifted input; and empty/clear behavior.
No tests use real app data. Android prebuild, Metro/Hermes export and native
Gradle `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a` passed. The Windows
path-limit failure was corrected using shorter CMake staging and object-path
hashing. Development APK: artifacts/kaisro-development.apk (arm64, requires Metro
via `npx expo start --dev-client`). No cloud build or installation was attempted.

Phone checklist (development build, disposable test data):

1. Fresh install stays empty; dev Settings sample/clear tools still work.
2. Event This/Future/All edits/deletes, duplicate metadata, multi-day boundaries,
   multiple reminders and 09:00 repeats through daylight-saving transitions.
3. Task lists/cross-list Today, reorder, early completion, undo/recomplete,
   reset subtasks and month-end repeat anchors.
4. Notes autosave on app switch/back, tags, formatting, pin/favorite, links/opening
   targets and deleting targets while keeping notes.
5. Budget centavos, all frequencies, future price, cancel/resume, used-category
   deletion and near/reached/over-cap alerts.
6. System/Light/Dark on every tab and open drafts; keyboard Next/Done, fixed Save,
   large fonts and safe areas in longer forms.
7. Notification grant/deny, rescheduling/stale actions, Done/Snooze/dismiss,
   digest day boundary, quiet task count/Stop, exact-time permission, battery
   restrictions and kill/reopen behavior.

ADB has no connected device; iOS cannot be compiled on this Windows host.
Device checks remain pending; automated checks do not establish zero bugs.

### Feature completion run - Events and tasks - 2026-10-11

The latest user request authorizes all gaps listed in the prior response,
including notifications/native setup and dark mode, with simple shared UI instead
of blocking production on missing Stitch references. V2/icebox features remain
outside this run. Branch remains kaisro-build; never push.

Generated migration 0001 through Drizzle. Added event notes/color/multiple reminder
storage, recurrence exclusions and end dates, plus task recurrence and a unique
generation source. Existing data is preserved. Event form exposes This/Future/All
scope, duplication, notes, semantic color choices and additional reminders.
Multi-day recurring events now expand across their tail dates in every calendar
data path. Task completion generates one next task with reset subtasks and an
anchored date; reopening keeps that next task, and recompletion cannot duplicate it.

Checks passed: TypeScript, UI source rules, verify-event-task-features.ts using
migrated in-memory SQLite. Stitch screenshots/design-system remain absent;
simple shared controls are the user-authorized visual judgment. Phone checklist:
exercise all recurrence scopes, duplicate metadata, multi-day month boundaries,
month-end tasks, and Save/typing with the longer forms. Native checks pending.

### Project document alignment - 2026-10-11

Committed the new PROJECT.MD and pending app work as `28a152c` on kaisro-build.
Compared source against the complete roadmap; see [project-alignment.md](project-alignment.md).
The app is partially implemented, not feature-complete against PROJECT.MD.
Existing basic notes (3a/3b) are present; tagging/linking/formatting/pinning are not.
Notifications and native dev builds remain excluded; missing local references
still block visual work for 2d, 4, and 7 and calendar/task form extensions.

Fixed event deletion to remove matching event note links atomically while keeping
notes and unrelated links. Calendar Today now uses the local date instead of UTC,
preserving undated-task visibility during Manila's midnight boundary. README's
automatic-seeding claim was corrected. No app data or schema was changed.

Validation passed: `npx.cmd tsc --noEmit`, UI source rules, and 15 verification
scripts: event CRUD, week data, lifted bar, Save-footer architecture, UI repairs,
project alignment, task CRUD/list, budget, transactions, categories, notes,
empty/clear, month dots, and day view. Database checks used only isolated SQLite.
These are logic/source checks, not device or pixel verification. Phone checklist
is in project-alignment.md; visual comparison is blocked by absent references.


Event reminder Done-only typing (2026-10-06): Hours and Minutes lifted inputs
both use Done, as requested; Hours no longer advances to Minutes. TypeScript
passed. Phone check: tap either number and confirm Done dismisses its keyboard.

Quick-add remaining space distribution (2026-10-06): the Event, Task, and Expense
root sections now fill the available scroll body and distribute spare height
between sections. Reminder, Subtasks, and Repeats monthly finish near the Save
footer rather than leaving all unused space below the final card. Individual
cards retain their compact natural heights; shared card gap is the minimum.
The shared SheetSection option is opt-in and does not affect nested sections.
Modal height remains 80%; keyboard geometry, footer, and data logic are unchanged.

TypeScript, UI rules, and Save-footer checks passed. Distribution is a visual
judgment based on the user's request because local references remain missing.
No device is connected. Phone checklist: switch Event/Task/Expense and confirm
the lower blank area is distributed between rows without oversized cards; turn
reminders on/off and add/remove a subtask, then verify typing and Save.

Event reminder hint removal (2026-10-06): removed the visible Tap to type hints
from Hours and Minutes at the user's request. Numbers remain tappable and +/-
controls remain available. No logic changed. TypeScript passed. Phone check:
open Custom time and confirm no hints appear beneath either number. Local
Stitch comparison remains blocked by missing references.

Event reminder typed numbers (2026-10-06): Hours and Minutes readouts now use
the existing LiftedField and are tappable, with Tap to type hints. Preserved
the large centered numbers and +/- controls. Typing uses the existing lifted
input host within Reminder Time, with Hours Next -> Minutes Done and no
auto-focus on modal open. Drafts permit clearing/replacing numbers; valid
whole hours and minutes 0–59 update the saved duration. Invalid drafts disable
modal Done and show guidance; +/- restores valid readouts. Selecting a preset
resets both drafts. Default remains 30 minutes and the short preset is 10.
TypeScript, UI checks, and the extended in-memory SQLite script passed, covering
typed conversion, blank/negative/fractional/out-of-range values, and persistence.
Local design comparisons remain blocked by missing references. Phone checklist:
Custom time > tap Hours, type 1, Next, type 30, keyboard Done, modal Done,
Save, reopen; check +/- afterward and confirm minutes 60 disables modal Done.

Quick-add 80% height (2026-10-06): increased the constant sheet height from 70%
to 80% per the user's latest request. Reduced the space below the tabs and the
body's bottom padding using the existing small spacing token. Task cards/date
fields now use the existing compact option, matching Event and Expense. Card
gaps, touch targets, and the fixed Save footer remain. Disabled Android overscroll
stretch/glow. No card stretching or tab-dependent modal sizing was reintroduced.
TypeScript, UI rules, and Save-footer checks passed. No database logic changed.

The standard forms have more room and smaller Task cards; actual fit still needs
a phone check because no device is connected and Stitch references are missing.
Scroll fallback remains for arbitrarily many subtasks, large accessibility text,
validation errors, and expanded iOS pickers so controls cannot become unreachable.
Phone checklist: reopen +; confirm 80% height, standard Event/Expense/Task fields
visible without scrolling, fixed Save, stable tab switching, and keyboard opening.

Balanced quick-add height (2026-10-06): per the user's latest correction, Quick
Add now uses 70% of the measured modal height for Event, Task, and Expense.
Removed the form/card growth added by the earlier fill request. Event and Expense
cards keep their compact natural heights and shared gaps. All tabs use the same
compact header, so switching tabs cannot change the sheet or header height.
The fixed Save footer, opaque bottom coverage, and keyboard-stable bounds remain.
This supersedes the earlier instruction to expand/fill the sheet. Scrolling
remains available when fields exceed the smaller body, especially with large text.
No persistence, recurrence, or unrelated screen code changed.

TypeScript, UI rules, Save-footer checks, and an isolated 70%-height rendering
regression passed (native/app height mismatch, tab switch, keyboard resize, bottom
coverage). No phone is connected and local Stitch references remain missing.
Phone checklist: reopen +; confirm about 70% height, normal card sizes, unchanged
modal/header height across Event/Task/Expense, and no bottom gap while typing.

Event reminder duration controls (2026-10-06): supersedes the custom textbox
implementations below. Custom time expands within Reminder Time with separate
Hours and Minutes cards, numeric readouts, and accessible +/- controls. No
textbox or keyboard is involved. Minutes range from 0 to 59; hours can span
multiple days, preserving saved offsets. A live label previews the exact lead
time; modal Done applies it. Presets are at start, 10 minutes, 30 minutes,
1 hour, and 1 day; default remains 30 minutes. Reused FormCard/FormCardRow and
SheetSection spacing and semantic colors. Removed the modal lifted-input host.
TypeScript, UI checks, and the updated Event verification script passed,
including hour/minute adjustments, limits, labels, and storing/disabling the
custom duration in isolated in-memory SQLite. Local reference images remain
missing, so visual comparison is blocked; the +/- control layout is a judgment
call. Phone checklist: open Reminder, confirm 10 minutes replaces 5 minutes;
choose Custom time and adjust both controls without a keyboard; set 1 hour
30 minutes, Done, Save, reopen and confirm it persists; check zero and scrolling.

Modal gap and continued typing-shift correction (2026-10-06): the user reports
that the prior window snapshot still shifted and exposed the underlying tabs.
That earlier mock checked matching app/modal heights and did not establish a
device fix. BottomSheet now measures its native modal root, anchors content to
the measured opening bounds, and extends an opaque surface to the actual bottom.
Its content receives captured safe-area insets so keyboard changes cannot reflow
the footer; the lifted host remains outside that scope with live measurements.
Only BottomSheet runtime code changed; unrelated pending work was preserved.

TypeScript, UI rules, and existing keyboard docking/navigation checks passed.
An isolated render regression now covers app/native height mismatches in both
directions, three keyboard heights, bottom-inset changes, dismissal, reopening,
and opaque bottom coverage. ADB reports no device; these checks do not prove
phone appearance. Stitch references remain absent. Phone checklist: reopen + >
Event; confirm no tabs show below Save, type in title/location, Done/Android Back,
and repeat in Expense. Confirm the sheet top, cards, and footer do not reflow.

Quick-add keyboard stability (2026-10-06): BottomSheet now captures its opening
height and top inset and uses a fixed frame anchored at the modal's top. Android
keyboard resizing no longer bottom-aligns the form to the shortened viewport or
compresses its cards. A width change or reopening refreshes the captured bounds.
The existing lifted overlay remains a separate sibling with live keyboard bounds.
Only BottomSheet runtime code changed in this follow-up; other pending work was
preserved. No database logic changed.

Checks passed: TypeScript, UI rules, existing lifted-bar docking/Next/Done script,
and an isolated rendering regression against the actual BottomSheet component
with mocked native dimensions (keyboard resize/dismissal, width change, reopen,
expanded/default height, and overlay placement). This is not device verification.
Local Stitch references remain unavailable. Phone checklist: open +, tap Event
title/location and Expense amount/description, type, Next/Done, and dismiss with
Android Back; confirm the underlying sheet keeps its size and position and the
typing bar stays above the keyboard. Save and reopen to confirm entered text.

Event All day default (2026-10-06): new Add Event forms open with All day enabled.
Editing preserves the event's saved All day setting, including timed events.
TypeScript and existing Event CRUD checks with isolated in-memory SQLite passed.
Local Stitch comparison remains blocked by absent references (see BLOCKERS.md).
Phone checklist: open Add Event and confirm All day is on; turn it off to enter
times; reopen Add Event to confirm it defaults on again; edit a timed event and
confirm All day stays off.

Quick-add fill and notification-shade follow-up (2026-10-06): Event and Expense
form cards now grow into the remaining sheet body while retaining shared card
gaps and the fixed Save footer. Android restores the existing hidden navigation
bar setting on focus return and foreground resume. BottomSheet renders beneath
both system bars and no longer restarts its entrance animation on window-height
changes. Only the affected forms, sheet shell, and system-bar lifecycle were
changed; other pending work was preserved.

TypeScript, UI source rules, Save-footer architecture, and diff whitespace checks
passed. ADB reports no connected phone. Local Stitch screenshots/design system
remain absent, so card growth is a judgment based on the user's request.
Phone checklist: inspect + > Event and Expense for unused space, type and save,
then open/close the notification shade on Calendar and with each sheet open;
confirm the layout returns to its prior size without a sheet entrance replay.

Event custom reminder modal correction (2026-10-06): Custom time now expands
inside Reminder Time, with its minutes field and Done button in that modal.
Removed the extra custom field card from the main event sheet. The modal owns
an instance of the existing lifted-input provider/host so keyboard input stays
above the same native modal, with no auto-focus. Closing validates the minutes;
invalid input keeps the modal open and displays the field error. Presets still
select and close immediately. Added scrolling and safe-area clearance.
TypeScript, UI rules, Event CRUD/custom-offset checks in in-memory SQLite, and
diff whitespace checks passed. Visual comparison remains blocked by missing
local references. Phone checklist: Reminder > Custom time stays in the modal;
tap the minutes field, enter 90, keyboard Done, modal Done; verify the reminder
summary and save/reopen. Check invalid input and small-screen scrolling.

Event and Expense quick-add layout (2026-10-06): these tabs open at the available
safe-area height, use a compact header and cards, and retain the fixed Save footer
and existing lifted inputs. Expense category chips now open in a separate picker,
so custom categories do not lengthen the main form. Event title/location helper
lines were removed; monthly-repeat help was shortened. Scroll fallback remains for
small displays, validation errors, custom reminders, and expanded iOS date pickers.
Other in-progress changes were preserved. No database behavior changed.

Validation: TypeScript, UI source rules, and existing quick-add Save architecture
checks passed. Local design comparison is blocked and ADB reports no connected
device. Phone checklist: open + > Event and Expense; confirm the default fields
and Save fit, select a category, type via the lifted bar, use date/time pickers,
and check an edit form and larger text size.

Event reminder controls (2026-10-06): new events default to 30 minutes before.
Removed the 10/15-minute presets; retained at start, 5 minutes, 30 minutes,
1 hour, and 1 day. Custom time opens a minutes-before field in the existing
sheet, using LiftedField without auto-focus and the existing Save footer.
Accepts nonnegative whole minutes; invalid input blocks Save. Custom labels
preserve exact days/hours/minutes. Editing retains saved offsets, including
legacy 10/15-minute values as custom. Turning reminders off stores null.
TypeScript, UI rules, and extended Event CRUD verification passed, including
custom parsing, exact labels, and persistence/disabling in temporary in-memory
SQLite. Notifications remain deferred. Missing local Stitch references block
visual comparison; reusing the form card and adding Custom time are judgment
calls. Phone checklist: confirm the 30-minute default and removed presets;
choose Custom time, tap the field, enter 90, Done, Save, and reopen; try blank
input and confirm Save validation; switch Reminder off and confirm Save works.

Event quick-add field order (2026-10-06): Event title appears first, with Add
location directly below it and a persistent muted Optional hint. The location
input and accessibility label also identify it as optional. Reused FormCard
spacing and the existing lifted fields; the shared edit form uses the same order.
TypeScript, UI rules, and existing Event CRUD verification using in-memory SQLite
passed. No database logic changed. Local Stitch comparison is blocked by missing
references. Phone checklist: open + > Event, confirm title/location order and
Optional hint; enter a location and confirm the hint remains; save another event
without a location.

Calendar month-relative week labels (2026-10-06): Week cards now show "1st week",
"2nd week", etc.; the compact overview shows "1st", "2nd", etc. Labels reset for
each viewed month. The partial week containing the 1st counts as its first week;
months can have four, five, or six weeks. Existing layout and theme are retained.
TypeScript and verify-week-view-data.ts passed, including month/year boundaries
and isolated in-memory SQLite checks. Stitch comparison is blocked by missing
local references. Phone checklist: open Calendar > Week, check both label sets,
then change months and confirm numbering restarts at 1st.

Calendar empty-state copy follow-up (2026-10-06): removed the supporting subtext
from Week and Month as requested, retaining existing titles, icons, and actions.
`npx.cmd tsc --noEmit` passed. No database logic changed. Local Stitch comparison
remains blocked by missing references. Phone check: open empty Week and Month
views and confirm the banners have no supporting subtext.

| Step | Status | Verification / commit |
| --- | --- | --- |
| 1a | Done; phone check passed | `eb33758` baseline |
| 1b | Done with judgment calls | tsc + verify-task-crud.ts + verify-tasks-list.ts; `9237bf0` |
| 2a | Done with judgment calls | tsc + verify-budget.ts; `8b2a233` |
| 2b | Done with judgment calls | tsc + verify-transactions.ts; `2234aa0` |
| 2c | Done with judgment calls | tsc + verify-categories.ts; `bd6c6ed` |
| 2d | Blocked | Local alert screenshot missing; see BLOCKERS.md |
| 3a | Done per user instruction | tsc + check-ui + verify-note-experience.ts; Samsung Notes-style list with search |
| 3b | Done per user instruction | tsc + check-ui + verify-note-experience.ts; full-screen note editor with auto-save |
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

## Event typing and Android bundle follow-up — 2026-10-02

The Event lifted input now shows Done without the duplicate Save Event button.
It clears the keyboard by 8 dp. Save Event remains in the sheet footer for use
after Done. This follows the user's latest instruction for Event input and is
an explicit exception to the earlier keyboard-visible Save convention.

The Expo Router bundle reported a missing `expo-glass-effect`. Added Expo's
SDK-compatible `expo-glass-effect` 57.0.4 as a direct dependency. A clean-cache
Android export succeeds, and TypeScript, UI rules, the isolated SQLite script,
the Quick Add button check, and `expo install --check` all pass. A running Metro
server must be restarted with a cleared cache to load the new dependency.

## Event render loop, picker callbacks, and Android system buttons — 2026-10-02

Fixed the Event title render loop: lifted field registration only updates the
field registry. Typing calls the latest registered callback and updates the
visible input value once. Inline Event callbacks can change between renders
without retriggering registration state updates.

Replaced deprecated DateTimePicker `onChange` callbacks with `onValueChange`
and `onDismiss` in EventForm and the shared task/expense DateTimeField. Date
selection, time selection, and dismissal preserve their prior behavior.

Added Expo NavigationBar 57.0.3. Android hides the system navigation buttons
while Kaisro is open and restores them on unmount; the native module allows a
temporary swipe reveal. iOS does not run this control. Expo SDK 57 includes
the module in Expo Go. Actual button and keyboard behavior needs a phone check.

Checks passed: `tsc --noEmit`, UI rules, Expo dependency check, isolated SQLite
UI and Event CRUD scripts, and a clean Android export (4,147 modules). No device
was connected for runtime verification. See the phone checklist in
`ui-repair-verification.md`.
# Calendar Day empty-state copy — 2026-10-06

Removed the truncated supporting sentence from the empty Calendar Day banner
at the user's request. Visual judgment: retain the existing title, clock icon,
and Add an event action, with no replacement sentence. Local Stitch comparison
is blocked by missing reference files (see BLOCKERS.md).

Validation: `npx.cmd tsc --noEmit` passed. This copy-only change does not alter
database logic.

Phone checklist: open Calendar > Day on an empty date; confirm the banner shows
Nothing planned today and Add an event without the supporting sentence.

## Expo updates and startup navigation error — 2026-10-12

Updated Expo to 57.0.27 and the recommended Constants, Linking, Router, and
SQLite patch versions. Expo dependency check passes.

Fixed the root loading-to-ready transition: the NativeWind theme-variable
provider now exists from the first render, including loading, initialization
failure, and retry. Adding it only after loading triggered NativeWind's upgrade
diagnostic, which recursively read React Navigation's throwing context getters
and produced the reported NavigationContainer error.

Validation: TypeScript passes. `node scripts/verify-root-startup.cjs` reproduces
the original error using the installed NativeWind diagnostic and checks the
actual root layout with mocked startup hooks across loading, error, retry, and
ready states. It never opens a database. Existing screen layout is retained;
this startup fix makes no new visual design decisions.

Phone checklist: restart with `npx.cmd expo start --go --clear`, scan the new
QR code, confirm loading reaches Calendar, switch tabs, and open Quick Add.
Physical-device confirmation remains pending.


## UI/UX enhancements and animation polish — 2026-10-20

Implemented all 5 high-impact UI/UX improvements identified in the UI audit:
1. Quick-Add Note Continuity: Note creation is unified inside QuickAddBottomSheet using NoteForm, with an "Open in full editor ↗" link, avoiding jarring modal dismissal.
2. Tasks Reordering Ergonomics & Checkbox/Progress Animations: Removed bloated in-card chips in favor of right-gutter vertical steppers; added tactile spring scale feedback to Checkbox and smooth width animation to ProgressBar.
3. Financial Deficit & Balance Contrast: Enhanced budget remaining typography and added explicit colors.error deficit alert pills when expenses exceed income; dynamic error module for category progress bars exceeding cap.
4. Shell Navigation Hygiene: FloatingAddButton now smoothly animates out on the Settings screen via spring scaling/fading; standardized TopBar back navigation to top-left on Detail and Categories screens.
5. Interactive Tag Cloud & Subtask Guidance: Note editor tags upgraded to interactive Chip cloud with quick delete and Enter-to-add; TaskForm subtasks feature item count summary and clear empty guidance.
6. SegmentedControl spring animation: Fluid sliding background indicator using native spring physics across all tab switchers.

Validation: `npm run check-types` passed, `npm run check:ui` passed, and verification test scripts (`verify-quickadd-save-button.ts`, `verify-note-experience.ts`, `verify-budget-features.ts`) passed.

Phone checklist:
1. Open Quick Add (+), tap "Note", and verify it displays the note creation form within the sheet with title, body, and tag fields. Tap "Open in full editor ↗" and confirm navigation.
2. In Tasks, tap "Reorder" and verify clean vertical steppers appear on the right side of each card without distorting card heights. Tap checkboxes to confirm spring pop animation.
3. In Budget, inspect the remaining balance; verify high-contrast text and error signaling if expenses exceed income. Inspect category progress bars when approaching or exceeding caps.
4. Switch to the Settings tab; confirm the floating "+" button smoothly animates out and disappears. Open Detail or Categories and confirm the Back arrow is on the top-left of the TopBar.
5. Open Note editor, add tags, and verify they render as interactive chips with "×" removal. In Task Form, inspect subtask count and creation flow.
6. Toggle segmented controls in Tasks, Budget, and Settings; verify smooth sliding pill animation.
