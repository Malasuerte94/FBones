# F308 typed ranges: independent UI release review

2026-10-29. Read-only review of the current implementation, coordinator-owned
tests and existing own artifact. No original invocation, test runner, live
window input, source change or accepted-batch repeat occurred in this review.
Protected user windows, including91796, remain untouched.

**Final checkpoint:** the coordinator subsequently completed the42-case Linux
run, two Windows groups, native OS-dialog save/reopen and a new independently
checked original4.3.26 export. The final section below supersedes the initial
pending gates and partial-screenshot limit. F308 Match remains active.

## Scope and finding

No blocking UI/transport defect was found for **read-only inspection and exact
preservation** of the24 nullable cells. This does not accept writable endpoint
semantics or either Match action. The policy remains
`TRANSFORM-RANGES-IMPLEMENTATION-POLICY.md`; exact reference/unknown boundaries
are in `TRANSFORM-MATCH-STATIC-UI-HANDOFF.md` and the paired DATA memos.

Reviewed `TransformStoredRanges.vue`, `TransformMappingEditor.vue`,
`ConstraintInspector.vue`, `project.ts`, `workspace.ts`, the shared field
editor/committer, `tests/scene-workspace.test.mjs`, the opt-in native seed path
and `tests/e2e/transform-ranges.native.spec.ts`.

## Product and data review

- Saved ranges is a compact, initially folded, six-row table with four separately
  labelled source/target Start/End columns. The caption/hint identify stored,
  read-only values; it does not pretend to be the original editor's resolved
  editable Properties endpoints.
- A null cell shows a dash with a no-saved-value hint, while stored positive
  zero shows0. Unsigned u32 metadata is decoded through a DataView, and negative
  zero explicitly shows`-0`. Subnormal, reversed and independently absent cells
  are not normalized or rewritten. Long f32 decimal strings are visually
  truncated in narrow columns, with full text retained in the DOM and title.
- The table contains no input or native edit handler. Its cells are deliberately
  excluded from `useSceneFieldEditor`: that editor's ordinary null/string
  formatting must not become the transport for these exact bits. Folding,
  selection, focus or viewport hovering cannot itself write a range value.
- `TransformConstraintView` carries optional read-only `editorRangeBits` for
  legacy fixture compatibility; ordinary `ConstraintInput` does not. Current
  native DTOs supply24 entries. A missing legacy view field does not synthesize
  default cells. Native finite/count validation remains authoritative.
- The final `editConstraintById` implementation merges the current view and
  intended patch **before** removing id, order and editorRangeBits. Thus even
  a structurally assignable full view used as a patch cannot echo those fields.
  The separately supplied stable native ID remains the target. This closes the
  earlier strip-before-merge edge identified by the UI audit.
- Existing mapping forms edit only their runtime From/To values. They do not
  derive or overwrite saved ranges. Native preserves the24 cells under ordinary
  mapping updates as an explicit FBones policy, not an original manual-control
  synchronization claim. Existing draft, Enter/blur/Escape and Save-awaits-edit
  paths remain in use; the new table adds no competing draft or RPC engine.

The separate explicit-ID constraint views remain compatible: their inspector
and nested mapping editor resolve the requested constraint, rather than swapping
global Tree selection just to show these cells. All-none and nondefault views
are therefore display data, not a second authoritative scene.

## Meaningful test coverage reviewed

The coordinator's three new real-browser/Rust-session workflows use an
independently specified24-cell bit vector, including`0x80000000` negative zero,
`0x80000001` negative subnormal, positive zero, reversed endpoints and partial
nulls. The seed is authored through the production codec and opened through
the ordinary UI/native file path; it is not a JS project injection.

The assertions check:

1. Displayed negative/positive zero, absent cells and exact DTO bits; no inputs
   inside the table; unchanged complete native summary/revision after ordinary
   focus/blur, folding and switching to another constraint.
2. Real name, percentage mix and runtime destination edits preserve all24 bits;
   one completed edit advances one revision; Undo/Redo preserve the same bits;
   native-dialog SaveAs and actual UI Close/Open retain mapping values and cells.
