//! Own slot inventory: empty/None/alternatives and global order are distinct.
use fbones_format::minimal::{
    regions::{BlendMode, Region, RegionProject},
    scene::*,
    Bone, MinimalProject,
};

pub(crate) fn project(count: usize, keyed_order: bool) -> SceneProject {
    assert!(count >= 3);
    let mut rig = MinimalProject::new("Own Scene slot capacity".into(), [94; 16]);
    rig.bones.push(Bone {
        name: "child".into(),
        parent: Some(0),
        x: 20.,
        y: 10.,
        length: 20.,
        ..Bone::root()
    });
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images".into(),
        slots: vec![],
        region_order: vec![],
    });
    for index in 0..count {
        let region = |alternate: bool| {
            SceneAttachment::Region(Region {
                name: format!("Own{index}{}", if alternate { " alternative" } else { "" }),
                path: if alternate { "alternate" } else { "cell" }.into(),
                x: (index % 32) as f32 * 4.,
                y: (index / 32) as f32 * 4.,
                rotation: 0.,
                scale_x: 1.,
                scale_y: 1.,
                width: 8.,
                height: 8.,
            })
        };
        let attachments = if index == 0 {
            vec![]
        } else if index + 1 == count {
            vec![region(false), region(true)]
        } else {
            vec![region(false)]
        };
        let active_attachment = (index != 0 && index + 1 != count && index % 7 != 0).then_some(0);
        for attachment in 0..attachments.len() {
            p.attachment_order.push(AttachmentAddress {
                slot: index,
                attachment,
            });
        }
        p.slots.push(SceneSlot {
            name: format!("slot{index}"),
            bone: 0,
            blend: if index % 2 == 0 {
                BlendMode::Normal
            } else {
                BlendMode::Additive
            },
            color: [100 + (index % 155) as u8, 70, 200, 255],
            attachments,
            active_attachment,
        });
    }
    p.attachment_order.sort_by(|a, b| {
        b.slot
            .cmp(&a.slot)
            .then_with(|| a.attachment.cmp(&b.attachment))
    });
    let mut first = Animation::new("slots".into());
    first.slot_tracks.push(SlotTimeline::Rgba {
        slot: count - 1,
        keys: vec![
            SlotRgbaKey {
                frame: 0.,
                values: [1.; 4],
                dark_values: [0.; 3],
                curve: SlotRgbaCurve::Linear,
            },
            SlotRgbaKey {
                frame: 12.,
                values: [0.1, 0.2, 0.3, 0.4],
                dark_values: [0.; 3],
                curve: SlotRgbaCurve::Linear,
            },
        ],
    });
    first.slot_tracks.push(SlotTimeline::Attachment {
        slot: count - 1,
        keys: vec![
            SlotAttachmentKey {
                frame: 4.,
                attachment: None,
            },
            SlotAttachmentKey {
                frame: 8.,
                attachment: Some(1),
            },
        ],
    });
    if keyed_order {
        first.draw_order = vec![
            DrawOrderKey {
                frame: 5.,
                offsets: draw_order_offsets(&(0..count).rev().collect::<Vec<_>>()).unwrap(),
            },
            DrawOrderKey {
                frame: 12.,
                offsets: vec![],
            },
        ];
    }
    p.animations = vec![first, Animation::new("empty".into())];
    p
}
