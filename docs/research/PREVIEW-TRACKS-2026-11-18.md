# Preview tracks and mixing

## Reference and implementation gate

REA-authenticated owned Spine Professional 4.3.26 captures show a separate
Preview dock with the image, animation list, Speed, Mix and numbered tracks
0–4. Track 0 is highlighted in the retained state. The supplied full Animate
image also shows separate Preview and Dopesheet controls. These images establish
control presence, placement and displayed values. The exact track clock,
default settings, transitions and gestures remain unobserved.
[Owned reference observations](FEATURE-UI-4.3.26.md#controlled-exact-version-original-gui-observations), [supplied Animate images](ANIMATION-UI-4.3.26.md)

The paired audits identified documented independent track playback, duration in
seconds for transitions, per-track speed, repeat and upper-track alpha. The
primary guide documents additional additive, hold and mouse actions. The
existing FBones Preview follows the active editor pose, including working edits
and simulated Physics. Its renderer already supports the admitted images,
geometry and clipping. The independent runtime package is a single-clip player.
[Preview guide](https://en.esotericsoftware.com/spine-preview), [Applying animations](https://en.esotericsoftware.com/spine-applying-animations)

FBones keeps Follow editor as the initial mode and adds explicit independent
Tracks. A compact numbered strip and track settings reuse the panel typography
and accent states. Independent assignments, clocks and transitions use the
existing committed key samplers and scratch solver. Geometry, color and
attachments are produced for Preview only. Track actions preserve the editor
pose and Session. Preview Repeat and the
timing rules for one outgoing entry are FBones policies until verified against
the exact original. Advanced mode controls stay visible while unavailable.

### Upper-track Additive reference

The REA-authenticated Preview track-0 still is a historical Windows
4.3.26 capture. The retained exact Linux Setup still does not expose
Preview. No eligible retained sample shows a labeled upper-track
Additive toggle or the transition after changing it.

The Preview guide places Additive on upper tracks. In the 4.3.55 beta
editor issue, Esoteric confirms that changing Additive affects the next
assignment. The 4.3.53 beta changelog removes the Hold Previous button,
and the 4.3 release describes automatic hold in the mixing system.
Queue has a documented runtime API. An editor command remains
unconfirmed. [Preview guide](https://esotericsoftware.com/spine-preview#Tracks),
[Additive editor issue](https://github.com/EsotericSoftware/spine-editor/issues/900),
[4.3.53 notes](https://esotericsoftware.com/spine-changelog#4.3.53-beta),
[4.3 release](https://esotericsoftware.com/blog/Spine-4.3-released)

The 4.3 runtime source identifies additive bone transforms, including split
axes, and ordinary RGBA mixing. FBones captures
Additive per new upper-track entry and evaluates its setup-relative bone
contribution over the lower Preview pose. Both transition entries use the
same lower pose. Their separate contributions are mixed before applying
track Alpha. Ordinary crossfades retain their earlier behavior. The one
outgoing entry and mixed-mode interruption rules remain FBones policy.
[4.3 runtime source](https://github.com/EsotericSoftware/spine-runtimes/blob/4.3/spine-ts/spine-core/src/Animation.ts)

REA MCP `capture_process_scenario`
`ev_505328d24891b276e4a19ba1f8b13ab5320214432d6942811c65a2518f71c900`
joined the retained exact stock Linux 4.3.26 transform export and its
source receipt. The Scale samples and authored setup scales are positive.
The export has combined transform tracks. It establishes the limits of
the available exact sample for signed and split Scale. The same audit
locates the canvas, clip list and numbered track strip in the supplied
unversioned image. Private receipt
`rea-spine-preview-gesture-and-signed-scale-gate.json`.

The Preview guide documents right-click selection on a clip row. The
4.3.56 beta changelog documents middle-click navigation from a numbered
track to its current animation. FBones routes both to editor clip
selection and preserves the independent Preview assignment and camera.
Selecting the already active editor clip preserves the current frame.
The exact 4.3.26 gestures and the right-click track toggle state remain
open. [Preview animation list](https://esotericsoftware.com/spine-preview#Animations),
[4.3.56 notes](https://esotericsoftware.com/spine-changelog#4.3.56-beta)

REA MCP `ev_02e1027f8c78bb865f0ffb455c118b410ed25fdb37025ebe96d8a2c72479de54`
pinned the publisher's 4.3.56-beta explanation of right-click track
on/off and the two existing Tree selection gestures. The guide
also documents the track toggle. The exact Linux clock, mix,
assignment and active-track behavior remain open. Private receipt
`rea-spine-preview-track-toggle-gate.json`.
[Publisher issue comment](https://github.com/EsotericSoftware/spine-editor/issues/951#issuecomment-4151019834)

### Setup Preview

Two retained owned Windows 4.3.26 captures place an independent Preview
beneath Tree while the Setup viewport stays visible. The publisher
guide documents playing an animation while editing Setup. The
authenticated exact Linux initial Setup capture contains the viewport
and Tree. REA `ev_0a0b821f93b8d3d1aad54ef3b3bef931efd809a2571a45f0fb53acb7fbe95591`
establishes the limit of that retained capture. Private receipt
`rea-spine-preview-setup-open-gate.json`. Exact Linux opening,
visibility defaults and clock between editor modes remain open.
[Preview guide](https://esotericsoftware.com/spine-preview)

REA decoded the publisher's current Views menu image with
`capture_process_scenario`
`ev_327a25c771c29f8783fa660069734145a5e82f5da3244036ed206cc5fcd74aef`.
The crop shows Preview above Tree and lists Alt+R. It contains no
editor mode, version or platform. The private receipt is
`rea-spine-preview-views-open-guide.json`.
[Views opening and focus](https://esotericsoftware.com/spine-views#Open)

The publisher also describes special handling when a Setup slider
drives the same animation assigned in Preview. The 4.3 forum
statement carries its own source scope in private receipt
`rea-spine-preview-setup-slider-scope.json`. Its media access
failed and the statement does not establish general Setup behavior.
[Setup slider discussion](https://esotericsoftware.com/forum/d/30232)

### Preview View Settings

REA `capture_process_scenario`
`ev_ffbdef6d7a4a29d77104e61f60c198b062b8990f265057e82b04f166630ab0f3`
decoded two retained historical exact Windows dock crops and the current
publisher settings crop. The historical header shows a sliders icon next
to the main view menu. The dropdown is closed. The publisher crop shows
Hide controls and Play current animation unchecked. The guide additionally
documents a Show bones option for the Preview image. Exact Linux menu
contents, defaults, animation selection policy and bone glyphs remain
unknown. The private receipt is `rea-spine-preview-view-settings-guide-gate.json`.
[Preview settings guide](https://esotericsoftware.com/spine-preview#View-settings)

## Implemented behavior

Track 0 starts a composition and the numbered controls expand to 15 on demand.
The selected track accepts a clip from the list. Selecting the current clip
again or pressing Clear fades it toward the lower pose. Speed changes the
selected clock, Repeat is captured at assignment, and Mix is measured in
seconds. Alpha on upper tracks blends each keyed scalar over the current
lower pose. Unkeyed channels preserve the lower value. A transition advances
the outgoing and incoming clocks, with the former current entry becoming the
single outgoing entry after a new assignment. Track settings survive hiding
the dock within the same document. Hidden docks and background tabs suspend
clock advancement. Opening a different document resets Preview.

Right-clicking a numbered track immediately toggles its contribution.
The selected track has a matching keyboard and touch control beside
Clear. While muted, the assigned animation, its active frame, captured
Repeat and Additive, and any ordinary mix stay frozen. Re-enabling the
track restores that phase. Global play or pause and the active track
selection keep their existing state. Clear or reassignment discards the
muted assignment. Immediate toggling and phase retention
are FBones policies. The publisher confirms the on/off gesture, and the
exact 4.3.26 clock and mix transition are unobserved.

All tracks support bone channels and slot color. Track 0 additionally samples
attachment activation, sequence, draw order, deformation and animated IK and
Transform controls. The compositor switches discrete values at the midpoint
and evaluates the composed local pose once. It shows a Preview status for work
outside its budget or invalid combined geometry. Physics, events and audio
remain outside independent playback. Additive appears on upper tracks and
is captured alongside Repeat on assignment. Slot colors keep their ordinary
mixing. Follow editor displays the live
sampled pose.

Setup has its own optional Preview dock below Tree. Views opens it and
Properties stays available in the same workspace. Existing layouts acquire
the closed entry after their current Tree panel. Follow Setup shows the
evaluated Setup pose and local camera. Tracks samples the shared independent
composition against the latest authored Setup rig. It uses its own clock
and removes gestures that would navigate the Animate timeline. Assignments
and playback phase remain common to both modes and suspend if the active
Preview dock is closed. Default closure, Follow Setup and mode continuity
are FBones policies.

Preview View Settings shares session-local preferences across
the Setup and Animate docks. Hide controls clears room for the canvas
while keeping the camera rail, settings trigger and existing clock.
Show bones renders the evaluated Preview pose in an inert overlay.
With no visible artwork, Fit can frame those bones. The main editor's
camera and bone visibility remain independent. Play current animation is now
wired in source as an opt-in for independent track 0, following the active
editor animation without restarting the same assigned clip. It preserves the
editor clock and upper Preview tracks. Explicit base-track editing or Follow
editor releases automatic assignment. Turning the checkbox off keeps the
current Preview assignment. Track choice, phase retention and the session
default are FBones policies. Exact Linux settings interactions remain open.
The grouped native UI case passed. It checks real Preview pixels, stable
editor playback and raster, local phase across editor seek, the upper entry,
the Off transition and an unchanged native snapshot. The Queue placeholder
was removed after the editor-versus-Runtime audit.

## Focused evidence

All 42 affected UI cases passed on the View Settings build. The new
case verifies actual overlay pixels, editor canvas equality, a moving
clip with controls hidden, local Fit, keyboard focus, mode retention and
an equal Rust Session snapshot. Raw evidence is under
`preview-view-settings-grouped-2026-11-18/`.

The Setup round uses a 960×760 workspace and three independently
placed PNGs. The green image first shows the Setup pose. During a
linear local Preview clip it moves by 15 units, then follows a
committed 36-unit Setup edit while retaining the sampled phase. Close
and reopen freeze and restore the phase. Animate retains its own
selected clip and Current value 12. Setup's resized dock survives
reload. The Rust Session reports one authored bone edit and equal
animation data. One test locator expected Close Preview and missed
the accessible Close Preview panel button. The two targeted cases
passed on the same production build after fixing the locator.
Private evidence is under `preview-setup-grouped-2026-11-18/`.

REA `ev_183d23d65ba8fa2fbc2a1f18e65ed4a75fa612fad89484e71698a5d56aa61eba`
retains the open publisher issue proposing animation sequences in
Editor Preview. The Editor guide describes assigning and clearing
clips. Runtime separately supports `addAnimation` queuing. Exact
4.3.26 Linux has no qualified Queue observation. The private receipt
is `rea-spine-preview-queue-editor-gate.json`.
[Editor proposal](https://github.com/EsotericSoftware/spine-editor/issues/371),
[Runtime API](https://esotericsoftware.com/spine-applying-animations#Queuing)

The production-CSP regression uses a real Rust Session with two clips and three
owned PNGs. At 960×760, it observes the green attachment halfway between the
two positions with upper-track Alpha at 50%. It then measures the middle and
end of a one-second transition on track 0, changes independent speed to 200%,
observes a new nonrepeating clip stop, and expands the track strip through 14.
The main canvas, the timeline selection and frame, and the Session snapshot
are equal. Follow editor returns Preview to the timeline image.

Six focused UI cases and eight direct domain checks passed. The direct checks
exercise sparse channel ownership, a transition between disjoint channels,
zero alpha, fade-out, pre-key state, clip admission and work bounds. REA MCP
decoded the final owned trace and pinned the screenshot separately from the
original reference. Evidence is under `.local/research/preview-tracks-2026-11-18/`.

The first broad pass found three accepted Sequence cases intercepted by the
editor policy alert at Fit Preview. The paired regression audits confirmed
ready canvases and a pointer hit on the alert above the first Fit row. The
Follow transport is again a single lowest row with Fit, Speed and Play. The
mode selector has its own row above the canvas.

All ten focused cases passed on that corrected layout, including the three
Sequence cases with their original real click and pixel checks. REA pinned
the corrected trace and image separately from the earlier candidate. Its
trace contains 295 matched actions, 35 successful loopback responses and six
Pixi image-source conversion warnings. See the retained initial shard logs for
the negative interaction evidence and the corrected focus logs for acceptance.

All 134 production-CSP UI cases passed on the corrected build. JavaScript
passed 464 cases with one existing skip. The corrected native Linux build
`71022fd9…` reached WebGL and a visible owned desktop window. No additional
platform-native Preview gesture was measured.
## Preview camera controls

REA pinned two exact historical 4.3.26 Windows captures showing a Preview
camera rail next to its own canvas and a separate animation list and playback
settings. Across the images, the five control shapes are plus, vertical
slider, minus, actual size and Fit. These are placement observations. Exact
Linux captures establish the main viewport rail. The version-unpinned manual
documents independent camera input in Preview. Exact slider bounds, pan and
zoom anchors, and settings persistence remain open. The private receipt is
`rea-spine-preview-camera-historical.json`. [Preview camera guide](https://esotericsoftware.com/spine-preview)

FBones reuses the same control component for its local Preview camera.
The existing Preview Fit keeps framing the active artwork and following dock
resizes. Manual zoom and right-button pan change only that camera. The
existing 2–2,000% manual zoom range and previous Fit scale are retained. A
short-dock horizontal layout keeps controls reachable alongside playback and
out of the small canvas. These are FBones design policies. The source
regression verifies Preview pan and Fit with rendered pixels, 100%, and
unchanged main camera, track and transport state and native snapshot. It
passed the full production-CSP run and the targeted run after HUD compaction.
The track independence and animated attachment and clipping regressions also
passed on the corrected build.