3. Escape cancels a draft without authoring; Save flushes one pending mix edit;
   undo, redo and evaluation reorder retain cells; another constraint remains
   independently all-null. A store-level full-view-patch test checks that view
   fields are absent from the mutation and no pose RPC was added.

These inspect actual behavior and native persistence, rather than merely
checking labels. The integration run was still pending when this memo was
written; no42/42 or Windows/original pass is inferred from reading the tests.
The coordinator reports format28, native155default/93legacy and strict Clippy
green separately. The earlier UI typecheck passed; this reviewer ran no new
suite during this release review.

## Visual evidence and remaining release gates

Read-only `view_image` inspection of the new own `transform-ranges.png` artifact
shows the existing compact dark palette and the Saved ranges section within
the Properties panel. That particular capture is scrolled so only the table's
first rows are on screen, and a Project saved toast covers part of its header.
It is sufficient to see integration, not a clean six-row visual acceptance
capture. The full row structure and values are tested in the DOM; scrolling
and the established resizable panel expose the rest. A clean expanded-table
capture from a dedicated own QA instance would strengthen release evidence;
this observation does not justify changing the renderer or enlarging every
panel by default.

The coordinator still owns the completed full Linux result, one new UI-file
original comparison and targeted immutable Windows acceptance before release
claims. Accepted original Match snapshots should be reused; do not rerun their
actions to test this reader. Unknown extra original project metadata must still
fail the complete canonical guard rather than be discarded to open a file.
F308 remains active for manual ranges/Match and remaining interaction parity.

## Final accepted release checkpoint

[f308-ranges-ui-check.json](../../analysis/f308-ranges-ui-check.json) records
**42/42 Linux Chromium/real Rust Session workflows in37.910 seconds**, no skips,
retries or failures. The retained checks are strict UI TypeScript, **192 JS
passes plus one existing Physics skip**, **28 format passes**, **155 default /
93 legacy native passes**, two/one existing ignored native tests and strict
Clippy. These results are observed coordinator checks, not inferred from this
review's source inspection.

The exact published Windows image is
`d6f9347bcd625b9f38c5bd528f2f05b710002424819f20e46335ac704f8989fa`.
Its two targeted actual WebView2 groups pass, with zero runtime exceptions,
including signed-zero/absence display, name/mix/mapping preservation, Undo/Redo
and native OS-dialog SaveAs/Close/Open. This is separate from Linux browser
acceptance; no global OS pointer gesture or macOS check is implied.

The new clean
[Windows table capture](../../artifacts/fbones-transform-stored-ranges-native.png)
was independently reopened with `view_image`: all six rows and four headers are
visible without the earlier toast overlay. Negative zero, absent dashes,
positive zero and a reversed2..-2 span are legible in the compact panel. Long
decimal/subnormal text remains intentionally truncated with its full value
available through the title/DOM. This closes the earlier screenshot limitation.
No live window was controlled for this review.

The new source
`74f051f68217c1ea09a54fcb3e8eff266c230038f2677fb37fee5e8a2cc70c39`
passes the independent
[original4.3.26 comparison](../../analysis/f308-ranges-ui-original-check.json):
one new original export, byte-identical renamed copy,48 cells across two
constraints per captured stage,10 present/38 absent, exact negative-zero and
negative-minimum-subnormal bits, positive zero distinct from absence and
reversed spans. Runtime mapping/mix checks remain separate because JSON does
not contain the editor range cache. Five cached unreferenced PNG resources are
portable; this fixture contains no attachment render or evaluated-constraint
PNG, and does not claim those checks.

The complete canonical guard still rejects the eight richer original whole
GUI snapshots rather than stripping their other unknown metadata. Field-level
projection proof and the new supported canonical source are distinct evidence.
The accepted eight Match actions were not rerun. This release accepts typed
range preservation/read-only inspection; writable endpoint synchronization,
Match formulas and remaining original interactions are still unresolved. The
new normal user window93964 is protected and was not addressed here.
