use super::*;
use crate::minimal::{
    meshes::{quad, Vertex},
    regions::{BlendMode, Region, RegionProject},
    Bone, MinimalProject,
};
fn image(name: &str) -> Region {
    Region {
        name: name.into(),
        path: String::new(),
        x: 0.,
        y: 0.,
        rotation: 0.,
        scale_x: 1.,
        scale_y: 1.,
        width: 32.,
        height: 24.,
    }
}
fn scene() -> SceneProject {
    let mut rig = MinimalProject::new("own draw deform".into(), [37; 16]);
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
    let clip = Clipping {
        name: "Clip".into(),
        end_slot: Some(2),
        convex: true,
        inverse: false,
        color: [255; 4],
        weighted: false,
        bones: vec![0],
        vertices: [[-40., -20.], [-40., 20.], [40., 20.], [40., -20.]]
            .into_iter()
            .map(|point| Vertex {
                weights: vec![1.],
                positions: point.to_vec(),
            })
            .collect(),
        edges: vec![0, 1, 1, 2, 2, 3, 3, 0],
    };
    let u = quad(image("U"), 1);
    let mut w = quad(image("W"), 1);
    w.weighted = true;
    w.bones = vec![0, 1];
    for row in &mut w.vertices {
        row.weights = vec![1., 0.];
        row.positions = vec![
            row.positions[0],
            row.positions[1],
            row.positions[0] - 20.,
            row.positions[1],
        ];
    }
    for (i, (bone, attachment)) in [
        (0, SceneAttachment::Clipping(clip)),
        (1, SceneAttachment::Mesh(Box::new(u))),
        (1, SceneAttachment::Mesh(Box::new(w))),
    ]
    .into_iter()
    .enumerate()
    {
        p.slots.push(SceneSlot {
            name: format!("slot{i}"),
            bone,
            color: [255; 4],
            blend: BlendMode::Normal,
            attachments: vec![attachment],
            active_attachment: if i == 0 { None } else { Some(0) },
        });
        p.attachment_order.push(AttachmentAddress {
            slot: i,
            attachment: 0,
        });
    }
    p.fps = 24.;
    p
}
fn track(slot: usize, dimension: usize, weighted: bool) -> DeformTimeline {
    let keys = (0..6)
        .map(|i| {
            let frame = i as f32 * 6.;
            let mut offsets = vec![0.; dimension];
            if i == 2 {
                offsets[3] = 3.;
                offsets[4] = -2.;
            }
            if i == 4 {
                offsets[0] = f32::from_bits(1);
                offsets[1] = -0.;
            }
            let curve = match i {
                1 | 3 => DeformCurve::Bezier {
                    controls: [frame + 1.5, 0.2, frame + 4.5, 0.8],
                },
                2 | 5 => DeformCurve::Stepped,
                _ => DeformCurve::Linear,
            };
            DeformKey {
                frame,
                offsets,
                data_present: !weighted || i == 2 || i == 4,
                curve,
            }
        })
        .collect();
    DeformTimeline {
        attachment: AttachmentAddress {
            slot,
            attachment: 0,
        },
        keys,
    }
}
#[test]
fn draw_and_mesh_clip_dense_deform_roundtrip_preserve_all_setup_dormant_bits_and_group_links() {
    let mut p = scene();
    let setup = (p.rig.clone(), p.slots.clone(), p.attachment_order.clone());
    p.animations[0].tracks.push(BoneTimeline {
        bone: 1,
        channel: BoneChannel::Translate,
        keys: vec![BoneKeyframe {
            frame: 0.,
            values: [2., 3.],
            curve: KeyCurve::Linear,
        }],
    });
    p.animations[0].slot_tracks.push(SlotTimeline::Rgba {
        slot: 1,
        keys: vec![SlotRgbaKey {
            frame: 0.,
            values: [1.; 4],
            curve: SlotRgbaCurve::Linear,
        }],
    });
    p.animations[0].deform_tracks =
        vec![track(1, 8, false), track(2, 16, true), track(0, 8, false)];
    p.animations[0].draw_order = vec![
        DrawOrderKey {
            frame: 0.,
            offsets: vec![],
        },
        DrawOrderKey {
            frame: 6.,
            offsets: draw_order_offsets(&[2, 1, 0]).unwrap(),
        },
        DrawOrderKey {
            frame: 12.,
            offsets: vec![],
        },
    ];
    let bytes = encode_scene_payload(&p).unwrap();
    let out = decode_scene(&bytes).unwrap();
    assert_eq!(out, p);
    assert_eq!(encode_scene_payload(&out).unwrap(), bytes);
    assert_eq!((out.rig, out.slots, out.attachment_order), setup);
    assert!(p.to_regions().is_err());
    assert_eq!(
        p.animations[0].deform_tracks[1].keys[4].offsets[1].to_bits(),
        0x8000_0000
    );
}
#[test]
fn permutation_helper_preserves_arbitrary_orders_and_literal_reset_boundary() {
    fn permutations(prefix: Vec<usize>, rest: Vec<usize>) {
        if rest.is_empty() {
            let offsets = draw_order_offsets(&prefix).unwrap();
            assert_eq!(
                draw_order_permutation(prefix.len(), &offsets).unwrap(),
                prefix
            );
            return;
        }
        for i in 0..rest.len() {
            let mut p = prefix.clone();
            let mut r = rest.clone();
            p.push(r.remove(i));
            permutations(p, r);
        }
    }
    permutations(vec![], (0..5).collect());
    assert!(draw_order_offsets(&[0, 1, 2]).unwrap().is_empty());
    let mut p = scene();
    p.animations[0].draw_order.push(DrawOrderKey {
        frame: 0.,
        offsets: vec![SlotOffset { slot: 0, offset: 0 }],
    });
    let bytes = encode_scene_payload(&p).unwrap();
    assert_eq!(
        decode_scene(&bytes).unwrap(),
        p,
        "do not erase an existing literal zero-offset record"
    );
    for offsets in [
        vec![SlotOffset { slot: 0, offset: 4 }],
        vec![
            SlotOffset { slot: 1, offset: 0 },
            SlotOffset { slot: 0, offset: 0 },
        ],
        vec![
            SlotOffset { slot: 0, offset: 1 },
            SlotOffset { slot: 1, offset: 0 },
        ],
    ] {
        assert!(draw_order_permutation(3, &offsets).is_err());
    }
}
#[test]
fn deform_rejects_unrepresentable_zeros_presence_dimensions_and_changed_curve_boundaries() {
    let base = scene();
    let reject = |p: &SceneProject| assert!(encode_scene_payload(p).is_err());
    let mut p = base.clone();
    let mut t = track(2, 16, true);
    t.keys[0].offsets[0] = -0.;
    p.animations[0].deform_tracks.push(t);
    reject(&p);
    let mut p = base.clone();
    let mut t = track(1, 8, false);
    t.keys[0].data_present = false;
    t.keys[0].offsets[0] = 1.;
    p.animations[0].deform_tracks.push(t);
    reject(&p);
    let mut p = base.clone();
    p.animations[0].deform_tracks.push(track(2, 8, true));
    reject(&p);
    let mut p = base.clone();
    let mut t = track(1, 8, false);
    t.keys[2].frame = 6.;
    p.animations[0].deform_tracks.push(t);
    reject(&p);
    let mut p = base.clone();
    let mut t = track(1, 8, false);
    t.keys[0].offsets[0] = f32::NAN;
    p.animations[0].deform_tracks.push(t);
    reject(&p);
    let mut p = base.clone();
    let mut t = track(1, 8, false);
    t.keys[5].curve = DeformCurve::Bezier {
        controls: [31., 0.2, 32., 0.8],
    };
    p.animations[0].deform_tracks.push(t);
    reject(&p);
    let mut p = base.clone();
    p.animations[0].deform_tracks = vec![track(0, 8, false), track(1, 8, false)];
    p.animations[0].tracks.push(BoneTimeline {
        bone: 1,
        channel: BoneChannel::Rotate,
        keys: vec![BoneKeyframe {
            frame: 0.,
            values: [0.; 2],
            curve: KeyCurve::Linear,
        }],
    });
    assert_eq!(
        p.animations[0].deform_track_permutation(&p.slots).unwrap(),
        vec![1, 0]
    );
    reject(&p);
}
#[test]
fn deform_vector_domain_boolean_and_curve_metadata_corruption_never_normalize() {
    let mut p = scene();
    p.animations[0].deform_tracks.push(track(1, 8, false));
    let bytes = encode_scene_payload(&p).unwrap();
    let header = [132, 1, 1, 6, 1, 6, 133, 1, 1];
    let start = bytes
        .windows(header.len())
        .position(|w| w == header)
        .unwrap();
    let vector = start + header.len() + 5;
    assert_eq!(&bytes[vector..vector + 4], &[1, 8, 1, 0]);
    let mut bad = bytes.clone();
    bad[vector] = 0;
    assert!(decode_scene(&bad).is_err());
    let mut bad = bytes.clone();
    bad[vector + 2] = 2;
    assert!(decode_scene(&bad).is_err());
    let key = [133, 1, 1, 0x40, 0xc0, 0, 0, 1];
    let at = bytes.windows(key.len()).position(|w| w == key).unwrap();
    let mut bad = bytes.clone();
    bad[at + key.len() + 16] = 1;
    assert!(decode_scene(&bad).is_err());
}
#[test]
fn new_family_arena_limits_close_encoder_decoder_budget_including_scene_overhead() {
    let mut p = scene();
    let make = |count: usize| DeformTimeline {
        attachment: AttachmentAddress {
            slot: 2,
            attachment: 0,
        },
        keys: (0..count)
            .map(|i| DeformKey {
                frame: i as f32,
                offsets: vec![0.; 16],
                data_present: false,
                curve: DeformCurve::Stepped,
            })
            .collect(),
    };
    p.animations[0].deform_tracks.push(make(4096));
    assert!(encode_scene_payload(&p).is_err());
    p.animations[0].deform_tracks[0] = make(4090);
    assert!(
        encode_scene_payload(&p).is_err(),
        "scene overhead must be included beyond the early animation lower bound"
    );
    p.animations[0].deform_tracks[0] = make(4000);
    let bytes = encode_scene_payload(&p).unwrap();
    assert_eq!(decode_scene(&bytes).unwrap(), p);
    p.animations[0].deform_tracks.clear();
    p.animations[0].draw_order = (0..4096)
        .map(|i| DrawOrderKey {
            frame: i as f32,
            offsets: draw_order_offsets(&[2, 1, 0]).unwrap(),
        })
        .collect();
    assert!(encode_scene_payload(&p).is_err());
}
