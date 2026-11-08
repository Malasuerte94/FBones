//! Field-only homogeneous edits within the existing SceneHistory transaction.
use crate::{project::AppError, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{Constraint, PhysicsAngular};
use serde::Deserialize;
use std::collections::HashSet;

#[derive(Clone, Copy, Debug, Deserialize)]
pub enum ConstraintBatchField {
    #[serde(rename = "physics.x")]
    PhysicsX,
    #[serde(rename = "physics.y")]
    PhysicsY,
    #[serde(rename = "physics.rotate")]
    PhysicsRotate,
    #[serde(rename = "physics.scaleX")]
    PhysicsScaleX,
    #[serde(rename = "physics.shearX")]
    PhysicsShearX,
    #[serde(rename = "physics.limit")]
    PhysicsLimit,
    #[serde(rename = "physics.step")]
    PhysicsStep,
    #[serde(rename = "physics.inertia")]
    PhysicsInertia,
    #[serde(rename = "physics.strength")]
    PhysicsStrength,
    #[serde(rename = "physics.damping")]
    PhysicsDamping,
    #[serde(rename = "physics.mass")]
    PhysicsMass,
    #[serde(rename = "physics.wind")]
    PhysicsWind,
    #[serde(rename = "physics.gravity")]
    PhysicsGravity,
    #[serde(rename = "physics.mix")]
    PhysicsMix,
    #[serde(rename = "physics.global:inertia")]
    PhysicsGlobalInertia,
    #[serde(rename = "physics.global:strength")]
    PhysicsGlobalStrength,
    #[serde(rename = "physics.global:damping")]
    PhysicsGlobalDamping,
    #[serde(rename = "physics.global:mass")]
    PhysicsGlobalMass,
    #[serde(rename = "physics.global:wind")]
    PhysicsGlobalWind,
    #[serde(rename = "physics.global:gravity")]
    PhysicsGlobalGravity,
    #[serde(rename = "physics.global:mix")]
    PhysicsGlobalMix,
    #[serde(rename = "ik.mix")]
    IkMix,
    #[serde(rename = "ik.softness")]
    IkSoftness,
    #[serde(rename = "ik.bendPositive")]
    IkBendPositive,
    #[serde(rename = "ik.compress")]
    IkCompress,
    #[serde(rename = "ik.stretch")]
    IkStretch,
    #[serde(rename = "transform.offset:0")]
    TransformOffset0,
    #[serde(rename = "transform.offset:1")]
    TransformOffset1,
    #[serde(rename = "transform.offset:2")]
    TransformOffset2,
    #[serde(rename = "transform.offset:3")]
    TransformOffset3,
    #[serde(rename = "transform.offset:4")]
    TransformOffset4,
    #[serde(rename = "transform.offset:5")]
    TransformOffset5,
    #[serde(rename = "transform.mix:0")]
    TransformMix0,
    #[serde(rename = "transform.mix:1")]
    TransformMix1,
    #[serde(rename = "transform.mix:2")]
    TransformMix2,
    #[serde(rename = "transform.mix:3")]
    TransformMix3,
    #[serde(rename = "transform.mix:4")]
    TransformMix4,
    #[serde(rename = "transform.mix:5")]
    TransformMix5,
    #[serde(rename = "transform.localSource")]
    TransformLocalSource,
    #[serde(rename = "transform.localTarget")]
    TransformLocalTarget,
    #[serde(rename = "transform.additive")]
    TransformAdditive,
    #[serde(rename = "transform.clamp")]
    TransformClamp,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(untagged)]
pub enum ConstraintBatchValue {
    Number(f32),
    Bool(bool),
    ExactBits(ConstraintBatchBits),
}

/// JSON numbers cannot carry JavaScript's negative zero through stringify.
#[derive(Clone, Copy, Debug)]
pub struct ConstraintBatchBits {
    pub bits: u32,
}

impl<'de> Deserialize<'de> for ConstraintBatchBits {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Fields {
            bits: u32,
        }
        struct MapOnly;
        impl<'de> serde::de::Visitor<'de> for MapOnly {
            type Value = ConstraintBatchBits;
            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("an exact float object with one bits field")
            }
            fn visit_map<A: serde::de::MapAccess<'de>>(
                self,
                map: A,
            ) -> Result<Self::Value, A::Error> {
                let fields =
                    Fields::deserialize(serde::de::value::MapAccessDeserializer::new(map))?;
                Ok(ConstraintBatchBits { bits: fields.bits })
            }
        }
        deserializer.deserialize_map(MapOnly)
    }
}

fn invalid(message: &str) -> AppError {
    AppError::new("InvalidSceneEdit", message)
}

impl ConstraintBatchValue {
    fn number(self) -> Result<f32, AppError> {
        let value = match self {
            Self::Number(value) => value,
            Self::ExactBits(value) => f32::from_bits(value.bits),
            Self::Bool(_) => return Err(invalid("Enter a finite numeric constraint value.")),
        };
        if value.is_finite() {
            Ok(value)
        } else {
            Err(invalid("Enter a finite numeric constraint value."))
        }
    }
    fn boolean(self) -> Result<bool, AppError> {
        match self {
            Self::Bool(value) => Ok(value),
            _ => Err(invalid("Choose a boolean constraint value.")),
        }
    }
}

