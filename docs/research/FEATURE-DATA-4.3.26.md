# Feature data audit — Spine 4.3.26

Research checkpoint, 2026-10-28. Evidence priority: original 4.3.26 observation,
then current primary documentation with an explicit patch-version limit, then
an identified assumption. No production code was changed for this audit.

## F300 — hover across viewport, Tree and Weights

**Current-code proof:** `RigHistory` owns stable bone/slot IDs independently of
wire array indices and records authoritative edits in `Frame`; `BoneView` and
`SlotView` expose these IDs. The frontend's selected bone/slot/vertex IDs are
separate view state. `src-tauri/src/mesh.rs` associates each influence column
with a particular bone; `WeightsPanel.vue` currently uses `w.influence` for an
active influence, not an independent hover indicator.

**Data conclusion:** a hover highlight needs a transient bone/slot/attachment
identity in the frontend. It must not call `edit_rig`, mutate colors/weights,
change the active attachment, or add history/revisions. Resolve related scene
objects using the existing stable IDs and mesh influence IDs. Clearing hover
on leave, target removal and document replacement is a view-state lifetime rule.
This is an implementation implication, not an invented Spine binary field.

**Exact-reference boundary:** existing canonical 4.3.26 comparisons establish
identity links, bone/slot color fields and mesh binding columns. They do not
establish hover gestures or a persisted hover field; see the separate UI audit.
An interaction highlight can therefore ship without extending the file codec.
Do not serialize transient selection/hover as if it were a proven format tag.

## F301 — scene image multiselection

Existing A/B/none research proves attachment inventory and the slot's active
attachment are separate from which item is inspected. Scene multiselection
must remain a set of scene identities, separate from Images library keys,
selected bones, mesh vertices, and each slot's active reference. Batch transforms
need one authoritative transaction; scene selection itself needs no file write.
The current single-attachment model exposes only slot identities, so selecting
rendered image instances can use those IDs without implying F222 is complete.
Actual gesture details belong to the paired UI audit, not these format findings.

## F303 — Tree type filters

**Current-code proof:** SceneTree builds visible rows from authoritative bone
and slot lists; library entries have their own keys. The canonical reader
requires complete reserialization equality and preserves graph references.

**Data conclusion:** filtering is a projection of the same scene graph. It must
not remove objects, reparent them, alter slot order or change attachment
activation. A filtered row retains its true stable identity and ownership even
if an ancestor's category is hidden. User filter settings may be editor view
preferences; no new project tag is established by this research. See
`FEATURE-UI-4.3.26.md` for the documented row/selection behavior and limits.

## New controlled feature collection — in progress

Only own recipes/images under ignored `.local/research/advanced-features/` are
used. The collector refuses existing `.spine` destinations to prevent skeleton
merging, and pins `--update 4.3.26 --disable-audio --hide-license` for every import
and export. Previous accepted foundation, region, mesh, affine and slot batches
are not repeated. Blend/clipping/IK/transform/physics findings will be added
below after their actual exported values and binary records are checked.

## F304 — slot RGBA and blend modes: controlled proof complete

The new own `base`/`blend-additive`/`blend-multiply`/`blend-screen` cases all import
and export successfully in original **4.3.26 Professional**. Slot class 13 tag 7
is the reference-capable blend enum: **1 normal, 2 additive, 3 multiply, 4 screen**.
Only layerA changes blend; layerB/layerC remain normal and preserve reference
sharing. The new exports retain the requested blend string. Existing controlled
color research proves Slot13 tag5 is light RGBA tint/opacity; it is not merely a
Tree swatch. No new sidecar/container is needed.

Codec implication: add a typed four-value blend enum to Slot, default Normal;
encode tag7 through the existing generic enum reference arena and extract it
in the bounded reader. Keep complete reserialization equality; reject unknown
enum values, darker tint and other unmodeled settings. Renderer tests must
verify blend order and alpha visually; a JSON export alone does not prove GPU
compositing. Evidence: ignored `advanced-features/collection.log`, per-case
recipe/export/tree files and their complete parsed suffixes.

## Clipping: controlled graph facts, remaining interaction limits

Three own cases cover end=layerB, omitted end, and a five-vertex concave contour.
All retain clipping geometry and slot ownership in original 4.3.26 exports.
Omitting end is materialized as the last slot, layerC, by this editor import.

