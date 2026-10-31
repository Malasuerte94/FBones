# F309 parenting, Tree and dock panels: UI audit

Recorded 2026-10-29 before dependent implementation. Paired data/behavior audit
is coordinated separately. No original inputs, user-window interaction, accepted
batch repeats, production edits or new application launches occurred here.

## Local evidence inspected first

- User references `spine_pictures/Spine_eH8VIB7TXl.png`,
  `Spine_5qk2u6L0xb.png`, `Spine_qINTitRPSQ.png`, reopened with `view_image`.
  Their visible controls are useful, but these cropped images do not themselves
  establish the editor patch version or operation outcomes.
- Owned exact4.3.26 capture
  `.local/research/feature-ui/transform-inspector-observed.png`, plus previously
  accepted constraint/attachment findings in `FEATURE-UI-4.3.26.md` and
  `TRANSFORM-MATCH-UI-4.3.26.md`. Original captures remain private.
- Current `src/App.vue`, `SceneTree.vue`, `DockPane.vue`, `AppIcon.vue`,
  `src/styles.css`, `src/domain/treeProjection.ts` and viewport draw code.
  Code inspection proves our implementation, not the reported runtime symptom.

## Findings by requested fix

### 1. P enters parent picking for bones and images

**Observed:** the user crop shows a Parent button next to New and Split in bone
properties. Own exact4.3 attachment inspector captures previously established
Parent controls; accepted inventory evidence distinguishes attachment selection
from slot activation. Existing captures do not demonstrate the complete P
gesture, multiple mixed selection, invalid picks, or cancel behavior.

