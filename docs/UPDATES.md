# Application updates

FBones 0.9.5 introduces signed application updates. Earlier 0.9.4 builds have no
updater and require a one-time installation of an updater-enabled package. The
independent developer runtime keeps its own version and is not replaced by an
editor update. GitHub Latest visibility alone does not update installed apps.

Packaged releases check GitHub's HTTPS `releases/latest/download/latest.json`
endpoint. Their embedded public key verifies each downloaded package and the
application version in its authenticated signature. Windows uses the NSIS
installer; Linux Debian and AppImage use separate entries; Intel/Apple Silicon
macOS use the same universal application archive. The user chooses when to
install/restart. Unsaved work and pending fields must pass the normal lifecycle
guard. Offline errors leave editing available. Portable development/workspace
images lack the release-only installation marker and cannot replace themselves.
Native installation and platform signing acceptance remain separate checks.

## Publishing a newer app

Every updater release requires a **higher installed application version**.
Changing only `beta.1` to `beta.2` with the same `0.9.5` app cannot update a
client already running `0.9.5`; the release gate rejects that mistake. For a
following release use a new app version, such as `0.9.6`, consistently in
`package.json`, the workspace `Cargo.toml`, `src-tauri/tauri.conf.json` and the
visible version label. Refresh lockfiles and use the matching immutable tag, such
as `v0.9.6-beta.1`, plus its release notes. The runtime package is versioned
independently; do not bump it merely to publish an editor update.

The tag workflow retains all platform tests/builds, Ubuntu UI, runtime and source
archive gates. Only its actual installer build receives the release marker and
the `TAURI_SIGNING_PRIVATE_KEY` Actions secret. The checked-in updater config
contains only the public key. Preserve the durable private key securely: rotating
it without a migration prevents existing installed clients from trusting later
updates. Never commit it, upload it as an artifact or print it in logs.

`tauri.updater.conf.json` enables updater artifacts only for this signed tag build;
normal local builds need no signing secret. CLI 2.12.4 signs the package's actual
application version automatically. Standalone signing must explicitly pass
`tauri signer sign --app-version VERSION`; signatures without the authenticated
version are rejected. Updater signatures do not confer Windows publisher signing
or Apple Developer ID/notarization.

The closed release assembler verifies report commit/version/architectures,
payload/signature hashes, the configured public key, both Minisign signatures,
signed filename/version and exact bundle-specific routes. It produces
`latest.json` and aggregate checksums for every asset. Before publishing, a live
version gate requires a greater app version than the current manifest. Only the
known pre-updater beta6 release may bootstrap a missing manifest; another 404,
network error or malformed metadata stops publication. The release becomes
GitHub Latest only after all gates pass. Verify published assets and a controlled
installed-app upgrade separately; compilation/browser tests are not native
installation proof.
