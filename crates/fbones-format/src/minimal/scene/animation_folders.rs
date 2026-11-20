use super::super::{group, object, text, Field, Object};
use super::{animation::animation_label, SceneProject};
use crate::FormatError;
use std::borrow::Cow;
use std::collections::HashSet;

pub(super) const ROOT_GROUP_LABEL: &str = "animation-folder-root";
pub(in crate::minimal) const FOLDER_GROUP_MODE: u32 = 7;
pub(in crate::minimal) const MAX_ANIMATION_FOLDERS: usize = 64;

/// Editor tree order, independent of the flat animation list on the skeleton.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AnimationFolderLayout {
    pub entries: Vec<AnimationFolderEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AnimationFolderEntry {
    Clip(usize),
    Folder(AnimationFolder),
}

/// A named Group108 with clip members in their stored order.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AnimationFolder {
    pub name: String,
    pub clips: Vec<usize>,
}

impl AnimationFolderLayout {
    pub(super) fn folders(&self) -> impl Iterator<Item = &AnimationFolder> {
        self.entries.iter().filter_map(|entry| match entry {
            AnimationFolderEntry::Folder(folder) => Some(folder),
            AnimationFolderEntry::Clip(_) => None,
        })
    }
}

impl SceneProject {
    pub fn animation_folder_name(&self, index: usize) -> Option<&str> {
        self.animation_folders
            .as_ref()?
            .folders()
            .find(|folder| folder.clips.contains(&index))
            .map(|folder| folder.name.as_str())
    }

    /// Spine runtime names qualify the stored leaf with its editor folder.
    pub fn qualified_animation_name(&self, index: usize) -> Option<Cow<'_, str>> {
        let leaf = &self.animations.get(index)?.name;
        Some(match self.animation_folder_name(index) {
            Some(folder) => Cow::Owned(format!("{folder}/{leaf}")),
            None => Cow::Borrowed(leaf),
        })
    }
}

pub(super) fn validate(p: &SceneProject) -> Result<(), FormatError> {
    let Some(layout) = &p.animation_folders else {
        return Ok(());
    };
    let invalid = || FormatError::UnsupportedProfile;
    if layout.entries.len() > MAX_ANIMATION_FOLDERS + p.animations.len() {
        return Err(invalid());
    }
    let mut seen_clips = HashSet::new();
    let mut seen_folders = HashSet::new();
    for entry in &layout.entries {
        match entry {
            AnimationFolderEntry::Clip(index) => {
                if *index >= p.animations.len() || !seen_clips.insert(*index) {
                    return Err(invalid());
                }
            }
            AnimationFolderEntry::Folder(folder) => {
                let name = &folder.name;
                if name.is_empty()
                    || name.len() > 1024
                    || name.contains('/')
                    || name.chars().any(char::is_control)
                    || !seen_folders.insert(name)
                    || seen_folders.len() > MAX_ANIMATION_FOLDERS
                    || folder.clips.len() > p.animations.len()
                {
                    return Err(invalid());
                }
                for &index in &folder.clips {
                    let clip = p.animations.get(index).ok_or_else(invalid)?;
                    if clip.name.contains('/') || !seen_clips.insert(index) {
                        return Err(invalid());
                    }
                }
            }
        }
    }
    if seen_clips.len() != p.animations.len() || seen_folders.is_empty() {
        return Err(invalid());
    }
    Ok(())
}

pub(super) fn folder_group_label(folder: usize) -> String {
    format!("animation-folder-{folder}")
}

pub(super) fn animation_group_link(layout: &AnimationFolderLayout, index: usize) -> Object {
    let label = layout
        .folders()
        .position(|folder| folder.clips.contains(&index))
        .map_or_else(|| ROOT_GROUP_LABEL.into(), folder_group_label);
    Object::Link(108, label)
}

pub(super) fn record(layout: &AnimationFolderLayout) -> Object {
    let clip = |index| Object::Link(18, animation_label(index));
    let mut ordinal = 0;
    let items = layout
        .entries
        .iter()
        .map(|entry| match entry {
            AnimationFolderEntry::Clip(index) => clip(*index),
            AnimationFolderEntry::Folder(folder) => {
                let item = folder_record(
                    &folder_group_label(ordinal),
                    Some(&folder.name),
                    folder.clips.iter().copied().map(clip).collect(),
                );
                ordinal += 1;
                item
            }
        })
        .collect();
    folder_record(ROOT_GROUP_LABEL, None, items)
}

fn folder_record(label: &str, name: Option<&str>, items: Vec<Object>) -> Object {
    let Object::Record(mut record) = group(Some(label), items) else {
        unreachable!()
    };
    for (tag, field) in &mut record.fields {
        match (*tag, name) {
            (2, _) => *field = Field::UInt(FOLDER_GROUP_MODE),
            (3, Some(_)) => *field = object(Object::Link(108, ROOT_GROUP_LABEL.into())),
            (1, Some(name)) => *field = text(name),
            _ => (),
        }
    }
    Object::Record(record)
}

#[cfg(test)]
mod tests {
    use super::super::{
        decode_scene, encode_scene_payload, Animation, MinimalProject, RegionProject,
    };
    use super::*;

    #[test]
    fn folder_membership_roundtrips_independently_of_flat_animation_order() {
        let mut scene = SceneProject::from(&RegionProject {
            rig: MinimalProject::new("Own folder members".into(), [41; 16]),
            images_root: "./images/".into(),
            slots: vec![],
            region_order: vec![],
        });
        scene.animations = ["idle", "idle", "move"]
            .map(|name| Animation::new(name.into()))
            .to_vec();
        scene.animation_folders = Some(AnimationFolderLayout {
            entries: vec![
                AnimationFolderEntry::Clip(1),
                AnimationFolderEntry::Folder(AnimationFolder {
                    name: "control".into(),
                    clips: vec![2, 0],
                }),
            ],
        });
        let wire = encode_scene_payload(&scene).unwrap();
        let decoded = decode_scene(&wire).unwrap();
        assert_eq!(decoded, scene);
        assert_eq!(
            decoded.qualified_animation_name(0).as_deref(),
            Some("control/idle")
        );
        assert_eq!(decoded.qualified_animation_name(1).as_deref(), Some("idle"));
        assert_eq!(encode_scene_payload(&decoded).unwrap(), wire);

        scene.animations[1].name = "control/idle".into();
        assert!(matches!(
            encode_scene_payload(&scene),
            Err(FormatError::UnsupportedProfile)
        ));
    }
}
