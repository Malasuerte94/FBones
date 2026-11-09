use super::*;
use fbones_format::minimal::{scene::*, MinimalProject};
use serde_json::Value;
fn number(v: &Value, key: &str, default: f64) -> f64 {
    v.get(key).and_then(Value::as_f64).unwrap_or(default)
}
fn flag(v: &Value, key: &str, default: bool) -> bool {
    v.get(key).and_then(Value::as_bool).unwrap_or(default)
}
fn prop(key: &str) -> TransformProperty {
    match key {
        "rotate" => TransformProperty::Rotate,
        "x" => TransformProperty::X,
        "y" => TransformProperty::Y,
        "scaleX" => TransformProperty::ScaleX,
        "scaleY" => TransformProperty::ScaleY,
        "shearY" => TransformProperty::ShearY,
        _ => panic!("Unknown own recipe property"),
    }
}
// Old recipes retain their object-map interpretation. New measured graph
// fixtures use arrays so repeated-destination source order survives parsing.
fn property_entries(value: &Value) -> Vec<(&str, &Value)> {
    if let Some(rows) = value.as_array() {
        rows.iter()
            .map(|row| (row["property"].as_str().unwrap(), row))
            .collect()
    } else {
        value
            .as_object()
            .unwrap()
            .iter()
            .map(|(name, row)| (name.as_str(), row))
            .collect()
    }
}
fn scene(case: &Value) -> SceneProject {
    let mut rig = MinimalProject::new(case["name"].as_str().unwrap().into(), [0; 16]);
    rig.bones.clear();
    let names: Vec<_> = case["bones"]
        .as_array()
        .unwrap()
        .iter()
        .map(|b| b["name"].as_str().unwrap())
        .collect();
    let index = |v: &Value| names.iter().position(|n| Some(*n) == v.as_str()).unwrap();
    for item in case["bones"].as_array().unwrap() {
        let mut bone = Bone::root();
        bone.name = item["name"].as_str().unwrap().into();
        bone.parent = item.get("parent").map(index);
        bone.x = number(item, "x", 0.) as f32;
        bone.y = number(item, "y", 0.) as f32;
        bone.rotation = number(item, "rotation", 0.) as f32;
        bone.length = number(item, "length", 0.) as f32;
        bone.scale_x = number(item, "scaleX", 1.) as f32;
        bone.scale_y = number(item, "scaleY", 1.) as f32;
        bone.shear_x = number(item, "shearX", 0.) as f32;
        bone.shear_y = number(item, "shearY", 0.) as f32;
        rig.bones.push(bone);
    }
    let constraints = case["constraints"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| {
            let name = item["name"].as_str().unwrap().into();
            let bones = || {
                item["bones"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(index)
                    .collect()
            };
            match item["type"].as_str().unwrap() {
                "ik" => {
                    let mut c = IkConstraint::new(name, bones(), index(&item["target"]));
                    c.mix = number(item, "mix", 1.) as f32;
                    c.softness = number(item, "softness", 0.) as f32;
                    c.bend_positive = flag(item, "bendPositive", true);
                    c.compress = flag(item, "compress", false);
                    c.stretch = flag(item, "stretch", false);
                    Constraint::Ik(c)
                }
                "transform" => {
                    let mut c = TransformConstraint::new(name, bones(), index(&item["source"]));
                    c.local_source = flag(item, "localSource", false);
                    c.local_target = flag(item, "localTarget", false);
                    c.additive = flag(item, "additive", false);
                    c.clamp = flag(item, "clamp", false);
                    for (i, k) in ["rotation", "x", "y", "scaleX", "scaleY", "shearY"]
                        .iter()
                        .enumerate()
                    {
                        c.offsets[i] = number(item, k, 0.) as f32;
                    }
                    for (i, k) in [
                        "mixRotate",
                        "mixX",
                        "mixY",
                        "mixScaleX",
                        "mixScaleY",
                        "mixShearY",
                    ]
                    .iter()
                    .enumerate()
                    {
                        c.mix[i] = number(item, k, 1.) as f32;
                    }
                    c.properties = property_entries(&item["properties"])
                        .into_iter()
                        .map(|(k, v)| TransformFrom {
                            property: prop(k),
                            offset: number(v, "offset", 0.) as f32,
                            to: property_entries(&v["to"])
                                .into_iter()
                                .map(|(k, v)| TransformTo {
                                    property: prop(k),
                                    offset: number(v, "offset", 0.) as f32,
                                    max: number(v, "max", 1.) as f32,
                                    scale: number(v, "scale", 1.) as f32,
                                })
                                .collect(),
                        })
                        .collect();
                    Constraint::Transform(c)
                }
                "physics" => {
                    let mut c = PhysicsConstraint::new(name, index(&item["bone"]));
                    c.x = number(item, "x", 0.) as f32;
                    c.y = number(item, "y", 0.) as f32;
                    c.scale_x = number(item, "scaleX", 0.) as f32;
                    c.angular = PhysicsAngular::from_effective(
                        number(item, "rotate", 0.) as f32,
                        number(item, "shearX", 0.) as f32,
                    )
                    .unwrap();
                    c.step = (1. / number(item, "fps", 60.)) as f32;
                    c.inertia = number(item, "inertia", 0.5) as f32;
                    c.strength = number(item, "strength", 100.) as f32;
                    c.damping = number(item, "damping", 0.85) as f32;
                    c.mass = number(item, "mass", 1.) as f32;
                    c.wind = number(item, "wind", 0.) as f32;
                    c.gravity = number(item, "gravity", 0.) as f32;
                    c.mix = number(item, "mix", 1.) as f32;
                    c.limit = number(item, "limit", 5000.) as f32;
                    Constraint::Physics(c)
                }
                _ => panic!("Unknown own recipe"),
            }
        })
        .collect();
    SceneProject {
        wire: None,
        audio_root: "./audio".into(),
        events: vec![],
        editor_flag_53: false,
        fps: 30.,
        animations: vec![fbones_format::minimal::scene::Animation::new(
            "animation".into(),
        )],
        rig,
        images_root: String::new(),
        slots: vec![],
        attachment_order: vec![],
        attachment_sequences: vec![],
        attachment_colors: vec![],
        slot_dark_colors: vec![],
        constraints,
    }
}
fn corpus() -> Value {
    serde_json::from_str(include_str!("oracle.json")).unwrap()
}
fn assert_markers(
    scene: &SceneProject,
    frame: &Evaluation,
    expected: &Value,
    position_tolerance: f64,
    basis_tolerance: f64,
) {
    for (name, values) in expected["bones"].as_object().unwrap() {
        let i = scene
            .rig
            .bones
            .iter()
            .position(|b| b.name == *name)
            .unwrap();
        let w = frame.bones[i].world;
        for (j, actual) in [w.x, w.y, w.a, w.b, w.c, w.d].iter().enumerate() {
            let wanted = values[j].as_f64().unwrap();
            let tolerance = if j < 2 {
                position_tolerance
            } else {
                basis_tolerance
            };
            assert!(
                (actual - wanted).abs() < tolerance,
                "{} / {} / channel{}: {} != {} (tol{})",
                scene.rig.name,
                name,
                j,
                actual,
                wanted,
                tolerance
            );
        }
    }
}
#[test]
fn original_static_ik_transform_and_mixed_order_numeric_markers() {
    let corpus = corpus();
    let mut count = 0;
    for case in corpus["cases"].as_array().unwrap() {
        if case["expected"].as_array().unwrap().len() != 1 {
            continue;
        }
        let scene = scene(case);
        let original = scene.clone();
        let frame = evaluate(&scene, None, &mut PhysicsState::default(), StepMode::None).unwrap();
        assert_markers(&scene, &frame, &case["expected"][0], 0.45, 0.009);
        assert_eq!(scene, original);
        count += 1;
    }
    assert_eq!(count, 37);
}
#[test]
fn original_active_transform_two_targets_and_ordered_fan_in_numeric_markers() {
    let data: Value = serde_json::from_str(include_str!("active_graph_oracle.json")).unwrap();
    let bounds = &data["bounds"];
    let origin = bounds["worldOrigin"].as_f64().unwrap();
    let basis = bounds["worldBasis"].as_f64().unwrap();
    let endpoint = bounds["worldSixteenUnitPatchEndpoint"].as_f64().unwrap();
    assert_eq!((origin, basis, endpoint), (0.25, 0.009, 0.25));
    let cases = data["cases"].as_array().unwrap();
    assert_eq!(cases.len(), 2);
    let mut targets_checked = 0;
    for (case_index, case) in cases.iter().enumerate() {
        let scene = scene(case);
        let authored = scene.clone();
        let Constraint::Transform(constraint) = &scene.constraints[0] else {
            panic!("Own active graph must contain a Transform constraint")
        };
        assert_eq!(scene.constraints.len(), 1);
        assert_eq!(constraint.bones.len(), 2);
        assert_eq!(
            constraint
                .properties
                .iter()
                .map(|row| row.property)
                .collect::<Vec<_>>(),
            [TransformProperty::X, TransformProperty::ScaleY]
        );
        assert_eq!(
            constraint.properties[0]
                .to
                .iter()
                .map(|to| to.property)
                .collect::<Vec<_>>(),
            [TransformProperty::Rotate, TransformProperty::Y]
        );
        let mut second_destinations = vec![TransformProperty::ScaleX];
        if case_index == 1 {
            second_destinations.push(TransformProperty::Rotate);
        }
        assert_eq!(
            constraint.properties[1]
                .to
                .iter()
                .map(|to| to.property)
                .collect::<Vec<_>>(),
            second_destinations
        );
        let expected = &case["expected"][0];
        assert_eq!(expected["bones"].as_object().unwrap().len(), 2);
        let frame = evaluate(&scene, None, &mut PhysicsState::default(), StepMode::None).unwrap();
        assert_markers(&scene, &frame, expected, origin, basis);
        for &index in &constraint.bones {
            let name = &scene.rig.bones[index].name;
            let patches = expected["patches"][name].as_array().unwrap();
            assert_eq!(patches.len(), 3);
            for (local, wanted) in [(0., 0.), (16., 0.), (0., 16.)].into_iter().zip(patches) {
                let actual = frame.bones[index].world.point(local.0, local.1);
                for (axis, value) in [actual.0, actual.1].into_iter().enumerate() {
                    assert!(
                        (value - wanted[axis].as_f64().unwrap()).abs() <= endpoint,
                        "{} / {} / patch {:?} axis{}: {} != {}",
                        scene.rig.name,
                        name,
                        local,
                        axis,
                        value,
                        wanted[axis]
                    );
                }
            }
            targets_checked += 1;
        }
        assert_eq!(scene, authored);
        for (bone, evaluated) in scene.rig.bones.iter().zip(&frame.bones) {
            assert_eq!(evaluated.authored, LocalPose::from(bone));
        }
    }
    assert_eq!(targets_checked, 4);
}
#[test]
fn affine_roundtrip_retains_reflections_and_shear_and_rejects_singular() {
    for sx in [-2., 2.] {
        for sy in [-0.7, 0.7] {
            let p = LocalPose {
                x: 13.,
                y: -17.,
                rotation: 37.,
                scale_x: sx,
                scale_y: sy,
                shear_x: 12.,
                shear_y: -23.,
            };
            let world = p.affine();
            let parent = LocalPose {
                rotation: -19.,
                scale_x: 1.7,
                scale_y: 0.6,
                ..p
            }
            .affine();
            let local = parent.inverse().unwrap().compose(parent.compose(world));
            let restored = LocalPose::from_affine(local, p).unwrap();
            for (a, b) in [local.a, local.b, local.c, local.d].into_iter().zip([
                restored.affine().a,
                restored.affine().b,
                restored.affine().c,
                restored.affine().d,
            ]) {
                assert!((a - b).abs() < 1e-10)
            }
        }
    }
    assert_eq!(
        Affine {
            a: 0.,
            b: 0.,
            ..Affine::IDENTITY
        }
        .inverse(),
        Err(SolveError::SingularTransform)
    );
}
#[test]
fn invalid_pose_graph_time_and_singular_constraints_do_not_commit_state() {
    let c = corpus();
    let mut scene = scene(&c["cases"][1]);
    let mut state = PhysicsState::default();
    let before = state.clone();
    assert_eq!(
        evaluate(&scene, Some(&[]), &mut state, StepMode::None),
        Err(SolveError::InvalidPoseCount)
    );
    let mut poses: Vec<_> = scene.rig.bones.iter().map(LocalPose::from).collect();
    poses[1].x = f64::NAN;
    assert_eq!(
        evaluate(&scene, Some(&poses), &mut state, StepMode::None),
        Err(SolveError::NonFinite)
    );
    assert_eq!(
        evaluate(
            &scene,
            None,
            &mut state,
            StepMode::Update {
                time: f64::INFINITY
            }
        ),
        Err(SolveError::InvalidTime)
    );
    scene.rig.bones[0].scale_x = 0.;
    assert_eq!(
        evaluate(&scene, None, &mut state, StepMode::None),
        Err(SolveError::SingularTransform)
    );
    assert_eq!(state, before);
    scene.rig.bones[0].parent = Some(1);
    assert_eq!(
        evaluate(&scene, None, &mut state, StepMode::None),
        Err(SolveError::InvalidGraph)
    );
}

fn animated_poses(scene: &SceneProject, case: &Value, sequence: &str, time: f64) -> Vec<LocalPose> {
    let mut poses: Vec<_> = scene.rig.bones.iter().map(LocalPose::from).collect();
    if let Some(bones) = case["animations"][sequence]["bones"].as_object() {
        for (name, timelines) in bones {
            let index = scene
                .rig
                .bones
                .iter()
                .position(|b| b.name == *name)
                .unwrap();
            if let Some(keys) = timelines["translate"].as_array() {
                let mut value = (0., 0.);
                for (k, key) in keys.iter().enumerate() {
                    let start = number(key, "time", 0.);
                    if start > time + 1e-9 {
                        break;
                    }
                    value = (number(key, "x", 0.), number(key, "y", 0.));
                    if let Some(next) = keys.get(k + 1) {
                        let end = number(next, "time", 0.);
                        if time + 1e-9 < end
                            && end > start
                            && key["curve"].as_str() != Some("stepped")
                        {
                            let f = (time - start) / (end - start);
                            value.0 += (number(next, "x", 0.) - value.0) * f;
                            value.1 += (number(next, "y", 0.) - value.1) * f;
                        }
                    }
                }
                poses[index].x += value.0;
                poses[index].y += value.1;
            }
        }
    }
    poses
}
fn compare_physics_oracle(teleport_only: bool) {
    let data = corpus();
    let mut total = 0;
    let mut failures = vec![];
    for case in data["cases"].as_array().unwrap() {
        let expected = case["expected"].as_array().unwrap();
        if expected.len() == 1
            || case["name"]
                .as_str()
                .unwrap()
                .starts_with("physics-teleport")
                != teleport_only
        {
            continue;
        }
        let scene = scene(case);
        let h = scene
            .constraints
            .iter()
            .find_map(|c| {
                if let Constraint::Physics(p) = c {
                    Some(p.step as f64)
                } else {
                    None
                }
            })
            .unwrap();
        let mut state = PhysicsState::default();
        let mut sequence = String::new();
        let mut clock = 0.;
        let mut evaluation = None;
        let mut worst_position: f64 = 0.;
        let mut worst_basis: f64 = 0.;
        for item in expected {
            let current = item["sequence"].as_str().unwrap();
            if sequence != current {
                sequence = current.into();
                clock = 0.;
                let poses = animated_poses(&scene, case, current, 0.);
                evaluation = Some(
                    evaluate(
                        &scene,
                        Some(&poses),
                        &mut state,
                        StepMode::Reset { time: 0. },
                    )
                    .unwrap(),
                );
            }
            // The original PNG exporter has a one-fixed-step startup interval
            // before visible integration. This oracle adapter models that
            // observed pipeline, separately from evaluate's explicit clock API.
            let sample = (number(item, "time", 0.) - h).max(0.);
            while sample - clock > 1e-10 {
                clock = (clock + 1. / 60.).min(sample);
                let poses = animated_poses(&scene, case, current, clock + h);
                evaluation = Some(
                    evaluate(
                        &scene,
                        Some(&poses),
                        &mut state,
                        StepMode::Update { time: clock },
                    )
                    .unwrap(),
                );
            }
            let frame = evaluation.as_ref().unwrap();
            for (name, values) in item["bones"].as_object().unwrap() {
                let i = scene
                    .rig
                    .bones
                    .iter()
                    .position(|b| b.name == *name)
                    .unwrap();
                let w = frame.bones[i].world;
                for (j, actual) in [w.x, w.y, w.a, w.b, w.c, w.d].iter().enumerate() {
                    let delta = (actual - values[j].as_f64().unwrap()).abs();
                    if j < 2 {
                        worst_position = worst_position.max(delta)
                    } else {
                        worst_basis = worst_basis.max(delta)
                    }
                }
            }
            total += 1;
        }
        eprintln!(
            "{} position={} basis={}",
            scene.rig.name, worst_position, worst_basis
        );
        if worst_position > 0.25 || worst_basis > 0.012 {
            failures.push((scene.rig.name, worst_position, worst_basis));
        }
    }
    assert_eq!(total, if teleport_only { 120 } else { 990 });
    assert!(
        failures.is_empty(),
        "Physics oracle divergences: {failures:?}"
    );
}
#[test]
fn physics_pose_reset_reverse_time_step_bounds_and_failure_rollback() {
    let data = corpus();
    let scene = scene(
        data["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| c["name"] == "physics-y-trajectory")
            .unwrap(),
    );
    let mut state = PhysicsState::default();
    let reset = evaluate(&scene, None, &mut state, StepMode::Reset { time: 0. }).unwrap();
    let mut previous = reset;
    for i in 1..=30 {
        previous = evaluate(
            &scene,
            None,
            &mut state,
            StepMode::Update {
                time: i as f64 / 60.,
            },
        )
        .unwrap();
    }
    assert!(previous.bones[1].world.y < -25.);
    let before = state.clone();
    let pose = evaluate(&scene, None, &mut state, StepMode::Pose).unwrap();
    assert_eq!(state, before);
    assert_eq!(pose, previous);
    assert_eq!(
        evaluate(&scene, None, &mut state, StepMode::Update { time: 1000. }),
        Err(SolveError::StepLimit)
    );
    assert_eq!(state, before);
    let reset = evaluate(&scene, None, &mut state, StepMode::Update { time: 0. }).unwrap();
    assert_eq!(reset.bones[1].world.y, 0.);
    let original = scene.clone();
    let mut invalid = scene;
    let Constraint::Physics(c) = &mut invalid.constraints[0] else {
        unreachable!()
    };
    c.mass = 0.;
    let before = state.clone();
    assert_eq!(
        evaluate(&invalid, None, &mut state, StepMode::Update { time: 0.1 }),
        Err(SolveError::InvalidConstraint)
    );
    assert_eq!(state, before);
    assert_ne!(original, invalid);
}

#[test]
fn original_physics_numeric_channels_order_reset_and_sampling() {
    compare_physics_oracle(false)
}
#[test]
#[ignore = "Original PNG exporter moving-parent impulse recovery phase unresolved; direct inertia/limit math tested separately. See CONSTRAINT-SOLVERS-4.3.26.md."]
fn original_physics_teleport_export_clock_unresolved() {
    compare_physics_oracle(true)
}

#[test]
fn moving_parent_impulse_and_limit_are_seconds_based_and_pose_is_repeatable() {
    let data = corpus();
    for (name, wanted, tolerance) in [
        ("physics-teleport-free", 40., 0.125),
        ("physics-teleport-limited", 78.375, 0.125),
    ] {
        let scene = scene(
            data["cases"]
                .as_array()
                .unwrap()
                .iter()
                .find(|c| c["name"] == name)
                .unwrap(),
        );
        let Constraint::Physics(c) = &scene.constraints[0] else {
            unreachable!()
        };
        let h = c.step as f64;
        let mut state = PhysicsState::default();
        evaluate(&scene, None, &mut state, StepMode::Reset { time: 0. }).unwrap();
        let mut authored: Vec<_> = scene.rig.bones.iter().map(LocalPose::from).collect();
        authored[1].x += 80.;
        let result = evaluate(
            &scene,
            Some(&authored),
            &mut state,
            StepMode::Update { time: h },
        )
        .unwrap();
        let upper = scene
            .rig
            .bones
            .iter()
            .position(|b| b.name == "upper")
            .unwrap();
        let expected = 80. - 40_f64.min(c.limit as f64 * h);
        assert!((result.bones[upper].world.x - expected).abs() < 1e-10);
        assert!(
            (result.bones[upper].world.x - wanted).abs() < tolerance,
            "Original initial impulse centroid"
        );
        let before = state.clone();
        for _ in 0..3 {
            let posed = evaluate(&scene, Some(&authored), &mut state, StepMode::Pose).unwrap();
            assert_eq!(posed, result);
            assert_eq!(state, before);
        }
        assert_eq!(
            result.bones[upper].authored,
            LocalPose::from(&scene.rig.bones[upper])
        );
    }
}
#[test]
fn late_constraint_failure_rolls_back_advanced_physics_and_leaves_authored_scene() {
    let data = corpus();
    let mut scene = scene(
        data["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| c["name"] == "physics-y-trajectory")
            .unwrap(),
    );
    let mut state = PhysicsState::default();
    evaluate(&scene, None, &mut state, StepMode::Reset { time: 0. }).unwrap();
    let mut invalid = TransformConstraint::new("invalid".into(), vec![1], 0);
    invalid.properties[0].to[0].scale = f32::NAN;
    scene.constraints.push(Constraint::Transform(invalid));
    let original = scene.clone();
    let before = state.clone();
    assert_eq!(
        evaluate(&scene, None, &mut state, StepMode::Update { time: 0.1 }),
        Err(SolveError::InvalidConstraint)
    );
    assert_eq!(state, before);
    // NaN cannot use PartialEq; compare untouched scalar bits and inventory.
    assert_eq!(scene.rig, original.rig);
    let Constraint::Transform(c) = &scene.constraints[1] else {
        unreachable!()
    };
    assert_eq!(c.properties[0].to[0].scale.to_bits(), f32::NAN.to_bits());
}
#[test]
fn two_link_nonuniform_and_reflected_local_bones_reach_target_without_double_transform() {
    let data = corpus();
    let baseline = scene(&data["cases"][2]);
    for (sx, sy) in [(1.7, 0.6), (-1.3, 0.8), (1.2, -0.7), (-1.2, -0.7)] {
        for positive in [true, false] {
            let mut scene = baseline.clone();
            scene.rig.bones[1].scale_x = sx;
            scene.rig.bones[1].scale_y = sy;
            scene.rig.bones[3].x = 20.;
            scene.rig.bones[3].y = 0.;
            let Constraint::Ik(c) = &mut scene.constraints[0] else {
                unreachable!()
            };
            c.bend_positive = positive;
            let frame =
                evaluate(&scene, None, &mut PhysicsState::default(), StepMode::None).unwrap();
            let tip = frame.bones[2].world.point(60., 0.);
            assert!(
                (tip.0 - 20.).hypot(tip.1) < 1e-7,
                "sx={sx} sy={sy} bend={positive}, {tip:?}"
            );
            assert_eq!(frame.bones[1].authored.scale_x, sx as f64);
            assert_eq!(scene.rig.bones[1].rotation, 0.);
        }
    }
}

#[test]
fn inactive_transform_is_exact_noop_even_with_singular_world_and_invalid_data_still_rejected() {
    let data = corpus();
    let mut scene = scene(
        data["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| c["name"] == "transform-rotate-evaluated")
            .unwrap(),
    );
    scene.rig.bones[1].scale_x = 0.;
    let Constraint::Transform(c) = &mut scene.constraints[0] else {
        unreachable!()
    };
    c.mix = [0.; 6];
    let inactive = evaluate(&scene, None, &mut PhysicsState::default(), StepMode::None).unwrap();
    let constraints = std::mem::take(&mut scene.constraints);
    let bare = evaluate(&scene, None, &mut PhysicsState::default(), StepMode::None).unwrap();
    assert_eq!(inactive, bare);
    scene.constraints = constraints;
    let Constraint::Transform(c) = &mut scene.constraints[0] else {
        unreachable!()
    };
    c.properties[0].to[0].scale = f32::NAN;
    assert_eq!(
        evaluate(&scene, None, &mut PhysicsState::default(), StepMode::None),
        Err(SolveError::InvalidConstraint)
    );
}

#[test]
fn ik_target_subtree_rejection_is_independent_of_order_and_rolls_back_physics() {
    let data = corpus();
    let mut project = scene(
        data["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| c["name"] == "physics-y-trajectory")
            .unwrap(),
    );
    let mut state = PhysicsState::default();
    evaluate(&project, None, &mut state, StepMode::Reset { time: 0.0 }).unwrap();
    let before = state.clone();
    for target in [1, 2] {
        for mix in [0.0, 1.0] {
            let mut invalid = project.clone();
            let mut c = IkConstraint::new("feedback".into(), vec![1], target);
            c.mix = mix;
            invalid.constraints.push(Constraint::Ik(c));
            assert_eq!(
                evaluate(
                    &invalid,
                    None,
                    &mut state,
                    StepMode::Update { time: 1.0 / 60.0 }
                ),
                Err(SolveError::InvalidConstraint)
            );
            assert_eq!(state, before);
        }
    }
    project.constraints.push(Constraint::Ik(IkConstraint::new(
        "ancestor".into(),
        vec![1],
        0,
    )));
    evaluate(
        &project,
        None,
        &mut state,
        StepMode::Update { time: 1.0 / 60.0 },
    )
    .unwrap();
}

#[test]
fn properties_prefix_keeps_complete_validation_and_layout_and_rejects_invalid_bounds_atomically() {
    let data = corpus();
    let mut project = scene(
        data["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| c["name"] == "physics-y-trajectory")
            .unwrap(),
    );
    let mut state = PhysicsState::default();
    evaluate(&project, None, &mut state, StepMode::Reset { time: 0. }).unwrap();
    evaluate(&project, None, &mut state, StepMode::Update { time: 0.25 }).unwrap();
    let before = state.clone();
    let full = evaluate(&project, None, &mut state, StepMode::Pose).unwrap();
    let limit = project.constraints.len();
    assert_eq!(
        evaluate_prefix(&project, None, &mut state, StepMode::Pose, limit).unwrap(),
        full
    );
    assert_eq!(state, before);
    let empty = evaluate_prefix(&project, None, &mut state, StepMode::Pose, 0).unwrap();
    assert_eq!(
        empty.bones[1].applied,
        LocalPose::from(&project.rig.bones[1])
    );
    assert_eq!(
        state, before,
        "empty prefix still retains the full Physics layout"
    );
    assert_eq!(
        evaluate_prefix(&project, None, &mut state, StepMode::Pose, limit + 1),
        Err(SolveError::InvalidConstraint)
    );
    assert_eq!(state, before);
    project.constraints.push(Constraint::Ik(IkConstraint::new(
        "invalid-unapplied-suffix".into(),
        vec![1],
        usize::MAX,
    )));
    assert_eq!(
        evaluate_prefix(&project, None, &mut state, StepMode::Pose, 0),
        Err(SolveError::InvalidConstraint)
    );
    assert_eq!(
        state, before,
        "unapplied suffix validation fails before touching caller Physics"
    );
}

#[test]
fn properties_prefix_rejects_unapplied_invalid_transform_physics_and_ik_metadata() {
    let data = corpus();
    let scene = scene(
        data["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| c["name"] == "physics-y-trajectory")
            .unwrap(),
    );
    let mut invalid_transform =
        TransformConstraint::new("invalid-source".into(), vec![1], usize::MAX);
    let mut invalid_physics = PhysicsConstraint::new("invalid-step".into(), 1);
    invalid_physics.step = 0.;
    let mut invalid_ik = IkConstraint::new("invalid-softness".into(), vec![1], 0);
    invalid_ik.softness = f32::NAN;
    let mut bad = vec![
        Constraint::Transform(invalid_transform.clone()),
        Constraint::Physics(invalid_physics.clone()),
        Constraint::Ik(invalid_ik),
    ];
    invalid_transform.source = 0;
    invalid_transform.offsets[1] = f32::NAN;
    bad.push(Constraint::Transform(invalid_transform));
    invalid_physics.step = 1. / 60.;
    invalid_physics.bone = usize::MAX;
    bad.push(Constraint::Physics(invalid_physics));
    for constraint in bad {
        let mut malformed = scene.clone();
        malformed.constraints.push(constraint);
        for mode in [StepMode::None, StepMode::Pose] {
            let mut state = PhysicsState::default();
            evaluate(&scene, None, &mut state, StepMode::Reset { time: 0. }).unwrap();
            let before = state.clone();
            assert_eq!(
                evaluate(&malformed, None, &mut state, mode),
                Err(SolveError::InvalidConstraint)
            );
            assert_eq!(state, before);
            assert_eq!(
                evaluate_prefix(&malformed, None, &mut state, mode, 0),
                Err(SolveError::InvalidConstraint)
            );
            assert_eq!(state, before);
        }
    }
}

#[test]
fn transform_exclusion_keeps_suffix_order_full_physics_layout_and_atomic_validation() {
    let data = corpus();
    let mut project = scene(
        data["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| c["name"] == "physics-y-trajectory")
            .unwrap(),
    );
    let mut selected = TransformConstraint::new("selected-match".into(), vec![1], 0);
    selected.local_source = true;
    selected.local_target = true;
    selected.mix[1] = 1.;
    selected.properties = vec![TransformFrom {
        property: TransformProperty::X,
        offset: 0.,
        to: vec![TransformTo {
            property: TransformProperty::X,
            offset: 100.,
            max: 101.,
            scale: 1.,
        }],
    }];
    let mut suffix = selected.clone();
    suffix.name = "suffix-after-physics".into();
    suffix.mix[1] = 0.5;
    suffix.properties[0].to[0].offset = 200.;
    suffix.properties[0].to[0].max = 201.;
    project
        .constraints
        .insert(0, Constraint::Transform(selected));
    project.constraints.push(Constraint::Transform(suffix));
    let mut state = PhysicsState::default();
    evaluate(&project, None, &mut state, StepMode::Reset { time: 0. }).unwrap();
    evaluate(&project, None, &mut state, StepMode::Update { time: 0.25 }).unwrap();
    let before = state.clone();
    let matched =
        evaluate_excluding_transform(&project, None, &mut state, StepMode::Pose, 0).unwrap();
    let expected_x =
        (f64::from(project.rig.bones[0].x) + 200. + f64::from(project.rig.bones[1].x)) * 0.5;
    assert_eq!(matched.bones[1].applied.x, expected_x);
    assert_eq!(
        state, before,
        "the intervening Physics uses its original indexed state"
    );
    let full = evaluate(&project, None, &mut state, StepMode::Pose).unwrap();
    assert_ne!(full.bones[1].applied.x, matched.bones[1].applied.x);
    assert_eq!(matched.bones[1].applied.y, full.bones[1].applied.y);
    for invalid in [1, project.constraints.len(), usize::MAX] {
        assert_eq!(
            evaluate_excluding_transform(&project, None, &mut state, StepMode::Pose, invalid),
            Err(SolveError::InvalidConstraint)
        );
        assert_eq!(state, before);
    }
    let mut malformed = project.clone();
    let Constraint::Transform(skipped) = &mut malformed.constraints[0] else {
        unreachable!()
    };
    skipped.source = usize::MAX;
    assert_eq!(
        evaluate_excluding_transform(&malformed, None, &mut state, StepMode::Pose, 0),
        Err(SolveError::InvalidConstraint)
    );
    assert_eq!(
        state, before,
        "excluded records still receive full validation"
    );
    let mut malformed = project;
    let Constraint::Transform(suffix) = malformed.constraints.last_mut().unwrap() else {
        unreachable!()
    };
    suffix.offsets[1] = f32::NAN;
    assert_eq!(
        evaluate_excluding_transform(&malformed, None, &mut state, StepMode::Pose, 0),
        Err(SolveError::InvalidConstraint)
    );
    assert_eq!(
        state, before,
        "invalid suffix cannot partially publish Physics"
    );
}
