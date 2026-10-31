# Public source and asset provenance

FBones is an independent editor. Its public source is the Vue/TypeScript UI,
Rust desktop application and format implementation, original test generators,
build scripts, and written specifications. Spine is a reference application;
its editor, runtime source, extracted resources, and example artwork are not
included or required to build FBones.

## Included material

| Material | Origin and scope |
| --- | --- |
| `src/`, `src-tauri/src/`, `crates/` | FBones application, format, tests, and separate research tools. The research executable is not called by the application. |
| `src-tauri/icons/` | FBones F/bone logo, with its SVG source and application icon variants. |
| `tests/` and `scripts/e2e/` | Tests using generated project data, geometric markers, PNGs, and audio. |
| JSON comparison fixtures | FBones sample descriptions and numeric observations. Their provenance is recorded inside the files; they contain no extracted original code or assets. |
| `docs/screenshots/` | Screenshots of FBones using its own generated sample data. See the screenshot provenance notes in that directory. |
| Written format and research notes | Our specifications, observations, limitations, and reproduction procedures. Historical references to ignored evidence are not downloadable test fixtures. |

The two numeric fixtures under `docs/research/fixtures/` are included by Rust
tests at compile time. Preserve them when preparing source archives:
`transform-match-active-properties-reference.json` and
`transform-match-active-offset-reference.json`.

## Excluded local material

Original editor packages and archives, original-editor screenshots (including
`animare/`, `spine_pictures/`, and `interface.png`), personal projects, raw
research, process ownership receipts, local credentials/configuration, tool
caches, and generated test/build output remain outside the public source.
The local `WINDOWS_TEST/` delivery workspace is not the public release archive.

Contributions should use original or explicitly licensed artwork and minimal
generated reproductions. Do not upload activation information, proprietary
editor resources, extracted code, or personal projects as issue attachments.

## Dependencies and release boundaries

The JavaScript and Rust lockfiles pin dependencies. Dependency licenses remain
their respective authors' licenses; the project license does not replace them.
Direct dependency metadata includes MIT, Apache-2.0, and dual MIT/Apache-2.0
licenses. Platform WebViews and operating-system libraries are separate system
components. This summary is not a complete transitive binary notice inventory.

The beta documents implemented features and bounded comparisons with Spine
4.3.26. A source release or successful build does not establish complete project
compatibility, matching Physics dynamics, or native validation on every platform.
See the [roadmap](ROADMAP.md) for current implementation boundaries.

## Preparing the public source beta

Run `python3 scripts/prepare-public-release.py` from the working tree. It exports
only named source/configuration files and reviewed source/documentation trees,
excludes historical instruction archives and local/private material, rejects
symlinks and unreviewed file types, and checks text for obvious credentials and
private user paths. Archive ownership metadata is normalized rather than exposing local user names.
The result includes `PUBLIC_SOURCE_MANIFEST.json`, a source
archive, and `SHA256SUMS` under the ignored `.local/public-beta/` directory (`current/` by default).
These automated checks supplement the source and visual review; they are not a
proof of complete provenance or an exhaustive secret scanner.

Initialize the exported `repository/` as a new Git repository on `main`, commit
its reviewed files, and tag that commit `v0.9.4-beta.1`. The release archive
contains the same source and manifest, without Git metadata. Do not initialize
or publish the private workspace as a whole.

With an authenticated GitHub CLI for `Malasuerte94` and network access, run
`bash scripts/publish-public-beta.sh`. It checks the clean snapshot, hashes,
archive checksum and source-content equality, tag, account, and remote; creates public `Malasuerte94/FBones`
if needed; and pushes `main` and the tag without force. It then watches the exact
tag/commit workflow. The workflow owns **pre-release** creation after all three
platform builds and the Ubuntu UI job pass; it attaches source, checksums, and
relative-path build reports. The shell publisher must not create a release early. It does not convert an existing private repository
or replace a release. CLI options follow the official
[repository creation](https://cli.github.com/manual/gh_repo_create) and
[release creation](https://cli.github.com/manual/gh_release_create) manuals.

This first prepared beta is source-only. Internal Windows binaries are not
public artifacts: a release binary must have local build paths remapped,
include complete applicable dependency notices, and receive validation of
that exact new image. Do not patch an existing accepted executable or upload
its internal build-info/process ledger.


## Build verification workflow

`desktop.yml` uses native Ubuntu 22.04, Windows, and macOS runners. Each runs
locked dependency installation, JavaScript tests, test TypeScript checks, Rust
default/legacy tests, and a Tauri installer build. Cargo's `--locked` follows
the Tauri argument separator. macOS installs both Rust targets and uses explicit
ad-hoc signing; `lipo` checks Intel/Apple Silicon slices and `codesign` checks
the application signature. This does not establish notarization or GUI startup.

`scripts/ci-build.py` remaps checkout/toolchain/home source paths, checks the
executable architecture and private-path patterns, inspects package structures,
and records package hashes in `ci-reports/`. Its path scan covers the executable,
not all compressed installer/resources. Only reports are uploaded; installer
acceptance/notices remain separate. The Ubuntu UI job fetches Cargo dependencies
before its offline test host build, selects installed Chromium, and uses a
trace-calibrated CI execution profile: one worker,90-second tests,20-second
actions,15-second assertion waits,30-second navigation and30-minute suite budget.
All95cases, semantic/numeric assertions and zero retries remain unchanged.
See TESTING.md for the observed slowdown and evidence limits.

The exact first beta tag can publish only in the intended repository after all
jobs succeed. Pull request checks keep read-only permissions; only the gated
release job receives contents-write permission. Do not confuse this checked
configuration with observed hosted build results. Read the actual run and all
three reports before declaring the platform builds verified.


The desktop Cargo package explicitly selects `fbones` as default-run. The opt-in
headless host wrapper is outside `src/bin`; pinned Tauri CLI2.10.1 otherwise
rediscovers it after filtering its feature-gated Cargo target, causing packages
to expect a nonexistent `e2e_host` executable. Relocating the identical wrapper
preserves the explicit host feature/name and keeps it out of normal bundles.


Apple's `lipo` requires the input before `-verify_arch`; every remaining argument
is parsed as an architecture name. The verifier uses
`lipo <executable> -verify_arch x86_64 arm64`, records `lipo -archs` output,
and retains full failing subprocess diagnostics. Both architectures, code
signature, executable path checks and DMG verification remain mandatory.
[Apple lipo manual source](https://github.com/apple-oss-distributions/cctools/blob/main/man/lipo.1).

A source beta tag starts the gated release workflow; it is not itself a claim
that the builds have passed. The repository and source tag can be pushed
together, but only successful exact-commit jobs can publish the prerelease.
