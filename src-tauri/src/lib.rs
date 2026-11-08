#[cfg(feature = "scene-editing")]
mod animation;
#[cfg(feature = "scene-editing")]
mod animation_constraints;
#[cfg(feature = "scene-editing")]
mod animation_deform;
#[cfg(feature = "scene-editing")]
mod animation_events;
#[cfg(feature = "scene-editing")]
mod animation_order;
#[cfg(feature = "scene-editing")]
mod animation_sequence;
#[cfg(feature = "scene-editing")]
mod animation_slots;
#[cfg(feature = "scene-editing")]
mod attachment_color;
#[cfg(feature = "scene-editing")]
mod audio;
mod auto_weights;
mod binding;
#[cfg(feature = "scene-editing")]
mod clip_edit;
mod dialogs;
#[cfg(feature = "e2e-host")]
pub mod e2e_host;
#[cfg(feature = "scene-editing")]
mod evaluation;
pub mod images;
mod library;
mod mesh;
mod mesh_edit;
mod project;
mod rig;
#[cfg(feature = "scene-editing")]
mod runtime_export;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_constraint_declarations_fixture;
#[cfg(feature = "scene-editing")]
pub mod scene_edit;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_import_metadata_fixture;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_large_mesh_fixture;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_partial_translate_fixture;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_sequence_fixture;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_slot_capacity_fixture;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_split_fixture;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_string_form_fixture;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_two_color_fixture;
#[cfg(feature = "scene-editing")]
mod scene_wire;
#[cfg(all(feature = "scene-editing", any(test, feature = "e2e-host")))]
mod scene_wire_fixture;
#[cfg(feature = "scene-editing")]
mod slot_dark_color;
#[cfg(feature = "scene-editing")]
pub mod solve;
mod trace;
#[cfg(feature = "scene-editing")]
mod transform_match;
#[cfg(feature = "scene-editing")]
mod transform_ranges;
mod triangulation;

use project::{AppError, ProjectSummary, Session};
use tauri::{Emitter, Manager};

#[tauri::command]
fn get_project(session: tauri::State<'_, Session>) -> Result<Option<ProjectSummary>, AppError> {
    session.summary()
}

#[tauri::command]
fn create_project(
    app: tauri::AppHandle,
    name: String,
    discard_changes: bool,
    session: tauri::State<'_, Session>,
) -> Result<ProjectSummary, AppError> {
    let summary = session.replace(project::new_document(name)?, discard_changes)?;
    update_menu(&app, Some(&summary));
    Ok(summary)
}

#[tauri::command]
async fn open_project(
    app: tauri::AppHandle,
    discard_changes: bool,
) -> Result<Option<ProjectSummary>, AppError> {
    let Some(path) = dialogs::pick(app.clone(), false, String::new()).await? else {
        return Ok(None);
    };
    let document = tauri::async_runtime::spawn_blocking(move || project::open_document(path))
        .await
        .map_err(|_| AppError::new("Internal", "The project could not be opened."))??;
    let summary = app.state::<Session>().replace(document, discard_changes)?;
    update_menu(&app, Some(&summary));
    Ok(Some(summary))
}

#[tauri::command]
fn close_project(
    app: tauri::AppHandle,
    discard_changes: bool,
    session: tauri::State<'_, Session>,
) -> Result<(), AppError> {
    session.close(discard_changes)?;
    update_menu(&app, None);
    Ok(())
}

#[tauri::command]
async fn save_project(
    app: tauri::AppHandle,
    save_as: bool,
) -> Result<Option<ProjectSummary>, AppError> {
    let session = app.state::<Session>();
    let snapshot = session.prepare_save(save_as)?;
    let path = if !save_as && snapshot.current_path.is_some() {
        snapshot.current_path.clone().unwrap()
    } else {
        let Some(path) = dialogs::pick(app.clone(), true, snapshot.suggested_name.clone()).await?
        else {
            return Ok(None);
        };
        path
    };
    let handle = app.clone();
    let summary = tauri::async_runtime::spawn_blocking(move || {
        let path = if path.extension().is_none() {
            path.with_extension("fbones")
        } else {
            path
        };
        handle.state::<Session>().save_snapshot(snapshot, path)
    })
    .await
    .map_err(|_| AppError::new("Internal", "The project could not be saved."))??;
    update_menu(&app, Some(&summary));
    Ok(Some(summary))
}

