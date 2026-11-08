use super::*;
use crate::minimal::{
    regions::{Attachment, BlendMode, Region, RegionProject, Slot},
    Bone, MinimalProject,
};
fn fixture() -> SceneProject {
    let mut rig = MinimalProject::new("own ordinary sequences".into(), [83; 16]);
    rig.bones.push(Bone {
        name: "child".into(),
        parent: Some(0),
        x: 40.,
        ..Bone::root()
    });
    let image = |name: &str| Region {
        name: name.into(),
        path: format!("frames/{name}_"),
        x: 0.,
        y: 0.,
        rotation: 0.,
        scale_x: 1.,
        scale_y: 1.,
        width: 32.,
        height: 24.,
    };
    let p = RegionProject {
        rig,
        images_root: "./images/".into(),
        region_order: vec![0, 1],
        slots: vec![
            Slot {
                name: "region slot".into(),
                bone: 0,
                color: [255; 4],
                blend: BlendMode::Normal,
                visible: true,
                attachment: Some(Attachment::Region(image("region"))),
            },
            Slot {
                name: "mesh slot".into(),
                bone: 1,
                color: [255; 4],
                blend: BlendMode::Normal,
                visible: true,
                attachment: Some(Attachment::Mesh(Box::new(crate::minimal::meshes::quad(
                    image("mesh"),
                    1,
                )))),
            },
        ],
    };
    let mut p = SceneProject::from(&p);
    p.fps = 24.;
    p.attachment_sequences = vec![
        AttachmentSequence {
            attachment: AttachmentAddress {
                slot: 0,
                attachment: 0,
            },
            settings: SequenceSettings {
                start: 100,
                count: 4,
                digits: 3,
                setup_index: 2,
            },
        },
        AttachmentSequence {
            attachment: AttachmentAddress {
                slot: 1,
                attachment: 0,
            },
            settings: SequenceSettings {
                start: 7,
                count: 3,
                digits: 2,
                setup_index: 1,
            },
        },
    ];
    p.animations[0].sequence_tracks = vec![
        SequenceTimeline {
            attachment: AttachmentAddress {
                slot: 0,
                attachment: 0,
            },
            keys: vec![
                SequenceKeyframe {
                    frame: 0.,
                    mode: SequenceMode::Hold,
                    index: 2,
                    delay: FiniteF32::new(0.125).unwrap(),
                },
                SequenceKeyframe {
                    frame: 7.25,
                    mode: SequenceMode::Once,
                    index: 1,
                    delay: FiniteF32::new(0.25).unwrap(),
                },
                SequenceKeyframe {
                    frame: 15.,
                    mode: SequenceMode::Loop,
                    index: 0,
                    delay: FiniteF32::new(0.0625).unwrap(),
                },
            ],
        },
        SequenceTimeline {
            attachment: AttachmentAddress {
                slot: 1,
                attachment: 0,
            },
            keys: vec![SequenceKeyframe {
                frame: -0.,
                mode: SequenceMode::Loop,
                index: 1,
                delay: FiniteF32::new(f32::from_bits(0x3d17_b427)).unwrap(),
            }],
        },
    ];
    p
}
fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let bytes = encode_scene_payload(p).unwrap();
    assert_eq!(decode_scene(&bytes).unwrap(), *p);
    assert_eq!(
        encode_scene_payload(&decode_scene(&bytes).unwrap()).unwrap(),
        bytes
    );
    bytes
}
#[test]
fn independent_region_mesh_sequences_all_modes_fractional_frames_and_raw_delays_roundtrip() {
    let mut p = fixture();
    let setup = p.rig.clone();
    let slots = p.slots.clone();
    let bytes = roundtrip(&p);
    assert!(decode_scene(&bytes).unwrap().wire.is_none());
    assert_eq!(
        p.sequence(AttachmentAddress {
            slot: 0,
            attachment: 0
        })
        .unwrap()
        .path("frames/region_", 1)
        .unwrap(),
        "frames/region_101"
    );
    assert_eq!(
        p.sequence(AttachmentAddress {
            slot: 1,
            attachment: 0
        })
        .unwrap()
        .path("frames/mesh_", 2)
        .unwrap(),
        "frames/mesh_09"
    );
    assert!(p.to_regions().is_err());
    p.animations[0].sequence_tracks[0].keys[1].index = 3;
    p.animations[0].sequence_tracks[1].keys[0].frame = 1.25;
    roundtrip(&p);
    assert_eq!(p.rig, setup);
    assert_eq!(p.slots, slots);
    let mut ordinary = p.clone();
    ordinary.attachment_sequences.clear();
    ordinary.animations[0].sequence_tracks.clear();
    let old = roundtrip(&ordinary);
    assert_ne!(bytes, old);
}
#[test]
fn sequence_raw_mode_index_curve_and_nonfinite_payloads_reject_without_normalizing() {
    let p = fixture();
    let bytes = roundtrip(&p);
    let mut needle = vec![0x85, 1, 1];
    for v in [7.25f32, 1., 1., 0.25] {
        needle.extend(v.to_be_bytes())
    }
    needle.push(0);
    let at = bytes
        .windows(needle.len())
        .position(|s| s == needle)
        .unwrap();
    for (offset, value) in [
        (3, f32::NAN),
        (7, 3.),
        (7, 1.5),
        (7, -0.),
        (11, 1.5),
        (11, -0.),
        (15, 0.),
        (15, -1.),
        (15, f32::INFINITY),
    ] {
        let mut bad = bytes.clone();
        bad[at + offset..at + offset + 4].copy_from_slice(&value.to_be_bytes());
        assert!(
            decode_scene(&bad).is_err(),
            "offset={offset}, value={value}"
        );
    }
    let mut bad = bytes.clone();
    bad[at + needle.len() - 1] = 1;
    assert!(decode_scene(&bad).is_err());
    for end in at..at + needle.len() {
        assert!(decode_scene(&bytes[..end]).is_err())
    }
}
#[test]
fn settings_targets_local_global_order_and_all_family_key_budgets_remain_bounded() {
    let original = fixture();
    for settings in [
        SequenceSettings {
            start: 0,
            count: 0,
            digits: 0,
            setup_index: 0,
        },
        SequenceSettings {
            start: 0,
            count: 4097,
            digits: 0,
            setup_index: 0,
        },
        SequenceSettings {
            start: i32::MAX as u32,
            count: 2,
            digits: 1,
            setup_index: 0,
        },
        SequenceSettings {
            start: 0,
            count: 3,
            digits: 11,
            setup_index: 0,
        },
        SequenceSettings {
            start: 0,
            count: 3,
            digits: 1,
            setup_index: 3,
        },
    ] {
        let mut p = original.clone();
        p.attachment_sequences[0].settings = settings;
        assert!(encode_scene_payload(&p).is_err());
    }
    let mut p = original.clone();
    p.attachment_sequences.reverse();
    assert!(encode_scene_payload(&p).is_err());
    normalize_attachment_sequences(&mut p).unwrap();
    roundtrip(&p);
    p.attachment_sequences
        .push(p.attachment_sequences[0].clone());
    assert!(normalize_attachment_sequences(&mut p).is_err());
    assert!(encode_scene_payload(&p).is_err());
    for frame in [-1., 1_000_001., f32::INFINITY] {
        let mut p = original.clone();
        p.animations[0].sequence_tracks[0].keys[0].frame = frame;
        assert!(encode_scene_payload(&p).is_err());
    }
    let mut p = original.clone();
    p.animations[0].sequence_tracks[0].keys[0].index = 4;
    assert!(encode_scene_payload(&p).is_err());
    let mut p = original.clone();
    p.attachment_sequences.clear();
    assert!(encode_scene_payload(&p).is_err());
    let mut p = original.clone();
    p.animations[0].sequence_tracks[0].keys = (0..4096)
        .map(|frame| SequenceKeyframe {
            frame: frame as f32,
            mode: SequenceMode::Hold,
            index: 0,
            delay: FiniteF32::new(0.125).unwrap(),
        })
        .collect();
    assert!(encode_scene_payload(&p).is_err());
    let mut p = original;
    let alternative = p.slots[0].attachments[0].image().unwrap().clone();
    p.slots[0]
        .attachments
        .push(SceneAttachment::Region(alternative));
    p.slots[0].attachments[1].image_mut().unwrap().name = "alternative".into();
    p.attachment_order.insert(
        0,
        AttachmentAddress {
            slot: 0,
            attachment: 1,
        },
    );
    assert!(
        encode_scene_payload(&p).is_err(),
        "contradictory local/global inventory order cannot silently change indices on reopen"
    );
}
#[test]
fn sequence_layout_and_settings_normalization_preserve_semantic_identity() {
    let mut p = fixture();
    let mut layout = animation_layout(&p, 0).unwrap();
    layout.groups.reverse();
    p.wire = Some(SceneWire {
        source_state: None,
        slot_references_8: vec![],
        editor_metadata: None,
        constraint_declarations: None,
        editor_scalar_46: FiniteF32::new(50.).unwrap(),
        skeleton_bounds_24: [FiniteF32::new(0.).unwrap(); 4],
        strings: vec![],
        zero_size_meshes: vec![],
        animation_layouts: vec![layout],
    });
    assert!(encode_scene_payload(&p).is_err());
    normalize_wire_track_order(&mut p).unwrap();
    roundtrip(&p);
    p.wire.as_mut().unwrap().animation_layouts[0].groups[0].owner = WireAnimationOwner::Bone(0);
    assert!(encode_scene_payload(&p).is_err());
}

