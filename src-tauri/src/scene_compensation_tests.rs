use super::*;
use crate::solve::{Affine, LocalPose};
use fbones_format::minimal::Bone;

fn translate(id: u64, dx: f64, dy: f64, bones: bool, images: bool) -> RigEdit {
    RigEdit::TranslateBoneWithCompensation {
        id,
        dx,
        dy,
        compensate_bones: bones,
        compensate_images: images,
    }
}

fn set_parent_x(id: u64, x: f32, bones: bool, images: bool) -> RigEdit {
    serde_json::from_value(serde_json::json!({
        "type": "setBoneParentPosition",
        "id": id,
        "x": x,
        "compensateBones": bones,
        "compensateImages": images,
    }))
    .unwrap()
}

fn set_local_position(id: u64, [x, y]: [Option<f64>; 2], bones: bool, images: bool) -> RigEdit {
    let mut edit = serde_json::json!({"type":"setBoneLocalPosition","id":id});
    for (axis, value) in [("x", x), ("y", y)] {
        if let Some(value) = value {
            edit[axis] = serde_json::json!(value);
        }
    }
    if bones {
        edit["compensateBones"] = serde_json::json!(true);
    }
    if images {
        edit["compensateImages"] = serde_json::json!(true);
    }
    serde_json::from_value(edit).unwrap()
}

fn rotate(id: u64, mode: &str, angle: f64, bones: bool, images: bool) -> RigEdit {
    serde_json::from_value(serde_json::json!({
        "type": "rotateBoneWithCompensation",
        "id": id,
        "mode": mode,
        "angle": angle,
        "compensateBones": bones,
        "compensateImages": images,
    }))
    .unwrap()
}

fn set_world_rotation(id: u64, angle: f64, bones: bool, images: bool) -> RigEdit {
    let mut edit = serde_json::json!({ "type": "setBoneWorldRotation", "id": id, "angle": angle });
    if bones {
        edit["compensateBones"] = serde_json::json!(true);
    }
    if images {
        edit["compensateImages"] = serde_json::json!(true);
    }
    serde_json::from_value(edit).unwrap()
}

fn scale(id: u64, mode: &str, axes: [Option<f32>; 2], bones: bool, images: bool) -> RigEdit {
    let mut edit = serde_json::json!({
        "type": "scaleBoneWithCompensation",
        "id": id,
        "mode": mode,
        "compensateBones": bones,
        "compensateImages": images,
    });
    for (axis, value) in ["x", "y"].into_iter().zip(axes) {
        if let Some(value) = value {
            edit[axis] = serde_json::json!(value);
        }
    }
    serde_json::from_value(edit).unwrap()
}

fn shear(id: u64, mode: &str, axis: &str, angle: f32, bones: bool, images: bool) -> RigEdit {
    serde_json::from_value(serde_json::json!({
        "type": "shearBoneWithCompensation",
        "id": id,
        "mode": mode,
        "axis": axis,
        "angle": angle,
        "compensateBones": bones,
        "compensateImages": images,
    }))
    .unwrap()
}

fn precise_world(bones: &[Bone]) -> Vec<Affine> {
    let mut world = Vec::with_capacity(bones.len());
    for bone in bones {
        let parent = bone.parent.map_or(Affine::IDENTITY, |index| world[index]);
        world.push(parent.compose(LocalPose::from(bone).affine()));
    }
    world
}

fn assert_world_affine(actual: Affine, expected: Affine) {
    for (actual, expected) in [
        (actual.point(0., 0.), expected.point(0., 0.)),
        (actual.vector(1., 0.), expected.vector(1., 0.)),
        (actual.vector(0., 1.), expected.vector(0., 1.)),
    ] {
        assert!(
            (actual.0 - expected.0).hypot(actual.1 - expected.1) < 0.0001,
            "{actual:?} != {expected:?}"
        );
    }
}

#[test]
fn setup_compensation_toggles_hold_child_or_region_world_geometry_and_share_one_undo() {
    let (_dir, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let parent = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":parent,"name":"parent","x":8,"y":4,"rotation":90,"length":30,"scaleX":1,"scaleY":1,"shearX":0,"shearY":-0.0}),
    );
    let p = add_bone(&s, &p, parent);
    let child = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":child,"name":"child","x":5,"y":2,"rotation":12,"length":30,"scaleX":1,"scaleY":1,"shearX":0,"shearY":0}),
    );
    let p = add_bone(&s, &p, child);
    let p = s
        .place_images(p.revision, &["A".into()], parent, 9., 7.)
        .unwrap();
    let slot = p.slots[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    let p = s
        .place_images(p.revision, &["nested/C".into()], child, 10., 20.)
        .unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createAnimation","name":"keep keys"}),
    );
    let clip = p.animations[0].id;
    let mut p = command(
        &s,
        &p,
        serde_json::json!({"type":"setAnimationKey","animation":clip,"bone":child,"channel":"translate","frame":5,"values":[1,2],"curve":"linear"}),
    );
    let before = scene_model(&s);
    let before_bytes = encode_scene_payload(&before).unwrap();
    let old_world = crate::rig::poses(&before.rig.bones);
    let old_keys = serde_json::to_value(&p.animations).unwrap();
    let ids = inventory_ids(&s);

    for (bones, images) in [(true, false), (false, true), (true, true)] {
        p = command(
            &s,
            &p,
            serde_json::json!({"type":"translateBoneWithCompensation","id":parent,"dx":6,"dy":-4,"compensateBones":bones,"compensateImages":images}),
        );
        let after = scene_model(&s);
        let new_world = crate::rig::poses(&after.rig.bones);
        assert_eq!((after.rig.bones[1].x, after.rig.bones[1].y), (14., 0.));
        assert_eq!(after.rig.bones[1].shear_y.to_bits(), (-0.0_f32).to_bits());
        if bones {
            assert_eq!((after.rig.bones[2].x, after.rig.bones[2].y), (9., 8.));
        } else {
            assert_eq!(after.rig.bones[2], before.rig.bones[2]);
        }
        for index in [2, 3] {
            let shift = if bones { [0., 0.] } else { [6., -4.] };
            same_world_points(
                &[[old_world[index].x + shift[0], old_world[index].y + shift[1]]],
                &[[new_world[index].x, new_world[index].y]],
            );
        }
        assert_eq!(after.rig.bones[3], before.rig.bones[3]);
        for (slot_index, old_slot) in before.slots.iter().enumerate() {
            let new_slot = &after.slots[slot_index];
            let preserved = if slot_index == 0 { images } else { bones };
            assert_eq!(old_slot.active_attachment, new_slot.active_attachment);
            for (old, new) in old_slot.attachments.iter().zip(&new_slot.attachments) {
                let shift = if preserved { [0., 0.] } else { [6., -4.] };
                let expected = geometry_points(old, old_slot.bone, &old_world)
                    .into_iter()
                    .map(|[x, y]| [x + shift[0], y + shift[1]])
                    .collect::<Vec<_>>();
                same_world_points(&expected, &geometry_points(new, new_slot.bone, &new_world));
                let mut expected = old.clone();
                if slot_index == 0 && images {
                    let region = expected.image_mut().unwrap();
                    region.x += 4.;
                    region.y += 6.;
                }
                assert_eq!(&expected, new);
            }
        }
        assert_eq!(serde_json::to_value(&p.animations).unwrap(), old_keys);
        assert_eq!(inventory_ids(&s), ids);
        let bytes = encode_scene_payload(&after).unwrap();
        assert_eq!(
            encode_scene_payload(&decode_scene(&bytes).unwrap()).unwrap(),
            bytes
        );
        p = s.edit(p.revision, RigEdit::Undo).unwrap();
        assert_eq!(
            encode_scene_payload(&scene_model(&s)).unwrap(),
            before_bytes
        );
    }
}

