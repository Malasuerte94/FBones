//! Own atomic group parenting policy, not original editor group parity.
use super::*;
use std::collections::HashMap;

fn unchanged(
    s: &Session,
    p: &ProjectSummary,
    before: &fbones_format::minimal::scene::SceneProject,
) {
    assert_eq!(&scene_model(s), before);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        serde_json::to_value(p).unwrap()
    );
}

fn edit(bones: Vec<u64>, attachments: Vec<u64>, parent: u64) -> RigEdit {
    RigEdit::ReparentSelection {
        bones,
        attachments,
        parent,
    }
}
fn points(s: &Session, id: u64) -> Vec<[f32; 2]> {
    let model = scene_model(s);
    let (owner, attachment) = moved_attachment(s, id);
    geometry_points(&attachment, owner, &crate::rig::poses(&model.rig.bones))
}
fn affine(s: &Session, p: &ProjectSummary, id: u64) -> ProjectSummary {
    command(
        s,
        p,
        serde_json::json!({"type":"update","id":id,"name":"new affine owner","x":-30,"y":18,"rotation":-37,"length":30,"scaleX":1.6,"scaleY":-0.7,"shearX":0,"shearY":12}),
    )
}
#[test]
fn parent_selection_mixed_subtrees_inventory_world_ids_one_history_and_portable_save() {
    let (d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let a = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, a);
    let child = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let target = p.edited_bone.unwrap();
    let p = affine(&s, &p, target);
    let p = add_bone(&s, &p, 0);
    let sibling = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into(), "unused".into()], child, 24., 31.)
        .unwrap();
    let source = p.slots[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into(), "nested/C".into()], source)
        .unwrap();
    let b = p.slots[0].attachments[1].id;
    let c = p.slots[0].attachments[2].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"attachmentEdit","id":b,"edit":{"type":"convertMesh","id":source}}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"bindAttachment","id":b,"bones":[child,0,a]}),
    );
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setAttachmentWeight","id":b,"vertex":0,"bone":a,"value":0.4}),
    );
    let before = scene_model(&s);
    let order = inventory_ids(&s);
    let old_points = order
        .iter()
        .map(|id| (*id, points(&s, *id)))
        .collect::<HashMap<_, _>>();
    let bits = attachment_binding_bits(&moved_attachment(&s, b).1);
    let old_world = crate::rig::poses(&before.rig.bones);
    let old_bone_ids = p.bones.iter().map(|bone| bone.id).collect::<Vec<_>>();
    let child_before = p
        .bones
        .iter()
        .find(|bone| bone.id == child)
        .unwrap()
        .clone();
    let old_slots = p.slots.iter().map(|slot| slot.id).collect::<Vec<_>>();
    let p = s
        .edit(p.revision, edit(vec![child, sibling, a], vec![b], target))
        .unwrap();
    assert_eq!(
        serde_json::to_value(p.bones.iter().find(|bone| bone.id == child).unwrap()).unwrap(),
        serde_json::to_value(&child_before).unwrap()
    );
    for id in [a, sibling] {
        assert_eq!(
            p.bones.iter().find(|bone| bone.id == id).unwrap().parent,
            Some(target)
        );
    }
    let after = scene_model(&s);
    let new_world = crate::rig::poses(&after.rig.bones);
    for (index, id) in old_bone_ids.iter().enumerate() {
        let new = p.bones.iter().position(|bone| bone.id == *id).unwrap();
        for (old, current) in [
            (old_world[index].x, new_world[new].x),
            (old_world[index].y, new_world[new].y),
            (old_world[index].a, new_world[new].a),
            (old_world[index].b, new_world[new].b),
            (old_world[index].c, new_world[new].c),
            (old_world[index].d, new_world[new].d),
        ] {
            assert!(
                (old - current).abs() < 0.0002,
                "world bone {id}: {old} != {current}"
            );
        }
    }
    assert_eq!(p.slots[0].id, source);
    assert_eq!(p.slots[0].bone, child);
    assert_eq!(p.slots[0].active_attachment_id, Some(c));
    assert_eq!(p.slots[1].bone, target);
    assert_eq!(p.slots[1].active_attachment_id, None);
    assert_eq!(
        p.slots
            .iter()
            .filter(|slot| old_slots.contains(&slot.id))
            .map(|slot| slot.id)
            .collect::<Vec<_>>(),
        old_slots
    );
    assert_eq!(p.slots[1].attachments[0].id, b);
    assert_eq!(
        p.slots[1].attachments[0].mesh.as_ref().unwrap().bones,
        [child, 0, a]
    );
    assert_eq!(attachment_binding_bits(&moved_attachment(&s, b).1), bits);
    assert_eq!(inventory_ids(&s), order);
    for id in &order {
        same_world_points(&old_points[id], &points(&s, *id));
    }
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
    let same = s.edit(p.revision, edit(vec![child, sibling, a], vec![b], target));
    // A selected descendant is still coalesced under A; all requested top roots
    // and the selected attachment already have this parent.
    let same = same.unwrap();
    assert_eq!(
        serde_json::to_value(same).unwrap(),
        serde_json::to_value(p).unwrap()
    );
    let saved = s
        .save_snapshot(
            s.prepare_save(true).unwrap(),
            d.path().join("portable/parented.fbones"),
        )
        .unwrap();
    let Document::Editable { project, .. } =
        open_document(PathBuf::from(saved.path.unwrap())).unwrap()
    else {
        panic!("editable saved scene")
    };
    let mut expected = after;
    expected.images_root = "./images/".into();
    assert_eq!(*project, expected);
}

