# Design Specification: Event Creation, Editing, Deletion & Empty State

**Date:** 2026-09-20  
**Project:** Kaisro (React Native / Expo Go, SQLite + Drizzle, NativeWind, Zustand, React Hook Form)  
**Status:** Validated Design  

---

## 1. Scope & Objective

Implement full CRUD capabilities for Calendar Events along with the Stitch-exact Quick Add sheet shell and Day View empty state:
1. **Quick-Add Sheet Shell**: Modal bottom sheet with drag handle, "Quick Add" header, circular close (X) button, and 4-tab segmented control (`Event` active, `Task`, `Expense`, `Note` disabled).
2. **Event Form with React Hook Form**:
   - Title (required)
   - All-day switch toggle
   - Starts & Ends pickers (modal date picker followed by time picker)
   - Location input
   - Recurrence selector (Does not repeat, Daily, Weekly, Monthly)
   - Reminder switch toggle and reminder offset
   - Save / Update button (`✓ Save Event` or `✓ Save changes`)
   - Calm, subtle Delete button in edit mode with confirmation
3. **Validation & UX**:
   - Required title with validation message.
   - Start < End validation.
   - Shifting End when Start changes to maintain duration.
   - Keyboard handling so the Save button is always accessible above the keyboard.
4. **Data Layer & Recurrence Expansion**:
   - Persist events into SQLite `events` table via Drizzle ORM.
   - Recurrence expansion in `useCalendarDay` for `DAILY`, `WEEKLY`, and `MONTHLY` rules.
   - Instant UI refresh on create, update, and delete.
5. **Day View Empty State**:
   - Render Stitch-exact "Nothing planned today" card when no events, tasks, or transactions exist on the selected day.
   - "+ Add an event" button triggering the Quick Add sheet.

---

## 2. Component & Architecture Design

### 2.1 State Management (`src/store/useUIStore.ts`)
Extend `UIState`:
```typescript
export type QuickAddType = 'event' | 'task' | 'transaction' | 'note';

interface UIState {
  isAddSheetOpen: boolean;
  activeAddType: QuickAddType;
  editingEvent: Event | null;
  selectedDateStr: string; // Day view date context for defaulting event start/end
  openAddSheet: (type?: QuickAddType, eventToEdit?: Event | null, dateStr?: string) => void;
  closeAddSheet: () => void;
  setActiveAddType: (type: QuickAddType) => void;
}
```

### 2.2 Quick Add Sheet Shell (`src/components/QuickAddBottomSheet.tsx`)
- Wraps `BottomSheet` component.
- Contains header:
  - Drag handle centered at top.
  - Row with "Quick Add" title (`text-base font-medium text-text`), optional context chip, and circular close button with `X` icon.
- `SegmentedControl`:
  - Options: `Event`, `Task`, `Expense`, `Note`.
  - Only `Event` is active; clicking others is ignored/disabled for now.
- `KeyboardAvoidingView` & `ScrollView` inside the sheet so form fields and the Save button remain scrollable and never obscured by the software keyboard.

### 2.3 Event Form (`src/components/events/EventForm.tsx`)
Implemented using `react-hook-form` (`useForm`, `Controller`):
- **Form Values Schema**:
  ```typescript
  interface EventFormData {
    title: string;
    allDay: boolean;
    startDate: Date;
    endDate: Date;
    location: string;
    recurrence: 'none' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    hasReminder: boolean;
    reminderMinutes: number; // default 15
  }
  ```
- **Default values for Create**:
  - `startDate`: On `selectedDateStr` at the next full hour (e.g. if current time is 2:15 PM, 3:00 PM; if selected day is not today, 9:00 AM).
  - `endDate`: `startDate + 1 hour`.
  - `allDay`: `false`.
  - `recurrence`: `'none'`.
  - `hasReminder`: `true`, `reminderMinutes`: `15`.
- **Default values for Edit**:
  - Populated directly from `editingEvent` (parsing ISO strings into Date objects).

