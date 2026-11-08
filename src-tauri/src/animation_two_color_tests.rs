use crate::{
    animation_slots,
    project::{open_document, Session},
    rig::RigEdit,
    scene_edit::{SceneEdit, SceneHistory},
};
use fbones_format::{minimal::scene::*, ProjectEnvelope};
use serde_json::{json, Value};
fn fixture() -> SceneProject {
    crate::scene_two_color_fixture::project()
}
fn roundtrip(p: &SceneProject) {
    let bytes = encode_scene_payload(p).unwrap();
    assert_eq!(decode_scene(&bytes).unwrap(), *p);
    assert_eq!(
        encode_scene_payload(&decode_scene(&bytes).unwrap()).unwrap(),
        bytes
    );
}
fn op(history: &mut SceneHistory, value: Value) -> bool {
    let changed = history
        .apply(SceneEdit::Animation(serde_json::from_value(value).unwrap()))
        .unwrap();
    roundtrip(&history.frame().project);
    changed
}
fn color_keys(p: &SceneProject, slot: usize) -> &[SlotRgbaKey] {
    p.animations[0]
        .slot_tracks
        .iter()
        .find_map(|track| {
            if let SlotTimeline::Rgba { slot: owner, keys } = track {
                (*owner == slot).then_some(keys.as_slice())
            } else {
                None
            }
        })
        .unwrap()
}
fn rebuild(p: &mut SceneProject) {
    let layouts = (0..p.animations.len())
        .map(|a| animation_layout(p, a).unwrap())
        .collect();
    p.wire.as_mut().unwrap().animation_layouts = layouts;
    normalize_wire_track_order(p).unwrap();
}
#[test]
fn two_color_native_setup_mid_end_sampling_never_bakes_or_changes_texture_geometry() {
    let original = fixture();
    roundtrip(&original);
    let history = SceneHistory::new(original.clone(), true).unwrap();
    let frame = history.frame();
    let samples = [
        (0., [32. / 255., 64. / 255., 96. / 255.]),
        (6., [0.2, 0.4, 0.6]),
        (12., [0.5, 0.5, 0.4]),
        (24., [0.8, 0.6, 0.2]),
    ];
    for (position, expected) in samples {
        let result =
            animation_slots::sample(frame, Some(&frame.project.animations[0]), position / 24.)
                .unwrap();
        for (actual, expected) in result[0].dark.into_iter().zip(expected) {
            assert!((actual - expected).abs() < 1e-7);
        }
    }
    assert!(history.frame().project.slot_dark_color(1).enabled);
    assert_eq!(
        history.frame().project.slot_dark_color(1).color,
        [0, 0, 0, 255]
    );
    assert_eq!(history.frame().project, original);
}
#[test]
fn two_color_omitted_payload_and_numeric_equal_updates_preserve_raw_bits_and_sample_new_keys() {
    let mut original = fixture();
    let source = original.animations[0]
        .slot_tracks
        .iter_mut()
        .find_map(|track| {
            if let SlotTimeline::Rgba { slot: 0, keys } = track {
                Some(&mut keys[0])
            } else {
                None
            }
        })
        .unwrap();
    source.frame = -0.;
    source.values[1] = -0.;
    source.dark_values[0] = -0.;
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    let slot = history.frame().slot_ids[0];
    let clip = history.frame().animation_ids[0];
    let track = history.frame().project.animations[0]
        .slot_tracks
        .iter()
        .position(|t| matches!(t, SlotTimeline::Rgba { slot: 0, .. }))
        .unwrap();
    let id = history.frame().animation_slot_key_ids[0][track][0];
    assert!(!op(
        &mut history,
        json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[{"slot":slot,"channel":"rgba","keyId":id,"frame":0,"values":[1,0,0.25,0.75],"darkValues":[0,0.4,0.6],"curve":"linear"}]})
    ));
    assert!(!history.can_undo());
    assert!(op(
        &mut history,
        json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[{"slot":slot,"channel":"rgba","keyId":id,"frame":0,"values":[1,0,0.25,0.875],"curve":"linear"}]})
    ));
    let key = &color_keys(&history.frame().project, 0)[0];
    assert_eq!(key.frame.to_bits(), 0x80000000);
    assert_eq!(key.values[1].to_bits(), 0x80000000);
    assert_eq!(key.dark_values[0].to_bits(), 0x80000000);
    assert_eq!(key.dark_values[1..], [0.4, 0.6]);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, original);
    history.apply(SceneEdit::Redo).unwrap();
    let expected = animation_slots::sample(
        history.frame(),
        Some(&history.frame().project.animations[0]),
        0.5,
    )
    .unwrap()[0]
        .dark
        .map(|value| value as f32);
    op(
        &mut history,
        json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[{"slot":slot,"channel":"rgba","frame":12,"values":[1,1,1,1],"curve":"linear"}]}),
    );
    let keys = color_keys(&history.frame().project, 0);
    assert_eq!(
        keys[1].dark_values.map(f32::to_bits),
        expected.map(f32::to_bits)
    );
    assert_eq!(keys[0].dark_values[0].to_bits(), 0x80000000);
    assert_eq!(history.frame().animation_slot_key_ids[0][track][0], id);
    roundtrip(&history.frame().project);
}
#[test]
fn disabled_dormant_setup_rgb_is_retained_but_never_sampled_or_authored_into_keys() {
    let mut p = fixture();
    p.slot_dark_colors[0] = SlotDarkColor {
        slot: 0,
        enabled: false,
        color: [100, 150, 200, 255],
    };
    p.animations[0]
        .slot_tracks
        .retain(|t| !matches!(t, SlotTimeline::Rgba { slot: 0, .. }));
    rebuild(&mut p);
    let mut history = SceneHistory::new(p, true).unwrap();
    let slot = history.frame().slot_ids[0];
    let clip = history.frame().animation_ids[0];
    assert_eq!(
        animation_slots::sample(history.frame(), None, 0.).unwrap()[0].dark,
        [0.; 3]
    );
    op(
        &mut history,
        json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[{"slot":slot,"channel":"rgba","frame":0,"values":[1,1,1,1],"curve":"linear"}]}),
    );
    assert_eq!(
        color_keys(&history.frame().project, 0)[0]
            .dark_values
            .map(f32::to_bits),
        [0; 3]
    );
    assert_eq!(
        history.frame().project.slot_dark_color(0).color,
        [100, 150, 200, 255]
    );
    let before = history.frame().project.clone();
    for dark in [json!([0.1, 0, 0]), json!([-0.0, 0, 0])] {
        let edit=serde_json::from_value(json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[{"slot":slot,"channel":"rgba","frame":0,"values":[1,1,1,1],"darkValues":dark,"curve":"linear"}]})).unwrap();
        assert!(history.apply(SceneEdit::Animation(edit)).is_err());
        assert_eq!(history.frame().project, before);
    }
}
#[test]
fn two_color_incompatible_toggle_curve_controls_and_alpha_reject_without_data_loss() {
    let mut history = SceneHistory::new(fixture(), true).unwrap();
    let slot = history.frame().slot_ids[0];
    let clip = history.frame().animation_ids[0];
    let before = history.frame().project.clone();
    for (enabled, color) in [(false, 0x204060ff), (true, 0x20406080)] {
        assert!(history
            .apply(SceneEdit::SetSlotDarkColor {
                id: slot,
                enabled,
                color
            })
            .is_err());
        assert_eq!(history.frame().project, before);
    }
    for payload in [
        json!({"curve":"stepped"}),
        json!({"curve":"linear","darkControls":[[0,0,1,1],[0,0,1,1],[0,0,1,1]]}),
    ] {
        let mut key = json!({"slot":slot,"channel":"rgba","frame":6,"values":[1,0.5,0.25,0.75],"darkValues":[0.2,0.4,0.6],"curve":"linear"});
        for (k, v) in payload.as_object().unwrap() {
            key[k] = v.clone();
        }
        let edit = serde_json::from_value(
            json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[key]}),
        )
        .unwrap();
        assert!(history.apply(SceneEdit::Animation(edit)).is_err());
        assert_eq!(history.frame().project, before);
    }
    let mut p = crate::scene_sequence_fixture::project();
    let SlotTimeline::Rgba { keys, .. } = p.animations[0]
        .slot_tracks
        .iter_mut()
        .find(|track| matches!(track, SlotTimeline::Rgba { slot: 1, .. }))
        .unwrap()
    else {
        unreachable!()
    };
    keys[0].curve = SlotRgbaCurve::Stepped;
    let mut legacy = SceneHistory::new(p, true).unwrap();
    let before = legacy.frame().project.clone();
    assert!(legacy
        .apply(SceneEdit::SetSlotDarkColor {
            id: legacy.frame().slot_ids[1],
            enabled: true,
            color: 0x000000ff
        })
        .is_err());
    assert_eq!(legacy.frame().project, before);
}
#[test]
fn two_color_mixed_batch_history_duplicate_and_slot_reorder_preserve_one_key_identity() {
    let original = fixture();
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    let slot = history.frame().slot_ids[0];
    let clip = history.frame().animation_ids[0];
    let bone = history.frame().bone_ids[1];
    op(
        &mut history,
        json!({"type":"setAnimationKeyBatch","animation":clip,"boneKeys":[{"bone":bone,"channel":"translate","frame":12,"values":[7,9],"curve":"linear"}],"slotKeys":[{"slot":slot,"channel":"rgba","frame":12,"values":[1,0.75,0.5,0.25],"darkValues":[0.25,0.5,0.75],"curve":"linear"}]}),
    );
    let changed = history.frame().project.clone();
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, original);
    history.apply(SceneEdit::Redo).unwrap();
    assert_eq!(history.frame().project, changed);
    let before_ids = history.frame().animation_slot_key_ids[0].clone();
    op(
        &mut history,
        json!({"type":"duplicateAnimation","id":clip,"name":"Own joint color duplicate"}),
    );
    assert_eq!(
        history.frame().project.animations[2].slot_tracks,
        history.frame().project.animations[0].slot_tracks
    );
    assert!(history.frame().animation_slot_key_ids[2]
        .iter()
        .flatten()
        .all(|id| !before_ids.iter().flatten().any(|old| old == id)));
    history
        .apply(SceneEdit::ReorderSlot { id: slot, index: 1 })
        .unwrap();
    let index = history.frame().slot_index(slot).unwrap();
    assert_eq!(index, 1);
    assert_eq!(
        history.frame().project.slot_dark_color(index).color,
        [32, 64, 96, 255]
    );
    assert!(history.frame().project.slot_dark_color(index).enabled);
    roundtrip(&history.frame().project);
    let mut disposable = history.frame().project.clone();
    for clip in &mut disposable.animations {
        clip.slot_tracks.clear();
        clip.sequence_tracks.clear();
        clip.deform_tracks.clear();
        clip.draw_order.clear();
    }
    rebuild(&mut disposable);
    let mut deletion = SceneHistory::new(disposable, true).unwrap();
    let removed = deletion.frame().slot_ids[0];
    let survivor = deletion.frame().slot_ids[1];
    let root = deletion.frame().bone_ids[0];
    deletion
        .apply(SceneEdit::DeleteSlot { id: removed })
        .unwrap();
    assert_eq!(deletion.frame().slot_ids[0], survivor);
    assert_eq!(deletion.frame().project.slot_dark_colors.len(), 1);
    assert_eq!(
        deletion.frame().project.slot_dark_color(0).color,
        [32, 64, 96, 255]
    );
    deletion
        .apply(SceneEdit::CreateSlot {
            bone: root,
            name: Some("Own new slot".into()),
        })
        .unwrap();
    assert_ne!(deletion.frame().slot_ids[1], removed);
    assert!(!deletion.frame().project.slot_dark_color(1).enabled);
    assert_eq!(
        deletion.frame().project.slot_dark_color(1).color,
        [0, 0, 0, 255]
    );
    roundtrip(&deletion.frame().project);
}
#[test]
fn two_color_native_summary_sample_edit_save_and_reopen_preserve_joint_keys_and_geometry() {
    let directory = tempfile::tempdir().unwrap();
    std::fs::create_dir(directory.path().join("images")).unwrap();
    let original = fixture();
    for key in crate::animation_sequence::all_image_keys(&original).unwrap() {
        std::fs::write(
            directory.path().join("images").join(format!("{key}.png")),
            crate::images::tests::png([0, 0, 0, 255]),
        )
        .unwrap();
    }
    let source = directory.path().join("own-two-color.spine");
    std::fs::write(&source, encode_scene(&original).unwrap()).unwrap();
    let session = Session::default();
    let before = session
        .replace(open_document(source).unwrap(), false)
        .unwrap();
    assert!(before.slots[0].tint_black && before.slots[1].tint_black);
    assert_eq!(before.slots[0].dark_color, 0x204060ff);
    assert_eq!(before.slots[1].dark_color, 255);
    let after = session
        .edit(
            before.revision,
            RigEdit::SetSlotDarkColor {
                id: before.slots[0].id,
                enabled: true,
                color: 0x406080ff,
            },
        )
        .unwrap();
    assert_eq!(
        serde_json::to_value(&after.animations).unwrap(),
        serde_json::to_value(&before.animations).unwrap()
    );
    assert_eq!(after.slots[0].dark_color, 0x406080ff);
    let path = directory.path().join("saved-two-color.fbones");
    session
        .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    let envelope = ProjectEnvelope::inspect(std::fs::read(&path).unwrap()).unwrap();
    let model = decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
    assert_eq!(model.slot_dark_color(0).color, [64, 96, 128, 255]);
    assert_eq!(model.animations, original.animations);
    assert_eq!(model.slots, original.slots);
    assert_eq!(model.rig, original.rig);
    assert_eq!(model.attachment_sequences, original.attachment_sequences);
    let reopened = Session::default()
        .replace(open_document(path).unwrap(), false)
        .unwrap();
    assert!(reopened.slots[0].tint_black);
    assert_eq!(reopened.slots[0].dark_color, 0x406080ff);
    let track = reopened.animations[0]
        .slot_tracks
        .iter()
        .find_map(|t| {
            if let animation_slots::SlotTrackView::Rgba { slot, keys } = t {
                (*slot == reopened.slots[0].id).then_some(keys)
            } else {
                None
            }
        })
        .unwrap();
    assert_eq!(track[0].dark_values, [0.2, 0.4, 0.6]);
}
