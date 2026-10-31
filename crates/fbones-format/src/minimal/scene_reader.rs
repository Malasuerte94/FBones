//! Scene decoding shares the bounded grammar; the typed model remains subject
//! to exact, complete reserialization through the independent scene writer.
use super::*;
use crate::minimal::scene::*;
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
fn constraint(r: &Reader<'_>, reference: Reference, bones: &[Reference]) -> Result<Constraint> {
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
pub(super) fn decode(payload: &[u8]) -> Result<SceneProject> {
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
    let mut r = Reader {
        bytes: payload,
        pos: 28,
        depth: 0,
        generic: vec![],
        domain: vec![],
        schema,
        deform_coordinates: 0,
    };
    let root = r.domain(0)?;
    if r.bytes.get(r.pos..) != Some(&[1, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0][..]) {
        return unsupported();
    }
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
    for slot_ref in slot_refs {
        let f = r.fields(*slot_ref, 13)?;
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
    let group = r.fields(Reader::field_reference(s, 44)?, 108)?;
    let constraint_refs = r.array(Reader::field_reference(group, 5)?)?;
    let constraints = constraint_refs
        .iter()
        .rev()
        .map(|c| constraint(&r, *c, bone_refs))
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
    let mut animations = Vec::new();
    for animation_ref in r.array(Reader::field_reference(s, 7)?)? {
        let f = r.fields(*animation_ref, 18)?;
        let mut tracks = Vec::new();
        let mut slot_tracks = Vec::new();
        let mut draw_order = Vec::new();
        let mut deform_tracks = Vec::new();
        let mut constraint_tracks = Vec::new();
        let mut event_tracks = Vec::new();
        for track_ref in r.array(Reader::field_reference(f, 2)?)? {
            let t = r.fields(*track_ref, 19)?;
            let bone = optional_index(Reader::field_reference(t, 1)?, bone_refs)?;
            let kinds = r.array(Reader::field_reference(t, 2)?)?;
            for kind_ref in kinds {
                let kind = r.fields(*kind_ref, 132)?;
                if matches!(kind.get(&0), Some(Value::UInt(7 | 8 | 12 | 23..=30))) {
                    let target = Reader::field_reference(kind, 2)?;
                    let Reference::Generic(key_index) = Reader::field_reference(kind, 1)? else {
                        return unsupported();
                    };
                    match r.generic.get(key_index).and_then(|g| g.value.as_ref()) {
                        Some(GenericValue::ConstraintKeys(track)) => {
                            let c = index(target, &constraint_order)?;
                            let expected = match &constraints[c] {
                                Constraint::Ik(v) => v.target,
                                Constraint::Transform(v) => v.source,
                                Constraint::Physics(v) => v.bone,
                            };
                            if Some(expected) != bone {
                                return unsupported();
                            }
                            let mut track = track.clone();
                            match &mut track {
                                ConstraintTimeline::Ik { constraint, .. }
                                | ConstraintTimeline::TransformMix { constraint, .. }
                                | ConstraintTimeline::Physics { constraint, .. }
                                | ConstraintTimeline::PhysicsReset { constraint, .. } => {
                                    *constraint = c
                                }
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
                if matches!(kind.get(&0), Some(Value::UInt(4 | 5))) {
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
                let channel = match kind.get(&0) {
                    Some(Value::UInt(0)) => BoneChannel::Rotate,
                    Some(Value::UInt(1)) => BoneChannel::Translate,
                    Some(Value::UInt(2)) => BoneChannel::Scale,
                    Some(Value::UInt(3)) => BoneChannel::Shear,
                    _ => return unsupported(),
                };
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
        }
        animations.push(Animation {
            name: r.text(Reader::field_reference(f, 1)?)?,
            tracks,
            slot_tracks,
            draw_order,
            deform_tracks,
            constraint_tracks,
            event_tracks,
        });
    }
    let model = SceneProject {
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
        constraints,
        animations,
        fps: number(p, 2)?,
    };
    if encode_scene_payload(&model)? != payload {
        return unsupported();
    }
    Ok(model)
}
