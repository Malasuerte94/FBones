//! Setup rotation, scale and shear about the selected bone's authored origin.
use super::{invalid, AppError, SceneAttachment, SceneFrame};
use crate::rig::{poses, BoneWorldAxis, Pose, RotationCompensationMode, ScaleCompensationMode};
use crate::solve::{Affine, LocalPose};
use fbones_format::minimal::{meshes::Vertex, regions::Region, scene::Clipping, Bone};

const FIELD_LIMIT: f64 = 1_000_000.0;
const WORLD_TOLERANCE: f64 = 0.001;
const REGION_DIRECTION_TOLERANCE: f64 = 1e-8;
const ANGLE_ROUNDOFF: f64 = 1e-10;

pub(super) fn rotate(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    id: u64,
    mode: RotationCompensationMode,
    angle: f64,
    compensate_bones: bool,
    compensate_images: bool,
) -> Result<(), AppError> {
    check_scope(next, compensate_bones, compensate_images)?;
    if !bounded(angle) {
        return Err(invalid("Use a finite bounded angle for compensation."));
    }
    let selected = next.bone_index(id)?;
    let bones = &next.project.rig.bones;
    let old = LocalPose::from(&bones[selected]);
    let angle = match mode {
        RotationCompensationMode::LocalAbsolute => {
            let angle = f64::from(angle as f32);
            if angle.to_bits() == old.rotation.to_bits() {
                return Ok(());
            }
            angle
        }
        RotationCompensationMode::WorldDelta => {
            let angle = angle % 360.0;
            if angle == 0.0 {
                return Ok(());
            }
            angle
        }
    };

    let parent = parent_basis(bones, selected);
    let parent_inverse = inverse_basis(parent)?;
    let old_basis = parent.compose(linear(old.affine()));
    inverse_basis(old_basis)?;

    let (new, correction) = match mode {
        RotationCompensationMode::LocalAbsolute => {
            // Whole turns and zero-sign edits change the authored angle, with
            // the same orientation and without rewriting any dependents.
            if (angle - old.rotation) % 360.0 == 0.0 {
                next.project.rig.bones[selected].rotation = angle as f32;
                before.focus.bone = id;
                next.focus.bone = id;
                return Ok(());
            }
            let candidate = LocalPose {
                rotation: angle,
                ..old
            };
            let new_basis = parent.compose(linear(candidate.affine()));
            (
                candidate,
                Correction {
                    old_basis,
                    new_basis,
                    local: inverse_basis(new_basis)?.compose(old_basis),
                    scale_signs: [1.0, 1.0],
                },
            )
        }
        RotationCompensationMode::WorldDelta => {
            world_turn(parent, parent_inverse, old, old_basis, angle)?
        }
    };
    if new == old {
        return Ok(());
    }
    correct_dependents(
        before,
        next,
        selected,
        new,
        correction,
        compensate_bones,
        compensate_images,
    )
}

pub(super) fn set_world_rotation(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    id: u64,
    angle: f64,
    compensate_bones: bool,
    compensate_images: bool,
) -> Result<(), AppError> {
    check_setup(next)?;
    if !angle.is_finite() {
        return Err(invalid("Use a finite world rotation."));
    }
    let selected = next.bone_index(id)?;
    let bones = &next.project.rig.bones;
    let old = LocalPose::from(&bones[selected]);
    let parent = parent_basis(bones, selected);
    let parent_inverse = inverse_basis(parent)?;
    let old_basis = parent.compose(linear(old.affine()));
    inverse_basis(old_basis)?;

    // Follow the physical X column, including its reflected direction.
    let target = angle.rem_euclid(360.0);
    let delta = heading_delta(target, old_basis);
    if delta.abs() <= ANGLE_ROUNDOFF {
        return Ok(());
    }
    let (new, correction) = world_turn(parent, parent_inverse, old, old_basis, delta)?;
    // Reentering an angle between representable headings must not churn
    // other channels if this rounded pose moves no closer to the target.
    let realized_error = heading_delta(target, correction.new_basis).abs();
    if realized_error + ANGLE_ROUNDOFF >= delta.abs() {
        return Ok(());
    }
    correct_dependents(
        before,
        next,
        selected,
        new,
        correction,
        compensate_bones,
        compensate_images,
    )
}

