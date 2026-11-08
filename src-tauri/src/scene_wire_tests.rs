use super::*;
use crate::{
    project::{open_document, Session},
    rig::RigEdit,
    scene_edit::{SceneEdit, SceneHistory},
};
use fbones_format::minimal::scene::{
    decode_scene, encode_scene, encode_scene_payload, SceneProject,
};
use fbones_format::ProjectEnvelope;
use serde_json::json;

fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let payload = encode_scene_payload(p).unwrap();
    let decoded = decode_scene(&payload).unwrap();
    assert_eq!(
        &decoded, p,
        "The whole typed model, including metadata, must survive reopening"
    );
    assert_eq!(encode_scene_payload(&decoded).unwrap(), payload);
    payload
}
fn animation(history: &mut SceneHistory, value: serde_json::Value) {
    history
        .apply(SceneEdit::Animation(serde_json::from_value(value).unwrap()))
        .unwrap();
    roundtrip(&history.frame().project);
}
fn rig(history: &mut SceneHistory, value: serde_json::Value) {
    history
        .apply(SceneEdit::Rig(serde_json::from_value(value).unwrap()))
        .unwrap();
    roundtrip(&history.frame().project);
}
fn selector_frames(history: &SceneHistory) -> Vec<(u64, f32)> {
    history.frame().project.animations[0]
        .tracks
        .iter()
        .enumerate()
        .flat_map(|(t, track)| {
            track
                .keys
                .iter()
                .enumerate()
                .map(move |(k, key)| (history.frame().animation_key_ids[0][t][k], key.frame))
        })
        .collect()
}

#[test]
fn wire_key_edits_rename_and_new_tracks_preserve_layout_aliases_setup_and_stable_keys() {
    let original = crate::scene_wire_fixture::project();
    let original_bytes = roundtrip(&original);
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    let initial_ids = selector_frames(&history);
    let translate = history.frame().project.animations[0]
        .tracks
        .iter()
        .position(|t| t.bone == 1)
        .unwrap();
    let moved_id = history.frame().animation_key_ids[0][translate][1];
    animation(
        &mut history,
        json!({"type":"moveAnimationKeys","animation":0,"keys":[moved_id],"deltaFrames":3}),
    );
    assert_eq!(history.frame().project.rig, original.rig);
    assert_eq!(history.frame().project.wire, original.wire);
    assert!(selector_frames(&history).contains(&(moved_id, 33.)));
    assert_eq!(
        selector_frames(&history)
            .iter()
            .map(|v| v.0)
            .collect::<Vec<_>>(),
        initial_ids.iter().map(|v| v.0).collect::<Vec<_>>()
    );
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(roundtrip(&history.frame().project), original_bytes);
    history.apply(SceneEdit::Redo).unwrap();
    assert!(selector_frames(&history).contains(&(moved_id, 33.)));

    let before_tracks = history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .animation_layouts[0]
        .clone();
    // Inserting a new slot track in an early retained group changes traversal
    // order; its key IDs must stay attached to their own tracks after reopening.
    animation(
        &mut history,
        json!({"type":"setAnimationSlotKeys","animation":0,"keys":[{"slot":1,"channel":"attachment","frame":6,"attachment":1}]}),
    );
    let layout = &history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .animation_layouts[0];
    assert_eq!(layout.groups[0].owner, before_tracks.groups[0].owner);
    assert_eq!(
        &layout.groups[0].tracks[..2],
        &before_tracks.groups[0].tracks
    );
    assert!(matches!(
        layout.groups[0].tracks[2],
        WireTrack::Slot {
            slot: 1,
            channel: WireSlotChannel::Attachment
        }
    ));
    let stored = history.frame().project.animations[0].slot_tracks.clone();
    assert_eq!(
        stored.iter().map(SlotTimeline::slot).collect::<Vec<_>>(),
        [1, 1, 0]
    );

    let before_bone = history.frame().project.rig.bones[1].clone();
    let mut changed = before_bone.clone();
    changed.name = "renamed bone".into();
    history
        .apply(SceneEdit::SetBone {
            id: 1,
            bone: changed,
        })
        .unwrap();
    roundtrip(&history.frame().project);
    assert_eq!(history.frame().project.slots[0].name, "red");
    assert_eq!(
        history.frame().project.slots[0].attachments[0].name(),
        "red"
    );
    assert!(!history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .any(|s| s.owner == WireStringOwner::Bone(1) && s.tag == 1));
    animation(
        &mut history,
        json!({"type":"duplicateAnimation","id":0,"name":"independent copy"}),
    );
    let all_ids = history
        .frame()
        .animation_key_ids
        .iter()
        .flatten()
        .flatten()
        .copied()
        .collect::<Vec<_>>();
    assert_eq!(
        all_ids.iter().copied().collect::<HashSet<_>>().len(),
        all_ids.len()
    );
    animation(&mut history, json!({"type":"deleteAnimation","id":1}));
    assert_eq!(history.frame().project.animations.len(), 2);
    assert_eq!(
        history.frame().project.animations[1].name,
        "independent copy"
    );
    assert_eq!(
        history
            .frame()
            .project
            .wire
            .as_ref()
            .unwrap()
            .animation_layouts[1]
            .animation,
        1
    );
}

