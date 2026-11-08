use crate::images::{valid_image_stem, ImageAsset, ImageBundle, ImageCache};
#[cfg(not(feature = "scene-editing"))]
use crate::rig::image_stem;
#[cfg(not(feature = "scene-editing"))]
use crate::rig::RigHistory;
use crate::rig::{BoneView, ImagePlacement, RigEdit, SlotView};
#[cfg(feature = "scene-editing")]
use crate::scene_edit::SceneRigHistory as RigHistory;
#[cfg(not(feature = "scene-editing"))]
use fbones_format::minimal::regions::{decode_regions, encode_regions, RegionProject};
#[cfg(feature = "scene-editing")]
use fbones_format::minimal::scene::{
    decode_scene as decode_regions, encode_scene as encode_regions, SceneProject as RegionProject,
};
use fbones_format::{minimal::MinimalProject, FormatError, ProjectEnvelope, MAX_FILE_BYTES};
use serde::Serialize;
use std::{
    collections::BTreeMap,
    fs::File,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: &'static str,
    pub message: String,
}
impl AppError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}
impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        Self::new("Io", error.to_string())
    }
}
impl From<FormatError> for AppError {
    fn from(error: FormatError) -> Self {
        let code = match &error {
            FormatError::UnsupportedVersion(_) => "UnsupportedVersion",
            FormatError::UnsupportedProfile => "UnsupportedProfile",
            _ => "InvalidFile",
        };
        Self::new(code, error.to_string())
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub name: String,
    pub scene_editing: bool,
    pub path: Option<String>,
    pub dirty: bool,
    pub inspection_only: bool,
    pub can_save: bool,
    pub can_copy: bool,
    pub version: String,
    pub compressed_bytes: Option<usize>,
    pub decoded_bytes: Option<usize>,
    pub bone_count: Option<usize>,
    pub bones: Vec<BoneView>,
    pub can_undo: bool,
    pub can_redo: bool,
    pub edited_bone: Option<u64>,
    pub revision: u64,
    pub document_id: u64,
    /// Logical opened-document identity, independent of resource generations.
    pub logical_document_id: u64,
    pub slots: Vec<SlotView>,
    pub edited_slot: Option<u64>,
    pub edited_vertex: Option<usize>,
    #[cfg(feature = "scene-editing")]
    pub edited_attachment: Option<u64>,
    #[cfg(feature = "scene-editing")]
    pub constraints: Vec<serde_json::Value>,
    #[cfg(feature = "scene-editing")]
    pub animations: Vec<crate::animation::AnimationView>,
    #[cfg(feature = "scene-editing")]
    pub edited_animation: Option<u64>,
    #[cfg(feature = "scene-editing")]
    pub events: Vec<crate::animation_events::EventView>,
    #[cfg(feature = "scene-editing")]
    pub edited_event: Option<u64>,
    #[cfg(feature = "scene-editing")]
    pub audio_root: String,
    #[cfg(feature = "scene-editing")]
    pub audio_library: crate::audio::AudioLibraryView,
    #[cfg(feature = "scene-editing")]
    pub animation_channels: Vec<&'static str>,
    #[cfg(feature = "scene-editing")]
    pub animation_fps: f64,
    pub library: crate::library::LibraryView,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TracePreview {
    #[cfg(feature = "scene-editing")]
    pub attachment_id: u64,
    #[cfg(feature = "scene-editing")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pose_epoch: Option<u64>,
    pub slot_id: u64,
    pub expected_revision: u64,
    pub mesh: crate::rig::MeshView,
    pub geometry: crate::trace::TraceGeometry,
}
pub enum Document {
    Editable {
        project: Box<RegionProject>,
        images: ImageCache,
        image_roots: BTreeMap<String, ImageCache>,
        library_warnings: Vec<String>,
        #[cfg(feature = "scene-editing")]
        audio: crate::audio::AudioCache,
        #[cfg(feature = "scene-editing")]
        audio_roots: BTreeMap<String, crate::audio::AudioCache>,
        #[cfg(feature = "scene-editing")]
        audio_warnings: Vec<String>,
        path: Option<PathBuf>,
        dirty: bool,
        compressed_bytes: Option<usize>,
        decoded_bytes: Option<usize>,
        rig: Box<RigHistory>,
    },
    Inspected {
        path: PathBuf,
        envelope: ProjectEnvelope,
    },
}
impl Document {
    fn summary(&self) -> ProjectSummary {
        match self {
            Self::Editable {
                project,
                images,
                #[cfg(feature = "scene-editing")]
                audio,
                #[cfg(feature = "scene-editing")]
                audio_warnings,
                path,
                dirty,
                compressed_bytes,
                decoded_bytes,
                rig,
                library_warnings,
                ..
            } => ProjectSummary {
                name: project.rig.name.clone(),
                scene_editing: cfg!(feature = "scene-editing"),
                path: path.as_ref().map(|p| p.to_string_lossy().into_owned()),
                dirty: *dirty,
                inspection_only: false,
                can_save: true,
                can_copy: true,
                version: "4.3.26".into(),
                compressed_bytes: *compressed_bytes,
                decoded_bytes: *decoded_bytes,
                bone_count: Some(project.rig.bones.len()),
                bones: rig.views(&project.rig.bones),
                can_undo: rig.can_undo(),
                can_redo: rig.can_redo(),
                edited_bone: Some(rig.focus()),
                revision: 0,
                document_id: 0,
                logical_document_id: 0,
                slots: rig.slot_views(project, images),
                edited_slot: rig.slot_focus(),
                edited_vertex: rig.vertex_focus(),
                #[cfg(feature = "scene-editing")]
                edited_attachment: rig.attachment_focus(),
                #[cfg(feature = "scene-editing")]
                constraints: rig.constraint_views(),
                #[cfg(feature = "scene-editing")]
                animations: crate::animation::views(rig.history.frame()),
                #[cfg(feature = "scene-editing")]
                edited_animation: rig.history.frame().focus.animation,
                #[cfg(feature = "scene-editing")]
                events: crate::animation_events::definitions(rig.history.frame()),
                #[cfg(feature = "scene-editing")]
                edited_event: rig.history.frame().focus.event,
                #[cfg(feature = "scene-editing")]
                audio_root: project.audio_root.clone(),
                #[cfg(feature = "scene-editing")]
                audio_library: crate::audio::view(&project.audio_root, audio, audio_warnings),
                #[cfg(feature = "scene-editing")]
                animation_channels: vec![
                    "rotate",
                    "translate",
                    "scale",
                    "shear",
                    "translateX",
                    "translateY",
                    "scaleX",
                    "scaleY",
                ],
                #[cfg(feature = "scene-editing")]
                animation_fps: f64::from(project.fps),
                library: crate::library::view(&project.images_root, images, library_warnings),
            },
            Self::Inspected { path, envelope } => ProjectSummary {
                scene_editing: false,
                name: path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned(),
                path: Some(path.to_string_lossy().into_owned()),
                dirty: false,
                inspection_only: true,
                can_save: false,
                can_copy: true,
                version: "4.3.26".into(),
                compressed_bytes: Some(envelope.original_bytes().len()),
                decoded_bytes: Some(envelope.decoded_bytes()),
                bone_count: None,
                bones: vec![],
                can_undo: false,
                can_redo: false,
                edited_bone: None,
                revision: 0,
                document_id: 0,
                logical_document_id: 0,
                slots: vec![],
                edited_slot: None,
                edited_vertex: None,
                #[cfg(feature = "scene-editing")]
                edited_attachment: None,
                #[cfg(feature = "scene-editing")]
                constraints: vec![],
                #[cfg(feature = "scene-editing")]
                animations: vec![],
                #[cfg(feature = "scene-editing")]
                edited_animation: None,
                #[cfg(feature = "scene-editing")]
                events: vec![],
                #[cfg(feature = "scene-editing")]
                edited_event: None,
                #[cfg(feature = "scene-editing")]
                audio_root: String::new(),
                #[cfg(feature = "scene-editing")]
                audio_library: crate::audio::AudioLibraryView::default(),
                #[cfg(feature = "scene-editing")]
                animation_channels: vec![],
                #[cfg(feature = "scene-editing")]
                animation_fps: crate::animation::FPS,
                library: crate::library::LibraryView::default(),
            },
        }
    }
}

#[derive(Default)]
pub struct SessionState {
    document: Option<Document>,
    revision: u64,
    document_id: u64,
    logical_document_id: u64,
    #[cfg(feature = "scene-editing")]
    evaluation: Option<crate::evaluation::CachedEvaluation>,
    #[cfg(feature = "scene-editing")]
    next_pose_epoch: u64,
}
impl SessionState {
    /// Stamp every Session publication from the same authoritative counters.
    /// Document::summary alone intentionally carries zero sentinel identities.
    fn summary(&self) -> Option<ProjectSummary> {
        self.document.as_ref().map(|document| {
            let mut summary = document.summary();
            summary.revision = self.revision;
            summary.document_id = self.document_id;
            summary.logical_document_id = self.logical_document_id;
            summary
        })
    }
}
#[derive(Default)]
pub struct Session(Mutex<SessionState>);

pub struct SaveSnapshot {
    revision: u64,
    bytes: Vec<u8>,
    pub suggested_name: String,
    pub current_path: Option<PathBuf>,
    images: ImageBundle,
    missing_images: Vec<String>,
    source_directory: Option<PathBuf>,
    saved_project: Option<RegionProject>,
    write_images: bool,
    #[cfg(feature = "scene-editing")]
    audio: crate::audio::AudioBundle,
    #[cfg(feature = "scene-editing")]
    missing_audio: Vec<String>,
    #[cfg(feature = "scene-editing")]
    write_audio: bool,
}
impl Session {
    #[cfg(feature = "scene-editing")]
    pub fn prepare_runtime_export(
        &self,
        expected_revision: u64,
    ) -> Result<crate::runtime_export::RuntimeExportSnapshot, AppError> {
        let state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed before runtime export.",
            ));
        }
        let Some(Document::Editable {
            project,
            images,
            audio,
            ..
        }) = state.document.as_ref()
        else {
            return Err(AppError::new(
                "InspectionOnly",
                "Runtime export requires an editable project.",
            ));
        };
        // Keep the complete independent authoring codec guard in this route too.
        encode_regions(project)?;
        crate::runtime_export::snapshot(state.summary().unwrap(), images.clone(), audio.clone())
    }

    #[cfg(feature = "scene-editing")]
    pub fn write_runtime_export(
        &self,
        snapshot: crate::runtime_export::RuntimeExportSnapshot,
        parent: &Path,
    ) -> Result<crate::runtime_export::RuntimeExportResult, AppError> {
        let state = self.lock()?;
        if state.revision != snapshot.revision || state.document_id != snapshot.document_id {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed while choosing the runtime export destination.",
            ));
        }
        // Hold the revision lock through bounded writes. Export never marks saved.
        snapshot.write(parent)
    }

    pub fn import_image(
        &self,
        expected_revision: u64,
        bone: u64,
        path: &Path,
    ) -> Result<ProjectSummary, AppError> {
        let image = ImageAsset::read(path)?;
        let proposed = path.file_stem().and_then(|n| n.to_str()).unwrap_or("image");
        let mut state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed while importing the image.",
            ));
        }
        match state.document.as_mut() {
            Some(Document::Editable {
                project,
                images,
                rig,
                dirty,
                ..
            }) => {
                let mut cache = images.clone();
                let name = cache.unique_stem(proposed);
                cache.insert(name.clone(), image.clone())?;
                rig.apply(
                    project,
                    RigEdit::AddImage {
                        bone,
                        image: name.clone(),
                        path: name,
                        x: 0.0,
                        y: 0.0,
                        width: image.width as f32,
                        height: image.height as f32,
                    },
                )?;
                *images = cache;
                *dirty = rig.dirty(project);
            }
            _ => {
                return Err(AppError::new(
                    "InspectionOnly",
                    "Create or open an editable project first.",
                ))
            }
        }
        state.revision += 1;
        Ok(state.summary().unwrap())
    }
    pub fn select_images_folder(
        &self,
        expected_revision: u64,
        folder: &Path,
    ) -> Result<ProjectSummary, AppError> {
        self.load_images_folder(expected_revision, folder, None)
    }
    pub fn refresh_images_folder(
        &self,
        expected_revision: u64,
    ) -> Result<ProjectSummary, AppError> {
        let (root, directory) = {
            let state = self.lock()?;
            let Some(Document::Editable { project, path, .. }) = &state.document else {
                return Err(AppError::new(
                    "NoProject",
                    "Open an editable project first.",
                ));
            };
            (
                project.images_root.clone(),
                crate::library::directory(path.as_deref(), &project.images_root),
            )
        };
        self.load_images_folder(expected_revision, &directory, Some(root))
    }
    fn load_images_folder(
        &self,
        expected_revision: u64,
        folder: &Path,
        preserve_root: Option<String>,
    ) -> Result<ProjectSummary, AppError> {
        let (cache, warnings) = crate::library::scan(folder)?;
        let root = preserve_root.unwrap_or_else(|| folder.to_string_lossy().replace('\\', "/"));
        let mut state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed while selecting the image folder.",
            ));
        }
        let Some(Document::Editable {
            project,
            images,
            image_roots,
            library_warnings,
            rig,
            dirty,
            ..
        }) = state.document.as_mut()
        else {
            return Err(AppError::new(
                "NoProject",
                "Open an editable project first.",
            ));
        };
        let mut unique = std::collections::HashSet::new();
        let mut total = 0usize;
        for held in image_roots
            .iter()
            .filter(|(key, _)| *key != &root)
            .map(|(_, cache)| cache)
            .chain((project.images_root != root).then_some(&*images))
            .chain(std::iter::once(&cache))
        {
            for (_, asset) in held.entries() {
                if unique.insert(std::sync::Arc::as_ptr(asset)) {
                    total = total.saturating_add(asset.bytes().len());
                }
            }
        }
        if total > 256 * 1024 * 1024 {
            return Err(AppError::new("ImageCacheBudget","Image history exceeds 256 MiB. Save and reopen the project before choosing another large folder."));
        }
        image_roots.insert(project.images_root.clone(), images.clone());
        rig.apply(project, RigEdit::SetImagesRoot { path: root.clone() })?;
        *images = cache;
        *library_warnings = warnings;
        image_roots.insert(root, images.clone());
        *dirty = rig.dirty(project);
        state.revision += 1;
        state.document_id += 1;
        Ok(state.summary().unwrap())
    }
    pub fn place_image(
        &self,
        expected_revision: u64,
        key: &str,
        bone: u64,
        x: f32,
        y: f32,
    ) -> Result<ProjectSummary, AppError> {
        self.place_images(expected_revision, &[key.to_string()], bone, x, y)
    }
    pub fn place_images(
        &self,
        expected_revision: u64,
        keys: &[String],
        bone: u64,
        x: f32,
        y: f32,
    ) -> Result<ProjectSummary, AppError> {
        self.place_images_impl(expected_revision, keys, bone, x, y, None)
    }
    #[cfg(feature = "scene-editing")]
    pub fn place_images_in_pose(
        &self,
        expected_revision: u64,
        keys: &[String],
        bone: u64,
        x: f32,
        y: f32,
        pose_epoch: Option<u64>,
    ) -> Result<ProjectSummary, AppError> {
        self.place_images_impl(expected_revision, keys, bone, x, y, pose_epoch)
    }
    fn place_images_impl(
        &self,
        expected_revision: u64,
        keys: &[String],
        bone: u64,
        x: f32,
        y: f32,
        pose_epoch: Option<u64>,
    ) -> Result<ProjectSummary, AppError> {
        let mut state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed while placing the image.",
            ));
        }
        #[cfg(feature = "scene-editing")]
        let frozen_poses = Self::geometry_poses(&state, pose_epoch)?;
        #[cfg(not(feature = "scene-editing"))]
        let _ = pose_epoch;
        let Some(Document::Editable {
            project,
            images,
            rig,
            dirty,
            ..
        }) = state.document.as_mut()
        else {
            return Err(AppError::new(
                "NoProject",
                "Open an editable project first.",
            ));
        };
        #[cfg(feature = "scene-editing")]
        let slot_limit = fbones_format::minimal::scene::MAX_SCENE_SLOTS;
        #[cfg(not(feature = "scene-editing"))]
        let slot_limit = 128;
        if keys.is_empty() || keys.len() > 128 || project.slots.len() + keys.len() > slot_limit {
            return Err(AppError::new(
                "InvalidEdit",
                format!("Choose 1–128 images within the {slot_limit}-slot limit."),
            ));
        }
        let mut seen = std::collections::HashSet::new();
        let mut placements = Vec::with_capacity(keys.len());
        for key in keys {
            if !valid_image_stem(key) || !seen.insert(key) {
                return Err(AppError::new(
                    "InvalidImage",
                    "Choose distinct PNG entries from the Images folder.",
                ));
            }
            let image = images.get(key).ok_or_else(|| {
                AppError::new(
                    "MissingImage",
                    "Choose an image from the current Images folder.",
                )
            })?;
            placements.push(ImagePlacement {
                image: key.rsplit('/').next().unwrap_or(key).into(),
                path: key.clone(),
                x,
                y,
                width: image.width as f32,
                height: image.height as f32,
            });
        }
        // The first center is the drop point. Additional images occupy a grid in
        // world units, with a 16-unit gutter and at most four columns.
        let columns = ((placements.len() as f32).sqrt().ceil() as usize).min(4);
        let cell_width = placements.iter().map(|p| p.width).fold(0.0_f32, f32::max) + 16.0;
        let cell_height = placements.iter().map(|p| p.height).fold(0.0_f32, f32::max) + 16.0;
        for (index, item) in placements.iter_mut().enumerate() {
            item.x += (index % columns) as f32 * cell_width;
            item.y -= (index / columns) as f32 * cell_height;
        }
        #[cfg(feature = "scene-editing")]
        if let Some(world) = frozen_poses {
            let index = rig.history.frame().bone_index(bone)?;
            let inverse = world[index].inverse()?;
            let authored = crate::rig::poses(&project.rig.bones)[index];
            // AddImages keeps its existing setup-local creation contract.
            // Convert the whole world-space grid through the displayed frozen
            // owner first so that its local centers survive that helper intact.
            for item in &mut placements {
                let (x, y) = inverse.point(item.x, item.y);
                (item.x, item.y) = authored.point(x, y);
            }
        }
        rig.apply(
            project,
            RigEdit::AddImages {
                bone,
                images: placements,
            },
        )?;
        *dirty = rig.dirty(project);
        state.revision += 1;
        Ok(state.summary().unwrap())
    }
    #[cfg(not(feature = "scene-editing"))]
    fn traced_mesh(
        &self,
        expected_revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
    ) -> Result<(Box<fbones_format::minimal::meshes::Mesh>, TracePreview), AppError> {
        let (mut candidate, index, rig_ids, image, poses) = {
            let state = self.lock()?;
            if state.revision != expected_revision {
                return Err(AppError::new(
                    "ProjectChanged",
                    "The project changed before tracing.",
                ));
            }
            let Some(Document::Editable {
                project,
                images,
                rig,
                ..
            }) = &state.document
            else {
                return Err(AppError::new(
                    "NoProject",
                    "Open an editable project first.",
                ));
            };
            let ids = rig.slot_views(project, images);
            let index = ids.iter().position(|s| s.id == id).ok_or_else(|| {
                AppError::new("InvalidTrace", "Select an image attachment to trace.")
            })?;
            let attachment = project.slots[index].attachment.as_ref().ok_or_else(|| {
                AppError::new("InvalidTrace", "The slot has no image attachment.")
            })?;
            let image = images
                .get(image_stem(attachment))
                .cloned()
                .ok_or_else(|| AppError::new("MissingImage", "The source PNG is unavailable."))?;
            (
                project.clone(),
                index,
                rig.views(&project.rig.bones)
                    .into_iter()
                    .map(|b| b.id)
                    .collect::<Vec<_>>(),
                image,
                crate::rig::poses(&project.rig.bones),
            )
        };
        let geometry = crate::trace::trace_png(&image, options)?;
        let slot = &candidate.slots[index];
        let attachment = slot.attachment.as_ref().unwrap();
        let old = attachment
            .mesh()
            .cloned()
            .unwrap_or_else(|| crate::mesh::from_region(attachment, slot.bone));
        let replacement = Box::new(crate::mesh_edit::remesh(
            &old,
            geometry.uvs.clone(),
            geometry.triangles.clone(),
            geometry.edges.clone(),
            geometry.hull,
            &poses,
        )?);
        candidate.slots[index].attachment = Some(
            fbones_format::minimal::regions::Attachment::Mesh(replacement.clone()),
        );
        fbones_format::minimal::regions::encode_region_payload(&candidate)?;
        let mesh = crate::rig::MeshView {
            weighted: replacement.weighted,
            uvs: replacement.uvs.clone(),
            triangles: replacement.triangles.clone(),
            edges: replacement.edges.clone(),
            hull: replacement.hull,
            bones: replacement.bones.iter().map(|i| rig_ids[*i]).collect(),
            vertices: replacement
                .vertices
                .iter()
                .map(|v| crate::rig::VertexView {
                    weights: v.weights.clone(),
                    positions: v.positions.clone(),
                })
                .collect(),
        };
        let state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed while tracing. Preview again.",
            ));
        }
        Ok((
            replacement,
            TracePreview {
                slot_id: id,
                expected_revision,
                mesh,
                geometry,
            },
        ))
    }
    #[cfg(not(feature = "scene-editing"))]
    pub(crate) fn preview_trace(
        &self,
        expected_revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
    ) -> Result<TracePreview, AppError> {
        self.traced_mesh(expected_revision, id, options)
            .map(|(_, preview)| preview)
    }
    #[cfg(not(feature = "scene-editing"))]
    pub(crate) fn apply_trace(
        &self,
        expected_revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
    ) -> Result<ProjectSummary, AppError> {
        let (mesh, _) = self.traced_mesh(expected_revision, id, options)?;
        self.edit(expected_revision, RigEdit::ReplaceMesh { id, mesh })
    }
    pub fn image_data(&self, document_id: u64, name: &str) -> Result<String, AppError> {
        let state = self.lock()?;
        if state.document_id != document_id {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed while loading the image.",
            ));
        }
        if let Some(Document::Editable { images, .. }) = &state.document {
            return images
                .get(name)
                .map(|a| a.data_url())
                .ok_or_else(|| AppError::new("MissingImage", "The PNG resource is unavailable."));
        }
        Err(AppError::new(
            "NoProject",
            "Open an editable project first.",
        ))
    }
    fn lock(&self) -> Result<std::sync::MutexGuard<'_, SessionState>, AppError> {
        self.0
            .lock()
            .map_err(|_| AppError::new("Internal", "The project session is unavailable."))
    }
    pub fn summary(&self) -> Result<Option<ProjectSummary>, AppError> {
        let state = self.lock()?;
        Ok(state.summary())
    }
    pub fn replace(&self, document: Document, discard: bool) -> Result<ProjectSummary, AppError> {
        let mut state = self.lock()?;
        if !discard && state.document.as_ref().is_some_and(|d| d.summary().dirty) {
            return Err(AppError::new(
                "UnsavedChanges",
                "The current project has unsaved changes.",
            ));
        }
        let logical_document_id = state.logical_document_id.checked_add(1).ok_or_else(|| {
            AppError::new("Internal", "Logical document identity space exhausted.")
        })?;
        state.document = Some(document);
        state.logical_document_id = logical_document_id;
        state.document_id += 1;
        state.revision += 1;
        Ok(state.summary().unwrap())
    }
    pub fn close(&self, discard: bool) -> Result<(), AppError> {
        let mut state = self.lock()?;
        if !discard && state.document.as_ref().is_some_and(|d| d.summary().dirty) {
            return Err(AppError::new(
                "UnsavedChanges",
                "The current project has unsaved changes.",
            ));
        }
        state.document = None;
        state.revision += 1;
        Ok(())
    }
    pub fn prepare_save(&self, copy: bool) -> Result<SaveSnapshot, AppError> {
        let state = self.lock()?;
        let document = state
            .document
            .as_ref()
            .ok_or_else(|| AppError::new("NoProject", "Open or create a project first."))?;
        let mut saved_project = None;
        let mut write_images = false;
        #[cfg(feature = "scene-editing")]
        let mut audio_bundle = crate::audio::AudioBundle::default();
        #[cfg(feature = "scene-editing")]
        let mut missing_audio = vec![];
        #[cfg(feature = "scene-editing")]
        let mut write_audio = false;
        let (bytes, path, bundle, missing_images) = match document {
            Document::Editable {
                project,
                path,
                images,
                #[cfg(feature = "scene-editing")]
                audio,
                ..
            } => {
                #[cfg(feature = "scene-editing")]
                let names = crate::animation_sequence::all_image_keys(project)?;
                #[cfg(not(feature = "scene-editing"))]
                let names: Vec<String> = project_images(project)
                    .into_iter()
                    .map(|image| image_stem(image).to_owned())
                    .collect();
                let missing = names
                    .iter()
                    .filter(|n| images.get(n).is_none())
                    .map(|n| (*n).to_owned())
                    .collect();
                let bundle =
                    ImageBundle::collect(images.entries().map(|(key, _)| key.as_str()), images)?;
                let mut saved = (**project).clone();
                if copy
                    || path.as_ref().is_none_or(|p| {
                        !p.extension()
                            .is_some_and(|e| e.eq_ignore_ascii_case("fbones"))
                    })
                {
                    saved.images_root = "./images/".into();
                    #[cfg(feature = "scene-editing")]
                    {
                        saved.audio_root = "./audio".into();
                    }
                }
                write_images = matches!(
                    saved.images_root.as_str(),
                    "./images/" | "images/" | "images"
                );
                #[cfg(feature = "scene-editing")]
                {
                    audio_bundle = crate::audio::AudioBundle::collect(audio);
                    missing_audio = project
                        .events
                        .iter()
                        .filter(|e| !e.audio.is_empty() && audio.get(&e.audio).is_none())
                        .map(|e| e.audio.clone())
                        .collect();
                    write_audio = matches!(
                        saved.audio_root.as_str(),
                        "./audio" | "./audio/" | "audio" | "audio/"
                    );
                }
                #[cfg(feature = "scene-editing")]
                fbones_format::minimal::scene::normalize_wire_strings(&mut saved)?;
                let bytes = encode_regions(&saved)?;
                saved_project = Some(saved);
                (bytes, path.clone(), bundle, missing)
            }
            Document::Inspected { path, envelope } if copy => (
                envelope.original_bytes().to_vec(),
                Some(path.clone()),
                ImageBundle::default(),
                vec![],
            ),
            Document::Inspected { .. } => {
                return Err(AppError::new(
                    "InspectionOnly",
                    "Use Save a copy to preserve this project unchanged.",
                ))
            }
        };
        let stem = path
            .as_ref()
            .and_then(|p| p.file_stem())
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| document.summary().name);
        Ok(SaveSnapshot {
            revision: state.revision,
            bytes,
            images: bundle,
            missing_images,
            saved_project,
            write_images,
            #[cfg(feature = "scene-editing")]
            audio: audio_bundle,
            #[cfg(feature = "scene-editing")]
            missing_audio,
            #[cfg(feature = "scene-editing")]
            write_audio,
            source_directory: path.as_ref().and_then(|p| p.parent()).map(Path::to_owned),
            suggested_name: format!("{stem}.fbones"),
            current_path: path.filter(|p| {
                p.extension()
                    .is_some_and(|e| e.eq_ignore_ascii_case("fbones"))
            }),
        })
    }
    pub fn edit(&self, expected_revision: u64, edit: RigEdit) -> Result<ProjectSummary, AppError> {
        self.edit_impl(expected_revision, edit, None)
    }
    #[cfg(feature = "scene-editing")]
    pub fn edit_in_pose(
        &self,
        expected_revision: u64,
        pose_epoch: u64,
        edit: RigEdit,
    ) -> Result<ProjectSummary, AppError> {
        self.edit_impl(expected_revision, edit, Some(pose_epoch))
    }
    fn edit_impl(
        &self,
        expected_revision: u64,
        edit: RigEdit,
        pose_epoch: Option<u64>,
    ) -> Result<ProjectSummary, AppError> {
        let mut state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed. Try the bone edit again.",
            ));
        }
        #[cfg(feature = "scene-editing")]
        let edit = if matches!(&edit, RigEdit::SetAnimationDeformVertices { .. }) {
            Self::deform_vertex_edit(&state, pose_epoch, &edit)?
        } else {
            edit
        };
        #[cfg(feature = "scene-editing")]
        let authoring_frame = if let RigEdit::MatchTransform { id, .. } = &edit {
            Some(Self::authoring_evaluation(&state, pose_epoch, *id)?)
        } else {
            None
        };
        #[cfg(feature = "scene-editing")]
        let animation_key_epoch = if let Some(epoch) = pose_epoch {
            if matches!(
                &edit,
                RigEdit::SetAnimationKey { .. }
                    | RigEdit::SetAnimationKeys { .. }
                    | RigEdit::SetAnimationSlotKeys { .. }
                    | RigEdit::SetAnimationKeyBatch { .. }
                    | RigEdit::SetAnimationDrawOrderKeys { .. }
                    | RigEdit::SetAnimationDeformKeys { .. }
                    | RigEdit::SetAnimationConstraintKeys { .. }
                    | RigEdit::SetAnimationEventKeys { .. }
                    | RigEdit::SetAnimationSequenceKeys { .. }
            ) {
                Self::animation_key_context(&state, epoch, &edit)?;
                true
            } else {
                false
            }
        } else {
            false
        };
        #[cfg(feature = "scene-editing")]
        let geometry_poses = if RigHistory::geometry_edit(&edit) {
            Self::geometry_poses(&state, pose_epoch)?
        } else {
            if pose_epoch.is_some() && authoring_frame.is_none() && !animation_key_epoch {
                return Err(AppError::new(
                    "InvalidPose",
                    "An evaluated pose may only interpret geometry or constraint Match actions.",
                ));
            }
            None
        };
        #[cfg(not(feature = "scene-editing"))]
        let _ = pose_epoch;
        let document = state
            .document
            .as_mut()
            .ok_or_else(|| AppError::new("NoProject", "Open or create a project first."))?;
        let mut assets_changed = false;
        match document {
            Document::Editable {
                project,
                images,
                #[cfg(feature = "scene-editing")]
                audio,
                #[cfg(feature = "scene-editing")]
                audio_roots,
                #[cfg(feature = "scene-editing")]
                audio_warnings,
                image_roots,
                library_warnings,
                path,
                rig,
                dirty,
                ..
            } => {
                #[cfg(feature = "scene-editing")]
                if let RigEdit::SetAttachmentImagePath {
                    id,
                    path: image_path,
                } = &edit
                {
                    let image = rig
                        .history
                        .frame()
                        .attachment(*id)?
                        .image()
                        .ok_or_else(|| {
                            AppError::new("InvalidImage", "Clipping has no image path.")
                        })?;
                    let key = if image_path.is_empty() {
                        &image.name
                    } else {
                        image_path
                    };
                    if !valid_image_stem(key) {
                        return Err(AppError::new(
                            "InvalidImage",
                            "Choose a portable PNG key from Images.",
                        ));
                    }
                    let address = rig.history.frame().attachment_address(*id)?;
                    let keys = if let Some(settings) =
                        crate::animation_sequence::settings(project, address)
                    {
                        (0..settings.count)
                            .map(|index| {
                                crate::animation_sequence::frame_path(key, settings, index)
                            })
                            .collect::<Result<Vec<_>, _>>()?
                    } else {
                        vec![key.to_owned()]
                    };
                    if keys.iter().any(|key| images.get(key).is_none()) {
                        return Err(AppError::new(
                            "MissingImage",
                            "Every referenced PNG must exist in the loaded Images folder.",
                        ));
                    }
                }
                #[cfg(feature = "scene-editing")]
                let before_audio = project.audio_root.clone();
                #[cfg(feature = "scene-editing")]
                let selected_audio = if let RigEdit::SetAudioRoot { path: root } = &edit {
                    Some(crate::audio::scan(&crate::library::directory(
                        path.as_deref(),
                        root,
                    ))?)
                } else {
                    None
                };
                #[cfg(feature = "scene-editing")]
                if let Some((incoming, _)) = &selected_audio {
                    let root = if let RigEdit::SetAudioRoot { path } = &edit {
                        path
                    } else {
                        unreachable!()
                    };
                    let mut seen = std::collections::HashSet::new();
                    let mut total = 0usize;
                    for cache in audio_roots
                        .iter()
                        .filter(|(key, _)| *key != root)
                        .map(|(_, c)| c)
                        .chain((project.audio_root != *root).then_some(&*audio))
                        .chain(std::iter::once(incoming))
                    {
                        for (_, asset) in cache.entries() {
                            if seen.insert(std::sync::Arc::as_ptr(asset)) {
                                total = total.saturating_add(asset.bytes().len());
                            }
                        }
                    }
                    if total > 128 * 1024 * 1024 {
                        return Err(AppError::new("AudioCacheBudget","Audio history exceeds128MiB. Save and reopen before choosing another large folder."));
                    }
                }
                let before = project.images_root.clone();
                let selected = if let RigEdit::SetImagesRoot { path: root } = &edit {
                    Some(if let Some(cache) = image_roots.get(root) {
                        (cache.clone(), vec![])
                    } else {
                        crate::library::scan(&crate::library::directory(path.as_deref(), root))?
                    })
                } else {
                    None
                };
                #[cfg(feature = "scene-editing")]
                let changed = if let RigEdit::MatchTransform { id, section } = edit {
                    rig.match_transform(
                        project,
                        id,
                        section,
                        authoring_frame
                            .as_ref()
                            .expect("Match validated its native context"),
                    )?
                } else {
                    rig.apply_in_pose(project, edit, geometry_poses)?
                };
                #[cfg(not(feature = "scene-editing"))]
                let changed = rig.apply(project, edit)?;
                if project.images_root != before {
                    assets_changed = true;
                    image_roots.insert(before, images.clone());
                    let (cache, warnings) = selected
                        .or_else(|| {
                            image_roots
                                .get(&project.images_root)
                                .map(|c| (c.clone(), vec![]))
                        })
                        .unwrap_or_else(|| {
                            (
                                ImageCache::default(),
                                vec!["The images folder is not loaded. Select it again.".into()],
                            )
                        });
                    *images = cache;
                    *library_warnings = warnings;
                }
                #[cfg(feature = "scene-editing")]
                if project.audio_root != before_audio || selected_audio.is_some() {
                    assets_changed = true;
                    audio_roots.insert(before_audio, audio.clone());
                    let (cache, warnings) = selected_audio
                        .or_else(|| {
                            audio_roots
                                .get(&project.audio_root)
                                .map(|c| (c.clone(), vec![]))
                        })
                        .unwrap_or_else(|| {
                            (
                                crate::audio::AudioCache::default(),
                                vec!["The audio folder is not loaded. Select it again.".into()],
                            )
                        });
                    *audio = cache;
                    *audio_warnings = warnings;
                    audio_roots.insert(project.audio_root.clone(), audio.clone());
                }
                *dirty = rig.dirty(project);
                if changed {
                    state.revision += 1;
                }
            }
            Document::Inspected { .. } => {
                return Err(AppError::new(
                    "InspectionOnly",
                    "This project is inspection-only.",
                ))
            }
        }
        if assets_changed {
            state.document_id += 1;
        }
        Ok(state.summary().unwrap())
    }
    pub fn save_snapshot(
        &self,
        snapshot: SaveSnapshot,
        path: PathBuf,
    ) -> Result<ProjectSummary, AppError> {
        let mut state = self.lock()?;
        if state.revision != snapshot.revision || state.document.is_none() {
            return Err(AppError::new("ProjectChanged", "The project changed while the save dialog was open. Save the current project again."));
        }
        // Keep the session locked through replacement: an older save must not
        // overwrite a newer project or clear another document's dirty flag.
        if !path
            .extension()
            .is_some_and(|e| e.eq_ignore_ascii_case("fbones"))
        {
            return Err(AppError::new(
                "InvalidFile",
                "Save with the .fbones extension.",
            ));
        }
        if !snapshot.missing_images.is_empty() {
            let target_parent = path.parent().unwrap_or(Path::new("."));
            let same_directory = matches!((snapshot.source_directory.as_ref().and_then(|p| p.canonicalize().ok()), target_parent.canonicalize().ok()), (Some(source), Some(target)) if source == target);
            if !same_directory {
                return Err(AppError::new("MissingImage", "Some PNG resources are missing; restore them before saving to a different folder."));
            }
        }
        #[cfg(feature = "scene-editing")]
        if !snapshot.missing_audio.is_empty() {
            return Err(AppError::new(
                "MissingAudio",
                "Restore every referenced supported WAV before saving this editable project.",
            ));
        }
        #[cfg(feature = "scene-editing")]
        let resource_rebase = match (state.document.as_ref(), snapshot.saved_project.as_ref()) {
            (Some(Document::Editable { project, rig, .. }), Some(saved)) => {
                Some(rig.prepare_resource_rebase(
                    &project.images_root,
                    &saved.images_root,
                    &project.audio_root,
                    &saved.audio_root,
                )?)
            }
            _ => None,
        };
        if snapshot.write_images {
            snapshot.images.write_to(&path)?;
        }
        #[cfg(feature = "scene-editing")]
        if snapshot.write_audio {
            snapshot.audio.write_to(&path)?;
        }
        write_copy(&path, &snapshot.bytes)?;
        if let Some(Document::Editable {
            path: current_path,
            dirty,
            compressed_bytes,
            decoded_bytes,
            project,
            rig,
            images,
            image_roots,
            #[cfg(feature = "scene-editing")]
            audio,
            #[cfg(feature = "scene-editing")]
            audio_roots,
            ..
        }) = state.document.as_mut()
        {
            if let Some(saved) = snapshot.saved_project {
                #[cfg(not(feature = "scene-editing"))]
                rig.rebase_images_root(&project.images_root, &saved.images_root);
                #[cfg(feature = "scene-editing")]
                {
                    if let Some(plan) = resource_rebase {
                        rig.apply_resource_rebase(plan);
                    }
                    audio_roots.insert(saved.audio_root.clone(), audio.clone());
                }
                **project = saved;
                image_roots.insert(project.images_root.clone(), images.clone());
            }
            let envelope = ProjectEnvelope::inspect(snapshot.bytes)?;
            *current_path = Some(path);
            *dirty = false;
            *compressed_bytes = Some(envelope.original_bytes().len());
            *decoded_bytes = Some(envelope.decoded_bytes());
            rig.mark_saved(project);
        }
        state.revision += 1;
        Ok(state.summary().unwrap())
    }
}

