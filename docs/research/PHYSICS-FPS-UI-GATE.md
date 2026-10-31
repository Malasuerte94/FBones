# F307: FPS30/FPS60 reference UI and measurement gate

Recorded 2026-10-29 before a proposed new collection. This worker has invoked
no original command, GUI input, process attachment or accepted-batch rerun.
The coordinator owns collection, parameter/curve predictions and integration;
the data worker independently reviews them. No solver correction follows from
this UI gate. The full moving-parent acceptance remains open.

## Existing evidence reused first

- `PHYSICS-DUAL-LANE-DATA-4.3.26.md` and
  [its measurements](../../analysis/physics-dual-lane-phase-check.json): immediate
  inertia correction and later spring restoration are separately observable.
- `PHYSICS-PHASE-NEXT-HANDOFF.md`, `PHYSICS-PHASE-OPERATOR-HANDOFF.md` and the
  accepted six named offline diagnostics: none explains all five existing
  trajectories. Do not add a fitted hold/epsilon or rerun their original data.
- Existing exact4.3.26 `feature-ui/physics-inspector-observed.png`, reopened
  privately: FPS60 is a **Setup property of a selected Physics constraint**,
  distinct from Simulate, Deterministic, Reset/Reset All and Preview controls.
- Current FBones inspector displays1/step and writes step=1/FPS. Current preview
  scheduling advances at60Hz. Those are our implementation facts, not a
  recovered original export clock.

## Documented clue; not exact patch proof

