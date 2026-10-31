# F105 — Animate mode, animations, timeline and keyframes

Status: **ACTIVE —0.9.4 is published/opened with bounded Animate Physics
preview. Advanced tools and broader compatibility remain open**.
The user's latest instruction prioritizes Animate and a timeline close to Spine.
F307 export-phase and F308 broader Match sampling remain open; neither blocks this
new priority. This document does not declare complete Animate compatibility.

## Latest delivered milestone —0.9.4

The Main viewport and clean Preview now share animated Physics evaluation from
saved bone keys and keyed coefficients. The frontend reuses the existing solver
with authored constraint layout and transient sampled values; complete60Hz steps
commit while fractional endpoints remain scratch state. Seek/backward rebuilds
saved history, Play advances only the timeline clock, and Pause holds the pose.
Loops reconstruct the saved prefix as an explicit FBones policy. Setup retains
its existing default live Physics HUD and the shared central transform controls.

Animate's Physics inspector adds compact Simulate, timeline seconds, a same-frame
**Rebuild preview** action and a visible error. Rebuild creates no Reset key or
history entry. Explicit Simulate off uses static None evaluation and remains
available outside the bounded replay window. Simulated preview is limited to
120seconds; longer animations remain valid data, with an explicit preview error
instead of an unlabelled simulated fallback.

Native Replay freezes match the displayed prefix and apply a working bone or
constraint draft only once at the endpoint. Selected/keyed geometry stays scoped,
including a first unkeyed weighted Mesh gesture. Held geometry epochs bind the
current document/revision/clip/frame/draft generation and Simulate intent; stale
leases reject before transient conversion and again before IPC. A completed
viewport gesture still creates one native key/history transaction. Evaluation,
clocks, velocity and transient poses never bake into Setup or saved files.

On the rebuilt working product, four focused Linux UI cases have passing results: seek/Play/Pause/Rebuild/Simulate/
120-second limits with Main/Preview pixels; weighted Mesh Replay freeze and
endpoint-only drafts/history/save/reopen; parent drag begun during playback; and
rejection of stale same-frame leases after Simulate/Rebuild changes. The first
pixel failure was a probe on a bone overlay, with all preceding pose comparisons
already passing. Its trace is retained; only the probe moved to a proven opaque
interior, preserving exact RGB and all pose/limit assertions.

Independent `analysis/animation-physics-preview-data-check.json`
(SHA1094295e515ea5635b8034655637818150b8071dd2e5b6cecd014f3a40ced681)
checks112 own TS/native cases at24/30FPS and default1/60 or exact1/64 constraint
steps. Different RAF schedules agree exactly at common requested times; maximum
public native-f32 residual is3.5806674532068428e-6 under1e-5, with endpoint drafts,
Reset, signed-zero carriers, the120-second bound and Simulate off beyond it.
This is agreement between our engines, **not original Spine dynamics/phase
parity**. F307 remains deferred; no observer route or completed oracle repeats.

Full95 Linux UI passes in112326.192ms with no failures/skips/retries. Three
actual Windows groups on immutable429e4c4f verify GPU poses, Replay Mesh dragging
and OS SaveAs/Close/Open. Own90144 closed normally clean. ONE new source9eff
passed original81984 exit0/exact4.3.26 export; independent13key/72scalar comparison
max1.9073486328125e-6 and raw/dormant/Setup/resource checks pass. Final95source
differs only in typed identity; no repeated export. Reports:
analysis/animation-physics-preview-{ui,delivery}-check.json,
animation-physics-ui-original-check.json and preview-data-check.json.

Windows0.9.4 is published/opened,12440064B. Normal113788/start21:13:07.6115683Z/
HWND132848106 is visible/frontend-ready and user-owned/DoNotAutomate; transport
55266 stays protected. All37older images/442helpers preserved. Physics.fbones →
Moving parent physics demonstrates Play/scrub/Simulate/Rebuild. No normal-demo
preload was attempted. STATE owns exact process protection/evidence/next steps.
Full F105 remains ACTIVE for global Physics/reset-all, RGB/alpha/TintBlack,
advanced timing, mixing and onion skin. F307/F308 fidelity remains deferred.

## Latest delivered milestone —0.9.3

