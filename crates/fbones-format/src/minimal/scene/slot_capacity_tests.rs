use super::*;

fn model(n: usize) -> SceneProject {
    let mut p = SceneProject::from(&RegionProject {
        rig: MinimalProject::new("own slot capacity".into(), [86; 16]),
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    });
    for i in 0..n {
        p.slots.push(SceneSlot {
            name: format!("slot{i:03}"),
            bone: 0,
            color: [255, 128, 64, 255],
            blend: BlendMode::Normal,
            active_attachment: (i % 3 != 0).then_some(0),
            attachments: vec![SceneAttachment::Region(Region {
                name: format!("image{i:03}"),
                path: String::new(),
                x: i as f32,
                y: -0.,
                rotation: 0.,
                scale_x: 1.,
                scale_y: 1.,
                width: 16.,
                height: 16.,
            })],
        });
        p.attachment_order.push(AttachmentAddress {
            slot: i,
            attachment: 0,
        });
    }
    p
}

fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let payload = encode_scene_payload(p).unwrap();
    let decoded = decode_scene(&payload).unwrap();
    assert_eq!(&decoded, p);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), payload);
    assert!(decoded
        .slots
        .iter()
        .all(|s| { s.attachments[0].image().unwrap().y.to_bits() == (-0.0f32).to_bits() }));
    payload
}

#[test]
fn scene_slot_inventory_and_full_offset_records_retain_512_identities() {
    for n in [128, 129, 265, MAX_SCENE_SLOTS] {
        let mut p = model(n);
        p.animations[0].slot_tracks.push(SlotTimeline::Rgba {
            slot: n - 1,
            keys: vec![SlotRgbaKey {
                frame: -0.,
                values: [1., 0.5, 0.25, 1.],
                dark_values: [0.; 3],
                curve: SlotRgbaCurve::Linear,
            }],
        });
        p.animations[0].slot_tracks.push(SlotTimeline::Attachment {
            slot: n - 1,
            keys: vec![SlotAttachmentKey {
                frame: 0.,
                attachment: None,
            }],
        });
        let reverse: Vec<_> = (0..n).rev().collect();
        let reversed_offsets = draw_order_offsets(&reverse).unwrap();
        assert_eq!(
            draw_order_permutation(n, &reversed_offsets).unwrap(),
            reverse
        );
        p.animations[0].draw_order = vec![
            DrawOrderKey {
                frame: -0.,
                // Explicit identity records remain distinct from Setup reset.
                offsets: (0..n).map(|slot| SlotOffset { slot, offset: 0 }).collect(),
            },
            DrawOrderKey {
                frame: 1.,
                offsets: reversed_offsets,
            },
            DrawOrderKey {
                frame: 2.,
                offsets: vec![],
            },
        ];
        let payload = roundtrip(&p);
        assert!(regions::decode_regions(&payload).is_err());
        assert_eq!(p.animations[0].draw_order[0].offsets.len(), n);
        assert_eq!(
            p.animations[0].draw_order[0].frame.to_bits(),
            (-0.0f32).to_bits()
        );
        assert_eq!(
            draw_order_permutation(n, &[]).unwrap(),
            (0..n).collect::<Vec<_>>()
        );
    }
}

#[test]
fn legacy_slot_limit_remains_128_in_scene_enabled_builds() {
    let p = model(128);
    let old = p.to_regions().unwrap();
    let payload = regions::encode_region_payload(&old).unwrap();
    assert_eq!(regions::decode_regions(&payload).unwrap(), old);
    let p = model(129);
    assert!(encode_scene_payload(&p).is_ok());
    assert!(p.to_regions().is_err());
    let mut over = old;
    let mut extra = over.slots[0].clone();
    extra.name = "legacy over limit".into();
    extra.attachment = None;
    extra.visible = false;
    over.slots.push(extra);
    assert!(regions::encode_region_payload(&over).is_err());
    // Independently construct the otherwise known legacy graph to exercise decode.
    let raw = super::super::encode_record_payload(
        &super::super::project_record_with_regions(
            &over.rig,
            &over.slots,
            &over.region_order,
            &over.images_root,
        ),
        over.rig.identity,
    );
    assert!(regions::decode_regions(&raw).is_err());
}

#[test]
fn slot_and_order_capacity_does_not_relax_other_invariants() {
    let mut over = model(MAX_SCENE_SLOTS);
    let mut extra = over.slots[0].clone();
    extra.name = "over limit".into();
    extra.attachments.clear();
    extra.active_attachment = None;
    over.slots.push(extra);
    assert!(encode_scene_payload(&over).is_err());
    assert!(draw_order_permutation(MAX_SCENE_SLOTS + 1, &[]).is_err());
    assert!(draw_order_offsets(&(0..=MAX_SCENE_SLOTS).collect::<Vec<_>>()).is_err());
    for offsets in [
        vec![SlotOffset {
            slot: 511,
            offset: 1,
        }],
        vec![SlotOffset {
            slot: 512,
            offset: 0,
        }],
        vec![SlotOffset {
            slot: 0,
            offset: -1,
        }],
        vec![SlotOffset {
            slot: 0,
            offset: i32::MAX,
        }],
        vec![SlotOffset {
            slot: 0,
            offset: i32::MIN,
        }],
        vec![
            SlotOffset { slot: 0, offset: 1 },
            SlotOffset { slot: 1, offset: 0 },
        ],
        vec![
            SlotOffset {
                slot: 511,
                offset: 0,
            },
            SlotOffset {
                slot: 510,
                offset: 0,
            },
        ],
    ] {
        assert!(draw_order_permutation(MAX_SCENE_SLOTS, &offsets).is_err());
    }
    let mut duplicate: Vec<_> = (0..MAX_SCENE_SLOTS).collect();
    duplicate[511] = 510;
    assert!(draw_order_offsets(&duplicate).is_err());
    let mut bad = model(512);
    bad.slots[511].active_attachment = Some(1);
    assert!(encode_scene_payload(&bad).is_err());
    bad = model(512);
    bad.attachment_order[511].slot = 512;
    assert!(encode_scene_payload(&bad).is_err());
}
