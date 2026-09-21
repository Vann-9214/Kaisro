# Design Specification: Calendar Week Strip Ghost Numbers

## 1. Objective
Replace the blank/empty slots at the start or end of month-bounded calendar weeks with faint "ghost numbers" representing the actual dates from the previous or next month. When tapped, the app automatically transitions to that month and week, selecting that date.

## 2. Requirements & Behavior
1. **Ghost Number Dates**:
   - For weeks spanning across month boundaries (e.g., September Week 5 containing Sep 28-30 and Oct 1-4; October Week 1 containing Sep 28-30 and Oct 1-4):
   - Out-of-month slots must not be blank. They must display the actual numeric day (e.g. 1, 2, 3, 4 for October days in September Week 5; 28, 29, 30 for September days in October Week 1).
2. **Visual Styling**:
   - `DayNumber`: Render with faint text color (`colors['text-muted']` with 40% opacity).
   - No background shape or border.
   - Retain exact 36x36dp geometry and center alignment.
   - Weekday abbreviations above ghost days rendered at 40% opacity.
   - Dots container for ghost days remains empty (no indicator dots).
3. **Interaction**:
   - Tapping a ghost date immediately sets `viewingYear`, `viewingMonth`, `viewingWeekNumber`, and `selectedDateStr` to the target date's month and week, navigating to that month and selecting the tapped date.

## 3. Architecture & Interfaces
- **`src/utils/dateUtils.ts`**:
  - Extend `MonthWeekDayItem`:
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
  - Update `getMonthWeekDays` to calculate out-of-bounds dates using `new Date(year, month, dayNum)` and populate ghost properties instead of setting `null`.
- **`src/components/ui/DayNumber.tsx`**:
  - Add `isGhost?: boolean` to `DayNumberProps`.
  - When `isGhost`, render `textColor = colors['text-muted']` and `opacity = 0.4` with no circle border/fill.
- **`app/(tabs)/index.tsx`**:
  - Render ghost days with dimmed weekday text, `isGhost` prop to `DayNumber`, and blank dot row.
  - On press, navigate to `item.targetYear`, `item.targetMonth`, `item.targetWeekNumber` and select `item.dateStr`.
