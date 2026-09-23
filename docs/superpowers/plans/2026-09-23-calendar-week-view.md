# Calendar Week View (Overview) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Calendar tab's Week View as a weekly overview of a month matching the Stitch design system, with chronological week cards, activity bar overview strip, mini 7-day strips, week statistics, expandable day-grouped item rows with task completion, and full SQLite sync.

**Architecture:** A modular view architecture. `src/utils/weekViewUtils.ts` handles pure calendar algorithms (overlapping Monday-first weeks, ISO week numbers, date range labels, busiest-day calculations, item sorting). `src/hooks/useCalendarWeekView.ts` fetches month-range data with single queries per data type, reusing `expandEventForDate` for recurring events. `src/components/calendar/WeekView.tsx` renders the overview strip, empty state banner, and `FlatList` of `WeekCard`s with auto-scrolling to the current week. `app/(tabs)/index.tsx` orchestrates the functional `Day` and `Week` views.

**Tech Stack:** React Native (Expo Go), TypeScript, NativeWind / Tailwind, Zustand, SQLite + Drizzle ORM, Lucide icons.

## Global Constraints

- Mobile-only (Android & iOS); never target web.
- Semantic theme tokens only (no hardcoded hex colors) from `src/constants/theme.ts`.
- Reuse existing shared components (`TopBar`, `EmptyState`, `Checkbox`, `Chip`, `ProgressBar`, `QuickAddBottomSheet`).
- Reuse `expandEventForDate` from `src/utils/recurrence.ts` so recurring events expand identically across Day and Week views.
- Reuse `formatCurrency` from `src/constants/currency.ts` for spending.
- The app starts EMPTY with no sample data. No dummy data in production code.
- FlatList initial scroll position lands on the current week's card (Week 38 in Sep 2026).
- All weeks start on Monday (`WEEK_STARTS_ON_MONDAY = true`).

---

### Task 1: Core Week & Month Date Utilities (`src/utils/weekViewUtils.ts`)

**Files:**
- Create: `src/utils/weekViewUtils.ts`
- Test: `scripts/verify-week-view-data.ts`

**Interfaces:**
- Consumes: `src/utils/dateUtils.ts` (`formatDateToISO`, `parseISODate`, `getISOWeekNumber`, `MONTH_NAMES`)
- Produces:
  ```ts
  export interface WeekRangeInfo {
    weekIndex: number; // 0 to N-1
    isoWeekNumber: number; // e.g. 38
    isoWeekLabel: string; // e.g. "Week 38"
    shortWeekLabel: string; // e.g. "W38"
    dateRangeLabel: string; // e.g. "Sep 14 – 20", "Aug 31 – Sep 6", "Dec 28, 2026 – Jan 3, 2027"
    startDate: Date; // Monday 00:00:00
    endDate: Date; // Sunday 23:59:59
    startDateStr: string; // YYYY-MM-DD
    endDateStr: string; // YYYY-MM-DD
    days: WeekDayItem[]; // 7 days Mon-Sun
    isCurrentWeek: boolean; // contains today
    isPastWeek: boolean; // all days before today
  }

  export function getVisibleWeeksForMonth(year: number, month: number, todayStr?: string): WeekRangeInfo[];
  export function formatWeekDateRange(startDate: Date, endDate: Date): string;
  export function calculateBusiestDayIndex(counts: number[]): number;
  export function sortWeekItems<T extends { dayStr: string; isAllDay?: boolean; sortTime?: string }>(items: T[]): T[];
  ```

- [ ] **Step 1: Implement `src/utils/weekViewUtils.ts`**
  Write pure functions for month-overlapping weeks, date range formatting, busiest day indexing, and item sorting.

---

### Task 2: Verification Script for Week Generation & Stats (`scripts/verify-week-view-data.ts`)

**Files:**
- Create: `scripts/verify-week-view-data.ts`

**Interfaces:**
- Consumes: `src/utils/weekViewUtils.ts`, `src/utils/recurrence.ts`, `src/constants/currency.ts`
- Tests:
  - 4-week months (e.g. February 2027 / February 2026)
  - 5-week months (e.g. September 2026)
  - 6-week months (e.g. August 2026 or May 2026)
  - ISO week numbers (confirm Sunday Sep 20, 2026 is Week 38)
  - Date range labels across month boundaries (`Aug 31 – Sep 6`) and year boundaries (`Dec 28, 2026 – Jan 3, 2027`)
  - Busiest day calculation (ties win first day, minimum count of 2)
  - Per-week stats using an isolated in-memory/temp SQLite database (recurring events expansion, tasks done/total, expense spending excluding income)
  - Grouping and sorting inside a week (all-day first, then by time)

