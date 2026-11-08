//! Total animation budgets differ from per-clip and per-command work budgets.
use super::*;
use crate::{
    animation::{ChannelInput, CurveInput, KeyInput},
    rig::RigEdit,
};
use fbones_format::{minimal::scene::*, ProjectEnvelope};
fn model(session: &Session) -> SceneProject {
    let state = session.lock().unwrap();
    let Some(Document::Editable { project, .. }) = &state.document else {
        panic!("own editable source")
    };
    (**project).clone()
}
fn own_project() -> SceneProject {
    let mut project = crate::scene_wire_fixture::project();
    project.wire = None;
    project.slots.clear();
    project.attachment_order.clear();
    project.attachment_sequences.clear();
    project.attachment_colors.clear();
    project.slot_dark_colors.clear();
    project.constraints.clear();
    project.events.clear();
    assert_eq!(project.rig.bones.len(), 3);
    project.animations = (0..45)
        .map(|clip| {
            let mut animation = Animation::new(format!("Own bounded clip {clip}"));
            for bone in 0..3 {
                for channel in [
                    BoneChannel::Rotate,
                    BoneChannel::Translate,
                    BoneChannel::Scale,
                    BoneChannel::Shear,
                ] {
                    animation.tracks.push(BoneTimeline {
                        bone,
                        channel,
                        keys: (0..5)
                            .map(|frame| BoneKeyframe {
                                frame: frame as f32,
                                values: [frame as f32, 0.],
                                curve: KeyCurve::Linear,
                            })
                            .collect(),
                    });
                }
            }
            animation
        })
        .collect();
    project
}
#[test]
fn native_multiclip_above_old_global_bone_track_limit_edits_but_oversized_clip_rejects_atomically()
{
    let directory = tempfile::tempdir().unwrap();
    let original = own_project();
    assert_eq!(
        original
            .animations
            .iter()
            .map(|a| a.tracks.len())
            .sum::<usize>(),
        540
    );
    assert_eq!(
        original
            .animations
            .iter()
            .flat_map(|a| &a.tracks)
            .map(|t| t.keys.len())
            .sum::<usize>(),
        2700
    );
    assert!(original.animations.iter().all(|a| a.tracks.len() == 12));
    let payload = encode_scene_payload(&original).unwrap();
    assert_eq!(
        encode_scene_payload(&decode_scene(&payload).unwrap()).unwrap(),
        payload
    );
    let source = directory.path().join("own-multiclip.spine");
    std::fs::write(&source, encode_scene(&original).unwrap()).unwrap();
    let session = Session::default();
    let initial = session
        .replace(open_document(source).unwrap(), false)
        .unwrap();
    assert!(!initial.inspection_only);
    let animation = initial.animations[0].id;
    let bone = initial.bones[0].id;
    let key = initial.animations[0].tracks[0].keys[3].id;
    let edited = session
        .edit(
            initial.revision,
            RigEdit::SetAnimationKey {
                animation,
                key: KeyInput {
                    key_id: Some(key),
                    bone,
                    channel: ChannelInput::Rotate,
                    frame: 3.,
                    values: [17., 0.],
                    curve: CurveInput::Linear,
                    controls: None,
                },
            },
        )
        .unwrap();
    let mut expected = original.clone();
    expected.animations[0].tracks[0].keys[3].values[0] = 17.;
    let edited_payload = encode_scene_payload(&expected).unwrap();
    assert_eq!(
        encode_scene_payload(&model(&session)).unwrap(),
        edited_payload
    );
    assert_eq!(edited.animations[0].tracks[0].keys[3].id, key);
    let stable = serde_json::to_value(&edited).unwrap();
    // A legal command-sized4,096-key family request would leave4,151keys in
    // this clip. The complete candidate must reject under the unchanged4,096
    // clip limit, even though its total6,791keys fit the new global limit.
    let oversized = (0..4096)
        .map(|frame| KeyInput {
            key_id: None,
            bone,
            channel: ChannelInput::Rotate,
            frame: frame as f32,
            values: [11., 0.],
            curve: CurveInput::Linear,
            controls: None,
        })
        .collect();
    assert!(session
        .edit(
            edited.revision,
            RigEdit::SetAnimationKeys {
                animation,
                keys: oversized
            }
        )
        .is_err());
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        stable
    );
    assert_eq!(
        encode_scene_payload(&model(&session)).unwrap(),
        edited_payload
    );
    let undone = session.edit(edited.revision, RigEdit::Undo).unwrap();
    assert!(!undone.can_undo);
    assert_eq!(encode_scene_payload(&model(&session)).unwrap(), payload);
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(redone.animations[0].tracks[0].keys[3].id, key);
    assert_eq!(
        encode_scene_payload(&model(&session)).unwrap(),
        edited_payload
    );
    let target = directory.path().join("saved-multiclip.fbones");
    session
        .save_snapshot(session.prepare_save(false).unwrap(), target.clone())
        .unwrap();
    let saved = ProjectEnvelope::inspect(std::fs::read(&target).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    expected.images_root = "./images/".into();
    assert_eq!(saved, encode_scene_payload(&expected).unwrap());
    session.close(false).unwrap();
    let reopened = session
        .replace(open_document(target).unwrap(), false)
        .unwrap();
    assert!(!reopened.inspection_only && !reopened.dirty);
    assert_eq!(encode_scene_payload(&model(&session)).unwrap(), saved);
}
