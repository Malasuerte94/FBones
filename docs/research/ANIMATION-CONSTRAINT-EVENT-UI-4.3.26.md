# Constraint and event animation — UI reference audit

2026-10-30. Reference-first handoff before dependent future F105 code. The worker
made no original/Windows/process calls, ran no shared UI tests and requested no
additional collection. Root alone operates owned references and test windows.
The current0.9.2 Draw Order/deform gate remains separate. Preserve the shared
central Setup/Animate transform HUD and the protected normal0.9.1 user103180.

## Direct exact4.3.26 evidence and its limits

Re-viewed owned original screenshots with `view_image`:
`.local/research/feature-ui/physics-default-inspector-observed.png` and
`transform-inspector-observed.png`; source/identity receipts are retained in
`FEATURE-UI-4.3.26.md`. Both are **Setup**, not a new Animate key observation.

The Physics capture has a compact inspector below Tree: a Setup foldout with
member/Translate/Rotation/Scale X/Shear X/Limit/FPS, followed by seven property
rows. Inertia/Strength/Damping/Mass/Wind/Gravity/Mix each have a precise number,
a slider and adjacent key/global controls. Simulate, Deterministic, Reset and
Reset All sit below; Reset actions have neighboring key glyphs. Observed values
include Damping15 and Mass100. The original member label is Target; FBones' Bone
label is the already authorized user-facing choice, not a newly inferred
external target. The imported-default capture is not proof of original New
preset values or live trajectories.

The Transform capture proves exact4.3.26 **Source**, plural **Targets**, separate
Offset/Mix/Properties groups, a two-sided mapping table, separate Local flags,
Additive/Clamp and two Match actions. Do not replace this layout with a generic
older-style single-Target transform inspector from an unversioned guide. It
proves neither Animate Mix key buttons nor keyed Properties/ranges/offsets.

Reused `animare/` views show the shared compact timeline/Tree/Curves/Preview
placement but no readable Constraint or Event timeline rows or key-edit forms.
A targeted retained-image search found no owned Animate Event inspector or IK
key-gesture capture. Exact row hue/order, key-creation/duplicate rules, flag
switch sampling and audio playback gestures remain unobserved GUI behavior.

Root's accepted own9b7f composite and new492c source supply **data** evidence.
The worker read actual492c runtime JSON, not just its prepared input. Root import
99632/export107276 both exit0/exact4.3.26/Complete. The paired independent DATA
report is `analysis/animation-next-optional-reference-check.json`:47 optional
keys,240 numeric scalars, maximum1.907348635e−7 at the unchanged5.1e−6 bound.
The full parser and aliases reach the trailer; these families remain research
only until their separate typed codec/native authoring gate.

| Family | Direct data evidence | UI/persistence qualification |
| --- | --- | --- |
| IK | Four keys vary Mix, Softness, Stretch, Compress and Positive independently. DATA resolves raw lane order Mix/Softness/Stretch/Compress/Positive. | Compress=true is retained raw at frame6 despite runtime JSON omission. Do not erase that imported flag based on JSON. No IK Bézier control-arity case was collected. |
| Transform | Five keys, six independent Mix values, mixed Linear/Bezier/Step/Bezier/Linear. Twenty-four JSON control scalars encode six axes. | This does not animate Source/Targets, mapping topology, offsets or editor range caches. |
| Physics | Seven independent scalar tracks, five keys each and real scalar Bézier controls; older9b7f also has two per-constraint Reset keys. | Keyed parameter data is not a measured simulation/export phase. Global-property and Reset All target encoding are not settled by named per-constraint tracks. |
| Events | Three keys link one definition with int/float/string and audio volume/balance. Setup definition has path tone.wav/volume.6/balance−.25. | DATA's raw middle key uses Setup balance−.25, not the current runtime-reader fallback to Setup volume. Runtime JSON omits default fields; the actual raw value is authoritative. Audio playback was disabled during collection. |

## Official documentation fallback — patch version not identified

