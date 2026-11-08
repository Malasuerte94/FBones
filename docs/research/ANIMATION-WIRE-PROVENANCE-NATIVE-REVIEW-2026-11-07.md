# String forms and constraint declarations: independent native review

2026-11-07. Read-only findings before dependent code. No product edits, shared
checks, original process or runtime batch. These are known wire-preservation
questions, not Physics/Match or reversing-curve evaluation changes. E remains
guarded independently; diagnostic omission of a curve validator is research only.

## String form

The current reader accepts terminated ASCII and UTF-16-unit-counted text, but
stores only semantic text. `Writer::string` selects terminated ASCII for ASCII
length≥2. A narrow lookup of two known64-character ASCII Bone12/tag1 values in
E's retained payload finds unique UTF length headers `c1 01` at offsets5907/6118
and no terminated-ASCII occurrence. Each body has two extra header bytes, matching
the diagnosed four-byte total discrepancy. No personal names are reproduced.

Keep the default writer rule unchanged: older independently encoded own long
ASCII files already use it. The DATA proposal extends `WireStringAlias` with an
optional typed `Utf8Length` marker bound to `source_text`. This is a suitable
minimal approach if normalization retains marked singletons, prunes the marker
when current text differs, and requires consistent effective form for every
shared alias body. New/edited fields remain canonical. Reader capture must
resolve encoding for every generic reference, not only its first owner.

Current `normalize_wire_strings` drops all singleton groups; adding a marker
without changing that rule loses the observed source form. Current native
`scene_wire::reconcile` mutates/remaps each alias owner/tag and therefore carries
additional marker fields automatically. Constraint/slot/bone/attachment stable-ID
mapping and Region↔Mesh path-tag mapping must retain the same semantic field.
Deletion must retire provenance; a later reused vector index must not inherit it.
Existing Save/resource-rebase normalization must prune changed-root markers before
preflight, retaining untouched fields/history frames. Do not replace source text
with opaque bytes or weaken complete reserialization equality for unknown sites.

Required tests include both64-character ASCII forms, short/long/Unicode bodies,
marked singleton/shared reference, unchanged sibling versus renamed field,
rename-away/back versus Undo, stale/duplicate/foreign markers, Event default-string
label registration, owner reorder/delete/reuse, resource-root mutation and Save.
Retain existing saved payload hashes for canonical own and admitted sources.

## Constraint declaration order

`scene/write.rs` tags16/22/41 currently filter global execution order for IK,
Transform and Physics declarations. `scene_reader.rs` separately reverses the
tag44 group to recover global execution order. Retained E diagnosis establishes
noncanonical per-type declaration arrays with matching constraint identities and
fields. Preserve the arrays as typed ordered global indices; do not reorder the
runtime `SceneProject.constraints` vector to fit serialization.

A suitable declaration structure has one vector per known class, with exact
class-correct unique coverage of all corresponding global constraints. The writer
uses it only for declaration arrays. The execution group, sampler, UI list,
constraint timeline addresses and Match prefix keep their existing authority.
No unknown declaration kind or new runtime semantics follows.

Native already maps global constraint indices through stable `constraint_ids`.
Reconciliation should remap retained declaration order by that identity, remove
deleted or changed-class membership, and append newly introduced members of each
class in a declared deterministic order. General format normalization must reject
foreign/duplicate/incomplete metadata; only a known native structural edit may
perform its explicit deletion/addition reconciliation. String aliases, animation
layout selectors and parallel stable key IDs continue through existing remaps.

One policy seam needs an explicit decision: canonical `wire=None` currently makes
native reconciliation return early. If an execution reorder should preserve the
previous independent declaration inventory even when it was formerly canonical,
capture the **before** filtered declaration order and materialize metadata when
needed. Computing it from the next execution vector loses that provenance.
Alternatively retaining older canonical-reorder serialization behavior must be
stated as such; it cannot be described as preserving independent declaration order.