Windows immutableb1314ecccf863e4a0cb71e583a419acaff267805404321818ebc52da42c9913f
is published/opened. SharedSetup/AnimateHUD andallpriorbone/slot/draw/deform stay.
NewgroupedIK2axisBezier/Transform6mix/Physics7+Reset andEventdefinition/payload
tracks use native IDs/history/clipboard. SafePCM16WAV resources copyportably;
realWebAudio andforwardEventcrossings use timelineclock withoutCSP changes.
At this published checkpoint, typed Physics/nativeReplay exist but frontend
Animate Physics motion is not included; working0.9.4 above adds that bounded slice.

91/91LinuxUI,258JS+knownskip,249native/93legacy/46format, strictchecks and3actual
Windows groups/OSfolder+save lifecycle pass. Own116740 normalclosedclean. ONEnew
sourcec910 originalexport115048 verifies42keys/256numbers max3.34e-7 under5.1e-6;
documented omissiondefaults areseparate fromrawbitproof. No broadparityclaim.
Full91freshsource differs onlytypedidentity; no repeat. Mainreports
animation-constraints-events-{ui,delivery}-check andui-original-v2-check.

Normaluser107208/start2026-10-30T20:30:22.0565746Z/HWND37953114 isvisible/frontendready,
Ownedfalse/DoNotAutomate; transport19152 protected. Constraints.fbones +audio/tone.wav
showsnewtracks, witholderGeometry/Slots/Demo/Controls preserved. STATEowns exact
checks, retained failures/protection and the next reproducible action. The
working0.9.4 preview/freeze implementation above is awaiting its acceptance gates. Broader
Physics/resetall/RGB/alpha/TintBlack/advancedcontrols/mixing/onion remainACTIVE.

## Historical delivered milestone —0.9.0,2026-10-30

Windows image `3a395c8691bcb340ae977966ea6de0417f1ca2f4ee0f7da89a0a798cbe7e1c84`
was published in the shared WINDOWS_TEST folder at that checkpoint. Setup/Animate, named animation
management, all four bone channels, manual/Auto Key, Dopesheet/Graph, editable
Bezier tangents, key selection/move/delete/copy/paste, playback/loop/range,
stored FPS and a clean live Preview are connected to native history/persistence.
Region and weighted Mesh attachments follow the animated bones. Animate
Undo/Redo preserves surviving explicit bone selections after reopening a file.

Final checks:75/75 rebuilt Linux Playwright cases in84.278445s;234JS pass with
one existing Physics skip;214native pass/2ignored,93legacy pass/1ignored,
32format cases and strict Clippy/default/legacy/e2e-host/format profiles.
Two actual Windows WebView2 groups include OS SaveAs/Close/Open; a separate
GPU annex in the same process verifies Region/weighted Mesh pixels in viewport
and Preview. Own QA92700 closed normally, clean, without force. One new UI
sourcec948 was fully accepted/exported in exact original4.3.26 with independent
raw/runtime comparison. A separate combined-image source has checked original
JSON output but incomplete process/exit observation; do not promote it to a
fully observed original acceptance. See analysis/animation-{ui,delivery}-check.json
and animation-{ui-original,final-source-reuse,visual-demo-output}-check.json.

Normal Windows40348/start2026-10-30T16:53:30.6659036Z opened visibly with frontend
ready; ownership transferred to the user in .local/animation-user-process.json.
Never automate or close it. Optional Demo preload failed; Animate/Demo was not
verified in this normal window. Shared examples are EXAMPLES/Animate/Demo.fbones
(generated PNG plus weighted Mesh) and Controls.fbones (four channels/Bezier).

The next scope at this historical0.9.0 checkpoint was attachment/color, Draw
Order, deform, constraint/Event tracks and box selection. Those bounded milestones
were subsequently delivered through0.9.1–0.9.3; they are not current pending work.
Advanced timing tools, animation mixing, onion skin and broader timeline variants
remain open. Screenshots guide layout; complete UI/gesture parity has not been
established. Do not resume deferred F307/F308 probes for this task.

## Evidence and limits before implementation

- Before this task, `SceneProject` had no animation inventory. The canonical
  writer in `minimal.rs` creates one class18 animation named `animation`, with an
  empty field2. Scene decoding reconstructs setup data and requires complete
  reserialization equality. Unknown animation records remain inspection
  only; preserve that guard as the supported profile grows.
- DATA recovered raw records from retained own exact4.3.26 imported/exported
  animation fixtures, including existing carrier Translate keys. Raw frame30 maps
  to runtime1second in those fixtures. Reuse their binary/JSON evidence; do not
  repeat accepted original batches. Two new targeted own references additionally
  prove all four bone channels, project24FPS, absolute Bezier controls and mixed
  curve handle presence; see `../research/ANIMATION-DATA-4.3.26.md` for exact
  reports. Public runtime/docs are secondary evidence,
  not proof of the editor's complete binary or UI behavior.
