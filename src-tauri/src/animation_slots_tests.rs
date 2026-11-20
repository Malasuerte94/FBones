use super::*;
use crate::{
    evaluation::{EvaluationMode, EvaluationRequest},
    project::{new_document, open_document, ProjectSummary, Session},
    rig::RigEdit,
};
use serde_json::{json, Value};
fn summary(s: &Session) -> ProjectSummary {
    s.summary().unwrap().unwrap()
}
fn edit(s: &Session, value: Value) -> ProjectSummary {
    s.edit(summary(s).revision, serde_json::from_value(value).unwrap())
        .unwrap()
}
fn state(s: &Session) -> Value {
    serde_json::to_value(summary(s)).unwrap()
}
fn setup() -> (tempfile::TempDir, Session) {
    let d = tempfile::tempdir().unwrap();
    let folder = d.path().join("input");
    std::fs::create_dir(&folder).unwrap();
    for name in ["A", "B", "C"] {
        let mut bytes = vec![];
        {
            let mut encoder = png::Encoder::new(&mut bytes, 2, 2);
            encoder.set_color(png::ColorType::Rgba);
            encoder
                .write_header()
                .unwrap()
                .write_image_data(&[255; 16])
                .unwrap();
        }
        std::fs::write(folder.join(format!("{name}.png")), bytes).unwrap();
    }
    let s = Session::default();
    let p = s
        .replace(new_document("slot animation".into()).unwrap(), false)
        .unwrap();
    let p = s.select_images_folder(p.revision, &folder).unwrap();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 10., 20.)
        .unwrap();
    let slot = p.slots[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    let a = p.slots[0].attachments[0].id;
    edit(
        &s,
        json!({"type":"setActiveAttachment","slot":slot,"attachment":a}),
    );
    let p = s
        .place_images(summary(&s).revision, &["C".into()], 0, 40., 50.)
        .unwrap();
    let second = p.slots[1].id;
    edit(
        &s,
        json!({"type":"setActiveAttachment","slot":second,"attachment":null}),
    );
    edit(
        &s,
        json!({"type":"setSlotColor","id":slot,"color":0x804020ffu32}),
    );
    (d, s)
}
fn attachment(slot: u64, frame: f32, value: Option<u64>) -> Value {
    json!({"channel":"attachment","slot":slot,"frame":frame,"attachment":value})
}
fn rgba(slot: u64, frame: f32, values: [f32; 4], curve: &str) -> Value {
    json!({"channel":"rgba","slot":slot,"frame":frame,"values":values,"curve":curve})
}
fn keys(s: &Session, clip: u64, keys: Vec<Value>) -> ProjectSummary {
    edit(
        s,
        json!({"type":"setAnimationSlotKeys","animation":clip,"keys":keys}),
    )
}
fn sample(s: &Session, clip: u64, frame: f64) -> crate::evaluation::EvaluationSnapshot {
    s.evaluate(
        summary(s).revision,
        EvaluationRequest {
            animation_id: Some(clip),
            animation_pose: None,
            constraint_pose: None,
            draw_order_pose: None,
            deform_targets: vec![],
            deform_pose: None,
            mode: EvaluationMode::None,
            time: frame / summary(s).animation_fps,
            motion: None,
            from_pose_epoch: None,
        },
    )
    .unwrap()
}

