# Native scene bridge checkpoint

Desktop0.8 enables `scene-editing` by default after the integrated main-feature
Windows and original-format checks. It uses the typed scene codec and complete
native state/history bridge. The legacy comparison profile remains available
with `--no-default-features`. The final delivery's new move/motion interactions
still need their own candidate checks; a default feature is not a claim of
complete original-editor compatibility or a public plugin API.

`SceneFrame` owns the complete `SceneProject`, stable bone/slot/attachment/
constraint IDs and history focus. Transactions clone a frame, validate every
reference and the complete canonical serializer, then commit one undo entry.
ID counters remain monotonic across undo branches; failed operations consume
neither IDs nor history. Scene edits do not project the inventory through the
legacy one-image-per-slot model. All inactive attachments and all constraints
survive bone edits, snapshots, ordinary save, portable Save As and reopen.

The session keeps revision checks before writes and never overwrites `.spine`
sources. Portable saves collect the whole active PNG library, including unused
and nested images. Missing resources are checked across inactive inventory too;
clipping requires no image. Unknown original structures remain inspection-only.

## Native/frontend contract

- `ProjectSummary.sceneEditing` identifies this capability even in an empty
  project. Feature summaries add `editedAttachment` and ordered `constraints`.
- Slots add `attachments` and nullable `activeAttachmentId`. Their legacy
  `region`, `mesh`, `visible` and `imageAvailable` fields describe only the
  active attachment. `AttachmentView` has `id`, `slot`, `name`, `type`, nullable
  `region`/`mesh`/`clipping` and `imageAvailable`.
- `ClippingView` has stable `endSlot`, `convex`, `inverse`, editor `color`,
  `weighted`, stable binding `bones`, dense `vertices` and `edges`.
- `createSlot {bone,name?}` creates an empty slot. `place_attachments` accepts
  `expectedRevision`, ordered distinct `keys`, and destination `slot`; all new
  alternatives are centered on the owner bone, without the new-slot grid.
  Activation of the last inserted alternative is currently an explicit FBones
  creation choice; the original reference's drop-activation rule is unproven.
- `setActiveAttachment {slot,attachment:null|id}` changes visibility without
  changing the inspected row. Rename/delete use explicit attachment IDs.
  `updateAttachment {id,x,y,rotation,scaleX,scaleY}` edits image metadata.
