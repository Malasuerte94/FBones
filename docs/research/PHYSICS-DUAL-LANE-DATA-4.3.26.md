# Physics input correction and restoration: new data audit

Recorded 2026-10-29. This is a new exact original4.3.26 experiment, not a rerun
of accepted clean-phase cases. No production solver change follows from this
memo alone. The independent report is
`analysis/physics-dual-lane-phase-check.json`.

## Directly measured

The coordinator collected three successful original commands (import, JSON,
PNG), all exit0/Complete with empty stderr. Source SHA256:
`917c2f3117a003d104619f770d20a90ef9e8a6eae59926d73444a8313158a4d4`.
The new own input has four independent lanes with the same animated carrier
translation and separate colored carrier/child affine markers. The measurement
worker invoked no original command and touched no GUI.

Independent extraction validates source/recipe/receipt hashes and measures
300 original PNGs: five animations ×60 rendered frames ×four lanes ×two marker
sets. All measured carrier positions agree across lanes; their transforms and
vertical lane positions remain valid. Coordinate measurement comes from marker
pixel centroids at4× scale, rather than nominal animation times alone.

| Event | Measured carrier jump ordinal | First strength20 child restoration ordinal |
| --- | --- | --- |
| point2 | 12 | 15 |
| frame13 | 13 | 16 |
| point5 | 30 | 32 |
| frame31 | 31 | 33 |

- Control (inertia0, strength0) follows the carrier to X80 in the same rendered
  frame as each measured carrier jump.
- Correction-only (inertia1, strength0) stays at world X0 throughout every
  stepped animation and the ramp, including the carrier's jump frame. Its
  relative position changes immediately by the opposite carrier displacement.
- Half inertia with strength20 immediately moves the child to X40, while full
  inertia leaves it at X0. Subsequent spring restoration begins at the ordinals
  above, rather than delaying the initial input correction.
- Initial full-inertia restoration samples are approximately X.492,1.25,2.375.
  Those are measured raster centroids, not exact internal floating-point values.

## Inferred and unknown

**Inference:** a uniform delay applied to both carrier correction and spring
integration contradicts this new fixture. Their observable phases are distinct.
The spring delay differs between the .2/.2166667 and .5/.5166667 step cases even
after anchoring to the measured parent jump.

**Unknown:** exact original accumulator state, update clock phase, float rounding
and integration scheduling. A rendered ordinal is not a direct observation of
an internal solver call. These measurements do not identify a universal phase
rule or justify claiming full physics parity. Other physics channels, timeline
mixing and runtime resets require their own evidence.

## Reproduction without rerunning the original

```sh
python3 .local/research/constraint-solvers/dual-lane-phase/extract.py
```

The helper reads the existing new receipts and PNGs and writes only its own
aggregate report. It does not overwrite accepted historical measurements,
launch an editor, or select a production solver phase.
