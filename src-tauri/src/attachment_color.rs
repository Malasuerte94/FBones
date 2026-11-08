//! Setup attachment tint is independent from sampled slot light color.
use crate::{project::AppError, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{normalize_attachment_colors, AttachmentColor};

pub(crate) fn set(frame: &mut SceneFrame, id: u64, color: u32) -> Result<(), AppError> {
    let attachment = frame.attachment_address(id)?;
    if frame.project.slots[attachment.slot].attachments[attachment.attachment]
        .image()
        .is_none()
    {
        return Err(AppError::new(
            "InvalidAttachmentColor",
            "Only Region and Mesh attachments support image tint.",
        ));
    }
    frame
        .project
        .attachment_colors
        .retain(|entry| entry.attachment != attachment);
    let color = color.to_be_bytes();
    if color != [255; 4] {
        frame
            .project
            .attachment_colors
            .push(AttachmentColor { attachment, color });
    }
    normalize_attachment_colors(&mut frame.project)?;
    Ok(())
}
pub(crate) fn remap(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    let mut colors = Vec::new();
    for entry in &next.project.attachment_colors {
        let id = before
            .attachment_ids
            .get(entry.attachment.slot)
            .and_then(|ids| ids.get(entry.attachment.attachment))
            .ok_or_else(|| {
                AppError::new(
                    "InvalidAttachmentColor",
                    "Attachment tint identity is missing.",
                )
            })?;
        if let Ok(attachment) = next.attachment_address(*id) {
            colors.push(AttachmentColor {
                attachment,
                color: entry.color,
            });
        }
    }
    next.project.attachment_colors = colors;
    normalize_attachment_colors(&mut next.project)?;
    Ok(())
}

#[cfg(test)]
#[path = "attachment_color_tests.rs"]
mod tests;
