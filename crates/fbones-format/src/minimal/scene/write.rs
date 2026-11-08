use super::super::{empty, group, object, text, Field, Object, Record, ToPropertyWire};
use super::*;
use std::string::String;
use Field::*;
fn attachment_label(a: AttachmentAddress) -> String {
    format!("attachment-{}-{}", a.slot, a.attachment)
}
fn constraint_label(i: usize) -> String {
    format!("constraint-{i}")
}
fn set(record: &mut Record, tag: u32, value: Field) {
    record.fields.iter_mut().find(|(t, _)| *t == tag).unwrap().1 = value;
}
pub(super) fn project_record(p: &SceneProject) -> Record {
    let mut root = super::super::project_record_with_regions(&p.rig, &[], &[], &p.images_root);
    set(&mut root, 2, Float(p.fps));
    let Field::Value(Object::Array(skeletons)) =
        &mut root.fields.iter_mut().find(|(tag, _)| *tag == 0).unwrap().1
    else {
        unreachable!()
    };
    let Object::Record(s) = &mut skeletons[0] else {
        unreachable!()
    };
    set(s, 34, text(&p.audio_root));
    set(s, 53, Bool(p.editor_flag_53));
    if let Some(wire) = &p.wire {
        set(s, 46, Float(wire.editor_scalar_46.get()));
        set(
            s,
            24,
            FloatArray(wire.skeleton_bounds_24.map(FiniteF32::get).to_vec()),
        );
    }
    set(s, 10, object(Object::Array(event_records(p))));
    if !p.events.is_empty() {
        set(s, 40, object(Object::Link(108, "event-group".into())));
    }
    set(
        s,
        7,
        object(Object::Array(super::animation::records(
            &p.animations,
            &p.slots,
            p,
        ))),
    );
    set(s, 13, object(Object::Array(slot_records(p))));
    set(
        s,
        45,
        object(if p.slots.is_empty() {
            group(None, vec![])
        } else {
            Object::Link(108, "slot-group".into())
        }),
    );
    set(
        s,
        6,
        object(Object::Array(
            p.attachment_order
                .iter()
                .map(|a| attachment(p, *a))
                .collect(),
        )),
    );
    let canonical = canonical_constraint_declarations(p);
    let declarations = p
        .wire
        .as_ref()
        .and_then(|w| w.constraint_declarations.as_ref())
        .unwrap_or(&canonical);
    for (tag, indices) in [
        (16, &declarations.ik),
        (22, &declarations.transform),
        (41, &declarations.physics),
    ] {
        set(
            s,
            tag,
            object(Object::Array(
                indices
                    .iter()
                    .map(|i| constraint(&p.constraints[*i], *i))
                    .collect(),
            )),
        );
    }
    set(
        s,
        44,
        object(if p.constraints.is_empty() {
            group(None, vec![])
        } else {
            group(
                Some("constraint-group"),
                p.constraints
                    .iter()
                    .enumerate()
                    .rev()
                    .map(|(i, c)| Object::Link(c.class(), constraint_label(i)))
                    .collect(),
            )
        }),
    );
    if let Some(metadata) = p.wire.as_ref().and_then(|w| w.editor_metadata.as_ref()) {
        metadata.apply(&mut root);
    }
    if let Some(state) = p.wire.as_ref().and_then(|w| w.source_state.as_ref()) {
        state.apply(&mut root);
    }
    super::wire::apply_strings(p, &mut root);
    root
}
fn slot_records(p: &SceneProject) -> Vec<Object> {
    p.slots
        .iter()
        .enumerate()
        .map(|(i, s)| {
            let slot_group = if i == 0 {
                group(
                    Some("slot-group"),
                    (0..p.slots.len())
                        .map(|j| Object::Link(13, format!("slot-{j}")))
                        .collect(),
                )
            } else {
                Object::Link(108, "slot-group".into())
            };
            let active = s.active_attachment.map_or(Object::Null, |a| {
                Object::Link(
                    s.attachments[a].class(),
                    attachment_label(AttachmentAddress {
                        slot: i,
                        attachment: a,
                    }),
                )
            });
            Object::Record(Record {
                class: 13,
                label: Some(format!("slot-{i}")),
                fields: vec![
                    (1, text(&s.name)),
                    (5, object(Object::Color(s.color))),
                    (2, DomainLink(12, format!("bone-{}", s.bone))),
                    (16, object(slot_group)),
                    (12, Bool(p.slot_dark_color(i).enabled)),
                    (14, Enum(3, "slot-mode-14")),
                    (9, object(active)),
                    (15, Float(1.0 / 12.0)),
                    (13, Bool(true)),
                    (3, UInt(1)),
                    (
                        8,
                        object(
                            p.wire
                                .as_ref()
                                .and_then(|w| w.slot_references_8.iter().find(|a| a.slot == i))
                                .map_or(Object::Null, |address| {
                                    Object::Link(
                                        s.attachments[address.attachment].class(),
                                        attachment_label(*address),
                                    )
                                }),
                        ),
                    ),
                    (7, Enum(s.blend.wire(), s.blend.reference_label())),
                    (0, DomainLink(11, "skeleton".into())),
                    (11, object(Object::Color(p.slot_dark_color(i).color))),
                    (126, UInt(0)),
                ],
            })
        })
        .collect()
}
fn sequence_field(p: &SceneProject, address: AttachmentAddress) -> Field {
    object(match p.sequence(address) {
        None => Object::Null,
        Some(s) => Object::Record(Record {
            class: 123,
            label: None,
            fields: vec![
                (4, UInt(s.setup_index << 1)),
                (2, UInt(s.count << 1)),
                (3, UInt(s.digits << 1)),
                (1, UInt(s.start << 1)),
            ],
        }),
    })
}
fn attachment(p: &SceneProject, address: AttachmentAddress) -> Object {
    let label = attachment_label(address);
    match &p.slots[address.slot].attachments[address.attachment] {
        SceneAttachment::Mesh(m) => {
            let Object::Record(mut record) =
                super::super::meshes::record_named(m, address.slot, label)
            else {
                unreachable!()
            };
            set(&mut record, 36, sequence_field(p, address));
            set(
                &mut record,
                31,
                object(Object::Color(p.attachment_color(address))),
            );
            Object::Record(record)
        }
        SceneAttachment::Region(r) => Object::Record(Record {
            class: 43,
            label: Some(label),
            fields: vec![
                (10, Float(r.rotation)),
                (15, sequence_field(p, address)),
                (11, Float(r.width)),
                (8, Float(r.scale_x)),
                (9, Float(r.scale_y)),
                (14, object(Object::Color(p.attachment_color(address)))),
                (6, Float(r.x)),
                (13, text(&r.path)),
                (12, Float(r.height)),
                (7, Float(r.y)),
                (1, text(&r.name)),
                (32, Bool(false)),
                (5, Bool(true)),
                (0, DomainLink(13, format!("slot-{}", address.slot))),
                (4, UInt(0)),
                (33, Bool(true)),
                (35, Bool(false)),
            ],
        }),
        SceneAttachment::Clipping(c) => {
            let vertices = c
                .vertices
                .iter()
                .map(|v| {
                    Object::Record(Record {
                        class: 54,
                        label: None,
                        fields: vec![
                            (0, object(Object::FloatList(v.weights.clone()))),
                            (1, object(Object::FloatList(v.positions.clone()))),
                        ],
                    })
                })
                .collect();
            let binding = Object::Record(Record {
                class: 53,
                label: None,
                fields: vec![
                    (0, object(Object::Link(84, label.clone()))),
                    (2, object(Object::Array(vertices))),
                    (
                        1,
                        object(Object::Array(
                            c.bones
                                .iter()
                                .map(|i| Object::Link(12, format!("bone-{i}")))
                                .collect(),
                        )),
                    ),
                ],
            });
            Object::Record(Record {
                class: 84,
                label: Some(label),
                fields: vec![
                    (13, Bool(c.convex)),
                    (
                        12,
                        c.end_slot
                            .map_or(NullDomainLink(13), |i| DomainLink(13, format!("slot-{i}"))),
                    ),
                    (14, Bool(c.inverse)),
                    (30, Bool(c.weighted)),
                    (20, Float(1.0)),
                    (21, Float(1.0)),
                    (8, object(Object::IntList(c.edges.clone()))),
                    (31, object(Object::Color(c.color))),
                    (28, object(binding)),
                    (7, UInt(c.vertices.len() as u32 * 4)),
                    (19, Float(0.0)),
                    (37, UInt(8)),
                    (1, text(&c.name)),
                    (32, Bool(false)),
                    (5, Bool(true)),
                    (0, DomainLink(13, format!("slot-{}", address.slot))),
                    (4, UInt(0)),
                    (33, Bool(true)),
                    (35, Bool(false)),
                ],
            })
        }
    }
}
fn bones(values: &[usize]) -> Field {
    object(Object::Array(
        values
            .iter()
            .map(|i| Object::Link(12, format!("bone-{i}")))
            .collect(),
    ))
}
fn common(name: &str) -> Vec<(u32, Field)> {
    vec![
        (34, Bool(true)),
        (22, empty()),
        (0, DomainLink(11, "skeleton".into())),
        (1, text(name)),
        (32, object(Object::Link(108, "constraint-group".into()))),
    ]
}
fn constraint(c: &Constraint, index: usize) -> Object {
    let mut fields = match c {
        Constraint::Ik(c) => vec![
            (14, Float(c.softness)),
            (17, UInt(0)),
            (18, Enum(1, "constraint-scale-y-mode")),
            (11, Bool(c.compress)),
            (12, Bool(false)),
            (6, Float(0.0)),
            (15, Float(0.0)),
            (3, DomainLink(12, format!("bone-{}", c.target))),
            (2, bones(&c.bones)),
            (5, Float(c.mix)),
            (16, Bool(c.bend_positive)),
            (10, UInt(0)),
            (9, Bool(c.stretch)),
        ],
        Constraint::Transform(c) => vec![
            (11, Float(0.0)),
            (15, UInt(0)),
            (3, DomainLink(12, format!("bone-{}", c.source))),
            (24, Float(0.0)),
            (13, Float(0.0)),
            (21, Bool(c.additive)),
            (27, Bool(c.local_source)),
            (28, Bool(c.local_target)),
            (26, Float(0.0)),
            (
                31,
                NullableFloats(c.editor_range_bits().map(|cell| cell.map(f32::from_bits))),
            ),
            (10, Float(c.mix[3])),
            (18, Float(c.offsets[5])),
            (17, Float(c.offsets[4])),
            (6, Float(c.offsets[1])),
            (
                29,
                object(Object::Array(
                    c.properties
                        .iter()
                        .map(|from| Object::FromProperty {
                            class: 134 + from.property.index() as u32,
                            offset: from.offset,
                            to: from
                                .to
                                .iter()
                                .map(|to| ToPropertyWire {
                                    class: 140 + to.property.index() as u32,
                                    offset: to.offset,
                                    max: to.max,
                                    scale: to.scale,
                                })
                                .collect(),
                        })
                        .collect(),
                )),
            ),
            (9, Float(0.0)),
            (8, Float(c.mix[0])),
            (5, Float(0.0)),
            (23, Float(c.mix[2])),
            (14, Float(c.offsets[0])),
            (25, Float(c.mix[4])),
            (16, Float(c.offsets[3])),
            (19, bones(&c.bones)),
            (30, Bool(c.clamp)),
            (12, Float(c.mix[5])),
            (7, Float(c.offsets[2])),
            (4, Float(c.mix[1])),
        ],
        Constraint::Physics(c) => {
            let (rotate, shear) = c.angular.wire_bits();
            let g = c.globals;
            vec![
                (25, Bool(g.inertia)),
                (10, Float(c.inertia)),
                (6, Float(c.y)),
                (4, Float(c.step)),
                (18, Float(c.wind)),
                (14, Float(c.damping)),
                (21, Float(0.0)),
                (13, Float(0.0)),
                (27, Bool(g.damping)),
                (23, Float(c.mix)),
                (20, Float(c.gravity)),
                (12, Float(c.strength)),
                (35, Enum(1, "constraint-scale-y-mode")),
                (24, Float(0.0)),
                (15, Float(0.0)),
                (11, Float(0.0)),
                (28, Bool(g.mass)),
                (17, Float(0.0)),
                (29, Bool(g.wind)),
                (9, Float(f32::from_bits(shear))),
                (26, Bool(g.strength)),
                (19, Float(0.0)),
                (33, Float(c.limit)),
                (31, Bool(g.mix)),
                (7, AngularBits(rotate)),
                (3, DomainLink(12, format!("bone-{}", c.bone))),
                (16, Float(c.mass)),
                (5, Float(c.x)),
                (30, Bool(g.gravity)),
                (8, Float(c.scale_x)),
            ]
        }
    };
    fields.extend(common(c.name()));
    Object::Record(Record {
        class: c.class(),
        label: Some(constraint_label(index)),
        fields,
    })
}

