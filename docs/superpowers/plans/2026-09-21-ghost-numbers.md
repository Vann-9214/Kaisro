# Calendar Week Strip Ghost Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace blank slots at month boundaries in the Calendar week strip with faint ghost numbers that navigate to the adjacent month and select that date when tapped.

**Architecture:** Extend `getMonthWeekDays` in `dateUtils.ts` to compute actual dates, month coordinates, and week numbers for out-of-month slots (`isGhost: true`). Update `DayNumber.tsx` to support dimmed ghost styling. Update `app/(tabs)/index.tsx` to render ghost days without dots and transition navigation state when tapped.

**Tech Stack:** React Native, Expo, TypeScript, NativeWind.

## Global Constraints
- Mobile-only (Android and iOS; never target web).
- Semantic theme tokens only (`colors.primary`, `colors['on-primary']`, `colors.text`, `colors['text-muted']`, `colors.border`, `colors.surface`, `colors.background`). No hardcoded hex.
- Do NOT commit (`dont commit`).
- Keep database clean and empty.

---

### Task 1: Extend `dateUtils.ts` with Ghost Day Calculations

**Files:**
- Modify: `src/utils/dateUtils.ts:157-274`
- Test: `scripts/verify-calendar-header.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MonthWeekDayItem {
    dateStr: string;
    dayAbbr: string;
    dayNum: number;
    isWeekend: boolean;
    isToday: boolean;
    isGhost: boolean;
    targetYear: number;
    targetMonth: number;
    targetWeekNumber: number;
  }
  ```

- [ ] **Step 1: Write test cases in `scripts/verify-calendar-header.ts` asserting ghost day dates & coordinates**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Update `src/utils/dateUtils.ts` with `MonthWeekDayItem` interface and `getMonthWeekDays` logic**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 2: Update `DayNumber.tsx` to Support Ghost Styling

**Files:**
- Modify: `src/components/ui/DayNumber.tsx:12-85`
- Test: `scripts/verify-day-number.ts`

**Interfaces:**
- Consumes: `DayNumberProps { isGhost?: boolean }`
- Produces: 36x36dp circular component with dimmed text (`opacity: 0.4`, `colors['text-muted']`) when `isGhost: true`.

- [ ] **Step 1: Update `scripts/verify-day-number.ts` with ghost state test assertion**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Update `src/components/ui/DayNumber.tsx` to accept `isGhost` and apply ghost styles**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 3: Integrate Ghost Day Rendering & Navigation in `app/(tabs)/index.tsx`

**Files:**
- Modify: `app/(tabs)/index.tsx:660-760`

**Interfaces:**
- Consumes: `MonthWeekDayItem` from Task 1, `DayNumber` from Task 2
- Produces: Week strip rendering where ghost days display ghost numbers, blank dot row, and handle tap to switch month/week.

- [ ] **Step 1: Update `app/(tabs)/index.tsx` week strip loop to pass `isGhost` to `DayNumber` and dim weekday header**
- [ ] **Step 2: Implement `handlePressDay` supporting ghost date transitions to `targetYear`, `targetMonth`, `targetWeekNumber`**
- [ ] **Step 3: Verify TypeScript compilation with `npx tsc --noEmit`**

---

### Task 4: End-to-End Verification

**Files:**
- Run: `scripts/verify-calendar-header.ts`
- Run: `scripts/verify-day-number.ts`
- Run: `npx tsc --noEmit`

- [ ] **Step 1: Execute test suites and verify exit code 0**
- [ ] **Step 2: Confirm no regressions across header, navigation, and week dots**
