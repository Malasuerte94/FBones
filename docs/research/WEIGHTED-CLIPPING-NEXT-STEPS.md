# Weighted clipping and scoped Auto: next implementation handoff

Recorded 2026-10-29 during the frozen 0.8.0 Windows delivery. This is a research
and implementation proposal only: no production source changed for this memo,
and no acceptance gate is newly declared passed. F305/F302 remain parts of the
existing goal, rather than replacement definitions of that goal.

## Evidence and limits

**Exact original 4.3.26 evidence, reused:**

- `analysis/scene-codec-check.json`, case `clip-weighted`, records original
  import/export acceptance, matching controlled runtime fields, and identical
  byte copying for dense weighted clipping. The paired
  `FEATURE-DATA-4.3.26.md` audit identifies Clipping84 → Binding53 → Vertex54,
  with the bound-bone list and dense weight/local-position arrays. This proves
  the persistent representation, not an original interactive bind/paint action.
- Existing clipping flag GUI observations and the nine cases in
  `analysis/clipping-pixels-check.json` prove static region masking, including
  inclusive end and inverse/hull behavior. They do not prove weighted/deformed
  clipping pixels. Do not repeat those accepted static batches.
- Existing paired Auto action changed all fifteen weights while keeping all
  thirty binding-position components bit-identical. That action selected no
  vertex or influence subset and introduced no formerly-zero influence.
  `analysis/auto-weights-reference-check.json` cannot answer subset semantics.
- `clip_edit.rs` tests prove FBones' weighted vertex delta, insertion and
  deletion arithmetic. These are independent implementation tests, not an
  original application interaction claim.

**Official documentation, patch unpinned, consulted 2026-10-29:**

