# Bounded Sequence codec/native gate — 2026-11-06

Read-only independent review before dependent implementation. Reuses the paired
[Sequence DATA](ANIMATION-SEQUENCE-DATA-2026-11-06.md) and
[UI gate](ANIMATION-NEXT-WORKFLOW-UI-2026-11-06.md), the final
[Generic116 findings](ANIMATION-GENERIC116-DATA-2026-11-06.md), and current
`minimal::{reader,scene_reader,scene::wire,scene::write}`, native scene/history,
animation and resource code. No original process or shared runner was operated.

## Feasibility and scope

The observed Object123/settings and kind22/keys have enough independently paired
data to implement a **bounded observed data profile**. Sequence alone does not
resolve Generic116/scalar families, Path records, kind39 or existing model/arena
budgets. The small supplied Sequence project is the first whole-file candidate;
success is conditional on complete typed reserialization, not the first rejected
record disappearing. Larger projects stay guarded where any record is unknown.

Region43/tag15 and Mesh46/tag36 must be nullable Object123 fields. Mesh's current
zero-only Bool interpretation is insufficient; null must retain the old zero byte.
Settings are typed authoring data, distinct from wire string provenance and image
path text. Kind22 carries both a typed Slot13 reference and an attachment43/46
object. Validate the target's inventory membership, slot ownership, presence of
Sequence settings and enclosing group bone. Inline references remain legal:
the writer's registered labeled records must emit the same object once and reuse
its domain identity, including cycles through slot/active attachment.

The existing reader admits only known schema fields, bounded arenas and the exact
suffix, then independently writes the complete payload. Retain that final equality
gate. New settings, tracks and key133 objects must contribute to existing limits;
do not skip records, cache source bytes, flatten keys or raise unrelated budgets.
All216 observed settings allocate fresh domain identities. Reject shared settings
identities until explicitly represented and independently proven, rather than
silently duplicating them. Unknown modes/curves remain inspection-only.

## Validation and identity requirements

- Decode settings with checked signed-integer/ZigZag handling, retaining the proven
  nonnegative subset. Require positive count, nonnegative start/digits/setupIndex,
  setupIndex below count and checked start+count-1. Explicit authoring/allocation
  budgets are FBones limits, not native editor limits inferred from observed maxima.
- Preserve raw editor f32 frame, mode, index and delay bits. Validate finite
  nonnegative frame, exact integral mode0/1/2, exact integral index within the
  target count and finite positive delay. All729 observed delays are positive,
  spanning0.01666666939854622–0.06666667014360428; zero/negative delay is unproven.
  Admit only the measured curve code0. Runtime rounding must not rewrite editor bits.
- Add an attachment-address Sequence selector to typed wire layout coverage,
  canonical traversal and family ordering. Duplicate selectors, omitted tracks,
  wrong group owners and mismatched family-vector order must reject. Reorder the
  native parallel stable key IDs with the new family. Existing aliases retain
  Region path tag13 versus Mesh path tag14 through conversions.
- Remap settings/targets by stable attachment identity on slot move, reorder,
  duplication and deletion. Deleted-index reuse must never retarget an old key.
  Deleting/duplicating clips, moving/deleting mixed selected keys and Undo/Redo
  preserve complete snapshots and unrelated families. Settings edits must reject
  invalidating existing keyed indices instead of silently clamping or dropping.
- Expand paths from authored path-or-name plus start+index and minimum decimal
  padding. Bound digit width and total expansion before allocation; validate every
  derived relative image stem, case collisions and existing PNG safety. Keep the
  authored base path unchanged. Count/path arithmetic uses checked operations.

## Native integration contract proposed for coordination

Expose nullable `AttachmentView.sequence` settings and per-clip `sequenceTracks`
with stable native key IDs, attachment and slot IDs, frame/mode/index/delay values.
Use separate Setup `setAttachmentSequence` and Animate `setAnimationSequenceKeys`
commands plus optional Sequence inputs in the existing atomic mixed-family batch.
No command may silently write Sequence changes into bone/slot Setup or flatten
frames into alternative attachments. Setup disabling with keyed tracks needs an
explicit bounded policy; rejecting until keys are removed avoids guessed deletion.

Current `project_images`/`image_stem` checks one base PNG. Sequence's base PNG may
not exist: enumerate every derived frame for missing-resource reports and portable
Save As, including inactive attachments. Main/Preview resolve the same transient
sampled image key. Frame selection must not alter authored dimensions, geometry,
UVs, paths or slot activation. Timing/boundaries/seek behavior not directly measured
must be labeled FBones policy; public runtime implementation is guidance only.
Do not make loaded Sequence projects editable before model, API, resource and
sampling paths are all integrated.

## Required own evidence before supported-profile claims

Use an own fixture with Region and Mesh, nonzero distinct start/digits/setupIndex,
24FPS, all three observed modes, distinct indices and exactly representable binary
delays. Require writer→reader full typed equality, complete payload equality after
reencoding, and meaningful settings/key edits with exact unrelated scalar bits.
Exercise null settings to prove old canonical bytes unchanged; malformed targets,
wrong slots/owners, unsupported modes/curves, integer/path overflow, exhausted
budgets and shared settings aliases must safely reject.

Native evidence must include mixed-family stable-ID/layout permutations, delete
and index reuse, attachment move/Region↔Mesh, clip duplicate, one atomic mixed key
batch, Undo/Redo and Save/Close/Open. Resource checks need absent base PNG with
complete numbered frames, missing inactive/end frames and portable copying of all
referenced frame bytes. Compare native/front-end samples at key and boundary
times under the declared FBones timing policy without authoring the model.

