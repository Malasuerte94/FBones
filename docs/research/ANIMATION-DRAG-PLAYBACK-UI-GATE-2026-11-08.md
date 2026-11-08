# Animate drag and playback — retained UI gate

Recorded before product changes. Reused the accepted
[UI audit](ANIMATION-UI-4.3.26.md), [DATA audit](ANIMATION-DATA-4.3.26.md),
[Physics gate](ANIMATION-PHYSICS-PREVIEW-DATA-GATE.md), and
[preview range policy](ANIMATION-SEQUENCE-PLAY-RANGE-GATE-2026-11-06.md).
Viewed the supplied full `animare/Spine_vzdTlvDSE9.png` again. No original
process/window was operated and no original behavior was recollected.

The shared compact transform controls, Animate-only key/Auto Key controls,
docked Dopesheet/Graph and transport remain unchanged. A completed gesture
creates one history action; transient playback/scrub does not rewrite Setup.
Exact original4.3.26 release gestures and playback frame timings remain unknown.
Correcting the diagnosed FBones preview/commit mismatch is an explicit product
fix, not new original parity evidence.

Performance decision: keep timeline/event time,60Hz committed Physics and scratch
fractional presentation semantics. Profile the own evaluator with the retained
typed mascot input before optimization; do not reduce quality, skip constraints
or alter key interpolation. The CPU profile at ignored
`.local/research/playback-performance-2026-11-08/before.cpuprofile` identifies
whole-rig `recompute`/affine/finite work and allocation as the main hot path.
The source has125bones and79constraints (74Physics,4IK,1Transform).
Each changed bone currently recomputes every bone. Updating only that bone and
its descendants can retain the exact ordered constraint result; independently
compare complete frame values before/after, including seek/replay/drafts.
The local CPU benchmark is not Windows WebView2/GPU frame-rate evidence.

Runtime UI gate supplied to coordinator before implementation: a compact
Export runtime action uses the existing pending-field flush and native Save
dialog, stays disabled for invalid/busy/inspection-only state, and reports the
supported profile honestly. This is an explicit new FBones developer feature,
not an original export UI parity claim. Export authored Setup/keys and a safe
asset whitelist; omit source/editor provenance and do not change `.fbones`.
A headless local player and separate Pixi view fit the retained no-scene-IPC
per-frame contract. Developer API/distribution choices are FBones design.

## Result of the measured evaluator correction

The separate DATA worker approved descendant propagation before code. Child
adjacency is built with normal graph validation on every evaluation; no mutable
input cache or global state is added. IK, local/world Transform and Physics
recompute the affected root and every descendant before the next constraint.
Unrelated branches keep their matrices. Solver arithmetic, ordering, finite
guards, exact60Hz replay and fractional scratch rules are unchanged.

[Aggregate result](../../analysis/animation-playback-performance-check.json):
six warmed alternating same-process runs of360 live mascot frames each show
median mean CPU1.0101ms→0.2526ms (4.00× evaluator improvement), median p95
1.5767ms→0.3209ms. Complete authored/applied/world frames and all committed and
endpoint spring fields match the retained pre-edit evaluator at756 samples;
48draft/clear samples also match. Both clips, Simulate on/off, repeated times,
backward seek and loop restart are covered. This is local Node CPU evidence,
not a claim of Windows/GPU FPS or elimination of every possible playback cost.

The three new `constraint-subtree.test.mjs` cases independently compute full
parent-first world transforms across96 changes, interleaved descendants/multiple
roots and world-space updates, assert unrelated matrix identity is retained,
and verify descendant/untouched-branch nonfinite rejection. Existing solver
seven passing/one known skipped and Physics-preview five passing cases retain
the original numeric oracle and deterministic animation policies.

## Additional viewport redraw gate

Before the next code change, source inspection identifies a second concrete
cost: every changed Animate `poseKey` calls `cancel()` from `setScene`. Cancel
already calls `cursor/draw/app.render`; `setScene` then repeats the entire
image/mesh/bone draw and GPU submission. The actual production controller in
`viewport-input.test.mjs` with a renderer counter fails `2 !== 1` for the first
sampled frame. This is own controller evidence, not a GPU timing claim.

