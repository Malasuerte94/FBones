//! Own bounded complete split pairs; no conversion/empty-axis authoring implied.
use fbones_format::minimal::scene::*;
fn key(frame: f32, value: f32, curve: KeyCurve) -> BoneKeyframe {
    BoneKeyframe {
        frame,
        values: [value, 0.],
        curve,
    }
}
pub(crate) fn project() -> SceneProject {
    let mut p = crate::scene_sequence_fixture::project();
    p.rig.name = "Own split-axis source".into();
    p.animations[0]
        .tracks
        .retain(|t| !(t.bone == 1 && t.channel == BoneChannel::Translate));
    p.animations[0].split_modes = vec![
        BoneSplitConfig {
            bone: 2,
            mode: BoneSplitMode::Scale,
        },
        BoneSplitConfig {
            bone: 1,
            mode: BoneSplitMode::Translate,
        },
    ];
    p.animations[0].tracks.extend([
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::TranslateX,
            keys: vec![
                key(
                    -0.,
                    -0.,
                    KeyCurve::Bezier {
                        controls: [[4., -0., 8., 6.], [0.; 4]],
                    },
                ),
                key(12., 6., KeyCurve::Linear),
                key(24., -4., KeyCurve::Linear),
            ],
        },
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::TranslateY,
            keys: vec![
                key(4., -3., KeyCurve::Stepped),
                key(20., 7., KeyCurve::Linear),
            ],
        },
        BoneTimeline {
            bone: 2,
            channel: BoneChannel::ScaleX,
            keys: vec![
                key(2., 0.5, KeyCurve::Linear),
                key(10., 1.5, KeyCurve::Linear),
            ],
        },
        BoneTimeline {
            bone: 2,
            channel: BoneChannel::ScaleY,
            keys: vec![
                key(
                    6.,
                    2.,
                    KeyCurve::Bezier {
                        controls: [[10., 1.75, 14., 1.], [0.; 4]],
                    },
                ),
                key(18., 0.75, KeyCurve::Linear),
            ],
        },
    ]);
    let mut layouts = (0..p.animations.len())
        .map(|a| animation_layout(&p, a).unwrap())
        .collect::<Vec<_>>();
    layouts[0].groups.reverse();
    for group in &mut layouts[0].groups {
        group.tracks.reverse();
    }
    p.wire.as_mut().unwrap().animation_layouts = layouts;
    normalize_wire_track_order(&mut p).unwrap();
    normalize_wire_strings(&mut p).unwrap();
    p
}
