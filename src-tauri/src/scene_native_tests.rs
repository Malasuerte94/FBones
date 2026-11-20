use super::*;
#[path = "scene_bone_rename_tests.rs"]
mod bone_rename_tests;
#[path = "scene_constraint_range_tests.rs"]
mod constraint_range_tests;
#[path = "scene_image_path_tests.rs"]
mod image_path_tests;
#[path = "scene_live_physics_tests.rs"]
mod live_physics_tests;
#[path = "scene_parenting_tests.rs"]
mod parenting_tests;
#[path = "scene_region_position_tests.rs"]
mod region_position_tests;
#[path = "scene_compensation_tests.rs"]
mod compensation_tests;
#[path = "scene_transform_match_tests.rs"]
mod transform_match_tests;
#[path = "scene_transform_range_tests.rs"]
mod transform_range_tests;
use fbones_format::minimal::scene::{
    decode_scene, encode_scene_payload, Constraint, SceneAttachment,
};
fn png() -> Vec<u8> {
    let mut data = vec![];
    {
        let mut encoder = png::Encoder::new(&mut data, 4, 4);
        encoder.set_color(png::ColorType::Rgba);
        let mut writer = encoder.write_header().unwrap();
        writer.write_image_data(&[255; 64]).unwrap();
    }
    data
}
fn setup() -> (tempfile::TempDir, Session, ProjectSummary) {
    let d = tempfile::tempdir().unwrap();
    std::fs::create_dir(d.path().join("source")).unwrap();
    std::fs::create_dir(d.path().join("source/nested")).unwrap();
    for name in ["A", "B", "nested/C", "unused"] {
        std::fs::write(d.path().join(format!("source/{name}.png")), png()).unwrap();
    }
    let s = Session::default();
    let p = s
        .replace(new_document("scene".into()).unwrap(), true)
        .unwrap();
    let p = s
        .select_images_folder(p.revision, &d.path().join("source"))
        .unwrap();
    (d, s, p)
}
fn command(s: &Session, p: &ProjectSummary, value: serde_json::Value) -> ProjectSummary {
    s.edit(p.revision, serde_json::from_value(value).unwrap())
        .unwrap()
}
fn add_bone(s: &Session, p: &ProjectSummary, parent: u64) -> ProjectSummary {
    s.edit(
        p.revision,
        RigEdit::Create {
            color: None,
            parent,
            x: 12.0,
            y: 8.0,
            rotation: 15.0,
            length: 30.0,
        },
    )
    .unwrap()
}
#[test]
fn complete_scene_inactive_mesh_constraints_resources_and_save_history_roundtrip() {
    let (d, s, p) = setup();
    assert!(p.scene_editing);
    let p = s
        .place_images(p.revision, &["A".into()], 0, 10.0, 20.0)
        .unwrap();
    let slot = p.slots[0].id;
    let a = p.slots[0].attachments[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into(), "nested/C".into()], slot)
        .unwrap();
    let b = p.slots[0].attachments[1].id;
    let c = p.slots[0].attachments[2].id;
    assert_eq!(p.slots[0].active_attachment_id, Some(c));
    assert!(p.slots[0].attachments[1..].iter().all(|a| {
        let r = a.region.as_ref().unwrap();
        r.x.abs() < 1e-5 && r.y.abs() < 1e-5
    }));
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":a}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"renameAttachment","id":b,"name":"inactive mesh"}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":b,"edit":{"type":"convertMesh","id":slot}}),
    );
    assert_eq!(p.slots[0].active_attachment_id, Some(a));
    assert!(p.slots[0].mesh.is_none());
    assert!(p.slots[0].attachments[1].mesh.is_some());
    assert_eq!(
        p.slots[0].attachments[1].region.as_ref().unwrap().image,
        "B"
    );
    let p = add_bone(&s, &p, 0);
    let bone = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":b,"edit":{"type":"bindMesh","id":slot,"bones":[0,bone]}}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"spring","bone":bone}}),
    );
    assert!(p.constraints[0]["rotate"].is_null());
    let snapshot = s.prepare_save(true).unwrap();
    let path = d.path().join("portable/scene.fbones");
    let p = s.save_snapshot(snapshot, path.clone()).unwrap();
    assert!(!p.dirty);
    for name in ["A", "B", "nested/C", "unused"] {
        assert_eq!(
            std::fs::read(d.path().join(format!("portable/images/{name}.png"))).unwrap(),
            png()
        );
    }
    let bytes = std::fs::read(&path).unwrap();
    let payload = ProjectEnvelope::inspect(bytes)
        .unwrap()
        .decoded_payload()
        .unwrap();
    let model = decode_scene(&payload).unwrap();
    assert_eq!(encode_scene_payload(&model).unwrap(), payload);
    assert_eq!(model.slots[0].attachments.len(), 3);
    assert_eq!(model.slots[0].active_attachment, Some(0));
    assert!(matches!(
        model.slots[0].attachments[1],
        SceneAttachment::Mesh(_)
    ));
    assert!(matches!(model.constraints[0], Constraint::Physics(_)));
    s.close(false).unwrap();
    let p = s.replace(open_document(path).unwrap(), false).unwrap();
    assert_eq!(p.slots[0].attachments.len(), 3);
    assert_eq!(
        p.slots[0].active_attachment_id,
        Some(p.slots[0].attachments[0].id)
    );
    assert_eq!(p.constraints.len(), 1);
    assert_eq!(
        p.slots[0].attachments[1].region.as_ref().unwrap().image,
        "B"
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":p.slots[0].id,"attachment":null}),
    );
    assert!(!p.slots[0].visible);
    assert!(p.slots[0].region.is_none());
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert!(!p.dirty);
    assert_eq!(p.slots[0].attachments.len(), 3);
}
#[test]
fn attachment_scope_guards_invalid_batch_and_stale_save_are_atomic() {
    let (d, s, p) = setup();
    let p = s
        .place_images(p.revision, &["A".into(), "B".into()], 0, 0.0, 0.0)
        .unwrap();
    let slot = p.slots[0].id;
    let a = p.slots[0].attachments[0].id;
    for value in [
        serde_json::json!({"type":"attachmentEdit","id":a,"edit":{"type":"convertMesh","id":p.slots[1].id}}),
        serde_json::json!({"type":"attachmentEdit","id":a,"edit":{"type":"delete","id":0}}),
        serde_json::json!({"type":"attachmentEdit","id":a,"edit":{"type":"attachmentEdit","id":a,"edit":{"type":"convertMesh","id":slot}}}),
        serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":p.slots[1].attachments[0].id}),
    ] {
        assert!(s
            .edit(p.revision, serde_json::from_value(value).unwrap())
            .is_err());
        assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    }
    assert!(s
        .place_attachments(p.revision, &["B".into(), "missing".into()], slot)
        .is_err());
    assert_eq!(s.summary().unwrap().unwrap().slots[0].attachments.len(), 1);
    let snapshot = s.prepare_save(true).unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"renameAttachment","id":a,"name":"renamed"}),
    );
    assert!(s
        .save_snapshot(snapshot, d.path().join("stale.fbones"))
        .is_err());
    assert!(!d.path().join("stale.fbones").exists());
    assert!(p.dirty);
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    assert_eq!(p.slots[0].attachments[1].id, 2);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    let p = s
        .place_attachments(p.revision, &["nested/C".into()], slot)
        .unwrap();
    assert_eq!(p.slots[0].attachments[1].id, 3);
    assert!(!p.can_redo);
}
#[test]
fn stable_bone_reorder_remaps_inactive_binding_and_constraint_and_blocks_referenced_delete() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let first = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let later = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], first, 30.0, 40.0)
        .unwrap();
    let slot = p.slots[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    let a = p.slots[0].attachments[0].id;
    let b = p.slots[0].attachments[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":b,"edit":{"type":"convertMesh","id":slot}}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":b,"edit":{"type":"bindMesh","id":slot,"bones":[first,later]}}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":a}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"ik","name":"aim","bones":[first],"target":later}}),
    );
    let p = s
        .edit(
            p.revision,
            RigEdit::Reparent {
                id: first,
                parent: later,
            },
        )
        .unwrap();
    assert_eq!(p.slots[0].bone, first);
    assert_eq!(
        p.slots[0].attachments[1].mesh.as_ref().unwrap().bones,
        vec![first, later]
    );
    assert_eq!(p.constraints[0]["target"], later);
    assert_eq!(p.constraints[0]["bones"][0], first);
    assert!(s.edit(p.revision, RigEdit::Delete { id: first }).is_err());
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        p.bones.iter().find(|b| b.id == first).unwrap().parent,
        Some(0)
    );
    assert_eq!(p.slots[0].attachments[1].id, b);
}
#[test]
fn empty_slot_clipping_endpoint_and_constraint_order_history_remain_typed() {
    let (_d, s, p) = setup();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"mask"}),
    );
    let mask = p.slots[0].id;
    assert!(p.slots[0].attachments.is_empty());
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"end"}),
    );
    let end = p.slots[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":mask,"name":"clip","endSlot":end,"convex":false,"inverse":true,"vertices":[{"x":0,"y":0},{"x":20,"y":0},{"x":0,"y":20}]}),
    );
    let clip = p.slots[0].attachments[0].id;
    assert!(p.slots[0].attachments[0].region.is_none());
    assert!(s
        .edit(p.revision, RigEdit::ReorderSlot { id: end, index: 0 })
        .is_err());
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"front"}),
    );
    let front = p.slots[2].id;
    let p = s
        .edit(
            p.revision,
            RigEdit::ReorderSlot {
                id: front,
                index: 0,
            },
        )
        .unwrap();
    assert_eq!(
        p.slots[1].attachments[0]
            .clipping
            .as_ref()
            .unwrap()
            .end_slot,
        end
    );
    assert!(s.edit(p.revision, RigEdit::DeleteSlot { id: end }).is_err());
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"spring","bone":0}}),
    );
    let physics = p.constraints[0]["id"].as_u64().unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"transform","name":"copy","source":0,"bones":[0],"properties":[{"property":"x","offset":3.7,"to":[{"property":"rotate","max":120,"offset":17,"scale":1}]}]}}),
    );
    let transform = p.constraints[1]["id"].as_u64().unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"reorderConstraint","id":transform,"index":0}),
    );
    assert_eq!(p.constraints[0]["id"], transform);
    assert_eq!(p.constraints[1]["id"], physics);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(p.constraints[0]["id"], physics);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"deleteAttachment","id":clip}),
    );
    assert!(p.slots[1].attachments.is_empty());
    let p = s.edit(p.revision, RigEdit::DeleteSlot { id: end }).unwrap();
    assert_eq!(p.slots.len(), 2);
}
#[test]
fn inactive_trace_preview_and_apply_keep_activation_and_undo_one_step() {
    let (_d, s, p) = setup();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 0.0, 0.0)
        .unwrap();
    let slot = p.slots[0].id;
    let a = p.slots[0].attachments[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    let b = p.slots[0].attachments[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":a}),
    );
    let preview = s
        .preview_trace_attachment(p.revision, b, crate::trace::TraceOptions::default())
        .unwrap();
    assert_eq!(preview.attachment_id, b);
    assert_eq!(preview.slot_id, slot);
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    assert!(s.summary().unwrap().unwrap().slots[0].attachments[1]
        .mesh
        .is_none());
    let p = s
        .apply_trace_attachment(p.revision, b, crate::trace::TraceOptions::default())
        .unwrap();
    assert_eq!(p.slots[0].active_attachment_id, Some(a));
    assert!(p.slots[0].mesh.is_none());
    assert!(p.slots[0].attachments[1].mesh.is_some());
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert!(p.slots[0].attachments[1].mesh.is_none());
    assert_eq!(p.slots[0].active_attachment_id, Some(a));
}
#[test]
fn scene_batch_undo_restores_actual_destination_without_previous_slot_focus() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let first = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let second = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["B".into()], second, 0.0, 0.0)
        .unwrap();
    assert!(p.edited_slot.is_some());
    let p = s
        .place_images(p.revision, &["A".into()], first, 10.0, 20.0)
        .unwrap();
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(p.edited_bone, Some(first));
    assert_eq!(p.edited_slot, None);
    assert_eq!(p.edited_attachment, None);
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(p.edited_bone, Some(first));
    assert_eq!(p.slots.last().unwrap().bone, first);
}
#[test]
fn clipping_geometry_transaction_has_one_undo_and_invalid_crossing_changes_nothing() {
    let (_d, s, p) = setup();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"mask"}),
    );
    let slot = p.slots[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":slot,"name":"clip","endSlot":slot,"vertices":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}]}),
    );
    let id = p.slots[0].attachments[0].id;
    let before = p.slots[0].attachments[0]
        .clipping
        .as_ref()
        .unwrap()
        .vertices
        .clone();
    let invalid=serde_json::from_value(serde_json::json!({"type":"moveClippingVertices","id":id,"vertices":[{"vertex":0,"x":50,"y":20}]})).unwrap();
    assert!(s.edit(p.revision, invalid).is_err());
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    assert_eq!(
        s.summary().unwrap().unwrap().slots[0].attachments[0]
            .clipping
            .as_ref()
            .unwrap()
            .vertices,
        before
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"moveClippingVertices","id":id,"vertices":[{"vertex":1,"x":50,"y":0},{"vertex":2,"x":50,"y":40}]}),
    );
    assert_eq!(p.revision, s.summary().unwrap().unwrap().revision);
    assert_eq!(p.slots[0].active_attachment_id, Some(id));
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        p.slots[0].attachments[0]
            .clipping
            .as_ref()
            .unwrap()
            .vertices,
        before
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"insertClippingVertex","id":id,"index":1,"point":{"x":20,"y":0}}),
    );
    assert_eq!(
        p.slots[0].attachments[0]
            .clipping
            .as_ref()
            .unwrap()
            .vertices
            .len(),
        5
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"deleteClippingVertex","id":id,"vertex":1}),
    );
    assert_eq!(
        p.slots[0].attachments[0]
            .clipping
            .as_ref()
            .unwrap()
            .vertices,
        before
    );
}

#[test]
fn image_channel_bounds_are_enforced_before_scene_history_mutation() {
    let (_d, s, p) = setup();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 0.0, 0.0)
        .unwrap();
    let id = p.slots[0].attachments[0].id;
    let edit=serde_json::from_value(serde_json::json!({"type":"updateAttachment","id":id,"x":1e30,"y":0,"rotation":0,"scaleX":1,"scaleY":1})).unwrap();
    assert!(s.edit(p.revision, edit).is_err());
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    assert_eq!(
        s.summary().unwrap().unwrap().slots[0].attachments[0]
            .region
            .as_ref()
            .unwrap()
            .x,
        0.0
    );
}

fn scene_model(s: &Session) -> fbones_format::minimal::scene::SceneProject {
    let state = s.lock().unwrap();
    let Some(Document::Editable { project, .. }) = &state.document else {
        panic!("editable fixture")
    };
    (**project).clone()
}
fn evaluated(
    s: &Session,
    p: &ProjectSummary,
    mode: crate::evaluation::EvaluationMode,
    time: f64,
) -> crate::evaluation::EvaluationSnapshot {
    s.evaluate(
        p.revision,
        crate::evaluation::EvaluationRequest {
            animation_pose: None,
            constraint_pose: None,
            draw_order_pose: None,
            deform_targets: vec![],
            deform_pose: None,
            animation_id: None,
            from_pose_epoch: None,
            mode,
            time,
            motion: None,
        },
    )
    .unwrap()
}
fn snapshot_poses(snapshot: &crate::evaluation::EvaluationSnapshot) -> Vec<crate::rig::Pose> {
    snapshot
        .bones
        .iter()
        .map(|b| crate::rig::Pose {
            x: b.world.x,
            y: b.world.y,
            a: b.world.a,
            b: b.world.b,
            c: b.world.c,
            d: b.world.d,
            angle: b.world.b.atan2(b.world.a).to_degrees(),
        })
        .collect()
}

#[test]
fn evaluated_geometry_snapshot_is_readonly_exact_and_revision_epoch_scoped() {
    use crate::evaluation::{EvaluationMode, EvaluationRequest};
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let member = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let target = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":target,"name":"target","x":45,"y":70,"rotation":0,"length":20}),
    );
    let p = s
        .place_images(p.revision, &["A".into()], member, 25., 35.)
        .unwrap();
    let slot = p.slots[0].id;
    let attachment = p.slots[0].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":attachment,"edit":{"type":"convertMesh","id":slot}}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"ik","name":"aim","bones":[member],"target":target}}),
    );
    let before = scene_model(&s);
    let summary_before = serde_json::to_value(&p).unwrap();
    let snapshot = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        summary_before
    );
    assert_eq!(scene_model(&s), before);
    assert_eq!(
        snapshot.bones.iter().map(|b| b.id).collect::<Vec<_>>(),
        p.bones.iter().map(|b| b.id).collect::<Vec<_>>()
    );
    assert!(
        (snapshot.bones[1].world.b - before.rig.bones[1].rotation.to_radians().sin()).abs() > 0.1
    );
    let world = snapshot_poses(&snapshot);
    let mesh = before.slots[0].attachments[0].mesh().unwrap();
    let point = crate::mesh::world_vertices(mesh, &world)[0];
    let move_edit = || RigEdit::AttachmentEdit {
        id: attachment,
        edit: Box::new(RigEdit::MoveVertex {
            id: slot,
            vertex: 0,
            x: point[0] + 9.0,
            y: point[1] - 5.0,
        }),
    };
    assert_eq!(
        s.edit(p.revision, move_edit()).unwrap_err().code,
        "PoseRequired"
    );
    assert_eq!(
        s.edit_in_pose(p.revision, snapshot.pose_epoch, RigEdit::Undo)
            .unwrap_err()
            .code,
        "InvalidPose"
    );
    assert!(s
        .evaluate(
            p.revision,
            EvaluationRequest {
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                animation_id: None,
                from_pose_epoch: None,
                mode: EvaluationMode::Reset,
                time: f64::NAN,
                motion: None,
            }
        )
        .is_err());
    // A failed evaluation is atomic: the previous valid epoch can still commit.
    let p = s
        .edit_in_pose(p.revision, snapshot.pose_epoch, move_edit())
        .unwrap();
    let moved = scene_model(&s);
    let after =
        crate::mesh::world_vertices(moved.slots[0].attachments[0].mesh().unwrap(), &world)[0];
    assert!((after[0] - point[0] - 9.0).abs() < 0.0001);
    assert!((after[1] - point[1] + 5.0).abs() < 0.0001);
    assert_eq!(moved.rig, before.rig);
    assert_eq!(moved.constraints, before.constraints);
    assert_eq!(
        s.edit_in_pose(p.revision, snapshot.pose_epoch, move_edit())
            .unwrap_err()
            .code,
        "StalePose"
    );
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let first = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
    let second = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
    assert!(second.pose_epoch > first.pose_epoch);
    assert_eq!(
        s.edit_in_pose(p.revision, first.pose_epoch, move_edit())
            .unwrap_err()
            .code,
        "StalePose"
    );
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    let replaced = s
        .replace(new_document("replacement".into()).unwrap(), true)
        .unwrap();
    assert_eq!(
        s.edit_in_pose(
            replaced.revision,
            second.pose_epoch,
            RigEdit::CreateClipping {
                slot: 0,
                name: "bad".into(),
                end_slot: 0,
                vertices: vec![],
                convex: true,
                inverse: false
            }
        )
        .unwrap_err()
        .code,
        "StalePose"
    );
}

