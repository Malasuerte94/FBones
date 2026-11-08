# Public installers and runtime DATA gate — 2026-11-08

The user now explicitly requests both an installable FBones application and the
Pixi-capable runtime in GitHub Releases. This supersedes the earlier source-only
desktop publication policy. It authorizes experimental installer publication;
it does not establish signing, native installation or original-format parity.
This gate precedes dependent workflow/packaging edits; no product fix is needed.

## Direct current evidence

Read-only connected GitHub release GET for `v0.9.4-beta.5` confirms six published
assets: source archive, runtime `.tgz`, `SHA256SUMS` and three platform reports.
Tag run42511316324 artifacts contain only the runtime archive and those three
reports. Installers were built but not retained/uploaded. The live release is a
prerelease titled “editor source and runtime preview”, published2026-11-08.
Local exact downloaded reports and `analysis/public-beta5-check.json` identify
source commit `4033a831b057d9bbe1a13e8f009eb3d3869b9299`; their hashes were already
verified in the prior publication checkpoint. No installer exists among the
assets merely because its filename/hash appears in a report.

`scripts/ci-build.py`, `.github/workflows/desktop.yml` and the Tauri bundle config
prove these current native outputs and structural checks:

| Target | Packages | Existing direct checks |
| --- | --- | --- |
| Windows x64 | one NSIS setup `.exe` | app PE32+/x64, installer MZ header |
| Linux x64 | one `.deb`, one `.AppImage` | app ELF64/x64, dpkg metadata, Type2 AppImage header |
| macOS universal | one `.dmg` containing app build | app x64+arm64, strict ad-hoc codesign verification, hdiutil image verification |

Reports include app and package SHA256, package byte sizes, exact source commit,
version and compiler/runtime versions. All three explicitly retain
`native_gui_validation=false`; macOS says ad-hoc/not notarized, other signing is
not verified. The existing path-remapping and private-path scan examine the
uncompressed built application executable. They do **not** prove every compressed
installer member has been inspected, or installation/native launch on all three
OSes. The Tauri config has no added reference/research resource bundle.

Prior Windows workspace startup/menu/file-command observations are bounded own
development-image observations, not acceptance of the hosted NSIS installer.
Ubuntu browser tests use real isolated Rust Sessions under production CSP; they
do not prove native GTK dialogs, Windows install/SmartScreen behavior or macOS
Gatekeeper/notarization. These limits need clear public labels, not a new block
on the user's requested experimental prerelease. No original editor observation
or compatibility expansion is part of this publication change.

## Minimal robust publication contract

1. Create a new immutable beta6 source snapshot/tag carrying the changed workflow
   and policy; keep beta5/tag/assets intact. Do not reconstruct missing installer
   bytes from filenames/hashes, move a tag or claim the old source-only workflow
   published them. Editor version0.9.4/runtime0.1.0-beta.1 may remain unchanged.
2. After existing native verification, retain only the four validated packages
   selected by each target's report, plus its report. Do not upload the whole
   target/release tree, debug symbols, `.app` development directories, workspace
   Windows launchers or original/reference assets. Named per-target artifacts
   should prevent silent filename collisions/overwrites when downloaded.
3. Keep release dependent on **all** desktop matrix and Ubuntu UI/runtime gates.
   Keep the validated tag handling and source/runtime verifiers. A main push
   remains a build; the immutable beta tag owns release publication.
4. Before publishing, validate the closed expected three targets and architecture
   sets; report version against checkout metadata; `source_commit` against the
   exact current `GITHUB_SHA`; and expected package counts/types. Require safe
   normalized relative paths/basenames, no symlinks/traversal/duplicate assets,
   exact report-listed byte sizes and SHA256, no missing or extra package files.
   Keep report text free of local paths/credentials. This binds installer bytes
   to the same verified build/report/commit rather than trusting arbitrary globs.
5. Publish all four installer files beside source and the same independent
   runtime `.tgz`, with the three build reports and an aggregate `SHA256SUMS` for
   source/runtime/installers/reports. Verify actual published assets/digests after
   CI, retaining exact commit/run provenance. Neither report flags nor signing
   claims should be silently upgraded by the publication step.
6. Make the asset choices visible in README/release notes: Windows x64 setup,
   Linux x64 deb/AppImage, universal macOS DMG and developer runtime. The existing
   `@fbones/runtime` archive already includes the optional PixiJS8 `/pixi` entry
   and headless Node/browser entry; it is not another editor installer. Preserve
   its own MIT/license/content/version checks. Registry publishing and installed
   application auto-update remain separate; neither occurs from these assets.

Package/workflow implementation is assigned to the independent packaging agent;
the coordinator owns tests, source/tag push, CI observation and publication.
Meaningful verifier regressions should use disposable generated fixtures for
wrong commit/version, changed/missing/extra bytes, traversal/symlink/collision
and valid target sets. No shared test, build, remote mutation or user/original
window operation was performed by this DATA audit.

Evidence commands: read current `scripts/ci-build.py`, Tauri bundle config,
workflow, public release notes and exact downloaded beta5 platform reports;
connected GitHub GET `/repos/Malasuerte94/FBones/releases/tags/v0.9.4-beta.5` and
workflow artifact listing42511316324. Existing provider descriptions reference
GitHub's official release/artifact APIs; no new external behavioral assumption
is used to claim native acceptance.

## Repository Releases sidebar / Latest metadata gate — before mutation

The user's latest clarification is the repository's **right-hand Releases
sidebar**, which shows tags instead of the desired downloadable Latest card.
This explicitly supersedes the former decision to keep GitHub's prerelease flag.
README tables alone cannot change GitHub's release classification.

Read-only live beta6 metadata still marks it `prerelease=true`, `draft=false`,
with all ten existing assets present. The current workflow explicitly creates
releases with `--prerelease --latest=false`. GitHub's official
[release API documentation](https://docs.github.com/en/rest/releases/releases#update-a-release)
states that prereleases cannot be Latest and exposes `prerelease` plus
`make_latest` for release metadata. This is a direct metadata-policy explanation;
actual sidebar rendering must be checked after the update.

DATA concurs with the minimal authorized correction: update the **existing**
beta6 release using `prerelease=false` and `make_latest="true"` (REST PATCH to
its existing release ID), or the equivalent GitHub CLI
`release edit v0.9.4-beta.6 --prerelease=false --latest`. Preserve its existing
tag, commit, assets and hashes. Keep “beta”/early-beta scope and native signing,
installation and compatibility limits visible: GitHub Latest eligibility does
not establish stable product quality. No new tag, app build or asset re-upload
is required for this metadata correction.

For future gated publications, the main-branch workflow should explicitly create
the release with `--prerelease=false --latest`, keeping all existing build/UI/
runtime/closed-asset gates. A main-only workflow update does not itself republish
beta6 or move its immutable tag. Afterward verify the Latest API resolves beta6,
the repository sidebar shows the download-bearing release, and its ten asset
identities/digests remain unchanged. Coordinator owns the authorized mutation;
this gate was recorded before it, with no remote write by this auditor.
