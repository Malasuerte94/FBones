# Animate Physics preview — bounded integration plan

2026-10-30. Next-profile plan only. The current0.9.3 constraint/Event/audio
delivery gates finish before dependent product changes. No original/Windows
operations, new observer route, solver arithmetic or Physics phase experiments
were performed for this note. F307 remains deferred.

## Current directly inspected behavior

`workspace.publishAnimationPose` and `previewBonePose` currently use the shared
TS solver with a fresh `PhysicsState` and `type:'none'`. IK/Transform reflect
sampled coefficients; dynamic Physics does not advance. `simulationRunning`
explicitly selects Setup. `useAnimationWorkspace.advanceAnimation` changes a
timeline frame and fires typed Events; it does not currently own spring state.
Do not describe stored Physics keys or sampled numbers as animated dynamics.

The existing native `evaluation::evaluate_animation` Replay path already
samples authored bones and typed constraint coefficients on its fixed60Hz
steps. It preserves authored constraint layout for spring reset detection and
uses borrowed f64 numeric overrides for application. The new native replay test
matches an independently driven sequence of those same own solver calls; it is
not original Spine phase/numerical proof. Existing native tick scheduling uses
`tick_floor=(time*60+1e-7).floor()` and a nearest-tick tolerance of1e-7 in
`tick_ceil`. Preserve this scheduling convention when matching its replay.

The TS `PhysicsState.prepare` still hashes the entire supplied constraint
vector. Substituting animated coefficients into that vector every frame would
reset its springs on every change. A TS sampled-value overlay must separate
authored layout identity from application coefficients, as the native path now
does. Default Setup evaluation must remain unchanged.

## Proposed pure runtime contract

Add `src/domain/animationPreview.ts`, separate from Setup's `ScenePreview` and
from the Vue workspace. The class receives immutable Setup bones/constraints,
the selected typed clip and canonical f32 FPS; it returns the shared solver's
`Evaluation`. The store supplies document/clip/authoring identity and handles
selection/history/leases. No browser globals, files, IPC or project writes
belong in the class.

Tentative API before implementation:

```ts
configure({setupBones, setupConstraints, clip, fps}): void
seek(frame): Evaluation
advanceTo(frame): Evaluation
pose({bones?, constraintPose?}): Evaluation
reset(): void
readonly frame: number
readonly evaluation: Evaluation
```

Frame-to-seconds conversion is `frame / Math.fround(fps)`. All key frame/value
origins are normalized from stored f32 exactly as in current native/TS samplers;
interpolation and solver application remain f64. Reuse existing samplers and
Physics arithmetic. Do not introduce a second spring engine or fixed elapsed
clock unrelated to the timeline.

The critical invariant is **commit only complete60Hz steps**. A RAF endpoint
usually falls between steps. Render its final fractional update on a clone of
the committed state; the next RAF must discard that temporary fractional state
and advance the committed full-step state. Otherwise frame rate changes the
anchor/inertia sequence, and a native replay freeze jumps even when both paths
use nominally identical spring math. Use the native tick-ceiling convention to
decide whether a fractional update exists, including its tiny boundary window;
never commit a step whose absolute time exceeds the requested target.

| Action | Proposed first-profile runtime policy |
| --- | --- |
| Advance | Sample saved keys at every existing scheduled step; one fractional scratch result for presentation. |
| Seek/backward | Reconstruct from the clip's zero-time reset to the target; no hidden elapsed clock. |
| Pause | Keep the exact requested time and displayed state; redraw/hover/camera does not advance it. |
| Working draft | Apply a final Pose-only scratch evaluation using current transient bones/coefficients; do not integrate the draft through preceding history. |
| Physics Reset key | Native FBones crossing rule `(previous,current]`, with zero included only on initial Reset. |
| Loop | Deterministically reconstruct the saved prefix to loop start; no claim of original warm/continuous loop dynamics. |
| Simulate off | Keep the user's explicit intent; static typed pose/IK/Transform remain available without advancing Physics. |

These are proposed FBones preview policies, not measurements of exact Spine
Animate Simulate/Deterministic behavior. The UI audit and root must settle their
presentation before implementation. Setup's default live parent/gravity flow
and existing explicit-off persistence remain unchanged.

## Native freeze gates before real vertex/bone authoring

The current Animate freeze uses native None, which would discard future dynamic
preview state and visibly jump at pointer-down. A dynamic gesture instead needs
the same saved-key Replay result at its exact time, then the existing precise
snapshot/epoch authoring path. Preserve revision/document/clip/frame/FPS/draft
generation guards, one history entry and no IPC per pointer frame.

Two concrete current API restrictions must be addressed explicitly:

1. `deformTargets` currently accepts only None-mode freezes. Dynamic Replay
   freezes must permit the same bounded selected/keyed geometry request so a
   first unkeyed Mesh/Clip gesture gets precise native vertices. This must not
   become default all-inventory allocation or per-frame geometry IPC.
