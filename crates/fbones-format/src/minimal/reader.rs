//! Bounded recognizer for the accepted canonical minimal profile. It extracts a
//! model, then checks every decoded byte against independent reserialization.
//! Unknown fields, editor settings, or layouts are never silently discarded.
#[cfg(feature = "scene-codec")]
use super::ToPropertyWire;
use super::{
    meshes::{Mesh, Vertex},
    project_record_with_regions,
    regions::{encode_region_payload, Attachment, BlendMode, Region, RegionProject, Slot},
    Bone, Field, FieldKind, MinimalProject, Object, Record, MAX_DOMAIN_OBJECTS,
    MAX_GENERIC_OBJECTS,
};
use crate::FormatError;
use std::collections::{BTreeMap, HashMap};

#[cfg(feature = "scene-codec")]
#[path = "reader/constraint_events.rs"]
mod constraint_events;
#[cfg(feature = "scene-codec")]
#[path = "reader/editor_metadata.rs"]
mod editor_metadata;
#[cfg(feature = "scene-codec")]
#[path = "reader/source_state.rs"]
mod source_state;

type Result<T> = std::result::Result<T, FormatError>;
fn unsupported<T>() -> Result<T> {
    Err(FormatError::UnsupportedProfile)
}

#[derive(Clone, Copy, PartialEq)]
enum Reference {
    Null,
    Domain(usize),
    Generic(usize),
}
enum Value {
    Flag(bool),
    UInt(u32),
    Float(f32),
    Reference(Reference),
    #[cfg(feature = "scene-codec")]
    AngularBits(u32),
    #[cfg(feature = "scene-codec")]
    UInt64(u64),
}
enum GenericValue {
    Enum(u32),
    String(String),
    Array(Vec<Reference>),
    FloatList(Vec<f32>),
    IntList(Vec<u32>),
    Color([u8; 4]),
    #[cfg(not(feature = "scene-codec"))]
    #[cfg(not(feature = "scene-codec"))]
    Other,
    #[cfg(feature = "scene-codec")]
    Map(Vec<(Reference, Reference)>),
    #[cfg(feature = "scene-codec")]
    StringArray(Vec<String>),
    #[cfg(feature = "scene-codec")]
    Vector([f32; 3]),
    #[cfg(feature = "scene-codec")]
    NullableFloats([Option<f32>; 24]),
    #[cfg(feature = "scene-codec")]
    AnimationKeys(Vec<super::scene::BoneKeyframe>),
    #[cfg(feature = "scene-codec")]
    SplitModes(Vec<(Reference, u32)>),
    #[cfg(feature = "scene-codec")]
    SlotRgbaKeys(Vec<super::scene::SlotRgbaKey>),
    #[cfg(feature = "scene-codec")]
    SequenceKeys(Vec<super::scene::SequenceKeyframe>),
    #[cfg(feature = "scene-codec")]
    SlotAttachmentKeys(Vec<(f32, Reference)>),
    #[cfg(feature = "scene-codec")]
    DrawOrderKeys(Vec<(f32, Vec<(Reference, i32)>)>),
    #[cfg(feature = "scene-codec")]
    DeformKeys(Vec<super::scene::DeformKey>),
    #[cfg(feature = "scene-codec")]
    ConstraintKeys(super::scene::ConstraintTimeline),
    #[cfg(feature = "scene-codec")]
    EventKeys(Vec<(f32, Reference)>),
    #[cfg(feature = "scene-codec")]
    FromProperty {
        class: u32,
        offset: f32,
        to: Vec<ToPropertyWire>,
    },
}
struct Generic {
    kind: u32,
    value: Option<GenericValue>,
}
struct Domain {
    class: u32,
    fields: Option<BTreeMap<u32, Value>>,
}
type Schema = HashMap<u32, HashMap<u32, FieldKind>>;

fn collect_object_schema(object: &Object, schema: &mut Schema) {
    match object {
        Object::Record(record) => collect_schema(record, schema),
        Object::Array(items) => {
            for item in items {
                collect_object_schema(item, schema);
            }
        }
        #[cfg(feature = "scene-codec")]
        Object::Map(items) => {
            for (key, value) in items {
                collect_object_schema(key, schema);
                collect_object_schema(value, schema);
            }
        }
        #[cfg(feature = "scene-codec")]
        Object::DrawOrderAnimationTrack { rows, .. } => {
            for row in rows {
                for item in row {
                    collect_object_schema(item, schema);
                }
            }
        }
        _ => (),
    }
}
fn collect_schema(record: &Record, schema: &mut Schema) {
    schema.entry(record.class).or_insert_with(|| {
        record
            .fields
            .iter()
            .map(|(tag, field)| (*tag, field.kind()))
            .collect()
    });
    for (_, field) in &record.fields {
        if let Field::Value(object) = field {
            collect_object_schema(object, schema);
        }
    }
}

