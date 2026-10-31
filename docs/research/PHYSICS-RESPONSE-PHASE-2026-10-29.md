# F307: response superposition separates spring law from export phase

Research only, 2026-10-29. No production solver, tolerance, native project,
original/user window or accepted fixture was changed. No original CLI command
was run. This builds on the existing exact 4.3.26 measurements; it does not
replace the unresolved moving-parent regression with a claimed pass.

## Reproducible evidence

Run the own private helper:

```sh
python3 .local/research/constraint-solvers/analyze-response-superposition.py
```

It reads the already recorded `measurements.json`,
`clean-phase-measurements.json`, `phase-measurements.json` and original-exported
own skeleton JSON from the ignored solver research directory. Its sanitized
aggregate is `analysis/physics-response-superposition-check.json`, including
input hashes. It does not import the product solver or its export-clock
adapter. These are independent numerical comparisons of measured original
marker positions, not original integrator instrumentation.

| Check | Samples | Maximum world error |
| --- | ---: | ---: |
| Original .2 event, remove one initial hold, versus original .5 event | 30 | **0 exactly** |
| Independent scalar spring versus .2 recovery after plateau | 46 | 0.0656081 |
| Same spring versus .5 recovery after plateau | 29 | 0.0656081 |
| Measured .5 step convolved with first 30 ramp increments | 30 | 0.0648432 |
| Same response extended by the independently checked spring, full ramp | 60 | 0.0648940 |
| Original .2 response minus .5 response versus original double teleport | 60 | 0.116927 |
| Original clean .2 response plus wind/10 versus original awake teleport | 60 | 0.121354 |

All displayed errors use the existing world coordinate system; no acceptance
tolerance was enlarged. Individual original marker origins have visible pixel
quantization. Repeated values and exact zero comparisons come from the saved
measurements, without rounding the numerical comparison.

## Observed facts and independent model

The .2 step first appears at output frame12 with X40; frames13 and14 also have
X40, and frame15 has X40.25. The .5 step first appears at frame30 with X40;
frame31 has X40, and frame32 has X40.25. Every .5 value at frames30..59 equals
the .2 value at frames13..42 exactly. Thus these two outputs have the same
measured recovery shape after one extra initial .2 hold, rather than different
effective stiffness, damping or impulse amplitude.

An independent scalar recurrence uses the parameters of these controlled
exports: initial spring offset -40 from an80-unit parent jump/inertia0.5,
strength20, mass1, float32 fixed step1/60 and float32 damping retention0.85.
Each step updates velocity by `-strength * offset * step`, position by
`velocity * step`, then velocity by `retention^(60 * step)`. Adding80 returns
the world response. This single recovery explains both events within0.066
after aligning the observed plateau. That alignment is a diagnostic comparison,
not permission to delay product output by an event-dependent number of frames.

A linear80-units-per-second ramp is the sum of80/60-unit step increments.
Convolving just the **measured .5 response** with those increments predicts the
first30 ramp frames within0.065, with no fitting and no modeled extension. The
full60-frame comparison extends that measured response using the independently
checked recurrence and stays within0.065. Using the .2 response's extra plateau
as a universal kernel instead misses the first48 ramp frames by0.592465.

The original double teleport is also reproduced by adding the two separately
measured step responses at their own absolute event times, with the second
negated. Original awake teleport similarly follows clean teleport plus one
tenth of the wind10 trajectory. These independent original-output
superpositions stay within0.122, supporting a shared linear spring response in
these cases. They do not prove unrestricted linearity under limits, rotation,
scale, differing step rates or arbitrary deformation.

## Implication for the next clock experiment

The current product adapter misses the ramp by1.26276 and the .2 step by3.35184;
the spring law itself already explains their observed response shape. The
remaining problem is more specifically the operator that introduces animation
motion into fixed-step state and then exposes the output pose. An arbitrary
spring-constant adjustment would spoil the shared recovery without explaining
the absolute event-time plateau difference.

The independently measured .2 carrier matches its canonical JSON positions
exactly. That excludes an incorrectly sampled **visible** parent, but does not
show when the spring's internal anchor was updated. A final render can show the
current carrier while the last integrated state still uses an earlier motion
sample. Keep displayed parent pose, spring anchor input, fixed-step state and
final pose application distinct in clock experiments.

Record these exact numbers before another candidate loop: stored fixed step
is float32 `0x3c888889`, .2 key is float32 `0x3e4ccccd`, .5 key is float32
`0x3f000000`. Repeated float32 accumulation, float32 `n/60` and float64 `n/60`
produce different times around these boundaries. A strict interval boundary
and a step-count epsilon are also distinct choices. The prior2,048-case sweep
did not expose each of these boundaries' actual tick/anchor logs. A useful new
candidate must derive any one-frame difference from recorded arithmetic and
interval ownership, rather than from an `if event==.2` adjustment.

The helper now records an independently computed boundary table. With strict
division by the stored step, accumulated float32 time at frames12/30 gives
11/30 ticks; indexed float32 time gives11/29. At frame12 both representations
are0.20000000298023224. At frame30 accumulation is0.5000001788139343, whereas
indexed time is0.5. This demonstrates why raw frame ordinals are insufficient
to establish an integration count, but does not reproduce the original spring
state or final rendering order by itself.

A further narrow private check reused only the prior top30 replay candidates
with step-count epsilon0, machine epsilon and1e-7:90 arithmetic variants. None
improved the shared maximum1.142172 or resolved the ramp0.708333. Reproduction:
`node .local/research/constraint-solvers/check-strict-step-count.mjs`; private
result `strict-step-count-check.json`. Removing the product epsilon alone is
therefore not a justified correction even though strict boundary counts differ.

## Small new original probe if internal timing remains ambiguous

Coordinate exclusive original-tool use with the UI researcher and run only on
a new own instance/fixture. Do not automate the handed-over FBones user window.
Avoid another full baseline or an unconstrained sweep of cosmetic lag values.

Create one60-frame scene containing independently colored carrier markers and
three small child-marker lanes:

1. `strength:0`, wind/gravity0, inertia1, generous limit. This removes spring
   recovery. A parent jump should reveal whether the displayed child receives
   the current motion correction immediately, independently of the restoring
   force clock. Include an inertia0 lane as an uncompensated pose control.
2. `strength:20`, otherwise the same. Compare its recovery onset with the
   zero-strength lane's input correction in the exact same export.

Use clean keys at two carefully chosen neighboring frame boundaries, and put
the canonical serialized key times plus actual float32 bits in the evidence.
Prefer boundaries that the new tick log predicts will differ between repeated
float accumulation and indexed time. The two lanes share animation duration,
export settings and reset clock; their visible carrier markers avoid another
unmeasured-parent assumption. Record both parent and child every output frame.

This distinguishes correction timing from restoration timing. It still does
not expose an internal anchor directly; describe it as controlled output
evidence. A candidate explaining it must then retain all37 accepted static and
990 dynamic comparisons and the existing angular/scale/limit checks, alongside
the pending moving-parent cases, before any production change is considered.

No clock implementation is selected by this memo, and full physics parity
remains incomplete.
