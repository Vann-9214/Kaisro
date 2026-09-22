import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- Verifying QuickAdd Save Button Architecture ---');

// 1. Check QuickAddBottomSheet.tsx has the fixed footer in the sheet shell
const bottomSheetPath = path.resolve(__dirname, '../src/components/QuickAddBottomSheet.tsx');
const bottomSheetContent = fs.readFileSync(bottomSheetPath, 'utf8');

assert(bottomSheetContent.includes('footer={fixedFooter}'), 'QuickAddBottomSheet must pass footer={fixedFooter} to BottomSheet');
assert(bottomSheetContent.includes('minHeight: layout.footerButtonHeight'), 'Footer button must use layout.footerButtonHeight');
assert(bottomSheetContent.includes('backgroundColor: colors.primary'), 'Footer button must use semantic token colors.primary');
assert(bottomSheetContent.includes("colors['on-primary']"), 'Footer text/icon must use semantic token on-primary');
assert(bottomSheetContent.includes('insets.bottom'), 'Footer must respect safe area insets');

// Verify label logic
assert(bottomSheetContent.includes("'Save Event'"), "Label for event tab must be 'Save Event'");
assert(bottomSheetContent.includes("'Save Task'"), "Label for task tab must be 'Save Task'");
assert(bottomSheetContent.includes("'Record Expense'"), "Label for transaction tab must be 'Record Expense'");
assert(bottomSheetContent.includes("'Save Note'"), "Label for note tab must be 'Save Note'");
assert(bottomSheetContent.includes("'Save changes'"), "Label in edit mode must be 'Save changes'");

// 2. Verify all 4 forms implement forwardRef and useImperativeHandle with submit()
const forms = [
  { name: 'EventForm', file: '../src/components/events/EventForm.tsx' },
  { name: 'TaskForm', file: '../src/components/tasks/TaskForm.tsx' },
  { name: 'ExpenseForm', file: '../src/components/expenses/ExpenseForm.tsx' },
  { name: 'NoteForm', file: '../src/components/notes/NoteForm.tsx' },
];

for (const form of forms) {
  const formPath = path.resolve(__dirname, form.file);
  const content = fs.readFileSync(formPath, 'utf8');

  assert(content.includes('forwardRef'), `${form.name} must use forwardRef`);
  assert(content.includes('useImperativeHandle'), `${form.name} must use useImperativeHandle`);
  assert(content.includes('submit: async ()'), `${form.name} must expose submit: async ()`);
  assert(!content.includes('disabled={isSubmitting}'), `${form.name} must not contain internal submit button`);
  console.log(`✓ ${form.name} properly implements QuickAddFormHandle without internal save button`);
}

// 3. Verify useUIStore supports editing all 4 item types
const storePath = path.resolve(__dirname, '../src/store/useUIStore.ts');
const storeContent = fs.readFileSync(storePath, 'utf8');
assert(storeContent.includes('editingEvent: Event | null;'), 'useUIStore must have editingEvent');
assert(storeContent.includes('editingTask: Task | null;'), 'useUIStore must have editingTask');
assert(storeContent.includes('editingTransaction: Transaction | null;'), 'useUIStore must have editingTransaction');
assert(storeContent.includes('editingNote: Note | null;'), 'useUIStore must have editingNote');

console.log('✓ useUIStore supports editing all 4 entity types');
console.log('--- All QuickAdd Save Button Architecture Checks Passed! ---');
