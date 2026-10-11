# Build blockers

## Modal bottom-gap and typing-shift correction — 2026-10-06

The user observed that the previous keyboard fix still shifted and introduced a
bottom gap. It was not validated on a phone. The replacement measures the native
modal, covers its bottom, and stabilizes content insets. Expanded isolated tests
pass, but ADB still lists no device and local Stitch references remain missing.
Device confirmation is still required; see build-progress.md.

## Quick-add keyboard stability verification — 2026-10-06

Local Stitch references/design system are still missing. The sheet-frame fix
passes isolated layout and existing keyboard checks, but no device was available
in the latest ADB check. Actual keyboard animation, clipping, and dismissal need
the phone checklist in build-progress.md.

## Quick-add fill and notification-shade verification — 2026-10-06

No phone is connected through ADB, so Android notification-shade behavior and
the filled Event/Expense sheet layout cannot be verified on-device. The local
Stitch references and design-system file remain missing. Automated checks pass;
the phone checklist is recorded in build-progress.md.

## Event and Expense compact quick-add — 2026-10-06

Matching quick-add Event/Expense screenshots and `.stitch-reference/design-system.md`
are absent, so design comparison is blocked. Applied the user's requested compact
layout using existing theme tokens and components. ADB reports no connected phone;
actual fit, font scaling, and keyboard behavior remain unverified on a device.

## Calendar month-relative week labels - 2026-10-06

The local Week screenshot and `.stitch-reference/design-system.md` remain
unavailable because `.stitch-reference/` is absent. Visual comparison and a
mismatch list are blocked. The requested ordinal labels reuse the existing
layout and semantic tokens; the compact strip uses "1st" while cards use
"1st week". Final appearance needs the phone check in build-progress.md.

## Calendar Day, Week, and Month empty-state copy — 2026-10-06

The local `.stitch-reference/` folder and design-system file are still absent,
so screenshot comparison is blocked. The user's requested removal of the Day,
Week, and Month supporting sentences uses the existing EmptyState component; its
title, icon, and Add an event action remain visible. Phone appearance still
needs verification.

## Missing local Stitch references

Event reminder Hours/Minutes controls (2026-10-06): the user-requested custom
duration selector replaces the textbox and uses existing form cards with +/-
buttons inside the modal. Local quick-add-event screenshot and design-system
remain missing; visual comparison is blocked and phone appearance is pending.

Event custom reminders (2026-10-06): quick-add-event/screenshot.png and the local
design-system file remain unavailable. Custom time uses the existing picker
list, FormCard, and lifted field; screenshot comparison and phone keyboard
verification remain pending. Reminder delivery is still explicitly deferred.

Event field order follow-up (2026-10-06): the quick-add-event screenshot and
design-system file remain absent, preventing visual comparison. Implemented the
user-requested title/location order with existing FormCard spacing and a muted
Optional hint as a visual judgment call. Phone appearance needs verification.

`.stitch-reference/` is absent from the workspace as of the Phase 2d design
check. It is ignored by Git, so branch commits do not contain those files.
Earlier in this run, the Task, Empty Task, Budget, Empty Budget, and Quick Add
Expense screenshots were available and viewed. The folder later disappeared;
the reason is unknown. No screen or design-system file was downloaded.

The following requested steps cannot be implemented faithfully without their
local reference images, so no code for them was changed:

| Step | Missing reference |
| --- | --- |
| 2d Budget alert | `.stitch-reference/budget-cap-near-limit/screenshot.png` |
| 3a Notes UI | `.stitch-reference/notes/screenshot.png` |
| 3b Note create/edit/delete | `.stitch-reference/quick-add-note/screenshot.png` |
| 4 Linking | `.stitch-reference/quick-add-event/screenshot.png`, `quick-add-task/screenshot.png`, `quick-add-expense/screenshot.png`, `quick-add-note/screenshot.png`, `notes/screenshot.png` |
| 7 Dark mode | `.stitch-reference/combined-day-view-dark/screenshot.png`, `budget-dark/screenshot.png`, and `.stitch-reference/design-system.md` |

To resume, restore the ignored `.stitch-reference/` folder with those exact
files. Then open and inspect each image and the design-system definition before
implementation. Do not use `urls.md` or download Stitch source.

Phases 5 and 6 remain outside this run by user instruction.

## UI repair visual verification — 2026-10-02

The four user-provided phone screenshots were readable and inspected. They
support repairing the broken existing layouts. Matching local Stitch images
and `.stitch-reference/design-system.md` are still absent, so comparison against
the intended original designs remains blocked. Existing semantic tokens and
shared components were retained. See `ui-repair-verification.md` for judgments.

ADB found no connected phone or emulator. The Android bundle and automated
checks pass, but keyboard positioning and final visual appearance still need
the phone checklist. No iOS runtime verification was possible in this session.
