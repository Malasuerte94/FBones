//! Native PNG resources, independent of scene/history mutation. Image bytes are
//! immutable and shared by save/history snapshots; they never cross IPC per frame.
use crate::project::AppError;
use base64::Engine;
use std::{
    collections::BTreeMap,
    fs,
    io::{Cursor, Read, Write},
    path::{Path, PathBuf},
    sync::Arc,
};

pub const MAX_PNG_BYTES: usize = 16 * 1024 * 1024;
pub const MAX_IMAGE_SIDE: u32 = 4096;
const MAX_DECODED_BYTES: usize = 64 * 1024 * 1024;
const MAX_CACHE_BYTES: usize = 128 * 1024 * 1024;
const MAX_CACHE_DECODED_BYTES: usize = 256 * 1024 * 1024;

fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("InvalidImage", message)
}

#[derive(Debug)]
pub struct ImageAsset {
    bytes: Arc<[u8]>,
    pub width: u32,
    pub height: u32,
}
impl ImageAsset {
    pub fn from_bytes(bytes: Vec<u8>) -> Result<Arc<Self>, AppError> {
        if bytes.len() > MAX_PNG_BYTES {
            return Err(invalid("PNG exceeds 16 MiB."));
        }
        let mut decoder = png::Decoder::new_with_limits(
            Cursor::new(&bytes),
            png::Limits {
                bytes: MAX_DECODED_BYTES,
            },
        );
        decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
        let mut reader = decoder
            .read_info()
            .map_err(|e| invalid(format!("Invalid PNG: {e}")))?;
        let (width, height) = (reader.info().width, reader.info().height);
        if width == 0 || height == 0 || width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE {
            return Err(invalid("PNG dimensions must be between 1 and 4096 pixels."));
        }
        if reader.info().animation_control.is_some() {
            return Err(invalid(
                "Import a still PNG; animated PNG is not supported.",
            ));
        }
        let count = reader
            .output_buffer_size()
            .filter(|n| *n <= MAX_DECODED_BYTES)
            .ok_or_else(|| invalid("PNG decoded data exceeds 64 MiB."))?;
        // Decoding validates the actual pixels/CRC, not just an easily forged IHDR.
        let mut decoded = vec![0; count];
        reader
            .next_frame(&mut decoded)
            .map_err(|e| invalid(format!("Invalid PNG pixels: {e}")))?;
        reader
            .finish()
            .map_err(|e| invalid(format!("Incomplete PNG: {e}")))?;
        drop(reader);
        Ok(Arc::new(Self {
            bytes: bytes.into(),
            width,
            height,
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
            "data:image/png;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(&self.bytes)
        )
    }
}

fn read_bounded(path: &Path) -> Result<Vec<u8>, AppError> {
    let file = fs::File::open(path)?;
    if !file.metadata()?.is_file() {
        return Err(invalid("Expected an image file."));
    }
    let mut bytes = Vec::new();
    file.take((MAX_PNG_BYTES + 1) as u64)
        .read_to_end(&mut bytes)?;
    if bytes.len() > MAX_PNG_BYTES {
        return Err(invalid("PNG exceeds 16 MiB."));
    }
    Ok(bytes)
}

/// Portable relative asset keys may include folders, but never traversal,
/// drive prefixes, empty segments, Windows aliases or backslashes.
pub fn valid_image_stem(stem: &str) -> bool {
    !stem.is_empty() && stem.len() <= 512 && stem.split('/').all(valid_component)
}
fn valid_component(stem: &str) -> bool {
    if stem.is_empty()
        || stem.len() > 128
        || stem.ends_with(['.', ' '])
        || stem == "."
        || stem == ".."
        || stem
            .chars()
            .any(|c| c.is_control() || "<>:\"/\\|?*".contains(c))
    {
        return false;
    }
    let reserved = stem
        .split('.')
        .next()
        .unwrap_or_default()
        .trim_end_matches(' ')
        .to_ascii_uppercase();
    !matches!(
        reserved.as_str(),
        "CON" | "PRN" | "AUX" | "NUL" | "CONIN$" | "CONOUT$"
    ) && !["COM", "LPT"].iter().any(|prefix| {
        reserved.strip_prefix(prefix).is_some_and(|suffix| {
            matches!(
                suffix,
                "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³"
            )
        })
    })
}

#[derive(Clone, Default)]
pub struct ImageCache {
    assets: BTreeMap<String, Arc<ImageAsset>>,
    bytes: usize,
    decoded_bytes: usize,
}
impl ImageCache {
    pub fn entries(&self) -> impl Iterator<Item = (&String, &Arc<ImageAsset>)> {
        self.assets.iter()
    }
    pub fn get(&self, stem: &str) -> Option<&Arc<ImageAsset>> {
        self.assets.get(stem)
    }
    pub fn insert(&mut self, stem: String, image: Arc<ImageAsset>) -> Result<(), AppError> {
        if !valid_image_stem(&stem) {
            return Err(invalid("Image name is not portable."));
        }
        if let Some((name, existing)) = self
            .assets
            .iter()
            .find(|(name, _)| name.to_lowercase() == stem.to_lowercase())
        {
            if *name == stem && existing.bytes() == image.bytes() {
                return Ok(());
            }
            return Err(AppError::new(
                "ImageCollision",
                "A different image already uses this name.",
            ));
        }
        // Compare physical path components including the .png suffix, so both
        // folder-case aliases and file-versus-directory aliases are rejected.
        let physical = |key: &str| {
            let mut parts: Vec<String> = key.split('/').map(str::to_owned).collect();
            parts.last_mut().unwrap().push_str(".png");
            parts
        };
        let incoming = physical(&stem);
        for key in self.assets.keys() {
            let existing = physical(key);
            for i in 0..incoming.len().min(existing.len()) {
                if incoming[i].to_lowercase() != existing[i].to_lowercase() {
                    break;
                }
                if incoming[i] != existing[i]
                    || (i + 1 == incoming.len().min(existing.len())
                        && incoming.len() != existing.len())
                {
                    return Err(AppError::new(
                        "ImageCollision",
                        "Image paths contain conflicting capitalization or file/folder aliases.",
                    ));
                }
            }
        }
        let decoded_bytes = image.width as usize * image.height as usize * 4;
        if self.bytes + image.bytes().len() > MAX_CACHE_BYTES
            || self.decoded_bytes + decoded_bytes > MAX_CACHE_DECODED_BYTES
        {
            return Err(invalid(
                "Image cache exceeds its memory budget (128 MiB PNG / 256 MiB decoded).",
            ));
        }
        self.bytes += image.bytes().len();
        self.decoded_bytes += decoded_bytes;
        self.assets.insert(stem, image);
        Ok(())
    }
    pub fn unique_stem(&self, proposed: &str) -> String {
        let clean: String = proposed
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c == '-' || c == '_' {
                    c
                } else {
                    '_'
                }
            })
            .take(48)
            .collect();
        let clean = if valid_image_stem(&clean) {
            clean
        } else {
            "image".into()
        };
        let mut name = clean.clone();
        let mut suffix = 2;
        while self
            .assets
            .keys()
            .any(|key| key.to_lowercase() == name.to_lowercase())
        {
            name = format!("{clean}_{suffix}");
            suffix += 1;
        }
        name
    }
}

