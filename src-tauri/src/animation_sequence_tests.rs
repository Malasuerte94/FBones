use super::*;
use crate::{
    project::{open_document, Session},
    rig::RigEdit,
    scene_edit::{SceneEdit, SceneHistory},
};
use fbones_format::minimal::scene::*;
use fbones_format::ProjectEnvelope;
use serde_json::{json, Value};
use std::collections::BTreeMap;

fn address(slot: usize) -> AttachmentAddress {
    AttachmentAddress {
        slot,
        attachment: 0,
    }
}
fn key(frame: f32, mode: SequenceMode, index: u32, delay: f32) -> SequenceKeyframe {
    SequenceKeyframe {
        frame,
        mode,
        index,
        delay: FiniteF32::new(delay).unwrap(),
    }
}
fn fixture() -> SceneProject {
    crate::scene_sequence_fixture::project()
}
fn roundtrip(p: &SceneProject) {
    let payload = encode_scene_payload(p).unwrap();
    let decoded = decode_scene(&payload).unwrap();
    assert_eq!(&decoded, p);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), payload);
}
fn edit(h: &mut SceneHistory, v: Value) {
    let rig: RigEdit = serde_json::from_value(v).unwrap();
    h.apply(match rig {
        RigEdit::DeleteAttachment { id } => SceneEdit::DeleteAttachment { id },
        RigEdit::SetAttachmentSequence { id, sequence } => {
            SceneEdit::SetAttachmentSequence { id, sequence }
        }
        rig if animation::is_edit(&rig) => SceneEdit::Animation(rig),
        rig => SceneEdit::Rig(rig),
    })
    .unwrap();
    roundtrip(&h.frame().project);
}
fn ids(h: &SceneHistory) -> BTreeMap<u64, (u64, u32, u8, u32, u32)> {
    let f = h.frame();
    f.project.animations[0]
        .sequence_tracks
        .iter()
        .enumerate()
        .flat_map(|(t, track)| {
            track.keys.iter().enumerate().map(move |(k, key)| {
                (
                    f.animation_sequence_key_ids[0][t][k],
                    (
                        f.attachment_ids[track.attachment.slot][track.attachment.attachment],
                        key.frame.to_bits(),
                        mode_number(key.mode),
                        key.index,
                        key.delay.get().to_bits(),
                    ),
                )
            })
        })
        .collect()
}

#[test]
fn sequence_native_sampler_preserves_setup_and_handles_boundaries_and_large_step_counts() {
    let s = SequenceSettings {
        start: 7,
        count: 3,
        digits: 3,
        setup_index: 2,
    };
    let mut t = SequenceTimeline {
        attachment: address(0),
        keys: vec![key(2., SequenceMode::Loop, 1, 0.125)],
    };
    for (frame, expected) in [
        (0., 2),
        (1.999, 2),
        (2., 1),
        (4.999, 1),
        (5., 2),
        (8., 0),
        (11., 1),
        (2., 1),
    ] {
        assert_eq!(
            sample_index(&s, Some(&t), frame, 24.),
            expected,
            "frame {frame}"
        );
    }
    t.keys[0].mode = SequenceMode::Once;
    assert_eq!(sample_index(&s, Some(&t), 1000., 24.), 2);
    t.keys[0].mode = SequenceMode::Hold;
    assert_eq!(sample_index(&s, Some(&t), 1000., 24.), 1);
    t.keys[0].mode = SequenceMode::Loop;
    t.keys[0].delay = FiniteF32::new(f32::from_bits(1)).unwrap();
    assert_eq!(
        sample_index(&s, Some(&t), 1_000_000., 24.),
        2,
        "Reduce huge interval counts before adding the authored index"
    );
    assert_eq!(frame_path("own/shot", &s, 1).unwrap(), "own/shot008");
    assert!(frame_path("../shot", &s, 0).is_err());
    assert!(frame_path("shot", &s, 3).is_err());
}

