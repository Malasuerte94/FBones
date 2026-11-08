use super::*;
use crate::{
    project::{open_document, Session},
    rig::RigEdit,
    scene_edit::{SceneEdit, SceneHistory},
};
use fbones_format::{
    encode_envelope,
    minimal::{
        regions::RegionProject,
        scene::{
            decode_scene, encode_scene_payload, FiniteF32, IkConstraint, PhysicsConstraint,
            SceneProject, TransformConstraint,
        },
        Bone, MinimalProject,
    },
};
use serde_json::json;

fn project() -> SceneProject {
    let mut rig = MinimalProject::new("own homogeneous edits".into(), [0; 16]);
    for index in 0..6 {
        let mut bone = Bone::root();
        bone.name = format!("B{index}");
        bone.parent = Some(0);
        bone.x = (index + 1) as f32 * 20.0;
        bone.length = 10.0;
        rig.bones.push(bone);
    }
    let mut project = SceneProject::from(&RegionProject {
        rig,
        images_root: String::new(),
        slots: vec![],
        region_order: vec![],
    });
    for index in 0..5 {
        let mut c = PhysicsConstraint::new(format!("B{index}_physics"), index + 1);
        c.gravity = index as f32 * 3.0;
        c.mass = f32::from_bits(0x3f80_0001 + index as u32);
        c.wind = -0.0;
        c.globals.wind = index % 2 == 0;
        if index % 2 == 0 {
            c.angular = PhysicsAngular::from_wire_bits(0, 0).unwrap();
        }
        project.constraints.push(Constraint::Physics(c));
    }
    project.constraints.push(Constraint::Ik(IkConstraint::new(
        "own IK".into(),
        vec![1],
        6,
    )));
    for index in 0..2 {
        let mut c = TransformConstraint::new(format!("own Transform{index}"), vec![index + 1], 6);
        c.offsets[2] = -0.0;
        c.properties[0].to[0].scale = f32::from_bits(0x3f80_0001 + index as u32);
        // Seed independent nullable editor metadata, as in the accepted range
        // fixtures. Calling the authoring operation would materialize peers and
        // setting a source end to -0 could collapse its zero-based source span.
        c.editor_ranges[index].source_start =
            Some(FiniteF32::from_bits((-0.0_f32).to_bits()).unwrap());
        c.editor_ranges[index + 1].destination_end = Some(FiniteF32::new(0.3125).unwrap());
        project.constraints.push(Constraint::Transform(c));
    }
    project
}

fn edit(ids: &[u64], field: &str, value: serde_json::Value) -> RigEdit {
    serde_json::from_value(json!({"type":"patchConstraints","ids":ids,"field":field,"value":value}))
        .unwrap()
}

fn apply(
    h: &mut SceneHistory,
    ids: &[u64],
    field: &str,
    value: serde_json::Value,
) -> Result<bool, AppError> {
    h.apply(SceneEdit::Rig(edit(ids, field, value)))
}

fn bytes(h: &SceneHistory) -> Vec<u8> {
    encode_scene_payload(&h.frame().project).unwrap()
}

#[test]
fn five_gravity_edits_preserve_unrelated_bits_names_ids_and_one_undo_redo() {
    let mut h = SceneHistory::new(project(), true).unwrap();
    let before = bytes(&h);
    let ids = h.frame().constraint_ids.clone();
    let names = h.frame().auto_physics_names.clone();
    let mut expected = h.frame().project.clone();
    for c in &mut expected.constraints[..5] {
        let Constraint::Physics(c) = c else {
            unreachable!()
        };
        c.gravity = -42.25;
    }
    assert!(apply(&mut h, &[4, 2, 0, 1, 3], "physics.gravity", json!(-42.25)).unwrap());
    assert_eq!(bytes(&h), encode_scene_payload(&expected).unwrap());
    assert_eq!(h.frame().constraint_ids, ids);
    assert_eq!(h.frame().auto_physics_names, names);
    let after = bytes(&h);
    assert!(h.dirty());
    assert!(h.apply(SceneEdit::Undo).unwrap());
    assert_eq!(bytes(&h), before);
    assert!(!h.can_undo(), "the five values must be one history action");
    assert!(!h.dirty());
    assert!(h.apply(SceneEdit::Redo).unwrap());
    assert_eq!(bytes(&h), after);
    assert_eq!(h.frame().constraint_ids, ids);
    assert_eq!(h.frame().auto_physics_names, names);
    let decoded = decode_scene(&after).unwrap();
    assert_eq!(encode_scene_payload(&decoded).unwrap(), after);
}

