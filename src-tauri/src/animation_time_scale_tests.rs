use crate::{
    animation::KeyView,
    project::{new_document, ProjectSummary, Session},
    rig::RigEdit,
};
use serde_json::{json, Value};

fn snapshot(session: &Session) -> ProjectSummary {
    session.summary().unwrap().unwrap()
}

fn edit(session: &Session, value: Value) -> ProjectSummary {
    session
        .edit(snapshot(session).revision, serde_json::from_value(value).unwrap())
        .unwrap()
}

fn fixture(keys: impl FnOnce(u64) -> Vec<Value>) -> (Session, u64, u64) {
    let session = Session::default();
    let project = session
        .replace(new_document("Own timing scale".into()).unwrap(), false)
        .unwrap();
    let bone = project.bones[0].id;
    let animation = project.animations[0].id;
    edit(
        &session,
        json!({"type":"setAnimationKeys","animation":animation,"keys":keys(bone)}),
    );
    (session, bone, animation)
}

fn rotate(bone: u64, frame: f32, value: f32, curve: &str) -> Value {
    json!({"bone":bone,"channel":"rotate","frame":frame,"values":[value,0],"curve":curve})
}

fn keys(project: &ProjectSummary) -> &[KeyView] {
    &project.animations[0].tracks[0].keys
}

fn key_times(project: &ProjectSummary) -> Vec<(u64, f32)> {
    keys(project).iter().map(|key| (key.id, key.frame)).collect()
}

fn scale(animation: u64, ids: &[u64], anchor: f32, from: f32, to: f32) -> Value {
    json!({
        "type":"scaleAnimationKeys","animation":animation,"keys":ids,
        "anchorFrame":anchor,"fromEdgeFrame":from,"toEdgeFrame":to,
    })
}

#[test]
fn scaling_time_preserves_keys_and_stepped_interpolation_in_one_undo() {
    let (session, _, animation) = fixture(|bone| {
        vec![
            rotate(bone, 4., 10., "linear"),
            json!({"bone":bone,"channel":"rotate","frame":10,"values":[0,0],"curve":"stepped","negativeZeroIndices":[0]}),
            rotate(bone, 16., 30., "linear"),
            rotate(bone, 32., 40., "linear"),
        ]
    });
    let before = snapshot(&session);
    let original = key_times(&before);
    let ids = keys(&before)[..3].iter().map(|key| key.id).collect::<Vec<_>>();
    let unchanged = edit(&session, scale(animation, &ids, 4., 16., 16.));
    assert_eq!(unchanged.revision, before.revision);
    assert_eq!(key_times(&unchanged), original);

    let after = edit(&session, scale(animation, &ids, 4., 16., 28.));
    assert_eq!(after.revision, before.revision + 1);
    assert_eq!(
        key_times(&after),
        [(ids[0], 4.), (ids[1], 16.), (ids[2], 28.), original[3]],
    );
    assert_eq!(keys(&after)[1].curve, "stepped");
    assert_eq!(keys(&after)[1].values[0].to_bits(), (-0.0_f32).to_bits());
    assert_eq!(
        serde_json::to_value(&after.bones).unwrap(),
        serde_json::to_value(&before.bones).unwrap(),
    );
    let undone = edit(&session, json!({"type":"undo"}));
    assert_eq!(key_times(&undone), original);
    assert_eq!(keys(&undone)[1].values[0].to_bits(), (-0.0_f32).to_bits());
    let redone = edit(&session, json!({"type":"redo"}));
    assert_eq!(key_times(&redone), key_times(&after));
}

