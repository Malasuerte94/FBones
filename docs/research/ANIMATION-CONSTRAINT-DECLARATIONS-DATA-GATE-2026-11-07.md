# Constraint declaration provenance DATA gate — 2026-11-07

Before product changes. Question: are E's declaration-order differences an
unmodeled group/solver meaning, or separate known typed inventories? Reuse the
[static closure diagnostic](ANIMATION-E-STATIC-CLOSURE-DATA-2026-11-07.md),
[UI gate](ANIMATION-CONSTRAINT-DECLARATIONS-UI-GATE-2026-11-07.md) and current
ordered-constraint/Match evidence. No new original/Physics/Match/runtime probe.

## Direct retained exact4.3.26 graph evidence

E Skeleton11/tag44 references one known class108 group with40 unique members.
Reversing that group/tag5 member list yields the existing authored execution
vector. Skeleton arrays tag16/IK56 contain0, tag22/Transform65 contain10 and
 tag41/Physics121 contain30 references. They are disjoint, correctly typed and
cover exactly those same40 identities once. Every one of the40 constraints'
tag32 pointers references **the same tag44 group identity**. Its known field shape
and shared membership introduce no additional group semantics in this source.

The Transform declaration order, expressed as execution indices, is
`[12,18,16,14,13,11,19,17,15,10]`. Physics has another independently ordered30-index
permutation. It is not the filtered execution vector. Constraints retain their
primitive/f32 fields and bone identities; order differences in first-visit generic/
domain numbering are consequences of these inventories. Preserve this provenance
without changing runtime execution order, prefix sampling, Tree rows or key IDs.
No unseen original reorder/deletion gesture or numerical fidelity is inferred.

## Proposed typed persistence API and invariants

Propose `SceneWire.constraint_declarations: Option<WireConstraintDeclarations>`
with `WireConstraintDeclarations { ik: Vec<usize>, transform: Vec<usize>, physics:
Vec<usize> }`. Indexes address `SceneProject.constraints` (the execution vector),
never raw generic/domain indexes, names, or duplicated constraint objects.
`None` retains the current canonical filtered declaration order and old bytes.

Each vector must contain every current matching-kind constraint exactly once,
in range, with no duplicate/wrong-class/missing entry. The total retains128;
no type/constraint/binding/physics/member/depth/byte budget is raised. Capture only
known Skeleton16/22/41 reference inventories and only after validating their
membership against tag44. Normalize an exactly canonical table toNone so edited
model and reopened metadata agree. Noncanonical source order remains explicit.

Writer overrides **only Skeleton16/22/41** record traversal. Tag44/group5 remains
the reverse authored execution vector; each existing constraint's group32 still
resolves that same group. Do not sort execution or invent additional groups to
obtain equality. Unknown groups/membership/records remain guarded by full byte
reserialization equality. String-form provenance stays independent.

## Native lifecycle and canonicalNone transition

Map surviving declarations by before/after stable constraint IDs, pruning deleted
or wrong-kind IDs and appending genuinely new same-kind identities in the current
execution order. Preserve retained relative declaration order on execution
reorder, parameter/key edits, rename, resources and Save. Undo/Redo restores both
orders in one frame. Delete/recreate cannot inherit a retired declaration slot.
This deterministic creation policy is FBones policy, not an original gesture.

A canonical old project may have `wire=None`. Its first execution reorder must
preserve **before** semantic declaration order, then map it to after indexes and
materialize metadata only if that differs from the after canonical order. Deriving
it from the after vector silently loses the source declaration inventory.

Materializing an otherwise empty SceneWire is insufficient: canonical Bone12/tag28
strings share `bone-label`, while wire mode deliberately suppresses default label
sharing unless typed aliases preserve it. Thus the codec must provide validated
full canonical provenance materialization from the BEFORE project (known owner/
tag aliases, layout, scalars and inventories), not fabricate empty strings/layouts
or change unrelated identities. A bounded encode plus structural extraction with
forced provenance capture can do this; it must bypass only the ordinary canonical
fast-return/metadata stripping for that internal helper, then verify full bytes.
It must not remove semantic guards or retain an opaque graph/payload. Reuse an
existing Some wire value after validation. Native can avoid this extra work when
mapped declaration order already remains canonical. Measure actual history/DTO
costs at integration; no per-frame or pointer-event full-scene IPC is introduced.

## Isolated discriminating prototype

A NEW ignored format copy adds an optional exact-membership three-vector table
and changes writer traversal only at16/22/41. It includes the separately completed
known string-form codec and omits **only** bone-Bezier time monotonicity for this
static decode/encode diagnostic. All other capacity, finite, geometry, schema,
reference, equality and structural guards remain. It samples/authors nothing.

The complete E728346-byte payload reencodes exactly, with40 constraints and typed
inventory counts0/10/30. Root group, group pointers and tag44 encoding code were
unchanged. This proves static bounded persistence feasibility; it grants no
production reversing-time permission, full E admission or original acceptance.
Ignored `constraint-declarations-data-2026-11-07` pins the retained-graph query,
prototype source, exact patch, runner and positive result. Original/copy hashes
remain unchanged; private source names/paths/assets stay ignored.

## Minimum product acceptance before an admission claim

Use own interleaved IK/Transform/Physics fixtures with independent inventories.
Verify unchanged full payload/model and canonical oldbytes, exact membership
negatives, execution reorder with stable identity/key preservation, all supported
create/delete/parameter/rename paths, Undo/Redo, resource refresh and portable
Save/reopen. Include canonicalNone→noncanonical transition retaining default
string aliases, source lexical forms and scalar bits. Require complete expected
saved model/payload/envelope equality, legacy checks and four admitted-source
regressions. Production must still reject E's genuinely reversing curves until
independent effective inversion evidence establishes a separate supported policy.

## Approved format checkpoint

Coordinator consumed the String checkpoint and accepted this DATA/UI/native
contract before authorizing product declaration provenance. Format now has the
optional typed table, exact membership/class/canonicalNone validation, writer
overrides only16/22/41 and a public bounded `materialize_wire` helper. Forced
known capture bypasses only canonical early-return/metadata elision and then
requires complete validated payload equality. Tag44/group32 encoding is unchanged.
Existing Some wire values are validated and preserved.

Five own regressions cover all three kinds, independent declarations, default
Bone28 aliases/Event default-key links, complete intermediate materialization,
canonicalNone→noncanonical→canonicalNone exact model/byte recovery, malformed
inventories and source scalar/bounds/UTF markers. Focused98 Scene/16 default and
strict all-target Clippy pass. Four admitted source payloads remain exact; the
production decoder still rejects E.

A new ignored copy of this CURRENT product codec, omitting only its one bone-time
monotonicity predicate for static decode/encode, again reproduces E's entire
728346-byte payload exactly. No experimental declaration code is needed in that
copy. Its three keys with nonmonotone components correspond to the retained four
component-axis failures; no revised curve count or effective inversion is claimed.
Native lifecycle/saved artifacts and final post-format source pins remain separate
integration evidence. Original acceptance and production E admission stay pending.
