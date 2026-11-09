//! Measured active Local/Local Match and both suffix actions; Physics stays FBones policy.
use super::*;
use crate::solve;
use fbones_format::minimal::scene::{
    PhysicsConstraint, TransformConstraint, TransformFrom, TransformProperty, TransformTo,
};

fn reference() -> serde_json::Value {
    serde_json::from_str(include_str!(
        "../../docs/research/fixtures/transform-match-active-properties-reference.json"
    ))
    .unwrap()
}
fn property(name: &str) -> TransformProperty {
    match name {
        "rotate" => TransformProperty::Rotate,
        "x" => TransformProperty::X,
        "y" => TransformProperty::Y,
        "scaleX" => TransformProperty::ScaleX,
        "scaleY" => TransformProperty::ScaleY,
        "shearY" => TransformProperty::ShearY,
        _ => panic!("unknown own fixture property"),
    }
}
fn active_scene() -> (tempfile::TempDir, Session, ProjectSummary) {
    let (d, s, _) = fixture();
    let mut scene = scene_model(&s);
    let data = reference();
    for (bone, v) in scene
        .rig
        .bones
        .iter_mut()
        .zip(data["bones"].as_array().unwrap())
    {
        bone.name = v["name"].as_str().unwrap().into();
        for (value, key) in [
            (&mut bone.x, "x"),
            (&mut bone.y, "y"),
            (&mut bone.rotation, "rotation"),
            (&mut bone.length, "length"),
            (&mut bone.scale_x, "scaleX"),
            (&mut bone.scale_y, "scaleY"),
            (&mut bone.shear_x, "shearX"),
            (&mut bone.shear_y, "shearY"),
        ] {
            *value = v[key].as_f64().unwrap() as f32;
        }
    }
    scene.constraints = data["constraintsBefore"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| {
            let index = |name: &serde_json::Value| {
                scene
                    .rig
                    .bones
                    .iter()
                    .position(|b| Some(b.name.as_str()) == name.as_str())
                    .unwrap()
            };
            let mut c = TransformConstraint::new(
                v["name"].as_str().unwrap().into(),
                v["bones"].as_array().unwrap().iter().map(index).collect(),
                index(&v["source"]),
            );
            c.local_source = v["localSource"].as_bool().unwrap();
            c.local_target = v["localTarget"].as_bool().unwrap();
            c.additive = v["additive"].as_bool().unwrap();
            c.clamp = v["clamp"].as_bool().unwrap();
            c.offsets = std::array::from_fn(|i| v["offsets"][i].as_f64().unwrap() as f32);
            c.mix = std::array::from_fn(|i| v["mix"][i].as_f64().unwrap() as f32);
            c.properties = v["properties"]
                .as_array()
                .unwrap()
                .iter()
                .map(|from| TransformFrom {
                    property: property(from["property"].as_str().unwrap()),
                    offset: from["offset"].as_f64().unwrap() as f32,
                    to: from["to"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .map(|to| TransformTo {
                            property: property(to["property"].as_str().unwrap()),
                            offset: to["offset"].as_f64().unwrap() as f32,
                            max: to["max"].as_f64().unwrap() as f32,
                            scale: to["scale"].as_f64().unwrap() as f32,
                        })
                        .collect(),
                })
                .collect();
            Constraint::Transform(c)
        })
        .collect();
    let path = d.path().join("active-sampling.fbones");
    std::fs::write(&path, encode_scene(&scene).unwrap()).unwrap();
    let p = s.replace(open_document(path).unwrap(), true).unwrap();
    (d, s, p)
}
fn reopen_scene(
    d: &tempfile::TempDir,
    s: &Session,
    scene: &fbones_format::minimal::scene::SceneProject,
    name: &str,
) -> ProjectSummary {
    let path = d.path().join(format!("{name}.fbones"));
    std::fs::write(&path, encode_scene(scene).unwrap()).unwrap();
    s.replace(open_document(path).unwrap(), true).unwrap()
}
fn cached_state(
    s: &Session,
) -> (
    serde_json::Value,
    solve::PhysicsState,
    solve::Evaluation,
    u64,
) {
    let state = s.lock().unwrap();
    let cache = state.evaluation.as_ref().unwrap();
    (
        serde_json::to_value(&cache.snapshot).unwrap(),
        cache.physics.clone(),
        cache.evaluated.clone(),
        state.next_pose_epoch,
    )
}

#[test]
fn transform_match_prefix_matches_original_active_graph_both_sections() {
    for section in [MatchSection::Properties, MatchSection::Offsets] {
        let (d, s, p) = active_scene();
        let before = scene_model(&s);
        let frozen = snapshot(&s, &p, 0.);
        assert_eq!(frozen.bones[1].applied.x, 50.);
        assert_eq!(frozen.bones[2].applied.x, 65.5);
        let cached = cached_state(&s);
        let id = p.constraints[1]["id"].as_u64().unwrap();
        let changed = s
            .edit_in_pose(p.revision, frozen.pose_epoch, match_edit(id, section))
            .unwrap();
        assert_eq!(
            cached_state(&s),
            cached,
            "matching never publishes a scratch pose, advances Physics, or consumes an epoch"
        );
        let after = scene_model(&s);
        let c = subject(&after, 1);
        if section == MatchSection::Properties {
            let data = reference();
            let bits = c.editor_range_bits();
            for (i, expected) in data["expectedRangeF32Bits"]
                .as_array()
                .unwrap()
                .iter()
                .enumerate()
            {
                assert_eq!(
                    bits[i],
                    Some(expected.as_u64().unwrap() as u32),
                    "original endpoint {i}"
                );
            }
            let values: Vec<_> = c
                .properties
                .iter()
                .map(|p| p.offset)
                .chain(
                    c.properties
                        .iter()
                        .flat_map(|p| p.to.iter().flat_map(|to| [to.offset, to.max, to.scale])),
                )
                .collect();
            assert_eq!(values.len(), 24);
            for (actual, expected) in values
                .iter()
                .zip(data["expectedRuntimeScalars"].as_array().unwrap())
            {
                assert_eq!(
                    actual.to_bits(),
                    expected["f32Bits"].as_u64().unwrap() as u32,
                    "original runtime scalar {}",
                    expected["field"]
                );
            }
        } else {
            let data: serde_json::Value = serde_json::from_str(include_str!(
                "../../docs/research/fixtures/transform-match-active-offset-reference.json"
            ))
            .unwrap();
            for (i, expected) in data["expectedOffsetF32Bits"]
                .as_array()
                .unwrap()
                .iter()
                .enumerate()
            {
                assert_eq!(
                    c.offsets[i].to_bits(),
                    expected.as_u64().unwrap() as u32,
                    "original computed offset {i}"
                );
            }
            let mut permitted = subject(&before, 1).clone();
            permitted.offsets = c.offsets;
            assert_eq!(
                *c, permitted,
                "Offset Match preserves every unrelated field"
            );
        }
        let mut allowed = before.clone();
        allowed.constraints[1] = after.constraints[1].clone();
        assert_eq!(after, allowed);
        let undo = s.edit(changed.revision, RigEdit::Undo).unwrap();
        assert_eq!(scene_model(&s), before);
        assert!(!undo.can_undo);
        let redo = s.edit(undo.revision, RigEdit::Redo).unwrap();
        assert_eq!(scene_model(&s), after);
        let saved = s
            .save_snapshot(
                s.prepare_save(true).unwrap(),
                d.path().join("saved/matched.fbones"),
            )
            .unwrap();
        s.close(false).unwrap();
        s.replace(
            open_document(PathBuf::from(saved.path.unwrap())).unwrap(),
            false,
        )
        .unwrap();
        let mut expected = after;
        expected.images_root = "./images/".into();
        assert_eq!(scene_model(&s), expected);
        assert!(redo.can_undo);
    }
}

#[test]
fn transform_match_sections_include_later_target_as_explicit_policy() {
    for section in [MatchSection::Properties, MatchSection::Offsets] {
        let (d, s, _) = active_scene();
        let mut scene = scene_model(&s);
        let mut suffix = subject(&scene, 0).clone();
        suffix.name = "later-target-drive".into();
        suffix.bones = vec![2];
        suffix.properties[0].to[0].offset = 200.;
        suffix.properties[0].to[0].max = 201.;
        scene.constraints.push(Constraint::Transform(suffix));
        let p = reopen_scene(&d, &s, &scene, "suffix");
        let frozen = snapshot(&s, &p, 0.);
        assert_eq!(frozen.bones[2].applied.x, 211.);
        s.edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            match_edit(p.constraints[1]["id"].as_u64().unwrap(), section),
        )
        .unwrap();
        let after = scene_model(&s);
        let c = subject(&after, 1);
        if section == MatchSection::Properties {
            assert_eq!(c.editor_range_bits()[6], Some(211f32.to_bits()));
        } else {
            assert_eq!(c.offsets[1], 161.);
        }
        // Both measured source-suffix results motivate uniform selected-effect
        // exclusion; this target-driving suffix remains an explicit FBones policy.
    }
}

