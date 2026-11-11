# FBones contributor instructions

## Goal and fixed decisions

Build FBones, an offline Windows/macOS/Linux 2D animation editor for our team.
The only reference is **Spine 4.3.26 Professional**; never infer behavior from
older editors. Full compatibility is progressive, not a claim. `.fbones` must
retain the `.spine` 4.3.26 binary structure, never JSON, a custom container or an
opaque renamed template. Verify independently encoded copies in original Spine
before declaring compatibility for a supported profile.

## Start and continue

Read this file, current `docs/STATE.md`, `docs/TASKS.md`, then only relevant
format/task notes. Continue the active task or one with satisfied dependencies.
The latest user pause/resume wins; historical notices are not current status.
Before ending, update the single current STATE checkpoint and affected task
rows with results, evidence limits and the next reproducible action. Do not
prepend delivery history to all three files. Historical instructions are saved
verbatim in `docs/research/archive/AGENTS-2026-10-30-before-workflow-review.md`;
archives are evidence for lookup, not an additional procedural checklist.

Roadmap: lifecycle → bones → images → meshes → weights/binding → timeline →
constraints/physics → full compatibility → additional tools. Latest user steering
(2026-11-11) sets a **general 90% delivery milestone**: finish and validate the
usable core, record remaining fidelity/edge cases, then move on. Return to those
explicit remaining items in the final 100% pass; do not block all other work on
perfection. The percentage is a user-approved planning milestone, not measured
reference coverage or a claim of full compatibility. Preserve data integrity,
safe persistence, existing acceptance evidence and honest evidence limits.

Physics F307 and both Transform Match actions F308 are **READY90**. Their known
phase/precision/Additive/Physics/suffix gaps are deferred to the final 100% pass;
do not resume their original probes now. Current priority: finish actual native
Windows0.9.5→0.9.6 clean-upgrade90 acceptance. Debian/AppImage full profiles and
macOS ARM64 clean-upgrade90 are accepted; reuse those results and distinct
diagnosed observations. At90%, Windows/macOS
acceptance is actual clean signed upgrade/automatic restart/current0.9.6/normal0,
then fresh installed renderer-ready/current0.9.6/normal0 and unchanged independently
decoded own file bytes on disk. Native project Open/reopen/New/edit/dirtyCancel/Save
UX there belongs to final100%; never label fresh startup/disk checks project
persistence. Preserve existing Animate
work and verify its integration when affected. Skins remain at the end. Reuse
accepted evidence; never repeat completed batches or unchanged failed routes.

Animation UI must follow the supplied `animare/` screenshots very closely:
Spine-like panel placement, density, Graph/Dopesheet, toolbar, tracks/ruler,
playhead, keys and floating tools; only the color theme should differ. Reuse
the paired animation DATA/UI audits before dependent implementations. Full
animation scope stays tracked even when delivered in tested vertical slices.
The central transform controls are shared by Setup and Animate. Setup edits
authored bone fields; Animate edits the sampled pose/keys. Key and Auto Key
buttons belong to Animate. Preserve this user-requested shared layout.

## Parallel work and reference first

The user requests parallel work on substantial tasks: ideally five implementers,
two reference auditors and the coordinator. Obey actual capacity: **four agents
total currently permits three subagents**. Assign distinct ownership; the
coordinator integrates and owns shared test runs. No global agent settings edits.

**Before every feature implementation or fix, assign two reference agents**:
DATA for behavior/model/persistence; UI for appearance/controls/interactions.
First inspect relevant existing exact-4.3.26 evidence and local screenshots.
Reuse accepted findings for unchanged behavior; do not interpret reference first
as a fresh original launch for each fix. Record the finding before dependent
coding. Rotate agents into implementation/review and research upcoming work
within the concurrency cap.

Evidence order: **reverse engineering → official documentation → assumption**.
Label conclusions directly proven, documented, inferred or unknown, citing a
source/command. Version-unpinned docs do not prove exact 4.3.26. Follow observed
behavior/layout unless the user requests a difference. Label FBones policies
where behavior is unknown; do not claim parity for approximations. Inspect local
evidence before asking the user for information.

