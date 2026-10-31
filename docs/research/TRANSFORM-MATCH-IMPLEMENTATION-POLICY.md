# Transform Match: native implementation policy

Current sampling correction (2026-10-30): both actions sample the ordered
prefix. Exact active Local/Local observations prove48 Properties scalars and
6 Offset scalars bit exact. See the
[Properties result](TRANSFORM-MATCH-ACTIVE-PROPERTIES-SAMPLING.md) and
[Offset result](TRANSFORM-MATCH-ACTIVE-OFFSET-SAMPLING.md). Prefix versus all
except selected with suffix, other spaces/additive/Physics remain unmeasured.
The paired [suffix source plan](TRANSFORM-MATCH-SUFFIX-SOURCE-PLAN.md) is next.

2026-10-29, before production implementation. Paired reference gates are
TRANSFORM-MATCH-AUTHORING-{DATA,UI}-HANDOFF.md and the independent behavior/math
readiness audit TRANSFORM-AUTHORING-IMPLEMENTATION-READINESS.md. All ten accepted
original actions are reused; no older editor behavior is inferred. This policy
implements both actions across the supported canonical profile, without claiming
recovery of proprietary arithmetic or unmeasured sampling branches.

## Authority and sampling

A pure native operation receives the complete constraint and one coherent native
Evaluation. It returns a staged constraint; it never mutates bones or history.
The session integration validates document/revision/frozen epoch and retrieves
applied-local and world values together. Local uses applied channels, World uses
the precise native f64 matrix from that same evaluation. The caller evaluates the prefix from precise frozen authored channels and
scratch cached Physics while retaining complete scene validation/layout. None
stays None; other modes use Pose without advancing the clock. Applying that
rule beyond the measured active Local/Local graphs is a uniform FBones policy.
Keep this decision at the caller so stronger reference evidence can refine it
without replacing the authoring algorithm. A historical beta changelog is a documentation lead,
not exact4.3.26 proof and not an implementation dependency.

First stored ordered target is authoritative. No averaging/sorting or selection
substitution. Offset changes six offsets only; Properties changes ordered runtime
mapping values and mapped editor endpoints only. Other fields, nullability,
flags, orders and all original values outside those mutation sets remain exact.

## Arithmetic

Use the existing independently written native f64 geometric math and a single
finite-f32 cast for every newly stored scalar. Do not add decimal quantization,
copy observed constants or select a different helper by fixture. Offset uses
independent-space differences; World/World translation uses the inverse source
matrix, other directions use direct coordinate differences. World extraction
uses matrix-X heading, determinant-signed X magnitude, positive Y magnitude and
unwrapped relative axis angle for the editor channel convention. Local editor
ShearY is applied shearY minus90. Offset rotation/shear differences use the
existing signed angular wrap; Properties sampled angles remain unwrapped.

Properties source X/Y subtract the retained global translation offsets, as
observed; other source channels are sampled directly. Target starts sample the
first target independently. Do not inverse all offsets or promise Keep pose.
Additive and Clamp remain stored unchanged. The same parameter-matching action
applies in additive mode; no invented pose-preservation compensation is added.
That additive action policy is FBones behavior, not an observed original case.

## Ranges and fan-in

For each effective old endpoint use its explicit editor cell when present,
otherwise derive it from runtime mappings in stored order. A source's absent
end derives from its first destination's span/scale. A destination's absent
endpoints derive from its first incoming route. Missing/unlinked endpoints use
0..1 as the explicit FBones display/default policy. A zero first-route scale
cannot determine a source span; use the default span1 only when no explicit
source-end evidence resolves it. Do not silently use a different later route.

Preserve each resolved old span while moving starts to sampled values. Compute
stored ends in f32, then every linked runtime scale from the final endpoints:
f32(f32(targetEnd-targetStart)/f32(sourceEnd-sourceStart)). Shared destination
channels receive one sampled range, with first incoming fallback; all incoming
routes synchronize to it. This deterministic conflicting-fan-in policy is
explicitly unobserved in original. Keep route inventory/order unchanged. Fill
mapped source/target cells; preserve unrelated cells exactly.

Any required inverse, nonfinite result, overflow or collapsed f32 denominator
fails the whole operation atomically. Do not fabricate an identity inverse or
change permissive storage recognition: an existing equal range still roundtrips.
Zero scales that do not require an inverse are not blanket-rejected.

## Acceptance before integration

Use all ten original before/after fixtures as independent numeric/mutation
oracles. Exact preservation and mutation boundaries have no tolerance. Record
new scalar residuals honestly; do not call failed bit equality recovered parity.
Compare downstream effects of computed versus ACTUAL original-after fields,
using the retained .25 world-origin / .009 basis / .25 at16-unit endpoint bounds.
Exercise original source-start/mid/end/current mapping probes as well, to expose
span amplification; report mapping errors separately and reject wrong channel,
angle branch, target/order or cache-presence semantics regardless of residual.
Do not compare with the BEFORE pose under a fabricated no-jump requirement.

Add independent FBones checks for repeated/no-op actions, all four spaces,
partial/nonzero mix, additive/reflection, coherent/conflicting fan-in, partial
cache, singular/zero/overflow and immutable inputs. Native transaction/UI tests
must additionally prove stale failure, one Undo item, draft flush, explicit
constraint identity, Save/Close/Open and no transient-bone baking. These are
implementation checks, not new original observations. Manual range edits remain
a separate operation awaiting the finite probe; this policy does not invent
its clear/equal/cache-materialization behavior.