#[test]
fn transform_match_matches_both_original_suffix_results_without_baking_or_extra_history() {
    for section in [MatchSection::Offsets, MatchSection::Properties] {
        let (d, s, _) = active_scene();
        let data: serde_json::Value = serde_json::from_str(include_str!(
            "../../docs/research/fixtures/transform-match-suffix-offset-reference.json"
        ))
        .unwrap();
        let mut scene = scene_model(&s);
        let recipe = &data["suffix"];
        let mut suffix = subject(
            &scene,
            recipe["cloneConstraintIndex"].as_u64().unwrap() as usize,
        )
        .clone();
        suffix.name = recipe["name"].as_str().unwrap().into();
        suffix.properties[0].to[0].offset = recipe["destinationXOffset"].as_f64().unwrap() as f32;
        suffix.properties[0].to[0].max = recipe["destinationXMax"].as_f64().unwrap() as f32;
        scene.constraints.push(Constraint::Transform(suffix));
        let p = reopen_scene(&d, &s, &scene, "original-offset-suffix");
        let before = scene_model(&s);
        assert!(!p.can_undo);
        let frozen = snapshot(&s, &p, 0.);
        assert_eq!(frozen.bones[1].applied.x, 1000.);
        assert_eq!(frozen.bones[2].applied.x, 65.5);
        let cached = cached_state(&s);
        let changed = s
            .edit_in_pose(
                p.revision,
                frozen.pose_epoch,
                match_edit(p.constraints[1]["id"].as_u64().unwrap(), section),
            )
            .unwrap();
        assert_eq!(cached_state(&s), cached);
        let after = scene_model(&s);
        let actual = subject(&after, 1);
        let mut allowed = before.clone();
        let Constraint::Transform(c) = &mut allowed.constraints[1] else {
            unreachable!()
        };
        if section == MatchSection::Offsets {
            for (value, expected) in actual
                .offsets
                .iter()
                .zip(data["expectedOffsetF32Bits"].as_array().unwrap())
            {
                assert_eq!(value.to_bits(), expected.as_u64().unwrap() as u32);
            }
            assert_ne!(
                actual.offsets[1], 20.,
                "the original disproves prefix-only sampling"
            );
            c.offsets = actual.offsets;
        } else {
            let expected: serde_json::Value = serde_json::from_str(include_str!(
                "../../docs/research/fixtures/transform-match-suffix-properties-reference.json"
            ))
            .unwrap();
            for (value, expected) in actual
                .editor_range_bits()
                .iter()
                .zip(expected["expectedRangeF32Bits"].as_array().unwrap())
            {
                assert_eq!(*value, Some(expected.as_u64().unwrap() as u32));
            }
            let runtime: Vec<_> = actual
                .properties
                .iter()
                .map(|p| p.offset)
                .chain(
                    actual
                        .properties
                        .iter()
                        .flat_map(|p| p.to.iter().flat_map(|t| [t.offset, t.max, t.scale])),
                )
                .collect();
            assert_eq!(runtime.len(), 24);
            for (value, expected) in runtime
                .iter()
                .zip(expected["expectedRuntimeScalars"].as_array().unwrap())
            {
                assert_eq!(
                    value.to_bits(),
                    expected["f32Bits"].as_u64().unwrap() as u32,
                    "original suffix scalar {}",
                    expected["field"]
                );
            }
            assert_eq!(actual.editor_range_bits()[4], Some(989f32.to_bits()));
            c.properties = actual.properties.clone();
            c.editor_ranges = actual.editor_ranges;
        }
        assert_eq!(
            after, allowed,
            "only the selected section's original fields may change"
        );
        let undo = s.edit(changed.revision, RigEdit::Undo).unwrap();
        assert_eq!(scene_model(&s), before);
        assert!(!undo.can_undo, "one Match is one history action");
        s.edit(undo.revision, RigEdit::Redo).unwrap();
        assert_eq!(scene_model(&s), after);
        let saved = s
            .save_snapshot(
                s.prepare_save(true).unwrap(),
                d.path().join("saved/suffix-match.fbones"),
            )
            .unwrap();
        s.close(false).unwrap();
        s.replace(
            open_document(PathBuf::from(saved.path.unwrap())).unwrap(),
            false,
        )
        .unwrap();
        let mut expected = after;
        expected.images_root = "./images/".into();
        assert_eq!(scene_model(&s), expected);
    }
}