- UI reference audit uses the user's `animare` screenshots: bottom Graph/Dopesheet
  tabs, frame ruler/playhead, transport/loop range and Animate transform key
  controls. Screenshots do not independently establish the patch version of every
  interaction. Record measured, documented and unknown gestures separately in
  `../research/ANIMATION-UI-4.3.26.md`; follow that audit before layout changes.

## Full feature scope

1. Setup/Animate switch; named animation create/select/rename/duplicate/delete;
   animation Tree state and editable channel capabilities. Setup authoring and
   sampled animation pose must remain separate.
2. Dopesheet with hierarchy/property rows, keys, ruler and current frame; scrub,
   pan/zoom, frame/time entry, selection, Ctrl/Shift groups, box selection, key
   insertion/update/delete, movement, copy/paste and grouped Undo/Redo. Inspect
   collision, same-frame replacement and clipboard rules before parity claims.
3. Playback, frame stepping, start/end, looping, range controls, speed and FPS
   semantics. Scrubbing/playback changes view state, not project history.
4. Manual transform keys and Auto Key integrated with real viewport gestures and
   exact numeric drafts. A completed gesture creates one native transaction;
   Escape cancels; Save flushes valid drafts and rejects invalid ones.
5. Bone Translate/Rotate/Scale/Shear timelines; linear/stepped/Bezier interpolation
   and Graph view handles after their data/semantics are recovered. Keep angle,
   negative-scale and before/after-key behavior explicit and tested.
6. Other timeline families now have bounded attachment/RGBA, Draw Order, Mesh/Clip
   deformation, constraint and Event profiles. Preserve their typed persistence,
   UI and comparison gates while expanding unsupported variants. Unsupported tracks stay inspection only;
   never strip them to make an animation editable.

## Current architecture and ownership

| Owner | Files and responsibility |
| --- | --- |
| DATA / codec | `crates/fbones-format/src/minimal/{scene.rs,scene_reader.rs,scene/write.rs,scene/validate.rs}` and new animation model/reader/writer/tests. Extend canonical Scene with typed animations; preserve old empty-project bytes and full equality, bounded reads, finite values, reference order and unknown rejection. No Tauri/runtime dependency. |
| Native Session | `src-tauri/src/{rig.rs,scene_edit.rs,scene_bridge.rs,project.rs,evaluation.rs,e2e_host.rs}` plus focused animation module/tests. Stable animation/key IDs in history, atomic validated edits, summaries, save/reopen, scratch animation sampling and frozen evaluation guards. No frontend or codec file edits. |
| Editor integration / root | `src/domain/project.ts`, new animation DTO/sample helpers, `src/services/desktop.ts`, `src/stores/workspace.ts`, `src/App.vue`, SceneTree/inspector/ProjectViewport integration and localization. Select/mode/time are view state; route real edits to native commands and reuse current field-draft/geometry-lease rules. |
| Timeline component | New scoped timeline/dopesheet/transport/graph components and timeline interaction helpers; props/events consume the agreed DTO. No project saving, direct IPC, second history store or independent persistence. Coordinator owns shared shell/layout integration. |

The current delivered DTO/model contains all four bone-channel tracks plus
separate typed slot, Draw Order, deform, constraint and Event tracks. Bone keys
retain `{frame:f32, values:[f32;2], curve}`; IK has two numeric axes and discrete
flags, Transform six Mix axes, Physics seven independent scalar properties and
Reset keys, and Events materialized payloads distinct from definition defaults.
Session assigns stable animation/key IDs independently of array indices across
all families. Broader unrepresented variants remain inspection only. Preserve the
canonical initial empty animation. API key positions
are **frames**, preserving raw f32 bits; evaluation time remains seconds. Thirty
FPS is the default; project24/30FPS encoding is directly proven. Native
`setAnimationFps` accepts finite1..240 as an explicit FBones authoring policy,
preserving key/control frame bits while changing real-time duration.

Native history already snapshots `SceneFrame.project` and stable IDs; extend that
single history path. `ProjectSummary` now includes typed clips/keys, capabilities
and stored FPS; Vue does not parse saved binaries. `save_snapshot` revision
checks, native bundle saving and inspection-only
copy behavior remain authoritative.

