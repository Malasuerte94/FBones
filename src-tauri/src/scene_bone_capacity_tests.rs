//! Scene inventory/request limits and structural reopenability are independent.
use super::*;
use crate::rig::{BoneColorEdit, RigEdit};
use fbones_format::{
    minimal::{
        meshes,
        regions::{BlendMode, Region, RegionProject},
        scene::*,
        Bone, MinimalProject,
    },
    ProjectEnvelope,
};
fn project(count: usize) -> SceneProject {
    let mut rig = MinimalProject::new("Own Scene bone capacity".into(), [78; 16]);
    for index in 1..count {
        let mut b = Bone::root();
        b.name = format!("Own{index}");
        b.parent = Some(0);
        b.x = index as f32 / 4.;
        b.y = index as f32 / 8.;
        b.length = 4.;
        rig.bones.push(b);
    }
    SceneProject::from(&RegionProject {
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    })
}
fn model(session: &Session) -> SceneProject {
    let state = session.lock().unwrap();
    let Some(Document::Editable { project, .. }) = &state.document else {
        panic!("owneditable")
    };
    (**project).clone()
}
fn open(project: &SceneProject) -> (tempfile::TempDir, Session, ProjectSummary) {
    let d = tempfile::tempdir().unwrap();
    let path = d.path().join("own-source.spine");
    std::fs::write(&path, encode_scene(project).unwrap()).unwrap();
    let s = Session::default();
    let p = s.replace(open_document(path).unwrap(), false).unwrap();
    assert!(!p.inspection_only);
    (d, s, p)
}
fn command(session: &Session, edit: RigEdit) -> ProjectSummary {
    let revision = session.summary().unwrap().unwrap().revision;
    session.edit(revision, edit).unwrap()
}
fn transform(ids: Vec<u64>) -> RigEdit {
    RigEdit::TransformBones {
        ids,
        mode: crate::rig::TransformMode::Translate,
        individual: false,
        local_axes: false,
        pivot_x: 0.,
        pivot_y: 0.,
        dx: 3.,
        dy: 4.,
        rotation: 0.,
        scale_x: 1.,
        scale_y: 1.,
        shear_x: 0.,
        shear_y: 0.,
    }
}
fn assert_model(session: &Session, expected: &SceneProject) {
    assert_eq!(
        encode_scene_payload(&model(session)).unwrap(),
        encode_scene_payload(expected).unwrap()
    );
}
#[test]
fn scene_create_255_to_256_is_one_history_action_and_257_rejects_atomically() {
    assert_eq!(MAX_SCENE_BONES, 256);
    let original = project(255);
    let (_d, s, initial) = open(&original);
    let root = initial.bones[0].id;
    let created = command(
        &s,
        RigEdit::Create {
            color: None,
            parent: root,
            x: 4.,
            y: 5.,
            rotation: 0.,
            length: 3.,
        },
    );
    assert_eq!(created.bones.len(), 256);
    assert_eq!(created.revision, initial.revision + 1);
    let source = model(&s);
    let stable = serde_json::to_value(&created).unwrap();
    assert!(s
        .edit(
            created.revision,
            RigEdit::Create {
                color: None,
                parent: root,
                x: 1.,
                y: 2.,
                rotation: 0.,
                length: 3.
            }
        )
        .is_err());
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        stable
    );
    assert_model(&s, &source);
    let undone = command(&s, RigEdit::Undo);
    assert!(!undone.can_undo);
    assert_model(&s, &original);
    command(&s, RigEdit::Redo);
    assert_model(&s, &source);
}
#[test]
fn scene_256_color_and_transform_batches_and_largest_meaningful_reparent_are_single_actions() {
    let original = project(256);
    let (_d, s, initial) = open(&original);
    let ids = initial.bones.iter().map(|b| b.id).collect::<Vec<_>>();
    let colors = ids
        .iter()
        .enumerate()
        .map(|(i, id)| BoneColorEdit {
            id: *id,
            color: 0x204060ff ^ ((i as u32) << 8),
        })
        .collect::<Vec<_>>();
    let colored = command(
        &s,
        RigEdit::SetBoneColors {
            colors: colors.clone(),
        },
    );
    assert_eq!(colored.revision, initial.revision + 1);
    for (bone, color) in colored.bones.iter().zip(&colors) {
        assert_eq!(bone.color, color.color);
    }
    let changed = model(&s);
    let mut oversized = colors.clone();
    oversized.push(colors[0].clone());
    assert!(s
        .edit(
            colored.revision,
            RigEdit::SetBoneColors { colors: oversized }
        )
        .is_err());
    assert_model(&s, &changed);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        serde_json::to_value(&colored).unwrap()
    );
    let undo = command(&s, RigEdit::Undo);
    assert!(!undo.can_undo);
    assert_model(&s, &original);
    let moved = command(&s, transform(ids.clone()));
    assert_eq!(moved.revision, undo.revision + 1);
    for (before, after) in crate::rig::poses(&original.rig.bones)
        .iter()
        .zip(crate::rig::poses(&model(&s).rig.bones))
    {
        assert_eq!((after.x, after.y), (before.x + 3., before.y + 4.));
    }
    let changed = model(&s);
    let mut oversized = ids.clone();
    oversized.push(ids[0]);
    assert!(s.edit(moved.revision, transform(oversized)).is_err());
    assert_model(&s, &changed);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        serde_json::to_value(&moved).unwrap()
    );
    let undone = command(&s, RigEdit::Undo);
    assert!(!undone.can_undo);
    assert_model(&s, &original);
    let reparented = command(
        &s,
        RigEdit::ReparentSelection {
            bones: ids[2..].to_vec(),
            attachments: vec![],
            parent: ids[1],
        },
    );
    assert_eq!(reparented.revision, undone.revision + 1);
    let parent_index = reparented
        .bones
        .iter()
        .position(|b| b.id == ids[1])
        .unwrap();
    let actual = model(&s);
    assert!(actual
        .rig
        .bones
        .iter()
        .skip(2)
        .all(|b| b.parent == Some(parent_index)));
    for (before, after) in crate::rig::poses(&original.rig.bones)
        .iter()
        .zip(crate::rig::poses(&actual.rig.bones))
    {
        assert_eq!((after.x, after.y), (before.x, before.y));
    }
    let undone = command(&s, RigEdit::Undo);
    assert!(!undone.can_undo);
    assert_model(&s, &original);
    // All255nonroot bones can only target root; top selected ancestors are
    // already its children, so preserve the established no-op/root policies.
    let stable = serde_json::to_value(&undone).unwrap();
    let same = command(
        &s,
        RigEdit::ReparentSelection {
            bones: ids[1..].to_vec(),
            attachments: vec![],
            parent: ids[0],
        },
    );
    assert_eq!(serde_json::to_value(same).unwrap(), stable);
    for selection in [ids.clone(), ids.iter().copied().chain([ids[0]]).collect()] {
        assert!(s
            .edit(
                undone.revision,
                RigEdit::ReparentSelection {
                    bones: selection,
                    attachments: vec![],
                    parent: ids[0]
                }
            )
            .is_err());
        assert_eq!(
            serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
            stable
        );
        assert_model(&s, &original);
    }
}
fn depth_fixture() -> SceneProject {
    let mut p = project(246);
    for i in 1..245 {
        p.rig.bones[i].parent = Some(i - 1);
        p.rig.bones[i].x = 0.25;
        p.rig.bones[i].y = 0.125;
        p.rig.bones[i].rotation = 0.5;
    }
    p.rig.bones[245].parent = Some(0);
    let image = Region {
        name: "own-grid".into(),
        path: String::new(),
        x: 0.,
        y: 0.,
        rotation: 0.,
        scale_x: 1.,
        scale_y: 1.,
        width: 8.,
        height: 8.,
    };
    let mut mesh = meshes::quad(image, 244);
    mesh.weighted = true;
    mesh.bones = vec![0, 244];
    for v in &mut mesh.vertices {
        let old = v.positions.clone();
        v.weights = vec![0.5, 0.5];
        v.positions = old.iter().copied().chain(old.iter().copied()).collect();
    }
    p.slots.push(SceneSlot {
        name: "Own deep owner".into(),
        bone: 244,
        color: [255; 4],
        blend: BlendMode::Normal,
        active_attachment: Some(0),
        attachments: vec![SceneAttachment::Mesh(Box::new(mesh))],
    });
    p.attachment_order.push(AttachmentAddress {
        slot: 0,
        attachment: 0,
    });
    p.animations[0].tracks.push(BoneTimeline {
        bone: 244,
        channel: BoneChannel::Translate,
        keys: vec![
            BoneKeyframe {
                frame: 0.,
                values: [-0., 1.],
                curve: KeyCurve::Linear,
            },
            BoneKeyframe {
                frame: 10.,
                values: [2., 3.],
                curve: KeyCurve::Linear,
            },
        ],
    });
    p
}
#[test]
fn scene_depth_closure_rejects_precommit_without_losing_ids_history_dirty_or_files() {
    let original = depth_fixture();
    let accepted = encode_scene_payload(&original).unwrap();
    assert_eq!(
        encode_scene_payload(&decode_scene(&accepted).unwrap()).unwrap(),
        accepted
    );
    let (d, s, initial) = open(&original);
    let source = d.path().join("own-source.spine");
    let source_bytes = std::fs::read(&source).unwrap();
    let target = d.path().join("protected-result.fbones");
    std::fs::write(&target, b"own-existing-target").unwrap();
    let revision = initial.revision;
    let stable = serde_json::to_value(&initial).unwrap();
    let descendant = initial.bones[1].id;
    let added_ancestor = initial.bones[245].id;
    // Inserting the spare ancestor makes the first-referenced chain246long.
    // Inventory is246<256; rejection is structural depth, not inventory/topology.
    assert!(s
        .edit(
            revision,
            RigEdit::Reparent {
                id: descendant,
                parent: added_ancestor
            }
        )
        .is_err());
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        stable
    );
    assert_model(&s, &original);
    assert_eq!(std::fs::read(&source).unwrap(), source_bytes);
    assert_eq!(std::fs::read(&target).unwrap(), b"own-existing-target");
    assert!(!s.summary().unwrap().unwrap().can_undo);
    let saved = d.path().join("safe-copy.fbones");
    s.save_snapshot(s.prepare_save(false).unwrap(), saved.clone())
        .unwrap();
    let payload = ProjectEnvelope::inspect(std::fs::read(saved).unwrap())
        .unwrap()
        .decoded_payload()
        .unwrap();
    assert_eq!(payload, accepted);
    assert_eq!(std::fs::read(&source).unwrap(), source_bytes);
    assert_eq!(std::fs::read(&target).unwrap(), b"own-existing-target");
}
