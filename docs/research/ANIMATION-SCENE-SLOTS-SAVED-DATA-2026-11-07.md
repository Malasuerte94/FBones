# Scene512 slots independent saved-data proof — 2026-11-07

The approved [DATA capacity gate](ANIMATION-SLOT-CAPACITY-DATA-GATE-2026-11-07.md)
now has independent persistence proof for the coordinator's own production-store /
real Rust Session artifact. No original, runtime batch, browser or renderer ran
for this independent check.

The source has512 slots/512 ordered attachments, an empty first slot and two
inactive tail alternatives. Its two named clips and existing color/attachment/
draw-order keys remain intact. The reference-aware raw reader removes exactly
three new frame21 keys: full reverse order512 (511 literal offset records), tail
lightRGBA0.15/0.25/0.35/0.45 with dormant dark+0, and tail attachmentNone. The only
additional change is images `./images`→`./images/`; audio `./audio` is unchanged.
The complete remaining graph is identical, including4,162 original f32 values,
record/tag/collection order and generic/domain reference sharing. Both source PNGs
and portable copies retain hashes; the source file is unchanged.

A separate typed check starts from the source, resolves the command's named clip,
builds those exact three edits, and requires entire expected model, payload and
compressed-envelope equality. All pass:72967 source payload bytes,77500 saved.
Saved SHA256:
`fbbe7cc66bacddfba8c55673b17a6b9197e27a9a36226bc91776eb38983f7b1c`.
Native host SHA256:
`e89ec00faf12a449b27733d224e0790f1c070ba44a52cda785a61d1a8f3d9a62`.
Final post-format format-source manifest SHA256:
`0e9603c6c2b6e8d29e1ed025cfc320cbac28eab9c16aa991c3673d2cfe639334`.

Ignored `animation-scene-slots-2026-11-07/independent-data-v1` retains source/tool
pins, raw graphs, receipt-correlated checks and the separate expected-model runner.
The frozen own raw reader verifies full framing/CRC64/length/trailer as well as
all bytes consumed. Native action/DTO/resource behavior belongs to the separate
integration receipt; these independent checks make no timing or visual claim.

The four admitted source payloads remain exact; full E remains guarded. The
[new bounded E diagnostic](ANIMATION-E-STATIC-CLOSURE-DATA-2026-11-07.md) also
identifies source wire-provenance requirements beyond its reversing curves.
