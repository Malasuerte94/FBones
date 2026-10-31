# Transform range authoring: complete editable24-cell UI

2026-10-29. Paired UI handoff only: no product edits, original commands/input,
existing-window interaction or accepted-batch repeat. Match release stays frozen.

## Evidence and limits

Reuse the exact4.3.26 six-row/two-sided captures cited in
[the ten Match observations](TRANSFORM-MATCH-AUTHORING-UI-HANDOFF.md).
Mapped sides display derived values even with stored None; unmapped sides show
Min/Max placeholders. Six colored property ports support cross-channel links,
fan-out and fan-in. Source/target Local flags are independent; all four space
combinations occur in the accepted corpus. Reversed endpoints are supported.

The [V4 diagnostic](TRANSFORM-MANUAL-RANGES-V4-DIAGNOSTIC-DATA-RESULT.md)
saved SourceX2..0, outgoing scales−4/−6 and all ten mapped-side cells present,
with other runtime rows/bones/settings unchanged. Its actual sequence was
**a→Escape→0**, diagnostic Save, then unexpected process disappearance. It is
not intentional0 typing, the planned6→10 edit, a committed-empty/clear probe,
a universal Escape rule or normal-close proof. General manual/clear/equal/
unmapped gestures remain unknown; do not fill gaps from older editor releases.

[Paired DATA handoff](TRANSFORM-RANGE-AUTHORING-DATA-HANDOFF.md) supplies the
native resolver/mutation proposal below. The diagnostic supports deliberate
mapped-cell materialization; it does not permit generic updates or untouched
controls to rewrite saved bits. These own policies enable useful editing
without claiming exact original manual interaction parity.

## Main table and connections

Properties must contain **six fixed rows**: Rotate, Translate X, Translate Y,
Scale X, Scale Y, Shear Y. Each has four editable fields in this exact order:

| Source start | Source end | Colored ports / links | Target start | Target end |
| --- | --- | --- | --- | --- |
| editable | editable | actual graph | editable | editable |

Keep all24 positions, including unmapped fields; do not apply sparse Offset/Mix
filtering here. Group source/target headers; use Start/End accessible names
because reversed values are valid. Retain the compact dark tokens and Match
header. Scroll only the table when its dock is narrow, or allow dock widening.
Colors supplement channel labels. Decorative ports must not pretend to support
an unimplemented drag gesture. Existing real add/remove/source/destination
connection controls may move into Advanced, supporting all channels and fan-in/
fan-out while retaining route order and valid dormant values.

Saved ranges may remain optional read-only Advanced information, **not** the
normal authoring surface. Do not leave independent raw numeric editors silently
inconsistent with the endpoint table: route their edits through a defined native
coupling operation or present computed diagnostics separately. Generic
updateConstraint must remain the cache-preserving path. Range edits do not
sample/move bones or need a pose epoch; Match remains its distinct operation.

## Display, native intent and drafts

| Native state | Display | Intent |
| --- | --- | --- |
| Explicit finite bits | Value, including−0 | Exact requested u32 |
| Mapped, stored None | Native-resolved value; subtle Automatic hint | Actual numeric edit may make it explicit |
| Unmapped, stored None | Blank with Start/End or Min/Max placeholder | Untouched remains absent; typed value is dormant |

An explicit dormant value still displays without a link. Native0..1 unlinked
fallbacks need not fill blank controls. Obtain resolved value/presence/link state
from the one native resolver, not a Vue math engine. Proposed typed action:
`setTransformRange {id,index,bits:u32|null}`, index0..23, outer expectedRevision.
Cell order per row is sourceStart/sourceEnd/targetStart/targetEnd. Send only the
intended cell, never a rebuilt24-cell echo. Distinguish None,−0 and+0 by bits;
never use truthiness, numeric=== or Number(empty) to decide stored intent.

Use a local raw draft and dirty intent keyed by document/constraint/cell.
Untouched focus/blur/hover/foldout/Save sends nothing despite rounded display.
Only actual editing/submission materializes a derived value. Same stored intent
is a native no-op. Invalid/nonfinite/f32-overflow text stays a draft/error.

## Explicit FBones policies before implementation

- Resolve the old table once and hold other effective endpoints fixed when
  changing one. Changing Start must not silently translate End. A mapped edit
  materializes currently mapped source/destination cells; existing explicit
  peer bits and unmapped cells stay exact. Do not promise single-cell mutation.
- Source edits update its fan-out; destination edits update incoming rows and
  their required outgoing closure. Stage one coherent native f32-ratio result.
  Preserve disconnected rows, link inventory/order and all global/bone data.
- **Clear is an explicit accessible Use automatic action**, sending null.
  Resolve runtime fallback, keep the chosen cell absent while mapped peers may
  materialize; display may stay numerically unchanged. Edited empty text alone
  is invalid, not implicit Clear/0 on blur. Untouched blank dormant fields are
  still no-ops. Prevent blur's invalid draft from preempting explicit Clear.
- Reject a mapped source denominator0, including0/0 or f32 collapse, atomically;
  loaded equal ranges still roundtrip. Allow destination span0/scale0 with a
  valid source span, reversed spans and negative scales. Overflow fails atomically.
- Unmapped edit/clear changes only its cache cell, creates no link and supports
  every finite dormant bit. Declare native first-route/first-incoming fallback
  and connection reconciliation; never resolve conflicts by accidental loop order.

## Interaction, persistence and acceptance

Give every input a unique side/channel/endpoint accessible name and predictable
row-major Tab order. Enter/blur commits once; Escape restores exact original/
derived display, clears its own error and never writes. Preserve drafts across
unrelated rerenders. Capture document/stable constraint/cell/revision before
awaiting; target/history replacement cannot late-commit into another field.
Dedicated Views must act on explicit IDs independently of Tree selection.

Valid pending fields flush before Save/Match; invalid drafts block those actions
without discarding text. Preserve the existing pointerdown/click and Save-flight
contract so automatic blur cannot swallow an intended Match. One native edit
means one Undo item for runtime plus deliberate cache changes; no-op/error/stale
means none. Undo/Redo and binary SaveAs/Close/Open retain presence/bits together,
with no authored bone/attachment/binding/activation change or physics bake.

Required checks: native all24 positions, null/−0/+0/subnormal/partial caches,
mapped materialization, dormant values, fan-in/fan-out/conflicts, clear/reversed/
equal/overflow, no-op/stale/error atomicity; real Linux Playwright+Rust field
focus/Enter/blur/Escape/Clear, dedicated IDs, links, pending Save/Match and Undo.
Verify all four spaces and binary roundtrip. Compare7bbd under its diagnostic
provenance, not invented typing. One later new UI-authored original acceptance
can check persistence without repeating old batches; targeted Windows WebView2/
OS-dialog delivery checks remain separate. F308's unknown original gestures stay
explicit after functional authoring ships; this is not a read-only milestone.
