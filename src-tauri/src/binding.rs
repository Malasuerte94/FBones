//! Shared dense binding arithmetic for image meshes and clipping polygons.
//! Geometry type and image resources play no part in a binding-row translation.
use crate::{
    project::AppError,
    rig::{local, Pose},
};
use fbones_format::minimal::meshes::Vertex;

#[cfg(test)]
#[path = "weighted_vertex_tests.rs"]
mod weighted_vertex_tests;

#[derive(Clone, Copy)]
pub(crate) struct DenseBindingRef<'a> {
    pub weighted: bool,
    pub bones: &'a [usize],
    pub vertices: &'a [Vertex],
}

pub(crate) struct DenseBindingMut<'a> {
    pub weighted: &'a mut bool,
    pub bones: &'a mut Vec<usize>,
    pub vertices: &'a mut Vec<Vertex>,
}

impl DenseBindingMut<'_> {
    pub fn as_ref(&self) -> DenseBindingRef<'_> {
        DenseBindingRef {
            weighted: *self.weighted,
            bones: self.bones,
            vertices: self.vertices,
        }
    }
}

pub(crate) fn world_vertices(binding: DenseBindingRef<'_>, poses: &[Pose]) -> Vec<[f32; 2]> {
    binding
        .vertices
        .iter()
        .map(|row| world_vertex(row, binding.bones, poses))
        .collect()
}

pub(crate) fn normalize_row(weights: &mut [f32]) {
    let sum: f64 = weights.iter().map(|w| f64::from(*w)).sum();
    if sum <= 0.0 {
        weights.fill(0.0);
        weights[0] = 1.0;
        return;
    }
    for w in weights.iter_mut() {
        *w = (f64::from(*w) / sum) as f32;
    }
    let sum: f32 = weights.iter().sum();
    let largest = weights
        .iter()
        .enumerate()
        .max_by(|a, b| a.1.total_cmp(b.1))
        .unwrap()
        .0;
    weights[largest] += (1.0 - sum).clamp(-weights[largest], 1.0 - weights[largest]);
}

pub(crate) fn normalize(binding: DenseBindingMut<'_>) {
    for row in binding.vertices.iter_mut() {
        normalize_row(&mut row.weights);
    }
}

#[derive(Clone, Copy)]
pub(crate) enum PositionPolicy {
    #[cfg_attr(not(feature = "scene-editing"), allow(dead_code))]
    PreserveAll,
    LegacyInitializeDormant,
}

fn invalid(message: &str) -> AppError {
    AppError::new("InvalidBinding", message)
}

fn validate(binding: DenseBindingRef<'_>, poses: &[Pose]) -> Result<(), AppError> {
    if binding.bones.is_empty()
        || binding.bones.len() > 128
        || binding.vertices.is_empty()
        || binding.vertices.len() > crate::mesh::MAX_VERTICES
        || binding
            .bones
            .iter()
            .enumerate()
            .any(|(i, b)| *b >= poses.len() || binding.bones[..i].contains(b))
        || binding.vertices.iter().any(|v| {
            v.weights.len() != binding.bones.len()
                || v.positions.len() != binding.bones.len() * 2
                || v.weights.iter().any(|w| !w.is_finite() || *w < 0.)
                || v.positions.iter().any(|p| !p.is_finite())
                || (v.weights.iter().sum::<f32>() - 1.).abs() > 0.0001
        })
    {
        return Err(invalid(
            "Use valid normalized dense binding rows and existing distinct bones.",
        ));
    }
    Ok(())
}

