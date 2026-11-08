# Known X-only Translate mode1 — pre-code UI gate

2026-11-07, after the user resumed F105. Read current STATE/TASKS, paired
[partial Translate DATA gate](ANIMATION-PARTIAL-TRANSLATE-DATA-GATE-2026-11-07.md),
[native audit](ANIMATION-TRANSLATE-X-ONLY-NATIVE-AUDIT-2026-11-07.md), accepted
[split UI confirmation](ANIMATION-SPLIT-LARGE-RIG-UI-CONFIRMATION-2026-11-06.md),
and current Timeline/Tools/domain/workspace/retention/tests. Reuse supplied
`animare/Spine_xVO18OJIOB.png` and `Spine_m7wxCtUtTG.png` findings; do not recollect
original screenshots. No product edits, shared runner, browser/original operation
or capacity change occurred for this audit.

## Evidence and bounded decision

DATA directly identifies17mode1 rows on one bone across17Eclips with four stored
TranslateX keys and no TranslateY or combined Translate timeline. Existing source
and retained export/runtime receipts correlate that absence and Setup Y bits.
Absence is meaningful data: Open, normalization, Save and resource refresh must
not invent Y keys, an empty serialized timeline, combined keys or a replacement
mode. This primary persistence proof supports the narrow model exception.

The supplied images show compact shared transform controls, combined family
labels and Graph/Dopesheet arrangement. They do not show an X-only split toggle,
first-Y creation or last-Y deletion gesture, and screenshot versions are not
printed. Empty scalar-Y presentation and the manual authoring semantics below
are explicit **FBones UI policies**, not new exact4.3.26 observations. Existing
Setup/Animate control placement, density and semantic colors stay unchanged.

Bounded support is coherent: mode1 requires nonempty X and allows absent or
nonempty Y. Before a Y track exists, animation-local Y retains Setup; the pinned
secondary runtime and current full-weight FBones projection support that default.
This is before parent/constraint/Physics evaluation, not a claim that final solved
world/local Y always equals Setup. Y-only, both absent, explicitly empty tracks,
partial Scale and unknown modes remain rejected. E's nonmonotone and slot/mesh
guards remain independent; this prerequisite does not admit E or a fifth source.

## Existing controls already express the profile

`animationFamilyChannels` returns TranslateX/Y whenever X is present;
`animationBoneChannels` therefore also exposes Y to key routing and retention
without requiring an existing Y track. Its current complete-pair comment becomes
stale and should describe validated mode1 X/optional-Y after implementation;
the function itself need not invent a different representation.

Timeline derives rows from each bone's stored channels and creates a synthetic
empty Y row when no real Y track is found. Keep that row visible and labeled
Translate Y, with its existing row Key control enabled under the same edit/busy/
clip/capability guards. Do not show fake diamonds, controls, a constant-zero
curve or a numeric key inspector before a key exists. Graph currently projects
only real tracks: absent Y has no curve; its first real key gets exactly one
Y-labeled numeric lane/curve and no outgoing handle until a next key exists.
Internal native padding remains value lane1/control axis1 exact+0, never a
second visible Y curve or a timeline whose values are fabricated on load.

The four shared HUD/toolbar families remain unchanged. Auto Key off stages a
physical Y working value without creating a native track. Axis-Y Key, dirty K
or Auto Key can create the first Y key in an existing valid mode1 bone. Shared
Translate Key and clean K fallback deliberately address both axes in one native
transaction, preserving their actual representation per selected bone. They may
legitimately reject atomically if X insertion would violate its established
Bezier-neighbor rule; do not create Y first and then fail X, or relax that rule.
Use an existing linear interval/end for positive family-key tests.

Deleting the last Y key removes its native timeline but retains mode1 and all X
data. The empty Y row remains, and sampled animation-local Y returns to Setup
unless a deliberate unkeyed Y override is live. Deleting last X must reject,
including a batch which would leave Y-only or remove both axes. Mode2 last-axis
rejection remains. Structural bone deletion/clip lifecycle retain their separate
existing contracts; no split/merge toggle, silent conversion, Y placeholder or
automatic mode creation is introduced.

## Publication, identity and pending intent

Retention captures physical Y through `animationBoneChannels` even while Y has
no native track. `boneChannelFields.translateY` is only `y`; first-Y publication
must not consume X intent, and X publication cannot consume Y. Key creation uses
the ordinary guarded native publication boundary, preserving revision/document/
frame/clip/epoch and per-field generation checks. A Y value changed while a
first-Y reply is pending—including a newer revert to the old clean Setup sample—
must survive that reply. Incidental clean Y in a full bone draft must instead
follow the new native sample. Test this distinction, not just final equality
between an unchanged draft and its old sample.

