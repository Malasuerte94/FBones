# Feature interaction audit — Spine 4.3.26 reference

Research dates: 2026-10-28–29. Research only; no new product behavior is accepted by
this document. Pair with FEATURE-DATA-4.3.26.md and FEATURE-CODE-AUDIT.md.
The coordinator subsequently created an independently owned original GUI for
research; the observation boundary and guarded-input outcome are recorded below.

## Evidence classification and local inspection

- **Observed local appearance:** all three supplied files in `spine_pictures/`
  were reopened at original resolution. The full viewport and toolbar closeup
  show cyan active-bone treatment, other gray/yellow/orange bones, compact gray
  tools and numeric fields. The properties image shows a slot with a nested
  image attachment, distinct icons, and bone name/length/color controls.
  These crops have no patch banner; they are user-supplied reference appearance,
  not independent proof of their exact editor build.
- Those images do **not** establish hover transitions, multiselection gestures,
  Tree filters, Auto weights, blend controls, clipping, or constraint dialogs.
- **Exact 4.3.26 data proof:** reuse `../SLOT-ATTACHMENTS-4.3.26.md` for the
  established inventory/active-pointer distinction. New advanced-feature CLI
  cases belong to the paired data audit; CLI exports cannot prove UI pixels.
- **Documented:** official pages below were consulted on the research date.
  User-guide pages do not identify a patch. The API page identifies current
  non-beta **4.3**, not editor **4.3.26**. Neither is an exact-patch GUI check.
- **Proposed/inferred:** implementation and acceptance decisions explicitly
  marked below are FBones specifications, not observations of original code.
- **Unknown:** actual-pointer hover timing, Weights-list hover details,
  proprietary Auto-weight algorithm and undocumented behavior stay unknown
  until controlled observations settle them. The later exact-version Tree
  hover/color and filter captures below supersede the initial documentary limits.

## F300 — Cross-pane bone identification

