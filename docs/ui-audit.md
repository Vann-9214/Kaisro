# UI repair audit

Pre-repair code review baseline: 360 × 640 dp phone, 24 dp top and bottom system insets, roughly 280 dp keyboard, font scale 1.3. These are layout calculations, not device measurements. The local `.stitch-reference/` directory and `design-system.md` are absent, so no screenshot comparison is possible. Visual match remains unverified for every row.

At 640 dp, the quick-add sheet caps itself at 576 dp. Its create header is estimated at 120 dp and its footer at 103 dp (including a 24 dp bottom inset), so it allocates 353 dp to the body. A header that grows to about 150 dp at Large text makes the stack about 606 dp and clips roughly 30 dp at the bottom. The edit header has the same issue with its 85 dp estimate. At 360 dp width, four quick-add tabs each receive about 78 dp; an Expense icon, gap, and 1.3-scale label need more width. A 280 dp keyboard plus the current 72 dp extra lift, a roughly 120 dp field bar, and a 103 dp Save footer leave about 65 dp above the overlay; a multiline field can extend under the status bar.

| Screen or sheet | Defect | Root cause | Fix | Status |
| --- | --- | --- | --- | --- |
| Shared BottomSheet, quick-add create/edit | Save footer can clip on a 640 dp phone at Large text; body may not scroll enough | Estimated fixed header/footer heights and 90% max height with hidden overflow | Give the sheet a definite height and let flex layout allocate the actual header/footer space before the scroll body | Code fixed; phone pending |
| Lifted field overlay, all four create/edit tabs, category editor | Field/footer stack can reach status bar; Next/Done hit area is under 44 dp | 72 dp keyboard clearance and compact button | Dock to keyboard, bound overlay to safe space, enlarge button | Code fixed; phone pending |
| Quick-add header and four tabs | Expense tab can wrap; Close target is 28 dp | Four equal horizontal icon+label tabs and fixed close circle | Responsive tab content, 44 dp close target | Code fixed; phone pending |
| Shared cards, buttons, chips, segmented control | Card fill/radius and tappable control heights vary | FormCard uses background, Card uses surface and different radius; sm buttons/chips/segments are below 44 dp | Align shared tokens and give interactive controls 44 dp targets | Code fixed; phone pending |
| TopBar | Long feature name and right action can collide | Branding row has no flex shrink/truncation | Constrain title and give right action room | Code fixed; phone pending |
| Empty states (Day inline; Tasks/Budget/Notes full; Week/Agenda) | Actions are 34/40 dp; fixed line heights can clip Large text | Compact fixed buttons and line heights | Minimum 44 dp targets, scalable text and growth | Code fixed; phone pending |
| Calendar Day | Date header controls and all-day rows can be under 44 dp; long timeline cards have fixed heights | 40 dp navigation buttons and absolute timeline geometry | Enlarge navigation targets; retain deliberate timeline truncation and check card text | Code fixed; phone pending |
| Calendar Week | Compact WeekCard controls; fixed bottom reserve differs from other tabs | 110 dp bottom reserve and small mini-day targets | Use shared bottom clearance and enlarge controls | Code fixed; phone pending |
| Calendar Month | Date cells under 44 dp; fixed bottom reserve differs from other tabs | 32 dp day badge within a compact custom day and 90 dp reserve | Use shared bottom clearance and 44 dp interaction targets | Code fixed; phone pending |
| Calendar Agenda | Pinned day text and count can collide; bottom reserve fixed | Two unconstrained labels in a row; 110 dp reserve | Flex/shrink/truncate header; use shared clearance | Code fixed; phone pending |
| Tasks | Checkbox/expand and title press targets small; group heading can collide | 20 dp expand icon and unconstrained labels | Shared hit targets and bottom clearance; constrain heading text | Code fixed; phone pending |
| Budget | Month and amount can collide; nav/Manage targets small | Unconstrained FormRow right text and compact buttons | Shared bottom clearance, wrapping/truncation and 44 dp targets | Code fixed; phone pending |
| Manage categories | Edit/delete icon controls below 44 dp; long names can collide | Text/icon-only Pressables inside FormRow | Enlarge targets, constrain label | Code fixed; phone pending |
| Notes list and empty state | Bypasses TopBar/EmptyState; full note body can make huge card | One-off header/empty Card and unlimited text | Use TopBar/EmptyState; cap preview lines | Code fixed; phone pending |
| Note editor (create/edit) | Bypasses SheetSection; Delete target small | Manual gap and compact delete Pressable | Shared section rhythm and 44 dp action | Code fixed; phone pending |
| Event form (create/edit) | Manual spacing and compact repeat/reminder controls/pickers | Root View gap and inline spacing; custom modals | Use SheetSection/FormCard/FormRow scale and enlarge controls | Code fixed; phone pending |
| Task form (create/edit) | Subtask add/remove and reminder offset controls small | Icon/text Pressables and compact chips | Enlarge action targets via shared components | Code fixed; phone pending |
| Expense/income form (create/edit) | Category, type and repeat controls compact | Chips and segmented control under 44 dp | Shared interactive sizing | Code fixed; phone pending |
| Category editor | Estimated scroll height can clip Save footer | EditorSheet reserves fixed 180 dp | Share measured BottomSheet body budget | Code fixed; phone pending |
| Date and time pickers | Clear/Done targets small; two date cards may wrap poorly at Large text | Plain text Pressables and 50% cards | 44 dp actions; allow card text to grow/truncate | Code fixed; phone pending |
| Repeat/reminder/category pickers | Picker rows/options can be under 44 dp | Custom modal rows and small chips | Minimum 44 dp row targets | Code fixed; phone pending |
| TabBar and FAB clearance | Fixed tab height and per-screen reserves differ | 56 dp dock; screens use 88/90/110/148 dp buffers | Shared bottom clearance, grow tab items within safe area | Code fixed; phone pending |
| Settings/detail/other app surfaces | One-off headers and compact buttons; detail bottom relies on fixed 40 dp | Bypassed TopBar and shared clearance | Repair consistent geometry where safe without altering behavior | Code fixed; phone pending |

