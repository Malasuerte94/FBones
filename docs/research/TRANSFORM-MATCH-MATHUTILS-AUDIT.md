# F308 public4.3 runtime arithmetic audit

2026-10-29. Source-backed research only; no original input, production code,
licensed runtime integration or change to frozen Local/World predictions.
The public `4.3` branch is not proof of proprietary editor4.3.26 internals.
Private source receipts pin commit `ee2a10936a103ac187d74f7709f855653e923eae`.

## Primary-source findings, before the bounded numeric check

[SpineUtils](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-libgdx/spine-libgdx/src/com/esotericsoftware/spine/utils/SpineUtils.java)
uses platform Math trig/atan2 with f32 argument/result stages. There is no atan2
lookup approximation here. Its degree-conversion factor is computed from
already rounded f32 PI: bits `42652ee0`, whereas the previous independent audit
used `f32(180/doublePI)`, bits `42652ee1`. Thus the earlier path was not bit-for-bit
this public helper. No rounding-to-decimal or editor range function appears in
this utility.

[BonePose](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-libgdx/spine-libgdx/src/com/esotericsoftware/spine/BonePose.java)
constructs the Y basis via trig of rotation+90+shearY, rather than the earlier
algebraically equivalent minus-sine/cosine expression. Its normal-inherit
matrix products and sums are float operations; origins add the parent last.
Public world-scale getters are positive magnitudes. Local decomposition can
relocate reflection into another scale/angle representation; it is not a
unique authored-channel inverse. The original saved Match samples' negative
X scale therefore cannot be obtained by blindly using those positive getters.

[TransformConstraintData](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-libgdx/spine-libgdx/src/com/esotericsoftware/spine/TransformConstraintData.java)
reads properties through the SpineUtils functions, including a difference of
two f32 atan2 results for world shear. It supplies runtime mappings, not editor
Match button/range-cache construction. The constraint's separate libgdx import
is used for clamping; it does not establish that Match uses libgdx atan2.

Next bounded check: one source-backed matrix/conversion path, retaining the
already inferred editor signed-X and unwrapped-shear field choice, then the
same previous fixed Q5 endpoint hypothesis. Compare the old four Properties,
old world/mixed Offset and new Local/World Offset observations. No precision
search, tolerance expansion or new original data. Record mismatches rather
than declare runtime source to be exact editor implementation.

## Result: that source-backed path is insufficient

Private `mathutils-audit.py` freezes its source receipt/one numeric path before
evaluating it. Independent arithmetic is confined to ignored research; no
runtime source is integrated or distributed. Aggregate:
`analysis/transform-match-mathutils-audit.json`, SHA256
`b5ca8b3a42fbf21076003d77e63e0f7c64005330bfb57969970e6e68bd82c48b`.

| Compared observations | Bit-exact | Maximum absolute difference |
| --- | ---: | ---: |
| Old four Properties editor endpoints | 67/82 | .0000305176 |
| Their runtime mapping fields | 68/83 | .0000457764 |
| Old World/Mixed and new Local/World Offset | 8/18 | .000480652 |
| Source-end Q5 countercheck using **actual measured** source starts | 14/20 | .0000457764 |

The utility's precise float constants and matrix expression do **not** recover
the editor Match implementation. New Local/World translation becomes a few ULPs
less exact than the already frozen independent candidate, while reflected-world
shear still misses by about.00048. Do not cherry-pick a helper per field or widen
that difference into a parity tolerance. The measured-start countercheck still
fails independently of matrix construction, so public trig arithmetic cannot
alone explain editor endpoint quantization. No decimal-rounding search follows.

**Remaining unknown:** exact editor world decomposition/precision, Match endpoint
construction/rounding, partial/null/manual endpoint synchronization, Additive,
singular and nonzero constraint/evaluated-stage behavior. The saved-field
preservation checkpoint remains valid; a general Match implementation is still
guarded. Frozen Local/World predictions remain SHA256 `56ce0df5…701ef7c1`.
