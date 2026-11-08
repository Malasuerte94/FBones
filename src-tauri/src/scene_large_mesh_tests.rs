//! Large meshes use the real Session, source files and frozen deformation path.
use super::*;
use crate::evaluation::{EvaluationMode, EvaluationRequest};
use fbones_format::minimal::scene::*;
use serde_json::{json, Value};

fn model(session: &Session) -> SceneProject {
    let state = session.lock().unwrap();
    let Some(Document::Editable { project, .. }) = &state.document else {
        panic!("editable")
    };
    (**project).clone()
}
fn summary(session: &Session) -> ProjectSummary {
    session.summary().unwrap().unwrap()
}
fn command(session: &Session, value: Value) -> ProjectSummary {
    session
        .edit(
            summary(session).revision,
            serde_json::from_value(value).unwrap(),
        )
        .unwrap()
}
fn payload(session: &Session) -> Vec<u8> {
    encode_scene_payload(&model(session)).unwrap()
}
fn open(columns: usize, rows: usize, keyed: bool) -> (tempfile::TempDir, Session, Vec<u8>) {
    let directory = tempfile::tempdir().unwrap();
    std::fs::create_dir(directory.path().join("images")).unwrap();
    let mut original = crate::scene_large_mesh_fixture::project(columns, rows);
    if !keyed {
        original.animations[0].deform_tracks.clear();
    }
    for key in crate::animation_sequence::all_image_keys(&original).unwrap() {
        std::fs::write(
            directory.path().join("images").join(format!("{key}.png")),
            crate::images::tests::png([40, 90, 210, 255]),
        )
        .unwrap();
    }
    let bytes = encode_scene(&original).unwrap();
    let path = directory.path().join("own-large.spine");
    std::fs::write(&path, &bytes).unwrap();
    let session = Session::default();
    let opened = session
        .replace(open_document(path).unwrap(), false)
        .unwrap();
    assert!(!opened.inspection_only);
    (directory, session, bytes)
}
fn sampled(session: &Session, frame: f64) -> crate::evaluation::EvaluationSnapshot {
    let p = summary(session);
    session
        .evaluate(
            p.revision,
            EvaluationRequest {
                mode: EvaluationMode::None,
                time: frame / p.animation_fps,
                animation_id: Some(p.animations[0].id),
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![p.slots[1].attachments[0].id],
                deform_pose: None,
                motion: None,
                from_pose_epoch: None,
            },
        )
        .unwrap()
}
fn assert_rejected(session: &Session, value: Value) {
    let before = serde_json::to_value(summary(session)).unwrap();
    let bytes = payload(session);
    assert!(session
        .edit(
            summary(session).revision,
            serde_json::from_value(value).unwrap()
        )
        .is_err());
    assert_eq!(serde_json::to_value(summary(session)).unwrap(), before);
    assert_eq!(payload(session), bytes);
}

