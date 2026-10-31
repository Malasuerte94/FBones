# F308 active two-target and fan-in behavior plan

2026-10-29. Before new original outputs. At most **two new own current-pose
PNG exports** are proposed; the root coordinator alone owns any original CLI
execution after the paired input/measurement gates. No old37-static,
990-dynamic, Match action or physics300-frame collection is repeated. This
worker sends no original commands/window input and changes no production code.

## Exact reference, secondary source and unknown behavior

Exact original4.3.26 baseline `567c2fe3…0792405` preserves four runtime links,
two ordered targets, both Local flags, and24 absent editor cells. It is a
**mix0 retention** observation, not active composition evidence. The accepted
37 static cases all have single-target Transform records and no destination
fan-in. Ten accepted Match actions also use zero mixes; they do not settle
this question. Reuse those observations without another export.

Pinned public4.3
[TransformConstraint](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-libgdx/spine-libgdx/src/com/esotericsoftware/spine/TransformConstraint.java)
and
[property definitions](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-libgdx/spine-libgdx/src/com/esotericsoftware/spine/TransformConstraintData.java)
provide secondary motivation for ordered per-route application with a
destination-specific mix. They do not establish proprietary editor4.3.26
active multi-target behavior. Existing independently written native/TS code
uses that structural interpretation. Its output must not be presented as an
independent original oracle.

Unknown before collection: whether the original applies each incoming route
to the already modified destination, aggregates changes relative to the old
destination, or resolves a repeated destination through a replacement rule.
This experiment does not infer how the editor creates/edits those links.

## Fixed two-case design

DATA owns the two codec-generated sources/recipes and independent raw input
gate. UI owns marker assets/current-pose export settings and extraction gate.
Behavior worker owns independent math below. All sources are our own.

- Insert an identity scene root for the board/calibrator; retain the old
  asymmetric affine root as its child `affineParent`. Source and the two
  targets remain children of that affine parent, so their authored/world
  geometry remains the old fixture's geometry before activating the constraint.
- Ordered targets remain `firstTarget, secondTarget`. Source is neither target,
  and targets are siblings: target hierarchy/source-overwrite interactions
  would confound the first bounded composition question and are excluded.
- LocalSource=true, LocalTarget=true, Additive=false, Clamp=false. Retain six
  baseline offsets `[7,11,-13,.2,-.1,19]` as canonical f32 values.
- Set mixes in channel order Rotate/X/Y/ScaleX/ScaleY/ShearY to
  `[.5,0,.25,.75,0,0]`. Other authored fields remain unchanged, and all24 editor
  cells remain absent. No prior constraints, timelines or physics.
- Both sources should have the same project identity/metadata, geometry and
  marker assets. Case2 differs from Case1 only by the extra route below.

| Case | Source rows in stored order | Purpose |
| --- | --- | --- |
| `two-targets-no-fanin` | X: From2→Rotate20..28 scale2, Y35..47 scale3; ScaleY: From.5→ScaleX1..3 scale2 | Check both targets with partial mixes under the same affine ancestor. Three named fan-in interpretations coincide here. |
| `two-targets-with-fanin` | Same rows/routes, plus ScaleY→Rotate20..28 scale8 as that second source row's additional destination | Distinguish composition of two different source routes into Rotate. |

The ranges are coherent with the exact retained baseline. Clamp is deliberately
off: source X plus global offset lies beyond the displayed span, preserving a
strong discriminator instead of collapsing both route values to the endpoint.
This tests current represented runtime mappings; it does not invent writable
endpoint synchronization.

## Exactly three named composition hypotheses

For source channel `s`, source global offset `o`, runtime source start `f`,
destination start `d` and route scale `k`, define `v=d+(s+o−f)*k`. For one
destination let `b` be its original target local value and `m` its mix.
Other target channels preserve their initial values unless a route writes them.

1. **`sequential-route-mix`:** walk stored source rows/destinations and replace
   current channel `c` by `c+m*(v−c)` after each route. This is the current
   FBones interpretation, independently projected here without importing its
   evaluator.
2. **`old-base-delta-aggregate`:** apply `b+sum(m*(v−b))` for the destination;
   incoming deltas all use its unchanged old value.
3. **`last-route-single-blend`:** only the last incoming route determines the
   destination, `b+m*(vLast−b)` once.

These are declared alternatives, not a claim that they exhaust proprietary
possibilities. First-route priority, averaging, unblended replacement or a
different ordered behavior is **NO_NAMED_MODEL_MATCH** if it fails every
declared prediction; do not add it after looking at pixels.

With the baseline channels, the two mapped Rotate values are approximately64
and21.6 degrees. Initial rotations are−25 and80. Case1 sequential rotations are
19.5 and72. Case2 predicts approximately20.55/46.8 sequential,42.8/42.8 under
old-base aggregation, or−1.7/50.8 for last-route blend. These rounded examples
explain discrimination only; full canonical-input local/world predictions and
their hashes must be frozen before original outputs and govern comparison.

