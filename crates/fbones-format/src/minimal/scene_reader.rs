//! Scene decoding shares the bounded grammar; the typed model remains subject
//! to exact, complete reserialization through the independent scene writer.
use super::*;
use crate::minimal::scene::*;
use std::ops::Range;
fn number(fields: &BTreeMap<u32, Value>, tag: u32) -> Result<f32> {
    match fields.get(&tag) {
        Some(Value::Float(v)) => Ok(*v),
        _ => unsupported(),
    }
}
fn flag(fields: &BTreeMap<u32, Value>, tag: u32) -> Result<bool> {
    match fields.get(&tag) {
        Some(Value::Flag(v)) => Ok(*v),
        _ => unsupported(),
    }
}
fn uint(fields: &BTreeMap<u32, Value>, tag: u32) -> Result<u32> {
    match fields.get(&tag) {
        Some(Value::UInt(v)) => Ok(*v),
        _ => unsupported(),
    }
}
fn index(reference: Reference, values: &[Reference]) -> Result<usize> {
    values
        .iter()
        .position(|r| *r == reference)
        .ok_or(FormatError::UnsupportedProfile)
}
fn optional_index(reference: Reference, values: &[Reference]) -> Result<Option<usize>> {
    if reference == Reference::Null {
        Ok(None)
    } else {
        index(reference, values).map(Some)
    }
}
fn bone_indices(
    r: &Reader<'_>,
    fields: &BTreeMap<u32, Value>,
    tag: u32,
    bones: &[Reference],
) -> Result<Vec<usize>> {
    r.array(Reader::field_reference(fields, tag)?)?
        .iter()
        .map(|b| index(*b, bones))
        .collect()
}
fn vertices(r: &Reader<'_>, binding: &BTreeMap<u32, Value>) -> Result<Vec<Vertex>> {
    r.array(Reader::field_reference(binding, 2)?)?
        .iter()
        .map(|v| {
            let f = r.fields(*v, 54)?;
            Ok(Vertex {
                weights: r.float_list(Reader::field_reference(f, 0)?)?,
                positions: r.float_list(Reader::field_reference(f, 1)?)?,
            })
        })
        .collect()
}
fn attachment(
    r: &Reader<'_>,
    reference: Reference,
    bones: &[Reference],
    slots: &[Reference],
) -> Result<(SceneAttachment, Reference)> {
    let Reference::Domain(i) = reference else {
        return unsupported();
    };
    if r.domain[i].class == 69 {
        let fields = r.fields(reference, 69)?;
        let binding = r.fields(Reader::field_reference(fields, 28)?, 53)?;
        if Reader::field_reference(binding, 0)? != reference {
            return unsupported();
        }
        let points = vertices(r, binding)?;
        let edges = r.int_list(Reader::field_reference(fields, 8)?, 16)?;
        if uint(fields, 7)? as usize != points.len() * 4 || edges.iter().any(|edge| edge & 1 != 0) {
            return unsupported();
        }
        let lengths = r
            .float_list(Reader::field_reference(fields, 15)?)?
            .into_iter()
            .map(FiniteF32::new)
            .collect::<Result<Vec<_>>>()?;
        return Ok((
            SceneAttachment::Path(PathAttachment {
                name: r.text(Reader::field_reference(fields, 1)?)?,
                closed: flag(fields, 12)?,
                constant_speed: flag(fields, 13)?,
                color: r.color(Reader::field_reference(fields, 31)?)?,
                weighted: flag(fields, 30)?,
                bones: bone_indices(r, binding, 1, bones)?,
                vertices: points,
                edges: edges.into_iter().map(|edge| edge >> 1).collect(),
                lengths,
            }),
            Reader::field_reference(fields, 0)?,
        ));
    }
    if r.domain[i].class != 84 {
        let (a, owner) = r.attachment(reference, bones)?;
        return Ok((
            match a {
                Attachment::Region(v) => SceneAttachment::Region(v),
                Attachment::Mesh(v) => SceneAttachment::Mesh(v),
            },
            owner,
        ));
    }
    let f = r.fields(reference, 84)?;
    let binding = r.fields(Reader::field_reference(f, 28)?, 53)?;
    if Reader::field_reference(binding, 0)? != reference {
        return unsupported();
    }
    let points = vertices(r, binding)?;
    if uint(f, 7)? as usize != points.len() * 4 {
        return unsupported();
    }
    let raw_edges = r.int_list(Reader::field_reference(f, 8)?, 16)?;
    if raw_edges.iter().any(|i| i & 1 != 0) {
        return unsupported();
    }
    Ok((
        SceneAttachment::Clipping(Clipping {
            name: r.text(Reader::field_reference(f, 1)?)?,
            end_slot: optional_index(Reader::field_reference(f, 12)?, slots)?,
            convex: flag(f, 13)?,
            inverse: flag(f, 14)?,
            color: r.color(Reader::field_reference(f, 31)?)?,
            weighted: flag(f, 30)?,
            bones: bone_indices(r, binding, 1, bones)?,
            vertices: points,
            edges: raw_edges.into_iter().map(|i| i >> 1).collect(),
        }),
        Reader::field_reference(f, 0)?,
    ))
}
fn property(class: u32, base: u32) -> Result<TransformProperty> {
    TransformProperty::ALL
        .get(class.wrapping_sub(base) as usize)
        .copied()
        .ok_or(FormatError::UnsupportedProfile)
}
fn constraint(
    r: &Reader<'_>,
    reference: Reference,
    bones: &[Reference],
    slots: &[Reference],
) -> Result<Constraint> {
    let Reference::Domain(i) = reference else {
        return unsupported();
    };
    let class = r.domain[i].class;
    let f = r.fields(reference, class)?;
    let name = r.text(Reader::field_reference(f, 1)?)?;
    match class {
        56 => Ok(Constraint::Ik(IkConstraint {
            name,
            bones: bone_indices(r, f, 2, bones)?,
            target: index(Reader::field_reference(f, 3)?, bones)?,
            mix: number(f, 5)?,
            softness: number(f, 14)?,
            bend_positive: flag(f, 16)?,
            compress: flag(f, 11)?,
            stretch: flag(f, 9)?,
        })),
        65 => {
            let Reference::Generic(range_index) = Reader::field_reference(f, 31)? else {
                return unsupported();
            };
            let Some(Generic {
                kind: 203,
                value: Some(GenericValue::NullableFloats(range_values)),
            }) = r.generic.get(range_index)
            else {
                return unsupported();
            };
            let mut editor_ranges = [TransformEditorRange::default(); 6];
            for (i, row) in editor_ranges.iter_mut().enumerate() {
                *row = TransformEditorRange::from_bits(std::array::from_fn(|j| {
                    range_values[i * 4 + j].map(f32::to_bits)
                }))?;
            }
            let mut properties = vec![];
            for reference in r.array(Reader::field_reference(f, 29)?)? {
                let Reference::Generic(i) = reference else {
                    return unsupported();
                };
                let Some(Generic {
                    kind,
                    value: Some(GenericValue::FromProperty { class, offset, to }),
                }) = r.generic.get(*i)
                else {
                    return unsupported();
                };
                if *kind != *class {
                    return unsupported();
                }
                properties.push(TransformFrom {
                    property: property(*class, 134)?,
                    offset: *offset,
                    to: to
                        .iter()
                        .map(|t| {
                            Ok(TransformTo {
                                property: property(t.class, 140)?,
                                offset: t.offset,
                                max: t.max,
                                scale: t.scale,
                            })
                        })
                        .collect::<Result<_>>()?,
                });
            }
            Ok(Constraint::Transform(TransformConstraint {
                name,
                source: index(Reader::field_reference(f, 3)?, bones)?,
                bones: bone_indices(r, f, 19, bones)?,
                local_source: flag(f, 27)?,
                local_target: flag(f, 28)?,
                additive: flag(f, 21)?,
                clamp: flag(f, 30)?,
                offsets: [
                    number(f, 14)?,
                    number(f, 6)?,
                    number(f, 7)?,
                    number(f, 16)?,
                    number(f, 17)?,
                    number(f, 18)?,
                ],
                mix: [
                    number(f, 8)?,
                    number(f, 4)?,
                    number(f, 23)?,
                    number(f, 10)?,
                    number(f, 25)?,
                    number(f, 12)?,
                ],
                properties,
                editor_ranges,
            }))
        }
        72 => {
            let mode = |tag| r.enum_value(Reader::field_reference(f, tag)?);
            Ok(Constraint::Path(PathConstraint {
                name,
                bones: bone_indices(r, f, 2, bones)?,
                slot: index(Reader::field_reference(f, 3)?, slots)?,
                position_mode: PathPositionMode::from_wire(mode(16)?)?,
                spacing_mode: PathSpacingMode::from_wire(mode(14)?)?,
                rotate_mode: PathRotateMode::from_wire(mode(15)?)?,
                rotation: number(f, 10)?,
                position: number(f, 4)?,
                spacing: number(f, 12)?,
                mix_rotate: number(f, 8)?,
                mix_x: number(f, 6)?,
                mix_y: number(f, 23)?,
            }))
        }
        121 => {
            let Some(Value::AngularBits(rotate)) = f.get(&7) else {
                return unsupported();
            };
            let angular = PhysicsAngular::from_wire_bits(*rotate, number(f, 9)?.to_bits())?;
            Ok(Constraint::Physics(PhysicsConstraint {
                name,
                bone: index(Reader::field_reference(f, 3)?, bones)?,
                x: number(f, 5)?,
                y: number(f, 6)?,
                scale_x: number(f, 8)?,
                angular,
                step: number(f, 4)?,
                inertia: number(f, 10)?,
                strength: number(f, 12)?,
                damping: number(f, 14)?,
                mass: number(f, 16)?,
                wind: number(f, 18)?,
                gravity: number(f, 20)?,
                mix: number(f, 23)?,
                limit: number(f, 33)?,
                globals: PhysicsGlobals {
                    inertia: flag(f, 25)?,
                    strength: flag(f, 26)?,
                    damping: flag(f, 27)?,
                    mass: flag(f, 28)?,
                    wind: flag(f, 29)?,
                    gravity: flag(f, 30)?,
                    mix: flag(f, 31)?,
                },
            }))
        }
        _ => unsupported(),
    }
}
fn animation_folders(
    r: &Reader<'_>,
    skeleton: &BTreeMap<u32, Value>,
    animations: &[Reference],
) -> Result<(Option<AnimationFolderLayout>, Vec<Reference>)> {
    use crate::minimal::scene::animation_folders::{FOLDER_GROUP_MODE, MAX_ANIMATION_FOLDERS};

    let root_ref = Reader::field_reference(skeleton, 37)?;
    let root = r.fields(root_ref, 108)?;
    let members = r.array(Reader::field_reference(root, 5)?)?;
    if Reader::field_reference(root, 3)? != Reference::Null
        || Reader::field_reference(root, 1)? != Reference::Null
        || members.len() > animations.len() + MAX_ANIMATION_FOLDERS
    {
        return unsupported();
    }
    let mut seen = vec![false; animations.len()];
    let mut clip_index = |clip, group| {
        let f = r.fields(clip, 18)?;
        let index = index(clip, animations)?;
        if Reader::field_reference(f, 7)? != group || std::mem::replace(&mut seen[index], true) {
            return unsupported();
        }
        Ok(index)
    };
    let mut entries = Vec::with_capacity(members.len());
    let mut folder_refs = Vec::new();
    for &member in members {
        let Reference::Domain(id) = member else {
            return unsupported();
        };
        match r.domain[id].class {
            18 => entries.push(AnimationFolderEntry::Clip(clip_index(member, root_ref)?)),
            108 => {
                if folder_refs.len() >= MAX_ANIMATION_FOLDERS || folder_refs.contains(&member) {
                    return unsupported();
                }
                let folder = r.fields(member, 108)?;
                if Reader::field_reference(folder, 3)? != root_ref
                    || uint(folder, 2)? != FOLDER_GROUP_MODE
                {
                    return unsupported();
                }
                let clips = r.array(Reader::field_reference(folder, 5)?)?;
                if clips.len() > animations.len() {
                    return unsupported();
                }
                entries.push(AnimationFolderEntry::Folder(AnimationFolder {
                    name: r.text(Reader::field_reference(folder, 1)?)?,
                    clips: clips
                        .iter()
                        .map(|&clip| clip_index(clip, member))
                        .collect::<Result<_>>()?,
                }));
                folder_refs.push(member);
            }
            _ => return unsupported(),
        }
    }
    if seen.iter().any(|present| !present) {
        return unsupported();
    }
    if folder_refs.is_empty() {
        return Ok((None, folder_refs));
    }
    if uint(root, 2)? != FOLDER_GROUP_MODE {
        return unsupported();
    }
    Ok((Some(AnimationFolderLayout { entries }), folder_refs))
}

