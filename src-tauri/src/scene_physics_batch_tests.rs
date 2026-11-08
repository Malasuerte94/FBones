//! User-requested native creation/naming policies, not new original observations.
use super::*;
use crate::rig::RigEdit;
use fbones_format::minimal::{
    scene::{
        decode_scene, encode_scene_payload, IkConstraint, PhysicsConstraint, TransformConstraint,
    },
    MinimalProject,
};

fn project() -> SceneProject {
    let mut rig = MinimalProject::new("own batch".into(), [0; 16]);
    rig.bones[0].name = "A".into();
    rig.bones[0].length = 30.;
    for (i, name) in ["B", "C", "D", "zero"].into_iter().enumerate() {
        let mut bone = Bone::root();
        bone.name = name.into();
        bone.parent = Some(if i == 3 { 0 } else { i });
        bone.x = 30.;
        bone.length = if i == 3 { 0. } else { 30. };
        rig.bones.push(bone);
    }
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
        constraints: vec![],
    }
}
fn batch(h: &mut SceneHistory, bones: &[u64]) -> Result<bool, AppError> {
    h.apply(SceneEdit::Rig(
        serde_json::from_value(serde_json::json!({
            "type": "addPhysicsToBones", "bones": bones,
        }))
        .unwrap(),
    ))
}
fn physics(h: &SceneHistory, id: u64) -> &PhysicsConstraint {
    let index = h.frame.constraint_index(id).unwrap();
    let Constraint::Physics(c) = &h.frame.project.constraints[index] else {
        panic!("own Physics")
    };
    c
}
fn set_name(h: &mut SceneHistory, id: u64, name: &str, rig_path: bool) {
    let mut bone = h.frame.project.rig.bones[h.frame.bone_index(id).unwrap()].clone();
    bone.name = name.into();
    let edit = if rig_path {
        SceneEdit::Rig(RigEdit::Update {
            id,
            name: bone.name,
            x: bone.x,
            y: bone.y,
            rotation: bone.rotation,
            length: bone.length,
            scale_x: None,
            scale_y: None,
            shear_x: None,
            shear_y: None,
        })
    } else {
        SceneEdit::SetBone { id, bone }
    };
    h.apply(edit).unwrap();
}

#[test]
fn physics_batch_parent_first_presets_and_one_history_transaction() {
    let mut h = SceneHistory::new(project(), true).unwrap();
    let initial = h.frame.project.clone();
    assert!(batch(&mut h, &[3, 1, 2, 4]).unwrap());
    assert_eq!(h.frame.constraint_ids, vec![0, 1, 2, 3]);
    for (id, name, bone) in [
        (0, "B_physics", 1),
        (1, "C_physics", 2),
        (2, "D_physics", 3),
    ] {
        let c = physics(&h, id);
        assert_eq!((&*c.name, c.bone), (name, bone));
        assert_eq!(c.angular.effective(), [1., 0.]);
        assert_eq!((c.x, c.y, c.scale_x), (0., 0., 0.));
        assert_eq!(
            (c.inertia, c.strength, c.damping, c.mass),
            (1., 100., 0.85, 1.)
        );
        assert_eq!(
            (c.step, c.mix, c.wind, c.gravity, c.limit),
            (1. / 60., 1., 0., 0., 5000.)
        );
    }
    let zero = physics(&h, 3);
    assert_eq!(
        (zero.x, zero.y, zero.angular.effective()),
        (1., 1., [0., 0.])
    );
    assert_eq!(zero.angular.wire_bits(), (0x7fc00000, 0));
    let unchanged_defaults = PhysicsConstraint::new("loaded inactive".into(), 1);
    assert_eq!(
        (
            unchanged_defaults.x,
            unchanged_defaults.y,
            unchanged_defaults.inertia
        ),
        (0., 0., 0.5)
    );
    assert_eq!(unchanged_defaults.angular.wire_bits(), (0x7fc00000, 0));
    let after = h.frame.project.clone();
    let metadata = h.frame.auto_physics_names.clone();
    assert_eq!(h.undo.len(), 1);
    h.apply(SceneEdit::Undo).unwrap();
    assert_eq!(h.frame.project, initial);
    assert!(h.frame.auto_physics_names.is_empty());
    assert!(!h.can_undo());
    h.apply(SceneEdit::Redo).unwrap();
    assert_eq!(h.frame.project, after);
    assert_eq!(h.frame.auto_physics_names, metadata);
    assert_eq!(h.frame.project.rig, initial.rig);
}