#[test]
fn imported_split_color_samples_independently_and_survives_other_edits() {
    use crate::scene_edit::{SceneEdit, SceneHistory};
    use fbones_format::minimal::scene::{
        decode_scene, encode_scene_payload, SlotSplitConfig, SlotSplitMode,
    };

    let mut project = crate::scene_wire_fixture::project();
    project.wire = None;
    let mesh = project.slots[1].attachments[0].mesh_mut().unwrap();
    mesh.image.width = 32.;
    mesh.image.height = 24.;
    let clip = &mut project.animations[0];
    clip.slot_tracks.clear();
    clip.split_modes.push(SplitModeConfig::Slot(SlotSplitConfig {
        slot: 1,
        mode: SlotSplitMode::RgbAlpha,
    }));
    clip.slot_tracks.extend([
        SlotTimeline::Rgb2 {
            slot: 1,
            keys: vec![
                SlotColorKey {
                    frame: 2.,
                    values: [0., 1., 0., 0., 0., 0.],
                    curve: SlotColorCurve::Linear,
                },
                SlotColorKey {
                    frame: 10.,
                    values: [1., 0., 0., 0., 0., 0.],
                    curve: SlotColorCurve::Linear,
                },
            ],
        },
        SlotTimeline::Alpha {
            slot: 1,
            keys: vec![
                SlotColorKey {
                    frame: 4.,
                    values: [1.],
                    curve: SlotColorCurve::Linear,
                },
                SlotColorKey {
                    frame: 8.,
                    values: [0.],
                    curve: SlotColorCurve::Linear,
                },
            ],
        },
    ]);
    let payload = encode_scene_payload(&project).unwrap();
    let mut history = SceneHistory::new(decode_scene(&payload).unwrap(), true).unwrap();
    let frame = history.frame();
    let clip_id = frame.animation_ids[0];
    let slot_id = frame.slot_ids[1];
    let rgb = frame.project.animations[0]
        .slot_tracks
        .iter()
        .position(|track| matches!(track, SlotTimeline::Rgb2 { .. }))
        .unwrap();
    let key_id = frame.animation_slot_key_ids[0][rgb][0];
    let sampled = sample_at_frame(frame, Some(&frame.project.animations[0]), 6.).unwrap();
    assert_eq!(sampled[1].color, [0.5, 0.5, 0., 0.5]);

    for edit in [
        json!({"type":"setAnimationSlotKeys","animation":clip_id,"keys":[rgba(slot_id,6.,[1.;4],"linear")]}),
        json!({"type":"deleteAnimationKeys","animation":clip_id,"keys":[key_id]}),
        json!({"type":"moveAnimationKeys","animation":clip_id,"keys":[key_id],"deltaFrames":2}),
    ] {
        let error = history
            .apply(SceneEdit::Animation(serde_json::from_value(edit).unwrap()))
            .unwrap_err();
        assert_eq!(error.code, "InvalidAnimation");
        assert_eq!(
            encode_scene_payload(&history.frame().project).unwrap(),
            payload
        );
    }

    history
        .apply(SceneEdit::ReorderSlot { id: slot_id, index: 0 })
        .unwrap();
    history
        .apply(SceneEdit::Animation(
            serde_json::from_value(json!({
                "type":"setAnimationSlotKeys",
                "animation":clip_id,
                "keys":[attachment(slot_id,6.,None)]
            }))
            .unwrap(),
        ))
        .unwrap();
    let frame = history.frame();
    let clip = &frame.project.animations[0];
    assert_eq!(clip.slot_split_mode(0), Some(SlotSplitMode::RgbAlpha));
    let view = crate::animation::view(frame, 0);
    assert_eq!(view.slot_split_modes[0].slot, slot_id);
    assert!(view.slot_tracks.iter().any(|track| matches!(
        track, SlotTrackView::Rgb2 { slot, keys } if *slot == slot_id && keys[0].id == key_id
    )));
    let sampled = sample_at_frame(frame, Some(clip), 6.).unwrap();
    assert_eq!(sampled[0].color, [0.5, 0.5, 0., 0.5]);
    assert_eq!(sampled[0].attachment, None);
    let saved = encode_scene_payload(&frame.project).unwrap();
    assert_eq!(
        encode_scene_payload(&decode_scene(&saved).unwrap()).unwrap(),
        saved
    );
}

