# Linux Playwright coverage handoff — 2026-10-29

Read-only audit of the current16 specifications, the accepted Windows0.8
16-group receipt, the accepted Windows0.8.2 seven-group receipt, and the explicit
user/task acceptance in AGENTS, STATE, TASKS and F222/F300–F308. No product or
harness changed, no runner/original command executed, and no application window
received input for this audit. Missing Linux coverage below means **not ported
to this suite**, not a newly discovered product failure or revoked historical
Windows acceptance.

## Evidence identities and what16 means

- `analysis/playwright-linux-check.json`: original Linux baseline16/16,
  16.1367s, native host `41cc2b5d…3a00f34`,107 frozen source hashes.
- `analysis/playwright-scoped-backend-check.json`: rebuilt host after the
  scoped Auto backend extension,16/16 in15.624s, zero retries/failures/skips;
  native host `e1f20fea…c43ce5`,108 source hashes. It explicitly records
  `scopeUiImplemented:false`. This is the same existing-workflow compatibility
  suite, not16 new scoped-Auto UI checks.
- `.local/scene-08-final-acceptance-snapshot/windows-scene-ui-result.json`:
  actual Windows16 groups on immutable `17b575ab…1ce84748`, passed with zero
  reported failures/runtime exceptions. `analysis/scene-ui-check.json` links
  its saved source to original4.3.26 export evidence.
- `.local/weighted-clip-082-final-acceptance-snapshot/windows-scene-ui-result.json`:
  actual Windows seven groups on immutable `7dcb91a7…42e5c16`, passed with zero
  reported failures/runtime exceptions. Independent actions and final weighted
  pixels are in `analysis/weighted-clip-authoring-check.json` and
  `analysis/weighted-clipping-pixels-final-check.json`.
- The separate accepted0.8.1 five-group main receipt plus ScaleY annex remain
  relevant for F301 whole inactive/mixed transforms. They are not silently
  folded into either of the16 or seven group counts. See
  `analysis/inactive-clip-transform-check.json`.

The Linux16 are **five browser lifecycle/render tests, two read-only injected
scene tests and nine `@native` specifications**. Of those nine, one is an API/
transport test, one checks two independent browser+Rust contexts, and seven
exercise editor workflows with real Rust save/close/reopen. A Windows group
often contains many actions and numerical/pixel assertions. Equal counts do
not establish equal workflow coverage.

## What the Linux suite actually does

| Specification | Observed scope and evidence boundary |
| --- | --- |
| `browser-lifecycle.spec.ts`,5 tests | Production HTTP CSP, real software WebGL, same-origin external-script Function rejection, invalid/Unicode New names, browser-only draft/discard/cancel/close, wheel zoom/Reset view/grid. Browser drafts deliberately cannot save and disappear on reload. |
| `readonly-scene.spec.ts`,2 tests | Own injected display input; attachment filter retains latent selection; inactive Weights target stays inactive; bound-bone hover propagates across panels and changes actual canvas pixels; native edit controls disabled. This input did not pass through the codec and is not a native project/persistence proof. |
| `native-authoring.spec.ts`,4 tests | Real Rust transport/session isolation/error/token checks and exact CSP equality; separate UI contexts; UI Add bone/name/X Enter, Undo/Redo and binary reopen; actual browser single-PNG library→viewport drag, Convert to Mesh, membership Bind, full Auto, Direct numeric37 plus draft-hover retention and binary reopen. |
| `clipping.native.spec.ts`,2 tests | Real native fixture with concave active/inactive weighted clips; UI target/influence selection, numeric Direct, real canvas20px vertical Direct drag, Replace to50%, one revision per gesture, Undo/Redo, other attachment/activation/positions preserved and binary reopen. Clip construction, Bind, Auto and initial weights are arranged through actual Rust commands, not through their creation/Bind/Auto UI controls. |
| `constraints.native.spec.ts`,3 tests | UI creates a two-link IK chain and verifies evaluated endpoint/mix without setup writes; creates a same-channel Transform and edits X mix/offset; creates Physics and checks transient Run/Pause/Step plus one evaluated pose epoch consumed by a PNG drop at the correct world point. All three save/close/reopen settings. |

