# Physics creation and inspector policy — 2026-10-30

Before-code references: PHYSICS-MULTI-BONE-AUTHORING-DATA-HANDOFF.md and
PHYSICS-BATCH-AUTHORING-UI-HANDOFF.md. Exact4.3.26 records prove one constrained
bone per Physics record, not an external target. Existing screenshots/records
prove controls and particular loaded zero-channel settings, not factory-new
batch creation defaults. Current official guide documents affected channels,
lag, strength restoration and inactive-zero warnings, but is patch-unpinned.

The user explicitly requests all selected bones receive independent Physics,
`bone_physics` generated names following bone rename, live Setup reaction and
settling without Play, and compact colored controls/sliders with precise entry.
The following creation/naming choices are FBones policy, not original parity.

- One native AddPhysicsToBones command validates every selected stable bone ID,
  duplicate/empty selections, all-kind names and the128-total-constraint budget
  before any edit. Create in wire/parent-first order, one history transaction;
  existing Physics constraints on a bone do not prevent another new record.
- Creation is immediate through the shared New/Physics-view action; only active
  bone selection counts. No separate target dialog. IK/Transform keep their
  own workflows. Inspector labels the stored reference Bone.
- New records use a useful secondary-motion preset: positive-length bones have
  rotation100%; zero-length bones use translation X/Y100% instead. Inertia100%,
  strength100, retained damping.85(display15), mass1(display100), FPS60, mix100%,
  zero wind/gravity, limit5000. Other affected channels start0. This changes
  creation only, never loaded inactive records or codec defaults. Never enable
  Simulate over an explicit user Off state.
- Generate `<bone>_physics`, then collision suffix2,3,… against all constraint
  kinds, respecting native name bounds/Unicode. Track automatic naming in native
  history metadata keyed by stable constraint ID and last generated name.
  Bone rename updates only attached automatically named Physics records, in the
  same transaction. A custom constraint rename detaches automatic naming.
- The binary format has no proven automatic-name flag: add no wire tag or
  incompatible sidecar/container. On reopen, infer automatic naming conservatively
  from exact current generated convention (including collision suffixes); custom
  nonmatching names stay unchanged. This convention-based inference cannot prove
  provenance of externally/manual-authored matching names; keep that limit explicit.
- Physics sliders pair semantic color/icons with readable labels and numeric
  entry. Common0–100 ranges use sliders; numeric entry preserves valid extended
  values without silently clamping them to the slider's useful range. Keep all
  existing unit conversions. Stage locally while dragging and author once on
  release/keyboard completion; Escape cancels, Save flushes valid drafts and
  invalid drafts block it. No per-pointer RPC/history or alternate solver.

Verification must exercise actual B/C/D selection and every creation entry,
rename/collision/custom/Undo/Redo/save/reopen, malformed/over-budget atomicity,
sliders and extended numeric precision. A real viewport drag of parent A in Setup
must show transient B/C/D secondary motion then settling without Play; explicit
Simulate Off must remain off. Setup saving must not bake evaluated child poses.
No exported-clock numeric parity claim follows from this authoring/UI change.
