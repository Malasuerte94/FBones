# Transform editor ranges: typed codec and preservation handoff

Recorded2026-10-29, read-only preparation. Source evidence is the eight **new**
owned original4.3.26 Match actions in
`analysis/transform-match-reference-check.json` and the paired
`TRANSFORM-MATCH-{DATA,UI}-4.3.26.md` memos. No original input, command, accepted
batch rerun or production change was performed for this handoff.

## Proven wire structure; current guard is correct

Transform65/tag31 is a generic array reference followed by varuint25 and exactly
24 nullable float32 entries. Each entry is0 for absent or1 followed by its four
float bytes. Order is Rotate/X/Y/ScaleX/ScaleY/ShearY, with four cells per channel:
source start, source end, destination start, destination end. Original identity
Properties Match fills all24 cells; the sparse mixed cross-property case fills
only mapped source/destination cells and leaves the others absent. Reversed
source spans are demonstrated; endpoint order must not be normalized.

Earlier all-zero payloads were24 absent markers, not six zero float32 numbers.
Current production emits `PackedFloats(vec![0.0;6])` in
`minimal/scene/write.rs`, and its matching reader consumes six floats. Those
bytes happen to match the absent case. The existing complete reserialization
guard rejects nondefault original ranges; do not weaken that protection.

## Proposed full typed model

Use six channel records with four **independent** nullable finite-f32 cells:

```rust
struct TransformEditorRange {
    source_start: Option<FiniteF32>,
    source_end: Option<FiniteF32>,
    destination_start: Option<FiniteF32>,
    destination_end: Option<FiniteF32>,
}
// TransformConstraint:
editor_ranges: [TransformEditorRange; 6]
```

`FiniteF32` here denotes a proposed typed value, not opaque bytes. It should
retain the original f32 bits and compare them bitwise, including signed zero.
All-none is the default and must retain every existing canonical golden byte.
An equivalent24-cell typed array is acceptable if named channel/side accessors
prevent index confusion. Do not collapse four independent nullable cells into
one optional pair: paired presence is observed, but arbitrary partial endpoint
states have not been disproved. Do not impose start≤end, nonzero span or a
formula-derived consistency rule on stored editor state without new evidence.

Replace the incorrect packed-six-floats field kind for this use with an actual
nullable-array field/value type. Parsing must enforce exactly24 entries, valid
presence markers, finite payloads, arena-reference kind and bounds. Writing
must preserve nullable markers, f32 bits, field order and generic-reference
accounting. An old unknown field/reference/layout must still be rejected by
full payload equality. This is a typed extension, not an opaque pass-through.

Runtime From/To records remain independent fields: From offset and each To's
offset/max/scale. The evaluator currently uses those, not tag31. Preserve both;
do not regenerate one from the other during ordinary loading or saving.

## Confirmed native/DTO data-loss risk

The current update path **replaces** the whole constraint:

1. `scene_bridge.rs::UpdateConstraint` assigns `constraint.build(next)?`.
2. `scene_constraints.rs::ConstraintInput::Transform::build` constructs a fresh
   `TransformConstraint` from the current input fields.
3. `scene_bridge.rs::constraint_views` and TS `TransformConstraintInput` expose
   offsets/mixes/mappings but no editor ranges.

Adding only the format field with a default would therefore allow recognition
followed by silent cache clearing on an unrelated constraint update. History
cloning alone cannot protect against that replacement. Treat format, native
update preservation, DTO transport and inspector editing as one integration.

Suggested native contract: generic updates preserve the existing typed ranges
when the field is omitted; new constraints default to all-none. Explicit range
editing/Properties Match needs an intentional typed operation that atomically
updates the relevant cells **and** runtime mappings, in one history entry.
Clear-to-none must be an explicit operation, not omitted-input behavior.
Changing constraint kind is also explicit; do not preserve a transform cache
onto an unrelated IK/Physics object.

Do not round-trip unchanged cells through editable JS numbers. JSON serialization
turns JavaScript−0 into0. Options include keeping authoritative range bits native
and sending only intended cell patches, or carrying exact typed bit metadata
alongside a numeric view. A numeric-equivalent echo must retain the old cell's
bits. Inspector drafts, cloning, field flush, undo/redo, save-as and close/open
must all preserve cells that were not explicitly edited.

## Safe staging; no premature editability

Prefer one coordinated codec/native/DTO/UI change. If codec recognition lands
first, keep any nondefault-range document inspection-only until preservation
and the inspector contract are complete. Native open currently accepts a
canonical decoded Scene as editable, so recognition alone is insufficient.
Use the existing inspected-document/lossless-copy path for such files; never
re-encode them with all-none ranges. A narrower interim guard can allow only
proved cache-preserving operations, but must reject unsupported mapping/range
updates atomically rather than silently retain stale or erase data.

