# Constraint evaluation evidence: Spine 4.3.26

Status: numerical oracle collected; independent evaluator in progress. This is
not a claim of complete solver or editor parity. Setup persistence and rendered
simulation are separate checks.

## Direct original-editor observations

All recipes and marker artwork are ours. A root-attached 512-unit opaque board
fixes PNG bounds; three distinct 8-unit color patches at local (0,0), (16,0),
(0,16) recover each marked bone's origin and both affine columns. Original
Windows Spine 4.3.26 imported the recipes, exported setup JSON and rendered PNG
at 400 percent. Quantized color centroids typically resolve origins within
0.1 world units and headings within 0.05 degrees. This is an image-based oracle,
not access to unrounded internal bone values. Marker occlusion and pixel
quantization are checked; no personal artwork is used.

Ignored reproducible collection:

- `.local/research/constraint-solvers/fixtures/cases*.json`: new own recipes.
- `collect-markers.ps1` and `collect-stages.ps1`: mapped-drive original CLI,
  `--update 4.3.26 --disable-audio --hide-license`, separate import, JSON export
  and PNG export phases. Existing projects are not overwritten or merged.
- `marker-collection*.log`, `marker-stages.log`, `marker-order-stages.log` and
  `sampling-export.log`: actual completion results.
- `extract-markers.py`, `measurements.json`: deterministic color-centroid
  extraction, both affine columns, fixed bounds and minimum pixel checks.
- Actual export settings were saved from an owned original GUI by the UI
  reference agent. `exportType` is `current` for setup pose and `animation` for
  animation; scale is a percentage. The derived presets change only recorded
  own paths, scale and sampling rate. GUI settings save is asynchronous.

The initial 38 cases yielded 865 images. Additional ordered-constraint and
30/120 Hz output-sampling cases extend that corpus; the aggregate report records
final counts. No completed foundation or earlier reference batch was repeated.

Measured static cases cover calibration with shear and unequal scales, one-
and two-bone IK, both bend directions, mix zero/half/full, compress, stretch,
softness, zero child length, affine and reflected ancestors. The identity-parent
IK targets agree with `atan2` and the two-link cosine law within pixel error.
Applied rotation does not overwrite exported setup rotation.

Transform cases establish independent source and target spaces, all six local
channels, channel offsets and mixes, scale addition, range remapping and reverse
clamps. Mapping examples give `toOffset + (sourceValue - fromOffset)*scale`;
clamping uses the unordered pair of endpoint values. Additive application
happens after mapping and clamping. Two constraints reversing order produce
separate rendered results; source reads must observe earlier applied results.

Physics cases cover X/Y force symmetry, angular versus shear-X response,
combined angular channels, scale-X, mass, damping, fixed step, mix zero,
animated parent translation and limit, animation reset and ordered constraints.
For a static Y spring with strength20, mass1, damping0.85, gravity10 and step1/60,
measured motion fits semi-implicit spring integration with force -1000 and
velocity retention0.85. A constant two-export-frame alignment fits this specific
60fps collection to RMS0.032 world units, maximum0.064. That is evidence about
this export pipeline; it is not a license to hardcode two frames in a general
playback solver. Output sampling and initial/reset phase remain under analysis.

## Secondary documentation, distinct from exact-patch proof

The official 4.3 runtime API at commit
`ee2a10936a103ac187d74f7709f855653e923eae` was consulted for the distinctions
between authored/applied/world transforms, ordered property mapping, spring
state and reset/update/pose modes. It is a pinned public 4.3 revision, **not
proof of correspondence to editor patch4.3.26**. These sources guide additional
oracle cases; product code is independently written and contains no copied
runtime or decompiled code.

- [Transform constraint data](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-ts/spine-core/src/TransformConstraintData.ts)
- [IK](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-ts/spine-core/src/IkConstraint.ts)
- [Physics](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-ts/spine-core/src/PhysicsConstraint.ts)

## Implementation boundary and unknowns

`solve::evaluate` accepts authored local poses, produces separate applied local
and world frames, and commits physics state only if the whole ordered evaluation
succeeds. Matrices use FBones columns X=(a,b), Y=(c,d). A rejected singular or
nonfinite evaluation does not change the saved SceneProject or caller state.
`Reset`, `Update` with absolute seconds, `Pose` without advancement, and `None`
are explicit engineering APIs. Timeline clock mapping must be validated when
playback is integrated; reset/time reversal never silently bakes simulation.

The current canonical scene profile supports normal affine inheritance and the
observed default scale-Y constraint mode. Other inheritance and scale-Y modes
are not represented and must not be inferred as implemented. Full angular
and longitudinal spring channels remain required; XY/gravity alone is not
completion. Global authoring switches are retained in the codec but their
editor cross-constraint editing workflow is separate from evaluation of the
stored effective values. Unevaluated/unsupported branches must remain explicit.

