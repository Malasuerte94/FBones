# Skeleton11/tag24 source metadata DATA gate — 2026-11-06

Before dependent field implementation. The ignored A capacity copy now includes
only the proposed capacity/per-clip deltas and the separately gated bone-time /
Transform Setup-mix corrections. All typed validators pass. Complete equality
still correctly rejects **16bytes**, with equal363,416-byte payload lengths.
No equality, schema or unknown-field guard was bypassed and product capacities
remain unchanged.

The remaining bytes are exactly Skeleton11/tag24's known fixed four-f32 array:

| Lane | Source value | Exact f32 bits | Existing writer |
| --- | ---: | --- | --- |
| 0 | −3953.1513671875 | c577126c | +0 |
| 1 | −2130.650390625 | c5052a68 | +0 |
| 2 | 7801.15087890625 | 45f3c935 | +0 |
| 3 | 5059.087890625 | 459e18b4 | +0 |

The first differing byte is362,180; the span ends before362,196. All other363,400
payload bytes are already identical. The current canonical writer emits a known
four-element FloatArray of positive zeros; this field is not an unparsed blob.
The retained reference-aware reader accounts for its exact shape and whole
source trailer. No new original or runtime decoder run was performed.

A targeted **static** inspection of the pinned supplied `.skel` header, following
the installed official4.3.13 reader grammar, reads fields named x,y,width,height
as ordinary f32 values. Header x/y exactly match the first two editor values;
width/height are7801.1513671875and5059.08837890625, each one f32ULP above the
editor value. The header grammar does not apply coordinate import scale to those
four fields. This supports a bounds-like metadata identity but does not establish
original editor recomputation, cache lifetime or UI behavior. Preserve every
editor bit; do not apply0.5, replace values from the runtime export or “correct”
the one-ULP differences.

## Typed preservation contract

Add `SceneWire.skeleton_bounds_24:[FiniteF32;4]`, canonical default positive zero
in every lane. Decode the known fixed four-element field into this typed finite
metadata during expanded provenance capture, and write those exact bits only
when present. Canonical files remain wireNone and retain their old bytes;
canonical-transition normalization may drop metadata only when all four exact
bits are positive zero and the existing complete validated equality rule permits.
No raw object graph, payload bytes or opaque template is retained in the product.

All finite f32 values, including negative zero, are retained. Do not infer
positive width/height, min/max ordering, coordinate limits or a semantic box
validator beyond the proven finite shape. This field has **no authoring,
rendering, geometry, resource-dimension or viewport-fit authority**. Structural
edits and Save preserve it independently of evaluated poses; no recomputation,
normalization, texture fallback or per-frame mutation is introduced. Native
SceneWire constructors get the explicit zero default and ordinary stable-ID
remapping leaves this address-free numeric array untouched.

The paired UI gate must confirm that no new control/layout or source-bound-based
fit is introduced. Own codec cases must cover nonzero/negative-zero raw bits,
unchanged other wire metadata/layout/keys, canonical absence, exact transitions
and nonfinite rejection. The diagnosed ignored A retry must then require full
independent payload equality with this one known-field correction; report any
next mismatch rather than dropping it. Native admission, capacity decisions,
rendering and original new-file acceptance remain separate coordinator gates.

Private evidence: `animation-two-color-capacity-2026-11-06/` retains
`equality-mismatch-summary-v1.json`, `skeleton-bounds-runtime-header-v1.json`,
known-field span inspection and the rejected typed rewrite. Original/project/
runtime hashes remain pinned and source data unchanged.

## Implemented verification

The typed finite array is now retained and emitted exactly. Bounded FloatArray
parsing retains its actual values rather than only validating/discarding them;
its existing count guard remains unchanged. Own tests cover negative-zero and
nonzero bits, unchanged other metadata/keys, canonical absence/transition and
NaN/infinity rejection. The initial diagnosed retry that still discarded the
array is retained, followed by the narrowly corrected complete equality receipt.

The final ignored capacity prototype and current product format both independently
reproduce A's entire363416byte payload, including the exact16byte field. Product
format73tests, legacy16tests and strict Clippy pass. No bounds-based preview, UI,
resource sizing, geometry or runtime recomputation was introduced. Native actual
edit/history/Save verification remains the coordinator's separate next gate.
