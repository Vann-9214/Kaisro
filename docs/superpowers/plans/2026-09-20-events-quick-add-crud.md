# Event Creation, Editing, Deletion & Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Event CRUD in Kaisro using the Stitch design system for Quick Add sheet shell and Day View empty state, powered by React Hook Form, Drizzle SQLite, and `@react-native-community/datetimepicker`.

**Architecture:**
- State in `useUIStore` manages bottom sheet visibility, active tab, and `editingEvent` payload.
- Recurrence utilities in `src/utils/recurrence.ts` project recurring events (`DAILY`, `WEEKLY`, `MONTHLY` with day 29–31 month-end clamping) onto target day view dates.
- Form in `EventForm.tsx` manages validation, modal date/time picking, duration preservation, reminder offset selection, and edit/delete actions.
- Day View in `app/(tabs)/index.tsx` integrates event edit taps and renders the Stitch-exact "Nothing planned today" empty state card centered above the visible hourly timeline.

**Tech Stack:**
- React Native 0.86 / Expo Go ~57
- React Hook Form
- `@react-native-community/datetimepicker`
- Drizzle ORM + `expo-sqlite`
- Zustand 5
- NativeWind 4 + Lucide React Native

## Global Constraints
- Mobile-only (Android and iOS); never target web.
- Use only semantic theme tokens (no hardcoded hex).
- Respect safe-area insets (`react-native-safe-area-context`).
- Build on existing `BottomSheet`, `SegmentedControl`, `FloatingAddButton`, and `useUIStore`.
- Keep the sheet above the keyboard so the Save button is never covered.
- Date storage: `YYYY-MM-DDTHH:mm:ss` for timed items, `YYYY-MM-DD` for all-day items. Display in phone's local timezone.
- Scope: Event only. Task, Expense, and Note tabs stay visible but disabled. Do NOT include "Link a note".

---

### Task 1: Install `@react-native-community/datetimepicker` & Extend `useUIStore`

**Files:**
- Modify: `package.json`
- Modify: `src/store/useUIStore.ts`

**Interfaces:**
- Consumes: `schema.Event` from `@/db/schema`
- Produces: `useUIStore` with `editingEvent`, `selectedDateContext`, and enhanced `openAddSheet`

- [ ] **Step 1: Install `@react-native-community/datetimepicker`**
Run: `npx expo install @react-native-community/datetimepicker`
Verify package is listed in `package.json`.

- [ ] **Step 2: Update `useUIStore.ts`**
Add `editingEvent: Event | null`, `selectedDateContext: string`, and update `openAddSheet`:
```typescript
import { create } from 'zustand';
import { Event } from '@/db/schema';

export type QuickAddType = 'event' | 'task' | 'transaction' | 'note';

interface UIState {
  isAddSheetOpen: boolean;
  activeAddType: QuickAddType;
  editingEvent: Event | null;
  selectedDateContext: string;
  openAddSheet: (type?: QuickAddType, eventToEdit?: Event | null, dateContext?: string) => void;
  closeAddSheet: () => void;
  setActiveAddType: (type: QuickAddType) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddSheetOpen: false,
  activeAddType: 'event',
  editingEvent: null,
  selectedDateContext: '',
  openAddSheet: (type = 'event', eventToEdit = null, dateContext = '') =>
    set({
      isAddSheetOpen: true,
      activeAddType: type,
      editingEvent: eventToEdit,
      selectedDateContext: dateContext,
    }),
  closeAddSheet: () => set({ isAddSheetOpen: false, editingEvent: null }),
  setActiveAddType: (type) => set({ activeAddType: type }),
}));
```

- [ ] **Step 3: Verify TypeScript compiles**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

---

### Task 2: Recurrence Engine & Duration Helper (`src/utils/recurrence.ts`)

**Files:**
- Create: `src/utils/recurrence.ts`
- Test: `scripts/verify-event-crud.ts`