#[test]
fn parent_selection_partial_and_full_inventory_activation_metadata_affine_and_unique_name() {
    for full in [false, true] {
        for activation in [None, Some(1), Some(2)] {
            let (_d, s, p) = setup();
            let p = add_bone(&s, &p, 0);
            let target = p.edited_bone.unwrap();
            let p = affine(&s, &p, target);
            let p = s
                .place_images(p.revision, &["A".into()], 0, 21., -13.)
                .unwrap();
            let source = p.slots[0].id;
            let p = s
                .place_attachments(p.revision, &["B".into(), "nested/C".into()], source)
                .unwrap();
            let ids = p.slots[0]
                .attachments
                .iter()
                .map(|a| a.id)
                .collect::<Vec<_>>();
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"setSlotColor","id":source,"color":2164228300u32}),
            );
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"setSlotBlend","id":source,"blend":"multiply"}),
            );
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"setActiveAttachment","slot":source,"attachment":activation.map(|i|ids[i])}),
            );
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"createSlot","bone":0,"name":"A_parent"}),
            );
            let before = scene_model(&s);
            let original = before.slots[0].clone();
            let original_points = ids
                .iter()
                .map(|id| (*id, points(&s, *id)))
                .collect::<HashMap<_, _>>();
            let chosen = if full { ids.clone() } else { vec![ids[1]] };
            let p = s.edit(p.revision, edit(vec![], chosen, target)).unwrap();
            let destination = usize::from(!full);
            assert_eq!(p.slots.len(), if full { 2 } else { 3 });
            if full {
                assert_eq!(p.slots[0].id, source);
                assert_eq!(p.slots[0].active_attachment_id, activation.map(|i| ids[i]));
            } else {
                assert_eq!(p.slots[1].name, "A_parent_1");
                assert_eq!(
                    p.slots[0]
                        .attachments
                        .iter()
                        .map(|a| a.id)
                        .collect::<Vec<_>>(),
                    [ids[0], ids[2]]
                );
                assert_eq!(
                    scene_model(&s).slots[0].attachments,
                    [
                        original.attachments[0].clone(),
                        original.attachments[2].clone()
                    ]
                );
                assert_eq!(
                    p.slots[0].active_attachment_id,
                    activation.filter(|i| *i != 1).map(|i| ids[i])
                );
                assert_eq!(
                    p.slots[1].active_attachment_id,
                    activation.filter(|i| *i == 1).map(|i| ids[i])
                );
            }
            let after = scene_model(&s);
            assert_eq!(after.slots[destination].color, original.color);
            assert_eq!(after.slots[destination].blend, original.blend);
            assert_eq!(p.slots[destination].bone, target);
            assert!(
                moved_attachment(&s, ids[1]).1.mesh().is_some(),
                "sheared rigid region becomes canonical quad"
            );
            for id in ids {
                same_world_points(&original_points[&id], &points(&s, id));
            }
            assert_eq!(
                decode_scene(&encode_scene_payload(&after).unwrap()).unwrap(),
                after
            );
        }
    }
}

