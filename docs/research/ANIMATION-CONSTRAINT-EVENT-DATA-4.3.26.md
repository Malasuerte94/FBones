# Constraint and Event animation DATA — Spine4.3.26

2026-10-30, research-only handoff gathered while DrawOrder/Deform is implemented.
No constraint/Event timeline product code is authorized by this note. Root alone
collected original input; DATA performed no Windows/original calls.

## Sources and evidence category

The new own inputeed254/source492c and receipts are retained in ignored
`animation-next-timelines-reference/`. Import99632/export107276 both observed
exit0/exact4.3.26/Complete with retained handles and no metadata error. This is a
new branch discriminator, not a repeated accepted0.9.1 batch. The complete6552-
byte independent parser and decisive domain/generic aliases are documented in
`ANIMATION-DRAW-DEFORM-DATA-4.3.26.md` and its direct gate report.

Optional-family comparison:
`analysis/animation-next-optional-reference-check.json`, SHA
52e4aa7ccaa63fcd63c36553f343e1b0d7497d5e643658244bac9e72233460d2.
Four IK, five Transform,35 Physics and three Event keys are captured.240
represented numeric comparisons have maximum1.907348635e−7 residual under the
unchanged5.1e−6 bound. The IK Compress omission below remains explicitly unequal;
no default is invented to make an unrepresented runtime field match.

## Direct IK and Transform key findings

Custom132 kind7 uses domain133 keys with f32 frame and five f32 lanes. New keys
vary one flag at a time on a valid two-bone chain, proving lane order:
**mix, softness, stretch, compress, bendPositive**. The flags are f32 zero/one;
bend-negative stores0, not−1. The typed target following keys is an IK56 domain
link; observed group19 follows target-source Bone12 with enum2. Do not assume
it groups under the first constrained bone just because most bone keys do.

At frame6, raw Compress is1 as explicitly imported, but canonical runtime JSON
omits `compress` on this two-bone key. This is **NOT_REPRESENTED**, and numeric
runtime equivalence is false for that field. The raw flag must remain preserved;
its omission is not evidence that the original binary cleared or rejected it.
Stretch and bend-positive changes do survive the canonical JSON. No simulation
or original key-UI visibility behavior was measured for these flags.

Custom132 kind8 stores six mixes in observed order Rotate/X/Y/ScaleX/ScaleY/
ShearY. Its five new mixed-mode keys prove six independent Bezier axes,24 runtime
control numbers, with conditional blocks on current OR previous Bezier. Every
axis has four incoming/outgoing f32 coordinates and four zero metadata bytes.
Target is a Transform65 domain link; group owner again follows its source bone.
This establishes key-data layout, not pending F308 Match/fan-in policy parity.

## Direct Physics scalar findings

Kinds23–29 map to inertia/strength/damping/mass/wind/gravity/mix, each one f32
scalar plus outgoing curve and one progress/value axis. Each track's new five
nonconstant keys exercise mixed Linear/Bezier/Stepped/Bezier/Linear and four
Bezier control numbers. Target is a Physics121 domain link and group19 is its
constrained Bone12/enum2. Mass keys store the requested literal mass values in
this observation; do not substitute an inverse-mass wire interpretation.

Prior exact source9b also captures kind30 reset, frame+curve0 with no scalar,
following the same constraint target. These are serialized inputs only. The
user-deferred moving-parent/export-phase Physics questions remain pending; no
new dynamics, intermediate frame pixels or mode/time/solver call-order proof
follows from importing/exporting these keys.

## Direct Event and audio metadata findings

Custom132 kind12 has counted domain133 frame/curve0 keys, each followed by a
statically typed domain Event-value record. No numeric class token for that
value is carried at this call site; do not invent one. The track appends an
Event-definition35 domain link. Global group19 is enum3 with null bone owner.

Definition35 observed field order is10(group108),4(default float),7(true),
3(signed zigzag integer),0(skeleton link),8(default volume),9(default balance),
2(name),6(audio path string),5(default string). The Event-value's field order is
6(balance),1(definition35 link),2(signed zigzag integer),4(string),3(float),
5(volume). Nonzero overrides identify the previously zero audio lanes directly.
The definition self-group and repeated default string resolve to the same typed
objects, independently checking reference arena accounting.

The generated own2250-byte WAV is merely a resource with a frozen hash. Audio
playback/renders were disabled and are not claimed. `tone.wav`, Setup volume.6,
balance−.25 and first/last key overrides survive the actual canonical export.
The middle key omits overrides and uses **Setup balance−.25**, not Setup volume.6.
This exact editor observation takes precedence over the unpinned current4.3
runtime parser's omitted-balance fallback expression.

Future typed Event support must preserve skeleton audio root as well as event
paths/defaults/keys and add resource safety/history/stable identities. Current
Scene's fixed audio-root/default Event assumptions cannot be silently retained
while claiming lossless support of this richer file. Unknown payload variants,
UI gestures, Event firing/loop/scrub semantics and actual audio playback remain
unmeasured. The entire composite stays inspection-only until every contained
family is supported with complete reserialization.

## Primary fallback and next action

The [current official4.3 runtime JSON parser](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.3/spine-ts/spine-core/src/SkeletonJson.ts)
provided input field names before collection. It is not patch-pinned editor
serialization evidence and its behavior is not copied into FBones.

Reuse these completed data observations after the current DrawOrder/Deform
milestone. First pair them with the next UI audit, then extend the bounded typed
codec/native commands and actual UI; finally collect one new independently
UI-authored export for that newly implemented profile. Do not rerun these
accepted reference imports/exports.
