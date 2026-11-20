//! Shared dense binding arithmetic for image meshes and clipping polygons.
//! Geometry type and image resources play no part in a binding-row translation.
#[cfg(feature = "scene-editing")]
use crate::rig::PasteWeightRow;
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

/// Remove positive editable influences while retaining the dense binding layout.
#[cfg(feature = "scene-editing")]
pub(crate) fn prune_weights(
    binding: DenseBindingMut<'_>,
    poses: &[Pose],
    locked_bones: &[usize],
    max_influences: usize,
    threshold: f32,
) -> Result<usize, AppError> {
    let source = binding.as_ref();
    validate(source, poses)?;
    if !source.weighted || !(1..=128).contains(&max_influences) || !(0.0..=1.0).contains(&threshold) {
        return Err(invalid(
            "Choose a weighted attachment, an influence limit from 1 to 128, and a weight threshold from 0 to 1.",
        ));
    }
    let locked = lock_mask(source, locked_bones)?;
    let cap_conflict = || invalid("Increase the influence limit or unlock weights before pruning.");
    let mut ranked = Vec::with_capacity(source.bones.len());
    let mut changes = Vec::new();
    let mut removed = 0;

    for (vertex, row) in source.vertices.iter().enumerate() {
        ranked.clear();
        let mut protected = 0;
        let mut eligible = 0;
        for (column, (&weight, &locked)) in row.weights.iter().zip(&locked).enumerate() {
            if weight > 1.0 {
                return Err(invalid("Use weights between 0 and 1 to prune a binding."));
            }
            if weight == 0.0 {
                continue;
            }
            if locked {
                protected += 1;
            } else {
                ranked.push(column);
                eligible += usize::from(weight >= threshold);
            }
        }
        let slots = max_influences.checked_sub(protected).ok_or_else(cap_conflict)?;
        if ranked.is_empty() {
            continue;
        }
        if slots == 0 {
            return Err(cap_conflict());
        }
        let keep = eligible.min(slots).max(1);
        if keep == ranked.len() {
            continue;
        }

        let editable_mass: f64 = ranked.iter().map(|&i| f64::from(row.weights[i])).sum();
        ranked.sort_unstable_by(|&a, &b| {
            row.weights[b]
                .total_cmp(&row.weights[a])
                .then_with(|| a.cmp(&b))
        });
        let (survivors, pruned) = ranked.split_at(keep);
        let retained_mass: f64 = survivors.iter().map(|&i| f64::from(row.weights[i])).sum();
        let scale = editable_mass / retained_mass;
        let mut weights = row.weights.clone();
        for &i in pruned {
            weights[i] = 0.0;
        }
        // Near-unit input mass can put an ideal proportional result above one.
        for &i in survivors {
            weights[i] = (f64::from(row.weights[i]) * scale).min(1.0) as f32;
        }

        // The codec uses an ordered f32 sum. Correct boundary roundoff on a
        // surviving lane while retaining the original mass as closely as possible.
        let sum: f32 = weights.iter().sum();
        if (sum - 1.0).abs() > 0.0001 {
            let old_sum: f32 = row.weights.iter().sum();
            let strongest = survivors[0];
            weights[strongest] =
                (weights[strongest] + (old_sum - sum)).clamp(row.weights[strongest], 1.0);
            if (weights.iter().sum::<f32>() - 1.0).abs() > 0.0001 {
                return Err(invalid("Pruning would exceed the stored weight row tolerance."));
            }
        }
        removed += pruned.len();
        changes.push((vertex, weights));
    }

    for (vertex, weights) in changes {
        binding.vertices[vertex].weights = weights;
    }
    Ok(removed)
}

