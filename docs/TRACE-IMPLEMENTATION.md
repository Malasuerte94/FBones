# Mesh tracing and setup geometry refinements

This is FBones' own bounded image-analysis implementation. It is not a claim
to reproduce Spine's proprietary tracing algorithm. The UI/reference audit is
separate; the only original-editor comparison target is Spine 4.3.26.

## Native APIs

`trace::trace_png(&ImageAsset, TraceOptions) -> Result<TraceGeometry, AppError>`
validates parameters, decodes the already validated PNG bytes into RGBA and
returns UV-space geometry. Run it in a blocking worker, not on pointer events.

Options use serde camelCase/defaults:

- `alphaThreshold`: 0–254; alpha <= threshold is ignored, including shadows.
- `tolerance`: source-pixel silhouette simplification tolerance, 0–128.
- `spacing`: desired maximum boundary segment length, 0.5–4096 source pixels.
- `inner`: enable inner-detail tracing and surface scaffolding.
- `innerThreshold`: minimum normalized RGB contrast, 0–1.
- `innerTolerance`: dominant line-detection tolerance, 0.5–32 pixels.
- `innerSpacing`: desired detail/coverage spacing, 2–1024 pixels.
- `maxVertices`: 3–256. Insufficient budgets can reject a silhouette.

Output: `uvs`, `triangles`, `edges`, `hull`, `innerCount`, `filledHoles`,
`bridgedIslands`, `usedTolerance`, `usedSpacing`, `budgetAdjusted`. Boundary
vertices come first, edges use vertex indices, and topology is already
constrained and quality-optimized in the image's physical aspect ratio.

The single-hull profile fills alpha holes with geometry and retains separated
islands under a convex transparent bridge. Original pixels remain untouched:
texture transparency still renders holes/bridges transparently. Diagnostics
report these conditions; do not claim geometric holes or independent islands
were preserved. Excessively complex alpha masks fail without mutating a mesh.

## Algorithm and bounds

- Alpha mask and directed raster boundary edges preserve concave outlines.
  Four-connected corner resolution keeps touching islands distinguishable.
- Closed RDP simplification uses a work cap; a pathological sawtooth cannot
  trigger unbounded quadratic work. At most 32 bounded attempts can raise
  tolerance to meet the vertex budget. Straight boundary spans are resampled.
- Inner extraction uses the strongest RGB Sobel gradient per spatial cell,
  then bounded Hough voting and signed gradient-direction coherence. Fine
  projection refinement finds oblique straight boundaries without treating
  arbitrary noisy pixels as long structural lines.
- At most eight dominant straight segments become explicit constraints.
  Shared intersections are inserted once; near-degenerate line arrangements
  are rejected. Remaining contrast samples and sparse surface points improve
  coverage; point/line spacing prevents redundant slivers.
- All operations are deterministic and capped at 4096² pixels, 131,072 raster
  boundary edges, approximately 65,536 gradient samples, 180 angle bins,
  1,024 candidate peaks and 256 output vertices. High-complexity alpha masks
  reject early. Low vertex budgets adapt actual spacings and report it.
- Constrained triangulation preserves all hull/explicit segments. Free diagonals
  improve the minimum angle by convex flips; equal-quality choices use stable
  index ordering. `triangulate_for_positions` measures actual posed geometry
  while retaining UV-valid topology, rather than assuming square UV metrics.

## Setup editing and deformation

`mesh_edit::remesh(mesh, uvs, triangles, edges, hull, poses)` preserves exact
existing vertex rows and dense binding-column order. In old UV faces it
interpolates `weight * localPosition`, divides by the new weight, and preserves
the barycentric posed world point. Outside the old UV hull it extends a fitted
affine image plane, takes the nearest influence distribution and initializes
local positions using the full inverse bone matrices.

`move_vertices(mesh, targets, poses, edit_uvs)` is atomic. Setup edits map the
requested world point through the old piecewise image mapping, clamp UVs to
[0,1], and retessellate using actual world-space triangle quality. Deformation
keeps UVs and topology fixed, avoiding texture/topology popping during posing.
Invalid/crossed setup boundaries are rejected without partial mutation.

`stroke(mesh, from, points, poses, edit_uvs)` connects completed endpoints in one
mutation and returns the actual endpoint index. It inserts a new boundary point
when extending a cropped hull and remaps existing indices/influences. In
Deformed mode, existing-face/edge insertion remains supported and boundary
insertion remaps the anchor. Crossing explicit constraints remain a rejected
operation; this helper does not silently delete them.

The live TypeScript mirror is `src/domain/meshEdit.ts`:
`previewMeshEdit(bones, mesh, moves, editUvs)` plus pure `retriangulate`.
It uses an incremental edge priority queue and an existing-topology fast path.
Invalid/collapsed drafts retain the last valid mesh; Rust validates on release.
No scene IPC is added per pointer frame.

## Observed validation

Meaningful tests cover alpha/shadow thresholding, transparency, concavity,
hole/island diagnostics, RGB straight/diagonal/oblique/crossing detail, noisy
textures, zero-tolerance sawtooth bounds, geometry budgets, PNG decoding,
canonical binary roundtrips, full affine scale/shear mapping, weighted posed
remeshing, boundary growth, connected strokes, deformation, atomic failures,
quality flips and constraint preservation. TypeScript tests also cover twelve
deterministic jittered constrained surfaces. Isolated native tests/strict Clippy
and TypeScript tests/typechecking passed before integration.

A controlled own 4K fixture produced 228 vertices, hull 144 and 310 triangles.
Its byte-identical `.fbones`/`.spine` copies were accepted/exported by original
Windows Spine 4.3.26. Independent Python verification checks envelope/CRC,
UV area, valid/non-inverted triangles, image-plane positions, all constraints
and boundary incidence. This also covers object/array counts above 127.
Aggregate evidence: `analysis/trace-export-check.json`; ignored fixture/log:
`.local/trace-fixture`, `.local/trace-spine-export.log`.

Observed exporter precision: positions such as 247.3050112 are emitted as
247.30; runtime comparison uses 0.0053 pixel tolerance, while canonical binary
roundtrips compare the exact arrays. UVs retain more digits. This precision
observation is distinct from binary data loss.

## Performance observations

On the current Linux host, optimized isolated RGBA-core tests measured:

- 4096² opaque image + strong straight detail: about 192 ms, 228 vertices.
- Pathological 4096² alternating alpha mask: rejected in about 5 ms.
- Dense 4096² RGB noise: about 551 ms, 256 vertices.
- Peak isolated test-process RSS: 106,320 KiB (about 104 MiB).

These timings exclude PNG decode, IPC and the rest of the desktop application;
they are observations rather than cross-platform timing guarantees. Commands:
build the ignored `.local/trace-tests` harness in release mode, then run its
latest test executable with `--ignored --nocapture` under `/usr/bin/time -v`.
The benchmark is ignored in normal suites and uses only generated own pixels.

The live JS 256-vertex jittered grid measured about 19 ms for full retessellation
and 24 ms total for ten local edit previews (about 2.4 ms each). The former
naive preview took about 262 ms; the incremental implementation removes that
per-drag cost. Measurements are in ignored local logs and tests.
