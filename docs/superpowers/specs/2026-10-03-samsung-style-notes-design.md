# Design Spec: Samsung Notes-Style Dedicated Notes Experience

**Date:** 2026-10-03  
**Status:** Approved  
**Topic:** Samsung Notes-Style Dedicated Notes UI and Editor

---

## 1. Context & Motivation

The previous Notes implementation constrained note creation and editing inside `QuickAddBottomSheet` using `NoteForm` with `LiftedField`s docked above the keyboard. For note taking, this created a cramped, fragmented experience where note content was edited through a single-line lifted input bar.

The user requested a typical mobile note-taking experience modeled after Samsung Notes:
- An open, expansive writing canvas rather than a small textbox or modal form.
- A clean, modern Notes tab with search and card previews.
- Dedicated full-screen note editor with seamless title and infinite body typing.
- Auto-saving on the fly with reliable persistence.

---

## 2. Architecture & Navigation Flow

### Route Structure
- Add a new dedicated Expo Router screen: `app/note.tsx`.
- Registered in root `app/_layout.tsx` Stack navigation with `headerShown: false` and `animation: 'slide_from_right'`.
- Supports query parameter `id`:
  - `router.push('/note')`: creates a new note.
  - `router.push({ pathname: '/note', params: { id: note.id } })`: opens existing note for viewing and editing.

### Trigger Points
1. **Notes Tab FAB**: When on `/notes`, tapping the floating action button navigates directly to `/note`.
2. **Notes Tab Card Tap**: Tapping any note card in `app/(tabs)/notes.tsx` navigates to `/note?id=${note.id}`.
3. **Notes Tab Empty State / Add Button**: Tapping "+ Add Note" navigates to `/note`.
4. **Global QuickAdd BottomSheet**: Tapping the "Note" tab in `QuickAddBottomSheet` closes the sheet and navigates to `/note`.

---

## 3. Screen Specifications

### A. Notes List Screen (`app/(tabs)/notes.tsx`)
1. **Top Bar**: Existing `TopBar` component with `featureName="Notes"`.
2. **Search Input**:
   - Positioned below the TopBar.
   - Clean, rounded input using `colors.surface` background, `Search` icon from `lucide-react-native`, placeholder "Search notes...", and a clear `X` button when search text is active.
   - Real-time client-side filtering matching note `title` or `body`.
3. **Notes Card List**:
   - `ScrollView` with standard padding (`spacing.lg`) and bottom padding accounting for tab bar dock and FAB.
   - Note card component:
     - Background: `colors.surface`, subtle border `colors.border`, rounded corners (`rounded-xl` or 12px).
     - Title: `colors.text`, font size 16, font weight 600, `numberOfLines={2}`.
     - Body snippet: `colors['text-muted']`, font size 13, leading 18, `numberOfLines={3}`, omitted if empty.
     - Metadata footer: formatted date/time (e.g. "Today 10:45 AM", "Oct 2, 2026") in `colors['text-muted']`, font size 11.
     - Optional tag pill if the note has associated tags.
4. **Empty State**:
   - If no notes exist in the database: `EmptyState` with title "No notes yet", description "Your notebook is completely open.", action "+ Add a note".
   - If search query has no results: inline empty indicator "No notes matching '{query}'".

### B. Full-Screen Note Editor Screen (`app/note.tsx`)
1. **Header Bar**:
   - Safe-area inset aware top padding.
   - Left: Back button (`ChevronLeft` / `ArrowLeft`, 44x44 touch target) with accessible label "Go back".
   - Center: Status text (`colors['text-muted']`, font size 12) showing "Saved" or last modified timestamp.
   - Right: Delete action (`Trash2` icon) prompting a native confirmation alert before deleting.
2. **Document Canvas**:
   - `KeyboardSafeScrollView` or `ScrollView` with `keyboardShouldPersistTaps="handled"`.
   - **Title Field**:
     - Seamless borderless `TextInput`.
     - Typography: 22px, font weight bold, color `colors.text`.
     - Placeholder: "Title" (`colors['text-muted']`).
     - Auto-capitalization: sentences.
   - **Divider & Metadata Row**:
     - Subtitle showing timestamp (e.g., "October 3, 2026, 10:45 AM") and character/word counter.
   - **Body Field**:
     - Seamless borderless multiline `TextInput`.
     - Typography: 16px, line height 24px, color `colors.text`.
     - Placeholder: "Start typing your note..." (`colors['text-muted']`).
     - `textAlignVertical: 'top'`.
     - Min height: 400px, flexes to fill available screen height so user can tap anywhere in the lower canvas to type.
3. **Auto-Save & State Management**:
   - Local state initialized from database row if `id` is provided; empty strings if new.
   - Debounced auto-save (500ms debounce) that updates SQLite using Drizzle ORM:
     - If new note: on first non-empty input, inserts new row and captures assigned `id`.
     - If existing note: updates `title`, `body`, and `updatedAt`.
     - If exiting/unmounting: flushes any pending debounced changes immediately.
     - If new note is completely empty on exit: does not save or leaves clean empty state.
   - Triggers `useCalendarSync.getState().triggerRefresh()` on every flush so notes list reflects the updated title/snippet immediately.

---

## 4. UI Rules & Design System Compliance

- **Mobile Only**: Targeted strictly for Android and iOS.
- **Theme Tokens**: All colors use semantic tokens (`colors.background`, `colors.surface`, `colors['surface-raised']`, `colors.text`, `colors['text-muted']`, `colors.border`, `colors.primary`, `colors.error`).
- **Spacing**: strictly adheres to `spacing.xs` (4), `spacing.sm` (8), `spacing.md` (14), `spacing.lg` (20), `spacing.xl` (32).
- **Typography**: all `Text` components include `maxFontSizeMultiplier={layout.maxFontScale}`.
- **Accessibility**: all interactive icons have `minHeight: 44, minWidth: 44`, `accessibilityRole="button"`, and descriptive labels.

---

## 5. Verification Plan

1. **Static Analysis**: Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
2. **UI Rules Verification**: Run `npx ts-node scripts/check-ui-rules.ts`.
3. **Database & Logic Test**: Create a standalone verification script `scripts/verify-note-experience.ts` using isolated SQLite client testing:
   - Create a note with title and body.
   - Update note title and body (simulating auto-save).
   - Fetch ordered notes by `updatedAt DESC`.
   - Search notes filtering by keyword in title and body.
   - Delete note.
