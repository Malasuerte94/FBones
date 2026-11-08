use super::*;
use crate::minimal::{regions::RegionProject, Bone, MinimalProject};
fn fixture() -> SceneProject {
    let mut rig = MinimalProject::new("two color own".into(), [91; 16]);
    rig.bones.push(Bone {
        name: "child".into(),
        parent: Some(0),
        ..Bone::root()
    });
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    });
    for bone in [0, 1] {
        p.slots.push(SceneSlot {
            name: format!("slot{bone}"),
            bone,
            color: [203, 92, 150, 187],
            blend: BlendMode::Normal,
            attachments: vec![],
            active_attachment: None,
        });
    }
    p
}
fn key(frame: f32, light: [f32; 4], dark: [f32; 3]) -> SlotRgbaKey {
    SlotRgbaKey {
        frame,
        values: light,
        dark_values: dark,
        curve: SlotRgbaCurve::Linear,
    }
}
fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let bytes = encode_scene_payload(p).unwrap();
    let decoded = decode_scene(&bytes).unwrap();
    assert_eq!(&decoded, p);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
    bytes
}
fn raw(p: &SceneProject) -> Vec<u8> {
    crate::minimal::encode_record_payload(
        &crate::minimal::scene::write::project_record(p),
        p.rig.identity,
    )
}
#[test]
fn setup_dark_enabled_black_and_disabled_dormant_rgb_are_distinct_lossless_data() {
    let mut p = fixture();
    let canonical = roundtrip(&p);
    p.slot_dark_colors = vec![SlotDarkColor {
        slot: 0,
        enabled: false,
        color: [0, 0, 0, 255],
    }];
    assert!(encode_scene_payload(&p).is_err());
    normalize_slot_dark_colors(&mut p).unwrap();
    assert_eq!(roundtrip(&p), canonical);
    p.slot_dark_colors = vec![
        SlotDarkColor {
            slot: 1,
            enabled: false,
            color: [41, 0, 92, 255],
        },
        SlotDarkColor {
            slot: 0,
            enabled: true,
            color: [0, 0, 0, 255],
        },
    ];
    assert!(encode_scene_payload(&p).is_err());
    normalize_slot_dark_colors(&mut p).unwrap();
    let bytes = roundtrip(&p);
    assert_ne!(bytes, canonical);
    assert!(p.slot_dark_color(0).enabled);
    assert_eq!(p.slot_dark_color(1).color, [41, 0, 92, 255]);
    assert!(!p.slot_dark_color(1).enabled);
    assert!(p.to_regions().is_err());
    let before = p.clone();
    p.slot_dark_colors[0].enabled = false;
    normalize_slot_dark_colors(&mut p).unwrap();
    roundtrip(&p);
    assert_eq!(p.slot_dark_color(1), before.slot_dark_color(1));
    assert_eq!(p.slots, before.slots);
}
#[test]
fn two_color_linear_keys_preserve_seven_lanes_frame_bits_layout_and_unrelated_data() {
    let mut p = fixture();
    p.slot_dark_colors = vec![SlotDarkColor {
        slot: 0,
        enabled: true,
        color: [255; 4],
    }];
    let mut a = Animation::new("color".into());
    a.slot_tracks = vec![
        SlotTimeline::Rgba {
            slot: 0,
            keys: vec![
                key(-0., [1., 0.25, 0.5, 0.75], [-0., 0.125, 0.875]),
                key(7.25, [0.25, 0.5, 0.75, 1.], [0.375, 0.625, 0.125]),
            ],
        },
        SlotTimeline::Rgba {
            slot: 1,
            keys: vec![key(0., [1.; 4], [0.; 3]), key(10., [0.5; 4], [0.; 3])],
        },
    ];
    if let SlotTimeline::Rgba { keys, .. } = &mut a.slot_tracks[1] {
        keys[0].curve = SlotRgbaCurve::Bezier {
            controls: [[2., 0.8, 8., 0.7]; 4],
            dark_controls: None,
        };
    }
    p.animations = vec![a];
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
    normalize_wire_track_order(&mut p).unwrap();
    let source = roundtrip(&p);
    let before = p.clone();
    let track = p.animations[0]
        .slot_tracks
        .iter_mut()
        .find(|t| t.slot() == 0)
        .unwrap();
    if let SlotTimeline::Rgba { keys, .. } = track {
        keys[0].dark_values[1] = 0.25;
        assert_eq!(keys[0].frame.to_bits(), (-0f32).to_bits());
    }
    let edited = roundtrip(&p);
    assert_ne!(source, edited);
    assert_eq!(before.rig, p.rig);
    assert_eq!(before.slots, p.slots);
    assert_eq!(before.slot_dark_colors, p.slot_dark_colors);
    assert_eq!(before.wire, p.wire);
    p = before;
    let track = p.animations[0]
        .slot_tracks
        .iter_mut()
        .find(|t| t.slot() == 0)
        .unwrap();
    if let SlotTimeline::Rgba { keys, .. } = track {
        keys[1].values[2] = 0.125;
    }
    roundtrip(&p);
}
#[test]
fn unsupported_dark_alpha_curves_lanes_targets_and_raw_payloads_fail_closed() {
    let mut p = fixture();
    p.slot_dark_colors = vec![SlotDarkColor {
        slot: 0,
        enabled: true,
        color: [10, 20, 30, 255],
    }];
    let mut a = Animation::new("color".into());
    a.slot_tracks = vec![SlotTimeline::Rgba {
        slot: 0,
        keys: vec![
            key(2.25, [0.125, 0.25, 0.5, 1.], [0.25, 0.5, 0.75]),
            key(9., [1.; 4], [0.5; 3]),
        ],
    }];
    p.animations = vec![a];
    roundtrip(&p);
    for alpha in [0, 1, 254] {
        let mut bad = p.clone();
        bad.slot_dark_colors[0].color[3] = alpha;
        assert!(normalize_slot_dark_colors(&mut bad).is_err());
        assert!(encode_scene_payload(&bad).is_err());
        assert!(decode_scene(&raw(&bad)).is_err());
    }
    let mut duplicate = p.clone();
    duplicate
        .slot_dark_colors
        .push(duplicate.slot_dark_colors[0]);
    assert!(normalize_slot_dark_colors(&mut duplicate).is_err());
    assert!(encode_scene_payload(&duplicate).is_err());
    let mut foreign = p.clone();
    foreign.slot_dark_colors[0].slot = 2;
    assert!(normalize_slot_dark_colors(&mut foreign).is_err());
    assert!(encode_scene_payload(&foreign).is_err());
    for curve in [
        SlotRgbaCurve::Stepped,
        SlotRgbaCurve::Bezier {
            controls: [[3., 0.2, 8., 0.8]; 4],
            dark_controls: None,
        },
        SlotRgbaCurve::Bezier {
            controls: [[3., 0.2, 8., 0.8]; 4],
            dark_controls: Some([[3., 0.2, 8., 0.8]; 3]),
        },
    ] {
        let mut bad = p.clone();
        if let SlotTimeline::Rgba { keys, .. } = &mut bad.animations[0].slot_tracks[0] {
            keys[0].curve = curve;
        }
        assert!(encode_scene_payload(&bad).is_err());
        assert!(decode_scene(&raw(&bad)).is_err());
    }
    let mut disabled = p.clone();
    disabled.slot_dark_colors[0].enabled = false;
    assert!(encode_scene_payload(&disabled).is_err());
    assert!(decode_scene(&raw(&disabled)).is_err());
    for value in [f32::NAN, f32::INFINITY, -0.01, 1.01] {
        let mut bad = p.clone();
        if let SlotTimeline::Rgba { keys, .. } = &mut bad.animations[0].slot_tracks[0] {
            keys[0].dark_values[2] = value;
        }
        assert!(encode_scene_payload(&bad).is_err());
        assert!(decode_scene(&raw(&bad)).is_err());
    }
    let bytes = roundtrip(&p);
    let mut needle = vec![0x85, 1, 1];
    for v in [2.25f32, 0.125, 0.25, 0.5, 1., 0.25, 0.5, 0.75] {
        needle.extend(v.to_be_bytes());
    }
    needle.push(0);
    let at = bytes
        .windows(needle.len())
        .position(|v| v == needle)
        .unwrap();
    let mut bad = bytes.clone();
    bad[at + needle.len() - 1] = 2;
    assert!(decode_scene(&bad).is_err());
    for end in at..at + needle.len() {
        assert!(decode_scene(&bytes[..end]).is_err());
    }
}
