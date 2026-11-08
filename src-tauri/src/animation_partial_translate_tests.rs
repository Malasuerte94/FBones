//! Mode1 requires X; Y absence is meaningful data and a valid authoring state.
use super::*;
fn partial() -> SceneProject {
    crate::scene_partial_translate_fixture::project()
}
fn has_y(project: &SceneProject, animation: usize) -> bool {
    project.animations[animation]
        .tracks
        .iter()
        .any(|track| track.channel == BoneChannel::TranslateY)
}
fn all_ids(frame: &SceneFrame, animation: usize) -> std::collections::HashSet<u64> {
    let mut ids = std::collections::HashSet::new();
    for family in [
        &frame.animation_key_ids[animation],
        &frame.animation_slot_key_ids[animation],
        &frame.animation_deform_key_ids[animation],
        &frame.animation_constraint_key_ids[animation],
        &frame.animation_event_key_ids[animation],
        &frame.animation_sequence_key_ids[animation],
    ] {
        ids.extend(family.iter().flatten().copied());
    }
    ids.extend(frame.animation_draw_key_ids[animation].iter().copied());
    ids
}
fn y_key(frame: f32, value: f32) -> BoneKeyframe {
    BoneKeyframe {
        frame,
        values: [value, 0.],
        curve: KeyCurve::Linear,
    }
}
fn with_y(mut project: SceneProject, keys: Vec<BoneKeyframe>) -> SceneProject {
    project.animations[0].tracks.push(BoneTimeline {
        bone: 1,
        channel: BoneChannel::TranslateY,
        keys,
    });
    project.wire.as_mut().unwrap().animation_layouts[0]
        .groups
        .iter_mut()
        .find(|group| group.owner == WireAnimationOwner::Bone(1))
        .unwrap()
        .tracks
        .push(WireTrack::Bone {
            bone: 1,
            channel: BoneChannel::TranslateY,
        });
    normalize_wire_track_order(&mut project).unwrap();
    normalize_wire_strings(&mut project).unwrap();
    project
}
fn insert_y(history: &mut SceneHistory, frame: f32, value: f32) {
    let clip = history.frame().animation_ids[0];
    let bone = history.frame().bone_ids[history.frame().project.animations[0]
        .split_modes
        .iter()
        .find(|row| row.mode == BoneSplitMode::Translate)
        .unwrap()
        .bone];
    op(
        history,
        json!({"type":"setAnimationKeys","animation":clip,"keys":[{"bone":bone,"channel":"translateY","frame":frame,"values":[value,0],"curve":"linear"}]}),
    );
}
#[test]
fn partial_translate_roundtrip_and_animation_local_sampling_keep_setup_y_without_a_timeline() {
    let original = partial();
    roundtrip(&original);
    assert!(!has_y(&original, 0));
    let before = encode_scene_payload(&original).unwrap();
    assert_eq!(original.rig.bones[1].y, 17.25);
    for frame in [0., 4., 11., 12., 21., 24., 40.] {
        let pose = sample(
            &original,
            &original.animations[0],
            frame / f64::from(original.fps),
        )
        .unwrap();
        assert_eq!(pose[1].y, 17.25);
    }
    assert_eq!(encode_scene_payload(&original).unwrap(), before);
    assert_eq!(
        decode_scene(&before).unwrap().animations[0].split_modes,
        original.animations[0].split_modes
    );
}
#[test]
fn partial_translate_first_y_last_y_history_and_recreation_keep_x_modes_and_retire_ids() {
    let original = partial();
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    let before_ids = identities(history.frame(), 0);
    let retired_source_ids = all_ids(history.frame(), 0);
    let before_modes = modes(history.frame());
    let clip = history.frame().animation_ids[0];
    insert_y(&mut history, 21., 5.);
    let created_id = key_id(history.frame(), 1, BoneChannel::TranslateY, 0);
    assert!(!retired_source_ids.contains(&created_id));
    let expected = with_y(original.clone(), vec![y_key(21., 5.)]);
    assert_eq!(
        encode_scene_payload(&history.frame().project).unwrap(),
        encode_scene_payload(&expected).unwrap()
    );
    for (id, payload) in &before_ids {
        assert_eq!(identities(history.frame(), 0).get(id), Some(payload));
    }
    assert_eq!(modes(history.frame()), before_modes);
    let before_first = sample(
        &history.frame().project,
        &history.frame().project.animations[0],
        20. / 24.,
    )
    .unwrap();
    assert_eq!(before_first[1].y, 17.25);
    let after_first = sample(
        &history.frame().project,
        &history.frame().project.animations[0],
        21. / 24.,
    )
    .unwrap();
    assert_eq!(after_first[1].y, 22.25);
    history.apply(SceneEdit::Undo).unwrap();
    assert!(!history.can_undo());
    assert_eq!(history.frame().project, original);
    assert_eq!(identities(history.frame(), 0), before_ids);
    history.apply(SceneEdit::Redo).unwrap();
    assert_eq!(
        key_id(history.frame(), 1, BoneChannel::TranslateY, 0),
        created_id
    );
    op(
        &mut history,
        json!({"type":"deleteAnimationKeys","animation":clip,"keys":[created_id]}),
    );
    assert_eq!(history.frame().project, original);
    assert!(!has_y(&history.frame().project, 0));
    assert_eq!(modes(history.frame()), before_modes);
    let x_only_ids = identities(history.frame(), 0);
    let x = (0..3)
        .map(|index| key_id(history.frame(), 1, BoneChannel::TranslateX, index))
        .collect();
    assert!(history
        .apply(SceneEdit::Animation(RigEdit::DeleteAnimationKeys {
            animation: clip,
            keys: x
        }))
        .is_err());
    let red = history.frame().bone_ids[1];
    assert!(history
        .apply(SceneEdit::Animation(RigEdit::SetAnimationKey {
            animation: clip,
            key: KeyInput {
                bone: red,
                channel: ChannelInput::TranslateY,
                key_id: Some(created_id),
                frame: 21.,
                values: [5., 0.],
                curve: CurveInput::Linear,
                controls: None
            }
        }))
        .is_err());
    assert_eq!(history.frame().project, original);
    assert_eq!(identities(history.frame(), 0), x_only_ids);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(
        key_id(history.frame(), 1, BoneChannel::TranslateY, 0),
        created_id
    );
    history.apply(SceneEdit::Redo).unwrap();
    insert_y(&mut history, 21., 7.);
    let recreated_id = key_id(history.frame(), 1, BoneChannel::TranslateY, 0);
    assert_ne!(created_id, recreated_id);
    assert!(!retired_source_ids.contains(&recreated_id));
    assert_eq!(
        track(&history.frame().project, 1, BoneChannel::TranslateX),
        track(&original, 1, BoneChannel::TranslateX)
    );
    assert_eq!(modes(history.frame()), before_modes);
    let stable = history.frame().project.clone();
    let stable_ids = identities(history.frame(), 0);
    for keys in [
        (0..3)
            .map(|index| key_id(history.frame(), 1, BoneChannel::TranslateX, index))
            .collect::<Vec<_>>(),
        (0..3)
            .map(|index| key_id(history.frame(), 1, BoneChannel::TranslateX, index))
            .chain([recreated_id])
            .collect::<Vec<_>>(),
        (0..2)
            .map(|index| key_id(history.frame(), 2, BoneChannel::ScaleY, index))
            .collect::<Vec<_>>(),
    ] {
        assert!(history
            .apply(SceneEdit::Animation(RigEdit::DeleteAnimationKeys {
                animation: clip,
                keys
            }))
            .is_err());
        assert_eq!(history.frame().project, stable);
        assert_eq!(identities(history.frame(), 0), stable_ids);
        assert_eq!(modes(history.frame()), before_modes);
    }
    roundtrip(&history.frame().project);
}
#[test]
fn partial_translate_remap_duplicate_and_mixed_scalar_paste_keep_mode_and_unrelated_key_ids() {
    let mut history = SceneHistory::new(partial(), true).unwrap();
    let clip = history.frame().animation_ids[0];
    let red = history.frame().bone_ids[1];
    let green = history.frame().bone_ids[2];
    let root = history.frame().bone_ids[0];
    let slot = history.frame().slot_ids[0];
    let attachment = history.frame().attachment_ids[0][0];
    let source_ids = identities(history.frame(), 0);
    let source_modes = modes(history.frame());
    let all_source_ids = all_ids(history.frame(), 0);
    op(
        &mut history,
        json!({"type":"reparent","id":red,"parent":green}),
    );
    assert_eq!(identities(history.frame(), 0), source_ids);
    assert_eq!(modes(history.frame()), source_modes);
    assert!(!has_y(&history.frame().project, 0));
    let before_delete = history.frame().project.clone();
    assert!(history
        .apply(SceneEdit::Rig(RigEdit::Delete { id: red }))
        .is_err());
    assert_eq!(history.frame().project, before_delete);
    assert_eq!(identities(history.frame(), 0), source_ids);
    assert_eq!(modes(history.frame()), source_modes);
    op(
        &mut history,
        json!({"type":"duplicateAnimation","id":clip,"name":"Own X-only duplicate"}),
    );
    assert!(!has_y(&history.frame().project, 2));
    assert_eq!(
        history.frame().project.animations[2].split_modes,
        history.frame().project.animations[0].split_modes
    );
    assert!(all_ids(history.frame(), 2).is_disjoint(&all_source_ids));
    let duplicate = history.frame().animation_ids[2];
    let before = history.frame().project.clone();
    let source_slot_ids = history.frame().animation_slot_key_ids[0].clone();
    op(
        &mut history,
        json!({"type":"setAnimationKeyBatch","animation":clip,"boneKeys":[{"bone":red,"channel":"translateY","frame":21,"values":[5,0],"curve":"linear"},{"bone":root,"channel":"translate","frame":21,"values":[3,4],"curve":"linear"}],"slotKeys":[{"slot":slot,"channel":"rgba","frame":21,"values":[0.5,0.75,1,0.5],"curve":"linear"}],"sequenceKeys":[{"attachment":attachment,"frame":21,"mode":0,"index":2,"delay":0.125}]}),
    );
    assert!(has_y(&history.frame().project, 0));
    for (id, payload) in &source_ids {
        assert_eq!(identities(history.frame(), 0).get(id), Some(payload));
    }
    assert_eq!(modes(history.frame()), source_modes);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, before);
    assert_eq!(history.frame().animation_slot_key_ids[0], source_slot_ids);
    history.apply(SceneEdit::Redo).unwrap();
    op(
        &mut history,
        json!({"type":"setAnimationKeys","animation":duplicate,"keys":[{"bone":red,"channel":"translateY","frame":21,"values":[5,0],"curve":"linear"}]}),
    );
    assert!(has_y(&history.frame().project, 2));
    let ordinary = history.frame().animation_ids[1];
    let stable = history.frame().project.clone();
    let command = serde_json::from_value(json!({"type":"setAnimationKeys","animation":ordinary,"keys":[{"bone":red,"channel":"translateY","frame":21,"values":[5,0],"curve":"linear"}]})).unwrap();
    assert!(history.apply(SceneEdit::Animation(command)).is_err());
    assert_eq!(history.frame().project, stable);
}
#[test]
fn partial_translate_real_session_sampling_save_without_y_then_create_delete_y_and_reopen_exactly()
{
    let directory = tempfile::tempdir().unwrap();
    std::fs::create_dir(directory.path().join("images")).unwrap();
    let original = partial();
    for key in crate::animation_sequence::all_image_keys(&original).unwrap() {
        std::fs::write(
            directory.path().join("images").join(format!("{key}.png")),
            crate::images::tests::png([40, 90, 210, 255]),
        )
        .unwrap();
    }
    let source = directory.path().join("own-partial.spine");
    let source_bytes = encode_scene(&original).unwrap();
    std::fs::write(&source, &source_bytes).unwrap();
    let session = Session::default();
    let initial = session
        .replace(open_document(source.clone()).unwrap(), false)
        .unwrap();
    assert!(!initial.inspection_only);
    assert!(!initial.animations[0]
        .tracks
        .iter()
        .any(|track| track.channel == "translateY"));
    let clip = initial.animations[0].id;
    let red = initial.bones[1].id;
    let snapshot = session
        .evaluate(
            initial.revision,
            crate::evaluation::EvaluationRequest {
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                animation_id: Some(clip),
                mode: crate::evaluation::EvaluationMode::None,
                time: 21. / 24.,
                motion: None,
                from_pose_epoch: None,
            },
        )
        .unwrap();
    assert_eq!(snapshot.bones[1].authored.y, 17.25);
    let first_path = directory.path().join("without-y/source.fbones");
    let first = session
        .save_snapshot(session.prepare_save(true).unwrap(), first_path.clone())
        .unwrap();
    let first_payload = ProjectEnvelope::inspect(std::fs::read(&first_path).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    let mut expected = original.clone();
    expected.images_root = "./images/".into();
    normalize_wire_strings(&mut expected).unwrap();
    assert_eq!(first_payload, encode_scene_payload(&expected).unwrap());
    assert!(!has_y(&decode_scene(&first_payload).unwrap(), 0));
    let command = serde_json::from_value(json!({"type":"setAnimationKeys","animation":clip,"keys":[{"bone":red,"channel":"translateY","frame":21,"values":[5,0],"curve":"linear"}]})).unwrap();
    let created = session.edit(first.revision, command).unwrap();
    let y = created.animations[0]
        .tracks
        .iter()
        .find(|track| track.channel == "translateY")
        .unwrap()
        .keys[0]
        .id;
    let with_path = directory.path().join("with-y/source.fbones");
    let saved_with = session
        .save_snapshot(session.prepare_save(true).unwrap(), with_path.clone())
        .unwrap();
    let with_payload = ProjectEnvelope::inspect(std::fs::read(with_path).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    let expected_with = with_y(expected, vec![y_key(21., 5.)]);
    assert_eq!(with_payload, encode_scene_payload(&expected_with).unwrap());
    let deleted = session
        .edit(
            saved_with.revision,
            RigEdit::DeleteAnimationKeys {
                animation: clip,
                keys: vec![y],
            },
        )
        .unwrap();
    assert!(!deleted.animations[0]
        .tracks
        .iter()
        .any(|track| track.channel == "translateY"));
    let last_path = directory.path().join("without-y-again/source.fbones");
    let saved_without = session
        .save_snapshot(session.prepare_save(true).unwrap(), last_path.clone())
        .unwrap();
    let final_payload = ProjectEnvelope::inspect(std::fs::read(&last_path).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    assert_eq!(final_payload, first_payload);
    let stable = serde_json::to_value(&saved_without).unwrap();
    let x = saved_without.animations[0]
        .tracks
        .iter()
        .find(|track| track.channel == "translateX")
        .unwrap()
        .keys
        .iter()
        .map(|key| key.id)
        .collect::<Vec<_>>();
    assert!(session
        .edit(
            saved_without.revision,
            RigEdit::DeleteAnimationKeys {
                animation: clip,
                keys: x
            }
        )
        .is_err());
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        stable
    );
    assert_eq!(
        std::fs::read(&last_path).unwrap(),
        std::fs::read(&first_path).unwrap()
    );
    assert_eq!(std::fs::read(source).unwrap(), source_bytes);
    let reopened = Session::default()
        .replace(open_document(last_path).unwrap(), false)
        .unwrap();
    assert!(!reopened.inspection_only);
    assert!(!reopened.animations[0]
        .tracks
        .iter()
        .any(|track| track.channel == "translateY"));
    assert_eq!(
        reopened.animations[0]
            .split_modes
            .iter()
            .map(|row| row.mode)
            .collect::<Vec<_>>(),
        vec![2, 1]
    );
}
#[test]
fn partial_translate_family_batch_creates_both_axes_once_or_rejects_without_partial_y() {
    let original = partial();
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    let clip = history.frame().animation_ids[0];
    let red = history.frame().bone_ids[1];
    let before_ids = identities(history.frame(), 0);
    let before_modes = modes(history.frame());
    // Y is deliberately first: a later X Bezier-neighbor rejection must not
    // leak a Y timeline/key, an allocated identity, or a history transaction.
    let command = |frame: f32| json!({"type":"setAnimationKeys","animation":clip,"keys":[{"bone":red,"channel":"translateY","frame":frame,"values":[5,0],"curve":"linear"},{"bone":red,"channel":"translateX","frame":frame,"values":[3,0],"curve":"linear"}]});
    assert!(history
        .apply(SceneEdit::Animation(
            serde_json::from_value(command(11.)).unwrap()
        ))
        .is_err());
    assert_eq!(history.frame().project, original);
    assert_eq!(identities(history.frame(), 0), before_ids);
    assert_eq!(modes(history.frame()), before_modes);
    assert!(!history.can_undo());
    op(&mut history, command(21.));
    assert!(has_y(&history.frame().project, 0));
    assert_eq!(
        track(&history.frame().project, 1, BoneChannel::TranslateX)
            .keys
            .len(),
        4
    );
    assert_eq!(
        track(&history.frame().project, 1, BoneChannel::TranslateY)
            .keys
            .len(),
        1
    );
    assert_eq!(modes(history.frame()), before_modes);
    let changed = history.frame().project.clone();
    let changed_ids = identities(history.frame(), 0);
    history.apply(SceneEdit::Undo).unwrap();
    assert!(!history.can_undo());
    assert_eq!(history.frame().project, original);
    assert_eq!(identities(history.frame(), 0), before_ids);
    history.apply(SceneEdit::Redo).unwrap();
    assert_eq!(history.frame().project, changed);
    assert_eq!(identities(history.frame(), 0), changed_ids);
    roundtrip(&changed);
}
