# Animate drag release DATA gate — 2026-11-08

Before the dependent fix. Reuse accepted four-channel Setup-relative key/sample
evidence in `ANIMATION-UI-4.3.26.md` (Follow-up exact4.3.26 data observation),
`ANIMATION-DATA-4.3.26.md` and the transient working-pose preservation policy in
`ANIMATION-KEY-DRAFT-DATA-2026-11-06.md`. No new original gesture was observed.

Source-proven defect: `createViewport::previewOperation` computes a transform
from its captured gesture base. With constraints it calls `previewBonePose`,
which publishes that transformed pose as `renderedBones`. On release,
`workspace::editRig` calls `boneAnimationEdit(edit, renderedBones)`, applying the
same transform a second time. Translate can therefore double its displacement;
Rotate/Scale/Shear can also compound. The viewport's original gesture base was
the native frozen sample, not the published transient preview. Unconstrained
gestures do not publish that bone preview, explaining their different behavior.

FBones correction policy: reuse the retained frozen native local bones and
evaluated matrices for a frozen gesture's authoring conversion. Numeric fields
without a frozen gesture continue to use the current sampled working pose.
Commit exactly once relative to the captured baseline; retain Setup, unrelated
keys, existing curves, source f32 values, stale-pose rejection and one native
batch/history action. Auto Key off retains only the resulting working pose.
UI reference agent independently confirms preview-to-commit continuity is the
required interaction; exact original4.3.26 release behavior is unknown.

Verification must reproduce preview publication then the actual workspace
`editRig` route, including positive/negative X/Y movement, nonzero Setup and
animated parents, Auto Key on/off, other transform modes and cancellation.
Typed native replies prove frontend command intent only; real Session/browser
history/persistence remains a separate integration check owned by coordinator.

## Own product reproduction and focused verification

`node tests/animation-drag-release.test.mjs` before the correction failed with
preview world X58.798989873223334 versus committed84.79898987322333: precisely
one extra requested26-unit displacement. After correction,4/4tests pass,
covering12signed-X/Y and Rotate/Scale/Shear cases with Auto Key on/off, canceled
preview, numeric edit, stale epoch and two successive parent+child group drags.
The actual workspace route and production sampler/evaluator are used; native
responses are explicitly typed fixtures, not a second native engine.

Unchanged adjacent key/Save/resource draft regressions pass35/35 via
`node tests/animation-keyboard-drafts.test.mjs`,
`node tests/animation-save-drafts.test.mjs` and
`node tests/animation-resource-drafts.test.mjs`.
The existing real-Session Play→parent-drag browser scenario now also compares
frozen, preview and committed world matrices and the30-unit key offset; its
integration run remains coordinator-owned and is not claimed here.

No large build, original launch or scratch copies were created. Disposable
artifacts removed0bytes. Initial disk checks: Linux831GiB available; Windows
host C79GiB available. Coordinator owns final integration disk check/launch and
the single STATE/TASKS checkpoint.

## Fractional playback presentation comparison

The later coordinator browser run preserved the intended30-unit endpoint, but
one comparison missed its decimal-place threshold by0.000000545. The retained
native trace proves time0.994, held frame29.82, newly stored f32 key
frame29.81999969482422/value110, and native world X9.99994945526123 versus
preview10. The unchanged native sampler (`animation.rs::sample`) evaluates
seconds×FPS in f64 against stored f32 key addresses. At29.82 the next segment
toward value80 at frame30 has already begun. Independent interpolation followed
by f32 world conversion exactly reproduces9.99994945526123; raw arithmetic is
retained in ignored `animation-drag-f32-presentation-check.json`.

The browser test now separately verifies the actual stored key frame's endpoint
with its existing strict comparison, retaining the full30-unit displacement,
key value/address, epoch, single batch and unchanged Setup checks. Only nearby
unrounded presentation comparisons use explicit absolute0.0002 tolerance.
This is a bounded test policy for the own fixture, not a universal error bound
or an original-editor parity claim. No product arithmetic or sampling changed.
