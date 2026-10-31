//! Opt-in JSONL test transport over the real native Session. No desktop window.
use crate::{
    project::{self, AppError, SaveSnapshot, Session},
    rig::RigEdit,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::{HashMap, VecDeque},
    fs,
    io::{self, BufRead, Write},
    path::{Component, Path, PathBuf},
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    id: u64,
    command: String,
    #[serde(default)]
    args: Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Args {
    name: String,
    discard_changes: bool,
    save_as: bool,
    expected_revision: u64,
    pose_epoch: Option<u64>,
    document_id: u64,
    bone: u64,
    slot: u64,
    id: u64,
    key: String,
    keys: Vec<String>,
    x: f32,
    y: f32,
    edit: Option<RigEdit>,
    request: Option<crate::evaluation::EvaluationRequest>,
    options: crate::trace::TraceOptions,
    kind: String,
    path: Option<String>,
    snapshot_id: u64,
}
impl Default for Args {
    fn default() -> Self {
        Self {
            name: String::new(),
            discard_changes: false,
            save_as: false,
            expected_revision: 0,
            pose_epoch: None,
            document_id: 0,
            bone: 0,
            slot: 0,
            id: 0,
            key: String::new(),
            keys: vec![],
            x: 0.,
            y: 0.,
            edit: None,
            request: None,
            options: crate::trace::TraceOptions::default(),
            kind: String::new(),
            path: None,
            snapshot_id: 0,
        }
    }
}
fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("E2eProtocol", message)
}
fn value<T: serde::Serialize>(result: Result<T, AppError>) -> Result<Value, AppError> {
    serde_json::to_value(result?).map_err(|e| invalid(e.to_string()))
}

