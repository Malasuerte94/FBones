# F307 bounded replay stage-order diagnostic: both rejected

2026-10-29. Exactly two additional offline models were authorized after the
independently reviewed highest-FPS experiment. No original command, Windows
input, old/new PNG extraction, production edit or tolerance change occurred.
The models read the existing old60 and new90 measurements and canonical keys.

The new original source changed only the inert control's step. Independent DATA
review (`analysis/physics-highest-fps-reference-check.json`) verifies all7200
patch centroids and the cross-constraint FPS dependency. That observation does
not identify force-stage order or a complete clock. These two new models test
one distinct scheduling combination; the earlier six-model comparison instead
used continuous history with an output-minus-step adapter.

## Frozen before residuals

Private directory: `.local/research/physics-replay-stage-order/`.

- Plan SHA256:
  `e085bf6560b4292ee6e5274989fed2dd99587de010256ef3b9fbca84ac071466`.
- Helper SHA256:
  `746d96f69374966bc5d5d2f8b4e7fa670103b7228fd528d4da16eba4309ac37f`.

For each output/lane independently reset q/v/lag/remainder/lastTime at zero,
with the anchor sampled at zero. Replay on the skeleton's highest FPS:60 for
the old source and90 for the new source. Inner force steps remain60 for the
three unchanged constraints; the new inert control uses90. Targets are
f32(ordinal/60), with the exact final partial interval. The only two clocks are
the previously defined indexed-f32 and repeated-f32 constructions.

At every boundary, integrate the **previous oscillator state**, capture the
force displacement in lag, then apply the current anchor's inertia correction.
Keep the inherited scalar f32 force law, post-step retention, accumulator rule
`floor(total/h+1e-7)` and explicit lag interpolation. There is no output-minus-
step adapter, added lag, free phase parameter, epsilon search or new stage order.
Every curve uses the same rules across both sources and all five animations.

## Results at the retained .25 world-unit bound

| Clock | Maximum old60 error | Maximum new90 error | Joint result |
| --- | ---: | ---: | --- |
| indexed-f32 | 4.461752248 | 1.515190125 | rejected |
| repeated-f32 | 4.461752248 | 1.515190125 | rejected |

All4800 lane/output records are retained, including sampled parent inputs,
complete curves, residuals, first divergences, resets, each outer boundary,
ticks and interpolation. Private stage traces are127,315,858-byte JSONL.
The result is **BOUNDED_OFFLINE_COMPLETE_BOTH_REJECTED_STOP**.

Some partial cases fit more closely but cannot be promoted. Repeated-f32's old
late-event full-inertia errors are approximately .06167; its early-event error
is4.46175 and old ramp error .68329. Indexed-f32's new90 full-inertia ramp error
is .13471, but new stepped cases still reach1.51519 and the joint old data fail.
No common operator was selected.

Onset reporting uses **1e-6** and is explicitly separate from a **.25 output
magnitude crossing** and from the **.25 residual bound**. For example, measured
full-inertia ramp first exceeds1e-6 at old ordinal5/new ordinal4; it first
exceeds .25 at old8/new7. Those are image-output summaries, not observations of
hidden force ticks. The earlier private extraction summary's old6/new5 numbers
used a separately labeled .01 threshold; no measured values or full-curve
rejection were changed to reconcile them.

Sanitized aggregate: `analysis/physics-replay-stage-order-check.json`, SHA256
`fc6f38f3642e122bdba6d59865970d05c12719a6cbb9bb26b4e310a2eb59f272`.
Private complete result SHA256:
`c161443ed3c3f4fc71da022d4133e03dad4eddd8c6c58d8594e4057223b816bc`.
All frozen input and helper hashes were rechecked after evaluation.

Stop this two-model branch. Independent DATA review follows; any narrower next
hypothesis requires a separate coordinator decision and pre-evaluation plan.
Do not expand a grid, collect another original case, edit production or alter
the accepted37-static/990-dynamic corpus from these rejected predictions.
F307 and complete moving-parent parity remain ACTIVE.
