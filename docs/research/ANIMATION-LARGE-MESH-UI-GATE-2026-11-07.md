# Large Mesh prerequisite — pre-code UI gate

2026-11-07. Latest user/root resume supersedes the historical pause in STATE.
Read AGENTS, STATE/TASKS, retained B/E/F/G triage, split/partial gates,
[E DATA](ANIMATION-E-TRIAGE-DATA-GATE-2026-11-07.md),
[weighted insertion UI](WEIGHTED-VERTEX-INSERT-UI-4.3.26.md) and
[binding policy](WEIGHTED-VERTEX-BINDING-POLICY.md), and current mesh/weights/
deform/viewport/epoch source. Re-viewed supplied properties/viewport crops and
Setup `animare/Spine_Q0STKcaHeG.png`. No product edits, shared checks, browser,
original process operation or capacity change occurred.

## Which prerequisite is independently coherent

The corpus remains4editable/4guarded. E has249bones/265slots and three large
Meshes:301unweighted vertices and two308weighted/15-column instances. It also
contains four genuinely reversing curve axes. The X-only Translate prerequisite
is now separately supported, but no capacity-only change admits E. B additionally
has seven nondefault Bone12/tag27 values and a reversing Rotate segment; F/G
retain their separately recorded large-domain/resource/unknown-family blockers.
Do not repair/clamp curves, drop records or infer admission from UI identity sizes.

A bounded Mesh-only profile up to512 vertices is a meaningful independent
FBones prerequisite with the complete format/native/live-preview paths and costs
verified before admission. Root selects usable Scene-Mesh vertex move, paint and
Animate world-target batches up to512, retaining Clip/legacy256 separately. Slot inventory/draw-order expansion, nondefault inheritance and
reversing-curve sampling are separate, deferred decisions.512 is a proposed
FBones budget, not an observed original editor limit or a consequence of u16 IDs.
The paired DATA/native measured gate and root decision authorize cap lines;
this UI source review alone does not establish their cost or full admission.

Existing exact4.3.26 mesh observations show Edit Mesh Modify/Create/Delete,
Deformed and triangulation/Trace controls on a six-row weighted source. The
unsuccessful insertion observation did not prove new-row arithmetic; the accepted
FBones binding policy remains explicit. Supplied `animare/` and viewport crops
establish compact shared controls, not editing or responsiveness at301–512 rows.
No new control, panel relocation or guessed warning is needed simply because the
supported inventory grows. Preserve the current shared Setup/Animate layout.

Before implementation, read the subsequently finalized paired
[large-Mesh DATA gate](ANIMATION-LARGE-MESH-DATA-GATE-2026-11-07.md) and
[native capacity/cost gate](ANIMATION-LARGE-MESH-CAPACITY-NATIVE-GATE-2026-11-07.md).

## Concrete live-preview identity defect above the old profile

`src/domain/meshEdit.ts::improve` indexes undirected edges with
`min(u,v)*256+max(u,v)`. Valid distinct edges(0,258) and(1,2) both produce258;
259vertices is the first possible such non-self-edge collision. Compatibility
review independently finds colliding triangle-edge groups in all three retained
large E Meshes. This is a real algorithm dependency when larger meshes become
reachable, not a claimed failure of an admitted<=256 project.

`retessellateExisting` can call improve directly even when retriangulate's old
vertex guard would reject the same size. Merely raising native/format counts
would therefore leave incorrect or skipped live edge-quality decisions. Rust
triangulation uses ordered tuple identities rather than this radix collision.
The frontend fix must be collision-free for the chosen bound and keep live/
authoritative topology decisions coherent.

A stride equal to the current fixed point-array length is injective for valid
indices, safely bounded at this proposed size, and preserves lexicographic edge
ordering used by the heap and quality tie-break. For existing<=256 inputs its
numeric IDs change but their valid-pair ordering does not; this needs unchanged
topology/golden regressions, not just an injectivity test. Keep source topology
untouched until a successful authored edit; do not remesh on import or Save.

## Controls and limits must remain distinct

