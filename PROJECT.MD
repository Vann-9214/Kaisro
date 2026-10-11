Kaisro — architecture & tech plan
Tab 1 of 2 — pairs with “Kaisro — Features” for full edge-case detail

1. Overview
   Kaisro is a private, single-user mobile app that puts the calendar at the center of the day: events, tasks, and spending all show up together on the same day view instead of living in separate apps. The core hook isn’t any one module — it’s that the calendar becomes the one screen actually opened every day, plus a notification that stays visible in the notification shade showing what’s left to do, instead of a to-do app that quietly gets ignored after a week.
   This document covers the decisions needed to move from the feature spec into build: tech stack, local data architecture, notification architecture, and the visual system.
2. Feature roadmap (summary)
   Full edge-case detail for each feature lives in the Features tab. This table is a quick-reference index.
   Tier
   Feature
   Description
   Must-have (MVP)
   Combined day view
   Events, tasks due, and spending for the day shown together on one calendar screen.
   Must-have (MVP)
   Calendar core
   Month/week/day/agenda views; event creation, editing, and recurrence.
   Must-have (MVP)
   Daily task management
   Tasks with due dates/times, priorities, subtasks, and a cross-list “Today” view.
   Must-have (MVP)
   Notes with tagging & linking
   Freeform notes that can tag or link to a specific event, task, or budget entry.
   Must-have (MVP)
   Budget tracker & category caps
   Income/expense logging with per-category monthly limits.
   Must-have (MVP)
   Recurring budget transactions
   Auto-logs subscriptions/rent on a schedule.
   Must-have (MVP)
   Core notifications
   Event/task reminders, a daily digest, and budget threshold alerts.
   Should-have (V1.5)
   Persistent “tasks left” notification (Android)
   Ongoing notification in the shade that updates live as tasks are completed.
   Should-have (V1.5)
   Escalating task reminders
   Re-notifies if a due task is ignored, instead of firing once.
   Should-have (V1.5)
   Drag-to-reschedule & resize
   Move or extend events/tasks by touch on the timeline.
   Could-have (V2.0)
   iPhone Live Activity
   Persistent “tasks left” equivalent on Lock Screen / Dynamic Island.
   Could-have (V2.0)
   Note image attachments
   Photos attached to a note.
   Could-have (V2.0)
   CSV export & multiple budget accounts
   Export transactions; track more than one account/wallet.
   Could-have (V2.0)
   Home screen widget
   Today’s agenda visible without opening the app.
   Could-have (V2.0)
   Calendar .ics import/export
   Manual interop with Google Calendar without building full sync.
   Won’t-have (icebox)
   Full Google Calendar two-way sync
   Real OAuth sync — revisit only if a second device becomes necessary.
   Won’t-have (icebox)
   Cloud backup / multi-device sync
   Needs an account system — revisit only if local-only storage becomes a real risk.

3. Recommended tech stack
   Chosen for a fully local, mobile-only, single-user app — no backend, no account system.
   Layer
   Choice
   Why
   Frontend
   Expo (React Native) + TypeScript
   Fast iteration, OTA updates, easy to add native modules later via a custom dev client.
   Local database
   SQLite via expo-sqlite, queried through Drizzle ORM
   Everything lives on-device — no server, no account, works fully offline.
   State & data fetching
   Zustand
   Lightweight, no boilerplate, fine for a single-user local app with no server state to sync.
   Navigation
   Expo Router
   File-based routing, less config than React Navigation directly.
   Calendar UI
   Custom timeline (day/week) + react-native-calendars for month grid
   Drag-to-reschedule and resize need a custom timeline; the month grid doesn’t.
   Notifications
   notifee
   Handles reminders and the daily digest, plus Android’s persistent/ongoing notification.
   Charts (budget)
   victory-native or react-native-svg-charts
   Lightweight category breakdown bars.
   Forms
   React Hook Form
   Cleaner validation for event/task/entry forms.
   Styling
   NativeWind (Tailwind for RN)
   Fast, consistent styling across five modules.
   Build/deploy
   EAS Build (custom dev client, not Expo Go)
   Required once notifee’s native code is added.

If backup or a second device ever becomes a real need, Supabase (Postgres) is the natural next step — but it isn’t needed to ship this. 4. Notification architecture
Everything here runs on-device — there’s no server, so this is app-local scheduling and state, not a push pipeline.
A task, event, or budget entry is created or edited locally in SQLite.
If it has a due time or a reminder, the app schedules a local trigger notification via notifee for that moment — no network call involved.
Whenever a task’s completion state changes, the app recalculates the day’s remaining task count and updates the Android persistent notification’s content in place, without re-triggering a sound or vibration.
A daily local trigger, scheduled each morning, computes the digest — today’s events, top tasks, and spending so far — and fires it as a normal notification.
Whenever a new expense is saved, the app checks its category’s running total against the cap and fires a threshold alert if it’s crossed.
The persistent notification runs through a notifee-managed Android foreground service, which is the one piece requiring the custom EAS dev client instead of Expo Go. 5. Visual design system
Direction: calm and focused rather than playful — this is a daily-use utility, not a game, so legibility and quiet confidence matter more than personality.
Swatch
Hex
Usage
Ink Blue
#3A4A7A
Primary actions, calendar highlights, the “today” indicator
Soft Teal
#6FA8A0
Tasks, checkmarks, completion states
Warm Sand
#E8C99B
Budget accents, spending indicators
Cream
#FAF7F2
App background
Charcoal
#33312E
Body text, instead of pure black
Hairline
#E2DED7
Borders and dividers

