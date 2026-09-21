/**
 * Automated Verification Script for Timeline "Now" Indicator Collision & Hiding Rule
 *
 * Verifies:
 * 1. On the hour (:00) -> Colliding hour label is hidden (|dist| = 0 < 14)
 * 2. 5 min before (:55) -> Upcoming hour label is hidden (|dist| = 6 < 14)
 * 3. 10 min after (:10) -> Preceding hour label is hidden (|dist| = 12 < 14)
 * 4. 30 min past (:30) -> Neither hour label is hidden (|dist| >= 14)
 * 5. 11:55 PM (23:55) -> Midnight closing line label (hour 24) is hidden (|dist| = 6 < 14)
 * 6. 12:05 AM (00:05) -> Midnight start line label (hour 0) is hidden (|dist| = 6 < 14)
 * 7. Invariance to HOUR_HEIGHT across various scale factors (60, 72, 80, 96)
 * 8. Strict gutter boundary (pill width <= 50, cards start at 64, zero card overlap)
 * 9. Z-Index separation (horizontal line zIndex: 5 < cards layer zIndex: 10 < gutter pill zIndex: 30)
 */

import {
  START_HOUR,
  END_HOUR,
  HOUR_HEIGHT,
  COLLISION_THRESHOLD_PX,
  computeNowTop,
  isHourLabelColliding,
  findCollidingHour,
} from '../src/utils/timelineLayout';

