# Current state —2026-10-31

## Public beta and platform CI — current user goal

PUBLIC repository: https://github.com/Malasuerte94/FBones (main, MIT, issues,
contributor kit). User authorized public creation/push/releases. Official gh OAuth
and SSH now work; credentials remain ignored. Root private/original materials and
protected user windows are untouched. Only allowlisted source is exported.

Current published main and immutable candidate tag v0.9.4-beta.1 point to
5086547ebafc148f8cc2a631e86418b1f3f1a080. Both hosted runs41205464845 (main)
and41205464589 (tag) finished: ALL THREE native build/package/report jobs PASS,
including Linux deb/AppImage, Windows NSIS and universal macOS app/DMG with both
architectures, codesign verification and executable path scan. Reports mark native
GUI validation false; no installers are distributed or notarization claimed.
The release job correctly stayed skipped because each UI run had94pass/1fail.
No public release exists yet. The public tag is retained; beta.2 is being prepared.

Paired DATA/UI trace audits proved two test errors, not solver failures:
- Tag: Reset creates a new epoch; resumed movement was compared with a pre-Reset
  overshoot. Test now samples the paused post-Step pose, preserves the strict0.01
  movement, Off/clock/authored-state/history checks. Focused CI-profile1/1PASS.
- Main: the parent moved11.336px between sampling and pointerdown, outside9px hit
  tolerance; Tree deselection proves an empty-space box. Replay freeze/time/all6
  matrix checks already passed. Test installs Playwright clock before navigation,
  proves Play progression, then holds RAF while sending real mouse down/drag/up.
  Adds selected-parent assertion; preserves exactly1Replay/1edit, epoch/key/frame,
  Setup/nonbaking and numeric checks. Focused CI-profile1/1PASS. Official clock
  API documents pre-navigation install and RAF pause; no production source change.
Audit receipts: .local/public-beta/live-ci-data/{tag-ui-reset-baseline-finding,
main-508-moving-target-finding}.{json,md} and live-readme/{reset-epoch-baseline-ui-gate,
play-pointer-hit-ui-gate}.md. No retries/skips/tolerance relaxation introduced.

Earlier6578770/run41203936898 passed full95UI with zero retries/skips/fails.
Hosted rendering was measured5.77x slower than local; CI uses1worker and calibrated
execution allowances, all assertions retained. Earlier packaging fixes explicitly
select fbones and move the identical opt-in host wrapper outside Tauri auto-scan;
Apple lipo input order was corrected after primary-source audit. None changes
editor/runtime/codec algorithms. Local263JS/1knownskip,254native+46format+7research,
93legacy/1ignored, product/test TypeScript and frontend build pass. Isolated clean
install/build/test passed after full access superseded the old sandbox blocker.

README has3 genuine FBones screenshots, implementation/remaining-work table,
CONTRIBUTING/ROADMAP/license/notices. Actual live GitHub1440/390 visual inspection
passes: images decoded, no document overflow/errors, contained table scrolling;
all3PNGs and contributor/roadmap/license resources200/exact bytes. Evidence in
.local/public-beta/live-readme/. These captures are our fixtures/assets only.

Beta.2 keeps source-only scope and all3native+full95UI gating before publication.
Next: export/reconcile reviewed source into .local/public-beta/current/repository,
commit and atomically push main plus NEW v0.9.4-beta.2; observe final tag gates,
then reconcile all3reports and public prerelease5assets/source archive/checksums.
Use a fresh candidate archive; historical current/*.tar.gz does not match edits.
Full publication/build/README goal remains ACTIVE until those final gates pass.


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

Finish the authorized beta.2 publication and final hosted gates using the
reviewed allowlisted source snapshot and publisher above. Product work
then continues F105 with paired DATA/UI reference audits before dependent implementation.
Next open scope: global Physics targets/reset-all, separate RGB/alpha/TintBlack,
advanced timing/Graph controls, animation mixing and onion skin. Reuse exact4.3.26
fixtures/static observations first, then primary docs; label unsupported guesses.
Keep broader F105 and full goal ACTIVE. F307/F308 remain user-deferred; no repeated
Match/solver/JVMTI experiments, memory attachment or guessed object-offset readers.
Protect personal original sources/windows; frozen Match and negative JVM evidence
stay archived. Read relevant existing animation DATA/UI gates before new probes.