2. Temporary `animationPose`, `constraintPose`, draw/deform overrides currently
   accept None only. For dynamic drafts, replay saved history first, then apply
   the transient working pose as a final Pose-only scratch evaluation at the
   endpoint. Applying the final draft to every preceding Replay tick would
   produce a different history. Preserve existing negative-zero carriers and
   cache the effective f64 draft bits before publishing the geometry epoch.

Those are API/continuity changes, not serialization changes. A bounded first
profile can replay from zero for at most120seconds/7200steps, matching the
existing native request guard. A target outside that supported preview window
must report the limit without silently displaying static Physics as simulated.
Longer authored animations remain valid data. Do not build a new checkpoint
framework before this small visible slice passes.

For later long playback, only an exact complete-step checkpoint is safe for
continuation; a fractional public gesture snapshot already includes scratch
integration. The current native Session stores one evaluation, and the private
continuation layout includes geometry target sets. A fractional/extra-target
freeze can therefore replace/invalidate the old checkpoint. A future bounded
retained full-step lease requires its own reviewed contract; do not assume old
`fromPoseEpoch` remains usable after every geometry freeze.

## Ownership and acceptance

One worker owns the pure AnimationPreview class and focused schedule/state
tests; the native worker owns any explicit freeze restrictions/overlay adapters;
root owns the thin timeline/store/Play/Simulate integration. Paired DATA/UI
audits precede dependent code. Reuse current serializer evidence and own native
replay tests; no completed original batch or failed observer probe is repeated.

Required first-slice checks are:

- Two different RAF schedules produce the same world matrices at common times,
  including fractional endpoints, exact/near60Hz boundaries, FPS24 and30.
- TS and native Replay agree for one own moving-parent clip, nonconstant Physics
  coefficients and a discrete Reset key at sampled full/fractional times. This
  is agreement between our engines, not exact original dynamics parity.
- Pause/seek/loop/explicit-off and hidden-view holds do not advance accidentally;
  Event/audio firing remains the existing separate bounded timeline output.
- Real UI parent/vertex gestures freeze without a jump, including Auto Key-off
  drafts; stale async replies cannot publish an old pose, and completed drags
  still author one non-baked key transaction.
- Native Save/Close/Open preserves every Setup field, key and resource; clocks,
  velocity, replay state and preview working values remain transient.

The0.9.3 audio reset reservation and Event-batch resource fixes are independent
guards: pending decode reservations must survive document resets until their
own work finishes, and one timeline advance must collect at most4096 Event
actions before any frame publication or dispatch. These controls must not be
used as evidence of future Physics dynamics.

## Authorized0.9.4 implementation checkpoint

The proposal above is historical. Paired DATA/UI gates authorized the bounded
implementation after0.9.3 publication. The implemented module is
`src/domain/animationPhysicsPreview.ts`, with this released API:

```ts
configure({setupBones, setupConstraints, clip, fps, simulate?}): void
seek(frame): Evaluation
advanceTo(frame): Evaluation
pose(endpointBoneDraft?, constraintDraft?): Evaluation
readonly frame: Evaluation
readonly localBones: BoneView[]
readonly time: number
readonly animationFrame: number
```

`simulate` defaults true; callers select None when Simulate is off or no Physics
constraint exists. No-draft `pose()` returns the clean endpoint directly, without
an additional Pose application. Private Setup clones recover only stored f32
solver inputs; endpoint drafts preserve nonzero f64 precision. Stable IDs and
editor bit/derived metadata are not quantized. Bone negative-zero JSON transport
remains a preexisting limit; constraint/deform negative-zero carriers remain in
use. No Event/audio output or second clock was added to the class.

Native Replay now allows selected-animation endpoint bone/constraint/draw/deform
drafts and explicit sparse geometry targets. It first samples saved history,
then applies actual bone/constraint drafts once in Pose mode. Historical Reset
and Update calls never receive endpoint constraint overrides. Missing animation,
recorded Setup motion, incompatible modes and temporary-pose checkpoint reuse
still reject. Existing public revision/epoch guards are unchanged; the store
also invalidates its current lease when the desired Replay/None context changes.

The completed-tick floor is corrected separately from native tick-ceiling's
existing nearest-boundary window. Multiplication can round
`nextDown(23/60)*60` to23 even though tick23 lies after that timestamp; the floor
checks the candidate's actual `tick/60` and moves it down when necessary. Tests
cover IEEE neighbors at all7200 first-profile boundaries and Setup recorded
motion continuing at tick23 from that fractional checkpoint. Spring arithmetic,
solver epsilon and ordinary Setup preview scheduling remain unchanged.

At this checkpoint five new native tests pass with the254-pass/two-ignore
baseline; five class tests plus eleven existing ScenePreview regressions pass.
The class tests include default1/60 and1/64 Physics steps, FPS24/30, fractional
schedule invariance, precise one-Pose drafts, Reset and atomic120-second bounds.
Independent native/TS comparison, real UI integration and delivery checks remain
root-operated gates. These tests establish FBones engine behavior; F307 exact
Spine dynamics/phase parity stays pending.