#[tauri::command]
async fn export_runtime(
    app: tauri::AppHandle,
    expected_revision: u64,
) -> Result<Option<serde_json::Value>, AppError> {
    #[cfg(feature = "scene-editing")]
    {
        let snapshot = app
            .state::<Session>()
            .prepare_runtime_export(expected_revision)?;
        let Some(parent) =
            dialogs::pick_folder_titled(app.clone(), "Export runtime: choose destination folder")
                .await?
        else {
            return Ok(None);
        };
        let result = tauri::async_runtime::spawn_blocking(move || {
            app.state::<Session>()
                .write_runtime_export(snapshot, &parent)
        })
        .await
        .map_err(|_| AppError::new("Internal", "Runtime export failed."))??;
        serde_json::to_value(result)
            .map(Some)
            .map_err(|_| AppError::new("Internal", "Runtime export result could not be encoded."))
    }
    #[cfg(not(feature = "scene-editing"))]
    {
        let _ = (app, expected_revision);
        Err(AppError::new(
            "UnsupportedProfile",
            "Runtime export requires Scene editing.",
        ))
    }
}

#[cfg(feature = "scene-editing")]
#[tauri::command]
fn evaluate_project(
    session: tauri::State<'_, Session>,
    expected_revision: u64,
    request: evaluation::EvaluationRequest,
) -> Result<evaluation::EvaluationSnapshot, AppError> {
    session.evaluate(expected_revision, request)
}
#[tauri::command]
fn edit_rig(
    app: tauri::AppHandle,
    expected_revision: u64,
    edit: rig::RigEdit,
    pose_epoch: Option<u64>,
) -> Result<ProjectSummary, AppError> {
    #[cfg(feature = "scene-editing")]
    let summary = if let Some(epoch) = pose_epoch {
        app.state::<Session>()
            .edit_in_pose(expected_revision, epoch, edit)?
    } else {
        app.state::<Session>().edit(expected_revision, edit)?
    };
    #[cfg(not(feature = "scene-editing"))]
    let summary = {
        let _ = pose_epoch;
        app.state::<Session>().edit(expected_revision, edit)?
    };
    update_menu(&app, Some(&summary));
    Ok(summary)
}

#[tauri::command]
async fn import_image(
    app: tauri::AppHandle,
    expected_revision: u64,
    bone: u64,
) -> Result<Option<ProjectSummary>, AppError> {
    let Some(path) = dialogs::pick_image(app.clone()).await? else {
        return Ok(None);
    };
    let handle = app.clone();
    let summary = tauri::async_runtime::spawn_blocking(move || {
        handle
            .state::<Session>()
            .import_image(expected_revision, bone, &path)
    })
    .await
    .map_err(|_| AppError::new("Internal", "The image could not be imported."))??;
    update_menu(&app, Some(&summary));
    Ok(Some(summary))
}