#[test]
fn sequence_native_mixed_batch_move_delete_duplicate_and_undo_keep_stable_payloads() {
    let original = fixture();
    roundtrip(&original);
    let mut h = SceneHistory::new(original.clone(), true).unwrap();
    let before = ids(&h);
    let f = h.frame();
    let clip = f.animation_ids[0];
    let target = f.attachment_ids[0][0];
    let bone = f.bone_ids[1];
    let old_other = f.project.animations[0].event_tracks.clone();
    edit(
        &mut h,
        json!({"type":"setAnimationKeyBatch","animation":clip,"boneKeys":[{"bone":bone,"channel":"scale","frame":6,"values":[1.25,0.75],"curve":"linear"}],"slotKeys":[],"sequenceKeys":[{"attachment":target,"frame":6,"mode":2,"index":0,"delay":0.125}]}),
    );
    assert!(before
        .iter()
        .all(|(id, payload)| ids(&h).get(id) == Some(payload)));
    assert_eq!(h.frame().project.animations[0].event_tracks, old_other);
    let new_id = *ids(&h).keys().find(|id| !before.contains_key(id)).unwrap();
    edit(
        &mut h,
        json!({"type":"moveAnimationKeys","animation":clip,"keys":[new_id],"deltaFrames":1.5}),
    );
    assert_eq!(ids(&h)[&new_id].1, 7.5f32.to_bits());
    let before_duplicate = ids(&h);
    edit(
        &mut h,
        json!({"type":"duplicateAnimation","id":clip,"name":"own Sequence copy"}),
    );
    let f = h.frame();
    assert_eq!(
        f.project.animations[2].sequence_tracks,
        f.project.animations[0].sequence_tracks
    );
    assert!(f.animation_sequence_key_ids[2]
        .iter()
        .flatten()
        .all(|id| !before_duplicate.contains_key(id)));
    edit(
        &mut h,
        json!({"type":"deleteAnimationKeys","animation":clip,"keys":[new_id]}),
    );
    assert_eq!(ids(&h), before);
    h.apply(SceneEdit::Undo).unwrap();
    assert_eq!(ids(&h), before_duplicate);
    h.apply(SceneEdit::Redo).unwrap();
    assert_eq!(ids(&h), before);
    roundtrip(&h.frame().project);
    assert_eq!(h.frame().project.rig, original.rig);
    assert_eq!(h.frame().project.slots, original.slots);
}

#[test]
fn sequence_native_invalid_settings_and_keys_reject_atomically() {
    let mut collision = fixture();
    collision.slots[0].attachments[0].image_mut().unwrap().path = "Frame".into();
    collision.slots[1].attachments[0].image_mut().unwrap().path = "frame".into();
    collision.attachment_sequences[1].settings.start = 7;
    collision.attachment_sequences[1].settings.digits = 1;
    assert!(
        all_image_keys(&collision).is_err(),
        "Derived frame case collisions must reject before saving"
    );
    let mut h = SceneHistory::new(fixture(), true).unwrap();
    let before = h.frame().project.clone();
    let ids_before = ids(&h);
    let target = h.frame().attachment_ids[0][0];
    let clip = h.frame().animation_ids[0];
    for settings in [
        None,
        Some(SettingsInput {
            start: 0,
            count: 1,
            digits: 3,
            setup_index: 0,
        }),
        Some(SettingsInput {
            start: i32::MAX as u32,
            count: 3,
            digits: 3,
            setup_index: 0,
        }),
        Some(SettingsInput {
            start: 0,
            count: 3,
            digits: 11,
            setup_index: 0,
        }),
    ] {
        assert!(h
            .apply(SceneEdit::SetAttachmentSequence {
                id: target,
                sequence: settings
            })
            .is_err());
        assert_eq!(h.frame().project, before);
        assert_eq!(ids(&h), ids_before);
    }
    for bad in [
        json!({"mode":3,"index":0,"delay":0.125}),
        json!({"mode":0,"index":3,"delay":0.125}),
        json!({"mode":0,"index":0,"delay":0}),
        json!({"mode":0,"index":0,"delay":-1}),
    ] {
        let mut value = json!({"type":"setAnimationSequenceKeys","animation":clip,"keys":[{"attachment":target,"frame":1,"mode":0,"index":0,"delay":0.125}]});
        for (k, v) in bad.as_object().unwrap() {
            value["keys"][0][k] = v.clone();
        }
        assert!(h
            .apply(SceneEdit::Animation(serde_json::from_value(value).unwrap()))
            .is_err());
        assert_eq!(h.frame().project, before);
        assert_eq!(ids(&h), ids_before);
    }
}

