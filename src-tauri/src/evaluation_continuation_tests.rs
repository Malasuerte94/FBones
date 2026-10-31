use super::*;
use fbones_format::minimal::{
    scene::{Constraint, PhysicsConstraint},
    MinimalProject,
};

fn scene() -> SceneProject {
    let mut rig = MinimalProject::new("Own live physics".into(), [91; 16]);
    let mut child = rig.bones[0].clone();
    child.name = "spring".into();
    child.parent = Some(0);
    child.x = 20.;
    child.length = 40.;
    rig.bones.push(child);
    let mut c = PhysicsConstraint::new("live gravity".into(), 1);
    c.x = 1.;
    c.y = 1.;
    c.gravity = 10.;
    c.strength = 20.;
    SceneProject {
        audio_root: "./audio".into(),
        events: vec![],
        editor_flag_53: false,
        fps: 30.,
        animations: vec![fbones_format::minimal::scene::Animation::new(
            "animation".into(),
        )],
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        attachment_order: vec![],
        constraints: vec![Constraint::Physics(c)],
    }
}
fn request(time: f64, from: Option<u64>, motion: Option<ReplayMotion>) -> EvaluationRequest {
    EvaluationRequest {
        animation_pose: None,
        constraint_pose: None,
        draw_order_pose: None,
        deform_targets: vec![],
        deform_pose: None,
        animation_id: None,
        mode: EvaluationMode::Replay,
        time,
        motion,
        from_pose_epoch: from,
    }
}
fn run(
    s: &SceneProject,
    previous: Option<&CachedEvaluation>,
    revision: u64,
    epoch: u64,
    time: f64,
    motion: Option<ReplayMotion>,
) -> CachedEvaluation {
    evaluate(
        s,
        &[0, 1],
        previous,
        revision,
        1,
        epoch,
        request(time, previous.map(|p| p.snapshot.pose_epoch), motion),
    )
    .unwrap()
}
fn locals(s: &SceneProject) -> Vec<LocalPoseView> {
    s.rig
        .bones
        .iter()
        .map(|b| LocalPoseView::from(solve::LocalPose::from(b)))
        .collect()
}
fn snapshots(cache: &CachedEvaluation) -> serde_json::Value {
    serde_json::to_value(&cache.snapshot.bones).unwrap()
}

#[test]
fn live_continuation_beyond_120_seconds_equals_uninterrupted_physics_without_reset() {
    let s = scene();
    let mut direct = PhysicsState::default();
    solve::evaluate(&s, None, &mut direct, StepMode::Reset { time: 0. }).unwrap();
    let mut frame = None;
    for tick in 1..=8100 {
        frame = Some(
            solve::evaluate(
                &s,
                None,
                &mut direct,
                StepMode::Update {
                    time: tick as f64 / 60.,
                },
            )
            .unwrap(),
        );
    }
    let mut cache = run(&s, None, 1, 1, 10., None);
    for index in 2..=13 {
        cache = run(&s, Some(&cache), 1, index, index as f64 * 10., None);
    }
    cache = run(&s, Some(&cache), 1, 14, 135., None);
    assert_eq!(cache.physics, direct);
    assert_eq!(cache.snapshot.time, 135.);
    for (bone, expected) in cache.snapshot.bones.iter().zip(frame.unwrap().bones) {
        assert_eq!(
            (
                bone.world.x,
                bone.world.y,
                bone.world.a,
                bone.world.b,
                bone.world.c,
                bone.world.d
            ),
            (
                expected.world.x as f32,
                expected.world.y as f32,
                expected.world.a as f32,
                expected.world.b as f32,
                expected.world.c as f32,
                expected.world.d as f32
            )
        );
    }
    assert_eq!(
        evaluate(&s, &[0, 1], None, 1, 1, 15, request(135., None, None))
            .err()
            .unwrap()
            .code,
        "PreviewReplayLimit"
    );
    for tick in 0..=20000 {
        assert_eq!(
            tick_ceil(tick as f64 / 60.),
            tick,
            "No duplicate final timestamp at integer ticks"
        );
    }
}