`deleteAnimationKeys` currently preserves working poses without marking a bone
channel consumed. This fits last-Y deletion: retain a preexisting dirty Y and
newer clean reverts across publication, while an untouched clean field follows
the new Setup-based sample. Failure/stale publication never changes authored
data or installs a stale reply. Explicit seek/clip/document discard remains
authoritative; away/back plus new field intent must not resurrect old incidental
Y. Save and verified image-resource replies preserve overrides without creating
Y keys, baking Setup, weakening continuity or enabling Simulate.

Absent Y uses a synthetic row identity; first creation introduces a real native
track/key ID and last deletion removes it. Current deep key watchers drop deleted
IDs, retain surviving X selection and cancel stale gestures when tracks/rows
change. Test those transitions through Graph/Dopesheet, including selection of
mixed X/Y keys, rather than assuming a synthetic row is a persistent native key.
Recreated Y receives a fresh native key ID; Undo may restore the old snapshot.
Clipboard must retain the addressed scalar family and reject ordinary/unknown
targets, without silently creating a new mode or converting combined channels.

## Implementation and regression scope

Source inspection finds no required component/layout change for this profile.
The format completeness predicate and native reconciliation/history are owned
by the DATA/native implementers. Coordinator owns any demonstrated retention/
workspace correction and public comments. UI implementer can own focused compiled
component/native-UI tests after explicit start; avoid speculative product changes.

Add an own X-only fixture derived separately from the existing complete-pair
seed; retain nonzero Setup Y, typed mode order, raw−0 X fields, complete Scale
pair and unrelated families. Existing complete-pair fixture receipts stay intact.
Required compiled-component checks: empty Y row/Key with no Y marks/curve;
first-Y creation produces one value/curve and correct labels/padding; last-Y
deletion returns to an empty visible row, clears dead selection, preserves X
identity and unrelated selection; readonly/busy, Escape/invalid numeric state,
pause-before-gesture and stale seek/clip behavior remain.

Actual composable/store tests must cover manual Y, shared family Key, dirty K,
Auto Key, first-Y pending newer dirty/clean revert with and without a draft at
invocation, X commit preserving Y, last-Y delete preserving dirty/newer Y versus
incidental clean fields, failure/stale reply, away/back discard, Save/resource
retention without key creation and mixed combined/split selection atomicity.
Native tests own equality/ID/layout, clipboard/duplicate/remap, Undo/Redo,
Save/reopen, last-X/Y-only/both-empty/partial-Scale negatives and padding.

Existing `tests/e2e/animation-split.native.spec.ts` scenario2 asserts all-Y deletion
must fail. Under the new bounded profile that expectation is obsolete: replace
it with a last-X rejection control or add a positive last-Y deletion check with
the new fixture. Retain its genuine frame11 Bezier-insertion rejection and
positive frame21/22 linear keying. No other-family guard should change merely
to keep an old test passing. Browser tests remain **UNRUN**: the corrected
[pipe feasibility finding](PLAYWRIGHT-PIPE-FEASIBILITY-2026-11-07.md) has pre-CDP
startup failure and cancelled version3, so no further flag/harness retry is
authorized by this feature audit. Node/SFC/native proof remains distinct from
real browser/native-platform/GPU/original acceptance.

Private `animation-partial-translate-ui-2026-11-07/source-manifest-v1.json`
records the10source/reference pins for this pre-code audit. No test or product
mutation is claimed by that manifest. Coordinator owns STATE/task updates.

## Owned UI test receipt after explicit implementation start

Read the integration contract before test changes. No widget/product source
change was needed. `node tests/animation-split-controls.test.mjs`: **7/7PASS**,
including2new actual compiled-component cases. X-only props retain the empty Y
row and enabled Y/family emit routes, with no Y mark/curve/key inspector or
authored placeholder. Controlled first-Y/create/delete/recreate publications
retain X selection, clear deleted Y IDs, restore the empty row and expose one
Y-labeled numeric/curve lane without padded axes. Existing5control regressions
pass in the same owned run. This custom host proves projection/emitted intent,
not native authoring or browser input.

Updated `tests/e2e/animation-split.native.spec.ts` to reject deletion of all
required X keys instead of the now-valid all-Y deletion. Added a third scenario
using the separately confirmed `e2e_seed_partial_translate_fixture` contract:
Setup Y17.25/X-only source, empty Y row/no curve, Auto Key-off staging, first-Y
row Key, last-Y delete, unchanged X/mode/Setup, Undo/Redo and portable reopen
with Y present and absent. The first-Y frame21 is in X's existing linear12→24
span; the earlier genuine frame11 Bezier-insertion negative remains. These native
UI scenarios remain **UNRUN**, pending actual browser capability; typecheck and
shared test discovery belong to root. No browser/flag/server retry occurred.

Frozen owned-test SHA256: compiled controls
`ca684f873903982037b03fe96f92bd9423f2854a85fc647e713ec3c16fa91d16`;
native UI spec `a38926027e6fd2a75f861bdc3c1f62cfff9c869a97e28579596eb9febf661f32`.
Coordinator/native owners separately prove production publication, stable IDs,
history/format equality, saved files and first-Y asynchronous newer intent.
