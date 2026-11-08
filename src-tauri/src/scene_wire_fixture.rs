//! Small independently authored fixture, compiled only for tests and e2e-host.
use fbones_format::minimal::{
    meshes,
    regions::{BlendMode, Region},
    scene::*,
    Bone, MinimalProject,
};

pub(crate) fn project() -> SceneProject {
    let mut rig = MinimalProject::new("Own wire preservation".into(), [106; 16]);
    for (name, x) in [("red", -30.), ("green", 30.)] {
        let mut bone = Bone::root();
        bone.parent = Some(0);
        bone.name = name.into();
        bone.x = x;
        bone.length = 20.;
        rig.bones.push(bone);
    }
    let region = |name: &str| Region {
        name: name.into(),
        path: String::new(),
        x: 0.,
        y: 0.,
        rotation: 0.,
        scale_x: 1.,
        scale_y: 1.,
        width: 32.,
        height: 24.,
    };
    let mut mesh = meshes::quad(region("green"), 2);
    // Stored image dimensions are metadata, not the authored vertex geometry.
    mesh.image.width = 0.;
    mesh.image.height = 0.;
    let address = |slot| AttachmentAddress {
        slot,
        attachment: 0,
    };
    let mut first = Animation::new("first".into());
    first.tracks = vec![
        BoneTimeline {
            bone: 1,
            channel: BoneChannel::Translate,
            keys: vec![
                BoneKeyframe {
                    frame: 0.,
                    values: [0., 0.],
                    curve: KeyCurve::Linear,
                },
                BoneKeyframe {
                    frame: 30.,
                    values: [20., 10.],
                    curve: KeyCurve::Linear,
                },
            ],
        },
        BoneTimeline {
            bone: 2,
            channel: BoneChannel::Rotate,
            keys: vec![BoneKeyframe {
                frame: 0.,
                values: [5., 0.],
                curve: KeyCurve::Linear,
            }],
        },
    ];
    first.slot_tracks = vec![
        SlotTimeline::Rgba {
            slot: 1,
            keys: vec![SlotRgbaKey {
                dark_values: [0.; 3],
                frame: 0.,
                values: [1.; 4],
                curve: SlotRgbaCurve::Linear,
            }],
        },
        SlotTimeline::Attachment {
            slot: 0,
            keys: vec![SlotAttachmentKey {
                frame: 0.,
                attachment: Some(0),
            }],
        },
    ];
    first.tracks.reverse();
    let mut p = SceneProject {
        wire: None,
        rig,
        images_root: "./images".into(),
        audio_root: "./audio".into(),
        events: vec![],
        editor_flag_53: false,
        slots: vec![
            SceneSlot {
                name: "red".into(),
                bone: 1,
                color: [255; 4],
                blend: BlendMode::Normal,
                attachments: vec![SceneAttachment::Region(region("red"))],
                active_attachment: Some(0),
            },
            SceneSlot {
                name: "green".into(),
                bone: 2,
                color: [255; 4],
                blend: BlendMode::Normal,
                attachments: vec![SceneAttachment::Mesh(Box::new(mesh))],
                active_attachment: Some(0),
            },
        ],
        attachment_order: vec![address(0), address(1)],
        attachment_sequences: vec![],
        attachment_colors: vec![],
        slot_dark_colors: vec![],
        constraints: vec![],
        animations: vec![first, Animation::new("second".into())],
        fps: 30.,
    };
    let mut strings = vec![];
    for (slot, bone) in [(0, 1), (1, 2)] {
        for owner in [
            WireStringOwner::Bone(bone),
            WireStringOwner::Slot(slot),
            WireStringOwner::Attachment(address(slot)),
        ] {
            strings.push(WireStringAlias {
                owner,
                tag: 1,
                group: slot as u32,
                encoding: None,
            });
        }
    }
    strings.push(WireStringAlias {
        owner: WireStringOwner::Attachment(address(0)),
        tag: 13,
        group: 9,
        encoding: None,
    });
    strings.push(WireStringAlias {
        owner: WireStringOwner::Attachment(address(1)),
        tag: 14,
        group: 9,
        encoding: None,
    });
    p.wire = Some(SceneWire {
        source_state: None,
        slot_references_8: vec![],
        editor_metadata: None,
        constraint_declarations: None,
        editor_scalar_46: FiniteF32::new(50.).unwrap(),
        skeleton_bounds_24: [FiniteF32::new(0.).unwrap(); 4],
        strings,
        zero_size_meshes: vec![address(1)],
        animation_layouts: vec![
            WireAnimationLayout {
                animation: 0,
                groups: vec![
                    WireAnimationGroup {
                        owner: WireAnimationOwner::Bone(2),
                        tracks: vec![
                            WireTrack::Slot {
                                slot: 1,
                                channel: WireSlotChannel::Rgba,
                            },
                            WireTrack::Bone {
                                bone: 2,
                                channel: BoneChannel::Rotate,
                            },
                        ],
                    },
                    WireAnimationGroup {
                        owner: WireAnimationOwner::Bone(1),
                        tracks: vec![
                            WireTrack::Slot {
                                slot: 0,
                                channel: WireSlotChannel::Attachment,
                            },
                            WireTrack::Bone {
                                bone: 1,
                                channel: BoneChannel::Translate,
                            },
                        ],
                    },
                ],
            },
            WireAnimationLayout {
                animation: 1,
                groups: vec![],
            },
        ],
    });
    normalize_wire_strings(&mut p).unwrap();
    p
}
