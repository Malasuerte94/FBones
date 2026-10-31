use super::*;
use crate::solve::{self, PhysicsState, StepMode};
use fbones_format::minimal::{
    scene::{encode_scene, Constraint, TransformEditorRange, TransformFrom, TransformTo},
    Bone, MinimalProject,
};
use serde_json::Value;

fn property(name: &str) -> P {
    match name {
        "rotate" => P::Rotate,
        "x" => P::X,
        "y" => P::Y,
        "scaleX" => P::ScaleX,
        "scaleY" => P::ScaleY,
        "shearY" => P::ShearY,
        _ => panic!("Unknown own property"),
    }
}
fn constraint(v: &Value, scene: &SceneProject) -> TransformConstraint {
    let index = |name: &Value| {
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
        .map(|row| TransformFrom {
            property: property(row["property"].as_str().unwrap()),
            offset: row["offset"].as_f64().unwrap() as f32,
            to: row["to"]
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
    for (i, row) in c.editor_ranges.iter_mut().enumerate() {
        *row = TransformEditorRange::from_bits(std::array::from_fn(|j| {
            v["rangeCache"][i * 4 + j]
                .as_f64()
                .map(|v| (v as f32).to_bits())
        }))
        .unwrap();
    }
    c
}
fn scene(case: &Value) -> SceneProject {
    let mut rig = MinimalProject::new(case["name"].as_str().unwrap().into(), [0; 16]);
    rig.bones.clear();
    for row in case["bones"].as_array().unwrap() {
        let number = |key: &str| row[key].as_f64().unwrap() as f32;
        let mut b = Bone::root();
        b.name = row["name"].as_str().unwrap().into();
        b.parent = row.get("parent").map(|name| {
            rig.bones
                .iter()
                .position(|b| Some(b.name.as_str()) == name.as_str())
                .unwrap()
        });
        b.length = number("length");
        b.x = number("x");
        b.y = number("y");
        b.rotation = number("rotation");
        b.scale_x = number("scaleX");
        b.scale_y = number("scaleY");
        b.shear_x = number("shearX");
        b.shear_y = number("shearY");
        rig.bones.push(b);
    }
    let mut scene = SceneProject {
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
        constraints: vec![],
    };
    scene
        .constraints
        .push(Constraint::Transform(constraint(&case["before"], &scene)));
    scene
}
fn c(scene: &SceneProject) -> &TransformConstraint {
    match &scene.constraints[0] {
        Constraint::Transform(c) => c,
        _ => panic!("Own transform fixture"),
    }
}
fn with(scene: &SceneProject, c: &TransformConstraint) -> SceneProject {
    let mut result = scene.clone();
    result.constraints = vec![Constraint::Transform(c.clone())];
    result
}
fn sampled(scene: &SceneProject) -> Evaluation {
    // Match uses the precise private native frame. Public geometry retains its
    // separate f32 projection and must not be reconstructed for authoring.
    solve::evaluate(scene, None, &mut PhysicsState::default(), StepMode::None).unwrap()
}
fn inventory(c: &TransformConstraint) -> Vec<(P, Vec<P>)> {
    c.properties
        .iter()
        .map(|row| (row.property, row.to.iter().map(|to| to.property).collect()))
        .collect()
}
fn preservation(
    scene: &SceneProject,
    old: &TransformConstraint,
    next: &TransformConstraint,
    section: MatchSection,
) {
    let mut restored = next.clone();
    match section {
        MatchSection::Offsets => restored.offsets = old.offsets,
        MatchSection::Properties => {
            restored.properties = old.properties.clone();
            restored.editor_ranges = old.editor_ranges;
        }
    }
    assert_eq!(
        encode_scene(&with(scene, &restored)).unwrap(),
        encode_scene(&with(scene, old)).unwrap()
    );
    assert_eq!(inventory(next), inventory(old));
    if section == MatchSection::Properties {
        let old_bits = old.editor_range_bits();
        let new_bits = next.editor_range_bits();
        for p in P::ALL {
            let i = p.index();
            if !old.properties.iter().any(|row| row.property == p) {
                assert_eq!(old_bits[i * 4..i * 4 + 2], new_bits[i * 4..i * 4 + 2]);
            }
            if !old
                .properties
                .iter()
                .flat_map(|row| &row.to)
                .any(|to| to.property == p)
            {
                assert_eq!(
                    old_bits[i * 4 + 2..i * 4 + 4],
                    new_bits[i * 4 + 2..i * 4 + 4]
                );
            }
        }
    }
}
fn effects(scene: &SceneProject, expected: &TransformConstraint, actual: &TransformConstraint) {
    let evaluate = |c: &TransformConstraint| {
        let mut c = c.clone();
        c.mix = [1.; 6];
        solve::evaluate(
            &with(scene, &c),
            None,
            &mut PhysicsState::default(),
            StepMode::None,
        )
        .unwrap()
    };
    let reference = evaluate(expected);
    let computed = evaluate(actual);
    for &index in &expected.bones {
        let a = reference.bones[index].world;
        let b = computed.bones[index].world;
        assert!(
            (a.x - b.x).abs() <= 0.25 && (a.y - b.y).abs() <= 0.25,
            "{} origin",
            scene.rig.name
        );
        for (a, b) in [a.a, a.b, a.c, a.d].into_iter().zip([b.a, b.b, b.c, b.d]) {
            assert!(
                (a - b).abs() <= 0.009,
                "{} basis: {} != {}",
                scene.rig.name,
                a,
                b
            );
        }
        for (x, y) in [(0., 0.), (16., 0.), (0., 16.)] {
            let (ax, ay) = a.point(x, y);
            let (bx, by) = b.point(x, y);
            assert!(
                (ax - bx).abs() <= 0.25 && (ay - by).abs() <= 0.25,
                "{} endpoint",
                scene.rig.name
            );
        }
    }
}
fn runtime_input(frame: &Evaluation, c: &TransformConstraint, property: P) -> f64 {
    let b = frame.bones[c.source];
    let p = b.applied;
    let w = b.world;
    let i = property.index();
    if c.local_source {
        return [p.rotation, p.x, p.y, p.scale_x, p.scale_y, p.shear_y][i]
            + f64::from(c.offsets[i]);
    }
    let (x, y) = w.point(f64::from(c.offsets[1]), f64::from(c.offsets[2]));
    [
        (w.heading()
            + if w.determinant() > 0. {
                f64::from(c.offsets[0])
            } else {
                -f64::from(c.offsets[0])
            })
        .rem_euclid(360.),
        x,
        y,
        w.scale_x() + f64::from(c.offsets[3]),
        w.scale_y() + f64::from(c.offsets[4]),
        w.d.atan2(w.c).to_degrees() - w.heading() - 90. + f64::from(c.offsets[5]),
    ][i]
}

#[test]
fn ten_original_actions_mutations_and_downstream_effects_use_actual_after_fields() {
    let data: Value = serde_json::from_str(include_str!("own_match_oracle.json")).unwrap();
    assert_eq!(data["referenceVersion"], "4.3.26");
    let cases = data["cases"].as_array().unwrap();
    assert_eq!(cases.len(), 10);
    let mut spaces = [false; 4];
    let mut routes = 0;
    let mut probes = 0;
    let mut scalar_count = 0;
    let mut exact_scalars = 0;
    let mut maximum_scalar_error = 0_f64;
    let mut record = |actual: f32, expected: f32| {
        scalar_count += 1;
        exact_scalars += usize::from(actual.to_bits() == expected.to_bits());
        maximum_scalar_error = maximum_scalar_error.max(f64::from((actual - expected).abs()));
    };
    for case in cases {
        let scene = scene(case);
        let old = c(&scene);
        let frame = sampled(&scene);
        let original = scene.clone();
        let frame_before = frame.clone();
        let section = if case["section"] == "offsets" {
            MatchSection::Offsets
        } else {
            MatchSection::Properties
        };
        spaces[usize::from(old.local_source) * 2 + usize::from(old.local_target)] = true;
        let next = matched(&scene, old, &frame, section).unwrap();
        let expected = constraint(&case["originalAfter"], &scene);
        preservation(&scene, old, &next, section);
        assert_eq!(
            next.editor_range_bits().map(|v| v.is_some()),
            expected.editor_range_bits().map(|v| v.is_some())
        );
        effects(&scene, &expected, &next);
        let repeated = matched(&scene, &next, &frame, section).unwrap();
        assert_eq!(
            encode_scene(&with(&scene, &repeated)).unwrap(),
            encode_scene(&with(&scene, &next)).unwrap(),
            "fixed context Match must be idempotent"
        );
        if section == MatchSection::Offsets {
            for (actual, expected) in next.offsets.into_iter().zip(expected.offsets) {
                record(actual, expected);
            }
        } else {
            for (a, e) in next
                .editor_range_bits()
                .into_iter()
                .zip(expected.editor_range_bits())
            {
                if let (Some(a), Some(e)) = (a, e) {
                    record(f32::from_bits(a), f32::from_bits(e));
                }
            }
            for (actual_row, expected_row) in next.properties.iter().zip(&expected.properties) {
                record(actual_row.offset, expected_row.offset);
                let index = expected_row.property.index();
                let range = expected.editor_ranges[index];
                let start = f64::from(range.source_start.unwrap().get());
                let end = f64::from(range.source_end.unwrap().get());
                for (actual_to, expected_to) in actual_row.to.iter().zip(&expected_row.to) {
                    routes += 1;
                    record(actual_to.offset, expected_to.offset);
                    record(actual_to.max, expected_to.max);
                    record(actual_to.scale, expected_to.scale);
                    let s = next.editor_ranges[index];
                    let d = next.editor_ranges[actual_to.property.index()];
                    assert_eq!(
                        actual_row.offset.to_bits(),
                        s.source_start.unwrap().to_bits()
                    );
                    assert_eq!(
                        actual_to.offset.to_bits(),
                        d.destination_start.unwrap().to_bits()
                    );
                    assert_eq!(
                        actual_to.max.to_bits(),
                        d.destination_end.unwrap().to_bits()
                    );
                    let ratio = (d.destination_end.unwrap().get()
                        - d.destination_start.unwrap().get())
                        / (s.source_end.unwrap().get() - s.source_start.unwrap().get());
                    assert_eq!(actual_to.scale.to_bits(), ratio.to_bits());
                    for value in [
                        start,
                        (start + end) / 2.,
                        end,
                        runtime_input(&frame, old, expected_row.property),
                    ] {
                        let mut probe_scene = scene.clone();
                        probe_scene.rig.bones[old.source].x = value as f32;
                        let one = |offset: f32, to: &TransformTo| {
                            let mut c = old.clone();
                            c.local_source = true;
                            c.offsets = [0.; 6];
                            c.properties = vec![TransformFrom {
                                property: P::X,
                                offset,
                                to: vec![to.clone()],
                            }];
                            c
                        };
                        effects(
                            &probe_scene,
                            &one(expected_row.offset, expected_to),
                            &one(actual_row.offset, actual_to),
                        );
                        probes += 1;
                    }
                }
            }
        }
        assert_eq!(scene, original);
        assert_eq!(frame, frame_before);
    }
    assert_eq!(spaces, [true; 4]);
    assert_eq!(routes, 27);
    assert_eq!(probes, 108);
    println!("Match scalar residuals (not a bit-parity claim): compared={scalar_count}, exact={exact_scalars}, max={maximum_scalar_error}; downstream bounds .25/.009/.25 pass; probes={probes}");
}

fn simple() -> (SceneProject, Evaluation) {
    let mut rig = MinimalProject::new("Own Match policy".into(), [0; 16]);
    let mut source = Bone::root();
    source.name = "source".into();
    source.parent = Some(0);
    source.x = 3.;
    source.scale_y = 2.;
    rig.bones.push(source);
    let mut target = Bone::root();
    target.name = "target".into();
    target.parent = Some(0);
    target.y = 20.;
    target.rotation = 9.;
    rig.bones.push(target);
    let mut constraint = TransformConstraint::new("own".into(), vec![2], 1);
    constraint.local_source = true;
    constraint.local_target = true;
    constraint.mix = [0.; 6];
    constraint.offsets[1] = 5.;
    constraint.properties = vec![TransformFrom {
        property: P::X,
        offset: 1.,
        to: vec![TransformTo {
            property: P::Y,
            offset: 10.,
            max: 14.,
            scale: 2.,
        }],
    }];
    let scene = SceneProject {
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
        constraints: vec![Constraint::Transform(constraint)],
    };
    let frame = sampled(&scene);
    (scene, frame)
}
fn finite(value: f32) -> Option<FiniteF32> {
    Some(FiniteF32::new(value).unwrap())
}

#[test]
fn partial_explicit_ranges_zero_scale_and_unrelated_bits_follow_native_priority() {
    let (scene, frame) = simple();
    let mut old = c(&scene).clone();
    old.properties[0].to[0].scale = 0.;
    old.editor_ranges[1].source_start = finite(-0.);
    old.editor_ranges[1].source_end = finite(2.);
    old.editor_ranges[2].destination_start = finite(10.);
    old.editor_ranges[5].source_start = finite(-0.);
    old.editor_ranges[5].destination_end = finite(f32::from_bits(1));
    let next = matched(&scene, &old, &frame, MatchSection::Properties).unwrap();
    assert_eq!(next.properties[0].offset, -2.);
    assert_eq!(next.properties[0].to[0].offset, 20.);
    assert_eq!(next.properties[0].to[0].max, 24.);
    assert_eq!(next.properties[0].to[0].scale, 2.);
    assert_eq!(next.editor_ranges[5], old.editor_ranges[5]);
    preservation(&scene, &old, &next, MatchSection::Properties);
    old.editor_ranges[1] = TransformEditorRange::default();
    let default = matched(&scene, &old, &frame, MatchSection::Properties).unwrap();
    assert_eq!(default.editor_ranges[1].source_end.unwrap().get(), -1.);
    assert_eq!(default.properties[0].to[0].scale, 4.);
    old.editor_ranges[1].source_end = finite(7.);
    let explicit_end = matched(&scene, &old, &frame, MatchSection::Properties).unwrap();
    assert_eq!(explicit_end.editor_ranges[1].source_end.unwrap().get(), 4.);
    assert_eq!(explicit_end.properties[0].to[0].scale, 4. / 6.);
    old.editor_ranges[1].source_start = finite(4.);
    old.editor_ranges[1].source_end = finite(2.);
    let reversed = matched(&scene, &old, &frame, MatchSection::Properties).unwrap();
    assert_eq!(reversed.properties[0].to[0].scale, -2.);
}

#[test]
fn shared_destination_first_incoming_span_is_coherent_for_conflicting_routes() {
    let (scene, frame) = simple();
    let mut old = c(&scene).clone();
    old.offsets = [0.; 6];
    old.properties = vec![
        TransformFrom {
            property: P::X,
            offset: 0.,
            to: vec![TransformTo {
                property: P::Rotate,
                offset: 10.,
                max: 12.,
                scale: 2.,
            }],
        },
        TransformFrom {
            property: P::ScaleY,
            offset: 0.,
            to: vec![TransformTo {
                property: P::Rotate,
                offset: 30.,
                max: 38.,
                scale: 4.,
            }],
        },
    ];
    let next = matched(&scene, &old, &frame, MatchSection::Properties).unwrap();
    assert_eq!(next.editor_ranges[0].destination_start.unwrap().get(), 9.);
    assert_eq!(next.editor_ranges[0].destination_end.unwrap().get(), 11.);
    assert_eq!(next.editor_ranges[1].source_end.unwrap().get(), 4.);
    assert_eq!(next.editor_ranges[4].source_end.unwrap().get(), 2.5);
    assert_eq!(next.properties[0].to[0].scale, 2.);
    assert_eq!(next.properties[1].to[0].scale, 4.);
    assert_eq!(inventory(&next), inventory(&old));
    old.properties[1].to[0].offset = 10.;
    old.properties[1].to[0].max = 12.;
    let coherent = matched(&scene, &old, &frame, MatchSection::Properties).unwrap();
    assert_eq!(next, coherent);
}

#[test]
fn supplied_applied_context_additive_and_partial_mix_do_not_recompute_or_bake_bones() {
    let (scene, mut frame) = simple();
    let mut old = c(&scene).clone();
    old.additive = true;
    old.clamp = true;
    old.mix = [0.375; 6];
    frame.bones[1].applied.x = 12.;
    frame.bones[2].applied.y = 42.;
    let next = matched(&scene, &old, &frame, MatchSection::Properties).unwrap();
    assert_eq!(next.properties[0].offset, 7.);
    assert_eq!(next.properties[0].to[0].offset, 42.);
    assert_eq!(next.additive, old.additive);
    assert_eq!(next.mix.map(f32::to_bits), old.mix.map(f32::to_bits));
    preservation(&scene, &old, &next, MatchSection::Properties);
    old.properties.clear();
    old.editor_ranges[3].destination_start = finite(-0.);
    assert_eq!(
        matched(&scene, &old, &frame, MatchSection::Properties).unwrap(),
        old
    );
    let offsets = matched(&scene, &old, &frame, MatchSection::Offsets).unwrap();
    assert_eq!(offsets.offsets[1], -12.);
    assert_eq!(offsets.offsets[2], 42.);
    assert_eq!(offsets.editor_ranges, old.editor_ranges);
}

#[test]
fn singular_inverse_only_rejects_required_world_offset_and_zero_scale_otherwise_works() {
    let (scene, mut frame) = simple();
    let mut old = c(&scene).clone();
    old.local_source = false;
    old.local_target = false;
    frame.bones[1].world.a = 0.;
    frame.bones[1].world.b = 0.;
    let snapshot = frame.clone();
    let before = old.clone();
    let error = matched(&scene, &old, &frame, MatchSection::Offsets).unwrap_err();
    assert_eq!(error.code, "InvalidTransformMatch");
    assert!(error.message.contains("singular"));
    assert_eq!(frame, snapshot);
    assert_eq!(old, before);
    assert!(matched(&scene, &old, &frame, MatchSection::Properties).is_ok());
    old.local_target = true;
    assert!(matched(&scene, &old, &frame, MatchSection::Offsets).is_ok());
}

#[test]
fn invalid_context_overflow_zero_and_late_collapsed_spans_leave_every_input_unchanged() {
    let (scene, frame) = simple();
    let old = c(&scene).clone();
    let mut missing = frame.clone();
    missing.bones.pop();
    assert!(matched(&scene, &old, &missing, MatchSection::Offsets).is_err());
    let mut bad = old.clone();
    bad.bones = vec![scene.rig.bones.len()];
    assert!(matched(&scene, &bad, &frame, MatchSection::Properties).is_err());
    bad = old.clone();
    bad.bones = vec![2, 2];
    assert!(matched(&scene, &bad, &frame, MatchSection::Properties).is_err());
    bad = old.clone();
    bad.bones.clear();
    assert!(matched(&scene, &bad, &frame, MatchSection::Offsets).is_err());
    let mut overflow = frame.clone();
    overflow.bones[1].applied.x = f64::MAX;
    assert!(matched(&scene, &old, &overflow, MatchSection::Properties).is_err());
    let mut invalid = frame.clone();
    invalid.bones[1].world.x = f64::NAN;
    assert!(matched(&scene, &old, &invalid, MatchSection::Offsets).is_err());
    for (start, end) in [(1., 1.), (0., 0.00001)] {
        bad = old.clone();
        bad.editor_ranges[1].source_start = finite(start);
        bad.editor_ranges[1].source_end = finite(end);
        let mut context = frame.clone();
        if start == 0. {
            context.bones[1].applied.x = 1_000_000.;
            bad.offsets[1] = 0.;
        }
        let bytes = encode_scene(&with(&scene, &bad)).unwrap();
        assert!(matched(&scene, &bad, &context, MatchSection::Properties).is_err());
        assert_eq!(encode_scene(&with(&scene, &bad)).unwrap(), bytes);
    }
    bad = old.clone();
    bad.properties.push(TransformFrom::identity(P::ScaleY));
    bad.editor_ranges[4].source_start = finite(0.);
    bad.editor_ranges[4].source_end = finite(1e-12);
    let bytes = encode_scene(&with(&scene, &bad)).unwrap();
    assert!(matched(&scene, &bad, &frame, MatchSection::Properties).is_err());
    assert_eq!(encode_scene(&with(&scene, &bad)).unwrap(), bytes);
}
