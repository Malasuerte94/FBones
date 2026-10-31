# F303 — Tree category filters

Status: DONE for category/search/collapse projection and latent selection.

## Requested end state

Toggle bones, slots and attachments from controls above Tree and show only checked categories with understandable hierarchy context.

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

Combined filters and text search, no matches/all off, collapsed ancestors, keyboard navigation, hidden selection, attachment versus slot rows, constraints category where reference requires; do not mutate project or active attachment.

## Implementation and verification surface

SceneTree and pure row builder/selection helpers; UI/keyboard checks with hierarchy context.

Persistence changes must include bounded parsing plus exact complete
reserialization, atomic revision-checked edits, history and independent new
original4.3.26 comparison. UI claims require actual Windows interactions and
visual inspection where relevant. Keep unknown files inspection-only.

## Evidence / handoff

Paired exact-version/UI audits were completed. projectTree projects typed
identities without changing the native model; Bones-off flattens slots in
front-first draw order, enabled ancestry/search/collapse compose correctly,
and independently filtered constraints remain available. App/viewport project
selection without erasing the underlying IDs. Tree hover/focus source cleanup
handles hidden rows, layout changes, tab changes and document replacement while
retaining Weights claims. Pure tests, actual compiled-Vue handler checks and
the final16 Windows filter/hover groups pass with native DTO/history unchanged.
Evidence: research/FEATURE-UI-4.3.26.md and analysis/scene-ui-check.json.
