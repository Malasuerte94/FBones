# Image-path replacement: Region size discrepancy and rendering gate

Recorded 2026-10-29 before a dependent size-policy correction. This UI audit
reads the new exact4.3.26 JSON result and existing own evidence; it performs no
original GUI input, Windows action, JSON re-export, product edit or test run.
The coordinator owns any additional original collection and policy decision.

## New directly proven result

[f222-path-original-check.json](../../analysis/f222-path-original-check.json)
reports `PASS_WITH_EXPLICIT_REGION_RUNTIME_SIZE_DIFFERENCE`, not full geometry
equivalence. The unchanged UI-authored source SHA256 is
`537d66b0edef444b0e1c7c67bf5e8058b9aff4eb1d5bf1cf4fbfc25fc7b7100b`.
One new original4.3.26 JSON export accepted that source. The copied `.spine`
and authored `.fbones` are byte-identical. No accepted batch was repeated.

The Region attachment named red has raw Image path `strip`, stored/native
dimensions96×96, translation(-130,80), rotation0 and scale(1,1). The referenced
PNG is160×48. Original runtime JSON instead outputs width160/height48, preserving
that translation/rotation/scale, with no scale compensation. Consequently:

| Model | Width × height | World rectangle at this pose |
| --- | --- | --- |
| Current FBones/stored Region metadata | 96 × 96 | X -178..-82, Y32..128 |
| New original runtime JSON | 160 × 48 | X -210..-50, Y56..104 |

The independent checker reconstructs these different corners; calling them
equivalent would be wrong. Other metadata, inventory, active pointers and order
pass their comparisons. The inactive weighted Mesh retains its dimensions,
UV/topology/binding values; the report compares eight positive influences and
16 bind coordinates. It contains no zero-weight columns. Green has raw-empty
fallback throughout, so that artifact does not prove a changed clear action.

**Evidence boundary:** JSON proves the exported runtime dimensions, not what
the original GUI does immediately after typing a different path. It also does
not directly prove original image-export bounds or an editor reload/save
mutation of the stored dimensions. Existing R03/path cases only establish
independent names, paths and stored fields; Mesh M04 cannot establish Region
rendering rules. The previous FBones96×96 stretch policy was explicitly our
choice, not original parity; the new result makes its interoperability limit
concrete.

## Primary documentation after local evidence

Rechecked the current official guides on this date:

- [Region properties and translation](https://en.esotericsoftware.com/spine-regions)
  describe a rectangular image, explicit-path versus name lookup, and translation
  at the image center. They do not explicitly specify the direct path-swap
  transaction or how stored dimension fields behave when the new PNG differs.
- [Image lookup](https://en.esotericsoftware.com/spine-images#Image-file-lookup)
  describes loading the referenced image and watching image files for changes.
  It does not state that a Region should be fitted to old stored dimensions.
- [Mesh image resize](https://en.esotericsoftware.com/spine-meshes#Image-resize)
  concerns an existing file made larger externally and an optional UV adjustment.
  It must not be generalized to direct Region path replacement or used to
  implicitly rewrite Mesh binding geometry.

These are patch-unpinned documentation, not an exact4.3.26 size-handler proof.
Neither silence about Region size nor a runtime implementation is sufficient
to invent the missing GUI transition. No older editor behavior is used here.

## Proposed single new rendering discriminator

The UI worker proposed the following to the coordinator **before collection**;
this memo does not itself execute it:

1. Use the same immutable537d source and own PNG bundle. Do not mutate the file,
   activate the inactive Mesh or repeat its JSON export.
2. Export one original4.3.26 current-pose PNG with the already validated
   current/single settings, transparent background, scale400%, images enabled,
   bones/others/selection/titles disabled, no fitting/cropping normalization.
   Retain actual settings, command receipt, exit code and source/output hashes.
3. Measure the solid yellow Region rectangle and solid green Region independently
   of crop origin. Yellow160×48 world units predicts640×192 pixels at4× scale;
   old96×96 fitting predicts384×384. The other active green96×96 rectangle
   predicts384×384 and supplies an independent scale/crop control. Transparent
   edges/AA may be separated from solid interiors rather than widening a
   tolerance until both hypotheses pass.

This discriminates original rendering from an export-JSON-only dimension
change using a new observable output, without repeating a discovery batch or
interacting with any user window. It still would not establish the original
interactive path-swap gesture, undo grouping or saved metadata rewrite.

## Correction boundary and UI implications

Before the additional rendering result, only the **runtime-export** natural-PNG
size is directly proven. A Region-native-size policy can be a coordinator's
explicit interoperability choice, but should not be described as verified
original viewport behavior solely from JSON. Keep the candidate unpublished
while that material size difference is being resolved.

If the rendering discriminator supports natural PNG bounds, the proposed
correction is Region-specific: retain x/y/rotation/scale, center and identity,
use the newly resolved PNG's natural dimensions, and preserve Mesh geometry,
UVs, weights and bind coordinates. The native operation, DTO geometry, viewport
gizmos/hit bounds and save/reopen must agree. Whether to rewrite stored Region
metadata or separately resolve effective render dimensions is a native/codec
contract decision, not a hidden inspector workaround.

The inspector hint must then distinguish Regions from Meshes. A blanket claim
that all bounds remain unchanged and every image stretches is no longer valid.
An appropriate prospective meaning is: Regions use the image's size while
keeping their transform; Mesh UVs and weights remain unchanged. Do not add
automatic scale compensation, bind/trace/reset or activation as part of this
resource operation.

Tests should check the Region's changed outer extent as well as center pixels:
the earlier yellow sample(-145,95) lies inside **both** hypotheses and therefore
could not reveal the discrepancy. Points such as(-195,80) distinguish natural
width from old fitting, while(-130,120) distinguish old height from natural
height. Keep an inactive/None case, weighted Mesh pixel updates and complete
binding preservation, then save/reopen the corrected native result. A later
corrected source must get its own appropriate original comparison; never
silently relabel the historical537d structural report as full parity.

## Actual new PNG result: stored bounds, not natural PNG bounds

The coordinator completed exactly the approved one new current-pose PNG export,
exit0, retaining the unchanged537d source. The independent UI checker verified
the collection receipt, settings hash, pre-recorded prediction hash, exact source
hash and a single PNG. It ran **zero original commands and zero GUI inputs**.
The four synthetic checker controls distinguish natural and stored hypotheses,
reject an unrelated aspect ratio and reject a missing green scale control.

[f222-path-size-render-check.json](../../analysis/f222-path-size-render-check.json)
records the result **STORED_REGION_DIMENSIONS**:

| Measurement | Actual output |
| --- | --- |
| Whole PNG | 1424 × 1104 |
| Yellow Region, exclusive pixel bounds | (0,0)..(384,384) |
| Yellow exact opaque pixels | 147,456 |
| Green control, exclusive pixel bounds | (1040,720)..(1424,1104) |
| Green exact opaque pixels | 147,456 |
| Alpha values | Only0 and255 |

Both rectangles are exactly384×384 at4× scale. There is no antialiasing tolerance,
color-distance threshold or crop-origin assumption in this classification.
The yellow640×192 natural-PNG hypothesis is directly rejected. The full image
dimensions also agree with the stored-bound prediction.

**This supersedes the prospective natural-size correction above:** the original
current-pose image export follows stored96×96 bounds for this loaded file while
its runtime JSON exports the actual PNG160×48 dimensions. These are different
observable outputs. The current FBones96×96 rendering agrees with the former;
changing its viewport to natural PNG dimensions solely because of JSON would
contradict this actual render proof. The raw/runtime geometry difference in the
earlier JSON report remains real and must not be hidden or marked equivalent.

This does not establish what the original GUI would author when its Image path
field is changed interactively, whether an original save rewrites metadata, or
whether a special option reconciles editor/runtime output. Do not invent such
a flag. A future export/interoperability policy may address that separate issue,
but there is no evidence-based reason from this sample to silently replace the
current resource-only viewport policy. The candidate publication decision and
any broader policy change remain with the coordinator after the paired audit.

### UI pixel-probe overlay correction

The first strengthened Linux and Windows UI size assertion sampled(-130,120)
and read RGB(189,209,137), rather than the PNG's solid yellow. The coordinator's
actual screenshot inspection confirms the Region remains96×96; the sample is
on the selected image's Translate-Y gizmo at x=-130. The original oracle export
disabled selection/other overlays, so its exact rectangle analysis is unaffected.
This is an unsuitable UI sample, not evidence of changed Region bounds.

The test-only correction moves the stored-only sample to(-145,120),15 world
units off that axis, while staying inside stored bounds and above the natural
PNG bounds' Y104 limit. The natural-only point(-195,80) remains unchanged.
Strict RGB equality is retained; no tolerance, product geometry, renderer or
image-path policy changes. Fresh coordinator Linux/Windows interaction results
are required after this sampling correction.

### Successful Linux off-axis verification and separate Windows reset limit

The coordinator's final current Linux run in `.local/f222-ui-verified.log`
passes **39/39 workflows in35.4 seconds**, zero failed cases. Its four F222
workflows pass, including strict yellow at the off-axis stored-only point
(-145,120) and non-yellow at the natural-only point(-195,80), active Region
texture/history/fallback, active/inactive weighted Mesh texture changes and
portable native Save/Close/Open. This verifies the corrected UI sample rather
than relaxing color or geometry expectations. Product rendering is unchanged.

A subsequent private Windows reset attempt timed out waiting for the button
Discard changes. Read-only inspection of its failure screenshot shows
**No project open** and the welcome view: the Close action had already succeeded.
The label itself is correct (`i18n.ts` discard, App's unsaved modal). The reset
helper unconditionally waited for a confirmation, while `workspace.request`
only shows that dialog for a dirty project and closes clean projects directly.
Returning resource paths to their saved values can leave this failed-test
project clean. This is a reset-harness assumption, not a rendering or app-close
failure and not a current Windows path-editing pass.

The recommendation is to wait after Close for either a null project summary or
the specific Leave this project? dialog. Click that dialog's scoped Discard
changes button only when the dialog is present, then verify the project is null.
If neither state occurs, retain the actual failure rather than inventing a
dialog or repeating input. This worker did not modify that helper, control a
live process, retry Windows acceptance or change any product source.