**Documented:** the Weights bone list corresponds to bound bones; its colors
match viewport bones in Weights mode. Clicking a list bone chooses influences
for editing, while right-clicking selects that bone in Tree/viewport. The guide
does not establish the requested hover preview's exact color or timing.
See [Weights](https://en.esotericsoftware.com/spine-weights#Bones-list).

**User-requested FBones behavior:** implement transient `hoverBoneId` separately
from scene selection, bound-bone membership and persistent influence selection.
Tree/Weights pointer enter and keyboard focus identify the same viewport bone;
leave/blur removes only that transient indication. A clicked influence remains
identifiable after the pointer leaves. Hover must never silently change which
bone receives a brush stroke. Use distinguishable hover and selection styling;
cyan active selection follows the supplied appearance. Later exact-version
Tree observations below establish white transient hover, distinct from selection. Weight selection must remain visible while hovering a
different bone. Do not toggle a binding checkbox merely to identify a bone.

**Acceptance:** assert matching stable IDs across both panes and viewport;
pointer A→B→empty, selected A plus hovered B, keyboard focus, click, deletion,
Undo, project replacement, window blur and viewport destruction. None of these
preview/selection-only operations adds history, dirtiness or per-frame IPC.
Actual Windows screenshots must show selected and hovered states concurrently.

## F301 — Scene images, independently from library assets

**Documented:** viewport items support Ctrl/Cmd multiple selection and box
selection. Empty-space dragging starts a box when nothing is selected; Escape
clears selection. Tree supports Ctrl/Cmd multiple selection and Shift ranges.
These are scene objects, not filesystem assets. See
[Tools](https://en.esotericsoftware.com/spine-tools#Selection) and
[Tree](https://en.esotericsoftware.com/spine-tree#Selection).

**Proposed model:** scene attachment IDs and active scene item are distinct from
Images-library keys, bone selection, slot ownership and the slot's nullable
active attachment. Keep every inventory item when selecting alternatives;
selection does not rewrite the active pointer. Use F222's stable attachment
identity, not a slot ID that becomes ambiguous with multiple alternatives.

**Acceptance:** Ctrl/Cmd click toggles scene images; replacement and additive
marquee select rendered images; Shift ranges use visible Tree row order.
Viewport Shift behavior is not established by the guide: any additional
additive Shift gesture must be recorded as an explicit FBones consistency
decision, not claimed as observed Spine parity. Visibility/category filtering
must not secretly activate an attachment. Preserve the active selection when
merely moving between panels. A group gesture snapshots members and pivot,
commits one native transaction, and transforms each member once, including
images with differently transformed owners. Define vertex-edit selection
separately so clicking a mesh vertex cannot accidentally move all images.

**Tests:** overlapping images and draw order, Ctrl removal, empty marquee,
additive marquee, hidden and inactive alternatives, mixed region/mesh, affine
owners, off-canvas bounds, mid-drag Escape, Undo/Redo and save/reopen. Original
GUI hit-testing of transparent pixels remains unknown; do not claim a new
alpha-hit rule is reference-proven.

## F303 — Tree category filters

**Documented:** Tree has quick Bones/Slots/Attachments filters and combined
filter selection. If attachments are filtered out, a viewport-selected
attachment selects its owner slot in Tree. If bones are filtered out, slots
appear in draw order and can be reordered there. This is a flattened category
view, not a requirement to keep every hidden bone ancestor visible. Text
search can highlight matches or hide nonmatches depending on its filter mode.
See [Tree filters](https://en.esotericsoftware.com/spine-tree#Filters).

**Proposed acceptance:** category controls above Tree operate on a projection;
they never mutate ownership, activation, visibility or draw order. Preserve
the underlying typed selection when a filter hides its row; show its eligible
owner or a clear selection breadcrumb. When a category remains enabled,
retain enough enabled ancestry to understand the row. When bones are disabled,
do not reinsert them as selectable rows merely to satisfy an ancestry helper.
Use slot draw order, not hierarchy traversal, for the documented flat slot view.

Combine category masks with search and collapse state deterministically. Define
all-off/no-match behavior, Reset/all categories, visible-row Shift ranges,
keyboard navigation, selection hidden by filters, and constraints as a separate
category when constraints exist. Assert the native project DTO/revision remains
identical after every filter transition. The supplied screenshots do not prove
the original filters' exact icon geometry or selected-color treatment; later
owned exact-version observations below establish their toggling and projection.

## F302 — Automatic weights and binding

**Documented:** Auto uses mesh topology rather than only geometric proximity.
Selected vertices restrict its vertex scope; selected influence bones restrict
its bone scope. Initial binding computes weights. The exact solver is not
published. The Weights guide also describes retaining the weighting selection
while testing transforms, and renormalizing other influences during edits.
See [Auto](https://en.esotericsoftware.com/spine-weights#Auto).

**Proposed UI:** retain the existing Bind/Auto/Normalize workflow but make its
scopes explicit and consistent. Bound membership, selected editing influences,
locked weights and vertex selection are separate sets. A mere hover cannot
change Auto's scope. Scope feedback should identify the chosen mesh and counts,
not expose engine implementation details. Present a cancellable result preview
if computation is expensive; applying it produces one history entry.

**Acceptance:** use our own tapered limb, forked joint, nearby unrelated limb,
thin bridge and separated-component surfaces; compare resulting deformations,
not just normalized sums. Verify bind-pose preservation, deterministic output,
nonnegative finite weights, locked/out-of-scope preservation, duplicate and
zero-length bones, parent affine transforms and no available seed. A topology-
aware FBones solver is an independent implementation; numerical equivalence to
the unpublished original Auto solver remains unknown without controlled
original results. Do not label an inverse-distance adjustment alone equivalent.

## F304 — Slot color, opacity and blending

**Documented:** slot color and alpha affect the active image; attachment color
is an additional setup tint. Blending choices are Normal, Additive, Multiply
and Screen; Normal is the default. Alpha-zero is not the same operation as
deactivating an attachment. The light color control displays both its opaque
and alpha-composited appearance. Tint Black is a separate feature, not a synonym
for multiplying the existing color. See
[Slot properties](https://en.esotericsoftware.com/spine-slots#Properties).

The [Slot Color view](https://en.esotericsoftware.com/spine-slot-color) edits
selected slots and can edit an attachment's owning slot directly. Its control
density adapts to panel size. This supports a compact RGBA editor rather than
making users repeatedly open a color dialog.

**Acceptance:** expose all four named blend modes with immediate actual image
preview; preserve independent RGB/alpha and attachment tint. Mixed multi-slot
values need an honest mixed state, not the first item's value masquerading as
shared. Use own colored/transparent checker textures over known backgrounds;
test every mode, alpha 0/0.5/1, transparent edge halos, premultiplied-alpha
handling, region and mesh paths, draw-order changes and Undo/save/reopen.
Pixel composition must be compared independently; an accepted JSON blend enum
alone does not establish a correct renderer. Bone display color stays separate.

## F305 — Clipping ownership, range and vertex editing

**Documented:** create clipping from a bone or slot; polygon editing starts
immediately. Its owner slot is the implicit start. The end-slot picker includes
that end slot in the clipped range. A new clipping attachment defaults its end
to its owner, meaning clipping continues through the remaining draw order.
Affected slots receive red Tree highlighting. At least three vertices are
required; self-intersections and overlapping clipping intervals are invalid.
Editing can exit with Escape. Clipping supports weighted vertices. See
[Clipping](https://en.esotericsoftware.com/spine-clipping).

**Proposed UI:** show Start as the owner slot, with reparenting as the operation
that changes it; do not invent a second independent persisted start pointer.
Give End an explicit slot chooser and visualize the actual affected interval
against draw order. A clipping attachment is an inventory alternative under
its slot, governed by the same active/none rule as other attachments. Creating
it in an occupied slot must retain that slot's existing alternatives (F222),
not overwrite an image. Its color represents its editor outline, not runtime
image tint. Polygon controls need create/move/delete/close, vertex selection,
Escape cancellation and clear malformed-polygon feedback.

**Tests:** own opaque region followed by a weighted mesh and a final unmasked
image; end-inclusive pixels; default end=self; move owner/end through draw
order; switch clipping attachment active/none; reflected affine owner; concave
polygon; edge touches; minimum vertices; crossed edges; invalid end/deleted end;
and two nonoverlapping versus overlapping ranges. Exact editor response when
the end precedes the start, or the end is deleted, remains unknown: do not
silently choose new ownership while claiming original behavior. Data export
acceptance is separate from clipped-pixel correctness.

## Shared constraint interaction and evaluation contract

**Documented:** constraints appear under Constraints and execute in that order;
setup-mode dragging reorders them. Mix zero removes an effect, full mix applies
it, and some properties support extrapolation. Constrained viewport bones use
hollow styling and Tree annotations link to related constraints. Later
constraints can invalidate earlier results when descendants are recomputed.
See [Constraints](https://en.esotericsoftware.com/spine-constraints).

**Proposed shared acceptance:** creation, target picking, constrained-member
selection, rename/delete and order changes use stable identities and one
transaction. Show authored setup values separately from the evaluated viewport
pose; evaluation must not overwrite authored channels or make the document
dirty every frame. Moving a target uses the normal bone tools and updates the
constrained pose while preserving the stored unconstrained baseline. UI should
identify targets and constrained members without confusing hover, selection
or binding. Escape cancels a target-pick gesture atomically. Undo, reopening,
member deletion, reparenting, order changes and cycle rejection need tests.

The current **4.3** [API](https://en.esotericsoftware.com/spine-api-reference)
explicitly distinguishes unconstrained and applied poses. It also exposes
transform property mappings and separate source/target spaces, which exceed
the simpler editorial guide. These are current-runtime facts, not proof of
editor 4.3.26's exact control layout. Its Physics modes distinguish no physics,
reset, advancing state and applying the existing pose without advancing.

## F306 — IK controls and acceptance

**Documented:** IK accepts one bone or an immediate parent/child pair. Target
picking accepts an existing bone or creates a new one in empty space; targets
cannot descend from constrained bones. The panel identifies parent, optional
child and target; controls include bend direction, shortening/stretching,
softness and mix. Two-bone cases have restrictions involving shear,
nonuniform scale, local child Y and softness. See
[IK constraints](https://en.esotericsoftware.com/spine-ik-constraints).

**Acceptance:** creation at the current tip should avoid an unexpected jump;
single-bone aiming and two-bone reach tests need measured evaluated endpoints.
Test both bend signs, reachable/unreachable/coincident targets, near-straight
and folded chains, zero/unequal lengths, mix endpoints/intermediate mix,
stretch/compression/softness, mirrored/scaled parents and prohibited ancestry.
Do not report Pose's existing fixed-length rotation as IK. Keep native authored
bone data separate from the solver's evaluated pose and verify dependent mesh
skinning uses the evaluated transform. Exact 4.3.26 defaults and scale-Y UI
must follow the paired controlled cases; do not blindly copy an older Uniform
checkbox from an unpinned illustration.

## F307 — Physics, gravity and preview time

**Documented:** creation targets one bone. Setup controls choose affected
translation axes, rotation, shear and longitudinal scale, movement limit and
simulation rate. Dynamic properties cover inertia, restorative force, damping,
mass, wind, gravity and mix. Simulate and Deterministic affect preview behavior;
reset can affect one or all constraints. Invalid zero-length configurations
produce warnings. Deterministic animation preview replays from the start rather
than pretending stateful physics can simply run backward. The guide describes
no baking feature. See
[Physics constraints](https://en.esotericsoftware.com/spine-physics-constraints).

**Units caveat:** the current API labels `step` milliseconds, but the official
[4.3 JSON loader](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/ee2a10936a103ac187d74f7709f855653e923eae/spine-ts/spine-core/src/SkeletonJson.ts)
uses `1/fps`. Therefore use UI FPS and explicitly tested time units; do not
multiply a seconds timestep by 1000 just because of that comment. The current
[physics state update](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/ee2a10936a103ac187d74f7709f855653e923eae/spine-ts/spine-core/src/PhysicsConstraint.ts)
accumulates elapsed skeleton time, has a fixed-step remainder, and clears
movement history on reset. These are inspected 4.3 branch facts, not patched
editor numerical equivalence. No runtime source was copied into FBones.
The observed branch head is pinned to commit
`ee2a10936a103ac187d74f7709f855653e923eae`; both cited files were re-fetched
at that commit and their hashes matched the branch snapshots. Private metadata
is `.local/research/feature-ui/runtime-reference.json`; no source files were
retained or added to the application/distribution.

**Proposed acceptance:** distinguish authoring settings from transient pose,
velocity and time. Provide deliberate run/pause/step/reset controls for setup
testing; only offer animation scrubbing/deterministic replay when it actually
works. No decorative disabled timeline or bake claim substitutes for behavior.
Display rate as Hz/FPS, force directions and meaningful limits; exact defaults
and ranges await the paired 4.3.26 cases. Simulation advances once per intended
step, independently of repaint count, hover, camera zoom and frame frequency.

**Tests:** zero elapsed time, fixed replay under different display frame rates,
long pause/catch-up budget, resume, forward/backward preview, resetting one/all,
deletion/Undo/reopen, mix zero, zero inertia/force/damping extremes, invalid mass
or rate, zero-length warnings, signed gravity/wind, rotated parents and changing
reference scale. Persist settings and constraint order, not accidental live
velocities. A static CLI export proves configuration only; moving-frame/image
comparisons are needed before claiming solver parity.

## F308 — Transform constraints, including 4.3 mappings

**Documented guide:** select constrained bones, then pick/create a source
target; the guide explains local/world matching, additive/relative behavior,
offsets, Match and individual property mixes. See
[Transform constraints](https://en.esotericsoftware.com/spine-transform-constraints).
The current API and JSON loader additionally expose independent source and
destination spaces, property-to-property mapping, scale/offset/range and clamp.
Their schema must be reconciled against exact 4.3.26, rather than reducing the
feature to an older all-channel copy model.

**Acceptance:** creation and source picking follow the shared contract; the
inspector needs the supported mapping inventory, meaningful per-channel mixes,
source/destination-space labels, offsets and Match behavior. Do not offer
controls whose values are discarded by the codec. Test one/multiple targets,
zero/full/intermediate/extrapolated mix where allowed, independent axes,
cross-property mapping, source/range offsets, clamping, local/world spaces,
mirrors/shear/nonuniform parents, ordering dependencies and deletion/cycles.
Validate evaluated matrices and attachment corners, not only copied scalar
fields. Full mapping support and exact original-control placement remain gated
by controlled cases and safe original UI evidence, respectively.

## Sequencing and evidence required before completion

1. F300 and F303 projections can begin after the paired audit gate. F301
   selection math can be developed independently but final attachment behavior
   depends on F222 inventory/activation, including inactive alternatives.
2. F302 needs a complete mesh/influence/vertex-scope design and meaningful own
   deformation corpus. Exact Auto-algorithm equivalence stays unknown unless
   directly compared; do not substitute normalization-only tests.
3. F304/F305 need typed codec fields, renderer behavior and active inventory.
4. F306/F307/F308 share an ordered evaluator and separate setup/applied poses;
   implement those foundations together rather than baking constraint outputs
   into editable bones. This is sequencing, not a reduction of requested scope.
5. Every persisted addition needs complete bounded reserialization and fresh
   exact-4.3.26 comparison. Every UI claim needs a dedicated own Windows process,
   real keyboard/mouse interactions and own-art visual evidence. Existing
   foundation suites are preserved, not rerun as substitute coverage.

### Controlled exact-version original GUI observations

The coordinator checked there was no existing original editor process, then
created an owned **Spine 4.3.26 Professional** instance using a positional own
project path. The current [official CLI guide](https://en.esotericsoftware.com/spine-command-line-interface#Editor)
documents this form. `--input <file>` alone is Info mode and exits; it does not
request a GUI. The owned process/window was verified before every input/capture.
All project mutations were confined to independent copies of our own generated
recipes. Accepted source cases and personal projects were not altered.

An initial guarded actual-input batch stopped when foreground changed to an
unrelated browser. Further research used **synthetic background Win32 messages**
only into the verified owned editor/client window and its verified owned native
file dialogs. These observations establish the original controls' response to
those inputs, not real-pointer timing or Windows drag-and-drop reliability.
They did not change global pointer/keyboard state or explicitly change focus.
Private screenshots and helpers remain ignored under
`.local/research/feature-ui/`; none are distributed as product artwork.
Opening a chooser displayed recent-file metadata, so those captures must remain
private. Public evidence here is aggregate behavior only.

#### F300 — Tree hover, distinct from selection

A root bone was selected, with its cyan viewport selection retained. Hovering
another bone's Tree row changed only that viewport bone from gray to white.
Measured own capture samples changed from `(154,154,154,255)` to
`(254,254,254,255)`; moving to blank space inside Tree restored the gray sample.
The selected root remained selected throughout. Moving directly to the viewport
with background messages did not reliably clear the highlight, so actual pane
exit timing is **unknown**, not an established original defect.
Private evidence: `tree-hover-upper.png`, `tree-hover-cleared-blank.png`,
`tree-hover-observed.json`. Weights-list hover/click differences still require
separate observation; they are not proved by this Tree experiment.

#### F303 — Filters combine, flatten and retain hidden selection

Clicking Slots showed a flat Slots node in front-to-back visual order, the
reverse of the recipe's JSON draw order. Bones were absent; no disabled bone
ancestors were inserted. Constraints, Skins, Events, Animations, Images and
Audio categories remained. Clicking Bones added Bones to Slots without a
modifier. Enabling Attachments as well returned all three categories to the
unfiltered presentation. Thus quick buttons are combinable toggles.

A separate controlled selected-root → Bones hidden → Bones shown sequence
proved that the underlying selection survived filtering: the same root row,
properties and viewport selection returned without selecting it again.
While hidden, its properties/viewport selection treatment were projected out;
that temporary absence must not be described as clearing selection.
Private evidence: `tree-slots-filter-observed.png`,
`tree-filter-root-selected.png`, `tree-filter-root-hidden.png`,
`tree-filter-root-restored.png`.

#### F222/F301 — Attachment selection and activation are independent

On an own slot containing region alternatives A and B, A initially rendered red.
Clicking inactive B's row selected B and displayed B's properties while A stayed
active and rendered. This row selection did not dirty the project. Clicking B's
paperclip activated B instead, rendered only its blue image, and dirtied the
project. Clicking the same paperclip again set active-none: neither image
rendered, B remained selected, and both inventory rows remained present.

The paired data audit already proves canonical A/B/none persistence; this GUI
observation supplies interaction evidence and does not repeat that export batch.
Saved owned GUI copies `multi/slot-ui-paperclip-b.spine` and
`multi/slot-ui-paperclip-none.spine` were captured only after save completion.
Their extra editor metadata does not imply the canonical codec accepts the
entire GUI-saved file. Private screenshots are `multi/slot-row-b-selected.png`,
`multi/slot-paperclip-b-active.png` and `multi/slot-paperclip-none.png`.
Scene Ctrl/Cmd/marquee behavior remains documented rather than newly GUI-proven.
The current canonical model does not persist a separate editor-hidden flag.
The new inventory UI therefore uses explicit paperclip activation and a passive
slot active-state indicator; it must not turn an eye toggle into an invented
first-attachment activation rule. Legacy visibility controls stay on the legacy
profile only. Asset-drop activation into an existing slot is still unobserved.

#### F305 — Exact Convex and Inverse controls

The clipping inspector contains End slot, Select/Export/Name, **Convex**,
**Inverse**, outline Color, Parent, Edit Clipping, Reset and Freeze. The JSON
imported concave recipe initially had Convex checked despite its unrecognized
JSON `convex:false` input. This confirms JSON import acceptance alone cannot
establish that property. Toggling Convex off changed the displayed cut. Turning
Inverse on showed the outside instead and disabled the Convex control.
An additional checked-Convex → Inverse-on experiment retained Convex checked
while disabled; Inverse does not force the stored Convex value false.

Owned saved copies and independent paired parsing establish class84 tag13 as
the Convex boolean and tag14 as the Inverse value. The paired data audit owns
the canonical writer acceptance. Whole GUI saves contain extra editor metadata
and remain unsupported unless explicitly modeled; unknown data must not be
discarded. Private evidence: `clip-inspector-convex-on.png`,
`clip-inspector-convex-off.png`, `clip-inspector-concave-inverse.png`,
`clip-inspector-convex-inverse.png` and corresponding owned `clip-ui-*.spine`
copies. No arbitrary clipping edge/end-deletion behavior was inferred.

#### F302 — Auto changes weights while retaining existing binding coordinates

An own five-vertex mesh with three bound bones was selected, with no vertex or
influence subset selected. Clicking Auto applied immediately, without opening
an options dialog, dirtied the project and changed the visible deformation.
The paired data check of the immutable observed result establishes that all
15 weights changed while all 30 bone-local binding positions remained exactly
unchanged; bones, topology and UVs also stayed unchanged. The fixture had been
posed after binding. Thus Auto in this case changed weights without rebinding
those coordinates; shape preservation must not be asserted as original parity.

The baseline is `auto/auto-ui-baseline.spine`. The authoritative after snapshot
is **`auto/auto-ui-observed-result.spine`**, independently preserved by the data
agent. The earlier file named `auto-ui-after.spine` was copied before the
asynchronous save finished and is byte-identical to baseline; it is **not**
after evidence. The mutable working `auto-ui-before.spine` later received export
settings metadata and is also not the immutable comparison source. Save-proof
collection must await changed, stable file bytes before taking an after copy.
`auto-before.png`/`auto-after.png` record the corresponding visible result.
One example establishes this operation's scope/result, **not** the proprietary
Auto algorithm, nearest-N selection, or behavior of all locked/subset cases.
The visible Influence 4 control's exact role remains untested.

#### F307 — Default zero and nontrivial angular UI values

On an untouched copy of the exact default-physics case, Rotation and Shear X
both display ordinary numeric **0** sliders, with no separate checkbox and no
NaN or blank value. Scale X displays 0 with scale-Y mode None. Other visible
defaults are Translate 0/0, Limit 5000, FPS 60, Inertia 50, Strength 100,
Damping 15, Mass 100, Wind 0, Gravity 0 and Mix 100. The paired binary default
uses a quiet-NaN sentinel for one angular field: preserve its raw/default state
without leaking NaN into an editable UI input. Screenshot
`physics-default-inspector-observed.png` and metadata
`physics-default-observed.json` include source-byte equality after observation.

On the separate nontrivial rotate/shear recipe, the original inspector displays
Rotation **70** and Shear X **52.5**, matching its raw angular fields, while
runtime JSON values are rotate .4/shearX .3. These are not direct UI percentage
conversions of each runtime channel. The inspector calls its member **Target**
(`upper`), shows Simulate enabled, Deterministic disabled, Reset and Reset All,
and per-property global controls. Damping15 and Mass100 were observed, but
conversion hypotheses are not promoted to proof without paired field tests.
Private evidence: `physics-inspector-observed.png`. No actual simulation
trajectory, reset response or solver-equivalence claim follows from a panel
capture. No authored physics property was changed by these observations.

#### F308 — Actual 4.3.26 mapping inspector

An untouched own remapping recipe shows **Source** (`target`) and plural
**Targets** (`upper, lower`), an Offset foldout with Translate X/Y and its own
Match action, Mix Rotate 63, and a **two-sided Properties mapping table**.
The table exposes Rotate, Translate X/Y, Scale X/Y and Shear Y on both sides;
a visible link connects source Translate X range 3.7–48.483 to destination
Rotate range 17–120. Source-side Local is unchecked; target-side Local is
checked, Additive unchecked and Clamp checked. Properties also has Match.
This is exact-patch control-layout evidence for richer mappings, not an
older all-channel copy inspector. Displayed range values need paired data
conversion checks before treating rounded text as authored runtime values.

Private evidence: `transform-inspector-observed.png`,
`transform-inspector-offset-observed.png` and `transform-inspector-observed.json`.
The own mutable copy remained byte-identical to the accepted source after
inspection. No mapping, Match, checkbox or authored numeric control was changed;
link editing and Match semantics remain unobserved.

#### Actual export-setting schema obtained for numerical solver research

The owned editor's Export → PNG → Animation → Save settings operation produced
an actual settings JSON with `class: export-png`, `exportType: animation`,
`renderImages: true`, `renderBones: false`, transparent background, percent
`scale` and `fps`. A second Current pose setting establishes the exact literal
**`exportType: current`**, not `pose`. Raw settings are private because output
paths are local. Derived own-oracle settings change only known fields to
4× scale (400 percent), 60FPS and matching own skeleton/input/output names;
every adjustment is recorded in `png-settings-provenance.json`.

These are `.local/research/feature-ui/png-animation-settings-observed.json`,
`png-pose-settings-observed.json`, `png-oracle-settings.json` and
`png-pose-oracle-settings.json`. They were handed to the independent solver
researcher for evaluated PNG marker measurements. This audit did not export
or analyze motion frames itself. GUI settings validation does not prove any
constraint solver yet.

### Remaining limits

Exact original pointer timing, Weights-list hover and sub-scope actions,
viewport scene multi-selection gestures, the full Auto solver, IK inspector
layout, mapping-link/Match operations and dynamic constraint trajectories remain
unobserved here.
Current primary documentation and the paired data audit can guide them, but
must not be relabeled as exact-patch GUI or numerical equivalence proof.

### Resumed integration audit — 2026-10-29

The second reference audit reopened the existing private exact-version captures
`clip-inspector-convex-on.png`, `physics-default-inspector-observed.png`,
`transform-inspector-observed.png` and `tree-slots-filter-observed.png`. No
accepted original CLI batch was repeated, and no original or user GUI process
was changed. These observations are reused evidence, not new pointer tests.

- **Directly observed:** Convex is checked in the owned exact-version clipping
  inspector. The unfinished creation dialog incorrectly defaulted it false;
  its default is corrected to true. Inverse continues to disable the Convex
  control without discarding its checked state.
- **Documented:** the [Clipping guide](https://en.esotericsoftware.com/spine-clipping#End-slot)
  defines a new attachment's default end as its owner slot, meaning the
  remaining draw order. The dialog now starts at owner/self instead of the
  last slot. This is documentary creation behavior, distinct from the exact
  JSON-import experiment that materialized an omitted end as the last slot.
- **Implementation consistency:** the current image group transform uses a
  common center in world space. Its toolbar had retained bone Individual/Group
  buttons, a Local Scale hint and bone-selection counts. Those labels/choices
  now reflect the actual image operation and use attachment counts. Common-
  center image rotation is an explicit FBones choice, not newly measured
  original-editor pivot behavior.
- **Directly observed controls, engineering preview policy:** the original
  Physics panel shows Simulate, Reset and Reset All. FBones setup preview has
  Run/Pause, one 1/60-second Step and global Reset controls, separate from
  persisted authored values and unrelated to animation scrubbing. The shared
  component is mounted once in the viewport and uses existing editor tokens.
  This panel does not establish solver integration, original playback parity,
  actual Windows accessibility/interaction or pixel acceptance; those remain
  separate gates recorded in the solver and task notes.

The changed App, clipping dialog and preview control pass Vue SFC script and
template compilation. Full integrated TypeScript/build/Windows checks belong
to the coordinator after the preview-store contract is wired.

### Follow-up: physics globals and exact clipping pixels

**Documented, not a new patch-specific editor action:** the official
[Physics Global section](https://en.esotericsoftware.com/spine-physics-constraints#Global)
defines those flags as participation in a shared animation timeline row. It
does not establish broadcasting setup numeric edits to other flagged
constraints. The existing exact-version captures establish the visible flag
controls, not cross-constraint setup editing. Therefore a setup edit continues
to update its selected constraint; no speculative setup broadcast is added.
Global animation-track evaluation remains a timeline feature and must not be
claimed merely because the per-constraint booleans persist.

**Directly observed rendered output:** nine new independently encoded own
projects were rendered by actual original **4.3.26**, using the unchanged
current-pose PNG settings obtained from its owned GUI. Each source was
constructed through the typed Scene writer and checked by complete decode/
reserialization. No existing source project was modified, no original/user GUI
window received input, and no completed foundation/format batch was repeated.
All nine original render processes exited zero and emitted one1024×1024 PNG.
The numeric checker compares9,308,468 interior pixels with zero mismatches;
edge classification excludes0.26 world units (about one rendered pixel).

- Convex enabled uses the polygon's **geometric convex hull** in the measured
  concave cases; disabled uses its concave boundary.
- Inverse uses the **outside of that convex hull regardless of the saved
  Convex flag**. Both raw Convex states produce byte-identical inverse PNGs
  for the symmetric notch fixture. Keeping the flag while disabling its UI
  control does not mean Inverse uses the authored concave boundary. The earlier
  renderer assumption to that effect is superseded by this observation.
- Two additional diagonal-edge cases distinguish the geometric hull from an
  axis-aligned bounds rectangle: that alternative disagrees at31,503 tested
  interior pixels per case.
- A trailing solid-blue attachment is unmasked when clipping ends at the
  preceding red slot, masked when it is the explicit end slot, and masked
  when end equals the clipping owner. This independently verifies inclusive
  end and self=end meaning the remaining draw order for these cases.

Ignored helpers/own source projects and PNGs are in
`.local/research/clipping-pixels/`; the sanitized aggregate is
`analysis/clipping-pixels-check.json`. This batch proves static region mask
behavior for the sampled polygons/intervals. Weighted/deformed masks,
overlapping/nested intervals, edge antialiasing equivalence and end-before-
owner behavior remain separate checks. No original implementation was copied.

### F222 follow-up: attachment ownership moves

**Reused exact local evidence:** the owned clipping inspector capture contains
its Parent action, and the owned A/B/none observations establish attachment
inventory, selection and the slot's active pointer as independent state. None
of the recorded original actions changes an attachment's owner. Therefore the
existing captures do not prove the exact reparent gesture, whether a moved
active attachment becomes active at its destination, how collisions are
resolved, or whether a self-referencing clipping endpoint follows its owner.

**Documented:** [Attachments / Set Parent](https://en.esotericsoftware.com/spine-attachments#Set-Parent)
and [Tree / Drag and drop](https://en.esotericsoftware.com/spine-tree#Drag-and-drop)
describe changing an attachment's parent through the Parent action or dragging
its Tree row. [Slots](https://en.esotericsoftware.com/spine-slots) explains that
the slot owns visibility, tint/blend and draw-order placement; a slot has no
transform position. These pages are not patch-pinned. They do not settle
destination activation, name-collision resolution or nonrepresentable affine
reparenting behavior.

**Engineering implications, not original-operation proof:** moving an existing
attachment is distinct from adding a library PNG or moving a complete slot to
another bone. Keep its stable identity and image path. Preserve its world
geometry; apply the destination slot's existing tint/blend and draw order
rather than promising identical final pixels. An owner-slot chooser and a
Tree attachment-to-slot drop can share one native revision-checked command.
Do not silently delete or replace a destination alternative, change an
unrelated active pointer, invent automatic activation, or infer batch moves
from a single-attachment native operation. Concrete activation/collision
policies must be explicitly recorded as FBones choices until new exact
observations settle them. Native validation/history/serialization and actual
Windows pointer interactions remain separate acceptance gates.

The coordinator approved this explicit FBones ownership-move policy after
both audits: moving the active source attachment clears that source's active
pointer; the destination's pointer is preserved, including none. Same-slot is
a no-op. A duplicate destination name rejects atomically, rather than guessing
an original overwrite/rename rule. Stable image identity and path remain;
weighted geometry retains its actual influences. A clipping endpoint remains
an explicit slot reference, and invalid resulting intervals are rejected.
These activation/collision choices are not claimed as original-editor parity.

The owner chooser and Tree attachment-to-slot drop use the same single-
attachment command. Starting an ownership drag selects that attachment alone,
making the single-item scope visible. Payloads contain the document ID and
revision, and a stale drop cannot address IDs reused by a replacement project.
Legacy one-attachment profiles keep ownership dragging disabled. Native
reference remapping/history, geometry preservation and actual Windows drag
acceptance still require their own checks.

### F300 follow-up: Tree projection cleanup

The resumed paired UI/data audit found a transient cleanup gap: removing a
Tree row by filters, text search, collapse or changing tabs need not dispatch
that removed row's pointerleave/focusout events. Only component-unmount cleanup
was present. The Tree now tracks its own pointer/focus claims. Projection
layout changes clear only the matching Tree pointer claim; hidden/removed
focused rows clear only the matching Tree focus claim. A still-visible keyed
focused row keeps its focus claim. Document replacement clears both Tree
claims, while other panes retain their own source-specific lifetime rules.

This is FBones interaction correctness using the established source/identity
contract. Exact original pane-exit timing remains unknown; no new original
hover observation is claimed. A focused harness mounts the actual compiled
Vue components, invokes their handlers and changes filters/search/collapse/
tabs. It verifies Weights-source claims survive, still-focused keyed rows
remain identifiable, source/target-guarded cleanup works, and project DTO,
revision, selection and influence are not edited. The same harness verifies
single attachment ID0 ownership commands, stale-document/revision and
malformed/unknown/same-owner rejection, legacy dragging disabled, and restoring
the owner chooser after rejection. It is ignored
`.local/ui-reference-audit/check-owner-handlers.mjs`; these are synthetic
component checks, **not** a real Windows mouse drag/drop result.