#[test]
fn live_continuation_motion_uses_absolute_ticks_and_keeps_unstepped_current_author_pose() {
    let original = scene();
    let initial = locals(&original);
    let mut moved = initial.clone();
    moved[0].x = 80.;
    let checkpoint = run(
        &original,
        None,
        1,
        1,
        11. / 60.,
        Some(ReplayMotion {
            initial: initial.clone(),
            changes: vec![ReplayMotionChange {
                tick: 11,
                poses: moved.clone(),
            }],
        }),
    );
    let old_public = serde_json::to_value(&checkpoint.snapshot).unwrap();
    let mut committed = original.clone();
    committed.rig.bones[0].x = 90.;
    let continued = run(
        &committed,
        Some(&checkpoint),
        2,
        2,
        21. / 60.,
        Some(ReplayMotion {
            initial: moved.clone(),
            changes: vec![],
        }),
    );
    let full = run(
        &committed,
        None,
        2,
        3,
        21. / 60.,
        Some(ReplayMotion {
            initial,
            changes: vec![ReplayMotionChange {
                tick: 11,
                poses: moved,
            }],
        }),
    );
    assert_eq!(continued.physics, full.physics);
    assert_eq!(snapshots(&continued), snapshots(&full));
    assert_eq!(
        serde_json::to_value(&checkpoint.snapshot).unwrap(),
        old_public,
        "Published old revision/geometry snapshot is immutable"
    );
    let mut another = committed.clone();
    another.rig.bones[0].x = 100.;
    let zero = run(&another, Some(&continued), 3, 4, 21. / 60., None);
    assert_eq!(zero.physics, continued.physics);
    assert_eq!(zero.snapshot.bones[0].authored.x, 100.);
    assert_eq!(zero.snapshot.bones[0].world.x, 100.);
    let mut expected_state = continued.physics.clone();
    let expected = solve::evaluate(&another, None, &mut expected_state, StepMode::Pose).unwrap();
    assert_eq!(
        zero.snapshot.bones[1].world.x,
        expected.bones[1].world.x as f32
    );
}

#[test]
fn live_continuation_rejects_wrong_checkpoint_document_layout_time_and_past_motion() {
    let s = scene();
    let cache = run(&s, None, 1, 1, 10., None);
    let original = snapshots(&cache);
    let physics = cache.physics.clone();
    for (kind, mut changed, ids, doc, token) in [
        (0, s.clone(), vec![0, 1], 1, 2),
        (0, s.clone(), vec![0, 1], 2, 1),
        (0, s.clone(), vec![0, 5], 1, 1),
        (1, s.clone(), vec![0, 1], 1, 1),
        (2, s.clone(), vec![0, 1], 1, 1),
        (3, s.clone(), vec![0, 1], 1, 1),
    ] {
        if kind == 1 {
            changed.rig.bones[1].length += 1.;
        }
        if kind == 2 {
            changed.rig.bones[1].parent = None;
        }
        if kind == 3 {
            let Constraint::Physics(c) = &mut changed.constraints[0] else {
                unreachable!()
            };
            c.gravity += 1.;
        }
        assert_eq!(
            evaluate(
                &changed,
                &ids,
                Some(&cache),
                2,
                doc,
                2,
                request(11., Some(token), None)
            )
            .err()
            .unwrap()
            .code,
            "StalePose"
        );
    }
    for time in [9., 130.1] {
        assert_eq!(
            evaluate(
                &s,
                &[0, 1],
                Some(&cache),
                1,
                1,
                2,
                request(time, Some(1), None)
            )
            .err()
            .unwrap()
            .code,
            "PreviewReplayLimit"
        );
    }
    let mut wrong = request(11., Some(1), None);
    wrong.mode = EvaluationMode::Update;
    assert_eq!(
        evaluate(&s, &[0, 1], Some(&cache), 1, 1, 2, wrong)
            .err()
            .unwrap()
            .code,
        "InvalidReplayMotion"
    );
    for tick in [599, 600, 661] {
        let motion = ReplayMotion {
            initial: locals(&s),
            changes: vec![ReplayMotionChange {
                tick,
                poses: locals(&s),
            }],
        };
        assert_eq!(
            evaluate(
                &s,
                &[0, 1],
                Some(&cache),
                1,
                1,
                2,
                request(11., Some(1), Some(motion))
            )
            .err()
            .unwrap()
            .code,
            "InvalidReplayMotion"
        );
    }
    let pose = locals(&s)[0];
    let too_many = EvaluationRequest {
        animation_pose: None,
        constraint_pose: None,
        draw_order_pose: None,
        deform_targets: vec![],
        deform_pose: None,
        animation_id: None,
        mode: EvaluationMode::Replay,
        time: 1200.,
        from_pose_epoch: Some(1),
        motion: Some(ReplayMotion {
            initial: vec![pose; 128],
            changes: (1..=2048)
                .map(|n| ReplayMotionChange {
                    tick: 600 + n,
                    poses: vec![pose; 128],
                })
                .collect(),
        }),
    };
    assert_eq!(
        validate_motion(&too_many, 128, 600).unwrap_err().code,
        "PreviewReplayLimit"
    );
    assert_eq!(snapshots(&cache), original);
    assert_eq!(cache.physics, physics);
}

