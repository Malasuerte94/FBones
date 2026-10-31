//! Bounded typed bone and slot animation profile for the observed editor records.
#[derive(Clone, Debug, PartialEq)]
pub struct Animation {
    pub name: String,
    pub tracks: Vec<BoneTimeline>,
    pub slot_tracks: Vec<SlotTimeline>,
    pub draw_order: Vec<super::DrawOrderKey>,
    pub deform_tracks: Vec<super::DeformTimeline>,
    pub constraint_tracks: Vec<super::ConstraintTimeline>,
    pub event_tracks: Vec<super::EventTimeline>,
}
impl Animation {
    pub fn new(name: String) -> Self {
        Self {
            name,
            tracks: Vec::new(),
            slot_tracks: Vec::new(),
            draw_order: Vec::new(),
            deform_tracks: Vec::new(),
            constraint_tracks: Vec::new(),
            event_tracks: Vec::new(),
        }
    }

    pub fn deform_track_permutation(
        &self,
        slots: &[super::SceneSlot],
    ) -> Result<Vec<usize>, crate::FormatError> {
        let mut owners = Vec::new();
        for track in &self.tracks {
            if !owners.contains(&track.bone) {
                owners.push(track.bone);
            }
        }
        for track in &self.slot_tracks {
            let bone = slots
                .get(track.slot())
                .ok_or(crate::FormatError::UnsupportedProfile)?
                .bone;
            if !owners.contains(&bone) {
                owners.push(bone);
            }
        }
        let mut ranks = Vec::new();
        for track in &self.deform_tracks {
            let bone = slots
                .get(track.attachment.slot)
                .ok_or(crate::FormatError::UnsupportedProfile)?
                .bone;
            let rank = if let Some(rank) = owners.iter().position(|b| *b == bone) {
                rank
            } else {
                owners.push(bone);
                owners.len() - 1
            };
            ranks.push(rank);
        }
        let mut order: Vec<_> = (0..ranks.len()).collect();
        order.sort_by_key(|i| ranks[*i]);
        Ok(order)
    }

