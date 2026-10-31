//! Typed animation authoring and sampling. Setup channels are never replaced.
use crate::{project::AppError, rig::RigEdit, scene_edit::SceneFrame, solve};
use fbones_format::minimal::scene::{
    Animation, BoneChannel, BoneKeyframe, BoneTimeline, KeyCurve, SceneProject,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
#[cfg(test)]
#[path = "animation_tests.rs"]
mod tests;

pub(crate) const FPS: f64 = 30.0;
const MAX_FRAME: f32 = 1_000_000.0;
const MAX_KEYS: usize = 4096;
fn invalid(message: &str) -> AppError {
    AppError::new("InvalidAnimation", message)
}
#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ChannelInput {
    Rotate,
    #[default]
    Translate,
    Scale,
    Shear,
}
impl ChannelInput {
    fn model(self) -> BoneChannel {
        match self {
            Self::Rotate => BoneChannel::Rotate,
            Self::Translate => BoneChannel::Translate,
            Self::Scale => BoneChannel::Scale,
            Self::Shear => BoneChannel::Shear,
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CurveInput {
    #[default]
    Linear,
    Stepped,
    Bezier,
}
impl CurveInput {
    fn model(self, controls: Option<[[f32; 4]; 2]>) -> Result<KeyCurve, AppError> {
        match self {
            Self::Linear if controls.is_none() => Ok(KeyCurve::Linear),
            Self::Stepped if controls.is_none() => Ok(KeyCurve::Stepped),
            Self::Bezier => controls
                .map(|controls| KeyCurve::Bezier { controls })
                .ok_or_else(|| invalid("Bezier keys require two axes of frame/value controls.")),
            _ => Err(invalid("Only Bezier keys may carry curve controls.")),
        }
    }
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyInput {
    #[serde(default)]
    pub key_id: Option<u64>,
    pub bone: u64,
    pub channel: ChannelInput,
    pub frame: f32,
    pub values: [f32; 2],
    pub curve: CurveInput,
    #[serde(default)]
    pub controls: Option<[[f32; 4]; 2]>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyView {
    pub id: u64,
    pub frame: f32,
    pub values: [f32; 2],
    pub curve: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub controls: Option<[[f32; 4]; 2]>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackView {
    pub bone: u64,
    pub channel: &'static str,
    pub keys: Vec<KeyView>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationView {
    pub id: u64,
    pub name: String,
    /// Duration in stored frames, not seconds.
    pub duration: f32,
    pub tracks: Vec<TrackView>,
    pub slot_tracks: Vec<crate::animation_slots::SlotTrackView>,
    pub draw_order: Vec<crate::animation_order::OrderKeyView>,
    pub deform_tracks: Vec<crate::animation_deform::DeformTrackView>,
    pub constraint_tracks: Vec<crate::animation_constraints::ConstraintTrackView>,
    pub event_tracks: Vec<crate::animation_events::EventTrackView>,
}
fn channel_name(channel: BoneChannel) -> &'static str {
    match channel {
        BoneChannel::Rotate => "rotate",
        BoneChannel::Translate => "translate",
        BoneChannel::Scale => "scale",
        BoneChannel::Shear => "shear",
    }
}
pub(crate) fn views(frame: &SceneFrame) -> Vec<AnimationView> {
    frame
        .project
        .animations
        .iter()
        .enumerate()
        .map(|(a, clip)| AnimationView {
            id: frame.animation_ids[a],
            name: clip.name.clone(),
            duration: clip
                .tracks
                .iter()
                .flat_map(|t| &t.keys)
                .map(|k| k.frame)
                .chain(clip.draw_order.iter().map(|key| key.frame))
                .chain(
                    clip.deform_tracks
                        .iter()
                        .flat_map(|track| track.keys.iter().map(|key| key.frame)),
                )
                .fold(
                    crate::animation_slots::duration(clip)
                        .max(crate::animation_constraints::duration(clip))
                        .max(crate::animation_events::duration(clip)),
                    f32::max,
                ),
            slot_tracks: crate::animation_slots::views(frame, a),
            draw_order: crate::animation_order::views(frame, a),
            deform_tracks: crate::animation_deform::views(frame, a),
            constraint_tracks: crate::animation_constraints::views(frame, a),
            event_tracks: crate::animation_events::views(frame, a),
            tracks: clip
                .tracks
                .iter()
                .enumerate()
                .map(|(t, track)| TrackView {
                    bone: frame.bone_ids[track.bone],
                    channel: channel_name(track.channel),
                    keys: track
                        .keys
                        .iter()
                        .enumerate()
                        .map(|(k, key)| KeyView {
                            id: frame.animation_key_ids[a][t][k],
                            frame: key.frame,
                            values: key.values,
                            curve: match key.curve {
                                KeyCurve::Linear => "linear",
                                KeyCurve::Stepped => "stepped",
                                KeyCurve::Bezier { .. } => "bezier",
                            },
                            controls: if let KeyCurve::Bezier { controls } = key.curve {
                                Some(controls)
                            } else {
                                None
                            },
                        })
                        .collect(),
                })
                .collect(),
        })
        .collect()
}
pub(crate) fn is_edit(edit: &RigEdit) -> bool {
    matches!(
        edit,
        RigEdit::SetAudioRoot { .. }
            | RigEdit::CreateEvent { .. }
            | RigEdit::RenameEvent { .. }
            | RigEdit::UpdateEvent { .. }
            | RigEdit::DeleteEvent { .. }
            | RigEdit::SetAnimationConstraintKeys { .. }
            | RigEdit::SetAnimationEventKeys { .. }
            | RigEdit::CreateAnimation { .. }
            | RigEdit::DuplicateAnimation { .. }
            | RigEdit::SetAnimationFps { .. }
            | RigEdit::RenameAnimation { .. }
            | RigEdit::DeleteAnimation { .. }
            | RigEdit::SetAnimationKey { .. }
            | RigEdit::SetAnimationKeys { .. }
            | RigEdit::SetAnimationSlotKeys { .. }
            | RigEdit::SetAnimationKeyBatch { .. }
            | RigEdit::SetAnimationDrawOrderKeys { .. }
            | RigEdit::SetAnimationDeformKeys { .. }
            | RigEdit::DeleteAnimationKeys { .. }
            | RigEdit::MoveAnimationKeys { .. }
    )
}
pub(crate) fn allocate(next: &mut u64) -> Result<u64, AppError> {
    let id = *next;
    *next = next
        .checked_add(1)
        .ok_or_else(|| invalid("Animation identity space exhausted."))?;
    Ok(id)
}
fn animation_index(frame: &SceneFrame, id: u64) -> Result<usize, AppError> {
    frame
        .animation_ids
        .iter()
        .position(|v| *v == id)
        .ok_or_else(|| invalid("Choose an existing animation."))
}
fn checked_name(frame: &SceneFrame, name: &str, except: Option<usize>) -> Result<String, AppError> {
    let name = name.trim();
    if name.is_empty() || name.len() > 1024 || name.chars().any(char::is_control) {
        return Err(invalid(
            "Use a nonempty animation name without control characters.",
        ));
    }
    if frame
        .project
        .animations
        .iter()
        .enumerate()
        .any(|(i, a)| Some(i) != except && a.name == name)
    {
        return Err(invalid("An animation already uses that name."));
    }
    Ok(name.into())
}
pub(crate) fn checked_frame(value: f32) -> Result<f32, AppError> {
    if !value.is_finite() || !(0.0..=MAX_FRAME).contains(&value) {
        return Err(invalid("Use a finite frame between 0 and 1000000."));
    }
    Ok(if value == 0.0 { 0.0 } else { value })
}
fn selected_keys(frame: &SceneFrame, a: usize, keys: &[u64]) -> Result<HashSet<u64>, AppError> {
    let wanted: HashSet<_> = keys.iter().copied().collect();
    if wanted.is_empty() || wanted.len() != keys.len() || wanted.len() > MAX_KEYS {
        return Err(invalid("Choose distinct existing animation keys."));
    }
    let available: HashSet<_> = frame.animation_key_ids[a]
        .iter()
        .flatten()
        .copied()
        .chain(frame.animation_slot_key_ids[a].iter().flatten().copied())
        .chain(frame.animation_draw_key_ids[a].iter().copied())
        .chain(frame.animation_deform_key_ids[a].iter().flatten().copied())
        .chain(
            frame.animation_constraint_key_ids[a]
                .iter()
                .flatten()
                .copied(),
        )
        .chain(frame.animation_event_key_ids[a].iter().flatten().copied())
        .collect();
    if !wanted.is_subset(&available) {
        return Err(invalid("An animation key no longer exists."));
    }
    Ok(wanted)
}
fn check_bezier_neighbors(
    old: &[BoneKeyframe],
    old_ids: &[u64],
    keys: &[BoneKeyframe],
    ids: &[u64],
    explicitly_edited: &HashSet<u64>,
) -> Result<(), AppError> {
    for (i, key) in old.iter().enumerate() {
        if !matches!(key.curve, KeyCurve::Bezier { .. }) {
            continue;
        }
        let Some(at) = ids.iter().position(|id| *id == old_ids[i]) else {
            continue;
        };
        if matches!(keys[at].curve, KeyCurve::Bezier { .. })
            && ids.get(at + 1) != old_ids.get(i + 1)
            && !explicitly_edited.contains(&old_ids[i])
        {
            return Err(invalid("This edit changes a Bezier segment's neighbors. Edit its curve explicitly or select the complete segment."));
        }
    }
    Ok(())
}
fn validate_curves(project: &SceneProject) -> Result<(), AppError> {
    for animation in &project.animations {
        for track in &animation.tracks {
            for (i, key) in track.keys.iter().enumerate() {
                if let KeyCurve::Bezier { controls } = key.curve {
                    let right = track
                        .keys
                        .get(i + 1)
                        .filter(|right| right.frame > key.frame)
                        .ok_or_else(|| {
                            invalid("A Bezier key needs a following key at a later frame.")
                        })?;
                    if track.channel == BoneChannel::Rotate
                        && controls[1].map(f32::to_bits) != [0; 4]
                    {
                        return Err(invalid("Rotate Bezier keys use one axis of controls."));
                    }
                    let axes = if track.channel == BoneChannel::Rotate {
                        1
                    } else {
                        2
                    };
                    if controls[..axes].iter().any(|axis| {
                        axis.iter().any(|v| !v.is_finite() || v.abs() > 1_000_000.)
                            || axis[0] < key.frame
                            || axis[0] > right.frame
                            || axis[2] < key.frame
                            || axis[2] > right.frame
                    }) {
                        return Err(invalid("Use finite Bezier handles with frame coordinates inside their segment."));
                    }
                }
            }
        }
    }
    Ok(())
}
fn set_keys(
    frame: &mut SceneFrame,
    next_key: &mut u64,
    a: usize,
    keys: Vec<KeyInput>,
) -> Result<(), AppError> {
    if keys.is_empty() || keys.len() > MAX_KEYS {
        return Err(invalid("Choose a nonempty bounded key batch."));
    }
    let mut checked = Vec::with_capacity(keys.len());
    let mut seen = HashSet::new();
    for key in keys {
        let bone = frame.bone_index(key.bone)?;
        let channel = key.channel.model();
        let position = checked_frame(key.frame)?;
        let existing_track = frame.project.animations[a]
            .tracks
            .iter()
            .position(|track| track.bone == bone && track.channel == channel);
        let target = if let Some(id) = key.key_id {
            let t = existing_track.ok_or_else(|| {
                invalid("The selected key no longer belongs to this bone/channel.")
            })?;
            let k = frame.animation_key_ids[a][t]
                .iter()
                .position(|value| *value == id)
                .ok_or_else(|| invalid("The selected animation key no longer exists."))?;
            if frame.project.animations[a].tracks[t].keys[k].frame != position {
                return Err(invalid(
                    "The selected animation key moved to another frame.",
                ));
            }
            Some(id)
        } else {
            existing_track.and_then(|t| {
                let track = &frame.project.animations[a].tracks[t];
                let end = track.keys.partition_point(|value| value.frame <= position);
                (end > 0 && track.keys[end - 1].frame == position)
                    .then(|| frame.animation_key_ids[a][t][end - 1])
            })
        };
        if !seen.insert((bone, channel_name(channel), position.to_bits(), target)) {
            return Err(invalid("A key batch repeats the same key."));
        }
        if key
            .values
            .iter()
            .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
        {
            return Err(invalid("Use finite key values within supported bounds."));
        }
        let mut values = key.values;
        if channel == BoneChannel::Rotate {
            if values[1] != 0. {
                return Err(invalid("Rotate keys use one angle value."));
            }
            values[1] = 0.;
        }
        checked.push((
            bone,
            channel,
            position,
            values,
            key.curve.model(key.controls)?,
            target,
        ));
    }
    let old_tracks: Vec<_> = frame.project.animations[a]
        .tracks
        .iter()
        .enumerate()
        .map(|(t, track)| (track.clone(), frame.animation_key_ids[a][t].clone()))
        .collect();
    let explicitly_edited: HashSet<_> = checked.iter().filter_map(|key| key.5).collect();
    for (bone, channel, position, values, curve, target) in checked {
        let t = if let Some(t) = frame.project.animations[a]
            .tracks
            .iter()
            .position(|t| t.bone == bone && t.channel == channel)
        {
            t
        } else {
            let t = frame.project.animations[a]
                .tracks
                .iter()
                .rposition(|track| track.bone == bone)
                .map_or(frame.project.animations[a].tracks.len(), |index| index + 1);
            frame.project.animations[a].tracks.insert(
                t,
                BoneTimeline {
                    bone,
                    channel,
                    keys: vec![],
                },
            );
            frame.animation_key_ids[a].insert(t, vec![]);
            t
        };
        let track = &mut frame.project.animations[a].tracks[t];
        if let Some(target) = target {
            let k = frame.animation_key_ids[a][t]
                .iter()
                .position(|id| *id == target)
                .ok_or_else(|| invalid("The selected animation key changed during the batch."))?;
            let position = track.keys[k].frame;
            track.keys[k] = BoneKeyframe {
                frame: position,
                values,
                curve,
            }
        } else {
            let k = track.keys.partition_point(|key| key.frame <= position);
            track.keys.insert(
                k,
                BoneKeyframe {
                    frame: position,
                    values,
                    curve,
                },
            );
            frame.animation_key_ids[a][t].insert(k, allocate(next_key)?);
        }
    }
    for (old, ids) in old_tracks {
        if let Some(t) = frame.project.animations[a]
            .tracks
            .iter()
            .position(|track| track.bone == old.bone && track.channel == old.channel)
        {
            check_bezier_neighbors(
                &old.keys,
                &ids,
                &frame.project.animations[a].tracks[t].keys,
                &frame.animation_key_ids[a][t],
                &explicitly_edited,
            )?;
        }
    }
    if frame
        .project
        .animations
        .iter()
        .flat_map(|a| &a.tracks)
        .map(|t| t.keys.len())
        .sum::<usize>()
        > MAX_KEYS
    {
        return Err(invalid("The project animation key budget is exhausted."));
    }
    if frame
        .project
        .animations
        .iter()
        .map(|a| a.tracks.len())
        .sum::<usize>()
        > 512
    {
        return Err(invalid("The project animation track budget is exhausted."));
    }
    Ok(())
}
pub(crate) fn apply(
    frame: &mut SceneFrame,
    next_animation: &mut u64,
    next_key: &mut u64,
    next_event: &mut u64,
    edit: RigEdit,
) -> Result<(), AppError> {
    match edit {
        RigEdit::SetAudioRoot { path } => {
            if path.len() > 1024 || path.chars().any(char::is_control) {
                return Err(invalid("Use a bounded audio root path."));
            }
            frame.project.audio_root = path;
        }
        RigEdit::CreateEvent { name } => crate::animation_events::create(frame, next_event, name)?,
        RigEdit::RenameEvent { id, name } => crate::animation_events::rename(frame, id, name)?,
        RigEdit::UpdateEvent { id, patch } => crate::animation_events::update(frame, id, patch)?,
        RigEdit::DeleteEvent { id } => crate::animation_events::delete(frame, id)?,
        RigEdit::SetAnimationConstraintKeys { animation, keys } => {
            let a = animation_index(frame, animation)?;
            crate::animation_constraints::set_keys(frame, next_key, a, keys)?;
            frame.focus.animation = Some(animation);
        }
        RigEdit::SetAnimationEventKeys { animation, keys } => {
            let a = animation_index(frame, animation)?;
            crate::animation_events::set_keys(frame, next_key, a, keys)?;
            frame.focus.animation = Some(animation);
        }
        RigEdit::SetAnimationFps { fps } => {
            if !fps.is_finite() || !(1.0..=240.0).contains(&fps) {
                return Err(invalid("Use an animation frame rate between 1 and 240."));
            }
            frame.project.fps = fps;
        }
        RigEdit::CreateAnimation { name } => {
            if frame.project.animations.len() >= 64 {
                return Err(invalid("This profile supports at most 64 animations."));
            }
            let name = checked_name(frame, &name, None)?;
            let id = allocate(next_animation)?;
            frame.project.animations.push(Animation::new(name));
            frame.animation_ids.push(id);
            frame.animation_key_ids.push(vec![]);
            frame.animation_slot_key_ids.push(vec![]);
            frame.animation_draw_key_ids.push(vec![]);
            frame.animation_deform_key_ids.push(vec![]);
            frame.animation_constraint_key_ids.push(vec![]);
            frame.animation_event_key_ids.push(vec![]);
            frame.focus.animation = Some(id);
        }
        RigEdit::DuplicateAnimation { id, name } => {
            let a = animation_index(frame, id)?;
            if frame.project.animations.len() >= 64 {
                return Err(invalid("This profile supports at most 64 animations."));
            }
            let name = checked_name(frame, &name, None)?;
            let mut clip = frame.project.animations[a].clone();
            clip.name = name;
            let mut key_ids = vec![];
            for track in &clip.tracks {
                key_ids.push(
                    track
                        .keys
                        .iter()
                        .map(|_| allocate(next_key))
                        .collect::<Result<Vec<_>, _>>()?,
                );
            }
            let duplicate_id = allocate(next_animation)?;
            let slot_key_ids = crate::animation_slots::allocate_ids(&clip, next_key)?;
            let draw_key_ids = crate::animation_order::allocate_ids(&clip, next_key)?;
            let deform_key_ids = crate::animation_deform::allocate_ids(&clip, next_key)?;
            let constraint_key_ids = crate::animation_constraints::allocate_ids(&clip, next_key)?;
            let event_key_ids = crate::animation_events::allocate_ids(&clip, next_key)?;
            frame.project.animations.push(clip);
            frame.animation_ids.push(duplicate_id);
            frame.animation_key_ids.push(key_ids);
            frame.animation_slot_key_ids.push(slot_key_ids);
            frame.animation_draw_key_ids.push(draw_key_ids);
            frame.animation_deform_key_ids.push(deform_key_ids);
            frame.animation_constraint_key_ids.push(constraint_key_ids);
            frame.animation_event_key_ids.push(event_key_ids);
            frame.focus.animation = Some(duplicate_id);
        }
        RigEdit::RenameAnimation { id, name } => {
            let a = animation_index(frame, id)?;
            let name = checked_name(frame, &name, Some(a))?;
            frame.project.animations[a].name = name;
            frame.focus.animation = Some(id);
        }
        RigEdit::DeleteAnimation { id } => {
            let a = animation_index(frame, id)?;
            if frame.project.animations.len() == 1 {
                return Err(invalid(
                    "Keep one animation in the current supported profile.",
                ));
            }
            frame.project.animations.remove(a);
            frame.animation_ids.remove(a);
            frame.animation_key_ids.remove(a);
            frame.animation_slot_key_ids.remove(a);
            frame.animation_draw_key_ids.remove(a);
            frame.animation_deform_key_ids.remove(a);
            frame.animation_constraint_key_ids.remove(a);
            frame.animation_event_key_ids.remove(a);
            if frame.focus.animation == Some(id) {
                frame.focus.animation = frame.animation_ids.first().copied();
            }
        }
        RigEdit::SetAnimationKey { animation, key } => {
            let a = animation_index(frame, animation)?;
            set_keys(frame, next_key, a, vec![key])?;
            frame.focus.animation = Some(animation);
        }
        RigEdit::SetAnimationKeys { animation, keys } => {
            let a = animation_index(frame, animation)?;
            set_keys(frame, next_key, a, keys)?;
            frame.focus.animation = Some(animation);
        }
        RigEdit::DeleteAnimationKeys { animation, keys } => {
            let a = animation_index(frame, animation)?;
            let wanted = selected_keys(frame, a, &keys)?;
            crate::animation_slots::delete_keys(frame, a, &wanted)?;
            crate::animation_order::delete_keys(frame, a, &wanted);
            crate::animation_deform::delete_keys(frame, a, &wanted)?;
            crate::animation_constraints::delete_keys(frame, a, &wanted)?;
            crate::animation_events::delete_keys(frame, a, &wanted);
            for t in (0..frame.project.animations[a].tracks.len()).rev() {
                let track = &mut frame.project.animations[a].tracks[t];
                let ids = &mut frame.animation_key_ids[a][t];
                let old_keys = track.keys.clone();
                let old_ids = ids.clone();
                for k in (0..ids.len()).rev() {
                    if wanted.contains(&ids[k]) {
                        ids.remove(k);
                        track.keys.remove(k);
                    }
                }
                check_bezier_neighbors(&old_keys, &old_ids, &track.keys, ids, &HashSet::new())?;
                if track.keys.is_empty() {
                    frame.project.animations[a].tracks.remove(t);
                    frame.animation_key_ids[a].remove(t);
                }
            }
            frame.focus.animation = Some(animation);
        }
        RigEdit::SetAnimationSlotKeys { animation, keys } => {
            let a = animation_index(frame, animation)?;
            crate::animation_slots::set_keys(frame, next_key, a, keys)?;
            frame.focus.animation = Some(animation);
        }
        RigEdit::SetAnimationKeyBatch {
            animation,
            bone_keys,
            slot_keys,
            draw_order_keys,
            deform_keys,
            constraint_keys,
            event_keys,
        } => {
            if bone_keys.is_empty()
                && slot_keys.is_empty()
                && draw_order_keys.is_empty()
                && deform_keys.is_empty()
                && constraint_keys.is_empty()
                && event_keys.is_empty()
            {
                return Err(invalid("Choose a nonempty key batch."));
            }
            let a = animation_index(frame, animation)?;
            if !bone_keys.is_empty() {
                set_keys(frame, next_key, a, bone_keys)?;
            }
            if !slot_keys.is_empty() {
                crate::animation_slots::set_keys(frame, next_key, a, slot_keys)?;
            }
            if !draw_order_keys.is_empty() {
                crate::animation_order::set_keys(frame, next_key, a, draw_order_keys)?;
            }
            if !deform_keys.is_empty() {
                crate::animation_deform::set_keys(frame, next_key, a, deform_keys)?;
            }
            if !constraint_keys.is_empty() {
                crate::animation_constraints::set_keys(frame, next_key, a, constraint_keys)?;
            }
            if !event_keys.is_empty() {
                crate::animation_events::set_keys(frame, next_key, a, event_keys)?;
            }
            frame.focus.animation = Some(animation);
        }
        RigEdit::SetAnimationDrawOrderKeys { animation, keys } => {
            let a = animation_index(frame, animation)?;
            crate::animation_order::set_keys(frame, next_key, a, keys)?;
            frame.focus.animation = Some(animation);
        }
        RigEdit::SetAnimationDeformKeys { animation, keys } => {
            let a = animation_index(frame, animation)?;
            crate::animation_deform::set_keys(frame, next_key, a, keys)?;
            frame.focus.animation = Some(animation);
        }
        RigEdit::MoveAnimationKeys {
            animation,
            keys,
            delta_frames,
        } => {
            let a = animation_index(frame, animation)?;
            let wanted = selected_keys(frame, a, &keys)?;
            if !delta_frames.is_finite() {
                return Err(invalid("Use a finite frame offset."));
            }
            if delta_frames == 0. {
                return Ok(());
            }
            crate::animation_slots::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_order::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_deform::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_constraints::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_events::move_keys(frame, a, &wanted, delta_frames)?;
            for t in 0..frame.project.animations[a].tracks.len() {
                let track = &mut frame.project.animations[a].tracks[t];
                let ids = &mut frame.animation_key_ids[a][t];
                let mut moved = track
                    .keys
                    .iter()
                    .cloned()
                    .zip(ids.iter().copied())
                    .map(|(mut key, id)| {
                        if wanted.contains(&id) {
                            key.frame = checked_frame(key.frame + delta_frames)?;
                        }
                        Ok((key, id))
                    })
                    .collect::<Result<Vec<_>, AppError>>()?;
                moved.sort_by(|a, b| a.0.frame.total_cmp(&b.0.frame));
                if moved.windows(2).any(|p| {
                    p[0].0.frame == p[1].0.frame
                        && (wanted.contains(&p[0].1) || wanted.contains(&p[1].1))
                }) {
                    return Err(invalid("Moving keys would collide with an existing key."));
                }
                for (i, key) in track.keys.iter().enumerate() {
                    let KeyCurve::Bezier { mut controls } = key.curve else {
                        continue;
                    };
                    let at = moved
                        .iter()
                        .position(|(_, id)| *id == ids[i])
                        .expect("all moved keys retain their identities");
                    if moved.get(at + 1).map(|(_, id)| *id) != ids.get(i + 1).copied() {
                        return Err(invalid(
                            "Move complete Bezier segments without changing their neighbors.",
                        ));
                    }
                    let left_delta = moved[at].0.frame - key.frame;
                    let right_delta = moved[at + 1].0.frame - track.keys[i + 1].frame;
                    let axes = if track.channel == BoneChannel::Rotate {
                        1
                    } else {
                        2
                    };
                    for axis in &mut controls[..axes] {
                        axis[0] += left_delta;
                        axis[2] += right_delta;
                    }
                    moved[at].0.curve = KeyCurve::Bezier { controls };
                }
                *ids = moved.iter().map(|(_, id)| *id).collect();
                track.keys = moved.into_iter().map(|(key, _)| key).collect();
            }
            frame.focus.animation = Some(animation);
        }
        _ => return Err(invalid("Choose a supported animation operation.")),
    }
    crate::animation_slots::validate(frame)?;
    crate::animation_deform::validate(frame)?;
    validate_curves(&frame.project)
}
fn cubic(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
    let u = 1. - t;
    u * u * u * a + 3. * u * u * t * b + 3. * u * t * t * c + t * t * t * d
}
/// Handles are absolute editor frame/value coordinates. Their X bounds give a
/// monotone segment; fixed bisection also handles a stationary X derivative.
fn bezier(
    left: &BoneKeyframe,
    right: &BoneKeyframe,
    controls: [f32; 4],
    frame: f64,
    axis: usize,
) -> f64 {
    let [cx1, cy1, cx2, cy2] = controls.map(f64::from);
    let mut low = 0.;
    let mut high = 1.;
    for _ in 0..48 {
        let mid = (low + high) * 0.5;
        if cubic(f64::from(left.frame), cx1, cx2, f64::from(right.frame), mid) < frame {
            low = mid;
        } else {
            high = mid;
        }
    }
    cubic(
        f64::from(left.values[axis]),
        cy1,
        cy2,
        f64::from(right.values[axis]),
        (low + high) * 0.5,
    )
}
/// Typed animation values apply relative to immutable Setup. Frame conversion
/// uses the stored project FPS; this does not recover the Physics export clock.
pub(crate) fn sample(
    scene: &SceneProject,
    animation: &Animation,
    time: f64,
) -> Result<Vec<solve::LocalPose>, AppError> {
    if !time.is_finite() || time < 0. {
        return Err(invalid("Use a finite nonnegative animation time."));
    }
    let frame = time * f64::from(scene.fps);
    let mut poses: Vec<_> = scene.rig.bones.iter().map(solve::LocalPose::from).collect();
    for track in &animation.tracks {
        let pose = poses
            .get_mut(track.bone)
            .ok_or_else(|| invalid("Animation bone is missing."))?;
        let Some(first) = track.keys.first() else {
            continue;
        };
        if frame < f64::from(first.frame) {
            continue;
        }
        let end = track.keys.partition_point(|k| f64::from(k.frame) <= frame);
        let left = &track.keys[end.saturating_sub(1)];
        let value = if frame == f64::from(left.frame) {
            left.values.map(f64::from)
        } else if let Some(right) = track.keys.get(end) {
            if let KeyCurve::Bezier { controls } = left.curve {
                [
                    bezier(left, right, controls[0], frame, 0),
                    if track.channel == BoneChannel::Rotate {
                        0.
                    } else {
                        bezier(left, right, controls[1], frame, 1)
                    },
                ]
            } else {
                let ratio = if left.curve == KeyCurve::Stepped {
                    0.
                } else {
                    (frame - f64::from(left.frame))
                        / (f64::from(right.frame) - f64::from(left.frame))
                };
                [
                    f64::from(left.values[0])
                        + (f64::from(right.values[0]) - f64::from(left.values[0])) * ratio,
                    f64::from(left.values[1])
                        + (f64::from(right.values[1]) - f64::from(left.values[1])) * ratio,
                ]
            }
        } else {
            left.values.map(f64::from)
        };
        match track.channel {
            BoneChannel::Translate => {
                pose.x += value[0];
                pose.y += value[1];
            }
            BoneChannel::Rotate => pose.rotation += value[0],
            BoneChannel::Scale => {
                pose.scale_x *= value[0];
                pose.scale_y *= value[1];
            }
            BoneChannel::Shear => {
                pose.shear_x += value[0];
                pose.shear_y += value[1];
            }
        }
    }
    Ok(poses)
}
