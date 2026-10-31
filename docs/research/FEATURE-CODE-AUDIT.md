# Current feature/code audit and implementation boundaries

Code inspection: 2026-10-28, following the user's full expanded feature request.
This is the third, code/architecture audit. It does **not** substitute for either
required original-Spine 4.3.26 behavior/format audit or appearance/interaction
audit. No application implementation was changed and no new original-editor
behavior is claimed by this document. Root owns the feature task files and the
integration order; the two reference agents own reference conclusions.

Evidence labels below: **code-proven** means inspected FBones source, **existing
reference evidence** means the previously completed controlled observations,
**proposal** means an implementation recommendation, and **unknown** requires
the reference audits. Do not relabel a proposal as Spine parity.

## Baseline implementation versus requested scope

This baseline was captured before F300 implementation. Its completed source and
local checks are now recorded in `../tasks/F300-hover-highlight.md`; other rows
remain the initial code-audit snapshot.

| Requested behavior | Code-proven current state | Remaining work |
| --- | --- | --- |
| Hover bones in Weights/Tree; click highlights bone and influence | Weights list click sets `w.influence`; Tree click in Weights also sets influence and its row is colored. Vertex colors show that influence. Viewport bone drawing uses selected bone IDs, which are empty in non-Bones modes; no cross-panel bone hover state exists. | Shared transient hover/highlight and source-aware clearing; distinguish hover, pinned influence, bind checkbox and actual bone selection. |
| Select multiple scene images | Images **library** Ctrl/Shift selection and atomic multi-image placement exist. Scene uses one `selectedSlotId`; `imageAt` returns one frontmost visible slot, and one slot is dragged. | Scene attachment multiselect, active item, marquee/modifiers and atomic multi-item tools. Library selection is not a substitute. |
| Smarter automatic weights | Existing algorithm described precisely below; numeric/brush/smoothing/normalization and complete dense-weight persistence exist. | Reference-led quality algorithm/options and meaningful pose/shape/geometry acceptance cases. |
| Tree filters for bones / slots / attachments | Search and collapse exist. Rows represent bones and slots; the slot embeds the single attachment. | Kind filters and actual attachment rows, with filtered tree context and selection semantics from the UI audit. |
| Slot blending | Slot RGBA light tint/alpha exists and is drawn. No blend-mode model, edit operation, selector or renderer assignment exists. | Proven format enum/defaults, supported editor modes, draw-order-aware rendering and persistence. |
| Color | Saved bone colors and slot RGBA light tint are implemented. Attachment-specific color is fixed white in the current writer; dark tint remains unsupported. | Reuse existing color controls; do not repeat completed light-color work or imply all color properties already exist. |
| Clipping | Attachment enum accepts only Region and Mesh. No clipping model, edit operation, mask geometry/range or renderer path exists. | Clipping attachment inventory, weighted/unweighted geometry as evidenced, end-slot semantics, drawing/hit behavior and canonical persistence. |
| IK | Current Pose rotates/translates without stretching; full affine bones and weighted skinning exist. No constraint model or solver exists. | Full reference-supported IK workflow and solve cases, targets/order/mixes/settings and persistence. Do not call current Pose IK. |
| Physics/gravity | No simulation state, preview clock, fixed-step integration or physics records exist. Viewport renders on demand with `autoStart:false`. | Reference properties, order, reset/step semantics, stable simulation, preview controls and persistence; complete requested physics scope stays tracked. |
| Transform constraints | Direct world/group/local-scale editing exists. No persistent constraint records, targets or update ordering exist. | Reference-supported local/world and relative/absolute behavior, per-channel mixes/offsets, dependency order and persistence. |

Sources: `src/components/organisms/{SceneTree,WeightsPanel,SlotInspector}.vue`,
`src/stores/workspace.ts`, `src/domain/{project,images,meshes,rig}.ts`,
`src/viewport/{createViewport,ImageLayer}.ts`, `src-tauri/src/{rig,mesh}.rs`, and
`crates/fbones-format/src/minimal/{regions,meshes}.rs`.

## Automatic weights: exact present behavior

**Code-proven**, `src-tauri/src/mesh.rs:139` (`segment_distance`) and `:149`
(`bind`), called by `RigEdit::BindMesh` and `RigEdit::AutoWeights` in `rig.rs`:

1. Snapshot each vertex's **current posed world position**, using all of its
   current weights and full affine influence transforms.
2. Replace the binding list with the provided distinct bones. Auto Weights
   supplies the mesh's existing binding list. An empty explicit binding list
   unbinds to the owner with unit weight; Auto Weights has no selection/options.
3. For each vertex and bound bone, measure Euclidean distance to the world
   segment from that bone's origin to its full affine transformed local tip
   `(length,0)`. A zero-length bone is a point.
4. Sort by distance; retain at most **four** influences. Equal-distance ties
   retain binding-list order through Rust's stable sort.
5. Assign raw `1 / max(distance,1)^2`, then normalize. Thus the distance floor
   is **one world unit**, not a mesh/image-relative scale. All positive raw
   values contribute; this is not a single-nearest-bone assignment.
6. Reconstruct every influence's local position from the same current world
   vertex point. Positive influences therefore agree at this pose, preserving
   the current visible shape. Old independent per-influence bind offsets are
   replaced. Rebinding a posed/deformed mesh can consequently change its future
   deformation even when it does not visibly jump immediately.

There is no mesh-edge traversal, geodesic distance, silhouette/alpha boundary,
visibility/occlusion test, joint orientation policy, spatial smoothing pass,
locked-weight handling, selected-vertex restriction or user influence-count/
falloff option in this operation. The brush's separate Smooth mode averages
triangle neighbors; it does not improve Auto Weights. `normalized` uses an f64
sum and adjusts f32 residual on the largest component; a zero-sum valid
influence row falls back to the first influence. The valid profile requires a
nonempty binding list; this helper is not an empty-array API.

**Inferred from that code**, not a measured Spine difference: neighboring thin
limbs can influence each other through empty space; a long nearby segment can
attract many vertices regardless of topology; changing binding-list order can
change an exact fifth-place tie; uniform scaling across the one-unit floor can
change normalized weights. More/fewer triangles alone cannot inform this
distance-only algorithm. These are concrete investigation cases, not a claim
that a particular alternative algorithm reproduces Spine.

**Existing reference evidence** (`docs/FORMAT-MESHES-4.3.26.md`): dense weight
arrays, per-influence local positions and binding order were serialized and
accepted/exported by original 4.3.26. The old mesh UI lifecycle proves editing,
posing, persistence and undo. It does **not** establish Auto Weights algorithm
parity. Do not repeat the old oracle suite to claim the new algorithm verified.

### Cases needed before choosing a replacement

The format and UI agents should resolve, using fresh own controlled cases:

- Same mesh/bones/settings repeated; bind-list reorder with distinct distances
  and exact ties; one/two/five-plus possible influences, zero-length bones and
  vertices directly on segment ends/joints.
- A branched joint, crossing bones, two close parallel limbs separated by a
  transparent/concave gap, and a folded C-shaped surface. Compare identical
  vertex positions under different topology; this distinguishes geometric
  distance from topology-aware influence.
- Joint deformation after a known rotation/translation, rather than weight
  numbers alone: continuity, narrow-limb isolation and no immediate setup jump.
- Apply in setup versus an already posed/deformed mesh. Establish whether the
  original rebinds current shape, uses a retained bind pose, preserves offsets,
  or disallows the action in that state.
- Whole mesh versus selected vertices; bound versus newly chosen bones;
  available settings, locked values and whether repeat operations are undoable
  once and deterministic. Unsupported settings stay explicit unknowns.
- Translation/rotation, uniform and nonuniform scale, reflected/sheared parents,
  mesh density changes, disconnected components and rescaling around very small
  distances. Compare reference results numerically with export rounding noted.

Any proposed topology-aware solver must also have bounded memory/work at 256
vertices per mesh, 128 bones and 4,096 total vertices. Sparse zero influences,
finite nonnegative normalization, deterministic tie handling, shape-preserving
initial rebasing, cancellation and one undo entry remain mandatory. Smoothing
across disconnected islands or an unrelated explicit seam is not automatically
correct; the reference/quality case must decide its boundary policy.

## F222 is the shared data prerequisite

