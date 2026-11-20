# Typed scene codec, Spine 4.3.26

This document records the progressively supported canonical Scene profile.
Desktop uses it for attachment inventory, clipping, constraints and the bounded
animation families below; full Spine compatibility remains unverified. The
independent format crate exposes `minimal::scene` behind `scene-codec`.
The existing `minimal::regions` API and its conservative reader remain available
as a separate legacy regression profile.

## Public model and integration contract

`SceneProject` contains `rig: MinimalProject`, `images_root: String`, ordered
`slots: Vec<SceneSlot>`, `attachment_order: Vec<AttachmentAddress>` and ordered
`constraints: Vec<Constraint>`. All indices are wire-model indices; a desktop
bridge must map stable session IDs at its boundary.

- Slots are in setup draw order, back to front. A slot carries its bone index,
  name, RGBA light color, proven four-way `BlendMode`, attachment inventory and
  `active_attachment: Option<usize>`. The active index is local to that slot;
  UI selection is separate. An empty slot and a nonempty inactive slot differ.
- `AttachmentAddress { slot, attachment }` records the global default-skin
  attachment order independently of both slot order and active attachments.
  It must contain every inventory member exactly once. Reordering/removing a
  slot or attachment must remap these addresses, not regenerate them blindly.
- `SceneAttachment` has distinct `Region`, `Mesh(Box<Mesh>)`, `Clipping` and
  `Path` variants. `image()` returns `Option<&Region>`. Clipping and Path have
  no PNG, UVs or region transform.
- `Clipping` contains a name, endpoint slot index, independent `convex` and
  `inverse` booleans, RGBA editor color, weighted flag, binding bone indices,
  dense binding `Vertex` values and edge pairs. Ownership by its slot is the
  start; endpoint identity must survive draw-order changes. The public endpoint
  type permits an incomplete `None` draft, but **encoding and recognition
  require `Some(valid_slot)`**. Original 4.3.26 rejects a raw null endpoint during
  deserialization. Runtime JSON's omitted endpoint is materialized as the last
  slot by the observed original import; it is not a null editor reference.
- `Constraint` is an ordered enum of `Ik`, `Transform`, `Path` and `Physics`. This vector
  is evaluation order; the proven wire Group108 children are written in reverse.
  Reordering or deleting bones must remap every constraint reference atomically.
- IK carries one or two bones, target, mix, softness, bend direction, compress
  and stretch. Two-bone chains must have consecutive parentage in this profile.
- Transform carries source, constrained bones, local-source/local-target,
  additive/clamp, six offsets and six mixes, and explicit `TransformFrom` →
  `TransformTo` mappings. Channel array order is Rotate, X, Y, ScaleX, ScaleY,
  ShearY. `From` has its own offset; each `To` has offset, max and scale. This
  models the observed current 4.3 records, not an older all-channel-only format.
  `TransformConstraint::new` is a convenience identity map, not an assertion
  about original UI creation defaults.
- Physics retains x/y/scaleX, fixed-step seconds, inertia, strength, damping,
  mass, wind, gravity, mix, limit and seven global flags. `PhysicsAngular`
  retains the two raw coefficient **bits**. `wire_bits` and `from_wire_bits`
  preserve exact input; `effective`/`from_effective` implement the inferred
  runtime conversion validated by the new candidates. Do not inverse-convert
  and round these values merely to save an unchanged file. The observed GUI
  rotation/shear percentages are raw coefficients times100, not the derived
  runtime values. The only nonfinite exception is exact canonical quiet-NaN
  `0x7fc00000` in Physics121/tag7 with positive-zero tag9. Other float readers
  remain finite; arbitrary NaNs and this sentinel in another context reject.

`encode_scene_payload` emits a new canonical payload from this typed graph;
`encode_scene` wraps it in the existing envelope. `decode_scene` accepts a
decoded payload, uses bounded parsing and accepts only complete byte-identical
reserialization. No original template or opaque container is retained.
`From<&RegionProject>` promotes the old supported graph without changing its
canonical bytes. `SceneProject::to_regions` refuses constraints, clipping and
multiple attachments; it never discards inactive inventory to fit the old API.

## Proven scope and limits

Direct controlled original 4.3.26 evidence: 35 new advanced source fixtures and
three previously collected A/B/none fixtures all decode and completely
reserialize identically. Twenty **new independently generated** candidates
were exported successfully by original 4.3.26 and checked against their own
recipes, including active A/B/none, mixed region/mesh, weighted clipping,
convex/inverse flags, one/two-bone IK, property remapping, mixed constraint
order and physics parameters. Unchanged `.fbones`/`.spine` copies and envelope
CRC64 pass. One deliberate null-end candidate failed original deserialization;
the corresponding codec branch now rejects. Aggregate:
`analysis/scene-codec-check.json`.

