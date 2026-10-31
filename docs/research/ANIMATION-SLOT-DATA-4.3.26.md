# Slot animation DATA audit — Spine4.3.26

2026-10-30. Before dependent slot-animation implementation. F105 remains ACTIVE;
0.9.0 is the delivered bone-animation milestone. F307/F308 fidelity work remains
user-deferred. This audit owns local DATA reads and the new own reference recipe;
only the coordinator may operate original Windows. No original calls or product
edits were made by this audit.

## Directly proven retained evidence

The accepted own A/B/none Setup fixtures in ignored
`.local/research/slot-attachments/` prove two attachments can belong to one slot
with one nullable active reference. Slot13 owns the inventory and active link;
Slot13/tag5 stores light RGBA; blend enum tag7 is independent. References and
four blend values are documented in `FEATURE-DATA-4.3.26.md`. These are Setup
facts, not proof of timeline encoding or key gestures.

A targeted JSON scan under `.local/research/` and `updates/fixtures/` found353
runtime JSON documents with dictionary-valued `animations`; none has nonempty
`animations.<name>.slots`. The scan reads JSON files smaller than3MB and reports
its scope, rather than claiming every personal/project/binary was inspected.
Existing accepted own slot and bone collections must not be rerun to rediscover
those facts. Retained animation references cover bone class19, custom track132,
domain key133 and Project0/tag2 FPS, but have no proven slot timeline classes.

Current code is a second, distinct proof: `minimal/scene/animation.rs` exposes
only `Animation.tracks: Vec<BoneTimeline>` and emits class19 groups with bone12
links. `scene_reader.rs` and complete reserialization reject unsupported richer
records. Setup `Slot`/attachment inventory already has typed ownership and native
stable slot/attachment identities. Keep that strict guard while adding new
families; do not encode slot keys as bone keys or hide them in a sidecar.

The existing exact installed-package static audit identifies editor entry classes
but does not recover editor class bytes. The pinned package remains unpacked;
launcher classes do not establish slot timeline serializers. Evidence is ignored
`f307-windows-loader-static/HANDOFF.md` and `TARGET-CONSTANTS-HANDOFF.md` with
later follow-ups; no new debugger/observer/probe is authorized or needed here.
This is a reuse of an existing boundary, not a new failed extraction attempt.

## Primary documentation, not editor patch proof

Checked current official branch4.3
[SkeletonJson.ts](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.3/spine-ts/spine-core/src/SkeletonJson.ts),
slot timeline parsing around lines713–749, plus the isolated future-family
sections905–1260. Attachment keys identify a slot and a nullable attachment name
at a time in seconds. RGBA keys carry an eight-hex-digit color; outgoing curves
may interpolate four separate axes. These runtime JSON fields do not prove editor
class IDs, reference arenas, color precision, FPS conversion or UI gestures.
A mixed four-axis Bezier recipe therefore uses16 controls with absolute
seconds/value coordinates, pending actual original import/export observation.

Future recipe families use separately named animations: draw-order offsets;
`attachments.default.<slot>.<mesh>.deform`; named IK/Transform/Physics data;
and event definitions/keys. Source field names are checked in the current4.3
runtime parser; no runtime implementation is copied into FBones. Their inclusion
collects potentially useful future evidence, not implementation permission or a
claim that those editor serializers are already decoded.

## One new own discriminating reference prepared

Ignored `.local/research/animation-slot-reference/input.json`, SHA
`bb15ce6a767bedc50f973c6245541fea53b5afe4d1eb27026a33fd1d5d40a233`,13702bytes.
`manifest.json` records precollection expectations; `prepare.py` reproduces only
our JSON recipe, never executes the original. Root reviews/pins the collection
helper separately. Requested collection: ONE new own import and ONE same-source
JSON export, no render, no old accepted bone-batch repetition.

The recipe has three bones, four slots, four region alternatives, an unweighted
quad and a two-influence weighted quad, and requested24FPS. Its primary animation
`01-slot-attachment-and-rgba` has two independent slot groups:

- `switch`: Setup active A and nonwhite tint; attachment keys A/B/none/A/B at
  times0/.25/.5/.75/1, plus five nonconstant RGBA keys with outgoing
  Linear/Bezier/Stepped/Bezier/Linear and independently distinguishable axes.
- `initial-none`: Setup inactive, attachment keys none/D/C at0/.5/1, plus two
  nonconstant linear RGBA keys. Distinct names and owning slot disambiguate
  nullable active state, key values and cross-owner references.

