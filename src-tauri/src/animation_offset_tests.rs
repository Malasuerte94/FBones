use crate::{
    project::AppError,
    scene_edit::{SceneEdit, SceneHistory},
};
use fbones_format::minimal::scene::*;
use serde_json::{json, Value};

fn fixture() -> SceneProject {
    let mut project = crate::scene_sequence_fixture::project();
    project.fps = 30.;
    let key = |frame, values| BoneKeyframe {
        frame,
        values,
        curve: KeyCurve::Linear,
    };
    let mut rotate = vec![
        key(0., [10., 0.]),
        key(6., [30., 0.]),
        key(15., [70., 0.]),
        key(24., [40., 0.]),
        key(30., [10., 0.]),
    ];
    rotate[2].curve = KeyCurve::Bezier {
        controls: [[18., 97., 21., 72.], [0.; 4]],
    };
    project.animations[0].tracks = vec![
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::Rotate,
            keys: rotate,
        },
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::Translate,
            keys: vec![
                key(0., [-0., 0.]),
                key(12., [120., -0.]),
                key(30., [-0., 0.]),
            ],
        },
    ];
    project.wire.as_mut().unwrap().animation_layouts = (0..project.animations.len())
        .map(|a| animation_layout(&project, a).unwrap())
        .collect();
    normalize_wire_track_order(&mut project).unwrap();
    normalize_wire_strings(&mut project).unwrap();
    project
}

fn edit(history: &mut SceneHistory, value: Value) -> Result<bool, AppError> {
    history.apply(SceneEdit::Animation(serde_json::from_value(value).unwrap()))
}

fn offset(
    history: &mut SceneHistory,
    animation: u64,
    key: u64,
    delta: f32,
    continuing: bool,
) -> Result<bool, AppError> {
    edit(
        history,
        json!({"type":"offsetAnimationKeys","animation":animation,"key":key,"deltaFrames":delta,"continueOffset":continuing}),
    )
}

fn near(actual: f32, expected: f32) {
    assert!(
        (actual - expected).abs() <= 0.0001,
        "{actual} != {expected}"
    );
}

#[test]
fn nonlinear_time_splits_match_the_measured_phases_and_segment_durations() {
    let right = BoneKeyframe {
        frame: 24.,
        values: [40., 0.],
        curve: KeyCurve::Linear,
    };
    for (frames, cut, expected, leading, trailing) in [
        (
            [15., 15.9, 22.8],
            21.,
            69.70308,
            [0.8192, 87.28, 0.92032, 83.225],
            [0.04657599, 62.097, 0.08560002, 51.52],
        ),
        (
            [15., 15.9, 22.8],
            20.,
            74.55936,
            [0.8499333, 84.94, 0.9277688, 83.83803],
            [0.05969289, 67.06936, 0.1154667, 54.29333],
        ),
        (
            [15., 15.9, 22.8],
            18.,
            80.54234,
            [0.9115, 80.35, 0.9523889, 82.93977],
            [0.0784139, 76.6856, 0.17533328, 59.73333],
        ),
        (
            [12., 13.2, 22.4],
            20.,
            69.70307,
            [0.7589333, 87.28, 0.89376, 83.225],
            [0.06210136, 62.09699, 0.11413333, 51.52],
        ),
    ] {
        let left = BoneKeyframe {
            frame: frames[0],
            values: [70., 0.],
            curve: KeyCurve::Bezier {
                controls: [[frames[1], 97., frames[2], 72.], [0.; 4]],
            },
        };
        let (value, first, second) =
            super::split_segment(&left, &right, 1, cut, 30. - cut, 0.).unwrap();
        near(value[0], expected);
        for (curve, exported) in [(first, leading), (second, trailing)] {
            let KeyCurve::Bezier { controls } = curve else {
                panic!("expected a split Bézier")
            };
            for (index, reference) in exported.into_iter().enumerate() {
                let expected = if index % 2 == 0 {
                    reference * 30.
                } else {
                    reference
                };
                near(controls[0][index], expected);
            }
        }
    }
}

