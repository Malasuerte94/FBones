# Physics in live Setup: UI/interaction gate

2026-10-29. Priority steering from the user: gravity/physics must respond while
moving a parent in ordinary Setup, **without pressing Play or Run**. This is
an explicit product requirement. No new original command, original GUI input,
protected-window action or production edit was performed by this UI worker.

## Exact4.3.26 evidence already available

Privately viewed again before this handoff:

- `feature-ui/physics-default-inspector-observed.png` and its
  `physics-default-observed.json`: dedicated original4.3.26 session, synthetic
  targeted background control observation, own source hash
  `570bb64418d468e36a65f3543c00d36b8b92a6e10a814c706dbdd5bbc20570ec`,
  authored bytes unchanged. The application visibly says **SETUP**, the Physics
  inspector shows a blue **Simulate** toggle, **Deterministic** unchecked, then
  **Reset** and **Reset All**. FPS60 is in Setup; Preview is a separate panel.
- `feature-ui/physics-inspector-observed.png`: the same enabled Simulate /
  unchecked Deterministic layout in Setup with configured numeric channels.
- `FEATURE-UI-4.3.26.md`, especially the existing inspector-observation section,
  explicitly states that this capture did **not** measure live simulation.

**Proven:** these controls, their separation and enabled state in the captured
Setup session. **Not proven:** clean-preferences factory default, original
pointer-drag response curves, exact reset/selection/save lifecycle or runtime
integration timing. An enabled blue button in a still image cannot prove a
moving child's response. No older editor version is used to fill those gaps.

## Primary documentation fallback

Rechecked the current official
[Physics guide](https://en.esotericsoftware.com/spine-physics-constraints)
on2026-10-29; it is patch-unpinned, not independent exact4.3.26 proof.
[Simulate](https://en.esotericsoftware.com/spine-physics-constraints#Simulate)
applies to the skeleton's simulations. [FPS](https://en.esotericsoftware.com/spine-physics-constraints#FPS)
separates continuous motion/inertia adjustment from fixed-rate force updates.
[Inertia](https://en.esotericsoftware.com/spine-physics-constraints#Inertia)
describes resistance to movement;
[Gravity](https://en.esotericsoftware.com/spine-physics-constraints#Gravity)
is a world-Y force. [Deterministic](https://en.esotericsoftware.com/spine-physics-constraints#Deterministic)
specifically discusses Animate-mode replay, not a prerequisite Play button for
Setup. [Reset](https://en.esotericsoftware.com/spine-physics-constraints#Reset)
and Reset All clear current or project-wide physics state respectively.

This supports a live Setup interpretation. The user's explicit no-Run behavior
settles the desired default even though the capture does not prove a factory
default. Do not generalize the unresolved export clock investigation into an
excuse to require manual Run for this interaction.

## Current FBones gap, from source inspection

- `src/stores/workspace.ts`: simulationRunning starts false; resetSimulation
  also sets it false. advanceSimulation returns immediately unless running.
- `ProjectViewport.vue`: requestAnimationFrame calls advanceSimulation only
  when simulationRunning is true. Thus an untouched Setup session never steps.
- `ScenePreview.previewBones` records a draft and evaluates type:'pose' against
  a cloned PhysicsState. That gives geometric feedback but, without subsequent
  steps, cannot generate evolving inertia/gravity response.
- `createViewport.ts` pointerdown pauses/prepares frozen geometry only for
  **mode other than bones**. Bone drags already avoid that blanket pause.
  Do not describe this as all drags being paused.
- Compatible same-document bone commits already call ScenePreview.adopt, which
  preserves the live state. Incompatible scene changes reset it deliberately.
- freezePose pauses and obtains an authoritative native evaluated pose for
  geometry/binding/mesh edits. Its persistence/poseEpoch safety is separate from
  ordinary bone manipulation; removing all freezes would risk authored geometry.
- PhysicsPreviewControls currently presents Run/Pause, Step and Reset as a
  manually started preview. It must no longer imply Run is required for Setup.

## Bounded implementation and interaction contract

These are explicit FBones policies derived from the user's requirement and the
evidence above, **not claims of exact original timing parity**:

1. A supported Physics constraint in editable Setup receives a live simulation
   by default. Parent translation/rotation through actual viewport input feeds
   draft authored bones to the evolving preview; the child can lag, restore and
   respond to nonzero gravity without clicking Run or an animation timeline.
2. Simulate is a visible skeleton-wide enable/disable control, distinct from
   animation transport. Disabling it stops realtime stepping predictably;
   explicit reset discards offsets/velocity without silently disabling the
   user's enabled live mode. Exact original reset lifecycle remains unobserved.
3. Physics evaluation changes render pose, not authored bone fields, revision,
   dirty state, selection, attachment activation or undo history. A completed
   parent drag still creates one authored edit/history entry. Undo/redo and
   document changes must not carry stale simulation state into another scene.
4. Existing native frozen-geometry safety remains for binding, mesh/clip edits
   and persistence. Any suspension/resumption must have a clear state transition;
   freezing one geometry gesture must not permanently require Run afterward.
5. Avoid simulation drift while the page is hidden, an operation is busy or a
   modal/unsafe geometry gesture owns the pose. Resume according to the enabled
   Setup policy with bounded elapsed time, rather than accumulating wall-time
   catch-up across hidden windows.

No UI worker product files are owned for this handoff; root coordinates source
changes. No new Match or clock experiment is required before fixing the proved
default-inactive UI path. A fresh original own-instance drag probe would improve
exact response evidence if needed, but is not claimed by this memo.

## Required actual acceptance

Use a fresh native-owned fixture with a parent and length-positive constrained
child, affected channels nonzero, nonzero gravity/strength and valid mass.
Do not press Run. Drag only the parent with real pointer input: assert authored
parent motion, render-child response during the hold and settling after release.
Compare against a Simulate-off or zero-effect control to distinguish physics
from ordinary inherited movement. Assert no idle native authored edit/revision
and exactly one completed-drag undo entry. Verify disabling/resetting/re-enabling,
unrelated selection, save/reopen, document replacement and frozen geometry
recovery. These checks prove the new FBones interaction; they cannot establish
unmeasured exact original spring curves.