Observed records: Clipping **84** (domain), vertex binding **53** (domain), and
existing Vertex54 records. Clipping tag12 is an end-slot domain link encoded
using the established index+2 form; tag0 links its owning start slot. Tag28 is
Binding53. Binding53 has tag0 owner clip, tag2 dense Vertex54 list, tag1 bound
bone list. Vertex arrays use the existing weight/local-position representation.
Tag8 stores boundary edges as doubled vertex indices; tag7 stores 4*N. Tag31
is editor RGBA, tag1 name. Full field order/default table is being finalized.

A separate **new** `clip-concave-explicit` input sets runtime `convex:false`.
Original 4.3.26 still exports `convex:true`, with identical binary data outside
identity to the earlier concave case. Therefore JSON `convex:false` does not
control the editor's persisted clipping mode in these imports. No binary tag
is labeled "convex" from that unsuccessful input. Actual renderer handling,
end-slot inclusivity and concavity require the paired UI/primary reference;
these CLI exports alone are not a pixel-rendering proof.

## Constraint schema: exact 4.3.26 exports, not an older model

The successful new constraint recipes use the current unified JSON array
`constraints`, with `type` selecting ik/transform/physics. Transform uses
`source`, not the old all-channel `target` model. The actual exports preserve
per-source `properties` with independently named `to` channels, localSource,
localTarget, additive/clamp, offsets and channel mixes. Do not implement an
older runtime schema merely because an older editorial guide resembles it.

Observed domain records are IK56, Transform65 and Physics121. New property
mapping records 134–139 correspond to from rotate/x/y/scaleX/scaleY/shearY;
140–145 are their to-channel counterparts. These have compact untagged layouts,
not ordinary tagged project records. The complete exploratory parser can walk
all new graphs to the established 12-byte suffix. That is schema evidence,
not yet independent writer/original-export acceptance.

### Physics values already proven

Original exports retain all requested nondefault parameters and global flags.
Physics121 tag4 stores **1/FPS seconds**, observed at 60(default), 90 and 30 Hz.
Tag16 stores mass itself (1 default; 2.5 controlled), not mass inverse. Tags
5/6/8 are x/y/scaleX; 10 inertia (default .5); 12 strength (100); 14 damping (.85);
18 wind (0); 20 gravity (0); 23 mix (1); 33 limit (5000). Tag3 links the bone.

Default tag7 is the exact quiet-NaN bit pattern `7fc00000`, not a generic corrupt
float. Rotate-only .4 stores .4 there; shear-only .3 stores .3 in tag9 and 0 in
tag7. Combined rotate/shear input stores derived values .7/.525 for .4/.3.
The conversion remains under investigation; do not silently coerce NaN to zero
or claim these two internal fields directly equal runtime rotate/shear in all
cases. JSON export proves settings persistence, not the integrator trajectory,
reset timing, or frame-rate invariance.

## Completed new collection and independent checks

**35 fresh cases** completed original Windows 4.3.26 import/export: new shared
reference skeleton; three blends; clipping endpoint/shape/flag requests;
one-/two-bone IK and independent compress/stretch; current transform mapping,
local-source/local-target/additive/clamp and one-to-many remapping; physics
settings, FPS, global-flag bit patterns, mixed angular influences; and mixed
constraint ordering in both directions. These are new cases, not reruns of
accepted old batches. All 70 operations log the exact selected editor and
Complete. Each envelope/CRC64, parsed final suffix, relevant exported value,
record reference and geometry relationship passes the independent checker.

Sanitized aggregate: `analysis/advanced-features-data-check.json`. Ignored
source/evidence: `.local/research/advanced-features/{cases*.json,collection*.log,
*-tree.json,*-export/skeleton.json,inspect.py,check.py}`. Reproduce analysis
without recollecting originals:

```sh
python3 .local/research/advanced-features/inspect.py
python3 .local/research/advanced-features/check.py
```

The collectors `collect.ps1` / `collect2.ps1` / `collect3.ps1` / `collect4.ps1`
use the established mapped workspace and exact import/export command shape:

```text
Spine.exe --update 4.3.26 --disable-audio --hide-license
  --input <new-own-recipe>.json --output <new-own-result>.spine --import skeleton
Spine.exe --update 4.3.26 --disable-audio --hide-license
  --input <new-own-result>.spine --output <new-own-export> --export json
```

