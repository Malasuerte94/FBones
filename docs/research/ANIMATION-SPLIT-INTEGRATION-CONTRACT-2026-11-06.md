# Split-axis implementation contract — 2026-11-06

Pre-code coordinator decision after the current paired
[DATA](ANIMATION-NEXT-SOURCE-SPLIT-DATA-GATE-2026-11-06.md) and
[UI](ANIMATION-SPLIT-LARGE-RIG-UI-CONFIRMATION-2026-11-06.md) gates. Target H needs
typed split-axis persistence and a separately measured Scene-bone/active-track
capacity decision. B's nonmonotone Rotate and nondefault inheritance remain
guarded. Semantic implementation starts under existing product capacity limits;
proposed256Scene bones/1024active tracks require their later measured gate.

The format model follows DATA's frozen API: four scalar BoneChannel variants,
dimensions(), ordered Animation.split_modes and typed BoneSplitMode/Config.
Only explicit1/2 modes with complete nonempty paired axes are supported. No
conversion, bitmask inference, empty-axis repair, raw graph or opaque payload.
Existing canonical combined files and unrelated timeline guards remain unchanged.

Frontend exports distinct AnimationFamily (four shared transform families) and
AnimationChannel (families plus translateX/Y, scaleX/Y). Native transport retains
two value lanes/two control axes; dimension1 uses exact positive-zero padding.
Export animationChannelDimensions(channel), animationChannelFamily(channel),
animationFamilyChannels(storedChannels,family) and animationBoneChannels(clip,bone).
The latter two derive the validated representation from actual per-bone clip
tracks, never from the active tool or a global eight-name capability list.

Manual shared-family Key explicitly keys both separated axes in one command;
axis-row Key keys only its axis. Dirty K/Auto Key consume only actually changed
physical axes. A mixed selection routes each bone's representation independently
within the same atomic native batch. The four shared transform rows remain.
Zero Setup Scale checks only the addressed axis. Combined sources retain their
existing behavior. New ordinary tracks remain combined; scalar paste into a
combined target rejects rather than silently converting it.

Every scalar projects one value/curve/handle set; Y component0 remains labeled Y.
Unused padded controls never receive a clipboard/retime offset. Independent
axis draft intent survives successful edits, Save, verified resource changes and
newer clean reverts; a scalar publication cannot consume its sibling. Complete
authored comparisons retain new mode metadata. Default clip lifecycle/discard,
stale guards and invalid-field Save blocking remain.

Format owns binary/semantic validation and final complete reserialization.
Native owns IDs, sampling, remapping/drop of ordered configuration rows, all
key/history transactions and incompatible delete/paste rejection. Frontend
sampling is the existing single-full-weight f64 policy using pinned secondary
runtime defaults, not new original-editor numeric/gesture proof. Exact monotone
bone-time validation applies; genuinely reversing curves stay inspection-only.

Ownership: DATA implements format and own codec tests; native implementer owns
src-tauri scalar integration/fixtures/tests; UI owns Timeline/Tools/timeline-domain/
i18n and compiled-control/UI specs; coordinator owns frontend domain/workspace/
retention/App integration and shared builds/tests. No shared runner is concurrent
with a frontend rebuild. Actual H payload equality, native resource/history/DTO/
Save/reopen and independent saved-file verification precede admission claims.
Browser/GPU/native-platform/original acceptance remain distinct pending gates.

## Measured capacity decision — continuation2026-11-07

After the paired [bone DATA](ANIMATION-BONE-CAPACITY-DATA-2026-11-06.md) and
[capacity UI](ANIMATION-BONE-CAPACITY-UI-GATE-2026-11-06.md), coordinator approves
Scene-only **256bones and1024per-clip tracks**, with the authoritative shared
structural-reader closure before an encoded Scene can publish. Legacy128bones,
reader depth256, aggregate4096tracks/8192keys, per-clip/per-track4096keys and all
slot/binding/member/geometry/resource/cache/file/generic bounds remain unchanged.

