# Constraint and Event animation — native integration plan

2026-10-30. Plan only while the current0.9.2 Draw Order/deform delivery gates
run. No product implementation, Windows/original calls or user-window actions
were performed for this note. Existing native235/legacy93 checks and strict
profiles remain frozen; no successful test commands were repeated.

## Reference gate and ownership

Use the paired `ANIMATION-CONSTRAINT-EVENT-DATA-4.3.26.md` and
`ANIMATION-CONSTRAINT-EVENT-UI-4.3.26.md`. Their retained original492c and9b7f
sources already prove represented records; do not repeat those collections.
The independent optional-family report is
`analysis/animation-next-optional-reference-check.json`. Its240 numeric
comparisons do not establish animation playback, exact GUI gestures or Physics
solver phase parity. IK Compress is explicitly retained raw despite its runtime
JSON omission. Broader source composites remain inspection-only until every
represented family is supported by complete reserialization.

DATA owns public crate types, reader/writer arenas and codec guards. The native
worker owns new `src-tauri/src/animation_constraints.rs` and
`animation_events.rs`, focused tests and minimal existing Session/history/cache
integration. Root owns TS DTOs, samplers, workspace/preview transport and editor
integration. UI owns timeline rows/Graph/constraint and Event controls. Freeze
these contracts together before dependent implementation; this note is not a
claim that tentative DTO names are already supported.

## Typed model and session references

Keep `Animation.constraint_tracks` and `Animation.event_tracks` separate from
bone, slot, draw-order and deform families. Proposed constraint variants are:

- IK: target constraint index plus grouped keys containing frame, Mix/Softness,
  Stretch/Compress/BendPositive and a supported curve descriptor. Preserve all
  five raw lanes, including otherwise hidden flags. Initial curve support is
  Linear/Stepped only: IK Bezier axis count/conditional records remain unknown.
- Transform Mix: target constraint index plus six values in the directly proven
  Rotate/X/Y/ScaleX/ScaleY/ShearY order and six-axis curves/controls. Source,
  ordered Targets, mappings, ranges, offsets and Match caches are not key data.
- Physics property: target constraint index, one of the seven proven properties,
  scalar value/curve. Physics Reset is a distinct discrete track, not a scalar
  zero or a fabricated Reset All/global target.
- Event: definition index plus ordered discrete keys with complete typed
  int/float/string/volume/balance payload. Definitions preserve their own defaults,
  name/audio path and skeleton audio root; typed definition and key identities
  are distinct. Do not reconstruct omitted values from sparse runtime JSON.

The wire group owner follows the measured constraint source/constrained bone;
it is not a fake bone timeline and cannot be inferred from the first affected
bone. DATA must provide a stable canonical grouping permutation, as with slot
and deform tracks. Apply it to tracks and parallel key-ID arrays together.

`SceneFrame.constraint_ids` already supplies stable native targets. Allocate
Event definition IDs and every new family's key IDs from the existing global
counter, with separate per-animation parallel arrays. Extend create/duplicate/
delete clip, mixed key selection, move/delete, clipboard and duration across
all families. Clone must allocate fresh IDs; imported duplicate frames retain
their order and identity. Explicit key-ID updates address the selected key.
Event triggers must not silently inherit bone sampling's last-equal replacement
policy; a declared creation/collision policy is required.

Proposed DTOs are `AnimationView.constraintTracks` (discriminated union by
`ik`, `transformMix`, `physicsProperty`, `physicsReset`) and `.eventTracks`.
Stable constraint/Event IDs replace wire indices. Grouped IK/Transform values
remain atomic keys; Physics properties remain independent tracks. Extend
`setAnimationKeyBatch` with default-empty `constraintKeys` and `eventKeys`, plus
dedicated setters. Existing bone/slot/geometry command contracts remain intact.
One completed slider gesture or mixed paste creates one native history entry.

## Sample before solving, without baking or resetting every frame

The current boundary is `Session::evaluate` →
`evaluation::evaluate_animation` → `solve::evaluate`. Bone working poses enter
before ordered constraints; slot/draw/deform projection uses the resulting
precise worlds. Constraint timeline samples must therefore be transient inputs
to the existing ordered solver, not a generic authored `updateConstraint`.
Expose a compact `constraintPose` summary only where inspectors/freeze require
it, with proposed sparse temporary overrides for Auto Key-off. Bind effective
override bits and clip/frame/FPS/layout in the existing continuation/frozen
cache. No clock, velocity, sampled coefficient or evaluated bone is serialized.

