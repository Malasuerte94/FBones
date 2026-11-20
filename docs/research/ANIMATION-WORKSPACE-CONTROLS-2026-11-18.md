# Animate workspace controls reference and implementation gate

The requested UI-first expansion starts with the Animate workflow. The DATA and
UI reviews reused the [Animate data](ANIMATION-DATA-4.3.26.md),
[supplied screenshot audit](ANIMATION-UI-4.3.26.md) and
[feature comparison](FBONES-SPINE-4.3.26-FEATURE-GAPS-2026-11-18.md).

The supplied screenshots show Shift and Offset in both timeline views, Adjust in
Dopesheet, and Frame, Auto, a heart and Store in Graph. They also show Curves as
a separate panel and Mix and Track in Preview. The screenshots establish visual
availability. The exact patch identity and action semantics remain unverified.
Onion skin comes from the [tracked Animate scope](../tasks/F105-animation.md)
and its reference control placement remains open.

The exact 4.3.26 release notes name Favor. The patch-unpinned Graph guide
describes it as adjusting keys toward surrounding keys. It also distinguishes
Store from Swap. This supports the control names and leaves exact behavior for
a later controlled comparison. [4.3.26 changelog](https://esotericsoftware.com/spine-changelog/), [Graph guide](https://en.esotericsoftware.com/spine-graph)

FBones uses compact expandable sections below its existing tool row and in
Preview. The sections reserve Timing, Curve tools, and Preview Layers actions
as native disabled controls with a visible status. The display uses the FBones
panel tokens, compact type, and local and total timeline widths. The controls
carry no draft/default values, native operations or history writes. The actual
workspace, Graph/Dopesheet, transport, keys, and Preview retain their current
state and entry points.

The previously retained REA package and launcher evidence identifies no direct
editor handler for the advanced controls. For this slice REA's Playwright trace
reader can review the owned FBones control observations after browser testing.

The first 960×720 capture exposed the old fixed 102-pixel origin of the Graph
value scale. The graph lines and labels already share `graphY`. The DATA and UI
reviews locate the scale relative to the scroller so it follows the actual plot
through disclosure expansion and vertical scrolling. The numerical conversion
and edit commands remain the same.

## Focused verification

The production-CSP Playwright regression uses an owned project in the real
Rust Session. It exercises Enter, Space, Escape, mode switching, disabled
commands, a 960×720 dock, open and closed Graph scale alignment, and existing
playback. The pre/post native summary is equal and the interaction sends no
authoring or Save command. The first axis check compared a rounded client height
to a fractional bounding box. The passing check measures both on the client
height basis and checks their top origin independently. Both intermediate
captures and the final trace are retained privately.

REA MCP `inspect_playwright_trace` independently read the final owned v10 trace
with 248 before/after action pairs, 25 network events and 26 screenshot
references. Its paged console result retains two Pixi source conversion warnings
and one unattributed 404. The captured network page contains only 2xx responses.
The assertions and reviewed screenshots establish control behavior and layout.
The offline decoder reports action boundaries, network metadata and references.
`.local/research/animate-workspace-2026-11-18/rea-trace-evidence.json` retains
the summaries and selected pages for reproduction.

## Next UI slice

Continue in Setup with the existing Tree creation menu. Check equivalent
discovery for Path attachment, Bounding Box, Point, Linked Mesh, Path Constraint
and Slider. The original New button and Path records have retained exact-version
evidence. The official guides and 4.3 release notes establish documented
capability. Expanded original context menus, creation gestures and wire rules
are open. Keep these prospective entries outside the supported native enums
until their data and actions are ready. Use the paired Setup review before
implementing the slice. [New button observation](F309-PARENTING-PANELS-UI.md), [Path project](ANIMATION-LARGE-MESH-DATA-GATE-2026-11-07.md), [Path and Slider documentation](https://esotericsoftware.com/spine-path-constraints), [4.3 release notes](https://esotericsoftware.com/blog/Spine-4.3-released)
## Persistent timeline controls

The retained exact Linux Graph Swap and Timing Offset captures show the
working Graph and Dopesheet tool groups directly above the ruler. The
supplied wide captures show the same groups fitted to one row. FBones
already implements the principal Graph and Timing actions. Bring those
actions into the visible responsive dock toolbar, preserving their native
commands and keeping the pending Favor and Adjust actions discoverable.
Sync behavior depends on concurrent views and remains open in the editor
with one active timeline view.

Implemented in source. Graph shows Frame, Auto, Store, Swap, Favor and
Presets. Shift and Offset are visible in both modes, with Adjust in
Dopesheet. Favor, Presets and Adjust remain disabled. The existing timeline
controls, native changes and key commands are reused. The command bar wraps
at narrow widths and icon-only controls retain accessible names. The adapted
source regressions exercise the persistent toolbar, keyboard and disabled
controls, Graph axis alignment, Store/Swap and Shift/Offset. The grouped run
passed these cases and the final focused run passed the timeline shelf,
Graph and shared transform controls again.

## Dopesheet Adjust reference

REA `ev_ee4b669e64ac2f3ada8d22b86f7fefd79b9749745762f0ffdc8011309f6fe5e2`
matched the exact Linux `02-loop-before` and `03-plus-six` Dopesheet captures.
Both show the pencil and Adjust text after Shift and Offset. The Adjust crop
is identical across the Offset state change. The owned trace only activated
Offset and its exports corroborate that edit. No expanded Adjust or applied
Adjust gesture is shown. Private `rea-spine-dopesheet-adjust-closed.json`
under the Timing Offset research run pins the evidence.

REA `ev_56ee6265af4f959513702d65ffd8412d5b74d29a422bdd009e1d7b37587f6fd6`
also matches the closed Adjust crop before Rotate key selection, after
selection and after Delete. The separate exact selection sequence in
`ev_9dae2e45386bc8d32638e1f37e3be0e4edfe1d5431ebff73a9470ead2b9915ec`
shows a Rotate key gaining a white outline, Current advancing from 0 to 12,
and the Stepped control lighting. Sampled sibling outlines are unchanged.
Both selection captures precede mutation and match the stock CLI baseline
fixture digest. The setting that controls Jump to Key is outside the sample.
The two private receipts are `rea-spine-graph-new-keys-adjust-gate.json` and
`rea-spine-dopesheet-key-selection-state.json`.

The current vendor guide documents relative changes to selected keys from
viewport gestures. The paired FBones implementation gate starts with a
single eligible Rotate bone and selected current-frame and other-frame keys.
Capture key IDs, clip, revision and the valid viewport lease before dragging.
Preview locally. Apply the same unwrapped delta once to the selected keys
on release, preserving Setup, unrelated drafts and native key identity.
The existing native evaluation lease applies to one frame, so perform the
multi-frame authoring operation with a captured revision after checking the
gesture lease in the viewport. Cancel without falling through to Auto Key.
Exact parent-space, Bézier, scale and grouped gesture semantics remain open.
[Dopesheet Adjust guide](https://esotericsoftware.com/spine-dopesheet#Adjust)

The FBones implementation scope is constraint-free single-bone Rotate,
Translate and Scale on compatible linear or stepped tracks. Translate uses
the frozen parent's inverse for the viewport's world displacement. Scale
applies local factors and Rotate uses the unwrapped angle about the bone's
own origin. Rotate requires an orientation-preserving similarity parent.
Combined properties or selected split axes use the same coverage in preview
and commit. A selected dominant key at the current frame anchors the preview.
Adjacent Bézier intervals, unresolved working changes in the affected lanes
and unsupported viewport gestures are held out of the operation. The toggle
is separate from timing drags. The mode resets with the view, clip or document.

The grouped product evidence verifies the three Rotate keys receiving the
same unwrapped delta through one edit with stable IDs and a retained working
Translate X. Escape retains the tool and selection. A real frame change and
an affected working value both prevent the stale key batch. The split-axis
case verifies physical preview displacement and native Translate X values
under a 30° rotated, nonuniform parent. It also verifies local Scale X,
unchanged Y keys and one Undo per gesture. The reviewed final scale capture
shows X 1.42× and Y 1.00× in the gizmo. Browser gestures use the native Rust
Session. The latest Linux desktop check establishes fresh startup and WebGL.

As separate selection evidence, REA
`ev_0a24dca9236427eda6c0e37c5edd086c3b49889936632ed86852d637f17617b9`
proves unchanged Current pixels in three exact Dopesheet drags. The paired
captures and native exports retain the playhead at f0 for Shift, f24 for
explicit Offset and f0 for the ordinary move. The click witness advances
Current. Jump to Key's setting value and empty-space marquee behavior remain
open. The private receipt is `rea-spine-dopesheet-key-drag-current.json`.
[Spine behavior settings](https://esotericsoftware.com/spine-settings#Behavior)

## Timeline click navigation gate

The paired gate uses the exact Dopesheet click and three drag receipts above.
The version-unpinned settings guide describes separate Jump to Key and Jump
to Frame preferences for Graph and Dopesheet. Start with independent,
discoverable FBones toggles and keep the existing defaults until a reference
setting witness distinguishes them. At release distinguish a clean click
from actual pointer travel, even when the timing delta rounds or clamps to
zero. Preserve modifier selection, marquee, and explicit ruler scrubbing.
Empty-plot seeking uses the current scroll, zoom and Graph lead-in. A seek to
the existing frame should retain working drafts. Record default, Graph and
marquee reference limits separately from the observed Dopesheet gestures.
[Spine behavior settings](https://esotericsoftware.com/spine-settings#Behavior)

REA `ev_9d3dcf6cdd348a1640cc395f834c32fa948dd262b161a96c9aa23bedf85d8037`
also measured the identical f12 marker before and after the view change,
and in both Graph Swap states. Stock exports independently distinguish the
absent and restored Rotate key. The exact sequence contains a Dopesheet key
click and a Graph tab click. The result establishes playhead continuity,
with direct Graph key-click behavior still open. The private receipt is
`rea-spine-graph-dopesheet-playhead-continuity.json`.

FBones exposes both settings beside the timeline tabs and keeps four boolean
choices as local application preferences. They default off. An unmodified
key click or keyboard activation can seek to the stored frame. Empty-plot
clicks use the displayed ruler transform and Shift can preserve a fractional
position. Modifier selection, summary marks, box selection, canceled or
retimed gestures and physical travel that snaps to zero do not seek. The
existing ruler and transport stay available independently of the settings.

## Dopesheet selection gate

The retained 4.3.26 click and drag receipts do not cover the keyboard select
all sequence, a retained rectangle or its edge handles. The current guide
documents selecting the current property row on the first Ctrl/Cmd+A and
all shown keys on the next. It also describes a brief hold that retains a
selection box, additive boxes, edge scaling and reversal, and Shift for
unsnapped scaling. Exact defaults and pause duration remain open.
[Selection](https://esotericsoftware.com/spine-dopesheet#Selection),
[Box selection](https://esotericsoftware.com/spine-dopesheet#Box-selection)

REA MCP evidence `ev_66bf4e7316cd29a4871f9bd387d169624daafb3a3f78bf81fe05b78ebe56d0d4`
inventoried 151 regular Linux installer archive members and 149 loose
launcher files. No filename identified an independent shortcut or selection
resource. The archive wrapper digest matched the installed launcher. This
inventory gives no editor handler, binding, or rectangle transition. The
receipt is `rea-spine-dopesheet-selection-resource-gate.json` in the private
Graph research directory.

FBones uses a 280 ms pause by default. The Dopesheet preference can disable
the pause requirement. Retained boxes use the IDs actually hit by each
gesture. Control/Cmd adds a box and the keyboard shortcut first selects an
unambiguous selected property row. With multiple rows or no row anchor, it
selects all shown keys. Collapsed keys are in scope and filtered keys are
out of scope. Boxes expire on the next change to the document or row
geometry. These are FBones policies pending exact observations.

The native `scaleAnimationKeys` operation applies one signed affine frame
map to stable bone IDs in the original box. It supports positive scaling of
linear and stepped intervals, and reversal of linear intervals. Affected
Bézier intervals, collisions and mixed families are rejected atomically.
Curve scaling still needs handle mapping and reversed curve ownership.

## Dopesheet Sync gate

REA evidence `ev_d25169a4dc170139d9097d69f8f0fcc2f62e510c034798ab6de627be0fcacf84`
compared three authenticated 933×700 Spine Professional 4.3.26 Linux
Dopesheet captures. Their first 304×32 toolbar crop was byte-identical.
The first gray button reads Sync and contains paired green arrows. Lock and
Filter remain visible alongside it. The private receipt is
`rea-spine-dopesheet-sync-placement.json`. An exact enabled transition,
saved setting or simultaneous Graph and Dopesheet alignment is unavailable.
The prior f12 REA continuity result used sequential tabs.

The current guide documents feeding Graph-visible curves to Dopesheet,
hiding Dopesheet Lock and Filter in that direction, and aligning the two
time axes when the views are stacked. The official 4.3.73 beta notes add
the reverse direction. The 4.3.74 beta notes fix the reverse direction
showing all curves before a Dopesheet key is selected. Both predate stable
4.3.26. The 4.3 release announcement describes the source row for each
direction. The public-source addendum is
`rea-spine-dopesheet-sync-direction-sources.json`.
[Dopesheet Sync](https://esotericsoftware.com/spine-dopesheet#Sync),
[4.3 release](https://esotericsoftware.com/blog/Spine-4.3-released#Dopesheet-centric-sync-mode),
[4.3.73 beta notes](https://esotericsoftware.com/spine-changelog#4.3.73-beta),
[4.3.74 beta notes](https://esotericsoftware.com/spine-changelog#4.3.74-beta)

The paired implementation audit identified one common scope for row keys,
summaries, navigation, Ctrl/Cmd+A and Key Shown. Its inputs are live Graph
tracks, the Graph property filter and the Graph eyes. The existing
sheet-to-Graph automatic reveal can overwrite that scope and needs a Sync
guard. Account for shared collapse so a Dopesheet bone can still be expanded,
and exclude the temporary Deform progress view from row-scope authority.
An exact alignment test requires stacked panels, both toggle states, two
shared frames and a horizontal zoom or pan in one panel.

FBones starts with Sync off. The leading selector remembers the mode while
the timeline is mounted. Graph → Dopesheet uses live visible property
tracks, including independent split axes. Dopesheet keeps a local collapsed
presentation with visible summary marks. Dopesheet → Graph uses the source
selection captured when switching from Dopesheet, and leaves the plot
empty with no eligible source key. The driven target hides manual scope
controls and restores its previous filters and eye settings on return to
Off. Stored comparison curves never create new editable tracks. Discrete
keys and the temporary Deform plot remain available in their ordinary
views. Simultaneous docking and shared time-axis alignment remain open.

## Stacked timelines gate

The current tips specify both horizontal pan and zoom sharing when Graph
and Dopesheet are vertically adjacent and Sync is active. They do not
establish exact geometry in 4.3.26. Retained exact captures still prove
one view at a time. The current views guide documents draggable tabs and
resize boundaries separately.
[Spine Tips](https://esotericsoftware.com/spine-tips),
[Views and tabs](https://esotericsoftware.com/spine-views#Tabs)

REA evidence `ev_5230c31fcdf9ca994c0ec2d67bbecad15ccb7ef9f1e37d7cb2734a5929cbd21c`
pins the boundary of the current vendor layout material. It also compares
pixel-identical closed settings controls in the retained exact Linux Graph
and Dopesheet headers. The exact settings menu contents and a simultaneous
exact 4.3.26 pair remain unavailable. The private receipt is
`rea-spine-timeline-split-layout-boundary.json`.

REA MCP evidence
`ev_98c242be9a6bd173c09de92483eafce4548e31bed3a9dbcc2781d7cf420cd134`
measured the supplied `animare/` captures with `capture_process_scenario`.
The private receipt is `rea-spine-animare-timeline-geometry.json`.
Graph frame labels 0, 5 and 10 sit at x273, x394 and x515. A separate
Dopesheet capture puts 0, 10 and 20 at x252, x346 and x440. The wide capture
shows Dopesheet and Preview next to each other. REA pixel comparison also
identified one cropped duplicate among the Graph samples. These unpinned
samples establish density and separate-panel geometry. The exact stacked
height ratio, leading edge and gesture transitions remain open. The scenario
used zero original window inputs.

A second `capture_process_scenario` observation
`ev_57560e58c44f46afc4a20ec0683e855b85e4a97240c7477cebebfe5a5bf3dd95`
compared a separate retained Linux 4.3.26 Graph crop from the Swap fixture.
Both settings crops match the prior closed-control captures. The private
`rea-spine-timeline-view-settings-open-gate.json`
receipt records the target and search limits. The next Rows/Toolbar check
needs an exact open capture or an exact editor artifact that identifies the
options structurally.

Keep one selection, gesture and undo controller. Split the plot/ruler
presentation into two pane contexts while keeping one shared header,
toolbar, key inspector and transport. Focus determines command scope.
With Sync active the panes need the same physical gutter, frame origin,
time extent, zoom and horizontal scroll. Each pane keeps its vertical
scroll and Graph keeps its independent value range. Capture Dopesheet
selection only from Dopesheet-origin actions. Ruler, pan, marquee and
box scale need the originating pane's geometry, including the pre-zero
origin. Check two nonadjacent frame positions after zoom, pan and resize
from each pane, then verify the Off cameras and one native Undo.

FBones uses an optional session toggle and a two-row layout with Graph first.
The focused pane supplies command scope and both panes use the same transport.
Sync shares the leading origin, scale and pan within the range both panes
can represent. Off restores each pane's independent zoom and scroll. These
layout details are FBones choices while the exact stacked reference is open.

For the tangent-and-transport regression, REA MCP `capture_process_scenario`
evidence `ev_0e2283947c57bf51327c9c4a4b5e6ffa0c63163597c47f440a66ffd732387a0c`
correlates a retained exact Linux Graph capture with its input receipt.
Play and Repeat are distinct in the capture. The run contains zero Play
inputs and zero tangent drags. The FBones regression test verifies its own
pause, cancellation and commit contract. Spine behavior during the same
gesture remains open. Private receipt `rea-spine-graph-tangent-play-gate.json`.

## Rows and Toolbar gate

The exact Linux 4.3.26 Graph and Dopesheet captures show a closed settings
control. REA MCP `capture_process_scenario`
`ev_1bca559ec66721650c2930cadeda69fc61b7092e77c435dd756cd5d8577e005b`
checked a separate structural candidate in the stock Linux launcher archive.
The shared directory was empty. The matching generic configurations belonged
to the bundled JVM. Menu text and saved preferences remain open for 4.3.26.
The same REA tool compared the keyed body in an exact Linux pair in
`ev_ec14888f7354165e3d799937509d89d5bcd0544b4a1ca4ad1ba6fef424d96481`.
Graph's name band ends at local x243 for all three sampled rows, followed
by the plot at x244. The corresponding Dopesheet row fills continue across
x244 and x300. The comparison separates the name rail from time lanes
in the shown state. Private receipt
`rea-spine-timeline-rows-toolbar-structural-gate.json`.

The current Dopesheet guide documents positive Rows and Toolbar settings.
The Graph guide documents hiding the rows, including visibility dots, and
the toolbar. Hiding rows frees horizontal space while hiding the toolbar
frees vertical space. The guides have no exact editor version pin.
[Dopesheet settings](https://esotericsoftware.com/spine-dopesheet#View-settings),
[Graph settings](https://esotericsoftware.com/spine-graph#View-settings)

FBones keeps independent default-on preferences for both timeline views.
Rows controls the labels and row buttons, while keys, curves, selection,
visibility state and collapsed rows keep their existing behavior. Linked
panes keep a common gutter while either view displays labels. A gutterless
timeline places playback above the ruler. The shared stacked command bar
stays visible when either view enables Toolbar and uses the focused pane's
commands. This keeps the plots in place when focus changes by pointer.
The view header, ruler, playback and key inspector remain available.
Store these settings with local workspace preferences.