fn read_graph(
    payload: &[u8],
    capture_mesh_sources: bool,
) -> Result<(Reader<'_>, Reference, [u8; 16])> {
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
    collect_schema(&crate::minimal::scene::schema_record(), &mut schema);
    for object in crate::minimal::scene::editor_metadata::schema_objects() {
        collect_object_schema(&object, &mut schema);
    }
    let project_schema = schema.get_mut(&0).ok_or(FormatError::UnsupportedProfile)?;
    project_schema.insert(4, FieldKind::Bool);
    project_schema.insert(13, FieldKind::String);
    project_schema.insert(42, FieldKind::UInt);
    schema
        .get_mut(&13)
        .ok_or(FormatError::UnsupportedProfile)?
        .insert(8, FieldKind::Object);
    let group_schema = schema
        .get_mut(&108)
        .ok_or(FormatError::UnsupportedProfile)?;
    group_schema.insert(1, FieldKind::String);
    group_schema.insert(3, FieldKind::Object);
    let mut r = Reader {
        bytes: payload,
        pos: 28,
        depth: 0,
        generic: vec![],
        domain: vec![],
        schema,
        project_field_order: vec![],
        alternate_record_order: vec![],
        mesh_source_ranges: capture_mesh_sources.then(HashMap::new),
        deform_coordinates: 0,
        string_fields: vec![],
        mesh_uv_limit: MAX_SCENE_MESH_VERTICES * 2,
        mesh_vertex_limit: MAX_SCENE_MESH_VERTICES,
        mesh_triangle_limit: MAX_SCENE_MESH_TRIANGLE_INDICES,
        mesh_edge_limit: MAX_SCENE_MESH_EDGE_INDICES,
        draw_order_limit: MAX_SCENE_SLOTS,
        string_encodings: HashMap::new(),
    };
    let root = r.domain(0)?;
    if r.bytes.get(r.pos..) != Some(&[1, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0][..]) {
        return unsupported();
    }
    Ok((r, root, identity))
}