#[test]
fn attachment_tint_roundtrip_is_independent_of_slot_keys_and_omits_only_white() {
    let mut p = fixture();
    let original_slots = p.slots.clone();
    p.attachment_colors = vec![
        AttachmentColor {
            attachment: AttachmentAddress {
                slot: 1,
                attachment: 0,
            },
            color: [212, 0, 0, 57],
        },
        AttachmentColor {
            attachment: AttachmentAddress {
                slot: 0,
                attachment: 0,
            },
            color: [4, 128, 255, 0],
        },
    ];
    assert!(encode_scene_payload(&p).is_err());
    normalize_attachment_colors(&mut p).unwrap();
    let saved = roundtrip(&p);
    assert_eq!(p.slots, original_slots);
    assert_eq!(
        p.attachment_color(AttachmentAddress {
            slot: 1,
            attachment: 0
        }),
        [212, 0, 0, 57]
    );
    assert!(p.to_regions().is_err());
    p.attachment_colors[0].color = [255; 4];
    assert!(encode_scene_payload(&p).is_err());
    normalize_attachment_colors(&mut p).unwrap();
    roundtrip(&p);
    assert_eq!(p.attachment_colors.len(), 1);
    assert_ne!(saved, encode_scene_payload(&p).unwrap());
    p.attachment_colors.push(p.attachment_colors[0].clone());
    assert!(normalize_attachment_colors(&mut p).is_err());
}

