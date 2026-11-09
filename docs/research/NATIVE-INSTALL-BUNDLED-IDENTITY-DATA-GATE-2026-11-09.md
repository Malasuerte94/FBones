# Native capability v2: package member identity before execution

The first stock-package capability run42642276883 is retained as a negative,
not native upgrade acceptance. Windows NSIS exits0, then its raw-report image
pin rejects before a GUI is bound. Debian installs version0.9.5/amd64; the own
launcher observes native image SHA256
`1829501fd07758dc913f21ce7aaa6ecf4689f1bfe26dfc5f16106a5b1035b786`.
AppImage observes
`f53aa2fbb829ddaa39d5abf30094c2306831fc0e7d593c295d5fd4a45dfe27ab`.
Neither matches raw pre-bundle report `976ce9fd…`; those guards correctly fail.
macOS gets API403 before installation. No upgrade action ran on any platform.
The consumed first run and its source/results are immutable.

This is a diagnosed **identity-source** issue, not a reason to drop identity
checks or rewrite a stock binary. A distinct v2 may derive a route-specific
native executable pin directly from its exact previously verified published
package. The required chain is:

`exact release/asset SHA256 → strict unique packaged executable member →
actual installed /proc image or native executable SHA256`.

For the exact stock AppImage SHA256
`5c23cfa6c6ad7f2092ffaec59cde0a090f600532a4ccb468e05350146c3ddc0b`,
the coordinator/tooling independently reports one validated SquashFS containing
regular `usr/bin/fbones`,14,204,321bytes, SHA256 `f53aa2fb…` above. The actual
observed process hash agrees. This is sufficient stock route identity when the
bounded extraction receipt is verified. It is **not** proof that a marker-only
patch explains the difference from raw CI; that relationship remains unknown.
Do not require speculative ELF recovery or change the packaged binary to fit
the pre-bundle hash. Debian/NSIS/macOS must likewise use their own independently
validated exact package members, never reuse another route's pin.

Before v2 execution, retain the package hash, extractor identity/arguments,
validated container offset/type, exact member path/type/size/hash and uniqueness
checks. Reject path traversal, symlink substitution, multiple plausible members,
truncated extraction or changed input bytes. The actual installed/native image
must equal that extracted member. A package checksum alone never proves the
subsequently launched process identity.

For the API403 failure, command-scoped read-only GITHUB_TOKEN may authenticate
only HTTPS `api.github.com` metadata requests. It must never be printed,
serialized into evidence or forwarded to asset URLs/redirects. Fetch the public
asset separately without authorization, retaining the same strict origin,
release/asset identity, size and hash checks. No repository secret or updater
key is needed. A retry is justified only by these diagnosed v2 changes; retain
stage-specific diagnostics on every failure.

The [initial native DATA gate](NATIVE-INSTALLED-UPGRADE-DATA-GATE-2026-11-09.md)
still applies: stage1 proves only stock install/native control/normal exit0,
not the subsequent installed0.9.5→0.9.6 flow. No product/test ABI, endpoint,
public key, signature, application source, numeric bound or build attestation
changes. No native result is claimed before the new run is actually observed.
