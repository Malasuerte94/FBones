use super::*;
use crate::{
    project::{open_document, Session},
    scene_edit::{SceneEdit, SceneFrame, SceneHistory},
};
use fbones_format::{minimal::scene::*, ProjectEnvelope};
use serde_json::{json, Value};
use std::collections::BTreeMap;
fn fixture() -> SceneProject {
    crate::scene_split_fixture::project()
}
fn roundtrip(p: &SceneProject) {
    let bytes = encode_scene_payload(p).unwrap();
    let decoded = decode_scene(&bytes).unwrap();
    assert_eq!(*p, decoded);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
}
fn op(h: &mut SceneHistory, value: Value) -> bool {
    let command: RigEdit = serde_json::from_value(value).unwrap();
    let changed = h
        .apply(if is_edit(&command) {
            SceneEdit::Animation(command)
        } else {
            SceneEdit::Rig(command)
        })
        .unwrap();
    roundtrip(&h.frame().project);
    changed
}
fn track(p: &SceneProject, bone: usize, channel: BoneChannel) -> &BoneTimeline {
    p.animations[0]
        .tracks
        .iter()
        .find(|t| t.bone == bone && t.channel == channel)
        .unwrap()
}
fn key_id(f: &SceneFrame, bone: usize, channel: BoneChannel, key: usize) -> u64 {
    let t = f.project.animations[0]
        .tracks
        .iter()
        .position(|t| t.bone == bone && t.channel == channel)
        .unwrap();
    f.animation_key_ids[0][t][key]
}
fn identities(f: &SceneFrame, a: usize) -> BTreeMap<u64, (u64, u32, Vec<u32>)> {
    f.project.animations[a]
        .tracks
        .iter()
        .enumerate()
        .flat_map(|(t, track)| {
            track.keys.iter().enumerate().map(move |(k, key)| {
                let mut payload = vec![key.frame.to_bits()];
                payload.extend(key.values.map(f32::to_bits));
                match key.curve {
                    KeyCurve::Linear => payload.push(0),
                    KeyCurve::Stepped => payload.push(1),
                    KeyCurve::Bezier { controls } => {
                        payload.push(2);
                        payload.extend(controls.into_iter().flatten().map(f32::to_bits));
                    }
                }
                (
                    f.animation_key_ids[a][t][k],
                    (f.bone_ids[track.bone], track.channel.wire(), payload),
                )
            })
        })
        .collect()
}
fn modes(f: &SceneFrame) -> Vec<(u64, u32)> {
    f.project.animations[0]
        .split_modes
        .iter()
        .map(|row| (f.bone_ids[row.bone], row.mode.wire()))
        .collect()
}
#[test]
fn scalar_sampler_uses_independent_axes_times_and_setup_without_baking() {
    let p = fixture();
    roundtrip(&p);
    let before = encode_scene_payload(&p).unwrap();
    for frame in [0., 4., 12., 18., 24.] {
        let poses = sample(&p, &p.animations[0], frame / f64::from(p.fps)).unwrap();
        let red = &p.rig.bones[1];
        let green = &p.rig.bones[2];
        if frame == 0. {
            assert_eq!(poses[1].x, f64::from(red.x));
            assert_eq!(poses[1].y, f64::from(red.y));
            assert_eq!(poses[2].scale_x, f64::from(green.scale_x));
            assert_eq!(poses[2].scale_y, f64::from(green.scale_y));
        }
        if frame == 4. {
            assert_eq!(poses[1].y, f64::from(red.y) - 3.);
            assert_eq!(poses[2].scale_x, f64::from(green.scale_x) * 0.75);
            assert_eq!(poses[2].scale_y, f64::from(green.scale_y));
        }
        if frame == 12. {
            assert_eq!(poses[1].x, f64::from(red.x) + 6.);
            assert_eq!(poses[1].y, f64::from(red.y) - 3.);
        }
        if frame == 18. {
            assert_eq!(poses[2].scale_x, f64::from(green.scale_x) * 1.5);
            assert_eq!(poses[2].scale_y, f64::from(green.scale_y) * 0.75);
        }
        if frame == 24. {
            assert_eq!(poses[1].x, f64::from(red.x) - 4.);
            assert_eq!(poses[1].y, f64::from(red.y) + 7.);
        }
    }
    assert_eq!(encode_scene_payload(&p).unwrap(), before);
}
#[test]
fn scalar_same_frame_json_overwrite_preserves_frame_value_control_zero_bits_and_history() {
    let original = fixture();
    let mut h = SceneHistory::new(original.clone(), true).unwrap();
    let clip = h.frame().animation_ids[0];
    let bone = h.frame().bone_ids[1];
    let id = key_id(h.frame(), 1, BoneChannel::TranslateX, 0);
    let command = |id: Option<u64>, value: f32| json!({"type":"setAnimationKeys","animation":clip,"keys":[{"bone":bone,"channel":"translateX","keyId":id,"frame":0,"values":[value,0],"curve":"bezier","controls":[[4,0,8,6],[0,0,0,0]]}]});
    assert!(!op(&mut h, command(Some(id), 0.)));
    assert!(!op(&mut h, command(None, 0.)));
    assert!(!h.can_undo());
    assert!(op(&mut h, command(Some(id), 0.25)));
    let after = h.frame().project.clone();
    let key = &track(&after, 1, BoneChannel::TranslateX).keys[0];
    assert_eq!(key.frame.to_bits(), 0x80000000);
    let KeyCurve::Bezier { controls } = key.curve else {
        panic!("retainedcurve")
    };
    assert_eq!(controls[0][1].to_bits(), 0x80000000);
    assert_eq!(controls[1].map(f32::to_bits), [0; 4]);
    assert_eq!(
        track(&after, 1, BoneChannel::TranslateY),
        track(&original, 1, BoneChannel::TranslateY)
    );
    assert_eq!(key_id(h.frame(), 1, BoneChannel::TranslateX, 0), id);
    h.apply(SceneEdit::Undo).unwrap();
    assert_eq!(h.frame().project, original);
    h.apply(SceneEdit::Redo).unwrap();
    assert_eq!(h.frame().project, after);
    roundtrip(&after);
}
#[test]
fn scalar_representation_padding_nonfinite_and_last_axis_delete_reject_atomically() {
    let mut h = SceneHistory::new(fixture(), true).unwrap();
    let clip = h.frame().animation_ids[0];
    let red = h.frame().bone_ids[1];
    let green = h.frame().bone_ids[2];
    let initial = h.frame().project.clone();
    let ids = identities(h.frame(), 0);
    let mode = modes(h.frame());
    for key in [
        json!({"bone":red,"channel":"translate","frame":30,"values":[1,2],"curve":"linear"}),
        json!({"bone":red,"channel":"scaleX","frame":30,"values":[1,0],"curve":"linear"}),
        json!({"bone":green,"channel":"translateY","frame":30,"values":[1,0],"curve":"linear"}),
        json!({"bone":red,"channel":"translateX","frame":30,"values":[1,2],"curve":"linear"}),
        json!({"bone":red,"channel":"translateX","frame":30,"values":[1,-0.0],"curve":"linear"}),
        json!({"bone":red,"channel":"translateX","frame":0,"values":[0,0],"curve":"bezier","controls":[[4,0,8,6],[0,1,0,0]]}),
        json!({"bone":red,"channel":"translateX","frame":0,"values":[0,0],"curve":"bezier","controls":[[12,0,-5,6],[0,0,0,0]]}),
    ] {
        let command = serde_json::from_value(
            json!({"type":"setAnimationKeys","animation":clip,"keys":[key]}),
        )
        .unwrap();
        assert!(h.apply(SceneEdit::Animation(command)).is_err());
        assert_eq!(h.frame().project, initial);
        assert_eq!(identities(h.frame(), 0), ids);
        assert_eq!(modes(h.frame()), mode);
        assert!(!h.can_undo());
    }
    for value in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY] {
        assert!(h
            .apply(SceneEdit::Animation(RigEdit::SetAnimationKey {
                animation: clip,
                key: KeyInput {
                    bone: red,
                    channel: ChannelInput::TranslateX,
                    frame: 30.,
                    values: [value, 0.],
                    curve: CurveInput::Linear,
                    controls: None,
                    key_id: None
                }
            }))
            .is_err());
        assert_eq!(h.frame().project, initial);
    }
    for keys in [
        (0..3)
            .map(|k| key_id(h.frame(), 1, BoneChannel::TranslateX, k))
            .collect::<Vec<_>>(),
        (0..2)
            .map(|k| key_id(h.frame(), 2, BoneChannel::ScaleY, k))
            .collect::<Vec<_>>(),
    ] {
        assert!(h
            .apply(SceneEdit::Animation(RigEdit::DeleteAnimationKeys {
                animation: clip,
                keys
            }))
            .is_err());
        assert_eq!(h.frame().project, initial);
        assert_eq!(identities(h.frame(), 0), ids);
        assert_eq!(modes(h.frame()), mode);
    }
    let second = key_id(h.frame(), 1, BoneChannel::TranslateY, 1);
    op(
        &mut h,
        json!({"type":"deleteAnimationKeys","animation":clip,"keys":[second]}),
    );
    assert_eq!(
        track(&h.frame().project, 1, BoneChannel::TranslateY)
            .keys
            .len(),
        1
    );
    assert_eq!(modes(h.frame()), mode);
    h.apply(SceneEdit::Undo).unwrap();
    assert_eq!(h.frame().project, initial);
}
#[test]
fn scalar_move_retimes_only_active_controls_and_duplicate_remap_preserves_semantic_ids() {
    let mut h = SceneHistory::new(fixture(), true).unwrap();
    let clip = h.frame().animation_ids[0];
    let red = h.frame().bone_ids[1];
    let green = h.frame().bone_ids[2];
    let ids = identities(h.frame(), 0);
    let mode = modes(h.frame());
    let left = key_id(h.frame(), 1, BoneChannel::TranslateX, 0);
    let right = key_id(h.frame(), 1, BoneChannel::TranslateX, 1);
    op(
        &mut h,
        json!({"type":"moveAnimationKeys","animation":clip,"keys":[left,right],"deltaFrames":3}),
    );
    let key = &track(&h.frame().project, 1, BoneChannel::TranslateX).keys[0];
    assert_eq!(key.frame, 3.);
    let KeyCurve::Bezier { controls } = key.curve else {
        panic!("retainedcurve")
    };
    assert_eq!(controls[0][0], 7.);
    assert_eq!(controls[0][2], 11.);
    assert_eq!(controls[1].map(f32::to_bits), [0; 4]);
    assert_eq!(modes(h.frame()), mode);
    h.apply(SceneEdit::Undo).unwrap();
    assert_eq!(identities(h.frame(), 0), ids);
    op(&mut h, json!({"type":"reparent","id":red,"parent":green}));
    assert_eq!(identities(h.frame(), 0), ids);
    assert_eq!(modes(h.frame()), mode);
    roundtrip(&h.frame().project);
    op(
        &mut h,
        json!({"type":"duplicateAnimation","id":clip,"name":"Own split duplicate"}),
    );
    assert_eq!(
        h.frame().project.animations[2].split_modes,
        h.frame().project.animations[0].split_modes
    );
    assert_eq!(
        h.frame().project.animations[2].tracks,
        h.frame().project.animations[0].tracks
    );
    let copied = identities(h.frame(), 2);
    assert!(copied.keys().all(|id| !ids.contains_key(id)));
    assert_eq!(
        copied.values().collect::<Vec<_>>(),
        identities(h.frame(), 0).values().collect::<Vec<_>>()
    );
}
#[test]
fn scalar_mixed_batch_and_zero_other_scale_axis_preserve_sibling_values_and_ordinary_clip() {
    let mut p = fixture();
    p.rig.bones[2].scale_y = 0.;
    let mut h = SceneHistory::new(p.clone(), true).unwrap();
    let clip = h.frame().animation_ids[0];
    let ordinary = h.frame().animation_ids[1];
    let red = h.frame().bone_ids[1];
    let green = h.frame().bone_ids[2];
    let slot = h.frame().slot_ids[0];
    let old_y = track(&p, 2, BoneChannel::ScaleY).clone();
    op(
        &mut h,
        json!({"type":"setAnimationKeyBatch","animation":clip,"boneKeys":[{"bone":green,"channel":"scaleX","frame":30,"values":[1.25,0],"curve":"linear"},{"bone":red,"channel":"rotate","frame":30,"values":[25,0],"curve":"linear"}],"slotKeys":[{"slot":slot,"channel":"rgba","frame":30,"values":[0.5,0.75,1,0.5],"curve":"linear"}]}),
    );
    assert_eq!(track(&h.frame().project, 2, BoneChannel::ScaleY), &old_y);
    let after = h.frame().project.clone();
    h.apply(SceneEdit::Undo).unwrap();
    assert_eq!(h.frame().project, p);
    h.apply(SceneEdit::Redo).unwrap();
    assert_eq!(h.frame().project, after);
    let before = h.frame().project.clone();
    let invalid=serde_json::from_value(json!({"type":"setAnimationKeys","animation":ordinary,"keys":[{"bone":red,"channel":"translateX","frame":30,"values":[1,0],"curve":"linear"}]})).unwrap();
    assert!(h.apply(SceneEdit::Animation(invalid)).is_err());
    assert_eq!(h.frame().project, before);
    assert!(views(h.frame())[1].split_modes.is_empty());
    assert!(serde_json::to_value(&views(h.frame())[1])
        .unwrap()
        .get("splitModes")
        .is_none());
}
#[test]
fn scalar_actual_session_summary_native_sample_save_reopen_keeps_ordered_modes_and_all_source_bits()
{
    let directory = tempfile::tempdir().unwrap();
    std::fs::create_dir(directory.path().join("images")).unwrap();
    let original = fixture();
    let bytes = encode_scene(&original).unwrap();
    let source = directory.path().join("own-split.spine");
    std::fs::write(&source, &bytes).unwrap();
    for key in crate::animation_sequence::all_image_keys(&original).unwrap() {
        std::fs::write(
            directory.path().join("images").join(format!("{key}.png")),
            crate::images::tests::png([30, 90, 210, 255]),
        )
        .unwrap();
    }
    let session = Session::default();
    let initial = session
        .replace(open_document(source.clone()).unwrap(), false)
        .unwrap();
    assert!(!initial.inspection_only);
    let clip = &initial.animations[0];
    assert_eq!(
        clip.split_modes
            .iter()
            .map(|m| (m.bone, m.mode))
            .collect::<Vec<_>>(),
        vec![(initial.bones[2].id, 2), (initial.bones[1].id, 1)]
    );
    assert_eq!(initial.animation_channels.len(), 8);
    let x = clip
        .tracks
        .iter()
        .find(|t| t.channel == "translateX")
        .unwrap();
    let id = x.keys[0].id;
    let command=serde_json::from_value(json!({"type":"setAnimationKey","animation":clip.id,"bone":initial.bones[1].id,"channel":"translateX","keyId":id,"frame":0,"values":[0.25,0],"curve":"bezier","controls":[[4,0,8,6],[0,0,0,0]]})).unwrap();
    let edited = session.edit(initial.revision, command).unwrap();
    assert_eq!(
        edited.animations[0]
            .split_modes
            .iter()
            .map(|m| (m.bone, m.mode))
            .collect::<Vec<_>>(),
        clip.split_modes
            .iter()
            .map(|m| (m.bone, m.mode))
            .collect::<Vec<_>>()
    );
    let snapshot = session
        .evaluate(
            edited.revision,
            crate::evaluation::EvaluationRequest {
                animation_pose: None,
                constraint_pose: None,
                draw_order_pose: None,
                deform_targets: vec![],
                deform_pose: None,
                animation_id: Some(clip.id),
                mode: crate::evaluation::EvaluationMode::None,
                time: 12. / 24.,
                motion: None,
                from_pose_epoch: None,
            },
        )
        .unwrap();
    assert_eq!(
        snapshot.bones[1].authored.x,
        f64::from(original.rig.bones[1].x) + 6.
    );
    assert_eq!(
        snapshot.bones[1].authored.y,
        f64::from(original.rig.bones[1].y) - 3.
    );
    let target = directory.path().join("portable/own-split.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), target.clone())
        .unwrap();
    let payload = ProjectEnvelope::inspect(std::fs::read(&target).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    let saved = decode_scene(&payload).unwrap();
    let mut expected = original.clone();
    expected.animations[0]
        .tracks
        .iter_mut()
        .find(|t| t.bone == 1 && t.channel == BoneChannel::TranslateX)
        .unwrap()
        .keys[0]
        .values[0] = 0.25;
    expected.images_root = "./images/".into();
    normalize_wire_strings(&mut expected).unwrap();
    assert_eq!(encode_scene_payload(&expected).unwrap(), payload);
    assert_eq!(
        saved.animations[0].split_modes,
        original.animations[0].split_modes
    );
    assert_eq!(std::fs::read(source).unwrap(), bytes);
    let reopened = Session::default()
        .replace(open_document(target).unwrap(), false)
        .unwrap();
    assert_eq!(
        serde_json::to_value(&reopened.animations).unwrap(),
        serde_json::to_value(&edited.animations).unwrap()
    );
}

#[path = "animation_partial_translate_tests.rs"]
mod partial_translate_tests;
