# Animation Play performance

## Paired reference and product gate

Retained exact 4.3.26 Animate evidence shows the Preview and timeline controls.
It supplies no timing or render-call series. Reuse the existing physics,
fractional sampling, timeline memo and one-draw baselines. No frame-rate or
native completion claim follows from those constituent measurements.
[Prior playback audit](ANIMATION-DRAG-PLAYBACK-UI-GATE-2026-11-08.md)

DATA inspected the local animation clock, authored sampling, Physics and image
pipeline. Steady Play does not send the scene through native IPC. The installed
PixiJS 8.8.1 mesh setters mark GPU buffers dirty when UVs and indices are
reassigned. FBones replaces those arrays during every redraw. The evaluation
and binding rules are independent of this transfer. Reuse immutable source
identities and preserve invalidation for UV/topology edits and attachment
replacement.

UI traced the separate Preview. Closing the dock teleports its content to a
hidden host to retain panel state. Its Follow watcher continues to draw as the
timeline advances. Hide controls is a different interaction with the canvas
still displayed. Gate WebGL submission on active dock visibility, retaining
camera state and repainting the latest pose on reopen.

The production-CSP browser baseline uses an owned Rust Session with 49 bones,
16 Regions and 3,600 keys at 1280×800 on SwiftShader. On a 1.8-second
window, the main canvas issues 108 clears with Preview closed, and the hidden
Preview issues another 108 clears and 108 draw calls. Both visible runs issue
109 Preview clears. Foreground RAF p95 is 16.8 ms in all three runs. The
fixture clock advances with effectively zero drift and no native calls.
This isolates redundant work. It does not reproduce the user's slow native
Play. Raw runs and the probe are retained under
`playback-performance-2026-11-18/`.

## Verification scope

Measure both an owned Region rig and a 512-row animated Mesh with committed
deformation. Compare Preview open, closed and reopened with the same view
settings and build configuration. Record RAF tails, actual WebGL calls,
differentials in buffer submission, local frame advancement and Session
integrity. Native WebKit cadence and exact stock reference timing require
separate observation.

## Measured product changes

On the bundled candidate, the closed Preview makes zero counted clears
and draw calls. The 49-bone main canvas still clears 109 times in the
closed window. Reopened Preview again clears 109 times and shows the
current timeline pose in the regression. The controlled clock tests
check hidden render suppression separately from Hide controls, which
keeps the canvas and playback running.

The real Rust Session mesh fixture has 512 vertices, 1,024 UV scalars,
2,790 indices and sampled Deform. Before, each visible frame on each
canvas submitted two 4,096-byte array-buffer updates and one
11,160-byte element-buffer update for that mesh. After, the
4,096-byte position update remains and the other two disappear.
The two visible canvases avoid 30,512 bytes of steady mesh buffer
submissions per frame in the probe. Per-frame layout/pose, draw count,
clock and authored snapshot remain consistent. These are submitted
buffer bytes, not measured GPU bus bandwidth.

The p95/p99 foreground RAF intervals remain about 16.7–16.8 ms in
SwiftShader for both fixtures. This proves elimination of actual work
and no frame regression in the measured scope. It does not quantify
an FPS increase on the affected native workload. Forty-four applicable
production-CSP Playwright cases and 511 JavaScript cases passed, with
one existing JavaScript skip. The UI round includes animated geometry,
clipping, playback events/audio, Physics, independent Preview,
weighted 512-vertex mesh authoring and portable reopen.

## Native WebKitGTK comparison

The retained pre-change and newly bundled FBones executables ran under the
same owned 1440×900 Xvfb/Openbox setup with private D-Bus, X authority and
software GL. Visible GTK window identity and WebGL readiness gated a private
loopback WebKit inspector. The probe used the normal native Session via its
owned MCP endpoint to open a generated weighted Mesh fixture and seed the
same clip. It activated the production Play control in the WebView. These
are WebKit RAF intervals and GL submissions, not physical compositor or
Windows display timings.

| Preview | Baseline p95 | Candidate p95 | Baseline → candidate Preview clears |
| --- | ---: | ---: | ---: |
| Open | 62 ms | 63 ms | 34 → 34 |
| Closed | 59 ms | 60 ms | 36 → 0 |
| Reopened | 57 ms | 56 ms | 37 → 38 |