pub fn new_document(name: String) -> Result<Document, AppError> {
    let name = name.trim();
    let stem = name
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    let reserved = matches!(stem.as_str(), "con" | "prn" | "aux" | "nul")
        || ((stem.starts_with("com") || stem.starts_with("lpt"))
            && stem.len() == 4
            && matches!(stem.as_bytes()[3], b'1'..=b'9'));
    if name.is_empty()
        || name.chars().count() > 120
        || name.ends_with('.')
        || reserved
        || name
            .chars()
            .any(|c| c.is_control() || "/\\:*?\"<>|".contains(c))
    {
        return Err(AppError::new(
            "InvalidName",
            "Use a project name of 1–120 characters without file path characters.",
        ));
    }
    // The same independent identity generation used by accepted Windows cases.
    let identity = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| {
            AppError::new(
                "Clock",
                "The system clock could not provide a project identity.",
            )
        })?
        .as_nanos()
        .to_be_bytes();
    let project = RegionProject {
        #[cfg(feature = "scene-editing")]
        wire: None,
        #[cfg(feature = "scene-editing")]
        fps: 30.,
        #[cfg(feature = "scene-editing")]
        audio_root: "./audio".into(),
        #[cfg(feature = "scene-editing")]
        editor_flag_53: false,
        #[cfg(feature = "scene-editing")]
        events: vec![],
        #[cfg(feature = "scene-editing")]
        animations: vec![fbones_format::minimal::scene::Animation::new(
            "animation".into(),
        )],
        images_root: "./images/".into(),
        rig: MinimalProject::new(name.into(), identity),
        slots: vec![],
        #[cfg(not(feature = "scene-editing"))]
        region_order: vec![],
        #[cfg(feature = "scene-editing")]
        attachment_order: vec![],
        #[cfg(feature = "scene-editing")]
        attachment_sequences: vec![],
        #[cfg(feature = "scene-editing")]
        attachment_colors: vec![],
        #[cfg(feature = "scene-editing")]
        slot_dark_colors: vec![],
        #[cfg(feature = "scene-editing")]
        constraints: vec![],
    };
    let rig = Box::new(RigHistory::new(&project, false));
    Ok(Document::Editable {
        images: ImageCache::default(),
        image_roots: BTreeMap::new(),
        #[cfg(feature = "scene-editing")]
        audio: crate::audio::AudioCache::default(),
        #[cfg(feature = "scene-editing")]
        audio_roots: BTreeMap::new(),
        #[cfg(feature = "scene-editing")]
        audio_warnings: vec![],
        library_warnings: vec![],
        project: Box::new(project),
        rig,
        path: None,
        dirty: true,
        compressed_bytes: None,
        decoded_bytes: None,
    })
}