fn heading_delta(target: f64, basis: Affine) -> f64 {
    let heading = basis.heading();
    nearest_angle(target, heading) - heading
}

fn world_turn(
    parent: Affine,
    parent_inverse: Affine,
    old: LocalPose,
    old_basis: Affine,
    angle: f64,
) -> Result<(LocalPose, Correction), AppError> {
    let mut desired = old_basis;
    desired.rotate_basis(angle);
    let candidate = decompose_bone_basis(parent_inverse.compose(desired), old, [1.0, 1.0])?;
    let new_basis = parent.compose(linear(candidate.affine()));
    let new_inverse = inverse_basis(new_basis)?;
    check_affine(desired, new_basis)?;
    if reversed_handedness(old_basis, new_basis) {
        return Err(invalid(
            "The stored precision cannot preserve the compensated transform.",
        ));
    }
    Ok((
        candidate,
        Correction {
            old_basis,
            new_basis,
            local: new_inverse.compose(old_basis),
            scale_signs: [1.0, 1.0],
        },
    ))
}

pub(super) fn scale(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    id: u64,
    mode: ScaleCompensationMode,
    [x, y]: [Option<f32>; 2],
    compensate_bones: bool,
    compensate_images: bool,
) -> Result<(), AppError> {
    check_scope(next, compensate_bones, compensate_images)?;
    if x.is_none() && y.is_none() {
        return Err(invalid("Choose at least one scale axis."));
    }
    let selected = next.bone_index(id)?;
    let bones = &next.project.rig.bones;
    let old = LocalPose::from(&bones[selected]);
    let new = LocalPose {
        scale_x: selected_scale(x, old.scale_x, mode)?,
        scale_y: selected_scale(y, old.scale_y, mode)?,
        ..old
    };
    let parent = parent_basis(bones, selected);
    inverse_basis(parent)?;
    let old_basis = parent.compose(linear(old.affine()));
    let new_basis = parent.compose(linear(new.affine()));
    inverse_basis(old_basis)?;
    inverse_basis(new_basis)?;
    if new == old {
        return Ok(());
    }

    // Scale only multiplies the authored columns. The exact local correction
    // uses the realized f32 ratio and avoids inverse-matrix roundoff on either axis.
    let ratio_x = old.scale_x / new.scale_x;
    let ratio_y = old.scale_y / new.scale_y;
    let correction = Correction {
        old_basis,
        new_basis,
        local: Affine {
            a: ratio_x,
            d: ratio_y,
            ..Affine::IDENTITY
        },
        scale_signs: [ratio_x.signum(), ratio_y.signum()],
    };
    correct_dependents(
        before,
        next,
        selected,
        new,
        correction,
        compensate_bones,
        compensate_images,
    )
}

