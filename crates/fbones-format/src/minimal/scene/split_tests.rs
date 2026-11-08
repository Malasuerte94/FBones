use super::*;
use crate::minimal::{regions::RegionProject, Bone, MinimalProject};
fn fixture() -> SceneProject {
    let mut rig = MinimalProject::new("split own".into(), [63; 16]);
    rig.bones.push(Bone {
        name: "translate".into(),
        parent: Some(0),
        x: 17.,
        y: -9.,
        ..Bone::root()
    });
    rig.bones.push(Bone {
        name: "scale".into(),
        parent: Some(1),
        scale_x: -2.,
        scale_y: 0.,
        ..Bone::root()
    });
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    });
    p.animations[0].split_modes = vec![
        BoneSplitConfig {
            bone: 2,
            mode: BoneSplitMode::Scale,
        },
        BoneSplitConfig {
            bone: 1,
            mode: BoneSplitMode::Translate,
        },
    ];
    for (bone, channel) in [
        (1, BoneChannel::TranslateY),
        (1, BoneChannel::TranslateX),
        (2, BoneChannel::ScaleY),
        (2, BoneChannel::ScaleX),
    ] {
        p.animations[0].tracks.push(BoneTimeline {
            bone,
            channel,
            keys: vec![
                BoneKeyframe {
                    frame: -0.,
                    values: [-0., 0.],
                    curve: KeyCurve::Bezier {
                        controls: [[5.4, -2., 3.9, 9.], [0.; 4]],
                    },
                },
                BoneKeyframe {
                    frame: 5.,
                    values: [f32::from_bits(1), 0.],
                    curve: KeyCurve::Stepped,
                },
                BoneKeyframe {
                    frame: 8.,
                    values: [-1.25, 0.],
                    curve: KeyCurve::Linear,
                },
            ],
        });
    }
    p.animations[0].tracks[0].keys.remove(2);
    p
}
fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let bytes = encode_scene_payload(p).unwrap();
    let decoded = decode_scene(&bytes).unwrap();
    assert_eq!(&decoded, p);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
    bytes
}
#[test]
fn scalar_axes_and_ordered_modes_keep_independent_times_raw_bits_and_canonical_absence() {
    let p = fixture();
    let bytes = roundtrip(&p);
    assert!(decode_scene(&bytes).unwrap().wire.is_none());
    assert!(p.to_regions().is_err());
    assert_eq!(p.animations[0].tracks[0].keys.len(), 2);
    assert_eq!(p.animations[0].tracks[1].keys.len(), 3);
    for (kind, channel) in [
        (0, BoneChannel::Rotate),
        (1, BoneChannel::Translate),
        (2, BoneChannel::Scale),
        (3, BoneChannel::Shear),
        (14, BoneChannel::TranslateX),
        (15, BoneChannel::TranslateY),
        (16, BoneChannel::ScaleX),
        (17, BoneChannel::ScaleY),
    ] {
        assert_eq!(channel.wire(), kind);
        assert_eq!(BoneChannel::from_wire(kind).unwrap(), channel);
    }
    for value in [0, 3, 4, u32::MAX] {
        assert!(BoneSplitMode::from_wire(value).is_err());
    }
    assert_eq!(
        BoneSplitMode::from_wire(1).unwrap(),
        BoneSplitMode::Translate
    );
    assert_eq!(BoneSplitMode::from_wire(2).unwrap(), BoneSplitMode::Scale);
    assert_eq!(BoneChannel::TranslateY.dimensions(), 1);
    assert_eq!(BoneChannel::ScaleY.dimensions(), 1);
    assert_eq!(BoneChannel::Translate.dimensions(), 2);
}
#[test]
fn scalar_key_edit_retains_sibling_modes_setup_and_unrelated_source_bits() {
    let mut p = fixture();
    let before = decode_scene(&roundtrip(&p)).unwrap();
    p.animations[0].tracks[0].keys[1].values[0] = 18.25;
    roundtrip(&p);
    assert_eq!(p.rig, before.rig);
    assert_eq!(
        p.animations[0].split_modes,
        before.animations[0].split_modes
    );
    assert_eq!(
        &p.animations[0].tracks[1..],
        &before.animations[0].tracks[1..]
    );
    let mut expected = before;
    expected.animations[0].tracks[0].keys[1].values[0] = 18.25;
    assert_eq!(p, expected);
}
#[test]
fn split_modes_reject_foreign_duplicate_partial_unmarked_and_combined_collisions() {
    let p = fixture();
    let mut bad = p.clone();
    bad.animations[0].split_modes[0].bone = 99;
    assert!(encode_scene_payload(&bad).is_err());
    let mut bad = p.clone();
    let duplicate = bad.animations[0].split_modes[0];
    bad.animations[0].split_modes.push(duplicate);
    assert!(encode_scene_payload(&bad).is_err());
    let mut bad = p.clone();
    bad.animations[0].split_modes.clear();
    assert!(encode_scene_payload(&bad).is_err());
    let mut bad = p.clone();
    bad.animations[0].split_modes[1].mode = BoneSplitMode::Scale;
    assert!(encode_scene_payload(&bad).is_err());
    let mut bad = p.clone();
    // Mode1 still requires X; Y alone is not part of the known profile.
    bad.animations[0].tracks.remove(1);
    assert!(encode_scene_payload(&bad).is_err());
    let mut bad = p.clone();
    bad.animations[0].tracks[0].keys.clear();
    assert!(encode_scene_payload(&bad).is_err());
    let mut bad = p.clone();
    let mut combined = bad.animations[0].tracks[1].clone();
    combined.channel = BoneChannel::Translate;
    bad.animations[0].tracks.insert(2, combined);
    assert!(encode_scene_payload(&bad).is_err());
}
#[test]
fn scalar_padding_nonfinite_and_reversing_time_are_not_silently_repaired() {
    let p = fixture();
    let mut bad = p.clone();
    bad.animations[0].tracks[0].keys[0].values[1] = -0.;
    assert!(encode_scene_payload(&bad).is_err());
    let mut bad = p.clone();
    if let KeyCurve::Bezier { controls } = &mut bad.animations[0].tracks[0].keys[0].curve {
        controls[1][0] = -0.;
    }
    assert!(encode_scene_payload(&bad).is_err());
    for nonfinite in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY] {
        let mut bad = p.clone();
        bad.animations[0].tracks[0].keys[0].values[0] = nonfinite;
        assert!(encode_scene_payload(&bad).is_err());
        let mut bad = p.clone();
        bad.animations[0].tracks[0].keys[0].frame = nonfinite;
        assert!(encode_scene_payload(&bad).is_err());
        let mut bad = p.clone();
        if let KeyCurve::Bezier { controls } = &mut bad.animations[0].tracks[0].keys[0].curve {
            controls[0][1] = nonfinite;
        }
        assert!(encode_scene_payload(&bad).is_err());
    }
    let mut bad = p.clone();
    if let KeyCurve::Bezier { controls } = &mut bad.animations[0].tracks[0].keys[0].curve {
        controls[0][0] = 8.;
        controls[0][2] = -3.;
    }
    assert!(encode_scene_payload(&bad).is_err());
}
#[test]
fn split_row_inlining_retains_wire_layout_string_aliases_and_finite_metadata() {
    let mut p = fixture();
    let mut layout = animation_layout(&p, 0).unwrap();
    layout.groups.reverse();
    for group in &mut layout.groups {
        group.tracks.reverse();
    }
    p.rig.bones[1].name = "same".into();
    p.animations[0].name = "same".into();
    p.wire = Some(SceneWire {
        source_state: None,
        slot_references_8: vec![],
        editor_metadata: None,
        constraint_declarations: None,
        editor_scalar_46: FiniteF32::new(50.).unwrap(),
        skeleton_bounds_24: [FiniteF32::new(-0.).unwrap(); 4],
        zero_size_meshes: vec![],
        animation_layouts: vec![layout],
        strings: vec![
            WireStringAlias {
                owner: WireStringOwner::Bone(1),
                tag: 1,
                group: 17,
                encoding: None,
            },
            WireStringAlias {
                owner: WireStringOwner::Animation(0),
                tag: 1,
                group: 17,
                encoding: None,
            },
        ],
    });
    normalize_wire_track_order(&mut p).unwrap();
    normalize_wire_strings(&mut p).unwrap();
    let before = p.clone();
    let bytes = roundtrip(&p);
    assert_ne!(bytes, roundtrip(&fixture()));
    p.animations[0].split_modes.reverse();
    roundtrip(&p);
    assert_ne!(
        p.animations[0].split_modes,
        before.animations[0].split_modes
    );
    let mut changed = before;
    changed.animations[0].tracks[0].keys.push(BoneKeyframe {
        frame: 12.,
        values: [7., 0.],
        curve: KeyCurve::Linear,
    });
    normalize_wire_strings(&mut changed).unwrap();
    roundtrip(&changed);
}
#[test]
fn raw_split_count_mode_corruption_and_truncation_reject() {
    let payload = roundtrip(&fixture());
    let marker = payload.windows(3).position(|w| w == [116, 1, 2]).unwrap();
    let mut bad = payload.clone();
    bad[marker + 2] = 0;
    assert!(decode_scene(&bad).is_err());
    let mut bad = payload.clone();
    bad.splice(marker + 2..marker + 3, [0x81, 4]);
    assert!(decode_scene(&bad).is_err());
    for cut in [marker + 1, marker + 3, payload.len() - 1] {
        assert!(decode_scene(&payload[..cut]).is_err());
    }
}

