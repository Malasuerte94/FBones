# F309 parenting and panels: data audit

Recorded 2026-10-29 before dependent implementation. Companion:
[UI audit](F309-PARENTING-PANELS-UI.md). This audit used existing accepted
observations, source inspection and current official documentation only. No
original command, GUI input, accepted-batch rerun or product edit was performed.

## Evidence and limits

**Proven by existing exact4.3.26 evidence:** slots own attachment inventories
and an independent active reference; alternatives A/B/none, draw order,
weighted Mesh/Clipping coordinates and constraint references have accepted
codec/original-export checks. See `FEATURE-UI-4.3.26.md` (F222 follow-up),
`NATIVE-SCENE-BRIDGE.md`, `docs/tasks/F222-slot-attachments.md` and the owned
`.local/research/feature-ui/` inspector captures. These are model/persistence
proofs, not original reparent-operation proofs. No accepted local operation
settles image P-to-bone slot creation, multi-parent selection, collision or
activation policy. Crowded screenshots do not isolate relationship endpoints.

**Documented, not patch-pinned:** [Bones / Parent](https://en.esotericsoftware.com/spine-bones#Parent)
and [Attachments / Set Parent](https://en.esotericsoftware.com/spine-attachments#Set-Parent)
describe P/Set Parent followed by a Tree or viewport parent click.
[Tree / Drag and drop](https://en.esotericsoftware.com/spine-tree#Drag-and-drop)
equates Tree reparenting with Set Parent. The attachment guide describes slot
ownership and one visible attachment. It does not specify image-to-bone slot
allocation or mixed-selection behavior. No older-version forum observation is
used to fill those gaps.

**Confirmed current FBones code:** source facts below were inspected with
`rg -n 'Reparent|UpdateSlot|MoveAttachment|geometry_edit'` and bounded reads of
`src-tauri/src/{rig,scene_bridge,scene_edit}.rs`, plus `src/App.vue`,
`SceneTree.vue`, `treeProjection.ts`, `DockPane.vue` and viewport draw code.
These facts do not establish original behavior or reproduce a reported UI bug.

## Parenting: native contract before UI wiring

- `RigEdit::Reparent {id,parent}` is single-bone. It rejects root/self/descendant,
  preserves the bone's **authored setup world pose**, rebuilds parent-before-child
  wire order and keeps session IDs. `remap_bones` remaps slot owners, every
  active/inactive Mesh/Clipping influence and IK/Transform/Physics references.
  `Reparent` is absent from `geometry_edit`: evaluated frozen-pose preservation
  is not an existing guarantee and must not be claimed accidentally.
- `UpdateSlot` changes an entire slot's owner and rebases all rigid alternatives;
  weighted rows retain their actual binding columns. It also edits name,
  visibility and active Region channels. In particular, `visible=true` can
  activate a sole previously inactive alternative. Therefore it is unsafe to
  reuse this command unchanged for a pure P action.
- `MoveAttachment {id,slot}` moves one stable attachment to an existing SLOT,
  preserves global inventory position, clears a moved source-active pointer
  and preserves destination activation including none. Those activation rules
  are explicit accepted FBones policy, not original-operation parity. It is
  geometry/poseEpoch gated. It does not provide image-to-BONE parenting.
- `reparent_attachment` retains weighted rows and influences, rebases rigid
  Mesh/Clipping points, and converts a Region to a quad Mesh when the destination
  transform needs shear. This can preserve geometry without preserving type.
  Neither slot parenting nor weighted ownership changes should implicitly run
  Bind, Auto or Update Bindings.

**Image-to-bone policy gate:** attachments have a slot parent, not a direct bone
parent. Reassigning the whole owner slot moves unselected alternatives too.
Extracting only selected alternatives requires new/existing destination slots,
activation, grouping and draw-order policies. Multiple active images from
different slots cannot all remain active in one destination slot. The original
choice is unknown. The coordinator must approve and document one policy before
implementation. Recommended bounded FBones choice: image selection resolves to
its whole owner slot; deduplicate owners, visibly explain that alternatives
move together, preserve inventory, active references, tint/blend and draw order.
This recommendation is not a claim of exact4.3.26 behavior.

**Proposed single atomic command**, subject to coordinator decision:
`ReparentSelection {boneIds, slotIds, parent}` using stable session IDs; frontend
resolves selected images to owner slots only after the policy above is chosen.
Reject duplicates/missing IDs, empty/oversized scope, root moves, cycles,
singular required inverses and unsupported profiles before committing. For a
selected bone plus its descendant, moving only highest selected roots retains
their existing subtree; flattening every selected bone is a different policy.
The original multi-selection choice is unknown and must be explicit.

Use one staged `SceneHistory` transaction, not repeated frontend calls. Preserve
world poses according to an explicitly named setup/evaluated policy; evaluate
all original geometry from the same pre-edit frame. Reorder/remap once and run
complete canonical validation, including IK ancestry and two-link adjacency,
active clipping intervals and all inactive references. Failure/no-op must keep
DTO, IDs, history, revision and dirty state unchanged. Successful group edit is
one undo entry with stable selection IDs; Undo/Redo and portable encode/open
must retain every unaffected binding-coordinate bit and metadata field.

P currently maps to Pose in App and its toolbar hint. Change both consistently;
Pose can remain a button. A transient parent-pick snapshot should bind document,
revision and source IDs. Intercept candidate bone picks before ordinary Tree
selection, Weights influence selection and viewport transforms. Escape cancels;
stale context or invalid picks never partially mutate. Inputs and inspector
drafts retain normal typing. Library assets are not authored attachments.

## Other six requests: persistence and implementation boundaries

1. **New popup:** SceneTree already toggles a real menu and emits existing
   creation flows. The UI audit identifies competing vertical anchors and
   ancestor clipping as a source-supported hypothesis; actual pointer
   reproduction remains necessary. Fixing placement/hit testing needs no codec
   extension. Choosing New must use the existing authoritative create command.
2. **Relationship lines:** current draw code uses parent origin to child origin.
   `WorldBone` already exposes evaluated tip coordinates. Parent tip to child
   origin is a safe user-directed visualization choice; exact original endpoint
   is unknown. Do not move the child, snap it to the tip or change bone length.
3. **Project properties:** remove only App's `project-info` metadata details.
   Keep selected Bone/Slot/Attachment/Constraint inspectors and actionable
   editability/save errors. No project mutation or format field changes.
4. **Bone icon:** replace our shared AppIcon SVG as UI artwork. Do not invent a
   per-bone serialized icon field or alter viewport selection geometry. Original
   icon customization is a separate broader-profile question.
5. **Tree guides:** projectTree already supplies kind-qualified keys and visible
   projected parents. Derive elbows/ancestor continuations after filtering,
   search and collapse, including separate constraint/category boundaries.
   Rendered depth alone is insufficient. Guides must not intercept selection,
   visibility, expansion or drag/drop, and must never change author ownership.
6. **Views/panels:** existing constraint settings are the selected-constraint
   inspector, not missing native constraint models. Views currently offers only
   Weights/Mesh/Tree; DockPane only resizes width. Dedicated IK/Transform/Physics
   views and in-app movable two-axis layout are requested FBones extensions.

[Views documentation](https://en.esotericsoftware.com/spine-views) describes
opening/focusing, dragging tabs and resizing inside the app; it does not prove
the requested dedicated constraint view list exists in exact4.3.26. Opening a
view must not create a constraint, activate an image or change authored state.
Give each type panel an explicit stable constraint ID/follow policy and an
empty state. Simply mounting three current ConstraintInspectors would share
`selectedConstraint` and risk editing the wrong object. Flush/cancel drafts on
identity changes and preserve the existing Save-awaits-fields contract.

Layout belongs to versioned bounded local UI settings, not `.fbones`, project
history, revision or dirty state. Clamp sizes/positions after viewport changes,
provide Reset Layout, release pointer capture on cancel/unmount and keep panel
reopening recoverable. Native detached windows are not established by this task.

## Gate and focused acceptance

Non-parenting UI slices above are ready after paired UI audit and actual New
reproduction; they require no format changes. Parenting still requires the
explicit slot scope, selected-subtree and pose policy decisions above. Verify
P through real Tree AND viewport picks, multi-object atomic success/failure,
inactive alternatives, weighted Mesh/Clip bits, reflected/sheared parents,
constraint-invalid targets, one Undo/Redo and save/open. Verify New via actual
click and visible bounds; panel toggles/resize/move and Tree filters/guides must
leave the authored snapshot byte-identical. Do not mark exact original group
parity, evaluated-pose invariance or native Windows pointer behavior from code
inspection or constructed DOM events.

## Coordinator decision and independent review

After this audit, the coordinator recorded a different explicit FBones policy
in [F309-PARENTING-POLICY.md](F309-PARENTING-POLICY.md): isolate selected
attachments when their source has unselected alternatives; reparent the whole
slot only when all alternatives are selected. This supersedes the whole-owner
recommendation above and follows the user's selected-image scope. It remains
an own policy, not newly discovered original behavior. Partial splits copy
slot color/blend, preserve pre-existing slot relative order and global inventory,
and transfer an active pointer only when that attachment is selected.

Read-only implementation risks sent to the coordinator/native owner:

- Resolve the same-owner target as a no-op before splitting; do not create an
  unnecessary slot. Define which adjacent side is used consistently.
- Capture original world poses and stable ownership before any move. Mixed
  selected bone/image sources must not rebase an image twice or use stale bone
  array indices after DFS reorder.
- Rebuild source/destination active indices by stable attachment ID. An
  unselected active alternative can shift local index when earlier selected
  alternatives leave. None must remain none.
- Every inserted slot changes numeric slot indices. Remap every clipping end,
  including inactive and untouched clips, by stable slot identity. Preserve all
  existing global attachment-order IDs while rebuilding their addresses.
- An after-source split of an active self-ending clipping attachment would
  leave its explicit endpoint before its new owner. Existing active-interval
  validation must reject atomically unless a separately approved policy changes
  that endpoint. Splitting a clipping owner can alter masking of adjacent slots;
  preserved world geometry does not promise identical composite pixels.
- Validate unique bounded names and the128-slot ceiling after all splits;
  preserve weighted columns/offset bits even when owner and influenced bone
  appear in the same selected forest. Complete canonical validation must reject
  newly invalid IK target ancestry or a broken two-link pair.

### New candidate comparison plan, no collection yet

Use one **new UI-authored** own fixture after implementation acceptance, with an
affine parent/child selection, active Region plus inactive alternatives, a
weighted Mesh, and a clipping endpoint referencing an unaffected later slot.
Exercise a partial split, a complete-owner move and a mixed bone/image batch;
include selected-inactive and selected-active cases. Freeze before/after DTOs,
actual selected IDs, one Undo/Redo proof, saved source, portable images, runtime
identity and all hashes. An API fixture is setup, not proof of the P gesture.

Only after own UI save/close/open succeeds, coordinate exclusive original CLI
ownership and export that new saved source **once** in installed4.3.26. Compare
all bone channels/parents, slot owner/order/color/blend, complete inventories,
active references, paths/dimensions, Mesh UV/topology and positive weights/local
coordinates, plus clipping endpoints and constraint references. Compare raw
source bindings separately for zero columns absent from runtime JSON. Record
format acceptance independently from exact original P semantics: exporting a
valid generated file does not prove Spine performs the same slot split. Do not
rerun any previously accepted foundation, scoped-Auto or ownership batch.
