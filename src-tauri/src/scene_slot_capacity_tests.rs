//! Whole-slot inventory/order integration uses real files and the Rust Session.
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
fn payload(session: &Session) -> Vec<u8> {
    encode_scene_payload(&model(session)).unwrap()
}
fn edit(session: &Session, value: Value) -> ProjectSummary {
    session
        .edit(
            summary(session).revision,
            serde_json::from_value(value).unwrap(),
        )
        .unwrap()
}
fn reject(session: &Session, value: Value) {
    let p = serde_json::to_value(summary(session)).unwrap();
    let bytes = payload(session);
    assert!(session
        .edit(
            summary(session).revision,
            serde_json::from_value(value).unwrap()
        )
        .is_err());
    assert_eq!(serde_json::to_value(summary(session)).unwrap(), p);
    assert_eq!(payload(session), bytes);
}
fn open_model(project: SceneProject) -> (tempfile::TempDir, Session, Vec<u8>) {
    let directory = tempfile::tempdir().unwrap();
    std::fs::create_dir(directory.path().join("images")).unwrap();
    for key in crate::animation_sequence::all_image_keys(&project).unwrap() {
        std::fs::write(
            directory.path().join("images").join(format!("{key}.png")),
            crate::images::tests::png([90, 140, 220, 255]),
        )
        .unwrap();
    }
    let source = encode_scene(&project).unwrap();
    let path = directory.path().join("own-slots.spine");
    std::fs::write(&path, &source).unwrap();
    let session = Session::default();
    assert!(
        !session
            .replace(open_document(path).unwrap(), false)
            .unwrap()
            .inspection_only
    );
    (directory, session, source)
}
fn open(count: usize, order: bool) -> (tempfile::TempDir, Session, Vec<u8>) {
    open_model(crate::scene_slot_capacity_fixture::project(count, order))
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
                deform_targets: vec![],
                deform_pose: None,
                motion: None,
                from_pose_epoch: None,
            },
        )
        .unwrap()
}
fn ids(session: &Session) -> Vec<u64> {
    summary(session).slots.iter().map(|s| s.id).collect()
}

#[test]
fn scene_slots_create_and_image_placement_reach_512_once_and_reject_513_atomically() {
    let (_dir, session, _) = open(511, false);
    let before = payload(&session);
    let p = summary(&session);
    let created = edit(
        &session,
        json!({"type":"createSlot","bone":p.bones[0].id,"name":"boundary"}),
    );
    assert_eq!(created.slots.len(), 512);
    assert_eq!(created.revision, p.revision + 1);
    let slot = created.slots[511].id;
    reject(
        &session,
        json!({"type":"createSlot","bone":p.bones[0].id,"name":"overflow"}),
    );
    edit(&session, json!({"type":"undo"}));
    assert_eq!(payload(&session), before);
    assert!(!summary(&session).can_undo);
    edit(&session, json!({"type":"redo"}));
    assert_eq!(ids(&session)[511], slot);

    let (_dir, session, _) = open(511, false);
    let p = summary(&session);
    let before = payload(&session);
    let placed = session
        .place_images(p.revision, &["cell".into()], p.bones[0].id, 3., 4.)
        .unwrap();
    assert_eq!(placed.slots.len(), 512);
    assert_eq!(placed.revision, p.revision + 1);
    let stable = serde_json::to_value(&placed).unwrap();
    let full = payload(&session);
    assert!(session
        .place_images(
            placed.revision,
            &["alternate".into()],
            p.bones[0].id,
            1.,
            2.
        )
        .is_err());
    assert_eq!(serde_json::to_value(summary(&session)).unwrap(), stable);
    assert_eq!(payload(&session), full);
    edit(&session, json!({"type":"undo"}));
    assert_eq!(payload(&session), before);
    assert!(session
        .place_images(
            summary(&session).revision,
            &vec!["cell".into(); 129],
            p.bones[0].id,
            1.,
            2.
        )
        .is_err());
    assert_eq!(payload(&session), before);
}