fn patch(
    constraint: &mut Constraint,
    field: ConstraintBatchField,
    value: ConstraintBatchValue,
) -> Result<(), AppError> {
    use ConstraintBatchField::*;
    match (constraint, field) {
        (Constraint::Physics(c), PhysicsX) => c.x = value.number()?,
        (Constraint::Physics(c), PhysicsY) => c.y = value.number()?,
        (Constraint::Physics(c), PhysicsScaleX) => c.scale_x = value.number()?,
        (Constraint::Physics(c), PhysicsRotate) => {
            let (_, shear) = c.angular.wire_bits();
            c.angular = PhysicsAngular::from_wire_bits(value.number()?.to_bits(), shear)?;
        }
        (Constraint::Physics(c), PhysicsShearX) => {
            let (rotate, _) = c.angular.wire_bits();
            // The nullable rotation sentinel is valid only with zero shear.
            // Reject incompatible changes rather than author another field.
            c.angular = PhysicsAngular::from_wire_bits(rotate, value.number()?.to_bits())?;
        }
        (Constraint::Physics(c), PhysicsLimit) => c.limit = value.number()?,
        (Constraint::Physics(c), PhysicsStep) => c.step = value.number()?,
        (Constraint::Physics(c), PhysicsInertia) => c.inertia = value.number()?,
        (Constraint::Physics(c), PhysicsStrength) => c.strength = value.number()?,
        (Constraint::Physics(c), PhysicsDamping) => {
            let value = value.number()?;
            if value < 0.0 {
                return Err(invalid("Use a nonnegative Physics damping retention."));
            }
            c.damping = value;
        }
        (Constraint::Physics(c), PhysicsMass) => c.mass = value.number()?,
        (Constraint::Physics(c), PhysicsWind) => c.wind = value.number()?,
        (Constraint::Physics(c), PhysicsGravity) => c.gravity = value.number()?,
        (Constraint::Physics(c), PhysicsMix) => c.mix = value.number()?,
        (Constraint::Physics(c), PhysicsGlobalInertia) => c.globals.inertia = value.boolean()?,
        (Constraint::Physics(c), PhysicsGlobalStrength) => c.globals.strength = value.boolean()?,
        (Constraint::Physics(c), PhysicsGlobalDamping) => c.globals.damping = value.boolean()?,
        (Constraint::Physics(c), PhysicsGlobalMass) => c.globals.mass = value.boolean()?,
        (Constraint::Physics(c), PhysicsGlobalWind) => c.globals.wind = value.boolean()?,
        (Constraint::Physics(c), PhysicsGlobalGravity) => c.globals.gravity = value.boolean()?,
        (Constraint::Physics(c), PhysicsGlobalMix) => c.globals.mix = value.boolean()?,
        (Constraint::Ik(c), IkMix) => c.mix = value.number()?,
        (Constraint::Ik(c), IkSoftness) => c.softness = value.number()?,
        (Constraint::Ik(c), IkBendPositive) => c.bend_positive = value.boolean()?,
        (Constraint::Ik(c), IkCompress) => c.compress = value.boolean()?,
        (Constraint::Ik(c), IkStretch) => c.stretch = value.boolean()?,
        (Constraint::Transform(c), TransformOffset0) => c.offsets[0] = value.number()?,
        (Constraint::Transform(c), TransformOffset1) => c.offsets[1] = value.number()?,
        (Constraint::Transform(c), TransformOffset2) => c.offsets[2] = value.number()?,
        (Constraint::Transform(c), TransformOffset3) => c.offsets[3] = value.number()?,
        (Constraint::Transform(c), TransformOffset4) => c.offsets[4] = value.number()?,
        (Constraint::Transform(c), TransformOffset5) => c.offsets[5] = value.number()?,
        (Constraint::Transform(c), TransformMix0) => c.mix[0] = value.number()?,
        (Constraint::Transform(c), TransformMix1) => c.mix[1] = value.number()?,
        (Constraint::Transform(c), TransformMix2) => c.mix[2] = value.number()?,
        (Constraint::Transform(c), TransformMix3) => c.mix[3] = value.number()?,
        (Constraint::Transform(c), TransformMix4) => c.mix[4] = value.number()?,
        (Constraint::Transform(c), TransformMix5) => c.mix[5] = value.number()?,
        (Constraint::Transform(c), TransformLocalSource) => c.local_source = value.boolean()?,
        (Constraint::Transform(c), TransformLocalTarget) => c.local_target = value.boolean()?,
        (Constraint::Transform(c), TransformAdditive) => c.additive = value.boolean()?,
        (Constraint::Transform(c), TransformClamp) => c.clamp = value.boolean()?,
        _ => return Err(invalid("Select constraints of the field's supported type.")),
    }
    Ok(())
}

pub(crate) fn apply(
    frame: &mut SceneFrame,
    ids: &[u64],
    field: ConstraintBatchField,
    value: ConstraintBatchValue,
) -> Result<(), AppError> {
    if ids.is_empty() || ids.len() > 128 || ids.iter().collect::<HashSet<_>>().len() != ids.len() {
        return Err(invalid(
            "Choose 1–128 distinct constraints to edit together.",
        ));
    }
    // Prepare every row before touching the transaction's frame. Native history
    // performs full profile validation before committing this single action.
    let changes = ids
        .iter()
        .map(|id| {
            let index = frame.constraint_index(*id)?;
            let mut constraint = frame.project.constraints[index].clone();
            patch(&mut constraint, field, value)?;
            Ok((index, constraint))
        })
        .collect::<Result<Vec<_>, AppError>>()?;
    for (index, constraint) in changes {
        frame.project.constraints[index] = constraint;
    }
    Ok(())
}

#[cfg(test)]
#[path = "scene_constraint_batch_tests.rs"]
mod tests;
