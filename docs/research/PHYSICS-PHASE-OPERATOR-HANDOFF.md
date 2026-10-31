# F307 bounded operator diagnostic: no common operator selected

2026-10-29. Following `PHYSICS-PHASE-NEXT-HANDOFF.md`, six explicitly named
private scalar traces were logged over the existing five dual-lane animations.
No original command/input, PNG extraction, accepted corpus rerun, production
solver edit, tolerance change or free lag sweep was performed.

## Inputs and precise model boundary

The harness reads accepted `analysis/physics-dual-lane-phase-check.json` and
the original-exported own `dual-lane-phase/original-json/skeleton.json`. Key
times are cast back to their canonical f32 values; decimal recipe times are
not substituted. Stored step is `0x3c888889`, retention f32(.85), mass1,
strength0/20 and inertia0/.5/1 as appropriate for each measured lane. This
translation-only source has no forces and its generous limit is nonbinding.

Clock alternatives are repeated f32 additions, indexed f32(n/60) and indexed
f64(n/60). Each uses the already named export-adapter assumption: sample the
current animation pose, advance physics at max(0,currentTime-storedStep),
reset at0 and apply the existing `floor(total/step+1e-7)` boundary. These are
**candidate adapters**, not recovered original clocks. Scalar spring state is
modeled in f32; the indexed-f64 candidate changes the clock, not that state.

The two operators are current motion correction before integration, and
integration of the previous oscillator state followed by current correction.
The second is a bounded hypothesis about stage separation, not an invented
original anchor observation. Both retain explicit lag/interpolation output;
neither adds a fitted event delay.

```sh
python3 .local/research/physics-operator/diagnose.py
```

`analysis/physics-operator-diagnostic-check.json` is numeric diagnostic output;
private JSONL traces remain under `.local/research/physics-operator/`. Total:
six traces × five animations × four lanes ×60 ordinals =7200 rows. Each row
records canonical key bits, measured/sampled carrier, physics clock/delta,
remainder/ratio/step count/fraction, anchor and oscillator before input,
correction, each spring tick before/after damping, lag and final application.
Every lane's complete residual curve and both transition windows are retained.
No computed hidden state is represented as measured original internal state.

## Result: all six fail the complete five-animation comparison

| Clock | Stage order | Maximum world-X residual | Maximum sampled carrier error |
| --- | --- | ---: | ---: |
| repeated f32 | correction then integrate | 6.64560 | .04169 |
| repeated f32 | integrate then correction | 4.46177 | .04169 |
| indexed f32 | correction then integrate | 6.64558 | .04167 |
| indexed f32 | integrate then correction | 4.46175 | .04167 |
| indexed f64 | correction then integrate | 80 | 80 |
| indexed f64 | integrate then correction | 80 | 80 |

The .25 bound used to label first divergence is the existing diagnostic world
bound, not a new acceptance tolerance. No operator explains all lanes within
that bound. Small ramp carrier errors are raster centroid quantization; the80
error is a real stepped-key timing mismatch: f64(.2) precedes canonical f32(.2)
while the measured carrier has already jumped. Thus this indexed-f64 input
adapter is rejected before claiming anything about its spring timing.

The best-looking late-event subcase must not be promoted: repeated-f32 with
integration before correction stays within about.06165 for the full-inertia
point5/frame31 curves, but fails point2/frame13 by about4.46177 and ramp by
about.68327. There is no uniform justified phase correction.

For point2, measured full-inertia restoration is still0 at ordinals12/13/14,
then approximately.491927 at15. With a correctly sampled visible carrier,
correction-before-integration already produces.444443 at12; integration-before-
correction produces it at13. The logs expose a near-one interpolation fraction
and an immediate modeled spring tick, not an original hidden anchor. A later
two-tick accumulator crossing changes the visible sequence again. Consequently
“move correction after tick” alone does not explain the early-event plateau.

## Next action narrowed

Stop these six candidates; do not expand this result into another epsilon/lag
grid or hardcode a time-dependent hold. The unresolved boundary is when a
correctly displayed current carrier contributes to the spring-restoration
state, combined with the fixed-step/output sampling lattice. The visible
correction lane already proves immediate inertia compensation and must remain
separate from that unresolved restoration stage.

If a new original experiment is later authorized, the single FPS30/FPS60
discriminator proposed in `PHYSICS-PHASE-NEXT-HANDOFF.md` remains useful: it
changes the integrator lattice while keeping the visible jump and output clock
common. Predictions must be frozen from named models before collection; e.g.
an un-interpolated first scalar tick at displacement80/strength20 is about
1.77778 at30Hz versus.44444 at60Hz, while the displayed onset additionally
depends on each logged remainder/fraction. That arithmetic is not a predicted
original output or permission for another collection. No new experiment was
run here, and F307's moving-parent parity remains unresolved.