There are eight attachment keys and seven RGBA keys. Expected editor frames
0/6/12/18/24 depend on retained24FPS and are an explicit precollection prediction,
not an observed new datum. Frozen competing hypotheses for keyed attachment
payloads are attachment-name string vs nullable attachment-domain reference;
for RGBA, packed byte color vs four independent float values; for handles,
current-only vs previous-only vs current-or-previous vs whole-track presence.
Do not select a hypothesis based only on a symmetric writer/reader roundtrip.

Separate names02–08 isolate three draw-order keys, three unweighted and three
weighted deform keys, three IK keys, three six-channel Transform keys,
21Physics scalar keys plus two reset keys, and three events. They do not repeat
accepted bone key experiments. Their extra serializer families may be decoded
later; primary slot implementation need not wait for their full recovery.

## Unknown until actual observation

Exact slot group/track/key class IDs, tagged-vs-custom layouts, domain/generic
reference identities, attachment-key null representation, RGBA scalar storage,
channel ordering, interpolation metadata/precision, animation-family ordering,
and broader data preservation remain UNKNOWN. So do original key-insertion,
auto-key, duplicate-time, deletion/reorder, and slot-selection gestures. Current
UI screenshots and documentation are separate evidence categories.

Before dependent code, complete an independent parse to the trailer, resolve
slot/attachment ownership and reference arenas, compare all retained JSON keys,
and freeze the exact observed conclusions in this note. Then implement a bounded
typed codec extension with complete reserialization equality. Native sampling
must project active attachment/tint into transient evaluated slots, preserving
Setup, inventory, mesh bindings and draw order; sampled results are not authored
Slot updates. Existing stable IDs, revision/epoch guards, atomic edits/history,
PNG safety and no per-frame full-scene IPC remain mandatory. These last sentences
are FBones integration requirements, not claimed original internal design.

## Reproducible local commands

The targeted existing-evidence scan loads JSON under the two roots, ignores
files over3MB/unparseable JSON, counts dictionary `animations`, and reports
nonempty child `slots`. The exact new own input is reproduced by:

```sh
python3 .local/research/animation-slot-reference/prepare.py
sha256sum .local/research/animation-slot-reference/input.json
```

Local source reads: `sed -n '1,180p' crates/fbones-format/src/minimal/scene/animation.rs`
and the retained Setup fixture JSON; primary-source read used the branch4.3 URL
above. No Windows/process query, original execution, activation change, product
edit, accepted oracle repeat or claim of new compatibility follows from this
precollection audit.

## Actual new exact4.3.26 reference — before codec extension

Root's ONE new import55460 and same-source export80452 both completed with
observed exit0, exact4.3.26 and Complete streams. Reference SHA
`9b7f4c7e4cab0972c4eb8e5248fa74a385c7a72664aab4dced63dd2adc8e9c23`
is in ignored `animation-timelines-reference-v1/reference.spine`. Inputbb15 is
unchanged. Root's `analysis/animation-timelines-collection-check.json` verifies
eight runtime animation families and all primary attachment/RGBA inputs. No old
bone reference batch was repeated and no original calls were made by DATA.

Targeted independent raw parsing proves the primary two groups and15 keys.
`analysis/animation-slot-primary-reference-check.json` SHA
`6136a4ddbe1382cfc58b16ba960fd0daa8a164fc69f490ca9cc338e240c68e01`
compares75 frame/value/control scalars, maximum5.419540405e−8 under unchanged
5.1e−6, with exact f32 RGBA normalization and verified owner references. Envelope
CRC is valid. This parser deliberately stops at future draw-order kind13;
**it is not a complete composite parse or an editable-profile claim**.
Reproduce: `python3 .local/research/animation-slot-data/read-prefix.py`, then
`python3 .local/research/animation-slot-data/check-primary.py`.

The primary wire findings are now directly observed:

- Existing domain group19 remains owned by Bone12. Both slot timelines belong
  inside their slot's owning bone group; there is no separately proven slot19
  group. Wire first groups `switch`/child then `initial-none`/root, even though
  exported JSON dictionaries list initial-none first. Preserve wire/group order
  rather than copying a JSON dictionary's sort order.
- Custom domain track132 kind4 is slot color. Its generic counted key list
  contains domain133 keys: f32 frame, **seven f32 values**, curve0/1/2, conditional
  handles. The first four values are exact f32(byte/255) light RGBA. The final
  three values are positive-zero in every observed key. Their broader dark-tint
  meaning is not independently proved; reject nonzero data in that bounded
  profile rather than dropping it.
- Mixed curve presence is current OR previous Bezier. Seven axes each store the
  familiar four incoming/outgoing f32 coordinates plus four zero metadata bytes.
  The last three axes are entirely2^31 sentinels. First four axis controls agree
  with canonical16-number JSON curves after explicit frame/FPS conversion.
