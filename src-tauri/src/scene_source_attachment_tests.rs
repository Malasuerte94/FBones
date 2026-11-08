//! Source Slot8 is retained separately from the established active Slot9.
//! Non-following and invalidation are explicit FBones policies, not Spine UX proof.
use crate::scene_edit::{SceneEdit, SceneHistory};
use fbones_format::minimal::scene::{
    decode_scene, encode_scene_payload, normalize_wire_strings, AttachmentAddress, SceneProject,
};
use serde_json::json;

fn address(slot: usize) -> AttachmentAddress {
    AttachmentAddress {
        slot,
        attachment: 0,
    }
}
fn source() -> SceneProject {
    let mut project = crate::scene_wire_fixture::project();
    project.wire.as_mut().unwrap().slot_references_8 = vec![address(0), address(1)];
    normalize_wire_strings(&mut project).unwrap();
    roundtrip(&project);
    project
}
fn roundtrip(project: &SceneProject) -> Vec<u8> {
    let payload = encode_scene_payload(project).unwrap();
    let decoded = decode_scene(&payload).unwrap();
    assert_eq!(&decoded, project);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), payload);
    payload
}
fn references(history: &SceneHistory) -> Vec<AttachmentAddress> {
    history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .slot_references_8
        .clone()
}

#[test]
fn retained_slot_reference_does_not_follow_active_selection_and_undo_restores_it() {
    let project = source();
    let payload = roundtrip(&project);
    let mut history = SceneHistory::new(project.clone(), true).unwrap();
    let slot = history.frame().slot_ids[0];
    history
        .apply(SceneEdit::SetActive {
            slot,
            attachment: None,
        })
        .unwrap();
    assert_eq!(history.frame().project.slots[0].active_attachment, None);
    assert_eq!(references(&history), [address(0), address(1)]);
    // Slot8 still owns the original Region while active Slot9 is explicitly None.
    roundtrip(&history.frame().project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, project);
    assert_eq!(roundtrip(&history.frame().project), payload);
    history.apply(SceneEdit::Redo).unwrap();
    assert_eq!(references(&history), [address(0), address(1)]);
    assert_eq!(history.frame().project.slots[0].active_attachment, None);
}

#[test]
fn retained_slot_reference_remaps_by_ids_and_clears_only_deleted_or_moved_targets() {
    let project = source();
    let mut history = SceneHistory::new(project, true).unwrap();
    history
        .apply(SceneEdit::ReorderSlot { id: 1, index: 0 })
        .unwrap();
    assert_eq!(history.frame().slot_ids, [1, 0]);
    for reference in references(&history) {
        let frame = history.frame();
        assert_eq!(
            frame.attachment_ids[reference.slot][reference.attachment],
            frame.slot_ids[reference.slot]
        );
    }
    let reordered = history.frame().project.clone();
    roundtrip(&reordered);
    history
        .apply(SceneEdit::Rig(
            serde_json::from_value(json!({"type":"moveAttachment","id":1,"slot":0})).unwrap(),
        ))
        .unwrap();
    assert_eq!(references(&history), [address(1)]);
    assert_eq!(history.frame().attachment_ids[1], [0, 1]);
    roundtrip(&history.frame().project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, reordered);
    history
        .apply(SceneEdit::DeleteAttachment { id: 1 })
        .unwrap();
    assert_eq!(references(&history), [address(1)]);
    roundtrip(&history.frame().project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, reordered);
    history
        .apply(SceneEdit::CreateSlot {
            bone: 0,
            name: Some("Own new slot".into()),
        })
        .unwrap();
    assert_eq!(references(&history), [address(0), address(1)]);
    assert_eq!(history.frame().project.slots.len(), 3);
    assert!(history.frame().project.slots[2].attachments.is_empty());
    roundtrip(&history.frame().project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, reordered);
}

fn stateful_source() -> SceneProject {
    use fbones_format::minimal::scene::*;
    let mut project = source();
    project.constraints = vec![
        Constraint::Ik(IkConstraint::new("Own source IK".into(), vec![1], 2)),
        Constraint::Transform(TransformConstraint::new(
            "Own source follow".into(),
            vec![2],
            1,
        )),
        Constraint::Physics(PhysicsConstraint::new("Own source spring".into(), 1)),
    ];
    let f = |value| FiniteF32::new(value).unwrap();
    project.wire.as_mut().unwrap().source_state = Some(WireSourceState {
        skeleton_126: true,
        bone_126: vec![1],
        slot_126: vec![1],
        bone_labels_28: vec![(1, "ik".into())],
        animation_3: vec![0],
        group_2: [9; 5],
        skeleton_toggles: [true, false, true, false, false, false, true],
        mesh_19: vec![(address(1), f(103.5))],
        ik: vec![WireIkSourceState {
            constraint: 0,
            mix_6: f(0.75),
            uint_17: 1,
        }],
        transform: vec![WireTransformSourceState {
            constraint: 1,
            values: [f(-0.); 6],
        }],
        physics: vec![WirePhysicsSourceState {
            constraint: 2,
            values: [f(0.5); 7],
        }],
    });
    normalize_wire_strings(&mut project).unwrap();
    roundtrip(&project);
    project
}