/// Ordered membership editing, distinct from the old BindMesh + Auto workflow.
/// New columns always receive bind coordinates, including zero-weight columns.
#[cfg_attr(not(feature = "scene-editing"), allow(dead_code))]
pub(crate) fn set_membership(
    binding: DenseBindingMut<'_>,
    requested: Vec<usize>,
    owner: usize,
    poses: &[Pose],
) -> Result<(), AppError> {
    validate(binding.as_ref(), poses)?;
    if owner >= poses.len()
        || requested.len() > 128
        || requested
            .iter()
            .enumerate()
            .any(|(i, b)| *b >= poses.len() || requested[..i].contains(b))
    {
        return Err(invalid("Choose distinct existing binding bones."));
    }
    if *binding.weighted && requested == *binding.bones {
        return Ok(());
    }
    if !*binding.weighted && requested.is_empty() {
        return Ok(());
    }
    let points = world_vertices(binding.as_ref(), poses);
    let weighted = !requested.is_empty();
    let bones = if weighted { requested } else { vec![owner] };
    let removed = *binding.weighted && binding.bones.iter().any(|b| !bones.contains(b));
    let mut rows = Vec::with_capacity(points.len());
    for (old, point) in binding.vertices.iter().zip(points) {
        let mut row = Vertex {
            weights: vec![0.; bones.len()],
            positions: vec![0.; bones.len() * 2],
        };
        for (i, bone) in bones.iter().enumerate() {
            if weighted && *binding.weighted {
                if let Some(previous) = binding.bones.iter().position(|b| b == bone) {
                    row.weights[i] = old.weights[previous];
                    row.positions[i * 2..i * 2 + 2]
                        .copy_from_slice(&old.positions[previous * 2..previous * 2 + 2]);
                    continue;
                }
            }
            let (x, y) = local(poses[*bone], point[0], point[1])?;
            row.positions[i * 2] = x;
            row.positions[i * 2 + 1] = y;
        }
        if !weighted || !*binding.weighted {
            row.weights[0] = 1.;
        } else if removed {
            normalize_row(&mut row.weights);
        }
        rows.push(row);
    }
    validate(
        DenseBindingRef {
            weighted,
            bones: &bones,
            vertices: &rows,
        },
        poses,
    )?;
    *binding.weighted = weighted;
    *binding.bones = bones;
    *binding.vertices = rows;
    Ok(())
}

pub(crate) fn set_weight(
    binding: DenseBindingMut<'_>,
    vertex: usize,
    bone: usize,
    value: f32,
    poses: &[Pose],
    policy: PositionPolicy,
) -> Result<(), AppError> {
    validate(binding.as_ref(), poses)?;
    if vertex >= binding.vertices.len() || !value.is_finite() || !(0.0..=1.0).contains(&value) {
        return Err(invalid(
            "Choose a bound vertex and a weight between 0 and 1.",
        ));
    }
    let index = binding
        .bones
        .iter()
        .position(|b| *b == bone)
        .ok_or_else(|| invalid("Bind this bone first."))?;
    let previous = &binding.vertices[vertex];
    let other: f64 = previous
        .weights
        .iter()
        .enumerate()
        .filter(|(i, _)| *i != index)
        .map(|(_, w)| f64::from(*w))
        .sum();
    // Proven original Direct boundary: a sole 100% influence cannot decrease.
    if previous.weights.len() == 1 || other == 0. {
        return Ok(());
    }
    let mut row = previous.clone();
    for (i, w) in row.weights.iter_mut().enumerate() {
        *w = if i == index {
            value
        } else {
            (f64::from(previous.weights[i]) / other * f64::from(1. - value)) as f32
        };
    }
    normalize_row(&mut row.weights);
    if matches!(policy, PositionPolicy::LegacyInitializeDormant) {
        let point = world_vertex(previous, binding.bones, poses);
        for (i, bone) in binding.bones.iter().enumerate() {
            if row.weights[i] == 0. {
                row.positions[i * 2] = 0.;
                row.positions[i * 2 + 1] = 0.;
            } else if previous.weights[i] == 0. {
                let (x, y) = local(poses[*bone], point[0], point[1])?;
                row.positions[i * 2] = x;
                row.positions[i * 2 + 1] = y;
            }
        }
    }
    binding.vertices[vertex] = row;
    Ok(())
}

#[cfg(feature = "scene-editing")]
fn lock_mask(binding: DenseBindingRef<'_>, locked_bones: &[usize]) -> Result<Vec<bool>, AppError> {
    let mut mask = vec![false; binding.bones.len()];
    for bone in locked_bones {
        let column = binding
            .bones
            .iter()
            .position(|b| b == bone)
            .ok_or_else(|| invalid("Lock only existing bound influences."))?;
        if mask[column] {
            return Err(invalid("A lock list cannot contain duplicate influences."));
        }
        mask[column] = true;
    }
    Ok(mask)
}