/// Exchange two weight columns without moving their authored binding positions.
#[cfg(feature = "scene-editing")]
pub(crate) fn swap_weights(
    binding: DenseBindingMut<'_>,
    bones: [usize; 2],
    poses: &[Pose],
    locked_bones: &[usize],
) -> Result<(), AppError> {
    let source = binding.as_ref();
    validate(source, poses)?;
    if !source.weighted || bones[0] == bones[1] {
        return Err(invalid("Choose two distinct bound influences to swap."));
    }
    let column = |bone| {
        source
            .bones
            .iter()
            .position(|&bound| bound == bone)
            .ok_or_else(|| invalid("Choose two distinct bound influences to swap."))
    };
    let (first, second) = (column(bones[0])?, column(bones[1])?);
    let locked = lock_mask(source, locked_bones)?;
    if locked[first] || locked[second] {
        return Err(invalid("Unlock both influences before swapping their weights."));
    }

    // A permutation can change the rounding of f32 sums near the storage
    // tolerance. Reject it before mutation instead of changing any weight bits.
    for row in source.vertices {
        let sum: f32 = row
            .weights
            .iter()
            .enumerate()
            .map(|(i, &weight)| {
                if i == first {
                    row.weights[second]
                } else if i == second {
                    row.weights[first]
                } else {
                    weight
                }
            })
            .sum();
        if (sum - 1.0).abs() > 0.0001 {
            return Err(invalid("Swapping would exceed the stored weight row tolerance."));
        }
    }
    for row in binding.vertices {
        row.weights.swap(first, second);
    }
    Ok(())
}

/// Paste exact weight words into a binding with the same bone membership.
#[cfg(feature = "scene-editing")]
pub(crate) fn paste_weights(
    binding: DenseBindingMut<'_>,
    poses: &[Pose],
    source_bones: &[usize],
    rows: &[PasteWeightRow],
    locked_bones: &[usize],
) -> Result<(), AppError> {
    let target = binding.as_ref();
    validate(target, poses)?;
    let different_bones = || invalid("Paste weights onto the same set of binding bones.");
    if !target.weighted || source_bones.len() != target.bones.len() {
        return Err(different_bones());
    }
    // Matching every distinct target bone at equal width also rejects duplicates.
    let columns = target
        .bones
        .iter()
        .map(|bone| {
            source_bones
                .iter()
                .position(|source| source == bone)
                .ok_or_else(different_bones)
        })
        .collect::<Result<Vec<_>, _>>()?;
    let locked = lock_mask(target, locked_bones)?;
    let bad_rows = || invalid("Choose distinct existing destination vertices for pasted weights.");
    if rows.is_empty() || rows.len() > target.vertices.len() {
        return Err(bad_rows());
    }
    let mut seen = vec![false; target.vertices.len()];
    let mut replacements = Vec::with_capacity(rows.len());
    for row in rows {
        let entry = seen.get_mut(row.vertex).ok_or_else(bad_rows)?;
        if *entry {
            return Err(bad_rows());
        }
        *entry = true;
        if row.weight_bits.len() != columns.len() {
            return Err(invalid("Paste one weight for each bound bone."));
        }
        let weights: Vec<_> = columns
            .iter()
            .map(|&column| f32::from_bits(row.weight_bits[column]))
            .collect();
        if weights.iter().any(|w| !(0.0..=1.0).contains(w))
            || (weights.iter().sum::<f32>() - 1.0).abs() > 0.0001
        {
            return Err(invalid("Paste valid normalized weights in the target binding order."));
        }
        if weights
            .iter()
            .zip(&target.vertices[row.vertex].weights)
            .zip(&locked)
            .any(|((new, old), &locked)| locked && new.to_bits() != old.to_bits())
        {
            return Err(invalid("Pasted weights would change a locked influence."));
        }
        replacements.push((row.vertex, weights));
    }
    for (vertex, weights) in replacements {
        binding.vertices[vertex].weights = weights;
    }
    Ok(())
}