#[test]
fn constrained_trace_and_polygon_creation_use_published_pose_and_keep_setup_bones() {
    use crate::evaluation::EvaluationMode;
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let bone = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], bone, 15., 20.)
        .unwrap();
    let slot = p.slots[0].id;
    let attachment = p.slots[0].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":bone,"name":"mask"}),
    );
    let mask = p.slots[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"gravity","bone":bone,"x":1,"y":1,"gravity":35,"strength":20}}),
    );
    assert_eq!(
        s.preview_trace_attachment(
            p.revision,
            attachment,
            crate::trace::TraceOptions::default()
        )
        .unwrap_err()
        .code,
        "PoseRequired"
    );
    assert_eq!(
        s.apply_trace_attachment(
            p.revision,
            attachment,
            crate::trace::TraceOptions::default()
        )
        .unwrap_err()
        .code,
        "PoseRequired"
    );
    let snapshot = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let bones = scene_model(&s).rig;
    let preview = s
        .preview_trace_attachment_in_pose(
            p.revision,
            attachment,
            crate::trace::TraceOptions::default(),
            Some(snapshot.pose_epoch),
        )
        .unwrap();
    assert_eq!(preview.pose_epoch, Some(snapshot.pose_epoch));
    assert_eq!(preview.attachment_id, attachment);
    let p = s
        .apply_trace_attachment_in_pose(
            p.revision,
            attachment,
            crate::trace::TraceOptions::default(),
            Some(snapshot.pose_epoch),
        )
        .unwrap();
    assert!(p.slots[0].attachments[0].mesh.is_some());
    assert_eq!(scene_model(&s).rig, bones);
    let snapshot = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let polygon = vec![
        crate::rig::WorldPoint { x: 30., y: 20. },
        crate::rig::WorldPoint { x: 60., y: 20. },
        crate::rig::WorldPoint { x: 30., y: 60. },
    ];
    let create = || RigEdit::CreateClipping {
        slot: mask,
        name: "clip".into(),
        end_slot: mask,
        vertices: polygon.clone(),
        convex: true,
        inverse: false,
    };
    assert_eq!(
        s.edit(p.revision, create()).unwrap_err().code,
        "PoseRequired"
    );
    let p = s
        .edit_in_pose(p.revision, snapshot.pose_epoch, create())
        .unwrap();
    let model = scene_model(&s);
    let clip = model.slots[1].attachments[0].clipping().unwrap();
    let points = crate::clip_edit::world_vertices(clip, &snapshot_poses(&snapshot));
    for (p, expected) in points.iter().zip(polygon) {
        assert!((p[0] - expected.x).abs() < 0.0001);
        assert!((p[1] - expected.y).abs() < 0.0001);
    }
    assert_eq!(model.rig, bones);
    assert_eq!(p.slots[0].id, slot);
}

#[test]
fn replay_matches_fixed_tick_preview_and_failure_does_not_invalidate_frozen_pose() {
    use crate::evaluation::{EvaluationMode, EvaluationRequest};
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let bone = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"gravity","bone":bone,"x":1,"y":1,"gravity":50,"strength":30}}),
    );
    let reset = evaluated(&s, &p, EvaluationMode::Reset, 0.0);
    let mut advanced = reset;
    for tick in 1..=60 {
        advanced = evaluated(&s, &p, EvaluationMode::Update, f64::from(tick) / 60.0);
    }
    let replay = evaluated(&s, &p, EvaluationMode::Replay, 1.0);
    for (a, b) in advanced.bones.iter().zip(&replay.bones) {
        assert_eq!(
            serde_json::to_value(a).unwrap(),
            serde_json::to_value(b).unwrap()
        );
    }
    assert_eq!(
        s.evaluate(
            p.revision,
            EvaluationRequest {
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                animation_id: None,
                from_pose_epoch: None,
                mode: EvaluationMode::Replay,
                time: 120.001,
                motion: None,
            }
        )
        .unwrap_err()
        .code,
        "PreviewReplayLimit"
    );
    let pose = evaluated(&s, &p, EvaluationMode::Pose, 1.0);
    for (a, b) in replay.bones.iter().zip(&pose.bones) {
        assert_eq!(
            serde_json::to_value(a).unwrap(),
            serde_json::to_value(b).unwrap()
        );
    }
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
}

fn attachment_points(model: &fbones_format::minimal::scene::SceneProject) -> Vec<Vec<[f32; 2]>> {
    let world = crate::rig::poses(&model.rig.bones);
    model
        .slots
        .iter()
        .flat_map(|s| {
            s.attachments.iter().map(|a| {
                if let Some(c) = a.clipping() {
                    crate::clip_edit::world_vertices(c, &world)
                } else if let Some(m) = a.mesh() {
                    crate::mesh::world_vertices(m, &world)
                } else {
                    crate::mesh::world_vertices(
                        &crate::mesh::from_region(a.image().unwrap(), s.bone),
                        &world,
                    )
                }
            })
        })
        .collect()
}

// A canonical, independently authored fixture: the weighted clip is inactive
// beside a visible region, and a second slot has visible/inactive images.
fn inactive_weighted_clip_fixture() -> (tempfile::TempDir, Session, ProjectSummary) {
    let (d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let child = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":child,"name":"affine","x":35,"y":18,"rotation":28,"length":25,"scaleX":1.3,"scaleY":-0.8,"shearX":12,"shearY":23}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"mask alternatives"}),
    );
    let mask = p.slots[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":mask,"name":"inactive weighted mask","endSlot":mask,"vertices":[{"x":-15,"y":-10},{"x":85,"y":-10},{"x":70,"y":55},{"x":-10,"y":65}]}),
    );
    let p = s
        .place_attachments(p.revision, &["A".into()], mask)
        .unwrap();
    let p = s
        .place_images(p.revision, &["B".into()], child, 55., 35.)
        .unwrap();
    let target = p.slots[1].id;
    let b = p.slots[1].attachments[0].id;
    let p = s
        .place_attachments(p.revision, &["nested/C".into()], target)
        .unwrap();
    let _p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":target,"attachment":b}),
    );
    let mut model = scene_model(&s);
    let world = crate::rig::poses(&model.rig.bones);
    let clip = model.slots[0].attachments[0].clipping_mut().unwrap();
    let points = crate::clip_edit::world_vertices(clip, &world);
    clip.weighted = true;
    clip.bones = vec![0, 1];
    clip.color = [51, 102, 153, 204];
    clip.convex = false;
    clip.inverse = true;
    for (i, (row, point)) in clip.vertices.iter_mut().zip(points).enumerate() {
        row.weights = vec![0.25 + i as f32 * 0.05, 0.75 - i as f32 * 0.05];
        // Deliberately retain noncoincident bind offsets. A rebind would erase
        // these even if current world points were approximately unchanged.
        row.positions = world
            .iter()
            .enumerate()
            .flat_map(|(bone, pose)| {
                let offset = if bone == 0 {
                    7.
                } else {
                    -7. * row.weights[0] / row.weights[1]
                };
                let p = pose
                    .inverse()
                    .unwrap()
                    .point(point[0] + offset, point[1] - offset);
                [p.0, p.1]
            })
            .collect();
    }
    let mut document = new_document("inactive transform fixture".into()).unwrap();
    let Document::Editable { project, rig, .. } = &mut document else {
        unreachable!()
    };
    **rig = RigHistory::new(&model, true);
    **project = model;
    let p = s.replace(document, true).unwrap();
    (d, s, p)
}

#[test]
fn inactive_weighted_clip_and_regions_transform_about_moved_pivot_without_activation_or_rebinding()
{
    use crate::rig::TransformMode;
    for mode in [
        TransformMode::Translate,
        TransformMode::Rotate,
        TransformMode::Scale,
    ] {
        let (_d, s, p) = inactive_weighted_clip_fixture();
        let ids = vec![
            p.slots[0].attachments[0].id,
            p.slots[1].attachments[0].id,
            p.slots[1].attachments[1].id,
        ];
        let before = scene_model(&s);
        let world = crate::rig::poses(&before.rig.bones);
        let points = attachment_points(&before);
        let edit = || RigEdit::TransformAttachments {
            ids: ids.clone(),
            mode,
            pivot_x: 21.,
            pivot_y: -13.,
            dx: 9.,
            dy: -4.,
            rotation: 37.,
            scale_x: -0.7,
            scale_y: 1.4,
        };
        let p = s.edit(p.revision, edit()).unwrap();
        let after = scene_model(&s);
        let moved = attachment_points(&after);
        for index in [0, 2, 3] {
            for (a, b) in points[index].iter().zip(&moved[index]) {
                let (x, y) = (a[0] - 21., a[1] + 13.);
                let (sin, cos) = 37f32.to_radians().sin_cos();
                let expected = match mode {
                    TransformMode::Translate => [a[0] + 9., a[1] - 4.],
                    TransformMode::Rotate => [21. + cos * x - sin * y, -13. + sin * x + cos * y],
                    TransformMode::Scale => [21. - 0.7 * x, -13. + 1.4 * y],
                    _ => unreachable!(),
                };
                same_world_points(&[expected], &[*b]);
            }
        }
        // The image sharing the mask's slot was never selected.
        assert_eq!(
            before.slots[0].attachments[1],
            after.slots[0].attachments[1]
        );
        assert_eq!(before.rig, after.rig);
        assert_eq!(before.constraints, after.constraints);
        assert_eq!(before.attachment_order, after.attachment_order);
        for (a, b) in before.slots.iter().zip(&after.slots) {
            assert_eq!(a.active_attachment, b.active_attachment);
            assert_eq!(a.bone, b.bone);
            assert_eq!(a.color, b.color);
            assert_eq!(a.blend, b.blend);
        }
        let original = before.slots[0].attachments[0].clipping().unwrap();
        let changed = after.slots[0].attachments[0].clipping().unwrap();
        let mut metadata = changed.clone();
        metadata.vertices = original.vertices.clone();
        assert_eq!(&metadata, original);
        for (a, b) in original.vertices.iter().zip(&changed.vertices) {
            assert_eq!(
                a.weights.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                b.weights.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
            );
            // Every positive influence must receive the same WORLD delta;
            // their preexisting differences therefore remain intact.
            let deltas = original
                .bones
                .iter()
                .enumerate()
                .map(|(i, bone)| {
                    let pose = world[*bone];
                    let x = b.positions[i * 2] - a.positions[i * 2];
                    let y = b.positions[i * 2 + 1] - a.positions[i * 2 + 1];
                    [pose.a * x + pose.c * y, pose.b * x + pose.d * y]
                })
                .collect::<Vec<_>>();
            same_world_points(&[deltas[0]], &[deltas[1]]);
        }
        let payload = encode_scene_payload(&after).unwrap();
        assert_eq!(decode_scene(&payload).unwrap(), after);
        let p = s.edit(p.revision, RigEdit::Undo).unwrap();
        assert_eq!(
            scene_model(&s),
            before,
            "one completed group edit must undo all selected objects"
        );
        let p = s.edit(p.revision, RigEdit::Redo).unwrap();
        assert_eq!(scene_model(&s), after);
        assert_eq!(p.slots[0].attachments[0].id, ids[0]);
        assert_eq!(
            p.slots[1]
                .attachments
                .iter()
                .map(|a| a.id)
                .collect::<Vec<_>>(),
            ids[1..]
        );
    }
}

#[test]
fn inactive_weighted_clip_group_uses_frozen_evaluated_pose_and_rejects_bad_epochs_atomically() {
    use crate::evaluation::EvaluationMode;
    let (_d, s, p) = inactive_weighted_clip_fixture();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"force","bone":p.bones[1].id,"x":1,"wind":15,"strength":20}}),
    );
    let ids = vec![p.slots[0].attachments[0].id, p.slots[1].attachments[1].id];
    let edit = |ids: Vec<u64>, scale_x| RigEdit::TransformAttachments {
        ids,
        mode: crate::rig::TransformMode::Scale,
        pivot_x: 11.,
        pivot_y: 17.,
        dx: 0.,
        dy: 0.,
        rotation: 0.,
        scale_x,
        scale_y: 0.8,
    };
    let before = scene_model(&s);
    assert_eq!(
        s.edit(p.revision, edit(ids.clone(), 1.3)).unwrap_err().code,
        "PoseRequired"
    );
    let stale = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let pose = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let world = snapshot_poses(&pose);
    assert!((world[1].x - crate::rig::poses(&before.rig.bones)[1].x).abs() > 0.01);
    for (epoch, request) in [
        (stale.pose_epoch, edit(ids.clone(), 1.3)),
        (pose.pose_epoch, edit(vec![ids[0], ids[0]], 1.3)),
        (pose.pose_epoch, edit(vec![ids[0], 999999], 1.3)),
        (pose.pose_epoch, edit(ids.clone(), 0.)),
    ] {
        assert!(s.edit_in_pose(p.revision, epoch, request).is_err());
        assert_eq!(scene_model(&s), before);
        assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    }
    let original = crate::clip_edit::world_vertices(
        before.slots[0].attachments[0].clipping().unwrap(),
        &world,
    );
    let p = s
        .edit_in_pose(p.revision, pose.pose_epoch, edit(ids, 1.3))
        .unwrap();
    let after = scene_model(&s);
    let moved =
        crate::clip_edit::world_vertices(after.slots[0].attachments[0].clipping().unwrap(), &world);
    let expected = original
        .iter()
        .map(|p| [11. + 1.3 * (p[0] - 11.), 17. + 0.8 * (p[1] - 17.)])
        .collect::<Vec<_>>();
    same_world_points(&expected, &moved);
    assert_eq!(before.rig, after.rig);
    assert_eq!(before.constraints, after.constraints);
    assert_eq!(
        before.slots[0].active_attachment,
        after.slots[0].active_attachment
    );
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        scene_model(&s),
        before,
        "failed attempts must not add history entries"
    );
}
#[test]
fn mixed_attachment_group_rotation_is_atomic_preserves_inventory_and_one_undo() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let bone = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":bone,"name":"affine","x":40,"y":25,"rotation":30,"length":30,"scaleX":1.2,"scaleY":-0.8,"shearX":10,"shearY":25}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"mask"}),
    );
    let mask = p.slots[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":mask,"name":"clip","endSlot":mask,"vertices":[{"x":-10,"y":-10},{"x":120,"y":-10},{"x":120,"y":120},{"x":-10,"y":120}]}),
    );
    let clip = p.slots[0].attachments[0].id;
    let p = s
        .place_images(p.revision, &["A".into()], 0, 5., 10.)
        .unwrap();
    let slot = p.slots[1].id;
    let a = p.slots[1].attachments[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    let b = p.slots[1].attachments[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":a}),
    );
    let p = s
        .place_images(p.revision, &["nested/C".into()], bone, 70., 50.)
        .unwrap();
    let mesh_slot = p.slots[2].id;
    let c = p.slots[2].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":c,"edit":{"type":"convertMesh","id":mesh_slot}}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":c,"edit":{"type":"bindMesh","id":mesh_slot,"bones":[0,bone]}}),
    );
    let p = s
        .place_images(p.revision, &["unused".into()], bone, 90., 55.)
        .unwrap();
    let d = p.slots[3].attachments[0].id;
    let before = scene_model(&s);
    let before_points = attachment_points(&before);
    let ids = vec![clip, a, b, c, d];
    let rotation = |ids: Vec<u64>| RigEdit::TransformAttachments {
        ids,
        mode: crate::rig::TransformMode::Rotate,
        pivot_x: 10.,
        pivot_y: 15.,
        dx: 0.,
        dy: 0.,
        rotation: 90.,
        scale_x: 1.,
        scale_y: 1.,
    };
    for invalid in [vec![clip, a, a], vec![clip, a, 999]] {
        assert!(s.edit(p.revision, rotation(invalid)).is_err());
        assert_eq!(scene_model(&s), before);
    }
    let p = s.edit(p.revision, rotation(ids)).unwrap();
    let after = scene_model(&s);
    let after_points = attachment_points(&after);
    for (original, moved) in before_points.iter().zip(&after_points) {
        for (p, q) in original.iter().zip(moved) {
            assert!((q[0] - (25. - p[1])).abs() < 0.001);
            assert!((q[1] - (5. + p[0])).abs() < 0.001);
        }
    }
    assert_eq!(after.slots[1].active_attachment, Some(0));
    assert_eq!(after.slots[1].attachments.len(), 2);
    assert!(
        after.slots[3].attachments[0].mesh().is_some(),
        "world rotation under a nonuniform affine owner needs a real quad mesh"
    );
    let payload = encode_scene_payload(&after).unwrap();
    assert_eq!(decode_scene(&payload).unwrap(), after);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let _p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
}

