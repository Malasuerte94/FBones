//! Structural regression across every keyed family in an owned wire-profile scene.
use crate::scene_edit::{SceneEdit, SceneFrame, SceneHistory};
use fbones_format::minimal::scene::*;
use std::collections::{BTreeMap, HashSet};

fn roundtrip(project: &SceneProject) {
    let payload = encode_scene_payload(project).unwrap();
    let reopened = decode_scene(&payload).unwrap();
    assert_eq!(&reopened, project);
    assert_eq!(encode_scene_payload(&reopened).unwrap(), payload);
}

fn mixed_project() -> SceneProject {
    let mut p = crate::scene_wire_fixture::project();
    let mut constraint = TransformConstraint::new("Own follow".into(), vec![2], 1);
    constraint.local_source = true;
    constraint.local_target = true;
    p.constraints.push(Constraint::Transform(constraint));
    for name in ["Own cue A", "Own cue B"] {
        p.events.push(EventDefinition {
            name: name.into(),
            int: -4,
            float: 1.25,
            string: "shared own default".into(),
            audio: String::new(),
            volume: 0.75,
            balance: -0.25,
        });
    }
    let clip = &mut p.animations[0];
    clip.deform_tracks.push(DeformTimeline {
        attachment: AttachmentAddress {
            slot: 1,
            attachment: 0,
        },
        keys: vec![DeformKey {
            frame: 9.,
            offsets: vec![1.25, -0., 2.5, -3.75, 0., 0., -1., 4.],
            data_present: true,
            curve: DeformCurve::Linear,
        }],
    });
    clip.constraint_tracks
        .push(ConstraintTimeline::TransformMix {
            constraint: 0,
            keys: vec![TransformMixKeyframe {
                frame: 12.,
                values: [0.125, 0.25, 0.375, 0.5, 0.625, 0.75],
                curve: TransformMixCurve::Stepped,
            }],
        });
    for event in 0..2 {
        clip.event_tracks.push(EventTimeline {
            event,
            keys: vec![EventKeyframe {
                frame: 6. + event as f32 * 2.,
                int: 10 + event as i32,
                float: -0.5,
                string: "shared own default".into(),
                volume: 0.625,
                balance: 0.125,
            }],
        });
    }
    clip.draw_order.push(DrawOrderKey {
        frame: 4.,
        offsets: vec![],
    });
    let mut layouts = (0..p.animations.len())
        .map(|a| animation_layout(&p, a).unwrap())
        .collect::<Vec<_>>();
    layouts[0].groups.reverse();
    for group in &mut layouts[0].groups {
        group.tracks.reverse();
    }
    let wire = p.wire.as_mut().unwrap();
    wire.animation_layouts = layouts;
    for event in 0..2 {
        wire.strings.push(WireStringAlias {
            owner: WireStringOwner::Event(event),
            tag: 5,
            group: 42,
            encoding: None,
        });
    }
    normalize_wire_track_order(&mut p).unwrap();
    normalize_wire_strings(&mut p).unwrap();
    roundtrip(&p);
    p
}

/// Key identities stay paired with semantic target identities, even when their
/// family vectors, wire groups and indexed event targets move independently.
fn key_payloads(f: &SceneFrame, a: usize) -> BTreeMap<u64, String> {
    let mut result = BTreeMap::new();
    let mut add = |id, payload| assert!(result.insert(id, payload).is_none());
    let clip = &f.project.animations[a];
    for (t, track) in clip.tracks.iter().enumerate() {
        for (k, key) in track.keys.iter().enumerate() {
            add(
                f.animation_key_ids[a][t][k],
                format!(
                    "bone={}/{:?}/{}/{:?}/{:?}",
                    f.bone_ids[track.bone],
                    track.channel,
                    key.frame.to_bits(),
                    key.values.map(f32::to_bits),
                    key.curve,
                ),
            );
        }
    }
    for (t, track) in clip.slot_tracks.iter().enumerate() {
        match track {
            SlotTimeline::Attachment { slot, keys } => {
                for (k, key) in keys.iter().enumerate() {
                    add(
                        f.animation_slot_key_ids[a][t][k],
                        format!(
                            "slot={}/attachment/{}/{:?}",
                            f.slot_ids[*slot],
                            key.frame.to_bits(),
                            key.attachment.map(|i| f.attachment_ids[*slot][i]),
                        ),
                    );
                }
            }
            SlotTimeline::Rgba { slot, keys } => {
                for (k, key) in keys.iter().enumerate() {
                    add(
                        f.animation_slot_key_ids[a][t][k],
                        format!(
                            "slot={}/rgba/{}/{:?}/{:?}",
                            f.slot_ids[*slot],
                            key.frame.to_bits(),
                            key.values.map(f32::to_bits),
                            key.curve,
                        ),
                    );
                }
            }
        }
    }
    for (t, track) in clip.deform_tracks.iter().enumerate() {
        let target = f.attachment_ids[track.attachment.slot][track.attachment.attachment];
        for (k, key) in track.keys.iter().enumerate() {
            add(
                f.animation_deform_key_ids[a][t][k],
                format!(
                    "deform={target}/{}/{:?}/{}/{:?}",
                    key.frame.to_bits(),
                    key.offsets.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                    key.data_present,
                    key.curve,
                ),
            );
        }
    }
    for (t, track) in clip.constraint_tracks.iter().enumerate() {
        let ConstraintTimeline::TransformMix { constraint, keys } = track else {
            panic!("This own fixture has only a Transform Mix timeline");
        };
        for (k, key) in keys.iter().enumerate() {
            add(
                f.animation_constraint_key_ids[a][t][k],
                format!(
                    "constraint={}/{}/{:?}/{:?}",
                    f.constraint_ids[*constraint],
                    key.frame.to_bits(),
                    key.values.map(f32::to_bits),
                    key.curve,
                ),
            );
        }
    }
    for (t, track) in clip.event_tracks.iter().enumerate() {
        for (k, key) in track.keys.iter().enumerate() {
            add(
                f.animation_event_key_ids[a][t][k],
                format!(
                    "event={}/{}/{}/{}/{:?}/{}/{}",
                    f.event_ids[track.event],
                    key.frame.to_bits(),
                    key.int,
                    key.float.to_bits(),
                    key.string,
                    key.volume.to_bits(),
                    key.balance.to_bits(),
                ),
            );
        }
    }
    for (k, key) in clip.draw_order.iter().enumerate() {
        add(
            f.animation_draw_key_ids[a][k],
            format!(
                "draw/{}/{:?}",
                key.frame.to_bits(),
                key.offsets
                    .iter()
                    .map(|o| (f.slot_ids[o.slot], o.offset))
                    .collect::<Vec<_>>(),
            ),
        );
    }
    result
}