## Efficient reverse engineering

- Start with one unanswered question and the decision it changes. Reuse accepted
  evidence and the installed-package inventory before collecting new material.
- Choose the cheapest discriminating direct evidence: targeted inspection of
  actual editor/loader/resources, existing fixtures, a small original CLI case,
  then original GUI for unanswered interactions. Static inspection never proves
  an unseen gesture. Do not decompile/rescan everything for every feature.
- Use small own fixtures and independent semantic/binary or pixel comparisons.
  State hypotheses and bounds before observation. Distinguish controls present,
  functional behavior, persistence and numeric fidelity. A screenshot/submitted
  click alone is not proof of a mutation or successful persistence.
- Prefer one reusable original-session driver with scenario configuration.
  Review ownership/isolation and the sequence once per new scenario or meaningful
  driver change. Do not create per-click root approval JSONs for Tree navigation,
  expansion or screenshots. Validate current controls and semantic before/after
  results rather than exact one-pixel coordinate equality. Internal scenario
  review does not require user permission for already authorized own-instance work.
- Keep one source/tool manifest and one concise result per experiment, retaining
  raw files and failures. Reuse unchanged helpers; create new run/ownership records
  without overwriting consumed receipts. Do not add redundant approval layers.
- A reviewed driver may restore **its own** minimized window without activation
  once, recapture and recheck identity/visibility. Stop on ownership/source changes
  or unexpected modals. Never recover user windows or fall back to global input.
- Batch compatible read-only observations in an owned session. State-dependent
  mutations run once per intended sample; independent hypotheses use fresh fixture
  copies. Never blindly repeat Match or chain independent branches.
- Start new tool routes with a 10–15 minute feasibility pass. Continue longer only
  with an identified capability and expected useful datum. Keep negative results;
  retry for materially new evidence or a diagnosed fix, not unchanged speculation.
- Do not recollect accepted original oracle batches on unchanged inputs. Rerun
  relevant regressions when product code changes and required checks at integration.
  Unknown details block dependent claims/code, not independent improvements already
  supported by evidence. Keep unresolved fidelity gaps and the full goal open.
- REA orchestrates inspection providers; it does not automatically reconstruct an
  app. Use it for an identified question/provider via a pinned project-local CLI,
  never global setup/agent registration. Audit sources and rationale:
  `docs/research/RE-WORKFLOW-REVIEW-2026-10-30.md`.

## Mandatory cleanup and disk-space discipline

**Very important user requirement: always clean up after your work.** At the end
of every session, remove your own generated artifacts that are no longer used.
Do not leave obsolete build variants, incremental compilation caches, temporary
copies, scratch outputs or abandoned test bundles accumulating between sessions.
Routine cleanup of verified disposable artifacts is authorized; do not ask for
confirmation each time.

- Measure disk usage before substantial builds/research and again at session end.
  Check both Linux free space and the Windows drive hosting the WSL VHDX: Linux
  can report free space while the host drive is nearly full. If space is tight,
  clean disposable artifacts before starting another large build or capture.
- In particular, monitor `target/debug/incremental`, `target/debug/deps`, native
  build outputs and cross-platform target directories. Reuse consistent Cargo
  profiles/features where possible. Remove obsolete variants after their checks
  are complete; prune or disable incremental caches for one-off research/test
  builds when retaining them has no continuing benefit. Do not blindly run a full
  `cargo clean` after every build or delete another active task's outputs.
- Remove your own temporary fixtures, unused copies and scratch research outputs
  once they are no longer needed for a result, regression or reproducible next
  step. Retain the concise findings, required manifests and raw evidence that
  existing research records cite, including useful negative results.
