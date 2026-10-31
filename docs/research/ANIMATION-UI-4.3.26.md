# Animate, Dopesheet and Graph — UI reference and initial contract

2026-10-30. Recorded before animation UI implementation. New user priority is
Animate mode, timeline and keyframes, with the supplied Spine layout followed
closely and FBones colors allowed to differ. This supersedes the previous
research-before-timeline ordering. DATA independently audits the binary model;
this document covers appearance and interactions only. No original application,
Windows process or user window was operated by this UI worker.

## Evidence and limits

The worker **viewed every image**, using `view_image`, in actual directory
`animare/` and all three images in `spine_pictures/`. Native dimensions were read
using Pillow `Image.open(path).size`; no image was edited or distributed.

| Local user reference | Dimensions | Directly visible evidence |
| --- | --- | --- |
| `animare/Spine_vzdTlvDSE9.png` | 2560×1439 | Complete Animate workspace, bottom Dopesheet, right Tree/Weights/Curves/Preview, transform HUD and animation list. |
| `animare/Spine_xVO18OJIOB.png` | 1791×778 | Dopesheet toolbar, ruler, expanded bone/property rows, frame grid and colored key marks. |
| `animare/Spine_m7wxCtUtTG.png` | 1797×567 | Graph tab, matching track hierarchy, time ruler, value-axis curves, selected square keys and handles. |
| `animare/Spine_Q0STKcaHeG.png` | 965×242 | Setup-style floating toolbar for comparison with Animate toolbar. |
| `spine_pictures/Spine_qINTitRPSQ.png` | 834×159 | Compact transform values, per-property key buttons and hierarchy breadcrumb. |
| `spine_pictures/Spine_eH8VIB7TXl.png` | 560×368 | Tree/property compactness and nested relationship lines. |
| `spine_pictures/Spine_5qk2u6L0xb.png` | 1082×1137 | Viewport bone drawing and bottom floating transform toolbar. |

These images directly prove the user's requested **visual reference**. They do
not print the editor version or prove mouse/keyboard behavior. The project uses
only installed4.3.26 Professional as the executable oracle; no new Animate
interaction on that exact binary has been collected here. Do not promote a
static screenshot or version-unpinned guide into exact4.3.26 gesture proof.
Existing `FEATURE-UI-4.3.26.md` and constraint research establish the installed
reference identity and compact docked workspace, not unseen Animate gestures.

## Directly observed layout

The full image keeps the thin application header, checker viewport and dense
right-side panel columns. `ANIMATE` appears at viewport upper left. The bottom
timeline is a **docked editor region**, not a card or a floating modal. At this
specific saved layout it occupies approximately x0–1798 and y852–1439: about70%
of window width and41% of height. The bottom-right Preview is separate, with an
animation-name list beside the preview image. These are adjustable layout
observations, not universal fixed screen dimensions.

`Graph` and `Dopesheet` are neighboring small tabs on one header. Below is a
single compact horizontal strip of grouped actions, followed by a transport/time
ruler band. The Dopesheet reference has these groups, in order:

- Sync, small row/navigation icons, filter, lock/refresh and key-related icons.
- Clipboard/edit and curve-shape icons; several visibly disabled.
- Shift, Offset, Adjust.
- Current with frame number, Loop Start with number, End with number.

Transport sits **at the left of the ruler**, not at the application header or
inside a large playback card. It has seven small transport buttons and a blue
repeat button. Ruler labels are above the tracks, with minor frame ticks and
larger ten-frame labels in the Dopesheet close-up. The cyan current-frame number,
downward pointer and vertical line align at the same x coordinate. Orange
diamonds immediately below the ruler summarize keyed frames.

The left gutter contains the animation overview row, expandable bone rows, then
indented property rows. The full image gutter is approximately264px; the
Dopesheet close-up uses approximately251px. Close-up rows are approximately23px
high; full-image rows about23–24px after accounting for display scale. Preserve
this density with roughly11–12px text and small14px icons, not tall list items.
The reference starts time at the gutter boundary. Property labels never overlay
the time grid. Timeline scrollbars and a tiny bottom-left zoom slider are visible.

Channel identities are stable across toolbar and tracks: Rotate green,
Translate blue, Scale red and Shear yellow. Bone header bands are desaturated
teal/gray. The active animation overview band is brighter teal. Property rows
are dark neutral gray; unused time to the right is darker, with subtle vertical
grid lines. Dopesheet keys are **narrow vertical colored marks**, grouped keys
white. They are not all diamond widgets. Green connecting segments on Rotate
rows show transitions; horizontal flat spans also occur.