pub fn open_document(path: PathBuf) -> Result<Document, AppError> {
    open_document_profile(path, true)
}

fn open_document_profile(path: PathBuf, allow_regions: bool) -> Result<Document, AppError> {
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("fbones") && !extension.eq_ignore_ascii_case("spine") {
        return Err(AppError::new(
            "InvalidFile",
            "Choose a .fbones or .spine project.",
        ));
    }
    let mut bytes = Vec::new();
    File::open(&path)?
        .take(MAX_FILE_BYTES as u64 + 1)
        .read_to_end(&mut bytes)?;
    let envelope = ProjectEnvelope::inspect(bytes)?;
    let payload = envelope.decoded_payload()?;
    match decode_regions(&payload) {
        Ok(project) => {
            #[cfg(feature = "scene-editing")]
            if crate::scene_edit::check_active_clipping(&project).is_err() {
                return Ok(Document::Inspected { path, envelope });
            }
            // Only explicitly supported portable resources become editable.
            if !allow_regions && !project.slots.is_empty() {
                return Ok(Document::Inspected { path, envelope });
            }
            let directory = crate::library::directory(Some(&path), &project.images_root);
            let (images, library_warnings) = match crate::library::scan(&directory) {
                Ok(result) => result,
                Err(error) => (ImageCache::default(), vec![error.message]),
            };
            let mut names = std::collections::HashMap::new();
            #[cfg(feature = "scene-editing")]
            let image_names = match crate::animation_sequence::all_image_keys(&project) {
                Ok(names) => names,
                Err(_) => return Ok(Document::Inspected { path, envelope }),
            };
            #[cfg(not(feature = "scene-editing"))]
            let image_names = project_images(&project)
                .into_iter()
                .map(|image| image_stem(image).to_owned())
                .collect::<Vec<_>>();
            for name in &image_names {
                if !valid_image_stem(name)
                    || names
                        .get(&name.to_lowercase())
                        .is_some_and(|previous| *previous != name)
                {
                    return Ok(Document::Inspected { path, envelope });
                }
                names.insert(name.to_lowercase(), name);
            }
            #[cfg(feature = "scene-editing")]
            let (audio, audio_warnings) =
                crate::audio::scan(&crate::library::directory(Some(&path), &project.audio_root))
                    .unwrap_or_else(|e| (crate::audio::AudioCache::default(), vec![e.message]));
            let rig = Box::new(RigHistory::new(&project, true));
            Ok(Document::Editable {
                project: Box::new(project),
                images,
                image_roots: BTreeMap::new(),
                library_warnings,
                #[cfg(feature = "scene-editing")]
                audio,
                #[cfg(feature = "scene-editing")]
                audio_roots: BTreeMap::new(),
                #[cfg(feature = "scene-editing")]
                audio_warnings,
                rig,
                path: Some(path),
                dirty: false,
                compressed_bytes: Some(envelope.original_bytes().len()),
                decoded_bytes: Some(envelope.decoded_bytes()),
            })
        }
        Err(FormatError::UnsupportedProfile) => Ok(Document::Inspected { path, envelope }),
        Err(error) => Err(error.into()),
    }
}