pub(super) fn shear(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    id: u64,
    mode: RotationCompensationMode,
    axis: BoneWorldAxis,
    angle: f32,
    compensate_bones: bool,
    compensate_images: bool,
) -> Result<(), AppError> {
    check_scope(next, compensate_bones, compensate_images)?;
    let angle = f64::from(angle);
    if !bounded(angle) {
        return Err(invalid("Use a finite bounded shear angle."));
    }
    if matches!(mode, RotationCompensationMode::WorldDelta) && angle.abs() > 85.0 {
        return Err(invalid("World shear gestures must stay within ±85°."));
    }

    let selected = next.bone_index(id)?;
    let bones = &next.project.rig.bones;
    let old = LocalPose::from(&bones[selected]);
    let parent = parent_basis(bones, selected);
    let parent_inverse = inverse_basis(parent)?;
    let old_basis = parent.compose(linear(old.affine()));
    inverse_basis(old_basis)?;

    let old_shear = match axis {
        BoneWorldAxis::X => old.shear_x,
        BoneWorldAxis::Y => old.shear_y,
    };
    let (new, desired) = match mode {
        RotationCompensationMode::LocalAbsolute => {
            if angle.to_bits() == old_shear.to_bits() {
                return Ok(());
            }
            let candidate = match axis {
                BoneWorldAxis::X => LocalPose {
                    shear_x: angle,
                    ..old
                },
                BoneWorldAxis::Y => LocalPose {
                    shear_y: angle,
                    ..old
                },
            };
            (candidate, None)
        }
        RotationCompensationMode::WorldDelta => {
            if angle == 0.0 {
                return Ok(());
            }
            let (sin, cos) = angle.to_radians().sin_cos();
            let shear = match axis {
                BoneWorldAxis::X => Affine {
                    a: cos,
                    b: sin,
                    ..Affine::IDENTITY
                },
                BoneWorldAxis::Y => Affine {
                    c: -sin,
                    d: cos,
                    ..Affine::IDENTITY
                },
            };
            let desired = shear.compose(old_basis);
            // Preserve authored shear X in the decomposition; a World X
            // gesture is allowed to alter local rotation and shear Y.
            let candidate = decompose_bone_basis(parent_inverse.compose(desired), old, [1.0, 1.0])?;
            (candidate, Some(desired))
        }
    };
    let new_basis = parent.compose(linear(new.affine()));
    let new_inverse = inverse_basis(new_basis)?;
    let reversed = reversed_handedness(old_basis, new_basis);
    if let Some(desired) = desired {
        check_affine(desired, new_basis)?;
        if reversed {
            return Err(invalid(
                "The stored precision cannot preserve the compensated transform.",
            ));
        }
        if new == old {
            return Ok(());
        }
    } else if (angle - old_shear) % 360.0 == 0.0 {
        // Store a whole turn or an explicit zero sign without changing any
        // dependent's authored channels for the equivalent orientation.
        write_bone(&mut next.project.rig.bones[selected], new);
        before.focus.bone = id;
        next.focus.bone = id;
        return Ok(());
    }
    let scale_signs = match (axis, reversed) {
        (BoneWorldAxis::X, true) => [-1.0, 1.0],
        (BoneWorldAxis::Y, true) => [1.0, -1.0],
        (_, false) => [1.0, 1.0],
    };
    correct_dependents(
        before,
        next,
        selected,
        new,
        Correction {
            old_basis,
            new_basis,
            local: new_inverse.compose(old_basis),
            scale_signs,
        },
        compensate_bones,
        compensate_images,
    )
}

fn selected_scale(
    axis: Option<f32>,
    old: f64,
    mode: ScaleCompensationMode,
) -> Result<f64, AppError> {
    let Some(axis) = axis else { return Ok(old) };
    let value = match mode {
        ScaleCompensationMode::LocalAbsolute => f64::from(axis),
        ScaleCompensationMode::LocalFactor => {
            if !(0.01_f32..=100.0).contains(&axis) {
                return Err(invalid("Scale factors must be between 0.01 and 100."));
            }
            old * f64::from(axis)
        }
    };
    let rounded = f64::from(value as f32);
    if !bounded(rounded) || rounded == 0.0 {
        return Err(invalid(
            "Use nonzero finite scales within the supported range.",
        ));
    }
    Ok(rounded)
}

fn check_scope(
    next: &SceneFrame,
    compensate_bones: bool,
    compensate_images: bool,
) -> Result<(), AppError> {
    if !compensate_bones && !compensate_images {
        return Err(invalid("Enable Bones or Images compensation."));
    }
    check_setup(next)
}

fn check_setup(next: &SceneFrame) -> Result<(), AppError> {
    if !next.project.constraints.is_empty() {
        return Err(invalid(
            "This Setup compensation requires a scene without constraints.",
        ));
    }
    Ok(())
}

fn parent_basis(bones: &[Bone], selected: usize) -> Affine {
    let mut ancestors = Vec::<Affine>::with_capacity(selected);
    for bone in &bones[..selected] {
        let parent = bone
            .parent
            .map_or(Affine::IDENTITY, |index| ancestors[index]);
        ancestors.push(parent.compose(linear(LocalPose::from(bone).affine())));
    }
    bones[selected]
        .parent
        .map_or(Affine::IDENTITY, |index| ancestors[index])
}

