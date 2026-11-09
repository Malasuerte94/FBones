# Native installed 0.9.5 to 0.9.6: DATA acceptance gate

The user explicitly resumes actual native installers and installed upgrades,
alongside Physics and Transform Match. This is a reference/acceptance contract,
not a claim that any installed upgrade has run. Root alone performs remote/OS
operations. Use disposable dedicated hosted VMs; no personal/workspace install.

The existing [update policy](../UPDATES.md) and actual native source are the
reference. `src-tauri/src/updater.rs` SHA256
`18e519c91a7da456bcbe393acac8baa86b1597a786890b7f58ea9db157a7dac0`
and `src/composables/useAppUpdater.ts` SHA256
`61a04701291543b59cac564f4f718e465ffa4c328e7d655e3a738ae4de1759ee`
are unchanged from the retained published 0.9.5-beta.2 source. This establishes
which code the acceptance exercises; it does not prove OS behavior.

Use stock published 0.9.5-beta.2 and 0.9.6-beta.1 artifacts, not a rebuilt test
app or relabeled portable executable. Verify release identity, each asset's
actual size/hash and signed update route before using it. Current target is
release439062261, commit `cfc60a45b5d73e25f35125f5353da56ff9027236`.
The accepted latest.json contains five routes: Windows NSIS; Linux Debian and
AppImage separately; macOS x86_64 and aarch64 through one universal archive.
Four updater payloads/signatures and all source/package identities are already
verified; do not rebuild or obtain a signing secret merely for this acceptance.

1. Prove the actual platform GUI automation capability on the isolated VM
   before dependent app gestures. Desktop availability, screenshot collection
   and native control interaction are separate. macOS AX/TCC must be observed,
   not disabled or assumed. A capability failure stops that platform's gesture
   sequence and remains an explicit negative result.
2. Install the genuine 0.9.5 package, launch its actual installed executable,
   and bind PID/start/image/version to its native window. Require updater
   supported=true/currentVersion=0.9.5 and the actual bundle-specific route.
   The release-only marker and native bundle detection must remain unchanged.
3. The unmodified app discovers 0.9.6 through its configured HTTPS Latest
   endpoint/public key and downloads until Ready. Ready is emitted only after
   the updater verifies payload and signed version. Preserve errors/progress
   and route provenance; external checksum success alone is not this app flow.
4. With an own project and pending/dirty change, request installation and
   choose Cancel. Require the same live 0.9.5 session and authored data, no
   successful install/relaunch, and unchanged saved own-file hash. Cancel must
   not be replaced with a fabricated backend result or a clean empty project.
5. Repeat the installation request after valid own Save through the real
   lifecycle guard. Verify saved authored fields/hash and clean revision. The
   native `Session::with_update_guard` rechecks revision/dirty state while
   holding the authoring mutex before its synchronous install call.
6. Observe the actual OS install and old-process terminal, followed by the
   actual new executable/process/native window with version0.9.6. Windows
   launches NSIS and exits directly; other platforms call restart after install.
   Reopen and independently inspect the own saved fixture. Artifact extraction,
   successful CI exit or a static version string is insufficient.

Debian and AppImage require separate observations; no fallback route substitution
is allowed. A macOS run proves only its actual architecture's launch/upgrade,
even though the package contains both architectures. Installer dialogs,
permissions/elevation, filesystem replacement and relaunch must be observed;
their behavior is not supplied by browser/e2e-host tests. Preserve the stock
endpoint, public key, signatures, bundle marker and security settings.

Record one bounded run manifest/result with raw control/screenshots, lifecycle,
asset identities and fixture comparisons per actual profile. Keep capability,
initial install, discovery, verified download, Cancel/Save guard, replacement,
relaunch and persistence as distinct result fields so partial evidence cannot
be reported as a complete upgrade. Existing local 0.9.5 Windows QA and published
CI package/signature checks retain their narrower scope. No new native install,
GUI, upgrade, publisher-signing or notarization claim follows from this gate.
