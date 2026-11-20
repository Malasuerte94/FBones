# FBones 0.10 and Spine Professional 4.3.26 feature comparison

This audit covers the editor workflows in FBones 0.10.0 (`v0.10.0-beta.2`),
the declared game runtime, and FBones-specific integrations. It uses current
FBones source and screenshots, retained exact-version original CLI, GUI and
binary evidence, and a new read-only REA inspection of the installed artifacts.
No new editor gesture or numerical parity was measured. The reference remains
Spine Professional 4.3.26. [Release checkpoint](../STATE.md), [task inventory](../TASKS.md)

**Observed** means a retained controlled observation in the exact original.
**Visual** means the supplied screenshot shows a control or layout. Its patch
identity and the behavior behind the control are unconfirmed unless linked to
exact-version evidence. **Documented** identifies patch-unpinned guidance.
**FBones policy** means a current implementation choice. **Open** means a gap
in implementation or exact-version evidence, as stated in the row.

## Setup, authoring and project files

| Feature | FBones and exact reference evidence | Difference or open boundary |
| --- | --- | --- |
| New, Open, Save and Undo | Native lifecycle, revision guards, safe Save As and resource copying. The original accepted eight independently encoded minimal projects and 20 independently encoded Scene cases in their declared profiles. [Minimal format](../FORMAT-4.3.26.md), [Scene format](../FORMAT-SCENE-4.3.26.md#proven-scope-and-limits) | FBones guards the original `.spine` source and keeps well-framed unsupported projects available for inspection. One 125-bone reference project re-encodes with exact payload equality. A fresh original acceptance check for that broader profile remains open. [Project admission checkpoint](../STATE.md#previously-accepted-delivery-and-profile-boundaries) |
| Bone creation, naming and transform tools | Bone hierarchy, affine transforms, Pose and Length, local Scale handles, world Shear, individual/group rotation, rename and history are delivered. Four extended bone inputs were accepted and exported by the original. [Bone and editor tasks](../TASKS.md), [bone controls](../UI-REFINEMENTS-4.3.26.md#bone-tools-selection-and-numeric-edits) | FBones policy binds both `B` and `N` to Create and makes a length-12 bone on empty click. The patch-unpinned Spine guide describes `B` as Pose, `N` as Create and zero length on click. Exact original modifier, gizmo and numeric-draft equivalence is open. |
| Parenting, scene selection and placement | FBones supports Tree and viewport parent picking, group edits, independently selected placed attachments and PNG library selection. Exact original row selection and attachment activation are separate. [Parenting policy](F309-PARENTING-POLICY.md), [original selection](FEATURE-UI-4.3.26.md#controlled-exact-version-original-gui-observations) | FBones preserves authored world geometry during parenting and splits a partially moved slot to protect the alternatives left behind. Original constrained parenting, inactive-group pivot lifetime, transparent hit testing and the complete group gesture set are open. |
| Tree, hover, Views and docks | Observed original Tree white hover coexists with cyan selection. Combined kind filters retain selection when the row is hidden. FBones implements those bounded workflows. [Original controls](FEATURE-UI-4.3.26.md#controlled-exact-version-original-gui-observations), [dock audit](F309-PARENTING-PANELS-UI.md) | FBones has separate movable/resizable constraint docks. Exact original hover timing between panes and availability of those individual dock entries remain open. |
| PNG library, slot activation and draw order | Folder-backed PNGs, placement, alternative attachments, one nullable active attachment and slot draw order are implemented. A/B/none is observed in original files and GUI. [Slots](../tasks/F222-slot-attachments.md), [Draw Order evidence](../FORMAT-SCENE-4.3.26.md#animation-profile-through-draw-order-and-deformation-092) | FBones can transfer an alternative into an existing slot while preserving the destination activation. Original drop activation and path-edit gestures for different states are open. |
| Region path and image sizing | In the controlled replacement case, original pose PNG and FBones display retained a stored 96×96 Region. Original runtime JSON reported the replacement PNG's natural 160×48 size. [Region path comparison](ATTACHMENT-PATH-SIZE-UI.md) | Editor bounds and runtime export dimensions differ in that original sample. FBones uses its stated preserve-bounds policy for path changes. The exact interactive swap/resize rule is open. |
| Slot color, opacity and blends | Normal, Additive, Multiply and Screen and independent light RGBA are observed and implemented. The FBones renderer and original export were checked for the supported profile. [Blend evidence](../tasks/F304-slot-blending.md) | Animate supports combined light RGBA and bounded linear two-color. Separate RGB/alpha and nonlinear two-color remain open. See the Animate rows below. |
| Mesh vertex/edge editing and tracing | Setup geometry editing, triangulation, soft selection, outer trace and native persistence are delivered. Fourteen original cases cover the bounded mesh format. [Mesh tasks](../TASKS.md), [mesh format](../FORMAT-MESHES-4.3.26.md) | FBones Inner Trace is its own authoring feature. The original Trace algorithm and detailed equivalent gesture semantics are open. Scene mesh capacity is 1,024 vertices under separate aggregate and index guards. [Trace audit](../UI-REFINEMENTS-4.3.26.md#trace-and-inner-trace), [capacity](../FORMAT-SCENE-4.3.26.md#current-fbones-mesh-capacity) |
| Binding, Auto Weights, numeric and brush edits | Dense binding and original export are verified. Five original Auto cases establish selected scopes and transient lock behavior. FBones supports numeric/direct/brush edits, scoped Auto and locks. [Weights](../tasks/F302-auto-weights.md) | FBones uses its own topology-aware distribution and insertion/editing policies. Exact original coefficients, brush behavior and new row behavior are open. |
| Clipping and weighted clipping | FBones supports range, transforms, Convex/Inverse, polygon weights and deformation in its profile. Exact original GUI preserves a disabled Convex value. One deformed concave comparison matched all 1,082,200 measured interior pixels. [Clipping](../tasks/F305-clipping.md), [original controls](FEATURE-UI-4.3.26.md#controlled-exact-version-original-gui-observations) | Richer overlap/range and brush semantics are open. FBones validates active ranges and preserves a separate inactive attachment inventory. |
| PSD import | FBones imports flat PSDv1 RGB8 Normal RAW/PackBits in one revision and Undo, retaining layer positions, order, visibility and opacity. Exact reference evidence establishes passive import metadata. [PSD task](../tasks/F312-psd-import.md), [reference metadata](PSD-IMPORT-DATA-GATE-2026-11-11.md) | Center-at-bone placement and explicit refusal of unsupported compositing are FBones policies. Original picker, placement and appearance rules are open. |

## Constraints

| Feature | FBones and exact reference evidence | Difference or open boundary |
| --- | --- | --- |
| IK | One/two-link IK, ordered solve, target editing and native persistence in the Normal-inheritance profile. Controlled original affine, reflected, length and mix cases support the bounded solver checks. [IK](../tasks/F306-ik.md) | Nondefault inheritance remains guarded. Effective transforms and UI behavior across those modes are open. |
| Transform mappings and Match | Editable source/target mappings, coordinate spaces, ranges, offsets/mixes and both Match actions. Exact original samples cover named Local/Local suffix and active-space graphs. [Transform](../tasks/F308-transform-constraint.md), [Match observations](../STATE.md#current-additional-f308-observations) | Some World cases differ at the raw `f32` level. The six-Mix availability guard between 0 and 1 is FBones policy. Wider active fan-in, Additive/Physics/suffix and exact World arithmetic stay in the final pass. [Match policy](TRANSFORM-MATCH-IMPLEMENTATION-POLICY.md) |
| Physics in Setup and Animate | FBones has default-live Setup, reset/step controls, per-constraint animation tracks and preview rebuild. Original parameters and a substantial static/dynamic corpus are retained. The exact original inspector shows Simulate, Deterministic, Reset and Reset All. [Physics](../tasks/F307-physics.md), [original controls](PHYSICS-BATCH-AUTHORING-UI-HANDOFF.md) | Measured moving-parent/export phase residuals remain. Simulation preview is bounded to 120 seconds. The authored global target/Reset All timeline workflow remains open. Final-pass trajectory work stays deferred. |
| Constraint creation and batch editing | FBones creates independent Physics records for selected bones in one action and has homogeneous shared-field editing with mixed values and one Undo. [Physics creation](../tasks/F310-physics-authoring.md), [F311](../TASKS.md) | Generated names, the creation preset, dual slider/field control and batch gestures follow FBones policies. Exact original batch interaction and defaults are open. |
| Path constraints | The original has Path constraints. A retained project includes Path and other unmodeled records. [Animate source profiles](../tasks/F105-animation.md), [F106](../TASKS.md) | FBones has no editable Path constraint workflow. That broader project stays guarded. |

## Animate, game export and integration

| Feature | FBones and exact reference evidence | Difference or open boundary |
| --- | --- | --- |
| Setup/Animate, keys and transport | FBones shares the transform HUD across workspaces and supports named clips, FPS, manual/Auto Key, selection, move/delete/copy/paste, scrubbing, playback and loops. Representative four-channel values, times and handles are observed in original fixtures. [Animation DATA](ANIMATION-DATA-4.3.26.md), [Animate](../tasks/F105-animation.md) | Advanced collision/clipboard rules and original timing gestures remain open. The shared HUD and staged edits are FBones requirements. |
| Dopesheet, Graph and Preview UI | Both screenshot sets show Graph/Dopesheet, bottom transforms, a ruler/playhead and right-hand Tree/Preview. FBones supplies a toolbar, curve handles and live single-clip Preview. [Visual audit](ANIMATION-UI-4.3.26.md), [FBones screenshots](../screenshots/README.md) | The supplied Spine images show `Shift/Offset/Adjust`, Graph controls including `Frame/Auto/Store`, standalone Curves, Preview Mix/numbered tracks and a HUD selection/visibility matrix absent in the current FBones controls. Mixing, onion skin and advanced timing remain open. |
| Bone curve sampling and inheritance | FBones supports the four combined channels and split Translate/Scale X/Y, with linear/stepped/Bézier in its supported time domain. Five exact original `.skel` axes retain the reversing Bézier handles. A 157-bone input establishes a raw-to-export inheritance mapping. [Curves](ANIMATION-REVERSING-EXPORT-CONTROLS-2026-11-07.md), [inheritance](ANIMATION-INHERITANCE-RETAINED-DATA-2026-11-07.md) | FBones currently rejects reversing time handles for editing and guards unsupported inheritance. The effective original pose/root selection and nondefault inheritance matrices remain open independently of wire preservation. |
| Attachment, tint, draw order and deformation tracks | Region/Mesh/Clipping/none activation, combined light RGBA, linear two-color, Draw Order and weighted Mesh/Clip deform are implemented. Original fixtures establish bounded Draw Order/deform shape and persistence. [Scene animation format](../FORMAT-SCENE-4.3.26.md#animation-profile-through-draw-order-and-deformation-092) | Separate RGB/alpha, nonlinear two-color and larger/more complex profiles remain open. |
| Sequence tracks | FBones supports numbered portable PNGs for Region/Mesh and bounded Hold/Once/Loop behavior. Exact original fixtures contain sequence Setup records and correlated keys with raw modes 0/1/2. [Sequence DATA](ANIMATION-SEQUENCE-DATA-2026-11-06.md) | The retained evidence establishes those raw modes in the sampled inputs. General sequence variants and original playback parity remain open. |
| Constraint keys, events and audio | FBones supports typed IK/Transform/Physics tracks, per-constraint Reset, events with payloads and portable PCM16 WAV preview. Exact original files/exports establish bounded keys. [Constraint and Event format](../FORMAT-SCENE-4.3.26.md#constraint-event-and-audio-profile-093) | Shared Physics targets, Reset All keys and broader audio formats/playback remain open. |
| Skins and unsupported records | FBones authors the supported default-skin profile and guards unsupported content. [Roadmap and limits](../ROADMAP.md#current-limits) | Named skin authoring and wider wire profiles remain open. Skins stay last in the roadmap. |
| Game export, runtime and project compatibility | The independent FBones runtime consumes its authored game JSON and referenced PNG/WAV export in Node/browser with optional PixiJS. Binary `.fbones` persistence has its own original-acceptance evidence. [Runtime](../tasks/F109-runtime.md), [binary scope](../FORMAT-4.3.26.md) | Runtime mixing, texture atlases, direct project binary load and a broader original runtime/export comparison remain open. Independent project encoding acceptance applies to tested profiles. |
| MCP, desktop and updates | FBones MCP and manual authoring share the native Session. Linux GTK/official client was exercised. Stock 0.9.5→0.9.6 native upgrades retain their Linux-full and Windows/macOS clean-upgrade scopes. [MCP](../tasks/F313-mcp.md), [native coverage](../TASKS.md) | These are FBones capabilities and platform acceptance records. An original MCP equivalent was unverified. Full Windows/macOS native project actions and wider platform coverage are tracked separately. |

## What REA established on the installed artifacts

**Question.** Can the pinned REA MCP expose editor resources or code from the
active package or the Windows launcher for a feature-level comparison?

| Read-only operation | Direct result | Evidence boundary |
| --- | --- | --- |
| `inspect_byte_entropy` on `updates/updates/4.3.26`, 65,536-byte blocks and a full 15,221,340-byte window | SHA-256 `4adf8cff56777d67e6c38de92e3ab293826d8d2df7bd826b547c064547f39de5`. The 233 blocks have file-wide entropy 7.9952 bits per byte. Prior framing inspection identifies a non-ZIP package. | The payload encoding and decoder remain unidentified. [Prior package observation](PHYSICS-CALLER-NEXT-OBSERVATION.md#exact-package-and-available-static-evidence) |
| `inspect_desktop_application` on `spin_windows` and `spin_windows/launcher/2/bin` | The outer scan hit its 60-entry bound. The inner scan inventoried 68 entries and returned no recognized runtime component for this provider. The package file itself is rejected by the directory-only operation. | These results are limits of the selected inventory provider. Prior static evidence identifies the bundled `jvm.dll` separately. [Launcher inventory](PHYSICS-CALLER-NEXT-OBSERVATION.md#exact-package-and-available-static-evidence) |
| `inspect_pe_imports` on `spin_windows/Spine.exe` | The x64 launcher declares seven functions across KERNEL32, SHELL32, SHLWAPI and USER32, including `LoadLibraryA` and `GetProcAddress`. No delay import table is declared. | Static launcher imports establish neither actual module loading nor editor code or behavior. [Prior launcher boundary](PHYSICS-CALLER-NEXT-OBSERVATION.md#bootstrap-route-check-no-recovered-option-or-sanitization-proof) |

The private manifest `.local/research/spine-feature-gap-2026-11-18/rea-evidence.json`
preserves provider settings, evidence IDs, full selected records and rejections.
Reproduce from the project-local `rea` MCP entry with the operations and targets
above. The retained package identity and its launcher boundary can guide a
specific static question. The feature findings in this audit come from the
cited original comparisons, current FBones sources and screenshots.

## Next original observation

For F105, sample the original pose on an owned minimal copy of the reversing
combined Translate segment. The retained control time positions are approximately
`[0, 11.66667, 2.66667, 4]`. This cubic has two extrema at about frames 3.86113
and 6.06480. At frame 3.9, the calculated Bézier parameters are approximately
0.14680227, 0.88651293 and 0.96668483. A sampled original pose can distinguish
the branches if a subframe pose is observable. If the available observer can only sample
integer frames, scale all time positions by ten and first verify the authored
control points in the independent copy. Freeze expected pose alternatives and
take a well-separated control sample as well. A fresh export of the same
handles would answer the already established persistence question. Preserve the
pending original-sampling limit and the existing validation guard until there
is a discriminating observation. [Retained reversing control evidence](ANIMATION-REVERSING-EXPORT-CONTROLS-2026-11-07.md)