**Existing reference evidence:** `docs/SLOT-ATTACHMENTS-4.3.26.md` proves two
owned Region records, one owner slot, inventory independent from the nullable
active pointer. Current codec rejects that broader profile safely.

**Code-proven bottlenecks:** `Slot.attachment: Option<Attachment>`, the enum
limited to Region/Mesh, `region_order: Vec<slot-index>`, `SlotView.region/mesh`,
slot-keyed render nodes, native attachment editing by slot ID, resource scans,
history frames and mesh trace lookup all assume one attachment per slot.
Replacing only the tree display would leave persistence, edits and rendering
inconsistent. This is broader than renaming a UI row.

**Proposal:** first introduce stable session attachment identity/inventory and
one `activeAttachmentId | null` per slot, distinct from selected attachment(s).
Retain separate slot IDs, owner bone, slot draw order and exact inventory order.
Make edit targets explicit attachment identities. Carry all new state through
history, deletion/reparent remapping, save snapshots, image collection and
canonical reader/writer equality. Expose all inventory to Tree while rendering
and ordinary hit testing use only active alternatives. Selecting an inactive
attachment must not silently activate it unless that precise gesture is proven.

Before enabling the larger editable profile, add new mixed region/mesh,
active/inactive, owner changes, rename/delete/order and save/reopen cases, then
unchanged `.spine` copies accepted/exported in original 4.3.26. No unsupported
skins, linked meshes, animations or constraints may be silently dropped.

## Independent work boundaries after each pair of audits

These are implementation proposals, not permission to skip the two audits.

1. **Codec/identity owner:** F222 and each new proven constraint/clip/blend
   record, shared DTOs and `rig.rs` authoritative mutations/history. One owner
   at a time for those shared files; avoid parallel broad enum/model rewrites.
2. **UI/selection owner:** pure shared selection/hover/filter helpers, scene
   and tree state, controls and translation strings. Hover and filtering are
   ephemeral, not document revisions or undo actions. Existing binding choice,
   influence selection and viewport bone selection stay separate.
3. **Geometry/solver/render owner:** pure Auto Weights core, clipping geometry,
   pose/constraint evaluation, corresponding local previews and renderer nodes.
   Use new independent modules and fixtures to avoid simultaneous edits in the
   central controller/model. Root integrates callbacks/shared declarations.
4. **Coordinator:** per-feature task/evidence files, compatibility gates,
   shared source handoffs and dedicated Windows interaction/visual comparison.
   Actual capacity is four total agents; rotate the two audit agents into these
   ownership roles rather than pretending extra workers exist.

Hover/highlight research can proceed without F222. Scene multiselect math can
be developed against a pure attachment-view interface while identity work is
underway, but its actual renderer/store integration must await that interface.
Blend modes can be an independent slot property once tag/default evidence is
complete; they must preserve inventories. Clipping depends on attachment kinds
and active selection plus draw-order range semantics. IK/transform constraint
solvers can be pure independently tested modules while their exact records are
researched. Physics needs a coherent evaluated-pose/preview-clock interface.
This order preserves the **whole** requested scope, including all three
constraint/physics families; it is not a smaller MVP substituted for the goal.

The paired UI audit now records documented Tree filtering details in
`FEATURE-UI-4.3.26.md`: Bones disabled flattens slots in **draw order**, without
reinserting disabled bone ancestors; Attachments disabled can project viewport
attachment selection onto its owner slot. The underlying typed selection and
active pointer remain separate. This guides helper design once the paired
behavior/data gate is complete; it is not an exact-patch GUI observation.

## Evaluation and preview architecture to settle before solver integration

**Code-proven:** native `rig::poses` currently performs hierarchy composition
only, mirrored in frontend `worldBones`. Mesh skinning and image placement use
those same affine bases. Viewport gestures preview locally and commit one RPC;
the renderer has no continuous animation loop or simulation state.

**Proposal:** separate persistent setup values from evaluated pose and transient
simulation state. Derive a validated constraint dependency/update schedule from
the exact reference model. Evaluate hierarchy, constraint-modified bones and
their affected descendants in the proven order, then skin vertices and draw.
Do not permanently bake an evaluated pose into setup bones every frame. Stable
constraint/target IDs must survive reorder and undo, with index remapping only
at the binary boundary. Dangling references, unsupported cycles/settings and
invalid matrices fail atomically; deletion policy needs reference evidence.

