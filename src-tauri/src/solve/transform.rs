use super::{math::wrap, Evaluation, SolveError};
use fbones_format::minimal::scene::{SceneProject, TransformConstraint, TransformProperty as P};

pub(super) fn apply(
    scene: &SceneProject,
    frame: &mut Evaluation,
    c: &TransformConstraint,
    sampled: Option<&super::ConstraintValue>,
) -> Result<(), SolveError> {
    let default = c.mix.map(f64::from);
    let mixes = match sampled {
        Some(super::ConstraintValue::Transform { mixes }) => mixes,
        None => &default,
        _ => return Err(SolveError::InvalidConstraint),
    };
    let count = frame.bones.len();
    if c.source >= count
        || c.bones.is_empty()
        || c.bones.iter().any(|i| *i >= count)
        || c.offsets.iter().chain(c.mix.iter()).any(|v| !v.is_finite())
    {
        return Err(SolveError::InvalidConstraint);
    }
    if !c
        .properties
        .iter()
        .flat_map(|p| &p.to)
        .any(|p| mixes[p.property.index()] != 0.)
    {
        return Ok(());
    }
    let source = frame.bones[c.source];
    let mut values = [0.; 6];
    if c.local_source {
        values = [
            source.applied.rotation,
            source.applied.x,
            source.applied.y,
            source.applied.scale_x,
            source.applied.scale_y,
            source.applied.shear_y,
        ];
        for (value, offset) in values.iter_mut().zip(c.offsets) {
            *value += offset as f64;
        }
    } else {
        let world = source.world;
        let (x, y) = world.point(c.offsets[1] as f64, c.offsets[2] as f64);
        values[0] = (world.heading()
            + if world.determinant() > 0. {
                c.offsets[0] as f64
            } else {
                -(c.offsets[0] as f64)
            })
        .rem_euclid(360.);
        values[1] = x;
        values[2] = y;
        values[3] = world.scale_x() + c.offsets[3] as f64;
        values[4] = world.scale_y() + c.offsets[4] as f64;
        values[5] =
            world.d.atan2(world.c).to_degrees() - world.heading() - 90. + c.offsets[5] as f64;
    }
    for &index in &c.bones {
        let mut local = frame.bones[index].applied;
        let mut world = frame.bones[index].world;
        for from in &c.properties {
            if !from.offset.is_finite() {
                return Err(SolveError::InvalidConstraint);
            }
            let relative = values[from.property.index()] - from.offset as f64;
            for to in &from.to {
                if [to.offset, to.max, to.scale].iter().any(|v| !v.is_finite()) {
                    return Err(SolveError::InvalidConstraint);
                }
                let mut value = to.offset as f64 + relative * to.scale as f64;
                if c.clamp {
                    value = value.clamp(to.offset.min(to.max) as f64, to.offset.max(to.max) as f64)
                }
                let mix = mixes[to.property.index()];
                if mix == 0. {
                    continue;
                }
                if c.local_target {
                    let p = &mut local;
                    let channel = match to.property {
                        P::Rotate => &mut p.rotation,
                        P::X => &mut p.x,
                        P::Y => &mut p.y,
                        P::ScaleX => &mut p.scale_x,
                        P::ScaleY => &mut p.scale_y,
                        P::ShearY => &mut p.shear_y,
                    };
                    let scale = matches!(to.property, P::ScaleX | P::ScaleY);
                    if c.additive && scale {
                        *channel *= 1. + (value - 1.) * mix
                    } else if !(scale && *channel == 0.) {
                        *channel += if c.additive {
                            value * mix
                        } else {
                            (value - *channel) * mix
                        };
                    }
                } else {
                    match to.property {
                        P::Rotate => world.rotate_basis(
                            wrap(if c.additive {
                                value
                            } else {
                                value - world.heading()
                            }) * mix,
                        ),
                        P::X => {
                            world.x += if c.additive {
                                value * mix
                            } else {
                                (value - world.x) * mix
                            }
                        }
                        P::Y => {
                            world.y += if c.additive {
                                value * mix
                            } else {
                                (value - world.y) * mix
                            }
                        }
                        P::ScaleX | P::ScaleY => {
                            let old = if to.property == P::ScaleX {
                                world.scale_x()
                            } else {
                                world.scale_y()
                            };
                            let ratio = if c.additive {
                                1. + (value - 1.) * mix
                            } else if old > 0. {
                                1. + (value - old) * mix / old
                            } else {
                                1.
                            };
                            if to.property == P::ScaleX {
                                world.a *= ratio;
                                world.b *= ratio
                            } else {
                                world.c *= ratio;
                                world.d *= ratio
                            }
                        }
                        P::ShearY => {
                            let heading = world.d.atan2(world.c).to_degrees();
                            let delta = if c.additive {
                                value
                            } else {
                                wrap(value + 90. - heading + world.heading())
                            };
                            let angle = (heading + delta * mix).to_radians();
                            let size = world.scale_y();
                            world.c = angle.cos() * size;
                            world.d = angle.sin() * size;
                        }
                    }
                }
            }
        }
        if c.local_target {
            frame.bones[index].applied = local;
            frame.recompute(scene)?;
        } else {
            frame.set_world(scene, index, world)?;
        }
    }
    Ok(())
}