fn compare_row(
    keys: &[BoneKeyframe],
    frames: [f32; 6],
    values: [f32; 6],
    seam_out: [f32; 4],
    seam_in: [f32; 4],
) {
    assert_eq!(keys.len(), frames.len());
    for ((key, frame), expected) in keys.iter().zip(frames).zip(values) {
        assert_eq!(key.frame, frame);
        near(key.values[0], expected);
        assert_eq!(key.values[1].to_bits(), 0);
    }
    for (index, expected) in [(0, seam_out), (4, seam_in)] {
        let KeyCurve::Bezier { controls } = keys[index].curve else {
            panic!("expected split curve")
        };
        for (value, reference) in controls[0].into_iter().zip(expected) {
            near(value, reference);
        }
        assert_eq!(controls[1].map(f32::to_bits), [0; 4]);
    }
}

#[test]
fn reads_both_measured_seams_without_accumulating_boundary_keys() {
    let project = fixture();
    let mut history = SceneHistory::new(project.clone(), true).unwrap();
    let before = history.frame().clone();
    let animation = before.animation_ids[0];
    let ids = &before.animation_key_ids[0][0];
    let anchor = ids[2];
    assert!(offset(&mut history, animation, anchor, 9., false).unwrap());
    let first = history.frame().clone();
    compare_row(
        &first.project.animations[0].tracks[0].keys,
        [0., 3., 9., 15., 24., 30.],
        [67.84998, 40., 10., 30., 70., 67.84998],
        [1., 60.40554, 2., 50.66666],
        [26., 88., 28., 82.73888],
    );
    let first_ids = &first.animation_key_ids[0][0];
    assert_eq!(&first_ids[1..5], &[ids[3], ids[0], ids[1], anchor]);
    assert!(!ids.contains(&first_ids[0]));
    assert!(!ids.contains(&first_ids[5]));

    history.mark_saved();
    assert!(!history.dirty());
    for action in ["storeAnimationKeys", "clearStoredAnimationKeys"] {
        assert!(!edit(&mut history, json!({"type":action,"animation":animation})).unwrap());
    }
    assert!(offset(&mut history, animation, anchor, 3., true).unwrap());
    let second = history.frame().clone();
    compare_row(
        &second.project.animations[0].tracks[0].keys,
        [0., 6., 12., 18., 27., 30.],
        [81.09, 40., 10., 30., 70., 81.09],
        [2., 79.31222, 4., 61.33333],
        [28., 79., 29., 81.9789],
    );
    assert_eq!(&second.animation_key_ids[0][0], first_ids);
    assert_eq!(second.project.rig, project.rig);
    assert_eq!(second.project.animations[1], project.animations[1]);
    assert_eq!(
        second.project.animations[0].tracks[1],
        project.animations[0].tracks[1]
    );
    assert_eq!(
        second.project.animations[0].event_tracks,
        project.animations[0].event_tracks
    );
    let encoded = encode_scene_payload(&second.project).unwrap();
    assert_eq!(decode_scene(&encoded).unwrap(), second.project);

    assert!(history.apply(SceneEdit::Undo).unwrap());
    assert_eq!(history.frame().project, first.project);
    assert!(!history.dirty());
    assert!(offset(&mut history, animation, anchor, 2., true).is_err());
    assert_eq!(history.frame().project, first.project);
    assert!(history.apply(SceneEdit::Redo).unwrap());
    assert_eq!(history.frame().project, second.project);
}

