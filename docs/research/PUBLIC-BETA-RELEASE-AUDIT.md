# Public beta release audit — 2026-10-31

Read-only review of the publication scripts, desktop workflow, bundle
configuration, README, notices, and existing Windows build. This audit did not
launch applications, change protected processes, observe GitHub workflow runs,
or establish a public release.

## Observed source publication boundary

`scripts/prepare-public-release.py` selects source/configuration and handwritten
documentation. It excludes local tools, generated output, original packages,
original-editor screenshots, personal research trees, and historical instruction
archives. Binary assets use a small explicit list. Text passes a credential and
private-path scan. Its manifest hashes each selected file.

The exporter now compares archive members and hashes with the reviewed source
manifest, rejects unexpected members, and clears tar owner names/IDs and member
timestamps. `scripts/publish-public-beta.sh` checks the clean Git tree,
source/archive correspondence, checksum, account, branch and tag before an
atomic push. It publishes a source-only prerelease without force pushing or
replacing an existing release. The source publisher requires working GitHub CLI
authentication and network access; tool availability alone is not publication.

The earlier 465-file preflight was verified and contained no private roots or
symlinks. A subsequent export must use a new manifest and be checked again after
documentation/workflow edits. Do not reuse a preflight archive as evidence for
later source changes.

## Desktop workflow before the audited changes

Directly observed in `.github/workflows/desktop.yml` at review time:

| Platform | Requested output | Current evidence |
| --- | --- | --- |
| Ubuntu 22.04, x64 | Debian package and AppImage | Workflow configuration only; no run observed in this audit |
| Windows, x64 MSVC | NSIS installer | Workflow configuration only; the existing accepted local executable is a different delivery |
| macOS, universal Intel/Apple Silicon | App bundle and DMG | Workflow configuration only; no native macOS release validation recorded |

The workflow triggers on main pushes, pull requests, and manual dispatch. It
installs dependencies, runs JavaScript tests, builds/checks frontend TypeScript,
runs Rust workspace tests, builds the requested bundles, and uploads Actions
artifacts. It has read-only repository permissions and no release upload step.
It does not currently run the browser UI suite, scan packaged files, collect
complete dependency license texts, or exercise installed applications.

`src-tauri/tauri.conf.json` declares macOS 13+, the application icons and
`.fbones` file association. It does not configure bundled license resources,
Windows signing, macOS signing, or notarization. `THIRD_PARTY_NOTICES.md` is
explicitly a direct-dependency metadata summary, not complete binary notices.

## Existing Windows executable

The recorded 0.9.4 image has SHA-256
`429e4c4f3f9aa08204f5c5f7d960f8d4d0f132dc0f86a1348b948a8be343887c`
and is 12,440,064 bytes. The inspected file matches those values. Its raw bytes
contain 246 ASCII occurrences of private absolute build paths. A scan also
checked UTF-16 text and credential markers; no matches were found for those
patterns. This is a bounded pattern scan, not proof of absence of every secret.

Do not publish this image unchanged: contributor instructions prohibit local
absolute paths in distributables. Do not patch it in place or replace its
immutable delivery. Path-remapped rebuilding produces a new image whose hash
and native acceptance must be recorded independently.

## Work needed for platform downloads

1. Build from the release commit with locked dependencies and Rust source-path
   remapping covering checkout, Cargo cache, toolchain, and temporary build
   roots. Use a clean rebuild so old dependency objects cannot retain paths.
   Scan the resulting executable, extracted bundles and embedded resources for
   actual build roots, ASCII/UTF-16 private paths and credentials. Retain the
   check with the artifact hashes.
2. Collect the actual Rust and JavaScript dependency closure and upstream
   license texts/notices for each artifact. Package the FBones license and those
   notices inside, or alongside, each distributable. A table of license
   identifiers alone does not supply the upstream notices.
3. Run the required checks against that commit. The Ubuntu browser suite proves
   its own scope; add native installation/startup, both GPU views, generated
   project editing and Save As/Close/Open checks on each claimed platform.
   Record which Intel/Apple Silicon macOS slices were actually launched.
4. Retain immutable platform artifacts with source commit, target, toolchain,
   application version and SHA-256 manifest. Validate the final installer and
   installed executable identity, then attach those same bytes. Build success
   and uploaded Actions artifacts are separate from native launch validation.
5. Add an explicit release publishing job with repository write permission only
   where needed, restricted to the intended tag. Pull requests must not obtain
   publishing credentials. Download the verified artifacts from the matching
   workflow/commit before attaching them to the existing prerelease. Declare
   signing/notarization status accurately; configuration does not prove signing.
6. Update README and release notes with the actual download links, artifact
   names, supported targets and observed checks only after attachments exist.
   Until then the source-only statement remains accurate. Existing local
   Windows test-workspace launchers are not public installers.

These are release engineering requirements and evidence limits. They do not
change the active animation roadmap or establish additional Spine compatibility.


## Integrated configuration after review

The workflow now includes an exact-tag, intended-repository source release job
requiring all three native build jobs and the Ubuntu UI job. Only that release
job gets contents-write. The publisher no longer creates a release locally;
it watches the exact commit/tag run before reading release state. Tauri's Cargo
lock flag is now placed after the required `--` delimiter.

Only relative-path JSON build reports are uploaded from platform jobs. They
record target, source commit, tool/application versions, executable/package
hashes, and structural checks, with native_gui_validation false. macOS uses
ad-hoc signing and checks both slices/signature. No installer is attached to the
source beta; full notices, package-wide privacy and native acceptance remain
open. The executable pattern scan is bounded; it does not inspect compressed
installer resources. These are code/configuration observations, not hosted run
or published asset evidence.
