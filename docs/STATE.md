# Current state — 2026-11-08

## Active goal and priorities

The latest user explicitly authorized Git push and automatic build/release update.
Immutable beta3 remains a failed candidate: its Windows test-only bare-drive ESM
import and hosted Sequence Setup no-op comparison blocked publication. Main and
immutable`v0.9.4-beta.4` were pushed at`f21d908cfa7ce0aa68fbd716965aa8eb74081f5b`.
Its main run passed all three desktop build/test/package jobs, but Ubuntu UI
finished113/114: Setup Undo/Redo passed, then an unchanged Sequence Graph-key
blur resubmitted the accepted key and consumed Undo. The beta4 tag run was
intentionally canceled before publication after the user reported disabled
native File commands. No beta3/beta4 release assets were published; both tags
and failure evidence remain intact.

Beta5 is prepared with semantic mode/index/authored-f32-delay no-op detection and
recursive native File/Edit command lookup. The native defect was a shallow Tauri
root-menu lookup missing commands inside submenus, not a project capability
change. Fresh rebuilt-production local acceptance passes114/114UI,418JS with
one known skip and runtime16package/24native-export samples. Own Windows native
menu QA on immutable`8f65102a…24dbf` passes all6groups and closed normally; exact
scope is below. Beta5 has not yet been pushed; fresh CI and release publication
remain pending. Prior candidate failures are not relabeled as passing runs.

Main push starts CI; validated beta tags publish source+runtime only after all
three desktop builds and Ubuntu UI/runtime checks pass. Installed-app auto-update,
public desktop installers and npm registry publication remain separate milestones.
Prior [beta4 publication checkpoint](../analysis/public-beta4-check.json),
[Sequence DATA](research/SEQUENCE-SETUP-NOOP-DATA-2026-11-08.md) and paired
[release DATA](research/PUBLIC-UPDATE-DATA-GATE-2026-11-08.md)/
[UI](research/PUBLIC-UPDATE-UI-GATE-2026-11-08.md), plus the
[native menu gate](research/NATIVE-FILE-MENU-UI-GATE-2026-11-08.md), own the
current correction. The beta4 checkpoint retains its named local/remote evidence;
current local beta5 acceptance does not establish a remote CI or release result.

The prior Animate X/Y/performance/runtime delivery stays implemented and verified;
full F105/runtime/Spine compatibility remains open. The user clarified that the
opened mascot came from the Desktop import test; the protected window's earlier
read-only title observation confirms a loaded document. The user then tested
that mascot and confirmed runtime export and the other File buttons work. This
is user-reported command acceptance, not a fresh original-format equivalence
check. No automation of that user window is authorized. Do not resume unrelated E/B/F/G or user-deferred
F307/F308 fidelity research.

Current selected immutable Windows0.9.4:
`39efc9c1c8bb370811fe827dc9a0a378fdf6210eb3e2a2efa0a95becb5d03a58`
(13,301,760bytes), selected by unchanged bootstrap/shortcuts in `WINDOWS_TEST`.
Fresh normal visible launch90656 reached frontend ready without a debugger port;
ownership transferred to the user. That new window is protected; do not automate
or close it. Its receipt is `.local/public-beta5-user-process.json`. The older
protected mascot window was untouched. Final image differs from the menu-QA
image only by the Sequence key guard; final-image native gestures were not rerun.
The earlier WSL launch failure is historical: Windows interop worked this session.
No user/original project or window was operated. Public beta.2 is unchanged.

[Single checkpoint](../analysis/animation-reliability-check.json),
[integration and limits](research/ANIMATION-RELIABILITY-INTEGRATION-2026-11-08.md),
[drag DATA](research/ANIMATION-DRAG-RELEASE-DATA-2026-11-08.md),
[UI/performance](research/ANIMATION-DRAG-PLAYBACK-UI-GATE-2026-11-08.md) and
[numeric DATA](research/ANIMATION-NUMERIC-FOCUS-DATA-2026-11-08.md) own this work.
Accepted earlier format/source evidence remains in the
[mascot checkpoint](../analysis/mascot-support-check.json) and paired gates.

