//! Explicit, passive serialization provenance for the measured editor records.
//! Remembered paths are strings, never filesystem or runtime instructions.
use super::super::{object, Field, Object, Record};
use super::{FiniteF32, WireStringEncoding, WireStringForm};
use crate::FormatError;

pub const EDITOR_VECTOR_TAGS: [u32; 5] = [16, 31, 14, 33, 7];
pub const EDITOR_JSON_FLAG_TAGS: [u32; 6] = [2, 3, 9, 4, 8, 10];
pub const EDITOR_JSON_TEXT_TAGS: [u32; 5] = [6, 7, 0, 1, 127];
pub const EDITOR_PACK_FLAG_TAGS: [u32; 25] = [
    44, 2, 34, 25, 42, 43, 13, 18, 33, 17, 5, 36, 1, 12, 24, 39, 6, 32, 41, 4, 11, 37, 3, 45, 35,
];
pub const EDITOR_PACK_UINT_TAGS: [u32; 6] = [7, 9, 10, 23, 8, 22];
pub const EDITOR_PACK_ENUM_TAGS: [u32; 6] = [28, 29, 40, 27, 30, 26];
const MAX_ENTRIES: usize = 64;
const MAX_PATHS: usize = 256;
const MAX_ARRAY: usize = 64;

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct WireEditorString {
    pub value: String,
    pub group: Option<u32>,
    pub encoding: Option<WireStringEncoding>,
}
impl From<&str> for WireEditorString {
    fn from(value: &str) -> Self {
        Self {
            value: value.into(),
            ..Self::default()
        }
    }
}
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct WireEditorEnum {
    pub value: u32,
    pub group: Option<u32>,
}
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct WireHistoryPath {
    pub path: WireEditorString,
    pub stamp: u64,
    pub flag: bool,
}
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct WireHistoryEntry {
    pub key: WireEditorString,
    pub kind: u32,
    pub paths: Vec<WireHistoryPath>,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireSourceImage {
    pub path: WireEditorString,
    pub values: [FiniteF32; 2],
    pub flags: [bool; 2],
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireExportEntry {
    pub key: WireEditorString,
    pub settings: WireJsonSettings,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireJsonSettings {
    pub flags: [bool; 6],
    pub texts: [WireEditorString; 5],
    pub packing: WirePackingSettings,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WirePackingSettings {
    pub flags: [bool; 25],
    pub uints: [u32; 6],
    pub enums: [WireEditorEnum; 6],
    pub strings: Option<Vec<String>>,
    pub enum_array: Option<Vec<WireEditorEnum>>,
    pub float_array: Option<Vec<FiniteF32>>,
    pub text_31: WireEditorString,
    pub text_14: WireEditorString,
    pub float_15: FiniteF32,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireEditorMetadata {
    pub directories: Vec<WireHistoryEntry>,
    pub imports: Vec<WireHistoryEntry>,
    pub exports: Vec<WireExportEntry>,
    pub sources: Vec<WireSourceImage>,
    pub format: Option<WireEditorString>,
    pub flag_4: bool,
    pub uint_42: u32,
    pub scalar_8: FiniteF32,
    pub scalar_34: FiniteF32,
    pub vectors: [[FiniteF32; 3]; 5],
}
fn finite(value: f32) -> FiniteF32 {
    FiniteF32::new(value).expect("finite editor default")
}
impl Default for WirePackingSettings {
    fn default() -> Self {
        Self {
            flags: [false; 25],
            uints: [0; 6],
            enums: std::array::from_fn(|_| WireEditorEnum::default()),
            strings: None,
            enum_array: None,
            float_array: None,
            text_31: WireEditorString::default(),
            text_14: WireEditorString::default(),
            float_15: finite(0.),
        }
    }
}
impl Default for WireJsonSettings {
    fn default() -> Self {
        Self {
            flags: [false; 6],
            texts: std::array::from_fn(|_| WireEditorString::default()),
            packing: WirePackingSettings::default(),
        }
    }
}
impl Default for WireSourceImage {
    fn default() -> Self {
        Self {
            path: WireEditorString::default(),
            values: [finite(0.); 2],
            flags: [false; 2],
        }
    }
}
impl Default for WireEditorMetadata {
    fn default() -> Self {
        Self {
            directories: vec![],
            imports: vec![],
            exports: vec![],
            sources: vec![],
            format: None,
            flag_4: false,
            uint_42: 0,
            scalar_8: finite(1.),
            scalar_34: finite(1.),
            vectors: [[finite(0.); 3]; 5],
        }
    }
}
fn text(value: &WireEditorString) -> Field {
    Field::WireString {
        value: value.value.clone(),
        group: value.group,
        encoding: value.encoding.as_ref().map(|encoding| encoding.form),
        label: None,
    }
}
fn key(value: &WireEditorString) -> Object {
    Object::EditorString {
        value: value.value.clone(),
        group: value.group,
        encoding: value.encoding.as_ref().map(|encoding| encoding.form),
    }
}
fn record(class: u32, fields: Vec<(u32, Field)>) -> Object {
    Object::Record(Record {
        class,
        label: None,
        fields,
    })
}
fn history(entries: &[WireHistoryEntry]) -> Object {
    Object::Map(
        entries
            .iter()
            .map(|entry| {
                (
                    key(&entry.key),
                    record(
                        85,
                        vec![
                            (
                                1,
                                object(Object::Array(
                                    entry
                                        .paths
                                        .iter()
                                        .map(|path| {
                                            record(
                                                86,
                                                vec![
                                                    (0, text(&path.path)),
                                                    (1, Field::UInt64(path.stamp)),
                                                    (2, Field::Bool(path.flag)),
                                                ],
                                            )
                                        })
                                        .collect(),
                                )),
                            ),
                            (0, Field::UInt(entry.kind)),
                        ],
                    ),
                )
            })
            .collect(),
    )
}
fn enum_field(value: &WireEditorEnum) -> Field {
    Field::EditorEnum {
        value: value.value,
        group: value.group,
    }
}
impl WirePackingSettings {
    fn record(&self) -> Object {
        let b = |tag| {
            Field::Bool(
                self.flags[EDITOR_PACK_FLAG_TAGS
                    .iter()
                    .position(|t| *t == tag)
                    .unwrap()],
            )
        };
        let u = |tag| {
            Field::UInt(
                self.uints[EDITOR_PACK_UINT_TAGS
                    .iter()
                    .position(|t| *t == tag)
                    .unwrap()],
            )
        };
        let e = |tag| {
            enum_field(
                &self.enums[EDITOR_PACK_ENUM_TAGS
                    .iter()
                    .position(|t| *t == tag)
                    .unwrap()],
            )
        };
        record(
            100,
            vec![
                (44, b(44)),
                (20, Field::StringArray(self.strings.clone())),
                (2, b(2)),
                (34, b(34)),
                (25, b(25)),
                (42, b(42)),
                (7, u(7)),
                (43, b(43)),
                (13, b(13)),
                (28, e(28)),
                (18, b(18)),
                (33, b(33)),
                (9, u(9)),
                (17, b(17)),
                (5, b(5)),
                (29, e(29)),
                (40, e(40)),
                (21, Field::EnumArray(self.enum_array.clone())),
                (10, u(10)),
                (36, b(36)),
                (1, b(1)),
                (12, b(12)),
                (24, b(24)),
                (39, b(39)),
                (6, b(6)),
                (32, b(32)),
                (41, b(41)),
                (27, e(27)),
                (4, b(4)),
                (11, b(11)),
                (
                    19,
                    Field::OptionalFloatArray(
                        self.float_array
                            .as_ref()
                            .map(|values| values.iter().map(|v| v.get()).collect()),
                    ),
                ),
                (37, b(37)),
                (23, u(23)),
                (3, b(3)),
                (30, e(30)),
                (45, b(45)),
                (8, u(8)),
                (31, text(&self.text_31)),
                (26, e(26)),
                (14, text(&self.text_14)),
                (35, b(35)),
                (22, u(22)),
                (15, Field::Float(self.float_15.get())),
            ],
        )
    }
}
impl WireSourceImage {
    fn record(&self) -> Object {
        record(
            149,
            vec![
                (0, text(&self.path)),
                (1, Field::Float(self.values[0].get())),
                (2, Field::Float(self.values[1].get())),
                (3, Field::Bool(self.flags[0])),
                (4, Field::Bool(self.flags[1])),
            ],
        )
    }
}
/// Known record shapes for bounded structural reading; never authored extras.
pub(in crate::minimal) fn schema_objects() -> Vec<Object> {
    vec![
        history(&[WireHistoryEntry {
            paths: vec![WireHistoryPath::default()],
            ..WireHistoryEntry::default()
        }]),
        WireJsonSettings::default().record(),
        WireSourceImage::default().record(),
    ]
}
impl WireJsonSettings {
    fn record(&self) -> Object {
        let b = |tag| {
            Field::Bool(
                self.flags[EDITOR_JSON_FLAG_TAGS
                    .iter()
                    .position(|t| *t == tag)
                    .unwrap()],
            )
        };
        let s = |tag| {
            text(
                &self.texts[EDITOR_JSON_TEXT_TAGS
                    .iter()
                    .position(|t| *t == tag)
                    .unwrap()],
            )
        };
        record(
            89,
            vec![
                (2, b(2)),
                (6, s(6)),
                (7, s(7)),
                (3, b(3)),
                (5, object(self.packing.record())),
                (9, b(9)),
                (0, s(0)),
                (1, s(1)),
                (4, b(4)),
                (8, b(8)),
                (10, b(10)),
                (127, s(127)),
            ],
        )
    }
}
impl WireEditorMetadata {
    pub(crate) fn visit_strings(&self, mut visit: impl FnMut(&WireEditorString)) {
        if let Some(format) = &self.format {
            visit(format);
        }
        for entries in [&self.directories, &self.imports] {
            for entry in entries {
                visit(&entry.key);
                for path in &entry.paths {
                    visit(&path.path);
                }
            }
        }
        for entry in &self.exports {
            visit(&entry.key);
            for value in &entry.settings.texts {
                visit(value);
            }
            visit(&entry.settings.packing.text_31);
            visit(&entry.settings.packing.text_14);
        }
        for source in &self.sources {
            visit(&source.path);
        }
    }
    pub(crate) fn visit_strings_mut(&mut self, mut visit: impl FnMut(&mut WireEditorString)) {
        if let Some(format) = &mut self.format {
            visit(format);
        }
        for entries in [&mut self.directories, &mut self.imports] {
            for entry in entries {
                visit(&mut entry.key);
                for path in &mut entry.paths {
                    visit(&mut path.path);
                }
            }
        }
        for entry in &mut self.exports {
            visit(&mut entry.key);
            for value in &mut entry.settings.texts {
                visit(value);
            }
            visit(&mut entry.settings.packing.text_31);
            visit(&mut entry.settings.packing.text_14);
        }
        for source in &mut self.sources {
            visit(&mut source.path);
        }
    }
    pub(crate) fn visit_enums(&self, mut visit: impl FnMut(&WireEditorEnum)) {
        for entry in &self.exports {
            for value in &entry.settings.packing.enums {
                visit(value);
            }
            if let Some(values) = &entry.settings.packing.enum_array {
                for value in values {
                    visit(value);
                }
            }
        }
    }
    pub(crate) fn visit_enums_mut(&mut self, mut visit: impl FnMut(&mut WireEditorEnum)) {
        for entry in &mut self.exports {
            for value in &mut entry.settings.packing.enums {
                visit(value);
            }
            if let Some(values) = &mut entry.settings.packing.enum_array {
                for value in values {
                    visit(value);
                }
            }
        }
    }
    pub(crate) fn validate(&self) -> Result<(), FormatError> {
        let fail = || FormatError::UnsupportedProfile;
        if self.directories.len() > MAX_ENTRIES
            || self.imports.len() > MAX_ENTRIES
            || self.exports.len() > MAX_ENTRIES
            || self.sources.len() > MAX_ENTRIES
        {
            return Err(fail());
        }
        for entries in [&self.directories, &self.imports] {
            let mut keys = std::collections::HashSet::new();
            for entry in entries {
                if !keys.insert(&entry.key.value) || entry.paths.len() > MAX_PATHS {
                    return Err(fail());
                }
                // Six ordinary base128 bytes cover the measured counters. Wider
                // varlong encodings are not introduced by this source profile.
                if entry.paths.iter().any(|path| path.stamp >= 1u64 << 42) {
                    return Err(fail());
                }
            }
        }
        let mut keys = std::collections::HashSet::new();
        for entry in &self.exports {
            if !keys.insert(&entry.key.value) {
                return Err(fail());
            }
            let p = &entry.settings.packing;
            if p.strings
                .as_ref()
                .is_some_and(|v| v.len() > MAX_ARRAY || v.iter().any(|s| s.len() > 1024))
                || p.enum_array.as_ref().is_some_and(|v| v.len() > MAX_ARRAY)
                || p.float_array.as_ref().is_some_and(|v| v.len() > MAX_ARRAY)
            {
                return Err(fail());
            }
        }
        let mut valid = true;
        self.visit_strings(|value| {
            valid &= value.value.len() <= 1024 && value.group.is_none_or(|group| group < 16384);
            if let Some(encoding) = &value.encoding {
                valid &= encoding.form == WireStringForm::Utf8Length
                    && encoding.source_text == value.value
                    && value.value.is_ascii()
                    && value.value.len() >= 2;
            }
        });
        self.visit_enums(|value| valid &= value.group.is_none_or(|group| group < 16384));
        if !valid {
            return Err(fail());
        }
        Ok(())
    }
    pub(in crate::minimal) fn apply(&self, root: &mut Record) {
        fn set(record: &mut Record, tag: u32, value: Field) {
            record
                .fields
                .iter_mut()
                .find(|(t, _)| *t == tag)
                .expect("known editor field")
                .1 = value;
        }
        set(root, 30, object(history(&self.directories)));
        set(root, 29, object(history(&self.imports)));
        set(
            root,
            36,
            object(Object::Map(
                self.exports
                    .iter()
                    .map(|entry| (key(&entry.key), entry.settings.record()))
                    .collect(),
            )),
        );
        // Keep the established string-reference encoder and source body form.
        set(
            root,
            13,
            self.format
                .as_ref()
                .map(text)
                .unwrap_or(Field::NullableString(None)),
        );
        set(root, 4, Field::Bool(self.flag_4));
        set(root, 42, Field::UInt(self.uint_42));
        set(root, 8, Field::Float(self.scalar_8.get()));
        set(root, 34, Field::Float(self.scalar_34.get()));
        for (tag, values) in EDITOR_VECTOR_TAGS.into_iter().zip(self.vectors) {
            set(
                root,
                tag,
                object(Object::Vector(values.map(FiniteF32::get))),
            );
        }
        let Field::Value(Object::Array(skeletons)) = &mut root
            .fields
            .iter_mut()
            .find(|(tag, _)| *tag == 0)
            .expect("skeleton field")
            .1
        else {
            unreachable!("known skeleton array")
        };
        let Object::Record(skeleton) = &mut skeletons[0] else {
            unreachable!("known skeleton record")
        };
        set(
            skeleton,
            51,
            object(Object::Array(
                self.sources.iter().map(WireSourceImage::record).collect(),
            )),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::minimal::{
        encode_record_payload_counted, project_record_with_regions, MinimalProject,
    };

    #[test]
    fn passive_defaults_keep_the_existing_root_bytes_and_arena_counts() {
        let rig = MinimalProject::new("Own metadata defaults".into(), [47; 16]);
        let original = project_record_with_regions(&rig, &[], &[], "./images/");
        let mut rebuilt = project_record_with_regions(&rig, &[], &[], "./images/");
        WireEditorMetadata::default().apply(&mut rebuilt);
        assert_eq!(
            encode_record_payload_counted(&original, rig.identity),
            encode_record_payload_counted(&rebuilt, rig.identity),
        );
    }

    #[test]
    fn measured_wide_counters_stay_exact_and_unmeasured_width_is_rejected() {
        let mut metadata = WireEditorMetadata::default();
        metadata.imports.push(WireHistoryEntry {
            key: "importPsdFile".into(),
            kind: 2,
            paths: vec![WireHistoryPath {
                path: "../remembered-only/source.psd".into(),
                stamp: 3_500_000_000_001,
                flag: false,
            }],
        });
        assert!(metadata.validate().is_ok());
        metadata.imports[0].paths[0].stamp = (1u64 << 42) - 1;
        assert!(metadata.validate().is_ok());
        metadata.imports[0].paths[0].stamp += 1;
        assert!(matches!(
            metadata.validate(),
            Err(FormatError::UnsupportedProfile)
        ));
    }

    #[test]
    fn duplicate_map_keys_and_invalid_string_provenance_cannot_be_authored() {
        let mut metadata = WireEditorMetadata::default();
        metadata.directories.push(WireHistoryEntry {
            key: "imagesDir".into(),
            ..WireHistoryEntry::default()
        });
        metadata.directories.push(metadata.directories[0].clone());
        assert!(matches!(
            metadata.validate(),
            Err(FormatError::UnsupportedProfile)
        ));
        metadata.directories.pop();
        metadata.directories[0].key.encoding = Some(WireStringEncoding {
            form: WireStringForm::Utf8Length,
            source_text: "different".into(),
        });
        assert!(matches!(
            metadata.validate(),
            Err(FormatError::UnsupportedProfile)
        ));
    }
}
