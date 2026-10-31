# F308 bounded f32/rounding audit of existing Match results

2026-10-29. Offline only: four accepted Properties and two accepted Offset
actions are read again, with zero original commands/inputs, no product edits
and no tolerance expansion. The new Local/World fixture prediction freeze
`56ce0df5…701ef7c1` remains unchanged. Baseline analysis takes priority over
this diagnostic when a new owned original-saved baseline becomes available.

## Exactly three fixed numerical paths

Private helper:
`.local/research/transform-match-local-world-data/math-audit.py`.
Its fixed definitions are recorded separately in `math-audit-plan.json`; it
does not alter `predictions.json` or select parameters from a search grid.

1. Existing independent f64 affine/trigonometric composition.
2. Canonical f32 channel sum, multiplication by f32(pi/180), sin/cos cast to f32,
   then per-operation f32 basis/translation composition.
3. Double degree-to-radian/trigonometric evaluation followed by f32 sin/cos,
   then the same per-operation f32 matrix composition.

The two f32 paths specify multiplication/addition association explicitly,
adding parent origin last. World extraction uses signed determinant-X scale,
positive Y magnitude, matrix X-axis angle and unwrapped relative-axis shear.
The f32 paths round each named primitive; no FMA, lookup table or guessed
alternate trigonometric approximation is introduced.

The single quantization hypothesis is a defined nearest-five-decimal operation:
`Q5(v)=f32(floor(f32(f32(v)*100000)+.5)/100000)`.
Predicted starts are Q5(extracted channel), source end is Q5(start plus the old
span implied by the first ordered destination), target end is Q5(start plus
that destination's old span). Runtime fields are then recomputed from those
predicted endpoints. This is one named candidate, not recovered UI code.

## Results: none explains all measured fields

Sanitized aggregate: `analysis/transform-match-f32-math-audit.json`, SHA256
`c6300bc716a0aa955fc8de57443f9f2a6809d0160e826938edd647ccd3cb5269`.

| Path | Exact endpoint values /82 | Exact runtime fields /83 | Exact Offset values /12 |
| --- | ---: | ---: | ---: |
| Existing f64 | 72 | 73 | 4 |
| f32 radians/trig | 68 | 69 | 5 |
| Double degrees/trig cast | 68 | 69 | 4 |

All endpoint/runtime candidates have maximum absolute error0.0000457764.
Offset maximum error is0.000488281 for f64 and0.000495911 for both f32 paths;
the dominant discrepancy is world/world shear. These are residuals, not new
acceptance bounds. More f32 casts alone do not recover the missing formula.

The already established21-route relation between **actual observed** endpoints
and runtime fields remains bit-exact. The table concerns endpoints generated
by the three hypotheses; it does not invalidate the accepted storage relation.

## Separate countercheck isolates endpoint arithmetic

To avoid blaming every endpoint discrepancy on world-matrix extraction, the
helper also starts from each **actual measured source start** and applies the
same Q5 plus old first-destination span rule. Only14/20 source ends match.
Examples that still fail despite an exact observed input start:

| Existing case/channel | Q5 candidate source end | Actual source end |
| --- | ---: | ---: |
| World/ScaleX | -.2657099962 | -.2657000124 |
| World/ScaleY | 1.998110056 | 1.998100042 |
| World/ShearY | 136.6095428 | 136.6094971 |
| Mixed/X | 60.48696899 | 60.48699951 |

Thus a single five-decimal endpoint rule is insufficient even independently of
decomposition. The data does not justify silently copying measured constants,
switching precision by case, adding fitted thresholds or widening tolerances.
Different endpoint formatting/arithmetic remains a distinct algorithm gap.

## Implementation implications and remaining unknowns

The typed nullable-cell codec and read-only inspection are already independently
accepted. They do not supply missing Match arithmetic. Preserve exact stored
values; never recompute loaded caches from these approximate candidates.

The upcoming two LocalSource/WorldTarget actions can distinguish translation
frames, space separability and angular/signed-scale branches using the existing
frozen hypotheses. They cannot alone identify every original trig, angular-wrap,
endpoint formatting, Additive, singular, evaluated-stage or manual range-edit
branch. Compare each observed field bit/side effect honestly before deciding
the next bounded algorithm experiment. This audit authorizes no original input.
