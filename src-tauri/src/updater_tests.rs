//! Pure state/security boundaries; no network, installer, process or GUI runs.
use super::*;
use serde_json::json;

fn secure_config() -> tauri_plugin_updater::Config {
    tauri_plugin_updater::Config {
        endpoints: vec![ENDPOINT.parse().unwrap()],
        pubkey: "own public-key fixture".into(),
        require_signed_version: true,
        ..Default::default()
    }
}

#[test]
fn updater_installation_routes_are_bundle_specific_and_unknown_copies_are_unsupported() {
    for (os, arch, bundle, expected) in [
        ("windows", "x86_64", BundleType::Nsis, "windows-x86_64-nsis"),
        ("linux", "x86_64", BundleType::Deb, "linux-x86_64-deb"),
        (
            "linux",
            "x86_64",
            BundleType::AppImage,
            "linux-x86_64-appimage",
        ),
        ("macos", "x86_64", BundleType::App, "darwin-x86_64-app"),
        ("macos", "aarch64", BundleType::App, "darwin-aarch64-app"),
    ] {
        assert_eq!(
            target_for(os, arch, Some(bundle)).as_deref(),
            Some(expected)
        );
    }
    assert!(target_for("linux", "x86_64", None).is_none());
    assert!(target_for("linux", "aarch64", Some(BundleType::Deb)).is_none());
    assert!(target_for("windows", "x86_64", Some(BundleType::Msi)).is_none());
    assert!(
        !UpdateState::default().0.lock().unwrap().snapshot.supported,
        "ordinary test binaries cannot install over their immutable build"
    );
}

#[test]
fn updater_configuration_requires_strict_signature_version_tls_and_our_endpoint() {
    validate_config(&secure_config()).unwrap();
    for mutation in 0..7 {
        let mut config = secure_config();
        match mutation {
            0 => config.require_signed_version = false,
            1 => config.allow_downgrades = true,
            2 => config.dangerous_insecure_transport_protocol = true,
            3 => config.dangerous_accept_invalid_certs = true,
            4 => config.dangerous_accept_invalid_hostnames = true,
            5 => config.pubkey.clear(),
            _ => config.endpoints = vec!["https://example.invalid/latest.json".parse().unwrap()],
        }
        assert!(validate_config(&config).is_err());
    }
    let mut config = secure_config();
    config.endpoints.push(ENDPOINT.parse().unwrap());
    assert!(validate_config(&config).is_err());
}

#[test]
fn generic_or_wrong_bundle_manifest_cannot_become_an_installable_update() {
    let target = "linux-x86_64-deb";
    let url = "https://github.com/Malasuerte94/FBones/releases/download/v0.9.6-beta.1/FBones_0.9.6_amd64.deb";
    let valid =
        json!({"platforms":{"linux-x86_64-deb":{"url":url,"signature":"own signature fixture"}}});
    validate_announcement(target, &valid, url, "own signature fixture").unwrap();
    for manifest in [
        json!({"platforms":{"linux-x86_64":{"url":url,"signature":"own signature fixture"}}}),
        json!({"platforms":{"linux-x86_64-appimage":{"url":url,"signature":"own signature fixture"}}}),
        json!({"url":url,"signature":"own signature fixture"}),
    ] {
        assert!(validate_announcement(target, &manifest, url, "own signature fixture").is_err());
    }
    assert!(validate_announcement(
        target,
        &valid,
        "http://example.invalid/package",
        "own signature fixture"
    )
    .is_err());
    assert!(validate_announcement(target, &valid, url, "").is_err());
    assert!(validate_announcement(target, &valid, url, "changed signature").is_err());
}

#[test]
fn stale_download_progress_or_completion_cannot_replace_a_newer_job() {
    let mut state = Inner::new(true);
    let old = state.begin(Phase::Downloading).unwrap();
    state.progress(old, 10, Some(100));
    assert_eq!(state.snapshot.downloaded, 10);
    let current = state.begin(Phase::Checking).unwrap();
    state.progress(old, 500, Some(500));
    state.verified_download(old, vec![1, 2, 3]);
    state.fail(old, Phase::Downloading, "old signature failure".into());
    assert!(state.matches(current, Phase::Checking));
    assert_eq!(state.snapshot.downloaded, 10);
    assert!(state.bytes.is_none());
    assert!(state.snapshot.error.is_none());
}

#[test]
fn failed_verification_never_publishes_ready_bytes_and_verified_completion_does() {
    let mut state = Inner::new(true);
    let failed = state.begin(Phase::Downloading).unwrap();
    state.progress(failed, 20, Some(20));
    // Model the error returned by the pinned provider's signature/version check;
    // this is not a cryptographic test or an actual provider download.
    state.fail(
        failed,
        Phase::Downloading,
        "Signature or signed-version mismatch".into(),
    );
    assert_eq!(state.snapshot.phase, Phase::Error);
    assert!(state.bytes.is_none());
    state.verified_download(failed, vec![9; 20]);
    assert_eq!(state.snapshot.phase, Phase::Error);
    assert!(state.bytes.is_none());
    let verified = state.begin(Phase::Downloading).unwrap();
    state.verified_download(verified, vec![7; 12]);
    assert_eq!(state.snapshot.phase, Phase::Ready);
    assert_eq!(state.snapshot.downloaded, 12);
    assert_eq!(state.bytes.as_ref().unwrap().as_slice(), &[7; 12]);
    assert!(state.snapshot.error.is_none());
}

#[test]
fn snapshot_wire_names_match_frontend_protocol_without_exposing_payloads_or_handles() {
    let snapshot = Inner::new(false).snapshot;
    let wire = serde_json::to_value(snapshot).unwrap();
    assert_eq!(wire["phase"], "unsupported");
    assert_eq!(wire["supported"], false);
    assert!(wire["currentVersion"].is_string());
    assert_eq!(wire["downloaded"], 0);
    assert_eq!(wire.as_object().unwrap().len(), 7);
    assert!(wire.get("bytes").is_none());
    assert_eq!(serde_json::to_value(Phase::UpToDate).unwrap(), "upToDate");
}
