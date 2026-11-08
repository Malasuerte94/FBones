//! Non-destructive evaluation of authored bone poses and ordered constraints.
//!
//! The scene remains setup data. Frames belong to an evaluation, never a save
//! snapshot. Physics state is per playback instance and absolute-time clock.
mod ik;
mod math;
mod physics;
#[cfg(test)]
mod tests;
mod transform;
mod values;
use fbones_format::minimal::{
    scene::{Constraint, SceneProject},
    Bone,
};
pub use math::Affine;
pub use physics::PhysicsState;
pub use values::ConstraintValue;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct LocalPose {
    pub x: f64,
    pub y: f64,
    pub rotation: f64,
    pub scale_x: f64,
    pub scale_y: f64,
    pub shear_x: f64,
    pub shear_y: f64,
}
impl From<&Bone> for LocalPose {
    fn from(b: &Bone) -> Self {
        Self {
            x: b.x as f64,
            y: b.y as f64,
            rotation: b.rotation as f64,
            scale_x: b.scale_x as f64,
            scale_y: b.scale_y as f64,
            shear_x: b.shear_x as f64,
            shear_y: b.shear_y as f64,
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BoneFrame {
    pub authored: LocalPose,
    pub applied: LocalPose,
    pub world: Affine,
}
#[derive(Clone, Debug, PartialEq)]
pub struct Evaluation {
    pub bones: Vec<BoneFrame>,
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum StepMode {
    Reset { time: f64 },
    Update { time: f64 },
    Pose,
    None,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SolveError {
    InvalidGraph,
    InvalidPoseCount,
    NonFinite,
    SingularTransform,
    InvalidConstraint,
    InvalidTime,
    StepLimit,
}
impl std::fmt::Display for SolveError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Constraint evaluation: {self:?}")
    }
}
impl std::error::Error for SolveError {}

/// Runs constraints in authored order. Failed evaluations leave caller state
/// untouched, including physics history; invalid input never partially commits.
pub fn evaluate(
    scene: &SceneProject,
    authored: Option<&[LocalPose]>,
    physics: &mut PhysicsState,
    mode: StepMode,
) -> Result<Evaluation, SolveError> {
    evaluate_through(
        scene,
        authored,
        physics,
        mode,
        scene.constraints.len(),
        None,
        &[],
    )
}

/// Internal authoring policy: sample before one ordered constraint, while the
/// complete scene still defines validation and the cached Physics layout.
pub(crate) fn evaluate_prefix(
    scene: &SceneProject,
    authored: Option<&[LocalPose]>,
    physics: &mut PhysicsState,
    mode: StepMode,
    exclusive_constraint: usize,
) -> Result<Evaluation, SolveError> {
    if exclusive_constraint > scene.constraints.len() {
        return Err(SolveError::InvalidConstraint);
    }
    evaluate_through(
        scene,
        authored,
        physics,
        mode,
        exclusive_constraint,
        None,
        &[],
    )
}

/// Uses authored layout for spring lifecycle and borrowed sampled coefficients for application.
pub(crate) fn evaluate_sampled(
    scene: &SceneProject,
    authored: Option<&[LocalPose]>,
    physics: &mut PhysicsState,
    mode: StepMode,
    values: &[ConstraintValue],
    resets: &[usize],
) -> Result<Evaluation, SolveError> {
    evaluate_through(
        scene,
        authored,
        physics,
        mode,
        scene.constraints.len(),
        Some(values),
        resets,
    )
}

fn evaluate_through(
    scene: &SceneProject,
    authored: Option<&[LocalPose]>,
    physics: &mut PhysicsState,
    mode: StepMode,
    constraint_count: usize,
    sampled: Option<&[ConstraintValue]>,
    resets: &[usize],
) -> Result<Evaluation, SolveError> {
    let count = scene.rig.bones.len();
    if count == 0 || count > 4096 {
        return Err(SolveError::InvalidGraph);
    }
    if authored.is_some_and(|p| p.len() != count) {
        return Err(SolveError::InvalidPoseCount);
    }
    let mut bones: Vec<BoneFrame> = Vec::with_capacity(count);
    for (i, bone) in scene.rig.bones.iter().enumerate() {
        if bone.parent.is_some_and(|p| p >= i) || !bone.length.is_finite() || bone.length < 0. {
            return Err(SolveError::InvalidGraph);
        }
        let local = authored.map_or_else(|| LocalPose::from(bone), |p| p[i]);
        if !local.finite() {
            return Err(SolveError::NonFinite);
        }
        let world = match bone.parent {
            Some(parent) => bones[parent].world.compose(local.affine()),
            None => local.affine(),
        };
        bones.push(BoneFrame {
            authored: local,
            applied: local,
            world,
        });
    }
    validate_constraints(scene, mode)?;
    if let Some(values) = sampled {
        if values.len() != scene.constraints.len() {
            return Err(SolveError::InvalidConstraint);
        }
        for (value, setup) in values.iter().zip(&scene.constraints) {
            value.validate(setup)?;
        }
    }
    if resets
        .iter()
        .any(|i| !matches!(scene.constraints.get(*i), Some(Constraint::Physics(_))))
    {
        return Err(SolveError::InvalidConstraint);
    }
    let mut frame = Evaluation { bones };
    let mut candidate = physics.clone();
    candidate.prepare(scene, mode)?;
    for index in resets {
        candidate.reset_constraint(*index)?;
    }
    for (i, constraint) in scene.constraints.iter().take(constraint_count).enumerate() {
        match constraint {
            Constraint::Ik(c) => ik::apply(scene, &mut frame, c, sampled.map(|v| &v[i]))?,
            Constraint::Transform(c) => {
                transform::apply(scene, &mut frame, c, sampled.map(|v| &v[i]))?
            }
            Constraint::Physics(c) => physics::apply(
                scene,
                &mut frame,
                c,
                &mut candidate,
                i,
                mode,
                sampled.map(|v| &v[i]),
            )?,
        }
    }
    if frame
        .bones
        .iter()
        .any(|b| !b.applied.finite() || !b.world.finite())
    {
        return Err(SolveError::NonFinite);
    }
    if !candidate.finite() {
        return Err(SolveError::NonFinite);
    }
    *physics = candidate;
    Ok(frame)
}
impl Evaluation {
    pub(super) fn recompute(&mut self, scene: &SceneProject) -> Result<(), SolveError> {
        for i in 0..self.bones.len() {
            self.bones[i].world = match scene.rig.bones[i].parent {
                Some(parent) => self.bones[parent]
                    .world
                    .compose(self.bones[i].applied.affine()),
                None => self.bones[i].applied.affine(),
            };
            if !self.bones[i].world.finite() {
                return Err(SolveError::NonFinite);
            }
        }
        Ok(())
    }
    pub(super) fn set_world(
        &mut self,
        scene: &SceneProject,
        index: usize,
        world: Affine,
    ) -> Result<(), SolveError> {
        let local = match scene.rig.bones[index].parent {
            Some(p) => self.bones[p].world.inverse()?.compose(world),
            None => world,
        };
        self.bones[index].applied = LocalPose::from_affine(local, self.bones[index].applied)?;
        self.recompute(scene)
    }
    pub(super) fn parent_world(&self, scene: &SceneProject, index: usize) -> Affine {
        scene.rig.bones[index]
            .parent
            .map_or(Affine::IDENTITY, |p| self.bones[p].world)
    }
}

fn validate_constraints(scene: &SceneProject, mode: StepMode) -> Result<(), SolveError> {
    use std::collections::HashSet;
    let mut names = HashSet::new();
    for c in &scene.constraints {
        if c.name().is_empty() || !names.insert(c.name()) {
            return Err(SolveError::InvalidConstraint);
        }
        let bones = match c {
            Constraint::Ik(c) => Some(&c.bones),
            Constraint::Transform(c) => Some(&c.bones),
            Constraint::Physics(_) => None,
        };
        if let Some(indices) = bones {
            let mut seen = HashSet::new();
            if indices.is_empty()
                || indices
                    .iter()
                    .any(|i| *i >= scene.rig.bones.len() || !seen.insert(i))
            {
                return Err(SolveError::InvalidConstraint);
            }
        }
        match c {
            Constraint::Ik(c) => {
                if !(0.0..=1.0).contains(&c.mix)
                    || c.target >= scene.rig.bones.len()
                    || !(1..=2).contains(&c.bones.len())
                    || !c.softness.is_finite()
                    || c.softness < 0.
                    || (c.mix != 0.
                        && c.bones.len() == 2
                        && scene.rig.bones[c.bones[1]].parent != Some(c.bones[0]))
                {
                    return Err(SolveError::InvalidConstraint);
                }
                let mut ancestor = Some(c.target);
                while let Some(index) = ancestor {
                    if c.bones.contains(&index) {
                        return Err(SolveError::InvalidConstraint);
                    }
                    ancestor = scene.rig.bones[index].parent;
                }
            }
            Constraint::Transform(c) => {
                if c.mix.iter().any(|m| !m.is_finite())
                    || c.properties.len() > 6
                    || c.source >= scene.rig.bones.len()
                    || c.offsets.iter().any(|v| !v.is_finite())
                {
                    return Err(SolveError::InvalidConstraint);
                }
                let mut from = HashSet::new();
                for p in &c.properties {
                    let mut to = HashSet::new();
                    if !p.offset.is_finite()
                        || p.to.iter().any(|t| {
                            !t.offset.is_finite() || !t.max.is_finite() || !t.scale.is_finite()
                        })
                    {
                        return Err(SolveError::InvalidConstraint);
                    }
                    if !from.insert(p.property)
                        || p.to.is_empty()
                        || p.to.len() > 6
                        || p.to.iter().any(|t| !to.insert(t.property))
                    {
                        return Err(SolveError::InvalidConstraint);
                    }
                }
            }
            Constraint::Physics(c) => {
                if c.bone >= scene.rig.bones.len()
                    || [
                        c.x, c.y, c.scale_x, c.step, c.inertia, c.strength, c.damping, c.mass,
                        c.wind, c.gravity, c.mix, c.limit,
                    ]
                    .iter()
                    .any(|v| !v.is_finite())
                    || c.step <= 0.
                    || c.mass <= 0.
                    || c.limit < 0.
                    || c.damping < 0.
                {
                    return Err(SolveError::InvalidConstraint);
                }
                // Preserve the full evaluator's dormant/None angular behavior.
                if c.mix != 0.
                    && !matches!(mode, StepMode::None)
                    && c.angular.effective().iter().any(|v| !v.is_finite())
                {
                    return Err(SolveError::InvalidConstraint);
                }
            }
        }
    }
    Ok(())
}