fn correct_dependents(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    selected: usize,
    new: LocalPose,
    correction: Correction,
    compensate_bones: bool,
    compensate_images: bool,
) -> Result<(), AppError> {
    let original_bones = &before.project.rig.bones;
    let bones = &mut next.project.rig.bones;
    write_bone(&mut bones[selected], new);
    if compensate_bones {
        for child in bones
            .iter_mut()
            .filter(|bone| bone.parent == Some(selected))
        {
            let old = LocalPose::from(&*child);
            let target = correction.local.compose(old.affine());
            let mut next = decompose_bone_basis(target, old, correction.scale_signs)?;
            next.x = stored(target.x, old.x)?;
            next.y = stored(target.y, old.y)?;
            correction.check(old.affine(), next.affine())?;
            write_bone(child, next);
        }
    }
    if compensate_images {
        let mut clipping =
            CompensatedClipping::new(original_bones, bones, selected, compensate_bones);
        for slot in &mut next.project.slots {
            for attachment in &mut slot.attachments {
                match attachment {
                    SceneAttachment::Region(region) if slot.bone == selected => {
                        correction.region(region)?;
                    }
                    SceneAttachment::Mesh(mesh) => {
                        correction.binding(&mesh.bones, &mut mesh.vertices, selected)?;
                    }
                    SceneAttachment::Clipping(clip) => {
                        let changed =
                            correction.binding(&clip.bones, &mut clip.vertices, selected)?;
                        clipping.check(clip, changed)?;
                    }
                    SceneAttachment::Region(_) | SceneAttachment::Path(_) => {}
                }
            }
        }
    }
    let id = next.bone_ids[selected];
    before.focus.bone = id;
    next.focus.bone = id;
    Ok(())
}

fn reversed_handedness(old: Affine, new: Affine) -> bool {
    old.determinant().is_sign_negative() != new.determinant().is_sign_negative()
}

pub(super) struct CompensatedClipping<'a> {
    original_bones: &'a [Bone],
    bones: &'a [Bone],
    selected: usize,
    compensate_bones: bool,
    descendants: Option<Vec<bool>>,
    original_world: Option<Vec<Pose>>,
    world: Option<Vec<Pose>>,
}

impl<'a> CompensatedClipping<'a> {
    pub(super) fn new(
        original_bones: &'a [Bone],
        bones: &'a [Bone],
        selected: usize,
        compensate_bones: bool,
    ) -> Self {
        Self {
            original_bones,
            bones,
            selected,
            compensate_bones,
            descendants: None,
            original_world: None,
            world: None,
        }
    }

    pub(super) fn check(&mut self, clip: &Clipping, changed: bool) -> Result<(), AppError> {
        if !changed
            && (self.compensate_bones
                || !clip_has_mixed_cohort(
                    clip,
                    self.selected,
                    self.descendants
                        .get_or_insert_with(|| descendants_of(self.bones, self.selected)),
                ))
        {
            return Ok(());
        }
        let world = self.world.get_or_insert_with(|| poses(self.bones));
        // A held lane can stay byte-identical even as an unheld descendant
        // moves the contour. Avoid checking an unchanged imported contour.
        if !changed
            && crate::clip_edit::world_vertices(clip, world)
                == crate::clip_edit::world_vertices(
                    clip,
                    self.original_world
                        .get_or_insert_with(|| poses(self.original_bones)),
                )
        {
            return Ok(());
        }
        crate::clip_edit::validate_polygon(clip, world)
    }
}

fn descendants_of(bones: &[Bone], selected: usize) -> Vec<bool> {
    let mut descendants = vec![false; bones.len()];
    for index in selected + 1..bones.len() {
        descendants[index] = bones[index]
            .parent
            .is_some_and(|parent| parent == selected || descendants[parent]);
    }
    descendants
}

fn clip_has_mixed_cohort(clip: &Clipping, selected: usize, descendants: &[bool]) -> bool {
    let has_weight = |column| {
        clip.vertices
            .iter()
            .any(|vertex| vertex.weights[column] > 0.0)
    };
    clip.bones
        .iter()
        .position(|&bone| bone == selected)
        .is_some_and(has_weight)
        && clip
            .bones
            .iter()
            .enumerate()
            .any(|(column, &bone)| descendants[bone] && has_weight(column))
}

fn bounded(value: f64) -> bool {
    value.is_finite() && value.abs() <= FIELD_LIMIT
}