#[test]
fn sequence_native_structural_remap_conversion_delete_and_index_reuse() {
    let mut p = fixture();
    p.animations[0].slot_tracks.clear();
    p.animations[0].deform_tracks.clear();
    p.wire.as_mut().unwrap().animation_layouts = (0..p.animations.len())
        .map(|a| animation_layout(&p, a).unwrap())
        .collect();
    normalize_wire_track_order(&mut p).unwrap();
    let mut h = SceneHistory::new(p, true).unwrap();
    let before = ids(&h);
    let target = h.frame().attachment_ids[0][0];
    let destination = h.frame().slot_ids[1];
    edit(
        &mut h,
        json!({"type":"moveAttachment","id":target,"slot":destination}),
    );
    assert_eq!(ids(&h), before);
    let address = h.frame().attachment_address(target).unwrap();
    assert_eq!(address.slot, 1);
    assert!(settings(&h.frame().project, address).is_some());
    let owner = h.frame().slot_ids[address.slot];
    edit(
        &mut h,
        json!({"type":"attachmentEdit","id":target,"edit":{"type":"convertMesh","id":owner}}),
    );
    assert_eq!(ids(&h), before);
    assert!(h.frame().attachment(target).unwrap().mesh().is_some());
    edit(&mut h, json!({"type":"deleteAttachment","id":target}));
    assert!(!ids(&h).values().any(|payload| payload.0 == target));
    assert_eq!(h.frame().project.attachment_sequences.len(), 1);
    let replacement = fbones_format::minimal::regions::Region {
        name: "new own".into(),
        path: "own".into(),
        x: 0.,
        y: 0.,
        rotation: 0.,
        scale_x: 1.,
        scale_y: 1.,
        width: 8.,
        height: 8.,
    };
    h.apply(SceneEdit::InsertAttachment {
        slot: destination,
        attachment: SceneAttachment::Region(replacement),
        activate: false,
    })
    .unwrap();
    let new_id = *h.frame().attachment_ids[1].last().unwrap();
    assert_ne!(new_id, target);
    assert!(settings(
        &h.frame().project,
        h.frame().attachment_address(new_id).unwrap()
    )
    .is_none());
    roundtrip(&h.frame().project);
}

fn disk_fixture(missing: Option<&str>) -> (tempfile::TempDir, Session, SceneProject) {
    let d = tempfile::tempdir().unwrap();
    std::fs::create_dir(d.path().join("images")).unwrap();
    let mut p = fixture();
    if missing.is_some() {
        p.slots[1].active_attachment = None;
    }
    for (i, path) in all_image_keys(&p).unwrap().iter().enumerate() {
        if Some(path.as_str()) == missing {
            continue;
        }
        std::fs::write(
            d.path().join("images").join(format!("{path}.png")),
            crate::images::tests::png([i as u8 * 20, 40, 70, 255]),
        )
        .unwrap();
    }
    let source = d.path().join("own-source.spine");
    std::fs::write(&source, encode_scene(&p).unwrap()).unwrap();
    let s = Session::default();
    s.replace(open_document(source).unwrap(), false).unwrap();
    (d, s, p)
}
#[test]
fn sequence_native_resource_summary_sample_and_portable_save_reopen_all_frames() {
    let (d, s, original) = disk_fixture(None);
    let summary = s.summary().unwrap().unwrap();
    assert!(!summary.inspection_only);
    let attachments = summary
        .slots
        .iter()
        .flat_map(|slot| &slot.attachments)
        .collect::<Vec<_>>();
    assert_eq!(attachments[0].sequence_available_frames, vec![0, 1, 2]);
    assert_eq!(attachments[1].sequence_available_frames, vec![0, 1, 2, 3]);
    assert!(attachments.iter().all(|a| a.image_available));
    let target = d.path().join("portable");
    std::fs::create_dir(&target).unwrap();
    let path = target.join("saved.fbones");
    let saved = s
        .save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let bytes = std::fs::read(&path).unwrap();
    let decoded = decode_scene(
        &ProjectEnvelope::inspect(bytes)
            .unwrap()
            .decoded_payload()
            .unwrap(),
    )
    .unwrap();
    assert_eq!(decoded.rig, original.rig);
    assert_eq!(decoded.slots, original.slots);
    assert_eq!(decoded.attachment_sequences, original.attachment_sequences);
    assert_eq!(decoded.animations, original.animations);
    for key in all_image_keys(&original).unwrap() {
        assert_eq!(
            std::fs::read(d.path().join("images").join(format!("{key}.png"))).unwrap(),
            std::fs::read(target.join("images").join(format!("{key}.png"))).unwrap()
        );
    }
    assert!(!target.join("images/red.png").exists());
    let reopened = Session::default();
    let result = reopened
        .replace(open_document(path).unwrap(), false)
        .unwrap();
    assert!(result
        .slots
        .iter()
        .flat_map(|s| &s.attachments)
        .all(|a| a.image_available));
    assert_eq!(saved.animations[0].sequence_tracks.len(), 2);
    let snapshot = s
        .evaluate(
            saved.revision,
            crate::evaluation::EvaluationRequest {
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                animation_id: Some(saved.animations[0].id),
                mode: crate::evaluation::EvaluationMode::None,
                time: 5. / 24.,
                motion: None,
                from_pose_epoch: None,
            },
        )
        .unwrap();
    let red = snapshot
        .sequence_pose
        .iter()
        .find(|pose| pose.attachment == attachments[0].id)
        .unwrap();
    assert_eq!((red.index, red.image.as_str()), (2, "red9"));
}
#[test]
fn sequence_native_missing_inactive_end_frame_blocks_portable_save_without_output() {
    let (d, s, _) = disk_fixture(Some("green015"));
    let summary = s.summary().unwrap().unwrap();
    assert!(!summary.inspection_only);
    assert_eq!(summary.slots[1].active_attachment_id, None);
    assert_eq!(
        summary.slots[1].attachments[0].sequence_available_frames,
        vec![0, 1, 2]
    );
    assert!(summary.slots[1].attachments[0].image_available);
    let target = d.path().join("portable");
    std::fs::create_dir(&target).unwrap();
    let path = target.join("must-not-exist.fbones");
    assert!(s
        .save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .is_err());
    assert!(!path.exists());
    assert!(!target.join("images").exists());
}

