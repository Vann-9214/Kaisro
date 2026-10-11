# PROJECT.MD implementation comparison

Checked on 2026-10-11 against the committed project document and current source.
Checkpoint: `28a152c` on `kaisro-build`. Nothing was pushed.

The app does **not** yet implement the entire project document. PROJECT.MD is
the target architecture and roadmap, including MVP, V1.5, V2.0, and iceboxed
features. A completed build step is not proof that every feature in that module
is finished. Existing instructions still exclude phases 5 and 6 (native dev
build and notifications) and require local references for visual implementation.

## MVP comparison

| Requirement | Current implementation | Remaining work or decision |
| --- | --- | --- |
| Private local mobile planner | Expo/TypeScript, Router, Zustand, NativeWind, React Hook Form, SQLite/Drizzle; no account or backend implementation | Keep Android/iOS only; no cloud or analytics feature needed. |
| Combined day view | Events, tasks, and spending on a timeline; overlap columns; collapsible all-day/untimed section | No explicit busy-day collapse policy for 10+ timed items. Calendar shows tasks on their original due day; Tasks Today additionally carries unfinished overdue work. |
| Calendar views | Day, Week, Month, Agenda; custom day timeline and week cards, react-native-calendars month grid | Week is a card overview rather than the proposed draggable timeline. Dragging is a later release. |
| Event management | Create/edit/delete, all-day and multi-day, location, daily/weekly/monthly/yearly recurrence | No duplicate action, event color categories, dedicated notes field, or multiple reminders. Schema stores one reminder offset. |
| Recurring event scope | Expansion preserves local wall-clock fields; current edits update the underlying event, deletion confirms removal of all repeats | Missing this occurrence / this and future / entire series choices and occurrence exceptions. DST behavior still needs timezone-specific coverage and phone checks. |
| Cross-month multi-day events | Day/month queries include spanning non-recurring events; month indicators cover visible grid dates | No claim of full recurring multi-day edge-case coverage or pixel comparison. |
| Tasks and Today | Due date/time, Low/Medium/High, subtasks, completion, Today/Upcoming/All | No task recurrence or task lists. Today aggregates all existing tasks because list membership is not modeled. |
| Task edge cases | Explicit parent completion independent of subtasks; overdue grouping in Today; stable due-time then priority sorting | No manual task reordering or recurring-task generation policy. |
| Notes | Searchable list, title/body editing, debounced autosave, delete, quick-add note form | Basic notes exist (steps 3a/3b); formatting, pin/favorite, tagging and linking UI are missing. Schema tables for tags/links alone do not provide those features. Quick-capture interruption needs device verification. |
| Note links and deletion | Multiple link rows are possible; task/transaction/note deletion cleans matching links | This pass also cleans event links atomically while preserving notes and unrelated links. Target IDs have no polymorphic foreign-key enforcement; linking workflow remains unfinished. |
| Budget and caps | Income/expense entries, custom categories, monthly totals, category breakdown and progress; integer centavos and peso formatting | Alert UI (2d) is blocked by its missing screenshot; notification delivery remains deferred. Future-dated entries count in their assigned month immediately. |
| Category deletion | Protected Other category; used categories require choosing a destination; transactions and rules move together | PROJECT.MD describes automatic uncategorized reassignment. Current explicit destination policy is an existing build judgment, not an exact match. |
| Transaction edits | Save triggers shared refresh; month/day amounts are derived from stored entries | Linked calendar-event UI is absent. |
| Recurring budget | Monthly generation catches up on startup/resume; month-end clamp; cancel keeps past entries; deleted occurrences are not recreated | Daily/weekly/yearly rules are not implemented by the generator. Editing an occurrence changes that entry only; no separate future-rule amount editor exists. Cancellation ends by local day, not an explicit occurrence cutoff. |
| Core notifications | Event/task lead-time preferences are stored | No Notifee dependency, scheduling, cancellation/rescheduling, digest, delivery settings, Doze guidance, or budget notifications. Explicitly deferred phases 5/6. |

## Later releases and architecture choices

| Roadmap item | Current state |
| --- | --- |
| V1.5 Android persistent tasks notification | Not implemented; requires deferred native notification work. |
| V1.5 escalating reminders | Not implemented; stop/snooze behavior undecided. |
| V1.5 drag-to-reschedule/resize | Not implemented; occurrence scope and minimum duration need design. |
| V2.0 Live Activity, note images, CSV/multiple wallets, widgets, .ics interop | Not implemented; keep as future work, not current-build acceptance criteria. |
| Iceboxed Google two-way sync and cloud backup | Absent, consistent with the document. |
| Budget charts | Existing shared progress bars provide breakdowns; neither suggested chart package is installed. Adding a package alone would not improve current functionality. |
| Custom native dev client/EAS | Deferred; current work does not install Notifee or start a native build. |
| Light palette and typography | Existing semantic tokens provide the six project swatches; Inter is installed. No new colors or visual components added in this pass. |
| Dark palette | Disabled placeholders currently fall back to light; phase 7 remains blocked. |
| Privacy/retention | SQLite stays in the app sandbox; app-data clear removes local records; no export or recovery feature is implemented. Uninstall/restore behavior depends on OS backup policy and needs a native configuration/device audit before claiming a guarantee. |

## Changes and verification

This pass preserves PROJECT.MD unchanged, checkpoints the pending app work,
fixes event-deletion unlinking, and uses the local date for Calendar Today so
undated tasks do not disappear during Manila's early-morning UTC date mismatch.
README now accurately describes manual development seeding and links this report.

`verify-project-alignment.ts` uses migrated in-memory SQLite and checks event
deletion, note preservation, unrelated same-ID task links, repeated deletion,
and the UTC+8 midnight date boundary. Existing verification scripts cover the
implemented calendar, task, budget, category, note, empty-state, and input logic.
TypeScript, UI source rules, and all 15 selected verification scripts passed;
the script list is recorded in build-progress.md. These checks do not establish
full roadmap parity or device behavior.

`.stitch-reference/` and its design-system file are absent. Screenshot comparison
and visual mismatch enumeration are blocked; no design source was downloaded.
No UI design judgments were introduced by the two data fixes.

## Phone checklist

- On an empty installation, confirm no sample events/tasks/spending/notes appear;
  default categories may appear. Exercise developer Load sample data / Clear all data
  only on a disposable installation.
- Around midnight in Manila, confirm Calendar Today includes undated tasks and
  matches the selected local date; confirm Tasks Today still displays overdue work.
- Create, edit, and delete an event; check all four calendar views. Recurring
  deletion currently removes all repeats, with confirmation.
- Switch quick-add tabs, type using the lifted bar, use Done/Next, and confirm
  Save remains accessible above the safe area. Check Android Back and iOS pickers.
- Complete a subtask and parent independently; edit an expense's date and confirm
  calendar/day/month totals refresh. Verify notes autosave when leaving the editor.
- Treat notification delivery, linking UI, dark mode, and later-release features
  as unavailable until implemented and verified.