### 2.4 Date & Time Pickers UX (Option 1 Modal / Dialog)
- Library: `@react-native-community/datetimepicker`.
- Flow:
  - Tapping **STARTS** card:
    1. Opens Native Date picker.
    2. If user cancels: dismiss, keep previous date and time.
    3. If user confirms date:
       - If `allDay`: update `startDate` date, shift `endDate` by same number of days, finish.
       - If not `allDay`: open Native Time picker immediately.
    4. Time picker:
       - If user cancels: keep the newly picked date with the previous time.
       - If user confirms time: combine date + time into new `startDate`, shift `endDate` by the prior duration.
  - Tapping **ENDS** card:
    - Same flow targeting `endDate`.
    - If `endDate < startDate`, sets form validation error and blocks save.

### 2.5 Recurrence Storage & Expansion
- In `src/db/schema.ts`, `events.recurrence` is `text` (`DAILY`, `WEEKLY`, `MONTHLY`, or null).
- In `src/hooks/useCalendarDay.ts`:
  - Query:
    1. Single events on `selectedDateStr` (`start <= endOfDay AND end >= startOfDay AND recurrence IS NULL`).
    2. Recurring events (`recurrence IS NOT NULL AND start <= endOfDay`).
  - Filter recurring events:
    - For each recurring event with `recurrence`:
      - `DAILY`: include on `selectedDateStr` if `eventStartDate <= selectedDateStr`.
      - `WEEKLY`: include if `eventStartDate <= selectedDateStr` and `eventDayOfWeek === selectedDayOfWeek`.
      - `MONTHLY`: include if `eventStartDate <= selectedDateStr` and `eventDayOfMonth === selectedDayOfMonth`.
    - Clone event with projected start/end on `selectedDateStr` keeping original event ID and time-of-day so timeline renders correctly.

### 2.6 Edit & Delete Operations
- Tapping an event in the Day view (`app/(tabs)/index.tsx`) calls:
  `openAddSheet('event', ev, selectedDateStr)`
- In edit mode:
  - Submit button: `✓ Save changes`
  - Footer action: Subtle text button `Delete event` (`text-[#B85D5D]` / desaturated muted red).
  - Tapping `Delete event` prompts:
    `Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [...])`
  - Deleting deletes `events.id = ev.id` from SQLite and refreshes `useCalendarDay`.

### 2.7 Day View Empty State
- Rendered in `app/(tabs)/index.tsx` when:
  `!isLoading && allDayEvents.length === 0 && timedEvents.length === 0 && tasks.length === 0 && transactions.length === 0`
- Component:
  - Centered card with gentle border (`border-border`), light surface (`bg-surface`).
  - Circular badge with clock icon (`colors.primary`).
  - Heading: "Nothing planned today" (`text-base font-medium text-text`).
  - Subtitle: "Your canvas is completely open for focused calm." (`text-xs text-text-muted text-center`).
  - Action Button: `+ Add an event` (`bg-primary`, text white, pill/rounded-md) which calls `openAddSheet('event', null, selectedDateStr)`.

---

## 3. Stitch Design Tokens & Visual Fidelity
- Canvas & Card surfaces: `colors.surface` (`#FFFFFF`), `colors.background` (`#FAF7F2`), `colors['surface-raised']` (`#FDFBF7`), `colors['surface-low']` (`#F8F3EE`).
- Primary actions & active tabs: Archival Ink Blue (`colors.primary` / `#3A4A7A`).
- Hairline dividers: Warm Stone (`colors.border` / `#E2DED7`).
- Delete action: Desaturated soft muted red (`#B85D5D`), serene and calm.
- Typography: Inter with tabular numerals for all time and date displays.

---

## 4. Verification & Testing Strategy
1. **Automated Verification Script** (`scripts/verify-event-crud.ts`):
   - SQLite in-memory verification of event insertion, recurrence expansion (daily, weekly, monthly), update, and deletion.
2. **TypeScript Compilation**: `npx tsc --noEmit` must return 0 errors.
3. **Manual Phone Checklist**:
   - Quick Add open from Floating `+` button.
   - Event creation with validation.
   - Starts & Ends pickers (date then time).
   - Event appearance on Day View timeline.
   - Event edit & delete.
   - Empty state rendering and interaction.
