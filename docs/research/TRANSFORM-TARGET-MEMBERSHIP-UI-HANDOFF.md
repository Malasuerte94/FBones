# Transform target membership: preserve retained order

2026-10-29, before a dependent fix. Read-only paired UI audit; no new original
input, command, accepted-batch repeat, production edit or runner.

## Direct evidence and current defect

The accepted exact4.3.26 reversed-target captures and saved files in
[TRANSFORM-MATCH-UI-4.3.26.md](TRANSFORM-MATCH-UI-4.3.26.md) establish that the
inspector displays `secondTarget, firstTarget` in that order. Both Offset Match
and Properties Match then use **secondTarget**, the first ordered member.
Original canonical saving does not sort those targets. This is bounded direct
proof that target order can be meaningful, not an observation of editing that
membership with the original multi-select widget.

Current `ConstraintInspector.vue` renders member options in project-bone order.
Its member() handler reconstructs Transform bones directly from the selected
DOM options. Thus a current `[secondTarget,firstTarget]` selection can become
`[firstTarget,secondTarget,newTarget]` when adding a third member, even though
the user requested only a membership change. Removing an unrelated third member
can cause the same reordering. This is an observed source-path defect and could
silently change a future first-target-dependent operation. The FBones Match
buttons remain unimplemented; the ordered model already must remain intact.

## Explicit safe FBones policy

**Original membership-edit ordering remains unknown.** No older editor or
patch-unpinned guide supplies that missing exact gesture. The safe correction
is an explicit FBones preservation policy, not a parity claim:

1. Retain every selected existing stable ID in its previous constraint order.
2. Drop only IDs explicitly deselected.
3. Append genuinely new selected IDs after those retained, using their observed
   UI/DOM order for a multi-add event whose click chronology is unavailable.
4. Deduplicate and use current valid membership. A membership-only no-op must
   retain its exact order and should not create a native history mutation.

Keep IK's ordered-chain validation path separate; do not apply this Transform
policy in place of orderedIkMembers. Preserve source, mappings, nullable cells,
mixes and selection. Capture the intended constraint ID before async editing;
failure recovery must not overwrite a newly selected constraint's controls.

Meaningful checks: reversed retained members plus one added ID; removing a
member without sorting survivors; no-op order retention; explicit pinned panel
target independent from global Tree selection; native DTO/history/save retains
the resulting order. These validate FBones's preservation policy without any
new original oracle.
