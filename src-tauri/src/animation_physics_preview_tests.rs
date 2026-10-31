use crate::{
    animation_constraints::ConstraintPose,
    evaluation::{self, CachedEvaluation, EvaluationMode, EvaluationRequest, LocalPoseView},
    solve::{self, PhysicsState, StepMode},
};
use fbones_format::minimal::{scene::*, MinimalProject};
fn scene() -> SceneProject {
    let mut rig = MinimalProject::new("Own replay endpoint".into(), [94; 16]);
    let mut child = rig.bones[0].clone();
    child.name = "spring".into();
    child.parent = Some(0);
    child.x = 40.1;
    child.length = 30.;
    rig.bones.push(child);
    let mut c = PhysicsConstraint::new("spring".into(), 1);
    c.x = 1.;
    c.y = 1.;
    c.wind = 2.;
    c.gravity = 3.;
    let mut clip = Animation::new("Own clip".into());
    clip.tracks.push(BoneTimeline {
        bone: 0,
        channel: BoneChannel::Translate,
        keys: vec![
            BoneKeyframe {
                frame: 0.,
                values: [0., 0.],
                curve: KeyCurve::Linear,
            },
            BoneKeyframe {
                frame: 30.,
                values: [80., 15.],
                curve: KeyCurve::Linear,
            },
        ],
    });
    clip.constraint_tracks = vec![
        ConstraintTimeline::Physics {
            constraint: 0,
            property: PhysicsProperty::Gravity,
            keys: vec![
                PhysicsKeyframe {
                    frame: 0.,
                    value: 3.,
                    curve: PhysicsCurve::Linear,
                },
                PhysicsKeyframe {
                    frame: 30.,
                    value: 8.,
                    curve: PhysicsCurve::Linear,
                },
            ],
        },
        ConstraintTimeline::PhysicsReset {
            constraint: 0,
            keys: vec![PhysicsResetKeyframe { frame: 7.5 }],
        },
    ];
    SceneProject {
        rig,
        images_root: "./images".into(),
        audio_root: "./audio".into(),
        events: vec![],
        editor_flag_53: false,
        fps: 30.,
        animations: vec![clip],
        slots: vec![],
        attachment_order: vec![],
        constraints: vec![Constraint::Physics(c)],
    }
}
fn request(time: f64) -> EvaluationRequest {
    EvaluationRequest {
        mode: EvaluationMode::Replay,
        time,
        animation_id: Some(7),
        animation_pose: None,
        constraint_pose: None,
        draw_order_pose: None,
        deform_pose: None,
        deform_targets: vec![],
        motion: None,
        from_pose_epoch: None,
    }
}
fn run(
    s: &SceneProject,
    request: &EvaluationRequest,
) -> Result<CachedEvaluation, crate::project::AppError> {
    evaluation::evaluate_animation(
        s,
        &[10, 11],
        None,
        1,
        2,
        3,
        request,
        &[31],
        Some(&s.animations[0]),
        &[],
    )
}
fn physics_pose(gravity: f64) -> ConstraintPose {
    ConstraintPose::Physics {
        constraint: 31,
        inertia: 0.5,
        strength: 100.,
        damping: f64::from(0.85_f32),
        mass: 1.,
        wind: 2.,
        gravity,
        mix: 1.,
    }
}
#[test]
fn animation_replay_endpoint_drafts_apply_one_pose_after_saved_prefix_and_keep_precise_locals() {
    let s = scene();
    let original = s.clone();
    for time in [0., 0.001, 15.25 / 30., 1., 120.] {
        let clean = run(&s, &request(time)).unwrap();
        let mut r = request(time);
        let mut bones = crate::animation::sample(&s, &s.animations[0], time).unwrap();
        bones[0].x = 80.123456789123;
        r.animation_pose = Some(bones.iter().copied().map(LocalPoseView::from).collect());
        r.constraint_pose = Some(vec![physics_pose(-0.)]);
        let actual = run(&s, &r).unwrap();
        let values = crate::animation_constraints::sample(
            &s,
            &[31],
            Some(&s.animations[0]),
            time,
            r.constraint_pose.as_deref(),
        )
        .unwrap()
        .iter()
        .map(ConstraintPose::value)
        .collect::<Vec<_>>();
        let mut expected_physics = clean.physics.clone();
        let expected = solve::evaluate_sampled(
            &s,
            Some(&bones),
            &mut expected_physics,
            StepMode::Pose,
            &values,
            &[],
        )
        .unwrap();
        assert_eq!(
            actual.physics, clean.physics,
            "Endpoint draft must not change saved-prefix spring history"
        );
        assert_eq!(actual.physics, expected_physics);
        assert_eq!(actual.evaluated, expected);
        assert_eq!(actual.snapshot.bones[0].authored.x, 80.123456789123);
        assert!(
            matches!(&actual.snapshot.constraint_pose[0],ConstraintPose::Physics{gravity,..} if gravity.to_bits()==(-0_f64).to_bits())
        );
        let mut empty = request(time);
        empty.constraint_pose = Some(vec![]);
        let unchanged = run(&s, &empty).unwrap();
        assert_eq!(unchanged.evaluated, clean.evaluated);
    }
    assert_eq!(s, original);
}
#[test]
fn replay_endpoint_guards_retain_none_and_reject_unrelated_modes_setup_motion_and_checkpoint() {
    let s = scene();
    let mut r = request(0.5);
    r.animation_pose = Some(
        s.rig
            .bones
            .iter()
            .map(|b| LocalPoseView::from(solve::LocalPose::from(b)))
            .collect(),
    );
    for mode in [
        EvaluationMode::Reset,
        EvaluationMode::Update,
        EvaluationMode::Pose,
    ] {
        r.mode = mode;
        assert_eq!(run(&s, &r).err().unwrap().code, "InvalidAnimationPose");
    }
    r.mode = EvaluationMode::None;
    run(&s, &r).unwrap();
    r.mode = EvaluationMode::Replay;
    r.from_pose_epoch = Some(9);
    assert_eq!(run(&s, &r).err().unwrap().code, "InvalidAnimationPose");
    r.from_pose_epoch = None;
    r.animation_pose.as_mut().unwrap()[0].x = f64::NAN;
    assert_eq!(run(&s, &r).err().unwrap().code, "InvalidAnimationPose");
    r.animation_pose = None;
    r.time = 120.00000001;
    assert_eq!(run(&s, &r).err().unwrap().code, "PreviewReplayLimit");
    r.time = 0.5;
    r.animation_id = None;
    assert_eq!(
        evaluation::evaluate_animation(
            &s,
            &[10, 11],
            None,
            1,
            2,
            3,
            &r,
            &[31],
            Some(&s.animations[0]),
            &[]
        )
        .err()
        .unwrap()
        .code,
        "InvalidAnimation"
    );
    r.animation_id = None;
    r.constraint_pose = Some(vec![physics_pose(1.)]);
    assert_eq!(
        evaluation::evaluate_animation(&s, &[10, 11], None, 1, 2, 3, &r, &[31], None, &[])
            .err()
            .unwrap()
            .code,
        "InvalidAnimationPose"
    );
}
#[test]
fn replay_saved_coefficients_keep_original_layout_between_steps() {
    let s = scene();
    let actual = run(&s, &request(0.5)).unwrap();
    let mut physics = PhysicsState::default();
    let mut expected = None;
    for tick in 0..=30 {
        let time = f64::from(tick) / 60.;
        let bones = crate::animation::sample(&s, &s.animations[0], time).unwrap();
        let values =
            crate::animation_constraints::sample(&s, &[31], Some(&s.animations[0]), time, None)
                .unwrap()
                .iter()
                .map(ConstraintPose::value)
                .collect::<Vec<_>>();
        let resets = if tick == 15 { vec![0] } else { vec![] };
        expected = Some(
            solve::evaluate_sampled(
                &s,
                Some(&bones),
                &mut physics,
                if tick == 0 {
                    StepMode::Reset { time: 0. }
                } else {
                    StepMode::Update { time }
                },
                &values,
                &resets,
            )
            .unwrap(),
        );
    }
    assert_eq!(actual.physics, physics);
    assert_eq!(actual.evaluated, expected.unwrap());
}
