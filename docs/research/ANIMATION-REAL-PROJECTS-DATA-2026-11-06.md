# Real-project animation DATA audit — 2026-11-06

Pre-implementation audit for the resumed F105 goal: verify working features on
copies of the user's Windows Vampir projects, diagnose failures, and fix the
features needed to animate. This audit performs local source/evidence reads only;
it has not yet inspected a Vampir file or operated an original editor instance.
The coordinator owns corpus copying and original-session isolation.

## Directly proven current boundaries

- `src-tauri/src/project.rs::open_document_profile` first verifies the envelope,
  then calls the semantic Scene decoder. `UnsupportedProfile` becomes an
  inspection-only document. That document contains no bones/slots/animations in
  its summary. A successful envelope check therefore does not prove an editor
  can display or animate a file.
- The same open path can also choose inspection-only after successful decoding:
  unsupported active clipping, an incompatible legacy runtime profile, unsafe
  image keys or case-folding image-key collisions. Missing image files alone do
  **not** reject editability: they produce a resource warning/cache miss.
- `crates/fbones-format/src/minimal/scene_reader.rs::decode` requires one
  skeleton, the bounded known record grammar, typed owner/reference relationships,
  and **complete payload equality** with `encode_scene_payload`. Unknown records,
  unrepresented fields or noncanonical ordering may reject a file even when its
  visible bone/channel data appear familiar. Keep this equality guard; replacing
  it with partial decoding would lose data on save.
- Current typed animation support is four bone channels, combined light RGBA and
  attachment keys, Draw Order, Mesh/Clipping deform, bounded IK/Transform/Physics
  keys and Events. `minimal/reader.rs` accepts track kinds
  `0..=8 | 12 | 13 | 23..=30`. The Scene model does not express separate RGB,
  alpha or TintBlack, global Physics targets/ResetAll, arbitrary skins, path
  constraints or arbitrary bone-inheritance modes. Their absence is a source
  fact, **not yet a diagnosis of the Vampir projects**.
- Authoring budgets are bounded: Scene validation currently permits 128 slots,
  128 constraints, 64 animations, 512 animation tracks and 4096 keys (with further
  generic/domain/deform budgets). A real production rig can exceed a budget even
  when all of its timeline families are known. Measure before changing limits;
  preserve denial-of-service/resource bounds and account for all coupled limits.

Sources: `src-tauri/src/project.rs:1251`,
`crates/fbones-format/src/minimal/scene_reader.rs:241`,
`crates/fbones-format/src/minimal/scene/validate.rs:20`,
`crates/fbones-format/src/minimal/reader.rs:278`,
`crates/fbones-format/src/minimal/scene/animation.rs`.
Commands: targeted `rg` and `sed` of these sources; no binary mutation.

## Reuse accepted exact-4.3.26 observations

Read `ANIMATION-DATA-4.3.26.md`, `ANIMATION-SLOT-DATA-4.3.26.md` and
`ANIMATION-CONSTRAINT-EVENT-DATA-4.3.26.md` alongside their later milestone notes.
Their early sections describe historical limitations; current source supersedes
those implementation-status paragraphs. Their retained binary/JSON findings
remain valid within each stated fixture scope:

- Bone keys are raw f32 frames; mixed Bezier handle blocks depend on current OR
  previous Bezier. Named animations and 24/30 FPS are directly measured.
- Slot attachment values are typed nullable inventory references; RGBA has four
  independent float channels. Combined RGBA does not prove separate RGB/alpha.
- Constraint target/owner relationships and Event definitions/materialized values
  are directly observed; global targets and original firing/UI gestures are not
  implied. Imported/exported inputs do not prove Physics dynamics.
- Existing independently encoded UI-source exports establish the bounded profiles
  already recorded in F105. Do not rerun those unchanged original oracle batches.

Raw helpers already exist in ignored research folders, notably
`.local/research/animation-constraints-events-data/read.py` and its predecessor
animation-slot/geometry readers. Reuse their tested reference arena/schema work,
with a fresh output folder/manifest. These are research parsers, not a second
editable product engine. Do not put personal file contents, exported art or names
in Git.

## Next discriminating measurement and candidate fixes

