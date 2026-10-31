# F307 next source audit: scheduler boundary still unresolved

2026-10-29. Read-only inspection of current source and existing evidence,
plus two pinned public4.3 source pages. No original commands or window inputs,
new PNGs, old-image extraction, spring/model run, production edit, test runner,
parameter search or changed bound. Protected user applications were untouched.

## Result

**No new evidence-backed force/state-assignment correction was recovered.**
The remaining known structural difference is outside the spring operator:
FBones Setup replay is explicitly60Hz; original export is sensitive to another
constraint's90Hz setting. The accepted highest-FPS experiment proves that
coupling, but all four proposed caller clocks and the two subsequent stage
operators failed. Merely switching the caller to highest FPS cannot be
presented as a recovered numerical fix.

Do not replace the previous raw translation anchor with the previous physically
evaluated position. That proposed state change would contradict the existing
zero-strength correction control even before considering restoration timing.

## Evidence reused

- Current `STATE.md`, `TASKS.md` and `tasks/F307-physics.md`: default-live Setup
  interaction is delivered, while exact export-phase parity remains active.
- [Full-scene highest-FPS plan](PHYSICS-HIGHEST-FPS-FULL-SCENE-PREDICTIONS.md),
  [independent source/measurement check](../../analysis/physics-highest-fps-reference-check.json),
  and [stage-order rejection](PHYSICS-REPLAY-STAGE-ORDER-HANDOFF.md).
  Old source `917c2f31…3158a4d4` and new source `9b0d39df…d487887` retain all
  five animations; only the inert control step changes60→90. The three other
  constraints stay60. Control/correction remain exact; restoring outputs change.
- Local pinned public4.3 `official-secondary/PhysicsConstraint.ts` and
  `BonePose.ts`, previously identified in
  [solver research](CONSTRAINT-SOLVERS-4.3.26.md).
- New read-only primary checks at the **same pinned public commit**
  `ee2a10936a103ac187d74f7709f855653e923eae`:
  [PhysicsConstraint.java](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-libgdx/spine-libgdx/src/com/esotericsoftware/spine/PhysicsConstraint.java)
  and
  [Skeleton.java](https://github.com/EsotericSoftware/spine-runtimes/blob/ee2a10936a103ac187d74f7709f855653e923eae/spine-libgdx/spine-libgdx/src/com/esotericsoftware/spine/Skeleton.java).
  Browser open/find only, no original installed application interaction.
  Public runtime4.3 is secondary to the installed4.3.26 observations; it is
  not proprietary editor/exporter implementation proof.

## State-assignment comparison

The pinned public Physics implementation keeps distinct raw-motion anchors,
post-translation origins and tip vectors. Raw anchors supply translation
inertia; origin/tip history participates in angular/scale response. The reset
path seeds anchors without force integration; Pose applies current state
without advancing history. These distinctions also appear in the local TS
reference. This is source evidence, not new exact-editor observation.

Current independently written native `solve/physics.rs` and TS
`domain/solve/physics.ts` follow that separation: `anchor`, `origin`, `tip`,
oscillator position/velocity/lag and per-constraint remainder. Translation
correction happens before fixed force integration; visible lag interpolation
follows; origin/tip are retained for the other enabled channels. No differing
Rust/TS assignment in the translation-only measured branch was found.

The existing four-lane scenes enable X translation only. Angular and scale
channels do not execute. Therefore differences in previous post-translation
origin, tip, reflection/shear decomposition or angular lag cannot explain
their measured restoring-X phase. Those may be separate coverage gaps, but
they are not a discriminating explanation for this source.

### A prior physically evaluated anchor contradicts the correction lane

This is an algebraic consequence of the **already measured** inertia1,
strength0, force0 control, not a new fitted model:

1. Carrier goes0→80. Raw-anchor correction is−80, so child world remains0.
2. Carrier stays80. The proper raw anchor is now80: next correction0, child
   stays0, as observed.
3. If history instead stored the previous evaluated child world0 as the
   translation anchor, the next correction would again be−80. Accumulated
   offset would become−160 and the child world would become−80.

The accepted plateau rules out that particular replacement. It does not expose
an exporter's hidden sampling time, final Pose stage or intermediate replay
calls. Visible measured parent agreement alone never proved those internals.

## Where a scheduler is—and is not—specified

Public Skeleton resets constrained pose caches for world evaluation and walks
the update cache; its time increment takes a caller-provided delta. It does
not implement an export-to-current-frame/highest-FPS replay scheduler. Thus
reading this file supplies no recovered original outer clock. The version-
unpinned [Simulate guide](https://en.esotericsoftware.com/spine-physics-constraints#Simulate)
describes highest-rate per-frame replay; the paired existing gates already
classify that as documentation rather than exact4.3.26 call-order proof.

Current FBones caller sites are explicit: `ScenePreview.step()` uses absolute
`(tick+1)/60`; workspace live accumulation uses1/60; native evaluation replays
absolute `tick/60`. Each constraint then consumes its own stored force step.
This bounded Setup policy keeps frontend/native freeze and checkpoint history
consistent. It is not the recovered exporter. Changing those callers would
also change motion recording/checkpoints and needs a separately specified
contract; it is not a one-line force-law correction.

## Do not reopen already rejected arithmetic branches

Public fixed-step processing consumes a per-constraint remainder, while the
current model counts steps with a quotient and the recorded boundary guard.
This source distinction alone is not a recovered explanation. Both max60
and max90 proposals use outer intervals around one force step or less for
the restoring60Hz lanes. Floating boundary remainders can still affect counts,
so quotient/subtraction equivalence must not be assumed. No new exact-editor
observation identifies this operation as the missing branch. The earlier90
strict-count variants already failed and the latest two stage-order candidates
explicitly stopped.
No new epsilon, rounding, startup delay or clock grid follows from this audit.

## Next discriminator / stop condition

No new original render or alternate numeric model is justified **by the new
source inspection alone**. A useful next gate would need new evidence of the
export caller's actual update/reset/Pose ordering or directly observable
replay boundaries, rather than another oscillator coefficient/anchor guess.
Neither the local exact-editor evidence nor these public files supplies it.
Do not infer that such instrumentation is available or modify the original
application to obtain it.

If the coordinator later obtains a concrete scheduler observation through an
authorized own fixture, freeze exactly one resulting caller contract before
comparing both existing60/90 sources and all five animations, with the same
.25 residual bound and control/correction invariants. Reuse measurements;
do not rerender the600 accepted frames. Without that new discriminator,
retain the explicit unresolved F307 status and the current tested Setup
implementation. This audit authorizes no production change.