[Keys](https://esotericsoftware.com/spine-keys#IK-constraints) places manual keys
beside IK and Transform constraints in Tree. IK combines Mix/Softness/bend/
compress/stretch; Transform combines the six Mix values. The same guide places
event keys beside each event, with per-key payload fields grouped. These are
current documented interactions, not newly observed exact4.3.26 gestures.

[IK constraints](https://esotericsoftware.com/spine-ik-constraints) distinguishes
Parent/Child/Target from keyable influences and flags; Softness/Positive are
specific to two-bone IK, Compress is documented for one-bone IK. The documentation
image was viewed locally as `animation-constraint-event-ui/documented-ik-properties.png`:
small Parent/Child/Target rows, Options checkboxes and Softness/Mix sliders. Its
patch version is unknown. Hiding an unavailable control must not normalize away
an imported raw flag; keep Setup behavior unchanged unless separately reviewed.

[Transform constraints](https://esotericsoftware.com/spine-transform-constraints#Mix)
documents keyable Mix sliders and linked-slider adjustment. The exact retained
4.3.26 Source/Targets/mapping controls above take precedence over differing
labels in this guide. No source establishes all mapping/editor-cache fields as
animatable, so keep those out of a Mix key.

[Physics constraints](https://esotericsoftware.com/spine-physics-constraints)
distinguishes Setup influence settings from keyed property sliders. Global flags
allow one property timeline to affect several constraints. Reset differs from
Reset All. Simulate/Deterministic describe continuous versus replayed animation
physics; that documentation is not exact-patch numerical/export proof. Reuse
FBones' existing solver and explicit-off intent; do not restart deferred F307
research or change its accepted Setup behavior as a shortcut.

[Events](https://esotericsoftware.com/spine-events) documents Tree Events→New→Event,
Setup defaults, and per-key Integer/Float/String. Audio path enables Volume/
Balance controls. A separate Audio node selects a folder; audio paths may be
relative/nested and audio files can create events. During playback, event names
appear briefly in the viewport. The guide's images were downloaded privately and
viewed (`documented-event-properties.png`, `documented-event-new.png`): purple
Event/Events icons, ordinary Tree nesting, compact payload rows and an Audio path
row, not a separate large wizard. They do not identify4.3.26. No guide establishes
our missing native audio/resource implementation or platform codec acceptance.

## Minimal controlled UI contract before implementation

1. Keep existing Constraint Views and Tree inspectors. In Animate, display the
   **sampled working values** for the selected constraint. Add adjacent compact
   manual key actions where documented; keep NumericSliderRow's precise number,
   staged pointer/keyboard commit, Escape, invalid-draft Save guard and existing
   units/conversions. Do not send one native command per slider input frame.
2. Separate structure from animation: names, references/membership, constraint
   order, mapping links, Properties/ranges, Offset Match, setup Physics influence
   channels/FPS and other unproven fields stay Setup-only/read-only in Animate.
   Keyed Mix/property changes use explicit timeline commands; never generic
   `updateConstraint` which rewrites Setup. Preserve sparse hidden Mix values,
   editor nullable ranges, raw runtime caches and unrelated constraint settings.
3. IK keys preserve all five grouped fields, while Graph plots actual numeric
   Mix/Softness, not fabricated interpolated Boolean values. Discrete flags switch
   without fractional checkbox states. Enable only proven curve profiles; no
   guessed editor Bézier-axis serialization. Transform plots six real Mix curves
   and independent handles, using existing0–100 UI presentation over normalized
   wire values. Do not silently group targets or rearrange their retained order.
4. Physics has seven independent property channels/manual keys and a discrete
   per-constraint Reset lane. Keep Reset preview actions distinct from authoring
   a Reset key. Do not implement Global/Reset All as a silent snapshot batch that
   pretends to match an unmeasured original global timeline. A broader operation
   needs its typed target/gate or an explicitly labeled bounded FBones policy.
   Actual animated playback must use the existing shared engine with transient
   sampled coefficients; storing slider keys alone is not visible dynamics.
   Native freeze/replay histories and simulation state never bake into Setup.
5. Use separate typed Constraint/Event timeline families, retaining the global
   native key ID namespace, mixed clipboard/move/delete/history and marquee.
   Constraint rows can group with the related bone indicated by retained data;
   exact original row labels/order remain unknown. Do not encode a constraint
   ID as a fake bone ID. Event/reset tracks are discrete and have no numeric
   interpolation/Bezier buttons. Existing Draw Order and Event bottom-row layout
   is documented; an Event's integer payload is not a continuous Graph curve.
6. Add real Event definitions beneath Events in Tree and use the existing compact
   New/name flow. Selecting a definition in Setup edits defaults; selecting a
   key in Animate edits that key's payload. Definition ID and key ID are distinct.
   A manual key groups int/float/string plus audio metadata when applicable.
   Keep audio path/resource selection at definition level. Preserve raw imported
   defaults and unknown data; don't synthesize a payload from sparse JSON alone.
   Duplicate-frame event handling/GUI defaults require an explicit policy; do not
   silently drop triggers by reusing bone last-key sampling rules.
7. Reuse the safe native resource/bundle and file-dialog path for audio. Metadata
   roundtrip is distinct from verified playback. Expose a sound preview/control
   only when it plays the resolved resource; do not make a fake enabled player.
   WAV/MP3/OGG platform decoding, path lookup, folder refresh, duplicate filenames,
   missing files and Save As portability need targeted coverage. Keep strict CSP;
   don't relax script/eval policy to add audio.
8. Event triggering is transient playback output. Give names a small viewport
   notification in the documented location, without native history/RPC per frame.
   Explicitly decide forward seek/backward seek/loop/duplicate-key behavior and
   test each boundary; exact original behavior is not inferred from import/export.
   Event selection, mute/visibility and key deletion must remain distinct.

These are bounded integration requirements and documented fallback choices, not
a complete parity claim. Preserve before-first/last-key policies, stored f32
normalization, exact frame identity, paste origin/relative-time boundaries and
full canonical reserialization. Imported future records stay inspection-only
until their entire represented family can be rewritten safely.

## Remaining exact questions and focused acceptance

No repeat of9b7f/492c is requested. Existing data already settles represented
IK flag lanes, six-axis Transform, seven Physics scalars and audio defaults.
A future **new** small discriminator is justified only if enabling a branch not
settled here: IK Bézier control count/conditional handles; global Physics target
and Reset All record; or an exact key-gesture/default/duplicate question that
changes the intended behavior. GUI claims require an owned fresh instance/root
operation, never a protected user window. Do not restart JVM class-buffer probes.

Required native/UI tests: actual slider/check/key actions with Auto Key on/off,
visible IK/Transform pose changes and independent sampled numeric curves,
per-property Physics keys/Reset without authored pose or clock changes, all
Setup/cache/range bits preserved, invalid/stale edits atomic, mixed-family
clipboard/undo/duplicate/global-ID correctness, event key payloads/defaults and
loop boundaries, native binary Save/Close/Open plus portable resources. Audio
must be separately exercised as real playback before claiming it. One new
UI-authored source original acceptance and Linux/Windows UI evidence remain
separate gates, not reasons to rerun already accepted reference batches.

## Audio inspector integration policy

The next working profile reuses the exact492c literal Event audio metadata and
its generated WAV. Paired DATA/UI review before dependent audio UI changes
confirms that Volume and Balance remain raw f32 payloads, independently of
Setup defaults. A percent number/slider presentation (`wire * 100`, only the
edited field divided by100) is an explicit FBones UI policy; the retained
screenshots do not prove exact4.3.26 audio-slider units. Sliders present0–100
Volume and−100–100 Balance without clamping otherwise valid stored values.
Unedited raw values, signed zero and complete key payloads remain intact.
The prior no-audio reference stores zero defaults; do not fabricate Volume1.

The controlled Event inspector exposes a Setup-only Audio folder chooser,
portable sound-key suggestions, literal path/default editing and an enabled
preview only when the parent has actual playback capability. Root folder
selection and native `get_audio_data` validation are separate from event key
payload edits. An `animation-event-fired` output is playback status, not an
extra saved field. Audio lookup must use the resource generation/document ID;
folder changes cannot rewrite materialized key defaults or the editor flag53.

A new own test fixture supplies PCM16 mono22050Hz/1103frames (2250B). Planned
acceptance includes native resource metadata/data-URL validation, actual browser
Web Audio decode/offline stereo gain/pan rendering with finite nonzero PCM,
real preview/forward-event UI actions and portable Save As/Close/Open. Offline
rendering is not proof of audible hardware output. Actual UI checks remain
pending until the coordinator runs the rebuilt host; no Windows/original calls
or completed oracle repeats were performed by this worker.
