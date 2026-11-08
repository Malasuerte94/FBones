use super::*;
use crate::{
    project::{open_document, Session},
    rig::RigEdit,
    scene_edit::{SceneEdit, SceneHistory},
};
use fbones_format::{
    minimal::{meshes::Vertex, scene::*},
    ProjectEnvelope,
};

fn address(slot: usize) -> AttachmentAddress {
    AttachmentAddress {
        slot,
        attachment: 0,
    }
}
fn roundtrip(project: &SceneProject) {
    let bytes = encode_scene_payload(project).unwrap();
    let decoded = decode_scene(&bytes).unwrap();
    assert_eq!(&decoded, project);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
}
fn fixture() -> SceneProject {
    let mut p = crate::scene_wire_fixture::project();
    p.animations[0].slot_tracks.clear();
    p.attachment_colors = vec![
        AttachmentColor {
            attachment: address(0),
            color: [90, 140, 220, 120],
        },
        AttachmentColor {
            attachment: address(1),
            color: [200, 80, 40, 210],
        },
    ];
    p.wire.as_mut().unwrap().animation_layouts = (0..p.animations.len())
        .map(|a| animation_layout(&p, a).unwrap())
        .collect();
    normalize_wire_track_order(&mut p).unwrap();
    normalize_attachment_colors(&mut p).unwrap();
    p
}

#[test]
fn attachment_tint_stable_remap_conversion_delete_white_and_history_preserve_other_colors() {
    let original = fixture();
    roundtrip(&original);
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    let target = history.frame().attachment_ids[0][0];
    let destination = history.frame().slot_ids[1];
    let other = history.frame().attachment_ids[1][0];
    history
        .apply(SceneEdit::Rig(RigEdit::MoveAttachment {
            id: target,
            slot: destination,
        }))
        .unwrap();
    let a = history.frame().attachment_address(target).unwrap();
    assert_eq!(
        history.frame().project.attachment_color(a),
        [90, 140, 220, 120]
    );
    assert_eq!(
        history
            .frame()
            .project
            .attachment_color(history.frame().attachment_address(other).unwrap()),
        [200, 80, 40, 210]
    );
    roundtrip(&history.frame().project);
    history
        .apply(SceneEdit::Rig(RigEdit::AttachmentEdit {
            id: target,
            edit: Box::new(RigEdit::ConvertMesh { id: destination }),
        }))
        .unwrap();
    assert!(history.frame().attachment(target).unwrap().mesh().is_some());
    assert_eq!(
        history.frame().project.attachment_color(a),
        [90, 140, 220, 120]
    );
    roundtrip(&history.frame().project);
    history
        .apply(SceneEdit::SetAttachmentColor {
            id: target,
            color: u32::MAX,
        })
        .unwrap();
    assert!(history
        .frame()
        .project
        .attachment_colors
        .iter()
        .all(|color| color.attachment != a));
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(
        history.frame().project.attachment_color(a),
        [90, 140, 220, 120]
    );
    history.apply(SceneEdit::Redo).unwrap();
    assert_eq!(history.frame().project.attachment_color(a), [255; 4]);
    history
        .apply(SceneEdit::DeleteAttachment { id: target })
        .unwrap();
    let remaining = history.frame().attachment_address(other).unwrap();
    assert_eq!(remaining.attachment, 0);
    assert_eq!(
        history.frame().project.attachment_color(remaining),
        [200, 80, 40, 210]
    );
    roundtrip(&history.frame().project);
    assert_eq!(history.frame().project.rig, original.rig);
}