#[tauri::command]
async fn choose_images_folder(
    app: tauri::AppHandle,
    expected_revision: u64,
) -> Result<Option<ProjectSummary>, AppError> {
    let Some(path) = dialogs::pick_folder(app.clone()).await? else {
        return Ok(None);
    };
    let handle = app.clone();
    let summary = tauri::async_runtime::spawn_blocking(move || {
        handle
            .state::<Session>()
            .select_images_folder(expected_revision, &path)
    })
    .await
    .map_err(|_| AppError::new("Internal", "The images folder could not be loaded."))??;
    update_menu(&app, Some(&summary));
    Ok(Some(summary))
}
#[tauri::command]
async fn choose_audio_folder(
    app: tauri::AppHandle,
    expected_revision: u64,
) -> Result<Option<ProjectSummary>, AppError> {
    let Some(path) = dialogs::pick_folder_titled(app.clone(), "Choose audio folder").await? else {
        return Ok(None);
    };
    let handle = app.clone();
    let summary = tauri::async_runtime::spawn_blocking(move || {
        handle
            .state::<Session>()
            .select_audio_folder(expected_revision, &path)
    })
    .await
    .map_err(|_| AppError::new("Internal", "The audio folder could not be loaded."))??;
    update_menu(&app, Some(&summary));
    Ok(Some(summary))
}
#[tauri::command]
fn get_audio_data(
    document_id: u64,
    key: String,
    session: tauri::State<'_, Session>,
) -> Result<String, AppError> {
    session.audio_data(document_id, &key)
}

#[tauri::command]
async fn refresh_images_folder(
    app: tauri::AppHandle,
    expected_revision: u64,
) -> Result<ProjectSummary, AppError> {
    let handle = app.clone();
    let summary = tauri::async_runtime::spawn_blocking(move || {
        handle
            .state::<Session>()
            .refresh_images_folder(expected_revision)
    })
    .await
    .map_err(|_| AppError::new("Internal", "The images folder could not be refreshed."))??;
    update_menu(&app, Some(&summary));
    Ok(summary)
}
#[tauri::command]
fn place_image(
    app: tauri::AppHandle,
    expected_revision: u64,
    key: String,
    bone: u64,
    x: f32,
    y: f32,
) -> Result<ProjectSummary, AppError> {
    let summary = app
        .state::<Session>()
        .place_image(expected_revision, &key, bone, x, y)?;
    update_menu(&app, Some(&summary));
    Ok(summary)
}
#[tauri::command]
fn place_images(
    app: tauri::AppHandle,
    expected_revision: u64,
    keys: Vec<String>,
    bone: u64,
    x: f32,
    y: f32,
    pose_epoch: Option<u64>,
) -> Result<ProjectSummary, AppError> {
    #[cfg(feature = "scene-editing")]
    let summary = app.state::<Session>().place_images_in_pose(
        expected_revision,
        &keys,
        bone,
        x,
        y,
        pose_epoch,
    )?;
    #[cfg(not(feature = "scene-editing"))]
    let _ = pose_epoch;
    #[cfg(not(feature = "scene-editing"))]
    let summary = app
        .state::<Session>()
        .place_images(expected_revision, &keys, bone, x, y)?;
    update_menu(&app, Some(&summary));
    Ok(summary)
}
#[tauri::command]
fn place_attachments(
    app: tauri::AppHandle,
    expected_revision: u64,
    keys: Vec<String>,
    slot: u64,
) -> Result<ProjectSummary, AppError> {
    #[cfg(feature = "scene-editing")]
    {
        let summary = app
            .state::<Session>()
            .place_attachments(expected_revision, &keys, slot)?;
        update_menu(&app, Some(&summary));
        Ok(summary)
    }
    #[cfg(not(feature = "scene-editing"))]
    {
        let _ = (app, expected_revision, keys, slot);
        Err(AppError::new(
            "UnsupportedProfile",
            "Attachment inventory editing is not enabled in this build.",
        ))
    }
}
#[tauri::command]
async fn preview_trace_attachment(
    app: tauri::AppHandle,
    expected_revision: u64,
    id: u64,
    options: trace::TraceOptions,
    pose_epoch: Option<u64>,
) -> Result<project::TracePreview, AppError> {
    #[cfg(feature = "scene-editing")]
    {
        tauri::async_runtime::spawn_blocking(move || {
            app.state::<Session>().preview_trace_attachment_in_pose(
                expected_revision,
                id,
                options,
                pose_epoch,
            )
        })
        .await
        .map_err(|_| AppError::new("Internal", "Trace preview failed."))?
    }
    #[cfg(not(feature = "scene-editing"))]
    {
        let _ = (app, expected_revision, id, options, pose_epoch);
        Err(AppError::new(
            "UnsupportedProfile",
            "Attachment inventory editing is not enabled in this build.",
        ))
    }
}
#[tauri::command]
async fn apply_trace_attachment(
    app: tauri::AppHandle,
    expected_revision: u64,
    id: u64,
    options: trace::TraceOptions,
    pose_epoch: Option<u64>,
) -> Result<ProjectSummary, AppError> {
    #[cfg(feature = "scene-editing")]
    {
        let handle = app.clone();
        let summary = tauri::async_runtime::spawn_blocking(move || {
            handle.state::<Session>().apply_trace_attachment_in_pose(
                expected_revision,
                id,
                options,
                pose_epoch,
            )
        })
        .await
        .map_err(|_| AppError::new("Internal", "Trace application failed."))??;
        update_menu(&app, Some(&summary));
        Ok(summary)
    }
    #[cfg(not(feature = "scene-editing"))]
    {
        let _ = (app, expected_revision, id, options, pose_epoch);
        Err(AppError::new(
            "UnsupportedProfile",
            "Attachment inventory editing is not enabled in this build.",
        ))
    }
}
#[tauri::command]
async fn preview_trace(
    app: tauri::AppHandle,
    expected_revision: u64,
    id: u64,
    options: trace::TraceOptions,
) -> Result<project::TracePreview, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<Session>()
            .preview_trace(expected_revision, id, options)
    })
    .await
    .map_err(|_| AppError::new("Internal", "Trace preview could not be generated."))?
}
#[tauri::command]
async fn apply_trace(
    app: tauri::AppHandle,
    expected_revision: u64,
    id: u64,
    options: trace::TraceOptions,
) -> Result<ProjectSummary, AppError> {
    let handle = app.clone();
    let summary = tauri::async_runtime::spawn_blocking(move || {
        handle
            .state::<Session>()
            .apply_trace(expected_revision, id, options)
    })
    .await
    .map_err(|_| AppError::new("Internal", "Trace could not be applied."))??;
    update_menu(&app, Some(&summary));
    Ok(summary)
}
#[tauri::command]
fn get_image_data(
    document_id: u64,
    name: String,
    session: tauri::State<'_, Session>,
) -> Result<String, AppError> {
    session.image_data(document_id, &name)
}