#[test]
fn reversing_linear_key_times_keeps_values_and_ids_attached_to_each_key() {
    let (session, _, animation) = fixture(|bone| {
        [6., 12., 18., 30.]
            .into_iter()
            .map(|frame| rotate(bone, frame, frame * 2., "linear"))
            .collect()
    });
    let before = snapshot(&session);
    let original = key_times(&before);
    let ids = keys(&before)[..3].iter().map(|key| key.id).collect::<Vec<_>>();
    let changed = edit(&session, scale(animation, &ids, 6., 18., 0.));
    assert_eq!(
        key_times(&changed),
        [(ids[2], 0.), (ids[1], 3.), (ids[0], 6.), original[3]],
    );
    assert_eq!(
        keys(&changed).iter().map(|key| key.values[0]).collect::<Vec<_>>(),
        [36., 24., 12., 60.],
    );
    assert_eq!(key_times(&edit(&session, json!({"type":"undo"}))), original);
}

#[test]
fn timing_scale_rejects_collisions_stale_revisions_and_mixed_families_atomically() {
    let (session, bone, animation) = fixture(|bone| {
        [6., 12., 18., 30.]
            .into_iter()
            .map(|frame| rotate(bone, frame, frame, "linear"))
            .collect()
    });
    let slot = edit(&session, json!({"type":"createSlot","bone":bone,"name":"Artwork"}))
        .edited_slot
        .unwrap();
    let before = edit(&session, json!({
        "type":"setAnimationSlotKeys","animation":animation,
        "keys":[{"slot":slot,"channel":"rgba","frame":12,"values":[1,1,1,1],"curve":"linear"}],
    }));
    let ids = keys(&before)[..3].iter().map(|key| key.id).collect::<Vec<_>>();
    let slot_key = serde_json::to_value(&before).unwrap()["animations"][0]["slotTracks"][0]["keys"][0]["id"]
        .as_u64()
        .unwrap();
    let operation: RigEdit = serde_json::from_value(scale(animation, &ids, 6., 18., 24.)).unwrap();
    assert_eq!(session.edit(before.revision - 1, operation).unwrap_err().code, "ProjectChanged");
    let state = serde_json::to_value(&before).unwrap();
    for (command, message) in [
        (scale(animation, &ids, 6., 18., 30.), "collide"),
        (scale(animation, &ids, 6., 18., f32::from_bits(6.0_f32.to_bits() + 1)), "collide"),
        (scale(animation, &ids, 7., 18., 24.), "inside"),
        (scale(animation, &ids, 6., 18., 6.), "distinct"),
        (scale(animation, &[ids[0], slot_key], 6., 18., 24.), "bone keys only"),
    ] {
        let error = session.edit(before.revision, serde_json::from_value(command).unwrap()).unwrap_err();
        assert!(error.message.contains(message), "unexpected error: {error:?}");
        assert_eq!(serde_json::to_value(snapshot(&session)).unwrap(), state);
    }
}

#[test]
fn timing_scale_guards_affected_curves_even_if_their_own_key_was_not_selected() {
    let (session, _, animation) = fixture(|bone| {
        vec![
            json!({"bone":bone,"channel":"rotate","frame":0,"values":[4,0],"curve":"bezier","controls":[[2,5,10,11],[0,0,0,0]]}),
            rotate(bone, 12., 12., "linear"),
            rotate(bone, 18., 18., "linear"),
            rotate(bone, 24., 24., "stepped"),
            rotate(bone, 30., 30., "linear"),
        ]
    });
    let before = snapshot(&session);
    let ids = keys(&before).iter().map(|key| key.id).collect::<Vec<_>>();
    let state = serde_json::to_value(&before).unwrap();
    for (command, message) in [
        (scale(animation, &[ids[0], ids[1]], 0., 12., 14.), "Bézier"),
        (scale(animation, &[ids[2], ids[3]], 18., 24., 8.), "Bézier"),
        (scale(animation, &[ids[2], ids[3]], 18., 24., 15.), "linear affected"),
    ] {
        let error = session.edit(before.revision, serde_json::from_value(command).unwrap()).unwrap_err();
        assert!(error.message.contains(message), "unexpected error: {error:?}");
        assert_eq!(serde_json::to_value(snapshot(&session)).unwrap(), state);
    }
}
