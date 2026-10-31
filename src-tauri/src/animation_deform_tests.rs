use super::*;
use crate::{
    evaluation::{EvaluationMode, EvaluationRequest},
    project::{new_document, open_document, Document, ProjectSummary, Session},
    rig::RigEdit,
};
use fbones_format::minimal::{
    meshes,
    regions::{BlendMode, Region},
    scene::{Clipping, SceneProject, SceneSlot},
    Bone,
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
fn png() -> Vec<u8> {
    let mut out = vec![];
    {
        let mut encoder = png::Encoder::new(&mut out, 2, 2);
        encoder.set_color(png::ColorType::Rgba);
        encoder
            .write_header()
            .unwrap()
            .write_image_data(&[255; 16])
            .unwrap();
    }
    out
}
fn fixture() -> (Session, SceneProject) {
    let mut document = new_document("deform native".into()).unwrap();
    let baseline;
    if let Document::Editable {
        project,
        rig,
        images,
        ..
    } = &mut document
    {
        for (name, rotation, sx, sy) in [
            ("child", 37., 1.3, 0.7),
            ("third", -23., -0.8, 1.2),
            ("dormant", 0., 1., 0.),
        ] {
            let mut bone = Bone::root();
            bone.name = name.into();
            bone.parent = Some(0);
            bone.x = 11.;
            bone.y = -9.;
            bone.rotation = rotation;
            bone.scale_x = sx;
            bone.scale_y = sy;
            project.rig.bones.push(bone);
        }
        let image = |name: &str| Region {
            name: name.into(),
            path: "own".into(),
            x: 0.,
            y: 0.,
            rotation: 0.,
            scale_x: 1.,
            scale_y: 1.,
            width: 32.,
            height: 32.,
        };
        let u = meshes::quad(image("U"), 0);
        let mut w = meshes::quad(image("W"), 0);
        w.weighted = true;
        w.bones = vec![0, 1, 2, 3];
        for (i, row) in w.vertices.iter_mut().enumerate() {
            row.weights = vec![0.1, 0.2, 0.7, 0.];
            row.positions = vec![
                2. + i as f32,
                4.,
                5.,
                -2. - i as f32,
                -3.,
                6.,
                91. + i as f32,
                -13.,
            ];
        }
        let mask = Clipping {
            name: "Mask polygon".into(),
            end_slot: Some(3),
            convex: true,
            inverse: false,
            color: [80, 200, 255, 255],
            weighted: false,
            bones: vec![0],
            vertices: u.vertices.clone(),
            edges: vec![0, 1, 1, 2, 2, 3, 3, 0],
        };
        project.slots = vec![
            SceneSlot {
                name: "Mask".into(),
                bone: 0,
                color: [255; 4],
                blend: BlendMode::Normal,
                attachments: vec![SceneAttachment::Clipping(mask)],
                active_attachment: None,
            },
            SceneSlot {
                name: "U".into(),
                bone: 0,
                color: [255; 4],
                blend: BlendMode::Normal,
                attachments: vec![SceneAttachment::Mesh(Box::new(u))],
                active_attachment: Some(0),
            },
            SceneSlot {
                name: "W".into(),
                bone: 0,
                color: [255; 4],
                blend: BlendMode::Normal,
                attachments: vec![SceneAttachment::Mesh(Box::new(w))],
                active_attachment: Some(0),
            },
            SceneSlot {
                name: "R".into(),
                bone: 0,
                color: [255; 4],
                blend: BlendMode::Normal,
                attachments: vec![SceneAttachment::Region(image("R"))],
                active_attachment: Some(0),
            },
        ];
        project.attachment_order = (0..4)
            .map(|slot| AttachmentAddress {
                slot,
                attachment: 0,
            })
            .collect();
        images
            .insert(
                "own".into(),
                crate::images::ImageAsset::from_bytes(png()).unwrap(),
            )
            .unwrap();
        baseline = project.as_ref().clone();
        **rig = crate::scene_edit::SceneRigHistory::new(project, false);
    } else {
        unreachable!()
    }
    let session = Session::default();
    session.replace(document, false).unwrap();
    (session, baseline)
}
fn request(s: &Session, frame: f64) -> EvaluationRequest {
    let p = summary(s);
    EvaluationRequest {
        mode: EvaluationMode::None,
        time: frame / p.animation_fps,
        animation_id: Some(p.animations[0].id),
        animation_pose: None,
        constraint_pose: None,
        draw_order_pose: None,
        deform_targets: vec![],
        deform_pose: None,
        motion: None,
        from_pose_epoch: None,
    }
}
fn sample(s: &Session, frame: f64) -> crate::evaluation::EvaluationSnapshot {
    s.evaluate(summary(s).revision, request(s, frame)).unwrap()
}
fn deform_key(id: u64, frame: f32, offsets: Vec<f32>, curve: &str) -> Value {
    json!({"attachment":id,"frame":frame,"offsets":offsets,"curve":curve})
}
fn set_deform(s: &Session, keys: Vec<Value>) -> ProjectSummary {
    edit(
        s,
        json!({"type":"setAnimationDeformKeys","animation":summary(s).animations[0].id,"keys":keys}),
    )
}
fn decode(path: &std::path::Path) -> SceneProject {
    let envelope = fbones_format::ProjectEnvelope::inspect(std::fs::read(path).unwrap()).unwrap();
    fbones_format::minimal::scene::decode_scene(&envelope.decoded_payload().unwrap()).unwrap()
}
fn setup_bytes(mut project: SceneProject) -> Vec<u8> {
    project.animations = vec![Animation::new("animation".into())];
    fbones_format::minimal::scene::encode_scene_payload(&project).unwrap()
}
#[test]
fn precise_world_target_math_corrects_near_unit_f32_mass_and_never_inverts_dormant_columns() {
    let (s, _) = fixture();
    let p = summary(&s);
    let w = p.slots[2].attachments[0].id;
    let mut document = new_document("scratch context".into()).unwrap();
    let mut frame = None;
    if let Document::Editable { project, rig, .. } = &mut document {
        let (_, baseline) = fixture();
        **project = baseline;
        **rig = crate::scene_edit::SceneRigHistory::new(project, false);
        frame = Some(rig.history.frame().clone());
    }
    let frame = frame.unwrap();
    let (_, attachment) = target(&frame, w).unwrap();
    let worlds = vec![
        Affine {
            a: 2.,
            b: 0.,
            c: 0.,
            d: 1.,
            x: 10.,
            y: -5.,
        },
        Affine {
            a: 0.,
            b: 1.,
            c: -1.,
            d: 0.,
            x: -3.,
            y: 7.,
        },
        Affine {
            a: -1.,
            b: 0.5,
            c: 0.25,
            d: 2.,
            x: 2.,
            y: -1.,
        },
        Affine {
            a: 1.,
            b: 0.,
            c: 0.,
            d: 0.,
            x: 8.,
            y: 9.,
        },
    ];
    let mut offsets = vec![0.; 32];
    offsets[6] = 17.;
    offsets[7] = -0.;
    let points = world_vertices(attachment, &offsets, &worlds).unwrap();
    let pose = DeformPoseView {
        attachment: w,
        offsets: offsets.clone(),
        world_vertices: points.clone(),
    };
    let requested = [
        points[0][0] + 3.1250000000003,
        points[0][1] - 4.0625000000006,
    ];
    let moves = [WorldVertexMove {
        vertex: 0,
        x: requested[0],
        y: requested[1],
    }];
    let changed = world_target_offsets(attachment, &moves, &pose, &worlds).unwrap();
    let actual = world_vertices(attachment, &changed, &worlds).unwrap();
    for axis in 0..2 {
        assert!((actual[0][axis] - requested[axis]).abs() < 1e-12);
    }
    assert_eq!(&changed[8..], &offsets[8..]);
    assert_eq!(changed[6].to_bits(), offsets[6].to_bits());
    assert_eq!(changed[7].to_bits(), offsets[7].to_bits());
    let mass = 0.1f32 as f64 + 0.2f32 as f64 + 0.7f32 as f64;
    assert_ne!(mass, 1.);
    let naive_error = (mass - 1.) * (requested[0] - points[0][0]);
    assert!(naive_error.abs() > 1e-8);
    let mut singular = worlds.clone();
    singular[1].d = 0.;
    singular[1].b = 0.;
    assert!(world_target_offsets(attachment, &moves, &pose, &singular).is_err());
    assert_eq!(pose.offsets, offsets);
}
#[test]
fn draw_order_reset_literal_reorder_collision_and_explicit_nullable_validation() {
    let (s, _) = fixture();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let ids = p.slots.iter().map(|slot| slot.id).collect::<Vec<_>>();
    let reverse = ids.iter().rev().copied().collect::<Vec<_>>();
    assert!(serde_json::from_value::<RigEdit>(
        json!({"type":"setAnimationDrawOrderKeys","animation":clip,"keys":[{"frame":0}]})
    )
    .is_err());
    let changed = edit(
        &s,
        json!({"type":"setAnimationDrawOrderKeys","animation":clip,"keys":[{"frame":0,"order":null},{"frame":12,"order":reverse},{"frame":24,"order":null},{"frame":30,"order":ids}]}),
    );
    assert_eq!(changed.revision, p.revision + 1);
    assert!(changed.animations[0].draw_order[3].order.is_none());
    assert_eq!(sample(&s, 12.).draw_order, reverse);
    assert_eq!(sample(&s, 24.).draw_order, ids);
    assert_eq!(
        serde_json::to_value(&changed.slots).unwrap(),
        serde_json::to_value(&p.slots).unwrap()
    );
    for (index, id) in reverse.iter().enumerate() {
        edit(&s, json!({"type":"reorderSlot","id":id,"index":index}));
    }
    let p = summary(&s);
    assert_eq!(
        p.slots.iter().map(|slot| slot.id).collect::<Vec<_>>(),
        reverse
    );
    assert_eq!(sample(&s, 0.).draw_order, reverse);
    assert_eq!(sample(&s, 12.).draw_order, reverse);
    assert_eq!(
        p.animations[0].draw_order[1].order,
        Some(reverse.clone()),
        "Existing nonempty literal must not become reset when Setup reaches its order"
    );
    let before = state(&s);
    let bad=serde_json::from_value(json!({"type":"setAnimationDrawOrderKeys","animation":clip,"keys":[{"frame":40,"order":[ids[0],ids[0],ids[2],ids[3]]}]})).unwrap();
    assert!(s.edit(p.revision, bad).is_err());
    assert_eq!(state(&s), before);
    assert!(s
        .edit(
            p.revision,
            serde_json::from_value(json!({"type":"createSlot","bone":p.bones[0].id,"name":"new"}))
                .unwrap()
        )
        .is_err());
    assert_eq!(state(&s), before);
}
#[test]
fn all_dense_deform_targets_progress_presence_signed_zero_and_portable_save_keep_setup_bits() {
    let (s, baseline) = fixture();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let mut keys = vec![];
    for (index, count) in [(0, 8), (1, 8), (2, 32)] {
        let id = p.slots[index].attachments[0].id;
        let mut end = vec![0.; count];
        end[0] = 12.;
        end[count - 2] = -0.;
        end[count - 1] = -4.;
        keys.push(json!({"attachment":id,"frame":0,"offsets":vec![0.;count],"curve":"bezier","controls":[8,0.25,16,0.75]}));
        keys.push(deform_key(id, 24., end, "stepped"));
    }
    let changed = set_deform(&s, keys);
    assert_eq!(changed.revision, p.revision + 1);
    assert_eq!(changed.animations[0].deform_tracks.len(), 3);
    let sampled = sample(&s, 12.);
    assert_eq!(sampled.deform_pose.len(), 3);
    for pose in &sampled.deform_pose {
        assert!((pose.offsets[0] - 6.).abs() < 1e-12);
        assert!((pose.offsets[pose.offsets.len() - 1] + 2.).abs() < 1e-12);
    }
    assert!(
        changed.animations[0]
            .deform_tracks
            .iter()
            .find(|t| t.attachment == p.slots[1].attachments[0].id)
            .unwrap()
            .keys[0]
            .data_present
    );
    assert!(
        !changed.animations[0]
            .deform_tracks
            .iter()
            .find(|t| t.attachment == p.slots[2].attachments[0].id)
            .unwrap()
            .keys[0]
            .data_present
    );
    let before = state(&s);
    sample(&s, 9.125);
    assert_eq!(state(&s), before);
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("bundle/deform.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let raw = decode(&path);
    assert_eq!(setup_bytes(raw.clone()), setup_bytes(baseline));
    for track in &raw.animations[0].deform_tracks {
        assert_eq!(
            track.keys[1].offsets[track.keys[1].offsets.len() - 2].to_bits(),
            (-0f32).to_bits()
        );
    }
    s.close(false).unwrap();
    let reopened = s.replace(open_document(path).unwrap(), false).unwrap();
    assert_eq!(reopened.animations[0].deform_tracks.len(), 3);
    assert!((sample(&s, 12.).deform_pose[1].offsets[0] - 6.).abs() < 1e-12);
    let before = state(&s);
    let id = reopened.slots[2].attachments[0].id;
    let mut zeros = vec![0.; 32];
    zeros[6] = -0.;
    for key in [
        json!({"attachment":id,"frame":40,"offsets":zeros,"curve":"linear","dataPresent":true}),
        json!({"attachment":id,"frame":40,"offsets":vec![1.;32],"curve":"linear","dataPresent":false}),
    ] {
        assert!(s
            .edit(
                summary(&s).revision,
                serde_json::from_value(
                    json!({"type":"setAnimationDeformKeys","animation":clip,"keys":[key]})
                )
                .unwrap()
            )
            .is_err());
        assert_eq!(state(&s), before);
    }
}
#[test]
fn frozen_world_vertices_require_epoch_preserve_dormant_offsets_and_author_one_transaction() {
    let (s, baseline) = fixture();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let id = p.slots[2].attachments[0].id;
    let mut offsets = vec![0.; 32];
    offsets[6] = 17.;
    offsets[7] = -13.;
    set_deform(&s, vec![deform_key(id, 0., offsets.clone(), "stepped")]);
    let frozen = sample(&s, 0.);
    let pose = frozen
        .deform_pose
        .iter()
        .find(|pose| pose.attachment == id)
        .unwrap();
    let desired = [
        pose.world_vertices[0][0] + 3.1250000000003,
        pose.world_vertices[0][1] - 4.0625000000006,
    ];
    let command = json!({"type":"setAnimationDeformVertices","animation":clip,"attachment":id,"frame":0,"vertices":[{"vertex":0,"x":desired[0],"y":desired[1]}]});
    let before = state(&s);
    assert_eq!(
        s.edit(
            summary(&s).revision,
            serde_json::from_value(command.clone()).unwrap()
        )
        .unwrap_err()
        .code,
        "PoseRequired"
    );
    assert_eq!(state(&s), before);
    let revision = summary(&s).revision;
    let changed = s
        .edit_in_pose(
            revision,
            frozen.pose_epoch,
            serde_json::from_value(command.clone()).unwrap(),
        )
        .unwrap();
    assert_eq!(changed.revision, revision + 1);
    let key = &changed.animations[0].deform_tracks[0].keys[0];
    assert_eq!(&key.offsets[6..], &offsets[6..]);
    assert_eq!(key.curve, "stepped");
    let after = sample(&s, 0.);
    let point = after
        .deform_pose
        .iter()
        .find(|p| p.attachment == id)
        .unwrap()
        .world_vertices[0];
    for axis in 0..2 {
        assert!(
            (point[axis] - desired[axis]).abs() < 1e-6,
            "Stored offsets round once to f32 after precise world inversion"
        );
    }
    assert_eq!(
        serde_json::to_value(&changed.slots).unwrap(),
        serde_json::to_value(&p.slots).unwrap()
    );
    assert_eq!(
        serde_json::to_value(&changed.bones).unwrap(),
        serde_json::to_value(&p.bones).unwrap()
    );
    let stable = state(&s);
    assert!(s
        .edit_in_pose(
            changed.revision,
            frozen.pose_epoch,
            serde_json::from_value(command).unwrap()
        )
        .is_err());
    assert_eq!(state(&s), stable);
    edit(&s, json!({"type":"undo"}));
    assert_eq!(
        summary(&s).animations[0].deform_tracks[0].keys[0].offsets,
        offsets
    );
    edit(&s, json!({"type":"redo"}));
    assert_eq!(
        summary(&s).animations[0].deform_tracks[0].keys[0].offsets,
        key.offsets
    );
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("frozen.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    assert_eq!(setup_bytes(decode(&path)), setup_bytes(baseline));
}

#[test]
fn temporary_order_and_dense_deform_overrides_freeze_precise_pose_without_authoring_or_saving() {
    let (s, baseline) = fixture();
    let p = summary(&s);
    let id = p.slots[1].attachments[0].id;
    let mut req = request(&s, 6.);
    let mut offsets = vec![0.; 8];
    offsets[0] = 3.1250000000003;
    req.deform_pose = Some(vec![TemporaryDeformPose {
        attachment: id,
        offsets: offsets.clone(),
    }]);
    let order = p.slots.iter().rev().map(|slot| slot.id).collect::<Vec<_>>();
    req.draw_order_pose = Some(order.clone());
    let stable = state(&s);
    let frozen = s.evaluate(p.revision, req.clone()).unwrap();
    assert_eq!(frozen.draw_order, order);
    assert_eq!(
        frozen
            .deform_pose
            .iter()
            .find(|pose| pose.attachment == id)
            .unwrap()
            .offsets,
        offsets
    );
    assert_eq!(state(&s), stable);
    for bad in [
        {
            let mut r = req.clone();
            r.mode = EvaluationMode::Update;
            r
        },
        {
            let mut r = req.clone();
            r.animation_id = None;
            r
        },
        {
            let mut r = req.clone();
            r.draw_order_pose = Some(vec![p.slots[0].id; 4]);
            r
        },
        {
            let mut r = req.clone();
            r.deform_pose.as_mut().unwrap()[0].offsets.pop();
            r
        },
        {
            let mut r = req.clone();
            r.deform_pose.as_mut().unwrap()[0].offsets[0] = f64::NAN;
            r
        },
        {
            let mut r = req.clone();
            let duplicate = r.deform_pose.as_ref().unwrap()[0].clone();
            r.deform_pose.as_mut().unwrap().push(duplicate);
            r
        },
    ] {
        assert!(s.evaluate(p.revision, bad).is_err());
        assert_eq!(state(&s), stable);
    }
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("temporary.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let raw = decode(&path);
    assert!(raw.animations[0].draw_order.is_empty());
    assert!(raw.animations[0].deform_tracks.is_empty());
    assert_eq!(setup_bytes(raw), setup_bytes(baseline));
}

fn all_key_ids(p: &ProjectSummary) -> Vec<u64> {
    let clip = &p.animations[0];
    clip.tracks
        .iter()
        .flat_map(|track| track.keys.iter().map(|key| key.id))
        .chain(clip.slot_tracks.iter().flat_map(|track| match track {
            crate::animation_slots::SlotTrackView::Attachment { keys, .. } => {
                keys.iter().map(|key| key.id).collect::<Vec<_>>()
            }
            crate::animation_slots::SlotTrackView::Rgba { keys, .. } => {
                keys.iter().map(|key| key.id).collect()
            }
        }))
        .chain(clip.draw_order.iter().map(|key| key.id))
        .chain(
            clip.deform_tracks
                .iter()
                .flat_map(|track| track.keys.iter().map(|key| key.id)),
        )
        .collect()
}

#[test]
fn json_deform_coordinate_bits_preserve_dormant_negative_zero_in_raw_and_combined_batches() {
    let (s, baseline) = fixture();
    let p = summary(&s);
    let id = p.slots[2].attachments[0].id;
    let mut offsets = [0f32; 32];
    offsets[0] = 2.125;
    offsets[6] = -0.; // A zero-weight column survives JSON's numeric zero normalization.
    let bits = offsets.iter().map(|v| v.to_bits()).collect::<Vec<_>>();
    let numeric = offsets
        .iter()
        .map(|v| if *v == 0. { 0. } else { *v })
        .collect::<Vec<_>>();
    let key = |frame| json!({"attachment":id,"frame":frame,"offsets":numeric,"offsetBits":bits,"curve":"linear"});
    let first = set_deform(&s, vec![key(0)]);
    assert_eq!(first.revision, p.revision + 1);
    assert_eq!(
        first.animations[0].deform_tracks[0].keys[0].offsets[6].to_bits(),
        0x8000_0000
    );
    let batch = json!({"type":"setAnimationKeyBatch","animation":p.animations[0].id,"boneKeys":[],"slotKeys":[],"deformKeys":[key(24)]});
    // Deserialize actual JSON text, as the desktop IPC does, rather than passing a Value alone.
    let changed = s
        .edit(
            first.revision,
            serde_json::from_str(&batch.to_string()).unwrap(),
        )
        .unwrap();
    assert_eq!(changed.revision, first.revision + 1);
    assert_eq!(changed.animations[0].deform_tracks[0].keys.len(), 2);
    edit(&s, json!({"type":"undo"}));
    assert_eq!(summary(&s).animations[0].deform_tracks[0].keys.len(), 1);
    edit(&s, json!({"type":"redo"}));
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("bundle/coordinate-bits.fbones");
    s.save_snapshot(s.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    let raw = decode(&path);
    assert_eq!(setup_bytes(raw.clone()), setup_bytes(baseline));
    for key in &raw.animations[0].deform_tracks[0].keys {
        assert_eq!(
            key.offsets.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
            bits
        );
    }
    s.close(false).unwrap();
    let reopened = s.replace(open_document(path).unwrap(), false).unwrap();
    for key in &reopened.animations[0].deform_tracks[0].keys {
        assert_eq!(key.offsets[6].to_bits(), 0x8000_0000);
    }
}

#[test]
fn invalid_deform_coordinate_bits_reject_mismatches_and_nonfinite_values_atomically() {
    let (s, _) = fixture();
    let p = summary(&s);
    let id = p.slots[2].attachments[0].id;
    let numeric = vec![1f32; 32];
    let valid = numeric.iter().map(|v| v.to_bits()).collect::<Vec<_>>();
    let mut cases = vec![valid[..31].to_vec()];
    for value in [
        2f32.to_bits(),
        f32::NAN.to_bits(),
        f32::INFINITY.to_bits(),
        f32::NEG_INFINITY.to_bits(),
    ] {
        let mut bits = valid.clone();
        bits[6] = value;
        cases.push(bits);
    }
    let before = state(&s);
    for bits in cases {
        let command = json!({"type":"setAnimationKeyBatch","animation":p.animations[0].id,"boneKeys":[{"bone":p.bones[0].id,"channel":"translate","frame":0,"values":[3,4],"curve":"linear"}],"slotKeys":[],"deformKeys":[{"attachment":id,"frame":0,"offsets":numeric,"offsetBits":bits,"curve":"linear"}]});
        assert!(s
            .edit(
                p.revision,
                serde_json::from_str(&command.to_string()).unwrap()
            )
            .is_err());
        assert_eq!(state(&s), before);
    }
    // Existing compact-zero/presence rules still apply after authoritative bit decoding.
    let mut bits = vec![0u32; 32];
    bits[6] = 0x8000_0000;
    let command = json!({"type":"setAnimationDeformKeys","animation":p.animations[0].id,"keys":[{"attachment":id,"frame":0,"offsets":vec![0.;32],"offsetBits":bits,"curve":"linear","dataPresent":true}]});
    assert!(s
        .edit(
            p.revision,
            serde_json::from_str(&command.to_string()).unwrap()
        )
        .is_err());
    assert_eq!(state(&s), before);
}

#[test]
fn temporary_json_negative_zero_indices_restore_sign_without_quantizing_precise_pose() {
    let (s, _) = fixture();
    let p = summary(&s);
    let id = p.slots[2].attachments[0].id;
    let mut offsets = vec![0f64; 32];
    offsets[0] = 3.1250000000003;
    let value = json!({"mode":"none","time":0,"animationId":p.animations[0].id,"deformPose":[{"attachment":id,"offsets":offsets,"negativeZeroIndices":[6]}]});
    let before = state(&s);
    let frozen = s
        .evaluate(
            p.revision,
            serde_json::from_str(&value.to_string()).unwrap(),
        )
        .unwrap();
    assert_eq!(
        frozen.deform_pose[0].offsets[0].to_bits(),
        offsets[0].to_bits()
    );
    assert_eq!(
        frozen.deform_pose[0].offsets[6].to_bits(),
        (-0f64).to_bits()
    );
    assert_eq!(state(&s), before);
    for indices in [vec![6, 6], vec![32], vec![0]] {
        let mut bad = value.clone();
        bad["deformPose"][0]["negativeZeroIndices"] = json!(indices);
        assert!(serde_json::from_str::<EvaluationRequest>(&bad.to_string()).is_err());
        assert_eq!(state(&s), before);
    }
    let point = frozen.deform_pose[0].world_vertices[0];
    let command = json!({"type":"setAnimationDeformVertices","animation":p.animations[0].id,"attachment":id,"frame":0,"vertices":[{"vertex":0,"x":point[0]+2.125,"y":point[1]-1.5}]});
    let changed = s
        .edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            serde_json::from_value(command).unwrap(),
        )
        .unwrap();
    assert_eq!(
        changed.animations[0].deform_tracks[0].keys[0].offsets[6].to_bits(),
        (-0f32).to_bits()
    );
}
#[test]
fn mixed_four_family_batches_move_delete_duplicate_and_history_share_one_stable_id_space() {
    let (s, _) = fixture();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let root = p.bones[0].id;
    let slot = p.slots[1].id;
    let id = p.slots[1].attachments[0].id;
    let reverse = p.slots.iter().rev().map(|slot| slot.id).collect::<Vec<_>>();
    let changed = edit(
        &s,
        json!({"type":"setAnimationKeyBatch","animation":clip,"boneKeys":[{"bone":root,"channel":"translate","frame":0,"values":[0,0],"curve":"linear"},{"bone":root,"channel":"translate","frame":24,"values":[12,-6],"curve":"linear"}],"slotKeys":[{"channel":"attachment","slot":slot,"frame":0,"attachment":id},{"channel":"attachment","slot":slot,"frame":24,"attachment":null}],"drawOrderKeys":[{"frame":0,"order":null},{"frame":24,"order":reverse}],"deformKeys":[{"attachment":id,"frame":0,"offsets":vec![0.;8],"curve":"bezier","controls":[8,0.25,16,0.75]},deform_key(id,24.,vec![4.;8],"stepped")]}),
    );
    assert_eq!(changed.revision, p.revision + 1);
    let ids = all_key_ids(&changed);
    assert_eq!(ids.len(), 8);
    assert_eq!(ids.iter().collect::<HashSet<_>>().len(), 8);
    assert_eq!(changed.animations[0].duration, 24.);
    let duplicate = edit(
        &s,
        json!({"type":"duplicateAnimation","id":clip,"name":"duplicate"}),
    );
    let mut copied = duplicate.clone();
    copied.animations = vec![duplicate.animations[1].clone()];
    let copied_ids = all_key_ids(&copied);
    assert_eq!(copied_ids.len(), ids.len());
    assert!(ids.iter().all(|id| !copied_ids.contains(id)));
    let moved = edit(
        &s,
        json!({"type":"moveAnimationKeys","animation":clip,"keys":ids,"deltaFrames":3}),
    );
    assert_eq!(
        moved.animations[0].deform_tracks[0].keys[0]
            .controls
            .unwrap(),
        [11., 0.25, 19., 0.75]
    );
    assert_eq!(moved.animations[0].draw_order[0].frame, 3.);
    assert_eq!(all_key_ids(&moved), ids);
    let before = state(&s);
    let last = moved.animations[0].deform_tracks[0].keys[1].id;
    assert!(s
        .edit(
            moved.revision,
            serde_json::from_value(
                json!({"type":"deleteAnimationKeys","animation":clip,"keys":[last]})
            )
            .unwrap()
        )
        .is_err());
    assert_eq!(state(&s), before);
    edit(
        &s,
        json!({"type":"deleteAnimationKeys","animation":clip,"keys":ids}),
    );
    assert!(all_key_ids(&summary(&s)).is_empty());
    edit(&s, json!({"type":"undo"}));
    assert_eq!(all_key_ids(&summary(&s)), ids);
    assert_eq!(
        summary(&s).animations[0].deform_tracks[0].keys[0].controls,
        moved.animations[0].deform_tracks[0].keys[0].controls
    );
}

#[test]
fn keyed_binding_changes_reject_atomically_while_rename_and_slot_reindex_preserve_targets() {
    let (s, _) = fixture();
    let p = summary(&s);
    let id = p.slots[2].attachments[0].id;
    let slot = p.slots[2].id;
    let clip = p.animations[0].id;
    set_deform(&s, vec![deform_key(id, 0., vec![1.; 32], "linear")]);
    let stable = state(&s);
    for op in [
        json!({"type":"setAttachmentWeight","id":id,"vertex":0,"bone":p.bones[0].id,"value":0.2}),
        json!({"type":"bindAttachment","id":id,"bones":[p.bones[0].id]}),
        json!({"type":"deleteAttachment","id":id}),
        json!({"type":"moveAttachment","id":id,"slot":p.slots[3].id}),
    ] {
        assert!(s
            .edit(summary(&s).revision, serde_json::from_value(op).unwrap())
            .is_err());
        assert_eq!(state(&s), stable);
    }
    let renamed = edit(
        &s,
        json!({"type":"renameAttachment","id":id,"name":"W renamed"}),
    );
    let key_id = renamed.animations[0].deform_tracks[0].keys[0].id;
    let reordered = edit(&s, json!({"type":"reorderSlot","id":slot,"index":1}));
    assert_eq!(reordered.animations[0].deform_tracks[0].attachment, id);
    assert_eq!(reordered.animations[0].deform_tracks[0].keys[0].id, key_id);
    assert_eq!(
        sample(&s, 0.)
            .deform_pose
            .iter()
            .find(|pose| pose.attachment == id)
            .unwrap()
            .offsets,
        vec![1.; 32]
    );
    assert_eq!(reordered.animations[0].id, clip);
}

#[test]
fn combined_slot_and_draw_order_validates_final_clipping_state_in_sampled_order() {
    let (s, _) = fixture();
    let p = summary(&s);
    let mask = p.slots[0].id;
    let clipping = p.slots[0].attachments[0].id;
    let desired = p.slots.iter().map(|slot| slot.id).collect::<Vec<_>>();
    let clip = p.animations[0].id;
    edit(&s, json!({"type":"reorderSlot","id":mask,"index":3}));
    let before = state(&s);
    let invalid=serde_json::from_value(json!({"type":"setAnimationSlotKeys","animation":clip,"keys":[{"channel":"attachment","slot":mask,"frame":0,"attachment":clipping}]})).unwrap();
    assert_eq!(
        s.edit(summary(&s).revision, invalid).unwrap_err().code,
        "UnsupportedClippingRange"
    );
    assert_eq!(state(&s), before);
    let revision = summary(&s).revision;
    let changed = edit(
        &s,
        json!({"type":"setAnimationKeyBatch","animation":clip,"boneKeys":[],"slotKeys":[{"channel":"attachment","slot":mask,"frame":0,"attachment":clipping}],"drawOrderKeys":[{"frame":0,"order":desired}],"deformKeys":[]}),
    );
    assert_eq!(changed.revision, revision + 1);
    let sampled = sample(&s, 0.);
    assert_eq!(sampled.draw_order, desired);
    assert_eq!(
        sampled
            .slot_pose
            .iter()
            .find(|pose| pose.slot == mask)
            .unwrap()
            .attachment,
        Some(clipping)
    );
    let stable = state(&s);
    let mut invalid = request(&s, 0.);
    invalid.draw_order_pose = Some(summary(&s).slots.iter().map(|slot| slot.id).collect());
    assert_eq!(
        s.evaluate(changed.revision, invalid).unwrap_err().code,
        "UnsupportedClippingRange"
    );
    assert_eq!(state(&s), stable);
}

#[test]
fn deformation_snapshots_are_sparse_and_explicit_unkeyed_freeze_enables_first_drag() {
    let (s, _) = fixture();
    let p = summary(&s);
    let clip = p.animations[0].id;
    let w = p.slots[2].attachments[0].id;
    let mut setup = request(&s, 0.);
    setup.animation_id = None;
    assert!(s
        .evaluate(p.revision, setup)
        .unwrap()
        .deform_pose
        .is_empty());
    let empty = sample(&s, 0.);
    assert!(
        empty.deform_pose.is_empty(),
        "Unkeyed inventory must not allocate or transfer dense zero vectors by default"
    );
    let command = json!({"type":"setAnimationDeformVertices","animation":clip,"attachment":w,"frame":0,"vertices":[{"vertex":0,"x":1.1250000000003,"y":-2.0625000000006}]});
    let stable = state(&s);
    assert_eq!(
        s.edit_in_pose(
            p.revision,
            empty.pose_epoch,
            serde_json::from_value(command.clone()).unwrap()
        )
        .unwrap_err()
        .code,
        "StalePose"
    );
    assert_eq!(state(&s), stable);
    let mut scoped = request(&s, 0.);
    scoped.deform_targets = vec![w];
    let frozen = s.evaluate(p.revision, scoped.clone()).unwrap();
    assert_eq!(frozen.deform_pose.len(), 1);
    assert_eq!(frozen.deform_pose[0].attachment, w);
    assert_eq!(frozen.deform_pose[0].offsets, vec![0.; 32]);
    let changed = s
        .edit_in_pose(
            p.revision,
            frozen.pose_epoch,
            serde_json::from_value(command).unwrap(),
        )
        .unwrap();
    assert_eq!(changed.revision, p.revision + 1);
    assert_eq!(
        changed.animations[0].deform_tracks[0].keys[0].offsets.len(),
        32
    );
    assert_eq!(
        &changed.animations[0].deform_tracks[0].keys[0].offsets[6..8],
        &[0., 0.]
    );
    let sampled = sample(&s, 0.);
    assert_eq!(sampled.deform_pose.len(), 1);
    assert_eq!(sampled.deform_pose[0].attachment, w);
    let stable = state(&s);
    for targets in [vec![w, w], vec![p.slots[3].attachments[0].id], vec![99999]] {
        let mut invalid = request(&s, 0.);
        invalid.deform_targets = targets;
        assert!(s.evaluate(changed.revision, invalid).is_err());
        assert_eq!(state(&s), stable);
    }
}

#[test]
fn unrelated_setup_edits_preserve_existing_literal_draw_offset_records_exactly() {
    let (_, mut project) = fixture();
    let literal = vec![
        fbones_format::minimal::scene::SlotOffset { slot: 0, offset: 1 },
        fbones_format::minimal::scene::SlotOffset {
            slot: 1,
            offset: -1,
        },
    ];
    project.animations[0].draw_order = vec![fbones_format::minimal::scene::DrawOrderKey {
        frame: 0.,
        offsets: literal.clone(),
    }];
    let mut history = crate::scene_edit::SceneHistory::new(project, false).unwrap();
    let id = history.frame().bone_ids[0];
    let mut bone = history.frame().project.rig.bones[0].clone();
    bone.x = 17.;
    history
        .apply(crate::scene_edit::SceneEdit::SetBone { id, bone })
        .unwrap();
    assert_eq!(
        history.frame().project.animations[0].draw_order[0].offsets,
        literal
    );
    let slot = history.frame().slot_ids[1];
    history
        .apply(crate::scene_edit::SceneEdit::SetSlotColor {
            id: slot,
            color: [123, 45, 67, 255],
        })
        .unwrap();
    assert_eq!(
        history.frame().project.animations[0].draw_order[0].offsets,
        literal
    );
}

#[test]
fn animated_replay_freeze_requests_only_selected_geometry_and_keeps_endpoint_draft_precision() {
    let (s, baseline) = fixture();
    let p = summary(&s);
    let w = p.slots[2].attachments[0].id;
    let before = state(&s);
    let mut replay = request(&s, 15.25);
    replay.mode = EvaluationMode::Replay;
    let empty = s.evaluate(p.revision, replay.clone()).unwrap();
    assert!(empty.deform_pose.is_empty());
    replay.deform_targets = vec![w];
    replay.animation_pose = Some(empty.bones.iter().map(|b| b.authored).collect());
    replay.animation_pose.as_mut().unwrap()[0].x = 21.123456789123;
    replay.deform_pose = Some(vec![crate::animation_deform::TemporaryDeformPose {
        attachment: w,
        offsets: vec![0.; 32],
    }]);
    replay.deform_pose.as_mut().unwrap()[0].offsets[0] = 1.123456789123;
    let frozen = s.evaluate(p.revision, replay.clone()).unwrap();
    assert_eq!(frozen.deform_pose.len(), 1);
    assert_eq!(frozen.deform_pose[0].attachment, w);
    assert_eq!(frozen.deform_pose[0].offsets[0], 1.123456789123);
    assert_eq!(frozen.bones[0].authored.x, 21.123456789123);
    assert_eq!(state(&s), before);
    for mode in [
        EvaluationMode::Reset,
        EvaluationMode::Update,
        EvaluationMode::Pose,
    ] {
        replay.mode = mode;
        assert!(s.evaluate(p.revision, replay.clone()).is_err());
        assert_eq!(state(&s), before);
    }
    replay.mode = EvaluationMode::Replay;
    replay.animation_pose = None;
    replay.deform_pose = None;
    replay.animation_id = None;
    assert_eq!(
        s.evaluate(p.revision, replay).unwrap_err().code,
        "InvalidAnimationPose"
    );
    assert_eq!(state(&s), before);
    assert_eq!(baseline.rig.bones[0].x, 0.);
}
