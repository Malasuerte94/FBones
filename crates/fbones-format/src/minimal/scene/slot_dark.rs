//! Stored slot two-color enable and dormant RGBA bytes are distinct Setup data.
use super::*;
use crate::FormatError;
use std::collections::HashSet;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SlotDarkColor {
    pub slot: usize,
    pub enabled: bool,
    /// The fourth source byte is retained, not an authored dark-alpha channel.
    pub color: [u8; 4],
}
impl SlotDarkColor {
    fn canonical_default(self) -> bool {
        !self.enabled && self.color == [0, 0, 0, 255]
    }
}
impl SceneProject {
    pub fn slot_dark_color(&self, slot: usize) -> SlotDarkColor {
        self.slot_dark_colors
            .iter()
            .find(|c| c.slot == slot)
            .copied()
            .unwrap_or(SlotDarkColor {
                slot,
                enabled: false,
                color: [0, 0, 0, 255],
            })
    }
}
pub fn normalize_slot_dark_colors(p: &mut SceneProject) -> Result<(), FormatError> {
    let mut seen = HashSet::new();
    for c in &p.slot_dark_colors {
        if c.slot >= p.slots.len() || c.color[3] != 255 || !seen.insert(c.slot) {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    p.slot_dark_colors.retain(|c| !c.canonical_default());
    p.slot_dark_colors.sort_by_key(|c| c.slot);
    Ok(())
}

#[cfg(test)]
#[path = "slot_dark_tests.rs"]
mod tests;