    /// Stable permutation for the bounded wire profile: existing bone groups
    /// retain their order; slot-only bone groups follow in first-seen order.
    /// Apply the same permutation to native parallel stable-key identities.
    pub fn slot_track_permutation(
        &self,
        slots: &[super::SceneSlot],
    ) -> Result<Vec<usize>, crate::FormatError> {
        let mut owners = Vec::new();
        for track in &self.tracks {
            if !owners.contains(&track.bone) {
                owners.push(track.bone);
            }
        }
        let mut ranks = Vec::new();
        for track in &self.slot_tracks {
            let bone = slots
                .get(track.slot())
                .ok_or(crate::FormatError::UnsupportedProfile)?
                .bone;
            let rank = if let Some(rank) = owners.iter().position(|v| *v == bone) {
                rank
            } else {
                owners.push(bone);
                owners.len() - 1
            };
            ranks.push(rank);
        }
        let mut order: Vec<_> = (0..ranks.len()).collect();
        order.sort_by_key(|i| ranks[*i]);
        Ok(order)
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum SlotTimeline {
    Attachment {
        slot: usize,
        keys: Vec<SlotAttachmentKey>,
    },
    Rgba {
        slot: usize,
        keys: Vec<SlotRgbaKey>,
    },
}
impl SlotTimeline {
    pub fn slot(&self) -> usize {
        match self {
            Self::Attachment { slot, .. } | Self::Rgba { slot, .. } => *slot,
        }
    }
}
#[derive(Clone, Debug)]
pub struct SlotAttachmentKey {
    pub frame: f32,
    /// Index within the owning slot's attachment inventory; None hides it.
    pub attachment: Option<usize>,
}
impl PartialEq for SlotAttachmentKey {
    fn eq(&self, other: &Self) -> bool {
        self.frame.to_bits() == other.frame.to_bits() && self.attachment == other.attachment
    }
}
#[derive(Clone, Debug)]
pub struct SlotRgbaKey {
    pub frame: f32,
    pub values: [f32; 4],
    pub curve: SlotRgbaCurve,
}
impl PartialEq for SlotRgbaKey {
    fn eq(&self, other: &Self) -> bool {
        self.frame.to_bits() == other.frame.to_bits()
            && self.values.map(f32::to_bits) == other.values.map(f32::to_bits)
            && self.curve == other.curve
    }
}
#[derive(Clone, Copy, Debug)]
pub enum SlotRgbaCurve {
    Linear,
    Stepped,
    Bezier { controls: [[f32; 4]; 4] },
}
impl PartialEq for SlotRgbaCurve {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Linear, Self::Linear) | (Self::Stepped, Self::Stepped) => true,
            (Self::Bezier { controls: a }, Self::Bezier { controls: b }) => a
                .iter()
                .flatten()
                .map(|v| v.to_bits())
                .eq(b.iter().flatten().map(|v| v.to_bits())),
            _ => false,
        }
    }
}
impl Eq for SlotRgbaCurve {}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BoneChannel {
    Rotate,
    Translate,
    Scale,
    Shear,
}
#[derive(Clone, Debug, PartialEq)]
pub struct BoneTimeline {
    pub bone: usize,
    pub channel: BoneChannel,
    pub keys: Vec<BoneKeyframe>,
}
#[derive(Clone, Debug)]
pub struct BoneKeyframe {
    /// Editor frames, preserving exact f32 wire values; never seconds.
    pub frame: f32,
    pub values: [f32; 2],
    pub curve: KeyCurve,
}
impl PartialEq for BoneKeyframe {
    fn eq(&self, other: &Self) -> bool {
        self.frame.to_bits() == other.frame.to_bits()
            && self.values.map(f32::to_bits) == other.values.map(f32::to_bits)
            && self.curve == other.curve
    }
}
#[derive(Clone, Copy, Debug)]
pub enum KeyCurve {
    Linear,
    Stepped,
    /// Outgoing segment controls in absolute editor-frame/value coordinates.
    Bezier {
        controls: [[f32; 4]; 2],
    },
}
impl PartialEq for KeyCurve {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Linear, Self::Linear) | (Self::Stepped, Self::Stepped) => true,
            (Self::Bezier { controls: a }, Self::Bezier { controls: b }) => a
                .iter()
                .flatten()
                .map(|v| v.to_bits())
                .eq(b.iter().flatten().map(|v| v.to_bits())),
            _ => false,
        }
    }
}
impl Eq for KeyCurve {}