fn stored(value: f64, old: f64) -> Result<f64, AppError> {
    if !bounded(value) {
        return Err(invalid(
            "Compensation exceeds the supported authored range.",
        ));
    }
    let rounded = f64::from(value as f32);
    Ok(if rounded == old { old } else { rounded })
}

fn stored_angle(angle: f64, old: f64) -> Result<f64, AppError> {
    // Decomposing an unchanged angle may leave a tiny trig residual near zero.
    stored(
        if (angle - old).abs() <= ANGLE_ROUNDOFF {
            old
        } else {
            angle
        },
        old,
    )
}

fn linear(matrix: Affine) -> Affine {
    Affine {
        x: 0.0,
        y: 0.0,
        ..matrix
    }
}

fn inverse_basis(matrix: Affine) -> Result<Affine, AppError> {
    let singular = || invalid("Compensation needs nonsingular finite bone transforms.");
    if !matrix.finite() {
        return Err(singular());
    }
    matrix.inverse().map_err(|_| singular())
}

fn nearest_angle(angle: f64, old: f64) -> f64 {
    let delta = angle - old;
    if (-180.0..180.0).contains(&delta) {
        angle
    } else {
        old + ((delta + 180.0).rem_euclid(360.0) - 180.0)
    }
}

fn signed_column(x: f64, y: f64, old_scale: f64) -> (f64, Option<f64>) {
    let length = x.hypot(y);
    let sign = 1.0_f64.copysign(old_scale);
    let heading = (length > 0.0).then(|| (y * sign).atan2(x * sign).to_degrees());
    (length * sign, heading)
}

fn decompose_bone_basis(
    matrix: Affine,
    old: LocalPose,
    [sign_x, sign_y]: [f64; 2],
) -> Result<LocalPose, AppError> {
    let scale_x_reference = old.scale_x * sign_x;
    let scale_y_reference = old.scale_y * sign_y;
    let (scale_x, x_heading) = signed_column(matrix.a, matrix.b, scale_x_reference);
    let (scale_y, y_heading) = signed_column(matrix.c, matrix.d, scale_y_reference);
    let rotation = x_heading.map_or(old.rotation, |x| {
        nearest_angle(x - old.shear_x, old.rotation)
    });
    let shear_y = y_heading.map_or(old.shear_y, |y| {
        nearest_angle(y - rotation - 90.0, old.shear_y)
    });
    Ok(LocalPose {
        rotation: stored_angle(rotation, old.rotation)?,
        scale_x: stored(scale_x, scale_x_reference)?,
        scale_y: stored(scale_y, scale_y_reference)?,
        shear_y: stored_angle(shear_y, old.shear_y)?,
        ..old
    })
}

fn write_bone(bone: &mut Bone, pose: LocalPose) {
    bone.x = pose.x as f32;
    bone.y = pose.y as f32;
    bone.rotation = pose.rotation as f32;
    bone.scale_x = pose.scale_x as f32;
    bone.scale_y = pose.scale_y as f32;
    bone.shear_x = pose.shear_x as f32;
    bone.shear_y = pose.shear_y as f32;
}

fn check_point(old: (f64, f64), new: (f64, f64)) -> Result<(), AppError> {
    let error = (old.0 - new.0).hypot(old.1 - new.1);
    if !error.is_finite() || error > WORLD_TOLERANCE {
        return Err(invalid(
            "The stored precision cannot preserve the compensated transform.",
        ));
    }
    Ok(())
}

fn check_affine(old: Affine, new: Affine) -> Result<(), AppError> {
    check_point((old.x, old.y), (new.x, new.y))?;
    check_point((old.a, old.b), (new.a, new.b))?;
    check_point((old.c, old.d), (new.c, new.d))
}

fn region_affine(x: f64, y: f64, angle: f64, sx: f64, sy: f64) -> Affine {
    let (sin, cos) = angle.to_radians().sin_cos();
    Affine {
        a: cos * sx,
        b: sin * sx,
        c: -sin * sy,
        d: cos * sy,
        x,
        y,
    }
}

struct Correction {
    old_basis: Affine,
    new_basis: Affine,
    local: Affine,
    scale_signs: [f64; 2],
}

