# Original active-goal requirement and gap audit

2026-10-29, after the32d2 retained-target delivery. Read-only audit of
`STATE.md`, `TASKS.md`, the F300–F309 task requirements, current UI/domain/native
paths and accepted reports. No source edits, test/driver runs, original
commands, model runs, old-batch repetition or application/window input.
This memo does not mark the goal complete or replace earlier acceptance criteria.

## Conclusion

The active goal is **not complete**. F307 exact original physics trajectories
and F308 Match/manual-range authoring remain substantive gaps. Active
multi-target/fan-in Transform evaluation is additionally unverified, independently
of small Match rounding differences. Existing accepted hover, multiselection,
filters, slot blend/color and clipping work has implemented paths and evidence;
this audit did not establish a new nonfunctional control in those profiles.

There is also a visible **deferred-semantic control**: Physics Global flags
persist, but their shared animation-track consumer does not exist yet. This
is already documented as a timeline dependency. It is not evidence that Setup
edits should broadcast to other constraints. The UI currently explains less
than the research notes: its title is only `Global {name}`.

## Coverage against the actual requested feature groups

Historical observations below are tied to their reports/images. Their use
does not claim that every group was re-executed on32d2 or on macOS. Current
`STATE.md`/delivery report identify the46-case Linux compatibility run and two
new scoped Windows groups; do not inflate those into new original observations.

| Requirement | Implemented semantic path | Acceptance evidence and remaining limit |
| --- | --- | --- |
| Tree/Weights hover identifies the same bone | `boneHover.ts`, workspace hover claims, `SceneTree.vue`, `WeightsPanel.vue`, `ProjectViewport.vue` and viewport styling keep hover separate from selected/pinned influence. | F300 task; `analysis/qol-blend-ui-check.json`, `analysis/scene-ui-check.json`. Actual Windows white hover/cyan selection and native nonmutation were observed. Exact original Weights hover timing remains a stated limit, not missing FBones behavior. |
| Multiple library images and actual drop | `ImagesLibrary.vue` Ctrl/Cmd/Shift keys, workspace `placeImages`/`placeAttachments`, native batch placement and evaluated pose epoch. | F215/F216/F222 and `analysis/scene-ui-check.json`; actual guarded Windows OS mouse drops are separate from constructed DragEvents. Root's Linux real-browser drag-to/native-session coverage is complementary, not OS WebView proof. |
| Multiple placed Region/Mesh/Clip selection | Stable attachment IDs independent from activation/library keys; `sceneSelection.ts`, viewport selection/group transforms and preview-inventory ghosts. | F301, `analysis/inactive-clip-transform-check.json`; inactive/hidden/mixed items, common pivot, X/Y scale, cancellation/history/native save and original structural comparison. Exact original inactive gesture/pivot-lifetime policy remains unknown. |
| Logical binding/Auto/weights | Genuine Mesh/Clip dense bindings; explicit membership Bind; topology-aware own Auto; selected row/bone scopes and transient locks; numeric/Direct/group/brush previews and native staged edits. | F302, `analysis/scoped-weights-delivery-check.json`, `analysis/scoped-ui-original-check.json`, `analysis/weighted-clip-authoring-check.json`. Own topology algorithm is not proprietary numeric Auto parity. Brush locked-target override, Normalize/Smooth and new-row interpolation remain labeled own policies. These are implemented semantics, not empty buttons. |
| Tree category filters/search/collapse | `treeProjection.ts`, Tree visible rows/keyboard projection and hover cleanup; latent IDs and activation retained. | F303, `analysis/scene-ui-check.json`; combinations/all-off/hidden selection and nonmutation accepted. No proof of every original search presentation is claimed. |
| Slot light color/opacity and four blends | `SlotInspector.vue` → typed native SetSlotColor/SetSlotBlend; ImageLayer sets real Sprite/Mesh tint/alpha/blend independently from slot order. | F304, `analysis/slot-blending-check.json`, `analysis/qol-blend-ui-check.json`. Actual GPU equations and weighted image save were checked. Dark tint/unknown blend modes are outside the canonical profile, not silently emulated. Batch mixed-color slot editing is not implemented or promised by the singular inspector. |
| Clip start/end and Draw Order | Start is owner slot; `AttachmentInspector.vue` selects stable end slot; `clippingScopes` uses actual slot order and inclusive end; native reorder/remap validates active intervals. | F305, `analysis/scene-ui-check.json` and clip research. Self end means remainder of order. Active overlap/invalid ranges reject atomically; inactive inventory can retain endpoints pending valid activation. No fake image/UV layer is used. |
| Clipping geometry, weights and pixels | Actual polygon graph, inverse/convex hull rules, weighted vertices and group transforms; selected inactive outlines remain inspection, not an active mask. | `analysis/weighted-clip-authoring-check.json`, `analysis/weighted-clipping-pixels-final-check.json`: deformed concave weighted clip with trailing unmasked attachment,1,082,200 interior pixels/zero mismatches. Nine older static clip cases independently cover inverse/hull semantics. Whole richer nested profiles remain unsupported. |
| IK model, controls and target manipulation | Native codec/input guards, one/two-link chain ordering, inspector plus native/TS ordered solvers; self/descendant target rejection at authoring/codec/solver boundaries. | F306, `analysis/scene-ui-check.json`, current37-static corpus. Normal-inheritance affine/reflected/zero-length/softness/stretch cases accepted; broader inheritance is not canonical editable support. No unsupported old-version `uniform` control should be invented. |
| Physics parameters/live Setup/gravity | Canonical raw coefficients and transient native/TS simulation; default-live parent motion without Run; pause/Reset/Step/holds/checkpoints and frozen evaluated geometry. | F307, `analysis/live-setup-{ui,ui-original,delivery}-check.json`; native135s continuation, two actual Windows groups and own sourcea13b original acceptance. Export-phase restoration mismatch is still active, not hidden by default-live completion. |
| Transform mappings/spaces/mixes | Six current4.3 source/destination properties, independent spaces, Additive/Clamp, offsets/mixes and ordered native/TS evaluation; current target membership order now preserved. | F308; `analysis/f308-ranges-ui-original-check.json`, `analysis/transform-target-order-{ui,original,delivery}-check.json`. Typed24-cell preservation is complete for the bounded model; writable endpoint synchronization and both Match actions remain absent. |
| Group parenting and usable editor layout | F309 native one-transaction selected roots/attachments with inventory isolation, Tree/viewport P picking, constraint Views and movable/resizable docks. | `analysis/f309-ui-check.json`, `analysis/f309-parenting-original-check.json`, `analysis/f309-delivery-check.json`. Authored-space parenting, partial-slot splitting and dock policy are explicit FBones choices. This does not move unselected alternatives implicitly. |

