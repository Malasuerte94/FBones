# F308 endpoint authoring: DATA handoff

2026-10-29. Paired reference work before future implementation. Reuses the ten
accepted Match actions, their27 exact endpoint/runtime relations and the new
[V4 diagnostic](TRANSFORM-MANUAL-RANGES-V4-DIAGNOSTIC-DATA-RESULT.md). No original
input/command, old-batch rerun or product edit by DATA. The intended deliverable
is functional editing of all24 cells, with explicit bounded policies where the
original observations do not settle behavior.

## Direct evidence and its boundary

Original Transform65/tag31 has24 independently nullable finite-f32 cells: six
channels Rotate/X/Y/ScaleX/ScaleY/ShearY, four cells each in order FromStart,
FromEnd, ToStart, ToEnd. Storage permits partial absence, reversed/equal ranges,
negative zero and dormant/unmapped cells. These data must keep roundtripping;
mathematical usability for a new operation is a separate validation question.

The new saved source7bbd follows the actual unexpected **a→Escape→0** sequence,
then explicitly labeled diagnostic Save. It is not intentional literal0 entry,
the planned6→10 action, Backspace/empty-clear proof or a universal Escape rule.
Own process exited before a guarded snapshot/close; the independent copy uses
four stable filesystem reads and explicitly retains the unknown-exit limit.

Before, source X was2..6; after it is2..0. X→Rotate keeps20..28 and changes
scale2→−4. X→Y keeps35..47 and changes3→−6. ScaleY's .5..1.5 and its ScaleX/
Rotate routes retain scales2/8. All bones/global offsets/mixes/flags/references/
target order/route inventory/order stay exact. All ten mapped-side cells
materialize from24 absent cells: **2,3,4,5,10,11,14,15,16,17**. Fourteen unlinked
side cells remain absent. All four resulting runtime ratios are bit-exact f32.
The older27 Properties Match destinations independently satisfy the same
endpoint→runtime relation.

Thus linked recalculation and broad mapped-cache materialization have direct
saved-data support for this operation. Ordinary finite typing, clear/equal and
unmapped editing policies remain unobserved. Do not disguise the diagnostic as
a successful confirmatory finite oracle or keep every endpoint permanently
readonly merely because those remaining branches lack direct observations.

## Proposed one semantic native command

`setTransformRange { id, index, bits: u32 | null }`, with outer expectedRevision.
Index must be0..23. Channel=index/4; positions0/1 are source start/end and2/3
destination start/end. `Some(bits)` must pass FiniteF32::from_bits, preserving
the exact requested bits, including−0. `null` means an explicit clear intent;
it is not an omitted generic field, an empty numeric draft or zero coercion.

This operation needs authoritative persistent constraint/range state, not a
world-pose epoch: it changes parameter endpoints and their links without
sampling bones or advancing physics. Match retains its distinct evaluated
authoring context. Generic updateConstraint must continue preserving native
range bits and ignoring any writable cache echo. No frontend24-cell roundtrip
or locally rebuilt runtime graph is accepted as authority.

Capture stable constraint/document identity and revision before awaiting edits.
Resolve/validate/stage the complete result, then commit one history transaction.
Exact no-op creates no revision/history. Failure changes no cell, runtime field,
project, allocation state or history. Save awaits the field transaction; Undo/
Redo and binary Save/Close/Open retain runtime/cache presence and bits together.

## One coherent resolution and mutation proposal

These are **FBones policies for coordinator approval**, not universal original
manual semantics. Reuse/deduplicate Match's endpoint resolver instead of a
second independent Vue/default formula:

1. Explicit native cells override derived values. Missing destination endpoints
   derive from the first stored incoming route; missing source start derives
   from its From.offset, and missing end from the first stored destination's
   span/scale. Zero first-route scale falls back to span1 only when no explicit
   end resolves it. Entirely unlinked sides use0..1 for display/defaults.
2. Resolve the **old** complete endpoint table once. For a finite edit, replace
   only the intended endpoint, holding every other resolved endpoint fixed;
   editing Start must not silently translate its peer End to retain width.
