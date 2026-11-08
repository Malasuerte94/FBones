# Scene512 slots and full draw-order integration

The latest user resume requests progress on the four unsupported source profiles.
This second verified prerequisite extends Scene slot inventory and complete
draw-order operations through512. It follows the independently verified large
Mesh slice. **Four actual sources remain editable and four remain guarded.**
E has265slots but also reversing curves and newly isolated wire-provenance gaps;
no source record is discarded to make it editable.

## Policy and implementation

Pre-code [DATA](ANIMATION-SLOT-CAPACITY-DATA-GATE-2026-11-07.md),
[UI](ANIMATION-SCENE-SLOTS-UI-GATE-2026-11-07.md) and
[native](ANIMATION-SCENE-SLOTS-NATIVE-GATE-2026-11-07.md) gates approve the bounded
FBones512 policy. It is not a measured original-editor maximum. Scene inventory,
draw-order permutation/offset helpers and reader205 draw-offset bodies share
`MAX_SCENE_SLOTS`. Legacy inventory/conversion remains128. General reader arrays
remain512; no generic parser budget expands.

Native image placement, AddImages and parenting splits now use the Scene total;
single image-placement/alternative batches remain128. CreateSlot still validates
the complete candidate before publication. Explicit nonempty order keys still
reject slot additions/deletions/splits. Setup reorder retains stable identity,
all references/keys and Clip end identity. A complete permutation remains one
command/history action and must contain every current stable slot ID once.
Empty-offset reset follows Setup; it is distinct from a literal identity record.

Attachment inventory512, binding/constraints128, bones256, geometry4096,
Mesh512/Clip256, image/cache/file/depth and animation budgets remain independent.
Empty slots, nullable active references, inactive alternatives and global
attachment order remain separate. No widget, renderer or shared transform HUD
changed. No runtime cache becomes authored data.

## Checks and data proof

Four new actual Session tests cover511→512 CreateSlot/image placement and atomic
513 rejection; parenting split boundaries and world/identity preservation;
complete order/reset/high-slot color/None keys/history/portable Save; and Setup
reorder with existing literal keys plus high Clip end identity. The old parenting
negative now tests the new maximum instead of128. An initial own fixture reversed
the order of alternatives within a slot and correctly failed full validation;
its corrected variant reverses slot groups while retaining local alternative
order. Product guards were not relaxed to fit the test.

The actual production store plus dedicated current Rust host passes14frames
across two clips, comparing all512slots' color/attachment poses and full order
against production frontend sampling. Auto Key off stages a complete512-ID order
and independent tail color intent. Refresh and Save retain both without baking.
Manual order Key sends512IDs once and retains the color draft. Undo/Redo,
high-slot color/None Auto Key, invalid full orders, overflow, portable Save/reopen
and unkeyed reopen pass. The two PNG pairs and source are unchanged. Largest
observed reply318322bytes is one workflow, not a general transport bound.

The [independent saved proof](ANIMATION-SCENE-SLOTS-SAVED-DATA-2026-11-07.md)
preserves all4162originalf32fields and the complete tag/order/reference graph.
Only frame21's color, None and full reverse-order keys plus image-root
normalization change; the reverse uses511stored offset records. Source72967bytes
becomes77500. An expected typed model outside Session/history reproduces every
saved payload/compressed-envelope byte with the product codec; the independent
Python graph/envelope check is separate, not a second encoder implementation.
Saved SHA256:
`fbbe7cc66bacddfba8c55673b17a6b9197e27a9a36226bc91776eb38983f7b1c`.

Five focused compiled-control/pure tests pass, including IDs above2^32, Tree
inactive selection, full SlotHierarchy order events/stale drops and1027Timeline
labels without fake Graph curves.27custom-host trials measure128/265/512 empty,
active and mixed shapes. At512active rows Tree17012nodes takes median63.73ms,
SlotHierarchy3609nodes20.57ms, all-selected Timeline15521nodes49.49ms. These are
synthetic component/allocation observations without browser layout, GPU or
responsiveness claims. The source summary never mutates and no native request
occurs in those component trials.

## Regression, platform and remaining work

Current host SHA256
`e89ec00faf12a449b27733d224e0790f1c070ba44a52cda785a61d1a8f3d9a62`
passes the four real-source workflows and retained own two-color/split/partial/
large-Mesh/corpus checks. All four actual saved hashes and the large-Mesh saved
hash remain identical to prior proofs. All eight source/copy hashes remain
unchanged; guarded copies still refuse mutations and copy/reopen byte-exactly.

399JS pass with one existing Physics skip;309native pass/two ignored;
90Scene+16default format and95legacy desktop/one ignored pass. Product/UI
TypeScript, production web build, desktop check, strict Clippy, rustfmt and normal
release build pass.109browser cases are discovered/zero run. The retained
pre-page Chromium failure is not retried unchanged. Current normal release SHA
`0b19b4d0c08c06e27d3faf6cf27b5949f79391d7c76495bf85e608592c86cc7f`
exits101 at GTK initialization in an own isolated empty profile; no current
normal window is left available. Native OS/GPU/Windows/macOS/fresh original
acceptance remain open. No Windows selection, publishing or user/original window
was changed. F105 remains active.

A bounded [E static diagnostic](ANIMATION-E-STATIC-CLOSURE-DATA-2026-11-07.md)
omits only the monotone-time rejection in a new ignored copy, without sampling
or authoring. It still rejects complete equality: two ASCII64strings use original
length-prefixed form, and separate Physics/Transform declaration inventories
differ from evaluation order. This diagnoses additional persistence work;
neither the diagnostic nor the slot increase authorizes E admission or a guessed
curve sampler. Reuse the paired wire-provenance gates before dependent fixes.

Current aggregate: `analysis/animation-scene-slots-check.json`. Raw recipes and
failures remain ignored under `animation-scene-slots-2026-11-07/` and the paired
DATA/UI/native audit directories. Earlier large-Mesh/partial/split checkpoints
remain consumed evidence; their identical saved-byte proofs still apply.
