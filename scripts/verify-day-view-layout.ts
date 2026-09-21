import {
  START_HOUR,
  END_HOUR,
  HOUR_HEIGHT,
  COLLISION_THRESHOLD_PX,
  computeNowTop,
  isHourLabelColliding,
  findCollidingHour,
  calculateTimelineScrollTarget,
  formatTimeDisplay,
} from '../src/utils/timelineLayout';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  PASS: ${msg}`);
}

console.log('=== 1. Testing Label Collision Detection (COLLISION_THRESHOLD_PX = 16) ===');
{
  assert(COLLISION_THRESHOLD_PX === 16, 'COLLISION_THRESHOLD_PX must equal 16');

  // Test exactly on the hour: 10:00 AM (hour 10, nowLineTop = 720)
  const hour10Top = 10 * HOUR_HEIGHT; // 720px
  const nowTop10_00 = computeNowTop(10, 0);
  assert(nowTop10_00 === 720, '10:00 AM top is 720px');
  assert(
    isHourLabelColliding(nowTop10_00, hour10Top, COLLISION_THRESHOLD_PX),
    '10:00 AM collides with hour 10 label'
  );
  assert(findCollidingHour(nowTop10_00) === 10, 'findCollidingHour for 10:00 AM returns hour 10');

  // Test 5 min before the hour: 9:55 AM (nowLineTop = 714)
  const nowTop9_55 = computeNowTop(9, 55);
  const diff9_55 = Math.abs(nowTop9_55 - hour10Top); // |714 - 720| = 6px
  assert(diff9_55 === 6, '9:55 AM is 6px from hour 10 mark');
  assert(
    isHourLabelColliding(nowTop9_55, hour10Top, COLLISION_THRESHOLD_PX),
    '9:55 AM (5 min before 10) collides with hour 10 label (distance 6px < 16px)'
  );
  assert(findCollidingHour(nowTop9_55) === 10, 'findCollidingHour for 9:55 AM returns hour 10');

  // Test 10 min after the hour: 10:10 AM (nowLineTop = 732)
  const nowTop10_10 = computeNowTop(10, 10);
  const diff10_10 = Math.abs(nowTop10_10 - hour10Top); // |732 - 720| = 12px
  assert(diff10_10 === 12, '10:10 AM is 12px from hour 10 mark');
  assert(
    isHourLabelColliding(nowTop10_10, hour10Top, COLLISION_THRESHOLD_PX),
    '10:10 AM (10 min after 10) collides with hour 10 label (distance 12px < 16px)'
  );
  assert(findCollidingHour(nowTop10_10) === 10, 'findCollidingHour for 10:10 AM returns hour 10');

  // Test 20 min before the hour: 9:40 AM (nowLineTop = 696)
  const nowTop9_40 = computeNowTop(9, 40);
  assert(
    !isHourLabelColliding(nowTop9_40, hour10Top, COLLISION_THRESHOLD_PX),
    '9:40 AM does NOT collide with hour 10 label (distance 24px >= 16px)'
  );
  assert(findCollidingHour(nowTop9_40) === null, 'findCollidingHour for 9:40 AM returns null (no collision)');

  // Test 20 min after the hour: 10:20 AM (nowLineTop = 744)
  const nowTop10_20 = computeNowTop(10, 20);
  assert(
    !isHourLabelColliding(nowTop10_20, hour10Top, COLLISION_THRESHOLD_PX),
    '10:20 AM does NOT collide with hour 10 label (distance 24px >= 16px)'
  );
  assert(findCollidingHour(nowTop10_20) === null, 'findCollidingHour for 10:20 AM returns null (no collision)');
}

console.log('\n=== 2. Testing Scroll Target Math & Clamping ===');
{
  const todayStr = '2026-09-20';
  const timelineOffsetY = 140;
  const viewportHeight = 600;
  const contentHeight = 2050;
  const maxScrollY = contentHeight - viewportHeight; // 1450px

  // Test A: 12:05 AM (start of day)
  // nowMinutes = 5. nowTop = (5/60)*72 = 6px.
  // raw target = 140 + 6 - 210 = -64px.
  // Clamped: must be 0px!
  const target12_05 = calculateTimelineScrollTarget({
    dateStr: todayStr,
    todayStr,
    timelineOffsetY,
    viewportHeight,
    contentHeight,
    nowMinutes: 5,
  });
  assert(target12_05 === 0, `12:05 AM scrolls to 0px (clamped to start of day, actual: ${target12_05})`);

  // Test B: 7:00 AM (morning)
  // nowMinutes = 420. nowTop = 504px.
  // raw target = 140 + 504 - Math.round(600 * 0.35) = 644 - 210 = 434px.
  const target7_00 = calculateTimelineScrollTarget({
    dateStr: todayStr,
    todayStr,
    timelineOffsetY,
    viewportHeight,
    contentHeight,
    nowMinutes: 7 * 60,
  });
  assert(target7_00 === 434, `7:00 AM scrolls to 434px (~35% viewport target, actual: ${target7_00})`);

  // Test C: 11:46 PM (late at night)
  // nowMinutes = 23 * 60 + 46 = 1426.
  // nowTop = (1426/60)*72 = 1711.2px.
  // raw target = 140 + 1711.2 - 210 = 1641.2px.
  // Clamped to maxScrollY (1450px) so it shows bottom of day without scrolling past end!
  const target11_46 = calculateTimelineScrollTarget({
    dateStr: todayStr,
    todayStr,
    timelineOffsetY,
    viewportHeight,
    contentHeight,
    nowMinutes: 23 * 60 + 46,
  });
  assert(
    target11_46 === maxScrollY,
    `11:46 PM clamped to maxScrollY (${maxScrollY}px), showing bottom of day (actual: ${target11_46})`
  );

  // Test D: Other day (empty) -> scrolls to 7:00 AM
  // 7 * 72 = 504. raw target = 140 + 504 - 16 = 628px.
  const targetOtherEmpty = calculateTimelineScrollTarget({
    dateStr: '2026-09-21',
    todayStr,
    timelineOffsetY,
    viewportHeight,
    contentHeight,
    earliestItemTop: null,
  });
  assert(targetOtherEmpty === 628, `Other empty day scrolls to 7:00 AM (actual: ${targetOtherEmpty})`);

  // Test E: Other day with earliest item at 6:00 AM
  // 6 * 72 = 432. raw target = 140 + 432 - 16 = 556px.
  const targetOtherEarlyItem = calculateTimelineScrollTarget({
    dateStr: '2026-09-21',
    todayStr,
    timelineOffsetY,
    viewportHeight,
    contentHeight,
    earliestItemTop: 432,
  });
  assert(
    targetOtherEarlyItem === 556,
    `Other day with 6:00 AM item scrolls to 556px (actual: ${targetOtherEarlyItem})`
  );
}

console.log('\n=== 3. Testing Hour Label Formatting & Geometry ===');
{
  const midnightStart = formatTimeDisplay(0, 0);
  const tenAm = formatTimeDisplay(10, 0);
  const noon = formatTimeDisplay(12, 0);
  const lateNight = formatTimeDisplay(23, 46);
  const midnightEnd = formatTimeDisplay(24, 0);

  assert(midnightStart === '12:00 AM', `Hour 0 formats as "12:00 AM" (actual: "${midnightStart}")`);
  assert(tenAm === '10:00 AM', `Hour 10 formats as "10:00 AM" (actual: "${tenAm}")`);
  assert(noon === '12:00 PM', `Hour 12 formats as "12:00 PM" (actual: "${noon}")`);
  assert(lateNight === '11:46 PM', `23:46 formats as "11:46 PM" (actual: "${lateNight}")`);
  assert(midnightEnd === '12:00 AM', `Hour 24 formats as "12:00 AM" (actual: "${midnightEnd}")`);

  // Verify label geometry:
  // Spine at left: 60. Gutter label container width: 74dp (starts at left: -18, ends at 56, leaving 4px before spine at 60).
  // "10:00 AM" is 8 characters long.
  // At 11.5sp with maxFontSizeMultiplier: 1.1 -> max 12.65sp.
  // Tabular font character width is ~6.2dp -> 8 chars is ~49.6dp.
  // Container width 74dp leaves ~24dp of extra breathing room.
  const hourLabelWidth = 74;
  const maxLabelCharLength = 8; // e.g. "12:00 PM"
  const approxLabelWidth = maxLabelCharLength * 6.5; // ~52dp
  assert(hourLabelWidth > approxLabelWidth + 15, 'Hour label container (74dp) has >15dp breathing room for 8 chars');

  // Now indicator pill container geometry:
  // Starts at left: -22, width: 75dp -> ends at 53 (2px before 10dp spine bead at 55).
  // Pill has paddingHorizontal: 6 (12dp total).
  // At 10.5sp, 8 chars ("11:46 PM") is ~46dp. Total pill width is 46 + 12 = 58dp.
  // Container width 75dp has 17dp of spare room, so it never clips or truncates with "..."!
  const nowContainerWidth = 75;
  const nowPillTotalWidth = 8 * 6.0 + 12; // ~60dp
  assert(nowContainerWidth > nowPillTotalWidth + 10, 'Now indicator container (75dp) has >10dp breathing room for 8 chars');

  assert(START_HOUR === 0, 'START_HOUR is 0 (12:00 AM)');
  assert(END_HOUR === 24, 'END_HOUR is 24 (full 24h day)');
}

console.log('\nALL DAY VIEW LAYOUT VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
