# F222 — Attachment inventory and active identity

Status: **DONE for the bounded accepted canonical attachment profile.** Typed
inventory/activation, ownership and direct Region/Mesh Image path editing now
have native, UI, persistence and original-reference acceptance. Unknown richer
structures remain inspection-only; this is not complete Spine compatibility or
proof of every original interactive path-swap/resize rule. This profile supports
scene selection, attachment filters and clipping, independently of Images
library multi-selection.

## Evidence before code

Two reference audits: `../SLOT-ATTACHMENTS-4.3.26.md`,
`../REFERENCE-WORKFLOW-4.3.26.md`, and the current paired feature audits in
`../research/`. Three original4.3.26 A/B/none cases prove two retained Region43
records owned by one Slot13 and one nullable active reference. The legacy
comparison profile (`--no-default-features`) rejects broader data safely; the
typed Scene path now preserves and edits it and is default in0.8. Mixed
Region/Mesh/Clipping independent candidates
have separate original4.3.26 acceptance in FORMAT-SCENE-4.3.26.md; that format
evidence is not a current complete Windows interaction pass.

## Required model

- A slot has an ordered inventory of attachments and a nullable active
  attachment identity. Scene selection, inspected attachment, slot ownership,
  asset path and setup draw order are independent concepts.
- Preserve the global attachment inventory order separately from slot draw
  order. Active records can be serialized before inventory and subsequently
  referenced; wire arena positions are not stable session IDs.
- Stable native attachment IDs must survive reorder/history. Use typed
  attachment addresses for editing inactive alternatives without switching
  activation. Multiple slots may refer to the same PNG resource.
- Region, Mesh and Clipping are distinct kinds. Clipping must not be disguised
  as a fake textured Region or acquire a dummy image path. Geometry/binding can
  share skinning helpers while their persistent records remain distinct.
- Keep the strict bounded reader and complete exact reserialization check.
  Retain supported default-skin data completely; reject unknown skins/records
  rather than dropping inactive alternatives or unknown properties.

## Integration and source ownership

The existing one-attachment model is in minimal/regions.rs and reader.rs;
native frames, views and most edits assume one attachment in rig.rs/project.rs.
Coordinate ownership before editing these files. F304 is extending the slot's
blend field first; retain its proven enum/default and all prior normal bytes.

A general inventory codec may be introduced beside the legacy public profile
to keep migration reviewable, but the application must ultimately edit the
real typed inventory. A lossless copy, opaque sidecar or another slot per
alternative does not implement this task.

Native history snapshots need attachment identities/focus and reference
remapping for slot/bone deletion/reparenting. Existing mesh edit commands must
resolve the explicitly inspected attachment, not whichever alternative happens
to be active. Renderer submits at most the active attachment of each slot.

## Acceptance

Create alternatives by dropping PNGs onto an existing slot; separate Tree
slot/attachment rows and activation control; select inactive alternatives
without switching pixels; active A/B/none; rename/path/delete/reparent with
collision handling; independent slot draw order; history and revision guards.

Test mixed Region/Mesh alternatives, inactive weighted edits, repeated names
across different slots, malformed references and unsupported data, deletion of
active versus inactive alternatives, stable IDs through undo/redo and exact
save/reopen. Validate independent new generations in original4.3.26 and actual
Windows UI pixels for one/none visible; no CLI-only GPU claim.

Do not mark complete until the codec, authoritative application edits, UI,
rendering, original comparison and actual native interactions all pass.

Delivered evidence: analysis/scene-ui-check.json and immutable
.local/scene-08-final-acceptance-snapshot. Final16 Windows groups prove explicit
A/B/none, inactive inspection/trace, attachment rename (PNG path unchanged),
inactive delete/Undo, asset multi-drop into one slot, Owner inspector and real
attachment→slot OS drag, affine preservation, collision-safe native history and
combined save/reopen. Region/Mesh/Clipping remain distinct; native/global order
and stable IDs have independent codec/history tests. Reparent destination keeps
its prior active pointer including none: this is an explicit FBones policy,
not an observed original activation rule. See NATIVE-SCENE-BRIDGE.md.

## Direct Image path acceptance, 2026-10-29

Paired research and the explicit FBones replacement policy were recorded before
implementation in `../research/ATTACHMENT-PATH-{DATA,UI}-HANDOFF.md` and
`../research/ATTACHMENT-PATH-IMPLEMENTATION-POLICY.md`. The selected Region or
Mesh now exposes its **raw** image-path override separately from the effective
image lookup key. Empty raw path uses the attachment name; an explicit path
equal to that name remains a distinct saved value. Text entry and the library
selector share the authoritative revision-checked command. Existing exact PNG
keys, including nested/dotted stems and a stem ending in `.png`, are used
without extension stripping or case guessing. Clipping has no image path.

