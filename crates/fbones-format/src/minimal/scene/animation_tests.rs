use super::super::{decode_scene, encode_scene_payload, SceneProject};
use super::*;
use crate::minimal::{regions::RegionProject, Bone, MinimalProject};
fn scene() -> SceneProject {
    let mut rig = MinimalProject::new("own animation".into(), [27; 16]);
    let mut b = Bone::root();
    b.name = "tip".into();
    b.parent = Some(0);
    b.x = 17.;
    rig.bones.push(b);
    SceneProject::from(&RegionProject {
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    })
}
fn track() -> BoneTimeline {
    BoneTimeline {
        bone: 1,
        channel: BoneChannel::Translate,
        keys: vec![
            BoneKeyframe {
                frame: 0.,
                values: [-0., f32::from_bits(1)],
                curve: KeyCurve::Stepped,
            },
            BoneKeyframe {
                frame: 6.,
                values: [80., -30.],
                curve: KeyCurve::Linear,
            },
            BoneKeyframe {
                frame: 6.,
                values: [81., -31.],
                curve: KeyCurve::Stepped,
            },
            BoneKeyframe {
                frame: 30.125,
                values: [12.375, 0.],
                curve: KeyCurve::Linear,
            },
        ],
    }
}
#[test]
fn named_translate_tracks_frames_curves_duplicates_and_exact_bits_roundtrip_without_setup_bake() {
    let mut p = scene();
    let setup = p.rig.clone();
    p.animations[0].tracks.push(track());
    p.animations.push(Animation {
        split_modes: Vec::new(),
        sequence_tracks: vec![],
        slot_tracks: vec![],
        draw_order: vec![],
        deform_tracks: vec![],
        constraint_tracks: vec![],
        event_tracks: vec![],
        name: "loop 🚀".into(),
        tracks: vec![track()],
    });
    let bytes = encode_scene_payload(&p).unwrap();
    let out = decode_scene(&bytes).unwrap();
    assert_eq!(out, p);
    assert_eq!(out.rig, setup);
    assert_eq!(
        out.animations[0].tracks[0].keys[0].values[0].to_bits(),
        0x80000000
    );
    assert_eq!(encode_scene_payload(&out).unwrap(), bytes);
    assert!(out.to_regions().is_err());
    let mut changed = out.clone();
    changed.animations[0].tracks[0].keys[0].values[0] = 0.;
    assert_ne!(
        changed, out,
        "history must distinguish signed-zero authored key values"
    );
}
#[test]
fn animation_authoring_boundaries_reject_invalid_channels_refs_frames_names_and_nonfinite() {
    let mut base = scene();
    base.animations[0].tracks.push(track());
    let reject = |p: &SceneProject| assert!(encode_scene_payload(p).is_err());
    let mut p = base.clone();
    p.animations.clear();
    reject(&p);
    let mut p = base.clone();
    p.animations.push(p.animations[0].clone());
    reject(&p);
    let mut p = base.clone();
    p.animations[0].name = "\n".into();
    reject(&p);
    let mut p = base.clone();
    p.animations[0].tracks[0].channel = BoneChannel::Rotate;
    reject(&p); // Rotate's unrepresented second scalar cannot be discarded.
    let mut p = base.clone();
    p.animations[0].tracks[0].bone = 128;
    reject(&p);
    let mut p = base.clone();
    p.animations[0].tracks.push(track());
    reject(&p);
    let mut p = base.clone();
    p.animations[0].tracks[0].keys.clear();
    reject(&p);
    for frame in [-1., f32::NAN, f32::INFINITY] {
        let mut p = base.clone();
        p.animations[0].tracks[0].keys[0].frame = frame;
        reject(&p);
    }
    let mut p = base.clone();
    p.animations[0].tracks[0].keys[2].frame = 5.;
    reject(&p);
    let mut p = base;
    p.animations[0].tracks[0].keys[1].values[0] = f32::INFINITY;
    reject(&p);
}
#[test]
fn unsupported_curve_and_corrupt_animation_payload_never_normalize_into_supported_profile() {
    let mut p = scene();
    p.animations[0].tracks.push(BoneTimeline {
        bone: 0,
        channel: BoneChannel::Translate,
        keys: vec![BoneKeyframe {
            frame: 13.25,
            values: [32.125, -72.5],
            curve: KeyCurve::Stepped,
        }],
    });
    let bytes = encode_scene_payload(&p).unwrap();
    let mut needle = vec![0x85, 1, 1];
    for v in [13.25f32, 32.125, -72.5] {
        needle.extend_from_slice(&v.to_be_bytes());
    }
    needle.push(2);
    let at = bytes
        .windows(needle.len())
        .position(|b| b == needle)
        .unwrap();
    let mut bad = bytes.clone();
    bad[at + needle.len() - 1] = 1;
    assert!(
        decode_scene(&bad).is_err(),
        "Bezier marker without mandatory handles is malformed"
    );
    for end in at..at + needle.len() {
        assert!(decode_scene(&bytes[..end]).is_err());
    }
    let mut bad = bytes;
    bad[at + 3..at + 7].copy_from_slice(&f32::NAN.to_be_bytes());
    assert!(decode_scene(&bad).is_err());
}

