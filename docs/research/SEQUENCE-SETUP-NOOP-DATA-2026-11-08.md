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