#[test]
fn clipping_activation_overlap_reorder_and_unknown_ranges_fail_without_rewriting() {
    let (d, s, p) = setup();
    let mut p = p;
    for name in ["maskA", "endA", "maskB", "endB"] {
        p = command(
            &s,
            &p,
            serde_json::json!({"type":"createSlot","bone":0,"name":name}),
        );
    }
    let slots = p.slots.iter().map(|s| s.id).collect::<Vec<_>>();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":slots[0],"name":"A","endSlot":slots[1],"vertices":[{"x":0,"y":0},{"x":30,"y":0},{"x":0,"y":30}]}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":slots[2],"name":"B","endSlot":slots[3],"vertices":[{"x":40,"y":0},{"x":70,"y":0},{"x":40,"y":30}]}),
    );
    let a = p.slots[0].attachments[0].id;
    let before = scene_model(&s);
    let overlap=serde_json::from_value(serde_json::json!({"type":"setClipping","id":a,"endSlot":slots[3],"convex":true,"inverse":false,"color":0xffffffffu32})).unwrap();
    assert_eq!(
        s.edit(p.revision, overlap).unwrap_err().code,
        "OverlappingClipping"
    );
    assert_eq!(scene_model(&s), before);
    assert!(s
        .edit(
            p.revision,
            RigEdit::ReorderSlot {
                id: slots[2],
                index: 1
            }
        )
        .is_err());
    assert_eq!(scene_model(&s), before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":slots[2],"attachment":null}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setClipping","id":a,"endSlot":slots[3],"convex":true,"inverse":false,"color":0xffffffffu32}),
    );
    let b = p.slots[2].attachments[0].id;
    let before = scene_model(&s);
    let reactivate = serde_json::from_value(
        serde_json::json!({"type":"setActiveAttachment","slot":slots[2],"attachment":b}),
    )
    .unwrap();
    assert_eq!(
        s.edit(p.revision, reactivate).unwrap_err().code,
        "OverlappingClipping"
    );
    assert_eq!(scene_model(&s), before);
    // Binary support and authoring support are distinct. Preserve an exact
    // canonical source with an unverified end-before-start as inspection-only.
    let mut unknown = before;
    unknown.slots[2].active_attachment = Some(0);
    unknown.slots[2].attachments[0]
        .clipping_mut()
        .unwrap()
        .end_slot = Some(0);
    let bytes = encode_regions(&unknown).unwrap();
    let path = d.path().join("unknown.fbones");
    std::fs::write(&path, &bytes).unwrap();
    let document = open_document(path).unwrap();
    assert!(matches!(document, Document::Inspected { .. }));
    let p = s.replace(document, true).unwrap();
    assert!(p.inspection_only);
    assert!(s
        .edit(
            p.revision,
            RigEdit::AutoAttachmentWeights {
                id: a,
                scope: Some(crate::rig::AutoWeightScope {
                    vertices: Some(vec![0]),
                    ..Default::default()
                }),
            }
        )
        .is_err());
    assert_eq!(s.prepare_save(true).unwrap().bytes, bytes);
}

#[test]
fn scene_auto_preserves_existing_binding_bits_and_canonical_history() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let b1 = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let b2 = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], b1, 25., 30.)
        .unwrap();
    let slot = p.slots[0].id;
    let attachment = p.slots[0].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":attachment,"edit":{"type":"convertMesh","id":slot}}),
    );
    let model = scene_model(&s);
    let world = crate::rig::poses(&model.rig.bones);
    let mut mesh = model.slots[0].attachments[0].mesh().unwrap().clone();
    let points = crate::mesh::world_vertices(&mesh, &world);
    mesh.weighted = true;
    mesh.bones = vec![0, 1, 2];
    for (row, point) in mesh.vertices.iter_mut().zip(points) {
        row.weights = vec![0.2, 0.3, 0.5];
        row.positions = world
            .iter()
            .flat_map(|p| {
                let inv = p.inverse().unwrap();
                let local = inv.point(point[0], point[1]);
                [local.0, local.1]
            })
            .collect();
    }
    let p = s
        .edit(
            p.revision,
            RigEdit::AttachmentEdit {
                id: attachment,
                edit: Box::new(RigEdit::ReplaceMesh {
                    id: slot,
                    mesh: Box::new(mesh),
                }),
            },
        )
        .unwrap();
    let before = scene_model(&s);
    let expected = before.slots[0].attachments[0].mesh().unwrap();
    let positions = expected
        .vertices
        .iter()
        .flat_map(|v| v.positions.iter().map(|p| p.to_bits()))
        .collect::<Vec<_>>();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":attachment,"edit":{"type":"autoWeights","id":slot}}),
    );
    let after = scene_model(&s);
    let actual = after.slots[0].attachments[0].mesh().unwrap();
    assert_eq!(
        actual
            .vertices
            .iter()
            .flat_map(|v| v.positions.iter().map(|p| p.to_bits()))
            .collect::<Vec<_>>(),
        positions
    );
    assert!(actual
        .vertices
        .iter()
        .all(|v| v.weights.iter().all(|w| w.is_finite() && *w >= 0.)
            && (v.weights.iter().sum::<f32>() - 1.).abs() < 0.00001));
    assert!(actual
        .vertices
        .iter()
        .zip(&expected.vertices)
        .any(|(a, b)| a.weights != b.weights));
    assert_eq!(actual.bones, vec![0, 1, 2]);
    assert_eq!(
        p.slots[0].attachments[0].mesh.as_ref().unwrap().bones,
        vec![0, b1, b2]
    );
    let payload = encode_scene_payload(&after).unwrap();
    assert_eq!(decode_scene(&payload).unwrap(), after);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let _p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
}

#[test]
fn physics_explicit_zero_angular_coefficients_survive_unrelated_property_edits() {
    use fbones_format::minimal::scene::Constraint;
    let (_d, s, p) = setup();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"explicit","bone":0,"rotate":0,"shearX":0}}),
    );
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let Constraint::Physics(ref before) = scene_model(&s).constraints[0] else {
        panic!("physics")
    };
    assert_eq!(before.angular.wire_bits(), (0, 0));
    assert_eq!(p.constraints[0]["rotate"], 0.0);
    let mut edit = p.constraints[0].clone();
    edit.as_object_mut().unwrap().remove("id");
    edit.as_object_mut().unwrap().remove("order");
    edit["mass"] = serde_json::json!(2.0);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"updateConstraint","id":id,"constraint":edit}),
    );
    let model = scene_model(&s);
    let Constraint::Physics(ref after) = model.constraints[0] else {
        panic!("physics")
    };
    assert_eq!(after.angular.wire_bits(), (0, 0));
    assert_eq!(after.mass, 2.0);
    let payload = encode_scene_payload(&model).unwrap();
    assert_eq!(decode_scene(&payload).unwrap(), model);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(p.constraints[0]["mass"], 1.0);
}

fn moved_attachment(s: &Session, id: u64) -> (usize, SceneAttachment) {
    let state = s.lock().unwrap();
    let Some(Document::Editable { project, rig, .. }) = &state.document else {
        panic!("own editable fixture")
    };
    let address = rig.history.frame().attachment_address(id).unwrap();
    (
        project.slots[address.slot].bone,
        project.slots[address.slot].attachments[address.attachment].clone(),
    )
}
fn inventory_ids(s: &Session) -> Vec<u64> {
    let state = s.lock().unwrap();
    let Some(Document::Editable { project, rig, .. }) = &state.document else {
        panic!("own editable fixture")
    };
    let frame = rig.history.frame();
    project
        .attachment_order
        .iter()
        .map(|a| frame.attachment_ids[a.slot][a.attachment])
        .collect()
}
fn geometry_points(a: &SceneAttachment, owner: usize, world: &[crate::rig::Pose]) -> Vec<[f32; 2]> {
    if let Some(c) = a.clipping() {
        crate::clip_edit::world_vertices(c, world)
    } else if let Some(m) = a.mesh() {
        crate::mesh::world_vertices(m, world)
    } else {
        crate::mesh::world_vertices(&crate::mesh::from_region(a.image().unwrap(), owner), world)
    }
}
fn attachment_binding_bits(attachment: &SceneAttachment) -> Vec<u32> {
    let vertices = if let Some(mesh) = attachment.mesh() {
        &mesh.vertices
    } else if let Some(clip) = attachment.clipping() {
        &clip.vertices
    } else {
        return vec![];
    };
    vertices
        .iter()
        .flat_map(|row| {
            row.weights
                .iter()
                .chain(&row.positions)
                .map(|value| value.to_bits())
        })
        .collect()
}
fn same_world_points(a: &[[f32; 2]], b: &[[f32; 2]]) {
    assert_eq!(a.len(), b.len());
    for (a, b) in a.iter().zip(b) {
        assert!((a[0] - b[0]).hypot(a[1] - b[1]) < 0.0001, "{a:?} != {b:?}");
    }
}

#[test]
fn move_attachment_preserves_inventory_ids_activation_history_and_portable_save() {
    let (d, s, p) = setup();
    let p = s
        .place_images(p.revision, &["A".into(), "unused".into()], 0, 10.0, 20.0)
        .unwrap();
    let source = p.slots[0].id;
    let destination = p.slots[1].id;
    let destination_active = p.slots[1].active_attachment_id;
    let p = s
        .place_attachments(p.revision, &["B".into(), "nested/C".into()], source)
        .unwrap();
    let b = p.slots[0].attachments[1].id;
    let c = p.slots[0].attachments[2].id;
    let before = scene_model(&s);
    let order = inventory_ids(&s);
    let stale_save = s.prepare_save(true).unwrap();
    let p = s
        .edit(
            p.revision,
            RigEdit::MoveAttachment {
                id: b,
                slot: destination,
            },
        )
        .unwrap();
    assert_eq!(p.edited_attachment, Some(b));
    assert_eq!(p.edited_slot, Some(destination));
    assert_eq!(p.slots[0].active_attachment_id, Some(c));
    assert_eq!(p.slots[1].active_attachment_id, destination_active);
    assert_eq!(inventory_ids(&s), order);
    assert_eq!(p.slots[1].attachments.last().unwrap().id, b);
    assert!(s
        .save_snapshot(stale_save, d.path().join("stale.fbones"))
        .is_err());
    assert!(!d.path().join("stale.fbones").exists());
    let after = scene_model(&s);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    assert_eq!(p.edited_attachment, Some(b));
    assert_eq!(p.edited_slot, Some(source));
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
    assert_eq!(inventory_ids(&s), order);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"empty destination"}),
    );
    let empty = p.slots.last().unwrap().id;
    let before_active_move = scene_model(&s);
    let p = s
        .edit(p.revision, RigEdit::MoveAttachment { id: c, slot: empty })
        .unwrap();
    assert_eq!(p.slots[0].active_attachment_id, None);
    assert_eq!(p.slots[2].active_attachment_id, None);
    assert_eq!(p.slots[2].attachments[0].id, c);
    let same = s
        .edit(p.revision, RigEdit::MoveAttachment { id: c, slot: empty })
        .unwrap();
    assert_eq!(same.revision, p.revision);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before_active_move);
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    let final_model = scene_model(&s);
    let payload = encode_scene_payload(&final_model).unwrap();
    assert_eq!(decode_scene(&payload).unwrap(), final_model);
    let saved = s
        .save_snapshot(
            s.prepare_save(true).unwrap(),
            d.path().join("portable/moved.fbones"),
        )
        .unwrap();
    assert!(saved.revision >= p.revision);
    let reopened = open_document(PathBuf::from(saved.path.unwrap())).unwrap();
    let Document::Editable { project, .. } = reopened else {
        panic!("supported moved fixture")
    };
    let mut portable_model = final_model;
    portable_model.images_root = "./images/".into();
    assert_eq!(*project, portable_model);
}

#[test]
fn move_attachment_affine_region_mesh_weighted_binding_and_bone_remap_keep_world_geometry() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let old = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let new = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":new,"name":"affine owner","x":-30,"y":18,"rotation":-37,"length":30,"scaleX":1.6,"scaleY":-0.7,"shearX":0,"shearY":12}),
    );
    let p = s
        .place_images(p.revision, &["A".into()], old, 30.0, 40.0)
        .unwrap();
    let source = p.slots[0].id;
    let id = p.slots[0].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":new,"name":"new owner slot"}),
    );
    let destination = p.slots[1].id;
    let before = scene_model(&s);
    let world = crate::rig::poses(&before.rig.bones);
    let (owner, a) = moved_attachment(&s, id);
    let points = geometry_points(&a, owner, &world);
    let p = s
        .edit(
            p.revision,
            RigEdit::MoveAttachment {
                id,
                slot: destination,
            },
        )
        .unwrap();
    let (owner, a) = moved_attachment(&s, id);
    assert!(
        a.mesh().is_some(),
        "A sheared new local basis must become a real quad mesh."
    );
    same_world_points(&points, &geometry_points(&a, owner, &world));
    assert!(!a.mesh().unwrap().weighted);
    assert_eq!(a.mesh().unwrap().bones, [owner]);
    let p = s
        .edit(p.revision, RigEdit::MoveAttachment { id, slot: source })
        .unwrap();
    let (owner, a) = moved_attachment(&s, id);
    same_world_points(&points, &geometry_points(&a, owner, &world));
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":id,"edit":{"type":"bindMesh","id":source,"bones":[0,old,new]}}),
    );
    let weighted = moved_attachment(&s, id).1;
    let binding_bits = attachment_binding_bits(&weighted);
    let p = s
        .edit(
            p.revision,
            RigEdit::MoveAttachment {
                id,
                slot: destination,
            },
        )
        .unwrap();
    assert_eq!(moved_attachment(&s, id).1, weighted);
    assert_eq!(
        attachment_binding_bits(&moved_attachment(&s, id).1),
        binding_bits
    );
    let p = s
        .edit(
            p.revision,
            RigEdit::Reparent {
                id: old,
                parent: new,
            },
        )
        .unwrap();
    assert_eq!(
        p.slots[1].attachments[0].mesh.as_ref().unwrap().bones,
        [0, old, new]
    );
    let p = s
        .edit(
            p.revision,
            RigEdit::ReorderSlot {
                id: destination,
                index: 0,
            },
        )
        .unwrap();
    assert_eq!(p.slots[0].attachments[0].id, id);
    let model = scene_model(&s);
    let payload = encode_scene_payload(&model).unwrap();
    assert_eq!(decode_scene(&payload).unwrap(), model);
}

#[test]
fn move_attachment_collisions_invalid_ids_stale_revision_and_singular_owner_are_atomic() {
    let (_d, s, p) = setup();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 0.0, 0.0)
        .unwrap();
    let source = p.slots[0].id;
    let id = p.slots[0].attachments[0].id;
    let p = s
        .place_images(p.revision, &["A".into()], 0, 10.0, 20.0)
        .unwrap();
    let destination = p.slots[1].id;
    let before = scene_model(&s);
    let order = inventory_ids(&s);
    for edit in [
        RigEdit::MoveAttachment {
            id,
            slot: destination,
        },
        RigEdit::MoveAttachment {
            id: u64::MAX,
            slot: destination,
        },
        RigEdit::MoveAttachment { id, slot: u64::MAX },
    ] {
        assert!(s.edit(p.revision, edit).is_err());
        assert_eq!(scene_model(&s), before);
        assert_eq!(inventory_ids(&s), order);
        assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    }
    assert_eq!(
        s.edit(
            p.revision - 1,
            RigEdit::MoveAttachment {
                id,
                slot: destination
            }
        )
        .unwrap_err()
        .code,
        "ProjectChanged"
    );
    let p = add_bone(&s, &p, 0);
    let bone = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":bone,"name":"collapsed","x":0,"y":0,"rotation":0,"length":30,"scaleX":0,"scaleY":1,"shearX":0,"shearY":0}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":bone,"name":"singular destination"}),
    );
    let destination = p.slots[2].id;
    let before = scene_model(&s);
    assert!(s
        .edit(
            p.revision,
            RigEdit::MoveAttachment {
                id,
                slot: destination
            }
        )
        .is_err());
    assert_eq!(scene_model(&s), before);
    assert_eq!(s.summary().unwrap().unwrap().slots[0].id, source);
}

#[test]
fn move_attachment_constrained_pose_epoch_and_clipping_endpoint_guards_are_atomic() {
    use crate::evaluation::EvaluationMode;
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let new = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 15.0, 25.0)
        .unwrap();
    let source = p.slots[0].id;
    let id = p.slots[0].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":new,"name":"destination"}),
    );
    let destination = p.slots[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"force","bone":new,"x":1,"wind":10,"strength":20}}),
    );
    assert_eq!(
        s.edit(
            p.revision,
            RigEdit::MoveAttachment {
                id,
                slot: destination
            }
        )
        .unwrap_err()
        .code,
        "PoseRequired"
    );
    let stale = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let pose = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let world = snapshot_poses(&pose);
    assert_eq!(
        s.edit_in_pose(
            p.revision,
            stale.pose_epoch,
            RigEdit::MoveAttachment {
                id,
                slot: destination
            }
        )
        .unwrap_err()
        .code,
        "StalePose"
    );
    let (owner, a) = moved_attachment(&s, id);
    let before = geometry_points(&a, owner, &world);
    let p = s
        .edit_in_pose(
            p.revision,
            pose.pose_epoch,
            RigEdit::MoveAttachment {
                id,
                slot: destination,
            },
        )
        .unwrap();
    let (owner, a) = moved_attachment(&s, id);
    same_world_points(&before, &geometry_points(&a, owner, &world));
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"deleteConstraint","id":p.constraints[0]["id"]}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":source,"name":"cut","endSlot":source,"vertices":[{"x":0,"y":0},{"x":20,"y":0},{"x":0,"y":20}]}),
    );
    let clip = p.slots[0].attachments[0].id;
    let before = scene_model(&s);
    let p = s
        .edit(
            p.revision,
            RigEdit::MoveAttachment {
                id: clip,
                slot: destination,
            },
        )
        .unwrap();
    let moved = p.slots[1]
        .attachments
        .iter()
        .find(|a| a.id == clip)
        .unwrap();
    assert_eq!(moved.clipping.as_ref().unwrap().end_slot, source);
    assert_eq!(p.slots[0].active_attachment_id, None);
    assert_eq!(p.slots[1].active_attachment_id, None);
    assert!(s
        .edit(
            p.revision,
            RigEdit::SetActiveAttachment {
                slot: destination,
                attachment: Some(clip)
            }
        )
        .is_err());
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
}

