//! Ordered Path constraints. Length caches here are runtime geometry;
//! the editor's retained Path69 length fields are independent authored data.
use super::{Affine, ConstraintValue, Evaluation, LocalPose, SolveError};
use crate::{
    binding::{world_vertices, DenseBindingRef},
    rig::{poses, Pose},
};
use fbones_format::minimal::scene::{
    PathAttachment, PathConstraint, PathPositionMode, PathRotateMode, PathSpacingMode, SceneProject,
};

type Point = (f64, f64);
const EPSILON: f64 = 0.00001;
#[allow(clippy::approx_constant)]
const RUNTIME_PI: f64 = 3.1415927;

#[derive(Clone, Copy)]
struct Cubic([Point; 4]);

impl Cubic {
    fn at(self, t: f64) -> Point {
        let [p0, p1, p2, p3] = self.0;
        let q = 1. - t;
        let terms = [q * q * q, 3. * q * q * t, 3. * q * t * t, t * t * t];
        (
            p0.0 * terms[0] + p1.0 * terms[1] + p2.0 * terms[2] + p3.0 * terms[3],
            p0.1 * terms[0] + p1.1 * terms[1] + p2.1 * terms[2] + p3.1 * terms[3],
        )
    }

    fn sample(self, t: f64) -> Sample {
        let [p0, p1, p2, _] = self.0;
        if t == 0. {
            return Sample {
                point: p0,
                tangent: direction(p0, p1),
            };
        }
        let point = self.at(t);
        let tangent = if t < 0.001 {
            direction(p0, p1)
        } else {
            let q = 1. - t;
            let previous = (
                p0.0 * q * q + 2. * p1.0 * q * t + p2.0 * t * t,
                p0.1 * q * q + 2. * p1.1 * q * t + p2.1 * t * t,
            );
            direction(previous, point)
        };
        Sample { point, tangent }
    }

    fn chords<const N: usize>(self, mut cumulative: f64) -> [f64; N] {
        let mut previous = self.0[0];
        std::array::from_fn(|index| {
            let point = self.at((index + 1) as f64 / N as f64);
            cumulative += (point.0 - previous.0).hypot(point.1 - previous.1);
            previous = point;
            cumulative
        })
    }
}

#[derive(Clone, Copy)]
struct Sample {
    point: Point,
    tangent: f64,
}

fn direction(from: Point, to: Point) -> f64 {
    (to.1 - from.1).atan2(to.0 - from.0)
}

fn cubics(points: &[Point], closed: bool) -> Vec<Cubic> {
    let count = points.len();
    let curves = count / 3 - usize::from(!closed);
    (0..curves)
        .map(|curve| Cubic(std::array::from_fn(|i| points[(1 + 3 * curve + i) % count])))
        .collect()
}

fn curve_lengths(curves: &[Cubic]) -> Result<Vec<f64>, SolveError> {
    let mut total = 0.;
    curves
        .iter()
        .map(|curve| {
            total = curve.chords::<4>(total)[3];
            if !(total as f32).is_finite() {
                return Err(SolveError::NonFinite);
            }
            Ok(total)
        })
        .collect()
}

/// Four-chord stock export approximation in authored Setup world space, with
/// the closing cubic retained in the table even for an open Path. This is not
/// the editor metadata stored on PathAttachment::lengths.
pub(crate) fn setup_lengths(path: &PathAttachment, setup: &[Pose]) -> Result<Vec<f64>, SolveError> {
    let points = world_vertices(
        DenseBindingRef {
            weighted: path.weighted,
            bones: &path.bones,
            vertices: &path.vertices,
        },
        setup,
    );
    let points: Vec<_> = points
        .into_iter()
        .map(|[x, y]| (f64::from(x), f64::from(y)))
        .collect();
    curve_lengths(&cubics(&points, true))
}

