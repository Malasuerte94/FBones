# Lossless real-project import and zero-size image metadata — UI gate

Recorded before dependent codec/native changes on2026-11-06. This worker read
current STATE/F105, the paired real-project audits, the accepted animation and
F222 image-path/size findings, and relevant source. The supplied full Animate
and Dopesheet screenshots in `animare/` were viewed again. No personal/original
window or process was operated; no original export was collected.

## Exact reference evidence and unknowns

`ATTACHMENT-PATH-SIZE-UI.md` and `ATTACHMENT-PATH-SIZE-DATA.md` retain a measured
exact4.3.26 current-pose PNG export: a stored96×96 Region referencing a160×48 PNG
renders96×96. Its runtime JSON reports160×48. Those are distinct outputs;
natural image size is not evidence for replacing authored viewport dimensions.
The earlier prospective natural-size correction in those notes was explicitly
superseded by the subsequent actual render.

Correction before implementation: the copied real project contains **Mesh46
image metadata with stored width/height0**, not a Region43 attachment. The initial
DATA/UI wording inferred Region from the shared `image()` accessor and was wrong.
The Mesh retains separately authored vertices, UVs and topology; zero image
metadata does not imply collapsed Mesh geometry. DATA now validates that geometry.
The Region-only helper probe below is a separate hypothetical safety check, not a
measurement of this copied Mesh.

**Original4.3.26 behavior of zero image metadata during rendering, selection,
resize and save remains unknown.** The supplied screenshots show no identifiable zero-size attachment.
Do not infer that zero means automatic/natural PNG dimensions, hidden, empty,
deleted or any other original-editor semantic. The positive-size oracle cannot
settle this zero-size case. No original parity claim is supported here.

## Mesh46 paths — current source findings before implementation

`ImageLayer.ts::draw` branches on `slot.mesh` before Region fitting. Mesh screen
positions come from `meshPoints(bones, slot.mesh)`, UVs/indices come from the
stored Mesh and the texture comes from the decoded PNG. Stored image width/height
are not used in that branch. `sceneSelection.ts::attachmentGeometry` and
`imagePolygon` return Mesh world vertices first; `images.ts::imageAt` delegates to
Mesh triangle hit testing. `AnimationPreview.vue::fit` also uses Mesh world
vertices rather than image metadata. Thus source Mesh0 metadata can coexist with
noncollapsed rendered/selected/fit geometry; no PNG-sized fallback is needed.
These are direct source facts, not current GPU/browser proof.

A separate own Mesh helper probe supplied0×0 image metadata with authored corners
(-16,-12),(-16,12),(16,12),(16,-12), ordinary UVs and two triangles. Both selection
and image polygons retained those exact noncollapsed corners, and image picking
at(10,8) returned the Mesh's slot. Metadata remained0×0. This directly checks the
Mesh path; it supersedes any attempt to apply the Region-only collapse probe to
this source family.

`AttachmentInspector.vue` still displays stored image metadata0×0 and separate
resource availability, while Mesh editing uses its actual binding. Preserve
that distinction; a status can explain metadata without calling the Mesh empty
or hiding its vertices. Main and Preview already share ImageLayer.

`MeshTools.vue` exposes Reset to quad while `scene_bridge.rs` handles ResetMesh
by reconstructing geometry from stored image metadata. With0 metadata this
would replace good authored vertices with a collapsed quad. Reject ResetMesh
atomically in native code, and disable only that specific UI action with a useful
explanation. Do not disable normal vertex deformation or animation merely
because image metadata is0. Existing topology operations requiring a positive
metric may reject atomically (`triangulation.rs::triangulate_with_metric`);
those guards must remain. No edit may silently create metadata dimensions from
PNG size.

## Separate Region43 zero-size safety paths

