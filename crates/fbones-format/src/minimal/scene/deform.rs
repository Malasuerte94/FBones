//! Observed draw-order and vertex-deform timelines; sampled state stays separate.
use super::{AttachmentAddress, SceneAttachment};
use crate::FormatError;
pub const MAX_DEFORM_COORDINATES: usize = 4_194_304;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SlotOffset {
    pub slot: usize,
    pub offset: i32,
}
#[derive(Clone, Debug)]
pub struct DrawOrderKey {
    pub frame: f32,
    pub offsets: Vec<SlotOffset>,
}
impl PartialEq for DrawOrderKey {
    fn eq(&self, other: &Self) -> bool {
        self.frame.to_bits() == other.frame.to_bits() && self.offsets == other.offsets
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct DeformTimeline {
    pub attachment: AttachmentAddress,
    pub keys: Vec<DeformKey>,
}
#[derive(Clone, Debug)]
pub struct DeformKey {
    pub frame: f32,
    /// Dense vertex-major, bound-column-major XY offsets, including zero columns.
    pub offsets: Vec<f32>,
    /// Exact observed Boolean, independent of whether the coordinate values are zero.
    pub data_present: bool,
    pub curve: DeformCurve,
}
impl PartialEq for DeformKey {
    fn eq(&self, other: &Self) -> bool {
        self.frame.to_bits() == other.frame.to_bits()
            && self.data_present == other.data_present
            && self.curve == other.curve
            && self.offsets.len() == other.offsets.len()
            && self
                .offsets
                .iter()
                .zip(&other.offsets)
                .all(|(a, b)| a.to_bits() == b.to_bits())
    }
}
#[derive(Clone, Copy, Debug)]
pub enum DeformCurve {
    Linear,
    Stepped,
    Bezier { controls: [f32; 4] },
}
impl PartialEq for DeformCurve {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Linear, Self::Linear) | (Self::Stepped, Self::Stepped) => true,
            (Self::Bezier { controls: a }, Self::Bezier { controls: b }) => {
                a.map(f32::to_bits) == b.map(f32::to_bits)
            }
            _ => false,
        }
    }
}
impl Eq for DeformCurve {}
pub fn deform_coordinate_count(attachment: &SceneAttachment) -> Result<usize, FormatError> {
    let (vertices, bones, weighted) = match attachment {
        SceneAttachment::Mesh(m) => (m.vertices.len(), m.bones.len(), m.weighted),
        SceneAttachment::Clipping(c) => (c.vertices.len(), c.bones.len(), c.weighted),
        SceneAttachment::Region(_) => return Err(FormatError::UnsupportedProfile),
    };
    vertices
        .checked_mul(if weighted { bones } else { 1 })
        .and_then(|v| v.checked_mul(2))
        .ok_or(FormatError::UnsupportedProfile)
}
/// Empty offsets follow Setup. Nonempty literal lists retain their exact records.
pub fn draw_order_permutation(
    slot_count: usize,
    offsets: &[SlotOffset],
) -> Result<Vec<usize>, FormatError> {
    if slot_count > super::MAX_SCENE_SLOTS || offsets.len() > slot_count {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut result = vec![None; slot_count];
    let mut remaining = Vec::new();
    let mut cursor = 0;
    for offset in offsets {
        if offset.slot < cursor || offset.slot >= slot_count {
            return Err(FormatError::UnsupportedProfile);
        }
        remaining.extend(cursor..offset.slot);
        cursor = offset.slot + 1;
        let target = offset.slot as i64 + i64::from(offset.offset);
        if target < 0
            || target >= slot_count as i64
            || result[target as usize].replace(offset.slot).is_some()
        {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    remaining.extend(cursor..slot_count);
    let mut remaining = remaining.into_iter();
    result
        .into_iter()
        .map(|v| {
            v.or_else(|| remaining.next())
                .ok_or(FormatError::UnsupportedProfile)
        })
        .collect()
}
/// FBones authoring policy: identity becomes Setup reset. Remove redundant
/// records from the end while preserving the requested complete permutation.
pub fn draw_order_offsets(order: &[usize]) -> Result<Vec<SlotOffset>, FormatError> {
    let n = order.len();
    if n > super::MAX_SCENE_SLOTS {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut positions = vec![None; n];
    for (i, value) in order.iter().enumerate() {
        if *value >= n || positions[*value].replace(i).is_some() {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    let mut offsets: Vec<_> = positions
        .into_iter()
        .enumerate()
        .filter_map(|(slot, target)| {
            let offset = target.unwrap() as i32 - slot as i32;
            (offset != 0).then_some(SlotOffset { slot, offset })
        })
        .collect();
    for i in (0..offsets.len()).rev() {
        let removed = offsets.remove(i);
        if draw_order_permutation(n, &offsets)? != order {
            offsets.insert(i, removed);
        }
    }
    Ok(offsets)
}