- Custom132 kind5 is slot attachment. Domain133 keys store f32 frame, curvecode0,
  then a typed attachment object (class43 here, domain new/reference) or object0
  for none. This is a nullable attachment identity, not a string key payload.
  The key's attachment ownership is independently verified against its slot.
  Other attachment classes remain bounded by the existing supported inventory;
  this observation directly covers Region attachments only.
- Both kind4 and5 append a direct Slot13 domain link **after** the key list.
  This link can introduce its owning slot/inventory/geometry recursively or
  reference a prior slot. Keep reference registration/counts precise; a reader
  that assumes all custom132 kinds end after keys desynchronizes at that owner.

Proposed public API now reflects those facts: `Animation.slot_tracks`, separate
from existing bone `tracks`; `SlotTimeline::Attachment { slot, keys }` references
slot-local attachment indices or none; `SlotTimeline::Rgba { slot, keys }` stores
four exact f32 values and four-axis curves. The wire's extra zero/sentinel axes
must be verified and canonically emitted, never silently normalized from unknown
nonzero fields. Native stable slot/attachment/key IDs remain distinct from these
wire indices. RGB-only, alpha-only and nonzero extra axes remain unproven.

## Bounded codec checkpoint and ordering policy

The coordinator approved an explicit canonical profile before implementation:
retain the existing bone-track group/channel order byte-for-byte; append a slot
track into its matching owning-bone group; append slot-only owner groups in
first-seen order. Within an owner retain slot-track order. Slot tracks must be
contiguous/canonical under that rank; `Animation::slot_track_permutation` exposes
the stable permutation so native history moves parallel key identities together.
Alternate original group/type interleaving remains inspection-only when complete
reserialization differs. This is a declared profile boundary, not a claim that
the editor sorts or authors every timeline that way.

The codec now exposes the agreed separate slot-track types; first four RGBA f32
values/control axes retain exact bits. It writes/checks three dormant positive-
zero values and three sentinel axes and four zero bytes per curve axis. Track
owner links follow keys. Native attachment inventory lookup must validate slot
ownership before indices are serialized. At this checkpoint only Region/none
key targets have direct original proof; coordinator is collecting a distinct
Mesh/Clip discriminator. Generic known-inventory wire support alone is not proof
of those original key classes or their interaction behavior.

Checks after implementation:36/36 Scene-feature format tests pass (previous32
plus four new slot cases), strict Scene/all-target Clippy passes, and old empty/
bone complete-payload goldens remain green. New cases exercise mixed curve/none
roundtrip, unchanged Setup/inventory, shared-bone canonical grouping, exact float
history distinctions, invalid indices/frames/duplicate channels, and unknown
nonzero dormant values/handles/metadata rejection. The composite original with
future families still remains inspection-only; it is not silently reduced to
its supported first animation. A future independently authored slot-only UI
file and one new original export remain the encoder acceptance check.

Independent runtime-only comparison of all eight new named families is recorded
in `analysis/animation-eight-families-runtime-reference-check.json`:56keys,
220numeric comparisons, maximum5.882352938e−8 at unchanged5.1e−6 bound. Draw-order
redundant offsets compare as full permutations; sparse deform tails expand to
fixed8/16 channels; event defaults come only from the own definitions. Those
normalizations do not infer unparsed binary classes, editable future families,
original playback/GPU or solver phase.

## Mesh/Clip attachment-key discriminator — direct target boundary extended

Root subsequently collected ONE distinct own kind5 discriminator, not a repeat
of the bone or first composite cases. Input8da0 and source
`3a74d5b188d7d6ea4282f0fcc2f283dcd97037c7562d37b56d3a860fbd6f8606`
are in ignored `animation-attachment-kinds-reference-v1/`. Import70120 and
export61164 both have observed exit0, exact4.3.26 and Complete streams. No GUI
inputs/renders occurred.

Independent raw parsing now reaches this entire payload and known trailer:
three kind5 tracks store nine keys for Clip84, unweighted Mesh46 and weighted
Mesh46. Each sequence is active/none/active at frames0/12/24, with exact slot and
attachment owner links. The typed object class varies; the frame/code0/nullable
object/trailing Slot13 schema is unchanged. Independent canonical JSON matches
all target names/nulls. Report `analysis/animation-attachment-kinds-reference-check.json`,
SHA19436e34061094adf369e5ebd0e948be58edc8b52a27bc320ef8481832f67f37.