Finally obtain fresh original4.3.26 acceptance of an independently encoded own
Sequence copy. Current platform capability blocks that external action; automated
own equality does not establish original playback pixels, gestures or acceptance.

## Native inventory finding during focused verification

The first six-case native run retains a concrete structural failure in ignored
`animation-sequence-native-2026-11-06/focused-v1.log`: five cases pass, but moving
the globally first Region into a slot already containing a Mesh changes the
complete typed model on reopening. Existing `move_attachment` appends to the
destination local inventory while retaining global `attachment_order`. The reader
reconstructs each slot's local inventory from that global order, so the original
model's local indices differ from the reopened model even though full payload
reserialization still succeeds. This is an existing inventory invariant exposed
by the new own Sequence regression, not an unknown Sequence record or a reason
to relax typed equality.

The paired gates above already require stable attachment identity, independent
global inventory order and complete typed reopening. The concrete correction
preserves global order and inserts the moved attachment at its filtered global
rank within the destination, shifting the destination active index to preserve
the same active attachment ID. Existing stable-ID remapping then updates all
affected families, aliases and source-only Mesh markers. No old local semantic
identity may be dropped as a canonicalization shortcut. The coordinator and DATA
agent were notified of the retained failure and this bounded order contract;
the corrected focused run is separate from the first receipt.

## Native implementation verification

The native implementation now exposes Setup settings, keyed Sequence tracks,
stable key IDs and all-frame resource availability. Sequence keys participate in
the existing atomic mixed batch, move/delete and clip duplication/history. Native
evaluation adds transient `sequencePose` image/index results without changing
geometry or authored paths. Timing uses the declared floor interval policy with
1e-5 bias; Loop reduces the interval count modulo Count before adding the authored
index, preserving that index even when a positive subnormal delay produces more
than2^53intervals. Sequence preview positions are bounded to0–1,000,000frames.

Seven focused native tests pass in ignored `animation-sequence-native-2026-11-06/
focused-v5.log`. They cover all seven keyed families with retained noncanonical
layout, settings rejection, index-preserving large interval sampling, structural
move/conversion/delete/index reuse, mixed key batch/clip duplicate/Undo/Redo,
actual Session settings commands, Setup/geometry preservation, independent typed
Save/reopen, complete numbered-frame copying with absent base PNGs, derived path
case collisions and an inactive missing end frame blocking portable writes.
The earlier source/fixture failures remain in separate v1/v2 receipts; v3/v4 are
intermediate passes. The first failure found the inventory bug above; the second
was only the own test dispatcher's missing typed DeleteAttachment route.

`cargo check --offline -p fbones-desktop --features e2e-host` also passes. The
opt-in `e2e_seed_sequence_fixture` creates a fresh own Region/Mesh source and
seven distinct generated suffix PNGs under an exclusive test directory. It uses
24FPS, nonzero setup indices, distinct starts/digit widths and all three modes;
normal builds expose no fixture command. The existing Trace operation resolves
the Setup Sequence frame rather than requiring a nonexistent base PNG; no
original sampled-Animate Trace behavior is claimed. Coordinator-owned integration,
real-project checks, browser pixels and original acceptance remain separate.

## Proven attachment tint: native follow-through

The [DATA persistence gate](ANIMATION-SEQUENCE-PERSISTENCE-DATA-GATE-2026-11-06.md)
records the additional57-byte mismatch and18/18runtime/editor attachment color
matches before tint implementation. Native `AttachmentView.color` now exposes
packed RGBA with default white, and Setup `setAttachmentColor` updates only the
typed Region/Mesh tint table. Slot light color/keys and existing Clipping color
remain separate. Stable-ID remapping retains tint through Region↔Mesh/moves,
prunes deleted targets, normalizes white to omission and rejects nonimage targets.

Three focused native tint tests pass in ignored `tint-focused-v1.log`: an own
source with both nonwhite Region/Mesh colors opens through the actual Session,
edits tint, rejects a stale edit, supports Undo/Redo and saves/reopens with exact
independent typed colors and unchanged keys, slot data, Setup and geometry. Other
tests cover move/conversion/delete/white normalization plus nonimage/missing
target and incompatible replacement rejection. These are native persistence
proofs; coordinator-owned renderer tests and original pixels/acceptance remain
distinct. The shared Sequence UI fixture intentionally retains white attachment
tints for its existing pixel baseline. No new color timeline is implemented.

## Numeric-equal frame preservation correction

The paired pre-code DATA/UI sections establish that JSON transports source frame
`-0.0` as positive zero while a Sequence property edit still addresses the same
existing key. Native Sequence overwrites now retain that selected key's stored
frame bits for both stable-ID and same-time lookup. New keys continue to use the
validated authored position; explicit moves continue to change time normally.

The own regression first failed because an otherwise identical JSON `frame:0`
update advanced the revision and created history. That failure is retained in
ignored `negative-zero-before-v1.log`. After the bounded correction, all eight
focused Sequence tests pass in `negative-zero-fixed-v1.log`. The new test starts
from an encoded/reopened negative-zero source, checks exact bits0x80000000 and
stable ID across mode/index/delay edits, both lookup routes and no-op writes,
then verifies Undo/Redo and the complete independently encoded/reopened saved
payload against the expected typed model. Unrelated data stays exact. Separate
assertions confirm explicit movement and canonical time for a genuinely new key.
No UI control, sampling policy, codec acceptance guard or original observation
changed. The coordinator owns formatting, final integration checks and build.
