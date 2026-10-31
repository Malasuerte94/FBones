# F309 native parenting implementation notes

2026-10-29, before dependent code. The paired F309 DATA/UI audits and
`F309-PARENTING-POLICY.md` authorize one atomic authored-setup operation, not
exact original group-parenting parity. This worker owns native code only.

Wire command: `reparentSelection {bones?:stableBoneIDs[],
attachments?:stableAttachmentIDs[],parent:stableBoneID}`. Omitted arrays become
empty; reject both empty, duplicate, missing and bounded-profile-invalid input.
Same-parent relationships are genuine no-ops, including a partial inventory
already owned by the chosen bone: do not split merely to preserve a selection.

Implementation details chosen within the approved policy:

- Capture original authored world poses, stable identities, active references
  and global attachment order before mutation. Move only highest selected bone
  roots. Reorder parent-before-child once and remap all bone references once.
- Work on the existing staged SceneFrame, never a sequence of old public edits.
  Full selected inventory reparents its source slot in place. Partial selected
  inventory creates one adjacent slot **after** its source, in source order;
  pre-existing slots keep their relative order.
- Derive a unique destination name from at most108 source Unicode characters
  plus `_parent` and the existing numeric uniqueness suffix. This is an own
  deterministic naming policy, not an original naming observation.
- Transfer active identity only when that attachment was selected. Preserve
  stable attachment IDs, original selected inventory order, tint/blend and
  untouched alternatives. Preserve global attachment traversal by stable IDs.
- Map every clipping endpoint through its original stable slot identity after
  insertion, including unrelated/inactive clips. Do not silently retarget a
  moved self-ending clip. If the resulting active interval is invalid, reject
  the entire operation; existing inactive-range retention remains unchanged.
- Authored setup pose is the defined space. The new command is not an evaluated
  geometry/poseEpoch edit; constraints remain encoded and validated, but exact
  displayed/evaluated parenting is not claimed. Required singular rigid/bone
  inverses reject atomically; weighted ownership alone needs no new inverse or
  Bind/Auto. Preserve actual weighted influence identities and every weight/
  local-position bit through index remapping.

Existing canonical serialization, constraint ancestry/adjacency, clipping,
resource/vertex/slot limits and history gates remain authoritative. Failure and
no-op retain all session state/IDs/revision/history. Native tests must cover
groups/descendants, partial/full inventory, active/inactive/none, affine rigid
fallback, weighted Mesh/Clip bits, endpoint remapping, cycles/invalid ancestry,
duplicates/missing/stale IDs, singular inverses, one Undo/Redo and native
save/open. UI/store/Tree/viewport wiring and actual platform interaction remain
separate coordinator-owned checks.

## Implemented native checkpoint

The typed command is now handled by `scene_parenting.rs`, called from the
existing staged Scene bridge. No existing one-item public edit is looped and
the command does not call UpdateSlot. `rig.rs` owns its serde shape. A separate
`scene_parenting_tests.rs` is included under the existing Scene native tests.

Native verification (2026-10-29): focused parenting **7 passed**, full default
desktop library **145 passed / 2 existing ignored**, legacy no-default-features
library **93 passed / 1 existing ignored**. Both default and no-default
all-target strict Clippy pass. Logs:
`.local/f309-native-{focused,default,legacy,clippy-default,clippy-legacy}.log`.

The seven groups cover selected-ancestor coalescing and mixed bone/attachment
moves, weighted Mesh positions/weights and stable influence IDs, full/partial
inventory with active-selected/active-unselected/none, Region-to-quad affine
fallback, copied tint/blend and collision-safe names, global attachment order,
one Undo/Redo and portable save/open. They also cover cumulative two-slot
splits and inactive weighted Clip endpoints, rejected active self-ending Clip
split and ID rollback, invalid/duplicate/stale/root/cycle inputs, same-owner
no-op, singular rigid/bone inverses, late batch failure after a successful
internal weighted split, weighted-only ownership under a singular bone, IK
ancestry/pair-adjacency validation and the 128-slot limit.

These are native behavioral/persistence checks of the explicit FBones policy.
They do not establish original Spine group-P slot allocation parity or actual
new frontend/native-window P interaction. Authored setup space remains the
defined preservation space; evaluated constraint/physics world parenting is
not implemented by this command.
