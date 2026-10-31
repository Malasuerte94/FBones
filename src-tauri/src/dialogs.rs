use crate::project::AppError;
use std::path::PathBuf;

pub async fn pick(
    app: tauri::AppHandle,
    save: bool,
    name: String,
) -> Result<Option<PathBuf>, AppError> {
    tauri::async_runtime::spawn_blocking(move || platform_pick(app, save, name, false))
        .await
        .map_err(|_| AppError::new("Dialog", "The file dialog could not be opened."))?
}

#[cfg(target_os = "linux")]
fn platform_pick(
    app: tauri::AppHandle,
    save: bool,
    name: String,
    image: bool,
) -> Result<Option<PathBuf>, AppError> {
    use gtk::prelude::*;
    use tauri::Manager;
    let (tx, rx) = std::sync::mpsc::channel();
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let parent = handle
            .get_webview_window("main")
            .and_then(|w| w.gtk_window().ok());
        let dialog = gtk::FileChooserNative::new(
            Some(if image {
                "Import PNG image"
            } else if save {
                "Save a project"
            } else {
                "Open a project"
            }),
            parent.as_ref().map(|w| w.upcast_ref::<gtk::Window>()),
            if save {
                gtk::FileChooserAction::Save
            } else {
                gtk::FileChooserAction::Open
            },
            Some(if save { "Save" } else { "Open" }),
            Some("Cancel"),
        );
        dialog.set_modal(true);
        let filter = gtk::FileFilter::new();
        filter.set_name(Some(if image {
            "PNG image"
        } else if save {
            "FBones project"
        } else {
            "FBones / Spine project"
        }));
        if image {
            filter.add_pattern("*.png");
            filter.add_pattern("*.PNG");
        } else {
            filter.add_pattern("*.fbones");
            if !save {
                filter.add_pattern("*.spine");
            }
        }
        dialog.add_filter(filter);
        if save {
            dialog.set_current_name(&name);
            dialog.set_do_overwrite_confirmation(true);
        }
        let chosen = if dialog.run() == gtk::ResponseType::Accept {
            dialog.filename()
        } else {
            None
        };
        dialog.destroy();
        let _ = tx.send(chosen);
    })
    .map_err(|_| AppError::new("Dialog", "The file dialog could not be opened."))?;
    rx.recv()
        .map_err(|_| AppError::new("Dialog", "The file dialog was closed unexpectedly."))
}

#[cfg(target_os = "windows")]
fn platform_pick(
    _app: tauri::AppHandle,
    save: bool,
    name: String,
    image: bool,
) -> Result<Option<PathBuf>, AppError> {
    use std::os::windows::process::CommandExt;
    let script = if image {
        "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); Add-Type -AssemblyName System.Windows.Forms; $d=[System.Windows.Forms.OpenFileDialog]::new(); $d.Filter='PNG image|*.png'; if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.FileName)}"
    } else if save {
        "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); Add-Type -AssemblyName System.Windows.Forms; $d=[System.Windows.Forms.SaveFileDialog]::new(); $d.Filter='FBones project|*.fbones'; $d.DefaultExt='fbones'; $d.AddExtension=$true; $d.FileName=$env:FBONES_DIALOG_NAME; if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.FileName)}"
    } else {
        "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); Add-Type -AssemblyName System.Windows.Forms; $d=[System.Windows.Forms.OpenFileDialog]::new(); $d.Filter='FBones / Spine project|*.fbones;*.spine'; if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.FileName)}"
    };
    let out = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-STA", "-Command", script])
        .env("FBONES_DIALOG_NAME", name)
        .creation_flags(0x08000000)
        .output()?;
    if !out.status.success() {
        return Err(AppError::new(
            "Dialog",
            "The Windows file dialog could not be opened.",
        ));
    }
    let path = String::from_utf8_lossy(&out.stdout).trim().to_owned();
    Ok((!path.is_empty()).then(|| PathBuf::from(path)))
}