#[test]
fn move_attachment_weighted_clipping_keeps_binding_bits_and_global_reference_order() {
    use crate::scene_edit::{SceneEdit, SceneHistory};
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let new = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"clip source"}),
    );
    let source = p.slots[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":new,"name":"clip destination"}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"end"}),
    );
    let end = p.slots[2].id;
    let _p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":source,"name":"weighted cut","endSlot":end,"vertices":[{"x":0,"y":0},{"x":20,"y":0},{"x":0,"y":20}]}),
    );
    let mut model = scene_model(&s);
    let world = crate::rig::poses(&model.rig.bones);
    let clip = model.slots[0].attachments[0].clipping_mut().unwrap();
    let points = crate::clip_edit::world_vertices(clip, &world);
    clip.weighted = true;
    clip.bones = vec![0, 1];
    for (row, point) in clip.vertices.iter_mut().zip(points) {
        row.weights = vec![0.25, 0.75];
        row.positions = world
            .iter()
            .flat_map(|pose| {
                let p = pose.inverse().unwrap().point(point[0], point[1]);
                [p.0, p.1]
            })
            .collect();
    }
    clip.vertices[0].positions[0] = -0.0;
    let expected = model.slots[0].attachments[0].clone();
    let expected_bits = attachment_binding_bits(&expected);
    let mut history = SceneHistory::new(model.clone(), true).unwrap();
    let id = history.frame().attachment_ids[0][0];
    let destination = history.frame().slot_ids[1];
    history
        .apply(SceneEdit::Rig(RigEdit::MoveAttachment {
            id,
            slot: destination,
        }))
        .unwrap();
    let moved = history.frame();
    assert_eq!(moved.attachment_ids[1], [id]);
    assert_eq!(moved.project.slots[1].attachments[0], expected);
    assert_eq!(
        attachment_binding_bits(&moved.project.slots[1].attachments[0]),
        expected_bits
    );
    assert_eq!(moved.project.slots[0].active_attachment, None);
    assert_eq!(moved.project.slots[1].active_attachment, None);
    assert_eq!(
        moved.project.attachment_order[0],
        fbones_format::minimal::scene::AttachmentAddress {
            slot: 1,
            attachment: 0
        }
    );
    let payload = encode_scene_payload(&moved.project).unwrap();
    assert_eq!(decode_scene(&payload).unwrap(), moved.project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, model);
    assert_eq!(history.frame().attachment_ids[0], [id]);
}

#[test]
fn recorded_motion_replay_matches_setup_preview_and_keeps_nonadvancing_anchor() {
    use crate::evaluation::{EvaluationMode, EvaluationRequest, ReplayMotion};
    let fixture: serde_json::Value =
        serde_json::from_str(include_str!("solve/setup-preview-motion.json")).unwrap();
    let (_d, s, p) = setup();
    let p = s
        .edit(
            p.revision,
            RigEdit::Create {
                color: None,
                parent: 0,
                x: 0.0,
                y: 0.0,
                rotation: 0.0,
                length: 80.0,
            },
        )
        .unwrap();
    let mut constraint = fixture["scene"]["constraints"][0].clone();
    constraint.as_object_mut().unwrap().remove("id");
    constraint.as_object_mut().unwrap().remove("order");
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":constraint}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":0,"name":"root","x":fixture["pausedCurrentRootX"],"y":0,"rotation":0,"length":0,"scaleX":1,"scaleY":1,"shearX":0,"shearY":0}),
    );
    let before = scene_model(&s);
    let time = fixture["freezeTick"].as_f64().unwrap() / 60.0;
    let motion: ReplayMotion = serde_json::from_value(fixture["motion"].clone()).unwrap();
    let snapshot = s
        .evaluate(
            p.revision,
            EvaluationRequest {
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                animation_id: None,
                from_pose_epoch: None,
                mode: EvaluationMode::Replay,
                time,
                motion: Some(motion.clone()),
            },
        )
        .unwrap();
    let expected = fixture["expectedFreezeX"].as_f64().unwrap();
    let tolerance = fixture["positionTolerance"].as_f64().unwrap();
    assert!((f64::from(snapshot.bones[1].world.x) - expected).abs() < tolerance);
    assert_eq!(snapshot.bones[0].world.x, 90.0);
    assert_eq!(scene_model(&s), before);
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    let advanced = evaluated(&s, &p, EvaluationMode::Update, time + 1.0 / 60.0);
    assert!(
        (f64::from(advanced.bones[1].world.x) - fixture["expectedNextTickX"].as_f64().unwrap())
            .abs()
            < tolerance
    );
    // A paused edit at time0 is displayed immediately, while its old anchor
    // remains available to react to the first genuinely advancing tick.
    let zero = s
        .evaluate(
            p.revision,
            EvaluationRequest {
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                animation_id: None,
                from_pose_epoch: None,
                mode: EvaluationMode::Replay,
                time: 0.0,
                motion: Some(ReplayMotion {
                    initial: motion.initial,
                    changes: vec![],
                }),
            },
        )
        .unwrap();
    assert_eq!(zero.bones[1].world.x, 90.0);
    let first = evaluated(&s, &p, EvaluationMode::Update, 1.0 / 60.0);
    assert!((first.bones[1].world.x - 45.0).abs() < 0.00001);
}

#[test]
fn malformed_recorded_motion_is_rejected_without_invalidating_the_last_frozen_pose() {
    use crate::evaluation::{EvaluationMode, EvaluationRequest, ReplayMotion};
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let model = scene_model(&s);
    let initial: Vec<_> = model
        .rig
        .bones
        .iter()
        .map(crate::solve::LocalPose::from)
        .map(Into::into)
        .collect();
    let snapshot = evaluated(&s, &p, EvaluationMode::Replay, 0.35);
    let good = ReplayMotion {
        initial: initial.clone(),
        changes: vec![],
    };
    let mut invalid = vec![good.clone(); 7];
    invalid[0].initial.pop();
    invalid[1].initial[0].x = f64::NAN;
    invalid[2].initial[0].scale_x = 1_000_001.0;
    for (index, ticks) in [
        (3, vec![0]),
        (4, vec![11, 11]),
        (5, vec![12, 11]),
        (6, vec![22]),
    ] {
        invalid[index].changes = ticks
            .into_iter()
            .map(|tick| crate::evaluation::ReplayMotionChange {
                tick,
                poses: initial.clone(),
            })
            .collect();
    }
    for motion in invalid {
        assert_eq!(
            s.evaluate(
                p.revision,
                EvaluationRequest {
                    animation_pose: None,
                    constraint_pose: None,
                    draw_order_pose: None,
                    deform_targets: vec![],
                    deform_pose: None,
                    animation_id: None,
                    from_pose_epoch: None,
                    mode: EvaluationMode::Replay,
                    time: 0.35,
                    motion: Some(motion)
                }
            )
            .unwrap_err()
            .code,
            "InvalidReplayMotion"
        );
        assert_eq!(
            s.lock()
                .unwrap()
                .evaluation
                .as_ref()
                .unwrap()
                .snapshot
                .pose_epoch,
            snapshot.pose_epoch
        );
        assert_eq!(scene_model(&s), model);
        assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    }
    assert_eq!(
        s.evaluate(
            p.revision,
            EvaluationRequest {
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                animation_id: None,
                from_pose_epoch: None,
                mode: EvaluationMode::Pose,
                time: 0.35,
                motion: Some(good)
            }
        )
        .unwrap_err()
        .code,
        "InvalidReplayMotion"
    );
    assert!(serde_json::from_value::<EvaluationRequest>(serde_json::json!({"mode":"replay","time":0,"motion":{"initial":[{"x":0,"y":0,"rotation":0,"scaleX":1,"scaleY":1,"shearX":0,"shearY":0,"id":0}],"changes":[]}})).is_err());
}

#[test]
fn ik_target_subtree_guards_cover_stable_ids_create_update_and_reparent_atomically() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let a = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, a);
    let b = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, b);
    let deep = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let discarded = p.edited_bone.unwrap();
    let p = s
        .edit(p.revision, RigEdit::Delete { id: discarded })
        .unwrap();
    let p = add_bone(&s, &p, 0);
    let outside = p.edited_bone.unwrap();
    assert_ne!(
        outside, 4,
        "Exercise stable IDs differing from wire indices."
    );
    let before = scene_model(&s);
    let summary = serde_json::to_value(&p).unwrap();
    for (members, target) in [
        (vec![a], a),
        (vec![a], deep),
        (vec![a, b], b),
        (vec![a, b], deep),
    ] {
        let edit=serde_json::from_value(serde_json::json!({"type":"addConstraint","constraint":{"type":"ik","name":"bad","bones":members,"target":target,"mix":0}})).unwrap();
        assert_eq!(
            s.edit(p.revision, edit).unwrap_err().code,
            "InvalidSceneEdit"
        );
        assert_eq!(scene_model(&s), before);
        assert_eq!(
            serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
            summary
        );
    }
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"ik","name":"valid","bones":[a,b],"target":outside}}),
    );
    let id = p.constraints[0]["id"].as_u64().unwrap();
    assert_eq!(
        id, 0,
        "Rejected creates consume neither identities nor history."
    );
    let before = scene_model(&s);
    let summary = serde_json::to_value(&p).unwrap();
    let invalid_update=serde_json::from_value(serde_json::json!({"type":"updateConstraint","id":id,"constraint":{"type":"ik","name":"valid","bones":[a,b],"target":deep}})).unwrap();
    assert!(s.edit(p.revision, invalid_update).is_err());
    assert!(s
        .edit(
            p.revision,
            RigEdit::Reparent {
                id: outside,
                parent: b
            }
        )
        .is_err());
    assert_eq!(scene_model(&s), before);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        summary
    );
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert!(p.constraints.is_empty());
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"ik","name":"ancestor target","bones":[a,b],"target":0}}),
    );
    assert_eq!(p.constraints[0]["target"], 0);
}

#[test]
fn negative_physics_damping_create_and_update_never_commit_a_nonpreviewable_project() {
    let (_d, s, p) = setup();
    let before = scene_model(&s);
    let summary = serde_json::to_value(&p).unwrap();
    let invalid=serde_json::from_value(serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"spring","bone":0,"damping":-0.1}})).unwrap();
    assert_eq!(
        s.edit(p.revision, invalid).unwrap_err().code,
        "InvalidSceneEdit"
    );
    assert_eq!(scene_model(&s), before);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        summary
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"spring","bone":0,"damping":0}}),
    );
    let id = p.constraints[0]["id"].as_u64().unwrap();
    assert_eq!(id, 0);
    let before = scene_model(&s);
    let invalid=serde_json::from_value(serde_json::json!({"type":"updateConstraint","id":id,"constraint":{"type":"physics","name":"spring","bone":0,"damping":-0.1}})).unwrap();
    assert!(s.edit(p.revision, invalid).is_err());
    assert_eq!(scene_model(&s), before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"updateConstraint","id":id,"constraint":{"type":"physics","name":"spring","bone":0,"damping":1.1}}),
    );
    let snapshot = evaluated(&s, &p, crate::evaluation::EvaluationMode::Replay, 0.0);
    assert!(snapshot.bones[0].world.x.is_finite());
    let model = scene_model(&s);
    let payload = encode_scene_payload(&model).unwrap();
    assert_eq!(decode_scene(&payload).unwrap(), model);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(p.constraints[0]["damping"], 0.0);
}

#[test]
fn typed_inactive_clip_membership_numeric_auto_normalize_and_paint_keep_complete_scene_history() {
    let (_d, s, p) = inactive_weighted_clip_fixture();
    let clip = p.slots[0].attachments[0].id;
    let owner = p.bones[0].id;
    let child = p.bones[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"bindAttachment","id":clip,"bones":[]}),
    );
    let rigid = scene_model(&s);
    let points = attachment_points(&rigid)[0].clone();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"bindAttachment","id":clip,"bones":[child,owner]}),
    );
    let bound = scene_model(&s);
    let c = bound.slots[0].attachments[0].clipping().unwrap();
    assert!(c.weighted);
    assert_eq!(c.bones, [1, 0]);
    assert!(c.vertices.iter().all(|r| r.weights == [1., 0.]));
    same_world_points(&points, &attachment_points(&bound)[0]);
    assert_eq!(bound.slots[0].active_attachment, Some(1));
    let positions = c
        .vertices
        .iter()
        .flat_map(|v| v.positions.iter().map(|p| p.to_bits()))
        .collect::<Vec<_>>();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"autoAttachmentWeights","id":clip}),
    );
    let automatic = scene_model(&s);
    assert!(automatic.slots[0].attachments[0]
        .clipping()
        .unwrap()
        .vertices
        .iter()
        .any(|r| r.weights != [1., 0.]));
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"normalizeAttachmentWeights","id":clip}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setAttachmentWeight","id":clip,"vertex":0,"bone":owner,"value":0.35}),
    );
    let before_stroke = scene_model(&s);
    assert!(
        (before_stroke.slots[0].attachments[0]
            .clipping()
            .unwrap()
            .vertices[0]
            .weights[1]
            - 0.35)
            .abs()
            < 1e-6
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"paintAttachmentWeights","id":clip,"bone":owner,"changes":[{"vertex":1,"value":0.2},{"vertex":2,"value":0.6}]}),
    );
    let after = scene_model(&s);
    let changed = after.slots[0].attachments[0].clipping().unwrap();
    assert_eq!(
        changed
            .vertices
            .iter()
            .flat_map(|v| v.positions.iter().map(|p| p.to_bits()))
            .collect::<Vec<_>>(),
        positions
    );
    assert_eq!(
        changed.vertices[0],
        before_stroke.slots[0].attachments[0]
            .clipping()
            .unwrap()
            .vertices[0]
    );
    assert_eq!(
        changed.vertices[3],
        before_stroke.slots[0].attachments[0]
            .clipping()
            .unwrap()
            .vertices[3]
    );
    let mut expected = rigid.clone();
    expected.slots[0].attachments[0] = after.slots[0].attachments[0].clone();
    assert_eq!(
        after, expected,
        "No active pointer, image, owner, endpoint, constraint or unrelated inventory may change"
    );
    assert!(after.slots[0].attachments[0].image().is_none());
    assert_eq!(
        decode_scene(&encode_scene_payload(&after).unwrap()).unwrap(),
        after
    );
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before_stroke);
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
    assert_eq!(p.slots[0].attachments[0].id, clip);
}

#[test]
fn typed_weight_invalid_ids_duplicate_changes_and_partial_batch_fail_without_history() {
    let (_d, s, p) = inactive_weighted_clip_fixture();
    let clip = p.slots[0].attachments[0].id;
    let region = p.slots[0].attachments[1].id;
    let bone = p.bones[0].id;
    let before = scene_model(&s);
    let dto = serde_json::to_value(&p).unwrap();
    let invalids = vec![
        RigEdit::BindAttachment {
            id: clip,
            bones: vec![bone, bone],
        },
        RigEdit::BindAttachment {
            id: clip,
            bones: vec![999999],
        },
        RigEdit::BindAttachment {
            id: region,
            bones: vec![bone],
        },
        RigEdit::SetAttachmentWeight {
            locked_bones: None,
            id: clip,
            vertex: 0,
            bone,
            value: f32::NAN,
        },
        RigEdit::SetAttachmentWeight {
            locked_bones: None,
            id: clip,
            vertex: 999,
            bone,
            value: 0.3,
        },
        RigEdit::PaintAttachmentWeights {
            locked_bones: None,
            id: clip,
            bone,
            changes: vec![],
        },
        RigEdit::PaintAttachmentWeights {
            locked_bones: None,
            id: clip,
            bone,
            changes: vec![
                crate::rig::WeightChange {
                    vertex: 0,
                    value: 0.3,
                },
                crate::rig::WeightChange {
                    vertex: 0,
                    value: 0.7,
                },
            ],
        },
        RigEdit::PaintAttachmentWeights {
            locked_bones: None,
            id: clip,
            bone,
            changes: vec![
                crate::rig::WeightChange {
                    vertex: 0,
                    value: 0.3,
                },
                crate::rig::WeightChange {
                    vertex: 999,
                    value: 0.7,
                },
            ],
        },
        RigEdit::AutoAttachmentWeights {
            id: 999999,
            scope: None,
        },
    ];
    for edit in invalids {
        assert!(s.edit(p.revision, edit).is_err());
        assert_eq!(scene_model(&s), before);
        assert_eq!(
            serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
            dto
        );
    }
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setAttachmentWeight","id":clip,"vertex":0,"bone":bone,"value":0.4}),
    );
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        scene_model(&s),
        before,
        "Rejected batches must not add hidden history"
    );
}

