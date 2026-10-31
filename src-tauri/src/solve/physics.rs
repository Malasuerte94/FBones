//! Independent fixed-step spring state. No state lives in the saved SceneProject.
use super::{math::wrap, Affine, Evaluation, SolveError, StepMode};
use fbones_format::minimal::scene::{Constraint, PhysicsConstraint, SceneProject};

#[derive(Clone, Copy, Debug, Default, PartialEq)]
struct Oscillator {
    position: f64,
    velocity: f64,
    lag: f64,
}
impl Oscillator {
    fn tick(&mut self, force: f64, strength: f64, mass: f64, step: f64, retention: f64) {
        self.velocity += (force - strength * self.position) * step / mass;
        self.position += self.velocity * step;
        self.velocity *= retention;
    }
    fn visible(self, fraction: f64) -> f64 {
        self.position - self.lag * (1. - fraction).max(0.)
    }
}
#[derive(Clone, Debug, Default, PartialEq)]
struct Spring {
    last_time: Option<f64>,
    remaining: f64,
    anchor: (f64, f64),
    origin: (f64, f64),
    tip: (f64, f64),
    channels: [Oscillator; 4],
}
#[derive(Clone, Debug, Default, PartialEq)]
pub struct PhysicsState {
    layout: Vec<Constraint>,
    springs: Vec<Spring>,
}
impl PhysicsState {
    pub(super) fn finite(&self) -> bool {
        self.springs.iter().all(|s| {
            [
                s.remaining,
                s.anchor.0,
                s.anchor.1,
                s.origin.0,
                s.origin.1,
                s.tip.0,
                s.tip.1,
            ]
            .iter()
            .all(|v| v.is_finite())
                && s.channels.iter().all(|c| {
                    [c.position, c.velocity, c.lag]
                        .iter()
                        .all(|v| v.is_finite())
                })
        })
    }
    /// Call after a timeline discontinuity, project switch or edited setup pose.
    pub fn clear(&mut self) {
        self.layout.clear();
        self.springs.clear();
    }
    pub(super) fn reset_constraint(&mut self, index: usize) -> Result<(), SolveError> {
        let spring = self
            .springs
            .get_mut(index)
            .ok_or(SolveError::InvalidConstraint)?;
        *spring = Spring::default();
        Ok(())
    }
    pub(super) fn prepare(
        &mut self,
        scene: &SceneProject,
        mode: StepMode,
    ) -> Result<(), SolveError> {
        if let StepMode::Reset { time } | StepMode::Update { time } = mode {
            if !time.is_finite() || time < 0. {
                return Err(SolveError::InvalidTime);
            }
        }
        let backwards = match mode {
            StepMode::Update { time } => self
                .springs
                .iter()
                .any(|s| s.last_time.is_some_and(|t| time < t)),
            _ => false,
        };
        if self.layout != scene.constraints || matches!(mode, StepMode::Reset { .. }) || backwards {
            self.layout = scene.constraints.clone();
            self.springs = vec![Spring::default(); scene.constraints.len()];
        }
        Ok(())
    }
}
const MAX_STEPS: usize = 4096;
pub(super) fn apply(
    scene: &SceneProject,
    frame: &mut Evaluation,
    c: &PhysicsConstraint,
    state: &mut PhysicsState,
    index: usize,
    mode: StepMode,
    sampled: Option<&super::ConstraintValue>,
) -> Result<(), SolveError> {
    let values = sampled.cloned().unwrap_or(super::ConstraintValue::Physics {
        inertia: c.inertia.into(),
        strength: c.strength.into(),
        damping: c.damping.into(),
        mass: c.mass.into(),
        wind: c.wind.into(),
        gravity: c.gravity.into(),
        mix: c.mix.into(),
    });
    let super::ConstraintValue::Physics {
        inertia,
        strength,
        damping,
        mass,
        wind,
        gravity,
        mix,
    } = values
    else {
        return Err(SolveError::InvalidConstraint);
    };
    if c.bone >= frame.bones.len()
        || [
            c.x, c.y, c.scale_x, c.step, c.inertia, c.strength, c.damping, c.mass, c.wind,
            c.gravity, c.mix, c.limit,
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
    if mix == 0. || matches!(mode, StepMode::None) {
        return Ok(());
    }
    let angular = c.angular.effective();
    let (r, s) = (angular[0] as f64, angular[1] as f64);
    if !r.is_finite() || !s.is_finite() {
        return Err(SolveError::InvalidConstraint);
    }
    let spring = &mut state.springs[index];
    let h = c.step as f64;
    let length = scene.rig.bones[c.bone].length as f64;
    let mut world = frame.bones[c.bone].world;
    if let StepMode::Reset { time } | StepMode::Update { time } = mode {
        if let Some(previous) = spring.last_time {
            let delta = (time - previous).max(0.);
            let old_fraction = spring.remaining / h;
            let total = spring.remaining + delta;
            let steps = ((total / h) + 1e-7).floor() as usize;
            if steps > MAX_STEPS {
                return Err(SolveError::StepLimit);
            }
            let fraction = (total - steps as f64 * h).max(0.) / h;
            let max_move = c.limit as f64 * delta;
            let incoming = (world.x, world.y);
            if c.x > 0. {
                spring.channels[0].position +=
                    ((spring.anchor.0 - incoming.0) * inertia).clamp(-max_move, max_move);
                spring.anchor.0 = incoming.0;
            }
            if c.y > 0. {
                spring.channels[1].position +=
                    ((spring.anchor.1 - incoming.1) * inertia).clamp(-max_move, max_move);
                spring.anchor.1 = incoming.1;
            }
            let retention = damping.powf(60. * h);
            let stiffness = strength;
            let before = [spring.channels[0].position, spring.channels[1].position];
            for _ in 0..steps {
                if c.x > 0. {
                    spring.channels[0].tick(100. * wind, stiffness, mass, h, retention);
                }
                if c.y > 0. {
                    spring.channels[1].tick(-100. * gravity, stiffness, mass, h, retention);
                }
            }
            if steps > 0 {
                for (channel, start) in spring.channels.iter_mut().take(2).zip(before) {
                    channel.lag = channel.position - start;
                }
            }
            if c.x > 0. {
                world.x += spring.channels[0].visible(fraction) * mix * c.x as f64;
            }
            if c.y > 0. {
                world.y += spring.channels[1].visible(fraction) * mix * c.y as f64;
            }
            let angular_enabled = r > 0. || s > 0.;
            if angular_enabled || c.scale_x > 0. {
                let dx = (spring.origin.0 - world.x).clamp(-max_move, max_move);
                let dy = (spring.origin.1 - world.y).clamp(-max_move, max_move);
                let base = world.heading().to_radians();
                let angle_strength = (r + s) * mix;
                let old_angle = spring.channels[2].visible(old_fraction);
                let mut orientation = base;
                if angular_enabled {
                    let history_angle = (spring.tip.1 + dy).atan2(spring.tip.0 + dx);
                    let inertia_angle =
                        wrap((history_angle - base - old_angle * angle_strength).to_degrees())
                            .to_radians();
                    spring.channels[2].position += inertia_angle * inertia;
                    orientation = base
                        + (spring.channels[2].position
                            - spring.channels[2].lag * (1. - old_fraction).max(0.))
                            * angle_strength;
                }
                if c.scale_x > 0. {
                    let mut size = length * world.scale_x();
                    if !angular_enabled {
                        size -= spring.channels[3].lag * (1. - old_fraction).max(0.);
                    }
                    if size > 1e-12 {
                        spring.channels[3].position +=
                            (dx * orientation.cos() + dy * orientation.sin()) * inertia / size;
                    }
                }
                let before_angle = spring.channels[2].position;
                let before_scale = spring.channels[3].position;
                for _ in 0..steps {
                    let (sin, cos) = orientation.sin_cos();
                    if c.scale_x > 0. {
                        spring.channels[3].tick(
                            wind * cos - gravity * sin,
                            stiffness,
                            mass,
                            h,
                            retention,
                        );
                    }
                    if angular_enabled {
                        spring.channels[2].tick(
                            -(wind * sin + gravity * cos) * length / 100.,
                            stiffness,
                            mass,
                            h,
                            retention,
                        );
                        orientation = base + spring.channels[2].position * angle_strength;
                    }
                }
                if steps > 0 {
                    spring.channels[2].lag = spring.channels[2].position - before_angle;
                    spring.channels[3].lag = spring.channels[3].position - before_scale;
                }
            }
            spring.remaining = fraction * h;
        } else {
            spring.anchor = (world.x, world.y);
        }
        spring.last_time = Some(time);
        spring.origin = (world.x, world.y);
    } else if matches!(mode, StepMode::Pose) {
        let fraction = spring.remaining / h;
        if c.x > 0. {
            world.x += spring.channels[0].visible(fraction) * mix * c.x as f64;
        }
        if c.y > 0. {
            world.y += spring.channels[1].visible(fraction) * mix * c.y as f64;
        }
    }
    apply_basis(&mut world, spring, mix, r, s, c.scale_x as f64, h);
    if !matches!(mode, StepMode::Pose) {
        spring.tip = (length * world.a, length * world.b);
    }
    frame.set_world(scene, c.bone, world)
}
fn apply_basis(
    world: &mut Affine,
    spring: &Spring,
    mix: f64,
    rotate: f64,
    shear: f64,
    scale: f64,
    step: f64,
) {
    let angle = spring.channels[2].visible(spring.remaining / step) * mix;
    let x_angle = angle * (rotate + shear);
    let y_angle = angle * rotate;
    let rotate_vector = |x: f64, y: f64, angle: f64| {
        let (s, c) = angle.sin_cos();
        (c * x - s * y, s * x + c * y)
    };
    (world.a, world.b) = rotate_vector(world.a, world.b, x_angle);
    (world.c, world.d) = rotate_vector(world.c, world.d, y_angle);
    if scale > 0. {
        let factor = 1. + spring.channels[3].visible(spring.remaining / step) * mix * scale;
        world.a *= factor;
        world.b *= factor;
    }
}