fn animation(history: &mut SceneHistory, value: serde_json::Value) {
    history
        .apply(SceneEdit::Animation(serde_json::from_value(value).unwrap()))
        .unwrap();
    roundtrip(&history.frame().project);
}

#[test]
fn wire_mixed_families_retarget_convert_delete_and_duplicate_keep_native_key_identity_payloads() {
    let original = mixed_project();
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    let before = key_payloads(history.frame(), 0);
    let source_id = history.frame().animation_ids[0];
    let constraint_id = history.frame().constraint_ids[0];
    let mut changed = history.frame().project.constraints[0].clone();
    let Constraint::Transform(c) = &mut changed else {
        unreachable!()
    };
    c.source = 0;
    history
        .apply(SceneEdit::SetConstraint {
            id: constraint_id,
            constraint: changed,
        })
        .unwrap();
    roundtrip(&history.frame().project);
    assert_eq!(key_payloads(history.frame(), 0), before);
    let layout = &history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .animation_layouts[0];
    assert!(layout
        .groups
        .iter()
        .any(|g| g.owner == WireAnimationOwner::Bone(0)
            && g.tracks.contains(&WireTrack::Constraint {
                constraint: 0,
                channel: WireConstraintChannel::TransformMix,
            })));

    let attachment_id = history.frame().attachment_ids[0][0];
    let slot_id = history.frame().slot_ids[0];
    history
        .apply(SceneEdit::Rig(
            serde_json::from_value(serde_json::json!({
                "type":"attachmentEdit", "id":attachment_id,
                "edit":{"type":"convertMesh", "id":slot_id},
            }))
            .unwrap(),
        ))
        .unwrap();
    roundtrip(&history.frame().project);
    assert!(history.frame().project.slots[0].attachments[0]
        .mesh()
        .is_some());
    assert!(history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .any(|s| s.owner
            == WireStringOwner::Attachment(AttachmentAddress {
                slot: 0,
                attachment: 0
            })
            && s.tag == 14));
    assert!(!history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .any(|s| s.owner
            == WireStringOwner::Attachment(AttachmentAddress {
                slot: 0,
                attachment: 0
            })
            && s.tag == 13));
    assert_eq!(key_payloads(history.frame(), 0), before);

    let event_id = history.frame().event_ids[0];
    let event_track = history.frame().project.animations[0]
        .event_tracks
        .iter()
        .position(|t| t.event == 0)
        .unwrap();
    let removed = history.frame().animation_event_key_ids[0][event_track].clone();
    animation(
        &mut history,
        serde_json::json!({
            "type":"deleteAnimationKeys", "animation":source_id, "keys":removed,
        }),
    );
    animation(
        &mut history,
        serde_json::json!({"type":"deleteEvent", "id":event_id}),
    );
    let expected = before
        .into_iter()
        .filter(|(id, _)| !removed.contains(id))
        .collect::<BTreeMap<_, _>>();
    assert_eq!(key_payloads(history.frame(), 0), expected);
    assert_eq!(history.frame().event_ids, [1]);
    assert_eq!(
        history.frame().project.animations[0].event_tracks[0].event,
        0
    );
    animation(
        &mut history,
        serde_json::json!({"type":"createEvent", "name":"Own unrelated cue"}),
    );
    assert_eq!(history.frame().event_ids, [1, 2]);
    assert!(!history
        .frame()
        .project
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .any(|s| matches!(s.owner, WireStringOwner::Event(1))));
    assert_eq!(key_payloads(history.frame(), 0), expected);

    let source_clip = history.frame().project.animations[0].clone();
    animation(
        &mut history,
        serde_json::json!({
            "type":"duplicateAnimation", "id":source_id, "name":"Own mixed copy",
        }),
    );
    assert_eq!(key_payloads(history.frame(), 0), expected);
    let duplicate = history.frame().project.animations.len() - 1;
    let copied = key_payloads(history.frame(), duplicate);
    assert_eq!(
        copied.values().collect::<HashSet<_>>(),
        expected.values().collect()
    );
    assert_eq!(copied.len(), expected.len());
    assert!(copied.keys().all(|id| !expected.contains_key(id)));
    assert_eq!(history.frame().project.animations[0], source_clip);
    let final_project = history.frame().project.clone();
    history.apply(SceneEdit::Undo).unwrap();
    roundtrip(&history.frame().project);
    assert_eq!(key_payloads(history.frame(), 0), expected);
    history.apply(SceneEdit::Redo).unwrap();
    assert_eq!(history.frame().project, final_project);
    roundtrip(&history.frame().project);
    assert_eq!(history.frame().project.rig, original.rig);
}