#[test]
fn sequence_native_setup_command_preserves_geometry_keys_and_history_then_saves_settings() {
    let (directory, session, original) = disk_fixture(None);
    let before = session.summary().unwrap().unwrap();
    let target = before.slots[0].attachments[0].id;
    let after = session
        .edit(
            before.revision,
            RigEdit::SetAttachmentSequence {
                id: target,
                sequence: Some(SettingsInput {
                    start: 7,
                    count: 3,
                    digits: 1,
                    setup_index: 2,
                }),
            },
        )
        .unwrap();
    assert_eq!(
        after.slots[0].attachments[0]
            .sequence
            .as_ref()
            .unwrap()
            .setup_index,
        2
    );
    assert!(after.slots[0].attachments[0].image_available);
    assert_eq!(
        serde_json::to_value(&after.animations).unwrap(),
        serde_json::to_value(&before.animations).unwrap()
    );
    assert_eq!(
        serde_json::to_value(&after.slots[0].attachments[0].region).unwrap(),
        serde_json::to_value(&before.slots[0].attachments[0].region).unwrap()
    );
    let invalid = session.edit(
        after.revision,
        RigEdit::SetAttachmentSequence {
            id: target,
            sequence: None,
        },
    );
    assert!(invalid.is_err());
    assert_eq!(session.summary().unwrap().unwrap().revision, after.revision);
    let undone = session.edit(after.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        undone.slots[0].attachments[0]
            .sequence
            .as_ref()
            .unwrap()
            .setup_index,
        1
    );
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(
        redone.slots[0].attachments[0]
            .sequence
            .as_ref()
            .unwrap()
            .setup_index,
        2
    );
    let path = directory.path().join("changed-settings.fbones");
    session
        .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    let envelope = ProjectEnvelope::inspect(std::fs::read(path).unwrap()).unwrap();
    let model = decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
    assert_eq!(model.sequence(address(0)).unwrap().setup_index, 2);
    assert_eq!(model.slots, original.slots);
    assert_eq!(model.rig, original.rig);
    assert_eq!(model.animations, original.animations);
}

