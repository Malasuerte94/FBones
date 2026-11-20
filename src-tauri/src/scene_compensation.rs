//! Constraint-free Setup translation of one authored bone and its dependents.
use super::affine_compensation::CompensatedClipping;
use super::{invalid, AppError, SceneAttachment, SceneFrame};
use crate::rig::BoneWorldAxis;
use crate::solve::{Affine, LocalPose};
use fbones_format::minimal::{meshes::Vertex, Bone};

const POSITION_LIMIT: f64 = 1_000_000.0;
const WORLD_TOLERANCE: f64 = 0.001;

#[derive(Clone, Copy)]
pub(super) enum Translation {
    WorldDelta(f64, f64),
    ParentPosition(Option<f32>, Option<f32>),
    WorldPosition { axis: BoneWorldAxis, position: f64 },
    LocalPosition { x: Option<f64>, y: Option<f64> },
}

pub(super) fn translate(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    id: u64,
    translation: Translation,
    compensate_bones: bool,
    compensate_images: bool,
) -> Result<(), AppError> {
    let armed = compensate_bones || compensate_images;
    if !armed
        && !matches!(
            translation,
            Translation::WorldPosition { .. } | Translation::LocalPosition { .. }
        )
    {
        return Err(invalid("Enable Bones or Images compensation."));
    }
    if !next.project.constraints.is_empty() {
        return Err(invalid(
            "This Setup compensation requires a scene without constraints.",
        ));
    }
    if let Translation::WorldDelta(dx, dy) = translation {
        if [dx, dy]
            .iter()
            .any(|value| !value.is_finite() || value.abs() > POSITION_LIMIT)
        {
            return Err(invalid("Use finite bounded translation for compensation."));
        }
    }
    if matches!(translation, Translation::WorldPosition { position, .. } if !position.is_finite()) {
        return Err(invalid("Use a finite world-space coordinate."));
    }
    let index = next.bone_index(id)?;
    if matches!(translation, Translation::WorldDelta(dx, dy) if (dx, dy) == (0.0, 0.0)) {
        return Ok(());
    }

    let bones = &mut next.project.rig.bones;
    let (parent, selected) = authored_frame(bones, index, LocalPose::affine);
    let singular = || invalid("Compensation needs nonsingular finite bone transforms.");
    if !parent.finite() || !selected.finite() {
        return Err(singular());
    }
    let parent_inverse = parent.inverse().map_err(|_| singular())?;
    let old = (bones[index].x, bones[index].y);
    let local_position = |dx, dy| -> Result<(f32, f32), AppError> {
        let (dx, dy) = parent_inverse.vector(dx, dy);
        Ok((
            translated_position(old.0, dx)?,
            translated_position(old.1, dy)?,
        ))
    };
    let (x, y) = match translation {
        Translation::WorldDelta(dx, dy) => local_position(dx, dy)?,
        Translation::ParentPosition(x, y) => (x.unwrap_or(old.0), y.unwrap_or(old.1)),
        // The other world axis contributes zero displacement. Both coordinates
        // are solved from the authored pose at the accepted Session revision.
        Translation::WorldPosition { axis, position } => match axis {
            BoneWorldAxis::X => local_position(position - selected.x, 0.0)?,
            BoneWorldAxis::Y => local_position(0.0, position - selected.y)?,
        },
        Translation::LocalPosition { x, y } => {
            // Exact cardinal directions belong to the Local coordinate
            // display and edit. Compensation below uses the solved basis.
            let (parent, selected) = authored_frame(bones, index, bone_axes_affine);
            position_in_bone_axes(
                parent,
                selected,
                bone_axes_affine(LocalPose::from(&bones[index])),
                old,
                [x, y],
            )?
        }
    };
    if x.to_bits() == old.0.to_bits() && y.to_bits() == old.1.to_bits() {
        return Ok(());
    }
    let bone = &mut bones[index];
    (bone.x, bone.y) = (x, y);
    before.focus.bone = id;
    next.focus.bone = id;
    if !armed {
        return Ok(());
    }
    let selected_inverse = selected.inverse().map_err(|_| singular())?;
    // A supplied zero sign can change the authored bytes without moving points.
    if (x, y) == old {
        return Ok(());
    }
    let world_delta = parent.vector(
        f64::from(x) - f64::from(old.0),
        f64::from(y) - f64::from(old.1),
    );
    let local_correction = selected_inverse.vector(-world_delta.0, -world_delta.1);
    let compensate_position = |x: f32, y: f32| -> Result<(f32, f32), AppError> {
        let next_x = translated_position(x, local_correction.0)?;
        let next_y = translated_position(y, local_correction.1)?;
        let correction = selected.vector(
            f64::from(next_x) - f64::from(x),
            f64::from(next_y) - f64::from(y),
        );
        let residual = (correction.0 + world_delta.0).hypot(correction.1 + world_delta.1);
        if !residual.is_finite() || residual > WORLD_TOLERANCE {
            return Err(invalid(
                "The stored coordinate precision cannot preserve the compensated position.",
            ));
        }
        Ok((next_x, next_y))
    };
    if compensate_bones {
        for child in bones.iter_mut().filter(|bone| bone.parent == Some(index)) {
            (child.x, child.y) = compensate_position(child.x, child.y)?;
        }
    }
    if compensate_images {
        let mut clipping = matches!(translation, Translation::LocalPosition { .. }).then(|| {
            CompensatedClipping::new(&before.project.rig.bones, bones, index, compensate_bones)
        });
        for slot in &mut next.project.slots {
            for attachment in &mut slot.attachments {
                match attachment {
                    SceneAttachment::Region(region) if slot.bone == index => {
                        (region.x, region.y) = compensate_position(region.x, region.y)?;
                    }
                    SceneAttachment::Mesh(mesh) => {
                        compensate_binding(
                            &mesh.bones,
                            &mut mesh.vertices,
                            index,
                            compensate_position,
                        )?;
                    }
                    SceneAttachment::Clipping(clip) => {
                        let changed = compensate_binding(
                            &clip.bones,
                            &mut clip.vertices,
                            index,
                            compensate_position,
                        )?;
                        if let Some(clipping) = clipping.as_mut() {
                            clipping.check(clip, changed)?;
                        }
                    }
                    SceneAttachment::Region(_) | SceneAttachment::Path(_) => {}
                }
            }
        }
    }
    Ok(())
}

