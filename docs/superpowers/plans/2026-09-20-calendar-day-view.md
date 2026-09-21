# Calendar Day View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Calendar tab's Day view screen for Kaisro, matching the Stitch "Combined Day View" design and design tokens, backed by the SQLite database and seed data.

**Architecture:**
1. A reusable custom hook `useCalendarDay` queries events, tasks, transactions, and categories for a selected date from SQLite via Drizzle ORM, computes daily metrics, and provides an optimistic task toggle mutation.
2. A timeline layout utility `timelineLayout` groups overlapping events and calculates column allocation for side-by-side rendering.
3. A placeholder detail screen `app/detail.tsx` renders event and expense details upon tapping.
4. The Calendar tab (`app/(tabs)/index.tsx`) integrates the Header with view switcher, Horizontal week strip, Day summary row, Collapsible "All-day & untimed" section, and Vertical hourly timeline with live updating "now" line.

**Tech Stack:**
- React Native / Expo SDK 52
- TypeScript
- Expo Router
- NativeWind (Tailwind CSS)
- expo-sqlite + Drizzle ORM
- Lucide React Native icons
- Inter font family

## Global Constraints
- Mobile-only (Android & iOS). Never target web.
- Use only semantic theme tokens (no hardcoded hex).
- Respect safe-area insets (`react-native-safe-area-context`): headers clear status bar, scroll content clears bottom tab bar and floating button.
- Match Stitch "Combined Day View" layout, spacing, colors, and content.
- Strict type-safety: `npx tsc --noEmit` must pass with zero errors.

---

### Task 1: Reusable Data Fetching Hook (`src/hooks/useCalendarDay.ts`)

**Files:**
- Create: `src/hooks/useCalendarDay.ts`
- Test: `scripts/verify-day-hook.ts`

**Interfaces:**
- Produces: `useCalendarDay(selectedDateStr: string)`
  - Returns: `{ events, tasks, transactions, categories, summary: { eventsCount, tasksLeftCount, totalSpentCentavos }, allDayEvents, untimedTasks, timedEvents, timedTasks, timedTransactions, toggleTask, refresh, isLoading }`

- [ ] **Step 1: Implement `src/hooks/useCalendarDay.ts`**
- [ ] **Step 2: Create and run verification script `scripts/verify-day-hook.ts`**

---

### Task 2: Timeline Layout & Overlap Calculation Utility (`src/utils/timelineLayout.ts`)

**Files:**
- Create: `src/utils/timelineLayout.ts`

**Interfaces:**
- Produces:
  - `computeEventLayout(events, startHour, hourHeight)`: returns events with `colIndex`, `totalCols`, `top`, `height`
  - `timeStringToMinutes(timeStr)`: converts ISO string or HH:mm into minutes from midnight

- [ ] **Step 1: Implement `src/utils/timelineLayout.ts` with overlap clustering algorithm**

---

### Task 3: Placeholder Detail Screen (`app/detail.tsx`)

**Files:**
- Create: `app/detail.tsx`

**Interfaces:**
- Accepts route params: `type` ('event' | 'expense' | 'task'), `id` (string), `title`, `subtitle`, `details`
- Respects safe-area insets for header and back navigation

- [ ] **Step 1: Implement `app/detail.tsx`**

---

### Task 4: Complete Calendar Day View Screen (`app/(tabs)/index.tsx`)

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Components to Include:**
- Header with month and year ("September 2026")
- View switcher (Month / Week / Day / Agenda) with Day active and others disabled
- Horizontal week strip with today as filled primary circle and date selection
- Day summary row ("X events · Y tasks left · ₱Z spent") with figures in module colors
- Collapsible "All-day & untimed" section with chevron toggle and task checkboxes
- Vertical hourly timeline (7 AM - 10 PM) with hairline spine, hour markers, side-by-side overlapping events, tasks with checkboxes, expense pills, and 1-minute updating "now" line
- Immediate SQLite update and summary recalculation on task checkbox toggle
- Navigation to detail screen on event/expense press

- [ ] **Step 1: Replace placeholder cards in `app/(tabs)/index.tsx` with full Day View implementation**

---

### Task 5: Typecheck & Verification

- [ ] **Step 1: Run `npx tsc --noEmit` and fix any errors**
- [ ] **Step 2: Run verification script against SQLite database**
- [ ] **Step 3: Compare against Stitch design specifications and document manual phone verification checklist**
