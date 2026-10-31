# F307 reset/replay: independent data gate

2026-10-29. Reuses the accepted five dual-lane timelines and the UI worker's
two predeclared private replay traces. No original command, application input,
new PNG, production solver or tolerance change occurred. The DATA worker did
not duplicate the spring simulation or rerun the UI worker's diagnostic.

## Documentation and exact reference are distinct

After reusing local evidence, the current primary
[Physics / Simulate](https://en.esotericsoftware.com/spine-physics-constraints#Simulate)
guide describes independently fast-forwarding each exported frame from zero
at the skeleton's highest Physics update rate. Its FPS section separates
continuous inertia correction from fixed-rate forces. This is a documented
clue, not proof of exact4.3.26 reset timing, f32 clock or interpolation order.

The existing original source has four constraints, all default60Hz, and five
animations. Its accepted original JSON supplies canonical f32-cast key times;
the stored step is0x3c888889. Export settings use60fps, warmUp0 and lastFrame=false.
All four carriers have identical translation keys per animation, and their
measured parent coordinates agree. Earlier six continuous-history traces used
a named output-minus-step adapter; those do not test this new replay hypothesis.

## Independent timeline/reset audit

Private helper `.local/research/physics-replay-data/audit-timelines.py` performs
**input scheduling only**, with no spring solver. Aggregate:
`analysis/physics-replay-data-check.json`, SHA256
`7f4c7025a165c05c61a839e89e0e65f1b14c556f16fe78425bb9dc40c243b991`.

Both proposed schedules target f32(n/60), n=0..59, reset0 for each output,
sample canonical animation at every replay boundary and use an exact final
target interval, without output-minus-step or fitted event lag.

- Indexed f32 boundaries form nested prefixes for every output. Therefore any
  deterministic fixed state operator produces the same answer under per-output
  replay and continuous history on **that identical schedule**, provided reset
  state and output application agree. Resetting by itself cannot add a delay.
- Repeated-f32 boundaries plus exact target are not nested prefixes at39 output
  ordinals: a prior exact final interval can be replaced by another boundary in
  the next replay. That schedule difference can change an operator's fractional
  state; it is not a free per-event hold. Its early non-prefix boundary at4 is
  before the stepped motion and has zero displacement/forces in this fixture.
- Both schedules supply the exact observed stepped parent, including the f32(.2)
  event. Maximum ramp input residual is.04167175, compatible with the existing
  raster-centroid quantization. A wrong visible stepped parent is not the cause
  of their early restoration error.

## Recorded replay results independently reviewed

The UI worker froze plan SHA256
`ad1b848f5a2c5d80125f4c72b8b824c2848b3ca2c8c7c810be23374e775547bf`
before measuring errors. Its result is private
`.local/research/physics-replay-ui/result.json`. DATA reviewed the literal reset
loop and independently checks its saved traces with
`.local/research/physics-replay-data/check-ui-traces.py`.

`analysis/physics-replay-data-review.json` SHA256
`25ec0ba47d5127dbe48ee9982661a863d64d030da2e01be3e232f1d6b0e7d655`
verifies600 output records,2360 fresh per-lane reset states at nonzero outputs,
exact targets/update counts, independent canonical parent samples, curve-to-trace
outputs and residual arithmetic. No old continuous state accidentally persists.

**Both named candidates fail:** maximum full-curve world residual is6.64557869.
For point2 at ordinal12 they already restore to.444442749 while the measured
original full-inertia output remains0; its first restoration is at15. Control
and zero-strength correction lanes remain correct. This rejects those two
particular fixed spring/clock/application models at the retained.25 diagnostic
bound. It does **not** disprove the documented replay mechanism or all possible
original operators. Stop these two candidates rather than expand a lag grid.

## Minimal next discriminator, not collected

The previously planned shared FPS30/FPS60 scene can distinguish force-lattice
behavior, but all lanes would share a highest60Hz outer replay. It cannot alone
prove per-output replay versus continuous simulation on a nested60Hz schedule.

A more direct test of the new documentation clue could change only the
zero-inertia/zero-strength control constraint's FPS from60 to90 in a **new**
own point2 source. All physically restoring lanes retain their accepted60Hz
parameters; the inert high-rate control changes the skeleton's documented
maximum without adding force. Compare one new60-frame output to the already
accepted max60 point2 measurements; do not re-export the baseline. A90Hz outer
replay has noncommensurate exact60fps output endpoints and therefore exposes
the outer replay lattice while leaving inner force steps unchanged.

This is a proposed discriminator, not an original behavior claim or collection
authorization. First freeze named model predictions for carrier/correction/
restoration, including exact partial intervals and board bounds, plus an explicit
no-model-matches outcome. Since the current fixed operator already fails the
accepted baseline, do not promise the new sample will select it or use this
proposal to alter production. The coordinator may instead keep the30/60 test
for the narrower force-order question. F307 remains ACTIVE.

## Precollection v2 full-scene gate

The earlier single-animation proposal above is superseded **before collection**.
Dropping four animations would add an export-order/history confound. The new
frozen recipe preserves all five animations in their original order and changes
literally only the inert control's FPS60→90; its planned output is300 new frames.
The rejected v1 artifacts remain unchanged and will not be collected.

Independent helper `physics-highest-fps-data/check-full-plan.py` consumes only
frozen artifacts and existing measurements. Aggregate:
`analysis/physics-highest-fps-full-scene-data-gate.json`, SHA256
`c70236dc45ed6592b27ec41d7bbff9dd3284f28deaa6f95be80e6e5d84e4b5d2`.
It verifies both nine-file ledgers, the one-field full recipe delta, identical
settings/assets,1200 frozen model outputs,2400 prior failed-curve f32 bits and
1200 empirical-null lane samples. Whole-sprite board margin is at least32 world
units. The large stage trace is stream-hashed; no spring simulation is rerun.

Plan freeze SHA256 is
`91558c5019cf350cc5e3e2afcea0c515f66ce9bd961045903269b49e689c5565`;
predictions SHA256 is
`f2a42bcbc0b757d633b20051a0d8faa0f1a7c63b94904c81f2db0e55f41f16fa`.
The measurement's .001 parent-agreement guard means **simultaneously measured
cross-lane parent agreement**, as confirmed against the collector. It does not
compare raster centroids to continuous timeline values: those comparisons keep
the existing .25 diagnostic bound, including the old ramp's .04167175 residual.

This is a DATA precollection gate, not a collected result. After import, exact
FPS/key bits and resource/marker validity must still be checked. Changed curves
can reject empirical invariance under this clean one-field intervention; they
cannot identify a unique solver. No-change does not reject every possible
shared-clock algorithm. Existing failed baseline models stay failed, and the
measurement-invalid, no-named-model-match and ambiguous outcomes remain explicit.
No original command or input was performed by this DATA worker.

## New max90 original collection and independent result

The coordinator completed exactly three new original4.3.26 phases: import,
canonical JSON export and300-frame PNG export. Source SHA256:
`9b0d39df427a72168b0cf6d93c81df85b3bc3a9af869c95764d65b3e3d487887`.
DATA invoked none. `analysis/physics-highest-fps-source-check.json` verifies all
324 receipt artifacts, version/terminal0 logs, envelope CRC64, each known
Physics121 scalar/flag and canonical key-time bits. Both decompressed sources
have5219 bytes: after normalizing only the original identity bytes12..28 and
control step f32, the **entire payload** equals the accepted max60 source.
Thus no animation, key, bone, attachment or other Physics field changed.

`analysis/physics-highest-fps-reference-check.json`, SHA256
`a347250aeebeefe0432101a2dfeb0265f2fea9e743d6267fd339f917b9220173`,
independently remeasures **only the300 new PNGs**, reuses the old300 measured
frames and verifies all9600 frozen-model residual values. It recomputes7200
colored-patch centroids/2400 affine objects exactly; accepted patches contain
at least870 pixels and all reconstructed affine matrices equal identity.
No old PNG extraction or spring simulation is repeated.

**Proven:** the one inert control FPS change alters other still60Hz restoring
outputs. The empirical no-coupling null fails with maximum3.0 world units;
control/correction lanes and measured input remain exactly unchanged in all
300 frames. Full-inertia first-nonzero ordinals for the four stepped animations
change15→13,16→14,32→31 and33→32. At the predeclared1e-6 reporting threshold,
ramp changes5→4; those first centroids are only.0080735, while .125 appears at
old6/new5. Onset reporting does not replace the unchanged .25 full-curve bound
or establish subpixel exact hidden-state onset.

**All four numerical candidates still fail:** independent clocks reach
3.71982574 maximum residual; shared-highest clocks reach1.51519012. The closer
shared result is not a selected common solver. Exact highest-clock staging is
still inferred, consistent with current documentation, rather than uniquely
recovered. No production operator/tolerance is changed.

A bounded next **offline** check is to freeze the already named
integrate-previous-state-then-current-correction operator on the new documented
per-output reset/highest-FPS schedule, with explicit inherited interpolation
and the two existing f32 clocks. Evaluate both max60 and max90 five-animation
sets without output-minus-step, new lag, epsilon or fit. Its earlier
continuous-history counterpart failed; combining it with this scheduling
clue is a distinct hypothesis, not recovered behavior. Require a common full
comparison and a failure outcome; stop it if it fails. No new original
collection is needed for that check. F307 remains ACTIVE.
