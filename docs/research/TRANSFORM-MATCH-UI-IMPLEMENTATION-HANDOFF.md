# Transform ranges and Match: UI implementation handoff

Recorded 2026-10-29 before dependent implementation. This is a read-only handoff:
no new original commands, GUI input, accepted-batch repeats, product changes or
test runs. The coordinator owns integration and STATE/TASKS updates.

## Evidence and authority

**Direct exact4.3.26 evidence:** eight accepted actions in
[transform-match-reference-check.json](../../analysis/transform-match-reference-check.json),
with `scopeComplete=false`; the paired
[UI observations](TRANSFORM-MATCH-UI-4.3.26.md) and
[independent data comparisons](TRANSFORM-MATCH-DATA-4.3.26.md).
The eight actions are separate Offset/Properties branches of local/local,
reflected world/world, reversed ordered targets, and sparse World-source /
Local-target fixtures. All mixes were zero. Reuse these snapshots; do not
recollect them merely to test our implementation.

Reinspected existing private captures: `match-properties-selected.png`,
`match-properties-mixed-before.png` under ignored
`.local/research/auto-scope-ui/`. These prove the displayed controls, not real
OS mouse/keyboard fidelity: collection used explicitly targeted own-window
background input. Original screenshots remain private.

The authoritative preservation gate is
[TRANSFORM-RANGES-CODEC-HANDOFF.md](TRANSFORM-RANGES-CODEC-HANDOFF.md).
Its proposed native/DTO contract is a recommendation, not an already implemented
API. Current `ConstraintInspector.vue` has offsets/mixes and
`TransformMappingEditor.vue` exposes From offset plus each To offset/max/scale;
there is no source-end field, nullable range transport, or Match action.