#[test]
fn mixed_bone_attachment_rgba_batch_is_one_history_action_and_portable_nonbaked_save() {
    let (d, s) = setup();
    let p = summary(&s);
    let slot = p.slots[0].id;
    let a = p.slots[0].attachments[0].id;
    let b = p.slots[0].attachments[1].id;
    let setup = serde_json::to_value((&p.bones, &p.slots)).unwrap();
    let clip = p.animations[0].id;
    let root = p.bones[0].id;
    let changed = edit(
        &s,
        json!({"type":"setAnimationKeyBatch","animation":clip,"boneKeys":[{"bone":root,"channel":"translate","frame":0,"values":[0,0],"curve":"linear"},{"bone":root,"channel":"translate","frame":24,"values":[24,12],"curve":"linear"}],"slotKeys":[attachment(slot,6.,Some(b)),attachment(slot,12.,None),attachment(slot,24.,Some(a)),rgba(slot,6.,[1.,0.5,0.25,0.],"linear"),rgba(slot,24.,[0.25,0.75,1.,1.],"stepped")]}),
    );
    assert_eq!(changed.revision, p.revision + 1);
    assert_eq!(changed.animations[0].duration, 24.);
    assert_eq!(
        serde_json::to_value((&changed.bones, &changed.slots)).unwrap(),
        setup
    );
    assert_eq!(sample(&s, clip, 0.).slot_pose[0].attachment, Some(a));
    assert_eq!(
        sample(&s, clip, 0.).slot_pose[0].color,
        [128. / 255., 64. / 255., 32. / 255., 1.]
    );
    let six = sample(&s, clip, 6.);
    assert_eq!(six.slot_pose[0].attachment, Some(b));
    assert_eq!(
        six.slot_pose[0].color[3], 0.,
        "Alpha zero must not deactivate the attachment"
    );
    assert_eq!(sample(&s, clip, 12.).slot_pose[0].attachment, None);
    assert_eq!(sample(&s, clip, 100.).slot_pose[0].attachment, Some(a));
    assert_eq!(sample(&s, clip, 100.).slot_pose[1].attachment, None);
    let before_sample = state(&s);
    sample(&s, clip, 17.);
    assert_eq!(state(&s), before_sample);
    let undone = edit(&s, json!({"type":"undo"}));
    assert!(undone.animations[0].tracks.is_empty());
    assert!(undone.animations[0].slot_tracks.is_empty());
    let redone = edit(&s, json!({"type":"redo"}));
    assert_eq!(
        serde_json::to_value(&redone.animations).unwrap(),
        serde_json::to_value(&changed.animations).unwrap()
    );
    let path = d.path().join("bundle/slots.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let envelope = fbones_format::ProjectEnvelope::inspect(std::fs::read(&path).unwrap()).unwrap();
    let decoded =
        fbones_format::minimal::scene::decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
    assert_eq!(decoded.slots[0].active_attachment, Some(0));
    assert_eq!(decoded.slots[0].color, [128, 64, 32, 255]);
    assert_eq!(decoded.rig.bones[0].x, 0.);
    assert_eq!(decoded.animations[0].slot_tracks.len(), 2);
    s.close(false).unwrap();
    let p = s.replace(open_document(path).unwrap(), false).unwrap();
    assert_eq!(p.animations[0].slot_tracks.len(), 2);
    assert_eq!(
        sample(&s, p.animations[0].id, 12.).slot_pose[0].attachment,
        None
    );
    assert_eq!(
        p.slots[0].active_attachment_id,
        Some(p.slots[0].attachments[0].id)
    );
}
#[test]
fn slot_batches_reject_cross_owner_missing_null_invalid_color_and_stale_context_atomically() {
    let (_d, s) = setup();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let slot = p.slots[0].id;
    let a = p.slots[0].attachments[0].id;
    let foreign = p.slots[1].attachments[0].id;
    assert!(serde_json::from_value::<RigEdit>(json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[{"channel":"attachment","slot":slot,"frame":0}]})).is_err());
    for batch in [
        vec![attachment(slot, 0., Some(foreign))],
        vec![rgba(slot, 0., [1.1, 0., 0., 1.], "linear")],
        vec![attachment(slot, 0., Some(a)), attachment(slot, 0., None)],
        vec![rgba(slot, 0., [0., 0., 0., 1.], "bezier")],
    ] {
        let before = state(&s);
        let op = serde_json::from_value(
            json!({"type":"setAnimationSlotKeys","animation":clip,"keys":batch}),
        )
        .unwrap();
        assert!(s.edit(summary(&s).revision, op).is_err());
        assert_eq!(state(&s), before);
    }
    let frozen = sample(&s, clip, 6.);
    let before = state(&s);
    let op = serde_json::from_value(
        json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[attachment(slot,12.,None)]}),
    )
    .unwrap();
    assert_eq!(
        s.edit_in_pose(p.revision, frozen.pose_epoch, op)
            .unwrap_err()
            .code,
        "StalePose"
    );
    assert_eq!(state(&s), before);
    let op=serde_json::from_value(json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[attachment(slot,6.,Some(a))]})).unwrap();
    let changed = s.edit_in_pose(p.revision, frozen.pose_epoch, op).unwrap();
    assert_eq!(changed.revision, p.revision + 1);
    let before = state(&s);
    let op=serde_json::from_value(json!({"type":"setAnimationKeyBatch","animation":clip,"boneKeys":[{"bone":p.bones[0].id,"channel":"translate","frame":0,"values":[9,8],"curve":"linear"}],"slotKeys":[attachment(slot,0.,Some(foreign))]})).unwrap();
    assert!(s.edit(changed.revision, op).is_err());
    assert_eq!(
        state(&s),
        before,
        "Valid bone keys must roll back with an invalid slot key"
    );
}
#[test]
fn mixed_keys_move_delete_duplicate_and_structural_references_keep_stable_ids() {
    let (_d, s) = setup();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let slot = p.slots[0].id;
    let a = p.slots[0].attachments[0].id;
    let b = p.slots[0].attachments[1].id;
    let p = keys(
        &s,
        clip,
        vec![
            attachment(slot, 0., Some(b)),
            attachment(slot, 24., Some(a)),
            rgba(slot, 0., [0., 0.25, 0.5, 1.], "linear"),
            rgba(slot, 24., [1., 0.5, 0.25, 0.], "linear"),
        ],
    );
    let tracks = serde_json::to_value(&p.animations[0].slot_tracks).unwrap();
    let selected = p.animations[0]
        .slot_tracks
        .iter()
        .flat_map(|t| match t {
            SlotTrackView::Attachment { keys, .. } => keys.iter().map(|k| k.id).collect::<Vec<_>>(),
            SlotTrackView::Rgba { keys, .. } => keys.iter().map(|k| k.id).collect(),
            SlotTrackView::Rgb2 { keys, .. } => keys.iter().map(|k| k.id).collect(),
            SlotTrackView::Alpha { keys, .. } => keys.iter().map(|k| k.id).collect(),
        })
        .collect::<Vec<_>>();
    let duplicate = edit(
        &s,
        json!({"type":"duplicateAnimation","id":clip,"name":"copy"}),
    );
    let copied = duplicate.animations[1]
        .slot_tracks
        .iter()
        .flat_map(|t| match t {
            SlotTrackView::Attachment { keys, .. } => keys.iter().map(|k| k.id).collect::<Vec<_>>(),
            SlotTrackView::Rgba { keys, .. } => keys.iter().map(|k| k.id).collect(),
            SlotTrackView::Rgb2 { keys, .. } => keys.iter().map(|k| k.id).collect(),
            SlotTrackView::Alpha { keys, .. } => keys.iter().map(|k| k.id).collect(),
        })
        .collect::<Vec<_>>();
    assert!(selected.iter().all(|id| !copied.contains(id)));
    edit(
        &s,
        json!({"type":"moveAnimationKeys","animation":clip,"keys":selected,"deltaFrames":3}),
    );
    assert_eq!(sample(&s, clip, 2.).slot_pose[0].attachment, Some(a));
    assert_eq!(sample(&s, clip, 3.).slot_pose[0].attachment, Some(b));
    edit(&s, json!({"type":"undo"}));
    assert_eq!(
        serde_json::to_value(summary(&s).animations[0].slot_tracks.clone()).unwrap(),
        tracks
    );
    let p = edit(&s, json!({"type":"reorderSlot","id":slot,"index":1}));
    assert_eq!(p.slots[1].id, slot);
    let pose = sample(&s, clip, 0.);
    assert_eq!(pose.slot_pose[1].attachment, Some(b));
    let before = state(&s);
    for op in [
        json!({"type":"deleteSlot","id":slot}),
        json!({"type":"deleteAttachment","id":b}),
        json!({"type":"moveAttachment","id":b,"slot":p.slots[0].id}),
    ] {
        assert!(s
            .edit(summary(&s).revision, serde_json::from_value(op).unwrap())
            .is_err());
        assert_eq!(state(&s), before);
    }
    let p = edit(
        &s,
        json!({"type":"renameAttachment","id":b,"name":"B renamed"}),
    );
    assert_eq!(sample(&s, clip, 0.).slot_pose[1].attachment, Some(b));
    assert_eq!(p.slots[1].attachments[1].name, "B renamed");
    edit(
        &s,
        json!({"type":"deleteAnimationKeys","animation":clip,"keys":selected}),
    );
    assert!(summary(&s).animations[0].slot_tracks.is_empty());
    assert!(!summary(&s).animations[1].slot_tracks.is_empty());
}
#[test]
fn rgba_bezier_preserves_four_precise_axes_moves_handles_and_rejects_neighbor_loss() {
    let (_d, s) = setup();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let slot = p.slots[0].id;
    let from = [0.1f32, 0.2, 0.3, 0.4];
    let to = [0.9f32, 0.8, 0.7, 0.6];
    let controls: [[_; 4]; 4] = std::array::from_fn(|i| {
        [
            8.,
            from[i] + (to[i] - from[i]) / 3.,
            16.,
            from[i] + 2. * (to[i] - from[i]) / 3.,
        ]
    });
    let p = keys(
        &s,
        clip,
        vec![
            json!({"channel":"rgba","slot":slot,"frame":0,"values":from,"curve":"bezier","controls":controls}),
            rgba(slot, 24., to, "linear"),
        ],
    );
    let SlotTrackView::Rgba { keys: stored, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("RGBA")
    };
    let ids = stored.iter().map(|k| k.id).collect::<Vec<_>>();
    let mid = sample(&s, clip, 12.).slot_pose[0].color;
    for i in 0..4 {
        let expected = (f64::from(from[i])
            + 3. * f64::from(controls[i][1])
            + 3. * f64::from(controls[i][3])
            + f64::from(to[i]))
            / 8.;
        assert!((mid[i] - expected).abs() < 1e-12);
    }
    let before = state(&s);
    let op = serde_json::from_value(
        json!({"type":"deleteAnimationKeys","animation":clip,"keys":[ids[1]]}),
    )
    .unwrap();
    assert!(s.edit(p.revision, op).is_err());
    assert_eq!(state(&s), before);
    let moved = edit(
        &s,
        json!({"type":"moveAnimationKeys","animation":clip,"keys":ids,"deltaFrames":6}),
    );
    let SlotTrackView::Rgba { keys: stored, .. } = &moved.animations[0].slot_tracks[0] else {
        panic!("RGBA")
    };
    let shifted = stored[0].controls.unwrap();
    for axis in shifted {
        assert_eq!(axis[0], 14.);
        assert_eq!(axis[2], 22.);
    }
    assert_eq!(sample(&s, clip, 18.).slot_pose[0].color, mid);
    let p = keys(&s, clip, vec![rgba(slot, 40., [0., 0., 0., 1.], "linear")]);
    let SlotTrackView::Rgba { keys: stored, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("RGBA")
    };
    assert_eq!(stored[0].id, ids[0]);
}