#[test]
fn exact_cut_retains_the_source_key_and_full_period_restores_the_basis() {
    let mut history = SceneHistory::new(fixture(), true).unwrap();
    let original = history.frame().clone();
    let animation = original.animation_ids[0];
    let ids = &original.animation_key_ids[0][0];
    let anchor = ids[4];
    assert!(!offset(&mut history, animation, anchor, 30., false).unwrap());
    assert!(!history.can_undo());
    assert!(offset(&mut history, animation, anchor, 6., false).unwrap());
    let after = history.frame();
    assert_eq!(
        &after.animation_key_ids[0][0][..4],
        &[ids[3], anchor, ids[1], ids[2]]
    );
    let row = &after.project.animations[0].tracks[0].keys;
    assert_eq!(
        row.iter().map(|key| key.frame).collect::<Vec<_>>(),
        [0., 6., 12., 21., 30.]
    );
    assert_eq!(row[0].values, [40., 0.]);
    assert_eq!(row[4].values, row[0].values);
    assert_eq!(
        row[3].curve,
        KeyCurve::Bezier {
            controls: [[24., 97., 27., 72.], [0.; 4]]
        }
    );

    assert!(offset(&mut history, animation, anchor, 24., true).unwrap());
    assert_eq!(history.frame().project, original.project);
    assert_eq!(
        history.frame().animation_key_ids,
        original.animation_key_ids
    );
    assert!(!history.dirty());
}

#[test]
fn continuation_requires_same_key_and_no_intervening_authored_change() {
    let mut history = SceneHistory::new(fixture(), true).unwrap();
    let original = history.frame().clone();
    let animation = original.animation_ids[0];
    let anchor = original.animation_key_ids[0][0][2];
    let other = original.animation_key_ids[0][0][1];
    assert!(offset(&mut history, animation, anchor, -3., false).unwrap());
    let after = history.frame().clone();
    assert!(offset(&mut history, animation, other, 2., true).is_err());
    assert_eq!(history.frame().project, after.project);
    let name = "Own changed animation";
    assert!(edit(
        &mut history,
        json!({"type":"renameAnimation","id":animation,"name":name})
    )
    .unwrap());
    assert!(offset(&mut history, animation, anchor, 2., true).is_err());
    assert_eq!(history.frame().project.animations[0].name, name);
    let ids = &original.animation_slot_key_ids[0][0];
    assert!(offset(&mut history, animation, ids[0], 2., false).is_err());
}

fn explicit_loop_fixture(exterior_near_x: [f32; 2]) -> SceneProject {
    let mut project = fixture();
    let key = |frame, value, curve| BoneKeyframe {
        frame,
        values: [value, 0.],
        curve,
    };
    let bezier = |axis| KeyCurve::Bezier {
        controls: [axis, [0.; 4]],
    };
    let tracks = &mut project.animations[0].tracks;
    tracks[0].keys = vec![
        key(0., -34., bezier([2., -20., exterior_near_x[0], -2.])),
        key(6., 10., KeyCurve::Linear),
        key(12., 40., bezier([15., 97., 18., 72.])),
        key(21., 70., KeyCurve::Linear),
        key(24., 10., bezier([exterior_near_x[1], 33., 28., 75.])),
        key(30., 101., KeyCurve::Linear),
    ];
    for (key, value) in tracks[1].keys.iter_mut().zip([7., 23., 7.]) {
        key.values[0] = value;
    }
    project
}

fn offset_loop(
    history: &mut SceneHistory,
    animation: u64,
    key: u64,
    delta: f32,
    continuing: bool,
    [start, end]: [f32; 2],
) -> Result<bool, AppError> {
    edit(
        history,
        json!({
            "type": "offsetAnimationKeys",
            "animation": animation,
            "key": key,
            "deltaFrames": delta,
            "continueOffset": continuing,
            "loopRange": {"start": start, "end": end}
        }),
    )
}

