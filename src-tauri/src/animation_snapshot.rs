//! One session-only Graph comparison. Typed keys never round-trip through UI data.
use crate::{
    animation::{self, AnimationView},
    animation_deform::{self, BindingLayout},
    project::AppError,
    scene_edit::SceneFrame,
};
use fbones_format::minimal::scene::{
    Animation, AttachmentAddress, SequenceSettings, SlotTimeline, WireAnimationLayout,
};

#[cfg(test)]
#[path = "animation_snapshot_tests.rs"]
mod tests;

#[derive(Debug)]
pub(crate) struct AnimationSnapshot {
    pub(crate) view: AnimationView,
    clip: Animation,
    bone_ids: Vec<u64>,
    slot_ids: Vec<u64>,
    attachment_ids: Vec<Vec<u64>>,
    constraint_ids: Vec<u64>,
    event_ids: Vec<u64>,
    bone_keys: Vec<Vec<u64>>,
    slot_keys: Vec<Vec<u64>>,
    draw_keys: Vec<u64>,
    deform_keys: Vec<Vec<u64>>,
    constraint_keys: Vec<Vec<u64>>,
    event_keys: Vec<Vec<u64>>,
    sequence_keys: Vec<Vec<u64>>,
    deform_layouts: Vec<(AttachmentAddress, BindingLayout)>,
    sequences: Vec<(AttachmentAddress, SequenceSettings)>,
    slot_tints: Vec<(usize, bool)>,
    layout: Option<WireAnimationLayout>,
}
impl AnimationSnapshot {
    pub(crate) fn clip_index(frame: &SceneFrame, id: u64) -> Result<usize, AppError> {
        frame
            .animation_ids
            .iter()
            .position(|&current| current == id)
            .ok_or_else(|| Self::unavailable("Choose an existing animation."))
    }

    pub(crate) fn unavailable(message: &str) -> AppError {
        AppError::new("InvalidAnimation", message)
    }

    pub(crate) fn clip(&self) -> &Animation {
        &self.clip
    }

    pub(crate) fn capture(frame: &SceneFrame, a: usize) -> Result<Self, AppError> {
        let clip = &frame.project.animations[a];
        let deform_layouts = clip
            .deform_tracks
            .iter()
            .map(|track| {
                Ok((
                    track.attachment,
                    animation_deform::layout(frame, track.attachment)?,
                ))
            })
            .collect::<Result<_, AppError>>()?;
        let sequences = clip
            .sequence_tracks
            .iter()
            .map(|track| {
                let attachment = track.attachment;
                let settings = frame
                    .project
                    .sequence(attachment)
                    .ok_or_else(|| Self::unavailable("The sequence settings are missing."))?;
                Ok((attachment, settings.clone()))
            })
            .collect::<Result<_, AppError>>()?;
        let slot_tints = clip
            .slot_tracks
            .iter()
            .filter_map(|track| match track {
                SlotTimeline::Rgba { slot, .. } | SlotTimeline::Rgb2 { slot, .. } => {
                    Some((*slot, frame.project.slot_dark_color(*slot).enabled))
                }
                SlotTimeline::Attachment { .. } | SlotTimeline::Alpha { .. } => None,
            })
            .collect();
        let layout = frame.project.wire.as_ref().and_then(|wire| {
            wire.animation_layouts
                .iter()
                .find(|layout| layout.animation == a)
                .cloned()
        });
        Ok(Self {
            view: animation::view(frame, a),
            clip: clip.clone(),
            bone_ids: frame.bone_ids.clone(),
            slot_ids: frame.slot_ids.clone(),
            attachment_ids: frame.attachment_ids.clone(),
            constraint_ids: frame.constraint_ids.clone(),
            event_ids: frame.event_ids.clone(),
            bone_keys: frame.animation_key_ids[a].clone(),
            slot_keys: frame.animation_slot_key_ids[a].clone(),
            draw_keys: frame.animation_draw_key_ids[a].clone(),
            deform_keys: frame.animation_deform_key_ids[a].clone(),
            constraint_keys: frame.animation_constraint_key_ids[a].clone(),
            event_keys: frame.animation_event_key_ids[a].clone(),
            sequence_keys: frame.animation_sequence_key_ids[a].clone(),
            deform_layouts,
            sequences,
            slot_tints,
            layout,
        })
    }

    pub(crate) fn compatible(&self, frame: &SceneFrame) -> bool {
        frame.animation_ids.contains(&self.view.id)
            && self.bone_ids == frame.bone_ids
            && self.slot_ids == frame.slot_ids
            && self.attachment_ids == frame.attachment_ids
            && self.constraint_ids == frame.constraint_ids
            && self.event_ids == frame.event_ids
            && self.deform_layouts.iter().all(|(address, previous)| {
                animation_deform::layout(frame, *address).is_ok_and(|current| current == *previous)
            })
            && self
                .sequences
                .iter()
                .all(|(address, previous)| frame.project.sequence(*address) == Some(previous))
            && self
                .slot_tints
                .iter()
                .all(|(slot, enabled)| frame.project.slot_dark_color(*slot).enabled == *enabled)
    }

    pub(crate) fn depends_on_deform_geometry(&self, frame: &SceneFrame, id: u64) -> bool {
        self.view.deform_tracks.iter().any(|track| {
            !track.keys.is_empty()
                && (track.attachment == id
                    || frame
                        .attachment_address(track.attachment)
                        .ok()
                        .and_then(|address| frame.project.linked_mesh(address))
                        .is_some_and(|link| {
                            frame.attachment_ids[link.source.slot][link.source.attachment] == id
                        }))
        })
    }

    pub(crate) fn restore(&self, frame: &mut SceneFrame, a: usize) {
        let name = frame.project.animations[a].name.clone();
        frame.project.animations[a].clone_from(&self.clip);
        frame.project.animations[a].name = name;
        frame.animation_key_ids[a].clone_from(&self.bone_keys);
        frame.animation_slot_key_ids[a].clone_from(&self.slot_keys);
        frame.animation_draw_key_ids[a].clone_from(&self.draw_keys);
        frame.animation_deform_key_ids[a].clone_from(&self.deform_keys);
        frame.animation_constraint_key_ids[a].clone_from(&self.constraint_keys);
        frame.animation_event_key_ids[a].clone_from(&self.event_keys);
        frame.animation_sequence_key_ids[a].clone_from(&self.sequence_keys);
        if let Some(wire) = &mut frame.project.wire {
            wire.animation_layouts
                .retain(|layout| layout.animation != a);
            if let Some(mut layout) = self.layout.clone() {
                layout.animation = a;
                wire.animation_layouts.push(layout);
            }
        }
    }
}