**Official documentation, patch-unpinned:** rechecked the
[Transform guide](https://en.esotericsoftware.com/spine-transform-constraints#Match)
on this date after inspecting local evidence. It describes offset matching
against the first constrained bone and suggests zero mixes during setup.
The surrounding single Local/Relative/Target model does not document the
observed two-sided 4.3 property table, nullable ranges or Properties Match.
It cannot settle the missing manual-range behavior. No older editor behavior
is imported into this handoff.

## Minimal inspector surface

**Proven layout:** keep Source and ordered Targets above separate Offset, Mix
and Properties sections. Offset and Properties each have their own Match button
in the section header; folding a section is not an authoring edit. Both buttons
were enabled with mixes zero. Source Local and Targets Local remain independent;
Additive and Clamp are independent flags. Do not sort Targets for display or
operation: reversing their order changed both Match results.

Properties presents these six fixed rows on each side, with colored links
between corresponding or different rows:

| Row | Source / From cells | Destination / To cells |
| --- | --- | --- |
| Rotate | Start, End | Start, End |
| Translate X | Start, End | Start, End |
| Translate Y | Start, End | Start, End |
| Scale X | Start, End | Start, End |
| Scale Y | Start, End | Start, End |
| Shear Y | Start, End | Start, End |

The original calls the endpoint placeholders Min/Max, but reversed ranges are
proven. **Own wording proposal:** Start/End avoids suggesting an ordering
restriction. Preserve all six rows in a compact grid; keep sparse unmapped rows
visible. Existing add/remove mapping controls may remain as our explicit UI
until their original gestures are separately established.

**Proven sparse layout:** source X and ScaleY have values, other source rows
show Min/Max placeholders; destination Rotate, Y and ScaleX have values, other
destination rows show placeholders. Source X has two outgoing links. Offset
controls are filtered by source channels and Mix by destination channels.
Filtering a control does not authorize dropping its saved value: sparse Offset
Match changed all six offsets, including hidden ones.

**Own safe staging:** build the full six-row range display first, with readable
field labels and distinct From/To accessible names. Where the runtime mapping
and range state cannot yet be updated together, show that endpoint read-only.
Do not expose a button or field that appears functional but cannot commit safely.
Raw runtime scale can remain in an Advanced mapping view; an endpoint table
must not imply that scale and endpoints are unrelated independent values.

## Null, derived display and explicit authored ranges

**Proven:** Transform65/tag31 contains 24 independently nullable f32 cells,
four per row in the order FromStart, FromEnd, ToStart, ToEnd. All-none legacy
identity mappings visibly show 0..1 on both mapped sides. The sparse all-none
baseline displays source X approximately 3.7..48.48 and ScaleY .6..-2.46, and
their mapped destinations' existing endpoints. Unmapped sides show placeholders.
Thus absent wire cells alone do not tell the UI to display zero or blank.

**Inferred display mechanism:** absent mapped endpoints are derived from runtime
From/To records. The sparse source X displayed span agrees with its first
destination's `(max-offset)/scale`; this agreement is not proof of every
degenerate/multiple-link display formula. Native should supply an authoritative
display view rather than reproducing speculative arithmetic in Vue.

**Own safe view contract:** distinguish an absent stored cell, an explicitly
stored numeric cell (including zero or negative zero), and the displayed
resolved/derived value. A small nonintrusive field hint may identify a derived
value; do not add codec terminology to the ordinary user flow. A placeholder
for an unmapped side is not an authored zero. Untouched focus/blur, opening a
foldout, switching selection, hover or Save must not materialize derived cells,
clear nulls, round f32 values or turn -0 into +0.

**Own edit contract, gated by native integration:** submit only the intended
channel/side/cell patch, anchored to document, constraint stable ID and revision.
The native operation must atomically synchronize affected runtime mappings and
typed editor ranges. Preserve every unedited cell's exact bits. Empty input is
not an implicit clear; until original clear semantics or an explicit FBones
policy is established, Escape restores the displayed value and an empty draft
does not write. A future explicit Reset/Clear must name its scope and remain
distinct from an omitted update field. Do not sort endpoints, force nonnegative
scale, reject a reversed range, or silently repair stored partial nulls.

Shared-source and destination fan-in require a separate resolved editing
contract: the 24-cell range table is per channel, while runtime To records are
per route. Do not duplicate one channel's endpoint into independently editable
route fields and assume they can disagree safely. Removing/changing a mapping
must preserve or intentionally reconcile its cache, never reset it incidentally.

## Two Match actions; do not combine them

| Control | Directly observed mutation | Preserved fields in all eight fixtures |
| --- | --- | --- |
| Offset Match | All six global offsets, even hidden ones | Bones, runtime mappings, nullable ranges, mixes, spaces, flags, ordered targets |
| Properties Match | Runtime mapping offsets/max/scales and nullable editor ranges | Bones, six global offsets, mixes, spaces, flags, ordered targets and link inventory |

Both use the first ordered target in the tested local fixtures; reversed-order
branches prove this independently for both buttons. Each successful action
dirtied the original and persisted through save. Zero mixes do not disable it.
The mixed Properties action retains old source/destination spans, not width1;
it can reverse a route's previous scale sign to reconcile a shared source span.
Reflected ranges retain negative ScaleX. Local shear endpoints use an observed
-90 presentation shift. These are numerical observations, not cosmetic rules
that Vue should apply globally.

**Own proposed interaction:** preserve the selected constraint, flush/cancel
pending numeric drafts deliberately, and issue one revision-checked native
action using a captured authoritative pose. One completed action should be one
Undo entry; stale/invalid requests leave history unchanged. These history and
failure behaviors are FBones requirements, not proven original Undo behavior.
Do not ship either Match button as simple channel subtraction or enable it for
unidentified cases while describing it as exact parity.

## Gates and review checklist

1. Implement the complete typed nullable codec, canonical equality guard,
   DTO/native preservation and update semantics together. Recognition alone must
   not enable lossy editing of nondefault ranges. Preserve unrelated edits,
   clone/history/reorder/remapping and native Save/Close/Open.
2. Establish a native resolved display/edit contract for source End, shared
   sources, destination fan-in, absent cells and mapping changes before making
   those fields editable. Original manual endpoint edits, clearing/defaulting,
   zero-span display and multi-route conflict behavior remain **unknown**.
3. Verify actual inspector drafts: untouched blur preserves fractional bits;
   Enter/blur commits once, Escape never commits, invalid drafts cannot leak
   onto another constraint, and Save awaits pending edits. These are acceptance
   requirements, not additional original observations.
4. Reuse all eight saved Match comparisons for implementation checks. Still
   unknown: Local-source / World-target, Additive, singular matrices, angular
   wrapping, exact rounding/decomposition, earlier/later evaluated constraints,
   partial mixes, route reorder generalization and original Undo/error UI.
   Keep unsupported Match cases explicitly unavailable until their gate opens.

This handoff supports safe preservation and a bounded inspector implementation;
it does not mark F308 complete or authorize general Match parity.
