use super::*;
use fbones_format::minimal::scene::*;
use serde::Deserialize;
fn one() -> f32 {
    1.0
}
fn yes() -> bool {
    true
}
fn mixes() -> [f32; 6] {
    [1.0; 6]
}
fn step() -> f32 {
    1.0 / 60.0
}
fn inertia() -> f32 {
    0.5
}
fn strength() -> f32 {
    100.0
}
fn damping() -> f32 {
    0.85
}
fn limit() -> f32 {
    5000.0
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToInput {
    property: String,
    #[serde(default)]
    offset: f32,
    #[serde(default = "one")]
    max: f32,
    #[serde(default = "one")]
    scale: f32,
}
#[derive(Clone, Debug, Deserialize)]
pub struct FromInput {
    property: String,
    #[serde(default)]
    offset: f32,
    to: Vec<ToInput>,
}
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalsInput {
    #[serde(default)]
    inertia: bool,
    #[serde(default)]
    strength: bool,
    #[serde(default)]
    damping: bool,
    #[serde(default)]
    mass: bool,
    #[serde(default)]
    wind: bool,
    #[serde(default)]
    gravity: bool,
    #[serde(default)]
    mix: bool,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum ConstraintInput {
    Ik {
        name: String,
        bones: Vec<u64>,
        target: u64,
        #[serde(default = "one")]
        mix: f32,
        #[serde(default)]
        softness: f32,
        #[serde(default = "yes")]
        bend_positive: bool,
        #[serde(default)]
        compress: bool,
        #[serde(default)]
        stretch: bool,
    },
    Transform {
        name: String,
        source: u64,
        bones: Vec<u64>,
        #[serde(default)]
        local_source: bool,
        #[serde(default)]
        local_target: bool,
        #[serde(default)]
        additive: bool,
        #[serde(default)]
        clamp: bool,
        #[serde(default)]
        offsets: [f32; 6],
        #[serde(default = "mixes")]
        mix: [f32; 6],
        #[serde(default)]
        properties: Vec<FromInput>,
    },
    Physics {
        name: String,
        bone: u64,
        #[serde(default)]
        x: f32,
        #[serde(default)]
        y: f32,
        #[serde(default)]
        scale_x: f32,
        #[serde(default)]
        rotate: Option<f32>,
        #[serde(default)]
        shear_x: f32,
        #[serde(default = "step")]
        step: f32,
        #[serde(default = "inertia")]
        inertia: f32,
        #[serde(default = "strength")]
        strength: f32,
        #[serde(default = "damping")]
        damping: f32,
        #[serde(default = "one")]
        mass: f32,
        #[serde(default)]
        wind: f32,
        #[serde(default)]
        gravity: f32,
        #[serde(default = "one")]
        mix: f32,
        #[serde(default = "limit")]
        limit: f32,
        #[serde(default)]
        globals: GlobalsInput,
    },
}
pub(super) fn property_name(p: TransformProperty) -> &'static str {
    match p {
        TransformProperty::Rotate => "rotate",
        TransformProperty::X => "x",
        TransformProperty::Y => "y",
        TransformProperty::ScaleX => "scaleX",
        TransformProperty::ScaleY => "scaleY",
        TransformProperty::ShearY => "shearY",
    }
}
fn property(s: &str) -> Result<TransformProperty, AppError> {
    TransformProperty::ALL
        .into_iter()
        .find(|p| property_name(*p) == s)
        .ok_or_else(|| invalid("Choose a supported transform property."))
}
impl ConstraintInput {
    pub(super) fn build(&self, f: &SceneFrame) -> Result<Constraint, AppError> {
        match self {
            Self::Physics { damping, .. } if !damping.is_finite() || *damping < 0.0 => {
                return Err(invalid(
                    "Use a finite nonnegative physics damping retention.",
                ));
            }
            Self::Ik { bones, .. } | Self::Transform { bones, .. }
                if bones.is_empty() || bones.len() > 128 =>
            {
                return Err(invalid("Choose 1–128 constrained bones."))
            }
            Self::Transform { properties, .. }
                if properties.len() > 6 || properties.iter().any(|p| p.to.len() > 6) =>
            {
                return Err(invalid(
                    "Use at most six distinct source and destination channels.",
                ))
            }
            _ => (),
        }
        Ok(match self {
            Self::Ik {
                name,
                bones,
                target,
                mix,
                softness,
                bend_positive,
                compress,
                stretch,
            } => {
                let bones = bones
                    .iter()
                    .map(|id| f.bone_index(*id))
                    .collect::<Result<Vec<_>, _>>()?;
                let target = f.bone_index(*target)?;
                let mut ancestor = Some(target);
                while let Some(index) = ancestor {
                    if bones.contains(&index) {
                        return Err(invalid(
                            "An IK target cannot be a constrained bone or one of its descendants.",
                        ));
                    }
                    ancestor = f.project.rig.bones[index].parent;
                }
                Constraint::Ik(IkConstraint {
                    name: name.clone(),
                    bones,
                    target,
                    mix: *mix,
                    softness: *softness,
                    bend_positive: *bend_positive,
                    compress: *compress,
                    stretch: *stretch,
                })
            }
            Self::Transform {
                name,
                source,
                bones,
                local_source,
                local_target,
                additive,
                clamp,
                offsets,
                mix,
                properties,
            } => Constraint::Transform(TransformConstraint {
                name: name.clone(),
                source: f.bone_index(*source)?,
                bones: bones
                    .iter()
                    .map(|id| f.bone_index(*id))
                    .collect::<Result<_, _>>()?,
                local_source: *local_source,
                local_target: *local_target,
                additive: *additive,
                clamp: *clamp,
                offsets: *offsets,
                mix: *mix,
                properties: properties
                    .iter()
                    .map(|p| {
                        Ok(TransformFrom {
                            property: property(&p.property)?,
                            offset: p.offset,
                            to: p
                                .to
                                .iter()
                                .map(|t| {
                                    Ok(TransformTo {
                                        property: property(&t.property)?,
                                        offset: t.offset,
                                        max: t.max,
                                        scale: t.scale,
                                    })
                                })
                                .collect::<Result<_, AppError>>()?,
                        })
                    })
                    .collect::<Result<_, AppError>>()?,
                editor_ranges: Default::default(),
            }),
            Self::Physics {
                name,
                bone,
                x,
                y,
                scale_x,
                rotate,
                shear_x,
                step,
                inertia,
                strength,
                damping,
                mass,
                wind,
                gravity,
                mix,
                limit,
                globals,
            } => Constraint::Physics(PhysicsConstraint {
                name: name.clone(),
                bone: f.bone_index(*bone)?,
                x: *x,
                y: *y,
                scale_x: *scale_x,
                angular: if rotate.is_none() && *shear_x == 0.0 {
                    PhysicsAngular::default()
                } else {
                    PhysicsAngular::from_wire_bits(
                        rotate.unwrap_or(0.0).to_bits(),
                        shear_x.to_bits(),
                    )?
                },
                step: *step,
                inertia: *inertia,
                strength: *strength,
                damping: *damping,
                mass: *mass,
                wind: *wind,
                gravity: *gravity,
                mix: *mix,
                limit: *limit,
                globals: PhysicsGlobals {
                    inertia: globals.inertia,
                    strength: globals.strength,
                    damping: globals.damping,
                    mass: globals.mass,
                    wind: globals.wind,
                    gravity: globals.gravity,
                    mix: globals.mix,
                },
            }),
        })
    }

    /// Generic property edits do not author the independent nullable editor
    /// cache. Preserve its exact native bits on same-kind Transform updates.
    pub(super) fn build_update(
        &self,
        frame: &SceneFrame,
        previous: &Constraint,
    ) -> Result<Constraint, AppError> {
        let mut next = self.build(frame)?;
        if let (Constraint::Transform(old), Constraint::Transform(new)) = (previous, &mut next) {
            new.editor_ranges = old.editor_ranges;
        }
        Ok(next)
    }
}
