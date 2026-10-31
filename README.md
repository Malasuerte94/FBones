<div align="center">

# FBones

**A free, open-source desktop alternative for 2D skeletal animation.**

Build rigs, paint weights, and animate offline with an editor built for Windows, macOS, and Linux.

[Getting started](#getting-started) · [Implementation status](#implementation-status) · [Contributing](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md) · [Builds](https://github.com/Malasuerte94/FBones/actions/workflows/desktop.yml)

**0.9.4 · Early beta · MIT licensed**

</div>

![FBones Animate workspace with a rig, animation timeline, and property controls](docs/screenshots/animate-dopesheet.png)

FBones is an independent animation editor built with **Tauri 2, Rust, Vue 3, TypeScript, and PixiJS 8/WebGL**. It runs locally; the editor does not require an account, subscription, or cloud service.

The goal is a practical, community-built alternative to Spine for creating 2D skeletal animation. **This is an early beta, not a finished replacement.** The reference version is Spine **4.3.26 Professional**. Compatibility is being implemented and verified in bounded profiles; arbitrary Spine projects and complete runtime/export compatibility are not supported yet. FBones is not affiliated with or endorsed by Esoteric Software.

## See the editor

![FBones Setup workspace with bone hierarchy, properties, and shared transform tools](docs/screenshots/setup.png)

The Setup workspace brings together the hierarchy, PNG library, bones, attachments, mesh tools, weights, and constraints. The shared transform controls edit Setup data or the animated pose depending on the workspace.

![FBones Graph editor showing animation curves and keyframes](docs/screenshots/animate-graph.png)

Animate includes Dopesheet and Graph views, key editing, playback, a live Preview, and manual/Auto Key workflows. These are actual FBones screenshots using generated demonstration art. See [screenshot provenance](docs/screenshots/README.md).

## Implementation status

| Area | Available in 0.9.4 | Remaining work / limits |
| --- | --- | --- |
| Projects and history | Native New/Open/Save As, Undo/Redo, resource copying, conservative inspection of unsupported documents | Broad project compatibility remains progressive |
| Bones and hierarchy | Create, rename, reparent, group selection, affine transforms, viewport gizmos | Further reference-driven interaction polish |
| Images and slots | Folder-backed PNGs, attachment alternatives, nullable active attachment, draw order, color and blend modes | Editing is limited to the supported portable/default-skin profile |
| Meshes and weights | Tracing, geometry editing, binding, direct/brush weights, weighted meshes and clipping | Exact proprietary auto-weight/brush fidelity is not claimed |
| Constraints | IK, Transform, and live Setup Physics | Path constraints and broader numerical/Match fidelity are pending |
| Animation | Named clips, FPS, four bone channels, slot activation/color, draw order, mesh/clipping deformation, constraint keys | Separate RGB/alpha and two-color tint tracks remain pending |
| Timeline and curves | Dopesheet/Graph, linear/stepped/Bezier interpolation, mixed key selection, move/delete/copy/paste, playback and looping | Advanced timing/Graph tools, mixing, and onion skin remain pending |
| Events and audio | Event definitions/payload keys and portable PCM16 WAV preview | General audio formats and original playback parity are not established |
| Animated Physics | Shared Main/Preview timeline evaluation, keyed coefficients, Reset, Simulate and Rebuild | Simulation preview is limited to 120 seconds; global targets/reset-all and exact original dynamics remain pending |
| Platforms | Windows WebView2 interactions and native dialogs checked; Ubuntu browser UI exercises the real Rust Session | macOS and current packaged Linux lifecycle still need dedicated validation |
| Export and compatibility | Independently encoded `.fbones` files retain the supported Spine 4.3.26 binary structure | Full `.spine` compatibility and game-runtime export are not delivered |

**Animation remains the active implementation priority.** See the [public roadmap](docs/ROADMAP.md), [full animation scope](docs/tasks/F105-animation.md), and [current engineering checkpoint](docs/STATE.md).

Unsupported structures remain inspection-only rather than being discarded to make a file editable. Keep backups and work on copies of important projects. Saving an FBones project does not overwrite an original `.spine` source.

## Getting started

The first beta is **source-only**, tagged **`v0.9.4-beta.1`**; the application displays **0.9.4**. Prebuilt installers are not included. See [beta release notes](docs/releases/v0.9.4-beta.1.md) for scope and platform limits.

To build from source, install **Node.js 22.12+**, **pnpm 11.1.0**, **Rust 1.93+**, and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use `pnpm build` for a native desktop build. `pnpm dev:web` provides a browser preview; native project files and filesystem dialogs require the desktop application.

The [GitHub Actions workflow](https://github.com/Malasuerte94/FBones/actions/workflows/desktop.yml) builds Linux x64 Debian/AppImage packages, a Windows x64 NSIS installer, and a universal Intel/Apple Silicon macOS app/DMG. It checks package structures and records hashes; a configured matrix alone is not evidence of successful builds. Native GUI validation remains separate. The source beta is published by the tag workflow only after all platform and Ubuntu UI jobs pass.

Start with a new project in **Setup**, create bones with **B**, choose a PNG folder under **Tree → Images**, and drag artwork onto the viewport. Switch to **Animate**, create an animation, select a bone, and use the channel key buttons or **Auto Key**. Press **Space** to play/pause. **Ctrl/Cmd+Z** undoes; **F2** renames; **Escape** cancels the current edit.

## Contributing

Contributions are welcome: code, bug reports, documentation, original demo art, accessibility, and testing on Windows, Linux, and macOS. You do not need a Spine license to build FBones or run its self-contained tests. Optional original-editor comparisons require your own legitimately licensed installation; no proprietary editor or runtime is included.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, architecture, verification, and suggested first contributions. The [roadmap](docs/ROADMAP.md) separates delivered features from open work. For a substantial change, open an issue first to coordinate the scope. Small fixes and documentation improvements can go straight to a pull request.

```sh
pnpm typecheck
pnpm typecheck:ui
pnpm test
pnpm build:web
cargo test --workspace --locked
```

For the full browser UI suite, install Chromium or set `CHROME_BINARY`, run `cargo fetch --locked` once, then `pnpm test:ui`. It uses the production CSP and isolated instances of the real Rust Session. See [development](docs/DEVELOPMENT.md) and [testing](docs/TESTING.md).

The latest implementation checkpoint records 95 passing Ubuntu UI cases, 263 passing JavaScript tests with one known skip, and 254 native / 93 legacy tests. These are recorded engineering results, not a claim that every platform or Spine feature is verified. The [checkpoint](docs/STATE.md) retains their scope and limitations.

## License

FBones source and original project artwork are available under the [MIT License](LICENSE). Dependencies retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md). Spine names and trademarks belong to their respective owners. Proprietary editor binaries, extracted code/assets, personal projects, and reference screenshots are excluded from this repository.
