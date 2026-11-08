# Known string wire-form preservation DATA gate — 2026-11-07

Before product edits. Question: can a known string's original lexical form be
preserved without globally changing canonical string encoding or caching opaque
payloads? Reuse the [static E diagnostic](ANIMATION-E-STATIC-CLOSURE-DATA-2026-11-07.md)
and paired [UI gate](ANIMATION-STRING-FORM-UI-GATE-2026-11-07.md). No original or
runtime launch is needed; declaration inventory and reversing curves are separate.

## Directly proven discrepancy

Exactly two fresh E Bone12/tag1 strings (bone indices13 and16) are64-character
ASCII. Each uses an explicit UTF8 length prefix `c1 01`; current independent writer
uses its accepted terminated-ASCII form. The original payload728346 rewrites to
728342 bytes when only reversing-time rejection is omitted in an ignored copy;
first difference5907 is that known header choice. Generic string identity and
semantic text differ from wire spelling. Empty/single-character encodings remain
under existing grammar; the targeted count excludes them. No private text is
copied here. Source/copy hashes remain pinned and unchanged.

The four-byte length delta does not prove all other fields equal. Independent
comparison separately finds Physics/Transform declaration-order changes. This
feature must preserve production's whole-reserialization guard and cannot by
itself admit E or authorize any reversing-time sampling behavior.

## Proposed typed persistence contract

Keep current writer's canonical threshold/choice unchanged for newly authored
strings and old FBones files, including terminated ASCII longer than63. Add a
known lexical override to existing addressable string provenance, distinct from
its owner/tag, current text and alias identity. Proposed public API:

- `WireStringAlias.encoding: Option<WireStringEncoding>`; absent retains current
  canonical behavior.
- `WireStringEncoding { form: WireStringForm, source_text: String }`, initially
  only `WireStringForm::Utf8Length`. The text snapshot is a typed known semantic
  value used only to detect a changed field, not serialized raw bytes or a graph.

The exact API remains coordinator/reviewer-approved before coding. Capture an
exception only when an actually observed generic string body's known form differs
from the existing canonical form. Address it by typed owner/tag, never generic
arena index. Aliased sites share one body's form. Preserve unchanged names,
source roots and their alias siblings exactly through no-op, unrelated edits,
Save, Undo/Redo, history/resource rebase and slot/bone/constraint remapping.

Normalizer partitions aliases by `(group,currentText)` as today, clears a marker
when `source_text != currentText` (including same-length renames), and retains a
singleton only while its noncanonical encoding is still required. The encoder
must reject conflicting forms within one current shared group. Deterministic
normalization makes edited-model versus reopened-model metadata equal. Unchanged
source aliases retain their form when a renamed sibling detaches; new fields and
changed values use the existing canonical encoding. Undo restores its captured
prior form; renaming away and back without Undo may remain canonical after the
marker has been discarded, an explicit FBones metadata policy.

Native remapping must preserve the marker with its stable owner; deletion prunes
it. Duplication/new fields follow existing fresh-identity policy. SaveAs root
rewrites outside history must normalize before publication and before irreversible
filesystem writes. Do not broaden accepted unknown string owners or event-key
alias sites merely because this form can be encoded; whole equality still fails
closed on any unmodeled provenance.

## Minimum acceptance

Own fixtures must independently encode both known forms of the same64ASCII text
and preserve full model/payload/envelope equality, including old canonical ASCII
above63. Cover source-marked singleton/shared groups, unrelated edits, rename
one alias sibling, same-length rename, deletion/remap, Undo/Redo and SaveAs root
normalization. Malformed/contradictory metadata and unsupported profiles reject
atomically. Four admitted actual payloads remain exact and production E remains
guarded by reversing time and any other unmodeled fields/order. Reopen equality
must include metadata; no string-value-only comparison or removed guard suffices.
No appearance, typing behavior, original edit gesture or original acceptance is
inferred from this lexical preservation change.

## Approved format checkpoint

Coordinator accepted this DATA gate, paired UI and independent native review,
then authorized the API above. Known lexical overrides are now captured on fresh
generic string bodies and retrieved for every addressable shared reference.
Canonical writer behavior is unchanged. The normalizer preserves marked
singletons, rejects conflicting group forms and clears changed-text markers.
Three generated own regressions require exact explicit headers and distinguish
sharedUTF-length strings from separate canonical definitions of identical text.
They cover unchanged/edited aliases, singleton retention, same-length rename,
malformed/conflicting metadata and owner deletion. Complete expected model,
payload and compressed-envelope equality pass. Existing Unicode coverage remains.
Focused93 Scene/16 default and strict all-target Clippy pass. Four admitted actual
payloads remain exact, and production still rejects E. Native history/Save proof
and final post-format source pins belong to the subsequent integration receipt;
no declaration-order or nonmonotone-curve product changes are part of this slice.