#[test]
fn wire_structural_edits_remap_source_permissions_and_string_owners_without_index_reuse() {
    let original = crate::scene_wire_fixture::project();
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    history
        .apply(SceneEdit::ReorderSlot { id: 1, index: 0 })
        .unwrap();
    roundtrip(&history.frame().project);
    assert_eq!(history.frame().slot_ids, [1, 0]);
    assert_eq!(
        history
            .frame()
            .project
            .wire
            .as_ref()
            .unwrap()
            .zero_size_meshes,
        [AttachmentAddress {
            slot: 0,
            attachment: 0
        }]
    );
    assert!(history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .any(|s| s.owner
            == WireStringOwner::Attachment(AttachmentAddress {
                slot: 0,
                attachment: 0
            })
            && s.tag == 14));
    // A move changes the attachment's local address and the deform/track owner.
    rig(
        &mut history,
        json!({"type":"moveAttachment","id":1,"slot":0}),
    );
    assert_eq!(
        history
            .frame()
            .project
            .wire
            .as_ref()
            .unwrap()
            .zero_size_meshes,
        [AttachmentAddress {
            slot: 1,
            attachment: 1
        }]
    );
    history
        .apply(SceneEdit::DeleteAttachment { id: 1 })
        .unwrap();
    roundtrip(&history.frame().project);
    assert!(history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .zero_size_meshes
        .is_empty());
    let guarded = history.frame().project.clone();
    assert!(history.apply(SceneEdit::DeleteSlot { id: 1 }).is_err());
    assert_eq!(history.frame().project, guarded);
    let green_slot = history
        .frame()
        .slot_ids
        .iter()
        .position(|id| *id == 1)
        .unwrap();
    let slot_track = history.frame().project.animations[0]
        .slot_tracks
        .iter()
        .position(|t| t.slot() == green_slot)
        .unwrap();
    let keys = history.frame().animation_slot_key_ids[0][slot_track].clone();
    animation(
        &mut history,
        json!({"type":"deleteAnimationKeys","animation":0,"keys":keys}),
    );
    history.apply(SceneEdit::DeleteSlot { id: 1 }).unwrap();
    roundtrip(&history.frame().project);
    assert_eq!(history.frame().slot_ids, [0]);
    assert!(history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .all(|s| !matches!(s.owner, WireStringOwner::Slot(i) if i > 0)));
    history
        .apply(SceneEdit::CreateSlot {
            bone: 1,
            name: Some("new unrelated slot".into()),
        })
        .unwrap();
    roundtrip(&history.frame().project);
    let new_id = *history.frame().slot_ids.last().unwrap();
    assert_ne!(new_id, 1);
    assert!(!history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .any(|s| s.owner == WireStringOwner::Slot(1)));
    history.apply(SceneEdit::Undo).unwrap();
    history.apply(SceneEdit::Undo).unwrap();
    history.apply(SceneEdit::Undo).unwrap();
    history.apply(SceneEdit::Undo).unwrap();
    history.apply(SceneEdit::Undo).unwrap();
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, original);
}

