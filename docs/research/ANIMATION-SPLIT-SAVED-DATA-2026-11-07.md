# Independent saved split-axis source DATA check — 2026-11-07

Question: after the real production-store/Rust-Session H workflow, does the saved
artifact retain the entire original graph, raw f32 bits and object/string sharing,
except exactly two intended scalar keys and the known portable audio-root change?
This is a read-only artifact check. It reuses the frozen own reference-aware
Python reader and a separate isolated expected-model runner using the current
format codec. No original editor, runtime/export/parser batch, browser, GPU,
product source change or shared Cargo/test run occurs.

The source SHA256 is
`7f870f79f5f1829a14df6e7e8b04a2ab7ba4f8c78cedd4a768429c32c685b755`;
the saved SHA256 is
`d64dd637652492addecdf62225ea57c0f09df748adab62ef207b306586d7b319`.
The complete payload changes310454→310477bytes. Both full object streams and
exact trailers parse; compressed lengths, CRC64 and envelope markers validate.

The native receipt's first two successful authoring calls identify existing
TranslateX and TranslateY tracks on the same bone. The source clip lasts91frames;
both new linear keys are at92=`ceil(duration)+1`, frame bits `42b80000`:

| Intended key | Raw scalar value bits | Track keys before→after |
| --- | --- | --- |
| TranslateX / kind14 | `40400000` (3) | 9→10 |
| TranslateY / kind15 | `c49cb22f` | 4→5 |

Native transport's second value lane is exact+0; the wire contains exactly one
scalar value. The comparator verifies those key bodies independently and removes
only these two keys for comparison. No temporary AutoKey overwrite, joint-family
keys, duplicate clip, repeated history edits or saved working-draft pose remains
in the new artifact. Images stay `./images/`; audio changes `./audio/`→`./audio`.

After those explicit allowances, the entire original reachable typed graph is
identical under deterministic traversal identity numbering. All50,932 original
f32 scalar bits, object/string sharing relations, record/class/tag ordering and
collection ordering remain unchanged. This includes the ordered Generic116 mode1
configuration and bone identity, distinct X/Y times/curves/handles, every unrelated
track/key, Setup bone fields, Skeleton24 bounds and scalar46, full attachment
inventory, zero-size Mesh image metadata plus authored geometry/UVs/weights,
Sequence settings/frames/delays, Event definition/key and other metadata. The
comparator retains the full stream/arenas privately and adds no opaque product
payload or graph cache.

The separate Rust runner decodes the untouched source, appends exactly the two
addressed scalar keys, applies only the documented audio-root/wire normalization,
and compares the **whole expected typed model** to the saved decode. It then
encodes that expected model: all310477payload bytes and the entire deterministic
compressed envelope match the native Save As artifact. The source310454byte
payload independently re-encodes exactly. Bone-family keys change2228→2230;
20Sequence settings, one split configuration and one Event definition remain.
The Python graph check is independent of the product parser/encoder; the Rust
expected-model encoder is independent of native Session/history execution, not
a second implementation of the product format encoder.

All122 original/session/portable PNG triples hash identically. Original,
authorized source copy and session input project hashes are unchanged. Private
scripts, source/saved graph logs, normalized graph and raw/typed results remain
under `animation-split-implementation-2026-11-06/independent-data-v1/`. The runner
uses its own ignored Cargo target. Frozen format sources are pinned separately
from the new final artifact/gate evidence; earlier consumed manifests are intact.

This supports the coordinator's fourth bounded current-host editable-source
profile after its separate real native resource/sampling/key/history/Save/reopen
checks. This independent artifact comparison does not measure action latency,
Undo/Redo cost, native UI, GPU pixels or original independently encoded-file
acceptance. Any history-cost result must retain its measured interval (for
example100edits only); separate Undo/Redo success is not part of that latency/RSS
interval unless the driver includes it. Original acceptance, platform UI and full
compatibility remain pending, and F105 stays active.
