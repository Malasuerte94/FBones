# Inactive attachments and whole clipping transforms: UI audit

Recorded2026-10-29 before dependent production edits. Paired data audit:
INACTIVE-CLIP-TRANSFORMS-DATA-4.3.26.md. This audit reuses accepted observations;
it does not repeat a completed original collection or manipulate any original
or user window. User-owned Windows PID67032 and stale handles are off limits.

## Directly proven in the existing owned4.3.26 observations

Reopened at original resolution with `view_image`:

- `.local/research/feature-ui/multi/slot-row-b-selected.png`: inactive region B
  has a selected Tree row and B's inspector while A remains the active red
  image. The recorded transition in FEATURE-UI-4.3.26.md establishes that row
  selection did not dirty the project. Changing the paperclip, separately,
  activated B or selected active-none. Selecting B is not permission to
  activate B for editing.
- `.local/research/feature-ui/clip-inspector-convex-on.png`: the clipping
  inspector has an explicit Edit Clipping action, along with End slot,
  Convex/Inverse, Color, Parent, Reset and Freeze. Its compact gray control
  grouping is reusable appearance evidence. The capture shows a selected
  clipping outline/handles, but does not record a whole-clip gesture, the
  identity of every visible gizmo, a pivot drag or a pivot's later lifetime.

These are reused exact-version evidence from the controlled owned instance
identified in FEATURE-UI-4.3.26.md, not a newly verified running process.
The screenshots remain private; they are not distributable reference artwork.

## Official documentation fallback, patch unpinned

Consulted2026-10-29 after inspecting local evidence:

- [Clipping: Transform tools](https://en.esotericsoftware.com/spine-clipping#Transform-tools)
  permits whole-attachment translation, rotation and scaling outside vertex
  edit mode. For Rotate/Scale, hover the central crosshair until its circle
  appears, then drag that origin; it snaps to vertices. No modifier or separate
  button is specified for moving the origin.
- [Clipping: Edit Clipping](https://en.esotericsoftware.com/spine-clipping#Edit-Clipping)
  separates the vertex editor from ordinary transforms.
- [Clipping: Freeze](https://en.esotericsoftware.com/spine-clipping#Freeze)
  explains that clipping stores vertex positions, with convenience rotation/
  scale displays; the translation display represents their centroid.
- [Tools: Selection](https://en.esotericsoftware.com/spine-tools#Selection)
  documents Ctrl/Cmd additive selection and empty-space box selection.
- [Images](https://en.esotericsoftware.com/spine-images#Creating-region-attachments)
  documents using Translate/Rotate/Scale to position region attachments.

The guide does not identify4.3.26. These are documentary controls and behavior,
not exact-patch pointer experiments or proof of multi-inactive ghost rendering.

## Concrete FBones source observations, before edits

Inspected using `rg` and bounded `sed` reads of:

- `src/App.vue`: `imageTransforms` requires Images mode. `useTool` retains
  attachment transforms only when already in Images; V/C/X from Clipping
  vertex mode therefore falls into Bones. Its clipping toolbar supplies only
  Move/Add/Delete and Done; Done already enters Images. The whole-image
  toolbar restricts operations to Translate/Rotate/Scale and correctly labels
  its currently implemented common world pivot rather than bone pivots.
- `src/viewport/createViewport.ts::imageGizmoState`: collects only rendered
  active-image polygons from `scene.slots`, excluding inactive selection,
  clipping and the current preview inventory. A valid native transform thus
  can lack handles or display a stale pivot. The clipping branch only offers
  vertex editing or body translation, independently of the selected tool.
- `src/viewport/ImageLayer.ts::draw`: inactive outline rendering uses only
  `selection.inspected`, not all selected IDs. That supplied object is the
  original inspected DTO even during a `previewSlots` transform. This can
  leave a ghost at its old position while its inventory preview is correct.
  Ordinary textured rendering and clipping masks correctly use active items;
  expanding selection outlines must not expand the rendered active inventory.
- `src/domain/sceneSelection.ts`: preview transforms already address stable
  attachment IDs and preserve inventory/active separation. Native
  `transformAttachments` is the existing one-transaction command; no new
  image, fake mesh or persisted clip rotation is required for this UI gap.

These are observations about FBones implementation, not inferred original code.

## Bounded interaction contract for implementation

1. Keep native selection IDs distinct from active pointers. Resolve each
   selected attachment's own inventory geometry, including inactive Region,
   Mesh and Clipping, through its real owner/evaluated bone matrices. Derive
   handles and ghost previews from the same current preview geometry. Do not
   activate an alternative or apply a clipping mask just to show its outline.
2. Whole-attachment Translate/Rotate/Scale operates in Images mode. Choosing
   V/C/X while editing a selected clip leaves vertex edit mode for Images and
   keeps the same selected attachment IDs. Explicit Edit Clipping returns to
   vertex controls. Neither operation selects a bone or changes the project.
3. Reuse the existing constant-screen-size rotate ring and independent X/Y
   scale handles. For Rotate/Scale, make the center crosshair visibly targetable;
   hover displays a circle, and dragging it changes the origin, not geometry.
   Vertex snapping follows documentary guidance; snap the selected real vertex
   positions rather than inventing points on a convex display hull.
4. Pivot movement is transient session interaction. It must not dirty the
   project, call a native geometry edit, create history or alter bindings.
   A subsequent geometry drag freezes its pivot/members/evaluated epoch and
   produces at most one completed native transaction. Escape cancels pending
   movement without committing geometry; project/selection replacement must
   not reuse a stale pivot. Precise reset and revision rules are the
   coordinator's explicit FBones policy, not established original behavior.
5. Preserve all weights/local binding offsets except the actual commanded
   geometry delta, as well as slot owner, active references, resource path,
   end slot, flags, color and draw order. Original export and actual dedicated
   Windows pointer checks remain separate acceptance gates.

## Unknowns and explicit own choices

No recorded exact4.3.26 action proves whole-transforming an inactive attachment,
multiple inactive outlines simultaneously, outline opacity, ghost-versus-active
hit priority, automatic group centroid selection, pivot reset after transforms/
selection/Undo, or snapped-pivot persistence. The requested ability to transform
selected inactive inventory remains an explicit FBones requirement; implementing
it does not establish that original4.3.26 exposes the identical workflow.

A common world-space group pivot and vertex-average initial center are existing
FBones choices; do not relabel them exact Spine behavior or silently call a
polygon's area centroid the same operation. Scale axes remain the existing
world image-group policy unless separately changed/researched. No numeric
Freeze or original convenience-transform counter is delivered by adding a
movable origin.

## Proposed isolated ownership and verification

UI worker: App.vue, necessary i18n text and a small pure toolbar policy helper
if useful for testing V/C/X transitions. Coordinator/viewport worker:
createViewport.ts, ImageLayer.ts, geometry selection resolution, pivot state and
its lifecycle. Native/data worker: geometry validation and preservation tests.
No production file was changed by this audit.

Focused checks should include inactive-only and active+inactive selections,
clip-only and mixed image/clip groups; C/X/V preserving selected IDs; ghost
preview at transformed coordinates; central-origin drag with vertex snapping;
Escape and stale-document/revision protection; one Undo per geometry drag,
none for pivot adjustment; save/reopen and a new own original comparison.
Actual Windows OS pointer tests must use a new dedicated owned instance,
never the user window or synthetic DOM drags as a substitute.

## Paired-gate implementation handoff

After the coordinator accepted both UI and data audits, the isolated UI slice
changed App.vue to use `domain/toolMode.ts` for both mouse and keyboard entry.
The clipping vertex toolbar now has explicit whole-attachment Translate,
Rotate and Scale actions. The existing inspector Edit Clipping action remains
the route back to vertices. The common-pivot hint now describes a shared world
pivot and the documented central-crosshair gesture, rather than claiming a
permanently fixed center. No active attachment is changed by this routing.

`node tests/tool-mode.test.mjs`:2 pass, exercising the actual imported policy
with the real workspace mode transition for inactive-only/mixed selection,
stable ID zero, unchanged project data/active pointer and no native calls.
`node tests/scene-workspace.test.mjs`:6 pass. The actual App SFC script and
template compile. An integrated typecheck during concurrent viewport edits
reported unfinished cross-file viewport contracts; the coordinator owns the
final integrated typecheck/build. No new actual Windows interaction, original
whole-transform observation or persistence comparison is asserted here.

## Actual0.8.1 follow-up acceptance

The completed UI slice plus coordinated viewport changes passed five actual
Windows groups and a separate inactive-mesh annex on the exact0.8.1 immutable
image313e0ed2…54e5d79e. The final saved file was accepted/exported by actual
original4.3.26, exit0/Complete; `analysis/inactive-clip-transform-check.json`
independently checks every represented value and the six recorded unique
world-transform commands. See FORMAT-SCENE-4.3.26.md for exact hashes and the
explicit5+1 process provenance. These are FBones interaction and canonical
persistence checks; the original documentary pivot gesture remains
patch-unpinned. New exact-original whole-transform interaction, weighted-clip
UI and deformed-mask GPU parity are not inferred from this acceptance.
