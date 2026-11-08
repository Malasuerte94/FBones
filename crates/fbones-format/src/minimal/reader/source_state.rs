//! Typed extraction of the closed source-state fields; no opaque records kept.
use super::*;
use crate::minimal::scene::*;
fn value(fields: &BTreeMap<u32, Value>, tag: u32) -> Result<&Value> {
    fields.get(&tag).ok_or(FormatError::UnsupportedProfile)
}
fn uint(fields: &BTreeMap<u32, Value>, tag: u32) -> Result<u32> {
    match value(fields, tag)? {
        Value::UInt(v) => Ok(*v),
        _ => unsupported(),
    }
}
fn flag(fields: &BTreeMap<u32, Value>, tag: u32) -> Result<bool> {
    match value(fields, tag)? {
        Value::Flag(v) => Ok(*v),
        _ => unsupported(),
    }
}
fn flag126(fields: &BTreeMap<u32, Value>) -> Result<bool> {
    match uint(fields, 126)? {
        0 => Ok(false),
        1 => Ok(true),
        _ => unsupported(),
    }
}
fn float(fields: &BTreeMap<u32, Value>, tag: u32) -> Result<FiniteF32> {
    match value(fields, tag)? {
        Value::Float(v) => FiniteF32::new(*v),
        _ => unsupported(),
    }
}
pub(super) fn read(
    r: &Reader<'_>,
    skeleton: &BTreeMap<u32, Value>,
    bones: &[Reference],
    slots: &[Reference],
    inventory: &[Vec<Reference>],
    constraints: &[Reference],
    animations: &[Reference],
) -> Result<Option<WireSourceState>> {
    let mut state = WireSourceState {
        skeleton_126: flag126(skeleton)?,
        ..WireSourceState::default()
    };
    for (i, reference) in bones.iter().enumerate() {
        let fields = r.fields(*reference, 12)?;
        if flag126(fields)? {
            state.bone_126.push(i);
        }
        let label = r.text(Reader::field_reference(fields, 28)?)?;
        if label != "bone" {
            state.bone_labels_28.push((i, label));
        }
    }
    for (i, reference) in slots.iter().enumerate() {
        if flag126(r.fields(*reference, 13)?)? {
            state.slot_126.push(i);
        }
    }
    for (i, reference) in animations.iter().enumerate() {
        if flag(r.fields(*reference, 18)?, 3)? {
            state.animation_3.push(i);
        }
    }
    for (i, tag) in SOURCE_GROUP_TAGS.into_iter().enumerate() {
        state.group_2[i] = uint(r.fields(Reader::field_reference(skeleton, tag)?, 108)?, 2)?;
    }
    for (i, tag) in SOURCE_TOGGLE_TAGS.into_iter().enumerate() {
        state.skeleton_toggles[i] =
            flag(r.fields(Reader::field_reference(skeleton, tag)?, 80)?, 0)?;
    }
    for (slot, references) in inventory.iter().enumerate() {
        for (attachment, reference) in references.iter().enumerate() {
            let Reference::Domain(index) = reference else {
                return unsupported();
            };
            if r.domain[*index].class == 46 {
                let v = float(r.fields(*reference, 46)?, 19)?;
                if v.to_bits() != 0 {
                    state
                        .mesh_19
                        .push((AttachmentAddress { slot, attachment }, v));
                }
            }
        }
    }
    for (constraint, reference) in constraints.iter().enumerate() {
        let Reference::Domain(i) = reference else {
            return unsupported();
        };
        let class = r.domain[*i].class;
        let fields = r.fields(*reference, class)?;
        match class {
            56 => {
                let row = WireIkSourceState {
                    constraint,
                    mix_6: float(fields, 6)?,
                    uint_17: uint(fields, 17)?,
                };
                if row.mix_6.to_bits() != 0 || row.uint_17 != 0 {
                    state.ik.push(row);
                }
            }
            65 => {
                let values = SOURCE_TRANSFORM_TAGS
                    .map(|tag| float(fields, tag))
                    .into_iter()
                    .collect::<Result<Vec<_>>>()?
                    .try_into()
                    .map_err(|_| FormatError::UnsupportedProfile)?;
                state
                    .transform
                    .push(WireTransformSourceState { constraint, values });
            }
            121 => {
                let values = SOURCE_PHYSICS_TAGS
                    .map(|tag| float(fields, tag))
                    .into_iter()
                    .collect::<Result<Vec<_>>>()?
                    .try_into()
                    .map_err(|_| FormatError::UnsupportedProfile)?;
                state
                    .physics
                    .push(WirePhysicsSourceState { constraint, values });
            }
            _ => return unsupported(),
        }
    }
    state.normalize();
    Ok((state != WireSourceState::default()).then_some(state))
}
