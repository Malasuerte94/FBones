//! Typed animation authoring and sampling. Setup channels are never replaced.
use crate::{project::AppError, rig::RigEdit, scene_edit::SceneFrame, solve};
use fbones_format::minimal::scene::{
    Animation, AnimationFolderEntry, BoneChannel, BoneKeyframe, BoneSplitMode, BoneTimeline,
    ConstraintTimeline, KeyCurve, SceneProject, SlotSplitMode, SlotTimeline, SplitModeConfig,
};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::collections::HashSet;
#[path = "animation_time_scale.rs"]
mod time_scale;
#[cfg(test)]
#[path = "animation_bone_curve_time_tests.rs"]
mod curve_time_tests;
#[cfg(test)]
#[path = "animation_shift_tests.rs"]
mod shift_tests;
#[cfg(test)]
#[path = "animation_split_tests.rs"]
mod split_tests;
#[cfg(test)]
#[path = "animation_tests.rs"]
mod tests;
#[cfg(test)]
#[path = "animation_folder_tests.rs"]
mod folder_tests;

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
    TranslateX,
    TranslateY,
    ScaleX,
    ScaleY,
}
impl ChannelInput {
    fn model(self) -> BoneChannel {
        match self {
            Self::Rotate => BoneChannel::Rotate,
            Self::Translate => BoneChannel::Translate,
            Self::Scale => BoneChannel::Scale,
            Self::Shear => BoneChannel::Shear,
            Self::TranslateX => BoneChannel::TranslateX,
            Self::TranslateY => BoneChannel::TranslateY,
            Self::ScaleX => BoneChannel::ScaleX,
            Self::ScaleY => BoneChannel::ScaleY,
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
#[serde(rename_all = "camelCase", try_from = "KeyInputWire")]
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
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct KeyInputWire {
    key_id: Option<u64>,
    bone: u64,
    channel: ChannelInput,
    frame: f32,
    values: [f32; 2],
    curve: CurveInput,
    controls: Option<[[f32; 4]; 2]>,
    #[serde(default)]
    negative_zero_indices: Vec<usize>,
}
impl TryFrom<KeyInputWire> for KeyInput {
    type Error = &'static str;

    fn try_from(mut input: KeyInputWire) -> Result<Self, Self::Error> {
        let dimensions = input.channel.model().dimensions();
        let mut seen = [false; 10];
        // The desktop payload indexes 2 values followed by the 2 × 4 controls.
        // Restore only active lanes, leaving scalar padding to ordinary validation.
        for index in input.negative_zero_indices {
            let value = match index {
                0..=1 if index < dimensions => &mut input.values[index],
                2..=9 if (index - 2) / 4 < dimensions => {
                    let controls = input
                        .controls
                        .as_mut()
                        .ok_or("Animation negative-zero controls require numeric controls.")?;
                    &mut controls[(index - 2) / 4][(index - 2) % 4]
                }
                _ => return Err("Animation negative-zero indices must address active fields."),
            };
            if *value != 0. || seen[index] {
                return Err("Animation negative-zero indices must address distinct zero fields.");
            }
            seen[index] = true;
            *value = -0.;
        }
        Ok(Self {
            key_id: input.key_id,
            bone: input.bone,
            channel: input.channel,
            frame: input.frame,
            values: input.values,
            curve: input.curve,
            controls: input.controls,
        })
    }
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
pub struct SplitModeView {
    pub bone: u64,
    pub mode: u32,
}
#[derive(Clone, Debug, Serialize)]
pub struct SlotSplitModeView {
    pub slot: u64,
    pub mode: &'static str,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationView {
    pub id: u64,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub split_modes: Vec<SplitModeView>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub slot_split_modes: Vec<SlotSplitModeView>,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub folder: Option<String>,
    /// Duration in stored frames, not seconds.
    pub duration: f32,
    pub tracks: Vec<TrackView>,
    pub slot_tracks: Vec<crate::animation_slots::SlotTrackView>,
    pub draw_order: Vec<crate::animation_order::OrderKeyView>,
    pub deform_tracks: Vec<crate::animation_deform::DeformTrackView>,
    pub constraint_tracks: Vec<crate::animation_constraints::ConstraintTrackView>,
    pub event_tracks: Vec<crate::animation_events::EventTrackView>,
    pub sequence_tracks: Vec<crate::animation_sequence::SequenceTrackView>,
}
fn channel_name(channel: BoneChannel) -> &'static str {
    match channel {
        BoneChannel::Rotate => "rotate",
        BoneChannel::Translate => "translate",
        BoneChannel::Scale => "scale",
        BoneChannel::Shear => "shear",
        BoneChannel::TranslateX => "translateX",
        BoneChannel::TranslateY => "translateY",
        BoneChannel::ScaleX => "scaleX",
        BoneChannel::ScaleY => "scaleY",
    }
}
pub(crate) fn views(frame: &SceneFrame) -> Vec<AnimationView> {
    (0..frame.project.animations.len())
        .map(|a| view(frame, a))
        .collect()
}
pub(crate) fn duration(clip: &Animation) -> f32 {
    clip.tracks
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
                .max(crate::animation_events::duration(clip))
                .max(crate::animation_sequence::duration(clip)),
            f32::max,
        )
}

pub(crate) fn view(frame: &SceneFrame, a: usize) -> AnimationView {
    let clip = &frame.project.animations[a];
    AnimationView {
        id: frame.animation_ids[a],
        split_modes: clip
            .bone_split_modes()
            .map(|row| SplitModeView {
                bone: frame.bone_ids[row.bone],
                mode: row.mode.wire(),
            })
            .collect(),
        slot_split_modes: clip
            .split_modes
            .iter()
            .filter_map(|row| match row {
                SplitModeConfig::Slot(row) => Some(SlotSplitModeView {
                    slot: frame.slot_ids[row.slot],
                    mode: match row.mode {
                        SlotSplitMode::RgbAlpha => "rgbAlpha",
                    },
                }),
                SplitModeConfig::Bone(_) => None,
            })
            .collect(),
        name: frame
            .project
            .qualified_animation_name(a)
            .expect("current clip")
            .into_owned(),
        folder: frame.project.animation_folder_name(a).map(str::to_owned),
        duration: duration(clip),
        slot_tracks: crate::animation_slots::views(frame, a),
        draw_order: crate::animation_order::views(frame, a),
        deform_tracks: crate::animation_deform::views(frame, a),
        constraint_tracks: crate::animation_constraints::views(frame, a),
        event_tracks: crate::animation_events::views(frame, a),
        sequence_tracks: crate::animation_sequence::views(frame, a),
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
    }
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
            | RigEdit::SetAnimationSequenceKeys { .. }
            | RigEdit::CreateAnimation { .. }
            | RigEdit::DuplicateAnimation { .. }
            | RigEdit::StoreAnimationKeys { .. }
            | RigEdit::ClearStoredAnimationKeys { .. }
            | RigEdit::SwapStoredAnimationKeys { .. }
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
            | RigEdit::ScaleAnimationKeys { .. }
            | RigEdit::OffsetAnimationKeys { .. }
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
fn checked_name(
    project: &SceneProject,
    input: &str,
    folder_owner: Option<usize>,
    except: Option<usize>,
) -> Result<String, AppError> {
    let folder = folder_owner.and_then(|index| project.animation_folder_name(index));
    let name = match folder {
        Some(folder) => input
            .strip_prefix(folder)
            .and_then(|suffix| suffix.strip_prefix('/'))
            .or_else(|| {
                input
                    .trim_start()
                    .strip_prefix(folder)
                    .and_then(|suffix| suffix.strip_prefix('/'))
            })
            .unwrap_or(input),
        None => input,
    }
    .trim();
    if name.is_empty() || name.len() > 1024 || name.chars().any(char::is_control) {
        return Err(invalid(
            "Use a nonempty animation name without control characters.",
        ));
    }
    if folder.is_some() && name.contains('/') {
        return Err(invalid("Keep the animation in its current folder."));
    }
    let qualified = match folder {
        Some(folder) => Cow::Owned(format!("{folder}/{name}")),
        None => Cow::Borrowed(name),
    };
    if (0..project.animations.len()).any(|index| {
        Some(index) != except
            && project.qualified_animation_name(index).as_deref() == Some(qualified.as_ref())
    }) {
        return Err(invalid("An animation already uses that name."));
    }
    Ok(name.into())
}

fn push_clip(project: &mut SceneProject, clip: Animation, duplicate_of: Option<usize>) {
    let index = project.animations.len();
    project.animations.push(clip);
    let Some(layout) = &mut project.animation_folders else {
        return;
    };
    let folder = duplicate_of.and_then(|source| {
        layout.entries.iter_mut().find_map(|entry| match entry {
            AnimationFolderEntry::Folder(folder) if folder.clips.contains(&source) => Some(folder),
            _ => None,
        })
    });
    if let Some(folder) = folder {
        folder.clips.push(index);
    } else {
        layout.entries.push(AnimationFolderEntry::Clip(index));
    }
}

fn remove_clip(project: &mut SceneProject, index: usize) {
    project.animations.remove(index);
    if let Some(layout) = &mut project.animation_folders {
        let remap = |clip: &mut usize| {
            if *clip == index {
                return false;
            }
            if *clip > index {
                *clip -= 1;
            }
            true
        };
        layout.entries.retain_mut(|entry| match entry {
            AnimationFolderEntry::Clip(clip) => remap(clip),
            AnimationFolderEntry::Folder(folder) => {
                folder.clips.retain_mut(remap);
                true
            }
        });
    }
}
pub(crate) fn checked_frame(value: f32) -> Result<f32, AppError> {
    if !value.is_finite() || !(0.0..=MAX_FRAME).contains(&value) {
        return Err(invalid("Use a finite frame between 0 and 1000000."));
    }
    Ok(if value == 0.0 { 0.0 } else { value })
}
pub(crate) fn moved_frame(frame: f32, delta: f32) -> Result<f32, AppError> {
    let next = checked_frame(frame + delta)?;
    Ok(if next == frame { frame } else { next })
}

pub(crate) fn move_control_times(controls: &mut [f32; 4], left_delta: f32, right_delta: f32) {
    if left_delta != 0. {
        controls[0] += left_delta;
    }
    if right_delta != 0. {
        controls[2] += right_delta;
    }
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
        .chain(
            frame.animation_sequence_key_ids[a]
                .iter()
                .flatten()
                .copied(),
        )
        .collect();
    if !wanted.is_subset(&available) {
        return Err(invalid("An animation key no longer exists."));
    }
    Ok(wanted)
}

fn add_shift_suffix<K>(
    keys: &[K],
    ids: &[u64],
    wanted: &mut HashSet<u64>,
    time: impl Fn(&K) -> f32,
) {
    let anchor = keys
        .iter()
        .zip(ids)
        .filter(|(_, id)| wanted.contains(*id))
        .map(|(key, _)| time(key))
        .reduce(f32::min);
    if let Some(anchor) = anchor {
        wanted.extend(
            keys.iter()
                .zip(ids)
                .filter(|(key, _)| time(key) > anchor)
                .map(|(_, id)| *id),
        );
    }
}

fn extend_shift_selection(frame: &SceneFrame, a: usize, wanted: &mut HashSet<u64>) {
    let clip = &frame.project.animations[a];
    for (track, ids) in clip.tracks.iter().zip(&frame.animation_key_ids[a]) {
        add_shift_suffix(&track.keys, ids, wanted, |key| key.frame);
    }
    for (track, ids) in clip
        .slot_tracks
        .iter()
        .zip(&frame.animation_slot_key_ids[a])
    {
        match track {
            SlotTimeline::Attachment { keys, .. } => {
                add_shift_suffix(keys, ids, wanted, |key| key.frame)
            }
            SlotTimeline::Rgba { keys, .. } => add_shift_suffix(keys, ids, wanted, |key| key.frame),
            SlotTimeline::Rgb2 { .. } | SlotTimeline::Alpha { .. } => {}
        }
    }
    add_shift_suffix(
        &clip.draw_order,
        &frame.animation_draw_key_ids[a],
        wanted,
        |key| key.frame,
    );
    for (track, ids) in clip
        .deform_tracks
        .iter()
        .zip(&frame.animation_deform_key_ids[a])
    {
        add_shift_suffix(&track.keys, ids, wanted, |key| key.frame);
    }
    for (track, ids) in clip
        .constraint_tracks
        .iter()
        .zip(&frame.animation_constraint_key_ids[a])
    {
        match track {
            ConstraintTimeline::Ik { keys, .. } => {
                add_shift_suffix(keys, ids, wanted, |key| key.frame)
            }
            ConstraintTimeline::TransformMix { keys, .. } => {
                add_shift_suffix(keys, ids, wanted, |key| key.frame)
            }
            ConstraintTimeline::PathPosition { keys, .. }
            | ConstraintTimeline::PathSpacing { keys, .. } => {
                add_shift_suffix(keys, ids, wanted, |key| key.frame)
            }
            ConstraintTimeline::PathMix { keys, .. } => {
                add_shift_suffix(keys, ids, wanted, |key| key.frame)
            }
            ConstraintTimeline::Physics { keys, .. } => {
                add_shift_suffix(keys, ids, wanted, |key| key.frame)
            }
            ConstraintTimeline::PhysicsReset { keys, .. } => {
                add_shift_suffix(keys, ids, wanted, |key| key.frame)
            }
        }
    }
    for (track, ids) in clip
        .event_tracks
        .iter()
        .zip(&frame.animation_event_key_ids[a])
    {
        add_shift_suffix(&track.keys, ids, wanted, |key| key.frame);
    }
    for (track, ids) in clip
        .sequence_tracks
        .iter()
        .zip(&frame.animation_sequence_key_ids[a])
    {
        add_shift_suffix(&track.keys, ids, wanted, |key| key.frame);
    }
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

fn repair_rotate_delete(window: &[BoneKeyframe]) -> Option<KeyCurve> {
    let [left, deleted, right, following] = window else {
        return None;
    };
    let (
        KeyCurve::Bezier { mut controls },
        KeyCurve::Stepped,
        KeyCurve::Bezier { controls: outgoing },
    ) = (left.curve, deleted.curve, right.curve)
    else {
        return None;
    };
    if !(left.frame < deleted.frame && deleted.frame < right.frame && right.frame < following.frame)
    {
        return None;
    }

    let right_frame = f64::from(right.frame);
    let right_value = f64::from(right.values[0]);
    let tangent_x = f64::from(outgoing[0][0]) - right_frame;
    let tangent_y = f64::from(outgoing[0][1]) - right_value;
    let extent = (right_value - f64::from(left.values[0])).abs();
    if tangent_x < 0.0 || tangent_y == 0.0 || extent == 0.0 {
        return None;
    }

    // Extend the surviving right tangent backwards by the surviving value span.
    let incoming_frame = (right_frame - tangent_x * (extent / tangent_y.abs())) as f32;
    let incoming_value = (right_value - tangent_y.signum() * extent) as f32;
    if [incoming_frame, incoming_value]
        .iter()
        .any(|value| !value.is_finite() || value.abs() > MAX_FRAME)
        || (tangent_x > 0.0 && incoming_frame == right.frame)
        || incoming_value == right.values[0]
        || !fbones_format::minimal::scene::bezier_time_monotone(
            left.frame,
            right.frame,
            controls[0][0],
            incoming_frame,
        )
    {
        return None;
    }
    controls[0][2..4].copy_from_slice(&[incoming_frame, incoming_value]);
    Some(KeyCurve::Bezier { controls })
}

pub(crate) fn validate_curves(project: &SceneProject) -> Result<(), AppError> {
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
                    if track.channel.dimensions() == 1 && controls[1].map(f32::to_bits) != [0; 4] {
                        return Err(invalid("Single-axis Bezier keys use one axis of controls."));
                    }
                    let axes = track.channel.dimensions();
                    if controls[..axes].iter().any(|axis| {
                        axis.iter().any(|v| !v.is_finite() || v.abs() > 1_000_000.)
                            || !fbones_format::minimal::scene::bezier_time_monotone(
                                key.frame,
                                right.frame,
                                axis[0],
                                axis[2],
                            )
                    }) {
                        return Err(invalid("Use finite Bezier handles whose time coordinate increases across the segment."));
                    }
                }
            }
        }
    }
    Ok(())
}
fn check_representation(
    animation: &Animation,
    bone: usize,
    channel: BoneChannel,
) -> Result<(), AppError> {
    let mode = animation
        .bone_split_modes()
        .find(|row| row.bone == bone)
        .map(|row| row.mode);
    let permitted = match channel {
        BoneChannel::TranslateX | BoneChannel::TranslateY => mode == Some(BoneSplitMode::Translate),
        BoneChannel::ScaleX | BoneChannel::ScaleY => mode == Some(BoneSplitMode::Scale),
        BoneChannel::Translate => mode != Some(BoneSplitMode::Translate),
        BoneChannel::Scale => mode != Some(BoneSplitMode::Scale),
        BoneChannel::Rotate | BoneChannel::Shear => true,
    };
    if !permitted {
        return Err(invalid("Use this bone's existing combined or split-axis representation; conversion is not supported."));
    }
    Ok(())
}

