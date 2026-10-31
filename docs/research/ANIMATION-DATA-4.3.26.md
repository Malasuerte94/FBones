# Animation DATA audit — Spine4.3.26

2026-10-30, before dependent implementation. The user's latest instruction
accepts the delivered mesh/Physics workflow, defers remaining F307/F308 fidelity
questions and prioritizes full Animate/timeline/keyframes. This supersedes old
roadmap wording that blocked timeline on those questions. They remain pending,
not proven parity or deleted scope. Root alone operates original Windows;
this DATA audit performs local reads only.

## Directly proven existing evidence

- The current canonical Scene codec supports only Setup and one empty animation.
  `SceneProject` currently contains rig/images/slots/inventory/constraints, no
  timeline model (`crates/fbones-format/src/minimal/scene.rs`). The base record
  writer `minimal.rs::project_record_with_regions` emits class18 named
  `animation`, field2 empty, skeleton11.field7 animation array and field37
  group108 reference. New/Open cannot truthfully persist nonempty animation
  through this model. Scene reader's complete reserialization equality rejects
  richer records; preserve that guard.
- Exact4.3.26 own animated `.spine` binaries and canonical JSON already exist in
  `.local/research/constraint-solvers/fixtures/`, including
  `physics-teleport-control`, `physics-y-trajectory`, `physics-animation-reset`
  and later clean/ramp/replay fixtures. They were imported/exported/rendered by
  original4.3.26; reuse these accepted files without repeating collections.
  Collection scope and results: `CONSTRAINT-SOLVERS-4.3.26.md`,
  `analysis/physics-moving-parent-phase-check.json`, existing physics replay
  timeline audits. They establish translation key inputs/animation names;
  unresolved Physics output timing does not invalidate saved animation inputs.
- The constraint-free teleport control's canonical JSON retains translate keys
  at time0,.2,.2,1 with stepped curves, including duplicate .2 keys; the
  input .20001 snapped to .2 on that import. This proves that case, not a
  universal snapping rule. Do not implement unconditional time quantization or
  silently erase imported duplicate keys. Canonical playback input uses the
  final duplicate value in the retained control measurement.
- `physics-animation-reset` retains two named animations with the same input;
  existing render measurements match between sequences. Named multiple
  animations are real data, not a UI-only list.
- Targeted existing own-binary parse with unchanged MatchReader stops at new
  class19 at decoded byte130, within class18.field2's timeline array. Existing
  Setup reader knows neither this record nor its key records. Bytes in the
  retained translation record include class132/133 and a float30 at the
  runtime JSON1-second key. Their precise schema is still under targeted
  recovery; do not mistake a partial parse for a proven editor format.

Commands used: read own fixture JSON and own Rust writer/reader; in-memory
`MatchReader(zlib.decompress(own_spine,-15))` on the three named fixtures. No
original process, input, launch, memory read or new fixture collection.

## Officially documented, patch version unspecified