Direct original GUI saves prove clipping tag13 is Convex and tag14 is Inverse.
Inverse disables the Convex checkbox while retaining its value, so the booleans
remain independent in the model. Those whole GUI saves also contain additional
unmodeled editor metadata; this codec does not accept them by stripping it.
Field tables, controlled recipe commands and evidence classification are in
`research/FEATURE-DATA-4.3.26.md` and `research/FEATURE-UI-4.3.26.md`.

### Static Path attachments

Exact Spine Professional 4.3.26 on Linux produced six editable controls covering
open and closed paths, Constant Speed on and off, omitted defaults and one
weighted binding, plus a Path and Region project. All seven passed independent
full-payload re-encoding. REA
`ev_a8890b52f8bdff7ac7877051917f0c5126f0d20ebe6dc5fcc1e6c91c3f2927ba`
identified Path69 tags 12 and 13 for Closed and Constant Speed, tag 15 for
stored lengths, tag 28 for the self-owned Binding53, tag 30 for the weighted
flag and tag 31 for editor color. Tag 7 holds four times the point count. Tag 8
uses the wire-doubled integer-list encoding for successive cubic endpoints.
The codec preserves the stored lengths and dense bindings in the project.
The mixed project also establishes an alternate Region43 tag order retained
per Region across edits. An independently encoded rename and slot reorder pass
original Spine 4.3.26 CLI acceptance.
The measured stock skeleton JSON uses cumulative distances evaluated in Setup
world coordinates. Four equal-parameter chord steps per cubic reproduce the
observed values within 0.00003 on the mixed fixture, including the wrapping
cubic in the length table of an open path. The data does not establish the
editor's internal arithmetic or behavior under unmeasured constraints.
Path Deform and geometry authoring remain outside this slice.

### Static Path constraints

PathConstraint72 stores ordered constrained bones as Bone12 references in tag
2 and a target Slot13 reference in tag 3. Skeleton11 tag 23 holds the per-family
declaration array. Constraint tag 32 and Skeleton11 tag 44 reference the
shared Group108, whose tag 5 lists runtime execution in reverse. Position,
spacing and rotate modes are one-based enum values. The record stores separate
rotation and X/Y translation mixes, position, spacing and rotation offset.
The observed static records retain their complete typed form.

The editor resolves the Path currently active in that target slot. This
profile covers static constraints alongside existing supported clips and
allows Setup activation changes. Path Deform and animation of the target
slot's attachment remain outside editable admission.
The format equality gate stays in effect for each source. Exact wire evidence
and numeric scope are recorded in [the current project checkpoint](STATE.md).

### Path constraint timelines

Track132 kinds 9, 10 and 11 store Position, Spacing and combined Rotate/X/Y
Mix. Position and Spacing each use one value and up to one Bézier control
row. Mix uses three values and independent control rows. Frame coordinates
in the editor payload are absolute. The runtime export writes seconds and
preserves each axis's handle pair. All three track kinds target the typed
PathConstraint72 reference and group under the target slot's bone. The stock
control independently round-trips all 1,912 decoded bytes through the format
crate and the desktop Session.

Current bounds are our implementation limits: 128 bones, 128 slots,
128 constraints, 512 attachments, 256 vertices per mesh/clip, 4096 combined
mesh/clip vertices, 1024 bytes per scene string. They are not measured original
maxima. Default skin only, normal bone inheritance, proven scaleY mode/default
constraint flags and default packed-transform fields remain required. Unknown
skins, animations, editor metadata, modes or field values fail the full equality
guard and remain read-only. Solver poses, physics trajectories, clipping pixels,
native history and full GUI interaction are separate acceptance work.

Local reproducible checks without repeating the original collection:

```sh
cargo test -p fbones-format --features scene-codec --offline
cargo clippy -p fbones-format --all-targets --features scene-codec --offline -- -D warnings
python3 .local/research/advanced-features/check-scene-candidates.py
```

The last command operates only on ignored, owned research artifacts. Its
original export logs are `scene-candidate-exports.log` and
`scene-candidate-exports-remaining.log`; no personal source data is distributed.

## Actual Windows combined Scene save/reopen and original export

An owned private Windows0.7.0 feature-build instance created and saved a
combined Scene, then closed/reopened it. Its native summary contains four
bones, two slots and three attachments: one active clipping polygon, one
active mesh bound to three bones, and an inactive unweighted mesh alternative.
The image slot retains Multiply and light RGBA`80ff80cc`. Ordered constraints
are a two-bone IK, a source-local X → target-local Rotate mapping with range,
clamp/additive and partial mix, then an XY/gravity Physics constraint.

A fresh unchanged `.spine` copy was accepted/exported by actual original
**4.3.26**, with native process exit0 and `Complete.`. The independent checker
imports no application codec/renderer/solver math. It verifies the bounded
raw stream/header/CRC64 and source/copy identity; every represented bone,
slot/inventory/active reference, mesh/clip binding and geometry value; ordered
constraint references/settings/mappings; Physics seconds versus FPS, direct
mass, damping retention, canonical angular-zero effective values and global
defaults; and all five saved PNG hashes, CRCs and dimensions, including unused
images. Independent authored/setup-world reconstruction differs by at most
6.6e-5 in the weighted coordinates, accounting for the original JSON export's
five-decimal weight rounding.