| Path | Direct source finding | Consequence for a zero-size source |
| --- | --- | --- |
| `scene_bridge.rs::region_view` | Copies stored width/height without PNG-size substitution. | Summary must keep exact authored dimensions; a separate render-only status must not rewrite them. |
| `viewport/ImageLayer.ts::draw` | Region sprite matrix uses stored width/texture width and stored height/texture height; loaded textures come from decoded PNGs. No division by stored Region dimensions occurs. Missing-resource outlines use stored corners. | Positive texture dimensions and finite transforms yield zero sprite scale, not Region-size division by zero. Zero corners collapse; no texture-sized fallback exists. This source reasoning is not a current GPU test. |
| `domain/sceneSelection.ts::imagePolygon` and `domain/images.ts::imageAt` | Corners multiply stored half-sizes. Picking inverts the affine transform, then compares against half-sizes. | Degenerate corners remain finite. Existing picking can match the exact center (or a line when one dimension is zero), so it is not a deliberate screen-size placeholder policy. |
| `AnimationPreview.vue::fit` | Fits stored corners or Mesh vertices and divides by `Math.max(1, extent)`. | Collapsed corners do not cause an extent division by zero; a distant degenerate attachment can still affect fit bounds through its position. |
| `AttachmentInspector.vue` | Displays raw dimensions; resource availability is a distinct missing-image warning. Region transforms and Convert Mesh are currently exposed based on general editability. | Raw0×0 must stay visible; distinguish zero dimensions from missing PNG. Geometry-dependent actions need a supported explicit policy before exposing them. |
| `sceneSelection.ts::previewAttachmentTransform` / `mesh.rs::from_region` | Constructs a four-corner Mesh from stored Region geometry for transformation/conversion. | Zero sizes produce degenerate geometry; this cannot be silently replaced with a natural-PNG quad. Native validation/conversion/trace paths require review and atomic rejection where unsupported. |
| `mesh_edit.rs` / `trace.rs` | Mapping inverses reject collapsed planes; trace works from validated positive PNG dimensions, then maps to authored geometry. | Valid PNG bytes do not make a zero-size authored plane valid. No relaxation may bypass finite/mapping/triangulation guards. |

A read-only Node probe imported the real `imagePolygon`,
`selectedAttachmentGeometry`, `imageAt` and `previewAttachmentTransform` helpers
with an own identity bone and0×0 Region centered(10,20). All four geometry points
were finite and exactly(10,20); center picking returned its slot, picking(11,20)
returned none. A transient translation(5,7) produced four Mesh vertices at
(15,27), with the original slots byte-for-byte unchanged in JSON. This proves
the current domain-helper behavior only: no native edit/save, GPU pixels or
original-editor observation follows. The PixiJS router/math skill was read for
matrix/bounds review; the pinned installed8.8.1 source remains authoritative for
its implementation, not an original Spine oracle.

## Source-preserving FBones policy gate

Lossless typed retention and editable/render-compatible support are separate.
Until all required grammar/provenance/equality boundaries are satisfied, keep
the whole source inspection-only. Do not drop a zero-size attachment to expose
the other tracks, patch its stored dimensions from PNG metadata, or change
source image paths. Negative/nonfinite dimensions remain invalid; the measured
presence of zero does not justify broader acceptance.

For the actual imported Mesh46 case, retain exact image-metadata bits through
source-only `SceneWire.zero_size_meshes` markers validated/remapped with semantic
native IDs. Do not add those markers automatically during native/new-file image
authoring. Preserve authored vertices/UVs/topology, existing rendering and normal
animation/deformation, with the ResetMesh guard above. A source metadata marker
is not a user-visible row, geometry object or natural-size override.

If a separate future change supports retained zero-size Region43 as an explicit
FBones policy, preserve exact stored bits and reference identity through Save,
Undo/Redo, unrelated key edits and reopening. A safe initial display retains
collapsed geometry with an honest inspector status and Tree access. Any optional
selection marker is a screen-only affordance, not new world geometry, sprite
bounds or persisted size. Do not enlarge the actual image or pick rectangle from
PNG dimensions. New image placement still uses validated positive dimensions.

Unrelated supported animation/bone operations may remain available only after
native transactions prove the retained source survives unchanged. For Region43,
conversion/tracing/transforms that depend on its collapsed plane must reject;
for Mesh46, assess its actual authored geometry independently of image metadata.
Remeshing operations that require positive metadata metrics retain their current
atomic rejection. Do not conflate these two attachment families. Width/height repair is an explicit authoring operation
with its own history/persistence evidence, never import cleanup.

## Owner/track ordering is serialization provenance

The accepted slot DATA note defines the old bounded canonical writing policy:
matching bone groups, slot-only first-seen owners and stable slot-track
permutation with parallel key IDs. Alternate original interleaving was previously
rejected by complete equality, not proven semantically invalid.

