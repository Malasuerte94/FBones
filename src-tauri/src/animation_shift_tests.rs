use crate::{
    project::AppError,
    scene_edit::{SceneEdit, SceneFrame, SceneHistory},
};
use fbones_format::minimal::scene::*;
use serde_json::{json, Value};

fn fixture() -> SceneHistory {
    let mut project = crate::scene_sequence_fixture::project();
    let clip = &mut project.animations[0];
    let key = |frame, values| BoneKeyframe {
        frame,
        values,
        curve: KeyCurve::Linear,
    };
    let mut translate = vec![
        key(0., [11., -0.]),
        key(9., [22., 0.]),
        key(18., [33., 0.]),
        key(27., [44., 0.]),
    ];
    translate[0].curve = KeyCurve::Bezier {
        controls: [[-0., -0., 6., 19.], [-0., -0., 6., 0.]],
    };
    translate[1].curve = KeyCurve::Bezier {
        controls: [[10.5, 25., 16.5, 30.], [10.5, 0., 16.5, 0.]],
    };
    let mut rotate = vec![key(0., [7., 0.]), key(12., [19., 0.]), key(21., [31., 0.])];
    rotate[0].curve = KeyCurve::Bezier {
        controls: [[-0., 7., 7., 12.], [0.; 4]],
    };
    clip.tracks = vec![
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::Translate,
            keys: translate,
        },
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::Rotate,
            keys: rotate,
        },
        BoneTimeline {
            bone: 2,
            channel: BoneChannel::Translate,
            keys: vec![
                key(0., [100., 0.]),
                key(15., [120., 0.]),
                key(24., [140., 0.]),
            ],
        },
    ];
    let template = clip.event_tracks[0].keys[0].clone();
    clip.event_tracks[0].keys = [(6., 60), (18., 180), (27., 270)]
        .into_iter()
        .map(|(frame, int)| EventKeyframe {
            frame,
            int,
            ..template.clone()
        })
        .collect();
    project.wire.as_mut().unwrap().animation_layouts = (0..project.animations.len())
        .map(|index| animation_layout(&project, index).unwrap())
        .collect();
    normalize_wire_track_order(&mut project).unwrap();
    normalize_wire_strings(&mut project).unwrap();
    SceneHistory::new(project, true).unwrap()
}

fn track(frame: &SceneFrame, bone: usize, channel: BoneChannel) -> usize {
    frame.project.animations[0]
        .tracks
        .iter()
        .position(|track| track.bone == bone && track.channel == channel)
        .unwrap()
}

fn edit(history: &mut SceneHistory, value: Value) -> Result<bool, AppError> {
    history.apply(SceneEdit::Animation(serde_json::from_value(value).unwrap()))
}

fn frames(track: &BoneTimeline) -> Vec<f32> {
    track.keys.iter().map(|key| key.frame).collect()
}

#[test]
fn shift_uses_earliest_selected_key_per_property_and_preserves_unrelated_bits() {
    let mut history = fixture();
    let before = history.frame().clone();
    let animation = before.animation_ids[0];
    let translate = track(&before, 1, BoneChannel::Translate);
    let rotate = track(&before, 1, BoneChannel::Rotate);
    let other_bone = track(&before, 2, BoneChannel::Translate);
    let ids = &before.animation_key_ids[0][translate];
    let event = before.animation_event_key_ids[0][0][1];
    assert!(edit(&mut history, json!({"type":"moveAnimationKeys","animation":animation,"keys":[ids[3],event,ids[1]],"deltaFrames":3,"shift":true})).unwrap());

    let changed = history.frame().clone();
    let after = &changed.project.animations[0];
    let original = &before.project.animations[0];
    assert_eq!(frames(&after.tracks[translate]), [0., 12., 21., 30.]);
    assert_eq!(after.tracks[rotate], original.tracks[rotate]);
    assert_eq!(after.tracks[other_bone], original.tracks[other_bone]);
    assert_eq!(after.slot_tracks, original.slot_tracks);
    assert_eq!(after.constraint_tracks, original.constraint_tracks);
    assert_eq!(after.draw_order, original.draw_order);
    assert_eq!(after.deform_tracks, original.deform_tracks);
    assert_eq!(after.sequence_tracks, original.sequence_tracks);

    let before_keys = &original.tracks[translate].keys;
    let actual = &after.tracks[translate].keys;
    assert_eq!(
        actual[0].curve,
        KeyCurve::Bezier {
            controls: [[-0., -0., 9., 19.], [-0., -0., 9., 0.]]
        }
    );
    assert_eq!(
        actual[1].curve,
        KeyCurve::Bezier {
            controls: [[13.5, 25., 19.5, 30.], [13.5, 0., 19.5, 0.]]
        }
    );
    for (old, new) in before_keys.iter().zip(actual) {
        assert_eq!(old.values.map(f32::to_bits), new.values.map(f32::to_bits));
    }
    let mut events = original.event_tracks.clone();
    events[0].keys[1].frame = 21.;
    events[0].keys[2].frame = 30.;
    assert_eq!(after.event_tracks, events);
    assert_eq!(changed.animation_key_ids, before.animation_key_ids);
    assert_eq!(
        changed.animation_event_key_ids,
        before.animation_event_key_ids
    );
    assert_eq!(changed.project.rig, before.project.rig);
    assert_eq!(changed.project.animations[1], before.project.animations[1]);

    assert!(history.apply(SceneEdit::Undo).unwrap());
    assert_eq!(history.frame().project, before.project);
    assert!(!history.can_undo());
    assert!(history.apply(SceneEdit::Redo).unwrap());
    assert_eq!(history.frame().project, changed.project);
    assert_eq!(history.frame().animation_key_ids, changed.animation_key_ids);
}

#[test]
fn shift_collision_rejects_the_batch_and_existing_move_keeps_its_scope() {
    let mut history = fixture();
    let before = history.frame().clone();
    let animation = before.animation_ids[0];
    let translate = track(&before, 1, BoneChannel::Translate);
    let pivot = before.animation_key_ids[0][translate][1];
    let event = before.animation_event_key_ids[0][0][1];
    let failure = edit(&mut history, json!({"type":"moveAnimationKeys","animation":animation,"keys":[pivot,event],"deltaFrames":-9,"shift":true})).unwrap_err();
    assert!(failure.message.contains("collide"));
    assert_eq!(history.frame().project, before.project);
    assert!(!history.can_undo());

    assert!(edit(
        &mut history,
        json!({"type":"moveAnimationKeys","animation":animation,"keys":[pivot],"deltaFrames":3})
    )
    .unwrap());
    let clip = &history.frame().project.animations[0];
    assert_eq!(frames(&clip.tracks[translate]), [0., 12., 18., 27.]);
    assert_eq!(clip.event_tracks, before.project.animations[0].event_tracks);
}