**Official documentation, patch-unpinned, checked after local evidence:**
[Bones / Parent](https://en.esotericsoftware.com/spine-bones#Parent) and
[Attachments / Set Parent](https://en.esotericsoftware.com/spine-attachments#Set-Parent)
describe P or Set Parent, then clicking the new parent in Tree or viewport.
[Tree / Drag and drop](https://en.esotericsoftware.com/spine-tree#Drag-and-drop)
describes drag reparenting as equivalent to Set Parent. Attachments belong to a
slot, which belongs to a bone; this shortcut must not erase that distinction.

**Current gap:** `App.vue` maps P to Pose. The user's explicit request takes
priority: P must enter parent picking. Keep Pose available through its button
until another conflict-free shortcut is deliberately chosen; the current
[Tools guide](https://en.esotericsoftware.com/spine-tools) lists B for Pose and
N for Create, while FBones already uses B for Create. Do not silently reassign
that second existing shortcut while implementing P.

**Own safe interaction proposal, subject to paired native contract:** capture
the selected stable IDs and document/revision when P begins; keep their
selection visibly highlighted, show a short choose-parent hint and a valid
candidate hover. Intercept a bone click in Tree or viewport before ordinary
selection/transform behavior. The same action path serves P and a Parent
button. Escape cancels without mutation; stale document/revision, deleted
source, changed selection, unsupported mode or invalid ancestry cancels or
rejects atomically. Blank clicks do not author a bone. Group completion uses
one native history action, with no per-pointer-frame edits. Exact original
group/cancel/history details remain unknown; these are FBones requirements.

For image selections, a click on a bone is explicitly requested by the user,
but the slot operation must be decided by the paired audit. Moving a selected
attachment, moving its entire owner slot, or creating a destination slot can
affect different unselected alternatives. Do not guess activation/collision or
weighted-binding behavior from the generic Set Parent documentation. Images
library assets are not authored attachments and cannot use this operation.

### 2. Tree New menu does not visibly open

**Observed reference:** the user bone-properties crop has a compact New button
with a plus icon; own exact4.3 Transform inspector also has New at its bottom.
No accepted local screenshot shows this dropdown expanded, so its exact
context-dependent contents/keyboard model are unknown.

**Confirmed code:** SceneTree toggles `newMenu`; the popup has `bottom-full`,
but shared `.menu-popover` applies `top-full`. Ancestor `.dock-pane` also has
`overflow-hidden`. Top and bottom constraints together can stretch or clip the
popup instead of placing it upward. **Inferred likely defect**, not an actual
reproduction yet. The button can additionally be disabled by `!sceneEditing`
or busy state; check that separately from placement.

**Own correction contract:** the popup must have one vertical anchor, fit the
visible pane/window, and remain above clipping boundaries (a properly anchored
overlay/Teleport is an option). Keep available New Slot/Clipping/IK/Transform/
Physics actions and their real disable reasons. Verify an actual mouse click
opens a measurable visible menu; keyboard activation, Escape and outside click
close it; choosing an item opens the corresponding existing creation flow.
Do not treat a toggled boolean alone as acceptance.

### 3. Bone relationship line origin

**Confirmed current behavior:** `createViewport.ts::draw` draws each relationship
from `parent.worldX/worldY` to `child.worldX/worldY`, followed by the two bone
glyphs. The tapered glyph ends at `tipX/tipY`; this is independent from the
relationship line.

**Reference limit:** available user character and own fixture captures contain
overlapping bone glyphs, guides and constraint graphics; no independently
isolated endpoint comparison is accepted here. They do not prove that a link
must start at the parent tip. The official
[Tools / Creating bones](https://en.esotericsoftware.com/spine-tools#Create-tool)
allows a child origin anywhere, and [Bones / Length](https://en.esotericsoftware.com/spine-bones#Length)
describes length as cosmetic except for IK, paths and Auto weights. This also
does not identify the visual connector endpoint.

Do not change hierarchy transforms, length, child coordinates or skinning to
answer this visual question. A parent-tip to child-origin connector is an
explicit possible visualization choice, not established exact4.3.26 parity.
The paired data/reference worker may settle this with existing cleaner evidence.

### 4. Remove bottom-right Project properties

**User-directed change:** remove the `project-info` details block in App's
properties area (format/version/file size/help). Keep the actual selected-item
inspector: the request removes project metadata, not bone/slot/attachment/
constraint editing. Own exact4.3 captures show selected constraint properties
under Tree; this does not require a separate project-information block.
Do not hide save/inspection-only errors needed to explain editability.

### 5. Replace the bone icon

**Observed:** the user crop has a narrow tapered bone glyph for bone4; some
zero-length bones show a crosshair, and the viewport shows narrow tapered bones
with origin circles. Different icons exist in the reference. The
[Bones / Icon](https://en.esotericsoftware.com/spine-bones#Icon) guide documents
configurable bone icons and a crosshair for zero-length bones; patch-unpinned.

**Current gap:** shared AppIcon `bone` is a centered diamond with a horizontal
line. This is used by toolbar, Tree and buttons; the viewport is already a
separate tapered polygon renderer. Replace the UI glyph with our original,
compact tapered-bone SVG, legible at14–16px and preserving currentColor. Avoid
copying original artwork. The user's wording does not by itself authorize
inventing a persisted per-bone icon field or changing viewport hit geometry.

### 6. Logical Tree guides

**Observed:** the user Tree crop clearly shows ancestor vertical guides and
elbows connecting the appropriate expanded parent to each child. Lines stop at
the last visible sibling rather than continuing through unrelated branches.
Own exact4.3 capture shows the same hierarchy-guide pattern around root,
Constraints/remap and Draw Order. This is visual evidence, not a new parent
model.

**Current gap:** SceneTree applies only `row.depth*13` left padding; it does not
draw ancestor continuation/elbow lines. Projection already supplies stable
`key` and projected `parent`. Derive guides from the **visible projected tree**,
including search, collapsed branches and category filters. Do not infer
continuation solely from depth: hidden slots/bones change effective parents.
Constraint grouping needs an explicit logical header parent or its own group
boundary; do not connect it to the last object row. Guides are presentation
only and must not intercept Tree selection, expansion or drag/drop.

### 7. Views, constraint settings, resizing and moving

**Observed exact4.3.26:** Views exists at the top right; Weights, Mesh Tools,
Tree, Skins and Preview have titled tab areas and panel menus. Transform,
Physics and IK settings are reached by selecting the corresponding constraint
in Tree, then editing the inspector beneath that Tree. The existing captures
do not show independent IK/Transform/Physics entries in the Views popup, nor
do they establish a complete dock drag/resize gesture.

**Official documentation, patch-unpinned:**
[Views](https://en.esotericsoftware.com/spine-views) describes opening/focusing
views from Views, dragging a tab to a new position with a placement preview,
tab grouping, resizing edges and minimizing/closing. Views stay inside the
main application window. This supports in-window docking and both width and
height controls; it does not prove our user's requested dedicated constraint
views already exist in4.3.26.

**Current gap:** Views toggles only Weights, MeshTools and combined Tree/
Properties. DockPane has a vertical width separator only (170..420px bounds),
no title drag or height separator; `.properties-pane` has fixed42% height.
There are no separate dedicated constraint settings panels. Existing constraint
creation is already available through Tree New; changing a view checkbox must
not create a constraint or confuse creation dialogs with editing panels.

**User-requested extension, not an original parity claim:** expose useful IK,
Transform and Physics settings views. Opening a view should reveal/focus
existing constraints of that type, preserve project selection unless the user
chooses an item, and show an actionable empty state when none exists. Name
Physics consistently; gravity is one physics property, not another duplicate
constraint type. Reuse the same authoritative inspector/actions, not copied
local project state. The coordinator must choose how type panels pin/follow
the selected constraint when several panels remain visible.

**Own minimal docking contract:** draggable panel header/tab, visible drop
preview, reordering and split placement inside the app, independently bounded
horizontal and vertical split handles, and a recovery/reset layout action.
Keep content usable after viewport resize or panel toggles; restore hidden
panels without losing inspector drafts. Pointer capture/cancel must release
on blur/unmount; keyboard separators need axis-appropriate keys and accessible
names/values. Layout changes remain local UI state, never project history or
format fields. Exact original persistence of workspace layout is unmeasured.
Do not claim native detached multi-monitor windows: neither the request nor
the primary guide requires them.

## Evidence limits and integration order

The shortcut and dock gestures above are documented separately from direct
exact-patch captures. New popup clipping is a source-supported hypothesis until
actual UI reproduction. Original attachment-to-bone group policy, isolated
relationship-line endpoints, expanded New contents, dock persistence and
standalone constraint Views remain unproven. No synthetic background research
input from older batches substitutes for these observations.

Proceed after the paired data handoff: settle the native parenting operation,
then unify shortcut/button/Tree/viewport pick handling; repair and verify New;
remove project metadata and replace icon/add projected guides; finally integrate
the requested panel/docking surface with real interaction tests. Native
parenting must retain geometry and authored inactive inventories according to
its explicit contract; UI-only panel changes must not mutate any project data.

## Integrated docking failure, before the dependent fix

The coordinator's first integrated real Chromium/native-session run passed
34/35 workflows. The stack/split test failed after a real pointer drag of Mesh
Tools into the Scene column: its expected content was missing, while Tree and
Properties remained below an empty full-height placeholder. Private trace,
failure screenshot and log are under `.local/playwright/test-results/` and
`.local/f309-ui-integrated.log`; this is FBones evidence, not original parity.

Independent source/trace reviews by the coordinator and UI worker identify a
portal identity bug: the old Mesh column and target DOM element are removed,
but the newly created target in Scene has the same selector string. Vue's
Teleport therefore keeps its unchanged target reference instead of resolving
the replacement element. The planned correction makes the target selector
depend on both stable panel ID and owning column ID, while retaining the panel
component's stable key. This changes the portal destination without remounting
the editor, weakening the assertion or replacing real mouse input. A new
focused coordinator run is required before marking the fix passed.