#[test]
fn physics_batch_invalid_inputs_and_capacity_are_atomic_without_consuming_ids() {
    let mut h = SceneHistory::new(project(), true).unwrap();
    for bones in [vec![], vec![1, 1], vec![1, u64::MAX], vec![0; 129]] {
        let before = encode_scene_payload(&h.frame.project).unwrap();
        assert!(batch(&mut h, &bones).is_err());
        assert_eq!(encode_scene_payload(&h.frame.project).unwrap(), before);
        assert_eq!(h.ids.constraint, 0);
        assert!(h.frame.auto_physics_names.is_empty());
        assert!(!h.can_undo());
        assert!(!h.dirty());
    }
    let mut source = project();
    source.constraints = (0..127)
        .map(|i| Constraint::Physics(PhysicsConstraint::new(format!("loaded{i}"), 0)))
        .collect();
    let mut h = SceneHistory::new(source.clone(), true).unwrap();
    assert!(batch(&mut h, &[1, 2]).is_err());
    assert_eq!(h.frame.project, source);
    assert_eq!(h.ids.constraint, 127);
    assert!(!h.can_undo());
    batch(&mut h, &[1]).unwrap();
    assert_eq!(h.frame.project.constraints.len(), 128);
    assert_eq!(&h.frame.project.constraints[..127], &source.constraints);
    assert_eq!(h.frame.constraint_ids[127], 127);
    assert!(batch(&mut h, &[2]).is_err());
    assert_eq!(h.frame.project.constraints.len(), 128);
    assert_eq!(h.ids.constraint, 128);
}

#[test]
fn physics_batch_all_kind_collisions_and_existing_same_bone_are_allowed() {
    let mut source = project();
    source.constraints.push(Constraint::Ik(IkConstraint::new(
        "B_physics".into(),
        vec![1],
        0,
    )));
    source
        .constraints
        .push(Constraint::Transform(TransformConstraint::new(
            "B_physics2".into(),
            vec![1],
            0,
        )));
    let mut inactive = PhysicsConstraint::new("custom inactive".into(), 1);
    inactive.gravity = -2.375;
    source.constraints.push(Constraint::Physics(inactive));
    let mut h = SceneHistory::new(source.clone(), true).unwrap();
    batch(&mut h, &[1]).unwrap();
    batch(&mut h, &[1]).unwrap();
    assert_eq!(physics(&h, 3).name, "B_physics3");
    assert_eq!(physics(&h, 4).name, "B_physics4");
    assert_eq!(&h.frame.project.constraints[..3], &source.constraints);
}

#[test]
fn physics_batch_bone_rename_follows_both_native_paths_custom_names_detach_with_history() {
    let mut h = SceneHistory::new(project(), true).unwrap();
    batch(&mut h, &[1]).unwrap();
    batch(&mut h, &[1]).unwrap();
    let mut custom = physics(&h, 1).clone();
    custom.name = "B_physics9".into();
    h.apply(SceneEdit::SetConstraint {
        id: 1,
        constraint: Constraint::Physics(custom.clone()),
    })
    .unwrap();
    assert!(!h.frame.auto_physics_names.contains_key(&1));
    let mut collision = PhysicsConstraint::new("Hair_physics".into(), 2);
    collision.gravity = 2.;
    h.apply(SceneEdit::AddConstraint {
        constraint: Constraint::Physics(collision.clone()),
    })
    .unwrap();
    let before = h.frame.project.clone();
    let old = physics(&h, 0).clone();
    set_name(&mut h, 1, "Hair", false);
    assert_eq!(physics(&h, 0).name, "Hair_physics2");
    let mut restored = physics(&h, 0).clone();
    restored.name = old.name.clone();
    assert_eq!(restored, old);
    assert_eq!(physics(&h, 1), &custom);
    assert_eq!(physics(&h, 2), &collision);
    h.apply(SceneEdit::Undo).unwrap();
    assert_eq!(h.frame.project, before);
    h.apply(SceneEdit::Redo).unwrap();
    set_name(&mut h, 1, "Ribbon", true);
    assert_eq!(physics(&h, 0).name, "Ribbon_physics");
    assert_eq!(physics(&h, 1), &custom);
    let mut reassigned = physics(&h, 0).clone();
    reassigned.bone = 2;
    h.apply(SceneEdit::SetConstraint {
        id: 0,
        constraint: Constraint::Physics(reassigned),
    })
    .unwrap();
    assert!(!h.frame.auto_physics_names.contains_key(&0));
    set_name(&mut h, 2, "New member", true);
    assert_eq!(physics(&h, 0).name, "Ribbon_physics");
}

