# Current state —2026-10-31

## Public beta and platform CI — current user goal

Goal: publish public Malasuerte94/FBones, observe successful Windows/Linux/macOS
GitHub workflows, and verify README presentation. This goal has a public repository and awaits hosted validation/release; it is NOT
complete. Source-only beta v0.9.4-beta.1 is prepared; no public repository, hosted
workflow run or release has been observed. Internal Windows delivery below is
separate and unchanged.

### Completed locally

MIT/license metadata, contributor guide, ROADMAP, issue/PR templates, source and
asset provenance, direct dependency notices and beta notes are present. README
contains three genuine0.9.4 captures; all PNGs/hashes and relative/navigation
links pass. CommonMark+table rendering produces six headings/three images/eleven
status rows/two code fences; Setup alt text now matches its bone-only fixture.
Live GitHub/desktop/narrow README layout remains unobserved because browser/socket
launches are sandbox-blocked. UI reference audit: research/PUBLIC-BETA-README-UI.md.

Paired reference DATA/UI audits precede CI fixes. weights-panel test now imports
Vue's declared compiler export and uses native dirname rather than slash slicing.
An isolated pnpm resolution check OUTSIDE the workspace proves the new import
resolves and the old undeclared import fails. The original nested probe inherited
ancestor node_modules; that negative isolation result is retained, not counted as
fresh isolation. Full clean install linked97cached packages but esbuild postinstall
hit spawnSync EPERM; the subsequent outside-workspace check deliberately used
--ignore-scripts and proves module resolution only, not full install/build.

Fresh local checks on current sources: JS263pass/1knownskip; production frontend
build and product/test TypeScript pass; Rust workspace254native+46format+7research
pass (2native ignored), legacy93pass/1ignored. Logs .local/public-beta/ci-{js,
frontend,rust,rust-legacy}.log; isolated import/install logs use ci-isolated-*.
No runtime/editor/codec source changed. Existing95UI remains historical evidence;
no new full editor UI run or platform launch is claimed. After full access was
granted, the same previously blocked dependency install completed successfully
with esbuild postinstall, followed by263JS/1knownskip, production build and testTS
in the isolated checkout. Log clean-install-test/fresh-checks.log under
.local/public-beta/. This supersedes the sandbox install blocker only.

Actual local Chromium README preview now succeeds at1440px and390px:3decoded
images per viewport, no page errors or document horizontal overflow. Root visually
inspected desktop/narrow top and narrow implementation table; the table scrolls
within its container. Ignored .local/public-beta/readme-browser/ retains captures
and browser-check.json. This is a GitHub-like HTML approximation, not live GitHub
rendering. The earlier file-URL attempt failed relative image decoding; the
successful intercepted-origin renderer resolves genuine local images correctly.

### Workflow and release configuration

Desktop matrix builds Linuxx64 deb/AppImage, Windowsx64 NSIS and universalmacOS
app/DMG on native runners. Includes locked install, JS/testTS, Rust default/legacy,
Cargo lock flag after Tauri's required separator, explicit Linux prerequisites,
macOS targets/ad-hoc signing and source-path remapping. ci-build.py verifies
architecture, executable-only private-path patterns, package structure and hashes;
JSON reports explicitly mark native GUI validation FALSE. No installers uploaded.
Ubuntu UI separately fetches Cargo before offline host, chooses installed Chromium,
and uses a600s suite watchdog without weakening individual assertions.

Exact beta tag release job requires all3platform builds plus UbuntuUI, receives
contents-write only there, and publishes source/checksums/3build reports. Shell
publisher pushes without force then watches the exact tag/commit workflow; it
cannot race/bypass CI with local release creation. Initial illegal Tauri --locked
position and old immediate-release race were found and corrected before export.
Configuration/permissions/CLI-help/path-remap/shell checks pass; actual hosted
results are still REQUIRED. DATA and release audits live at
research/PUBLIC-BETA-{CI-DATA,RELEASE-AUDIT}.md; docs/PUBLICATION.md explains scope.

Current allowlisted candidate is .local/public-beta/current/: repository on main,
local v0.9.4-beta.1 tag, manifest/source archive/SHA256SUMS. Earlier source-only
candidate and clean-install probe remain separate ignored evidence; use CURRENT,
not the older v0.9.4-beta.1 directory. Archives exclude original materials, personal
projects/raw research, historical instruction archives, tools/configs/caches/builds;
include required numeric test fixtures. Content equality, neutral ownership and
source hashes must be rechecked after changes. Root empty/read-only .git untouched.

