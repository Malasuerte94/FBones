# F307 live Setup physics: DATA gate

2026-10-29. User explicitly requests physics/gravity to react by default while
moving the parent in Setup, without first pressing Run/Play. This is a live
editor interaction requirement, separate from the unresolved exported-frame
solver phase. No original command/input or production change by this worker.

## Evidence order and limits

**Exact4.3.26 evidence reused:** the accepted own
`feature-ui/physics-inspector-observed.png`, documented in
[FEATURE-UI-4.3.26.md](FEATURE-UI-4.3.26.md), shows the Setup Physics inspector
with Simulate enabled, Deterministic disabled and separate Reset/Reset All.
A selected enabled checkbox is not proof of the default for every fresh
project, nor of a captured original parent-drag trajectory. Existing exact
numeric exports separately prove immediate inertia compensation versus later
restoration; they are not live-editor/default-mode proofs.

**Documented:** the current primary
[Physics / Simulate](https://en.esotericsoftware.com/spine-physics-constraints#Simulate)
guide describes enabling all simulations for the skeleton. Deterministic is
specifically an Animate-mode replay choice. Its FPS/Inertia sections separate
continuous motion compensation from fixed force ticks. Those descriptions
support live Setup behavior but are patch-unpinned. The new user requirement
settles FBones' default-on policy even where exact original default persistence
has not been measured. Do not label the existing approximate dynamics as full
original gravity/phase parity.

## Current source explains the missing interaction

- `src/stores/workspace.ts`: `simulationRunning` starts false;
  `resetSimulation()` sets it false on initial/open/constraint-layout changes.
  `advanceSimulation()` returns unless it is true. Thus adding Physics or
  reopening a project requires Run before any time advances.
- `src/domain/scenePreview.ts`: `previewBones()` records the current transient
  bone draft but evaluates a cloned Physics state in **pose-only** mode. That
  applies the existing offset; it does not observe new inertia/advance forces.
  The next `step()` is what observes the draft and records its motion tick.
- `ProjectViewport.vue` schedules time only while `simulationRunning` is true.
  `createViewport.ts` already leaves bone gestures unpaused and feeds draft
  bones; non-bone geometry gestures suspend simulation. This is useful existing
  plumbing, not a need for native authoring edits every pointer frame.
- The workspace revision watcher uses compatible `ScenePreview.adopt()` to
  retain physical state across completed bone pose edits. Changed constraint
  arrays, bone topology/count/length or document identity reset it instead.

## Concrete native/frontend contract before implementation

1. For an editable document containing Physics, **Simulate intent is enabled by
   default**. Parent translation/rotation in Setup feeds the live local draft
   into the existing preview ticks and continues relaxing after pointer-up.
   Run/Play cannot be a prerequisite. Explicit user Pause/Simulate-off is a
   separate deliberate intent and remains respected; this is session UI state
   until exact original persistence is known. No format field is invented.
2. Authored bones/constraint settings are authoritative project data; evaluated
   matrices and physical offsets/velocity/time are transient. Merely ticking,
   settling, hovering or resetting preview creates no project mutation, dirty
   revision, undo item or timeline key. A completed parent drag still commits
   exactly one authoring command/Undo item. Cancel restores authoring while
   any visible physical response remains transient.
3. Preserve the existing local-preview path: no full-scene/native IPC per
   frame. Bone draft ticks, final compatible adoption and native frozen replay
   must use the **same recorded local-pose history**. Do not reconstruct a live
   deformed gesture by replaying only the final static setup.
4. Geometry/binding/weight/trace editing freezes one native-published f32 pose
   epoch and uses those exact matrices throughout the gesture. Pending native
   snapshot requests, modal/busy state and document changes cannot advance or
   mix a different pose into that epoch. Release resumes the prior live intent;
   explicit Pause cannot be undone accidentally by ending a gesture. Failed or
   stale snapshots remain atomic and leave authoring/history untouched.
5. Visibility loss/modal/busy holds should suspend elapsed catch-up, not enqueue
   a huge hidden wall-time delta. On return, only permitted live intent resumes.
   New/open/document or incompatible topology/constraint changes reset the
   transient physical state, with default-on behavior applied deliberately.

## Material lifecycle guard: default-on must not fail after two minutes

Current `ScenePreview.step()` throws at7200ticks/120seconds, and motion storage
is bounded to262144 local poses. Native replay independently rejects time>120,
>7200changes or an excessive pose budget. Merely changing false→true will make
an idle editor hit an automatic two-minute simulation error; that error also
disables viewport editing. This is unacceptable for default-live behavior.

Choose and record a bounded continuous-live history/checkpoint policy before
implementation. A silent history discard followed by replay from the current
static setup loses velocity/offset and can make the next geometry gesture jump.
Keeping native replay limits is valid; unbounded memory/time is not a solution.
If a bounded explicit transient reset/rebase is chosen instead of exact state
checkpointing, classify that FBones lifecycle policy and verify its visible
boundary rather than claim it preserves an arbitrary moving state exactly.

## Required interaction/persistence checks

A fresh Physics setup must react during an actual parent drag **without Run**,
continue relaxing after release, and preserve authored child/settings. Verify
one Undo/Redo, Cancel, explicit Pause/Step/Reset, document/visibility transitions,
no dirty/revision changes from time alone, and unchanged Save/Close/Open data.
Freeze a deformed pose for one geometry gesture and verify no pose jump plus
stale/failure atomicity. Exercise the live-history boundary beyond120seconds
and the pose budget deliberately; do not just test a short ideal drag. Existing
exported-frame phase mismatch remains an independent F307 limitation.
