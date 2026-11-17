# Supplied mascot Mesh capacity — UI prerequisite gate

Question: if the independently proven lossless native Scene profile can admit
the supplied larger Meshes, which frontend bounds and identities must match?

## Evidence reused and limits

Direct local source inspection follows the accepted paired Nov7
[UI gate](ANIMATION-LARGE-MESH-UI-GATE-2026-11-07.md) and
[native capacity gate](ANIMATION-LARGE-MESH-CAPACITY-NATIVE-GATE-2026-11-07.md).
Their existing512-row acceptance, source integrity guards and previous small
topology hashes stay valid. Original4.3.26 controls/layout observations are
unchanged; no original launch or new original gesture is needed for a bounded
FBones capacity policy.512 itself was an FBones budget, not an original limit.

The supplied actual binary currently opens inspection-only in the native
Session. DATA reports individual Mesh sizes654–893 and4412 total vertices;
its proposed bounded candidate is1024 Mesh rows/6144 triangle indices and8192
aggregate geometry (coordinator additionally selects8192 edge indices). These counts are DATA findings, not UI proof of lossless
admission. No frontend guard may be raised until DATA independently establishes
complete native decode and exact reserialization for the unchanged actual
source, with every unrelated record and all bytes preserved.

## Direct frontend findings before changes

| Surface | Observed source behavior |
| --- | --- |
| `src/domain/meshEdit.ts::retriangulate` | One explicit Mesh inventory guard rejects `n>512`. This must match an accepted new bound. Duplicate/finite/edge/hull checks remain unchanged. |
| `improve` edge identity | Uses `min(u,v)*points.length+max(u,v)`, already corrected in Nov7. At1024 vertices the largest ID is below2^20, injective and exactly represented. Do not revive the old256 radix. |
| Renderer | `src/viewport/ImageLayer.ts` constructs and updates `MeshGeometry` using `Uint32Array` triangle indices and Float32 UV/position arrays. No512 truncation or 8-bit index mask was found. This source observation is not a measured GPU performance claim. |
| Overlay and selection | Mesh/weight handles iterate actual `vertices`/`points`; `nearestVertex` uses full arrays. `createViewport.ts` and `weightSelection.ts` validate indices against the actual row count and use Sets. No512 slice was found. |
| Binding/UV preview | Dynamic dense rows preserve weight arrays and affine coordinates. `previewMeshEdit` can retessellate existing topology and fall back to `retriangulate`; both must support the same admitted Mesh count. It returns the last valid source mesh on invalid drafts. |
| Controls | Existing MeshTools and Weights controls enumerate actual rows/counts. No panel relocation or new misleading limit notice is needed solely because capacity grows. |
| Clip/Trace/legacy | The separate256 Clip polygon/Trace/legacy request limits remain independent. Do not expand them as a side effect of a Scene Mesh bound change. |

The existing `Math.min/max(...points)` reductions receive at most1024 rows in
the proposed profile, rather than an unbounded project list. Topology quality
work still scales with geometry and is not automatically frame-budget safe.
The Nov7 timing observations stop at512 and must not be promoted to1024 timing
claims; coordinator/native tests must measure the new shape where relevant.

## Conditional implementation and verification

After DATA proves unchanged-source exact decode/reserialization and the
coordinator accepts the bounded profile, the frontend change can be one explicit
`retriangulate` guard512→1024, retaining all semantic/topology checks. Tests must
retain frozen256 topology hashes and512 regressions, exercise boundary1024 and
high indices above511, cover both a1024-row deformation target batch and a
UV-following weighted preview, and reject1025 with no source mutation. Synthetic
fixtures must be our own; never commit the supplied raw project/geometry/assets.

Full native/UI integration still needs actual source display, all referenced
PNG resources, source bits preserved, normal revisions/history and unaffected
Animate/Physics regression evidence. A successful screenshot is visual context,
not proof of lossless file roundtrip or responsiveness of every editing gesture.
No product capacity line was changed by this audit.

Implementation authorization after this gate: DATA independently reports complete
715855-byte typed payload decoding/reserialization equality, with all14 animations
and no unknown schema retained for the unchanged supplied binary. The coordinator
accepts the bounded profile and authorizes the frontend guard1024 plus synthetic
boundary/high-index regressions. This reuses the native proof; it does not claim
that this UI agent independently decoded the source. Only the Scene Mesh preview
guard changes; Clip/Trace/legacy controls and bounds stay unchanged.

Focused frontend evidence after the authorized guard change:
`node tests/mesh-edit.test.mjs` passes9 tests. Own convex/jittered surfaces at
513/654/893/1024 cover every index with complete positive-area faces;1025 rejects
without modifying source. The weighted1024 case picks/hits indices512/892/1023,
filters foreign1024 selection, edits the last UV-following row and moves all1024
deformation rows while preserving weights, unrelated rows, original UV/topology
policy and source. Frozen256 topology hashes and prior512 tests still pass.
The selected surface batch takes about1.25s and weighted1024 test42ms on this
run; these are test-case wall times, not a worst-case frame budget or measured
GPU overlay responsiveness. Actual native source display/captures and broader
integration remain coordinator-owned evidence.
