# Bounded Sequence persistence DATA gate — 2026-11-06

Pre-code contract, reusing [paired Sequence findings](ANIMATION-SEQUENCE-DATA-2026-11-06.md)
and the current codec/native source. No new runtime-parser collection or original
operation is needed for this gate. The coordinator authorizes a complete bounded
worktree feature; original new-file acceptance and GUI delivery remain pending.

## Typed contract

Keep legacy `Region`/`Mesh` types and their profiles unchanged. Add:

- `SceneProject.attachment_sequences: Vec<AttachmentSequence>` with
  `{attachment: AttachmentAddress, settings: SequenceSettings}`. Settings are
  nonnegative `start/count/digits/setup_index` integers. Sequence ownership follows
  attachment inventory, independently of slot activation, selection or draw order.
- `Animation.sequence_tracks: Vec<SequenceTimeline>` with target attachment and
  keys `{frame:f32, mode:SequenceMode, index:u32, delay:FiniteF32}`. Observed mode
  values0/1/2 map to Hold/Once/Loop; keys have curve0 and no Bezier block. Frame and
  delay bits are preserved. Decoder mode/index lanes must round-trip exactly to
  the typed values as f32, rejecting fractional/unobserved/negative-zero carriers.
- `WireTrack::Sequence { attachment }`; owner is that attachment's slot bone.
  Full layout/family-vector equality remains mandatory. Normalize setup rows in
  global attachment-inventory order; native structural edits remap through stable
  attachment IDs, then normalize without silently dropping malformed rows.

Codec `SequenceSettings::validate` and `path(base,index)` expose pure arithmetic
and filename-stem expansion, without filesystem access or `.png` appending.
Count1..4096 and digits0..10 are **FBones budgets**, not measured original ranges.
Require setup/index<count and checked `start+count-1<=i32::MAX`: observed positive
integer lanes encode as twice the value in a u32 varuint, so unchecked u32 shifting
would corrupt large starts. Delay is finite and strictly positive. Frame is finite,
nonnegative and ordered; native authoring retains the existing frame budget.
Current PNG count/byte/decoded-memory limits are unchanged.

## Wire and identity

Region43/tag15 and Scene Mesh46/tag36 become nullable Object123 links, leaving
legacy Mesh serialization unchanged. Null remains byte0, preserving old canonical
bytes. Sequence123 uses four integer fields in observed order4,2,3,1; positive
values encode as `value<<1`. All216observed settings objects were fresh domain
objects; shared settings identities remain unsupported and must reject.

Custom132 kind22 carries a fresh counted generic key list; each fresh domain133
key has f32 frame, f32 mode/index/delay and curve0, then the track carries a typed
Slot13 link and a separate Region43/Mesh46 object reference. It is not a bone key,
slot activation key or texture-region name string. Existing traces contain541new
track bodies and729new key bodies, equal to the referenced counts: cached key-list
or key-object reuse is not established. Reject those unrepresented identities;
never copy unknown bytes. Preserve every unrelated arena reference via complete
payload reserialization equality, including existing wire-string/layout metadata.

## Native integration obligations

Native supplies stable Sequence key IDs, summaries and one-history atomic setup/
key batches. Extend animation create/duplicate/delete, all-family key selection/
move/delete/clipboard, duration, revision guards and stable-ID remapping. Deleting
a target removes/remaps dependent settings and keys atomically; removing settings
while keys reference them must reject or use an explicit tested authoring policy.
Region↔Mesh conversion with the same attachment identity retains settings; Clipping
cannot own them. Source-only zero-image Mesh permission remains independent.

Expand validated resource paths for all frames on portable Save As and preserve
roots/aliases/history transactionally. Do not create slots per frame or mutate
Setup activation while sampling. Main/Preview/native share the same discrete
frame-selection policy and original raw data; no per-frame filesystem/full-scene
IPC. Hold/Once/Loop endpoint/rounding rules and unfamiliar gestures are explicit
FBones policies until independently observed; persistence does not prove playback.

## Remaining gates

Within this observed nonnegative, fresh-identity, curve0, mode0/1/2 profile there
is no known missing record lane. Negative settings, other modes/curves, cached
identities and non-30FPS original Sequence timing remain unmeasured and excluded
from parity claims. First independently decode/encode the small real candidate
with whole payload equality; any other metadata mismatch blocks editability.
Then verify native key/history/save/reopen, actual pixels/interaction and a fresh
independently encoded own copy in original4.3.26. The original/platform gate is
currently unavailable, not implicitly satisfied by corpus correlation. Do not
publish a Windows replacement or claim complete compatibility from worktree tests.