fn authored_frame(
    bones: &[Bone],
    index: usize,
    local_affine: fn(LocalPose) -> Affine,
) -> (Affine, Affine) {
    let mut world = Vec::<Affine>::with_capacity(index + 1);
    for bone in &bones[..=index] {
        let parent = bone.parent.map_or(Affine::IDENTITY, |parent| world[parent]);
        world.push(parent.compose(local_affine(LocalPose::from(bone))));
    }
    let parent = bones[index]
        .parent
        .map_or(Affine::IDENTITY, |parent| world[parent]);
    (parent, world[index])
}

fn bone_axes_affine(pose: LocalPose) -> Affine {
    let (sx, cx) = bone_axis_sin_cos(pose.rotation + pose.shear_x);
    let (sy, cy) = bone_axis_sin_cos(pose.rotation + 90.0 + pose.shear_y);
    Affine {
        a: cx * pose.scale_x,
        b: sx * pose.scale_x,
        c: cy * pose.scale_y,
        d: sy * pose.scale_y,
        x: pose.x,
        y: pose.y,
    }
}

fn bone_axis_sin_cos(angle: f64) -> (f64, f64) {
    match angle % 360.0 {
        value if value == 0.0 => (0.0, 1.0),
        value if value == 90.0 || value == -270.0 => (1.0, 0.0),
        value if value == 180.0 || value == -180.0 => (0.0, -1.0),
        value if value == 270.0 || value == -90.0 => (-1.0, 0.0),
        _ => angle.to_radians().sin_cos(),
    }
}