/// An immutable bundle for one save snapshot. Resolve every used name before
/// opening a destination dialog, then write these resources before project bytes.
#[derive(Default)]
pub struct ImageBundle(BTreeMap<String, Arc<ImageAsset>>);
impl ImageBundle {
    pub fn collect<'a>(
        names: impl IntoIterator<Item = &'a str>,
        cache: &ImageCache,
    ) -> Result<Self, AppError> {
        let mut assets = BTreeMap::new();
        for name in names {
            if !valid_image_stem(name) {
                return Err(invalid("Unsupported image path."));
            }
            let asset = cache.get(name).ok_or_else(|| {
                AppError::new("MissingImage", format!("Image {name}.png is unavailable."))
            })?;
            assets.insert(name.into(), Arc::clone(asset));
        }
        Ok(Self(assets))
    }
    pub fn write_to(&self, project_path: &Path) -> Result<(), AppError> {
        if self.0.is_empty() {
            return Ok(());
        }
        let directory = project_path
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
            .unwrap_or(Path::new("."))
            .join("images");
        if let Some(parent) = directory.parent() {
            if let Ok(entries) = fs::read_dir(parent) {
                for entry in entries {
                    let name = entry?.file_name();
                    if let Some(name) = name.to_str() {
                        if name != "images" && name.eq_ignore_ascii_case("images") {
                            return Err(AppError::new("ImageCollision","The target contains an Images folder with different capitalization."));
                        }
                    }
                }
            }
        }
        match fs::symlink_metadata(&directory) {
            Ok(meta) if !meta.file_type().is_dir() || meta.file_type().is_symlink() => {
                return Err(invalid("The images path must be a regular directory."))
            }
            Ok(_) => (),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
            Err(error) => return Err(error.into()),
        }
        let mut pending: Vec<(PathBuf, &Arc<ImageAsset>)> = vec![];
        for (name, image) in &self.0 {
            let relative = format!("{name}.png");
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
                                    return Err(AppError::new("ImageCollision",format!("{relative} conflicts with an existing path's capitalization.")));
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
                            "Image paths must use regular directories and files.",
                        ))
                    }
                    Ok(_) if last => {
                        if read_bounded(&cursor)? != image.bytes() {
                            return Err(AppError::new(
                                "ImageCollision",
                                format!("{relative} already contains a different image."),
                            ));
                        }
                    }
                    Ok(_) => (),
                    Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                        if last {
                            pending.push((cursor.clone(), image));
                        }
                    }
                    Err(e) => return Err(e.into()),
                }
            }
        }
        for (path, image) in pending {
            let parent = path.parent().unwrap();
            fs::create_dir_all(parent)?;
            let root_meta = fs::symlink_metadata(&directory)?;
            if root_meta.file_type().is_symlink() || !root_meta.is_dir() {
                return Err(invalid("Images directory changed while saving."));
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
                    return Err(invalid("Image folder changed while saving."));
                }
            }
            let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
            temporary.write_all(image.bytes())?;
            temporary.as_file().sync_all()?;
            if let Err(error) = temporary.persist_noclobber(&path) {
                if error.error.kind() != std::io::ErrorKind::AlreadyExists
                    || fs::symlink_metadata(&path)?.file_type().is_symlink()
                    || read_bounded(&path)? != image.bytes()
                {
                    return Err(AppError::new(
                        "ImageCollision",
                        "Image destination changed while saving.",
                    ));
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    pub(crate) fn png(color: [u8; 4]) -> Vec<u8> {
        let mut bytes = vec![];
        {
            let mut encoder = png::Encoder::new(&mut bytes, 2, 1);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().unwrap();
            writer.write_image_data(&[color, color].concat()).unwrap();
        }
        bytes
    }
    #[test]
    fn validates_pixels_crc_dimensions_and_truncation() {
        let bytes = png([1, 2, 3, 255]);
        let asset = ImageAsset::from_bytes(bytes.clone()).unwrap();
        assert_eq!((asset.width, asset.height), (2, 1));
        for end in 0..bytes.len() {
            assert!(ImageAsset::from_bytes(bytes[..end].to_vec()).is_err());
        }
        let mut corrupt = bytes.clone();
        corrupt[40] ^= 1;
        assert!(ImageAsset::from_bytes(corrupt).is_err());
        assert!(ImageAsset::from_bytes(vec![0; MAX_PNG_BYTES + 1]).is_err());
        let url = asset.data_url();
        assert_eq!(
            base64::engine::general_purpose::STANDARD
                .decode(url.strip_prefix("data:image/png;base64,").unwrap())
                .unwrap(),
            bytes
        );
    }
    #[test]
    fn resource_names_are_portable_and_case_insensitive_collisions_preserve_cache() {
        for name in [
            "../escape",
            "a\\b",
            "C:evil",
            "a.",
            "a ",
            "NUL",
            "con.png",
            "LPT1",
            "COM¹",
            "",
            ".",
            "..",
        ] {
            assert!(!valid_image_stem(name), "{name}");
        }
        assert!(valid_image_stem("parts/arm"));
        for key in ["/arm", "arm//part", "parts/../arm", "parts/CON", "parts/a."] {
            assert!(!valid_image_stem(key));
        }
        let asset = ImageAsset::from_bytes(png([1, 2, 3, 255])).unwrap();
        let mut cache = ImageCache::default();
        cache.insert("arm".into(), asset.clone()).unwrap();
        assert!(cache.insert("ARM".into(), asset.clone()).is_err());
        assert_eq!(cache.unique_stem("arm"), "arm_2");
        assert_eq!(cache.unique_stem("CON"), "image");
        let snapshot = cache.clone();
        assert!(Arc::ptr_eq(snapshot.get("arm").unwrap(), &asset));
        assert!(ImageBundle::collect(["missing"], &cache).is_err());
    }
    #[test]
    fn save_refuses_a_case_aliased_managed_images_root() {
        let target = tempfile::tempdir().unwrap();
        std::fs::create_dir(target.path().join("Images")).unwrap();
        let mut cache = ImageCache::default();
        cache
            .insert(
                "arm".into(),
                ImageAsset::from_bytes(png([1, 2, 3, 255])).unwrap(),
            )
            .unwrap();
        let bundle = ImageBundle::collect(["arm"], &cache).unwrap();
        assert!(bundle.write_to(&target.path().join("rig.fbones")).is_err());
        assert!(!target.path().join("images/arm.png").exists());
    }
    #[test]
    fn nested_assets_reject_component_case_and_file_folder_aliases_before_save() {
        let image = ImageAsset::from_bytes(png([1, 2, 3, 255])).unwrap();
        let mut cache = ImageCache::default();
        cache.insert("parts/arm".into(), image.clone()).unwrap();
        assert!(cache.insert("PARTS/leg".into(), image.clone()).is_err());
        cache.insert("foo".into(), image.clone()).unwrap();
        assert!(cache.insert("FOO.png/sub".into(), image.clone()).is_err());
        assert!(cache.insert("foo.png/sub".into(), image).is_err());
        assert_eq!(cache.entries().count(), 2);
    }
    #[test]
    fn saving_copies_resources_without_overwriting_existing_images_or_project() {
        let temp = tempfile::tempdir().unwrap();
        let asset = ImageAsset::from_bytes(png([1, 2, 3, 255])).unwrap();
        let mut cache = ImageCache::default();
        cache.insert("arm".into(), asset.clone()).unwrap();
        let bundle = ImageBundle::collect(["arm"], &cache).unwrap();
        let project = temp.path().join("project.fbones");
        fs::write(&project, b"original project").unwrap();
        bundle.write_to(&project).unwrap();
        bundle.write_to(&project).unwrap();
        assert_eq!(
            fs::read(temp.path().join("images/arm.png")).unwrap(),
            asset.bytes()
        );
        let other = tempfile::tempdir().unwrap();
        bundle.write_to(&other.path().join("copy.fbones")).unwrap();
        assert_eq!(
            fs::read(other.path().join("images/arm.png")).unwrap(),
            asset.bytes()
        );
        fs::write(
            temp.path().join("images/arm.png"),
            b"different existing image",
        )
        .unwrap();
        assert!(bundle.write_to(&project).is_err());
        assert_eq!(
            fs::read(temp.path().join("images/arm.png")).unwrap(),
            b"different existing image"
        );
        assert_eq!(fs::read(&project).unwrap(), b"original project");
    }
    #[cfg(unix)]
    #[test]
    fn saving_refuses_symlinked_resource_directory() {
        let project = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        std::os::unix::fs::symlink(outside.path(), project.path().join("images")).unwrap();
        let mut cache = ImageCache::default();
        cache
            .insert(
                "arm".into(),
                ImageAsset::from_bytes(png([1, 2, 3, 255])).unwrap(),
            )
            .unwrap();
        assert!(ImageBundle::collect(["arm"], &cache)
            .unwrap()
            .write_to(&project.path().join("project.fbones"))
            .is_err());
        assert!(!outside.path().join("arm.png").exists());
    }
}