/// Structural closure only: no semantic model extraction or recursive encoding.
pub(super) fn validate_structure(payload: &[u8]) -> Result<()> {
    read_graph(payload, false).map(|_| ())
}

struct ChainReferenceChange {
    leaf: Range<usize>,
    direct_source: Range<usize>,
}

#[derive(Default)]
struct ChainRecovery {
    change: Option<ChainReferenceChange>,
    encoded: Option<Vec<u8>>,
}

impl ChainRecovery {
    fn record(&mut self, reader: &Reader<'_>, leaf: Reference, middle: Reference) -> Result<()> {
        if self.change.is_some() {
            return unsupported();
        }
        let alias_range = |owner| {
            let Reference::Domain(owner) = owner else {
                return unsupported();
            };
            let range = reader
                .mesh_source_ranges
                .as_ref()
                .and_then(|ranges| ranges.get(&owner))
                .ok_or(FormatError::UnsupportedProfile)?;
            let bytes = reader
                .bytes
                .get(range.clone())
                .ok_or(FormatError::UnsupportedProfile)?;
            if bytes.first() != Some(&46) || !bytes.get(1).is_some_and(|value| *value >= 2) {
                return unsupported();
            }
            Ok(range.clone())
        };
        self.change = Some(ChainReferenceChange {
            leaf: alias_range(leaf)?,
            direct_source: alias_range(middle)?,
        });
        Ok(())
    }
}

fn verify_encoding(
    original: &[u8],
    encoded: Vec<u8>,
    recovery: Option<&mut ChainRecovery>,
) -> std::result::Result<(), ProfileRejection> {
    if let Some(recovery) = recovery {
        if let Some(change) = &recovery.change {
            // The middle's typed source field is an alias to the ordinary mesh.
            // Independent encoding must use exactly that alias on the leaf, with
            // every byte before and after its value reproduced verbatim.
            let direct_source = &original[change.direct_source.clone()];
            let new_end = change.leaf.start + direct_source.len();
            if encoded.get(..change.leaf.start) != original.get(..change.leaf.start)
                || encoded.get(change.leaf.start..new_end) != Some(direct_source)
                || encoded.get(new_end..) != original.get(change.leaf.end..)
            {
                return Err(ProfileRejection::UnsupportedStructure);
            }
            recovery.encoded = Some(encoded);
            return Ok(());
        }
    }
    if original == encoded {
        return Ok(());
    }
    Err(ProfileRejection::RoundtripMismatch {
        offset: first_difference(original, &encoded).expect("decoded payloads differ"),
    })
}

pub(super) fn decode_with_diagnostics(
    payload: &[u8],
) -> std::result::Result<SceneProject, ProfileDecodeError> {
    let mut rejection = ProfileRejection::UnsupportedStructure;
    decode_with_provenance(payload, false, &mut rejection, None)
        .map_err(|error| ProfileDecodeError { error, rejection })
}
pub(super) fn materialize(payload: &[u8]) -> Result<SceneWire> {
    decode_with_provenance(
        payload,
        true,
        &mut ProfileRejection::UnsupportedStructure,
        None,
    )?
    .wire
    .ok_or(FormatError::UnsupportedProfile)
}