3. A mapped-side edit materializes all currently mapped source/destination
   cells using that table, following the observed ten-cell behavior. Existing
   explicit peer bits remain exact; filling absent mapped peers is an
   intentional part of this authoring operation. Unmapped-side cells stay exact.
4. Source-side edits affect that source row's complete fan-out. Destination-side
   edits affect every incoming source row. Rebuild those rows' outgoing fields
   coherently: From.offset=sourceStart, To.offset/max=shared destination bounds,
   scale=`f32(f32(targetEnd−targetStart)/f32(sourceEnd−sourceStart))`. This row
   closure avoids changing a shared From.offset while leaving its other edges
   using an incompatible source origin. Disconnected source rows remain exact.
5. For preexisting conflicting incoming endpoints, the recorded first-incoming
   fallback chooses one shared range. Affected rows reconcile to it; unrelated
   disconnected runtime rows are not silently normalized. This is an explicit
   deterministic conflict policy, not a proven original response. Never let a
   loop's final assignment choose a hidden rule or reorder links to resolve it.

For the coherent observed2..0 fixture, these rules change only the two X
outgoing scales and materialize the ten mapped cells; ScaleY runtime fields
remain bit-identical. Other loaded conflicting/partial-cache cases need own
tests under the declared policy, not a claim that this one observation proves
their outcome.

## Explicit clear, equal and dormant policies

- **Clear:** remove only the requested explicit cell and resolve its effective
  value from current runtime fallback with other resolved peers held. Keep that
  requested cell None even while materializing the other mapped peers. Rebuild
  affected rows atomically. Clear may preserve the same displayed value while
  changing stored presence, or reveal a different derived value in a previously
  conflicting payload. This proposed derived-mode clear is **unmeasured**.
- **Mapped source span zero:** reject an operation requiring division by zero,
  including0/0, with every prior bit/history entry intact. Do not coerce NaN,
  substitute an unrelated later route or make loaded equal ranges unreadable.
- **Mapped destination span zero:** allow scale0 when the source span is valid.
  Reversed spans and negative scales are allowed. Finite endpoints whose f32
  arithmetic overflows or whose required denominator collapses reject atomically.
- **Unmapped/dormant side:** edit/clear its own cache cell only, preserve all
  other cells/routes and create no link. Every finite f32 bit remains supported
  here even if it would overflow a hypothetical future mapped division.
- **Exact same stored intent:** a native no-op stays no-op. None→Some equal to
  the displayed derived value is an intentional presence change only when the
  user actually submits it; untouched focus/blur/hover/foldout/Save sends nothing.
  Empty input is invalid unless the separate explicit Clear action is invoked.

## Hard preservation versus deliberate authoring

Hard preservation covers bones/bindings/attachments, all unrelated constraints,
global offsets/mixes/flags/source/ordered targets, route inventory/order,
unmapped cells, disconnected runtime rows and rejected/stale operations. No
tolerance, display rounding or normalized JSON equality replaces bit checks.

It does **not** require absent mapped peers to remain absent when this semantic
range operation deliberately materializes them. The earlier conservative
recommendation to preserve every unedited cache cell applied before direct
materialization evidence; retain it for generic updates and untouched controls,
while naming the purposeful mapped-cell mutation here. Requested finite bits
must be stored exactly; derived scales use the one declared finite-f32 policy.

Acceptance must include all24 cell positions, signed zero/subnormal/dormant
values, fan-out/fan-in/shared targets, partial/conflicting caches, no-op/UndoRedo,
invalid bits/index, equal/zero/overflow, explicit clear, failed/stale actions,
and actual field Enter/blur/Escape/Save behavior. Compare the own SourceEnd0
operation with observed7bbd fields under its honest diagnostic provenance;
do not claim reproduced original typing. One later new UI-authored file can be
checked in original without rerunning the accepted observations. Keep F308's
broader original behavior/interaction limits active after functional delivery.