#[test]
fn typed_clip_bind_and_unbind_require_current_frozen_evaluated_pose_and_keep_authoring() {
    use crate::evaluation::EvaluationMode;
    let (_d, s, p) = inactive_weighted_clip_fixture();
    let clip = p.slots[0].attachments[0].id;
    let child = p.bones[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"binding force","bone":child,"x":1,"wind":15,"strength":20}}),
    );
    let before = scene_model(&s);
    let edit = || RigEdit::BindAttachment {
        id: clip,
        bones: vec![],
    };
    assert_eq!(s.edit(p.revision, edit()).unwrap_err().code, "PoseRequired");
    let stale = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let frozen = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let world = snapshot_poses(&frozen);
    assert_eq!(
        s.edit_in_pose(p.revision, stale.pose_epoch, edit())
            .unwrap_err()
            .code,
        "StalePose"
    );
    assert_eq!(scene_model(&s), before);
    let points = crate::clip_edit::world_vertices(
        before.slots[0].attachments[0].clipping().unwrap(),
        &world,
    );
    let p = s
        .edit_in_pose(p.revision, frozen.pose_epoch, edit())
        .unwrap();
    let unbound = scene_model(&s);
    same_world_points(
        &points,
        &crate::clip_edit::world_vertices(
            unbound.slots[0].attachments[0].clipping().unwrap(),
            &world,
        ),
    );
    assert_eq!(unbound.rig, before.rig);
    assert_eq!(unbound.constraints, before.constraints);
    assert_eq!(
        unbound.slots[0].active_attachment,
        before.slots[0].active_attachment
    );
    assert_eq!(
        s.edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            RigEdit::BindAttachment {
                id: clip,
                bones: vec![child]
            }
        )
        .unwrap_err()
        .code,
        "StalePose"
    );
    let pose = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let current = snapshot_poses(&pose);
    let points = crate::clip_edit::world_vertices(
        unbound.slots[0].attachments[0].clipping().unwrap(),
        &current,
    );
    let p = s
        .edit_in_pose(
            p.revision,
            pose.pose_epoch,
            RigEdit::BindAttachment {
                id: clip,
                bones: vec![child],
            },
        )
        .unwrap();
    let rebound = scene_model(&s);
    same_world_points(
        &points,
        &crate::clip_edit::world_vertices(
            rebound.slots[0].attachments[0].clipping().unwrap(),
            &current,
        ),
    );
    assert_eq!(rebound.rig, before.rig);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), unbound);
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
}

#[test]
fn typed_auto_on_real_concave_clipping_uses_polygon_topology_without_image_or_crossing_diagonal() {
    use fbones_format::minimal::meshes::Vertex;
    let (_d, s, _p) = inactive_weighted_clip_fixture();
    let mut model = scene_model(&s);
    let world = crate::rig::poses(&model.rig.bones);
    let points = [
        [0., 0.],
        [100., 0.],
        [100., 20.],
        [25., 20.],
        [25., 90.],
        [0., 90.],
    ];
    let c = model.slots[0].attachments[0].clipping_mut().unwrap();
    c.vertices = points
        .into_iter()
        .map(|p| Vertex {
            weights: vec![1., 0.],
            positions: c
                .bones
                .iter()
                .flat_map(|bone| {
                    let q = world[*bone].inverse().unwrap().point(p[0], p[1]);
                    [q.0, q.1]
                })
                .collect(),
        })
        .collect();
    c.edges = (0..points.len())
        .flat_map(|i| [i as u32, ((i + 1) % points.len()) as u32])
        .collect();
    c.convex = false;
    c.inverse = false;
    let mut document = new_document("own concave clipping binding".into()).unwrap();
    let Document::Editable { project, rig, .. } = &mut document else {
        unreachable!()
    };
    **rig = RigHistory::new(&model, true);
    **project = model.clone();
    let p = s.replace(document, true).unwrap();
    let clip = p.slots[0].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"autoAttachmentWeights","id":clip}),
    );
    let after = scene_model(&s);
    let c = after.slots[0].attachments[0].clipping().unwrap();
    assert!(c.vertices.iter().any(|r| r.weights[1] > 0.));
    same_world_points(&points, &crate::clip_edit::world_vertices(c, &world));
    assert_eq!(
        c.edges,
        model.slots[0].attachments[0].clipping().unwrap().edges
    );
    assert!(after.slots[0].attachments[0].image().is_none());
    assert_eq!(
        after.slots[0].active_attachment,
        model.slots[0].active_attachment
    );
    assert_eq!(
        decode_scene(&encode_scene_payload(&after).unwrap()).unwrap(),
        after
    );
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), model);
}

fn scoped_auto_fixture(
    clip: bool,
    active: bool,
) -> (tempfile::TempDir, Session, ProjectSummary, u64, u64) {
    let (d, s, p) = inactive_weighted_clip_fixture();
    let p = s
        .select_images_folder(p.revision, &d.path().join("source"))
        .unwrap();
    let p = add_bone(&s, &p, 0);
    let unused = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let candidate = p.edited_bone.unwrap();
    let p = s.edit(p.revision, RigEdit::Delete { id: unused }).unwrap();
    assert_ne!(
        p.bones.iter().position(|b| b.id == candidate).unwrap() as u64,
        candidate,
        "A stable ID must differ from its project index"
    );
    let (slot, attachment, other) = if clip {
        (
            p.slots[0].id,
            p.slots[0].attachments[0].id,
            p.slots[0].attachments[1].id,
        )
    } else {
        (
            p.slots[1].id,
            p.slots[1].attachments[0].id,
            p.slots[1].attachments[1].id,
        )
    };
    let p = if clip {
        p
    } else {
        command(
            &s,
            &p,
            serde_json::json!({"type":"attachmentEdit","id":attachment,"edit":{"type":"convertMesh","id":slot}}),
        )
    };
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":if active {attachment}else{other}}),
    );
    let child = p.bones[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"bindAttachment","id":attachment,"bones":[candidate,child,0]}),
    );
    let p = if clip {
        p
    } else {
        let rows = p.slots[1].attachments[0]
            .mesh
            .as_ref()
            .unwrap()
            .vertices
            .len();
        command(
            &s,
            &p,
            serde_json::json!({"type":"paintAttachmentWeights","id":attachment,"bone":child,"changes":(0..rows).map(|vertex|serde_json::json!({"vertex":vertex,"value":1.0})).collect::<Vec<_>>() }),
        )
    };
    (d, s, p, attachment, candidate)
}
fn dense_rows(a: &SceneAttachment) -> &[fbones_format::minimal::meshes::Vertex] {
    if let Some(m) = a.mesh() {
        &m.vertices
    } else {
        &a.clipping().unwrap().vertices
    }
}

