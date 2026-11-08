# Resource refresh draft continuity DATA gate — 2026-11-06

Before dependent implementation. Reuse the current
[working-pose policy](ANIMATION-KEY-DRAFT-DATA-2026-11-06.md) and
[Sequence persistence contract](ANIMATION-SEQUENCE-PERSISTENCE-DATA-GATE-2026-11-06.md).
This concerns a source-proven FBones publication defect; original4.3.26 resource
folder gestures are unknown. No original/platform retry is needed to fix it.

## Proven current behavior

`Session::load_images_folder` scans/validates PNG resources, checks the invocation
revision under the Session lock, applies only `SetImagesRoot`, and replaces the
resource cache. It advances both revision and `document_id`, even for a same-root
refresh. The revision protects asynchronous authoring/save; `document_id` is also
the resource-generation token accepted by `image_data`/`audio_data` and frozen
pose validation. Existing tests require old image requests to reject after folder
switch/Undo. Do not stop that increment or make old resource tokens valid.

The workspace directly publishes choose-folder/refresh summaries. Animation
array replacement resets every draft; the resource `documentId` advance also
advances the draft epoch. Existing Save retention intentionally accepts only the
same invocation document/revision, so applying that helper unchanged cannot
restore these drafts. Treating any changed document as a harmless refresh would
weaken a valid replacement/stale-response boundary.

A new isolated **own fixture** Session observation confirms:

- Same-root refresh retains the complete authored summary projection and all
  stable bone/slot/attachment/constraint/animation/Event/key IDs. Dirty/Undo state
  and root remain unchanged, while revision/document generation advance.
- Selecting a copied new folder with a different PNG's bytes and dimensions
  retains that same authored projection/IDs. Authored attachment dimensions,
  geometry, Setup, keys/settings and tints are not replaced by texture dimensions.
  Only the image root becomes an undoable dirty edit; Undo restores its matching
  original root/cache. It must not author a key or working pose.
- Old image tokens reject. An otherwise valid animation-key command using the
  old frozen pose rejects specifically `StalePose` at the new revision. A stale
  resource request rejects atomically, leaving the current summary unchanged.
  The generated input file remains byte-identical.

Reproduction: ignored `resource-draft-data-2026-11-06/native-continuity-v2.mjs`
through the production feature-gated Rust Session, with its result/log. The first
probe used an inappropriate Setup edit against an Animate lease; v2 corrects the
command and asserts the actual `StalePose` code. Retain both receipts and do not
promote that initial generic rejection into lease proof. No personal source,
original editor, browser input or rendered pixels are involved.

## Required identity and publication contract

**FBones policy:** image refresh/folder selection preserves the live unkeyed
Animate working pose for the same logical document, current clip/frame/mode and
stable authored targets. Restoration never bakes or keys that pose. Failed/null/
canceled requests do not publish or consume drafts. Root changes retain their
existing history/dirty/portable-save behavior.

The smallest sound model addition is a separate native monotonic
`logicalDocumentId` on `SessionState`/`ProjectSummary`. It changes only on true
New/Open/replace (never reused across close/reopen), and survives resource scans,
root selection, Save and ordinary edits/history. Keep the current `documentId`
as its existing cache/evaluation generation. This field is session metadata,
never an invented binary project field. Stable IDs or structural equality alone
cannot prove logical identity: another opened copy may have identical content
and recycled object IDs.

Add a **dedicated resource publication** path. Capture logical identity plus the
old resource document/revision before requesting. Immediately before publishing,
require the live invocation document/revision still match, require the returned
logical identity match, and verify the resource-only continuity contract:
authored pose/topology, stable target/key IDs, animations/FPS, settings, tints,
constraints and Events are equal. Allow only known resource root/library/cache
availability, warnings and corresponding revision/history flags to differ. A
new image root is an explicit allowed resource-authoring change; unrelated scene
changes are not. Native resource methods must retain this restricted mutation
contract; source/hash and strict codec validation protections stay intact.

Capture live dirty/newer per-property intents immediately before publication,
with an empty consumed-field set. Restore only if clip/frame/mode/user-discard
context still matches. Suppress publication/restore-generated user intent;
preserve newer edits and explicit clean reverts through the existing intent
rules. A resource-generation-only transition must not pretend the user scrubbed
or opened another project. Continue clearing stale transient geometry snapshots,
leases and in-flight checkpoint replies; restored drafts get fresh geometry
versions/evaluation. Ordinary edit/Save guards must continue requiring the exact
resource document/revision; do not replace them globally with logical identity.

A narrower native continuity receipt bound to the exact old/new resource
generations is an alternative, if it provides the same logical-document proof.
A client-only flag or blanket `allowDocumentChange` is insufficient. No public
raw graph, payload cache or filesystem path should be introduced into UI flows.