A local CFR0.152 and verified Temurin17 toolchain were tested in ignored research
storage. The editor package is not an ordinary JAR; only the obfuscated launcher
was readable. A passive own JVMTI startup observer was ignored by the launcher.
Neither attempt supplied solver evidence or changed any original binary,
activation state, global setting or user process. Proprietary output stays
ignored and is never distributed.

## Evaluator checkpoint and precise acceptance limits

Final collection now contains **51 new owned imported recipes plus two sampling
variants: 53 render cases / 1,205 images**. The six final probes add nonuniform
local IK scales, reflection on either local axis, world-space six-channel
mapping, reflected mapping source, and a constraint-free stepped-parent control.
All original import/data/render phases completed with exit0. The control proves
the parent's visible step occurs at0.2 seconds. Original import snaps the own
0.20001-second key to0.2; duplicate-time keys use the last value. Oracle tests
therefore use the canonical exported own animation timeline rather than the
pre-import key times.

The independent implementation is in `src-tauri/src/solve/` and remains behind
`scene-editing`. No existing rig/project/format/runtime/UI source was modified
by this solver task. `oracle.json` contains only our bone/constraint recipes and
numeric marker measurements, including canonical own timeline keys; no PNG,
original binary, proprietary implementation, personal project or local path.

Passing measured coverage:

- **35 static cases**, checking every observed bone origin and all four affine
  components. Bounds are0.45 world units for reconstructed origins and0.009
  per basis component, accounting for a marker located60 units from the bone
  origin. Cases include both bend signs, partial mixes, nonuniform/reflected
  local bones and ancestors, softness, stretch/compress, zero child length,
  mapping/clamp/addition, all local/world channels and applied-source ordering.
- **990 dynamic frames** across15 cases. Maximum observed component errors are
  0.066 world units for position and0.0074 for basis, within acceptance bounds
  0.25 and0.012. Coverage includes rotate, shear-X, their coupled combination,
  scale-X, X/Y forces, mass, retention, fixed step30, output30/60/120, mix0,
  animation reset and mixed Physics/Transform order.
- A separate direct moving-parent test verifies the initial impulse against
  original measured centroids: inertia0.5 on80 units gives40 units; limit100
  clamps displacement to100/60 units per tick. The explicit Reset/Update API
  produces those values without a special discontinuity pause.
- Failure tests cover bad pose count, NaN, invalid graph/time, singular inverse,
  and a late failure after physics would advance. Scene and caller physics
  state remain unchanged. Pose mode is repeatable and does not advance state;
  reverse time resets. A4096-step guard rejects excessive catch-up atomically.

**Known unresolved comparison:** the free-teleport original render starts
recovery later than this evaluator under the otherwise successful PNG clock
adapter, reaching a maximum3.352-world-unit difference. The limit100 version
is within0.192 units but does not resolve the shared phase question. Their
120 frames are retained in an explicitly ignored regression,
`original_physics_teleport_export_clock_unresolved`. They are **not** included
in the990 passing dynamic frames. No artificial freeze or image-frame delay
was added to production math to force a match. A one-fixed-step exporter clock
adapter explains the other trajectories; it belongs to tests, not the evaluator.
Exact original playback/reset/discontinuity parity remains **unknown**, and
F307 must remain active until that is understood and integrated.

### Moving-parent phase follow-up: clean timelines, 2026-10-29

Three **new** owned original4.3.26 imports/JSON exports/PNG exports add180frames:
one clean step at0.2seconds, one at0.5seconds, and a linear parent translation
from0 to80 over1second. Canonical exported key times are strictly increasing;
none contains the duplicate-time keys from the initial teleport fixture. All
three original CLI stages completed successfully. The already accepted static/
force-only corpus was not recollected. Private evidence is
`clean-phase-provenance.json`, `marker-clean-phase-stages.log`,
`clean-phase-measurements.json` and `analyze-clean-phase.mjs` under the ignored
solver research directory. Sanitized independent checks:
`analysis/physics-moving-parent-phase-check.json`.

**Proven:** every clean0.2step marker X matches the initial duplicate-time
teleport case exactly. Thus snapped duplicate-time animation keys do **not**
explain its recovery delay. The clean0.5step initially shows40 atframes30/31,
then40.25 atframe32; the clean0.2step shows40 atframes12/13/14, then40.25 at15.
This event-time dependence is additional phase evidence. The already collected
continuous-wind-before-step probe also follows the same free-step component
within marker quantization; the spring being asleep is not a supported cause.