fn cropped_mesh_fixture(
    folder: &str,
    local_position: impl Fn(usize, [f32; 2]) -> [f32; 2],
) -> (tempfile::TempDir, Session, ProjectSummary, PathBuf) {
    use fbones_format::minimal::meshes::Vertex;

    let (dir, session, initial) = setup();
    let placed = session
        .place_images(initial.revision, &["A".into()], 0, 0., 0.)
        .unwrap();
    let slot = placed.slots[0].id;
    let target = placed.slots[0].attachments[0].id;
    let placed = session
        .place_attachments(placed.revision, &["B".into(), "nested/C".into()], slot)
        .unwrap();
    let model = scene_model(&session);
    let source = &model.slots[0].attachments[0];
    let mut mesh = crate::mesh::from_region(source.image().unwrap(), model.slots[0].bone);
    let uvs = [
        [0.125, 0.125],
        [0.875, 0.125],
        [0.875, 0.375],
        [0.375, 0.375],
        [0.375, 0.875],
        [0.125, 0.875],
        [0.25, 0.25],
        [0.25, 0.625],
    ];
    mesh.hull = 6;
    mesh.uvs = uvs.into_iter().flatten().collect();
    mesh.vertices = uvs
        .into_iter()
        .enumerate()
        .map(|(index, uv)| Vertex {
            weights: vec![1.],
            positions: local_position(index, uv).to_vec(),
        })
        .collect();
    mesh.edges = vec![0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 0, 6, 7];
    mesh.triangles =
        crate::triangulation::triangulate_with_metric(&mesh.uvs, mesh.hull, &mesh.edges, [128.; 2])
            .unwrap();
    session
        .edit(
            placed.revision,
            RigEdit::AttachmentEdit {
                id: target,
                edit: Box::new(RigEdit::ReplaceMesh {
                    id: slot,
                    mesh: Box::new(mesh),
                }),
            },
        )
        .unwrap();
    let path = dir.path().join(folder).join("concave.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    session.close(false).unwrap();
    let project = session
        .replace(open_document(path.clone()).unwrap(), false)
        .unwrap();
    assert!(!project.inspection_only && !project.dirty && !project.can_undo);
    (dir, session, project, path)
}

fn generate_mesh_fixture() -> (tempfile::TempDir, Session, ProjectSummary, PathBuf) {
    cropped_mesh_fixture("generate-input", |index, [u, v]| {
        let x = if index == 0 { -0. } else { (u - 0.125) * 128. };
        let y = (0.875 - v) * 128. + if index == 6 { 5. } else { 0. };
        [x, y]
    })
}

#[test]
fn generate_mesh_preserves_concave_surface_and_explicit_edges_through_portable_history() {
    use fbones_format::minimal::meshes::Mesh;

    let (dir, session, project, source_path) = generate_mesh_fixture();
    let source_file = std::fs::read(&source_path).unwrap();
    let before = scene_model(&session);
    let original_attachment = &before.slots[0].attachments[0];
    let original = original_attachment.mesh().unwrap();
    let original_words = attachment_binding_bits(original_attachment);
    assert_eq!(original_words[1], (-0.0_f32).to_bits());
    let active = project.slots[0].active_attachment_id.unwrap();
    let target = project.slots[0].attachments[0].id;
    let inactive_sibling = project.slots[0].attachments[1].id;
    assert_ne!(active, target);
    assert_ne!(active, inactive_sibling);
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_payload = payload();
    let changed = command(
        &session,
        &project,
        serde_json::json!({"type":"generateMeshVertices","id":target}),
    );
    assert_eq!(changed.revision, project.revision + 1);
    assert_eq!(changed.edited_attachment, Some(target));
    assert_eq!(changed.slots[0].active_attachment_id, Some(active));

    let after = scene_model(&session);
    let generated_attachment = &after.slots[0].attachments[0];
    let generated = generated_attachment.mesh().unwrap();
    assert_eq!(generated.hull, original.hull);
    assert_eq!(generated.edges, original.edges);
    assert_eq!(
        generated.uvs[..original.uvs.len()]
            .iter()
            .map(|v| v.to_bits())
            .collect::<Vec<_>>(),
        original.uvs.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
    );
    assert_eq!(
        &attachment_binding_bits(generated_attachment)[..original_words.len()],
        original_words.as_slice()
    );
    let mut with_original = after.clone();
    with_original.slots[0].attachments[0] = original_attachment.clone();
    assert_eq!(encode_scene_payload(&with_original).unwrap(), before_payload);

    let faces = original.triangles.len() / 3;
    assert_eq!(generated.vertices.len(), original.vertices.len() + faces);
    assert_eq!(generated.triangles.len(), original.triangles.len() * 3);
    assert_eq!(
        generated
            .triangles
            .chunks_exact(3)
            .filter(|t| t.contains(&6) && t.contains(&7))
            .count(),
        2
    );
    let uv = |mesh: &Mesh, index: usize| {
        [f64::from(mesh.uvs[2 * index]), f64::from(mesh.uvs[2 * index + 1])]
    };
    let cross = |a: [f64; 2], b: [f64; 2], c: [f64; 2]| {
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    };
    for (index, source_face) in original.triangles.chunks_exact(3).enumerate() {
        let [a, b, c] = [
            source_face[0] as usize,
            source_face[1] as usize,
            source_face[2] as usize,
        ];
        let inserted = original.vertices.len() + index;
        let [p, q, r] = [uv(original, a), uv(original, b), uv(original, c)];
        let center = uv(generated, inserted);
        assert_eq!(
            center,
            [0, 1].map(|axis| f64::from(((p[axis] + q[axis] + r[axis]) / 3.) as f32))
        );
        assert!(
            center[0] <= 0.375 || center[1] <= 0.375,
            "Generated into the missing notch"
        );
        let area = cross(p, q, r);
        let weights =
            [cross(center, q, r), cross(p, center, r), cross(p, q, center)].map(|v| v / area);
        assert!(weights.iter().all(|v| *v > 0.));
        let row = &generated.vertices[inserted];
        assert_eq!(row.weights, [1.]);
        for axis in 0..2 {
            let expected: f64 = [a, b, c]
                .into_iter()
                .zip(weights)
                .map(|(vertex, factor)| f64::from(original.vertices[vertex].positions[axis]) * factor)
                .sum();
            assert!((f64::from(row.positions[axis]) - expected).abs() < 0.00001);
        }
        for [first, second] in [[a, b], [b, c], [c, a]] {
            let child = generated
                .triangles
                .chunks_exact(3)
                .find(|t| [first, second, inserted].iter().all(|v| t.contains(&(*v as u16))))
                .unwrap();
            assert_eq!(
                cross(
                    uv(generated, child[0] as usize),
                    uv(generated, child[1] as usize),
                    uv(generated, child[2] as usize)
                )
                .signum(),
                area.signum()
            );
        }
    }

    let after_payload = payload();
    let undone = session.edit(changed.revision, RigEdit::Undo).unwrap();
    assert!(!undone.dirty && !undone.can_undo && undone.can_redo);
    assert_eq!(payload(), before_payload);
    session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(payload(), after_payload);
    let destination = dir.path().join("generate-portable/reopened.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), destination.clone())
        .unwrap();
    let saved_payload = payload();
    session.close(false).unwrap();
    let reopened = session
        .replace(open_document(destination).unwrap(), false)
        .unwrap();
    assert!(!reopened.inspection_only && !reopened.dirty);
    assert_eq!(payload(), saved_payload);
    assert_eq!(
        attachment_binding_bits(&scene_model(&session).slots[0].attachments[0])[1],
        (-0.0_f32).to_bits()
    );
    assert_eq!(std::fs::read(source_path).unwrap(), source_file);
}

#[test]
fn new_mesh_outline_rebuilds_the_inspected_crop_on_its_local_image_plane() {
    use crate::evaluation::EvaluationMode;
    use serde_json::json;

    let plane = |[u, v]: [f32; 2]| [19. + 96. * u + 32. * v, -11. + 16. * u - 64. * v];
    let (dir, session, project, source_path) =
        cropped_mesh_fixture("outline-input", |_, uv| plane(uv));
    let source_bytes = std::fs::read(&source_path).unwrap();
    let active = project.slots[0].active_attachment_id.unwrap();
    let target = project.slots[0].attachments[0].id;
    assert_ne!(active, target);
    assert_ne!(active, project.slots[0].attachments[1].id);
    let before = scene_model(&session);
    let source_attachment = &before.slots[0].attachments[0];
    let original = source_attachment.mesh().unwrap();
    assert!(original.uvs.iter().all(|&uv| uv > 0. && uv < 1.));
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_payload = payload();
    let before_summary = serde_json::to_value(&project).unwrap();
    let lease = evaluated(&session, &project, EvaluationMode::None, 0.);

    for uvs in [
        vec![[-0.125, 0.125], [0.75, 0.125], [0.375, 0.875]],
        vec![[0., 0.], [1., 1.], [0., 1.], [1., 0.]],
        vec![[0., 0.], [0.5, 0.5], [1., 1.]],
        vec![[0., 0.], [1., 0.], [1., 1.], [0., 0.]],
        vec![[0., 0.], [1., 0.], [0.5, 0.], [1., 1.], [0., 1.]],
    ] {
        assert_eq!(
            session
                .edit_in_pose(
                    project.revision,
                    lease.pose_epoch,
                    RigEdit::ReplaceMeshOutline { id: target, uvs },
                )
                .unwrap_err()
                .code,
            "InvalidMesh"
        );
        assert_eq!(payload(), before_payload);
        assert_eq!(
            serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
            before_summary
        );
    }

    // The clockwise concave ring grows beyond the old crop to the texture
    // borders, which distinguishes affine source placement from a fresh quad.
    let outline: [[f32; 2]; 6] = [
        [0., 0.],
        [0., 1.],
        [0.5, 1.],
        [0.5, 0.25],
        [1., 0.25],
        [1., 0.],
    ];
    let edited = session
        .edit_in_pose(
            project.revision,
            lease.pose_epoch,
            serde_json::from_value(json!({"type":"replaceMeshOutline","id":target,"uvs":outline}))
                .unwrap(),
        )
        .unwrap();
    assert_eq!(edited.revision, project.revision + 1);
    assert_eq!(edited.edited_attachment, Some(target));
    assert_eq!(edited.slots[0].active_attachment_id, Some(active));
    assert!(edited.dirty && edited.can_undo && !edited.can_redo);
    let after = scene_model(&session);
    let outlined = after.slots[0].attachments[0].mesh().unwrap();
    assert_eq!(outlined.image, original.image);
    assert_eq!(outlined.bones, original.bones);
    assert!(!outlined.weighted);
    assert_eq!(outlined.hull, outline.len());
    assert_eq!(
        outlined.uvs,
        outline.into_iter().flatten().collect::<Vec<_>>()
    );
    assert_eq!(outlined.edges, [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 0]);
    assert_eq!(outlined.vertices.len(), outline.len());
    for (row, uv) in outlined.vertices.iter().zip(outline) {
        assert_eq!(row.weights, [1.]);
        assert_eq!(
            row.positions
                .iter()
                .map(|v| v.to_bits())
                .collect::<Vec<_>>(),
            plane(uv).map(f32::to_bits)
        );
    }
    assert_eq!(outlined.triangles.len(), (outline.len() - 2) * 3);
    let mut covered_area = 0.;
    for face in outlined.triangles.chunks_exact(3) {
        let [a, b, c] = [face[0], face[1], face[2]].map(|i| outline[i as usize]);
        let twice_area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        assert!(twice_area > 0.);
        covered_area += twice_area / 2.;
    }
    assert_eq!(covered_area, 0.625);
    for [a, b] in outlined
        .edges
        .chunks_exact(2)
        .map(|edge| [edge[0] as u16, edge[1] as u16])
    {
        assert_eq!(
            outlined
                .triangles
                .chunks_exact(3)
                .filter(|face| face.contains(&a) && face.contains(&b))
                .count(),
            1
        );
    }
    let mut with_source = after.clone();
    with_source.slots[0].attachments[0] = source_attachment.clone();
    assert_eq!(encode_scene_payload(&with_source).unwrap(), before_payload);

    let after_payload = payload();
    let undone = session.edit(edited.revision, RigEdit::Undo).unwrap();
    assert!(!undone.dirty && !undone.can_undo && undone.can_redo);
    assert_eq!(payload(), before_payload);
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert!(redone.dirty && redone.can_undo && !redone.can_redo);
    assert_eq!(payload(), after_payload);
    let destination = dir.path().join("outline-portable/reopened.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), destination.clone())
        .unwrap();
    let saved_payload = payload();
    session.close(false).unwrap();
    let reopened = session
        .replace(open_document(destination).unwrap(), false)
        .unwrap();
    assert!(!reopened.inspection_only && !reopened.dirty);
    assert_eq!(payload(), saved_payload);
    assert_eq!(std::fs::read(source_path).unwrap(), source_bytes);
}

#[test]
fn generate_mesh_rejects_stale_leases_weighted_meshes_and_live_or_stored_deform() {
    assert_mesh_topology_authoring_guards(|id| RigEdit::GenerateMeshVertices { id });
}

#[test]
fn new_mesh_outline_rejects_stale_leases_weighted_meshes_and_live_or_stored_deform() {
    assert_mesh_topology_authoring_guards(|id| RigEdit::ReplaceMeshOutline {
        id,
        uvs: vec![[0., 0.], [1., 0.], [1., 1.], [0., 1.]],
    });
}

fn assert_mesh_topology_authoring_guards(mesh_edit: impl Fn(u64) -> RigEdit) {
    use crate::evaluation::{EvaluationMode, EvaluationRequest};
    use serde_json::json;

    let (_dir, session, project, _) = generate_mesh_fixture();
    let target = project.slots[0].attachments[0].id;
    let weighted = project.slots[0].attachments[1].id;
    let active_region = project.slots[0].active_attachment_id.unwrap();
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let reject =
        |before: &ProjectSummary, error: &str, edit: &dyn Fn() -> Result<ProjectSummary, AppError>| {
            let bytes = payload();
            assert_eq!(edit().unwrap_err().code, error);
            assert_eq!(
                serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
                serde_json::to_value(before).unwrap()
            );
            assert_eq!(payload(), bytes);
        };
    let stale = evaluated(&session, &project, EvaluationMode::None, 0.);
    evaluated(&session, &project, EvaluationMode::None, 0.);
    reject(&project, "StalePose", &|| {
        session.edit_in_pose(project.revision, stale.pose_epoch, mesh_edit(target))
    });
    reject(&project, "ProjectChanged", &|| {
        session.edit(project.revision - 1, mesh_edit(target))
    });
    reject(&project, "InvalidMesh", &|| {
        session.edit(project.revision, mesh_edit(active_region))
    });
    let slot = project.slots[0].id;
    let owner = project.bones[0].id;
    let project = command(
        &session,
        &project,
        json!({"type":"attachmentEdit","id":weighted,"edit":{"type":"convertMesh","id":slot}}),
    );
    let project = command(
        &session,
        &project,
        json!({"type":"bindAttachment","id":weighted,"bones":[owner]}),
    );
    assert!(project.slots[0].attachments[1].mesh.as_ref().unwrap().weighted);
    reject(&project, "InvalidMesh", &|| {
        session.edit(project.revision, mesh_edit(weighted))
    });
    let project = command(
        &session,
        &project,
        json!({"type":"createAnimation","name":"Other clip owns Deform"}),
    );
    let animation = project.edited_animation.unwrap();
    let animate_pose = session
        .evaluate(
            project.revision,
            EvaluationRequest {
                animation_id: Some(animation),
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                from_pose_epoch: None,
                mode: EvaluationMode::Replay,
                time: 0.,
                motion: None,
            },
        )
        .unwrap();
    reject(&project, "InvalidPose", &|| {
        session.edit_in_pose(project.revision, animate_pose.pose_epoch, mesh_edit(target))
    });
    let mut offsets = vec![0.; 16];
    offsets[2] = 4.;
    let project = command(
        &session,
        &project,
        json!({"type":"setAnimationDeformKeys","animation":animation,"keys":[
            {"attachment":target,"frame":0,"offsets":offsets,"dataPresent":true,"curve":"linear"}
        ]}),
    );
    let key = project.animations.iter().find(|clip| clip.id == animation).unwrap()
        .deform_tracks[0].keys[0].id;
    let project = command(
        &session,
        &project,
        json!({"type":"createAnimation","name":"Unrelated current clip"}),
    );
    assert_ne!(project.edited_animation, Some(animation));
    reject(&project, "InvalidAnimation", &|| {
        session.edit(project.revision, mesh_edit(target))
    });

    let project = command(
        &session,
        &project,
        json!({"type":"storeAnimationKeys","animation":animation}),
    );
    let project = command(
        &session,
        &project,
        json!({"type":"deleteAnimationKeys","animation":animation,"keys":[key]}),
    );
    assert!(project.animations.iter().all(|clip| clip.deform_tracks.is_empty()));
    let stored = project.stored_animation.as_ref().unwrap();
    assert_eq!(stored.deform_tracks[0].attachment, target);
    assert_eq!(stored.deform_tracks[0].keys[0].id, key);
    reject(&project, "InvalidAnimation", &|| {
        session.edit(project.revision, mesh_edit(target))
    });
}

#[test]
fn paste_weights_maps_ordered_rows_and_exact_words_in_one_session_edit() {
    use crate::{evaluation::EvaluationMode, rig::PasteWeightRow};
    use fbones_format::minimal::{meshes::Vertex, scene::encode_scene};
    use serde_json::json;

    fn rows_mut(a: &mut SceneAttachment) -> &mut [Vertex] {
        match a {
            SceneAttachment::Mesh(m) => &mut m.vertices,
            SceneAttachment::Clipping(c) => &mut c.vertices,
            SceneAttachment::Region(_) | SceneAttachment::Path(_) => panic!("weighted fixture"),
        }
    }

    for clip in [false, true] {
        let (d, s, p, _, _) = scoped_auto_fixture(clip, false);
        add_bone(&s, &p, 0);
        let slot = if clip { 0 } else { 1 };
        let mut fixture = scene_model(&s);
        fixture.images_root = "./source".into();
        let owner = fixture.slots[slot].bone;
        let attachment = &mut fixture.slots[slot].attachments[0];
        let bones = match &*attachment {
            SceneAttachment::Mesh(m) => m.bones.clone(),
            SceneAttachment::Clipping(c) => c.bones.clone(),
            SceneAttachment::Region(_) | SceneAttachment::Path(_) => panic!("weighted fixture"),
        };
        assert_eq!(bones.len(), 3);
        let world = crate::rig::poses(&fixture.rig.bones);
        let points = geometry_points(attachment, owner, &world);
        let rows = rows_mut(attachment);
        for (row, [x, y]) in rows.iter_mut().zip(points) {
            row.positions = bones
                .iter()
                .flat_map(|&bone| {
                    let (x, y) = world[bone].inverse().unwrap().point(x, y);
                    [x, y]
                })
                .collect();
        }
        rows[1].weights = vec![0.5, 0.5, -0.0];
        rows[3].weights = vec![0., 0.75, 0.25];
        rows[3].positions[0] += 1.;
        let source = d.path().join("paste-input.spine");
        let source_bytes = encode_scene(&fixture).unwrap();
        std::fs::write(&source, &source_bytes).unwrap();
        let p = s
            .replace(open_document(source.clone()).unwrap(), true)
            .unwrap();
        assert!(!p.inspection_only);
        let id = p.slots[slot].attachments[0].id;
        let sibling = p.slots[slot].active_attachment_id.unwrap();
        assert_ne!(id, sibling);
        let [first, second, locked] = [bones[0], bones[1], bones[2]].map(|bone| p.bones[bone].id);
        let unbound = p.bones.last().unwrap().id;
        let p = if clip {
            command(
                &s,
                &p,
                json!({"type":"addConstraint","constraint":{"type":"physics","name":"Paste lease","bone":second,"x":1,"wind":10,"strength":20}}),
            )
        } else {
            p
        };
        let columns = vec![locked, first, second];
        let copied = vec![
            PasteWeightRow {
                vertex: 3,
                weight_bits: [0.25, 0.5, 0.25].map(f32::to_bits).to_vec(),
            },
            PasteWeightRow {
                vertex: 1,
                weight_bits: [-0.0, -0.0, 1.].map(f32::to_bits).to_vec(),
            },
        ];
        let paste = |bones, rows| RigEdit::PasteAttachmentWeights {
            id,
            bones,
            rows,
            locked_bones: Some(vec![locked]),
        };
        let edit = || paste(columns.clone(), copied.clone());
        let before = scene_model(&s);
        let payload = || encode_scene_payload(&scene_model(&s)).unwrap();
        let initial = payload();
        let dto = serde_json::to_value(&p).unwrap();
        let reject = |result: Result<ProjectSummary, AppError>, error: &str| {
            assert_eq!(result.unwrap_err().code, error);
            assert_eq!(payload(), initial);
            assert_eq!(
                serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
                dto
            );
        };
        reject(s.edit(p.revision - 1, edit()), "ProjectChanged");
        let epoch = if clip {
            reject(s.edit(p.revision, edit()), "PoseRequired");
            let stale = evaluated(&s, &p, EvaluationMode::Replay, 0.).pose_epoch;
            let current = evaluated(&s, &p, EvaluationMode::Replay, 0.).pose_epoch;
            reject(s.edit_in_pose(p.revision, stale, edit()), "StalePose");
            Some(current)
        } else {
            None
        };
        let apply = |edit| match epoch {
            Some(epoch) => s.edit_in_pose(p.revision, epoch, edit),
            None => s.edit(p.revision, edit),
        };
        reject(
            apply(paste(vec![locked, first, unbound], copied.clone())),
            "InvalidBinding",
        );
        reject(
            apply(paste(vec![locked, first, u64::MAX], copied.clone())),
            "InvalidSceneEdit",
        );
        for invalid in [
            PasteWeightRow {
                vertex: 3,
                ..copied[1].clone()
            },
            PasteWeightRow {
                vertex: 999,
                ..copied[1].clone()
            },
            PasteWeightRow {
                vertex: 1,
                weight_bits: vec![0, 0],
            },
            PasteWeightRow {
                vertex: 1,
                weight_bits: [f32::NAN, -0.0, 1.].map(f32::to_bits).to_vec(),
            },
            PasteWeightRow {
                vertex: 1,
                weight_bits: [0.0, -0.0, 1.].map(f32::to_bits).to_vec(),
            },
        ] {
            reject(
                apply(paste(columns.clone(), vec![copied[0].clone(), invalid])),
                "InvalidBinding",
            );
        }
        let mut expected = before;
        let rows = rows_mut(&mut expected.slots[slot].attachments[0]);
        assert_eq!(rows[1].weights[2].to_bits(), (-0.0_f32).to_bits());
        rows[3].weights = vec![0.5, 0.25, 0.25];
        rows[1].weights = vec![-0.0, 1., -0.0];
        let expected = encode_scene_payload(&expected).unwrap();
        let changed = apply(edit()).unwrap();
        assert_eq!(changed.revision, p.revision + 1);
        assert_eq!(changed.slots[slot].active_attachment_id, Some(sibling));
        assert_eq!(payload(), expected);
        let noop = if clip {
            let pose = evaluated(&s, &changed, EvaluationMode::Replay, 0.);
            s.edit_in_pose(changed.revision, pose.pose_epoch, edit())
                .unwrap()
        } else {
            s.edit(changed.revision, edit()).unwrap()
        };
        assert_eq!(noop.revision, changed.revision);
        let undone = s.edit(noop.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), initial);
        assert!(undone.can_redo);
        s.edit(undone.revision, RigEdit::Redo).unwrap();
        assert_eq!(payload(), expected);
        let destination = d.path().join("portable/paste.fbones");
        s.save_snapshot(s.prepare_save(true).unwrap(), destination.clone())
            .unwrap();
        let saved = payload();
        s.close(false).unwrap();
        let reopened = s
            .replace(open_document(destination).unwrap(), false)
            .unwrap();
        assert!(!reopened.inspection_only && !reopened.dirty);
        assert_eq!(payload(), saved);
        assert_eq!(std::fs::read(source).unwrap(), source_bytes);
    }
}

fn prune_fixture(crossing: bool) -> (tempfile::TempDir, Session, ProjectSummary, PathBuf, Vec<u8>) {
    use fbones_format::minimal::scene::encode_scene;
    use serde_json::json;

    let (d, s, mut p) = inactive_weighted_clip_fixture();
    p = s
        .select_images_folder(p.revision, &d.path().join("source"))
        .unwrap();
    for _ in 0..4 {
        p = add_bone(&s, &p, 0);
    }
    let slot = p.slots[1].id;
    let mesh = p.slots[1].attachments[0].id;
    let sibling = p.slots[1].attachments[1].id;
    let p = command(
        &s,
        &p,
        json!({"type":"setActiveAttachment","slot":slot,"attachment":sibling}),
    );
    command(
        &s,
        &p,
        json!({"type":"attachmentEdit","id":mesh,"edit":{"type":"convertMesh","id":slot}}),
    );
    let mut model = scene_model(&s);
    model.images_root = "./source".into();
    // Binding order deliberately disagrees with project bone order at the tie.
    let bones = [5, 3, 0, 1, 2, 4];
    let world = crate::rig::poses(&model.rig.bones);
    let local = |bone: usize, [x, y]: [f32; 2]| {
        let (x, y) = world[bone].inverse().unwrap().point(x, y);
        [x, y]
    };
    let positions = |point: [f32; 2]| {
        let mut coordinates = bones
            .iter()
            .flat_map(|&bone| local(bone, point))
            .collect::<Vec<_>>();
        coordinates[11] = -0.;
        coordinates
    };
    let mesh = model.slots[1].attachments[0].mesh_mut().unwrap();
    let points = crate::mesh::world_vertices(mesh, &world);
    mesh.weighted = true;
    mesh.bones = bones.to_vec();
    let mesh_weights = [
        [0.5, 0.25, 0.125, 0.0625, 0.0625, -0.0],
        [0.375, 0.25, 0.25, 0.0625, 0.0625, -0.0],
        [0.1015625, 0.1015625, 0.09375, 0.078125, 0.625, -0.0],
        [0.50004, 0.5, 0.0, 0.0, 0.0, -0.0],
    ];
    assert_eq!(mesh.vertices.len(), mesh_weights.len());
    for ((row, point), weights) in mesh.vertices.iter_mut().zip(points).zip(mesh_weights) {
        row.positions = positions(point);
        row.weights = weights.to_vec();
    }
    let clip = model.slots[0].attachments[0].clipping_mut().unwrap();
    clip.bones = bones.to_vec();
    let square = [[0., 0.], [40., 0.], [40., 40.], [0., 40.]];
    assert_eq!(clip.vertices.len(), square.len());
    for (vertex, (row, point)) in clip.vertices.iter_mut().zip(square).enumerate() {
        row.weights = if vertex == 0 && !crossing {
            vec![0.375, 0.25, 0.25, 0.0625, 0.0625, -0.0]
        } else {
            vec![1., 0., 0., 0., 0., -0.0]
        };
        row.positions = positions(point);
        if vertex == 0 && crossing {
            // The original square is valid. Removing column 1 crosses its far edge.
            row.weights[..2].copy_from_slice(&[0.875, 0.125]);
            row.positions[..2].copy_from_slice(&local(bones[0], [80., 20.]));
            row.positions[2..4].copy_from_slice(&local(bones[1], [-560., -140.]));
        }
    }
    crate::clip_edit::validate_polygon(clip, &world).unwrap();
    let source = d.path().join("prune-input.spine");
    let source_bytes = encode_scene(&model).unwrap();
    std::fs::write(&source, &source_bytes).unwrap();
    let p = s
        .replace(open_document(source.clone()).unwrap(), true)
        .unwrap();
    assert!(!p.inspection_only && !p.can_undo && !p.can_redo);
    (d, s, p, source, source_bytes)
}

#[test]
fn prune_preview_and_apply_share_sparse_weights_and_one_atomic_history_step() {
    use crate::{
        evaluation::EvaluationMode,
        rig::{PruneWeightsRequest, PruneWeightsTarget},
    };

    let (d, s, p, source, source_bytes) = prune_fixture(false);
    let mesh = &p.slots[1].attachments[0];
    let clip = &p.slots[0].attachments[0];
    let bones = &mesh.mesh.as_ref().unwrap().bones;
    assert!(bones[1] > bones[2]);
    let request = PruneWeightsRequest {
        targets: vec![
            PruneWeightsTarget {
                id: mesh.id,
                locked_bones: Some(vec![bones[4], bones[5]]),
            },
            PruneWeightsTarget {
                id: clip.id,
                locked_bones: Some(vec![bones[3], bones[5]]),
            },
        ],
        max_influences: 3,
        threshold: 0.125,
    };
    let before = scene_model(&s);
    let payload = || encode_scene_payload(&scene_model(&s)).unwrap();
    let initial = payload();
    let dto = serde_json::to_value(&p).unwrap();
    let first = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
    let frozen = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
    let epoch = Some(frozen.pose_epoch);
    let edit = || RigEdit::PruneAttachmentWeights {
        request: request.clone(),
    };
    assert_eq!(
        s.preview_prune_weights(p.revision - 1, request.clone(), epoch)
            .err()
            .unwrap()
            .code,
        "ProjectChanged"
    );
    assert_eq!(
        s.preview_prune_weights(p.revision, request.clone(), Some(first.pose_epoch))
            .err()
            .unwrap()
            .code,
        "StalePose"
    );
    assert_eq!(
        s.edit_in_pose(p.revision, first.pose_epoch, edit())
            .unwrap_err()
            .code,
        "StalePose"
    );
    let impossible = PruneWeightsRequest {
        max_influences: 1,
        ..request.clone()
    };
    assert_eq!(
        s.preview_prune_weights(p.revision, impossible.clone(), epoch)
            .err()
            .unwrap()
            .code,
        "InvalidBinding"
    );
    assert_eq!(
        s.edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            RigEdit::PruneAttachmentWeights {
                request: impossible
            }
        )
        .unwrap_err()
        .code,
        "InvalidBinding"
    );
    let threshold_only = PruneWeightsRequest {
        max_influences: 6,
        ..request.clone()
    };
    let preview = s
        .preview_prune_weights(p.revision, threshold_only, epoch)
        .unwrap();
    let row = &preview.targets[0].rows[0];
    assert_eq!(row.vertex, 0);
    assert!(
        row.weights[2] > request.threshold,
        "A weight equal to the threshold survives."
    );
    assert_eq!(row.weights[3], 0.);
    assert_eq!(payload(), initial);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        dto
    );

    let preview = s
        .preview_prune_weights(p.revision, request.clone(), epoch)
        .unwrap();
    assert_eq!(
        (preview.document_id, preview.revision, preview.pose_epoch),
        (p.document_id, p.revision, epoch)
    );
    assert_eq!(preview.removed, 9);
    let mesh_weights: [[f32; 6]; 3] = [
        [0.625, 0.3125, 0., 0., 0.0625, -0.0],
        [0.5625, 0.375, 0., 0., 0.0625, -0.0],
        [0.375, 0., 0., 0., 0.625, -0.0],
    ];
    let clip_weights: [[f32; 6]; 1] = [[0.5625, 0.375, 0., 0.0625, 0., -0.0]];
    let expected = [(mesh.id, &mesh_weights[..]), (clip.id, &clip_weights[..])];
    assert_eq!(preview.targets.len(), expected.len());
    for (target, (id, rows)) in preview.targets.iter().zip(expected) {
        assert_eq!(target.id, id);
        assert_eq!(target.rows.len(), rows.len());
        for (vertex, (actual, expected)) in target.rows.iter().zip(rows).enumerate() {
            assert_eq!(actual.vertex, vertex);
            assert_eq!(
                actual
                    .weights
                    .iter()
                    .map(|w| w.to_bits())
                    .collect::<Vec<_>>(),
                expected.map(f32::to_bits)
            );
        }
    }
    assert_eq!(payload(), initial);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        dto
    );
    let mut expected = before;
    for (row, weights) in expected.slots[1].attachments[0]
        .mesh_mut()
        .unwrap()
        .vertices
        .iter_mut()
        .zip(mesh_weights)
    {
        row.weights.copy_from_slice(&weights);
    }
    expected.slots[0].attachments[0]
        .clipping_mut()
        .unwrap()
        .vertices[0]
        .weights
        .copy_from_slice(&clip_weights[0]);
    let expected = encode_scene_payload(&expected).unwrap();
    let changed = s
        .edit_in_pose(p.revision, frozen.pose_epoch, edit())
        .unwrap();
    assert_eq!(changed.revision, p.revision + 1);
    assert_eq!(payload(), expected);
    let undone = s.edit(changed.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), initial);
    assert!(!undone.dirty && !undone.can_undo && undone.can_redo);
    let neutral = PruneWeightsRequest {
        max_influences: 128,
        threshold: 0.,
        ..request
    };
    let preview = s
        .preview_prune_weights(undone.revision, neutral.clone(), None)
        .unwrap();
    assert_eq!(preview.removed, 0);
    assert!(preview.targets.is_empty());
    let noop = s
        .edit(
            undone.revision,
            RigEdit::PruneAttachmentWeights { request: neutral },
        )
        .unwrap();
    assert_eq!(noop.revision, undone.revision);
    assert!(noop.can_redo);
    s.edit(noop.revision, RigEdit::Redo).unwrap();
    assert_eq!(payload(), expected);

    let destination = d.path().join("portable/prune.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), destination.clone())
        .unwrap();
    let saved = payload();
    s.close(false).unwrap();
    let p = s
        .replace(open_document(destination).unwrap(), false)
        .unwrap();
    assert!(!p.inspection_only && !p.dirty);
    assert_eq!(payload(), saved);
    assert_eq!(std::fs::read(source).unwrap(), source_bytes);
}