#[test]
fn rgba_subdivision_transports_authoritative_zero_signs_through_history_and_reopen() {
    fn rows(p: &ProjectSummary) -> &[RgbaKeyView] {
        let SlotTrackView::Rgba { keys, .. } = &p.animations[0].slot_tracks[0] else {
            panic!("RGBA fixture")
        };
        keys
    }

    let (d, s) = setup();
    let p = summary(&s);
    let slot = p.slots[0].id;
    let clip = p.animations[0].id;
    let before = keys(
        &s,
        clip,
        vec![
            json!({"channel":"rgba","slot":slot,"frame":0,"values":[0.125,-0.0,0.25,1],"curve":"bezier",
            "controls":[[8,0.25,16,0.5],[8,-0.0,16,-0.0],[8,0.375,16,0.625],[8,0.875,16,0.625]]}),
            rgba(slot, 24., [0.625, -0.0, 0.75, 0.5], "linear"),
        ],
    );
    let old = rows(&before);
    let negative = (-0.0_f32).to_bits();
    let bits = |axes: [[f32; 4]; 4]| axes.map(|axis| axis.map(f32::to_bits));
    assert_eq!(old[0].values[1].to_bits(), negative);
    assert_eq!(old[0].controls.unwrap()[1][3].to_bits(), negative);
    let left = [
        [4., 0.1875, 8., 0.40625],
        [4., 0., 8., 0.],
        [4., 0.3125, 8., 0.40625],
        [4., 0.9375, 8., 0.84375],
    ];
    let right = [
        [16., 0.59375, 20., 0.5625],
        [16., 0., 20., 0.],
        [16., 0.59375, 20., 0.6875],
        [16., 0.65625, 20., 0.5625],
    ];
    let changed = keys(
        &s,
        clip,
        vec![
            json!({"channel":"rgba","slot":slot,"frame":0,"keyId":old[0].id,"values":[0.125,0,0.25,1],"curve":"bezier",
            "controls":left,"negativeZeroIndices":[1,9]}),
            json!({"channel":"rgba","slot":slot,"frame":12,"values":[0.5,0,0.5,0.75],"curve":"bezier",
            "controls":right,"negativeZeroIndices":[1,9,11]}),
        ],
    );
    assert_eq!(changed.revision, before.revision + 1);
    assert_eq!(
        serde_json::to_value((&changed.bones, &changed.slots)).unwrap(),
        serde_json::to_value((&before.bones, &before.slots)).unwrap()
    );
    let stored = rows(&changed);
    assert_eq!(
        stored.iter().map(|row| row.frame).collect::<Vec<_>>(),
        [0., 12., 24.]
    );
    assert_eq!(stored[0].id, old[0].id);
    assert_eq!(
        serde_json::to_value(&stored[2]).unwrap(),
        serde_json::to_value(&old[1]).unwrap()
    );
    let mut signed_left = left;
    signed_left[1][1] = -0.0;
    let mut signed_right = right;
    signed_right[1][1] = -0.0;
    signed_right[1][3] = -0.0;
    assert_eq!(bits(stored[0].controls.unwrap()), bits(signed_left));
    assert_eq!(bits(stored[1].controls.unwrap()), bits(signed_right));
    assert_eq!(stored[0].values[1].to_bits(), negative);
    assert_eq!(
        stored[1].values.map(f32::to_bits),
        [0.5, -0.0, 0.5, 0.75].map(f32::to_bits)
    );
    let committed = serde_json::to_value(&changed.animations).unwrap();
    let undone = s.edit(changed.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        serde_json::to_value(&undone.animations).unwrap(),
        serde_json::to_value(&before.animations).unwrap()
    );
    let redone = s.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(serde_json::to_value(&redone.animations).unwrap(), committed);

    let addressed = json!({"channel":"rgba","slot":slot,"frame":12,"keyId":stored[1].id,"values":[0.5,0,0.5,0.75],"curve":"bezier","controls":right});
    let mut null = addressed.clone();
    null["negativeZeroIndices"] = Value::Null;
    for legacy in [addressed.clone(), null] {
        let unchanged = keys(&s, clip, vec![legacy]);
        assert_eq!(unchanged.revision, redone.revision);
        assert_eq!(
            serde_json::to_value(&unchanged.animations).unwrap(),
            committed
        );
    }
    let mut explicit = addressed;
    explicit["values"][1] = json!(-0.0);
    explicit["controls"] = json!(signed_right);
    explicit["negativeZeroIndices"] = json!([]);
    let cleared = keys(&s, clip, vec![explicit]);
    assert_eq!(cleared.revision, redone.revision + 1);
    assert_eq!(rows(&cleared)[1].values[1].to_bits(), 0);
    assert_eq!(bits(rows(&cleared)[1].controls.unwrap()), bits(right));
    let restored = s.edit(cleared.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        serde_json::to_value(&restored.animations).unwrap(),
        committed
    );

    let destination = d.path().join("portable/rgba-zeros.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), destination.clone())
        .unwrap();
    let envelope =
        fbones_format::ProjectEnvelope::inspect(std::fs::read(&destination).unwrap()).unwrap();
    let decoded =
        fbones_format::minimal::scene::decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
    let SlotTimeline::Rgba { keys: written, .. } = &decoded.animations[0].slot_tracks[0] else {
        panic!("encoded RGBA")
    };
    assert_eq!(written.len(), stored.len());
    for (raw, expected) in written.iter().zip(stored) {
        assert_eq!(raw.frame.to_bits(), expected.frame.to_bits());
        assert_eq!(
            raw.values.map(f32::to_bits),
            expected.values.map(f32::to_bits)
        );
        if let Some(expected) = expected.controls {
            let SlotRgbaCurve::Bezier { controls, .. } = raw.curve else {
                panic!("encoded Bézier")
            };
            assert_eq!(bits(controls), bits(expected));
        }
    }
    s.close(false).unwrap();
    let reopened = s
        .replace(open_document(destination).unwrap(), false)
        .unwrap();
    assert!(!reopened.inspection_only && !reopened.dirty);
    let actual = rows(&reopened);
    assert_eq!(actual[1].values[1].to_bits(), negative);
    assert_eq!(bits(actual[0].controls.unwrap()), bits(signed_left));
    assert_eq!(bits(actual[1].controls.unwrap()), bits(signed_right));
}

#[test]
fn malformed_light_rgba_zero_masks_are_atomic_in_standalone_and_mixed_edits() {
    let (_d, s) = setup();
    let p = summary(&s);
    let slot = p.slots[0].id;
    let clip = p.animations[0].id;
    let bone = p.bones[0].id;
    let initial = state(&s);
    let good = rgba(slot, 6., [0.25, 0., 0.5, 1.], "linear");
    let controls = [[16., 0.25, 20., 0.375]; 4];
    let mut base = rgba(slot, 12., [0.125, 0., 0.5, 1.], "bezier");
    base["controls"] = json!(controls);
    for (mut row, mask) in [
        (base.clone(), json!([1, 1])),
        (base.clone(), json!([20])),
        (base, json!([0])),
        (rgba(slot, 12., [0.125, 0., 0.5, 1.], "linear"), json!([9])),
    ] {
        row["negativeZeroIndices"] = mask;
        let standalone = json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[good.clone(),row.clone(),rgba(slot,24.,[0.625,0.,0.75,0.5],"linear")]});
        let mixed = json!({"type":"setAnimationKeyBatch","animation":clip,
            "boneKeys":[{"bone":bone,"channel":"translate","frame":12,"values":[4,5],"curve":"linear"}],
            "slotKeys":[good.clone(),row,rgba(slot,24.,[0.625,0.,0.75,0.5],"linear")]});
        for operation in [standalone, mixed] {
            let edit = serde_json::from_value(operation).unwrap();
            assert_eq!(
                s.edit(p.revision, edit).unwrap_err().code,
                "InvalidAnimation"
            );
            assert_eq!(state(&s), initial);
        }
    }
}

