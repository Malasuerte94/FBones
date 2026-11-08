//! Numeric-suffix Sequence authoring and transient frame selection.
//! Timing is the declared FBones policy; settings never rewrite image geometry.
use crate::{animation, project::AppError, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{
    animation_layout, normalize_attachment_sequences, Animation, AttachmentAddress,
    AttachmentSequence, FiniteF32, SceneProject, SequenceKeyframe, SequenceMode, SequenceSettings,
    SequenceTimeline, WireTrack,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

fn invalid(message: &str) -> AppError {
    AppError::new("InvalidSequence", message)
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SettingsInput {
    pub start: u32,
    pub count: u32,
    pub digits: u32,
    pub setup_index: u32,
}
impl From<&SequenceSettings> for SettingsInput {
    fn from(s: &SequenceSettings) -> Self {
        Self {
            start: s.start,
            count: s.count,
            digits: s.digits,
            setup_index: s.setup_index,
        }
    }
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SequenceKeyInput {
    pub attachment: u64,
    pub frame: f32,
    pub mode: u8,
    pub index: u32,
    pub delay: f32,
    #[serde(default)]
    pub key_id: Option<u64>,
}
#[derive(Clone, Debug, Serialize)]
pub struct SequenceKeyView {
    pub id: u64,
    pub frame: f32,
    pub mode: u8,
    pub index: u32,
    pub delay: f32,
}
#[derive(Clone, Debug, Serialize)]
pub struct SequenceTrackView {
    pub attachment: u64,
    pub slot: u64,
    pub keys: Vec<SequenceKeyView>,
}
#[derive(Clone, Debug, Serialize)]
pub struct SequencePoseView {
    pub attachment: u64,
    pub slot: u64,
    pub index: u32,
    pub image: String,
}
pub(crate) fn mode_number(mode: SequenceMode) -> u8 {
    match mode {
        SequenceMode::Hold => 0,
        SequenceMode::Once => 1,
        SequenceMode::Loop => 2,
    }
}
fn mode(value: u8) -> Result<SequenceMode, AppError> {
    match value {
        0 => Ok(SequenceMode::Hold),
        1 => Ok(SequenceMode::Once),
        2 => Ok(SequenceMode::Loop),
        _ => Err(invalid("Choose Hold, Once or Loop.")),
    }
}
pub(crate) fn settings(p: &SceneProject, a: AttachmentAddress) -> Option<&SequenceSettings> {
    p.attachment_sequences
        .iter()
        .find(|s| s.attachment == a)
        .map(|s| &s.settings)
}

/// Bounded native resource expansion, independent of resource existence.
pub(crate) fn frame_path(base: &str, s: &SequenceSettings, index: u32) -> Result<String, AppError> {
    let path = s.path(base, index)?;
    if !crate::images::valid_image_stem(&path) {
        return Err(invalid(
            "Sequence frame paths must be safe relative PNG names.",
        ));
    }
    Ok(path)
}
pub(crate) fn image_keys(p: &SceneProject, a: AttachmentAddress) -> Result<Vec<String>, AppError> {
    let image = p
        .slots
        .get(a.slot)
        .and_then(|slot| slot.attachments.get(a.attachment))
        .and_then(|a| a.image())
        .ok_or_else(|| invalid("Choose an image attachment."))?;
    let base = crate::rig::image_stem(image);
    if let Some(s) = settings(p, a) {
        (0..s.count).map(|i| frame_path(base, s, i)).collect()
    } else {
        Ok(vec![base.into()])
    }
}
pub(crate) fn all_image_keys(p: &SceneProject) -> Result<Vec<String>, AppError> {
    let mut keys = Vec::new();
    let mut seen = HashSet::new();
    let mut expanded = 0usize;
    let mut folded = HashMap::new();
    for a in &p.attachment_order {
        if p.slots[a.slot].attachments[a.attachment].image().is_none() {
            continue;
        }
        expanded = expanded
            .checked_add(settings(p, *a).map_or(1, |s| s.count as usize))
            .ok_or_else(|| invalid("The Sequence resource expansion budget is exhausted."))?;
        if expanded > 16384 {
            return Err(invalid(
                "The Sequence resource expansion budget is exhausted.",
            ));
        }
        for key in image_keys(p, *a)? {
            if !crate::images::valid_image_stem(&key)
                || folded
                    .insert(key.to_lowercase(), key.clone())
                    .is_some_and(|previous| previous != key)
            {
                return Err(invalid(
                    "Image frame paths must be portable and have no case collisions.",
                ));
            }
            if seen.insert(key.clone()) {
                keys.push(key);
            }
        }
        if keys.len() > 16384 {
            return Err(invalid(
                "The Sequence resource expansion budget is exhausted.",
            ));
        }
    }
    Ok(keys)
}
pub(crate) fn available_frames(
    p: &SceneProject,
    a: AttachmentAddress,
    cache: &crate::images::ImageCache,
) -> Vec<u32> {
    if settings(p, a).is_none() {
        return vec![];
    }
    image_keys(p, a)
        .unwrap_or_default()
        .iter()
        .enumerate()
        .filter_map(|(i, key)| cache.get(key).is_some().then_some(i as u32))
        .collect()
}
pub(crate) fn setup_available(
    p: &SceneProject,
    a: AttachmentAddress,
    cache: &crate::images::ImageCache,
) -> bool {
    let Some(image) = p.slots[a.slot].attachments[a.attachment].image() else {
        return false;
    };
    if let Some(s) = settings(p, a) {
        frame_path(crate::rig::image_stem(image), s, s.setup_index)
            .is_ok_and(|key| cache.get(&key).is_some())
    } else {
        cache.get(crate::rig::image_stem(image)).is_some()
    }
}
pub(crate) fn setup_image_key(p: &SceneProject, a: AttachmentAddress) -> Result<String, AppError> {
    let image = p.slots[a.slot].attachments[a.attachment]
        .image()
        .ok_or_else(|| invalid("Choose an image attachment."))?;
    if let Some(s) = settings(p, a) {
        frame_path(crate::rig::image_stem(image), s, s.setup_index)
    } else {
        Ok(crate::rig::image_stem(image).into())
    }
}
pub(crate) fn views(frame: &SceneFrame, a: usize) -> Vec<SequenceTrackView> {
    frame.project.animations[a]
        .sequence_tracks
        .iter()
        .enumerate()
        .map(|(t, track)| SequenceTrackView {
            attachment: frame.attachment_ids[track.attachment.slot][track.attachment.attachment],
            slot: frame.slot_ids[track.attachment.slot],
            keys: track
                .keys
                .iter()
                .enumerate()
                .map(|(k, key)| SequenceKeyView {
                    id: frame.animation_sequence_key_ids[a][t][k],
                    frame: key.frame,
                    mode: mode_number(key.mode),
                    index: key.index,
                    delay: key.delay.get(),
                })
                .collect(),
        })
        .collect()
}
pub(crate) fn allocate_ids(clip: &Animation, next: &mut u64) -> Result<Vec<Vec<u64>>, AppError> {
    clip.sequence_tracks
        .iter()
        .map(|t| t.keys.iter().map(|_| animation::allocate(next)).collect())
        .collect()
}
pub(crate) fn duration(clip: &Animation) -> f32 {
    clip.sequence_tracks
        .iter()
        .flat_map(|t| &t.keys)
        .map(|k| k.frame)
        .fold(0., f32::max)
}
pub(crate) fn canonicalize(frame: &mut SceneFrame) -> Result<(), AppError> {
    normalize_attachment_sequences(&mut frame.project)?;
    for a in 0..frame.project.animations.len() {
        let order = animation_layout(&frame.project, a)?
            .groups
            .into_iter()
            .flat_map(|g| g.tracks)
            .filter_map(|t| {
                if let WireTrack::Sequence { attachment } = t {
                    Some(attachment)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();
        let clip = &mut frame.project.animations[a];
        let old = clip.sequence_tracks.clone();
        let ids = frame.animation_sequence_key_ids[a].clone();
        let positions = order
            .iter()
            .map(|address| {
                old.iter()
                    .position(|t| t.attachment == *address)
                    .ok_or_else(|| invalid("Sequence track layout is incomplete."))
            })
            .collect::<Result<Vec<_>, _>>()?;
        clip.sequence_tracks = positions.iter().map(|i| old[*i].clone()).collect();
        frame.animation_sequence_key_ids[a] = positions.iter().map(|i| ids[*i].clone()).collect();
    }
    all_image_keys(&frame.project)?;
    Ok(())
}
pub(crate) fn set_settings(
    frame: &mut SceneFrame,
    id: u64,
    input: Option<SettingsInput>,
) -> Result<(), AppError> {
    let address = frame.attachment_address(id)?;
    if frame.project.slots[address.slot].attachments[address.attachment]
        .image()
        .is_none()
    {
        return Err(invalid(
            "Only Region and Mesh attachments support Sequence.",
        ));
    }
    let settings = input.map(|s| SequenceSettings {
        start: s.start,
        count: s.count,
        digits: s.digits,
        setup_index: s.setup_index,
    });
    if frame
        .project
        .animations
        .iter()
        .flat_map(|a| &a.sequence_tracks)
        .filter(|t| t.attachment == address)
        .any(|t| {
            settings
                .as_ref()
                .is_none_or(|s| t.keys.iter().any(|k| k.index >= s.count))
        })
    {
        return Err(invalid(
            "Remove incompatible Sequence keys before changing these settings.",
        ));
    }
    frame
        .project
        .attachment_sequences
        .retain(|s| s.attachment != address);
    if let Some(settings) = settings {
        frame.project.attachment_sequences.push(AttachmentSequence {
            attachment: address,
            settings,
        });
    }
    Ok(())
}
pub(crate) fn set_keys(
    frame: &mut SceneFrame,
    next: &mut u64,
    a: usize,
    inputs: Vec<SequenceKeyInput>,
) -> Result<(), AppError> {
    if inputs.is_empty() || inputs.len() > 4096 {
        return Err(invalid("Choose a bounded nonempty Sequence key batch."));
    }
    let mut seen = HashSet::new();
    for input in inputs {
        let address = frame.attachment_address(input.attachment)?;
        let s = settings(&frame.project, address)
            .ok_or_else(|| invalid("Enable Sequence on the target attachment first."))?;
        let position = animation::checked_frame(input.frame)?;
        if input.index >= s.count || !input.delay.is_finite() || input.delay <= 0. {
            return Err(invalid(
                "Use an image index within Count and a finite positive delay.",
            ));
        }
        let mode = mode(input.mode)?;
        if !seen.insert((address, position.to_bits())) {
            return Err(invalid("A Sequence batch repeats a target frame."));
        }
        let t = if let Some(t) = frame.project.animations[a]
            .sequence_tracks
            .iter()
            .position(|t| t.attachment == address)
        {
            t
        } else {
            if input.key_id.is_some() {
                return Err(invalid("The selected Sequence key no longer exists."));
            }
            let t = frame.project.animations[a].sequence_tracks.len();
            frame.project.animations[a]
                .sequence_tracks
                .push(SequenceTimeline {
                    attachment: address,
                    keys: vec![],
                });
            frame.animation_sequence_key_ids[a].push(vec![]);
            t
        };
        let track = &mut frame.project.animations[a].sequence_tracks[t];
        let ids = &mut frame.animation_sequence_key_ids[a][t];
        let selected = if let Some(id) = input.key_id {
            let k = ids
                .iter()
                .position(|v| *v == id)
                .ok_or_else(|| invalid("The selected Sequence key no longer exists."))?;
            if track.keys[k].frame != position {
                return Err(invalid("The selected Sequence key moved to another frame."));
            }
            Some(k)
        } else {
            track.keys.iter().rposition(|key| key.frame == position)
        };
        let key = SequenceKeyframe {
            // JSON turns source -0 into +0. A payload overwrite keeps the
            // addressed key's time bits; new keys use the authored position.
            frame: selected.map_or(position, |k| track.keys[k].frame),
            mode,
            index: input.index,
            delay: FiniteF32::new(input.delay)?,
        };
        if let Some(k) = selected {
            track.keys[k] = key;
        } else {
            let k = track.keys.partition_point(|key| key.frame <= position);
            track.keys.insert(k, key);
            ids.insert(k, animation::allocate(next)?);
        }
    }
    Ok(())
}
pub(crate) fn delete_keys(frame: &mut SceneFrame, a: usize, selected: &HashSet<u64>) {
    for t in (0..frame.project.animations[a].sequence_tracks.len()).rev() {
        let track = &mut frame.project.animations[a].sequence_tracks[t];
        let ids = &mut frame.animation_sequence_key_ids[a][t];
        for k in (0..ids.len()).rev() {
            if selected.contains(&ids[k]) {
                track.keys.remove(k);
                ids.remove(k);
            }
        }
        if track.keys.is_empty() {
            frame.project.animations[a].sequence_tracks.remove(t);
            frame.animation_sequence_key_ids[a].remove(t);
        }
    }
}
pub(crate) fn move_keys(
    frame: &mut SceneFrame,
    a: usize,
    selected: &HashSet<u64>,
    delta: f32,
) -> Result<(), AppError> {
    for (t, track) in frame.project.animations[a]
        .sequence_tracks
        .iter_mut()
        .enumerate()
    {
        let ids = &mut frame.animation_sequence_key_ids[a][t];
        let mut pairs = track
            .keys
            .iter()
            .cloned()
            .zip(ids.iter().copied())
            .collect::<Vec<_>>();
        for (key, id) in &mut pairs {
            if selected.contains(id) {
                key.frame = animation::checked_frame(key.frame + delta)?;
            }
        }
        pairs.sort_by(|a, b| a.0.frame.total_cmp(&b.0.frame));
        if pairs.windows(2).any(|p| p[0].0.frame == p[1].0.frame) {
            return Err(invalid("Moving Sequence keys would overlap another key."));
        }
        track.keys = pairs.iter().map(|(key, _)| key.clone()).collect();
        *ids = pairs.into_iter().map(|(_, id)| id).collect();
    }
    Ok(())
}
pub(crate) fn remap_references(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    let remap = |address: AttachmentAddress| -> Option<AttachmentAddress> {
        let id = *before
            .attachment_ids
            .get(address.slot)?
            .get(address.attachment)?;
        next.attachment_address(id).ok()
    };
    let settings = next
        .project
        .attachment_sequences
        .iter()
        .filter_map(|s| {
            remap(s.attachment).map(|attachment| AttachmentSequence {
                attachment,
                settings: s.settings.clone(),
            })
        })
        .collect();
    let remapped = next
        .project
        .animations
        .iter()
        .enumerate()
        .map(|(a, clip)| {
            clip.sequence_tracks
                .iter()
                .enumerate()
                .filter_map(|(t, track)| {
                    remap(track.attachment).map(|attachment| {
                        let mut track = track.clone();
                        track.attachment = attachment;
                        (track, next.animation_sequence_key_ids[a][t].clone())
                    })
                })
                .collect::<Vec<_>>()
        })
        .collect::<Vec<_>>();
    next.project.attachment_sequences = settings;
    for (a, tracks) in remapped.into_iter().enumerate() {
        next.project.animations[a].sequence_tracks =
            tracks.iter().map(|(t, _)| t.clone()).collect();
        next.animation_sequence_key_ids[a] = tracks.into_iter().map(|(_, ids)| ids).collect();
    }
    Ok(())
}
/// FBones boundary policy, matching the independently implemented TS sampler.
pub(crate) fn sample_index(
    settings: &SequenceSettings,
    track: Option<&SequenceTimeline>,
    frame: f64,
    fps: f32,
) -> u32 {
    let Some(key) = track.and_then(|t| {
        t.keys
            .iter()
            .rev()
            .find(|key| f64::from(key.frame) <= frame)
    }) else {
        return settings.setup_index;
    };
    if key.mode == SequenceMode::Hold {
        return key.index;
    }
    let steps = ((frame - f64::from(key.frame)) / f64::from(fps) / f64::from(key.delay.get())
        + 0.00001)
        .floor()
        .max(0.);
    match key.mode {
        SequenceMode::Hold => key.index,
        SequenceMode::Once => {
            (f64::from(key.index) + steps).min(f64::from(settings.count - 1)) as u32
        }
        SequenceMode::Loop => {
            ((f64::from(key.index) + steps % f64::from(settings.count)) % f64::from(settings.count))
                as u32
        }
    }
}
pub(crate) fn sample(
    frame: &SceneFrame,
    clip: Option<&Animation>,
    position: f64,
) -> Result<Vec<SequencePoseView>, AppError> {
    if frame.project.attachment_sequences.is_empty() {
        return Ok(vec![]);
    }
    if !position.is_finite()
        || !(0.0..=1_000_000.0).contains(&position)
        || !frame.project.fps.is_finite()
        || frame.project.fps <= 0.
    {
        return Err(invalid(
            "Use a finite nonnegative Sequence time and positive FPS.",
        ));
    }
    frame
        .project
        .attachment_sequences
        .iter()
        .map(|s| {
            let track = clip.and_then(|clip| {
                clip.sequence_tracks
                    .iter()
                    .find(|t| t.attachment == s.attachment)
            });
            let index = sample_index(&s.settings, track, position, frame.project.fps);
            let image = frame.project.slots[s.attachment.slot].attachments[s.attachment.attachment]
                .image()
                .ok_or_else(|| invalid("Sequence targets an unavailable image."))?;
            Ok(SequencePoseView {
                attachment: frame.attachment_ids[s.attachment.slot][s.attachment.attachment],
                slot: frame.slot_ids[s.attachment.slot],
                index,
                image: frame_path(crate::rig::image_stem(image), &s.settings, index)?,
            })
        })
        .collect()
}

#[cfg(test)]
#[path = "animation_sequence_tests.rs"]
mod tests;
