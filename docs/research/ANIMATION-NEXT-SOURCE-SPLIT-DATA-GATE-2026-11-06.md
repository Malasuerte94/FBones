# Next real-source split-axis DATA decision — 2026-11-06

Before dependent product code. Question: can ordinary scalar bone tracks plus a
measured bone-inventory increase admit B or H, or does another semantic/capacity
boundary decide the target? Reuse the accepted [split-axis gate](ANIMATION-SPLIT-AXIS-DATA-GATE-2026-11-06.md),
[Generic116 correlation](ANIMATION-GENERIC116-DATA-2026-11-06.md), retained runtime
reports and the frozen own reference-aware graph reader. This targeted read-only
inspection runs no new original/runtime batch, process/browser operation, product
edit, shared Cargo/test or asset decode. Source names/paths/assets remain private.

## Decision: H is the bounded next candidate; neither opens from bone-only policy

| Observed profile | B | H |
| --- | ---: | ---: |
| Payload bytes | 232174 | 310454 |
| Bones / maximum parent depth | 157 / 12 | 221 / 6 |
| Slots / attachments | 56 / 56 | 82 / 82 |
| Clips / tracks / keys | 2 / 193 / 2153 | 1 / 522 / 2581 |
| Busiest clip tracks / keys | 115 / 1152 | 522 / 2581 |
| Domain / generic objects | 4287 / 4328 | 6258 / 7078 |
| Mesh vertices total / per mesh maximum | 1426 / 144 | 2460 / 41 |
| Maximum binding columns | 11 | 3 |
| Constraints | 44Physics,7IK,14Transform | 0 |
| Distinct PNG paths / missing | 116 / 0 | 122 / 0 |
| PNG compressed / estimated decoded RGBA bytes | 923794 / 32142752 | 554022 / 31057540 |
| Maximum PNG side | 799 | 500 |

Both complete editor graphs, object trailers and compressed envelope length/CRC64/
markers parse exactly. Originals and retained copies hash unchanged. PNG results
are IHDR/size estimates, not new native PNG decoding/render acceptance. H retains
20distinct Sequence settings, Hold/Once/Loop-profile linear keys (observed modes1/2),
60zero-dimension Mesh image metadata records with independent authored geometry,
22Regions, default-disabled dark Setup on all82slots and a single existing silent
Event definition/key. All221 H bones retain default inheritance value1; parents
precede children. Its only scalar configuration is mode1, one TranslateX track
with9keys and one TranslateY track with4keys, preserving distinct frame arrays.

H has no observed nonmonotone or out-of-segment combined/scalar bone Bezier time
controls. All currently known non-scalar families are already represented by the
bounded product grammar. Exact whole-payload encoding is still an independent
future proof: complete diagnostic parsing alone cannot declare the writer profile.

B has a **genuinely nonmonotone combined Rotate** segment, not a scalar syntax
problem: times `(first,outgoing,incoming,last)` are
`(89,92,61.99999237060547,98)`. Its derivative has a negative interior region;
the exact current monotonic predicate correctly rejects it. Another Rotate
overshoot `(89,90.33332824707031,87.95304107666016,93)` is monotone and remains
separately admissible under the accepted predicate. No clamp, control rewrite,
key flattening or guessed root-selection/inversion may admit the nonmonotone
segment. B also has seven nondefault Bone12/tag27 values (three2,four3), outside
the existing default-inheritance profile. The original sampling/inversion and
these unmodeled inheritance semantics remain separate blockers. Keep B guarded.

Under current limits, H still exceeds bone inventory128 and its **single active
clip** exceeds512tracks. The earlier global-track excess is now resolved by the
measured4096aggregate policy, but the per-clip bound intentionally remained512.
Thus ordinary scalar support plus a bone-only budget change admits **neither**
source. The coordinator proposes Scene256bones and separately1024active-clip
tracks for measured feasibility; these are proposed FBones budgets, not approved
product changes or original limits. All other bounds remain unchanged, including
per-clip4096keys, bindings/constraint member caps, geometry, slots, PNG/cache,
file bytes, domain/generic, depth and batch4096. H is the safer next candidate
because its remaining identified requirements are bounded typed persistence and
capacity decisions rather than unknown nonmonotone playback or solver semantics.