#[test]
fn addressed_rgba_bezier_edit_preserves_unchanged_negative_zero_controls() {
    let (_dir, s) = setup();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let slot = p.slots[0].id;
    let values = [0.125, 0.25, 0.5, 1.0];
    let controls = [
        [8.0_f32, 0.25, 16.0, 0.375],
        [8.0, 0.375, 16.0, -0.0],
        [8.0, 0.625, 16.0, 0.75],
        [8.0, 0.875, 16.0, 0.75],
    ];
    let p = keys(
        &s,
        clip,
        vec![
            json!({"channel":"rgba","slot":slot,"frame":0,"values":values,"curve":"bezier","controls":controls}),
            rgba(slot, 24.0, [0.5, 0.75, 1.0, 0.5], "linear"),
        ],
    );
    let SlotTrackView::Rgba { keys: stored, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("RGBA")
    };
    let id = stored[0].id;
    let before = stored[0].controls.unwrap();
    assert_eq!(before[1][3].to_bits(), (-0.0_f32).to_bits());

    let mut request = before;
    request[1][3] = 0.0; // JSON transport representation of the unchanged ordinate.
    request[2][1] = 0.6875;
    let p = keys(
        &s,
        clip,
        vec![
            json!({"channel":"rgba","slot":slot,"frame":0,"keyId":id,"values":values,"curve":"bezier","controls":request}),
        ],
    );
    let SlotTrackView::Rgba { keys: stored, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("RGBA")
    };
    assert_eq!(stored[0].id, id);
    let bits = |axes: [[f32; 4]; 4]| axes.map(|axis| axis.map(f32::to_bits));
    let mut expected = before;
    expected[2][1] = request[2][1];
    assert_eq!(bits(stored[0].controls.unwrap()), bits(expected));

    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    let SlotTrackView::Rgba { keys: stored, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("RGBA")
    };
    assert_eq!(stored[0].id, id);
    assert_eq!(bits(stored[0].controls.unwrap()), bits(before));
}

