# Design Spec: Remove In-Typing Save Button Across All Quick-Add Tabs and Sheets

**Date:** 2026-10-03  
**Status:** Approved  
**Topic:** Align Quick-Add typing bars with the Event tab pattern by removing in-typing Save buttons

---

## 1. Context & Motivation

Previously, `QuickAddBottomSheet` provided an `overlayFooter` (`<SheetSaveFooter ... compact />`) rendered directly inside the floating `LiftedInputHost` typing card docked above the keyboard.

In commit `f5d87a5`, the user requested removing this keyboard-level Save button from the Event tab typing bar, leaving only the Next/Done button docked 8 dp above the keyboard while keeping the fixed Save footer on the bottom sheet. However, Task, Expense, and Note tabs still rendered the keyboard-level Save button, resulting in visual inconsistency and a cluttered typing interface across the other tabs.

The user requested eliminating this in-typing Save button for Task and all other tabs so that typing in any form behaves identically and cleanly.

---

## 2. Goals & Non-Goals

### Goals
- Remove the in-typing Save button from the keyboard overlay across all Quick-Add tabs (Task, Expense, Note, Event).
- Remove the in-typing Save button from `EditorSheet` (category editor) for complete visual consistency.
- Ensure all lifted typing cards float cleanly 8 dp (`spacing.sm`) above the keyboard.
- Maintain the fixed Save footer at the bottom of sheets for submitting forms once typing is completed or dismissed.
- Keep all unit rules and architecture tests passing with 0 TypeScript errors.

### Non-Goals
- Do not remove or alter the primary fixed Save footer anchored at the bottom of the bottom sheet.
- Do not alter the form validation or submission logic (`handleSave`, `submit` imperative handle).
- Do not change the Next/Done button behavior or keyboard dismissal flow.

---

## 3. Architecture & Component Changes

### 3.1 `QuickAddBottomSheet.tsx`
- Remove `overlayFooter` definition completely.
- Remove conditional `keyboardGap` ternary based on `activeAddType`.
- Render `<LiftedInputHost />` directly inside `BottomSheet`'s `overlay` prop.
- Keep `fixedFooter={<SheetSaveFooter label={buttonLabel} onPress={handleSave} saving={isSaving} />}` on the sheet.

### 3.2 `EditorSheet.tsx`
- Remove `overlayFooter` definition completely.
- Pass `<LiftedInputHost />` directly into `BottomSheet`'s `overlay` prop without a `footer`.
- Retain `footer={<SheetSaveFooter ... />}` on the sheet.

### 3.3 `LiftedInputHost.tsx`
- Set the default value of `keyboardGap` to `spacing.sm` (`8 dp`) in `LiftedInputHost` props:
  ```tsx
  export function LiftedInputHost({ footer, keyboardGap = spacing.sm }: { footer?: React.ReactNode; keyboardGap?: number })
  ```
- Keep `footer?: React.ReactNode` in the component props for backward compatibility, but it will be omitted by all callers in the app.

---

## 4. User Interaction & Data Flow

1. User taps (+) and selects any tab (Event, Task, Expense, Note).
2. Tapping any field launches the lifted input card smoothly 8 dp above the keyboard.
3. The lifted card displays the field label, Next/Done navigation button, and the focused text input.
4. When finished entering text, the user taps "Done" or taps the dimmed background scrim to dismiss the keyboard.
5. The sheet displays the fixed "Save [Item]" footer button at the bottom of the screen.
6. Tapping the Save button validates and submits the form as before.

---

## 5. Verification & Testing Plan

1. **Rule Checks:**
   - Update `scripts/check-ui-rules.ts` to assert that `QuickAddBottomSheet` and `EditorSheet` maintain sheet footers and use `<LiftedInputHost />` without in-typing Save footers.
   - Update `scripts/verify-quickadd-save-button.ts` to verify that all quick-add tabs only show Next/Done during typing, with the sheet footer handling saves.
2. **Type Checking:**
   - Run `npx tsc --noEmit` to verify type safety.
3. **Automated Checks:**
   - Run `npm run check:ui` to ensure adherence to UI architecture rules.
   - Run `npx tsx scripts/verify-quickadd-save-button.ts` to verify form handles and save button presence.
