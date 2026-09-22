import { getWeekDays, parseISODate, WEEK_STARTS_ON_MONDAY } from '../src/utils/dateUtils';

console.log('=== VERIFYING GHOST DATES IN WEEK STRIP ===\n');

// 1. September 2026, Week 5 (anchored on Sep 30, 2026)
// Monday Sep 28 to Wednesday Sep 30 are in September.
// Thursday Oct 1 to Sunday Oct 4 are in October -> MUST be GHOST dates!
{
  const sep30 = parseISODate('2026-09-30');
  const week = getWeekDays(sep30, WEEK_STARTS_ON_MONDAY, '2026-09-22');

  console.log('Case 1: September 2026 Week 5 (Sep 28 to Oct 4)');
  if (week.length !== 7) throw new Error('Week must have 7 days');

  // Verify non-ghost days
  for (let i = 0; i < 3; i++) {
    const item = week[i];
    console.log(`  [${item.dayAbbr} ${item.dayNum}] date=${item.dateStr}, isGhost=${item.isGhost}`);
    if (item.isGhost !== false) {
      throw new Error(`Expected ${item.dateStr} to NOT be a ghost date in September`);
    }
  }

  // Verify ghost days (Oct 1 to Oct 4)
  for (let i = 3; i < 7; i++) {
    const item = week[i];
    console.log(`  [${item.dayAbbr} ${item.dayNum}] date=${item.dateStr}, isGhost=${item.isGhost}, targetMonth=${item.targetMonth}`);
    if (item.isGhost !== true) {
      throw new Error(`Expected ${item.dateStr} to be a GHOST date in September`);
    }
    if (item.targetMonth !== 9) { // October is month 9 (0-indexed)
      throw new Error(`Expected targetMonth to be 9 (October), got ${item.targetMonth}`);
    }
  }
  console.log('  ✓ PASS: Mon 28 to Wed 30 are active; Thu 1 to Sun 4 are GHOST dates with targetMonth=9.\n');
}

// 2. October 2026, Week 1 (anchored on Oct 1, 2026)
// Monday Sep 28 to Wednesday Sep 30 are in September -> MUST be GHOST dates!
// Thursday Oct 1 to Sunday Oct 4 are in October -> Active!
{
  const oct1 = parseISODate('2026-10-01');
  const week = getWeekDays(oct1, WEEK_STARTS_ON_MONDAY, '2026-09-22');

  console.log('Case 2: October 2026 Week 1 (Sep 28 to Oct 4)');
  // Verify ghost days (Sep 28 to Sep 30)
  for (let i = 0; i < 3; i++) {
    const item = week[i];
    console.log(`  [${item.dayAbbr} ${item.dayNum}] date=${item.dateStr}, isGhost=${item.isGhost}, targetMonth=${item.targetMonth}`);
    if (item.isGhost !== true) {
      throw new Error(`Expected ${item.dateStr} to be a GHOST date in October`);
    }
    if (item.targetMonth !== 8) { // September is month 8 (0-indexed)
      throw new Error(`Expected targetMonth to be 8 (September), got ${item.targetMonth}`);
    }
  }

  // Verify non-ghost days (Oct 1 to Oct 4)
  for (let i = 3; i < 7; i++) {
    const item = week[i];
    console.log(`  [${item.dayAbbr} ${item.dayNum}] date=${item.dateStr}, isGhost=${item.isGhost}`);
    if (item.isGhost !== false) {
      throw new Error(`Expected ${item.dateStr} to NOT be a ghost date in October`);
    }
  }
  console.log('  ✓ PASS: Mon 28 to Wed 30 are GHOST dates with targetMonth=8; Thu 1 to Sun 4 are active.\n');
}

console.log('=== ALL GHOST DATES VERIFICATIONS PASSED SUCCESSFULLY ===');