#[test]
fn scene_slots_parenting_split_511_to_512_preserves_ids_world_and_order_then_513_rejects() {
    let (_dir, session, _) = open(511, false);
    let p = summary(&session);
    let before = payload(&session);
    let chosen = p.slots[510].attachments[0].id;
    let old = p.slots[510].attachments[0].region.as_ref().unwrap();
    let parent = p.bones[1].id;
    let changed = edit(
        &session,
        json!({"type":"reparentSelection","bones":[],"attachments":[chosen],"parent":parent}),
    );
    assert_eq!(changed.slots.len(), 512);
    assert_eq!(changed.revision, p.revision + 1);
    let owner = changed
        .slots
        .iter()
        .find(|s| s.attachments.iter().any(|a| a.id == chosen))
        .unwrap();
    assert_eq!(owner.bone, parent);
    let region = owner
        .attachments
        .iter()
        .find(|a| a.id == chosen)
        .unwrap()
        .region
        .as_ref()
        .unwrap();
    assert!((region.x + changed.bones[1].x - old.x).abs() < 0.00001);
    assert!((region.y + changed.bones[1].y - old.y).abs() < 0.00001);
    let old_other = p.slots[510].attachments[1].id;
    assert!(changed
        .slots
        .iter()
        .flat_map(|s| &s.attachments)
        .any(|a| a.id == old_other));
    edit(&session, json!({"type":"undo"}));
    assert_eq!(payload(&session), before);
    assert!(!summary(&session).can_undo);
    edit(&session, json!({"type":"redo"}));
    assert_eq!(summary(&session).slots.len(), 512);

    let (_dir, session, _) = open(512, false);
    let p = summary(&session);
    reject(
        &session,
        json!({"type":"reparentSelection","bones":[],"attachments":[p.slots[511].attachments[0].id],"parent":p.bones[1].id}),
    );
    let (_dir, session, _) = open(511, true);
    let p = summary(&session);
    reject(
        &session,
        json!({"type":"reparentSelection","bones":[],"attachments":[p.slots[510].attachments[0].id],"parent":p.bones[1].id}),
    );
}