## Frozen proposed typed contract, before implementation

Extend `BoneChannel` with `TranslateX`, `TranslateY`, `ScaleX`, `ScaleY` and expose
`dimensions()` (1for Rotate/scalar variants;2for combined Translate/Scale/Shear).
Reuse `BoneTimeline`/`BoneKeyframe`/`KeyCurve` and semantic `WireTrack::Bone` selectors.
The unused internal value lane and Bezier control axis must be **exact positive
zero**, never encoded as another scalar value or rendered as a second Graph curve.
Wire kinds are14,15,16,17 respectively. Preserve frame/value/control f32bits,
key/list/owner order, typed references, exact conditional handle/sentinel grammar
and complete payload equality; no scalar-to-combined conversion is introduced.

Add public `BoneSplitMode::{Translate,Scale}` with explicit wire values1/2 and
`BoneSplitConfig { bone:usize, mode:BoneSplitMode }`; add
`Animation.split_modes:Vec<BoneSplitConfig>`. Preserve Generic116 entry order and
Bone12 identity, including inlining a configuration bone before its later
skeleton inventory occurrence. Mode is an observed enum, not an inferred bitmask.
Empty configuration preserves current canonical bytes. Retain rows as meaningful
model data, not raw wire bytes/opaque graphs. Validate unique in-skeleton targets,
known modes only and exactly both nonempty axes for the configured family. Reject
combined+split collisions, unmatched/partial modes/axes, unknown3/combinations and
unsupported new records; do not fabricate keys to repair a configuration.

The first implementation remains **under current capacity guards** and uses own
within-budget fixtures. Only afterward may an ignored copy change exactly the
proposed Scene256bone/clip1024 budgets for full H310454byte equality and measured
codec/model-clone costs. No product budget lines change until paired UI capacity
confirmation and coordinator decision. Native history/stable IDs, DTO/IPC, actual
sampling/resource/edit/Save/reopen costs remain independent integration gates.

For current single-full-weight preview, before the first scalar key retain Setup
on that axis; afterward TranslateX/Y add its sampled value to Setup and ScaleX/Y
multiply just its Setup axis. This reuses retained secondary public4.3runtime
`apply1` guidance and explicit FBones policy, not a new exact-editor observation.
Use the accepted exact monotone-time predicate for ordinary scalar Beziers and
the current f64 sampling arithmetic. Never evaluate/consume the other axis from
a scalar key, or apply both split and combined families. Scale keying checks only
the addressed Setup scale for zero. Default/negative/zero/mixing/gesture limits
remain as documented in the earlier gate; source bits are never normalized from
runtime conversion residuals. Original new-file acceptance remains pending.

Native must remap/drop configuration bone addresses with tracks/layout/stable key
IDs on structural changes; preserve entries/independent axes through duplication,
Undo/Redo, clipboard, move/delete and Save/reopen. Reject delete-last actions that
would leave an unsupported incomplete configuration. UI drafts/AutoKey/K/manual
keys/Graph rows must address actual scalar channels and consume only intended
axis edits. Default new bones/tracks remain combined. Any new explicit atomic
complete-pair creation is an FBones policy requiring its own tests and later
original acceptance; automatic conversion/merge is absent.

Private evidence under `animation-next-source-admission-2026-11-06/` retains full
B/H identity arenas, graph logs, source pins, `bh-profile-v2.json` and PNG header
inventories. The initial analysis incorrectly looked for constraints at Skeleton
12; the already known Skeleton44→ConstraintGroup108/tag5 address corrects only
analysis indexing, with the failed attempt retained. No product/parser grammar
was relaxed. Formal conclusions distinguish known shapes from future whole-file
encoding, native usability, UI/GPU and original acceptance. F105 remains active.

## Semantic implementation and isolated feasibility result