#[test]
fn physics_batch_save_reopen_infers_only_exact_generated_convention() {
    let mut source = project();
    for name in [
        "B_physics",
        "B_physics2",
        "B_physics1",
        "B_physics02",
        "B_physics_custom",
        "cloth",
    ] {
        source
            .constraints
            .push(Constraint::Physics(PhysicsConstraint::new(name.into(), 1)));
    }
    let bytes = encode_scene_payload(&source).unwrap();
    let reopened = decode_scene(&bytes).unwrap();
    let mut h = SceneHistory::new(reopened, true).unwrap();
    assert_eq!(h.frame.auto_physics_names.len(), 2);
    set_name(&mut h, 1, "Hair", true);
    assert_eq!(physics(&h, 0).name, "Hair_physics");
    assert_eq!(physics(&h, 1).name, "Hair_physics2");
    for (id, name) in [
        (2, "B_physics1"),
        (3, "B_physics02"),
        (4, "B_physics_custom"),
        (5, "cloth"),
    ] {
        assert_eq!(physics(&h, id).name, name);
    }
    let saved = encode_scene_payload(&h.frame.project).unwrap();
    let mut h = SceneHistory::new(decode_scene(&saved).unwrap(), true).unwrap();
    set_name(&mut h, 1, "Hair again", false);
    assert_eq!(physics(&h, 0).name, "Hair again_physics");
    assert_eq!(physics(&h, 1).name, "Hair again_physics2");
}

#[test]
fn physics_batch_unicode_names_stay_bounded_and_follow_after_reopen() {
    let mut source = project();
    source.rig.bones[1].name = "é".repeat(512);
    let mut h = SceneHistory::new(source, true).unwrap();
    batch(&mut h, &[1]).unwrap();
    batch(&mut h, &[1]).unwrap();
    for id in [0, 1] {
        assert!(physics(&h, id).name.len() <= 1024);
        assert!(physics(&h, id).name.starts_with('é'));
    }
    assert!(physics(&h, 0).name.ends_with("_physics"));
    assert!(physics(&h, 1).name.ends_with("_physics2"));
    let bytes = encode_scene_payload(&h.frame.project).unwrap();
    let mut h = SceneHistory::new(decode_scene(&bytes).unwrap(), true).unwrap();
    assert_eq!(h.frame.auto_physics_names.len(), 2);
    set_name(&mut h, 1, &"骨".repeat(341), true);
    for id in [0, 1] {
        assert!(physics(&h, id).name.len() <= 1024);
        assert!(physics(&h, id).name.starts_with('骨'));
    }
    assert_ne!(physics(&h, 0).name, physics(&h, 1).name);
}

#[test]
fn physics_batch_auto_ownership_survives_constraint_and_bone_reorder() {
    let mut source = project();
    source.rig.bones[3].parent = Some(0);
    let mut h = SceneHistory::new(source, true).unwrap();
    batch(&mut h, &[2, 1]).unwrap();
    h.apply(SceneEdit::ReorderConstraint { id: 0, index: 1 })
        .unwrap();
    h.apply(SceneEdit::Rig(RigEdit::Reparent { id: 2, parent: 3 }))
        .unwrap();
    assert_ne!(h.frame.bone_index(2).unwrap(), 2);
    set_name(&mut h, 2, "Knot", false);
    assert_eq!(physics(&h, 1).name, "Knot_physics");
    assert_eq!(h.frame.bone_ids[physics(&h, 1).bone], 2);
    assert_eq!(physics(&h, 0).name, "B_physics");
    assert_eq!(h.frame.auto_physics_names.len(), 2);
}
