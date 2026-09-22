import {
  parseISODate,
  getWeekDays,
  getWeekNumberOfDate,
  getOrdinalWeekLabel,
  MONTH_NAMES,
  getNextWeekAnchor,
  getPrevWeekAnchor,
} from '../src/utils/dateUtils';

console.log('=== VERIFYING MONTH-BOUNDARY WEEK NAVIGATION (NO SKIPPING 1ST WEEK) ===\n');

function describeState(dateStr: string) {
  const d = parseISODate(dateStr);
  const mName = MONTH_NAMES[d.getMonth()];
  const yr = d.getFullYear();
  const wNum = getOrdinalWeekLabel(getWeekNumberOfDate(d, true));
  const days = getWeekDays(d, true);
  return {
    month: mName,
    year: yr,
    ordinalWeek: wNum,
    firstDay: `${days[0].dayAbbr} ${days[0].dayNum}`,
    lastDay: `${days[6].dayAbbr} ${days[6].dayNum}`,
    summary: `${mName} ${yr}, ${wNum} [${days[0].dayAbbr} ${days[0].dayNum} to ${days[6].dayAbbr} ${days[6].dayNum}]`,
  };
}

// 1. September 2026 to October 2026 forward navigation
{
  console.log('--- Test 1: September to October forward progression ---');
  let curr = '2026-09-21'; // September Week 4
  const expectedSteps = [
    { month: 'September', ordinalWeek: '4TH WEEK', firstDay: 'Mon 21', lastDay: 'Sun 27' },
    { month: 'September', ordinalWeek: '5TH WEEK', firstDay: 'Mon 28', lastDay: 'Sun 4' },
    { month: 'October', ordinalWeek: '1ST WEEK', firstDay: 'Mon 28', lastDay: 'Sun 4' },
    { month: 'October', ordinalWeek: '2ND WEEK', firstDay: 'Mon 5', lastDay: 'Sun 11' },
    { month: 'October', ordinalWeek: '3RD WEEK', firstDay: 'Mon 12', lastDay: 'Sun 18' },
  ];

  let state = describeState(curr);
  console.log('  Start:', state.summary);
  if (state.month !== expectedSteps[0].month || state.ordinalWeek !== expectedSteps[0].ordinalWeek) {
    throw new Error(`Mismatch at start: ${state.summary}`);
  }

  for (let i = 1; i < expectedSteps.length; i++) {
    curr = getNextWeekAnchor(curr);
    state = describeState(curr);
    console.log(`  Next >:`, state.summary);
    if (state.month !== expectedSteps[i].month || state.ordinalWeek !== expectedSteps[i].ordinalWeek) {
      throw new Error(`FAIL at step ${i}: Expected ${expectedSteps[i].month} ${expectedSteps[i].ordinalWeek}, got ${state.summary}`);
    }
  }
  console.log('  ✓ PASS: October 1ST WEEK is visited cleanly between September 5TH WEEK and October 2ND WEEK!\n');

  // 2. October 2026 backward navigation
  console.log('--- Test 2: October to September backward progression ---');
  for (let i = expectedSteps.length - 2; i >= 0; i--) {
    curr = getPrevWeekAnchor(curr);
    state = describeState(curr);
    console.log(`  Prev <:`, state.summary);
    if (state.month !== expectedSteps[i].month || state.ordinalWeek !== expectedSteps[i].ordinalWeek) {
      throw new Error(`FAIL backward at step ${i}: Expected ${expectedSteps[i].month} ${expectedSteps[i].ordinalWeek}, got ${state.summary}`);
    }
  }
  console.log('  ✓ PASS: Backward navigation returns through October 1ST WEEK and September 5TH WEEK symmetrically!\n');
}

// 3. Year boundary (December 2026 to January 2027)
{
  console.log('--- Test 3: December 2026 to January 2027 year boundary progression ---');
  let curr = '2026-12-21';
  const expectedSteps = [
    { month: 'December', ordinalWeek: '4TH WEEK' },
    { month: 'December', ordinalWeek: '5TH WEEK' },
    { month: 'January', ordinalWeek: '1ST WEEK' },
    { month: 'January', ordinalWeek: '2ND WEEK' },
  ];

  for (let i = 1; i < expectedSteps.length; i++) {
    curr = getNextWeekAnchor(curr);
    const state = describeState(curr);
    console.log(`  Next >:`, state.summary);
    if (state.month !== expectedSteps[i].month || state.ordinalWeek !== expectedSteps[i].ordinalWeek) {
      throw new Error(`FAIL at year boundary step ${i}: Expected ${expectedSteps[i].month} ${expectedSteps[i].ordinalWeek}, got ${state.summary}`);
    }
  }
  console.log('  ✓ PASS: Year boundary navigation cleanly transitions through January 1ST WEEK!\n');
}

console.log('=== ALL WEEK NAVIGATION VERIFICATIONS PASSED SUCCESSFULLY ===');
