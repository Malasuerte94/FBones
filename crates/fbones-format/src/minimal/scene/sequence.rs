//! Bounded ordinary Sequence settings and discrete keys, from paired4.3.26 data.
use super::*;
use crate::FormatError;
use std::collections::{HashMap, HashSet};

pub const MAX_SEQUENCE_COUNT: u32 = 4096;
pub const MAX_SEQUENCE_FRAME: f32 = 1_000_000.;
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SequenceSettings {
    pub start: u32,
    pub count: u32,
    pub digits: u32,
    pub setup_index: u32,
}
impl SequenceSettings {
    pub fn validate(&self) -> Result<(), FormatError> {
        if self.count == 0
            || self.count > MAX_SEQUENCE_COUNT
            || self.digits > 10
            || self.setup_index >= self.count
            || self
                .start
                .checked_add(self.count - 1)
                .is_none_or(|last| last > i32::MAX as u32)
        {
            return Err(FormatError::UnsupportedProfile);
        }
        Ok(())
    }
    /// Image-library stem, without an invented extension or filesystem access.
    pub fn path(&self, base: &str, index: u32) -> Result<String, FormatError> {
        self.validate()?;
        if index >= self.count {
            return Err(FormatError::UnsupportedProfile);
        }
        Ok(format!(
            "{base}{:0width$}",
            self.start + index,
            width = self.digits as usize
        ))
    }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AttachmentSequence {
    pub attachment: AttachmentAddress,
    pub settings: SequenceSettings,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SequenceMode {
    Hold,
    Once,
    Loop,
}
impl SequenceMode {
    pub fn wire(self) -> u32 {
        match self {
            Self::Hold => 0,
            Self::Once => 1,
            Self::Loop => 2,
        }
    }
    pub fn from_wire(value: u32) -> Option<Self> {
        Some(match value {
            0 => Self::Hold,
            1 => Self::Once,
            2 => Self::Loop,
            _ => return None,
        })
    }
    pub fn name(self) -> &'static str {
        match self {
            Self::Hold => "hold",
            Self::Once => "once",
            Self::Loop => "loop",
        }
    }
}
#[derive(Clone, Debug)]
pub struct SequenceKeyframe {
    pub frame: f32,
    pub mode: SequenceMode,
    pub index: u32,
    pub delay: FiniteF32,
}
impl PartialEq for SequenceKeyframe {
    fn eq(&self, other: &Self) -> bool {
        self.frame.to_bits() == other.frame.to_bits()
            && self.mode == other.mode
            && self.index == other.index
            && self.delay == other.delay
    }
}
impl Eq for SequenceKeyframe {}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SequenceTimeline {
    pub attachment: AttachmentAddress,
    pub keys: Vec<SequenceKeyframe>,
}
impl SceneProject {
    pub fn sequence(&self, attachment: AttachmentAddress) -> Option<&SequenceSettings> {
        self.attachment_sequences
            .iter()
            .find(|s| s.attachment == attachment)
            .map(|s| &s.settings)
    }
}
/// Source inventory order is separate from activation or frame selection.
pub fn normalize_attachment_sequences(p: &mut SceneProject) -> Result<(), FormatError> {
    let rank: HashMap<_, _> = p
        .attachment_order
        .iter()
        .enumerate()
        .map(|(i, a)| (*a, i))
        .collect();
    let mut seen = HashSet::new();
    for s in &p.attachment_sequences {
        if !seen.insert(s.attachment)
            || !rank.contains_key(&s.attachment)
            || p.slots
                .get(s.attachment.slot)
                .and_then(|slot| slot.attachments.get(s.attachment.attachment))
                .and_then(SceneAttachment::image)
                .is_none()
        {
            return Err(FormatError::UnsupportedProfile);
        }
        s.settings.validate()?;
    }
    p.attachment_sequences.sort_by_key(|s| rank[&s.attachment]);
    Ok(())
}
impl Animation {
    pub fn sequence_track_permutation(
        &self,
        slots: &[SceneSlot],
    ) -> Result<Vec<usize>, FormatError> {
        let mut owners = Vec::new();
        for t in &self.tracks {
            if !owners.contains(&t.bone) {
                owners.push(t.bone)
            }
        }
        for t in &self.slot_tracks {
            let bone = slots
                .get(t.slot())
                .ok_or(FormatError::UnsupportedProfile)?
                .bone;
            if !owners.contains(&bone) {
                owners.push(bone)
            }
        }
        let mut ranks = Vec::new();
        for t in &self.sequence_tracks {
            let bone = slots
                .get(t.attachment.slot)
                .ok_or(FormatError::UnsupportedProfile)?
                .bone;
            let rank = if let Some(rank) = owners.iter().position(|b| *b == bone) {
                rank
            } else {
                owners.push(bone);
                owners.len() - 1
            };
            ranks.push(rank)
        }
        let mut order: Vec<_> = (0..ranks.len()).collect();
        order.sort_by_key(|i| ranks[*i]);
        Ok(order)
    }
}

#[cfg(test)]
#[path = "sequence_tests.rs"]
mod tests;