impl Correction {
    fn check(&self, old: Affine, new: Affine) -> Result<(), AppError> {
        check_affine(self.old_basis.compose(old), self.new_basis.compose(new))
    }

    fn region(&self, region: &mut Region) -> Result<(), AppError> {
        let old_x = f64::from(region.x);
        let old_y = f64::from(region.y);
        let old_angle = f64::from(region.rotation);
        let old_sx = f64::from(region.scale_x);
        let old_sy = f64::from(region.scale_y);
        let [sign_x, sign_y] = self.scale_signs;
        let scale_x_reference = old_sx * sign_x;
        let scale_y_reference = old_sy * sign_y;
        let old = region_affine(old_x, old_y, old_angle, old_sx, old_sy);
        let target = self.local.compose(old);
        let (sx, x_heading) = signed_column(target.a, target.b, scale_x_reference);
        let (sy, y_heading) = signed_column(target.c, target.d, scale_y_reference);
        let direction_error = if sx != 0.0 && sy != 0.0 {
            (target.c / sy + target.b / sx).hypot(target.d / sy - target.a / sx)
        } else {
            0.0
        };
        let angle = x_heading
            .or_else(|| y_heading.map(|y| y - 90.0))
            .unwrap_or(old_angle);
        let angle = stored_angle(nearest_angle(angle, old_angle), old_angle)?;
        let x = stored(target.x, old_x)?;
        let y = stored(target.y, old_y)?;
        let sx = stored(sx, scale_x_reference)?;
        let sy = stored(sy, scale_y_reference)?;
        let old_world = self.old_basis.compose(old);
        let half_width = f64::from(region.width) / 2.0;
        let half_height = f64::from(region.height) / 2.0;
        let check_fit = |angle| {
            let new_world = self.new_basis.compose(region_affine(x, y, angle, sx, sy));
            check_affine(old_world, new_world)?;
            for x in [-half_width, half_width] {
                for y in [-half_height, half_height] {
                    check_point(old_world.point(x, y), new_world.point(x, y))?;
                }
            }
            Ok(())
        };
        let angle = match check_fit(angle) {
            Ok(()) => angle,
            Err(error) => {
                // Try the other axis and a balanced orientation along the
                // shortest arc, each checked against the full stored geometry.
                let alternate = x_heading.zip(y_heading).and_then(|(x, y)| {
                    let y = y - 90.0;
                    let midpoint = x + (nearest_angle(y, x) - x) / 2.0;
                    [y, midpoint]
                        .into_iter()
                        .filter_map(|raw| {
                            stored_angle(nearest_angle(raw, old_angle), old_angle).ok()
                        })
                        .find(|&candidate| candidate != angle && check_fit(candidate).is_ok())
                });
                if let Some(alternate) = alternate {
                    alternate
                } else if !direction_error.is_finite()
                    || direction_error > REGION_DIRECTION_TOLERANCE
                {
                    return Err(invalid(
                        "The compensated Region needs shear and cannot retain its type.",
                    ));
                } else {
                    return Err(error);
                }
            }
        };
        (
            region.x,
            region.y,
            region.rotation,
            region.scale_x,
            region.scale_y,
        ) = (x as f32, y as f32, angle as f32, sx as f32, sy as f32);
        Ok(())
    }

    fn binding(
        &self,
        bones: &[usize],
        rows: &mut [Vertex],
        selected: usize,
    ) -> Result<bool, AppError> {
        let Some(column) = bones.iter().position(|bone| *bone == selected) else {
            return Ok(false);
        };
        let mut changed = false;
        for row in rows {
            if row.weights[column] <= 0.0 {
                continue;
            }
            let pair = &mut row.positions[column * 2..column * 2 + 2];
            let old = (f64::from(pair[0]), f64::from(pair[1]));
            let target = self.local.vector(old.0, old.1);
            let new = (stored(target.0, old.0)?, stored(target.1, old.1)?);
            check_point(
                self.old_basis.vector(old.0, old.1),
                self.new_basis.vector(new.0, new.1),
            )?;
            changed |= old != new;
            (pair[0], pair[1]) = (new.0 as f32, new.1 as f32);
        }
        Ok(changed)
    }
}