#[test]
fn imported_duplicate_slot_frames_select_last_but_explicit_key_id_edits_earlier_only() {
    let (d, s) = setup();
    let path = d.path().join("duplicate-source/slots.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let mut document = open_document(path).unwrap();
    if let crate::project::Document::Editable { project, rig, .. } = &mut document {
        project.animations[0].slot_tracks = vec![
            SlotTimeline::Attachment {
                slot: 0,
                keys: vec![
                    SlotAttachmentKey {
                        frame: 6.,
                        attachment: Some(0),
                    },
                    SlotAttachmentKey {
                        frame: 6.,
                        attachment: Some(1),
                    },
                    SlotAttachmentKey {
                        frame: 24.,
                        attachment: None,
                    },
                ],
            },
            SlotTimeline::Rgba {
                slot: 0,
                keys: vec![
                    SlotRgbaKey {
                        dark_values: [0.; 3],
                        frame: 6.,
                        values: [0.25; 4],
                        curve: SlotRgbaCurve::Linear,
                    },
                    SlotRgbaKey {
                        dark_values: [0.; 3],
                        frame: 6.,
                        values: [0.75; 4],
                        curve: SlotRgbaCurve::Stepped,
                    },
                    SlotRgbaKey {
                        dark_values: [0.; 3],
                        frame: 24.,
                        values: [1.; 4],
                        curve: SlotRgbaCurve::Linear,
                    },
                ],
            },
        ];
        **rig = crate::scene_edit::SceneRigHistory::new(project, false);
    }
    let p = s.replace(document, true).unwrap();
    let clip = p.animations[0].id;
    let slot = p.slots[0].id;
    let a = p.slots[0].attachments[0].id;
    let b = p.slots[0].attachments[1].id;
    assert_eq!(sample(&s, clip, 6.).slot_pose[0].attachment, Some(b));
    assert_eq!(sample(&s, clip, 6.).slot_pose[0].color, [0.75; 4]);
    let SlotTrackView::Attachment { keys: ak, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("attachment")
    };
    let earlier_a = ak[0].id;
    let last_a = ak[1].id;
    let SlotTrackView::Rgba { keys: ck, .. } = &p.animations[0].slot_tracks[1] else {
        panic!("RGBA")
    };
    let earlier_c = ck[0].id;
    let last_c = ck[1].id;
    keys(
        &s,
        clip,
        vec![
            json!({"channel":"attachment","slot":slot,"frame":6,"keyId":earlier_a,"attachment":null}),
            json!({"channel":"rgba","slot":slot,"frame":6,"keyId":earlier_c,"values":[0.125,0.125,0.125,0.125],"curve":"linear"}),
        ],
    );
    assert_eq!(sample(&s, clip, 6.).slot_pose[0].attachment, Some(b));
    assert_eq!(sample(&s, clip, 6.).slot_pose[0].color, [0.75; 4]);
    let p = keys(
        &s,
        clip,
        vec![
            attachment(slot, 6., Some(a)),
            rgba(slot, 6., [0.5; 4], "stepped"),
        ],
    );
    let SlotTrackView::Attachment { keys: ak, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("attachment")
    };
    assert_eq!(ak[0].attachment, None);
    assert_eq!(ak[1].id, last_a);
    assert_eq!(ak[1].attachment, Some(a));
    let SlotTrackView::Rgba { keys: ck, .. } = &p.animations[0].slot_tracks[1] else {
        panic!("RGBA")
    };
    assert_eq!(ck[0].values, [0.125; 4]);
    assert_eq!(ck[1].id, last_c);
    assert_eq!(ck[1].values, [0.5; 4]);
    let before = state(&s);
    let op=serde_json::from_value(json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[json!({"channel":"rgba","slot":slot,"frame":6,"keyId":earlier_a,"values":[0.,0.,0.,0.],"curve":"linear"})]})).unwrap();
    assert!(s.edit(p.revision, op).is_err());
    assert_eq!(state(&s), before);
}

