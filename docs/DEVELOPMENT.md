# Development

## Normal setup

Install Node 22.12+ (24 LTS recommended), pnpm 11, stable Rust, and the platform
prerequisites from https://v2.tauri.app/start/prerequisites/.

Run `pnpm install`, then `pnpm dev`. `pnpm dev:web` previews the interface in a
browser; native project file operations require Tauri.

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

## Original Spine comparison

Use original Spine 4.3.26 on Windows. Create an empty project and one-change
fixtures (rename skeleton, add one bone, translate one bone, etc.). Keep assets
and user projects outside version control. Record the operation, version,
checksum, and observed result. Rename a *copy* of an FBones output to `.spine`
and open it in Spine. Preserve the source files.

Place controlled reference fixtures in ignored `updates/fixtures/`, starting
with `blank-4.3.26.spine`: File → New in the original 4.3.26 editor, then save
without adding bones/images/animations. Next save separate copies with one
change each. File naming alone does not establish the internal version.

For automated controlled fixtures, run `WINDOWS_TEST/FORMAT_TEST/Ruleaza-Testele.bat`
on Windows. The separate `fbones-reference.exe` discovers the installed original
`Spine.com`, or accepts `--spine "C:\path\to\Spine.com"`. It needs the original
installation activated and version 4.3.26 available. It creates eight fresh cases
and an envelope-repacking probe beside itself. Results under the shared workspace
are directly accessible; older Desktop batches can be archived with the import
script below. No personal project is used, modified or overwritten. FBones does
not call this helper at runtime. This collection has already passed.

Run its local tests with `cargo test -p fbones-research`. Its process timeout
test runs on Unix; actual original-Spine CLI acceptance requires Windows results.

Returned results can be checked locally without launching Spine:
`python3 scripts/check-reference-results.py updates/fixtures/reference-results-1793191428306
--output analysis/reference-check.json`. The current returned batch passes all
eight controlled cases and the repacked payload/export equality checks. This
verifies the artifacts and records the original collector's acceptance report;
its scope is the original envelope comparison, distinct from the later accepted
minimal-profile project encoder.

`FORMAT_TEST/Verifica-Proiectele-Noastre.bat` uses the independent writer, then
asks original Spine to open/export its generated projects. All eight cases and
interactive opening have now passed. Neither batch needs to be repeated.
For local differential verification run `cargo run -p fbones-research --
--compare-candidates updates/fixtures/reference-results-1793191428306`.
`--generate-candidates` writes experimental projects without invoking Spine;
`--verify-generated` additionally checks them in the original application.

## Windows access without copying builds

Windows Explorer can access a WSL workspace through
`\\wsl.localhost\<distribution>\home\<user>\<project>`. Open this workspace's
`scripts/windows-workspace-shortcuts.bat` once on Windows to create Desktop
shortcuts to the actual application and shared WINDOWS_TEST folder. The script
does not copy builds or modify Codex permissions. It refuses to replace a
shortcut pointing elsewhere. The user ran this setup successfully; both created
shortcut targets have been independently verified. The user also confirmed
application startup through the shared UNC shortcut.

Run subsequent test batches directly under shared WINDOWS_TEST/FORMAT_TEST.
Use an existing mapped drive (W: on this host), including for every Spine
input/output argument: original Spine refuses UNC paths even when CMD accepts
the current folder. Results appear directly in the workspace. Older Desktop results can also be read
and archived by `python3 scripts/import-windows-results.py`; the local source
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

Windows comparison for the new stage: shared
`FORMAT_TEST/Verifica-Bones.bat` (`fbones-reference.exe --verify-bones`). It
generates four profiles: chain, branches, reordered/reparented hierarchy and
Unicode names, then verifies original Spine exports by bone name/parent and
numeric transform. It does not repeat the accepted eight-case baseline.
Result reports have `caseSet: bones-v1`; validate their actual files with
`python3 scripts/check-reference-results.py <result-folder>` and optionally
`cargo run -p fbones-research -- --compare-candidates <result-folder>`.
All four cases have now passed original Windows Spine 4.3.26 from W:;
independent artifact validation and byte comparisons passed. The user also
confirmed bone creation, dragging and parenting. Do not repeat this batch.

## Windows portable test build from Linux

Run `bash scripts/build-windows-test.sh` when a cached Microsoft SDK/CRT is
available. Set `FBONES_WINDOWS_SDK` to its root, otherwise the script reads the
existing cargo-xwin cache. Everything generated is workspace-local.

The script uses Rust's bundled LLD and statically links the CRT. The restricted
`windows-resource.py` converter handles only the VERSIONINFO, ICON and manifest
resources emitted by this project. Its output is a genuine Win32 .res stream;
unknown syntax fails rather than dropping resources. GNU cpp preprocesses this
header-free resource definition only; it does not compile executable code.
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