fn clip() -> SceneAttachment {
    SceneAttachment::Clipping(Clipping {
        name: "Own clip tint remains separate".into(),
        end_slot: Some(1),
        convex: true,
        inverse: false,
        color: [10, 30, 50, 70],
        weighted: false,
        bones: vec![1],
        vertices: [[-2., -2.], [2., -2.], [2., 2.]]
            .into_iter()
            .map(|position| Vertex {
                weights: vec![1.],
                positions: position.into(),
            })
            .collect(),
        edges: vec![0, 1, 1, 2, 2, 0],
    })
}
#[test]
fn attachment_tint_rejects_nonimage_missing_and_stale_targets_atomically() {
    let mut history = SceneHistory::new(fixture(), true).unwrap();
    let slot = history.frame().slot_ids[0];
    history
        .apply(SceneEdit::InsertAttachment {
            slot,
            attachment: clip(),
            activate: false,
        })
        .unwrap();
    let id = *history.frame().attachment_ids[0].last().unwrap();
    let before = history.frame().project.clone();
    for id in [id, u64::MAX] {
        assert!(history
            .apply(SceneEdit::SetAttachmentColor {
                id,
                color: 0x12345678
            })
            .is_err());
        assert_eq!(history.frame().project, before);
    }
    let target = history.frame().attachment_ids[0][0];
    let mut replacement = clip();
    if let SceneAttachment::Clipping(c) = &mut replacement {
        c.name = "Own replacement".into();
    }
    assert!(history
        .apply(SceneEdit::ReplaceAttachment {
            id: target,
            attachment: replacement
        })
        .is_err());
    assert_eq!(history.frame().project, before);
    roundtrip(&before);
    assert!(serde_json::from_value::<RigEdit>(
        serde_json::json!({"type":"setAttachmentColor","id":target,"color":-1})
    )
    .is_err());
}

#[test]
fn attachment_tint_native_summary_edit_save_reopen_preserves_keys_slots_and_geometry() {
    let directory = tempfile::tempdir().unwrap();
    std::fs::create_dir(directory.path().join("images")).unwrap();
    let mut original = crate::scene_sequence_fixture::project();
    original.attachment_colors = vec![
        AttachmentColor {
            attachment: address(0),
            color: [110, 160, 210, 130],
        },
        AttachmentColor {
            attachment: address(1),
            color: [190, 100, 70, 230],
        },
    ];
    for key in crate::animation_sequence::all_image_keys(&original).unwrap() {
        std::fs::write(
            directory.path().join("images").join(format!("{key}.png")),
            crate::images::tests::png([160, 90, 40, 255]),
        )
        .unwrap();
    }
    let source = directory.path().join("own-color-source.spine");
    std::fs::write(&source, encode_scene(&original).unwrap()).unwrap();
    let session = Session::default();
    let before = session
        .replace(open_document(source).unwrap(), false)
        .unwrap();
    let target = before.slots[0].attachments[0].id;
    assert_eq!(
        before.slots[0].attachments[0].color,
        u32::from_be_bytes([110, 160, 210, 130])
    );
    assert_eq!(
        before.slots[1].attachments[0].color,
        u32::from_be_bytes([190, 100, 70, 230])
    );
    let after = session
        .edit(
            before.revision,
            RigEdit::SetAttachmentColor {
                id: target,
                color: 0x2468ac80,
            },
        )
        .unwrap();
    assert_eq!(after.slots[0].attachments[0].color, 0x2468ac80);
    assert_eq!(
        serde_json::to_value(&after.animations).unwrap(),
        serde_json::to_value(&before.animations).unwrap()
    );
    assert!(session
        .edit(
            before.revision,
            RigEdit::SetAttachmentColor {
                id: target,
                color: 0
            }
        )
        .is_err());
    let undone = session.edit(after.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        undone.slots[0].attachments[0].color,
        before.slots[0].attachments[0].color
    );
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(redone.slots[0].attachments[0].color, 0x2468ac80);
    let target_file = directory.path().join("saved-color.fbones");
    session
        .save_snapshot(session.prepare_save(false).unwrap(), target_file.clone())
        .unwrap();
    let envelope = ProjectEnvelope::inspect(std::fs::read(&target_file).unwrap()).unwrap();
    let model = decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
    assert_eq!(model.attachment_color(address(0)), [0x24, 0x68, 0xac, 0x80]);
    assert_eq!(model.attachment_color(address(1)), [190, 100, 70, 230]);
    assert_eq!(model.rig, original.rig);
    assert_eq!(model.slots, original.slots);
    assert_eq!(model.animations, original.animations);
    assert_eq!(model.attachment_sequences, original.attachment_sequences);
    let reopened = Session::default()
        .replace(open_document(target_file).unwrap(), false)
        .unwrap();
    assert_eq!(reopened.slots[0].attachments[0].color, 0x2468ac80);
    assert_eq!(
        reopened.slots[1].attachments[0].color,
        u32::from_be_bytes([190, 100, 70, 230])
    );
}