struct Reader<'a> {
    bytes: &'a [u8],
    pos: usize,
    depth: usize,
    generic: Vec<Generic>,
    domain: Vec<Domain>,
    schema: Schema,
    #[cfg(feature = "scene-codec")]
    deform_coordinates: usize,
    #[cfg(feature = "scene-codec")]
    string_fields: Vec<(Reference, u32, Reference)>,
    #[cfg(feature = "scene-codec")]
    mesh_uv_limit: usize,
    #[cfg(feature = "scene-codec")]
    draw_order_limit: usize,
    #[cfg(feature = "scene-codec")]
    string_encodings: HashMap<usize, super::scene::WireStringForm>,
}
impl<'a> Reader<'a> {
    fn take(&mut self, count: usize) -> Result<&'a [u8]> {
        let end = self
            .pos
            .checked_add(count)
            .ok_or(FormatError::UnsupportedProfile)?;
        let bytes = self
            .bytes
            .get(self.pos..end)
            .ok_or(FormatError::UnsupportedProfile)?;
        self.pos = end;
        Ok(bytes)
    }
    fn byte(&mut self) -> Result<u8> {
        Ok(self.take(1)?[0])
    }
    fn uint(&mut self) -> Result<u32> {
        let mut value = 0;
        for shift in (0..35).step_by(7) {
            let byte = self.byte()?;
            if shift == 28 && byte > 15 {
                return unsupported();
            }
            value |= u32::from(byte & 127) << shift;
            if byte < 128 {
                return Ok(value);
            }
        }
        unsupported()
    }
    #[cfg(feature = "scene-codec")]
    fn boolean(&mut self) -> Result<bool> {
        let value = self.byte()?;
        if value > 1 {
            return unsupported();
        }
        Ok(value == 1)
    }
    fn float(&mut self) -> Result<f32> {
        let value = f32::from_be_bytes(self.take(4)?.try_into().unwrap());
        if !value.is_finite() {
            return unsupported();
        }
        Ok(value)
    }
    #[cfg(feature = "scene-codec")]
    fn uint42(&mut self) -> Result<u64> {
        let mut value = 0u64;
        for shift in [0, 7, 14, 21, 28, 35] {
            let byte = self.byte()?;
            value |= u64::from(byte & 127) << shift;
            if byte < 128 {
                return Ok(value);
            }
        }
        unsupported()
    }
    fn string(&mut self) -> Result<String> {
        let first = self.byte()?;
        if first < 128 {
            let mut bytes = vec![first];
            loop {
                let byte = self.byte()?;
                bytes.push(byte & 127);
                if bytes.len() > 1024 {
                    return unsupported();
                }
                if byte >= 128 {
                    break;
                }
            }
            return String::from_utf8(bytes).map_err(|_| FormatError::UnsupportedProfile);
        }
        let mut count = u32::from(first & 63);
        if first & 64 != 0 {
            let mut done = false;
            for shift in [6, 13, 20, 27] {
                let byte = self.byte()?;
                if shift == 27 && byte > 31 {
                    return unsupported();
                }
                count |= u32::from(byte & 127) << shift;
                if byte < 128 {
                    done = true;
                    break;
                }
            }
            if !done {
                return unsupported();
            }
        }
        if count == 0 || count > 1025 {
            return unsupported();
        }
        let mut units = Vec::with_capacity(count as usize - 1);
        for _ in 1..count {
            let first = self.byte()?;
            let unit = match first {
                0..=127 => u16::from(first),
                0xc2..=0xdf => {
                    let next = self.continuation()?;
                    (u16::from(first & 31) << 6) | u16::from(next)
                }
                0xe0..=0xef => {
                    let next = self.continuation()?;
                    let last = self.continuation()?;
                    let unit =
                        (u16::from(first & 15) << 12) | (u16::from(next) << 6) | u16::from(last);
                    if unit < 0x800 {
                        return unsupported();
                    }
                    unit
                }
                _ => return unsupported(),
            };
            units.push(unit);
        }
        String::from_utf16(&units).map_err(|_| FormatError::UnsupportedProfile)
    }
    fn continuation(&mut self) -> Result<u8> {
        let byte = self.byte()?;
        if byte & 0xc0 != 0x80 {
            return unsupported();
        }
        Ok(byte & 63)
    }
    fn generic<F>(&mut self, kind: u32, read: F) -> Result<Reference>
    where
        F: FnOnce(&mut Self) -> Result<GenericValue>,
    {
        match self.uint()? {
            0 => Ok(Reference::Null),
            1 => {
                if self.generic.len() >= MAX_GENERIC_OBJECTS {
                    return unsupported();
                }
                let index = self.generic.len();
                self.generic.push(Generic { kind, value: None });
                #[cfg(feature = "scene-codec")]
                let body_start = self.pos;
                let value = read(self)?;
                #[cfg(feature = "scene-codec")]
                if kind == 3
                    && self.bytes[body_start] >= 128
                    && matches!(&value, GenericValue::String(s) if s.is_ascii() && s.len() >= 2)
                {
                    self.string_encodings
                        .insert(index, super::scene::WireStringForm::Utf8Length);
                }
                self.generic[index].value = Some(value);
                Ok(Reference::Generic(index))
            }
            n => {
                let index = n as usize - 2;
                if self.generic.get(index).is_none_or(|g| g.kind != kind) {
                    return unsupported();
                }
                Ok(Reference::Generic(index))
            }
        }
    }
    fn domain(&mut self, class: u32) -> Result<Reference> {
        match self.uint()? {
            0 => Ok(Reference::Null),
            1 => {
                if self.domain.len() >= MAX_DOMAIN_OBJECTS || self.depth >= 256 {
                    return unsupported();
                }
                self.depth += 1;
                let index = self.domain.len();
                self.domain.push(Domain {
                    class,
                    fields: None,
                });
                #[cfg(feature = "scene-codec")]
                if class == 132 {
                    use super::scene::{BoneKeyframe, KeyCurve};
                    let kind = self.uint()?;
                    if !matches!(kind, 0..=8 | 12..=17 | 22..=30) {
                        return unsupported();
                    }
                    if kind == 22 {
                        use super::scene::{FiniteF32, SequenceKeyframe, SequenceMode};
                        let at = self.pos;
                        if self.uint()? != 1 {
                            return unsupported();
                        }
                        self.pos = at;
                        let keys = self.generic(204, |r| {
                            let count = r.uint()?;
                            if count == 0 || count > super::scene::MAX_TRACK_KEYS as u32 {
                                return unsupported();
                            }
                            let mut keys = Vec::with_capacity(count as usize);
                            for _ in 0..count {
                                if r.uint()? != 133
                                    || r.uint()? != 1
                                    || r.domain.len() >= MAX_DOMAIN_OBJECTS
                                {
                                    return unsupported();
                                }
                                r.domain.push(Domain {
                                    class: 133,
                                    fields: Some(BTreeMap::new()),
                                });
                                let frame = r.float()?;
                                let raw_mode = r.float()?;
                                let raw_index = r.float()?;
                                let delay = FiniteF32::new(r.float()?)?;
                                let mode = SequenceMode::from_wire(raw_mode as u32)
                                    .ok_or(FormatError::UnsupportedProfile)?;
                                let index = raw_index as u32;
                                if (mode.wire() as f32).to_bits() != raw_mode.to_bits()
                                    || (index as f32).to_bits() != raw_index.to_bits()
                                    || r.uint()? != 0
                                {
                                    return unsupported();
                                }
                                keys.push(SequenceKeyframe {
                                    frame,
                                    mode,
                                    index,
                                    delay,
                                });
                            }
                            Ok(GenericValue::SequenceKeys(keys))
                        })?;
                        let slot = self.domain(13)?;
                        let attachment = self.object()?;
                        self.domain[index].fields = Some(BTreeMap::from([
                            (0, Value::UInt(22)),
                            (1, Value::Reference(keys)),
                            (2, Value::Reference(slot)),
                            (3, Value::Reference(attachment)),
                        ]));
                        self.depth -= 1;
                        return Ok(Reference::Domain(index));
                    }
                    if matches!(kind, 7 | 8 | 12 | 23..=30) {
                        self.domain[index].fields = Some(self.constraint_event_track(kind)?);
                        self.depth -= 1;
                        return Ok(Reference::Domain(index));
                    }
                    if kind == 6 || kind == 13 {
                        use super::scene::{DeformCurve, DeformKey, MAX_DEFORM_COORDINATES};
                        let keys = self.generic(204, |r| {
                            let count = r.uint()?;
                            if count == 0 || count > super::scene::MAX_TRACK_KEYS as u32 {
                                return unsupported();
                            }
                            let mut draws = Vec::new();
                            let mut raw = Vec::new();
                            let mut previous = 0;
                            for _ in 0..count {
                                if r.uint()? != 133
                                    || r.uint()? != 1
                                    || r.domain.len() >= MAX_DOMAIN_OBJECTS
                                {
                                    return unsupported();
                                }
                                r.domain.push(Domain {
                                    class: 133,
                                    fields: Some(BTreeMap::new()),
                                });
                                let frame = r.float()?;
                                let code = r.uint()?;
                                if code > 2 || (kind == 13 && code != 0) {
                                    return unsupported();
                                }
                                if kind == 13 {
                                    let list = r.generic(205, |r| {
                                        let count = r.uint()?;
                                        if count as usize > r.draw_order_limit {
                                            return unsupported();
                                        }
                                        let mut offsets = Vec::new();
                                        for _ in 0..count {
                                            if r.uint()? != 39 {
                                                return unsupported();
                                            }
                                            offsets.push(r.domain(39)?);
                                        }
                                        Ok(GenericValue::Array(offsets))
                                    })?;
                                    let mut offsets = Vec::new();
                                    for value in r.array(list)? {
                                        let fields = r.fields(*value, 39)?;
                                        let Some(Value::UInt(bits)) = fields.get(&1) else {
                                            return unsupported();
                                        };
                                        offsets.push((
                                            Reader::field_reference(fields, 0)?,
                                            ((*bits >> 1) as i32) ^ -((*bits & 1) as i32),
                                        ));
                                    }
                                    draws.push((frame, offsets));
                                    continue;
                                }
                                let mut handle = [2147483648.; 4];
                                if code == 1 || previous == 1 {
                                    for v in &mut handle {
                                        *v = r.float()?;
                                    }
                                    if r.take(4)? != [0; 4] {
                                        return unsupported();
                                    }
                                }
                                // Typed vector is a separate DOMAIN identity. Aliased
                                // vectors are outside our independently emitted profile.
                                if r.uint()? != 1 || r.domain.len() >= MAX_DOMAIN_OBJECTS {
                                    return unsupported();
                                }
                                r.domain.push(Domain {
                                    class: u32::MAX,
                                    fields: Some(BTreeMap::new()),
                                });
                                let dimension = r.uint()? as usize;
                                r.deform_coordinates = r
                                    .deform_coordinates
                                    .checked_add(dimension)
                                    .ok_or(FormatError::UnsupportedProfile)?;
                                if dimension == 0
                                    || dimension > 1_048_576
                                    || r.deform_coordinates > MAX_DEFORM_COORDINATES
                                {
                                    return unsupported();
                                }
                                let present = r.boolean()?;
                                let nonzero = if present { r.uint()? as usize } else { 0 };
                                if nonzero > dimension {
                                    return unsupported();
                                }
                                let mut offsets = vec![0.; dimension];
                                if nonzero > 0 {
                                    for v in &mut offsets {
                                        *v = r.float()?;
                                    }
                                    if offsets.iter().filter(|v| **v != 0.).count() != nonzero {
                                        return unsupported();
                                    }
                                }
                                raw.push((frame, offsets, present, code, handle));
                                previous = code;
                            }
                            if kind == 13 {
                                return Ok(GenericValue::DrawOrderKeys(draws));
                            }
                            let mut keys = Vec::new();
                            for (i, (frame, offsets, present, code, h)) in raw.iter().enumerate() {
                                let curve = match code {
                                    0 => DeformCurve::Linear,
                                    2 => DeformCurve::Stepped,
                                    1 => {
                                        let Some(next) = raw.get(i + 1) else {
                                            return unsupported();
                                        };
                                        DeformCurve::Bezier {
                                            controls: [h[2], h[3], next.4[0], next.4[1]],
                                        }
                                    }
                                    _ => return unsupported(),
                                };
                                keys.push(DeformKey {
                                    frame: *frame,
                                    offsets: offsets.clone(),
                                    data_present: *present,
                                    curve,
                                });
                            }
                            Ok(GenericValue::DeformKeys(keys))
                        })?;
                        let mut fields =
                            BTreeMap::from([(0, Value::UInt(kind)), (1, Value::Reference(keys))]);
                        if kind == 6 {
                            let target = self.object()?;
                            fields.insert(2, Value::Reference(target));
                        }
                        self.domain[index].fields = Some(fields);
                        self.depth -= 1;
                        return Ok(Reference::Domain(index));
                    }
                    if matches!(kind, 4 | 5) {
                        use super::scene::{SlotRgbaCurve, SlotRgbaKey};
                        let keys = self.generic(204, |r| {
                            let count = r.uint()?;
                            if count == 0 || count > super::scene::MAX_TRACK_KEYS as u32 {
                                return unsupported();
                            }
                            let mut raw = Vec::new();
                            let mut attachments = Vec::new();
                            let mut previous = 0;
                            for _ in 0..count {
                                if r.uint()? != 133
                                    || r.uint()? != 1
                                    || r.domain.len() >= MAX_DOMAIN_OBJECTS
                                {
                                    return unsupported();
                                }
                                r.domain.push(Domain {
                                    class: 133,
                                    fields: Some(BTreeMap::new()),
                                });
                                let frame = r.float()?;
                                if kind == 5 {
                                    if r.uint()? != 0 {
                                        return unsupported();
                                    }
                                    attachments.push((frame, r.object()?));
                                    continue;
                                }
                                let mut values = [0.; 4];
                                for v in &mut values {
                                    *v = r.float()?;
                                }
                                let mut dark_values = [0.; 3];
                                for v in &mut dark_values {
                                    *v = r.float()?;
                                }
                                let code = r.uint()?;
                                if code > 2 {
                                    return unsupported();
                                }
                                let mut handles = [[2147483648.; 4]; 7];
                                if code == 1 || previous == 1 {
                                    for handle in &mut handles {
                                        for value in handle {
                                            *value = r.float()?;
                                        }
                                        if r.take(4)? != [0; 4] {
                                            return unsupported();
                                        }
                                    }
                                }
                                raw.push((frame, values, dark_values, code, handles));
                                previous = code;
                            }
                            if kind == 5 {
                                return Ok(GenericValue::SlotAttachmentKeys(attachments));
                            }
                            let mut keys = Vec::new();
                            for (i, (frame, values, dark_values, code, h)) in raw.iter().enumerate()
                            {
                                let curve = match code {
                                    0 => SlotRgbaCurve::Linear,
                                    2 => SlotRgbaCurve::Stepped,
                                    1 => {
                                        let Some(next) = raw.get(i + 1) else {
                                            return unsupported();
                                        };
                                        let controls = std::array::from_fn(|axis| {
                                            [
                                                h[axis][2],
                                                h[axis][3],
                                                next.4[axis][0],
                                                next.4[axis][1],
                                            ]
                                        });
                                        let sentinel = 2147483648_f32.to_bits();
                                        let nondefault_dark = h[4..]
                                            .iter()
                                            .chain(&next.4[4..])
                                            .flatten()
                                            .any(|v| v.to_bits() != sentinel);
                                        let dark_controls = nondefault_dark.then(|| {
                                            std::array::from_fn(|axis| {
                                                [
                                                    h[axis + 4][2],
                                                    h[axis + 4][3],
                                                    next.4[axis + 4][0],
                                                    next.4[axis + 4][1],
                                                ]
                                            })
                                        });
                                        SlotRgbaCurve::Bezier {
                                            controls,
                                            dark_controls,
                                        }
                                    }
                                    _ => return unsupported(),
                                };
                                keys.push(SlotRgbaKey {
                                    frame: *frame,
                                    values: *values,
                                    dark_values: *dark_values,
                                    curve,
                                });
                            }
                            Ok(GenericValue::SlotRgbaKeys(keys))
                        })?;
                        let owner = self.domain(13)?;
                        self.domain[index].fields = Some(BTreeMap::from([
                            (0, Value::UInt(kind)),
                            (1, Value::Reference(keys)),
                            (2, Value::Reference(owner)),
                        ]));
                        self.depth -= 1;
                        return Ok(Reference::Domain(index));
                    }
                    let dimensions = super::scene::BoneChannel::from_wire(kind)?.dimensions();
                    let keys = self.generic(204, |r| {
                        let count = r.uint()?;
                        if count == 0 || count > super::scene::MAX_TRACK_KEYS as u32 {
                            return unsupported();
                        }
                        let mut raw = Vec::with_capacity(count as usize);
                        let mut previous = 0;
                        for _ in 0..count {
                            if r.uint()? != 133
                                || r.uint()? != 1
                                || r.domain.len() >= MAX_DOMAIN_OBJECTS
                            {
                                return unsupported();
                            }
                            r.domain.push(Domain {
                                class: 133,
                                fields: Some(BTreeMap::new()),
                            });
                            let frame = r.float()?;
                            let mut values = [0.; 2];
                            for v in &mut values[..dimensions] {
                                *v = r.float()?;
                            }
                            let code = r.uint()?;
                            if code > 2 {
                                return unsupported();
                            }
                            let mut handles = [[2147483648.; 4]; 2];
                            if code == 1 || previous == 1 {
                                for h in &mut handles[..dimensions] {
                                    for v in h {
                                        *v = r.float()?;
                                    }
                                    if r.take(4)? != [0; 4] {
                                        return unsupported();
                                    }
                                }
                            }
                            raw.push((frame, values, code, handles));
                            previous = code;
                        }
                        let mut keys = Vec::with_capacity(raw.len());
                        for (i, (frame, values, code, h)) in raw.iter().enumerate() {
                            let curve = match code {
                                0 => KeyCurve::Linear,
                                2 => KeyCurve::Stepped,
                                1 => {
                                    let Some(next) = raw.get(i + 1) else {
                                        return unsupported();
                                    };
                                    let mut controls = [[0.; 4]; 2];
                                    for axis in 0..dimensions {
                                        controls[axis] = [
                                            h[axis][2],
                                            h[axis][3],
                                            next.3[axis][0],
                                            next.3[axis][1],
                                        ];
                                    }
                                    KeyCurve::Bezier { controls }
                                }
                                _ => return unsupported(),
                            };
                            keys.push(BoneKeyframe {
                                frame: *frame,
                                values: *values,
                                curve,
                            });
                        }
                        Ok(GenericValue::AnimationKeys(keys))
                    })?;
                    self.domain[index].fields = Some(BTreeMap::from([
                        (0, Value::UInt(kind)),
                        (1, Value::Reference(keys)),
                    ]));
                    self.depth -= 1;
                    return Ok(Reference::Domain(index));
                }
                let count = self.uint()?;
                if self.schema.get(&class).map(|s| s.len()) != Some(count as usize) {
                    return unsupported();
                }
                let mut fields = BTreeMap::new();
                for _ in 0..count {
                    let tag = self.uint()?;
                    let kind = self
                        .schema
                        .get(&class)
                        .and_then(|s| s.get(&tag))
                        .copied()
                        .ok_or(FormatError::UnsupportedProfile)?;
                    let value = match kind {
                        FieldKind::Bool => {
                            let byte = self.byte()?;
                            if byte > 1 {
                                return unsupported();
                            }
                            Value::Flag(byte == 1)
                        }
                        FieldKind::UInt => Value::UInt(self.uint()?),
                        FieldKind::Float => Value::Float(self.float()?),
                        #[cfg(feature = "scene-codec")]
                        FieldKind::UInt64 => Value::UInt64(self.uint42()?),
                        #[cfg(feature = "scene-codec")]
                        FieldKind::StringArray => Value::Reference(self.generic(206, |r| {
                            let count = r.uint()?;
                            if count == 0 || count > 65 {
                                return unsupported();
                            }
                            let mut values = Vec::new();
                            for _ in 1..count {
                                values.push(r.string()?);
                            }
                            Ok(GenericValue::StringArray(values))
                        })?),
                        #[cfg(feature = "scene-codec")]
                        FieldKind::EnumArray => Value::Reference(self.generic(207, |r| {
                            let count = r.uint()?;
                            if count == 0 || count > 65 {
                                return unsupported();
                            }
                            let mut values = Vec::new();
                            for _ in 1..count {
                                values.push(r.generic(201, |r| Ok(GenericValue::Enum(r.uint()?)))?);
                            }
                            Ok(GenericValue::Array(values))
                        })?),
                        #[cfg(feature = "scene-codec")]
                        FieldKind::AngularBits => {
                            let bits = u32::from_be_bytes(self.take(4)?.try_into().unwrap());
                            // The only permitted nonfinite primitive is the
                            // observed Physics121/tag7 canonical zero sentinel.
                            if !(f32::from_bits(bits).is_finite()
                                || (class == 121 && tag == 7 && bits == 0x7fc0_0000))
                            {
                                return unsupported();
                            }
                            Value::AngularBits(bits)
                        }
                        #[cfg(feature = "scene-codec")]
                        FieldKind::NullableFloats => Value::Reference(self.generic(203, |r| {
                            let count = r.uint()?;
                            if count != 25 {
                                return unsupported();
                            }
                            let mut values = [None; 24];
                            for cell in &mut values {
                                *cell = match r.byte()? {
                                    0 => None,
                                    1 => Some(r.float()?),
                                    _ => return unsupported(),
                                };
                            }
                            Ok(GenericValue::NullableFloats(values))
                        })?),
                        FieldKind::String => {
                            let reference =
                                self.generic(3, |r| Ok(GenericValue::String(r.string()?)))?;
                            #[cfg(feature = "scene-codec")]
                            self.string_fields
                                .push((Reference::Domain(index), tag, reference));
                            Value::Reference(reference)
                        }
                        FieldKind::Object => {
                            #[cfg(feature = "scene-codec")]
                            let reference = if class == 46 && tag == 12 {
                                self.object_with_float_limit(self.mesh_uv_limit)?
                            } else {
                                self.object()?
                            };
                            #[cfg(not(feature = "scene-codec"))]
                            let reference = self.object()?;
                            Value::Reference(reference)
                        }
                        FieldKind::DomainLink(class) => Value::Reference(self.domain(class)?),
                        FieldKind::Enum => Value::Reference(
                            self.generic(201, |r| Ok(GenericValue::Enum(r.uint()?)))?,
                        ),
                        FieldKind::FloatArray => Value::Reference(self.generic(202, |r| {
                            let count = r.uint()?;
                            if count == 0 || count > 129 {
                                return unsupported();
                            }
                            let mut values = Vec::with_capacity(count as usize - 1);
                            for _ in 1..count {
                                values.push(r.float()?);
                            }
                            Ok(GenericValue::FloatList(values))
                        })?),
                    };
                    if fields.insert(tag, value).is_some() {
                        return unsupported();
                    }
                }
                self.domain[index].fields = Some(fields);
                self.depth -= 1;
                Ok(Reference::Domain(index))
            }
            n => {
                let index = n as usize - 2;
                if self.domain.get(index).is_none_or(|d| d.class != class) {
                    return unsupported();
                }
                Ok(Reference::Domain(index))
            }
        }
    }
    fn object(&mut self) -> Result<Reference> {
        self.object_with_float_limit(512)
    }
    fn object_with_float_limit(&mut self, float_limit: usize) -> Result<Reference> {
        if self.depth >= 256 {
            return unsupported();
        }
        self.depth += 1;
        let class = self.uint()?;
        let value = match class {
            0 => Ok(Reference::Null),
            3 => self.generic(3, |r| Ok(GenericValue::String(r.string()?))),
            15 => self.generic(15, |r| {
                let count = r.uint()?;
                if count > 512 {
                    return unsupported();
                }
                let mut values = Vec::with_capacity(count as usize);
                for _ in 0..count {
                    values.push(r.object()?);
                }
                Ok(GenericValue::Array(values))
            }),
            17 => self.generic(17, |r| {
                let count = r.uint()?;
                if count as usize > float_limit {
                    return unsupported();
                }
                let mut values = Vec::with_capacity(count as usize);
                for _ in 0..count {
                    values.push(r.float()?);
                }
                Ok(GenericValue::FloatList(values))
            }),
            16 | 47 => self.generic(class, |r| {
                let count = r.uint()?;
                if count > 4096 {
                    return unsupported();
                }
                let mut values = Vec::with_capacity(count as usize);
                for _ in 0..count {
                    values.push(if class == 47 {
                        u32::from(u16::from_be_bytes(r.take(2)?.try_into().unwrap()))
                    } else {
                        r.uint()?
                    });
                }
                Ok(GenericValue::IntList(values))
            }),
            30 => self.generic(30, |r| {
                Ok(GenericValue::Color(r.take(4)?.try_into().unwrap()))
            }),
            41 => self.generic(41, |r| {
                #[cfg(feature = "scene-codec")]
                {
                    Ok(GenericValue::Vector([r.float()?, r.float()?, r.float()?]))
                }
                #[cfg(not(feature = "scene-codec"))]
                {
                    for _ in 0..3 {
                        r.float()?;
                    }
                    Ok(GenericValue::Other)
                }
            }),
            #[cfg(feature = "scene-codec")]
            116 => self.generic(116, |r| {
                let count = r.uint()?;
                if count > 512 {
                    return unsupported();
                }
                let mut rows = Vec::with_capacity(count as usize);
                for _ in 0..count {
                    let bone = r.object()?;
                    r.fields(bone, 12)?;
                    let mode = r.uint()?;
                    super::scene::BoneSplitMode::from_wire(mode)?;
                    rows.push((bone, mode));
                }
                Ok(GenericValue::SplitModes(rows))
            }),
            #[cfg(not(feature = "scene-codec"))]
            116 => self.generic(class, |r| {
                if r.uint()? != 0 {
                    return unsupported();
                }
                Ok(GenericValue::Other)
            }),
            38 => self.generic(class, |r| {
                #[cfg(feature = "scene-codec")]
                {
                    let count = r.uint()?;
                    if count > 64 {
                        return unsupported();
                    }
                    let mut pairs = Vec::new();
                    for _ in 0..count {
                        pairs.push((r.object()?, r.object()?));
                    }
                    Ok(GenericValue::Map(pairs))
                }
                #[cfg(not(feature = "scene-codec"))]
                {
                    if r.uint()? != 0 {
                        return unsupported();
                    }
                    Ok(GenericValue::Other)
                }
            }),
            11 | 12 | 13 | 18 | 43 | 46 | 54 | 71 | 80 | 108 => self.domain(class),
            #[cfg(feature = "scene-codec")]
            19 | 35 | 39 | 53 | 56 | 65 | 84 | 85 | 86 | 89 | 100 | 121 | 132 | 149 => {
                self.domain(class)
            }
            #[cfg(feature = "scene-codec")]
            123 => {
                let at = self.pos;
                if self.uint()? != 1 {
                    return unsupported();
                }
                self.pos = at;
                self.domain(class)
            }
            #[cfg(feature = "scene-codec")]
            134..=139 => self.generic(class, |r| {
                let offset = r.float()?;
                let count = r.uint()?;
                if count == 0 || count > 6 {
                    return unsupported();
                }
                let mut to = Vec::with_capacity(count as usize);
                for _ in 0..count {
                    let class = r.uint()?;
                    if !(140..=145).contains(&class) {
                        return unsupported();
                    }
                    to.push(ToPropertyWire {
                        class,
                        offset: r.float()?,
                        max: r.float()?,
                        scale: r.float()?,
                    });
                }
                Ok(GenericValue::FromProperty { class, offset, to })
            }),
            _ => unsupported(),
        };
        // A cached list must satisfy the current requesting field, not only
        // the larger context which first introduced its generic identity.
        if class == 17 {
            if let Ok(Reference::Generic(i)) = &value {
                if !matches!(self.generic.get(*i).and_then(|g|g.value.as_ref()),Some(GenericValue::FloatList(v)) if v.len()<=float_limit)
                {
                    return unsupported();
                }
            }
        }
        self.depth -= 1;
        value
    }
    fn fields(&self, reference: Reference, class: u32) -> Result<&BTreeMap<u32, Value>> {
        if let Reference::Domain(index) = reference {
            if let Some(d) = self.domain.get(index).filter(|d| d.class == class) {
                return d.fields.as_ref().ok_or(FormatError::UnsupportedProfile);
            }
        }
        unsupported()
    }
    fn field_reference(fields: &BTreeMap<u32, Value>, tag: u32) -> Result<Reference> {
        if let Some(Value::Reference(value)) = fields.get(&tag) {
            return Ok(*value);
        }
        unsupported()
    }
    fn blend(&self, reference: Reference) -> Result<BlendMode> {
        if let Reference::Generic(index) = reference {
            if let Some(Generic {
                kind: 201,
                value: Some(GenericValue::Enum(value)),
            }) = self.generic.get(index)
            {
                return BlendMode::from_wire(*value).ok_or(FormatError::UnsupportedProfile);
            }
        }
        unsupported()
    }
    fn array(&self, reference: Reference) -> Result<&[Reference]> {
        if let Reference::Generic(index) = reference {
            if let Some(Generic {
                value: Some(GenericValue::Array(values)),
                ..
            }) = self.generic.get(index)
            {
                return Ok(values);
            }
        }
        unsupported()
    }
    fn text(&self, reference: Reference) -> Result<String> {
        if let Reference::Generic(index) = reference {
            if let Some(Generic {
                value: Some(GenericValue::String(text)),
                ..
            }) = self.generic.get(index)
            {
                return Ok(text.clone());
            }
        }
        unsupported()
    }
    fn color(&self, reference: Reference) -> Result<[u8; 4]> {
        if let Reference::Generic(index) = reference {
            if let Some(Generic {
                kind: 30,
                value: Some(GenericValue::Color(color)),
            }) = self.generic.get(index)
            {
                return Ok(*color);
            }
        }
        unsupported()
    }
    fn float_list(&self, reference: Reference) -> Result<Vec<f32>> {
        if let Reference::Generic(index) = reference {
            if let Some(Generic {
                value: Some(GenericValue::FloatList(values)),
                ..
            }) = self.generic.get(index)
            {
                return Ok(values.clone());
            }
        }
        unsupported()
    }
    fn int_list(&self, reference: Reference, class: u32) -> Result<Vec<u32>> {
        if let Reference::Generic(index) = reference {
            if let Some(Generic {
                kind,
                value: Some(GenericValue::IntList(values)),
            }) = self.generic.get(index)
            {
                if *kind == class {
                    return Ok(values.clone());
                }
            }
        }
        unsupported()
    }
    fn attachment(
        &self,
        reference: Reference,
        bones: &[Reference],
    ) -> Result<(Attachment, Reference)> {
        let Reference::Domain(index) = reference else {
            return unsupported();
        };
        let class = self
            .domain
            .get(index)
            .ok_or(FormatError::UnsupportedProfile)?
            .class;
        if class != 43 && class != 46 {
            return unsupported();
        }
        let fields = self.fields(reference, class)?;
        let owner = Self::field_reference(fields, 0)?;
        let number = |tag| match fields.get(&tag) {
            Some(Value::Float(v)) => Ok(*v),
            _ => unsupported(),
        };
        let name = self.text(Self::field_reference(fields, 1)?)?;
        if class == 43 {
            return Ok((
                Region {
                    name,
                    path: self.text(Self::field_reference(fields, 13)?)?,
                    x: number(6)?,
                    y: number(7)?,
                    rotation: number(10)?,
                    scale_x: number(8)?,
                    scale_y: number(9)?,
                    width: number(11)?,
                    height: number(12)?,
                }
                .into(),
                owner,
            ));
        }
        let binding = self.fields(Self::field_reference(fields, 28)?, 71)?;
        if Self::field_reference(binding, 0)? != reference {
            return unsupported();
        }
        let refs = self.array(Self::field_reference(binding, 1)?)?;
        let bound = refs
            .iter()
            .map(|reference| {
                bones
                    .iter()
                    .position(|b| b == reference)
                    .ok_or(FormatError::UnsupportedProfile)
            })
            .collect::<Result<Vec<_>>>()?;
        let vertices = self
            .array(Self::field_reference(binding, 2)?)?
            .iter()
            .map(|v| {
                let fields = self.fields(*v, 54)?;
                Ok(Vertex {
                    weights: self.float_list(Self::field_reference(fields, 0)?)?,
                    positions: self.float_list(Self::field_reference(fields, 1)?)?,
                })
            })
            .collect::<Result<Vec<_>>>()?;
        let hull = match fields.get(&7) {
            Some(Value::UInt(v)) if v % 4 == 0 => (*v / 4) as usize,
            _ => return unsupported(),
        };
        let weighted = match fields.get(&30) {
            Some(Value::Flag(v)) => *v,
            _ => return unsupported(),
        };
        let raw_edges = self.int_list(Self::field_reference(fields, 8)?, 16)?;
        if raw_edges.iter().any(|i| i & 1 != 0) {
            return unsupported();
        }
        let edges = raw_edges.into_iter().map(|i| i >> 1).collect();
        let triangles = self
            .int_list(Self::field_reference(fields, 13)?, 47)?
            .into_iter()
            .map(|i| i as u16)
            .collect();
        Ok((
            Attachment::Mesh(Box::new(Mesh {
                image: Region {
                    name,
                    path: self.text(Self::field_reference(fields, 14)?)?,
                    x: 0.0,
                    y: 0.0,
                    rotation: 0.0,
                    scale_x: 1.0,
                    scale_y: 1.0,
                    width: number(16)?,
                    height: number(17)?,
                },
                weighted,
                uvs: self.float_list(Self::field_reference(fields, 12)?)?,
                triangles,
                edges,
                hull,
                bones: bound,
                vertices,
            })),
            owner,
        ))
    }
}