pub fn write_copy(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    if !path
        .extension()
        .is_some_and(|e| e.eq_ignore_ascii_case("fbones"))
    {
        return Err(AppError::new(
            "InvalidFile",
            "Save with the .fbones extension.",
        ));
    }
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
    temporary.write_all(bytes)?;
    temporary.as_file_mut().sync_all()?;
    temporary
        .persist(path)
        .map_err(|e| AppError::from(e.error))?;
    Ok(())
}

#[cfg(all(test, not(feature = "scene-editing")))]
mod tests {
    use super::*;
    use fbones_format::{encode_envelope, minimal::encode_minimal_payload};
    #[test]
    fn image_batch_is_one_revision_and_history_step_with_atomic_failures_and_persistence() {
        let source = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        std::fs::create_dir(source.path().join("parts")).unwrap();
        let png = crate::images::tests::png([20, 40, 60, 255]);
        for name in ["arm.png", "parts/hand.png"] {
            std::fs::write(source.path().join(name), &png).unwrap();
        }
        let session = Session::default();
        let initial = session
            .replace(new_document("batch".into()).unwrap(), false)
            .unwrap();
        let selected = session
            .select_images_folder(initial.revision, source.path())
            .unwrap();
        let target = session
            .edit(
                selected.revision,
                RigEdit::Create {
                    parent: 0,
                    x: 30.0,
                    y: 20.0,
                    rotation: 90.0,
                    length: 40.0,
                    color: None,
                },
            )
            .unwrap();
        let bone = target.edited_bone.unwrap();
        let keys = vec!["arm".into(), "parts/hand".into()];
        for invalid_keys in [
            vec!["arm".into(), "missing".into()],
            vec!["arm".into(), "arm".into()],
            vec![],
        ] {
            assert!(session
                .place_images(target.revision, &invalid_keys, bone, 10.0, -15.0)
                .is_err());
            let after = session.summary().unwrap().unwrap();
            assert_eq!(after.revision, target.revision);
            assert!(after.slots.is_empty());
        }
        assert!(session
            .place_images(initial.revision, &keys, bone, 10.0, -15.0)
            .is_err());
        assert!(session
            .place_images(target.revision, &keys, 999, 10.0, -15.0)
            .is_err());
        assert!(session
            .place_images(target.revision, &keys, bone, f32::NAN, -15.0)
            .is_err());
        let placed = session
            .place_images(target.revision, &keys, bone, 10.0, -15.0)
            .unwrap();
        assert_eq!(placed.revision, target.revision + 1);
        assert_eq!(placed.slots.len(), 2);
        assert!(placed.slots.iter().all(|slot| slot.bone == bone));
        assert_ne!(placed.slots[0].id, placed.slots[1].id);
        let r = placed.slots[0].region.as_ref().unwrap();
        assert!((r.x + 35.0).abs() < 1e-4 && (r.y - 20.0).abs() < 1e-4);
        let ids: Vec<_> = placed.slots.iter().map(|s| s.id).collect();
        let undo = session.edit(placed.revision, RigEdit::Undo).unwrap();
        assert!(undo.slots.is_empty());
        assert_eq!(undo.bones.len(), 2);
        let redo = session.edit(undo.revision, RigEdit::Redo).unwrap();
        assert_eq!(redo.slots.iter().map(|s| s.id).collect::<Vec<_>>(), ids);
        let path = output.path().join("batch.fbones");
        session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        session.close(false).unwrap();
        let reopened = session
            .replace(open_document(path).unwrap(), false)
            .unwrap();
        assert_eq!(reopened.slots.len(), 2);
        assert_eq!(
            reopened.slots[1].region.as_ref().unwrap().image,
            "parts/hand"
        );
        assert!(reopened.slots.iter().all(|s| s.image_available));
    }
    #[test]
    fn image_folder_browsing_placement_portable_save_and_unplaced_assets_roundtrip() {
        let source = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        std::fs::create_dir(source.path().join("parts")).unwrap();
        let bytes = crate::images::tests::png([10, 20, 30, 255]);
        std::fs::write(source.path().join("parts/arm.png"), &bytes).unwrap();
        std::fs::write(source.path().join("unused.png"), &bytes).unwrap();
        let session = Session::default();
        let initial = session
            .replace(new_document("library".into()).unwrap(), false)
            .unwrap();
        let selected = session
            .select_images_folder(initial.revision, source.path())
            .unwrap();
        assert!(selected.slots.is_empty());
        assert_eq!(selected.library.images.len(), 2);
        assert_ne!(selected.document_id, initial.document_id);
        let placed = session
            .place_image(selected.revision, "parts/arm", 0, 25.0, -35.0)
            .unwrap();
        assert_eq!(placed.slots.len(), 1);
        let r = placed.slots[0].region.as_ref().unwrap();
        assert_eq!(r.image, "parts/arm");
        assert_eq!((r.x, r.y), (25.0, -35.0));
        let path = output.path().join("library.fbones");
        let saved = session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        assert!(!saved.dirty);
        assert_eq!(saved.library.root, "./images/");
        assert_eq!(
            std::fs::read(output.path().join("images/parts/arm.png")).unwrap(),
            bytes
        );
        assert!(output.path().join("images/unused.png").is_file());
        assert!(!source.path().join("images").exists());
        session.close(false).unwrap();
        let reopened = session
            .replace(open_document(path).unwrap(), false)
            .unwrap();
        assert_eq!(reopened.library.images.len(), 2);
        assert_eq!(reopened.slots.len(), 1);
        assert!(reopened.slots[0].image_available);
        assert_eq!(
            reopened.slots[0].region.as_ref().unwrap().image,
            "parts/arm"
        );
    }
    #[test]
    fn switching_image_folders_invalidates_textures_and_undo_restores_the_matching_cache() {
        let a = tempfile::tempdir().unwrap();
        let b = tempfile::tempdir().unwrap();
        std::fs::write(
            a.path().join("arm.png"),
            crate::images::tests::png([200, 0, 0, 255]),
        )
        .unwrap();
        std::fs::write(
            b.path().join("arm.png"),
            crate::images::tests::png([0, 0, 200, 255]),
        )
        .unwrap();
        let session = Session::default();
        let initial = session
            .replace(new_document("folders".into()).unwrap(), false)
            .unwrap();
        let first = session
            .select_images_folder(initial.revision, a.path())
            .unwrap();
        let red = session.image_data(first.document_id, "arm").unwrap();
        let second = session
            .select_images_folder(first.revision, b.path())
            .unwrap();
        assert_ne!(second.document_id, first.document_id);
        assert_ne!(session.image_data(second.document_id, "arm").unwrap(), red);
        assert!(session.image_data(first.document_id, "arm").is_err());
        let undo = session.edit(second.revision, RigEdit::Undo).unwrap();
        assert_ne!(undo.document_id, second.document_id);
        assert_eq!(session.image_data(undo.document_id, "arm").unwrap(), red);
        assert!(undo.slots.is_empty());
        assert!(session
            .select_images_folder(initial.revision, b.path())
            .is_err());
        assert_eq!(session.image_data(undo.document_id, "arm").unwrap(), red);
    }
    #[test]
    fn portable_save_rebases_unrelated_history_without_reviving_deleted_source_folder() {
        let source = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        std::fs::write(
            source.path().join("arm.png"),
            crate::images::tests::png([1, 2, 3, 255]),
        )
        .unwrap();
        let session = Session::default();
        let new = session
            .replace(new_document("portable".into()).unwrap(), false)
            .unwrap();
        let chosen = session
            .select_images_folder(new.revision, source.path())
            .unwrap();
        let placed = session
            .place_image(chosen.revision, "arm", 0, 0.0, 0.0)
            .unwrap();
        let edited = session
            .edit(
                placed.revision,
                RigEdit::Create {
                    parent: 0,
                    x: 0.0,
                    y: 0.0,
                    rotation: 0.0,
                    length: 12.0,
                    color: None,
                },
            )
            .unwrap();
        let path = output.path().join("portable.fbones");
        let saved = session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        assert_eq!(saved.revision, edited.revision + 1);
        std::fs::remove_dir_all(source.path()).unwrap();
        let undo = session.edit(saved.revision, RigEdit::Undo).unwrap();
        assert_eq!(undo.library.root, "./images/");
        assert!(undo.slots[0].image_available);
        session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        session.close(false).unwrap();
        assert!(
            session
                .replace(open_document(path).unwrap(), false)
                .unwrap()
                .slots[0]
                .image_available
        );
    }
    #[test]
    fn saving_editable_spine_to_fbones_copies_custom_relative_library_without_modifying_source() {
        let source = tempfile::tempdir().unwrap();
        let target = tempfile::tempdir().unwrap();
        std::fs::create_dir(source.path().join("art")).unwrap();
        std::fs::write(
            source.path().join("art/unused.png"),
            crate::images::tests::png([2, 4, 8, 255]),
        )
        .unwrap();
        let project = RegionProject {
            rig: MinimalProject::new("source".into(), [13; 16]),
            images_root: "./art/".into(),
            slots: vec![],
            region_order: vec![],
        };
        let bytes = encode_regions(&project).unwrap();
        let original = source.path().join("source.spine");
        std::fs::write(&original, &bytes).unwrap();
        let session = Session::default();
        let opened = session
            .replace(open_document(original.clone()).unwrap(), false)
            .unwrap();
        assert_eq!(opened.library.images.len(), 1);
        let dest = target.path().join("saved.fbones");
        let saved = session
            .save_snapshot(session.prepare_save(false).unwrap(), dest.clone())
            .unwrap();
        assert_eq!(saved.library.root, "./images/");
        assert!(target.path().join("images/unused.png").is_file());
        assert_eq!(std::fs::read(original).unwrap(), bytes);
        session.close(false).unwrap();
        assert_eq!(
            session
                .replace(open_document(dest).unwrap(), false)
                .unwrap()
                .library
                .images
                .len(),
            1
        );
    }
    fn trace_png_fixture() -> Vec<u8> {
        let mut bytes = vec![];
        {
            let mut encoder = png::Encoder::new(&mut bytes, 32, 32);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().unwrap();
            let mut pixels = vec![0; 32 * 32 * 4];
            for y in 2..30 {
                for x in 2..30 {
                    let i = (y * 32 + x) * 4;
                    pixels[i] = if x < 16 { 240 } else { 20 };
                    pixels[i + 1] = 100;
                    pixels[i + 2] = 50;
                    pixels[i + 3] = if (8..24).contains(&x) && (8..24).contains(&y) {
                        255
                    } else {
                        35
                    };
                }
            }
            writer.write_image_data(&pixels).unwrap();
        }
        bytes
    }
    #[test]
    fn trace_preview_is_transient_and_apply_is_one_persistent_undo_step() {
        let source = tempfile::tempdir().unwrap();
        std::fs::write(source.path().join("sprite.png"), trace_png_fixture()).unwrap();
        let session = Session::default();
        let initial = session
            .replace(new_document("trace".into()).unwrap(), false)
            .unwrap();
        let selected = session
            .select_images_folder(initial.revision, source.path())
            .unwrap();
        let placed = session
            .place_image(selected.revision, "sprite", 0, 0.0, 0.0)
            .unwrap();
        let id = placed.slots[0].id;
        let low = crate::trace::TraceOptions {
            alpha_threshold: 0,
            spacing: 8.0,
            ..Default::default()
        };
        let strong = crate::trace::TraceOptions {
            alpha_threshold: 80,
            inner: true,
            spacing: 8.0,
            inner_spacing: 6.0,
            ..Default::default()
        };
        let outer = session.preview_trace(placed.revision, id, low).unwrap();
        let preview = session.preview_trace(placed.revision, id, strong).unwrap();
        let span = |uvs: &[f32]| {
            let xs: Vec<_> = uvs.iter().step_by(2).copied().collect();
            xs.iter().copied().fold(f32::NEG_INFINITY, f32::max)
                - xs.iter().copied().fold(f32::INFINITY, f32::min)
        };
        assert!(span(&preview.mesh.uvs) < span(&outer.mesh.uvs));
        assert_eq!(
            session.summary().unwrap().unwrap().revision,
            placed.revision
        );
        assert!(session.summary().unwrap().unwrap().slots[0].mesh.is_none());
        let applied = session.apply_trace(placed.revision, id, strong).unwrap();
        assert!(applied.slots[0].mesh.is_some());
        let geometry = applied.slots[0].mesh.clone();
        let undo = session.edit(applied.revision, RigEdit::Undo).unwrap();
        assert!(undo.slots[0].mesh.is_none());
        let redo = session.edit(undo.revision, RigEdit::Redo).unwrap();
        assert_eq!(redo.slots[0].mesh, geometry);
        let path = source.path().join("trace.fbones");
        session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        session.close(false).unwrap();
        let reopened = session
            .replace(open_document(path).unwrap(), false)
            .unwrap();
        assert_eq!(reopened.slots[0].mesh, geometry);
        assert!(session.apply_trace(placed.revision, id, strong).is_err());
    }
    #[test]
    fn weighted_mesh_bindings_survive_bone_reorder_delete_undo_and_binary_save() {
        let temp = tempfile::tempdir().unwrap();
        let input = temp.path().join("image.png");
        std::fs::write(&input, crate::images::tests::png([1, 2, 3, 255])).unwrap();
        let session = Session::default();
        let summary = session
            .replace(new_document("rig".into()).unwrap(), false)
            .unwrap();
        let mut summary = session.import_image(summary.revision, 0, &input).unwrap();
        let slot = summary.slots[0].id;
        for (x, rotation) in [(20.0, 25.0), (-30.0, -20.0)] {
            summary = session
                .edit(
                    summary.revision,
                    RigEdit::Create {
                        color: None,
                        parent: 0,
                        x,
                        y: 0.0,
                        rotation,
                        length: 50.0,
                    },
                )
                .unwrap();
        }
        let (a, b) = (summary.bones[1].id, summary.bones[2].id);
        summary = session
            .edit(summary.revision, RigEdit::ConvertMesh { id: slot })
            .unwrap();
        summary = session
            .edit(
                summary.revision,
                RigEdit::BindMesh {
                    id: slot,
                    bones: vec![0, a, b],
                },
            )
            .unwrap();
        summary = session
            .edit(
                summary.revision,
                RigEdit::AddVertex {
                    id: slot,
                    x: 0.0,
                    y: 0.0,
                    edge_a: None,
                    edge_b: None,
                },
            )
            .unwrap();
        assert_eq!(summary.slots[0].mesh.as_ref().unwrap().vertices.len(), 5);
        summary = session
            .edit(
                summary.revision,
                RigEdit::SetWeight {
                    id: slot,
                    vertex: 0,
                    bone: a,
                    value: 0.75,
                },
            )
            .unwrap();
        let prior = summary.slots[0].mesh.clone();
        let stale_revision = summary.revision;
        let invalid: RigEdit = serde_json::from_value(serde_json::json!({"type":"paintWeights","id":slot,"bone":a,"changes":[{"vertex":0,"value":0.2},{"vertex":999,"value":0.8}]})).unwrap();
        assert!(session.edit(stale_revision, invalid).is_err());
        assert_eq!(session.summary().unwrap().unwrap().revision, stale_revision);
        assert_eq!(session.summary().unwrap().unwrap().slots[0].mesh, prior);
        let paint: RigEdit = serde_json::from_value(serde_json::json!({"type":"paintWeights","id":slot,"bone":a,"changes":[{"vertex":0,"value":0.2},{"vertex":1,"value":0.8}]})).unwrap();
        summary = session.edit(summary.revision, paint).unwrap();
        assert!(
            (summary.slots[0].mesh.as_ref().unwrap().vertices[0].weights[1] - 0.2).abs() < 1e-6
        );
        assert!(
            (summary.slots[0].mesh.as_ref().unwrap().vertices[1].weights[1] - 0.8).abs() < 1e-6
        );
        summary = session.edit(summary.revision, RigEdit::Undo).unwrap();
        assert_eq!(summary.slots[0].mesh, prior);
        let drag: RigEdit = serde_json::from_value(serde_json::json!({"type":"moveVertices","id":slot,"vertices":[{"vertex":0,"x":-2.0,"y":3.0},{"vertex":1,"x":2.0,"y":3.0}]})).unwrap();
        summary = session.edit(summary.revision, drag).unwrap();
        assert_ne!(summary.slots[0].mesh, prior);
        summary = session.edit(summary.revision, RigEdit::Undo).unwrap();
        assert_eq!(summary.slots[0].mesh, prior);
        summary = session
            .edit(summary.revision, RigEdit::Reparent { id: a, parent: b })
            .unwrap();
        assert_eq!(summary.slots[0].mesh.as_ref().unwrap().bones, [0, a, b]);
        summary = session
            .edit(
                summary.revision,
                RigEdit::Move {
                    id: a,
                    x: 80.0,
                    y: 10.0,
                },
            )
            .unwrap();
        let current_model = || {
            let state = session.lock().unwrap();
            let Some(Document::Editable { project, .. }) = &state.document else {
                panic!("No editable rig")
            };
            (**project).clone()
        };
        let before = current_model();
        let points = crate::mesh::world_vertices(
            before.slots[0].attachment.as_ref().unwrap().mesh().unwrap(),
            &crate::rig::poses(&before.rig.bones),
        );
        summary = session
            .edit(summary.revision, RigEdit::Delete { id: b })
            .unwrap();
        assert_eq!(summary.slots[0].mesh.as_ref().unwrap().bones, [0]);
        let after = current_model();
        let after_points = crate::mesh::world_vertices(
            after.slots[0].attachment.as_ref().unwrap().mesh().unwrap(),
            &crate::rig::poses(&after.rig.bones),
        );
        for (a, b) in points.iter().zip(after_points) {
            assert!((a[0] - b[0]).abs() < 0.001 && (a[1] - b[1]).abs() < 0.001);
        }
        session.edit(summary.revision, RigEdit::Undo).unwrap();
        assert_eq!(current_model(), before);
        let path = temp.path().join("rig.fbones");
        let saved = session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        assert!(!saved.dirty);
        let payload = ProjectEnvelope::inspect(std::fs::read(&path).unwrap())
            .unwrap()
            .decoded_payload()
            .unwrap();
        assert_eq!(decode_regions(&payload).unwrap(), before);
        assert!(temp.path().join("images/image.png").is_file());
        session.close(false).unwrap();
        let reopened = open_document(path).unwrap().summary();
        assert!(reopened.can_save && !reopened.inspection_only);
        assert!(reopened.slots[0].mesh.as_ref().unwrap().weighted);
    }
    #[test]
    fn png_import_save_reopen_history_and_save_as_keep_resources_and_bindings() {
        let temp = tempfile::tempdir().unwrap();
        let input = temp.path().join("arm.png");
        let png = crate::images::tests::png([10, 20, 30, 255]);
        std::fs::write(&input, &png).unwrap();
        let session = Session::default();
        let initial = session
            .replace(new_document("rig".into()).unwrap(), false)
            .unwrap();
        let imported = session.import_image(initial.revision, 0, &input).unwrap();
        assert_eq!(imported.slots.len(), 1);
        assert!(imported.slots[0].image_available);
        assert!(session
            .image_data(imported.document_id, "arm")
            .unwrap()
            .starts_with("data:image/png;base64,"));
        assert!(session.image_data(imported.document_id + 1, "arm").is_err());
        let project = temp.path().join("rig.fbones");
        let saved = session
            .save_snapshot(session.prepare_save(false).unwrap(), project.clone())
            .unwrap();
        assert!(!saved.dirty);
        assert_eq!(
            std::fs::read(temp.path().join("images/arm.png")).unwrap(),
            png
        );
        let directory = tempfile::tempdir().unwrap();
        session
            .save_snapshot(
                session.prepare_save(false).unwrap(),
                directory.path().join("copy.fbones"),
            )
            .unwrap();
        assert_eq!(
            std::fs::read(directory.path().join("images/arm.png")).unwrap(),
            png
        );
        session.close(false).unwrap();
        let opened = session
            .replace(open_document_profile(project.clone(), true).unwrap(), false)
            .unwrap();
        assert_eq!(opened.slots.len(), 1);
        assert!(opened.slots[0].image_available);
        let snapshot = session.prepare_save(false).unwrap();
        let edited = session
            .edit(
                opened.revision,
                RigEdit::DeleteSlot {
                    id: opened.slots[0].id,
                },
            )
            .unwrap();
        assert!(edited.slots.is_empty() && edited.dirty);
        let previous = std::fs::read(&project).unwrap();
        assert!(session.save_snapshot(snapshot, project.clone()).is_err());
        assert_eq!(std::fs::read(&project).unwrap(), previous);
        let undone = session.edit(edited.revision, RigEdit::Undo).unwrap();
        assert_eq!(undone.slots.len(), 1);
        assert!(!undone.dirty);
    }
    #[test]
    fn image_collisions_invalid_extensions_and_stale_imports_do_not_write_or_clear_dirty() {
        let temp = tempfile::tempdir().unwrap();
        let input = temp.path().join("arm.png");
        std::fs::write(&input, crate::images::tests::png([1, 2, 3, 255])).unwrap();
        let session = Session::default();
        let initial = session
            .replace(new_document("rig".into()).unwrap(), false)
            .unwrap();
        assert!(session
            .import_image(initial.revision + 1, 0, &input)
            .is_err());
        assert!(session.summary().unwrap().unwrap().slots.is_empty());
        session.import_image(initial.revision, 0, &input).unwrap();
        assert!(session
            .save_snapshot(
                session.prepare_save(false).unwrap(),
                temp.path().join("bad.spine")
            )
            .is_err());
        assert!(!temp.path().join("images").exists());
        std::fs::create_dir(temp.path().join("images")).unwrap();
        std::fs::write(temp.path().join("images/ARM.PNG"), b"existing image").unwrap();
        assert!(session
            .save_snapshot(
                session.prepare_save(false).unwrap(),
                temp.path().join("rig.fbones")
            )
            .is_err());
        assert!(!temp.path().join("rig.fbones").exists());
        assert_eq!(
            std::fs::read(temp.path().join("images/ARM.PNG")).unwrap(),
            b"existing image"
        );
        assert!(session.summary().unwrap().unwrap().dirty);
    }
    #[test]
    fn missing_pngs_preserve_metadata_and_block_save_as_to_a_different_directory() {
        let temp = tempfile::tempdir().unwrap();
        let input = temp.path().join("arm.png");
        std::fs::write(&input, crate::images::tests::png([4, 5, 6, 255])).unwrap();
        let session = Session::default();
        let initial = session
            .replace(new_document("rig".into()).unwrap(), false)
            .unwrap();
        session.import_image(initial.revision, 0, &input).unwrap();
        let path = temp.path().join("rig.fbones");
        session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        session.close(false).unwrap();
        std::fs::remove_file(temp.path().join("images/arm.png")).unwrap();
        let opened = session
            .replace(open_document(path.clone()).unwrap(), false)
            .unwrap();
        assert!(!opened.inspection_only && !opened.slots[0].image_available);
        let edited = session
            .edit(
                opened.revision,
                RigEdit::Move {
                    id: 0,
                    x: 30.0,
                    y: 10.0,
                },
            )
            .unwrap();
        let directory = tempfile::tempdir().unwrap();
        let other = directory.path().join("copy.fbones");
        assert!(session
            .save_snapshot(session.prepare_save(false).unwrap(), other.clone())
            .is_err());
        assert!(!other.exists());
        assert!(session.summary().unwrap().unwrap().dirty);
        let saved = session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        assert!(!saved.dirty);
        let payload = ProjectEnvelope::inspect(std::fs::read(path).unwrap())
            .unwrap()
            .decoded_payload()
            .unwrap();
        let model = decode_regions(&payload).unwrap();
        assert_eq!(model.slots[0].attachment.as_ref().unwrap().name, "arm");
        assert_eq!(model.rig.bones[0].x, edited.bones[0].x);
    }