Soft Teal doubles as the “done” color across tasks and habits, while Warm Sand is reserved for anything money-related, so a glance at a screen tells you which module you’re looking at before you read a word.
Dark mode: build a genuine dark palette, not an inverted one — a deep navy-charcoal background rather than pure black, with Ink Blue, Soft Teal, and Warm Sand lightened and slightly desaturated so the persistent notification doesn’t glare when checked at night.
Typography: a single clean sans (Inter, or the system font) across headings and body, medium weight for headings and regular for body — dense calendar and budget data reads better with one consistent, highly legible face than with a decorative heading font. 6. Privacy & data policy notes
Everything is local-only, so there’s no cross-user privacy surface — but data still needs a real retention story: define what happens on uninstall or an app-data clear, and consider a manual local export (JSON or CSV) as a safety net.
Budget and task data are sensitive by nature — rely on the OS’s app sandboxing rather than building custom encryption for MVP.
No analytics or telemetry by default — a personal local app shouldn’t be phoning home usage data anywhere.
Once .ics import/export or CSV export ship, decide where exported files go, and note that exported data leaves the app’s private sandbox — the built-in privacy guarantees stop applying at that point.

Kaisro — feature deep dive
Tab 2 of 2 — descriptions and case-by-case scenarios, pairs with “Kaisro — Architecture”

1. Must-have (MVP — launch day)
   Combined day view
   The day view shows events, tasks due that day, and money spent that day together in time order, with an unscheduled-task tray at the top for anything without a set time.
   Edge cases to plan for:
   Task or event overlapping the same time slot — needs a visual stacking/overlap indicator rather than one hiding the other.
   A task dragged from the tray onto a time slot after its due date has already passed — decide if this silently reschedules the due time or shows a confirmation.
   Very busy days (10+ items) — decide a collapse/summary behavior so the view doesn’t become an unreadable wall.
   Deleting a recurring event from the day view — must ask “this event” vs. “this and future occurrences” vs. “all occurrences,” not silently pick one.
   Calendar core (month / week / day / agenda views + event management)
   Standard calendar functionality — create, edit, delete, and duplicate events; all-day and multi-day events; recurring events with per-occurrence editing; location and notes fields; color categories; multiple reminders per event.
   Edge cases to plan for:
   Recurring event edited mid-series — clarify whether it detaches that occurrence into its own event or keeps a link back to the series for future bulk edits.
   Daylight saving transitions — a recurring event’s time should stay “9am local” through a DST shift, not silently shift by an hour.
   Multi-day event spanning a month boundary — must render correctly across both month view pages, not just the first.
   Duplicating an event — decide whether the duplicate copies its reminders and color tag by default or resets them.
   Daily task management & “Today” view
   Tasks with due dates/times, priority levels, subtasks, recurrence, and a cross-list “Today” view showing everything due regardless of which list it’s in.
   Edge cases to plan for:
   Subtask completion — decide whether completing all subtasks auto-completes the parent task, or the parent still needs an explicit check.
   Recurring task completed early — decide if the next occurrence generates immediately or waits until its actual due date.
   Overdue task rollover — decide if it shows on today’s date (so it doesn’t get lost) or stays pinned to its original date with an overdue flag.
   Manual reorder combined with sort-by-priority — clarify which one wins, since they can conflict.
   Notes with tagging & linking
   Freeform notes with basic formatting, tags, pin/favorite, and the ability to link a note to a specific event, task, or budget entry.
   Edge cases to plan for:
   Deleting an event or task that a note is linked to — decide if the note becomes unlinked or is flagged/archived along with it, rather than pointing at nothing.
   A note linked to multiple items — the data model should support more than one link, not just one.
   Quick-capture triggered while mid-edit on another screen — must not lose the note being drafted or the screen the user was on.
   Budget tracker & category caps
   Income/expense logging with custom categories, a monthly overview, category breakdown, and a per-category cap with a progress indicator and threshold alert.
   Edge cases to plan for:
   Editing an expense’s date after it’s logged — its calendar-day total and its month’s category total both need to recompute, not just one.
   Deleting a category that has existing entries — reassign those entries to “uncategorized” rather than orphaning or silently deleting them.
   Logging an expense with a future date — decide if it counts toward the current month’s cap immediately or only once that date arrives.
   Entry linked to a calendar event that later gets deleted — same handling as the notes-linking edge case above, for consistency.
   Core notifications (reminders, daily digest, budget alerts)
   Per-event and per-task reminders with configurable lead time, one daily digest notification summarizing the day, and budget threshold alerts — plus a settings screen to control each type.
   Edge cases to plan for:
   Editing an event’s time after its reminder was already scheduled — the old scheduled notification must be canceled and replaced, not left to fire at the stale time.
   Android battery optimization (Doze mode, or aggressive OEM battery managers) can delay or kill scheduled notifications — worth a one-time in-app prompt guiding the user to whitelist the app.
   Digest fires exactly at the boundary of a task’s due time — decide if that task counts as “due today” so the digest and the Today view never disagree.
   Recurring budget transactions
   Auto-logs a fixed transaction (rent, a subscription) on a repeating schedule instead of manual re-entry every month.
   Edge cases to plan for:
   Amount changes mid-subscription — only future occurrences use the new amount; already-logged past entries keep the price they were created with, so spending history reflects what things actually cost at the time.
   Canceling a recurring transaction — past logged entries stay in history; only future occurrences stop generating.
