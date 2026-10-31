# F308 full authoring implementation readiness

2026-10-29. Read-only product audit and independent forward arithmetic over
the ten accepted Match observations. No original invocation, production edit
or test-suite run. This proposes the complete two-button/range-authoring
contract; it does not replace that goal with read-only inspection or a
local-only substitute. Coordinator approval and paired DATA/UI handoffs still
precede dependent code.

## Decision

**Both Offset Match and Properties Match can be implemented as functional native
operations now under one explicit arithmetic/sampling policy.** Lack of
bit-exact reconstruction of every newly computed float is not, by itself, a
reason to leave both buttons absent. The user's requirement for correct binary
structure and unchanged-data preservation does not impose a universal promise
that every new trig-derived scalar must reproduce proprietary instructions
bit-for-bit.

There remain real semantic choices: evaluated sampling stage, reflected/channel
conventions, span resolution, fan-in, empty/zero spans and manual clear behavior.
Those must be stated before implementation, checked against every already
observed case and labeled when unobserved. Numeric tolerance cannot excuse a
wrong mutation, first target, space, sign/90-degree convention or route order.
The ongoing finite manual probe is valuable for the **range-edit coupling**
contract; it need not hold an otherwise recorded Match policy permanently
behind an unavailable editor-handler decompilation.

## Three different accuracy requirements

| Data/action | Required property |
| --- | --- |
| Load/save/history and fields untouched by an edit | Exact original bits/nullability/ordering, complete canonical reserialization and unknown-profile protection. No numerical tolerance here. |
| Newly authored range value | Exact finite f32 bits chosen by the user/native constructor, with explicit null distinct from0/−0; coherent runtime changes must be atomic. |
| Newly computed Match result | Declared deterministic finite arithmetic, correct observed operation/space/channel conventions and meaningful numerical behavior. Compare with accepted original actions at predeclared tolerances; do not call approximate computation bit-exact parity. |

The earlier fixed arithmetic audits reject exact endpoint/Offset bits, with
reported residuals around4.6e−5 and4.9e−4. Their **bit-exact hypothesis** failed;
that does not establish an unusable geometric result. Conversely, small scalar
errors can amplify through a tiny source span, strong map or large transform,
so scalar closeness alone is not adequate acceptance either.

## Important forward check: Match is not proven to preserve pose on activation

Private independent helper/result:
`transform-authoring-readiness/forward.py` and `forward.json`, result SHA256
`301476fe412ffbc22720383e4b236cd2a519ef91a40e8806a9541a2fe3fe2bba`.
It reads actual accepted before bones and actual original AFTER constraint
fields. It hypothetically sets destination mixes to1 **in memory** and forwards
the current independently implemented/documented runtime mapping equations.
It imports no production evaluator and changes no source. This is **not** an
original activation observation and does not identify a solver defect by itself.

The local/local Properties sample is decisive:

| Channel | Source authored | Retained global offset | Original matched From start | Original matched To start | Hypothetical full-mix mapped result | First target before |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Rotate |31|7|31|−25|−18|−25|
| X |13|11|2|70|92|70|
| Y |−7|−13|6|35|9|35|
| ScaleX |1.2|.2|1.2|.9|≈1.1|.9|
| ScaleY |.8|−.1|.8|1.3|≈1.2|1.3|
| ShearY |17|19|−73|−101|8|−11|

Local Properties source translation subtracts the **existing** global X/Y
offsets:13−11=2 and−7−(−13)=6. But runtime From translation adds those offsets.
Therefore it is not justified to call this an inverse that ensures no movement.
For identity ShearY the90-degree shifts on the source and destination endpoints
cancel; the remaining19-degree change comes from the retained global shear
offset. Changing runtime source shear from17 to−73 to force an interpretation
would alter already accepted evaluator semantics. Cross-property shear routes
must be considered separately, not inferred from identity cancellation.

Selected full-mix forward results using **actual** original Match fields:

| Accepted action | Maximum first-target world-origin change from before | Maximum basis change |
| --- | ---: | ---: |
| Offset local/local |0|0|
| Properties local/local |28.73715|.64553|
| Offset reflected world/world |.0000063|1.44176|
| Properties world/world |25.50390|.36811|
| Offset reversed local/local |≈0|≈0|
| Properties reversed local/local |28.73715|.22673|
| Offset sparse world/local |45.54750|2.23555|
| Properties sparse world/local |39.84998|1.76911|
| Offset local/world |.0000021|1.72051|
| Properties local/world |26.00001|1.60114|

