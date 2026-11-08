//! Native-owned discovery/download/install. Web content never receives an
//! install path, updater handle, public-key override or unverified payload.
use crate::project::{AppError, Session};
use serde::Serialize;
use std::{
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tauri::{
    plugin::TauriPlugin,
    utils::{config::BundleType, platform::bundle_type},
    Emitter, Manager,
};
use tauri_plugin_updater::{Update, UpdaterExt};

const ENDPOINT: &str =
    "https://github.com/Malasuerte94/FBones/releases/latest/download/latest.json";
const EVENT: &str = "app-update-state";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    Idle,
    Checking,
    UpToDate,
    Available,
    Downloading,
    Ready,
    Installing,
    Error,
    Unsupported,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    phase: Phase,
    current_version: String,
    version: Option<String>,
    downloaded: u64,
    total: Option<u64>,
    error: Option<String>,
    supported: bool,
}

struct Inner {
    snapshot: Snapshot,
    generation: u64,
    update: Option<Update>,
    bytes: Option<Arc<Vec<u8>>>,
}
impl Inner {
    fn new(supported: bool) -> Self {
        Self {
            snapshot: Snapshot {
                phase: if supported {
                    Phase::Idle
                } else {
                    Phase::Unsupported
                },
                current_version: env!("CARGO_PKG_VERSION").into(),
                version: None,
                downloaded: 0,
                total: None,
                error: None,
                supported,
            },
            generation: 0,
            update: None,
            bytes: None,
        }
    }
    fn busy(&self) -> bool {
        matches!(
            self.snapshot.phase,
            Phase::Checking | Phase::Downloading | Phase::Installing
        )
    }
    fn begin(&mut self, phase: Phase) -> Result<u64, AppError> {
        self.generation = self
            .generation
            .checked_add(1)
            .ok_or_else(|| error("Update request identity exhausted."))?;
        self.snapshot.phase = phase;
        self.snapshot.error = None;
        Ok(self.generation)
    }
    fn matches(&self, generation: u64, phase: Phase) -> bool {
        self.generation == generation && self.snapshot.phase == phase
    }
    fn fail(&mut self, generation: u64, phase: Phase, message: String) {
        if self.matches(generation, phase) {
            self.snapshot.phase = Phase::Error;
            self.snapshot.error = Some(message);
            self.bytes = None;
        }
    }
    fn progress(&mut self, generation: u64, count: usize, total: Option<u64>) {
        if self.matches(generation, Phase::Downloading) {
            self.snapshot.downloaded = self.snapshot.downloaded.saturating_add(count as u64);
            self.snapshot.total = total;
        }
    }
    // Called only after Update::download has verified bytes and signed version.
    fn verified_download(&mut self, generation: u64, bytes: Vec<u8>) {
        if self.matches(generation, Phase::Downloading) {
            self.snapshot.downloaded = bytes.len() as u64;
            self.bytes = Some(Arc::new(bytes));
            self.snapshot.phase = Phase::Ready;
            self.snapshot.error = None;
        }
    }
}

pub struct UpdateState(Mutex<Inner>);
impl Default for UpdateState {
    fn default() -> Self {
        // A production installer is the only build that may replace itself.
        // Local immutable WINDOWS_TEST executables deliberately omit this flag.
        let enabled = option_env!("FBONES_RELEASE_UPDATER") == Some("1")
            && !cfg!(debug_assertions)
            && !cfg!(test)
            && native_target().is_some();
        Self(Mutex::new(Inner::new(enabled)))
    }
}
pub fn plugin() -> TauriPlugin<tauri::Wry, tauri_plugin_updater::Config> {
    tauri_plugin_updater::Builder::new().build()
}
fn error(message: impl Into<String>) -> AppError {
    AppError::new("AppUpdate", message)
}
fn with_state<T>(
    app: &tauri::AppHandle,
    action: impl FnOnce(&mut Inner) -> T,
) -> Result<T, AppError> {
    let state = app.state::<UpdateState>();
    let mut inner = state
        .0
        .lock()
        .map_err(|_| error("The update state is unavailable."))?;
    Ok(action(&mut inner))
}
fn snapshot(app: &tauri::AppHandle) -> Result<Snapshot, AppError> {
    with_state(app, |inner| inner.snapshot.clone())
}
fn publish(app: &tauri::AppHandle, value: &Snapshot) {
    let _ = app.emit(EVENT, value);
}