The dedicated Windows process was still live during this collection. Its
immutable image SHA256 matched the owned launch record and saved report, and
its PE product/file version was0.7.0. That private feature build is distinct
from the earlier public hover/blend delivery; passing this fixture does not
enable the migration by default or certify a later image automatically.

The first original export succeeded, but a concurrent subsequent QA save
replaced the shared summary report before comparison. The verifier correctly
rejected that mismatched evidence pair. The final check therefore reads an
immutable copy of the later saved report and matching launch record, and a
fresh export of that later own project. No original/user source was altered.
Private inputs: `.local/scene-ui-saved-snapshot.json`,
`scene-ui-launch-snapshot.json`, `scene-ui-snapshot-collection.json`, and
`check-scene-ui-export.py`; historical aggregate: `analysis/scene-ui-07-check.json`.

Runtime JSON object-key order does not establish global attachment traversal
order, and it does not expose clipping editor edges. Those retain their
separate complete canonical codec/history tests. This final fixture uses
default angular/global Physics values; it does not replace the earlier
nondefault controlled cases. Its export proves persistence and authored
settings, **not** new original GPU parity, evaluated trajectory parity,
ownership-gesture behavior or full platform/Spine compatibility.

## Final0.8.0 acceptance snapshot

**Directly proven:** the final0.8.0 immutable Windows image passes16 actual
interaction groups, including three real Windows mouse drags, attachment
reparenting, live parent motion during physics, explicit frozen evaluated-
geometry epochs, invalid IK/damping rejection and combined native save/reopen.
The frozen report records zero runtime exceptions,21 ordinary GPU RGB point
comparisons within their stated bounds, and two additional hover comparisons
(pinned influence unchanged, hovered bone brightened). These native GPU
observations are distinct from original-editor rendering equivalence.

The final combined file was copied unchanged from the immutable acceptance
snapshot and exported by actual original4.3.26, native exit0 with `Complete.`.
The independent semantic comparison described above passes for this final
file: four bones, two slots, active clipping/weighted mesh and an inactive
mesh renamed `saved blue alternative`, Multiply/RGBA`80ff80cc`, every
represented geometry/binding value and five complete PNG resources. Ordered
constraints are two-bone IK, source-local X mapped to three target-local
Rotate/X/Y destinations with independent ranges/mixes, then Physics. The
maximum independent authored-world component difference is6.6e-5.

The checker verifies every frozen input's hash/length, source/copy identity,
PE product/file version0.8.0 and equality of the tested image hash with the
published WINDOWS_TEST immutable image. QA PID62292 was already closed when
this new original export was collected; its identity is historical frozen
acceptance evidence, not a claim that that QA process remains live. No inputs
were sent to the separate window handed over to the user.

Current aggregate `analysis/scene-ui-check.json` identifies exact editor hash
`17b575abad6d42ffa66aab9525241dbc0c2f0badb35e7ab52c379b9d1ce84748`
and project hash
`3e07c94770d1237adcee6f35de13b4b7fcb0c0f38345d5bbaad94219216f9201`.
Private immutable inputs are `.local/scene-08-final-acceptance-snapshot/`;
original comparison outputs are `.local/scene-08-final-original-comparison/`.
Recheck without rerunning original exports using
`.local/check-scene-08-final17b-ui-export.py`. Collection used
`.local/export-scene-08-final17b.ps1` with mapped Windows paths and original
`--update 4.3.26 --disable-audio --hide-license --input <own-copy> --output
<new-output> --export json`; its log and true native exit code are preserved
privately. No personal/original data or absolute local paths are distributed.

The earlier4c7cfb… checkpoint passed14 groups on its own different file; its
aggregate is retained as `analysis/scene-ui-08-4c-check.json`. It is historical
evidence and does not substitute for the final17b verification above.

This integration acceptance does not resolve the explicitly pending general
moving-parent physics/export phase comparison, certify original attachment-
reparent activation choices, cover unmodeled schemas, or verify native
macOS/Linux GUI behavior. Those limits remain explicit in the research notes
and task ledger rather than being inferred from a successful save.

## 0.8.1 inactive inventory and whole-clip transform comparison

**Directly proven, new case:** the immutable0.8.1 candidate
`313e0ed21e704b1d69daf31dea4c2fec470ca20d9de282fe20172de454e5d79e`
passed five main Windows groups and a separate one-group inactive-mesh annex.
These used distinct owned QA processes16572 and64012. The latter opened the
former saved source; both frozen manifests and this source hash link are
verified. This is six groups across two instances, not one six-group run.

The main tests exercised inactive-region translation, mixed active/inactive
rotation around a moved origin, whole-clip rotation around a vertex-snapped
origin, independent X scaling and mixed inactive-clip/image translation. The
annex converted the inactive image to a real mesh, independently scaled Y,
checked Undo/Redo, then saved, closed and reopened. The original transformed
clip and unrelated inventory survive that later save unchanged.