#[test]
fn setup_numeric_compensation_preserves_exact_axis_and_independent_layers() {
    let (_dir, session, project) = setup();
    let project = add_bone(&session, &project, 0);
    let parent = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":parent,"name":"reflected parent","x":12,"y":-3,"rotation":29,"length":20,"scaleX":-1.5,"scaleY":0.6,"shearX":2,"shearY":-11}),
    );
    let project = add_bone(&session, &project, parent);
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"edited bone","x":4.5,"y":-0.0,"rotation":17,"length":30,"scaleX":0.75,"scaleY":1.25,"shearX":3,"shearY":-0.0}),
    );
    let project = add_bone(&session, &project, selected);
    let project = session
        .place_images(project.revision, &["A".into()], selected, 10., 20.)
        .unwrap();
    let slot = project.slots[0].id;
    let mut project = session
        .place_attachments(project.revision, &["B".into()], slot)
        .unwrap();
    let before = scene_model(&session);
    let bytes = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = bytes();
    let stable_ids = inventory_ids(&session);
    let old_world = crate::rig::poses(&before.rig.bones);
    let edited_x = f32::from_bits(0xc08a_1234);
    let local_dx = edited_x - before.rig.bones[2].x;
    let world_dx = old_world[1].a * local_dx;
    let world_dy = old_world[1].b * local_dx;
    assert!(world_dx.abs() > 1. && world_dy.abs() > 1.);
    assert_eq!(before.rig.bones[2].y.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(before.slots[0].attachments.len(), 2);
    assert!(before.slots[0].active_attachment.is_some());

    let present = serde_json::to_value(&project).unwrap();
    assert_eq!(
        session
            .edit(
                project.revision - 1,
                set_parent_x(selected, edited_x, true, true)
            )
            .unwrap_err()
            .code,
        "ProjectChanged"
    );
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        present
    );
    assert_eq!(bytes(), before_bytes);

    for (bones, images) in [(false, false), (true, false), (false, true), (true, true)] {
        let moved = session
            .edit(
                project.revision,
                set_parent_x(selected, edited_x, bones, images),
            )
            .unwrap();
        assert_eq!(moved.revision, project.revision + 1);
        assert_eq!(moved.edited_bone, Some(selected));
        let after = scene_model(&session);
        let mut expected_bone = before.rig.bones[2].clone();
        expected_bone.x = edited_x;
        assert_eq!(after.rig.bones[2], expected_bone);
        assert_eq!(after.rig.bones[2].x.to_bits(), edited_x.to_bits());
        assert_eq!(after.rig.bones[2].y.to_bits(), (-0.0_f32).to_bits());
        assert_eq!(after.rig.bones[2].shear_y.to_bits(), (-0.0_f32).to_bits());
        assert_eq!(&after.rig.bones[..2], &before.rig.bones[..2]);

        let new_world = crate::rig::poses(&after.rig.bones);
        let (child_dx, child_dy) = if bones {
            (0., 0.)
        } else {
            (world_dx, world_dy)
        };
        same_world_points(
            &[[old_world[3].x + child_dx, old_world[3].y + child_dy]],
            &[[new_world[3].x, new_world[3].y]],
        );
        if !bones {
            assert_eq!(after.rig.bones[3], before.rig.bones[3]);
        }
        let old = &before.slots[0];
        let new = &after.slots[0];
        assert_eq!(old.active_attachment, new.active_attachment);
        let (image_dx, image_dy) = if images {
            (0., 0.)
        } else {
            (world_dx, world_dy)
        };
        for (old_attachment, new_attachment) in old.attachments.iter().zip(&new.attachments) {
            let expected = geometry_points(old_attachment, old.bone, &old_world)
                .into_iter()
                .map(|[x, y]| [x + image_dx, y + image_dy])
                .collect::<Vec<_>>();
            same_world_points(
                &expected,
                &geometry_points(new_attachment, new.bone, &new_world),
            );
        }
        if !images {
            assert_eq!(new.attachments, old.attachments);
        }
        assert_eq!(inventory_ids(&session), stable_ids);
        let after_bytes = bytes();
        let repeated = session
            .edit(
                moved.revision,
                set_parent_x(selected, edited_x, bones, images),
            )
            .unwrap();
        assert_eq!(repeated.revision, moved.revision);
        assert_eq!(bytes(), after_bytes);
        let undone = session.edit(repeated.revision, RigEdit::Undo).unwrap();
        assert_eq!(bytes(), before_bytes);
        let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
        assert_eq!(bytes(), after_bytes);
        project = session.edit(redone.revision, RigEdit::Undo).unwrap();
        assert_eq!(bytes(), before_bytes);
    }

    let constrained = command(
        &session,
        &project,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"spring","bone":selected}}),
    );
    let constrained_bytes = bytes();
    let before_rejection = serde_json::to_value(&constrained).unwrap();
    assert_eq!(
        session
            .edit(
                constrained.revision,
                set_parent_x(selected, edited_x, true, true)
            )
            .unwrap_err()
            .code,
        "InvalidSceneEdit"
    );
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        before_rejection
    );
    assert_eq!(bytes(), constrained_bytes);
}

#[test]
fn setup_world_position_keeps_the_unrounded_other_axis_with_each_compensation_mode() {
    use crate::solve::{Affine, LocalPose};
    use fbones_format::minimal::Bone;

    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":20,"y":900000,"rotation":30,"length":30,"scaleX":-2,"scaleY":3}),
    );
    let project = add_bone(&session, &project, root);
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"selected","x":5.125,"y":1.5,"rotation":17,"length":30}),
    );
    let project = add_bone(&session, &project, selected);
    let project = session
        .place_images(project.revision, &["A".into()], selected, 11., 899_996.)
        .unwrap();
    let slot = project.slots[0].id;
    let mut project = session
        .place_attachments(project.revision, &["B".into()], slot)
        .unwrap();

    let positions = |bones: &[Bone]| {
        let parent = LocalPose::from(&bones[0]).affine();
        let owner = parent.compose(LocalPose::from(&bones[1]).affine());
        let child = owner.compose(LocalPose::from(&bones[2]).affine());
        (owner, child)
    };
    let region_center = |owner: Affine, attachment: &SceneAttachment| {
        let region = attachment.image().unwrap();
        owner.point(f64::from(region.x), f64::from(region.y))
    };
    let edit = |axis: &str, position: f64, bones: bool, images: bool| -> RigEdit {
        let mut value = serde_json::json!({
            "type": "setBoneWorldPosition", "id": selected, "axis": axis, "position": position,
        });
        if bones {
            value["compensateBones"] = serde_json::json!(true);
        }
        if images {
            value["compensateImages"] = serde_json::json!(true);
        }
        serde_json::from_value(value).unwrap()
    };
    let assert_position = |actual: (f64, f64), expected: (f64, f64)| {
        assert!(
            (actual.0 - expected.0).hypot(actual.1 - expected.1) < 0.00001,
            "{actual:?} != {expected:?}"
        );
    };
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before = scene_model(&session);
    let old_slot = &before.slots[0];
    let (owner, child) = positions(&before.rig.bones);
    assert_eq!(old_slot.attachments.len(), 2);
    assert!(old_slot.active_attachment.is_some());
    assert!((owner.y - 899_998.772_114_317).abs() < 0.00001);
    assert_eq!(owner.y as f32, 899_998.75);
    let target_x = 30.25;
    let target_y = 900_004.02;
    assert!((target_y - f64::from(target_y as f32)).abs() > 0.01);

    let summary = serde_json::to_value(&project).unwrap();
    for (revision, command, error) in [
        (
            project.revision - 1,
            edit("x", target_x, true, true),
            "ProjectChanged",
        ),
        (
            project.revision,
            edit("x", 100_000_000., true, true),
            "InvalidSceneEdit",
        ),
    ] {
        assert_eq!(session.edit(revision, command).unwrap_err().code, error);
        assert_eq!(
            serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
            summary
        );
        assert_eq!(payload(), before_bytes);
    }

    for (axis, target, bones, images) in [
        ("x", target_x, false, false),
        ("x", target_x, true, false),
        ("x", target_x, false, true),
        ("x", target_x, true, true),
        ("y", target_y, true, true),
    ] {
        let moved = session
            .edit(project.revision, edit(axis, target, bones, images))
            .unwrap();
        assert_eq!(moved.revision, project.revision + 1);
        assert_eq!(moved.edited_bone, Some(selected));
        let after = scene_model(&session);
        let (new_owner, new_child) = positions(&after.rig.bones);
        assert_position(
            (new_owner.x, new_owner.y),
            if axis == "x" {
                (target, owner.y)
            } else {
                (owner.x, target)
            },
        );
        let mut expected_owner = before.rig.bones[1].clone();
        assert_ne!(after.rig.bones[1].x, expected_owner.x);
        assert_ne!(after.rig.bones[1].y, expected_owner.y);
        (expected_owner.x, expected_owner.y) = (after.rig.bones[1].x, after.rig.bones[1].y);
        assert_eq!(after.rig.bones[1], expected_owner);
        assert_eq!(after.rig.bones[0], before.rig.bones[0]);
        let delta = (new_owner.x - owner.x, new_owner.y - owner.y);
        let expected = |x, y, compensated| {
            if compensated {
                (x, y)
            } else {
                (x + delta.0, y + delta.1)
            }
        };
        assert_position(
            (new_child.x, new_child.y),
            expected(child.x, child.y, bones),
        );
        let mut expected_child = before.rig.bones[2].clone();
        if bones {
            (expected_child.x, expected_child.y) = (after.rig.bones[2].x, after.rig.bones[2].y);
        }
        assert_eq!(after.rig.bones[2], expected_child);
        let slot = &after.slots[0];
        assert_eq!(slot.active_attachment, old_slot.active_attachment);
        assert_eq!(slot.attachments.len(), old_slot.attachments.len());
        for (old, new) in old_slot.attachments.iter().zip(&slot.attachments) {
            let (x, y) = region_center(owner, old);
            assert_position(region_center(new_owner, new), expected(x, y, images));
            let mut expected_attachment = old.clone();
            if images {
                let original = expected_attachment.image_mut().unwrap();
                let positioned = new.image().unwrap();
                (original.x, original.y) = (positioned.x, positioned.y);
            }
            assert_eq!(&expected_attachment, new);
        }
        project = session.edit(moved.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), before_bytes);
    }
}

