# Native acceptance v2: diagnosed stock-binary identity correction

Pre-code paired UI review following the first isolated hosted capability run.
This worker reviewed sources and retained receipts without executing an installer,
native application or process operation. The [initial UI gate](NATIVE-INSTALL-UPGRADE-UI-GATE-2026-11-09.md)
still defines all four independent routes and the later actual-upgrade acceptance.
Keep the first tools, run and failures immutable.

## New discriminator, unchanged acceptance

The first Windows route reports stock NSIS exit0 but fails the expected executable
hash before GUI acceptance. Both Linux routes also fail the raw executable hash;
their wait receipts retain actual native exits. These are harness identity
failures, not successful provider checks or demonstrated updater defects.
macOS stops on release-metadata HTTP403 before installation. No route has yet
passed the requested actual installed upgrade.

Exact cached `tauri-utils`2.10.2 `platform.rs` declares
`__TAURI_BUNDLE_TYPE_VAR_UNK` and documents its binary replacement by the bundler.
Its mappings distinguish DEB, APP and NSS. The stock0.9.5 lockfile pins that same
version. An unbundled CI executable hash therefore cannot automatically identify
the executable installed from a route-specific stock package. This source fact
justifies investigating the mismatch; it does not by itself prove its cause.

Before changing v2 expected hashes, inspect only our retained digest-pinned
published packages. Derive native executable bytes through a bounded static
package reader with a fixed expected member path, unique member, native format
and architecture. Pin that independent complete member hash before the next
run, then require the installed/native process image to match it. Exact stock
package provenance → independently extracted native member → actual process
identity is sufficient for this installation/provider acceptance; an observed
process hash alone is not. Refuse ambiguous members, changed package bytes or
unexpected native format/architecture. Keep exact release/asset/size/digest and
static extraction evidence, with no extracted executable published.

The initial optional marker-only hypothesis is not an acceptance requirement.
Actual AppImage member bytes contain APP but restoring UNK does not recover the
raw CI executable hash, and the member is larger. Preserve that failed static
comparison and the unknown additional packaging transformation. Do not invent
a marker-only, source-binary parity or exact raw-CI relation, or reconstruct
unneeded packaging internals. Raw CI and bundled member identities remain
separately labeled. This narrower direct package chain does not relax any
product, security, lifecycle or numerical requirement.

The native process must subsequently bind the independently established bundled
hash plus its actual PID/start/path/window; keep all existing profile, one-toggle,
actual Updates panel/current-version/support and normal terminal requirements.
No version, numeric, lifecycle or provider assertion is relaxed. Use fresh v2
tools/run records and disposable hosted runners, with no personal host changes.

## Metadata authentication and remaining bounds

A read-only ephemeral job token may authenticate the bounded release metadata
request to `https://api.github.com` to address the measured metadata failure.
Keep workflow permissions at `contents: read`. Never print/persist the token,
send it to asset downloads or forward Authorization through redirects. Asset
downloads retain their separate unauthenticated HTTPS allowlist and exact digest
verification. An authenticated request remains a new capability observation;
it is not a claim that macOS installation or AX/Aqua control passed.

This is a diagnosed harness change before one fresh capability run, not a retry
of the unchanged failure. Stage1 remains stock installation plus one native
Updates toggle and normal close. Actual dirty-Cancel/Save/install/relaunch0.9.6
and project preservation remain Stage2 after each measured native provider.
Physics/Match fidelity and all personal processes remain outside these jobs.