pub fn decode_minimal(payload: &[u8]) -> Result<MinimalProject> {
    let project = decode_region_profile(payload)?;
    if !project.slots.is_empty() || project.images_root != "./images/" {
        return unsupported();
    }
    Ok(project.rig)
}

pub(super) fn decode_region_profile(payload: &[u8]) -> Result<RegionProject> {
    if !payload.starts_with(&[
        0x48, 0xb0, 0x20, 0xb0, 0x20, b'4', b'.', b'3', b'.', b'2', 0xb6, 1,
    ]) {
        return unsupported();
    }
    let identity = payload
        .get(12..28)
        .ok_or(FormatError::UnsupportedProfile)?
        .try_into()
        .unwrap();
    let mut schema = Schema::new();
    let image = Region {
        name: "image".into(),
        path: String::new(),
        x: 0.0,
        y: 0.0,
        rotation: 0.0,
        scale_x: 1.0,
        scale_y: 1.0,
        width: 32.0,
        height: 24.0,
    };
    let slots = [
        Slot {
            blend: crate::minimal::regions::BlendMode::Normal,
            color: [255; 4],
            name: "region".into(),
            bone: 0,
            visible: true,
            attachment: Some(image.clone().into()),
        },
        Slot {
            blend: crate::minimal::regions::BlendMode::Normal,
            color: [255; 4],
            name: "mesh".into(),
            bone: 0,
            visible: true,
            attachment: Some(Attachment::Mesh(Box::new(super::meshes::quad(image, 0)))),
        },
    ];
    collect_schema(
        &project_record_with_regions(
            &MinimalProject::new("profile".into(), [0; 16]),
            &slots,
            &[0, 1],
            "./images/",
        ),
        &mut schema,
    );
    let mut r = Reader {
        bytes: payload,
        pos: 28,
        depth: 0,
        generic: vec![],
        domain: vec![],
        schema,
        #[cfg(feature = "scene-codec")]
        deform_coordinates: 0,
        #[cfg(feature = "scene-codec")]
        string_fields: vec![],
        #[cfg(feature = "scene-codec")]
        mesh_uv_limit: 512,
        #[cfg(feature = "scene-codec")]
        draw_order_limit: 128,
        #[cfg(feature = "scene-codec")]
        string_encodings: HashMap::new(),
    };
    let root = r.domain(0)?;
    if r.bytes.get(r.pos..) != Some(&[1, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0][..]) {
        return unsupported();
    }
    let project = r.fields(root, 0)?;
    let skeletons = r.array(Reader::field_reference(project, 0)?)?;
    if skeletons.len() != 1 {
        return unsupported();
    }
    let skeleton = r.fields(skeletons[0], 11)?;
    let name = r.text(Reader::field_reference(skeleton, 1)?)?;
    let references = r.array(Reader::field_reference(skeleton, 4)?)?;
    let mut bones = vec![];
    for reference in references {
        let fields = r.fields(*reference, 12)?;
        let name = r.text(Reader::field_reference(fields, 1)?)?;
        let parent = match Reader::field_reference(fields, 3)? {
            Reference::Null => None,
            Reference::Domain(id) => Some(
                references
                    .iter()
                    .position(|r| matches!(r, Reference::Domain(i) if *i == id))
                    .ok_or(FormatError::UnsupportedProfile)?,
            ),
            _ => return unsupported(),
        };
        let number = |tag| match fields.get(&tag) {
            Some(Value::Float(value)) => Ok(*value),
            _ => unsupported(),
        };
        bones.push(Bone {
            name,
            parent,
            x: number(10)?,
            y: number(11)?,
            rotation: number(12)?,
            length: number(9)?,
            scale_x: number(13)?,
            scale_y: number(14)?,
            shear_x: number(23)?,
            shear_y: number(25)?,
            color: r.color(Reader::field_reference(fields, 17)?)?,
        });
    }
    let slot_refs = r.array(Reader::field_reference(skeleton, 13)?)?;
    let region_refs = r.array(Reader::field_reference(skeleton, 6)?)?;
    let mut slots = vec![];
    for slot_ref in slot_refs {
        let fields = r.fields(*slot_ref, 13)?;
        let bone_ref = Reader::field_reference(fields, 2)?;
        let bone = references
            .iter()
            .position(|r| *r == bone_ref)
            .ok_or(FormatError::UnsupportedProfile)?;
        let name = r.text(Reader::field_reference(fields, 1)?)?;
        let active = Reader::field_reference(fields, 9)?;
        let mut attachment = None;
        for region_ref in region_refs {
            let class = match region_ref {
                Reference::Domain(i) => r.domain[*i].class,
                _ => return unsupported(),
            };
            let record = r.fields(*region_ref, class)?;
            if Reader::field_reference(record, 0)? != *slot_ref {
                continue;
            }
            let (candidate, _) = r.attachment(*region_ref, references)?;
            if attachment.is_some() {
                return unsupported();
            }
            attachment = Some(candidate);
            if active != Reference::Null && active != *region_ref {
                return unsupported();
            }
        }
        slots.push(Slot {
            blend: r.blend(Reader::field_reference(fields, 7)?)?,
            name,
            bone,
            attachment,
            visible: active != Reference::Null,
            color: r.color(Reader::field_reference(fields, 5)?)?,
        });
    }
    let region_order = region_refs
        .iter()
        .map(|reference| {
            let class = match reference {
                Reference::Domain(i) => r.domain[*i].class,
                _ => return unsupported(),
            };
            let fields = r.fields(*reference, class)?;
            let owner = Reader::field_reference(fields, 0)?;
            slot_refs
                .iter()
                .position(|slot| *slot == owner)
                .ok_or(FormatError::UnsupportedProfile)
        })
        .collect::<Result<Vec<_>>>()?;
    let project = RegionProject {
        images_root: r.text(Reader::field_reference(skeleton, 3)?)?,
        rig: MinimalProject {
            name,
            bones,
            identity,
        },
        slots,
        region_order,
    };
    // This conservative equality check includes every default, reference,
    // ordering, reserved field and suffix. Unsupported input remains immutable.
    if encode_region_payload(&project)? != payload {
        return unsupported();
    }
    Ok(project)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::minimal::encode_minimal_payload;

    #[cfg(feature = "scene-codec")]
    #[test]
    fn large_uv_lists_cannot_escape_the_requesting_context_via_cached_references() {
        fn reader(bytes: &[u8], cached: usize) -> Reader<'_> {
            Reader {
                bytes,
                pos: 0,
                depth: 0,
                generic: vec![Generic {
                    kind: 17,
                    value: Some(GenericValue::FloatList(vec![0.; cached])),
                }],
                domain: vec![],
                schema: Schema::new(),
                deform_coordinates: 0,
                string_fields: vec![],
                mesh_uv_limit: 1024,
                draw_order_limit: super::super::scene::MAX_SCENE_SLOTS,
                string_encodings: HashMap::new(),
            }
        }
        let bytes = [17, 2, 17, 2];
        let mut large = reader(&bytes, 1024);
        assert!(large.object_with_float_limit(1024).is_ok());
        assert!(
            large.object().is_err(),
            "Cached UV identity must not bypass a later ordinary field limit"
        );
        let mut ordinary = reader(&bytes, 512);
        assert!(ordinary.object_with_float_limit(1024).is_ok());
        assert!(ordinary.object().is_ok());
        let mut too_large = reader(&bytes, 1025);
        assert!(too_large.object_with_float_limit(1024).is_err());
        let mut body = vec![17, 1, 0x81, 4];
        body.extend(vec![0; 513 * 4]);
        let mut ordinary = reader(&body, 0);
        ordinary.generic.clear();
        assert!(ordinary.object().is_err());
        let mut uv = reader(&body, 0);
        uv.generic.clear();
        assert!(uv.object_with_float_limit(1024).is_ok());
    }

    #[test]
    fn roundtrips_unicode_names_graphs_and_numeric_transforms() {
        for name in ["A", "Animație", "骨格", "🦊", &"x".repeat(120)] {
            let mut project = MinimalProject::new(name.into(), [23; 16]);
            project.bones[0].name = "rădăcină".into();
            project.bones.push(Bone {
                name: "arm 🦊".into(),
                parent: Some(0),
                x: 37.0,
                y: -8.0,
                rotation: 25.0,
                length: 100.0,
                ..Bone::root()
            });
            let bytes = encode_minimal_payload(&project).unwrap();
            assert_eq!(decode_minimal(&bytes).unwrap(), project);
        }
    }

    #[test]
    fn rejects_truncation_unknown_fields_and_unmodeled_settings_without_panicking() {
        let bytes =
            encode_minimal_payload(&MinimalProject::new("skeleton".into(), [0; 16])).unwrap();
        for end in 0..bytes.len() {
            assert!(decode_minimal(&bytes[..end]).is_err());
        }
        let mut settings = bytes.clone();
        // Project zoom is unmodeled: even a valid finite value must not be dropped.
        settings[43..47].copy_from_slice(&2_f32.to_be_bytes());
        assert!(decode_minimal(&settings).is_err());
        let mut unknown = bytes.clone();
        unknown[30] = 127;
        assert!(decode_minimal(&unknown).is_err());
        let mut invalid_reference = bytes.clone();
        invalid_reference[270] = 127;
        assert!(decode_minimal(&invalid_reference).is_err());
        for index in 28..bytes.len() {
            let mut mutated = bytes.clone();
            mutated[index] = 255;
            let _ = decode_minimal(&mutated); // A malformed file must never panic.
        }
    }

    #[test]
    fn rejects_broken_graphs_and_non_finite_transforms() {
        let mut project = MinimalProject::new("rig".into(), [0; 16]);
        project.bones[0].parent = Some(0);
        assert!(encode_minimal_payload(&project).is_err());
        project.bones[0].parent = None;
        project.bones[0].x = f32::NAN;
        assert!(encode_minimal_payload(&project).is_err());
    }
}

#[cfg(feature = "scene-codec")]
#[path = "scene_reader.rs"]
mod scene_reader;
#[cfg(feature = "scene-codec")]
pub(super) fn decode_scene_profile(payload: &[u8]) -> Result<super::scene::SceneProject> {
    scene_reader::decode(payload)
}
#[cfg(feature = "scene-codec")]
pub(super) fn materialize_scene_wire(payload: &[u8]) -> Result<super::scene::SceneWire> {
    scene_reader::materialize(payload)
}

#[cfg(feature = "scene-codec")]
pub(super) fn validate_scene_payload_structure(payload: &[u8]) -> Result<()> {
    scene_reader::validate_structure(payload)
}
