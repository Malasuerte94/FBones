//! Session transactions over the coherent native evaluated authoring frame.
//! These are FBones policy tests, not additional original-editor observations.
use super::*;
use crate::evaluation::{EvaluationMode, EvaluationRequest};
use crate::transform_match::MatchSection;
use fbones_format::minimal::scene::{encode_scene, TransformEditorRange};
#[path = "scene_transform_match_prefix_tests.rs"]
mod prefix_tests;

fn match_edit(id: u64, section: MatchSection) -> RigEdit {
    RigEdit::MatchTransform { id, section }
}
fn snapshot(s: &Session, p: &ProjectSummary, time: f64) -> crate::evaluation::EvaluationSnapshot {
    s.evaluate(
        p.revision,
        EvaluationRequest {
            animation_pose: None,
            constraint_pose: None,
            draw_order_pose: None,
            deform_targets: vec![],
            deform_pose: None,
            animation_id: None,
            mode: EvaluationMode::Replay,
            time,
            motion: None,
            from_pose_epoch: None,
        },
    )
    .unwrap()
}
fn fixture() -> (tempfile::TempDir, Session, ProjectSummary) {
    let (d, s, mut p) = setup();
    for _ in 0..3 {
        p = add_bone(&s, &p, 0);
    }
    p = s
        .place_images(p.revision, &["A".into()], 0, 10., 20.)
        .unwrap();
    for name in ["Match subject", "Unrelated range cache"] {
        p = command(
            &s,
            &p,
            serde_json::json!({"type":"addConstraint","constraint":{
                "type":"transform","name":name,"source":p.bones[1].id,
                "bones":[p.bones[3].id,p.bones[2].id],
                "localSource":true,"localTarget":true,"mix":[0,0,0,0,0,0],
                "offsets":[7,11,-13,0.2,-0.1,19],
                "properties":[
                    {"property":"x","offset":2,"to":[
                        {"property":"rotate","offset":20,"max":28,"scale":2},
                        {"property":"y","offset":35,"max":47,"scale":3}]},
                    {"property":"scaleY","offset":0.5,"to":[
                        {"property":"scaleX","offset":1,"max":3,"scale":2},
                        {"property":"rotate","offset":20,"max":28,"scale":8}]}]
            }}),
        );
    }
    let mut model = scene_model(&s);
    for (bone, values) in model.rig.bones.iter_mut().skip(1).zip([
        (13., -7., 31., 1.2, 0.8, 17.),
        (70., 35., -25., 0.9, 1.3, -11.),
        (-40., 15., 80., 1.5, 0.6, 9.),
    ]) {
        (
            bone.x,
            bone.y,
            bone.rotation,
            bone.scale_x,
            bone.scale_y,
            bone.shear_y,
        ) = values;
    }
    for (i, c) in model.constraints.iter_mut().enumerate() {
        let Constraint::Transform(c) = c else {
            unreachable!()
        };
        // Unmapped signed zero/subnormal cells must survive even Properties.
        c.editor_ranges[0] =
            TransformEditorRange::from_bits([Some(0x80000000), None, None, None]).unwrap();
        c.editor_ranges[2] =
            TransformEditorRange::from_bits([Some(0x80000001), None, None, None]).unwrap();
        c.editor_ranges[4] = TransformEditorRange::from_bits([None, None, Some(0), None]).unwrap();
        c.editor_ranges[5] =
            TransformEditorRange::from_bits([Some(0x41234567), None, None, Some(0xbf800001)])
                .unwrap();
        if i == 0 {
            c.editor_ranges[1] = TransformEditorRange::from_bits([
                Some(2f32.to_bits()),
                Some(6f32.to_bits()),
                None,
                None,
            ])
            .unwrap();
        }
    }
    let path = d.path().join("match-seed.fbones");
    std::fs::write(&path, encode_scene(&model).unwrap()).unwrap();
    let p = s.replace(open_document(path).unwrap(), true).unwrap();
    assert!(!p.can_undo && !p.dirty && !p.inspection_only);
    (d, s, p)
}
fn subject(
    model: &fbones_format::minimal::scene::SceneProject,
    index: usize,
) -> &fbones_format::minimal::scene::TransformConstraint {
    let Constraint::Transform(c) = &model.constraints[index] else {
        panic!("own Transform")
    };
    c
}
fn identity(
    s: &Session,
) -> (
    serde_json::Value,
    fbones_format::minimal::scene::SceneProject,
    serde_json::Value,
    Option<crate::solve::PhysicsState>,
    Option<crate::solve::Evaluation>,
) {
    let summary = serde_json::to_value(s.summary().unwrap()).unwrap();
    let model = scene_model(s);
    let state = s.lock().unwrap();
    let cache = serde_json::json!({
        "nextEpoch":state.next_pose_epoch,
        "snapshot":state.evaluation.as_ref().map(|e|serde_json::to_value(&e.snapshot).unwrap())
    });
    (
        summary,
        model,
        cache,
        state.evaluation.as_ref().map(|e| e.physics.clone()),
        state.evaluation.as_ref().map(|e| e.evaluated.clone()),
    )
}

