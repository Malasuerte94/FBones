//! Session-only basis for cyclic bone-row retiming. The authored row stays typed.
use crate::{animation, project::AppError, rig::AnimationOffsetRange, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{bezier_time_monotone, BoneChannel, BoneKeyframe, KeyCurve};

#[cfg(test)]
#[path = "animation_offset_tests.rs"]
mod tests;

#[derive(Clone)]
pub(crate) struct OffsetBasis {
    animation: u64,
    anchor: u64,
    bone: u64,
    channel: BoneChannel,
    start: f32,
    end: f32,
    explicit: bool,
    first: usize,
    last: usize,
    keys: Vec<BoneKeyframe>,
    ids: Vec<u64>,
    phase: f64,
    start_seam: Option<u64>,
    end_seam: Option<u64>,
}

fn invalid(message: &str) -> AppError {
    AppError::new("InvalidAnimationOffset", message)
}

pub(crate) fn apply(
    frame: &mut SceneFrame,
    next_key: &mut u64,
    previous: Option<&OffsetBasis>,
    animation: u64,
    key: u64,
    delta_frames: f32,
    continue_offset: bool,
    loop_range: Option<AnimationOffsetRange>,
) -> Result<Option<OffsetBasis>, AppError> {
    if !delta_frames.is_finite() {
        return Err(invalid("Use a finite Offset distance."));
    }
    let a = frame
        .animation_ids
        .iter()
        .position(|id| *id == animation)
        .ok_or_else(|| invalid("Choose an existing animation for Offset."))?;
    let row = frame.animation_key_ids[a]
        .iter()
        .position(|ids| ids.contains(&key))
        .ok_or_else(|| invalid("Choose a bone property key for Offset."))?;
    let clip = &frame.project.animations[a];
    let track = &clip.tracks[row];
    let bone = frame.bone_ids[track.bone];
    let (start, end) = if let Some(range) = loop_range {
        (
            animation::checked_frame(range.start)?,
            animation::checked_frame(range.end)?,
        )
    } else {
        (0., animation::checked_frame(animation::duration(clip))?)
    };
    let explicit = loop_range.is_some();
    if end <= start {
        return Err(invalid(if explicit {
            "Offset needs a Loop End later than Loop Start."
        } else {
            "Offset requires a positive authored animation duration."
        }));
    }

    let mut basis = if continue_offset {
        previous
            .filter(|basis| {
                basis.animation == animation
                    && basis.anchor == key
                    && basis.bone == bone
                    && basis.channel == track.channel
                    && basis.explicit == explicit
                    && basis.start == start
                    && basis.end == end
            })
            .cloned()
            .ok_or_else(|| invalid("The Offset source changed. Start a new Offset drag."))?
    } else {
        let (first, last) = validate_source(&track.keys, start, end, explicit)?;
        let ids = &frame.animation_key_ids[a][row];
        if explicit && !ids[first + 1..last].contains(&key) {
            return Err(invalid(
                "Choose a bone property key strictly inside the Offset Loop.",
            ));
        }
        OffsetBasis {
            animation,
            anchor: key,
            bone,
            channel: track.channel,
            start,
            end,
            explicit,
            first,
            last,
            keys: track.keys.clone(),
            ids: ids.clone(),
            phase: 0.,
            start_seam: None,
            end_seam: None,
        }
    };

    let period = f64::from(end) - f64::from(start);
    let phase = (basis.phase + f64::from(delta_frames)).rem_euclid(period);
    // An unrepresentably small distance can leave the seam on either bound.
    let seam = f64::from(end) - phase;
    let phase = if phase >= period || seam <= f64::from(start) || seam >= f64::from(end) {
        0.
    } else {
        phase
    };
    if phase == basis.phase {
        return Ok(None);
    }
    basis.phase = phase;
    let mut candidate_next = *next_key;
    let (keys, ids) = if phase == 0. {
        (basis.keys.clone(), basis.ids.clone())
    } else {
        basis.wrap(&mut candidate_next)?
    };
    let old_keys = std::mem::replace(&mut frame.project.animations[a].tracks[row].keys, keys);
    if let Err(error) = animation::validate_curves(&frame.project) {
        frame.project.animations[a].tracks[row].keys = old_keys;
        return Err(error);
    }
    frame.animation_key_ids[a][row] = ids;
    frame.focus.animation = Some(animation);
    *next_key = candidate_next;
    Ok(Some(basis))
}

fn validate_source(
    keys: &[BoneKeyframe],
    start: f32,
    end: f32,
    explicit: bool,
) -> Result<(usize, usize), AppError> {
    if keys.is_empty() {
        return Err(invalid("Choose a closed bone property row for Offset."));
    }
    let first = if explicit {
        keys.partition_point(|key| key.frame < start)
    } else {
        0
    };
    let last = if explicit {
        keys.partition_point(|key| key.frame <= end).checked_sub(1)
    } else {
        Some(keys.len() - 1)
    };
    let Some(last) = last.filter(|&last| !explicit || first < last) else {
        return Err(invalid(
            "Choose a closed bone property interval for Offset.",
        ));
    };
    if keys[first].frame != start
        || keys[last].frame != end
        || keys[first].values.map(f32::to_bits) != keys[last].values.map(f32::to_bits)
    {
        return Err(invalid(if explicit {
            "Offset needs keyed Loop bounds with identical endpoint values."
        } else {
            "Offset needs equal endpoint values at frame zero and the authored animation end."
        }));
    }
    if keys[first..=last]
        .windows(2)
        .any(|pair| pair[0].frame >= pair[1].frame)
    {
        return Err(invalid(
            "Offset needs distinct frames on the bone property row.",
        ));
    }
    Ok((first, last))
}

impl OffsetBasis {
    fn wrap(&mut self, next_key: &mut u64) -> Result<(Vec<BoneKeyframe>, Vec<u64>), AppError> {
        let start = f64::from(self.start);
        let seam = f64::from(self.end) - self.phase;
        let cut = self.first
            + self.keys[self.first..=self.last].partition_point(|key| f64::from(key.frame) < seam);
        let exact = f64::from(self.keys[cut].frame) == seam;
        let dimensions = self.channel.dimensions();
        let mut output = Vec::with_capacity(self.keys.len() + 1);

        let (value, left_curve) = if exact {
            (self.keys[cut].values, None)
        } else {
            let (value, left_curve, right_curve) = split_segment(
                &self.keys[cut - 1],
                &self.keys[cut],
                dimensions,
                seam,
                self.phase,
                start,
            )?;
            output.push((
                BoneKeyframe {
                    frame: self.start,
                    values: value,
                    curve: right_curve,
                },
                seam_id(&mut self.start_seam, next_key)?,
            ));
            (value, Some(left_curve))
        };

        for index in cut..self.last {
            output.push((
                translated_key(&self.keys[index], seam, start, dimensions)?,
                self.ids[index],
            ));
        }
        for index in self.first..cut {
            let mut key = translated_key(&self.keys[index], 0., self.phase, dimensions)?;
            if index + 1 == cut {
                if let Some(curve) = left_curve {
                    key.curve = curve;
                }
            }
            // The original endpoints coalesce. When the user grabbed the old
            // terminal key, keep that key's identity at the merged address.
            let id = if index == self.first && self.ids[self.last] == self.anchor {
                self.anchor
            } else {
                self.ids[index]
            };
            output.push((key, id));
        }
        output.push((
            BoneKeyframe {
                frame: self.end,
                values: value,
                curve: KeyCurve::Linear,
            },
            seam_id(&mut self.end_seam, next_key)?,
        ));

        if output
            .windows(2)
            .any(|pair| pair[0].0.frame >= pair[1].0.frame)
        {
            return Err(invalid(
                "Offset would make distinct keys overlap at the stored frame precision.",
            ));
        }
        if self.explicit {
            output = self.splice_exterior(output, dimensions);
        }
        Ok(output.into_iter().unzip())
    }

    fn splice_exterior(
        &self,
        mut wrapped: Vec<(BoneKeyframe, u64)>,
        dimensions: usize,
    ) -> Vec<(BoneKeyframe, u64)> {
        let mut output: Vec<_> = self.keys[..self.first]
            .iter()
            .cloned()
            .zip(self.ids[..self.first].iter().copied())
            .collect();
        if let Some((left, _)) = output.last_mut() {
            let seam = &wrapped[0].0;
            splice_exterior_arm(left, seam, seam, &wrapped[1].0, dimensions, true);
        }
        let suffix = self.last + 1;
        if let Some(right) = self.keys.get(suffix) {
            let end = wrapped.len() - 1;
            let (interior, terminal) = wrapped.split_at_mut(end);
            let seam = &mut terminal[0].0;
            seam.curve = self.keys[self.last].curve;
            let endpoint = seam.clone();
            splice_exterior_arm(
                seam,
                right,
                &interior[end - 1].0,
                &endpoint,
                dimensions,
                false,
            );
        }
        output.extend(wrapped);
        output.extend(
            self.keys[suffix..]
                .iter()
                .cloned()
                .zip(self.ids[suffix..].iter().copied()),
        );
        output
    }
}

fn endpoint_tangent(
    left: &BoneKeyframe,
    right: &BoneKeyframe,
    axis: usize,
    at_start: bool,
) -> Option<f64> {
    let first = [f64::from(left.frame), f64::from(left.values[axis])];
    let last = [f64::from(right.frame), f64::from(right.values[axis])];
    match left.curve {
        KeyCurve::Linear => Some((last[1] - first[1]) / (last[0] - first[0])),
        KeyCurve::Stepped => (first[1] == last[1]).then_some(0.),
        KeyCurve::Bezier { controls } => {
            let [x1, y1, x2, y2] = controls[axis].map(f64::from);
            let (endpoint, others) = if at_start {
                (first, [[x1, y1], [x2, y2], last])
            } else {
                (last, [[x2, y2], [x1, y1], first])
            };
            for point in others {
                let dx = point[0] - endpoint[0];
                let dy = point[1] - endpoint[1];
                if dx != 0. {
                    return Some(dy / dx);
                }
                if dy != 0. {
                    return None;
                }
            }
            None
        }
    }
}

fn splice_exterior_arm(
    left: &mut BoneKeyframe,
    right: &BoneKeyframe,
    inner_left: &BoneKeyframe,
    inner_right: &BoneKeyframe,
    dimensions: usize,
    seam_on_right: bool,
) {
    let (seam, other, values, near) = if seam_on_right {
        (right.frame, left.frame, right.values, 2)
    } else {
        (left.frame, right.frame, left.values, 0)
    };
    let KeyCurve::Bezier { controls } = &mut left.curve else {
        return;
    };
    // Place the arm a third of the exterior interval away from the seam.
    let frame = (f64::from(seam) + (f64::from(other) - f64::from(seam)) / 3.) as f32;
    let distance = f64::from(frame) - f64::from(seam);
    if distance == 0. || animation::checked_frame(frame).is_err() {
        return;
    }
    for (index, axis) in controls[..dimensions].iter_mut().enumerate() {
        let Some(slope) = endpoint_tangent(inner_left, inner_right, index, seam_on_right) else {
            continue;
        };
        let value = (f64::from(values[index]) + slope * distance) as f32;
        let (x1, x2) = if seam_on_right {
            (axis[0], frame)
        } else {
            (frame, axis[2])
        };
        // Retain the stored arm if a vertical, discontinuous or unrepresentable
        // tangent cannot be expressed within the editable native bounds.
        if value.is_finite()
            && value.abs() <= 1_000_000.
            && bezier_time_monotone(left.frame, right.frame, x1, x2)
        {
            axis[near..near + 2].copy_from_slice(&[frame, value]);
        }
    }
}

fn seam_id(existing: &mut Option<u64>, next: &mut u64) -> Result<u64, AppError> {
    if let Some(id) = existing {
        return Ok(*id);
    }
    let id = animation::allocate(next)?;
    *existing = Some(id);
    Ok(id)
}

fn translated_key(
    key: &BoneKeyframe,
    from: f64,
    to: f64,
    dimensions: usize,
) -> Result<BoneKeyframe, AppError> {
    let translate = |value| (f64::from(value) - from + to) as f32;
    let mut result = key.clone();
    result.frame = animation::checked_frame(translate(result.frame))?;
    if let KeyCurve::Bezier { controls } = &mut result.curve {
        for axis in &mut controls[..dimensions] {
            axis[0] = translate(axis[0]);
            axis[2] = translate(axis[2]);
        }
    }
    Ok(result)
}

fn split_segment(
    left: &BoneKeyframe,
    right: &BoneKeyframe,
    dimensions: usize,
    seam: f64,
    phase: f64,
    start: f64,
) -> Result<([f32; 2], KeyCurve, KeyCurve), AppError> {
    let mut values = left.values;
    let KeyCurve::Bezier { controls } = left.curve else {
        if left.curve == KeyCurve::Linear {
            let start = f64::from(left.frame);
            let amount = (seam - start) / (f64::from(right.frame) - start);
            for (axis, value) in values[..dimensions].iter_mut().enumerate() {
                *value = lerp(f64::from(*value), f64::from(right.values[axis]), amount) as f32;
            }
        }
        return Ok((values, left.curve, left.curve));
    };

    let mut left_controls = [[0.; 4]; 2];
    let mut right_controls = [[0.; 4]; 2];
    for axis in 0..dimensions {
        let [x1, y1, x2, y2] = controls[axis];
        if !bezier_time_monotone(left.frame, right.frame, x1, x2) {
            return Err(invalid(
                "Offset cannot split a Bézier segment with reversing time.",
            ));
        }
        let xs = [left.frame, x1, x2, right.frame].map(f64::from);
        let ys = [left.values[axis], y1, y2, right.values[axis]].map(f64::from);
        let t = split_parameter(xs, seam);
        let [left_x1, left_x2, _, right_x1, right_x2] = subdivide(xs, t);
        let [left_y1, left_y2, analytical, right_y1, right_y2] = subdivide(ys, t);
        let value = chord_sample(xs, ys, seam)?;
        let adjustment = value - analytical;
        values[axis] = value as f32;
        left_controls[axis] = [
            left_x1 + phase,
            left_y1,
            left_x2 + phase,
            left_y2 + adjustment,
        ]
        .map(|v| v as f32);
        right_controls[axis] = [
            right_x1 - seam + start,
            right_y1 + adjustment,
            right_x2 - seam + start,
            right_y2,
        ]
        .map(|v| v as f32);
    }
    Ok((
        values,
        KeyCurve::Bezier {
            controls: left_controls,
        },
        KeyCurve::Bezier {
            controls: right_controls,
        },
    ))
}

fn lerp(left: f64, right: f64, fraction: f64) -> f64 {
    left + (right - left) * fraction
}

fn subdivide([a, b, c, d]: [f64; 4], t: f64) -> [f64; 5] {
    let ab = lerp(a, b, t);
    let bc = lerp(b, c, t);
    let cd = lerp(c, d, t);
    let left = lerp(ab, bc, t);
    let right = lerp(bc, cd, t);
    [ab, left, lerp(left, right, t), right, cd]
}

/// This first-crossing grid matches the measured splits for both tested
/// segment durations.
fn split_parameter(xs @ [x0, x1, x2, x3]: [f64; 4], frame: f64) -> f64 {
    const STEPS: u32 = 300;
    let tolerance = xs.into_iter().map(f64::abs).fold(0., f64::max) * (8. * f64::EPSILON);
    let mut low = 1;
    let mut high = STEPS;
    while low < high {
        let mid = (low + high) / 2;
        let t = f64::from(mid) / f64::from(STEPS);
        if animation::cubic(x0, x1, x2, x3, t) + tolerance >= frame {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    f64::from(low) / f64::from(STEPS)
}

/// The measured seam value follows interpolation across ten cubic chords.
fn chord_sample(
    [x0, x1, x2, x3]: [f64; 4],
    [y0, y1, y2, y3]: [f64; 4],
    frame: f64,
) -> Result<f64, AppError> {
    let (mut previous_x, mut previous_y) = (x0, y0);
    for step in 1..=10 {
        let t = f64::from(step) / 10.;
        let x = animation::cubic(x0, x1, x2, x3, t);
        let y = animation::cubic(y0, y1, y2, y3, t);
        if x <= previous_x {
            return Err(invalid(
                "Offset cannot sample an ambiguous Bézier time interval.",
            ));
        }
        if x >= frame {
            return Ok(lerp(previous_y, y, (frame - previous_x) / (x - previous_x)));
        }
        (previous_x, previous_y) = (x, y);
    }
    Err(invalid("Offset could not sample the Bézier seam."))
}