    #[test]
    fn dirty_project_requires_explicit_discard() {
        let session = Session::default();
        session
            .replace(new_document("First".into()).unwrap(), false)
            .unwrap();
        assert!(session
            .replace(new_document("Second".into()).unwrap(), false)
            .is_err());
        assert_eq!(session.summary().unwrap().unwrap().name, "First");
        assert!(session.close(false).is_err());
        session.close(true).unwrap();
        assert!(session.summary().unwrap().is_none());
    }
    #[test]
    fn creates_saves_closes_and_reopens_a_real_native_project_with_unicode_name() {
        for name in ["Animație test", "🦊 rig"] {
            let dir = tempfile::tempdir().unwrap();
            let path = dir.path().join(format!("{name}.fbones"));
            let session = Session::default();
            session
                .replace(new_document(name.into()).unwrap(), false)
                .unwrap();
            let saved = session
                .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
                .unwrap();
            assert!(!saved.dirty && saved.can_save && !saved.inspection_only);
            assert_eq!(saved.path.as_deref(), path.to_str());
            assert!(saved.compressed_bytes.unwrap() > 20);
            session.close(false).unwrap();
            let opened = session
                .replace(open_document(path.clone()).unwrap(), false)
                .unwrap();
            assert_eq!(opened.name, name);
            assert_eq!(opened.bone_count, Some(1));
            assert!(!opened.dirty && opened.can_save && !opened.inspection_only);
            session
                .save_snapshot(session.prepare_save(false).unwrap(), path)
                .unwrap();
        }
    }
    #[test]
    fn failed_and_stale_saves_preserve_session_and_existing_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("existing.fbones");
        std::fs::write(&path, b"existing").unwrap();
        let session = Session::default();
        session
            .replace(new_document("First".into()).unwrap(), false)
            .unwrap();
        let stale = session.prepare_save(false).unwrap();
        session
            .replace(new_document("Second".into()).unwrap(), true)
            .unwrap();
        assert_eq!(
            session.save_snapshot(stale, path.clone()).unwrap_err().code,
            "ProjectChanged"
        );
        assert_eq!(std::fs::read(&path).unwrap(), b"existing");
        let failed = dir.path().join("missing/sub/project.fbones");
        assert!(session
            .save_snapshot(session.prepare_save(false).unwrap(), failed)
            .is_err());
        let summary = session.summary().unwrap().unwrap();
        assert!(summary.dirty && summary.path.is_none());
        assert_eq!(summary.name, "Second");
        assert!(session
            .save_snapshot(
                session.prepare_save(false).unwrap(),
                dir.path().join("original.spine")
            )
            .is_err());
    }
    #[test]
    fn unsupported_settings_are_inspected_and_copied_without_rewriting() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("source.spine");
        let mut payload =
            encode_minimal_payload(&MinimalProject::new("skeleton".into(), [0; 16])).unwrap();
        payload[43..47].copy_from_slice(&2_f32.to_be_bytes());
        let bytes = encode_envelope(&payload).unwrap();
        std::fs::write(&source, &bytes).unwrap();
        let session = Session::default();
        let summary = session
            .replace(open_document(source.clone()).unwrap(), false)
            .unwrap();
        assert!(summary.inspection_only && !summary.can_save && summary.can_copy);
        assert!(session.prepare_save(false).is_err());
        let copy = dir.path().join("copy.fbones");
        session
            .save_snapshot(session.prepare_save(true).unwrap(), copy.clone())
            .unwrap();
        assert_eq!(std::fs::read(copy).unwrap(), bytes);
        assert_eq!(
            session.summary().unwrap().unwrap().path.as_deref(),
            source.to_str()
        );
    }
    #[test]
    fn bone_edits_save_reopen_and_undo_to_saved_checkpoint_without_stale_writes() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("edited.fbones");
        let session = Session::default();
        let created = session
            .replace(new_document("Character".into()).unwrap(), false)
            .unwrap();
        let added = session
            .edit(
                created.revision,
                RigEdit::Create {
                    color: None,
                    parent: 0,
                    x: 16.0,
                    y: 8.0,
                    rotation: 25.0,
                    length: 100.0,
                },
            )
            .unwrap();
        let id = added.edited_bone.unwrap();
        let stale = session.prepare_save(false).unwrap();
        let changed = session
            .edit(
                added.revision,
                RigEdit::Update {
                    scale_x: None,
                    scale_y: None,
                    shear_x: None,
                    shear_y: None,
                    id,
                    name: "braț".into(),
                    x: 37.0,
                    y: -8.0,
                    rotation: -25.0,
                    length: 120.0,
                },
            )
            .unwrap();
        assert!(changed.can_undo && changed.dirty);
        assert_eq!(
            session.save_snapshot(stale, path.clone()).unwrap_err().code,
            "ProjectChanged"
        );
        assert!(!path.exists());
        let saved = session
            .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
            .unwrap();
        assert!(!saved.dirty);
        let undone = session.edit(saved.revision, RigEdit::Undo).unwrap();
        assert!(undone.dirty && undone.can_redo);
        let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
        assert!(!redone.dirty);
        session.close(false).unwrap();
        let reopened = session
            .replace(open_document(path).unwrap(), false)
            .unwrap();
        assert_eq!(reopened.bone_count, Some(2));
        assert_eq!(reopened.bones[1].name, "braț");
        assert_eq!(reopened.bones[1].parent, Some(0));
        assert_eq!(reopened.bones[1].x, 37.0);
        assert_eq!(reopened.bones[1].rotation, -25.0);
        assert!(!reopened.can_undo && !reopened.dirty);
        assert_eq!(
            session
                .edit(created.revision, RigEdit::Delete { id: 1 })
                .unwrap_err()
                .code,
            "ProjectChanged"
        );
    }
    #[test]
    fn validates_portable_names_and_preserves_bytes_on_atomic_replacement() {
        for name in [" ../bad ", "CON.txt", "Rig."] {
            assert!(new_document(name.into()).is_err());
        }
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("Animație.fbones");
        write_copy(&path, b"first").unwrap();
        write_copy(&path, b"second").unwrap();
        assert_eq!(std::fs::read(path).unwrap(), b"second");
    }
}

