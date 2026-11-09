# Native installation and 0.9.5 → 0.9.6 upgrade: UI gate

Recorded before capability-harness implementation. DATA and tooling inspect the
existing updater contract; this UI lane reviewed the product controls, lifecycle
and isolation. No installer, application, original process or CI job was run
by this worker. Published package/signature checks and browser tests are reused;
they do not establish native installation or an actual upgrade.

## Isolation and stock inputs

Use four separate ephemeral GitHub-hosted jobs on the dedicated
`work/native-install-upgrade-0.9.6` work branch: Windows NSIS, Linux Debian,
Linux AppImage and macOS DMG. Operate only the disposable runner OS/account,
own installation directories, profiles, project fixtures and output paths.
No installation on the personal host; a directory prefix alone does not isolate
registry, file-association or profile writes. Personal FBones/Spine windows,
registries, projects and linked launch transports remain untouched.

Use exact published stock 0.9.5 packages with pinned digests, signed updater
payload/version provenance and platform reports. Do not substitute the local
immutable 54/0.9.5 image, rebuild a test-enabled binary, fake the release marker,
override the endpoint/public key or inject a mock command transport. The real
public update is 0.9.6; the runtime package stays independently versioned.

No secrets, personal assets, permission bypass, global TCC disabling, Gatekeeper
disablement or security-policy weakening. Initial Linux package installation
may use the ephemeral runner's ordinary package-manager privileges; the app's
later updater must exercise its actual stock route, not a replacement shim.

## Stage 1: prove each native control provider

First install stock 0.9.5 through its real route. Windows uses NSIS; Debian uses
the package manager; AppImage uses the owned executable image; macOS mounts the
DMG and copies its unchanged app bundle into an owned writable location.
Extraction/package structure alone is not frontend execution.

Bind runner/job/account, installed path/hash/version, actual PID/start, native
window and private profile before observing the frontend. Launch through a
reviewed own NUL-stdio helper with bounded readiness and exact ownership checks;
never attach to an unrelated window or use a historical PID fallback.

Then prove the native automation route using only one Updates toggle: Windows
WebView2/UIA or owned CDP; Linux native GTK/WebKit through its actual W3C
automation context and isolated display/DBus; macOS a real Aqua window and
permitted AX access. A browser replacement, unsupported driver, absent Aqua/AX
permission or a blank window is not success. No TCC workaround or Safari-driver
assumption. Record unsupported/blocked capability separately from installation.

Require the visible 0.9.5 version and actual Updates panel/labels, native window
identity and evidence that this stock installation supports its proper updater
bundle. Stage 1 performs no project editing, download/install button, upgrade or
relaunch. A capability result precedes the reviewed Stage 2 scenario.

## Stage 2 acceptance after measured capability

Reuse the product's real Updates controls and lifecycle, without mocks:

1. Observe 0.9.5 discovery of 0.9.6, actual download/progress and Ready state after
   native signature/authenticated-version verification. Ready is not installed.
2. Make a small own project dirty. Choose Install/restart, then Cancel in the
   normal Save/Discard/Cancel guard. Verify the same old process/project/version,
   dirty contents and Ready state remain; no installation has occurred.
3. Preserve a valid pending field through the normal Save path to a private
   project file. Assert Save completed and the revision is clean before install.
   Invalid drafts or failed/canceled Save must block install if tested; do not
   expand a failing scenario through blind retries or secret/password logging.
4. Observe the stock platform updater, old-process lifecycle, actual replacement
   and relaunch. Rebind the new PID/start/window/path, verify 0.9.6 and package/
   executable provenance, then independently reopen/compare the saved own
   project. Old exit0 or installer exit0 alone cannot prove this result.
5. Close only the verified clean own test window normally. Retain failures and
   terminal receipts; teardown of a failed disposable job is not normal-close
   proof. Remove only verified own temporary data after it is no longer active.

The actual contract is in `src-tauri/src/updater.rs`,
`src/composables/useAppUpdater.ts`, `src/components/organisms/UpdateNotice.vue`
and `workspace.prepareForUpdate`. Release marker plus a recognized bundle are
required. Windows dispatches NSIS and exits; Linux/macOS restart after install.
Plugin 2.14.1 Debian installation uses pkexec, graphical password/sudo, then
terminal sudo; root inside a container alone does not prove that auth path.
AppImage replacement is a distinct route. macOS bundle replacement requires
the owned writable bundle and a real native control provider.

Review one bounded scenario per meaningful stage/driver change, not per click.
Keep platform/bundle/architecture results distinct. One successful AppImage
upgrade does not certify Debian, and one macOS architecture does not prove the
other hardware execution path. Missing provider capability keeps that route
open; it does not erase its requested acceptance or stop independent work.

Sources reused: [update policy](../UPDATES.md),
[release scope](../releases/v0.9.6-beta.1.md) and
[native/browser evidence boundary](../TESTING.md). Full Physics/Match fidelity
is independent of this installation work.