**Interfaces:**
- Consumes: `schema.Event`
- Produces:
  - `expandEventForDate(event: Event, targetDateStr: string): Event | null`
  - `shiftEndDatePreservingDuration(oldStart: Date, newStart: Date, oldEnd: Date): Date`
  - `formatReminderLabel(minutes: number | null): string`

- [ ] **Step 1: Implement `src/utils/recurrence.ts`**
Implement recurrence matching rules:
- Event start date > targetDateStr: returns `null` (never appears on earlier days).
- `none` or null: returns event if `start` falls on `targetDateStr` (or crosses it).
- `DAILY`: returns projected event if `startDateStr <= targetDateStr`.
- `WEEKLY`: returns projected event if `startDateStr <= targetDateStr` and day-of-week matches.
- `MONTHLY`: returns projected event if `startDateStr <= targetDateStr` and:
  - `startDayNum === targetDayNum`, OR
  - if `startDayNum > daysInTargetMonth`, target day is the last day of target month (e.g. Day 31 in Feb falls on Feb 28/29).
- Duration shift helper: `newEnd = new Date(newStart.getTime() + (oldEnd.getTime() - oldStart.getTime()))`.
- Reminder label helper:
  - `0`: "At time of event"
  - `5`: "5 min before"
  - `10`: "10 min before"
  - `15`: "15 min before"
  - `30`: "30 min before"
  - `60`: "1 hour before"
  - `1440`: "1 day before"
  - `null`: "None"

- [ ] **Step 2: Create automated verification test in `scripts/verify-event-crud.ts`**
Write tests asserting:
1. Daily recurrence on future vs past dates.
2. Weekly recurrence on matching weekday vs non-matching.
3. Monthly recurrence on day 31 clamping to Feb 28 in 2026.
4. Future event not appearing on earlier days.
5. Duration preserved when start time shifts.

- [ ] **Step 3: Run `npx tsx scripts/verify-event-crud.ts`**
Expected: PASS with all assertion messages printed.

---

### Task 3: Database Event CRUD Operations & `useCalendarDay` Refresh

**Files:**
- Modify: `src/hooks/useCalendarDay.ts`
- Modify: `src/db/client.ts` (if needed for direct queries/mutations)

**Interfaces:**
- Consumes: `expandEventForDate` from `@/utils/recurrence`
- Produces:
  - `useCalendarDay(selectedDateStr)` with expanded recurring events
  - `createEvent(data: NewEvent): Promise<Event>`
  - `updateEvent(id: number, data: Partial<NewEvent>): Promise<void>`
  - `deleteEvent(id: number): Promise<void>`
  - `refreshCalendar(): void`

- [ ] **Step 1: Update `src/hooks/useCalendarDay.ts`**
- Query non-recurring events for `selectedDateStr`.
- Query all recurring events (`recurrence IS NOT NULL AND start <= endOfDay`).
- For each recurring event, call `expandEventForDate(ev, selectedDateStr)` and merge.
- Export `createEvent`, `updateEvent`, `deleteEvent`, and `refreshCalendar`.

- [ ] **Step 2: Add SQLite mutation verification to `scripts/verify-event-crud.ts`**
Verify inserting an event, querying through the hook logic, updating, and deleting.

- [ ] **Step 3: Run verification**
Run: `npx tsx scripts/verify-event-crud.ts`
Expected: PASS.

---

### Task 4: Stitch-Exact Event Form Component (`src/components/events/EventForm.tsx`)

**Files:**
- Create: `src/components/events/EventForm.tsx`

**Interfaces:**
- Consumes: `useUIStore`, `useCalendarDay`, `@react-native-community/datetimepicker`
- Produces: `<EventForm onClose={closeAddSheet} />`

- [ ] **Step 1: Implement form state with `react-hook-form`**
Fields:
- `title`: string (required)
- `allDay`: boolean
- `startDate`: Date
- `endDate`: Date
- `location`: string
- `recurrence`: 'none' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
- `hasReminder`: boolean
- `reminderMinutes`: number (default 15)

