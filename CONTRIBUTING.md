# Contributing to FBones

FBones is an early desktop animation editor. Contributions from animators,
designers, testers, writers and developers are welcome. You can help without
owning Spine or working on its file format.

## Pick a contribution

Read the [roadmap](docs/ROADMAP.md) for what works and what remains open. Open an
issue before a large change so we can agree on scope and avoid duplicate work.
For a small fix, documentation correction or reproducible bug, a pull request
is welcome directly.

Useful starting points include:

- Improve the getting-started instructions from a fresh installation.
- Test installation and native file dialogs on Linux or macOS and report the
  exact platform, version and steps.
- Reproduce an editor issue with a small project and artwork you can share.
- Improve keyboard interaction, focus visibility and compact panel layouts.
- Add a focused regression for an established behavior or a bounded parser case.
- Help with translation strings in `src/i18n.ts`.

Animation and timeline work is the current product priority. Exact Physics
dynamics and the remaining Transform Match research are deferred. Please discuss
new compatibility work before starting another reference experiment.

## Build and run

Install Node.js 22.12 or newer, pnpm 11.1.0, Rust 1.93 or newer, and the
[Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/) for
your operating system. The lockfiles pin application dependencies.

```sh
pnpm install --frozen-lockfile
cargo fetch --locked
pnpm dev
```

`pnpm dev` opens the native editor. `pnpm dev:web` runs a browser preview with
temporary sessions; native file operations need the desktop application.
`pnpm build` creates the desktop build on the host platform.

The workspace-local caches under `.tools/` are optional and ignored. A public
checkout does not include the original development machine's caches, research
fixtures or Windows test workspace. See [development](docs/DEVELOPMENT.md) for
the architecture and additional tooling.

## Find the right code

| Area | Location |
| --- | --- |
| Editor shell, panels and controls | `src/App.vue`, `src/components/` |
| Workspace state and typed native calls | `src/stores/`, `src/services/` |
| Animation sampling and viewport helpers | `src/domain/`, `src/composables/` |
| Native Session, history, files and authoring | `src-tauri/src/` |
| Independent binary reader and writer | `crates/fbones-format/` |
| Optional original-editor comparison tools | `crates/fbones-research/` |
| JavaScript and real-Rust UI regressions | `tests/`, `tests/e2e/` |

Rust owns authored project state and persistence. Vue uses the typed bridge;
the renderer previews locally without sending a complete scene over IPC for
every pointer event or frame. The format crate has no Tauri or UI dependency.
The research helper is separate from the shipped editor.

## Validate a change

Run checks that cover the change during development. Before proposing a product
change, run the relevant parts of this integration set and report the results:

```sh
pnpm typecheck
pnpm build:web
pnpm test
cargo test -p fbones-format --locked
cargo test -p fbones-desktop --locked
cargo check -p fbones-desktop --locked
cargo test -p fbones-desktop --no-default-features --locked
```

For interface changes, use the production frontend and the application's real
Rust Session through the opt-in test host:

```sh
cargo fetch --locked
pnpm test:ui
```

The UI runner builds Rust with `--offline`, so fetching dependencies first is
required on a new machine. It expects Chrome at `/usr/bin/google-chrome` on
Linux; set `CHROME_BINARY` to your installed Chromium executable when needed.
This is the established Ubuntu regression route. It does not verify native
GTK, Windows WebView2, OS dialogs, OS drag and drop, or macOS.

After a successful build, a focused rerun can use:

```sh
pnpm test:ui --no-build --grep 'weighted clipping'
```

Rebuild after changing product Rust or frontend sources. Avoid rebuilding
`dist/` while another UI test run serves it. Tests use generated assets and
isolated sessions; they must never automate an existing user editor window.
See [testing](docs/TESTING.md) for traces, evidence limits and native checks.
Documentation-only contributions need link/content checks, not an app rebuild.

## Preserve project data

- Keep unsupported projects inspection-only. Do not discard unknown records to
  make a document editable.
- Preserve bounded parsing and complete canonical reserialization equality.
  Lossless copying is different from independently encoding a compatible file.
- `.fbones` retains the supported Spine 4.3.26 binary structure. Do not replace
  it with JSON, a custom wrapper or a renamed opaque template.
- Setup data, sampled animation poses and transient Physics state are separate.
  Playback and preview must not bake into authored values.
- A completed edit gesture creates one native history action. Invalid or stale
  edits reject atomically; Save flushes valid pending fields and stays dirty on
  failure or cancellation.
- Keep the strict production CSP. Do not enable `eval` to fix a renderer issue.

## Compatibility evidence and shareable material

Spine **4.3.26 Professional** is the compatibility reference. Existing accepted
findings come first; primary documentation comes next; assumptions must be
identified as FBones policies. A current documentation page does not establish
the exact behavior of that editor version. Full compatibility is still open.

Format work needs small, independently generated fixtures and semantic/binary
comparisons. Claim original-editor acceptance only after that exact supported
profile has actually been opened or exported there. Do not repeat accepted
reference batches without a new question or a relevant change.

Only submit code and assets you have the right to contribute. Do not upload
proprietary editor binaries, extracted/decompiled code or assets, license keys,
personal projects, private screenshots, machine-specific paths or raw research
captures. Use original artwork or clearly licensed assets for examples. Keep
private reference material outside Git. Spine is a separate proprietary product;
contributing to FBones does not grant a license to it.

The [project license](LICENSE) applies to contributions. Third-party dependencies
retain their own licenses. Do not copy proprietary runtime implementations into
the editor.

## Submit a pull request

Fork the repository, create a branch and keep each pull request focused. Explain
the concrete problem, resulting behavior and checks you ran. Include a screenshot
or short recording for a visible interface change, using a project you can share.
State any remaining platform or compatibility limits explicitly.

Bug reports should include the FBones version, operating system, reproduction
steps, expected result and actual result. Attach a minimal shareable example
when possible. Do not submit private work just to demonstrate a bug.

The detailed [task list](docs/TASKS.md) and [current checkpoint](docs/STATE.md)
track implementation evidence. Read [AGENTS.md](AGENTS.md) when using an AI
coding agent; its reference, data-protection and coordination rules also apply.