A pure Rust rig-evaluation module/crate is a good authority boundary. A frontend
WASM build of that same core would allow local interactive evaluation without
per-frame IPC and avoid maintaining two distinct solvers. This is a proposal,
not an installed toolchain claim. If a TypeScript preview mirror is chosen,
require shared input/output fixture vectors and explicit numeric tolerances for
every solver phase, including affine/mirrored parents and physics reset/state.
Native final edits remain authoritative. Send project/constraint data on
revision changes, not full scene snapshots or vertices through IPC each frame.

Physics needs a fixed-step accumulator, bounded catch-up, explicit pause/reset/
single-step state and a scheduler active only while needed. The reference step
rate, damping/inertia/gravity units, constraints order, time scaling, teleport/
seek reset and initial state are **unknown until audited**. Do not choose an
arbitrary 60/120 Hz and call it the original behavior. Do not serialize transient
velocity/accumulator values into guessed fields. Hidden-window resume must not
inject an unlimited elapsed interval; preview determinism needs controlled
step counts independent of display refresh rate.

Timeline authoring is still tracked. Setup constraint creation and a controlled
physics preview clock can be independent of a full keyframe editor if the user
prioritizes them first; do not block the newly requested work by retaining an
obsolete roadmap dependency. Conversely, do not claim animated mix/attachment/
physics keys implemented until F105 and their format cases actually exist.

## Feature acceptance cases beyond codec roundtrips

- **Hover/Tree/Weights:** pointer enter/leave across panels, pointer-capture and
  Escape, document close/reopen, deleted hovered bones, influence locked by a
  click versus transient hover, unbound bones and no dirty/revision/history
  change from hover. Check actual viewport bone and row highlights together.
- **Scene image multiselect:** Ctrl/Shift/marquee selection, overlap/frontmost
  picking, selected inactive alternatives, hidden/locked/clipped objects and
  deleting one item. Batch translate/rotate/scale where requested across
  different rotated/sheared parents, mixed region/mesh attachments and weights;
  nonrepresentable local region transforms must not be silently approximated.
  Verify one commit/undo and save waiting for the complete gesture.
- **Filters:** all three type toggles alone and combined, search/collapse,
  selection/scroll behavior, parent context, draw-order view independence and
  attachment activation. Filtering must not hide persistent data from saves.
- **Blending:** every proven mode over an owned checker/background with opaque
  and partial-alpha PNGs, tint/opacity, reversed draw order, meshes and clipping.
  Verify actual WebGL pixels/premultiplication and ordinary color UI separately;
  serialized enum acceptance alone is not visual blending verification.
- **Clipping:** convex/concave polygons, transformed/weighted geometry if
  supported, active/inactive clip, range ending at a slot, moved/end-slot
  deletion and overlapping ranges per reference behavior. Draw, hit testing,
  selection overlay and export must agree; a global mask on all slots is
  insufficient. Inspect allocation/batching behavior and strict CSP.
- **IK:** each reference-supported chain type, reachable/unreachable targets,
  bend direction, mixes/softness/stretch/compress if present, zero lengths,
  mirrored/nonuniform/sheared parents, target movement, ordering interactions
  and child attachment/mesh results. One-bone aiming alone is not the whole IK
  feature. Compare numeric solved poses against original controlled results.
- **Transform constraints:** each proven space/mode, per-channel offset/mix,
  affine parent/reflection, multiple constrained bones, ordered constraints,
  mix zero/one/intermediate and safe dependency failures. Local fields and
  evaluated world bases need separate comparisons.
- **Physics:** zero force/rest, gravity direction/units, displaced target,
  stiffness/damping/inertia/mass settings as actually supported, wind/limits if
  present, repeated fixed-step sequences, reset/pause/seek/resume and changing
  hierarchy/parameters during preview. Check bounded long runs and continuity,
  native/frontend parity, user-visible controls and persisted definitions.

Every feature task must name its two audits and distinguish proven binary,
direct interaction, documented behavior, implementation checks and outstanding
platform/oracle checks. Reuse completed evidence; collect only missing cases.
