//! Stored slot dark RGB is separate from enable state, light RGBA and images.
use crate::{project::AppError, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{
    normalize_slot_dark_colors, SlotDarkColor, SlotRgbaCurve, SlotTimeline,
};
pub(crate) fn set(
    frame: &mut SceneFrame,
    id: u64,
    enabled: bool,
    color: u32,
) -> Result<(), AppError> {
    let slot = frame.slot_index(id)?;
    let color = color.to_be_bytes();
    if color[3] != 255 {
        return Err(AppError::new(
            "InvalidSlotDarkColor",
            "Dark color has RGB only; its stored alpha must remain 255.",
        ));
    }
    for track in frame
        .project
        .animations
        .iter()
        .flat_map(|clip| &clip.slot_tracks)
    {
        if let SlotTimeline::Rgba { slot: owner, keys } = track {
            if *owner == slot {
                if enabled
                    && keys
                        .iter()
                        .any(|key| !matches!(key.curve, SlotRgbaCurve::Linear))
                {
                    return Err(AppError::new("InvalidSlotDarkColor","Enabled two-color tracks currently require linear keys. Existing curves are preserved."));
                }
                if !enabled
                    && keys
                        .iter()
                        .any(|key| key.dark_values.iter().any(|value| value.to_bits() != 0))
                {
                    return Err(AppError::new("InvalidSlotDarkColor","Remove nonzero dark animation values before disabling two-color. Existing keys are preserved."));
                }
            }
        }
    }
    frame
        .project
        .slot_dark_colors
        .retain(|entry| entry.slot != slot);
    frame.project.slot_dark_colors.push(SlotDarkColor {
        slot,
        enabled,
        color,
    });
    normalize_slot_dark_colors(&mut frame.project)?;
    Ok(())
}
pub(crate) fn remap(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    let mut colors = Vec::new();
    for entry in &next.project.slot_dark_colors {
        let id = before.slot_ids.get(entry.slot).ok_or_else(|| {
            AppError::new(
                "InvalidSlotDarkColor",
                "Slot dark-color identity is missing.",
            )
        })?;
        if let Some(slot) = next.slot_ids.iter().position(|candidate| candidate == id) {
            colors.push(SlotDarkColor { slot, ..*entry });
        }
    }
    next.project.slot_dark_colors = colors;
    normalize_slot_dark_colors(&mut next.project)?;
    Ok(())
}

#[cfg(test)]
#[path = "animation_two_color_tests.rs"]
mod tests;