#[cfg(not(feature = "scene-editing"))]
fn project_images(project: &RegionProject) -> Vec<&fbones_format::minimal::regions::Region> {
    project
        .slots
        .iter()
        .filter_map(|s| s.attachment.as_deref())
        .collect()
}
#[cfg(feature = "scene-editing")]
impl Session {
    pub fn place_attachments(
        &self,
        expected_revision: u64,
        keys: &[String],
        slot: u64,
    ) -> Result<ProjectSummary, AppError> {
        let mut state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed while attaching images.",
            ));
        }
        let Some(Document::Editable {
            project,
            images,
            rig,
            dirty,
            ..
        }) = state.document.as_mut()
        else {
            return Err(AppError::new(
                "NoProject",
                "Open an editable project first.",
            ));
        };
        if keys.is_empty() || keys.len() > 128 {
            return Err(AppError::new("InvalidEdit", "Choose 1–128 images."));
        }
        let index = rig.history.frame().slot_index(slot)?;
        let bone_index = project.slots[index].bone;
        let bone = rig.history.frame().bone_ids[bone_index];
        let p = crate::rig::poses(&project.rig.bones)[bone_index];
        let mut seen = std::collections::HashSet::new();
        let mut placements = vec![];
        for key in keys {
            if !valid_image_stem(key) || !seen.insert(key) {
                return Err(AppError::new(
                    "InvalidImage",
                    "Choose distinct library images.",
                ));
            }
            let image = images.get(key).ok_or_else(|| {
                AppError::new("MissingImage", "Choose an image from the current folder.")
            })?;
            placements.push(ImagePlacement {
                image: key.rsplit('/').next().unwrap_or(key).into(),
                path: key.clone(),
                x: p.x,
                y: p.y,
                width: image.width as f32,
                height: image.height as f32,
            });
        }
        rig.apply(
            project,
            RigEdit::AddAttachments {
                bone,
                slot,
                images: placements,
            },
        )?;
        *dirty = rig.dirty(project);
        state.revision += 1;
        Ok(state.summary().unwrap())
    }
    fn traced_attachment(
        &self,
        expected_revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
        pose_epoch: Option<u64>,
    ) -> Result<(Box<fbones_format::minimal::meshes::Mesh>, TracePreview, u64), AppError> {
        let (candidate, address, ids, image, poses, slot_id) = {
            let state = self.lock()?;
            if state.revision != expected_revision {
                return Err(AppError::new(
                    "ProjectChanged",
                    "The project changed before tracing.",
                ));
            }
            let Some(Document::Editable {
                project,
                images,
                rig,
                ..
            }) = &state.document
            else {
                return Err(AppError::new("NoProject", "Open an editable project."));
            };
            let frozen_poses = Self::geometry_poses(&state, pose_epoch)?;
            let a = rig.attachment_address(id)?;
            let image_key = crate::animation_sequence::setup_image_key(project, a)?;
            let asset = images
                .get(&image_key)
                .cloned()
                .ok_or_else(|| AppError::new("MissingImage", "The source PNG is unavailable."))?;
            (
                project.clone(),
                a,
                rig.history.frame().bone_ids.clone(),
                asset,
                frozen_poses.unwrap_or_else(|| crate::rig::poses(&project.rig.bones)),
                rig.history.frame().slot_ids[a.slot],
            )
        };
        let geometry = crate::trace::trace_png(&image, options)?;
        let attachment = &candidate.slots[address.slot].attachments[address.attachment];
        let old = attachment.mesh().cloned().unwrap_or_else(|| {
            crate::mesh::from_region(
                attachment.image().unwrap(),
                candidate.slots[address.slot].bone,
            )
        });
        let replacement = Box::new(crate::mesh_edit::remesh(
            &old,
            geometry.uvs.clone(),
            geometry.triangles.clone(),
            geometry.edges.clone(),
            geometry.hull,
            &poses,
        )?);
        let mut candidate = *candidate;
        candidate.slots[address.slot].attachments[address.attachment] =
            fbones_format::minimal::scene::SceneAttachment::Mesh(replacement.clone());
        fbones_format::minimal::scene::encode_scene_payload(&candidate)?;
        let mesh = crate::rig::MeshView {
            weighted: replacement.weighted,
            uvs: replacement.uvs.clone(),
            triangles: replacement.triangles.clone(),
            edges: replacement.edges.clone(),
            hull: replacement.hull,
            bones: replacement.bones.iter().map(|i| ids[*i]).collect(),
            vertices: replacement
                .vertices
                .iter()
                .map(|v| crate::rig::VertexView {
                    weights: v.weights.clone(),
                    positions: v.positions.clone(),
                })
                .collect(),
        };
        let state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed during tracing.",
            ));
        }
        // Evaluation can supersede an epoch without changing document revision.
        // Never return a preview interpreted through an obsolete frozen pose.
        Self::geometry_poses(&state, pose_epoch)?;
        Ok((
            replacement,
            TracePreview {
                slot_id,
                attachment_id: id,
                pose_epoch,
                expected_revision,
                mesh,
                geometry,
            },
            slot_id,
        ))
    }
    pub(crate) fn preview_trace_attachment(
        &self,
        revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
    ) -> Result<TracePreview, AppError> {
        self.preview_trace_attachment_in_pose(revision, id, options, None)
    }
    pub(crate) fn preview_trace_attachment_in_pose(
        &self,
        revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
        pose_epoch: Option<u64>,
    ) -> Result<TracePreview, AppError> {
        self.traced_attachment(revision, id, options, pose_epoch)
            .map(|(_, preview, _)| preview)
    }
    pub(crate) fn apply_trace_attachment(
        &self,
        revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
    ) -> Result<ProjectSummary, AppError> {
        self.apply_trace_attachment_in_pose(revision, id, options, None)
    }
    pub(crate) fn apply_trace_attachment_in_pose(
        &self,
        revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
        pose_epoch: Option<u64>,
    ) -> Result<ProjectSummary, AppError> {
        let (mesh, _, slot) = self.traced_attachment(revision, id, options, pose_epoch)?;
        self.edit_impl(
            revision,
            RigEdit::AttachmentEdit {
                id,
                edit: Box::new(RigEdit::ReplaceMesh { id: slot, mesh }),
            },
            pose_epoch,
        )
    }
    pub(crate) fn preview_trace(
        &self,
        revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
    ) -> Result<TracePreview, AppError> {
        let a = {
            let state = self.lock()?;
            let Some(Document::Editable { rig, .. }) = &state.document else {
                return Err(AppError::new("NoProject", "Open an editable project."));
            };
            let f = rig.history.frame();
            let s = f.slot_index(id)?;
            let a = f.project.slots[s]
                .active_attachment
                .ok_or_else(|| AppError::new("InvalidTrace", "Choose an attachment."))?;
            f.attachment_ids[s][a]
        };
        self.preview_trace_attachment(revision, a, options)
    }
    pub(crate) fn apply_trace(
        &self,
        revision: u64,
        id: u64,
        options: crate::trace::TraceOptions,
    ) -> Result<ProjectSummary, AppError> {
        let a = {
            let state = self.lock()?;
            let Some(Document::Editable { rig, .. }) = &state.document else {
                return Err(AppError::new("NoProject", "Open an editable project."));
            };
            let f = rig.history.frame();
            let s = f.slot_index(id)?;
            let a = f.project.slots[s]
                .active_attachment
                .ok_or_else(|| AppError::new("InvalidTrace", "Choose an attachment."))?;
            f.attachment_ids[s][a]
        };
        self.apply_trace_attachment(revision, a, options)
    }
}
#[cfg(all(test, feature = "scene-editing"))]
#[path = "scene_animation_capacity_tests.rs"]
mod animation_capacity_tests;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "scene_bone_capacity_tests.rs"]
mod bone_capacity_tests;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "scene_constraint_declarations_tests.rs"]
mod constraint_declarations_tests;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "scene_large_mesh_tests.rs"]
mod large_mesh_tests;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "placement_tests.rs"]
mod placement_tests;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "scene_native_tests.rs"]
mod scene_tests;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "scene_slot_capacity_tests.rs"]
mod slot_capacity_tests;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "scene_string_form_tests.rs"]
mod string_form_tests;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "scene_transform_setup_mix_tests.rs"]
mod transform_setup_mix_tests;