#[test]
fn transform_match_reuses_full_layout_physics_without_advancing_or_reenabling_off() {
    for section in [MatchSection::Properties, MatchSection::Offsets] {
        for mode in [EvaluationMode::Replay, EvaluationMode::None] {
            let (d, s, _) = active_scene();
            let mut scene = scene_model(&s);
            let mut physics = PhysicsConstraint::new("earlier-source-gravity".into(), 1);
            physics.y = 1.;
            physics.gravity = 10.;
            physics.strength = 20.;
            scene.constraints.insert(1, Constraint::Physics(physics));
            let mut trailing = PhysicsConstraint::new("later-target-gravity".into(), 2);
            trailing.y = 1.;
            trailing.gravity = 7.;
            scene.constraints.push(Constraint::Physics(trailing));
            let p = reopen_scene(&d, &s, &scene, "physics-prefix");
            let frozen = s
                .evaluate(
                    p.revision,
                    EvaluationRequest {
                        animation_pose: None,
                        constraint_pose: None,
                        draw_order_pose: None,
                        deform_targets: vec![],
                        deform_pose: None,
                        animation_id: None,
                        mode,
                        time: 0.25,
                        motion: None,
                        from_pose_epoch: None,
                    },
                )
                .unwrap();
            let cached = cached_state(&s);
            let full_y = frozen.bones[1].applied.y;
            if matches!(mode, EvaluationMode::None) {
                assert_eq!(full_y, -7.);
            } else {
                assert!((full_y + 7.).abs() > 0.1);
            }
            s.edit_in_pose(
                p.revision,
                frozen.pose_epoch,
                match_edit(p.constraints[2]["id"].as_u64().unwrap(), section),
            )
            .unwrap();
            assert_eq!(
                cached_state(&s),
                cached,
                "scratch evaluation preserves full cached state exactly"
            );
            let after = scene_model(&s);
            let c = subject(&after, 2);
            if section == MatchSection::Properties {
                assert!(
                    (f64::from(c.editor_ranges[2].source_start.unwrap().get()) - (full_y + 13.))
                        .abs()
                        < 0.00001,
                    "earlier Physics pose survives without truncated-layout reset"
                );
                assert_eq!(
                    c.editor_ranges[2]
                        .destination_start
                        .unwrap()
                        .get()
                        .to_bits(),
                    (frozen.bones[2].applied.y as f32).to_bits(),
                    "selected-exclusion policy preserves later target Physics without advancing it"
                );
            } else {
                // Uniform selected exclusion includes suffix Physics as FBones
                // policy; only the Transform-only suffix has original proof.
                let target_y = frozen.bones[2].applied.y;
                assert!(
                    (f64::from(c.offsets[2]) - (target_y - full_y)).abs() < 0.00001,
                    "Offset preserves prior and later Physics poses without advancing state"
                );
            }
            assert_eq!(after.rig, scene.rig);
        }
    }
}