`EvaluationRequest` already separates mode/time from authoring and caches precise
pose epochs. Selected animation identity now samples into scratch local
poses **before** existing constraint evaluation, and expose sampled local bones
alongside existing world matrices. Validate document/revision/animation/time when
freezing geometry; never write sampled values into Setup bones. Native animation
batch commands must commit all-or-nothing with one history action.

The existing `ScenePreview` remains fixed60Hz Setup Physics replay. Working
`AnimationPhysicsPreview` separately owns timeline evaluation, sharing the same
solver and samplers rather than duplicating spring arithmetic. Cache immutable
clip/scene data per revision for frontend interpolation
and render locally, sharing tested sampling semantics with native freeze/evaluate.
Do not add per-frame full-scene IPC. Native evaluation is authoritative for edits
and persistence; the timeline does not infer the unresolved original Physics
export clock. Animate Physics seeking can remain explicitly bounded while F307
stays pending.

Implemented native safeguards and explicit FBones policies:

- One atomic command/history entry creates or updates many bone/channel keys.
  Stable IDs survive Undo/Redo; duplication allocates fresh clip/key IDs. Imported
  duplicate frames are retained and sample the last equal key; an explicit
  selected `keyId` edits that earlier duplicate without changing the others.
- Key authoring can require a frozen pose epoch bound to document, revision,
  animation and frame. Private replay continuation also binds stored FPS and the
  clip. A temporary complete `animationPose` supports an unkeyed working pose
  during native gesture freeze, never persistence or Setup authoring.
- Translate/Rotate/Shear add Setup values; Scale multiplies them. Sampling holds
  Setup before the first key and the last key afterward. Linear interpolation
  promotes frame endpoints before subtraction; absolute Bezier X is inverted
  with48 bounded bisection iterations. This matches the shared frontend sampler;
  it is not proof of the unresolved original Physics export clock.
- Native key movement shifts outgoing/incoming handle X with their endpoint.
  An insertion/deletion that changes a surviving Bezier segment's neighbor
  rejects atomically unless its curve is explicitly supplied; no silent clamp
  or linearization. Duplicate-name rejection, move collisions,1..240FPS and
  these editing rules are FBones policies, not measured original gestures.
- Complete profile equality, typed references and unknown-data rejection remain
  required. Unknown/global Physics/ResetAll and broader unmodeled timelines remain inspection-only.

## Historical first vertical slice and staged acceptance

These foundational bone-animation stages are delivered. New bounded profiles
retain the same safeguards; the current0.9.4 gate status is recorded above.

**A — typed evidence and codec.** Named animations and all four bone channels,
linear/stepped/Bezier and stored FPS are implemented from exact references. Assert full
roundtrip equality, exact time/value bits, references and curve tags; reject
unknown/malformed/nonfinite/duplicate-invalid records atomically. Existing Setup
fixtures remain byte-compatible. No custom JSON/opaque animation container.

**B — real native authoring.** Create/rename/duplicate/delete animation; insert/update and
atomic multi-bone key batches, delete/move keys with stable IDs and Undo/Redo.
Sample all four bone channels while preserving all Setup bits, attachments, weights and
constraint data. Validate empty/nonexistent/stale selections, ordering and time
bounds; no-op behavior must be explicit. Native Save/Close/Open restores clips
and keys. Unsupported channels cannot mutate Setup accidentally.

**C — connected Animate UI.** Show the referenced bottom Dopesheet/Graph structure
with working selected animation, four bone channel rows, frame ruler, playhead, key
buttons, scrub and transport. Real viewport/numeric edits plus Auto Key author
native keys; no mocked diamonds or pretend playback. Extend graph/other channel
controls when their behavior is real; keep unsupported actions clearly disabled.
Verify keyboard focus, Escape, multi-select/key drag/history and resized layout.

**D — comparison and delivery.** Ubuntu Playwright uses actual mouse/keyboard and
an isolated real Rust Session: create clip, set two different Translate poses,
key, scrub/play, move/delete keys, Undo/Redo, Save/Close/Open and compare exact
stored bits plus sampled poses. Test production CSP and stale/cancel behavior.
After source checks pass, one NEW UI-authored file must be accepted/exported by
original Windows4.3.26 with independent timeline/pose comparison; targeted native
WebView2/OS save testing proves the delivery. Root alone operates fresh own
original/QA instances after isolation, never personal windows. Linux UI tests
alone do not prove Windows/native GTK/macOS or full animation/Physics parity.

Expand subsequent channels/Graph and other timeline types through the same
persist/evaluate/UI/original gates. Keep this task active until the full declared
scope is handled; label each delivered profile and remaining gap explicitly.