fn target<'a>(
    scene: &'a SceneProject,
    constraint: &PathConstraint,
) -> Result<(usize, Option<&'a PathAttachment>), SolveError> {
    let slot = scene
        .slots
        .get(constraint.slot)
        .ok_or(SolveError::InvalidConstraint)?;
    if slot.bone >= scene.rig.bones.len() {
        return Err(SolveError::InvalidConstraint);
    }
    let path = match slot.active_attachment {
        Some(index) => slot
            .attachments
            .get(index)
            .ok_or(SolveError::InvalidConstraint)?
            .path(),
        None => None,
    };
    Ok((slot.bone, path))
}

pub(super) fn validate(scene: &SceneProject, c: &PathConstraint) -> Result<(), SolveError> {
    if [
        c.rotation,
        c.position,
        c.spacing,
        c.mix_rotate,
        c.mix_x,
        c.mix_y,
    ]
    .iter()
    .any(|value| !value.is_finite())
    {
        return Err(SolveError::InvalidConstraint);
    }
    let (owner, path) = target(scene, c)?;
    let Some(path) = path else { return Ok(()) };
    let count = path.vertices.len();
    let columns = path.bones.len();
    if count < if path.closed { 3 } else { 6 }
        || count % 3 != 0
        || columns == 0
        || columns > 128
        || path
            .bones
            .iter()
            .any(|index| *index >= scene.rig.bones.len())
        || (!path.weighted && path.bones.as_slice() != [owner])
        || path.vertices.iter().any(|row| {
            row.positions.len() != columns * 2
                || row.weights.len() != columns
                || row.positions.iter().any(|value| !value.is_finite())
                || row
                    .weights
                    .iter()
                    .any(|weight| !weight.is_finite() || *weight < 0.)
                || !row.weights.iter().any(|weight| *weight > 0.)
        })
    {
        return Err(SolveError::InvalidConstraint);
    }
    Ok(())
}

fn world_points(path: &PathAttachment, owner: usize, frame: &Evaluation) -> Vec<Point> {
    path.vertices
        .iter()
        .map(|row| {
            if !path.weighted {
                return frame.bones[owner]
                    .world
                    .point(row.positions[0].into(), row.positions[1].into());
            }
            let mut point = (0., 0.);
            for (column, bone) in path.bones.iter().copied().enumerate() {
                let weight = f64::from(row.weights[column]);
                if weight == 0. {
                    continue;
                }
                let (x, y) = frame.bones[bone].world.point(
                    row.positions[column * 2].into(),
                    row.positions[column * 2 + 1].into(),
                );
                point.0 += x * weight;
                point.1 += y * weight;
            }
            point
        })
        .collect()
}

fn prefix_position(prefix: &[f64], distance: f64, from: usize) -> Result<(usize, f64), SolveError> {
    let index = from + prefix[from..].partition_point(|end| *end < distance);
    let end = *prefix.get(index).ok_or(SolveError::InvalidConstraint)?;
    let start = index.checked_sub(1).map_or(0., |i| prefix[i]);
    let width = end - start;
    if width < 0. || !width.is_finite() {
        return Err(SolveError::InvalidConstraint);
    }
    let fraction = if width == 0. && distance == start {
        0.
    } else {
        (distance - start) / width
    };
    if !fraction.is_finite() {
        return Err(SolveError::InvalidConstraint);
    }
    Ok((index, fraction))
}

#[derive(Default)]
struct PathCursor {
    curve: usize,
    segment: usize,
}

