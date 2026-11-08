# Sequence Setup semantic no-op DATA gate — 2026-11-08

Question: why does one hosted Sequence Enter→Undo scenario leave Setup index2
unchanged even though one history action was correctly authored? Reuse accepted
Sequence settings/persistence evidence and existing single-gesture/no-op policy;
this is our frontend commit routing, not an unanswered original gesture.

## Direct hosted observation before code

Candidate `cc32a9e45edae435268cad4427e5c0ba9d2bea91` main Ubuntu UI has113/114
passing cases. In the Region Sequence scenario the first settings update sends
Setup index2 at revision2, returning revision3. The following real Undo click
causes a second identical settings request at revision3. Native correctly treats
it as a no-op and returns revision3. No Undo request reaches the native Session.
The repeated field request sets UI busy and interrupts the intended button click.

The retained trace's raw responses represent settings in field order
`count,digits,setupIndex,start`; frontend `settings` constructs
`start,count,digits,setupIndex`. `SequenceInspector.commitSetup` currently tests
equality with `JSON.stringify`. Equal semantic settings with different insertion
orders compare unequal, so the later field change/blur dispatches a redundant
native call. Existing compiled test fixtures reuse the frontend insertion order
and therefore did not exercise this native-shaped case.

Sources: `src/components/organisms/SequenceInspector.vue`, the sequential event
and request/response records in the retained hosted trace, and
`tests/animation-sequence-controls.test.mjs`. Raw trace stays ignored under
`.local/public-beta/beta3-sequence-ui-failure/`; it is not public source data.

## Bounded correction policy

Compare only the four typed Sequence integer fields (`start`, `count`, `digits`,
`setupIndex`) by value, with explicit enabled/disabled null handling. Keep native
validation, current revision/document checks, pending deduplication, binary
encoding, source inventory/resources and all animation sampling untouched. A
semantic no-op must not start a busy/native transaction or consume the following
Undo/Save/button action. Independent UI reference review is assigned before the
edit; no layout or controls are changed.

Regression should use native insertion order, verify untouched settings dispatch
zero commands, author one changed setting, publish native-ordered current values,
then deliver a delayed change event and verify no second dispatch. Retain all
existing invalid/disabled/Escape and authoring assertions. The coordinator owns
actual browser/real Session verification and subsequent release identity.

## Implemented bounded correction and focused proof

Independent UI review concurred with the four-field/null comparison before the
edit. `SequenceInspector` now compares those fields directly; no other product
function, pending map, history/native validation or persistence path changed.

`node tests/animation-sequence-controls.test.mjs` passes6/6. The added compiled
SFC scenario uses native property order both before and after the changed
publication, proving zero requests for unchanged settings and no second request
for a later change/blur. A temporary in-memory substitution of the old comparison
fails that same new regression with a redundant request, while the corrected
source passes. It does not modify/roll back the product on disk. Product
TypeScript passes. These focused model/control checks are not browser/native
gesture proof; the coordinator must rebuild and repeat the actual hosted
Enter→Undo/Redo scenario before accepting the release candidate.

Retained own logs: `.local/public-beta-beta4-sequence-controls.log`,
`.local/public-beta-beta4-sequence-negative.log` and
`.local/public-beta-beta4-sequence-typecheck.log`. No original/user project,
window, global configuration or remote state was operated by this auditor.

## Later hosted timeline-key no-op gate before correction

Beta4 main still reports113/114, now later at the timeline key Undo assertion.
The retained `beta4-sequence-ui-failure` trace directly proves the prior Setup
Undo/Redo succeeds. Timeline Enter updates stable key12 from index2 to1 at
revision8, receiving revision9. The following Undo click triggers an identical
`setAnimationSequenceKeys` for key12/index1/mode0/delay0.25 at revision9, receiving
revision9. No Undo request follows. This is a separate missing semantic no-op
check: `updateSequenceAnimationKey` validates but always calls the native editor.

DATA decision, independently concurred by UI before code: immediately before
that edit, compare the current addressed key's mode/index exactly and both
delays after `Math.fround`, consistent with stored/native f32 delay semantics.
Return success for an unchanged validated key without a native/busy transaction.
Preserve component controls, all validation, stable ID/frame addressing, working
draft behavior, revision/native history and codec. A minimal model guard covers
all callers without needing a component-specific duplicate path. A compiled
Timeline+production-composable regression must dispatch one changed edit, publish
native f32 state and deliver the delayed change with no second native edit; it
must also distinguish equal versus different authored f32 delays. Strict hosted
assertions and their timing remain unchanged. No code had been edited when this
additional gate and concurrence were recorded.

The minimal production-composable guard is implemented. It retains `current()`
context validation before the semantic comparison and changes no component or
working-pose code. Actual compiled controls now pass7/7, including Timeline
mounted with `useAnimationWorkspace`, unchanged Enter/change rejection and
mocked native-shaped f32 reply publication. Decimal delay0.1 and0.100000001 author the same
f32 and dispatch once;0.10000001 remains a distinct editable f32. The existing
Sequence workspace regressions pass5/5, and TypeScript passes. An in-memory Node
module load hook removing only the new guard makes the new compiled regression
fail (one redundant authoring call instead of zero); disk product sources stay
corrected throughout. Retained logs use `.local/public-beta-beta5-sequence-`
prefix with `controls.log`, `negative.log`, `workspace.log`, `typecheck.log`.
Coordinator owns rebuilt browser/native gesture acceptance and subsequent
candidate publication; no timing/assertion workaround was made.

Independent integration review confirms the final guard still validates the
addressed key/settings and current Animate context before skipping a no-op;
different integer fields or representable f32 delays reach the same original
stable-key/frame edit. Root's `.local/beta5-js-tests.log` records418passes,
one existing skip,419total. No new shared tests were run by this review.

Compared every allowlisted source file against the immutable local beta4 export:
the only product changes are native menu lookup in `src-tauri/src/lib.rs` and
the key guard in `src/composables/useSequenceAnimationWorkspace.ts`; one compiled
control regression was added. Other differences are release defaults/README,
beta4/beta5 release notes, current checkpoint/task rows and the paired research
gates. No workflow, runtime package, dependency/lockfile, binary codec or UI
layout change was found. `PUBLIC_SOURCE_MANIFEST.json` exists only in the export,
as intended: the exporter generates it per candidate. Native Windows and new
full-browser results remain coordinator-owned evidence boundaries.