Do not recollect these completed cases. A parser reaching the suffix is not
proof of our encoder accepting/creating the broader format. New production
writers still need independent candidates accepted by the original application.

## Exact wire layouts for the observed profile

Field orders matter for canonical equality. All indices below are wire graph
references, not session IDs. Preserve generic/domain arenas and shared groups.

### Clipping84 and Binding53

Observed field order:

```text
13,12,14,30,20,21,8,31,28,7,19,37,1,32,5,0,4,33,35
```

Known fields: 12 end Slot link as domain-index+2; 0 owner Slot link; 28 Binding53;
8 boundary edge offsets (2*vertex index); 7 raw 4*vertex count; 31 RGBA; 1 name.
Binding53 order is 0 owner Object link, 2 Vertex54 Object list, 1 bone Object list.
This differs from Mesh46's Binding71 class while reusing dense vertices.
Observed defaults: 13=true; 14=uint0; 30=false; 20/21=float1; 19=float0; 37=uint8;
32/35=false; 5/33=true; 4=uint0. Their wider meanings are not assigned merely
because they are constant. A fourth requested flag case proves runtime
`inverse:true` is also ignored by the editor import and does not change bytes
outside identity. The current API/runtime documentation includes convex and
inverse, but cannot override the contradictory exact editor observation.

The reversed-end case puts the mask after layerA and explicitly names layerA
as its end. Original 4.3.26 preserves that earlier end link in export. A future
reader must not silently move it to the last slot just to simplify range logic.
Rendering behavior when an end precedes its start still needs separate proof.

### IK56

Observed field order:

```text
14,17,18,11,12,6,15,3,2,5,16,10,9,34,22,0,1,32
```

| Tag | Proven meaning / observed default |
| --- | --- |
| 1 / 0 / 32 | name / skeleton owner / shared constraint Group108 |
| 2 | ordered bone Object list, one or two in these cases |
| 3 | typed target Bone link |
| 5 | mix float, default1; controlled .63 |
| 14 | softness float, default0; controlled13 |
| 16 | bend-positive boolean, defaulttrue |
| 11 | compress boolean, proven independently for one bone |
| 9 | stretch boolean, proven independently for one bone |
| 18 | reference-capable enum, observed value1; wider mapping unknown |
| 17 / 10 | observed uint0 / uint0, meaning unknown |
| 12 / 6 / 15 | observed false / float0 / float0, meaning unknown |
| 34 / 22 | observed true / empty Object list; wider meanings unknown |

Two-bone input with compress=true retains tag11=true in the editor project,
but omits compress from the runtime export. Do not equate omission with data
loss or implement a two-bone compress solver based solely on this import.
Original import also colors an IK target bone orange (`ff3f00ff`); that change
is explicit in both its persisted Bone12/tag17 and its runtime export.

### Transform65 and mapping records

Observed field order:

```text
11,15,3,24,13,21,27,28,26,31,10,18,17,6,29,9,8,5,23,14,25,16,19,30,12,7,4,34,22,0,1,32
```

| Tag | Proven meaning / observed default |
| --- | --- |
| 1 / 0 / 32 | name / skeleton owner / shared constraint Group108 |
| 3 / 19 | source Bone link / ordered constrained Bone Object list |
| 21 / 27 / 28 / 30 | additive / localSource / localTarget / clamp booleans, defaultfalse |
| 14 / 6 / 7 / 16 / 17 / 18 | rotation / x / y / scaleX / scaleY / shearY offsets, default0 |
| 8 / 4 / 23 / 10 / 25 / 12 | mixRotate / mixX / mixY / mixScaleX / mixScaleY / mixShearY |
| 29 | from-property Object list |
| 31 | generic reference, length-prefix25, 24 zero bytes in every observed case |
| 11 / 24 / 13 / 26 / 9 / 5 | observed float0; wider meanings unknown |
| 15 / 34 / 22 | observed uint0 / true / empty Object list; wider meanings unknown |

A mapped channel defaults to mix1; an unmapped channel is stored with mix0 in
these imports. All six mixes are independently proven by distinct sentinel
values in transform-local. Tag31's zero payload can be read as six float32
slots, but its meaning is unknown. Accept only the demonstrated default until
that field is understood; do not turn arbitrary unknown bytes into an editable
opaque payload.