**Observed comparison limits:** applying the existing force-validated PNG clock
adapter to these three cases gives maximum X errors3.35184,2.24952 and1.26276
world units respectively. The linear ramp demonstrates that the current
moving-parent comparison gap extends beyond teleport discontinuities. These
180frames are unresolved evidence, not an expansion of the990passing dynamic
frames. Their absence from the active shared oracle must not be read as a pass.

**Adapter precision fact:** it subtracts a float32fixed step from float64`n/60`
sample time. Atframe2 this lies just below one fixed step, even with the current
step-count epsilon. The remaining-time interpolation is therefore near the end
of a tick rather than its beginning. Force-only visible results can agree while
underlying state phase differs. A bounded independent sweep over float/double
clock arithmetic, startup offsets and interpolation choices did not find one
simple adapter satisfying both force-only and all clean moving-parent cases.
This fact does not identify the original editor's update/render ordering.

**No production adjustment:** neither Rust nor TS physics math was changed for
these probes. Adding a hardcoded inertia pause, per-event delay or relaxed
tolerance is not justified by the evidence. The next discriminating check is
the original export update/render sequence or an independently controlled
editor-preview physics clock. Until that is established, preserve the explicit
pending phase regression and do not claim general moving-parent parity.

Corpus ledger after this follow-up: the earlier main measurements contain
53rendercases/1205frames; two applied-pose decomposition cases add2frames;
two awake/double-step probes add120frames; these three clean cases add180frames.
Together that is60owned rendercases/1507frames, including the two earlier output
sampling variants. Accepted shared fixture coverage remains37static and990
dynamic frames, with the original120moving-parentframes explicitly ignored.

### Measured upstream and export replay hypotheses

A further research-only check uses the existing constraint-free
`physics-teleport-control` PNGs as an independent measurement of the animated
carrier's motion. Its child marker has zero local offset and no constraint,
so its observed0/80 X sequence directly measures that parent's world X. All60
samples match the canonical0.2-second step input exactly. Feeding these
measured positions to the evaluator for both the original free-step and clean
0.2-step cases produces **exactly the same** failing trajectory as JSON
sampling, including maximum error3.3518388. Thus an upstream JSON/PNG position
mismatch does not explain that case. The clean0.5-step and ramp PNGs contain
only a constrained-child marker; their carrier is not independently measurable
from the current images, and no such measurement is claimed.

A private independent one-dimensional baseline reproduces the production XY
trajectory to below1e-10. Changing force/inertia update order improves some
moving-parent comparisons but still exceeds the existing0.25-world-unit
bound. The official [Physics Simulate guide](https://en.esotericsoftware.com/spine-physics-constraints#Simulate)
documents export-time fast-forwarding from frame zero for each output frame.
That motivates a separate private reset/replay experiment; it is documentary
guidance, not direct evidence of the original internal loop. A bounded2,048-
hypothesis sweep of reset-per-output clocks, key/time float precision, final
step policies and force/inertia order finds no shared fit: its best worst-case
error is1.142172; the ramp remains0.708333 in that candidate.

No new original render operation, product-math change, special event delay or
tolerance relaxation was made for this follow-up. The numeric record is
`analysis/physics-measured-parent-check.json`; ignored helpers/results are
`analyze-measured-parent.mjs`, `measured-parent-analysis.json`,
`sweep-replay-order.mjs` and `replay-order-sweep.json` in the solver research
folder. A useful next discriminator is the relationship between animated
motion delta, spring-clock initialization and final export pose application,
preferably with a separately visible carrier marker. Existing accepted and
pending corpus coverage is unchanged.

Exact checks:

- `cargo test -p fbones-desktop --features scene-editing solve::`:8 passing,
  one explicitly ignored pending phase regression (latest native log under
  ignored solver research directory).
- Independent pure check crate:8 passing/one ignored; strict Clippy all targets
  succeeds. It depends only on the typed format crate and test JSON support.
- Release benchmark, own256-bone/60-mixed-constraint scene,1,900 measured frames
  after100 warm-up frames: median0.261ms, p950.284ms, maximum0.346ms in this
  environment. This excludes viewport drawing and animation sampling.
- `check-evidence.py` independently checks27 analytic/ordering/reset/sampling
  facts; sanitized result is `analysis/constraint-solvers-check.json`.

The evaluator uses a bounded ellipse-intersection search for nonuniform IK,
separate local/world channel application for Transform, and independent spring
state for position, angle and longitudinal scale. Descendants are recomputed
after changes. Its public errors and atomic state contract are engineering
choices, not claims about original-editor error messages. The caller must reset
after deliberate setup edits or timeline discontinuities; seek reconstruction
and a matching no-IPC-per-frame frontend evaluator remain integration work.