Own tests should mix all three classes and per-type permutations; reorder global
execution, edit/rename a member, delete a keyed versus unkeyed member, add a new
member and reuse an index with a fresh stable ID. Check unchanged declaration
identity order, execution order/evaluation, exact unrelated f32/string bits,
timeline/key IDs, Undo/Redo, encode/reopen and resource-history rebase. Reject
duplicate/foreign/wrong-class/incomplete tables atomically. Source E's complete
equality must be assessed with curve guards restored before admission is claimed.

The private `string-form-native-review-2026-11-07/actual-string-lookups-v1.json`
retains the narrow raw lookup; the full source and all strings remain private.
Final DATA/UI contracts and coordinator approval govern any implementation.

## String-form native fixture handoff

After paired lexical gates and coordinator START, own test/e2e-host fixture
`scene_string_form_fixture::project()` now clones the accepted partial-Translate
fixture, retaining its two animations, seven keyed families and seven numbered
PNG paths. Bone1/Slot0 share marked64-character ASCII text; an unkeyed Bone3 is a
marked64-character singleton, while Bone4 deliberately retains old canonical
terminated64-character ASCII. A safe `./source-images` root is marked, and the
first attachment's name/explicit `red` path share a short marked body.

Four `scene_string_form_tests.rs` cases exercise full model/payload roundtrip in
both forms; native no-op/unrelated edit/same-length rename/shared split and
Undo/Redo; deleted owner/index reuse/fresh IDs and attachment Region→Mesh path-tag
mapping; and portable Save with root/history normalization, stale Save preserving
an existing target, source/PNG preservation and reopen. Duplicate-name and stale
edit rejection also preserve complete summary/payload. The fixture/test module
declarations are added under existing test/e2e-host gates. No normal-build fixture
exposure or native production logic change was needed.

Only the two new owned Rust files were formatted. No shared build, tests, global
fmt or original launch ran in this handoff; the coordinator owns focused runs,
the opt-in host seed, actual store/draft integration and final launch/checkpoint.
These are prepared regressions, not yet claimed passing. Constraint declarations
remain research-only in this worker's scope.

The coordinator's first focused run passed three cases and rejected conversion
in the fourth with the existing `PoseRequired` guard: the mixed fixture contains
a Transform constraint. The test now explicitly checks that unleased rejection
preserves bytes, obtains a fresh real `Session::evaluate` None/Setup freeze and
submits the conversion through `edit_in_pose`. No product guard or solver changed;
the coordinator owns the corrected focused rerun.

## Declaration lifecycle handoff

After lexical integration and paired declaration approval, native reconciliation
now derives the BEFORE explicit/canonical declaration inventories, maps survivors
through stable IDs, prunes deleted/changed-kind membership and appends new members
in current execution order. A canonical mapped table becomesNone. Only when a
formerly canonical project needs noncanonical declarations does native call the
format's `materialize_wire(BEFORE)` helper for complete validated provenance;
otherwise no extra materialization/encode is introduced. Captured aliases/layouts
then follow the existing remaps before normalization. No solver, execution-vector,
Match-prefix, key-ID or history transaction logic changed.

Own `scene_constraint_declarations_fixture` has six interleaved constraints, two
per kind, with all three declaration vectors reversed independently. It retains
the partial/string fixture's seven families and PNGs. Its canonical variant has
no custom wire metadata, a nonzero-size image and shared Event default/key text,
so Bone28 aliases and default-label registration are exercised on first capture.

Five prepared native Session tests check unchanged complete typed/payload
roundtrip; two actual Sessions' identical ordered bones/constraints DTO and None
evaluated bones at frames0/6/15 for declaration-only differences; reorder/rename/
key edits with stable inventories and all-family key payloads; deletion/new-ID/
known kind replacement; canonicalNone→Some→None via reorder and deletion cycles;
and portable Save, full expected payload, resource/history rebase, stale-target
atomicity, source/PNG preservation and reopen. This checks metadata-only native
invariance, not new original solver fidelity or an observed TypeScript/GPU run.

Source is handed to the coordinator frozen, with owned-file formatting only.
Independent UI source review found no issue. No shared Cargo/test/build or global
fmt ran in this worker; focused/full results and launch/checkpoint remain with
the coordinator. E admission and reversing-curve behavior remain separate.
