# F300 — Cross-panel bone hover and selection feedback

Status: DONE for the accepted hover interaction scope. General Scene integration
is tracked independently; the full advanced goal remains active.

## Requested end state

Hover and click bones in Tree and Weights must visibly identify the same bone in the viewport; hover is transient and distinct from selection, influence choice and binding.

## Mandatory evidence gate

Two reference agents inspect behavior/data and UI/interaction before dependent
implementation. Priority: original Spine **4.3.26** reverse engineering → official
primary documentation → explicit assumption. Reuse completed evidence; never
repeat accepted oracle batches or use older editor versions.

Behavior/data findings: `../research/FEATURE-DATA-4.3.26.md` (F300 section complete).
UI findings: `../research/FEATURE-UI-4.3.26.md` (F300 section complete).
Code audit: `../research/FEATURE-CODE-AUDIT.md` (F300 section complete).
Record each conclusion as directly proven, documented, inferred or unknown.

## Acceptance and failure cases

Hover enter/move/leave; keyboard focus and click; clear on pane exit, deletion, document replacement and viewport destruction; no persistent edit/dirty flag or IPC per hover frame.

## Implementation and verification surface

SceneTree.vue, WeightsPanel.vue, workspace.ts, ProjectViewport.vue, createViewport.ts; focused pointer/store tests and actual Windows visual checks.

Persistence changes must include bounded parsing plus exact complete
reserialization, atomic revision-checked edits, history and independent new
original4.3.26 comparison. UI claims require actual Windows interactions and
visual inspection where relevant. Keep unknown files inspection-only.

## Evidence / handoff

Both required reference audits were recorded before implementation. Exact 4.3.26
evidence proves stable identity/binding links; official current documentation
supports influence selection. Original Tree hover is directly observed white;
keyboard focus lifetime and Weights-list transient identification also follow
the user's requested FBones behavior, without an original Weights timing claim.

Implemented in domain/boneHover.ts, workspace.ts, SceneTree.vue, WeightsPanel.vue,
ProjectViewport.vue and createViewport.ts. Source/target-guarded pointer/focus
claims prevent stale leave(A) from clearing enter(B); remaining keyboard focus
restores after a pointer claim leaves. Invalid/deleted IDs, document replacement,
close, Escape, window blur and viewport destruction clear correctly. Pane unmount
clears only its own claims. Hover does not alter project RGBA, weights, revision,
dirtiness or history and sends no native RPC.

Selection/influence stays cyan while other hovered bones receive white plus a
separate halo. Hovering selection preserves the cyan body. Bound Weights clicks
choose the pinned influence; unbound rows remain focusable/identifiable without
changing brush influence or checkbox binding. List dots use saved bone colors.

Checks passed 2026-10-28: pnpm typecheck; 4 tests/bone-hover.test.mjs tests;
21 tests/viewport-input.test.mjs tests; 2 viewport-csp regressions; 5 workspace
regressions. New cases exercise stale sources/targets, focus restoration, pinned
versus hover styles, real Pinia document nonmutation, bound/unbound clicks,
lifetime clearing, and actual controller pointer events with zero commits.

Next action: root integrates/builds an owned Windows QA instance and visually
checks Tree/Weights pointer/focus, pinned A plus hover B, unbound click, blur/
leave/Escape/deletion/document replacement, and no revision/history changes.
Synthetic checks do not establish real WebView2 pixels; leave external check
WAITING. F300 source is handed off/frozen for later F301/F303 owners; preserve
its helpers/callbacks and keep selection/filter projections independent.

Exact reference refinement: owned original4.3.26 Tree hover was measured white
(gray154→white254 at the observed bone stroke) with cyan selection retained.
FBones hover was changed from the initial gold choice to white accordingly.
See the direct-observation appendix in FEATURE-UI; repeat the Windows visual
check on the updated immutable build before calling this color gate passed.

The gate above has now passed on actual dedicated Windows0.7.0: pinned A stays
cyan while hovered B becomes white; Tree/Weights/unbound click and blur do not
change native DTO, weights, dirty state or history. Final independent evidence:
analysis/qol-blend-ui-check.json. The actual immutable editor hash is
078ab18f5a91452e5b6492f7c8e9fa20618a38f7636a4c6a30d88ef264b357ee.
This is historical observed QA, not a claim that its former PID is still live.
Screenshots containing local image-folder paths are private ignored evidence.