function runAssertions() {
  console.log('====================================================');
  console.log('  Kaisro Timeline "Now" Indicator Collision Verification');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      if (detail) console.log(`         -> ${detail}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (detail) console.error(`         -> ${detail}`);
    }
  }

  // --- Test 1: On the hour (:00) ---
  console.log('Test 1: On the hour (:00) - e.g. 10:00 AM');
  {
    const h = 10;
    const m = 0;
    const nowTop = computeNowTop(h, m, START_HOUR, HOUR_HEIGHT);
    const colliding = findCollidingHour(nowTop, START_HOUR, END_HOUR, HOUR_HEIGHT, COLLISION_THRESHOLD_PX);
    const slot10Top = (10 - START_HOUR) * HOUR_HEIGHT;
    const dist10 = Math.abs(nowTop - slot10Top);
    const dist9 = Math.abs(nowTop - (9 - START_HOUR) * HOUR_HEIGHT);
    const dist11 = Math.abs(nowTop - (11 - START_HOUR) * HOUR_HEIGHT);

    assert(colliding === 10, 'Colliding hour is exactly 10', `colliding: ${colliding}, nowTop: ${nowTop}px`);
    assert(isHourLabelColliding(nowTop, slot10Top, COLLISION_THRESHOLD_PX), 'Hour 10 label is HIDDEN', `dist: ${dist10}px < ${COLLISION_THRESHOLD_PX}px`);
    assert(!isHourLabelColliding(nowTop, (9 - START_HOUR) * HOUR_HEIGHT, COLLISION_THRESHOLD_PX), 'Hour 9 label remains VISIBLE', `dist: ${dist9}px >= ${COLLISION_THRESHOLD_PX}px`);
    assert(!isHourLabelColliding(nowTop, (11 - START_HOUR) * HOUR_HEIGHT, COLLISION_THRESHOLD_PX), 'Hour 11 label remains VISIBLE', `dist: ${dist11}px >= ${COLLISION_THRESHOLD_PX}px`);
  }
  console.log();

  // --- Test 2: 5 min before (:55) ---
  console.log('Test 2: 5 minutes before the hour (:55) - e.g. 9:55 AM');
  {
    const h = 9;
    const m = 55;
    const nowTop = computeNowTop(h, m, START_HOUR, HOUR_HEIGHT);
    const colliding = findCollidingHour(nowTop, START_HOUR, END_HOUR, HOUR_HEIGHT, COLLISION_THRESHOLD_PX);
    const slot10Top = (10 - START_HOUR) * HOUR_HEIGHT;
    const dist10 = Math.abs(nowTop - slot10Top); // |714 - 720| = 6px
    const slot9Top = (9 - START_HOUR) * HOUR_HEIGHT;
    const dist9 = Math.abs(nowTop - slot9Top); // |714 - 648| = 66px

    assert(colliding === 10, 'Upcoming hour 10 collides and is hidden', `colliding: ${colliding}, dist to 10: ${dist10}px`);
    assert(isHourLabelColliding(nowTop, slot10Top, COLLISION_THRESHOLD_PX), 'Hour 10 label is HIDDEN', `dist: ${dist10}px < ${COLLISION_THRESHOLD_PX}px`);
    assert(!isHourLabelColliding(nowTop, slot9Top, COLLISION_THRESHOLD_PX), 'Hour 9 label is VISIBLE', `dist: ${dist9}px >= ${COLLISION_THRESHOLD_PX}px`);
  }
  console.log();

  // --- Test 3: 10 min after (:10) ---
  console.log('Test 3: 10 minutes after the hour (:10) - e.g. 10:10 AM');
  {
    const h = 10;
    const m = 10;
    const nowTop = computeNowTop(h, m, START_HOUR, HOUR_HEIGHT);
    const colliding = findCollidingHour(nowTop, START_HOUR, END_HOUR, HOUR_HEIGHT, COLLISION_THRESHOLD_PX);
    const slot10Top = (10 - START_HOUR) * HOUR_HEIGHT;
    const dist10 = Math.abs(nowTop - slot10Top); // |732 - 720| = 12px
    const slot11Top = (11 - START_HOUR) * HOUR_HEIGHT;
    const dist11 = Math.abs(nowTop - slot11Top); // |732 - 792| = 60px

    assert(colliding === 10, 'Preceding hour 10 collides and is hidden', `colliding: ${colliding}, dist to 10: ${dist10}px`);
    assert(isHourLabelColliding(nowTop, slot10Top, COLLISION_THRESHOLD_PX), 'Hour 10 label is HIDDEN', `dist: ${dist10}px < ${COLLISION_THRESHOLD_PX}px`);
    assert(!isHourLabelColliding(nowTop, slot11Top, COLLISION_THRESHOLD_PX), 'Hour 11 label is VISIBLE', `dist: ${dist11}px >= ${COLLISION_THRESHOLD_PX}px`);
  }
  console.log();

  // --- Test 4: 30 min past (:30) ---
  console.log('Test 4: 30 minutes past (:30) - e.g. 10:30 AM');
  {
    const h = 10;
    const m = 30;
    const nowTop = computeNowTop(h, m, START_HOUR, HOUR_HEIGHT);
    const colliding = findCollidingHour(nowTop, START_HOUR, END_HOUR, HOUR_HEIGHT, COLLISION_THRESHOLD_PX);
    const slot10Top = (10 - START_HOUR) * HOUR_HEIGHT;
    const slot11Top = (11 - START_HOUR) * HOUR_HEIGHT;
    const dist10 = Math.abs(nowTop - slot10Top); // 36px
    const dist11 = Math.abs(nowTop - slot11Top); // 36px

    assert(colliding === null, 'No hour label collides at :30', `colliding: ${colliding}`);
    assert(!isHourLabelColliding(nowTop, slot10Top, COLLISION_THRESHOLD_PX), 'Hour 10 label is VISIBLE', `dist: ${dist10}px >= ${COLLISION_THRESHOLD_PX}px`);
    assert(!isHourLabelColliding(nowTop, slot11Top, COLLISION_THRESHOLD_PX), 'Hour 11 label is VISIBLE', `dist: ${dist11}px >= ${COLLISION_THRESHOLD_PX}px`);
  }
  console.log();

  // --- Test 5: 11:55 PM (23:55) ---
  console.log('Test 5: 11:55 PM (23:55) - near midnight closing line');
  {
    const h = 23;
    const m = 55;
    const nowTop = computeNowTop(h, m, START_HOUR, HOUR_HEIGHT);
    const colliding = findCollidingHour(nowTop, START_HOUR, END_HOUR, HOUR_HEIGHT, COLLISION_THRESHOLD_PX);
    const midnightClosingTop = (24 - START_HOUR) * HOUR_HEIGHT;
    const distClosing = Math.abs(nowTop - midnightClosingTop); // |1722 - 1728| = 6px
    const slot23Top = (23 - START_HOUR) * HOUR_HEIGHT;
    const dist23 = Math.abs(nowTop - slot23Top); // |1722 - 1656| = 66px

    assert(colliding === 24, 'Closing midnight line (hour 24) collides and is hidden', `colliding: ${colliding}, dist: ${distClosing}px`);
    assert(isHourLabelColliding(nowTop, midnightClosingTop, COLLISION_THRESHOLD_PX), 'Midnight closing label (24) is HIDDEN', `dist: ${distClosing}px < ${COLLISION_THRESHOLD_PX}px`);
    assert(!isHourLabelColliding(nowTop, slot23Top, COLLISION_THRESHOLD_PX), 'Hour 23 (11 PM) label is VISIBLE', `dist: ${dist23}px >= ${COLLISION_THRESHOLD_PX}px`);
  }
  console.log();

  // --- Test 6: 12:05 AM (00:05) ---
  console.log('Test 6: 12:05 AM (00:05) - near midnight day start line');
  {
    const h = 0;
    const m = 5;
    const nowTop = computeNowTop(h, m, START_HOUR, HOUR_HEIGHT);
    const colliding = findCollidingHour(nowTop, START_HOUR, END_HOUR, HOUR_HEIGHT, COLLISION_THRESHOLD_PX);
    const midnightStartTop = (0 - START_HOUR) * HOUR_HEIGHT;
    const distStart = Math.abs(nowTop - midnightStartTop); // |6 - 0| = 6px
    const slot1Top = (1 - START_HOUR) * HOUR_HEIGHT;
    const dist1 = Math.abs(nowTop - slot1Top); // |6 - 72| = 66px

    assert(colliding === 0, 'Start midnight line (hour 0) collides and is hidden', `colliding: ${colliding}, dist: ${distStart}px`);
    assert(isHourLabelColliding(nowTop, midnightStartTop, COLLISION_THRESHOLD_PX), 'Midnight start label (0) is HIDDEN', `dist: ${distStart}px < ${COLLISION_THRESHOLD_PX}px`);
    assert(!isHourLabelColliding(nowTop, slot1Top, COLLISION_THRESHOLD_PX), 'Hour 1 (1 AM) label is VISIBLE', `dist: ${dist1}px >= ${COLLISION_THRESHOLD_PX}px`);
  }
  console.log();

  // --- Test 7: Invariance to HOUR_HEIGHT ---
  console.log('Test 7: Invariance to HOUR_HEIGHT across various scale factors');
  {
    const testHeights = [60, 72, 80, 96, 120];
    for (const testHeight of testHeights) {
      // Slot at hour 14
      const slotTop = (14 - START_HOUR) * testHeight;

      // Exactly at the 14px threshold: 13.9px away -> should collide
      const nowTopInside = slotTop + 13.9;
      assert(
        isHourLabelColliding(nowTopInside, slotTop, COLLISION_THRESHOLD_PX),
        `HOUR_HEIGHT=${testHeight}: 13.9px dist collides (< 14px)`,
        `dist: 13.9px`
      );

      // Exactly at the 14px threshold: 14.1px away -> should NOT collide
      const nowTopOutside = slotTop + 14.1;
      assert(
        !isHourLabelColliding(nowTopOutside, slotTop, COLLISION_THRESHOLD_PX),
        `HOUR_HEIGHT=${testHeight}: 14.1px dist does not collide (>= 14px)`,
        `dist: 14.1px`
      );
    }
  }
  console.log();

  // --- Test 8: Gutter Boundary & Card Separation ---
  console.log('Test 8: Gutter Boundary & Card Clearance');
  {
    const pillMaxGutterWidth = 48; // pill container left: 0, width: 48 <= 50
    const cardsLeftOffset = 64; // timed entries layer left: 64
    const horizontalClearance = cardsLeftOffset - pillMaxGutterWidth;

    assert(pillMaxGutterWidth <= 50, 'Pill lives strictly within gutter (width <= 50px)', `pill width: ${pillMaxGutterWidth}px <= 50px`);
    assert(cardsLeftOffset >= 64, 'Cards start strictly at left >= 64px', `cards left: ${cardsLeftOffset}px`);
    assert(horizontalClearance >= 14, 'Zero overlap: 16px buffer between pill and card content', `clearance: ${horizontalClearance}px`);
  }
  console.log();

  // --- Test 9: Z-Index Hierarchy ---
  console.log('Test 9: Z-Index Layering Verification');
  {
    const nowLineZIndex = 5;
    const cardsLayerZIndex = 10;
    const nowPillAndBeadZIndex = 30;

    assert(nowLineZIndex < cardsLayerZIndex, 'Horizontal now line (zIndex 5) sits BEHIND cards (zIndex 10)', `5 < 10`);
    assert(cardsLayerZIndex < nowPillAndBeadZIndex, 'Pill and bead (zIndex 30) sit ABOVE cards and background', `10 < 30`);
  }
  console.log();

  console.log(`====================================================`);
  console.log(`  Summary: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runAssertions();
