//! Native deformation offsets and precise frozen world-target authoring.
use crate::{
    animation::{self, CurveInput},
    project::AppError,
    scene_edit::SceneFrame,
    solve::Affine,
};
use fbones_format::minimal::{
    meshes::Vertex,
    scene::{
        deform_coordinate_count, Animation, AttachmentAddress, DeformCurve, DeformKey,
        DeformTimeline, SceneAttachment,
    },
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
#[cfg(test)]
#[path = "animation_deform_tests.rs"]
mod tests;
fn invalid(message: &str) -> AppError {
    AppError::new("InvalidAnimation", message)
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeformKeyInput {
    pub attachment: u64,
    pub frame: f32,
    pub offsets: Vec<f32>,
    #[serde(default)]
    pub offset_bits: Option<Vec<u32>>,
    pub curve: CurveInput,
    #[serde(default)]
    pub controls: Option<[f32; 4]>,
    #[serde(default)]
    pub data_present: Option<bool>,
    #[serde(default)]
    pub key_id: Option<u64>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorldVertexMove {
    pub vertex: usize,
    pub x: f64,
    pub y: f64,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(try_from = "TemporaryDeformPoseInput")]
pub struct TemporaryDeformPose {
    pub attachment: u64,
    pub offsets: Vec<f64>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TemporaryDeformPoseInput {
    attachment: u64,
    offsets: Vec<f64>,
    #[serde(default)]
    negative_zero_indices: Vec<usize>,
}
impl TryFrom<TemporaryDeformPoseInput> for TemporaryDeformPose {
    type Error = &'static str;
    fn try_from(mut input: TemporaryDeformPoseInput) -> Result<Self, Self::Error> {
        let mut seen = HashSet::new();
        for index in input.negative_zero_indices {
            let value = input.offsets.get_mut(index).ok_or(
                "Temporary deformation negative-zero indices must address existing coordinates.",
            )?;
            if *value != 0. || !seen.insert(index) {
                return Err("Temporary deformation negative-zero indices must be distinct zero coordinates.");
            }
            *value = -0.;
        }
        Ok(Self {
            attachment: input.attachment,
            offsets: input.offsets,
        })
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeformKeyView {
    pub id: u64,
    pub frame: f32,
    pub offsets: Vec<f32>,
    pub data_present: bool,
    pub curve: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub controls: Option<[f32; 4]>,
}
#[derive(Clone, Debug, Serialize)]
pub struct DeformTrackView {
    pub attachment: u64,
    pub keys: Vec<DeformKeyView>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeformPoseView {
    pub attachment: u64,
    pub offsets: Vec<f64>,
    pub world_vertices: Vec<[f64; 2]>,
}
fn binding(attachment: &SceneAttachment) -> Result<(bool, &[usize], &[Vertex]), AppError> {
    match attachment {
        SceneAttachment::Mesh(m) => Ok((m.weighted, &m.bones, &m.vertices)),
        SceneAttachment::Clipping(c) => Ok((c.weighted, &c.bones, &c.vertices)),
        SceneAttachment::Region(_) => Err(invalid(
            "Choose a mesh or clipping attachment for deformation.",
        )),
    }
}
fn target(frame: &SceneFrame, id: u64) -> Result<(AttachmentAddress, &SceneAttachment), AppError> {
    let address = frame.attachment_address(id)?;
    Ok((
        address,
        &frame.project.slots[address.slot].attachments[address.attachment],
    ))
}
pub(crate) fn allocate_ids(clip: &Animation, next: &mut u64) -> Result<Vec<Vec<u64>>, AppError> {
    clip.deform_tracks
        .iter()
        .map(|t| t.keys.iter().map(|_| animation::allocate(next)).collect())
        .collect()
}
pub(crate) fn views(frame: &SceneFrame, a: usize) -> Vec<DeformTrackView> {
    frame.project.animations[a]
        .deform_tracks
        .iter()
        .enumerate()
        .map(|(t, track)| DeformTrackView {
            attachment: frame.attachment_ids[track.attachment.slot][track.attachment.attachment],
            keys: track
                .keys
                .iter()
                .enumerate()
                .map(|(k, key)| DeformKeyView {
                    id: frame.animation_deform_key_ids[a][t][k],
                    frame: key.frame,
                    offsets: key.offsets.clone(),
                    data_present: key.data_present,
                    curve: match key.curve {
                        DeformCurve::Linear => "linear",
                        DeformCurve::Stepped => "stepped",
                        DeformCurve::Bezier { .. } => "bezier",
                    },
                    controls: match key.curve {
                        DeformCurve::Bezier { controls } => Some(controls),
                        _ => None,
                    },
                })
                .collect(),
        })
        .collect()
}
pub(crate) fn canonicalize(frame: &mut SceneFrame) -> Result<(), AppError> {
    for (a, clip) in frame.project.animations.iter_mut().enumerate() {
        let order = clip.deform_track_permutation(&frame.project.slots)?;
        let old = clip.deform_tracks.clone();
        let ids = frame.animation_deform_key_ids[a].clone();
        clip.deform_tracks = order.iter().map(|i| old[*i].clone()).collect();
        frame.animation_deform_key_ids[a] = order.iter().map(|i| ids[*i].clone()).collect();
    }
    Ok(())
}
fn curve(input: CurveInput, controls: Option<[f32; 4]>) -> Result<DeformCurve, AppError> {
    match (input, controls) {
        (CurveInput::Linear, None) => Ok(DeformCurve::Linear),
        (CurveInput::Stepped, None) => Ok(DeformCurve::Stepped),
        (CurveInput::Bezier, Some(controls)) => Ok(DeformCurve::Bezier { controls }),
        _ => Err(invalid(
            "Only deform Bezier keys require one progress axis of controls.",
        )),
    }
}
fn check_neighbors(
    old: &[DeformKey],
    old_ids: &[u64],
    keys: &[DeformKey],
    ids: &[u64],
    explicit: &HashSet<u64>,
) -> Result<(), AppError> {
    for (i, key) in old.iter().enumerate() {
        if !matches!(key.curve, DeformCurve::Bezier { .. }) {
            continue;
        }
        let Some(at) = ids.iter().position(|id| *id == old_ids[i]) else {
            continue;
        };
        if matches!(keys[at].curve, DeformCurve::Bezier { .. })
            && ids.get(at + 1) != old_ids.get(i + 1)
            && !explicit.contains(&old_ids[i])
        {
            return Err(invalid("This edit changes a deform Bezier segment's neighbors. Edit its curve explicitly or select the complete segment."));
        }
    }
    Ok(())
}
pub(crate) fn validate(frame: &SceneFrame) -> Result<(), AppError> {
    for clip in &frame.project.animations {
        for track in &clip.deform_tracks {
            for (i, key) in track.keys.iter().enumerate() {
                if let DeformCurve::Bezier { controls } = key.curve {
                    let right = track
                        .keys
                        .get(i + 1)
                        .filter(|right| right.frame > key.frame)
                        .ok_or_else(|| {
                            invalid("A deform Bezier key needs a following key at a later frame.")
                        })?;
                    if controls
                        .iter()
                        .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
                        || controls[0] < key.frame
                        || controls[0] > right.frame
                        || controls[2] < key.frame
                        || controls[2] > right.frame
                    {
                        return Err(invalid(
                            "Use finite deform controls within the segment frame bounds.",
                        ));
                    }
                }
            }
        }
    }
    Ok(())
}
pub(crate) fn set_keys(
    frame: &mut SceneFrame,
    next: &mut u64,
    a: usize,
    inputs: Vec<DeformKeyInput>,
) -> Result<(), AppError> {
    if inputs.is_empty() || inputs.len() > 4096 {
        return Err(invalid("Choose a nonempty bounded deform batch."));
    }
    let old = frame.project.animations[a].deform_tracks.clone();
    let old_ids = frame.animation_deform_key_ids[a].clone();
    let mut seen = HashSet::new();
    let mut explicit = HashSet::new();
    for mut input in inputs {
        if let Some(bits) = input.offset_bits.take() {
            if bits.len() != input.offsets.len()
                || bits.iter().zip(&input.offsets).any(|(bits, value)| {
                    let decoded = f32::from_bits(*bits);
                    !decoded.is_finite() || decoded != *value
                })
            {
                return Err(invalid(
                    "Deformation coordinate bits must match the complete finite numeric vector.",
                ));
            }
            input.offsets = bits.into_iter().map(f32::from_bits).collect();
        }
        let (address, attachment) = target(frame, input.attachment)?;
        let count = deform_coordinate_count(attachment)?;
        let (weighted, _, _) = binding(attachment)?;
        let position = animation::checked_frame(input.frame)?;
        if input.offsets.len() != count
            || input
                .offsets
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
        {
            return Err(invalid(
                "Use a complete finite dense deformation vector for this attachment.",
            ));
        }
        let existing = old.iter().position(|t| t.attachment == address);
        let selected = if let Some(id) = input.key_id {
            let t = existing.ok_or_else(|| {
                invalid("The selected deform key no longer belongs to this attachment.")
            })?;
            let k = old_ids[t]
                .iter()
                .position(|value| *value == id)
                .ok_or_else(|| invalid("The selected deform key no longer exists."))?;
            if old[t].keys[k].frame != position {
                return Err(invalid("The selected deform key moved to another frame."));
            }
            Some((id, t, k))
        } else {
            existing.and_then(|t| {
                let end = old[t].keys.partition_point(|key| key.frame <= position);
                (end > 0 && old[t].keys[end - 1].frame == position)
                    .then(|| (old_ids[t][end - 1], t, end - 1))
            })
        };
        let target_id = selected.map(|(id, _, _)| id);
        if !seen.insert((address, position.to_bits(), target_id)) {
            return Err(invalid("A deform batch repeats the same key."));
        }
        if let Some(id) = target_id {
            explicit.insert(id);
        }
        let positive_zero = input.offsets.iter().all(|v| v.to_bits() == 0);
        let any_nonzero = input.offsets.iter().any(|v| *v != 0.);
        let present = input.data_present.unwrap_or_else(|| {
            if any_nonzero {
                true
            } else {
                selected.map_or(!weighted, |(_, t, k)| old[t].keys[k].data_present)
            }
        });
        if !present && !positive_zero {
            return Err(invalid(
                "Absent deformation data requires positive-zero coordinates.",
            ));
        }
        if !any_nonzero && !positive_zero {
            return Err(invalid(
                "A compact all-zero deform vector cannot discard signed-zero coordinates.",
            ));
        }
        let t = if let Some(t) = frame.project.animations[a]
            .deform_tracks
            .iter()
            .position(|t| t.attachment == address)
        {
            t
        } else {
            let t = frame.project.animations[a].deform_tracks.len();
            frame.project.animations[a]
                .deform_tracks
                .push(DeformTimeline {
                    attachment: address,
                    keys: vec![],
                });
            frame.animation_deform_key_ids[a].push(vec![]);
            t
        };
        let keys = &mut frame.project.animations[a].deform_tracks[t].keys;
        let ids = &mut frame.animation_deform_key_ids[a][t];
        let mut key = DeformKey {
            frame: position,
            offsets: input.offsets,
            data_present: present,
            curve: curve(input.curve, input.controls)?,
        };
        if let Some(id) = target_id {
            let k = ids.iter().position(|n| *n == id).unwrap();
            key.frame = keys[k].frame;
            keys[k] = key;
        } else {
            let k = keys.partition_point(|key| key.frame <= position);
            keys.insert(k, key);
            ids.insert(k, animation::allocate(next)?);
        }
    }
    for (t, previous) in old.iter().enumerate() {
        if let Some(n) = frame.project.animations[a]
            .deform_tracks
            .iter()
            .position(|tr| tr.attachment == previous.attachment)
        {
            check_neighbors(
                &previous.keys,
                &old_ids[t],
                &frame.project.animations[a].deform_tracks[n].keys,
                &frame.animation_deform_key_ids[a][n],
                &explicit,
            )?;
        }
    }
    validate(frame)
}
pub(crate) fn delete_keys(
    frame: &mut SceneFrame,
    a: usize,
    wanted: &HashSet<u64>,
) -> Result<(), AppError> {
    for t in (0..frame.project.animations[a].deform_tracks.len()).rev() {
        let ids = &mut frame.animation_deform_key_ids[a][t];
        let keys = &mut frame.project.animations[a].deform_tracks[t].keys;
        let old = keys.clone();
        let old_ids = ids.clone();
        for k in (0..ids.len()).rev() {
            if wanted.contains(&ids[k]) {
                keys.remove(k);
                ids.remove(k);
            }
        }
        check_neighbors(&old, &old_ids, keys, ids, &HashSet::new())?;
        if keys.is_empty() {
            frame.project.animations[a].deform_tracks.remove(t);
            frame.animation_deform_key_ids[a].remove(t);
        }
    }
    Ok(())
}
pub(crate) fn move_keys(
    frame: &mut SceneFrame,
    a: usize,
    wanted: &HashSet<u64>,
    delta: f32,
) -> Result<(), AppError> {
    for t in 0..frame.project.animations[a].deform_tracks.len() {
        let keys = &mut frame.project.animations[a].deform_tracks[t].keys;
        let ids = &mut frame.animation_deform_key_ids[a][t];
        let old = keys.clone();
        let mut moved = old
            .iter()
            .cloned()
            .zip(ids.iter().copied())
            .map(|(mut key, id)| {
                if wanted.contains(&id) {
                    key.frame = animation::checked_frame(key.frame + delta)?;
                }
                Ok((key, id))
            })
            .collect::<Result<Vec<_>, AppError>>()?;
        moved.sort_by(|a, b| a.0.frame.total_cmp(&b.0.frame));
        if moved.windows(2).any(|p| {
            p[0].0.frame == p[1].0.frame && (wanted.contains(&p[0].1) || wanted.contains(&p[1].1))
        }) {
            return Err(invalid("Moving keys would collide with a deform key."));
        }
        for (i, key) in old.iter().enumerate() {
            let DeformCurve::Bezier { mut controls } = key.curve else {
                continue;
            };
            let at = moved.iter().position(|(_, id)| *id == ids[i]).unwrap();
            if moved.get(at + 1).map(|(_, id)| *id) != ids.get(i + 1).copied() {
                return Err(invalid(
                    "Move complete deform Bezier segments without changing their neighbors.",
                ));
            }
            controls[0] += moved[at].0.frame - key.frame;
            controls[2] += moved[at + 1].0.frame - old[i + 1].frame;
            moved[at].0.curve = DeformCurve::Bezier { controls };
        }
        *keys = moved.iter().map(|(key, _)| key.clone()).collect();
        *ids = moved.iter().map(|(_, id)| *id).collect();
    }
    validate(frame)
}
fn cubic(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
    let u = 1. - t;
    u * u * u * a + 3. * u * u * t * b + 3. * u * t * t * c + t * t * t * d
}
fn progress(left: &DeformKey, right: &DeformKey, position: f64) -> f64 {
    match left.curve {
        DeformCurve::Stepped => 0.,
        DeformCurve::Linear => {
            (position - f64::from(left.frame)) / (f64::from(right.frame) - f64::from(left.frame))
        }
        DeformCurve::Bezier { controls } => {
            let [x1, y1, x2, y2] = controls.map(f64::from);
            let (mut low, mut high) = (0., 1.);
            for _ in 0..48 {
                let t = (low + high) * 0.5;
                if cubic(f64::from(left.frame), x1, x2, f64::from(right.frame), t) < position {
                    low = t
                } else {
                    high = t
                }
            }
            cubic(0., y1, y2, 1., (low + high) * 0.5)
        }
    }
}
pub(crate) fn offsets_at(keys: &[DeformKey], count: usize, position: f64) -> Vec<f64> {
    let end = keys.partition_point(|key| f64::from(key.frame) <= position);
    if end == 0 {
        return vec![0.; count];
    }
    let left = &keys[end - 1];
    if position == f64::from(left.frame) {
        return left.offsets.iter().copied().map(f64::from).collect();
    }
    let Some(right) = keys.get(end) else {
        return left.offsets.iter().copied().map(f64::from).collect();
    };
    let t = progress(left, right, position);
    left.offsets
        .iter()
        .zip(&right.offsets)
        .map(|(a, b)| f64::from(*a) + (f64::from(*b) - f64::from(*a)) * t)
        .collect()
}
fn world_vertices(
    attachment: &SceneAttachment,
    offsets: &[f64],
    worlds: &[Affine],
) -> Result<Vec<[f64; 2]>, AppError> {
    let (weighted, bones, rows) = binding(attachment)?;
    let columns = if weighted { bones.len() } else { 1 };
    if offsets.len() != rows.len() * columns * 2 {
        return Err(invalid("The frozen deformation layout changed."));
    }
    rows.iter()
        .enumerate()
        .map(|(r, row)| {
            let mut point = [0.; 2];
            for (c, bone) in bones.iter().enumerate().take(columns) {
                let weight = f64::from(row.weights[c]);
                if weight == 0. {
                    continue;
                }
                let world = *worlds
                    .get(*bone)
                    .ok_or_else(|| invalid("A deformation influence bone is missing."))?;
                let p = world.point(
                    f64::from(row.positions[c * 2]) + offsets[(r * columns + c) * 2],
                    f64::from(row.positions[c * 2 + 1]) + offsets[(r * columns + c) * 2 + 1],
                );
                point[0] += p.0 * weight;
                point[1] += p.1 * weight;
            }
            if point.iter().any(|v| !v.is_finite()) {
                return Err(invalid("The sampled deformation must remain finite."));
            }
            Ok(point)
        })
        .collect()
}
pub(crate) fn sample(
    frame: &SceneFrame,
    clip: Option<&Animation>,
    position: f64,
    worlds: &[Affine],
    overrides: Option<&[TemporaryDeformPose]>,
    targets: &[(u64, AttachmentAddress)],
) -> Result<Vec<DeformPoseView>, AppError> {
    let mut temporary = HashMap::new();
    if let Some(overrides) = overrides {
        for pose in overrides {
            let (_, attachment) = target(frame, pose.attachment)?;
            if pose.offsets.len() != deform_coordinate_count(attachment)?
                || pose
                    .offsets
                    .iter()
                    .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
                || temporary.insert(pose.attachment, &pose.offsets).is_some()
            {
                return Err(invalid(
                    "Use distinct complete finite temporary deformation vectors.",
                ));
            }
        }
    }
    let mut poses = vec![];
    for (id, address) in targets.iter().copied() {
        let attachment = &frame.project.slots[address.slot].attachments[address.attachment];
        let count = deform_coordinate_count(attachment)?;
        let offsets = if let Some(offsets) = temporary.get(&id) {
            (*offsets).clone()
        } else if let Some(track) =
            clip.and_then(|clip| clip.deform_tracks.iter().find(|t| t.attachment == address))
        {
            offsets_at(&track.keys, count, position)
        } else {
            vec![0.; count]
        };
        let world_vertices = world_vertices(attachment, &offsets, worlds)?;
        poses.push(DeformPoseView {
            attachment: id,
            offsets,
            world_vertices,
        });
    }
    Ok(poses)
}
pub(crate) fn requested_targets(
    frame: &SceneFrame,
    clip: Option<&Animation>,
    overrides: Option<&[TemporaryDeformPose]>,
    requested: &[u64],
) -> Result<Vec<(u64, AttachmentAddress)>, AppError> {
    if requested.len() > 512 {
        return Err(invalid("Request a bounded set of deformation attachments."));
    }
    let mut wanted = HashSet::new();
    for id in requested {
        if !wanted.insert(*id) {
            return Err(invalid("Requested deformation targets must be distinct."));
        }
        let (_, attachment) = target(frame, *id)?;
        deform_coordinate_count(attachment)?;
    }
    if let Some(clip) = clip {
        for track in &clip.deform_tracks {
            wanted.insert(frame.attachment_ids[track.attachment.slot][track.attachment.attachment]);
        }
    }
    if let Some(overrides) = overrides {
        for pose in overrides {
            let (_, attachment) = target(frame, pose.attachment)?;
            deform_coordinate_count(attachment)?;
            wanted.insert(pose.attachment);
        }
    }
    let mut targets = vec![];
    for (s, ids) in frame.attachment_ids.iter().enumerate() {
        for (a, id) in ids.iter().enumerate() {
            if wanted.contains(id) {
                targets.push((
                    *id,
                    AttachmentAddress {
                        slot: s,
                        attachment: a,
                    },
                ));
            }
        }
    }
    Ok(targets)
}
fn vertex_move_limit(attachment: &SceneAttachment) -> usize {
    if attachment.mesh().is_some() {
        crate::mesh::MAX_VERTICES
    } else {
        256
    }
}
#[cfg(test)]
#[test]
fn large_mesh_world_targets_accept_512_but_clipping_requests_remain_256() {
    let mesh = crate::scene_large_mesh_fixture::mesh(32, 16, true);
    let attachment = SceneAttachment::Mesh(Box::new(mesh.clone()));
    let poses = vec![crate::rig::zero(); 3];
    let points = crate::mesh::world_vertices(&mesh, &poses);
    let sampled = DeformPoseView {
        attachment: 7,
        offsets: vec![0.; 512 * 4],
        world_vertices: points
            .iter()
            .map(|p| [f64::from(p[0]), f64::from(p[1])])
            .collect(),
    };
    let moves: Vec<_> = points
        .iter()
        .enumerate()
        .map(|(vertex, p)| WorldVertexMove {
            vertex,
            x: f64::from(p[0]) + 2.,
            y: f64::from(p[1]) - 3.,
        })
        .collect();
    let worlds = vec![Affine::IDENTITY; 3];
    let offsets = world_target_offsets(&attachment, &moves, &sampled, &worlds).unwrap();
    assert!(offsets.chunks_exact(4).all(|v| v == [2., -3., 2., -3.]));
    let mut excessive = moves.clone();
    excessive.push(moves[511].clone());
    assert!(world_target_offsets(&attachment, &excessive, &sampled, &worlds).is_err());
    let clipping = SceneAttachment::Clipping(fbones_format::minimal::scene::Clipping {
        name: "Own polygon".into(),
        end_slot: Some(0),
        convex: true,
        inverse: false,
        color: [255; 4],
        weighted: true,
        bones: mesh.bones,
        vertices: mesh.vertices,
        edges: mesh.edges,
    });
    assert_eq!(vertex_move_limit(&clipping), 256);
    assert!(world_target_offsets(&clipping, &moves[..257], &sampled, &worlds).is_err());
    let duplicate = [moves[511].clone(), moves[511].clone()];
    assert!(world_target_offsets(&attachment, &duplicate, &sampled, &worlds).is_err());
}
fn world_target_offsets(
    attachment: &SceneAttachment,
    moves: &[WorldVertexMove],
    sampled: &DeformPoseView,
    worlds: &[Affine],
) -> Result<Vec<f64>, AppError> {
    if moves.is_empty() || moves.len() > vertex_move_limit(attachment) {
        return Err(invalid("Choose bounded existing deform vertices."));
    }
    let (weighted, bones, rows) = binding(attachment)?;
    let columns = if weighted { bones.len() } else { 1 };
    if sampled.offsets.len() != deform_coordinate_count(attachment)?
        || sampled.world_vertices.len() != rows.len()
    {
        return Err(invalid("The frozen deformation layout changed."));
    }
    let mut offsets = sampled.offsets.clone();
    let mut seen = HashSet::new();
    for movement in moves {
        if !seen.insert(movement.vertex)
            || movement.vertex >= rows.len()
            || ![movement.x, movement.y]
                .iter()
                .all(|v| v.is_finite() && v.abs() <= 1_000_000.)
        {
            return Err(invalid(
                "Use distinct existing vertices and finite bounded f64 world targets.",
            ));
        }
        let row = &rows[movement.vertex];
        let mass = row
            .weights
            .iter()
            .take(columns)
            .copied()
            .map(f64::from)
            .filter(|w| *w > 0.)
            .sum::<f64>();
        if !mass.is_finite() || mass <= 0. {
            return Err(invalid("The deformation row needs positive binding mass."));
        }
        let old = sampled.world_vertices[movement.vertex];
        let delta = ((movement.x - old[0]) / mass, (movement.y - old[1]) / mass);
        for (c, bone) in bones.iter().enumerate().take(columns) {
            if row.weights[c] <= 0. {
                continue;
            }
            let inverse = worlds
                .get(*bone)
                .copied()
                .ok_or_else(|| invalid("A deformation influence bone is missing."))?
                .inverse()
                .map_err(|error| AppError::new("InvalidAnimation", error.to_string()))?;
            let local = inverse.vector(delta.0, delta.1);
            let at = (movement.vertex * columns + c) * 2;
            offsets[at] += local.0;
            offsets[at + 1] += local.1;
        }
    }
    Ok(offsets)
}
pub(crate) fn from_world_targets(
    frame: &SceneFrame,
    clip: &Animation,
    sampled: &DeformPoseView,
    worlds: &[Affine],
    edit: &crate::rig::RigEdit,
) -> Result<DeformKeyInput, AppError> {
    let (attachment_id, position, moves, requested_curve, requested_controls) = match edit {
        crate::rig::RigEdit::SetAnimationDeformVertices {
            attachment,
            frame,
            vertices,
            curve,
            controls,
            ..
        } => (*attachment, *frame, vertices.as_slice(), *curve, *controls),
        _ => return Err(invalid("Choose a deform world-target operation.")),
    };
    let (address, attachment) = target(frame, attachment_id)?;
    if sampled.attachment != attachment_id
        || moves.is_empty()
        || moves.len() > vertex_move_limit(attachment)
    {
        return Err(invalid("Choose bounded existing deform vertices."));
    }
    let offsets = world_target_offsets(attachment, moves, sampled, worlds)?;
    let existing = clip
        .deform_tracks
        .iter()
        .find(|t| t.attachment == address)
        .and_then(|t| t.keys.iter().rev().find(|key| key.frame == position));
    let inherited = existing.map_or(CurveInput::Linear, |key| match key.curve {
        DeformCurve::Linear => CurveInput::Linear,
        DeformCurve::Stepped => CurveInput::Stepped,
        DeformCurve::Bezier { .. } => CurveInput::Bezier,
    });
    let controls = requested_controls.or_else(|| {
        existing.and_then(|key| match key.curve {
            DeformCurve::Bezier { controls } => Some(controls),
            _ => None,
        })
    });
    let kind = requested_curve.unwrap_or(inherited);
    let controls = if matches!(kind, CurveInput::Bezier) {
        controls
    } else {
        if requested_controls.is_some() {
            return Err(invalid(
                "Only deform Bezier keys may carry progress controls.",
            ));
        }
        None
    };
    if offsets
        .iter()
        .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
    {
        return Err(invalid(
            "The authored deformation exceeds supported bounds.",
        ));
    }
    Ok(DeformKeyInput {
        attachment: attachment_id,
        frame: position,
        offsets: offsets.into_iter().map(|v| v as f32).collect(),
        offset_bits: None,
        curve: kind,
        controls,
        data_present: None,
        key_id: None,
    })
}
#[derive(PartialEq)]
struct BindingLayout {
    weighted: bool,
    bones: Vec<u64>,
    rows: Vec<Vec<u32>>,
}
fn layout(frame: &SceneFrame, address: AttachmentAddress) -> Result<BindingLayout, AppError> {
    let attachment = &frame.project.slots[address.slot].attachments[address.attachment];
    let (weighted, bones, rows) = binding(attachment)?;
    Ok(BindingLayout {
        weighted,
        bones: bones.iter().map(|i| frame.bone_ids[*i]).collect(),
        rows: rows
            .iter()
            .map(|row| {
                row.weights
                    .iter()
                    .chain(&row.positions)
                    .map(|v| v.to_bits())
                    .collect()
            })
            .collect(),
    })
}
pub(crate) fn remap_references(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    let old = next
        .project
        .animations
        .iter()
        .map(|clip| {
            clip.deform_tracks
                .iter()
                .map(|t| t.attachment)
                .collect::<Vec<_>>()
        })
        .collect::<Vec<_>>();
    for (a, tracks) in old.iter().enumerate() {
        for (t, address) in tracks.iter().enumerate() {
            let id = before.attachment_ids[address.slot][address.attachment];
            let new = next
                .attachment_address(id)
                .map_err(|_| invalid("Clear this attachment's deform keys before deleting it."))?;
            if before.slot_ids[address.slot] != next.slot_ids[new.slot]
                || layout(before, *address)? != layout(next, new)?
            {
                return Err(invalid("Clear deformation keys before changing their binding, vertex layout or owning slot."));
            }
            next.project.animations[a].deform_tracks[t].attachment = new;
        }
    }
    Ok(())
}
