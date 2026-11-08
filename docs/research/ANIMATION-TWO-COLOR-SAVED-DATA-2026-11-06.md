# Independent saved two-color source DATA check — 2026-11-06

Question: after the real native mixed Bone+Dark key/history/resource/Save workflow,
does the new saved source retain every original field, raw numeric bit and
reference identity except the two intended keys and portable root normalization?
This read-only artifact check uses the frozen own reference-aware Python graph
reader and a separate own expected-model runner using the current format codec.
No original editor, runtime export/parser batch, browser, GPU or shared suite ran.

The native receipt identifies source SHA256
`bab772423fb5df0f99eebea3c578c9530bbadef0819d288920891a00dc7d0b07`
and new saved SHA256
`eedc3fb8803ea4b720ee6160d2cf59a895d97427cd738d0ea5d72418b7848882`.
Source payload is363416bytes; saved payload is363467bytes. Both complete streams,
exact object trailer, envelope lengths/CRC64 and markers validate independently.

The graph comparator addresses the native receipt's stable IDs through the
unchanged source animation/bone/slot identities. It verifies and removes only:

- One linear Translate key at frame21, raw values `4396068f,c2f67c4c`.
- One linear joint lightRGBA/darkRGB key at frame21, raw values
  `3e800000,3f000000,3f400000,3f4ccccd,3f400000,3f000000,3e800000`.

Both existing tracks gain exactly one key; original keys remain unchanged. The
only root change is audio `./audio/` to `./audio`; images stay `./images/`.
After accounting for those changes, the entire reachable typed graph compares
identically under stable traversal identity numbering. This preserves every
original object/string sharing relation, record/class/tag order, collection order
and all62,280 original f32 scalar bits. In particular it preserves Skeleton24's
four source bounds, Transform Setup−1 lanes, the valid crossed bone-time handles,
all light/dark keys, Sequence frames/delays/settings, attachment topology, UVs,
vertices/weights, inventory/layout and unrelated metadata. No opaque payload or
graph storage is added to product code.

A separate isolated Rust runner decodes the unmodified source, appends exactly
those two addressed keys, applies only the documented audio-root normalization
and known wire normalization, and compares the **whole expected typed model** to
the saved decode. It then independently encodes that expected model: all363467
payload bytes and the complete deterministic compressed envelope equal the native
Save As artifact. Source payload also independently re-encodes exactly. Bone keys
change3975→3976; light/joint-color keys1638→1639;29Sequence settings and2Setup dark
rows remain unchanged. The reference-aware Python comparison is independent of
the format implementation; the expected-model encoder is independent of the
Session/history workflow, not a second implementation of the product encoder.

All190 original PNGs, session copies and portable saved copies hash identically;
original/source/session project hashes remain unchanged. Private scripts, logs,
normalized graph and result receipts are retained under
`animation-two-color-implementation-2026-11-06/independent-data-v1/`, including
`raw-result.json` and `typed-result.json`. The Rust runner uses its own ignored
Cargo target; no shared build/test output was touched.

This supports the coordinator's bounded current-host native edit/history/save
profile after the separately recorded evaluator-preflight correction. Original
independently encoded-file acceptance, rendered pixels, native platform UI and
full compatibility remain unobserved and unclaimed. F105 remains active.
