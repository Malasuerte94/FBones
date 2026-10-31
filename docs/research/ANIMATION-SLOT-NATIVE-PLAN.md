# Slot animation — native and viewport integration plan

2026-10-30. Initial **PLAN ONLY** review after the0.9.0 bone-animation milestone;
the later authorized native checkpoint appears below. No Windows/original
operations were performed by this reviewer. F105 stays
active; F307/F308 remain user-deferred. This plan depends on the paired next DATA
and UI audits; its proposed DTOs are architecture choices, not recovered wire.

## Evidence and unresolved decisions

Directly observed in our current source:

- `SceneFrame` already holds stable `slot_ids`, nested `attachment_ids`,
  animation IDs and nested bone-key IDs. `SceneHistory::apply` clones project/ID
  state, validates complete encoding, then commits one history transaction.
- Setup activation is one nullable attachment index per slot. `SetActive`
  validates ownership. Attachment inventory, independent inventory traversal and
  slot draw order are separate. Existing `ReorderSlot` remaps inventory addresses
  and clipping endpoints; delete/move/rename paths currently know no slot keys.
- `SceneRigHistory::slot_views` projects inventory and the active attachment's
  `region`, `mesh`, `imageAvailable`, `visible` and `activeAttachmentId` together.
  `ImageLayer`, `worldRegions`, `imageAt` and `clippingScopes` consume that
  projection. Changing only `activeAttachmentId` would leave stale art/geometry.
- `animation::sample` currently produces scratch local bone poses before
  constraints. `EvaluationSnapshot` contains those locals and evaluated bones,
  with clip/frame/revision/epoch guards and FPS-bound continuation. The frontend
  mirrors sampling locally; no per-frame full-scene IPC is needed.
- `workspace.viewSlots` currently projects Setup plus a trace draft. Animate's
  `editRig` allowlist blocks Setup activation/color/reorder commands. Preserve
  this protection when adding real key authoring.

DATA's new retained-file scan reports no slot timelines in353 runtime JSON
documents. Setup slot inventory/null/RGBA findings can be reused; they do not
prove animation records. Runtime attachment time/name/null, color and draw-order
documentation is a separate category, not editor4.3.26 binary proof. The paired
DATA agent is preparing a small new own reference for root; this review does not
launch or repeat one. Still UNKNOWN: editor record classes and arena identities,
attachment name/reference encoding, color precision/curve arity, draw-order
offset/permutation encoding and exact UI key/rename/collision gestures.

Inspection commands: targeted `sed`/`rg` in `src-tauri/src/{animation.rs,
scene_edit.rs,scene_bridge.rs,evaluation.rs,project.rs}`, `src/domain/{animation.ts,
project.ts,images.ts,clipping.ts}`, `src/stores/workspace.ts`,
`src/composables/useAnimationWorkspace.ts`, `src/viewport/ImageLayer.ts` and
`ProjectViewport.vue`. DATA scan conclusion was communicated before this plan.

## Smallest safe architecture

1. **Keep existing bone APIs intact.** Add typed slot-channel and global
   draw-order collections to each canonical animation only after wire recovery.
   Do not put an attachment ID into bone `values:[f32;2]`, quantize unproven
   color values to Setup's packedu32, or serialize a frontend permutation unless
   it reproduces the actual record representation and full payload equality.
2. **Resolve IDs at the native boundary.** Proposed editor DTO families are
   `slotTracks` with stable slot IDs, attachment keys with explicit nullable
   attachment IDs, color keys with their proven scalar representation, and one
   global `drawOrder` track. A draw-order UI value can be a full permutation of
   stable slot IDs; codec conversion must follow the recovered stored form.
   `null` means an authored no-attachment key; absent key/track means no override.
   A raw name-based target, if observed, must stay name-based in the codec;
   native ID resolution must not invent encoded identities or discard strings.
3. **Extend one history system.** Allocate keys from the existing global
   animation-key counter; add parallel key-ID collections for new families.
   Extend duplicate/delete animation, duration, move/delete/copy/paste and key
   lookup to all families. Stable IDs remain session/history provenance, never
   new wire fields. Selected-key updates must identify the key explicitly;
   manual insertion/replacement policies remain explicit. One multi-family
   batch validates all values/references before allocating/committing anything.
