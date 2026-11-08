//! Own mode1/X-only source. Loading/sampling/saving must not manufacture Y.
use fbones_format::minimal::scene::*;
pub(crate) fn project() -> SceneProject {
    let mut project = crate::scene_split_fixture::project();
    project.rig.name = "Own partial Translate source".into();
    project.rig.bones[1].y = 17.25;
    project.animations[0]
        .tracks
        .retain(|track| !(track.bone == 1 && track.channel == BoneChannel::TranslateY));
    let layout = &mut project.wire.as_mut().unwrap().animation_layouts[0];
    for group in &mut layout.groups {
        group.tracks.retain(|track| {
            *track
                != WireTrack::Bone {
                    bone: 1,
                    channel: BoneChannel::TranslateY,
                }
        });
    }
    normalize_wire_track_order(&mut project).unwrap();
    normalize_wire_strings(&mut project).unwrap();
    project
}