#[test]
fn setup_local_parent_and_world_translate_x_use_distinct_origins_and_axes() {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":10,"y":4,"rotation":90,"length":20}),
    );
    let mut project = command(
        &session,
        &project,
        serde_json::json!({"type":"create","parent":root,"x":5,"y":2,"rotation":90,"length":20}),
    );
    let selected = project.edited_bone.unwrap();
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before = scene_model(&session);
    let world = precise_world(&before.rig.bones);
    assert!((world[1].x - 8.).hypot(world[1].y - 9.) < 1e-10);
    let world_edit = serde_json::from_value(
        serde_json::json!({"type":"setBoneWorldPosition","id":selected,"axis":"x","position":10}),
    )
    .unwrap();
    // The same +2 in Local (2,-5), Parent (5,2) and World (8,9)
    // points left, up and right respectively in the scene.
    for (edit, [x, y]) in [
        (
            set_local_position(selected, [Some(4.), None], false, false),
            [6., 9.],
        ),
        (set_parent_x(selected, 7., false, false), [8., 11.]),
        (world_edit, [10., 9.]),
    ] {
        let moved = session.edit(project.revision, edit).unwrap();
        assert_eq!(moved.revision, project.revision + 1);
        assert_eq!(moved.edited_bone, Some(selected));
        let actual = precise_world(&scene_model(&session).rig.bones)[1];
        assert_world_affine(actual, Affine { x, y, ..world[1] });
        project = session.edit(moved.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), before_bytes);
    }

    // Root Local coordinates use the scene origin as their reference.
    let root_fixture = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":3,"y":4,"rotation":90,"length":20}),
    );
    let root_bytes = payload();
    let moved = session
        .edit(
            root_fixture.revision,
            set_local_position(root, [Some(5.), None], false, false),
        )
        .unwrap();
    assert_eq!(moved.revision, root_fixture.revision + 1);
    assert_eq!((moved.bones[0].x, moved.bones[0].y), (3., 5.));
    let undone = session.edit(moved.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), root_bytes);

    let identity_root = command(
        &session,
        &undone,
        serde_json::json!({"type":"update","id":root,"name":"root","x":0,"y":2,"rotation":0,"length":20}),
    );
    let identity_bytes = payload();
    let unchanged = session
        .edit(
            identity_root.revision,
            set_local_position(root, [Some(0.), None], false, false),
        )
        .unwrap();
    assert_eq!(unchanged.revision, identity_root.revision);
    assert_eq!(payload(), identity_bytes);
}

#[test]
fn setup_local_translate_solves_oblique_reflected_axes_and_preserves_the_omitted_coordinate() {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":40,"y":-30,"rotation":0,"length":30,"scaleX":-2,"scaleY":1,"shearY":30}),
    );
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"create","parent":root,"x":5,"y":4,"rotation":30,"length":30}),
    );
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"signed owner","x":5,"y":4,"rotation":30,"length":30,"scaleX":-1.5,"scaleY":0.75,"shearX":-0.0}),
    );
    let project = add_bone(&session, &project, selected);
    let mut project = session
        .place_images(project.revision, &["A".into()], selected, 30., -25.)
        .unwrap();
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before = scene_model(&session);
    let old_world = precise_world(&before.rig.bones);
    let old_slot = &before.slots[0];
    let old_region = &old_slot.attachments[0];
    let old_corners = geometry_points(
        old_region,
        old_slot.bone,
        &crate::rig::poses(&before.rig.bones),
    );
    let local = |world: &[Affine]| {
        let parent = world[0];
        let selected = world[1];
        let (x, y) = (selected.x - parent.x, selected.y - parent.y);
        // Independent unit columns from the closed-form fixture. Their dot
        // projections are (-12.462846..., -4.473276...), not coordinates.
        let (a, b, c, d) = (
            0.976_957_698_825_923_6,
            -0.213_433_021_589_340_6,
            0.603_050_160_746_813_8,
            0.797_703_267_903_073,
        );
        let denominator = a * d - b * c;
        ((d * x - c * y) / denominator, (a * y - b * x) / denominator)
    };
    let (initial_x, initial_y) = local(&old_world);
    assert!((initial_x - (-12.842_555_399_221_936)).abs() < 1e-10);
    assert!((initial_y - 0.906_447_598_308_166_8).abs() < 1e-10);

    let before_summary = serde_json::to_value(&project).unwrap();
    for (revision, edit, error) in [
        (
            project.revision - 1,
            set_local_position(selected, [Some(-10.), None], true, true),
            "ProjectChanged",
        ),
        (
            project.revision,
            set_local_position(selected, [None, None], false, false),
            "InvalidSceneEdit",
        ),
        (
            project.revision,
            set_local_position(selected, [Some(1e30), None], false, false),
            "InvalidSceneEdit",
        ),
    ] {
        assert_eq!(session.edit(revision, edit).unwrap_err().code, error);
        assert_eq!(
            serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
            before_summary
        );
        assert_eq!(payload(), before_bytes);
    }

    for (axes, bones, images) in [
        ([Some(-10.), None], false, false),
        ([Some(-10.), None], true, true),
        ([None, Some(2.)], true, false),
        ([Some(-10.), Some(2.)], false, true),
    ] {
        let moved = session
            .edit(
                project.revision,
                set_local_position(selected, axes, bones, images),
            )
            .unwrap();
        assert_eq!(moved.revision, project.revision + 1);
        let after = scene_model(&session);
        let owner = &after.rig.bones[1];
        if axes == [Some(-10.), None] {
            assert_eq!(owner.x.to_bits(), 3.786_609_6_f32.to_bits());
            assert_eq!(owner.y.to_bits(), 3.299_448_7_f32.to_bits());
        }
        let mut expected_owner = before.rig.bones[1].clone();
        (expected_owner.x, expected_owner.y) = (owner.x, owner.y);
        assert_eq!(owner, &expected_owner);
        assert_eq!(owner.shear_x.to_bits(), (-0.0_f32).to_bits());
        let new_world = precise_world(&after.rig.bones);
        let (x, y) = local(&new_world);
        assert!((x - axes[0].unwrap_or(initial_x)).abs() < 0.00001);
        assert!((y - axes[1].unwrap_or(initial_y)).abs() < 0.00001);
        if bones {
            assert_world_affine(new_world[2], old_world[2]);
        } else {
            assert_eq!(after.rig.bones[2], before.rig.bones[2]);
        }
        let slot = &after.slots[0];
        assert_eq!(slot.active_attachment, old_slot.active_attachment);
        if images {
            same_world_points(
                &old_corners,
                &geometry_points(
                    &slot.attachments[0],
                    slot.bone,
                    &crate::rig::poses(&after.rig.bones),
                ),
            );
        } else {
            assert_eq!(&slot.attachments[0], old_region);
        }
        let moved_bytes = payload();
        let no_op = session
            .edit(
                moved.revision,
                set_local_position(selected, axes, bones, images),
            )
            .unwrap();
        assert_eq!(no_op.revision, moved.revision);
        assert_eq!(payload(), moved_bytes);
        project = session.edit(moved.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), before_bytes);
    }

    // A +0.005 Local X move changes authored X by ~0.00138675. At
    // 131072, authored Y rounds away, leaking ~0.00416 into omitted Local Y.
    let anisotropic = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":40,"y":-30,"rotation":0,"length":30,"scaleX":-2,"scaleY":3,"shearY":0}),
    );
    let drift = command(
        &session,
        &anisotropic,
        serde_json::json!({"type":"update","id":selected,"name":"signed owner","x":0,"y":131072,"rotation":0,"length":30,"scaleX":1,"scaleY":1,"shearX":45,"shearY":0}),
    );
    let drift_bytes = payload();
    let error = session
        .edit(
            drift.revision,
            set_local_position(selected, [Some(0.005), None], false, false),
        )
        .unwrap_err();
    assert_eq!(error.code, "InvalidSceneEdit");
    assert!(error.message.contains("other bone axis"));
    assert_eq!(session.summary().unwrap().unwrap().revision, drift.revision);
    assert_eq!(payload(), drift_bytes);
}

