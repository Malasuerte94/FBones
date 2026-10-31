# Transform sparse Offset/Mix controls: UI gate

2026-10-29. Read-only reuse of accepted exact4.3.26 captures and paired saved
fixtures; no new original invocation, input or product edit.

The decisive own capture is private `auto-scope-ui/match-offset-mixed-before.png`
(and the independent Properties-before capture of the same sparse recipe).
Its runtime routes are source X→Rotate and Y, and source ScaleY→ScaleX.
This captured recipe is WorldSource/LocalTarget; the paired XY rule in other
space combinations has not been directly observed. The unchanged original source
and the eight accepted Match actions are recorded
in [the original UI audit](TRANSFORM-MATCH-UI-4.3.26.md) and
[DATA audit](TRANSFORM-MATCH-DATA-4.3.26.md).

Directly visible:

| Section | Group | Numeric cells | Blank/absent cells |
| --- | --- | --- | --- |
| Offset | Translate | X11 **and Y−13** | Neither; Y is shown despite no source-Y route |
| Offset | Scale | Y−.1 | X blank |
| Offset | Rotate / Shear | None | Whole rows absent |
| Mix | Rotate | 0 | — |
| Mix | Translate | Y0 | X blank |
| Mix | Scale | X0 | Y blank |

Therefore Offset is driven by **source routes**, with the observed exception
that source-X translation exposes the **paired Translate X/Y group**. Mix is
driven by **destination routes**, separately per cell. Disabled-looking empty
partners retain compact group alignment; they must not become editable zeroes.
The prior shorthand “filter Offset cells by source” was incomplete.

Safe bounded FBones policy: retain original Rotate / TranslateXY / ScaleXY /
ShearY grouping, show both Offset translations when either source translation
is used, and filter the other Offset cells and all Mix cells by their respective
source/destination channels. The source-Y-only symmetry is an explicit reasonable
extension of the observed source-X group, not a second measured original case.
Hide an unused whole group. For an entirely unmapped constraint, show a useful
empty-state message rather than invent active fields; the original wholly empty
section layout is unknown. Preserve all hidden values and the24 nullable stored
ranges unchanged. Original Offset Match changes all six offsets even when some
controls are invisible, so visibility must never prune persistent data.

No general Match/manual-range semantics, slider-link behavior or zero-route
original parity is claimed by this gate.