#[cfg(feature = "scene-editing")]
fn correct_unlocked(
    weights: &mut [f32],
    locked: &[bool],
    target: Option<usize>,
) -> Result<(), AppError> {
    let largest = weights
        .iter()
        .enumerate()
        .filter(|(i, w)| !locked[*i] && Some(*i) != target && **w > 0.)
        .max_by(|a, b| a.1.total_cmp(b.1))
        .map(|(i, _)| i);
    if let Some(i) = largest {
        let residual = 1. - weights.iter().sum::<f32>();
        weights[i] += residual.clamp(-weights[i], 1. - weights[i]);
    }
    if weights.iter().any(|w| !w.is_finite() || *w < 0.)
        || (weights.iter().sum::<f32>() - 1.).abs() > 0.0001
    {
        return Err(invalid(
            "Cannot normalize without changing protected weights.",
        ));
    }
    Ok(())
}

/// Explicit numeric edits override their own target lock. Other lock bits and
/// ALL binding coordinates are protected. Auto has a different target policy.
#[cfg(feature = "scene-editing")]
pub(crate) fn set_weight_locked(
    binding: DenseBindingMut<'_>,
    vertex: usize,
    bone: usize,
    value: f32,
    poses: &[Pose],
    locked_bones: &[usize],
) -> Result<(), AppError> {
    if locked_bones.is_empty() {
        return set_weight(
            binding,
            vertex,
            bone,
            value,
            poses,
            PositionPolicy::PreserveAll,
        );
    }
    validate(binding.as_ref(), poses)?;
    if vertex >= binding.vertices.len() || !value.is_finite() || !(0.0..=1.0).contains(&value) {
        return Err(invalid(
            "Choose a bound vertex and a weight between 0 and 1.",
        ));
    }
    let index = binding
        .bones
        .iter()
        .position(|b| *b == bone)
        .ok_or_else(|| invalid("Bind this bone first."))?;
    let mut locked = lock_mask(binding.as_ref(), locked_bones)?;
    locked[index] = false;
    if !locked.iter().any(|v| *v) {
        return set_weight(
            binding,
            vertex,
            bone,
            value,
            poses,
            PositionPolicy::PreserveAll,
        );
    }
    let previous = &binding.vertices[vertex];
    let other: f64 = previous
        .weights
        .iter()
        .enumerate()
        .filter(|(i, _)| *i != index && !locked[*i])
        .map(|(_, w)| f64::from(*w))
        .sum();
    // Proven partial-mass no-recipient case includes legitimate negative zero.
    if other == 0. {
        return Ok(());
    }
    let protected: f32 = previous
        .weights
        .iter()
        .zip(&locked)
        .filter(|(_, locked)| **locked)
        .map(|(w, _)| *w)
        .sum();
    let available = (1. - protected).max(0.);
    let wanted = value.min(available);
    if wanted.to_bits() == previous.weights[index].to_bits() {
        return Ok(());
    }
    let remainder = (available - wanted).max(0.);
    let mut row = previous.clone();
    for (i, w) in row.weights.iter_mut().enumerate() {
        if i == index {
            *w = wanted;
        } else if !locked[i] {
            *w = (f64::from(previous.weights[i]) / other * f64::from(remainder)) as f32;
        }
    }
    correct_unlocked(&mut row.weights, &locked, Some(index))?;
    binding.vertices[vertex] = row;
    Ok(())
}

/// FBones extension: normalize existing unlocked positive weights into the
/// mass left by ALL locks. No original Normalize button or parity is claimed.
#[cfg(feature = "scene-editing")]
pub(crate) fn normalize_locked(
    binding: DenseBindingMut<'_>,
    poses: &[Pose],
    locked_bones: &[usize],
) -> Result<(), AppError> {
    if locked_bones.is_empty() {
        normalize(binding);
        return Ok(());
    }
    validate(binding.as_ref(), poses)?;
    let locked = lock_mask(binding.as_ref(), locked_bones)?;
    if locked.iter().all(|v| *v) {
        return Ok(());
    }
    let mut rows = binding.vertices.clone();
    for row in &mut rows {
        let recipients: f64 = row
            .weights
            .iter()
            .zip(&locked)
            .filter(|(_, locked)| !**locked)
            .map(|(w, _)| f64::from(*w))
            .sum();
        if recipients == 0. {
            continue;
        }
        let protected: f32 = row
            .weights
            .iter()
            .zip(&locked)
            .filter(|(_, locked)| **locked)
            .map(|(w, _)| *w)
            .sum();
        let available = (1. - protected).max(0.);
        for (i, w) in row.weights.iter_mut().enumerate() {
            if !locked[i] {
                *w = (f64::from(*w) / recipients * f64::from(available)) as f32;
            }
        }
        correct_unlocked(&mut row.weights, &locked, None)?;
    }
    *binding.vertices = rows;
    Ok(())
}

