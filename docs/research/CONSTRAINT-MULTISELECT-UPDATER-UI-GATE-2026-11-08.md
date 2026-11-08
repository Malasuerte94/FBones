# Constraint selection, type icons and updater UI gate — 2026-11-08

Recorded before dependent implementation. The user requests distinct constraint
type icons (gravity for Physics), Ctrl/Shift selection of constraints and editing
five Physics records together. Automatic editor updates are a separate product
flow, not a Spine-reference behavior.

## Local exact-version evidence and current implementation

Reused F309 Tree/docking and F310 Physics authoring gates, plus F207/numeric
focus/Enter-blur and F310 slider/history acceptance. Reopened exact4.3.26 own
captures `feature-ui/physics-default-inspector-observed.png` and
`feature-ui/transform-inspector-observed.png`. Their Tree and inspector headings
have visibly distinct Physics and Transform glyphs. The Physics inspector has
compact colored labels and numeric/slider pairs, including gravity, and the
constrained bone reference. They prove those controls and distinct glyphs are
present, not a Ctrl/Shift constraint gesture or multi-record inspector outcome.
Original glyph artwork is not copied into FBones.

Direct current-source findings: `SceneTree.vue` uses the weights glyph for every
constraint; its constraint click immediately calls single-ID `selectConstraint`
without modifier handling. `workspace.ts` exposes one `selectedConstraintId` and
one selected record. `ConstraintInspector.vue` binds one record, its name/bone,
Setup/dynamic fields and globals. Constraint views also inspect one explicit ID.
`NumericSliderRow.vue` stages drafts, commits once on completed input and guards
context changes/focus; its range is currently disabled when a value is blank.
The native store submits `updateConstraint` per record, so looping that command
five times would create separate history and is not an acceptable batch edit.

F310 establishes exact unit conversions, extended numeric values, nullable
Physics rotation, slider intervals distinct from authoring bounds, one gesture
per history action, Escape/draft invalidity and explicit Simulate-Off behavior.
The new selection/batch UI must retain those accepted contracts. No original
launch, protected-window interaction or accepted oracle rerun is needed.

## Supported contract and explicit FBones policies

- Use original FBones SVG glyphs: IK target/chain, Transform directional mapping,
  Physics downward gravity. Keep names/type labels/tooltips and selected/focus
  states so color or an icon alone never carries meaning. Reuse glyphs in Tree
  rows and inspector/view headings; do not change constraint order or IDs.
- Plain click selects one constraint. Ctrl/Cmd toggles a record. Shift extends
  selection along currently visible constraint rows from a retained anchor;
  Ctrl/Cmd+Shift adds that range. Hidden/filter-excluded rows are not silently
  added. Selection itself authors nothing. Other object families clear active
  constraint selection; keep compatible single-ID APIs for existing consumers.
  These range/toggle details are FBones policies until measured in the original.
- Five selected Physics constraints show one compact inspector with a visible
  `5 Physics constraints` count, their names as context, and common scalar/global
  fields. Names, constrained bones, order, deletion, Match and unrelated types
  must not be broadcast by a numeric-field edit. A mixed-type selection shows
  its count/type context rather than silently editing the primary record.
- Equal fields show their precise existing display value. Unequal fields show
  an explicit Mixed placeholder, never zero or an arbitrary first value. For
  an initially mixed scalar, keep its range inactive until an explicit numeric
  value is staged; common values retain normal slider interaction. Mixed global
  checkboxes expose an indeterminate state. One explicit value applies to all
  frozen selected Physics IDs through one atomic native batch/history entry.
  Mixed-value presentation and this initial-range policy are FBones choices.
- Stage local drafts with document/selection/revision context. Enter/blur dedup,
  Escape and slider completion retain the existing behavior. Invalid values
  block Save; Save flushes valid edits; context/revision changes cannot redirect
  a draft to a different selection. A no-op leaves history/revision unchanged.
  The DATA gate owns exact field validation, f32/null semantics, atomic failure
  and persistence. No feature coding precedes that paired gate and agreement.
- Initial batch inspector edits authored Setup Physics only. Animate selection
  may expose context but must not silently author Setup or partially key one
  record; broader animated batch keying needs an explicit agreed DATA contract.
  Selection changes must not enable simulation or bake evaluated poses.

## Updater interaction contract

These are FBones policies, with native updater/platform details owned separately.
An automatic startup check is quiet unless a newer supported app release exists;
a manual Check for updates action reports current/checking/unavailable status.
Disabled automatic checks remain disabled across restart. Offline, timeout and
unsupported-platform states leave the offline editor usable and offer Retry;
they do not repeatedly open blocking error dialogs.

An available update shows version and a release-notes link, then Download and
Later. Downloading exposes progress (indeterminate until total bytes are known),
a meaningful failure message and Retry. Installing/restarting is explicit, with
a Restart to update action only after the native layer reports readiness.
Do not claim a downloaded update is installed. Download completion must not
silently close the editor or replace unsaved authoring state.

Restart passes the same pending-field/invalid-draft/dirty-document guard as
normal lifecycle commands: valid drafts flush, invalid drafts stay visible,
Save failure/cancellation preserves the open dirty document, and discard requires
the existing explicit choice. Recheck document state after asynchronous work.
Do not navigate/restart behind an open native dialog or ongoing authoring edit.
The UI renders native results; it does not bypass signature/version/platform
validation or invent an update result. Keyboard focus, dismiss/reopen, narrow
docks and accessible progress/status/error text must be covered.

## Focused acceptance and ownership proposal

Coordinator owns shared builds/tests, App/workspace integration and final launch.
UI ownership proposed: SceneTree/AppIcon/ConstraintInspector, a focused new
PhysicsBatchInspector, and optional NumericSliderRow mixed placeholder support.
DATA owns batch domain/native transaction and validation tests; updater agent
owns its separate notice component. Root resolves any shared-file overlap.

Acceptance: real pointer/Ctrl/Shift selection plus keyboard reachability; type
glyphs and selected count; equal/mixed gravity numeric/slider/global changes;
five-record exact mutation with unrelated fields retained; one Undo/Redo;
Escape/no-op/invalid/save flush/stale selection; portable Save/Close/Open; narrow
dock and existing single-inspector/Animate regressions. Native updater acceptance
must distinguish available/check/download/restart and offline/dirty cancellation;
browser rendering alone does not prove OS installer/update execution.

## Coordinator-approved implementation expansion

After the paired DATA gate, the coordinator approved all homogeneous constraint
kinds and existing Animate channels together, superseding the proposed
Setup-Physics-first slice above. Frozen UI API:
`selectedConstraintIds`, authored `selectedConstraints`, modifier-aware
`selectConstraint(id,{toggle,shift,ordered})` and
`editSelectedConstraintField(field,value,expectedRevision,frozenIds)`.
Values sent through that method are authored units; UI conversion remains the
accepted single-inspector percent/damping/FPS conversion. Frozen IDs and revision
belong to the gesture, never the later selection.

Setup allows shared scalar/toggle fields for Physics, IK and Transform. IK controls
require eligibility across every chain; Transform offsets/mixes require shared
mapped channels. Animate displays sampled/draft `animationConstraint(id)` values
and allows only existing Physics seven dynamic fields, IK supported numeric/flags
and Transform six mixes through the coordinator's atomic key/draft batch. All
Setup-only fields/globals remain disabled. Mixed constraint kinds show a count
and explicit read-only message. Identity/references/order/Match/delete remain
individual. This broadens implementation scope, not original parity claims.
