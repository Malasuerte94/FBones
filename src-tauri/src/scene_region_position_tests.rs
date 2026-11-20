use super::*;
use crate::evaluation::EvaluationMode;

#[test]
fn set_bone_parent_position_preserves_untouched_authored_bits_and_one_history_step() {
    let (dir, session, initial) = setup();
    let added = add_bone(&session, &initial, 0);
    let unused = added.edited_bone.unwrap();
    let added = add_bone(&session, &added, 0);
    let parent = added.edited_bone.unwrap();
    let parent_updated = session
        .edit(
            added.revision,
            RigEdit::Update {
                id: parent,
                name: "Reflected parent".into(),
                x: 4.25,
                y: 9.,
                rotation: 34.5,
                length: 20.,
                scale_x: Some(-1.25),
                scale_y: Some(0.75),
                shear_x: Some(7.5),
                shear_y: Some(-14.25),
            },
        )
        .unwrap();
    let added = add_bone(&session, &parent_updated, parent);
    let child = added.edited_bone.unwrap();
    let child_updated = session
        .edit(
            added.revision,
            RigEdit::Update {
                id: child,
                name: "Authored child".into(),
                x: 11.5,
                y: -0.,
                rotation: 7.25,
                length: 24.5,
                scale_x: Some(0.875),
                scale_y: Some(1.125),
                shear_x: Some(-12.625),
                shear_y: Some(-0.),
            },
        )
        .unwrap();
    let removed = session
        .edit(child_updated.revision, RigEdit::Delete { id: unused })
        .unwrap();
    session
        .place_images(removed.revision, &["A".into()], child, 24., 15.)
        .unwrap();
    let path = dir.path().join("parent-position.fbones");
    let saved = session
        .save_snapshot(session.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let saved_file = std::fs::read(&path).unwrap();
    let child_index = saved.bones.iter().position(|bone| bone.id == child).unwrap();
    assert_ne!(child_index as u64, child);
    assert_eq!(saved.bones[child_index].parent, Some(parent));
    let before = scene_model(&session);
    let before_bytes = encode_scene_payload(&before).unwrap();
    assert_eq!(
        before.rig.bones[child_index].y.to_bits(),
        (-0.0_f32).to_bits()
    );
    let position = f32::from_bits(0xc08a_1234);
    let mut expected = before;
    expected.rig.bones[child_index].x = position;
    let expected_bytes = encode_scene_payload(&expected).unwrap();
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();

    assert_eq!(
        session
            .edit(
                saved.revision,
                RigEdit::SetBoneParentPosition {
                    id: child,
                    x: None,
                    y: None,
                    compensate_bones: false,
                    compensate_images: false,
                },
            )
            .unwrap_err()
            .code,
        "InvalidSceneEdit"
    );
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        serde_json::to_value(&saved).unwrap()
    );
    assert_eq!(payload(), before_bytes);

    let edit = || RigEdit::SetBoneParentPosition {
        id: child,
        x: Some(position),
        y: None,
        compensate_bones: false,
        compensate_images: false,
    };
    let moved = session.edit(saved.revision, edit()).unwrap();
    assert_eq!(moved.revision, saved.revision + 1);
    assert_eq!(moved.edited_bone, Some(child));
    assert!(moved.dirty);
    let bone = &moved.bones[child_index];
    assert_eq!(bone.x.to_bits(), position.to_bits());
    assert_eq!(bone.y.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(payload(), expected_bytes);
    let repeated = session.edit(moved.revision, edit()).unwrap();
    assert_eq!(
        serde_json::to_value(&repeated).unwrap(),
        serde_json::to_value(&moved).unwrap()
    );

    let undone = session.edit(repeated.revision, RigEdit::Undo).unwrap();
    assert!(!undone.dirty && undone.can_redo);
    assert_eq!(payload(), before_bytes);
    session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(payload(), expected_bytes);
    assert_eq!(std::fs::read(path).unwrap(), saved_file);
}

#[test]
fn set_region_position_updates_only_the_supplied_axis_and_round_trips() {
    let (dir, s, p) = setup();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 21.25, 3.5)
        .unwrap();
    let id = p.slots[0].attachments[0].id;
    s.edit(
        p.revision,
        RigEdit::UpdateAttachment {
            id,
            x: Some(21.25),
            y: Some(-0.0),
            rotation: Some(-0.0),
            scale_x: Some(-1.25),
            scale_y: Some(0.75),
        },
    )
    .unwrap();
    let path = dir.path().join("pixel-position.fbones");
    let p = s
        .save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let before = scene_model(&s);
    let before_bytes = encode_scene_payload(&before).unwrap();
    let mut expected = before;
    expected.slots[0].attachments[0].image_mut().unwrap().x = -9.5;
    let expected_bytes = encode_scene_payload(&expected).unwrap();

    let edit = serde_json::json!({"type":"setRegionPosition","id":id,"x":-9.5});
    let moved = command(&s, &p, edit.clone());
    assert_ne!(moved.revision, p.revision);
    assert_eq!(moved.slots[0].active_attachment_id, Some(id));
    assert_eq!(moved.slots[0].attachments[0].id, id);
    assert_eq!(
        moved.slots[0].attachments[0].region.as_ref().unwrap().x,
        -9.5
    );
    assert!(moved.slots[0].attachments[0].mesh.is_none());
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        expected_bytes
    );

    let repeated = command(&s, &moved, edit);
    assert_eq!(repeated.revision, moved.revision);
    let saved = s
        .save_snapshot(s.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    assert!(!saved.dirty);
    let payload = ProjectEnvelope::inspect(std::fs::read(path).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    assert_eq!(payload, expected_bytes);
    let decoded = decode_scene(&payload).unwrap();
    let SceneAttachment::Region(region) = &decoded.slots[0].attachments[0] else {
        panic!("position edit changed the attachment type");
    };
    assert_eq!(region.y.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(region.rotation.to_bits(), (-0.0_f32).to_bits());

    let undone = s.edit(saved.revision, RigEdit::Undo).unwrap();
    assert_eq!(undone.slots[0].attachments[0].id, id);
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        before_bytes
    );
    let redone = s.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(redone.slots[0].attachments[0].id, id);
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        expected_bytes
    );
}

