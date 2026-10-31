# F307 highest-FPS v2: full-scene predictions

2026-10-29, before new original collection. This supersedes the **unexecuted**
one-animation design in `PHYSICS-HIGHEST-FPS-PREDICTIONS.md`. Its private nine
frozen files remain unchanged. DATA identified that removing other animations
could confound export order/history; v2 retains all five animations and their
exact order/tracks. The complete input recipe now differs in **one field only**:
the inertia0/strength0 control constraint's FPS changes from60 to90. Other
constraints, skeleton, skins, slots, geometry and settings remain unchanged
apart from the new input/output file paths. Output is300 **new changed-source**
frames, not a rerun of the accepted baseline.

All artifacts are private under
`.local/research/physics-highest-fps-plan/full-scene-90/`. `plan.json` names
exactly the same four numerical hypotheses: indexed-f32/repeated-f32 reset/replay,
each with shared-highest90 versus independent per-constraint stepping. In all
cases the restoring lanes integrate forces at60; only the inert control has a90
force step. The fixed scalar operator, inherited accumulator rule, output target
and reset convention are unchanged. There is no new stage order, epsilon grid,
event hold, alignment fit or production solver edit.

The preparer reproduces2400 prior failed predictions bit-for-bit across the old
five-animation measurements. Those failures remain failures. New compatibility
cannot select a common original solver. The separate causal empirical null
retains every previously measured unchanged-lane curve, without fitting a spring.

| Animation | Indexed-clock full-lane shared/independent separation | Repeated-clock full-lane separation |
| --- | ---: | ---: |
| point2 | 2.214702606 | 2.214702606 |
| frame13 | 2.214698792 | 2.214698792 |
| point5 | 2.214702606 | .000007629 |
| frame31 | 2.214702606 | .000007629 |
| ramp | .928730011 | .417118073 |

These are maxima over complete predicted curves, not measured original values.
The late cases are nearly nondiscriminating for one named clock; do not claim
that every new animation must distinguish the hypotheses. All four models retain
the control/correction invariants. Every complete sprite rectangle is within the
unchanged board, with a minimum32-world-unit margin across all predictions.

The .001 parent-agreement check is strictly the spread among four simultaneously
measured parent origins in one frame. It is not measured-versus-modeled timeline
error. Parent/child comparisons to numerical curves retain the .25 bound; the
old ramp's roughly .04167 raster discrepancy therefore does not change a bound.

All300 samples, all four lanes, parent markers and full residual curves must be
compared at the retained .25 diagnostic bound. The outcomes remain explicit:
**MEASUREMENT_OR_INPUT_INVALID**, **NO_NAMED_NUMERICAL_MODEL_MATCH**,
**AMBIGUOUS**, or a compatible new-only prediction whose old baseline failure
still applies. A changed unchanged-lane curve rejects only the empirical
no-coupling prediction; unchanged curves do not disprove every shared clock.
Nothing here establishes full physics parity or authorizes a production change.

## Frozen v2 identity

| Artifact | SHA256 |
| --- | --- |
| `plan.json` | `a3dea3dbe04bdc4e7f91fa7d222869525baca3edaf17f3fc30137de873fcddbc` |
| `predictions.json` | `f2a42bcbc0b757d633b20051a0d8faa0f1a7c63b94904c81f2db0e55f41f16fa` |
| `freeze.json` | `91558c5019cf350cc5e3e2afcea0c515f66ce9bd961045903269b49e689c5565` |
| `highest-fps90.json` | `d3031700e4b84fe415a538c98517d8bff15ff275bccd81763d494987f8b7a4ac` |

`predictions.models[name][animation]` contains60 full output rows per animation;
`empiricalNoCouplingNull[animation]` contains the old measured values. Exact
intermediate states are in104,086,972-byte `stage-traces.jsonl`, bound by the
freeze ledger; reviewers can stream its hash. The nonauthoritative preparer
stdout summary is excluded from that ledger. All actual inputs, code, curves,
assets and stage traces are included. The new original `.spine` hash is null
until a separately authorized import binds it.

## Prepared collector and independent extractor

No collector has run. Helpers are in
`.local/research/physics-highest-fps-collection/`, with their hashes in tools.json.
The root coordinator owns execution after independent DATA/UI gates and exclusive
original-tool scheduling. `collect.ps1` requires the existing mapped W: workspace
and an explicit gate receipt matching these plan/prediction/freeze hashes. It
refuses all existing outputs, pins the installed4.3.26 package and performs only
import→JSON→PNG. Per-phase in-flight PID/start/path/argument ledgers and append-only
owned-descendant records support live waiting; it contains no kill or window-input
API. Failure retains evidence and does not retry. Existing protected windows are
never targets.

The Python extractor reads only the300 **new** PNGs, reusing the accepted palette,
centroid, fixed-board and affine checks. It reads old aggregate measurements rather
than re-extracting old PNGs. It verifies the full canonical JSON delta, all asset/
source/receipt hashes and a bounded independent Physics121 scalar-prefix
projection: actual stored step90 bits must be`3c360b61`; other steps remain
`3c888889`. Every other raw Physics float/boolean field must match the old source.
This raw prefix projection is not advertised as a general canonical decoder.

Five own synthetic checks pass: four-lane affine recovery, missing-marker
rejection, wrong-board rejection, zero residual for a complete known prediction,
and explicit rejection of all four wrong curves. A read-only projection check
finds all four60Hz steps in the existing owned source. This uses no original
commands and reads zero old PNGs. No actual new pixels or original result is
claimed by these preparation checks.
