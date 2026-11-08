# Public app/runtime download UI gate — 2026-11-08

Question before changing distribution: how can a visitor download the FBones
desktop app and the independent Pixi/Node runtime directly from GitHub Releases?
The user explicitly requests both deliverables. Prior source-only policy is
historical and does not limit this newly authorized installer publication.

## Directly observed current state

Read the current README, beta5 release body and GitHub REST release metadata.
`GET /repos/Malasuerte94/FBones/releases/tags/v0.9.4-beta.5` succeeds with
`prerelease=true`, `draft=false`. Its six assets are the runtime tgz, source tgz,
SHA256SUMS and three platform build reports. No app installer is attached.
`GET /repos/Malasuerte94/FBones/releases/latest` returns404.

The README's first download-related link is Getting started; the beta download
description appears below three screenshots and the implementation matrix.
It explicitly says installers are unpublished. The release body also describes
source/runtime only and puts a long implementation account ahead of the runtime
install command. Thus the absent app download and poor download visibility are
both real, separate findings. Passing package structure checks did not publish
those packages as assets.

## Documented GitHub behavior

[GitHub's Releases API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)
defines latest as a published full release, excluding prereleases/drafts. Its
`make_latest` parameter explicitly disallows prereleases and drafts as latest.
This explains the observed404; it is not evidence that beta5 is unpublished.
[GitHub's release-link guidance](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)
supports unique release URLs and direct asset links. Use the exact beta tag and
actual asset filenames for this beta. Do not use `/releases/latest` as its
download route or remove prerelease metadata merely to produce that route.

## Recommended interaction and publication contract

Recommended policy: retain `prerelease=true` for beta6. No stable quality claim
is authorized. Put a Download section immediately after the README introduction,
before screenshots, and a compact download table at the top of the release body.
Use labeled rows for Windows x64 installer, macOS universal DMG, Linux x64
AppImage/Debian package, and developer runtime tgz with Node/browser/PixiJS8 scope.
Link the exact release's assets after the coordinator confirms final filenames.

Place `npm install ./fbones-runtime-0.1.0-beta.1.tgz` beside the runtime link.
Distinguish the desktop app from the game runtime; explain File → Export runtime
in the runtime guide. npm registry publication and installed-app auto-update are
separate. Keep source/build instructions lower on the page.

State the observed signing limits beside downloads: early beta, Windows unsigned,
macOS ad-hoc signed without Developer ID/notarization (the current workflow sets
`APPLE_SIGNING_IDENTITY: '-'`), if those remain the actual CI settings. Do not imply
native installer launch, Gatekeeper acceptance, SmartScreen reputation or all
platform GUI acceptance from build reports. Keep the existing compatibility and
backup boundaries concise. No OS protection bypass instructions are needed.

Until tagged build/UI/runtime/archive gates pass and assets are observed, describe
beta6 links as prepared/pending rather than already downloadable. Preserve beta5
release history and its source/runtime-only truth. Verify final asset names,
direct URLs and metadata against the published release. This audit changes no
product behavior and requires content/link checks, not another UI build.

No remote mutations, installer execution, shared build/test run or protected
user/original-window interaction was performed for this gate.

## Latest user steering: repository sidebar release card

The user subsequently clarified that the target is the repository's right-hand
**Releases** sidebar: a normal latest-release card with the downloadable beta6
release, rather than only a tags/count link. The earlier direct download tables
address the README/release body but do not change that GitHub-owned sidebar.
This newer explicit instruction overrides the earlier recommendation to retain
`prerelease=true` for this release.

Before the coordinator's metadata mutation, the documented GitHub requirement
remains decisive: a prerelease cannot be marked latest. The authorized correction
is to update the existing beta6 release to `prerelease=false` and
`make_latest=true`, preserving the beta tag/title, Early beta product wording,
current assets, checksums and all verification/compatibility/signing limits.
This selects GitHub's latest-release display category; it does not establish
stable product quality. No new tag, asset, source commit or application build is
needed for that metadata-only change. Prior release evidence remains unchanged.

Required proof after the mutation: the release API returns beta6 with
`prerelease=false`, `/releases/latest` resolves that same beta6 release, and an
actual repository sidebar observation shows a beta6 card and Latest badge.
Scope the DOM check to the Releases sidebar section so README download links
cannot produce a false positive: locate the sidebar heading link whose resolved
href is the repository's `/releases`, take its closest `.BorderGrid-row`, then
verify a link to `/releases/tag/v0.9.4-beta.6` and visible `Latest` text there.
Capture the actual sidebar; do not infer its rendering solely from API success.
The coordinator owns this browser check in a separate isolated output directory.