fn target_for(os: &str, arch: &str, bundle: Option<BundleType>) -> Option<String> {
    let suffix = match (os, arch, bundle) {
        ("windows", "x86_64", Some(BundleType::Nsis)) => "windows-x86_64-nsis",
        ("linux", "x86_64", Some(BundleType::Deb)) => "linux-x86_64-deb",
        ("linux", "x86_64", Some(BundleType::AppImage)) => "linux-x86_64-appimage",
        ("macos", "x86_64", Some(BundleType::App)) => "darwin-x86_64-app",
        ("macos", "aarch64", Some(BundleType::App)) => "darwin-aarch64-app",
        _ => return None,
    };
    Some(suffix.into())
}
fn native_target() -> Option<String> {
    target_for(std::env::consts::OS, std::env::consts::ARCH, bundle_type())
}

fn validate_config(config: &tauri_plugin_updater::Config) -> Result<(), AppError> {
    if !config.require_signed_version
        || config.allow_downgrades
        || config.dangerous_insecure_transport_protocol
        || config.dangerous_accept_invalid_certs
        || config.dangerous_accept_invalid_hostnames
        || config.pubkey.trim().is_empty()
        || config.endpoints.len() != 1
        || config.endpoints[0].as_str() != ENDPOINT
    {
        return Err(error(
            "Signed HTTPS application updates are not configured correctly.",
        ));
    }
    Ok(())
}
fn configured_updater(app: &tauri::AppHandle) -> Result<tauri_plugin_updater::Updater, AppError> {
    let value = app
        .config()
        .plugins
        .0
        .get("updater")
        .cloned()
        .ok_or_else(|| error("Application updates are not configured."))?;
    let config: tauri_plugin_updater::Config = serde_json::from_value(value)
        .map_err(|_| error("Application update configuration is invalid."))?;
    validate_config(&config)?;
    // Explicit target prevents the plugin's generic fallback from installing
    // an AppImage over a Debian installation, or the inverse.
    app.updater_builder()
        .target(
            native_target().ok_or_else(|| error("This installation does not support updates."))?,
        )
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| error(e.to_string()))
}
fn validate_announcement(
    target: &str,
    raw: &serde_json::Value,
    url: &str,
    signature: &str,
) -> Result<(), AppError> {
    let platform = raw
        .get("platforms")
        .and_then(|p| p.get(target))
        .ok_or_else(|| error("No signed update is available for this installer type."))?;
    if !url.starts_with("https://")
        || signature.trim().is_empty()
        || platform.get("url").and_then(|v| v.as_str()) != Some(url)
        || platform.get("signature").and_then(|v| v.as_str()) != Some(signature)
    {
        return Err(error(
            "The update manifest does not match this signed HTTPS installer.",
        ));
    }
    Ok(())
}

#[tauri::command]
pub fn get_app_update_state(app: tauri::AppHandle) -> Result<Snapshot, AppError> {
    snapshot(&app)
}

#[tauri::command]
pub async fn check_app_update(app: tauri::AppHandle) -> Result<Snapshot, AppError> {
    let generation = with_state(&app, |inner| {
        if !inner.snapshot.supported || inner.busy() || inner.snapshot.phase == Phase::Ready {
            return Ok(None);
        }
        let generation = inner.begin(Phase::Checking)?;
        inner.update = None;
        inner.bytes = None;
        inner.snapshot.version = None;
        inner.snapshot.downloaded = 0;
        inner.snapshot.total = None;
        Ok::<_, AppError>(Some(generation))
    })??;
    let Some(generation) = generation else {
        return snapshot(&app);
    };
    publish(&app, &snapshot(&app)?);
    // No state/session mutex is held during network or plugin work.
    let result = match configured_updater(&app) {
        Ok(updater) => updater.check().await.map_err(|e| error(e.to_string())),
        Err(e) => Err(e),
    };
    with_state(&app, |inner| {
        if !inner.matches(generation, Phase::Checking) {
            return;
        }
        match result {
            Ok(Some(mut update)) => {
                let valid = native_target()
                    .ok_or_else(|| error("Unsupported installer type."))
                    .and_then(|target| {
                        validate_announcement(
                            &target,
                            &update.raw_json,
                            update.download_url.as_str(),
                            &update.signature,
                        )
                    });
                if let Err(e) = valid {
                    inner.fail(generation, Phase::Checking, e.message);
                    return;
                }
                update.timeout = Some(Duration::from_secs(180));
                inner.snapshot.version = Some(update.version.clone());
                inner.update = Some(update);
                inner.snapshot.phase = Phase::Available;
            }
            Ok(None) => inner.snapshot.phase = Phase::UpToDate,
            Err(e) => inner.fail(generation, Phase::Checking, e.message),
        }
    })?;
    let value = snapshot(&app)?;
    publish(&app, &value);
    Ok(value)
}

