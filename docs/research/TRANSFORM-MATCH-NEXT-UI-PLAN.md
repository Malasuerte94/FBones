# Next F308 Match observation: Local source to World targets

2026-10-29, **plan only**. No original launch, input, CLI command, fixture
generation, test/product edit or accepted-batch rerun is performed here. The
coordinator owns a later collection and numerical prediction freeze; the DATA
worker has independently reviewed the proposed discriminator frames. Existing
user-owned windows remain excluded, including91796.

## Gap and minimum new actions

The accepted eight actions cover Local/Local, World/World, reversed Local target
order, and sparse World-source/Local-target. Their files and captures remain
accepted; do not repeat them. The missing direction is
**localSource=true, localTarget=false**. It must not be implemented by assuming
that mixed spaces are symmetric.

The minimum new observation is exactly **two distinct Match actions** on fresh
copies of one newly authored Local/World baseline:

1. Offset-header Match, then save its independent result.
2. Properties-header Match from an untouched baseline, then save its independent
   result. Never chain this after the Offset result.

These resolve the missing direction for a bounded zero-mix, nonadditive,
six-identity-link fixture. They do not resolve manual endpoint edits, general
rounding, Additive, singular transforms, evaluated constraint order or partial
mixes. They are not a promise of complete Match parity.

## Proposed new fixture

Reuse the **geometry recipe**, not the accepted result, of the prior reflected
World/World source. Change its source/target flags to the missing direction.
The shared nonuniform/reflected parent makes local and world frames distinct.

| Bone | Parent | Position | Rotation | Scale X/Y | Shear X/Y |
| --- | --- | --- | ---: | --- | --- |
| root | none | 11,-9 | 23 | -1.3,.8 | 7,-12 |
| source | root | 13,-7 | 31 | 1.2,.8 | 0,17 |
| firstTarget | root | 70,35 | -25 | .9,1.3 | 0,-11 |
| secondTarget | root | -40,15 | 80 | 1.5,.6 | 0,9 |

Use ordered targets `[firstTarget,secondTarget]`, all six mixes0, Additive=false,
Clamp=false, six identity mappings with initial0..1 runtime ranges and all24
stored editor cells absent. Keep old offsets nonzero in channel order
Rotate/X/Y/ScaleX/ScaleY/ShearY: `[7,11,-13,.2,-.1,19]`. Store actual canonical
f32 bits in the recipe manifest; these decimal labels are not a bit prediction.
No image resources or animation are needed for this bone-only discriminator.

Before any Match, the DATA worker must independently compare the newly saved
original baseline with the new authored source: four bones/channels/world
matrices; source and ordered target IDs; both Local flags; six mixes/offsets;
runtime link order/ranges/scales;24 nullable cells and other persistent fields.
Editor metadata differences from a normal save must be classified rather than
mistaken for Match changes. Preserve the baseline immutably for both branches.

## Exact controls and guarded input plan

Existing exact4.3.26 captures in `TRANSFORM-MATCH-UI-4.3.26.md` establish the
controls: select the Transform constraint in Tree; inspect Source and ordered
Targets; check the **source-side** Local checkbox is on and the **target-side**
Local checkbox is off. Offset and Properties are separate foldouts with
different Match buttons. Both are enabled in the observed zero-mix profile.
Opening a foldout/choosing Tree selection must not author another field.

Do not reuse historical process IDs/handles or previous screen coordinates.
Any future collector must have one freshly owned original4.3.26 instance and
record process ID/start time, executable path/hash, active package version/hash,
window handle ownership and the expected **new own** project caption. The
launcher executable's version is not by itself proof of editor patch4.3.26.
Source files, output folders and basenames must be own research copies.

Immediately before every input, verify the ledger identity, current caption,
expected source state and unchanged captured window rectangle. Original control
layout does not scale uniformly with window resizing. Use a new capture after
foldout or scroll changes and identify the intended header, not a hardcoded Y
coordinate from another fixture. Previously reliable explicitly targeted
background controls may be reused only when their post-action readback is
verified. Native pointer/keyboard gestures require the existing foreground and
occlusion guards; no Alt, AttachThreadInput, focus retry or user-window takeover.
A failed guard is a measurement limit, not permission to bypass it.

