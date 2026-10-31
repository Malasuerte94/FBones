# F308 active Transform graph: two static image measurements

2026-10-29, before original output. UI/measurement plan and own synthetic
extractor tests only: **zero original commands, GUI inputs or production edits**
by this worker. Root alone may execute two separately gated original4.3.26 CLI
current-pose PNG exports. No further GUI adapter attempt belongs to this batch.
The accepted37-static/990-dynamic corpus, ten Match actions and completed
Physics collections are reused as evidence, never rerendered.

## Scope and paired ownership

The preceding V2 manual-range navigation was not demonstrated. Root stopped
before numeric activation/type/Enter/Save, then normally closed its clean own
process with unchanged source. That input limit supplies **no manual range
policy result** and does not establish a numeric-adapter failure. See the
[V2 limitation](TRANSFORM-MANUAL-RANGES-ADAPTER-V2-PLAN.md). This new headless
experiment answers a different, renderer-observable active graph question.

DATA owns two new canonical binary sources, raw decoding and unchanged-field
proof. Behavior worker owns independent analytic alternatives and numerical
bounds in [the behavior plan](TRANSFORM-ACTIVE-GRAPH-BEHAVIOR-PLAN.md). UI owns
the own marker images, export settings and independent pixel-to-world pipeline.
No production evaluator is imported by that pipeline. Root owns actual CLI
execution/receipt and final interpretation; protected user windows are untouched.

Both sources have two sibling constrained targets under an asymmetric affine
parent, a separate source, Local/Local flags, partial destination mixes and no
physics/timeline/prior-constraint interference. Case1 has source fan-out without
destination fan-in. Case2 adds exactly one ScaleY→Rotate route, sharing Rotate
with source X. No metadata, geometry or other constraint setting changes.
Source order and complete frozen predictions are in the paired plan; this memo
does not derive expected poses from FBones's own renderer.

## Fixed artwork and independent calibration

New private resources are under `transform-active-graph-ui/images/`:

| Attachment / owner | Patch colors at local centers0,0 /16,0 /0,16 | Placement |
| --- | --- | --- |
| board / identity root | Opaque512×512 RGB40 background | Center0,0; scale1 |
| marker-a / firstTarget | Green / Red / Blue |64×64 region; local offset0 |
| marker-b / secondTarget | Yellow / Magenta / Cyan |64×64 region; local offset0 |
| marker-calibration / identity root | White / Orange255,128,0 / Purple128,0,255 |64×64 region; local offset−192,−192 |

Each marker contains three opaque8×8 patches, with the remainder transparent.
Existing board/a/b PNG bytes are copied unchanged from the accepted own corpus;
only the independently distinguishable root calibration artwork is new. No
original/user artwork is copied. The root remains identity; the old reflected
parent becomes its child, so target affine geometry is retained while the board
and root calibration stay fixed.

The root's known world patch centers are(−192,−192),(−176,−192),(−192,−176).
Their measured pixel centers define an independent2×2 image/world calibration
matrix and translation. Target positions are recovered through that matrix,
not an assumed pixel crop origin. Calibration must also agree with the fixed
4× identity camera: pixel matrix(4,0;0,−4), within.004 pixel/world-component,
and naive fixed-board root points within the retained.25-world bound. These
are predetermined measurement checks, not adjustable model fitting.

The entire root sprite box is[-224,−224,−160,−160],32 world units inside the
board. Independently frozen predictions check every full64×64 target rectangle
under all three models: each fits the board, targets/calibrator boxes are
mutually disjoint, and the minimum target margin is118.1101686. No occluded
patch may be silently measured from another cluster or omitted.

## Exact static export settings

Settings reuse the previously observed original schema with these explicit
new source-specific fields: exportType=current, skeletonType=single,
**skeleton='Own Active Transform Graph'**, scale400, output/input own paths.
The name is the canonical binary skeleton name confirmed by DATA; the old
JSON-imported name `skeleton` is not reused by assumption.

renderImages=true; renderBones/renderOthers/renderSelection/renderTitles=false;
maxBounds=false; fit/crop dimensions0; pad=false; transparent background;
quantize=false; msaa0/smoothing8; warmUp0; open=false. One current-pose PNG per
source, exactly two PNGs total, expected2048×2048 each. No baseline rerender,
warmup frame, animation sequence, GUI screenshot or original JSON export is
needed for this pixel discriminator. Any changed skeleton/input/output setting
must be bound by the coordinator's concrete per-case receipt before collection.

## Frozen extraction and comparison rules

Own private `transform-active-graph-ui/extract.py` reads PNGs/source bytes only.
It does not launch software or import product code. For the six existing pure
colors retain alpha>240, high channels>220 and zero channels<30. New root
mid-value channels require128±12, declared before outputs. Require one connected
color component of at least64 pixels for each of nine patches; missing or
multiple substantial clusters invalidate measurement. Centroids use pixel
centers, with no hand-picked sample, image translation or post-output threshold
search.

Calibrated three-point target measurements yield origin and both affine columns,
all six world components, patch centers and counts. Report every target in both
cases against every frozen model. Retain maximum absolute component bounds:
origin **.25 world**, each basis entry **.009**, all16-unit endpoint world
components **.25**. All tests must pass in both cases for a named model to remain
compatible. Case1 intentionally cannot distinguish the three fan-in models.
Case2's weakest predicted endpoint separation is1.949 world units, with basis
separation.1000941, both above the bounds.

Every case report binds actual source and PNG hashes; optional frozen prediction
comparison rejects a different source hash. The extractor labels output as
measurement-only until the coordinator's original-version/exit/source/settings/
resource receipts independently establish provenance. A generated synthetic
image cannot be relabeled an original result.

Wrong source/count/size, board/crop calibration, missing/ambiguous colors,
occlusion or unexpected normalization gives **MEASUREMENT_INVALID**. If all
named numerical alternatives fail, report **NO_NAMED_MODEL_MATCH**. Multiple
compatible models give **AMBIGUOUS**. No new model, changed tolerance, phase fit,
additional render or GUI fallback follows automatically from an outcome.

## Precollection assets and synthetic selftest

| Artifact | SHA256 |
| --- | --- |
| Case1 source | `7cd6c8f4175c5c09331ad7e88cfbf039f842c9fce2a49b28b53f27069ab18559` |
| Case2 source | `4d6a9d02d30357e7b0e1c050f90bf5109c78cf455d408167cb671444231a32c2` |
| Root calibration PNG | `75b99dbe614c4f8f7e18f625c1af1ec7ce0f82a01b40e8bf0d766dee9ef5c8be` |
| Shared settings template | `f01bceff9aa36a046557dd5d96b6902c32b1bfdeb77edced6ad28394a2a6154a` |
| Independent analytic predictions | `607be5197090fc1f62a5503a448dd64922182487fdef9c4a24c0249015545a22` |

`assets-receipt.json` binds every image/dimension and palette. Own extractor
selftest rasterizes all six case×model predictions independently, then measures
them through the same PNG pipeline. Six pairs pass with maximum origin error
.01590156, basis.00204140 and endpoint.01972091; wrong crop, missing patch and
duplicate color cluster reject. These are **synthetic algorithm checks only**,
not original render, antialias or solver proof. No accepted original image was
re-extracted or rerendered for this selftest.

UI measurement feasibility is ready, contingent on DATA's complete source gate
and root's immutable collection freeze. The root must bind exact helper/settings/
assets/predictions, unchanged sources, output cardinality and two CLI exits.
No original result exists or is claimed at this checkpoint. This plan alone
neither authorizes a command nor changes product behavior.
