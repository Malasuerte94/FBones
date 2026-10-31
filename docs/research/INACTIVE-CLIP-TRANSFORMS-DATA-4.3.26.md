# Inactive attachment and whole-clipping transforms: data audit

Recorded 2026-10-29, before the dependent implementation. Companion interaction
audit: [UI findings](INACTIVE-CLIP-TRANSFORMS-UI-4.3.26.md). No new original
collection was run: accepted evidence is reused, and no user window was touched.

## Exact 4.3.26 evidence reused

- **Proven representation:** `analysis/slot-attachments-check.json` and
  `analysis/scene-codec-check.json` distinguish skeleton attachment inventory,
  attachment owner slot, and the slot's nullable active reference. The accepted
  A/B/none cases retain both attachments while changing only the active
  reference. Region, mesh and clipping are real typed inventory variants.
- **Proven selection/activation separation:** the controlled original captures
  recorded in `FEATURE-UI-4.3.26.md` show inactive B selected while A remains
  rendered and the file stays clean. Clicking B's paperclip activates B;
  clicking again selects none without deleting B. These observations do not
  establish original inactive whole-transform gestures.
- **Proven clipping representation:** the `clip-weighted` accepted original
  export and `FEATURE-DATA-4.3.26.md` establish Clipping84 → Binding53 →
  Vertex54, with dense weights and per-influence local positions. End slot,
  color, Convex and Inverse are separate fields. No image resource or intrinsic
  Region transform is needed to represent clipping. Full canonical
  reserialization equality remains the editability guard.
- **Proven static masking, separate from this work:**
  `analysis/clipping-pixels-check.json` records nine original exports and
  9,308,468 checked interior pixels without mismatch. Inclusive end, self=end
  meaning the remaining order, and Convex-or-Inverse using the geometric hull
  are established. This does not prove weighted deformation or transform/pivot
  interactions. Do not rerun that batch to fill these different gaps.

These conclusions come from the existing own originals and independent
checkers, not from FBones' source. Their source commands and collection paths
remain in the cited paired feature notes and aggregate reports.

## Official documentation, patch unpinned

Consulted 2026-10-29 using the primary guide pages; these statements are
documentary evidence, not an exact-patch GUI experiment.

