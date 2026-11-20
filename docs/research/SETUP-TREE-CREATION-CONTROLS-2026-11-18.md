# Setup Tree creation controls

## Reference gate

The paired DATA and UI reviews reuse the owned Spine Professional 4.3.26
Transform inspector capture and the retained Path-containing project. The
capture shows a New button beneath Tree. Its expanded entries and navigation
were never captured. The retained project establishes Path records with other
unmodeled content. It leaves the complete record format and creation behavior
open. [Tree observation](F309-PARENTING-PANELS-UI.md), [Path project](ANIMATION-LARGE-MESH-DATA-GATE-2026-11-07.md)

The official guides describe the attachment types and the Path and Slider
workflows. The 4.3 release notes describe cross-slot Linked Mesh and Slider.
These sources support naming and grouping. Details of the 4.3.26 creation
gestures and persisted formats still need direct evidence. [Attachments](https://esotericsoftware.com/spine-attachments#Types), [Path](https://esotericsoftware.com/spine-path-constraints#Setup), [Slider](https://en.esotericsoftware.com/spine-sliders#Setup), [4.3 release notes](https://esotericsoftware.com/blog/Spine-4.3-released)

## FBones implementation boundary

The initial Setup Tree menu placed Path attachment, Bounding Box, Point and
Linked Mesh after Clipping. Path Constraint and Slider follow the supported
constraints. Distinct group labels explain that these six items are planned.
Each is a native disabled button without an action. The native Scene model,
MCP schema, creator events and on-disk project capabilities stay authoritative.
The established keyboard policy skips disabled rows and Escape returns focus to
New. Animate keeps its current menu. [Scene model](../../crates/fbones-format/src/minimal/scene.rs), [Tree menu](../../src/components/organisms/SceneTree.vue)

The Linked Mesh entry now opens the FBones Setup creator for direct sources.
The historical planned-entry probe below captured the earlier disabled
version. [Current creator verification](../STATE.md#current-checkpoint--setup-creation-of-direct-linked-mesh-ready90)

## Focused evidence

Two production-CSP Chromium cases use an isolated real Rust Session. The
existing regression opens the IK creator and checks the menu input target,
keyboard focus and outside dismissal. The new 960×640 case scrolls to and
attempts each planned button, checks the enabled navigation cycle and Escape,
and confirms the two planned groups are absent in Animate. The native
snapshot is equal and tracked calls during the planned interactions consist
of the final read. Both passing traces and the inspected screenshot remain
in `.local/research/setup-tree-creation-2026-11-18/`.

REA MCP `inspect_playwright_trace` decoded the owned planned-entries case.
It reports 229 before/after action pairs, 17 network events and 28 screenshot
references. The test assertions and screenshot establish the interaction and
layout. The trace decoder establishes artifact identity and scoped metadata.
The current Linux GTK/X11 build starts with WebGL in a fresh isolated profile.

## Next UI slice

Review File I/O with paired DATA and UI evidence. The original 4.3.26 GUI trace
establishes PNG settings for current pose and animation. The official guides
describe distinct project/data import, image/video/data export and standalone
texture packing. The 4.3 release notes describe packaging the project and
images as a ZIP. Keep the current FBones game-bundle export and PSD actions on
their existing paths. Exact original non-PNG options and menu order are open.
[Original PNG settings](FEATURE-UI-4.3.26.md#actual-export-setting-schema-obtained-for-numerical-solver-research), [Import](https://esotericsoftware.com/spine-import), [Export](https://esotericsoftware.com/spine-export), [Texture Packer](https://esotericsoftware.com/spine-texture-packer#Running-the-texture-packer-separately), [ZIP project package](https://esotericsoftware.com/blog/Spine-4.3-released#Package-projects-as-ZIPs)