#[test]
fn deleting_unkeyed_attachment_remaps_keyed_inventory_indices_and_fractional_rgba_span_is_precise()
{
    let (_d, s) = setup();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let slot = p.slots[0].id;
    let a = p.slots[0].attachments[0].id;
    let b = p.slots[0].attachments[1].id;
    let p = keys(
        &s,
        clip,
        vec![
            attachment(slot, 0., Some(b)),
            rgba(slot, 0.1, [0.; 4], "linear"),
            rgba(slot, 0.3, [1.; 4], "linear"),
        ],
    );
    let expected = (0.2 - f64::from(0.1f32)) / (f64::from(0.3f32) - f64::from(0.1f32));
    let pose = sample(&s, clip, 0.2);
    for c in pose.slot_pose[0].color {
        assert!((c - expected).abs() < 1e-14);
    }
    let SlotTrackView::Attachment { keys: ak, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("attachment")
    };
    let key_id = ak[0].id;
    let p = edit(&s, json!({"type":"deleteAttachment","id":a}));
    assert_eq!(p.slots[0].attachments[0].id, b);
    assert_eq!(sample(&s, clip, 0.).slot_pose[0].attachment, Some(b));
    let SlotTrackView::Attachment { keys: ak, .. } = &p.animations[0].slot_tracks[0] else {
        panic!("attachment")
    };
    assert_eq!(ak[0].id, key_id);
    assert_eq!(ak[0].attachment, Some(b));
    edit(&s, json!({"type":"undo"}));
    assert_eq!(summary(&s).slots[0].attachments[0].id, a);
    assert_eq!(sample(&s, clip, 0.).slot_pose[0].attachment, Some(b));
}