#[test]
fn prune_crossing_clip_rejects_the_whole_mesh_and_clipping_batch() {
    use crate::rig::{PruneWeightsRequest, PruneWeightsTarget};

    let (_d, s, p, _, _) = prune_fixture(true);
    let payload = || encode_scene_payload(&scene_model(&s)).unwrap();
    let initial = payload();
    let dto = serde_json::to_value(&p).unwrap();
    let mut request = PruneWeightsRequest {
        targets: vec![PruneWeightsTarget {
            id: p.slots[1].attachments[0].id,
            locked_bones: None,
        }],
        max_influences: 1,
        threshold: 0.,
    };
    assert!(
        s.preview_prune_weights(p.revision, request.clone(), None)
            .unwrap()
            .removed
            > 0
    );
    request.targets.push(PruneWeightsTarget {
        id: p.slots[0].attachments[0].id,
        locked_bones: None,
    });
    assert_eq!(
        s.preview_prune_weights(p.revision, request.clone(), None)
            .err()
            .unwrap()
            .code,
        "InvalidClipping"
    );
    assert_eq!(payload(), initial);
    assert_eq!(
        s.edit(p.revision, RigEdit::PruneAttachmentWeights { request })
            .unwrap_err()
            .code,
        "InvalidClipping"
    );
    assert_eq!(payload(), initial);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        dto
    );
}

