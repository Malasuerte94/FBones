use super::super::{
    decode_scene, encode_scene_payload, AttachmentAddress, SceneAttachment, SceneProject, SceneSlot,
};
use super::*;
use crate::minimal::{
    regions::{BlendMode, Region, RegionProject},
    Bone, MinimalProject,
};
fn scene() -> SceneProject {
    let mut rig = MinimalProject::new("own slot animation".into(), [31; 16]);
    let mut child = Bone::root();
    child.name = "child".into();
    child.parent = Some(0);
    child.x = 20.;
    rig.bones.push(child);
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    });
    for (i, bone) in [1, 0].into_iter().enumerate() {
        p.slots.push(SceneSlot {
            name: format!("slot{i}"),
            bone,
            color: [255, 128, 192, 204],
            blend: BlendMode::Normal,
            active_attachment: if i == 0 { Some(0) } else { None },
            attachments: ["A", "B"]
                .into_iter()
                .map(|name| {
                    SceneAttachment::Region(Region {
                        name: name.into(),
                        path: String::new(),
                        x: 0.,
                        y: 0.,
                        rotation: 0.,
                        scale_x: 1.,
                        scale_y: 1.,
                        width: 32.,
                        height: 24.,
                    })
                })
                .collect(),
        });
        for attachment in 0..2 {
            p.attachment_order.push(AttachmentAddress {
                slot: i,
                attachment,
            });
        }
    }
    p.fps = 24.;
    p
}
fn rgba(slot: usize) -> SlotTimeline {
    let colors: [[u8; 4]; 5] = [
        [208, 64, 128, 224],
        [32, 176, 96, 128],
        [128, 64, 208, 192],
        [240, 144, 48, 160],
        [48, 128, 192, 240],
    ];
    let keys = colors
        .iter()
        .enumerate()
        .map(|(i, color)| {
            let frame = i as f32 * 6.;
            let curve = if i == 1 || i == 3 {
                SlotRgbaCurve::Bezier {
                    dark_controls: None,
                    controls: std::array::from_fn(|axis| {
                        let a = f64::from(color[axis]) / 255.;
                        let b = f64::from(colors[i + 1][axis]) / 255.;
                        [
                            frame + 1.5,
                            (a + (b - a) * 0.3) as f32,
                            frame + 4.5,
                            (a + (b - a) * 0.7) as f32,
                        ]
                    }),
                }
            } else if i == 2 {
                SlotRgbaCurve::Stepped
            } else {
                SlotRgbaCurve::Linear
            };
            SlotRgbaKey {
                frame,
                values: color.map(|v| f32::from(v) / 255.),
                dark_values: [0.; 3],
                curve,
            }
        })
        .collect();
    SlotTimeline::Rgba { slot, keys }
}
fn attachment(slot: usize) -> SlotTimeline {
    SlotTimeline::Attachment {
        slot,
        keys: [Some(0), Some(1), None, Some(0), Some(1)]
            .into_iter()
            .enumerate()
            .map(|(i, attachment)| SlotAttachmentKey {
                frame: i as f32 * 6.,
                attachment,
            })
            .collect(),
    }
}
#[test]
fn slot_attachment_none_and_seven_axis_mixed_rgba_roundtrip_preserve_setup_and_float_bits() {
    let mut p = scene();
    let setup = (p.rig.clone(), p.slots.clone(), p.attachment_order.clone());
    p.animations[0].slot_tracks = vec![rgba(0), attachment(0), rgba(1), attachment(1)];
    let bytes = encode_scene_payload(&p).unwrap();
    let out = decode_scene(&bytes).unwrap();
    assert_eq!(out, p);
    assert_eq!(encode_scene_payload(&out).unwrap(), bytes);
    assert_eq!((out.rig, out.slots, out.attachment_order), setup);
    assert!(p.to_regions().is_err());
    let mut changed = p.clone();
    let SlotTimeline::Rgba { keys, .. } = &mut changed.animations[0].slot_tracks[0] else {
        unreachable!()
    };
    keys[0].values[0] = -0.;
    let mut positive = changed.clone();
    let SlotTimeline::Rgba { keys, .. } = &mut positive.animations[0].slot_tracks[0] else {
        unreachable!()
    };
    keys[0].values[0] = 0.;
    assert_ne!(
        changed, positive,
        "native history must retain authored signed-zero distinctions"
    );
}
#[test]
fn mixed_bone_slot_owner_groups_use_explicit_canonical_permutation_without_changing_bone_order() {
    let mut p = scene();
    p.animations[0].tracks = vec![BoneTimeline {
        bone: 0,
        channel: BoneChannel::Rotate,
        keys: vec![BoneKeyframe {
            frame: 0.,
            values: [17., 0.],
            curve: KeyCurve::Linear,
        }],
    }];
    p.animations[0].slot_tracks = vec![attachment(0), rgba(1)];
    assert_eq!(
        p.animations[0].slot_track_permutation(&p.slots).unwrap(),
        vec![1, 0]
    );
    assert!(
        encode_scene_payload(&p).is_err(),
        "noncanonical order cannot silently reorder public model"
    );
    p.animations[0].slot_tracks.swap(0, 1);
    let raw = encode_scene_payload(&p).unwrap();
    assert_eq!(decode_scene(&raw).unwrap(), p);
    assert_eq!(p.animations[0].tracks[0].bone, 0);
}
#[test]
fn unknown_dormant_color_values_handles_and_metadata_reject_instead_of_being_dropped() {
    let mut p = scene();
    p.animations[0].slot_tracks.push(rgba(0));
    let raw = encode_scene_payload(&p).unwrap();
    let header = [132, 1, 1, 4, 1, 5, 133, 1, 1];
    let at = raw.windows(header.len()).position(|w| w == header).unwrap();
    let dormant = at + header.len() + 4 + 16;
    for bits in [1_u32, 0x8000_0000, 0x3f80_0000] {
        let mut bad = raw.clone();
        bad[dormant..dormant + 4].copy_from_slice(&bits.to_be_bytes());
        assert!(decode_scene(&bad).is_err());
    }
    let next_header = [133, 1, 1, 0x40, 0xc0, 0, 0];
    let next = raw
        .windows(next_header.len())
        .position(|w| w == next_header)
        .unwrap();
    let first_handles = next + next_header.len() + 28 + 1;
    assert_eq!(
        &raw[first_handles..first_handles + 4],
        &2147483648_f32.to_be_bytes()
    );
    let mut bad = raw.clone();
    bad[first_handles + 4 * 20] ^= 1;
    assert!(
        decode_scene(&bad).is_err(),
        "unmodeled dormant handle axis must remain sentinel"
    );
    let mut bad = raw.clone();
    bad[first_handles + 16] = 1;
    assert!(
        decode_scene(&bad).is_err(),
        "unknown curve metadata cannot be erased"
    );
}
#[test]
fn slot_key_validation_rejects_bad_ownership_frames_duplicate_channels_and_curve_spans() {
    let mut p = scene();
    p.animations[0].slot_tracks = vec![attachment(0), rgba(0)];
    let reject = |p: &SceneProject| assert!(encode_scene_payload(p).is_err());
    let mut bad = p.clone();
    let SlotTimeline::Attachment { keys, .. } = &mut bad.animations[0].slot_tracks[0] else {
        unreachable!()
    };
    keys[0].attachment = Some(2);
    reject(&bad);
    let mut bad = p.clone();
    bad.animations[0].slot_tracks.push(attachment(0));
    reject(&bad);
    let mut bad = p.clone();
    let SlotTimeline::Rgba { slot, .. } = &mut bad.animations[0].slot_tracks[1] else {
        unreachable!()
    };
    *slot = 999;
    reject(&bad);
    for v in [f32::NAN, f32::INFINITY, -0.1, 1.1] {
        let mut bad = p.clone();
        let SlotTimeline::Rgba { keys, .. } = &mut bad.animations[0].slot_tracks[1] else {
            unreachable!()
        };
        keys[0].values[0] = v;
        reject(&bad);
    }
    let mut bad = p.clone();
    let SlotTimeline::Rgba { keys, .. } = &mut bad.animations[0].slot_tracks[1] else {
        unreachable!()
    };
    keys[2].frame = keys[1].frame;
    reject(&bad);
    let mut bad = p.clone();
    let SlotTimeline::Attachment { keys, .. } = &mut bad.animations[0].slot_tracks[0] else {
        unreachable!()
    };
    keys[0].frame = -1.;
    reject(&bad);
}
