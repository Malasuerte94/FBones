# F308 Match authoring: DATA implementation gate

2026-10-29. Reuses ten accepted exact4.3.26 button actions, current typed codec,
and independent fixed arithmetic audits. No new original command/input, oracle
repeat, production edit or fit. Paired controls/interaction contract is
[the authoring UI handoff](TRANSFORM-MATCH-AUTHORING-UI-HANDOFF.md); native worker's
[readiness proposal](TRANSFORM-AUTHORING-IMPLEMENTATION-READINESS.md) supplies the
explicit computation/sampling policy for coordinator approval.

## Ten direct actions and what they establish

The immutable [eight-action aggregate](../../analysis/transform-match-reference-check.json)
and [two Local/World actions](../../analysis/transform-match-local-world-check.json)
cover separate Offset/Properties forks in Local/Local, reflected World/World,
reversed ordered Local targets, sparse World/Local and Local/World. All use
zero mixes and nonadditive flags. No earlier batch needs recollection.

| Button | Direct authoring result | Mandatory exact preservation |
| --- | --- | --- |
| Offset Match | Replaces all six offsets, including sparse invisible channels | All bones, source/ordered targets, mixes, flags, runtime route fields/order and24 nullable cells |
| Properties Match | Changes mapped editor endpoints plus runtime From offsets/To offsets/max/scales | All bones, global offsets, mixes, flags, source/ordered targets, route inventory/order and unrelated constraints |

Reversed targets prove both actions use the **first stored ordered target**;
Tree/DOM/name order and averaging are wrong substitutes. World-source and
world-target selections are independent; mixed spaces cannot be implemented by
assuming symmetry. Sparse Properties Match preserves prior spans and can
reverse an old route scale's sign when reconciling a shared source. Reflection
can retain negative ScaleX. The observed local endpoint shear presentation is
shifted by−90; Offset and Properties angular branches are not interchangeable.
Local/World Properties starts match the corresponding accepted Local-source
and World-target starts independently in that new fixture.

The saved relation is bit-exact across the observed27 Properties destinations:
From.offset=sourceStart, To.offset=targetStart, To.max=targetEnd, and
`To.scale=f32(f32(targetEnd−targetStart)/f32(sourceEnd−sourceStart))`.
This is a measured authoring relationship, not proof that runtime reads the
cache or that every arbitrary loaded cache must agree with route records.
Source starts do not universally equal all six authored source channels:
existing offsets/space conventions participate in the observed values. A
simple “subtract/copy all six local channels” implementation would be wrong.

## Exact retention versus newly computed floats

There are three distinct contracts:

1. **Existing or untouched data:** preserve every finite f32 bit, null presence,
   signed zero, bone/source/target/route identity and order exactly. Load/save,
   history, ordinary updateConstraint, failure and stale rejection have no
   tolerance. Never regenerate a preexisting editor cache from runtime values.
2. **Explicit authored endpoint:** preserve the exact intended finite f32 bits
   selected by the semantic native operation. Empty/absent must remain distinct
   from0/−0. Generic DTO editorRangeBits remains read-only; it is not a writable
   echo that can overwrite24 cells during an unrelated edit.
3. **New Match arithmetic:** use one declared deterministic native finite-f32
   construction/decomposition policy. Exact proprietary world extraction and
   endpoint quantization remain unrecovered. A computed scalar need not match
   every original arithmetic bit to be useful, but this limit must be reported
   rather than called exact parity. Do not fit a decimal precision, select a
   different trig implementation per field or copy measured output constants.

The source-backed [fixed MathUtils audit](TRANSFORM-MATCH-MATHUTILS-AUDIT.md)
fails exact reconstruction:67/82 old endpoint values and68/83 route fields
match bits, with maximum residuals≈.00003052/.00004578; Offset8/18 match with
maximum≈.00048065. Its measured-start countercheck also fails, so trig changes
alone do not recover editor rounding. Those are explicit failed exact-bit
hypotheses, not permission to change untouched data or permanently omit both
functional buttons.

Freeze meaningful computational acceptance before implementation. Compare
computed AFTER coefficients against actual original AFTER coefficients, then
their downstream effects at source start/midpoint/end/current values under the
same mixes. The native worker proposes existing bounds origin.25, basis.009,
16-unit endpoint.25 world. This differential calculation is an own semantic
error check, not a new original active-after-Match observation. Tiny scalar
errors must not hide amplification by tiny spans/large scales. Preserve scalar
residual reports and exact mutation tests separately; never widen thresholds
after seeing failures.

## Authoritative native sampling and transaction

Match must receive stable constraint identity, current revision and one valid
native pose epoch. Local sampling needs the cached **applied-local channels**;
world sampling needs the **precise world matrices from that same native frame**.
The inherited-singular regression subsequently proved why the published f32
geometry matrix cannot be reconstructed as authoring authority: its determinant
became approximately+7e−10 where the precise frame's−6.94e−18 correctly rejects
the required inverse. The fix retains the complete precise evaluated frame;
public f32 geometry snapshots/epochs and inverse thresholds stay unchanged.
Before/fixed evidence is in
`analysis/transform-match-singular-authoring-repro.json` and
`analysis/transform-match-singular-authoring-fix-check.json`. This is an own mathematical failure contract,
not unobserved original singular behavior. The existing geometry-only
`Vec<Pose>` path does not supply applied channels. Provide a distinct evaluated
authoring context validated under the Session lock; do not reconstruct local
values via a nonunique reflected inverse, accept client Physics state or
sample source/target from different asynchronous frames.

The current concrete FBones proposal is to sample the **complete current frozen
frame**, including this constraint and preceding/later constraints and transient
Physics represented there. It does not hide the selected constraint. Exact
original sampling stage at nonzero mixes is unknown; all ten observations had
mix0. Declare this choice before code, share it across both buttons and every
space/additive combination, and do not claim a measured original stage.

Stage the full result before mutation. Offset changes only six offsets.
Properties atomically updates affected typed cache cells and ordered runtime
routes; it must not create/delete/reorder links or edit authored bones/mixes to
manufacture a Keep pose result. Both accepted buttons dirty/save their results,
but original Undo/no-op/error behavior was not measured. FBones policy is one
transaction for one actual change, no history for an exact no-op, full Undo/Redo
of runtime/cache presence and bits, and atomic stale/invalid/nonfinite failure.
Release the temporary preview lease without toggling explicit Simulate intent.
Never bake a sampled deformed bone, velocity or clock into the file.

## Explicit bounded choices still required

- Use first stored incoming/outgoing route only as a **declared fallback** when
  resolving absent shared endpoints. A24-cell table stores endpoints by channel,
  while runtime routes remain per edge; iteration's last assignment must not
  accidentally select an undocumented conflicting fan-in policy.
- Define signed world scale, shear/rotation branch, cast order, span derivation,
  additive/nonzero behavior and singular/zero-span rejection consistently.
  Only require inversion where the chosen formula needs it; preserve equal
  loaded ranges even if a new division from them must reject.
- Properties may intentionally replace mapped cells. Keep unmapped cells and
  all unrelated preexisting fields exact unless a separately recorded operation
  policy explicitly requires their change. Offset leaves **every** cell exact.
- Unknown clear/manual coupling remains separate. The ongoing finite6→10 probe
  has not yet produced an accepted numeric result at this gate; Ctrl+A merely
  attempts selection. Do not claim a manual rule from caret/transport success.

These findings support both functional Match actions under a finalized coherent
native policy, including all four spaces, without claiming exact proprietary
rounding or original nonzero/additive sampling semantics. F308 remains active
for manual ranges and broader original interaction verification after delivery.