Bone remapping and constraint reorder already mutate links/order in place;
they should retain the new fields unchanged. Audit every full constructor,
replacement, clone and TS draft before enabling nondefault-range editing.

## Match math remains a separate gate

The new data establishes both buttons, first ordered target, local/local and
world/world offset behavior, and one world-source/local-target cross-property
case. It does **not** fully identify:

- Local-source/world-target translation framing, angular branch wrapping,
  additive behavior, singular behavior or partially mixed/evaluated target poses.
- The source of the frame used by Match when earlier/later constraints modify
  source/targets; the new fixtures deliberately use mixes0.
- Exact decomposition/rounding. Reflected world ranges have signed negative X
  scale; local shear ranges differ by90 degrees from authored shear. Endpoint
  rounding changes runtime scales slightly. Sparse shared source spans follow
  the first destination and can reverse an inconsistent second route's scale.

Thus typed lossless preservation can be implemented independently of a Match
button; a simple subtraction button is not justified by the codec work.

## Meaningful acceptance sequence

1. Byte-identical all-none goldens plus independently parsed all-present and
   sparse/reversed nullable-range own cases. Include signed zero, malformed
   count/presence, nonfinite values, wrong references and truncation.
2. Native unrelated mix/name/bone/order edits retain every untouched cell bit;
   omitted-field updates preserve, explicit clears are intentional, stale or
   invalid operations leave DTO/history unchanged. Undo/redo and typed native
   save/close/reopen retain both editor ranges and runtime mappings.
3. Actual inspector selection, untouched field blur, Enter/Escape, save flush
   and mapping edits preserve precision and unmodified null cells. A DTO-only
   codec test is not evidence of a safe inspector.
4. Only then compare supported Match operations against the **existing** eight
   snapshots, with remaining assumptions labeled. Do not rerun accepted
   original actions merely to test our own reader or UI.

## Coordinated typed codec checkpoint, 2026-10-29

The coordinator opened the paired gate in
`TRANSFORM-RANGES-IMPLEMENTATION-POLICY.md`. The codec now implements
`TransformConstraint.editor_ranges: [TransformEditorRange; 6]`, with four named
independent `Option<FiniteF32>` cells per row. `FiniteF32` stores private checked
finite bits, compares bitwise and exposes `new`, `from_bits`, `get`, `to_bits`.
Rows expose checked `from_bits` and `bits`; constraints expose
`editor_range_bits() -> [Option<u32>; 24]` for lossless view metadata.

Transform65/tag31 now uses an actual count25 nullable array rather than the
historical packed-six-floats coincidence described above. Presence markers,
finite payloads, exact count, generic-reference kind and complete canonical
reserialization remain strict. No endpoint ordering, paired-null or mapping
consistency rule is invented. Validation cannot construct a nonfinite cell
through the public checked model. The default preserves the complete previous
own1214-byte golden with CRC64 `8ef60f0aae3a316a`.

`cargo test -p fbones-format --features scene-codec` passes28 tests, including
six new range groups. Strict all-target Clippy passes with all features and
with no default features. Logs are ignored `.local/f308-format-*.log`.

Offline actual-source audit `analysis/f308-range-codec-original-check.json`
(SHA256 `cbde6737591f119aa07bc5bf43634dbb5840fb0575d34f61f89ea727194df90b`)
probes eight accepted original AFTER snapshots without any original command:
all eight whole GUI payloads remain UnsupportedProfile under the unchanged
complete canonical guard. They were not stripped or rewritten. Separately,
independently extracted tag31 values instantiate our own canonical typed
scenes and round-trip8/8,192 nullable cells including82 present values. That is
field-projection evidence, not recognition of the full original GUI files.

Native same-kind update preservation and read-only bit DTO integration are the
other worker's coordinated change; final whole-app acceptance remains with the
coordinator. Match formulas and writable range synchronization are still open
F308 work, not completed by this codec checkpoint.

A distinct NEW actual UI-authored canonical source, SHA256
`74f051f68217c1ea09a54fcb3e8eff266c230038f2677fb37fee5e8a2cc70c39`,
subsequently passed one original4.3.26 export, exit0. Independent
`analysis/f308-ranges-ui-original-check.json` (SHA256
`51713e726487649dbcf3b2a05a36c2bec19ee0e8a6145ebc1ab454428eda74b9`)
checks envelope CRC/length, source/copy/resource hashes, three bones/two
constraints, runtime properties/settings and48 nullable cells (10 present,
38 absent). The exact own seed, captured initial constraint, saved raw/native
state and reopened summary retain negative zero, a negative minimum subnormal,
positive zero distinct from absence and reversed endpoints. Name/mix/mapping
changes do not alter caches. Runtime JSON does not expose those editor cells;
their verification comes from the binary and native stages, not a fabricated
JSON field. This new bounded artifact does not change the older eight whole
GUI payloads' UnsupportedProfile result, nor implement original Match gestures.
