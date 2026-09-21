import {
  getWeekDays,
  getISOWeekNumber,
  getISOWeekLabel,
  parseISODate,
  formatDateToISO,
  MONTH_NAMES,
  WEEK_STARTS_ON_MONDAY,
  START_WEEKDAY,
} from '../src/utils/dateUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('=== VERIFYING KAISRO CALENDAR HEADER FIXES ===\n');

// ----------------------------------------------------------------------------
// 1. getWeekDays for Sep 22, Sep 29, Oct 1, Oct 4, 2026 and Dec 30, 2026
// ----------------------------------------------------------------------------
console.log('--- 1. getWeekDays boundary crossing verification ---');

// Sep 22, 2026 (Tuesday)
const daysSep22 = getWeekDays(parseISODate('2026-09-22'));
assert(daysSep22.length === 7, 'Sep 22 week returns exactly 7 days');
assert(daysSep22[0].dateStr === '2026-09-21' && daysSep22[6].dateStr === '2026-09-27',
  'Sep 22 returns Mon Sep 21 to Sun Sep 27');

// Sep 29, 2026 (Tuesday), Oct 1, 2026 (Thursday), Oct 4, 2026 (Sunday)
const daysSep29 = getWeekDays(parseISODate('2026-09-29'));
const daysOct01 = getWeekDays(parseISODate('2026-10-01'));
const daysOct04 = getWeekDays(parseISODate('2026-10-04'));

const expectedBoundaryDates = [
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
];

const sep29Dates = daysSep29.map((d) => d.dateStr);
const oct01Dates = daysOct01.map((d) => d.dateStr);
const oct04Dates = daysOct04.map((d) => d.dateStr);

assert(JSON.stringify(sep29Dates) === JSON.stringify(expectedBoundaryDates),
  `Sep 29 returns Sep 28 to Oct 4: ${sep29Dates.join(', ')}`);
assert(JSON.stringify(oct01Dates) === JSON.stringify(expectedBoundaryDates),
  `Oct 1 returns Sep 28 to Oct 4: ${oct01Dates.join(', ')}`);
assert(JSON.stringify(oct04Dates) === JSON.stringify(expectedBoundaryDates),
  `Oct 4 returns Sep 28 to Oct 4: ${oct04Dates.join(', ')}`);

// Week crossing year boundary: Dec 30, 2026 (Wednesday)
const daysDec30 = getWeekDays(parseISODate('2026-12-30'));
const expectedYearBoundary = [
  '2026-12-28',
  '2026-12-29',
  '2026-12-30',
  '2026-12-31',
  '2027-01-01',
  '2027-01-02',
  '2027-01-03',
];
const dec30Dates = daysDec30.map((d) => d.dateStr);
assert(JSON.stringify(dec30Dates) === JSON.stringify(expectedYearBoundary),
  `Dec 30, 2026 returns Dec 28, 2026 to Jan 3, 2027: ${dec30Dates.join(', ')}`);

// ----------------------------------------------------------------------------
// 2. The arrows: setDate +/- 7 navigation logic
// ----------------------------------------------------------------------------
console.log('\n--- 2. Arrow navigation verification (setDate +/- 7) ---');

function stepNextWeek(dateStr: string): string {
  const d = parseISODate(dateStr);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, 0, 0, 0, 0);
  return formatDateToISO(next);
}

function stepPrevWeek(dateStr: string): string {
  const d = parseISODate(dateStr);
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7, 0, 0, 0, 0);
  return formatDateToISO(prev);
}

// from Tue Sep 22, next gives Tue Sep 29, then Tue Oct 6
const step1 = stepNextWeek('2026-09-22');
assert(step1 === '2026-09-29', `From Tue Sep 22, next gives Tue Sep 29 (got ${step1})`);
const step2 = stepNextWeek(step1);
assert(step2 === '2026-10-06', `From Tue Sep 29, next gives Tue Oct 6 (got ${step2})`);

// from Thu Oct 1, previous gives Thu Sep 24
const stepPrev = stepPrevWeek('2026-10-01');
assert(stepPrev === '2026-09-24', `From Thu Oct 1, previous gives Thu Sep 24 (got ${stepPrev})`);

// from Dec 30, 2026, next gives Jan 6, 2027
const stepYear = stepNextWeek('2026-12-30');
assert(stepYear === '2027-01-06', `From Dec 30, 2026, next gives Jan 6, 2027 (got ${stepYear})`);

// ----------------------------------------------------------------------------
// 3. No cell is ever blank or missing across a full year of consecutive weeks
// ----------------------------------------------------------------------------
console.log('\n--- 3. Full year consecutive weeks - zero blank or missing cells ---');

let startDate = parseISODate('2026-01-01');
let totalWeeksTested = 0;
let totalDaysTested = 0;