Fresh final source SHA256
`7cc247ab83931d6a698ce9f1e24f661330bc48533d29a521228e77461e56cd4b`
was copied byte-identically to an owned `.spine` and actually exported by
original4.3.26, native exit0 and `Complete.`. Independent comparison validates
one bone, three slots, four attachments (two Regions, one inactive unweighted
Mesh, one unweighted Clipping), owner/draw-order/nullable active references,
all represented transform/geometry/UV/topology/binding values, clip endpoint/
color/flags and all five PNG hashes/CRCs/dimensions. Original JSON rounding
produces at most0.00383 authored-world component difference within the stated
existing export tolerances. No new coordinate tolerance was widened.

An additional independent checker reconstructs all six unique actual-UI
transform commits from before/after DTOs and captured evaluated matrices.
It checks36 world vertices, with maximum component error2.9019e-5 against a
0.003 bound, while checking unchanged activation, slot and attachment identity,
resource paths, clip flags/end/edges, weights and untouched inventory. Fifteen
main log records contain three identical observations of each of five commits;
they are preserved and deduplicated explicitly, never counted as fifteen user
operations. The annex supplies one additional mesh ScaleY commit.

Sanitized aggregate: `analysis/inactive-clip-transform-check.json`. Private
frozen inputs: `.local/inactive-clip-081-main-snapshot/` and
`.local/inactive-clip-081-acceptance-snapshot/`. Raw UTF16LE logs are preserved;
only frozen analysis copies are normalized to UTF8. Independent recheck without
repeating original export:

```sh
python3 .local/check-inactive-clip-transform-export.py \
  --main-snapshot .local/inactive-clip-081-main-snapshot \
  --snapshot .local/inactive-clip-081-acceptance-snapshot \
  --comparison .local/inactive-clip-081-original-comparison \
  --editor 313e0ed21e704b1d69daf31dea4c2fec470ca20d9de282fe20172de454e5d79e \
  --version 0.8.1
```

The final QA instance was alive with the matching immutable image/PE version
during original collection. That is a historical observation, not a promise
it remains open. No input was sent to the user's existing window. The new
fixture does not contain weighted clipping or constraints. Weighted-clip UI,
original whole-transform/pivot gesture parity, deformed-mask GPU comparison,
general physics phase parity and native Linux/macOS GUI remain separate gates.

## 0.8.2 weighted clipping checkpoint,06ee historical candidate

New own UI-authored source
`b6bd5bd87428bd6849e37e8e51ccd0f8c3038253284affb06e3a921b24b1284f`
was frozen after six actual Windows groups on immutable0.8.2 image
`06ee5e7eea0c74c5d42a1e704413435f4175c0f004c4866d8f62ebd5bc41b7fd`.
That checkpoint contains two bones, four slots and five attachments: three
opaque Regions plus active/inactive weighted Clipping alternatives. The active
clip has five concave vertices bound to root/tip; only tip moves from40,0 to
58,10 after weights are authored. Clip end is fill; the trailing image remains
outside its clipping interval. The selected inactive alternative never becomes
active merely to edit its weights.

Actual original4.3.26 exported an unchanged `.spine` copy as runtime JSON and
exactly one current-pose PNG, both native exit0/Complete. The mapped Windows
filesystem emitted a folder-watch warning during PNG export; output succeeded
and the warning remains in its private log. No old static clipping batch was
repeated. Current-pose settings use the observed schema and actual skeleton
name, with images enabled and bones/selection/title rendering disabled.

`analysis/weighted-clip-authoring-check.json` independently validates every
represented bone/slot/inventory/geometry field, all three PNG resources and
original packed positive weighted vertices. A separate private generic wire
reader validates all18 weight and36 local-position float32 components exactly,
including seven dormant-zero columns and their14 positions, plus clip flags,
RGBA, ownership/end/activation and Binding53 backlinks. It consumes the complete
known terminator. Raw domain links must support both existing encoded IDs and
inline new records: this fixture's forward clip end introduces Slot13 in place.
An older private research parser initially assumed only the existing-ID case;
its schema was corrected before any success claim. No production codec was
changed by that research-parser correction.

Independent recorded-action checking covers47 actual store actions across
Mesh/Clipping: all five typed commands,696 unchanged local-position float32
components,37 manual/normalized rows,51 binding world points (maximum error
1e-6), two native frozen pose snapshots and two genuine no-op actions retaining
selection. The trace consists of Pinia action arguments and separately observed
native snapshots; it is explicitly not a raw IPC argument spy. Auto's numeric
algorithm is not treated as original parity.

