# UI repair audit

Code review baseline: 360 × 640 dp phone, 24 dp top and bottom system insets, roughly 280 dp keyboard, font scale 1.3. These are layout calculations, not device measurements. The local `.stitch-reference/` directory and `design-system.md` are absent, so no screenshot comparison is possible. Visual match remains unverified for every row.

At 640 dp, the quick-add sheet caps itself at 576 dp. Its create header is estimated at 120 dp and its footer at 103 dp (including a 24 dp bottom inset), so it allocates 353 dp to the body. A header that grows to about 150 dp at Large text makes the stack about 606 dp and clips roughly 30 dp at the bottom. The edit header has the same issue with its 85 dp estimate. At 360 dp width, four quick-add tabs each receive about 78 dp; an Expense icon, gap, and 1.3-scale label need more width. A 280 dp keyboard plus the current 72 dp extra lift, a roughly 120 dp field bar, and a 103 dp Save footer leave about 65 dp above the overlay; a multiline field can extend under the status bar.

| Screen or sheet | Defect | Root cause | Fix | Status |
| --- | --- | --- | --- | --- |
| Shared BottomSheet, quick-add create/edit | Save footer can clip on a 640 dp phone at Large text; body may not scroll enough | Estimated fixed header/footer heights and 90% max height with hidden overflow | Measure header/footer and bound scroll body from actual space | Open |
| Lifted field overlay, all four create/edit tabs, category editor | Field/footer stack can reach status bar; Next/Done hit area is under 44 dp | 72 dp keyboard clearance and compact button | Dock to keyboard, bound overlay to safe space, enlarge button | Open |
| Quick-add header and four tabs | Expense tab can wrap; Close target is 28 dp | Four equal horizontal icon+label tabs and fixed close circle | Responsive tab content, 44 dp close target | Open |
| Shared cards, buttons, chips, segmented control | Card fill/radius and tappable control heights vary | FormCard uses background, Card uses surface and different radius; sm buttons/chips/segments are below 44 dp | Align shared tokens and give interactive controls 44 dp targets | Open |
| TopBar | Long feature name and right action can collide | Branding row has no flex shrink/truncation | Constrain title and give right action room | Open |
| Empty states (Day inline; Tasks/Budget/Notes full; Week/Agenda) | Actions are 34/40 dp; fixed line heights can clip Large text | Compact fixed buttons and line heights | Minimum 44 dp targets, scalable text and growth | Open |
| Calendar Day | Date header controls and all-day rows can be under 44 dp; long timeline cards have fixed heights | 40 dp navigation buttons and absolute timeline geometry | Enlarge navigation targets; retain deliberate timeline truncation and check card text | Open |
| Calendar Week | Final rows may sit behind tab/FAB; some small controls | Fixed 110 dp bottom reserve and compact WeekCard controls | Use shared bottom clearance and enlarge controls | Open |
| Calendar Month | Bottom items may sit behind tab/FAB; date cells compact | Fixed 90 dp bottom reserve and 32 dp day height | Use shared bottom clearance; preserve compact grid with 44 dp interaction targets | Open |
| Calendar Agenda | Pinned day text and count can collide; bottom reserve fixed | Two unconstrained labels in a row; 110 dp reserve | Flex/shrink/truncate header; use shared clearance | Open |
| Tasks | Last row may sit behind FAB; checkbox/expand and title press targets small; group heading can collide | 88 dp plus inset bottom reserve, 20 dp expand icon | Shared clearance and hit targets; constrain heading text | Open |
| Budget | Last transaction may sit behind FAB; month and amount can collide; nav/Manage targets small | 88 dp plus inset reserve, unconstrained FormRow right text | Shared clearance, wrapping/truncation and 44 dp targets | Open |
| Manage categories | Edit/delete icon controls below 44 dp; long names can collide | Text/icon-only Pressables inside FormRow | Enlarge targets, constrain label | Open |
| Notes list and empty state | Bypasses TopBar/EmptyState; full note body can make huge card | One-off header/empty Card and unlimited text | Use TopBar/EmptyState; cap preview lines | Open |
| Note editor (create/edit) | Bypasses SheetSection; Delete target small | Manual gap and compact delete Pressable | Shared section rhythm and 44 dp action | Open |
| Event form (create/edit) | Manual spacing and compact repeat/reminder controls/pickers | Root View gap and inline spacing; custom modals | Use SheetSection/FormCard/FormRow scale and enlarge controls | Open |
| Task form (create/edit) | Subtask add/remove and reminder offset controls small | Icon/text Pressables and compact chips | Enlarge action targets via shared components | Open |
| Expense/income form (create/edit) | Category, type and repeat controls compact | Chips and segmented control under 44 dp | Shared interactive sizing | Open |
| Category editor | Estimated scroll height can clip Save footer | EditorSheet reserves fixed 180 dp | Share measured BottomSheet body budget | Open |
| Date and time pickers | Clear/Done targets small; two date cards may wrap poorly at Large text | Plain text Pressables and 50% cards | 44 dp actions; allow card text to grow/truncate | Open |
| Repeat/reminder/category pickers | Picker rows/options can be under 44 dp | Custom modal rows and small chips | Minimum 44 dp row targets | Open |
| TabBar and FAB clearance | Fixed tab height and per-screen reserves differ | 56 dp dock; screens use 88/90/110/148 dp buffers | Shared bottom clearance, grow tab items within safe area | Open |
| Settings/detail/other app surfaces | One-off headers and compact buttons; detail bottom relies on fixed 40 dp | Bypassed TopBar and shared clearance | Repair consistent geometry where safe without altering behavior | Open |

## Second pass

Pending after the static rule checker and layout changes.