First obtain immutable local copies and a hash inventory. Run the actual current
`decode_scene` against each copy, not just `ProjectEnvelope::inspect`.
`crates/fbones-format/examples/inspect_corpus.rs` currently only counts envelopes
and only filenames ending `4.3.26.spine`; it cannot answer editability. No existing
public diagnostic exposes the failing semantic stage: most boundaries collapse
into `UnsupportedProfile`.

If a file rejects, use a research-only traced decoder/parser to distinguish:
unknown class/track, unsupported typed owner, validation budget, unknown retained
field/order, unsafe resource path, or postdecode clipping/resource policy. Record
first failure position/class/tag without exposing project content in tracked
reports. Compare against a small own fixture before attributing semantics.

Priority candidates **conditional on evidence**, not blanket implementation:

1. If a known profile is rejected by a coupled budget, raise only measured safe
   limits with adversarial bounds and native/UI performance evidence.
2. If a known supported model differs only by unrepresented editor metadata/order,
   preserve it explicitly and losslessly in typed encoding; independently verify
   a newly authored copy in original 4.3.26. Never bypass complete equality.
3. If an unknown feature blocks a real rig, recover that feature from a controlled
   minimal own 4.3.26 A/B fixture informed by the corpus observation. Separate
   RGB/alpha/TintBlack and global Physics are likely useful remaining families,
   but their presence in Vampir remains unknown.
4. If files decode but fail visible playback/key editing, use existing isolated
   real Rust Session tests to reproduce the concrete gesture and fix it while
   retaining Setup/key/history/save invariants. The initial audit alone identifies
   no confirmed runtime bug.

Do not claim a file is animatable from an envelope/partial parse. Required proof
is actual rendering, playback/scrub, a key edit with Undo/Redo, native save/reopen
on a copy, and independent original acceptance for a newly encoded profile.
Full F105 and full compatibility remain open; deferred F307/F308 probes are not
restarted by this audit.

## Gate for independent timeline interaction fixes

Before coding, current `useAnimationWorkspace.ts` proves loop endpoints already
belong to workspace view state (`animationLoopStart/End`); selection resets them,
while timeline mode/dock remount must not invent a different range. A rejected
range must not appear accepted in component fields. Null endpoints mean effective
start0/end current clip duration; require effective end greater than effective
start, as well as finite nonnegative authorable frame bounds. Playback must
normalize a frame outside the effective interval **before** dispatching start
Events or advancing the clock. Otherwise a range10..20 begun at frame0 can emit
frame0 Events and spend time outside its displayed range. Source audit and UI
agent's controlled composable probe independently confirm this failure shape.

Adopt explicit FBones interaction policy: selecting/dragging keys, dragging a
Graph handle or beginning key-box selection pauses playback before capturing the
gesture's frame/identity. Pause freezes view state, creates no key/history entry
and does not mutate Setup. This prevents playback's per-frame invalidation from
canceling the in-progress edit; preserve stale document/revision/clip protection.
Exact original4.3.26 loop-entry/Event and pause-on-pointer gestures are UNKNOWN;
no parity claim follows from this policy. Accepted screenshot/data findings do
not need a fresh original launch for this bounded interaction fix. Verify through
real Rust Session pointer/keyboard tests and independent Event clock tests.

## Actual copied-corpus results and diagnostic prototype

Subsequent investigation used eight coordinator-pinned **copies**. Current native
Session opens all eight envelopes as inspection-only, exposing zero editable
bones/animations. Eight attempted edits return `InspectionOnly`; native Save Copy
and reopen preserve all source bytes. Independent DATA verification recomputed
all eight original/local-copy/saved-copy hashes and byte equality, and inspected
the native rejection/reopen results. It did not repeat mutations in original Spine.
Private inventory, session outputs and all raw parser logs remain ignored in
`.local/research/vampir-2026-11-06/`.

First rejecting site per project, using a disposable traced **copy** of the
current codec with the product's original guards retained:

| First observed boundary | Projects | Proven meaning |
| --- | ---: | --- |
| Generic116 has a nonzero leading value | 4 | Current reader only accepts zero; values1/2 are observed. Semantics unknown. |
| Object123 inside Region43 | 2 | Unknown object class; not a broken image-loading diagnosis. |
| Custom132 timeline kind22 | 1 | Unknown timeline discriminator; current whitelist correctly rejects it. |
| Slot-track owner permutation validation | 1 | Known typed tracks parse, but original group/track ordering cannot be reproduced by the canonical model. |

