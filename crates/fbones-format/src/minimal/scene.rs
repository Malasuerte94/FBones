//! Typed scene profile under the internal desktop migration gate.
//!
//! Only the bounded default-skin graph and known typed wire provenance are
//! editable. Complete reserialization equality remains mandatory; unknown fields
//! and richer branches are rejected.
use super::{
    meshes::{Mesh, Vertex},
    regions::{self, BlendMode, Region, RegionProject},
    MinimalProject,
};
use crate::FormatError;
mod animation;
mod bezier_time;
pub use bezier_time::bezier_time_monotone;
mod constraints_events;
pub use constraints_events::*;
mod deform;
pub use deform::{
    deform_coordinate_count, draw_order_offsets, draw_order_permutation, DeformCurve, DeformKey,
    DeformTimeline, DrawOrderKey, SlotOffset, MAX_DEFORM_COORDINATES,
};
mod attachment_color;
mod slot_dark;
pub use slot_dark::*;
mod ranges;
pub use attachment_color::*;
mod sequence;
pub use animation::{
    Animation, BoneChannel, BoneKeyframe, BoneSplitConfig, BoneSplitMode, BoneTimeline, KeyCurve,
    SlotAttachmentKey, SlotRgbaCurve, SlotRgbaKey, SlotTimeline,
};
pub use sequence::*;
mod validate;
pub mod wire;
mod write;
pub use ranges::{FiniteF32, TransformEditorRange};
pub use wire::*;
pub(super) mod editor_metadata;
pub use editor_metadata::*;
mod source_state;
pub use source_state::*;

