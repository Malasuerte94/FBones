use super::*;
use crate::{
    evaluation::{EvaluationMode, EvaluationRequest},
    project::{new_document, open_document, ProjectSummary, Session},
};
use serde_json::{json, Value};
fn snapshot(s: &Session) -> ProjectSummary {
    s.summary().unwrap().unwrap()
}
fn edit(s: &Session, value: Value) -> ProjectSummary {
    let op: RigEdit = serde_json::from_value(value).unwrap();
    s.edit(snapshot(s).revision, op).unwrap()
}
fn state(s: &Session) -> Value {
    serde_json::to_value(snapshot(s)).unwrap()
}
fn new() -> Session {
    let s = Session::default();
    s.replace(new_document("animation native".into()).unwrap(), false)
        .unwrap();
    s
}
fn key(bone: u64, frame: f32, x: f32, y: f32, curve: &str) -> Value {
    json!({"bone":bone,"channel":"translate","frame":frame,"values":[x,y],"curve":curve})
}
fn sample(s: &Session, id: u64, frame: f64) -> crate::evaluation::EvaluationSnapshot {
    s.evaluate(
        snapshot(s).revision,
        EvaluationRequest {
            animation_pose: None,
            constraint_pose: None,
            draw_order_pose: None,
            deform_targets: vec![],
            deform_pose: None,
            animation_id: Some(id),
            mode: EvaluationMode::None,
            time: frame / snapshot(s).animation_fps,
            motion: None,
            from_pose_epoch: None,
        },
    )
    .unwrap()
}
#[test]
fn fractional_frame_spans_interpolate_without_rounding_the_span_to_f32() {
    let s = new();
    let p = snapshot(&s);
    let root = p.bones[0].id;
    let clip = p.animations[0].id;
    batch(
        &s,
        clip,
        vec![
            key(root, 0.1, 0., 0., "linear"),
            key(root, 0.3, 1_000_000., -1_000_000., "linear"),
        ],
    );
    let expected = (0.2 - f64::from(0.1f32)) / (f64::from(0.3f32) - f64::from(0.1f32)) * 1_000_000.;
    let pose = sample(&s, clip, 0.2);
    assert!((pose.bones[0].authored.x - expected).abs() < 1e-9);
    assert!((pose.bones[0].authored.y + expected).abs() < 1e-9);
}
fn batch(s: &Session, id: u64, keys: Vec<Value>) -> ProjectSummary {
    edit(
        s,
        json!({"type":"setAnimationKeys","animation":id,"keys":keys}),
    )
}
#[test]
fn atomic_animation_batch_stable_replacement_history_and_native_save_reopen() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    let child = edit(
        &s,
        json!({"type":"create","parent":root,"x":10,"y":5,"rotation":0,"length":20}),
    )
    .edited_bone
    .unwrap();
    let setup = serde_json::to_value(snapshot(&s).bones).unwrap();
    let p = edit(&s, json!({"type":"createAnimation","name":"walk"}));
    let clip = p.edited_animation.unwrap();
    let before = p.revision;
    let p = batch(
        &s,
        clip,
        vec![
            key(root, 0., 0., 0., "linear"),
            key(root, 30., 90., 30., "linear"),
            key(child, 0., 0., 0., "linear"),
            key(child, 30., 30., -10., "stepped"),
        ],
    );
    assert_eq!(p.revision, before + 1);
    assert_eq!(p.animations[1].duration, 30.);
    assert_eq!(serde_json::to_value(&p.bones).unwrap(), setup);
    let before_keys = serde_json::to_value(&p.animations).unwrap();
    let old_id = p.animations[1].tracks[0].keys[1].id;
    let p = edit(
        &s,
        json!({"type":"setAnimationKey","animation":clip,"bone":root,"channel":"translate","frame":30,"values":[120,10],"curve":"stepped"}),
    );
    assert_eq!(p.animations[1].tracks[0].keys[1].id, old_id);
    assert_eq!(p.animations[1].tracks[0].keys[1].values, [120., 10.]);
    let updated = serde_json::to_value(&p.animations).unwrap();
    let undone = edit(&s, json!({"type":"undo"}));
    assert_eq!(
        serde_json::to_value(undone.animations).unwrap(),
        before_keys
    );
    let redone = edit(&s, json!({"type":"redo"}));
    assert_eq!(serde_json::to_value(&redone.animations).unwrap(), updated);
    let local = sample(&s, clip, 15.);
    // The first key is Linear: changing the right endpoint's curve affects only
    // the segment leaving that endpoint, so midpoint is60/5.
    assert_eq!(local.local_bones[0].x, 60.);
    assert_eq!(local.local_bones[0].y, 5.);
    assert_eq!(serde_json::to_value(snapshot(&s).bones).unwrap(), setup);
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("animated.fbones");
    let save = s.prepare_save(false).unwrap();
    let saved = s.save_snapshot(save, path.clone()).unwrap();
    assert!(!saved.dirty);
    s.close(false).unwrap();
    let reopened = s
        .replace(open_document(path.clone()).unwrap(), false)
        .unwrap();
    assert_eq!(serde_json::to_value(&reopened.animations).unwrap(), updated);
    assert_eq!(serde_json::to_value(&reopened.bones).unwrap(), setup);
    let envelope = fbones_format::ProjectEnvelope::inspect(std::fs::read(path).unwrap()).unwrap();
    let decoded =
        fbones_format::minimal::scene::decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
    assert_eq!(decoded.animations[1].tracks[0].keys[1].values, [120., 10.]);
    assert_eq!(decoded.rig.bones[0].x, 0.);
}
#[test]
fn animation_sampling_is_setup_relative_linear_stepped_and_non_authoring() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    edit(
        &s,
        json!({"type":"update","id":root,"name":"root","x":11,"y":-9,"rotation":0,"length":0}),
    );
    let clip = snapshot(&s).animations[0].id;
    batch(
        &s,
        clip,
        vec![
            key(root, 10., 10., 20., "linear"),
            key(root, 30., 30., 60., "linear"),
        ],
    );
    let before = state(&s);
    assert_eq!(sample(&s, clip, 5.).local_bones[0].x, 11.);
    let midpoint = sample(&s, clip, 20.);
    assert_eq!(midpoint.local_bones[0].x, 31.);
    assert_eq!(midpoint.local_bones[0].y, 31.);
    assert_eq!(sample(&s, clip, 100.).local_bones[0].x, 41.);
    assert_eq!(state(&s), before);
    batch(&s, clip, vec![key(root, 10., 10., 20., "stepped")]);
    assert_eq!(sample(&s, clip, 20.).local_bones[0].x, 21.);
    assert_eq!(sample(&s, clip, 30.).local_bones[0].x, 41.);
    let scene = snapshot(&s);
    assert_eq!(scene.bones[0].x, 11.);
    assert_eq!(scene.bones[0].y, -9.);
}
#[test]
fn invalid_animation_batches_and_key_collisions_are_atomic() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    let clip = snapshot(&s).animations[0].id;
    batch(
        &s,
        clip,
        vec![
            key(root, 0., 0., 0., "linear"),
            key(root, 30., 30., 60., "stepped"),
        ],
    );
    for keys in [
        vec![
            key(root, 15., 5., 6., "linear"),
            key(999, 15., 5., 6., "linear"),
        ],
        vec![
            key(root, 15., 5., 6., "linear"),
            key(root, 15., 7., 8., "linear"),
        ],
        vec![key(root, -1., 5., 6., "linear")],
    ] {
        let before = state(&s);
        let op =
            serde_json::from_value(json!({"type":"setAnimationKeys","animation":clip,"keys":keys}))
                .unwrap();
        assert!(s.edit(snapshot(&s).revision, op).is_err());
        assert_eq!(state(&s), before);
    }
    let key_id = snapshot(&s).animations[0].tracks[0].keys[0].id;
    let before = state(&s);
    let op = serde_json::from_value(
        json!({"type":"moveAnimationKeys","animation":clip,"keys":[key_id],"deltaFrames":30}),
    )
    .unwrap();
    assert!(s.edit(snapshot(&s).revision, op).is_err());
    assert_eq!(state(&s), before);
    let moved = edit(
        &s,
        json!({"type":"moveAnimationKeys","animation":clip,"keys":[key_id],"deltaFrames":10}),
    );
    assert_eq!(moved.animations[0].tracks[0].keys[0].id, key_id);
    assert_eq!(moved.animations[0].tracks[0].keys[0].frame, 10.);
    edit(
        &s,
        json!({"type":"deleteAnimationKeys","animation":clip,"keys":[key_id]}),
    );
    assert_eq!(snapshot(&s).animations[0].tracks[0].keys.len(), 1);
    assert!(serde_json::from_value::<RigEdit>(json!({"type":"setAnimationKey","animation":clip,"bone":root,"channel":"attachment","frame":0,"values":[1,0],"curve":"linear"})).is_err());
}
#[test]
fn viewport_key_epoch_rejects_other_clip_time_and_stale_revision() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    let first = snapshot(&s).animations[0].id;
    let second = edit(&s, json!({"type":"createAnimation","name":"other"}))
        .edited_animation
        .unwrap();
    let frozen = sample(&s, first, 0.);
    for (clip, frame) in [(second, 0.), (first, 30.)] {
        let before = state(&s);
        let op=serde_json::from_value(json!({"type":"setAnimationKeys","animation":clip,"keys":[key(root,frame,5.,6.,"linear")]})).unwrap();
        assert_eq!(
            s.edit_in_pose(snapshot(&s).revision, frozen.pose_epoch, op)
                .unwrap_err()
                .code,
            "StalePose"
        );
        assert_eq!(state(&s), before);
    }
    let op = serde_json::from_value(
        json!({"type":"setAnimationKeys","animation":first,"keys":[key(root,0.,5.,6.,"linear")]}),
    )
    .unwrap();
    let committed = s
        .edit_in_pose(snapshot(&s).revision, frozen.pose_epoch, op)
        .unwrap();
    assert_eq!(committed.animations[0].tracks[0].keys[0].values, [5., 6.]);
    let before = state(&s);
    let op=serde_json::from_value(json!({"type":"setAnimationKey","animation":first,"bone":root,"channel":"translate","frame":0,"values":[8,9],"curve":"linear"})).unwrap();
    assert_eq!(
        s.edit_in_pose(snapshot(&s).revision, frozen.pose_epoch, op)
            .unwrap_err()
            .code,
        "StalePose"
    );
    assert_eq!(state(&s), before);
}
#[test]
fn animation_names_delete_and_signed_zero_key_history_are_persistent() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    let first = snapshot(&s).animations[0].id;
    let created = edit(&s, json!({"type":"createAnimation","name":"walk"}));
    let second = created.edited_animation.unwrap();
    edit(
        &s,
        json!({"type":"renameAnimation","id":second,"name":"run"}),
    );
    let before = state(&s);
    let duplicate =
        serde_json::from_value(json!({"type":"renameAnimation","id":second,"name":"animation"}))
            .unwrap();
    assert!(s.edit(snapshot(&s).revision, duplicate).is_err());
    assert_eq!(state(&s), before);
    edit(&s, json!({"type":"deleteAnimation","id":second}));
    assert_eq!(snapshot(&s).animations[0].id, first);
    let before = state(&s);
    let last = serde_json::from_value(json!({"type":"deleteAnimation","id":first})).unwrap();
    assert!(s.edit(snapshot(&s).revision, last).is_err());
    assert_eq!(state(&s), before);
    batch(&s, first, vec![key(root, 0., 0., 0., "linear")]);
    let revision = snapshot(&s).revision;
    let p = s
        .edit(
            revision,
            RigEdit::SetAnimationKeys {
                animation: first,
                keys: vec![KeyInput {
                    key_id: None,
                    bone: root,
                    channel: ChannelInput::Translate,
                    controls: None,
                    frame: 0.,
                    values: [-0.0, 0.],
                    curve: CurveInput::Linear,
                }],
            },
        )
        .unwrap();
    assert_eq!(p.revision, revision + 1);
    assert_eq!(
        p.animations[0].tracks[0].keys[0].values[0].to_bits(),
        (-0.0f32).to_bits()
    );
    let undone = edit(&s, json!({"type":"undo"}));
    assert_eq!(
        undone.animations[0].tracks[0].keys[0].values[0].to_bits(),
        0
    );
}
#[test]
fn setup_reparent_remaps_animation_bone_references_without_rekeying() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    let a = edit(
        &s,
        json!({"type":"create","parent":root,"x":10,"y":5,"rotation":0,"length":20}),
    )
    .edited_bone
    .unwrap();
    let b = edit(
        &s,
        json!({"type":"create","parent":root,"x":30,"y":4,"rotation":0,"length":15}),
    )
    .edited_bone
    .unwrap();
    let clip = snapshot(&s).animations[0].id;
    let p = batch(&s, clip, vec![key(b, 0., 7., 8., "linear")]);
    let key_id = p.animations[0].tracks[0].keys[0].id;
    let p = edit(&s, json!({"type":"reparent","id":a,"parent":b}));
    assert_eq!(p.animations[0].tracks[0].bone, b);
    assert_eq!(p.animations[0].tracks[0].keys[0].id, key_id);
    assert_eq!(
        sample(&s, clip, 0.)
            .local_bones
            .iter()
            .find(|bone| bone.id == b)
            .unwrap()
            .x,
        37.
    );
    let before = state(&s);
    let op = serde_json::from_value(json!({"type":"delete","id":b})).unwrap();
    assert!(s.edit(snapshot(&s).revision, op).is_err());
    assert_eq!(state(&s), before);
}
#[test]
fn retained_duplicate_frames_sample_and_replace_last_without_discarding_other_keys() {
    let mut document = new_document("duplicate frame fixture".into()).unwrap();
    if let crate::project::Document::Editable { project, rig, .. } = &mut document {
        project.animations[0].tracks.push(BoneTimeline {
            bone: 0,
            channel: BoneChannel::Translate,
            keys: vec![
                BoneKeyframe {
                    frame: 0.,
                    values: [0., 0.],
                    curve: KeyCurve::Stepped,
                },
                BoneKeyframe {
                    frame: 6.,
                    values: [10., 0.],
                    curve: KeyCurve::Stepped,
                },
                BoneKeyframe {
                    frame: 6.,
                    values: [80., 0.],
                    curve: KeyCurve::Stepped,
                },
                BoneKeyframe {
                    frame: 30.,
                    values: [0., 0.],
                    curve: KeyCurve::Linear,
                },
            ],
        });
        **rig = crate::scene_edit::SceneRigHistory::new(project, false);
    }
    let s = Session::default();
    let p = s.replace(document, false).unwrap();
    let root = p.bones[0].id;
    let clip = p.animations[0].id;
    assert_eq!(sample(&s, clip, 6.).local_bones[0].x, 80.);
    let last_equal_id = p.animations[0].tracks[0].keys[2].id;
    let earlier = p.animations[0].tracks[0].keys[1].id;
    let changed = edit(
        &s,
        json!({"type":"setAnimationKey","animation":clip,"keyId":earlier,"bone":root,"channel":"translate","frame":6,"values":[70,0],"curve":"stepped"}),
    );
    assert_eq!(changed.animations[0].tracks[0].keys[1].values[0], 70.);
    assert_eq!(changed.animations[0].tracks[0].keys[2].values[0], 80.);
    let p = batch(&s, clip, vec![key(root, 6., 90., 0., "stepped")]);
    let track = &p.animations[0].tracks[0];
    assert_eq!(track.keys.len(), 4);
    assert_eq!(track.keys[1].values[0], 70.);
    assert_eq!(track.keys[2].id, last_equal_id);
    assert_eq!(track.keys[2].values[0], 90.);
    let unrelated = track.keys[3].id;
    let p = edit(
        &s,
        json!({"type":"moveAnimationKeys","animation":clip,"keys":[unrelated],"deltaFrames":1}),
    );
    assert_eq!(p.animations[0].tracks[0].keys.len(), 4);
    assert_eq!(p.animations[0].tracks[0].keys[3].frame, 31.);
    assert_eq!(sample(&s, clip, 6.).local_bones[0].x, 90.);
}
#[test]
fn animation_replay_samples_each_time_and_cannot_continue_another_clip_checkpoint() {
    let s = new();
    let p = snapshot(&s);
    let root = p.bones[0].id;
    let first = p.animations[0].id;
    batch(
        &s,
        first,
        vec![
            key(root, 0., 0., 0., "linear"),
            key(root, 30., 60., 0., "linear"),
        ],
    );
    let second = edit(&s, json!({"type":"createAnimation","name":"second"}))
        .edited_animation
        .unwrap();
    let before = state(&s);
    let request = |animation, time, epoch| EvaluationRequest {
        animation_pose: None,
        constraint_pose: None,
        draw_order_pose: None,
        deform_targets: vec![],
        deform_pose: None,
        animation_id: Some(animation),
        time,
        mode: EvaluationMode::Replay,
        motion: None,
        from_pose_epoch: epoch,
    };
    let middle = s
        .evaluate(snapshot(&s).revision, request(first, 0.5, None))
        .unwrap();
    assert_eq!(middle.local_bones[0].x, 30.);
    assert_eq!(
        s.evaluate(
            snapshot(&s).revision,
            request(second, 1., Some(middle.pose_epoch))
        )
        .unwrap_err()
        .code,
        "StalePose"
    );
    let end = s
        .evaluate(
            snapshot(&s).revision,
            request(first, 1., Some(middle.pose_epoch)),
        )
        .unwrap();
    assert_eq!(end.local_bones[0].x, 60.);
    assert_eq!(state(&s), before);
}
#[test]
fn duplicate_animation_clones_tracks_with_fresh_ids_and_one_atomic_history_action() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    let source = snapshot(&s).animations[0].id;
    batch(
        &s,
        source,
        vec![
            key(root, 0., 3., 4., "stepped"),
            key(root, 30., 9., 8., "linear"),
        ],
    );
    let before = snapshot(&s);
    let original = serde_json::to_value(&before.animations[0]).unwrap();
    let original_ids: HashSet<_> = before.animations[0].tracks[0]
        .keys
        .iter()
        .map(|k| k.id)
        .collect();
    let copied = edit(
        &s,
        json!({"type":"duplicateAnimation","id":source,"name":"copy"}),
    );
    let id = copied.edited_animation.unwrap();
    assert_ne!(id, source);
    assert_eq!(copied.revision, before.revision + 1);
    assert_eq!(
        serde_json::to_value(&copied.animations[0]).unwrap(),
        original
    );
    let duplicate = &copied.animations[1];
    assert_eq!(duplicate.duration, before.animations[0].duration);
    assert_eq!(duplicate.tracks[0].bone, root);
    assert!(duplicate.tracks[0]
        .keys
        .iter()
        .all(|k| !original_ids.contains(&k.id)));
    assert_eq!(duplicate.tracks[0].keys[0].values, [3., 4.]);
    assert_eq!(duplicate.tracks[0].keys[0].curve, "stepped");
    let duplicate_view = serde_json::to_value(duplicate).unwrap();
    let undone = edit(&s, json!({"type":"undo"}));
    assert_eq!(undone.animations.len(), 1);
    assert_eq!(
        serde_json::to_value(&undone.animations[0]).unwrap(),
        original
    );
    let redone = edit(&s, json!({"type":"redo"}));
    assert_eq!(
        serde_json::to_value(&redone.animations[1]).unwrap(),
        duplicate_view
    );
    let saved_state = state(&s);
    let collision =
        serde_json::from_value(json!({"type":"duplicateAnimation","id":source,"name":"copy"}))
            .unwrap();
    assert!(s.edit(snapshot(&s).revision, collision).is_err());
    assert_eq!(state(&s), saved_state);
    assert_eq!(sample(&s, id, 15.).local_bones[0].x, 3.);
    assert_eq!(snapshot(&s).bones[0].x, 0.);
}
#[test]
fn temporary_animation_working_pose_freezes_native_world_without_authoring_or_saving_it() {
    let s = new();
    let p = snapshot(&s);
    let clip = p.animations[0].id;
    let before = state(&s);
    let mut posed = crate::evaluation::LocalPoseView::from(solve::LocalPose::from(
        &fbones_format::minimal::Bone::root(),
    ));
    posed.x = 123.;
    posed.y = -17.;
    let request = |animation_id, mode, poses| EvaluationRequest {
        constraint_pose: None,
        animation_id,
        animation_pose: Some(poses),
        draw_order_pose: None,
        deform_targets: vec![],
        deform_pose: None,
        mode,
        time: 0.,
        motion: None,
        from_pose_epoch: None,
    };
    let frozen = s
        .evaluate(
            p.revision,
            request(Some(clip), EvaluationMode::None, vec![posed]),
        )
        .unwrap();
    assert_eq!(frozen.local_bones[0].x, 123.);
    assert_eq!(frozen.local_bones[0].y, -17.);
    assert_eq!(frozen.bones[0].world.x, 123.);
    assert_eq!(frozen.bones[0].world.y, -17.);
    assert_eq!(state(&s), before);
    let mut bad = posed;
    bad.scale_x = f64::INFINITY;
    for invalid in [
        request(Some(clip), EvaluationMode::None, vec![]),
        request(Some(clip), EvaluationMode::None, vec![bad]),
        request(None, EvaluationMode::None, vec![posed]),
        request(Some(clip), EvaluationMode::Update, vec![posed]),
    ] {
        assert_eq!(
            s.evaluate(p.revision, invalid).unwrap_err().code,
            "InvalidAnimationPose"
        );
        assert_eq!(state(&s), before);
    }
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("unkeyed-working-pose.fbones");
    s.save_snapshot(s.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    let envelope = fbones_format::ProjectEnvelope::inspect(std::fs::read(path).unwrap()).unwrap();
    let saved =
        fbones_format::minimal::scene::decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
    assert_eq!(saved.rig.bones[0].x, 0.);
    assert!(saved.animations[0].tracks.is_empty());
}
#[test]
fn stored_fps_changes_real_time_sampling_without_changing_key_frames_or_setup() {
    let s = new();
    let p = snapshot(&s);
    let root = p.bones[0].id;
    let clip = p.animations[0].id;
    batch(
        &s,
        clip,
        vec![
            key(root, 0., 0., 0., "linear"),
            key(root, 24., 24., 0., "linear"),
        ],
    );
    let before = snapshot(&s);
    let keys = serde_json::to_value(&before.animations).unwrap();
    let old_fps_checkpoint = s
        .evaluate(
            before.revision,
            EvaluationRequest {
                animation_id: Some(clip),
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                mode: EvaluationMode::Replay,
                time: 0.25,
                motion: None,
                from_pose_epoch: None,
            },
        )
        .unwrap();
    let changed = edit(&s, json!({"type":"setAnimationFps","fps":24}));
    assert_eq!(
        s.evaluate(
            changed.revision,
            EvaluationRequest {
                animation_id: Some(clip),
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                mode: EvaluationMode::Replay,
                time: 0.5,
                motion: None,
                from_pose_epoch: Some(old_fps_checkpoint.pose_epoch),
            }
        )
        .unwrap_err()
        .code,
        "StalePose",
        "A private checkpoint must not cross stored FPS changes"
    );
    assert_eq!(changed.revision, before.revision + 1);
    assert_eq!(changed.animation_fps, 24.);
    assert_eq!(serde_json::to_value(&changed.animations).unwrap(), keys);
    let eval = s
        .evaluate(
            changed.revision,
            EvaluationRequest {
                animation_id: Some(clip),
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                mode: EvaluationMode::None,
                time: 0.5,
                motion: None,
                from_pose_epoch: None,
            },
        )
        .unwrap();
    assert_eq!(eval.local_bones[0].x, 12.);
    edit(&s, json!({"type":"undo"}));
    assert_eq!(snapshot(&s).animation_fps, 30.);
    edit(&s, json!({"type":"redo"}));
    assert_eq!(snapshot(&s).animation_fps, 24.);
    for fps in [0., 241., f32::NAN] {
        let unchanged = state(&s);
        assert!(s
            .edit(snapshot(&s).revision, RigEdit::SetAnimationFps { fps })
            .is_err());
        assert_eq!(state(&s), unchanged);
    }
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("fps24.fbones");
    s.save_snapshot(s.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    s.close(false).unwrap();
    let reopened = s.replace(open_document(path).unwrap(), false).unwrap();
    assert_eq!(reopened.animation_fps, 24.);
    assert_eq!(serde_json::to_value(reopened.animations).unwrap(), keys);
    assert_eq!(reopened.bones[0].x, 0.);
}
#[test]
fn four_channels_and_absolute_bezier_controls_sample_nonzero_setup_and_move_together() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    edit(
        &s,
        json!({"type":"update","id":root,"name":"root","x":11,"y":-9,"rotation":20,"length":0,"scaleX":2,"scaleY":0.5,"shearX":5,"shearY":-7}),
    );
    edit(&s, json!({"type":"setAnimationFps","fps":24}));
    let p = snapshot(&s);
    let clip = p.animations[0].id;
    let mut keys = vec![];
    for (channel, from, to, controls) in [
        (
            "rotate",
            [0., 0.],
            [90., 0.],
            [[8., 30., 16., 60.], [0.; 4]],
        ),
        (
            "translate",
            [0., 0.],
            [24., 48.],
            [[8., 8., 16., 16.], [8., 16., 16., 32.]],
        ),
        (
            "scale",
            [1., 2.],
            [3., 4.],
            [[8., 1., 16., 3.], [8., 2., 16., 4.]],
        ),
        (
            "shear",
            [0., 0.],
            [12., -24.],
            [[8., 4., 16., 8.], [8., -8., 16., -16.]],
        ),
    ] {
        keys.push(json!({"bone":root,"channel":channel,"frame":0,"values":from,"curve":"bezier","controls":controls}));
        keys.push(json!({"bone":root,"channel":channel,"frame":24,"values":to,"curve":"linear"}));
    }
    let keyed = batch(&s, clip, keys);
    let setup = serde_json::to_value(&keyed.bones).unwrap();
    let sampled = sample(&s, clip, 12.);
    let b = &sampled.local_bones[0];
    assert_eq!(
        [b.x, b.y, b.rotation, b.scale_x, b.scale_y, b.shear_x, b.shear_y],
        [23., 15., 65., 4., 1.5, 11., -19.]
    );
    let ids: Vec<_> = keyed.animations[0]
        .tracks
        .iter()
        .flat_map(|t| t.keys.iter().map(|k| k.id))
        .collect();
    let moved = edit(
        &s,
        json!({"type":"moveAnimationKeys","animation":clip,"keys":ids,"deltaFrames":12}),
    );
    assert_eq!(
        moved.animations[0].tracks[1].keys[0].controls.unwrap()[0],
        [20., 8., 28., 16.]
    );
    assert_eq!(
        moved.animations[0].tracks[0].keys[0].controls.unwrap()[1],
        [0.; 4]
    );
    let shifted = sample(&s, clip, 24.);
    assert_eq!(shifted.local_bones[0].x, 23.);
    assert_eq!(shifted.local_bones[0].rotation, 65.);
    assert_eq!(serde_json::to_value(snapshot(&s).bones).unwrap(), setup);
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("four-channels.fbones");
    s.save_snapshot(s.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    s.close(false).unwrap();
    let reopened = s.replace(open_document(path).unwrap(), false).unwrap();
    assert!(!reopened.inspection_only);
    assert_eq!(reopened.animations[0].tracks.len(), 4);
    assert_eq!(reopened.animation_fps, 24.);
}
#[test]
fn interleaved_multibone_key_batches_keep_contiguous_groups_and_reject_stale_explicit_key_ids() {
    let s = new();
    let root = snapshot(&s).bones[0].id;
    let child = edit(
        &s,
        json!({"type":"create","parent":root,"x":10,"y":5,"rotation":0,"length":20}),
    )
    .edited_bone
    .unwrap();
    let clip = snapshot(&s).animations[0].id;
    let p = batch(
        &s,
        clip,
        vec![
            key(root, 0., 1., 2., "linear"),
            key(child, 0., 3., 4., "linear"),
            json!({"bone":root,"channel":"rotate","frame":0,"values":[30,0],"curve":"linear"}),
        ],
    );
    assert_eq!(
        p.animations[0]
            .tracks
            .iter()
            .map(|t| t.bone)
            .collect::<Vec<_>>(),
        vec![root, root, child]
    );
    let selected = p.animations[0].tracks[0].keys[0].id;
    for (bone, frame, channel) in [
        (child, 0, "translate"),
        (root, 1, "translate"),
        (root, 0, "rotate"),
    ] {
        let before = state(&s);
        let op=serde_json::from_value(json!({"type":"setAnimationKey","animation":clip,"keyId":selected,"bone":bone,"channel":channel,"frame":frame,"values":[3,0],"curve":"linear"})).unwrap();
        assert!(s.edit(snapshot(&s).revision, op).is_err());
        assert_eq!(state(&s), before);
    }
}
