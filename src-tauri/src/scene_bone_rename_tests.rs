use super::*;
use crate::rig::BoneRename;
use serde_json::json;

fn named_bone(s: &Session, p: &ProjectSummary, parent: u64, name: &str) -> ProjectSummary {
    let created = add_bone(s, p, parent);
    s.edit(
        created.revision,
        RigEdit::Update {
            id: created.edited_bone.unwrap(),
            name: name.into(),
            x: 12.5,
            y: -0.0,
            rotation: 15.0,
            length: 30.0,
            scale_x: Some(-1.25),
            scale_y: None,
            shear_x: Some(9.0),
            shear_y: None,
        },
    )
    .unwrap()
}

fn rename(id: u64, name: &str) -> BoneRename {
    BoneRename {
        id,
        name: name.into(),
    }
}

#[test]
fn rename_bones_validates_the_final_namespace_and_persists_one_transaction() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("rename.fbones");
    let s = Session::default();
    let p = s
        .replace(new_document("rename".into()).unwrap(), true)
        .unwrap();
    let root = p.bones[0].id;
    let p = named_bone(&s, &p, root, "Left arm");
    let left = p.bones[1].id;
    let p = named_bone(&s, &p, root, "Right arm");
    let right = p.bones[2].id;
    let p = named_bone(&s, &p, left, "Child");
    let child = p.bones[3].id;
    let p = command(&s, &p, json!({"type":"addPhysicsToBones","bones":[left]}));
    let p = command(
        &s,
        &p,
        json!({"type":"addConstraint","constraint":{"type":"physics","name":"Custom spring","bone":right}}),
    );
    command(
        &s,
        &p,
        json!({"type":"setAnimationKeys","animation":p.animations[0].id,"keys":[
            {"bone":left,"channel":"rotate","frame":0,"values":[-12.25,0],"curve":"linear"},
            {"bone":right,"channel":"translate","frame":12,"values":[3,8],"curve":"linear"}
        ]}),
    );
    let before = s
        .save_snapshot(s.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    assert!(!before.dirty);
    assert_eq!(before.constraints[0]["name"], "Left arm_physics");
    assert_eq!(before.constraints[1]["name"], "Custom spring");
    let model = scene_model(&s);
    let before_payload = encode_scene_payload(&model).unwrap();
    let before_summary = serde_json::to_value(&before).unwrap();
    let batch = |renames| RigEdit::RenameBones { renames };
    let boundary = "é".repeat(512);
    let padded_boundary = format!("\u{2003}{boundary}\u{3000}");
    let swap = || {
        batch(vec![
            rename(left, " \u{2003}Right arm\t"),
            rename(right, "\u{3000}Left arm  "),
            rename(child, &padded_boundary),
        ])
    };

    for invalid in [
        vec![],
        vec![rename(left, "New"), rename(left, "Other")],
        vec![rename(left, "New"), rename(right, "\u{2003}New ")],
        vec![rename(left, "New"), rename(right, "Child")],
        vec![rename(left, "New"), rename(u64::MAX, "Missing")],
        vec![rename(left, "New"), rename(child, " \u{2003}\u{3000} ")],
        vec![rename(left, "New"), rename(child, &"é".repeat(513))],
    ] {
        let error = s.edit(before.revision, batch(invalid)).unwrap_err();
        assert_eq!(error.code, "InvalidSceneEdit");
        assert_eq!(
            serde_json::to_value(s.summary().unwrap()).unwrap(),
            before_summary
        );
        assert_eq!(
            encode_scene_payload(&scene_model(&s)).unwrap(),
            before_payload
        );
    }
    assert_eq!(
        s.edit(before.revision - 1, swap()).unwrap_err().code,
        "ProjectChanged"
    );
    assert_eq!(
        s.edit_in_pose(before.revision, 1, swap()).unwrap_err().code,
        "InvalidPose"
    );
    assert_eq!(
        serde_json::to_value(s.summary().unwrap()).unwrap(),
        before_summary
    );
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        before_payload
    );

    let updated = s.edit(before.revision, swap()).unwrap();
    assert_eq!(updated.revision, before.revision + 1);
    assert!(updated.dirty);
    assert_eq!(
        updated
            .bones
            .iter()
            .map(|bone| (bone.id, bone.parent))
            .collect::<Vec<_>>(),
        before
            .bones
            .iter()
            .map(|bone| (bone.id, bone.parent))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        serde_json::to_value(&updated.animations).unwrap(),
        before_summary["animations"]
    );
    let mut expected_constraints = before.constraints.clone();
    expected_constraints[0]["name"] = json!("Right arm_physics");
    assert_eq!(updated.constraints, expected_constraints);
    let mut expected = model;
    expected.rig.bones[1].name = "Right arm".into();
    expected.rig.bones[2].name = "Left arm".into();
    expected.rig.bones[3].name = boundary;
    let Constraint::Physics(generated) = &mut expected.constraints[0] else {
        panic!("generated Physics constraint");
    };
    generated.name = "Right arm_physics".into();
    let expected_payload = encode_scene_payload(&expected).unwrap();
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        expected_payload
    );

    let undone = s.edit(updated.revision, RigEdit::Undo).unwrap();
    assert!(!undone.dirty);
    assert!(undone.can_redo);
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        before_payload
    );
    let unchanged = s
        .edit(
            undone.revision,
            batch(vec![rename(left, "\u{3000}Left arm ")]),
        )
        .unwrap();
    assert_eq!(unchanged.revision, undone.revision);
    assert!(unchanged.can_redo);
    let redone = s.edit(unchanged.revision, RigEdit::Redo).unwrap();
    assert!(redone.dirty);
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        expected_payload
    );

    let saved = s
        .save_snapshot(s.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    assert!(!saved.dirty);
    let disk_payload = ProjectEnvelope::inspect(std::fs::read(&path).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    assert_eq!(disk_payload, expected_payload);
    s.close(false).unwrap();
    let reopened = s.replace(open_document(path).unwrap(), false).unwrap();
    assert!(!reopened.dirty);
    assert_eq!(
        encode_scene_payload(&scene_model(&s)).unwrap(),
        expected_payload
    );
}
