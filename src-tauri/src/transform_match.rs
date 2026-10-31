//! Native parameter authoring from one caller-validated evaluated frame.
//! Arithmetic/default/sampling policy: TRANSFORM-MATCH-IMPLEMENTATION-POLICY.md.
//! This is independently implemented parameter matching, not proprietary math.
use crate::{project::AppError, solve::Evaluation};
#[cfg(test)]
use fbones_format::minimal::scene::TransformProperty as P;
use fbones_format::minimal::scene::{FiniteF32, SceneProject, TransformConstraint};
use serde::Deserialize;

#[cfg(test)]
mod tests;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MatchSection {
    Offsets,
    Properties,
}

fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("InvalidTransformMatch", message)
}
fn stored(value: f64) -> Result<f32, AppError> {
    let result = value as f32;
    if !value.is_finite() || !result.is_finite() {
        return Err(invalid(
            "The matched value exceeds finite project precision.",
        ));
    }
    Ok(result)
}
fn cell(value: f32) -> Result<Option<FiniteF32>, AppError> {
    FiniteF32::new(value)
        .map(Some)
        .map_err(|_| invalid("The matched endpoint must be finite."))
}
fn wrap(value: f64) -> f64 {
    let result = (value + 180.).rem_euclid(360.) - 180.;
    if result <= -180. {
        180.
    } else {
        result
    }
}
fn channels(frame: &Evaluation, index: usize, local: bool) -> [f64; 6] {
    let bone = frame.bones[index];
    if local {
        let p = bone.applied;
        [p.rotation, p.x, p.y, p.scale_x, p.scale_y, p.shear_y - 90.]
    } else {
        let w = bone.world;
        [
            w.heading(),
            w.x,
            w.y,
            w.scale_x() * if w.determinant() < 0. { -1. } else { 1. },
            w.scale_y(),
            w.d.atan2(w.c).to_degrees() - w.heading() - 90.,
        ]
    }
}

fn validate(
    scene: &SceneProject,
    c: &TransformConstraint,
    frame: &Evaluation,
) -> Result<(), AppError> {
    let count = scene.rig.bones.len();
    if count == 0
        || count != frame.bones.len()
        || c.source >= count
        || c.bones.is_empty()
        || c.bones.len() > 128
        || c.bones.iter().any(|i| *i >= count)
        || c.properties.len() > 6
        || c.offsets.iter().any(|v| !v.is_finite())
        || c.mix
            .iter()
            .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
        || frame
            .bones
            .iter()
            .any(|b| !b.authored.finite() || !b.applied.finite() || !b.world.finite())
    {
        return Err(invalid(
            "Match requires valid constraint references and one complete finite pose.",
        ));
    }
    for (i, target) in c.bones.iter().enumerate() {
        if c.bones[..i].contains(target) {
            return Err(invalid("Constrained bone references must be distinct."));
        }
    }
    let mut from_seen = [false; 6];
    for from in &c.properties {
        let i = from.property.index();
        if from_seen[i] || !from.offset.is_finite() || from.to.is_empty() || from.to.len() > 6 {
            return Err(invalid(
                "Match requires distinct source rows and valid destination routes.",
            ));
        }
        from_seen[i] = true;
        let mut to_seen = [false; 6];
        for to in &from.to {
            let j = to.property.index();
            if to_seen[j] || [to.offset, to.max, to.scale].iter().any(|v| !v.is_finite()) {
                return Err(invalid(
                    "Match requires distinct finite destinations in each source row.",
                ));
            }
            to_seen[j] = true;
        }
    }
    Ok(())
}

/// Resolved endpoints are ephemeral. Reading an absent cell never materializes
/// it. Destination defaults are shared by channel, not last-writer per edge.
fn old_spans(c: &TransformConstraint) -> Result<([f64; 6], [f64; 6]), AppError> {
    let values =
        crate::transform_ranges::resolved_endpoints(c).map_err(|error| invalid(error.message))?;
    let source = std::array::from_fn(|i| values[i * 4 + 1] - values[i * 4]);
    let destination = std::array::from_fn(|i| values[i * 4 + 3] - values[i * 4 + 2]);
    if source.iter().chain(&destination).any(|v| !v.is_finite()) {
        return Err(invalid("Existing ranges cannot resolve to finite spans."));
    }
    Ok((source, destination))
}

/// Pure staged operation: the caller owns epoch/revision validation and history.
pub(crate) fn matched(
    scene: &SceneProject,
    c: &TransformConstraint,
    frame: &Evaluation,
    section: MatchSection,
) -> Result<TransformConstraint, AppError> {
    validate(scene, c, frame)?;
    let target_index = c.bones[0];
    let mut source = channels(frame, c.source, c.local_source);
    let target = channels(frame, target_index, c.local_target);
    let mut next = c.clone();
    if section == MatchSection::Offsets {
        for i in 0..6 {
            let value = target[i] - source[i];
            next.offsets[i] = stored(if i == 0 || i == 5 { wrap(value) } else { value })?;
        }
        if !c.local_source && !c.local_target {
            let inverse = frame.bones[c.source].world.inverse().map_err(|_| {
                invalid(
                    "The source world transform is singular; world translation cannot be matched.",
                )
            })?;
            let world = frame.bones[target_index].world;
            let (x, y) = inverse.point(world.x, world.y);
            next.offsets[1] = stored(x)?;
            next.offsets[2] = stored(y)?;
        }
        return Ok(next);
    }

    if c.properties.is_empty() {
        return Ok(next);
    }
    source[1] -= f64::from(c.offsets[1]);
    source[2] -= f64::from(c.offsets[2]);
    let (source_spans, destination_spans) = old_spans(c)?;
    let mut sources = [None; 6];
    let mut destinations = [None; 6];
    for from in &c.properties {
        let i = from.property.index();
        let start = stored(source[i])?;
        let end = stored(f64::from(start) + source_spans[i])?;
        let denominator = end - start;
        if denominator == 0. || !denominator.is_finite() {
            return Err(invalid(
                "The matched source span collapses at project precision.",
            ));
        }
        sources[i] = Some((start, end));
        next.editor_ranges[i].source_start = cell(start)?;
        next.editor_ranges[i].source_end = cell(end)?;
        for to in &from.to {
            let j = to.property.index();
            if destinations[j].is_none() {
                let start = stored(target[j])?;
                let end = stored(f64::from(start) + destination_spans[j])?;
                destinations[j] = Some((start, end));
                next.editor_ranges[j].destination_start = cell(start)?;
                next.editor_ranges[j].destination_end = cell(end)?;
            }
        }
    }
    for from in &mut next.properties {
        let (start, end) = sources[from.property.index()]
            .ok_or_else(|| invalid("Missing matched source range."))?;
        from.offset = start;
        let denominator = end - start;
        for to in &mut from.to {
            let (start, end) = destinations[to.property.index()]
                .ok_or_else(|| invalid("Missing matched destination range."))?;
            let scale = (end - start) / denominator;
            if !scale.is_finite() {
                return Err(invalid(
                    "The matched runtime scale exceeds finite project precision.",
                ));
            }
            to.offset = start;
            to.max = end;
            to.scale = scale;
        }
    }
    Ok(next)
}
