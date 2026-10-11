# PROJECT.MD implementation comparison

Updated 2026-10-11 on `kaisro-build`. PROJECT.MD is preserved unchanged.
The user's feature-completion request supersedes the earlier deferral of native
notifications and allows simple shared controls despite missing design images.
Nothing is pushed.

## Implemented in this run

| Area | Current behavior |
| --- | --- |
| Calendar/events | Day, Week, Month and Agenda; create/edit/delete/duplicate; all-day/multi-day; location, notes, semantic colors, multiple reminder offsets; This/Future/All recurrence scopes and detached exceptions; recurring multi-day tails across month boundaries; busy-day Agenda shortcut. |
| Tasks | Dates/times, priorities, independent parent completion, subtasks, daily/weekly/monthly/yearly recurrence, named lists, cross-list Today and manual order within time groups. Default sort uses due date then priority; explicit order wins within each group. |
| Notes | Autosave with flush on background/navigation, explicit Save, tags and tag-aware search, pin/favorite, basic bold/italic/heading/list formatting and preview, links to events/tasks/entries and navigation to linked items. Target deletion preserves note content. |
| Budget | Centavos/peso formatting, categories/caps, threshold display, calendar-event/note links, all four repeat frequencies, future-rule price edits and cancellation preserving history. Used category deletion moves entries/rules to protected Other by default. |
| Preferences/theme | Persisted System/Light/Dark selection, semantic dark palette, reminder/digest/budget settings and optional Android task status/escalation. Theme changes preserve drafts. |
| Notifications | Notifee event/task triggers, cancellation/replacement after edits, Done/Snooze actions, bounded escalation, daily digests, staged budget alerts, exact-time/battery settings links, optional quiet Android foreground task count, Expo Go fallback. |
| Native setup | Development client, Android/iOS identifiers, local notification plugin, EAS development/preview profiles, Android backup disabled, native notification icon and Windows CMake path support. Build evidence lives in build-progress.md. |
| Data safety | Generated Drizzle migrations; upgrade tests preserve amounts, repeat links and notes; shared migration promise prevents simultaneous startup/background upgrades. Fresh startup stays empty; sample/clear remain dev-only. |

## Defined edge-case policies

- Completing a repeating task generates its next dated instance immediately,
  preserving its list and resetting subtasks. Undo/recomplete keeps that next
  instance. Subtasks require explicit parent completion. Today carries unfinished
  overdue and undated work from every list.
- Event duplicates copy reminders/color/note content and reset exceptions.
  Detached occurrences stay independent when the remaining series is edited.
  Future splits transfer children using their original occurrence dates.
- A budget edit changes the selected entry; Update future entries also changes
  its rule. Other logged entries preserve their values. Cancellation stops future
  generation; deleted entries do not rewind the cursor. Reactivation resumes the
  anchored schedule, including the current month's future date. Generation
  catches up on open/resume or while the optional Android task service runs.
- Escalation stops after three reminders (15/30/60 minutes after due time) or at
  due-day midnight. Snooze pauses for 15 minutes; dismissal suppresses that due
  date until rescheduled. Stale actions preserve replacement triggers and cannot
  complete rescheduled tasks.
- The Android task notification is opt-in, quiet and has Stop. If the OS kills
  its service, it restarts on the next foreground sync while enabled.

## Remaining limits and future roadmap

Automated checks do not establish bug-free phone behavior. ADB has no connected
device. iOS compilation requires macOS/EAS and has not been performed here.

Notifications require a development/native build. The earliest 45 triggers are
scheduled, with a 60-day event horizon and seven digest days; opening the app
refreshes these windows. Digest content is a scheduling-time snapshot. Android
permission, exact alarm and battery restrictions can delay delivery. Budget
alerts reconcile on app/service sync, not a guaranteed midnight job.

V1.5 drag-to-reschedule/resize remains unimplemented. V2 Live Activities, note
images, CSV/multiple wallets, widgets and .ics remain future work. Iceboxed Google
sync/cloud backup remains excluded. Full roadmap parity is therefore not claimed.
Charts use shared progress bars. No account, backend or analytics was added.

Local .stitch-reference/ and design-system.md remain absent, so screenshot
comparison is blocked. User-authorized visual judgments use existing controls
and semantic tokens, including the muted navy/teal/sand dark palette. See
[build-progress.md](build-progress.md) for checks and the phone checklist.
