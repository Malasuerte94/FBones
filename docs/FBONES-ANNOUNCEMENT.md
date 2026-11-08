# FBones — a free, open-source alternative to Spine

Hi everyone! I’m building **FBones**, an offline desktop editor for 2D rigging and skeletal animation. **The editor and our independent runtime are MIT licensed**, and everyone is welcome to use, fork, and contribute to the project.

It’s currently in **early beta**, with working rigging, animation, and game-export workflows. No account, subscription, or cloud service is required.

## Current features

- Bones, hierarchies, reparenting, viewport gizmos, and individual/group transforms.
- PNG libraries, attachment alternatives, draw order, colors, blend modes, and clipping.
- Mesh editing, contour tracing, triangulation, multi-bone binding, and weight painting.
- Setup/Animate workspaces, keyframes, Auto Key, Dopesheet, Graph Editor, Bezier curves, playback, and looping.
- Supported IK/Transform constraints and Physics preview.
- Attachment/color animation, mesh deformation, image sequences, events, and PCM16 WAV preview.
- Save/Save As, Undo/Redo, and portable project resources.

Downloads are available for **Windows x64**, **Linux x64** (AppImage/`.deb`), and **macOS 13+** (Intel and Apple Silicon).

We also have an independent **Node.js/browser runtime with an optional PixiJS 8 view**. File → Export runtime creates separate JSON game data and referenced PNG/WAV resources. The runtime archive is available in Releases; npm registry publication is still pending.

## Compatibility

The target is **Spine 4.3.26 Professional**, covering supported project profiles. Unsupported data stays inspection-only. **Full Spine compatibility is not available yet**: mixing/transitions, multiple skins, Path constraints, texture atlases, and broader Physics fidelity remain in progress. Our runtime reads the FBones game export, not `.spine` project files directly.

**Contributions are welcome!** Help with code, testing, reproducible bug reports, UI, documentation, translations, or original example projects. The stack is Tauri/Rust, Vue/TypeScript, and PixiJS 8.

- **Source and contributions:** [GitHub](https://github.com/Malasuerte94/FBones)
- **Download the app and runtime:** [Releases](https://github.com/Malasuerte94/FBones/releases/latest)

*Independent project; not affiliated with Esoteric Software.*