- The [Weights guide](https://en.esotericsoftware.com/spine-weights) explicitly
  applies its operations to clipping as well as image meshes. It distinguishes
  bound membership, selected influences, selected vertices and locks.
- Its [Auto section](https://en.esotericsoftware.com/spine-weights#Auto) limits
  computation to selected vertices and selected influence bones when present.
  The [adjustment section](https://en.esotericsoftware.com/spine-weights#Adjusting-weights)
  describes normalizing other weights during manual edits; this does not
  specify Auto's treatment of unselected influence mass. The separate
  [Update bindings action](https://en.esotericsoftware.com/spine-weights#Update-bindings)
  changes binding positions.
- The [Clipping transform section](https://en.esotericsoftware.com/spine-clipping#Transform-tools)
  documents entire-attachment translate/rotate/scale and an adjustable pivot.
  [Freeze](https://en.esotericsoftware.com/spine-clipping#Freeze) explains that
  these act on vertices; clipping has no intrinsic persistent transform.

**Unknown:** exact 4.3.26 subset/lock Auto normalization, zero-mass subset
behavior, dormant binding initialization, weighted clipping interactive control
details and proprietary numeric weighting. Do not infer these from older
versions or call the independent FBones diffusion algorithm parity.

## Concrete source gaps at this checkpoint

- `src-tauri/src/binding.rs` already provides real shared `world_vertex` and
  `move_vertex` arithmetic on `Vertex` plus bound bones. This is the right
  foundation; no synthetic image is needed.
- `mesh.rs::{bind,set_weight,normalize}` and `auto_weights::apply` still accept
  `Mesh`. `scene_bridge.rs` routes binding/painting through `mesh_mut()`, so a
  clipping attachment reaches the image-mesh error before these operations.
- `WeightsPanel.vue` derives `selectedSlot.mesh`; clipping is not a weight
  target. `createViewport.ts` painting, coverage, preview and hit selection also
  require `slot.mesh`. `ImageLayer.ts` paints weight overlays for image meshes,
  whereas clipping only receives its outline/vertex editing overlay.
- Native `transform_attachments` already handles actual clipping vertices for
  translate/rotate/scale, with one transaction and the geometry pose gate.
  The UI fails to expose that path: `App.vue::useTool` switches clipping mode to
  bones, and `imageGizmoState()` builds its pivot from rendered image polygons.
  This is a UI/domain-adapter gap, not a missing clip rotation wire field.
- `domain/clipping.ts::clippingPoints` currently adapts the mesh point utility
  with empty UV/triangle fields. It does not persist a fake mesh, but should be
  replaced by an actual dense-binding point helper in the same refactor.

## Proposed shared binding API (own design, not original recovered code)

Keep the existing canonical `Mesh` and `Clipping` structures and codec intact.
Add borrowed native binding views in `binding.rs`, for example:

```rust
struct DenseBindingRef<'a> {
    weighted: bool,
    bones: &'a [usize],
    vertices: &'a [Vertex],
}
struct DenseBindingMut<'a> {
    weighted: &'a mut bool,
    bones: &'a mut Vec<usize>,
    vertices: &'a mut Vec<Vertex>,
}
```

Both attachment variants supply these views directly. Extract world points,
bounded validation, bind/unbind, set-weight/paint and normalization into helpers
that consume those views. Keep mesh UV editing, image paths and triangle order
in mesh-specific code. Stage complete modified fields before assigning them;
do not expose partial mutation if a later inverse or polygon check fails.

Make Auto's graph input explicit, independent of image data: binding view plus
validated graph edges/topology. Image meshes supply their existing triangle and
manual-edge graph. Clipping supplies its polygon boundary; any temporary
interior triangulation must be an explicit FBones algorithm choice, preserve
the original polygon and edge inventory, and handle concavity without joining
empty space. Do not build a dummy `Mesh` to satisfy an old function signature.

Expose one attachment-addressed weight command path, preferably new typed
`bindAttachment`, `setAttachmentWeight`, `paintAttachmentWeights`,
`normalizeAttachmentWeights`, `autoAttachmentWeights` edits using stable
attachment IDs. Existing image/legacy edits may delegate to the same helpers;
do not reinterpret a slot ID as an attachment ID. Validate target kind, current
revision, existing bound influences, duplicate IDs and counts before mutation.
Extend geometry-edit classification so constrained scenes require the current
frozen `poseEpoch`, just as image binding already does.

On the frontend, use a shared `DenseBindingView` interface containing only
`weighted`, `bones` and `vertices`; `MeshView` and `ClippingView` can extend it.
Introduce point/weight-preview helpers over that interface and resolve an
explicit selected attachment into either kind. No fake image resources, UVs or
triangles should be necessary for clipping selection, weight rendering,
painting or persistence. Preserve selection separately from activation: an
inactive selected clip remains editable without activating it or showing a
fabricated PNG. A weight brush previews locally and commits once per stroke.

For initial bind, capture current evaluated world vertices and write each new
positive local binding using the frozen bone matrices, then compute weights.
Unbind returns to the owner bone while preserving those world vertices. Auto
changes weights without wholesale rebinding, so a posed polygon may move.
Set-weight's existing zero-row initialization behavior must be documented as
FBones policy unless a new direct observation settles it. Do not silently call
Update Bindings after every paint operation.

## Whole-clip transform interaction

Reuse the existing `transformAttachments` transaction. Resolve selected stable
attachment IDs into real region corners, mesh world points or clip world
points, rather than only slot active images. Show a selectable outline for an
inactive/hidden inspected attachment without changing active inventory.

Outside vertex-edit mode, selecting a clip and choosing Translate, Rotate or
Scale must keep the clip selected, show the existing gizmo and commit its
actual vertices. Use a transient pivot, initially the centroid; a moved pivot
is session interaction state, not an invented canonical clip transform.
Preserve weight values, binding membership, clip end/color/flags, attachment
ID, slot ownership and draw order. Under weighted clipping, apply each desired
world vertex delta through shared binding arithmetic, preserving relative
binding offsets rather than rebinding all influences. Native code already
does this; frontend preview must match it under affine and evaluated matrices.

Zero scale is currently rejected by native group transform as singular. Keep
that existing bounded policy visible; reflected nonsingular scales are valid.
Do not add a persistent rotation/scale property or claim a Freeze control is
implemented merely because the transform can be applied to vertices.

## Scoped Auto: settle the missing numeric contract first

The official selected-vertex contract supports leaving every unselected row
unchanged, including its local-position bits. Its selected-bone wording does
**not** settle whether outside weights are kept bit-for-bit, proportionally
rescaled, removed, or modified when selected influences initially total zero.
The general manual-edit normalization paragraph cannot resolve that ambiguity.

Before subset implementation, rotate the two reference agents into one small
new exact-4.3.26 study: one captures UI selection and action; one independently
checks before/after own binary exports. Use an asymmetric four-bone mesh whose
weights contain both nonzero outside mass and a zero selected-mass vertex.
Check (a) vertices only, (b) two selected influences, (c) both scopes, and
(d) one locked influence. Record every weight/local-position bit, binding
order, totals and world deformation; selected bones come from the Weights list,
not the Tree or current brush hover. Include a single selected influence to
discriminate preserving existing mass from giving it a full normalized weight.
These are new subset cases; do not repeat the accepted all-influence Auto case.

Suggested command shape is `scope: {vertices?: number[], bones?: stableId[]}`
with absence meaning all. The UI converts its empty selection into absence;
reject an explicitly empty, duplicate, stale, out-of-range or unbound native
scope rather than guessing. Scope lists must remain independent of bound
membership. Locks, if added, are separate per-attachment state and need their
own persistence decision; do not quietly add unknown binary fields.

If exact observation remains unavailable, a possible **explicit FBones
fallback**, pending review, is to keep outside weights bit-identical and
redistribute only the selected influences' existing total mass. A zero selected
mass then stays zero, and a one-bone scope cannot change its weight. This is
mathematically consistent but may differ from Spine and must not be presented
as authoritative. Float rounding correction must affect an editable influence
only. The current global top-four pruning must not delete protected outside
influences: either keep its budget local to the computed subset or state a
separate overall influence policy. Do not implement that choice implicitly.

## Focused acceptance after the 0.8 checkpoint

1. **Shared helper regression:** run the accepted image bind/weight cases through
   extracted helpers with identical results. Test weighted and unweighted clip
   bind/unbind, zero/coincident bones, reflected/sheared owners, invalid rows,
   missing bones, singular positive influences and atomic failure.
2. **Frozen geometry/history:** a clip under IK/Transform/Physics binds and
   unbinds at the displayed paused pose, using current epoch; stale revision or
   epoch rejects without changing scene/history. One native commit per brush
   stroke and per whole-clip transform; Undo/Redo restores IDs, dense rows,
   activation, endpoints and sibling inventory. Saving waits for pending edits.
3. **Bit and metadata invariants:** untouched vertex rows and meaningful
   binding offsets remain bit-identical where the operation promises that;
   normalized finite nonnegative weights, existing edge inventory, flags,
   RGBA, draw range and unrelated attachment bytes remain intact. Validate
   edited polygons through existing clip rules without discarding unknown data.
4. **Real Windows interaction:** select a new clip, bind two bones, set and
   paint weights, pose a bone, rotate and independently scale X/Y around both
   centroid and moved pivot, Escape/cancel, Undo, save/close/reopen. Include an
   inactive clip selection and a visible image+clip group. Observe actual
   native mouse behavior; a constructed DOM event is not a Windows check.
5. **New original comparison:** export the newly UI-authored weighted clip
   through original 4.3.26 and independently compare dense data. A dedicated
   deformed weighted-mask PNG case must compare actual pixels, including one
   trailing unmasked attachment. Reuse static mask oracle results rather than
   repeating their batch. Numeric Auto equivalence remains unknown even when
   its subset invariants and serialization pass.

Implementation ownership should split shared native binding/bridge, frontend
binding target/brush/gizmo, and paired reference/UI verification, within the
four-agent cap. Final integration owns current application launch and the
TASKS/STATE update; this memo changes neither product nor release artifacts.
