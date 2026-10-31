//! Constraint timelines share native key identity/history; samples never author Setup.
use crate::{
    animation::{self, CurveInput},
    project::AppError,
    scene_edit::SceneFrame,
};
use fbones_format::minimal::scene::{
    Animation, Constraint, ConstraintTimeline, IkKeyCurve, IkKeyframe, PhysicsCurve,
    PhysicsKeyframe, PhysicsProperty, PhysicsResetKeyframe, TransformMixCurve,
    TransformMixKeyframe,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
#[cfg(test)]
#[path = "animation_constraints_events_tests.rs"]
mod tests;
fn invalid(message: &str) -> AppError {
    AppError::new("InvalidAnimation", message)
}
#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PropertyInput {
    Inertia,
    Strength,
    Damping,
    Mass,
    Wind,
    Gravity,
    Mix,
}
impl PropertyInput {
    fn model(self) -> PhysicsProperty {
        match self {
            Self::Inertia => PhysicsProperty::Inertia,
            Self::Strength => PhysicsProperty::Strength,
            Self::Damping => PhysicsProperty::Damping,
            Self::Mass => PhysicsProperty::Mass,
            Self::Wind => PhysicsProperty::Wind,
            Self::Gravity => PhysicsProperty::Gravity,
            Self::Mix => PhysicsProperty::Mix,
        }
    }
}
fn property(p: PhysicsProperty) -> PropertyInput {
    match p {
        PhysicsProperty::Inertia => PropertyInput::Inertia,
        PhysicsProperty::Strength => PropertyInput::Strength,
        PhysicsProperty::Damping => PropertyInput::Damping,
        PhysicsProperty::Mass => PropertyInput::Mass,
        PhysicsProperty::Wind => PropertyInput::Wind,
        PhysicsProperty::Gravity => PropertyInput::Gravity,
        PhysicsProperty::Mix => PropertyInput::Mix,
    }
}
#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "channel", rename_all = "camelCase", deny_unknown_fields)]
pub enum ConstraintKeyInput {
    Ik {
        constraint: u64,
        frame: f32,
        mix: f32,
        softness: f32,
        stretch: bool,
        compress: bool,
        #[serde(rename = "bendPositive")]
        bend_positive: bool,
        curve: CurveInput,
        #[serde(default)]
        controls: Option<[[f32; 4]; 2]>,
        #[serde(default, rename = "valueBits")]
        value_bits: Option<[u32; 2]>,
        #[serde(default, rename = "controlsBits")]
        controls_bits: Option<[[u32; 4]; 2]>,
        #[serde(default, rename = "keyId")]
        key_id: Option<u64>,
    },
    TransformMix {
        constraint: u64,
        frame: f32,
        values: [f32; 6],
        curve: CurveInput,
        #[serde(default)]
        controls: Option<[[f32; 4]; 6]>,
        #[serde(default, rename = "valueBits")]
        value_bits: Option<[u32; 6]>,
        #[serde(default, rename = "controlsBits")]
        controls_bits: Option<[[u32; 4]; 6]>,
        #[serde(default, rename = "keyId")]
        key_id: Option<u64>,
    },
    Physics {
        constraint: u64,
        property: PropertyInput,
        frame: f32,
        value: f32,
        curve: CurveInput,
        #[serde(default)]
        controls: Option<[f32; 4]>,
        #[serde(default, rename = "valueBits")]
        value_bits: Option<[u32; 1]>,
        #[serde(default, rename = "controlsBits")]
        controls_bits: Option<[u32; 4]>,
        #[serde(default, rename = "keyId")]
        key_id: Option<u64>,
    },
    PhysicsReset {
        constraint: u64,
        frame: f32,
        #[serde(default, rename = "keyId")]
        key_id: Option<u64>,
    },
}

pub(crate) fn restore(values: Vec<f32>, bits: Option<Vec<u32>>) -> Result<Vec<f32>, AppError> {
    if let Some(bits) = bits {
        if bits.len() != values.len()
            || bits
                .iter()
                .zip(&values)
                .any(|(b, v)| !f32::from_bits(*b).is_finite() || f32::from_bits(*b) != *v)
        {
            return Err(invalid(
                "Numeric bits must match the complete finite value vector.",
            ));
        }
        Ok(bits.into_iter().map(f32::from_bits).collect())
    } else {
        Ok(values)
    }
}
fn restore_controls(
    values: Option<Vec<[f32; 4]>>,
    bits: Option<Vec<[u32; 4]>>,
) -> Result<Option<Vec<[f32; 4]>>, AppError> {
    match (values, bits) {
        (Some(values), Some(bits)) => {
            if values.len() != bits.len() {
                return Err(invalid("Control bits must match the supplied controls."));
            }
            values
                .into_iter()
                .zip(bits)
                .map(|(v, b)| restore(v.to_vec(), Some(b.to_vec())).map(|v| v.try_into().unwrap()))
                .collect::<Result<Vec<_>, _>>()
                .map(Some)
        }
        (None, Some(_)) => Err(invalid("Control bits require numeric controls.")),
        (values, None) => Ok(values),
    }
}