Fixtures call the same Rust Session; they do not implement JavaScript history,
file persistence, weighting or constraint solving. However, a command used to
arrange a fixture is not evidence that its corresponding UI control works.
Native window events/title and queued dialog choices are transport adapters.
Screenshots that merely differ after hover/grid are not mask/blend numeric
oracles or full interface visual comparisons. Clip tests currently preserve
position arrays with JS numeric equality; their Linux browser assertions do
not independently inspect signed-zero/f32 binding bits. The native/backend and
accepted Windows binary checks provide separate bit-level evidence.

## Mapping the accepted Windows16 groups

Numbers below are the exact order in the immutable0.8 Windows receipt. A
partial mapping is intentional and must not be reported as a fully ported group.

| Windows group | Already ported to Linux | Still missing from the Linux suite |
| --- | --- | --- |
| W01 inventory A/B/none, rename, inactive delete/Undo | Inactive target inspection; activation unchanged during clip weight edits. | Actual A/B/none activation controls, attachment Rename Enter/path retention, inactive Delete/Undo and ownership/inventory checks together. |
| W02 scene Ctrl/marquee and group transforms | None of these gestures. | Ctrl/Shift/canvas marquee selection; group Translate/Rotate/independent Scale, one transaction and Undo. |
| W03 combined Tree filters | One attachment-category toggle and latent selection on injected input. | Combined categories, search/no matches/all off, collapse, keyboard navigation, actual Rust DTO/activation nonmutation. |
| W04 Tree/Weights hover GPU cleanup | Weights→Tree hover and canvas change on injected input; native mesh numeric draft survives a hover. | Native history/RPC nonmutation, exact hover/pinned styling, unbound click, keyboard focus, pane/tab/blur/Escape/delete/document cleanup. |
| W05 OS multi-PNG→existing slot | One browser PNG→viewport creates one slot. | Ctrl/Shift library selection, multiple assets→existing slot with one Undo, source/destination identity and all resources. Genuine Windows OS gesture remains separate. |
| W06 clipping draw/edit/end/inverse/activation pixels | Existing real concave clip is displayed and weight-edited. | UI polygon creation/Modify/Create/Remove; interval inclusive/self/end, Inverse/Convex, active/none switches, invalid/overlap failures and independent mask pixels. |
| W07 IK1/2, target drag/skinning/authored baseline | UI two-link creation, evaluated tip, mix0/Undo and saved settings; setup unchanged. | One-link UI, live target drag and mesh skinning, member ordering, mixed constraints and ancestry guard interactions. |
| W08 Transform property-map conversion | Default same-channel source X/Y, X mix/offset and native reopen. | From X→Rotate, ranges/scale/clamp/local flags, destination Add/remove/distinctness/limit, source/member changes and mapping Undo. |
| W09 Physics Run/Pause/Step/Reset | Run/Pause/Step, transient native state, saved settings and reopen resets clock. | Actual Reset button, additional channels/parameter failures, mixed-order dependencies and bounded replay failure UI. No moving-parent original numeric parity follows. |
| W10 constrained mesh drag/freeze | A physically displaced root's PNG placement freezes one pose epoch. | Actual mesh vertex/whole drag, exact epoch used by that edit, setup/time preservation and cancellation before freeze completes. |
| W11 inactive Trace under constraints | None. | Actual trace controls/options/preview/apply/cancel, inactive inventory target, epoch propagation and unchanged active pixels. |
| W12 attachment owner inspector/Tree drag | None. | Inspector reparent and real browser Tree drag, affine world geometry, destination active policy, collision rejection, one history entry and reopen. |
| W13 live parent drag/motion replay | Force-only transient preview and frozen image placement. | Parent pointer drag while running/paused, authored-pose recording, preserved inertia/clock, geometry freeze replaying that exact motion. |
| W14 OS PNG→displaced-root viewport | Browser single-PNG drag checks desired world center, epoch and preview clock using real Rust. | OS-level Windows delivery path/focus/WebView2 drag integration. Browser behavior is substantially covered; it does not replace that platform proof. |
| W15 invalid IK ancestry/negative damping | Valid two-link/Physics workflows only. | UI invalid target availability/error, changed/reparented ancestry, negative damping rejection, unchanged setup/history on failure. Native tests are separate evidence. |
| W16 Bind/Auto/Undo and full-Scene reopen | UI mesh Bind/full Auto/numeric, Undo/Redo and native reopen; clip fixture uses real typed Bind/Auto setup. | Combined Region/Mesh/Clip+IK/Transform/Physics save from one UI-authored scene, direct clip Bind/Auto/Normalize UI and unchanged complete binding bits. Scoped UI is pending. |

