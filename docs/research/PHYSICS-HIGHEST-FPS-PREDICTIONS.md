# F307 highest-FPS discriminator: frozen predictions

2026-10-29, before any new original import, export or GUI input. This work
changes no production solver, tolerance, release pointer or application state.
The existing dual-lane 300 PNGs are reused as measurements; none was re-rendered
or re-extracted. Full moving-parent parity remains unresolved.

## Evidence and bounded question

The paired `PHYSICS-REPLAY-DATA-HANDOFF.md` and `PHYSICS-FPS-UI-GATE.md`
distinguish a documented clue from exact editor behavior. The current primary
[Physics / Simulate guide](https://en.esotericsoftware.com/spine-physics-constraints#Simulate)
describes per-output replay at the skeleton's highest Physics update rate.
That version-unpinned description does not prove the original 4.3.26 clock,
stage order, reset boundary or interpolation. No new web/source claim is made
from an older editor.

The accepted exact 4.3.26 dual-lane source is
`917c2f3117a003d104619f770d20a90ef9e8a6eae59926d73444a8313158a4d4`.
Its 300-frame aggregate is
`analysis/physics-dual-lane-phase-check.json`, SHA256
`eb8d758e0a1988a95ba67414811dca8d90f2b4e72d238b52e656bb0fe2ef0c6a`.
Only the already measured 60-sample **point2** branch is compared here.

Two previous reset/replay candidates already fail the complete five-animation
baseline: indexed-f32 and repeated-f32 outer clocks with the same fixed scalar
operator. Each has maximum residual 6.64557869 world units; point2 full-inertia
restoration starts at modeled ordinal 12 versus measured ordinal 15. See the
paired replay handoffs. A successful new prediction cannot undo that failure or
select either operator as a common original solver.

The new question is narrower: can changing an inert constraint's FPS alter the
three physically unchanged lanes, as a shared highest-rate clock might allow?

## New own fixture, with the reduction delta explicit

Private preparation and all outputs live under
`.local/research/physics-highest-fps-plan/`. `prepare.py` runs only local JSON,
f32 arithmetic and own-asset copying. It executes zero original commands.

The coordinator approved a one-animation reduction to avoid an unproven PNG
settings enum or 300 new frames. Four unselected animations are removed:
frame13, point5, frame31 and ramp. **This is not a literal one-field change to
the entire old source.** The selected point2 tracks, skeleton, skins, slots,
markers, geometry and other constraints are unchanged. Point2 is the first
branch in the old input recipe; the reduction remains an explicit experimental
choice, not a new observation of the editor's traversal/reset implementation.

After selecting that branch, the only physics-field delta is control FPS
60→90. One second at export 60 FPS, lastFrame=false, produces exactly 60 PNGs.
There is no baseline re-export, warmup, fit, crop or changed marker artwork.

| Lane | Inertia | Strength | Constraint FPS |
| --- | ---: | ---: | ---: |
| control | 0 | 0 | **90** |
| correction | 1 | 0 | 60 |
| restore-half | .5 | 20 | 60 |
| restore-full | 1 | 20 | 60 |

Mass remains 1, velocity retention .85, gravity/wind zero, mix 1 and the
nonbinding limit 50000. The plan records every numeric constraint value and its
f32 bits. Important expected bits are step60 `3c888889`, step90 `3c360b61`,
retention `3f59999a`, strength20 `41a00000`, jump80 `42a00000` and key time .2
`3e4ccccd`. New step90 is recipe/model-derived, not yet an original-import
observation. Actual imported FPS/parameters must be checked before interpreting
the future PNGs; unexpected normalization invalidates the specified input.

The new original-generated `.spine` does not exist yet. Its source hash is
explicitly null in the plan. A later authorized collector must bind the actual
source hash to this frozen recipe/settings/assets before interpreting outputs.

## Exactly four numerical models and one causal null

For each of the two existing clock constructions, compare:

- **Independent:** each constraint replays at its own FPS. The inert control
  uses 90; the correction and restoring lanes retain 60.
- **Shared highest:** every lane receives the same 90 Hz outer replay. The
  three unchanged constraints still integrate force at their own 60 Hz step.

Each output independently resets the scalar state at zero. Targets are
f32(ordinal/60), ordinals 0..59. Indexed boundaries are f32(k/FPS); repeated
boundaries use repeated f32(previous+f32(1/FPS)); both stop with the exact target
as their last interval. The fixed operator is unchanged: sample canonical keys,
apply current-anchor inertia correction, semi-implicit f32 force ticks,
post-tick retention, then existing lag interpolation. The inherited
`floor(total/step+1e-7)` rule is fixed, not searched. There is no output-minus-
step adapter, stage-order alternative, fitted delay or epsilon grid.

The copied model reproduces **480 prior failed point2 predictions bit-for-bit**
(240 per clock). This regression establishes reuse of the same failed operator;
it is not a new original experiment or a successful baseline fit.

Separately, an **operator-independent no-coupling null** copies the old measured
point2 curves: if another constraint's FPS cannot influence a lane, the three
unchanged lanes should retain those curves. This is a causal counterfactual,
not a fitted spring curve. Its full-inertia restoration remains measured
ordinal 15. An unchanged result alone cannot disprove every shared-clock
implementation; a shared outer clock could be observationally inert here.

## Concrete predicted differences

Both clocks produce the following early full-inertia values under their fixed
operators. Full 60-sample curves, every outer interval, force count, remainder,
correction, tick state and interpolation output are frozen privately.

| Ordinal | Independent numerical prediction | Shared-highest numerical prediction | Existing measured null |
| --- | ---: | ---: | ---: |
| 12 | .444442749 | 0 | 0 |
| 13 | 1.264198303 | .444442749 | 0 |
| 14 | 2.398406982 | 1.264198303 | 0 |
| 15 | 3.793609619 | 2.398406982 | .491926503 |

Across the complete curves, shared versus independent numerical predictions
separate by up to **2.214702606 world units** for full inertia and
**1.107353210** for half inertia. Full-inertia predicted first movement is
ordinal 12 versus 13. Control and correction remain identical in all four
models: visible control follows the parent; zero-strength correction stays
world X0. The parent itself jumps at ordinal 12 under every named schedule.

At the retained .25 per-curve diagnostic bound, the two full-inertia numerical
intervals are disjoint at 37 indexed-clock ordinals and 46 repeated-clock
ordinals. These separations are arithmetic predictions, not original evidence.
The models have irregular accumulator/tick patterns; no universal odd/even
alternation is asserted. Exact per-output tick counts are recorded. Reporting
onset uses a fixed 1e-6 nonzero threshold only for these summaries, never as a
solver timing adjustment or an acceptance tolerance.

## Measurement, bounds and no-model outcome

Reuse the already validated 512×512 board at 4×, fixed 2048×2048 output, lane Y
centers -168/-56/56/168 and parent/child offsets -24/+24. Palette thresholds,
minimum 64 pixels per patch, ±48 world-unit lane crops and affine identity/Y
checks retain the existing extractor's values. All parent origins must agree
within .001, affine identity components and lane Y within .001. Parents and
children are independently measured from three colored patches each.

Every predicted complete 64×64 sprite rectangle fits the unchanged board;
the minimum margin over all four models/all frames is **32 world units**.
This proves measurement feasibility for these predictions, not a bound on every
unknown original behavior. A missing marker, wrong image dimensions, unexpected
carrier/control, crop/overlap or board escape must retain its evidence and be
reported as measurement/input failure, not silently normalized or fitted.

Compare every lane's complete 60-sample curve at the unchanged **.25 world-unit
diagnostic bound**, including parent and correction. Compare the empirical null
at the same retained bound. Report all residuals and first divergence; do not
pick a convenient frame or align onset after collection.

- If every fixed numerical prediction fails, report
  **NO_NAMED_NUMERICAL_MODEL_MATCH**. Do not extend a phase/epsilon search.
- A changed unchanged-lane curve rejects the predeclared empirical no-coupling
  prediction at this bound, not every independent-force or shared-clock design.
- Multiple compatible predictions mean **AMBIGUOUS**. No automatic new render
  or post-observation model variant follows.
- Even a new matching numerical curve cannot select a common solver: its
  underlying operator already fails the retained baseline. No production change
  follows from this planned experiment alone.

## Frozen files and collection gate

| Artifact | SHA256 |
| --- | --- |
| `plan.json` | `cd9b80ffa886cde205ef32d55735ad09f6bbbf0bb60082187a09cee14f9be202` |
| `predictions.json` | `5b0cec553a930bfbbc8ec4482fd8c4c79b451c3a75841f9215b82678e73941b5` |
| `highest-fps90.json` | `4c1c7f24611da0399e29055b710390b7835d2ea0eab4310b4915f177bc33868f` |
| `settings.json` | `c4ea0f0cabb79bd2a31d34a93e166f036f0d489c5a39e23ac1b12e98d604c717` |
| `freeze.json` | `cb9d649dd390278ca78cf423ac828572025d1ce08053705ef2be86f714a2db76` |

`stage-traces.json`, exact asset hashes and helper hash are bound by freeze.json.
No original result is present or claimed. Before any collection, the paired
DATA worker must independently review inputs/arithmetic and the UI worker must
approve marker/settings feasibility. Only then may the coordinator execute the
separately scoped new CLI experiment with owned paths/process guards. This memo
does not authorize automating a protected user window or repeat accepted batches.
