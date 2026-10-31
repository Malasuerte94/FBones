# Transform Match authoring: both functional controls

2026-10-29. UI gate before dependent production code. Reuses the ten accepted
exact4.3.26 Match actions and current typed preservation work. No new original
command/input, accepted-case repeat or product edit by this UI worker. The
coordinator owns implementation; native/math readiness is the paired audit.

## Proven controls and mutation boundaries

Sources: [original eight-action UI audit](TRANSFORM-MATCH-UI-4.3.26.md),
[paired DATA audit](TRANSFORM-MATCH-DATA-4.3.26.md),
[eight-action aggregate](../../analysis/transform-match-reference-check.json),
[two new Local/World actions](TRANSFORM-MATCH-LOCAL-WORLD-UI-RESULT.md) and
[their DATA aggregate](../../analysis/transform-match-local-world-check.json).
The ten actions cover separate Offset/Properties forks of Local/Local,
World/World under a reflected parent, reversed first-target order, sparse
World/Local mappings and Local/World identity mappings. All mixes were zero;
Additive was off. No old case needs recollection.

| Visible control | Directly proven authoring effect | Directly preserved |
| --- | --- | --- |
| Offset section-header Match | Replaces all six global offsets, including invisible sparse channels | Runtime mappings,24 stored range cells, mixes, spaces/flags, ordered targets and bone channels |
| Properties section-header Match | Updates runtime mapping offsets/max/scales together with mapped source/destination stored endpoints | All six old global offsets, mixes, spaces/flags, source/target identities, route inventory/order and bone channels |

The two local target-order experiments show that **both** actions use the first
stored ordered target. Neither averages all targets nor silently sorts them.
Both buttons are enabled at zero mixes and each accepted action dirtied the
original and survived Save. Separate headings/buttons matter: the observed
Properties action is not Offset Match followed by range filling.

Properties Match retains previous range spans in the sparse case, rather than
resetting every span to1. Shared-source destinations can have their runtime
scale recalculated, including a sign change. Reflected target ScaleX may remain
negative. Local source translation starts incorporate old translation offsets
in the observed examples; an unconditional “copy all six source channels” label
or frontend arithmetic would misdescribe the operation. Offset's angular wrap
and Properties' unwrapped shear presentation differ in the Local/World fixture.

The viewport remained unchanged in these zero-mix observations. That proves
neither a requirement nor a guarantee to preserve evaluated pose at nonzero
mixes. **Do not market either action as Keep pose**, and do not author bones or
change mixes to manufacture that property.

## Functional UI contract

Implement **both** controls in the existing inspector, next to Offset and
Properties headers. Compact visible text may be Match; accessible names and
tooltips must distinguish Match offsets / Match properties and explain sampling
from the source and first ordered target. Header-button activation must not
also toggle the foldout or submit another form. Mouse and keyboard trigger the
same action exactly once. Folding/opening/hover/selection alone never authors.
Keep the selected constraint and ordered Targets visible; opening a dedicated
Transform view must still act on its explicit stable constraint ID.

The native action owns pose sampling and all persistent arithmetic. Vue sends
the action/target identity and revision, not rounded displayed numbers, a
client-rebuilt24-cell buffer or a captured global selection after an await.
A pending focused field must be deliberately committed and its flight awaited
before Match samples; if its draft is invalid or its commit fails, retain the
draft/error and stop that Match action. Do not silently discard a legitimate
pending edit or let Match sample an obsolete revision. Capture document and
constraint identity before awaiting, revalidate afterwards, and cancel a stale
request instead of applying it to a newly selected constraint.

During the action, disable its competing authoring controls to prevent duplicate
commits. Use the established error ownership and Save-await workflow. Success
refreshes the authoritative inspector values, including the read-only Saved
ranges. Do not preserve stale local drafts over values intentionally replaced
by Match. Keep unrelated inspector drafts intact. Escape/failure must not invent
a second history transaction or leak an error onto another constraint.

**Explicit FBones transaction policy:** one actual change is one Undo item;
Undo/Redo restores all affected runtime fields and stored presence/bits together.
A genuine no-op creates no revision/history entry. Stale/invalid/nonfinite
failure changes nothing. This is required application behavior; original Undo,
error wording, focus restoration and repeat-click no-op behavior were not
observed in the ten actions. Native Save/Close/Open must retain the result and
leave authored bones, source/target order and unrelated constraints unchanged.

## Broad implementation policy, with honest evidence limits