| Path | Current source behavior / required boundary |
| --- | --- |
| Selection/hit/high-index fields | Vertex arrays, Sets and bounds against actual row count; no 8-bit index mask found. MeshTools displays row count/index, Weights options enumerate rows. Prove index255/256/307/511 directly. |
| Setup Modify/deformed move | Pure binding preview handles dynamic rows; UV-following preview also fits/interpolates/remeshes and can reach improve. Native repeats validation at release. Preserve last valid preview/atomic rejection. |
| Create/Delete/edges | Existing UV/hull/index remapping and full dense-row policy remain; test insertion at the new boundary, high-index edges, noninvertible/crossed rejection and preservation of old/dormant rows. |
| Whole Mesh / soft selection | A scalar moveMesh command and a generated array of per-vertex targets are different shapes. Root selects Scene Mesh move/paint targets512 so soft/All vertices can complete in one atomic gesture; Clip and legacy targets retain256. |
| Animate deformation | Topology/UVs/weights remain unchanged. Whole transform/moveMesh expands to all rows; raise only Scene Mesh world-target batches to512 in both from_world_targets and world_target_offsets. Clip remains256. Auto Key-off/manual/Auto Key-on must agree at512. |
| Weights | Bind/Auto/dense-binding validation need the matching Mesh512 inventory; influence/member128 stays. Scene Mesh direct/paint batches512 permit All vertices; Clip uses256. Preserve lock/scope and every unedited local coordinate. |
| Trace / clipping | Trace slider/authoring256 and Clip polygon256 remain independent. `boundaryEdges`256 is used for **Clip** edge/smoothing paths, not ordinary Mesh topology; do not broaden it merely for a larger Mesh. Scene stroke point128 and legacy stroke point256 are separate existing request bounds; retain them without inferring a512-sample stroke. |
| Format | Vertex count, UV FloatList count, triangle indices, total geometry, binding columns and reader closure are distinct. E's UV602/616 and weighted triangle1638 exceed additional current guards. u16 triangles/Uint32 renderer indices are not permission to relax these budgets. |

A high-index307 target is not a308-target request: test both addressed indices
and full512-row batches. Root's usable-profile decision avoids the previous
Auto Key-off preview/native256 mismatch for Mesh. Scene-Mesh-specific bounds
must not accidentally broaden Clip or legacy commands. Reject513 vertices,
foreign/duplicate targets, stale leases and invalid coordinates atomically.
Never chunk one completed gesture into several history entries, truncate lists
or silently commit a partial selection. Preserve the existing clear failure
notice and old pose/drafts/IDs/history/source on every rejected action; no new
performance warning or mesh toolbar is justified.

The existing native requested_targets512 limit counts **attachment IDs** requested
for frozen deformation evaluation. It does not supply the per-Mesh world-vertex
batch bound. Stored deform-key coordinate dimension and key-count/aggregate
budgets are separate again. Keep those dimensions explicit in tests and constants.

Deformation's Graph still plots one interval-progress curve for the entire dense
offset vector, not one curve per vertex. Its cardinality/controls are unchanged.
The vector dimension follows all dense position columns (including dormant
coordinates):512rows×128columns×2 is131072 coordinates in that worst shape.
Actual DTO/request/response and aggregate deform-coordinate bounds therefore
need measurement; do not change request/JSONL/format limits to hide a failing
test transport. Main/Preview use actual geometry; source-zero image metadata
still does not supply replacement bounds, and zero-size Reset remains disabled.

Freeze leases retain exact document/revision/frame/clip/draft-version/generation
checks. A resource generation invalidates old geometry while verified logical
document continuity can retain selection and working intent. Larger arrays must
not cause a stale pose/selection reply to install, a late release to restore a
canceled hold, a topology change to reuse old vertex scope, or Simulate Off to
turn on. Whole attachments/inactive selections remain distinct from activation
and draw order. No full-scene IPC per pointer event/frame is introduced.

## Required independent checks before a capacity decision

Reuse the private source probe `animation-e-ui-triage-2026-11-07/`: actual pure
helpers handle265-slot identity/permutation and308-row binding/high-index307/
616-coordinate unweighted deformation, while retriangulate308 currently rejects
and the edge-ID equation collides. Its own collinear mesh proves only dynamic
cardinality/indexing, not a valid surface or native/capacity acceptance. Do not
rerun unchanged probes as performance evidence.