Graph uses the same hierarchy and frame ruler, but a continuous plotting area.
Keys are small squares, curves and Bézier handles are drawn in channel colors,
and numeric values appear at the right edge. In the supplied graph, red and
yellow horizontal curves lie near values100 and0. The Graph toolbar differs:
Frame, Auto, favor/heart and Store appear instead of the Dopesheet's Current/
Loop Start/End group. Static pixels alone do not identify every icon's command.

## Animate toolbar differences

The existing floating transform HUD remains immediately above the timeline in
the viewport. It groups Pose/Weights/Create, four transform rows with adjacent
numeric cells and key buttons, Local/Parent/World axes, Bones/Images/Auto Key,
and a tiny selection/visibility matrix. In Animate, **Create is disabled** and
**Auto Key replaces the Setup Pixels button**. The supplied Animate image shows
Auto Key blue/enabled. Rotate is selected. Do not move this entire control group
to a new generic top toolbar. `spine_pictures` also shows a compact breadcrumb
directly above the HUD when a bone is selected.

## Documented interactions — fallback, not patch proof

The current official [Keys guide](https://esotericsoftware.com/spine-keys) says
an animation must be active in Animate mode. It documents creation through
Animations→New→Animation, scrubbing with the cyan playhead, Shift to bypass
frame snapping, default30fps, Auto Key, manual property key buttons and `K` for
edited properties. Bone animation values are relative to Setup pose. Its key
button colors distinguish absent, unkeyed change and existing key. These are
version-unpinned documented behaviors, not new4.3.26 observations.

The official [Dopesheet guide](https://esotericsoftware.com/spine-dopesheet)
documents animation/bone/property rows, timing-only key editing, selection-linked
contents with a lock option, Ctrl/Cmd multi-selection and draggable keys. It
describes linear, Bézier and stepped connecting lines, fractional Current input,
loop start/end controls and row selection activating the matching transform
tool. Specific icon tooltips and gesture variants remain unverified in4.3.26.

The official [Graph guide](https://esotericsoftware.com/spine-graph) documents
time on x/value on y, square keys, curve visibility dots, independent component
curves and Bézier handles. This explains the supplied graph's visible structure;
advanced handle modes, favor/store and complete graph navigation remain outside
the first functional slice until implemented and verified.

## Practical initial UI contract

1. Keep Setup/Animate as a real workspace mode, distinct from Bones/Images edit
   tools and transient live Physics. Entering Animate reveals a bottom region
   with tabs, compact controls, track gutter and aligned time grid. Reuse the
   existing two-axis dock system; root owns the horizontal resize boundary.
2. Show actual native animations and actual bone/property tracks. An empty
   project has an honest empty animation state and a working creation command,
   never fabricated keys or a screenshot-only animation. Tree and timeline
   share active-animation identity and bone selection.
3. Initial native persistence may support only a bounded channel subset. Render
   supported tracks accurately. Broader controls may be visibly disabled with
   an explanation, never silently mutate Setup or pretend to save unsupported
   animation data. DATA owns the exact binary acceptance boundary.
4. Use one native authoring path for manual keys, Auto Key, key move/delete and
   interpolation. A completed drag is one undo entry. Timeline scrubbing and
   playback evaluate transient poses; they never rewrite Setup. Pending numeric
   edits flush before authoring/save; stale/invalid edits remain guarded.
5. The controlled timeline component receives animation names, real keyed tracks,
   selected bones, current frame, fps, playback and keying state. It emits seek,
   playback, selection and completed key-edit intents; it does not own a second
   persistence/constraint engine or send complete native scenes each frame.
6. Scrubbing, Current input, transport, repeat, zoom, row collapse, selection,
   moving/deleting keys and linear/stepped/Bézier choices must have actual
   commands. Implement Dopesheet first; Graph may be explicitly unavailable
   until real curves exist. Do not replace the reference with large buttons,
   spacious cards, a separate wizard or invented workflow.
7. Match the supplied panel geometry, hierarchy, glyph proportions and density;
   use independently drawn icons and FBones tokens. User allows color changes,
   not a generic redesign. Keep supported toolbar groups in their reference
   order and reserve no misleading active controls for unimplemented features.

## Initial verification

Root's Ubuntu Playwright runner should verify real animation creation/selection,
keys at0/15/30, actual pointer scrubbing, keyboard frame input, key selection and
one completed move/delete, interpolation, loop playback, Undo/Redo and binary
Save/Close/Open. Assert Setup bones are unchanged and unsupported source data is
never rewritten. Capture the same wide viewport layout with timeline and HUD
visible; compare placement, density, time/key alignment and scroll behavior with
the supplied images. Browser/Rust tests do not prove native OS mouse routing,
Windows dialogs or original4.3.26 animation acceptance. Those remain separately
reported checks. No original collection is authorized by this document alone.

## Follow-up exact4.3.26 data observation

Root subsequently collected ONE new own JSON import and ONE same-source export,
original75344/58520 both exit0 with exact4.3.26/Complete receipts. Input SHA
`c46f781d052115a5b07663392a7e2bb966b04d9a1655e05ae4a8bf50a39cecea`;
generated editor project SHA
`4b01f76d55d3a80c3449ae594442b147ef6942135a17e9a6e580514203a4d1f8`.
Raw evidence is ignored under `.local/research/animation-transform-reference/`.
The UI worker independently compared actual exported JSON: two nonzero Setup
bones unchanged, three animations, four bone channels,72keys,238key/handle
scalars, maximum decimal residual1.33e-15. Requested FPS24 is exported as24.
Rotate uses `value`; paired channels use `x`/`y`; outgoing curves preserve
linear, stepped and independent Bézier controls (four numbers for Rotate,
eight for paired channels). Official4.3 runtime-reader documentation was checked
before collection; the actual result now proves this bounded editor import/
export behavior. It does not prove interactive key gestures, wire encoding,
evaluated playback or justify enabling a channel before its native codec supports
it. No original operation was performed by the UI worker.

## Animate history selection — explicit FBones policy

Recorded before the selection fix. Actual Windows QA on an **unpublished**
candidate found that opening a saved project initializes native edit focus to
root. Selecting an animated child in the UI, editing its key and using Undo/Redo
then copied native `editedBone=root` into the UI selection. Unlocked Dopesheet
rows followed that unintended selection, making the child's keys disappear.
Earlier Linux fixtures created the child immediately before animation and left
native focus on that child, masking the reopen-specific defect.

The supplied screenshots do not show an Undo sequence. The official Dopesheet
guide, already cited above, documents selection-linked unlocked contents but
does not settle the exact editor's history-focus rule. **Original4.3.26 selection
restoration during Undo/Redo remains unknown.** No new original input is needed
to correct this independently diagnosed FBones issue.

Adopt this explicit FBones policy: while in Animate, preserve the current UI
selected bone IDs and primary selected bone across Undo/Redo when they still
exist. Remove IDs actually deleted by history, choosing a valid fallback only
if necessary from the prior selected survivors, otherwise null. Preserve an
explicitly empty selection. A native edit-focus hint cannot replace a surviving explicit UI
selection. Keep existing Setup history focus behavior. No animation/key/Setup
data, stable IDs or history ordering changes are implied. Regression must reopen
a binary first, select the animated child, edit a key, then verify both Undo and
Redo retain that child's selected state and visible tracks.

## Shared Setup/Animate floating controls — user correction

The user explicitly requires the central floating transform UI in **Setup as
well as Animate**. This is supported by the already viewed Setup crops
`animare/Spine_Q0STKcaHeG.png` and
`spine_pictures/Spine_qINTitRPSQ.png`: the same compact four transform rows,
numeric cells and axes groups sit at the bottom center in Setup. The Animate
full image retains that arrangement, replacing Pixels with Auto Key and
disabling Create. Exact glyph/key visibility by mode has not been newly probed.

The current FBones split between central Animate rows and the older Setup
multi-field HUD does not satisfy that requested shared layout. Minimal change:
reuse one row/field presentation and the existing shared BoneFieldEditor in
both modes; keep Setup field test IDs and native Setup editing path, and keep
Animate field IDs and animation-key routing. Per-key actions and Auto Key belong
to Animate; Setup retains its Create/Weights/Pose/tools/axes behavior. Do not
leave a second duplicate Setup numeric editor over the shared control group.
Additional Setup-only length/name/inheritance controls may stay in the existing
bone inspector. This is a user-authorized layout correction, not an excuse to
change transform arithmetic, focused precision, history or persistence.
