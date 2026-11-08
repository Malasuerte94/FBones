# Scene bone/active-track capacity — paired UI gate

Continuation measured2026-11-07, before dependent product capacity changes.
Reuse the [current split/UI confirmation](ANIMATION-SPLIT-LARGE-RIG-UI-CONFIRMATION-2026-11-06.md),
[bone capacity DATA gate](ANIMATION-BONE-CAPACITY-DATA-2026-11-06.md) and retained
`animare/` layout evidence. This is a bounded FBones capacity decision, not an
original4.3.26 gesture, limit, pixel or performance-parity claim.

## Reusable actual-component measurement

Private `animation-bone-capacity-ui-2026-11-06/measure.mjs` compiles actual
SceneTree and AnimationTimeline SFCs using the existing compiler/custom-host
pattern from `tests/animation-split-controls.test.mjs`. It mounts both with the
production Pinia workspace and production animation projections. It does not
implement a second sampler or scene engine. Input is reusable JSON
`{schema:1,label,project:ProjectSummary,animationId?}` or a raw ProjectSummary.
Native input/summary files remain private. Unexpected native invocation is a
recorded failure, not an automatic background collector or silent stub success.

Command: `node --expose-gc .local/research/animation-bone-capacity-ui-2026-11-06/measure.mjs`.
Each own shape runs three times, with explicit GC between trials. Four own shapes
have221/256 bones, broad/deep hierarchy,522/1024 active tracks and4096 bone keys.
IDs exceed2^32 to exercise identity handling independently of array index. The
256-deep case is explicitly a **UI-only shape**, not a structurally reopenable
format fixture; it does not bypass the unchanged Reader-depth gate.

| Own shape | Tree bone rows | Timeline row labels¹ | Dopesheet host nodes² | Tree mount median | Timeline mount median |
| --- | ---: | ---: | ---: | ---: | ---: |
|221 broad /522 tracks |221 |1106 |31030 |11.79ms |103.56ms |
|221 deep /522 tracks |221 |1106 |31030 |15.84ms |131.32ms |
|256 broad /1024 tracks |256 |1281 |32904 |14.79ms |151.54ms |
|256 deep /1024 tracks |256 |1281 |32904 |23.53ms |159.23ms |

¹ Includes one shared label/header plus bone/property labels. These own cases
have ordinary four-family rows; actual split rows/resources add their own nodes.
² Counts synthetic host element/text/comment nodes, **not** browser DOM elements.
Timings include synthetic host allocation and production Vue reactivity, without
style/layout/paint, native IPC, Pixi, textures, GPU or platform input. They are
observations of these runs, not a frame-rate or responsiveness guarantee.

All12 trials passed actual compiled-handler checks: selecting the last/high-ID
bone, Shift range across all bones, Ctrl toggle, production escapeSelection,
search/clear, root collapse/expand retaining latent selection, End navigation and
high-index timeline row Key address. Selecting one bone reduced timeline labels
to6; clearing restored1106/1281. Searching a deepest chain bone correctly retains
its ancestors, so it need not reduce row count. Collapse retained selected IDs.
All-bone Graph instantiated823/1792 curves and6424/7168 key marks for the522/1024
track shapes. No native request occurred and the authored summary was unchanged.
Unmount released component window listeners. Scope does not include actual
viewport Fit, weights painting, browser hit testing or native key publication.

Private `own-result-v1.json` records all timings, counts and source SHA256 pins;
`own-run-v1.log` retains an initial harness error: the copied host stores HTML
input type on `node.type`, so search lookup was corrected to use `tagName`.
`own-run-v2.log` and the final result are successful. No product fix was needed.

## Capacity confirmation and remaining admission gate

The DATA gate/root receipts report independently typed H310454-byte full payload
and model equality under proposed256 Scene bones/1024 active tracks, a shallow
actual H hierarchy (maximum ancestor6), and native/TS sampling/whole-selection
checks for own522/1024-track cases. Own256 star/high-index255 and128-column dense
binding succeed; legacy129, Scene257,129-column binding and forward-parent cases
reject. These are separate from UI-node allocation and must retain their own
recorded source/command pins.