Actual H independently reencodes all310454payload bytes under that isolated
profile, retaining the complete model. With final closure it takes42.47ms decode,
21.97ms encode in one debug run;100actual-model clones add54340KiB RSS. Prior A
still reencodes all363416bytes exactly. Own256wide/high-index255 cases and
522/1024active tracks with4096keys pass independent native/TS source comparisons;
legacy129/Scene257/binding129/forward-parent and depth246 negative controls reject.
The raw ancestor-chain boundary is245accepted/246rejected for the measured wire
shape; it is not a new ancestor-count rule or an increase of reader depth.

Actual compiled Tree/Timeline and production Pinia/projection instantiate all own
221/256bone cases and pass high-ID selection/search/collapse/navigation/key-row
checks, with explicit synthetic-host cost limits in the paired UI gate. This
does not prove browser layout, GPU or native pointer responsiveness.

Scene whole-bone color, transform and reparent command bounds may coherently use
the same256inventory maximum, retaining one atomic transaction and existing
membership/finite/topology/evaluation checks. Test colors/transform at256 and
atomic257 rejection. Reparent retains its root restriction, so a256-bone rig has
at most255 valid nonroot members; test255 success plus root-containing256 and
overlength257 rejection, preserving that independent topology rule.
Legacy commands, Physics/constraint member batches and dense binding128 remain
independent. Do not split AutoColor into multiple history entries. Native
structural-depth rejection must preserve authored model, IDs, revision/history,
dirty state and files. Product checks and actual H Session/history/DTO/resource/
portable Save/reopen still gate any admission claim after these capacity lines.

## Native semantic handoff

Native source now exposes eight stored channels and optional ordered nonempty
`splitModes` rows with stable bone IDs/wire modes. Scalar validation requires
exact+0second value/control padding, existing configured representation and the
shared exact monotone-time predicate. One-axis sampling and moved handles touch
only the active lane; same-frame scalar updates retain numeric-equal source bits
(including negative zero) for frame/value/control fields. Ordinary combined
creation and existing unrelated family guards remain unchanged.

Mode addresses remap through stable bone identities while preserving row order.
Existing dangling-key bone deletion still rejects; it is not permission to drop
animation data. Last-axis deletion/incompatible paste cannot publish an incomplete
configuration because the complete candidate format guard remains before commit.
Clip duplication clones configurations and allocates fresh key IDs normally.

`scene_split_fixture.rs` and opt-in `e2e_seed_split_fixture` provide an own bounded
three-bone/seven-PNG/mixed-family source: independent Translate X/Y and Scale X/Y
pairs, asymmetric times, stepped/Bezier/linear curves, ordinary Rotate and an
ordinary second clip. Six owned native tests cover sampling, raw bits/no-op,
atomic padding/representation/nonfinite/deletion rejection, handle retiming,
mode/stable-ID reorder/duplication, mixed key batches and real Session evaluation/
portable Save/reopen. New test/fixture syntax was checked; coordinator compilation
and execution remain required. Product bone/clip capacities are unchanged by this
semantic handoff; there is no original/browser/GPU or actual-H admission claim.

## Approved native capacity handoff

Following the measured capacity decision above, only Scene Create, color-batch,
whole-bone transform and reparent request guards now use format
`MAX_SCENE_BONES`. Legacy Rig128, Physics/constraint members128, binding128,
slot/image and all other budgets remain unchanged. There is one command/history
transaction for each whole operation; AutoColor is not split into subcommands.

Three prepared native regressions cover Create255→256/atomic257; successful
256color and256transform operations with one Undo; meaningful254bone reparent,
255nonroot no-op and atomic root-containing256/oversized257requests; and the
structural-depth precommit rejection through real Session. The root and selected
ancestor rules inherently make255nonroot reparent-to-root a no-op in a256bone
inventory, so no topology guard is weakened to manufacture a256positive case.

The depth fixture starts from a successfully encoded/decoded245long chain plus
a spare ancestor. Reparenting inserts that ancestor into the first-referenced
chain, exceeding structural depth while remaining below inventory256. It must
reject without publishing model/IDs/revision/dirty/history or touching source and
an existing target, after which the unchanged safe model still saves. Test source
syntax was checked; coordinator compilation/execution and actual H checks remain
pending. This handoff alone is not an admission or original acceptance claim.