#[test]
fn transform_match_two_sections_have_exact_mutation_boundaries_one_history_and_portable_save() {
    for section in [MatchSection::Offsets, MatchSection::Properties] {
        let (d, s, p) = fixture();
        let before = scene_model(&s);
        let id = p.constraints[0]["id"].as_u64().unwrap();
        let frozen = snapshot(&s, &p, 0.);
        let changed = s
            .edit_in_pose(p.revision, frozen.pose_epoch, match_edit(id, section))
            .unwrap();
        assert_eq!(changed.revision, p.revision + 1);
        assert!(changed.dirty && changed.can_undo);
        let after = scene_model(&s);
        let old = subject(&before, 0);
        let new = subject(&after, 0);
        let mut allowed = before.clone();
        allowed.constraints[0] = after.constraints[0].clone();
        assert_eq!(
            after, allowed,
            "bones, attachments, and every unrelated constraint stay exact"
        );
        let mut permitted = old.clone();
        match section {
            MatchSection::Offsets => {
                assert_ne!(old.offsets, new.offsets);
                permitted.offsets = new.offsets;
                assert_eq!(
                    new.offsets[1], -53.,
                    "first stored target is the reversed target, not tree order"
                );
            }
            MatchSection::Properties => {
                assert_ne!(old.properties, new.properties);
                permitted.properties = new.properties.clone();
                permitted.editor_ranges = new.editor_ranges;
                let a = old.editor_range_bits();
                let b = new.editor_range_bits();
                for index in 0..24 {
                    if ![2, 3, 4, 5, 10, 11, 14, 15, 16, 17].contains(&index) {
                        assert_eq!(a[index], b[index], "unmapped cell {index} is untouched");
                    }
                }
                assert_eq!(
                    new.properties[0].to[0].offset, 80.,
                    "first ordered target controls shared Rotate range"
                );
            }
        }
        assert_eq!(*new, permitted);
        let undo = s.edit(changed.revision, RigEdit::Undo).unwrap();
        assert_eq!(scene_model(&s), before);
        assert!(
            !undo.can_undo,
            "one completed Match creates exactly one history entry"
        );
        let redo = s.edit(undo.revision, RigEdit::Redo).unwrap();
        assert_eq!(scene_model(&s), after);
        let saved = s
            .save_snapshot(
                s.prepare_save(true).unwrap(),
                d.path().join("portable/matched.fbones"),
            )
            .unwrap();
        assert!(!saved.dirty);
        s.close(false).unwrap();
        let reopened = s
            .replace(
                open_document(PathBuf::from(saved.path.unwrap())).unwrap(),
                false,
            )
            .unwrap();
        assert!(!reopened.inspection_only && !reopened.dirty);
        let mut expected = after;
        expected.images_root = "./images/".into();
        assert_eq!(scene_model(&s), expected);
        assert_eq!(reopened.constraints, redo.constraints);
    }
}

