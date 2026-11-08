//! Setup image tint is independent of animated slot light RGBA.
use super::*;
use crate::FormatError;
use std::collections::{HashMap, HashSet};
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AttachmentColor {
    pub attachment: AttachmentAddress,
    pub color: [u8; 4],
}
impl SceneProject {
    pub fn attachment_color(&self, attachment: AttachmentAddress) -> [u8; 4] {
        self.attachment_colors
            .iter()
            .find(|c| c.attachment == attachment)
            .map_or([255; 4], |c| c.color)
    }
}
pub fn normalize_attachment_colors(p: &mut SceneProject) -> Result<(), FormatError> {
    let rank: HashMap<_, _> = p
        .attachment_order
        .iter()
        .enumerate()
        .map(|(i, a)| (*a, i))
        .collect();
    let mut seen = HashSet::new();
    for c in &p.attachment_colors {
        if !seen.insert(c.attachment)
            || !rank.contains_key(&c.attachment)
            || p.slots
                .get(c.attachment.slot)
                .and_then(|s| s.attachments.get(c.attachment.attachment))
                .and_then(SceneAttachment::image)
                .is_none()
        {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    p.attachment_colors.retain(|c| c.color != [255; 4]);
    p.attachment_colors.sort_by_key(|c| rank[&c.attachment]);
    Ok(())
}
