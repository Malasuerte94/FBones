# F309 — Parent picking, Tree clarity and movable editor panels

Status: DONE within the documented FBones policy/profile. User feedback2026-10-29 extends the existing goal; it does not
replace F222, F307 or F308. Reference is Spine4.3.26 only. Read paired
`../research/F309-PARENTING-PANELS-{DATA,UI}.md` before dependent implementation.

## Requested behavior

1. P starts choosing a new parent for the selected bone, attachment or group.
   Clicking a bone in viewport or Tree completes the same action. Retain Pose
   through its toolbar button; P is reassigned per the user's explicit request.
   Capture stable IDs/document/revision, preserve world geometry, reject cycles,
   cancel Escape/stale work and commit one atomic history action for a group.
   Do not move unselected attachment alternatives accidentally with a slot.
2. Tree New must visibly open, receive clicks and enter real Slot/Clipping/IK/
   Transform/Physics creation flows. Verify actual popup geometry and hit tests,
   keyboard/outside dismissal; toggled state alone is insufficient.
3. Resolve the relationship-line question: current parent-origin→child-origin
   versus proposed parent-tip→child-origin. Keep this a visualization choice;
   never alter hierarchy transforms, child positions or binding to change a line.
4. Remove bottom-right Project metadata, retaining selected-item properties and
   messages necessary to explain inspection-only/save failures.
5. Replace the diamond UI bone glyph with a legible original tapered-bone SVG.
6. Tree ancestor guides/elbows follow projected parents and last visible
   siblings under filtering/search/collapse, without intercepting interactions.
7. Views exposes IK, Transform and Physics settings panels. Gravity is a Physics
   property. Opening a panel does not create a constraint. Reuse authoritative
   editing, show an actionable empty state and choose existing constraints.
   All right panels can be moved/reordered and resized in width and height,
   with bounded in-window placement, visible docking feedback and Reset layout.
   Layout is local UI state, never project history or a new format field.

## Acceptance

Meaningful native parenting history/save/reopen plus one new original comparison
when persistence behavior changes. Playwright exercises actual P picks in both
surfaces, group/invalid/cancel/stale cases, visible menu/actions, no Project
metadata, clear hierarchy and movable/resizable Views without source mutation.
Retain existing hover, selection, field precision/Save flush, CSP, clipping,
constraint and weight workflows. Keep actual Windows delivery evidence separate
from Linux browser+Rust checks. Never automate user-owned windows.

Constraint settings in original captures are selected-item inspectors. Separate
constraint Views and the requested docking surface are user-directed extensions,
not proven exact4.3.26 layout parity. Unknown parenting/connector outcomes remain
explicit until settled by paired findings or a recorded FBones policy.

## Verified delivery

All seven requests are implemented; read latest STATE for behavior and limits.
Final current35/35Linux Playwright (31.185s),190JSpass/1knownskip,
145nativepass/2knownignores,93legacypass/1knownignore and strict Clippy both.
One new own P image/weighted-mesh file accepted/exported by original4.3.26;
independent raw/runtime/PNG/world checks pass. Five actual Windows WebView2
groups and native OS Save/Close/Open pass on immutablebe1bc. Normal shared-root
user window82772 visibly opened and is DoNotAutomate. Reports:
`../../analysis/f309-{ui,parenting-original,delivery}-check.json` (three actual
files; not one brace-named resource). The actual initial New hit-test and moved-
panel Teleport defects were reproduced and fixed; no simulated drop replaces
the real browser pointer tests. Global OS mouse/macOS/original gesture parity
and evaluated-constraint parenting remain outside these verified claims.
