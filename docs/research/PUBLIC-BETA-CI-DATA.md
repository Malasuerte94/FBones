# Public beta CI — DATA reference audit

Date: 2026-10-31. Scope: read-only inspection before changing build/release
automation. No product behavior, workflow, test, original editor or user process
was changed or executed by this audit. This is build/persistence evidence, not
an exact Spine 4.3.26 behavior claim.

## Directly inspected

Sources: `.github/workflows/desktop.yml`, `package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, root and desktop `Cargo.toml`,
`src-tauri/tauri.conf.json`, `src-tauri/build.rs`, native dialog implementations,
`tests/run.mjs`, component/CSP tests, UI runner and native asset tests.

Reproducible inspections:

```sh
cat .github/workflows/desktop.yml package.json pnpm-workspace.yaml
cat Cargo.toml src-tauri/Cargo.toml src-tauri/tauri.conf.json
rg -n "resolveDir:|lastIndexOf|compiler-sfc" tests
rg -n 'include_bytes!|include_str!|std::os::unix|cfg\(unix\)' crates src-tauri/src
```

All literal Rust `include_str!`/`include_bytes!` paths checked by a source scan
exist in this workspace. That does not establish their inclusion in a future
public Git tree; check the release tree as well.

## Required corrections inferred from source

1. **Fresh pnpm resolution:** `tests/weights-panel.test.mjs` imports
   `@vue/compiler-sfc`, which is not a direct dependency in `package.json`.
   The current flattened local dependencies can hide the issue under pnpm's
   normal isolated install. Vue 3.5.40's inspected package exports include
   `vue/compiler-sfc`; use that public subpath or explicitly declare the compiler
   dependency. This is a source-based clean-install risk, not a reproduced CI
   failure in this audit.
2. **Windows test path:** the same test's esbuild `onLoad` callback derives
   `resolveDir` with `path.slice(0,path.lastIndexOf('/'))`. An absolute Windows
   path containing backslashes fails that assumption. Use `node:path`'s
   `dirname(path)`. The test runner itself correctly uses `fileURLToPath`.
   This is inferred from path semantics; a Windows CI run must verify it.
3. **Release automation is absent:** the inspected workflow runs on main pushes,
   pull requests and manual dispatch, builds three platforms, and uploads Actions
   artifacts. It has only `contents: read`; it neither handles version tags nor
   attaches downloads to a GitHub Release. Add a controlled release path with
   job-scoped write permission and verify the tag/commit/version before upload.
   Keep pull-request builds read-only. Package assets, hashes and source commit
   should be visible in release evidence.
4. **Bundle integrity:** archive a macOS `.app` with preserved permissions and
   symlinks before upload, or distribute the DMG. Uploading its directory alone
   is not a satisfactory downloadable application artifact. Validate all
   expected package types, not just the existence of any bundle file.

## Existing configuration and bounded risks

- **Directly proven:** Node 24 and pnpm 11.1.0 are requested in CI. Rust uses
  stable while the workspace minimum is 1.93; record the actual toolchain from
  the run. Both lockfiles exist. `pnpm install --frozen-lockfile` and
  `cargo test --workspace --locked` are already present.
- **Directly proven:** no offline Cargo flag appears in this desktop workflow.
  The separate UI runner does use `--offline`; add `cargo fetch --locked` before
  introducing that runner on a fresh host. Do not publish development caches.
- **Directly proven:** Windows uses the native MSVC target and NSIS; the workflow
  does not call the workspace's special cross-build scripts. Native dialogs use
  Windows PowerShell/WinForms, macOS `osascript`, and GTK on Linux. A successful
  package build does not verify those dialogs.
- **Directly proven:** macOS installs both Apple Rust targets and requests
  `universal-apple-darwin`. Deployment target and bundle minimum both specify
  13.0. Verify the packaged Mach-O contains both architectures with `lipo` on the
  macOS runner. Host `cargo test` covers only that runner's architecture.
- **Documented/inferred:** no Apple signing or notarization identity is configured
  in the inspected workflow. For a beta without a developer certificate, use
  explicit ad-hoc signing (`APPLE_SIGNING_IDENTITY=-` or the matching Tauri
  configuration) and verify the resulting signature. Label it unnotarized;
  ad-hoc signing does not remove macOS's downloaded-app security prompts.
  [Tauri signing documentation](https://v2.tauri.app/distribute/sign/macos/).
- **Documented/inferred:** Ubuntu 22.04 is a suitable Tauri Linux baseline and
  should be retained for the stated compatibility range. Building on newer
  distributions can raise the glibc floor.
  [Tauri AppImage limitations](https://v2.tauri.app/distribute/appimage/#limitations).
- **Directly proven/documented:** the explicit Linux install includes WebKitGTK,
  GTK, build-essential, librsvg and patchelf. The primary prerequisite list also
  includes libssl, libxdo, an appindicator development package, file and download
  tools. Some may already be supplied by the runner or are unused by this app;
  omission is not established as a failure. Prefer an explicit prerequisite
  set when making CI reproducible.
  [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).
- **Directly proven:** inspected Unix symlink and shell-timeout tests are guarded
  by `cfg(unix)`. JavaScript path strings in mocked summaries do not access the
  real OS filesystem. No unguarded Unix import was identified in this targeted
  audit. This does not replace compiling/testing the matrix.
- **Directly proven:** production CSP remains strict and the opt-in e2e host is
  excluded from ordinary builds. Preserve those boundaries in CI changes.

The documented Tauri GitHub pipeline uses platform-native runners and a release
job with write permission. It is guidance for tooling, not evidence that FBones
has built or launched on those runners.
[Tauri GitHub pipeline](https://v2.tauri.app/distribute/pipelines/github/).

## Acceptance after implementation

Observe one clean GitHub matrix run of the actual published source commit. Read
each job's install, checks, build and upload results. Download the artifacts,
compare hashes and inspect their platform/package structures. Observe release
asset names and links against the same commit/tag. Check that the macOS image
contains both architectures and a declared signing status. Native startup,
dialogs, GPU behavior and save/reopen remain separate platform acceptance work;
CI compilation/package inspection alone cannot close those claims.


## Integrated local result

The test now uses `vue/compiler-sfc` and `node:path` dirname. An isolated pnpm
resolution check outside the original workspace confirms the declared export
works and the old undeclared import fails. Installing dependencies with scripts
hit an esbuild spawnSync EPERM in the sandbox; the isolated resolution check
used --ignore-scripts and is not a complete clean-install/build observation.
Current workspace JS263pass/1knownskip, frontend/test TypeScript, Rust254native/
46format/7research and93legacy pass. No product runtime source changed.

The workflow now fixes Cargo argument placement with Tauri's separator, gives
Ubuntu UI a600-second suite watchdog, checks package/architecture/hash reports,
and gates source release creation on all three platform builds plus UI. The
shell publisher only watches that workflow after pushing. No hosted runner
result follows from this local integration. Installer distribution and native
GUI acceptance remain separate from source release and compilation.