fn path_position(
    curves: &[Cubic],
    prefix: &[f64],
    subdivisions: &[[f64; 10]],
    closed: bool,
    mut distance: f64,
    cursor: &mut PathCursor,
) -> Result<Sample, SolveError> {
    let total = *prefix.last().ok_or(SolveError::InvalidConstraint)?;
    if !distance.is_finite() || !total.is_finite() || total < 0. {
        return Err(SolveError::InvalidConstraint);
    }
    if closed {
        distance = if total == 0. {
            0.
        } else {
            distance.rem_euclid(total)
        };
        *cursor = PathCursor::default();
    } else if distance < 0. || distance > total {
        let (point, tangent, beyond) = if distance < 0. {
            let [start, handle, _, _] = curves[0].0;
            (start, direction(start, handle), distance)
        } else {
            let [_, _, handle, end] = curves[curves.len() - 1].0;
            (end, direction(handle, end), distance - total)
        };
        let (sin, cos) = tangent.sin_cos();
        return Ok(Sample {
            point: (point.0 + cos * beyond, point.1 + sin * beyond),
            tangent,
        });
    }
    // The pinned runtime walks successive open-path samples from its current
    // curve/segment even when their spacing is negative. A closed path wraps.
    let (index, mut t) = prefix_position(prefix, distance, cursor.curve)?;
    if index != cursor.curve {
        cursor.curve = index;
        cursor.segment = 0;
    }
    if let Some(chords) = subdivisions.get(index) {
        let (segment, fraction) = prefix_position(chords, t * chords[9], cursor.segment)?;
        cursor.segment = segment;
        t = (segment as f64 + fraction) / 10.;
    }
    Ok(curves[index].sample(t))
}

fn apply_worlds(
    scene: &SceneProject,
    frame: &mut Evaluation,
    targets: &[Option<Affine>],
) -> Result<(), SolveError> {
    // Compute each constrained world transform before writing any. Then recover
    // applied locals in hierarchy order and propagate unconstrained descendants.
    for (index, target) in targets.iter().copied().enumerate() {
        let parent = frame.parent_world(scene, index);
        let bone = &mut frame.bones[index];
        if let Some(world) = target {
            let local = if scene.rig.bones[index].parent.is_some() {
                parent.inverse()?.compose(world)
            } else {
                world
            };
            bone.applied = LocalPose::from_affine(local, bone.applied)?;
            bone.world = world;
        } else {
            bone.world = parent.compose(bone.applied.affine());
        }
    }
    Ok(())
}