## Independent mathematical projection and freeze

Private own helper:
`.local/research/transform-active-graph-behavior/project.py`.
It reads DATA's raw canonical sources through our independent bounded research
reader. It imports no production evaluator or public runtime implementation.
It computes all three local-channel candidates, then independently composes
the affine parent hierarchy and predicts both targets' six world components,
all three marker centers and full64×64 sprite corners. Canonical f32 input
values feed Python f64 arithmetic; this is an analytic numerical prediction,
not a claim of bit-exact proprietary float/trig instructions.

The helper refuses existing output, verifies five bones/sibling targets/one
constraint/all24None, source-row order and the single-route case difference.
It checks every model's board margins and pairwise target/calibrator sprite
box separation before collection. DATA source filenames/hashes, helper hash,
predictions hash, marker hashes and settings hash must be bound by the paired
freeze ledger. No prediction may be overwritten after collection.

Production Rust/TS calculations, if separately collected, are **diagnostics**:
compare them to the independently projected current-sequential model and
report disagreements, but do not derive expected values from them or count
their agreement as original evidence. Source mutation/returned-cache values
are outside this read-only plan.

## Image geometry and predeclared comparison

UI's marker plan uses an opaque512×512 identity board and400% current-pose PNG,
2048×2048, no viewport overlays, image fitting or cropping. Each target gets
its own64×64 marker with opaque8×8 patches at local centers `(0,0),(16,0),(0,16)`:
first target Green/Red/Blue, second Yellow/Magenta/Cyan. A unit identity-root
calibrator at `(−192,−192)` uses White/Orange/Purple, with world centers
`(−192,−192),(−176,−192),(−192,−176)`. Independent calibration must verify
image/world affine and board orientation before interpreting target data.

Retain origin world error bound **.25**, basis-component bound **.009** and
16-unit patch-endpoint world error **.25**. These are frozen numeric/render
bounds, not a new exact-ULP claim. Report every origin, four basis entries and
both endpoint residuals for both targets/cases. Every tested model must pass
**all** applicable bounds in **both** cases to remain compatible. The helper
also records model separation; no threshold is expanded after observation.

Palette/centroid rules and board/source/PNG count checks are owned by the UI
measurement gate. Missing marker, source delta mismatch, clipping/cropping or
invalid calibration is **MEASUREMENT_INVALID**, not a solver rejection. Model
outcomes are **one compatible named model**, **AMBIGUOUS**, or
**NO_NAMED_MODEL_MATCH**. Case1 failure cannot be repaired by fitting Case2.

One current-pose PNG per new source is sufficient; no animation frame batch.
No old static/dynamic PNG is rerendered. Broader source/target overlap, active
parent-child targets, reversed route order, world targets, Additive/Clamp,
singular transforms or arbitrary mixed graphs remain separate, explicitly
unmeasured branches. A successful result justifies this bounded composition
profile, not complete Transform or editor Match parity.

## Gate status

Independent analytic projection is now frozen, before any original output.

| Artifact | SHA256 |
| --- | --- |
| Case1 canonical source | `7cd6c8f4175c5c09331ad7e88cfbf039f842c9fce2a49b28b53f27069ab18559` |
| Case2 canonical source | `4d6a9d02d30357e7b0e1c050f90bf5109c78cf455d408167cb671444231a32c2` |
| Own analytic `project.py` | `e63ed0d9beeef89be60bb5c4fba38b2cac5d143e50319fe99bcb20616ac29155` |
| Full `predictions.json` | `607be5197090fc1f62a5503a448dd64922182487fdef9c4a24c0249015545a22` |
| Math `freeze.json` including transitive own reader dependencies | `6c0222b92e2153cd186cc6d5811b8d5a01fb9b200149eb40d14cbeff8060c59c` |

Private sources are under `transform-active-graph-data/{multi-target,fan-in}/`;
math artifacts under `transform-active-graph-behavior/`. Each hypothesis's
full target64×64 sprite boxes are within the board, mutually disjoint and
disjoint from the calibrator. The minimum target board margin across both
cases/all models is118.1101686 world units. The root calibrator's independent
box `[-224,-224,-160,-160]` is also inside the board. In Case2 the weakest
pair/target separation is .1000941 for a basis component and1.9490262 world
units at a marker endpoint, materially above the retained .009/.25 bounds.
Case1 is intentionally identical across all three composition hypotheses.

Paired complete-input/marker gates remain pending.
**No original collection is authorized by this memo alone.**
The coordinator may run only the separately approved two new exports after
both gates and immutable predictions are recorded. No production change is
authorized until the observed bounded result is independently compared.