### PUBLIC repository; hosted validation in progress

User completed official GitHub CLI device authorization as Malasuerte94.
Project-local credentials stay ignored in .local/github-auth; no token in source.
Created PUBLIC https://github.com/Malasuerte94/FBones via gh and pushed main
7efc2f18c066900735d1d61828c3f1315e3226a6 over existing SSH. MIT recognized;
issues enabled, default branch main and relevant editor/stack topics configured.
Independent DATA/release audits match all471 remote Git blobs to reviewed source;
no excluded original/private material found. Candidate remains clean.

LIVE main workflow41202180924 runs exact7efc2f1:3native platform builds plusUbuntuUI.
Watch process exec54556 owns gh run watch; do not restart jobs on timeout.
No beta tag or release existed at the initial main checkpoint; see the final
verification-only/tag strategy below.
First macOS job124539994268 passed install/JS/testTS/Rust default+legacy and
frontend, then Tauri failed main-binary discovery. Paired DATA/UI finding recorded
before a manifest-only default-run=fbones fix; no editor runtime change. Cargo
metadata confirms the intended executable; hosted rebuild still required.
All3 first-run platforms confirmed the same default-run defect. First UbuntuUI
completed85pass/3timeoutfail/7notrun with600s suite errors; paired trace audits
show85matched passes median5.77x local, progressing constraints/Physics and frame
backlog before an undispatched Undo, without numeric mismatch. CI-only1worker,
90s test/20s action/15s expect/30s navigation/30min suite/45min job is now a
controlled resource-profile change; all95/assertions/no retries remain.

After default-run fix, run41202581221 on27342ec built real Linux/macOS editors
but Tauri bundling tried missing e2e_host. Exact pinned CLI source proves it
re-adds src/bin files after feature filtering. Paired DATA/UI gate preceded moving
the identical wrapper to src/e2e_host_main.rs; explicit name/feature preserved.
Local Debian build now completes; package inventory includes usr/bin/fbones and
NO testhost. Cargo metadata and explicit opt-in host build pass. Focused3 prior
UI failures now pass locally under the CI profile (17.5s), with unchanged exact
assertions; new full hosted validation is still required.
Current public main is65787704daa797c9ae72be42362b3f987c33feee after packaging2
and calibrated CI fixes. Actual run41203936898 is live; root watch exec86642.
Linuxx64 job124545089909 SUCCESS: deb/AppImage and report validation pass.
On main6578770, Linux+Windows jobs and full95UI are now GREEN; UI reports95passed
in9.6m with zero skips/retries/failures. All3 prior timed-out cases pass unchanged.
macOS compiled both target builds, signed and produced app+DMG, then the verifier
failed its lipo argument order. Primary Apple manual/parser proves input must
precede -verify_arch (the remaining args are parsed as architectures). Paired
DATA/UI finding precedes correcting only verifier order/diagnostics and recording
actual lipo -archs output. Both-architecture/codesign/path/DMG gates stay mandatory.

The final verification-only candidate and beta tag may be pushed together: the
tag workflow owns publication and still requires all3builds+95UI at that exact
commit. No local/manual release bypass. This replaces the earlier precaution of
waiting for a separate main run before triggering identical tag checks; it does
not weaken any release gate. The initial local beta tag has never been pushed.
The tracked public source/manifest are frozen separately from this local access
checkpoint; avoid creating extra source commits just to restate waiting status.
Receipts .local/public-beta/current/publication-progress.json,
.local/public-beta/live-ci-data/ and live-release/. Actual job results still pending.

Actual LIVE GitHub README at1440px and390px was rendered/visually inspected in own
Chromium. Three images decode1440x900, six headings/two code blocks, no JS errors
or document overflow. Desktop table fits; narrow table scrolls within container.
Evidence .local/public-beta/live-readme/browser-check.json and captures. Raw/API
checks returned200 with exact reviewed bytes for CONTRIBUTING/ROADMAP/LICENSE
and all3PNG resources, complementing transient429 on some blob-page requests.

Next: inspect existing main run, resolve actual failures with paired reference
findings first, verify final source/readme/license, then push v0.9.4-beta.1 tag
and observe all required jobs plus source prerelease/assets. The full goal is
ACTIVE/incomplete until all3platform builds and beta release are verified.
No native GUI parity claim follows from builds; public installer acceptance stays
separate. No original editor, protected user windows or internal builds touched.


## Priority and current delivery

