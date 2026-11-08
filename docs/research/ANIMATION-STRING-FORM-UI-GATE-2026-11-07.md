# Source string form — pre-code UI gate

2026-11-07. Read current STATE/TASKS, the accepted lossless-import/Save As,
string-alias and slot-capacity gates, supplied animation-layout evidence, and
current text/Save/native wire paths. No product edit, shared test, browser or
original operation. This is an internal persistence prerequisite, not a new
control or an E admission: E's reversing curves still remain guarded.

## Finding and evidence boundary

The paired [string-form DATA gate](ANIMATION-STRING-FORM-DATA-GATE-2026-11-07.md)
proves Bone13/tag1 and Bone16/tag1 are two source ASCII strings of length64 stored
using the length-prefixed UTF form (`c1 01`), while current `Writer::string`
selects last-byte-terminated ASCII for every ASCII value of length at least2.
Their decoded text is equal; four payload bytes differ in aggregate. This
blocks complete reserialization equality independently of slot cardinality.
Whole-payload proof belongs to DATA; no screenshot can
establish this binary-form choice or the original editor's editing policy.

Direct source: `minimal/reader.rs::string` already accepts both bounded forms;
the length-prefixed branch counts UTF-16 units, not raw Unicode bytes. The
writer uses the same Java-unit convention. Do not label this a general UTF-8
encoder replacement, lift1024 guards, or globally switch all long ASCII text to
the other form. Existing own files use the current terminated form and must
retain their unchanged bytes.

## Existing UI and text ownership stay intact

`SceneTree.vue` and `AttachmentInspector.vue` use existing compact text inputs,
currently `maxlength=120`; a64-character name fits. Stored text is displayed by
the ordinary Tree/inspector/timeline and resource selectors. No new encoding
toggle, warning or field is warranted. Source text and image path remain
separate authored values; binary representation is not a visible character.

`createSceneFieldCommitter` and `createBoneFieldCommitter` pass nonnumeric text
unchanged and short-circuit exact no-op values. Merely selecting a row, opening
an inspector, Enter/blur on unchanged text, or saving must not become a rename,
truncate the text to a widget limit, or canonicalize its wire representation.
An input maxlength is an authoring affordance, not permission to truncate a
loaded value. Existing explicit animation-name submission trims its draft;
native slot update also trims its passed name. Preserve these existing command
semantics without applying them to decoding/import/Save globally. Any wider
loaded-whitespace editing question is outside this64-ASCII finding.

Native `RenameAttachment` deliberately retains the previous implicit image name
as an explicit resource path before changing the attachment name. The fix must
retain that ownership distinction, stable semantic IDs and portable/path safety;
never treat a visible-name edit as permission to rewrite a resource alias.
Format names remain nonempty, bounded1024bytes and free of control characters;
the reader's separate bounded unit/ASCII checks also remain unchanged.

## Bounded FBones persistence policy

Retain proven loaded string-form provenance separately from decoded text and
reference/alias identity. The existing `WireStringAlias` group is not itself a
string-form marker: one shared string definition must have a coherent form,
and separate equal-text definitions may retain different forms. Use typed,
validated known provenance, not opaque record bytes or a global canonicalizer.

Unchanged fields must preserve text, alias identity and form through unrelated
bone/slot/key edits, stable-ID remapping, resource publications, Undo/Redo and
Save/reopen. Deleting an owner must prune its metadata; array-index reuse must
not give a new object the removed owner's form. For a genuinely new or edited
string, retain the existing bounded canonical authoring path unless DATA proves
and specifies a narrower justified rule. An unchanged alias sibling must keep
its source form when another member is renamed/split. Reverting through native
Undo restores the complete old authored/provenance frame; it is not a guess
based only on matching text.

`workspace.ts::save` awaits pending edits, rejects all five existing invalid
field states, uses the existing native Save/Save As command, and publishes via
animation Save-retention guards. These controls, dirty/revision/context guards
and pending unkeyed pose behavior stay unchanged. Native Save As already plans
portable-root changes and rebases history metadata before writes: include any
new form metadata in that validated plan, avoid post-write normalization failure,
and preserve every unchanged non-root string. Cancellation/failure/stale replies
must not clean the document, mutate source/target files or publish a new summary.

## Required regression seam

DATA should test own ASCII lengths around63/64/65, both loaded forms at the same
length, Unicode/UTF-16 boundaries, references/shared aliases and separate equal
strings with differing forms. Require full typed/payload equality for unchanged
known sources and old own canonical files, not just decoded text equality.
Native history tests should cover unrelated keys, rename/no-op, aliased sibling
split, delete/remap/index reuse, Undo/Redo, resource generation and portable
Save/reopen; failed/invalid provenance must reject atomically. Existing UI text
controls need no product changes for this binary-only finding. Their existing
pending-field tests remain applicable; source/codec tests are the discriminating
new evidence. None of these proves original4.3.26 unseen rename/Save gestures or
independently encoded compatibility.

## Independent lifecycle source review while implementation lands

Read-only review after the paired gates: the new reader records form per known
generic string definition, and typed extraction attaches that marker to each
recognized owner/tag alias site. The writer retains its old global ASCII choice;
only marked known fields request the existing length-prefixed writer path.
Normalizer checks `source_text` against current text before partitioning aliases,
so same-length rename clears the marker; unchanged marked singletons survive,
canonical singletons disappear, and inconsistent encoding within one current
shared group rejects. Separate equal-text groups are not merged by value.

Existing native `Remap::string` resolves stable semantic IDs before copying the
whole alias record; deletion prunes it and new identities have no source entry.
Attachment Region/Mesh path-tag remapping remains separate from name/implicit
resource-path authoring. Save prepares/normalizes its saved clone before encode;
resource-root history rebasing clones, normalizes and validates every affected
frame before PNG/audio/project writes. After writes it applies the prepared
metadata without fallible normalization. No DTO/workspace control or authored
resource guard change was observed in this lexical implementation.

No defect identified in that source snapshot. Review requested an explicit
regression for separate definitions containing equal text with canonical versus
length-prefixed forms, alongside rejection of inconsistent markers in one shared
group. The new format `string_form_tests.rs` now contains that equal-text case
(shared length-prefixed Bone/Slot A×64 alongside independent canonical attachment
A×64), explicit body counts, singleton retention, same-length rename and invalid
shared-form rejection. This closes the identified coverage gap by inspection.

The new native `scene_string_form_fixture.rs`/`scene_string_form_tests.rs` cover
no-op/unrelated edits and history; same-length rename with retained sibling and
canonical rename-away/back; deletion/index reuse with new stable IDs; attachment
rename retaining marked resource path and Region-to-Mesh path-tag remapping; stale
Save leaving an existing target unchanged; portable Save/root normalization across
Undo/Redo; complete reopened model and source/PNG preservation. Existing Save
preparation orders validation before irreversible writes as described above.
No actionable source defect found in this reviewed snapshot. Implementation/test
owners retain their execution and integration results; this review ran no shared
tests and does not assert their pass result or a new browser/original observation.