/// Expand a Current-only Auto Key request using the authored track and key IDs.
/// The generated predecessor edits stay inside the native transaction.
pub(crate) fn expand_auto_bone_keys(
    frame: &SceneFrame,
    animation: u64,
    keys: Vec<KeyInput>,
    lanes: Vec<[bool; 2]>,
) -> Result<Vec<KeyInput>, AppError> {
    if keys.is_empty() || keys.len() > MAX_KEYS || keys.len() != lanes.len() {
        return Err(invalid("Choose a nonempty bounded Auto Key batch and its edited lanes."));
    }
    let submitted_frame = keys[0].frame;
    let position = checked_frame(submitted_frame)?;
    let a = animation_index(frame, animation)?;
    let animation = &frame.project.animations[a];
    let mut seen = HashSet::with_capacity(keys.len());
    let mut expanded = Vec::with_capacity(keys.len());
    for (mut key, edited) in keys.into_iter().zip(lanes) {
        let bone = frame.bone_index(key.bone)?;
        let channel = key.channel.model();
        let dimensions = channel.dimensions();
        check_representation(animation, bone, channel)?;
        if key.frame.to_bits() != submitted_frame.to_bits()
            || key.key_id.is_some()
            || !matches!(key.curve, CurveInput::Linear)
            || key.controls.is_some()
            || !key.values.iter().copied().all(valid_auto_field)
            || !edited[..dimensions].iter().any(|&value| value)
            || (dimensions == 1 && (edited[1] || key.values[1].to_bits() != 0))
            || !seen.insert((bone, channel_name(channel)))
        {
            return Err(invalid("Auto Key requests must address distinct bone channels and edited values at Current."));
        }
        key.frame = position;

        let mut sampled = if matches!(
            channel,
            BoneChannel::Scale | BoneChannel::ScaleX | BoneChannel::ScaleY
        ) {
            [1.0; 2]
        } else {
            [0.0; 2]
        };
        if let Some(t) = animation
            .tracks
            .iter()
            .position(|track| track.bone == bone && track.channel == channel)
        {
            let track = &animation.tracks[t];
            let end = track.keys.partition_point(|key| key.frame <= position);
            if end > 0 {
                let left = &track.keys[end - 1];
                let left_id = frame.animation_key_ids[a][t][end - 1];
                sampled = left.values;
                if left.frame == position {
                    key.key_id = Some(left_id);
                    (key.curve, key.controls) = match left.curve {
                        KeyCurve::Linear => (CurveInput::Linear, None),
                        KeyCurve::Stepped => (CurveInput::Stepped, None),
                        KeyCurve::Bezier { controls } => (CurveInput::Bezier, Some(controls)),
                    };
                } else if let Some(right) = track.keys.get(end) {
                    match left.curve {
                        KeyCurve::Linear => {
                            let ratio = (f64::from(position) - f64::from(left.frame))
                                / (f64::from(right.frame) - f64::from(left.frame));
                            for (axis, value) in sampled[..dimensions].iter_mut().enumerate() {
                                *value = interpolate_key_field(
                                    f64::from(left.values[axis]),
                                    f64::from(right.values[axis]),
                                    ratio,
                                ) as f32;
                            }
                        }
                        KeyCurve::Stepped => key.curve = CurveInput::Stepped,
                        KeyCurve::Bezier { controls } => {
                            let mut first = [[0.0; 4]; 2];
                            let mut second = [[0.0; 4]; 2];
                            for axis in 0..dimensions {
                                (first[axis], second[axis], sampled[axis]) = split_auto_bezier_axis(
                                    left,
                                    right,
                                    controls[axis],
                                    position,
                                    axis,
                                    edited[axis].then_some(key.values[axis]),
                                )?;
                            }
                            expanded.push(KeyInput {
                                key_id: Some(left_id),
                                bone: key.bone,
                                channel: key.channel,
                                frame: left.frame,
                                values: left.values,
                                curve: CurveInput::Bezier,
                                controls: Some(first),
                            });
                            key.curve = CurveInput::Bezier;
                            key.controls = Some(second);
                        }
                    }
                }
            }
        }
        for axis in 0..dimensions {
            if !edited[axis] {
                key.values[axis] = sampled[axis];
            }
        }
        expanded.push(key);
        if expanded.len() > MAX_KEYS {
            return Err(invalid("Auto Key subdivision exceeds the supported key batch size."));
        }
    }
    Ok(expanded)
}