New own valid surfaces should include the actual colliding disjoint diagonals,
301/308 and exact512/513 boundaries, affine weighted/dormant rows, explicit
constraints, dense influence bounds, collapsed and crossed geometry. Compare
frontend live triangles/quality/area/required edges with Rust for unchanged
<=256 fixtures and the proposed larger profile. Measure representative/worst
triangulation, binding/Auto, native summary/history/freeze/deform and resource
costs in isolation before approving budgets. Use the actual E geometry as a
private read-only shape only after its semantics are separately classified;
never drop its unrelated blockers to claim it loads.

Compiled-control/native checks must cover high-index numeric/Direct field,
selection/range/All vertices, locks, preview versus release, Escape, busy/readonly,
pending Save/invalid drafts, source-preserving Undo/Redo/reopen, stale pose and
portable PNGs. Actual browser layout, picking/pointer capture, GPU pixels and
original independently encoded acceptance remain separate pending evidence;
current pre-CDP failures do not justify an unchanged browser retry. A UI owner
can own the pure live helper and focused tests after root freezes the native/
format constants/request policy; no widget edit is currently justified.

## Deferred inheritance alternative

The supplied properties crop `spine_pictures/Spine_eH8VIB7TXl.png` visibly has
Inherit Rotation/Scale and a checked disabled Reflection control; it has no
version banner and proves appearance only. It does not map B's numeric2/3 values
to checkbox combinations or prove enable dependencies/gestures. Current BoneView
has no inheritance field and worldBones/ordered solver/parent-local transforms
assume normal affine composition except explicit evaluated-world overrides.
Supporting B inheritance is therefore not a hidden metadata-only import fix.
It would require a separate exact-source mapping, native/TS evaluation, authoring
inverse/reparent, geometry/weights and UI-status/control policy gate. Preserve
the shared transform HUD; Setup-only properties belong in the existing inspector
if later supported. Do not guess an enum/checkbox or reuse older-editor behavior.

Private `animation-large-mesh-ui-2026-11-07/source-manifest-v1.json` records
source/screenshot pins and the final root policy: Scene Mesh512 vertex inventory
and move/paint/deform batches, Clip/legacy256, Scene stroke128/internal and
outer/legacy stroke256 unchanged, Trace256 and binding/member128 unchanged.
The UI gate is frozen before dependent code; DATA's separate gate and root own
the measured capacity approval and integration. No new UI widget is proposed.

## Owned pure live-helper implementation receipt

After explicit root start and both gates, changed only `domain/meshEdit.ts` edge
identity to point-count stride and its live triangulation bound to512. No widget,
new algorithm, native authority or other profile limit changed in this owned
slice. `node tests/mesh-edit.test.mjs`: **8/8PASS** (four retained and four new).
New checks freeze exact pre-change256grid/convex triangle hashes, prove positive
coverage/indices/area for257/301/308/512 own connected grid/convex surfaces,
reject513, retain distinct high-index constrained edges, and verify weighted
affine Modify307 and full512-row deformation with untouched rows/weights/UV policy.

An initial long-diagonal constraint in the new grid reached the existing bounded
inserter's Cannot insert edge rejection. That constraint was replaced with a
local valid one to isolate edge identity; no algorithm guard was relaxed. The
private native audit's disjoint-quad improve reproduction remains the direct
old-map collision/quality demonstration; it was not exposed as a new public
testing API or padded with unused public fixture vertices.

The old goldens were collected from the actual helper before the product edit
in ignored `animation-large-mesh-ui-2026-11-07/old-goldens-v1.json`. Public tests
contain only deterministic own generators/hashes, no personal source geometry.
Root owns actual Rust/TS comparison, native transactions/history/equality,
isolated E wrappers, shared checks and launch/checkpoint. Node topology/preview
tests prove no browser/GPU/original acceptance and E remains guarded.

Added optional `tests/e2e/large-mesh.native.spec.ts` (one scenario, **UNRUN**):
own512-row native seed, actual vertex511 Direct-weight control, Undo/Redo, then
Animate all512 vertices through the existing Soft selection controls (Size400,
Feather0) and one real mouse drag at the native-evaluated vertex511 position.
The scenario checks512distinct native targets/2048dense offsets, one edit/history
action, unchanged Setup/topology, history and portable reopen. It preserves the
existing prohibition on Setup binding changes under stored deformation: first
assert that failure, then explicitly delete only the seed's source keys as
fixture arrangement before the Setup UI edit. The Animate action creates its
first deformation key. No product guard or test transport is relaxed; root owns
UI typecheck/discovery and any future actual browser run.
