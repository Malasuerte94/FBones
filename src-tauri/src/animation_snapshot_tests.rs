use crate::project::{open_document, AppError, ProjectSummary, Session};
use fbones_format::{minimal::scene::*, ProjectEnvelope};
use serde_json::{json, Value};
use std::path::Path;

fn fixture() -> SceneProject {
    let mut project = crate::scene_sequence_fixture::project();
    let constraint = project.constraints.len();
    project
        .constraints
        .push(Constraint::Physics(PhysicsConstraint::new(
            "Own stored spring".into(),
            1,
        )));
    let clip = &mut project.animations[0];
    let translate = clip
        .tracks
        .iter_mut()
        .find(|track| track.channel == BoneChannel::Translate)
        .unwrap();
    translate.keys[0].values[0] = -0.0;
    translate.keys[0].curve = KeyCurve::Bezier {
        controls: [
            [4.25, -0.0, 20.5, f32::from_bits(0x3eaa_aaab)],
            [4.25, 2.0, 20.5, 9.0],
        ],
    };
    clip.deform_tracks[0].keys[0].offsets[..2].copy_from_slice(&[1.25, -0.0]);
    clip.constraint_tracks.push(ConstraintTimeline::Physics {
        constraint,
        property: PhysicsProperty::Gravity,
        keys: vec![PhysicsKeyframe {
            frame: 3.25,
            value: -0.0,
            curve: PhysicsCurve::Linear,
        }],
    });
    clip.constraint_tracks
        .push(ConstraintTimeline::PhysicsReset {
            constraint,
            keys: vec![PhysicsResetKeyframe { frame: 12.5 }],
        });
    let mut layouts = (0..project.animations.len())
        .map(|animation| animation_layout(&project, animation).unwrap())
        .collect::<Vec<_>>();
    layouts[0].groups.reverse();
    for group in &mut layouts[0].groups {
        group.tracks.reverse();
    }
    project.wire.as_mut().unwrap().animation_layouts = layouts;
    normalize_wire_track_order(&mut project).unwrap();
    normalize_wire_strings(&mut project).unwrap();
    project
}

fn open_fixture() -> (tempfile::TempDir, Session, SceneProject) {
    let directory = tempfile::tempdir().unwrap();
    let source = directory.path().join("own-stored-source.spine");
    let fixture = fixture();
    std::fs::write(&source, encode_scene(&fixture).unwrap()).unwrap();
    let session = Session::default();
    session
        .replace(open_document(source).unwrap(), false)
        .unwrap();
    (directory, session, fixture)
}

fn current(session: &Session) -> ProjectSummary {
    session.summary().unwrap().unwrap()
}

fn edit(session: &Session, payload: Value) -> Result<ProjectSummary, AppError> {
    session.edit(
        current(session).revision,
        serde_json::from_value(payload).unwrap(),
    )
}

fn clip_view(project: &ProjectSummary, animation: u64) -> Value {
    serde_json::to_value(
        project
            .animations
            .iter()
            .find(|clip| clip.id == animation)
            .unwrap(),
    )
    .unwrap()
}

fn keyed_ids(clip: &Value) -> Vec<u64> {
    let tracks = [
        "tracks",
        "slotTracks",
        "deformTracks",
        "constraintTracks",
        "eventTracks",
        "sequenceTracks",
    ];
    tracks
        .into_iter()
        .flat_map(|family| clip[family].as_array().unwrap())
        .flat_map(|track| track["keys"].as_array().unwrap())
        .chain(clip["drawOrder"].as_array().unwrap())
        .map(|key| key["id"].as_u64().unwrap())
        .collect()
}

fn save_and_decode(session: &Session, path: &Path) -> SceneProject {
    let saved = session
        .save_snapshot(session.prepare_save(false).unwrap(), path.to_owned())
        .unwrap();
    assert!(!saved.dirty);
    let file = ProjectEnvelope::inspect(std::fs::read(path).unwrap()).unwrap();
    decode_scene(&file.decoded_payload().unwrap()).unwrap()
}

