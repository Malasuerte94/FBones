# F307 next phase diagnostic — read-only handoff

2026-10-29. No solver, native project, UI, tolerance or release pointer changed.
No original command, application input, accepted render batch or test runner
was executed for this handoff. It uses the already accepted dual-lane evidence
and a small independent numerical comparison of its recorded coordinates.
Full moving-parent parity remains unresolved.

## Evidence to reuse

- `PHYSICS-DUAL-LANE-DATA-4.3.26.md` and
  `analysis/physics-dual-lane-phase-check.json`: new original source
  `917c2f31…3158a4d4`,300 PNGs, five animations, four lanes,2400 measured affine
  marker sets. Extractor ran no original command. Report SHA256 used here:
  `eb8d758e0a1988a95ba67414811dca8d90f2b4e72d238b52e656bb0fe2ef0c6a`.
- `PHYSICS-RESPONSE-PHASE-2026-10-29.md` and its independent superposition
  report: the measured recovery shape already agrees with one spring law
  after diagnostic plateau alignment; this does not select a runtime delay.
- `CONSTRAINT-SOLVERS-4.3.26.md`,
  `analysis/physics-moving-parent-phase-check.json` and
  `analysis/physics-measured-parent-check.json`: previous clock/input/order
  limits and rejected hypotheses. Reuse them; do not repeat the accepted
  37-static/990-dynamic corpus or the original moving-parent collections.

## What the paired dual-lane result actually separates

| Animation | Measured carrier jump ordinal | First full-inertia/strength20 restoration ordinal |
| --- | ---: | ---: |
| point2 | 12 | 15 |
| frame13 | 13 | 16 |
| point5 | 30 | 32 |
| frame31 | 31 | 33 |

At the measured jump, control inertia0 follows X80 immediately. Inertia1 with
strength0 stays worldX0, and half inertia with strength20 immediately showsX40.
Full inertia staysX0 until the restoration samples above. Full-inertia initial
restoration is approximately `.491927,1.25,2.375`; these are raster centroids,
not internal f32 state. Correction and restoration therefore have different
observable phases. A uniform lag on all parent correction and spring output
contradicts this fixture. A visible current parent does **not** expose when an
internal spring-anchor sample was consumed.

The event-time dependence is real in the recorded output: frame13 shares the
point2 three-ordinal offset, and frame31 shares point5's two-ordinal offset.
It is not evidence for an `if time<.5` branch. Prior clean keys, moving wind,
continuous ramp and exact measured-parent controls already rule out the simple
duplicate-key, sleeping spring and wrongly sampled visible-parent explanations.
Previous2048 candidate combinations and a90-case strict-epsilon follow-up did
not identify an acceptable common operator. Do not launch another blind lag
sweep over those same candidates.

## New bounded numerical check of the recorded lanes

For the translation-only controlled source, compare measured full-inertia
output `F` with `2*H-P`, where `H` is the half-inertia output and `P` is the
simultaneously measured carrier. This removes the half lane's immediate
uncompensated half-motion without requiring any guessed clock or time shift.

| Existing animation | Samples | Maximum `abs(F-(2*H-P))` | RMS |
| --- | ---: | ---: | ---: |
| point2 | 60 | .125 | .06282052 |
| frame13 | 60 | .125 | .06281188 |
| point5 | 60 | .125 | .05003266 |
| frame31 | 60 | .125 | .04801858 |
| ramp | 60 | .125 | .09401589 |

This is an independent relation between original measurements, **not** a new
physics acceptance test or enlarged tolerance. It supports isolating a common
restoration operator rather than fitting separate stiffness/damping or delays
to the half and full lanes. It does not prove arbitrary-channel linearity,
limits, nonuniform transforms or proprietary integrator state.

Reproduce the arithmetic without original commands or PNG extraction:

```python
import json
from pathlib import Path
d = json.loads(Path('analysis/physics-dual-lane-phase-check.json').read_text())
for name, frames in d['frames'].items():
    errors = []
    for frame in frames:
        lanes = frame['lanes']
        p = lanes['control']['parent']['x']
        h = lanes['restore-half']['child']['x']
        f = lanes['restore-full']['child']['x']
        errors.append(abs(f - (2*h-p)))
    print(name, max(errors), (sum(e*e for e in errors)/len(errors))**.5)
```

## Next action: instrument one bounded clock/operator comparison offline

Write a private diagnostic harness, **not a production edit**, that logs the
actual state transitions of the independent scalar translation model on these
existing five measured timelines. Use canonical imported key times, the stored
step `f32 0x3c888889`, retention0.85, strength20, mass1, no forces and the
generous nonbinding limit from this fixture. `.2` is stored as `0x3e4ccccd`;
`.5` as `0x3f000000`. Do not substitute recipe decimal times for canonical keys.

Start with at most six explicitly motivated traces: repeated-f32, indexed-f32
and indexed-f64 clock construction, each with either a current-anchor update
before integration or a separately logged integrated-anchor sample followed
by current-pose correction/application. The latter is a **hypothesis**, not
recovered behavior. Use the already recorded startup/reset conventions and
existing clock adapter as named alternatives; add no free per-event delay,
per-frame fit or new epsilon/tolerance to make a trace agree.

Each ordinal's diagnostic row must expose:

- Canonical animation/key time bits, measured carrier X and the independently
  sampled parent supplied to each modeled stage.
- Absolute physics time, previous time, delta, old remainder, total/h, integer
  step count, new remainder/fraction and the exact comparison boundary used.
- Anchor/world input before and after motion correction; oscillator position
  and velocity before correction, after correction and after each fixed tick.
- Stored lag/interpolation state and final visible pose application. Keep
  displayed current parent, motion correction, integration input and output
  sampling distinct rather than calling all of them “the parent time.”

Report every case's complete residual curve, plus the specific first wrong
stage around ordinals12–17 and30–35. A common operator must explain immediate
correction, both restoration onset classes, the half/full relation and ramp
using one clock/reset rule. If none does, record that failure and stop; do not
replace it with a hand-tuned frame hold. No candidate may enter production
merely because it matches one stepped trajectory.

Avoid inferring a precise anchor by taking noisy per-frame second differences.
For semi-implicit scalar integration with post-step velocity retention `r`,
step h and `c=k*h*h/m`, hidden tick positions obey
`q[n+1]=(1+r-c)*q[n]-r*q[n-1]+c*anchor[n]` under the modeled assumptions.
At strength20/60Hz, `1/c` is about180. A0.1-world raster error alone becomes
about18world after dividing by c, before the other differencing terms. Final
render interpolation further separates measured output from hidden q. Fit or
bound whole response windows against measured quantization instead; do not
present such unstable inverse estimates as internal solver observations.

## Only if the logs justify another original experiment

No new original render is requested or performed by this handoff. If the
offline state logs leave a specific fixed-step-vs-output-clock ambiguity, first
write predictions for a **single new** owned scene: same visible carrier jump,
one inertia0 control, one inertia1/strength0 correction lane, and two identical
full-inertia strength20 lanes differing only in constraint FPS30 versus60.
Use their already accepted parameter interpretation (`retention^(60*h)`), one
animation and at most60 output PNGs at60fps. This varies the integrator lattice
inside the same export rather than re-rendering the accepted source.

Declare expected onset/magnitude/alternating-output signatures for each named
operator **before** collection. Keep carrier and child markers independently
measurable. The paired data/UI workers must approve and own fresh original
collection with strict own-process guards; this memo is not authorization to
automate a handed-over window or retry inconclusive background gestures.

Any eventual derived correction must retain all37 accepted static and990
dynamic comparisons, failure rollback, limits, angular/scale channels and
native/TS consistency, then address the explicitly pending moving-parent
cases at their original bounds. Until then F307/full physics parity stays
ACTIVE and the existing pending regressions remain pending.