#[test]
fn parent_selection_clip_endpoints_remap_globally_and_invalid_active_split_preserves_ids() {
    let (_d, s, p) = inactive_weighted_clip_fixture();
    let target = p.bones[1].id;
    let source = p.slots[0].id;
    let end = p.slots[1].id;
    let clip = p.slots[0].attachments[0].id;
    let image = p.slots[0].attachments[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setClipping","id":clip,"endSlot":end,"convex":false,"inverse":true,"color":0x336699ccu32}),
    );
    let bits = attachment_binding_bits(&moved_attachment(&s, clip).1);
    let order = inventory_ids(&s);
    let old = scene_model(&s);
    let p = s
        .edit(p.revision, edit(vec![], vec![image], target))
        .unwrap();
    assert_eq!(p.slots[0].id, source);
    assert_eq!(p.slots[2].id, end);
    assert_eq!(
        scene_model(&s).slots[0].attachments[0]
            .clipping()
            .unwrap()
            .end_slot,
        Some(2)
    );
    assert_eq!(attachment_binding_bits(&moved_attachment(&s, clip).1), bits);
    assert_eq!(inventory_ids(&s), order);
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), old);

    let (_d, s, p) = inactive_weighted_clip_fixture();
    let source = p.slots[0].id;
    let target = p.bones[1].id;
    let clip = p.slots[0].attachments[0].id;
    let image = p.slots[0].attachments[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":source,"attachment":clip}),
    );
    let before = scene_model(&s);
    let bits = attachment_binding_bits(&moved_attachment(&s, clip).1);
    assert!(s
        .edit(p.revision, edit(vec![], vec![clip], target))
        .is_err());
    unchanged(&s, &p, &before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":source,"attachment":image}),
    );
    let old_points = points(&s, clip);
    let p = s
        .edit(p.revision, edit(vec![], vec![clip], target))
        .unwrap();
    assert_eq!(
        p.slots[1].id, 2,
        "Failed staged edit must not consume new slot identity"
    );
    assert_eq!(p.slots[0].active_attachment_id, Some(image));
    assert_eq!(p.slots[1].active_attachment_id, None);
    assert_eq!(
        scene_model(&s).slots[1].attachments[0]
            .clipping()
            .unwrap()
            .end_slot,
        Some(0)
    );
    assert_eq!(attachment_binding_bits(&moved_attachment(&s, clip).1), bits);
    same_world_points(&old_points, &points(&s, clip));
}

#[test]
fn parent_selection_invalid_duplicate_cycle_singular_stale_and_same_owner_are_atomic() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let a = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, a);
    let child = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let target = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 20., 30.)
        .unwrap();
    let slot = p.slots[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    let b = p.slots[0].attachments[1].id;
    let before = scene_model(&s);
    for attempt in [
        edit(vec![], vec![], target),
        edit(vec![a, a], vec![], target),
        edit(vec![], vec![b, b], target),
        edit(vec![0], vec![b], target),
        edit(vec![a], vec![b], child),
        edit(vec![a], vec![], a),
        edit(vec![u64::MAX], vec![], target),
        edit(vec![], vec![u64::MAX], target),
        edit(vec![a], vec![b], u64::MAX),
    ] {
        assert!(s.edit(p.revision, attempt).is_err());
        unchanged(&s, &p, &before);
    }
    assert_eq!(
        s.edit(p.revision - 1, edit(vec![], vec![b], target))
            .unwrap_err()
            .code,
        "ProjectChanged"
    );
    unchanged(&s, &p, &before);
    let same = s.edit(p.revision, edit(vec![], vec![b], 0)).unwrap();
    assert_eq!(
        serde_json::to_value(same).unwrap(),
        serde_json::to_value(&p).unwrap()
    );
    unchanged(&s, &p, &before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":target,"name":"singular","x":12,"y":8,"rotation":15,"length":30,"scaleX":0,"scaleY":1,"shearX":0,"shearY":0}),
    );
    let before = scene_model(&s);
    for attempt in [edit(vec![], vec![b], target), edit(vec![a], vec![], target)] {
        assert!(s.edit(p.revision, attempt).is_err());
        unchanged(&s, &p, &before);
    }
}

