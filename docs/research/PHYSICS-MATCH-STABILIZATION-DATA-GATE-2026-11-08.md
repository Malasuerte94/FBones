# Existing Physics and Match stabilization — DATA gate

2026-11-08. The latest user instruction resumes F307/F308 ahead of new features
and moves skins to the end. This supersedes their historical deferral. This gate
is a read-only audit of retained exact4.3.26 evidence and current source; no
original process, fixture mutation, product change or new numeric run occurred.

## Proven foundation and unresolved dependencies

| Area | Direct evidence / current implementation | Remaining evidence needed |
| --- | --- | --- |
| Physics numeric foundation | Retained37static/990dynamic original comparisons cover represented channels, forces, mass, retention, steps and order. Live Setup, explicit Off, scratch/freeze continuation, non-baking Save and native lifecycle have separate accepted gates. | Original moving-parent/export input/update/render phase: clean step errors3.35184/2.24952 and ramp1.26276 exceed existing bounds. Passing own Rust/TS replay agreement does not close this. |
| Active Local/Local Match | Retained original actions prove6Offset bits and48Properties scalars, first ordered target and preceding-constraint effects. Current Session uses precise frozen authored values, full-layout scratch Physics and prefix evaluation without advancing/publishing its cache. | Existing observations do not distinguish ordered prefix from all constraints except the selected one. Suffix discriminator is prepared but not observed. |
| Other Match arithmetic | Independent exact saved endpoint representation, runtime-range relation and sparse mixed/world results exist. | LocalSource/WorldTarget direction, Additive, angular wrapping, reflected decomposition/rounding, singular behavior, Physics sampling and manual clear/equal/conflict interactions remain bounded/unknown. Existing f32/Q5 hypotheses do not explain every world endpoint. |

Sources: [solver evidence](CONSTRAINT-SOLVERS-4.3.26.md),
[Physics next observation](PHYSICS-CALLER-NEXT-OBSERVATION.md),
[active Offset](TRANSFORM-MATCH-ACTIVE-OFFSET-SAMPLING.md),
[active Properties](TRANSFORM-MATCH-ACTIVE-PROPERTIES-SAMPLING.md),
[f32 audit](TRANSFORM-MATCH-F32-MATH-AUDIT.md),
[range policies](TRANSFORM-RANGE-IMPLEMENTATION-POLICY.md).
Source inspection: `Session::authoring_evaluation` in `src-tauri/src/project.rs`,
`src-tauri/src/transform_match.rs`, native prefix tests, and both Physics solvers.
No independently established new product defect follows from these reads.

### Extended Setup mixes and Match capability

The later finite-only Transform Setup profile admits imported extended mixes
without clamping; both ordered evaluators now accept them. The paired
[Nov6 UI gate](ANIMATION-TRANSFORM-SETUP-MIX-UI-GATE-2026-11-06.md) explicitly
excluded Match from that admission. `transform_match::validate` still rejects
any selected-constraint mix outside0..1, including an unmapped channel. This is
a narrower supported Match profile, not evidence that the imported Setup value
is invalid or that Physics/Save must be disabled.

For stabilization, preserve that boundary and expose a clear Match capability
reason rather than silently clamping or broadening arithmetic. A suitable
description is that Match currently requires all six Mix values within0–100%
and this constraint retains an extended value. Current native rejection code
is `InvalidTransformMatch`; its generic message is “Match requires valid
constraint references and one complete finite pose.” There is no separate
extended-mix error code yet. A specific capability/reason may improve UX without
changing the supported numeric profile. Native validation must remain the final
authority if an action races a selection, draft commit or revision change.

Any capability uses committed authoring values after valid pending drafts are
flushed; it must not rewrite an extended value, mistake a display-clamped thumb
for its actual value or reject ordinary edits/Save. Invalid drafts still block
Match/Save through existing field guards. Broadening Match to extended mixes
requires its own exact-reference question, independent result and DATA/UI gates.

## Next smallest original observation

The subsequent [actual Offset result](TRANSFORM-MATCH-SUFFIX-OFFSET-RESULT-2026-11-08.md)
now completes this proposed observation and disproves prefix-only Offset
sampling. The subsequent [independent Properties result](TRANSFORM-MATCH-SUFFIX-PROPERTIES-RESULT-2026-11-08.md)
also directly proves all48predicted saved bits for all-except-selected in the
same bounded graph. Both original branches are complete; do not repeat either.
The plan below records the pre-observation gate, not pending collection work.

Reuse the already accepted suffix canonical source with SHA256
`2d78523c0fbb2854dcba5dcd7931a29b254e547b212ae4967373a47f3db5dafb`.
Do not repeat its original Save. After current original-instance isolation and
fresh ownership are verified, prepare a new Offset fork/run directory through
the existing configurable suffix-v2 driver. The historical blocked run and
its PID are not current isolation evidence. Review the new scenario gate once;
use current inspector identity/readback, ONE Offset Match, ONE Save, independent
full graph/CRC/mutation comparison, then normal close with retained-handle receipt.

Frozen OffsetX candidates are20(prefix), -930(all except selected),
-934.5(complete frame),15.5(prefix-source/full-target),57(authored only).
Compare all six bits and every unrelated field,32bone channels,72nullable cells,
source/target/evaluation order. One matching X discriminates the named sampling
models; it does not prove general Match parity. Prediction/reference contract:
[suffix plan](TRANSFORM-MATCH-SUFFIX-SOURCE-PLAN.md).

