# Signed app update packaging reference — 2026-11-08

Question: what must the application and release pipeline contain so publishing
a later FBones release can update installed copies safely? User authorization
covers implementing updates. The coordinator owns signing credentials, shared
checks and publication; no key or secret was created/read by this audit.

## Direct local evidence

At the initial audit, `src-tauri/Cargo.toml`, `Cargo.toml`, `package.json`, Tauri
config, capabilities, release workflow and packaging scripts contained no updater
dependency, pinned public key, manifest or updater artifacts. Tauri was 2.11.5,
tauri-build 2.6.3 and CLI 2.10.1; app/Cargo versions were 0.9.4. Beta tags reused
that version. The runtime package has its own 0.1.0-beta.1 version and is not an
editor update.
Existing binaries cannot acquire update support from a server-side flag: an
updater-enabled app must first be installed. This is a source-based inference,
not an observed old-to-new native installation.

Bounded ignored-tree key filename inventory found no updater key candidate.
Names-only GitHub secret inventory was unavailable through this agent's
unauthenticated local CLI; the connected read plugin excludes secret APIs.
No credential values were requested or printed. The cached Cargo sparse-index
entry ends at updater2.10.1 and cannot establish current releases.

## Current primary evidence and implications

[Official updater setup](https://v2.tauri.app/plugin/updater/) documents mandatory
signatures, embedded public key and HTTPS endpoint. V2 artifacts reuse signed
NSIS/AppImage packages; macOS uses a signed app tarball. Static metadata embeds
signature contents and per-platform URLs. This updater signature is distinct
from Windows publisher signing and Apple Developer ID/notarization.

[Published2.14.1 release](https://github.com/tauri-apps/plugins-workspace/releases/tag/updater-v2.14.1)
and [normalized current manifest](https://docs.rs/crate/tauri-plugin-updater/latest/source/Cargo.toml)
identify updater2.14.1 and its Tauri^2.12 dependency. It cannot resolve with our
exact2.11.5 pin. The compatible older
[2.10.1 manifest](https://docs.rs/crate/tauri-plugin-updater/2.10.1/source/Cargo.toml)
requires Tauri^2.10, but choosing it solely to avoid a dependency change would
omit subsequent fixes. The coordinator must coordinate the exact compatible
Tauri/CLI pins and lockfile before product integration.

[Official updater source](https://github.com/tauri-apps/plugins-workspace/blob/updater-v2.14.1/plugins/updater/src/updater.rs)
defaults to greater-version comparison, selects bundle-specific targets before
generic targets and supports Debian/AppImage separately. It verifies signed
bytes before installation. Windows installation exits the app; Linux/macOS need
relaunch. This makes dirty-project/native-dialog exclusion essential before
installation, independent of harmless background discovery/download.

[Current config](https://docs.rs/crate/tauri-plugin-updater/latest/source/src/config.rs)
has `requireSignedVersion`: signature trusted comments can bind the announced
version, preventing metadata from relabeling an older signed artifact. Keep
downgrades and dangerous TLS settings disabled. The
[official changelog](https://github.com/tauri-apps/plugins-workspace/blob/updater-v2.14.1/plugins/updater/CHANGELOG.md)
also records recent macOS replacement recovery, AppImage validation and
signature-library corrections; these motivate a current dependency rather than
an arbitrary historical pin. Verify the chosen CLI signs an application version
before enabling the strict signed-version policy.

## Proposed publication contract, pending paired gates/integration

Use a genuinely increasing app version (first0.9.5; runtime unchanged), immutable
version-specific package URLs and GitHub Latest `latest.json`. Include Windows
NSIS, Linux AppImage and Debian bundle-specific entries and both macOS
architectures pointing to the universal app tarball. Retain all existing desktop,
UI, runtime, source and closed-inventory gates. Extend reports/staging only with
explicit updater files/signatures; include every published updater artifact and
manifest in aggregate checksums. Reject mismatched version, target, commit,
signature, missing/extra files or unsafe filenames before publication.

Provision one durable signing identity through coordinator-owned ignored storage
and GitHub Actions secrets; commit only its public key. Never regenerate a key
per build or expose it in source/artifacts/logs. Make local unsigned development
builds possible without turning off production verification. Do not enable
unbounded updater API permissions in the webview: Rust-owned commands can keep
download identity, signature verification and install lifecycle under native
control. Quiet startup checks, manual checks, download progress and explicit
safe restart must follow the accepted UI gate. Offline failures cannot block
editing. Packaging checks prove bytes/metadata, not native installation; each
platform's installed-app update acceptance remains separately observable.

## Implemented packaging and bounded verification

The coordinator accepted exact Tauri 2.12.5, tauri-build 2.7.4, CLI 2.12.4 and
updater 2.14.1 pins. Dependency resolution and local CLI help confirm those pins
and the `--app-version` signer option. Application package/Cargo/Tauri versions
are now 0.9.5. Only the coordinator provisioned the production identity and
Actions secret; this agent read only the public key for the strict config.

Only the tagged installer build receives the release installation marker and
signing secret. Default local builds do not require a signing secret. Reports,
staging and release assembly verify exact updater paths, package/signature
hashes and the public key. The Node verifier uses native Ed25519 and Blake2b512
primitives to validate both Minisign signatures and authenticated filename/app
version. Genuine production CLI signing passed the coordinator's disposable
probe; a changed announced version was rejected. No installer ran in that probe.

The assembler emits 16 assets: existing source/runtime/installers/reports,
four signatures, the macOS updater archive and `latest.json`, with 15 aggregate
checksum rows. Five exact bundle-specific platform entries include both macOS
architectures. A live publication gate rejects equal/older app versions; only
the known pre-updater beta6 release can bootstrap a missing manifest, and its
successor must exceed 0.9.4. Network/non-404 failures stop publication.

Targeted checks pass: seven existing release policies, two signed-assembly tests
with seven mutation cases, four version-policy tests with baseline and redirect
cases, and the signature primitive test's valid case/eight rejections. Disposable
fixture keys exist only in memory; temporary files were removed automatically.
DATA's independent source review concurred and its bootstrap-baseline finding
was fixed. Current tag CI, published payload verification and actual installed
updates remain coordinator-owned and unobserved by this packaging result.