- [ ] **Step 2: Implement modal Date/Time Picker flow**
- Tapping **STARTS** card opens date picker first.
  - If date canceled: dismiss, keep previous value.
  - If date confirmed:
    - If `allDay`: update `startDate`, shift `endDate` date, finish.
    - If timed: open time picker immediately.
    - If time canceled: keep new date with old time.
    - If time confirmed: update `startDate`, shift `endDate` by duration.
- Tapping **ENDS** card opens date picker then time picker targeting `endDate`.
  - Validate `endDate >= startDate`. If invalid, show inline error message: "End time must be after start time."

- [ ] **Step 3: Implement Reminder Offset Selector**
- When `hasReminder` is true, tapping the offset row opens modal or selector with:
  `[0, 5, 10, 15, 30, 60, 1440]` minutes.
- Updates `reminderMinutes`. When `hasReminder` is toggled off, stores `null`.

- [ ] **Step 4: Implement Delete button in Edit mode**
- Subtle, calm desaturated red text button:
  `Delete event` (`text-[#B85D5D]`).
- Alert confirmation:
  - Non-recurring: "Are you sure you want to delete this event?"
  - Recurring: "This deletes all repeats of this event."

- [ ] **Step 5: Verify TypeScript compiles**
Run: `npx tsc --noEmit`
Expected: PASS.

---

### Task 5: Quick Add BottomSheet Shell Integration (`src/components/QuickAddBottomSheet.tsx`)

**Files:**
- Modify: `src/components/QuickAddBottomSheet.tsx`

**Interfaces:**
- Consumes: `EventForm`, `SegmentedControl`, `useUIStore`
- Produces: Integrated `<QuickAddBottomSheet />` with full Event support

- [ ] **Step 1: Replace placeholder content with Stitch shell**
- Drag handle.
- Header row with "Quick Add" title and circular close button with `X` icon.
- `SegmentedControl` with `Event`, `Task`, `Expense`, `Note`.
  - `Event` is active.
  - Clicking other tabs does not change tab (shows subtle toast or is disabled).
- Renders `<EventForm onClose={closeAddSheet} />`.
- Wrapped in `KeyboardAvoidingView` so Save button is never covered.

- [ ] **Step 2: Test rendering and TypeScript**
Run: `npx tsc --noEmit`
Expected: PASS.

---

### Task 6: Day View Integration & Empty State (`app/(tabs)/index.tsx`)

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `useCalendarDay`, `useUIStore`
- Produces:
  - Tapping any event opens `QuickAddBottomSheet` prefilled in edit mode.
  - Floating `+` button opens `QuickAddBottomSheet` on `Event` tab with day context.
  - Stitch-exact Empty State card centered on timeline when day has no items.

- [ ] **Step 1: Wire Event tap to edit mode**
In `allDayEvents.map` and `timelineItems.map` for events:
Replace `router.push('/detail')` with:
`openAddSheet('event', ev, selectedDateStr)`

- [ ] **Step 2: Implement Stitch-exact Empty State card**
When `!isLoading && allDayEvents.length === 0 && timedEvents.length === 0 && tasks.length === 0 && transactions.length === 0`:
Display centered card over the visible hourly timeline:
- Clock icon in circular badge.
- Heading: "Nothing planned today" (`text-base font-medium text-text`).
- Subtext: "Your canvas is completely open for focused calm." (`text-xs text-text-muted text-center`).
- Button: `+ Add an event` (`bg-primary`, text white, rounded-md) triggering `openAddSheet('event', null, selectedDateStr)`.

- [ ] **Step 3: Verify TypeScript compiles**
Run: `npx tsc --noEmit`
Expected: PASS.

---

### Task 7: Verification & Visual Polish

**Files:**
- Run: `scripts/verify-event-crud.ts`
- Run: `npx tsc --noEmit`

- [ ] **Step 1: Run automated verification script**
Run: `npx tsx scripts/verify-event-crud.ts`
Assert all recurrence, duration shift, and database operations pass.

- [ ] **Step 2: Compare against Stitch screens and prepare manual checklist**
Compare implemented UI against `quick_add_event.png` and `empty_day_view.png`.
Document exact layout match and manual testing steps for phone.