Replacement preserves identity, name, owner, activation including inactive/none,
draw order and untargeted alternatives. Region transforms and stored bounds
remain unchanged; Mesh UVs, topology, weights and initialized local bind
coordinates remain unchanged. Different-size artwork fits those existing
bounds/UVs. Shared image references are allowed. Invalid/missing/stale requests
reject atomically, unchanged raw values are no-ops, and a completed edit is one
Undo entry. Enter/change/blur deduplicate; Escape cancels its draft/error and
Save awaits pending edits. Portable save/reopen retains raw/effective paths and
the resource bundle, including inactive alternatives and images needed by history.

[f222-ui-check.json](../../analysis/f222-ui-check.json) pins the accepted source
snapshot and exact checks: **39/39 Linux Chromium/native-session UI workflows**,
**191 JS passes plus one existing Physics skip**, **150 default / 93 legacy
native passes**, five focused path tests and strict Clippy in both profiles.
The native profiles retain two/one existing ignored tests respectively. The
same published Windows image
`a0677aceb428b36974435d06c50f92fd990decc8e840c4d0713556273be148fd`
passes **three actual Windows WebView2 groups**, including strict off-gizmo
Region-bound pixels, inactive-to-active weighted Mesh texture updates, error
recovery and native-dialog SaveAs/Close/Open. No global OS pointer gesture is
claimed by these three groups; prior real attachment-drop evidence remains
separate. Linux browser checks do not establish macOS/nativeGTK dialogs.

The new UI-authored binary also opens/exports in original4.3.26. Its independent
[raw/runtime comparison](../../analysis/f222-path-original-check.json) explicitly
reports **STRUCTURAL_PASS_RUNTIME_GEOMETRY_DIFFERENT**: stored/native Region
dimensions96×96 become160×48 in runtime JSON for the referenced strip PNG, with
no scale compensation. Complete runtime-JSON geometry equivalence is false.
The Mesh's UVs/weights/bind coordinates retain their accepted geometry.

One separately authorized original current-pose PNG discriminator resolves the
rendering question: the Region renders at stored96×96, matching current FBones
GPU bounds, while a green96×96 control calibrates the export scale. Independent
[UI pixel analysis](../../analysis/f222-path-size-render-check.json) and
[DATA pixel analysis](../../analysis/f222-path-size-data-check.json) agree on
384×384 yellow and green rectangles at4× scale. Strict Linux/Windows off-axis
probes distinguish those stored bounds from the natural-PNG alternative. The
runtime metadata difference remains explicit; image export and runtime JSON
must not be conflated. Original interactive path-swap gestures, automatic resize
choices and editor-save dimension rewriting are still unknown, as recorded in
`../research/ATTACHMENT-PATH-SIZE-UI.md`. No accepted discovery batch was repeated.

## Reparent follow-up, 2026-10-29

Both fresh paired audits reused exact-version model/UI evidence and checked the
official attachment-parent/Tree-drag guides. Neither direct evidence nor those
guides settles original move activation or collision choices. Root approved
explicit conservative FBones semantics before coding: source active clears if
the moved item was active; destination active remains unchanged even if none;
same-slot is a no-op; no overwrite or automatic rename on name collision.

`RigEdit::MoveAttachment {id,slot}` now preserves stable ID, global attachment
inventory position and world geometry, remapping owning-slot addresses. It
rebases unweighted geometry to the new owner and preserves weighted binding
rows exactly. A sheared Region representation becomes a canonical quad Mesh.
The target's slot tint/blend and draw order apply; no second independent start
pointer is invented for clipping. A moved clipping item's endpoint stays the
same. Since destination activation is preserved, that moved item is inactive;
an earlier endpoint may remain in inventory, but its later activation fails
until a valid end is selected. The active-interval guard does not prohibit all
inactive geometry by assumption.

Five focused native tests pass: source/destination activation, inactive index
adjustment, stable ID/order and one undo/redo, same-slot no-op, full codec and
portable save/reopen, stale save/revision/pose epoch, affine Region/Mesh and
weighted Mesh/Clipping preservation, bone/slot remapping, collisions and
singular inverse failures. Source files: rig.rs, scene_bridge.rs and
scene_native_tests.rs. See NATIVE-SCENE-BRIDGE.md for exact contracts and
evidence classification. The Tree drop/Parent inspector and UI-generated-file
comparison gates from this historical reparent checkpoint were subsequently
completed by the delivered Scene evidence above; the direct path follow-up has
its separate current acceptance record.