fn find_menu_item<R: tauri::Runtime>(
    items: Vec<tauri::menu::MenuItemKind<R>>,
    id: &str,
) -> Option<tauri::menu::MenuItem<R>> {
    for kind in items {
        match kind {
            tauri::menu::MenuItemKind::MenuItem(item) if item.id().as_ref() == id => {
                return Some(item);
            }
            tauri::menu::MenuItemKind::Submenu(submenu) => {
                if let Some(item) = find_menu_item(submenu.items().unwrap_or_default(), id) {
                    return Some(item);
                }
            }
            _ => {}
        }
    }
    None
}

fn update_menu(app: &tauri::AppHandle, project: Option<&ProjectSummary>) {
    if let Some(menu) = app.menu() {
        for (id, enabled) in [
            ("save", project.is_some_and(|p| p.can_save)),
            ("copy", project.is_some_and(|p| p.can_copy)),
            (
                "export-runtime",
                cfg!(feature = "scene-editing") && project.is_some_and(|p| !p.inspection_only),
            ),
            ("close", project.is_some()),
            ("import", project.is_some_and(|p| !p.inspection_only)),
            ("undo", project.is_some_and(|p| p.can_undo)),
            ("redo", project.is_some_and(|p| p.can_redo)),
        ] {
            // Tauri's Menu::get only searches direct children; our commands
            // live inside the File/Edit submenus.
            if let Some(item) = find_menu_item(menu.items().unwrap_or_default(), id) {
                let _ = item.set_enabled(enabled);
            }
        }
    }
}

