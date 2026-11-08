//! Finite extended Transform Setup mixes are authored data, not animation keys.
use super::*;
use crate::{
    evaluation::{EvaluationMode, EvaluationRequest},
    rig::RigEdit,
    scene_edit::ConstraintInput,
};
use fbones_format::minimal::scene::{
    decode_scene, encode_scene, encode_scene_payload, Constraint, SceneProject,
};
use fbones_format::ProjectEnvelope;

fn model(session: &Session) -> SceneProject {
    let state = session.lock().unwrap();
    let Some(Document::Editable { project, .. }) = &state.document else {
        panic!("own editable model")
    };
    (**project).clone()
}
fn transform(project: &SceneProject) -> &fbones_format::minimal::scene::TransformConstraint {
    let Constraint::Transform(c) = &project.constraints[0] else {
        panic!("own Transform")
    };
    c
}
fn input(summary: &ProjectSummary) -> ConstraintInput {
    serde_json::from_value(summary.constraints[0].clone()).unwrap()
}
fn evaluate_none(session: &Session, revision: u64) {
    let before = encode_scene_payload(&model(session)).unwrap();
    let snapshot = session
        .evaluate(
            revision,
            EvaluationRequest {
                mode: EvaluationMode::None,
                time: 0.25,
                animation_id: None,
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_pose: None,
                deform_targets: vec![],
                motion: None,
                from_pose_epoch: None,
            },
        )
        .unwrap();
    assert!(!snapshot.bones.is_empty());
    for bone in snapshot.bones {
        assert!([
            bone.world.x,
            bone.world.y,
            bone.world.a,
            bone.world.b,
            bone.world.c,
            bone.world.d
        ]
        .into_iter()
        .all(f32::is_finite));
        for pose in [bone.authored, bone.applied] {
            assert!([
                pose.x,
                pose.y,
                pose.rotation,
                pose.scale_x,
                pose.scale_y,
                pose.shear_x,
                pose.shear_y
            ]
            .into_iter()
            .all(f64::is_finite));
        }
    }
    assert_eq!(
        encode_scene_payload(&model(session)).unwrap(),
        before,
        "None evaluation never authors Setup or keys"
    );
}
fn cache_identity(
    session: &Session,
) -> (
    u64,
    serde_json::Value,
    Option<crate::solve::PhysicsState>,
    Option<crate::solve::Evaluation>,
) {
    let state = session.lock().unwrap();
    (
        state.next_pose_epoch,
        serde_json::to_value(state.evaluation.as_ref().map(|e| &e.snapshot)).unwrap(),
        state.evaluation.as_ref().map(|e| e.physics.clone()),
        state.evaluation.as_ref().map(|e| e.evaluated.clone()),
    )
}
#[test]
fn transform_extended_setup_mix_real_session_property_history_save_raw_bits_and_nonfinite_rejection(
) {
    let directory = tempfile::tempdir().unwrap();
    std::fs::create_dir(directory.path().join("images")).unwrap();
    let mut original = crate::scene_sequence_fixture::project();
    let Constraint::Transform(c) = &mut original.constraints[0] else {
        unreachable!()
    };
    c.mix = [-0., -1., -1., 1.25, 0., 0.];
    c.offsets = [3., 4., 5., 0.125, -0.25, 6.];
    let mix_bits = c.mix.map(f32::to_bits);
    for key in crate::animation_sequence::all_image_keys(&original).unwrap() {
        std::fs::write(
            directory.path().join("images").join(format!("{key}.png")),
            crate::images::tests::png([64, 128, 200, 255]),
        )
        .unwrap();
    }
    let source = directory.path().join("own-extended-mix.spine");
    let source_bytes = encode_scene(&original).unwrap();
    std::fs::write(&source, &source_bytes).unwrap();
    let session = Session::default();
    let initial = session
        .replace(open_document(source.clone()).unwrap(), false)
        .unwrap();
    assert!(!initial.inspection_only && !initial.dirty && !initial.can_undo);
    assert_eq!(
        encode_scene_payload(&model(&session)).unwrap(),
        encode_scene_payload(&original).unwrap()
    );
    assert_eq!(transform(&model(&session)).mix.map(f32::to_bits), mix_bits);
    evaluate_none(&session, initial.revision);
    assert_eq!(std::fs::read(&source).unwrap(), source_bytes);
    let id = initial.constraints[0]["id"].as_u64().unwrap();
    let mut update = input(&initial);
    let ConstraintInput::Transform { offsets, .. } = &mut update else {
        unreachable!()
    };
    offsets[0] = 9.;
    let edited = session
        .edit(
            initial.revision,
            RigEdit::UpdateConstraint {
                id,
                constraint: Box::new(update),
            },
        )
        .unwrap();
    assert_eq!(edited.revision, initial.revision + 1);
    let after = model(&session);
    let mut permitted = original.clone();
    let Constraint::Transform(c) = &mut permitted.constraints[0] else {
        unreachable!()
    };
    c.offsets[0] = 9.;
    assert_eq!(
        encode_scene_payload(&after).unwrap(),
        encode_scene_payload(&permitted).unwrap(),
        "one Setup property only; all keys/metadata/geometry untouched"
    );
    assert_eq!(after.animations, original.animations);
    assert_eq!(transform(&after).mix.map(f32::to_bits), mix_bits);
    evaluate_none(&session, edited.revision);
    let stable = serde_json::to_value(session.summary().unwrap().unwrap()).unwrap();
    let stable_cache = cache_identity(&session);
    let stable_bytes = encode_scene_payload(&after).unwrap();
    for invalid in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY] {
        let mut invalid_project = after.clone();
        let Constraint::Transform(c) = &mut invalid_project.constraints[0] else {
            unreachable!()
        };
        c.mix[1] = invalid;
        let mut physics = stable_cache.2.clone().unwrap();
        let physics_before = physics.clone();
        assert_eq!(
            crate::solve::evaluate(
                &invalid_project,
                None,
                &mut physics,
                crate::solve::StepMode::None
            )
            .unwrap_err(),
            crate::solve::SolveError::InvalidConstraint
        );
        assert_eq!(
            physics, physics_before,
            "Failed evaluator preflight preserves caller Physics state"
        );
        let mut update = input(&edited);
        let ConstraintInput::Transform { mix, .. } = &mut update else {
            unreachable!()
        };
        mix[1] = invalid;
        assert!(session
            .edit(
                edited.revision,
                RigEdit::UpdateConstraint {
                    id,
                    constraint: Box::new(update)
                }
            )
            .is_err());
        assert_eq!(
            serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
            stable
        );
        assert_eq!(
            encode_scene_payload(&model(&session)).unwrap(),
            stable_bytes
        );
    }
    assert_eq!(
        cache_identity(&session),
        stable_cache,
        "Invalid authoring/evaluation cannot replace the live cache or epoch"
    );
    let undone = session.edit(edited.revision, RigEdit::Undo).unwrap();
    assert!(!undone.can_undo);
    assert_eq!(
        encode_scene_payload(&model(&session)).unwrap(),
        encode_scene_payload(&original).unwrap()
    );
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(
        encode_scene_payload(&model(&session)).unwrap(),
        stable_bytes
    );
    let target = directory.path().join("portable/saved-extended-mix.fbones");
    let saved = session
        .save_snapshot(session.prepare_save(true).unwrap(), target.clone())
        .unwrap();
    assert!(!saved.dirty);
    let envelope = ProjectEnvelope::inspect(std::fs::read(&target).unwrap()).unwrap();
    let payload = envelope.decoded_payload().unwrap();
    let decoded = decode_scene(&payload).unwrap();
    let mut expected = after;
    expected.images_root = "./images/".into();
    fbones_format::minimal::scene::normalize_wire_strings(&mut expected).unwrap();
    assert_eq!(encode_scene_payload(&expected).unwrap(), payload);
    assert_eq!(transform(&decoded).mix.map(f32::to_bits), mix_bits);
    assert_eq!(decoded.animations, original.animations);
    session.close(false).unwrap();
    let reopened = session
        .replace(open_document(target).unwrap(), false)
        .unwrap();
    assert!(!reopened.inspection_only && !reopened.dirty);
    assert_eq!(reopened.constraints, redone.constraints);
    assert_eq!(encode_scene_payload(&model(&session)).unwrap(), payload);
    assert_eq!(transform(&model(&session)).mix.map(f32::to_bits), mix_bits);
    evaluate_none(&session, reopened.revision);
    assert_eq!(std::fs::read(&source).unwrap(), source_bytes);
}