Inventory counts/budget findings will be appended from existing runtime summaries
and read-only editor graph inspection; no bounds are raised to force a project in.

## Existing budgets and actual candidate

Read-only inspection reuses the frozen editor graph reader and existing runtime
summaries; the runtime decoder was not rerun. Private row IDs follow the pinned
source manifest, avoiding project contents/paths here. Current model caps remain
128bones/slots,64clips,512total tracks,4096total keys,8192domain/16384generic
objects and4096total mesh/clipping vertices (256per individual geometry).

| Case | Bones / slots | Tracks / keys | Domains / generics | Conclusion |
| --- | --- | --- | --- | --- |
| A | 116 / 112 | 2203 / 6764 | 10589 / 5017 | Track/key/domain caps and other color variants block it. |
| B | 157 / 56 | 193 / 2153 | 4287 / 4328 | Bone cap and split-axis/Generic116 data remain separate. |
| C | 10 / 6 | 238 / 752 | 1224 / 649 | Existing supported no-Sequence control. |
| D | 10 / 18 | 137 / 214 | 517 / 497 | First bounded Sequence integration candidate. |
| E | 249 / 265 | 2712 / 4508 | 11922 / 11972 | Multiple caps; one mesh also has308vertices. |
| F | 461 / 339 | 4785 / 17975 | 30387 / 19700 | Multiple caps, including4983geometry vertices. |
| G | Incomplete editor graph | — | — | Unmodeled kind39; runtime inventory also exceeds current bounds. |
| H | 221 / 82 | 522 / 2581 | 6258 / 7078 | Bone/track caps and split-axis data remain separate. |

CaseD has18attachments,3clips,16Sequence settings and only known RGBA/activation
tracks plus48Sequence tracks. It has48authored mesh vertices (maximum4perMesh),
zero constraints and no split-axis map. These figures include the proposed
Sequence objects/keys; no limit increase is needed. It is newly *reachable for
strict decode/encode investigation*, not yet proven fully editable: independent
metadata/field mismatches still have to pass complete equality.

Its357referenced Sequence frames reuse100PNG files. Header-only inventory reports
516,271compressed bytes,26,148,464estimated RGBA bytes and maximum side500, within
unchanged native cache/count/side caps. This is not PNG decoding or rendered-pixel
acceptance. Private evidence: `animation-sequence-contract-2026-11-06/` inventory
script/result and candidate resource estimate. No budget was raised.

The native structural regression additionally exposed an existing representation
invariant: each slot's local attachment inventory must equal the filtered global
`attachment_order`, because the current reader assigns local indices in that
order. A move may preserve global rank while inserting locally before an existing
attachment. Native must remap stable IDs/active selection/settings/keys together;
the codec must reject contradictory local/global orders rather than silently
reorder an authored model on reopen. This reuses the existing complete-inventory
DATA/UI findings; it is not a newly inferred original gesture.

## Necessary attachment-tint extension: finding before color code

The first strict candidate decode/encode has equal18,674-byte payload lengths,
but57bytes differ: every difference is an image attachment color that the old
writer hardcoded white. Sequence settings, keys and remaining bytes already align.
A coordinator-authorized **one-candidate, new-field** query reused the pinned
public runtime decoder and input, adding color observations only. All18Region/Mesh
attachment RGBA colors match the converted editor bytes exactly (Region43/tag14,
Mesh46/tag31), independently of18slot light colors. All18attachment colors are
nonwhite; this is meaningful Setup tint/opacity, not safe-to-drop opaque metadata.
No original process or rendered image was observed by that query.

Before dependent implementation, add typed
`SceneProject.attachment_colors: Vec<AttachmentColor { attachment, color:[u8;4] }>`
for Region/Mesh only, canonical omission of white, inventory-order normalization
and `attachment_color(address)` defaulting to white. Legacy Region/Mesh structs
remain unchanged. Native stable-ID remapping carries tint through Region↔Mesh;
Clipping keeps its distinct existing color. Setup color edits are atomic history;
sampling never keys/bakes tint into slot RGBA. Main/Preview multiply attachment
RGBA by sampled slot light RGBA once; use the existing shader/alpha convention.
Paired UI guidance distinguishes attachment Setup color from the slot color key.
Full payload equality and native/render tests remain required before editability
or visual acceptance. Private one-query receipts and exact byte comparisons are
`runtime-color-v1.json` and `color-correlation-v1.json`; initial mismatch/failures
remain separate. This is a justified scope addition for preserving the real
candidate, not a claim that every broader tint timeline is supported.

