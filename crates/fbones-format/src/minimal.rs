//! Independent writer for the minimal 4.3.26 profile accepted in original Spine.
//! Full project compatibility is not claimed; unsupported data stays inspection-only.
use crate::{encode_envelope, FormatError, TARGET_VERSION};

pub mod meshes;
mod reader;
pub mod regions;
#[cfg(feature = "scene-codec")]
pub mod scene;
pub use reader::decode_minimal;

#[derive(Clone, Debug, PartialEq)]
pub struct Bone {
    pub name: String,
    pub parent: Option<usize>,
    pub x: f32,
    pub y: f32,
    pub rotation: f32,
    pub length: f32,
    pub scale_x: f32,
    pub scale_y: f32,
    pub shear_x: f32,
    pub shear_y: f32,
    pub color: [u8; 4],
}
impl Bone {
    pub fn root() -> Self {
        Self {
            name: "root".into(),
            parent: None,
            x: 0.0,
            y: 0.0,
            rotation: 0.0,
            length: 0.0,
            scale_x: 1.0,
            scale_y: 1.0,
            shear_x: 0.0,
            shear_y: 0.0,
            color: [155, 155, 155, 255],
        }
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct MinimalProject {
    pub name: String,
    pub bones: Vec<Bone>,
    pub identity: [u8; 16],
}
impl MinimalProject {
    pub fn new(name: String, identity: [u8; 16]) -> Self {
        Self {
            name,
            identity,
            bones: vec![Bone::root()],
        }
    }
}

use std::collections::HashMap;

#[derive(Clone, Copy)]
enum FieldKind {
    Bool,
    UInt,
    Float,
    String,
    Object,
    FloatArray,
    DomainLink(u32),
    Enum,
    #[cfg(feature = "scene-codec")]
    AngularBits,
    #[cfg(feature = "scene-codec")]
    NullableFloats,
}

enum Field {
    Bool(bool),
    UInt(u32),
    Float(f32),
    String(String, Option<&'static str>),
    #[cfg(feature = "scene-codec")]
    EventString(String, String),
    Value(Object),
    FloatArray(Vec<f32>),
    DomainLink(u32, String),
    NullDomainLink(u32),
    Enum(u32, &'static str),
    #[cfg(feature = "scene-codec")]
    AngularBits(u32),
    #[cfg(feature = "scene-codec")]
    NullableFloats([Option<f32>; 24]),
}

impl Field {
    fn kind(&self) -> FieldKind {
        match self {
            Self::Bool(_) => FieldKind::Bool,
            Self::UInt(_) => FieldKind::UInt,
            Self::Float(_) => FieldKind::Float,
            Self::String(..) => FieldKind::String,
            #[cfg(feature = "scene-codec")]
            Self::EventString(..) => FieldKind::String,
            Self::Value(_) => FieldKind::Object,
            Self::FloatArray(_) => FieldKind::FloatArray,
            Self::DomainLink(class, _) | Self::NullDomainLink(class) => {
                FieldKind::DomainLink(*class)
            }
            Self::Enum(..) => FieldKind::Enum,
            #[cfg(feature = "scene-codec")]
            Self::AngularBits(_) => FieldKind::AngularBits,
            #[cfg(feature = "scene-codec")]
            Self::NullableFloats(_) => FieldKind::NullableFloats,
        }
    }
}

enum Object {
    Null,
    Array(Vec<Object>),
    Vector([f32; 3]),
    Color([u8; 4]),
    EmptyMap,
    Empty116,
    Record(Record),
    Link(u32, String),
    FloatList(Vec<f32>),
    IntList(Vec<u32>),
    ShortList(Vec<u16>),
    #[cfg(feature = "scene-codec")]
    AnimationTrack(scene::BoneTimeline),
    #[cfg(feature = "scene-codec")]
    ConstraintAnimationTrack {
        track: scene::ConstraintTimeline,
        target: (u32, String),
    },
    #[cfg(feature = "scene-codec")]
    EventAnimationTrack {
        track: scene::EventTimeline,
        owner: String,
        default_string: String,
        default_label: String,
    },
    #[cfg(feature = "scene-codec")]
    SlotAnimationTrack {
        track: scene::SlotTimeline,
        attachments: Vec<(u32, String)>,
        owner: String,
    },
    #[cfg(feature = "scene-codec")]
    DeformAnimationTrack {
        track: scene::DeformTimeline,
        target: (u32, String),
    },
    #[cfg(feature = "scene-codec")]
    DrawOrderAnimationTrack {
        keys: Vec<scene::DrawOrderKey>,
        rows: Vec<Vec<Object>>,
    },
    #[cfg(feature = "scene-codec")]
    FromProperty {
        class: u32,
        offset: f32,
        to: Vec<ToPropertyWire>,
    },
}
#[cfg(feature = "scene-codec")]
struct ToPropertyWire {
    class: u32,
    offset: f32,
    max: f32,
    scale: f32,
}

struct Record {
    class: u32,
    label: Option<String>,
    fields: Vec<(u32, Field)>,
}

#[derive(Default)]
struct Writer<'a> {
    bytes: Vec<u8>,
    domain_count: u32,
    generic_count: u32,
    domain_labels: HashMap<String, u32>,
    generic_labels: HashMap<String, u32>,
    records: HashMap<&'a str, &'a Record>,
}

impl<'a> Writer<'a> {
    fn register(&mut self, record: &'a Record) {
        if let Some(label) = &record.label {
            self.records.insert(label, record);
        }
        fn visit<'a>(writer: &mut Writer<'a>, object: &'a Object) {
            match object {
                Object::Record(record) => writer.register(record),
                Object::Array(items) => {
                    for item in items {
                        visit(writer, item);
                    }
                }
                #[cfg(feature = "scene-codec")]
                Object::DrawOrderAnimationTrack { rows, .. } => {
                    for row in rows {
                        for item in row {
                            visit(writer, item);
                        }
                    }
                }
                _ => (),
            }
        }
        for (_, field) in &record.fields {
            if let Field::Value(object) = field {
                visit(self, object);
            }
        }
    }
    fn uint(&mut self, mut value: u32) {
        while value >= 128 {
            self.bytes.push(value as u8 | 128);
            value >>= 7;
        }
        self.bytes.push(value as u8);
    }

    fn float(&mut self, value: f32) {
        self.bytes.extend_from_slice(&value.to_be_bytes());
    }

    fn generic(&mut self, label: Option<&str>) -> bool {
        if let Some(index) = label.and_then(|label| self.generic_labels.get(label)) {
            self.uint(index + 2);
            return false;
        }
        if let Some(label) = label {
            self.generic_labels
                .insert(label.to_owned(), self.generic_count);
        }
        self.generic_count += 1;
        self.uint(1);
        true
    }

    fn string(&mut self, value: &str) {
        // The observed ASCII path terminates the last character with bit 7.
        if value.is_ascii() && value.len() >= 2 {
            self.bytes.extend_from_slice(value.as_bytes());
            *self.bytes.last_mut().unwrap() |= 128;
            return;
        }
        // Character count includes a null sentinel; the first byte reserves
        // bits 7 (UTF mode) and 6 (continuation). Java strings count UTF-16 units.
        let mut count = value.encode_utf16().count() as u32 + 1;
        let first = (count as u8 & 63) | 128;
        count >>= 6;
        self.bytes.push(first | if count != 0 { 64 } else { 0 });
        while count != 0 {
            self.bytes
                .push((count as u8 & 127) | if count >= 128 { 128 } else { 0 });
            count >>= 7;
        }
        for unit in value.encode_utf16() {
            match unit {
                0..=0x7f => self.bytes.push(unit as u8),
                0x80..=0x7ff => {
                    self.bytes.push(0xc0 | (unit >> 6) as u8);
                    self.bytes.push(0x80 | (unit & 63) as u8);
                }
                _ => {
                    self.bytes.push(0xe0 | (unit >> 12) as u8);
                    self.bytes.push(0x80 | ((unit >> 6) & 63) as u8);
                    self.bytes.push(0x80 | (unit & 63) as u8);
                }
            }
        }
    }

    fn domain_link(&mut self, label: &str) {
        if let Some(index) = self.domain_labels.get(label) {
            self.uint(index + 2);
        } else {
            // A typed field may inline its target before the owning array:
            // slot -> bone, bone -> parent, group -> slot, slot -> region.
            self.record(self.records[label]);
        }
    }

    fn record(&mut self, record: &Record) {
        if let Some(label) = &record.label {
            if let Some(index) = self.domain_labels.get(label) {
                self.uint(index + 2);
                return;
            }
            self.domain_labels.insert(label.clone(), self.domain_count);
        }
        self.domain_count += 1;
        self.uint(1);
        self.uint(record.fields.len() as u32);
        for (tag, value) in &record.fields {
            self.uint(*tag);
            match value {
                Field::Bool(value) => self.bytes.push(u8::from(*value)),
                Field::UInt(value) => self.uint(*value),
                Field::Float(value) => self.float(*value),
                #[cfg(feature = "scene-codec")]
                Field::AngularBits(bits) => self.bytes.extend_from_slice(&bits.to_be_bytes()),
                #[cfg(feature = "scene-codec")]
                Field::NullableFloats(values) => {
                    self.generic(None);
                    self.uint(25);
                    for value in values {
                        self.bytes.push(u8::from(value.is_some()));
                        if let Some(value) = value {
                            self.float(*value);
                        }
                    }
                }
                Field::String(value, label) => {
                    if self.generic(*label) {
                        self.string(value);
                    }
                }
                #[cfg(feature = "scene-codec")]
                Field::EventString(value, label) => {
                    if self.generic(Some(label)) {
                        self.string(value);
                    }
                }
                Field::Value(value) => self.object(value),
                Field::FloatArray(values) => {
                    self.generic(None);
                    self.uint(values.len() as u32 + 1);
                    for value in values {
                        self.float(*value);
                    }
                }
                Field::DomainLink(_, label) => self.domain_link(label),
                Field::NullDomainLink(_) => self.uint(0),
                Field::Enum(value, label) => {
                    if self.generic(Some(label)) {
                        self.uint(*value);
                    }
                }
            }
        }
    }

    #[cfg(feature = "scene-codec")]
    fn uint_zero_curve_metadata(&mut self) {
        self.bytes.extend_from_slice(&[0; 4]);
    }

    fn object(&mut self, value: &Object) {
        match value {
            Object::Null => self.uint(0),
            Object::Array(items) => {
                self.uint(15);
                self.generic(None);
                self.uint(items.len() as u32);
                for item in items {
                    self.object(item);
                }
            }
            Object::Vector(values) => {
                self.uint(41);
                self.generic(None);
                for value in values {
                    self.float(*value);
                }
            }
            Object::Color(values) => {
                self.uint(30);
                self.generic(None);
                self.bytes.extend_from_slice(values);
            }
            Object::Empty116 => {
                self.uint(116);
                self.generic(None);
                self.uint(0);
            }
            Object::EmptyMap => {
                self.uint(38);
                self.generic(None);
                self.uint(0);
            }
            #[cfg(feature = "scene-codec")]
            Object::AnimationTrack(track) => {
                use scene::{BoneChannel, KeyCurve};
                self.uint(132);
                self.domain_count += 1;
                self.uint(1);
                let kind = match track.channel {
                    BoneChannel::Rotate => 0,
                    BoneChannel::Translate => 1,
                    BoneChannel::Scale => 2,
                    BoneChannel::Shear => 3,
                };
                self.uint(kind);
                self.generic(None);
                self.uint(track.keys.len() as u32);
                let dimensions = if kind == 0 { 1 } else { 2 };
                for (i, key) in track.keys.iter().enumerate() {
                    self.uint(133);
                    self.domain_count += 1;
                    self.uint(1);
                    self.float(key.frame);
                    for value in &key.values[..dimensions] {
                        self.float(*value);
                    }
                    let own = match key.curve {
                        KeyCurve::Bezier { controls } => Some(controls),
                        _ => None,
                    };
                    let previous = if i == 0 {
                        None
                    } else {
                        match track.keys[i - 1].curve {
                            KeyCurve::Bezier { controls } => Some(controls),
                            _ => None,
                        }
                    };
                    self.uint(match key.curve {
                        KeyCurve::Linear => 0,
                        KeyCurve::Bezier { .. } => 1,
                        KeyCurve::Stepped => 2,
                    });
                    if own.is_some() || previous.is_some() {
                        for axis in 0..dimensions {
                            let incoming = previous
                                .map(|c| [c[axis][2], c[axis][3]])
                                .unwrap_or([2147483648.; 2]);
                            let outgoing = own
                                .map(|c| [c[axis][0], c[axis][1]])
                                .unwrap_or([2147483648.; 2]);
                            for value in incoming.into_iter().chain(outgoing) {
                                self.float(value);
                            }
                            self.uint_zero_curve_metadata();
                        }
                    }
                }
            }
            #[cfg(feature = "scene-codec")]
            Object::SlotAnimationTrack {
                track,
                attachments,
                owner,
            } => {
                use scene::{SlotRgbaCurve, SlotTimeline};
                self.uint(132);
                self.domain_count += 1;
                self.uint(1);
                let rgba = matches!(track, SlotTimeline::Rgba { .. });
                self.uint(if rgba { 4 } else { 5 });
                self.generic(None);
                match track {
                    SlotTimeline::Attachment { keys, .. } => {
                        self.uint(keys.len() as u32);
                        for key in keys {
                            self.uint(133);
                            self.domain_count += 1;
                            self.uint(1);
                            self.float(key.frame);
                            self.uint(0);
                            if let Some(index) = key.attachment {
                                let (class, label) = &attachments[index];
                                self.uint(*class);
                                self.domain_link(label);
                            } else {
                                self.uint(0);
                            }
                        }
                    }
                    SlotTimeline::Rgba { keys, .. } => {
                        self.uint(keys.len() as u32);
                        for (i, key) in keys.iter().enumerate() {
                            self.uint(133);
                            self.domain_count += 1;
                            self.uint(1);
                            self.float(key.frame);
                            for v in key.values.into_iter().chain([0.; 3]) {
                                self.float(v);
                            }
                            let own = match key.curve {
                                SlotRgbaCurve::Bezier { controls } => Some(controls),
                                _ => None,
                            };
                            let previous = i.checked_sub(1).and_then(|j| match keys[j].curve {
                                SlotRgbaCurve::Bezier { controls } => Some(controls),
                                _ => None,
                            });
                            self.uint(match key.curve {
                                SlotRgbaCurve::Linear => 0,
                                SlotRgbaCurve::Bezier { .. } => 1,
                                SlotRgbaCurve::Stepped => 2,
                            });
                            if own.is_some() || previous.is_some() {
                                for axis in 0..7 {
                                    let incoming = previous
                                        .filter(|_| axis < 4)
                                        .map(|c| [c[axis][2], c[axis][3]])
                                        .unwrap_or([2147483648.; 2]);
                                    let outgoing = own
                                        .filter(|_| axis < 4)
                                        .map(|c| [c[axis][0], c[axis][1]])
                                        .unwrap_or([2147483648.; 2]);
                                    for v in incoming.into_iter().chain(outgoing) {
                                        self.float(v);
                                    }
                                    self.uint_zero_curve_metadata();
                                }
                            }
                        }
                    }
                }
                self.domain_link(owner);
            }
            #[cfg(feature = "scene-codec")]
            Object::DrawOrderAnimationTrack { keys, rows } => {
                self.uint(132);
                self.domain_count += 1;
                self.uint(1);
                self.uint(13);
                self.generic(None);
                self.uint(keys.len() as u32);
                for (key, row) in keys.iter().zip(rows) {
                    self.uint(133);
                    self.domain_count += 1;
                    self.uint(1);
                    self.float(key.frame);
                    self.uint(0);
                    self.generic(None);
                    self.uint(row.len() as u32);
                    for offset in row {
                        self.object(offset);
                    }
                }
            }
            #[cfg(feature = "scene-codec")]
            Object::DeformAnimationTrack { track, target } => {
                use scene::DeformCurve;
                self.uint(132);
                self.domain_count += 1;
                self.uint(1);
                self.uint(6);
                self.generic(None);
                self.uint(track.keys.len() as u32);
                for (i, key) in track.keys.iter().enumerate() {
                    self.uint(133);
                    self.domain_count += 1;
                    self.uint(1);
                    self.float(key.frame);
                    let own = match key.curve {
                        DeformCurve::Bezier { controls } => Some(controls),
                        _ => None,
                    };
                    let previous = i.checked_sub(1).and_then(|j| match track.keys[j].curve {
                        DeformCurve::Bezier { controls } => Some(controls),
                        _ => None,
                    });
                    self.uint(match key.curve {
                        DeformCurve::Linear => 0,
                        DeformCurve::Bezier { .. } => 1,
                        DeformCurve::Stepped => 2,
                    });
                    if own.is_some() || previous.is_some() {
                        let incoming = previous.map(|c| [c[2], c[3]]).unwrap_or([2147483648.; 2]);
                        let outgoing = own.map(|c| [c[0], c[1]]).unwrap_or([2147483648.; 2]);
                        for v in incoming.into_iter().chain(outgoing) {
                            self.float(v);
                        }
                        self.uint_zero_curve_metadata();
                    }
                    // A statically typed DOMAIN value: no class token and no
                    // generic reference for the following Boolean presence flag.
                    self.domain_count += 1;
                    self.uint(1);
                    self.uint(key.offsets.len() as u32);
                    self.uint(u32::from(key.data_present));
                    if key.data_present {
                        let count = key.offsets.iter().filter(|v| **v != 0.).count();
                        self.uint(count as u32);
                        if count > 0 {
                            for v in &key.offsets {
                                self.float(*v);
                            }
                        }
                    }
                }
                self.uint(target.0);
                self.domain_link(&target.1);
            }
            #[cfg(feature = "scene-codec")]
            Object::ConstraintAnimationTrack { track, target } => {
                self.uint(132);
                self.domain_count += 1;
                self.uint(1);
                self.uint(track.kind());
                self.generic(None);
                let keys = track.wire_keys();
                self.uint(keys.len() as u32);
                for (i, key) in keys.iter().enumerate() {
                    self.uint(133);
                    self.domain_count += 1;
                    self.uint(1);
                    self.float(key.frame);
                    for v in &key.values {
                        self.float(*v)
                    }
                    self.uint(key.code);
                    let previous = i.checked_sub(1).and_then(|j| keys[j].controls.as_ref());
                    if let Some(axes) = key.controls.as_ref().or(previous) {
                        for axis in 0..axes.len() {
                            let incoming = previous
                                .map(|c| [c[axis][2], c[axis][3]])
                                .unwrap_or([2147483648.; 2]);
                            let outgoing = key
                                .controls
                                .as_ref()
                                .map(|c| [c[axis][0], c[axis][1]])
                                .unwrap_or([2147483648.; 2]);
                            for v in incoming.into_iter().chain(outgoing) {
                                self.float(v)
                            }
                            self.uint_zero_curve_metadata();
                        }
                    }
                }
                self.domain_link(&target.1);
            }
            #[cfg(feature = "scene-codec")]
            Object::EventAnimationTrack {
                track,
                owner,
                default_string,
                default_label,
            } => {
                self.uint(132);
                self.domain_count += 1;
                self.uint(1);
                self.uint(12);
                self.generic(None);
                self.uint(track.keys.len() as u32);
                for key in &track.keys {
                    self.uint(133);
                    self.domain_count += 1;
                    self.uint(1);
                    self.float(key.frame);
                    self.uint(0);
                    self.domain_count += 1;
                    self.uint(1);
                    self.uint(6);
                    self.uint(6);
                    self.float(key.balance);
                    self.uint(1);
                    self.domain_link(owner);
                    self.uint(2);
                    self.uint(((key.int as u32) << 1) ^ ((key.int >> 31) as u32));
                    self.uint(4);
                    let label = (key.string == *default_string).then_some(default_label.as_str());
                    if self.generic(label) {
                        self.string(&key.string)
                    }
                    self.uint(3);
                    self.float(key.float);
                    self.uint(5);
                    self.float(key.volume);
                }
                self.domain_link(owner);
            }
            Object::Record(record) => {
                self.uint(record.class);
                self.record(record);
            }
            Object::Link(class, label) => {
                self.uint(*class);
                self.domain_link(label);
            }
            Object::FloatList(values) => {
                self.uint(17);
                self.generic(None);
                self.uint(values.len() as u32);
                for value in values {
                    self.float(*value);
                }
            }
            Object::IntList(values) => {
                self.uint(16);
                self.generic(None);
                self.uint(values.len() as u32);
                for value in values {
                    self.uint(*value << 1);
                }
            }
            Object::ShortList(values) => {
                self.uint(47);
                self.generic(None);
                self.uint(values.len() as u32);
                for value in values {
                    self.bytes.extend_from_slice(&value.to_be_bytes());
                }
            }
            #[cfg(feature = "scene-codec")]
            Object::FromProperty { class, offset, to } => {
                self.uint(*class);
                self.generic(None);
                self.float(*offset);
                self.uint(to.len() as u32);
                for value in to {
                    self.uint(value.class);
                    self.float(value.offset);
                    self.float(value.max);
                    self.float(value.scale);
                }
            }
        }
    }
}

fn text(value: &str) -> Field {
    Field::String(value.into(), None)
}
fn object(value: Object) -> Field {
    Field::Value(value)
}
fn empty() -> Field {
    object(Object::Array(vec![]))
}
fn vector() -> Field {
    object(Object::Vector([0.0; 3]))
}
fn toggle() -> Field {
    object(Object::Record(Record {
        class: 80,
        label: None,
        fields: vec![(0, Field::Bool(false))],
    }))
}
fn group(label: Option<&str>, items: Vec<Object>) -> Object {
    use Field::*;
    Object::Record(Record {
        class: 108,
        label: label.map(str::to_owned),
        fields: vec![
            (3, Bool(false)),
            (2, UInt(3)),
            (0, Bool(false)),
            (5, object(Object::Array(items))),
            (1, object(Object::Null)),
            (6, object(Object::Color([249, 249, 133, 255]))),
        ],
    })
}

fn bone(input: &Bone, index: usize) -> Object {
    use Field::*;
    Object::Record(Record {
        class: 12,
        label: Some(format!("bone-{index}")),
        fields: vec![
            (30, Bool(true)),
            (13, Float(input.scale_x)),
            (34, Float(0.0)),
            (11, Float(input.y)),
            (12, Float(input.rotation)),
            (1, text(&input.name)),
            (27, Enum(1, "bone-mode")),
            (2, Bool(true)),
            (28, String("bone".into(), Some("bone-label"))),
            (29, Bool(false)),
            (14, Float(input.scale_y)),
            (0, DomainLink(11, "skeleton".into())),
            (33, Float(1.0)),
            (10, Float(input.x)),
            (31, empty()),
            (23, Float(input.shear_x)),
            (25, Float(input.shear_y)),
            (9, Float(input.length)),
            (
                3,
                input
                    .parent
                    .map_or(NullDomainLink(12), |i| DomainLink(12, format!("bone-{i}"))),
            ),
            (17, object(Object::Color(input.color))),
            // Meaning not established; only zero is supported in this profile.
            (126, UInt(0)),
        ],
    })
}

fn validate(project: &MinimalProject) -> Result<(), FormatError> {
    if project.bones.is_empty()
        || project.bones.len() > 128
        || project.name.is_empty()
        || project.name.len() > 1024
    {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut names = std::collections::HashSet::new();
    for (index, bone) in project.bones.iter().enumerate() {
        if bone.name.is_empty()
            || bone.name.len() > 1024
            || !names.insert(&bone.name)
            || if index == 0 {
                bone.parent.is_some()
            } else {
                bone.parent.is_none_or(|p| p >= index)
            }
            || [
                bone.x,
                bone.y,
                bone.rotation,
                bone.length,
                bone.scale_x,
                bone.scale_y,
                bone.shear_x,
                bone.shear_y,
            ]
            .iter()
            .any(|v| !v.is_finite())
        {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    Ok(())
}

fn project_record(project: &MinimalProject) -> Record {
    project_record_with_regions(project, &[], &[], "./images/")
}

fn project_record_with_regions(
    project: &MinimalProject,
    slots: &[regions::Slot],
    order: &[usize],
    images_root: &str,
) -> Record {
    use Field::*;
    let bones = project
        .bones
        .iter()
        .enumerate()
        .map(|(i, value)| bone(value, i))
        .collect();
    let animation = Object::Record(Record {
        class: 18,
        label: Some("animation".into()),
        fields: vec![
            (1, text("animation")),
            (5, Bool(true)),
            (9, UInt(0)),
            (3, Bool(false)),
            (10, object(Object::Color([255; 4]))),
            (8, object(Object::Empty116)),
            (6, Bool(true)),
            (2, empty()),
            (0, DomainLink(11, "skeleton".into())),
            (
                7,
                object(group(
                    Some("animation-group"),
                    vec![Object::Link(18, "animation".into())],
                )),
            ),
        ],
    });
    let skeleton = Object::Record(Record {
        class: 11,
        label: Some("skeleton".into()),
        fields: vec![
            (50, Bool(true)),
            (7, object(Object::Array(vec![animation]))),
            (13, object(Object::Array(regions::slot_records(slots)))),
            (47, Bool(true)),
            (40, object(group(None, vec![]))),
            (48, Bool(true)),
            (43, object(Object::Null)),
            (24, FloatArray(vec![0.0; 4])),
            (52, Bool(true)),
            (16, empty()),
            (2, Bool(true)),
            (29, toggle()),
            (41, empty()),
            (36, empty()),
            (14, empty()),
            (38, object(group(None, vec![]))),
            (35, Bool(true)),
            (42, Bool(true)),
            (23, empty()),
            (33, UInt(0)),
            (37, object(Object::Link(108, "animation-group".into()))),
            (8, empty()),
            (3, text(images_root)),
            (
                45,
                object(if slots.is_empty() {
                    group(None, vec![])
                } else {
                    Object::Link(108, "slot-group".into())
                }),
            ),
            (0, DomainLink(0, "project".into())),
            (22, empty()),
            (51, empty()),
            (32, toggle()),
            (10, empty()),
            (53, Bool(false)),
            (31, toggle()),
            (46, Float(100.0)),
            (44, object(group(None, vec![]))),
            (34, text("./audio")),
            (26, toggle()),
            (27, toggle()),
            (30, toggle()),
            (4, object(Object::Array(bones))),
            (1, text(&project.name)),
            (
                6,
                object(Object::Array(regions::region_records(slots, order))),
            ),
            (49, empty()),
            (28, toggle()),
            (126, UInt(0)),
        ],
    });
    Record {
        class: 0, // The root has a known type and carries no class identifier.
        label: Some("project".into()),
        fields: vec![
            (20, text(TARGET_VERSION)),
            (30, object(Object::EmptyMap)),
            (17, Float(1.0)),
            (41, UInt(12)),
            (45, Bool(false)),
            (16, vector()),
            (13, Bool(false)),
            (8, Float(1.0)),
            (4, object(Object::Null)),
            (2, Float(30.0)),
            (0, object(Object::Array(vec![skeleton]))),
            (36, object(Object::EmptyMap)),
            (32, Float(1.0)),
            (42, Bool(false)),
            (31, vector()),
            (19, Bool(false)),
            (14, vector()),
            (40, Bool(true)),
            (35, Bool(true)),
            (43, Bool(true)),
            (44, Bool(false)),
            (29, object(Object::EmptyMap)),
            (15, Float(1.0)),
            (34, Float(1.0)),
            (28, Bool(true)),
            (33, vector()),
            (7, vector()),
        ],
    }
}

/// Every field is independently constructed from a typed model and known defaults.
pub fn encode_minimal_payload(project: &MinimalProject) -> Result<Vec<u8>, FormatError> {
    validate(project)?;
    Ok(encode_record_payload(
        &project_record(project),
        project.identity,
    ))
}

fn encode_record_payload(record: &Record, identity: [u8; 16]) -> Vec<u8> {
    encode_record_payload_counted(record, identity).0
}

fn encode_record_payload_counted(record: &Record, identity: [u8; 16]) -> (Vec<u8>, u32, u32) {
    let mut writer = Writer::default();
    writer.register(record);
    writer
        .bytes
        .extend_from_slice(&[0x48, 0xb0, 0x20, 0xb0, 0x20]);
    writer.string(TARGET_VERSION);
    writer.uint(1);
    writer.bytes.extend_from_slice(&identity);
    writer.record(record);
    // Observed suffix accepted in every controlled case. Its wider meaning is
    // unknown, so recognition requires an exact match of the complete profile.
    writer.uint(1);
    writer.uint(11);
    writer.bytes.extend_from_slice(&[0; 10]);
    (writer.bytes, writer.domain_count, writer.generic_count)
}

pub fn encode_minimal(project: &MinimalProject) -> Result<Vec<u8>, FormatError> {
    encode_envelope(&encode_minimal_payload(project)?)
}