F105 Animate/timeline/keyframes remains ACTIVE. The user accepted existing
Physics/meshes and deferred remaining F307/F308 exact-fidelity probes. Continue
animation without restarting those batches. Follow animare/ screenshots closely
with FBones colors. The central transform HUD works in BOTH Setup and Animate.

Internally delivered/opened Windows **0.9.4**, immutable image
`429e4c4f3f9aa08204f5c5f7d960f8d4d0f132dc0f86a1348b948a8be343887c`,
12,440,064bytes. build-info/current-build select it. All37older immutable images,
442reference helper files and stable bootstrap90e9c17e remain unchanged. Existing
examples/resources are preserved; no Desktop writes/manual copying/global settings.
Main reports: analysis/animation-physics-preview-{ui,delivery}-check.json,
animation-physics-preview-data-check.json and animation-physics-ui-original-check.json.
Full animation compatibility and original Physics dynamics/phase parity are FALSE.

## Delivered behavior

Setup retains affine bones/group gizmos, Tree/slots/PNG library, mesh tracing,
weights and clipping, constraints, default-live parent-motion Physics and native
history/save/reopen. Shared central transforms retain Setup Length; key/Auto Key
belongs to Animate. Earlier0.9.1–0.9.3 animation functionality remains available:
- Named clips/FPS, four bone channels, linear/stepped/Bezier, Graph/Dopesheet,
  mixed key selection/marquee/move/delete/clipboard, playback/loop and clean Preview.
- Slot Region/Mesh/Clipping/none activation, combined light RGBA, Draw Order,
  weighted Mesh/Clip deformation, scalar-progress curves and retained vertex selection.
- Grouped IK flags/two Bezier axes, six Transform mixes, seven Physics coefficients
  and Reset tracks; separate Event definitions/materialized payloads and portable
  PCM16WAV preview through real WebAudio/native validated resources.

New0.9.4 feeds Main and Preview from one animated Physics evaluation. Saved bone
keys, sampled coefficients and Reset use timeline time. Complete60Hz ticks commit;
fractional endpoints render cloned state. Seek/backward/loop rebuilds saved prefix
without redispatching Events/audio. Simulate Off uses None/static evaluation;
Rebuild keeps current frame and creates no key/history. Simulate On is explicitly
bounded to120seconds, with visible error and Off recovery for longer clips.

Native Replay geometry freezes agree with displayed motion, including the first
unkeyed weighted Mesh gesture. Working bone/constraint drafts apply once at the
endpoint, never in historical replay. Held frontend leases bind document/revision/
clip/frame/draft generation and Simulate intent; stale replies reject before
AutoKey-off transient conversion and again before IPC. A completed drag creates
one native key/history entry. Setup, velocities and preview clocks never bake into
saved files. No per-frame full-scene IPC or new CSP allowances.

## Verification and retained limits

- **95/95 Linux UI**, one rebuilt production frontend+real Rust run,112326.192ms;
  zero failures/skips/retries. Frozen artifacts .local/animation-physics-final-ui-green/.
  Separate focused4/4 passed in7.2s. Strict product/test TypeScript passes.
- JS263pass/oneexisting Physics skip; native254pass/2ignore, legacy93pass/1ignore;
  strictClippy default/legacy/e2e-host and rustfmt pass. Native receipt
  .local/animation-physics-preview-native-check.json. Unchanged format profile
  retains46previous accepted tests; no new codec feature or original batch repeat.
- Independent DATA112comparisons at24/30FPS, default1/60 and exact1/64, animated
  parent/allseven coefficients/Reset/fractional tick boundaries/endpoints and
  f64 drafts: RAF schedules exactly agree; max native publicf32 residual
  3.5806674532068428e-6 under predeclared1e-5. This compares our two engines,
  not original Spine dynamics. Read-only integration review is separately pinned.
- Frozen279source hashes .local/animation-physics-checked-sources.json and complete
  source+dist .local/releases/0.9.4/source-snapshot; all match checked product code.
- Three actual Windows WebView2 groups on exact429e/own90144 pass: seek/Play/Pause/
  Rebuild/Simulate/limit and both GPU views; actual weighted Mesh drag/Replay freeze/
  history; native OS SaveAs/Close/Open with all typed key bits, Setup and PNGs.
  Own90144 normalclosed clean, noforce; .local/animation-physics-owned-qa-close.json.