The current Timeline already projects UI rows independently: bone hierarchy and
the fixed Rotate/Translate/Scale/Shear row order, slot attachment/color rows,
deform/constraint rows and Event/global rows. Original wire owner/track order is
not a request to reshuffle this UI, slot draw order, attachment inventory, key
times or constraint evaluation order. Preserve those distinct concepts. New
provenance must survive stable native identity remapping/deletion/Undo without
moving key identities onto another row. Existing imports should reach the same
UI and persistence path; no separate flattened-project or import wizard is
justified. Sources: `AnimationTimeline.vue::rows`,
`useAnimationWorkspace.ts::animationTracks`,
`ANIMATION-SLOT-DATA-4.3.26.md` ordering checkpoint.

## Required verification before wider claims

For the actual feature, use own controlled Mesh variants with0×0,0×positive and
positive×0 image metadata but noncollapsed authored geometry, present/missing
PNGs, inactive alternatives and mixed positive-metadata siblings. Check that
rendering/selection/Preview continue to use vertices/UVs, ResetMesh is disabled
and native rejection is atomic, unrelated bone/animation/deform edits preserve
metadata markers and bits, and new placement still cannot author0 metadata.
Separate hypothetical Region0 cases must not be counted as Mesh0 validation.
Check exact dimensions/paths/reference bits, finite CPU/GPU transforms, honest
Tree/inspector state, hit/selection and Preview fit, blocked unsupported geometry
actions without history, and unrelated key edit/Undo/Save/reopen without source
normalization. Test owner/track order across key insertion/deletion and history
with IDs attached to the same semantic rows, not merely matching array lengths.

Complete canonical equality remains mandatory. Current synthetic helper tests
cannot establish browser/WebView/GPU behavior or original-editor acceptance.
The sandbox failures recorded in STATE still limit native/UI observations; keep
them explicit. A controlled original zero-size render/save observation is needed
before claiming original semantics, and a fresh independently encoded supported
file must pass the original before a compatibility claim.

## Working Reset-only UI guard and executable evidence

After this correction and the paired DATA gate, Mesh Tools disables Reset to
quad only when its actual selected Mesh image metadata has a zero axis. A compact
localized status/title explains the requirement; normal Mesh/deformation controls
are retained. The handler captures document/slot/attachment context and checks
current editability, dimensions and selection again before sending its command.
Root owns the matching authoritative native guard and source-marker remapping.

`node tests/mesh-zero-image-controls.test.mjs` passes3/3 with no skips/failures.
It compiles the actual Vue SFC and uses the production workspace/geometry helpers
with a custom host:0×0/0×positive/positive×0 retain noncollapsed geometry and
picking while Reset submits no command; Animate vertex input still routes a
UV-preserving move intent and its manual key button addresses the selected
attachment; positive Reset submits one command, while stale/read-only/busy
handlers submit none. Source data stays unchanged in these routing checks.
The command/key sinks are collectors: this is executable Vue/helper evidence,
**not native deformation/history/persistence, browser pixels or original proof**.

## Save As metadata normalization — pre-implementation UI gate

Current source review: `project.rs::prepare_save` clones the document and, when
copying to another folder, rewrites resource roots to portable images/audio paths
before encoding. The later save commit rebases roots across native history and
marks the saved checkpoint. `workspace.ts::save` waits for pending field edits,
rejects invalid drafts, routes the existing Save/Save As command and only accepts
the native returned summary. `App.vue` already shares these commands with the
existing File controls/shortcuts and native dialogs. These are source facts;
they do not prove a new current OS-dialog run.

Source-wire string aliases add an internal persistence requirement: changing one
root text can split a previously aliased string. Prepare the normalized saved
clone, its valid provenance and the complete Undo/Redo metadata rebase plan
**before encoding or writing**. A successful disk write must not be followed by
a new fallible normalization/rebase step that reports Save failure after the
file has already changed. Do not mutate the live history or clear dirty state
while merely preparing this candidate. Existing document/revision snapshot
guards, portable resource validation, atomic project writing and cancellation/
failure behavior remain authoritative.

This fix needs no new controls, dialogs, import flow or user approval step. Save
As remains the existing operation with portable resource paths. On success the
returned summary, saved binary and history checkpoint must agree; subsequent
Undo/Redo must retain the rebased roots and valid source provenance while keys,
IDs, Mesh metadata/geometry and unrelated authoring remain intact. Cancellation,
stale revision, invalid source metadata and preparation/write failures must
preserve the active document's dirty/history state and original source. Use
controlled native Save As/Undo/Redo/reopen tests to establish those invariants;
compiled Vue command routing alone is insufficient. This is an internal FBones
persistence correction, with no new original-Spine parity claim.