#[cfg(feature = "scene-editing")]
impl Session {
    /// Both Match sections sample the ordered prefix using one immutable frame
    /// of precise frozen authored poses and scratch Physics.
    /// This is distinct from the world-only context used to interpret geometry.
    fn animation_key_context(
        state: &SessionState,
        pose_epoch: u64,
        edit: &RigEdit,
    ) -> Result<(), AppError> {
        let mut bones = vec![];
        let mut slots = vec![];
        let mut deforms = vec![];
        let mut orders = vec![];
        let mut constraints = vec![];
        let mut events = vec![];
        let mut sequences = vec![];
        let animation = match edit {
            RigEdit::SetAnimationKey { animation, key } => {
                bones.push((key.bone, key.frame));
                *animation
            }
            RigEdit::SetAnimationKeys { animation, keys } => {
                bones.extend(keys.iter().map(|key| (key.bone, key.frame)));
                *animation
            }
            RigEdit::SetAnimationSlotKeys { animation, keys } => {
                slots.extend(keys.iter().map(|key| key.context()));
                *animation
            }
            RigEdit::SetAnimationDrawOrderKeys { animation, keys } => {
                orders.extend(keys.iter().map(|key| key.frame));
                *animation
            }
            RigEdit::SetAnimationDeformKeys { animation, keys } => {
                deforms.extend(keys.iter().map(|key| (key.attachment, key.frame)));
                *animation
            }
            RigEdit::SetAnimationDeformVertices {
                animation,
                attachment,
                frame,
                ..
            } => {
                deforms.push((*attachment, *frame));
                *animation
            }
            RigEdit::SetAnimationConstraintKeys { animation, keys } => {
                constraints.extend(keys.iter().map(|k| k.context()));
                *animation
            }
            RigEdit::SetAnimationSequenceKeys { animation, keys } => {
                sequences.extend(keys.iter().map(|key| (key.attachment, key.frame)));
                *animation
            }
            RigEdit::SetAnimationEventKeys { animation, keys } => {
                events.extend(keys.iter().map(|k| (k.event, k.frame)));
                *animation
            }
            RigEdit::SetAnimationKeyBatch {
                animation,
                bone_keys,
                slot_keys,
                draw_order_keys,
                deform_keys,
                constraint_keys,
                event_keys,
                sequence_keys,
            } => {
                bones.extend(bone_keys.iter().map(|key| (key.bone, key.frame)));
                slots.extend(slot_keys.iter().map(|key| key.context()));
                orders.extend(draw_order_keys.iter().map(|key| key.frame));
                deforms.extend(deform_keys.iter().map(|key| (key.attachment, key.frame)));
                constraints.extend(constraint_keys.iter().map(|k| k.context()));
                events.extend(event_keys.iter().map(|k| (k.event, k.frame)));
                sequences.extend(sequence_keys.iter().map(|key| (key.attachment, key.frame)));
                *animation
            }
            _ => {
                return Err(AppError::new(
                    "InvalidPose",
                    "A frozen animation pose may only author animation keys.",
                ))
            }
        };
        let cache = state
            .evaluation
            .as_ref()
            .filter(|cached| {
                cached.snapshot.pose_epoch == pose_epoch
                    && cached.snapshot.revision == state.revision
                    && cached.snapshot.document_id == state.document_id
                    && cached.snapshot.animation_id == Some(animation)
            })
            .ok_or_else(|| {
                AppError::new(
                    "StalePose",
                    "The animation or frozen pose changed during this key gesture.",
                )
            })?;
        let Some(Document::Editable { project, rig, .. }) = &state.document else {
            return Err(AppError::new("NoProject", "Open an editable project."));
        };
        let position = (cache.snapshot.time * f64::from(project.fps)) as f32;
        if (bones.is_empty()
            && slots.is_empty()
            && deforms.is_empty()
            && orders.is_empty()
            && constraints.is_empty()
            && events.is_empty()
            && sequences.is_empty())
            || bones.iter().any(|(id, f)| {
                f.to_bits() != position.to_bits()
                    || !cache.snapshot.bones.iter().any(|bone| bone.id == *id)
            })
            || slots.iter().any(|(id, f)| {
                f.to_bits() != position.to_bits()
                    || !cache.snapshot.slot_pose.iter().any(|slot| slot.slot == *id)
            })
            || deforms.iter().any(|(id, f)| {
                f.to_bits() != position.to_bits()
                    || !cache
                        .snapshot
                        .deform_pose
                        .iter()
                        .any(|pose| pose.attachment == *id)
            })
            || orders.iter().any(|f| f.to_bits() != position.to_bits())
            || constraints.iter().any(|(id, f)| {
                f.to_bits() != position.to_bits()
                    || !rig.history.frame().constraint_ids.contains(id)
            })
            || sequences.iter().any(|(id, f)| {
                f.to_bits() != position.to_bits()
                    || !cache
                        .snapshot
                        .sequence_pose
                        .iter()
                        .any(|pose| pose.attachment == *id)
            })
            || events.iter().any(|(id, f)| {
                f.to_bits() != position.to_bits() || !rig.history.frame().event_ids.contains(id)
            })
        {
            return Err(AppError::new(
                "StalePose",
                "The animation frame or target changed during this key gesture.",
            ));
        }
        Ok(())
    }
    fn deform_vertex_edit(
        state: &SessionState,
        pose_epoch: Option<u64>,
        edit: &RigEdit,
    ) -> Result<RigEdit, AppError> {
        let RigEdit::SetAnimationDeformVertices {
            animation,
            attachment,
            ..
        } = edit
        else {
            return Err(AppError::new(
                "InvalidAnimation",
                "Choose a deform vertex action.",
            ));
        };
        let epoch = pose_epoch.ok_or_else(|| {
            AppError::new(
                "PoseRequired",
                "Freeze the current animation geometry before moving deform vertices.",
            )
        })?;
        Self::animation_key_context(state, epoch, edit)?;
        let Some(Document::Editable { rig, .. }) = &state.document else {
            return Err(AppError::new("NoProject", "Open an editable project."));
        };
        let state_frame = rig.history.frame();
        let index = state_frame
            .animation_ids
            .iter()
            .position(|id| id == animation)
            .ok_or_else(|| AppError::new("InvalidAnimation", "Choose an existing animation."))?;
        let cache = state.evaluation.as_ref().expect("epoch checked");
        if cache.evaluated.bones.len() != state_frame.bone_ids.len()
            || !cache
                .snapshot
                .bones
                .iter()
                .zip(&state_frame.bone_ids)
                .all(|(bone, id)| bone.id == *id)
        {
            return Err(AppError::new(
                "StalePose",
                "The frozen influence bones changed.",
            ));
        }
        let sampled = cache
            .snapshot
            .deform_pose
            .iter()
            .find(|pose| pose.attachment == *attachment)
            .ok_or_else(|| {
                AppError::new(
                    "StalePose",
                    "The frozen attachment geometry is unavailable.",
                )
            })?;
        let worlds = cache
            .evaluated
            .bones
            .iter()
            .map(|bone| bone.world)
            .collect::<Vec<_>>();
        let key = crate::animation_deform::from_world_targets(
            state_frame,
            &state_frame.project.animations[index],
            sampled,
            &worlds,
            edit,
        )?;
        Ok(RigEdit::SetAnimationDeformKeys {
            animation: *animation,
            keys: vec![key],
        })
    }
    fn authoring_evaluation(
        state: &SessionState,
        pose_epoch: Option<u64>,
        constraint_id: u64,
    ) -> Result<crate::solve::Evaluation, AppError> {
        let Some(Document::Editable { rig, .. }) = &state.document else {
            return Err(AppError::new("NoProject", "Open an editable project."));
        };
        let epoch = pose_epoch.ok_or_else(|| {
            AppError::new(
                "PoseRequired",
                "Freeze a current pose before matching a constraint.",
            )
        })?;
        let cache = state
            .evaluation
            .as_ref()
            .filter(|cached| {
                cached.snapshot.pose_epoch == epoch
                    && cached.snapshot.revision == state.revision
                    && cached.snapshot.document_id == state.document_id
            })
            .ok_or_else(|| {
                AppError::new("StalePose", "The matching pose changed. Try Match again.")
            })?;
        let snapshot = &cache.snapshot;
        let ids = &rig.history.frame().bone_ids;
        if snapshot.bones.len() != ids.len()
            || cache.evaluated.bones.len() != ids.len()
            || !snapshot
                .bones
                .iter()
                .zip(ids)
                .all(|(bone, id)| bone.id == *id)
        {
            return Err(AppError::new(
                "StalePose",
                "The matching bone identities changed.",
            ));
        }
        let frame = rig.history.frame();
        let index = frame.constraint_index(constraint_id)?;
        if !matches!(
            frame.project.constraints[index],
            fbones_format::minimal::scene::Constraint::Transform(_)
        ) {
            return Err(AppError::new(
                "InvalidTransformMatch",
                "Choose a Transform constraint to match.",
            ));
        }
        let authored: Vec<_> = cache.evaluated.bones.iter().map(|b| b.authored).collect();
        let mut scratch_physics = cache.physics.clone();
        let mode = if matches!(cache.snapshot.mode, crate::evaluation::EvaluationMode::None) {
            crate::solve::StepMode::None
        } else {
            crate::solve::StepMode::Pose
        };
        crate::solve::evaluate_prefix(
            &frame.project,
            Some(&authored),
            &mut scratch_physics,
            mode,
            index,
        )
        .map_err(|e| AppError::new("InvalidTransformMatch", e.to_string()))
    }
    fn geometry_poses(
        state: &SessionState,
        pose_epoch: Option<u64>,
    ) -> Result<Option<Vec<crate::rig::Pose>>, AppError> {
        let Some(Document::Editable { project, .. }) = &state.document else {
            return Err(AppError::new("NoProject", "Open an editable project."));
        };
        if let Some(epoch) = pose_epoch {
            let cache = state
                .evaluation
                .as_ref()
                .filter(|p| {
                    p.snapshot.pose_epoch == epoch
                        && p.snapshot.revision == state.revision
                        && p.snapshot.document_id == state.document_id
                })
                .ok_or_else(|| {
                    AppError::new(
                        "StalePose",
                        "Freeze a current evaluated pose before committing geometry.",
                    )
                })?;
            Ok(Some(cache.poses.clone()))
        } else if !project.constraints.is_empty() {
            Err(AppError::new(
                "PoseRequired",
                "Freeze an evaluated pose before editing constrained geometry.",
            ))
        } else {
            Ok(None)
        }
    }
    pub fn evaluate(
        &self,
        expected_revision: u64,
        request: crate::evaluation::EvaluationRequest,
    ) -> Result<crate::evaluation::EvaluationSnapshot, AppError> {
        let mut state = self.lock()?;
        if state.revision != expected_revision {
            return Err(AppError::new(
                "ProjectChanged",
                "The project changed before evaluation.",
            ));
        }
        let Some(Document::Editable { project, rig, .. }) = &state.document else {
            return Err(AppError::new("NoProject", "Open an editable project."));
        };
        let epoch = state.next_pose_epoch.checked_add(1).ok_or_else(|| {
            AppError::new(
                "PoseEpochExhausted",
                "Reopen the project before evaluating another pose.",
            )
        })?;
        let animation = request
            .animation_id
            .map(|id| {
                rig.history
                    .frame()
                    .animation_ids
                    .iter()
                    .position(|value| *value == id)
                    .map(|index| &project.animations[index])
                    .ok_or_else(|| {
                        AppError::new("InvalidAnimation", "Choose an existing animation.")
                    })
            })
            .transpose()?;
        let slot_pose =
            crate::animation_slots::sample(rig.history.frame(), animation, request.time)?;
        let position = request.time * f64::from(project.fps);
        let order = if let Some(order) = &request.draw_order_pose {
            crate::animation_order::resolve_ids(rig.history.frame(), order)?
        } else {
            crate::animation_order::sample_indices(project, animation, position)?
        };
        let active = slot_pose
            .iter()
            .enumerate()
            .map(|(s, slot)| {
                slot.attachment
                    .map(|id| {
                        rig.history.frame().attachment_ids[s]
                            .iter()
                            .position(|candidate| *candidate == id)
                            .ok_or_else(|| {
                                AppError::new(
                                    "InvalidAnimationPose",
                                    "The sampled attachment is missing.",
                                )
                            })
                    })
                    .transpose()
            })
            .collect::<Result<Vec<_>, _>>()?;
        crate::scene_edit::check_clipping_activation_in_order(project, &active, &order)?;
        if !(request.deform_targets.is_empty()
            || matches!(request.mode, crate::evaluation::EvaluationMode::None)
            || animation.is_some()
                && matches!(request.mode, crate::evaluation::EvaluationMode::Replay))
        {
            return Err(AppError::new(
                "InvalidAnimationPose",
                "Requested deformation geometry requires a None freeze or selected animation Replay.",
            ));
        }
        let geometry_targets = crate::animation_deform::requested_targets(
            rig.history.frame(),
            animation,
            request.deform_pose.as_deref(),
            &request.deform_targets,
        )?;
        let mut cache = crate::evaluation::evaluate_animation(
            project,
            &rig.history.frame().bone_ids,
            state.evaluation.as_ref(),
            state.revision,
            state.document_id,
            epoch,
            &request,
            &rig.history.frame().constraint_ids,
            animation,
            &geometry_targets,
        )?;
        cache.snapshot.sequence_pose =
            crate::animation_sequence::sample(rig.history.frame(), animation, position)?;
        cache.snapshot.slot_pose = slot_pose;
        cache.snapshot.draw_order = order
            .iter()
            .map(|i| rig.history.frame().slot_ids[*i])
            .collect();
        let worlds = cache
            .evaluated
            .bones
            .iter()
            .map(|bone| bone.world)
            .collect::<Vec<_>>();
        cache.snapshot.deform_pose = crate::animation_deform::sample(
            rig.history.frame(),
            animation,
            position,
            &worlds,
            request.deform_pose.as_deref(),
            &geometry_targets,
        )?;
        let snapshot = cache.snapshot.clone();
        state.evaluation = Some(cache);
        state.next_pose_epoch = epoch;
        Ok(snapshot)
    }
}

