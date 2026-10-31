# Next animation controls — UI evidence and bounded implementation contract

2026-10-30. Before dependent Draw Order/deform/marquee/advanced timeline code.
The UI audit performed no original/Windows/process operations, authored no new
reference source and did not repeat accepted collections. F105 remains the full
animation task. Keep the user's shared central Setup **and** Animate transform
HUD; key buttons/Auto Key remain Animate only. Root owns integration and any
future original interaction. DATA independently recovers the already collected
future-family binary records.

## Evidence categories and local observations

Re-viewed with `view_image`:

| User reference | Directly visible controls and geometry |
| --- | --- |
| `animare/Spine_xVO18OJIOB.png`,1791×778 | Dopesheet toolbar y230–263: Sync, filter/lock/navigation, compact editing/interpolation icons, Shift/Offset/Adjust, Current/Loop Start/End. Ruler y270–307, gutter boundary x251, about23px rows. Narrow colored property keys, white summary keys, orange overview diamonds. |
| `animare/Spine_m7wxCtUtTG.png`,1797×567 | Graph toolbar y32–72: filter/lock, edit/curve icons, Shift/Offset, Frame, blue Auto, heart, Store. Round visibility dots at x211 beside overview/bone/property labels. Time begins x243; numeric value axis at right. Square curve keys and independent handle points. |
| `animare/Spine_vzdTlvDSE9.png`,2560×1439 | Full compact bottom timeline and checker viewport; separate right Preview/animation list. Shared floating HUD immediately above timeline, existing Tree/Weights/Curves docks. |

These are the user's visual references; version text is not printed. They do
not directly show Draw Order/deform rows, an active marquee rectangle, modifier
behavior, toolbar tooltips or handle-mode semantics. Refer to
`ANIMATION-UI-4.3.26.md` for earlier measurements. Existing exact4.3.26 Setup
selection/mesh/Draw Order authoring evidence must not be relabeled Animate.
A targeted retained-image search found no additional owned Animate Draw Order,
deform-key or marquee capture that answers these interactions.

Exact4.3.26 DATA already exists: root's completed new combined import55460 and
export80452 both exit0, exact version/Complete, source9b7f, under ignored
`.local/research/animation-timelines-reference-v1/`. The UI worker read its actual
`original-export/skeleton.json`, not the prepared input alone:

- `02-draw-order`: three keys at seconds0,.5,1; middle key moves `switch` by one,
  first/last restore the default order. The output uses a sparse offset list.
- `03-unweighted-deform`: three U-mesh keys, first outgoing scalar Bézier,
  middle stepped and final default deformation; sparse final zeros are omitted.
- `04-weighted-deform`: same outgoing pattern for the W-mesh, with16 middle
  deformation scalars for four vertices/two influences, versus8 unweighted.

`analysis/animation-eight-families-runtime-reference-check.json` records the
independent complete runtime comparison; DATA's
`ANIMATION-SLOT-DATA-4.3.26.md` states the remaining wire boundary. This proves
bounded original import/export data, **not** original mouse gestures, playback,
GPU output, weighted-deform authoring-space arithmetic or a ready editable codec.
Do not re-import these accepted cases. Consume their retained binary for recovery.

## Official documentation fallback — not exact patch proof

The following guides were reopened/read on2026-10-30. They do not identify a
patch version. The summaries deliberately distinguish documented behavior from
the actual4.3.26 observations above.