## Current behavior

The release jump was a second application of a previewed transform: a measured
extra26units. Frozen Animate gestures now key against the original native local
pose and world matrices. Signed X/Y, groups, Rotate/Scale/Shear, Auto Key on/off,
Escape/stale epochs and single-action history remain covered. Setup is untouched.

Numeric input keeps exact text in the DOM throughout focus, with an inaccessible,
noninteractive compact display overlay when unfocused. This preserves selections
made before focus and fixes replacement text appending to the old precise value.
A synchronous focus-write attempt was disproved; reuse final evidence, not that
superseded proposal. Replacement/Enter/Escape/Sequence/Refresh retention pass.
Central Setup/Animate transform placement and Animate-only Key/Auto Key remain.

Playback recomputes only affected constraint subtrees, submits one viewport draw
per pose instead of two, and caches unchanged timeline metadata/rows/Graph.
Measured mascot evaluator CPU mean1.010→0.253ms (4.00×); all-bone custom-renderer
Timeline CPU13.579→1.002ms (13.55×).756complete frames/Physics states and48draft
samples match exactly, with additional retained solver comparisons. These are
component CPU measurements, not a whole-app Windows mascot FPS guarantee.

## Independent runtime preview

`@fbones/runtime`0.1.0-beta.1 has platform-free Node/browser ESM/types and optional
PixiJS8 `/pixi` view. It bundles our own code under MIT, no Spine runtime code,
assets or dependency. Usage/support/limits are in
[packages/runtime/README.md](../packages/runtime/README.md).

Installable local archive:
`WINDOWS_TEST/RUNTIME/fbones-runtime-0.1.0-beta.1.tgz` (40,353bytes/31files), SHA
`3239fd388e5929766571d6fb6d6d066657e9e89fa8143e5857c664c4b30d1a61`.
Offline Node playback and strict NodeNext TypeScript pass with only this package
installed, without Pixi or editor dependencies. Runtime source is in the public
repository; validated tagged releases attach a fresh archive after gates pass.
Beta5 publication is pending. npm publication/scope ownership remain separate.
Direct repository-root installation installs the editor; use the runtime archive.

File → Export runtime uses a native destination-folder picker and creates a new
`FBones-runtime-*` bundle: `skeleton.fbones.runtime.json`, referenced PNG/WAVs.
It rejects missing resources, stale revisions and inspection-only projects,
never bakes working poses or marks the authoring project saved. Separate game
JSON does not replace/change binary `.fbones`. Unknown timelines/data fail
validation. Mixing, direct project-binary loading and full Spine numeric/dynamics
parity remain unsupported. Physics retains the existing bounded FBones policy.

## Current proof

Fresh beta5 local114/114browser cases pass in2.5minutes, zero skips/failures/retries,
rebuilt production CSP and isolated real Rust Session. This includes both
Sequence Undo boundaries, final numeric focus, signed drag,
geometry/history/binary SaveCloseOpen, resources and shipped Pixi WebGL pixels
for Region/weighted Mesh/Clip/Sequence/two-color/topology changes.418JavaScript
pass/one existing Physics skip. Fresh runtime16package tests and24generated
native-export samples pass (maximum matrix residual6.36e-7). Prior named
326native/two ignored,95legacy/one ignored,16default-format/103Scene-format,
types/build/native-check/Clippy/rustfmt/delivery/bootstrap proofs remain retained;
they are not a new combined beta5 run or a remote CI result.