#[test]
fn sequence_existing_negative_zero_frame_survives_payload_updates_noops_history_and_save() {
    let (directory, session, mut original) = disk_fixture(None);
    original.animations[0]
        .sequence_tracks
        .iter_mut()
        .find(|track| track.attachment == address(0))
        .unwrap()
        .keys[0]
        .frame = -0.;
    roundtrip(&original);
    let source = directory.path().join("own-negative-zero.spine");
    std::fs::write(&source, encode_scene(&original).unwrap()).unwrap();
    let initial = session
        .replace(open_document(source).unwrap(), true)
        .unwrap();
    let attachment = initial.slots[0].attachments[0].id;
    let animation = initial.animations[0].id;
    let selected = |summary: &crate::project::ProjectSummary| {
        summary.animations[0]
            .sequence_tracks
            .iter()
            .find(|track| track.attachment == attachment)
            .unwrap()
            .keys[0]
            .id
    };
    let key_id = selected(&initial);
    let current = |summary: &crate::project::ProjectSummary| {
        let key = &summary.animations[0]
            .sequence_tracks
            .iter()
            .find(|track| track.attachment == attachment)
            .unwrap()
            .keys[0];
        (
            key.id,
            key.frame.to_bits(),
            key.mode,
            key.index,
            key.delay.to_bits(),
        )
    };
    assert_eq!(
        current(&initial),
        (key_id, 0x80000000, 2, 1, 0.125f32.to_bits())
    );
    assert!(!initial.can_undo);
    let request = |by_id: bool, mode: u8, index: u32, delay: f32| {
        // Actual JSON transport supplies +0 even when the source JS value is -0.
        let mut value = json!({"type":"setAnimationSequenceKeys","animation":animation,"keys":[{"attachment":attachment,"frame":0,"mode":mode,"index":index,"delay":delay}]});
        if by_id {
            value["keys"][0]["keyId"] = json!(key_id);
        }
        serde_json::from_value::<RigEdit>(value).unwrap()
    };
    let noop = session
        .edit(initial.revision, request(true, 2, 1, 0.125))
        .unwrap();
    assert_eq!(
        noop.revision, initial.revision,
        "A payload no-op cannot rewrite raw time or create history"
    );
    assert!(!noop.can_undo);
    assert_eq!(current(&noop), current(&initial));
    let updated = session
        .edit(noop.revision, request(true, 1, 0, 0.25))
        .unwrap();
    assert_eq!(
        current(&updated),
        (key_id, 0x80000000, 1, 0, 0.25f32.to_bits())
    );
    let undone = session.edit(updated.revision, RigEdit::Undo).unwrap();
    assert_eq!(current(&undone), current(&initial));
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(current(&redone), current(&updated));
    let manual = session
        .edit(redone.revision, request(false, 0, 2, 0.0625))
        .unwrap();
    assert_eq!(
        current(&manual),
        (key_id, 0x80000000, 0, 2, 0.0625f32.to_bits())
    );
    let manual_noop = session
        .edit(manual.revision, request(false, 0, 2, 0.0625))
        .unwrap();
    assert_eq!(manual_noop.revision, manual.revision);
    let previous = session.edit(manual_noop.revision, RigEdit::Undo).unwrap();
    assert_eq!(current(&previous), current(&updated));
    let restored = session.edit(previous.revision, RigEdit::Redo).unwrap();
    assert_eq!(current(&restored), current(&manual));
    let saved_path = directory.path().join("saved-negative-zero.fbones");
    let saved = session
        .save_snapshot(session.prepare_save(false).unwrap(), saved_path.clone())
        .unwrap();
    let envelope = ProjectEnvelope::inspect(std::fs::read(&saved_path).unwrap()).unwrap();
    let payload = envelope.decoded_payload().unwrap();
    let model = decode_scene(&payload).unwrap();
    let mut expected = original;
    expected.images_root = "./images/".into();
    let key = &mut expected.animations[0]
        .sequence_tracks
        .iter_mut()
        .find(|track| track.attachment == address(0))
        .unwrap()
        .keys[0];
    key.mode = SequenceMode::Hold;
    key.index = 2;
    key.delay = FiniteF32::new(0.0625).unwrap();
    normalize_wire_strings(&mut expected).unwrap();
    assert_eq!(
        model, expected,
        "Only the requested payload and portable image root may change"
    );
    assert_eq!(encode_scene_payload(&expected).unwrap(), payload);
    let reopened = Session::default()
        .replace(open_document(saved_path).unwrap(), false)
        .unwrap();
    assert_eq!(current(&reopened).1, 0x80000000);
    let moved = session
        .edit(
            saved.revision,
            RigEdit::MoveAnimationKeys {
                animation,
                keys: vec![key_id],
                delta_frames: 1.,
            },
        )
        .unwrap();
    assert_eq!(current(&moved).1, 1f32.to_bits());
    let original_time = session.edit(moved.revision, RigEdit::Undo).unwrap();
    assert_eq!(current(&original_time).1, 0x80000000);
    let new_clip = original_time.animations[1].id;
    let new_key = session
        .edit(
            original_time.revision,
            RigEdit::SetAnimationSequenceKeys {
                animation: new_clip,
                keys: vec![SequenceKeyInput {
                    attachment,
                    frame: -0.,
                    mode: 0,
                    index: 0,
                    delay: 0.125,
                    key_id: None,
                }],
            },
        )
        .unwrap();
    assert_eq!(
        new_key.animations[1].sequence_tracks[0].keys[0]
            .frame
            .to_bits(),
        0
    );
}
