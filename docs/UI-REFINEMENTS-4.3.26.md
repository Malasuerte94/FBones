# FBones refinement audit — Spine 4.3.26 reference

Audit date: 2026-10-28. This is an interaction/design specification, not a claim
that new format fields or original-editor checks have passed.

## Evidence and confidence

- **Screenshot-proven:** all three files in `spine_pictures/` were opened at
  original resolution. `Spine_5qk2u6L0xb.png` shows the full viewport and bottom
  toolbar; `Spine_qINTitRPSQ.png` is its toolbar closeup;
  `Spine_eH8VIB7TXl.png` shows a bone's tree properties. Original personal artwork
  is reference-only and must not become application assets or test artwork.
- **Documented:** current official Esoteric user-guide pages linked below. The
  current changelog lists stable 4.3.26 and 4.3.27 as unreleased. Guide pages do
  not pin their own screenshots to an exact patch. Treat the guide as documented
  guidance and the local 4.3.26 program as the final behavioral/persistence oracle.
- **Inferred:** recommendations implementing the user's requested workflow.
- **Unknown:** exact original algorithms, undocumented defaults and persisted
  field mappings until checked in the installed 4.3.26. No older editor version
  was used to infer behavior.

## What the supplied screenshots establish

The toolbar is anchored inside the viewport near its bottom-left edge. It has
three conceptually distinct groups: Pose/Weights/Create; Rotate/Translate/Scale/
Shear with numeric rows; and Local/Parent/World axes. Adjacent Bones/Images/Pixels
controls are compensation controls, not additional transform modes. A breadcrumb
above the toolbar identifies the selected bone and its ancestors. Several bones
have different viewport colors, and the active bone is cyan. The separate bone
properties screenshot shows Length, an icon selector/size, Color, inheritance
checkboxes and actions for parenting/splitting/renaming/deleting.

The pictures **do not** show a Trace dialog, inner trace settings, mesh-tool
panel, multi-select gesture, folder picker or Enter-key behavior. Do not label
those interactions screenshot-verified.

Design direction for FBones: preserve its current neutral gray tokens, Segoe UI
compact text, 22–26 px controls and own icons. Move task-specific manipulation
into one contextual bottom toolbar rather than add another permanent top row.
Keep the asset hierarchy and properties on the right. The user's requested
workflow takes precedence over copying a documented shortcut or default.

## Images, attachments and slots