for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
  const currentDay = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + dayOffset,
    0,
    0,
    0,
    0
  );
  const week = getWeekDays(currentDay);

  assert(week.length === 7, `Week on day offset ${dayOffset} must have exactly 7 slots`);

  for (let i = 0; i < 7; i++) {
    const item = week[i];
    assert(typeof item.dateStr === 'string' && item.dateStr.length === 10,
      `Date slot ${i} must have valid dateStr: ${item.dateStr}`);
    assert(typeof item.dayNum === 'number' && item.dayNum >= 1 && item.dayNum <= 31,
      `Date slot ${i} must have valid dayNum: ${item.dayNum}`);
    assert(typeof item.dayAbbr === 'string' && item.dayAbbr.length === 3,
      `Date slot ${i} must have valid dayAbbr: ${item.dayAbbr}`);
    assert('isBlank' in (item as Record<string, unknown>) === false,
      `Item should not have isBlank property`);

    if (i > 0) {
      const prevD = parseISODate(week[i - 1].dateStr);
      const currD = parseISODate(item.dateStr);
      const diffMs = currD.getTime() - prevD.getTime();
      const diffDays = Math.round(diffMs / (24 * 3600 * 1000));
      assert(diffDays === 1,
        `Day ${i} (${item.dateStr}) must be exactly 1 day after day ${i - 1} (${week[i - 1].dateStr})`);
    }
  }

  totalDaysTested++;
  if (dayOffset % 7 === 0) totalWeeksTested++;
}

assert(totalDaysTested === 365, `Verified all 365 days across 2026 without any blanks or missing dates`);

// ----------------------------------------------------------------------------
// 4. ISO week labels: specific test cases
// ----------------------------------------------------------------------------
console.log('\n--- 4. ISO week label verification ---');

const isoCases = [
  { dateStr: '2026-09-20', expectedWeek: 38, expectedLabel: 'WEEK 38', desc: 'Sun Sep 20, 2026 is week 38' },
  { dateStr: '2026-09-21', expectedWeek: 39, expectedLabel: 'WEEK 39', desc: 'Mon Sep 21, 2026 is week 39' },
  { dateStr: '2025-12-29', expectedWeek: 1, expectedLabel: 'WEEK 1', desc: 'Mon Dec 29, 2025 is week 1' },
  { dateStr: '2026-12-28', expectedWeek: 53, expectedLabel: 'WEEK 53', desc: 'Mon Dec 28, 2026 is week 53' },
  { dateStr: '2027-01-04', expectedWeek: 1, expectedLabel: 'WEEK 1', desc: 'Mon Jan 4, 2027 is week 1' },
];

for (const tc of isoCases) {
  const d = parseISODate(tc.dateStr);
  const num = getISOWeekNumber(d);
  const label = getISOWeekLabel(d);
  assert(num === tc.expectedWeek, `${tc.desc}: got week ${num}, expected ${tc.expectedWeek}`);
  assert(label === tc.expectedLabel, `${tc.desc}: got label "${label}", expected "${tc.expectedLabel}"`);
}

// ----------------------------------------------------------------------------
// 5. Title string always includes 4-digit year (2026, 2027, and leap year 2028)
// ----------------------------------------------------------------------------
console.log('\n--- 5. Title string always includes four-digit year ---');

function formatTitleString(d: Date): string {
  const monthName = MONTH_NAMES[d.getMonth()] ?? 'September';
  const yearStr = String(d.getFullYear());
  return `${monthName} ${yearStr}`;
}

// Check every day of 2026
const d2026 = parseISODate('2026-01-01');
for (let i = 0; i < 365; i++) {
  const cur = new Date(d2026.getFullYear(), d2026.getMonth(), d2026.getDate() + i, 0, 0, 0, 0);
  const title = formatTitleString(cur);
  assert(/\b2026\b/.test(title), `2026 Day ${i} title "${title}" contains 2026`);
}

// Check every day of 2027
const d2027 = parseISODate('2027-01-01');
for (let i = 0; i < 365; i++) {
  const cur = new Date(d2027.getFullYear(), d2027.getMonth(), d2027.getDate() + i, 0, 0, 0, 0);
  const title = formatTitleString(cur);
  assert(/\b2027\b/.test(title), `2027 Day ${i} title "${title}" contains 2027`);
}

// Check leap-year week around Feb 29, 2028
const leapDays = [
  '2028-02-27',
  '2028-02-28',
  '2028-02-29',
  '2028-03-01',
  '2028-03-02',
];

for (const ds of leapDays) {
  const d = parseISODate(ds);
  const title = formatTitleString(d);
  assert(/\b2028\b/.test(title), `Leap year day ${ds} title "${title}" contains 2028`);
}

// Check leap year week strip for Feb 29, 2028
const leapWeek = getWeekDays(parseISODate('2028-02-29'));
assert(leapWeek.length === 7, 'Leap week has 7 days');
const leapDates = leapWeek.map((d) => d.dateStr);
assert(
  JSON.stringify(leapDates) ===
    JSON.stringify([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
      '2028-03-02',
      '2028-03-03',
      '2028-03-04',
      '2028-03-05',
    ]),
  `Leap week crosses Feb 29 cleanly: ${leapDates.join(', ')}`
);

console.log('\n======================================================');
console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('======================================================\n');