#[test]
fn setup_rotate_preserves_reflected_child_affines_and_signed_region_corners() {
    let (_dir, session, project) = setup();
    let project = add_bone(&session, &project, 0);
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"reflected owner","x":8,"y":4,"rotation":0,"length":30,"scaleX":-2,"scaleY":2,"shearX":-0.0,"shearY":0}),
    );
    let project = add_bone(&session, &project, selected);
    let child = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":child,"name":"signed child","x":5,"y":2,"rotation":10,"length":30,"scaleX":-0.8,"scaleY":1.2,"shearX":7,"shearY":-5}),
    );
    let project = add_bone(&session, &project, child);
    let project = session
        .place_images(project.revision, &["A".into()], selected, 15., 10.)
        .unwrap();
    let slot = project.slots[0].id;
    let project = session
        .place_attachments(project.revision, &["B".into()], slot)
        .unwrap();
    let a = project.slots[0].attachments[0].id;
    let b = project.slots[0].attachments[1].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"updateAttachment","id":a,"x":3,"y":-1,"rotation":12,"scaleX":-0.75,"scaleY":1.25}),
    );
    let mut project = command(
        &session,
        &project,
        serde_json::json!({"type":"updateAttachment","id":b,"x":-2,"y":4,"rotation":-17,"scaleX":1.25,"scaleY":-0.75}),
    );
    let before = scene_model(&session);
    let before_bytes = encode_scene_payload(&before).unwrap();
    let ids = inventory_ids(&session);
    let old_world = precise_world(&before.rig.bones);
    let old_render = crate::rig::poses(&before.rig.bones);
    let old_slot = &before.slots[0];
    assert!(old_slot.active_attachment.is_some());
    let mut turned = old_world[1];
    turned.rotate_basis(30.);
    let uncompensated_child = turned.compose(LocalPose::from(&before.rig.bones[2]).affine());
    let uncompensated_grandchild =
        uncompensated_child.compose(LocalPose::from(&before.rig.bones[3]).affine());

    for (bones, images, absolute) in [
        (true, false, false),
        (false, true, false),
        (true, true, false),
        (true, true, true),
    ] {
        let edit = if absolute {
            set_world_rotation(selected, 210., bones, images)
        } else {
            rotate(selected, "worldDelta", 30., bones, images)
        };
        let moved = session.edit(project.revision, edit).unwrap();
        assert_eq!(moved.revision, project.revision + 1);
        assert_eq!(moved.edited_bone, Some(selected));
        let after = scene_model(&session);
        let world = precise_world(&after.rig.bones);
        let render = crate::rig::poses(&after.rig.bones);
        assert_world_affine(world[1], turned);
        assert_eq!(
            after.rig.bones[1].x.to_bits(),
            before.rig.bones[1].x.to_bits()
        );
        assert_eq!(
            after.rig.bones[1].y.to_bits(),
            before.rig.bones[1].y.to_bits()
        );
        assert_eq!(after.rig.bones[1].shear_x.to_bits(), (-0.0_f32).to_bits());
        assert!(after.rig.bones[1].scale_x.is_sign_negative());
        assert!(!after.rig.bones[1].scale_y.is_sign_negative());
        assert_world_affine(
            world[2],
            if bones {
                old_world[2]
            } else {
                uncompensated_child
            },
        );
        assert_world_affine(
            world[3],
            if bones {
                old_world[3]
            } else {
                uncompensated_grandchild
            },
        );
        assert_eq!(after.rig.bones[3], before.rig.bones[3]);
        let corrected_child = &after.rig.bones[2];
        if bones {
            assert!((corrected_child.x - 3.330_127).abs() < 0.0001);
            assert!((corrected_child.y - 4.232_051).abs() < 0.0001);
            assert!((corrected_child.rotation - 40.).abs() < 0.0001);
            assert!(corrected_child.scale_x.is_sign_negative());
            assert!(!corrected_child.scale_y.is_sign_negative());
            assert_eq!(
                corrected_child.shear_x.to_bits(),
                before.rig.bones[2].shear_x.to_bits()
            );
        } else {
            assert_eq!(corrected_child, &before.rig.bones[2]);
        }

        let slot = &after.slots[0];
        assert_eq!(slot.active_attachment, old_slot.active_attachment);
        assert_eq!(inventory_ids(&session), ids);
        for (old, new) in old_slot.attachments.iter().zip(&slot.attachments) {
            let SceneAttachment::Region(region) = new else {
                panic!("Rotate compensation must preserve the Region type");
            };
            let original = old.image().unwrap();
            assert_eq!(
                region.scale_x.is_sign_negative(),
                original.scale_x.is_sign_negative()
            );
            assert_eq!(
                region.scale_y.is_sign_negative(),
                original.scale_y.is_sign_negative()
            );
            if images {
                same_world_points(
                    &geometry_points(old, old_slot.bone, &old_render),
                    &geometry_points(new, slot.bone, &render),
                );
            } else {
                assert_eq!(old, new);
                assert_ne!(
                    geometry_points(old, old_slot.bone, &old_render),
                    geometry_points(new, slot.bone, &render),
                );
            }
        }
        project = session.edit(moved.revision, RigEdit::Undo).unwrap();
        assert_eq!(
            encode_scene_payload(&scene_model(&session)).unwrap(),
            before_bytes
        );
    }
}

#[test]
fn setup_world_rotation_targets_the_signed_heading_under_a_reflected_sheared_parent() {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":7,"y":-4,"rotation":30,"length":30,"scaleX":-2,"scaleY":1,"shearX":0,"shearY":30}),
    );
    let project = add_bone(&session, &project, root);
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"signed owner","x":5.5,"y":-0.0,"rotation":0,"length":30,"scaleX":-1.25,"scaleY":0.75,"shearX":-0.0}),
    );
    let project = add_bone(&session, &project, selected);
    let project = session
        .place_images(project.revision, &["A".into()], root, 20., 8.)
        .unwrap();
    let mesh_slot = project.slots[0].id;
    let mesh = project.slots[0].attachments[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"attachmentEdit","id":mesh,"edit":{"type":"convertMesh","id":mesh_slot}}),
    );
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"bindAttachment","id":mesh,"bones":[root,selected]}),
    );
    let mut project = command(
        &session,
        &project,
        serde_json::json!({"type":"setAttachmentWeight","id":mesh,"vertex":0,"bone":selected,"value":0.4}),
    );
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before = scene_model(&session);
    let old_owner = &before.rig.bones[1];
    let old_world = precise_world(&before.rig.bones);
    let old_mesh = &before.slots[0].attachments[0];
    let old_corners = geometry_points(old_mesh, 0, &crate::rig::poses(&before.rig.bones));
    assert!((old_world[1].heading() - 30.).abs() < 1e-10);
    assert_eq!(old_owner.y.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(old_owner.shear_x.to_bits(), (-0.0_f32).to_bits());
    let mut expected = old_world[1];
    expected.rotate_basis(-75.);

    let summary = serde_json::to_value(&project).unwrap();
    assert_eq!(
        session
            .edit(
                project.revision - 1,
                set_world_rotation(selected, 315., true, true)
            )
            .unwrap_err()
            .code,
        "ProjectChanged"
    );
    let same_heading = session
        .edit(
            project.revision,
            set_world_rotation(selected, 390., true, true),
        )
        .unwrap();
    assert_eq!(serde_json::to_value(&same_heading).unwrap(), summary);
    assert_eq!(payload(), before_bytes);

    for (angle, bones, images) in [
        (315., false, false),
        (-45., true, false),
        (315., false, true),
        (315., true, true),
    ] {
        let moved = session
            .edit(
                project.revision,
                set_world_rotation(selected, angle, bones, images),
            )
            .unwrap();
        assert_eq!(moved.revision, project.revision + 1);
        assert_eq!(moved.edited_bone, Some(selected));
        let after = scene_model(&session);
        let owner = &after.rig.bones[1];
        assert_eq!(owner.x.to_bits(), old_owner.x.to_bits());
        assert_eq!(owner.y.to_bits(), old_owner.y.to_bits());
        assert_eq!(owner.shear_x.to_bits(), old_owner.shear_x.to_bits());
        assert!(owner.scale_x.is_sign_negative());
        assert!(!owner.scale_y.is_sign_negative());
        let world = precise_world(&after.rig.bones);
        assert_world_affine(world[1], expected);
        assert!((world[1].heading() + 45.).abs() < 0.0001);
        let moved_bytes = payload();
        let equivalent = session
            .edit(
                moved.revision,
                set_world_rotation(selected, world[1].heading() + 360., bones, images),
            )
            .unwrap();
        assert_eq!(equivalent.revision, moved.revision);
        assert_eq!(payload(), moved_bytes);
        let retyped = session
            .edit(
                moved.revision,
                set_world_rotation(selected, -45., bones, images),
            )
            .unwrap();
        assert_eq!(retyped.revision, moved.revision);
        assert_eq!(payload(), moved_bytes);
        if bones {
            assert_world_affine(world[2], old_world[2]);
        } else {
            assert_eq!(after.rig.bones[2], before.rig.bones[2]);
        }
        let new_mesh = &after.slots[0].attachments[0];
        let corners = geometry_points(new_mesh, 0, &crate::rig::poses(&after.rig.bones));
        if images {
            same_world_points(&old_corners, &corners);
        } else {
            assert_eq!(new_mesh, old_mesh);
            assert_ne!(old_corners, corners);
        }
        project = session.edit(moved.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), before_bytes);
    }

    for id in [selected, root] {
        let bone = project.bones.iter().find(|bone| bone.id == id).unwrap();
        let mut edit = serde_json::to_value(bone).unwrap();
        edit["type"] = serde_json::json!("update");
        edit["scaleX"] = serde_json::json!(0);
        let singular = command(&session, &project, edit);
        let singular_bytes = payload();
        assert_eq!(
            session
                .edit(
                    singular.revision,
                    set_world_rotation(selected, 315., false, false)
                )
                .unwrap_err()
                .code,
            "InvalidSceneEdit"
        );
        assert_eq!(
            session.summary().unwrap().unwrap().revision,
            singular.revision
        );
        assert_eq!(payload(), singular_bytes);
        project = session.edit(singular.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), before_bytes);
    }

    let blocked = session
        .place_images(project.revision, &["B".into()], selected, 5., 10.)
        .unwrap();
    let region = blocked.slots[1].attachments[0].id;
    let blocked = command(
        &session,
        &blocked,
        serde_json::json!({"type":"updateAttachment","id":region,"x":3,"y":-1,"rotation":0,"scaleX":1,"scaleY":1}),
    );
    let before_rejection = payload();
    let summary = serde_json::to_value(&blocked).unwrap();
    assert_eq!(
        session
            .edit(
                blocked.revision,
                set_world_rotation(selected, 315., true, true)
            )
            .unwrap_err()
            .code,
        "InvalidSceneEdit"
    );
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        summary
    );
    assert_eq!(payload(), before_rejection);
}