pub(super) fn recover_direct_linked_mesh_chain(payload: &[u8]) -> Result<Option<Vec<u8>>> {
    let mut recovery = ChainRecovery::default();
    decode_with_provenance(
        payload,
        false,
        &mut ProfileRejection::UnsupportedStructure,
        Some(&mut recovery),
    )?;
    Ok(recovery.encoded)
}

fn decode_with_provenance(
    payload: &[u8],
    force_provenance: bool,
    rejection: &mut ProfileRejection,
    mut recovery: Option<&mut ChainRecovery>,
) -> Result<SceneProject> {
    let (r, root, identity) = read_graph(payload, recovery.is_some())?;
    let p = r.fields(root, 0)?;
    let skeletons = r.array(Reader::field_reference(p, 0)?)?;
    if skeletons.len() != 1 {
        return unsupported();
    }
    let s = r.fields(skeletons[0], 11)?;
    let bone_refs = r.array(Reader::field_reference(s, 4)?)?;
    let mut bones = vec![];
    for reference in bone_refs {
        let f = r.fields(*reference, 12)?;
        bones.push(Bone {
            name: r.text(Reader::field_reference(f, 1)?)?,
            parent: optional_index(Reader::field_reference(f, 3)?, bone_refs)?,
            x: number(f, 10)?,
            y: number(f, 11)?,
            rotation: number(f, 12)?,
            length: number(f, 9)?,
            scale_x: number(f, 13)?,
            scale_y: number(f, 14)?,
            shear_x: number(f, 23)?,
            shear_y: number(f, 25)?,
            color: r.color(Reader::field_reference(f, 17)?)?,
        });
    }
    let slot_refs = r.array(Reader::field_reference(s, 13)?)?;
    let attachment_refs = r.array(Reader::field_reference(s, 6)?)?;
    let mut slots = vec![];
    let mut attachment_order = vec![];
    let mut attachment_sequences = vec![];
    let mut attachment_colors = vec![];
    let mut slot_dark_colors = vec![];
    for slot_ref in slot_refs {
        let f = r.fields(*slot_ref, 13)?;
        let enabled = flag(f, 12)?;
        let color = r.color(Reader::field_reference(f, 11)?)?;
        if enabled || color != [0, 0, 0, 255] {
            slot_dark_colors.push(SlotDarkColor {
                slot: slots.len(),
                enabled,
                color,
            });
        }
        slots.push(SceneSlot {
            name: r.text(Reader::field_reference(f, 1)?)?,
            bone: index(Reader::field_reference(f, 2)?, bone_refs)?,
            color: r.color(Reader::field_reference(f, 5)?)?,
            blend: r.blend(Reader::field_reference(f, 7)?)?,
            attachments: vec![],
            active_attachment: None,
        });
    }
    let mut inventory_refs: Vec<Vec<Reference>> = vec![vec![]; slots.len()];
    for attachment_ref in attachment_refs {
        let (a, owner) = attachment(&r, *attachment_ref, bone_refs, slot_refs)?;
        let slot = index(owner, slot_refs)?;
        let local = slots[slot].attachments.len();
        let class = match &a {
            SceneAttachment::Region(_) => Some((43, 15)),
            SceneAttachment::Mesh(_) => Some((46, 36)),
            SceneAttachment::Clipping(_) | SceneAttachment::Path(_) => None,
        };
        if let Some((class, tag)) = class {
            let f = r.fields(*attachment_ref, class)?;
            let color = r.color(Reader::field_reference(
                f,
                if class == 43 { 14 } else { 31 },
            )?)?;
            if color != [255; 4] {
                attachment_colors.push(AttachmentColor {
                    attachment: AttachmentAddress {
                        slot,
                        attachment: local,
                    },
                    color,
                });
            }
            let reference = Reader::field_reference(f, tag)?;
            if reference != Reference::Null {
                let settings = r.fields(reference, 123)?;
                let positive = |tag| {
                    let raw = uint(settings, tag)?;
                    if raw & 1 != 0 {
                        return unsupported();
                    }
                    Ok(raw >> 1)
                };
                attachment_sequences.push(AttachmentSequence {
                    attachment: AttachmentAddress {
                        slot,
                        attachment: local,
                    },
                    settings: SequenceSettings {
                        start: positive(1)?,
                        count: positive(2)?,
                        digits: positive(3)?,
                        setup_index: positive(4)?,
                    },
                });
            }
        }
        slots[slot].attachments.push(a);
        inventory_refs[slot].push(*attachment_ref);
        attachment_order.push(AttachmentAddress {
            slot,
            attachment: local,
        });
    }
    for (i, slot_ref) in slot_refs.iter().enumerate() {
        let f = r.fields(*slot_ref, 13)?;
        slots[i].active_attachment =
            optional_index(Reader::field_reference(f, 9)?, &inventory_refs[i])?;
    }
    let mut linked_meshes = Vec::new();
    for (&reference, &address) in attachment_refs.iter().zip(&attachment_order) {
        if slots[address.slot].attachments[address.attachment]
            .mesh()
            .is_none()
        {
            continue;
        }
        let fields = r.fields(reference, 46)?;
        let source = Reader::field_reference(fields, 26)?;
        let inherit_timelines = flag(fields, 27)?;
        if source == Reference::Null {
            if inherit_timelines {
                return unsupported();
            }
            continue;
        }
        let declared_fields = r.fields(source, 46)?;
        let source_inherits = flag(declared_fields, 27)?;
        let upstream = Reader::field_reference(declared_fields, 26)?;
        let (source, source_fields) = if upstream == Reference::Null {
            if source_inherits {
                return unsupported();
            }
            (source, declared_fields)
        } else {
            let upstream_fields = r.fields(upstream, 46)?;
            if reference == source {
                return unsupported();
            }
            *rejection = ProfileRejection::LinkedMeshChain;
            let Some(recovery) = recovery.as_deref_mut() else {
                return unsupported();
            };
            if upstream == reference
                || upstream == source
                || Reader::field_reference(upstream_fields, 26)? != Reference::Null
                || flag(upstream_fields, 27)?
            {
                return unsupported();
            }
            index(source, attachment_refs)?;
            check_shared_mesh_geometry(&r, fields, declared_fields)?;
            recovery.record(&r, reference, source)?;
            (upstream, upstream_fields)
        };
        check_shared_mesh_geometry(&r, fields, source_fields)?;
        linked_meshes.push(LinkedMesh {
            attachment: address,
            source: attachment_order[index(source, attachment_refs)?],
            inherit_timelines,
        });
    }
    let group = r.fields(Reader::field_reference(s, 44)?, 108)?;
    let constraint_refs = r.array(Reader::field_reference(group, 5)?)?;
    let constraints = constraint_refs
        .iter()
        .rev()
        .map(|c| constraint(&r, *c, bone_refs, slot_refs))
        .collect::<Result<Vec<_>>>()?;
    let event_refs = r.array(Reader::field_reference(s, 10)?)?;
    let events = event_refs
        .iter()
        .map(|reference| {
            let f = r.fields(*reference, 35)?;
            if Reader::field_reference(f, 0)? != skeletons[0] || !flag(f, 7)? {
                return unsupported();
            }
            Ok(EventDefinition {
                name: r.text(Reader::field_reference(f, 2)?)?,
                int: ((uint(f, 3)? >> 1) as i32) ^ -((uint(f, 3)? & 1) as i32),
                float: number(f, 4)?,
                string: r.text(Reader::field_reference(f, 5)?)?,
                audio: r.text(Reader::field_reference(f, 6)?)?,
                volume: number(f, 8)?,
                balance: number(f, 9)?,
            })
        })
        .collect::<Result<Vec<_>>>()?;
    let constraint_order: Vec<_> = constraint_refs.iter().rev().copied().collect();
    let animation_refs = r.array(Reader::field_reference(s, 7)?)?;
    let (animation_folders, folder_refs) = animation_folders(&r, s, animation_refs)?;
    let mut animations = Vec::new();
    let mut layouts = Vec::new();
    for animation_ref in animation_refs {
        let f = r.fields(*animation_ref, 18)?;
        let Reference::Generic(split_index) = Reader::field_reference(f, 8)? else {
            return unsupported();
        };
        let Some(Generic {
            value: Some(GenericValue::SplitModes(rows)),
            ..
        }) = r.generic.get(split_index)
        else {
            return unsupported();
        };
        let split_modes = rows
            .iter()
            .map(|(owner, mode)| {
                if let Some(bone) = bone_refs.iter().position(|reference| reference == owner) {
                    Ok(SplitModeConfig::Bone(BoneSplitConfig {
                        bone,
                        mode: BoneSplitMode::from_wire(*mode)?,
                    }))
                } else {
                    Ok(SplitModeConfig::Slot(SlotSplitConfig {
                        slot: index(*owner, slot_refs)?,
                        mode: SlotSplitMode::from_wire(*mode)?,
                    }))
                }
            })
            .collect::<Result<Vec<_>>>()?;
        let mut groups = Vec::new();
        let mut tracks = Vec::new();
        let mut slot_tracks = Vec::new();
        let mut sequence_tracks = Vec::new();
        let mut draw_order = Vec::new();
        let mut deform_tracks = Vec::new();
        let mut constraint_tracks = Vec::new();
        let mut event_tracks = Vec::new();
        for track_ref in r.array(Reader::field_reference(f, 2)?)? {
            let t = r.fields(*track_ref, 19)?;
            let bone = optional_index(Reader::field_reference(t, 1)?, bone_refs)?;
            let kinds = r.array(Reader::field_reference(t, 2)?)?;
            let group_kind = match Reader::field_reference(t, 7)? {
                Reference::Generic(i) => match r.generic.get(i).and_then(|g| g.value.as_ref()) {
                    Some(GenericValue::Enum(v)) => *v,
                    _ => return unsupported(),
                },
                _ => return unsupported(),
            };
            let owner = match (bone, group_kind) {
                (Some(b), 2) => WireAnimationOwner::Bone(b),
                (None, 3) => WireAnimationOwner::Events,
                (None, 4) => WireAnimationOwner::DrawOrder,
                _ => return unsupported(),
            };
            let mut selectors = Vec::new();
            for kind_ref in kinds {
                let kind = r.fields(*kind_ref, 132)?;
                selectors.push(wire_track(
                    kind,
                    bone,
                    slot_refs,
                    &inventory_refs,
                    &constraint_order,
                    event_refs,
                )?);
                if matches!(kind.get(&0), Some(Value::UInt(22))) {
                    let target = Reader::field_reference(kind, 3)?;
                    let address = inventory_refs
                        .iter()
                        .enumerate()
                        .find_map(|(slot, refs)| {
                            refs.iter()
                                .position(|r| *r == target)
                                .map(|attachment| AttachmentAddress { slot, attachment })
                        })
                        .ok_or(FormatError::UnsupportedProfile)?;
                    if index(Reader::field_reference(kind, 2)?, slot_refs)? != address.slot
                        || Some(slots[address.slot].bone) != bone
                    {
                        return unsupported();
                    }
                    let Reference::Generic(i) = Reader::field_reference(kind, 1)? else {
                        return unsupported();
                    };
                    let Some(Generic {
                        value: Some(GenericValue::SequenceKeys(keys)),
                        ..
                    }) = r.generic.get(i)
                    else {
                        return unsupported();
                    };
                    sequence_tracks.push(SequenceTimeline {
                        attachment: address,
                        keys: keys.clone(),
                    });
                    continue;
                }
                if matches!(kind.get(&0), Some(Value::UInt(7..=12 | 23..=30))) {
                    let target = Reader::field_reference(kind, 2)?;
                    let Reference::Generic(key_index) = Reader::field_reference(kind, 1)? else {
                        return unsupported();
                    };
                    match r.generic.get(key_index).and_then(|g| g.value.as_ref()) {
                        Some(GenericValue::ConstraintKeys(track)) => {
                            let mut track = track.clone();
                            track.set_constraint(index(target, &constraint_order)?);
                            if Some(track.group_bone(&constraints, &slots)?) != bone {
                                return unsupported();
                            }
                            constraint_tracks.push(track);
                        }
                        Some(GenericValue::EventKeys(keys)) => {
                            if bone.is_some() {
                                return unsupported();
                            }
                            let event = index(target, event_refs)?;
                            let mut values = Vec::new();
                            for (frame, reference) in keys {
                                let f =
                                    r.fields(*reference, super::constraint_events::EVENT_VALUE)?;
                                if Reader::field_reference(f, 1)? != target {
                                    return unsupported();
                                }
                                values.push(EventKeyframe {
                                    frame: *frame,
                                    int: ((uint(f, 2)? >> 1) as i32) ^ -((uint(f, 2)? & 1) as i32),
                                    float: number(f, 3)?,
                                    string: r.text(Reader::field_reference(f, 4)?)?,
                                    volume: number(f, 5)?,
                                    balance: number(f, 6)?,
                                });
                            }
                            event_tracks.push(EventTimeline {
                                event,
                                keys: values,
                            });
                        }
                        _ => return unsupported(),
                    }
                    continue;
                }
                if matches!(kind.get(&0), Some(Value::UInt(4 | 5 | 20 | 21))) {
                    let slot = index(Reader::field_reference(kind, 2)?, slot_refs)?;
                    if Some(slots[slot].bone) != bone {
                        return unsupported();
                    }
                    let Reference::Generic(key_index) = Reader::field_reference(kind, 1)? else {
                        return unsupported();
                    };
                    match (kind.get(&0), r.generic.get(key_index)) {
                        (
                            Some(Value::UInt(4)),
                            Some(Generic {
                                value: Some(GenericValue::SlotRgbaKeys(keys)),
                                ..
                            }),
                        ) => {
                            slot_tracks.push(SlotTimeline::Rgba {
                                slot,
                                keys: keys.clone(),
                            });
                        }
                        (
                            Some(Value::UInt(20)),
                            Some(Generic {
                                value: Some(GenericValue::SlotRgb2Keys(keys)),
                                ..
                            }),
                        ) => {
                            slot_tracks.push(SlotTimeline::Rgb2 {
                                slot,
                                keys: keys.clone(),
                            });
                        }
                        (
                            Some(Value::UInt(21)),
                            Some(Generic {
                                value: Some(GenericValue::SlotAlphaKeys(keys)),
                                ..
                            }),
                        ) => {
                            slot_tracks.push(SlotTimeline::Alpha {
                                slot,
                                keys: keys.clone(),
                            });
                        }
                        (
                            Some(Value::UInt(5)),
                            Some(Generic {
                                value: Some(GenericValue::SlotAttachmentKeys(keys)),
                                ..
                            }),
                        ) => {
                            let keys = keys
                                .iter()
                                .map(|(frame, attachment)| {
                                    Ok(SlotAttachmentKey {
                                        frame: *frame,
                                        attachment: optional_index(
                                            *attachment,
                                            &inventory_refs[slot],
                                        )?,
                                    })
                                })
                                .collect::<Result<Vec<_>>>()?;
                            slot_tracks.push(SlotTimeline::Attachment { slot, keys });
                        }
                        _ => return unsupported(),
                    }
                    continue;
                }
                if matches!(kind.get(&0), Some(Value::UInt(6 | 13))) {
                    let Reference::Generic(key_index) = Reader::field_reference(kind, 1)? else {
                        return unsupported();
                    };
                    if matches!(kind.get(&0), Some(Value::UInt(13))) {
                        if bone.is_some() || !draw_order.is_empty() {
                            return unsupported();
                        }
                        let Some(Generic {
                            value: Some(GenericValue::DrawOrderKeys(keys)),
                            ..
                        }) = r.generic.get(key_index)
                        else {
                            return unsupported();
                        };
                        for (frame, rows) in keys {
                            let offsets = rows
                                .iter()
                                .map(|(slot, offset)| {
                                    Ok(SlotOffset {
                                        slot: index(*slot, slot_refs)?,
                                        offset: *offset,
                                    })
                                })
                                .collect::<Result<Vec<_>>>()?;
                            draw_order.push(DrawOrderKey {
                                frame: *frame,
                                offsets,
                            });
                        }
                    } else {
                        let target = Reader::field_reference(kind, 2)?;
                        let address = inventory_refs
                            .iter()
                            .enumerate()
                            .find_map(|(slot, inventory)| {
                                inventory
                                    .iter()
                                    .position(|r| *r == target)
                                    .map(|attachment| AttachmentAddress { slot, attachment })
                            })
                            .ok_or(FormatError::UnsupportedProfile)?;
                        if Some(slots[address.slot].bone) != bone {
                            return unsupported();
                        }
                        let Some(Generic {
                            value: Some(GenericValue::DeformKeys(keys)),
                            ..
                        }) = r.generic.get(key_index)
                        else {
                            return unsupported();
                        };
                        deform_tracks.push(DeformTimeline {
                            attachment: address,
                            keys: keys.clone(),
                        });
                    }
                    continue;
                }
                let Some(Value::UInt(raw_channel)) = kind.get(&0) else {
                    return unsupported();
                };
                let channel = BoneChannel::from_wire(*raw_channel)?;
                let Reference::Generic(key_index) = Reader::field_reference(kind, 1)? else {
                    return unsupported();
                };
                let Some(Generic {
                    value: Some(GenericValue::AnimationKeys(keys)),
                    ..
                }) = r.generic.get(key_index)
                else {
                    return unsupported();
                };
                tracks.push(BoneTimeline {
                    bone: bone.ok_or(FormatError::UnsupportedProfile)?,
                    channel,
                    keys: keys.clone(),
                });
            }
            groups.push(WireAnimationGroup {
                owner,
                tracks: selectors,
            });
        }
        layouts.push(WireAnimationLayout {
            animation: animations.len(),
            groups,
        });
        animations.push(Animation {
            split_modes,
            name: r.text(Reader::field_reference(f, 1)?)?,
            tracks,
            slot_tracks,
            sequence_tracks,
            draw_order,
            deform_tracks,
            constraint_tracks,
            event_tracks,
        });
    }
    let mut model = SceneProject {
        wire: None,
        rig: MinimalProject {
            name: r.text(Reader::field_reference(s, 1)?)?,
            identity,
            bones,
        },
        images_root: r.text(Reader::field_reference(s, 3)?)?,
        audio_root: r.text(Reader::field_reference(s, 34)?)?,
        events,
        editor_flag_53: flag(s, 53)?,
        slots,
        attachment_order,
        attachment_sequences,
        attachment_colors,
        linked_meshes,
        slot_dark_colors,
        constraints,
        animation_folders,
        animations,
        fps: number(p, 2)?,
    };
    if !force_provenance
        && encode_scene_payload(&model)
            .is_ok_and(|encoded| verify_encoding(payload, encoded, recovery.as_deref_mut()).is_ok())
    {
        return Ok(model);
    }
    let mut owners = vec![
        (root, WireStringOwner::Project),
        (skeletons[0], WireStringOwner::Skeleton),
    ];
    owners.extend(
        bone_refs
            .iter()
            .enumerate()
            .map(|(i, r)| (*r, WireStringOwner::Bone(i))),
    );
    owners.extend(
        slot_refs
            .iter()
            .enumerate()
            .map(|(i, r)| (*r, WireStringOwner::Slot(i))),
    );
    for (slot, refs) in inventory_refs.iter().enumerate() {
        owners.extend(refs.iter().enumerate().map(|(attachment, r)| {
            (
                *r,
                WireStringOwner::Attachment(AttachmentAddress { slot, attachment }),
            )
        }));
    }
    owners.extend(
        constraint_order
            .iter()
            .enumerate()
            .map(|(i, r)| (*r, WireStringOwner::Constraint(i))),
    );
    owners.extend(
        event_refs
            .iter()
            .enumerate()
            .map(|(i, r)| (*r, WireStringOwner::Event(i))),
    );
    owners.extend(
        animation_refs
            .iter()
            .enumerate()
            .map(|(i, r)| (*r, WireStringOwner::Animation(i))),
    );
    owners.extend(
        folder_refs
            .iter()
            .enumerate()
            .map(|(i, r)| (*r, WireStringOwner::AnimationFolder(i))),
    );
    let mut strings = Vec::new();
    for (reference, tag, alias) in &r.string_fields {
        if let (Some((_, owner)), Reference::Generic(alias)) =
            (owners.iter().find(|(r, _)| r == reference), alias)
        {
            strings.push(WireStringAlias {
                owner: owner.clone(),
                tag: *tag,
                group: *alias as u32,
                encoding: if let Some(form) = r.string_encodings.get(alias) {
                    Some(WireStringEncoding {
                        form: *form,
                        source_text: r.text(Reference::Generic(*alias))?,
                    })
                } else {
                    None
                },
            });
        }
    }
    let zero_size_meshes = model
        .slots
        .iter()
        .enumerate()
        .flat_map(|(slot, s)| {
            s.attachments
                .iter()
                .enumerate()
                .filter_map(move |(attachment, a)| match a {
                    SceneAttachment::Mesh(m) if m.image.width == 0. || m.image.height == 0. => {
                        Some(AttachmentAddress { slot, attachment })
                    }
                    _ => None,
                })
        })
        .collect();
    let skeleton_bounds_24 = r
        .float_list(Reader::field_reference(s, 24)?)?
        .iter()
        .copied()
        .map(FiniteF32::new)
        .collect::<Result<Vec<_>>>()?
        .try_into()
        .map_err(|_| FormatError::UnsupportedProfile)?;
    let declarations = |tag| {
        r.array(Reader::field_reference(s, tag)?)?
            .iter()
            .map(|v| index(*v, &constraint_order))
            .collect::<Result<Vec<_>>>()
    };
    let editor_metadata = super::editor_metadata::read(&r, p, s)?;
    let mut slot_references_8 = Vec::new();
    for (slot, reference) in slot_refs.iter().enumerate() {
        let fields = r.fields(*reference, 13)?;
        if let Some(attachment) =
            optional_index(Reader::field_reference(fields, 8)?, &inventory_refs[slot])?
        {
            slot_references_8.push(AttachmentAddress { slot, attachment });
        }
    }
    strings.retain(|s| !(s.owner == WireStringOwner::Project && s.tag == 13));
    let source_state = super::source_state::read(
        &r,
        p,
        s,
        bone_refs,
        slot_refs,
        &inventory_refs,
        &constraint_order,
        animation_refs,
        model.animation_folders.is_some(),
    )?;
    model.wire = Some(SceneWire {
        source_state,
        slot_references_8,
        editor_metadata,
        constraint_declarations: Some(WireConstraintDeclarations {
            ik: declarations(16)?,
            transform: declarations(22)?,
            path: declarations(23)?,
            physics: declarations(41)?,
        }),
        skeleton_bounds_24,
        editor_scalar_46: FiniteF32::new(number(s, 46)?)?,
        strings,
        zero_size_meshes,
        animation_layouts: layouts,
    });
    if force_provenance {
        super::super::scene::wire::normalize_wire_metadata(&mut model)?;
    } else {
        normalize_wire_strings(&mut model)?;
    }
    if let Err(reason) = verify_encoding(payload, encode_scene_payload(&model)?, recovery) {
        *rejection = reason;
        return unsupported();
    }
    Ok(model)
}