## Codec handoff

Current independent codec tests pass59/59 (the previous53plus6new Sequence/tint/
identity/order tests); the unchanged legacy format profile passes16/16 and strict
all-target format Clippy passes. The real candidate now decodes and independently
reencodes **all18,674payload bytes identically**, including16settings,48Sequence
tracks/52keys and18nonwhite tint rows. The existing27,253-byte no-Sequence control
also remains identical. No file count, geometry, track/key or arena cap was raised.

Evidence/result: ignored `animation-sequence-contract-2026-11-06/codec-result-v1.json`;
source/tool manifest `codec-evidence-v1.json` SHA256
`abf08b6c4b4e202fb177bac86d845818e3ce864456ae514f88c182b59be6f2df`.
It retains initial candidate mismatch, targeted color query, invalid-input and
identity tests, current source hashes and positive byte comparisons. These are
codec gates only; native authoring/resource/history, GUI pixels and fresh original
acceptance remain coordinator-owned requirements, not implied successes here.

## Independent native edited-file proof

Read-only verification of the coordinator's new native three-clip candidate
passes through two independent paths. The frozen Python graph reader consumes
all18,674source and18,728saved payload bytes plus their exact trailers; both
compressed envelopes pass length,CRC64 and end-marker checks. After removing only
the intended new root Translate track/key at frame11,values[1,2] and the existing
Sequence track's new frame11,Loop/index2/delay0.125key, the complete rooted graph
is identical. The comparison normalizes shifted arena indices, preserving actual
object/string sharing relations, field-tag/collection order and all2,704original
f32 scalar bits. The only additional field change is portable audio-root
`./audio/`→`./audio`; the image root stays `./images/`.

Separately, a standalone Rust checker constructs exactly those two intended edits
from the source model and retained semantic layout, applies the documented root
normalization, and compares the entire decoded saved model. Its independently
encoded payload and **entire compressed envelope** exactly equal the native Save
As output. Source52Sequence keys become53; a new bone Translate key makes the
total214→216. All16Sequence settings,18attachment tints, unrelated keys/metadata,
206Setup f32 values and240mesh geometry f32 values remain unchanged, including
48mesh vertices and12source-marked zero-image Mesh records. Skeleton46 retains
bits1112014848. Original, pinned and session input bytes match; all100PNGs match
across original/session/portable output copies.

Ignored receipt/result/tools: `sequence-implementation-2026-11-06/actual-sequence-native-result.json`
and `independent-data-v1/{raw-check.py,raw-result.json,src/main.rs,typed-result.json}`.
The new independent manifest `independent-data-v1/independent-evidence-v2.json`
pins code, receipts, input/output bytes and resources, SHA256
`2b13bccd9a4fb9284c134123723f67872af80a4841807f494b4681df4a577c30`.
Initial probe corrections and failure logs are retained privately. No product
code changed for this verification; no old runtime/original batch was rerun.
This proves source-safe native persistence for this edited copy, without claiming
original new-file acceptance, editor gestures, GUI rendering or pixel parity.

## Numeric-equal Sequence key overwrite: pre-fix DATA requirement

The accepted raw-frame contract includes finite nonnegative frame `-0.0`; the
codec fixture explicitly preserves its bits. Current native
`animation_sequence::set_keys` locates an existing key by stable key ID with a
numeric-equal frame check, or by numeric-equal frame without an ID, then rebuilds
that key with the submitted `position`. JavaScript JSON serialization turns
`-0.0` into `0`, so a mode/index/delay-only edit can unintentionally rewrite the
existing frame from bits0x80000000 to0x00000000. This is directly established from
the current code and existing codec test, independent of original-editor gestures.

Before the dependent native fix, require a numeric-equal overwrite to retain the
selected existing key's exact stored frame bits in **both** addressing routes.
Change only the requested mode/index/delay while retaining stable ID, track owner,
unrelated keys/settings/tints and raw metadata; no-op writes stay no-ops. Validate
stale IDs/changed numeric frames through the current atomic rejection path.
New keys and explicit move/coordinate edits continue to use their authored frame;
this preservation rule must not suppress an intended move. This is a FBones
source-preservation policy, without a new original parity claim.

Focused verification must start from an encoded/reopened source `-0.0` key,
submit JSON-equivalent `+0.0` through key-ID and manual same-frame overwrites,
check0x80000000 in the edited and encoded/reopened key, and cover Undo/Redo plus
unrelated-data preservation. Paired UI evidence checks the actual JSON transport;
no fresh original or runtime-parser batch is required.
