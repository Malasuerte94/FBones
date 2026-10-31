# F308 typed Transform range preservation — integration policy

Recorded 2026-10-29 before dependent edits, after paired DATA/UI gate reports.
Reuse the accepted exact4.3.26 eight-action snapshots and
TRANSFORM-RANGES-CODEC-HANDOFF.md plus TRANSFORM-MATCH-STATIC-{DATA,UI}-HANDOFF.md.
No new original collection or accepted-batch repetition is required here.

Directly proven: tag31 holds 24 independently nullable finite f32 cells, ordered
Rotate/X/Y/ScaleX/ScaleY/ShearY, each sourceStart/sourceEnd/targetStart/targetEnd.
All-none bytes match the previously accepted default. Sparse/reversed ranges
exist. Runtime mapping fields and editor ranges are stored independently.
Unknown: general Match extraction/rounding, manual endpoint edits/clear rules,
shared-source reconciliation, evaluated-stage and unsupported space branches.

Implement the full typed codec with bitwise finite values and named row cells;
retain bounded parsing, exact complete reserialization and all-none goldens.
Recognize nondefault ranges only with simultaneous native/DTO/UI preservation.
Do not add range ordering, paired-null or formula-consistency restrictions.

Native new constraints get all-none. An ordinary same-kind Transform update
preserves all native range bits, including mapping changes, name/mix/flags and
source/target changes. This is an explicit preservation policy, not a claim
that original manual controls retain caches identically. Changing kind does not
carry a Transform cache into another kind. No writable range field or guessed
Match/clear action is introduced in this step.

The view sends editorRangeBits: 24 nullable u32 IEEE754 bit patterns; no
floating-number echo is authoritative. Every u32 is exactly representable in
JavaScript, including negative-zero bits. UI range display is read-only, clearly
stored values/absent cells rather than guessed derived values. Ordinary update
requests strip view-only metadata. Numeric edits retain native stored ranges;
opening/folding/selecting/blur/Save must not materialize absent cells.

Tests must cover finite/signed-zero/subnormal/extreme cells, sparse/partial/
reversed rows, parser failures and preserved canonical guards; whole native
update/clone/remap/history/save/close/open bits; actual inspector mapping/name/
mix/draft/Save behavior on nondefault ranges. Compare any available original
saved cache fields offline, without rerunning their original actions. Keep
unsupported GUI files inspection-only if other unmodeled data remains.

This enables correct data preservation and inspection; F308 remains ACTIVE
until the requested Transform Match/interaction behavior is implemented and
verified. It does not redefine the complete feature as a read-only range table.