#[test]
fn setup_rotate_uses_the_requested_basis_and_rejects_region_shear_atomically() {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":2,"y":-3,"rotation":0,"length":30,"scaleX":2,"scaleY":1}),
    );
    let project = add_bone(&session, &project, root);
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"selected","x":8,"y":-0.0,"rotation":0,"length":30}),
    );
    let project = add_bone(&session, &project, selected);
    let project = session
        .place_images(project.revision, &["A".into()], selected, 24., 11.)
        .unwrap();
    let before = scene_model(&session);
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before_summary = serde_json::to_value(&project).unwrap();
    let old_world = precise_world(&before.rig.bones);

    for (revision, edit, code) in [
        (
            project.revision - 1,
            rotate(selected, "localAbsolute", 45., true, true),
            "ProjectChanged",
        ),
        (
            project.revision,
            rotate(selected, "worldDelta", 45., true, true),
            "InvalidSceneEdit",
        ),
        (
            project.revision,
            rotate(selected, "worldDelta", 45., false, false),
            "InvalidSceneEdit",
        ),
    ] {
        assert_eq!(session.edit(revision, edit).unwrap_err().code, code);
        assert_eq!(
            serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
            before_summary
        );
        assert_eq!(payload(), before_bytes);
    }

    // Equal numbers specify different rotations below a nonuniform parent.
    let mut expected_local = LocalPose::from(&before.rig.bones[1]);
    expected_local.rotation = 45.;
    let expected_local_world = old_world[0].compose(expected_local.affine());
    let mut expected_world = old_world[1];
    expected_world.rotate_basis(45.);
    let local = session
        .edit(
            project.revision,
            rotate(selected, "localAbsolute", 45., true, true),
        )
        .unwrap();
    assert_eq!(local.revision, project.revision + 1);
    let after_local = scene_model(&session);
    let local_world = precise_world(&after_local.rig.bones);
    assert_eq!(
        after_local.rig.bones[1].rotation.to_bits(),
        45.0_f32.to_bits()
    );
    assert_eq!(after_local.rig.bones[1].y.to_bits(), (-0.0_f32).to_bits());
    assert_world_affine(local_world[1], expected_local_world);
    assert_world_affine(local_world[2], old_world[2]);
    same_world_points(
        &geometry_points(
            &before.slots[0].attachments[0],
            1,
            &crate::rig::poses(&before.rig.bones),
        ),
        &geometry_points(
            &after_local.slots[0].attachments[0],
            1,
            &crate::rig::poses(&after_local.rig.bones),
        ),
    );
    let undone = session.edit(local.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), before_bytes);

    let turned = session
        .edit(
            undone.revision,
            rotate(selected, "worldDelta", 45., true, false),
        )
        .unwrap();
    assert_eq!(turned.revision, undone.revision + 1);
    let after_world = scene_model(&session);
    let world = precise_world(&after_world.rig.bones);
    assert_world_affine(world[1], expected_world);
    assert!((world[1].b - local_world[1].b).abs() > 0.5);
    assert_world_affine(world[2], old_world[2]);
    assert_eq!(after_world.rig.bones[1].y.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(
        after_world.slots[0].attachments,
        before.slots[0].attachments
    );
    session.edit(turned.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), before_bytes);
}

#[test]
fn setup_scale_keeps_sparse_selected_fields_and_compensates_signed_dependents() {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":7,"y":-4,"rotation":28,"length":30,"scaleX":1.5,"scaleY":0.75,"shearX":4,"shearY":-12}),
    );
    let project = add_bone(&session, &project, root);
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"reflected scale","x":8,"y":-0.0,"rotation":15,"length":30,"scaleX":-2,"scaleY":1.25,"shearX":-0.0,"shearY":9}),
    );
    let project = add_bone(&session, &project, selected);
    let child = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":child,"name":"signed child","x":5,"y":-3,"rotation":17,"length":30,"scaleX":-0.75,"scaleY":-1.5,"shearX":6,"shearY":-4}),
    );
    let project = session
        .place_images(project.revision, &["A".into()], selected, 11., 9.)
        .unwrap();
    let attachment = project.slots[0].attachments[0].id;
    let mut project = command(
        &session,
        &project,
        serde_json::json!({"type":"updateAttachment","id":attachment,"x":3,"y":-1,"rotation":0,"scaleX":-1.25,"scaleY":1.5}),
    );
    let before = scene_model(&session);
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before_summary = serde_json::to_value(&project).unwrap();
    let old = &before.rig.bones[1];
    assert_eq!(old.y.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(old.shear_x.to_bits(), (-0.0_f32).to_bits());
    let old_region = &before.slots[0].attachments[0];
    let old_image = old_region.image().unwrap();
    let old_world = precise_world(&before.rig.bones);
    let old_corners = geometry_points(old_region, 1, &crate::rig::poses(&before.rig.bones));

    for (revision, edit, error) in [
        (
            project.revision - 1,
            scale(selected, "localAbsolute", [Some(-4.), None], true, true),
            "ProjectChanged",
        ),
        (
            project.revision,
            scale(selected, "localAbsolute", [Some(-0.0), None], true, true),
            "InvalidSceneEdit",
        ),
        (
            project.revision,
            scale(selected, "localFactor", [Some(0.), None], true, true),
            "InvalidSceneEdit",
        ),
    ] {
        assert_eq!(session.edit(revision, edit).unwrap_err().code, error);
        assert_eq!(
            serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
            before_summary
        );
        assert_eq!(payload(), before_bytes);
    }

    for (x, bones, images) in [
        (-4., true, false),
        (-4., false, true),
        (-4., true, true),
        (4., true, true),
    ] {
        let moved = session
            .edit(
                project.revision,
                scale(selected, "localAbsolute", [Some(x), None], bones, images),
            )
            .unwrap();
        assert_eq!(moved.revision, project.revision + 1);
        assert_eq!(moved.edited_bone, Some(selected));
        let after = scene_model(&session);
        let mut expected = old.clone();
        expected.scale_x = x;
        let owner = &after.rig.bones[1];
        assert_eq!(owner, &expected);
        assert_eq!(owner.x.to_bits(), old.x.to_bits());
        assert_eq!(owner.y.to_bits(), old.y.to_bits());
        assert_eq!(owner.shear_x.to_bits(), old.shear_x.to_bits());
        assert_eq!(owner.scale_y.to_bits(), old.scale_y.to_bits());
        let world = precise_world(&after.rig.bones);
        assert_world_affine(
            world[1],
            old_world[0].compose(LocalPose::from(&expected).affine()),
        );
        let child = &after.rig.bones[2];
        if bones {
            assert_world_affine(world[2], old_world[2]);
            assert_eq!(child.x, before.rig.bones[2].x * (-2. / x));
            assert_eq!(child.y.to_bits(), before.rig.bones[2].y.to_bits());
            assert_eq!(child.scale_x.is_sign_negative(), x < 0.);
            assert!(child.scale_y.is_sign_negative());
        } else {
            assert_eq!(child, &before.rig.bones[2]);
            assert!((world[2].x - old_world[2].x).hypot(world[2].y - old_world[2].y) > 1.0);
        }
        assert_eq!(moved.slots[0].active_attachment_id, Some(attachment));
        let new_region = &after.slots[0].attachments[0];
        let SceneAttachment::Region(region) = new_region else {
            panic!("Keep the Region type")
        };
        if images {
            assert_eq!(region.x, old_image.x * (-2. / x));
            assert_eq!(region.y.to_bits(), old_image.y.to_bits());
            assert_eq!(region.scale_x.is_sign_negative(), x < 0.);
            assert!(!region.scale_y.is_sign_negative());
            same_world_points(
                &old_corners,
                &geometry_points(new_region, 1, &crate::rig::poses(&after.rig.bones)),
            );
        } else {
            assert_eq!(new_region, old_region);
        }
        project = session.edit(moved.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), before_bytes);
    }
}

