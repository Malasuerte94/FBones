# F222 Region size discrepancy: data gate before correction

Recorded2026-10-29 after the new UI source was accepted/exported once by
original4.3.26. This data review sends no original input or command and changes
no product. The earlier own aspect-ratio-preservation assumption is superseded
where direct reference behavior is now observable. It is not release parity.

## Exact new source/output comparison

Source SHA256:
`537d66b0edef444b0e1c7c67bf5e8058b9aff4eb1d5bf1cf4fbfc25fc7b7100b`.
The unchanged `.spine` copy and original engine4.3.26 log/exit0 are verified.
Independent checker: `.local/check-f222-path-export.py`, zero original calls.

| Property | Native summary and raw Region43 | Existing original runtime JSON |
| --- | --- | --- |
| name / image override | red / strip | red / strip |
| x / y / rotation | -130 /80 /0 | -130 /80 /default0 |
| scale X / Y | 1 /1 | omitted, default1 /1 |
| width / height | tags11/12 =96 /96 | 160 /48 |
| slot owner / active | root /red | root /red |

The actual cached/copied `strip.png` is160×48, fully opaque, uniform
RGBA(238,192,65,255). No exported scale compensates for the changed dimensions.
Consequently the raw/native96×96 corners are x[-178,-82],y[32,128], while the
runtime160×48 corners reconstructed from existing original JSON are
x[-210,-50],y[56,104]. This is an actual runtime-data discrepancy, not decimal
rounding. The new source's two Regions, inactive weighted Mesh, all identities,
activation/order and positive weights/coordinates otherwise validate.

The JSON-only report is classified
`STRUCTURAL_PASS_RUNTIME_GEOMETRY_DIFFERENT`, SHA256
`09512db9c2f0754203819ed9a3d88a4cc6180ee10734a593302b0b75b7cbf391`.
It is retained unchanged at `analysis/f222-path-json-geometry-check.json`.
The full earlier report is archived unchanged at
`analysis/f222-path-structural-initial-check.json`, SHA256
`423200ab3846e14df2bd6d656e12bcb1c6d5a7d66d4780e92420db3b3dac65c2`.
All immutable source/snapshot/export files remain unchanged. The historical
report's qualified status is not permission to claim runtime geometry parity.

## Reused old evidence and flags

Accepted R03 in `region-results-1793203596996756100` uses a path override but
stored32×24 equals its actual PNG32×24. Re-reading its existing recipe and both
exports confirms path handling; it cannot discriminate which dimensions govern
a Region when they differ. No batch rerun occurred.

Accepted M04 in `mesh-results-1793209312688729200` already distinguishes stored
Mesh width96 from PNG width32; original JSON reports32, with explicit Mesh
vertices unchanged. That supports independent image metadata and Mesh geometry.
It does not establish Region render bounds or an original path-swap gesture.

For canonical Region43, tags6/7/10 are transform position/rotation,8/9 are
scales,11/12 are stored dimensions and13 is the override. The accepted remaining
defaults include tag15's zero/null encoding,32=false,5=true,33=true,35=false,
tag4=0 and white color. Wider meanings remain unknown. There is **no proven
fixed-size flag** to flip. The current writer's null tag15 and the experimental
reader's zero/false interpretation share the same encoded byte; that ambiguity
must not be promoted to a new boolean feature. Complete canonical equality must
continue rejecting unsupported variants.

## Documentation and what remains unknown