## Second pass

I reread the changed render paths after the first repair, including the sheet footer with the keyboard open, the compact month and week cells, and the timed Day cards. The following issues were found and repaired in this pass:

| Screen | Second-pass defect | Fix | Status |
| --- | --- | --- | --- |
| FormRow in Budget, Tasks, and pickers | The first pass accidentally limited hint and error text to two lines. Validation errors could be cut off at Large text. | Removed the line caps so cards grow for hints and errors. | Code fixed; phone pending |
| Category and reminder chips | A long category name could make one chip wider than the 320 dp sheet body. | Limited chip width to its parent and truncated only the chip label. | Code fixed; phone pending |
| Quick-add title row | A long edit title plus date badge could push the Close button sideways. | Allowed the title to shrink to one line while keeping the 44 dp Close target. | Code fixed; phone pending |
| Lifted fields on a 640 dp phone | With a 400 dp keyboard, the regular 103 dp footer plus the field bar exceeded the 208 dp above the keyboard. | Added a compact shared Save footer only in the lifted overlay, capped multiline input by remaining space, and cleared the bottom inset before the keyboard appears. The sheet's normal footer remains fixed. | Code fixed; phone pending |
| Calendar Day timed items | A 34-minute task occupied about 41 dp at 72 dp/hour, clipping its new 44 dp checkbox. Short event and expense cards had the same touch-size problem. | Gave timed items a 45-minute minimum *visual* duration for 54 dp cards; stored times and displayed dates remain unchanged. Cards that share that visual interval are placed in separate columns. | Code fixed; phone pending |
| Existing UI verification scripts | Prior assertions still expected the removed 72 dp keyboard gap and an inline Save implementation. | Updated those checks for the shared footer and direct keyboard docking; both scripts passed. | Verified by script |
| Missing-route screen | Its return link was under 44 dp and the fallback view did not explicitly clear system insets. | Added a 44 dp link target and top/bottom safe-area padding. | Code fixed; phone pending |

At 360 × 640 dp, a create sheet has a 576 dp height, about 153 dp of header, about 103 dp of footer, and about 320 dp of scrollable body. At a 400 dp keyboard height, the lifted area above it is about 208 dp after top clearance; the compact footer and minimum field bar use about 207 dp. This is a layout estimate. Keyboard sizes, platform window resizing, font rendering, native pickers, and gesture/navigation bars still require the phone checks.