#[test]
fn setup_affine_compensation_accepts_rounding_but_rejects_real_region_shear() {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":0,"y":0,"rotation":0,"length":30,"scaleX":2,"scaleY":0.5}),
    );
    let project = add_bone(&session, &project, root);
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"uniform factor owner","x":8,"y":4,"rotation":0,"length":30,"scaleX":0.7,"scaleY":1.6}),
    );
    let project = add_bone(&session, &project, selected);
    let project = session
        .place_images(project.revision, &["A".into()], selected, 10., 11.)
        .unwrap();
    let attachment = project.slots[0].attachments[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"updateAttachment","id":attachment,"x":3,"y":-1,"rotation":45,"scaleX":-1.25,"scaleY":1.5}),
    );
    let before = scene_model(&session);
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before_summary = serde_json::to_value(&project).unwrap();
    assert_eq!(
        session
            .edit(
                project.revision,
                scale(selected, "localFactor", [Some(2.), None], true, true)
            )
            .unwrap_err()
            .code,
        "InvalidSceneEdit"
    );
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        before_summary
    );
    assert_eq!(payload(), before_bytes);

    let factor = 1.1_f32;
    let old = &before.rig.bones[1];
    let (sx, sy) = (old.scale_x * factor, old.scale_y * factor);
    // The stored f32 axes no longer have exactly the same ratio after rounding.
    assert!(
        (f64::from(old.scale_x) / f64::from(sx) - f64::from(old.scale_y) / f64::from(sy)).abs()
            > 1e-8
    );
    let moved = session
        .edit(
            project.revision,
            scale(
                selected,
                "localFactor",
                [Some(factor), Some(factor)],
                true,
                true,
            ),
        )
        .unwrap();
    assert_eq!(moved.revision, project.revision + 1);
    let after = scene_model(&session);
    assert_eq!(after.rig.bones[1].scale_x.to_bits(), sx.to_bits());
    assert_eq!(after.rig.bones[1].scale_y.to_bits(), sy.to_bits());
    assert!(matches!(
        &after.slots[0].attachments[0],
        SceneAttachment::Region(_)
    ));
    assert_world_affine(
        precise_world(&after.rig.bones)[2],
        precise_world(&before.rig.bones)[2],
    );
    same_world_points(
        &geometry_points(
            &before.slots[0].attachments[0],
            1,
            &crate::rig::poses(&before.rig.bones),
        ),
        &geometry_points(
            &after.slots[0].attachments[0],
            1,
            &crate::rig::poses(&after.rig.bones),
        ),
    );
    let undone = session.edit(moved.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), before_bytes);

    // The selected bone's authored scales cancel those of its parent.
    // World rotation is conformal despite rounding its local decomposition.
    let conformal = command(
        &session,
        &undone,
        serde_json::json!({"type":"update","id":selected,"name":"conformal world owner","x":8,"y":4,"rotation":0,"length":30,"scaleX":0.5,"scaleY":2}),
    );
    let before = scene_model(&session);
    let before_bytes = payload();
    let old_world = precise_world(&before.rig.bones);
    let mut turned_world = old_world[1];
    turned_world.rotate_basis(38.);
    let turned = session
        .edit(
            conformal.revision,
            rotate(selected, "worldDelta", 38., true, true),
        )
        .unwrap();
    assert_eq!(turned.revision, conformal.revision + 1);
    let after = scene_model(&session);
    let world = precise_world(&after.rig.bones);
    assert_world_affine(world[1], turned_world);
    assert_world_affine(world[2], old_world[2]);
    assert!(matches!(
        &after.slots[0].attachments[0],
        SceneAttachment::Region(_)
    ));
    same_world_points(
        &geometry_points(
            &before.slots[0].attachments[0],
            1,
            &crate::rig::poses(&before.rig.bones),
        ),
        &geometry_points(
            &after.slots[0].attachments[0],
            1,
            &crate::rig::poses(&after.rig.bones),
        ),
    );
    session.edit(turned.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), before_bytes);
}

#[test]
fn setup_scale_tall_region_uses_the_orientation_that_preserves_its_corners() {
    use fbones_format::minimal::regions::Region;

    let (dir, session, project) = setup();
    let source = dir.path().join("tall-sprites");
    std::fs::create_dir(&source).unwrap();
    let mut image = vec![];
    {
        let mut encoder = png::Encoder::new(&mut image, 16, 600);
        encoder.set_color(png::ColorType::Rgba);
        encoder
            .write_header()
            .unwrap()
            .write_image_data(&[255; 16 * 600 * 4])
            .unwrap();
    }
    std::fs::write(source.join("Tall.png"), image).unwrap();
    let project = session
        .select_images_folder(project.revision, &source)
        .unwrap();
    let root = project.bones[0].id;
    let project = session
        .place_images(project.revision, &["Tall".into()], root, 0., 0.)
        .unwrap();
    let attachment = project.slots[0].attachments[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"updateAttachment","id":attachment,"x":0,"y":0,"rotation":35,"scaleX":1,"scaleY":2}),
    );
    let before = scene_model(&session);
    let before_bytes = encode_scene_payload(&before).unwrap();
    let original = before.slots[0].attachments[0].image().unwrap();
    assert_eq!((original.width, original.height), (16., 600.));
    let (sx, sy) = (1.01_f32, 1.01001_f32);
    let moved = session
        .edit(
            project.revision,
            scale(root, "localAbsolute", [Some(sx), Some(sy)], false, true),
        )
        .unwrap();
    assert_eq!(moved.revision, project.revision + 1);
    let after = scene_model(&session);
    let SceneAttachment::Region(region) = &after.slots[0].attachments[0] else {
        panic!("Keep the Region type")
    };
    let (sin, cos) = 35_f64.to_radians().sin_cos();
    let x_angle = (sin / f64::from(sy))
        .atan2(cos / f64::from(sx))
        .to_degrees();
    let y_angle = (sin / f64::from(sx))
        .atan2(cos / f64::from(sy))
        .to_degrees();
    let angle = f64::from(region.rotation);
    assert!((angle - y_angle).abs() < 0.00001);
    assert!((angle - x_angle).abs() > 0.0001);
    let corner = |region: &Region, owner: Affine, x, y| {
        let (sin, cos) = f64::from(region.rotation).to_radians().sin_cos();
        let x = x * f64::from(region.scale_x);
        let y = y * f64::from(region.scale_y);
        owner.point(
            f64::from(region.x) + cos * x - sin * y,
            f64::from(region.y) + sin * x + cos * y,
        )
    };
    let old_owner = precise_world(&before.rig.bones)[0];
    let new_owner = precise_world(&after.rig.bones)[0];
    for x in [-8., 8.] {
        for y in [-300., 300.] {
            let old = corner(original, old_owner, x, y);
            let new = corner(region, new_owner, x, y);
            assert!((new.0 - old.0).hypot(new.1 - old.1) < 0.001);
        }
    }
    session.edit(moved.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        encode_scene_payload(&scene_model(&session)).unwrap(),
        before_bytes
    );
}

#[test]
fn setup_shear_distinguishes_local_fields_from_world_deltas_and_preserves_supported_images() {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":root,"name":"root","x":0,"y":0,"rotation":0,"length":30,"scaleX":2,"scaleY":1}),
    );
    let project = add_bone(&session, &project, root);
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":selected,"name":"shear owner","x":8,"y":-0.0,"rotation":0,"length":30,"shearX":-0.0,"shearY":-0.0}),
    );
    let project = add_bone(&session, &project, selected);
    let child = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"update","id":child,"name":"signed child","x":5,"y":2,"rotation":17,"length":18,"scaleX":-0.75,"scaleY":1.25,"shearX":7,"shearY":-5}),
    );
    let project = session
        .place_images(project.revision, &["A".into()], selected, 15., 10.)
        .unwrap();
    let attachment = project.slots[0].attachments[0].id;
    let mut project = command(
        &session,
        &project,
        serde_json::json!({"type":"updateAttachment","id":attachment,"x":3,"y":-1,"rotation":-30,"scaleX":-0.75,"scaleY":1.25}),
    );
    let before = scene_model(&session);
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before_summary = serde_json::to_value(&project).unwrap();
    let old = &before.rig.bones[1];
    let old_world = precise_world(&before.rig.bones);
    let old_slot = &before.slots[0];
    let old_corners = geometry_points(
        &old_slot.attachments[0],
        old_slot.bone,
        &crate::rig::poses(&before.rig.bones),
    );

    for (revision, angle, error) in [
        (project.revision - 1, 30., "ProjectChanged"),
        (project.revision, 90., "InvalidSceneEdit"),
    ] {
        assert_eq!(
            session
                .edit(
                    revision,
                    shear(selected, "localAbsolute", "x", angle, true, true)
                )
                .unwrap_err()
                .code,
            error
        );
        assert_eq!(
            serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
            before_summary
        );
        assert_eq!(payload(), before_bytes);
    }

    for (angle, a, b, region_angle, reflected) in [
        (30., 3_f64.sqrt(), 0.5, -45., false),
        (180., -2., 0., 30., true),
    ] {
        let moved = session
            .edit(
                project.revision,
                shear(selected, "localAbsolute", "x", angle, true, true),
            )
            .unwrap();
        assert_eq!(moved.revision, project.revision + 1);
        assert_eq!(moved.edited_bone, Some(selected));
        assert_eq!(moved.slots[0].active_attachment_id, Some(attachment));
        let after = scene_model(&session);
        let owner = &after.rig.bones[1];
        let mut expected_owner = old.clone();
        expected_owner.shear_x = angle;
        assert_eq!(owner, &expected_owner);
        assert_eq!(owner.shear_y.to_bits(), (-0.0_f32).to_bits());
        assert_eq!(owner.y.to_bits(), (-0.0_f32).to_bits());
        assert_eq!(owner.shear_x.to_bits(), angle.to_bits());
        let world = precise_world(&after.rig.bones);
        assert_world_affine(
            world[1],
            Affine {
                a,
                b,
                ..old_world[1]
            },
        );
        assert_world_affine(world[2], old_world[2]);
        let held_child = &after.rig.bones[2];
        assert_eq!(held_child.scale_x.is_sign_negative(), !reflected);
        assert!(!held_child.scale_y.is_sign_negative());
        assert_eq!(
            held_child.shear_x.to_bits(),
            before.rig.bones[2].shear_x.to_bits()
        );

        let slot = &after.slots[0];
        let SceneAttachment::Region(region) = &slot.attachments[0] else {
            panic!("Keep the Region type")
        };
        assert!((region.rotation - region_angle).abs() < 0.0001);
        assert_eq!(region.scale_x.is_sign_negative(), !reflected);
        assert!(!region.scale_y.is_sign_negative());
        same_world_points(
            &old_corners,
            &geometry_points(
                &slot.attachments[0],
                slot.bone,
                &crate::rig::poses(&after.rig.bones),
            ),
        );
        project = session.edit(moved.revision, RigEdit::Undo).unwrap();
        assert_eq!(payload(), before_bytes);
    }

    let turned = session
        .edit(
            project.revision,
            shear(selected, "worldDelta", "x", 30., true, false),
        )
        .unwrap();
    assert_eq!(turned.revision, project.revision + 1);
    let after = scene_model(&session);
    let world = precise_world(&after.rig.bones);
    assert_world_affine(
        world[1],
        Affine {
            a: 3_f64.sqrt(),
            b: 1.,
            ..old_world[1]
        },
    );
    assert_world_affine(world[2], old_world[2]);
    assert_eq!(after.rig.bones[1].y.to_bits(), (-0.0_f32).to_bits());
    assert_eq!(&after.slots[0], old_slot);
    project = session.edit(turned.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), before_bytes);

    let authored_turn = session
        .edit(
            project.revision,
            shear(selected, "localAbsolute", "x", 360., true, true),
        )
        .unwrap();
    assert_eq!(authored_turn.revision, project.revision + 1);
    let mut metadata_only = before.clone();
    metadata_only.rig.bones[1].shear_x = 360.;
    assert_eq!(payload(), encode_scene_payload(&metadata_only).unwrap());
    project = session.edit(authored_turn.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), before_bytes);

    let unrepresentable = command(
        &session,
        &project,
        serde_json::json!({"type":"updateAttachment","id":attachment,"x":3,"y":-1,"rotation":0,"scaleX":-0.75,"scaleY":1.25}),
    );
    let before_rejection = payload();
    let summary = serde_json::to_value(&unrepresentable).unwrap();
    assert_eq!(
        session
            .edit(
                unrepresentable.revision,
                shear(selected, "localAbsolute", "x", 30., true, true)
            )
            .unwrap_err()
            .code,
        "InvalidSceneEdit"
    );
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        summary
    );
    assert_eq!(payload(), before_rejection);
}