From-class mapping: 134 rotate, 135 x, 136 y, 137 scaleX, 138 scaleY, 139 shearY.
Each is a **generic reference** followed by its float offset, varuint to-count,
and that many To objects. To classes 140–145 follow the same channel order;
they carry three raw float32 values **offset, max, scale**, with defaults
0,1,1, and do **not** add a reference-arena entry. These compact records are
not tagged domain records. A new one-from/two-To case independently establishes
the count and both destination layouts. Distinct offsets/max/scale and different
from/to channel names all survive actual 4.3.26 import/export.

### Physics121

Observed field order:

```text
25,10,6,4,18,14,21,13,27,23,20,12,35,24,15,11,28,17,29,9,26,19,33,31,7,3,16,5,30,8,34,22,0,1,32
```

Besides the parameter fields above, global booleans are proven by three
independent bit-pattern recipes: 25 inertiaGlobal, 26 strengthGlobal,
27 dampingGlobal, 28 massGlobal, 29 windGlobal, 30 gravityGlobal, 31 mixGlobal.
Tag35 is a reference enum with observed value1; untested scaleY modes remain
unknown. Tags21/13/24/15/11/17/19 are observed float0. Common tags1/0/32 are
name/skeleton/group; tags34/22 are observed true/empty Object list without a
broader semantic claim.

**Inferred conversion, checked against all collected points:** for nonnegative
runtime rotate R and shearX S with max(R,S)>0, K=(R+S)/max(R,S), stored tag7=R*K
and tag9=S*K. The inverse is R=A*max(A,B)/(A+B), S=B*max(A,B)/(A+B). Controlled
pairs include (.4,.3),(.2,.5),(1,.3),(1,1), rotate-only and shear-only. Both-zero
omitted or explicitly supplied gives the demonstrated quiet-NaN/zero sentinel.
This fits the data; it is not a decompiled formula or integrator proof.

A typed model should retain raw canonical coefficient bits separately from
human/runtime effective values. Inverting rounded floats and re-encoding can
break exact equality. Never relax all finite-float checks to accommodate this
one canonical NaN: permit only the known field and pattern under its proven
zero state, and reject other NaN payloads through exact reserialization.

### Unified evaluation order

Skeleton11 has type-specific lists: tag16 IK, tag22 transform, tag41 physics.
Evaluation order is **not** recoverable by concatenating them. Skeleton tag44
points to a shared Group108; every constraint's tag32 points to that group.
In the two mixed fixtures the group's children are the **reverse** of the
runtime unified constraints array. Both input orders survive original export.
Preserve that ordered identity list and every domain back-reference; do not
invent a numeric order field from unrelated zero-valued tags.

## Safe implementation dependencies and remaining verification

- Extending RegionProject with constraints requires Frame/history, dirty marks,
  save snapshots, close/reopen, and every rig/slot reorder/delete remap to carry
  them. A narrower MinimalProject decoder must reject fields it cannot retain.
- Clip start/end refer to stable scene slots, then map to wire graph references;
  draw-order changes must retain endpoint identity and recompute the rendered
  range. A clipping attachment has no PNG and must not be forced through image
  file lookup, image-region transforms or UV-only editing.
- Constraint targets/bones must survive hierarchy reorder/history. Their solved
  world poses are evaluated from editable setup channels in a separate ordered
  pass; do not overwrite setup channels each simulation frame.
- Safe bounds for our profile (finite values, item counts and topology limits)
  are implementation limits, not proven original application maxima. Unknown
  skins, animation tracks, target offsets, scaleY variants and reserved fields
  stay guarded until independently handled.
- AutoWeights currently uses distance-based code, not observed original solver
  equivalence. The direct Auto action and binding-position result below now
  settle one posed-binding behavior; algorithm parity, parameter defaults and
  locked influences remain unproven. Existing weight exports alone prove wire
  compatibility, not the auto-weight algorithm.
- IK/transform setup settings and physics parameter/FPS persistence are proven.
  Actual solver poses, constraint interaction order effects, clipping pixels,
  and fixed-step physics reset/inertia/damping trajectories still need numeric
  or pixel comparisons. JSON setup export does not establish those results.

