# Split axes and larger rigs — current pre-code UI confirmation

2026-11-06. Read current STATE/TASKS, the retained
[split UI gate](ANIMATION-SPLIT-CHANNELS-UI-2026-11-06.md),
[split DATA gate](ANIMATION-SPLIT-AXIS-DATA-GATE-2026-11-06.md),
[aggregate capacity UI gate](ANIMATION-CAPACITY-UI-GATE-2026-11-06.md), and current
HUD, timeline, native DTO, sampling, retention, Tree, weights and viewport source.
This confirmation precedes dependent changes. No product edits, shared runners,
builds, browser/original operations or performance measurements occurred.
Current admission is3editable/5guarded; historical six-guarded statements in the
earlier research notes describe their earlier checkpoint.

## Retained observations and the supported policy

Reuse supplied `animare/Spine_xVO18OJIOB.png` and `Spine_m7wxCtUtTG.png`, already
viewed for the paired split audit: compact approximately23px property rows,
combined Rotate/Translate/Scale/Shear labels and semantic colors, adjacent
Graph/Dopesheet, key/handle marks and shared transform controls. Their versions
are not printed. Accepted exact4.3.26 material establishes the existing layout;
none establishes a separated-axis toggle, conversion/merge gesture, missing-axis
configuration or original scalar-row appearance. No new observation is claimed.

The DATA gate directly establishes scalar kinds14–17 and known per-clip
Generic116 modes1 Translate and2 Scale, with complete nonempty X/Y pairs and
independent times/curves. Twenty-four of57 observed pairs differ in frame arrays.
Flattening axes into combined keys would lose source identities and curve
ownership. Unknown mode3/combinations, missing/empty axes and implicit conversion
remain guarded. Source sampling defaults retain the previously declared
single-clip FBones policy based on the pinned secondary runtime, not a new
exact-editor playback claim.

The complete bounded UI policy is unchanged: preserve the four shared HUD
families and toolbar positions; replace a validated separated family's one
timeline row with adjacent explicitly named X/Y rows using the family color.
Each scalar row has one numeric value, curve and handle set; Y's component0 is
named Y. A shared family Key deliberately keys both axes atomically; dirty K and
Auto Key address only changed physical axes. An axis-row Key addresses only its
axis. Combined sources stay combined. No new split/merge toggle or empty-pair
authoring is exposed. Reject last-axis-key deletion or incompatible paste
atomically rather than synthesizing a sibling key or dropping configuration.
These presentation/manual-key choices are FBones policies, not observed gestures.

## Current implementation blockers and the coherent contract

The old implementation still has four stored channel names throughout its public
types and native `ChannelInput`; native key values/controls use two lanes.
`sampleAnimation` falls through unrecognized channels to Shear. Workspace key
projection, Scale denominator checks, interpolation/clipboard helpers and
`boneChannelFields` assume paired fields. Adding scalar labels or global
capability strings alone would therefore be an incomplete and incorrect feature.

Use a distinct four-member `AnimationFamily` and stored `AnimationChannel`
including `translateX`, `translateY`, `scaleX`, `scaleY`. A shared dimension/family
helper must drive sampler, projection, update/clipboard/curve routes and UI;
internal padded lane1 is exact+0 and never a second serialized/plotted curve.
The coordinator owns those public helpers and native DTO integration.

`keyAnimationChanges` currently loops global capabilities, so an eight-name list
must not produce combined and split keys for one changed field. Resolve the
actual representation per selected bone/clip. Manual family calls remain typed
as four families; row insert calls may address all stored channels separately.
`AnimationTools.allowed` and App tool availability need family support rather
than an accidental requirement for the combined stored channel. Full sampled
bone updates from the shared field editor must still compare physical intent
against the stored sample and route only the addressed axes. An X Scale key
must not fail merely because untouched Setup Y is0.

`AnimationTimeline` currently creates exactly four bone rows, classifies bone
handle bounds using that same list, special-cases only Rotate cardinality, and
names component0 X. All four paths need the common scalar-aware classification.
Keep four family toolbar buttons while deriving actual property rows from the
validated clip/bone representation, not a project-wide split capability. Existing
joint slot RGBA/Dark RGB, Sequence, constraints and deformation controls retain
their own cardinality and limits. Combined bone monotone-Bezier support remains
valid; it does not authorize the known nonmonotone scalar or combined cases.

Retention consumes each scalar's physical field independently, preserving sibling
dirty/newer-clean-revert intent across successful native publication. Stable key,
bone and mode identities must survive selection, copy/paste, move/delete, clip
duplication, history, Save/reopen and validated resource generations. Authored
resource comparisons must include new split metadata; do not weaken continuity
guards to accommodate a new representation.

## Larger rigs are a separate admission and measurement gate

The only explicit128-bone frontend literal found is the Add button in legacy
`BoneHierarchy.vue`; current App imports `SceneTree`, and no component imports
`BoneHierarchy`. It is a dormant seam, not evidence of an active UI indexing
failure. Current Tree, shift/range/multi-selection, parent/constraint selectors,
weights selections and viewport picking use arrays/Maps/Sets and stable IDs,
without a127-index or128-bitmask assumption. Native authoring still has separate
128 checks (including create, multi-action and color batches); these need explicit
owner review rather than an indiscriminate constant replacement. Image/slot128
and dense binding/member limits are independent.

`projectTree` scans children and slots per bone, then ancestor/search/collapse
paths; `treeGuides` also walks ancestors. SceneTree renders every visible row.
Deep rigs create indentation pressure while broad rigs create longer vertical
lists. Weights and target selectors also instantiate their full option arrays.
These are concrete cost/interaction seams, not measured failures or a new cap.