Fresh own Windows native-menu QA on immutable`8f65102a…24dbf` passes6groups:
actual WinAPI Save/SaveAs/Export disabled when blank; all3enabled after native
Open of an own editable fixture; native WM_COMMAND SaveAs and runtime Export
reach OS pickers and produce the expected outputs; inspection-only SaveAs is
byte-identical while Save/export remain disabled; Close restores all3disabled.
Typed-f32 runtime JSON is exact, and export preserves authoring. Inspection copy
advances the Session revision once by `project.rs` copy policy, not authoring.
The QA session closed normally. Caption/revision assertion failures and traces
remain retained; successful mutations were not repeated. Receipt:
`.local/native-file-menu-qa-result.json`. This proves that own Windows image's
native menu state/routes, separately from browser custom-File coverage.

Own Windows WebView2 QA on immutable`6ea2ad16…26d9e` passes five groups: two
signed XY drags with preview/release and Undo/Redo, non-authoring playback,
native Open/SaveAs and native runtime export. The owned QA was saved and closed
normally. Exact typed-f32 comparison resolves81.6 versus81.5999984741211 JSON
spellings without loosening integer/reference checks. Failed attempts/raw traces
were retained; completed drags were not repeated.

Prior`80c71cc0…a1645` differs from that earlier drag-QA image only in numeric HUD
presentation/styles, covered by all114final browser cases. Its normal Windows
startup was observed. Current`39efc9c1…03a58` normal startup is observed, but no
final-image native numeric gesture or fresh original4.3.26 acceptance is claimed.
macOS remains unverified. No new
original editor launch, probe or compatibility acceptance was attempted.

## Preserved profile boundaries

Mascot remains typed/editable125bones/24slots/22PNGs/2clips/79constraints with
all223769source payload bytes independently regenerated and accepted earlier
native/saved-field proofs. Known source state/Slot8 remain typed read-only
snapshots; remembered export/PSD paths never cause operations. Existing whole
canonical reserialization equality and unknown-record guards remain mandatory.
Earlier eight-source corpus remains4editable/4guarded; mascot is fifth of nine.

Scene bones256/slots512, Mesh512/Clip256vertices, geometry4096/edge4096,
binding/constraints128, cliptracks1024/projecttracks4096/projectkeys8192,
perclip/pertrack/nativebatch4096, domain16384/depth256 remain unchanged.
PNG128MiBcompressed/256MiBdecoded-cache/max4096side and legacy bounds remain.
E reversing keys, B inheritance/curves, F larger budgets/curves and G Path/other
unmodeled data remain guarded. Full animation roadmap stays under F105;
F307/F308 broader fidelity remains explicitly user-deferred.

## Cleanup and next reproducible action

This publication/menu session removed243.07MiBallocated Linux data: the consumed
beta3 clean-install workspace, disposable own fixture-generator executable and
normally closed own menu-QA launcher copy. It removed74.03MiBfile data from that
QA's Windows profile after verifying no image/profile process remained. Earlier
session cleanup is retained in its named integration evidence; no Linux removal
is reported as immediate Windows/VHDX space recovery. Linux free831GiB, Windows
Cfree89GiB. Current user windows/profiles and all original/personal files remain.

Retained current runtime/dist, selected/QA immutable images, fresh114-case report
and required saved/GPU artifacts, cited raw failures/traces/receipts and source
archives. Coherent native dependencies5.2GiB and Windows release cache852MiB stay
for repeatable builds; incremental cache4KiB. Historical images/workspaces remain
where ownership or future reference relevance is uncertain. No broad cargo clean.

Next: export the reviewed beta5 source, commit and atomically push main plus a new
immutable tag; observe its exact platform/UI/runtime jobs and attached release
assets before claiming publication. Never retag beta3/beta4 or bypass failed gates.
The user has confirmed mascot runtime export and the corrected File commands.
For developer use, install the runtime archive and File → Export runtime; follow
its package guide. npm publication still requires an owned scope and a separate
publication instruction. Reproduce integration with `pnpm test:runtime` and
`pnpm test:ui --no-build --workers=2 --global-timeout=600000` after rebuilding
changed sources. Reuse retained exact-version evidence, not unchanged oracle runs.