The earlier256-chain encode/reopen mismatch is addressed by the paired,
authoritative structural-reader closure after Scene encoding. Reader depth256
stays unchanged; own245-chain accepts and246-chain rejects atomically. Do not
raise depth, reparent/drop/clamp records or publish unreopenable authoring/Save.
The [pre-code depth UI correction](ANIMATION-SPLIT-LARGE-RIG-UI-CONFIRMATION-2026-11-06.md)
requires existing clear error reporting and preservation of pose, selection,
history, revision/dirty state and files. No new control is needed.

Within these bounds, the UI findings support proceeding with **Scene256 bones
and per-clip1024 tracks**, conditional on that closure and the existing complete
validation. Aggregate4096tracks/8192keys, per-clip/per-track4096keys, slots,
binding columns/member/geometry/resource/cache/file/depth and legacy bounds stay
independent. Existing legacy BoneHierarchy128 Add-button code is unmounted;
root/native must review authoring/batch-specific128 guards deliberately rather
than replacing unrelated limits. No guessed warning, automatic simplification or
layout relocation is justified by this result.

At the initial gate, actual H native Session/Open, every clip/key route, sampling,
full history, DTO/JSON and portable Save/reopen were the next admission evidence.
The same harness also needed its actual native summary; own-shaped rows alone
did not prove H's complete UI projection. Browser/native-platform interaction,
layout/scrolling, GPU pixels and independently encoded original acceptance remain
pending. The user goal/F105 stays open, and B's genuine nonmonotone curve remains
guarded independently of capacity. Coordinator owns capacity lines, shared
integration checks and the single STATE/task checkpoint.

## Actual H native-summary follow-up

After coordinator-reported native Session/store success, consumed the provided
private `animation-split-implementation-2026-11-06/actual-h-ui-input-v1.json` with
the same production-component/Pinia harness. This summary contains221bones,
82slots,1clip,522bone tracks,2581bone keys and122PNGs; it has no constraints.
Root's separate `actual-h-native-v1-result.json` is the native history/persistence
receipt, not evidence supplied by this component host.

The initial3trials passed the general harness unchanged. Added explicit checks
for each actual scalar row and one-curve projection, then ran the3final trials:
**3/3PASS**, no native IPC and authored summary unchanged. H's Translate pair
retains9Xkeys/4Ykeys, with a separate X/Y Dopesheet row, no combined Translate row,
one projected numeric/control lane per scalar key and one Graph curve per axis.
This confirms the real native DTO reaches the actual components without axis
flattening; it does not measure original or native-editor pixels.

| Actual H component result | Final observation |
| --- | ---: |
| Tree bone rows / synthetic host nodes |221 /7025 |
| Maximum Tree ARIA level (includes nonbone rows) |7 |
| All-bone timeline row labels / host nodes |1292 /27739 |
| All-bone Graph host nodes / curves / key marks |20715 /966 /4644 |
| Median workspace setup / Tree mount / Timeline mount |11.96 /25.56 /104.78ms |

Every final trial also selected the last inventory bone, selected all221bones
by visible Tree range, toggled that high-index bone, cleared to all rows, searched
and cleared search, collapsed/expanded the root, navigated End and emitted the
high-index key-row address. The selected-bone context had7timeline labels; clear
restored1292. Search retained6ancestor/bone rows and selected identity. Root
collapse reduced visible bones to1 and expand restored221. All unmount listeners
released. These synthetic-host counts include text/comment nodes and ARIA levels
are presentation depth, not wire recursion limits.

Final private receipt:
`animation-bone-capacity-ui-2026-11-06/actual-h-result-v2.json`, SHA256
`29ad38441cc78a26ec98f0664dd41f359b45e65e24c98e8b4ee2113289d31448`.
It records the8product source pins plus runner/host pins; `actual-h-run-v2.log`
contains the final three results. The prior general-only receipt/log remain as
v1. Product UI source stayed frozen throughout both runs.

This closes the actual-summary component/projection follow-up. It leaves actual
browser layout/scrolling/hit testing, GUI timing, GPU Main/Preview pixels, native
platform controls and independently encoded original acceptance open. No shared
server, browser, original launch, product edit or new capability retry occurred.
