import { useUIStore } from '../src/store/useUIStore';
import {
  getWeekDays,
  parseISODate,
  formatDateToISO,
  shiftDateByDays,
  MONTH_NAMES,
  getOrdinalWeekLabel,
  getWeekNumberOfDate,
  WEEK_STARTS_ON_MONDAY,
} from '../src/utils/dateUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('=== VERIFYING 1 TRUE CLICK ON DATE & ORDINAL WEEK LABEL ===\n');

// 1. Initial State in Zustand Store
console.log('--- 1. Zustand Store Initialization ---');
const todayStr = formatDateToISO(new Date());
const initialSelectedDate = useUIStore.getState().selectedDate;
const initialViewedDate = useUIStore.getState().viewedDate;

assert(
  typeof initialSelectedDate === 'string' && initialSelectedDate.length === 10,
  `Store initializes selectedDate to valid YYYY-MM-DD string: got "${initialSelectedDate}"`
);
assert(
  initialSelectedDate === todayStr,
  `Store initializes selectedDate to today (${todayStr})`
);
assert(
  initialViewedDate === todayStr,
  `Store initializes viewedDate to today (${todayStr})`
);

// 2. User taps Monday in current week (2026-09-21)
console.log('\n--- 2. Tapping Monday in Week A (2026-09-21) ---');
useUIStore.getState().setSelectedDate('2026-09-21');
assert(useUIStore.getState().selectedDate === '2026-09-21', 'Store selectedDate is 2026-09-21');
assert(useUIStore.getState().viewedDate === '2026-09-21', 'Store viewedDate is updated to 2026-09-21 on click');

const weekA = getWeekDays(parseISODate(useUIStore.getState().viewedDate), WEEK_STARTS_ON_MONDAY, '2026-09-21');
const isWeekASelected = weekA.some((d) => d.dateStr === useUIStore.getState().selectedDate);
const activeDateWeekA = isWeekASelected ? useUIStore.getState().selectedDate : null;

assert(activeDateWeekA === '2026-09-21', 'Active date in Week A is 2026-09-21');

const weekASelectedDays = weekA.filter((d) => activeDateWeekA !== null && d.dateStr === activeDateWeekA);
assert(
  weekASelectedDays.length === 1 && weekASelectedDays[0].dateStr === '2026-09-21',
  'Week A has exactly ONE selected day: Monday 2026-09-21'
);

// 3. User presses next week (> arrow): changes viewedDate ONLY, does NOT change selectedDate!
console.log('\n--- 3. Pressing Next Week Arrow (>): Browses week without auto-selecting ---');
const nextWeekDate = shiftDateByDays(useUIStore.getState().viewedDate, 7);
assert(nextWeekDate === '2026-09-28', `shiftDateByDays(+7) gives 2026-09-28, got ${nextWeekDate}`);

// Next arrow sets viewedDate ONLY
useUIStore.getState().setViewedDate(nextWeekDate);
assert(
  useUIStore.getState().selectedDate === '2026-09-21',
  '1 TRUE CLICK ON DATE: selectedDate remains 2026-09-21 (arrow button NEVER auto-selects a date!)'
);
assert(useUIStore.getState().viewedDate === '2026-09-28', 'Store viewedDate is now 2026-09-28');

// In Week B (Sep 28 to Oct 4), selectedDate (Sep 21) is NOT present
const weekB = getWeekDays(parseISODate(useUIStore.getState().viewedDate), WEEK_STARTS_ON_MONDAY, '2026-09-21');
const isWeekBSelected = weekB.some((d) => d.dateStr === useUIStore.getState().selectedDate);
const activeDateWeekB = isWeekBSelected ? useUIStore.getState().selectedDate : null;

assert(activeDateWeekB === null, 'Active date in Week B is null (NO day is selected until user clicks one!)');

const weekBSelectedDays = weekB.filter((d) => activeDateWeekB !== null && d.dateStr === activeDateWeekB);
assert(
  weekBSelectedDays.length === 0,
  'Week B has ZERO selected days (no blue circle on any day!)'
);

// 4. User taps Wednesday in Week B (2026-09-30) - THIS IS THE 1 TRUE CLICK
console.log('\n--- 4. Tapping Wednesday in Week B (2026-09-30) ---');
useUIStore.getState().setSelectedDate('2026-09-30');
assert(useUIStore.getState().selectedDate === '2026-09-30', 'Store selectedDate is now 2026-09-30');
assert(useUIStore.getState().viewedDate === '2026-09-30', 'Store viewedDate is 2026-09-30');

const isWeekBTappedSelected = weekB.some((d) => d.dateStr === useUIStore.getState().selectedDate);
const activeDateWeekBTapped = isWeekBTappedSelected ? useUIStore.getState().selectedDate : null;
assert(activeDateWeekBTapped === '2026-09-30', 'Active date in Week B is now Wednesday 2026-09-30');