- First focus3/4 failed because screenshot probe hit parent-bone overlay; preceding
  seven pose checks passed. Only test probe moved to clean opaque sprite interior;
  exact RGB/matrix/limit bounds unchanged. Traces preserved at
  .local/animation-physics-first-ui-failure/. Full95 includes corrected test.
- Pre-existing bone temporary JSON negative-zero transport limitation was not
  expanded; nonzero f64 endpoint precision and constraint/deform zero carriers
  are tested. Stored f32 fields are privately canonicalized for own solver parity;
  genuine endpoint f64 drafts/editor-derived values remain unrounded.
- Linux browser checks do not prove GTK lifecycle/macOS/Windows OS HTML5 drag/drop.
  Current Windows GPU/native dialogs are separately observed. Existing audio0.9.3
  checks establish decoded PCM/start/node parameters, not hardware audibility or
  original audio parity. Full animation scope remains ACTIVE.

## One new original export and source reuse

Exact own UI source9eff810a7368dc71f65252c93314e81955d537ebc4ad1a2d6fc4431430c4b564
(892B) was accepted/exported ONCE by original4.3.26, retained process81984 exit0,
exact version/Complete observed, metadata errorNULL. Own source/copy/fivePNGs
unchanged; no original UI input/render/audio playback or solver observation.
Collector .local/research/animation-physics-ui-original-v1/ is consumed; no rerun.
Outputb91526b738260dad5cb60644e57b2a97431a616bb5b0db5d9e4fa0cac407a6f0.

Independent report analysis/animation-physics-ui-original-check.json SHAaff8f0cd:
13keys=4bone+6Physics+1Reset+2Deform;24Setupchannels,8weights/16positions,
32dense/16dormant offset bits checked raw/native/saved/reopened.72 represented
runtime scalars max1.9073486328125e-6 under5.1e-6; dense-to-positive binding
projection verified. Documented original JSON omission defaults remain distinct
from exact raw-bit equality. No dynamics/phase/gesture parity follows from export.

Fresh full95source1b5bfb41 differs from9eff only five bytes within complete typed
identity field12..27; all other1757decoded payload bytes and independent typed
graph/resources match. Report animation-physics-final-source-reuse-check.json
retains its at-time pending status; later aff8 acceptance supplies the link.
Fresh compressed bytes were not separately exported. No accepted oracle repeated.

Earlier0.9.3 reports animation-constraints-events-{ui,delivery}-check.json and
ui-original-v2-check.json retain Event/audio/IK2 reference acceptance. Sourcec910,
original115048/output562f, all earlier source/failed probes and helper pins stay
protected. Skeleton53bool meaning remains unknown; unsupported records still
reject complete canonical reserialization instead of losing data.

## Normal window, example and protection

Normal user **113788/start2026-10-30T21:13:07.6115683Z/HWND132848106** is genuinely
visible/frontend-ready/version0.9.4 with no remote debugging. Receipt
.local/animation-physics-native-launch.json; ownership ledger
.local/animation-physics-user-process.json is Owned=false/DoNotAutomate.
**Never automate/reset/open fixtures in/close it.** Launch transport execsession55266
may stay live; never kill/restart solely for timeout. No demo preload attempted.
Older107208/111304/103180/40348/75012/Linux966265 and all other user ledgers/transports
remain protected. Own90144/HWND1775528 is closed/historical; never reuse identity.

Open WINDOWS_TEST/EXAMPLES/Animate/Physics.fbones in FBones, switch Animate and
select Moving parent physics; Play or scrub0–60. Green weighted Mesh reacts to
its animated parent. Select Animated secondary motion for Simulate/Rebuild.
Source is exact accepted9eff; own PNGs copied byte-identically. Older Constraints/
Geometry/Slots/Demo/Controls and audio remain available. Nothing to copy/build.

## Next reproducible action

Finish the authorized public beta publication when GitHub CLI/network access is
available, using the prepared source snapshot and publisher above. Product work
then continues F105 with paired DATA/UI reference audits before dependent implementation.
Next open scope: global Physics targets/reset-all, separate RGB/alpha/TintBlack,
advanced timing/Graph controls, animation mixing and onion skin. Reuse exact4.3.26
fixtures/static observations first, then primary docs; label unsupported guesses.
Keep broader F105 and full goal ACTIVE. F307/F308 remain user-deferred; no repeated
Match/solver/JVMTI experiments, memory attachment or guessed object-offset readers.
Protect personal original sources/windows; frozen Match and negative JVM evidence
stay archived. Read relevant existing animation DATA/UI gates before new probes.