#[test]
fn parent_selection_constraint_ancestry_pair_guard_and_complete_chain_setup_parenting() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let a = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, a);
    let b = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let target = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"ik","name":"pair","bones":[a,b],"target":target}}),
    );
    let before = scene_model(&s);
    for attempt in [edit(vec![target], vec![], b), edit(vec![b], vec![], 0)] {
        assert!(s.edit(p.revision, attempt).is_err());
        unchanged(&s, &p, &before);
    }
    let constraints = p.constraints.clone();
    let p = s
        .edit(p.revision, edit(vec![a, b], vec![], target))
        .unwrap();
    assert_eq!(
        p.bones.iter().find(|bone| bone.id == a).unwrap().parent,
        Some(target)
    );
    assert_eq!(
        p.bones.iter().find(|bone| bone.id == b).unwrap().parent,
        Some(a)
    );
    assert_eq!(p.constraints, constraints);
    let after = scene_model(&s);
    assert_eq!(
        decode_scene(&encode_scene_payload(&after).unwrap()).unwrap(),
        after
    );
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
}

#[test]
fn parent_selection_slot_limit_rejects_partial_split_but_full_inventory_moves_in_place() {
    let (_d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let target = p.edited_bone.unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 0., 0.)
        .unwrap();
    let source = p.slots[0].id;
    let mut p = s
        .place_attachments(p.revision, &["B".into()], source)
        .unwrap();
    let ids = p.slots[0]
        .attachments
        .iter()
        .map(|a| a.id)
        .collect::<Vec<_>>();
    let slot_limit = fbones_format::minimal::scene::MAX_SCENE_SLOTS;
    for i in 1..slot_limit {
        p = command(
            &s,
            &p,
            serde_json::json!({"type":"createSlot","bone":0,"name":format!("empty{i}")}),
        );
    }
    let before = scene_model(&s);
    assert!(s
        .edit(p.revision, edit(vec![], vec![ids[1]], target))
        .is_err());
    unchanged(&s, &p, &before);
    let p = s.edit(p.revision, edit(vec![], ids, target)).unwrap();
    assert_eq!(p.slots.len(), slot_limit);
    assert_eq!(p.slots[0].id, source);
    assert_eq!(p.slots[0].bone, target);
}

#[test]
fn parent_selection_multiple_splits_shift_all_endpoints_and_late_singular_failure_is_atomic() {
    let (_d, s, p) = inactive_weighted_clip_fixture();
    let p = add_bone(&s, &p, 0);
    let target = p.edited_bone.unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"createSlot","bone":0,"name":"unaffected endpoint"}),
    );
    let end = p.slots[2].id;
    let clip = p.slots[0].attachments[0].id;
    let image = p.slots[0].attachments[1].id;
    let c = p.slots[1].attachments[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setClipping","id":clip,"endSlot":end,"convex":false,"inverse":true,"color":0x336699ccu32}),
    );
    let before = scene_model(&s);
    let order = inventory_ids(&s);
    let clip_bits = attachment_binding_bits(&moved_attachment(&s, clip).1);
    let clip_points = points(&s, clip);
    let c_points = points(&s, c);
    let image_points = points(&s, image);
    let p = s
        .edit(p.revision, edit(vec![], vec![c, image], target))
        .unwrap();
    assert_eq!(p.slots.len(), 5);
    assert_eq!(p.slots[4].id, end);
    assert_eq!(
        scene_model(&s).slots[0].attachments[0]
            .clipping()
            .unwrap()
            .end_slot,
        Some(4)
    );
    assert_eq!(
        attachment_binding_bits(&moved_attachment(&s, clip).1),
        clip_bits
    );
    assert_eq!(inventory_ids(&s), order);
    same_world_points(&clip_points, &points(&s, clip));
    same_world_points(&c_points, &points(&s, c));
    same_world_points(&image_points, &points(&s, image));
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"update","id":target,"name":"singular batch target","x":12,"y":8,"rotation":15,"length":30,"scaleX":0,"scaleY":1,"shearX":0,"shearY":0}),
    );
    let before = scene_model(&s);
    // The weighted first split succeeds internally without an inverse; the
    // following rigid C split fails. No partial graph or consumed IDs escapes.
    assert!(s
        .edit(p.revision, edit(vec![], vec![clip, c], target))
        .is_err());
    unchanged(&s, &p, &before);
    let p = s
        .edit(p.revision, edit(vec![], vec![clip], target))
        .unwrap();
    // Undo retains the successful allocation high-water mark (slots3/4), but
    // the rejected later batch must not consume slot5.
    assert_eq!(p.slots[1].id, 5);
    assert_eq!(p.slots[1].bone, target);
    assert_eq!(
        attachment_binding_bits(&moved_attachment(&s, clip).1),
        clip_bits
    );
    same_world_points(&clip_points, &points(&s, clip));
}