Primary references consulted only after local gaps: current official
[4.3 SkeletonJson schema](https://github.com/EsotericSoftware/spine-runtimes/blob/4.3/spine-ts/spine-core/src/SkeletonJson.ts),
[physics user guide](https://en.esotericsoftware.com/spine-physics-constraints),
and the paired UI audit's linked sources. A moving 4.3 branch is not pinned to
editor patch4.3.26; this document labels actual original cases separately.

Reader checkpoint after the blend extension: a newly compiled isolated Rust
probe against the then-current worktree accepts `base` and all three original
blend cases with complete byte-identical reserialization. It safely rejects
all 31 clipping/constraint cases and preserves every original envelope byte.
Ignored `codec-results.jsonl` and the aggregate's probe hash identify this
checkpoint; it is not a claim that future broader encoders have already passed.

## F302 — direct original Auto action and corrected before/after proof

Paired UI research activated the actual original 4.3.26 Auto button on an owned
posed five-vertex mesh bound to root/bone1/bone2, then saved its working copy.
The first published after-copy raced the asynchronous save and was identical
to baseline. That pair was rejected as evidence. The stable GUI-written working
file was independently preserved as `auto-ui-observed-result.spine`; the UI
researcher confirmed the live filename and action chronology. No user project
or accepted source fixture was overwritten.

Correct baseline SHA is `130d37d81fe9215636fd5a384dc5ca562d4c859fe9a7c1b56a8b8c79b43a32e1`;
stable result SHA is `d432226557e9caad07f424381ed08c708e3296cc05be1786df7f7d6687520ccf`.
Independent binary decoding and fresh original JSON exports establish:

- All 15 dense weight values change; every vertex remains normalized within
  float precision. Two positive influences become zero (one is negative zero).
- All 30 per-influence local position float components remain **exactly** equal.
  Binding bone order, bone setup channels, UVs, triangle indices and edges match.
- Independent linear blend evaluation with the unchanged bone transforms gives
  a maximum posed vertex displacement of about 12.381 world units. Auto changes
  the pose through weights; it does not implicitly rebase/update bindings here.
- No previously zero influence becomes positive in this sample. Initialization
  of such influences remains unknown and must not be claimed from these files.

Sanitized per-vertex comparison and explicit evidence limits:
`analysis/auto-weights-reference-check.json`. Reproduction (no repeated Auto UI
or recollection): `.local/research/feature-ui/check-auto-data.py`. This identifies
an important behavior of Auto, not its entire proprietary weighting algorithm.
The original GUI activation used background messages in the dedicated owned
instance; it is not a real OS mouse/WebView input verification for FBones.

## Typed scene checkpoint and direct clipping flags

The earlier conservative-reader checkpoint is superseded only for the new
internal `scene-codec` feature. The legacy RegionProject reader still rejects
structures it cannot retain. The typed model retains complete default-skin
inventory and active pointer separately, explicit clipping, and unified ordered
IK/4.3 transform/physics constraints. Its reader completely reserializes all
35 new advanced original files plus the three accepted A/B/none originals.
Twenty newly generated typed candidates were accepted/exported by original
4.3.26 and independently compared with their own recipes. The public contract,
limits and migration gate are in `../FORMAT-SCENE-4.3.26.md`; aggregate proof is
`analysis/scene-codec-check.json`. This does not release desktop constraint or
clipping behavior by itself.

Direct original GUI actions in owned copied fixtures now resolve clipping
defaults that JSON import had ignored: class84/tag13 is **Convex**, tag14 is
**Inverse**. GUI-saved convex-off, concave-inverse and convex-inverse copies
have exactly the corresponding independent boolean combinations. Inverse
disables the Convex control but preserves its checked value. The original GUI
saves also change unmodeled bone/editor metadata, so complete GUI files are
not accepted by silently omitting those changes.

A deliberate newly generated raw-null class84/tag12 endpoint fails original
4.3.26 deserialization with a null-reference error. The production scene model
may hold `None` as an unfinished draft, but both encode and decode validation
refuse it. The observed import of omitted runtime JSON end creates an actual
last-slot reference instead. Earlier-than-start endpoints remain linked as
observed; no full clipping-pixel behavior follows from that persistence fact.