- `moveAttachment {id,slot}` moves an existing inventory item without changing
  its stable attachment ID or its position in global attachment inventory
  order; owning-slot addresses are remapped. It preserves world geometry at
  the frozen evaluated pose. Unweighted geometry is rebound to the new owner;
  weighted geometry retains every binding bone and position bit. If a region's
  new owner-local basis needs shear, it becomes a canonical quad mesh instead
  of approximating its image. This is a geometry edit and obeys the poseEpoch
  boundary below.

  **Explicit FBones policy, approved before implementation2026-10-29:** moving
  the source's active attachment clears that source active pointer. Destination
  activation remains exactly unchanged, including active-none; inspect the
  moved item independently and activate it with its paperclip when desired.
  Same-slot moves are no-ops. A destination name collision fails atomically,
  without renaming, overwriting or selecting an arbitrary alternative. Clipping
  endpoint identity stays unchanged, and invalid active draw intervals reject
  the whole move. Destination slot tint/blend/draw-order applies afterward.
  A clipping attachment moved into another slot remains inactive under this
  policy; an unchanged earlier endpoint is retained in inventory, and later
  activation rejects it until its end is configured. Inactive inventory is
  not silently normalized or subjected to an invented all-inventory range ban.
  Paired exact4.3.26 UI/data audits plus the official Attachments/Tree guides
  establish parent/slot/inventory distinctions, but do not establish original
  activation/collision/world-pose choices for this operation. These safe
  authoring rules must not be called measured original-editor parity.
  Sources: paired `research/FEATURE-UI-4.3.26.md` follow-up and the official
  [attachment parent control](https://en.esotericsoftware.com/spine-attachments#Set-Parent),
  [Tree dragging](https://en.esotericsoftware.com/spine-tree#Drag-and-drop) and
  [slot model](https://en.esotericsoftware.com/spine-slots). The guides are
  patch-unpinned documentary evidence, not an observed4.3.26 move gesture.
- `attachmentEdit {id,edit}` targets the inspected attachment, including an
  inactive one. The inner edit must be a whitelisted mesh/weight operation and
  must name its actual owner slot. Nested wrappers and bone/slot/global edits
  are rejected. Unwrapped legacy mesh calls target the active attachment only.
- `preview_trace_attachment`/`apply_trace_attachment` accept an explicit
  attachment ID and optional `poseEpoch`. Preview carries `attachmentId` and
  the same `poseEpoch` when provided, remains transient and checks revision and
  frozen epoch again after expensive work. Apply commits once and does not
  change activation. A constrained project requires a current frozen epoch for
  trace preview/apply as well as other geometry edits.
- `createClipping {slot,name,endSlot,vertices,convex,inverse}` takes a complete
  world-space polygon and creates a real clipping attachment. Convex defaults
  true, following the observed original inspector/import; inverse defaults false. `setClipping`
  takes `{id,endSlot,convex,inverse,color}`. A null endpoint is never encoded.
- `moveClippingVertices {id,vertices}`, `insertClippingVertex {id,index,point}`
  and `deleteClippingVertex {id,vertex}` use attachment IDs. Insertion is before
  `index`; index equal to vertex count appends on the closing edge. Vertices
  and points use world coordinates. New rows interpolate adjacent weights and
  initialize bone-local positions for the requested world point; existing rows
  remain unchanged. Moves share the real dense-binding delta arithmetic with
  mesh moves, preserving each influence's existing offset. These authoring
  choices are safe FBones behavior, not proprietary algorithm parity claims.
- Constraint commands are `addConstraint {constraint}`, `updateConstraint
  {id,constraint}`, `deleteConstraint {id}` and `reorderConstraint {id,index}`.
  The input union uses the corresponding typed scene fields with stable IDs.
  Views additionally have `id`, `type`, `name` and `order`. Transform offsets
  and mixes use six channels in Rotate/X/Y/ScaleX/ScaleY/ShearY order; property
  mappings use channel names `rotate`, `x`, `y`, `scaleX`, `scaleY`, `shearY`.
  Physics `rotate:null` preserves its canonical NaN sentinel while displaying
  zero; nonnull rotate and shearX are raw stored coefficients, not derived
  runtime coefficients. Step is seconds. UI percentages/FPS must convert
  explicitly; unchanged authored projects save raw bits unchanged. Explicit
  `rotate:0` stays a finite zero coefficient; only `rotate:null` with zero
  shear selects the default sentinel. Updating mass must not normalize an
  existing finite-zero coefficient into the sentinel.
  IK target identity must be outside every constrained bone's own subtree,
  including the bone itself. Both native authoring and bounded codec validation
  reject that feedback graph; both independent evaluators enforce the same
  condition before applying any constraint, even at zero mix. The existing
  paired audits and official [IK setup/limitations](https://en.esotericsoftware.com/spine-ik-constraints#Setup)
  document the descendant prohibition. This is documentary behavior, not a new
  exact-patch observation of an error dialog. Physics damping must also be
  nonnegative, matching the evaluator's defined domain; no unsupported upper
  cap is invented. Rejected create/update/reparent operations do not dirty the
  project or add history; unsupported source payloads retain their original
  envelope for inspection/copying.
- `transformAttachments {ids,mode,pivotX,pivotY,dx,dy,rotation,scaleX,scaleY}`
  applies one atomic world-space Translate/Rotate/Scale to 1–512 distinct
  region, mesh or clipping attachments, including inactive alternatives.
  Only the selected mode's channels act. Dense binding offsets are retained;
  every requested world vertex moves once. A region remains an image when its
  transformed owner-local basis is orthogonal. Otherwise it becomes a real
  canonical quad mesh; approximating away shear would change the image. This
  representation choice is FBones behavior, not a recovered original algorithm.
  Singular group transforms and partial/invalid batches fail atomically.
- `bindAttachment {id,bones}`, `setAttachmentWeight {id,vertex,bone,value}`,
  `paintAttachmentWeights {id,bone,changes:[{vertex,value}]}`,
  `normalizeAttachmentWeights {id}` and `autoAttachmentWeights {id}` address a
  stable attachment ID, not a slot or its active image. Actual Mesh and Clipping
  bindings share borrowed dense rows; Region rejects without conversion.
  Inactive and active/none inventory retain their activation and metadata.
  Each operation uses the existing frozen geometry epoch and one staged
  canonical transaction/history entry; duplicate or partially invalid strokes
  cannot commit. Resulting clip polygons are validated after weight changes.
  Bind edits ordered membership with no implicit Auto. A first bound bone starts
  at100%; later new columns start at zero, but **all** new columns receive
  current evaluated world-inverse coordinates. Retained columns preserve their
  bind offsets and weights. Removing columns normalizes retained mass; if it is
  zero, the first retained column receives full weight (explicit FBones policy).
  Empty membership returns vertices to the owner while preserving current world
  shape. This posed Unbind preservation is policy, not new exact-original proof.
  Typed numeric/paint/Normalize/Auto preserve every existing binding-position
  bit, including dormant columns and legitimate `(0,0)` origins. Weight changes
  can therefore move a posed polygon; they never silently Update Bindings.
  A sole100% influence cannot be reduced when all other mass is zero; the new
  exact4.3.26 Direct probe also corrects that boundary in legacy manual editing.
  Legacy image BindMesh/AutoWeights keep their separate initialization policy;
  new Scene Bind never invokes those wrappers. Typed Auto uses the same
  independent diffusion algorithm with real mesh topology or consecutive clip
  boundary edges, without invented UVs, images or cross-polygon diagonals.
  Its result is independent FBones behavior, not proprietary Auto parity.

## Evaluated pose boundary

`evaluate_project {expectedRevision,request:{mode,time}}` is read-only. Modes
`reset`, `update`, `pose`, `none` use the independently implemented solver;
`replay` is an internal FBones setup-preview snapshot operation. Replay resets
at time0 and advances the unchanged authored setup in fixed 1/60-second ticks,
with a final partial tick if requested. It accepts time0–120 seconds, at most
7200 updates. It is not an animation/timeline scrubbing claim. Failed replay
does not replace the last successful cache.

**Recorded-motion extension, internal policy approved2026-10-29:** replay may
include `motion:{initial:LocalPose[],changes:[{tick,poses:LocalPose[]}]}`. It
resets using the complete initial authored pose, applies the latest complete
pose at each fixed tick, then applies the resulting physics state to the
current authored project with a nonadvancing Pose evaluation. Changes are
strictly increasing tick1 through`floor(time*60+1e-7)`; same-tick frontend edits
must be coalesced before submission. The existing partial final time tick is
allowed, using the latest earlier recorded pose. At time0 an old initial pose
with no changes plus current final Pose preserves its inertial anchor for the
next update; it is not replaced with a reset to the new bone position.

All seven local channels must be finite and within±1,000,000, and every complete
pose must match the revision's ordered bone count. Motion is accepted only for
Replay, for at most7200changes and262144total LocalPose records including the
initial pose. Overflow or malformed input fails without replacing the last
valid cache. The frontend must reset recording when bone identity/order/parent/
length or constraint configuration changes, and expose the same memory bound.
The history is transient, sent once per frozen gesture rather than each frame,
and never written into the project. This reproduces our explicit setup-preview
clock; it is **not** proof of the unresolved original PNG/animation clock phase.

The result contains `revision`, `documentId`, `poseEpoch`, `time`, `mode` and
complete `bones:[{id,authored,applied,world:{x,y,a,b,c,d}}]`. Authored/applied local
channels use f64; published world components are the exact f32 values cached by
native geometry arithmetic. The frontend must freeze and display these exact
world matrices while a gesture uses that epoch, then pass optional `poseEpoch`
to `edit_rig`. A subsequent evaluation supersedes the epoch even without an
authoring revision change. Document/revision mismatch, stale epoch or an epoch
attached to a nongeometry edit is rejected. Constrained geometry without an
epoch is rejected with `PoseRequired`, including new world-space clipping
polygons. No evaluated state, live velocity or epoch is saved in the project;
evaluation never adds history/dirtiness/revision and requires no per-frame IPC.

Clipping support policy is separate from binary decoding. Active intervals
must not overlap. Self endpoint covers the remaining draw order; a distinct
end is inclusive. New activation/reorder/end edits that violate this policy
fail atomically. Canonical source files with overlapping active intervals or
unverified earlier-than-start endpoints open inspection-only, preserving their
complete bytes for lossless copying. This policy follows the official clipping
guide's nonoverlap requirement; exact original earlier-than-start rendering is
still unknown and is not normalized to a guessed new endpoint.

Bone reparenting remaps every slot, inactive mesh/clip binding and constraint by
stable identity. Deleting a bone still referenced by any of these is rejected
atomically with an instruction to reassign references first. Slot reordering
remaps attachment addresses and clipping endpoints; deleting an endpoint still
used by another slot is rejected.

## Checks and remaining boundaries

Focused native tests cover A/B/none, inactive mesh and trace edits, bindings,
constraint CRUD/order, empty slots, clipping endpoints and polygon edits,
stable remapping, failed batches/scopes, stale saves, destination focus through
undo, portable unused/nested resources and binary save/reopen. Clipping tests
also cover weighted affine moves, unchanged old rows on insertion/deletion,
singular bones, duplicate/crossed polygons and atomic failure. Polygon authoring
requires 3–256 distinct finite vertices and a simple nonzero-area boundary;
these are implementation bounds, not measured original maxima.

Constraint solving uses a separate evaluated pose with the enforced boundary
above. Frontend gesture/trace integration must still be verified on Windows;
native boundary tests alone do not prove the viewport froze the correct frame.
AutoWeights and initial BindMesh now call the separate topology-aware
`auto_weights` module in both legacy and Scene paths; meaningful deformation
coverage and original-algorithm limits are recorded by the F302 owner. Native
integration tests assert normalized output, bit-exact existing positive binding
coordinates, one undo/redo and complete typed codec roundtrip. They do not
establish proprietary algorithm equivalence.
Original CLI acceptance of the format is recorded separately in
`FORMAT-SCENE-4.3.26.md`. Native Windows interaction, final UI compatibility,
clipping pixels and physics trajectories require their own actual checks.

The resumed native tests add read-only/reset/replay checks, exact frozen-pose
vertex movement, stale revision/document/epoch rejection, constrained trace and
new polygon creation, mixed region/weighted-mesh/inactive/clip group rotation,
invalid overlap/read-only source preservation and Auto integration. The
physics moving-parent teleport phase regression remains explicitly ignored;
passing state/codec tests do not remove that numerical parity limitation.

The MoveAttachment follow-up adds five passing native tests for destination
activation including none, source index adjustment, global order/stable IDs,
one Undo/Redo and same-slot no-op, stale saves/revisions/epochs, portable save,
affine region-to-mesh conversion, unweighted rebasing, weighted image/clipping
binding bits, bone/slot remapping and collision/singular/range failures.
Recorded-motion replay adds three focused passing tests for the owned shared
setup-preview fixture (tick11 change, tick21 freeze/current paused pose, next
update), paused time0 anchor retention, complete/count/channel/tick validation,
memory limits and unchanged cache after rejection. The shared
`solve/setup-preview-motion.json` is our implementation agreement fixture,
explicitly distinct from the original-Spine numeric oracle.

```sh
CARGO_HOME="$PWD/.tools/cargo" cargo test -p fbones-desktop --features scene-editing --offline project::scene_tests
CARGO_HOME="$PWD/.tools/cargo" cargo test -p fbones-desktop --features scene-editing --offline clip_edit::tests
```