#[test]
fn transform_match_missing_stale_foreign_and_wrong_constraint_fail_without_state_or_epoch_changes()
{
    let (d, s, p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let frozen = snapshot(&s, &p, 0.);
    let before = identity(&s);
    assert!(s
        .edit(p.revision, match_edit(id, MatchSection::Offsets))
        .is_err());
    assert_eq!(identity(&s), before);
    assert!(s
        .edit_in_pose(
            p.revision,
            frozen.pose_epoch + 1,
            match_edit(id, MatchSection::Properties)
        )
        .is_err());
    assert_eq!(identity(&s), before);
    assert!(s
        .edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            match_edit(u64::MAX, MatchSection::Offsets)
        )
        .is_err());
    assert_eq!(identity(&s), before);
    let moved = s
        .edit(
            p.revision,
            RigEdit::Move {
                id: 0,
                x: 3.,
                y: 4.,
            },
        )
        .unwrap();
    let after_move = identity(&s);
    assert_eq!(
        s.edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            match_edit(id, MatchSection::Offsets)
        )
        .unwrap_err()
        .code,
        "ProjectChanged"
    );
    assert_eq!(identity(&s), after_move);
    assert!(s
        .edit_in_pose(
            moved.revision,
            frozen.pose_epoch,
            match_edit(id, MatchSection::Properties)
        )
        .is_err());
    assert_eq!(identity(&s), after_move);
    let foreign = s
        .replace(
            open_document(d.path().join("match-seed.fbones")).unwrap(),
            true,
        )
        .unwrap();
    let after_open = identity(&s);
    assert!(s
        .edit_in_pose(
            foreign.revision,
            frozen.pose_epoch,
            match_edit(id, MatchSection::Offsets)
        )
        .is_err());
    assert_eq!(identity(&s), after_open);
    let wrong = command(
        &s,
        &foreign,
        serde_json::json!({"type":"updateConstraint","id":id,"constraint":{"type":"physics","name":"wrong kind","bone":foreign.bones[1].id}}),
    );
    let frozen = snapshot(&s, &wrong, 0.);
    let after_kind = identity(&s);
    assert!(s
        .edit_in_pose(
            wrong.revision,
            frozen.pose_epoch,
            match_edit(id, MatchSection::Properties)
        )
        .is_err());
    assert_eq!(identity(&s), after_kind);
}

#[test]
fn transform_match_samples_coherent_applied_local_and_world_with_transient_physics_without_baking()
{
    for local in [true, false] {
        let (d, s, p) = fixture();
        let source_id = p.bones[1].id;
        let target_id = p.bones[3].id;
        let mut p = p;
        for (name, member, offset, rotate) in [
            ("drive source", source_id, 50., 42.),
            ("drive first target", target_id, 100., -20.),
        ] {
            p = command(
                &s,
                &p,
                serde_json::json!({"type":"addConstraint","constraint":{
                    "type":"transform","name":name,"source":0,"bones":[member],"localSource":true,"localTarget":true,
                    "mix":[1,1,0,0,0,0],"properties":[{"property":"x","offset":0,"to":[{"property":"x","offset":offset,"max":offset+1.,"scale":1},{"property":"rotate","offset":rotate,"max":rotate+1.,"scale":1}]}]
                }}),
            );
        }
        command(
            &s,
            &p,
            serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"transient source gravity","bone":source_id,"x":1,"y":1,"gravity":10,"strength":20}}),
        );
        let mut model = scene_model(&s);
        model.rig.bones[0].scale_x = -2.;
        model.rig.bones[0].scale_y = 3.;
        let mut ordered = model.constraints.split_off(2);
        ordered.append(&mut model.constraints);
        model.constraints = ordered;
        let Constraint::Transform(c) = &mut model.constraints[3] else {
            panic!("match after drivers and physics")
        };
        c.local_source = local;
        c.local_target = local;
        let path = d.path().join("evaluated-match.fbones");
        std::fs::write(&path, encode_scene(&model).unwrap()).unwrap();
        let p = s.replace(open_document(path).unwrap(), true).unwrap();
        let before = scene_model(&s);
        let id = p.constraints[3]["id"].as_u64().unwrap();
        let frozen = snapshot(&s, &p, 0.25);
        let src = frozen.bones.iter().find(|b| b.id == source_id).unwrap();
        let dst = frozen.bones.iter().find(|b| b.id == target_id).unwrap();
        assert_eq!(src.authored.x, 13.);
        assert!((src.applied.x - src.authored.x).abs() > 10.);
        assert!((src.applied.rotation - src.authored.rotation).abs() > 5.);
        assert!(
            (src.world.y as f64 - src.authored.y * 3.).abs() > 0.1,
            "the frozen sample includes live gravity"
        );
        let expected_x = if local {
            dst.applied.x - src.applied.x
        } else {
            let state = s.lock().unwrap();
            let frame = &state.evaluation.as_ref().unwrap().evaluated;
            let source = frame.bones[1].world;
            let target = frame.bones[3].world;
            let x = target.x - source.x;
            let y = target.y - source.y;
            (source.d * x - source.c * y) / source.determinant()
        };
        let changed = s
            .edit_in_pose(
                p.revision,
                frozen.pose_epoch,
                match_edit(id, MatchSection::Offsets),
            )
            .unwrap();
        let after = scene_model(&s);
        assert!((subject(&after, 3).offsets[1] as f64 - expected_x).abs() < 1e-4);
        if local {
            let delta =
                (dst.applied.rotation - src.applied.rotation + 180.).rem_euclid(360.) - 180.;
            assert!((subject(&after, 3).offsets[0] as f64 - delta).abs() < 1e-4, "local matching reads cached applied angles under reflection, not authored/world-only substitutes");
        }
        assert_eq!(
            after.rig, before.rig,
            "evaluated/applied/transient motion is never authored into bones"
        );
        let mut allowed = before.clone();
        allowed.constraints[3] = after.constraints[3].clone();
        assert_eq!(after, allowed);
        let undo = s.edit(changed.revision, RigEdit::Undo).unwrap();
        assert_eq!(scene_model(&s), before);
        assert!(!undo.can_undo);
    }
}

