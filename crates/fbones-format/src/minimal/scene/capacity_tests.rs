use super::*;
use crate::minimal::{regions::RegionProject, Bone};
fn model(keys: usize) -> SceneProject {
    let mut rig = MinimalProject::new("own capacity".into(), [59; 16]);
    for i in 1..128 {
        rig.bones.push(Bone {
            name: format!("bone{i}"),
            parent: Some(0),
            ..Bone::root()
        });
    }
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    });
    p.animations.clear();
    for i in 0..12 {
        p.slots.push(SceneSlot {
            name: format!("slot{i}"),
            bone: 0,
            color: [255; 4],
            blend: BlendMode::Normal,
            attachments: vec![],
            active_attachment: None,
        });
    }
    for i in 0..8 {
        let mut a = Animation::new(format!("clip{i}"));
        for bone in 0..125 {
            for channel in [
                BoneChannel::Rotate,
                BoneChannel::Translate,
                BoneChannel::Scale,
                BoneChannel::Shear,
            ] {
                a.tracks.push(BoneTimeline {
                    bone,
                    channel,
                    keys: (0..keys)
                        .map(|k| BoneKeyframe {
                            frame: k as f32,
                            values: if channel == BoneChannel::Rotate {
                                [k as f32, 0.]
                            } else {
                                [1.; 2]
                            },
                            curve: KeyCurve::Linear,
                        })
                        .collect(),
                });
            }
        }
        for slot in 0..12 {
            a.slot_tracks.push(SlotTimeline::Rgba {
                slot,
                keys: (0..keys)
                    .map(|k| SlotRgbaKey {
                        frame: k as f32,
                        values: [1.; 4],
                        dark_values: [0.; 3],
                        curve: SlotRgbaCurve::Linear,
                    })
                    .collect(),
            });
        }
        p.animations.push(a);
    }
    p
}
#[test]
fn aggregate_mixed_family_maximum_roundtrips_with_old_per_clip_bounds() {
    let p = model(2);
    assert_eq!(
        p.animations.len() * (p.animations[0].tracks.len() + p.animations[0].slot_tracks.len()),
        MAX_SCENE_TRACKS
    );
    let bytes = encode_scene_payload(&p).unwrap();
    assert_eq!(decode_scene(&bytes).unwrap(), p);
    assert_eq!(
        encode_scene_payload(&decode_scene(&bytes).unwrap()).unwrap(),
        bytes
    );
    let mut over_keys = p.clone();
    over_keys.animations[0].tracks[0].keys.push(BoneKeyframe {
        frame: 2.,
        values: [0.; 2],
        curve: KeyCurve::Linear,
    });
    assert!(encode_scene_payload(&over_keys).is_err());
    let mut over_tracks = model(1);
    let mut a = Animation::new("extra".into());
    a.slot_tracks
        .push(over_tracks.animations[0].slot_tracks[0].clone());
    over_tracks.animations.push(a);
    assert!(encode_scene_payload(&over_tracks).is_err());
    for end in [0, 1, 28, bytes.len() / 2, bytes.len() - 1] {
        assert!(decode_scene(&bytes[..end]).is_err());
    }
    let mut corrupt = bytes;
    corrupt[0] = 255;
    assert!(decode_scene(&corrupt).is_err());
}
#[test]
fn mixed_family_per_clip_track_and_key_limits_do_not_become_aggregate_limits() {
    let mut tracks = model(1);
    tracks.animations.truncate(1);
    for i in 128..256 {
        tracks.rig.bones.push(Bone {
            name: format!("large{i}"),
            parent: Some(0),
            ..Bone::root()
        });
    }
    for bone in 125..253 {
        for channel in [
            BoneChannel::Rotate,
            BoneChannel::Translate,
            BoneChannel::Scale,
            BoneChannel::Shear,
        ] {
            tracks.animations[0].tracks.push(BoneTimeline {
                bone,
                channel,
                keys: vec![BoneKeyframe {
                    frame: 0.,
                    values: [0.; 2],
                    curve: KeyCurve::Linear,
                }],
            });
        }
    }
    assert_eq!(
        tracks.animations[0].tracks.len() + tracks.animations[0].slot_tracks.len(),
        MAX_ANIMATION_TRACKS
    );
    let bytes = encode_scene_payload(&tracks).unwrap();
    assert_eq!(decode_scene(&bytes).unwrap(), tracks);
    tracks.animations[0]
        .slot_tracks
        .push(SlotTimeline::Attachment {
            slot: 0,
            keys: vec![SlotAttachmentKey {
                frame: 0.,
                attachment: None,
            }],
        });
    assert!(encode_scene_payload(&tracks).is_err());
    let mut keys = model(1);
    keys.animations.truncate(1);
    keys.animations[0].tracks.truncate(1);
    keys.animations[0].slot_tracks.truncate(1);
    keys.animations[0].tracks[0].keys = (0..4096)
        .map(|i| BoneKeyframe {
            frame: i as f32,
            values: [0.; 2],
            curve: KeyCurve::Linear,
        })
        .collect();
    assert!(
        encode_scene_payload(&keys).is_err(),
        "4096bone+1slot key exceeds the unchanged active-clip limit"
    );
}
#[test]
fn real_domain_registration_limit_rejects_even_when_track_and_key_counts_fit() {
    let mut p = model(1);
    p.slots.clear();
    p.events = (0..128)
        .map(|i| EventDefinition {
            name: format!("event{i}"),
            int: 0,
            float: 0.,
            string: String::new(),
            audio: String::new(),
            volume: 1.,
            balance: 0.,
        })
        .collect();
    for a in &mut p.animations {
        a.tracks.truncate(384);
        a.slot_tracks.clear();
        a.event_tracks = (0..128)
            .map(|event| EventTimeline {
                event,
                keys: (0..5)
                    .map(|i| EventKeyframe {
                        frame: i as f32,
                        int: 0,
                        float: 0.,
                        string: String::new(),
                        volume: 1.,
                        balance: 0.,
                    })
                    .collect(),
            })
            .collect();
    }
    let record = write::project_record(&p);
    let (bytes, domains, generics) =
        crate::minimal::encode_record_payload_counted(&record, p.rig.identity);
    assert!(domains > MAX_SCENE_DOMAINS as u32);
    assert!(generics <= crate::minimal::MAX_GENERIC_OBJECTS as u32);
    assert!(encode_scene_payload(&p).is_err());
    assert!(decode_scene(&bytes).is_err());
}

