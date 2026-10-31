# Animate Physics preview — independent DATA gate

2026-10-30. Plan-only audit of `ANIMATION-PHYSICS-PREVIEW-PLAN.md`, after the
0.9.3 codec/UI/original checks. No product changes, original commands, process
operations or repeated F307 probes were performed for this audit.

## Evidence and limits

| Finding | Category and source |
| --- | --- |
| Seven per-constraint numeric Physics channels and discrete per-constraint Reset keys persist, including mixed curves. | Direct exact4.3.26 own fixtures492c/9b, complete arena reconstruction, `analysis/animation-constraint-event-format-check.json`; new UI sourcec910 accepted once by original115048 and independently compared in `animation-constraints-events-ui-original-v2-check.json`. |
| Native Replay samples bone channels and numeric coefficients on each existing60Hz update and applies Reset crossings. | Direct inspection of OUR implementation, `src-tauri/src/evaluation.rs::evaluate_animation`, `animation_constraints.rs::sample/reset_crossings`; real Session regression `native_replay_samples_coefficients_at_each_existing_tick_and_per_constraint_reset_crossing`. This is not original simulation-phase evidence. |
| Simulate/Deterministic are distinct editor concepts; Setup influence and animated coefficients differ; Reset differs from Reset All. | Official documentation fallback already reviewed in `ANIMATION-CONSTRAINT-EVENT-UI-4.3.26.md`, linking `https://esotericsoftware.com/spine-physics-constraints`. Not patch-specific numeric proof. |
| Exact original timestep scheduling, parent inertia, Reset application phase, deterministic seek and loop warm state. | UNKNOWN. Raw records and accepted JSON export do not establish these. F307 stays deferred. |
| Commit complete60Hz steps, fractional scratch render, replay from zero on backward seek/loop, endpoint-only transient drafts and120s first preview window. | Proposed explicit FBones integration policies. Do not describe them as recovered exact Spine behavior. |

## Gates for the next implementation

The proposed bounded slice is supported by the existing model and own solver,
provided the following boundaries remain explicit:

1. TS spring preparation must see the authored constraint layout, with sampled
   coefficients supplied as a borrowed/effective-value overlay. Current TS
   whole-constraint equality would reset springs when animated values change.
   Native already separates `PhysicsState.prepare(scene, mode)` from the
   application overlay. Keep Setup's existing arithmetic, thresholds and clock.
2. Store only completed ticks in the long-lived preview state. Render a final
   fractional endpoint on scratch, discarding it before the next RAF. Match
   native `tick_ceil` and sampling times. Its `tick_floor` adds1e−7 before floor;
   this can round a target infinitesimally BEFORE a boundary up. Never use that
   helper alone as permission to commit a future tick. `exact_tick` uses exact
   `time == tick/60`, not the nearest-tick tolerance.
3. A native freeze must reconstruct the same saved-key Replay prefix at the
   requested time. Then apply transient animation/constraint/order/deform drafts
   once in a final Pose-only scratch evaluation. Integrating the final draft
   across the whole prefix would change history; None would discard dynamics.
   Sampled slot/color/order and sparse deformation must describe that same time.
4. Current guards explicitly permit temporary poses and requested
   `deformTargets` only with None. Extend those guarded entry points deliberately
   for the new Replay-plus-endpoint contract. Preserve all negative-zero carriers,
   exact effective draft bits and bounded union of keyed/temporary/requested
   geometry targets. Do not allocate all inventory or send full scenes per RAF.
5. Preserve immutable public geometry revision/document epochs and caller
   generation/clip/FPS/frame/draft guards. Private `fromPoseEpoch` continuation
   intentionally uses structural compatibility across authored motion; it is
   not a substitute for the public revision guard. The single native cache
   includes geometry targets, authored constraint/clip identity and precise
   draft bits. A fractional freeze contains scratch integration and may replace
   that cache. Do not treat every such snapshot as a retained full-tick lease.
6. First-profile replay is bounded to120seconds from zero. Longer clips remain
   valid data; surface the preview limit. Preserve explicit Simulate-off intent,
   Setup default-live behavior, non-baked authoring and one history action per
   completed gesture. Events/audio remain their separately bounded clock output;
   reconstructing Physics for seek/freeze must not redispatch those actions.

Current `reset_crossings` is `(previous, now]`, with time0 included only on the
initial reset. That is an existing FBones rule, not exact original phase proof.
Global Physics/null targets and Reset All remain unsupported data, not silently
expanded into batches of per-constraint records.

## Minimal validation before delivery

Compare two RAF schedules at common full/fractional and near-boundary times,
FPS24/30, and against native Replay using the same own moving-parent clip with
changing coefficients and Reset. Include pause/seek/loop/off, first unkeyed
Mesh/Clip target, Auto Key-off endpoint drafts, cancellation/stale replies and
no-jump pointer-down. Native Save/Close/Open must retain Setup/key/resource bits;
physics state, velocities and preview clocks remain transient. This establishes
our preview/native agreement and working UI, not original dynamics parity.