#[cfg(target_os = "macos")]
fn platform_pick(
    _app: tauri::AppHandle,
    save: bool,
    name: String,
    image: bool,
) -> Result<Option<PathBuf>, AppError> {
    let _ = image; // Native PNG validation follows selection on macOS too.
    let script = if save {
        "on run argv\nreturn POSIX path of (choose file name with prompt \"Save a project\" default name (item 1 of argv))\nend run"
    } else {
        "on run argv\nreturn POSIX path of (choose file with prompt \"Open a project\")\nend run"
    };
    let out = std::process::Command::new("osascript")
        .args(["-e", script, "--", &name])
        .output()?;
    if !out.status.success() {
        if String::from_utf8_lossy(&out.stderr).contains("(-128)") {
            return Ok(None);
        }
        return Err(AppError::new(
            "Dialog",
            "The macOS file dialog could not be opened.",
        ));
    }
    let path = String::from_utf8_lossy(&out.stdout).trim().to_owned();
    Ok((!path.is_empty()).then(|| PathBuf::from(path)))
}

pub async fn pick_image(app: tauri::AppHandle) -> Result<Option<PathBuf>, AppError> {
    tauri::async_runtime::spawn_blocking(move || platform_pick(app, false, String::new(), true))
        .await
        .map_err(|_| AppError::new("Dialog", "The image dialog could not be opened."))?
}

pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<PathBuf>, AppError> {
    pick_folder_titled(app, "Choose images folder").await
}
pub async fn pick_folder_titled(
    app: tauri::AppHandle,
    title: &'static str,
) -> Result<Option<PathBuf>, AppError> {
    tauri::async_runtime::spawn_blocking(move || platform_folder(app, title))
        .await
        .map_err(|_| AppError::new("Dialog", "The folder dialog could not be opened."))?
}
#[cfg(target_os = "windows")]
fn platform_folder(_app: tauri::AppHandle, title: &str) -> Result<Option<PathBuf>, AppError> {
    use std::os::windows::process::CommandExt;
    let script="[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); Add-Type -AssemblyName System.Windows.Forms; $d=[System.Windows.Forms.FolderBrowserDialog]::new(); $d.Description='__FBONES_FOLDER_TITLE__'; $d.ShowNewFolderButton=$false; if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.SelectedPath)}";
    let script = script.replace("__FBONES_FOLDER_TITLE__", &title.replace('\'', "''"));
    let out = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-STA", "-Command", &script])
        .creation_flags(0x08000000)
        .output()?;
    if !out.status.success() {
        return Err(AppError::new(
            "Dialog",
            "The Windows folder dialog could not be opened.",
        ));
    }
    let path = String::from_utf8_lossy(&out.stdout).trim().to_owned();
    Ok((!path.is_empty()).then(|| PathBuf::from(path)))
}
#[cfg(target_os = "macos")]
fn platform_folder(_app: tauri::AppHandle, title: &str) -> Result<Option<PathBuf>, AppError> {
    let script = format!(
        "POSIX path of (choose folder with prompt \"{}\")",
        title.replace('\\', "\\\\").replace('"', "\\\"")
    );
    let out = std::process::Command::new("osascript")
        .args(["-e", &script])
        .output()?;
    if !out.status.success() {
        if String::from_utf8_lossy(&out.stderr).contains("(-128)") {
            return Ok(None);
        }
        return Err(AppError::new(
            "Dialog",
            "The macOS folder dialog could not be opened.",
        ));
    }
    let path = String::from_utf8_lossy(&out.stdout).trim().to_owned();
    Ok((!path.is_empty()).then(|| PathBuf::from(path)))
}
#[cfg(target_os = "linux")]
fn platform_folder(
    app: tauri::AppHandle,
    title: &'static str,
) -> Result<Option<PathBuf>, AppError> {
    use gtk::prelude::*;
    use tauri::Manager;
    let (tx, rx) = std::sync::mpsc::channel();
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let parent = handle
            .get_webview_window("main")
            .and_then(|w| w.gtk_window().ok());
        let dialog = gtk::FileChooserNative::new(
            Some(title),
            parent.as_ref().map(|w| w.upcast_ref::<gtk::Window>()),
            gtk::FileChooserAction::SelectFolder,
            Some("Select"),
            Some("Cancel"),
        );
        dialog.set_modal(true);
        let chosen = if dialog.run() == gtk::ResponseType::Accept {
            dialog.filename()
        } else {
            None
        };
        dialog.destroy();
        let _ = tx.send(chosen);
    })
    .map_err(|_| AppError::new("Dialog", "The folder dialog could not be opened."))?;
    rx.recv()
        .map_err(|_| AppError::new("Dialog", "The folder dialog closed unexpectedly."))
}
