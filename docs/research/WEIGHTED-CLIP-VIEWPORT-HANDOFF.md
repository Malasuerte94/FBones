# F305 weighted clipping: viewport and shared binding handoff

2026-10-29, read-only preparation before paired reference gates. No production
source changed for this document. Current0.8.1 whole-clip transforms/inactive
selection are accepted; this work extends weight authoring, rather than
reimplementing that checkpoint. Full F302 selected-scope Auto and F307 physics
phase remain separate active requirements.

## Evidence boundary

Reuse exact4.3.26 weighted clipping codec exports and the paired findings in
FEATURE-DATA/UI, INACTIVE-CLIP-TRANSFORMS-DATA/UI and
WEIGHTED-CLIPPING-NEXT-STEPS. They prove actual dense binding structure,
ownership/activation separation and accepted vertex editing/whole transforms.
They do not establish a newly exercised original clipping Bind/paint action.
The current paired data/UI agents are collecting that narrow evidence now;
wait for both reports and coordinator confirmation before dependent code.

The official [Weights guide](https://en.esotericsoftware.com/spine-weights)
applies weights to clipping as well as image meshes, and distinguishes
binding, numeric/direct adjustment, brushes and Auto. This is documentary,
patch-unpinned evidence. Proprietary Auto constants and newly-positive dormant
binding initialization remain unknown. The adopted boundary graph below is
an explicit FBones algorithm choice, not exact recovered algorithm parity.

## Agreed command and DTO contract

The coordinator and native worker agreed these Scene-only edits. IDs are
stable attachment IDs, and bone arrays/fields contain stable bone IDs:

```ts
{type:'bindAttachment', id, bones:number[]} // empty -> unbind to owner
{type:'setAttachmentWeight', id, vertex, bone, value}
{type:'paintAttachmentWeights', id, bone, changes:{vertex,value}[]}
{type:'normalizeAttachmentWeights', id}
{type:'autoAttachmentWeights', id}
```

These use the existing revision/document transaction and geometry `poseEpoch`
gate; a stroke is one bounded list of final vertex values, not per-frame IPC.
No slot/attachment ID reinterpretation or implicit activation is permitted.
Existing legacy `bindMesh`/`setWeight`/`paintWeights` commands remain supported
and delegate to the same arithmetic without changing valid image behavior.

Root owns `project.ts`:

```ts
interface DenseBindingView {
  weighted:boolean;
  bones:number[];
  vertices:{weights:number[];positions:number[]}[];
}
interface MeshView extends DenseBindingView { /* existing mesh fields */ }
interface ClippingView extends DenseBindingView { /* existing clip fields */ }
```

Root also owns `workspace.selectedBinding`: the real selected attachment's
Mesh or Clipping binding in Scene mode, with selected-slot mesh fallback only
for legacy mode. Region-only selection returns null. New commands bypass the
legacy mesh-edit wrapper, enter geometry classification, preserve selected
vertex focus where still valid, and never change an active pointer merely to
make weight editing possible. Root/UI coordinate influence choice separately
from membership selection in the Bind panel.

## Proposed frontend helper contract

Create `src/domain/binding.ts`, importing only project types and affine helpers
from `rig.ts`. It must not import image, clipping, mesh topology or Pixi code.
Suggested exports:

```ts
interface Point {x:number;y:number}
bindingPoints(bones, binding:DenseBindingView):Point[]
previewBindingVertices<T extends DenseBindingView>(bones,binding:T,moves):T
previewBindingWeights<T extends DenseBindingView>(bones,binding:T,bone,changes):T
boundaryEdges(vertexCount:number):number[]
bindingNeighbors(vertexCount:number,edges:readonly number[],triangles?:readonly number[]):number[][]
```

Point movement retains each influence's existing relative bind offset by
applying inverse affine *deltas* to positive rows, divided by the row's weight
sum. Weight edits retain positive influences' existing binding positions,
normalize the other weights as the native helper does, clear coordinates of
rows reduced to zero under the current accepted FBones policy, and initialize
newly-positive rows using the captured current world point. Auto's stronger
existing-position preservation policy remains native and separate: do not
silently call Update Bindings during numeric edits or painting.

Keep world points finite; reject malformed dense dimensions, negative or
nonfinite weights, zero/nonfinite sums, duplicate or stale vertex updates,
missing positive influence matrices and singular required inverses. Stage
rows before returning a new object so failures cannot mutate authoritative
inputs. Preserve all unrelated vertices and metadata. A one-bound-bone binding
retains weight1 and cannot be painted into an impossible partial weight.

`meshes.ts` delegates its existing `meshPoints`, `previewVertices` and
`previewWeights` to these helpers, retaining public names/types and valid
results. It retains UVs, triangle tests and mesh-only edit operations.
`clipping.ts::clippingPoints` calls `bindingPoints` directly.
`sceneSelection.ts` removes its duplicate dense clip arithmetic and calls
the shared point/delta helpers. Remove transient empty-UV/triangle adapters
from clip vertex preview/edge hit code as part of this bounded refactor;
clipping itself remains a real polygon, never a fake image or persistent Mesh.

## Topology: clip boundary is the graph

The native worker agreed Auto receives binding and topology separately.
Image Mesh Auto retains its existing edges plus triangles. Clipping Auto
receives actual perimeter pairs `(i,(i+1)%n)`, with no triangulation, UVs or
diagonals across concave empty regions. This keeps a real connected polygon
boundary and does not silently persist extra edges.

Frontend Smooth brush uses the same clip perimeter adjacency: a vertex's
neighbors are its preceding/following authored vertices, regardless of
Convex/Inverse display flags. It does not connect all vertices in a convex hull
or infer triangles from their storage order. Existing image brush Smooth uses
triangle adjacency today; preserve it through the generic topology helper
rather than altering previously accepted image behavior during this slice.
Deduplicate neighbors, exclude self-links and reject invalid indices.

The active brush influence is not the Auto bone scope. This slice's Auto still
means all vertices/all already bound bones, with explicit existing UI feedback.
Do not expose F302 subset/lock controls before the separate original experiment
settles their remaining-mass/zero-selected-mass contract.

## Viewport stroke lifecycle and target identity

Handle Weights mode before the image-only edit branch. Resolve the inspected
stable attachment ID against the current real inventory using the accepted
`resolveAttachment` helper. Capture target attachment, binding, owner slot,
geometry topology, influence, brush settings and revision into the gesture;
for legacy mode capture the old selected-slot mesh. The binding target cannot
be whichever slot happens to be active at pointerup.

Use real `bindingPoints` for nearest-vertex focus and screen-space brush
coverage. A clip target needs no PNG, image hit or `slot.mesh` projection.
Selected inactive/hidden clip weight editing keeps the same target. Brush
distance/feather/size remain CSS-pixel based at the current zoom, as in the
image workflow. Retain max coverage per vertex for the entire stroke and
derive each preview from the captured original weights; repeated pointer
events must not accumulate strength beyond the intended coverage.

At Scene release emit one `paintAttachmentWeights` with the captured stable
ID/influence and final changes. In legacy mode emit the original `paintWeights`
slot command. Numeric vertex focus continues through `onSelectVertex`; its
singular value is not a new multi-vertex selection/Auto scope. Preserve the
existing image brush's scope rather than accidentally restricting every stroke
to its automatically focused nearest vertex.

For constrained geometry preserve the accepted async `onPrepareGeometry`
path: pause preview, freeze once, capture evaluated matrices and epoch, derive
all points/previews from those matrices, commit that epoch once. Cancel on
document/revision/selection/influence changes, Escape, blur, capture loss or
pointerup while preparation is pending. No stroke can start after its original
pointer was released. Native rejection clears previews back to current
authoritative inventory, retaining old scene/history and physics preview state.

## Inventory preview and overlay

Add a narrow immutable inventory replacement utility: update only the targeted
attachment's mesh or clipping binding vertices while preserving attachment
kind, name, region data, clip flags/color/end/edges, owner and inventory order.
If the edited attachment is the active image Mesh, mirror it into the slot's
legacy rendering projection. An inactive alternative must never overwrite
that projection; an active clip continues to have no image region/mesh.

`ImageLayer` must resolve selected/inspected bindings from `previewSlots`
inventory before external inspected fallback, as accepted in0.8.1. Draw clip
weight vertices in Weights mode for the single inspected target, with the same
influence scalar color/radius convention as image weights. Add its real
boundary edges as context. Convex/Inverse may change the displayed mask hull
but cannot remove authored weight handles or change brush adjacency. An
inactive edited clip retains a ghost/weight overlay while the active clip's
GPU mask and visible scene pixels remain unchanged. A selected active clip's
mask deforms with preview rows, as intended; following attachments outside its
end slot stay unmasked.

Unbound and one-bone clips may show vertices for inspection but cannot start a
multi-influence paint stroke. Never request a clip PNG or allocate a texture
sprite just to draw its weights. Keep actual clipping masks distinct from
selection/weight overlays and preserve the existing color/blend draw order.

## Meaningful checks before delivery

1. Shared helper tests cover coincident and noncoincident affine bindings,
   finite row normalization, unchanged positive coordinates, newly-positive
   fallback, one-bone behavior and singular/malformed atomic failures. Existing
   image/legacy mesh tests must retain their valid numeric results.
2. A concave clip graph test proves boundary-only Smooth neighbors and Auto
   input: a nearby nonadjacent vertex across a notch must not become a neighbor.
   Convex/Inverse flags must not alter this graph. Preserve image triangle
   adjacency explicitly in a regression check.
3. Controller tests exercise an inactive weighted clip with no image projection:
   nearest vertex focus, max-coverage brush preview from original weights,
   all brush modes, zero commits during movement and one captured-ID commit on
   release. Include selection/influence changes, Escape, capture loss and
   deferred-freeze release. Include the old legacy command path.
4. Overlay recorder checks show weight-colored authored clip vertices,
   noncoincident binding preview movement and no texture requests. Prove an
   inactive clip stroke leaves the active mask unchanged; prove an active clip
   stroke updates its intended mask while a trailing attachment remains outside
   scope. Recorder tests do not replace native GPU pixels.
5. Native worker checks bind/unbind/Auto/numeric/paint/normalize revisions,
   pose epochs, bounds, row bits/metadata, exact one Undo/Redo, inactive
   ownership/activation, codec complete reserialization and canonical reopen.
   Align frontend preview to native polygon validity policy rather than adding
   a contradictory second clipping validator.
6. Coordinator runs actual Windows UI authoring from a new own instance: bind
   two bones to a new clip, set numeric weights, paint, pose, freeze/cancel,
   Auto/Normalize/Unbind, Undo/Redo and save/close/reopen. Independently compare
   the resulting file with a fresh original4.3.26 export, and add a **new
   deformed weighted-mask pixel case** with an unmasked trailing marker. Reuse
   accepted static clipping and prior image batches, not rerun them.

## Ownership after the paired gate

- Root: DTO/command types, services/store/integration, final docs, Windows QA,
  immutable delivery and actual end-of-session launch.
- Native/data worker: shared Rust binding/Auto topology and five command paths,
  transaction/codec tests; no product physics changes.
- Viewport worker: new `domain/binding.ts`, delegates in meshes/clipping/
  sceneSelection, createViewport/ImageLayer target/brush/overlay paths and
  related tests. Root will explicitly cede viewport ownership before edits.
- UI/reference worker: WeightsPanel/App interaction/i18n after its audit,
  consuming root's selectedBinding and the five agreed commands.

Do not mark weighted clipping or the full goal complete from helper/controller
tests alone. Preserve all handed-over user windows and current release images.

## Implemented handoff after the paired gate

Root confirmed both WEIGHTED-CLIP-DATA/UI-4.3.26 audits before source edits.
Those newer observations supersede the preliminary zero-row policy described
above: new Scene numeric/paint previews preserve **every** existing binding
coordinate, including positive→zero and dormant zero→positive. Both Scene and
legacy manual previews now keep a sole dominant100% influence when no other
positive influence can receive its weight, matching the new original probe.
Only legacy zero-coordinate initialization/clearing remains an explicit old
path policy. New typed Bind is ordered membership with no implicit Auto.

`domain/binding.ts` now provides genuine dense points, inverse-delta previews,
policy-specific weight previews, polygon boundary edges, explicit adjacency
and scalar overlay colors. Mesh wrappers delegate with legacy position policy;
clipping/selection/clip vertex previews no longer fabricate image/UV/triangle
adapters. `previewAttachmentBinding` updates exact inventory IDs independently
of active projection. The controller captures binding/attachment/influence/
coverage/brush settings and sends one typed Scene stroke or old legacy command.

Direct mode selects a nearest real vertex without editing on click; a vertical
drag commits one `setAttachmentWeight` (`setWeight` in legacy). Its200 CSS
pixels per unit weight, captured Shift×0.1 fine factor and one-vertex profile
are FBones sensitivity/interaction bounds, not exact original numeric parity.
Brush radius does not affect Direct. Other brush modes retain max stroke
coverage; clip Smooth uses perimeter neighbors while image adjacency stays
unchanged. Clip weight overlays use actual authored vertices/influence color;
inactive painting leaves the active mask intact, active painting updates its
actual mask, and a trailing out-of-range attachment remains unmasked.

Observed focused tests pass:6 new dense binding,4 mesh,7 scene selection,3
clipping,3 ImageLayer and35 controller cases, plus TypeScript checking. Full JS
verification is recorded by the coordinator. Own private deformed-mask tools
under `.local/research/weighted-clip-pixels/` passed an ephemeral synthetic
checker self-test (including a corrupted safe pixel rejection); this is **not**
original or GPU acceptance. Actual0.8.2 Windows authoring, fresh original JSON/
one current-pose PNG and independent deformed-mask pixel comparison remain
separate gates at this handoff.

### Replace and Direct review correction, recorded before dependent fix

The paired UI agent re-read the official Weights/Brushes guide and recorded
the result in WEIGHTED-CLIP-UI-4.3.26.md. The coordinator approved correction
in both Scene and legacy paths: Replace's full-coverage target is Strength,
rather than interpolating toward1 using Strength as a rate. Linear feather
interpolation `base + (Strength - base) * coverage` remains an explicit FBones
choice; exact original numeric brush parity is unknown. Strength0 still means
replace by0, subject to the established sole-dominant weight guard. Add/Remove
remain deltas, and Smooth remains the own extension. Direct must suppress
brush radius/feather rings as well as ignoring those values mathematically.

### Actual deformed weighted-mask acceptance

The new own06ee Windows0.8.2 UI fixture and its identical original4.3.26 copy
now pass independent pixel comparison. `analysis/weighted-clipping-pixels-check.json`
pins source SHA b6bd5bd8…24b1284f, original JSON/PNG, native bound/posed snapshots
and editor hash. Root remained at0,0; only tip moved40,0→58,10. All slot,
inventory, active pointers and dense rows remained identical across the pose;
the five-vertex/two-bone concave clip deformed by up to20.59126 world units.
Original-exported and native reconstructed world components agree exactly.

Actual original PNG:1,024,813 safe interior pixels,0 mismatches at exact RGB.
Actual Windows Pixi capture:57,387 safe pixels,0 mismatches within the existing
±4 per RGB channel tolerance. Total1,082,200 compared pixels. GPU alternatives
disagree on2,569 pixels for undeformed bindings,4,084 for convex-hull substitution
and410 if the trailing blue attachment is wrongly masked. The original stage
produced one PNG and both original exports exited0/Complete; its mapped-folder
watcher warning remains explicit in the report and private log.

The checker was corrected for omitted false Convex in runtime JSON, the
half-pixel-aligned board's256×255 exact-color plateau, and editor parent-link
strokes. It derives GPU scale from actual capture/CSS dimensions and zoom,
validates the board's observed extent within one border pixel, and independently
locates its center. Known bone glyphs and parent connectors, plus polygon/region
AA edges, are excluded explicitly. No mask geometry, product code, pixel
tolerance or source fixture was changed to obtain the pass. Synthetic checker
tests include editor connectors and deliberate safe-pixel corruption rejection.

Private reproducible checker and complete actual inputs live under
`.local/research/weighted-clip-pixels/`,
`.local/weighted-clip-082-acceptance-snapshot/` and
`.local/weighted-clip-082-original-comparison/`. This proves that one new
weighted concave setup-mask case and its independent trailing draw interval;
it does not prove animation/physics trajectories or original editor gesture
parity. Coordinator owns final acceptance scope, delivery and user launch.

The final UI draft-hover correction required a new executable. New7dcb
Windows0.8.2 QA produced seven accepted UI groups and a fresh own21308 GPU
capture, with newly captured bound/posed summaries. Load→tip40→tip58,10→native
SaveAs/reopen retained **byte-identical source b6bd5bd8…24b1284f**. Accordingly,
`analysis/weighted-clipping-pixels-final-check.json` reuses the existing
original JSON and single PNG for that exact source, with **zero new original
commands**. It explicitly pins historical06ee and current7dcb editor hashes,
historical pixel report hash, new native snapshots and new actual GPU receipt.
The new comparison again passes1,082,200 safe pixels with0 mismatches. Its
GPU PNG happens to be byte-identical for the same scene; the new actual process/
capture provenance is distinct. The historical pixel report remains immutable.
