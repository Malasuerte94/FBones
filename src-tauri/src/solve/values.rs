//! Transient numeric coefficients, separate from authored layout/reset identity.
use super::SolveError;
use fbones_format::minimal::scene::Constraint;
#[derive(Clone, Debug, PartialEq)]
pub enum ConstraintValue {
    Ik {
        mix: f64,
        softness: f64,
        stretch: bool,
        compress: bool,
        bend_positive: bool,
    },
    Transform {
        mixes: [f64; 6],
    },
    Physics {
        inertia: f64,
        strength: f64,
        damping: f64,
        mass: f64,
        wind: f64,
        gravity: f64,
        mix: f64,
    },
}
impl From<&Constraint> for ConstraintValue {
    fn from(c: &Constraint) -> Self {
        match c {
            Constraint::Ik(c) => Self::Ik {
                mix: c.mix.into(),
                softness: c.softness.into(),
                stretch: c.stretch,
                compress: c.compress,
                bend_positive: c.bend_positive,
            },
            Constraint::Transform(c) => Self::Transform {
                mixes: c.mix.map(f64::from),
            },
            Constraint::Physics(c) => Self::Physics {
                inertia: c.inertia.into(),
                strength: c.strength.into(),
                damping: c.damping.into(),
                mass: c.mass.into(),
                wind: c.wind.into(),
                gravity: c.gravity.into(),
                mix: c.mix.into(),
            },
        }
    }
}
impl ConstraintValue {
    pub(crate) fn validate(&self, authored: &Constraint) -> Result<(), SolveError> {
        let valid = match (self, authored) {
            (Self::Ik { mix, softness, .. }, Constraint::Ik(_)) => {
                (0. ..=1.).contains(mix)
                    && softness.is_finite()
                    && *softness >= 0.
                    && *softness <= 1_000_000.
            }
            (Self::Transform { mixes }, Constraint::Transform(_)) => {
                mixes.iter().all(|v| v.is_finite() && v.abs() <= 1_000_000.)
            }
            (
                Self::Physics {
                    inertia,
                    strength,
                    damping,
                    mass,
                    wind,
                    gravity,
                    mix,
                },
                Constraint::Physics(_),
            ) => {
                [*inertia, *strength, *damping, *mass, *wind, *gravity, *mix]
                    .iter()
                    .all(|v| v.is_finite() && v.abs() <= 1_000_000.)
                    && *damping >= 0.
                    && *mass > 0.
            }
            _ => false,
        };
        if valid {
            Ok(())
        } else {
            Err(SolveError::InvalidConstraint)
        }
    }
}
