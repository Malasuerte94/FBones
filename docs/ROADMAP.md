# Implementation status and roadmap

This is the public overview for the **0.9.6 release candidate**. FBones is an offline desktop
2D skeletal animation editor under active development. The implemented workflows
below cover tested profiles; they do not establish full Spine compatibility.

## Available in the beta

| Area | Implemented scope |
| --- | --- |
| Project lifecycle | New, Open, Save/Save As, resource copying, dirty-state guards, native Undo/Redo and supported binary project persistence. |
| Bones and hierarchy | Create, select, rename and reparent; Translate, Rotate, Scale, Shear, Pose and Length tools; group transforms and viewport gizmos. |
| Images and slots | Folder-backed PNG library, multiple alternative attachments per slot, nullable active attachment, draw order, colors and supported blend modes. |
| Meshes and weights | Vertex/edge editing, alpha-contour tracing, triangulation, multi-bone bindings, numeric/direct/brush weight editing and weighted clipping. |
| Constraints | Supported IK and Transform authoring, verified Offset/Properties Match fixes, shared editing, ordered evaluation and default-live Setup Physics separate from saved Setup data. |
| Animation editing | Named clips, stored FPS, Rotate/Translate/Scale/Shear plus split Translate/Scale X/Y, manual and Auto Key, mixed key selection/marquee, move/delete/copy/paste and native history. |
| Timeline and curves | Dopesheet, Graph, linear/stepped/Bezier interpolation, editable tangents, frame scrubbing, playback, ranges and looping. |
| Attachment animation | Region/Mesh/Clipping/none activation, combined light RGBA and linear two-color keys, Draw Order, weighted Mesh/Clipping deformation and numbered Region/Mesh sequences. |
| Constraint and Event tracks | Supported IK flags and mixes, six Transform mixes, seven Physics coefficients and Reset, Event definitions/payloads and portable PCM16 WAV preview. |
| Animated Physics preview | Main and Preview share timeline-based evaluation; seeking and loops reconstruct the saved prefix; Simulate and Rebuild controls are available. |
| Developer runtime preview | Independent MIT Node/browser player and optional PixiJS 8 view; separate game export with authored data and referenced PNG/WAV resources. |

Setup and Animate share the central transform controls. Setup edits the authored
rig; Animate edits a sampled pose and keys. Key and Auto Key controls belong to
Animate. Structural edits stay in Setup.

## Current limits

- The project format targets **Spine 4.3.26 Professional**. Only explicitly
  supported binary profiles are editable. Unknown skins, inheritance, animation
  variants or records remain inspection-only instead of being stripped.
- `.fbones` uses the supported original binary structure. Copying original bytes
  is not proof that a new compatible project can be independently encoded.
- Full animation compatibility, complete UI/gesture parity and exact original
  Physics dynamics/phase parity are not established.
- Simulated animation preview is bounded to **120 seconds**. Longer animation
  data remains valid; Simulate Off provides static evaluation beyond that bound.
- Physics and some Transform Match behavior have explicit FBones policies and
  unresolved fidelity gaps. Moving-parent/export Physics phase and general World
  Match angular rounding remain open; the latest observations do not establish
  full numerical parity.
- The independent runtime/export preview covers its declared FBones profile.
  Animation mixing, direct binary-project loading, texture atlases and full
  Spine numerical/feature compatibility are not established. The archive can be
  installed as a file; npm registry publication is separate.
- The desktop is designed for Windows, Linux and macOS. Windows native workflows
  have been observed; Ubuntu browser regression and an earlier native Linux
  startup have been observed. Current packaged Linux lifecycle and macOS native
  acceptance remain open. A browser test does not prove native OS behavior.

## Next milestones

1. **Finish and stabilize existing Physics and Transform Match.** Preserve live
   Setup, explicit Simulate Off, scratch preview state, pending-field handling,
   Undo/Redo and binary Save/Close/Open. Resolve unanswered original numerical
   questions with discriminating evidence; preserve the existing Animate work
   before adding features. Earlier deferrals are superseded.
2. **Complete animation coverage.** Expand global Physics targets/reset-all,
   separate RGB and alpha timelines and broader two-color interpolation, advanced timing and Graph tools,
   animation mixing and onion skin. Preserve native history, save/reopen and
   the existing supported profiles throughout.
3. **Improve the contributor and beta experience.** Keep installation steps,
   examples, screenshots, reproducible bug reports and native platform checks
   easy to follow from a clean checkout. Publish desktop packages, versioned
   source and the runtime archive through gated beta releases, with direct
   platform/runtime download links. Native installation validation, signing/
   notarization and installed-app updates remain separate milestones.
4. **Publish a fuller compatibility matrix.** Expand supported binary profiles
   only after bounded parsing, independent encoding and original-editor
   acceptance have been demonstrated for each profile.
5. **Expand the independent runtime.** Improve representative game integration,
   mixing/transitions, performance coverage, package distribution and supported
   profile fidelity without depending on proprietary runtime code.
6. **Add further tools.** Build on the shared project model, viewport and history
   after the core editor and compatibility coverage are ready.
7. **Expand skin editing last.** Preserve unsupported skin data through the
   existing inspection policy while the core editor is completed.

There are no promised dates for these milestones. A feature appearing in a
screenshot or an inspector is not evidence that its full behavior or persistence
is implemented.

## Current stabilization evidence

Before the 0.9.6 version bump, the stabilization checkpoint reports 123 passing
Ubuntu Chromium/real-Rust UI cases, 443 JavaScript checks with one existing
Physics skip, and 343 native plus 102 legacy-profile passing checks. Two native
and one legacy ignored cases remain distinct. Format suites report 16 default
and 103 Scene cases; runtime checks add 16 package tests and 24 native-export
samples. These are recorded local results, not completed CI for the new tag or
a fresh run on every checkout or OS.

Six targeted Windows QA groups on the 0.9.5 working build cover both Match
actions, Undo/Redo, native Open/SaveAs/Close/Open, pending extended mixes and
invalid-draft cancellation. They do not establish native installation or an
installed-app upgrade for the new 0.9.6 candidate. Existing Animate and runtime
checks retain their scopes; browser success does not prove macOS GUI behavior.

Independent exact4.3.26 observations now cover both active Local/Local suffix
Match actions and one active Local-source/World-target Offset action. Own newly
encoded binary examples were also accepted by the original loader/exporter.
These samples validate their specific graphs and preservation boundaries;
Physics phase, World shear precision and full project compatibility remain open.

The [current checkpoint](STATE.md), [detailed tasks](TASKS.md),
[animation scope](tasks/F105-animation.md) and [format notes](FORMAT-4.3.26.md)
retain the evidence and unresolved questions. Start with
[CONTRIBUTING.md](../CONTRIBUTING.md) to help with implementation, testing,
documentation, design or translation.
