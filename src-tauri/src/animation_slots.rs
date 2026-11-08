//! Slot keys use the same native history as bone keys; sampled state is transient.
use crate::{
    animation::{self, CurveInput},
    project::AppError,
    scene_edit::SceneFrame,
};
use fbones_format::minimal::scene::{
    Animation, SlotAttachmentKey, SlotRgbaCurve, SlotRgbaKey, SlotTimeline,
};
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::HashSet;
#[cfg(test)]
#[path = "animation_slots_tests.rs"]
mod tests;

fn invalid(message: &str) -> AppError {
    AppError::new("InvalidAnimation", message)
}
fn required_attachment<'de, D: Deserializer<'de>>(d: D) -> Result<Option<u64>, D::Error> {
    Option::deserialize(d)
}
#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "channel", rename_all = "camelCase", deny_unknown_fields)]
pub enum SlotKeyInput {
    Attachment {
        slot: u64,
        frame: f32,
        #[serde(deserialize_with = "required_attachment")]
        attachment: Option<u64>,
        #[serde(default, rename = "keyId")]
        key_id: Option<u64>,
    },
    Rgba {
        slot: u64,
        frame: f32,
        values: [f32; 4],
        #[serde(default, rename = "darkValues")]
        dark_values: Option<[f32; 3]>,
        #[serde(default, rename = "darkControls")]
        dark_controls: Option<[[f32; 4]; 3]>,
        curve: CurveInput,
        #[serde(default)]
        controls: Option<[[f32; 4]; 4]>,
        #[serde(default, rename = "keyId")]
        key_id: Option<u64>,
    },
}
impl SlotKeyInput {
    pub(crate) fn context(&self) -> (u64, f32) {
        match self {
            Self::Attachment { slot, frame, .. } | Self::Rgba { slot, frame, .. } => {
                (*slot, *frame)
            }
        }
    }
    fn key_id(&self) -> Option<u64> {
        match self {
            Self::Attachment { key_id, .. } | Self::Rgba { key_id, .. } => *key_id,
        }
    }
    fn rgba(&self) -> bool {
        matches!(self, Self::Rgba { .. })
    }
}
#[derive(Clone, Debug, Serialize)]
pub struct AttachmentKeyView {
    pub id: u64,
    pub frame: f32,
    pub attachment: Option<u64>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RgbaKeyView {
    pub id: u64,
    pub frame: f32,
    pub values: [f32; 4],
    pub dark_values: [f32; 3],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dark_controls: Option<[[f32; 4]; 3]>,
    pub curve: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub controls: Option<[[f32; 4]; 4]>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "channel", rename_all = "camelCase")]