#[test]
fn owner_bone_group_permutation_preserves_parallel_slot_key_identities() {
    let (_d, s) = setup();
    let p = summary(&s);
    let root = p.bones[0].id;
    let root_slot = p.slots[0].id;
    let root_attachment = p.slots[0].attachments[1].id;
    let clip = p.animations[0].id;
    let child = edit(
        &s,
        json!({"type":"create","parent":root,"x":10,"y":0,"rotation":0,"length":20}),
    )
    .edited_bone
    .unwrap();
    let p = s
        .place_images(summary(&s).revision, &["C".into()], child, 10., 0.)
        .unwrap();
    let child_slot = p.slots[2].id;
    let child_attachment = p.slots[2].attachments[0].id;
    let p = keys(
        &s,
        clip,
        vec![
            attachment(child_slot, 0., None),
            attachment(root_slot, 0., Some(root_attachment)),
        ],
    );
    let SlotTrackView::Attachment {
        keys: child_keys, ..
    } = &p.animations[0].slot_tracks[0]
    else {
        panic!("attachment")
    };
    let child_key = child_keys[0].id;
    let SlotTrackView::Attachment {
        keys: root_keys, ..
    } = &p.animations[0].slot_tracks[1]
    else {
        panic!("attachment")
    };
    let root_key = root_keys[0].id;
    let p = edit(
        &s,
        json!({"type":"setAnimationKey","animation":clip,"bone":root,"channel":"translate","frame":0,"values":[1,2],"curve":"linear"}),
    );
    let SlotTrackView::Attachment {
        slot,
        keys: grouped_keys,
        ..
    } = &p.animations[0].slot_tracks[0]
    else {
        panic!("attachment")
    };
    assert_eq!(*slot, root_slot);
    assert_eq!(grouped_keys[0].id, root_key);
    let SlotTrackView::Attachment {
        slot,
        keys: grouped_keys,
        ..
    } = &p.animations[0].slot_tracks[1]
    else {
        panic!("attachment")
    };
    assert_eq!(*slot, child_slot);
    assert_eq!(grouped_keys[0].id, child_key);
    let p = keys(
        &s,
        clip,
        vec![
            json!({"channel":"attachment","slot":child_slot,"frame":0,"attachment":child_attachment,"keyId":child_key}),
        ],
    );
    let pose = sample(&s, clip, 0.);
    assert_eq!(pose.slot_pose[0].attachment, Some(root_attachment));
    assert_eq!(pose.slot_pose[2].attachment, Some(child_attachment));
    assert_eq!(p.animations[0].slot_tracks.len(), 2);
}

#[test]
fn mesh_and_clipping_attachment_keys_sample_inventory_without_baking_and_reject_overlap() {
    let (d, s) = setup();
    let p = summary(&s);
    let slot = p.slots[0].id;
    let end = p.slots[1].id;
    let a = p.slots[0].attachments[0].id;
    let mesh = p.slots[0].attachments[1].id;
    let clip = p.animations[0].id;
    edit(
        &s,
        json!({"type":"attachmentEdit","id":mesh,"edit":{"type":"convertMesh","id":slot}}),
    );
    let p = edit(
        &s,
        json!({"type":"createClipping","slot":slot,"name":"first mask","endSlot":end,"vertices":[{"x":0,"y":0},{"x":20,"y":0},{"x":0,"y":20}]}),
    );
    let mask = p.edited_attachment.unwrap();
    edit(
        &s,
        json!({"type":"setActiveAttachment","slot":slot,"attachment":a}),
    );
    let p = edit(
        &s,
        json!({"type":"createClipping","slot":end,"name":"second mask","endSlot":end,"vertices":[{"x":0,"y":0},{"x":10,"y":0},{"x":0,"y":10}]}),
    );
    let second_mask = p.edited_attachment.unwrap();
    edit(
        &s,
        json!({"type":"setActiveAttachment","slot":end,"attachment":null}),
    );
    let setup = serde_json::to_value(summary(&s).slots).unwrap();
    keys(
        &s,
        clip,
        vec![
            attachment(slot, 0., Some(mesh)),
            attachment(slot, 6., Some(mask)),
            attachment(slot, 12., None),
        ],
    );
    assert_eq!(sample(&s, clip, 0.).slot_pose[0].attachment, Some(mesh));
    assert_eq!(sample(&s, clip, 6.).slot_pose[0].attachment, Some(mask));
    assert_eq!(sample(&s, clip, 12.).slot_pose[0].attachment, None);
    assert_eq!(serde_json::to_value(summary(&s).slots).unwrap(), setup);
    let before = state(&s);
    let op=serde_json::from_value(json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[attachment(end,6.,Some(second_mask))]})).unwrap();
    assert_eq!(
        s.edit(summary(&s).revision, op).unwrap_err().code,
        "OverlappingClipping"
    );
    assert_eq!(state(&s), before);
    let path = d.path().join("kind-bundle/kinds.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    s.close(false).unwrap();
    let p = s.replace(open_document(path).unwrap(), false).unwrap();
    assert!(p.slots[0].attachments[1].mesh.is_some());
    assert!(p.slots[0].attachments[2].clipping.is_some());
    assert_eq!(
        sample(&s, p.animations[0].id, 6.).slot_pose[0].attachment,
        Some(p.slots[0].attachments[2].id)
    );
}