#[test]
fn explicit_loop_replays_both_stock_exterior_handle_inputs_and_restores_the_basis() {
    const LOOP: [f32; 2] = [6., 24.];
    let mut first_output = None;
    for exterior_near_x in [[4., 26.], [5., 27.]] {
        let mut history = SceneHistory::new(explicit_loop_fixture(exterior_near_x), true).unwrap();
        let before = history.frame().clone();
        let before_bytes = encode_scene_payload(&before.project).unwrap();
        let animation = before.animation_ids[0];
        let ids = &before.animation_key_ids[0][0];
        let anchor = ids[3];
        assert!(!offset_loop(&mut history, animation, anchor, 18., false, LOOP).unwrap());
        for outside in [ids[0], ids[1], ids[4]] {
            assert!(offset_loop(&mut history, animation, outside, 6., false, LOOP).is_err());
        }
        assert!(!history.can_undo());
        assert!(offset_loop(&mut history, animation, anchor, 6., false, LOOP).unwrap());
        assert!(history.dirty());

        let after = history.frame().clone();
        let keys = &after.project.animations[0].tracks[0].keys;
        let expected_frames = [0., 6., 9., 12., 18., 24., 30.];
        let expected_values = [-34., 75.69, 70., 10., 40., 75.69, 101.];
        assert_eq!(keys.len(), expected_frames.len());
        for ((key, frame), value) in keys.iter().zip(expected_frames).zip(expected_values) {
            assert_eq!(key.frame, frame);
            assert!((key.values[0] - value).abs() <= 0.00005);
            assert_eq!(key.values[1].to_bits(), 0);
        }
        assert_eq!(
            keys[1].values.map(f32::to_bits),
            keys[5].values.map(f32::to_bits)
        );
        let expected_controls: [(usize, [f32; 4]); 4] = [
            (0, [2., -20., 4., 79.46777]),
            (1, [7., 73.80112, 8., 70.66666]),
            (4, [20., 78., 22., 79.46778]),
            (5, [26., 71.91222, 28., 75.]),
        ];
        for (index, expected) in expected_controls {
            let KeyCurve::Bezier { controls } = keys[index].curve else {
                panic!(
                    "missing explicit Offset Bézier at frame {}",
                    keys[index].frame
                );
            };
            for (field, (actual, expected)) in controls[0].into_iter().zip(expected).enumerate() {
                let far_exterior_ordinate =
                    (index == 0 && field == 1) || (index == 5 && field == 3);
                if field % 2 == 0 || far_exterior_ordinate {
                    assert_eq!(actual.to_bits(), expected.to_bits());
                } else {
                    assert!(
                        (actual - expected).abs() <= 0.00005,
                        "{actual} != {expected}"
                    );
                }
            }
            assert_eq!(controls[1].map(f32::to_bits), [0; 4]);
        }
        let before_keys = &before.project.animations[0].tracks[0].keys;
        assert_eq!(keys[6], before_keys[5]);
        assert_eq!(keys[2].curve, before_keys[3].curve);
        assert_eq!(keys[3].curve, before_keys[1].curve);
        let after_ids = &after.animation_key_ids[0][0];
        assert_eq!(
            [after_ids[0], after_ids[2], after_ids[4], after_ids[6]],
            [ids[0], anchor, ids[2], ids[5]]
        );
        assert!(after_ids[3] == ids[1] || after_ids[3] == ids[4]);
        assert!(!ids.contains(&after_ids[1]));
        assert!(!ids.contains(&after_ids[5]));
        assert_ne!(after_ids[1], after_ids[5]);
        assert_eq!(
            after.animation_key_ids[0][1],
            before.animation_key_ids[0][1]
        );

        let mut with_source_row = after.project.clone();
        with_source_row.animations[0].tracks[0] = before.project.animations[0].tracks[0].clone();
        assert_eq!(
            encode_scene_payload(&with_source_row).unwrap(),
            before_bytes
        );
        let after_bytes = encode_scene_payload(&after.project).unwrap();
        assert_eq!(decode_scene(&after_bytes).unwrap(), after.project);
        if let Some(baseline) = &first_output {
            assert_eq!(&after_bytes, baseline);
        } else {
            first_output = Some(after_bytes.clone());
        }

        assert!(offset_loop(&mut history, animation, anchor, 12., true, [5., 23.]).is_err());
        assert_eq!(
            encode_scene_payload(&history.frame().project).unwrap(),
            after_bytes
        );
        assert_eq!(history.frame().animation_key_ids, after.animation_key_ids);
        assert!(offset_loop(&mut history, animation, anchor, 12., true, LOOP).unwrap());
        assert_eq!(
            encode_scene_payload(&history.frame().project).unwrap(),
            before_bytes
        );
        assert_eq!(history.frame().animation_key_ids, before.animation_key_ids);
        assert!(!history.dirty());

        assert!(history.apply(SceneEdit::Undo).unwrap());
        assert_eq!(
            encode_scene_payload(&history.frame().project).unwrap(),
            after_bytes
        );
        assert!(history.apply(SceneEdit::Undo).unwrap());
        assert_eq!(
            encode_scene_payload(&history.frame().project).unwrap(),
            before_bytes
        );
        assert!(!history.can_undo());
        assert!(history.apply(SceneEdit::Redo).unwrap());
        assert_eq!(history.frame().animation_key_ids, after.animation_key_ids);
        assert_eq!(
            encode_scene_payload(&history.frame().project).unwrap(),
            after_bytes
        );
        assert!(history.apply(SceneEdit::Redo).unwrap());
        assert_eq!(history.frame().animation_key_ids, before.animation_key_ids);
        assert_eq!(
            encode_scene_payload(&history.frame().project).unwrap(),
            before_bytes
        );
    }
}