#[test]
fn unrepresented_cached_sequence_settings_and_key_identities_reject() {
    use crate::minimal::{Field, Object, Record};
    fn visit_record(record: &mut Record, first: &mut bool) {
        for (_, field) in &mut record.fields {
            if let Field::Value(o) = field {
                visit(o, first)
            }
        }
    }
    fn visit(o: &mut Object, first: &mut bool) {
        match o {
            Object::Record(r) if r.class == 123 => {
                if !*first {
                    r.label = Some("own-shared-settings".into());
                    *first = true
                } else {
                    *o = Object::Link(123, "own-shared-settings".into());
                }
            }
            Object::Record(r) => visit_record(r, first),
            Object::Array(items) => {
                for o in items {
                    visit(o, first)
                }
            }
            _ => (),
        }
    }
    let p = fixture();
    let mut record = crate::minimal::scene::write::project_record(&p);
    visit_record(&mut record, &mut false);
    let shared = crate::minimal::encode_record_payload_counted(&record, p.rig.identity).0;
    assert!(
        decode_scene(&shared).is_err(),
        "A legal shared settings object is outside the measured fresh-identity profile"
    );
    let bytes = roundtrip(&p);
    let header = [0x84, 1, 1, 22, 1];
    let at = bytes
        .windows(header.len())
        .position(|s| s == header)
        .unwrap();
    let mut cached_list = bytes.clone();
    cached_list[at + 4] = 2;
    assert!(decode_scene(&cached_list).is_err());
    let key_header = [0x85, 1, 1];
    let key = bytes[at..]
        .windows(key_header.len())
        .position(|s| s == key_header)
        .unwrap()
        + at;
    let mut cached_key = bytes;
    cached_key[key + 2] = 2;
    assert!(decode_scene(&cached_key).is_err());
}