There is a concrete lifecycle trap in `solve/physics.rs`:
`PhysicsState::prepare` compares its entire stored `Vec<Constraint>` with
`scene.constraints` and clears all springs on any difference. Cloning a Scene
and replacing animated IK/Transform/Physics values every frame would therefore
reset Physics whenever a coefficient changes. It would also copy unrelated
geometry. Do not use that route.

Separate authored constraint layout/reset identity from sampled numeric inputs.
Add an explicit borrowed sampled-values overlay to the solver boundary; retain
the original Scene for graph/order, Setup layout and reset detection. Validate
overlay target kinds/count/finite values before mutating a cloned PhysicsState.
The ordered solver reads sampled fields while constraint topology and Setup
changes keep their existing invalidation behavior. Prefer f64 sampled scratch
values through evaluation, without an arbitrary per-frame f32 rounding step;
pair DATA/UI sampling precision before selecting concrete overlay structs.
Do not change spring arithmetic, inverse thresholds or deferred F307 phase to
make timeline input possible. Default live Setup and explicit Simulate-off must
remain unchanged.

Physics replay must sample coefficients at each existing evaluation step,
including native checkpoint replay, rather than applying only the destination
frame's coefficients to all preceding steps. Reset keys require a bounded
per-constraint reset operation and a tested crossing policy. Their serialized
existence does not prove seek/backward/loop behavior. Global property/Reset All
records remain unsupported until their target encoding is directly settled.

## Event playback and resources are distinct from persistence

Event definitions/defaults/keys can roundtrip before sound playback is claimed,
but an enabled preview must actually resolve and play the resource. The current
Scene profile fixes empty audio/Event assumptions; those cannot remain hardcoded
while accepting richer records. Add a typed skeleton audio root and safe native
audio inventory before allowing such files to save. Existing PNG decoding is
not an audio decoder: reuse path traversal/safe bundle/revision/file-dialog
invariants, not the ImageAsset payload type. Preserve unknown audio variants by
rejecting the whole unsupported project rather than stripping metadata.

Trigger events as transient local playback output, without native authoring or
per-frame IPC. A forward interval, scrub, backward seek, loop boundary, exact
first frame and duplicate timestamp policy must be explicit and tested. Keep
all imported payloads even if a preview policy mutes firing. Preserve the
observed default balance−.25 independently of default volume.6. Audio decoding,
missing-file behavior and WAV/MP3/OGG support need actual platform evidence;
the retained WAV's import/export is metadata evidence only.

## Structural edits and staged acceptance

Resolve keyed targets by stable IDs before constraint reorder; remap only
indices/grouping and retain all payload bits. A delete or kind replacement of a
keyed constraint/Event definition must reject atomically initially. Renames may
preserve target IDs. Setup membership/property edits need a reviewed explicit
policy for any resulting group-owner change; do not silently retarget a key.
All malformed/stale/unsupported commands preserve document, revision, IDs and
history. Existing complete codec reserialization and arena/key/track bounds
extend to the new records; no unknown family is discarded.

1. First complete proven IK Linear/Stepped and Transform Mix, including visible
   sampled pose changes, all Setup/cache/range bits, Auto Key on/off/manual,
   Graph axes, mixed history/clipboard and native binary Save/Close/Open.
2. Then integrate seven Physics properties and per-constraint Reset with the
   sampled-overlay lifecycle above. Test continuous state through changing
   coefficients, explicit-off intent, reset crossings, replay/checkpoints and
   no Setup/clock bake. Do not label these tests exact F307 dynamics parity.
3. Complete Event definitions/payload timelines and safe audio resources;
   separately prove documented trigger/preview behavior and actual playback.
   Preserve the full F105 scope while exposing only supported controls.

Each stage needs its independently UI-authored source acceptance in original
4.3.26 and targeted Linux/native Windows interactions. Current0.9.2 gates finish
before new product edits. New reference collection is justified only for a
specific unresolved enabling branch, such as IK Bezier or global Physics
targets—not to repeat settled records or restart negative observer routes.