After local inspection, the current primary
[Region guide](https://en.esotericsoftware.com/spine-regions#Image-path) confirms
image lookup and identifies translation as the image center. It does not define
different-size path replacement. The
[Mesh guide](https://en.esotericsoftware.com/spine-meshes#Image-resize) separates
vertex geometry from image/UV resize behavior. Those pages are not patch-pinned
and do not replace the exact runtime output above.

We have direct proof of **runtime JSON dimensions**, not a new original editor
path-swap action or independent current-pose PNG. Original editor selection
handles, delayed image refresh, missing-resource behavior and any nondefault
fixed-size setting remain unobserved. Natural PNG dimensions for Region visual
bounds is now a reference-supported correction candidate; updating authored
transforms or auto-resizing Mesh vertices is not justified by this output.

## Predeclared optional single-PNG discriminator

No new render is run or implicitly authorized here. If the coordinator approves
one new current-pose PNG export of the **same** source, do not repeat JSON export.
Use the already verified current-pose export settings and omit editor bone
graphics. The active control green is opaque96×96 with
RGBA(55,198,100,255), centered(130,-100); weighted blue is inactive.

Before collection, competing predictions are:

- PNG-natural Region: yellow extent160×48, green96×96; extent ratios5/3 in X
  and1/2 in Y, common render scale; yellow world bounds as above.
- Raw-fixed Region: yellow96×96, green96×96; extent ratios1 in both axes.

Measure solid-color interior bounds independently, allowing edge rasterization
only; report scale/extent residuals and actual output hashes. This would settle
the original rendered pose extent, not automatically its editor handle bounds
or the path-field gesture. A new native/UI artifact after correction must then
match the reference geometry before release. Mesh UVs/topology/weights/all local
coordinate bits and unrelated Region transforms still require preservation.

## New render collected once: stored-size hypothesis confirmed

After both workers recorded the predictions above, the coordinator authorized
and collected exactly one current-pose PNG. Source537d was unchanged; no JSON
rerun occurred. UI aggregate: `analysis/f222-path-size-render-check.json`.
Independent DATA aggregate: `analysis/f222-path-size-data-check.json`, SHA256
`b854c05dbf4d95563dbabf97442f3eaa2aaa2ecc10345c0b55400385aa37236c`.

The DATA checker independently reconstructs PNG chunks/CRCs, zlib scanlines and
all five PNG filters using Python stdlib, without PIL or the UI worker's
measurement routine. It verifies source, prediction, settings and receipt hashes
before measuring exact RGBA colors. It sends zero original commands/inputs.

The PNG SHA256 is
`def2ea61fd75e01d75d5032dee89bb165264dd059701856303926d7f809f5519`,
size1424×1104. Yellow exclusive bounds are(0,0)..(384,384), green bounds
(1040,720)..(1424,1104). Each color has exactly147,456 fully opaque pixels.
The only alpha values are0 and255; no edge tolerance is needed. At the verified
4× scale, **both rendered Regions are96×96**. The predicted yellow640×192
natural-PNG rendered extent is decisively rejected.

This supersedes the prospective natural-render correction: original4.3.26
current-pose image export follows the stored Region96×96 shape, agreeing with
the current FBones viewport policy for this file. Its runtime JSON still reports
natural PNG160×48 with unchanged scales. These are different observable output
contracts. Preserve the existing JSON discrepancy report and archive unchanged;
do not falsely rename it runtime geometry parity. Conversely, do not change
editor geometry to natural PNG size based on JSON metadata alone.

The paired DATA/UI conclusion supports proceeding with the resource-only,
stored-geometry path implementation under these explicit evidence limits. It
does not prove the original GUI's immediate Image path authoring gesture,
save-time metadata rewrite, selection handle bounds or broader hidden options.
Inactive weighted Mesh render behavior is not present in this PNG; its raw and
runtime geometry/binding validation remains independent evidence.

## Release read-only audit and linked aggregate

The release review re-read the current native preflight/setter, DTO raw-path
field, store vertex-selection preservation and inspector field handling. No
new material source issue was identified; product and delivery pointers were
not modified. The independent snapshot checker was rerun against existing
files only, and the separate DATA PNG decoder was rerun without an original
invocation; its report hash remains `b854c05d…37236c`.

`analysis/f222-path-original-check.json` now links the separate UI/DATA render
reports and hashes. Integrated aggregate SHA256:
`7f4ddb96d81b169b9b2e608bcffad1051d0212c4f7dacf799325ab5762d9cefb`.
Its JSON status remains `STRUCTURAL_PASS_RUNTIME_GEOMETRY_DIFFERENT`, and
`allOriginalRuntimeGeometryEquivalent` remains false. A separate nested
`PASS_STORED_REGION_RENDER_BOUNDS` result records96×96 current-pose image
agreement. The JSON-only09512d report and initial423200 report remain archived
byte-for-byte; the integrated report does not relabel either as runtime parity.

Release scope remains the new two path edits, two Regions, one inactive weighted
Mesh, portable image resources and the single controlled render. There is no
new original GUI path-authoring claim, no zero-column evidence in this particular
file, and no broader constraint/clipping/rendering parity assertion. Original
commands observed are one prior JSON export plus one separately authorized new
current-pose PNG export; all independent checkers invoke the original zero times.