#[test]
fn rejected_batch_is_atomic_and_does_not_consume_history_or_redo() {
    for (ids, field, value) in [
        (vec![], "physics.gravity", json!(5)),
        (vec![0, 0], "physics.gravity", json!(5)),
        (vec![0, 999], "physics.gravity", json!(5)),
        (vec![0, 5], "physics.gravity", json!(5)),
        (vec![0, 1], "physics.gravity", json!(true)),
        (vec![0, 1], "physics.global:gravity", json!(1)),
        (vec![0, 1], "physics.step", json!(0)),
        (vec![0, 1], "physics.mass", json!(0)),
        (vec![0, 1], "physics.damping", json!(-1)),
        (vec![6, 7], "ik.mix", json!(0.5)),
    ] {
        let mut h = SceneHistory::new(project(), true).unwrap();
        assert!(apply(&mut h, &[0, 1], "physics.gravity", json!(20)).unwrap());
        h.apply(SceneEdit::Undo).unwrap();
        let before = bytes(&h);
        let ids_before = h.frame().constraint_ids.clone();
        let names = h.frame().auto_physics_names.clone();
        assert!(
            apply(&mut h, &ids, field, value).is_err(),
            "{field}: {ids:?}"
        );
        assert_eq!(bytes(&h), before);
        assert_eq!(h.frame().constraint_ids, ids_before);
        assert_eq!(h.frame().auto_physics_names, names);
        assert!(!h.can_undo());
        assert!(h.can_redo());
        assert!(!h.dirty());
    }
}

#[test]
fn native_numeric_boundary_and_closed_wire_fields_reject_tampering() {
    for value in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY] {
        let mut h = SceneHistory::new(project(), true).unwrap();
        let before = bytes(&h);
        let result = h.apply(SceneEdit::Rig(RigEdit::PatchConstraints {
            ids: vec![0, 1],
            field: ConstraintBatchField::PhysicsGravity,
            value: ConstraintBatchValue::Number(value),
        }));
        assert!(result.is_err());
        assert_eq!(bytes(&h), before);
        assert!(!h.can_undo());
    }
    for field in [
        "physics.name",
        "physics.bone",
        "transform.offset:6",
        "transform.range:0",
        "ik.target",
    ] {
        assert!(serde_json::from_value::<RigEdit>(json!({
            "type":"patchConstraints","ids":[0],"field":field,"value":1
        }))
        .is_err());
    }
    for value in [json!(null), json!("5"), json!({"number":5}), json!([5])] {
        assert!(serde_json::from_value::<RigEdit>(json!({
            "type":"patchConstraints","ids":[0],"field":"physics.gravity","value":value
        }))
        .is_err());
    }
    for value in [
        json!({"bits":0,"extra":1}),
        json!({"bits":-1}),
        json!({"bits":4294967296_u64}),
        json!({"bits":0.5}),
    ] {
        assert!(serde_json::from_value::<RigEdit>(json!({
            "type":"patchConstraints","ids":[0],"field":"physics.gravity","value":value
        }))
        .is_err());
    }
    for bits in [0x7f80_0000_u32, 0xff80_0000, 0x7fc0_0000, 0x7fa0_0001] {
        let mut h = SceneHistory::new(project(), true).unwrap();
        let before = bytes(&h);
        assert!(apply(&mut h, &[0, 1], "physics.gravity", json!({"bits":bits})).is_err());
        assert_eq!(bytes(&h), before);
        assert!(!h.can_undo());
    }
    let mut h = SceneHistory::new(project(), true).unwrap();
    assert!(apply(&mut h, &[0], "physics.global:gravity", json!({"bits":0})).is_err());
    assert!(!h.can_undo());
}