## Authorized0.9.3 native implementation checkpoint

The0.9.2 delivery finished before implementation. Root authorized0.9.3, and the
new exact IK discriminator closed the previous Bezier unknown: two Mix/Softness
axes with current-or-previous conditional handles. See
`analysis/animation-ik-bezier-reference-check.json` and the DATA codec contract.
All three discrete IK flags remain raw/preserved; runtime Compress omission is
not normalization. Native now authors, samples and persists every typed family
described above. `editor_flag_53` is retained as unknown boolean metadata, with
false for new projects; no audio or UI meaning is inferred from its value.

`animation_constraints.rs`, `animation_events.rs` and the borrowed
`solve::ConstraintValue` overlay implement the agreed typed DTOs and commands.
`ConstraintPose` uses type `ik`/`transform`/`physics`, complete numeric working
values and native stable constraint IDs. The original Scene supplies spring
layout; sampled f64 coefficients supply only application values. Default solver
results and PhysicsState are tested equal with the old call path. Changing
sampled coefficients does not clear springs. Native Replay samples coefficients
on its existing ticks. Reset crossings use a declared FBones policy:
`(previousTime, currentTime]`, including zero only on an initial Reset; None
freezes do not consume Reset keys. This does not establish animated Physics UI
playback or deferred exact solver/export-phase parity.

All new keys share native global key IDs and one atomic history path, including
mixed batches, duplicate clips, move/delete and stable target remap. Event keys
without a selected key ID append at duplicate frames; explicit IDs update only
that key. Constraint manual keys replace the last equal-frame key. These are
FBones authoring policies. Keyed constraint/Event deletion rejects atomically;
definition patches preserve unrelated defaults and do not rewrite existing key
payloads. New definitions use zero numeric fields and empty string/audio as an
explicit FBones preset, not an assertion of exact original New behavior.

JSON input-only bit carriers preserve negative zero: constraint `valueBits` and
parallel `controlsBits`, Event `payloadBits` and definition patch field bits.
Native validates finite/equal numeric values before restoring bits. Temporary
f64 constraint poses use sparse `negativeZeroIndices`, validated/restored before
the existing frozen-layout capture; nonzero f64 precision is unchanged. There
is no extra binary field or duplicated output DTO.

`audio.rs` adds a bounded first resource profile: RIFF/WAVE PCM16, mono/stereo,
8–192kHz,16MiB per file,64MiB/256 files per library and128MiB of unique retained
history bytes. These are FBones resource bounds. It decodes PCM samples for
validation/peak metadata and keeps the original encoded bytes. It follows
Microsoft's [WAVEFORMATEX](https://learn.microsoft.com/en-us/windows/win32/api/mmreg/ns-mmreg-waveformatex)
PCM block-alignment and byte-rate definitions; this standard evidence does not
prove original editor audio behavior. Unsupported audio encodings remain
unavailable, with no enabled fake player. Native playback data comes only from
validated cached WAVs, scoped by the document resource generation.

Audio-folder selection, native library/data commands, safe portable bundle and
root/history relocation are implemented. Save As copies validated own WAV bytes
under `./audio`; missing references, destination collisions/links or stale
revisions reject before replacing project bytes and leave the project dirty.
The test host generates its own2250-byte440Hz PCM16 fixture and checks both image
and audio embedded roots against its sandbox. Actual browser/WebView audio
decode and playback remain separate root/UI gates.

Current default native checks pass249 tests with2ignored; legacy93 with1ignored.
Nine new constraint/Event tests cover sampling, discrete flags, persistence,
shared IDs/history, grouped bit carriers, precise temporary poses, stale epochs,
structural references, default solver equality and explicit replay/reset policy.
Five audio tests cover decoded PCM/data URLs, malformed/bounded files, safe
scanning and aliases, source-folder deletion plus portable Save/Undo/reopen,
missing/collision/stale project preservation and destination-link rejection.
Six isolated native host checks pass. Strict profile checks and source/log pins
are recorded separately; rebuilt UI, new independently UI-authored original
acceptance, audio playback and Windows delivery remain coordinator gates.
