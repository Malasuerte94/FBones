# Multiple attachments in one slot — Spine 4.3.26

Research only. FBones still supports one attachment per slot. These observations
do not constitute an implementation or acceptance of a broader writer profile.
Evidence priority is controlled original 4.3.26 behavior/binary, then official
documentation, then explicitly identified inference.

## Proven by three fresh original-application cases

Our recipes contain one root bone, one slot, and two region attachments `A` and
`B` in the default skin. Both refer to our own generated PNG files under a
relative image root. Their names, image paths, dimensions and local transforms
are identical across recipes; only the slot's setup attachment changes.

Original Windows **Spine 4.3.26 Professional** imported and exported all three:

| Case | Slot setup attachment | Retained inventory | Decoded payload |
| --- | --- | --- | --- |
| active-a | A | A and B | 827 bytes |
| active-b | B | A and B | 827 bytes |
| active-none | null / omitted runtime attachment | A and B | 826 bytes |

The independent checker verifies that each runtime export matches its recipe,
including the inactive attachment's complete path and transforms. Changing the
active pointer does not remove, replace or duplicate an inventory item. The
original binary contains two Region records and one Slot record in every case.
This establishes the multiple-inventory/one-nullable-active-pointer model for
these default-skin region cases in the exact reference version.

Binary observations, using the existing independent research parser:

| Record / field | Observation in all three cases |
| --- | --- |
| Skeleton class 11, tag 6 | Two-item attachment inventory, ordered A then B |
| Skeleton 11, tag 13 | One-item slot/draw-order array |
| Slot class 13, tag 9 | Reference to A, reference to B, or null |
| Region class 43, tag 0 | Both records refer to the same owner slot |
| Region 43, tags 1 / 13 | Distinct attachment names / independent image paths |

These cases require no new observed record class or field tag beyond the
existing region schema. They require a broader typed model and reference graph.
The active attachment may be serialized inline from Slot tag 9, before the
inventory is written. In active-a it is A that appears there; in active-b it is
B. The inventory subsequently contains a back-reference to that existing
record and an inline record for the other attachment. In active-none both
regions first appear in the inventory. Domain reference numbers consequently
change with traversal; they must not be mistaken for stable attachment IDs.

In this controlled graph the Slot is domain index 4 and each Region owner link
contains encoded value 6, consistent with the established index-plus-two
reference representation. This numeric index is fixture-specific, not a fixed
slot address. The parser consumes the complete object graph and the remaining
12 bytes match the existing observed suffix exactly. No meaning is assigned to
unknown reserved/default fields merely because their values remain unchanged.

The existing Rust `minimal::regions::decode_regions` rejects every new case with
`UnsupportedProfile`. `ProjectEnvelope::inspect` accepts each valid envelope,
and its original bytes remain identical. No inactive attachment is discarded
to force these projects into an editable profile. The rejection follows the
current reader's explicit second-attachment guard; no application source was
changed for this research.

## Official documentation, separate from exact-patch proof

The current official [Slots guide](https://en.esotericsoftware.com/spine-slots/)
describes a slot as a bone-owned attachment container with at most one visible
attachment, including the state with none. Its draw order is a list of slots.
The [Attachments guide](https://us.esotericsoftware.com/spine-attachments)
describes changing the active attachment using its tree paperclip control and
identifies the active attachment as a property of the slot. This supports the
rendering rule: retain all alternatives but submit only the active attachment
for a slot. Two inventory alternatives must not be drawn over one another.

Those web pages were checked on 2026-10-28 and are not pinned to patch 4.3.26.
The three controlled imports/exports above prove the exact-version data model.
They do **not** prove a pixel rendering result, paperclip hit behavior, selection
versus activation gestures, or the exact original editor tree appearance.
No original GUI was opened or driven in this research, and no GPU overlap test
is reported as passing. Selecting a row and activating its attachment must
remain distinct concepts in the future model; exact UI gestures need an
appropriate controlled observation before being called equivalent.

The current official [Images guide](https://eu.esotericsoftware.com/spine-images)
also documents dropping an image onto an existing slot to create an attachment.
The current FBones placement path creates new slots. That is a known missing
workflow, not something these recipes already implemented.

## Evidence and reproduction

Ignored evidence is under `.local/research/slot-attachments/`: three recipes,
two generated PNGs, original `.spine` results, runtime exports, parsed trees,
`collection.log`, `codec-results.jsonl`, and our checker/temporary Rust probe.
The sanitized aggregate is `analysis/slot-attachments-check.json`; it contains
counts, hashes and evidence limits, without personal filesystem paths.

The collector invokes only the installed original's established CLI, through
the existing mapped workspace drive, with these arguments for each fresh case:

```text
Spine.exe --update 4.3.26 --disable-audio --hide-license
  --input <case>.json --output <case>.spine --import skeleton
Spine.exe --update 4.3.26 --disable-audio --hide-license
  --input <case>.spine --output <case>-export --export json
```

`collect.ps1` refuses an existing project output, since importing into an
existing file would merge skeletons and invalidate this differential case.
Logs show six successful operations using the selected 4.3.26 editor; the
launcher's own version banner is not the editor version. The existing accepted
foundation/oracle suites were not rerun.

After collection, checks were:

```sh
CARGO_HOME="$PWD/.tools/cargo" cargo build --offline \
  --manifest-path .local/research/slot-attachments/codec-check/Cargo.toml
.local/research/slot-attachments/codec-check/target/debug/slot-attachment-profile-check \
  .local/research/slot-attachments/active-a.spine \
  .local/research/slot-attachments/active-b.spine \
  .local/research/slot-attachments/active-none.spine
python3 .local/research/slot-attachments/check.py
```

The Rust probe calls the real current codec and immutable envelope API. The
Python checker separately validates framing/CRC64, runtime recipe equality,
binary inventory ownership/active pointer, known field layout and suffix.

## Unknown and required before implementation acceptance

Mixed region/mesh alternatives in one slot, custom skins and same-name entries
across skins, attachment animation keys, reference ordering after mutations,
rename/reparent/delete behavior, and independent FBones reserialization of
multiple alternatives remain unverified. No proprietary editor UI preference
or metadata field is inferred from the runtime JSON.

A future implementation needs separate attachment identity/inventory and
`activeAttachmentId: id | null`; slot draw order remains independent. That is a
design implication of the observed model, not a new proven binary field. The
writer must then reconstruct the graph and pass complete canonical equality
and new original-4.3.26 import/export comparisons before enabling edits.
