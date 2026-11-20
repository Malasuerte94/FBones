# Development

## Normal setup

Install Node 22.12+ (24 LTS recommended), pnpm 11, stable Rust, and the platform
prerequisites from https://v2.tauri.app/start/prerequisites/.

Run `pnpm install`, then `pnpm dev`. `pnpm dev:web` previews the interface in a
browser; native project file operations require Tauri.

Run `pnpm board` for the local FBones dashboard at
<http://127.0.0.1:4180/>. It reads the current task table, project memory
and contributor rules from `docs/TASKS.md`, `docs/STATE.md`, and `AGENTS.md`.
Status and priority changes from the board write back to `docs/TASKS.md`.
The default Hierarchy view uses the parent-to-child lists in
`docs/TASK-HIERARCHY.json`. Dependencies have their own field in the task
table. Switch to Status board to drag between status columns. Changes with
recorded activity remain unread until marked read in this browser.
Run `node --test scripts/project-board/server.test.mjs` to verify the dashboard.

`pnpm build:web` checks TypeScript and builds assets. `pnpm build` builds the
native application. Rust code can be checked using `cargo test --workspace`.
The format crate has no desktop dependency and can be tested on its own.

The frontend uses Tauri's configured global API through a single typed bridge.
This API is injected by the Rust application itself, so no independently
versioned `@tauri-apps/api` npm dependency is required. Browser previews use
temporary in-memory sessions and never pretend to implement native persistence.

Desktop0.8 enables the typed Scene inventory/constraints profile by default.
`cargo test -p fbones-desktop --no-default-features` retains the legacy profile
as an independent regression path. To compile a dedicated Windows candidate
without changing the shared shortcut delivery, use
`FBONES_BUILD_ONLY=1 bash scripts/build-windows-test.sh`; the real editor is
`target/x86_64-pc-windows-msvc/release/fbones.exe`. Copy it to a new immutable
own QA path and test that exact image before publishing. An already-enabled
Scene profile can also be requested explicitly with `FBONES_SCENE_EDITING=1`.

PixiJS requires `pixi.js/unsafe-eval` to be imported before renderer startup
under Tauri's strict CSP. Despite the import's name, it replaces dynamic code
generation with static implementations; the application policy stays unchanged.
`pnpm test` reproduces the unpatched renderer check in a VM that disables string
code generation, then verifies the actual viewport entry passes with that same
restriction. This regression check needs no display or GPU. The full browser
Playwright suite serves the production frontend with the exact desktop CSP as
an HTTP header. No eval, file-script or connect-src exceptions are added.

## Developer runtime preview

The independent runtime source is in [packages/runtime](../packages/runtime/README.md).
Run `pnpm build:runtime`, then `pnpm test:runtime` after building the opt-in native
test host. Its headless ESM entry works in Node and browsers; the optional `/pixi`
entry uses PixiJS 8. This preview uses our bounded FBones evaluator and does not
claim full Spine runtime parity or animation mixing.

The desktop File → Export runtime action creates a new `FBones-runtime-*` bundle
under a selected destination, containing `skeleton.fbones.runtime.json` and only
referenced PNG/WAV resources. It exports authored Setup and stored keys, leaves
the project/history/dirty state untouched and rejects missing resources. This
developer exchange format is separate from binary `.fbones` authoring files.

For an offline game install, use the prepared runtime `.tgz` under
`WINDOWS_TEST/RUNTIME`, or build one with `npm pack ./packages/runtime`.
GitHub source/releases and public npm are the intended distribution routes;
the local package does not establish registry ownership or publication.

## Routine interface tests on Ubuntu