Earlier user requests for bone creation/parent picking, compact Enter/Escape
properties, group rotate, axis gizmos, colors/rename, Tree/Draw Order drag and
mesh creation/tracing are tracked in F200–F220. Current controls have actual
native handlers; they were not replaced by the newer F300–F309 work. Their
accepted historical checks remain in TASKS/STATE. This read-only scan does not
re-certify every low-level gesture on a new platform or claim full Spine format.

## Physics Global: classify the missing consumer correctly

Direct local evidence: `FEATURE-DATA-4.3.26.md` identifies seven persisted
global booleans through controlled original bit patterns. Exact original
captures show the controls. The explicit follow-up in
`FEATURE-UI-4.3.26.md` already separates persistence from shared animation.

Primary [Global documentation](https://en.esotericsoftware.com/spine-physics-constraints#Global),
re-read2026-10-29, describes a property participating in one timeline row for
multiple physics constraints. It does not establish broadcasting Setup numeric
edits. This guide is patch-unpinned, so it is not exact4.3.26 interaction proof.

Current UI `ConstraintInspector::global` writes the selected constraint's flag;
native input/model/view/codec retain it. Current native/TS solvers do not read
those flags, and the editor has no shared physics animation timeline consumer.
Consequently toggling Global alone does not implement a shared animated value
or make a Setup edit affect other flagged constraints. No general timeline
support should be claimed from these saved checkboxes.

**Next safe action:** clarify the checkbox hint as a stored shared-animation
participation flag whose timeline workflow is not yet available. Do not add
Setup broadcast by assumption. A true shared-track feature belongs with F105
timeline and paired reference evidence, not a speculative solver patch. Its
absence is a documented dependency beyond delivered Setup behavior; it remains
relevant to the larger editor goal rather than an unrecorded new bug.

The single Reset control resets the current preview's entire physics state;
there is no separately implemented selected-constraint Reset action. Current
UI is not labeled as selected-only Reset. Exact original per-constraint/reset-
key/deterministic timeline behavior is not established by the accepted Setup
interaction groups and should not be implied.

## Constraint dependencies: distinguish validation from measured evaluation

Native and TS constraints execute in explicit order; authored channels remain
separate from applied/world. Saved IDs survive bone/slot/history remaps.
IK target ancestry and chain validity are guarded atomically, including mix0.
Current Transform source/targets/maps and Physics references receive bounded
canonical validation. The fixed ordered pass cannot recursively loop forever
merely because two Transform constraints reference each other's bones.

That is not proof of original behavior for every dependency graph. Current37
static cases contain single-target Transform constraints and no two source
rows writing one destination. The new original GUI four-link baseline is at
mix0, and the retained membership source also has zero mixes. Neither proves
active fan-in or active parent/child multi-target composition. These are genuine
F308 verification gaps even after both Match actions are later implemented.
Mixed IK/Transform/Physics order has accepted representative cases, not an
exhaustive mixed graph matrix.

**Next safe action:** after paired research, choose one active fan-in or
parent/child multi-target discriminator with frozen expected alternatives.
Do not introduce guessed global cycle prohibitions, source resampling or
target sorting. See `TRANSFORM-CURRENT-IMPLEMENTATION-AUDIT.md` for precise
current semantics and `PHYSICS-NEXT-SOURCE-AUDIT.md` for the separate export
scheduler limit. No new model or original collection is authorized here.

## Additional distinctions that must remain visible

- Selected attachment versus active attachment is correctly separate. Multiple
  selected inactive items may show editable ghosts; only the slot's active
  attachment supplies pixels/masks. Selecting a row is not activation.
- Weight numeric focus, explicit vertex scope, active brush influence, selected
  Auto candidates and lock sets are distinct. Normalize currently operates on
  the binding with lock policy; it is not a selected-vertex Auto operation.
- The documented original Update Bindings workflow is not exposed as a typed
  Scene button. Ordinary typed weight changes deliberately preserve every bind
  coordinate. This is a possible future authoring extension, not permission to
  make Auto silently rebind or to withdraw accepted logical-weight completion.
- Native geometry/preview/historical UI evidence is not complete unknown-file
  compatibility. Unsupported surrounding structures still reject exact
  canonical editing. macOS delivery and timeline/full4.3.26 compatibility remain
  roadmap work; Windows/Linux evidence cannot be generalized to them.

## Priorities without changing the goal

1. Finish F308 manual-range evidence and implement the measured native/runtime-
   cache coupling, then recover both Match operations within explicitly proven
   sampling/arithmetic scopes. Do not call read-only caches equivalent.
2. Keep F307 exact phase/caller-schedule investigation active. Reuse existing
   measurements and preserve rejected models/unchanged tolerances. The Setup
   interaction is already delivered and should not be re-opened as unfinished.
3. Cover active Transform multi-target/fan-in before claiming that broader
   supported evaluation profile. Preserve the newly fixed first-target order.
4. Clarify Global's deferred timeline role in the UI; implement shared timeline
   semantics only when that roadmap slice is authorized and reference-gated.
5. Maintain the completed groups through meaningful targeted regressions when
   their files change. Do not repeat all accepted original/Windows batches just
   to obtain a larger count or treat a historical report as a current full run.

No additional material functional defect beyond these explicit gaps was proven
by this read-only audit. This is not an exhaustive runtime bug proof: code and
reports support the bounded conclusions above, while unexecuted paths retain
their recorded limits. The original full goal stays active.
