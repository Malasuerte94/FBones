//! Independently authored Sequence fixture, absent from ordinary builds.
use fbones_format::minimal::scene::*;
fn address(slot: usize) -> AttachmentAddress {
    AttachmentAddress {
        slot,
        attachment: 0,
    }
}
fn key(frame: f32, mode: SequenceMode, index: u32, delay: f32) -> SequenceKeyframe {
    SequenceKeyframe {
        frame,
        mode,
        index,
        delay: FiniteF32::new(delay).unwrap(),
    }
}
pub(crate) fn project() -> SceneProject {
    let mut p = crate::scene_wire_fixture::project();
    p.fps = 24.;
    p.attachment_sequences = vec![
        AttachmentSequence {
            attachment: address(0),
            settings: SequenceSettings {
                start: 7,
                count: 3,
                digits: 1,
                setup_index: 1,
            },
        },
        AttachmentSequence {
            attachment: address(1),
            settings: SequenceSettings {
                start: 12,
                count: 4,
                digits: 3,
                setup_index: 1,
            },
        },
    ];
    p.animations[0].sequence_tracks = vec![
        SequenceTimeline {
            attachment: address(0),
            keys: vec![
                key(2., SequenceMode::Loop, 1, 0.125),
                key(20., SequenceMode::Hold, 2, 0.0625),
            ],
        },
        SequenceTimeline {
            attachment: address(1),
            keys: vec![key(4., SequenceMode::Once, 0, 0.0625)],
        },
    ];
    let mut constraint = TransformConstraint::new("Own Sequence follow".into(), vec![2], 1);
    constraint.local_source = true;
    constraint.local_target = true;
    p.constraints.push(Constraint::Transform(constraint));
    p.events.push(EventDefinition {
        name: "Own Sequence cue".into(),
        int: 0,
        float: 0.,
        string: String::new(),
        audio: String::new(),
        volume: 0.,
        balance: 0.,
    });
    p.animations[0].event_tracks.push(EventTimeline {
        event: 0,
        keys: vec![EventKeyframe {
            frame: 8.,
            int: 4,
            float: 0.5,
            string: "own".into(),
            volume: 0.75,
            balance: -0.25,
        }],
    });
    p.animations[0]
        .constraint_tracks
        .push(ConstraintTimeline::TransformMix {
            constraint: 0,
            keys: vec![TransformMixKeyframe {
                frame: 8.,
                values: [0.25; 6],
                curve: TransformMixCurve::Linear,
            }],
        });
    p.animations[0].draw_order.push(DrawOrderKey {
        frame: 8.,
        offsets: vec![],
    });
    p.animations[0].deform_tracks.push(DeformTimeline {
        attachment: address(1),
        keys: vec![DeformKey {
            frame: 8.,
            offsets: vec![0.; 8],
            data_present: true,
            curve: DeformCurve::Linear,
        }],
    });
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
    normalize_attachment_sequences(&mut p).unwrap();
    p
}
