//! Closed typed extraction of the measured passive editor metadata.
use super::*;
use crate::minimal::scene::*;
fn field(f: &BTreeMap<u32, Value>, tag: u32) -> Result<&Value> {
    f.get(&tag).ok_or(FormatError::UnsupportedProfile)
}
fn uint(f: &BTreeMap<u32, Value>, tag: u32) -> Result<u32> {
    match field(f, tag)? {
        Value::UInt(v) => Ok(*v),
        _ => unsupported(),
    }
}
fn flag(f: &BTreeMap<u32, Value>, tag: u32) -> Result<bool> {
    match field(f, tag)? {
        Value::Flag(v) => Ok(*v),
        _ => unsupported(),
    }
}
fn float(f: &BTreeMap<u32, Value>, tag: u32) -> Result<FiniteF32> {
    match field(f, tag)? {
        Value::Float(v) => FiniteF32::new(*v),
        _ => unsupported(),
    }
}
fn text(r: &Reader<'_>, reference: Reference) -> Result<WireEditorString> {
    let Reference::Generic(i) = reference else {
        return unsupported();
    };
    let value = r.text(reference)?;
    Ok(WireEditorString {
        value: value.clone(),
        group: Some(i as u32),
        encoding: r.string_encodings.get(&i).map(|form| WireStringEncoding {
            form: *form,
            source_text: value,
        }),
    })
}
fn enum_value(r: &Reader<'_>, reference: Reference) -> Result<WireEditorEnum> {
    let Reference::Generic(i) = reference else {
        return unsupported();
    };
    match r.generic.get(i) {
        Some(Generic {
            kind: 201,
            value: Some(GenericValue::Enum(value)),
        }) => Ok(WireEditorEnum {
            value: *value,
            group: Some(i as u32),
        }),
        _ => unsupported(),
    }
}
fn map<'a>(r: &'a Reader<'_>, reference: Reference) -> Result<&'a [(Reference, Reference)]> {
    let Reference::Generic(i) = reference else {
        return unsupported();
    };
    match r.generic.get(i) {
        Some(Generic {
            kind: 38,
            value: Some(GenericValue::Map(entries)),
        }) => Ok(entries),
        _ => unsupported(),
    }
}
fn history(r: &Reader<'_>, reference: Reference) -> Result<Vec<WireHistoryEntry>> {
    let mut result = Vec::new();
    for (key, value) in map(r, reference)? {
        let f = r.fields(*value, 85)?;
        let mut paths = Vec::new();
        for item in r.array(Reader::field_reference(f, 1)?)? {
            let p = r.fields(*item, 86)?;
            let Value::UInt64(stamp) = field(p, 1)? else {
                return unsupported();
            };
            paths.push(WireHistoryPath {
                path: text(r, Reader::field_reference(p, 0)?)?,
                stamp: *stamp,
                flag: flag(p, 2)?,
            });
        }
        result.push(WireHistoryEntry {
            key: text(r, *key)?,
            kind: uint(f, 0)?,
            paths,
        });
    }
    Ok(result)
}
fn packing(r: &Reader<'_>, reference: Reference) -> Result<WirePackingSettings> {
    let f = r.fields(reference, 100)?;
    let flags = EDITOR_PACK_FLAG_TAGS
        .map(|t| flag(f, t))
        .into_iter()
        .collect::<Result<Vec<_>>>()?
        .try_into()
        .map_err(|_| FormatError::UnsupportedProfile)?;
    let uints = EDITOR_PACK_UINT_TAGS
        .map(|t| uint(f, t))
        .into_iter()
        .collect::<Result<Vec<_>>>()?
        .try_into()
        .map_err(|_| FormatError::UnsupportedProfile)?;
    let enums = EDITOR_PACK_ENUM_TAGS
        .map(|t| enum_value(r, Reader::field_reference(f, t)?))
        .into_iter()
        .collect::<Result<Vec<_>>>()?
        .try_into()
        .map_err(|_| FormatError::UnsupportedProfile)?;
    let strings = match Reader::field_reference(f, 20)? {
        Reference::Null => None,
        Reference::Generic(i) => match r.generic.get(i) {
            Some(Generic {
                kind: 206,
                value: Some(GenericValue::StringArray(v)),
            }) => Some(v.clone()),
            _ => return unsupported(),
        },
        _ => return unsupported(),
    };
    let enum_array = match Reader::field_reference(f, 21)? {
        Reference::Null => None,
        reference => Some(
            r.array(reference)?
                .iter()
                .map(|v| enum_value(r, *v))
                .collect::<Result<Vec<_>>>()?,
        ),
    };
    let float_array = match Reader::field_reference(f, 19)? {
        Reference::Null => None,
        reference => Some(
            r.float_list(reference)?
                .into_iter()
                .map(FiniteF32::new)
                .collect::<Result<Vec<_>>>()?,
        ),
    };
    Ok(WirePackingSettings {
        flags,
        uints,
        enums,
        strings,
        enum_array,
        float_array,
        text_31: text(r, Reader::field_reference(f, 31)?)?,
        text_14: text(r, Reader::field_reference(f, 14)?)?,
        float_15: float(f, 15)?,
    })
}
fn exports(r: &Reader<'_>, reference: Reference) -> Result<Vec<WireExportEntry>> {
    map(r, reference)?
        .iter()
        .map(|(key, value)| {
            let f = r.fields(*value, 89)?;
            let flags = EDITOR_JSON_FLAG_TAGS
                .map(|t| flag(f, t))
                .into_iter()
                .collect::<Result<Vec<_>>>()?
                .try_into()
                .map_err(|_| FormatError::UnsupportedProfile)?;
            let texts = EDITOR_JSON_TEXT_TAGS
                .map(|t| text(r, Reader::field_reference(f, t)?))
                .into_iter()
                .collect::<Result<Vec<_>>>()?
                .try_into()
                .map_err(|_| FormatError::UnsupportedProfile)?;
            Ok(WireExportEntry {
                key: text(r, *key)?,
                settings: WireJsonSettings {
                    flags,
                    texts,
                    packing: packing(r, Reader::field_reference(f, 5)?)?,
                },
            })
        })
        .collect()
}
pub(super) fn read(
    r: &Reader<'_>,
    project: &BTreeMap<u32, Value>,
    skeleton: &BTreeMap<u32, Value>,
) -> Result<Option<WireEditorMetadata>> {
    let format = match Reader::field_reference(project, 13)? {
        Reference::Null => None,
        value => Some(text(r, value)?),
    };
    let vectors = EDITOR_VECTOR_TAGS
        .map(|tag| {
            let Reference::Generic(i) = Reader::field_reference(project, tag)? else {
                return unsupported();
            };
            match r.generic.get(i) {
                Some(Generic {
                    kind: 41,
                    value: Some(GenericValue::Vector(v)),
                }) => v
                    .map(FiniteF32::new)
                    .into_iter()
                    .collect::<Result<Vec<_>>>()?
                    .try_into()
                    .map_err(|_| FormatError::UnsupportedProfile),
                _ => unsupported(),
            }
        })
        .into_iter()
        .collect::<Result<Vec<_>>>()?
        .try_into()
        .map_err(|_| FormatError::UnsupportedProfile)?;
    let mut sources = Vec::new();
    for source in r.array(Reader::field_reference(skeleton, 51)?)? {
        let f = r.fields(*source, 149)?;
        sources.push(WireSourceImage {
            path: text(r, Reader::field_reference(f, 0)?)?,
            values: [float(f, 1)?, float(f, 2)?],
            flags: [flag(f, 3)?, flag(f, 4)?],
        });
    }
    let metadata = WireEditorMetadata {
        directories: history(r, Reader::field_reference(project, 30)?)?,
        imports: history(r, Reader::field_reference(project, 29)?)?,
        exports: exports(r, Reader::field_reference(project, 36)?)?,
        sources,
        format,
        flag_4: flag(project, 4)?,
        uint_42: uint(project, 42)?,
        scalar_8: float(project, 8)?,
        scalar_34: float(project, 34)?,
        vectors,
    };
    Ok((metadata != WireEditorMetadata::default()).then_some(metadata))
}