- Preserve source files, personal/original projects and backups, original tools
  and packages, active test inputs, current deliveries and anything still needed
  to reproduce accepted evidence. For Windows build cleanup, verify ownership,
  current-build selection and active processes before removing an unused build;
  never remove a selected or mapped executable. Uncertain ownership or relevance
  means retain it and report the unresolved item.
- Coordinate cleanup with active agents/builds/tests. Report what was removed,
  how much space was recovered and any significant retained disposable backlog.
  Include the cleanup result in the normal session checkpoint when one is due;
  do not create extra history files just to record cleanup.

## Original instances and research data

Use dedicated own instances/copies. Protect **all** personal/original projects
and user windows. Read `.local/*user-process*.json` and relevant ownership
receipts before process operations. Verify PID **and start time**, executable,
project and window identity. Never input, save, reset, attach, open fixtures in
or close a protected user instance or its launch transport. PIDs/HWNDs can recur;
closed processes and one-shot gates are historical, not reusable identities.
Original launches must not forward tests into personal instances; recheck actual
absence/isolation rather than treating an old blocked/closed receipt as current.

Original materials: `spin_windows/`, `Spine.tar.gz`, `updates/`; active editor
package: `updates/updates/4.3.26`. Backups are personal source data, not cleanup.
No original binaries, extracted code, personal projects or local absolute paths
in Git, distributables, published screenshots or fixtures. Raw research stays
ignored; only our tools/specifications/aggregate findings may be committed.
Never distribute extracted code/assets. No activation bypass or patched original
is needed. Demonstrate tool capability on the target platform before claiming an
original observation. Launcher decompilation is not editor-method recovery.
Windows JVMTI and exported VMStruct probes have negative results already; retain
these, avoid unchanged retries or guessed object offsets. STATE links evidence.

## Stack, authoring and format guards

- Tauri 2 + Rust owns native integration, Session and filesystem. Vue 3 Composition
  API + strict TypeScript + Pinia; compact dark Tailwind panels; PixiJS 8/WebGL.
  No full-scene IPC per pointer event/frame. Internal future modules, no plugin ABI.
- Strict CSP: import `pixi.js/unsafe-eval` before renderer startup for static
  implementations; never allow eval. Separate renderer from readiness/IPC errors;
  run CSP regressions when initialization changes.
- Independent `fbones-format` crate has no Tauri/UI. Native dialogs and shortcuts/
  buttons share commands. Desktop0.8 canonical `minimal::scene` includes complete
  attachment inventory, nullable active reference, clipping and ordered IK/
  Transform/Physics;0.9 adds named four-channel bone animations, FPS,
  linear/stepped/Bezier keys and combined light-RGBA/Region/Mesh/Clip/none slot
  timelines. Legacy `--no-default-features` remains a regression profile.
- Images assets, attachment inventory, selection and slot draw order are distinct.
  A slot can own alternatives with at most one active visible attachment.
- Only supported portable paths/default-skin/Setup data are editable. Unknown
  skins, unsupported animation timelines, inheritance or records stay inspection-only. Preserve bounded
  parsing plus complete reserialization equality; never drop unknown data to fit.
  Lossless copying differs from encoding a new compatible project.
- Preserve PNG resource safety, stable native IDs/history/remapping, dense bindings
  and frozen geometry epochs. Bone authoring is in `src-tauri/src/rig.rs`; wire
  parents precede children. Reparent preserves world pose; one history entry per
  completed drag. Save awaits fields/checks snapshot revision before writing;
  failures/cancellation stay dirty. Never overwrite original `.spine` sources.
- Setup preview/physics never bakes evaluated poses, velocities or its clock.
  Default-live Setup gravity/parent motion requires no Play/Run. Explicit Simulate
  off survives holds/resource generations; documentId alone cannot enable it.
  Serialize checkpoint/freeze leases; canceled replies cannot resurrect holds.
