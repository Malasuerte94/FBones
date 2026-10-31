# Physics on selected bones — DATA handoff

2026-10-30. New user priority: select several bones, add Physics directly to
each, generate bone-based names and follow bone renames. In an A→B→C→D chain,
Physics on B/C/D must react while A moves in Setup and settle afterward without
Play. Read-only audit; no original launch, input, process observation or old
numeric-batch recollection. Paired UI audit remains separate.

## Proven exact-4.3.26 evidence reused

- `FEATURE-DATA-4.3.26.md`, Physics121: tag3 stores one constrained bone;
  tag1 is its independent constraint name. There is no separate IK-style target
  or Transform source in this accepted profile. Unified constraint order is
  separately represented and must remain intact.
- `FEATURE-UI-4.3.26.md`, actual default/nontrivial inspector observations:
  the installed inspector called the constrained member **Target** (`upper`).
  This word does not establish a second target bone. Default affected channels
  were all zero; Simulate was enabled. These are retained captures, not a new run.
- Canonical default fields are 60 Hz, inertia .5, strength100, damping retention
  .85, mass1, wind0, gravity0, mix1, limit5000. The recognized angular default
  contains its special quiet-NaN sentinel; preserve the typed angular API.
- Default-live Setup/parent dragging is already delivered and non-baking save
  accepted: `PHYSICS-LIVE-SETUP-ACCEPTANCE.md`, current STATE and live-Setup
  delivery reports. Exact exported moving-parent phase remains unresolved.

These observations establish per-record cardinality and current channels; they
do not prove original multi-selection creation, generated spelling, collision
rules or automatic rename behavior.

## Primary documentation, not exact-patch proof

The [official Physics guide](https://en.esotericsoftware.com/spine-physics-constraints)
was checked on 2026-10-30. Creation starts from the selected constrained bone;
multiple Physics constraints on one bone are supported. Inertia produces motion
lag, strength returns toward the unconstrained pose, and gravity is a constant
world-axis force. Zero affected channels do nothing. The page does not settle
this user's multi-create or naming/rename details, and is not version-pinned.

Consequently, avoid deduplicating against *existing* constraints by bone: another
constraint on the same bone can be intentional. Deduplicate or reject repeated
IDs within a single batch according to one explicit FBones policy.

## Current native path and minimal change

- `scene_constraints.rs::ConstraintInput::Physics` already accepts one `bone`
  stable ID and independent `name`, with no second target.
- `scene_bridge.rs::apply` adds one record for `RigEdit::AddConstraint`.
  `SceneHistory::apply` clones frame and ID allocator, validates complete
  reserialization, then commits one history entry. Use this transaction boundary.
- Introduce one native semantic batch command, for example
  `AddPhysicsToBones { bones, preset }`. Resolve every stable ID first; reject an
  empty/stale/invalid/oversized request atomically. The current canonical profile
  has a **128 total constraints** limit. Include existing records in that budget.
- Append new records in bone wire order so new parent/child constraints evaluate
  parent-first regardless of Ctrl-click chronology. Preserve existing records'
  order. This is an explicit FBones batch-order policy, not an observed original
  creation rule. Allocate stable IDs and choose unique names against the shared
  namespace of IK, Transform and Physics records, including earlier batch rows.
- Do not loop `createConstraint` in the frontend: that creates partial batches
  and multiple Undo entries. Keep one batch, one revision and one Undo action.
  Existing `workspace.editRig` selection/focus handling recognizes only the old
  `addConstraint` creation operation and needs the new command explicitly.
- Bone property rename goes through `RigEdit::Update` in `scene_bridge.rs`;
  `SceneEdit::SetBone` is another native path. Rename following must be native
  and part of that same transaction, preserving IDs, parameters and all unrelated
  names. Generating `bone_physics` must respect the format's UTF-8 name-byte limit.

## Naming and motion policies requiring an explicit decision

The user authorizes bone-based generated names and rename following; their exact
Spine spelling/gestures remain unknown. Do not spend another observer-tooling
iteration trying to infer these before implementing the requested behavior.

For custom-name protection, retain generated-name ownership per stable constraint
ID in native history metadata and remember the last generated string. A custom
constraint-name edit or member reassignment detaches the automatic relationship.
Do not infer ownership merely from a suffix or overwrite imported custom names.
No auto-name bit is proven in the binary profile. Reopening requires a separately
declared conservative convention or native metadata persistence policy; do not
invent a binary field, silently introduce a container or claim that session-only
metadata persists. A name equal to a generated name is inherently ambiguous in
an imported file without provenance.

Creating the exact all-zero canonical default cannot deliver the requested
visible motion. Keep those codec/default values unchanged, but offer an explicit
useful creation preset. Rotation with finite nonzero bone length and no constant
force is a plausible FBones secondary-motion preset; zero-length bones need a
defined warning or translation alternative. This is a product choice, not proven
original creation-default parity. With gravity/wind enabled, the settled pose may
be a force-displaced equilibrium rather than the authored pose.

## Verification and the next useful original observation

Test a real A→B→C→D setup workflow: multi-create B/C/D, inspect exactly one owned
record per selected bone, drag/rotate A using actual viewport input, observe all
three evaluated motions and eventual return with zero constant force, and keep
authored channels unchanged. Check one Undo/Redo for creation and rename, custom
names/collisions/invalid IDs/128 limit, stable IDs after reorder, Save/Close/Open
and explicit Simulate-off preservation. Reuse the native preview/solver; no new
frontend engine or export-phase clock fitting follows from this workflow.

If exact original naming or rename parity is needed later, one fresh owned GUI
scenario suffices: select B/C/D, invoke New Physics once, save, rename C, save,
and independently compare names/record count/bone references. Record actual
selection and dialog behavior. Do not rerun the accepted Physics numeric corpus
or recycle closed process identities. This probe is not required to implement
the user's explicitly requested naming policy honestly.
