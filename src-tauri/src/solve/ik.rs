//! Geometric IK, independently expressed as a radial ellipse intersection.
//! No runtime implementation is embedded. See numeric oracle evidence notes.
use super::{math::wrap, Evaluation, SolveError};
use fbones_format::minimal::scene::{IkConstraint, SceneProject};

pub(super) fn apply(
    scene: &SceneProject,
    frame: &mut Evaluation,
    c: &IkConstraint,
    sampled: Option<&super::ConstraintValue>,
) -> Result<(), SolveError> {
    let values = sampled.cloned().unwrap_or(super::ConstraintValue::Ik {
        mix: c.mix.into(),
        softness: c.softness.into(),
        stretch: c.stretch,
        compress: c.compress,
        bend_positive: c.bend_positive,
    });
    let super::ConstraintValue::Ik {
        mix,
        softness: sample_softness,
        stretch,
        compress,
        bend_positive,
    } = values
    else {
        return Err(SolveError::InvalidConstraint);
    };
    let n = frame.bones.len();
    if !(1..=2).contains(&c.bones.len())
        || c.target >= n
        || c.bones.iter().any(|b| *b >= n)
        || !c.mix.is_finite()
        || !c.softness.is_finite()
        || c.softness < 0.
    {
        return Err(SolveError::InvalidConstraint);
    }
    if mix == 0. {
        return Ok(());
    }
    let target = (frame.bones[c.target].world.x, frame.bones[c.target].world.y);
    if c.bones.len() == 1 {
        return single(scene, frame, c.bones[0], target, compress, stretch, mix);
    }
    let (parent, child) = (c.bones[0], c.bones[1]);
    if scene.rig.bones[child].parent != Some(parent) {
        return Err(SolveError::InvalidConstraint);
    }
    let mut upper = frame.bones[parent].applied;
    let mut lower = frame.bones[child].applied;
    let inverse = frame.parent_world(scene, parent).inverse()?;
    let (tx, ty) = inverse.point(target.0, target.1);
    let (mut dx, mut dy) = (tx - upper.x, ty - upper.y);
    let uniform = (upper.scale_x.abs() - upper.scale_y.abs()).abs() < 1e-6;
    if !uniform || stretch {
        lower.y = 0.;
    }
    let first = upper.affine().vector(lower.x, lower.y);
    let l1 = first.0.hypot(first.1);
    if l1 < 1e-8 {
        single(scene, frame, parent, target, false, stretch, mix)?;
        frame.bones[child].applied.rotation = 0.;
        return frame.recompute(scene);
    }
    let second = scene.rig.bones[child].length as f64 * lower.scale_x.abs();
    let reach = l1 + second * upper.scale_x.abs();
    let distance = dx.hypot(dy);
    let softness = sample_softness * upper.scale_x.abs() * (lower.scale_x.abs() + 1.) / 2.;
    if softness > 0. && distance > reach - softness && distance > 0. {
        let u = ((distance - reach + softness) / (2. * softness)).clamp(0., 1.);
        let eased = reach - softness + softness * (2. * u - u * u);
        dx *= eased / distance;
        dy *= eased / distance;
    }
    let distance = dx.hypot(dy);
    if stretch && uniform && distance > reach && reach > 1e-8 {
        upper.scale_x *= 1. + (distance / reach - 1.) * mix;
    }
    let flip = if upper.scale_x * upper.scale_y < 0. {
        -1.
    } else {
        1.
    };
    let bend = if bend_positive { 1. } else { -1. };
    let offset = lower.y.atan2(lower.x);
    // Effective lower-axis angle is offset +/- elbow angle. Parent rotation
    // then aligns the complete two-link vector with the radial target.
    let local_axis = |beta: f64| -> f64 { offset + beta * bend * flip };
    let original_scale = frame.bones[parent].applied.scale_x;
    let mut radial_upper = upper;
    // Stretch is mixed independently from rotation, whose goal is computed
    // from the un-stretched chain, as shown by partial-mix reference cases.
    radial_upper.scale_x = original_scale;
    radial_upper.rotation = 0.;
    let basis = radial_upper.affine();
    let point = |beta: f64| {
        let angle = local_axis(beta);
        let (x, y) = (
            lower.x + second * angle.cos(),
            lower.y + second * angle.sin(),
        );
        basis.vector(x, y)
    };
    let radius = |beta: f64| {
        let (x, y) = point(beta);
        x.hypot(y)
    };
    let desired = distance;
    let mut beta = 0.;
    let mut best = (radius(0.) - desired).abs();
    // Finite bounded search handles nonuniform/sheared ellipses as well as
    // unreachable targets. Bracket crossings are refined by bisection.
    const SAMPLES: usize = 192;
    let mut previous = radius(0.) - desired;
    for k in 1..=SAMPLES {
        let next = std::f64::consts::PI * k as f64 / SAMPLES as f64;
        let error = radius(next) - desired;
        if error.abs() < best {
            best = error.abs();
            beta = next;
        }
        if previous * error < 0. {
            let mut lo = std::f64::consts::PI * (k - 1) as f64 / SAMPLES as f64;
            let mut hi = next;
            let mut sign = previous;
            for _ in 0..48 {
                let mid = (lo + hi) / 2.;
                let f = radius(mid) - desired;
                if sign * f <= 0. {
                    hi = mid
                } else {
                    lo = mid;
                    sign = f;
                }
            }
            beta = (lo + hi) / 2.;
            break;
        }
        previous = error;
    }
    let (qx, qy) = point(beta);
    let desired_parent = (dy.atan2(dx) - qy.atan2(qx)).to_degrees();
    let desired_child =
        local_axis(beta).to_degrees() - lower.shear_x + if lower.scale_x < 0. { 180. } else { 0. };
    upper.rotation += wrap(desired_parent - upper.rotation) * mix;
    lower.rotation += wrap(desired_child - lower.rotation) * mix;
    frame.bones[parent].applied = upper;
    frame.bones[child].applied = lower;
    frame.recompute(scene)
}
fn single(
    scene: &SceneProject,
    frame: &mut Evaluation,
    index: usize,
    target: (f64, f64),
    compress: bool,
    stretch: bool,
    mix: f64,
) -> Result<(), SolveError> {
    let local_target = frame
        .parent_world(scene, index)
        .inverse()?
        .point(target.0, target.1);
    let p = &mut frame.bones[index].applied;
    let (dx, dy) = (local_target.0 - p.x, local_target.1 - p.y);
    let desired = dy.atan2(dx).to_degrees() - p.shear_x + if p.scale_x < 0. { 180. } else { 0. };
    p.rotation += wrap(desired - p.rotation) * mix;
    let length = scene.rig.bones[index].length as f64 * p.scale_x;
    let distance = dx.hypot(dy);
    if length > 1e-8 && ((compress && distance < length) || (stretch && distance > length)) {
        p.scale_x *= 1. + (distance / length - 1.) * mix;
    }
    frame.recompute(scene)
}