## Mapping the accepted weighted-clip seven groups

| Windows0.8.2 group | Linux coverage | Missing Linux actions/assertions |
| --- | --- | --- |
| C01 typed mesh/rigid membership, Auto/Normalize/numeric boundaries | Mesh UI Bind/full Auto/Direct; pre-bound clip numeric Direct. | Rigid clip first Bind/retained/new/removed membership, UI Auto/Normalize and no-positive-recipient numeric no-op; dormant coordinate initialization and actual bit checks. |
| C02 Direct click/Windows stroke/Shift fine | Active and inactive clip canvas vertical Direct drag at the own gain, single revision, Undo/Redo. | Click-only selection with zero edit; nonvertex miss; Shift fine; slider; changing focus/cancel midgesture. Windows real OS stroke is platform-only evidence. |
| C03 Add/Remove/Replace/Smooth | Replace full coverage to50% on active/inactive clips. | Add, Remove, Smooth; stroke max coverage rather than per-move accumulation; feather/size/strength combinations, Replace below/above target and zero strength; frozen one-commit cancellation. |
| C04 inactive clip mask/inventory/Bind choices | Editing inactive clip does not change activation or the other attachment DTO. | Independent active-mask pixel equality, attachment-specific membership draft retention and UI Bind choices while switching targets. |
| C05 constrained Bind/posed Unbind | Physics→PNG placement uses frozen epoch. | Clip Bind/Unbind UI against current evaluated geometry, reflected owner, world vertices/time/setup preserved, stale/missing epoch errors through UI. |
| C06 numeric drafts/hover/Enter/Escape/precision | Native mesh typed37 survives a hover and Enter commits; clip Enter commits. | Escape cancels with zero authoring; hover/focus permutations, exact one commit despite blur, untouched f32 precision, inactive/constraint contexts and no-op focus retention. |
| C07 weighted concave original oracle/pixels | Concave weighted fixture renders; arrays/history/reopen checked. | Pose only the second bone; independent deformed polygon math and safe interior pixels, unmasked trailing slot, concavity-vs-hull discriminator, source/file/GPU provenance. No current Linux original-pixel oracle comparison. |

The accepted0.8.1 inactive-region/mesh/clip group Rotate/Scale/pivot flows are
also unported: real inactive ghost hit/gizmo selection, moved/snapped custom
pivot, tool switching versus vertex Edit, mixed visible/inactive Translate,
independent X/Y Scale, Escape preview cancellation and persistence. Those are
important F301 regression gaps even though the product's Windows acceptance
already passed.

## Explicit user flows beyond those two receipts

The user's earlier feedback remains part of regression planning. The current
suite covers only a narrow portion of it:

- **Images/slots:** single library PNG→viewport is covered; Ctrl/Shift range
  selection, selected-asset batch drops, slot inventory operations, Tree
  reparent and Draw Order drag are not.
- **Mesh creation:** Convert to Mesh is covered; connected click/drag vertex
  creation, edge tools, live triangulation, outer alpha/shadow-ignore Trace,
  inner structural Trace and their option/cancel/apply flows are not.
- **Bones/tools:** Add bone, rename and X Enter are covered; B creation with
  clicked parent, short click bone, Escape, Ctrl/Shift/marquee, Individual/Group
  rotation, rotate-ring radius, separate scale axes, shear handles, Pose/Length,
  color/auto-color, F2/double-click rename and Tree reparent are not.
- **Compact properties/UI:** the tests locate several real fields, but do not
  validate the complete center-floating layout, responsive resizing, all
  X/Y/rotation/length/scale/shear drafts or invalid-field Save blocking.