#[test]
fn no_op_and_angular_null_are_distinct_and_global_patch_changes_one_flag() {
    let mut h = SceneHistory::new(project(), true).unwrap();
    let before = bytes(&h);
    assert!(!apply(&mut h, &[0, 1], "physics.mix", json!(1)).unwrap());
    assert_eq!(bytes(&h), before);
    assert!(!h.can_undo());
    // Record1 has the nullable rotation sentinel. Only an explicit rotate write
    // may materialize zero; unrelated edits and zero shear preserve its bits.
    assert!(!apply(&mut h, &[1, 3], "physics.shearX", json!(0)).unwrap());
    assert!(apply(&mut h, &[1, 3], "physics.shearX", json!(0.25)).is_err());
    assert_eq!(bytes(&h), before);
    assert!(apply(&mut h, &[1, 3], "physics.rotate", json!(0)).unwrap());
    for index in [1, 3] {
        let Constraint::Physics(c) = &h.frame().project.constraints[index] else {
            unreachable!()
        };
        assert_eq!(c.angular.wire_bits(), (0, 0));
    }
    h.apply(SceneEdit::Undo).unwrap();
    assert_eq!(bytes(&h), before);
    let mut expected = h.frame().project.clone();
    for c in &mut expected.constraints[..5] {
        let Constraint::Physics(c) = c else {
            unreachable!()
        };
        c.globals.gravity = true;
    }
    assert!(apply(
        &mut h,
        &[0, 1, 2, 3, 4],
        "physics.global:gravity",
        json!(true)
    )
    .unwrap());
    assert_eq!(bytes(&h), encode_scene_payload(&expected).unwrap());
}

#[test]
fn ik_and_transform_patch_only_the_requested_cell_preserving_ranges_and_mapping() {
    let mut h = SceneHistory::new(project(), true).unwrap();
    let before = bytes(&h);
    assert!(apply(&mut h, &[5], "ik.mix", json!(0.375)).unwrap());
    assert!(apply(&mut h, &[5], "ik.stretch", json!(true)).unwrap());
    let mut expected = h.frame().project.clone();
    for c in &mut expected.constraints[6..] {
        let Constraint::Transform(c) = c else {
            unreachable!()
        };
        c.offsets[3] = 12.25;
    }
    assert!(apply(&mut h, &[7, 6], "transform.offset:3", json!(12.25)).unwrap());
    assert_eq!(bytes(&h), encode_scene_payload(&expected).unwrap());
    let range_bits = h.frame().project.constraints[6..]
        .iter()
        .map(|c| {
            let Constraint::Transform(c) = c else {
                unreachable!()
            };
            c.editor_range_bits()
        })
        .collect::<Vec<_>>();
    assert_ne!(range_bits[0], range_bits[1]);
    for c in &mut expected.constraints[6..] {
        let Constraint::Transform(c) = c else {
            unreachable!()
        };
        c.mix[1] = 0.625;
    }
    assert!(apply(&mut h, &[6, 7], "transform.mix:1", json!(0.625)).unwrap());
    assert_eq!(bytes(&h), encode_scene_payload(&expected).unwrap());
    for c in &mut expected.constraints[6..] {
        let Constraint::Transform(c) = c else {
            unreachable!()
        };
        c.local_source = true;
    }
    assert!(apply(&mut h, &[6, 7], "transform.localSource", json!(true)).unwrap());
    assert_eq!(bytes(&h), encode_scene_payload(&expected).unwrap());
    for _ in 0..5 {
        assert!(h.apply(SceneEdit::Undo).unwrap());
    }
    assert_eq!(bytes(&h), before);
    assert!(!h.can_undo());
}