The Images tree node chooses a directory; its file list is an asset browser,
not a list of already instantiated scene items. Relative image paths and nested
folders are documented. Dragging a file into the viewport creates a region and
slot; dragging to a tree bone/slot supplies a destination. Folder files should
not create slots merely by appearing in the browser. See
[Images](https://en.esotericsoftware.com/spine-images).

A slot belongs to a bone and owns attachments; it has no transform of its own.
At most one attachment is active per slot. Draw order is a slot list independent
of bone hierarchy. Slot color tints the rendered attachment and its alpha;
bone color is editor visualization. The current FBones one-attachment slot
profile must stay explicit until multiple attachments are independently tested.
See [Slots](https://en.esotericsoftware.com/spine-slots).

FBones acceptance: choose a folder at Images; see usable PNG files and subfolders
without altering the scene; drag a file to an arbitrary viewport point and get
one slot/region at that world point, under the selected destination bone (user
workflow preference). Drag cancellation has no model/history effect. Missing or
unsupported files display a useful state. Save/reopen and Save As preserve the
correct image identity and resources. Remove the primary Import PNG toolbar
button; keep an Images-node Browse/change-folder action and optional File-menu
fallback for keyboard accessibility.

## Contextual mesh editing and topology

The official mesh guide distinguishes normal attachment manipulation from Edit
Mesh. The edit tools are Modify, Create and Delete. Create clicks add vertices;
Create drags form edges. A separate New action constructs a hull, closing it at
the first vertex. Reset recreates the four-corner mesh. Trace constructs a hull;
its documented controls include detail, concavity, refinement, alpha threshold
and padding. The guide's Generate action adds useful interior points and may be
repeated. Exact optimization algorithms are not published. See
[Mesh attachments](https://en.esotericsoftware.com/spine-meshes).

FBones acceptance: Convert to mesh enters a contextual viewport editor. Its
bottom toolbar exposes Modify/Create/Delete, Trace, Inner trace and Done. The
existing right Mesh Tools dock can retain soft-selection/settings controls.
Dragging from an existing vertex to a new position creates the point and its
connecting edge atomically. Dragging to an existing vertex connects them once.
Hover previews the proposed edge and snap target. Closing a new hull commits
only a valid polygon; incomplete draft hulls never enter the persisted format.
Escape cancels the draft before any mode/selection transition.

Every accepted topology change must yield a valid noncrossing triangulation
with preserved explicit boundary/internal constraints. Improve diagonal choice
using a bounded quality criterion, not just a triangle fan. The displayed preview
must agree with the committed result. Extremely long edges across detailed
regions should be reduced using useful interior samples, not arbitrary point
inflation. Tests need concave hulls, thin limbs, holes/disconnected islands,
near-collinear points, repeated samples, crossed constraints and hard limits.

Existing FBones caution: mesh-mode vertex dragging changes bone-local posed
positions while UVs stay fixed; its triangulator works in UV space. Improving
only the triangulator cannot fix all long world-space triangles under this
semantics. Establish a distinct setup-mesh edit operation or an explicit
Deformed mode. Do not silently mix UV editing and pose deformation.

## Trace and inner trace

**Documented:** alpha threshold excludes lower-opacity pixels during hull
tracing. **Unknown:** the exact 4.3.26 threshold scale, default values, sampling
and simplification algorithm. **Not established as a Spine feature:** an action
specifically called Inner trace with the user's proposed interior line/large
surface detection. Implement that as the requested FBones improvement rather
than claim pixel-for-pixel reproduction of an undocumented Spine algorithm.

FBones acceptance: show threshold and tolerance/detail controls with a cancellable
preview; a translucent shadow disappears as threshold increases while solid art
remains. Keep narrow opaque features when detail permits. Fully transparent
images, an empty threshold result, huge images and excessive vertices fail
cleanly without changing the model. A fresh preview supersedes older work.
One Apply is one undo entry. FBones remeshing preserves binding columns and
interpolates existing weights/positions; its preview should state that topology
changes and deformation needs review. A separate destructive Reset operation
must not be confused with tracing. Verify actual persistence and undo behavior.

Inner trace acceptance: detect stable interior boundaries/features under a
separate tolerance and spacing limit; preview proposed points/edges; avoid
flooding large flat areas with unnecessary vertices; preserve the outer hull.
A flat opaque rectangle produces very few interior points. A high-contrast
interior stripe produces useful samples/edges. Noise and a faint shadow should
be suppressible. The output must obey the same vertex/constraint budgets.

## Bone tools, selection and numeric edits

The screenshots prove separate Pose and transform modes. Official documentation
states that Pose rotates toward its target while maintaining bone length, and
that length adjustment at the selected tip is a distinct setup interaction.
Enter/Tab applies numeric fields; Escape clears selection. Multiple items use
Ctrl/Cmd selection and box selection. See
[Tools](https://en.esotericsoftware.com/spine-tools).

User-requested FBones differences must be intentional: retain **B = Create**
(the guide currently documents B = Pose/N = Create). A click in empty space
creates a small bone, requested here as length 12; the guide's documented click
creates a zero-length bone. Clicking an existing bone during Create chooses
that parent and creates nothing. Dragging from the chosen parent/tip draws a
child. Escape cancels a drag/draft, clears selection and returns to Translate;
this satisfies both the user's “let me move” and “deselect” requests.

FBones acceptance: Rotate preserves length and origin; Translate preserves
length/rotation; Length mode changes length separately. Pose dragged by its body
rotates only; its origin translates it. Group translate/rotate is one native
edit, and selected descendants must not receive the same ancestor transform
twice. An active/pivot bone determines the group pivot. Ctrl/Cmd toggles items;
Shift range in Tree is distinct from Ctrl/Cmd toggling. Box selection has a
visible marquee and produces the same selection in Tree and viewport.

Scale/shear need a tested affine transform model and binary persistence. Do not
show enabled buttons that approximate them by changing length. Parent/world
axes must be based on actual matrices once nonuniform scale/shear is supported.
Spine Pose's chain IK behavior is documented but should not be claimed until
implemented and tested; single-bone rotate-with-fixed-length is the first useful
pose behavior.

BoneInspector's current Enter handler only blurs and relies on a subsequent
change event. The reported failure should be addressed with an explicit commit
path that also serves blur/Save and prevents duplicate edits. Invalid staged
values must remain visible and block Save; Escape restores authoritative data.

## Rename, colors and tree dragging

Tree documentation supports Ctrl/Cmd toggle selection, Shift ranges, F2 or a
node double-click to rename, and dragging nodes to change parent. Draw-order
rows reorder slots rather than alter parenting. See
[Tree view](https://en.esotericsoftware.com/spine-tree).

The bone properties screenshot explicitly shows a Color control; the guide
supports applying a chosen color to several selected bones. See
[Bones](https://en.esotericsoftware.com/spine-bones). A hierarchy-based Auto color
scheme is a user-requested FBones improvement, not a verified original default.
Implement it deterministically: a branch shares hue, descendants vary lightness
within readable bounds, manual colors win until Auto is restored. Slot tint and
bone display color must remain separate controls and persisted fields.

FBones acceptance: F2, double-click and Properties rename share one validated
command; Enter commits and Escape cancels. Tree drop previews a valid parent,
rejects self/descendant cycles and keeps world pose. Slot-to-bone drop preserves
attachment appearance. Draw-order drag shows an insertion marker and updates
only order; undo and binary reopening restore the exact order. No-op drops do
not consume undo steps. Auto-scroll at tree edges and keyboard alternatives
keep long hierarchies usable.

## Implementation/check order

1. Fix Enter/rename, parent selection during Create, click-created small bones,
   Escape, separate Pose/Rotate/Length and multi-select atomic transforms.
2. Add the Images library tree and viewport drop path, with real slots created
   only on placement. Keep native ownership/revision checks and resource safety.
3. Add contextual mesh creation with connected vertices, valid hull drafts,
   live preview and constrained quality triangulation.
4. Add bounded alpha Trace and feature-aware Inner trace with preview/apply/undo.
5. Finish affine scale/shear, colors, tree reparent/reorder dragging and its
   persistence comparison cases. Do not mark unsupported fields compatible.
6. Exercise native Windows UI, accepted file reopening and only the new
   original-Spine comparison cases. Do not repeat completed foundation batches.

No native application was launched, user project modified or original artwork
copied during this audit. The sources above establish documented interactions;
local screenshots establish appearance; this document's acceptance checks are
proposed FBones behavior until their implementation results are recorded.