fn valid_auto_field(value: f32) -> bool {
    value.is_finite() && value.abs() <= MAX_FRAME
}

fn interpolate_key_field(a: f64, b: f64, t: f64) -> f64 {
    if a == b {
        a
    } else {
        a + (b - a) * t
    }
}

fn subdivide_key_field(points: [f32; 4], t: f64) -> [f32; 5] {
    let [a, b, c, d] = points.map(f64::from);
    let ab = interpolate_key_field(a, b, t);
    let bc = interpolate_key_field(b, c, t);
    let cd = interpolate_key_field(c, d, t);
    let abc = interpolate_key_field(ab, bc, t);
    let bcd = interpolate_key_field(bc, cd, t);
    [ab, abc, interpolate_key_field(abc, bcd, t), bcd, cd].map(|value| value as f32)
}

fn split_auto_bezier_axis(
    left: &BoneKeyframe,
    right: &BoneKeyframe,
    [x1, y1, x2, y2]: [f32; 4],
    frame: f32,
    axis: usize,
    edited_value: Option<f32>,
) -> Result<([f32; 4], [f32; 4], f32), AppError> {
    use fbones_format::minimal::scene::bezier_time_monotone;
    if !bezier_time_monotone(left.frame, right.frame, x1, x2) {
        return Err(invalid("Auto Key requires a monotone Bézier time interval."));
    }
    let t = bezier_parameter(left.frame, right.frame, x1, x2, f64::from(frame));
    let [first_x, second_x, center_x, third_x, fourth_x] =
        subdivide_key_field([left.frame, x1, x2, right.frame], t);
    let [first_y, mut second_y, center_y, mut third_y, fourth_y] =
        subdivide_key_field([left.values[axis], y1, y2, right.values[axis]], t);
    // Move the two handles adjoining the new key along with its edited ordinate.
    let delta = f64::from(edited_value.unwrap_or(center_y)) - f64::from(center_y);
    if delta != 0.0 {
        second_y = (f64::from(second_y) + delta) as f32;
        third_y = (f64::from(third_y) + delta) as f32;
    }
    let first = [first_x, first_y, second_x, second_y];
    let second = [third_x, third_y, fourth_x, fourth_y];
    if center_x != frame
        || !valid_auto_field(center_y)
        || !first.into_iter().chain(second).all(valid_auto_field)
        || !bezier_time_monotone(left.frame, frame, first[0], first[2])
        || !bezier_time_monotone(frame, right.frame, second[0], second[2])
    {
        return Err(invalid("Auto Key cannot represent both Bézier intervals at Current."));
    }
    Ok((first, second, center_y))
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
        check_representation(&frame.project.animations[a], bone, channel)?;
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
        if channel.dimensions() == 1 && channel != BoneChannel::Rotate && values[1].to_bits() != 0 {
            return Err(invalid(
                "Scalar keys require exact positive-zero padding in the second value lane.",
            ));
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
    for (bone, channel, position, mut values, mut curve, target) in checked {
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
            let stored = &track.keys[k];
            let position = stored.frame;
            if channel.dimensions() == 1 && channel != BoneChannel::Rotate {
                if values[0] == stored.values[0] {
                    values[0] = stored.values[0];
                }
                if let (KeyCurve::Bezier { controls }, KeyCurve::Bezier { controls: old }) =
                    (&mut curve, stored.curve)
                {
                    for (value, previous) in controls[0].iter_mut().zip(old[0]) {
                        if *value == previous {
                            *value = previous;
                        }
                    }
                }
            }
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
    // SceneHistory validates the complete candidate through the format encoder
    // before publishing history. Its all-family project/per-clip budgets also
    // govern slot, Sequence, draw-order, deform, constraint and Event edits.
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
        RigEdit::SetAnimationSequenceKeys { animation, keys } => {
            let a = animation_index(frame, animation)?;
            crate::animation_sequence::set_keys(frame, next_key, a, keys)?;
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
            let name = checked_name(&frame.project, &name, None, None)?;
            let id = allocate(next_animation)?;
            push_clip(&mut frame.project, Animation::new(name), None);
            frame.animation_ids.push(id);
            frame.animation_key_ids.push(vec![]);
            frame.animation_slot_key_ids.push(vec![]);
            frame.animation_draw_key_ids.push(vec![]);
            frame.animation_deform_key_ids.push(vec![]);
            frame.animation_constraint_key_ids.push(vec![]);
            frame.animation_event_key_ids.push(vec![]);
            frame.animation_sequence_key_ids.push(vec![]);
            frame.focus.animation = Some(id);
        }
        RigEdit::DuplicateAnimation { id, name } => {
            let a = animation_index(frame, id)?;
            if frame.project.animations.len() >= 64 {
                return Err(invalid("This profile supports at most 64 animations."));
            }
            let name = checked_name(&frame.project, &name, Some(a), None)?;
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
            let sequence_key_ids = crate::animation_sequence::allocate_ids(&clip, next_key)?;
            push_clip(&mut frame.project, clip, Some(a));
            frame.animation_ids.push(duplicate_id);
            frame.animation_key_ids.push(key_ids);
            frame.animation_slot_key_ids.push(slot_key_ids);
            frame.animation_draw_key_ids.push(draw_key_ids);
            frame.animation_deform_key_ids.push(deform_key_ids);
            frame.animation_constraint_key_ids.push(constraint_key_ids);
            frame.animation_event_key_ids.push(event_key_ids);
            frame.animation_sequence_key_ids.push(sequence_key_ids);
            frame.focus.animation = Some(duplicate_id);
        }
        RigEdit::RenameAnimation { id, name } => {
            let a = animation_index(frame, id)?;
            let name = checked_name(&frame.project, &name, Some(a), Some(a))?;
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
            remove_clip(&mut frame.project, a);
            frame.animation_ids.remove(a);
            frame.animation_key_ids.remove(a);
            frame.animation_slot_key_ids.remove(a);
            frame.animation_draw_key_ids.remove(a);
            frame.animation_deform_key_ids.remove(a);
            frame.animation_constraint_key_ids.remove(a);
            frame.animation_event_key_ids.remove(a);
            frame.animation_sequence_key_ids.remove(a);
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
            crate::animation_sequence::delete_keys(frame, a, &wanted);
            for t in (0..frame.project.animations[a].tracks.len()).rev() {
                let track = &mut frame.project.animations[a].tracks[t];
                let ids = &mut frame.animation_key_ids[a][t];
                let old_keys = track.keys.clone();
                let old_ids = ids.clone();
                let mut repaired = HashSet::new();
                if track.channel == BoneChannel::Rotate {
                    for (left, window) in old_keys.windows(4).enumerate() {
                        let local_ids = &old_ids[left..left + 4];
                        if !wanted.contains(&local_ids[1])
                            || [local_ids[0], local_ids[2], local_ids[3]]
                                .iter()
                                .any(|id| wanted.contains(id))
                        {
                            continue;
                        }
                        if let Some(curve) = repair_rotate_delete(window) {
                            track.keys[left].curve = curve;
                            repaired.insert(local_ids[0]);
                        }
                    }
                }
                for k in (0..ids.len()).rev() {
                    if wanted.contains(&ids[k]) {
                        ids.remove(k);
                        track.keys.remove(k);
                    }
                }
                check_bezier_neighbors(&old_keys, &old_ids, &track.keys, ids, &repaired)?;
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
            sequence_keys,
        } => {
            if bone_keys.is_empty()
                && slot_keys.is_empty()
                && draw_order_keys.is_empty()
                && deform_keys.is_empty()
                && constraint_keys.is_empty()
                && event_keys.is_empty()
                && sequence_keys.is_empty()
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
            if !sequence_keys.is_empty() {
                crate::animation_sequence::set_keys(frame, next_key, a, sequence_keys)?;
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
            shift,
        } => {
            let a = animation_index(frame, animation)?;
            let mut wanted = selected_keys(frame, a, &keys)?;
            if !delta_frames.is_finite() {
                return Err(invalid("Use a finite frame offset."));
            }
            if delta_frames == 0. {
                return Ok(());
            }
            if shift {
                extend_shift_selection(frame, a, &mut wanted);
                if wanted.len() > MAX_KEYS {
                    return Err(invalid(
                        "Shifting would exceed the animation key move limit.",
                    ));
                }
            }
            crate::animation_slots::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_order::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_deform::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_constraints::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_events::move_keys(frame, a, &wanted, delta_frames)?;
            crate::animation_sequence::move_keys(frame, a, &wanted, delta_frames)?;
            for t in 0..frame.project.animations[a].tracks.len() {
                let track = &mut frame.project.animations[a].tracks[t];
                let ids = &mut frame.animation_key_ids[a][t];
                if !ids.iter().any(|id| wanted.contains(id)) {
                    continue;
                }
                let mut moved = track
                    .keys
                    .iter()
                    .cloned()
                    .zip(ids.iter().copied())
                    .map(|(mut key, id)| {
                        if wanted.contains(&id) {
                            key.frame = moved_frame(key.frame, delta_frames)?;
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
                    let axes = track.channel.dimensions();
                    for axis in &mut controls[..axes] {
                        move_control_times(axis, left_delta, right_delta);
                    }
                    moved[at].0.curve = KeyCurve::Bezier { controls };
                }
                *ids = moved.iter().map(|(_, id)| *id).collect();
                track.keys = moved.into_iter().map(|(key, _)| key).collect();
            }
            frame.focus.animation = Some(animation);
        }
        RigEdit::ScaleAnimationKeys {
            animation,
            keys,
            anchor_frame,
            from_edge_frame,
            to_edge_frame,
        } => {
            let a = animation_index(frame, animation)?;
            let wanted = selected_keys(frame, a, &keys)?;
            time_scale::apply(frame, a, &wanted, anchor_frame, from_edge_frame, to_edge_frame)?;
            frame.focus.animation = Some(animation);
        }
        _ => return Err(invalid("Choose a supported animation operation.")),
    }
    crate::animation_slots::validate(frame)?;
    crate::animation_deform::validate(frame)?;
    validate_curves(&frame.project)
}
pub(crate) fn cubic(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
    let u = 1. - t;
    u * u * u * a + 3. * u * u * t * b + 3. * u * t * t * c + t * t * t * d
}
/// Invert the absolute frame axis, including a stationary time derivative.
fn bezier_parameter(first: f32, last: f32, outgoing: f32, incoming: f32, frame: f64) -> f64 {
    let [first, outgoing, incoming, last] = [first, outgoing, incoming, last].map(f64::from);
    let mut low = 0.;
    let mut high = 1.;
    for _ in 0..48 {
        let mid = (low + high) * 0.5;
        if cubic(first, outgoing, incoming, last, mid) < frame {
            low = mid;
        } else {
            high = mid;
        }
    }
    (low + high) * 0.5
}

fn bezier(
    left: &BoneKeyframe,
    right: &BoneKeyframe,
    [x1, y1, x2, y2]: [f32; 4],
    frame: f64,
    axis: usize,
) -> f64 {
    cubic(
        f64::from(left.values[axis]),
        f64::from(y1),
        f64::from(y2),
        f64::from(right.values[axis]),
        bezier_parameter(left.frame, right.frame, x1, x2, frame),
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
                    if track.channel.dimensions() == 1 {
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
            BoneChannel::TranslateX => pose.x += value[0],
            BoneChannel::TranslateY => pose.y += value[0],
            BoneChannel::ScaleX => pose.scale_x *= value[0],
            BoneChannel::ScaleY => pose.scale_y *= value[0],
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
