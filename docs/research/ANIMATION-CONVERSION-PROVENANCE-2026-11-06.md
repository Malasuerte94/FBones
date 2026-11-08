# Real-project conversion provenance and next parser boundaries

2026-11-06. Read-only inspection of the user-authorized Vampir materials and
relevant historical conversion copies. No original process was started or
operated. No production parser, codec guard or product state changed here.

## Conversion receipts: observed

All eight `verificare.json` receipts name version4.3.26, and all eight recorded
project hashes match the supplied `.spine` bytes. Their retained conversion logs
contain four exact `Spine 4.3.26 Professional` banners and four `Complete.`
markers per project. The stages include runtime JSON export, project import at
scale0.5, atlas unpacking and final JSON export. These are retained user-supplied
logs, not newly observed process/exit receipts from this session.

The eight source `.skel` headers independently contain version4.3.26. The logs
also retain **315 warnings that nonessential mesh internal edges were already
lost when exporting**. This loss precedes our import; do not attribute it to
FBones or claim the converted editor project contains every original runtime
authoring detail.

There is no retained `import.json` or skeleton runtime JSON in the supplied
Vampir tree. A relevant historical local Vampir dataset likewise retains
converted projects/receipts, not those temporary JSON inputs. Several historical
project payloads equal the current inputs outside the16-byte project identity;
others differ. Historical copies therefore provide reuse candidates, not an
independent oracle or grounds to overwrite current copies.

Private hashes, input locations and per-project counts are retained in
`.local/research/vampir-2026-11-06/conversion-provenance-v1/`:
`conversion-receipts.json` and `historical-comparison.json`. No private project,
texture, log content or local absolute path is included in this note.

## Generic116: a useful corrected grammar hypothesis

The first nonempty generic116 appears in animation18 field8 in four projects.
Treating it as an ordinary object array fails: after each Bone12 entry, another
small integer remains before the following entry or animation field.

A disposable reader that consumes **count × (object reference, varuint)**
instead aligns all four first collections:

| First collection size | Observed trailing values | Cases |
| --- | --- | --- |
| 2 | 1,1 | 2 |
| 1 | 2 | 1 |
| 1 | 1 | 1 |

Every inspected first key object is Bone12. The bone records can introduce
further referenced records before their enclosing first collection finishes.
The set-of-bones hypothesis from the earlier plan is therefore incomplete;
the bytes are consistent with a bone-to-integer map. Integer meaning, signed
encoding, permitted values, ordering and relationship to animation behavior
remain **unknown**. In particular, no flag, inheritance, selection, mixing or
sequence interpretation is established, and the precise relation to all groups
of an animation is not yet proven.

This changes the next research action: recover the complete reference/value
map before assigning semantics. Do not discard the integer or enable editing
because a bone reference can be extracted.

## Additional downstream boundaries

The ignored probe briefly tests candidate class123 and kind22 shapes only to
locate the next failure. These hypotheses are not production support or a
successful whole-project parse:

- After the corrected generic116 pairs, two projects reach kind22. Their first
  target reference resolves to **Slot13**, followed by another object whose
  class is Region43 or Mesh46. A single attachment-target field is therefore
  insufficient for the apparent kind22 grammar.
- Another project next reaches previously unmodeled object69.
- Another next reaches custom timeline132 **kind14**, with apparent scalar key
  data. Its meaning is unknown. Do not implement it as alpha or inheritance
  from the numeric ID alone.

The current reader must continue rejecting these families. The independent
Paylines metadata/order investigation concerns already understood record
families and does not prove support for any of these unknowns.

## Reproduction and scope

The pinned own disposable crate is
`.local/research/vampir-2026-11-06/conversion-provenance-v1/generic116-probe/`.
It is cloned from our format crate and emits reader positions/reference classes;
it neither writes projects nor claims semantic decoding. Its current source
pins and input hashes are in `tool-final-manifest.json` (the earlier manifest
is preserved), with raw outputs
`generic116-probe.log`, `generic116-pairs-trace.log` and
`generic116-relation-v2.log` retained separately. The final additional
`generic116-group-relation.log` could not finish an enclosing first animation
group before the next unknown family; it does not establish group membership.

Run its `probe` example with feature `scene-codec` against the four pinned
copies listed in the private source manifest. Use the workspace Cargo cache
and offline mode. The ordinary object-array failure, corrected pair alignment
and later speculative grammar boundary are different experiments; only the
last uses candidate class123/kind22 support. No whole-payload equality or
compatibility acceptance follows from any of them.

The next original experiment remains the controlled own Sequence fixture in
[the Sequence probe plan](ANIMATION-SEQUENCE-NEXT-PROBE-2026-11-06.md).
Generic116 requires its own discriminating reference case once its actual
animation relation is known. Deferred Physics/Match/JVM probes remain deferred.