#[test]
fn setup_shear_region_can_fit_at_the_midpoint_between_column_headings() {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = session
        .place_images(project.revision, &["A".into()], root, 0., 0.)
        .unwrap();
    let attachment = project.slots[0].attachments[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"updateAttachment","id":attachment,"x":0,"y":0,"rotation":0,"scaleX":50,"scaleY":50}),
    );
    let before = scene_model(&session);
    let original = before.slots[0].attachments[0].image().unwrap();
    assert_eq!(
        (
            original.width * original.scale_x,
            original.height * original.scale_y
        ),
        (200., 200.)
    );
    let before_bytes = encode_scene_payload(&before).unwrap();
    let moved = session
        .edit(
            project.revision,
            shear(root, "localAbsolute", "x", 0.00075, false, true),
        )
        .unwrap();
    assert_eq!(moved.revision, project.revision + 1);
    let after = scene_model(&session);
    let SceneAttachment::Region(region) = &after.slots[0].attachments[0] else {
        panic!("Keep the Region type")
    };
    assert!((region.rotation - (-0.000375)).abs() < 0.000001);
    let new_owner = precise_world(&after.rig.bones)[0];
    let (sin, cos) = f64::from(region.rotation).to_radians().sin_cos();
    for x in [-2., 2.] {
        for y in [-2., 2.] {
            let ux = x * f64::from(region.scale_x);
            let uy = y * f64::from(region.scale_y);
            let new = new_owner.point(
                f64::from(region.x) + cos * ux - sin * uy,
                f64::from(region.y) + sin * ux + cos * uy,
            );
            let error = (new.0 - 50. * x).hypot(new.1 - 50. * y);
            assert!(error < 0.001, "corner ({x}, {y}) moved by {error}");
        }
    }
    session.edit(moved.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        encode_scene_payload(&scene_model(&session)).unwrap(),
        before_bytes
    );
}

#[test]
fn setup_compensation_preserves_positive_weighted_mesh_and_mask_lanes() {
    let (_dir, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let parent = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":parent,"name":"affine parent","x":12,"y":-3,"rotation":29,"length":20,"scaleX":-1.5,"scaleY":0.6,"shearX":2,"shearY":-11}),
    );
    let p = add_bone(&s, &p, parent);
    let selected = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 10., 20.)
        .unwrap();
    let mesh = p.slots[0].attachments[0].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":mesh,"edit":{"type":"convertMesh","id":p.slots[0].id}}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"mask"}),
    );
    let slot = p.slots[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createClipping","slot":slot,"name":"mask","endSlot":slot,"vertices":[{"x":0,"y":0},{"x":30,"y":0},{"x":30,"y":30},{"x":0,"y":30}]}),
    );
    let clip = p.slots[1].attachments[0].id;
    let p = [mesh, clip].into_iter().fold(p, |p, id| {
        let p = command(
            &s,
            &p,
            serde_json::json!({"type":"bindAttachment","id":id,"bones":[0,selected]}),
        );
        command(
            &s,
            &p,
            serde_json::json!({"type":"setAttachmentWeight","id":id,"vertex":0,"bone":selected,"value":0.4}),
        )
    });
    let before = scene_model(&s);
    let before_bytes = encode_scene_payload(&before).unwrap();
    let old_world = crate::rig::poses(&before.rig.bones);
    let numeric_x = 17.25;
    let local_dx = numeric_x - before.rig.bones[2].x;
    let authored = precise_world(&before.rig.bones);
    let (parent_world, selected_world) = (authored[1], authored[2]);
    let x_gain = 10. / selected_world.a.hypot(selected_world.b);
    let y_gain = -5. / selected_world.c.hypot(selected_world.d);
    let (dx, dy) = selected_world.vector(x_gain, y_gain);
    let local_absolute_delta = [
        (parent_world.x + dx - selected_world.x) as f32,
        (parent_world.y + dy - selected_world.y) as f32,
    ];
    let cases = [
        (translate(selected, 6., -4., false, true), [6., -4.]),
        (
            set_parent_x(selected, numeric_x, false, true),
            [old_world[1].a * local_dx, old_world[1].b * local_dx],
        ),
        (rotate(selected, "worldDelta", 30., false, true), [0., 0.]),
        (
            scale(selected, "localFactor", [Some(2.), None], false, true),
            [0., 0.],
        ),
        (
            shear(selected, "worldDelta", "y", -20., false, true),
            [0., 0.],
        ),
        (
            set_local_position(selected, [Some(10.), Some(-5.)], false, true),
            local_absolute_delta,
        ),
    ];
    let mut revision = p.revision;
    for (edit, [dx, dy]) in cases {
        let moved = s.edit(revision, edit).unwrap();
        assert_eq!(moved.revision, revision + 1);
        let after = scene_model(&s);
        let new_world = crate::rig::poses(&after.rig.bones);
        same_world_points(
            &[[old_world[2].x + dx, old_world[2].y + dy]],
            &[[new_world[2].x, new_world[2].y]],
        );
        for (old, new) in before.slots.iter().zip(&after.slots) {
            let a = &old.attachments[0];
            let b = &new.attachments[0];
            same_world_points(
                &geometry_points(a, old.bone, &old_world),
                &geometry_points(b, new.bone, &new_world),
            );
            let mut restored = b.clone();
            let (old_rows, new_rows) = match (a, &mut restored) {
                (SceneAttachment::Mesh(a), SceneAttachment::Mesh(b)) => {
                    (&a.vertices, &mut b.vertices)
                }
                (SceneAttachment::Clipping(a), SceneAttachment::Clipping(b)) => {
                    (&a.vertices, &mut b.vertices)
                }
                _ => panic!("compensation must retain the attachment type"),
            };
            assert_eq!(old_rows[0].weights, vec![0.6, 0.4]);
            assert_ne!(new_rows[0].positions[2..], old_rows[0].positions[2..]);
            for (old, new) in old_rows.iter().zip(new_rows) {
                assert_eq!(
                    old.weights.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                    new.weights.iter().map(|v| v.to_bits()).collect::<Vec<_>>()
                );
                assert_eq!(
                    old.positions[..2]
                        .iter()
                        .map(|v| v.to_bits())
                        .collect::<Vec<_>>(),
                    new.positions[..2]
                        .iter()
                        .map(|v| v.to_bits())
                        .collect::<Vec<_>>()
                );
                if old.weights[1] == 0. {
                    assert_eq!(
                        old.positions[2..]
                            .iter()
                            .map(|v| v.to_bits())
                            .collect::<Vec<_>>(),
                        new.positions[2..]
                            .iter()
                            .map(|v| v.to_bits())
                            .collect::<Vec<_>>()
                    );
                }
                new.positions[2..].copy_from_slice(&old.positions[2..]);
            }
            assert_eq!(&restored, a, "binding metadata and topology are unchanged");
            assert_eq!(old.active_attachment, new.active_attachment);
        }
        assert_eq!(moved.slots[0].attachments[0].id, mesh);
        assert_eq!(moved.slots[1].attachments[0].id, clip);
        let after_bytes = encode_scene_payload(&after).unwrap();
        let undone = s.edit(moved.revision, RigEdit::Undo).unwrap();
        assert_eq!(
            encode_scene_payload(&scene_model(&s)).unwrap(),
            before_bytes
        );
        let redone = s.edit(undone.revision, RigEdit::Redo).unwrap();
        assert_eq!(encode_scene_payload(&scene_model(&s)).unwrap(), after_bytes);
        revision = s.edit(redone.revision, RigEdit::Undo).unwrap().revision;
    }

    let restored = s.summary().unwrap().unwrap();
    assert_eq!(restored.revision, revision);
    let project = command(
        &s,
        &restored,
        serde_json::json!({"type":"createAnimation","name":"Stored Rotate Deform"}),
    );
    let animation = project.animations[0].id;
    let binding = before.slots[0].attachments[0].mesh().unwrap();
    let mut offsets = vec![0.; binding.vertices.len() * binding.bones.len() * 2];
    offsets[2] = 4.;
    let keyed = command(
        &s,
        &project,
        serde_json::json!({"type":"setAnimationDeformKeys","animation":animation,"keys":[
            {"attachment":mesh,"frame":0,"offsets":offsets,"dataPresent":true,"curve":"linear"}
        ]}),
    );
    let key = keyed.animations[0].deform_tracks[0].keys[0].id;
    let stored = command(
        &s,
        &keyed,
        serde_json::json!({"type":"storeAnimationKeys","animation":animation}),
    );
    let without_live_key = command(
        &s,
        &stored,
        serde_json::json!({"type":"deleteAnimationKeys","animation":animation,"keys":[key]}),
    );
    assert!(without_live_key.animations[0].deform_tracks.is_empty());
    let snapshot = without_live_key.stored_animation.as_ref().unwrap();
    assert_eq!(snapshot.deform_tracks[0].attachment, mesh);
    assert_eq!(snapshot.deform_tracks[0].keys[0].id, key);
    let stored_view = serde_json::to_value(&stored.stored_animation).unwrap();
    assert_eq!(
        serde_json::to_value(&without_live_key.stored_animation).unwrap(),
        stored_view
    );
    let before_rejection = encode_scene_payload(&scene_model(&s)).unwrap();
    for edit in [
        rotate(selected, "worldDelta", 30., false, true),
        scale(selected, "localFactor", [Some(2.), None], false, true),
        shear(selected, "localAbsolute", "y", 15., false, true),
        set_local_position(selected, [Some(10.), Some(-5.)], false, true),
    ] {
        assert_eq!(
            s.edit(without_live_key.revision, edit).unwrap_err().code,
            "InvalidAnimation"
        );
        let rejected = s.summary().unwrap().unwrap();
        assert_eq!(rejected.revision, without_live_key.revision);
        assert_eq!(
            serde_json::to_value(&rejected.stored_animation).unwrap(),
            stored_view
        );
        assert_eq!(
            encode_scene_payload(&scene_model(&s)).unwrap(),
            before_rejection
        );
    }
}

