# Transform endpoint authoring policy

2026-10-29, before coding. The paired DATA/UI gates are
TRANSFORM-RANGE-AUTHORING-{DATA,UI}-HANDOFF.md. Their full functional scope is
accepted, with the following explicit FBones policies where exact original
interaction remains unmeasured. Reuse accepted observations; do not repeat them.

The native semantic intent is `setTransformRange {id,index,bits:u32|null}` with
expected revision and no evaluated-pose epoch. Native state resolves all24
endpoints; read-only resolved values join stored nullable bits in the view.
Vue formats values and sends one requested cell, never a reconstructed graph.

Explicit cells override runtime defaults. Source end uses the first destination
span/scale, destination endpoints the first incoming route; zero-scale fallback
span is1 and unlinked fallback is0..1. This resolver is shared with Match so
neither operation nor the UI creates a competing default formula.

For a mapped finite edit, hold other resolved endpoints fixed and materialize
all mapped-side peers, preserving existing explicit bits. Rebuild the affected
source-row closure with f32 arithmetic: source offset=start, destination
(offset,max)=(start,end), scale=(destinationEnd-start)/(sourceEnd-start).
A target edit affects all incoming source rows and each row's full fan-out.
Disconnected runtime rows and unmapped cells remain exact. Conflicting fan-in
uses the same first-incoming defaults and reconciles affected rows only.

Explicit Clear removes the requested presence, resolving its effective value
from current runtime defaults; leave that requested cell absent while other
mapped peers materialize. Empty text is invalid, not Clear. Reject a mapped
zero source span (including0/0), nonfinite input/overflow/collapsed f32 division
atomically; permit zero destination spans and reversed ranges. Dormant/unmapped
edits change only their requested cell and create no link. Exact same stored
intent is a no-op; untouched focus/blur must not materialize values. Requested
finite bits, including negative zero, are stored exactly.

These clear/equal/conflict/precision policies are not proved original gestures.
The V4 a→Escape→0 diagnostic establishes its saved linked result/materialization
only, not successful intended typing or universal Escape behavior. Preserve the
unknown original-process exit cause. The ten accepted Match actions remain the
separate arithmetic evidence, not a new manual-range oracle.

One action commits one native history transaction. Save/Match flush pending
fields, errors prevent Save, Escape cancels a draft without bytes changing.
Preserve unrelated bits, bones, bindings, slots, flags, global offsets/mixes,
source/ordered targets and route inventory/order. Stale/invalid actions change
no state/history/allocation. No setup-physics baking. All24 fields must be
functional, with native unit/transaction and actual UI/persistence checks.
