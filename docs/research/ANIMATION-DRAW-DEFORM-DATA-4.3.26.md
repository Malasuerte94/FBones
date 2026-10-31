# Draw-order and deform animation DATA audit — Spine4.3.26

2026-10-30, reference-only follow-on while slot authoring is validated. No product
edits or Windows/original calls by DATA. F105 remains ACTIVE; the already collected
own source9b7f4c7e is reused, never re-imported/exported or rendered here.

## Proven retained runtime evidence

The exact4.3.26 composite import55460/export80452 both exited0/Complete. Source
`9b7f4c7e4cab0972c4eb8e5248fa74a385c7a72664aab4dced63dd2adc8e9c23`
and receipts are ignored `animation-timelines-reference-v1/`. Own inputbb15 has
separate named animations, so unrelated serializer families can be inspected
independently. `analysis/animation-eight-families-runtime-reference-check.json`
compares all56 runtime keys/220scalars, maximum5.882352938e−8 at unchanged5.1e−6.
This is runtime JSON evidence, not an editable binary profile.

`02-draw-order` contains Setup order at time0, a two-slot swap at.5 and Setup
order at1. Input offsets switch+1/initial-none−1 canonically export as switch+1
alone. Independent full-permutation comparison verifies equivalence; do not
require the same redundant offset list or infer chronology from JSON sorting.

`03-unweighted-deform` and `04-weighted-deform` each retain three keys at0/.5/1,
with first outgoing Bezier and middle Stepped. Unweighted channels are eight
offset coordinates for four vertices. Weighted channels are16 offset coordinates
for eight positive influence entries. At endpoints the omitted arrays mean zero
offsets. The unweighted middle JSON trims its trailing zero; expanding to the
known complete dimension preserves all input offsets. Actual middle vectors and
four absolute time/progress controls remain in the own recipe/export, not copied
from original artwork. This collection does not measure animated original pixels
or how weighted deform changes under later influence insertion/rebinding.

## Targeted draw-order binary observation

Private `animation-slot-data/read-future-v1.py` extends the unchanged generic
reader for the already observed primary slots and the next draw-order track;
it stops deliberately at deform kind6. `future-partial.json` preserves that
partial graph. No whole-composite canonical claim follows.

Observed domain group19 has field4=true, field2 track array, field7 nullable
reference-capable enum4, field1=null. This differs from Bone-owned group19's
field7enum2/Bone12 link and must not be coerced into a bone or slot track.

Custom domain132 kind13 has a generic counted list of domain133 keys. Each key
has f32 frame0/12/24, curvecode0 and a generic counted object list. Empty lists
at0/24 reset to Setup. The middle list contains one domain record39, with wire
field order1 then0: tag1 raw varuint2, tag0 direct Slot13 link to switch. The
matching runtime offset is+1. Thus this positive case proves the record/slot
link and2→+1 association. A signed-zigzag interpretation agrees with existing
positive signed-array encoding but **negative draw-order scalar encoding remains
inferred**, since canonical export removed this fixture's redundant negative
entry. Do not claim a measured negative bit pattern or arbitrary permutation
serialization yet.

Separate order timelines should sample a transient slot permutation. Setup slot
order, inventory ownership and clipping end identities remain authored state;
a frame change must not reorder/serialize them or create Undo history. This is
an integration requirement, not a claim about original internal implementation.
Dynamic clipping must be validated against the sampled order and active clips.

## Deform binary boundary — incomplete

The next observed custom132 kind is6 for both named deform animations. Its
known133 frame sequence is0/12/24. Initial bytes agree with outgoing curve1 and
one axis of incoming/outgoing progress handles; nonconstant middle curve2 and
last curve2 are visible. Its payload includes a dimension8/16 and a compact
zero/nonzero vector representation not yet independently decoded. Treating that
payload as an ordinary counted float array does not consume the zero endpoint
and populated middle records consistently. Do not guess past the compact vector,
use the array's selected bytes as a complete parse, or discard unmodeled fields.

The next bounded DATA action is to decode that compact vector from the existing
zero/nonzero/zero U/W pair, then validate every dimension/value/reference and
reach the next family boundary. Only after complete record recovery may a typed
codec be proposed. Existing supported geometry/binding serializers are reusable;
a deform track is distinct from editing Setup mesh vertices or rebaking weights.

## Primary documentation fallback, patch version unspecified