- Transform endpoints preserve exact nullable f32 bits, unrelated rows and source/
  target order. Metadata never authors runtime caches; runtime diagnostics remain
  read-only. Both Match actions use precise cached authored poses and scratch
  Physics; active Local/Local references prove48 Properties
  scalars and6 Offset scalars. Preserve
  None mode, pending-field flush, atomic stale/singular rejection and one history
  action. New independent suffix Offset/Properties observations prove sampling
  all constraints except the selected Transform for their Local/Local graph;
  implement that correction without changing cached Physics. Broader spaces,
  additive/Physics sampling and clear/equal/conflict choices remain labeled
  until measured in the original.

## Verification, delivery and launch

### Editor UI and interaction standards

The user requires a compact, intuitive animation-editor interface with useful
color and visual controls, following Spine4.3.26 evidence first. Use semantic
axis/property colors, small labeled/icon buttons and visible selected/hover/focus
states; color must not be the only signal. Avoid walls of plain numeric inputs.
Pair sliders with precise numeric entry for bounded controls such as0–100%,
preserving native ranges, units, valid extended values and numeric precision.
One completed slider gesture creates one authoring/history action; Escape cancels,
Save flushes valid edits, and invalid drafts block Save. Reuse controls/tokens;
test pointer and keyboard interaction, disabled state and narrow dock layouts.
Physics acts directly on selected bones, one record per bone, with meaningful
creation settings and automatic default names that follow bone rename while
preserving custom constraint names. Live Setup must react and settle without Play.
Research unfamiliar UX through primary editor/platform guidance, distinguishing
documentation from exact-version proof. See `docs/UI-UX.md` and the current
Physics policy/task for evidence and explicit FBones choices.

Setup `pnpm install`; dev `pnpm dev`; browser `pnpm dev:web` (desktop for files).
Checks: `pnpm typecheck`, `pnpm build:web`, `pnpm test`, `pnpm test:ui`,
`cargo test -p fbones-format`, `cargo test -p fbones-desktop`,
`cargo check -p fbones-desktop`. Desktop build: `pnpm build`.
See `docs/DEVELOPMENT.md` for platform/offline toolchains.

Routine UI: **Ubuntu + Playwright**, production CSP, isolated real Rust Session
via opt-in `e2e-host`; reuse native geometry/history/encoding, not a second JS
engine. Normal builds exclude the host. Focus tests during iteration; full
required checks at integration. Rebuild changed product sources before
`--no-build`. Use locators/mouse/keyboard and failure traces; one coordinator owns
shared server/report output. See `docs/TESTING.md`.
Do not run a frontend rebuild concurrently with UI tests serving `dist/`;
the Windows build script also invokes `build:web` and temporarily clears it.

Browser checks do not prove native GTK, Windows WebView2, OS dialogs, OS HTML5
drag/drop or macOS. Use targeted native checks for affected integrations and
Windows deliveries. DOM DragEvents are not OS mouse proof. Never claim external
checks without observation. Documentation-only work needs content/link checks,
not application builds or original launches.

Windows deliveries belong in shared `WINDOWS_TEST/`; Desktop shortcuts already
point there. No manual copying, Desktop writes or Linux executable as `.exe`.
Use mapped W: for app and original CLI; Spine rejects UNC inputs. Preserve
immutable `WINDOWS_TEST/builds/<sha256>/FBones.exe`, build-info.json selection,
current-build.txt and stable root bootstrap. Never overwrite a mapped image.
No anonymous GUI stream pipes or shell share prompts. Launch with
`powershell.exe -NoProfile -ExecutionPolicy Bypass -File <mapped-path>`; never
change global policy/run the Desktop shortcut installer. Import results with
`scripts/import-windows-results.py`; host paths stay in `.local/windows-host.json`.
`fbones-research` is separate from runtime; do not rerun completed reference
batches through `WINDOWS_TEST/FORMAT_TEST/Ruleaza-Testele.bat`.

At each **implementation** session end, attempt to open current FBones and leave
it available. Report real launch failures, not build-only success. Existing user
windows remain protected; documentation/research-only sessions need no duplicate
normal launch. Use local caches if global cache writes are unavailable.