Timeline selection usually restricts shown bones; with no selection it shows all
bones and four property rows per uncollapsed bone. Before slot/constraint rows,
that is785 rows for157 bones or1105 for221 with all four ordinary families shown;
each separated family replaces one property row with two. DOM/SVG is not
virtualized. Ruler size depends on active key time/duration, not bone count.
All display/key sampling remains active-clip scoped, but full native summaries,
history, resource-continuity comparisons and dense-binding/evaluation snapshots
still carry the whole skeleton. Current viewport draws and hits actual bones;
no source proof here establishes responsiveness or pixels at those counts.

Coordinator/DATA triage now reports B has a truly nonmonotone combined Rotate
segment `[89,92,61.999992,98]`, so bone-cap/scalar work must not admit B by
silently repairing it. Candidate H has221bones and522tracks in its sole clip,
with clean bone curves and no constraints per DATA triage. Proposed256 Scene
bones and1024 per-clip tracks require separate isolated native/history/DTO and
active-view measurements and paired approval before capacity lines change.
This source confirmation supplies no guessed cap, performance warning, browser
guarantee or authorization to relax other aggregate/key/geometry/resource limits.
Scalar semantics can be implemented/tested on own fixtures under current caps.

## Ownership and acceptance

Coordinator owns shared `domain/animation.ts`, project/native contracts,
workspace/composable routing, draft retention, clipboard and App wiring. A UI
implementer can coherently own `AnimationTimeline.vue`, `AnimationTools.vue`,
`domain/animationTimeline.ts`, i18n and focused actual compiled-control/native-UI
specs after that contract is frozen. The UI family event and scalar row event
must be distinct. Native/format implementation remains a separate owner with
source equality, ordered mode identity/remapping and atomic validation tests.
Capacity work stays separately measured; the UI implementer should not change
SceneTree/weights/viewport merely to presume a performance problem.

Required checks: asymmetric X/Y times with linear/stepped/valid-monotone Bezier;
one-axis labels/value/curve/handle edits and sibling-bit preservation; mixed
combined/split selections; family and axis-row manual Key, dirty K, Auto Key,
zero Setup on addressed/untouched scale axes; newest clean-revert/sibling drafts;
mixed clipboard/move/delete and empty/conflict rejection; pause-before-capture,
Escape, stale seek/clip guards, invalid-field Save blocking, Undo/Redo and portable
reopen. Large-rig checks need actual retained shape/depth, filter/search/collapse,
range/multi-selection, high-index weights/targets, timeline selected/all contexts,
Main/Preview/Fit and completed-action history/DTO cost. Node/SFC routing and pure
sampling tests cannot replace browser/native interactions, GPU pixels or original
independently encoded acceptance; those limits remain explicit.

## Pre-code capacity correction: preserve reopenable graph depth

Read the new [bone-capacity DATA gate](ANIMATION-BONE-CAPACITY-DATA-2026-11-06.md)
before the dependent depth-closure fix. Its ignored256-inventory prototype can
encode an own246-bone chain which the unchanged Reader depth256 rejects;
the own245-bone chain passes. This is wire-object recursion, not a proposed
UI bone-depth limit. H's retained graph has maximum ancestor depth6 and already
parses, so the fixture boundary does not itself establish H admission.

UI confirmation: an authoring transaction must reject before publishing history
if it would create an unreopenable payload; Save must reject before changing the
target. Preserve the prior visible pose/selection, authored graph, stable IDs,
dirty/revision/history and source/target files. Reuse the existing clear profile
error/notice route; no new widget, guessed warning threshold or tree indentation
rule is required. Do not raise Reader depth, reparent/clamp bones, drop records
or silently repair an otherwise valid user edit. DATA owns authoritative writer
depth accounting or structural-read closure. Boundary acceptance/rejection plus
actual H native history/Save/reopen are independent required proofs; Node timing
and source inspection do not prove browser performance.

## Owned UI implementation receipt

After the recorded paired gates and integration contract, implemented only the
owned Timeline/Tools/timeline-domain/i18n slice. Four toolbar/HUD family controls
remain; per-bone validated scalar tracks replace the corresponding property row,
with one projected value/control curve and an explicit Y label. Family capability
checks recognize supported scalar channels without inventing conversion. Scalar
handle edits use the established bone-specific time bounds. No capacity, Tree,
weights or viewport implementation changed.

`node tests/animation-split-controls.test.mjs`:5/5PASS with actual compiled SFCs.
The checks cover mixed combined/scalar rows, family versus scalar insertion,
scalar-Y numeric/Graph cardinality, invalid/Enter/Escape, pause/handle/seek
cancellation, mixed stable-ID move/copy/delete/disabled controls, and the shared
HUD's Setup/Animate placement and family dispatch. The custom host records
intents; it does not execute native persistence or prove browser layout, OS
interaction, GPU pixels or original parity. Coordinator owns shared regression
runs and final implementation-session launch/checkpoint.

Native-UI scenario correction after the coordinator's real own-fixture check:
the source Translate X segment0→12 is Bezier, and the established native
neighbor-preservation guard rejects insertion inside it. The unrun UI scenario
now asserts frame11 rejection with the complete native summary unchanged, then
uses frame21 for partial-axis/manual/K and22 for family keying in the linear
12→24 interval. Existing scalar Bezier key-value/handle editing stays in the
first scenario. Scale X's independent linear2→10 insertion remains at8. This is
a fixture expectation correction, not a product guard or interpolation change.