#[test]
fn transform_match_prefix_samples_precise_frozen_authored_and_fails_invalid_prefix_atomically() {
    for section in [MatchSection::Properties, MatchSection::Offsets] {
        let (d, s, p) = active_scene();
        let frozen = snapshot(&s, &p, 0.);
        {
            let mut state = s.lock().unwrap();
            state.evaluation.as_mut().unwrap().evaluated.bones[1]
                .authored
                .y = -7.000000000123;
        }
        let before = identity(&s);
        let sampled = Session::authoring_evaluation(
            &s.lock().unwrap(),
            Some(frozen.pose_epoch),
            p.constraints[1]["id"].as_u64().unwrap(),
        )
        .unwrap();
        assert_eq!(sampled.bones[1].applied.y,-7.000000000123,"scratch starts from precise cached authored values, not public geometry or setup reconstruction");
        assert_eq!(identity(&s), before);
        let mut scene = scene_model(&s);
        let Constraint::Transform(c) = &mut scene.constraints[0] else {
            unreachable!()
        };
        c.local_target = false;
        let p = reopen_scene(&d, &s, &scene, "singular-prefix");
        let frozen = snapshot(&s, &p, 0.);
        // A malformed frozen authored prefix must reject without publishing any
        // partial candidate. Both actions keep the existing world inverse guard.
        {
            let mut state = s.lock().unwrap();
            state.evaluation.as_mut().unwrap().evaluated.bones[0]
                .authored
                .scale_x = 0.;
        }
        let before = identity(&s);
        assert!(s
            .edit_in_pose(
                p.revision,
                frozen.pose_epoch,
                match_edit(p.constraints[1]["id"].as_u64().unwrap(), section)
            )
            .is_err());
        assert_eq!(identity(&s), before);
    }
}

#[test]
fn transform_offset_match_rejects_singular_suffix_without_publishing_scratch_state() {
    let (d, s, _) = active_scene();
    let mut scene = scene_model(&s);
    let mut suffix = subject(&scene, 0).clone();
    suffix.name = "world-target-suffix".into();
    suffix.local_target = false;
    scene.constraints.push(Constraint::Transform(suffix));
    let p = reopen_scene(&d, &s, &scene, "singular-suffix");
    let frozen = snapshot(&s, &p, 0.);
    {
        let mut state = s.lock().unwrap();
        state.evaluation.as_mut().unwrap().evaluated.bones[0]
            .authored
            .scale_x = 0.;
    }
    let before = identity(&s);
    let cached = cached_state(&s);
    assert!(s
        .edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            match_edit(
                p.constraints[1]["id"].as_u64().unwrap(),
                MatchSection::Offsets
            )
        )
        .is_err());
    assert_eq!(identity(&s), before);
    assert_eq!(cached_state(&s), cached);
}