#[test]
fn scene_slots_512_complete_order_reset_high_slot_keys_history_and_portable_reopen() {
    let (dir, session, source) = open(512, false);
    let p = summary(&session);
    let original = payload(&session);
    let order = ids(&session);
    let reverse = order.iter().rev().copied().collect::<Vec<_>>();
    let clip = p.animations[0].id;
    assert_eq!(sampled(&session, 0.).draw_order, order);
    edit(
        &session,
        json!({"type":"setAnimationDrawOrderKeys","animation":clip,"keys":[{"frame":6,"order":reverse},{"frame":12,"order":null}]}),
    );
    assert_eq!(sampled(&session, 5.).draw_order, order);
    assert_eq!(
        sampled(&session, 6.).draw_order,
        order.iter().rev().copied().collect::<Vec<_>>()
    );
    assert_eq!(sampled(&session, 12.).draw_order, order);
    let changed = payload(&session);
    for bad in [
        order[..511].to_vec(),
        {
            let mut a = order.clone();
            a[511] = a[0];
            a
        },
        {
            let mut a = order.clone();
            a[511] = u64::MAX;
            a
        },
    ] {
        reject(
            &session,
            json!({"type":"setAnimationDrawOrderKeys","animation":clip,"keys":[{"frame":7,"order":bad}]}),
        );
    }
    reject(
        &session,
        json!({"type":"createSlot","bone":p.bones[0].id,"name":"keyed overflow"}),
    );
    reject(&session, json!({"type":"deleteSlot","id":order[0]}));
    edit(&session, json!({"type":"undo"}));
    assert_eq!(payload(&session), original);
    assert!(!summary(&session).can_undo);
    edit(&session, json!({"type":"redo"}));
    assert_eq!(payload(&session), changed);
    let high = order[511];
    edit(
        &session,
        json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[{"slot":high,"channel":"rgba","frame":21,"values":[0.2,0.3,0.4,0.5],"curve":"linear"},{"slot":high,"channel":"attachment","frame":21,"attachment":null}]}),
    );
    let at = sampled(&session, 21.);
    assert!(at
        .slot_pose
        .iter()
        .find(|s| s.slot == high)
        .unwrap()
        .attachment
        .is_none());
    let target = dir.path().join("portable/slots.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), target.clone())
        .unwrap();
    let saved = ProjectEnvelope::inspect(std::fs::read(&target).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    assert_eq!(saved, payload(&session));
    let reopened = Session::default();
    reopened
        .replace(open_document(target).unwrap(), false)
        .unwrap();
    assert_eq!(payload(&reopened), saved);
    assert_eq!(ids(&reopened).len(), 512);
    for key in ["cell", "alternate"] {
        assert_eq!(
            std::fs::read(dir.path().join(format!("images/{key}.png"))).unwrap(),
            std::fs::read(dir.path().join(format!("portable/images/{key}.png"))).unwrap()
        );
    }
    assert_eq!(
        std::fs::read(dir.path().join("own-slots.spine")).unwrap(),
        source
    );
}

#[test]
fn scene_slots_setup_reorder_keeps_literal_permutation_slot_tracks_and_clip_end_identity() {
    let (_dir, session, _) = open(512, true);
    let p = summary(&session);
    let old_order = ids(&session);
    let before = payload(&session);
    let key_ids = p.animations[0]
        .draw_order
        .iter()
        .map(|k| k.id)
        .collect::<Vec<_>>();
    let high = old_order[511];
    edit(&session, json!({"type":"reorderSlot","id":high,"index":1}));
    assert_eq!(
        sampled(&session, 6.).draw_order,
        old_order.iter().rev().copied().collect::<Vec<_>>()
    );
    assert_eq!(sampled(&session, 12.).draw_order, ids(&session));
    assert_eq!(
        summary(&session).animations[0]
            .draw_order
            .iter()
            .map(|k| k.id)
            .collect::<Vec<_>>(),
        key_ids
    );
    assert_eq!(
        sampled(&session, 8.)
            .slot_pose
            .iter()
            .find(|s| s.slot == high)
            .unwrap()
            .attachment,
        Some(p.slots[511].attachments[1].id)
    );
    edit(&session, json!({"type":"undo"}));
    assert_eq!(payload(&session), before);

    let mut source = crate::scene_slot_capacity_fixture::project(512, false);
    source.slots[511].attachments.pop();
    source.attachment_order.retain(|a| {
        *a != AttachmentAddress {
            slot: 511,
            attachment: 1,
        }
    });
    for track in &mut source.animations[0].slot_tracks {
        if let SlotTimeline::Attachment { keys, .. } = track {
            for key in keys {
                if key.attachment.is_some() {
                    key.attachment = Some(0);
                }
            }
        }
    }
    source.slots[0]
        .attachments
        .push(SceneAttachment::Clipping(Clipping {
            name: "own mask".into(),
            end_slot: Some(511),
            convex: true,
            inverse: false,
            color: [255; 4],
            weighted: false,
            bones: vec![0],
            edges: vec![0, 1, 1, 2, 2, 3, 3, 0],
            vertices: [[-4., -4.], [140., -4.], [140., 80.], [-4., 80.]]
                .into_iter()
                .map(|p| fbones_format::minimal::meshes::Vertex {
                    weights: vec![1.],
                    positions: p.to_vec(),
                })
                .collect(),
        }));
    source.slots[0].active_attachment = Some(0);
    source.attachment_order.push(AttachmentAddress {
        slot: 0,
        attachment: 0,
    });
    let (_dir, session, _) = open_model(source);
    let p = summary(&session);
    let end = p.slots[511].id;
    edit(&session, json!({"type":"reorderSlot","id":end,"index":510}));
    assert_eq!(
        summary(&session).slots[0].attachments[0]
            .clipping
            .as_ref()
            .unwrap()
            .end_slot,
        end
    );
    assert_eq!(sampled(&session, 0.).draw_order, ids(&session));
}
