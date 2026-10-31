//! Folder-backed image inventory. Browsing never creates scene slots or writes
//! to source folders. Only validated portable relative PNG keys enter the cache.
use crate::{
    images::{valid_image_stem, ImageAsset, ImageCache},
    project::AppError,
};
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryImage {
    pub key: String,
    pub width: u32,
    pub height: u32,
}
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryView {
    pub root: String,
    pub images: Vec<LibraryImage>,
    pub warnings: Vec<String>,
}
pub fn view(root: &str, cache: &ImageCache, warnings: &[String]) -> LibraryView {
    LibraryView {
        root: root.into(),
        images: cache
            .entries()
            .map(|(key, a)| LibraryImage {
                key: key.clone(),
                width: a.width,
                height: a.height,
            })
            .collect(),
        warnings: warnings.into(),
    }
}
pub fn directory(project: Option<&Path>, root: &str) -> PathBuf {
    let source = Path::new(root);
    if source.is_absolute() {
        source.into()
    } else {
        project
            .and_then(Path::parent)
            .unwrap_or(Path::new("."))
            .join(source)
    }
}
pub fn scan(root: &Path) -> Result<(ImageCache, Vec<String>), AppError> {
    let meta = fs::symlink_metadata(root)?;
    if !meta.is_dir() || meta.file_type().is_symlink() {
        return Err(AppError::new(
            "InvalidFolder",
            "Choose a regular images folder.",
        ));
    }
    let mut cache = ImageCache::default();
    let mut warnings = vec![];
    let mut pending = vec![(root.to_owned(), String::new(), 0usize)];
    let mut seen = 0usize;
    while let Some((path, prefix, depth)) = pending.pop() {
        let mut children = fs::read_dir(path)?.collect::<Result<Vec<_>, _>>()?;
        children.sort_by_key(|e| e.file_name());
        for entry in children {
            seen += 1;
            if seen > 8192 {
                return Err(AppError::new(
                    "FolderLimit",
                    "The images folder exceeds 8192 entries.",
                ));
            }
            let kind = entry.file_type()?;
            let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
                warnings.push("Skipped a non-Unicode filename.".into());
                continue;
            };
            let relative = if prefix.is_empty() {
                name.clone()
            } else {
                format!("{prefix}/{name}")
            };
            if kind.is_symlink() {
                warnings.push(format!("Skipped symbolic link: {relative}"));
                continue;
            }
            if kind.is_dir() {
                if depth < 16 {
                    pending.push((entry.path(), relative, depth + 1));
                } else {
                    warnings.push(format!("Skipped deep folder: {relative}"));
                }
                continue;
            }
            if !kind.is_file()
                || !entry
                    .path()
                    .extension()
                    .is_some_and(|e| e.eq_ignore_ascii_case("png"))
            {
                continue;
            }
            let stem = relative[..relative.len() - 4].to_owned();
            if !valid_image_stem(&stem) {
                warnings.push(format!("Skipped non-portable image path: {relative}"));
                continue;
            }
            if cache.entries().count() >= 2048 {
                return Err(AppError::new(
                    "FolderLimit",
                    "The images folder exceeds 2048 PNG files.",
                ));
            }
            let image = match ImageAsset::read(&entry.path()) {
                Ok(image) => image,
                Err(error) => {
                    warnings.push(format!("{relative}: {}", error.message));
                    continue;
                }
            };
            // A collision or memory limit must not produce a silently incomplete
            // successful selection. The caller preserves its previous library.
            cache.insert(stem, image)?;
        }
    }
    warnings.truncate(64);
    Ok((cache, warnings))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn folder_inventory_retains_nested_keys_and_does_not_create_or_modify_files() {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir(temp.path().join("parts")).unwrap();
        let bytes = crate::images::tests::png([1, 2, 3, 255]);
        fs::write(temp.path().join("parts/arm.PNG"), &bytes).unwrap();
        fs::write(temp.path().join("bad.png"), b"not png").unwrap();
        fs::write(temp.path().join("note.txt"), b"unchanged").unwrap();
        let (cache, warnings) = scan(temp.path()).unwrap();
        assert_eq!(cache.entries().count(), 1);
        assert!(cache.get("parts/arm").is_some());
        assert_eq!(warnings.len(), 1);
        assert_eq!(fs::read(temp.path().join("parts/arm.PNG")).unwrap(), bytes);
        assert!(!temp.path().join("images").exists());
    }
    #[cfg(unix)]
    #[test]
    fn folder_scan_does_not_follow_links() {
        let temp = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        fs::write(
            outside.path().join("secret.png"),
            crate::images::tests::png([0, 0, 0, 255]),
        )
        .unwrap();
        std::os::unix::fs::symlink(outside.path(), temp.path().join("link")).unwrap();
        let (cache, warnings) = scan(temp.path()).unwrap();
        assert_eq!(cache.entries().count(), 0);
        assert_eq!(warnings.len(), 1);
    }
}