An actual own Linux Rust inspector linked to the current Scene-feature format
crate decodes this original source and completely reserializes **all2227 decoded
bytes exactly**: five slots, one animation, three slot tracks. No canonical guard
was weakened to obtain this result. Report
`analysis/animation-attachment-kinds-format-check.json`, SHA
dc55eb3a143f205584f7e53e9e522141f6fd7131525005b94583728adf41a404.
The earlier Region/none target limit is therefore superseded for the existing
supported Region/Mesh/Clip inventory. Native may remove its provisional
Region-only key guard after this finding. Unknown geometry, skins and timeline
families remain inspection-only; no original animated-GPU/gesture claim follows.

## Native/browser f32 projection review — before sampler correction

Raw133 frame/value/control fields are f32. Native sampling promotes the exact
stored values to f64; serde's shortest JSON f32 decimals are not necessarily the
same JS f64 number. DATA identified two dependent precision cases before the
coordinator's frontend corrections:

- Stored RGBA example208/255 has f32 value0.8156862854957581 but may serialize
  as0.8156863. Normalize only stored key fields with `Math.fround` before browser
  interpolation; preserve Setup byte/255 colors and the sampled result in f64.
- Same-address key lookup must compare both operands at stored f32 precision;
  `.1 + .2` can differ from JSON`.3` while authoring resolves to the same f32 key.
  A missed existing-key lookup must not accidentally replace Bezier with Linear.
- Explicit seek to a stored editor-frame address uses `Math.fround`; continuous
  playback remains f64. This is an explicit FBones interaction policy, not a
  claim about original fractional-seek gestures. Applying it also exposed the
  existing bone sampler's short-decimal frames: seek to f32`.3` with JSON frames
  `.3/.6` and values0/1e6 produces about.03973643 in the old JS sampler while
  native sampling is exactly at the first key0. Normalize stored bone key
  frames/values/controls too, retaining Setup/local basis and existing matrices.

These corrections follow observed wire precision and native sample semantics;
no original run, solver tolerance or broad geometry change is required. Tests
must distinguish exact key endpoints, f64 continuous interpolation, duplicate
frames and four independent color curves rather than loosen comparisons.

## Independently authored UI source accepted by original

The corrected real UI source
`0e2441c6c0528f21b66c0134303741164f7d6f21490108225844f19766a73a9d`
is1045bytes and contains two bone keys, seven attachment keys and four RGBA keys,
including editable four-axis Bezier controls, Region/Mesh/Clip/none and mixed
bone-slot clipboard results. Independent complete raw/native Save/Reopen checks
verify16 Setup channels, four slots, three Regions, one Mesh, one Clip,12 weight
and24 local-position f32 patterns, UV/topology/end links and unchanged activation/
inventory in captured authoring stages. Source report:
`analysis/animation-slot-ui-source-check.json`, SHA
0915f88b986052c5a129405d60020fd87c25f9a6b2be688d2b05d287ba73a347.

Root performed ONE new same-source original export107176, observed exit0 with
retained handle/exact4.3.26/Complete and no metadata error. Source/copy remained
0e2441; runtime JSON SHA
`0a95569d47643035825985059ef149438da1e0d2fdd3cdb60ac0036c03783790`.
The independent checker binds exactly one export receipt, positive PID, source/
copy/output hashes and basename, then compares Setup bone/slot state, attachment
inventory and all bone/slot timelines.66 non-color JSON scalars have maximum
3.333333334e−7 residual under unchanged5.1e−6. One constant bone Linear segment
exports Stepped; its identical endpoints satisfy the already accepted constant
segment equivalence. No curve exception applies to nonconstant keys.

RGBA runtime JSON is eight-digit hex, whereas editor keys retain four f32
components. Four quantization candidates were frozen **before** export in
ignored `animation-slot-data/color-export-predictions.json`, SHA
5517ab600c26d9afc390020891ddbf5ed740b0bf04d2dacd51e1120bfa35949e.
Actual output selects the nearest-byte family and rejects truncation. The
observed values do not distinguish f32 from f64 multiplication precision, so
no exact arithmetic-instruction claim follows. Arbitrary key0.123456791 is
quantized in JSON: maximum component difference is0.0018881635923. **Numeric
RGBA equivalence to JSON is FALSE**; source/native/raw f32 preservation and
correct byte-quantized JSON comparison remain separate proofs. Time/control
bounds were not relaxed to hide that quantization.

Report `analysis/animation-slot-ui-original-check.json`, SHA
a95db08c795f7b0199ad3e069e201aeaf4805f2abaf6bd04445b043592e66085.
This closes new independently encoded bounded bone-plus-slot acceptance, not
full Animate compatibility, original GPU parity or original gestures. Future
draw-order/deform/constraint/event serializers remain inspection-only.