- [ ] **Step 1: Write and run verification script**
  Run: `npx tsx scripts/verify-week-view-data.ts`
  Verify all assertions pass.

---

### Task 3: Calendar Week View Data Hook (`src/hooks/useCalendarWeekView.ts`)

**Files:**
- Create: `src/hooks/useCalendarWeekView.ts`

**Interfaces:**
- Consumes: `src/db`, `src/db/schema`, `src/hooks/useCalendarDay` (`useCalendarSync`), `src/utils/recurrence` (`expandEventForDate`), `src/utils/weekViewUtils`
- Produces:
  ```ts
  export interface WeekItemRow {
    id: string; // `event-${id}`, `task-${id}`, `expense-${id}`
    type: 'event' | 'task' | 'expense';
    dayStr: string; // YYYY-MM-DD
    title: string;
    subtitle: string;
    isAllDay?: boolean;
    sortTime: string;
    event?: schema.Event;
    task?: schema.Task;
    transaction?: schema.Transaction;
  }

  export interface WeekData {
    info: WeekRangeInfo;
    eventsCount: number;
    tasksDoneCount: number;
    tasksTotalCount: number;
    totalSpentCentavos: number;
    busiestDayIndex: number;
    dotsMap: Record<string, { hasEvents: boolean; hasTasks: boolean; hasExpenses: boolean }>;
    items: WeekItemRow[];
    dayCounts: number[];
  }

  export function useCalendarWeekView(year: number, month: number, todayStr: string): {
    weeks: WeekData[];
    isLoading: boolean;
    isMonthEmpty: boolean;
    toggleTask: (taskId: number, currentDone: boolean) => Promise<void>;
  };
  ```

- [ ] **Step 1: Implement `src/hooks/useCalendarWeekView.ts`**
  Single queries per data type over the entire visible weeks span, recurrence expansion, grouping into weeks, and reactive sync with `useCalendarSync`.

---

### Task 4: Week Card Components (`src/components/calendar/WeekCard.tsx`, `WeekOverviewStrip.tsx`)

**Files:**
- Create: `src/components/calendar/WeekOverviewStrip.tsx`
- Create: `src/components/calendar/WeekCard.tsx`

**Interfaces:**
- Consumes: `src/components/ui/Card`, `src/components/ui/Checkbox`, `src/components/ui/Chip`, `src/components/ui/ProgressBar`, `src/constants/theme`, `src/constants/currency`
- Produces:
  - `WeekOverviewStrip`: Renders the proportional activity columns, solid bar + "Now" marker on current week, click to scroll.
  - `WeekCard`: Renders week header, stats row, mini day strip with indicator dots, busiest-day tint, and expandable "What's inside" item list with task toggle and "+N more" button.

- [ ] **Step 1: Implement `WeekOverviewStrip.tsx`**
- [ ] **Step 2: Implement `WeekCard.tsx`**

---

### Task 5: WeekView Component & Calendar Tab Integration (`src/components/calendar/WeekView.tsx`, `app/(tabs)/index.tsx`)

**Files:**
- Create: `src/components/calendar/WeekView.tsx`
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `useCalendarWeekView`, `WeekOverviewStrip`, `WeekCard`, `EmptyState`, `useUIStore`
- Produces:
  - `WeekView`: Container with `FlatList`, auto-scroll to current week on mount and when today is tapped, inline empty banner when month is empty.
  - `app/(tabs)/index.tsx`: View switcher toggles between `Day` and `Week`, month previous/next buttons move by 1 month, weeks count label (`5 WEEKS`), and today button jumps to current month.

- [ ] **Step 1: Implement `src/components/calendar/WeekView.tsx`**
- [ ] **Step 2: Update `app/(tabs)/index.tsx`** to integrate Week view.

---

### Task 6: Verification, Type Checking & Comparison

- [ ] **Step 1: Run verification script**
  Run: `npx tsx scripts/verify-week-view-data.ts`
- [ ] **Step 2: Run TypeScript compiler**
  Run: `npx tsc --noEmit`
- [ ] **Step 3: Compare against Stitch design specifications**
- [ ] **Step 4: Prepare manual phone test checklist**
