# F307 next action: use the newly established event-relative invariant

2026-10-29. This is a new comparison of already accepted measurement JSON,
not another model or render. No production changes, original commands,
application inputs, PNG reads/extraction, spring integration, rejected-model
reruns, parameter grid or changed bound. Default-live Setup is already
delivered; exact exported-frame phase remains active.

## New concrete result

At highest90, **all four stepped animations have identical measured affine
curves after their independently observed carrier jump**, over every available
overlapping output sample. The comparison includes all six components of
both parent/child frames in all four lanes, all three marker centers and
their accepted pixel counts. No numerical lag was fitted: the origin for each
sequence is its control carrier's first measured X80 sample.

At highest60, only the two early cases agree with each other and the two late
cases agree with each other. Early-versus-late responses differ by2.25 world
units. Thus the inert constraint's60→90 change eliminates the observed
early/late response-class difference in addition to changing restoring curves.
This invariant was not part of the earlier named scalar-model selection.

Inputs are unchanged accepted artifacts:

- Old60 `analysis/physics-dual-lane-phase-check.json`, SHA256
  `eb8d758e0a1988a95ba67414811dca8d90f2b4e72d238b52e656bb0fe2ef0c6a`.
- New90 private `physics-highest-fps-collection/extraction.json`, SHA256
  `1364c279181167db4948c635ce4d2e921c5ee0ff6b72384672ec0756b8bd455a`.
  Its independent original/source measurement gate is
  [physics-highest-fps-reference-check.json](../../analysis/physics-highest-fps-reference-check.json).

| Pair aligned at observed control jumps | Common samples | Old60 maximum affine/marker difference | New90 maximum affine/marker difference |
| --- | ---: | ---: | ---: |
| point2(12) / frame13(13) |47|0|0|
| point2(12) / point5(30) |30|2.25|0|
| point2(12) / frame31(31) |29|2.25|0|
| frame13(13) / point5(30) |30|2.25|0|
| frame13(13) / frame31(31) |29|2.25|0|
| point5(30) / frame31(31) |29|0|0|

For the full-inertia restoring lane the first eight new90 event-relative
values are `[0,.125,.75,1.625,2.875,4.375,6,7.875]` in **all four** sequences.
The old early cases start `[0,0,0,.4919265,1.25,2.375,3.7580735,5.375]`;
old late cases start `[0,0,.4919265,1.25,2.375,3.7580735,5.375,7.2419265]`.
These are measured outputs, not hidden integration ticks or f32 positions.

PNG file hashes are not all equal at new90 despite matching measured values:
46/47,24/30,23/29,24/30,23/29,27/29 respectively. The reason is not identified
here because no pixels were reread. Do not call the PNGs byte-identical or
claim all original rendering state is identical. The result is the precise
measured-affine/marker/count identity above.

## Why this is actionable without a new model

The source key events span different phases of an ideal90Hz lattice:
point2/point5 lie on integer ticks18/45; frame13/frame31 correspond roughly
to half ticks19.5/46.5. Stored canonical f32 key times remain the authority,
and the original hidden clock is still unknown. The observed identity means
that a future proposed outer schedule must explain the same sampled restoring
response across these different events, not merely improve one onset.

Use this as a **necessary discriminator** before considering a new source-backed
caller hypothesis. At each common event-relative ordinal, compare its four
new90 candidate curves without searching shifts. Because both observed curves
are identical and each retained world error bound is.25, their predicted
spread must be at most.5 by the triangle inequality. A greater spread already
rules out jointly passing both original curves. This is a necessary bound
derived from the unchanged.25 acceptance, not a new relaxed acceptance test.
Small spread is insufficient: full absolute curves, old60 behavior and ramp
must still pass independently. Do not force covariance by resetting at the
event; that would be an unobserved scheduler change.

This does not identify a replacement force law. It is a concrete invariant for
selecting the next diagnostic and rejecting another arbitrary event-phase
clock before implementation or a new collection. Reuse existing saved model
curves if checking this invariant; do not rerun rejected operators.

## An additional call-order exclusion from the same existing rows

New90 `frame13`, ordinal13, displays parentX80 and zero-strength/full-inertia
childX0. Replaying only completed90Hz boundaries through19/90 (about.21111),
then merely displaying current authored pose at13/60 (about.21667), would
not yet consume that event under the specified lattice. A final **Pose-only**
application cannot invent its−80 inertia correction, so it would show childX80.
That80-world discrepancy rejects this simple “drop final partial Update and
finish with ordinary Pose” scheduler for the current known correction semantics.
It does not rule out a different separately observed correction stage.

The same distinction appears at frame31. This is a counterexample to that
specific untested shortcut, not a new forward simulation/model fit. Current
native/TS Pose paths deliberately do not advance/correct history; rewriting
them from this exporter hypothesis would break their accepted frozen-preview
contract and is not authorized.

## Reproduction of the event-relative arithmetic

Read only the two measurement JSONs. For each sequence find its first row
whose control parentX equals80; for each pair compare all shared subsequent
rows at equal **integer event-relative ordinal**. Maximum over lanes, roles,
the six affine components and marker centers gives the table. Pixel-count
arrays also compare equal for every new90 pair. No original images, model
parameters, rounding rule or optimized alignment enters that calculation.

No newly proven supported-profile runtime defect was found in this pass.
The next safe action is to retain this invariant alongside the existing
control/correction requirements, and demand a genuinely source-backed caller
ordering observation before another bounded candidate. Do not repeat the
600 measured frames, highest-FPS experiment, six rejected operators or count
grids. [PHYSICS-NEXT-SOURCE-AUDIT.md](PHYSICS-NEXT-SOURCE-AUDIT.md) still describes
the unresolved source boundary; the new result narrows it without claiming
exact original physics completion.
