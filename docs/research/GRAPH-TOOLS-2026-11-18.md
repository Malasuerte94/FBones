# Graph framing and stored curves

## Graph value guides

REA MCP compared retained exact Linux 4.3.26 Graph captures. Labeled values
240 and 0 align with horizontal guides at y541 and y631 in the loaded Graph.
The value and purpose of an additional unlabeled guide remain open. The
private `rea-spine-graph-guide-alignment.json` pins the captures and samples.
FBones derives the labeled horizontal guides from the same tick values and
padded `graphY` transform as the right axis. The grouped production-CSP
test checks that all five guides align with their corresponding axis label.

## Favor and Presets reference gate

REA MCP `ev_be9b9816dcbba7c161626cfef7d971e7fabe326da26131e84430226fafa1a105`
compared six owned exact Linux Graph states. The orange heart and adjacent
unlabeled icon remain byte-identical across the retained states. The owned
interaction records show Store, Swap and key deletion. They contain no Favor
drag or presets selection. The exact 4.3.26 changelog identifies Favor and a
frame-change fix. The current vendor guide documents shifting selected values
toward neighboring keys, or adding breakdown keys between visible curve keys,
and manual Bézier preset actions. Exact drag proportions, handle coordinates
and advanced preset metadata remain open.
[4.3.26 changelog](https://esotericsoftware.com/spine-changelog/#4.3.26), [Favor](https://esotericsoftware.com/spine-graph#Favor), [Presets](https://esotericsoftware.com/spine-graph#Presets)

The paired implementation gate uses visible supported bone curves, including
existing split axes. Favor and uniform Blend stage a Graph preview against
immutable neighbors and use the native atomic key batch on commit. The draft
expires when frame, selection, clip, revision or view changes. Flat and ease
presets create or adjust manual Béziers through the same native path. Selection
scope, weights and normalized handle positions are FBones policies. Show the
remaining documented choices as unavailable until their behavior is supported.
Do not map automatic or separated handle state onto unmeasured project fields.

FBones currently preserves selected keys' existing curve type and absolute
handles under Favor. Uniform Blend and distance-weighted Favor use [-100,100]
percent. Without a selection, editing is limited to strict visible linear
intervals. Flat adjusts handles next to the selected key, and Ease In/Out
apply normalized controls to the supported segment. The verified earlier
batch declined edits that could lose a signed zero in a combined or Rotate
input. The newer shared desktop carrier restores those signs in native input
and removes that source-level restriction, with verification queued.
The production-CSP case passed for draft cancellation, selected-key movement,
pointer-release insertion, stable key IDs, working-pose retention, Flat on
both adjoining segments and one Undo. Direct checks cover the Ease In endpoint,
weighted pooling and signed-zero admission. Advanced modes, Bézier insertion and other
key families remain open. [Grouped case](../../tests/e2e/graph-tools.native.spec.ts)

## Setup-adjusted display evidence

REA joined the exact Linux mixed Graph capture with the original CLI keys.
For the root bone it verified Setup adjustments on four additive lanes:
Rotate +23, Translate X +19, Shear X +4 and Shear Y −7. Separable key-ring
centers agree with those projections to within 0.625 pixel on the
measured axis. Overlap prevents a Translate Y conclusion. The five Scale X
rings agree with 100 × Setup scale 1.3 × stored scale factor. The unlabeled
guide corresponds to about 100 on that axis and its purpose remains open.
REA `ev_1d49b6cb801adc4c667aa3a0362cb4625489aaee66f44608ab378013ef2bcb05`
also located five visible Scale Y rings and eleven Bézier handle cores across
Rotate, Translate X and both Scale axes. The handle centers follow the
Setup-adjusted projection within 1.1 pixels, with unchanged time positions
within one pixel. The root Scale Y keys follow 100 × Setup scale 0.75 × stored
scale factor. Translate Y, Shear handles, parent space and input gestures
remain outside these samples.

The private `rea-spine-graph-favor-presets.json` and
`rea-spine-graph-setup-display-lanes.json` pin REA evidence
`ev_be9b9816dcbba7c161626cfef7d971e7fabe326da26131e84430226fafa1a105` and
`ev_22e46ae4ea47032ceb011235cae8dec1e8f75a53199564c50f3d5c32d5a143cd`.
Keep measured display projections separate from the stored key values used by
Favor, Presets and native editing.

The paired DATA/UI gate applies the same affine projection to the Graph
key marks, live and stored curves, Favor preview, handles and fit bounds.
Use authored local Setup values. Translation, rotation and shear add their
Setup component. Scale multiplies by its Setup component and uses percentages.
The parented and unmeasured component cases extend the existing FBones
sampling convention. The shared axis remains numeric for mixed units.
Graph marks announce displayed values and the key inspector continues to
edit stored units. An inverse delta handles pointer editing with a frozen
projection. Negative scale reverses the direction, and zero scale permits
time edits with the original raw ordinate. Slot, constraint and Deform
progress projections use their established values. Preserve signed zero
where pointer edits serialize neighboring full key records.
[Spine Graph curve and key guide](https://esotericsoftware.com/spine-graph#Curves)

Projection and inverse dragging passed grouped verification. The curve bounds,
Frame/Auto, key and handle coordinates, stored comparison and Favor draft
share the same Setup basis. Key labels expose displayed degrees or percentages
where applicable. The Graph inspector identifies its raw value in a tooltip.
The original authored display timing and all stored key values remain on the
existing native paths. Handle commits carry the captured revision and retain
the working pose. Desktop input now transports signed zero separately from
the JSON numeric value and rejects malformed signs or scalar padding changes.
The parented fixture verifies negative and zero Setup scales, fit and graph
coordinates, graph preview isolation, inverse and time-only drags and unchanged
neighbor data. The desktop library verifies the native signed-zero path. The
grouped run is under private `graph-display-repeat-grouped-2026-11-18/`.

## Repeat and unkeyed extensions

REA `ev_4e405d3b494c2340457430cb72adaa85aa861de9c788a6d3a6ac02149073ee84`
compared exact Linux Graph `03` and `04`. Muted red strokes before the first
key and after the last follow the interior Scale X trace shifted by a 24-frame
period. Across 61 sampled post-key columns, the peak y positions match the
interior trace. Twenty-one pre-key columns agree within one pixel. The exterior
crops are identical before and after Store. The loaded Repeat indicator is
blue, and the lower-left pre-zero arrow appears in both loaded and empty states.
The observed animation bounds equal the track bounds. Period selection for
sparser tracks, Repeat-off appearance and the arrow gesture remain open.
The private `rea-spine-graph-repeat-edges.json` pins the capture and measurements.
The current vendor guide describes faded repeats, Setup before the first key
and a held last value with Repeat off. [Spine Graph Repeat](https://esotericsoftware.com/spine-graph#Repeat)

The additional REA scan `ev_70a952a540200ed3aa504764f3705b5fa0ee2b51324a89f5a3c4d45203015bab`
found an exact sparse Timing Shift fixture with a .2–.7s Rotate track and
clip extent .9s. The matching keyed screenshot is Dopesheet, so it cannot
identify the Graph period. The private `rea-spine-graph-repeat-sparse-gate.json`
pins the scope. The Graph guide links Repeat to the playback control, and the
Keys guide describes repeat length in terms of the last key across active
skeletons. FBones uses the current authored clip duration for its one-skeleton
editor. Existing Loop fields and the Sequence preview tail continue to govern
playback. Their use in exterior Graph phase remains unspecified in the source.
[Spine Keys Repeat](https://esotericsoftware.com/spine-keys#Repeat)

The paired gate uses the existing Repeat button for Graph continuation.
Inside an authored period, an unkeyed bone prefix uses the Setup value and
a suffix holds the last value. Timelines without available Setup data can
show their keyed shape and last hold. With Repeat off the same holds extend
across the plot. Repeats are dim, clipped presentation copies of live paths,
independent of Store and Favor. Clip period, sparse gaps, clipping and
limits are FBones policies. Opposite seam handles remain open. The Graph-only
arrow expands and collapses the visible time gutter using a single display
origin. Ruler input in the gutter clamps at frame zero. The gutter changes no
clip range, key IDs, authored bounds or saved data.

The new sparse-track Chromium case with real Rust Session verifies exterior
offsets of 30 frames for a track keyed at frames 8 and 18, off-state holds,
independence from Store, and a shared ruler, playhead and key origin. Clicking
in the negative ruler gutter resolves to frame zero. Authored keys, revision
and duration are unchanged. The retained capture is `graph-repeat-lead-in.png`.

## Lock and Refresh reference

REA `ev_6fe2b04d82ce46bd4e9d1e2a71a862548ef6b9d7b8a8ba760c1cae227097aa04`
compared `03-clip-graph`, `06-target-selected` and `09-after-swap` from the exact
Linux Graph Swap recipe. The padlock and adjacent circular-arrow crops are
pixel-identical across the three states. The selected Dopesheet screenshot
and the recorded Swap exercise other controls. The captures establish the
two affordances and the common appearance sampled here. Their interaction,
scope, activation conditions and Handle Modes remain open. The private
receipt is `rea-spine-graph-lock-refresh-affordances.json`.

Follow-up REA `ev_eef53b1a58619cac8f4b1f8926eeea71fa8d70f0e21f3c871670e4270e5cb2f1`
measured the funnel and bone selection glyph in 12 digest-joined exact Linux
Graph and Dopesheet captures. Their pixels match across the sampled toolbar
states. The retained inputs contain no matching toolbar action, and no open
filter menu was observed. The private receipt is
`rea-spine-timeline-lock-select-filter-scoped.json`. The vendor guides
describe Lock retaining bone rows, Refresh taking the current selection,
and Select applying the shown bone rows to the viewport selection. They also
describe property filters, modifier selection, Reset and Current tool.
[Graph contents and filters](https://esotericsoftware.com/spine-graph#Contents), [Dopesheet contents and filters](https://esotericsoftware.com/spine-dopesheet#Contents)

The FBones gate keeps the current shared lock across tabs. It captures
stable bone IDs and the slot or constraint row scope, including the matching
stored comparison. Refresh replaces that scope without unlocking. Select
reuses workspace multi-bone selection. Property filters are independent per
tab and separate from Graph curve visibility. Rotation, translation, scale
and shear can also follow the selected transform tool. Split translation and
scale use their family filter, and Physics includes Reset. Modified clicks
combine categories, Reset shows all and right click bypasses the current
filter. A collapsed Dopesheet group keeps its filtered summary marks. Graph
fit and comparison use the filtered curves. Hidden keys drop from the active
selection. These controls use local editor state. Key Shown is visible and
unavailable pending its keying implementation.

The corrected grouped Chromium cases verify the IK target and slot owner
selection, frozen empty rows, independent filter choices, Current tool,
collapsed summary marks, stored curve filtering, hidden key safety and an
unchanged native snapshot. The source test is
`tests/e2e/timeline-row-controls.native.spec.ts`. Private grouped evidence
includes the first test failure trace, the final production-CSP logs and the
960×740 screenshot of the filter panel.

### Key Shown reference

REA `ev_749313eec62111a7f9d4f833b83c8a010b81df20198e3254d075c059f97bd65c`
measured an unlit key-shaped glyph before clip load and 52 green pixels in
the corresponding loaded Graph and selected Dopesheet crops. None of the
11 owned exact Linux input recipes recorded this command or a matching
gesture. The private receipt is `rea-spine-timeline-key-shown-scoped.json`.
The current guide describes capturing the current pose into keyed properties
shown in Graph or Dopesheet and gives Ctrl/Command+Shift+L as the shortcut.
The exact eligibility of collapsed rows, paired axes, same-frame keys and
discrete trigger rows remains open.
[Key Shown guide](https://esotericsoftware.com/spine-keys#Key-shown)

The paired implementation gate uses the live filtered property scope, including
collapsed Dopesheet summaries. Graph excludes hidden eyes, and both tabs exclude
empty placeholders and Store. Bone transforms, slot color, constraint parameters
and Dopesheet attachment and draw order state may be keyed in one native batch.
Sequence restart, Events, Physics Reset and Deform progress are separate scopes
with unresolved eligibility. The current-frame gesture uses local sampled and
working values. Existing unchanged keys are no-ops. Inserting into a supported
Bézier interval plans the new point and the old outgoing controls together.
With a working edit, retain the local tangents at the new point. The native
profile validates both halves and can reject the batch as a unit. This is an
FBones authoring policy with the current guide as fallback for gesture semantics.

REA `ev_56ee6265af4f959513702d65ffd8412d5b74d29a422bdd009e1d7b37587f6fd6`
excluded the exact retained Swap example as an insertion witness. The restored
-13 key at 0.5 seconds is outside the old Bézier ordinate hull [20.6, 67],
whose analytical value at that frame is about 45.435675. Neither that comparison
nor the 11 retained inputs establishes the original subdivision rule. The
private receipt is `rea-spine-graph-new-keys-adjust-gate.json`.

FBones verification uses the real Rust Session through Chromium. The symmetric
Rotate witness writes [13, 10, 15.5, 20] and [20.5, 45, 23, 60] as the two
absolute handle pairs around frame 18 and value 32.5. A working Translate X
is committed with that split. Hidden Translate Y retains both its authored
keys and working draft. A repeated action at the same frame creates no edit.
The Dopesheet witness commits a mixed pose from collapsed locked rows through
one `setAnimationKeyBatch`, with one Undo. A second mixed case rejects an
RGBA value of 1.625 through native validation and preserves the full snapshot.
RGBA rewrites carrying negative zero are guarded until the slot transport
can carry their signs. Test logs and two screenshots are retained under
private `key-shown-grouped-2026-11-18/`.

### Key Shown Deform follow-up

The guide describes keying the rows displayed in Dopesheet and the curves
displayed in Graph. It lists Deform as a property that can be keyed.
The retained exact Linux REA captures establish control presence and do
not observe Key Shown. The exact export sets have no Deform or Sequence
timeline for this command. Attachment-level eligibility in Spine is open.
[Spine Keys guide](https://esotericsoftware.com/spine-keys#Key-shown)

The paired FBones gate adds already-keyed Mesh or Clipping Deform rows in the
filtered Dopesheet cohort, including rows represented by collapsed summaries.
Graph uses the single live progress curve when that curve is in the filtered
scope. Stored comparison, hidden rows and an empty progress pane add no
targets. Reuse the explicit Deform planner with the raw UI draft time and
the existing revision-bound mixed key batch. An inactive attachment can
participate when its existing row is shown.

Add a keyed f0–f20 Mesh Deform interval to the locked, collapsed Dopesheet
fixture. Controls `(5,.25,15,.75)` split at f10 into
`(2.5,.25,6.25,.625)` and `(13.75,.375,17.5,.75)`. Confirm one mixed
native edit and one Undo, an unchanged hidden sibling, a repeat no-op,
and atomic rejection on an unrepresentable Deform segment. In Graph,
verify the toolbar and shortcut follow the actual live progress scope.
Sequence remains a separate eligibility decision because a key can
restart the playback phase between existing transitions.

The real-session Dopesheet case keys an inactive Mesh displayed in a locked,
collapsed cohort, together with the existing bone, slot, draw-order and
constraint rows. The full dense midpoint and both child controls match.
The hidden sibling, unrelated tracks, Setup, repeat no-op and one Undo pass.
Adjacent f32 endpoint values reject the entire mixed action before IPC.
In Graph, Store-only and collapsed cases leave Key Shown disabled. Selecting
the live progress curve and invoking the shortcut splits only its attachment.
Re-expansion requires a fresh key selection after the existing scope pruning.

Production web and E2E typecheck and 533 JavaScript tests passed, with one
existing skip. The production-CSP browser round passed 34 cases initially.
The Graph case passed on recheck after its fixture reselected the live curve.
Both runs used the same production sources, assets and Rust host.

### Key Shown Sequence follow-up

The retained exact Linux captures establish the Key Shown control's presence.
They leave Sequence eligibility and image phase after insertion open.
The paired FBones gate uses the shown keyed Sequence rows and live Graph
markers. Clean insertion preserves the sampled image and the subsequent
transition phase up to the next existing key. An explicit Sequence draft
can author a new phase. Use stored f32 time, FPS and delay to check alignment
independently of the sampler's frame selection bias. Check Hold, a saturated
Once, a single image and exact existing keys as well as aligned advancing keys.
An off-grid key can preserve the image when the old and new intervals both
hold their current image until the next authored key.
An unrepresentable shown row rejects the mixed batch with an attachment and
frame-specific notice. Keep the ordinary Sequence Key command's phase restart.

At 8 FPS, seed Count 4, Loop f0/index 1/delay .25 and a later Hold at f10.
At f4 the inserted Loop starts at index 3 with the same delay. Samples around
f6 preserve the image transition. At f5 a clean insertion would delay that
transition, so verify one atomic rejection with a shown bone row. The f10
sentinel isolates the interval check from the auto preview-end policy.

The aligned insertion preserves stored-time phase. Existing f64 sampler
rounding can differ at the immediate neighbors of a biased transition.
Very short delays can amplify that effect. A new terminal key can also
extend an automatically derived preview tail. These boundaries remain open
outside the authored transition fixtures.

The production-CSP Dopesheet case preserves the native image index and path
at the f6 and f10 boundaries after an f4 insertion. The f5 clean attempt
raises an attachment-specific notice with no write, and an explicit Hold
draft intentionally authors f5. Graph keys the displayed aligned marker
with Rotate, leaving its hidden sibling and Store alone. A pre-existing
Graph fixture has an unaligned Sequence at f18. It now proves the mixed
rejection and the unchanged numeric-key result after filtering that row.
Existing numeric curves retain their prior visibility source.

Production web and E2E typecheck, 536 JavaScript tests with one existing
skip, and 39 distinct real-session cases passed on the final assets. The full
recheck and focused Graph scope test ran against the verified Rust host.

## Curve visibility groups

The REA-authenticated Linux `08-graph-before-swap.png` shows visibility
markers at the right edge of the overview, bone and property rows. The
supplied wider image shows several bone groups, and the Dopesheet image has
no corresponding marks. Those captures establish the placement. The
version-unpinned Graph guide documents scope over the current rows for the
overview, the properties under one bone and all axes of a single property.
Its modifier, automatic default and visibility history behavior remain open
for the exact version. [Graph rows](https://en.esotericsoftware.com/spine-graph#Rows)

FBones uses labeled eye buttons in its own Graph gutter with transient
visibility scoped to the current document and clip. All curves start visible.
The same filter governs the live overlay, comparison curves, fitting and
Graph pickability. Dopesheet keeps its rows, marks and normal command routes.
Hidden keys must not participate in Graph edits through a stale selection.
Graph row visibility does not write authored project data.

The grouped production-CSP regression exercised the property, bone and
overview controls with Space/Enter. It covered mixed state, masking both
Translate channels in the live/stored plot, preventing Delete of the hidden
selection, Frame on an empty plot, and unchanged native state. An explicit
Dopesheet selection reveals the corresponding curve on return to Graph.
The filter resets across clip changes. The original retained marker evidence
is pinned independently in private `rea-spine-graph-row-chips.json`.

REA MCP `capture_process_scenario`
`ev_23f33fbc214417f48c3fc2c222686081b2f0c341f17021b7401ae4062e7cb6ca`
compared two retained exact Linux 4.3.26 Swap states with corresponding
stock exports. Rotate at frame 12 is present in the first export and absent
in the second. The plot pixels change while the six chip centers and their
strip remain identical. The recipe contains two Swap commands and zero
inputs on those chips. This separates the measured display state from that
authored key change. Private receipt
`rea-spine-graph-visibility-isolation-gate.json`.

Current vendor tips document a right-click or Ctrl-click toggle that keeps
other dots as they were. The current Graph guide describes both gestures
with less specific scope. For exact behavior a useful witness starts with
three or more rows and mixed visibility and records both clicks and a
re-click. Exact primary click, modifier scope and restoration remain open.
[Spine Tips](https://esotericsoftware.com/spine-tips), [Graph rows](https://en.esotericsoftware.com/spine-graph#Rows)

The accepted REA stock Linux index
`ev_66bf4e7316cd29a4871f9bd387d169624daafb3a3f78bf81fe05b78ebe56d0d4`
contains zero standalone hotkey maps. The current Graph guide describes
Ctrl/Cmd+A expanding from a selected curve to all shown curves and retaining
the selection kind, keys or handles. Exact Linux gesture evidence, the
starting-empty rule and mixed selection remain open.
[Graph selection](https://esotericsoftware.com/spine-graph#Selection)

### Graph key and handle selection gate

REA MCP `capture_process_scenario`
`ev_ae2383c715eaeae58d2d65f64ac0638bbc5bc53de4a802f1e0359e941fdf0f9c`
joins the retained Linux 4.3.26 Graph image and its stock 24 fps export.
The frame 6 key owns both Translate pairs for the segment ending at frame
12. X has controls `(.3125, 12), (.4375, -3)` and Y has
`(.3125, 10.75), (.4375, 12.25)`. X has a fully visible outgoing center.
The Y center is inferred from its exposed, distinct raster profile and the
exact export. Earlier X-axis samples establish incoming and outgoing sides.
Selection transitions, RGBA display and multi-handle editing remain open.
Private receipt `rea-spine-graph-combined-translate-handles.json`.

FBones expands key selection from a single visible track to all live
curves. Combined components share each authored ID. Empty or mixed keys
select all visible keys. Handles get separate transient identities for
curve, segment endpoints and control index. A handle click opens a handle
selection and Ctrl/Cmd+A expands it first on its component, then across
live Bézier curves. Frame uses the active handle points while Auto Frame
keeps its existing scope. Shared keys remain the only values passed to
key-specific commands. The existing one-handle edit remains atomic.
Keep the special Deform progress target, multi-handle edit and handle
marquee tracked as later work. Right-click and modified left click on a
visibility control use its existing row scope. The primary toggle keeps
the accepted FBones behavior while exact Spine isolation remains open.

### Graph handle marquee gate

Exact retained Linux 4.3.26 REA
`ev_bd6b352306d2968d9ec0a7317d97110f9aa2809243cae5055af500ad6f23af82`
joins the stock screenshot, GUI ledger and 24 fps export. A narrow box
contains the separate outgoing Scale X and Scale Y handle centers at the
same 7.5-frame time and different heights, excluding the other measured
handles and known key centers. The ledger does not contain a marquee or
Frame gesture. Private `rea-spine-graph-handle-marquee-retained.json` retains
the exact geometry and scope.

The publisher guide documents selecting a handle first, then Ctrl/Cmd-drag
to box handles, including when starting over a key or handle. It documents
Frame for the active selection. The FBones policy adds only the centers of
the real rendered Bézier handles in the originating Graph pane, preserving
the previous handle context and keeping native key selection distinct.
Use a transient rectangle, restore the prior selection on cancellation,
and preserve modifier taps, native data, history, Current and Dopesheet
selection source. Deform progress, stored and repeated curves stay outside
the handle set. Exact modifier overlap and grouped editing remain open.
[Graph guide](https://esotericsoftware.com/spine-graph#Box-selection)

Grouped production UI on host `179b666efcea` verifies an ordinary key
marquee first, then a scrolled stacked Graph handle rectangle. The gesture
adds rendered X/Y handles, excludes unrelated marks, supports key and
handle origins, rolls back on Escape and feeds Frame. It preserves the
Dopesheet source, Current and the exact native project snapshot with zero
authored native IPC. The focused production group also passes the existing
timing, stacked, key selection and Graph tools cases.

The current publisher guide also documents dragging selected handles. The
publisher's historical 4.1.08-beta demonstration describes moving the
active handle and matching the curve shape across selected peers with
different frame and value spans. Two unequal spans distinguish shape
transfer from a shared display-pixel delta. Exact 4.3.26 group movement,
clamping and modifier behavior remain unmeasured. Keep this separate from
the marquee. [Current drag guide](https://esotericsoftware.com/spine-graph#Manipulating-keys) ·
[Historical developer demonstration](https://esotericsoftware.com/forum/d/16636-spine-version-4-animation-graphs-are-a-nightmare/7)

REA `ev_e910e338822b542fa33f898d1f6789b0b47eb2d03e69f020838c366d23a5baf7`
finds a discriminating pair in the exact retained stock export. The
Translate X intervals f6–f12 and f18–f24 have value spans −25 and −19,
with both outgoing controls initially at normalized `(0.25, 0.20)`.
Moving the first handle's value from 12 to 14.5 predicts the peer at 29.1
under shape matching or at 29.7 under a shared value delta. This is a
counterfactual comparison on exact authored input, without a stock drag.

### Grouped Bézier handle drag gate

The exact Linux DATA and UI audits pair visible control centers in the
retained Graph capture with the authored segment times and scalar controls.
REA `ev_47c55bd0f3356665ede7d0de4578b41f78d16b8a7cf9980d118b10ad73797683`
reads the same stock export and finds 14 root scalar Bézier spans with
distinct endpoint values. It adds an opposite-side discriminator.
REA `ev_0f8d81b2c0ed1eca800e62c2e3711059114cae8dba6d60880803ef7c8ddceb51`
pins a separate exact stock Rotate export with 6- and 9-frame spans. A
prospective leader move from f15 to f17 projects the peer time to f3⅓
under duration normalization and f4 under shared time displacement.
These are authored inputs and derived predictions. Current documentation
establishes the gesture, and a historical developer demonstration describes
matching curve shape across differing times and values. [Current Graph guide](https://esotericsoftware.com/spine-graph#Manipulating-keys) ·
[Historical developer demonstration](https://en.esotericsoftware.com/forum/d/16636-spine-version-4-animation-graphs-are-a-nightmare)

FBones policy for multi-selection: bare drag of an already selected live
handle moves it in the current Graph projection. Peers copy the corresponding
side of the source segment's resulting shape, expressed as fractions of
segment duration and signed endpoint value difference. Only explicitly
selected controls are candidates. Equal-endpoint and collapsed value lanes
keep peer ordinates when vertical transfer is undefined. Time can still
transfer. A single unselected handle retains its standard drag. Preserve
the existing selection gestures and keep Current and Dopesheet independent.
Preview uses frozen identities and one grouped commit checks the complete
f32 result against native bounds. Cancellation and invalid candidates keep
the authored data intact. Deform progress and exact stock matching, opposing
side behavior, clamping and modifier modes remain open.

The grouped edit merges changes to both sides and components in each native
owner key. It preserves the immediate existing successor, key values and
untouched controls. Numerically equal controls keep their existing f32 words.
New zero values in light RGBA use positive zero, consistent with Graph presets.
Changed bone, light RGBA, IK, Transform and Physics keys use one native batch.

The real-session Graph case changes Translate X, both selected Translate Y
sides and a light-RGBA control across unequal segment durations. It compares
the visible centers with absolute normalized shape transfer, rejects both
shared and relative normalized deltas, and checks the exact two-owner native
payload. The source opposite control and unrelated keys retain their data.
Pointer cancellation restores the preview and selection with no native edit.
One commit and one Undo/Redo preserve the Current frame. The grouped round
passed 18 production-CSP UI cases. A single-handle release regression found
by the compiled Vue harness was corrected. The corrected production build
passed the three affected real-session cases and 516 JavaScript tests, with
one existing skip. Private `graph-grouped-tangents-2026-11-19-9c5d2C/`
retains both rounds on host `179b666efcea`.
[Grouped Graph case](../../tests/e2e/graph-selection.native.spec.ts)

For a separate Deform follow-up, REA `ev_ed4be5d8f917d350c121391916fcfc6b7317198db4bb22a7d4b9c600796404e5`
checks 16 exact Linux reference exports with no Deform timeline. The joined
Graph capture shows only root bone channels. It cannot establish whether the
stock Graph combines Deform progress and ordinary handle selection.

### Rotate Delete tangent gate

For the pending Separate and Automatic actions, REA
`ev_605a8274ca0bc7a5d336bf3b6c8848bcb152148668b6d9fac09b2167e389e314`
joins the exact Linux Rotate Delete and restored exports. Deleting f12
reconstructs the incoming handle at f18 with slope −118.39998 units/s.
The unchanged outgoing handle has slope −118.4 units/s. The root export
records numeric Bézier control arrays with no explicit mode fields. This
confirms tangent continuity in that Delete case. The Separate and Automatic
actions and their project metadata remain unmeasured.

The owned replay uses Rotate keys at f0=7, f6=29, f12=−13, f18=48 and
f24=11. The f12 key is Stepped. The f6 and f18 outgoing control tuples
are `(7.5, 20.6, 10.5, −4.6)` and `(19.5, 40.6, 22.5, 18.4)`.
After removing f12, the stock f6 tuple retains its first pair and its
second pair becomes approximately `(14.148648, 67)` in frame/value units.
The key-removal replay can use the existing native Session and compare
the survivors and adjacent controls by key ID.

REA `ev_80bee72c2a7d05804e98c4bca240cb2467d1a062e61858592574dd83738ee86d`
pins the Delete and both Swap exports with the historical interaction ledger.
The returned ordinate 67 is 19 units above the right key, and the right and
left surviving values differ by 19. Extending the surviving right tangent
back to that ordinate predicts 0.589527027 s, which rounds to the emitted
0.589527 s. Fixed time arms of a quarter or a third of the new span and
mirroring the outgoing time arm produce distinct results. The second Swap
has identical bytes to the first Delete export and supplies no independent
Delete observation. Private `rea-spine-graph-delete-splice-length-retained.json`
retains the calculation and inputs.

REA `ev_4ad9f6250708013defab20f091a1f1ddb7c1e344796a98feb43ea70ab1b7dfea`
solves the exported cubic time at Current f12, or 0.5 seconds at 24 FPS.
The parameter is 0.562204478497 and the derived stored Rotate value is
45.435674857114°. The stock fixture's 23° Setup rotation projects it to
68.435674857114° on the local Graph. This gives an independent analytic
comparison with the exported controls. The rendered stock pose is unmeasured.

Paired DATA and UI audits retain the existing shared Delete command. The
stock Dopesheet shows only the chosen Rotate key removed, with Current at 12.
Graph shows the joined curve alongside the stored comparison. FBones repairs
an isolated interior Stepped Rotate deletion between Bézier owners when the
predecessor, successor and its next key survive at strictly ordered frames.
Use the successor's outgoing tangent direction and the absolute surviving
endpoint value difference for the incoming vertical extent. Validate the
final f32 controls, including nonzero tangent and native monotone time. Only
the predecessor's second control pair can change. The existing neighbor
guard stays authoritative for other unsupported edits. The length rule is
an FBones policy matching the measured case. Exact behavior for other
interpolations, families, zero slopes and adjacent deletions remains open.

The owned Session rebuilds the incoming pair to f32 `(14.1486492, 67)` and
samples f12 within 0.0005° of the derived stock value. The original first
control, the successor's outgoing tuple, surviving IDs, other tracks and
Setup remain exact. Stale revisions and a mixed request with an unsupported
Translate neighbor change both preserve the full before state. One Undo and
Redo, independent typed decode, Save As and reopen pass. The first test run
found a missing directory in the owned Save As fixture. The corrected full
desktop suite passes 410 cases with two existing ignored.

The production-CSP Dopesheet case uses the existing Delete key with Current
at f12. It checks the addressed native request, the surviving Translate
mark at f12, the joined Graph handle and the unchanged Store snapshot after
Delete, Undo and Redo. All 21 focused browser cases and E2E typecheck pass on
fresh host `fdfa1d370473` and the unchanged, pinned web build. Private
`graph-delete-tangent-grouped-2026-11-19-lRUhKt/` retains both native rounds,
the UI report and build pins. [Dopesheet and Graph regression](../../tests/e2e/graph-tools.native.spec.ts)

### Ordinary Bone key insertion reference

REA `ev_f653e51740465e009be55aed8e474097fe8c545e3f2109b7bf19910204b68aea`
classifies the retained exact Linux reference set. Its 16 exports cover the
baseline, Delete and Swap, Offset and Shift. The f12 Rotate record returns
through Swap with the original Stepped curve and file bytes. The current
guide documents preserving curve shape when inserting a key in a Bézier
segment. Exact 4.3.26 subdivision and rounding remain unobserved. [Graph New keys](https://esotericsoftware.com/spine-graph#New-keys)

REA `ev_145afa404937513d1e9ecc6e8f023f210c8a9cf060bbe368352d4b8ac35f5a4b`
computes the two subdivisions of the retained stock Rotate f6–f18 curve at
f12 from exact export coordinates. Solving for time gives parameter
0.562204478497 and value 45.435674857114°. A fixed parameter of 0.5 lands
at f11.118243 with value 42.475°, and linear interpolation at f12 yields
38.5°. Analytic checks at f9 and f15 recover the source curve, with equal
slopes at the insert. The receipt establishes a numerical discriminator
from exact authored inputs. Stock insertion remains unobserved.

Paired DATA and UI audits point to `insertAnimationKeys` for row Key,
viewport Key and the clean K fallback. Dirty K builds its own addressed
Bone batch. Both routes use the same interior planner. Existing f32 frame
matches, empty tracks and ordinary linear or exterior insertions keep the
current upsert. In a strict Bézier interior, Key Shown math generates new
controls with the predecessor's stable ID. Clean lanes keep the sampled
stored-relative ordinate. A draft change moves the two adjoining ordinate
controls by its local delta. Strict Stepped interiors keep the hold by using
Stepped for the new key. Send one revision-bound native edit and consume
only the committed draft channels. Current and unrelated drafts stay intact.
The existing split Translate X case at f11 exercises the previous neighbor
guard. Viewport Auto Key retains its frozen-pose contract. Exact stock
rounding and that separate leased route remain open.

The native browser case now keys split Translate X at f11 in the f0–f12
Bézier. It verifies the predecessor identity and signed-zero fields, the
two computed segments, unchanged Y, and a single Undo. The viewport Key
case at Rotate f18 inserts the analytical sample 32.5 and keeps the visible
Translate draft. From a fresh draft, K inserts 37.5 and moves only the two
adjacent ordinate controls by +5. Both use one addressed native edit and
hold Current at f18. The domain regression checks the asymmetric stock-derived
fixture, mixed fractional-frame drafts and strict Stepped hold preservation.
[Row Key test](../../tests/e2e/animation-split.native.spec.ts) ·
[Viewport Key and K test](../../tests/e2e/graph-tools.native.spec.ts)

Production web, E2E typecheck and all 21 focused real-session browser
cases pass on retained host `fdfa1d370473`. The JavaScript suite passes
520 with one existing skip after updating two prior expectations to include
the predecessor record. Private `graph-ordinary-bone-key-grouped-2026-11-19-PLjCoS/`
retains the logs and production bundle hashes. Exact-frame upserts in Rotate
and combined channels can still lose a stored negative-zero value during
Setup subtraction.

### Auto Key interior follow-up

The exact Linux Auto Key control is visible in REA
`ev_f5bd9d4ed3f792a85dd01c15bcb59950e3880a1b4686575bd573d9bb89d82a5d`.
Its joined exports cover Delete and Swap. The retained exact Linux set has
no before/after transform Auto Key action inside a Bézier segment. The
ordinary-key split math establishes expected analytic geometry for FBones.

REA `ev_0d8241d18e04768a1acc4469b54195a7e0b92341059703e4ab86d59b8c29dac4`
inverts time in the exact retained combined Translate f6–f12 export. At f11,
an analytic X-only +2.5 changes X from −4.19130146 to −1.69130146. The
unchanged Y lane keeps 13.02347942 and the same samples on either side of
the subdivision. The adjoining X controls preserve equal slopes after the
ordinate shift. The retained combined records show matching X and Y time
controls. The FBones fixture exercises its supported independent axis times.

The reproducible FBones viewport case is the real Translate drag at f15 in
`animation.native.spec.ts`. Use a Bézier predecessor and retain the native
pose epoch and stale-gesture assertions. The external authorization remains
scoped to the captured Current. Any predecessor rewrite for this intent
must be derived from native authored data after that check and published with
the new key in one edit. A numeric field Auto Key at Current exercises the
existing unleased authoring path. [Viewport gesture test](../../tests/e2e/animation.native.spec.ts)

Paired DATA/UI audits retain the shared `edit_rig` and `setAnimationKeys`
route with an explicit desktop Auto Key intent carrying source and edited
lane masks. Inputs address Current only. Viewport mode requires the existing
frozen-pose epoch and verifies the exact Current before deriving predecessor
changes from native authored data. Numeric mode uses the revision check and
guards its captured UI context across the edit queue. Native derives controls
and clean lane values for both. It retains an existing key's interpolation and
rightmost identity and handles new interior Bézier and Stepped positions.
One native transaction publishes all resulting keys. The existing combined
channel behavior includes real sibling drafts in the authored row and retains
drafts on other channels. Stock Auto Key interaction and rounding remain open.

The first FBones viewport replay showed a separate rendering issue in the
held gesture. With no constraints, the controller used authored positions
with cached world matrices from pointer-down. The renderer read the cached
matrices. An Animate gesture uses the existing local pose preview evaluator
to publish the edited world matrices. The original frozen pose still
authorizes release, and the project stays untouched during pointer movement.

The owned Scene regression checks both intent modes and the rebuilt native
control words, including stored signed zero and a clean lane supplied with
an unrelated placeholder. Wrong mode, stale epoch or revision, wrong frame
or clip, cross-frame payloads, invalid masks and unrelated edit commands
all preserve the prior Session. One commit and one Undo/Redo pass. The full
Scene suite passes 411 with two existing ignored, and the Legacy check passes.

The production viewport test shows the bone move from X50 to X75 while
the pointer is held, with no native edit and the exact original snapshot.
Release sends only the f15 row with its captured epoch. The native snapshot
contains the joined Bézier halves, exact unaffected data and the new Current
key. A later frame change cancels the next input. The numeric test uses the
same curve at f15 through the unleased field route and preserves the clean Y
shape. Private `graph-auto-key-interior-grouped-2026-11-19-9LoL4P/` retains
the initial browser diagnostic failure and the corrected production proof.

### Light RGBA keying follow-up

REA `ev_5e323adc5ee6e4ce8526e8ca2f189bf38a8967eb15677c3179961c72b61fe184`
examines 19 retained exact Linux 4.3.26 exports. The animation groups have
bone or event timelines. The retained set has no light RGBA or constraint
curve edit. The current Light RGBA property Key and Auto Key submit a single
new linear row at an interior frame, where native protects the existing
Bézier owner's successor.

Use the real slot color controls and an owned light RGBA f0–f24 curve.
R endpoints .125 and .625 with controls `(8,.25,16,.5)` sample to .375
at f12. The analytic split gives R controls `(4,.1875,8,.28125)` and
`(16,.46875,20,.5625)`. Auto Key with R=.5 moves the adjoining ordinates
to .40625 and .59375. Verify one native edit, clean G/B/A shape and Current,
including the RGBA handle bounds and signed-zero authoring rules.
[Slot color regression fixture](../../tests/e2e/slot-animation.native.spec.ts)

The retained exact Linux Graph capture `ev_f5bd9d4ed3f792a85dd01c15bcb59950e3880a1b4686575bd573d9bb89d82a5d`
shows the general Animate Auto Key control on a fixture without slots.
The publisher's color capture shows a Key control beside the color swatch.
Its exact release is unknown. The slot-specific retained captures cover Setup.
The paired audits found no exact Linux recording of a light RGBA insertion.
[Slot color UI provenance](ANIMATION-SLOT-UI-4.3.26.md)

The FBones row and inspector Key controls and the numeric, RGB swatch and
opacity Auto Key routes share the light RGBA planner. Preserve clean curve
shape, offset only the adjoining handles on an edited lane, and continue a
Stepped hold. The native row payload uses the predecessor's existing ID and
one new Current key. Validate the native f32 bounds of both time control
pairs and the [0,1] authored color range. Reject a candidate that cannot be
represented in this profile. Keep the active Tint Black linear policy and
the existing attachment, shade and draft lifecycles.

The optional `negativeZeroIndices` carrier covers four light values followed
by sixteen row-major light control fields. A supplied list sets the exact
zero signs for the complete light row. An empty list selects positive zeros.
An omitted list retains the native addressed equality policy. Validate each
index against a distinct present numeric zero. The shared RGBA input applies
to both standalone and mixed edits. Use explicit lists for computed rows and
keep the dark-bit guard where no carrier exists.

The real Dopesheet Color Key and numeric R Auto Key cases insert at f12 in
one `setAnimationSlotKeys` request apiece. Both check exact per-axis f32
controls, G signed zero, stable neighboring IDs and untouched Setup, slot
and attachment data. Undo/Redo and portable Save/Close/Open preserve the
result. The native tests verify explicit mask precedence over stored zero
signs, omitted and null fallback, complete raw portable words, and atomic
rejection of invalid masks in standalone and mixed batches. The Scene suite
passes 413 with two existing ignored. All 24 focused production-CSP UI
cases, production and E2E typecheck, and 524 JavaScript tests with one
existing skip pass. The generated MCP schemas describe the optional field.
Private `graph-light-rgba-key-grouped-2026-11-19-pDmhl7/` retains the pins
and reports. Stock insertion and rounding remain unmeasured.

### Constraint interior Key gate

REA `ev_5e323adc5ee6e4ce8526e8ca2f189bf38a8967eb15677c3179961c72b61fe184`
examines exact Linux 4.3.26 exports without animated constraint rows. Two
owned gravity projects have Physics in Setup with only bone animations.
The exact general Auto Key HUD capture is on a bone-only fixture. Older
constraint artifacts establish stored IK Mix/Softness and flags, six
Transform mixes and seven Physics scalar properties. Their originating
platform and Setup-only inspector captures limit the Animate conclusions.
[Constraint UI and data provenance](ANIMATION-CONSTRAINT-EVENT-UI-4.3.26.md)

Paired DATA/UI audits locate the existing shared property Key and Auto Key
paths. FBones stages the addressed predecessor and Current in one command
for a strict interior Bézier. Clean numeric lanes keep the analytic sample
and edited lanes translate the two adjoining ordinates. IK flags retain
the predecessor's authored values and use the actual desired held flags at
Current. Exact-frame edits address the rightmost authored key and preserve
its interpolation. Stepped interiors retain the hold. Keep Physics Reset
as a discrete command, the existing per-property scope and grouped writes
atomic. Send the existing signed-bit carrier for native values and controls.
Check each new control time against its native segment and authored values
against the family range. Stock insertion, modes and rounding remain open.

The production browser fixture stages IK Mix and a discrete bend change
in its working pose and confirms them with the existing inspector Key.
Numeric Transform Rotate Mix and Physics Gravity each use the same path
through Auto Key. All three preserve stable neighbors and untouched tracks
in one revision-bound native edit apiece. The Transform case carries clean
signed-zero words, and the Physics case retains Wind and Reset. Current,
Setup, Undo/Redo and typed portable Save/Close/Open pass. The domain checks
cover rightmost f32 matching, Stepped Mass and a split that exceeds native
handle ranges. Production web, E2E typecheck, 528 JavaScript tests with one
existing skip, and 19 real-session CSP cases pass on unchanged host
`1abc54d80b14`. Private `graph-constraint-interior-key-grouped-2026-11-19-ISUAXx/`
retains the pins and reports. [Constraint regression](../../tests/e2e/animation-constraints-events.native.spec.ts)

### Deform Key interior follow-up

Exact Linux REA `ev_ed4be5d8f917d350c121391916fcfc6b7317198db4bb22a7d4b9c600796404e5`
found no Deform timeline in the retained Graph exports. The exact historical
format data establishes a single scalar progress curve per attachment and
its dense offsets. Direct Linux stock insertion remains unmeasured.

The existing viewport and Timeline Deform Key controls submit one Current
row. A strict interior Bézier requires an addressed predecessor update to
pass the native neighbor guard. Use the owned four-corner weighted Mesh
fixture with f0–f24 progress controls `(8,.25,16,.75)` and a clean f12
insertion. Splitting and normalizing each progress interval gives left
`(4,.25,8,.625)` and right `(16,.375,20,.75)`. Check that the dense midpoint,
f6 and f18 trajectories, selection and untouched binding data remain exact
for this fixture. Confirm one native edit and one Undo. The viewport world
vertex Auto Key path also needs its existing frozen pose authorization.
[Deform regression fixture](../../tests/e2e/animation-geometry.native.spec.ts)

The paired DATA and UI audit resolves the explicit viewport, inspector,
selection and Timeline row Key controls to the same attachment command.
REA analytic replay `ev_70e39a92f32f87c8aafc997e35c278c4a0b056e46ca9ab3dc2064d6d331150d5`
uses the historical Windows 4.3.26 CLI export (project `9b7f4c7e`, export
`a45ee4a5`). It confirms that re-normalizing the progress of each child
preserves the dense path in the sampled weighted and unweighted vectors.
The replay is a calculation on exported data. Original Linux insertion
and exact editor rounding are still open.

FBones splits the authored scalar curve in f64 at the stored f32 Current and
rounds the result for storage. A same-frame draft replaces only edited
coordinates. The edited coordinates join the requested value using the child
progress curves. Overshoot remains supported within native bounds. A child
whose clean coordinates are all constant can fall back to Linear if its old
progress cannot be re-normalized. A varying clean coordinate rejects if its
stored midpoint collapses to an endpoint. Extreme overshoot can amplify
storage rounding and has no measured general error bound. Exact stored keys
and the predecessor retain identity, presence and supported signed words.
The native command takes one revision and publishes one undoable edit.

The production-CSP browser run used the viewport button for a clean Mesh Key
and the Timeline row for a same-frame numeric draft. The dense f12 vector and
child controls match the fixture. Native world coordinates at f6/f12/f18
follow the expected clean/edited curves. Selection, Setup bindings, one
Undo/Redo and portable reopen pass. Editing a sibling Clipping Graph control
preserves the stored signed zero. Standalone and mixed desktop edits carry
the supported signs and native Session rejects inconsistent words atomically.
The grouped run passed 30 browser cases, 532 JavaScript tests with one
existing skip, and 413 native Scene tests with two existing ignored.

### World vertex Deform Auto Key follow-up

Accepted REA inventory `ev_f653e51740465e009be55aed8e474097fe8c545e3f2109b7bf19910204b68aea`
classifies the retained Linux Graph exports as baseline, Delete/Swap, Offset
and Shift. The Auto Key HUD is visible in the Delete/Swap sequence
(`ev_f5bd9d4ed3f792a85dd01c15bcb59950e3880a1b4686575bd573d9bb89d82a5d`).
The Translate analysis `ev_0d8241d18e04768a1acc4469b54195a7e0b92341059703e4ab86d59b8c29dac4`
does not observe Auto Key. Exact original Deform Auto Key remains open.

Mesh and Clipping pointer gestures and Vertex X/Y fields already converge on
the world-target command that requires the native frozen pose. The next
fixture is the weighted f0–f24 Mesh from ordinary Key with Auto Key on at
f12. Verify the frozen epoch, visible scratch preview without a native write,
one commit on release, dense offsets and child controls, and stale rejection.
Use the certified current frame for curve neighbors. The Session derives any
earlier predecessor edit from its own authoritative track after authorizing
the world action. External raw requests retain the existing exact-current
epoch validation. Numeric fields acquire their own lease and keep the same
Current and selection on commit.

The paired audit resolved pointer vertex, soft selection, whole-attachment
and numeric Vertex X/Y actions to the frozen world-target command. FBones
solves the world targets from the frozen working pose, including any prior
draft, then compares the solved lanes with the native authored sample at
the exact cached time as f32 numeric values. An exact draft cancellation
is clean. Clean coordinates use the analytic sample at certified f32 Current
and keep equal authored signed-zero words. The native solver and explicit
interpolation override behavior are retained. Pending exact Linux evidence,
ordinary world Auto Key uses the same subdivision rules as explicit Key
for an interior Bézier and the same hold for Stepped.

The real f12 Mesh drag changed the raster preview before release while the
native revision stayed fixed. That drag and the numeric Clipping edit sent
one world-target request each with the certified epoch. The f6/f12/f18
projections, dense key offsets, stable endpoints, Setup, selection, one
Undo/Redo and portable reopen pass. A separate f64 frame near f12 proves a
clean nonzero frozen sample becomes exact zero at stored f32 Current. A typed
bridge check at 7 FPS proves the outgoing frame rounds from the native
seconds even when rounding the UI frame would produce the neighboring word.
Stale epochs, wrong targets and earlier external rows fail atomically.

The grouped checks passed production web and E2E typecheck, 32 real-session
CSP cases, 533 JavaScript tests with one existing skip, and 414 native Scene
tests with two existing ignored.

### Independent Curves view gate

REA MCP `capture_process_scenario`
`ev_fa4e8f931ed0b67467b782d5b217a969302da373959f3ff72836549519b7f1bc`
identifies the titled Curves dock at `[1834,638,2110,664]` in the supplied
wide `animare/` image. It sits above Preview with Dopesheet active.
Its own graph and sidebar occupy separate regions. The supplied image has
no version stamp. The retained exact Linux comparison shows the inline
Graph surface. Private receipt `rea-spine-separate-curves-view.json`.

The vendor's 4.3.18 release notes establish that Curves was already an
independent view in that release line. July 4.3 staff explanations specify
the selected segment's normalized end-to-end value difference, the
equal-endpoint Bézier blank state and the use of Curves presets while
selecting in Dopesheet. Active Curves interactions in 4.3.26 Linux remain
unobserved. The April 2026 .65-beta and .73-beta entries document last-key
fallback and moving presets out of the view menu in that beta series.
The .26 stable entry is dated September 7. The beta notes corroborate
the feature history while exact stable control placement remains open.
[Changelog](https://esotericsoftware.com/spine-changelog),
[Curves normalization](https://esotericsoftware.com/forum/d/30488-4243--43-curves-view-goes-blank-on-click--bezier-handles-cannot-be-edited/3),
[Curves presets](https://esotericsoftware.com/forum/d/30431-43-curves-feature-request)

The next FBones slice can add Curves through the existing Animate dock host
and observe the timeline's authored selection. Migrate stored layouts by
inserting the new dock without changing existing placements. Project the
outgoing segment to normalized time and value with separate handling for
flat spans and reuse the native curve edit commands for supported controls.
Keep the same active clip and key IDs across Graph and Dopesheet.
Use the signed value span for normalization, including decreasing curves.
Equal-valued Bézier lanes keep their original controls for the Graph view.
The dock can receive an immutable document, revision, animation and
endpoint pair from the timeline. Reject a gesture when the selection changes
or its dock closes. One accepted handle edit uses the existing native path.

REA MCP `capture_process_scenario`
`ev_6e3463a8afb9c62673a05679f5fa46aec6ebe1d2aee3df31c01e468a4b43aceb`
joined the retained exact stock 4.3.26 Offset baseline and its export.
Rotate frames 15→24 have values 70→40 and controls at `(0.53 s,97)`
and `(0.76 s,72)`. The signed normalized coordinates are approximately
`(.1,-.9)` and `(.8667,-.0667)`. Those are derived from the stock
authored data. The hypothetical equal-endpoint twin has a zero value span
even with an excursion. Private receipt
`rea-spine-curves-signed-span-reference.json` retains provenance and limits.
Exact Curves raster projection for either sample remains unobserved.

For extending the dock beyond bones, REA
`ev_2fb74c0ff31cd4bc59efa2de05ee09241e336d23aec2943391e8f7a8372bba76`
joined the exact Linux Offset export to its receipt and confirmed its
bone-only scope. Older retained exact 4.3.26 RGBA storage evidence provides
four component-wise endpoint and handle sets, including a G span of about
`-.4392` and derived control pairs near `(.25,.3)` and `(.75,.7)`.
This historical data can seed a regression, while Linux Curves input and
per-lane projection remain open. Private receipt
`rea-spine-curves-nonbone-slot-span-gate.json`.

REA MCP `capture_process_scenario`
`ev_8280ec0951abdcd4b74a7096bd27c69ec32a898f2c5d81cfd305622ac6102143`
joined the historical Windows stock 4.3.26 IK fixture, export, input
receipt and typed handle sidecar. At 24 fps, frames 6→12 share one IK owner.
Mix moves from .81 to .34, with controls .67 and .49. Softness moves from
8.25 to 3.75, with controls 7 and 4.75. The outgoing and incoming controls
are at frames 7.5 and 10.5 respectively. Frame 12 keeps its incoming handles
with a Stepped outgoing segment. The flags have no handle lanes. Existing
Linux sources had no qualifying new nonbone producer. Private receipt
`rea-spine-curves-ik-control-ownership.json`. Active Curves input and numeric
limits in stock Linux remain open.

FBones extends the same signed normalization to light RGBA, IK, Transform
mixes and scalar Physics. The existing native authoring profile limits both
handle times to the interval and permits finite control ordinates within
±1,000,000. RGBA endpoints and IK/Physics values retain their separate
constraints. Two-color remains Linear in the current binary profile and
all seven lanes can be inspected. Existing slot endpoint bits and unchanged
Bézier control bits are retained during addressed edits. Presets reuse the
Graph control math and commit the selected key in one native transaction.

#### Terminal keys and multiple segments

REA MCP `capture_process_scenario`
`ev_99c85109cfe11194837a5f898a48aac160a1b8aaa4486d83213a81e1c1d00a06`
joined the exact Linux 4.3.26 stock Offset fixture, export and retained
Dopesheet capture. The Rotate key at frame 24 exports both Bézier controls
for the 24→30 segment. Frame 30 has a value and no outgoing curve field.
The image shows selection at frame 24. It establishes the stored owner
of the terminal segment and the selected nonterminal key in that capture.
Active terminal selection and overlays in the original Curves remain
unobserved. Private receipt `rea-spine-curves-terminal-selection-gate.json`.

The 4.3.24 stable release notes restrict the fallback to the previous
curve to one selected key. The earlier beta note names Curves display
and interpolation buttons explicitly. Applying the stable rule to
4.3.26 is supported by release history. [4.3.24 stable notes](https://esotericsoftware.com/spine-changelog#4.3.24)

FBones overlays the eligible normalized segments and exposes a focus
selector with authoring object, property and range. A lone terminal key
reveals its preceding segment and Flat flattens the incoming endpoint.
Multiple selected keys contribute outgoing segments in visible track
order with each native owner included once. Interpolation and presets
edit eligible segments in one native history action. Handle edits
target the focused segment and cancel when the scope changes. Focus
selection, overlay styling and the handling of mixed lane families
are FBones design decisions.

REA MCP `capture_process_scenario`
`ev_fb698792d3dc9627b90ca9ce3dbad8388601761b39aa0ebd74afe74c66f4ad5f`
also locates three dim buttons beneath the empty preset sidebar in the
supplied wide image. The marks show a curve with a plus, with circular
arrows, and with a circular removal mark. This unversioned image supports
the presence of three controls. Their names, activation and effects in
4.3.26 remain open. Private receipt
`rea-spine-curves-preset-management-controls.json`.

#### Named Curves presets

REA MCP `capture_process_scenario`
`ev_a49207fbf8c757a5abe51c249f94dd88d1cdb182993e4380e932074656d741c7`
checked the reviewed zero-input Linux 4.3.26 run and its launcher
configuration. The run proves ownership of the disposable project and
display. It inherits the editor settings environment and provides no
separate owned preset file. The exact original preset schema, lifetime
and controls' effects remain open. Private receipt
`rea-spine-curves-preset-settings-ownership-gate.json`.

The vendor's 4.3.73 beta notes place presets outside the Curves menu.
The 4.3 staff discussion describes applying Curves presets while working
in the Dopesheet. Earlier vendor material records named shapes saved in
user settings across projects. The historical description is context
for the library and does not establish exact 4.3.26 labels or storage.
[4.3.73 notes](https://esotericsoftware.com/spine-changelog#4.3.73-beta),
[4.3 staff discussion](https://esotericsoftware.com/forum/d/30431-43-curves-feature-request),
[Historical Curves description](https://esotericsoftware.com/blog/Spine-4-1-released#Curves-view)

FBones uses a versioned local preferences library and distinct Save,
Replace and Remove actions. Selecting a named shape prepares it for
explicit Apply. Capturing the focused Bézier lane records the two
normalized time and progress pairs. The apply action maps those pairs
to each eligible lane using the signed value span and the destination
duration. Equal-valued Bézier lanes keep their existing controls.
Unsupported extended times or magnitudes reject the mixed batch
before native authoring, without clipping the saved shape. The
library and its edits are independent of the project and history.
Native Session records a single Undo for an accepted application.

REA MCP `capture_process_scenario`
`ev_c4f4ecad59b3a8f30bb5f86f0c484a7d54c449c04ffcb80ebb533f698b1ad758`
checked the named stages of the exact retained Swap and Offset receipts.
Neither is a labeled Automatic or Separate tangent sample. Graph Auto
controls framing. A source for mode encoding needs a labeled tangent
state joined to the authored delta. Private receipt
`rea-spine-curves-named-tangent-mode-gate.json`.

## Reference and implementation gate

The dedicated REA MCP audit authenticated the supplied Graph screenshot. It
shows Frame, selected Auto, Store, a heart and a dim unnamed icon. The image
has no version marker. The retained exact Spine Professional 4.3.26 GUI
captures show Setup. CLI curve exports prove key data. The open Graph panel and
these gestures remain unobserved in the exact editor. The private source
manifest is `rea-spine-graph-tools.json`.
[Animate screenshot audit](ANIMATION-UI-4.3.26.md), [exact GUI observations](FEATURE-UI-4.3.26.md#controlled-exact-version-original-gui-observations)

The primary Graph guide describes Frame for a selection or all visible curves,
Auto following visible curves, and Store as a background snapshot toggled off
on a second click. Swap exchanges current and stored keys and handles. The
existing native batch upserts keys and preserves identified frames. Arbitrary
Swap also needs atomic insertion, deletion, retiming, working-draft retention
and raw key-bit preservation. The initial framing delivery kept Swap visibly unavailable.
[Spine Graph navigation](https://en.esotericsoftware.com/spine-graph#Frame), [Store and Swap](https://en.esotericsoftware.com/spine-graph#Store)

FBones uses the existing Graph shelf and muted panel tokens. Frame and Auto
operate on the presentation camera. Store snapshots committed graph data for
the current document and animation and displays a subdued comparison through
the ordinary curve projection. The first delivery left Favor, presets and Swap planned.

## FBones behavior and verification

Frame uses selected visible keys and their drawn handles, or all visible curves
when there is no plotted selection. It fits time and value together. Auto fits
the visible curves when their bounds or the plot width change. Manual zoom and
panning remain available. Graph retains its own horizontal zoom and scroll
position. The time ruler, playhead, key marks and curve drawing share the same
time projection. The fit helper supports long timelines and a bounded plot.

Store copies the committed displayable keys and their handles before row
filtering. The dashed reference follows the visible row or selected Deform
segment and has no pointer targets. A second press clears it. The comparison is
scoped to its animation within the current logical document, and storing a
different animation replaces the comparison. The reference and the framing
controls stay outside authored state.

The independent fixture exercises a 240-frame span, selected-key framing on
both axes, Auto on resize, Dopesheet zoom retention, Store and clear, and hiding
and restoring the same comparison across clip switches. The one explicit key
edit changes the live path while the stored path stays fixed. All other
actions preserve the Rust Session snapshot. The first test predicate measured
the left edge of the six-pixel key at frame zero. The corrected test follows
the key center at the fixed origin and retains the initial screenshot and log.

Five focused cases and seven direct checks passed. The direct checks cover a
million-frame fit, a far single-key fit under the plot-width bound, the value
hull of crossed handles, 135,000 streamed keys and a detached signed-zero
snapshot. REA decoded the final product trace separately from the reference
artifact. The raw receipts and current screenshot are under
`.local/research/graph-tools-2026-11-18/`.

The production-CSP Chromium suite passed all 135 listed cases in disjoint
68-case and 67-case shards. The JavaScript suite passed 464 with one existing
skip. REA paired 244 trace actions and found 22 successful local responses
and no console events in the focused FBones trace. The final Linux
custom-protocol build, SHA-256
`19bee4b6bbf14d2422df3021406ddfb0bf64cb83b0d62bc8ac5ceeda47cbbac0`,
started with WebGL in a visible GTK/X11 window. That handover verifies startup.

## Swap implementation gate

The paired DATA and UI audits reused the exact 4.3.26 CLI key evidence and
the supplied Graph screenshot. The exact-version artifacts do not prove
Swap. The patch-unpinned guide documents exchanging all authored animation
keys and handles. FBones will store the supported clip's typed keys, including
its discrete channels, in the native document session. Swap commits once with
the ordinary encoding and Undo validation. Store and Clear have no history
effect. Undo and Redo restore the live authored clip. The independent
comparison remains at the last Store or successful Swap. A changed dependency
that invalidates the stored addresses or deform binding clears the comparison.
[Fidelity scope and Store](https://en.esotericsoftware.com/spine-graph#Store)


## Native Store, Clear and Swap

The original comparison preflight found a retained owned one-bone
`mixed-curves` fixture and its complete Spine Professional 4.3.26 CLI export.
REA authenticated both artifacts. The Rotate key at 0.5 seconds has value
-13 and Stepped interpolation. It can distinguish deletion from restoration
in a future controlled Graph session. The live Windows metadata check found
no Spine or windowed Java process. The bounded script-file execution probe
failed at the WSL interop connection before the script began. The original
editor did not open in this run. The exact gesture remains open. See the
private `rea-spine-graph-swap-route.json` receipt.

FBones Store captures the current animation's native typed key records and
stable IDs in the active Session. Its stored view is published through the
same summary used by the desktop, Chromium QA host and MCP. Swap replaces the
active clip's complete key inventory, including discrete keys, in one native
transaction. The incoming layout and exact authored values go through the
ordinary encoding check. The outgoing version becomes the background
comparison. Setup and other animations are preserved. When the two authored
versions are equal, no Undo or revision entry is made. Store and Clear also
leave those counters alone.

The comparison can survive temporary clip switches within the same document.
Closing the document clears it. Incompatible identity inventories, referenced
Deform bindings, Sequence settings or color-channel mode clear the stored
selection. Working pose edits remain transient while Swap commits authored
keys, and the playhead stays in place. Undo and Redo restore the authored clip
while the last comparison remains available. The three operations are
discoverable through the generated MCP edit schema.

The final focused Chromium suite passed all three cases. It exercises keyboard
Store and Swap, deletion of the entire live track, two-way restoration,
outgoing dashed curves, one-step Undo/Redo and an Auto Key-off rotation draft
that stays at 17 while the playhead stays at frame 12. The native mixed-profile
tests independently exercise moved, inserted and deleted keys, named clip
identity, exact decoded typed data after Save, and rejection on a stale
revision or incompatible context. The earlier scalar-control regression came
from removing normalization at the Timeline boundary. Its seven compiled
control cases passed after that normalization was restored. The earlier
focused trace with an incorrect singular edit-name assertion is retained.

The final production-CSP browser suite passed 136 distinct cases across two
68-case shards. JavaScript passed 464 with one existing skip. Rust passed 373
with two existing ignored in the desktop suite and 105 in the Scene format
suite. The current Linux handover started with WebGL in a viewable window,
SHA-256 `92fc87161164a364a46f1e934b30a11e1255f985af873f368c32a99bdd3d30a3`.
REA pinned 203 before/after trace pairs and 34 successful requests with no
console events in the final owned case. The private final receipt is
`rea-product-graph-swap-final.json`. The updated SDK acceptance script contains
the three snapshot edits. The official SDK end-to-end script was not rerun for
this slice.


## Exact Graph Swap gesture in the Linux reference

The stock Spine 4.3.26 Professional editor opened a fresh copy of the
previously verified mixed-curves fixture on an authenticated private Xvfb
display. The observer verified the launcher, PID/start time, owned window,
editor version and file identity before input. The original source copy was
unchanged.

Activating the animation displayed the Graph tracks. Store became active and
enabled the adjacent Swap button. In Dopesheet, the selected Rotate key at
frame 12 (0.5 seconds at 24 FPS) was deleted. Translate, Scale and Shear
retained their frame-12 keys. The edited project was saved, then the Graph
Swap action was used and saved. A second Swap was used to test the outgoing
comparison and saved separately. All three disposable states were exported
by the exact Linux CLI.

The deleted Rotate key of -13 and its Stepped interpolation reappeared after
Swap. The prior key's outgoing second Bézier handle changed from
`[0.4375, -4.6]` to `[0.589527, 67]` at deletion and returned exactly to the
baseline value after Swap. The first Swap export matched the entire baseline
JSON byte for byte. The second Swap export matched the deleted version byte
for byte. The Setup bones and unrelated authored tracks matched in all three
states. These results cover the two-way exchange for this authored clip.

REA MCP authenticated the selected original screenshots, three frozen states
and exact CLI output hashes. The private manifest is
`rea-spine-graph-swap-oracle.json` under the Linux reference evidence directory.
The experiment does not measure how the reference handles Undo, nonlinear
bulk edits or all discrete channels.
[Linux reference setup](SPINE-LINUX-4.3.26-2026-11-18.md)

## Independent Curves Deform follow-up

REA MCP `capture_process_scenario`
`ev_eb52fe45769b698d8e59793b98428cc521a0123f768d622fbdac7f420142a43c`
inspected a historical exact Spine 4.3.26 Windows CLI comparison. An owned
weighted Mesh and weighted Clipping retain matching scalar progress
curves and different dense offset vectors. This supports curve ownership.
The exact Linux Graph corpus lacks Deform and the supplied Curves image
has no version stamp. Original independent Deform interactions remain open.

The paired FBones gate projects one progress lane per selected live
attachment segment, with each interval's endpoints at 0 and 1. The lane
remains editable when the dense offsets coincide. Preserve strict key
adjacency and the single-terminal fallback through the existing Curves view.
Dopesheet uses the live selected scope, including collapsed summaries. Graph
uses selected Deform keys of rendered rows, including a terminal key reached
from the inline progress chart. Store comparison contributes no segments.

Address an f0–f24 Mesh segment with controls `[8,.25,16,-0]`, and keep a
same-frame Auto-off vertex draft. A handle step changes the first progress
ordinate while preserving the other control words, dense offsets, presence,
successor and draft. Include compatible interpolation and preset application
with one mixed Undo for shown Deform and Rotate. Preserve selected owner and
reject a stale gesture through existing Curves context guards.

REA MCP `capture_process_scenario`
`ev_cbfff13abe249f08e515b27c61e42c7b5460461f2ec8af447a4a1aeb6d7`
projects a signed normalized shape from an exact Linux Offset Rotate
export onto two authored segments. For Rotate 48°→11° across f18–24 it
predicts controls `(18.6,81.3°)` and `(23.2,50.466667°)`. This is an
analytic preset witness. The original Apply gesture remains unmeasured.

The browser fixture selected the sole terminal Deform key with equal dense
endpoints. A keyboard handle step updated the addressed f0 progress while
preserving the second control's signed zero, the dense words, presence,
the f24 successor and the working vertex draft at Current f0. The stepped
control and inline Graph progress edit also preserve that same-frame draft.
Graph terminal fallback and removal by the row filter pass.

A named normalized preset applied to Deform and Rotate through one
revision-bound native batch and one Undo. The hidden Clipping track,
unselected keys, Setup and dense Deform offset words match the baseline.
Production web and E2E typecheck, 538 JavaScript tests with one existing
skip, and 39 distinct production-CSP UI cases passed. The preset case
used a verified Setup evaluation for constrained fixture creation on
recheck. The product sources and assets were identical for both UI runs.

## Grouped handles in Curves follow-up

Exact Linux REA `ev_e910e338822b542fa33f898d1f6789b0b47eb2d03e69f020838c366d23a5baf7`
and `ev_47c55bd0f3356665ede7d0de4578b41f78d16b8a7cf9980d118b10ad73797683`
pin authored Graph controls for analytic same-side and opposite-side
discriminators. The independent dock capture
`ev_fa4e8f931ed0b67467b782d5b217a969302da373959f3ff72836549519b7f1bc`
comes from the supplied unversioned image. Exact original Curves group
selection, movement and history remain open.

REA MCP `capture_process_scenario`
`ev_4a20e9932dce698ef6facb568421799978fcfa8136d80760549a7b90300f3fa0`
evaluated the retained descending Rotate f15–24 curve from the exact
Linux export. Its authored shape reaches 80.695790° at f18. Clamping
the evaluated progress to 0–1 gives 70°. Clamping the two normalized
ordinates before evaluating gives 68.334472°. This establishes a stored
overshoot witness. The original dock's pointer bounds remain open.

The paired FBones gate uses explicit dock-local picks on visible editable
handles. Keep timeline key selection and preset scope independent. Reuse
the normalized Graph transfer with the dock's focused lane and selected
peer lanes, including the Deform scalar. Freeze owner, immediate successor,
component, handle side and document revision for preview and commit. Reject
an incompatible peer as a group, and preserve draft work and unpicked handles.

For Rotate f4–f14 with values 35→12 and Deform f0–f24, moving the first
handles to normalized `(.5,.25)` should store Rotate `(9,29.25)` and
Deform `(12,.25)` in one Undo. Verify group selection without writes,
Escape rollback, an out-of-bounds peer and stationary Current.

The production-CSP case picks the Rotate and Deform handles with
Ctrl+Enter. Both paths preview together before any write. Escape restores
them, and moving toward a valid Rotate position outside the Deform interval
rejects the whole candidate. A keyboard commit stores the measured fixture
controls. A valid pointer release also commits both curves in one native
batch and one Undo. Current, timeline selection, unpicked controls,
signed Deform words, exact dense offsets and unrelated state remain intact.
The shared native edit keeps working drafts.

Production web and E2E typecheck, 541 JavaScript tests with one existing
skip, and 43 real-session UI cases passed. The expanded grouped case
rechecked pointer release on the same production assets and native host.