/// Measured FBones aggregate budgets, not original format limits.
pub const MAX_SCENE_BONES: usize = 256;
pub const MAX_SCENE_SLOTS: usize = 512;
pub const MAX_SCENE_MESH_VERTICES: usize = 512;
pub const MAX_SCENE_MESH_TRIANGLE_INDICES: usize = 3072;
pub const MAX_SCENE_TRACKS: usize = 4096;
pub const MAX_SCENE_KEYS: usize = 8192;
pub const MAX_SCENE_DOMAINS: usize = 16384;
/// Measured active-clip track budget; key/per-track budgets remain unchanged.
pub const MAX_ANIMATION_TRACKS: usize = 1024;
pub const MAX_ANIMATION_KEYS: usize = 4096;
pub const MAX_TRACK_KEYS: usize = 4096;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct AttachmentAddress {
    pub slot: usize,
    pub attachment: usize,
}
#[derive(Clone, Debug, PartialEq)]
pub struct SceneProject {
    pub wire: Option<SceneWire>,
    pub rig: MinimalProject,
    pub images_root: String,
    pub audio_root: String,
    pub events: Vec<EventDefinition>,
    /// Retained Skeleton11/tag53 Boolean. Its broader editor meaning is unknown.
    pub editor_flag_53: bool,
    /// Setup draw order, back to front.
    pub slots: Vec<SceneSlot>,
    /// Global default-skin inventory order, independent of active attachments.
    pub attachment_order: Vec<AttachmentAddress>,
    pub attachment_sequences: Vec<AttachmentSequence>,
    pub attachment_colors: Vec<AttachmentColor>,
    pub slot_dark_colors: Vec<SlotDarkColor>,
    /// Evaluation order. The observed wire constraint group's children reverse it.
    pub constraints: Vec<Constraint>,
    pub animations: Vec<Animation>,
    pub fps: f32,
}
#[derive(Clone, Debug, PartialEq)]
pub struct SceneSlot {
    pub name: String,
    pub bone: usize,
    pub color: [u8; 4],
    pub blend: BlendMode,
    pub attachments: Vec<SceneAttachment>,
    /// A local inventory index; selection in the editor is separate view state.
    pub active_attachment: Option<usize>,
}
impl SceneSlot {
    pub fn active(&self) -> Option<&SceneAttachment> {
        self.active_attachment.and_then(|i| self.attachments.get(i))
    }
}
#[derive(Clone, Debug, PartialEq)]
pub enum SceneAttachment {
    Region(Region),
    Mesh(Box<Mesh>),
    Clipping(Clipping),
}
impl SceneAttachment {
    pub fn name(&self) -> &str {
        match self {
            Self::Region(r) => &r.name,
            Self::Mesh(m) => &m.image.name,
            Self::Clipping(c) => &c.name,
        }
    }
    pub fn image(&self) -> Option<&Region> {
        match self {
            Self::Region(r) => Some(r),
            Self::Mesh(m) => Some(&m.image),
            Self::Clipping(_) => None,
        }
    }
    pub fn image_mut(&mut self) -> Option<&mut Region> {
        match self {
            Self::Region(r) => Some(r),
            Self::Mesh(m) => Some(&mut m.image),
            Self::Clipping(_) => None,
        }
    }
    pub fn mesh(&self) -> Option<&Mesh> {
        match self {
            Self::Mesh(m) => Some(m),
            _ => None,
        }
    }
    pub fn mesh_mut(&mut self) -> Option<&mut Mesh> {
        match self {
            Self::Mesh(m) => Some(m),
            _ => None,
        }
    }
    pub fn clipping(&self) -> Option<&Clipping> {
        match self {
            Self::Clipping(c) => Some(c),
            _ => None,
        }
    }
    pub fn clipping_mut(&mut self) -> Option<&mut Clipping> {
        match self {
            Self::Clipping(c) => Some(c),
            _ => None,
        }
    }
    pub(super) fn class(&self) -> u32 {
        match self {
            Self::Region(_) => 43,
            Self::Mesh(_) => 46,
            Self::Clipping(_) => 84,
        }
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct Clipping {
    pub name: String,
    /// The editor profile requires Some(valid slot). Runtime JSON's omitted
    /// end is materialized as the last slot; raw null crashes original 4.3.26.
    /// None can represent an unfinished UI draft but cannot be serialized.
    pub end_slot: Option<usize>,
    pub convex: bool,
    pub inverse: bool,
    pub color: [u8; 4],
    pub weighted: bool,
    pub bones: Vec<usize>,
    pub vertices: Vec<Vertex>,
    pub edges: Vec<u32>,
}
#[derive(Clone, Debug, PartialEq)]
// Keep the six fixed editor rows inline with their typed Transform model.
// This bounded authored graph is cloned for history, not transferred per frame.
#[allow(clippy::large_enum_variant)]
pub enum Constraint {
    Ik(IkConstraint),
    Transform(TransformConstraint),
    Physics(PhysicsConstraint),
}
impl Constraint {
    pub fn name(&self) -> &str {
        match self {
            Self::Ik(c) => &c.name,
            Self::Transform(c) => &c.name,
            Self::Physics(c) => &c.name,
        }
    }
    pub(super) fn class(&self) -> u32 {
        match self {
            Self::Ik(_) => 56,
            Self::Transform(_) => 65,
            Self::Physics(_) => 121,
        }
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct IkConstraint {
    pub name: String,
    pub bones: Vec<usize>,
    pub target: usize,
    pub mix: f32,
    pub softness: f32,
    pub bend_positive: bool,
    pub compress: bool,
    pub stretch: bool,
}
impl IkConstraint {
    pub fn new(name: String, bones: Vec<usize>, target: usize) -> Self {
        Self {
            name,
            bones,
            target,
            mix: 1.0,
            softness: 0.0,
            bend_positive: true,
            compress: false,
            stretch: false,
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum TransformProperty {
    Rotate,
    X,
    Y,
    ScaleX,
    ScaleY,
    ShearY,
}
impl TransformProperty {
    pub const ALL: [Self; 6] = [
        Self::Rotate,
        Self::X,
        Self::Y,
        Self::ScaleX,
        Self::ScaleY,
        Self::ShearY,
    ];
    pub fn index(self) -> usize {
        match self {
            Self::Rotate => 0,
            Self::X => 1,
            Self::Y => 2,
            Self::ScaleX => 3,
            Self::ScaleY => 4,
            Self::ShearY => 5,
        }
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct TransformTo {
    pub property: TransformProperty,
    pub offset: f32,
    pub max: f32,
    pub scale: f32,
}
impl TransformTo {
    pub fn identity(property: TransformProperty) -> Self {
        Self {
            property,
            offset: 0.0,
            max: 1.0,
            scale: 1.0,
        }
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct TransformFrom {
    pub property: TransformProperty,
    pub offset: f32,
    pub to: Vec<TransformTo>,
}
impl TransformFrom {
    pub fn identity(property: TransformProperty) -> Self {
        Self {
            property,
            offset: 0.0,
            to: vec![TransformTo::identity(property)],
        }
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct TransformConstraint {
    pub name: String,
    pub source: usize,
    pub bones: Vec<usize>,
    pub local_source: bool,
    pub local_target: bool,
    pub additive: bool,
    pub clamp: bool,
    /// Rotate, X, Y, ScaleX, ScaleY, ShearY in that order.
    pub offsets: [f32; 6],
    /// The same channel order; inactive unmapped channels are normally zero.
    pub mix: [f32; 6],
    pub properties: Vec<TransformFrom>,
    /// Rotate, X, Y, ScaleX, ScaleY, ShearY editor endpoints. Independent from
    /// runtime mapping values; nullable cells and float bits are authoritative.
    pub editor_ranges: [TransformEditorRange; 6],
}
impl TransformConstraint {
    pub fn new(name: String, bones: Vec<usize>, source: usize) -> Self {
        Self {
            name,
            source,
            bones,
            local_source: false,
            local_target: false,
            additive: false,
            clamp: false,
            offsets: [0.0; 6],
            mix: [1.0; 6],
            properties: TransformProperty::ALL
                .into_iter()
                .map(TransformFrom::identity)
                .collect(),
            editor_ranges: [TransformEditorRange::default(); 6],
        }
    }

    pub fn editor_range_bits(&self) -> [Option<u32>; 24] {
        std::array::from_fn(|i| self.editor_ranges[i / 4].bits()[i % 4])
    }
}
/// Proven raw angular coefficients. Bits remain authoritative so reading then
/// saving never loses float precision through an inverse UI conversion.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PhysicsAngular {
    rotate_bits: u32,
    shear_bits: u32,
}
impl Default for PhysicsAngular {
    fn default() -> Self {
        Self {
            rotate_bits: 0x7fc0_0000,
            shear_bits: 0,
        }
    }
}
impl PhysicsAngular {
    pub fn from_wire_bits(rotate_bits: u32, shear_bits: u32) -> Result<Self, FormatError> {
        let r = f32::from_bits(rotate_bits);
        let s = f32::from_bits(shear_bits);
        if !s.is_finite()
            || s < 0.0
            || !(r.is_finite() || (rotate_bits == 0x7fc0_0000 && shear_bits == 0))
            || r < 0.0
        {
            return Err(FormatError::UnsupportedProfile);
        }
        Ok(Self {
            rotate_bits,
            shear_bits,
        })
    }
    pub fn wire_bits(self) -> (u32, u32) {
        (self.rotate_bits, self.shear_bits)
    }
    /// Observed effective-value conversion, inferred from controlled original
    /// imports. Raw bits, not this rounded inverse, are used during saving.
    pub fn effective(self) -> [f32; 2] {
        let a = f32::from_bits(self.rotate_bits);
        let b = f32::from_bits(self.shear_bits);
        let max = a.max(b);
        if a.is_nan() || max == 0.0 {
            [0.0, 0.0]
        } else {
            let denominator = a / max + b / max;
            [a / denominator, b / denominator]
        }
    }
    pub fn from_effective(rotate: f32, shear: f32) -> Result<Self, FormatError> {
        if !rotate.is_finite() || !shear.is_finite() || rotate < 0.0 || shear < 0.0 {
            return Err(FormatError::UnsupportedProfile);
        }
        if rotate == 0.0 && shear == 0.0 {
            return Ok(Self::default());
        }
        let k = (rotate + shear) / rotate.max(shear);
        Self::from_wire_bits((rotate * k).to_bits(), (shear * k).to_bits())
    }
}
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct PhysicsGlobals {
    pub inertia: bool,
    pub strength: bool,
    pub damping: bool,
    pub mass: bool,
    pub wind: bool,
    pub gravity: bool,
    pub mix: bool,
}
#[derive(Clone, Debug, PartialEq)]
pub struct PhysicsConstraint {
    pub name: String,
    pub bone: usize,
    pub x: f32,
    pub y: f32,
    pub scale_x: f32,
    pub angular: PhysicsAngular,
    /// Seconds per fixed step, observed as reciprocal exported FPS.
    pub step: f32,
    pub inertia: f32,
    pub strength: f32,
    pub damping: f32,
    pub mass: f32,
    pub wind: f32,
    pub gravity: f32,
    pub mix: f32,
    pub limit: f32,
    pub globals: PhysicsGlobals,
}
impl PhysicsConstraint {
    pub fn new(name: String, bone: usize) -> Self {
        Self {
            name,
            bone,
            x: 0.0,
            y: 0.0,
            scale_x: 0.0,
            angular: PhysicsAngular::default(),
            step: 1.0 / 60.0,
            inertia: 0.5,
            strength: 100.0,
            damping: 0.85,
            mass: 1.0,
            wind: 0.0,
            gravity: 0.0,
            mix: 1.0,
            limit: 5000.0,
            globals: PhysicsGlobals::default(),
        }
    }
}

impl From<&RegionProject> for SceneProject {
    fn from(project: &RegionProject) -> Self {
        Self {
            wire: None,
            attachment_sequences: vec![],
            attachment_colors: vec![],
            slot_dark_colors: vec![],
            rig: project.rig.clone(),
            images_root: project.images_root.clone(),
            audio_root: "./audio".into(),
            events: Vec::new(),
            editor_flag_53: false,
            constraints: vec![],
            animations: vec![Animation::new("animation".into())],
            fps: 30.0,
            slots: project
                .slots
                .iter()
                .map(|s| SceneSlot {
                    name: s.name.clone(),
                    bone: s.bone,
                    color: s.color,
                    blend: s.blend,
                    active_attachment: s.visible.then_some(0),
                    attachments: s
                        .attachment
                        .iter()
                        .map(|a| match a {
                            regions::Attachment::Region(r) => SceneAttachment::Region(r.clone()),
                            regions::Attachment::Mesh(m) => SceneAttachment::Mesh(m.clone()),
                        })
                        .collect(),
                })
                .collect(),
            attachment_order: project
                .region_order
                .iter()
                .map(|slot| AttachmentAddress {
                    slot: *slot,
                    attachment: 0,
                })
                .collect(),
        }
    }
}
impl SceneProject {
    /// Conversion succeeds only when every scene value is representable by the
    /// older profile. It never drops constraints or inactive alternatives.
    pub fn to_regions(&self) -> Result<RegionProject, FormatError> {
        validate::project(self)?;
        if self.slots.len() > 128
            || !self.slot_dark_colors.is_empty()
            || !self.attachment_colors.is_empty()
            || !self.attachment_sequences.is_empty()
            || self.wire.is_some()
            || self.editor_flag_53
            || !self.events.is_empty()
            || self.audio_root != "./audio"
            || !self.constraints.is_empty()
            || self.slots.iter().any(|s| s.attachments.len() > 1)
            || self.animations != vec![Animation::new("animation".into())]
            || self.fps != 30.0
        {
            return Err(FormatError::UnsupportedProfile);
        }
        Ok(RegionProject {
            rig: self.rig.clone(),
            images_root: self.images_root.clone(),
            region_order: self.attachment_order.iter().map(|a| a.slot).collect(),
            slots: self
                .slots
                .iter()
                .map(|s| {
                    Ok(regions::Slot {
                        name: s.name.clone(),
                        bone: s.bone,
                        color: s.color,
                        blend: s.blend,
                        visible: s.active_attachment.is_some(),
                        attachment: s
                            .attachments
                            .first()
                            .map(|a| match a {
                                SceneAttachment::Region(r) => {
                                    Ok(regions::Attachment::Region(r.clone()))
                                }
                                SceneAttachment::Mesh(m) => {
                                    super::meshes::validate_mesh(m, s.bone, self.rig.bones.len())?;
                                    Ok(regions::Attachment::Mesh(m.clone()))
                                }
                                SceneAttachment::Clipping(_) => {
                                    Err(FormatError::UnsupportedProfile)
                                }
                            })
                            .transpose()?,
                    })
                })
                .collect::<Result<_, _>>()?,
        })
    }
}
pub fn encode_scene_payload(project: &SceneProject) -> Result<Vec<u8>, FormatError> {
    validate::project(project)?;
    let (payload, domains, generics) =
        super::encode_record_payload_counted(&write::project_record(project), project.rig.identity);
    if domains > MAX_SCENE_DOMAINS as u32 || generics > super::MAX_GENERIC_OBJECTS as u32 {
        return Err(FormatError::UnsupportedProfile);
    }
    // The same bounded structural reader must accept every authored output.
    // This is not decode_scene: no semantic extraction/re-encoding recursion.
    super::reader::validate_scene_payload_structure(&payload)?;
    Ok(payload)
}
pub fn encode_scene(project: &SceneProject) -> Result<Vec<u8>, FormatError> {
    crate::encode_envelope(&encode_scene_payload(project)?)
}
pub fn decode_scene(payload: &[u8]) -> Result<SceneProject, FormatError> {
    super::reader::decode_scene_profile(payload)
}
pub(super) fn schema_record() -> super::Record {
    write::schema_record()
}

#[cfg(test)]
#[path = "scene/ranges_tests.rs"]
mod range_tests;

#[cfg(test)]
mod tests {
    use super::*;
    fn region(name: &str) -> Region {
        Region {
            name: name.into(),
            path: String::new(),
            x: 0.0,
            y: 0.0,
            rotation: 0.0,
            scale_x: 1.0,
            scale_y: 1.0,
            width: 32.0,
            height: 24.0,
        }
    }
    fn sample() -> SceneProject {
        let mut rig = MinimalProject::new("scene".into(), [7; 16]);
        let mut b = super::super::Bone::root();
        b.name = "bone".into();
        b.parent = Some(0);
        b.x = 20.0;
        b.length = 40.0;
        rig.bones.push(b);
        SceneProject {
            wire: None,
            attachment_sequences: vec![],
            attachment_colors: vec![],
            slot_dark_colors: vec![],
            rig,
            images_root: "./images/".into(),
            audio_root: "./audio".into(),
            events: Vec::new(),
            editor_flag_53: false,
            slots: vec![SceneSlot {
                name: "slot".into(),
                bone: 0,
                color: [255; 4],
                blend: BlendMode::Normal,
                active_attachment: Some(1),
                attachments: vec![
                    SceneAttachment::Region(region("A")),
                    SceneAttachment::Mesh(Box::new(super::super::meshes::quad(region("B"), 0))),
                ],
            }],
            attachment_order: vec![
                AttachmentAddress {
                    slot: 0,
                    attachment: 0,
                },
                AttachmentAddress {
                    slot: 0,
                    attachment: 1,
                },
            ],
            constraints: vec![],
            animations: vec![Animation::new("animation".into())],
            fps: 30.0,
        }
    }
    #[test]
    fn ik_targets_must_be_outside_every_constrained_subtree_even_at_zero_mix() {
        let mut p = sample();
        for (name, parent) in [("child", 1), ("deep", 2), ("outside", 0)] {
            let mut b = super::super::Bone::root();
            b.name = name.into();
            b.parent = Some(parent);
            b.x = 10.0;
            p.rig.bones.push(b);
        }
        for members in [vec![1], vec![1, 2]] {
            for target in [1, 2, 3] {
                let mut c = IkConstraint::new("feedback".into(), members.clone(), target);
                c.mix = 0.0;
                p.constraints = vec![Constraint::Ik(c)];
                assert!(encode_scene_payload(&p).is_err());
            }
        }
        for target in [0, 4] {
            p.constraints = vec![Constraint::Ik(IkConstraint::new(
                "valid".into(),
                vec![1, 2],
                target,
            ))];
            let payload = encode_scene_payload(&p).unwrap();
            assert_eq!(decode_scene(&payload).unwrap(), p);
        }
    }
    #[test]
    fn physics_damping_matches_the_nonnegative_evaluator_domain_without_an_invented_upper_cap() {
        let mut p = sample();
        for damping in [-0.1, 0.0, 1.0, 1.1] {
            let mut c = PhysicsConstraint::new("spring".into(), 1);
            c.damping = damping;
            p.constraints = vec![Constraint::Physics(c)];
            let encoded = encode_scene_payload(&p);
            if damping < 0.0 {
                assert!(encoded.is_err());
            } else {
                assert_eq!(decode_scene(&encoded.unwrap()).unwrap(), p);
            }
        }
    }
    #[test]
    fn active_attachment_and_inventory_are_independent_and_legacy_refuses_multiple() {
        for active in [Some(0), Some(1), None] {
            let mut p = sample();
            p.slots[0].active_attachment = active;
            let bytes = encode_scene_payload(&p).unwrap();
            assert_eq!(decode_scene(&bytes).unwrap(), p);
            assert!(regions::decode_regions(&bytes).is_err());
            assert!(p.to_regions().is_err());
        }
    }
    #[test]
    fn legacy_payloads_remain_byte_identical_when_promoted_without_data_loss() {
        let mut p = sample();
        p.slots[0].attachments.truncate(1);
        p.slots[0].active_attachment = None;
        p.attachment_order.truncate(1);
        let old = p.to_regions().unwrap();
        let payload = regions::encode_region_payload(&old).unwrap();
        assert_eq!(
            encode_scene_payload(&SceneProject::from(&old)).unwrap(),
            payload
        );
        assert_eq!(decode_scene(&payload).unwrap().to_regions().unwrap(), old);
    }
    #[test]
    fn mixed_constraints_clipping_and_raw_physics_bits_survive_complete_roundtrip() {
        let mut p = sample();
        p.slots[0]
            .attachments
            .push(SceneAttachment::Clipping(Clipping {
                name: "mask".into(),
                end_slot: Some(0),
                convex: false,
                inverse: true,
                color: [20, 40, 80, 255],
                weighted: false,
                bones: vec![0],
                vertices: vec![
                    Vertex {
                        weights: vec![1.0],
                        positions: vec![0.0, 0.0],
                    },
                    Vertex {
                        weights: vec![1.0],
                        positions: vec![30.0, 0.0],
                    },
                    Vertex {
                        weights: vec![1.0],
                        positions: vec![0.0, 20.0],
                    },
                ],
                edges: vec![0, 1, 1, 2, 0, 2],
            }));
        p.attachment_order.push(AttachmentAddress {
            slot: 0,
            attachment: 2,
        });
        p.slots[0].active_attachment = Some(2);
        let physics = PhysicsConstraint::new("spring".into(), 1);
        p.constraints = vec![
            Constraint::Physics(physics),
            Constraint::Transform(TransformConstraint::new("copy".into(), vec![1], 0)),
            Constraint::Ik(IkConstraint::new("point".into(), vec![1], 0)),
        ];
        let bytes = encode_scene_payload(&p).unwrap();
        let decoded = decode_scene(&bytes).unwrap();
        assert_eq!(decoded, p);
        assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
        assert!(regions::decode_regions(&bytes).is_err());
        assert!(decoded.slots[0].active().unwrap().image().is_none());
        let Constraint::Physics(spring) = &decoded.constraints[0] else {
            panic!()
        };
        assert_eq!(spring.angular.wire_bits(), (0x7fc0_0000, 0));
        assert_eq!(spring.angular.effective(), [0.0, 0.0]);
        // Original 4.3.26 rejected a generated null clipping end. Both public
        // encoding and recognition must refuse that branch before app edits.
        p.slots[0].attachments[2].clipping_mut().unwrap().end_slot = None;
        assert!(encode_scene_payload(&p).is_err());
        let raw = super::super::encode_record_payload(&write::project_record(&p), p.rig.identity);
        assert!(decode_scene(&raw).is_err());
        p.slots[0].attachments[2].clipping_mut().unwrap().end_slot = Some(0);
        for (rotate_bits, shear_bits) in [(0x7fc0_0001, 0), (0x7fc0_0000, 0.1f32.to_bits())] {
            let Constraint::Physics(c) = &mut p.constraints[0] else {
                panic!()
            };
            c.angular = PhysicsAngular {
                rotate_bits,
                shear_bits,
            };
            assert!(encode_scene_payload(&p).is_err());
            let raw =
                super::super::encode_record_payload(&write::project_record(&p), p.rig.identity);
            assert!(decode_scene(&raw).is_err());
        }
    }
    #[test]
    fn truncation_corruption_and_invalid_graphs_are_never_rewritten() {
        let p = sample();
        let payload = encode_scene_payload(&p).unwrap();
        for end in 0..payload.len() {
            assert!(decode_scene(&payload[..end]).is_err());
        }
        for i in 28..payload.len() {
            let mut b = payload.clone();
            b[i] = 255;
            if let Ok(decoded) = decode_scene(&b) {
                assert_eq!(encode_scene_payload(&decoded).unwrap(), b);
            }
        }
        for invalid in 0..4 {
            let mut p = p.clone();
            match invalid {
                0 => p.slots[0].active_attachment = Some(8),
                1 => p.attachment_order[1] = p.attachment_order[0],
                2 => p.slots[0].attachments[1] = p.slots[0].attachments[0].clone(),
                _ => p.constraints.push(Constraint::Ik(IkConstraint::new(
                    "bad".into(),
                    vec![999],
                    0,
                ))),
            }
            assert!(encode_scene_payload(&p).is_err());
        }
        for (a, b) in [
            (0x7fc0_0001, 0),
            (0xffc0_0000, 0),
            (f32::INFINITY.to_bits(), 0),
            (0x7fc0_0000, 1),
        ] {
            assert!(PhysicsAngular::from_wire_bits(a, b).is_err());
        }
    }
}

#[cfg(test)]
#[path = "scene/deform_tests.rs"]
mod deform_tests;

#[cfg(test)]
#[path = "scene/capacity_tests.rs"]
mod capacity_tests;

#[cfg(test)]
mod split_tests;

#[cfg(test)]
#[path = "scene/declaration_tests.rs"]
mod declaration_tests;
#[cfg(test)]
mod large_mesh_tests;
#[cfg(test)]
#[path = "scene/slot_capacity_tests.rs"]
mod slot_capacity_tests;
#[cfg(test)]
#[path = "scene/string_form_tests.rs"]
mod string_form_tests;
