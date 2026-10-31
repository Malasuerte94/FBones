# Properties Match sampling — original observation and implementation decision

The later [active Offset result](TRANSFORM-MATCH-ACTIVE-OFFSET-SAMPLING.md)
supersedes the earlier Offset full-frame policy recorded below; both actions
now use the prefix. The original Properties observation remains unchanged.

2026-10-30. Paired DATA/UI reviewed before dependent product coding. Exact
Spine4.3.26 owned Properties instance55428 executed ONE Properties Match and
ONE Save from the accepted canonical baseline, then closed normally. No accepted
old original batch was repeated. Private evidence root:
`.local/research/transform-match-active-sampling-ui-v2/`.

## Directly proven

Baseline72b1aac437162894bc88f3d35890a1c58f2edf330d1e05f45c13086fd06a586d
retains source14743's32 authored bone bits, ordered driver/primary constraints,
and48 absent nullable cells. Properties-after0c4fadf17c18d4288021afb2946e2f686accd267fb455812db4cc44cb844395f
passes strict full raw/CRC/mutation checks and all48 predicted scalars BIT EXACT:
24 editor endpoints plus24 runtime route scalars. DATA report
properties-all-fields-data-check.json SHA845e75658052eff94db139d1e37f362701d170ce0efd038428e8a3366b85d747.

SourceX13 is driven to50 by the preceding constraint. Primary mixX.5 would make
firstTargetX65.5 in the complete frame. Actual Properties Match stores FromX39
(subtracting retained global offset11) and ToX70, preserving ordered first target,
all bones/mixes/global offsets/flags and route inventory/order. Authored-only and
full-frame/wrong-second-target models fail. UI readback proves exact primary,
Setup, Local/Local, nonadditive/unclamped, firstTarget then secondTarget and50% X.

## Implementation decision and limits

Properties Match must stop sampling its own effect for this active graph.
Implement one internal prefix evaluation: retain all constraints for validation
and Physics layout, apply only those preceding the selected constraint, using
precise cached authored poses and a scratch clone of cached Physics. Never
truncate the scene or mutate/publish the current cache/clock/history. Preserve
None mode for a None snapshot; otherwise use Pose without advancing simulation.
Keep precise f64 matrices, epoch/revision/document/ID checks, singular atomic
failure, existing matching arithmetic and one authoring history item.

Applying this prefix rule to suffix constraints, other coordinate spaces,
additive constraints or Physics is an explicit uniform **FBones policy** beyond
the measured nonadditive Local/Local graph without suffix/Physics. The fixture
cannot distinguish prefix from evaluating all constraints except the selected
one. These broader original questions remain open; do not claim full parity.

Offset Match remains on its existing complete-frame policy. The own Offset
instance became dirty and disappeared before any Match was posted; source bytes
are unchanged and exit cause is UNKNOWN. No offset sampling datum was obtained,
so do not generalize this Properties result to that action or repeat it blindly.

Regression acceptance: reproduce the48 original numeric scalars from an own
fixture; reject the prior full-frame result; exercise scratch Physics/None,
transient authored poses, suffix policy, stale/singular/identity failures,
Undo/Redo and save/reopen. Reuse existing accepted oracle data without rerunning
original actions. New implementation checks do not expand original proof scope.