#[derive(Clone)]
struct Key {
    frame: f32,
    values: Vec<f32>,
    flags: [bool; 3],
    curve: CurveInput,
    controls: Option<Vec<[f32; 4]>>,
}
impl ConstraintKeyInput {
    pub(crate) fn context(&self) -> (u64, f32) {
        match self {
            Self::Ik {
                constraint, frame, ..
            }
            | Self::TransformMix {
                constraint, frame, ..
            }
            | Self::Physics {
                constraint, frame, ..
            }
            | Self::PhysicsReset {
                constraint, frame, ..
            } => (*constraint, *frame),
        }
    }
    fn unpack(self) -> Result<(u64, u32, Option<u64>, Key), AppError> {
        Ok(match self {
            Self::Ik {
                constraint,
                frame,
                mix,
                softness,
                stretch,
                compress,
                bend_positive,
                curve,
                controls,
                value_bits,
                controls_bits,
                key_id,
            } => (
                constraint,
                7,
                key_id,
                Key {
                    frame,
                    values: restore(vec![mix, softness], value_bits.map(Vec::from))?,
                    flags: [stretch, compress, bend_positive],
                    curve,
                    controls: restore_controls(
                        controls.map(Vec::from),
                        controls_bits.map(Vec::from),
                    )?,
                },
            ),
            Self::TransformMix {
                constraint,
                frame,
                values,
                curve,
                controls,
                value_bits,
                controls_bits,
                key_id,
            } => (
                constraint,
                8,
                key_id,
                Key {
                    frame,
                    values: restore(values.to_vec(), value_bits.map(Vec::from))?,
                    flags: [false; 3],
                    curve,
                    controls: restore_controls(
                        controls.map(Vec::from),
                        controls_bits.map(Vec::from),
                    )?,
                },
            ),
            Self::Physics {
                constraint,
                property,
                frame,
                value,
                curve,
                controls,
                value_bits,
                controls_bits,
                key_id,
            } => (
                constraint,
                23 + property.model().index() as u32,
                key_id,
                Key {
                    frame,
                    values: restore(vec![value], value_bits.map(Vec::from))?,
                    flags: [false; 3],
                    curve,
                    controls: restore_controls(
                        controls.map(|v| vec![v]),
                        controls_bits.map(|v| vec![v]),
                    )?,
                },
            ),
            Self::PhysicsReset {
                constraint,
                frame,
                key_id,
            } => (
                constraint,
                30,
                key_id,
                Key {
                    frame,
                    values: vec![],
                    flags: [false; 3],
                    curve: CurveInput::Linear,
                    controls: None,
                },
            ),
        })
    }
}
fn key_count(track: &ConstraintTimeline) -> usize {
    match track {
        ConstraintTimeline::Ik { keys, .. } => keys.len(),
        ConstraintTimeline::TransformMix { keys, .. } => keys.len(),
        ConstraintTimeline::Physics { keys, .. } => keys.len(),
        ConstraintTimeline::PhysicsReset { keys, .. } => keys.len(),
    }
}
fn key_frame(track: &ConstraintTimeline, i: usize) -> f32 {
    match track {
        ConstraintTimeline::Ik { keys, .. } => keys[i].frame,
        ConstraintTimeline::TransformMix { keys, .. } => keys[i].frame,
        ConstraintTimeline::Physics { keys, .. } => keys[i].frame,
        ConstraintTimeline::PhysicsReset { keys, .. } => keys[i].frame,
    }
}
fn key_at(track: &ConstraintTimeline, i: usize) -> Key {
    match track {
        ConstraintTimeline::Ik { keys, .. } => {
            let k = &keys[i];
            let (curve, controls) = match k.curve {
                IkKeyCurve::Linear => (CurveInput::Linear, None),
                IkKeyCurve::Stepped => (CurveInput::Stepped, None),
                IkKeyCurve::Bezier { controls } => (CurveInput::Bezier, Some(controls.to_vec())),
            };
            Key {
                frame: k.frame,
                values: vec![k.mix, k.softness],
                flags: [k.stretch, k.compress, k.bend_positive],
                curve,
                controls,
            }
        }
        ConstraintTimeline::TransformMix { keys, .. } => {
            let k = &keys[i];
            let (curve, controls) = match k.curve {
                TransformMixCurve::Linear => (CurveInput::Linear, None),
                TransformMixCurve::Stepped => (CurveInput::Stepped, None),
                TransformMixCurve::Bezier { controls } => {
                    (CurveInput::Bezier, Some(controls.to_vec()))
                }
            };
            Key {
                frame: k.frame,
                values: k.values.to_vec(),
                flags: [false; 3],
                curve,
                controls,
            }
        }
        ConstraintTimeline::Physics { keys, .. } => {
            let k = &keys[i];
            let (curve, controls) = match k.curve {
                PhysicsCurve::Linear => (CurveInput::Linear, None),
                PhysicsCurve::Stepped => (CurveInput::Stepped, None),
                PhysicsCurve::Bezier { controls } => (CurveInput::Bezier, Some(vec![controls])),
            };
            Key {
                frame: k.frame,
                values: vec![k.value],
                flags: [false; 3],
                curve,
                controls,
            }
        }
        ConstraintTimeline::PhysicsReset { keys, .. } => Key {
            frame: keys[i].frame,
            values: vec![],
            flags: [false; 3],
            curve: CurveInput::Linear,
            controls: None,
        },
    }
}
fn keys(track: &ConstraintTimeline) -> Vec<Key> {
    (0..key_count(track)).map(|i| key_at(track, i)).collect()
}
// Read only the bracketing pair; replay never clones an entire key track per tick.
fn sampling_keys(track: &ConstraintTimeline, position: f64) -> Vec<Key> {
    let (mut low, mut high) = (0, key_count(track));
    while low < high {
        let mid = (low + high) / 2;
        if f64::from(key_frame(track, mid)) <= position {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    if low == 0 {
        return vec![];
    }
    let mut out = vec![key_at(track, low - 1)];
    if low < key_count(track) {
        out.push(key_at(track, low));
    }
    out
}

fn pack(constraint: usize, kind: u32, values: Vec<Key>) -> ConstraintTimeline {
    match kind {
        7 => ConstraintTimeline::Ik {
            constraint,
            keys: values
                .into_iter()
                .map(|k| IkKeyframe {
                    frame: k.frame,
                    mix: k.values[0],
                    softness: k.values[1],
                    stretch: k.flags[0],
                    compress: k.flags[1],
                    bend_positive: k.flags[2],
                    curve: match k.curve {
                        CurveInput::Linear => IkKeyCurve::Linear,
                        CurveInput::Stepped => IkKeyCurve::Stepped,
                        CurveInput::Bezier => IkKeyCurve::Bezier {
                            controls: k.controls.unwrap().try_into().unwrap(),
                        },
                    },
                })
                .collect(),
        },
        8 => ConstraintTimeline::TransformMix {
            constraint,
            keys: values
                .into_iter()
                .map(|k| TransformMixKeyframe {
                    frame: k.frame,
                    values: k.values.try_into().unwrap(),
                    curve: match k.curve {
                        CurveInput::Linear => TransformMixCurve::Linear,
                        CurveInput::Stepped => TransformMixCurve::Stepped,
                        CurveInput::Bezier => TransformMixCurve::Bezier {
                            controls: k.controls.unwrap().try_into().unwrap(),
                        },
                    },
                })
                .collect(),
        },
        30 => ConstraintTimeline::PhysicsReset {
            constraint,
            keys: values
                .into_iter()
                .map(|k| PhysicsResetKeyframe { frame: k.frame })
                .collect(),
        },
        _ => ConstraintTimeline::Physics {
            constraint,
            property: PhysicsProperty::ALL[(kind - 23) as usize],
            keys: values
                .into_iter()
                .map(|k| PhysicsKeyframe {
                    frame: k.frame,
                    value: k.values[0],
                    curve: match k.curve {
                        CurveInput::Linear => PhysicsCurve::Linear,
                        CurveInput::Stepped => PhysicsCurve::Stepped,
                        CurveInput::Bezier => PhysicsCurve::Bezier {
                            controls: k.controls.unwrap()[0],
                        },
                    },
                })
                .collect(),
        },
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConstraintKeyView {
    pub id: u64,
    pub frame: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mix: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub softness: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stretch: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compress: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bend_positive: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub values: Option<Vec<f32>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub curve: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub controls: Option<ControlView>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(untagged)]
pub enum ControlView {
    Axes(Vec<[f32; 4]>),
    Scalar([f32; 4]),
}
#[derive(Clone, Debug, Serialize)]
pub struct ConstraintTrackView {
    pub constraint: u64,
    pub channel: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub property: Option<PropertyInput>,
    pub keys: Vec<ConstraintKeyView>,
}
fn curve_name(c: CurveInput) -> &'static str {
    match c {
        CurveInput::Linear => "linear",
        CurveInput::Stepped => "stepped",
        CurveInput::Bezier => "bezier",
    }
}
pub(crate) fn views(frame: &SceneFrame, a: usize) -> Vec<ConstraintTrackView> {
    frame.project.animations[a]
        .constraint_tracks
        .iter()
        .enumerate()
        .map(|(t, track)| {
            let kind = track.kind();
            ConstraintTrackView {
                constraint: frame.constraint_ids[track.constraint()],
                channel: match kind {
                    7 => "ik",
                    8 => "transformMix",
                    30 => "physicsReset",
                    _ => "physics",
                },
                property: match track {
                    ConstraintTimeline::Physics { property: p, .. } => Some(property(*p)),
                    _ => None,
                },
                keys: keys(track)
                    .into_iter()
                    .enumerate()
                    .map(|(i, k)| ConstraintKeyView {
                        id: frame.animation_constraint_key_ids[a][t][i],
                        frame: k.frame,
                        mix: (kind == 7).then(|| k.values[0]),
                        softness: (kind == 7).then(|| k.values[1]),
                        stretch: (kind == 7).then_some(k.flags[0]),
                        compress: (kind == 7).then_some(k.flags[1]),
                        bend_positive: (kind == 7).then_some(k.flags[2]),
                        values: (kind == 8).then_some(k.values.clone()),
                        value: (23..30).contains(&kind).then(|| k.values[0]),
                        curve: (kind != 30).then(|| curve_name(k.curve)),
                        controls: k.controls.map(|v| {
                            if (23..30).contains(&kind) {
                                ControlView::Scalar(v[0])
                            } else {
                                ControlView::Axes(v)
                            }
                        }),
                    })
                    .collect(),
            }
        })
        .collect()
}
pub(crate) fn allocate_ids(clip: &Animation, next: &mut u64) -> Result<Vec<Vec<u64>>, AppError> {
    clip.constraint_tracks
        .iter()
        .map(|t| keys(t).iter().map(|_| animation::allocate(next)).collect())
        .collect()
}
pub(crate) fn duration(clip: &Animation) -> f32 {
    clip.constraint_tracks
        .iter()
        .flat_map(keys)
        .map(|k| k.frame)
        .fold(0., f32::max)
}
pub(crate) fn canonicalize(frame: &mut SceneFrame) -> Result<(), AppError> {
    for a in 0..frame.project.animations.len() {
        let order = frame.project.animations[a].constraint_track_permutation(&frame.project)?;
        let old = frame.project.animations[a].constraint_tracks.clone();
        let ids = frame.animation_constraint_key_ids[a].clone();
        frame.project.animations[a].constraint_tracks =
            order.iter().map(|i| old[*i].clone()).collect();
        frame.animation_constraint_key_ids[a] = order.iter().map(|i| ids[*i].clone()).collect();
    }
    Ok(())
}
fn validate_keys(values: &[Key], kind: u32) -> Result<(), AppError> {
    for (i, k) in values.iter().enumerate() {
        animation::checked_frame(k.frame)?;
        if k.values
            .iter()
            .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
            || kind == 7 && (!(0. ..=1.).contains(&k.values[0]) || k.values[1] < 0.)
            || (kind == 26 && k.values[0] <= 0.)
            || (kind == 25 && k.values[0] < 0.)
        {
            return Err(invalid("Use finite supported constraint timeline values."));
        }
        match (k.curve, &k.controls) {
            (CurveInput::Linear | CurveInput::Stepped, None) => {}
            (CurveInput::Bezier, Some(axes)) => {
                let right = values
                    .get(i + 1)
                    .filter(|r| r.frame > k.frame)
                    .ok_or_else(|| {
                        invalid("A constraint Bezier key needs a following key at a later frame.")
                    })?;
                let count = match kind {
                    7 => 2,
                    8 => 6,
                    23..=29 => 1,
                    _ => 0,
                };
                if axes.len() != count
                    || axes.iter().any(|v| {
                        v.iter().any(|n| !n.is_finite() || n.abs() > 1_000_000.)
                            || v[0] < k.frame
                            || v[0] > right.frame
                            || v[2] < k.frame
                            || v[2] > right.frame
                    })
                {
                    return Err(invalid(
                        "Use complete finite constraint Bezier controls within the segment.",
                    ));
                }
            }
            _ => return Err(invalid("Only Bezier constraint keys require controls.")),
        }
    }
    Ok(())
}
fn neighbors(
    old: &[Key],
    old_ids: &[u64],
    new: &[Key],
    ids: &[u64],
    explicit: &HashSet<u64>,
) -> Result<(), AppError> {
    for (i, k) in old.iter().enumerate() {
        if !matches!(k.curve, CurveInput::Bezier) {
            continue;
        }
        if let Some(at) = ids.iter().position(|id| *id == old_ids[i]) {
            if matches!(new[at].curve, CurveInput::Bezier)
                && ids.get(at + 1) != old_ids.get(i + 1)
                && !explicit.contains(&old_ids[i])
            {
                return Err(invalid(
                    "Edit the complete constraint Bezier interval when changing its neighbors.",
                ));
            }
        }
    }
    Ok(())
}
pub(crate) fn set_keys(
    frame: &mut SceneFrame,
    next: &mut u64,
    a: usize,
    inputs: Vec<ConstraintKeyInput>,
) -> Result<(), AppError> {
    if inputs.is_empty() || inputs.len() > 4096 {
        return Err(invalid("Choose a bounded nonempty constraint key batch."));
    }
    let old = frame.project.animations[a].constraint_tracks.clone();
    let old_ids = frame.animation_constraint_key_ids[a].clone();
    let mut seen = HashSet::new();
    let mut explicit = HashSet::new();
    for input in inputs {
        let (id, kind, key_id, mut key) = input.unpack()?;
        let c = frame
            .constraint_ids
            .iter()
            .position(|v| *v == id)
            .ok_or_else(|| invalid("Choose an existing constraint."))?;
        pack(c, kind, vec![]).owner_bone(&frame.project)?;
        key.frame = animation::checked_frame(key.frame)?;
        let old_t = old
            .iter()
            .position(|t| t.constraint() == c && t.kind() == kind);
        let chosen = if let Some(id) = key_id {
            let t =
                old_t.ok_or_else(|| invalid("The selected constraint track no longer exists."))?;
            let k = old_ids[t]
                .iter()
                .position(|v| *v == id)
                .ok_or_else(|| invalid("The selected constraint key no longer exists."))?;
            if keys(&old[t])[k].frame != key.frame {
                return Err(invalid("The selected constraint key moved."));
            }
            Some(id)
        } else {
            old_t.and_then(|t| {
                let keys = keys(&old[t]);
                let end = keys.partition_point(|k| k.frame <= key.frame);
                (end > 0 && keys[end - 1].frame == key.frame).then(|| old_ids[t][end - 1])
            })
        };
        if !seen.insert((c, kind, key.frame.to_bits(), chosen)) {
            return Err(invalid("A constraint batch repeats the same key."));
        }
        if let Some(id) = chosen {
            explicit.insert(id);
        }
        let t = frame.project.animations[a]
            .constraint_tracks
            .iter()
            .position(|t| t.constraint() == c && t.kind() == kind)
            .unwrap_or_else(|| {
                frame.project.animations[a]
                    .constraint_tracks
                    .push(pack(c, kind, vec![]));
                frame.animation_constraint_key_ids[a].push(vec![]);
                frame.project.animations[a].constraint_tracks.len() - 1
            });
        let mut list = keys(&frame.project.animations[a].constraint_tracks[t]);
        let ids = &mut frame.animation_constraint_key_ids[a][t];
        if let Some(id) = chosen {
            let at = ids.iter().position(|v| *v == id).unwrap();
            key.frame = list[at].frame;
            list[at] = key;
        } else {
            let at = list.partition_point(|k| k.frame <= key.frame);
            list.insert(at, key);
            ids.insert(at, animation::allocate(next)?);
        }
        frame.project.animations[a].constraint_tracks[t] = pack(c, kind, list);
    }
    for (t, track) in frame.project.animations[a]
        .constraint_tracks
        .iter()
        .enumerate()
    {
        let list = keys(track);
        validate_keys(&list, track.kind())?;
        if let Some(o) = old
            .iter()
            .position(|v| v.constraint() == track.constraint() && v.kind() == track.kind())
        {
            neighbors(
                &keys(&old[o]),
                &old_ids[o],
                &list,
                &frame.animation_constraint_key_ids[a][t],
                &explicit,
            )?;
        }
    }
    Ok(())
}
pub(crate) fn delete_keys(
    frame: &mut SceneFrame,
    a: usize,
    selected: &HashSet<u64>,
) -> Result<(), AppError> {
    let tracks = &mut frame.project.animations[a].constraint_tracks;
    let all_ids = &mut frame.animation_constraint_key_ids[a];
    for t in (0..tracks.len()).rev() {
        let old = keys(&tracks[t]);
        let old_ids = all_ids[t].clone();
        let mut list = vec![];
        let mut ids = vec![];
        for (k, id) in old.iter().zip(&old_ids) {
            if !selected.contains(id) {
                list.push(k.clone());
                ids.push(*id);
            }
        }
        neighbors(&old, &old_ids, &list, &ids, selected)?;
        validate_keys(&list, tracks[t].kind())?;
        if list.is_empty() {
            tracks.remove(t);
            all_ids.remove(t);
        } else {
            tracks[t] = pack(tracks[t].constraint(), tracks[t].kind(), list);
            all_ids[t] = ids;
        }
    }
    Ok(())
}
pub(crate) fn move_keys(
    frame: &mut SceneFrame,
    a: usize,
    selected: &HashSet<u64>,
    delta: f32,
) -> Result<(), AppError> {
    for t in 0..frame.project.animations[a].constraint_tracks.len() {
        let track = &frame.project.animations[a].constraint_tracks[t];
        let mut list = keys(track);
        let old = list.clone();
        let old_ids = frame.animation_constraint_key_ids[a][t].clone();
        for (k, id) in list.iter_mut().zip(&old_ids) {
            if selected.contains(id) {
                k.frame = animation::checked_frame(k.frame + delta)?;
            }
        }
        let mut order = (0..list.len()).collect::<Vec<_>>();
        order.sort_by(|i, j| list[*i].frame.total_cmp(&list[*j].frame));
        let mut sorted = order.iter().map(|i| list[*i].clone()).collect::<Vec<_>>();
        let ids = order.iter().map(|i| old_ids[*i]).collect::<Vec<_>>();
        if sorted.windows(2).enumerate().any(|(i, v)| {
            v[0].frame == v[1].frame && old[order[i]].frame != old[order[i + 1]].frame
        }) {
            return Err(invalid("Moved constraint keys collide."));
        }
        for (i, key) in old.iter().enumerate() {
            if let Some(controls) = &key.controls {
                let at = ids.iter().position(|id| *id == old_ids[i]).unwrap();
                if ids.get(at + 1) != old_ids.get(i + 1) {
                    return Err(invalid(
                        "Move constraint Bezier segments without changing their neighbors.",
                    ));
                }
                let left_delta = sorted[at].frame - key.frame;
                let right_delta = sorted[at + 1].frame - old[i + 1].frame;
                let mut controls = controls.clone();
                for axis in &mut controls {
                    axis[0] += left_delta;
                    axis[2] += right_delta;
                }
                sorted[at].controls = Some(controls);
            }
        }
        validate_keys(&sorted, track.kind())?;
        frame.project.animations[a].constraint_tracks[t] =
            pack(track.constraint(), track.kind(), sorted);
        frame.animation_constraint_key_ids[a][t] = ids;
    }
    Ok(())
}
pub(crate) fn remap(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    for clip in &mut next.project.animations {
        for track in &mut clip.constraint_tracks {
            let id = before.constraint_ids[track.constraint()];
            let c = next
                .constraint_ids
                .iter()
                .position(|v| *v == id)
                .ok_or_else(|| {
                    invalid("Delete this constraint's animation keys before deleting its target.")
                })?;
            *track = pack(c, track.kind(), keys(track));
        }
    }
    Ok(())
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(try_from = "ConstraintPoseInput")]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ConstraintPose {
    Ik {
        constraint: u64,
        mix: f64,
        softness: f64,
        stretch: bool,
        compress: bool,
        bend_positive: bool,
    },
    Transform {
        constraint: u64,
        mixes: [f64; 6],
    },
    Physics {
        constraint: u64,
        inertia: f64,
        strength: f64,
        damping: f64,
        mass: f64,
        wind: f64,
        gravity: f64,
        mix: f64,
    },
}
#[derive(Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum ConstraintPoseInput {
    Ik {
        constraint: u64,
        mix: f64,
        softness: f64,
        stretch: bool,
        compress: bool,
        bend_positive: bool,
        #[serde(default)]
        negative_zero_indices: Vec<usize>,
    },
    Transform {
        constraint: u64,
        mixes: [f64; 6],
        #[serde(default)]
        negative_zero_indices: Vec<usize>,
    },
    Physics {
        constraint: u64,
        inertia: f64,
        strength: f64,
        damping: f64,
        mass: f64,
        wind: f64,
        gravity: f64,
        mix: f64,
        #[serde(default)]
        negative_zero_indices: Vec<usize>,
    },
}
fn restore_zeros(values: &mut [&mut f64], indices: Vec<usize>) -> Result<(), &'static str> {
    let mut seen = HashSet::new();
    for index in indices {
        let value = values
            .get_mut(index)
            .ok_or("Temporary constraint zero indices must address existing numeric fields.")?;
        if **value != 0. || !seen.insert(index) {
            return Err("Temporary constraint zero indices must be distinct numeric-zero fields.");
        }
        **value = -0.;
    }
    Ok(())
}
impl TryFrom<ConstraintPoseInput> for ConstraintPose {
    type Error = &'static str;
    fn try_from(input: ConstraintPoseInput) -> Result<Self, Self::Error> {
        Ok(match input {
            ConstraintPoseInput::Ik {
                constraint,
                mut mix,
                mut softness,
                stretch,
                compress,
                bend_positive,
                negative_zero_indices,
            } => {
                restore_zeros(&mut [&mut mix, &mut softness], negative_zero_indices)?;
                Self::Ik {
                    constraint,
                    mix,
                    softness,
                    stretch,
                    compress,
                    bend_positive,
                }
            }
            ConstraintPoseInput::Transform {
                constraint,
                mut mixes,
                negative_zero_indices,
            } => {
                restore_zeros(
                    &mut mixes.iter_mut().collect::<Vec<_>>(),
                    negative_zero_indices,
                )?;
                Self::Transform { constraint, mixes }
            }
            ConstraintPoseInput::Physics {
                constraint,
                mut inertia,
                mut strength,
                mut damping,
                mut mass,
                mut wind,
                mut gravity,
                mut mix,
                negative_zero_indices,
            } => {
                restore_zeros(
                    &mut [
                        &mut inertia,
                        &mut strength,
                        &mut damping,
                        &mut mass,
                        &mut wind,
                        &mut gravity,
                        &mut mix,
                    ],
                    negative_zero_indices,
                )?;
                Self::Physics {
                    constraint,
                    inertia,
                    strength,
                    damping,
                    mass,
                    wind,
                    gravity,
                    mix,
                }
            }
        })
    }
}

impl ConstraintPose {
    pub(crate) fn id(&self) -> u64 {
        match self {
            Self::Ik { constraint, .. }
            | Self::Transform { constraint, .. }
            | Self::Physics { constraint, .. } => *constraint,
        }
    }
    pub(crate) fn value(&self) -> crate::solve::ConstraintValue {
        match self {
            Self::Ik {
                mix,
                softness,
                stretch,
                compress,
                bend_positive,
                ..
            } => crate::solve::ConstraintValue::Ik {
                mix: *mix,
                softness: *softness,
                stretch: *stretch,
                compress: *compress,
                bend_positive: *bend_positive,
            },
            Self::Transform { mixes, .. } => {
                crate::solve::ConstraintValue::Transform { mixes: *mixes }
            }
            Self::Physics {
                inertia,
                strength,
                damping,
                mass,
                wind,
                gravity,
                mix,
                ..
            } => crate::solve::ConstraintValue::Physics {
                inertia: *inertia,
                strength: *strength,
                damping: *damping,
                mass: *mass,
                wind: *wind,
                gravity: *gravity,
                mix: *mix,
            },
        }
    }
    pub(crate) fn bits(&self) -> Vec<u64> {
        match self {
            Self::Ik {
                mix,
                softness,
                stretch,
                compress,
                bend_positive,
                ..
            } => vec![
                7,
                mix.to_bits(),
                softness.to_bits(),
                *stretch as u64,
                *compress as u64,
                *bend_positive as u64,
            ],
            Self::Transform { mixes, .. } => {
                std::iter::once(8).chain(mixes.map(f64::to_bits)).collect()
            }
            Self::Physics {
                inertia,
                strength,
                damping,
                mass,
                wind,
                gravity,
                mix,
                ..
            } => std::iter::once(23)
                .chain(
                    [*inertia, *strength, *damping, *mass, *wind, *gravity, *mix].map(f64::to_bits),
                )
                .collect(),
        }
    }
}
fn numeric_at(keys: &[Key], position: f64) -> Option<(Vec<f64>, [bool; 3])> {
    let end = keys.partition_point(|k| f64::from(k.frame) <= position);
    if end == 0 {
        return None;
    }
    let left = &keys[end - 1];
    let Some(right) = keys.get(end) else {
        return Some((
            left.values.iter().copied().map(f64::from).collect(),
            left.flags,
        ));
    };
    if position == f64::from(left.frame) || matches!(left.curve, CurveInput::Stepped) {
        return Some((
            left.values.iter().copied().map(f64::from).collect(),
            left.flags,
        ));
    }
    let values = left
        .values
        .iter()
        .zip(&right.values)
        .enumerate()
        .map(|(axis, (a, b))| {
            let (a, b) = (f64::from(*a), f64::from(*b));
            match &left.controls {
                None => {
                    a + (b - a) * (position - f64::from(left.frame))
                        / (f64::from(right.frame) - f64::from(left.frame))
                }
                Some(controls) => {
                    let [x1, y1, x2, y2] = controls[axis].map(f64::from);
                    let cubic = |a: f64, b: f64, c: f64, d: f64, t: f64| {
                        let u = 1. - t;
                        u * u * u * a + 3. * u * u * t * b + 3. * u * t * t * c + t * t * t * d
                    };
                    let (mut low, mut high) = (0., 1.);
                    for _ in 0..48 {
                        let mid = (low + high) * 0.5;
                        if cubic(f64::from(left.frame), x1, x2, f64::from(right.frame), mid)
                            < position
                        {
                            low = mid;
                        } else {
                            high = mid;
                        }
                    }
                    cubic(a, y1, y2, b, (low + high) * 0.5)
                }
            }
        })
        .collect();
    Some((values, left.flags))
}
pub(crate) fn sample(
    scene: &fbones_format::minimal::scene::SceneProject,
    ids: &[u64],
    clip: Option<&Animation>,
    time: f64,
    overrides: Option<&[ConstraintPose]>,
) -> Result<Vec<ConstraintPose>, AppError> {
    if ids.len() != scene.constraints.len() || !time.is_finite() || time < 0. {
        return Err(invalid("The constraint sampling context is invalid."));
    }
    let mut poses = scene
        .constraints
        .iter()
        .zip(ids)
        .map(|(c, id)| match c {
            Constraint::Ik(c) => ConstraintPose::Ik {
                constraint: *id,
                mix: c.mix.into(),
                softness: c.softness.into(),
                stretch: c.stretch,
                compress: c.compress,
                bend_positive: c.bend_positive,
            },
            Constraint::Transform(c) => ConstraintPose::Transform {
                constraint: *id,
                mixes: c.mix.map(f64::from),
            },
            Constraint::Physics(c) => ConstraintPose::Physics {
                constraint: *id,
                inertia: c.inertia.into(),
                strength: c.strength.into(),
                damping: c.damping.into(),
                mass: c.mass.into(),
                wind: c.wind.into(),
                gravity: c.gravity.into(),
                mix: c.mix.into(),
            },
        })
        .collect::<Vec<_>>();
    if let Some(clip) = clip {
        for track in &clip.constraint_tracks {
            let Some((values, flags)) = numeric_at(
                &sampling_keys(track, time * f64::from(scene.fps)),
                time * f64::from(scene.fps),
            ) else {
                continue;
            };
            let pose = poses
                .get_mut(track.constraint())
                .ok_or_else(|| invalid("The animated constraint is missing."))?;
            match (track, pose) {
                (
                    ConstraintTimeline::Ik { .. },
                    ConstraintPose::Ik {
                        mix,
                        softness,
                        stretch,
                        compress,
                        bend_positive,
                        ..
                    },
                ) => {
                    *mix = values[0];
                    *softness = values[1];
                    *stretch = flags[0];
                    *compress = flags[1];
                    *bend_positive = flags[2];
                }
                (
                    ConstraintTimeline::TransformMix { .. },
                    ConstraintPose::Transform { mixes, .. },
                ) => {
                    *mixes = values.try_into().unwrap();
                }
                (
                    ConstraintTimeline::Physics { property, .. },
                    ConstraintPose::Physics {
                        inertia,
                        strength,
                        damping,
                        mass,
                        wind,
                        gravity,
                        mix,
                        ..
                    },
                ) => {
                    let target = match property {
                        PhysicsProperty::Inertia => inertia,
                        PhysicsProperty::Strength => strength,
                        PhysicsProperty::Damping => damping,
                        PhysicsProperty::Mass => mass,
                        PhysicsProperty::Wind => wind,
                        PhysicsProperty::Gravity => gravity,
                        PhysicsProperty::Mix => mix,
                    };
                    *target = values[0];
                }
                (ConstraintTimeline::PhysicsReset { .. }, ConstraintPose::Physics { .. }) => {}
                _ => return Err(invalid("Constraint animation target kind changed.")),
            }
        }
    }
    if let Some(overrides) = overrides {
        if overrides.len() > scene.constraints.len() {
            return Err(invalid("Use bounded distinct temporary constraint values."));
        }
        let mut seen = HashSet::new();
        for pose in overrides {
            let index = ids
                .iter()
                .position(|id| *id == pose.id())
                .ok_or_else(|| invalid("A temporary constraint target is missing."))?;
            if !seen.insert(index) {
                return Err(invalid("Temporary constraint targets must be distinct."));
            }
            poses[index] = pose.clone();
        }
    }
    for (pose, c) in poses.iter().zip(&scene.constraints) {
        pose.value()
            .validate(c)
            .map_err(|e| AppError::new("InvalidAnimationPose", e.to_string()))?;
    }
    Ok(poses)
}
/// Explicit FBones replay policy: fire Reset keys in (previous, now], including
/// frame zero only for an initial Reset. No None-mode preview consumes a key.
pub(crate) fn reset_crossings(
    clip: Option<&Animation>,
    fps: f32,
    previous: f64,
    now: f64,
    initial: bool,
) -> Vec<usize> {
    let mut indices = vec![];
    if let Some(clip) = clip {
        for track in &clip.constraint_tracks {
            if let ConstraintTimeline::PhysicsReset { constraint, keys } = track {
                if keys.iter().any(|k| {
                    let t = f64::from(k.frame) / f64::from(fps);
                    t <= now && (t > previous || initial && t == 0.)
                }) && !indices.contains(constraint)
                {
                    indices.push(*constraint);
                }
            }
        }
    }
    indices
}