#[test]
fn set_region_position_rejects_invalid_targets_and_stale_geometry_context_atomically() {
    let (_dir, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let bone = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], bone, 16.5, 20.25)
        .unwrap();
    let slot = p.slots[0].id;
    let region = p.slots[0].attachments[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    let mesh = p.slots[0].attachments[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":mesh,"edit":{"type":"convertMesh","id":slot}}),
    );
    assert_eq!(p.slots[0].active_attachment_id, Some(mesh));
    assert!(p.slots[0].attachments[1].mesh.is_some());
    let position = |id| RigEdit::SetRegionPosition {
        id,
        x: None,
        y: Some(7.5),
    };
    for id in [region, mesh] {
        assert!(s.edit(p.revision, position(id)).is_err());
        assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    }

    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":region}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"spring","bone":bone}}),
    );
    let before = scene_model(&s);
    let before_bytes = encode_scene_payload(&before).unwrap();
    assert_eq!(
        s.edit(p.revision, position(region)).unwrap_err().code,
        "PoseRequired"
    );
    let stale = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
    let frozen = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
    assert_eq!(
        s.edit_in_pose(p.revision, stale.pose_epoch, position(region))
            .unwrap_err()
            .code,
        "StalePose"
    );
    assert_eq!(
        s.edit_in_pose(p.revision - 1, frozen.pose_epoch, position(region))
            .unwrap_err()
            .code,
        "ProjectChanged"
    );
    for (x, y) in [
        (None, None),
        (Some(1.500_000_000_1), Some(7.5)),
        (Some(f64::NAN), Some(7.5)),
        (Some(1_000_000.5), None),
    ] {
        assert!(s
            .edit_in_pose(
                p.revision,
                frozen.pose_epoch,
                RigEdit::SetRegionPosition { id: region, x, y }
            )
            .is_err());
    }
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        before_bytes
    );
    let moved = s
        .edit_in_pose(p.revision, frozen.pose_epoch, position(region))
        .unwrap();
    let mut expected = before;
    expected.slots[0].attachments[0].image_mut().unwrap().y = 7.5;
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        encode_scene_payload(&expected).unwrap()
    );
    let _undone = s.edit(moved.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        before_bytes
    );
}

#[test]
fn sparse_attachment_update_preserves_inactive_region_words_and_history() {
    let (dir, session, initial) = setup();
    let placed = session
        .place_images(initial.revision, &["A".into()], 0, 21.25, 3.5)
        .unwrap();
    let slot = placed.slots[0].id;
    let region = placed.slots[0].attachments[0].id;
    let transformed = session
        .edit(
            placed.revision,
            RigEdit::UpdateAttachment {
                id: region,
                x: Some(21.25),
                y: Some(-0.0),
                rotation: Some(-0.0),
                scale_x: Some(-1.25),
                scale_y: Some(0.75),
            },
        )
        .unwrap();
    session
        .place_attachments(transformed.revision, &["B".into()], slot)
        .unwrap();
    let path = dir.path().join("sparse-region-transform.fbones");
    let saved = session
        .save_snapshot(session.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let sibling = saved.slots[0].attachments[1].id;
    assert_ne!(sibling, region);
    assert_eq!(saved.slots[0].active_attachment_id, Some(sibling));

    let before = scene_model(&session);
    let before_bytes = encode_scene_payload(&before).unwrap();
    let mut expected = before;
    let target = expected.slots[0].attachments[0].image_mut().unwrap();
    let scale_y = f32::from_bits(0xbfd0_1234);
    assert_eq!(target.y.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(target.rotation.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(target.scale_x.to_bits(), (-1.25_f32).to_bits());
    target.scale_y = scale_y;
    let expected_bytes = encode_scene_payload(&expected).unwrap();
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();

    for invalid in [
        serde_json::json!({"type":"updateAttachment","id":region}),
        serde_json::json!({"type":"updateAttachment","id":region,"x":5,"scaleY":1_000_001}),
    ] {
        let edit = serde_json::from_value(invalid).unwrap();
        assert_eq!(
            session.edit(saved.revision, edit).unwrap_err().code,
            "InvalidSceneEdit"
        );
        assert_eq!(session.summary().unwrap().unwrap().revision, saved.revision);
        assert_eq!(payload(), before_bytes);
    }

    let edit = serde_json::json!({"type":"updateAttachment","id":region,"scaleY":scale_y});
    let changed = command(&session, &saved, edit.clone());
    assert_eq!(changed.revision, saved.revision + 1);
    assert_eq!(changed.edited_attachment, Some(region));
    assert_eq!(changed.slots[0].active_attachment_id, Some(sibling));
    assert_eq!(payload(), expected_bytes);
    let repeated = command(&session, &changed, edit);
    assert_eq!(repeated.revision, changed.revision);

    let undone = session.edit(repeated.revision, RigEdit::Undo).unwrap();
    assert!(!undone.dirty && undone.can_redo);
    assert_eq!(undone.edited_attachment, Some(region));
    assert_eq!(payload(), before_bytes);
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(redone.edited_attachment, Some(region));
    assert_eq!(payload(), expected_bytes);
    session
        .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    let persisted = ProjectEnvelope::inspect(std::fs::read(path).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    assert_eq!(persisted, expected_bytes);
}