#[test]
fn retained_mesh_zero_metadata_allows_pose_edits_but_quad_reset_is_atomic_and_png_creation_stays_positive(
) {
    let mut history = SceneHistory::new(crate::scene_wire_fixture::project(), true).unwrap();
    let before = history.frame().project.clone();
    let source_vertices = before.slots[1].attachments[0]
        .mesh()
        .unwrap()
        .vertices
        .clone();
    assert!(source_vertices
        .iter()
        .any(|v| v.positions.iter().any(|v| *v != 0.)));
    let reset: RigEdit = serde_json::from_value(
        json!({"type":"attachmentEdit","id":1,"edit":{"type":"resetMesh","id":1}}),
    )
    .unwrap();
    assert!(history.apply(SceneEdit::Rig(reset)).is_err());
    assert_eq!(history.frame().project, before);
    assert!(!history.can_undo());
    rig(
        &mut history,
        json!({"type":"attachmentEdit","id":1,"edit":{"type":"moveVertex","id":1,"vertex":0,"x":18,"y":13}}),
    );
    let mesh = history.frame().project.slots[1].attachments[0]
        .mesh()
        .unwrap();
    assert_eq!(mesh.image.width.to_bits(), 0);
    assert_eq!(mesh.image.height.to_bits(), 0);
    assert_ne!(mesh.vertices, source_vertices);
    assert!(mesh
        .vertices
        .iter()
        .flat_map(|v| &v.positions)
        .all(|v| v.is_finite()));
    let moved = history.frame().project.clone();
    let placement = crate::rig::ImagePlacement {
        image: "new".into(),
        path: "red".into(),
        x: 0.,
        y: 0.,
        width: 0.,
        height: 20.,
    };
    assert!(history
        .apply(SceneEdit::AddImages {
            bone: 1,
            slot: None,
            images: vec![placement]
        })
        .is_err());
    assert_eq!(history.frame().project, moved);
}