fn position_in_bone_axes(
    parent: Affine,
    selected: Affine,
    local: Affine,
    old: (f32, f32),
    [x, y]: [Option<f64>; 2],
) -> Result<(f32, f32), AppError> {
    if (x.is_none() && y.is_none()) || [x, y].into_iter().flatten().any(|value| !value.is_finite())
    {
        return Err(invalid("Choose at least one finite bone-axis coordinate."));
    }
    let singular = || invalid("Local translation needs nonsingular finite bone axes.");
    if !parent.finite() || !selected.finite() {
        return Err(singular());
    }
    parent.inverse().map_err(|_| singular())?;
    let len_x = selected.scale_x();
    let len_y = selected.scale_y();
    let axes = Affine {
        a: selected.a / len_x,
        b: selected.b / len_x,
        c: selected.c / len_y,
        d: selected.d / len_y,
        x: 0.0,
        y: 0.0,
    };
    let axes_inverse = axes.inverse().map_err(|_| singular())?;
    let project = |x, y| {
        let (x, y) = parent.vector(x, y);
        axes_inverse.vector(x, y)
    };
    let (old_x, old_y) = (f64::from(old.0), f64::from(old.1));
    let (local_x, local_y) = project(old_x, old_y);
    let dx = x.map_or(0.0, |x| x - local_x);
    let dy = y.map_or(0.0, |y| y - local_y);
    let requested_error = dx.hypot(dy);
    if !local_x.is_finite() || !local_y.is_finite() || !requested_error.is_finite() {
        return Err(invalid(
            "The bone-axis position is outside the supported range.",
        ));
    }

    // Each local authored column contributes one normalized world direction.
    // Do not subtract scene origins, which loses low bits far from zero.
    let new = (
        translated_position(old.0, local.a / len_x * dx + local.c / len_y * dy)?,
        translated_position(old.1, local.b / len_x * dx + local.d / len_y * dy)?,
    );
    let (rx, ry) = project(f64::from(new.0) - old_x, f64::from(new.1) - old_y);
    if !rx.is_finite()
        || !ry.is_finite()
        || x.is_none() && rx.abs() > WORLD_TOLERANCE
        || y.is_none() && ry.abs() > WORLD_TOLERANCE
    {
        return Err(invalid(
            "The stored position cannot preserve the other bone axis.",
        ));
    }
    let error_x = x.map_or(0.0, |_| dx - rx);
    let error_y = y.map_or(0.0, |_| dy - ry);
    Ok(if error_x.hypot(error_y) < requested_error {
        new
    } else {
        old
    })
}

fn translated_position(value: f32, offset: f64) -> Result<f32, AppError> {
    let next = f64::from(value) + offset;
    if !next.is_finite() || next.abs() > POSITION_LIMIT {
        return Err(invalid(
            "Compensation exceeds the supported local position range.",
        ));
    }
    let next = next as f32;
    // Keep the original bits when a displacement rounds away, including signed zero.
    Ok(if next == value { value } else { next })
}

fn compensate_binding(
    bones: &[usize],
    vertices: &mut [Vertex],
    selected: usize,
    compensate_position: impl Fn(f32, f32) -> Result<(f32, f32), AppError>,
) -> Result<bool, AppError> {
    let Some(column) = bones.iter().position(|bone| *bone == selected) else {
        return Ok(false);
    };
    let mut changed = false;
    for vertex in vertices {
        if vertex.weights[column] > 0.0 {
            let pair = &mut vertex.positions[column * 2..column * 2 + 2];
            let old = (pair[0], pair[1]);
            let new = compensate_position(old.0, old.1)?;
            changed |= old != new;
            (pair[0], pair[1]) = new;
        }
    }
    Ok(changed)
}