Reusable private entrypoints are
`.local/research/transform-match-suffix-ui-v2/{control.py,adapter.py,selftest.py}`;
the existing canonical independent report is
`analysis/transform-match-suffix-canonical-check.json`.
The v2 monitor's real own cmd-exit7 regression already passes; do not repeat it
without a changed monitor. Exact collection paths/options belong to its README.

After suffix classification, the next distinct Match question is the missing
LocalSource/WorldTarget direction. Its existing plan requires independent Offset
and Properties baseline forks, not chained actions; select that experiment only
when it changes a concrete arithmetic decision.

## Physics: do not restart rejected routes

The highest90 dual-lane export already includes zero-strength/inertia controls;
do not recollect the earlier proposed dual-lane experiment. Its event-relative
covariance and final Pose-only counterexample constrain future caller models:
[latest numerical discriminator](PHYSICS-NEXT-ACTION-2026-10-29.md).
The class-load-only helper cannot record caller order; own Windows JVMTI,
VMStruct and class-buffer routes have negative capability results. Repeating
unchanged probes, guessing object offsets, fitting another delay or widening
tolerances supplies no missing fact.

Any new observer route needs a10–15minute feasibility pass on an own JVM toy,
demonstrated target-platform loading and identified semantic methods before
touching an original instance. The missing datum is ordered output/time →
Reset/Update/Pose → clock/delta → actual parent at Physics entry →
step/remainder around a half-lattice parent event. A separately controlled
original GUI-preview clock is an alternative only if its control and measurement
capability can first be demonstrated.

## Closure gates for the existing surface

Stability acceptance requires current supported controls, mixed-constraint order,
precise frozen Match, Off/holds, Setup/Animate boundaries, Reset/seek/playback,
one-action history, invalid/stale atomic rejection and Save/Close/Open without
authored-state baking. Reuse current native/browser tests; coordinator owns full
integration and native Windows delivery checks. No new skin/timeline/runtime
feature is necessary for this stabilization pass.

Exact-reference acceptance is separate: preserve37/990 passing comparisons,
resolve the pending moving-parent original discrepancy against unchanged bounds,
and close the particular Match sampling/arithmetic branches before claiming them.
Do not mark all F307/F308 complete from a green stability regression or the one
suffix measurement. Keep any unmeasured branches explicit rather than deleting
their task scope.

### Deterministic pointer-Play test clock, before test-only correction

The full UI run exposed a test time-address mismatch, not a new solver defect:
held playback frame29.880000000000003 is later than the stored f32 key address
29.8799991607666 by8.39233401e−7frames. The newly dragged localX110 key followed
by frame30/localX80 therefore correctly interpolates at held time to
109.99979019311706/world9.999790193117065. Native public f32 output
9.99979019165039 differs from this independent arithmetic by1.47e−9, while its
distance from the exact key's worldX10 is.0002098083496, above the existing
.0002presentation/key comparison bound. Exact-key authoring already passed.

The bounded test correction is to control/pause the browser clock before Play
and advance a fixed duration within the segment, away from the adjacent key,
while still asserting actual playback progression, playing intent at pointer
down, native frozen Replay epoch, one key action, authored fields and existing
numeric bounds. Do not change product sampling, snap stored key frames, widen
tolerances or attribute this to the unresolved original Physics export phase.
This is independently calculated own f32 timeline behavior, not a new original
Spine observation.

### Native dialog destination capability, before corrected Windows QA

The first Windows QA's preserved saved artifact matches all six original Offset
bits and changes only those six f32fields in an otherwise byte-identical1619-byte
payload. Its intended SaveAs destination was not accepted. Keep that failure
separate from its narrow authored-field proof; do not infer path rebasing or a
product persistence defect from the failed helper route alone.

Root's separate data-free WinForms dialog toy v2 directly proves the corrected
transport: a unique visible/enabled filename Edit is associated through its
parent's actual File-name label; native text and UIA.Name read back the exact
desired path when ValuePattern is observed absent; ONE Submit returns OK and the
exact desired filename. Pinned script03407034 and PID/start/image identities
bind launch, inventory, write/readback, submit and returned receipts. The toy
source never writes selected contents, the desired file remains absent, and
root's Verify receipt records process absence with terminal exit code explicitly
unobserved. The prior v1 toy returned Cancel and wrote no selected contents.

Independent DATA report is retained at
`.local/research/stabilization-2026-11-08/dialog-toy-v2-independent-data.json`,
SHA256`4b3bb4f6e05dde7cbacd6b2dabfdb2ec7a416dec0f990d36a88b70c6a7930f5e`.
This permits a new own QA helper to reuse that proven filename association and
dual readback, with fresh process/control identities and fresh copied input.
Actual FBones SaveAs must still prove the returned project path, new destination
file/hash and native reopen; toy capability alone does not satisfy that gate.

The initial read-only audit created no temporary copy. Subsequent comparison
helpers/reports and original/UI stages are retained for reproducible accepted
evidence; they are not disposable scratch outputs. Parent owns coordinated
cleanup and STATE/TASKS priority/checkpoint updates.