Visual judgment calls made without the missing Stitch images: 12 dp outer card radius, 1 dp perimeter border, surface fill, vertical icon/label quick-add tabs at 360 dp width, 44 dp minimum interactive controls, 45-minute visual minimum for timed cards, and semantic surface/border tokens in places that previously used literal translucent colors. The missing `.stitch-reference/` images and `design-system.md` prevent a pixel-level comparison. The UI checker scans `app/` and UI source under `src/`; it excludes `src/db/seed.ts` because that dev-only sample-data file contains existing color literals and this task forbids database/data changes.

## Verification

- `npx tsc --noEmit`: passed.
- `npm run check:ui`: passed. It reports file and line for violations in scanned source.
- Negative probe: a temporary hardcoded color in a UI file failed with `src/components/ui/__ui_rule_probe.tsx:1`; the probe was removed before the passing run.
- `scripts/verify-lifted-bar-positioning.ts`: passed for hidden, edge-to-edge, resized-window, and tall-keyboard calculations, plus field chaining.
- `scripts/verify-quickadd-save-button.ts`: passed for all four form handles and the shared Save footer.
- `scripts/verify-day-view-layout.ts`: passed for existing Day view label and scroll geometry.
- Device rendering and Stitch image comparison: unavailable in this environment. No visual claim is made.

## Phone checklist

Use a fresh or disposable local data set for the empty-state checks; Settings > Clear all data erases local records.

1. On a 360 dp or similarly narrow phone, set system font size to **Large**. Open every tab and confirm text, TopBar, tab bar, and floating + stay separate. Repeat the checks below at the normal font size.
2. Calendar Day: inspect an empty day and a day with all-day, timed event, timed task, and spending cards. Check the header navigation, expandable all-day area, short timed cards, the midnight end of the timeline, and the floating + clearance.
3. Calendar Week: inspect an empty month and expanded weeks with long titles; tap each mini-day and check the final row above the floating +. Calendar Month: inspect an empty selected day, all six date rows, and long selected-day entries. Calendar Agenda: inspect its empty state, pinned day headings with counts, long entries, and its final list items.
4. Tasks: check the All caught up state and Add a task action; then check Today, Upcoming, All lists, long task names, priority/due chips, subtasks, Done, and checkbox/expand targets near the right edge. Confirm the last row scrolls clear of +.
5. Budget: check No spending logged yet and Log an expense; then check month navigation, long category names, large peso amounts, capped and uncapped categories, recurring rows, and the last transaction above +. Open Manage categories; check long names, edit/delete targets, icon chips, and the move-or-cancel panel.
6. Notes: check No notes yet and Add a note; then check long note titles and body previews in the list and the last card above +. Open a note for editing.
7. Quick-add **Event create and edit**: open + with keyboard closed, then tap title/location to open the lifted field and keyboard. Confirm no initial auto-focus, Next/Done and Save visible, and no status/navigation-bar overlap. Check start/end native date and time pickers, all-day, repeat picker, reminder picker, Delete, and Save with keyboard closed and open.
8. Quick-add **Task create and edit**: repeat the closed/open keyboard and fixed Save checks for title and inline subtasks. Check due date, time, Clear date/time, priority, reminder offsets, subtask add/remove, checkbox interaction in the Tasks list, Delete, and Save.
9. Quick-add **Expense/Income create and edit**: repeat the closed/open keyboard and fixed Save checks for amount and description. Check Expense/Income switch, category chips with long labels, date/time picker, Repeats monthly, Delete, and Save.
10. Quick-add **Note create and edit**: repeat the closed/open keyboard and fixed Save checks for title, multiline body, and tag, including Next/Done. Check scrolling, long text, Delete, and Save.
11. Category editor create and edit: with keyboard closed and open, inspect Name/Cap lifted fields, icon picker, and fixed Save. Check native date/time pickers, recurrence picker, reminder picker, and category picker once more at Large text on both Android and iOS if available.
12. Settings, detail, and missing-route screen: confirm header and Back/return targets clear the status bar, cards grow for Large text, and the lowest content clears the system navigation area.