The current official branch4.3
[SkeletonJson.ts](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.3/spine-ts/spine-core/src/SkeletonJson.ts)
uses slot offsets to build draw order, and attachment-targeted deform arrays with
optional sparse offsets. Weighted and unweighted deformation use different
coordinate counts. These runtime operations help interpret our own exported
fixtures; they do not establish editor classes39/132/133, compact vector layout,
original authoring gestures or arbitrary-pose GPU parity.

Reproduce local boundary inspection:

```sh
python3 .local/research/animation-slot-data/read-future-v1.py
python3 .local/research/animation-slot-data/check-runtime-families.py
```

Do not repeat accepted original batches. A future new independently authored
UI-source export can close a newly implemented family; no such draw/deform UI
acceptance exists at this checkpoint.

## Compact-vector hypothesis now consumes both deform families

A subsequent targeted local reader variant `read-future-v3.py` consumes both
kind6 families, the next IK/Transform/Physics tracks and stops at Event kind12.
`analysis/animation-draw-deform-prefix-check.json`, SHA
73bfbe238d8c89b544ebffff2e8e474edcf64974ba2e6fe1958bbf527f154d03,
compares the three draw-order and six deform keys:89 scalars, maximum
1.192092891e−8 under unchanged5.1e−6. This supersedes the earlier kind6 stop as
local progress, **not a whole-composite parse or editable codec claim**.

The fitting compact representation is an outer generic reference, dimension8/16,
then a nullable inner generic reference. Present inner data has an observed
integer equal to the number of nonzero coordinates. Count0 implies zero values;
a positive count is followed by the complete dimension's f32 coordinates,
including internal/trailing zeros. Unweighted zero endpoints have present inner
count0; weighted zero endpoints have null inner data. The middle vectors have
counts6 and13 respectively. This presence distinction must be retained or be an
explicit canonical-profile boundary; a public offsets vector alone cannot
silently erase unknown stored presence variants.

One progress axis supplies the Bezier handles, independent of offset-array
length. Terminal raw curvecode2 remains even though runtime JSON has no outgoing
curve at that final key; do not rewrite it to JSON's implicit Linear. Kind6
appends a typed Mesh46 attachment link. Its group19 remains the owning Bone12
with enum2, like bone and slot groups; each Mesh/slot/bone ownership chain is
verified against the known scene graph.

The nested generic-reference interpretation now consumes all intervening
families consistently, but full reference-type validation remains pending at
the Event boundary. Distinguish a fitting byte-consumption/data hypothesis from
independently proven complete arena accounting. No original call or product
extension was made for this follow-on work. Preserve the successful current slot
codec and accepted UI files while that remaining research continues.

## Full composite recovery corrects the fitting reference hypothesis

The next `read-future-v7.py` consumes the entire4779-byte decoded source through
the known12-byte trailer. The preceding v6 hypothesis also consumed all bytes
but was **wrong** about reference arenas: Event definition reference128 pointed
to class80 instead of35, the definition's self-group link was wrong, generic
reference164 resolved to `08-events` rather than `setup`, and constraint group
owners resolved to track132 rather than Bone12. This is why byte consumption
alone is never the acceptance test. The failed variants remain ignored evidence.

The corrected deform payload is:

1. A **DOMAIN reference**, with no numeric class identifier carried at this
   statically typed call site. `DeformVector` is only our reader's symbolic type.
2. A varuint dimension8/16.
3. A **Boolean data-presence flag**, which allocates no generic reference.
4. If present, an observed integer equal to the nonzero-coordinate count. Count0
   implies all-zero coordinates; a positive count is followed by all dimension
   f32 coordinates, including zero coordinates.

This moves six values into the domain arena and removes ten incorrectly added
generic identities. All decisive Event/owner/string aliases then resolve to the
correct classes and values. The nullable presence examples and raw terminal
curve2 distinction described above remain real data. Keep them intact.

Independent full evidence:
`analysis/animation-all-timelines-raw-reference-check.json`, SHA
04cfa2a6ee1119164bb9f7c8fde630b9009eb0828b9ddd590014444df6c96559.
All eight named families/56keys/247 scalar comparisons agree with actual canonical
JSON, maximum5.419540405e−8 at unchanged5.1e−6; envelope CRC, complete traversal,
known typed owner links and the decisive arena aliases pass. This validates our
research grammar, **not an editable future codec** or GUI/GPU behavior.

Additional direct record boundaries, retained for subsequent paired audits:

| Custom132 kind | Observed body after frame | Target after counted keys | Group19 |
| --- | --- | --- | --- |
|6 Deform|curve, one progress-axis conditional handles, typed domain vector above|typed Mesh46 object|Bone12/enum2|
|13 Draw order|curve0, generic array of domain39 offset records|none|null/enum4|
|7 IK|five f32 values then curve; first two match mix/softness|direct IK56 domain link|source target Bone12/enum2|
|8 Transform|six f32 mixes then curve|direct Transform65 domain link|source target Bone12/enum2|
|23–29 Physics|one f32 scalar then curve|direct Physics121 domain link|constrained Bone12/enum2|
|30 Physics reset|curve0, no value scalar|direct Physics121 domain link|constrained Bone12/enum2|
|12 Events|curve0, direct domain Event-value record|direct Event-definition35 link|null/enum3|

The IK's last three lanes stay0/0/1 in this fixture; their independent compress/
stretch/bend meanings remain unmeasured. Physics scalar kind order here is
inertia/strength/damping/mass/wind/gravity/mix. This is serialized input evidence,
not exact moving-parent simulation or export-phase proof.

Event definition35 has observed field order10(group),4(default float),7(true),
3(default signed integer bits),0(skeleton link),8/9(zero floats),2(name),6(empty
string),5(default string). Its Event-value record is statically typed without a
numeric class token at this call site; observed field order6(zero float),1(def35
link),2(signed integer bits),4(string),3(float),5(zero float). Zigzag integers
14/6/17 agree with7/default3/−9, floats and start/default-setup/end strings all
match. The repeated `setup` string alias and Event-definition self-group alias
provide independent reference-arena checks. Zero audio fields and richer Event
payloads remain unmodeled; do not assign their complete meanings from this case.

## New discriminating follow-on recipe prepared — not collected yet

After published0.9.1, root requested a distinct fixture for the remaining branch
questions before DrawOrder/Deform codec work. Ignored
`animation-next-timelines-reference/input.json` SHA
`eed254b6fde858f594bfab78df11988f25299a83c2212425b78e786e989a7443`,23205bytes,
contains nine isolated animations/72keys. The paired UI audit checked ownership,
curve arity, permutation validity and the own2250-byte PCM resource before any
collection. Only root may run its one import and one same-source export.

The primary new discriminators are six-slot reversal/cycle/reset, forcing at
least one negative offset in a valid minimal reversal representation; six-key
mixed Linear/Bezier/Stepped/Bezier deform on U, W and Clip; omitted, explicit
empty/full-zero, sparse-range and nonzero offset arrays; and a separate mesh
whose input includes zero-weight entries with a short sparse deform key. The
last case is deliberately dimension-safe whether input zero membership is
retained or pruned. The older all-positive weighted mesh cannot distinguish
positive-only from dense influence traversal, so no such mapping is assumed.

Optional isolated cases vary IK compress/stretch/bend separately on a two-bone
chain, six independent Transform Bezier axes, seven scalar Physics curves and
Event audio path/volume/balance with a generated50ms440Hz WAV. Audio playback and
renders are not requested; disable audio. Current official4.3 runtime parsing
was checked for the field names; its omitted Event-balance fallback differs
from a straightforward Setup-balance rule, so both possibilities are frozen as
hypotheses rather than assumed editor behavior.

The manifest freezes reference-arena, signed-offset, zero materialization,
sparse-array, weighted membership, terminal-curve and audio-default candidates.
This recipe does not repeat accepted0.9.1 inputs. No new original result or
future editable compatibility is claimed by its preparation.

## New492c direct gate — before DrawOrder/Deform codec implementation

Root's new import99632/export107276 both exited0 with retained handles, exact
4.3.26/Complete, no metadata error, unchanged inputeed254 and pinned own audio.
Source is `492c0a65c540fc9a12378e58e592d54b782d6808cb1f8f03072069f07f4a0260`.
The independent parser reaches all6552 decoded bytes and the known trailer with
valid owner classes and repeated Event-definition/string aliases. Report
`analysis/animation-next-draw-deform-reference-check.json`, SHA
140d123a81b35f85e95d73b9fdaed904b8ddede18aa9b589ade726715015d316,
compares25 DrawOrder/Deform keys and505 scalars, maximum2.384185793e−8 under the
unchanged5.1e−6 bound. Paired UI review independently compares all four complete
permutations and expanded sparse vectors.

Direct new conclusions close the required branch gates:

- Negative offsets are signed zigzag: raw1→−1 and raw5→−3. Reversal retains five
  offset records and omits the redundant last slot; cycle retains only two
  positive offsets. Compare permutations, while preserving incoming literal
  record lists for full canonical reserialization.