#[test]
fn explicit_loop_preserves_imported_exterior_rows_beyond_its_editable_range() {
    let mut project = explicit_loop_fixture([4., 26.]);
    let keys = &mut project.animations[0].tracks[0].keys;
    keys.insert(
        0,
        BoneKeyframe {
            frame: 0.,
            values: [-90., 0.],
            curve: KeyCurve::Linear,
        },
    );
    keys.last_mut().unwrap().frame = 4_000_000.;
    let mut history = SceneHistory::new(project, true).unwrap();
    let before = history.frame().clone();
    let ids = &before.animation_key_ids[0][0];
    assert!(offset_loop(
        &mut history,
        before.animation_ids[0],
        ids[4],
        6.,
        false,
        [6., 24.]
    )
    .unwrap());

    let after = history.frame();
    let source = &before.project.animations[0].tracks[0].keys;
    let keys = &after.project.animations[0].tracks[0].keys;
    assert_eq!(keys[0], source[0]);
    assert_eq!(keys[1].frame, source[1].frame);
    assert_eq!(keys[6].curve, source[5].curve);
    assert_eq!(keys[7], source[6]);
    let after_ids = &after.animation_key_ids[0][0];
    assert_eq!(
        [after_ids[0], after_ids[1], after_ids[3], after_ids[7]],
        [ids[0], ids[1], ids[4], ids[6]]
    );
}

#[test]
fn explicit_loop_rejects_incomplete_invalid_and_open_ranges_before_writing() {
    let mut project = explicit_loop_fixture([4., 26.]);
    project.animations[0].tracks[0].keys[4].values[0] = 11.;
    let mut history = SceneHistory::new(project, true).unwrap();
    let before = history.frame().clone();
    let before_bytes = encode_scene_payload(&before.project).unwrap();
    let animation = before.animation_ids[0];
    let anchor = before.animation_key_ids[0][0][3];
    for bounds in [
        [-1., 24.],
        [6., 31.],
        [24., 6.],
        [6., 6.],
        [5., 24.],
        [6., 24.],
    ] {
        assert!(offset_loop(&mut history, animation, anchor, 6., false, bounds).is_err());
    }
    for incomplete in [json!({"start": 6}), json!({"end": 24})] {
        let malformed = json!({
            "type": "offsetAnimationKeys",
            "animation": animation,
            "key": anchor,
            "deltaFrames": 6,
            "loopRange": incomplete
        });
        assert!(serde_json::from_value::<crate::rig::RigEdit>(malformed).is_err());
    }
    assert_eq!(
        encode_scene_payload(&history.frame().project).unwrap(),
        before_bytes
    );
    assert_eq!(history.frame().animation_key_ids, before.animation_key_ids);
    assert!(!history.can_undo());
    assert!(!history.dirty());
}