struct Host {
    root: PathBuf,
    session: Session,
    dialogs: VecDeque<(String, Option<PathBuf>)>,
    snapshots: HashMap<u64, SaveSnapshot>,
    next_snapshot: u64,
}
impl Host {
    fn new(root: PathBuf) -> Result<Self, AppError> {
        if !root.is_absolute() || !root.is_dir() {
            return Err(invalid(
                "--root must be an existing absolute sandbox directory.",
            ));
        }
        // Inspect every component before canonicalization so aliases cannot hide links.
        let mut part = PathBuf::new();
        for component in root.components() {
            part.push(component.as_os_str());
            if fs::symlink_metadata(&part)?.file_type().is_symlink() {
                return Err(invalid("Sandbox root must not use symbolic links."));
            }
        }
        let root = root.canonicalize()?;
        let host = Self {
            root,
            session: Session::default(),
            dialogs: VecDeque::new(),
            snapshots: HashMap::new(),
            next_snapshot: 0,
        };
        host.check_tree()?;
        host.prepare_audio_fixture()?;
        Ok(host)
    }
    fn prepare_audio_fixture(&self) -> Result<(), AppError> {
        let folder = self.path("audio")?;
        fs::create_dir_all(&folder)?;
        let path = self.path("audio/tone.wav")?;
        if path.exists() {
            return Ok(());
        }
        let frames = 1103u32;
        let rate = 22050u32;
        let mut bytes = Vec::new();
        bytes.extend(b"RIFF");
        bytes.extend((36 + frames * 2).to_le_bytes());
        bytes.extend(b"WAVEfmt ");
        bytes.extend(16u32.to_le_bytes());
        bytes.extend(1u16.to_le_bytes());
        bytes.extend(1u16.to_le_bytes());
        bytes.extend(rate.to_le_bytes());
        bytes.extend((rate * 2).to_le_bytes());
        bytes.extend(2u16.to_le_bytes());
        bytes.extend(16u16.to_le_bytes());
        bytes.extend(b"data");
        bytes.extend((frames * 2).to_le_bytes());
        for i in 0..frames {
            let sample = (8000.
                * (std::f64::consts::TAU * 440. * f64::from(i) / f64::from(rate)).sin())
            .round() as i16;
            bytes.extend(sample.to_le_bytes());
        }
        crate::audio::AudioAsset::from_bytes(bytes.clone())?;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)?;
        file.write_all(&bytes)?;
        Ok(())
    }
    fn path(&self, relative: &str) -> Result<PathBuf, AppError> {
        if relative.is_empty() || relative.contains('\\') || relative.contains(':') {
            return Err(invalid("Choose a portable relative sandbox path."));
        }
        let path = Path::new(relative);
        if path
            .components()
            .any(|c| !matches!(c, Component::Normal(_) | Component::CurDir))
        {
            return Err(invalid(
                "Absolute and parent-traversal paths are forbidden.",
            ));
        }
        let mut output = self.root.clone();
        for part in path.components() {
            output.push(part.as_os_str());
            match fs::symlink_metadata(&output) {
                Ok(meta) if meta.file_type().is_symlink() => {
                    return Err(invalid("Symbolic links are forbidden in the sandbox."))
                }
                Ok(_) => {}
                Err(e) if e.kind() == io::ErrorKind::NotFound => {}
                Err(e) => return Err(e.into()),
            }
        }
        Ok(output)
    }
    fn check_tree(&self) -> Result<(), AppError> {
        let root_metadata = fs::symlink_metadata(&self.root)?;
        if !root_metadata.is_dir() || root_metadata.file_type().is_symlink() {
            return Err(invalid("Sandbox root must remain a regular directory."));
        }
        let mut pending = vec![self.root.clone()];
        let mut count = 0;
        while let Some(directory) = pending.pop() {
            for entry in fs::read_dir(directory)? {
                count += 1;
                if count > 32768 {
                    return Err(invalid("Sandbox entry limit exceeded."));
                }
                let entry = entry?;
                let kind = entry.file_type()?;
                if kind.is_symlink() {
                    return Err(invalid("Sandbox must contain no symbolic links."));
                }
                if kind.is_dir() {
                    pending.push(entry.path());
                }
            }
        }
        Ok(())
    }
    fn embedded_root(&self, file: &Path) -> Result<(), AppError> {
        use fbones_format::{minimal::scene::decode_scene, ProjectEnvelope};
        let meta = fs::metadata(file)?;
        if meta.len() > fbones_format::MAX_FILE_BYTES as u64 {
            return Err(invalid("Project exceeds native size limit."));
        }
        let envelope = ProjectEnvelope::inspect(fs::read(file)?)?;
        if let Ok(scene) = decode_scene(&envelope.decoded_payload()?) {
            for root in [&scene.images_root, &scene.audio_root] {
                let folder = Path::new(root);
                if folder.is_absolute() {
                    // The real folder chooser stores an absolute root. Only roots
                    // inside this same sandbox may be reopened by this test host.
                    let relative = folder
                        .strip_prefix(&self.root)
                        .map_err(|_| invalid("Project resources point outside the sandbox."))?;
                    self.path(
                        relative
                            .to_str()
                            .ok_or_else(|| invalid("Non-Unicode image root."))?,
                    )?;
                } else {
                    let parent = file
                        .parent()
                        .ok_or_else(|| invalid("Missing project parent."))?;
                    let relative = parent
                        .strip_prefix(&self.root)
                        .map_err(|_| invalid("Project outside sandbox."))?
                        .join(folder);
                    self.path(
                        relative
                            .to_str()
                            .ok_or_else(|| invalid("Non-Unicode image root."))?,
                    )?;
                }
            }
        }
        Ok(())
    }
    fn dialog(&mut self, kind: &str) -> Result<Option<PathBuf>, AppError> {
        let Some((queued, path)) = self.dialogs.front() else {
            return Err(AppError::new(
                "DialogMissing",
                "Queue a test dialog choice before opening a native dialog.",
            ));
        };
        if queued != kind {
            return Err(invalid(format!("Expected {kind} dialog, queued {queued}.")));
        }
        let path = path.clone();
        self.dialogs.pop_front();
        Ok(path)
    }
    /// Own test data encoded through the production codec, then opened by the
    /// ordinary UI file path. This opt-in host never patches Session state.
    fn seed_transform_ranges(&self) -> Result<Value, AppError> {
        use fbones_format::minimal::{
            scene::{
                encode_scene, Constraint, SceneProject, TransformConstraint, TransformEditorRange,
                TransformFrom, TransformProperty,
            },
            MinimalProject,
        };
        let mut rig = MinimalProject::new("Stored Transform ranges".into(), [63; 16]);
        for (name, x, y) in [("Range source", -60., 15.), ("Range target", 80., 35.)] {
            let mut bone = rig.bones[0].clone();
            bone.name = name.into();
            bone.parent = Some(0);
            bone.x = x;
            bone.y = y;
            bone.length = 40.;
            rig.bones.push(bone);
        }
        let mut stored = TransformConstraint::new("Stored ranges".into(), vec![2], 1);
        stored.mix = [0.; 6];
        stored.properties = vec![
            TransformFrom::identity(TransformProperty::X),
            TransformFrom::identity(TransformProperty::Y),
        ];
        stored.editor_ranges[1] = TransformEditorRange::from_bits([
            Some(0x80000000),
            Some(0x3dcccccd),
            Some(0x3eaaaaab),
            Some(0x40000000),
        ])?;
        stored.editor_ranges[2] =
            TransformEditorRange::from_bits([None, Some(0x80000001), None, Some(0x40800000)])?;
        stored.editor_ranges[3] = TransformEditorRange::from_bits([
            Some(0x40000000),
            Some(0xc0000000),
            Some(0),
            Some(0x3f800000),
        ])?;
        let mut absent = TransformConstraint::new("Absent ranges".into(), vec![2], 1);
        absent.mix = [0.; 6];
        absent.properties = stored.properties.clone();
        let model = SceneProject {
            audio_root: "./audio".into(),
            events: vec![],
            editor_flag_53: false,
            fps: 30.,
            animations: vec![fbones_format::minimal::scene::Animation::new(
                "animation".into(),
            )],
            rig,
            images_root: "./images/".into(),
            slots: vec![],
            attachment_order: vec![],
            constraints: vec![Constraint::Transform(stored), Constraint::Transform(absent)],
        };
        let name = "transform-ranges.fbones";
        let path = self.path(name)?;
        let bytes = encode_scene(&model)?;
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
        Ok(json!(name))
    }
    fn execute(&mut self, command: &str, raw: Value) -> Result<Value, AppError> {
        self.check_tree()?;
        let a: Args = serde_json::from_value(if raw.is_null() { json!({}) } else { raw })
            .map_err(|e| invalid(e.to_string()))?;
        match command {
            "e2e_info" => Ok(
                json!({"version":env!("CARGO_PKG_VERSION"),"sceneEditing":true,"transport":"native-session-jsonl"}),
            ),
            "e2e_seed_transform_ranges" => self.seed_transform_ranges(),
            "e2e_dialog" => {
                if !["folder", "open", "save"].contains(&a.kind.as_str()) {
                    return Err(invalid("Unknown dialog kind."));
                }
                let path = a.path.as_deref().map(|p| self.path(p)).transpose()?;
                self.dialogs.push_back((a.kind, path));
                Ok(Value::Null)
            }
            "get_project" => value(self.session.summary()),
            "create_project" => value(
                self.session
                    .replace(project::new_document(a.name)?, a.discard_changes),
            ),
            "close_project" => value(self.session.close(a.discard_changes)),
            "open_project" => {
                let Some(path) = self.dialog("open")? else {
                    return Ok(Value::Null);
                };
                self.embedded_root(&path)?;
                value(
                    self.session
                        .replace(project::open_document(path)?, a.discard_changes),
                )
            }
            "save_project" => {
                let snapshot = self.session.prepare_save(a.save_as)?;
                let path = if !a.save_as && snapshot.current_path.is_some() {
                    snapshot.current_path.clone().unwrap()
                } else {
                    let Some(path) = self.dialog("save")? else {
                        return Ok(Value::Null);
                    };
                    path
                };
                let path = if path.extension().is_none() {
                    path.with_extension("fbones")
                } else {
                    path
                };
                value(self.session.save_snapshot(snapshot, path))
            }
            "e2e_prepare_save" => {
                let snapshot = self.session.prepare_save(a.save_as)?;
                self.next_snapshot += 1;
                self.snapshots.insert(self.next_snapshot, snapshot);
                Ok(json!({"snapshotId":self.next_snapshot}))
            }
            "e2e_save_snapshot" => {
                let path = self.path(a.path.as_deref().ok_or_else(|| invalid("Missing path."))?)?;
                let snapshot = self
                    .snapshots
                    .remove(&a.snapshot_id)
                    .ok_or_else(|| invalid("Unknown snapshot ID."))?;
                value(self.session.save_snapshot(snapshot, path))
            }
            "edit_rig" => {
                let edit = a.edit.ok_or_else(|| invalid("Missing edit."))?;
                if let RigEdit::SetImagesRoot { path } | RigEdit::SetAudioRoot { path } = &edit {
                    let summary = self
                        .session
                        .summary()?
                        .ok_or_else(|| invalid("No project."))?;
                    let parent = summary
                        .path
                        .as_deref()
                        .and_then(|p| Path::new(p).parent())
                        .unwrap_or(&self.root);
                    let relative = parent
                        .strip_prefix(&self.root)
                        .map_err(|_| invalid("Project outside sandbox."))?
                        .join(path);
                    // Explicit edit paths must always be relative, even though
                    // folder-dialog results are real absolute native paths.
                    self.path(path)?;
                    self.path(relative.to_str().ok_or_else(|| invalid("Invalid root."))?)?;
                }
                value(if let Some(epoch) = a.pose_epoch {
                    self.session.edit_in_pose(a.expected_revision, epoch, edit)
                } else {
                    self.session.edit(a.expected_revision, edit)
                })
            }
            "evaluate_project" => value(
                self.session.evaluate(
                    a.expected_revision,
                    a.request
                        .ok_or_else(|| invalid("Missing evaluation request."))?,
                ),
            ),
            "import_image" => {
                let Some(path) = self.dialog("open")? else {
                    return Ok(Value::Null);
                };
                value(
                    self.session
                        .import_image(a.expected_revision, a.bone, &path),
                )
            }
            "choose_audio_folder" => {
                let Some(path) = self.dialog("folder")? else {
                    return Ok(Value::Null);
                };
                value(self.session.select_audio_folder(a.expected_revision, &path))
            }
            "get_audio_data" => value(self.session.audio_data(a.document_id, &a.key)),
            "choose_images_folder" => {
                let Some(path) = self.dialog("folder")? else {
                    return Ok(Value::Null);
                };
                value(
                    self.session
                        .select_images_folder(a.expected_revision, &path),
                )
            }
            "refresh_images_folder" => {
                value(self.session.refresh_images_folder(a.expected_revision))
            }
            "place_image" => {
                value(
                    self.session
                        .place_image(a.expected_revision, &a.key, a.bone, a.x, a.y),
                )
            }
            "place_images" => value(self.session.place_images_in_pose(
                a.expected_revision,
                &a.keys,
                a.bone,
                a.x,
                a.y,
                a.pose_epoch,
            )),
            "place_attachments" => value(self.session.place_attachments(
                a.expected_revision,
                &a.keys,
                a.slot,
            )),
            "get_image_data" => value(self.session.image_data(a.document_id, &a.name)),
            "preview_trace" => value(self.session.preview_trace(
                a.expected_revision,
                a.id,
                a.options,
            )),
            "apply_trace" => value(
                self.session
                    .apply_trace(a.expected_revision, a.id, a.options),
            ),
            "preview_trace_attachment" => value(self.session.preview_trace_attachment_in_pose(
                a.expected_revision,
                a.id,
                a.options,
                a.pose_epoch,
            )),
            "apply_trace_attachment" => value(self.session.apply_trace_attachment_in_pose(
                a.expected_revision,
                a.id,
                a.options,
                a.pose_epoch,
            )),
            _ => Err(invalid("Unknown test-host command.")),
        }
    }
}