#[test]
fn live_continuation_equal_fractional_time_only_poses_without_updating_inertia() {
    let s = scene();
    let checkpoint = run(&s, None, 1, 1, 0.01, None);
    let mut authored = s.clone();
    authored.rig.bones[0].x = 30.;
    let posed = run(&authored, Some(&checkpoint), 2, 2, 0.01, None);
    assert_eq!(posed.physics, checkpoint.physics);
    assert_eq!(posed.snapshot.bones[0].world.x, 30.);
    assert_eq!(tick_ceil(u32::MAX as f64 / 60.), u32::MAX);
}

#[test]
fn live_continuation_exact_7200_tick_window_accepts_subtraction_rounding_but_not_fractional_overrun(
) {
    let s = scene();
    let start = 481. / 60.;
    let end = 7681. / 60.;
    assert!(end - start > 120.);
    let checkpoint = run(&s, None, 1, 1, start, None);
    let continued = run(&s, Some(&checkpoint), 1, 2, end, None);
    assert_eq!(continued.snapshot.time, end);
    for overrun in [7682. / 60., end + 1e-9] {
        assert_eq!(
            evaluate(
                &s,
                &[0, 1],
                Some(&checkpoint),
                1,
                1,
                3,
                request(overrun, Some(1), None)
            )
            .err()
            .unwrap()
            .code,
            "PreviewReplayLimit"
        );
    }
    let fractional = run(&s, None, 1, 4, 0.01, None);
    assert_eq!(
        evaluate(
            &s,
            &[0, 1],
            Some(&fractional),
            1,
            1,
            5,
            request(120.010000001, Some(4), None)
        )
        .err()
        .unwrap()
        .code,
        "PreviewReplayLimit"
    );
}

#[test]
fn completed_tick_floor_keeps_ieee_neighbor_before_boundary_and_accepts_next_motion_tick() {
    for tick in 1..=7200_u32 {
        let exact = f64::from(tick) / 60.;
        let below = f64::from_bits(exact.to_bits() - 1);
        let above = f64::from_bits(exact.to_bits() + 1);
        assert_eq!(tick_floor(exact), tick);
        assert_eq!(tick_floor(below), tick - 1, "below tick {tick}");
        assert_eq!(tick_floor(above), tick, "above tick {tick}");
    }
    let original = scene();
    let below = f64::from_bits((23_f64 / 60.).to_bits() - 1);
    assert_eq!(below * 60., 23.);
    let checkpoint = run(&original, None, 1, 1, below, None);
    let mut moved = original.clone();
    moved.rig.bones[0].x = 80.;
    let continued = run(
        &moved,
        Some(&checkpoint),
        2,
        2,
        24. / 60.,
        Some(ReplayMotion {
            initial: locals(&original),
            changes: vec![ReplayMotionChange {
                tick: 23,
                poses: locals(&moved),
            }],
        }),
    );
    assert_eq!(continued.snapshot.time, 24. / 60.);
    assert_eq!(continued.snapshot.bones[0].authored.x, 80.);
}
