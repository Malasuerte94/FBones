//! Bounded own WAV resources. Encoded bytes are immutable and shared by history.
//! First supported playback resource profile: RIFF/WAVE PCM16, mono or stereo.
use crate::project::AppError;
use base64::Engine;
use serde::Serialize;
use std::{
    collections::BTreeMap,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Arc,
};
const MAX_WAV_BYTES: usize = 16 * 1024 * 1024;
const MAX_CACHE_BYTES: usize = 64 * 1024 * 1024;
fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("InvalidAudio", message)
}
pub fn valid_key(key: &str) -> bool {
    crate::images::valid_image_stem(key)
        && key
            .rsplit('.')
            .next()
            .is_some_and(|e| e.eq_ignore_ascii_case("wav"))
}
fn read_bounded(path: &Path) -> Result<Vec<u8>, AppError> {
    let meta = fs::symlink_metadata(path)?;
    if meta.file_type().is_symlink() || !meta.is_file() {
        return Err(invalid("Audio resources must be regular files."));
    }
    let mut bytes = vec![];
    fs::File::open(path)?
        .take((MAX_WAV_BYTES + 1) as u64)
        .read_to_end(&mut bytes)?;
    if bytes.len() > MAX_WAV_BYTES {
        return Err(invalid("WAV exceeds16MiB."));
    }
    Ok(bytes)
}
#[derive(Debug)]
pub struct AudioAsset {
    bytes: Arc<[u8]>,
    pub channels: u16,
    pub sample_rate: u32,
    pub frames: u32,
    pub peak: f32,
}
impl AudioAsset {
    pub fn from_bytes(bytes: Vec<u8>) -> Result<Arc<Self>, AppError> {
        if bytes.len() < 12
            || bytes.len() > MAX_WAV_BYTES
            || &bytes[..4] != b"RIFF"
            || &bytes[8..12] != b"WAVE"
            || u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize != bytes.len() - 8
        {
            return Err(invalid("Choose a complete bounded RIFF/WAVE file."));
        }
        let mut format = None;
        let mut data = None;
        let mut cursor = 12;
        while cursor < bytes.len() {
            if bytes.len() - cursor < 8 {
                return Err(invalid("WAV chunk header is truncated."));
            }
            let size =
                u32::from_le_bytes(bytes[cursor + 4..cursor + 8].try_into().unwrap()) as usize;
            let start = cursor + 8;
            let end = start
                .checked_add(size)
                .filter(|end| *end <= bytes.len())
                .ok_or_else(|| invalid("WAV chunk exceeds the file."))?;
            match &bytes[cursor..cursor + 4] {
                b"fmt " => {
                    if format.is_some()
                        || !(size == 16 || size == 18 && bytes[end - 2..end] == [0, 0])
                    {
                        return Err(invalid("Use standard PCM16 WAV format metadata."));
                    }
                    let fmt = &bytes[start..end];
                    let tag = u16::from_le_bytes(fmt[0..2].try_into().unwrap());
                    let channels = u16::from_le_bytes(fmt[2..4].try_into().unwrap());
                    let rate = u32::from_le_bytes(fmt[4..8].try_into().unwrap());
                    let byte_rate = u32::from_le_bytes(fmt[8..12].try_into().unwrap());
                    let align = u16::from_le_bytes(fmt[12..14].try_into().unwrap());
                    let bits = u16::from_le_bytes(fmt[14..16].try_into().unwrap());
                    if tag != 1
                        || !(1..=2).contains(&channels)
                        || !(8000..=192000).contains(&rate)
                        || bits != 16
                        || align != channels * 2
                        || byte_rate != rate * u32::from(align)
                    {
                        return Err(invalid(
                            "Supported WAV resources are PCM16 mono/stereo at8–192kHz.",
                        ));
                    }
                    format = Some((channels, rate, align));
                }
                b"data" => {
                    if data.replace((start, end)).is_some() {
                        return Err(invalid("Use one WAV sample-data chunk."));
                    }
                }
                _ => {}
            }
            cursor = end
                .checked_add(size % 2)
                .filter(|end| *end <= bytes.len())
                .ok_or_else(|| invalid("WAV padding is truncated."))?;
        }
        let (channels, sample_rate, align) =
            format.ok_or_else(|| invalid("WAV format chunk is missing."))?;
        let (start, end) = data.ok_or_else(|| invalid("WAV data chunk is missing."))?;
        let size = end - start;
        if size == 0 || size % usize::from(align) != 0 {
            return Err(invalid(
                "WAV samples must contain complete nonempty audio frames.",
            ));
        }
        // Decode every PCM sample for validation/metadata; preserve original file bytes.
        let peak = bytes[start..end]
            .chunks_exact(2)
            .map(|p| f32::from(i16::from_le_bytes([p[0], p[1]])) / 32768.)
            .map(f32::abs)
            .fold(0., f32::max);
        Ok(Arc::new(Self {
            channels,
            sample_rate,
            frames: (size / usize::from(align)) as u32,
            peak,
            bytes: bytes.into(),
        }))
    }
    pub fn read(path: &Path) -> Result<Arc<Self>, AppError> {
        Self::from_bytes(read_bounded(path)?)
    }
    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }
    pub fn data_url(&self) -> String {
        format!(
            "data:audio/wav;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(&self.bytes)
        )
    }
}
#[derive(Clone, Default)]
pub struct AudioCache {
    assets: BTreeMap<String, Arc<AudioAsset>>,
    bytes: usize,
}
impl AudioCache {
    pub fn entries(&self) -> impl Iterator<Item = (&String, &Arc<AudioAsset>)> {
        self.assets.iter()
    }
    pub fn get(&self, key: &str) -> Option<&Arc<AudioAsset>> {
        self.assets.get(key)
    }
    pub fn insert(&mut self, key: String, asset: Arc<AudioAsset>) -> Result<(), AppError> {
        if !valid_key(&key) {
            return Err(invalid("Choose a portable relative WAV filename."));
        }
        for (name, other) in &self.assets {
            if name.to_lowercase() == key.to_lowercase() {
                if name == &key && other.bytes() == asset.bytes() {
                    return Ok(());
                }
                return Err(invalid(
                    "Audio names contain a capitalization or content collision.",
                ));
            }
            let a = key.split('/').collect::<Vec<_>>();
            let b = name.split('/').collect::<Vec<_>>();
            for i in 0..a.len().min(b.len()) {
                if a[i].to_lowercase() != b[i].to_lowercase() {
                    break;
                }
                if a[i] != b[i] || i + 1 == a.len().min(b.len()) && a.len() != b.len() {
                    return Err(invalid(
                        "Audio paths contain file/folder or capitalization aliases.",
                    ));
                }
            }
        }
        if self.assets.len() >= 256 || self.bytes + asset.bytes().len() > MAX_CACHE_BYTES {
            return Err(invalid("Audio library exceeds256files/64MiB."));
        }
        self.bytes += asset.bytes().len();
        self.assets.insert(key, asset);
        Ok(())
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFileView {
    pub key: String,
    pub channels: u16,
    pub sample_rate: u32,
    pub frames: u32,
    pub duration: f64,
    pub peak: f32,
}
#[derive(Clone, Debug, Default, Serialize)]
pub struct AudioLibraryView {
    pub root: String,
    pub sounds: Vec<AudioFileView>,
    pub warnings: Vec<String>,
}
pub fn view(root: &str, cache: &AudioCache, warnings: &[String]) -> AudioLibraryView {
    AudioLibraryView {
        root: root.into(),
        sounds: cache
            .entries()
            .map(|(key, a)| AudioFileView {
                key: key.clone(),
                channels: a.channels,
                sample_rate: a.sample_rate,
                frames: a.frames,
                duration: f64::from(a.frames) / f64::from(a.sample_rate),
                peak: a.peak,
            })
            .collect(),
        warnings: warnings.to_vec(),
    }
}
pub fn scan(folder: &Path) -> Result<(AudioCache, Vec<String>), AppError> {
    let meta = fs::symlink_metadata(folder)?;
    if meta.file_type().is_symlink() || !meta.is_dir() {
        return Err(invalid("Choose a regular audio directory."));
    }
    let root = folder.canonicalize()?;
    let mut cache = AudioCache::default();
    let mut warnings = vec![];
    let mut pending = vec![(folder.to_owned(), 0)];
    let mut count = 0;
    while let Some((dir, depth)) = pending.pop() {
        if depth > 16 {
            return Err(invalid("Audio directory nesting exceeds16levels."));
        }
        let mut entries = fs::read_dir(&dir)?.collect::<Result<Vec<_>, _>>()?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            count += 1;
            if count > 4096 {
                return Err(invalid("Audio directory scan exceeds4096entries."));
            }
            let path = entry.path();
            let metadata = fs::symlink_metadata(&path)?;
            if metadata.file_type().is_symlink() {
                warnings.push("Skipped a symbolic link in Audio.".into());
                continue;
            }
            if metadata.is_dir() {
                pending.push((path, depth + 1));
                continue;
            }
            if !metadata.is_file()
                || !path
                    .extension()
                    .is_some_and(|e| e.eq_ignore_ascii_case("wav"))
            {
                continue;
            }
            let key = path
                .strip_prefix(folder)
                .unwrap()
                .to_string_lossy()
                .replace('\\', "/");
            if !valid_key(&key) || !path.canonicalize()?.starts_with(&root) {
                warnings.push("Skipped a non-portable audio path.".into());
                continue;
            }
            match AudioAsset::read(&path) {
                Ok(asset) => cache.insert(key, asset)?,
                Err(error) => warnings.push(format!("Skipped {key}: {}", error.message)),
            }
        }
    }
    Ok((cache, warnings))
}
#[derive(Default)]
pub struct AudioBundle(BTreeMap<String, Arc<AudioAsset>>);
impl AudioBundle {
    pub fn collect(cache: &AudioCache) -> Self {
        Self(
            cache
                .entries()
                .map(|(key, a)| (key.clone(), Arc::clone(a)))
                .collect(),
        )
    }
    pub fn write_to(&self, project_path: &Path) -> Result<(), AppError> {
        if self.0.is_empty() {
            return Ok(());
        }
        let directory = project_path
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
            .unwrap_or(Path::new("."))
            .join("audio");
        if let Some(parent) = directory.parent() {
            if let Ok(entries) = fs::read_dir(parent) {
                for entry in entries {
                    let name = entry?.file_name();
                    if let Some(name) = name.to_str() {
                        if name != "audio" && name.eq_ignore_ascii_case("audio") {
                            return Err(AppError::new("AudioCollision","The target contains an Audio folder with different capitalization."));
                        }
                    }
                }
            }
        }
        match fs::symlink_metadata(&directory) {
            Ok(meta) if !meta.file_type().is_dir() || meta.file_type().is_symlink() => {
                return Err(invalid("The audio path must be a regular directory."))
            }
            Ok(_) => (),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
            Err(error) => return Err(error.into()),
        }
        let mut pending: Vec<(PathBuf, &Arc<AudioAsset>)> = vec![];
        for (name, audio) in &self.0 {
            let relative = name.clone();
            let mut cursor = directory.clone();
            let parts: Vec<_> = relative.split('/').collect();
            for (i, part) in parts.iter().enumerate() {
                let last = i + 1 == parts.len();
                match fs::read_dir(&cursor) {
                    Ok(entries) => {
                        for entry in entries {
                            let entry = entry?;
                            if let Some(existing) = entry.file_name().to_str() {
                                if existing != *part
                                    && existing.to_lowercase() == part.to_lowercase()
                                {
                                    return Err(AppError::new("AudioCollision",format!("{relative} conflicts with an existing path's capitalization.")));
                                }
                            }
                        }
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
                    Err(e) => return Err(e.into()),
                }
                cursor.push(part);
                match fs::symlink_metadata(&cursor) {
                    Ok(meta)
                        if meta.file_type().is_symlink()
                            || (last && !meta.is_file())
                            || (!last && !meta.is_dir()) =>
                    {
                        return Err(invalid(
                            "Audio paths must use regular directories and files.",
                        ))
                    }
                    Ok(_) if last => {
                        if read_bounded(&cursor)? != audio.bytes() {
                            return Err(AppError::new(
                                "AudioCollision",
                                format!("{relative} already contains a different audio."),
                            ));
                        }
                    }
                    Ok(_) => (),
                    Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                        if last {
                            pending.push((cursor.clone(), audio));
                        }
                    }
                    Err(e) => return Err(e.into()),
                }
            }
        }
        for (path, audio) in pending {
            let parent = path.parent().unwrap();
            fs::create_dir_all(parent)?;
            let root_meta = fs::symlink_metadata(&directory)?;
            if root_meta.file_type().is_symlink() || !root_meta.is_dir() {
                return Err(invalid("Audio directory changed while saving."));
            }
            // Recheck components after creation, including races with symlinks.
            let mut cursor = directory.clone();
            for part in path
                .strip_prefix(&directory)
                .unwrap()
                .parent()
                .unwrap()
                .components()
            {
                cursor.push(part);
                let meta = fs::symlink_metadata(&cursor)?;
                if meta.file_type().is_symlink() || !meta.is_dir() {
                    return Err(invalid("Audio folder changed while saving."));
                }
            }
            let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
            temporary.write_all(audio.bytes())?;
            temporary.as_file().sync_all()?;
            if let Err(error) = temporary.persist_noclobber(&path) {
                if error.error.kind() != std::io::ErrorKind::AlreadyExists
                    || fs::symlink_metadata(&path)?.file_type().is_symlink()
                    || read_bounded(&path)? != audio.bytes()
                {
                    return Err(AppError::new(
                        "AudioCollision",
                        "Audio destination changed while saving.",
                    ));
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project::{new_document, open_document, Session};
    use serde_json::json;
    fn wav(samples: &[i16]) -> Vec<u8> {
        let mut b = vec![];
        b.extend(b"RIFF");
        b.extend((36 + samples.len() as u32 * 2).to_le_bytes());
        b.extend(b"WAVEfmt ");
        b.extend(16u32.to_le_bytes());
        b.extend(1u16.to_le_bytes());
        b.extend(1u16.to_le_bytes());
        b.extend(22050u32.to_le_bytes());
        b.extend(44100u32.to_le_bytes());
        b.extend(2u16.to_le_bytes());
        b.extend(16u16.to_le_bytes());
        b.extend(b"data");
        b.extend((samples.len() as u32 * 2).to_le_bytes());
        for sample in samples {
            b.extend(sample.to_le_bytes());
        }
        b
    }
    fn summary(s: &Session) -> crate::project::ProjectSummary {
        s.summary().unwrap().unwrap()
    }
    fn edit(s: &Session, value: serde_json::Value) -> crate::project::ProjectSummary {
        s.edit(summary(s).revision, serde_json::from_value(value).unwrap())
            .unwrap()
    }
    #[test]
    fn bounded_pcm16_decode_validates_frames_samples_and_retains_original_bytes() {
        let bytes = wav(&[0, 32767, -32768, 16384]);
        let asset = AudioAsset::from_bytes(bytes.clone()).unwrap();
        assert_eq!(asset.frames, 4);
        assert_eq!(asset.channels, 1);
        assert_eq!(asset.sample_rate, 22050);
        assert_eq!(asset.peak, 1.);
        assert_eq!(
            base64::engine::general_purpose::STANDARD
                .decode(
                    asset
                        .data_url()
                        .strip_prefix("data:audio/wav;base64,")
                        .unwrap()
                )
                .unwrap(),
            bytes
        );
        for end in 0..bytes.len() {
            assert!(AudioAsset::from_bytes(bytes[..end].to_vec()).is_err());
        }
        for (at, value) in [(20, 3), (22, 0), (32, 4), (34, 8), (40, 7)] {
            let mut bad = bytes.clone();
            bad[at] = value;
            assert!(AudioAsset::from_bytes(bad).is_err());
        }
        assert!(AudioAsset::from_bytes(vec![0; MAX_WAV_BYTES + 1]).is_err());
    }
    #[test]
    fn safe_wav_scan_and_cache_reject_aliases_and_skip_unsupported_samples() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("nested")).unwrap();
        let bytes = wav(&[1, -2, 3]);
        fs::write(dir.path().join("nested/tone.wav"), &bytes).unwrap();
        fs::write(dir.path().join("bad.wav"), b"invalid").unwrap();
        fs::write(dir.path().join("ignored.mp3"), b"not supported").unwrap();
        let (cache, warnings) = scan(dir.path()).unwrap();
        assert_eq!(cache.entries().count(), 1);
        assert_eq!(warnings.len(), 1);
        let asset = cache.get("nested/tone.wav").unwrap();
        let mut c = cache.clone();
        assert!(c.insert("Nested/tone.wav".into(), asset.clone()).is_err());
        assert!(c
            .insert("nested/tone.wav/more.wav".into(), asset.clone())
            .is_err());
        for key in [
            "../tone.wav",
            "/tone.wav",
            "CON.wav",
            "a\\b.wav",
            "a/../b.wav",
            "a.wav ",
            "a.mp3",
        ] {
            assert!(!valid_key(key), "{key}");
        }
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(
                dir.path().join("nested/tone.wav"),
                dir.path().join("link.wav"),
            )
            .unwrap();
            let (scanned, warnings) = scan(dir.path()).unwrap();
            assert!(scanned.get("link.wav").is_none());
            assert_eq!(warnings.len(), 2);
        }
    }
    #[test]
    fn native_audio_folder_generation_portable_save_reopen_and_undo_preserve_safe_wav_bytes() {
        let dir = tempfile::tempdir().unwrap();
        let input = dir.path().join("source");
        fs::create_dir_all(input.join("tones")).unwrap();
        let bytes = wav(&[0, 32767, -32768, 8000]);
        fs::write(input.join("tones/tone.wav"), &bytes).unwrap();
        let s = Session::default();
        s.replace(new_document("Own safe audio".into()).unwrap(), false)
            .unwrap();
        let before = summary(&s);
        let loaded = s.select_audio_folder(before.revision, &input).unwrap();
        assert_ne!(loaded.document_id, before.document_id);
        assert_eq!(loaded.audio_library.sounds[0].key, "tones/tone.wav");
        assert_eq!(loaded.audio_library.sounds[0].peak, 1.);
        assert!(s.audio_data(before.document_id, "tones/tone.wav").is_err());
        let event = edit(&s, json!({"type":"createEvent","name":"Tone"}))
            .edited_event
            .unwrap();
        edit(
            &s,
            json!({"type":"updateEvent","id":event,"audio":"tones/tone.wav","volume":0.6,"balance":-0.25}),
        );
        edit(&s, json!({"type":"renameEvent","id":event,"name":"Cue"}));
        let output = dir.path().join("portable/project.fbones");
        let saved = s
            .save_snapshot(s.prepare_save(true).unwrap(), output.clone())
            .unwrap();
        assert_eq!(saved.audio_root, "./audio");
        assert_eq!(
            fs::read(dir.path().join("portable/audio/tones/tone.wav")).unwrap(),
            bytes
        );
        fs::remove_dir_all(&input).unwrap();
        let undone = edit(&s, json!({"type":"undo"}));
        assert_eq!(undone.audio_root, "./audio");
        assert_eq!(undone.events[0].name, "Tone");
        s.save_snapshot(s.prepare_save(false).unwrap(), output.clone())
            .unwrap();
        s.close(false).unwrap();
        let reopened = s.replace(open_document(output).unwrap(), false).unwrap();
        assert_eq!(reopened.events[0].audio, "tones/tone.wav");
        assert_eq!(reopened.events[0].volume, 0.6);
        assert_eq!(reopened.events[0].balance, -0.25);
        assert_eq!(reopened.audio_library.sounds[0].frames, 4);
        let data = s
            .audio_data(reopened.document_id, "tones/tone.wav")
            .unwrap();
        assert_eq!(
            base64::engine::general_purpose::STANDARD
                .decode(data.strip_prefix("data:audio/wav;base64,").unwrap())
                .unwrap(),
            bytes
        );
    }
    #[test]
    fn missing_collision_and_stale_audio_saves_preserve_project_bytes_and_dirty_state() {
        let dir = tempfile::tempdir().unwrap();
        let s = Session::default();
        s.replace(new_document("Own audio failures".into()).unwrap(), false)
            .unwrap();
        let event = edit(&s, json!({"type":"createEvent","name":"Cue"}))
            .edited_event
            .unwrap();
        edit(
            &s,
            json!({"type":"updateEvent","id":event,"audio":"tone.wav"}),
        );
        let output = dir.path().join("target/project.fbones");
        fs::create_dir_all(output.parent().unwrap()).unwrap();
        fs::write(&output, b"preserve").unwrap();
        let snapshot = s.prepare_save(true).unwrap();
        assert_eq!(
            s.save_snapshot(snapshot, output.clone()).unwrap_err().code,
            "MissingAudio"
        );
        assert_eq!(fs::read(&output).unwrap(), b"preserve");
        assert!(summary(&s).dirty);
        let source = dir.path().join("source");
        fs::create_dir(&source).unwrap();
        fs::write(source.join("tone.wav"), wav(&[1, 2, 3])).unwrap();
        s.select_audio_folder(summary(&s).revision, &source)
            .unwrap();
        fs::create_dir(output.parent().unwrap().join("audio")).unwrap();
        fs::write(
            output.parent().unwrap().join("audio/tone.wav"),
            wav(&[4, 5, 6]),
        )
        .unwrap();
        assert!(s
            .save_snapshot(s.prepare_save(true).unwrap(), output.clone())
            .is_err());
        assert_eq!(fs::read(&output).unwrap(), b"preserve");
        assert_eq!(
            fs::read(output.parent().unwrap().join("audio/tone.wav")).unwrap(),
            wav(&[4, 5, 6])
        );
        assert!(summary(&s).dirty);
        let snapshot = s.prepare_save(true).unwrap();
        edit(
            &s,
            json!({"type":"renameEvent","id":event,"name":"Changed"}),
        );
        assert_eq!(
            s.save_snapshot(snapshot, output.clone()).unwrap_err().code,
            "ProjectChanged"
        );
        assert_eq!(fs::read(&output).unwrap(), b"preserve");
    }
    #[cfg(unix)]
    #[test]
    fn portable_audio_save_rejects_symlink_destinations_without_writing_outside() {
        let target = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        std::os::unix::fs::symlink(outside.path(), target.path().join("audio")).unwrap();
        let mut cache = AudioCache::default();
        cache
            .insert(
                "tone.wav".into(),
                AudioAsset::from_bytes(wav(&[1, 2])).unwrap(),
            )
            .unwrap();
        assert!(AudioBundle::collect(&cache)
            .write_to(&target.path().join("project.fbones"))
            .is_err());
        assert!(!outside.path().join("tone.wav").exists());
    }
}