fn check_shared_mesh_geometry(
    reader: &Reader<'_>,
    child: &BTreeMap<u32, Value>,
    source: &BTreeMap<u32, Value>,
) -> Result<()> {
    for tag in [8, 12, 13] {
        if Reader::field_reference(child, tag)? != Reader::field_reference(source, tag)? {
            return unsupported();
        }
    }
    let child = reader.fields(Reader::field_reference(child, 28)?, 71)?;
    let source = reader.fields(Reader::field_reference(source, 28)?, 71)?;
    for tag in [1, 2] {
        if Reader::field_reference(child, tag)? != Reader::field_reference(source, tag)? {
            return unsupported();
        }
    }
    Ok(())
}

fn wire_track(
    kind: &BTreeMap<u32, Value>,
    bone: Option<usize>,
    slots: &[Reference],
    inventory: &[Vec<Reference>],
    constraints: &[Reference],
    events: &[Reference],
) -> Result<WireTrack> {
    let channel = uint(kind, 0)?;
    if matches!(channel,0..=3|14..=17) {
        return Ok(WireTrack::Bone {
            bone: bone.ok_or(FormatError::UnsupportedProfile)?,
            channel: BoneChannel::from_wire(channel)?,
        });
    }
    let target = Reader::field_reference(kind, 2).unwrap_or(Reference::Null);
    Ok(match channel {
        4 | 5 | 20 | 21 => WireTrack::Slot {
            slot: index(target, slots)?,
            channel: match channel {
                4 => WireSlotChannel::Rgba,
                5 => WireSlotChannel::Attachment,
                20 => WireSlotChannel::Rgb2,
                21 => WireSlotChannel::Alpha,
                _ => unreachable!(),
            },
        },
        6 => WireTrack::Deform {
            attachment: inventory
                .iter()
                .enumerate()
                .find_map(|(slot, refs)| {
                    refs.iter()
                        .position(|r| *r == target)
                        .map(|attachment| AttachmentAddress { slot, attachment })
                })
                .ok_or(FormatError::UnsupportedProfile)?,
        },
        7..=11 | 23..=30 => WireTrack::Constraint {
            constraint: index(target, constraints)?,
            channel: match channel {
                7 => WireConstraintChannel::Ik,
                8 => WireConstraintChannel::TransformMix,
                9 => WireConstraintChannel::PathPosition,
                10 => WireConstraintChannel::PathSpacing,
                11 => WireConstraintChannel::PathMix,
                30 => WireConstraintChannel::PhysicsReset,
                _ => WireConstraintChannel::Physics(PhysicsProperty::ALL[(channel - 23) as usize]),
            },
        },
        22 => {
            let target = Reader::field_reference(kind, 3)?;
            WireTrack::Sequence {
                attachment: inventory
                    .iter()
                    .enumerate()
                    .find_map(|(slot, refs)| {
                        refs.iter()
                            .position(|r| *r == target)
                            .map(|attachment| AttachmentAddress { slot, attachment })
                    })
                    .ok_or(FormatError::UnsupportedProfile)?,
            }
        }
        12 => WireTrack::Event {
            event: index(target, events)?,
        },
        13 => WireTrack::DrawOrder,
        _ => return unsupported(),
    })
}