#[test]
fn native_wire_scene_key_save_close_open_preserves_full_model_resources_and_original_source() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir(dir.path().join("images")).unwrap();
    let mut png_bytes = vec![];
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, 2, 2);
        encoder.set_color(png::ColorType::Rgba);
        encoder
            .write_header()
            .unwrap()
            .write_image_data(&[255; 16])
            .unwrap();
    }
    for name in ["red", "green"] {
        std::fs::write(dir.path().join(format!("images/{name}.png")), &png_bytes).unwrap();
    }
    let mut original = crate::scene_wire_fixture::project();
    original.audio_root = original.images_root.clone();
    for tag in [3, 34] {
        original.wire.as_mut().unwrap().strings.push(
            fbones_format::minimal::scene::WireStringAlias {
                owner: WireStringOwner::Skeleton,
                tag,
                group: 40,
                encoding: None,
            },
        );
    }
    normalize_wire_strings(&mut original).unwrap();
    let source = dir.path().join("source.spine");
    let source_bytes = encode_scene(&original).unwrap();
    std::fs::write(&source, &source_bytes).unwrap();
    let session = Session::default();
    let opened = session
        .replace(open_document(source.clone()).unwrap(), true)
        .unwrap();
    assert!(!opened.inspection_only);
    assert_eq!(opened.bones.len(), 3);
    assert!(opened.slots.iter().all(|s| s.image_available));
    let clip = &opened.animations[0];
    let bone = opened.bones.iter().find(|b| b.name == "red").unwrap().id;
    let changed = session.edit(opened.revision, serde_json::from_value(json!({"type":"setAnimationKeys","animation":clip.id,"keys":[{"bone":bone,"channel":"translate","frame":15,"values":[13.25,-7.5],"curve":"linear"}]})).unwrap()).unwrap();
    assert_eq!(changed.revision, opened.revision + 1);
    assert_eq!(
        changed.bones.iter().map(|b| b.x).collect::<Vec<_>>(),
        opened.bones.iter().map(|b| b.x).collect::<Vec<_>>()
    );
    let target = dir.path().join("portable/edited.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), target.clone())
        .unwrap();
    let saved = ProjectEnvelope::inspect(std::fs::read(&target).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    let model = decode_scene(&saved).unwrap();
    assert_eq!(roundtrip(&model), saved);
    assert_eq!(model.wire.as_ref().unwrap().editor_scalar_46.get(), 50.);
    assert_eq!(
        model.wire.as_ref().unwrap().zero_size_meshes,
        [AttachmentAddress {
            slot: 1,
            attachment: 0
        }]
    );
    assert_eq!(model.slots, original.slots);
    assert_eq!(model.rig, original.rig);
    assert_eq!(model.images_root, "./images/");
    assert_eq!(model.audio_root, "./audio");
    for name in ["red", "green"] {
        assert_eq!(
            std::fs::read(dir.path().join(format!("portable/images/{name}.png"))).unwrap(),
            png_bytes
        );
    }
    session.close(false).unwrap();
    let reopened = session
        .replace(open_document(target).unwrap(), false)
        .unwrap();
    assert!(!reopened.inspection_only);
    assert_eq!(
        reopened.animations[0]
            .tracks
            .iter()
            .find(|t| t.bone == reopened.bones.iter().find(|b| b.name == "red").unwrap().id)
            .unwrap()
            .keys
            .iter()
            .find(|k| k.frame == 15.)
            .unwrap()
            .values,
        [13.25, -7.5]
    );
    assert_eq!(std::fs::read(source).unwrap(), source_bytes);
}

#[test]
fn resource_rebase_prepares_alias_splits_without_mutation_and_undo_redo_stay_serializable() {
    use fbones_format::minimal::scene::WireStringAlias;
    let mut project = crate::scene_wire_fixture::project();
    project.images_root = "./shared".into();
    project.audio_root = "./shared".into();
    for tag in [3, 34] {
        project
            .wire
            .as_mut()
            .unwrap()
            .strings
            .push(WireStringAlias {
                owner: WireStringOwner::Skeleton,
                tag,
                group: 90,
                encoding: None,
            });
    }
    normalize_wire_strings(&mut project).unwrap();
    let mut rig = crate::scene_edit::SceneRigHistory::new(&project, true);
    rig.apply(
        &mut project,
        RigEdit::SetBoneColor {
            id: 1,
            color: 0x33aaffff,
        },
    )
    .unwrap();
    let untouched = project.clone();
    let mut saved = project.clone();
    saved.images_root = "./images/".into();
    saved.audio_root = "./audio".into();
    normalize_wire_strings(&mut saved).unwrap();
    let plan = rig
        .prepare_resource_rebase("./shared", "./images/", "./shared", "./audio")
        .unwrap();
    assert_eq!(rig.history.frame().project, untouched);
    roundtrip(&rig.history.frame().project);
    rig.apply_resource_rebase(plan);
    rig.mark_saved(&saved);
    project = saved;
    assert!(!rig.dirty(&project));
    rig.apply(&mut project, RigEdit::Undo).unwrap();
    assert_eq!(project.images_root, "./images/");
    assert_eq!(project.audio_root, "./audio");
    assert_ne!(project.rig.bones[1].color, untouched.rig.bones[1].color);
    roundtrip(&project);
    rig.apply(&mut project, RigEdit::Redo).unwrap();
    assert_eq!(project, rig.history.frame().project);
    assert!(!rig.dirty(&project));
    roundtrip(&project);
}
