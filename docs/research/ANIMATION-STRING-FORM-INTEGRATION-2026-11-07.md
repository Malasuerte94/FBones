# Known lexical string-form integration

2026-11-07. This bounded persistence slice follows verified Scene Mesh512 and
slots512 support. E's two ASCII64bone strings directly prove the need for a
known length-prefixed form that differs from the writer's existing canonical
terminated ASCII. The user goal remains active; **the corpus remains4editable/
4guarded**. Reversing curves and declaration provenance are separate blockers.

Pre-code [DATA](ANIMATION-STRING-FORM-DATA-GATE-2026-11-07.md),
[UI](ANIMATION-STRING-FORM-UI-GATE-2026-11-07.md) and
[native review](ANIMATION-WIRE-PROVENANCE-NATIVE-REVIEW-2026-11-07.md) were read
before dependent coding. This models known spelling, not opaque record bytes.

## Implementation and policy

`WireStringAlias.encoding` optionally records `Utf8Length` plus the known
`source_text`. The reader records each actual definition's form and applies it
to all known aliased sites. A noncanonical singleton is retained; alias identity,
current text and representation remain distinct. The encoder enforces coherent
form within one current group. The default writer behavior is unchanged, so old
own ASCII strings above63retain their exact bytes.

Normalization partitions by existing group/current text, clears the marker after
any changed text (including a same-length rename), and removes canonical
singletons. Unchanged alias siblings keep their original form. Undo restores the
prior whole frame. Rename-away/back without Undo may remain canonical, an explicit
FBones metadata policy. Unsupported owners and unknown forms still fail complete
equality. No string/unit/name/path/generic budget expands or Unicode codec is
replaced; the existing length branch counts Java UTF-16 units.

Native stable-ID remapping already transfers/prunes the whole alias structure;
no native production control or DTO change was needed. Save validates normalized
saved/history resource-root plans before filesystem writes. A changed portable
root canonicalizes only its own marker; unrelated names/paths preserve theirs.
No encoding toggle, text widget, animation layout, solver or renderer changed.

## Verification and saved artifacts

Three new format checks cover both ASCII64forms, old long canonical bytes,
shared/singleton/equal-text separate definitions, conflicting metadata, renamed
siblings and full typed/payload/envelope roundtrip. Four new real Session checks
cover no-op/unrelated edits, same-length rename/history, owner deletion/index
reuse, resource name/path sharing and Region→Mesh tag remapping, portable root
normalization across history and stale-save/target protection. The first
conversion test correctly required a fresh constrained-geometry freeze; it now
asserts the unleased rejection before using the real pose epoch. Product guards
were not relaxed.

The own fixture has shared UTF A64Bone1/Slot0, UTF B64singleton, old canonical
ASCII C64, a marked image root and a shared marked attachment name/path. Its
Partial Translate base keeps all seven animation families and seven generated
PNGs. Production-store/real-Session checks pass working X/Y draft refresh and
non-baking Save, an unrelated X31=7key, same-length Bone1→D64rename with Slot0A64
retained, Undo/Redo, stale rejection and three portable reopens.

The [independent saved proof](ANIMATION-STRING-FORM-SAVED-DATA-2026-11-07.md)
checks all229originalf32fields, full tag/order/reference graph and declared
forms. Only the new X key, portable image-root change and final explicit name/
alias detachment differ. Payloads2531→2536→2600bytes; both expected typed models
reproduce every payload/envelope byte outside Session/history using the product
codec. The reference-aware Python graph/framing check is separate and independent,
not a second encoder implementation. Source and seven PNGs across all three
portable folders remain identical. Saved hashes:

- Keyed: `c0cddabc24d4aae2cb48b33d22c1083f7aac23bc32624c7bb49c1df246564382`.
- Renamed: `4b379a561e6ecc647d5f754beb115cde9273faac366f06fe7b2822bf6edfddfb`.

## Integration limits

Current host SHA256
`23772a787d0e8dddaff76f3dfbf43887bd000ce9bc5f66e323fc10b33d948152`
passes four actual-source and retained two-color/split/partial/Mesh512/slots512/
corpus workflows. All actual saved files and both large-profile saved artifacts
remain byte-identical to their earlier independent proofs. All original/copy
source hashes remain unchanged.399JS+one existing skip,313native/two ignored,
93Scene+16default format and95legacy/one ignored pass. Product/UI TypeScript,
production build, desktop check, strict Clippy, rustfmt and normal release pass.
109browser cases remain discovered/zero run; the known pre-page failure is not
retried unchanged.

Own empty isolated normal release SHA256
`301ec8398a3a5f134f98c552e82d2f94f6ca8696d84adad4b812dd5528aad391`
exits101 at GTK initialization; no current normal window is left available.
No Windows selection/publish/user or original window changed. Native OS/GPU/
original4.3.26 independently encoded acceptance remains unobserved.

The separate declaration DATA/UI gate now has an ignored prototype reproducing
all728346Epayload bytes with typed declaration vectors and only the time predicate
omitted for static inspection. It does not admit E or prove interpolation.
Production declarations and time guards remain unchanged in this lexical slice.
Next preserve declaration arrays separately from global execution order, including
full canonical provenance at a None→Some transition; never materialize empty
alias metadata or guess curve inversion. Current aggregate checkpoint:
`analysis/animation-string-form-check.json`. Raw receipts/failures stay ignored.