#[cfg(test)]
#[test]
fn repairs_only_the_single_proven_leaf_source_alias() {
    let mut scene = SceneProject::from(&RegionProject {
        rig: MinimalProject::new("chain proof".into(), [11; 16]),
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    });
    for name in ["source", "middle", "leaf"] {
        let mut mesh = super::super::meshes::quad(
            Region {
                name: name.into(),
                path: String::new(),
                x: 0.,
                y: 0.,
                rotation: 0.,
                scale_x: 1.,
                scale_y: 1.,
                width: 16.,
                height: 12.,
            },
            0,
        );
        mesh.weighted = true;
        scene.attachment_order.push(AttachmentAddress {
            slot: scene.slots.len(),
            attachment: 0,
        });
        scene.slots.push(SceneSlot {
            name: format!("{name} slot"),
            bone: 0,
            color: [255; 4],
            blend: BlendMode::Normal,
            active_attachment: Some(0),
            attachments: vec![SceneAttachment::Mesh(Box::new(mesh))],
        });
    }
    let source = scene.attachment_order[0];
    let middle = scene.attachment_order[1];
    let leaf = scene.attachment_order[2];
    scene.linked_meshes = vec![
        LinkedMesh {
            attachment: middle,
            source,
            inherit_timelines: false,
        },
        LinkedMesh {
            attachment: leaf,
            source,
            inherit_timelines: true,
        },
    ];
    // In the canonical field order Deform records precede attachment inventory.
    // Define the root before the middle so both source fields are aliases.
    scene.animations[0].deform_tracks = [(source, 0.25), (middle, 0.125)]
        .into_iter()
        .map(|(attachment, offset)| DeformTimeline {
            attachment,
            keys: vec![DeformKey {
                frame: 5.,
                offsets: vec![offset; 8],
                data_present: true,
                curve: DeformCurve::Linear,
            }],
        })
        .collect();
    let flat = encode_scene_payload(&scene).unwrap();
    assert!(recover_direct_linked_mesh_chain(&flat).unwrap().is_none());
    let (reader, _, _) = read_graph(&flat, true).unwrap();
    let mesh = |name: &str| {
        reader
            .domain
            .iter()
            .enumerate()
            .find_map(|(id, record)| {
                if record.class != 46 {
                    return None;
                }
                let reference = Reader::field_reference(record.fields.as_ref()?, 1).ok()?;
                (reader.text(reference).ok()? == name).then_some(id)
            })
            .unwrap()
    };
    let ranges = reader.mesh_source_ranges.as_ref().unwrap();
    assert_eq!(ranges[&mesh("middle")].len(), 2);
    let span = ranges[&mesh("leaf")].clone();
    assert_eq!(span.len(), 2);
    let middle_alias = u8::try_from(mesh("middle") + 2).unwrap();
    assert!(middle_alias < 128);
    let mut chained = flat.clone();
    chained[span.start + 1] = middle_alias;
    assert_eq!(
        decode_with_diagnostics(&chained).unwrap_err().rejection,
        ProfileRejection::LinkedMeshChain
    );
    let recovered = recover_direct_linked_mesh_chain(&chained).unwrap().unwrap();
    assert_eq!(recovered, flat);
    assert_eq!(decode_with_diagnostics(&recovered).unwrap(), scene);

    // Project tag 17 is structurally understood but outside the editable model.
    // Changing it on an otherwise identical chain must defeat full-payload proof.
    let other = chained[..100]
        .windows(5)
        .position(|bytes| bytes == [17, 0x3f, 0x80, 0, 0])
        .unwrap();
    chained[other + 1..other + 5].copy_from_slice(&2_f32.to_be_bytes());
    assert!(recover_direct_linked_mesh_chain(&chained).is_err());
}