#[test]
fn real_session_batch_revision_stale_noop_and_binary_reopen_are_atomic() {
    let dir = tempfile::tempdir().unwrap();
    let source = dir.path().join("own-batch.fbones");
    std::fs::write(
        &source,
        encode_envelope(&encode_scene_payload(&project()).unwrap()).unwrap(),
    )
    .unwrap();
    let session = Session::default();
    let initial = session
        .replace(open_document(source).unwrap(), false)
        .unwrap();
    let ids = initial
        .constraints
        .iter()
        .take(5)
        .map(|c| c["id"].as_u64().unwrap())
        .collect::<Vec<_>>();
    let changed = session
        .edit(
            initial.revision,
            edit(&ids, "physics.gravity", json!(-18.5)),
        )
        .unwrap();
    assert_eq!(changed.revision, initial.revision + 1);
    assert!(changed.dirty);
    assert!(session
        .edit(initial.revision, edit(&ids, "physics.gravity", json!(50)))
        .is_err());
    assert_eq!(
        session.summary().unwrap().unwrap().revision,
        changed.revision
    );
    let noop = session
        .edit(
            changed.revision,
            edit(&ids, "physics.gravity", json!(-18.5)),
        )
        .unwrap();
    assert_eq!(noop.revision, changed.revision);
    let restored = session.edit(noop.revision, RigEdit::Undo).unwrap();
    assert!(!restored.can_undo);
    assert!(!restored.dirty);
    let redone = session.edit(restored.revision, RigEdit::Redo).unwrap();
    let saved = dir.path().join("edited.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), saved.clone())
        .unwrap();
    let reopened = Session::default()
        .replace(open_document(saved).unwrap(), false)
        .unwrap();
    for (expected, actual) in redone.constraints.iter().zip(&reopened.constraints) {
        assert_eq!(expected["name"], actual["name"]);
        assert_eq!(expected["type"], actual["type"]);
        if expected["type"] == "physics" {
            assert_eq!(actual["gravity"], json!(-18.5));
        }
    }
}

#[test]
fn exact_zero_sign_transport_is_authored_dirty_undoable_and_preserved_in_binary() {
    let dir = tempfile::tempdir().unwrap();
    let source = dir.path().join("own-zero.fbones");
    let initial_project = project();
    std::fs::write(
        &source,
        encode_envelope(&encode_scene_payload(&initial_project).unwrap()).unwrap(),
    )
    .unwrap();
    let session = Session::default();
    let initial = session
        .replace(open_document(source).unwrap(), false)
        .unwrap();
    let id = initial.constraints[0]["id"].as_u64().unwrap();
    let negative_zero = json!({"bits":0x8000_0000_u32});
    let changed = session
        .edit(
            initial.revision,
            edit(&[id], "physics.gravity", negative_zero.clone()),
        )
        .unwrap();
    assert_eq!(changed.revision, initial.revision + 1);
    assert!(
        changed.dirty,
        "an authored sign-bit change must remain saveable"
    );
    assert!(changed.constraints[0]["gravity"]
        .as_f64()
        .unwrap()
        .is_sign_negative());
    let noop = session
        .edit(
            changed.revision,
            edit(&[id], "physics.gravity", negative_zero),
        )
        .unwrap();
    assert_eq!(noop.revision, changed.revision);
    let undone = session.edit(noop.revision, RigEdit::Undo).unwrap();
    assert!(!undone.dirty);
    assert!(!undone.can_undo);
    assert!(!undone.constraints[0]["gravity"]
        .as_f64()
        .unwrap()
        .is_sign_negative());
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert!(redone.dirty);
    let saved = dir.path().join("own-zero-saved.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), saved.clone())
        .unwrap();
    let reopened = Session::default()
        .replace(open_document(saved).unwrap(), false)
        .unwrap();
    assert!(reopened.constraints[0]["gravity"]
        .as_f64()
        .unwrap()
        .is_sign_negative());
    assert_eq!(
        reopened.constraints[0]["wind"],
        redone.constraints[0]["wind"]
    );
    assert_eq!(
        reopened.constraints[0]["rotate"],
        redone.constraints[0]["rotate"]
    );
}
