# UI repairs — 2026-10-02

## Screenshot review

Opened all four supplied PNGs from the user's local Screenshots folder before
editing. Matching Stitch images and the design-system file are missing; no
design files were fetched. The table describes observed problems and code
repairs, not a claim of verified after-screenshots.

| Screenshot | Observed problem | Repair |
| --- | --- | --- |
| 162800 | Task date/time cards lose their borders and labels, with a large gap before Priority | Replace FormCard's Pressable style callback with static styles so NativeWind preserves padding, border, and equal flex widths |
| 162739 | Expense opens partway through Category; date/time rows have the same collapsed layout | Restore shared card styles and remount the form scroll container on tab, open/close, or edited-item changes |
| 162754 | Event input is partly behind the keyboard; Save and input appear as disconnected blocks | Compute docking from the measured modal viewport and keyboard top; the follow-up leaves Done in the input bar with 8 dp keyboard clearance |
| 162749 | Day view is scrolled to evening, Today is disabled, and there is excess bottom clearance | Keep Today available on today's date, use the real current time when jumping, and avoid adding a safe-area inset already reserved by the tab navigator |

The Day screenshot alone does not establish why it was scrolled to evening.
The repair adds a reliable way to return to the current time. Empty-day and
current-time scroll calculations passed checks.

## Related fixes and judgments

- The installed NativeWind interop merges style declarations as objects. A
  Pressable callback loses its styles in that merge. Fixed the same pattern in
  Month, Agenda, and shared empty-state actions; their existing dimensions and
  colors were retained. Added a source rule against callback styles there.
- Retained side-by-side date/time cards, existing semantic colors and spacing,
  and the lifted-field interaction. Task, Expense, and Note group Save with the
  input in one rounded surface. This is a visual judgment without Stitch.
- The input dock measures the modal rather than assuming its height matches the
  underlying app window. This covers modal-only resize, app-only resize, both
  resizing, and full-height overlays in the positioning checks.
- Opening a sheet does not focus an input. Field taps retain Next/Done behavior;
  the entrance animation respects Reduce Motion. Multiline input gets the full
  available row width. Save remains in the sheet footer. Task, Expense, and Note
  retain Save in the keyboard dock; Event shows Done there.
- Invalid Quick Add submissions dismiss the dock and scroll to show errors.
- No migrations or sample-data changes were needed. The tests used only a new
  in-memory SQLite database and the existing production migrations.

## Expo update

Applied the compatible patch updates with `npx.cmd expo install --fix`, following
the [Expo dependency update workflow](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

| Package | Installed before | Installed after |
| --- | --- | --- |
| expo | 57.0.24 | 57.0.26 |
| expo-constants | 57.0.19 | 57.0.20 |
| expo-linking | 57.0.10 | 57.0.11 |
| expo-router | 57.0.22 | 57.0.24 |

The lockfile records all four installed versions. Constants remains within its
existing compatible manifest range. SDK 57 is retained.

## Verification

Passed:

- `npx.cmd tsc --noEmit`
- `npm.cmd run check:ui`
- `npx.cmd tsx scripts/verify-ui-repairs.ts` — measured modal docking cases,
  isolated SQLite task date/time edits, integer centavos, Today and empty days
- `npx.cmd tsx scripts/verify-lifted-bar-positioning.ts`
- `npx.cmd tsx scripts/verify-quickadd-save-button.ts`
- `npx.cmd tsx scripts/verify-day-view-layout.ts`
- `npx.cmd expo install --check` — dependencies are up to date
- `npx.cmd expo export --platform android --output-dir .expo/ui-repair-android`
  — 4,143 modules bundled; output remains ignored locally

Metro reported an unreadable prior cache, rebuilt it, and completed the export.
PowerShell blocks `npx.ps1`, so commands used `npx.cmd`. The tsx runner required
execution outside the sandbox to read Windows user information.

## Phone checklist

Stop the existing Metro server with Ctrl+C, then run
`npx.cmd expo start --clear --go` and scan its new QR code in Expo Go.

- [ ] Open each Quick Add tab. It starts at the top with no keyboard; date/time
  cards have readable labels and values and the Save button stays visible.
- [ ] Scroll Expense to the bottom, switch to Task and back. Each tab begins at
  the top without carrying over the previous tab's scroll position.
- [ ] Tap Event title and Task title. The full input sits above the keyboard.
  Event shows Done with an 8 dp gap; Task retains Save. Try a tall keyboard and
  Android navigation buttons.
- [ ] Enter an expense amount, use Next for Description, then Done. Verify Save
  works both while typing and after dismissing the keyboard.
- [ ] Try Save with an empty title/invalid amount. The form error is visible.
- [ ] Open and close the date/time pickers. Save and reopen a dated task and an
  expense; verify values persist. Clear an optional task date/time.
- [ ] Scroll Day away from now and tap Today. Check the current-time line returns
  to view and the final rows clear the floating + button.
- [ ] Check Month, Agenda, and empty-state action buttons retain their borders,
  padding, labels, and touch targets.
- [ ] Repeat keyboard, safe-area, picker, and enlarged-text checks on iOS when
  available. No native device was connected during this verification.

## Follow-up: Event input and Router dependency

The Event input now shows Done without a keyboard-level Save Event button and
sits 8 dp above the keyboard. The Event sheet still offers Save after Done.
Task, Expense, and Note retain their existing keyboard-level Save buttons.
This is the user's requested exception to the earlier general Save convention.

The user reported an Android Metro error resolving `expo-glass-effect` from
Expo Router. The package was already in the lockfile as a Router dependency,
but a running Metro server can retain an older package graph. Installed the
Expo-compatible package as a direct dependency and ran a fresh Android export
with `--clear`; 4,143 modules bundled successfully. `expo install --check`,
TypeScript, UI rules, the temporary SQLite verification script, and the Quick
Add button check passed. Restart the existing Metro server, then use the
command in the phone checklist to load the new package graph.

## Follow-up: Event render loop and Android system navigation

The Event title registration effect previously set active-field state on every
render when its inline callback changed identity. Registration now updates a
ref only. Typing uses the current callback from that ref and updates the input
value. Event, Task, Expense, and Note retain their lifted-field interaction.

The two date picker owners now use `onValueChange` and `onDismiss`, which removes
the deprecated `onChange` warning while preserving selection and cancellation.

Installed `expo-navigation-bar` 57.0.3 to hide the Android system navigation
buttons while Kaisro is open. The module is included in Expo Go and Android
uses transient swipe reveal for hidden bars. The app restores the buttons when
the root unmounts. No native device was connected, so the system behavior still
needs phone verification.

TypeScript, UI rules, Expo compatibility check, the isolated SQLite UI script,
the Event CRUD script, and clean Android export passed. The export bundled
4,147 modules.

### Phone checks for this follow-up

- [ ] Open Event Quick Add, tap its title, type several characters, press Done,
  reopen the title, then save the event. Check that no maximum-depth error or
  picker warning appears in Metro.
- [ ] Pick and cancel Event start/end dates and times. Repeat with Task due date
  and Expense date; verify saved dates after reopening.
- [ ] Check that Android's three system buttons hide in Kaisro, swipe up from
  the bottom to reveal them temporarily, then return to Expo Go and confirm
  they are visible there. Check the sheet footer and keyboard safe areas.
