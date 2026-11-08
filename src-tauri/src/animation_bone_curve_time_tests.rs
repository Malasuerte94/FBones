//! Small own model using the exact public timing counterexample from the gate.
use super::*;
use crate::{
    project::{open_document, Session},
    scene_edit::{SceneEdit, SceneHistory},
};
use fbones_format::minimal::scene::*;
fn fixture() -> SceneProject {
    let mut p = crate::scene_wire_fixture::project();
    p.animations[0].tracks = vec![BoneTimeline {
        bone: 1,
        channel: BoneChannel::Rotate,
        keys: vec![
            BoneKeyframe {
                frame: 348.,
                values: [10., 0.],
                curve: KeyCurve::Bezier {
                    controls: [
                        [
                            f32::from_bits(0x43b0bbcd),
                            12.,
                            f32::from_bits(0x43af8b12),
                            18.,
                        ],
                        [0.; 4],
                    ],
                },
            },
            BoneKeyframe {
                frame: 353.,
                values: [20., 0.],
                curve: KeyCurve::Linear,
            },
        ],
    }];
    let layouts = (0..p.animations.len())
        .map(|a| animation_layout(&p, a).unwrap())
        .collect();
    p.wire.as_mut().unwrap().animation_layouts = layouts;
    normalize_wire_track_order(&mut p).unwrap();
    p
}
#[test]
fn native_monotone_overshooting_bone_time_keeps_raw_controls_history_and_saved_payload() {
    let original = fixture();
    let bytes = encode_scene_payload(&original).unwrap();
    assert_eq!(decode_scene(&bytes).unwrap(), original);
    let mut history = SceneHistory::new(original.clone(), true).unwrap();
    let clip = history.frame().animation_ids[0];
    let bone = history.frame().bone_ids[1];
    let key_id = history.frame().animation_key_ids[0][0][0];
    let edit = |outgoing: f32, value: f32| RigEdit::SetAnimationKey {
        animation: clip,
        key: KeyInput {
            key_id: Some(key_id),
            bone,
            channel: ChannelInput::Rotate,
            frame: 348.,
            values: [10., 0.],
            curve: CurveInput::Bezier,
            controls: Some([[outgoing, value, f32::from_bits(0x43af8b12), 18.], [0.; 4]]),
        },
    };
    history
        .apply(SceneEdit::Animation(edit(f32::from_bits(0x43b0bbcd), 13.)))
        .unwrap();
    let expected = history.frame().project.clone();
    let KeyCurve::Bezier { controls } = expected.animations[0].tracks[0].keys[0].curve else {
        panic!("Bezier retained")
    };
    assert_eq!(controls[0][0].to_bits(), 0x43b0bbcd);
    assert_eq!(controls[0][2].to_bits(), 0x43af8b12);
    assert_eq!(controls[1].map(f32::to_bits), [0; 4]);
    assert_eq!(history.frame().animation_key_ids[0][0][0], key_id);
    assert!(history
        .apply(SceneEdit::Animation(edit(600., 13.)))
        .is_err());
    assert_eq!(history.frame().project, expected);
    history.apply(SceneEdit::Undo).unwrap();
    assert_eq!(history.frame().project, original);
    history.apply(SceneEdit::Redo).unwrap();
    assert_eq!(history.frame().project, expected);
    let directory = tempfile::tempdir().unwrap();
    let source = directory.path().join("own-monotone.spine");
    std::fs::write(&source, encode_scene(&expected).unwrap()).unwrap();
    let session = Session::default();
    session
        .replace(open_document(source).unwrap(), false)
        .unwrap();
    let path = directory.path().join("saved-monotone.fbones");
    session
        .save_snapshot(session.prepare_save(false).unwrap(), path.clone())
        .unwrap();
    let envelope = fbones_format::ProjectEnvelope::inspect(std::fs::read(path).unwrap()).unwrap();
    let payload = envelope.decoded_payload().unwrap();
    let reopened = decode_scene(&payload).unwrap();
    assert_eq!(reopened.animations, expected.animations);
    assert_eq!(reopened.slots, expected.slots);
    assert_eq!(reopened.rig, expected.rig);
    let mut exact = expected;
    exact.images_root = "./images/".into();
    normalize_wire_strings(&mut exact).unwrap();
    assert_eq!(reopened, exact);
    assert_eq!(encode_scene_payload(&exact).unwrap(), payload);
}