/// Schema fixture is built from our typed values, never from an original file.
pub(super) fn schema_record() -> Record {
    let rig = MinimalProject::new("profile".into(), [0; 16]);
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
    let clipping = Clipping {
        name: "mask".into(),
        end_slot: Some(0),
        convex: true,
        inverse: false,
        color: [255; 4],
        weighted: false,
        bones: vec![0],
        vertices: vec![
            Vertex {
                weights: vec![1.0],
                positions: vec![0.0, 0.0]
            };
            3
        ],
        edges: vec![0, 1, 1, 2, 0, 2],
    };
    let p = SceneProject {
        wire: None,
        attachment_colors: vec![],
        slot_dark_colors: vec![],
        attachment_sequences: vec![AttachmentSequence {
            attachment: AttachmentAddress {
                slot: 0,
                attachment: 0,
            },
            settings: SequenceSettings {
                start: 0,
                count: 3,
                digits: 2,
                setup_index: 1,
            },
        }],
        rig,
        images_root: "./images/".into(),
        audio_root: "./audio".into(),
        events: vec![EventDefinition {
            name: "event".into(),
            int: 0,
            float: 0.,
            string: String::new(),
            audio: String::new(),
            volume: 0.,
            balance: 0.,
        }],
        editor_flag_53: false,
        slots: vec![SceneSlot {
            name: "slot".into(),
            bone: 0,
            color: [255; 4],
            blend: BlendMode::Normal,
            active_attachment: Some(0),
            attachments: vec![
                SceneAttachment::Region(image.clone()),
                SceneAttachment::Mesh(Box::new(super::super::meshes::quad(image, 0))),
                SceneAttachment::Clipping(clipping),
            ],
        }],
        attachment_order: (0..3)
            .map(|attachment| AttachmentAddress {
                slot: 0,
                attachment,
            })
            .collect(),
        fps: 30.0,
        animations: vec![Animation {
            split_modes: Vec::new(),
            slot_tracks: vec![],
            sequence_tracks: vec![],
            draw_order: vec![DrawOrderKey {
                frame: 0.,
                offsets: vec![SlotOffset { slot: 0, offset: 0 }],
            }],
            deform_tracks: vec![],
            constraint_tracks: vec![],
            event_tracks: vec![],
            name: "animation".into(),
            tracks: vec![BoneTimeline {
                bone: 0,
                channel: BoneChannel::Translate,
                keys: vec![BoneKeyframe {
                    frame: 0.,
                    values: [0., 0.],
                    curve: KeyCurve::Linear,
                }],
            }],
        }],
        constraints: vec![
            Constraint::Ik(IkConstraint::new("ik".into(), vec![0], 0)),
            Constraint::Transform(TransformConstraint::new("transform".into(), vec![0], 0)),
            Constraint::Physics(PhysicsConstraint::new("physics".into(), 0)),
        ],
    };
    project_record(&p)
}

fn event_records(p: &SceneProject) -> Vec<Object> {
    p.events
        .iter()
        .enumerate()
        .map(|(i, e)| {
            Object::Record(Record {
                class: 35,
                label: Some(format!("event-{i}")),
                fields: vec![
                    (
                        10,
                        object(if i == 0 {
                            group(
                                Some("event-group"),
                                (0..p.events.len())
                                    .map(|j| Object::Link(35, format!("event-{j}")))
                                    .collect(),
                            )
                        } else {
                            Object::Link(108, "event-group".into())
                        }),
                    ),
                    (4, Float(e.float)),
                    (7, Bool(true)),
                    (3, UInt(((e.int as u32) << 1) ^ ((e.int >> 31) as u32))),
                    (0, DomainLink(11, "skeleton".into())),
                    (8, Float(e.volume)),
                    (9, Float(e.balance)),
                    (2, text(&e.name)),
                    (6, text(&e.audio)),
                    (
                        5,
                        EventString(e.string.clone(), format!("event-default-string-{i}")),
                    ),
                ],
            })
        })
        .collect()
}
