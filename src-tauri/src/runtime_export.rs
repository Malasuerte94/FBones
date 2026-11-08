//! Separate developer export. The authoring .fbones format stays binary.
use crate::{
    audio::AudioCache,
    images::{valid_image_stem, ImageCache},
    project::{AppError, ProjectSummary},
};
use serde::Serialize;
use std::{fs, io::Write, path::Path};

pub struct RuntimeExportSnapshot {
    pub revision: u64,
    pub document_id: u64,
    bytes: Vec<u8>,
    images: ImageCache,
    audio: AudioCache,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeExportResult {
    pub path: String,
    pub image_count: usize,
    pub audio_count: usize,
}

pub fn snapshot(
    summary: ProjectSummary,
    images: ImageCache,
    audio: AudioCache,
) -> Result<RuntimeExportSnapshot, AppError> {
    let mut export_images = ImageCache::default();
    let mut export_audio = AudioCache::default();
    let mut require_image = |key: &str| -> Result<(), AppError> {
        if !valid_image_stem(key) || images.get(key).is_none() {
            return Err(AppError::new(
                "MissingImage",
                format!("Runtime export needs the PNG resource: {key}"),
            ));
        }
        export_images.insert(key.to_owned(), images.get(key).unwrap().clone())?;
        Ok(())
    };
    for slot in &summary.slots {
        for attachment in &slot.attachments {
            if let Some(region) = &attachment.region {
                if let Some(sequence) = &attachment.sequence {
                    let base = if region.image_path.is_empty() {
                        &attachment.name
                    } else {
                        &region.image_path
                    };
                    for index in 0..sequence.count {
                        require_image(&format!(
                            "{base}{:0width$}",
                            u64::from(sequence.start) + u64::from(index),
                            width = sequence.digits as usize,
                        ))?;
                    }
                } else {
                    require_image(&region.image)?;
                }
            }
        }
    }
    for event in &summary.events {
        if !event.audio.is_empty()
            && (!crate::audio::valid_key(&event.audio) || audio.get(&event.audio).is_none())
        {
            return Err(AppError::new(
                "MissingAudio",
                format!("Runtime export needs the WAV resource: {}", event.audio),
            ));
        }
        if !event.audio.is_empty() {
            export_audio.insert(
                event.audio.clone(),
                audio.get(&event.audio).unwrap().clone(),
            )?;
        }
    }
    // Native views contain authored locals/inventory only, never evaluated poses.
    // This explicit whitelist excludes source paths, source state and UI metadata.
    let data = serde_json::json!({
        "format": "fbones-runtime", "version": 1, "fps": summary.animation_fps,
        "bones": summary.bones, "slots": summary.slots,
        "animations": summary.animations, "constraints": summary.constraints,
        "events": summary.events,
    });
    let bytes = serde_json::to_vec_pretty(&data)
        .map_err(|_| AppError::new("RuntimeExport", "Runtime data could not be encoded."))?;
    Ok(RuntimeExportSnapshot {
        revision: summary.revision,
        document_id: summary.document_id,
        bytes,
        images: export_images,
        audio: export_audio,
    })
}

impl RuntimeExportSnapshot {
    pub fn write(self, parent: &Path) -> Result<RuntimeExportResult, AppError> {
        // A new private directory prevents collisions and partial public bundles.
        // On any failure TempDir removes only our own partial resources.
        let output = tempfile::Builder::new()
            .prefix("FBones-runtime-")
            .tempdir_in(parent)?;
        for (key, asset) in self.images.entries() {
            if !valid_image_stem(key) {
                return Err(AppError::new("InvalidImage", "Image key is not portable."));
            }
            write_resource(
                &output.path().join("images").join(format!("{key}.png")),
                asset.bytes(),
            )?;
        }
        for (key, asset) in self.audio.entries() {
            if !crate::audio::valid_key(key) {
                return Err(AppError::new("InvalidAudio", "Audio key is not portable."));
            }
            write_resource(&output.path().join("audio").join(key), asset.bytes())?;
        }
        write_resource(
            &output.path().join("skeleton.fbones.runtime.json"),
            &self.bytes,
        )?;
        let image_count = self.images.entries().count();
        let audio_count = self.audio.entries().count();
        let path = output.keep();
        Ok(RuntimeExportResult {
            path: path.to_string_lossy().into_owned(),
            image_count,
            audio_count,
        })
    }
}

fn write_resource(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    fs::create_dir_all(path.parent().unwrap())?;
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)?;
    file.write_all(bytes)?;
    file.sync_all()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        project::{new_document, Session},
        rig::RigEdit,
    };

    #[test]
    fn runtime_bundle_is_authored_portable_and_does_not_change_save_or_history() {
        let source = tempfile::tempdir().unwrap();
        let target = tempfile::tempdir().unwrap();
        let png = crate::images::tests::png([12, 98, 54, 255]);
        let image = source.path().join("own.png");
        fs::write(&image, &png).unwrap();
        let session = Session::default();
        let initial = session
            .replace(new_document("Own runtime".into()).unwrap(), false)
            .unwrap();
        let imported = session
            .import_image(initial.revision, initial.bones[0].id, &image)
            .unwrap();
        let before = serde_json::to_value(&imported).unwrap();
        let export = session
            .write_runtime_export(
                session.prepare_runtime_export(imported.revision).unwrap(),
                target.path(),
            )
            .unwrap();
        assert_eq!(export.image_count, 1);
        let json: serde_json::Value = serde_json::from_slice(
            &fs::read(Path::new(&export.path).join("skeleton.fbones.runtime.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(json["format"], "fbones-runtime");
        assert_eq!(json["version"], 1);
        assert_eq!(json["bones"], before["bones"]);
        assert_eq!(json["slots"], before["slots"]);
        assert_eq!(json.as_object().unwrap().len(), 8);
        assert_eq!(
            fs::read(Path::new(&export.path).join("images/own.png")).unwrap(),
            png
        );
        assert_eq!(
            serde_json::to_value(session.summary().unwrap()).unwrap(),
            before
        );
        let stale = session.prepare_runtime_export(imported.revision).unwrap();
        session
            .edit(
                imported.revision,
                RigEdit::Move {
                    id: imported.bones[0].id,
                    x: 7.0,
                    y: -3.0,
                },
            )
            .unwrap();
        assert_eq!(
            session
                .write_runtime_export(stale, target.path())
                .unwrap_err()
                .code,
            "ProjectChanged"
        );
        assert_eq!(fs::read_dir(target.path()).unwrap().count(), 1);
    }

    #[test]
    fn runtime_snapshot_copies_only_referenced_resources_and_failure_leaves_no_bundle() {
        let session = Session::default();
        let p = session
            .replace(new_document("Own empty runtime".into()).unwrap(), false)
            .unwrap();
        let mut cache = ImageCache::default();
        cache
            .insert(
                "unrelated".into(),
                crate::images::ImageAsset::from_bytes(crate::images::tests::png([1, 2, 3, 255]))
                    .unwrap(),
            )
            .unwrap();
        let target = tempfile::tempdir().unwrap();
        let export = snapshot(p.clone(), cache, AudioCache::default())
            .unwrap()
            .write(target.path())
            .unwrap();
        assert_eq!(export.image_count, 0);
        assert!(!Path::new(&export.path).join("images").exists());
        let mut invalid = p;
        let path = target.path().join("source.png");
        fs::write(&path, crate::images::tests::png([1, 2, 3, 255])).unwrap();
        invalid = session
            .import_image(invalid.revision, invalid.bones[0].id, &path)
            .unwrap();
        assert_eq!(
            snapshot(invalid, ImageCache::default(), AudioCache::default())
                .err()
                .unwrap()
                .code,
            "MissingImage"
        );
        assert_eq!(fs::read_dir(target.path()).unwrap().count(), 2);
    }
}