The [Keys guide](https://en.esotericsoftware.com/spine-keys) describes Animate
mode with an active animation, keys, scrubbing, frame snapping, repeat and
transforms. The highest keyed frame determines duration; frame display defaults
to30FPS and fractional frames are possible. Unkeyed Animate changes are distinct
from stored keys. This supports a separate preview pose and explicit keying,
not mutation of Setup bones on every scrub.

The [JSON format](https://en.esotericsoftware.com/spine-json-format) documents
named animations, bone rotate/translate/scale/shear timelines, key time and
interpolation. Runtime JSON is not the editor `.spine` container and does not
establish the class19/132/133 schema. Official pages are primary documentation,
not proof of exact4.3.26 editor serialization or gestures.

## Native model and staged acceptance

Proposed authoritative Scene extension: `animations: Vec<Animation>` with name
and bone timelines. A track references the bone's wire index, has a channel and
ordered keyframes. Session exposes stable animation/track/key IDs across
history/reordering; format indices stay separate. Proposed common channel enum
is Rotate/Translate/Scale/Shear and a key holds an exact f32 frame, two f32 values
(rotation uses the first), and an interpolation mode. **These are our API design,
not recovered class layout.** Existing default remains one empty `animation`
with byte-identical old output. Do not add a sidecar, JSON payload or opaque
renamed template to fake persistence.

Use a frame field, rather than round-tripping seconds into frames, until exact
wire time representation/FPS are settled. Runtime seconds and displayed frames
are distinct; retain f32 key bits, valid fractional frames and imported duplicate
ordering. Confirm the native writer against actual saved raw fields before
choosing time normalization. Proposed editable first profile may reject authored
duplicate frames atomically while retaining imported duplicates; that is an
explicit policy, not original UI parity.

First working vertical slice: named animation selection/create/rename, real
bone Translate keys, linear/stepped interpolation, frame scrub, play/pause/loop,
explicit keying, delete/move/copy keys, Undo/Redo and binary Save/Close/Open.
A channel becomes editable only when its real editor records can be independently
encoded/decoded and full-payload equality retained. Add Rotate/Scale/Shear and
Bezier as soon as their existing evidence or one targeted new own original
fixture proves the corresponding wire schema; avoid pretending disabled or
unpersistable controls implement them.

Full requested animation scope remains: all bone channels; keys and editing;
graph/Bezier curves; slot attachment/color/visibility; draw order; mesh deform
and weighted/clipping behavior; constraint keys; events; playback/dopesheet
controls and project persistence. Stage by supported record families, never
label a bone-only first slice complete Animate parity.

Sample animation into a separate native pose before the existing constraint/
Physics solve. Setup stays unchanged; no evaluated pose, preview clock or
velocities serialize as bone rest values. Existing authoring revision/epoch,
resource safety, stable-ID remapping, cancellation, atomic errors and one
history item per completed gesture remain mandatory. Root owns UI; native
integration and format codec have distinct file owners.

## Unknowns and next bounded action

Exact editor track/key class fields, time units/FPS metadata, raw Linear/Stepped/
Bezier flags and handles, source-relative transform key convention, rotations,
scale multiplication, per-axis tracks and broader channels are not all proven.
No assumption may silently widen the canonical profile. Complete parsing plus
reserialization equality must reject unsupported timelines/skins/inheritance.

Next local action is targeted schema recovery of existing own translate tracks
and repeat/linear fixtures, then own codec roundtrip with full raw equality.
Search retained own files for other transform/curve records before requesting
new original evidence. Only root may collect a new own minimal original case
when necessary. Existing accepted animated fixtures must not be re-imported or
rendered merely to rediscover their established data.

### Targeted translation schema recovered locally

The unchanged generic parser, extended only in memory for the observed types,
now completes the full retained control/trajectory/reset and clean-step/ramp
payloads through their known12-byte trailer. Observed class19 fields, in wire
order, are4:booltrue,2:object array of tracks,7:nullable enum2,1:bone12 link.
Translate track132 is a domain record with one field1 containing a counted key
list. Each key is object133 with domain-reference identity, followed by f32
frame/X/Y and a varuint interpolation code. The clean-step controls carry code2
at0/6 or0/15 frames and canonical stepped JSON; linear-ramp moving keys carry
code0 and canonical linear JSON. Constant clock keys with code0 export as
stepped because a constant segment cannot distinguish their interpolation.
Thus code0=linear and2=stepped are supported by the nonconstant controls, not
inferred from the constant clocks. Rotate/scale/shear/Bezier remain unsupported
until independently recovered. Raw frame30 corresponds to canonical time1,
frame6 to.2, frame15 to.5 in these accepted30FPS imports.

Reference identity was additionally checked against original bone and animation
group links: all19/132/133 are domain references. Treating133 as generic can
consume the same bytes but resolves later references incorrectly; the full
reference-type checks reject that false parse.

### New exact4.3.26 four-channel/Bezier/FPS observation

Root performed ONE new own input import and same-source JSON export, both exit0,
original75344/58520; no render or old collection repeat. Inputc46f781d,
editor4b01f76d and collection receipt are in ignored animation-transform-reference.
Two nonzero Setup bones, three animations and72 nonconstant keys cover Rotate,
Translate, Scale, Shear with Linear, Stepped and Bezier; requested24FPS survives
canonical export. Independent full parser reaches the trailer and validates
bone/animation-group links. All72 keys/controls agree with exported decimals
within3.814697269e−7 at unchanged5.1e−6 bound. Report:
`.local/research/animation-data-audit/new-reference-check.json`, SHA8180877318ec18f9e86b19c5ce1fce57e872d298903a2fb72ee3cc7a43cda097.

This supersedes the earlier provisional tagged132 description. Track132 is a
CUSTOM domain serializer: channel UInt0Rotate/1Translate/2Scale/3Shear, followed
by a generic-reference counted key list. The first old Translate byte1 coincided
with a tagged record count/tag, hiding its generic identity; reference resolution
exposed and corrected this. Key133 is a domain reference, frame f32, one Rotate
or two XY f32 values, and curve code0Linear/1Bezier/2Stepped.

Bezier keys carry per-axis incoming and outgoing absolute editor-frame/value
points plus four canonical zero metadata bytes. Unset endpoints use2^31 for both
components. Final outgoing-Linear keys retain their incoming Bezier handles.
Handle presence for own/previous Bezier is consistent with the uniform observed
tracks; arbitrary adjacent mixed curve modes are not directly observed yet.
Do not reinterpret the trailing zero bytes' meaning or silently normalize them.
Project0.field2 is directly observed as24FPS; raw frames0/12/24 correspond to
runtime seconds0/.5/1. Earlier accepted30FPS fixtures remain30.

The updated native format design uses `SceneProject.fps` and the four-channel
model. `KeyCurve::Bezier` controls describe the OUTGOING segment as two arrays
`[cx1,cy1,cx2,cy2]` in absolute frame/value coordinates; Rotate uses one axis.
This avoids lossy normalization when equal-value segments have custom handles.
Native/UI normalized displays may convert explicitly without changing stored
bits. Before expanding the editable curve profile, retain bounded parsing and
full reserialization; reject unmodeled mixed cases until proved or label a
separate intentional FBones policy, never exact parity. Native sampling remains
separate from Setup. This extends bone-key coverage, not slots/deform/events or
complete Animate compatibility.

### Mixed curve conditioning now directly proved

A separate NEW own one-bone/four-channel fixture uses five keys with outgoing
Linear→Bezier→Stepped→Bezier→Linear. Root's one import/export both exit0;
inputfa33f902 is distinct from the accepted72-key fixture, which was not repeated.
The independent raw parser completes all references and20 keys at24FPS. Handle
presence is `[false,true,true,true,true]` for every channel: **current OR previous
Bezier** uniquely matches the four frozen hypotheses. In particular the Stepped
key after Bezier retains incoming handles, while the initial Linear key has no
handle block. Current-only, previous-only and whole-track presence alternatives
reject. Every raw value/control agrees with canonical JSON within1.525878908e−6
at unchanged5.1e−6. Report animation-data-audit/mixed-reference-check.json,
SHA95993c218c1cf4e6267a81d32df60d1924db22b20cd6ab184127388e0f26547a.
This closes the mixed-mode serialization condition; zero metadata semantics and
broader animation families/gestures still remain unknown.

### Independently authored UI source accepted by original

The final actual Linux UI-authored sourcec9483920 (525bytes) contains two named
animations, four bone tracks and eight keys,24FPS and edited Bezier controls.
Saved and reopened native summaries match all frame/value/control f32 bits,
16 Setup channels and parents/order. The separate independent raw reader verifies
CRC, complete payload traversal and reference types; Setup is not baked.

Root exported this NEW source once in exact4.3.26, owned78332/exit0, retaining
source/copy identity. Canonical JSON4ef4e49a matches47 represented decimal scalars
within4.943847642e−8 at unchanged5.1e−6; decimal normalization is distinct from
raw bit equality. Report `analysis/animation-ui-original-check.json`, SHA
1369164e5c757d59e36f28625dc37995358800e053271c0c77fa5d91a7c14961.
This establishes acceptance of our independently encoded bounded bone-animation
profile, not merely an original-generated fixture. No old command was repeated.
Format checks:32 pass, including the old complete-payload golden, four focused
animation cases and strict Scene/all-target Clippy. Separate coordinator reports
cover native/platform interaction checks; no Windows UI result is invented here.
Slot/deform/draw-order/constraint/event timelines, folders and broader animation
behavior remain pending; full Animate compatibility is not claimed.

### Windows QA history-focus finding — before selection fix

Unpublished Windows candidate50a19297 failed its owned QA group in99940. The
retained `.local/animation-windows-ui-result.json` records initial and edited
native summaries with `editedBone:0`, while all four tracks still reference child1.
The targeted key edit changes only the intended Translate endpoint. Driver
execution reaches the later key click after native animation Undo/Redo equality
checks, then times out finding child key2. This is not evidence that the stored
key disappeared or that codec/Undo data failed.

Source audit explains the UI consequence: `SceneHistory::apply` restores whole
native history frames including historical focus; a fresh open starts bone focus
at root0. `selectBone` is frontend state and does not author a native selection
transaction. Animation commands capture animation/key addresses without needing
to overwrite native bone focus. `workspace.ts::editRig` nevertheless resets both
`selectedId` and `selectedIds` from `result.editedBone` on every Undo/Redo. The
selection-based timeline filter then hides surviving child tracks. Native focus
metadata and the user's current live selection are distinct authorities.

Exact original4.3.26 Undo-selection behavior is **unknown**; no original action
is collected for this fix. Adopt explicit FBones policy: in Animate Undo/Redo,
retain the user's current selected bone IDs and active bone while they exist.
Prune nonexistent IDs; if the active bone vanished, choose a surviving selected
bone or null. Preserve multiple selection and an intentional empty selection.
Keep ordinary Setup history focus and structural-edit behavior unchanged.
Do not modify native history, serialize selection, reselect root as a blanket
fallback, or loosen key/data checks to hide the defect. Existing selectionEpoch
protection still lets selection made during an async request take precedence.

Regression must open a fresh saved file whose native focus is root, explicitly
select the animated child, edit a key, Undo/Redo and verify both persisted data
AND visible selected child/key rows; repeat with a surviving multi-selection.
A narrow nonexisting-bone pruning check is useful. This UI policy does not expand
original gesture parity or turn the failed Windows QA group into a pass.
Failed50a QA JSON is preserved independently at ignored
`.local/research/animation-history-selection-data/failed-50a-windows-result.json`
so a later result at the ordinary Windows QA path does not replace the evidence.

### Combined Region/Mesh animation demo and bounded output evidence

A new actual UI case proves moving rendered Region red and weighted Mesh green,
then portable native Save/Close/Open. Source1a78bfc5 is706bytes, with two bones,
two active slots, one Translate track/two keys and30FPS. Independent complete raw
comparison verifies16 Setup channels, activation/inventory, four dense mesh rows,
eight weight bits,16 local-position bits, eight UV bits and topology/hull/binding
owner links. Four dormant zero-weight root columns retain their eight nonzero
local-position fields. Five generated bundled PNGs have verified chunk CRCs,
size and hashes; only red/green are referenced. All four captured native stages
preserve attachment geometry. Report: `analysis/animation-visual-demo-raw-check.json`.

The ONE new combined-source CLI submission produced a771-byte JSON file with
matching Setup/animation/Region/Mesh content and assets copied, but its collector
failed after Process.Start when reading the already-unavailable MainModule path.
No ownership/PID-start, actual exit code or stdout/Complete receipt was captured.
Do not invent exit0, retry the action or call this full original acceptance.
Output file ddbc4e4f exists after the recorded attempt and52 represented numeric
comparisons have zero residual; the file declares4.3.26. This is **content evidence
with incomplete lifecycle**, distinct from c948's fully observed exit0 acceptance.
Report: `analysis/animation-visual-demo-output-check.json`, SHA
e9c0107427347ad8e883fc03500e1e7d70c940e431858e741c82715937825920.
No original animated GPU or image-decoding behavior is claimed from this output.

Fresh final75 UI copies05502d71 and516d3702 differ from the representative c948
and1a78 files only at decoded identity-header bytes22..27/23..27 respectively.
All bytes before12 and after28 are identical, including every key, control,
attachment, UV, weight and metadata record. New compressed bytes were not
exported again. `analysis/animation-final-source-reuse-check.json` distinguishes
full c948 acceptance from the combined output-only lifecycle limit.
