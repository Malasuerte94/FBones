# Six guarded sources: pre-implementation admission triage

2026-11-06. Read-only product review; source names/paths stay private. Case letters
reuse the existing [Sequence capacity inventory](ANIMATION-SEQUENCE-PERSISTENCE-DATA-GATE-2026-11-06.md).
No original/platform retry, shared build/test or product-limit change was made.

This is the retained **pre-code** inventory and proposed-budget snapshot. The
later [two-color integration result](ANIMATION-TWO-COLOR-INTEGRATION-2026-11-06.md)
records A's complete equality/native admission and the measured aggregate
4096tracks/8192keys/16384domains decision. Five sources remain guarded. The table's
old512/4096/8192 aggregate comparisons are historical, not current product bounds;
per-clip512/4096 and bone/geometry/resource limits remain unchanged. Reuse the
identified structural evidence without treating these proposals as new work.

**Split14–17/Generic116 support alone admits none of the six remaining copies
under current bounds.** Five already exceed the128-bone cap. A fits bone/slot
limits and has no scalar split tracks, but exceeds the global track/key/domain
caps. Its independently identified two-color data is the relevant next feature,
alongside a separately justified capacity decision. Resolving Path69/kind39 is
not necessary for A and would not remove G's other known budget failures.

| Case | Existing first structural obstacle | Other proven current budget failures |
| --- | --- | --- |
| A |10,589domain objects exceed8192; arena object8193 is class132. Its retained kind4 records include two-color lanes. |2203tracks>512;6764keys>4096. Bones116/slots112 fit. |
| B | Nonempty Generic116 at decoded record offset116, count2. |157bones>128.193tracks/2153keys otherwise fit these global caps. |
| E | Targeted copied-input prefix stops at nonempty Generic116 offset288990, count1, after3005domains/5583generics. |249bones/265slots;2712tracks/4508keys/11922domains; one308-vertex Mesh>256. |
| F | Nonempty Generic116 at offset117, count2. |461bones/339slots;4785tracks/17975keys/30387domains/19700generics;4983geometry vertices>4096. |
| G | Nonempty Generic116 at offset125, count1. Diagnostic continuation uses a candidate class69 shape, then stops at custom132/kind39 offset122624. | Runtime lower-bound inventory474bones/369slots/2178timelines already exceeds corresponding limits; no full editor graph claimed. |
| H | Nonempty Generic116 at offset122, count1. |221bones and522tracks.2581keys/6258domains/7078generics fit those caps. |

Offsets are zero-based record starts from retained reference-aware probes, not
old after-token diagnostic positions. E's new prefix probe reuses the frozen
reader and stops at the first current structural guard; it is not a new product
decoder run or full semantic validation. A's unavoidable arena boundary comes
from the retained complete arena, not a new instrumented product run. Full
diagnostic grammar does not prove full typed reserialization, inheritance,
geometry validity or remaining unmodeled editor flags. No unknown field may be
dropped to pass these limits.

## A: bounded capacity evidence

The retained full graph contains an84,683-byte compressed source and363,416-byte
payload,10,589domains and5017generics. Its12clips have these active sizes:

| Clip index | Tracks | Keys |
| --- | ---: | ---: |
| 0 |170|2418|
| 1 |114|432|
| 2 |183|1511|
| 3 |1|2|
| 4 |1|2|
| 5 |268|366|
| 6 |346|521|
| 7 |268|394|
| 8 |357|453|
| 9 |308|442|
|10|186|217|
|11|1|6|

Thus the busiest clip has357tracks, and the largest key count is2418 in another
clip: both fit current512/4096active-size figures. Global admission limits still
apply today; this observation does not authorize raising them. Key batches can
remain bounded independently from future total-project capacities.

A diagnostic native-shaped projection of bones, slots/images and all animation
views measures1,044,754bytes using shortest-roundtrip-f32 estimates, or1,345,651
bytes retaining full decoded f32 decimal expansions. The largest single clip is
495,186bytes in the latter representation. This is **not an actual IPC DTO**:
one Setup Transform constraint and the3deform/6draw-order key payloads are omitted,
and document/library metadata is absent. The estimate retains all light/dark
lanes and the other complete keyed families; it is a cost model, not an admitted
project or a preservation shortcut. Actual Rust summary/encode/history and JS
sampling measurements remain coordinator-owned before a capacity change.

Fixed referenced-path IHDR/stat reads find190unique PNGs,16,157,002compressed
bytes,181,294,408estimated RGBA bytes and maximum side3001. All fit the unchanged
128MiBcompressed/256MiBdecoded/4096-side cache limits; no referenced PNG is missing.
There are629expanded references including546Sequence frame references, reusing
those190files. These are header/cache estimates, not fresh PNG decoding, shader
memory measurements or pixel acceptance. No texture was copied or modified.

The retained graph additionally has85Regions/27Meshes,468geometry vertices,
maximum77vertices per Mesh,14weighted Meshes and at most12binding bones. All116
Bone12/tag27 values are1. The existing runtime summary has only the default skin,
and no Path or animated inheritance timeline. This finds no additional skin/
inheritance/count obstacle in that evidence; complete typed encoding must still
check every Setup/mesh flag, weight, UV/edge/triangle and source identity.