These are **first failures**, not complete feature inventories. None proves the
rest of a rejected project is supported. Independent review confirms Object123
looks like a four-field integer record and kind22 looks sequence-related, but
**Sequence is a hypothesis**, not a recovered supported serializer. Generic116
begins with Bone12 object-shaped data; an exploratory object-array hypothesis
reaches later identity/grammar failures and does not establish its full format.
Do not broaden its product parser from those observations.

The smallest project reaching typed extraction also contains image metadata with
stored width=height=0, rejected at this stage by positive-size validation. The
initial Region inference from `image()` was incorrect: the later paired
[lossless gate](ANIMATION-LOSSLESS-IMPORT-DATA-2026-11-06.md) identifies Mesh46
with independent stored vertices/UVs and records the implemented source-only guard.
This is stored source data, not permission to use arbitrary texture dimensions or
to replace its geometry. Source-safe placeholder behavior needs separate design
and tests.

A research-only ordering prototype explicitly retained original bone-owner groups
and within-group bone/slot track order. Its purpose was to test whether ordering
alone solved losslessness. For this27,253-byte payload, the first reencoding
mismatch moved from byte142 to byte1765, while the candidate remained27,260bytes.
The next mismatch is Region43/tag13: the original references an existing generic
string (`0e`), whereas the writer allocates a new string holding the same text
(`01 81`). Our semantic text fields do not retain this alias identity. The model
therefore **still fails complete equality** after the ordering prototype. No
product order extension, size relaxation or equality bypass was integrated.
Research-only relaxed branches are explicitly separate ignored clones and are
not fixtures or editable-profile evidence.

The product format sources remain unchanged. Reproducible ignored evidence:
`data-audit-result.json`, `data-evidence-manifest.json`,
`diagnostic-{first,second,paylines,after116}.log` and the named Paylines-stage
logs. Manifest SHA256:
`ea318ff23f21610ba00ebea288112c14a2bac793a707fb195a28dd7690c03357`.
It pins original codec sources, both diagnostic clone sources/manifests, prototype
script, source inventory, native results, raw observations and independent checks.
The clones are disposable research tools; they neither save originals nor define
an accepted profile. Initial and failed experiments are retained.

### Next exact action

Keep all eight projects inspection-only. First establish typed lossless provenance
for original animation group/track order **and generic string alias identity** on
a controlled own fixture. Semantic track identities should survive native array
permutations/deletion; raw array indices alone would become stale. Preserve the
old canonical writer when provenance is absent. A new-file authoring policy must
not erase original metadata. Add bounded validation for provenance and independent
byte equality before exposing the profile to the native editor.

Separately, prepare one controlled exact4.3.26 own Sequence fixture varying
count/start/digits/setup and keyed mode/index/delay one at a time, comparing
untouched siblings and retaining full raw-reference accounting. Confirm whether
it maps Object123/kind22, then implement only that measured family. Generic116
requires its own discriminating collection/selection-state probe; do not treat a
sequence finding as proof of it. Zero-size Region rendering/editing remains a
separate source-preservation question. These actions require an isolated owned
original session and fresh lifecycle evidence; none was performed here.

Independent loop verification ran repository-style direct Node invocations:
`node tests/animation-playback-range.test.mjs` (3/3) and
`node tests/animation-event-clock.test.mjs` (2/2). Assertions cover below/above-range
entry before first Event, restart/loop boundary order, invalid/default/oversized
ranges, changed-duration clips and unchanged project data. Result:
`data-loop-independent.log`. This supports the bounded FBones interaction fix;
it does not turn any copied real project into an editable one or prove original
Spine gesture/Event parity.

The subsequent known-record lossless extension, corrected Mesh46 variant,
source-only zero-image permission and current verification gates are recorded in
[Lossless import DATA](ANIMATION-LOSSLESS-IMPORT-DATA-2026-11-06.md). The all-eight
inspection-only status and unchanged-product statements here describe this
initial baseline, not that later implementation's acceptance state.


This note records the initial diagnostic stage. The later lossless DATA/UI gates
and current STATE supersede its all-eight-inspection-only implementation status;
raw failed experiments and their manifests remain retained unchanged.