#[test]
fn retained_source_snapshots_do_not_drive_none_pose_and_follow_constraint_identity() {
    use crate::solve::{evaluate, PhysicsState, StepMode};
    let project = stateful_source();
    let mut baseline = project.clone();
    baseline.wire.as_mut().unwrap().source_state = None;
    normalize_wire_strings(&mut baseline).unwrap();
    assert_eq!(project.rig, baseline.rig);
    assert_eq!(project.constraints, baseline.constraints);
    assert_eq!(
        evaluate(&project, None, &mut PhysicsState::default(), StepMode::None).unwrap(),
        evaluate(
            &baseline,
            None,
            &mut PhysicsState::default(),
            StepMode::None
        )
        .unwrap()
    );
    let mut history = SceneHistory::new(project.clone(), true).unwrap();
    history
        .apply(SceneEdit::ReorderConstraint { id: 2, index: 0 })
        .unwrap();
    let state = history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .source_state
        .as_ref()
        .unwrap();
    assert_eq!(state.ik[0].constraint, 1);
    assert_eq!(state.transform[0].constraint, 2);
    assert_eq!(state.physics[0].constraint, 0);
    assert_eq!(
        state.physics[0].values.map(|value| value.to_bits()),
        [0.5f32.to_bits(); 7]
    );
    roundtrip(&history.frame().project);
    let reordered = history.frame().project.clone();
    history
        .apply(SceneEdit::DeleteConstraint { id: 2 })
        .unwrap();
    let state = history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .source_state
        .as_ref()
        .unwrap();
    assert!(state.physics.is_empty());
    assert_eq!(state.ik[0].constraint, 0);
    assert_eq!(state.transform[0].constraint, 1);
    roundtrip(&history.frame().project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, reordered);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, project);
}

#[test]
fn source_owner_state_survives_reparent_move_and_history_without_index_reuse() {
    let project = stateful_source();
    let mut history = SceneHistory::new(project.clone(), true).unwrap();
    history
        .apply(SceneEdit::Rig(
            serde_json::from_value(json!({"type":"reparent","id":1,"parent":2})).unwrap(),
        ))
        .unwrap();
    assert_eq!(history.frame().bone_ids, [0, 2, 1]);
    let state = history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .source_state
        .as_ref()
        .unwrap();
    assert_eq!(state.bone_126, [2]);
    assert_eq!(state.bone_labels_28, [(2, "ik".into())]);
    roundtrip(&history.frame().project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, project);
    history
        .apply(SceneEdit::ReorderSlot { id: 1, index: 0 })
        .unwrap();
    let state = history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .source_state
        .as_ref()
        .unwrap();
    assert_eq!(state.slot_126, [0]);
    assert_eq!(state.mesh_19[0].0, address(0));
    history
        .apply(SceneEdit::Rig(
            serde_json::from_value(json!({"type":"moveAttachment","id":1,"slot":0})).unwrap(),
        ))
        .unwrap();
    let state = history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .source_state
        .as_ref()
        .unwrap();
    assert_eq!(state.slot_126, [0]);
    assert_eq!(
        state.mesh_19[0].0,
        AttachmentAddress {
            slot: 1,
            attachment: 1
        }
    );
    assert_eq!(state.mesh_19[0].1.to_bits(), 103.5f32.to_bits());
    roundtrip(&history.frame().project);
    let moved = history.frame().project.clone();
    history
        .apply(SceneEdit::DeleteAttachment { id: 1 })
        .unwrap();
    assert!(history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .source_state
        .as_ref()
        .unwrap()
        .mesh_19
        .is_empty());
    roundtrip(&history.frame().project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, moved);
    history.apply(SceneEdit::Undo).unwrap();
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, project);
    history
        .apply(SceneEdit::Animation(
            serde_json::from_value(
                json!({"type":"duplicateAnimation","id":0,"name":"Own fresh copy"}),
            )
            .unwrap(),
        ))
        .unwrap();
    assert_eq!(history.frame().project.animations.len(), 3);
    assert_eq!(
        history
            .frame()
            .project
            .wire
            .as_ref()
            .unwrap()
            .source_state
            .as_ref()
            .unwrap()
            .animation_3,
        [0]
    );
    roundtrip(&history.frame().project);
    history
        .apply(SceneEdit::Animation(
            serde_json::from_value(json!({"type":"deleteAnimation","id":0})).unwrap(),
        ))
        .unwrap();
    assert!(history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .source_state
        .as_ref()
        .unwrap()
        .animation_3
        .is_empty());
    roundtrip(&history.frame().project);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(
        history
            .frame()
            .project
            .wire
            .as_ref()
            .unwrap()
            .source_state
            .as_ref()
            .unwrap()
            .animation_3,
        [0]
    );
}