Run FBones tests and verification builds in the grouped 15-point implementation
rounds described in [AGENTS.md](../AGENTS.md#test-cadence).

`pnpm test:ui` builds the frontend and the opt-in headless Rust test host, then
runs Playwright against Linux Chromium. The host uses the application's real
Session for commands, geometry, history and `.fbones` file operations. Every
test gets its own process and generated assets in an ignored sandbox; no
desktop window, Windows automation or original/user project is needed.

`pnpm test:ui --no-build` reruns against the current local frontend/host.
`pnpm test:ui --browser-only` runs only browser-preview/read-only tests.
`pnpm test:ui:report` opens the report. Tests keep screenshots and traces for
failures under `.local/playwright/`. Set `CHROME_BINARY` when system Chromium
has another path; the current workspace uses `/usr/bin/google-chrome` with an
explicit SwiftShader software-rendering configuration.

These tests prove browser UI plus native Rust behavior, not a native GTK or
WebView2 window. Platform-specific dialog, startup and actual OS drag/drop
checks remain separate. See [TESTING.md](TESTING.md) for the transport and gates.

## This workspace's offline setup

JavaScript dependencies were installed from existing npm tarball caches with
their original integrity checks; `pnpm-lock.yaml` is the canonical lockfile and
includes platform-specific Windows/macOS/Linux optional packages. No other
project's source or node_modules was changed.

The local Rust cache lives under ignored `.tools/cargo`. For commands in this
sandbox, prefix Cargo with `CARGO_HOME="$PWD/.tools/cargo"` and use `--offline`.
For example:

```sh
CARGO_HOME="$PWD/.tools/cargo" cargo test --offline --workspace
CARGO_HOME="$PWD/.tools/cargo" CARGO_NET_OFFLINE=true pnpm tauri build --bundles deb
```

`pnpm-workspace.yaml` puts caches inside this workspace and disables implicit
dependency installation before every script. Use explicit `pnpm install` for
dependency changes. The original cache metadata is not part of the repository.

Targets: Windows 10/11 x64, macOS 13+ Intel/Apple Silicon, Ubuntu 22.04/24.04 x64.
Native builds and launch checks on each operating system are required; compiling
on Linux is not evidence that Windows/macOS launch successfully.

## Research tooling

REA is optional; use only https://github.com/morluto/rea / the `rea-agents`
package. Install a pinned local version under an ignored tooling directory and
use its CLI. Do not run global agent registration/setup. Check its current Node
requirements before installing: the latest README requires a newer Node 24
patch than the 24.15 currently installed here.

Use a JDK/decompiler for Java bytecode and Ghidra for native components where
the identified loader needs them. None of these are dependencies of FBones.

## Original Spine comparison on Linux

Use the activated **Spine 4.3.26 Professional** Linux installation for all new
reference comparisons. Pin the version with `Spine.sh --update 4.3.26`. Verify that
the startup output names the exact Professional editor. Create small owned
fixtures and pass an explicit copy for every original comparison. Keep assets and
user projects outside version control. Record the operation, version, checksum
and observed result. An independently generated FBones file can be checked by
opening a copy with a `.spine` extension.

REA MCP is the source of truth for new reference behavior. Use targeted
artifact or runtime analysis and preserve the provider evidence. Use private
paths for CLI input and output. Manual and scripted GUI input in original Spine
are outside the current reference workflow. Keep existing GUI observations as
historical evidence. [Reference rules](../AGENTS.md#parallel-work-and-reference-first)

```sh
Spine.sh --update 4.3.26 --input own-fixture.spine --output export-dir --export json
cargo test -p fbones-research
```

Retain the accepted eight-case envelope and independent encoder batches. The
read-only checker verifies returned reports and their files without launching
Spine.

```sh
python3 scripts/check-reference-results.py updates/fixtures/reference-results-1793191428306
cargo run -p fbones-research -- --compare-candidates updates/fixtures/reference-results-1793191428306
```

## Windows access without copying builds

Windows Explorer can access a WSL workspace through
`\\wsl.localhost\<distribution>\home\<user>\<project>`. Open this workspace's
`scripts/windows-workspace-shortcuts.bat` once on Windows to create Desktop
shortcuts to the actual application and shared WINDOWS_TEST folder. The script
does not copy builds or modify Codex permissions. It refuses to replace a
shortcut pointing elsewhere. The user ran this setup successfully; both created
shortcut targets have been independently verified. The user also confirmed
application startup through the shared UNC shortcut.

Use the existing mapped drive (W: on this host) for FBones acceptance and
delivery. Shared results appear directly in the workspace. To archive existing
Desktop results, use `python3 scripts/import-windows-results.py`. The local source
path is kept in ignored `.local/windows-host.json`, or supplied with `--source`.
Archive import is read-only toward Windows and refuses conflicting local data.

With the user-granted full access, native Windows interop now works. Use
`powershell.exe -NoProfile -ExecutionPolicy Bypass -File <mapped-path>/Start-FBones.ps1`.
This process-only policy argument runs our unsigned workspace script; no global
execution policy is changed. The launcher prefers the existing W: mapping and
uses CreateProcess, avoiding Windows Shell share prompts and UNC cwd errors.
It reports success only after observing a native window handle/title.
`Porneste-FBones.bat` invokes it for manual startup. The shortcut installer
now prefers existing mapped paths too; only the user runs that installer.
Do not write Desktop shortcuts from the agent.

## Bone editing — 0.3.0

The user confirmed the Windows 0.2.0 save/reopen lifecycle. Bone editing now
lives in `src-tauri/src/rig.rs`, behind revision-checked `edit_rig` commands.
Editor IDs are session-only; the codec still writes topological parent indices
in the accepted Spine structure. Reparenting preserves world position/angle.
Undo/redo has 100 entries and a saved geometry checkpoint; save does not clear
history. Opening starts a fresh history. Root deletion/reparenting is rejected.

The viewport previews drag gestures locally and commits once on pointer-up.
Native pose/state is authoritative. Field edits commit on blur/Enter; Save
awaits their completion. Broken names/graphs and invalid numbers never mutate
the model. Unknown project data stays inspection-only.

The retained `bones-v1` batch covers chains, branches, reordered or
reparented hierarchy and Unicode names. The original Spine exports, independent
artifact validation and byte comparisons passed. The user confirmed bone
creation, dragging and parenting in FBones. Existing result folders can be
verified with `python3 scripts/check-reference-results.py <result-folder>`.

## Windows portable test build from Linux

Run `bash scripts/build-windows-test.sh` when a cached Microsoft SDK/CRT is
available. Set `FBONES_WINDOWS_SDK` to its root, otherwise the script reads the
existing cargo-xwin cache. Everything generated is workspace-local.

Native C dependencies, including the updater's TLS implementation, also require
an MSVC-targeting Clang compiler and `llvm-lib`. Supply executable tool paths:

```sh
FBONES_WINDOWS_CC=/path/to/sdk-aware-clang-wrapper \
FBONES_WINDOWS_AR=/path/to/llvm-lib \
FBONES_WINDOWS_SDK=/path/to/windows-sdk \
bash scripts/build-windows-test.sh
```

The compiler wrapper must run Clang in MSVC driver mode for
`x86_64-pc-windows-msvc` and provide the SDK/CRT include directories. Use a wrapper
file rather than putting flags inside the tool-path variable. The SDK needs its
`crt/include` and `sdk/include/{ucrt,shared,um}` headers as well as the library
directories checked by the script. `FBONES_WINDOWS_CC`/`FBONES_WINDOWS_AR` take
priority, followed by existing hyphenated target variables, underscored target
variables, then `clang-cl`/`llvm-lib` on PATH. Both target-variable forms receive
the selected paths for Cargo. Missing/nonexecutable tools fail before the build;
the script does not install a toolchain or change global configuration.

The script uses Rust's bundled LLD and statically links the CRT. The restricted
`windows-resource.py` converter handles only the VERSIONINFO, ICON and manifest
resources emitted by this project. Its output is a genuine Win32 .res stream;
unknown syntax fails rather than dropping resources. The selected MSVC-targeting
Clang also preprocesses the header-free resource definition; native dependencies
use that compiler for actual Windows C/assembly code.
Native Windows builds continue using the standard SDK resource compiler.

`scripts/prepare-windows-test.py` checks PE32+/x64/GUI headers, atomically replaces the
executable and adds instructions, a launcher and a SHA-256 build manifest to
`WINDOWS_TEST`. Desktop shortcuts point to this shared folder; no copies are needed.
No Node/Rust/pnpm installation is needed to run that build. WebView2 remains
the usual Windows system runtime prerequisite.

Windows code has compiled successfully and imports only Windows system DLLs.
The user confirmed the rebuilt application opens after the viewport CSP fix.
Direct Windows startup is now verified through the mapped-drive launcher.
The earlier WSL socket restriction ended when the user granted full access.

## Windows delivery and image lifetime

Each editor build is published once to WINDOWS_TEST/builds/<sha256>/FBones.exe.
Never replace a binary at an immutable path. The stable root FBones.exe is a
small native bootstrap for existing Desktop shortcuts; current-build.txt is its
strictly validated build pointer. The mapped-drive PowerShell launcher reads
build-info.json and verifies the selected image hash. Neither route writes to
the Desktop or requires the user to copy a build.

The GUI must not use anonymous standard-stream pipes owned by a short-lived
PowerShell launcher. The bootstrap uses NUL streams; PowerShell uses
CreateNoWindow without redirects. Readiness logging ignores output errors.
Actual Windows testing observed an older loaded PE timestamp despite a newer
root executable on the WSL share, plus corruption during compression; unique
image paths and detached stream ownership passed the complete lifecycle.
Do not attribute that diagnostic to a proven miniz codec defect.

Delivery regression checks:
`python3 scripts/test-windows-delivery.py` and
`rustc --edition=2021 --test scripts/windows-bootstrap.rs -o .local/bootstrap-tests`
then `.local/bootstrap-tests`. Native Windows launch still needs observation.

## MCP first authoring

Expose new supported operations through the native Session for both the UI and
MCP. See [the contributor contract](../CONTRIBUTING.md#mcp-first) and
[AI workflows](MCP.md). Regenerate and check schemas with
`node scripts/generate-mcp-schema.mjs` and `--check`; keep typed discovery and
protocol verification with the feature. The optional official-client acceptance
uses a separately supplied pinned SDK and a dedicated owned native instance.