- **F304 color/blend:** no current Linux UI change or pixel equation assertion
  for Normal/Add/Multiply/Screen and independent RGBA on Sprite/weighted Mesh.
- **Open scope, not merely missing tests:** F302 scope-selection/locks UI,
  explicit Update Bindings/new-vertex policy, F222 image-path swapping,
  F308 Match and unresolved F307 original moving-parent phase must be
  implemented/researched separately. Existing16 compatibility passes do not
  close them. Native scoped core tests already cover its own backend contract.

## Priorities when those feature files are next edited

1. **F302 frontend integration:** add actual Direct click/Ctrl or documented
   box/marquee selection, influence-list scope distinct from Bind checkboxes/
   brush/hover, transient locks and a visible scope summary. Test single B,
   one vertex, combined zero-mass row, lock A, selected+locked no-op; assert
   outside rows/coordinates, one Undo and reopening lock lifetime. Use the
   existing five original receipts and rebuilt real host; do not rerun the
   accepted original cases or claim the unknown proprietary distribution.
2. **Selection/inventory/interaction regression:** add native fixture-backed
   A/B/none, Ctrl/Shift/marquee, inactive ghost/common pivot and mixed group
   transforms. Extend library batch drop, Tree owner drop and Draw Order drop
   with actual Playwright mouse/keyboard and canonical state checks. Keep
   native fixture arrangement visibly distinct from UI actions under test.
3. **Weights/draft/pose gaps:** parameterize the missing brushes and Direct
   click/fine/cancel cases; add Escape/precision/no-recipient drafts and actual
   constrained Bind/Unbind. Reuse one minimal owned fixture per independent
   test and measure complete unchanged rows, position bits and transaction
   count rather than only waiting for a nonzero result.
4. **Creation and rendering:** author clipping/mesh vertices through the real
   viewport; Trace outer/inner plus inactive constrained apply/cancel; add
   blend/RGBA and weighted concave-mask pixel checks using owned opaque assets
   and independent geometry/formulas. Reuse existing original exports only
   with verified matching source hashes. Avoid arbitrary screenshot-difference
   assertions as substitutes for mask/blend semantics.
5. **Constraint edits:** expand mapping controls before/with F308 Match;
   add one-link/target-drag IK, invalid ancestry/damping, Reset and moving-parent
   preview→frozen geometry. Test actual relevant UI state/history and numerical
   native snapshots. This must keep F307 phase comparison pending until solved.

These are an ordered test-port backlog, not authorization to implement all
missing product behavior or repeat all historical Windows/original batches.
Prefer a narrow new spec when its feature changes, then the ordinary fast suite.
Keep one coordinator owning runners/report paths, real locator auto-waits,
zero retries, production CSP, strict test TypeScript, fresh Rust sandboxes and
explicit rebuilds after product changes. Reopening may reallocate session IDs;
compare persistent identity/ownership by names and data where appropriate,
while same-session assertions should check actual stable IDs.

## Platform evidence that Linux Chromium cannot replace

- Windows WebView2/Tauri IPC and asset/custom-protocol behavior, mapped-W:
  launchers/immutable executable delivery and native Windows focus/OS HTML5
  drag/drop. Browser Playwright can cover corresponding application logic,
  but cannot certify those platform adapters.
- Native save/open/folder dialog presentation, cancellation and window-close
  integration. The headless bridge queues choices and adapts window events;
  real filesystem/revision/history behavior is checked, real OS dialogs are not.
- Native Linux GTK packaged-release lifecycle/dialogs and macOS behavior.
  The observed normal Linux GTK/WebGL startup is separate startup evidence,
  not this browser suite and not complete native lifecycle acceptance.
- GPU-driver/hardware behavior and performance. Explicit SwiftShader tests
  software rendering; successful pixels do not establish hardware parity.
- Original Spine4.3.26 behavior or format/runtime semantics not already proven.
  Those require the standing paired reference workflow; Linux tests reuse that
  evidence and do not turn own assumptions into original-version proof.

User-owned Linux window829352 and Windows windows72716/65104/33932/67032 stay
protected. This memo neither touches them nor marks the complete goal done.
