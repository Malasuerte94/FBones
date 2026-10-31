use super::*;
use std::collections::HashSet;
fn unsupported() -> FormatError {
    FormatError::UnsupportedProfile
}
fn name(value: &str) -> bool {
    !value.is_empty() && value.len() <= 1024 && !value.chars().any(char::is_control)
}
fn finite(values: &[f32]) -> bool {
    values.iter().all(|v| v.is_finite())
}
fn indices(values: &[usize], count: usize) -> bool {
    let mut seen = HashSet::new();
    !values.is_empty()
        && values.len() <= 128
        && values.iter().all(|i| *i < count && seen.insert(*i))
}
pub(super) fn project(p: &SceneProject) -> Result<(), FormatError> {
    super::super::validate(&p.rig)?;
    super::constraints_events::validate_definitions(p)?;
    if p.images_root.len() > 1024
        || p.images_root.chars().any(char::is_control)
        || p.slots.len() > 128
        || p.constraints.len() > 128
    {
        return Err(unsupported());
    }
    if p.animations.is_empty() || p.animations.len() > 64 || !p.fps.is_finite() || p.fps <= 0. {
        return Err(unsupported());
    }
    let mut animation_names = HashSet::new();
    let mut key_count = 0usize;
    let mut track_count = 0usize;
    let mut extra_domains = 0usize;
    let mut deform_coordinates = 0usize;
    for animation in &p.animations {
        if !name(&animation.name) || !animation_names.insert(&animation.name) {
            return Err(unsupported());
        }
        let mut seen = HashSet::new();
        let mut groups = HashSet::new();
        let mut previous_bone = None;
        for track in &animation.tracks {
            track_count += 1;
            key_count += track.keys.len();
            let channel = match track.channel {
                BoneChannel::Rotate => 0,
                BoneChannel::Translate => 1,
                BoneChannel::Scale => 2,
                BoneChannel::Shear => 3,
            };
            if previous_bone != Some(track.bone) {
                if !groups.insert(track.bone) {
                    return Err(unsupported());
                }
                previous_bone = Some(track.bone);
            }
            if track.bone >= p.rig.bones.len()
                || !seen.insert((track.bone, channel))
                || track.keys.is_empty()
                || track_count > 512
                || key_count > 4096
            {
                return Err(unsupported());
            }
            let mut previous = 0.;
            for (i, key) in track.keys.iter().enumerate() {
                if !key.frame.is_finite()
                    || key.frame < 0.
                    || key.frame < previous
                    || !finite(&key.values)
                    || (channel == 0 && key.values[1].to_bits() != 0)
                {
                    return Err(unsupported());
                }
                if let KeyCurve::Bezier { controls } = key.curve {
                    let Some(next) = track.keys.get(i + 1) else {
                        return Err(unsupported());
                    };
                    if next.frame <= key.frame {
                        return Err(unsupported());
                    }
                    let dimensions = if channel == 0 { 1 } else { 2 };
                    if dimensions == 1 && controls[1].map(f32::to_bits) != [0; 4] {
                        return Err(unsupported());
                    }
                    for axis in &controls[..dimensions] {
                        if !finite(axis)
                            || axis[0] < key.frame
                            || axis[0] > next.frame
                            || axis[2] < key.frame
                            || axis[2] > next.frame
                        {
                            return Err(unsupported());
                        }
                    }
                }
                previous = key.frame;
            }
        }
        let permutation = animation.slot_track_permutation(&p.slots)?;
        if permutation
            .iter()
            .copied()
            .ne(0..animation.slot_tracks.len())
        {
            return Err(unsupported());
        }
        let mut seen_slots = HashSet::new();
        for track in &animation.slot_tracks {
            let slot = p.slots.get(track.slot()).ok_or_else(unsupported)?;
            let kind = match track {
                SlotTimeline::Attachment { .. } => 5,
                SlotTimeline::Rgba { .. } => 4,
            };
            if !seen_slots.insert((track.slot(), kind)) {
                return Err(unsupported());
            }
            let frames: Vec<f32> = match track {
                SlotTimeline::Attachment { keys, .. } => {
                    for k in keys {
                        if k.attachment.is_some_and(|a| a >= slot.attachments.len()) {
                            return Err(unsupported());
                        }
                    }
                    keys.iter().map(|k| k.frame).collect()
                }
                SlotTimeline::Rgba { keys, .. } => {
                    for (i, key) in keys.iter().enumerate() {
                        if !finite(&key.values) || key.values.iter().any(|v| *v < 0. || *v > 1.) {
                            return Err(unsupported());
                        }
                        if let SlotRgbaCurve::Bezier { controls } = key.curve {
                            let Some(next) = keys.get(i + 1) else {
                                return Err(unsupported());
                            };
                            if next.frame <= key.frame {
                                return Err(unsupported());
                            }
                            for axis in controls {
                                if !finite(&axis)
                                    || axis[0] < key.frame
                                    || axis[0] > next.frame
                                    || axis[2] < key.frame
                                    || axis[2] > next.frame
                                {
                                    return Err(unsupported());
                                }
                            }
                        }
                    }
                    keys.iter().map(|k| k.frame).collect()
                }
            };
            track_count += 1;
            key_count += frames.len();
            if frames.is_empty() || track_count > 512 || key_count > 4096 {
                return Err(unsupported());
            }
            let mut previous = 0.;
            for frame in frames {
                if !frame.is_finite() || frame < 0. || frame < previous {
                    return Err(unsupported());
                }
                previous = frame;
            }
        }
        if !animation.draw_order.is_empty() {
            if p.slots.is_empty() {
                return Err(unsupported());
            }
            track_count += 1;
            key_count += animation.draw_order.len();
            extra_domains += 1;
            let mut previous = 0.;
            for key in &animation.draw_order {
                if !key.frame.is_finite() || key.frame < 0. || key.frame < previous {
                    return Err(unsupported());
                }
                draw_order_permutation(p.slots.len(), &key.offsets)?;
                extra_domains = extra_domains
                    .checked_add(1 + key.offsets.len())
                    .ok_or_else(unsupported)?;
                previous = key.frame;
            }
        }
        let permutation = animation.deform_track_permutation(&p.slots)?;
        if permutation
            .iter()
            .copied()
            .ne(0..animation.deform_tracks.len())
        {
            return Err(unsupported());
        }
        let mut deformed = HashSet::new();
        for track in &animation.deform_tracks {
            if !deformed.insert(track.attachment) || track.keys.is_empty() {
                return Err(unsupported());
            }
            let attachment = p
                .slots
                .get(track.attachment.slot)
                .and_then(|s| s.attachments.get(track.attachment.attachment))
                .ok_or_else(unsupported)?;
            let dimension = deform_coordinate_count(attachment)?;
            if dimension == 0 || dimension > 1_048_576 {
                return Err(unsupported());
            }
            track_count += 1;
            key_count += track.keys.len();
            extra_domains += 1;
            extra_domains = extra_domains
                .checked_add(track.keys.len() * 2)
                .ok_or_else(unsupported)?;
            let mut previous = 0.;
            for (i, key) in track.keys.iter().enumerate() {
                if !key.frame.is_finite()
                    || key.frame < 0.
                    || key.frame < previous
                    || key.offsets.len() != dimension
                    || !finite(&key.offsets)
                {
                    return Err(unsupported());
                }
                deform_coordinates = deform_coordinates
                    .checked_add(dimension)
                    .ok_or_else(unsupported)?;
                if deform_coordinates > MAX_DEFORM_COORDINATES {
                    return Err(unsupported());
                }
                let nonzero = key.offsets.iter().any(|v| *v != 0.);
                if (!key.data_present && nonzero)
                    || (!nonzero && key.offsets.iter().any(|v| v.to_bits() != 0))
                {
                    return Err(unsupported());
                }
                if let DeformCurve::Bezier { controls } = key.curve {
                    let Some(next) = track.keys.get(i + 1) else {
                        return Err(unsupported());
                    };
                    if next.frame <= key.frame
                        || !finite(&controls)
                        || controls[0] < key.frame
                        || controls[0] > next.frame
                        || controls[2] < key.frame
                        || controls[2] > next.frame
                    {
                        return Err(unsupported());
                    }
                }
                previous = key.frame;
            }
        }
        let (new_keys, new_tracks, new_domains) =
            super::constraints_events::validate_tracks(p, animation)?;
        key_count += new_keys;
        track_count += new_tracks;
        extra_domains += new_domains;
        if track_count > 512 || key_count > 4096 || extra_domains > 8192 {
            return Err(unsupported());
        }
    }
    let total = p.slots.iter().map(|s| s.attachments.len()).sum::<usize>();
    if total > 512 || p.attachment_order.len() != total {
        return Err(unsupported());
    }
    let mut seen = HashSet::new();
    for address in &p.attachment_order {
        if !seen.insert(*address)
            || p.slots
                .get(address.slot)
                .and_then(|s| s.attachments.get(address.attachment))
                .is_none()
        {
            return Err(unsupported());
        }
    }
    let mut names = HashSet::new();
    let mut vertex_count = 0;
    for slot in &p.slots {
        if !name(&slot.name)
            || !names.insert(&slot.name)
            || slot.bone >= p.rig.bones.len()
            || slot
                .active_attachment
                .is_some_and(|i| i >= slot.attachments.len())
        {
            return Err(unsupported());
        }
        let mut attachment_names = HashSet::new();
        for a in &slot.attachments {
            if !name(a.name()) || !attachment_names.insert(a.name()) {
                return Err(unsupported());
            }
            if let Some(r) = a.image() {
                if r.path.len() > 1024
                    || !finite(&[
                        r.x, r.y, r.rotation, r.scale_x, r.scale_y, r.width, r.height,
                    ])
                    || r.width <= 0.0
                    || r.height <= 0.0
                {
                    return Err(unsupported());
                }
            }
            match a {
                SceneAttachment::Region(_) => (),
                SceneAttachment::Mesh(m) => {
                    super::super::meshes::validate_mesh(m, slot.bone, p.rig.bones.len())?;
                    vertex_count += m.vertices.len();
                }
                SceneAttachment::Clipping(c) => {
                    let n = c.vertices.len();
                    if !(3..=256).contains(&n)
                        || c.end_slot.is_none()
                        || c.end_slot.is_some_and(|i| i >= p.slots.len())
                        || !indices(&c.bones, p.rig.bones.len())
                        || (!c.weighted && c.bones != [slot.bone])
                        || c.edges.len() > 4096
                        || !c.edges.len().is_multiple_of(2)
                    {
                        return Err(unsupported());
                    }
                    for edge in c.edges.chunks_exact(2) {
                        if edge[0] == edge[1] || edge.iter().any(|i| *i as usize >= n) {
                            return Err(unsupported());
                        }
                    }
                    for v in &c.vertices {
                        if v.weights.len() != c.bones.len()
                            || v.positions.len() != c.bones.len() * 2
                            || !finite(&v.positions)
                            || v.weights
                                .iter()
                                .any(|w| !w.is_finite() || *w < 0.0 || *w > 1.0)
                            || (v.weights.iter().sum::<f32>() - 1.0).abs() > 0.0001
                            || (!c.weighted && v.weights != [1.0])
                        {
                            return Err(unsupported());
                        }
                    }
                    vertex_count += n;
                }
            }
        }
    }
    if vertex_count > 4096 {
        return Err(unsupported());
    }
    let mut constraint_names = HashSet::new();
    for constraint in &p.constraints {
        if !name(constraint.name()) || !constraint_names.insert(constraint.name()) {
            return Err(unsupported());
        }
        match constraint {
            Constraint::Ik(c) => {
                if !(1..=2).contains(&c.bones.len())
                    || !indices(&c.bones, p.rig.bones.len())
                    || c.target >= p.rig.bones.len()
                    || !finite(&[c.mix, c.softness])
                    || !(0.0..=1.0).contains(&c.mix)
                    || c.softness < 0.0
                {
                    return Err(unsupported());
                }
                if c.bones.len() == 2 && p.rig.bones[c.bones[1]].parent != Some(c.bones[0]) {
                    return Err(unsupported());
                }
                let mut ancestor = Some(c.target);
                while let Some(index) = ancestor {
                    if c.bones.contains(&index) {
                        return Err(unsupported());
                    }
                    ancestor = p.rig.bones[index].parent;
                }
            }
            Constraint::Transform(c) => {
                if c.source >= p.rig.bones.len()
                    || !indices(&c.bones, p.rig.bones.len())
                    || !finite(&c.offsets)
                    || !finite(&c.mix)
                    || c.mix.iter().any(|m| !(0.0..=1.0).contains(m))
                    || c.properties.len() > 6
                {
                    return Err(unsupported());
                }
                let mut from_seen = HashSet::new();
                for from in &c.properties {
                    if !from_seen.insert(from.property)
                        || !from.offset.is_finite()
                        || from.to.is_empty()
                        || from.to.len() > 6
                    {
                        return Err(unsupported());
                    }
                    let mut to_seen = HashSet::new();
                    for to in &from.to {
                        if !to_seen.insert(to.property) || !finite(&[to.offset, to.max, to.scale]) {
                            return Err(unsupported());
                        }
                    }
                }
            }
            Constraint::Physics(c) => {
                let (r, s) = c.angular.wire_bits();
                PhysicsAngular::from_wire_bits(r, s)?;
                if c.bone >= p.rig.bones.len()
                    || !finite(&[
                        c.x, c.y, c.scale_x, c.step, c.inertia, c.strength, c.damping, c.mass,
                        c.wind, c.gravity, c.mix, c.limit,
                    ])
                    || c.step <= 0.0
                    || c.mass <= 0.0
                    || c.limit < 0.0
                    || c.damping < 0.0
                {
                    return Err(unsupported());
                }
            }
        }
    }
    Ok(())
}