The approved typed contract is now implemented **under old product capacities**.
Six own scalar cases cover all four variants/known modes, reversed configuration
bone order and early inlining, independent axis times, signed-zero/subnormal bits,
unused exact+0padding, valid monotone overshoot, aliases/layout/Skeleton metadata,
property-only sibling preservation, incomplete/foreign/duplicate/conflicting rows
and malformed/truncated/nonfinite/reversing inputs. Existing combined profiles
retain their prior encoding. The initial new-scalar parser routing error (old
`kind>=4` Slot branch) is retained and corrected to explicit Slot kinds4/5.
All80format tests, strict Clippy and earlier16legacy regressions pass; no source
profile is admitted merely by those tests.

The ignored proposed-budget copy independently reproduces H's **entire310454byte
payload** and reopens the same complete typed model. No semantic field relaxation
was needed beyond the recorded scalar/116 contract. Additional writer/reader
[depth closure](ANIMATION-SCENE-DEPTH-CLOSURE-DATA-GATE-2026-11-06.md) is required
for the proposed larger inventory and is now separately implemented/tested. H's
2526combined/scalar Bezier-axis segments are all monotone and in their segments;
its9scalar segments retain canonical unused handles. Its716expanded image
references resolve to122unique PNG paths, whose headers fit unchanged budgets.

This is isolated format feasibility, not approved product capacity or actual
native admission. The coordinator still decides the measured256/1024budgets and
requires current native resources, stable IDs, history/DTO costs, sampling, real
editing/Save/reopen plus independent saved-artifact verification. B remains
guarded for nonmonotone time and nondefault inheritance. Original new-file,
platform UI and GPU acceptance remain pending.

## Approved product capacity and final format result — 2026-11-07

After paired DATA/UI review, exact H proof and measured closure cost, the
coordinator authorizes `MAX_SCENE_BONES=256` and active-clip tracks1024 in the
[implementation contract](ANIMATION-SPLIT-INTEGRATION-CONTRACT-2026-11-06.md).
Scene calls the shared rig validator with its explicit limit; legacy Minimal/Region
validation stays128 even in a Scene-enabled build. Aggregate4096tracks/8192keys,
per-clip4096keys, reader depth256 and all other stated bounds stay unchanged.
Every returned Scene payload must pass the authoritative bounded structural read.

Final product tests pass80/80, strict all-target format Clippy, legacy16/16 and
recursive formatting checks. Own capacity cases prove1024mixed-family active tracks
roundtrip and1025reject; wide Scene256roundtrip/257reject; legacy128accept/129reject;
public Scene encoding accepts the diagnosed245inline chain and rejects246before
returning bytes. No automatic reparenting/flattening or depth increase is used.

The **current product** independently reproduces H310454bytes and the prior
A363416/C27253/D18674payloads exactly. All four original/copy project hashes remain
unchanged. Private `product-equality-result-v1.json`/log and the final focused
logs retain this product proof separately from earlier ignored-capacity copies.
The semantic-old-caps manifest is historical; later final source/evidence pins
are separate and never overwrite it.

Native H sampling/resources/authoring/history/DTO/Save/reopen and independent
saved-artifact proof still precede any fourth editable-source claim. The source
comparison establishes the complete supported wire profile without claiming
original acceptance, GUI/GPU results, broad solver parity or full compatibility.

A read-only independent review of the current frontend scalar sampler, workspace
and working-intent retention finds no blocking contract mismatch. Sampling and
key projection use component0 for the actual X/Y axis; relative Scale checks only
its denominator. Family manual Key derives the validated per-bone representation
and keys both split axes; dirty K/AutoKey address changed physical axes. Clipboard
time shifts leave padded controls exact+0; retention uses distinct scalar field
keys for sibling/newer-clean intent. The existing recursive authored-resource
comparison includes ordered `animations.splitModes` automatically. This is source
review, not another executed UI/native/GPU test or original gesture observation.

The coordinator's real H production-store/Session workflow now passes, followed
by the [independent saved-artifact DATA proof](ANIMATION-SPLIT-SAVED-DATA-2026-11-07.md):
all50,932originalf32bits and complete graph identities remain exact, except the
two intended92frame X/Y keys and known audio-root normalization; all122PNGtriples
remain unchanged. The separate expected typed model/payload/full envelope equals
the save. This supports the fourth bounded native editable-source profile while
keeping B and other unknown profiles guarded. Original/platform UI/GPU acceptance
and the full user/F105 goal remain open.
