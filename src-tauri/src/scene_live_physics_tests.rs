use super::*;
use crate::evaluation::{
    EvaluationMode, EvaluationRequest, LocalPoseView, ReplayMotion, ReplayMotionChange,
};
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
fn fixture() -> (tempfile::TempDir, Session, ProjectSummary) {
    let (d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let child = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], child, 10., 20.)
        .unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"live gravity","bone":child,"x":1,"y":1,"gravity":10,"strength":20}}),
    );
    (d, s, p)
}
#[test]
fn live_continuation_session_compatible_author_revision_keeps_public_geometry_stale_and_never_bakes_save(
) {
    let (d, s, p) = fixture();
    let before = scene_model(&s);
    let slot = p.slots[0].id;
    let snapshot = s.evaluate(p.revision, request(0.25, None, None)).unwrap();
    assert_eq!(scene_model(&s), before);
    let initial = before
        .rig
        .bones
        .iter()
        .map(|b| LocalPoseView::from(crate::solve::LocalPose::from(b)))
        .collect::<Vec<_>>();
    let mut moved = initial.clone();
    moved[0].x = 20.;
    let p = s
        .edit(
            p.revision,
            RigEdit::Move {
                id: 0,
                x: 20.,
                y: 0.,
            },
        )
        .unwrap();
    let authored = scene_model(&s);
    assert_eq!(
        s.edit_in_pose(
            p.revision,
            snapshot.pose_epoch,
            RigEdit::ConvertMesh { id: slot }
        )
        .unwrap_err()
        .code,
        "StalePose"
    );
    let continued = s
        .evaluate(
            p.revision,
            request(
                0.5,
                Some(snapshot.pose_epoch),
                Some(ReplayMotion {
                    initial,
                    changes: vec![ReplayMotionChange {
                        tick: 16,
                        poses: moved,
                    }],
                }),
            ),
        )
        .unwrap();
    assert_eq!(continued.revision, p.revision);
    assert_eq!(continued.bones[0].authored.x, 20.);
    assert_eq!(scene_model(&s), authored);
    let p = s
        .edit_in_pose(
            p.revision,
            continued.pose_epoch,
            RigEdit::ConvertMesh { id: slot },
        )
        .unwrap();
    let after_mesh = scene_model(&s);
    let _continued = s
        .evaluate(p.revision, request(0.75, Some(continued.pose_epoch), None))
        .unwrap();
    assert_eq!(scene_model(&s), after_mesh);
    let saved = s
        .save_snapshot(
            s.prepare_save(true).unwrap(),
            d.path().join("portable/live.fbones"),
        )
        .unwrap();
    let Document::Editable { project, .. } =
        open_document(PathBuf::from(saved.path.unwrap())).unwrap()
    else {
        panic!("saved live authored project")
    };
    let mut expected = after_mesh;
    expected.images_root = "./images/".into();
    assert_eq!(*project, expected);
}
#[test]
fn live_continuation_session_errors_do_not_publish_epoch_or_change_cache_history_and_document_switch_rejects(
) {
    let (_d, s, p) = fixture();
    let snapshot = s.evaluate(p.revision, request(0.5, None, None)).unwrap();
    let before = scene_model(&s);
    let cached = || {
        let state = s.lock().unwrap();
        let c = state.evaluation.as_ref().unwrap();
        (
            state.next_pose_epoch,
            serde_json::to_value(&c.snapshot).unwrap(),
            c.physics.clone(),
        )
    };
    let original = cached();
    let local = before
        .rig
        .bones
        .iter()
        .map(|b| LocalPoseView::from(crate::solve::LocalPose::from(b)))
        .collect::<Vec<_>>();
    for req in [
        request(120.6, Some(snapshot.pose_epoch), None),
        request(0.6, Some(snapshot.pose_epoch + 1), None),
        request(
            0.6,
            Some(snapshot.pose_epoch),
            Some(ReplayMotion {
                initial: local.clone(),
                changes: vec![ReplayMotionChange {
                    tick: 30,
                    poses: local,
                }],
            }),
        ),
    ] {
        assert!(s.evaluate(p.revision, req).is_err());
        assert_eq!(cached(), original);
        assert_eq!(scene_model(&s), before);
        assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    }
    let current = s
        .replace(new_document("Other own document".into()).unwrap(), true)
        .unwrap();
    assert_eq!(
        s.evaluate(
            current.revision,
            request(0.6, Some(snapshot.pose_epoch), None)
        )
        .unwrap_err()
        .code,
        "StalePose"
    );
}