#[test]
fn emitted_structural_graph_reuses_exact_depth_guard_without_semantic_recursion() {
    fn rig(count: usize, chain: bool) -> SceneProject {
        let mut rig = MinimalProject::new("own depth closure".into(), [71; 16]);
        for i in 1..count {
            rig.bones.push(Bone {
                name: format!("depth{i}"),
                parent: Some(if chain { i - 1 } else { 0 }),
                ..Bone::root()
            });
        }
        let mut p = SceneProject::from(&RegionProject {
            rig,
            images_root: "./images/".into(),
            slots: vec![],
            region_order: vec![],
        });
        p.animations[0].tracks.push(BoneTimeline {
            bone: count - 1,
            channel: BoneChannel::Rotate,
            keys: vec![BoneKeyframe {
                frame: 0.,
                values: [0.; 2],
                curve: KeyCurve::Linear,
            }],
        });
        p
    }
    fn raw(p: &SceneProject) -> Vec<u8> {
        // Exercise the structural boundary independently from the current
        // inventory limit. Public Scene encoding must apply both guards.
        super::super::encode_record_payload_counted(&write::project_record(p), p.rig.identity).0
    }
    let safe_model = rig(245, true);
    let over_model = rig(246, true);
    let safe = raw(&safe_model);
    let over = raw(&over_model);
    assert_eq!(encode_scene_payload(&safe_model).unwrap(), safe);
    assert!(encode_scene_payload(&over_model).is_err());
    assert!(super::super::reader::validate_scene_payload_structure(&safe).is_ok());
    assert!(super::super::reader::validate_scene_payload_structure(&over).is_err());
    let wide_model = rig(MAX_SCENE_BONES, false);
    let wide = raw(&wide_model);
    assert!(super::super::reader::validate_scene_payload_structure(&wide).is_ok());
    assert_eq!(encode_scene_payload(&wide_model).unwrap(), wide);
    assert_eq!(decode_scene(&wide).unwrap(), wide_model);
    assert!(encode_scene_payload(&rig(MAX_SCENE_BONES + 1, false)).is_err());
    assert!(crate::minimal::encode_minimal_payload(&rig(129, false).rig).is_err());
    assert!(crate::minimal::encode_minimal_payload(&rig(128, false).rig).is_ok());
    assert!(
        super::super::reader::validate_scene_payload_structure(&safe[..safe.len() - 1]).is_err()
    );
}
