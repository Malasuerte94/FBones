# Current state — 2026-11-08

## Active goal and priorities

The latest user explicitly authorized Git push and the corresponding automatic
build/release update. Preparing `v0.9.4-beta.3` source plus developer runtime
publication. Main push starts CI; validated beta tags publish only after all
three desktop builds and Ubuntu UI/runtime checks pass. Installed-app auto-update,
public desktop installers and npm registry publication are separate, unconfigured
milestones. Current [publication checkpoint](../analysis/public-beta3-check.json)
and paired [DATA](research/PUBLIC-UPDATE-DATA-GATE-2026-11-08.md)/
[UI](research/PUBLIC-UPDATE-UI-GATE-2026-11-08.md) audits own this action.
No main/tag push or beta3 release is claimed before remote observation.

The prior Animate X/Y/performance/runtime delivery stays implemented and verified;
full F105/runtime/Spine compatibility remains open. The user reports mascot import
works. Do not resume unrelated E/B/F/G or user-deferred F307/F308 fidelity research.

Current immutable Windows0.9.4:
`80c71cc0094263ad99616151c8ea44f0aeff4876fd0cc192a0b76d8ccd7a1645`
(13,301,760bytes), selected by unchanged bootstrap/shortcuts in `WINDOWS_TEST`.
Normal visible frontend startup was observed, no debugger port, and ownership
transferred to the user. That new window is protected; do not automate or close
it. Its fresh receipt is `.local/animation-reliability-user-process.json`.
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
installed, without Pixi or editor dependencies. GitHub source/releases plus npm
is the intended distribution; nothing was published, and scope ownership is not
established. Direct GitHub repository-root installation installs the editor, so
use the runtime archive until its package is published.

File → Export runtime uses a native destination-folder picker and creates a new
`FBones-runtime-*` bundle: `skeleton.fbones.runtime.json`, referenced PNG/WAVs.
It rejects missing resources, stale revisions and inspection-only projects,
never bakes working poses or marks the authoring project saved. Separate game
JSON does not replace/change binary `.fbones`. Unknown timelines/data fail
validation. Mixing, direct project-binary loading and full Spine numeric/dynamics
parity remain unsupported. Physics retains the existing bounded FBones policy.

## Current proof

Final114/114browser cases pass, zero skips/failures/retries, production CSP and
isolated real Rust Session. This includes final numeric focus, signed drag,
geometry/history/binary SaveCloseOpen, resources and shipped Pixi WebGL pixels
for Region/weighted Mesh/Clip/Sequence/two-color/topology changes.416JavaScript
pass/one existing Physics skip;326native/two existing ignored;95legacy/one
ignored;16default-format/103Scene-format. Runtime16package tests and24generated
native-export samples pass (maximum matrix residual6.36e-7). Product/UI types,
web build, native check, strict e2e-host Clippy, rustfmt, two Windows delivery
and two bootstrap tests pass.

Own Windows WebView2 QA on immutable`6ea2ad16…26d9e` passes five groups: two
signed XY drags with preview/release and Undo/Redo, non-authoring playback,
native Open/SaveAs and native runtime export. The owned QA was saved and closed
normally. Exact typed-f32 comparison resolves81.6 versus81.5999984741211 JSON
spellings without loosening integer/reference checks. Failed attempts/raw traces
were retained; completed drags were not repeated.

Final`80c71cc0…a1645` differs from that QA image only in final numeric HUD
presentation/styles, covered by all114final browser cases. Its normal Windows
startup is observed. This is not a second final-image native numeric gesture
or fresh original4.3.26 acceptance claim. macOS remains unverified. No new
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

Removed39.25MiBallocated Linux artifacts including agent cleanup:278own temporary
UI session directories, redundant GPU probe bundle, own bootstrap test binary,
closed own QA launcher copy and package caches/scratch. Removed the normally
closed Windows QA profile (74.07MiBfile data), after checking no image/profile
process remained. No VHDX shrinking/host-space recovery is inferred from Linux
removal. Final Linux free831GiB, Windows Cfree79GiB.

Retained current package/dist, current/QA immutable images, current UI report and
required saved/GPU artifacts, cited raw evidence/useful failures, coherent5.0GiB
native dependencies and852MiBWindows release cache. Older immutable Windows
images455MiB and historical test workspaces58MiB are retained; ownership/current
relevance was not established for deletion. Incremental compilation is disabled
for one-off checks; its cache is4KiB. The new user's active window/profile stays.

Next: use the already-open current window or existing shortcut and test the
mascot's X/Y release/playback on the user's hardware. For development, install
the local runtime archive, File → Export runtime, and follow the package example.
A future publication needs the maintainer's chosen/owned npm scope and explicit
publication instruction; do not imply the package is already on GitHub/npm.
Reproduce current integration with `pnpm test:runtime` (build e2e-host first) and
`pnpm test:ui --no-build --workers=2 --global-timeout=600000` after rebuilding
changed sources. Reuse retained exact-version evidence, not unchanged oracle runs.
