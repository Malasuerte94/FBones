# Scene Mesh capacity: native review and isolated costs

2026-11-07. Research and pre-code findings; no product edits, shared builds/tests,
original process operations or new source admission. The coordinator's current
proposal is Scene Mesh512 vertices, UV1024 and triangle3072 indices. Legacy Mesh,
Clipping and their format bounds remain256; binding columns128, total geometry4096,
stroke samples256, Auto Trace256 and existing resource/depth budgets are separate.
Curve/inheritance semantics are unchanged. E remains guarded independently.

## Direct collision evidence

`src/domain/meshEdit.ts:46` uses `min*256+max` for the quality-flip heap/map.
Normalized edges `(0,258)` and `(1,2)` both encode258; the first possible collision
is259 vertices. The retained E triangle-edge sets contain two collision groups in
the301-vertex Mesh and one in each308-vertex Mesh. This is actual stored topology,
not proof that a particular original gesture changes it.

An isolated in-memory copy of the actual frontend function receives two own
disconnected quads with those colliding diagonals. Current code merges four face
references and skips both needed quality flips. Replacing only the radix with
`points.length` produces both correct flips. This preserves lexicographic edge
ordering for valid indices and therefore the existing heap/tie policy. Rust
`triangulation.rs` already uses ordered tuple keys. No wire/index redesign is
needed: native triangles areu16 and Pixi's current mesh indices areUint32Array.

## Native paths requiring coherent bounds

Inventory/topology guards occur in `binding.rs:85`, `auto_weights.rs:29` and122,
`mesh_edit.rs:161` and339, `mesh.rs:268`, and `triangulation.rs:157`.
Complete final format validation must still reject Clip257 and legacy Mesh257.
Shared binding helpers must permit the Scene Mesh inventory without changing the
independent128-column guard. Native mesh DTO, skinning and frozen world-vertex
vectors already use dynamically sized rows; no256-sized ID/index table was found.

Whole-mesh actions need an explicit correlated limit. Scene `MoveVertices` at
`scene_bridge.rs:693` and `mesh_edit.rs:273`, and weight batches at569/721 currently
reject more than256 entries. `useGeometryAnimationWorkspace.ts:82` expands Animate
MoveMesh/TransformAttachments into every vertex; Auto Key then sends world targets.
Both `animation_deform.rs:614` and687 currently reject more than256. Merely changing
inventory would therefore break full-mesh soft selection and Animate Auto Key.
Use Mesh512/Clip256 by addressed attachment kind for those actions, preserving one
transaction/history entry. Direct deform-key offsets already accept complete
vectors under the unchanged4,194,304 aggregate-coordinate guard; do not truncate,
split commands, fabricate offsets or change that unrelated budget.

## Isolated feasibility measurements

Own ignored tooling is retained in `.local/research/mesh-capacity-review-2026-11-07/`.
The native triangulation prototype copies the actual source and changes only its
vertex guard256→512. A std-only `rustc -O` driver uses own convex boundaries and
jittered grids, including full posed-quality retessellation. Three-run medians:

| Vertices | Native convex ms | Native grid ms | JS convex ms | JS grid ms |
| ---: | ---: | ---: | ---: | ---: |
|256|46.056|95.103|21.042|5.777|
|301|79.869|179.569|23.868|4.880|
|308|79.390|166.277|23.269|5.109|
|512|248.852|610.730|62.630|10.723|

The JS prototype changes the radix and inventory guard only. All24 observations
have positive face areas; convex/grid256 outputs exactly equal the original
frontend output. Native512 grid produces3054 triangle indices, below proposed3072;
unit grid area remains1 within2e-9. These are selected synthetic cases, not a
worst-case timing bound or native/browser/GPU frame-rate claim. The existing
convergence bound remains; ~0.61s native completion is relevant to a committed
retessellation, not a per-frame RPC policy. JS512 convex also exceeds16ms here.

A second std-only prototype imports actual binding/AutoWeights implementations,
changes only vertex/triangle guards, and uses minimal own shape types plus the
unchanged extracted Pose arithmetic. It measures all rows moved and all weights
painted, including repeated whole-binding validation, then full scoped Auto:

| Vertices / columns | Move batch ms | Paint batch ms | Auto all ms |
| --- | ---: | ---: | ---: |
|301 /15|0.014|1.749|1.778|
|301 /128|0.097|18.990|12.731|
|308 /15|0.013|1.891|1.832|
|308 /128|0.060|20.019|13.213|
|512 /15|0.022|5.202|4.022|
|512 /128|0.100|54.216|30.090|

All results are finite/normalized. This does not include Session cloning,
serialization, source encoding, real IPC, frozen-lease publication or GPU upload;
those remain coordinator integration checks. The512×128 Auto adjacency matrix is
512² booleans, and its dense f64 work matrices scale with vertices×columns.
Total project geometry4096 is unchanged, so the worst-case aggregate dense-row
inventory budget is unchanged; per-attachment scratch may increase.

## Required implementation regressions

Use own301/308/512 meshes with high indices, dense15/128-column bindings, both
weighted/unweighted shapes, explicit edges and asymmetrical samples. Verify
load→None/Animate sampling, a selected vertex above255, full move/soft drag/paint,
Auto/normalization, insertion511→512/rejection513, delete/remesh, complete deform
keys and frozen Auto Key targets. Check stable IDs, unrelated raw bits, one history
action, Undo/Redo, Save/reopen and stale/failing replies. Keep Clip257, legacy257,
column129, stroke257, trace limits, total4097 and malformed topology rejection.
Existing small-mesh outputs must remain unchanged. E's reversing curves,265slots
and other independent guards remain visible; no new editable-source count follows.

## Native implementation handoff

After both paired gates and explicit coordinator START, native source now uses
the named Scene512/3072 constants through `mesh::MAX_VERTICES` and
`MAX_TRIANGLE_INDICES`. These are shared arithmetic envelopes: the legacy-only
build keeps256/1536. The coordinator explicitly accepted this approach without
threading a new policy argument through every arithmetic helper. In the default
Scene-enabled build, full legacy/Clip format validation before history publication
still enforces256; that complete Session boundary is the public authorization.
Scene attachment-kind weight/deform request guards separately retain Clip256.
Scene Mesh vertex/weight/deform batches now use512; stroke128 internally and256
at existing outer/legacy boundaries are untouched. No sampling/weight arithmetic,
topology algorithm, wire shape, unknown-record or curve guard was changed.

Five focused native regressions are prepared:512-row dense painting preserving
all position bits with513 rejection;308-row/1638-index Auto with dormant bits and
triangle overflow; full512-row deformation preserving UV/topology and atomic
duplicate/over-cap/stroke rejection;512-index triangulation area/fixed edges with
513 rejection; and full512 world targets with Clip257/duplicate rejection.
The first four are in `src-tauri/src/large_mesh_core_tests.rs`, included by
`mesh.rs`; the fifth is in `animation_deform.rs`. Coordinator-owned own-fixture
Session/history/save/legacy/Clip boundary tests are separate. Only owned-file
rustfmt ran at handoff; no Cargo/shared tests or new normal app launch were run
by this implementation worker. The coordinator owns integration verification and
the current-app launch attempt. Tests are prepared, not yet claimed passing here.
Private `native-handoff-v1.json` pins the eight owned Rust files and this limit.
