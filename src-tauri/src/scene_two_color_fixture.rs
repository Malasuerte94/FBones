//! Own generated two-color source, compiled only for tests and the opt-in host.
use fbones_format::minimal::scene::*;
pub(crate) fn project() -> SceneProject {
    let mut p = crate::scene_sequence_fixture::project();
    p.rig.name = "Own two-color source".into();
    p.slot_dark_colors = vec![
        SlotDarkColor {
            slot: 0,
            enabled: true,
            color: [32, 64, 96, 255],
        },
        SlotDarkColor {
            slot: 1,
            enabled: true,
            color: [0, 0, 0, 255],
        },
    ];
    p.animations[0].slot_tracks.push(SlotTimeline::Rgba {
        slot: 0,
        keys: vec![
            SlotRgbaKey {
                frame: 6.,
                values: [1., 0.5, 0.25, 0.75],
                dark_values: [0.2, 0.4, 0.6],
                curve: SlotRgbaCurve::Linear,
            },
            SlotRgbaKey {
                frame: 18.,
                values: [0.5, 1., 0.75, 0.25],
                dark_values: [0.8, 0.6, 0.2],
                curve: SlotRgbaCurve::Linear,
            },
        ],
    });
    if let Some(SlotTimeline::Rgba { keys, .. }) = p.animations[0]
        .slot_tracks
        .iter_mut()
        .find(|track| matches!(track, SlotTimeline::Rgba { slot: 1, .. }))
    {
        keys[0].dark_values = [0.1, 0.2, 0.3];
        keys.push(SlotRgbaKey {
            frame: 18.,
            values: [0.75, 0.5, 1., 0.5],
            dark_values: [0.6, 0.8, 0.2],
            curve: SlotRgbaCurve::Linear,
        });
    }
    normalize_slot_dark_colors(&mut p).unwrap();
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