pub(crate) fn world_vertex(row: &Vertex, bones: &[usize], poses: &[Pose]) -> [f32; 2] {
    let mut point = [0.0; 2];
    for (i, w) in row.weights.iter().enumerate() {
        if *w == 0.0 {
            continue;
        }
        let p = poses[bones[i]].point(row.positions[i * 2], row.positions[i * 2 + 1]);
        point[0] += p.0 * w;
        point[1] += p.1 * w;
    }
    point
}

/// Independent FBones new-row policy; original insertion arithmetic is unknown.
/// Preserve the weighted local field for positive columns and the plain local
/// field for dormant columns. Never interpret an existing origin as missing.
pub(crate) fn interpolate_vertex(
    binding: DenseBindingRef<'_>,
    sources: &[(usize, f64)],
    poses: &[Pose],
) -> Result<Vertex, AppError> {
    validate(binding, poses)?;
    if sources.is_empty()
        || sources.len() > 3
        || sources.iter().enumerate().any(|(i, (row, b))| {
            *row >= binding.vertices.len()
                || !b.is_finite()
                || *b < -1e-8
                || sources[..i].iter().any(|(old, _)| old == row)
        })
    {
        return Err(invalid("Choose a finite face or edge interpolation."));
    }
    let sum: f64 = sources.iter().map(|(_, b)| b.max(0.)).sum();
    if !sum.is_finite() || sum <= 0. {
        return Err(invalid("An interpolation needs positive support."));
    }
    let coefficients = sources
        .iter()
        .map(|(row, b)| (*row, b.max(0.) / sum))
        .collect::<Vec<_>>();
    let mut row = Vertex {
        weights: vec![0.; binding.bones.len()],
        positions: vec![0.; binding.bones.len() * 2],
    };
    for column in 0..binding.bones.len() {
        let weight: f64 = coefficients
            .iter()
            .map(|(i, b)| *b * f64::from(binding.vertices[*i].weights[column]))
            .sum();
        row.weights[column] = weight as f32;
        for axis in 0..2 {
            let local = column * 2 + axis;
            row.positions[local] = if row.weights[column] > 0. {
                (coefficients
                    .iter()
                    .map(|(i, b)| {
                        *b * f64::from(binding.vertices[*i].weights[column])
                            * f64::from(binding.vertices[*i].positions[local])
                    })
                    .sum::<f64>()
                    / weight) as f32
            } else {
                coefficients
                    .iter()
                    .map(|(i, b)| *b * f64::from(binding.vertices[*i].positions[local]))
                    .sum::<f64>() as f32
            };
        }
    }
    normalize_row(&mut row.weights);
    if row.positions.iter().any(|p| !p.is_finite()) {
        return Err(invalid(
            "Interpolated binding positions must remain finite.",
        ));
    }
    Ok(row)
}