DATA independently reviewed and approved an optional cancellation redraw flag:
`setScene` suppresses the intermediate draw and keeps its existing final draw.
Cancellation, preparation generation, capture release, geometry lease callbacks,
preview clearing and pivot restoration remain synchronous and ordered. Other
cancel callers keep their existing redraw behavior. The unchanged UI reference
requires a coherent sampled pose and stale-gesture cancellation, not duplicate
render submissions. No original gesture or persistence rule changes.

## Timeline metadata and rendering gate

Before code: App passes newly sampled `sceneSlots` into a metadata-only timeline
projection each frame, plus fresh selected-constraint/interpolation arrays.
This invalidates track/row computations even though slot IDs/names/inventory,
sequence settings and support are unchanged. DATA independently confirms Setup
slot order is track order; transient draw order belongs only to the viewport.
Use authored slot metadata, retaining the legacy fallback and normal invalidation
on authored changes. Latent attachment selection is unchanged.

Actual compiled Timeline on the existing custom CPU host, three alternating
120frame runs per case, shows single-bone mean approximately0.54→0.25ms with
stable props. All-bone11705element rendering still costs approximately13.6ms;
the playhead triggers rebuilding all key/row VNodes despite stable source data.
Raw evidence is ignored `timeline-comparison.json` beside the profiler scripts.
Memoize only static track rows and Graph contents with explicit dependencies
for stored tracks, selection, locale, zoom, editability and active gesture
geometry. Keep playhead/current/transport live. Selection, pointer drag,
interpolation, zoom and authored changes must invalidate cached content.
These are FBones rendering optimizations, not a new original interaction claim.

Final owned results are included in the aggregate report above. The controller
now submits one complete render per sampled pose instead of two, verified over
120changes plus captured stale-gesture cancellation;52controller tests pass.
The compiled Timeline custom CPU host, three120frame runs per mode, measures
single-bone median0.5436→0.1490ms and all-bone13.5794→1.0021ms (13.55×) with
11705elements unchanged. These are CPU measurements without browser layout or
GPU time. Six Timeline regressions prove playhead movement with stored-key reuse,
selection/drag, zoom, locale, authored updates, disabled state, Graph tangent
preview/Escape and explicit preview-range width invalidation. Sequence five,
Graph-handle three and two-color five existing focused tests also pass.

Further algebra review compares all54retained own oracle recipes and two active
Transform graph recipes at12times each:672complete frame and Physics-state
comparisons are exact against the pre-edit own evaluator. No fresh original
observations or broader fidelity claim is implied. Subtrees include every
descendant in parent-before-child order; sibling/multiple-root, local/world
multi-target Transform and ordered Physics/IK cases remain covered.

Cleanup removed redundant full-frame benchmark dumps after exact comparison,
recovering5824512allocated bytes; retained scripts, before-code bundle/source,
CPU profile and concise raw results reproduce the findings. No builds, native
or browser servers, original/editor windows or personal assets were operated by
this worker. The coordinator owns final integrated tests, builds and launch.

## Late browser target review: large mesh and two-color art

The failing owned browser traces/screenshots were copied with hashes before
the next shared run to ignored `.local/research/ui-target-review-2026-11-08/`.
Both failures occur at invalid test targets; no product edit is warranted.

`WeightsPanel.vue` has zero-based option values and one-based visible labels.
String `selectOption('511')` matches the earlier label511 (value510), as the
actual trace's returned selection proves. The test now explicitly selects
`{value:'511'}`; it still checks the actual512th row, unchanged511th row and
all512deformed rows with the same numeric/history/save assertions.

