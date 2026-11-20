use super::{checked_frame, invalid};
use crate::{project::AppError, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{BoneKeyframe, KeyCurve};
use std::collections::HashSet;

#[cfg(test)]
#[path = "animation_time_scale_tests.rs"]
mod tests;

struct TimingScale {
    anchor: f32,
    from: f32,
    to: f32,
    factor: f64,
}

impl TimingScale {
    fn new(anchor: f32, from: f32, to: f32) -> Result<Self, AppError> {
        let anchor = checked_frame(anchor)?;
        let from = checked_frame(from)?;
        let to = checked_frame(to)?;
        if from == anchor || to == anchor {
            return Err(invalid("A timing scale needs distinct edges."));
        }
        let factor = (f64::from(to) - f64::from(anchor)) / (f64::from(from) - f64::from(anchor));
        Ok(Self {
            anchor,
            from,
            to,
            factor,
        })
    }

    fn frame(&self, frame: f32) -> Result<f32, AppError> {
        if !(self.anchor.min(self.from)..=self.anchor.max(self.from)).contains(&frame) {
            return Err(invalid("Every selected key must be inside the original timing box."));
        }
        if frame == self.anchor {
            return Ok(frame);
        }
        let next = if frame == self.from {
            self.to
        } else {
            let anchor = f64::from(self.anchor);
            (anchor + (f64::from(frame) - anchor) * self.factor) as f32
        };
        let next = checked_frame(next)?;
        Ok(if frame == next { frame } else { next })
    }
}

fn scale_track(
    keys: &mut Vec<BoneKeyframe>,
    ids: &mut Vec<u64>,
    wanted: &HashSet<u64>,
    scale: &TimingScale,
) -> Result<(), AppError> {
    let frames = keys
        .iter()
        .zip(ids.iter())
        .map(|(key, id)| {
            if wanted.contains(id) {
                scale.frame(key.frame)
            } else {
                Ok(key.frame)
            }
        })
        .collect::<Result<Vec<_>, AppError>>()?;
    let moved = |index: usize| keys[index].frame != frames[index];
    if !(0..keys.len()).any(|index| moved(index)) {
        return Ok(());
    }
    let mut order = (0..keys.len()).collect::<Vec<_>>();
    order.sort_by(|&a, &b| {
        if frames[a] == frames[b] {
            std::cmp::Ordering::Equal
        } else {
            frames[a].total_cmp(&frames[b])
        }
    });
    if order
        .windows(2)
        .any(|pair| frames[pair[0]] == frames[pair[1]] && (moved(pair[0]) || moved(pair[1])))
    {
        return Err(invalid("Scaling key times would collide with another key."));
    }
    let mut successor = vec![None; keys.len()];
    for pair in order.windows(2) {
        successor[pair[0]] = Some(pair[1]);
    }
    for (index, key) in keys.iter().enumerate() {
        let new_next = successor[index];
        let old_next = (index + 1 < keys.len()).then_some(index + 1);
        if old_next.is_none() && new_next.is_none() {
            continue;
        }
        let successor_changed = old_next != new_next || old_next.is_some_and(|next| moved(next));
        if !moved(index) && !successor_changed {
            continue;
        }
        if matches!(key.curve, KeyCurve::Bezier { .. }) {
            return Err(invalid("Scaling this timing box would affect a Bézier interval."));
        }
        if scale.factor < 0. && key.curve == KeyCurve::Stepped {
            return Err(invalid("Reversing key times currently requires linear affected intervals."));
        }
    }
    let sorted_keys = order
        .iter()
        .map(|&index| BoneKeyframe {
            frame: frames[index],
            ..keys[index].clone()
        })
        .collect();
    let sorted_ids = order.into_iter().map(|index| ids[index]).collect();
    *keys = sorted_keys;
    *ids = sorted_ids;
    Ok(())
}

pub(super) fn apply(
    frame: &mut SceneFrame,
    animation: usize,
    wanted: &HashSet<u64>,
    anchor: f32,
    from: f32,
    to: f32,
) -> Result<(), AppError> {
    let scale = TimingScale::new(anchor, from, to)?;
    let track_ids = &mut frame.animation_key_ids[animation];
    let count = track_ids
        .iter()
        .flatten()
        .filter(|id| wanted.contains(*id))
        .count();
    if count != wanted.len() {
        return Err(invalid("Timing scale currently supports bone keys only."));
    }
    for (track, ids) in frame.project.animations[animation]
        .tracks
        .iter_mut()
        .zip(track_ids)
    {
        if ids.iter().any(|id| wanted.contains(id)) {
            scale_track(&mut track.keys, ids, wanted, &scale)?;
        }
    }
    Ok(())
}
