//! Endpoint intent transactions. Arithmetic/clear policies are explicitly FBones
//! choices; these are not claims of additional original-editor interaction.
use super::*;
use crate::evaluation::{EvaluationMode, EvaluationRequest};
use fbones_format::minimal::scene::{encode_scene, TransformConstraint, TransformEditorRange};

fn edit(id: u64, index: usize, bits: Option<u32>) -> RigEdit {
    RigEdit::SetTransformRange { id, index, bits }
}
fn subject(model: &fbones_format::minimal::scene::SceneProject) -> &TransformConstraint {
    let Constraint::Transform(c) = &model.constraints[0] else {
        panic!("own Transform")
    };
    c
}
fn fixture() -> (tempfile::TempDir, Session, ProjectSummary) {
    let (d, s, mut p) = setup();
    for _ in 0..3 {
        p = add_bone(&s, &p, 0);
    }
    p = s
        .place_images(p.revision, &["A".into()], 0, 10., 20.)
        .unwrap();
    for name in ["Range subject", "Unrelated Transform"] {
        p = command(
            &s,
            &p,
            serde_json::json!({"type":"addConstraint","constraint":{
                "type":"transform","name":name,"source":p.bones[1].id,
                "bones":[p.bones[3].id,p.bones[2].id],"localSource":true,"localTarget":true,
                "mix":[0,0,0,0,0,0],"offsets":[7,11,-13,0.2,-0.1,19],
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
    command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{
            "type":"physics","name":"Transient gravity","bone":p.bones[1].id,
            "x":1,"y":1,"gravity":10,"strength":20
        }}),
    );
    let mut model = scene_model(&s);
    for c in &mut model.constraints[..2] {
        let Constraint::Transform(c) = c else {
            unreachable!()
        };
        c.editor_ranges[0] =
            TransformEditorRange::from_bits([Some(0x80000000), Some(0x80000001), None, None])
                .unwrap();
        c.editor_ranges[1] = TransformEditorRange::from_bits([
            Some(2f32.to_bits()),
            Some(6f32.to_bits()),
            None,
            None,
        ])
        .unwrap();
        c.editor_ranges[5] =
            TransformEditorRange::from_bits([None, None, None, Some(0xbf800001)]).unwrap();
    }
    let file = d.path().join("range-seed.fbones");
    std::fs::write(&file, encode_scene(&model).unwrap()).unwrap();
    let p = s.replace(open_document(file).unwrap(), true).unwrap();
    assert!(!p.dirty && !p.can_undo && !p.inspection_only);
    (d, s, p)
}
#[derive(Debug, PartialEq)]
struct Identity {
    summary: serde_json::Value,
    authored: Vec<u8>,
    cache: serde_json::Value,
    physics: Option<crate::solve::PhysicsState>,
    evaluated: Option<crate::solve::Evaluation>,
}
fn identity(s: &Session) -> Identity {
    let summary = serde_json::to_value(s.summary().unwrap()).unwrap();
    let authored = encode_scene(&scene_model(s)).unwrap();
    let state = s.lock().unwrap();
    Identity {
        summary,
        authored,
        cache: serde_json::json!({"nextEpoch":state.next_pose_epoch,"snapshot":state.evaluation.as_ref().map(|e|serde_json::to_value(&e.snapshot).unwrap())}),
        physics: state.evaluation.as_ref().map(|e| e.physics.clone()),
        evaluated: state.evaluation.as_ref().map(|e| e.evaluated.clone()),
    }
}
fn evaluate(s: &Session, p: &ProjectSummary, time: f64) -> crate::evaluation::EvaluationSnapshot {
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
fn assert_only_subject(
    before: &fbones_format::minimal::scene::SceneProject,
    after: &fbones_format::minimal::scene::SceneProject,
) {
    let mut permitted = before.clone();
    permitted.constraints[0] = after.constraints[0].clone();
    assert_eq!(
        *after, permitted,
        "all bones, attachments, other constraints and settings remain exact"
    );
    let mut c = subject(before).clone();
    c.properties = subject(after).properties.clone();
    c.editor_ranges = subject(after).editor_ranges;
    assert_eq!(
        *subject(after),
        c,
        "only endpoint cache/runtime properties are writable"
    );
}

#[test]
fn transform_range_mapped_signed_zero_materializes_peers_one_history_noop_and_native_save_reopen() {
    let (d, s, p) = fixture();
    let before = scene_model(&s);
    let id = p.constraints[0]["id"].as_u64().unwrap();
    // No pose epoch is supplied: this transaction edits persistent arithmetic.
    let changed = s.edit(p.revision, edit(id, 5, Some(0x80000000))).unwrap();
    assert_eq!(changed.revision, p.revision + 1);
    let after = scene_model(&s);
    assert_only_subject(&before, &after);
    let c = subject(&after);
    let old = subject(&before).editor_range_bits();
    let cells = c.editor_range_bits();
    assert_eq!(cells[5], Some(0x80000000));
    assert_eq!(c.properties[0].offset.to_bits(), 2f32.to_bits());
    assert_eq!(c.properties[0].to[0].scale.to_bits(), (-4f32).to_bits());
    assert_eq!(c.properties[0].to[1].scale.to_bits(), (-6f32).to_bits());
    assert_eq!(
        c.properties[1],
        subject(&before).properties[1],
        "disconnected source row stays exact"
    );
    for i in 0..24 {
        if [2, 3, 4, 5, 10, 11, 14, 15, 16, 17].contains(&i) {
            assert!(cells[i].is_some());
        } else {
            assert_eq!(cells[i], old[i], "unmapped cell {i}");
        }
        if i != 5 && old[i].is_some() {
            assert_eq!(cells[i], old[i], "explicit peer {i}");
        }
    }
    evaluate(&s, &changed, 0.25);
    let stable = identity(&s);
    let same = s
        .edit(changed.revision, edit(id, 5, Some(0x80000000)))
        .unwrap();
    assert_eq!(same.revision, changed.revision);
    assert_eq!(identity(&s), stable);
    let undone = s.edit(same.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    assert!(!undone.can_undo);
    let redone = s.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
    let saved = s
        .save_snapshot(
            s.prepare_save(true).unwrap(),
            d.path().join("portable/ranges.fbones"),
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
    assert_eq!(reopened.constraints, redone.constraints);
    let mut expected = after;
    expected.images_root = "./images/".into();
    assert_eq!(scene_model(&s), expected);
    assert_eq!(
        subject(&scene_model(&s)).editor_range_bits()[5],
        Some(0x80000000)
    );
}

#[test]
fn transform_range_dormant_finite_bits_and_clear_are_cache_only_without_inventing_links() {
    let (_d, s, mut p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    for (index, value) in [
        (20, Some(0x80000000)),
        (21, Some(1)),
        (21, Some(0x80000001)),
        (20, None),
        (22, Some(0x7f7fffff)),
    ] {
        let before = scene_model(&s);
        let old = subject(&before).editor_range_bits();
        let changed = s.edit(p.revision, edit(id, index, value)).unwrap();
        assert_eq!(changed.revision, p.revision + 1);
        let after = scene_model(&s);
        let cells = subject(&after).editor_range_bits();
        assert_eq!(cells[index], value);
        for i in 0..24 {
            if i != index {
                assert_eq!(cells[i], old[i]);
            }
        }
        assert_eq!(subject(&after).properties, subject(&before).properties);
        assert_only_subject(&before, &after);
        let stable = identity(&s);
        s.edit(changed.revision, edit(id, index, value)).unwrap();
        assert_eq!(identity(&s), stable);
        let undo = s.edit(changed.revision, RigEdit::Undo).unwrap();
        assert_eq!(scene_model(&s), before);
        p = s.edit(undo.revision, RigEdit::Redo).unwrap();
        assert_eq!(scene_model(&s), after);
    }
}

#[test]
fn transform_range_destination_fanin_rebuilds_complete_fanout_reversed_and_zero_spans() {
    let (_d, s, p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let before = scene_model(&s);
    let p = s
        .edit(p.revision, edit(id, 2, Some(36f32.to_bits())))
        .unwrap();
    let reversed = scene_model(&s);
    assert_only_subject(&before, &reversed);
    let c = subject(&reversed);
    assert_eq!(c.properties[0].to[0].scale, -2.);
    assert_eq!(c.properties[1].to[1].scale, -8.);
    assert_eq!(c.properties[0].to[0].offset, 36.);
    assert_eq!(c.properties[1].to[1].offset, 36.);
    assert_eq!(c.properties[0].to[1], subject(&before).properties[0].to[1]);
    assert_eq!(c.properties[1].to[0], subject(&before).properties[1].to[0]);
    let p = s
        .edit(p.revision, edit(id, 3, Some(36f32.to_bits())))
        .unwrap();
    let zero = scene_model(&s);
    let c = subject(&zero);
    assert_eq!(c.properties[0].to[0].scale, 0.);
    assert_eq!(c.properties[1].to[1].scale, 0.);
    assert_eq!(c.editor_range_bits()[2], Some(36f32.to_bits()));
    assert_eq!(c.editor_range_bits()[3], Some(36f32.to_bits()));
    let p = s.edit(p.revision, edit(id, 3, None)).unwrap();
    let cleared = scene_model(&s);
    assert_eq!(subject(&cleared).editor_range_bits()[3], None);
    assert_eq!(
        subject(&cleared).properties,
        subject(&zero).properties,
        "clear derives the existing runtime endpoint; no implicit zero/reset"
    );
    assert_eq!(
        p.constraints[0]["editorRangeBits"][3],
        serde_json::Value::Null
    );
}

#[test]
fn transform_range_invalid_revision_identity_kind_bits_and_arithmetic_are_atomic_with_live_cache() {
    for malformed in [
        serde_json::json!({"type":"setTransformRange","id":0,"index":5}),
        serde_json::json!({"type":"setTransformRange","id":0,"index":5,"bits":-1}),
        serde_json::json!({"type":"setTransformRange","id":0,"index":5,"bits":4294967296u64}),
        serde_json::json!({"type":"setTransformRange","id":0,"index":5,"bits":0.5}),
        serde_json::json!({"type":"setTransformRange","id":0,"index":-1,"bits":null}),
    ] {
        assert!(serde_json::from_value::<RigEdit>(malformed).is_err());
    }
    assert!(matches!(
        serde_json::from_value::<RigEdit>(
            serde_json::json!({"type":"setTransformRange","id":0,"index":5,"bits":null})
        )
        .unwrap(),
        RigEdit::SetTransformRange { bits: None, .. }
    ));
    let (d, s, p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let wrong = p.constraints[2]["id"].as_u64().unwrap();
    evaluate(&s, &p, 0.25);
    let before = identity(&s);
    let cases = [
        edit(u64::MAX, 5, Some(0)),
        edit(wrong, 5, Some(0)),
        edit(id, 24, Some(0)),
        edit(id, usize::MAX, None),
        edit(id, 5, Some(0x7f800000)),
        edit(id, 5, Some(0xff800000)),
        edit(id, 5, Some(0x7fc00000)),
        edit(id, 5, Some(2f32.to_bits())),
    ];
    for value in cases {
        assert!(s.edit(p.revision, value).is_err());
        assert_eq!(identity(&s), before);
    }
    assert_eq!(
        s.edit(p.revision - 1, edit(id, 5, Some(0)))
            .unwrap_err()
            .code,
        "ProjectChanged"
    );
    assert_eq!(identity(&s), before);
    // An explicit, legal loaded tiny source interval makes the requested target
    // endpoint overflow f32 division. Rejection must include every cache/epoch.
    let mut model = scene_model(&s);
    let Constraint::Transform(c) = &mut model.constraints[0] else {
        unreachable!()
    };
    c.editor_ranges[1] = TransformEditorRange::from_bits([
        Some(2f32.to_bits()),
        Some(2f32.to_bits() + 1),
        None,
        None,
    ])
    .unwrap();
    let path = d.path().join("tiny-source-interval.fbones");
    std::fs::write(&path, encode_scene(&model).unwrap()).unwrap();
    let p = s.replace(open_document(path).unwrap(), true).unwrap();
    evaluate(&s, &p, 0.25);
    let before = identity(&s);
    let id = p.constraints[0]["id"].as_u64().unwrap();
    assert!(s
        .edit(p.revision, edit(id, 3, Some(f32::MAX.to_bits())))
        .is_err());
    assert_eq!(identity(&s), before);
    // A nonzero destination span that rounds to a zero f32 quotient is not a
    // genuinely equal destination range and must not silently erase a route.
    let mut model = scene_model(&s);
    let Constraint::Transform(c) = &mut model.constraints[0] else {
        unreachable!()
    };
    c.editor_ranges[1] =
        TransformEditorRange::from_bits([Some(2f32.to_bits()), Some(6f32.to_bits()), None, None])
            .unwrap();
    c.editor_ranges[0] = TransformEditorRange::from_bits([
        Some(0x80000000),
        Some(0x80000001),
        Some(0),
        Some(1f32.to_bits()),
    ])
    .unwrap();
    let path = d.path().join("underflow-span.fbones");
    std::fs::write(&path, encode_scene(&model).unwrap()).unwrap();
    let p = s.replace(open_document(path).unwrap(), true).unwrap();
    evaluate(&s, &p, 0.25);
    let before = identity(&s);
    let id = p.constraints[0]["id"].as_u64().unwrap();
    assert!(s.edit(p.revision, edit(id, 3, Some(1))).is_err());
    assert_eq!(identity(&s), before);
}

#[test]
fn transform_range_live_gravity_is_not_baked_and_no_evaluated_epoch_is_required() {
    let (_d, s, p) = fixture();
    let rest = scene_model(&s);
    let initial = evaluate(&s, &p, 0.);
    let live = evaluate(&s, &p, 0.25);
    assert_ne!(
        initial.bones[1].world.y.to_bits(),
        live.bones[1].world.y.to_bits(),
        "the cached frame contains an actual transient response"
    );
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let changed = s
        .edit(p.revision, edit(id, 5, Some(10f32.to_bits())))
        .unwrap();
    let after = scene_model(&s);
    assert_only_subject(&rest, &after);
    assert_eq!(after.rig, rest.rig);
    assert_eq!(subject(&after).properties[0].to[0].scale, 1.);
    assert_eq!(subject(&after).properties[0].to[1].scale, 1.5);
    let undo = s.edit(changed.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), rest);
    assert!(!undo.can_undo);
}