[Slots](https://esotericsoftware.com/spine-slots#Draw-order) documents the slot
order separately from bone hierarchy and attachment inventory. Higher entries
render over lower entries; drag reorders slots. Keyboard plus/minus moves a slot,
with Shift moving by five. Filtering to slots helps locate the ordered list.
Retain stable slot identities when converting this display order to the stored
profile; never infer the wire array direction from a visual list alone.

[Keys](https://esotericsoftware.com/spine-keys#Draw-order) places the manual
Draw Order key beside its Tree node. The same guide's
[deform section](https://esotericsoftware.com/spine-keys#Deform-keys) places a
manual deformation key beside the attachment: all vertices belong to one key,
including each weighted vertex's influence transforms. Deformed Animate vertices
are highlighted pink. Bone-driven weighted animation and explicit deformation
are distinct. Its Shift tool moves subsequent keys; Offset wraps loop timing and
can insert boundary keys. Those editing semantics need dedicated implementation,
not a cosmetic toolbar toggle.

[Dopesheet](https://esotericsoftware.com/spine-dopesheet#Box-selection) documents
empty-space drag selection, Ctrl/Cmd to begin over keys/add boxes, shared Graph
selection and Shift to bypass frame snapping. Persistent selection boxes can
scale/reverse timing; that is more than initial marquee selection. Adjust applies
a common relative transform to selected keyed poses. Sync follows Graph-visible
rows; a locked view preserves displayed rows. No exact pause duration for leaving
a box, collision policy or batch/history internals is established here.

[Graph](https://esotericsoftware.com/spine-graph) documents property visibility
dots and selection shared with Dopesheet. Draw Order/events occupy independent
bottom rows. Frame fits selected keys/handles, or visible curves when none are
selected; Auto keeps curves fitted. Separate curves have independent handles.
Value/Shape handle modes govern retiming. Favor biases poses; Store retains a
whole-animation curve snapshot, and Swap exchanges it with the current curves.
Those are documented feature families, not current4.3.26 gesture proof or
permission to approximate their arithmetic silently.

[Mesh attachments](https://esotericsoftware.com/spine-meshes) distinguishes
Animate vertex deformation from topology/edit-mode changes. Reset operations can
remove bindings and deformation; do not reuse them for animation cancellation.
The existing Modify/Create/Remove mesh toolbar is a Setup topology editor, not
a substitute for an Animate deform-key editor.

## Minimal concrete UI contract for the next slices

1. **Marquee first, view state only.** Keep the existing23px rows and gutter.
   Drag primary-button empty time-grid space to draw a thin selection rectangle;
   resolve contained visible key marks using actual scrolled coordinates.
   Dopesheet uses frame×row; Graph uses frame×value for visible component curves.
   Multiple RGBA components select their one shared native key identity once.
   Ctrl/Cmd adds/toggles selection and permits starting over a key; Shift keeps
   the established fractional-time rule. Escape cancels a live rectangle, no IPC,
   no history. This initial transient rectangle is explicitly **not** persistent
   box scaling/reversal. Test hit areas, scroll, both drag directions, tab switch,
   hidden rows/curves, focus and cancellation before enabling later scale handles.
2. **Graph visibility and fitting.** Put small visibility dots at the right of
   the label gutter, matching the screenshot; use overview/bone/property scopes.
   Add actual Frame and Auto beside existing compact controls. Fit transforms
   only the view, never key values/handles or current frame. A frame action must
   include control extrema or explicitly bound its initial policy. Preserve one
   selected-ID set across tabs; attachment keys remain discrete, without an
   invented numeric curve. Show unavailable advanced actions honestly until their
   native commands and rules exist. Do not replace these groups with a new card.
3. **Draw Order.** Reuse Tree's existing Draw Order list and real slot drag/drop;
   add adjacent manual-key action in Animate. Route Animate order changes to a
   separate transient/keyed permutation, never Setup `reorderSlots`. Add one
   independent bottom timeline lane with discrete keys and no interpolation
   controls. A key describes a full validated slot permutation; sparse offsets
   are DATA's serialization detail. Preserve active/none, light color, inventory,
   ownership and all bindings. Sampled ordering must feed both primary/Preview
   render order **and clipping scopes**; mask end-slot identity survives reordering.
   Current direct imported evidence does not establish insertion-before-first
   or Auto Key off history behavior; reuse explicitly labeled working-pose policy
   unless stronger evidence settles a different branch.
4. **Deform.** Selecting a mesh in Animate exposes its existing vertex-selection
   and transform controls plus a manual key beside that attachment in Tree.
   Disable topology creation/removal and binding authoring in Animate. Display a
   single attachment-owned Deform lane; a keyed pose contains the full represented
   deformation vector, not independent invented per-vertex key tracks. Editing
   keeps Setup vertices, dense bind positions/weights, UVs, triangles and edges
   bit-identical. Evaluate deformation into scratch geometry before image/mesh
   rendering; don't author the sampled result back to Setup. Start with proven
   unweighted data if weighted local-space/influence arithmetic remains unknown.
   Weighted support requires DATA's measured dense-vector mapping, not world
   deltas divided heuristically by weights. Active-none must hide art without
   discarding the attachment's deformation keys.
5. **Advanced tools follow their own semantics.** Keep Shift/Offset/Adjust and
   Frame/Auto/Favor/Store in the reference groups/order. Implement whole atomic
   commands for actual data changes, one history entry per completed gesture,
   with fresh revision/clip/frame and all selected stable IDs. Never silently
   clamp/linearize Bézier neighbors to make a partial key movement succeed.
   Retiming boxes, value-drag, handle Value/Shape, curve-preserving insertion,
   Favor modes and Store/Swap are separate scope items, not aliases for current
   translate/paste. Their interpolation/batch edge cases need paired review.

These are a staged FBones implementation contract; exact original behavior is
only claimed where explicitly observed. The shared central Setup/Animate HUD
stays visible and usable; avoid accidental accessible-name changes from glyphs.
Semantically empty draft clears must remain no-ops so focus/blur cannot invalidate
an unrelated frozen viewport gesture. Actual changed drafts/frame/clip still
cancel stale gestures. Keep slot/bone stored f32 normalization separate from
continuous playback/native sampled f64 and Setup byte-derived colors.

## Minimum unresolved observations and acceptance

No new original collection is requested by this note. If exact UI parity becomes
necessary, root can use one fresh owned editable copy and capture: Draw Order
manual key and two reordered slots at another frame; a selected mesh with a
translated vertex/manual deform key; Dopesheet/Graph containing their rows; one
empty-area marquee and its modifier behavior. Read actual labels/controls rather
than reuse stale coordinates. The retained data batches already settle their
represented schema cases and must not be repeated. Box persistence delay,
scaling/reversal collisions, advanced handle/favor arithmetic and weighted deform
manipulation remain unknown until the corresponding question is measured or
explicitly adopted as a documented/policy limitation.

Required regressions: marquee never authors; mixed key-ID selection survives
tabs; view fitting preserves stored bits; actual Draw Order drag changes overlap
pixels in Main/Preview while Setup/order/Clip endpoint IDs survive Undo/Save;
real vertex drag creates one deform key and changes mesh pixels while bindings/
UVs/Setup remain unchanged; weighted/inactive/none paths are tested independently;
key move/delete/clipboard/duplicate preserve identities and interpolation; native
binary Save/Close/Open and new UI-source original acceptance remain separate from
Linux renderer proof. Unsupported imported future families stay inspection-only
with full reserialization equality, not discarded for editing.

## Marquee before-code paired gate — pending0.9.2

Root published0.9.1/54128 after80LinuxUI/sixWindows groups and one new original
UI-source export; its protected normal user103180 must not be automated. This
new source work is pending0.9.2 and does not relabel the frozen0.9.1 evidence.
DATA independently approved the marquee identity plan before code:
`scene_edit.rs`330–360 allocates bone/slot keys from the same `ids.animation_key`;
`animation.rs`207–226 enforces global distinctness for existing mixed commands.
Only visible rendered key centers participate. Graph's four RGBA component marks
collapse to one stable key ID. Capture the prior selection at pointerdown;
Ctrl/Cmd unions hits with it. A normal drag replaces selection; a click on empty
space clears it. Escape restores that snapshot for a canceled live rectangle,
while idle Escape keeps existing deselection. Frame/clip/tab/disabled/track changes
cancel transient gestures; clip change clears IDs and deleted IDs are pruned.
Persistent boxes/scale/reversal and box-selecting tangent handles remain future
scope. The rectangle itself creates no authoring command/history/native fields.
Use scrolled content coordinates and retain existing key-drag behavior without
Ctrl/Cmd. Original exact gesture parity remains unknown; this is the documented
fallback plus the explicitly bounded FBones policy above.

## New Draw Order/deform original result and UI contract gate

Root's new inputeed254→editor492c import99632/export107276 both returned observed
exit0, exact4.3.26/Complete, retained handles and no metadata errors. The UI worker
independently compared actual runtime JSON against the frozen input/permutations:
`analysis/animation-next-ui-runtime-check.json` records265numeric comparisons,
zero maximum residual at the unchanged5.1e−6 bound. Four Draw Order keys retain
default/reverse-six/cycle/default full permutations despite canonical sparse
offsets omitting redundant input entries. The three U/W/Clip deform sequences
retain six keys each and scalar four-control outgoing progress curves. Sparse
ranges and omitted zeros expand equivalently; three initial equal-zero linear
segments export stepped without changing their full vectors. The separate Z
sequence retains three keys and exports one positive influence per vertex.

**JSON omission is not editor import pruning.** DATA's complete independent raw
parse of the same492c editor file proves Z retains both root/child binding
columns with weights[1,0], and all three raw deform vectors have dimension16.
Runtime JSON omits that zero influence. Thus dense vector dimension/order through
zero-weight membership is measured, while moving a zero-weight column to a
nonzero authored offset and its later GPU/export response is still unmeasured.
Preserve all dense offsets; the first vertex gesture may explicitly move only
positive influences while retaining dormant offsets. That is a declared FBones
policy, not a positive-only wire model or exact original gesture claim.

Controlled integration contract agreed before UI edits: root provides ordered
`viewSlots`, `setAnimationDrawOrder(order:slotIDs[]|null)` and
`insertDrawOrderKey()`. SlotHierarchy uses the sampled list in Animate and the
existing native Setup list otherwise; its visual front-to-back reversal remains
explicit. One existing list drag or arrow action produces a keyed/transient
permutation, never a Setup structural command. A manual key is adjacent to the
Draw Order heading. The global timeline lane is discrete and independent of any
selected bone/slot; reset is a real nullable/reset value, not an empty malformed
permutation. Draw Order key IDs join the same global native selection/clipboard
path after the native gate.

Root also provides `insertDeformKey(attachmentId)` and routes actual viewport
`moveVertices` into a native deform authoring context. The sampled selected
Mesh/Clip and its positions must reflect offsets before exposing numeric controls.
MeshTools in Animate offers vertex selection/movement and a manual deformation
key, with topology/UV/binding/reset controls unavailable. All control actions
retain authoring identity, frozen frame/revision and one completed native history
commit. Native deform DTO carries an attachment ID, dense offsets and one scalar
progress curve/control tuple. A Deform lane exposes progress interpolation and
key timing; it does not fabricate XY curves for every vertex. Complete weighted
mapping and scalar-control authoring remain subject to DATA's raw/native gate.
No product implementation is authorized by runtime JSON comparison alone.

## Mixed clipboard precision — paired before-code correction

DATA identified a real transport mismatch before the clipboard fix: a common
minimum from shortest-decimal DTO frame`.3` differs from its stored f32 frame
`Math.fround(.3)`, while geometry-family shift helpers already recovered f32.
A mixed paste can therefore leave a tiny nonzero first frame instead of the
requested zero. All source key frames and absolute Bézier control X values must
be recovered as stored f32 **before** the shared minimum and relative-time shift,
consistently across bone/slot/Draw Order/deform. Preserve the existing unused
Rotate axis sentinel and copy other stored values/control Y without introducing
new arithmetic. Capture the authored paste origin in native f32 frame units and
pause playback immediately for the paste action; continuous playback stays f64.
Do not independently re-round relative offsets before constructing the target
absolute frame: source normalization and native final storage are the relevant
boundaries. This corrects same-key identity and relative timing; it does not
change interpolation or establish new original clipboard gesture parity.
