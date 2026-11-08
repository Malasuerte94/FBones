# Current state — 2026-11-08

## Active goal and priorities

The latest user clarified the exact target: the repository RIGHT sidebar
Releases card, rather than README/release-body Download tables. This is fixed
and directly verified on the live repository. Existing beta6 release438467646
was changed from GitHub prerelease=true to prerelease=false and make_latest=true.
The Beta/Early beta title, product limits, immutable tag57ee1f26 and all10asset
IDs/names/digests are unchanged. GitHub's category does not claim stable quality.

GET releases/latest now resolves to beta6. Anonymous Chrome1440×1000 confirms
the actual right-hand Releases section shows the beta6 card, green Latest badge
and correct release URL. Private evidence: .local/public-beta/beta6-sidebar/
after.json and after.png. The before browser capture caught a loading skeleton;
before absence is supported by the user's report and live latest404, not that
incomplete capture. Paired installer DATA/UI gate appendices record the latest
instruction overriding the prior retain-prerelease policy before mutation.

Future workflow publication now uses --prerelease=false --latest under the same
platform/UI/runtime/archive gates. No new tag, asset rebuild/reupload or installer
execution is needed. Main-only metadata-policy followup is being committed;
the already published beta6 tag and downloadable content stay immutable.

Prior delivery remains verified: tag42513851453/main42513850954 passed, publishing
beta6 on2026-11-08T19:26:25Z. Its10downloaded assets comprise4desktop kits,
runtime/source/3reports/checksums. Every digest,9checksums,4installer/report
matches, source686blob/archive and runtime31file equality pass. CI7policytests,
3platform jobs,114/114UI,16runtime checks and24native samples pass. Live desktop/
narrow Download tables also passed, separately from the new sidebar proof.
[Current checkpoint](../analysis/public-beta6-check.json) owns the results.

All255product/runtime/format source files are unchanged from accepted beta5;
this change affects packaging/retention/publication and download presentation.
No local app rebuild, new original probe or user-window interaction occurred.
Native installation of CI packages remains unverified; Windows is unsigned,
macOS ad-hoc signed without Developer ID/notarization. No installed-app updater,
npm publication, stable/full-compatibility or new native GUI claim is made.

Beta5 fixes semantic mode/index/authored-f32-delay key no-ops and recursive native
File/Edit item lookup. Tauri's shallow root lookup missed submenu commands; all
project capability guards remain. Own native menu QA passes6groups on8f65102a,
then closed normally; current selected39efc9c1differs only by the Sequence guard.
Current [publication checkpoint](../analysis/public-beta5-check.json),
[Sequence DATA](research/SEQUENCE-SETUP-NOOP-DATA-2026-11-08.md), paired
[release DATA](research/PUBLIC-UPDATE-DATA-GATE-2026-11-08.md)/
[UI](research/PUBLIC-UPDATE-UI-GATE-2026-11-08.md) and
[native menu gate](research/NATIVE-FILE-MENU-UI-GATE-2026-11-08.md) own the results.
Prior candidate evidence remains under its named checkpoint.

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

Published installable archive:
[fbones-runtime-0.1.0-beta.1.tgz](https://github.com/Malasuerte94/FBones/releases/download/v0.9.4-beta.5/fbones-runtime-0.1.0-beta.1.tgz),
40,373bytes/31files, SHA256
`655df42b7db85508a1a718904b3ed44b615631b8178145e1bcb72328ac7b510a`.
The downloaded package matches current locally tested source/dist byte for byte.
Earlier offline standalone Node/strict NodeNext checks remain named evidence;
headless use needs neither Pixi nor the editor. The historical local40,353-byte
archive is retained under WINDOWS_TEST/RUNTIME for its earlier receipt. Use the
published archive for the current distribution. npm scope/publication is pending;
direct repository-root installation installs the editor instead of the runtime.

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

Generated policy-test fixtures were automatically removed. Packaging removed its
14,338-byte helper cache; coordinator removed20,480allocated bytes of own current
Python caches. No substantial local build or obsolete native variant was created.
Earlier cleanup is retained in its named checkpoint, not counted as new recovery.
Linux free831GiB, Windows Cfree87GiB; no physical/VHDX recovery is inferred from
unlinked caches. Original/personal files and protected user windows stay untouched.

Retained the current reviewed source snapshot/archive,10downloaded published
assets95.34MiB for reproducible delivery verification, desktop/narrow real GitHub
screenshots/report and useful calibration failures. Current Windows selection,
referenced/uncertain older workspaces and prior delivery evidence remain. New
large Actions installer artifacts expire after7days; release assets stay public.

Next: use the Download table on the repository/release page. Select the desktop
package for the OS, or install the runtime tgz in a game and File → Export runtime.
Native installer lifecycle/signing/notarization and broader runtime/fidelity remain
open; full F105 and deferred F307/F308 are unchanged. Main pushes check/build;
validated beta tags publish all4desktop packages and runtime/source as GitHub
Latest after all existing gates pass. Keep immutable tags and scoped release validators. This
post-publication checkpoint records outcomes observed after the source tag.