4. **Sample a scratch scene pose.** Evolve sampling output into local bones plus
   compact slot states `{slot,activeAttachment,color}` and a slot-order projection.
   Defaults come from immutable Setup on every sample. Bone channels feed the
   existing constraint solve; slot states/order join the same sampled snapshot
   for rendering/hit testing. There is no need to clone attachment vertices,
   weights, UVs, textures or the entire canonical project each frame. Exact
   before/after-key, null, color blend/interpolation and duplicate semantics
   remain gated on the paired references; do not silently inherit bone rules.
5. **Project rendered slots coherently.** Add one shared frontend projection
   helper which selects a sampled attachment from inventory and rebuilds active
   flattened fields, then applies color/order overrides. Feed its result to
   viewport, clean Preview, hit testing and clipping masks. Keep Setup Tree
   inventory/inspection separate from sampled activation. Selected inactive
   geometry may remain an explicit ghost, never become visible by selection.
   `ImageLayer` already recreates Sprite/Mesh when attachment type changes and
   applies packed slot tint/alpha; sampled colors may require a separate float
   tint/alpha projection if their recovered precision exceeds8bits. Do not round
   the persisted key just to fit that rendering interface.
6. **Keep gesture and save guards.** Animate activation/color/order controls
   route to keyed commands with clip/frame/revision context, never Setup
   `SetActive`, `SetSlotColor` or `ReorderSlot`. Auto Key off uses a transient
   slot/order draft cleared by scrub/clip/mode/document changes. Extend the
   native temporary-pose freeze only if that draft can affect a guarded action;
   bind complete sampled inventory/order to its epoch and continuation layout.
   Save flushes valid authored key drafts and blocks invalid ones; preview state
   and clocks never enter save/history. No per-pointer/per-playback-frame RPC.

## Reference maintenance and clipping boundaries

Audit every existing structural command before enabling the new profile:

- Slot reorder must remap canonical slot indices and each draw-order reference,
  while preserving stable session IDs and stored key intent.
- Attachment deletion/move and slot deletion must not leave dangling targets;
  attachment rename must account for actual name-based wire references if used.
  Slot/bone ownership changes must retain animation targets independently of
  draw order. Inventory traversal must remain independent of sampled ordering.
- Until a lossless, explicitly reviewed remap is implemented, reject operations
  touching referenced objects atomically with a useful explanation. This is a
  proposed FBones protection policy, not a claim about Spine's deletion gesture.
- Attachment and draw-order keys can activate/deactivate clipping or alter a
  clipping range. Validate the sampled configuration through the existing
  clipping rules before freeze/render; never reuse masks from the Setup order.
  First cover Region/Mesh/none transitions. Clip-key support needs its own
  event-boundary tests/reference; if unsupported, reject that profile rather than
  silently render an incorrect mask or rewrite its records.

## Ownership and staged acceptance

| Owner | Focused scope |
| --- | --- |
| DATA | Recover actual record families/arenas/flags/precision; canonical model, bounded reader/writer, whole-payload equality and exact malformed/unknown rejection. Preserve empty and bone-only bytes. |
| Native | `animation.rs` plus focused slot-animation module/tests; `scene_edit.rs` IDs/history/reference maintenance; `scene_bridge.rs` coherent projection; `project.rs` DTO/context; `evaluation.rs` scratch snapshot/cache. |
| Root integration | Domain DTO/sample/projection, workspace/key routing and selection, viewport/Preview inputs. Preserve stable Setup projections and existing freeze/save lifecycle. |
| UI | Reference-backed slot/Dopesheet/Graph controls, activation/key/color interactions and draw-order rows, consuming controlled DTO/events without independent persistence/history. |

Deliver attachment keys first if that record family is independently closed;
color next, draw order when its encoding/remapping and clipping effects are
closed. These are delivery stages, not permission to omit remaining F105 scope.
For each stage require:

- Codec roundtrip with full byte equality, unknown/malformed/ref/curve rejection,
  names/null/ordering and exact stored precision. No JSON/custom sidecar saves.
- Native stable-ID batch/history/duplicate/remap tests and Save/Close/Open;
  Setup slot colors, activation, order, inventory, bones/bindings stay unchanged.
- Frontend/native sampled states agree before/on/between/after keys and at
  duplicate/null boundaries; sampled color/order does not add history.