/// Rebind each dense row to its current point under the supplied frozen poses.
#[cfg(feature = "scene-editing")]
pub(crate) fn update_bindings(binding: DenseBindingMut<'_>, poses: &[Pose]) -> Result<(), AppError> {
    let source = binding.as_ref();
    validate(source, poses)?;
    if !source.weighted {
        return Err(invalid("Choose a weighted attachment to update its bindings."));
    }
    let mut transforms = Vec::with_capacity(source.bones.len());
    for &bone in source.bones {
        let pose = poses[bone];
        let inverse = pose.inverse()?;
        if [pose.x, pose.y, inverse.a, inverse.b, inverse.c, inverse.d]
            .iter()
            .any(|v| !v.is_finite())
        {
            return Err(invalid("Binding transforms must have finite inverses."));
        }
        transforms.push((pose, inverse));
    }

    let points_agree = |first: [f64; 2], second: [f64; 2], rounding_steps: f64| {
        first.into_iter().zip(second).all(|(a, b)| {
            let scale = a.abs().max(b.abs()).max(1.0);
            a.is_finite()
                && b.is_finite()
                && (a - b).abs() <= rounding_steps * f64::from(f32::EPSILON) * scale
        })
    };
    // The viewport projects and blends the stored inputs as doubles.
    let rendered_row = |row: &Vertex| {
        let mut first = None;
        let mut coherent = true;
        let mut displayed = [0.0; 2];
        for ((pair, &weight), (pose, _)) in row
            .positions
            .chunks_exact(2)
            .zip(&row.weights)
            .zip(&transforms)
        {
            let x = f64::from(pair[0]);
            let y = f64::from(pair[1]);
            let point = [
                f64::from(pose.x) + f64::from(pose.a) * x + f64::from(pose.c) * y,
                f64::from(pose.y) + f64::from(pose.b) * x + f64::from(pose.d) * y,
            ];
            // Allow for the stored local coordinates and inverse coefficients.
            coherent &= points_agree(*first.get_or_insert(point), point, 8.0);
            if weight != 0.0 {
                displayed[0] += point[0] * f64::from(weight);
                displayed[1] += point[1] * f64::from(weight);
            }
        }
        (displayed, coherent)
    };

    let mut rows = source.vertices.to_vec();
    for (old, row) in source.vertices.iter().zip(&mut rows) {
        let before = world_vertex(old, source.bones, poses);
        if before.iter().any(|v| !v.is_finite()) {
            return Err(invalid("Current binding positions must be finite."));
        }
        let (displayed_before, coherent) = rendered_row(old);
        // Preserve co-located fields when repeated skinning introduces rounding.
        if coherent {
            continue;
        }

        // Accepted f32 rows can have a stored mass slightly different from one.
        // Dividing the evaluated point by that mass gives each lane's target.
        let mass: f64 = old.weights.iter().map(|&weight| f64::from(weight)).sum();
        let target = before.map(|value| f64::from(value) / mass);
        for (positions, (pose, inverse)) in row.positions.chunks_exact_mut(2).zip(&transforms) {
            let dx = target[0] - f64::from(pose.x);
            let dy = target[1] - f64::from(pose.y);
            positions[0] = (f64::from(inverse.a) * dx + f64::from(inverse.c) * dy) as f32;
            positions[1] = (f64::from(inverse.b) * dx + f64::from(inverse.d) * dy) as f32;
        }

        let after = world_vertex(row, source.bones, poses);
        let (displayed_after, coherent) = rendered_row(row);
        // Allow for the local/affine round trip and one f32 addition for each
        // positive influence in the ordered skin sum.
        let positive = old.weights.iter().filter(|&&weight| weight > 0.0).count();
        let rounding_steps = 4.0 + positive as f64 / 2.0;
        if !coherent
            || !points_agree(before.map(f64::from), after.map(f64::from), rounding_steps)
            || !points_agree(displayed_before, displayed_after, 4.0)
        {
            return Err(invalid("Updating these bindings would move the attachment."));
        }
    }
    *binding.vertices = rows;
    Ok(())
}