#[test]
fn swap_restores_all_key_families_and_ids_in_one_history_step() {
    let (directory, session, original) = open_fixture();
    let initial = current(&session);
    let animation = initial.animations[0].id;
    let other = initial.animations[1].id;
    let root = initial.bones[0].id;
    let mut incoming = clip_view(&initial, animation);
    let all_keys = keyed_ids(&incoming);
    assert!(all_keys.len() >= 12);

    let stored = edit(
        &session,
        json!({"type":"storeAnimationKeys","animation":animation}),
    )
    .unwrap();
    assert_eq!(stored.revision, initial.revision);
    assert_eq!(stored.dirty, initial.dirty);
    assert_eq!(stored.can_undo, initial.can_undo);
    assert_eq!(stored.can_redo, initial.can_redo);

    let shifted = edit(
        &session,
        json!({"type":"moveAnimationKeys","animation":animation,"keys":all_keys,"deltaFrames":1.5}),
    )
    .unwrap();
    let sequences = clip_view(&shifted, animation);
    let removed = sequences["sequenceTracks"]
        .as_array()
        .unwrap()
        .iter()
        .find_map(|track| {
            let keys = track["keys"].as_array().unwrap();
            (keys.len() == 1).then(|| keys[0]["id"].as_u64().unwrap())
        })
        .unwrap();
    edit(
        &session,
        json!({"type":"deleteAnimationKeys","animation":animation,"keys":[removed]}),
    )
    .unwrap();
    edit(&session, json!({"type":"setAnimationKeys","animation":animation,"keys":[{"bone":root,"channel":"rotate","frame":5.75,"values":[-27.25,0],"curve":"stepped"}]})).unwrap();
    edit(
        &session,
        json!({"type":"renameAnimation","id":animation,"name":"Own renamed after Store"}),
    )
    .unwrap();
    edit(&session, json!({"type":"setAnimationKeys","animation":other,"keys":[{"bone":root,"channel":"translate","frame":1.25,"values":[15,5],"curve":"linear"}]})).unwrap();
    let outgoing_state = current(&session);
    let outgoing = clip_view(&outgoing_state, animation);
    let other_clip = clip_view(&outgoing_state, other);
    assert_ne!(incoming, outgoing);
    incoming["name"] = outgoing["name"].clone();

    let operation = json!({"type":"swapStoredAnimationKeys","animation":animation});
    let restored = edit(&session, operation.clone()).unwrap();
    assert_eq!(restored.revision, outgoing_state.revision + 1);
    assert_eq!(clip_view(&restored, animation), incoming);
    assert_eq!(clip_view(&restored, other), other_clip);
    assert_eq!(
        serde_json::to_value(&restored.bones).unwrap(),
        serde_json::to_value(&outgoing_state.bones).unwrap()
    );
    assert_eq!(
        serde_json::to_value(&restored.slots).unwrap(),
        serde_json::to_value(&outgoing_state.slots).unwrap()
    );

    let undone = edit(&session, json!({"type":"undo"})).unwrap();
    assert_eq!(clip_view(&undone, animation), outgoing);
    let redone = edit(&session, json!({"type":"redo"})).unwrap();
    assert_eq!(clip_view(&redone, animation), incoming);
    assert_eq!(clip_view(&redone, other), other_clip);

    let path = directory.path().join("own-swapped.fbones");
    let saved = save_and_decode(&session, &path);
    let mut expected_clip = original.animations[0].clone();
    expected_clip.name = "Own renamed after Store".into();
    assert_eq!(saved.animations[0], expected_clip);
    assert_eq!(saved.rig, original.rig);
    assert_eq!(saved.slots, original.slots);
    assert_eq!(saved.constraints, original.constraints);
    assert_eq!(saved.fps.to_bits(), original.fps.to_bits());

    let returned = edit(&session, operation.clone()).unwrap();
    assert_eq!(clip_view(&returned, animation), outgoing);
    assert_eq!(clip_view(&returned, other), other_clip);
    edit(&session, json!({"type":"undo"})).unwrap();
    session.close(false).unwrap();
    session
        .replace(open_document(path).unwrap(), false)
        .unwrap();
    assert!(edit(&session, operation).is_err());
}

#[test]
fn store_clear_and_identical_swap_do_not_change_authored_state() {
    let (_directory, session, _) = open_fixture();
    let before = current(&session);
    let animation = before.animations[0].id;
    let original = clip_view(&before, animation);
    for kind in [
        "storeAnimationKeys",
        "swapStoredAnimationKeys",
        "clearStoredAnimationKeys",
    ] {
        let state = edit(&session, json!({"type":kind,"animation":animation})).unwrap();
        assert_eq!(state.revision, before.revision, "{kind}");
        assert_eq!(state.dirty, before.dirty, "{kind}");
        assert_eq!(state.can_undo, before.can_undo, "{kind}");
        assert_eq!(state.can_redo, before.can_redo, "{kind}");
        assert_eq!(clip_view(&state, animation), original, "{kind}");
    }
    assert!(edit(
        &session,
        json!({"type":"swapStoredAnimationKeys","animation":animation})
    )
    .is_err());
}

#[test]
fn swap_rejects_wrong_clip_stale_revision_and_changed_id_context_atomically() {
    let (_directory, session, _) = open_fixture();
    let initial = current(&session);
    let animation = initial.animations[0].id;
    let other = initial.animations[1].id;
    let root = initial.bones[0].id;
    edit(
        &session,
        json!({"type":"storeAnimationKeys","animation":animation}),
    )
    .unwrap();
    let before = serde_json::to_value(current(&session)).unwrap();
    assert!(edit(
        &session,
        json!({"type":"swapStoredAnimationKeys","animation":other})
    )
    .is_err());
    let stale =
        serde_json::from_value(json!({"type":"swapStoredAnimationKeys","animation":animation}))
            .unwrap();
    assert!(session.edit(initial.revision - 1, stale).is_err());
    assert_eq!(serde_json::to_value(current(&session)).unwrap(), before);

    edit(&session, json!({"type":"create","parent":root,"name":"Own structural change","x":1,"y":2,"rotation":0,"length":5})).unwrap();
    let changed = serde_json::to_value(current(&session)).unwrap();
    assert!(edit(
        &session,
        json!({"type":"swapStoredAnimationKeys","animation":animation})
    )
    .is_err());
    assert_eq!(serde_json::to_value(current(&session)).unwrap(), changed);
}
