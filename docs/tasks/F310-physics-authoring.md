# F310 — Physics batch creation, useful defaults and compact controls

2026-10-30. **DONE for the declared user-authorized authoring scope. Linux/native
Windows and one new original-Spine source comparison pass.** Launch state is
owned by the coordinator's current [STATE](../STATE.md); do not infer publication
from the candidate build or QA result alone.

## Implemented behavior

- Active bone selection → Tree New/Physics or either Physics View creation
  action immediately creates one independent Physics record per selected bone.
  No external target/name dialog. Latent selection behind attachments or a
  selected constraint is not a creation source; no silent root fallback.
- Native `addPhysicsToBones` validates the complete request before editing:
  nonempty/distinct/current stable IDs, common names and the128-total-constraint
  budget. Records append in parent-first wire order with one revision/Undo.
  Another existing Physics record on a bone does not prohibit a new one.
- New positive-length bones receive rotation100%; zero-length bones receive
  translation X/Y100%. Inertia100%, strength100, damping retention.85(display15),
  mass1(display100),60FPS, mix100%, zero wind/gravity and limit5000 produce useful
  secondary motion. Existing loaded settings and codec defaults are untouched.
- Collision-safe `<bone>_physics`, then suffix2/3/… names follow bone rename in
  the same native transaction. A manually customized name stops following.
  Native history preserves generated-name ownership. Reopen conservatively
  infers the relationship from the exact current naming convention; no binary
  tag, incompatible container or sidecar was introduced.
- Physics properties and IK/Transform mixes pair compact colored icons/labels,
  exact numeric entry and sliders. Preserve percentage/damping/angular units,
  sparse Transform rows and valid extended numbers. A useful slider interval is
  not an authoring clamp. Drafts stage locally; release/keyboard completion
  authors once; Escape cancels only the field; invalid drafts block Save.
- A temporary native edit locks the controls without disabling/blurring the
  focused range. Three consecutive key adjustments retain focus. Pointer/key
  frames do not author native history or use a second simulation engine.
- Setup simulation works without Play. B/C/D react during a real parent-A drag
  and naturally settle before Save/Reset. A completed drag authors one edit;
  simulation does not bake evaluated child poses. Explicit Simulate Off survives
  creation, Reset, dragging and Save; creation never forces it on.

Creation preset, batch order, name spelling/collisions/rename inference and
slider ranges are explicit **FBones policies**, not measured original factory
behavior. A manually/external-authored name matching the generated convention
cannot have its provenance established after reopen. Keep that limitation.

Before-code evidence: [DATA audit](../research/PHYSICS-MULTI-BONE-AUTHORING-DATA-HANDOFF.md),
[UI audit](../research/PHYSICS-BATCH-AUTHORING-UI-HANDOFF.md),
[accepted policy](../research/PHYSICS-BATCH-AUTHORING-POLICY.md),
[control design](../UI-UX.md). Exact4.3.26 retained records establish one
constrained bone per Physics record and observed controls; they do not establish
new multi-selection/naming gestures or these creation defaults.

## Verified checks

| Check | Current result and scope |
| --- | --- |
| Rebuilt Ubuntu Playwright +real Rust Session |63/63 in one current run,78.441379s; zero unexpected/flaky/skipped UI cases |
| New authoring interaction cases | Actual Ctrl/Shift selection, direct batch, names/custom/reopen, one-action history, sliders/cancel/invalid Save/precise extended values, keyboard focus and narrow dock, real parent drag/natural settling and explicit Off |
| Native default/legacy |200 pass+2 existing ignores;93 pass+1 existing ignore |
| Focused native batch/naming |7/7 pass; empty/duplicate/stale/over-budget atomicity, ordering/names/collisions/history and reopen policy |
| Scene format |28 pass |
| Strict checks | Product/test TypeScript and strict Clippy default/legacy/e2e-host pass; shared runner/checks remain coordinator-owned |
| Windows0.8.2 candidate | Immutable SHA256 `2688a87419ed21e62d6481471e13ea3d0cfd81f2251b229d80557a25feaa1cf0`,11,179,520bytes |
| Actual native Windows WebView2 | Five groups pass: Tree batch/presets/history; real drag/natural settling; auto/custom names and OS SaveAs/Close/Open; slider/focus/validation/precision; explicit Off with another record/Reset/drag/Save |

Primary local evidence: `.local/playwright/results.json`,
`.local/physics-batch-native-focused-check.json`,
`.local/physics-authoring-{native,legacy,format,clippy,clippy-legacy,clippy-host}.log`,
`.local/physics-batch-windows-ui-result.json` and
`analysis/physics-batch-data-preflight-check.json`.

Independent DATA review verifies32 authored bone-channel bits and105 known
Physics fields in the three-record Linux sources. Old/current run byte changes
are confined to generated project identity; record payloads are equal. Saved,
reopened and committed authored fields agree; all24 child-channel bits remain
unchanged. The final Windows file has four intentionally authored records,
including the collision suffix/custom name and requested12.375 value; its32bone
bits and140known Physics fields also pass strict CRC/full-parse checks.

Recorded settling is below.01rad for every child in the Linux and Windows
observations. This establishes a bounded natural-restoration check, not exact
zero, deterministic matching between platforms or an original trajectory oracle.
No solver arithmetic/export-clock correction is claimed here. The first failed
UI attempts are retained: offscreen slider test coordinates were corrected, then
an actual busy/disabled focus defect was exposed and fixed before passing checks.

Windows own QA70108 passed all five groups. A later read-only process check found
it absent after CDP9260 refused connection. **Exit cause UNKNOWN**; no preclose/
normal-close receipt exists. Do not label that a crash, user action or normal
closure. The immutable candidate and completed five-group result remain valid.

## Original acceptance and continuation

ONE new UI-authored sourceab9e8bba was copied byte-identically to .spine and
accepted/exported by exact original4.3.26Professional, ownedCLI56340/exit0.
Source/copy stayed unchanged. Independent checker plus DATA re-computation
verify all105 Physics fields,32 authored bone bits,24 unchanged child pose bits,
three ordered single-bone records, names/globals/angular values and exported
runtime values. JSON decimal residual maximum2.384e-8 is separate from raw-bit
comparison. Report: analysis/physics-batch-original-check.json, SHA256
6fc6e443ab42b69eed2a06a45d89a19c56a8817dac90f77eca1abf8be60b45a2.
The zero-attachment source does not prove image loading; its missing-image-folder
log remains retained. No accepted older original batch was repeated.

The original personal61048 was actually absent before collection; no input/save/
close/attach was sent to it. Its historical protected ledger remains protected.
This file comparison does not prove original multi-create/rename gestures,
factory defaults or moving-parent numerical/export-clock equivalence. Those
limits and FBones naming/preset policies remain explicit. F307/F308/full goal
and unverified macOS checks remain open independently of this bounded task.