#[test]
fn transform_match_same_zero_mix_frame_repeated_operation_is_exact_noop_and_retains_history() {
    for section in [MatchSection::Offsets, MatchSection::Properties] {
        let (_d, s, p) = fixture();
        let id = p.constraints[0]["id"].as_u64().unwrap();
        let frozen = snapshot(&s, &p, 0.);
        let first = s
            .edit_in_pose(p.revision, frozen.pose_epoch, match_edit(id, section))
            .unwrap();
        let frozen = snapshot(&s, &first, 0.);
        let before = identity(&s);
        let second = s
            .edit_in_pose(first.revision, frozen.pose_epoch, match_edit(id, section))
            .unwrap();
        assert_eq!(
            serde_json::to_value(&second).unwrap(),
            serde_json::to_value(&first).unwrap()
        );
        assert_eq!(identity(&s), before);
        let undo = s.edit(second.revision, RigEdit::Undo).unwrap();
        assert!(!undo.can_undo);
    }
}

#[test]
fn transform_match_inherited_singular_world_must_not_become_invertible_after_publication() {
    let (d, s, _p) = fixture();
    let mut model = scene_model(&s);
    let root = &mut model.rig.bones[0];
    root.x = 11.;
    root.y = -9.;
    root.rotation = 23.;
    root.scale_x = 0.;
    root.scale_y = 0.8;
    root.shear_x = 7.;
    root.shear_y = -12.;
    let Constraint::Transform(c) = &mut model.constraints[0] else {
        unreachable!()
    };
    c.local_source = false;
    c.local_target = false;
    let path = d.path().join("inherited-singular-match.fbones");
    std::fs::write(&path, encode_scene(&model).unwrap()).unwrap();
    let p = s.replace(open_document(path).unwrap(), true).unwrap();
    let precise = crate::solve::evaluate(
        &model,
        None,
        &mut crate::solve::PhysicsState::default(),
        crate::solve::StepMode::None,
    )
    .unwrap();
    let exact = precise.bones[1].world;
    let frozen = snapshot(&s, &p, 0.);
    assert_eq!(
        s.lock()
            .unwrap()
            .evaluation
            .as_ref()
            .unwrap()
            .evaluated
            .bones[1]
            .world,
        exact,
        "authoring cache retains the precise solve frame while geometry publishes f32"
    );
    let b = frozen
        .bones
        .iter()
        .find(|b| b.id == p.bones[1].id)
        .unwrap()
        .world;
    let published = crate::solve::Affine {
        x: b.x as f64,
        y: b.y as f64,
        a: b.a as f64,
        b: b.b as f64,
        c: b.c as f64,
        d: b.d as f64,
    };
    println!("inherited singular: precise world={exact:?}; det={:.17e}; inverse_error={:?}; published world={published:?}; det={:.17e}; inverse_error={:?}",exact.determinant(),exact.inverse().err(),published.determinant(),published.inverse().err());
    assert!(
        exact.inverse().is_err(),
        "the inherited source is structurally singular before publication"
    );
    assert!(
        published.inverse().is_ok(),
        "fixture exposes rank loss through independent f32 matrix rounding"
    );
    let before = identity(&s);
    let result = s.edit_in_pose(
        p.revision,
        frozen.pose_epoch,
        match_edit(
            p.constraints[0]["id"].as_u64().unwrap(),
            MatchSection::Offsets,
        ),
    );
    println!(
        "actual Session Match: {:?}",
        result
            .as_ref()
            .map(|p| &p.constraints[0])
            .map_err(|e| (&e.code, &e.message))
    );
    assert!(result.is_err(), "authoring must reject the precise singular frame instead of trusting a falsely full-rank published f32 matrix");
    assert_eq!(
        identity(&s),
        before,
        "undefined inverse fails atomically without authoring/history/cache mutation"
    );
}
