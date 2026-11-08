# Scene slots and draw order: native feasibility

2026-11-07. Read-only pre-code audit. Proposal: a named Scene slot inventory bound
of512, including complete512-element Animate draw-order permutations. Legacy128,
attachment inventory512, total geometry4096, PNG/cache, bone, constraint, binding,
track/key, depth and file limits remain separate. No product change, shared build,
original operation or new corpus admission occurred in this audit.

## Retained need and independent guards

E has265slots,258attachments and29clips in its complete retained graph. The DATA
audit identifies no draw-order timeline in E and no new unknown slot flag. Its
known X-only Translate and per-Mesh prerequisites are now separately supported;
four reversing bone-time axes remain guarded. Increasing slots would advance a
known structural prerequisite, not admit the source or establish those curves.
No raw personal project names, assets or scalar data are reproduced here.

## Current native limits and proposed scope

| Path | Current guard / required decision |
| --- | --- |
| `scene_edit.rs` CreateSlot | No early inventory cap; complete format validation rejects before history publication. A named512 precheck may make the same public boundary explicit. |
| `scene_edit.rs:560` AddImages | Batch128; creating slots also checks total128 at574. Change the **Scene total** to512. Batch128 can remain an independent bounded placement policy. |
| `project.rs:507` place_images_impl | Shared placement preflight checks both batch128 and total128. Its total needs the Scene512/legacy128 compile-time distinction; otherwise one image cannot be placed into an already265-slot Scene even after format admission. |
| `project.rs:2262` place_attachments | Existing-slot alternative batch128; no slot is created. Keep the action batch distinct unless separately approved. Attachment inventory512 still validates the final candidate. |
| `scene_parenting.rs:72` split_count | Attachment parenting can create sibling slots. Its total128 guard must follow Scene512; preserve one atomic action and stable attachment identity. |
| `rig.rs:1360`, legacy regions validation | Legacy batch/inventory128 stays. No global replacement of128. |
| Format draw-order permutation/offset helpers | Both currently reject count>128; DATA owns a Scene512 policy consistent with native complete permutations. Its isolated closure probe also found the class205 explicit-offset count128 guard. |

SceneSetup reordering already accepts an index below actual inventory length.
It moves the slot, stable slot ID and parallel attachment IDs together, remaps
global attachment addresses and Clip endpoints, then reconciles slot/deform/
Sequence tracks, dark/tint/Sequence metadata, layout/string aliases and IDs through
the existing full-scene structural path. `SceneHistory::apply` encodes and checks
the complete candidate before committing model, ID allocator or history. None of
these identities uses an8-bit slot index; vector indices and stableu64 IDs fit512.
Signed draw-order offsets usei32 and remain bounded to the actual permutation.

Explicit nonempty draw-order keys intentionally reject slot additions/deletions
in `animation_order::remap_references`; this includes parenting that splits slots.
Keep that nondestructive policy. Setup reorder remaps complete existing
permutations by stable identity; it retains a nonempty literal record when the
new physical order happens to make its offsets zero. Draw-order key updates keep
the selected stored frame, including negative-zero bits. No new semantic policy
is needed for a larger inventory.

Native `animation_order::resolve_ids` requires exactly one occurrence of every
current slot ID, rejecting missing/foreign/duplicate IDs before mutation. The
complete512-element permutation must remain one command/history transaction;
never chunk it into partial orders. Its key batch4096 bound is independent.
An empty offset list remains the Setup-following order, not an empty inventory.

## Cheap isolated production-function costs

An own std-only `rustc -O` harness imports the exact current
`animation_order::resolve_ids` and `SceneFrame::slot_index` functions. It uses
own synthetic stable IDs and complete reverse permutations, seven batches of
1000 observations, plus the existing Setup reorder's positional-remap expression:

| Slots | Resolve full permutation median ms | Setup ID remap ms |
| ---: | ---: | ---: |
|128|0.003828|0.001909|
|265|0.012652|0.007905|
|512|0.037732|0.026817|

At each size, duplicate, missing and foreign ID inputs reject. These costs cover
only native identity resolution/remapping, **not** full Session cloning, format
validation/encoding, summary JSON, IPC, renderer/GPU or browser interaction.
DATA owns the independent whole typed-model/codec/100-clone capacity experiment;
coordinator-owned Session and DTO measurements are still required at integration.
No algorithm or bound in product source was changed to obtain these timings.
The ignored `slot-capacity-native-review-2026-11-07/` folder retains exact source
pins, extracted own functions, driver, result and one manifest.

## Minimum native integration evidence

Use own265/512-slot sources with high-ID alternatives and a single reused own PNG
so slot capacity does not imply a PNG/cache increase. Include ordinary/hidden/
empty slots, one endpoint near511, an independent active Clip, light/dark keys,
Sequence and deform tracks with stable key IDs, aliases and source metadata.
Verify high-index selection/rename/color/reparent, last→first Setup reorder,
complete reverse/rotate Animate orders and Setup reset, mixed-key batches,
Undo/Redo and Save/reopen. Compare semantic stable-ID ownership before/after,
unrelated raw bits and source/resources unchanged. Reopen may regenerate IDs;
compare live history IDs separately from reopened semantic identity.

Reject slot513, legacy129, duplicate/missing/foreign permutations, stale revisions,
invalid Clip intervals and explicit-key slot add/delete atomically. Test placement
below/at capacity and sibling-slot splitting without broadening attachment/PNG
budgets. If batch128 remains, preserve it explicitly in positive/negative tests;
inventory512 must not accidentally advertise a512-image placement batch. No new
widget, synthetic frame, original acceptance or full E admission follows.

## Native guard handoff after paired approval

The coordinator read the DATA/UI/native findings and approved the conditional
Scene512 policy, with actual Session/DTO/UI costs still required before an
integration claim. Three native totals now use the exported `MAX_SCENE_SLOTS`:
Scene AddImages in `scene_edit.rs`, sibling-slot splits in `scene_parenting.rs`,
and the Scene branch of common `Session::place_images_impl` in `project.rs`.
The common legacy branch retains128. Image placement and alternative batches
remain128. CreateSlot still relies on complete final format validation; no
duplicate early policy was added. Legacy rig/format bounds and explicit keyed
slot add/delete/split rejection remain unchanged.

Only those three native guard sites changed. No sampling, remapping, ID allocation,
history, geometry, cache or publication logic changed. No shared build/test/fmt
ran in this handoff; the coordinator owns the new real Session512/513 fixture,
permutation/parent/remap/save tests and integration checks. Consequently this
section records source completion, not a new test pass or full-source admission.