`analysis/weighted-clipping-pixels-check.json` compares1,024,813 original and
57,387 GPU interior pixels with zero mismatches. Original RGB comparison is
exact; the existing GPU bound is4 RGB units. Independent dense world geometry
matches the original export exactly. Deformation is20.5913 world units; wrong
undeformed binding, convex-hull substitution and incorrectly clipped trailing
image each fail substantial interior pixel discriminators. Boundary AA and
known editor bone/parent-connector strokes are excluded explicitly. The
checker was self-tested with temporary synthetic images, including rejecting
a corrupted interior pixel; those synthetic runs are not original acceptance.

Private immutable inputs: `.local/weighted-clip-082-acceptance-snapshot/`;
actual original outputs/receipts/logs:
`.local/weighted-clip-082-original-comparison/`. Recheck without rerunning
original exports:

```sh
python3 .local/check-weighted-clip-authoring-export.py \
  --snapshot .local/weighted-clip-082-acceptance-snapshot \
  --comparison .local/weighted-clip-082-original-comparison \
  --pixel-report analysis/weighted-clipping-pixels-check.json \
  --editor 06ee5e7eea0c74c5d42a1e704413435f4175c0f004c4866d8f62ebd5bc41b7fd \
  --report analysis/weighted-clip-authoring-06ee-check.json \
  --version 0.8.2
```

A later separate actual Windows probe found that hovering could reset pending
Direct numeric text on06ee. That UI defect does not alter the frozen file or
its verified pixels, but06ee must not be described as the final delivered
candidate. The staged draft fix requires fresh candidate interaction checks.
If a fresh candidate loads/saves exactly the same source bytes, retain this
original collection as reference and record the new GPU/editor provenance
separately rather than rerunning an accepted identical original export.

Sequential checkbox Bind, independent Normalize, single-vertex Direct drag gain,
brush edge/stroke interpolation and independently implemented Auto remain
explicit FBones choices where exact original actions do not settle them.
Original posed zero/positive and Remove-all interactions, proprietary Auto,
selected subsets/locks, general moving-parent physics and native macOS/Linux
remain separate limits. No user-owned window received input during these checks.

## Final0.8.2 weighted clipping acceptance,7dcb

The final candidate is immutable image
`7dcb91a797a197ff2ed4f8ff400e1c3ea3b788c251b102b34779602d642e5c16`,
version0.8.2. Its fresh owned Windows instance21308/CDP9244 passed seven
interaction groups with zero runtime exceptions, including numeric draft
hover, Enter/Escape, untouched fractional precision and no-op focus retention.
Read-only independent verification matched the actual private PE hash/version
and recorded process start time; no input was sent during that verification.

The final mask fixture was reopened, returned to its bound tip40,0, posed to
58,10, saved through native Save As and reopened. Its complete binary remains
exactly sourceb6bd…b1284f, identical to the already accepted original4.3.26
input. Therefore the accepted original JSON/PNG were reused, with **zero new
original commands**. The final GPU capture and its bound/posed/native-save
records belong to the new7dcb instance. Earlier original collection belongs
to the historical06ee checkpoint; these are explicitly separate processes and
checks, not a claim that a newly tested editor produced a new original export.

Current semantic aggregate: `analysis/weighted-clip-authoring-check.json`.
It validates the new immutable snapshot and41 observed typed weight actions:
616 local-position float32 components retained,34 manual/normalized rows,
42 binding world points (maximum error1e-6), two no-op actions preserving
selection and two independently observed native frozen poses. All five typed
weight commands cover real Mesh and Clipping targets. Final file comparison
still verifies two weighted clips, all18 weights/36 positions including seven
dormant columns, independent ownership/activation/draw order and all three PNGs.

Current pixel aggregate: `analysis/weighted-clipping-pixels-final-check.json`.
The fresh current-editor GPU capture is byte-identical to the earlier GPU image,
with separately recorded current editor/start time/native summary hashes.
Accepted original and fresh GPU evidence again pass1,082,200 safe interior
pixels with zero mismatches, independent deformation/hull/end discriminators
and zero exported world-coordinate difference. Original warnings and bounded
edge/bone-stroke exclusions remain explicit; no tolerance was widened.

Historical semantic and pixel aggregates remain unchanged in
`analysis/weighted-clip-authoring-06ee-check.json` and
`analysis/weighted-clipping-pixels-check.json`. Current private inputs are
`.local/weighted-clip-082-final-acceptance-snapshot/`; the reused source oracle
and its receipt remain `.local/weighted-clip-082-original-comparison/`.
Recheck the final proof without repeating original collection:

```sh
python3 .local/check-weighted-clip-authoring-final-export.py \
  --snapshot .local/weighted-clip-082-final-acceptance-snapshot \
  --reference-snapshot .local/weighted-clip-082-acceptance-snapshot \
  --comparison .local/weighted-clip-082-original-comparison \
  --pixel-report analysis/weighted-clipping-pixels-final-check.json \
  --candidate-identity .local/weighted-clip-082-final-candidate-identity.json \
  --editor 7dcb91a797a197ff2ed4f8ff400e1c3ea3b788c251b102b34779602d642e5c16 \
  --version 0.8.2
```