#[test]
fn large_mesh_session_whole_512_move_paint_history_portable_save_preserve_source_and_pngs() {
    let (directory, session, source) = open(32, 16, false);
    let p = summary(&session);
    let id = p.slots[1].id;
    let attachment = p.slots[1].attachments[0].id;
    let before = model(&session);
    let before_payload = payload(&session);
    let frozen = sampled(&session, 0.);
    let pose = frozen
        .deform_pose
        .iter()
        .find(|p| p.attachment == attachment)
        .unwrap();
    assert_eq!(pose.world_vertices.len(), 512);
    let moves = pose
        .world_vertices
        .iter()
        .enumerate()
        .map(|(vertex, p)| json!({"vertex":vertex,"x":p[0]+3.,"y":p[1]-2.}))
        .collect::<Vec<_>>();
    let moved = command(
        &session,
        json!({"type":"moveVertices","id":id,"editUvs":false,"vertices":moves}),
    );
    assert_eq!(moved.revision, p.revision + 1);
    assert_eq!(moved.slots[1].attachments[0].id, attachment);
    let moved_model = model(&session);
    let mesh = moved_model.slots[1].attachments[0].mesh().unwrap();
    let old_mesh = before.slots[1].attachments[0].mesh().unwrap();
    assert_eq!(mesh.triangles, old_mesh.triangles);
    assert_eq!(mesh.uvs, old_mesh.uvs);
    for (next, old) in mesh.vertices.iter().zip(&old_mesh.vertices) {
        for (next, old) in next
            .positions
            .chunks_exact(2)
            .zip(old.positions.chunks_exact(2))
        {
            assert!((next[0] - old[0] - 3.).abs() < 0.00001);
            assert!((next[1] - old[1] + 2.).abs() < 0.00001);
        }
    }
    command(&session, json!({"type":"undo"}));
    assert_eq!(payload(&session), before_payload);
    assert!(!summary(&session).can_undo);
    command(&session, json!({"type":"redo"}));
    let changes = (0..512)
        .map(|vertex| json!({"vertex":vertex,"value":0.5}))
        .collect::<Vec<_>>();
    command(
        &session,
        json!({"type":"paintWeights","id":id,"bone":p.bones[1].id,"changes":changes}),
    );
    let painted = model(&session);
    let mesh = painted.slots[1].attachments[0].mesh().unwrap();
    for (next, old) in mesh
        .vertices
        .iter()
        .zip(&moved_model.slots[1].attachments[0].mesh().unwrap().vertices)
    {
        assert_eq!(next.weights, [0.5, 0.5]);
        assert_eq!(next.positions, old.positions);
    }
    let too_many = (0..513)
        .map(|vertex| json!({"vertex":vertex,"x":0,"y":0}))
        .collect::<Vec<_>>();
    assert_rejected(
        &session,
        json!({"type":"moveVertices","id":id,"editUvs":false,"vertices":too_many}),
    );
    assert_rejected(
        &session,
        json!({"type":"moveVertices","id":id,"vertices":[{"vertex":511,"x":0,"y":0},{"vertex":511,"x":1,"y":1}]}),
    );
    assert_rejected(
        &session,
        json!({"type":"moveVertex","id":id,"vertex":512,"x":0,"y":0}),
    );
    let target = directory.path().join("portable/large.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), target.clone())
        .unwrap();
    let bytes = ProjectEnvelope::inspect(std::fs::read(&target).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    assert_eq!(bytes, payload(&session));
    assert_eq!(
        decode_scene(&bytes).unwrap().slots[1].attachments[0]
            .mesh()
            .unwrap()
            .vertices
            .len(),
        512
    );
    for key in ["red", "green"] {
        assert_eq!(
            std::fs::read(directory.path().join(format!("images/{key}.png"))).unwrap(),
            std::fs::read(directory.path().join(format!("portable/images/{key}.png"))).unwrap()
        );
    }
    let reopened = Session::default();
    reopened
        .replace(open_document(target).unwrap(), false)
        .unwrap();
    assert_eq!(payload(&reopened), bytes);
    assert_eq!(
        std::fs::read(directory.path().join("own-large.spine")).unwrap(),
        source
    );
}

#[test]
fn large_mesh_512_frozen_world_targets_key_once_and_reject_stale_duplicate_and_foreign_vertices() {
    let (_directory, session, _) = open(32, 16, true);
    let p = summary(&session);
    let attachment = p.slots[1].attachments[0].id;
    let frozen = sampled(&session, 6.);
    let pose = frozen
        .deform_pose
        .iter()
        .find(|p| p.attachment == attachment)
        .unwrap();
    assert_eq!(pose.offsets.len(), 2048);
    let moves = pose
        .world_vertices
        .iter()
        .enumerate()
        .map(|(vertex, p)| json!({"vertex":vertex,"x":p[0]+1.125,"y":p[1]-2.5}))
        .collect::<Vec<_>>();
    let value = json!({"type":"setAnimationDeformVertices","animation":p.animations[0].id,"attachment":attachment,"frame":6,"vertices":moves});
    let bytes = payload(&session);
    let changed = session
        .edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            serde_json::from_value(value.clone()).unwrap(),
        )
        .unwrap();
    assert_eq!(changed.revision, p.revision + 1);
    let after = sampled(&session, 6.);
    let pose_after = after
        .deform_pose
        .iter()
        .find(|p| p.attachment == attachment)
        .unwrap();
    for (old, new) in pose.world_vertices.iter().zip(&pose_after.world_vertices) {
        assert!((new[0] - old[0] - 1.125).abs() < 0.00001);
        assert!((new[1] - old[1] + 2.5).abs() < 0.00001);
    }
    let stable = payload(&session);
    assert!(session
        .edit_in_pose(
            changed.revision,
            frozen.pose_epoch,
            serde_json::from_value(value.clone()).unwrap()
        )
        .is_err());
    assert_eq!(payload(&session), stable);
    for vertices in [
        json!([{"vertex":511,"x":0,"y":0},{"vertex":511,"x":1,"y":1}]),
        json!([{"vertex":512,"x":0,"y":0}]),
    ] {
        let live = sampled(&session, 6.);
        let edit = json!({"type":"setAnimationDeformVertices","animation":p.animations[0].id,"attachment":attachment,"frame":6,"vertices":vertices});
        assert!(session
            .edit_in_pose(
                summary(&session).revision,
                live.pose_epoch,
                serde_json::from_value(edit).unwrap()
            )
            .is_err());
        assert_eq!(payload(&session), stable);
    }
    command(&session, json!({"type":"undo"}));
    assert_eq!(payload(&session), bytes);
    assert!(!summary(&session).can_undo);
    command(&session, json!({"type":"redo"}));
    assert_eq!(payload(&session), stable);
}

#[test]
fn large_mesh_308_native_roundtrip_keeps_exact_uvs_and_1638_triangle_indices() {
    let (_directory, session, _) = open(22, 14, false);
    let p = model(&session);
    let mesh = p.slots[1].attachments[0].mesh().unwrap();
    assert_eq!(mesh.vertices.len(), 308);
    assert_eq!(mesh.uvs.len(), 616);
    assert_eq!(mesh.triangles.len(), 1638);
    let before = payload(&session);
    let id = summary(&session).slots[1].id;
    command(
        &session,
        json!({"type":"moveVertex","id":id,"vertex":307,"x":1.25,"y":-2.5}),
    );
    command(&session, json!({"type":"undo"}));
    assert_eq!(payload(&session), before);
}