These large differences are **not** the tiny computed-Match rounding residuals.
They show why a blanket “activate after Match and preserve the old first target”
assertion would be an invented requirement. The original observations prove
which fields the buttons authored while mixes0, not that every activation
reproduces the old target. Do not repair these original AFTER fields, invert
all offsets, change the runtime solver or advertise a no-jump promise from this
check. An original active-after-Match observation would settle that additional
behavior, but no accepted action should be repeated merely to obtain it.

## Concrete native operation boundary

Proposed typed semantic operations, names subject to coordinator integration:

- `matchTransform {id, section: 'offsets'|'properties'}` with outer current
  expectedRevision and a frozen native pose epoch.
- `setTransformRange {id, channel, side:'source'|'target', edge:'start'|'end',
  bits:u32|null}`. This is an intentional single-cell authoring action, not
  a writable echo of `editorRangeBits` in generic constraint updates.

Resolve stable constraint/source/target IDs natively. First **stored ordered**
target is authoritative, independent from selected bone/Tree/DOM order. Stage
the complete intended constraint result, validate all finite/runtime/profile
guards, then commit one history entry. Failure/no-op must not consume history
or partially change ranges/routes; unrelated bones, bindings, attachments,
other constraints and persistent ordering stay bit-identical.

Offset Match changes six offsets only, including hidden/unmapped channels.
Properties Match changes runtime From/To values and intended nullable cells
together; it preserves global offsets, mixes, flags, source/ordered targets,
link inventory and bones. No persistent Match flag or transient physics state
belongs in the file. Existing generic Transform updates must continue preserving
native range bits; they must not become an unrestricted range write interface.

## Evaluated-pose authority requires a real context path

The native evaluation cache already contains exact revision/document/epoch,
full authored/applied local channels and published world matrices. But
`Session::geometry_poses` currently returns only `Vec<Pose>` world geometry,
and `edit_impl` rejects an epoch for ordinary nongeometry edits. Simply adding
a Match enum and passing existing world geometry is insufficient for local
applied channel sampling.

Provide a distinct native **evaluated authoring context** for Match: validate
the immutable cache token and clone needed local/world values while holding
the Session revision lock, then compute/apply the staged semantic action.
Do not classify a nongraph edit as geometry merely to bypass the epoch guard,
send client PhysicsState/whole poses, recompute against a newer asynchronous
frame, or reconstruct local channels through a nonunique world inverse.

Recommended explicit initial policy: sample the current complete native frozen
frame's applied-local values for Local spaces and published world matrices for
World spaces. This matches displayed evaluated authority, but the exact original
pre/post-constraint Match sampling stage is **unknown**. Prefix-before-selected
evaluation is an alternative only if separately chosen and documented; do not
silently switch based on mix or make the selected constraint disappear during
sampling. Neither choice is established by the ten mix0 fixtures.

Match captures one context and performs one operation; release the temporary
preview hold on success/failure/cancel under existing lease rules. It does not
advance physics while computing. Updating a constraint can intentionally reset
the compatible physics layout as ordinary constraint edits already do; it must
not turn an explicitly paused Simulate intent back on or bake the sampled pose.

## Match arithmetic policy to record before code

Use one native finite-f32 construction policy, not per-case measured constants
or a decimal-precision search. Compute geometric quantities from the chosen
native context with a specified precision/cast order, then store finite f32
results. Display formatting must not modify persisted values.

**Offset Match:** existing observations support first-target/source differences
in their independently chosen spaces, with source-world inverse translation
for world/world and plain coordinate differences in the two mixed/local
directions. The editor-observed world representation uses signed determinant-X
scale, positive Y magnitude and relative-axis shear, unlike arbitrary applied
local decomposition. The local/world shear result requires a wrapped Offset
branch; Properties world shear remains unwrapped. Define one angular branch
policy, including ties, rather than applying a blanket shared wrap to both
sections. Source-world singular inversion must fail atomically with an explicit
message; a fabricated identity inverse is not a full-feature implementation.

**Properties Match:** sample source/target channel starts using their own spaces
and the observed local ShearY−90 editor convention; subtract old global X/Y
offsets on the source translation starts as observed. Preserve existing spans,
derive a shared source span from its first ordered destination when endpoints
are absent, and rebuild every affected runtime scale from final stored endpoints:
`f32(f32(targetEnd−targetStart)/f32(sourceEnd−sourceStart))`. That relation is
bit-exact for the observed27 routes; it need not force exact matching of every
new endpoint's proprietary rounding. Do not use an assumed “inverse all six
offsets” shortcut to make the activation appear stationary.