This completes the represented weighted clipping authoring/deformed-mask
checkpoint. Proprietary Auto/subset/lock behavior, original Direct sensitivity,
unknown original membership gestures, general moving-parent physics and native
Linux/macOS verification retain their separate evidence limits.

## Typed Transform editor endpoints (F308, 2026-10-29)

Transform65/tag31 is now modeled as 24 independently nullable finite f32 cells,
not six packed float zeros. The previous all-zero encoding happened to match
24 absent markers. Wire: generic reference, count25, 24 markers (0 absent,
1 followed by four big-endian IEEE754 bytes). Named rows retain independent
source start/end and destination start/end in Rotate/X/Y/ScaleX/ScaleY/ShearY
order. `FiniteF32` compares bits, including signed zero; reversed/equal spans
and partially absent pairs are not normalized. Nonfinite values, wrong counts,
markers/references and truncation reject. Existing all-none goldens and the
complete canonical reserialization guard remain unchanged.

This is independent editor state, not a recipe for deriving runtime From/To
records. Native ordinary same-kind Transform updates preserve all cells; new
constraints default to none. Read-only `editorRangeBits` DTO metadata carries
nullable u32 values, avoiding JSON negative-zero loss, and is stripped from
ordinary UI update inputs. No writable endpoint or guessed Match action follows
from this extension. Existing runtime mapping controls retain their own values.

28 format tests pass, including pre-extension whole-payload golden and parser
failure cases. Offline reuse of eight original saved Match outcomes verifies
192 projected nullable cells (82 present) bit-exactly. Their complete original
GUI files still remain UnsupportedProfile because of other unmodeled fields;
no data was stripped. See analysis/f308-range-codec-original-check.json and
research/TRANSFORM-RANGES-IMPLEMENTATION-POLICY.md. Native/UI persistence and
new UI-authored original export have separate integration reports.

## Animation profile through Draw Order and deformation (0.9.2)

`SceneProject.animations` retains named clips and stored project FPS. Supported
families are four-channel bone transforms, typed attachment/combined light-RGBA,
global Draw Order and Mesh/Clipping deformation. Unknown families still reject
the complete editable profile; the reader never strips unknown tracks.
See the paired `research/ANIMATION-*-4.3.26.md` notes for field/arena details,
original observations and explicit authoring policies.

Draw Order keys preserve raw ordered signed slot-offset records. An empty list
is the measured Setup reset. The native/UI boundary exposes a full permutation
of stable slot IDs or null for reset. New identity orders normalize to reset as
an FBones policy; existing literal lists remain lossless even when their resolved
order is identity. Slots, inventory and active attachments remain independent.

Deform keys retain frame, full dense f32 offsets, the vector's Boolean data-
presence marker and one scalar progress curve. Weighted dimensions include all
binding columns, including zero-weight columns; runtime JSON instead projects
positive memberships. Each conditional Bezier record has four scalar-progress
controls, not per-vertex curves. The vector is a domain reference, dimension and
Boolean presence, proven by whole-payload reference/arena accounting. Compact
negative-zero-only vectors reject if exact reserialization cannot retain them;
present mixed vectors retain signed zero. Transport carriers restore raw f32
sign bits lost by JSON serialization; these are native IPC fields, not a file
container change.

Forty-one format tests and strict Clippy pass, including dense dormant columns,
presence, signed bits, malformed references and writer arena bounds. The new
UI-authored source aa0fbc was exported once by original4.3.26, actual98692 exit0/
Complete. Independent checks verify22 keys,128 dense/64 dormant coordinate bits,
16 progress-control bits, four Draw Order permutations and unchanged Setup.
Runtime comparison checks64 positive deform coordinates and127 non-color
scalars, maximum residual3.33334e-7 under5.1e-6. Constant-white RGBA Linear keys
exported as Stepped match the predeclared exact-equal-value alternative; arbitrary
RGBA floats still quantize in runtime hex and are not numerically equivalent.
See `analysis/animation-geometry-ui-original-check.json` and
`analysis/animation-draw-deform-format-check.json`. Native interaction and Windows
delivery have separate gates; original GPU/gesture/Physics-clock parity is not
implied. The following0.9.3 section extends this checkpoint with constraint/Event records.

### Linked mesh deformation

The paired weighted cross-slot projects produced by Spine Professional 4.3.26
retain the same Mesh46/tag26 source reference and shared geometry when turning
timeline inheritance on or off. Aside from project identity, the source-only
pair differs at one byte, Mesh46/tag27. The source's kind-6 Deform record and
keys are identical. With inheritance off, a child-owned deform adds a distinct
kind-6 record targeting the child in its own slot bone's track group. Stock
JSON omits `timelines` for inheritance on and emits `timelines: false` for off.
The REA captures for the paired bytes and the record ownership are
`ev_f3831f007d4a40a659c3a62eda2b7cbf31bd1ad4c81059dd8abe1f3eb20568ed` and
`ev_4a17ca4d9445916a016c1efebef453c2c332b47657d29ebfdfc49babae4c64be`.