#[test]
fn known_x_only_translate_preserves_absence_raw_bits_mode_and_y_lifecycle() {
    let mut p = fixture();
    p.animations[0].tracks.remove(0); // Only Y is absent; Scale stays complete.
    assert!(p.animations[0]
        .tracks
        .iter()
        .all(|t| t.channel != BoneChannel::TranslateY));
    let original = p.clone();
    let bytes = roundtrip(&p);
    assert!(decode_scene(&bytes).unwrap().wire.is_none());
    assert_eq!(
        p.animations[0].tracks[0].keys[0].frame.to_bits(),
        (-0_f32).to_bits()
    );
    assert_eq!(
        p.animations[0].tracks[0].keys[0].values[0].to_bits(),
        (-0_f32).to_bits()
    );
    assert_eq!(p.rig.bones[1].y.to_bits(), (-9_f32).to_bits());
    p.animations[0].tracks.insert(
        1,
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::TranslateY,
            keys: vec![BoneKeyframe {
                frame: 12.,
                values: [7., 0.],
                curve: KeyCurve::Linear,
            }],
        },
    );
    roundtrip(&p);
    assert_eq!(p.animations[0].tracks[0], original.animations[0].tracks[0]);
    assert_eq!(
        p.animations[0].split_modes,
        original.animations[0].split_modes
    );
    p.animations[0].tracks.remove(1);
    assert_eq!(p, original);
    assert_eq!(
        roundtrip(&p),
        bytes,
        "Removing Y restores the entire source payload without fabricated keys"
    );
    let mut copy = p.animations[0].clone();
    copy.name = "X-only copy".into();
    p.animations.push(copy);
    roundtrip(&p);
    assert_eq!(p.animations[1].split_modes, p.animations[0].split_modes);
    assert_eq!(p.animations[1].tracks, p.animations[0].tracks);
}
#[test]
fn x_only_wire_inlining_aliases_and_layout_survive_first_y_and_removal() {
    let mut p = fixture();
    p.animations[0].tracks.remove(0);
    let mut layout = animation_layout(&p, 0).unwrap();
    layout.groups.reverse();
    for group in &mut layout.groups {
        group.tracks.reverse();
    }
    p.rig.bones[1].name = "shared X only".into();
    p.animations[0].name = "shared X only".into();
    p.wire = Some(SceneWire {
        source_state: None,
        slot_references_8: vec![],
        editor_metadata: None,
        constraint_declarations: None,
        editor_scalar_46: FiniteF32::new(50.).unwrap(),
        skeleton_bounds_24: [FiniteF32::new(-0.).unwrap(); 4],
        zero_size_meshes: vec![],
        animation_layouts: vec![layout],
        strings: vec![
            WireStringAlias {
                owner: WireStringOwner::Bone(1),
                tag: 1,
                group: 17,
                encoding: None,
            },
            WireStringAlias {
                owner: WireStringOwner::Animation(0),
                tag: 1,
                group: 17,
                encoding: None,
            },
        ],
    });
    normalize_wire_track_order(&mut p).unwrap();
    normalize_wire_strings(&mut p).unwrap();
    let original = p.clone();
    let bytes = roundtrip(&p);
    p.animations[0].tracks.push(BoneTimeline {
        bone: 1,
        channel: BoneChannel::TranslateY,
        keys: vec![BoneKeyframe {
            frame: -0.,
            values: [-0., 0.],
            curve: KeyCurve::Linear,
        }],
    });
    p.wire.as_mut().unwrap().animation_layouts[0]
        .groups
        .iter_mut()
        .find(|g| g.owner == WireAnimationOwner::Bone(1))
        .unwrap()
        .tracks
        .push(WireTrack::Bone {
            bone: 1,
            channel: BoneChannel::TranslateY,
        });
    normalize_wire_track_order(&mut p).unwrap();
    normalize_wire_strings(&mut p).unwrap();
    roundtrip(&p);
    assert_eq!(p.rig, original.rig);
    assert_eq!(
        p.animations[0].split_modes,
        original.animations[0].split_modes
    );
    for t in &original.animations[0].tracks {
        assert_eq!(
            p.animations[0]
                .tracks
                .iter()
                .find(|v| v.bone == t.bone && v.channel == t.channel)
                .unwrap(),
            t
        );
    }
    p.animations[0]
        .tracks
        .retain(|t| t.channel != BoneChannel::TranslateY);
    for group in &mut p.wire.as_mut().unwrap().animation_layouts[0].groups {
        group.tracks.retain(|t| {
            *t != WireTrack::Bone {
                bone: 1,
                channel: BoneChannel::TranslateY,
            }
        });
    }
    normalize_wire_strings(&mut p).unwrap();
    assert_eq!(p, original);
    assert_eq!(roundtrip(&p), bytes);
}
#[test]
fn x_only_exception_keeps_missing_x_empty_y_and_partial_scale_guarded() {
    let mut p = fixture();
    p.animations[0].tracks.remove(0);
    roundtrip(&p);
    let mut missing_x = p.clone();
    missing_x.animations[0].tracks.remove(0);
    assert!(encode_scene_payload(&missing_x).is_err());
    let mut empty_y = p.clone();
    empty_y.animations[0].tracks.insert(
        1,
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::TranslateY,
            keys: vec![],
        },
    );
    assert!(encode_scene_payload(&empty_y).is_err());
    for channel in [BoneChannel::ScaleX, BoneChannel::ScaleY] {
        let mut partial_scale = p.clone();
        partial_scale.animations[0]
            .tracks
            .retain(|t| t.channel != channel);
        assert!(encode_scene_payload(&partial_scale).is_err());
    }
    let mut reversing = p.clone();
    if let KeyCurve::Bezier { controls } = &mut reversing.animations[0].tracks[0].keys[0].curve {
        controls[0][0] = 8.;
        controls[0][2] = -3.;
    }
    assert!(encode_scene_payload(&reversing).is_err());
}