Explicit Simulate off must remain off. Current `resetSimulation` does not set
`simulationIntent=true`; only explicit New/Open/run paths do. Preserve that
separation when invalidating resources/leases. A resource refresh may reset
runtime caches or frozen snapshots without enabling simulation, authoring/baking
evaluated values or letting a canceled reply resurrect a hold. Resource image
and audio tokens must continue to reject stale generations.

## Focused acceptance before broader checks

Use the actual workspace path into an isolated real Session: stage mixed bone,
slot/order/deform/constraint/Event/Sequence drafts with Auto Key off; refresh the
same folder and choose another valid folder; prove drafts, clip/frame and explicit
Simulate off survive, while authored source/keys/geometry remain unchanged except
for the intended root. Save/reopen must omit unkeyed changes. Check old image
requests/frozen leases, new geometry evaluation, history/cache correspondence,
missing images, null/failure/stale replies and source/resource hashes. Pending
newer edits/clean reverts survive; explicit scrub/clip/history/New/Open prevents
resurrection. A returned unrelated topology/key change or logical identity change
must not pass the resource continuity gate. UI agent owns interaction/selection
policy and actual compiled-store draft reproduction. Exact original behavior,
GUI pixels and OS folder-dialog acceptance remain unobserved.

## Coordinator implementation decision before frontend coding

Use the separate native logicalDocumentId on every Session summary. Keep ordinary
edit/Save publication bound to exact resource documentId/revision. Only the two
image-resource callbacks may adopt a new generation: their current invocation
must still match, logical IDs must be equal positive safe integers, returned
resource documentId/revision must each advance by one, and a strict authored
summary projection must match (including stable references and numeric -0).
Only library/root/cache availability and known dirty/history/save flags differ.

Animation context epochs, clipboard ownership, surviving object/vertex selection
and weight-selection scope use tagged logical identity, with legacy resource-ID
fallback for old fixtures. Image/geometry/checkpoint/audio loads and snapshots
remain keyed by resource documentId/revision; none gain authority from logical ID.
A dedicated resource publication captures live intent with no consumed fields and
restores only under unchanged logical document/clip/frame/mode/discard epoch.
Invalid raw fields and open structural dialogs/Trace prevent resource callbacks;
valid pending edits finish before the request. Responses cannot replace a newer
logical document, current revision or unrelated authored model. No original
interaction parity follows from this explicit FBones preservation policy.

## Native identity handoff

`ProjectSummary.logicalDocumentId` now comes from a separate Session counter,
advanced with checked arithmetic only on successful true document replacement.
`Document::summary` keeps its zero sentinel; all Session-returned summaries use
one central stamping helper for revision/resource/logical counters. No binary
format field or resource/evaluation-authority rule changed.

Focused current-profile tests pass3/3; the unchanged legacy profile compiles and
its applicable tests pass2/2. They exercise import/place/scene attachment
publication, refresh/folder switch, ordinary edits, Undo/Redo, Save/Save As,
close/reopen and replacement. Logical identity survives the former operations
and changes on replacement; failed/exhausted replacement is atomic. Old image
requests still reject `ProjectChanged`, and a prior Animate lease still rejects
specifically `StalePose` at the current revision despite equal logical identity.
The test source binary and original PNG bytes remain exactly unchanged. The
initial own-fixture Save As rejected a missing imported PNG correctly; the
fixture was completed without changing resource guards.

Private logs and source pins: `resource-draft-data-2026-11-06/native-logical-tests-v2.log`,
`native-logical-legacy-v1.log`, and `native-implementation-evidence-v1.json`, SHA256
`6aa7772ddd90023b4237af21c6a2dadcea32854b884ded6f780563d0242afb1b`.
Frontend continuity/preservation, full shared checks and the final checkpoint
remain coordinator-owned; these native tests do not establish GUI/original parity.


## Existing live-Setup test fixture correction

The coordinator's first full JS integration run exposed an outdated typed native
fake in `tests/live-setup-workspace.test.mjs`: it omitted positive logical identity,
so the new resource publisher correctly refused its reply and retained resource
document77 where the old test expected78. The native contract is not optional for
resource continuity. Update only that fake to start at logical11, advance on
successful New/Open, and retain identity across Save/resource/Undo and failed or
canceled replacement. Explicit assertions cover the identity distinction and
Simulate intent. No product guard was weakened.

The normal isolated command `node tests/live-setup-workspace.test.mjs` passes
all16 tests. Private initial full-suite failure, corrected fixture and focused
log are pinned in `resource-draft-data-2026-11-06/live-setup-fixture-evidence-v1.json`,
SHA256 `46da4f32588f68def49912f913f2d3a771e1cf0f937e481aa80ef81fec6098f6`. Shared full integration remains coordinator-owned.
