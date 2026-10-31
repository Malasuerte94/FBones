use crate::{
    evaluation::{EvaluationMode, EvaluationRequest},
    project::{new_document, open_document, Document, ProjectSummary, Session},
    solve::{self, ConstraintValue, PhysicsState, StepMode},
};
use fbones_format::minimal::{
    scene::{
        Animation, Constraint, IkConstraint, PhysicsConstraint, SceneProject, TransformConstraint,
    },
    Bone,
};
use serde_json::{json, Value};
fn summary(s: &Session) -> ProjectSummary {
    s.summary().unwrap().unwrap()
}
fn state(s: &Session) -> Value {
    serde_json::to_value(summary(s)).unwrap()
}
fn edit(s: &Session, value: Value) -> ProjectSummary {
    s.edit(summary(s).revision, serde_json::from_value(value).unwrap())
        .unwrap()
}
fn fixture() -> (Session, SceneProject) {
    let mut doc = new_document("Own constraint animation".into()).unwrap();
    let baseline;
    if let Document::Editable { project, rig, .. } = &mut doc {
        for (name, parent, x, y, length) in [
            ("upper", 0, 0., 0., 30.),
            ("lower", 1, 30., 0., 25.),
            ("target", 0, 45., 22., 0.),
            ("source", 0, 8., -3., 0.),
        ] {
            let mut b = Bone::root();
            b.name = name.into();
            b.parent = Some(parent);
            b.x = x;
            b.y = y;
            b.length = length;
            project.rig.bones.push(b);
        }
        let mut ik = IkConstraint::new("IK".into(), vec![1, 2], 3);
        ik.mix = 0.;
        let mut transform = TransformConstraint::new("Transform".into(), vec![1], 4);
        transform.mix = [0.; 6];
        let mut physics = PhysicsConstraint::new("Physics".into(), 2);
        physics.x = 1.;
        physics.y = 1.;
        project.constraints = vec![
            Constraint::Ik(ik),
            Constraint::Transform(transform),
            Constraint::Physics(physics),
        ];
        project.fps = 24.;
        project.editor_flag_53 = true;
        baseline = project.as_ref().clone();
        **rig = crate::scene_edit::SceneRigHistory::new(project, false);
    } else {
        unreachable!()
    }
    let s = Session::default();
    s.replace(doc, false).unwrap();
    (s, baseline)
}
fn ids(p: &ProjectSummary) -> [u64; 3] {
    std::array::from_fn(|i| p.constraints[i]["id"].as_u64().unwrap())
}
fn request(s: &Session, frame: f64) -> EvaluationRequest {
    let p = summary(s);
    EvaluationRequest {
        mode: EvaluationMode::None,
        time: frame / p.animation_fps,
        animation_id: Some(p.animations[0].id),
        animation_pose: None,
        constraint_pose: None,
        draw_order_pose: None,
        deform_pose: None,
        deform_targets: vec![],
        motion: None,
        from_pose_epoch: None,
    }
}
fn set(s: &Session, keys: Vec<Value>) -> ProjectSummary {
    edit(
        s,
        json!({"type":"setAnimationConstraintKeys","animation":summary(s).animations[0].id,"keys":keys}),
    )
}
fn ik(c: u64, frame: f32, mix: f32, softness: f32) -> Value {
    json!({"channel":"ik","constraint":c,"frame":frame,"mix":mix,"softness":softness,"stretch":false,"compress":true,"bendPositive":false,"curve":"linear"})
}
fn decode(path: &std::path::Path) -> SceneProject {
    let e = fbones_format::ProjectEnvelope::inspect(std::fs::read(path).unwrap()).unwrap();
    fbones_format::minimal::scene::decode_scene(&e.decoded_payload().unwrap()).unwrap()
}
fn setup(mut p: SceneProject) -> Vec<u8> {
    p.animations = vec![Animation::new("animation".into())];
    p.events.clear();
    fbones_format::minimal::scene::encode_scene_payload(&p).unwrap()
}
#[test]
fn constraint_curves_sample_two_six_one_axes_with_discrete_ik_flags_and_preserve_setup() {
    let (s, baseline) = fixture();
    let p = summary(&s);
    let [c, t, phys] = ids(&p);
    let mut first = ik(c, 0., 0., 0.);
    first["curve"] = json!("bezier");
    first["controls"] = json!([[8., 0., 16., 1.], [8., 0., 16., 8.]]);
    let mut last = ik(c, 24., 1., 8.);
    last["stretch"] = json!(true);
    last["compress"] = json!(false);
    last["bendPositive"] = json!(true);
    let mut keys = vec![first, last];
    for frame in [0., 24.] {
        keys.push(json!({"channel":"transformMix","constraint":t,"frame":frame,"values":if frame==0.{[0.;6]}else{[0.2;6]},"curve":"linear"}));
        keys.push(json!({"channel":"physics","constraint":phys,"property":"gravity","frame":frame,"value":if frame==0.{2.}else{4.},"curve":"linear"}));
    }
    let changed = set(&s, keys);
    assert_eq!(changed.revision, p.revision + 1);
    let before = state(&s);
    let pose = s.evaluate(changed.revision, request(&s, 12.)).unwrap();
    match &pose.constraint_pose[0] {
        crate::animation_constraints::ConstraintPose::Ik {
            mix,
            softness,
            stretch,
            compress,
            bend_positive,
            ..
        } => {
            assert!((*mix - 0.5).abs() < 1e-12);
            assert!((*softness - 4.).abs() < 1e-12);
            assert!(!stretch && *compress && !bend_positive);
        }
        _ => panic!(),
    };
    match &pose.constraint_pose[1] {
        crate::animation_constraints::ConstraintPose::Transform { mixes, .. } => {
            assert!(mixes
                .iter()
                .all(|v| (*v - f64::from(0.2f32) * 0.5).abs() < 1e-12))
        }
        _ => panic!(),
    };
    match &pose.constraint_pose[2] {
        crate::animation_constraints::ConstraintPose::Physics { gravity, .. } => {
            assert_eq!(*gravity, 3.)
        }
        _ => panic!(),
    };
    assert_eq!(state(&s), before);
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("constraints.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let raw = decode(&path);
    assert_eq!(setup(raw.clone()), setup(baseline));
    s.close(false).unwrap();
    let reopened = s.replace(open_document(path).unwrap(), false).unwrap();
    assert_eq!(reopened.animations[0].constraint_tracks.len(), 3);
    assert!(raw.editor_flag_53);
}
#[test]
fn mixed_event_constraint_history_duplicate_and_native_reopen_preserve_all_payload_bits() {
    let (s, _) = fixture();
    let p = summary(&s);
    let [c, _, phys] = ids(&p);
    let event = edit(&s, json!({"type":"createEvent","name":"Footstep"}))
        .edited_event
        .unwrap();
    edit(
        &s,
        json!({"type":"updateEvent","id":event,"int":-7,"float":1.25,"string":"setup","volume":0.6,"balance":-0.25}),
    );
    let before = summary(&s);
    let changed = edit(
        &s,
        json!({"type":"setAnimationKeyBatch","animation":p.animations[0].id,"boneKeys":[],"slotKeys":[],"constraintKeys":[ik(c,0.,0.,0.),ik(c,24.,1.,2.),{"channel":"physicsReset","constraint":phys,"frame":12}],"eventKeys":[{"event":event,"frame":6,"int":-42,"float":1.125,"string":"left","volume":0.5,"balance":0,"payloadBits":[1.125f32.to_bits(),0.5f32.to_bits(),(-0f32).to_bits()]},{"event":event,"frame":6,"int":3,"float":4,"string":"right","volume":0.75,"balance":-0.25}]}),
    );
    assert_eq!(changed.revision, before.revision + 1);
    let ids = changed.animations[0]
        .constraint_tracks
        .iter()
        .flat_map(|t| t.keys.iter().map(|k| k.id))
        .chain(
            changed.animations[0]
                .event_tracks
                .iter()
                .flat_map(|t| t.keys.iter().map(|k| k.id)),
        )
        .collect::<Vec<_>>();
    assert_eq!(
        ids.iter().collect::<std::collections::HashSet<_>>().len(),
        5
    );
    assert_eq!(
        changed.animations[0].event_tracks[0].keys[0]
            .balance
            .to_bits(),
        (-0f32).to_bits()
    );
    edit(&s, json!({"type":"undo"}));
    assert!(summary(&s).animations[0].constraint_tracks.is_empty());
    edit(&s, json!({"type":"redo"}));
    let duplicate = edit(
        &s,
        json!({"type":"duplicateAnimation","id":p.animations[0].id,"name":"copy"}),
    );
    for id in duplicate.animations[1]
        .constraint_tracks
        .iter()
        .flat_map(|t| t.keys.iter().map(|k| k.id))
        .chain(
            duplicate.animations[1]
                .event_tracks
                .iter()
                .flat_map(|t| t.keys.iter().map(|k| k.id)),
        )
    {
        assert!(!ids.contains(&id));
    }
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("events.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let raw = decode(&path);
    assert_eq!(raw.events[0].int, -7);
    assert_eq!(raw.events[0].balance, -0.25);
    assert_eq!(
        raw.animations[0].event_tracks[0].keys[0].balance.to_bits(),
        (-0f32).to_bits()
    );
    s.close(false).unwrap();
    let reopened = s.replace(open_document(path).unwrap(), false).unwrap();
    assert_eq!(reopened.events[0].name, "Footstep");
    assert_eq!(reopened.animations[0].event_tracks[0].keys.len(), 2);
}
#[test]
fn event_patch_and_group_numeric_bits_preserve_unrelated_fields_and_invalid_batches_rollback() {
    let (s, _) = fixture();
    let p = summary(&s);
    let [c, _, _] = ids(&p);
    let event = edit(&s, json!({"type":"createEvent","name":"Cue"}))
        .edited_event
        .unwrap();
    edit(
        &s,
        json!({"type":"updateEvent","id":event,"float":0,"floatBits":(-0f32).to_bits(),"volume":0.25,"string":"raw"}),
    );
    let patched = edit(&s, json!({"type":"updateEvent","id":event,"int":-3}));
    assert_eq!(patched.events[0].float.to_bits(), (-0f32).to_bits());
    assert_eq!(patched.events[0].string, "raw");
    let mut key = ik(c, 0., 0., 2.);
    key["valueBits"] = json!([(-0f32).to_bits(), 2f32.to_bits()]);
    let changed = set(&s, vec![key]);
    assert_eq!(
        changed.animations[0].constraint_tracks[0].keys[0]
            .mix
            .unwrap()
            .to_bits(),
        (-0f32).to_bits()
    );
    let stable = state(&s);
    for bad in [
        json!({"type":"updateEvent","id":event,"int":40,"floatBits":0}),
        json!({"type":"updateEvent","id":event,"float":1,"floatBits":2f32.to_bits()}),
        json!({"type":"setAnimationKeyBatch","animation":p.animations[0].id,"boneKeys":[],"slotKeys":[],"constraintKeys":[ik(c,24.,1.,2.)],"eventKeys":[{"event":event,"frame":0,"int":0,"float":0,"volume":1,"balance":0,"string":"bad","payloadBits":[f32::NAN.to_bits(),1f32.to_bits(),0]}]}),
    ] {
        assert!(s
            .edit(summary(&s).revision, serde_json::from_value(bad).unwrap())
            .is_err());
        assert_eq!(state(&s), stable);
    }
    let selected = changed.animations[0].constraint_tracks[0].keys[0].id;
    let mut key = ik(c, 0., 0.5, 2.);
    key["keyId"] = json!(selected);
    set(&s, vec![key]);
    assert_eq!(
        summary(&s).animations[0].constraint_tracks[0].keys[0].id,
        selected
    );
}
#[test]
fn temporary_constraint_pose_freezes_f64_values_without_history_and_rejects_wrong_targets() {
    let (s, _) = fixture();
    let p = summary(&s);
    let [c, t, phys] = ids(&p);
    let before = state(&s);
    let mut req = request(&s, 12.);
    req.constraint_pose=Some(serde_json::from_value(json!([{"constraint":c,"type":"ik","mix":0.37500000000013,"softness":2.1250000000003,"stretch":false,"compress":true,"bendPositive":true},{"constraint":t,"type":"transform","mixes":[0,0,0,0,0,0]}])).unwrap());
    let pose = s.evaluate(p.revision, req.clone()).unwrap();
    match pose.constraint_pose[0] {
        crate::animation_constraints::ConstraintPose::Ik { mix, softness, .. } => {
            assert_eq!(mix, 0.37500000000013);
            assert_eq!(softness, 2.1250000000003);
        }
        _ => panic!(),
    };
    assert_eq!(state(&s), before);
    for value in [
        json!([{"constraint":phys,"type":"ik","mix":0.5,"softness":0,"stretch":false,"compress":false,"bendPositive":true}]),
        json!([{"constraint":c,"type":"transform","mixes":[0,0,0,0,0,0]}]),
    ] {
        let mut bad = req.clone();
        bad.constraint_pose = Some(serde_json::from_value(value).unwrap());
        assert!(s.evaluate(p.revision, bad).is_err());
        assert_eq!(state(&s), before);
    }
    let mut bad = req.clone();
    bad.mode = EvaluationMode::Update;
    assert!(s.evaluate(p.revision, bad).is_err());
    let mut bad = req;
    let duplicate = bad.constraint_pose.as_ref().unwrap()[0].clone();
    bad.constraint_pose.as_mut().unwrap().push(duplicate);
    assert!(s.evaluate(p.revision, bad).is_err());
    assert_eq!(state(&s), before);
}
#[test]
fn sampled_coefficients_keep_spring_layout_state_and_default_solver_arithmetic_unchanged() {
    let (_, scene) = fixture();
    let mut a = PhysicsState::default();
    let mut b = PhysicsState::default();
    let setup = scene
        .constraints
        .iter()
        .map(ConstraintValue::from)
        .collect::<Vec<_>>();
    let mut authored = scene
        .rig
        .bones
        .iter()
        .map(solve::LocalPose::from)
        .collect::<Vec<_>>();
    for tick in 0..20 {
        authored[0].y = tick as f64 * 2.;
        let mode = if tick == 0 {
            StepMode::Reset { time: 0. }
        } else {
            StepMode::Update {
                time: tick as f64 / 60.,
            }
        };
        let old = solve::evaluate(&scene, Some(&authored), &mut a, mode).unwrap();
        let new =
            solve::evaluate_sampled(&scene, Some(&authored), &mut b, mode, &setup, &[]).unwrap();
        assert_eq!(old, new);
        assert_eq!(a, b);
    }
    let previous = b.clone();
    let mut changed = setup;
    changed[0] = ConstraintValue::Ik {
        mix: 0.5,
        softness: 2.,
        stretch: false,
        compress: false,
        bend_positive: true,
    };
    changed[1] = ConstraintValue::Transform { mixes: [0.1; 6] };
    if let ConstraintValue::Physics {
        gravity, strength, ..
    } = &mut changed[2]
    {
        *gravity = 2.;
        *strength = 150.;
    }
    solve::evaluate_sampled(
        &scene,
        Some(&authored),
        &mut b,
        StepMode::Pose,
        &changed,
        &[],
    )
    .unwrap();
    assert_eq!(
        b, previous,
        "Animated numeric coefficients do not reset authored spring layout"
    );
    solve::evaluate_sampled(
        &scene,
        Some(&authored),
        &mut b,
        StepMode::Pose,
        &changed,
        &[2],
    )
    .unwrap();
    assert_ne!(b, previous, "Explicit per-constraint Reset is separate");
    assert_eq!(scene.constraints, fixture().1.constraints);
}

#[test]
fn constraint_event_epoch_commands_reject_stale_frame_clip_and_revision_atomically() {
    let (s, _) = fixture();
    let p = summary(&s);
    let [c, _, _] = ids(&p);
    set(&s, vec![ik(c, 0., 0., 0.), ik(c, 24., 1., 2.)]);
    let frozen = s.evaluate(summary(&s).revision, request(&s, 12.)).unwrap();
    let before = state(&s);
    let command = |frame| {
        serde_json::from_value(json!({"type":"setAnimationConstraintKeys","animation":p.animations[0].id,"keys":[ik(c,frame,0.5,1.)]})).unwrap()
    };
    assert!(s
        .edit_in_pose(summary(&s).revision, frozen.pose_epoch, command(24.))
        .is_err());
    assert_eq!(state(&s), before);
    let changed = s
        .edit_in_pose(summary(&s).revision, frozen.pose_epoch, command(12.))
        .unwrap();
    assert_eq!(changed.revision, frozen.revision + 1);
    let stable = state(&s);
    assert!(s
        .edit_in_pose(changed.revision, frozen.pose_epoch, command(12.))
        .is_err());
    assert_eq!(state(&s), stable);
}

#[test]
fn constraint_move_handles_remap_and_event_definition_delete_keep_ids_or_reject_atomically() {
    let (s, _) = fixture();
    let p = summary(&s);
    let [c, _, _] = ids(&p);
    let mut first = ik(c, 0., 0., 0.);
    first["curve"] = json!("bezier");
    first["controls"] = json!([[8, 0.25, 16, 0.75], [8, 0.5, 16, 1.5]]);
    let changed = set(&s, vec![first, ik(c, 24., 1., 2.)]);
    let key_ids = changed.animations[0].constraint_tracks[0]
        .keys
        .iter()
        .map(|k| k.id)
        .collect::<Vec<_>>();
    let moved = edit(
        &s,
        json!({"type":"moveAnimationKeys","animation":p.animations[0].id,"keys":key_ids,"deltaFrames":3}),
    );
    let controls = match &moved.animations[0].constraint_tracks[0].keys[0].controls {
        Some(crate::animation_constraints::ControlView::Axes(v)) => v.clone(),
        _ => panic!(),
    };
    assert_eq!(controls, vec![[11., 0.25, 19., 0.75], [11., 0.5, 19., 1.5]]);
    let reordered = edit(&s, json!({"type":"reorderConstraint","id":c,"index":2}));
    assert_eq!(reordered.animations[0].constraint_tracks[0].constraint, c);
    assert_eq!(
        reordered.animations[0].constraint_tracks[0]
            .keys
            .iter()
            .map(|k| k.id)
            .collect::<Vec<_>>(),
        key_ids
    );
    let stable = state(&s);
    assert!(s
        .edit(
            reordered.revision,
            serde_json::from_value(json!({"type":"deleteConstraint","id":c})).unwrap()
        )
        .is_err());
    assert_eq!(state(&s), stable);
    let event = edit(&s, json!({"type":"createEvent","name":"First"}))
        .edited_event
        .unwrap();
    let second = edit(&s, json!({"type":"createEvent","name":"Second"}))
        .edited_event
        .unwrap();
    let changed = edit(
        &s,
        json!({"type":"setAnimationEventKeys","animation":p.animations[0].id,"keys":[{"event":second,"frame":5,"int":1,"float":2,"string":"literal","volume":0,"balance":0}]}),
    );
    let eid = changed.animations[0].event_tracks[0].keys[0].id;
    let after = edit(&s, json!({"type":"deleteEvent","id":event}));
    assert_eq!(after.events[0].id, second);
    assert_eq!(after.animations[0].event_tracks[0].event, second);
    assert_eq!(after.animations[0].event_tracks[0].keys[0].id, eid);
    let stable = state(&s);
    assert!(s
        .edit(
            after.revision,
            serde_json::from_value(json!({"type":"deleteEvent","id":second})).unwrap()
        )
        .is_err());
    assert_eq!(state(&s), stable);
}

#[test]
fn native_replay_samples_coefficients_at_each_existing_tick_and_per_constraint_reset_crossing() {
    let (s, scene) = fixture();
    let p = summary(&s);
    let phys = ids(&p)[2];
    set(
        &s,
        vec![
            json!({"channel":"physics","constraint":phys,"property":"gravity","frame":0,"value":1,"curve":"linear"}),
            json!({"channel":"physics","constraint":phys,"property":"gravity","frame":24,"value":3,"curve":"linear"}),
            json!({"channel":"physicsReset","constraint":phys,"frame":6}),
        ],
    );
    let current = summary(&s);
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("replay.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let authored = decode(&path);
    assert_eq!(authored.constraints, scene.constraints);
    let mut req = request(&s, 12.);
    req.mode = EvaluationMode::Replay;
    let actual = s.evaluate(summary(&s).revision, req).unwrap();
    let mut physics = PhysicsState::default();
    let constraint_ids = ids(&current);
    let samples = crate::animation_constraints::sample(
        &authored,
        &constraint_ids,
        Some(&authored.animations[0]),
        0.,
        None,
    )
    .unwrap();
    let mut expected = solve::evaluate_sampled(
        &authored,
        None,
        &mut physics,
        StepMode::Reset { time: 0. },
        &samples.iter().map(|p| p.value()).collect::<Vec<_>>(),
        &[],
    )
    .unwrap();
    for tick in 1..=30 {
        let time = tick as f64 / 60.;
        let values = crate::animation_constraints::sample(
            &authored,
            &constraint_ids,
            Some(&authored.animations[0]),
            time,
            None,
        )
        .unwrap()
        .iter()
        .map(|p| p.value())
        .collect::<Vec<_>>();
        let resets = if tick == 15 { vec![2] } else { vec![] };
        expected = solve::evaluate_sampled(
            &authored,
            None,
            &mut physics,
            StepMode::Update { time },
            &values,
            &resets,
        )
        .unwrap();
    }
    for (a, b) in actual.bones.iter().zip(&expected.bones) {
        assert!((f64::from(a.world.x) - b.world.x).abs() < 1e-5);
        assert!((f64::from(a.world.y) - b.world.y).abs() < 1e-5);
    }
    let absent = crate::animation_constraints::reset_crossings(
        Some(&authored.animations[0]),
        authored.fps,
        0.25,
        0.5,
        false,
    );
    assert!(absent.is_empty());
}

#[test]
fn temporary_constraint_json_zero_carriers_restore_only_zero_signs_before_frozen_cache() {
    let (s, _) = fixture();
    let p = summary(&s);
    let [c, t, phys] = ids(&p);
    let value = json!({"mode":"none","time":0,"animationId":p.animations[0].id,"constraintPose":[{"constraint":c,"type":"ik","mix":0,"softness":2.1250000000003,"stretch":false,"compress":false,"bendPositive":true,"negativeZeroIndices":[0]},{"constraint":t,"type":"transform","mixes":[0,0.12345678901234,0,0,0,0],"negativeZeroIndices":[0,2]},{"constraint":phys,"type":"physics","inertia":1,"strength":100,"damping":0.85,"mass":1,"wind":0,"gravity":1.1250000000003,"mix":1,"negativeZeroIndices":[4]}]});
    let before = state(&s);
    let frozen = s
        .evaluate(
            p.revision,
            serde_json::from_str(&value.to_string()).unwrap(),
        )
        .unwrap();
    match frozen.constraint_pose[0] {
        crate::animation_constraints::ConstraintPose::Ik { mix, softness, .. } => {
            assert_eq!(mix.to_bits(), (-0f64).to_bits());
            assert_eq!(softness, 2.1250000000003);
        }
        _ => panic!(),
    };
    match frozen.constraint_pose[1] {
        crate::animation_constraints::ConstraintPose::Transform { mixes, .. } => {
            assert_eq!(mixes[0].to_bits(), (-0f64).to_bits());
            assert_eq!(mixes[2].to_bits(), (-0f64).to_bits());
            assert_eq!(mixes[1], 0.12345678901234);
        }
        _ => panic!(),
    };
    match frozen.constraint_pose[2] {
        crate::animation_constraints::ConstraintPose::Physics { wind, gravity, .. } => {
            assert_eq!(wind.to_bits(), (-0f64).to_bits());
            assert_eq!(gravity, 1.1250000000003);
        }
        _ => panic!(),
    };
    for indices in [vec![0, 0], vec![2], vec![1]] {
        let mut bad = value.clone();
        bad["constraintPose"][0]["negativeZeroIndices"] = json!(indices);
        assert!(serde_json::from_str::<EvaluationRequest>(&bad.to_string()).is_err());
    }
    assert_eq!(state(&s), before);
}