const weekBTappedDays = weekB.filter((d) => activeDateWeekBTapped !== null && d.dateStr === activeDateWeekBTapped);
assert(
  weekBTappedDays.length === 1 && weekBTappedDays[0].dateStr === '2026-09-30',
  'Week B has exactly ONE selected day: Wednesday 2026-09-30'
);

// 5. User presses Previous Week (< arrow): returns to Week A
console.log('\n--- 5. Pressing Previous Week Arrow (<): Returns to Week A ---');
const prevWeekDate = shiftDateByDays(useUIStore.getState().viewedDate, -7);
assert(prevWeekDate === '2026-09-23', `shiftDateByDays(-7) gives 2026-09-23, got ${prevWeekDate}`);

// Previous arrow sets viewedDate ONLY
useUIStore.getState().setViewedDate(prevWeekDate);
assert(
  useUIStore.getState().selectedDate === '2026-09-30',
  '1 TRUE CLICK ON DATE: selectedDate remains Wednesday 2026-09-30'
);

const weekAReturned = getWeekDays(parseISODate(useUIStore.getState().viewedDate), WEEK_STARTS_ON_MONDAY, '2026-09-21');
const isWeekAReturnedSelected = weekAReturned.some((d) => d.dateStr === useUIStore.getState().selectedDate);
const activeDateWeekAReturned = isWeekAReturnedSelected ? useUIStore.getState().selectedDate : null;

assert(activeDateWeekAReturned === null, 'Active date in Week A is null (selectedDate is in Week B!)');

// CRITICAL USER BUG CHECK:
// Monday Sep 21 MUST NOT show the blue selected circle!
const mondaySep21 = weekAReturned.find((d) => d.dateStr === '2026-09-21')!;
const isMondaySelected = activeDateWeekAReturned !== null && mondaySep21.dateStr === activeDateWeekAReturned;
assert(
  isMondaySelected === false,
  'ROOT CAUSE VERIFICATION: Monday 2026-09-21 has NO blue circle when returning to Week A'
);

// Monday Sep 21 IS today, so it receives today styling (outline), NOT selected styling
assert(
  mondaySep21.isToday === true,
  'Monday 2026-09-21 is recognized as today (thin outline, NOT blue filled circle)'
);

const allWeekASelectedDays = weekAReturned.filter((d) => activeDateWeekAReturned !== null && d.dateStr === activeDateWeekAReturned);
assert(
  allWeekASelectedDays.length === 0,
  'Week A has ZERO selected days (no week keeps a ghost selection!)'
);

// 6. User presses Next Week (>) back to Week B
console.log('\n--- 6. Pressing Next Week (>) back to Week B ---');
useUIStore.getState().setViewedDate('2026-09-30');
const isWeekBReturnedSelected = weekB.some((d) => d.dateStr === useUIStore.getState().selectedDate);
const activeDateWeekBReturned = isWeekBReturnedSelected ? useUIStore.getState().selectedDate : null;
assert(activeDateWeekBReturned === '2026-09-30', 'Wednesday 2026-09-30 is still the active date');

const weekBReturnedSelectedDays = weekB.filter((d) => activeDateWeekBReturned !== null && d.dateStr === activeDateWeekBReturned);
assert(
  weekBReturnedSelectedDays.length === 1 && weekBReturnedSelectedDays[0].dateStr === '2026-09-30',
  'Week B has Wednesday 2026-09-30 selected (the 1 true clicked date)'
);

// 7. Jump to Today button
console.log('\n--- 7. Jump to Today Button ---');
useUIStore.getState().setSelectedDate('2026-09-21');
assert(useUIStore.getState().selectedDate === '2026-09-21', 'Jump to today sets selectedDate to 2026-09-21');
assert(useUIStore.getState().viewedDate === '2026-09-21', 'Jump to today sets viewedDate to 2026-09-21');

// 8. Ordinal Week Label (e.g. "4TH WEEK", "1ST WEEK" - NOT "WEEK 39"!)
console.log('\n--- 8. Ordinal Week Label in Title Row (NOT "WEEK 39"!) ---');
const dSep21 = parseISODate('2026-09-21');
const badgeSep21 = getOrdinalWeekLabel(getWeekNumberOfDate(dSep21, WEEK_STARTS_ON_MONDAY));
assert(
  badgeSep21 === '4TH WEEK',
  `Badge for Sep 21, 2026 is "${badgeSep21}" (ordinal week of month, NOT "WEEK 39"!)`
);

const dOct01 = parseISODate('2026-10-01');
const badgeOct01 = getOrdinalWeekLabel(getWeekNumberOfDate(dOct01, WEEK_STARTS_ON_MONDAY));
assert(
  badgeOct01 === '1ST WEEK',
  `Badge for Oct 1, 2026 is "${badgeOct01}" (ordinal week of month, NOT "WEEK 39"!)`
);

console.log('\n======================================================');
console.log('🎉 ALL 1-TRUE-CLICK & ORDINAL WEEK TESTS PASSED!');
console.log('======================================================\n');