#[tauri::command]
fn frontend_ready(renderer: String, app: tauri::AppHandle) {
    // Desktop launchers can close their redirected output before the WebView
    // finishes loading. Readiness logging must never panic on a broken pipe.
    use std::io::Write;
    let _ = writeln!(std::io::stdout(), "FBones UI ready; renderer={renderer}");
    if cfg!(debug_assertions) {
        if let Some(path) = std::env::var_os("FBONES_SMOKE_REPORT") {
            let state = app.state::<Session>();
            let result = state.replace(project::new_document("Smoke test".into()).unwrap(), true);
            let ok = renderer == "webgl"
                && result
                    .as_ref()
                    .is_ok_and(|p| p.name == "Smoke test" && p.dirty && p.can_save);
            let report = serde_json::json!({ "renderer": renderer, "newProject": ok, "minimalEncoderVerified": true });
            let _ = std::fs::write(path, serde_json::to_string_pretty(&report).unwrap());
            tauri::async_runtime::spawn(async move {
                std::thread::sleep(std::time::Duration::from_millis(700));
                let _ = app.state::<Session>().close(true);
                app.exit(if ok { 0 } else { 1 });
            });
        }
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(Session::default())
        .invoke_handler(tauri::generate_handler![
            get_project,
            create_project,
            open_project,
            close_project,
            save_project,
            export_runtime,
            edit_rig,
            #[cfg(feature = "scene-editing")]
            evaluate_project,
            import_image,
            choose_images_folder,
            refresh_images_folder,
            place_image,
            place_images,
            place_attachments,
            preview_trace_attachment,
            apply_trace_attachment,
            preview_trace,
            apply_trace,
            get_image_data,
            choose_audio_folder,
            get_audio_data,
            frontend_ready
        ])
        .setup(|app| {
            use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
            let new = MenuItemBuilder::with_id("new", "New Project…")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            let open = MenuItemBuilder::with_id("open", "Open Project…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let save = MenuItemBuilder::with_id("save", "Save Project")
                .accelerator("CmdOrCtrl+S")
                .enabled(false)
                .build(app)?;
            let copy = MenuItemBuilder::with_id("copy", "Save As…")
                .accelerator("CmdOrCtrl+Shift+S")
                .enabled(false)
                .build(app)?;
            let close = MenuItemBuilder::with_id("close", "Close Project")
                .accelerator("CmdOrCtrl+W")
                .enabled(false)
                .build(app)?;
            let runtime = MenuItemBuilder::with_id("export-runtime", "Export runtime…")
                .enabled(false)
                .build(app)?;
            let import = MenuItemBuilder::with_id("import", "Choose Images Folder…")
                .accelerator("CmdOrCtrl+I")
                .enabled(false)
                .build(app)?;
            let file = SubmenuBuilder::new(app, "File")
                .items(&[&new, &open])
                .separator()
                .item(&import)
                .separator()
                .items(&[&save, &copy])
                .item(&runtime)
                .separator()
                .item(&close)
                .build()?;
            let menu = MenuBuilder::new(app);
            let undo = MenuItemBuilder::with_id("undo", "Undo")
                .enabled(false)
                .build(app)?;
            let redo = MenuItemBuilder::with_id("redo", "Redo")
                .enabled(false)
                .build(app)?;
            let edit = SubmenuBuilder::new(app, "Edit")
                .items(&[&undo, &redo])
                .build()?;
            #[cfg(target_os = "macos")]
            let menu = menu.item(
                &SubmenuBuilder::new(app, "FBones")
                    .about(None)
                    .separator()
                    .quit()
                    .build()?,
            );
            app.set_menu(menu.item(&file).item(&edit).build()?)?;
            app.on_menu_event(|app, event| {
                let _ = app.emit("editor-command", event.id().as_ref());
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("FBones could not start")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if app
                    .state::<Session>()
                    .summary()
                    .ok()
                    .flatten()
                    .is_some_and(|p| p.dirty)
                {
                    api.prevent_exit();
                    let _ = app.emit("editor-command", "quit");
                }
            }
        });
}
