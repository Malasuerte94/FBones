# F305 — Clipping attachments and draw interval

Status: DONE for the accepted canonical Scene profile in0.8.2. Polygon/range,
whole transforms, real weighted-clip authoring and independent deformed-mask
pixel verification pass. Proprietary Auto numeric parity, subsets/locks and
unobserved broader original editor workflows remain separately tracked F302/
full-compatibility work; this is not a complete Spine UI parity claim.

## Requested end state

Create/edit a clipping attachment owned by a slot/bone, with polygon geometry, documented implicit start and selectable end slot in draw order; persist and clip actual rendered regions/meshes.

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

Exact4.3.26 default/self/null end semantics, inclusive end, reorder/deletion/history, concave polygons, empty/invalid/crossed geometry, active/inactive clipping, weighted clipping if supported, nested/overlapping rules, transformed parents; correct scope and no leaks between masks; original comparisons and pixel checks.

## Implementation and verification surface

Requires typed attachment inventory F222; format clipping codec, native polygon edits/reference remapping, clipping inspector/tree/draw-order UI and renderer masks/geometry.

Persistence changes must include bounded parsing plus exact complete
reserialization, atomic revision-checked edits, history and independent new
original4.3.26 comparison. UI claims require actual Windows interactions and
visual inspection where relevant. Keep unknown files inspection-only.

## Evidence / handoff

Both reference audits preceded implementation. The typed codec/native bridge
persists real clipping, including already-weighted dense bindings, end, raw
Convex and Inverse. Native polygon edits, frozen-pose geometry, remapping and
active interval failures are atomic. Actual Windows creation by clicks,
Modify/Create/Remove, end-inclusive/self, inverse, activation and image/mesh
pixels pass. Nine NEW original4.3.26 PNG cases prove hull/inverse and interval
semantics: analysis/clipping-pixels-check.json compares9,308,468 interior pixels
with zero mismatches. Inverse uses the geometric hull even with raw Convex off.
Full16 Windows evidence: analysis/scene-ui-check.json.

Historical0.8 limitation (resolved in0.8.2): WeightsPanel/painting targeted only
Mesh; weighted Clip persistence alone did not implement Bind/Auto/paint controls.
Whole-clip Rotate/Scale/movable snapping pivot are now accepted in0.8.1:
the vertex toolbar and V/C/X switch to whole transforms without selecting
bones or activating alternatives. Native binding rows transform once; the
new original-exported UI sample retains actual clip Rotate/ScaleX/Translate
through a separate inactive-mesh ScaleY SaveAs/reopen annex. Six actual Windows
groups across two own instances and6 independent transform checks are recorded
in analysis/inactive-clip-transform-check.json. This sample's clip is
unweighted; native weighted clip math/history/epoch tests do not establish
weighted clip UI or original weighted/deformed mask pixels. Continue from
../research/WEIGHTED-CLIPPING-NEXT-STEPS.md; share real dense binding helpers,
never manufacture an image or persistent mesh for clipping.

## Accepted0.8.2 authoring and comparison

Paired DATA/UI weighted-clip audits preceded code, including new actual original
Bind and Direct numeric boundary snapshots; see
../research/WEIGHTED-CLIP-DATA-4.3.26.md and
../research/WEIGHTED-CLIP-UI-4.3.26.md. Shared dense binding helpers operate on
real Clipping/Mesh types. All five attachment-addressed weight edits preserve
ownership/activation/resources/flags/end and ordinary edits retain all position
bits. Bind membership is separate from Auto, initializing dormant columns.
Direct numeric/slider/vertical drag and Add/Remove/Replace/Smooth, Normalize,
posed Bind/Unbind, inactive editing, one-stroke history and safe persistence
pass. Direct gain, checkbox batch Bind, Normalize/Smooth and some boundary
policies are explicitly own implementation choices, not exact numeric parity.

Exact final7dcb/version0.8.2 passes7 actual Windows groups, including a real OS
Direct stroke and Shift-fine WebView/CDP stroke, numeric drafts surviving hover,
Enter/Escape and untouched
f32 precision.160 JS tests (159pass/1pending Physics skip),113 native tests,
80 legacy tests and strict checks pass. Final own sourceb6bd is byte-identical
after current SaveAs/reopen to the accepted original source. Its existing
original4.3.26 JSON/ONEPNG oracle is reused explicitly, with fresh current GPU
capture and independently checked current editor identity; no original rerun.

analysis/weighted-clip-authoring-check.json validates41 actual UI actions,
616 preserved position-f32 components,34manual rows,42 Bind points,2no-op and
2frozen-pose cases, all18source weights/36positions including7dormant columns.
analysis/weighted-clipping-pixels-final-check.json compares1,082,200 safe
interior pixels with ZERO mismatches and world error0. Its concave5-vertex/
2-bone case independently discriminates deformation, convex substitution and
incorrectly masking the trailing slot. Edge/editor overlay exclusions and
historical/current provenance are recorded. Native14 new cases include actual
concavity, reflected/posed Unbind, canonical/history and invalid/stale epochs.

Unknown original posed binding/removal/new-positive brush paths are not called
parity merely because own authoring and original rendering pass. F302 keeps
Auto scope/locks and dormant/new-vertex questions active; unknown richer project
structures still remain inspection-only with complete canonical equality.