pub enum SlotTrackView {
    Attachment {
        slot: u64,
        keys: Vec<AttachmentKeyView>,
    },
    Rgba {
        slot: u64,
        keys: Vec<RgbaKeyView>,
    },
}
#[derive(Clone, Debug, Serialize)]
pub struct SlotPoseView {
    pub slot: u64,
    pub attachment: Option<u64>,
    pub color: [f64; 4],
    pub dark: [f64; 3],
}
pub(crate) fn slot(track: &SlotTimeline) -> usize {
    match track {
        SlotTimeline::Attachment { slot, .. } | SlotTimeline::Rgba { slot, .. } => *slot,
    }
}
fn is_rgba(track: &SlotTimeline) -> bool {
    matches!(track, SlotTimeline::Rgba { .. })
}
pub(crate) fn len(track: &SlotTimeline) -> usize {
    match track {
        SlotTimeline::Attachment { keys, .. } => keys.len(),
        SlotTimeline::Rgba { keys, .. } => keys.len(),
    }
}
fn frames(track: &SlotTimeline) -> Vec<f32> {
    match track {
        SlotTimeline::Attachment { keys, .. } => keys.iter().map(|k| k.frame).collect(),
        SlotTimeline::Rgba { keys, .. } => keys.iter().map(|k| k.frame).collect(),
    }
}
pub(crate) fn duration(clip: &Animation) -> f32 {
    clip.slot_tracks.iter().flat_map(frames).fold(0., f32::max)
}
pub(crate) fn canonicalize(frame: &mut SceneFrame) -> Result<(), AppError> {
    for (a, clip) in frame.project.animations.iter_mut().enumerate() {
        let permutation = clip.slot_track_permutation(&frame.project.slots)?;
        let old = clip.slot_tracks.clone();
        let ids = frame.animation_slot_key_ids[a].clone();
        clip.slot_tracks = permutation.iter().map(|i| old[*i].clone()).collect();
        frame.animation_slot_key_ids[a] = permutation.iter().map(|i| ids[*i].clone()).collect();
    }
    Ok(())
}
pub(crate) fn allocate_ids(clip: &Animation, next: &mut u64) -> Result<Vec<Vec<u64>>, AppError> {
    clip.slot_tracks
        .iter()
        .map(|t| (0..len(t)).map(|_| animation::allocate(next)).collect())
        .collect()
}
pub(crate) fn views(frame: &SceneFrame, a: usize) -> Vec<SlotTrackView> {
    frame.project.animations[a]
        .slot_tracks
        .iter()
        .enumerate()
        .map(|(t, track)| {
            let slot = slot(track);
            let ids = &frame.animation_slot_key_ids[a][t];
            match track {
                SlotTimeline::Attachment { keys, .. } => SlotTrackView::Attachment {
                    slot: frame.slot_ids[slot],
                    keys: keys
                        .iter()
                        .enumerate()
                        .map(|(k, key)| AttachmentKeyView {
                            id: ids[k],
                            frame: key.frame,
                            attachment: key.attachment.map(|i| frame.attachment_ids[slot][i]),
                        })
                        .collect(),
                },
                SlotTimeline::Rgba { keys, .. } => SlotTrackView::Rgba {
                    slot: frame.slot_ids[slot],
                    keys: keys
                        .iter()
                        .enumerate()
                        .map(|(k, key)| RgbaKeyView {
                            id: ids[k],
                            frame: key.frame,
                            values: key.values,
                            dark_values: key.dark_values,
                            dark_controls: match key.curve {
                                SlotRgbaCurve::Bezier { dark_controls, .. } => dark_controls,
                                _ => None,
                            },
                            curve: match key.curve {
                                SlotRgbaCurve::Linear => "linear",
                                SlotRgbaCurve::Stepped => "stepped",
                                SlotRgbaCurve::Bezier { .. } => "bezier",
                            },
                            controls: match key.curve {
                                SlotRgbaCurve::Bezier { controls, .. } => Some(controls),
                                _ => None,
                            },
                        })
                        .collect(),
                },
            }
        })
        .collect()
}
fn curve(input: CurveInput, controls: Option<[[f32; 4]; 4]>) -> Result<SlotRgbaCurve, AppError> {
    match (input, controls) {
        (CurveInput::Linear, None) => Ok(SlotRgbaCurve::Linear),
        (CurveInput::Stepped, None) => Ok(SlotRgbaCurve::Stepped),
        (CurveInput::Bezier, Some(controls)) => Ok(SlotRgbaCurve::Bezier {
            controls,
            dark_controls: None,
        }),
        _ => Err(invalid(
            "Only RGBA Bezier keys require four axes of controls.",
        )),
    }
}
fn check_neighbors(
    old: &[SlotRgbaKey],
    old_ids: &[u64],
    keys: &[SlotRgbaKey],
    ids: &[u64],
    explicit: &HashSet<u64>,
) -> Result<(), AppError> {
    for (i, key) in old.iter().enumerate() {
        if !matches!(key.curve, SlotRgbaCurve::Bezier { .. }) {
            continue;
        }
        let Some(at) = ids.iter().position(|id| *id == old_ids[i]) else {
            continue;
        };
        if matches!(keys[at].curve, SlotRgbaCurve::Bezier { .. })
            && ids.get(at + 1) != old_ids.get(i + 1)
            && !explicit.contains(&old_ids[i])
        {
            return Err(invalid("This edit changes an RGBA Bezier segment's neighbors. Edit its curve explicitly or select the complete segment."));
        }
    }
    Ok(())
}
pub(crate) fn validate(frame: &SceneFrame) -> Result<(), AppError> {
    for clip in &frame.project.animations {
        for track in &clip.slot_tracks {
            let SlotTimeline::Rgba { keys, .. } = track else {
                continue;
            };
            for (i, key) in keys.iter().enumerate() {
                if let SlotRgbaCurve::Bezier { controls, .. } = key.curve {
                    let right = keys
                        .get(i + 1)
                        .filter(|right| right.frame > key.frame)
                        .ok_or_else(|| {
                            invalid("An RGBA Bezier key needs a following key at a later frame.")
                        })?;
                    for axis in controls {
                        if axis.iter().any(|v| !v.is_finite() || v.abs() > 1_000_000.)
                            || axis[0] < key.frame
                            || axis[0] > right.frame
                            || axis[2] < key.frame
                            || axis[2] > right.frame
                        {
                            return Err(invalid(
                                "Use finite RGBA Bezier controls within the segment frame bounds.",
                            ));
                        }
                    }
                }
            }
        }
        if frame.project.slots.iter().any(|slot| {
            slot.attachments
                .iter()
                .any(|attachment| attachment.clipping().is_some())
        }) {
            let mut events = vec![0.];
            events.extend(clip.draw_order.iter().map(|key| key.frame));
            for track in &clip.slot_tracks {
                if let SlotTimeline::Attachment { keys, .. } = track {
                    events.extend(keys.iter().map(|key| key.frame));
                }
            }
            events.sort_by(f32::total_cmp);
            events.dedup_by(|a, b| *a == *b);
            for event in events {
                sample_at_frame(frame, Some(clip), f64::from(event))?;
            }
        }
    }
    Ok(())
}
pub(crate) fn set_keys(
    frame: &mut SceneFrame,
    next: &mut u64,
    a: usize,
    inputs: Vec<SlotKeyInput>,
) -> Result<(), AppError> {
    if inputs.is_empty() || inputs.len() > 4096 {
        return Err(invalid("Choose a nonempty bounded slot key batch."));
    }
    let old = frame.project.animations[a].slot_tracks.clone();
    let old_ids = frame.animation_slot_key_ids[a].clone();
    let mut seen = HashSet::new();
    let mut explicit = HashSet::new();
    for input in inputs {
        let (s, position) = input.context();
        let s = frame.slot_index(s)?;
        let position = animation::checked_frame(position)?;
        let rgba = input.rgba();
        let existing = old.iter().position(|t| slot(t) == s && is_rgba(t) == rgba);
        let target = if let Some(id) = input.key_id() {
            let t = existing.ok_or_else(|| {
                invalid("The selected slot key no longer belongs to this slot/channel.")
            })?;
            let k = old_ids[t]
                .iter()
                .position(|n| *n == id)
                .ok_or_else(|| invalid("The selected slot key no longer exists."))?;
            if frames(&old[t])[k] != position {
                return Err(invalid("The selected slot key moved to another frame."));
            }
            Some(id)
        } else {
            existing.and_then(|t| {
                let f = frames(&old[t]);
                let end = f.partition_point(|n| *n <= position);
                (end > 0 && f[end - 1] == position).then(|| old_ids[t][end - 1])
            })
        };
        if !seen.insert((s, rgba, position.to_bits(), target)) {
            return Err(invalid("A slot key batch repeats the same key."));
        }
        if let Some(id) = target {
            explicit.insert(id);
        }
        // Validate payload before creating a new track or consuming an identity.
        let checked = match input {
            SlotKeyInput::Attachment { attachment, .. } => {
                let value = attachment
                    .map(|id| frame.attachment_address(id))
                    .transpose()?;
                if value.is_some_and(|v| v.slot != s) {
                    return Err(invalid(
                        "An attachment key must target an attachment owned by its slot.",
                    ));
                }
                SlotTimeline::Attachment {
                    slot: s,
                    keys: vec![SlotAttachmentKey {
                        frame: position,
                        attachment: value.map(|v| v.attachment),
                    }],
                }
            }
            SlotKeyInput::Rgba {
                values,
                curve: kind,
                controls,
                dark_values,
                dark_controls,
                ..
            } => {
                if values
                    .iter()
                    .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
                {
                    return Err(invalid(
                        "RGBA key values must be finite between zero and one.",
                    ));
                }
                let setup = frame.project.slot_dark_color(s);
                if dark_controls.is_some() {
                    return Err(invalid(
                        "Dark Bezier controls are outside the current two-color profile.",
                    ));
                }
                if setup.enabled && !matches!(kind, CurveInput::Linear) {
                    return Err(invalid(
                        "Enabled two-color tracks currently support linear keys only.",
                    ));
                }
                let previous = existing.and_then(|t| match &old[t] {
                    SlotTimeline::Rgba { keys, .. } => Some(keys.as_slice()),
                    _ => None,
                });
                let addressed = target
                    .and_then(|id| {
                        existing
                            .and_then(|t| old_ids[t].iter().position(|candidate| *candidate == id))
                    })
                    .and_then(|k| previous.and_then(|keys| keys.get(k)));
                let dark_values = if let Some(values) = dark_values {
                    values
                } else if let Some(key) = addressed {
                    key.dark_values
                } else if setup.enabled {
                    previous
                        .map(|keys| dark_value(keys, f64::from(position)))
                        .transpose()?
                        .flatten()
                        .unwrap_or_else(|| {
                            std::array::from_fn(|axis| f64::from(setup.color[axis]) / 255.)
                        })
                        .map(|value| value as f32)
                } else {
                    [0.; 3]
                };
                if dark_values
                    .iter()
                    .any(|value| !value.is_finite() || !(0.0..=1.0).contains(value))
                    || !setup.enabled && dark_values.iter().any(|value| value.to_bits() != 0)
                {
                    return Err(invalid("Dark RGB keys require finite 0–1 values; disabled slots require exact zero dark lanes."));
                }
                SlotTimeline::Rgba {
                    slot: s,
                    keys: vec![SlotRgbaKey {
                        frame: position,
                        values,
                        dark_values,
                        curve: curve(kind, controls)?,
                    }],
                }
            }
        };
        let live = frame.project.animations[a]
            .slot_tracks
            .iter()
            .position(|t| slot(t) == s && is_rgba(t) == rgba);
        let t = if let Some(t) = live {
            t
        } else {
            let tracks = &mut frame.project.animations[a].slot_tracks;
            let t = tracks
                .iter()
                .rposition(|t| slot(t) == s)
                .map_or(tracks.len(), |n| n + 1);
            let empty = match &checked {
                SlotTimeline::Attachment { .. } => SlotTimeline::Attachment {
                    slot: s,
                    keys: vec![],
                },
                SlotTimeline::Rgba { .. } => SlotTimeline::Rgba {
                    slot: s,
                    keys: vec![],
                },
            };
            tracks.insert(t, empty);
            frame.animation_slot_key_ids[a].insert(t, vec![]);
            t
        };
        let ids = &mut frame.animation_slot_key_ids[a][t];
        let position_index = if let Some(id) = target {
            ids.iter().position(|n| *n == id).unwrap()
        } else {
            frames(&frame.project.animations[a].slot_tracks[t]).partition_point(|f| *f <= position)
        };
        match (&mut frame.project.animations[a].slot_tracks[t], checked) {
            (
                SlotTimeline::Attachment { keys, .. },
                SlotTimeline::Attachment {
                    keys: mut added, ..
                },
            ) => {
                let mut key = added.remove(0);
                if target.is_some() {
                    key.frame = keys[position_index].frame;
                    keys[position_index] = key;
                } else {
                    keys.insert(position_index, key);
                }
            }
            (
                SlotTimeline::Rgba { keys, .. },
                SlotTimeline::Rgba {
                    keys: mut added, ..
                },
            ) => {
                let mut key = added.remove(0);
                if target.is_some() {
                    let stored = &keys[position_index];
                    key.frame = stored.frame;
                    for (value, old) in key.values.iter_mut().zip(stored.values) {
                        if *value == old {
                            *value = old;
                        }
                    }
                    for (value, old) in key.dark_values.iter_mut().zip(stored.dark_values) {
                        if *value == old {
                            *value = old;
                        }
                    }
                    keys[position_index] = key;
                } else {
                    keys.insert(position_index, key);
                }
            }
            _ => unreachable!(),
        }
        if target.is_none() {
            ids.insert(position_index, animation::allocate(next)?);
        }
    }
    for (t, previous) in old.iter().enumerate() {
        let SlotTimeline::Rgba { slot: s, keys } = previous else {
            continue;
        };
        if let Some(n) = frame.project.animations[a]
            .slot_tracks
            .iter()
            .position(|tr| slot(tr) == *s && is_rgba(tr))
        {
            let SlotTimeline::Rgba { keys: after, .. } =
                &frame.project.animations[a].slot_tracks[n]
            else {
                unreachable!()
            };
            check_neighbors(
                keys,
                &old_ids[t],
                after,
                &frame.animation_slot_key_ids[a][n],
                &explicit,
            )?;
        }
    }
    Ok(())
}
pub(crate) fn delete_keys(
    frame: &mut SceneFrame,
    a: usize,
    wanted: &HashSet<u64>,
) -> Result<(), AppError> {
    for t in (0..frame.project.animations[a].slot_tracks.len()).rev() {
        let ids = &mut frame.animation_slot_key_ids[a][t];
        let old_ids = ids.clone();
        match &mut frame.project.animations[a].slot_tracks[t] {
            SlotTimeline::Attachment { keys, .. } => {
                for k in (0..ids.len()).rev() {
                    if wanted.contains(&ids[k]) {
                        keys.remove(k);
                        ids.remove(k);
                    }
                }
            }
            SlotTimeline::Rgba { keys, .. } => {
                let old = keys.clone();
                for k in (0..ids.len()).rev() {
                    if wanted.contains(&ids[k]) {
                        keys.remove(k);
                        ids.remove(k);
                    }
                }
                check_neighbors(&old, &old_ids, keys, ids, &HashSet::new())?;
            }
        }
        if ids.is_empty() {
            frame.project.animations[a].slot_tracks.remove(t);
            frame.animation_slot_key_ids[a].remove(t);
        }
    }
    Ok(())
}
fn move_indices(
    frames: &[f32],
    ids: &[u64],
    wanted: &HashSet<u64>,
    delta: f32,
) -> Result<Vec<(usize, f32, u64)>, AppError> {
    let mut moved = frames
        .iter()
        .zip(ids)
        .enumerate()
        .map(|(i, (f, id))| {
            Ok((
                i,
                if wanted.contains(id) {
                    animation::checked_frame(*f + delta)?
                } else {
                    *f
                },
                *id,
            ))
        })
        .collect::<Result<Vec<_>, AppError>>()?;
    moved.sort_by(|a, b| a.1.total_cmp(&b.1));
    if moved
        .windows(2)
        .any(|p| p[0].1 == p[1].1 && (wanted.contains(&p[0].2) || wanted.contains(&p[1].2)))
    {
        return Err(invalid(
            "Moving keys would collide with an existing slot key.",
        ));
    }
    Ok(moved)
}
pub(crate) fn move_keys(
    frame: &mut SceneFrame,
    a: usize,
    wanted: &HashSet<u64>,
    delta: f32,
) -> Result<(), AppError> {
    for t in 0..frame.project.animations[a].slot_tracks.len() {
        let track = &mut frame.project.animations[a].slot_tracks[t];
        let ids = &mut frame.animation_slot_key_ids[a][t];
        let moved = move_indices(&frames(track), ids, wanted, delta)?;
        match track {
            SlotTimeline::Attachment { keys, .. } => {
                let old = keys.clone();
                *keys = moved
                    .iter()
                    .map(|(i, f, _)| SlotAttachmentKey {
                        frame: *f,
                        ..old[*i].clone()
                    })
                    .collect();
            }
            SlotTimeline::Rgba { keys, .. } => {
                let old = keys.clone();
                let mut after = moved
                    .iter()
                    .map(|(i, f, _)| SlotRgbaKey {
                        frame: *f,
                        ..old[*i].clone()
                    })
                    .collect::<Vec<_>>();
                for (i, key) in old.iter().enumerate() {
                    let SlotRgbaCurve::Bezier {
                        mut controls,
                        dark_controls,
                    } = key.curve
                    else {
                        continue;
                    };
                    let at = moved.iter().position(|(_, _, id)| *id == ids[i]).unwrap();
                    if moved.get(at + 1).map(|(_, _, id)| *id) != ids.get(i + 1).copied() {
                        return Err(invalid(
                            "Move complete RGBA Bezier segments without changing their neighbors.",
                        ));
                    }
                    let left = moved[at].1 - key.frame;
                    let right = moved[at + 1].1 - old[i + 1].frame;
                    for c in &mut controls {
                        c[0] += left;
                        c[2] += right;
                    }
                    after[at].curve = SlotRgbaCurve::Bezier {
                        controls,
                        dark_controls,
                    };
                }
                *keys = after;
            }
        }
        *ids = moved.iter().map(|(_, _, id)| *id).collect();
    }
    Ok(())
}
/// Structural edits preserve stable target identities while rebuilding wire indices.
pub(crate) fn remap_references(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    for clip in &mut next.project.animations {
        for track in &mut clip.slot_tracks {
            let old_slot = slot(track);
            let id = *before
                .slot_ids
                .get(old_slot)
                .ok_or_else(|| invalid("Animation slot reference is missing."))?;
            let new_slot = next.slot_ids.iter().position(|v| *v == id).ok_or_else(|| {
                invalid("Delete this slot's animation tracks before deleting the slot.")
            })?;
            match track {
                SlotTimeline::Attachment { slot, keys } => {
                    for key in keys {
                        if let Some(old) = key.attachment {
                            let attachment = before.attachment_ids[old_slot][old];
                            key.attachment=Some(next.attachment_ids[new_slot].iter().position(|id|*id==attachment).ok_or_else(||invalid("Clear the attachment's animation keys before deleting it or moving it to another slot."))?);
                        }
                    }
                    *slot = new_slot;
                }
                SlotTimeline::Rgba { slot, .. } => *slot = new_slot,
            }
        }
    }
    Ok(())
}
fn cubic(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
    let u = 1. - t;
    u * u * u * a + 3. * u * u * t * b + 3. * u * t * t * c + t * t * t * d
}
fn rgba_value(keys: &[SlotRgbaKey], frame: f64) -> Option<[f64; 4]> {
    let first = keys.first()?;
    if frame < f64::from(first.frame) {
        return None;
    }
    let end = keys.partition_point(|k| f64::from(k.frame) <= frame);
    let left = &keys[end - 1];
    if frame == f64::from(left.frame) {
        return Some(left.values.map(f64::from));
    }
    let Some(right) = keys.get(end) else {
        return Some(left.values.map(f64::from));
    };
    Some(std::array::from_fn(|axis| match left.curve {
        SlotRgbaCurve::Stepped => f64::from(left.values[axis]),
        SlotRgbaCurve::Linear => {
            let t =
                (frame - f64::from(left.frame)) / (f64::from(right.frame) - f64::from(left.frame));
            f64::from(left.values[axis])
                + (f64::from(right.values[axis]) - f64::from(left.values[axis])) * t
        }
        SlotRgbaCurve::Bezier { controls, .. } => {
            let [cx1, cy1, cx2, cy2] = controls[axis].map(f64::from);
            let (mut low, mut high) = (0., 1.);
            for _ in 0..48 {
                let t = (low + high) * 0.5;
                if cubic(f64::from(left.frame), cx1, cx2, f64::from(right.frame), t) < frame {
                    low = t
                } else {
                    high = t
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
    }))
}
fn dark_value(keys: &[SlotRgbaKey], position: f64) -> Result<Option<[f64; 3]>, AppError> {
    let Some(first) = keys.first() else {
        return Ok(None);
    };
    if position < f64::from(first.frame) {
        return Ok(None);
    }
    let end = keys.partition_point(|key| f64::from(key.frame) <= position);
    let left = &keys[end - 1];
    if !matches!(left.curve, SlotRgbaCurve::Linear) {
        return Err(invalid(
            "Enabled two-color sampling currently supports linear keys only.",
        ));
    }
    if position == f64::from(left.frame) {
        return Ok(Some(left.dark_values.map(f64::from)));
    }
    let value = if let Some(right) = keys.get(end) {
        let mix =
            (position - f64::from(left.frame)) / (f64::from(right.frame) - f64::from(left.frame));
        std::array::from_fn(|axis| {
            f64::from(left.dark_values[axis])
                + (f64::from(right.dark_values[axis]) - f64::from(left.dark_values[axis])) * mix
        })
    } else {
        left.dark_values.map(f64::from)
    };
    Ok(Some(value))
}
pub(crate) fn sample(
    frame: &SceneFrame,
    clip: Option<&Animation>,
    time: f64,
) -> Result<Vec<SlotPoseView>, AppError> {
    if !time.is_finite() || time < 0. {
        return Err(invalid("Use a finite nonnegative animation time."));
    }
    sample_at_frame(frame, clip, time * f64::from(frame.project.fps))
}
fn sample_at_frame(
    frame: &SceneFrame,
    clip: Option<&Animation>,
    position: f64,
) -> Result<Vec<SlotPoseView>, AppError> {
    let mut result = frame
        .project
        .slots
        .iter()
        .enumerate()
        .map(|(s, slot)| SlotPoseView {
            slot: frame.slot_ids[s],
            attachment: slot.active_attachment.map(|a| frame.attachment_ids[s][a]),
            color: slot.color.map(|v| f64::from(v) / 255.),
            dark: if frame.project.slot_dark_color(s).enabled {
                std::array::from_fn(|axis| {
                    f64::from(frame.project.slot_dark_color(s).color[axis]) / 255.
                })
            } else {
                [0.; 3]
            },
        })
        .collect::<Vec<_>>();
    if let Some(clip) = clip {
        for track in &clip.slot_tracks {
            match track {
                SlotTimeline::Attachment { slot, keys } => {
                    let end = keys.partition_point(|key| f64::from(key.frame) <= position);
                    if end > 0 {
                        result[*slot].attachment = keys[end - 1]
                            .attachment
                            .map(|a| frame.attachment_ids[*slot][a]);
                    }
                }
                SlotTimeline::Rgba { slot, keys } => {
                    if let Some(color) = rgba_value(keys, position) {
                        result[*slot].color = color;
                    }
                    if frame.project.slot_dark_color(*slot).enabled {
                        if let Some(dark) = dark_value(keys, position)? {
                            result[*slot].dark = dark;
                        }
                    }
                }
            }
        }
    }
    let active = result
        .iter()
        .enumerate()
        .map(|(s, slot)| {
            slot.attachment
                .map(|id| {
                    frame.attachment_ids[s]
                        .iter()
                        .position(|candidate| *candidate == id)
                        .ok_or_else(|| invalid("The sampled attachment is missing."))
                })
                .transpose()
        })
        .collect::<Result<Vec<_>, _>>()?;
    let order = crate::animation_order::sample_indices(&frame.project, clip, position)?;
    crate::scene_edit::check_clipping_activation_in_order(&frame.project, &active, &order)?;
    Ok(result)
}
