# Design Specification: Calendar Week View (Overview)

**Date:** 2026-09-23  
**Project:** Kaisro (React Native / Expo Go, SQLite + Drizzle, NativeWind, Zustand)  
**Status:** Approved Design  

---

## 1. Scope & Objective

Implement the Week View of the Calendar tab matching the Stitch screen "Kaisro - Week View (Overview)" (`projects/13951426432029591365/screens/18115dbe71ab4a30b9a6e1e5c0c51837`).

The Week View is a monthly overview composed of chronological Monday-first week cards (4, 5, or 6 weeks depending on month layout), an activity bar overview strip, mini 7-day strips, week statistics, and expandable "What's inside" item lists grouped by day.
There is **no** hourly timeline grid, hour labels, or clock times on this screen.

Key confirmations:
1. `useCalendarWeekView` reuses `expandEventForDate` from `src/utils/recurrence.ts` (the exact same recurring-event expansion logic as `useCalendarDay`) so recurring events appear consistently across Day and Week views.
2. The `FlatList`'s initial scroll position automatically scrolls to the current week's card (Week 38 when today is in September 2026), matching the "today" button behavior.

---

## 2. Requirements & Behavior

### 2.1 Header & View Switcher
- Reusable `TopBar` with `featureName="Calendar"`.
- Month & Year Title Row:
  - Month name and year (e.g., `September 2026`).
  - Small uppercase label with the number of weeks in that month (`5 WEEKS`, `4 WEEKS`, `6 WEEKS`).
  - Circular 40dp navigation buttons (`ChevronLeft`, `ChevronRight`) that navigate by 1 month.
  - Circular 40dp "today" button (`CalendarDays` icon) jumping to the current month and scrolling to the current week's card.
- View Switcher:
  - Segmented control: `Day` and `Week` are functional; `Month` and `Agenda` disabled.
  - Switching preserves `selectedDate`.

### 2.2 Weeks Overview Strip
- Horizontal activity bar strip with 4, 5, or 6 columns.
- Labels: `W36`, `W37`, `W38`, etc.
- Bar height proportional to week's total count of events + tasks due:
  - 0 count: tiny 3dp dot.
  - > 0 count: minimum visible height (6dp) up to 36dp max.
  - Current week gets a solid primary bar and the "Now" indicator.
- Tapping any column scrolls the `FlatList` to that week's card.

### 2.3 Week Cards
- Displayed in chronological order in a `FlatList`.
- Card Header:
  - Week number (`Week 38`), date range (`Sep 14 – 20`, or `Aug 31 – Sep 6` across months, `Dec 28, 2026 – Jan 3, 2027` across years).
  - "This week" badge on current week.
  - Chevron icon toggling expansion.
- Stats Row:
  - Events count (recurring occurrences count).
  - Tasks done out of total (e.g. `2/4` with progress bar, `0/0` with empty bar when none).
  - Spending: expenses only, excluding income, formatted with `formatCurrency`.
- Mini Day Strip:
  - 7 cells (M, T, W, T, F, S, S) with date numbers.
  - Up to 3 indicator dots (primary for events, tasks teal for tasks, deep amber for expenses).
  - Today highlighted.
  - Busiest day tinted with subtle surface tint (highest count of events + tasks, tie goes to earlier day, count >= 2).
  - Out-of-month ghost days faded (opacity 0.4).
  - Tapping a day selects that date and switches to `Day` view.
- "What's inside":
  - Grouped by day with day headers.
  - Sorted by day, then all-day first, then by time (times are used only for sorting, not displayed).
  - Color bar indicator (primary: event, tasks: task, money: expense).
  - Title and muted secondary line (location for events, priority for tasks, category for expenses).
  - Tasks include interactive `Checkbox` with instant SQLite completion toggle and sync.
  - Up to 6 items with a `+N more` button to reveal remaining items.
  - Tapping a row opens its edit sheet via `useUIStore.openAddSheet`.
- Collapsed State:
  - Shows one-line preview: first 2 item titles and `+N more`, or `"Nothing planned"` if empty.
- Initial Expansion State:
  - Current week starts expanded (if in visible month); all others collapsed.
  - Local state per week, resets when month changes.
  - Past weeks slightly muted.

### 2.4 Empty States
- Empty week: `"Nothing planned"` and remains collapsed.
- Empty month: inline `EmptyState` banner above the list with `"Nothing planned this month"` and `"+ Add an event"`, defaulting to today if in month, otherwise the 1st of the month.

---

## 3. Architecture & File Structure

1. `src/utils/weekViewUtils.ts`:
   - `getVisibleWeeksForMonth(year: number, month: number)`: Returns array of 4, 5, or 6 weeks with Monday-to-Sunday dates, ISO week numbers, and formatted date ranges.
   - `formatWeekDateRange(monday: Date, sunday: Date)`: Formats `Sep 14 – 20`, `Aug 31 – Sep 6`, `Dec 28, 2026 – Jan 3, 2027`.
   - `calculateBusiestDayIndex(daysCounts: number[])`: Finds index (0-6) of busiest day (count >= 2, first wins ties).
   - `sortWeekItems(items: WeekItem[])`: All-day first, then by time.

2. `src/hooks/useCalendarWeekView.ts`:
   - Fetches events (with `expandEventForDate`), tasks, and expenses in single range queries across the visible month's week boundaries.
   - Groups into weeks and days with stats.
   - Reactive to `useCalendarSync`.

3. `src/components/calendar/WeekView.tsx`:
   - Renders overview strip, empty state banner, and `FlatList` of week cards.
   - Auto-scrolls to current week on mount and when today is tapped.

4. `app/(tabs)/index.tsx`:
   - Integrates `activeView` toggle between `Day` and `Week`.
   - Renders shared `TopBar` and common calendar header.