#[tauri::command]
pub async fn download_app_update(app: tauri::AppHandle) -> Result<Snapshot, AppError> {
    let request = with_state(&app, |inner| {
        if !inner.snapshot.supported || inner.busy() || inner.snapshot.phase == Phase::Ready {
            return Ok(None);
        }
        let Some(update) = inner.update.clone() else {
            return Ok(None);
        };
        let generation = inner.begin(Phase::Downloading)?;
        inner.bytes = None;
        inner.snapshot.downloaded = 0;
        inner.snapshot.total = None;
        Ok::<_, AppError>(Some((generation, update)))
    })??;
    let Some((generation, update)) = request else {
        return snapshot(&app);
    };
    publish(&app, &snapshot(&app)?);
    let progress_app = app.clone();
    let mut last_emit = Instant::now();
    let result = update
        .download(
            move |count, total| {
                let progress = with_state(&progress_app, |inner| {
                    inner.progress(generation, count, total);
                    inner.snapshot.clone()
                });
                if last_emit.elapsed() >= Duration::from_millis(120) {
                    if let Ok(value) = progress {
                        publish(&progress_app, &value);
                    }
                    last_emit = Instant::now();
                }
            },
            || {},
        )
        .await;
    with_state(&app, |inner| match result {
        Ok(bytes) => inner.verified_download(generation, bytes),
        Err(e) => inner.fail(generation, Phase::Downloading, e.to_string()),
    })?;
    let value = snapshot(&app)?;
    publish(&app, &value);
    Ok(value)
}

#[tauri::command]
pub async fn install_app_update(
    app: tauri::AppHandle,
    expected_revision: Option<u64>,
) -> Result<Snapshot, AppError> {
    let request = with_state(&app, |inner| {
        if !inner.snapshot.supported || inner.snapshot.phase != Phase::Ready {
            return Ok(None);
        }
        let (Some(update), Some(bytes)) = (inner.update.clone(), inner.bytes.clone()) else {
            return Ok(None);
        };
        let generation = inner.begin(Phase::Installing)?;
        Ok::<_, AppError>(Some((generation, update, bytes)))
    })??;
    let Some((generation, update, bytes)) = request else {
        return snapshot(&app);
    };
    publish(&app, &snapshot(&app)?);
    let install_app = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        // Install re-verifies both signature and signed version. The closure
        // never re-enters Session. Windows launches NSIS and exits directly.
        install_app
            .state::<Session>()
            .with_update_guard(expected_revision, || {
                update
                    .install(bytes.as_slice())
                    .map_err(|e| error(e.to_string()))
            })
    })
    .await
    .map_err(|_| error("Application installation could not finish."));
    match result {
        Ok(Ok(())) => {
            // AppHandle::restart may request ExitRequested and read Session;
            // it must run after with_update_guard has released that mutex.
            #[cfg(not(target_os = "windows"))]
            app.restart();
            #[cfg(target_os = "windows")]
            return snapshot(&app);
        }
        Ok(Err(e)) | Err(e) => with_state(&app, |inner| {
            inner.fail(generation, Phase::Installing, e.message)
        })?,
    }
    let value = snapshot(&app)?;
    publish(&app, &value);
    Ok(value)
}

#[cfg(test)]
#[path = "updater_tests.rs"]
mod tests;