Each visibility segment covers at least two seconds. Both executables
advance the animation clock with negligible drift and preserve the full
native project snapshot. The candidate removes the unchanged UV and index
submissions in both canvases. A separate candidate control at rest reads
18 ms RAF p95 and zero draw calls. Its Play p95 returns to 56–59 ms,
which establishes an unresolved playback-dependent cost on this native
configuration. The fixes remove work without a measured cadence gain.

Private `native-run.py` and `native-measure.mjs` reproduce the pair.
`native-ownership-*-measured.json` binds the process and image, and
`native-*-measured.json` records the observations. Earlier bounded
feasibility attempts established that HTTP inspector availability alone
does not prove a viewable owned window; the private D-Bus corrected that
gate. This route uses the platform's documented inspector support.
[WebKit environment variables](https://trac.webkit.org/wiki/EnvironmentVariables)

## Remaining cost on the candidate

A separate native probe retained the live scene and both viewport dimensions.
The paused candidate had 17 ms p95. Normal Play reached 60 ms. CSS visibility
suppression of both canvases left it at 61 ms; bypassing just `clear`,
`drawElements` and `bufferSubData` in the owned inspector reached 52 ms.
Restoring the calls produced 56 ms. Bypassing those methods is a diagnostic
intervention, not a product rendering mode or proof that compositor/GPU cost
is zero. A substantial residual remains outside those three call bodies.

WebKit's sampling profiler captured 215 JavaScript/native stack samples in a
separate instrumented Play window. The hidden source-map build matched the
candidate JS SHA-256 byte for byte. The mapped stacks include 55 with main
viewport draw, 32 with Preview draw, 21 with ImageLayer draw, 15 with Scene
Tree render, 15 with timeline render and 7 with evaluated animation bones.
These counts overlap and are sampling witnesses rather than wall-time shares.
Use the next probe to attribute scene preparation versus Vue updates. Compare
a draw-local evaluated bone map shared by the mesh/Region/clipping consumers
and invalidation of static Tree/timeline displays. Preserve the displayed
playhead, key positions, animated selections and the native clock.
Private `native-candidate-attribution.json`, raw ScriptProfiler samples and
the mapped summary retain the two probes. The temporary map build was removed.
[WebKit ScriptProfiler protocol](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/JavaScriptCore/inspector/protocol/ScriptProfiler.json)

## Scene preparation follow-up

The DATA audit reuses the exact reference limits and mapped native stacks.
The weighted fixture has 1,024 influence transformations and 2,048 deformed
coordinate lanes. Render currently derives the same world matrices for
artwork and bone displays. Its selection and mask paths can also request
identical binding geometry during one draw. Reuse the actual sampled or
gesture pose within that draw and share geometry only when the binding
object is the same. Inactive attachment handles and the per-slot mask
lifetime stay distinct. Fill typed GPU position data directly to remove
the intermediate array of coordinate pairs. The sampled stacks justify
testing these changes and do not establish a cadence gain.

The UI audit observed that Tree consumes sampled order, active attachment,
visibility, names and types while creating rows and guides again when
geometry or color changes. Keep the previous projection when those
display fields stay equal. Editing continues to consult the actual
sampled workspace. Draw Order remains a separate child and retains its
live read path. Dopesheet overview key markers depend on tracks,
selection, timing drafts and the horizontal camera. They do not depend
on Current, which has its own playhead and input.

The candidate shares a world-pose lookup, weighted points and projected
clipping contours within each draw. A binding can reuse points only during
that draw and only by object identity. Separate stencil objects and
unrounded editing handles retain their existing roles. Playhead updates no
longer rebuild static overview key markers. Tree rebuilds when the sampled
order, activation or other row metadata changes.

Production build, 511 JavaScript cases with one existing skip and all
49 affected UI cases passed. Coverage includes sampled attachment switching,
512-vertex deformation, weighted masks, Tree visibility, overview keys and
timing gestures. On the paired owned native 512-vertex software-GL fixture
the same two-second windows measured these RAF percentiles.

| Preview | Before p95 | After p95 |
| --- | ---: | ---: |
| Paused | 18 ms | 17 ms |
| Open | 61 ms | 60 ms |
| Closed | 60 ms | 62 ms |
| Reopened | 56 ms | 57 ms |

An earlier same-binary baseline measured 67–72 ms during Play, establishing
run-to-run variation larger than the paired differences. Clock drift remains
negligible, closed Preview makes zero clears, and the native Session snapshot
is equal. The pair does not demonstrate a cadence improvement. Private
`playback-scene-preparation-2026-11-18/` holds receipts and raw observations.

A separate hash-matched WebKit profile captured 198 stacks during Play.
SceneTree did not appear in that sample, compared with 15 appearances in
the earlier 215-stack profile. The new sample includes ProjectViewport
in 88 stacks, createViewport in 60, Preview in 26 and AnimationTimeline
in 18. These counts overlap and are not timing shares. The inspector
returned stack samples without script duration events. Next isolate the
main draw from the remaining reactive component updates under the same
native fixture. Use separately bounded stage clocks to attribute time
before changing render scheduling or playback semantics.

## Exact Spine Linux renderer observation

REA MCP `capture_process_scenario`
`ev_7c659a6dd3bd7a6b9ab22fd1ea8dcfae55adbbc27942357206100db343a1cef5`
pinned executable mappings in an owned, exact Spine Professional 4.3.26
Linux instance. The loaded stack contains GL and GLX, Mesa GLX, native
libGDX and LWJGL, and the editor native library. The process ran with
software GL forced and no GUI input. The qualified target binds launch
identity, PID/start time, XID, fixture hash and normal controller cleanup.
Mappings establish what was loaded. The effective per-frame GL dispatch,
GL profile and actual driver selection remain open.

Private `playback-renderer-2026-11-18/rea-spine-linux-renderer-identity.json`
retains versions, hashes and terminal results.

The follow-up pins the mapped GLVND export surface with REA and validates
`instrument_with_frida`
`ev_50a4228dff5d9a80725c2c29bc24001512636dfa623b404f0cd93cd4495beadd`
against a synthetic GLX caller. All three known calls were received and
the proc-address resolver matched the inspected export. The synthetic
process had no original editor and no current GL context. A late attach
to an independently launched Spine process remains unproven on this host.
No new original lease was started. The private feasibility receipt is
`rea-spine-linux-glx-presentation-feasibility.json`.

## Native stage and paint attribution

An isolated diagnostic build embeds stage probes through a private Vite
transform. The normal source and production frontend artifacts are unchanged.
The same owned 512-vertex native fixture and 1440×900 Xvfb/software-GL
display were used. One two-second segment at a time records RAF intervals,
synchronous animation/deformation, ImageLayer and viewport preparation,
Pixi submission and the interval from the clock callback through the first
queued microtask. The spans are inclusive where named. They do not measure
asynchronous raster, compositor or physical presentation time.

| Stage intervention | RAF p95 | Measured JS p95 |
| --- | ---: | ---: |
| Paused | 18 ms | below clock resolution |
| Normal Play | 64 ms | 8 ms |
| Skip both canvas draws | 55 ms | 3 ms |
| Restore both draws | 67 ms | 8 ms |

The animation clock, evaluated pose, deformation application and ImageLayer
each measured about 1 ms p95 in normal Play. Main preparation measured
1 ms and main and Preview submission measured 2 ms each. These are
synchronous stage clocks. Clock advancement and the native project
snapshot remained equal across interventions.

A separate CSS visibility ladder started at 72 ms RAF p95 with both draw
paths bypassed. Hiding Timeline as well gave 41 ms and hiding the whole
editor gave 18 ms. The paired narrow controls do not isolate a comparable
effect to the two playhead elements or the live numeric readouts. Marker
visibility alternation measured 59/56 and 53/54 ms. Readout visibility
measured 56 and 52 ms against visible endpoints of 59 and 52 ms. Hiding
only the track area and ruler gave 51 ms in that window. Time/order
variance makes a specific playhead or input performance claim unsupported.
The WebKit Timeline diagnostic records Layout/Paint/Composite activity
with zero-duration timestamps in this route, so its counts alone supply
no duration breakdown. [WebKit Timeline protocol](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/JavaScriptCore/inspector/protocol/Timeline.json)

The separate area pair kept the same diagnostic binary, fixture and
software GL. At 1022×695 WebView dimensions, open Play measured 59 ms
p95 and both draws skipped measured 48 ms. At 1438×875 the corresponding
values were 63 and 52 ms. Paused was 17 ms in both. The smaller window
does not remove the gap. The pair also changes responsive layout, so it
does not isolate pixel area.

The result prioritizes native rendering after the measured JS spans over
another deformation or per-object JS optimization. It does not identify
a single responsible CSS property or establish a platform-wide issue.
Private `playback-stage-timing-2026-11-18/` retains the transform,
the guarded native runner, two-second samples, attribution repeats,
the Timeline records and bound process/build receipts.

## WSLg software painting

The unchanged production build `5ab8bb25de82`, the same owned 512-vertex
fixture, a 1440×900 WebView, DPR 1 and matching canvas buffers reproduce the
lag in both private Xvfb and an owned WSLg X11 window. WSLg had no forced
software environment flag. Mesa logged a DRI3 device failure and surfaceless
`swrast` without DRM. WebKit reports `Apple GPU` on this Linux system, so
the local fallback is identified through owned process maps, device handles
and EGL logs.

With all current controls visible, alternating Timeline `contain: paint` and
`contain: layout paint` against the original style leaves their RAF tails
within run variation. Reducing Mesa to two threads gives 33–37 ms p95 with
Preview visible. Setting only Skia GPU tile workers to zero gives 56–64 ms.
With `WEBKIT_SKIA_ENABLE_CPU_RENDERING=1`, the same production UI gets
19–22 ms on X11 and 18–21 ms on WSLg Wayland. Default Wayland gets 54–59 ms.
Each variant preserves the paired native Session snapshot. The [pinned
WebKitGTK 2.52.6 source](https://github.com/WebKit/WebKit/blob/webkitgtk-2.52.6/Source/WebKit/WebProcess/glib/WebProcessGLib.cpp#L180-L188)
shows where the WebProcess disables accelerated Skia buffers with this option.
Both Pixi canvases continue to submit WebGL draws with CPU painting.

The native Linux entry selects CPU painting before GTK startup when WSLg is
enabled, `/dev/dri` is absent, and the selected or available GTK display
socket resolves to WSLg's X11 or Wayland socket. Any supplied value for the
WebKit option is preserved. The tested scope is WebKitGTK 2.52.6 and the
observed WSLg software graphics path. Cross-platform desktop cadence and
hardware-accelerated Linux remain separate from this evidence.

| Native build `334ea331cffd` | Paused p95 | Preview visible Play p95 | Preview closed Play p95 |
| --- | ---: | ---: | ---: |
| WSLg X11 automatic | 17 ms | 19–20 ms | 18 ms |
| WSLg X11 explicit `0` | 18 ms | 56–62 ms | 62 ms |
| WSLg Wayland automatic | 17 ms | 19–20 ms | 18 ms |

All automatic WSLg samples had zero intervals above 33.34 ms. The X11
override had 35–38 such intervals per Play segment. All paired tests
preserved clock progression, the authored native snapshot and source file
hash. At paused frames 0 and 40 the two X11 paint paths produced
pixel-identical canvas readbacks and Inspector WebView captures. Seeking
changed both canvas rasters and moved the playhead; pause held the selected
frame. The Wayland case also produced visible mesh pixels and distinct
rasters at both frames. The trace captured `1` in the two WSLg WebProcesses
and preserved the explicit `0` in the control. A private Xvfb display kept
the WebProcess option unset. The current binary reached a viewable WSLg X11
WebGL window and was handed over to the user.

Exact stock REA `ev_0809487d763868710cdbbc056857541476ca1ab3c7a85cbfcab329f54ecb9946`
also reads `__GL_THREADED_OPTIMIZATIONS=0` in the Linux Spine launcher before
Java starts. The setting concerns driver threading where supported.
`ev_02079445f7c85bcf191dca20960f72a5fa48452a0258a344ca1d9d438384410f`
ties the FBones probe to the earlier exact-stock idle GLX/LWJGL/libGDX
mapping as two distinct observations. Stock Play cadence and GPU selection
remain open. Private `playback-native-display-2026-11-18/` retains the
paired runs, endpoint identity, native raster evidence and cleanup receipt.

## Current mascot playback

FBones now prepares the canonical animation solver graph once per clip
configuration and preserves unchanged Pixi visibility, stencil geometry
and filters across redraws. Mutable solver callers still validate the
graph on each invocation. A derived stock-based Node comparison with 76
bones and 35 constraints measured a median run mean of 0.1975 → 0.1462 ms
per sample. All 1,472 compared solver frames and 20 temporary pose
operations agreed, including committed and fractional Physics state.

The paired Chromium SwiftShader browser runs opened the current mascot
in the same Rust Session host and used 1440 × 900 viewports, with Physics
enabled and the same canvas dimensions. Results report one warmed or
first-visible interval per condition from the pinned comparison. Cold
diagnostic repeats showed visible p95 between 16.7 and 33.4 ms.

| Preview condition | p95 before → after | Script ms per RAF before → after |
| --- | --- | --- |
| Visible | 16.7 → 16.7 ms | 1.043 → 0.787 |
| Reopened | 16.7 → 16.8 ms | 0.919 → 0.873 |
| Closed | 16.8 → 16.7 ms | 0.993 → 0.831 |

The animation clock and authored Session snapshot agreed. The sampled
script reduction did not consistently change total task time. Reopened
p99 increased from 16.8 to 33.4 ms in this pair. The 25 browser regressions
cover render pixels under masks, two-color changes, geometry, Physics
replay, animation gestures, Preview and GIF. The paired timing harness
checks canvas dimensions and file bytes. Private
`mascot-play-2026-11-20-gKOb4p/` holds pins, captures and ownership.

REA `ev_7a35bd33551cc9859f7ffef4c3cd32dc678717383ad5a151d9225d94c2c62fd9`
authenticates retained exact Linux OpenGL/GLX, libGDX and LWJGL mapping and
the separate stock GIF frame metadata. Interactive stock cadence remains
open. REA `ev_e011586b7b9e5ae85c78829eba4c804ea9b6ee320985697b19b658004e3a38e7`
reconfirmed the installed 4.3.26 launcher and its OpenGL threading setting.

### Native WSLg X11, current mascot

The same current desktop binary `2894d6d98835` ran both private WSLg
X11 scenarios. Owned copies used the same 1,440 × 900 WebView at DPR 1,
`anticipation` clip and art. The automatically configured WebProcess had
CPU Skia painting value `1`. The explicit control retained value `0`.
Both used the observed software graphics path without render-device file
descriptors. Independent Brotli/ELF checks match all ten current JS/CSS
assets byte for byte and the parsed HTML structure.

| Phase | Automatic p95 | Explicit off p95 |
| --- | ---: | ---: |
| Paused | 17 ms | 17 ms |
| First visible Play | 33 ms | 63 ms |
| Preview closed | 24 ms | 58 ms |
| Preview reopened | 30 ms | 61 ms |
| Warm visible repeat | 29 ms | 63 ms |

The warm-repeat p99 was 31 versus 65 ms. Both animation clocks followed
the expected frame time, and the complete authored Session snapshots
and file checks matched. Independent RGBA decoding verified pairwise
pixel equality in all six comparisons across both modes, covering the
main canvas, Preview and the full WebView at frames 0 and 30. Each surface
changed between frames. These measured paints are for one binary and one
WSLg display configuration. Direct native before/after gains from the
frontend optimizations and cadence on other platforms remain open.

A separate visible/CSS-hidden/restored trial on automatic CPU painting
measured 34/34/29 ms p95 with both draws still active. The wrapped
synchronous RAF callbacks measured 3/2/2 ms p95. Time through the first
queued microtasks measured 16/15/16 ms. Hiding the canvases in CSS alone
did not restore 60 Hz. The remaining delay could include scene submission,
later WebKit or platform work. Private `mascot-native-play-2026-11-20-DnVG4d/`
holds the binary/asset pins and independent pixel analysis. The paired
runtime and diagnostic receipts remain in `mascot-play-2026-11-20-gKOb4p/`.

### Native WebGL submission on the current mascot

Two owned WSLg A/B/A diagnostics used the same verified `2894d6d98835`
binary, 1,440 × 900 view, automatic CPU painting and `anticipation` clip.
The test wrapped only the two relevant canvases' WebGL methods and
restored them after the interventions. Results are RAF p95 intervals.

| Diagnostic | Before | Draws suppressed | Restored |
| --- | ---: | ---: | ---: |
| Preview only | 34 ms | 27 ms | 34 ms |
| Both canvases | 33 ms | 26 ms | 30 ms |

Preview-only B forwarded 992 main draws, 124 clears and 1,551 uploads
and suppressed 806 Preview draws. Both-canvas B suppressed 1,914 draws
while still forwarding 132 clears and 1,651 uploads. Clock drift stayed
below 3e-14 frames, and all full authored snapshots and source copies
agreed. The interventions quantify part of the cost in this configuration.
The remaining p95 is above the period for 60 Hz.

An experimental extension of the pinned Pixi 8.8.1 default batching
threshold promoted ten active normal-blend unmasked Mesh and Linked Mesh
instances of 109–167 vertices. The Chromium real project workflow and the
grouped JavaScript suite passed. Two owned native launches decoded/opened
the mascot and reached the frontend refresh step, which then timed out
in WebKit Runtime.evaluate before Animate. The native failure's precise
cause, draw count and paired pixels are open. The experiment was removed
and the exact previously accepted executable and bundled frontend selected
again. Owned receipts and the isolated diff are in
`mascot-batching-2026-11-20-6cUHn8/`. Read native diagnostic results from
`native-mascot-draw-comparison.json` under the earlier mascot checkpoint.

### Exact projected position uploads

An owned WebGL probe compared exact previous byte payloads for the same
bound buffer and destination range. The baseline forwards every call.
`anticipation` has zero identical repeats in 1,449 array uploads. Of 127
index uploads, 71 repeat, totaling 617,640 bytes over 1.8 seconds. REA
`ev_062e0958eb0d615945b07a4b97b02e426ded92e32f9dc4f46c67729ea7dbb279`
authenticates the stock companion: of 1,980 represented mesh vertices,
1,976 are under a varying bone lane through a positive influence. This
bounds possible authored motion. The upload measurements are FBones.

For real `control/culoare_lumina`, ten direct-position bins per canvas
repeated in all 41 baseline samples. The new draw path preserves the
previous Pixi position buffer when finite Float32 projection agrees,
including the sign of zero. The paired native software-GL probe removed
all twenty direct position updates per RAF and 21,632 bytes per RAF
across both canvases. Other array and index counts per RAF were stable.
Full snapshots, canvas dimensions, clock and original/copy bytes passed.
A focused pinned-Pixi test verifies change invalidation, with 17 browser
regressions for animated geometry, clipping, editing and GIF.

The short upload-instrumented pair gave 34 → 40 ms p95. The two warm
timing-only pairs gave 35 → 33 and 31 → 29 ms p95, with p99 38 → 43 and
50 → 57 ms. Their limited duration and differing tails leave stable
cadence unresolved. An intermittent project-refresh observation timeout
also occurred with the restored baseline binary. The earlier forced
batching experiment remains unverified in the native renderer.
`mascot-vertex-upload-2026-11-20-bdWX6e/` retains the native inputs' pins,
raw aggregate measurements, grouped test logs and cleanup receipt.

### Isolated artwork instructions

One candidate separated the main ImageLayer into its own Pixi direct
RenderGroup. Masks stay inside artwork; guides, Ghosting, Preview and
GIF keep their prior rendering paths. REA
`ev_031a409984c17e70178390d33aacccc458c37727820705e5de93f068df4fa369`
independently authenticates the exact stock image-only PNG and bone-only
GIF choices. Stock viewport renderer grouping remains unknown.

Native `anticipation` on the same WSLg configuration compared baseline
`e646c510115e` to candidate `667f8bc03903`. Main index traffic measured
48,552 → 44,341 bytes per RAF, and draws 16 → 17. The original 4,884-byte
per-frame batch became a 612-byte batch and one 4,272-byte upload in 70
RAFs. The larger 43,668-byte submission continued every frame. Main array
traffic stayed near 220 KB per RAF. Warm no-hook p95 readings were 34/29
ms versus 34/30 ms. Six RGBA raster comparisons at frames 0 and 30
across the main canvas, Preview and full WebView were exact. Both native
snapshots, source and time checks passed.

Nine browser checks passed on the experiment. The Ghosting overlap case
now verifies red/white/red at the same pixel around two On top toggles.
That assertion passes the restored production renderer as well. The
measured trade did not justify a separate artwork group in production.
Restoration reproduced the accepted native hash and all ten frontend
assets exactly. Private `mascot-artwork-group-2026-11-20-WWi5LA/` holds
the paired observations and narrowly scoped experimental diff.
