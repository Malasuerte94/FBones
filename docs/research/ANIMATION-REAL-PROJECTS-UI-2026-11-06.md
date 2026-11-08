# Animation workflow UI audit — 2026-11-06

Recorded before dependent fixes. Scope: existing Animate workflows needed when
testing real projects; no original editor/user window was operated. Existing
evidence was read in `ANIMATION-UI-4.3.26.md`, `STATE.md`, F105 and `TESTING.md`.
All four supplied `animare/` images were viewed again. They directly show the
compact shared transform HUD, bottom Dopesheet/Graph, colored tracks, ruler and
Loop Start/End fields. Static images do not prove the editor's patch version or
pointer/playback/invalid-input behavior.

## Findings before coding

| Finding | Evidence and boundary | Proposed correction |
| --- | --- | --- |
| Timeline key drag, marquee and Graph tangent drag are canceled as playback advances. | Source-proven path: `AnimationTimeline.vue` starts these gestures without `pause`; the `currentFrame` watcher cancels every active gesture. The workspace clock advances that prop during Play. Current UI reproduction remains pending. | Explicit FBones policy: accepted pointer edits pause transport before gesture setup, preserving the current sampled frame and one completed mutation. Escape continues canceling; panning remains view-only. |
| Loop fields can display bounds different from the actual playback range. | Source-proven: `changeLoop` mutates local refs before emitting; `setAnimationLoopRange` rejects end ≤ start without returning new props. The component has no range props. Toggling Setup/Animate destroys those refs while the workspace range survives. | Make accepted bounds controlled props from the workspace. Validate the candidate whole range before emission, restore rejected input, and support Enter/Escape. Keep these view settings outside authoring/history. |
| Play from before a selected loop start dispatches events outside the range. | Direct own composable probe: accept range10–20, seek0, Play reports frame0/event0, next0.1s gives frame3 at30FPS. No original parity inference. | Coordinate DATA/transport policy: normalize an out-of-range starting playhead before event dispatch. UI regression must observe actual range and events, not field text alone. |

Existing historical95-case results establish prior coverage, not a fresh passing
run. Current relevant source tests cover normal key drag, Escape, basic playback
and loop events from a playhead already inside the loop; they do not cover these
reported combinations. The coordinator owns the fresh full run.

## Implementation/verification contract

Preserve the supplied geometry and existing toolbar order. Reuse typed
Composition API props/emits, `label()` translations/fallbacks, compact native
inputs and existing tokens; no new UI framework or persistence engine. The
Vue frontend skill was read for these patterns; user-required Spine-like styling
takes precedence over its generic spacing/rounding examples.

Focused real-Rust UI checks should establish: loop fields match accepted bounds
after invalid edits, clip change and Setup/Animate remount; playback starts in
range; pointer key/Graph/box gestures begun during Play pause and remain active
until release, produce at most one native history action, preserve Setup and
retain Escape cancellation. These tests do not prove original Spine gestures,
native OS routing or full compatibility. Real-project opening remains a separate
DATA/native boundary; never enable editing by dropping unsupported records.

## Real-project import gate

Existing unsupported sources must keep their honest inspection-only state and
original layout. If DATA establishes a complete typed project and exact canonical
reserialization equality (including its observed owner/track order), the existing
rendering, timeline and edit controls should become available through the current
capabilities; do not invent a second import UI or flatten the project. This is a
workflow gate for the Paylines ordering candidate, not proof that its rendering,
edits or original-editor persistence work. Those require current native/UI and
independent original-reference checks. The codec must retain unknown rejection.

## Working correction and pending verification

The timeline now receives accepted `loopStart`/`loopEnd` props, restores rejected
drafts, supports Enter/Escape and pauses before key/marquee/Graph/deform pointer
gestures. `animationPlayback.ts` shares whole-range validation; explicit endpoints
are bounded to the existing0–1,000,000-frame seek policy and null bounds use the
clip's actual start/end. Both null remain valid for clearing an empty clip.
Parent transport/wiring is coordinator-owned.

Three focused tests in `animation-playback-workflow.native.spec.ts` cover range
rejection/remount/clip synchronization and lower-bound Play, a key drag with one
history action plus canceled marquee, and canceled then committed Graph tangents
begun during Play. They use controlled browser RAF and the real Rust Session;
no fixture invokes the operations under test directly. At this checkpoint these
UI tests are **written, not run**: coordinator reports server listen and browser
launch EPERM in the current sandbox. Source typechecking and any alternative
verification are recorded by the coordinator; no current UI/platform pass is
claimed here.

The fallback `animation-timeline-controls.test.mjs` compiles the actual Vue
Timeline and connects it to the production animation composable through a custom
host. Four cases pass in the final complete270-pass JavaScript run: controlled
loop drafts/remount/clip changes; pause before key drag with one command intent
and Escape cancellation; Graph cancel/commit with untouched sibling controls;
and explicit-frame invalidation/disabled guards. Host events and geometry are
synthetic and edits are collected intents, so this does not establish browser
layout/input, native history, file persistence or original gesture parity. The
three real-Rust browser cases remain pending; strict test TypeScript passes.
