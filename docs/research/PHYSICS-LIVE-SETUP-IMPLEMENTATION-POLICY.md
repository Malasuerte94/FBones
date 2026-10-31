# Live Setup Physics: implementation contract

2026-10-29, before dependent code. Paired PHYSICS-LIVE-SETUP-{DATA,UI}-HANDOFF
reuse exact4.3.26 Setup captures with Simulate enabled; the user explicitly
requires default live parent-motion/gravity without Play/Run. Default-on is
therefore authorized even where original factory preference is unproved.
This addresses live interaction; exported-frame solver phase remains separate.

Simulate is session intent, default true for a newly opened/created document
with Physics. It is independent from timeline playback and temporary holds.
Explicit off stays off through geometry holds, reset, busy/modal and visibility
changes. A new document defaults on again. Reset restarts transient physics,
keeping the user's current Simulate intent. Idle time never dirties or authors
bones; one completed parent drag is one native edit/Undo entry. Bone drafts
continue to feed local live ticks, and compatible commits adopt physical state.
No automatic changes to Physics influence channels are made: zero coefficients
remain a legitimate no-effect constraint, independent of live clock intent.

Geometry/weight/binding/trace operations retain one frozen native epoch and
exact matrices. Their suspension is temporary, distinct from user off. Release
resumes permitted intent. Hidden/modals/busy skip catch-up rather than adding
hidden elapsed time. No full-scene/native IPC on every frame or pointer move.

For sustained live preview, use bounded native continuation, not periodic
physical reset or unbounded replay. Extend evaluate_project Replay with optional
fromPoseEpoch. Missing means existing reset0 behavior. Present refers only to
an existing native checkpoint with exact document identity and compatible bone
IDs/order/parents/length and complete constraint layout. The private native
continuation may adopt compatible authored bone/revision changes; the public
geometry snapshot remains immutable/stale when its revision changes. Changed
layout/constraints/document invalidates continuation. No client PhysicsState
is accepted. Invalid/stale requests leave all caches/epochs/project/history
unchanged. Keep existing finite/time/pose budget guards per replay segment.

Absolute time/ticks continue after a checkpoint; replay starts from native
checkpoint physics at that time and consumes only the bounded recorded local
motion segment. ScenePreview acknowledges the exact returned checkpoint tick,
prunes only acknowledged pose history, retains current physics/velocity/time
and changes after that tick. No silent reset of settled gravity or velocity.
Checkpoints occur periodically (target every600 ticks/10s, below pose budgets)
and before limits, not each frame. Serialize checkpoint requests and geometry
freeze. Pending compatible author revisions must not invalidate a correct
acknowledged prefix or mix another document's state. Geometry freeze waits for
checkpoint completion, then captures its own latest authoritative epoch.

UI exposes Simulate checked by default plus Reset and paused Step. Do not label
it Play or require Run. Existing low-level run/pause compatibility can remain
for internal callers; intentional user pause differs from temporary holds.
Tests must include actual default-on parent dragging/settling, paused controls,
visibility/geometry resume, authored/history/save invariants, checkpoint
continuity beyond120s and motion bounds, stale/failed/document/layout races,
and no per-frame IPC. No production spring formula or tolerance is changed
merely to hide the unresolved original export-phase discrepancy.
