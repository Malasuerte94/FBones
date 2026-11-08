# Large Scene Mesh independent saved-data proof — 2026-11-07

The [paired DATA gate](ANIMATION-LARGE-MESH-DATA-GATE-2026-11-07.md) is implemented
with Scene Mesh512 vertices/3072 triangle indices and contextual UV1024. Legacy
Mesh256, Clipping256, binding128 and all unrelated limits remain unchanged.
This note separates two independent data checks; neither proves original-editor
acceptance, pixels, browser or platform behavior.

## Isolated retained E meshes

The complete retained exact4.3.26 E graph supplies three Meshes with301/308/308
vertices. A new ignored diagnostic project retains their complete Mesh fields,
UVs, topology, dense bindings, zero image dimensions, Sequence/color data and
required249-bone reference context. It is a new wrapper, not a partial import or
an editable E project. Owner slots map explicitly to three wrapper slots.

An independent reference-aware raw reader compares every Mesh-owned record/tag
order, generic sharing, binding/vertex/Sequence identities and30,472 f32 fields.
All match the retained source graph. Included bone/slot/attachment name aliases
also match. Separately the expected typed wrapper roundtrips its entire167725-byte
payload and compressed envelope exactly. Wrapper SHA256:
`b0b6691f7f1ab7888ce6ab2c5c3d4a406bb310d6e2c709723fad4b534b607fc7`.
No private source names, coordinates, assets or raw paths are included here.

E still requires265 slots and genuinely reversing curves. Large-Mesh support
resolves this geometry prerequisite only; no E admission or new curve policy.

## Own512-vertex real-Session saved artifact

The coordinator's production-store/real Rust Session receipt supplies the source,
saved file and one whole-mesh AutoKey command. Independent inspection checks its
compressed framing, CRC64, length/trailer and complete reference-aware raw graph.
Removing exactly one new linear Deform key at frame21 with2048 coordinates
alternating4.25/5.5 restores the original graph, including all8,264 original f32
scalars, record/list order and reference sharing. The only additional difference
is images root `./images` → `./images/`; audio `./audio` is unchanged.

A separate typed-model check builds that expected change from the source and
requires whole-model equality plus every expected payload and compressed-envelope
byte. It passes:37229 source payload bytes,45436 saved bytes. Both original PNGs
and their portable copies retain their pinned hashes; source bytes are unchanged.
Saved SHA256:
`7b8e99e63dda30def5f4d174a8b7907aa44531f78e61171064542a810756e9ef`.
Native receipt host SHA256:
`d4fcdea1ea5d68bff8e8b864d0860f7bd69e10a40928fd38259ef253e31a2d02`.
This independent check measures persistence, not performance or rendered output.

## Reproduction and limits

Ignored `animation-large-mesh-data-2026-11-07` retains the E extractor, expected
wrapper runner, independent graph checker, source graph pins and all failed
attempts. Ignored `animation-large-mesh-2026-11-07/independent-data-v1` retains
the own512 raw checker and separate expected-model runner. Its first typed probe
incorrectly assumed a one-clip fixture; it was corrected to resolve the command's
named target clip, preserving the other clip. Both attempts are retained.

Focused format87/default16 and strict Clippy pass. Four current actual admitted
source payloads reencode exactly; full E remains rejected. Coordinator owns
shared integration, native/live triangulation comparisons and launch results.
The final post-format format-source manifest SHA256 is
`e2dbbe5290a7f16a83c66e0be901056aa50b59e66ab52f6beff34bae98768387`.
The aggregate ignored evidence manifest pins tools, outcomes and this note;
consumed earlier manifests are retained unchanged. No original/runtime batch was
rerun. Next guarded-source semantics remain independently reference-first.
