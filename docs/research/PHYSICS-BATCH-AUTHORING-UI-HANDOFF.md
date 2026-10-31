# Physics creation from bone selection — UI evidence and contract

2026-10-30, before dependent code. User priority: select three bones and add
Physics directly to all three, no target chooser; generated bone_physics names
follow bone renaming; B/C/D react to moving parent A and restore in Setup.
This audit ran no original/process operations. Export-phase F307 research is
separate from this authoring/interaction requirement.

## Evidence reused and limits

**Direct exact4.3.26 UI evidence:** independently viewed again the retained own
`feature-ui/physics-default-inspector-observed.png`,
`physics-inspector-observed.png` and physics-default-observed.json. Physics
inspector shows Setup, its constrained upper bone (labelled Target in these
captures), Simulate blue/enabled, Deterministic off, Reset and Reset All.
The zero-channel capture has Translate0/0, Rotation0, ScaleX0 and ShearX0,
FPS60, Inertia50, Strength100, Damping15 and Mass100. Its source was imported;
this does **not** prove defaults of an original New operation. Neither capture
proves multi-bone creation, generated names/rename synchronization or a moving
chain's response. No new original launch is needed to rediscover these controls.

**Primary documentation, patch-unpinned:** current
[Physics guide](https://en.esotericsoftware.com/spine-physics-constraints#Setup)
says select the constrained bone then New → Physics Constraint. Its
[Bone](https://en.esotericsoftware.com/spine-physics-constraints#Bone) section
identifies one constrained bone per constraint; no separate external target is
required. [Inertia](https://en.esotericsoftware.com/spine-physics-constraints#Inertia)
and Strength describe motion lag and restoration. The
[Warnings](https://en.esotericsoftware.com/spine-physics-constraints#Warnings)
section identifies all-zero influence channels as inactive. Multi-create and
name synchronization remain the explicit user requirement, not measured parity.

## Current mismatch, directly inspected source

- Tree New → Physics and both Physics View create buttons all set
  App.vue constraintCreator and open ConstraintCreator.vue.
- That creator reduces selectedIds to physicsBone=members[0], asks for one
  Target and a generic physics name, then submits one addConstraint.
- It initializes x/y/scaleX/shearX to0 and rotate:null. This authors an inactive
  constraint regardless of the already-running Setup clock.
- ConstraintInspector's existing Target field is the constrained bone reference,
  not an external IK target. Keep reassignment distinct from initial creation.
- No dedicated Physics creation shortcut exists in App's command/key routes.
  F2/Tree inline rename already use native bone edits; synchronization belongs
  in that native transaction, not a frontend follow-up command.

## Proposed flow and implementation boundaries

All three create entrypoints call one selection-based command. Freeze the actual
selected bone IDs, submit one native atomic batch, show the created constraints
and select the last created item for editing; no Physics modal/name/target step.
IK/Transform keep their existing creator. Disable Physics creation when no bones
are actively selected, while busy or inspection-only. Do not silently fall back
to root or use latent bone IDs left behind attachment/constraint selection.

Generate collision-safe bone_physics names natively. Bone-rename synchronization
must be one native history action; collision and manually renamed constraint
behavior need an explicit DATA policy. Existing constraints and imported zero
channels remain unchanged. A responsive default for **newly created** constraints
must enable meaningful influence channels; its exact preset is an FBones choice
until original New is measured. Simulate's existing explicit-off intent remains
honored. Never enable simulation or rewrite imported influences as a workaround.

## Focused interaction acceptance

1. Real Tree Ctrl/Shift selection of B/C/D, then Tree New → Physics: no modal,
   exactly three associations/names, one native revision/Undo, unchanged authored
   bones. Undo/Redo and binary Save/Close/Open retain all three.
2. Physics View + and empty-state button use the same command. No active bone
   selection must not author against a stale selectedIds array/root fallback.
3. Rename B through Tree/F2 and inspector, Enter/blur dedup: expected generated
   name follows atomically. Cover collisions, manual names and Undo/Redo natively.
4. A→B→C→D length-positive chain: no Play/Run; move A via real viewport pointer,
   observe B/C/D during hold and restoring/settling after release. Compare
   Simulate-off to distinguish Physics from inherited movement. One parent drag
   creates one undo item; idle simulation creates none. Save setup is not baked.
5. Reuse existing live Setup lifecycle/checkpoint regressions. Do not rerun
   accepted original export batches or claim exact original response curves.