Reproduction is read-only: inspect the named plan, `evaluation.rs` tick helpers
and Replay loop, `project.rs` requested deformation guard, `solve/mod.rs` prepare
call, and `animation_constraints.rs::reset_crossings`. Reuse accepted source and
format reports; no new original oracle is required for these explicit policies.

## Before-code integration review findings

A concrete IEEE boundary requires more than removing the old epsilon from
`tick_floor`: `nextDown(23/60)` is0.3833333333333333, yet multiplying by60 rounds
to23 exactly. Tick23's inverse time is0.38333333333333336, which is later. A
completed-tick helper must check the candidate's inverse time against the
requested target and decrease it when necessary. The new TS class's explicit
`(tick+1)/60 <= time` commit condition already enforces that boundary. This is
a clock bookkeeping correction, with no spring arithmetic/tolerance change.

Animate's native cache cannot know UI Simulate intent. A supplied geometry
`poseEpoch` therefore also needs a current frontend-held lease matching the
intended Replay/None mode. Check it after pending edit waits and BEFORE converting
a gesture to animation commands: Auto Key-off conversion can mutate a transient
draft and return without IPC. Check again before dispatch after any awaited
freeze. Frame/clip/Simulate/rebuild invalidates the held ref and generation.
Setup's existing authoring path remains unchanged. Test stale mode changes with
no native edit AND no transient draft mutation.

Existing plain bone `animationPose` JSON transport normalizes negative zero;
root explicitly keeps that pre-existing limit in0.9.4. Nonzero f64 drafts and
constraint/deform zero carriers are preserved. Cache layouts describe effective
received bits. Do not expand that claim to all seven bone draft zero-sign bits.

Independent comparison preparation is pinned under ignored
`.local/research/animation-physics-preview-data/prepared-v3.json`: real default
f32(1/60) and exact1/64 solver steps, FPS24/30, seven animated coefficients,
parent motion/Reset, full/fractional IEEE-neighbor times and120second/off121
boundaries. A final endpoint draft checks that saved history runs first and
working values apply only once. These are prepared checks, not PASS evidence
until the rebuilt host/class run and a new result are retained.

## Actual rebuilt own-engine checkpoint

After coordinator authorization and the current host rebuild, comparatorv3
completed112 common-time comparisons across actual default f32(1/60) and exact
1/64 Physics steps, FPS24/30. Different RAF partitions have EXACT0 f64 world
residual. Maximum TS-f64 versus native public-f32 matrix residual is
3.5806674532e−6 under the predeclared1e−5 bound; endpoint working-draft residual
is at most3.4387281147e−6. Reset0/.25s, seven animated coefficients, moving
parent, IEEE neighbor/full/fractional times through120s, static-off121s,
over-limit rejection, nonzero f64 endpoint drafts and constraint −0 carrier all
pass. Native authoring/summary and source inputs remain unchanged. No original
or Windows operation occurred. Actual report:
`analysis/animation-physics-preview-data-check.json`, SHA
1094295e515ea5635b8034655637818150b8071dd2e5b6cecd014f3a40ced681.

Final read-only review confirms the inverse-time completed-tick correction,
saved-prefix exclusion of endpoint constraint drafts, one final Pose overlay,
authored Physics preparation layout and sparse Replay geometry requests. Private
configuration canonicalizes only stored f32 solver inputs; endpoint values stay
f64. Frontend lease rejection precedes transient animation conversion and is
rechecked before IPC. Native owner's254/93 regressions and strict receipts are
separately pinned and verified current; they were not rerun by DATA.

This establishes agreement between our two engines for the bounded own fixture.
It does not establish exact original Physics phase, original GPU/gestures,
Windows/macOS lifecycle, or safe long-lived continuation of a fractional cache.

## New combined UI-source persistence acceptance

The new real UI-authored weighted Mesh/Physics bundle9eff810a (892B), frozen
before the final95-case run, passed ONE new original4.3.26 export81984 with
retained exit0/Complete/no metadata error. Source/copy and all five copied own
PNGs remain unchanged; outputb91526b7 is bound by the receipt. Independent DATA
recomputation EXACTLY matches
`analysis/animation-physics-ui-original-check.json`, SHA
aff8f0cdc0e8cb5963d081c2d3f755b3a0af69d1f6c5726d516d135da1de0e94.
Thirteen keys (4bone/6Physics/1Reset/2Deform),24 Setup bone scalars,8weight and
16position bits,32dense deformation offsets including16dormant coordinates
retain raw/native equality.72 runtime numeric comparisons have maximum residual
1.9073486328125e−6 under the unchanged5.1e−6 bound. No original dynamics,
rendering, gesture or simulation-phase observation follows from this export.

The final95-case fresh source1b5bfb41 differs from9eff only at identity bytes
23..27 in the proven complete16-byte identity field12..27. All other1757decoded
payload bytes, independent typed projection, saved/reopened native values and
five PNGs match. Fresh compressed bytes were not separately exported. The
historical reuse report9e3c7d0e was written while the new reference acceptance
was pending; this later actual receipt closes that pending reference without
rewriting the historical record. No accepted original batch was repeated.