pub(super) fn apply(
    scene: &SceneProject,
    frame: &mut Evaluation,
    c: &PathConstraint,
    sampled: Option<&ConstraintValue>,
) -> Result<(), SolveError> {
    let (owner, path) = target(scene, c)?;
    let Some(path) = path else { return Ok(()) };
    let (position, spacing, [mix_rotate, mix_x, mix_y]) = match sampled {
        Some(ConstraintValue::Path {
            position,
            spacing,
            mixes,
        }) => (*position, *spacing, *mixes),
        None => (
            c.position.into(),
            c.spacing.into(),
            [c.mix_rotate, c.mix_x, c.mix_y].map(f64::from),
        ),
        _ => return Err(SolveError::InvalidConstraint),
    };
    if mix_rotate == 0. && mix_x == 0. && mix_y == 0. {
        return Ok(());
    }
    let curves = cubics(&world_points(path, owner, frame), path.closed);
    let mut prefix = if path.constant_speed {
        curve_lengths(&curves)?
    } else {
        setup_lengths(path, &poses(&scene.rig.bones))?
    };
    prefix.truncate(curves.len());
    let subdivisions = if path.constant_speed {
        curves
            .iter()
            .map(|curve| curve.chords::<10>(0.))
            .collect::<Vec<_>>()
    } else {
        Vec::new()
    };
    let total = *prefix.last().ok_or(SolveError::InvalidConstraint)?;
    let tangent = c.rotate_mode == PathRotateMode::Tangent;
    let scale = c.rotate_mode == PathRotateMode::ChainScale;
    let sample_count = c.bones.len() + usize::from(!tangent);
    let lengths: Vec<_> = c
        .bones
        .iter()
        .map(|index| {
            let size = f64::from(scene.rig.bones[*index].length);
            (size, frame.bones[*index].world.scale_x() * size)
        })
        .collect();
    let mut spaces = vec![0.; sample_count];
    let mut positive_lengths = 0.;
    for (space, &(setup, world)) in spaces[1..].iter_mut().zip(&lengths) {
        *space = match c.spacing_mode {
            PathSpacingMode::Percent => spacing,
            _ if setup < EPSILON => spacing,
            PathSpacingMode::Length => (setup + spacing).max(0.) * world / setup,
            PathSpacingMode::Fixed => spacing * world / setup,
            PathSpacingMode::Proportional => {
                positive_lengths += world;
                world
            }
        };
    }
    if c.spacing_mode == PathSpacingMode::Proportional && positive_lengths > 0. {
        let factor = sample_count as f64 / positive_lengths * spacing;
        for space in &mut spaces[1..] {
            *space *= factor;
        }
    }
    let spacing_multiplier = match c.spacing_mode {
        PathSpacingMode::Percent => total,
        PathSpacingMode::Proportional => total / sample_count as f64,
        _ => 1.,
    };
    let mut distance = position;
    if c.position_mode == PathPositionMode::Percent {
        distance *= total;
    }
    let mut cursor = PathCursor::default();
    let samples: Vec<_> = spaces
        .iter()
        .map(|space| {
            distance += space * spacing_multiplier;
            path_position(
                &curves,
                &prefix,
                &subdivisions,
                path.closed,
                distance,
                &mut cursor,
            )
        })
        .collect::<Result<_, _>>()?;

    let mirrored = frame.bones[owner].world.determinant() <= 0.;
    let rotation_offset =
        f64::from(c.rotation) * (RUNTIME_PI / 180.) * if mirrored { -1. } else { 1. };
    let adjust_tip = c.rotation == 0. && c.rotate_mode == PathRotateMode::Chain;
    let mut target_point = samples[0].point;
    let mut targets = vec![None; frame.bones.len()];
    for (i, &index) in c.bones.iter().enumerate() {
        let mut world = frame.bones[index].world;
        world.x += (target_point.0 - world.x) * mix_x;
        world.y += (target_point.1 - world.y) * mix_y;
        let next = samples.get(i + 1).copied().unwrap_or(samples[i]);
        let delta = (next.point.0 - target_point.0, next.point.1 - target_point.1);
        let (setup_length, world_length) = lengths[i];
        let world_length = if setup_length < EPSILON && c.spacing_mode != PathSpacingMode::Percent {
            0.
        } else {
            world_length
        };
        if scale && world_length != 0. {
            let factor = 1. + (delta.0.hypot(delta.1) / world_length - 1.) * mix_rotate;
            world.a *= factor;
            world.b *= factor;
        }
        target_point = next.point;
        if mix_rotate > 0. {
            let heading = if tangent {
                samples[i].tangent
            } else if spaces[i + 1] == 0. {
                next.tangent
            } else {
                delta.1.atan2(delta.0)
            };
            let mut difference = heading - world.b.atan2(world.a);
            if adjust_tip {
                let (sin, cos) = difference.sin_cos();
                target_point.0 +=
                    (setup_length * (cos * world.a - sin * world.b) - delta.0) * mix_rotate;
                target_point.1 +=
                    (setup_length * (sin * world.a + cos * world.b) - delta.1) * mix_rotate;
            } else {
                difference += rotation_offset;
            }
            if difference > RUNTIME_PI {
                difference -= 2. * RUNTIME_PI;
            } else if difference < -RUNTIME_PI {
                difference += 2. * RUNTIME_PI;
            }
            world.rotate_basis((difference * mix_rotate).to_degrees());
        }
        targets[index] = Some(world);
    }
    apply_worlds(scene, frame, &targets)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solve::{evaluate, PhysicsState, StepMode};
    use fbones_format::minimal::{
        meshes::Vertex,
        regions::RegionProject,
        scene::{AttachmentAddress, Constraint, SceneAttachment, SceneSlot},
        Bone, MinimalProject,
    };

    #[test]
    fn flat_path_extrapolates_or_wraps_with_a_finite_tangent() {
        let flat = Cubic([(3., -2.); 4]);
        for subdivisions in [vec![], vec![flat.chords::<10>(0.)]] {
            for distance in [-4., 0., 4.] {
                for closed in [false, true] {
                    let sample = path_position(
                        &[flat],
                        &[0.],
                        &subdivisions,
                        closed,
                        distance,
                        &mut PathCursor::default(),
                    )
                    .unwrap();
                    assert_eq!(sample.tangent, 0.);
                    assert_eq!(sample.point, (3. + if closed { 0. } else { distance }, -2.));
                }
            }
        }
        assert_eq!(prefix_position(&[5., 5., 10.], 5., 0), Ok((0, 1.)));
        assert_eq!(prefix_position(&[5., 5., 10.], 7.5, 0), Ok((2, 0.5)));
    }

    #[test]
    fn chain_scale_path_uses_target_slot_and_preserves_authored_bones() {
        let mut rig = MinimalProject::new("Own Path solve".into(), [4; 16]);
        for (index, (x, y, length)) in [(-6., 10., 10.), (-9., 12., 20.)].into_iter().enumerate() {
            let mut bone = Bone::root();
            bone.name = format!("follower {index}");
            bone.parent = Some(0);
            bone.x = x;
            bone.y = y;
            bone.length = length;
            rig.bones.push(bone);
        }
        let mut project = SceneProject::from(&RegionProject {
            rig,
            images_root: "./images/".into(),
            slots: vec![],
            region_order: vec![],
        });
        project.slots.push(SceneSlot {
            name: "target".into(),
            bone: 0,
            color: [255; 4],
            blend: Default::default(),
            active_attachment: Some(0),
            attachments: vec![SceneAttachment::Path(PathAttachment {
                name: "diagonal".into(),
                closed: false,
                constant_speed: false,
                color: [255; 4],
                weighted: false,
                bones: vec![0],
                lengths: vec![],
                edges: vec![],
                vertices: [
                    [-10., -10.],
                    [0., 0.],
                    [10., 40. / 3.],
                    [20., 80. / 3.],
                    [30., 40.],
                    [40., 50.],
                ]
                .into_iter()
                .map(|positions| Vertex {
                    weights: vec![1.],
                    positions: positions.to_vec(),
                })
                .collect(),
            })],
        });
        project.attachment_order.push(AttachmentAddress {
            slot: 0,
            attachment: 0,
        });
        project.constraints.push(Constraint::Path(PathConstraint {
            name: "follow".into(),
            bones: vec![1, 2],
            slot: 0,
            position_mode: PathPositionMode::Fixed,
            spacing_mode: PathSpacingMode::Fixed,
            rotate_mode: PathRotateMode::ChainScale,
            rotation: 0.,
            position: 12.5,
            spacing: 5.,
            mix_rotate: 1.,
            mix_x: 1.,
            mix_y: 1.,
        }));

        let mut physics = PhysicsState::default();
        let frame = evaluate(&project, None, &mut physics, StepMode::None).unwrap();
        for (bone, expected) in frame.bones[1..]
            .iter()
            .zip([[7.5, 10., 0.3, 0.4], [10.5, 14., 0.15, 0.2]])
        {
            for (actual, expected) in [bone.world.x, bone.world.y, bone.world.a, bone.world.b]
                .into_iter()
                .zip(expected)
            {
                assert!((actual - expected).abs() < 1e-5, "{actual} != {expected}");
            }
        }
        assert_eq!(frame.bones[1].authored.x, -6.);
        project.slots[0].active_attachment = None;
        let hidden = evaluate(&project, None, &mut physics, StepMode::None).unwrap();
        assert!((hidden.bones[1].world.x + 6.).abs() < 1e-12);
        assert!((hidden.bones[2].world.x + 9.).abs() < 1e-12);
    }
}