- [Clipping transform tools](https://en.esotericsoftware.com/spine-clipping#Transform-tools):
  whole clips support Translate/Rotate/Scale outside vertex Edit. Rotate/Scale
  origins are movable and snap to vertices; animation deformation stores
  vertex positions rather than a transform amount.
- [Clipping Freeze](https://en.esotericsoftware.com/spine-clipping#Freeze):
  rotation/scale are manipulation conveniences; clipping's actual geometry is
  vertices. Displayed translation uses their centroid.
- [Attachment visibility](https://en.esotericsoftware.com/spine-attachments#Hiding-attachments):
  each slot displays at most one attachment or none. Selection and activation
  must remain separate in the editor model.

Audit commands: `rg -n 'TransformAttachments|transform_attachments|inactive|pivot'
src-tauri/src/scene_bridge.rs src-tauri/src/scene_native_tests.rs
docs/NATIVE-SCENE-BRIDGE.md`, and primary-page reads of `spine-clipping`,
`spine-attachments`, `spine-tools`. No older version was used.

## Existing native contract: FBones behavior

`scene_bridge.rs::transform_attachments` already resolves every stable ID
through full inventory, including inactive alternatives in the same slot.
`transformAttachments {ids,mode,pivotX,pivotY,dx,dy,rotation,scaleX,scaleY}`
accepts 1–512 distinct IDs and finite bounded channels. It applies one common
world Translate/Rotate/Scale around the supplied pivot. Singular scale fails;
reflected nonsingular scale is valid. Unused mode channels do not act.

Mesh and clip geometry moves through existing dense binding arithmetic.
For each requested world vertex displacement, positive influences receive the
inverse-linear displacement divided by total weight. Existing relative
binding offsets, weights and influence membership are retained; this is not
a rebind. Region transforms retain the image representation when its resulting
owner-local basis is orthogonal; otherwise FBones produces a real quad mesh
to retain exact corners. That conversion is an explicit product choice, not a
recovered original algorithm.

The staged canonical transaction preserves activation, inventory order, IDs,
slot ownership, clipping endpoint/color/flags and unrelated geometry. It makes
one undo entry and validates the complete result before committing. Constrained
geometry requires the frozen evaluated `poseEpoch`; stale or invalid requests
are atomic. Native focus returns one attachment, so persisted multiselection
or a multiselection Undo restoration must not be inferred from that field.

Existing regression `mixed_attachment_group_rotation_is_atomic_preserves_inventory_and_one_undo`
already covers active/inactive regions, a weighted image mesh and an unweighted
clip under affine bones. It does not cover a weighted clip in that group or all
three modes. New targeted tests should address those omissions, not duplicate
the accepted original corpus.

## Frontend boundary and implementation gate

The current `createViewport.ts::imageGizmoState` gathers points from rendered
slot attachments. Inactive-only selection therefore lacks geometry; mixed
selection's pivot omits inactive members. `ImageLayer.ts` draws one inspected
inactive ghost. Whole clipping UI currently translates from polygon interior
but does not expose whole Rotate/Scale or a movable pivot.

Resolve selected IDs once against complete attachment inventory. Supply each
selected Region's world corners, Mesh's world vertices, or Clip's actual
binding polygon to the same group geometry contract. Keep all selected inactive
outlines available without changing active references or fabricating an image
for clips. Preview every selected item from the same frozen evaluated pose,
then send one native transaction at gesture completion. Escape cancels without
native history. Do not derive solved world targets with an authored-only
inverse, and do not transfer the scene per pointer frame.

**Explicit FBones policy pending exact observation:** use the existing common
world group transform and a transient vertex-average initial pivot. Moving the
pivot changes only interaction state, not geometry, dirty status, history or
the binary. Define its reset rules for selection/tool/document changes; never
invent persistent clip rotation/scale/pivot fields. A convenience numeric
Freeze display is a separate scope, not implied by working transforms.

**Still unknown in exact 4.3.26:** inactive whole-transform gesture semantics,
multiple simultaneous inactive ghosts, group centroid choice, pivot lifetime
and persistence across selection/Undo, and the original weighted binding-offset
update algorithm. The documentary transform behavior and existing FBones
arithmetic support implementation, but do not justify claiming complete parity.

After implementation, verify actual Windows inactive/mixed/clip controls,
one-step Undo/cancel, and save/close/reopen. Export that newly authored own file
through original 4.3.26 and independently compare geometry, dense bindings,
activation and clipping metadata. That new comparison must be recorded
separately from the already accepted static masks and 0.8.0 checkpoint.

## New FBones validation after implementation

`cargo test -p fbones-desktop inactive_weighted_clip -- --nocapture` passed
both new native tests on 0.8.1: all three modes around a moved pivot, inactive
weighted clip with noncoincident binding offsets, active/inactive regions,
metadata/weight-bit/unselected invariants, canonical equality, Undo/Redo,
evaluated Physics pose and atomic invalid/stale-epoch failures. These prove
FBones' contract; they are not new original-editor numeric observations.

Editor image `313e0ed21e704b1d69daf31dea4c2fec470ca20d9de282fe20172de454e5d79e`
passed five actual Windows groups, plus one separate-process annex group.
Main proof is frozen in `.local/inactive-clip-081-main-snapshot`; annex and final
source are in `.local/inactive-clip-081-acceptance-snapshot`. The reports retain
their distinct process IDs. Real guarded Windows mouse input demonstrated
moving the origin, exact vertex snapping and whole-clip rotation. Native
commands and independent world-matrix checks retain the actual subdegree
rotation caused by integer OS pointer rounding, rather than asserting an
unobserved exact 90°. Other pointer checks cover inactive/mixed previews,
cancel, Translate, separate X/Y Scale, and one-step Undo/Redo. Native Save as,
Close and Open retain the transformed Region/Mesh/Clip inventory and PNGs.
The Windows clip is unweighted; weighted coverage here remains native-test
coverage. The new final source SHA256 is
`7cc247ab83931d6a698ce9f1e24f661330bc48533d29a521228e77461e56cd4b`.
The fresh original 4.3.26 export exited0/Complete. Independent
`analysis/inactive-clip-transform-check.json` passes all represented geometry,
activation, dense binding, clipping metadata and five PNG resources. It also
checks the actual recorded matrices for five main commits plus the separate
annex ScaleY commit and verifies that the transformed clip survives into the
final source. This does not establish original whole-transform gesture parity
or original pivot lifetime.
