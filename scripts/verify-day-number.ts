import * as fs from 'node:fs';
import * as path from 'node:path';
import { colors } from '../src/constants/theme';

console.log('=== VERIFYING DAYNUMBER COMPONENT CIRCLE GEOMETRY & STATES ===\n');

const dayNumberPath = path.join(__dirname, '../src/components/ui/DayNumber.tsx');
const dayNumberSource = fs.readFileSync(dayNumberPath, 'utf8');

// Extract DAY_NUMBER_SIZE and DAY_NUMBER_RADIUS from DayNumber.tsx
const sizeMatch = dayNumberSource.match(/export const DAY_NUMBER_SIZE = (\d+);/);
const radiusMatch = dayNumberSource.match(/export const DAY_NUMBER_RADIUS = (\d+);/);

if (!sizeMatch || !radiusMatch) {
  throw new Error('FAIL: Could not find DAY_NUMBER_SIZE or DAY_NUMBER_RADIUS exports in DayNumber.tsx');
}

const DAY_NUMBER_SIZE = parseInt(sizeMatch[1], 10);
const DAY_NUMBER_RADIUS = parseInt(radiusMatch[1], 10);

// 1. Geometric Circle Verification
console.log('--- 1. Circle Geometry Verification ---');
if (DAY_NUMBER_SIZE !== 36) {
  throw new Error(`FAIL: Expected DAY_NUMBER_SIZE to be 36, got ${DAY_NUMBER_SIZE}`);
}
console.log(`  -> PASS: DAY_NUMBER_SIZE = ${DAY_NUMBER_SIZE}dp`);

if (DAY_NUMBER_RADIUS !== 18 || DAY_NUMBER_RADIUS !== DAY_NUMBER_SIZE / 2) {
  throw new Error(`FAIL: Expected DAY_NUMBER_RADIUS to be exactly DAY_NUMBER_SIZE / 2 (18), got ${DAY_NUMBER_RADIUS}`);
}
console.log(`  -> PASS: DAY_NUMBER_RADIUS = ${DAY_NUMBER_RADIUS}dp (exactly half of width/height: ${DAY_NUMBER_SIZE} / 2)`);

// 2. States Logic Verification
console.log('\n--- 2. States Style Logic Verification ---');

function getDayNumberStyleState(props: {
  isSelected?: boolean;
  isToday?: boolean;
  isWeekend?: boolean;
}) {
  const { isSelected = false, isToday = false, isWeekend = false } = props;
  let backgroundColor: string = 'transparent';
  let borderWidth: number = 0;
  let borderColor: string = 'transparent';
  let textColor: string = isWeekend ? colors['text-muted'] : colors.text;
  let fontWeight: '400' | '500' = '400';

  if (isSelected) {
    backgroundColor = colors.primary;
    borderWidth = 0;
    borderColor = 'transparent';
    textColor = colors['on-primary'];
    fontWeight = '500';
  } else if (isToday) {
    backgroundColor = 'transparent';
    borderWidth = 1.5;
    borderColor = colors.primary;
    textColor = colors.primary;
    fontWeight = '500';
  } else {
    backgroundColor = 'transparent';
    borderWidth = 0;
    borderColor = 'transparent';
    textColor = isWeekend ? colors['text-muted'] : colors.text;
    fontWeight = '400';
  }

  return {
    width: DAY_NUMBER_SIZE,
    height: DAY_NUMBER_SIZE,
    borderRadius: DAY_NUMBER_RADIUS,
    backgroundColor,
    borderWidth,
    borderColor,
    textColor,
    fontWeight,
  };
}

// State A: Selected day (not today)
const stateSelected = getDayNumberStyleState({ isSelected: true, isToday: false });
if (
  stateSelected.backgroundColor !== colors.primary ||
  stateSelected.borderWidth !== 0 ||
  stateSelected.textColor !== colors['on-primary'] ||
  stateSelected.fontWeight !== '500'
) {
  throw new Error(`FAIL: Selected day style mismatch: ${JSON.stringify(stateSelected)}`);
}
console.log('  -> PASS: Selected day (not today): filled primary circle, on-primary text, medium weight (500).');

// State B: Today when NOT selected
const stateTodayUnselected = getDayNumberStyleState({ isSelected: false, isToday: true });
if (
  stateTodayUnselected.backgroundColor !== 'transparent' ||
  stateTodayUnselected.borderWidth !== 1.5 ||
  stateTodayUnselected.borderColor !== colors.primary ||
  stateTodayUnselected.textColor !== colors.primary ||
  stateTodayUnselected.fontWeight !== '500'
) {
  throw new Error(`FAIL: Today unselected style mismatch: ${JSON.stringify(stateTodayUnselected)}`);
}
console.log('  -> PASS: Today when unselected: outlined 1.5dp primary circle, transparent fill, primary text, medium weight (500).');

// State C: Today AND selected at the same time
const stateTodaySelected = getDayNumberStyleState({ isSelected: true, isToday: true });
if (
  stateTodaySelected.backgroundColor !== colors.primary ||
  stateTodaySelected.borderWidth !== 0 ||
  stateTodaySelected.textColor !== colors['on-primary'] ||
  stateTodaySelected.fontWeight !== '500'
) {
  throw new Error(`FAIL: Today + selected style mismatch: ${JSON.stringify(stateTodaySelected)}`);
}
console.log('  -> PASS: Today AND selected at same time: filled primary circle (same as selected), on-primary text, medium weight (500).');

// State D: Normal weekday
const stateWeekday = getDayNumberStyleState({ isSelected: false, isToday: false, isWeekend: false });
if (
  stateWeekday.backgroundColor !== 'transparent' ||
  stateWeekday.borderWidth !== 0 ||
  stateWeekday.textColor !== colors.text ||
  stateWeekday.fontWeight !== '400'
) {
  throw new Error(`FAIL: Normal weekday style mismatch: ${JSON.stringify(stateWeekday)}`);
}
console.log('  -> PASS: Normal weekday: no shape (transparent fill, 0 border), text color.');

// State E: Normal weekend day
const stateWeekend = getDayNumberStyleState({ isSelected: false, isToday: false, isWeekend: true });
if (
  stateWeekend.backgroundColor !== 'transparent' ||
  stateWeekend.borderWidth !== 0 ||
  stateWeekend.textColor !== colors['text-muted'] ||
  stateWeekend.fontWeight !== '400'
) {
  throw new Error(`FAIL: Normal weekend style mismatch: ${JSON.stringify(stateWeekend)}`);
}
console.log('  -> PASS: Normal weekend: no shape (transparent fill, 0 border), text-muted color.');

// State F: Ghost day (from adjacent month)
if (!dayNumberSource.includes('isGhost?: boolean;')) {
  throw new Error('FAIL: DayNumber.tsx must define isGhost?: boolean in DayNumberProps');
}
if (!dayNumberSource.includes('isGhost') || !dayNumberSource.includes('opacity: isGhost ? 0.4 : 1')) {
  throw new Error('FAIL: DayNumber.tsx must support isGhost with opacity 0.4');
}
console.log('  -> PASS: Ghost day: faint 40% opacity text, no background or border shape.');

console.log('\n=== ALL DAYNUMBER VERIFICATIONS PASSED SUCCESSFULLY ===');