2. Should-have (V1.5 — first big update)
   Persistent “tasks left” notification (Android)
   An ongoing notification that sits in the notification shade all day and updates its task count live as things are completed, without re-buzzing each time.
   Edge cases to plan for:
   App killed by the OS in the background — the ongoing notification depends on a foreground service staying alive; decide the fallback behavior if the service gets killed.
   User manually swipes the notification away — decide if it reappears automatically next time a task changes, or only at the next day’s reset.
   Aggressive OEM battery managers killing the foreground service — needs the same whitelist prompt as the digest, but this one is meant to be always-on.
   Escalating task reminders
   A task reminder that re-fires at a shorter interval if the task is still incomplete, instead of alerting once and going silent.
   Edge cases to plan for:
   Needs a defined stop condition (e.g. after 3 re-fires, or once the due date fully passes) so it doesn’t nag indefinitely.
   Snoozing a reminder vs. actually dismissing it needs to be a clearly different action, since they should behave differently on the next escalation.
   Drag-to-reschedule & resize
   Move an event or task to a new time by dragging it on the day/week timeline, or resize its duration by dragging its edge.
   Edge cases to plan for:
   Dragging across a day boundary in week view — needs to actually move the item to the new day, not just visually snap back.
   Resizing below a sensible minimum duration — should clamp rather than allow a zero-or-negative-length event.
   Dragging one occurrence of a recurring event — same “this one vs. the series” question as editing, and it should ask the same way both times.
3. Could-have (V2.0 — engagement update)
   iPhone Live Activity
   The iOS equivalent of the persistent Android notification — shows remaining tasks on the Lock Screen and in the Dynamic Island.
   Edge cases to plan for:
   Live Activities expire after roughly 8 hours and need periodic renewal — needs a refresh strategy built in from the start, not bolted on later.
   User dismisses the Live Activity — the app needs to detect that and stop attempting to update it rather than erroring silently.
   Note image attachments
   Attach a photo to a note.
   Edge cases to plan for:
   On-device storage growth with no cloud backup — large photo notes are a real local storage risk; worth compressing images and possibly warning at a storage threshold.
   Deleting a note with an attached image should also clean up the stored file, not leave orphaned images on disk.
   CSV export & multiple budget accounts/wallets
   Export transaction history as CSV, and support tracking more than one account (e.g. cash vs. a card).
   Edge cases to plan for:
   Multiple accounts changes what “monthly overview” even means — needs an account selector or a combined-total view, decided up front.
   CSV export format should match what common spreadsheet/budgeting tools expect, so it’s actually useful once exported.
   Home screen widget
   A home screen widget showing today’s agenda without opening the app.
   Edge cases to plan for:
   No events or tasks that day — show a genuine empty state, not a blank widget that looks broken.
   OS-imposed widget refresh limits (both Android and iOS throttle updates) — decide an acceptable refresh interval rather than expecting instant updates.
   Tapping the widget should deep-link straight into that day’s view, not just open the app to its default screen.
   Calendar .ics import/export
   Manual import/export of calendar files, giving basic Google Calendar interoperability without building a live two-way sync.
   Edge cases to plan for:
   Re-importing the same .ics file — needs duplicate detection so events don’t double up on every import.
   Complex recurrence rules from an external calendar — decide a fallback for rules Kaisro’s recurrence engine can’t fully represent, rather than silently dropping the event.
4. Won’t-have (icebox — not right now)
   Full Google Calendar two-way sync
   Note: Iceboxed — OAuth, token refresh, and conflict resolution between Kaisro’s local data and Google’s servers is a meaningfully bigger project than the local calendar itself. Revisit only if a second device or web access becomes a real need.
   Cloud backup / multi-device sync
   Note: Iceboxed — this needs a real account system and sync-conflict handling, both out of scope for a solo, local-first app right now.
   Developer insight: The combined day view and the persistent notification are the actual hook — they’re what makes this feel different from a generic calendar app opened once a week. Everything else in Should-have and Could-have is real value, but if V1.5 slips, those two are the ones worth protecting.
