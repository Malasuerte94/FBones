# F301 — Multiple scene images and attachments

Status: DONE within the accepted canonical Scene profile, delivered in0.8.1.
Visible/inactive/hidden Region/Mesh/Clipping selections, preview ghosts,
whole transforms and moved pivot are accepted. This is not a claim of exact
original inactive-transform gesture or pivot-lifetime parity.

## Requested end state

Select multiple placed images/attachments with Ctrl/Cmd, Shift and marquee as appropriate, with matching Tree/viewport selection and atomic group transforms. Library PNG selection already exists and is not completion of this requirement.

## Mandatory evidence gate

Two reference agents inspect behavior/data and UI/interaction before dependent
implementation. Priority: original Spine **4.3.26** reverse engineering → official
primary documentation → explicit assumption. Reuse completed evidence; never
repeat accepted oracle batches or use older editor versions.

Behavior/data findings: `../research/FEATURE-DATA-4.3.26.md` (in progress).
UI findings: `../research/FEATURE-UI-4.3.26.md` (in progress).
Code audit: `../research/FEATURE-CODE-AUDIT.md` (in progress).
Record each conclusion as directly proven, documented, inferred or unknown.

## Acceptance and failure cases

Mixed visible/hidden/inactive items, hierarchy parents and transformed attachments; group move/rotate/scale without double-transform; one undo per gesture; selection remains separate from active attachment; save/reopen preserves edits.

## Implementation and verification surface

Domain scene selection/preview math, native RigEdit transaction, Tree, viewport; actual Windows mouse/keyboard plus original comparison for persistent transformations.

Persistence changes must include bounded parsing plus exact complete
reserialization, atomic revision-checked edits, history and independent new
original4.3.26 comparison. UI claims require actual Windows interactions and
visual inspection where relevant. Keep unknown files inspection-only.

## Evidence / handoff

Paired reference audits were completed before implementation. Native
TransformAttachments handles Region/Mesh/Clipping and inactive IDs atomically;
frontend sceneSelection/createViewport and Tree select stable attachment IDs,
independently from library keys/activation. Final16 Windows groups prove Ctrl,
marquee, group Translate/Rotate and ScaleX1.5 with Y unchanged, Undo, explicit
inactive inspection and native save/reopen; see analysis/scene-ui-check.json.
Desktop0.8.1 resolves every selected stable ID through current inventory,
including inactive/hidden regions, image meshes and authored clipping vertices.
All selected ghost outlines follow preview inventory; stale inspected objects
cannot revive deleted items. Active rendering/masks remain separate. The same
group transaction transforms each selected member once without changing
activation, owners, resource paths or unrelated geometry. Trace previews reach
inactive inventory without replacing active pixels.

Rotate/Scale use a central crosshair that can be dragged and snaps to real
vertices; movement creates no native edit/Undo. It is transient world-space
interaction, not a persisted clipping/image property. Selection/document or
external revision changes reset it, tool changes retain it, canceled pivot
drags restore the prior point and canceled geometry never commits. Original
exact-patch inactive whole gestures/group-center/reset behavior remain unknown;
paired evidence and explicit own policies are recorded in
../research/INACTIVE-CLIP-TRANSFORMS-DATA-4.3.26.md and
../research/INACTIVE-CLIP-TRANSFORMS-UI-4.3.26.md.

Verification on exact313e0ed2…454e5d79e/version0.8.1:
5 actual Windows main groups plus1 separate inactive-mesh ScaleY annex,
zero runtime exceptions;3 real guarded Windows OS pointer drags; common
Rotate, independent X/Y Scale, inactive GPU ghost preview, Escape/cancel,
Undo/Redo and native SaveAs/close/reopen. Independent recorded-command math
checks6 unique commits/36 world vertices with maxerror0.000029019; weights,
metadata and activation remain intact. Final actual UI file with2regions,
1inactive mesh and1clip accepted/exported by original4.3.26, ExitCode0/Complete;
all5 PNGs checked. analysis/inactive-clip-transform-check.json records separate
PIDs/snapshots/source linkage honestly, not a single6-group run. Weighted clip
group transforms also pass2 new native frozen-pose/bit/history/atomic tests;
weighted clip UI/painting and original deformed mask pixels remain F305 scope.
