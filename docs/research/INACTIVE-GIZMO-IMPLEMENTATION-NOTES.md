# F301 / F305 inactive inventory geometry and clipping gizmos

Read-only implementation preparation, 2026-10-29. Product source is unchanged.
Read AGENTS, STATE, TASKS and WEIGHTED-CLIPPING-NEXT-STEPS before continuing.
The existing 0.8.0 delivery and the user's handed-over window remain protected.

## Evidence status before the implementation gate

Existing exact 4.3.26 captures establish that selecting inactive attachment B
does not activate it, hide active A, or dirty the document. Existing native
tests and actual Windows checks establish active-image group transforms, one
history entry per gesture, frozen geometry epochs and inactive inspection.
They do not establish original multiple-inactive ghost rendering, hit priority
between a ghost and active image, or a group pivot formula.

The paired UI agent's current audit reports the official
[Clipping transform tools](https://en.esotericsoftware.com/spine-clipping#Transform-tools)
as documentary, patch-unpinned evidence: whole-clip transforms outside vertex
edit mode, and moving the Rotate/Scale origin by hovering its crosshair until
a circle appears, then dragging with vertex snapping. Exact original gesture
captures are unavailable. Group center, ghost style and ghost hit precedence
remain explicit FBones interaction choices. The paired data audit is still
pending when this memo is written; no dependent production changes are allowed
until the coordinator confirms both gates.

## Source diagnosis

1. `createViewport.ts::imageGizmoState()` inspects each slot's *rendered*
   attachment ID, then calls `imagePolygon` on its active projection. Selected
   inactive IDs yield no points and therefore no gizmo. A selected clip yields
   no image polygon. Mixed clip/image selection uses only the image's points.
2. `sceneSelection.ts::previewAttachmentTransform()` already maps the complete
   inventory by stable attachment ID, including clipping, and then updates the
   active projection. It preserves `activeAttachmentId`. Its basic scope is
   suitable; replacing it with an active-only slot transform would regress it.
3. `ImageLayer.draw()` receives `previewSlots` but also receives the old
   `scene.inspectedAttachment`. Its single inactive ghost reads that old object,
   so a correctly updated inactive preview inventory still draws a stale ghost.
   Multiple selected inactive items are omitted entirely. Clipping builds an
   active list plus that same single inspected fallback; an inactive clip
   preview has the equivalent stale-object problem.
4. `imagePolygon` uses `worldRegions`; its selected geometry path must not rely
   on slot visibility. Selected hidden geometry needs an inspection outline and
   handles while its normal textured render stays hidden.
5. `selectImages()` derives the focus slot by matching the active ID only.
   When called for an inactive ID, it must resolve actual ownership from the
   inventory. `editingSlot()` substitutes inspected geometry for edits; it too
   must not accidentally substitute a different alternative after a gesture.
6. `App.vue::useTool` only preserves image selection for image-mode transforms;
   clip vertex mode otherwise switches to bones. The root owns UI routing so
   whole-attachment selection can use the shared transaction without replacing
   the dedicated clip vertex-edit workflow.

## Shared geometry and preview proposal

Add domain helpers that resolve `(slots, attachmentId)` to an actual attachment
and its owner slot. Search `slot.attachments` first. Only support the legacy
active projection fallback when the ID equals `renderedAttachmentId(slot)`;
do not invent an inactive inventory record from an unrelated slot ID.

Provide real world points for that resolved attachment: mesh dense rows,
authored clip dense rows, or region corners composed with its actual owner.
Force visibility only on a temporary geometry projection if the existing
region utility needs it; never change the real slot's `visible` flag. Use the
clip's authored points for handles and snapping, even when rendering its convex
hull. Include every unique selected stable ID once. Unknown/missing IDs yield
no geometry and must not silently fall back to another active attachment.

The same resolver must feed pivot construction, preview validation, selected
ghost overlays and the focus owner lookup. During a drag resolve from the
gesture's captured slot inventory/bone matrices, and draw its transformed
inventory from `previewSlots`. Resolve the inspected ID in that inventory
*before* falling back to the external inspected object. This also retains
Trace's externally substituted preview when there is no gesture inventory.

For drawing, enumerate all selected IDs plus the inspected ID, deduplicate,
and resolve each against preview inventory. Active visible objects keep their
ordinary texture rendering and receive a selection overlay once. Inactive or
hidden selected objects receive outlines/edges; do not create ordinary texture
sprites, activate a slot, change clipping scope or request a fake clip image.
Selected clip outlines use an explicit selected style, not only the inspected
ID's thicker line. Preserve vertex-edit handles on the inspected clip only.
Unselected active clips can retain their current context outline.

Do not clip inspection ghosts through the active slot mask as though they were
new rendered alternatives. Mask membership continues to come solely from
active attachments and draw order. In particular, rotating an inactive clip
must leave active scene pixels and draw intervals unchanged during preview.

Existing preview math represents a transformed region temporarily as a quad
mesh without changing persistent attachment kind; native commits decide whether
the canonical region remains representable. Keep that local preview adaptation
distinct from forbidden synthetic persistent clipping meshes. Dense clipping
preview should use the shared binding point/delta helper planned in the prior
memo; no invented image, UVs or triangle fields are needed for clip geometry.

## Pivot, frozen pose and gesture invariants

Root will choose and record the aggregate center policy; prior active-image
behavior averages its points, which can weight dense meshes more heavily.
Neither an average nor bounds-center formula is proven original behavior here.
Whichever default is chosen, every selected image/mesh/clip contributes its
actual geometry, including inactive and hidden inventory alternatives. A group
uses one common world pivot and the same affine transform exactly once per ID.
Never parent-filter attachment groups as though they were selected bone chains.

User-moved pivot is transient interaction state. Bind it to document plus
selection identity; reset or deliberately retain it on selection/tool/revision
changes according to the recorded policy. Moving the pivot makes zero native
geometry edits and no history entry. Snap candidates must use the same frozen
world vertex positions that subsequent rotation/scaling will use. Uniform and
single-axis scale must retain independent channel scope.

Keep `onPrepareGeometry`'s asynchronous release/cancel guard. Capture both
evaluated bones and the native `poseEpoch` once at pointerdown, then retain the
same revision/document/IDs/pivot through release. Geometry previews stay local;
release commits one `transformAttachments` with that epoch. Cancellation clears
all previews and releases the frozen pose. A rejected native edit must return
to the authoritative inventory and must not leave a moved ghost behind.

Selection may change without native revision changes. `setScene` currently
does not compare selected attachment lists, so explicitly check/cancel a drag
when its selection identity changes; otherwise a late pointerup can commit an
old group. Root owns this controller lifecycle decision. Do not cancel the
intended gesture just because its local selection callback synchronizes the
same IDs back into the controller.

## Meaningful validation

- Domain fixture: one slot owns active A and inactive B with distinct geometry;
  select B only, obtain B's world points and its owner's slot, transform B,
  assert active A and `activeAttachmentId` unchanged, and inspect B from the
  resulting preview inventory. Repeat with active=null and hidden owner.
- Mixed fixture: an inactive weighted mesh under a reflected/sheared owner,
  active region under another owner, and inactive weighted clip. Apply one
  fixed-pivot rotation then scaleX only. Compare each world point to an
  independent affine formula; input objects, weights, unrelated row bits and
  clip flags/end/order stay unchanged. Do not infer correctness solely from
  normalization or from the implementation calling its own point transform.
- Geometry/overlay fixture: two selected inactive alternatives in the same
  slot both receive preview outlines; neither receives a visible texture or
  becomes active. Mixed active/selected lists never draw duplicate overlays.
  Selected clip points remain authored vertices even with Convex/Inverse on.
- Controller fixture: click actual inactive group gizmo handles, several move
  events, one release; zero commits before release, exactly one stable-ID group
  commit afterwards. Check Rotate and independent scaleX/Y; moving the pivot
  commits nothing. Cover Escape, capture loss, document/revision change,
  selection change, pointerup during asynchronous freeze and native rejection.
- Frozen fixture: evaluated owner is displaced from setup and a clip is
  weighted to two matrices. Preview endpoint must match native committed world
  geometry, paused preview time/state remain intact, and the same epoch is sent.
- Native regression: existing group test around `scene_native_tests.rs`'s
  `TransformAttachments` rotation fixture covers inactive IDs. Extend only if
  missing mixed weighted clip/image, nonuniform scale, frozen epoch or exact
  history/metadata invariants; do not repeat completed codec/original batches.
- Actual Windows after integration: Tree-select inactive B while A remains
  rendered, drag Rotate and Scale handles, inspect ghost movement and pivot,
  Undo/Redo/save/reopen. Add a mixed selected image+clip case and verify active
  clipping pixels do not change when only an inactive clip is transformed.
  Domain/controller fake-renderer tests do not replace this native WebView check.

The current viewport input harness supplies Pixi doubles and verifies gesture
commits; it does not load an ImageLayer by default. Add targeted overlay
inspection or a separate narrow renderer-double harness rather than claiming
that the existing controller test has checked ghost drawing. CSP startup
regressions remain separate and should stay green when the viewport changes.

## Proposed ownership after both reference gates

- Coordinator/root: `createViewport.ts`, its controller tests, `GizmoOverlay.ts`
  and pivot visual/lifecycle, integration/frozen snapshot orchestration.
- Geometry/overlay agent: `sceneSelection.ts`, `scene-selection.test.mjs`,
  `ImageLayer.ts`, and a new focused overlay test if needed. Keep helper API
  names and immutable data contract coordinated with root before editing.
- UI reference agent after audit: App/tool routing and i18n only, preserving
  explicit clipping vertex-edit entry/exit.
- Data reference agent after audit: authoritative native checks/Windows own
  instance QA, with production native edits only after explicit ownership.

No existing user's application window may be automated. Integration must use a
separate own QA process, then preserve the usual final user launch workflow.

## Geometry/overlay handoff after both gates

The coordinator confirmed the paired data gate before these source changes.
`sceneSelection.ts` now exports `resolveAttachment`, `attachmentGeometry` and
`selectedAttachmentGeometry` with the agreed immutable contract. Explicit
inventory, including an empty inventory, wins over inspected fallback; that
fallback is limited to absent legacy inventory. Hidden/inactive region, mesh
and authored clip geometry is supported. Clip preview uses actual dense rows,
retains binding offsets and rejects invalid sums or missing positive bones.

`ImageLayer.ts` resolves all selected ghosts against preview inventory. Inactive
clip preview outlines/handles move while the active mask stays unchanged.
Hidden active regions receive one outline, rather than an ordinary selection
overlay plus a duplicate ghost. This did not change attachment activation,
normal textured visibility or mask membership.

Observed local checks: `node tests/scene-selection.test.mjs` passes 7 cases,
`node tests/image-layer-selection.test.mjs` passes 2 actual draw-path recorder
cases, `node tests/slot-blend.test.mjs` passes 2 regressions, and `pnpm typecheck`
passes. Recorder checks validate every selected inactive outline, stale
inspection rejection, preview coordinates, no inactive texture allocation,
hidden outline uniqueness, selected clip styling/handles and unchanged active
mask geometry. These are not actual Windows/GPU checks. Coordinator integration
still owns controller/pivot, full checks, native WebView verification, delivery
and application launch; this handoff does not mark F301 or F305 complete.