The requested deliverable is two functional actions across the supported
canonical Transform profile, not a Local/Local-only button. Earlier research
notes recommended restricting unmeasured cases while data transport was unsafe;
those were evidence/engineering recommendations, **not user permission barriers**.
The user has not required every computed float bit to equal the proprietary
editor before useful authoring may ship. Preserve the measured behavior and
make remaining choices explicit, consistent and testable without a parity claim.

| Area | What is established | Required implementation distinction |
| --- | --- | --- |
| Four source/target space combinations | All four represented among the ten actions | Resolve each side in native space; do not reject World merely because exact endpoint rounding is not recovered |
| First target | Both reversed local actions discriminate first stored target | Preserve order; invalid/missing first target fails atomically, never picks another silently |
| World decomposition/float conversion | Existing observed values and small residuals from several fixed arithmetic models | Choose one documented native finite-f32 conversion/decomposition policy; compare semantic errors honestly, not a claim of exact proprietary quantization |
| Nonzero/partial own mix and preceding constraints | Not observed for original Match sampling | Native must explicitly choose the evaluation stage and whether the current constraint is excluded; sample source/first target coherently once, not one before/one after changing settings |
| Additive | Not observed for either original button | Implement a named additive interpretation consistent with the supported solver/profile; label it FBones policy and test it, rather than implying exact original matching |
| Singular/reflected transforms | Reflection appears in measured fixtures; singular sampling is not observed | Preserve signed/reflected values under the chosen policy; only require an inverse where the formula actually needs one. Undefined/nonfinite results fail atomically; do not blanket-reject every zero scale |
| Sparse/null ranges | Offset leaves24cells intact; Properties fills mapped sides and retains spans | Do not equate absence with0, alter untouched hidden data, or invent routes; use authoritative native resolved spans and synchronized runtime/cache output |
| Live Physics/geometry epoch | Original sampling lifetime unknown | If current evaluated pose is sampled, use one authoritative frozen native snapshot/epoch, await it and release temporary holds without changing Simulate intent. Never bake transient pose into authored bones |

The paired [native/math readiness memo](TRANSFORM-AUTHORING-IMPLEMENTATION-READINESS.md)
proposes sampling the **complete current authoritative frozen frame** (applied
local channels for Local, published world matrices for World), including all
constraints and transient Physics already represented in that frame. It does
not exclude the current Transform. This is a concrete FBones policy proposal;
original stage remains unknown. Additive/nonzero-mix cases use that same sampled
space formula without a fabricated inverse to preserve pose. ROOT must finalize
the precise float/span/fan-in and degenerate behavior before native code.

Forward-evaluating accepted after-fields at mix1 in our own math is a diagnostic,
not a new original mix1 render observation. It cannot be promoted to original
pose-jump parity. The absence of any demonstrated keep-pose guarantee is already
sufficient reason to avoid that UI promise.
No arbitrary fit, copied measured output constants or display-decimal OCR is a
replacement for consistent computation. Existing exact bit matches remain
valuable regression evidence; the unresolved residuals are reported rather than
used as a blanket implementation prohibition. Manual endpoint/clear behavior is
a separate ongoing observation and is not invented by implementing Match.

## Acceptance needed for implementation

Reuse all ten immutable original before/after results as comparison inputs,
keeping exact-preserved fields exact and recording numerical residuals separately.
Add new **FBones** native/UI checks for both buttons in all four spaces,
nonzero/partial mixes, signed/additive and two ordered targets, sparse fan-out/
fan-in, nullable ranges, degenerate/error boundaries and stale revisions. These
are implementation checks, not new original claims or repeated oracle runs.

Actual UI must exercise each real header button, preserved selection/stable ID
in a dedicated view, a pending valid/invalid numeric draft, one Undo/Redo,
no-op and native Save/Close/Open. Assert which fields change and which do not;
do not require a nonzero-mix pose to stay unchanged. Preserve normal user
windows and use an own native test instance. F308 remains active for unmeasured
original semantics even when these two useful actions are delivered.


## Later sampling lead — not exact-patch evidence

A newly surfaced official historical4.3.19-beta changelog mention of Match and
unconstrained sampling remains a documentation lead only. AGENTS excludes older
editor behavior as an inference source. It neither proves nor disproves the
complete-current-frame proposal above for4.3.26. ROOT requests a future directly
observed nonzero-mix4.3.26 discriminator before finalizing sampling policy; the
zero-mix ten-action corpus alone does not resolve that choice. The current
finite manual endpoint probe contains no Match action and must not be repurposed
as that discriminator.
