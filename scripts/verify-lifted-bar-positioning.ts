import {
  calculateLiftedBarPosition,
  getFieldNavigation,
} from '../src/utils/keyboardLayout';

console.log('=== 1. VERIFYING PURE LIFTED BAR POSITIONING FUNCTION ===\n');

// Case 1: Keyboard hidden
// Window height: 800, keyboard is off-screen (keyboardScreenY = 800)
{
  const result = calculateLiftedBarPosition({
    initialWindowHeight: 800,
    currentWindowHeight: 800,
    keyboardScreenY: 800,
    keyboardHeight: 0,
    bottomInset: 48,
  });

  console.log('Case 1: Keyboard hidden');
  console.log(`  Output: bottomOffset=${result.bottomOffset}, isKeyboardVisible=${result.isKeyboardVisible}, systemDidResize=${result.systemDidResize}`);

  if (result.isKeyboardVisible !== false) {
    throw new Error('Expected isKeyboardVisible to be false when keyboard is hidden');
  }
  if (result.bottomOffset !== 0) {
    throw new Error(`Expected bottomOffset to be 0, got ${result.bottomOffset}`);
  }
  console.log('  ✓ PASS: Bar hidden, bottomOffset 0.\n');
}

// Case 2: Keyboard visible when the system does NOT resize the window (edge-to-edge)
// Window height: 848 before and after. Keyboard height = 300.
{
  const result = calculateLiftedBarPosition({
    initialWindowHeight: 848,
    currentWindowHeight: 848,
    keyboardScreenY: 548,
    keyboardHeight: 300,
    bottomInset: 0,
  });

  console.log('Case 2: Keyboard visible when system does NOT resize window (edge-to-edge)');
  console.log(`  Output: bottomOffset=${result.bottomOffset}, isKeyboardVisible=${result.isKeyboardVisible}, systemDidResize=${result.systemDidResize}`);

  if (result.isKeyboardVisible !== true) {
    throw new Error('Expected isKeyboardVisible to be true');
  }
  if (result.systemDidResize !== false) {
    throw new Error('Expected systemDidResize to be false');
  }
  if (result.bottomOffset !== 372) {
    throw new Error(`Expected bottomOffset to be 372, got ${result.bottomOffset}`);
  }
  console.log('  ✓ PASS: Bar sits above keyboard with 72dp clearance (offset 372dp in 848dp window).\n');
}

// Case 3: Keyboard visible when the system DOES resize the window (adjustResize)
// Initial window height: 800. System resized window to 500 (shrunk by 300dp).
// Keyboard top edge screenY is 500 (at bottom of resized window).
{
  const result = calculateLiftedBarPosition({
    initialWindowHeight: 800,
    currentWindowHeight: 500,
    keyboardScreenY: 500,
    keyboardHeight: 300,
    bottomInset: 0,
  });

  console.log('Case 3: Keyboard visible when system DOES resize window');
  console.log(`  Output: bottomOffset=${result.bottomOffset}, isKeyboardVisible=${result.isKeyboardVisible}, systemDidResize=${result.systemDidResize}`);

  if (result.isKeyboardVisible !== true) {
    throw new Error('Expected isKeyboardVisible to be true');
  }
  if (result.systemDidResize !== true) {
    throw new Error('Expected systemDidResize to be true');
  }
  if (result.bottomOffset !== 0) {
    throw new Error(`Expected bottomOffset to be 0 in resized window, got ${result.bottomOffset}`);
  }
  console.log('  ✓ PASS: System window resize detected; bar docks to bottom with offset 0 (no double adjustment).\n');
}

// Case 4: Docking on tall keyboard with 72dp clearance
// Keyboard height: 350dp
{
  const result = calculateLiftedBarPosition({
    initialWindowHeight: 848,
    currentWindowHeight: 848,
    keyboardScreenY: 498,
    keyboardHeight: 350,
    bottomInset: 48,
  });

  console.log('Case 4: Docking on tall keyboard with 72dp clearance');
  console.log(`  Output: bottomOffset=${result.bottomOffset}, isKeyboardVisible=${result.isKeyboardVisible}`);

  if (result.bottomOffset !== 422) {
    throw new Error(`Expected bottomOffset to be 422, got ${result.bottomOffset}`);
  }
  console.log(`  ✓ PASS: Bar docks at ${result.bottomOffset}dp (350dp keyboard + 72dp clearance).\n`);
}

console.log('=== 2. VERIFYING FIELD-ORDER NAVIGATION LOGIC ===\n');

// Test Event form field: 'title' is standalone with Done action
{
  const eventTitleOrder = ['title'];
  const step = getFieldNavigation(eventTitleOrder, 'title');
  console.log(`Event 'title': action=${step.action}, nextFieldId=${step.nextFieldId}`);
  if (step.action !== 'done' || step.nextFieldId !== null) {
    throw new Error("Expected 'title' -> done: null");
  }
  console.log('  ✓ PASS: Event title action is Done.\n');
}

// Test Task form field order: ['title', 'subtask_0', 'subtask_1']
{
  const taskFields = ['title', 'subtask_0', 'subtask_1'];

  const s1 = getFieldNavigation(taskFields, 'title');
  const s2 = getFieldNavigation(taskFields, 'subtask_0');
  const s3 = getFieldNavigation(taskFields, 'subtask_1');

  if (s1.action !== 'next' || s1.nextFieldId !== 'subtask_0') throw new Error('Task s1 mismatch');
  if (s2.action !== 'next' || s2.nextFieldId !== 'subtask_1') throw new Error('Task s2 mismatch');
  if (s3.action !== 'done' || s3.nextFieldId !== null) throw new Error('Task s3 mismatch');
  console.log('  ✓ PASS: Task field chaining (title -> subtask_0 -> subtask_1 -> done).\n');
}

// Test Expense form field order: ['amount', 'description']
{
  const expenseFields = ['amount', 'description'];

  const s1 = getFieldNavigation(expenseFields, 'amount');
  const s2 = getFieldNavigation(expenseFields, 'description');

  if (s1.action !== 'next' || s1.nextFieldId !== 'description') throw new Error('Expense s1 mismatch');
  if (s2.action !== 'done' || s2.nextFieldId !== null) throw new Error('Expense s2 mismatch');
  console.log('  ✓ PASS: Expense field chaining (amount -> description -> done).\n');
}

// Test Note form field order: ['title', 'body']
{
  const noteFields = ['title', 'body'];

  const s1 = getFieldNavigation(noteFields, 'title');
  const s2 = getFieldNavigation(noteFields, 'body');

  if (s1.action !== 'next' || s1.nextFieldId !== 'body') throw new Error('Note s1 mismatch');
  if (s2.action !== 'done' || s2.nextFieldId !== null) throw new Error('Note s2 mismatch');
  console.log('  ✓ PASS: Note field chaining (title -> body -> done).\n');
}

console.log('=== ALL TESTS PASSED SUCCESSFULLY ===');
