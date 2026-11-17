<div align="center">

# FBones

**A free, open-source desktop alternative for 2D skeletal animation.**

Build rigs, paint weights, and animate offline on Windows, macOS, and Linux. Connect AI clients through the built-in MCP server.

[Download](#download) · [MCP for AI](docs/MCP.md) · [Getting started](#getting-started) · [Developer runtime](#developer-runtime-preview) · [Implementation status](#implementation-status) · [Contributing](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md) · [Builds](https://github.com/Malasuerte94/FBones/actions/workflows/desktop.yml)

**0.10.0 · Early beta · MIT licensed**

</div>

## Download

**FBones `v0.10.0-beta.1` — desktop app and developer runtime.** The release workflow publishes these downloads only after the build, UI, runtime and signing gates pass. [Release page](https://github.com/Malasuerte94/FBones/releases/tag/v0.10.0-beta.1) · [All published releases](https://github.com/Malasuerte94/FBones/releases).

| Download | Platform / use |
| --- | --- |
| [Windows installer (.exe)](https://github.com/Malasuerte94/FBones/releases/download/v0.10.0-beta.1/FBones_0.10.0_x64-setup.exe) | Windows x64 desktop app |
| [macOS disk image (.dmg)](https://github.com/Malasuerte94/FBones/releases/download/v0.10.0-beta.1/FBones_0.10.0_universal.dmg) | macOS 13+; Intel and Apple Silicon |
| [Linux AppImage](https://github.com/Malasuerte94/FBones/releases/download/v0.10.0-beta.1/FBones_0.10.0_amd64.AppImage) · [Debian package (.deb)](https://github.com/Malasuerte94/FBones/releases/download/v0.10.0-beta.1/FBones_0.10.0_amd64.deb) | Linux x64 desktop app |
| [Developer runtime (.tgz)](https://github.com/Malasuerte94/FBones/releases/download/v0.10.0-beta.1/fbones-runtime-0.1.0-beta.1.tgz) | Node/browser player with optional PixiJS 8 view |

Install the downloaded runtime in your game project:

```sh
npm install ./fbones-runtime-0.1.0-beta.1.tgz
```

Early beta: Windows installer is unsigned; macOS is ad-hoc signed without Developer ID or notarization. Earlier 0.9.5→0.9.6 upgrade acceptance retains its recorded platform scope; it does not establish an installed 0.10.0 upgrade. Installation/restart remains explicit. See [release scope and checks](docs/releases/v0.10.0-beta.1.md) and the [current checkpoint](docs/STATE.md).

![FBones Animate workspace with a rig, animation timeline, and property controls](docs/screenshots/animate-dopesheet.png)

FBones is an independent animation editor built with **Tauri 2, Rust, Vue 3, TypeScript, and PixiJS 8/WebGL**. It runs locally; the editor does not require an account, subscription, or cloud service.

The goal is a practical, community-built alternative to Spine for creating 2D skeletal animation. **This is an early beta, not a finished replacement.** The reference version is Spine **4.3.26 Professional**. Compatibility is being implemented and verified in bounded profiles; arbitrary Spine projects and complete runtime/export compatibility are not supported yet. FBones is not affiliated with or endorsed by Esoteric Software.

## See the editor

![FBones Setup workspace with bone hierarchy, properties, and shared transform tools](docs/screenshots/setup.png)

The Setup workspace brings together the hierarchy, PNG library, bones, attachments, mesh tools, weights, and constraints. The shared transform controls edit Setup data or the animated pose depending on the workspace.

![FBones Graph editor showing animation curves and keyframes](docs/screenshots/animate-graph.png)

Animate includes Dopesheet and Graph views, key editing, playback, a live Preview, and manual/Auto Key workflows. These are actual FBones screenshots of a real user-authorized character rig with 71 bones, 26 slots and 14 animations. See [screenshot provenance](docs/screenshots/README.md).

## MCP first

Open **MCP** next to File, start the local server and copy its remembered configuration into your AI client. The 23 tools expose the current native authoring surface, including auto trace, mesh/weights, Physics, animation, imports, runtime export and binary persistence. Viewport PNG capture lets the AI inspect the actual editor view.

AI and manual edits share the same Rust Session, stable IDs, revision/pose guards and Undo/Redo. While MCP is active, the editor visibly hands control to the AI; Stop returns control after refreshing its final state. New supported features follow this shared API first. Read the [MCP setup and AI guide](docs/MCP.md).

## Implementation status

| Area | Available in 0.10.0 | Remaining work / limits |
| --- | --- | --- |
| Projects and history | Native New/Open/Save As, Undo/Redo, resource copying, conservative inspection of unsupported documents | Broad project compatibility remains progressive |
| Bones and hierarchy | Create, rename, reparent, group selection, affine transforms, viewport gizmos | Further reference-driven interaction polish |
| Images and slots | Folder-backed PNGs, attachment alternatives, nullable active attachment, draw order, color and blend modes | Editing is limited to the supported portable/default-skin profile |
| Meshes and weights | Tracing, geometry editing, binding, direct/brush weights, weighted meshes and clipping | Exact proprietary auto-weight/brush fidelity is not claimed |
| Constraints | IK, Transform, live Setup Physics; verified Offset/Properties Match fixes, multi-selection and atomic shared-field edits | Path constraints, general World rounding and broader Match/Physics fidelity remain pending |
| Animation | Named clips, FPS, Rotate/Translate/Scale/Shear and split Translate/Scale X/Y, slot activation/light RGBA/linear two-color keys, draw order, mesh/clipping deformation, constraint keys | Separate RGB/alpha and broader animation compatibility remain pending |
| Timeline and curves | Dopesheet/Graph, linear/stepped/Bezier interpolation, mixed key selection, move/delete/copy/paste, playback and looping | Advanced timing/Graph tools, mixing, and onion skin remain pending |
| Image sequences | Region/Mesh numbered PNG sequences with Hold/Once/Loop keys and portable resources | Supported sequence modes and resource budgets are bounded |
| Events and audio | Event definitions/payload keys and portable PCM16 WAV preview | General audio formats and original playback parity are not established |
| Animated Physics | Shared Main/Preview timeline evaluation, keyed coefficients, Reset, Simulate and Rebuild | Simulation preview is limited to 120 seconds; global targets/reset-all and exact original dynamics remain pending |
| Platforms | Native Linux installed-upgrade project flows; Windows x64/macOS ARM64 clean-upgrade90 and fresh WebGL startup; Ubuntu browser UI exercises the real Rust Session | Wider native project UX and macOS Intel execution remain separately tracked |
| Export and compatibility | Independently encoded `.fbones` files retain the supported Spine 4.3.26 binary structure; separate game export includes authored data and referenced resources | Full `.spine` compatibility is not established; unsupported editor data stays guarded |
| Developer runtime | Independent MIT Node/browser player and optional PixiJS 8 view for the declared FBones profile | Preview release: no automatic mixing, direct project-binary loader, or full Spine numerical parity claim |

**Physics and both Transform Match actions have reached the agreed 90% usable milestone. Remaining fidelity work returns in the final 100% pass; skins stay last.** The 0.10.0 feature set includes [PSD layer import](docs/tasks/F312-psd-import.md), preserving common canvas positions and stacking order in one Undo action. Its initial profile is flat RGB8 raster layers with Normal blending and RAW/PackBits compression; unsupported appearance data is refused explicitly. See the [public roadmap](docs/ROADMAP.md), [full animation scope](docs/tasks/F105-animation.md), and [current engineering checkpoint](docs/STATE.md).

Unsupported structures remain inspection-only rather than being discarded to make a file editable. Keep backups and work on copies of important projects. Saving an FBones project does not overwrite an original `.spine` source.

## Getting started

Use the [desktop app downloads](#download) for your platform. The application displays **0.10.0**; the release tag is **`v0.10.0-beta.1`**. Its installers and runtime are published together only after the required checks pass. Source code is also included in the [release assets](https://github.com/Malasuerte94/FBones/releases/tag/v0.10.0-beta.1).

To build from source, install **Node.js 22.12+**, **pnpm 11.1.0**, **Rust 1.93+**, and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use `pnpm build` for a native desktop build. `pnpm dev:web` provides a browser preview; native project files and filesystem dialogs require the desktop application.

The [GitHub Actions workflow](https://github.com/Malasuerte94/FBones/actions/workflows/desktop.yml) builds Linux x64 Debian/AppImage packages, a Windows x64 NSIS installer, and a universal Intel/Apple Silicon macOS app/DMG. It checks package structures and records hashes; a configured matrix alone is not evidence of successful builds or native installation. A `main` push starts checks; a version tag publishes desktop packages, signed updater artifacts, source and the runtime only after its required jobs pass. [Application update and release policy](docs/UPDATES.md) explains signed downloads, safe restarts and increasing application versions. Native GUI validation remains separate.

Start with a new project in **Setup**, create bones with **B**, choose a PNG folder under **Tree → Images**, and drag artwork onto the viewport. Switch to **Animate**, create an animation, select a bone, and use the channel key buttons or **Auto Key**. Press **Space** to play/pause. **Ctrl/Cmd+Z** undoes; **F2** renames; **Escape** cancels the current edit.

## Developer runtime preview

The independent **`@fbones/runtime` 0.1.0-beta.1** package plays the supported FBones animation profile in Node or a browser, with an optional PixiJS 8 view. It contains FBones code under MIT and has no Spine runtime dependency. It is a bounded preview, not complete Spine runtime compatibility.

In the desktop editor, choose **File → Export runtime** and select a destination folder. The new bundle contains `skeleton.fbones.runtime.json` and referenced PNG/WAV resources. This separate game export does not replace the binary `.fbones` authoring format or bake temporary poses into saved keys.

Download the [runtime archive](https://github.com/Malasuerte94/FBones/releases/download/v0.10.0-beta.1/fbones-runtime-0.1.0-beta.1.tgz) from the gated [beta release](https://github.com/Malasuerte94/FBones/releases/tag/v0.10.0-beta.1), then use the install command above. To build the package from source:

```sh
pnpm build:runtime
npm pack ./packages/runtime
# In your game project, install the downloaded/generated archive:
npm install ./fbones-runtime-0.1.0-beta.1.tgz
```

The registry name is not published to npm by this release. Use the archive rather than `npm install @fbones/runtime` or installing the editor repository root. GitHub holds source and release downloads; npm registry publication remains a separate step. See the [runtime guide and examples](packages/runtime/README.md) for Node/Pixi usage, resource loading, current solver policies and limitations.

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

For the full browser UI suite, install Chromium or set `CHROME_BINARY`, run `cargo fetch --locked` once, build the runtime with `pnpm build:runtime`, then run `pnpm test:ui`. It uses the production CSP and isolated instances of the real Rust Session, including shipped-runtime GPU checks. See [development](docs/DEVELOPMENT.md) and [testing](docs/TESTING.md).

The release workflow requires three-platform builds, native tests, production-CSP UI/runtime checks, an independent official-client MCP run against an actual Linux editor, and package/source/signature/version gates before publishing installers. Tests and screenshots prove their named scenarios; they do not establish every Spine feature or native interaction on every platform. See the [release notes](docs/releases/v0.10.0-beta.1.md) and [checkpoint](docs/STATE.md) for evidence and limits.

## License

FBones source is available under the [MIT License](LICENSE). README screenshots include user-authorized project artwork; the original artwork retains its own rights. Dependencies retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md). Spine names and trademarks belong to their respective owners. Proprietary editor binaries, extracted code/assets, personal projects, and reference screenshots are excluded from this repository.
