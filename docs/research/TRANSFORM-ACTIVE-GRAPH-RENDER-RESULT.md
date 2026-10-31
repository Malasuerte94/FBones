# F308 active graph: actual two-image reference result

2026-10-29. **One predeclared model remains compatible: sequential-route-mix.**
The no-fan-in and fan-in cases both pass every target bound for that model.
This is a bounded original4.3.26 static-render observation, not complete
Transform, manual-range or Match parity.

## Actual collection and independent measurement

The coordinator executed exactly two new original4.3.26 Professional CLI
current-pose exports. Both exited0, reported the exact editor version and
Complete, and produced one2048×2048 PNG each. There was no GUI interaction or
old oracle rerender. This UI worker executed **zero original commands** and
ran only the already frozen own PNG extractor after collection.

The [predeclared measurement plan](TRANSFORM-ACTIVE-GRAPH-RENDER-PLAN.md),
[three-model behavior plan](TRANSFORM-ACTIVE-GRAPH-BEHAVIOR-PLAN.md) and
[DATA input gate](../../analysis/transform-active-graph-data-gate.json) remain
unchanged. Reverification after collection confirms all41 frozen files,
byte-identical source copies and four image assets per case. Concrete settings
change only input/output to the owned absolute collection paths; the current
pose/skeleton/4×/no-overlay/no-fit/no-crop settings are unchanged.

Sources are:

- No fan-in,886 bytes:
  `7cd6c8f4175c5c09331ad7e88cfbf039f842c9fce2a49b28b53f27069ab18559`.
- Fan-in,888 bytes:
  `4d6a9d02d30357e7b0e1c050f90bf5109c78cf455d408167cb671444231a32c2`.

The only scene delta is the appended ScaleY→Rotate route. Both original logs
contain a mapped-folder watcher warning; those warnings are preserved privately.
They are not suppressed or mistaken for rendering failure: actual exits,
completion, PNG cardinality/dimensions, source/settings/assets and measurement
checks pass.

The unit root calibrator is exact in both images: pixel centers
`(256,1792),(320,1792),(256,1728)` recover pixel basis `(4,0;0,−4)` with zero
fixed-board offset error. Each root color has896 accepted pixels. All target
patches exceed the fixed64-pixel minimum; all nine colors have one substantial
component per image. Neither fitting nor a changed threshold was needed.

## Comparison at the frozen bounds

Retain maximum absolute component limits of.25 world at origins,.009 for each
affine basis entry, and.25 world at16-unit marker endpoints. Every origin,
basis entry and endpoint is checked for both targets in both cases.

| Model | Maximum origin error | Maximum basis error | Maximum endpoint error | Joint result |
| --- | ---: | ---: | ---: | --- |
| Sequential route mix | .03332895 | .00344607 | .03332895 | Compatible |
| Old-base delta aggregate | .03332895 | .55547872 | 8.87679400 | Rejected |
| Last-route single blend | .03332895 | .56246040 | 9.01023191 | Rejected |

The no-fan-in case intentionally gives the same prediction under all three
models and passes all three; it validates the shared two-target/partial-mix
baseline. The fan-in case rejects both alternatives for **both** targets.
It distinguishes basis/orientation, not merely origins: those alternatives
preserve the same translated origins here. Choosing only origin measurements
would therefore miss the discriminator.

Frozen extractor SHA256:
`0609766fd6e23caeff34f4e7e41882aa5690df0953e99434e6c80ff6c06f66c8`.
Frozen predictions SHA256:
`607be5197090fc1f62a5503a448dd64922182487fdef9c4a24c0249015545a22`.
The sanitized [UI reference aggregate](../../analysis/transform-active-graph-reference-check.json),
SHA256 `2a2e9c51abb67222a4b5906a0c20a69195d18b0d686b170d9a6b887228b113f6`,
contains all measured targets, per-model residuals and provenance hashes.
Raw PNGs, original logs, concrete local paths and collection receipts remain
ignored/private; no original image/code is a product resource.

## Independent corroboration and limits

The DATA worker separately measured the same new images without importing the
UI pipeline or reading its actual result first. Its
[independent image check](../../analysis/transform-active-graph-data-image-check.json)
selects the same single compatible model. Subsequent read-only comparison finds
zero difference in measured world components and matching counts for all18
patches across the two images. The UI report was not changed to match DATA.

Separately collected Rust/TypeScript outputs also fall within these measured
bounds, but they remain production diagnostics, not the independent expected
values. No solver implementation was modified to make these results pass.

Directly supported scope: two sibling targets with the tested partial mixes,
Local/Local, Additive/Clamp off, source fan-out and ordered two-source Rotate
fan-in under one reflected affine ancestor. The retained numerical bounds do
not establish exact f32/libm instructions, arbitrary graph composition,
target/source hierarchy overlap, world/mixed target spaces, reversed route
order, singular or additive/clamped cases. No manual endpoint, null-clear,
numeric adapter, editor Undo or writable-cache synchronization result follows
from a static render. F308 remains active for those separately gated questions.