pub(super) fn records(
    animations: &[Animation],
    slots: &[super::SceneSlot],
    project: &super::SceneProject,
) -> Vec<super::super::Object> {
    use super::super::{group, object, text, Field::*, Object, Record};
    let label = |i: usize| {
        if i == 0 {
            "animation".into()
        } else {
            format!("animation-{i}")
        }
    };
    animations
        .iter()
        .enumerate()
        .map(|(i, a)| {
            Object::Record(Record {
                class: 18,
                label: Some(label(i)),
                fields: vec![
                    (1, text(&a.name)),
                    (5, Bool(true)),
                    (9, UInt(0)),
                    (3, Bool(false)),
                    (10, object(Object::Color([255; 4]))),
                    (8, object(Object::Empty116)),
                    (6, Bool(true)),
                    (
                        2,
                        object(Object::Array({
                            let mut groups: Vec<(usize, Vec<Object>)> = Vec::new();
                            for t in &a.tracks {
                                if groups.last().is_some_and(|g| g.0 == t.bone) {
                                    groups
                                        .last_mut()
                                        .unwrap()
                                        .1
                                        .push(Object::AnimationTrack(t.clone()));
                                } else {
                                    groups.push((t.bone, vec![Object::AnimationTrack(t.clone())]));
                                }
                            }
                            for t in &a.slot_tracks {
                                let slot = t.slot();
                                let item = Object::SlotAnimationTrack {
                                    track: t.clone(),
                                    attachments: slots[slot]
                                        .attachments
                                        .iter()
                                        .enumerate()
                                        .map(|(index, a)| {
                                            (a.class(), format!("attachment-{slot}-{index}"))
                                        })
                                        .collect(),
                                    owner: format!("slot-{slot}"),
                                };
                                let bone = slots[slot].bone;
                                if let Some(group) = groups.iter_mut().find(|g| g.0 == bone) {
                                    group.1.push(item);
                                } else {
                                    groups.push((bone, vec![item]));
                                }
                            }
                            for t in &a.deform_tracks {
                                let address = t.attachment;
                                let bone = slots[address.slot].bone;
                                let item = Object::DeformAnimationTrack {
                                    track: t.clone(),
                                    target: (
                                        slots[address.slot].attachments[address.attachment].class(),
                                        format!(
                                            "attachment-{}-{}",
                                            address.slot, address.attachment
                                        ),
                                    ),
                                };
                                if let Some(group) = groups.iter_mut().find(|g| g.0 == bone) {
                                    group.1.push(item);
                                } else {
                                    groups.push((bone, vec![item]));
                                }
                            }
                            for track in &a.constraint_tracks {
                                let bone = track
                                    .owner_bone(project)
                                    .expect("validated constraint timeline");
                                let c = &project.constraints[track.constraint()];
                                let item = Object::ConstraintAnimationTrack {
                                    track: track.clone(),
                                    target: (
                                        c.class(),
                                        format!("constraint-{}", track.constraint()),
                                    ),
                                };
                                if let Some(group) = groups.iter_mut().find(|g| g.0 == bone) {
                                    group.1.push(item)
                                } else {
                                    groups.push((bone, vec![item]))
                                }
                            }
                            let mut result: Vec<_> = groups
                                .into_iter()
                                .map(|(bone, tracks)| {
                                    Object::Record(Record {
                                        class: 19,
                                        label: None,
                                        fields: vec![
                                            (4, Bool(true)),
                                            (2, object(Object::Array(tracks))),
                                            (7, Enum(2, "animation-translate-kind")),
                                            (1, DomainLink(12, format!("bone-{bone}"))),
                                        ],
                                    })
                                })
                                .collect();
                            if !a.event_tracks.is_empty() {
                                let items = a
                                    .event_tracks
                                    .iter()
                                    .map(|track| Object::EventAnimationTrack {
                                        track: track.clone(),
                                        owner: format!("event-{}", track.event),
                                        default_string: project.events[track.event].string.clone(),
                                        default_label: format!(
                                            "event-default-string-{}",
                                            track.event
                                        ),
                                    })
                                    .collect();
                                result.push(Object::Record(Record {
                                    class: 19,
                                    label: None,
                                    fields: vec![
                                        (4, Bool(true)),
                                        (2, object(Object::Array(items))),
                                        (7, Enum(3, "animation-event-kind")),
                                        (1, NullDomainLink(12)),
                                    ],
                                }));
                            }
                            if !a.draw_order.is_empty() {
                                let rows = a
                                    .draw_order
                                    .iter()
                                    .map(|key| {
                                        key.offsets
                                            .iter()
                                            .map(|offset| {
                                                Object::Record(Record {
                                                    class: 39,
                                                    label: None,
                                                    fields: vec![
                                                        (
                                                            1,
                                                            UInt(
                                                                ((offset.offset as u32) << 1)
                                                                    ^ ((offset.offset >> 31)
                                                                        as u32),
                                                            ),
                                                        ),
                                                        (
                                                            0,
                                                            DomainLink(
                                                                13,
                                                                format!("slot-{}", offset.slot),
                                                            ),
                                                        ),
                                                    ],
                                                })
                                            })
                                            .collect()
                                    })
                                    .collect();
                                result.push(Object::Record(Record {
                                    class: 19,
                                    label: None,
                                    fields: vec![
                                        (4, Bool(true)),
                                        (
                                            2,
                                            object(Object::Array(vec![
                                                Object::DrawOrderAnimationTrack {
                                                    keys: a.draw_order.clone(),
                                                    rows,
                                                },
                                            ])),
                                        ),
                                        (7, Enum(4, "animation-draw-order-kind")),
                                        (1, NullDomainLink(12)),
                                    ],
                                }));
                            }
                            result
                        })),
                    ),
                    (0, DomainLink(11, "skeleton".into())),
                    (
                        7,
                        object(if i == 0 {
                            group(
                                Some("animation-group"),
                                (0..animations.len())
                                    .map(|j| Object::Link(18, label(j)))
                                    .collect(),
                            )
                        } else {
                            Object::Link(108, "animation-group".into())
                        }),
                    ),
                ],
            })
        })
        .collect()
}

#[cfg(test)]
#[path = "animation_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "slot_animation_tests.rs"]
mod slot_tests;
