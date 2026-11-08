# Public update DATA gate — 2026-11-08

Question: which source, package and CI changes are required for the authorized
push to publish the current update automatically without weakening release
verification or exporting private research? This is a release-data audit of our
own scripts; no original editor observation is needed or claimed.

## Directly proven from current source before edits

- `scripts/prepare-public-release.py` fixes `TAG` to `v0.9.4-beta.2` and exports
  only its named root files and `.github/src/src-tauri/crates/tests/scripts/docs`
  trees. It therefore omits the new independent `packages/runtime` source. Adding
  that tree also requires excluding generated `dist/` and explicitly accounting
  for its suffixless MIT `LICENSE`; the existing secret/private-path, symlink,
  binary-asset and complete source/archive manifest checks must remain.
- `scripts/publish-public-beta.sh` fixes the same tag in archive names, tag push,
  workflow lookup and release view. Its atomic main/tag push and check-gated
  release ownership are the existing publication model. Reusing beta.2 would
  change an already published identity and is not an update strategy.
- `.github/workflows/desktop.yml` builds on `main` pushes but creates releases
  only for `refs/tags/v0.9.4-beta.2`. A main push alone does not create a new
  release. All three platform builds and Ubuntu UI must pass before publication.
- `tests/e2e/runtime-pixi.spec.ts` builds a probe importing package `dist` entries.
  Fresh CI checkouts have no generated package `dist`; run `pnpm build:runtime`
  before the browser suite. `pnpm test:runtime` also runs the native export
  verifier, which requires the opt-in native host to have been built first.
- `packages/runtime/package.json` declares `@fbones/runtime`0.1.0-beta.1, ESM,
  declarations, MIT and optional Pixi peer. `npm pack` needs the checked generated
  bundles/types/license, and installs without editor/Pixi for its headless entry.
  `verify-dist.mjs` checks those prerequisites and platform-independent imports.
- The current public desktop policy is source-only: CI compiles platform
  installers and attaches structural reports, not unvalidated installers. No
  existing updater configuration or npm publication workflow was found in the
  reviewed files. Automatic CI builds do not imply application self-update or
  npm registry availability.

Commands/sources: `cat scripts/prepare-public-release.py
scripts/publish-public-beta.sh .github/workflows/desktop.yml`, package build and
verification scripts, `rg -n 'runtime|beta.2|source-only' README.md
docs/DEVELOPMENT.md .github`, and current STATE/TASKS. These are source-proven
facts about our project, not exact-version Spine behavioral claims.

## Recommended bounded release policy

Publish a new reviewed `v0.9.4-beta.3` source snapshot/tag, retaining existing
tags/releases. Parameterize the release tag consistently and validate it before
using it in paths/commands; do not change editor0.9.4 or runtime0.1.0-beta.1 merely
to name this source beta. Include only the runtime source subtree, not its build
cache, in the audited Git/source export. Preserve the complete allowlist and
source/archive equality checks; include root MIT license and only our assets.

Build and test the runtime before dependent GPU UI, and gate publication on all
existing platform/UI checks plus runtime/native-export checks. Generate a clean
runtime `.tgz`, inspect its file list and standalone behavior, and attach it with
source/archive checksum entries to the same tag release. Validate uploaded source
and runtime bytes against the reviewed commit/build inputs after publication.
This does not authorize or establish npm scope ownership; GitHub tarball
installation can work immediately while registry publication stays explicit.

Update public README/release notes to describe the new runtime preview,114-case
UI scope and current limits. Preserve source-only desktop/install/notarization
limits and explain that `main` triggers builds while a new beta tag triggers a
release after green checks. No original probes, global Git/agent settings,
protected process operations, force pushes or installer-policy expansion are
needed for this task.

The coordinator owns implementation, tests, Git/remote actions, current
STATE/TASKS and cleanup. This auditor created no build/temporary artifacts.

## Implementation review

The proposed generic tag handling is quoted/validated before paths or shell use;
the audited source export now includes the runtime source/license while skipping
generated `dist`. The UI runner builds the runtime before serving its dependent
GPU probe, and its normal native-host build precedes runtime export verification.
The release still depends on all desktop/UI jobs and retains source-only desktop
installer policy. Runtime archive generation/checksum upload is part of the UI
job, so its failure blocks the tag release. Main builds and tag releases remain
distinct from an installed-editor updater or npm publication.

A direct read-only audit probe accepts `v0.9.4-beta.3`, rejects malformed/injected,
zero-beta and mismatched-version tags, and observes675selected source files with
both runtime entries/license present and no generated `dist`/private trees.
The own import bytecode created by that probe was removed; no test server,
application build, process/window or remote mutation was performed.

The reviewed runtime artifact verifier now enforces canonical member paths, the
checkout's expected runtime version, a closed public package shape (`dist`,
`examples`, root package/license/readme), bounded text payloads and the private
path/credential guard. A separate disposable audit passed the actual current
archive (`3239fd38…d1a61`) and rejected normalized aliases, unreviewed root files,
private-path payloads and version mismatch. Its own temporary tree was removed.
This is archive/data verification, not a new native renderer or original-editor
observation. The coordinator still owns clean-install/CI/public artifact checks.