#[test]
fn setup_rotate_images_rejects_a_collapsed_mixed_weight_clipping_polygon() {
    // B follows the rotated child onto D while the selected lane holds C.
    assert_mixed_clipping_requires_bones(
        [[-1., -1.], [2., 0.], [2., 2.], [0., 2.]],
        2,
        |id, bones| rotate(id, "worldDelta", 90., bones, true),
    );
}

#[test]
fn setup_scale_images_checks_mixed_clipping_when_selected_lane_at_pivot_does_not_change() {
    // B scales onto C while the selected lane holds A at the pivot.
    assert_mixed_clipping_requires_bones(
        [[0., 0.], [1., 1.], [2., 1.], [0., 2.]],
        0,
        |id, bones| scale(id, "localFactor", [Some(2.), None], bones, true),
    );
}

#[test]
fn setup_local_translate_checks_mixed_clipping_when_uncompensated_child_moves() {
    // A and C stay with root, D is held by Images, and a free child carries B into C.
    assert_mixed_clipping_requires_bones(
        [[0., 0.], [1., 1.], [2., 1.], [0., 2.]],
        3,
        |id, bones| set_local_position(id, [Some(1.), None], bones, true),
    );
}

fn assert_mixed_clipping_requires_bones(
    boundary: [[f32; 2]; 4],
    selected_vertex: usize,
    edit: impl Fn(u64, bool) -> RigEdit,
) {
    let (_dir, session, project) = setup();
    let root = project.bones[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"create","parent":root,"x":0,"y":0,"rotation":0,"length":10}),
    );
    let selected = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"create","parent":selected,"x":0,"y":0,"rotation":0,"length":10}),
    );
    let child = project.edited_bone.unwrap();
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"createSlot","bone":root,"name":"mixed mask"}),
    );
    let slot = project.slots[0].id;
    let vertices = boundary.map(|[x, y]| serde_json::json!({"x": x, "y": y}));
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"createClipping","slot":slot,"name":"mixed mask","endSlot":slot,"vertices":vertices}),
    );
    let clip = project.slots[0].attachments[0].id;
    let project = command(
        &session,
        &project,
        serde_json::json!({"type":"bindAttachment","id":clip,"bones":[root,selected,child]}),
    );
    let project = [(1, child), (selected_vertex, selected)].into_iter().fold(project, |project, (vertex, bone)| {
        command(
            &session,
            &project,
            serde_json::json!({"type":"setAttachmentWeight","id":clip,"vertex":vertex,"bone":bone,"value":1}),
        )
    });
    let before = scene_model(&session);
    let before_mask = before.slots[0].attachments[0].clipping().unwrap();
    let before_points =
        crate::clip_edit::world_vertices(before_mask, &crate::rig::poses(&before.rig.bones));
    assert_eq!(before_points, boundary);
    let payload = || encode_scene_payload(&scene_model(&session)).unwrap();
    let before_bytes = payload();
    let before_summary = serde_json::to_value(&project).unwrap();

    assert_eq!(
        session
            .edit(project.revision, edit(selected, false))
            .unwrap_err()
            .code,
        "InvalidClipping"
    );
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        before_summary
    );
    assert_eq!(payload(), before_bytes);

    let moved = session
        .edit(project.revision, edit(selected, true))
        .unwrap();
    assert_eq!(moved.revision, project.revision + 1);
    assert_eq!(moved.slots[0].active_attachment_id, Some(clip));
    let after = scene_model(&session);
    let after_mask = after.slots[0].attachments[0].clipping().unwrap();
    let world = crate::rig::poses(&after.rig.bones);
    crate::clip_edit::validate_polygon(after_mask, &world).unwrap();
    same_world_points(
        &before_points,
        &crate::clip_edit::world_vertices(after_mask, &world),
    );
    if boundary[selected_vertex] == [0., 0.] {
        assert_eq!(
            attachment_binding_bits(&after.slots[0].attachments[0]),
            attachment_binding_bits(&before.slots[0].attachments[0]),
        );
    }
    session.edit(moved.revision, RigEdit::Undo).unwrap();
    assert_eq!(payload(), before_bytes);
}

#[test]
fn setup_compensation_rejects_stale_constrained_and_unrepresentable_edits_atomically() {
    let (_dir, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let child = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":child,"name":"far child","x":900000,"y":8,"rotation":0,"length":30,"scaleX":1,"scaleY":1,"shearX":0,"shearY":0}),
    );
    let before = encode_scene_payload(&scene_model(&s)).unwrap();
    let rejected = [
        (p.revision - 1, translate(0, 6., -4., true, false)),
        (p.revision, translate(0, 0.02, 0., true, false)),
        (p.revision, translate(0, f64::NAN, 0., true, false)),
        (p.revision, translate(0, 1_000_000.5, 0., true, false)),
        (p.revision, translate(0, 6., -4., false, false)),
        (p.revision, translate(u64::MAX, 6., -4., true, false)),
    ];
    for (revision, edit) in rejected {
        assert!(s.edit(revision, edit).is_err());
        assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
        assert_eq!(encode_scene_payload(&scene_model(&s)).unwrap(), before);
    }
    for edit in [
        translate(0, -0., 0., true, false),
        translate(child, 0.02, 0., true, false),
    ] {
        assert_eq!(s.edit(p.revision, edit).unwrap().revision, p.revision);
    }
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"spring","bone":child}}),
    );
    let constrained = encode_scene_payload(&scene_model(&s)).unwrap();
    assert!(s
        .edit(p.revision, translate(0, 6., -4., true, true))
        .is_err());
    assert_eq!(s.summary().unwrap().unwrap().revision, p.revision);
    assert_eq!(encode_scene_payload(&scene_model(&s)).unwrap(), constrained);
}
