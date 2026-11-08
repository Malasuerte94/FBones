# Bounded large Mesh integration

2026-11-07. The user resumed work on the four unsupported project profiles.
The next independently verified prerequisite is Scene Mesh support through512
vertices. **The actual corpus remains4editable/4inspection-only.** E's265slots
and reversing curves remain unsupported; no record is discarded to admit it.
This is a measured FBones budget, not an original editor limit or full parity.

Pre-code decisions and direct evidence:
[DATA](ANIMATION-LARGE-MESH-DATA-GATE-2026-11-07.md),
[UI](ANIMATION-LARGE-MESH-UI-GATE-2026-11-07.md),
[native capacity](ANIMATION-LARGE-MESH-CAPACITY-NATIVE-GATE-2026-11-07.md).

## Final implementation

Scene Mesh validation permits512vertices,1024UV floats and3072triangle indices.
The shared reader permits an oversized UV FloatList only at Scene Mesh46/tag12;
cached references must also obey each requesting field's bound. Other float
lists, legacy Mesh256/1536, Clip256, binding columns128, aggregate geometry4096,
edge4096, slots128, generic/arena/depth/byte and image budgets remain separate.
Import and Save preserve topology and dense rows without retriangulation or
normalization. Large Scene meshes cannot be converted to the legacy profile.

Native binding/Auto/triangulation/remesh/insertion share the matching Scene
arithmetic envelope. Scene Mesh vertex-move/weight/deform world-target batches
permit512 so All vertices and whole-mesh Animate edits remain one transaction.
Clip requests remain256; legacy format closure still rejects oversized geometry.
Stroke limits retain their actual scopes: inner Scene128, outer/legacy256;
automatic Trace output stays256. No influence/physics/slot/curve budget expands.

The live quality-flip queue now uses vertex count as its radix, removing the
actual collisions between distinct edges above256. Heap identity and tie order
use the same injective encoding. Existing≤256 goldens retain exact triangles.
No controls, panel arrangement, transform HUD or renderer startup changed.

A separate direct comparison imports the actual Rust triangulation module and
the actual TypeScript helper. All eight convex/grid cases at256/301/308/512
produce exactly identical ordered triangle arrays after posed retessellation;
all vertices, boundary edges, winding and grid area pass independent checks.
The std-only Rust adapter supplies only the matching Scene512 constant and error
type; it does not reimplement triangulation or claim Session/browser coverage.

The [independent saved-data proof](ANIMATION-LARGE-MESH-SAVED-DATA-2026-11-07.md)
preserves all three actual E Mesh subgraphs and30472sourcef32fields in a new own
167725-byte wrapper, including tags/order/sharing and zero image dimensions.
The separate own512source preserves8264originalf32fields and its complete graph;
only the intended2048-offset frame21key and image-root normalization change.
Its independently expected typed model reproduces all45436saved payload bytes
and the compressed envelope. That model runner reuses the product codec outside
Session/history; the Python reference-aware graph/envelope comparison is separate
and independent. This is not a second encoder implementation or full E admission.

## Production Session and store evidence

Own public surfaces are authored as direct rectangular grid faces, independently
of the triangulation implementations. A308-row fixture has616UV floats and1638
triangle indices, matching the two relevant source-E cardinalities. A512-row
fixture has1024UV floats and2790indices with two dense binding columns.

Eight new native checks pass: high-index/full512-row weight and vertex edits,
Auto and dormant position bits, triangulation/area, Clip versus Mesh deform
limits, exact308roundtrip, portable file/resource history, and precise frozen
512-world-target keying. Invalid513/foreign/duplicate/stale operations reject
without changing summary/payload/history. Undo reverses one completed batch.
Format tests additionally cover weighted/unweighted257/301/308/512,128columns,
legacy/Clip/aggregate rejection, UV context and cached-reference abuse.

The actual production store plus dedicated Rust host passes whole-mesh Animate
editing: Auto Key off stages2048offsets; refresh and Save retain drafts without
baking. Auto Key on sends all512world targets in one command and creates one
frame21key. All2048values are checked against the expected4.25/5.5 alternation;
Setup slots/bones and both existing keys are unchanged. Undo/Redo, guard failures,
refresh, portable Save/reopen and unkeyed reopen pass. Both PNG triples and the
own source remain identical. The largest observed bridge reply is196667bytes;
this is one selected workflow, not a transport maximum or performance guarantee.

The first own Session test incorrectly attempted Setup edits while source deform
keys existed. The existing clear-keys guard correctly rejected them. Setup
positive fixtures now omit deformation tracks before encoding; the separate
Animate fixture retains them. No product guard changed. The first store collector
used nonexistent convenience Undo methods; its corrected successor uses the
existing editRig commands. Both failures are retained. Strict Clippy's test-only
manual-contains diagnostic was corrected without changing behavior.

## Regression and platform limits

Current production host SHA256
`d4fcdea1ea5d68bff8e8b864d0860f7bd69e10a40928fd38259ef253e31a2d02`
passes the retained A/H/Sequence/resource/two-color/split/partial/corpus workflows.
All four actual editable sources produce exactly their prior saved files;
four guarded sources still reject mutation and copy/reopen byte-identically.
Every original/copy source hash remains unchanged. No original oracle batch
was repeated and no personal process/window was used.

394JS tests pass with one existing Physics skip;305native pass with two ignored;
87Scene/16default format and95legacy desktop tests pass. Product/UI TypeScript,
production web build, desktop check, strict Clippy and rustfmt pass.109Playwright
cases are discovered in40files, zero executed. The new large-Mesh UI scenario
remains unrun: existing pre-page Chromium failure was not retried unchanged.

Current normal release builds with SHA256
`cbb7cf1c14af5b9de11ec2688c7aafb43e03f3cf26bfcb810a796f80af4cc8ff`.
An own empty isolated-profile launch exits101 at GTK initialization; no current
normal window is left available. Browser/GPU/native OS gestures, Windows/macOS
acceptance and fresh independently encoded original4.3.26 acceptance remain open.
No Windows image, publish, push or delivery selection changed. F105 remains active.

Private recipes/logs/artifacts live under ignored
`animation-large-mesh-2026-11-07/`; source/capacity/edge receipts also remain under
the paired DATA/UI/native audit directories. The public aggregate checkpoint is
`analysis/animation-large-mesh-check.json`. Reuse these results before choosing
the next independent guarded-source question; do not clamp reversing curves or
infer inheritance controls from an export enum alone.