/// Smooth the selected Mesh rows using the authored hull and manual edges.
/// All averages read the same input. Only the destination's unlocked mass is
/// redistributed, and all binding coordinates stay authored as-is.
#[cfg(feature = "scene-editing")]
pub(crate) fn smooth_mesh(
    mesh: &mut fbones_format::minimal::meshes::Mesh,
    poses: &[Pose],
    vertices: Option<&[usize]>,
    locked_bones: &[usize],
) -> Result<(), AppError> {
    let binding = DenseBindingRef {
        weighted: mesh.weighted,
        bones: &mesh.bones,
        vertices: &mesh.vertices,
    };
    validate(binding, poses)?;
    if !binding.weighted || binding.bones.len() < 2 {
        return Err(invalid("Bind at least two bones before smoothing weights."));
    }
    let locked = lock_mask(binding, locked_bones)?;
    let target: Vec<usize> = if let Some(vertices) = vertices {
        if vertices.is_empty() || vertices.len() > mesh.vertices.len() {
            return Err(invalid("Choose a nonempty set of existing mesh vertices."));
        }
        let mut seen = vec![false; mesh.vertices.len()];
        for &vertex in vertices {
            let entry = seen
                .get_mut(vertex)
                .ok_or_else(|| invalid("A scoped vertex no longer exists."))?;
            if *entry {
                return Err(invalid("A vertex scope cannot contain duplicates."));
            }
            *entry = true;
        }
        vertices.to_vec()
    } else {
        (0..mesh.vertices.len()).collect()
    };
    if !(3..=mesh.vertices.len()).contains(&mesh.hull)
        || !mesh.edges.len().is_multiple_of(2)
        || mesh.edges.len() > crate::mesh::MAX_EDGE_INDICES
    {
        return Err(invalid("Use a valid mesh hull and manual edges."));
    }
    let mut neighbors = vec![Vec::new(); mesh.vertices.len()];
    let mut connect = |a: usize, b: usize| {
        neighbors[a].push(b);
        neighbors[b].push(a);
    };
    for a in 0..mesh.hull {
        connect(a, (a + 1) % mesh.hull);
    }
    for pair in mesh.edges.chunks_exact(2) {
        let (a, b) = (pair[0] as usize, pair[1] as usize);
        if a >= mesh.vertices.len() || b >= mesh.vertices.len() || a == b {
            return Err(invalid("A mesh edge references an invalid vertex."));
        }
        connect(a, b);
    }
    for row in &mut neighbors {
        row.sort_unstable();
        row.dedup();
    }
    let unlocked: Vec<_> = (0..mesh.bones.len()).filter(|&col| !locked[col]).collect();
    if unlocked.len() < 2 {
        return Ok(());
    }

    let mut rows = mesh.vertices.clone();
    let mut scores = vec![0.0; unlocked.len()];
    for vertex in target {
        let old = &mesh.vertices[vertex].weights;
        let adjacent = &neighbors[vertex];
        if adjacent.iter().all(|&neighbor| {
            unlocked
                .iter()
                .all(|&col| mesh.vertices[neighbor].weights[col] == old[col])
        }) {
            continue;
        }
        let protected: f64 = old
            .iter()
            .zip(&locked)
            .filter(|(_, locked)| **locked)
            .map(|(weight, _)| f64::from(*weight))
            .sum();
        let remaining = 1.0 - protected;
        if remaining <= 0.0 {
            continue;
        }
        for (&col, score) in unlocked.iter().zip(&mut scores) {
            *score = f64::from(old[col]);
            for &neighbor in adjacent {
                *score += f64::from(mesh.vertices[neighbor].weights[col]);
            }
        }
        // The common neighborhood divisor cancels during normalization.
        let total: f64 = scores.iter().sum();
        if total <= 0.0 {
            continue;
        }
        let next = &mut rows[vertex].weights;
        for (&col, score) in unlocked.iter().zip(&scores) {
            let weight = (score / total * remaining) as f32;
            if weight != old[col] {
                next[col] = weight;
            }
        }
        if next.as_slice() != old.as_slice() {
            correct_unlocked(next, &locked, None)?;
        }
    }
    mesh.vertices = rows;
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