For each branch, capture the clean before inspector, the clicked button identity
and the resulting controls/title. Save only its own mutable file, wait for a
clean title and stable size/hash, then copy to a uniquely named immutable after
stage. Raw before bytes must match the trusted original baseline for that
branch, with a receipt that only selection/foldouts intervened. A dirty title
alone does not establish a successful action or save.

## Predictions to freeze, not assume

The following are **named hypotheses** motivated by accepted samples and the
paired static audit. They are not newly observed Local/World behavior. Before
collection the coordinator/DATA worker must freeze the relevant formula outputs,
parameter bits, predicted changed/unchanged columns and source hashes in a
machine-readable file. Do not choose the formula after inspecting the result.

### Offset Match

Predeclare competing translation frames rather than generalizing the successful
World/World inverse:

- Target world origin minus source authored local translation: approximately
  `(-86.15096,-20.01444)` for this recipe.
- Target world origin transformed through the source's **local affine** inverse.
  This is a different hypothesis with a different origin/basis.
- Target world origin transformed through the source's **world affine** inverse,
  approximately `(60.43446,8.68428)` in the accepted World/World fixture.

Give each candidate an explicit matrix/frame definition and computed f32
values; an inverse without a stated frame is not a prediction. Reflected target
scaleX versus positive local source scaleX and target shear beyond180 degrees
also discriminate signed-scale and angular-wrap choices. Keep those alternatives
named: current independent world extraction is close but not bit-exact, and its
small errors must not become a widened tolerance or claimed recovered formula.

The prior eight actions motivate an **invariant prediction** that Offset Match
changes six global offsets only, leaving bones, mixes, spaces, links/runtime
ranges and24 cells unchanged. If the new action differs, record that new result
instead of silently forcing it into the old invariant.

### Properties Match

The independently testable separability hypothesis is:

- Source From starts match the accepted Local-source values, approximately
  `[31,2,6,1.2,.8,-73]`, despite the World-target choice.
- Target To starts match the accepted reflected World-target extraction from
  the first ordered target, approximately
  `[-136.063995,-73.150963,-27.014441,-1.194610,1.072600,208.188049]`.
- With six identity links, their existing displayed spans are retained, all24
  cache cells become present, and link inventory remains unchanged. Quantized
  endpoint spans may produce slightly nonunit runtime scales.

These values are recipe-specific hypotheses; shear presentation, signed scale
and rounded endpoint bits are not inferred facts for the missing direction.
Also freeze the mutation boundary: prior Properties actions preserve global
offsets, all bone channels/world poses, zero mixes, flags and ordered targets.

Independently compare the actual resulting cache/runtime relation for every
route, using the already demonstrated21-route f32 relation as a predicted check:
From.offset=sourceStart, To.offset=targetStart, To.max=targetEnd, and
`To.scale=f32(f32(targetEnd-targetStart)/f32(sourceEnd-sourceStart))` where
defined. This does not mean the runtime reads the editor cache or settle manual
range editing. Retain all cells, including signs/partial presence; do not
regenerate them from runtime values for comparison.

## Provenance and acceptance record

Each new branch needs recipe/source/baseline/before/after hashes, exact installed
reference identity, guarded input/capture receipts, stable-save evidence and
independent whole-field comparison. Record original GUI actions separately from
CLI exports or save operations; a completed helper is not an observed result.
Only the coordinator may decide if a new export is necessary for verification;
this plan requests no repeat of the accepted JSON/static batches.

Use a NEW private directory and new sanitized aggregate for these two actions.
Do not overwrite the accepted eight-action report or erase a failed collection
attempt. Reports must distinguish direct UI/saved-data observations, documented
behavior, numerical hypotheses and unknowns. Existing unknown original metadata
must remain protected; never modify user projects or relax the canonical guard
to make a reference file editable.

The new typed24-cell preservation and read-only Saved ranges UI provide storage
and inspection groundwork. They do not replace the original Match buttons being
studied here. After these two results, reassess the remaining algorithm gates
explicitly; do not mark F308 complete merely because all four space combinations
have a sample.
