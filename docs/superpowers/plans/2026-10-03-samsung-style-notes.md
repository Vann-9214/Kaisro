# Samsung Notes-Style Dedicated Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Notes experience from a cramped bottom-sheet textbox into a dedicated Samsung Notes-style experience featuring a full-screen note editor and a search-enabled card list.

**Architecture:** A new dedicated route `app/note.tsx` in Expo Router stack handles full-screen note viewing, writing, and debounced auto-saving. `app/(tabs)/notes.tsx` provides a sleek list view of note cards with title, preview snippet, last-edited timestamp, and dynamic search filtering. The global FAB on `/notes` and the QuickAdd sheet navigate directly to `app/note.tsx`.

**Tech Stack:** Expo React Native, TypeScript, Expo Router, NativeWind, SQLite via Drizzle ORM, Zustand, Lucide React Native.

## Global Constraints
- Mobile-only (Android and iOS). Never target, test, or add code for web.
- Use only existing semantic theme tokens: `background`, `surface`, `surface-raised`, `overlay`, `text`, `text-muted`, `border`, `primary`, `error`.
- Respect safe areas: headers clear status bar, content clears tab bar/FAB.
- Never add dummy/sample data to screens or hooks.
- All interactive controls have min-height 44px touch target and accessibility attributes.
- Use isolated temporary SQLite database for verification scripts; never touch real app data.

---

### Task 1: Verification Test for Note CRUD & Search Filtering

**Files:**
- Create: `scripts/verify-note-experience.ts`

**Interfaces:**
- Consumes: `src/db/schema.ts` (`notes`, `Note`, `NewNote`), `drizzle-orm` (`eq`, `sql`, `desc`, `like`)
- Produces: automated test proving note creation, updates, ordered retrieval, search filtering, and deletion against an in-memory SQLite database.

- [ ] **Step 1: Write the verification script**
Create `scripts/verify-note-experience.ts` testing note creation, debounced auto-save update, search by title/body substring, and note deletion.

- [ ] **Step 2: Run verification script**
Run `npx ts-node scripts/verify-note-experience.ts` to verify database operations.

- [ ] **Step 3: Commit**
`git add scripts/verify-note-experience.ts`  
`git commit -m "test: add verification test for notes CRUD and search"`

---

### Task 2: Create Full-Screen Note Editor Screen (`app/note.tsx`)

**Files:**
- Create: `app/note.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: Expo Router `useLocalSearchParams`, `router.back()`, `useCalendarSync` store, `drizzle-orm`, `src/db/schema.ts`
- Produces: Full-screen note document editor with top bar (back arrow with auto-save flush, saved indicator, delete dialog), borderless title input, character count metadata, expansive body canvas, and debounced auto-save.

- [ ] **Step 1: Register `note` route in `app/_layout.tsx`**
Add `<Stack.Screen name="note" options={{ headerShown: false, animation: 'slide_from_right' }} />` to the RootLayout Stack.

- [ ] **Step 2: Create `app/note.tsx`**
Implement full-screen editor with:
- Safe area header with `ChevronLeft` back button, "Saved" or modified time status, and `Trash2` delete button with confirmation dialog.
- Large borderless Title `TextInput` (`text-2xl font-bold`).
- Date & character count info row.
- Expansive multiline Body `TextInput` (`flex-1`, `textAlignVertical: 'top'`) where user can tap anywhere to write freely.
- Debounced auto-save (500ms) with flush on unmount / back press.
- Clean cleanup if a newly opened note was left completely blank.

- [ ] **Step 3: Verify TypeScript compilation**
Run `npx tsc --noEmit`.

- [ ] **Step 4: Commit**
`git add app/_layout.tsx app/note.tsx`  
`git commit -m "feat: add dedicated full-screen note editor screen"`

---

### Task 3: Refactor Notes Tab with Search & Card List (`app/(tabs)/notes.tsx`)

**Files:**
- Modify: `app/(tabs)/notes.tsx`

**Interfaces:**
- Consumes: `schema.notes`, `useCalendarSync`, `router.push`, `colors`, `spacing`, `TopBar`, `EmptyState`
- Produces: Redesigned Notes tab with live Search input, clean note cards showing title, snippet, and last edited date, navigating to `/note?id=${note.id}` on tap.

- [ ] **Step 1: Update `app/(tabs)/notes.tsx`**
Implement search input at the top with clear button, filter notes list in real time by title or body, format note cards with title, 3-line body snippet, formatted date, and press handler navigating to `/note?id=${note.id}`.

- [ ] **Step 2: Verify TypeScript and UI rules**
Run `npx tsc --noEmit` and `npx ts-node scripts/check-ui-rules.ts`.

- [ ] **Step 3: Commit**
`git add app/(tabs)/notes.tsx`  
`git commit -m "feat: redesign notes tab with search and card preview list"`

---

### Task 4: Integrate FAB and QuickAdd Navigation

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `src/components/QuickAddBottomSheet.tsx`

**Interfaces:**
- Consumes: `router.push('/note')`, `useUIStore.getState().closeAddSheet`
- Produces: FloatingAddButton on `/notes` tab navigates directly to `/note`; tapping Note tab in QuickAdd closes the sheet and navigates to `/note`.

- [ ] **Step 1: Update `app/(tabs)/_layout.tsx`**
Update FAB onPress to navigate to `/note` directly when pathname is `'/notes'`.

- [ ] **Step 2: Update `src/components/QuickAddBottomSheet.tsx`**
When `handleTabPress('note')` is triggered, close sheet and `router.push('/note')`.

- [ ] **Step 3: Verify with `npx tsc --noEmit` and UI checkers**
Run `npx tsc --noEmit` and `npx ts-node scripts/check-ui-rules.ts`.

- [ ] **Step 4: Commit**
`git add app/(tabs)/_layout.tsx src/components/QuickAddBottomSheet.tsx`  
`git commit -m "feat: link notes tab FAB and quick add note tab to note editor"`

---

### Task 5: Final End-to-End Verification

**Files:**
- Test scripts: `scripts/verify-note-experience.ts`, `scripts/check-ui-rules.ts`

- [ ] **Step 1: Run isolated SQLite verification**
Run `npx ts-node scripts/verify-note-experience.ts`.

- [ ] **Step 2: Run UI rules check**
Run `npx ts-node scripts/check-ui-rules.ts`.

- [ ] **Step 3: Run full TypeScript check**
Run `npx tsc --noEmit`.

- [ ] **Step 4: Commit & Final Summary**
Ensure all changes are clean and committed.