Prior cache/default resolution needs one explicit shared rule. A practical
policy is: explicit native cells override derived displayed values; absent
cells derive from current runtime records in stored route order. With repeated
destination channels, choose a recorded shared endpoint policy (for example
first incoming route as fallback) and update all linked routes consistently.
Coherent fan-in is now measured active runtime behavior; conflicting incoming
spans during Properties Match are still **unknown**. Do not independently write
different destination ranges into the same single24-cell buffer or let a loop's
last assignment define undocumented semantics.

Additive/nonzero mixes, active upstream constraints, singular/zero spans,
repeated Match with partial explicit caches, unlinked cells and conflicting
fan-in require labeled deterministic policies, not permanently missing buttons.
They are not exact parity claims. Where a finite result is undefined—zero
denominator, overflow or collapsed f32 span—reject the whole action. Do not
coerce NaN, reorder reversed ranges, clear hidden fields or weaken the codec.

## Editable24 ranges: full path, with manual evidence gate

The format already supports all24 independent nullable finite cells, including
partial/null/reversed/equal data and signed zero. No container/codec redesign
is required. Keep that permissive **storage** guard: a loaded equal range need
not be mathematically usable for a new division, and must still roundtrip.

The semantic single-cell command should:

1. Parse intended bits through `FiniteF32::from_bits`, or accept an explicit
   clear intent as null. Never echo unrelated values through JSON numbers.
2. Resolve effective paired endpoints/defaults from native state, following the
   accepted finite manual observation when available and explicit policy for
   still-unobserved branches.
3. Change the intended native cell and all mathematically linked runtime fields
   in one staged transaction: source edit updates its outgoing routes;
   destination edit updates every incoming route. Preserve other cache bits
   unless the operation contract deliberately requires materializing peers.
4. Validate finite results; retain the previous full state on error. All24 cells
   remain representable; unmapped editing/default/link creation must have a
   declared meaning rather than an ignored clickable field.

The UI should expose six rows/four endpoint cells with stored-versus-derived
absence understood, and route numeric edits through this semantic command.
Focus/folding/ordinary blur must not materialize missing cells. A single edited
field must not create an independently editable shadow inconsistent with the
runtime mappings. Clearing, equal spans and fan-in peer reconciliation remain
the genuine pending manual probes, not a demand to reverse engineer decimal
formatting before enabling any authoring.

## Pre-code numerical acceptance proposal

Freeze these checks **before** implementing the arithmetic; this is a proposed
acceptance contract for coordinator approval, not a retroactive pass:

1. Exact mutation boundaries and bitwise preservation above on all ten accepted
   actions, plus first ordered target and mapped/unmapped/null pattern. Confirm
   the27 endpoint/runtime relations using final native f32 cells.
2. Compare computed results against actual original AFTER fields through a
   downstream differential projection, **not against the untouched BEFORE
   target pose**. Activate identical mix/channel configurations in cloned
   reference-result and computed-result scenes. Retain origin≤.25,
   basis≤.009 and local16-unit endpoint≤.25 world bounds from the new measured
   active graph. The actual original AFTER fields are the coefficient reference;
   this differential projection bounds computation error and is not a new
   original active-Match observation.
3. For Properties, additionally compare mapped effects at each reference range's
   source start, midpoint, end and current sampled source value. This catches
   span amplification rather than approving small endpoint errors in isolation.
   Use the same fixed geometric bounds; no post-result tolerance widening.
4. Include nondefault explicit/partial caches, reversed spans, near-zero and
   zero/overflow rejection, reflected parents, all four spaces and an active
   mixed graph under the declared sampling policy. Those synthetic cases test
   internal correctness/atomicity, not original unobserved parity.
5. Actual both-header UI actions, one Undo/Redo, draft/Enter/clear/Save flush,
   stale epoch/revision rejection and canonical Save/Close/Open. One new own
   UI-authored result can receive original acceptance without repeating the
   ten Match actions or old oracle batches.

The two active sibling/fan-in PNG cases already strengthen runtime mapping
confidence; they do not replace this authoring check. Preserve original scalar
residual reports alongside geometric results, so approximate computation is
visible. If a chosen policy passes these checks, ship both functional buttons
and the implemented range-authoring profile with honest limits. Keep the full
F308 goal active until its remaining manual/interaction acceptance is handled;
do not make proprietary float-bit identity or endless input adapters the sole
reason to leave the requested feature unusable.
