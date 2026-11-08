use crate::minimal::{regions::RegionProject, scene::*, Bone, MinimalProject};
fn scene() -> SceneProject {
    let mut rig = MinimalProject::new("own constraint event".into(), [53; 16]);
    for (name, parent, x) in [("child", 0, 10.), ("target", 0, 70.), ("lower", 1, 30.)] {
        let mut b = Bone::root();
        b.name = name.into();
        b.parent = Some(parent);
        b.x = x;
        b.length = 25.;
        rig.bones.push(b)
    }
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    });
    p.audio_root = "./audio/".into();
    p.editor_flag_53 = true;
    p.fps = 24.;
    p.constraints = vec![
        Constraint::Ik(IkConstraint::new("ik".into(), vec![1, 3], 2)),
        Constraint::Transform(TransformConstraint::new("transform".into(), vec![1], 2)),
        Constraint::Physics(PhysicsConstraint::new("physics".into(), 3)),
    ];
    p.events = vec![
        EventDefinition {
            name: "plain".into(),
            int: i32::MIN,
            float: -0.,
            string: "default 💫".into(),
            audio: String::new(),
            volume: 0.,
            balance: -0.,
        },
        EventDefinition {
            name: "sound".into(),
            int: 7,
            float: 1.75,
            string: "base".into(),
            audio: "tone.wav".into(),
            volume: 0.6,
            balance: -0.25,
        },
    ];
    let mut a = Animation::new("mixed".into());
    a.tracks.push(BoneTimeline {
        bone: 0,
        channel: BoneChannel::Translate,
        keys: vec![BoneKeyframe {
            frame: 0.,
            values: [0., 0.],
            curve: KeyCurve::Linear,
        }],
    });
    a.constraint_tracks.push(ConstraintTimeline::Ik {
        constraint: 0,
        keys: vec![
            IkKeyframe {
                frame: 0.,
                mix: 0.17,
                softness: 1.5,
                stretch: false,
                compress: true,
                bend_positive: true,
                curve: IkKeyCurve::Bezier {
                    controls: [[3., 0.3, 9., 0.7], [3., 2., 9., 6.]],
                },
            },
            IkKeyframe {
                frame: 12.,
                mix: 0.81,
                softness: 8.25,
                stretch: true,
                compress: false,
                bend_positive: false,
                curve: IkKeyCurve::Stepped,
            },
        ],
    });
    a.constraint_tracks.push(ConstraintTimeline::TransformMix {
        constraint: 1,
        keys: vec![
            TransformMixKeyframe {
                frame: 0.,
                values: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
                curve: TransformMixCurve::Bezier {
                    controls: std::array::from_fn(|i| {
                        [3., i as f32 * 0.1, 9., i as f32 * 0.1 + 0.2]
                    }),
                },
            },
            TransformMixKeyframe {
                frame: 12.,
                values: [0.7, 0.6, 0.5, 0.4, 0.3, 0.2],
                curve: TransformMixCurve::Linear,
            },
        ],
    });
    for property in PhysicsProperty::ALL {
        a.constraint_tracks.push(ConstraintTimeline::Physics {
            constraint: 2,
            property,
            keys: vec![
                PhysicsKeyframe {
                    frame: 0.,
                    value: 1.25,
                    curve: PhysicsCurve::Bezier {
                        controls: [3., 1.4, 9., 1.8],
                    },
                },
                PhysicsKeyframe {
                    frame: 12.,
                    value: 2.,
                    curve: PhysicsCurve::Linear,
                },
            ],
        });
    }
    a.constraint_tracks.push(ConstraintTimeline::PhysicsReset {
        constraint: 2,
        keys: vec![PhysicsResetKeyframe { frame: 6. }],
    });
    for (event, d) in p.events.iter().enumerate() {
        a.event_tracks.push(EventTimeline {
            event,
            keys: vec![
                EventKeyframe {
                    frame: 0.,
                    int: i32::MAX,
                    float: -0.,
                    string: "first".into(),
                    volume: 0.2,
                    balance: 0.75,
                },
                EventKeyframe {
                    frame: 12.,
                    int: d.int,
                    float: d.float,
                    string: d.string.clone(),
                    volume: d.volume,
                    balance: d.balance,
                },
            ],
        });
    }
    p.animations = vec![a];
    p
}
#[test]
fn all_constraint_curves_reset_and_materialized_event_defaults_audio_and_bits_roundtrip() {
    let p = scene();
    let payload = encode_scene_payload(&p).unwrap();
    let decoded = decode_scene(&payload).unwrap();
    assert_eq!(decoded, p);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), payload);
    assert_eq!(decoded.events[0].float.to_bits(), (-0f32).to_bits());
    assert_eq!(
        decoded.animations[0].event_tracks[0].keys[0]
            .float
            .to_bits(),
        (-0f32).to_bits()
    );
    assert!(decoded.to_regions().is_err());
    let mut reset = decoded.clone();
    reset.events.clear();
    reset.audio_root = "./audio".into();
    reset.editor_flag_53 = false;
    reset.animations = vec![Animation::new("animation".into())];
    assert_ne!(encode_scene_payload(&reset).unwrap(), payload);
}
#[test]
fn new_tracks_reject_bad_targets_duplicate_families_nonfinite_controls_and_invalid_audio() {
    let p = scene();
    let invalid = |m: SceneProject| assert!(encode_scene_payload(&m).is_err());
    let mut m = p.clone();
    if let ConstraintTimeline::Ik { constraint, .. } = &mut m.animations[0].constraint_tracks[0] {
        *constraint = 2
    }
    invalid(m);
    let mut m = p.clone();
    let t = m.animations[0].constraint_tracks[0].clone();
    m.animations[0].constraint_tracks.push(t);
    invalid(m);
    let mut m = p.clone();
    m.events[0].float = f32::NAN;
    invalid(m);
    let mut m = p.clone();
    m.events[1].name = m.events[0].name.clone();
    invalid(m);
    let mut m = p.clone();
    m.audio_root = "bad\nroot".into();
    invalid(m);
    let mut m = p.clone();
    m.animations[0].event_tracks[0].event = 9;
    invalid(m);
    let mut m = p.clone();
    m.animations[0].event_tracks[0].keys[0].string = "x".repeat(1025);
    invalid(m);
    let mut m = p.clone();
    if let ConstraintTimeline::Ik { keys, .. } = &mut m.animations[0].constraint_tracks[0] {
        keys[0].curve = IkKeyCurve::Bezier {
            controls: [[13., 0., 9., 1.], [3., 0., 9., 1.]],
        }
    }
    invalid(m);
    let mut m = p.clone();
    if let ConstraintTimeline::Physics { keys, .. } = &mut m.animations[0].constraint_tracks[5] {
        keys[0].value = 0.
    }
    invalid(m); // Mass
}
#[test]
fn owner_and_event_permutations_preserve_import_order_and_reject_unapplied_sorting() {
    let mut p = scene();
    p.animations[0].event_tracks.reverse();
    assert_eq!(
        p.animations[0]
            .event_track_permutation(p.events.len())
            .unwrap(),
        vec![1, 0]
    );
    assert!(encode_scene_payload(&p).is_err());
    p.animations[0].event_tracks.reverse();
    p.animations[0].constraint_tracks.rotate_right(1);
    let order = p.animations[0].constraint_track_permutation(&p).unwrap();
    let old = p.animations[0].constraint_tracks.clone();
    p.animations[0].constraint_tracks = order.into_iter().map(|i| old[i].clone()).collect();
    assert_eq!(decode_scene(&encode_scene_payload(&p).unwrap()).unwrap(), p);
}
#[test]
fn raw_ik_flag_sign_metadata_event_record_count_and_truncation_remain_guarded() {
    let p = scene();
    let payload = encode_scene_payload(&p).unwrap();
    let pattern = [
        0.17f32.to_be_bytes(),
        1.5f32.to_be_bytes(),
        0f32.to_be_bytes(),
        1f32.to_be_bytes(),
        1f32.to_be_bytes(),
    ]
    .concat();
    let at = payload
        .windows(pattern.len())
        .position(|v| v == pattern)
        .unwrap();
    let mut bad = payload.clone();
    bad[at + 8..at + 12].copy_from_slice(&(-0f32).to_be_bytes());
    assert!(decode_scene(&bad).is_err());
    let handles = [
        2147483648f32.to_be_bytes(),
        2147483648f32.to_be_bytes(),
        3f32.to_be_bytes(),
        0.3f32.to_be_bytes(),
        [0; 4],
    ]
    .concat();
    let at = payload
        .windows(handles.len())
        .position(|v| v == handles)
        .unwrap();
    let mut bad = payload.clone();
    bad[at + 19] = 1;
    assert!(decode_scene(&bad).is_err());
    let event = [0x85, 1, 1, 0, 0, 0, 0, 0, 1, 6, 6];
    let at = payload
        .windows(event.len())
        .position(|v| v == event)
        .unwrap();
    let mut bad = payload.clone();
    bad[at + 9] = 5;
    assert!(decode_scene(&bad).is_err());
    for end in [28, payload.len() / 2, payload.len() - 1] {
        assert!(decode_scene(&payload[..end]).is_err())
    }
}
#[test]
fn event_domains_count_toward_real_reader_budget_and_unsupported_global_targets_reject() {
    let mut p = scene();
    let mut a = Animation::new("events".into());
    let key = p.animations[0].event_tracks[0].keys[1].clone();
    a.event_tracks = vec![EventTimeline {
        event: 0,
        keys: (0..4000)
            .map(|i| EventKeyframe {
                frame: i as f32,
                ..key.clone()
            })
            .collect(),
    }];
    p.animations = vec![a];
    let payload = encode_scene_payload(&p).unwrap();
    assert_eq!(decode_scene(&payload).unwrap(), p);
    p.animations[0].event_tracks[0].keys = (0..4090)
        .map(|i| EventKeyframe {
            frame: i as f32,
            ..key.clone()
        })
        .collect();
    let bytes = encode_scene_payload(&p).unwrap();
    assert_eq!(decode_scene(&bytes).unwrap(), p);
    let mut second = p.animations[0].clone();
    second.name = "second events".into();
    p.animations.push(second);
    assert!(encode_scene_payload(&p).is_err());
    let mut p = scene();
    if let ConstraintTimeline::PhysicsReset { constraint, .. } =
        p.animations[0].constraint_tracks.last_mut().unwrap()
    {
        *constraint = usize::MAX
    }
    assert!(encode_scene_payload(&p).is_err());
}
