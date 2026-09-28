# Build blockers

## Missing local Stitch references

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