The two-color test samples world(80,0) in Animate, directly under the root's
antialiased X-axis label. Inspection of the retained screenshot finds
pixel(531,287)=(75,109,153), while the same solid Mesh interior16pixels above,
pixel(531,271), is exactly(51,102,153). Adjacent interior pixels agree; Region
interior there is exactly(64,102,153) for its staged red override. The test now
samples world y16 in both64×64uniform black artworks, clear of editor overlays.
Exact RGB values, native bits, color-key history and reopen checks are unchanged;
no color tolerance or forced pointer bypass was introduced. Coordinator owns
the actual rerun and must report it separately from these target findings.

## Browser integration test target review

The coordinator's first full browser run exposed two independently invalid test
assumptions. Its Graph workflow trace explicitly reports the Y frame0/value0
marker intercepting the coincident X frame0/value0 marker. Both identify the
same stored key; the corrected real pointer action selects the upper Y marker
before manipulating the intended X tangent. No forced click or product hit-test
change is used. The broad four-family case also asserted exactly four advertised
native capabilities, predating accepted split-axis support. It now expects the
existing eight-channel capability list while retaining its four authored-track
and binary persistence assertions. These are test corrections, not application
behavior changes. The separate numeric/resource-retention failure is owned by
DATA and must be resolved and rerun before integration is declared green.

## Shared numeric focus correction — UI review before code

DATA's [numeric focus gate](ANIMATION-NUMERIC-FOCUS-DATA-2026-11-08.md)
locates the resource symptom before any refresh/model publication: the actual
replacement input becomes `-24.66666666666666811`. Independent UI source review
confirms `AnimationTools.vue` queues expansion from the compact string to the
precise draft by setting `focusedField` in `@focus`. That later value write can
reset a selection already established by a pointer/text replacement action.

The proposed synchronous focus handler is approved: pause transport, update
the focused DOM input to the exact existing draft value during the focus event,
then set `focusedField`. A later Vue update sees the same value and preserves
the user's subsequent selection. Do not author a value or dispatch input/change
on focus, round the draft, select all text automatically, or move DOM nodes.
Keep exact focused precision, compact blur text, shared Setup/Animate controls,
Enter/change dedup and Escape behavior. If already equal, avoid a redundant DOM
write. These are corrective FBones UI policies; exact original4.3.26 focused
selection gestures remain unknown. No fresh original operation is needed.

Required evidence: actual browser replacement on a fractional sampled field,
immediate DOM value11 before Enter, unkeyed working pose11 afterward with native
Setup/keys unchanged, and the existing resource retention sequence. Also retain
focused-precision and Escape checks. DATA owns the implementation and tests;
coordinator owns the shared browser rerun.

### Follow-up gate: stable exact DOM value

The coordinator's next browser run disproves the synchronous-focus hypothesis:
replacement still appends. DATA's targeted inspection of installed Playwright
shows its number-input replacement selects text before calling focus, so even
a synchronous focus value assignment can discard that preexisting selection.
Retain this useful failure; do not claim the preceding proposal fixed the bug.

UI approves the revised presentation before code: the actual numeric input
always contains the exact unchanged draft value. An adjacent compact display
overlay is visible only while the cell lacks focus; CSS hides it and reveals
the exact input text on focus. Focus pauses playback but never rewrites the DOM
value. The overlay is `aria-hidden`, noninteractive (`pointer-events:none`) and
has no tab stop; labels, keyboard handlers, disabled state and test IDs remain
on the real input. Screen readers receive the precise numeric input. Keep
existing60px/min-width0/flex1 cells and42px narrow layout, centered text, clipped
overflow, background, selected/focus and disabled appearance. Disabled opacity
also applies to the visible overlay. No select-all policy, draft rounding,
synthetic input event or native authoring is introduced.

The exact-value input removes selection timing dependence in either event
order while preserving compact visual density and precise focused entry in
Setup and Animate. Browser checks must verify exact DOM value and visible
compact overlay before focus, replacement11/Enter, unkeyed working pose/native
immutability, Escape restoration and the affected resource workflow. This
remains a corrective FBones presentation policy, not an original4.3.26 gesture
claim. DATA owns source/tests; coordinator owns actual browser verification.