The three stock CLI imports use an alternate order for Project, Skeleton,
Bone, Slot, Animation, Track Group, Mesh, Binding and Group record tags.
The codec recognizes the exact Project tag sequence and retains this known
ordering for matching tagged records. All three projects independently
re-encode to the original payloads of 1,364, 1,364 and 1,472 bytes. REA
`ev_9c5fdb447ee7243e67d18cf016c50053bb4d9fffee7e773cdf541ebd188efe9a`
captures the comparison and the typed Deform ownership on each fixture.

The codec keeps both timeline identities, validates the direct source link and
reuses the existing dense deformation record. An inheriting child uses its
source's track. An independent child can own a separate track. The 4.3 runtime
uses the timeline identity for both Deform and Sequence.
[Spine 4.3 runtime attachment loader and timeline classes](https://github.com/EsotericSoftware/spine-runtimes/tree/4.3/spine-ts/spine-core/src)

Exact Linux 4.3.26 stock controls use separate Mesh46/tag36 Sequence123
settings for source and child, including different starts, padding, counts
and Setup indices. The static child stores a null settings reference.
REA `ev_bdf2f120e26be05842fed4f5604353c5734c8e2e12b2927749ed089186d89501`
verified Kind22 attachment and slot identity within the owner's bone group.
REA `ev_52d89ff5424e1fd3a428730eb4fe5d80f37b6b9122e58f75a4339476cf7ec473`
verified stock export for inherited, independent and static children. Stock
accepts and re-exports stored child Sequence keys even when inheritance is
enabled, keeping the source and child tracks separate. REA
`ev_142e6374ac0d87d0082d699fd2f489c32ba0af39bf4c7b5f57ee9480b2281dfd`
captures that case. The installed Dice Drop 4.3.13 CPU runtime samples the
owner's keys with the receiving attachment's own count and frame images,
even when the source is hidden. It leaves the inherited child's own track
dormant and a child without Sequence static. REA
`ev_2174428fae43e8d46ec07636f768a8aa5709ee4647525add4151088877c70f84`
records the consumer check.

### Image Sequence direction modes

Exact Spine Professional 4.3.26 Linux imported and exported a sample with
four source-owned Sequence tracks on a direct linked pair. Kind22 stores the
mode as exact f32: 3 maps to `pingpong`, 4 to `onceReverse`, 5 to
`loopReverse`, and 6 to `pingpongReverse`. The two keys in each track
kept frames 3.75/26.25, indices 1/2 and delays 0.125/0.25 seconds. The
owner Slot13 and Mesh46 references match the existing Sequence record
layout. REA
`ev_2ede93bd169dae2097e20101cd0f40471b4abbea9791f125352144afa1891b25`
captures the exact editor IO and
`ev_12bfe37cddd43d3dd6ce6e24554d78a32f12e9c607f15399f2de87c705e875b6`
captures the raw kind and enum fields. Mode values outside 0 through 6
remain unsupported.

The installed Dice Drop 4.3.13 CPU runtime probe verified 502 receiving
frame selections at counts 1 through 4 and nonzero authored starts.
Ping-pong cycles include each turnaround once and have period
`2 × (count − 1)`. Reverse ping-pong shifts the phase by `count − 1`.
A count of one always selects index zero. Linked receivers project the
same raw phase with their own counts. REA
`ev_9a5850be0915abbe66b8787fbd31fcae68be2daae54937ec60cbbef534753a8c`
records the runtime witness. These observations do not establish the
stock editor's key insertion gesture.

Exact stock CLI JSON import rejected a mesh whose source was another linked
mesh for all four combinations of the two inheritance flags. Matched inputs
with both links targeting the root mesh imported and exported successfully.
REA `ev_101cc9b32bffeb98f2e7eb31c666e697454d2758924797f17b76b86e4da36b7e`
records the contrasting outputs. An owned binary variant changed only the
leaf Mesh46/tag26 reference from the root mesh to the middle linked mesh.
Spine loaded it with a repair warning and exported the leaf pointing directly
to the root, keeping its inheritance flag and the middle mesh's independent
Deform keys. The export was identical to the flat control. REA
`ev_0c70f0143bc8b73a656b300e3a3e504c6fee14491334afdc2a90a9ba34a0fd55`
establishes this read-time repair for the measured binary. FBones keeps these
noncanonical source relationships guarded by the exact re-encode check.

The Setup controls cover same-slot weighted, same-slot unweighted, and
different-slot unweighted links. Together with the weighted different-slot
control above, they match the direct-source record profile. REA
`ev_e75e57fab655dc84d1546cf73919de4b2f48138ee8773adfc688e1652f415c1d`
confirms stock import/export and
`ev_e298ea4fcdde3c0a6b0af937a361296e73c085c69fd648281b87831d04ffeee3`
confirms regular Mesh46/tag26 source, omitted-JSON `timelines` mapping
to tag27 true, and independent Binding71 ownership with aliased geometry
and bindings. Source and child store the same measured 8 × 12 mesh size
in binary. A distinct child PNG of 10 × 14 exported with its own dimensions
and image path. In the different-slot unweighted control the owner bone
differs and the child still references the source's shared binding array.
These files establish persistence and export, while dialog defaults require
separate evidence.

### Named animation folders

The exact 4.3.26 mascot artifact has a `control` Group108 before `anticipation`
in the editor tree. The flat Skeleton11/tag7 list places the two `control`
clips after the fourteen root clips, in the same order as the companion stock
JSON. The two groups use value 7 in tag2. The child uses the root's existing
Group108 reference in tag3 and a nullable typed String in tag1. Each clip's
Animation18/tag7 references its owning group. The REA process captures bound
these observations to owned copies with the exact known artifact hashes.
REA evidence `ev_b0d42e373cbbecf41b11df4f5be1d351d7e26b5dcc15f5832da823aeca4aa56b`,
`ev_f1309f010ab693be79e1bd482fc8372d989dc3a2f1e66982c12beca4e72bd62c` and
`ev_2eab956db680087539b1189314cfd9a7f2fc362c803db8a80108228c189abdfc`
records the structure and ordering.

The codec represents one level of named folders and keeps the flat animation
indices, tree order and shared ownership. Each Animation18 name retains its
leaf. The export name is derived from folder and leaf, such as
`control/lumina_teal`. The full payload equality check still gates editing.
On a copy of the exact mascot, the combined codec parsed 6,036 domain and
4,200 generic records, decoded all sixteen clips and re-encoded the same
308,755-byte payload. The preservation includes mode 7 for the four known
non-animation groups and Project0/tag32's finite `0x4084f4a4` bits. REA
`ev_e13223c9a9eed7379805779c0dbfe25d3af20b8870a4d8948067f1a2a8034dcc`
captures the exact payload comparison and the prior four-byte mismatch.
Stock acceptance of a newly encoded folder fixture is a separate check.
Deeper folder trees are outside this profile.

## Constraint, Event and audio profile (0.9.3)

The canonical model now retains typed IK, Transform mix, seven Physics parameter,
Physics Reset and Event timelines. IK stores two numeric curve axes plus three
discrete flags, confirmed by new exact4.3.26 e996 whole-arena discriminator.
Transform has six independent mix curves; Physics scalar tracks each have one
curve and Reset is frame-only. Event defaults and materialized key payloads are
separate, including signed integers, raw f32 float/volume/balance and strings.
Stable desktop IDs are mapped at the native boundary, never serialized as wire IDs.

`SceneProject` additionally retains audio_root, Event definitions and the typed
unknown-meaning Skeleton53 boolean editor_flag_53. Skeleton40 and the Event
definition group share the observed Group108 identity. Preserve the flag and
alias; never derive them from a filename or invent a UI meaning. Whole-payload
equality with492c6552B/9b4779B/e9961300B and earlier bone/slot/deform profiles is
required. Unknown/global Physics targets and Reset All remain rejected.

Forty-six format tests and strict Clippy pass. One new UI-authored c910 source
exported once by original115048 retains42 keys,60 numeric constraint bits,
64 controls and12 Event payload float bits. Independent256 runtime comparisons
have maximum3.34e-7 residual under5.1e-6. Runtime omission defaults use explicitly
documented current4.3 parser behavior; these are distinguished from exact-editor
raw bit observations. No original audio/GPU/gesture/Physics-phase equivalence
follows. See `analysis/animation-constraint-event-format-check.json`,
`analysis/animation-constraints-events-ui-original-v2-check.json` and paired
`research/ANIMATION-CONSTRAINT-EVENT-*-4.3.26.md`/CODEC-CONTRACT notes.

Native resources support bounded PCM16 RIFF/WAVE mono/stereo8–192kHz. WAV bytes
remain separate portable resources; there is no new project container. SaveAs
copies validated resources and rebases the audio root, or rejects missing/unsafe/
colliding resources before writing project bytes. Native history retains caches
and raw metadata. Frontend WebAudio playback is a separate tested integration;
frontend Animate Physics motion is a later profile, with exact F307 phase pending.

## Current FBones mesh capacity

The0.10 source raises only the typed Scene mesh profile to1024vertices,6144
triangle indices and8192 edge indices, with8192 aggregate scene vertices.
Independent generic object/byte budgets still apply and can bind before every
semantic maximum is reached. Reader expansions are field-context-specific,
including cached-reference rechecks; ordinary and legacy contexts are unchanged.
Clip and auto-trace limits are unchanged. This is an FBones resource policy, not
a measured original-editor limit or an expansion of reference compatibility
claims. Paired [DATA](research/MCP-PRESENTATION-IMPORT-DATA-GATE-2026-11-17.md)/
[UI](research/MCP-MASCOT-MESH-CAPACITY-UI-GATE-2026-11-17.md) findings preserve the
real source's complete payload equality and the1024/1025 boundary regressions.