- Real Ubuntu+Rust interaction tests: select a slot, key alternate art/none,
  scrub/play, precise color/curve edits, order drag, Undo/Redo, draft cancellation,
  save/reopen and stale-context rejection. Pixel/hit/mask checks use overlapping
  distinct art, weighted mesh and an explicitly supported clipping case.
- One newly UI-authored supported source accepted/exported by exact original
  Spine4.3.26 and independently compared, then targeted native Windows delivery
  checks where relevant. Root alone operates own original/QA windows. Completed
  original batches and the user's protected40348 window are never reused.

No product implementation is authorized by this note alone. Wait for both paired
reference audits and root's agreed DTO/record gate; then implement the smallest
real persist/evaluate/UI slice. Unsupported families remain inspection-only.

## Coordinator DTO decision, pending record gate

Root agreed to preserve existing bone APIs and add `AnimationView.slotTracks`
as a separate union: attachment tracks have `{slot,channel:'attachment',keys}`
with `{id,frame,attachment:stableID|null}`; RGBA tracks have
`{slot,channel:'rgba',keys}` with four values and, when supported, four-axis
Bezier controls. Dedicated `setAnimationSlotKeys` and combined atomic
`setAnimationKeyBatch{boneKeys,slotKeys}` serve mixed clipboard transactions.
Existing delete/move-key commands extend across the shared key-ID space; new
per-slot-track key-ID vectors remain separate from existing bone vectors.
Native ownership is `animation_slots.rs` and focused tests plus minimal native
integration. Root owns frontend DTO/store/sampling; UI owns controls; DATA owns
the codec. The primary new original reference has completed import/export;
its slot record model is still being independently inspected. No inferred wire
representation or product implementation is approved merely by these DTO names.

## Authorized native checkpoint after the record gate

Root authorized implementation after the new exact reference and paired DATA/UI
audits. `animation_slots.rs` now supplies the agreed tagged input/view DTO,
normalized-float `EvaluationSnapshot.slotPose`, native sampling, and slot key
batch operations. The existing bone APIs are retained. A combined batch authors
bone and slot keys in one transaction; invalid ownership/color/frame/epoch or
curve rolls the whole batch back. Shared key identities support mixed deletion,
movement and animation duplication. Four-axis Bezier controls retain exact
stored f32s and use the same bounded48-iteration frame inversion as bone curves.

Native structural edits remap wire slot/inventory indices through stable IDs;
slot reorder, attachment rename and deletion of an unkeyed earlier attachment
preserve keyed targets. Deleting a keyed slot/attachment or moving its target to
another slot rejects atomically. The canonical owner-bone grouping helper is
applied to both slot tracks and their parallel key-ID vectors after transactions.
This is a lossless native reference-maintenance policy, not proof of original
delete/reparent gestures. The separate new original Mesh/Clipping discriminator
has now passed:9keys, typed46/84/null references and whole2227-byte codec equality
(`analysis/animation-attachment-kinds-{reference,format}-check.json`). Attachment
keys therefore accept known Region/Mesh/Clipping/none inventory alternatives.
RGBA values accept finite0..1; control Y may overshoot within supported
finite bounds. Alpha zero does not imply no active attachment.

Eight focused native cases cover mixed one-history authoring, resource-backed
binary Save/Close/Open and non-baking Setup state; invalid/stale batches;
move/delete/duplicate and structural reference maintenance; four-axis Bezier
precision/neighbor protection; imported duplicate frames with explicit earlier
key editing; fractional-frame RGBA sampling; owner-bone canonical permutation
with parallel key identities; and Mesh/Clipping/null activation, mask interval
validation and binary reopen. The same borrowed interval validator checks Setup
and animated activation; discrete key event states reject overlaps and
end-before-start atomically without cloning or baking the complete scene.
The0.9.1 complete native run passes222tests with2ignored, retaining all14
bone-animation regressions; legacy passes93 with1ignored. Strict Clippy passes
default, legacy and e2e-host profiles. The full run log is
`.local/animation-slots-native-091.log`; pinned checks are
`.local/animation-slots-native-checks/check.json`.
Frontend interaction, final new-source original acceptance and delivery are
separate gates; this checkpoint does not declare those complete.