After local evidence, the current official
[Physics / FPS](https://en.esotericsoftware.com/spine-physics-constraints#FPS)
guide identifies the constraint FPS as the force update interval, with inertia
correction applied continuously between force ticks. Its
[Simulate](https://en.esotericsoftware.com/spine-physics-constraints#Simulate)
section describes fast-forwarding each exported frame from zero using the
highest Physics update rate anywhere in that skeleton. Deterministic changes
editor replay behavior. This documentation is patch-unpinned; it does not prove
the exact4.3.26 float clock, sample order, reset convention or interpolation.

This supplies a specific new **reset/replay** hypothesis, rather than permission
to carry the previous continuous output-state adapter into a new experiment.
Constraint FPS, export FPS, simulation stepping, and monitor frame cadence
must remain separate terms. A shared skeleton with a60Hz lane may use a60Hz
outer replay clock even while another lane integrates force at30Hz.

## One new scene: observation design

The coordinator's proposed scene has one animation stepping each carrier from
X0 toX80 at canonical f32(.2), four independent vertical lanes and60 output
PNGs at export60fps. Only the following lane parameters differ:

| Lane | Inertia | Strength | Constraint FPS |
| --- | ---: | ---: | ---: |
| control | 0 | 0 | 60 |
| correction | 1 | 0 | 60 |
| restore30 | 1 | 20 | 30 |
| restore60 | 1 | 20 | 60 |

Use the existing own512×512 board, marker-a and marker-b PNGs and validated
export settings, with no overlays, fitting, warmup or changed background.
This is a new per-constraint-FPS comparison inside one shared export, not a
re-export of an accepted scene at another output FPS. No original gesture is
required: controlled CLI import/export can supply the reference outputs.

### Marker separation and identifiability

Read-only inspection of the existing own marker assets finds64×64 textures,
each containing three opaque8×8 patches. The alpha bounding box is
(28,12)..(52,36), with192 opaque source pixels. Parent uses yellow/magenta/cyan;
child uses green/red/blue, permitting independent affine origins and axes.
The three patch centers provide two16-unit basis directions, not just a single
point that could conflate translation and deformation.

Reuse lane Y centers -168,-56,56,168, parent marker offsetY=-24 and child
offsetY=+24. In world coordinates parent colored content occupies laneY-28..-4,
child content laneY+20..44. The48-unit separation of marker origins leaves a
24-unit vertical gap between their colored bounds. Neighboring lanes have a
40-unit gap between colored bounds. A ±48-unit crop around each lane contains
both marker sets with at least4 units of margin. Full64×64 transparent image
rectangles remain inside the512×512 board for these static Y positions.

At4× scale the unchanged board fixes a2048×2048 output and a known world/pixel
origin. Neither lane's parent nor child may leave it. Before collection the
coordinator must check **every named predicted curve**, including overshoot,
against board/marker bounds, not crop or normalize failing frames afterward.
Reuse the existing palette/centroid/affine extractor structure in a NEW output
directory; retain existing accepted measurements unchanged.

The correction lane must stay worldX0 through the jump, while the control lane
must follow the independently measured carrier. These are reuseable exact
reference invariants for this translation-only profile. Observe restoration
onset relative to that measured carrier, not a guessed nominal output time.
Every frame must expose all four parent origins and child affine markers.
No meaningful phase claim can be made from screenshots with bones/gizmos over
the patches or from a carrier that itself fails the shared-motion check.

## Required prediction record before any new original collection

The UI gate approves measurement feasibility, not an unrecorded numeric curve.
The coordinator must freeze a machine-readable prediction file and its hash
before collection, with paired data approval. It must contain:

1. Source/asset/settings hashes; every f32 parameter/key/step bit pattern; one
   animation and exactly60 output frames; independent constraint/output FPS.
2. Named model definitions including continuous versus per-output reset/replay,
   outer highest-FPS clock, time construction, reset/input/tick/interpolation
   order and exact final partial step. No free event delay, per-frame alignment
   fit or post-observation epsilon choice.
3. Full60-sample predicted parent and child series for each lane, and exact
   predicted onset ordinals and alternating-output patterns. Scalar first-tick
   magnitudes near1.77778 at30Hz versus.44444 at60Hz alone are not predictions
   of the actual interpolated PNG values.
4. Existing measurement bounds and fixed discriminator/rejection rules,
   including how to report that **none** of the models matches. Missing or
   overlapping markers fail the measurement, not a candidate by selective data.

Only after those conditions are met should the coordinator execute the already
scoped new experiment. This gate does not ask the user for permission again and
does not authorize using a user-owned window. No collector was run here.

## Bounded offline replay proposal before a new oracle

First test the documentation-motivated reset/replay hypothesis against the
already measured five animations. The private experiment is diagnostic only:

- For each output ordinal independently initialize the four scalar lane states
  at time0. Read the existing original-exported animation keys, with their
  f32 conversions explicitly recorded; do not replace them with recipe decimals.
- Replay from0 to that ordinal's current animation time on one shared highest
  rate60Hz outer clock. Give the final interval its exact remaining duration;
  do not subtract a hidden frame or insert an event-dependent hold.
- Use the already fixed scalar f32 spring/inertia model and its documented
  retention interpretation. Record reset, sampled carrier, old/new remainder,
  per-lane tick counts, lag/fraction and final visible application. Distinguish
  modeled internal samples from actual measured markers.
- Predeclare clock construction alternatives only if necessary (e.g. indexed
  f32 boundaries versus repeated-f32 boundaries plus final remainder). Their
  definitions must be fixed before evaluating errors; this is not another grid.
- Compare the complete carrier/correction/restoration/ramp curves at existing
  bounds, including the early/late event windows. A failure falsifies that
  **specified replay model**, not every possible original replay implementation.

If this bounded replay already explains or rejects the relevant ambiguity,
report that before collecting anything new. It cannot change production or
turn prior moving-parent failures into passes. The new30/60 scene remains a
planned discriminator until its numerical hypotheses are frozen and reviewed.

## Offline reset/replay result, before any new FPS collection

The private plan was frozen before evaluation at
`.local/research/physics-replay-ui/plan.json`, SHA256
`ad1b848f5a2c5d80125f4c72b8b824c2848b3ca2c8c7c810be23374e775547bf`.
The bounded helper tests exactly two named outer clocks, indexed-f32 and
repeated-f32, each stopping at the exact output target f32(ordinal/60) with an
exact final partial interval. Each output resets independently at0. The fixed
scalar f32 correction-before-integration model, lag/interpolation and existing
`floor(total/step+1e-7)` boundary were retained. No output-minus-step adapter,
per-event delay, new epsilon or expanded model grid was added.

Both candidates fail the complete existing five-animation comparison at the
retained.25-world diagnostic bound. Each has maximum residual6.6455786945;
carrier/control/correction residuals remain at most.04167175293, consistent
with existing ramp raster quantization. The meaningful failures are spring
restoration rather than an invisible or incorrectly jumping carrier.

| Existing animation | Indexed-f32 full-inertia max error | Repeated-f32 full-inertia max error |
| --- | ---: | ---: |
| point2 | 6.64557869 | 6.64557869 |
| frame13 | 6.64557488 | 6.64557488 |
| point5 | 4.46174843 | 2.25711281 |
| frame31 | 4.42549133 | 2.25712044 |
| ramp | 2.14011002 | 1.91701889 |

For point2 both predict visible restoration approximately.44444275 at ordinal12
while the original measured child remains0; original restoration begins at15.
Reset/replay with these literal clocks and this fixed operator therefore does
not resolve the earlier phase problem. Their differing late-event results are
not a reason to select whichever model fits a convenient event.

Private `check.py`, full per-output replay stage traces and complete residual
curves remain under `.local/research/physics-replay-ui/`. Result JSON SHA256:
`a2d7ec5015ba5f8a86f26dcf67f897da3564b5a6f307677edd7e9f8e79c2afb7`.
Animation key times are explicitly f32 casts of the existing original runtime
JSON; this is not a new observation of private editor key/time handlers. The
worker ran zero original commands or GUI inputs and changed no production code.

This rejects **these two specified candidates**, not the primary documentation's
general reset/replay description or every possible implementation. Stop the two
models here. The coordinator/data review must decide whether another narrowly
motivated offline distinction exists or whether the already scoped new30/60
experiment is necessary; its exact curves still must be frozen before collection.
F307 moving-parent parity remains unresolved.

## Superseding highest-FPS90 collection feasibility gate

The coordinator's new frozen plan is
[PHYSICS-HIGHEST-FPS-PREDICTIONS.md](PHYSICS-HIGHEST-FPS-PREDICTIONS.md).
This supersedes the uncollected30/60 proposal above. UI/reference review on
2026-10-29 used read-only Python JSON/hash comparisons and Pillow inspection of
the own marker PNGs; it ran no original commands or GUI inputs.

Every file in private `physics-highest-fps-plan/freeze.json` matched its frozen
SHA256. Its freeze hash is
`cb9d649dd390278ca78cf423ac828572025d1ce08053705ef2be86f714a2db76`.
Comparison with the accepted old recipe confirms that the new recipe removes
frame13, frame31, point5 and ramp, retains point2 exactly, then changes only the
control constraint's FPS60 to90. The other three constraints, scene, artwork
and selected animation tracks are unchanged. Removing four animations is an
explicit experimental choice, not a literal one-field whole-source mutation.

Settings differ from the previous accepted settings only in input filename:
60 output FPS, scale400, lastFrame=false, zero warmup, no overlays, fit or crop.
The opaque512-square board and both64-square marker textures have the frozen
hashes. Each texture has three distinct64-pixel opaque color patches and alpha
bounds(28,12)..(52,36). Existing lane crops and six-color identification remain
separate; the four frozen numerical predictions keep every complete sprite
rectangle inside the board with at least32 world units of margin. All four
models and the empirical no-coupling null cover all60 output samples.

**UI/measurement feasibility gate: approved before collection.** This proves
that the planned predictions can be distinguished and measured, not that the
unobserved original will follow them. Bind the newly generated original source
hash and verify imported FPS90/60 and canonical parameters before interpreting
the PNGs. Unexpected count, dimensions, marker visibility, carrier/control,
board bounds or imported parameter normalization must stop interpretation.
Retain the frozen.25-world diagnostic bound and every-model/no-model/ambiguous
outcomes; no timing realignment or new collection follows automatically.

### V2: retain all five animations; supersede the reduction

Before any collection, the coordinator rejected the animation reduction as a
possible history/order confound. The independently reviewed replacement is
private `physics-highest-fps-plan/full-scene-90/`; its plan hash is
`a3dea3dbe04bdc4e7f91fa7d222869525baca3edaf17f3fc30137de873fcddbc`
and freeze hash is
`91558c5019cf350cc5e3e2afcea0c515f66ce9bd961045903269b49e689c5565`.
The earlier one-animation files remain unchanged and unexecuted.

Read-only UI audit verified every frozen file hash, streaming the large stage
trace without executing its preparation. A separate full JSON comparison with
the accepted five-animation recipe establishes the **literal single-field
delta control FPS60→90**. All five animations, their order and tracks, the other
three constraints and complete scene are unchanged. Settings differ from the
accepted settings only in input filename. Their animationType=all,60 output
FPS and lastFrame=false now specify300 new frames,60 for each retained branch.
This is a changed-source experiment, not a repeat of the accepted old render.

**V2 UI/measurement feasibility gate: approved before collection.** Marker
assets and raster settings remain bit-identical to those checked above; every
model/animation/lane full sprite bound retains at least32 world units of board
margin. All four numerical models and the empirical null contain60 samples for
each of the five animations. The original source-hash/imported-parameter,
frame-count, marker/carrier/board and no-model/ambiguous interpretation guards
remain required. This review executed no original command or GUI input and
changed no production code. The V1 gate is historical; this V2 gate applies to
the proposed300-frame collection.
