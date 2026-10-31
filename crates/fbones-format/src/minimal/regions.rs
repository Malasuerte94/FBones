//! Opt-in region/slot codec. The desktop recognizer deliberately continues to
//! reject these files until native image resources and editing are implemented.
use super::*;

#[derive(Clone, Debug, PartialEq)]
pub struct Region {
    pub name: String,
    /// Empty means use the attachment name. Relative to the ./images/ folder.
    pub path: String,
    pub x: f32,
    pub y: f32,
    pub rotation: f32,
    pub scale_x: f32,
    pub scale_y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Attachment {
    Region(Region),
    Mesh(Box<meshes::Mesh>),
}
impl From<Region> for Attachment {
    fn from(region: Region) -> Self {
        Self::Region(region)
    }
}
impl std::ops::Deref for Attachment {
    type Target = Region;
    fn deref(&self) -> &Region {
        match self {
            Self::Region(region) => region,
            Self::Mesh(mesh) => &mesh.image,
        }
    }
}
impl std::ops::DerefMut for Attachment {
    fn deref_mut(&mut self) -> &mut Region {
        match self {
            Self::Region(region) => region,
            Self::Mesh(mesh) => &mut mesh.image,
        }
    }
}
impl Attachment {
    pub fn class(&self) -> u32 {
        match self {
            Self::Region(_) => 43,
            Self::Mesh(_) => 46,
        }
    }
    pub fn mesh(&self) -> Option<&meshes::Mesh> {
        match self {
            Self::Mesh(mesh) => Some(mesh),
            _ => None,
        }
    }
    pub fn mesh_mut(&mut self) -> Option<&mut meshes::Mesh> {
        match self {
            Self::Mesh(mesh) => Some(mesh),
            _ => None,
        }
    }
}

/// Proven Slot13/tag7 values in original 4.3.26. Other modes remain unsupported.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum BlendMode {
    #[default]
    Normal,
    Additive,
    Multiply,
    Screen,
}
impl BlendMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Additive => "additive",
            Self::Multiply => "multiply",
            Self::Screen => "screen",
        }
    }
    pub fn from_name(value: &str) -> Option<Self> {
        match value {
            "normal" => Some(Self::Normal),
            "additive" => Some(Self::Additive),
            "multiply" => Some(Self::Multiply),
            "screen" => Some(Self::Screen),
            _ => None,
        }
    }
    pub(super) fn wire(self) -> u32 {
        match self {
            Self::Normal => 1,
            Self::Additive => 2,
            Self::Multiply => 3,
            Self::Screen => 4,
        }
    }
    pub(super) fn from_wire(value: u32) -> Option<Self> {
        match value {
            1 => Some(Self::Normal),
            2 => Some(Self::Additive),
            3 => Some(Self::Multiply),
            4 => Some(Self::Screen),
            _ => None,
        }
    }
    pub(super) fn reference_label(self) -> &'static str {
        match self {
            Self::Normal => "slot-mode-7",
            Self::Additive => "slot-blend-additive",
            Self::Multiply => "slot-blend-multiply",
            Self::Screen => "slot-blend-screen",
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Slot {
    pub name: String,
    pub bone: usize,
    pub attachment: Option<Attachment>,
    pub visible: bool,
    pub color: [u8; 4],
    pub blend: BlendMode,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RegionProject {
    pub rig: MinimalProject,
    /// Persisted image folder. Absolute or project-relative; the desktop validates access.
    pub images_root: String,
    /// Setup draw order, back to front. One default-skin region per slot.
    pub slots: Vec<Slot>,
    /// Attachment inventory order, expressed as slot indices. This order is
    /// independent of setup draw order and must survive slot reordering.
    pub region_order: Vec<usize>,
}

pub fn encode_region_payload(project: &RegionProject) -> Result<Vec<u8>, FormatError> {
    validate(&project.rig)?;
    if project.images_root.len() > 4096 || project.images_root.chars().any(char::is_control) {
        return Err(FormatError::UnsupportedProfile);
    }
    if project.slots.len() > 128 {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut inventory = std::collections::HashSet::new();
    for index in &project.region_order {
        if !inventory.insert(*index)
            || project
                .slots
                .get(*index)
                .is_none_or(|s| s.attachment.is_none())
        {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    if inventory.len()
        != project
            .slots
            .iter()
            .filter(|s| s.attachment.is_some())
            .count()
    {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut names = std::collections::HashSet::new();
    let mut vertices = 0;
    for slot in &project.slots {
        if slot.name.is_empty()
            || slot.name.len() > 1024
            || !names.insert(&slot.name)
            || slot.bone >= project.rig.bones.len()
            || (slot.attachment.is_none() && slot.visible)
        {
            return Err(FormatError::UnsupportedProfile);
        }
        if let Some(region) = &slot.attachment {
            if region.name.is_empty()
                || region.name.len() > 1024
                || region.path.len() > 1024
                || [
                    region.x,
                    region.y,
                    region.rotation,
                    region.scale_x,
                    region.scale_y,
                    region.width,
                    region.height,
                ]
                .iter()
                .any(|v| !v.is_finite())
                || region.width <= 0.0
                || region.height <= 0.0
            {
                return Err(FormatError::UnsupportedProfile);
            }
            if let Attachment::Mesh(mesh) = region {
                meshes::validate_mesh(mesh, slot.bone, project.rig.bones.len())?;
                vertices += mesh.vertices.len();
            }
        }
    }
    if vertices > 4096 {
        return Err(FormatError::UnsupportedProfile);
    }
    Ok(encode_record_payload(
        &project_record_with_regions(
            &project.rig,
            &project.slots,
            &project.region_order,
            &project.images_root,
        ),
        project.rig.identity,
    ))
}

pub fn encode_regions(project: &RegionProject) -> Result<Vec<u8>, FormatError> {
    encode_envelope(&encode_region_payload(project)?)
}

pub fn decode_regions(payload: &[u8]) -> Result<RegionProject, FormatError> {
    reader::decode_region_profile(payload)
}

pub(super) fn slot_records(slots: &[Slot]) -> Vec<Object> {
    use Field::*;
    slots
        .iter()
        .enumerate()
        .map(|(index, slot)| {
            let slot_group = if index == 0 {
                group(
                    Some("slot-group"),
                    (0..slots.len())
                        .map(|i| Object::Link(13, format!("slot-{i}")))
                        .collect(),
                )
            } else {
                Object::Link(108, "slot-group".into())
            };
            Object::Record(Record {
                class: 13,
                label: Some(format!("slot-{index}")),
                fields: vec![
                    (1, text(&slot.name)),
                    (5, object(Object::Color(slot.color))),
                    (2, DomainLink(12, format!("bone-{}", slot.bone))),
                    (16, object(slot_group)),
                    (12, Bool(false)),
                    (14, Enum(3, "slot-mode-14")),
                    (
                        9,
                        object(if slot.visible {
                            Object::Link(
                                slot.attachment.as_ref().unwrap().class(),
                                format!("region-{index}"),
                            )
                        } else {
                            Object::Null
                        }),
                    ),
                    (15, Float(1.0 / 12.0)),
                    (13, Bool(true)),
                    (3, UInt(1)),
                    (8, Bool(false)),
                    (7, Enum(slot.blend.wire(), slot.blend.reference_label())),
                    (0, DomainLink(11, "skeleton".into())),
                    (11, object(Object::Color([0, 0, 0, 255]))),
                    (126, UInt(0)),
                ],
            })
        })
        .collect()
}

pub(super) fn region_records(slots: &[Slot], order: &[usize]) -> Vec<Object> {
    use Field::*;
    order
        .iter()
        .filter_map(|index| {
            let slot = &slots[*index];
            slot.attachment.as_ref().map(|region| {
                if let Attachment::Mesh(mesh) = region {
                    return meshes::record(mesh, *index);
                }
                Object::Record(Record {
                    class: 43,
                    label: Some(format!("region-{index}")),
                    fields: vec![
                        (10, Float(region.rotation)),
                        (15, object(Object::Null)),
                        (11, Float(region.width)),
                        (8, Float(region.scale_x)),
                        (9, Float(region.scale_y)),
                        (14, object(Object::Color([255; 4]))),
                        (6, Float(region.x)),
                        (13, text(&region.path)),
                        (12, Float(region.height)),
                        (7, Float(region.y)),
                        (1, text(&region.name)),
                        (32, Bool(false)),
                        (5, Bool(true)),
                        (0, DomainLink(13, format!("slot-{index}"))),
                        (4, UInt(0)),
                        (33, Bool(true)),
                        (35, Bool(false)),
                    ],
                })
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mixed_slot_blends_preserve_tints_inventory_and_reference_sharing() {
        let mut project = sample();
        let template = project.slots[0].clone();
        project.slots = [
            BlendMode::Normal,
            BlendMode::Additive,
            BlendMode::Multiply,
            BlendMode::Screen,
            BlendMode::Normal,
            BlendMode::Screen,
            BlendMode::Additive,
        ]
        .into_iter()
        .enumerate()
        .map(|(i, blend)| {
            let mut slot = template.clone();
            slot.name = format!("slot{i}");
            slot.attachment.as_mut().unwrap().name = format!("image{i}");
            slot.blend = blend;
            slot.color = [35, 120, 200, 127];
            slot
        })
        .collect();
        project.region_order = (0..project.slots.len()).rev().collect();
        let payload = encode_region_payload(&project).unwrap();
        assert_eq!(decode_regions(&payload).unwrap(), project);
        let original = project.clone();
        project.slots.reverse();
        project.region_order = (0..project.slots.len()).collect();
        let payload = encode_region_payload(&project).unwrap();
        assert_eq!(decode_regions(&payload).unwrap(), project);
        assert_eq!(project.slots[0].color, original.slots[0].color);
    }

    #[test]
    fn unknown_or_wrong_shared_blend_enums_are_rejected_without_normalizing() {
        fn poison_object(object: &mut Object, value: u32, label: &'static str) -> bool {
            match object {
                Object::Record(record) => poison_record(record, value, label),
                Object::Array(items) => items
                    .iter_mut()
                    .any(|object| poison_object(object, value, label)),
                _ => false,
            }
        }
        fn poison_record(record: &mut Record, value: u32, label: &'static str) -> bool {
            if record.class == 13 {
                *record.fields.iter_mut().find(|(tag, _)| *tag == 7).unwrap() =
                    (7, Field::Enum(value, label));
                return true;
            }
            record.fields.iter_mut().any(|(_, field)| match field {
                Field::Value(object) => poison_object(object, value, label),
                _ => false,
            })
        }
        let project = sample();
        for (value, label) in [
            (0, "slot-mode-7"),
            (5, "slot-mode-7"),
            (u32::MAX, "slot-mode-7"),
            (3, "slot-mode-14"),
        ] {
            let mut record = project_record_with_regions(
                &project.rig,
                &project.slots,
                &project.region_order,
                &project.images_root,
            );
            assert!(poison_record(&mut record, value, label));
            let payload = encode_record_payload(&record, project.rig.identity);
            assert!(matches!(
                decode_regions(&payload),
                Err(FormatError::UnsupportedProfile)
            ));
        }
        assert_eq!(project.slots[0].blend, BlendMode::Normal);
    }

    fn sample() -> RegionProject {
        RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("skeleton".into(), [3; 16]),
            region_order: vec![0],
            slots: vec![Slot {
                blend: crate::minimal::regions::BlendMode::Normal,
                color: [255; 4],
                name: "slot".into(),
                bone: 0,
                visible: true,
                attachment: Some(
                    Region {
                        name: "checker".into(),
                        path: String::new(),
                        x: 17.0,
                        y: -9.0,
                        rotation: 25.0,
                        scale_x: 1.5,
                        scale_y: 0.75,
                        width: 32.0,
                        height: 24.0,
                    }
                    .into(),
                ),
            }],
        }
    }

    #[test]
    fn rejects_truncated_or_unsupported_region_records_without_rewriting() {
        let project = sample();
        let payload = encode_region_payload(&project).unwrap();
        for end in 0..payload.len() {
            assert!(decode_regions(&payload[..end]).is_err());
        }
        for i in 28..payload.len() {
            let mut mutated = payload.clone();
            mutated[i] = 255;
            if let Ok(model) = decode_regions(&mutated) {
                assert_eq!(encode_region_payload(&model).unwrap(), mutated);
            }
        }
        let mut invalid = project.clone();
        invalid.slots[0].bone = 1;
        assert!(encode_region_payload(&invalid).is_err());
        invalid = project.clone();
        invalid.slots[0].attachment.as_mut().unwrap().width = f32::NAN;
        assert!(encode_region_payload(&invalid).is_err());
        invalid = project;
        invalid.slots[0].attachment = None;
        assert!(encode_region_payload(&invalid).is_err());
    }

    #[test]
    fn inlines_a_deep_parent_chain_and_shared_slot_group_within_supported_limits() {
        let mut project = sample();
        for i in 1..128 {
            project.rig.bones.push(Bone {
                name: format!("bone-{i}"),
                parent: Some(i - 1),
                x: 1.0,
                y: 0.0,
                rotation: 0.0,
                length: 1.0,
                ..Bone::root()
            });
        }
        project.slots[0].bone = 127;
        for i in 1..128 {
            let mut slot = project.slots[0].clone();
            slot.name = format!("slot-{i}");
            slot.bone = i;
            project.slots.push(slot);
            project.region_order.push(i);
        }
        let payload = encode_region_payload(&project).unwrap();
        assert_eq!(decode_regions(&payload).unwrap(), project);
    }
    #[test]
    fn affine_colors_and_nested_image_paths_are_canonical_and_preserved() {
        let mut p = sample();
        p.images_root = "./art/library/".into();
        let b = &mut p.rig.bones[0];
        b.scale_x = 1.75;
        b.scale_y = -0.6;
        b.shear_x = 17.0;
        b.shear_y = -23.0;
        b.color = [0x22, 0xbb, 0x66, 0xff];
        p.slots[0].color = [0x44, 0x88, 0xcc, 0x99];
        p.slots[0].attachment.as_mut().unwrap().path = "nested/checker".into();
        let payload = encode_region_payload(&p).unwrap();
        assert_eq!(decode_regions(&payload).unwrap(), p);
        p.images_root = "bad\nroot".into();
        assert!(encode_region_payload(&p).is_err());
    }

    #[test]
    fn skeleton_only_reader_rejects_image_root_it_cannot_preserve() {
        let mut p = sample();
        p.slots.clear();
        p.region_order.clear();
        let default_payload = encode_region_payload(&p).unwrap();
        assert_eq!(decode_minimal(&default_payload).unwrap(), p.rig);
        p.images_root = "./external-library/".into();
        let payload = encode_region_payload(&p).unwrap();
        assert_eq!(decode_regions(&payload).unwrap(), p);
        assert!(decode_minimal(&payload).is_err());
    }
}