/// Place only a newly created row. Outside/off-edge extension translates every
/// local field by an inverse VECTOR; supported interpolation corrects rounding
/// on positive columns only. All required inverses succeed before assignment.
pub(crate) fn position_new_vertex(
    row: &mut Vertex,
    bones: &[usize],
    point: [f32; 2],
    poses: &[Pose],
    all_columns: bool,
) -> Result<(), AppError> {
    validate(
        DenseBindingRef {
            weighted: true,
            bones,
            vertices: std::slice::from_ref(row),
        },
        poses,
    )?;
    if point.iter().any(|p| !p.is_finite() || p.abs() > 1_000_000.) {
        return Err(invalid("Use finite bounded new vertex coordinates."));
    }
    let current = world_vertex(row, bones, poses);
    if current.iter().any(|p| !p.is_finite()) {
        return Err(invalid("The new binding point must be finite."));
    }
    if current == point {
        return Ok(());
    }
    let sum: f32 = row.weights.iter().sum();
    let delta = [(point[0] - current[0]) / sum, (point[1] - current[1]) / sum];
    let mut positions = row.positions.clone();
    for (i, bone) in bones.iter().enumerate() {
        if all_columns || row.weights[i] > 0. {
            let inverse = poses[*bone].inverse()?;
            positions[i * 2] += inverse.a * delta[0] + inverse.c * delta[1];
            positions[i * 2 + 1] += inverse.b * delta[0] + inverse.d * delta[1];
        }
    }
    if positions.iter().any(|p| !p.is_finite()) {
        return Err(invalid("The extended local field must be finite."));
    }
    row.positions = positions;
    Ok(())
}
pub(crate) fn move_vertex(
    row: &mut Vertex,
    bones: &[usize],
    current: [f32; 2],
    point: [f32; 2],
    poses: &[Pose],
) -> Result<(), AppError> {
    let invalid = || {
        AppError::new(
            "InvalidBinding",
            "Use finite bounded points and nonsingular binding bones.",
        )
    };
    if point
        .iter()
        .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
        || row.weights.len() != bones.len()
        || row.positions.len() != bones.len() * 2
    {
        return Err(invalid());
    }
    let sum: f32 = row.weights.iter().sum();
    if !sum.is_finite() || sum <= 0.0 {
        return Err(invalid());
    }
    let delta = [(point[0] - current[0]) / sum, (point[1] - current[1]) / sum];
    let mut positions = row.positions.clone();
    for (i, bone) in bones.iter().enumerate() {
        if row.weights[i] > 0.0 {
            let p = poses.get(*bone).ok_or_else(invalid)?.inverse()?;
            positions[i * 2] += p.a * delta[0] + p.c * delta[1];
            positions[i * 2 + 1] += p.b * delta[0] + p.d * delta[1];
        }
    }
    if positions.iter().any(|v| !v.is_finite()) {
        return Err(invalid());
    }
    row.positions = positions;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn poses() -> Vec<Pose> {
        vec![
            Pose {
                x: 0.,
                y: 0.,
                a: 1.,
                b: 0.,
                c: 0.,
                d: 1.,
                angle: 0.,
            },
            Pose {
                x: 35.,
                y: 18.,
                a: 1.2,
                b: 0.3,
                c: -0.4,
                d: 0.7,
                angle: 14.,
            },
            Pose {
                x: -20.,
                y: 8.,
                a: -0.8,
                b: 0.2,
                c: 0.3,
                d: 1.4,
                angle: 160.,
            },
        ]
    }
    #[cfg(feature = "scene-editing")]
    #[test]
    fn manual_locks_follow_five_direct_contracts_and_keep_every_binding_position_bit() {
        let poses = vec![crate::rig::zero(); 4];
        for (weights, target, value, locks, expected) in [
            (
                vec![0.4, 0.3, 0.2, 0.1],
                1,
                0.5,
                vec![0],
                vec![0.4, 0.5, 1. / 15., 1. / 30.],
            ),
            (
                vec![0.4, 0.3, 0.2, 0.1],
                1,
                0.9,
                vec![0],
                vec![0.4, 0.6, 0., 0.],
            ),
            (
                vec![0.4, 0.6, -0., 0.],
                1,
                0.5,
                vec![0],
                vec![0.4, 0.6, -0., 0.],
            ),
            (
                vec![0.4, 0.3, 0.2, 0.1],
                1,
                0.5,
                vec![1],
                vec![2. / 7., 0.5, 1. / 7., 1. / 14.],
            ),
            (
                vec![0.6, 0., 0., 0.4],
                2,
                0.2,
                vec![0],
                vec![0.6, 0., 0.2, 0.2],
            ),
        ] {
            let mut weighted = true;
            let mut bound = vec![0, 1, 2, 3];
            let mut rows = vec![Vertex {
                weights,
                positions: vec![-0., 1., 2., 3., 4., 5., 6., -0.],
            }];
            let before = rows.clone();
            set_weight_locked(
                binding(&mut weighted, &mut bound, &mut rows),
                0,
                target,
                value,
                &poses,
                &locks,
            )
            .unwrap();
            for (actual, expected) in rows[0].weights.iter().zip(expected) {
                assert!((*actual - expected).abs() < 1e-6);
            }
            for locked in locks {
                if locked != target {
                    assert_eq!(
                        rows[0].weights[locked].to_bits(),
                        before[0].weights[locked].to_bits()
                    );
                }
            }
            assert_eq!(bits(&rows), bits(&before));
            if before[0].weights == [0.4, 0.6, -0., 0.] {
                assert_eq!(
                    rows[0]
                        .weights
                        .iter()
                        .map(|w| w.to_bits())
                        .collect::<Vec<_>>(),
                    before[0]
                        .weights
                        .iter()
                        .map(|w| w.to_bits())
                        .collect::<Vec<_>>()
                );
            }
        }
    }
    #[cfg(feature = "scene-editing")]
    #[test]
    fn empty_locks_and_only_target_lock_reuse_unchanged_numeric_path() {
        let poses = vec![crate::rig::zero(); 4];
        for locks in [vec![], vec![1]] {
            let mut weighted = true;
            let mut bound = vec![0, 1, 2, 3];
            let original = vec![Vertex {
                weights: vec![0.4, 0.3, 0.2, 0.1],
                positions: vec![0.; 8],
            }];
            let mut expected = original.clone();
            let mut actual = original;
            set_weight(
                binding(&mut weighted, &mut bound, &mut expected),
                0,
                1,
                0.63,
                &poses,
                PositionPolicy::PreserveAll,
            )
            .unwrap();
            set_weight_locked(
                binding(&mut weighted, &mut bound, &mut actual),
                0,
                1,
                0.63,
                &poses,
                &locks,
            )
            .unwrap();
            assert_eq!(
                actual[0]
                    .weights
                    .iter()
                    .map(|w| w.to_bits())
                    .collect::<Vec<_>>(),
                expected[0]
                    .weights
                    .iter()
                    .map(|w| w.to_bits())
                    .collect::<Vec<_>>()
            );
        }
    }
    #[cfg(feature = "scene-editing")]
    #[test]
    fn locked_normalize_own_policy_protects_all_locks_and_invalid_lists_are_atomic() {
        let poses = vec![crate::rig::zero(); 4];
        let mut weighted = true;
        let mut bound = vec![0, 1, 2, 3];
        let source = vec![
            Vertex {
                weights: vec![0.4, 0.3, 0.2, 0.10003],
                positions: vec![-0.; 8],
            },
            Vertex {
                weights: vec![1., -0., 0., 0.],
                positions: vec![0.; 8],
            },
        ];
        let mut rows = source.clone();
        normalize_locked(binding(&mut weighted, &mut bound, &mut rows), &poses, &[0]).unwrap();
        for (before, after) in source.iter().zip(&rows) {
            assert_eq!(before.weights[0].to_bits(), after.weights[0].to_bits());
            assert!((after.weights.iter().sum::<f32>() - 1.).abs() < 1e-6);
        }
        assert_eq!(bits(&rows), bits(&source));
        assert_eq!(rows[1].weights[1].to_bits(), (-0f32).to_bits());
        let before = rows.clone();
        normalize_locked(
            binding(&mut weighted, &mut bound, &mut rows),
            &poses,
            &[3, 2, 1, 0],
        )
        .unwrap();
        assert_eq!(rows, before);
        for locks in [&[0, 0][..], &[99][..]] {
            assert!(set_weight_locked(
                binding(&mut weighted, &mut bound, &mut rows),
                0,
                1,
                0.5,
                &poses,
                locks
            )
            .is_err());
            assert_eq!(rows, before);
            assert!(
                normalize_locked(binding(&mut weighted, &mut bound, &mut rows), &poses, locks)
                    .is_err()
            );
            assert_eq!(rows, before);
        }
    }
    fn rigid() -> (bool, Vec<usize>, Vec<Vertex>) {
        (
            false,
            vec![0],
            vec![
                Vertex {
                    weights: vec![1.],
                    positions: vec![0., 0.],
                },
                Vertex {
                    weights: vec![1.],
                    positions: vec![80., -5.],
                },
                Vertex {
                    weights: vec![1.],
                    positions: vec![-10., 65.],
                },
            ],
        )
    }
    fn binding<'a>(
        weighted: &'a mut bool,
        bones: &'a mut Vec<usize>,
        vertices: &'a mut Vec<Vertex>,
    ) -> DenseBindingMut<'a> {
        DenseBindingMut {
            weighted,
            bones,
            vertices,
        }
    }
    fn bits(rows: &[Vertex]) -> Vec<u32> {
        rows.iter()
            .flat_map(|r| r.positions.iter().map(|p| p.to_bits()))
            .collect()
    }
    fn same(a: &[[f32; 2]], b: &[[f32; 2]]) {
        assert_eq!(a.len(), b.len());
        for (a, b) in a.iter().zip(b) {
            assert!((a[0] - b[0]).abs() < 0.0001);
            assert!((a[1] - b[1]).abs() < 0.0001);
        }
    }
    #[test]
    fn membership_first_bind_initializes_dormant_affine_coordinates_without_auto() {
        let (mut weighted, mut bones, mut rows) = rigid();
        let poses = poses();
        let original = world_vertices(
            binding(&mut weighted, &mut bones, &mut rows).as_ref(),
            &poses,
        );
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![1, 0, 2],
            0,
            &poses,
        )
        .unwrap();
        assert!(weighted);
        assert_eq!(bones, [1, 0, 2]);
        assert!(rows.iter().all(|r| r.weights == [1., 0., 0.]));
        same(
            &original,
            &world_vertices(
                binding(&mut weighted, &mut bones, &mut rows).as_ref(),
                &poses,
            ),
        );
        for (row, p) in rows.iter().zip(original) {
            for (i, bone) in bones.iter().enumerate() {
                let q = poses[*bone].point(row.positions[2 * i], row.positions[2 * i + 1]);
                same(&[p], &[[q.0, q.1]]);
            }
        }
    }
    #[test]
    fn membership_retains_offsets_and_weight_bits_when_reordering_and_adding() {
        let (mut weighted, mut bones, mut rows) = rigid();
        let poses = poses();
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![0, 1],
            0,
            &poses,
        )
        .unwrap();
        rows[0].weights = vec![0.25, 0.75];
        rows[0].positions = vec![-0.0, 2., 3., -4.];
        let original = rows.clone();
        let points = world_vertices(
            binding(&mut weighted, &mut bones, &mut rows).as_ref(),
            &poses,
        );
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![1, 0, 2],
            0,
            &poses,
        )
        .unwrap();
        for (old, new) in original.iter().zip(&rows) {
            assert_eq!(new.weights, [old.weights[1], old.weights[0], 0.]);
            assert_eq!(
                new.positions[..2]
                    .iter()
                    .map(|x| x.to_bits())
                    .collect::<Vec<_>>(),
                old.positions[2..4]
                    .iter()
                    .map(|x| x.to_bits())
                    .collect::<Vec<_>>()
            );
            assert_eq!(
                new.positions[2..4]
                    .iter()
                    .map(|x| x.to_bits())
                    .collect::<Vec<_>>(),
                old.positions[..2]
                    .iter()
                    .map(|x| x.to_bits())
                    .collect::<Vec<_>>()
            );
        }
        same(
            &points,
            &world_vertices(
                binding(&mut weighted, &mut bones, &mut rows).as_ref(),
                &poses,
            ),
        );
    }
    #[test]
    fn membership_removal_keeps_retained_bindings_and_explicit_zero_mass_fallback() {
        let (mut weighted, mut bones, mut rows) = rigid();
        let poses = poses();
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![0, 1, 2],
            0,
            &poses,
        )
        .unwrap();
        let before = rows.clone();
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![2, 1],
            0,
            &poses,
        )
        .unwrap();
        assert!(rows.iter().all(|r| r.weights == [1., 0.]));
        for (a, b) in before.iter().zip(&rows) {
            assert_eq!(b.positions[..2], a.positions[4..6]);
            assert_eq!(b.positions[2..4], a.positions[2..4]);
        }
    }
    #[test]
    fn unbind_to_reflected_affine_owner_preserves_current_posed_world_shape() {
        let (mut weighted, mut bones, mut rows) = rigid();
        let mut poses = poses();
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![1, 0],
            0,
            &poses,
        )
        .unwrap();
        poses[1].x += 25.;
        poses[1].c -= 0.25;
        let points = world_vertices(
            binding(&mut weighted, &mut bones, &mut rows).as_ref(),
            &poses,
        );
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![],
            2,
            &poses,
        )
        .unwrap();
        assert!(!weighted);
        assert_eq!(bones, [2]);
        same(
            &points,
            &world_vertices(
                binding(&mut weighted, &mut bones, &mut rows).as_ref(),
                &poses,
            ),
        );
    }
    #[test]
    fn invalid_membership_and_singular_new_column_are_atomic_even_when_zero_weight() {
        let (mut weighted, mut bones, mut rows) = rigid();
        let mut poses = poses();
        poses[2].a = 0.;
        poses[2].b = 0.;
        let before = (weighted, bones.clone(), rows.clone());
        for requested in [vec![0, 0], vec![999], vec![0, 2]] {
            assert!(set_membership(
                binding(&mut weighted, &mut bones, &mut rows),
                requested,
                0,
                &poses
            )
            .is_err());
            assert_eq!((weighted, bones.clone(), rows.clone()), before);
        }
    }
    #[test]
    fn sole_full_influence_cannot_be_reduced_in_typed_or_legacy_policy() {
        for policy in [
            PositionPolicy::PreserveAll,
            PositionPolicy::LegacyInitializeDormant,
        ] {
            let (mut weighted, mut bones, mut rows) = rigid();
            let poses = poses();
            set_membership(
                binding(&mut weighted, &mut bones, &mut rows),
                vec![0, 1],
                0,
                &poses,
            )
            .unwrap();
            let before = rows.clone();
            set_weight(
                binding(&mut weighted, &mut bones, &mut rows),
                0,
                0,
                0.5,
                &poses,
                policy,
            )
            .unwrap();
            assert_eq!(rows, before);
            assert_eq!(bits(&rows), bits(&before));
        }
    }
    #[test]
    fn typed_newly_positive_and_newly_zero_keep_all_dormant_position_bits_and_move_pose() {
        let (mut weighted, mut bones, mut rows) = rigid();
        let mut poses = poses();
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![0, 1],
            0,
            &poses,
        )
        .unwrap();
        rows[0].positions = vec![-0.0, 0., 0., 0.];
        let positions = bits(&rows);
        poses[1].x = 50.;
        let before = world_vertex(&rows[0], &bones, &poses);
        set_weight(
            binding(&mut weighted, &mut bones, &mut rows),
            0,
            1,
            0.4,
            &poses,
            PositionPolicy::PreserveAll,
        )
        .unwrap();
        assert_eq!(bits(&rows), positions);
        assert_eq!(rows[0].weights, [0.6, 0.4]);
        let after = world_vertex(&rows[0], &bones, &poses);
        assert!((after[0] - before[0]).abs() > 10.);
        set_weight(
            binding(&mut weighted, &mut bones, &mut rows),
            0,
            1,
            0.,
            &poses,
            PositionPolicy::PreserveAll,
        )
        .unwrap();
        assert_eq!(bits(&rows), positions);
        assert_eq!(rows[0].weights, [1., 0.]);
    }
    #[test]
    fn normalize_preserves_all_binding_offsets_and_untouched_rows_exactly() {
        let (mut weighted, mut bones, mut rows) = rigid();
        let poses = poses();
        set_membership(
            binding(&mut weighted, &mut bones, &mut rows),
            vec![0, 1],
            0,
            &poses,
        )
        .unwrap();
        rows[0].weights = vec![0.4, 0.60003];
        rows[0].positions[0] = -0.0;
        let positions = bits(&rows);
        let other = rows[1..].to_vec();
        normalize(binding(&mut weighted, &mut bones, &mut rows));
        assert_eq!(bits(&rows), positions);
        assert_eq!(&rows[1..], other);
        assert!((rows[0].weights.iter().sum::<f32>() - 1.).abs() < 1e-6);
    }
}