/// Entry point for the opt-in test binary. The caller owns the fresh sandbox.
pub fn run() -> Result<(), AppError> {
    let mut args = std::env::args_os().skip(1);
    if args.next().as_deref() != Some(std::ffi::OsStr::new("--root")) {
        return Err(invalid("Usage: fbones-e2e-host --root <absolute sandbox>"));
    }
    let root = PathBuf::from(
        args.next()
            .ok_or_else(|| invalid("Missing sandbox root."))?,
    );
    if args.next().is_some() {
        return Err(invalid("Unexpected argument."));
    }
    let mut host = Host::new(root)?;
    std::env::set_current_dir(&host.root)?;
    let mut output = io::stdout().lock();
    for line in io::stdin().lock().lines() {
        let line = line?;
        let response = match serde_json::from_str::<Request>(&line) {
            Ok(request) => match host.execute(&request.command, request.args) {
                Ok(result) => json!({"id":request.id,"result":result}),
                Err(error) => json!({"id":request.id,"error":error}),
            },
            Err(error) => {
                json!({"id":null,"error":{"code":"E2eProtocol","message":error.to_string()}})
            }
        };
        serde_json::to_writer(&mut output, &response).map_err(|e| invalid(e.to_string()))?;
        writeln!(output)?;
        output.flush()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn e2e_seed_transform_ranges_creates_native_file_without_replacing_session_or_overwriting() {
        use fbones_format::{
            minimal::scene::{decode_scene, Constraint},
            ProjectEnvelope,
        };
        let directory = tempfile::tempdir().unwrap();
        let mut host = Host::new(directory.path().to_owned()).unwrap();
        let before = host
            .execute(
                "create_project",
                json!({"name":"Keep current native session"}),
            )
            .unwrap();
        assert_eq!(
            host.execute("e2e_seed_transform_ranges", json!({}))
                .unwrap(),
            "transform-ranges.fbones"
        );
        assert_eq!(host.execute("get_project", json!({})).unwrap(), before);
        let bytes = fs::read(directory.path().join("transform-ranges.fbones")).unwrap();
        let envelope = ProjectEnvelope::inspect(bytes.clone()).unwrap();
        let scene = decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
        let Constraint::Transform(stored) = &scene.constraints[0] else {
            panic!("typed fixture")
        };
        assert_eq!(
            &stored.editor_range_bits()[4..8],
            &[
                Some(0x80000000),
                Some(0x3dcccccd),
                Some(0x3eaaaaab),
                Some(0x40000000)
            ]
        );
        let Constraint::Transform(absent) = &scene.constraints[1] else {
            panic!("typed fixture")
        };
        assert_eq!(absent.editor_range_bits(), [None; 24]);
        assert!(host
            .execute("e2e_seed_transform_ranges", json!({}))
            .is_err());
        assert_eq!(
            fs::read(directory.path().join("transform-ranges.fbones")).unwrap(),
            bytes
        );
        host.execute(
            "e2e_dialog",
            json!({"kind":"open","path":"transform-ranges.fbones"}),
        )
        .unwrap();
        let opened = host
            .execute("open_project", json!({"discardChanges":true}))
            .unwrap();
        assert_eq!(opened["inspectionOnly"], false);
        assert_eq!(
            opened["constraints"][0]["editorRangeBits"][4],
            0x80000000u32
        );
    }

    #[test]
    fn transport_uses_one_real_session_history_and_rejects_stale_snapshot() {
        let directory = tempfile::tempdir().unwrap();
        let mut host = Host::new(directory.path().to_owned()).unwrap();
        let created = host
            .execute("create_project", json!({"name":"Owned transport"}))
            .unwrap();
        let revision = created["revision"].as_u64().unwrap();
        let root = created["bones"][0]["id"].as_u64().unwrap();
        let snapshot = host
            .execute("e2e_prepare_save", json!({"saveAs":true}))
            .unwrap();
        let changed=host.execute("edit_rig",json!({"expectedRevision":revision,"edit":{"type":"update","id":root,"name":"transport root","x":0,"y":0,"rotation":0,"length":0}})).unwrap();
        assert_eq!(changed["bones"][0]["name"], "transport root");
        let failure = host
            .execute(
                "e2e_save_snapshot",
                json!({"snapshotId":snapshot["snapshotId"],"path":"stale.fbones"}),
            )
            .unwrap_err();
        assert_eq!(failure.code, "ProjectChanged");
        assert!(!directory.path().join("stale.fbones").exists());
        let undone = host
            .execute(
                "edit_rig",
                json!({"expectedRevision":changed["revision"],"edit":{"type":"undo"}}),
            )
            .unwrap();
        assert_eq!(undone["bones"][0]["name"], created["bones"][0]["name"]);
        host.execute("e2e_dialog", json!({"kind":"save","path":"valid.fbones"}))
            .unwrap();
        let saved = host
            .execute("save_project", json!({"saveAs":true}))
            .unwrap();
        assert_eq!(saved["dirty"], false);
        host.execute("close_project", json!({"discardChanges":false}))
            .unwrap();
        host.execute("e2e_dialog", json!({"kind":"open","path":"valid.fbones"}))
            .unwrap();
        let reopened = host.execute("open_project", json!({})).unwrap();
        assert_eq!(reopened["bones"], saved["bones"]);
        assert_eq!(reopened["dirty"], false);
    }

    #[test]
    fn dialogs_cancel_without_mutation_and_paths_do_not_escape() {
        let directory = tempfile::tempdir().unwrap();
        let mut host = Host::new(directory.path().to_owned()).unwrap();
        let before = host
            .execute("create_project", json!({"name":"Cancel proof"}))
            .unwrap();
        for path in [
            "../outside.fbones",
            "/tmp/outside.fbones",
            "images/../../escape",
            "C:\\escape.fbones",
        ] {
            assert_eq!(
                host.execute("e2e_dialog", json!({"kind":"save","path":path}))
                    .unwrap_err()
                    .code,
                "E2eProtocol"
            );
        }
        assert_eq!(
            host.execute("save_project", json!({"saveAs":true}))
                .unwrap_err()
                .code,
            "DialogMissing"
        );
        host.execute("e2e_dialog", json!({"kind":"save","path":null}))
            .unwrap();
        assert!(host
            .execute("save_project", json!({"saveAs":true}))
            .unwrap()
            .is_null());
        assert_eq!(host.execute("get_project", json!({})).unwrap(), before);
    }

    #[test]
    fn embedded_project_resource_root_is_checked_before_native_open() {
        use fbones_format::{
            minimal::scene::{decode_scene, encode_scene},
            ProjectEnvelope,
        };
        let directory = tempfile::tempdir().unwrap();
        let mut host = Host::new(directory.path().to_owned()).unwrap();
        let original = host
            .execute("create_project", json!({"name":"Before unsafe open"}))
            .unwrap();
        host.execute("e2e_dialog", json!({"kind":"save","path":"source.fbones"}))
            .unwrap();
        host.execute("save_project", json!({"saveAs":true}))
            .unwrap();
        let envelope =
            ProjectEnvelope::inspect(fs::read(directory.path().join("source.fbones")).unwrap())
                .unwrap();
        let mut model = decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
        model.images_root = "../outside/".into();
        fs::write(
            directory.path().join("unsafe.fbones"),
            encode_scene(&model).unwrap(),
        )
        .unwrap();
        host.execute("e2e_dialog", json!({"kind":"open","path":"unsafe.fbones"}))
            .unwrap();
        assert_eq!(
            host.execute("open_project", json!({"discardChanges":true}))
                .unwrap_err()
                .code,
            "E2eProtocol"
        );
        let current = host.execute("get_project", json!({})).unwrap();
        assert_eq!(current["name"], original["name"]);
        assert_eq!(current["documentId"], original["documentId"]);
    }

    #[cfg(unix)]
    #[test]
    fn sandbox_rejects_links_including_output_image_directory() {
        let directory = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let mut host = Host::new(directory.path().to_owned()).unwrap();
        host.execute("create_project", json!({"name":"Link guard"}))
            .unwrap();
        std::os::unix::fs::symlink(outside.path(), directory.path().join("images")).unwrap();
        assert_eq!(
            host.execute("get_project", json!({})).unwrap_err().code,
            "E2eProtocol"
        );
        assert!(fs::read_dir(outside.path()).unwrap().next().is_none());
    }

    #[cfg(unix)]
    #[test]
    fn replaced_sandbox_root_is_rejected_before_session_work() {
        let directory = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let root = directory.path().join("root");
        fs::create_dir(&root).unwrap();
        let mut host = Host::new(root.clone()).unwrap();
        fs::rename(&root, directory.path().join("original-root")).unwrap();
        std::os::unix::fs::symlink(outside.path(), &root).unwrap();
        assert_eq!(
            host.execute("create_project", json!({"name":"must fail"}))
                .unwrap_err()
                .code,
            "E2eProtocol"
        );
        assert!(host.session.summary().unwrap().is_none());
        assert!(fs::read_dir(outside.path()).unwrap().next().is_none());
    }
}
