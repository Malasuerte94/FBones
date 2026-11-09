# Transform Match: native implementation policy

Current sampling correction (2026-11-09): both actions evaluate the complete
ordered constraint list and exclude only the selected Transform. Independent
exact4.3.26 Local/Local [suffix Offset](TRANSFORM-MATCH-SUFFIX-OFFSET-RESULT-2026-11-08.md)
and [suffix Properties](TRANSFORM-MATCH-SUFFIX-PROPERTIES-RESULT-2026-11-08.md)
observations supersede the historical uniform prefix policy. All six Offset
and48 Properties scalars are bit exact for those graphs.

Active Local-source/World-target [Offset](TRANSFORM-MATCH-ACTIVE-LOCAL-WORLD-OFFSET-RESULT-2026-11-09.md)
and [Properties](TRANSFORM-MATCH-ACTIVE-LOCAL-WORLD-PROPERTIES-RESULT-2026-11-09.md)
now select first-target/selected-exclusion in their measured graph; without a
suffix they cannot distinguish prefix from selected exclusion. World arithmetic
residuals remain explicit. Other spaces, World suffix scheduling, additive and
Physics sampling remain unmeasured; full compatibility is not claimed.

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
the precise native f64 matrix from that same evaluation. The caller evaluates the complete ordered scene, skipping only the selected
Transform, from precise frozen authored channels and a scratch copy of cached
Physics. Complete validation/layout and Physics indices remain intact; scratch
state and the evaluated pose never replace the cache or author bones. None
stays None; other modes use Pose without advancing the clock. Applying that
rule beyond the measured graphs is a uniform FBones policy.
Keep this decision at the caller so stronger reference evidence can refine it
without replacing the authoring algorithm. A historical beta changelog is a documentation lead,
not exact4.3.26 proof and not an implementation dependency.

First stored ordered target is authoritative. No averaging/sorting or selection
substitution. Offset changes six offsets only; Properties changes ordered runtime
mapping values and mapped editor endpoints only. Other fields, nullability,
flags, orders and all original values outside those mutation sets remain exact.
Both UI and explicit-ID Match require all six Mix lanes finite within0..1 after
pending-field flush. Extended authored values still roundtrip unchanged; the
shared capability guard blocks matching and explains why. This bounded FBones
capability policy does not establish an original extended-Mix numeric branch.

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