impl Session {
    #[cfg(feature = "scene-editing")]
    pub fn select_audio_folder(
        &self,
        expected_revision: u64,
        folder: &Path,
    ) -> Result<ProjectSummary, AppError> {
        self.edit(
            expected_revision,
            RigEdit::SetAudioRoot {
                path: folder.to_string_lossy().replace('\\', "/"),
            },
        )
    }
    #[cfg(not(feature = "scene-editing"))]
    pub fn select_audio_folder(
        &self,
        _expected_revision: u64,
        _folder: &Path,
    ) -> Result<ProjectSummary, AppError> {
        Err(AppError::new(
            "UnsupportedProfile",
            "Audio requires the Scene editor.",
        ))
    }
    #[cfg(feature = "scene-editing")]
    pub fn audio_data(&self, document_id: u64, key: &str) -> Result<String, AppError> {
        let state = self.lock()?;
        if state.document_id != document_id {
            return Err(AppError::new(
                "ProjectChanged",
                "The audio resource generation changed.",
            ));
        }
        let Some(Document::Editable { audio, .. }) = &state.document else {
            return Err(AppError::new("NoProject", "Open an editable project."));
        };
        audio.get(key).map(|a| a.data_url()).ok_or_else(|| {
            AppError::new(
                "MissingAudio",
                "Choose a supported WAV from the loaded Audio folder.",
            )
        })
    }
    #[cfg(not(feature = "scene-editing"))]
    pub fn audio_data(&self, _document_id: u64, _key: &str) -> Result<String, AppError> {
        Err(AppError::new(
            "UnsupportedProfile",
            "Audio requires the Scene editor.",
        ))
    }
}

#[cfg(test)]
mod logical_document_tests {
    use super::*;

    fn stamped(session: &Session, summary: &ProjectSummary, logical: u64) {
        assert_eq!(summary.logical_document_id, logical);
        let current = session.summary().unwrap().unwrap();
        assert_eq!(current.logical_document_id, logical);
        assert_eq!(current.document_id, summary.document_id);
        assert_eq!(current.revision, summary.revision);
        assert_eq!(
            serde_json::to_value(summary).unwrap()["logicalDocumentId"],
            logical
        );
    }

    #[test]
    fn logical_document_identity_survives_resources_edits_history_and_save() {
        let source = tempfile::tempdir().unwrap();
        let alternate = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        let second_output = tempfile::tempdir().unwrap();
        let red = crate::images::tests::png([200, 0, 0, 255]);
        let blue = crate::images::tests::png([0, 0, 200, 255]);
        let png_path = source.path().join("arm.png");
        std::fs::write(&png_path, &red).unwrap();
        std::fs::write(alternate.path().join("arm.png"), blue).unwrap();
        let session = Session::default();
        let document = new_document("identity".into()).unwrap();
        assert_eq!(document.summary().logical_document_id, 0);
        let initial = session.replace(document, false).unwrap();
        let logical = initial.logical_document_id;
        assert!(logical > 0);
        stamped(&session, &initial, logical);
        let folder = session
            .select_images_folder(initial.revision, source.path())
            .unwrap();
        stamped(&session, &folder, logical);
        assert_ne!(folder.document_id, initial.document_id);
        let imported = session
            .import_image(folder.revision, folder.bones[0].id, &png_path)
            .unwrap();
        stamped(&session, &imported, logical);
        // Folder switching must retain every referenced imported PNG before Save As.
        for image in &imported.library.images {
            if image.key != "arm" {
                std::fs::write(alternate.path().join(format!("{}.png", image.key)), &red).unwrap();
            }
        }
        let placed = session
            .place_image(imported.revision, "arm", imported.bones[0].id, 1., 2.)
            .unwrap();
        stamped(&session, &placed, logical);
        let source_path = output.path().join("source.fbones");
        let saved = session
            .save_snapshot(session.prepare_save(false).unwrap(), source_path.clone())
            .unwrap();
        stamped(&session, &saved, logical);
        let source_bytes = std::fs::read(&source_path).unwrap();
        let refreshed = session.refresh_images_folder(saved.revision).unwrap();
        stamped(&session, &refreshed, logical);
        assert_ne!(refreshed.document_id, saved.document_id);
        assert_eq!(refreshed.dirty, saved.dirty);
        assert_eq!(refreshed.can_undo, saved.can_undo);
        assert_eq!(
            serde_json::to_value(&refreshed.bones).unwrap(),
            serde_json::to_value(&saved.bones).unwrap()
        );
        let red_data = session.image_data(refreshed.document_id, "arm").unwrap();
        assert_eq!(
            session
                .image_data(saved.document_id, "arm")
                .unwrap_err()
                .code,
            "ProjectChanged"
        );
        let selected = session
            .select_images_folder(refreshed.revision, alternate.path())
            .unwrap();
        stamped(&session, &selected, logical);
        assert!(selected.dirty);
        assert_ne!(selected.document_id, refreshed.document_id);
        assert_ne!(
            session.image_data(selected.document_id, "arm").unwrap(),
            red_data
        );
        let undo = session.edit(selected.revision, RigEdit::Undo).unwrap();
        stamped(&session, &undo, logical);
        assert_ne!(undo.document_id, selected.document_id);
        assert_eq!(
            session.image_data(undo.document_id, "arm").unwrap(),
            red_data
        );
        let redo = session.edit(undo.revision, RigEdit::Redo).unwrap();
        stamped(&session, &redo, logical);
        let edited = session
            .edit(
                redo.revision,
                RigEdit::Create {
                    color: None,
                    parent: redo.bones[0].id,
                    x: 3.,
                    y: 4.,
                    rotation: 0.,
                    length: 10.,
                },
            )
            .unwrap();
        stamped(&session, &edited, logical);
        assert_eq!(
            session
                .refresh_images_folder(refreshed.revision)
                .unwrap_err()
                .code,
            "ProjectChanged"
        );
        stamped(&session, &session.summary().unwrap().unwrap(), logical);
        let saved_as = session
            .save_snapshot(
                session.prepare_save(false).unwrap(),
                second_output.path().join("copy.fbones"),
            )
            .unwrap();
        stamped(&session, &saved_as, logical);
        assert_eq!(std::fs::read(&source_path).unwrap(), source_bytes);
        assert_eq!(std::fs::read(&png_path).unwrap(), red);
        session.close(false).unwrap();
        assert!(session.summary().unwrap().is_none());
        let reopened = session
            .replace(open_document(source_path).unwrap(), false)
            .unwrap();
        assert!(reopened.logical_document_id > logical);
        stamped(&session, &reopened, reopened.logical_document_id);
        let next = session
            .replace(new_document("another".into()).unwrap(), true)
            .unwrap();
        assert!(next.logical_document_id > reopened.logical_document_id);
        assert_eq!(
            session
                .replace(new_document("blocked".into()).unwrap(), false)
                .unwrap_err()
                .code,
            "UnsavedChanges"
        );
        stamped(&session, &next, next.logical_document_id);
    }

    #[test]
    fn logical_document_identity_exhaustion_rejects_replacement_atomically() {
        let session = Session::default();
        session
            .replace(new_document("original".into()).unwrap(), false)
            .unwrap();
        session.lock().unwrap().logical_document_id = u64::MAX;
        let before = serde_json::to_value(session.summary().unwrap()).unwrap();
        assert_eq!(
            session
                .replace(new_document("replacement".into()).unwrap(), true)
                .unwrap_err()
                .code,
            "Internal"
        );
        assert_eq!(
            serde_json::to_value(session.summary().unwrap()).unwrap(),
            before
        );
    }

    #[cfg(feature = "scene-editing")]
    #[test]
    fn logical_document_identity_does_not_authorize_old_animation_pose_leases() {
        let directory = tempfile::tempdir().unwrap();
        let source = directory.path().join("source.fbones");
        let bytes =
            fbones_format::minimal::scene::encode_scene(&crate::scene_sequence_fixture::project())
                .unwrap();
        std::fs::write(&source, &bytes).unwrap();
        let session = Session::default();
        let opened = session
            .replace(open_document(source.clone()).unwrap(), false)
            .unwrap();
        let lease = session
            .evaluate(
                opened.revision,
                serde_json::from_value(serde_json::json!({
                    "mode":"none","time":0.,"animationId":opened.animations[0].id
                }))
                .unwrap(),
            )
            .unwrap();
        std::fs::write(
            directory.path().join("arm.png"),
            crate::images::tests::png([20, 30, 40, 255]),
        )
        .unwrap();
        let selected = session
            .select_images_folder(opened.revision, directory.path())
            .unwrap();
        stamped(&session, &selected, opened.logical_document_id);
        let edit: RigEdit = serde_json::from_value(serde_json::json!({
            "type":"setAnimationKeys","animation":selected.animations[0].id,
            "keys":[{"bone":selected.bones[0].id,"channel":"translate","frame":0.,"values":[1.,2.],"curve":"linear"}]
        })).unwrap();
        assert_eq!(
            session
                .edit_in_pose(selected.revision, lease.pose_epoch, edit)
                .unwrap_err()
                .code,
            "StalePose"
        );
        stamped(&session, &selected, opened.logical_document_id);
        let attached = session
            .place_attachments(selected.revision, &["arm".into()], selected.slots[0].id)
            .unwrap();
        stamped(&session, &attached, opened.logical_document_id);
        assert_eq!(std::fs::read(source).unwrap(), bytes);
        let replaced = session
            .replace(new_document("replacement".into()).unwrap(), true)
            .unwrap();
        assert_ne!(replaced.logical_document_id, opened.logical_document_id);
        stamped(&session, &replaced, replaced.logical_document_id);
    }
}