#[test]
fn all_four_channels_mixed_bezier_handles_and_fps_roundtrip_with_group_order() {
    let mut p = scene();
    p.fps = 24.;
    let setup = p.rig.clone();
    let mut tracks = Vec::new();
    for (bone, channel) in [
        (0, BoneChannel::Rotate),
        (0, BoneChannel::Translate),
        (1, BoneChannel::Scale),
        (1, BoneChannel::Shear),
    ] {
        let dimensions = if channel == BoneChannel::Rotate { 1 } else { 2 };
        let mut keys: Vec<_> = (0..5)
            .map(|i| BoneKeyframe {
                frame: i as f32 * 6.,
                values: [
                    i as f32 * 7. + 1.,
                    if dimensions == 1 {
                        0.
                    } else {
                        i as f32 * -3. + 2.
                    },
                ],
                curve: if i == 2 {
                    KeyCurve::Stepped
                } else {
                    KeyCurve::Linear
                },
            })
            .collect();
        for i in [1, 3] {
            let mut controls = [[0.; 4]; 2];
            for (axis, c) in controls.iter_mut().enumerate().take(dimensions) {
                *c = [
                    keys[i].frame + 1.5,
                    keys[i].values[axis] + 1.,
                    keys[i].frame + 4.5,
                    keys[i + 1].values[axis] - 1.,
                ];
            }
            keys[i].curve = KeyCurve::Bezier { controls };
        }
        tracks.push(BoneTimeline {
            bone,
            channel,
            keys,
        });
    }
    p.animations[0].tracks = tracks;
    let payload = encode_scene_payload(&p).unwrap();
    let decoded = decode_scene(&payload).unwrap();
    assert_eq!(decoded, p);
    assert_eq!(decoded.rig, setup);
    assert_eq!(decoded.fps, 24.);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), payload);
    assert!(decoded.to_regions().is_err());
    let mut noanimation = scene();
    noanimation.fps = 24.;
    assert!(
        noanimation.to_regions().is_err(),
        "legacy conversion cannot discard projectFPS"
    );
    for fps in [0., -1., f32::NAN, f32::INFINITY] {
        let mut invalid = p.clone();
        invalid.fps = fps;
        assert!(encode_scene_payload(&invalid).is_err());
    }
    let mut invalid = p.clone();
    invalid.animations[0].tracks.swap(1, 2);
    assert!(
        encode_scene_payload(&invalid).is_err(),
        "discontiguous bone groups cannot silently reorder"
    );
    let mut invalid = p.clone();
    let KeyCurve::Bezier { controls } = &mut invalid.animations[0].tracks[0].keys[1].curve else {
        unreachable!()
    };
    controls[0][0] = 0.;
    assert!(encode_scene_payload(&invalid).is_err());
    let mut invalid = p.clone();
    let KeyCurve::Bezier { controls } = &mut invalid.animations[0].tracks[0].keys[1].curve else {
        unreachable!()
    };
    controls[1][0] = 1.;
    assert!(
        encode_scene_payload(&invalid).is_err(),
        "rotation has no second handle axis"
    );
    let mut invalid = p;
    invalid.animations[0].tracks[0].keys[4].curve = KeyCurve::Bezier {
        controls: [[0.; 4]; 2],
    };
    assert!(
        encode_scene_payload(&invalid).is_err(),
        "last key has no outgoing segment"
    );
}