## Decision and reproducible next action

Implement and independently verify the separately correlated Setup dark-color
and seven-lane light/dark record contract on small own fixtures first. For A,
measure current production samplers on the actual active-clip sizes and measure
an isolated complete typed codec/summary/history path under explicit proposed
total-project caps. Keep per-action, image, geometry, bone/slot and unknown-record
guards intact. A passing resource budget does not prove native performance or
original acceptance. Other large sources remain guarded; do not raise bounds
merely to move to a later unsupported record.

Private reproducible tools/results live under ignored
`guarded-source-triage-2026-11-06/`: `inventory.py`, `guarded-inventory-v1.json`,
`source-a-capacity-v1.json`, the diagnostic projection and PNG header list, plus
`prefix-e.py`/`source-e-first-guard-v1.json`. The first inventory attempt's Python
syntax failure is retained separately. Inputs reuse the prior corpus/runtime/
inventory reports and DATA's one retained A graph; no runtime batch or broad
original-source rescan was repeated. Names, file paths, PNGs and raw graphs are
excluded from this aggregate note.

## Native capacity counteraudit before any limit approval

Read-only source audit against the proposed total4,096tracks/8,192keys,
per-clip512tracks/4,096keys and16,384scene-domain budget. These numbers remain a
proposal, not authorization or an admission claim. All bone/slot/mesh/image,
recursion, byte, resource-expansion and deform-coordinate limits stay separate.

A concrete codec/native mismatch exists in `src-tauri/src/animation.rs`:
`set_keys` checks the sum of **bone-only tracks across every clip** against512
and bone-only keys against4,096 after applying any bone input. The retained A
projection contains860bone tracks and3,975bone keys. Thus even a property-only
bone-key overwrite would reject at the old global track check after codec-only
admission. Mixed K/batches containing a bone key would reject there too. The
old bone-key check would also impose an unintended tighter global family limit
once enough new keys were added, despite the proposed8,192total limit.

The other native limits are different scopes and do not block A's current data:

| Native guard | Scope/action |
| --- | --- |
| `animation::selected_keys`,4,096 | Distinct keys in one clip for move/delete; retain |
| Bone/slot/order/deform/constraint/Event/Sequence `set_keys`,4,096 | Input batch for that family; retain |
| Sequence expansion16,384 | All resource references/paths; retain |
| Deform request512/move256 | Attachment request/vertex gesture limits; retain |
| Animation count64/FPS1…240/frame0…1,000,000 authoring | Separate authoring limits; retain |

`SceneHistory::apply` mutates a cloned candidate, reconciles identities/metadata
and calls the complete format encoder before publishing. The final format
validation therefore already supplies one atomic all-family source of truth for
new/update/delete/move/duplicate edits. Remove the obsolete bone-only global
checks once the paired capacity gate authorizes the shared limits, or replace
them with a shared all-family budget helper; do not change batch limits to the
new global key cap. A format-only increase leaves real bone editing unusable.

Recommended public format constants distinguish total/project, per-clip and
scene-arena scopes explicitly, e.g. `MAX_PROJECT_ANIMATION_TRACKS`,
`MAX_PROJECT_ANIMATION_KEYS`, `MAX_CLIP_ANIMATION_TRACKS`,
`MAX_CLIP_ANIMATION_KEYS`, `MAX_SCENE_DOMAIN_OBJECTS`. Count every bone, slot,
Sequence, deform, constraint and Event track, plus one track for a nonempty draw
order. Count all their keys. Preserve separate4,096native request/selection
bounds, ideally named `MAX_ANIMATION_KEY_BATCH` rather than reusing a global
model constant. `SetAnimationKeyBatch` currently checks each family separately;
it has no explicit combined-length guard. An explicit total4,096request bound
would make the stated batch policy true before allocating candidate work.

The format audit must cover the final counted scene writer and **all** custom
reader domain registrations, including133keys and deform vectors; changing only
ordinary `Reader::domain` is insufficient. Keep per-track key-list4,096,
generic-object16,384, generic-array512, depth256 and extra-domain/deform budgets
independent. Shared reader legacy entry points should retain their old arena
budget; prefer an explicit per-reader limit rather than raising every profile
because the `scene-codec` feature was compiled. Wire group512 is per clip and
remains consistent with the proposed per-clip512track cap.

Required integration evidence after authorization: own multi-clip model above512
bone tracks and4,096total keys must open, perform an existing bone-key property
edit and mixed-family key batch, Undo/Redo, Save/reopen with exact unrelated
bits/IDs. Exact per-clip/global boundary violations and overlarge batches must
reject atomically; duplicate a small clip within the global budget and reject a
large duplication that exceeds it. Run the actual A copy through the same native
operations only after its complete typed reserialization and capacity/performance
gates. This audit ran no Cargo build, shared test, original process or product
mutation. Private derived counts: `guarded-source-triage-2026-11-06/` file
`source-a-native-budget-v1.json`, using only the previously retained diagnostic
projection (which excludes one deform and one draw-order payload).