- Clip84 supports kind6 with the same one-progress-axis mixed Bezier and domain
  vector as Mesh46. Its binding53/slot/bone chain is verified.
- The zero-membership mesh Z retains two RAW binding columns root/child and
  per-row weights[1,0]. Its RAW deform dimension is16, not eight. Therefore the
  wire profile uses all dense rows/columns, including dormant zero columns.
  Runtime JSON prunes those zero influences and projects to eight coordinates;
  that lossy runtime projection must not redefine the editor vector dimension.
- Omitted, explicit empty and explicit zero arrays all produce present zero data
  for unweighted U/Clip, absent zero data for weighted W/Z. Mixed current-or-
  previous Bezier handles agree. All terminal deform keys use raw Step2 even
  when the preceding segment is Linear; retain that raw code rather than infer
  an outgoing segment from JSON's missing last-curve field.

The coordinator approved these FBones authoring policies before code: newly
requested non-null identity draw order normalizes to Setup/reset (empty offsets
and UI label), with no invented locked-identity marker. Existing nonempty raw
lists remain lossless. On Setup slot reorder, nonempty keys keep their resolved
stable-ID order by recomputing relative offsets; empty resets follow the new
Setup order. A viewport deform gesture changes positive-weight columns while
retaining dormant columns; nonzero dormant-authoring/GPU behavior remains
unmeasured. These are explicit policies, not original gesture claims.

Typed codec design: separate `Animation.draw_order` and `.deform_tracks` preserve
the existing bone/slot APIs. DrawOrderKey retains frame plus literal SlotOffset
records. DeformTimeline targets an AttachmentAddress and has DeformKey with
exact f32 offsets, Boolean `data_present` and one-axis DeformCurve. Canonical
family/group ordering must retain old empty/bone/slot bytes and reject unknown
interleaving through complete reserialization. Empty/zero representations cannot
silently lose −0 bits: absent data and present count0 must have positive-zero
coordinates; mixed nonzero vectors retain signed zeros exactly. Each deform key
adds both key133 and vector domains, so encoder validation must also close the
bounded-reader arena budget rather than rely on the old4096-key limit alone.

DrawOrder/Deform implementation is now authorized after this direct gate and
paired UI audit. Optional IK/Transform/Physics/audio Event findings remain
research-only; no product enablement follows from their presence in the oracle.

## Working0.9.2 format checkpoint and transport limit

The bounded DrawOrder/Deform profile is implemented in the independent format
crate. `analysis/animation-draw-deform-format-check.json` records41 passing
scene-codec tests and strict Clippy. Coverage includes mixed bone/slot/DrawOrder/
U/W/Clip persistence, dense dormant coordinates, all120 five-slot permutations,
existing literal nonempty identity lists, invalid presence/dimension/sign/frame/
control/order rejection, typed-vector corruption and actual arena-budget closure.
Older empty/bone/slot byte regressions remain unchanged. This is a format/native
checkpoint, not acceptance of a new UI-authored file by original Spine.

A separate transport finding affects supported mixed nonzero vectors with
negative zero. The pinned Tauri2.11.5 object IPC serializes through ordinary
`JSON.stringify`; a direct local check maps `{offsets:[1,-0]}` to numeric
`[1,0]`. That transport cannot independently preserve the supported raw sign.
Native raw-key input therefore accepts optional f32 `offsetBits`, validating
finite decoded values, complete equal lengths and numerical agreement before
using authoritative bits. Temporary deformation poses remain f64 and instead
accept sparse `negativeZeroIndices`, restoring only distinct in-range numeric
zero entries. Other f64 values retain their precision. Both are input-only
carriers; neither changes the file structure or duplicates the public summary.
Existing finite/magnitude/presence/compact-zero and frozen-layout guards still
apply. Three native real-JSON tests cover raw/combined authoring, atomic rejects,
Save/reopen/Undo/Redo and precise temporary freeze followed by a world-target
edit. See `.local/animation-deform-offset-bits-check.json`; current native235
pass/two ignored and strict three-profile Clippy are distinct root/native-agent
checks. No new original call follows from this correction.

The next independent new-UI gate is prepared under ignored
`.local/research/animation-geometry-data/`, preserving all old tools/reports.
Its selftest reconstructs the complete492c reference tree exactly and reuses the
accepted0e bone/slot comparison without repeating any original command. A fresh
frozen Geometry artifact, full saved/reopened checks and one separately observed
original export remain required before declaring the new UI-source profile
accepted. Artifact JSON alone cannot prove negative-zero transport preservation;
the native real-JSON tests and raw binary checks are separate evidence.
