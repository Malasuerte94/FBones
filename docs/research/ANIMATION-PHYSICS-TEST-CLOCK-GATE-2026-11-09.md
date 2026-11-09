# Physics Play pointer test — paired DATA/UI clock gate

2026-11-09, before dependent test correction. Read-only failed-trace/UI audit
and independent DATA arithmetic agree. No solver, product behavior, tolerance,
original operation or retry is justified by this finding.

The full local UI run's Physics Play pointer test fails only the presentation
sample versus f32 key-address X check: observed residual
`.000209808349609375`, existing bound`.0002`. All preceding assertions pass:
native Replay epoch, paused transport and selected parent, no pre-release edit,
correct30-unit drag, one key command, frozen epoch, and exact stored-key pose.

The trace proves these are two different valid temporal samples:

- Held display frame`29.880000000000003`; stored f32 key frame
  `29.8799991607666`, valueX110/worldX10; next existing frame30 is valueX80.
- Interpolation fraction between the stored key and frame30 is
  `6.993562764700064e-6`. Independently calculated presentation worldX is
  `9.99979019311706`; its f32 projection`9.99979019165039` exactly matches the
  native public result. Native authored X differs by less than`9e-13`.
- UI HUD X`9.999790193117065` agrees with that unrounded presentation sample.
  The old fixed near-key comparison fails without an evaluator mismatch.

DATA independently recomputed the same fraction/value from the retained keys.
Host-paced timing before the clock pause chooses different held frames across
runs. Pausing the clock only after Play therefore allows a sample close
to the next existing key; clock drift during the later mouse gesture is not
observed. This is a test sampling assumption, not observed Physics/Match error.

## Smallest correction and preserved contract

Pause the installed fake clock **before starting Play**, from sought frame18.
Then start Play and advance exactly250ms with `clock.runFor`, keeping transport
playing until pointer-down. Explicitly require the observed held frame to lie
strictly between21and27, inside the existing15..30 segment and away from the
frame30 neighbor. This makes the test's chosen temporal situation reproducible;
it does not clamp the product playhead or alter authoring/evaluation.

Preserve all existing Replay/epoch/selection, key-frame f32 cast and exact-key
resampling, one-history-action, Setup non-baking and numeric checks with their
existing bounds. Do not widen`.0002` or relabel the correctly evaluated29.88
edge as a product failure. The test continues verifying key-address precision
separately from presentation at the nearby f64 frame. A dedicated analytic
edge regression may retain the proven29.88 calculation without assuming its
preview/key difference is zero; this patch adds no second sampler or solver.

The coordinator archived the failed full-run trace/context under ignored
`.local/research/stabilization-2026-11-08/ui-full-first-artifacts/`, with the
run summary in `ui-full-first-results.json` alongside that archive:
122passed/1failed/0retries. The trace/context hashes below remain unchanged.
Use this retained archive, not the disposable shared Playwright output that
subsequent runs overwrite. The coordinator owns shared server/build/output.
This worker changes only the test clock and asserted segment after recording
this gate; full integration acceptance is recorded by the coordinator.
The coordinator's focused Physics UI run subsequently passes3/3 with no
failure/skip/retry; ignored `ui-physics-clock-results.json` beside the retained
archive owns that result. Full-suite and native-platform acceptance remain
separate.
Failed trace SHA256 is
`0dd2740fef0f109d290ff548b1ad0334eb66954ec6808c7654871321787de7ff`;
error-context SHA256 is
`ac98963a53ab073e5a968c4130f3bbe304d02ae12eba913ec3a8510288928acc`.