#[test]
fn update_attachment_bindings_recaptures_the_frozen_shape_and_keeps_weight_words() {
    use crate::{evaluation::EvaluationMode, rig::Pose};
    use fbones_format::minimal::{meshes::Vertex, scene::encode_scene};
    use serde_json::json;

    fn rows_mut(a: &mut SceneAttachment) -> &mut [Vertex] {
        match a {
            SceneAttachment::Mesh(m) => &mut m.vertices,
            SceneAttachment::Clipping(c) => &mut c.vertices,
            SceneAttachment::Region(_) | SceneAttachment::Path(_) => panic!("weighted fixture"),
        }
    }

    fn project(pose: Pose, local: &[f32]) -> [f64; 2] {
        let (x, y) = (f64::from(local[0]), f64::from(local[1]));
        [
            f64::from(pose.x) + f64::from(pose.a) * x + f64::from(pose.c) * y,
            f64::from(pose.y) + f64::from(pose.b) * x + f64::from(pose.d) * y,
        ]
    }

    for clip in [false, true] {
        let (d, s, _, _, _) = scoped_auto_fixture(clip, false);
        let slot = if clip { 0 } else { 1 };
        let mut fixture = scene_model(&s);
        fixture.images_root = "./source".into();
        let attachment = &mut fixture.slots[slot].attachments[0];
        let bones = if let Some(mesh) = attachment.mesh() {
            mesh.bones.clone()
        } else {
            attachment.clipping().unwrap().bones.clone()
        };
        let row = &mut rows_mut(attachment)[0];
        assert_eq!(row.weights[0], 0.);
        row.weights = vec![-0., 0.75, 0.25005];
        row.positions[..2].copy_from_slice(&[-33.25, -0.]);
        let source = d.path().join("binding-input.spine");
        let source_bytes = encode_scene(&fixture).unwrap();
        std::fs::write(&source, &source_bytes).unwrap();
        let p = s
            .replace(open_document(source.clone()).unwrap(), true)
            .unwrap();
        assert!(!p.inspection_only);

        let id = p.slots[slot].attachments[0].id;
        let active = p.slots[slot].active_attachment_id.unwrap();
        assert_ne!(id, active);
        let child = p.bones[bones[1]].id;
        let p = s
            .edit(p.revision, RigEdit::Move { id: child, x: 19., y: 10. })
            .unwrap();
        let p = command(
            &s,
            &p,
            json!({"type":"create","parent":0,"x":69,"y":10,"rotation":0,"length":0}),
        );
        let target = p.edited_bone.unwrap();
        let p = command(
            &s,
            &p,
            json!({"type":"addConstraint","constraint":{"type":"ik","name":"Binding pose goal","bones":[child],"target":target}}),
        );
        let p = command(
            &s,
            &p,
            json!({"type":"createAnimation","name":"Distinct pose context"}),
        );
        let animation = p.edited_animation.unwrap();
        let p = s
            .save_snapshot(s.prepare_save(true).unwrap(), d.path().join("baseline/setup.fbones"))
            .unwrap();

        let before = scene_model(&s);
        let initial = encode_scene_payload(&before).unwrap();
        let payload = || encode_scene_payload(&scene_model(&s)).unwrap();
        let edit = || RigEdit::UpdateAttachmentBindings { id };
        let first = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
        let animated = s
            .evaluate(
                p.revision,
                serde_json::from_value(json!({"mode":"replay","time":0,"animationId":animation}))
                    .unwrap(),
            )
            .unwrap();
        assert_eq!(animated.animation_id, Some(animation));
        let dto = serde_json::to_value(&p).unwrap();
        let rejected = |result: Result<ProjectSummary, AppError>, code: &str| {
            assert_eq!(result.unwrap_err().code, code);
            assert_eq!(payload(), initial);
            assert_eq!(
                serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
                dto
            );
        };
        rejected(s.edit(p.revision - 1, edit()), "ProjectChanged");
        rejected(s.edit(p.revision, edit()), "PoseRequired");
        rejected(s.edit_in_pose(p.revision, first.pose_epoch, edit()), "StalePose");
        rejected(s.edit_in_pose(p.revision, animated.pose_epoch, edit()), "InvalidPose");

        let frozen = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
        let world = snapshot_poses(&frozen);
        let authored = crate::rig::poses(&before.rig.bones);
        let axis = bones[1];
        assert!((world[axis].b - authored[axis].b).abs() > 0.05);
        let changed = s
            .edit_in_pose(p.revision, frozen.pose_epoch, edit())
            .unwrap();
        assert_eq!(changed.revision, p.revision + 1);
        assert_eq!(changed.edited_attachment, Some(id));
        assert_eq!(changed.slots[slot].active_attachment_id, Some(active));
        let mut after = scene_model(&s);
        let captured = payload();
        assert_ne!(captured, initial);
        let original = dense_rows(&before.slots[slot].attachments[0]);
        assert_eq!(original[0].weights[0].to_bits(), (-0.0_f32).to_bits());
        assert!(original.iter().all(|row| row.weights[0] == 0.));
        let updated = rows_mut(&mut after.slots[slot].attachments[0]);
        assert_eq!(original.len(), updated.len());
        for (index, (old, new)) in original.iter().zip(updated).enumerate() {
            let mut visible = [0.0, 0.0];
            let mass = old.weights.iter().map(|&weight| f64::from(weight)).sum::<f64>();
            let weights = old.weights.iter().map(|&weight| f64::from(weight));
            for (column, (&bone, weight)) in bones.iter().zip(weights).enumerate() {
                let point = project(world[bone], &old.positions[column * 2..]);
                for axis in 0..2 {
                    visible[axis] += point[axis] * weight;
                }
            }
            let anchor = visible.map(|axis| axis / mass);
            if index == 0 {
                assert!((mass - 1.).abs() > 4e-5);
                assert!((anchor[0] - visible[0]).hypot(anchor[1] - visible[1]) > 2e-4);
                assert_ne!(new.positions[..2], old.positions[..2]);
            }
            let mut rendered = [0.0, 0.0];
            for (column, &bone) in bones.iter().enumerate() {
                let point = project(world[bone], &new.positions[column * 2..]);
                for axis in 0..2 {
                    assert!((point[axis] - anchor[axis]).abs() < 7e-5);
                    rendered[axis] += point[axis] * f64::from(new.weights[column]);
                }
            }
            for axis in 0..2 {
                assert!((rendered[axis] - visible[axis]).abs() < 7e-5);
            }
            new.positions.clone_from(&old.positions);
        }
        assert_eq!(encode_scene_payload(&after).unwrap(), initial);

        let repeated_pose = evaluated(&s, &changed, EvaluationMode::Replay, 0.0);
        let repeated = s
            .edit_in_pose(changed.revision, repeated_pose.pose_epoch, edit())
            .unwrap();
        assert_eq!(repeated.revision, changed.revision);
        assert_eq!(payload(), captured);
        let undone = s.edit(changed.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), initial);
        assert!(!undone.dirty && undone.can_redo);
        let _redone = s.edit(undone.revision, RigEdit::Redo).unwrap();
        assert_eq!(payload(), captured);
        let destination = d.path().join("portable/bindings.fbones");
        s.save_snapshot(s.prepare_save(true).unwrap(), destination.clone())
            .unwrap();
        let saved = payload();
        s.close(false).unwrap();
        let p = s.replace(open_document(destination).unwrap(), false).unwrap();
        assert!(!p.inspection_only && !p.dirty);
        assert_eq!(payload(), saved);
        assert_eq!(std::fs::read(source).unwrap(), source_bytes);

        let dormant = &p.bones[bones[0]];
        let p = command(
            &s,
            &p,
            json!({"type":"update","id":dormant.id,"name":dormant.name,"x":dormant.x,"y":dormant.y,"length":dormant.length,"rotation":dormant.rotation,"scaleX":0,"scaleY":1}),
        );
        let pose = evaluated(&s, &p, EvaluationMode::Replay, 0.0);
        let id = p.slots[slot].attachments[0].id;
        let singular = payload();
        assert_eq!(
            s.edit_in_pose(p.revision, pose.pose_epoch, RigEdit::UpdateAttachmentBindings { id })
                .unwrap_err()
                .code,
            "InvalidBone"
        );
        assert_eq!(payload(), singular);
        assert_eq!(
            serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
            serde_json::to_value(&p).unwrap()
        );
    }
}
#[test]
fn scene_swap_attachment_weights_preserves_bits_history_and_portable_roundtrip() {
    use fbones_format::minimal::{meshes::Vertex, scene::encode_scene};
    use serde_json::json;

    fn binding(a: &mut SceneAttachment) -> (&mut Vec<usize>, &mut [Vertex]) {
        match a {
            SceneAttachment::Mesh(m) => (&mut m.bones, &mut m.vertices),
            SceneAttachment::Clipping(c) => (&mut c.bones, &mut c.vertices),
            SceneAttachment::Region(_) | SceneAttachment::Path(_) => panic!("weighted fixture"),
        }
    }

    for clip in [false, true] {
        let (d, s, p, _, _) = scoped_auto_fixture(clip, false);
        let p = add_bone(&s, &p, 0);
        let fourth = p.bones.len() - 1;
        let _p = add_bone(&s, &p, 0);
        let slot = if clip { 0 } else { 1 };
        let mut fixture = scene_model(&s);
        fixture.images_root = "./source".into();
        let poses = crate::rig::poses(&fixture.rig.bones);
        let owner = fixture.slots[slot].bone;
        let target = &mut fixture.slots[slot].attachments[0];
        let points = geometry_points(target, owner, &poses);
        let (bones, rows) = binding(target);
        bones.push(fourth);
        let columns = [bones[0], bones[1], bones[2], bones[3]];
        assert!(rows.len() > 2);
        for (index, (row, [x, y])) in rows.iter_mut().zip(points).enumerate() {
            // The first and third columns agree bit for bit in every row.
            row.weights = match index {
                0 => vec![0., -0., 0., 1.],
                1 => vec![0.125, 0.375, 0.125, 0.375],
                _ => vec![0.25, 0.25, 0.25, 0.25],
            };
            row.positions = columns
                .iter()
                .flat_map(|&bone| {
                    let (local_x, local_y) = poses[bone].inverse().unwrap().point(x, y);
                    [local_x, local_y]
                })
                .collect();
        }
        rows[0].positions[0] = -0.;

        let source = d.path().join("swap-input.spine");
        let source_bytes = encode_scene(&fixture).unwrap();
        std::fs::write(&source, &source_bytes).unwrap();
        let p = s
            .replace(open_document(source.clone()).unwrap(), true)
            .unwrap();
        assert!(!p.inspection_only && !p.dirty && !p.can_undo && !p.can_redo);
        let attachment = p.slots[slot].attachments[0].id;
        let sibling = p.slots[slot].active_attachment_id.unwrap();
        assert_ne!(attachment, sibling);
        let [first, second, equal, protected] = columns.map(|bone| p.bones[bone].id);
        let unbound = p.bones.last().unwrap().id;
        let swap = |id, bones: [u64; 2], locks: &[u64]| -> RigEdit {
            serde_json::from_value(json!({
                "type":"swapAttachmentWeights", "id":id, "bones":bones, "lockedBones":locks,
            }))
            .unwrap()
        };
        let before = scene_model(&s);
        let payload = || encode_scene_payload(&scene_model(&s)).unwrap();
        let initial = payload();
        let dto = serde_json::to_value(&p).unwrap();
        let mut expected = before.clone();
        let (_, rows) = binding(&mut expected.slots[slot].attachments[0]);
        assert_eq!(rows[0].weights[1].to_bits(), (-0.0_f32).to_bits());
        for row in rows {
            row.weights.swap(0, 1);
        }
        let expected = encode_scene_payload(&expected).unwrap();
        assert_ne!(expected, initial);

        let rejected = |revision, edit, error: &str| {
            assert_eq!(s.edit(revision, edit).unwrap_err().code, error);
            assert_eq!(payload(), initial);
            assert_eq!(
                serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
                dto
            );
        };
        rejected(
            p.revision - 1,
            swap(attachment, [first, second], &[]),
            "ProjectChanged",
        );
        for edit in [
            swap(attachment, [first, first], &[]),
            swap(attachment, [first, unbound], &[]),
            swap(attachment, [first, second], &[second]),
        ] {
            rejected(p.revision, edit, "InvalidBinding");
        }
        rejected(
            p.revision,
            swap(sibling, [first, second], &[]),
            "InvalidSceneEdit",
        );
        let changed = s
            .edit(p.revision, swap(attachment, [first, second], &[protected]))
            .unwrap();
        assert_eq!(changed.revision, p.revision + 1);
        assert_eq!(changed.edited_attachment, Some(attachment));
        assert_eq!(changed.slots[slot].active_attachment_id, Some(sibling));
        assert_eq!(payload(), expected);
        let undone = s.edit(changed.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), initial);
        assert!(!undone.dirty && !undone.can_undo && undone.can_redo);
        let unchanged = s
            .edit(undone.revision, swap(attachment, [first, equal], &[]))
            .unwrap();
        assert_eq!(
            serde_json::to_value(&unchanged).unwrap(),
            serde_json::to_value(&undone).unwrap()
        );
        assert_eq!(payload(), initial);
        s.edit(unchanged.revision, RigEdit::Redo).unwrap();
        assert_eq!(payload(), expected);

        let saved = d.path().join("portable/swap.fbones");
        s.save_snapshot(s.prepare_save(true).unwrap(), saved.clone())
            .unwrap();
        let saved_payload = payload();
        let bits = attachment_binding_bits(&scene_model(&s).slots[slot].attachments[0]);
        assert_eq!(bits[0], (-0.0_f32).to_bits());
        assert_eq!(bits[1], 0.0_f32.to_bits());
        s.close(false).unwrap();
        let reopened = s.replace(open_document(saved).unwrap(), false).unwrap();
        assert!(!reopened.inspection_only && !reopened.dirty);
        assert_eq!(payload(), saved_payload);
        assert_eq!(std::fs::read(source).unwrap(), source_bytes);
    }
}
#[test]
fn scoped_auto_active_and_inactive_mesh_and_clip_resolve_stable_ids_and_keep_one_history_step() {
    for clip in [false, true] {
        for active in [false, true] {
            let (d, s, p, attachment, candidate) = scoped_auto_fixture(clip, active);
            let before = scene_model(&s);
            let (_, target) = moved_attachment(&s, attachment);
            let rows = dense_rows(&target);
            assert_eq!(
                rows[1].weights[0], 0.,
                "The selected candidate starts dormant"
            );
            let before_bits = rows
                .iter()
                .flat_map(|r| r.positions.iter().map(|v| v.to_bits()))
                .collect::<Vec<_>>();
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"autoAttachmentWeights","id":attachment,"scope":{"vertices":[1],"bones":[candidate],"lockedBones":[]}}),
            );
            let after = scene_model(&s);
            let (_, changed) = moved_attachment(&s, attachment);
            let result = dense_rows(&changed);
            assert_eq!(result[1].weights, [1., 0., 0.]);
            assert_eq!(
                result
                    .iter()
                    .flat_map(|r| r.positions.iter().map(|v| v.to_bits()))
                    .collect::<Vec<_>>(),
                before_bits
            );
            for i in 0..rows.len() {
                if i != 1 {
                    assert_eq!(
                        result[i]
                            .weights
                            .iter()
                            .map(|w| w.to_bits())
                            .collect::<Vec<_>>(),
                        rows[i]
                            .weights
                            .iter()
                            .map(|w| w.to_bits())
                            .collect::<Vec<_>>()
                    );
                }
            }
            let mut expected = before.clone();
            let slot = if clip { 0 } else { 1 };
            expected.slots[slot].attachments[0] = changed;
            assert_eq!(
                after, expected,
                "Activation, all other inventory and authored bones are independent of scoped Auto"
            );
            let p = s.edit(p.revision, RigEdit::Undo).unwrap();
            assert_eq!(scene_model(&s), before);
            let p = s.edit(p.revision, RigEdit::Redo).unwrap();
            assert_eq!(scene_model(&s), after);
            assert_eq!(p.slots[slot].attachments[0].id, attachment);
            let payload = encode_scene_payload(&after).unwrap();
            assert_eq!(decode_scene(&payload).unwrap(), after);
            let path = d.path().join("scoped-save/scene.fbones");
            let p = s
                .save_snapshot(s.prepare_save(true).unwrap(), path.clone())
                .unwrap();
            assert!(!p.dirty);
            let saved = scene_model(&s);
            s.close(false).unwrap();
            let p = s.replace(open_document(path).unwrap(), false).unwrap();
            assert!(!p.inspection_only);
            assert!(!p.dirty);
            assert_eq!(scene_model(&s), saved);
        }
    }
}
#[test]
fn scoped_auto_protects_lock_mass_and_empty_candidates_preserve_clean_revision_and_history() {
    let (d, s, p, attachment, candidate) = scoped_auto_fixture(true, false);
    let before = scene_model(&s);
    let original = dense_rows(&before.slots[0].attachments[0]);
    let root = p.bones[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"autoAttachmentWeights","id":attachment,"scope":{"bones":[candidate],"lockedBones":[root]}}),
    );
    let after = scene_model(&s);
    let rows = dense_rows(&after.slots[0].attachments[0]);
    for (a, b) in original.iter().zip(rows) {
        assert_eq!(a.weights[2].to_bits(), b.weights[2].to_bits());
        assert_eq!(b.weights[1], 0.);
        assert!((b.weights[0] - (1. - a.weights[2])).abs() < 1e-6);
        assert_eq!(
            a.positions.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
            b.positions.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
        );
    }
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let _p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
    let p = s
        .save_snapshot(
            s.prepare_save(true).unwrap(),
            d.path().join("locks/scene.fbones"),
        )
        .unwrap();
    let saved = scene_model(&s);
    let dto = serde_json::to_value(&p).unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"autoAttachmentWeights","id":attachment,"scope":{"vertices":[1],"bones":[candidate],"lockedBones":[candidate]}}),
    );
    assert_eq!(
        serde_json::to_value(&p).unwrap(),
        dto,
        "Empty candidates cannot dirty, revise or move focus"
    );
    assert_eq!(scene_model(&s), saved);
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    let mut expected = before;
    expected.images_root = saved.images_root;
    assert_eq!(
        scene_model(&s),
        expected,
        "The no-op must not insert an undo step"
    );
}
#[test]
fn scoped_auto_invalid_scope_stale_revision_and_frozen_epoch_fail_atomically() {
    use crate::evaluation::EvaluationMode;
    let (_d, s, p, attachment, candidate) = scoped_auto_fixture(true, false);
    let p = add_bone(&s, &p, 0);
    let unbound = p.edited_bone.unwrap();
    let before = scene_model(&s);
    let dto = serde_json::to_value(&p).unwrap();
    for scope in [
        serde_json::json!({"vertices":[]}),
        serde_json::json!({"vertices":[0,0]}),
        serde_json::json!({"vertices":[999]}),
        serde_json::json!({"bones":[]}),
        serde_json::json!({"bones":[candidate,candidate]}),
        serde_json::json!({"bones":[unbound]}),
        serde_json::json!({"bones":[999999]}),
        serde_json::json!({"lockedBones":[candidate,candidate]}),
        serde_json::json!({"lockedBones":[unbound]}),
    ] {
        let edit = serde_json::from_value(
            serde_json::json!({"type":"autoAttachmentWeights","id":attachment,"scope":scope}),
        )
        .unwrap();
        assert!(s.edit(p.revision, edit).is_err());
        assert_eq!(scene_model(&s), before);
        assert_eq!(
            serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
            dto
        );
    }
    for scope in [
        serde_json::json!({"vertices":[-1]}),
        serde_json::json!({"bones":[-1]}),
        serde_json::json!({"lockedBone":[candidate]}),
    ] {
        assert!(serde_json::from_value::<RigEdit>(
            serde_json::json!({"type":"autoAttachmentWeights","id":attachment,"scope":scope})
        )
        .is_err());
    }
    let edit = || {
        serde_json::from_value(serde_json::json!({"type":"autoAttachmentWeights","id":attachment,"scope":{"vertices":[1],"bones":[candidate]}})).unwrap()
    };
    assert_eq!(
        s.edit(p.revision - 1, edit()).unwrap_err().code,
        "ProjectChanged"
    );
    assert_eq!(scene_model(&s), before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"scope frozen","bone":0,"x":1,"wind":10,"strength":20}}),
    );
    let before = scene_model(&s);
    let dto = serde_json::to_value(&p).unwrap();
    assert_eq!(s.edit(p.revision, edit()).unwrap_err().code, "PoseRequired");
    let stale = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let frozen = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    assert_eq!(
        s.edit_in_pose(p.revision, stale.pose_epoch, edit())
            .unwrap_err()
            .code,
        "StalePose"
    );
    assert_eq!(scene_model(&s), before);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        dto
    );
    let p = s
        .edit_in_pose(p.revision, frozen.pose_epoch, edit())
        .unwrap();
    let after = scene_model(&s);
    assert_eq!(after.rig, before.rig);
    assert_eq!(after.constraints, before.constraints);
    let original = dense_rows(&before.slots[0].attachments[0]);
    let changed = dense_rows(&after.slots[0].attachments[0]);
    for (i, (a, b)) in original.iter().zip(changed).enumerate() {
        assert_eq!(
            a.positions.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
            b.positions.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
        );
        if i != 1 {
            assert_eq!(
                a.weights.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                b.weights.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
            );
        }
    }
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let _p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
}
#[test]
fn scoped_auto_omitted_scope_and_explicit_full_scope_produce_identical_native_payloads() {
    for clip in [false, true] {
        let (_d, s, p, attachment, _candidate) = scoped_auto_fixture(clip, false);
        let before = scene_model(&s);
        let p = command(
            &s,
            &p,
            serde_json::json!({"type":"autoAttachmentWeights","id":attachment}),
        );
        let full = scene_model(&s);
        let payload = encode_scene_payload(&full).unwrap();
        let p = s.edit(p.revision, RigEdit::Undo).unwrap();
        assert_eq!(scene_model(&s), before);
        let (_, a) = moved_attachment(&s, attachment);
        let vertices = (0..dense_rows(&a).len()).rev().collect::<Vec<_>>();
        let bones = p.bones.iter().rev().map(|b| b.id).collect::<Vec<_>>();
        let _p = command(
            &s,
            &p,
            serde_json::json!({"type":"autoAttachmentWeights","id":attachment,"scope":{"vertices":vertices,"bones":bones,"lockedBones":[]}}),
        );
        assert_eq!(encode_scene_payload(&scene_model(&s)).unwrap(), payload);
    }
}
#[test]
fn manual_locked_scene_set_and_numeric_batch_keep_other_locks_rows_bits_history_and_canonical_data()
{
    for clip in [false, true] {
        for active in [false, true] {
            let (_d, s, p, attachment, candidate) = scoped_auto_fixture(clip, active);
            let before = scene_model(&s);
            let slot = if clip { 0 } else { 1 };
            let original = dense_rows(&before.slots[slot].attachments[0]);
            let locked = p.bones[0].id;
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"setAttachmentWeight","id":attachment,"vertex":1,"bone":candidate,"value":0.5,"lockedBones":[locked]}),
            );
            let after = scene_model(&s);
            let rows = dense_rows(&after.slots[slot].attachments[0]);
            assert_eq!(rows[1].weights[0], 0.5);
            assert_eq!(
                rows[1].weights[2].to_bits(),
                original[1].weights[2].to_bits()
            );
            for (i, (a, b)) in original.iter().zip(rows).enumerate() {
                assert_eq!(
                    a.positions.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                    b.positions.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
                );
                if i != 1 {
                    assert_eq!(a, b);
                }
            }
            assert_eq!(before.rig, after.rig);
            assert_eq!(before.attachment_order, after.attachment_order);
            assert_eq!(
                before.slots[slot].active_attachment,
                after.slots[slot].active_attachment
            );
            let p = s.edit(p.revision, RigEdit::Undo).unwrap();
            assert_eq!(scene_model(&s), before);
            let p = s.edit(p.revision, RigEdit::Redo).unwrap();
            assert_eq!(scene_model(&s), after);
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"paintAttachmentWeights","id":attachment,"bone":candidate,"changes":[{"vertex":0,"value":0.2},{"vertex":2,"value":0.3}],"lockedBones":[locked,candidate]}),
            );
            let painted = scene_model(&s);
            let result = dense_rows(&painted.slots[slot].attachments[0]);
            assert_eq!(result[0].weights[0], 0.2);
            assert_eq!(result[2].weights[0], 0.3);
            for (a, b) in rows.iter().zip(result) {
                assert_eq!(a.positions, b.positions);
                assert_eq!(a.weights[2].to_bits(), b.weights[2].to_bits());
            }
            assert_eq!(
                decode_scene(&encode_scene_payload(&painted).unwrap()).unwrap(),
                painted
            );
            let p = s.edit(p.revision, RigEdit::Undo).unwrap();
            assert_eq!(scene_model(&s), after);
            let _p = s.edit(p.revision, RigEdit::Redo).unwrap();
            assert_eq!(scene_model(&s), painted);
        }
    }
}
#[test]
fn manual_locked_no_recipient_normalize_noop_and_invalid_partial_batches_are_atomic() {
    let (_d, s, p, attachment, candidate) = scoped_auto_fixture(true, false);
    let p = add_bone(&s, &p, 0);
    let unbound = p.edited_bone.unwrap();
    let root = p.bones[0].id;
    let child = p.bones[1].id;
    let before = scene_model(&s);
    let dto = serde_json::to_value(&p).unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setAttachmentWeight","id":attachment,"vertex":1,"bone":child,"value":0.5,"lockedBones":[root]}),
    );
    assert_eq!(serde_json::to_value(&p).unwrap(), dto);
    assert_eq!(scene_model(&s), before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"normalizeAttachmentWeights","id":attachment,"lockedBones":[root,child,candidate]}),
    );
    assert_eq!(serde_json::to_value(&p).unwrap(), dto);
    for edit in [
        serde_json::json!({"type":"setAttachmentWeight","id":attachment,"vertex":1,"bone":candidate,"value":0.5,"lockedBones":[root,root]}),
        serde_json::json!({"type":"paintAttachmentWeights","id":attachment,"bone":candidate,"changes":[{"vertex":0,"value":0.2},{"vertex":999,"value":0.3}],"lockedBones":[root]}),
        serde_json::json!({"type":"normalizeAttachmentWeights","id":attachment,"lockedBones":[999999]}),
        serde_json::json!({"type":"setAttachmentWeight","id":attachment,"vertex":1,"bone":candidate,"value":0.5,"lockedBones":[unbound]}),
    ] {
        assert!(s
            .edit(p.revision, serde_json::from_value(edit).unwrap())
            .is_err());
        assert_eq!(scene_model(&s), before);
        assert_eq!(
            serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
            dto
        );
    }
}
#[test]
fn manual_locked_weight_edit_requires_current_frozen_epoch_without_changing_authored_pose() {
    use crate::evaluation::EvaluationMode;
    let (_d, s, p, attachment, candidate) = scoped_auto_fixture(true, false);
    let root = p.bones[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"manual lock pose","bone":root,"x":1,"wind":10,"strength":20}}),
    );
    let before = scene_model(&s);
    let edit = || {
        serde_json::from_value(serde_json::json!({"type":"setAttachmentWeight","id":attachment,"vertex":1,"bone":candidate,"value":0.5,"lockedBones":[root]})).unwrap()
    };
    assert_eq!(s.edit(p.revision, edit()).unwrap_err().code, "PoseRequired");
    let stale = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    let frozen = evaluated(&s, &p, EvaluationMode::Replay, 0.5);
    assert_eq!(
        s.edit_in_pose(p.revision, stale.pose_epoch, edit())
            .unwrap_err()
            .code,
        "StalePose"
    );
    assert_eq!(scene_model(&s), before);
    let p = s
        .edit_in_pose(p.revision, frozen.pose_epoch, edit())
        .unwrap();
    let after = scene_model(&s);
    assert_eq!(after.rig, before.rig);
    assert_eq!(after.constraints, before.constraints);
    for (a, b) in dense_rows(&before.slots[0].attachments[0])
        .iter()
        .zip(dense_rows(&after.slots[0].attachments[0]))
    {
        assert_eq!(
            a.positions.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
            b.positions.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
        );
        assert_eq!(a.weights[2].to_bits(), b.weights[2].to_bits());
    }
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
}

#[test]
fn typed_image_mesh_membership_is_distinct_from_explicit_legacy_bind_auto_workflow() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let child = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 35., 20.)
        .unwrap();
    let slot = p.slots[0].id;
    let image = p.slots[0].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":image,"edit":{"type":"convertMesh","id":slot}}),
    );
    let before = scene_model(&s);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"bindAttachment","id":image,"bones":[0,child]}),
    );
    let typed = scene_model(&s);
    let m = typed.slots[0].attachments[0].mesh().unwrap();
    assert!(m.vertices.iter().all(|r| r.weights == [1., 0.]));
    assert_eq!(
        m.triangles,
        before.slots[0].attachments[0].mesh().unwrap().triangles
    );
    same_world_points(
        &attachment_points(&before)[0],
        &attachment_points(&typed)[0],
    );
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":image,"edit":{"type":"bindMesh","id":slot,"bones":[0,child]}}),
    );
    let legacy = scene_model(&s);
    assert!(legacy.slots[0].attachments[0]
        .mesh()
        .unwrap()
        .vertices
        .iter()
        .any(|r| r.weights[1] > 0.));
    same_world_points(
        &attachment_points(&before)[0],
        &attachment_points(&legacy)[0],
    );
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
}
