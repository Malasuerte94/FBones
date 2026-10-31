//! Own creation-policy checks. No original insertion algorithm is claimed.
use super::*;
use crate::{mesh, mesh_edit, rig, triangulation};
use fbones_format::minimal::{meshes::Mesh, regions::Region, Bone};

fn near(a: f32, b: f32) {
    assert!((a - b).abs() < 0.0003, "{a} != {b}");
}
fn point(a: [f32; 2], b: [f32; 2]) {
    near(a[0], b[0]);
    near(a[1], b[1]);
}
fn row_bits(row: &Vertex) -> Vec<u32> {
    row.weights
        .iter()
        .chain(&row.positions)
        .map(|v| v.to_bits())
        .collect()
}
fn fixture() -> (Mesh, Vec<Bone>, Vec<Pose>) {
    let bones = vec![
        Bone::root(),
        Bone {
            name: "reflected".into(),
            parent: Some(0),
            x: 40.,
            y: 20.,
            rotation: 17.,
            scale_x: -1.2,
            scale_y: 0.8,
            shear_y: 13.,
            ..Bone::root()
        },
        Bone {
            name: "dormant".into(),
            parent: Some(0),
            x: -30.,
            y: 15.,
            rotation: -23.,
            scale_x: 0.7,
            scale_y: 1.3,
            shear_y: 9.,
            ..Bone::root()
        },
    ];
    let poses = rig::poses(&bones);
    let vertices = [[0., 0.], [80., 0.], [0., 60.]]
        .into_iter()
        .enumerate()
        .map(|(i, p)| {
            let a = [0.2, 0.8, 0.5][i];
            let weights = vec![a, 1. - a, 0.];
            let offset = [12. + i as f32 * 3., -8. + i as f32 * 2.];
            let first = poses[0]
                .inverse()
                .unwrap()
                .point(p[0] + offset[0], p[1] + offset[1]);
            let second = poses[1].inverse().unwrap().point(
                p[0] - offset[0] * a / (1. - a),
                p[1] - offset[1] * a / (1. - a),
            );
            Vertex {
                weights,
                positions: vec![
                    first.0,
                    first.1,
                    second.0,
                    second.1,
                    p[0] * 0.5 + 70.,
                    p[1] * 0.25 - 40.,
                ],
            }
        })
        .collect();
    (
        Mesh {
            image: Region {
                name: "own-fields".into(),
                path: String::new(),
                x: 0.,
                y: 0.,
                rotation: 0.,
                scale_x: 1.,
                scale_y: 1.,
                width: 100.,
                height: 100.,
            },
            weighted: true,
            bones: vec![0, 1, 2],
            vertices,
            uvs: vec![0.2, 0.2, 0.8, 0.2, 0.2, 0.8],
            triangles: vec![0, 1, 2],
            edges: vec![0, 1, 1, 2, 2, 0],
            hull: 3,
        },
        bones,
        poses,
    )
}
fn retained(before: &Mesh, after: &Mesh) {
    for (i, uv) in before.uvs.chunks_exact(2).enumerate() {
        let index = after.uvs.chunks_exact(2).position(|v| v == uv).unwrap();
        assert_eq!(
            row_bits(&before.vertices[i]),
            row_bits(&after.vertices[index])
        );
    }
}
#[test]
fn quotient_and_plain_dormant_field_are_distinct_from_rebinding_and_naive_local_average() {
    let (m, _, poses) = fixture();
    let support = [(0, 0.5), (1, 0.25), (2, 0.25)];
    let row = interpolate_vertex(
        DenseBindingRef {
            weighted: true,
            bones: &m.bones,
            vertices: &m.vertices,
        },
        &support,
        &poses,
    )
    .unwrap();
    near(row.weights[0], 0.425);
    assert_eq!(row.weights[2], 0.);
    for axis in 0..2 {
        let plain = support
            .iter()
            .map(|(i, b)| *b * f64::from(m.vertices[*i].positions[axis]))
            .sum::<f64>() as f32;
        let weighted = (support
            .iter()
            .map(|(i, b)| {
                *b * f64::from(m.vertices[*i].weights[0])
                    * f64::from(m.vertices[*i].positions[axis])
            })
            .sum::<f64>()
            / 0.425) as f32;
        near(row.positions[axis], weighted);
        if axis == 0 {
            assert!((row.positions[axis] - plain).abs() > 1.);
        }
        let dormant = support
            .iter()
            .map(|(i, b)| *b * f64::from(m.vertices[*i].positions[4 + axis]))
            .sum::<f64>() as f32;
        near(row.positions[4 + axis], dormant);
    }
    assert!(row.positions[4].abs() > 50.);
    let mut tiny = m.clone();
    for row in &mut tiny.vertices {
        row.weights = vec![1., 1e-16, 0.];
    }
    let row = interpolate_vertex(
        DenseBindingRef {
            weighted: true,
            bones: &tiny.bones,
            vertices: &tiny.vertices,
        },
        &support,
        &poses,
    )
    .unwrap();
    assert!(row.weights[1] > 0.);
    assert!(row.positions[2..4].iter().all(|p| p.is_finite()));
}
#[test]
fn mesh_face_and_boundary_insert_preserve_old_bits_and_future_dormant_activation_uses_the_field() {
    for edge in [false, true] {
        let (mut m, _, poses) = fixture();
        let before = m.clone();
        let worlds = mesh::world_vertices(&m, &poses);
        let target = if edge {
            [
                (worlds[0][0] + worlds[1][0]) * 0.5,
                (worlds[0][1] + worlds[1][1]) * 0.5,
            ]
        } else {
            [
                worlds[0][0] * 0.5 + worlds[1][0] * 0.25 + worlds[2][0] * 0.25,
                worlds[0][1] * 0.5 + worlds[1][1] * 0.25 + worlds[2][1] * 0.25,
            ]
        };
        let index = mesh::add_vertex(&mut m, target, edge.then_some([0, 1]), &poses).unwrap();
        retained(&before, &m);
        point(mesh::world_vertices(&m, &poses)[index], target);
        let expected = if edge { [90., -40.] } else { [80., -36.25] };
        point(
            [
                m.vertices[index].positions[4],
                m.vertices[index].positions[5],
            ],
            expected,
        );
        let expected_world = poses[2].point(expected[0], expected[1]);
        let bits = m.vertices[index]
            .positions
            .iter()
            .map(|v| v.to_bits())
            .collect::<Vec<_>>();
        set_weight(
            DenseBindingMut {
                weighted: &mut m.weighted,
                bones: &mut m.bones,
                vertices: &mut m.vertices,
            },
            index,
            2,
            1.,
            &poses,
            PositionPolicy::PreserveAll,
        )
        .unwrap();
        point(
            mesh::world_vertices(&m, &poses)[index],
            [expected_world.0, expected_world.1],
        );
        assert_eq!(
            m.vertices[index]
                .positions
                .iter()
                .map(|v| v.to_bits())
                .collect::<Vec<_>>(),
            bits
        );
        assert!((expected_world.0 - poses[2].x).hypot(expected_world.1 - poses[2].y) > 20.);
    }
}
#[test]
fn remesh_inside_and_outside_keep_old_rows_and_translate_every_outside_column_offset() {
    let (m, _, poses) = fixture();
    let mut inside_uv = m.uvs.clone();
    inside_uv.extend([0.35, 0.35]);
    let t = triangulation::triangulate(&inside_uv, 3, &m.edges).unwrap();
    let inside = mesh_edit::remesh(&m, inside_uv, t, m.edges.clone(), 3, &poses).unwrap();
    retained(&m, &inside);
    point(
        [
            inside.vertices[3].positions[4],
            inside.vertices[3].positions[5],
        ],
        [80., -36.25],
    );
    let uvs = vec![0.2, 0.2, 0.8, 0.2, 0.9, 0.5, 0.2, 0.8];
    let edges = vec![0, 1, 1, 2, 2, 3, 3, 0];
    let t = triangulation::triangulate(&uvs, 4, &edges).unwrap();
    let outside = mesh_edit::remesh(&m, uvs, t, edges, 4, &poses).unwrap();
    retained(&m, &outside);
    let nearest = &m.vertices[1];
    let row = &outside.vertices[2];
    assert_eq!(
        row.weights.iter().map(|w| w.to_bits()).collect::<Vec<_>>(),
        nearest
            .weights
            .iter()
            .map(|w| w.to_bits())
            .collect::<Vec<_>>()
    );
    let current = world_vertex(nearest, &m.bones, &poses);
    let placed = world_vertex(row, &m.bones, &poses);
    let delta = [placed[0] - current[0], placed[1] - current[1]];
    assert!(delta[0].hypot(delta[1]) > 20.);
    for (i, pose) in poses.iter().enumerate() {
        let a = pose.point(nearest.positions[i * 2], nearest.positions[i * 2 + 1]);
        let b = pose.point(row.positions[i * 2], row.positions[i * 2 + 1]);
        point([b.0 - a.0, b.1 - a.1], delta);
    }
    let mut activated = outside.clone();
    set_weight(
        DenseBindingMut {
            weighted: &mut activated.weighted,
            bones: &mut activated.bones,
            vertices: &mut activated.vertices,
        },
        2,
        2,
        1.,
        &poses,
        PositionPolicy::PreserveAll,
    )
    .unwrap();
    let p = mesh::world_vertices(&activated, &poses)[2];
    let old = poses[2].point(nearest.positions[4], nearest.positions[5]);
    point(p, [old.0 + delta[0], old.1 + delta[1]]);
    assert!((p[0] - old.0).hypot(p[1] - old.1) > 20.);
}
#[test]
fn exact_supported_dormant_singular_interpolation_works_but_outside_extension_is_atomic_error() {
    let (m, _, mut poses) = fixture();
    poses[2].a = 0.;
    poses[2].b = 0.;
    poses[2].c = 0.;
    poses[2].d = 0.;
    let worlds = mesh::world_vertices(&m, &poses);
    let target = [
        worlds[0][0] * 0.5 + worlds[1][0] * 0.25 + worlds[2][0] * 0.25,
        worlds[0][1] * 0.5 + worlds[1][1] * 0.25 + worlds[2][1] * 0.25,
    ];
    let mut inside = m.clone();
    mesh::add_vertex(&mut inside, target, None, &poses).unwrap();
    retained(&m, &inside);
    let uvs = vec![0.2, 0.2, 0.8, 0.2, 0.9, 0.5, 0.2, 0.8];
    let edges = vec![0, 1, 1, 2, 2, 3, 3, 0];
    let t = triangulation::triangulate(&uvs, 4, &edges).unwrap();
    assert!(mesh_edit::remesh(&m, uvs, t, edges, 4, &poses).is_err());
    let mut invalid = m.clone();
    assert!(mesh::add_vertex(&mut invalid, [f32::NAN, 0.], None, &poses).is_err());
    assert_eq!(invalid, m);
}
#[test]
fn legitimate_dormant_origins_and_zero_extension_never_require_a_singular_dormant_inverse() {
    let (mut m, _, mut poses) = fixture();
    for row in &mut m.vertices {
        row.positions[4] = -0.;
        row.positions[5] = 0.;
    }
    poses[2].a = 0.;
    poses[2].b = 0.;
    poses[2].c = 0.;
    poses[2].d = 0.;
    let mut row = interpolate_vertex(
        DenseBindingRef {
            weighted: true,
            bones: &m.bones,
            vertices: &m.vertices,
        },
        &[(0, 0.5), (1, 0.5)],
        &poses,
    )
    .unwrap();
    assert_eq!(&row.positions[4..], [0., 0.]);
    let current = world_vertex(&row, &m.bones, &poses);
    let bits = row_bits(&row);
    position_new_vertex(&mut row, &m.bones, current, &poses, true).unwrap();
    assert_eq!(row_bits(&row), bits);
    let before = m.clone();
    let worlds = mesh::world_vertices(&m, &poses);
    let target = [
        (worlds[0][0] + worlds[1][0]) * 0.5,
        (worlds[0][1] + worlds[1][1]) * 0.5,
    ];
    mesh::add_vertex(&mut m, target, Some([0, 1]), &poses).unwrap();
    retained(&before, &m);
}
#[cfg(feature = "scene-editing")]
#[test]
fn native_new_weighted_vertex_has_one_history_step_and_real_canonical_save_reopen() {
    use crate::project::{new_document, open_document, Document, Session};
    use crate::rig::RigEdit;
    use fbones_format::minimal::{
        regions::BlendMode,
        scene::{AttachmentAddress, SceneAttachment, SceneSlot},
    };
    let (m, bones, poses) = fixture();
    let directory = tempfile::tempdir().unwrap();
    let images = directory.path().join("source");
    std::fs::create_dir(&images).unwrap();
    let mut png = vec![];
    {
        let mut encoder = png::Encoder::new(&mut png, 100, 100);
        encoder.set_color(png::ColorType::Rgba);
        encoder
            .write_header()
            .unwrap()
            .write_image_data(&vec![255; 40000])
            .unwrap();
    }
    std::fs::write(images.join("own-fields.png"), &png).unwrap();
    let mut document = new_document("Own new vertex".into()).unwrap();
    let Document::Editable { project, rig, .. } = &mut document else {
        unreachable!()
    };
    project.rig.bones = bones;
    project.slots = vec![SceneSlot {
        name: "own".into(),
        bone: 0,
        color: [255; 4],
        blend: BlendMode::Normal,
        attachments: vec![SceneAttachment::Mesh(Box::new(m.clone()))],
        active_attachment: Some(0),
    }];
    project.attachment_order = vec![AttachmentAddress {
        slot: 0,
        attachment: 0,
    }];
    **rig = crate::scene_edit::SceneRigHistory::new(project, true);
    let session = Session::default();
    let p = session.replace(document, true).unwrap();
    let p = session.select_images_folder(p.revision, &images).unwrap();
    let slot = p.slots[0].id;
    let attachment = p.slots[0].attachments[0].id;
    let worlds = mesh::world_vertices(&m, &poses);
    let x = worlds[0][0] * 0.5 + worlds[1][0] * 0.25 + worlds[2][0] * 0.25;
    let y = worlds[0][1] * 0.5 + worlds[1][1] * 0.25 + worlds[2][1] * 0.25;
    let p = session
        .edit(
            p.revision,
            RigEdit::AttachmentEdit {
                id: attachment,
                edit: Box::new(RigEdit::AddVertex {
                    id: slot,
                    x,
                    y,
                    edge_a: None,
                    edge_b: None,
                }),
            },
        )
        .unwrap();
    let expected = p.slots[0].attachments[0].mesh.clone().unwrap();
    assert_eq!(expected.vertices.len(), 4);
    near(expected.vertices[3].positions[4], 80.);
    near(expected.vertices[3].positions[5], -36.25);
    for (a, b) in expected.vertices[..3].iter().zip(&m.vertices) {
        assert_eq!(
            a.weights
                .iter()
                .chain(&a.positions)
                .map(|v| v.to_bits())
                .collect::<Vec<_>>(),
            row_bits(b)
        );
    }
    let p = session.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        p.slots[0].attachments[0]
            .mesh
            .as_ref()
            .unwrap()
            .vertices
            .len(),
        3
    );
    let p = session.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(p.slots[0].attachments[0].mesh.as_ref().unwrap(), &expected);
    let path = directory.path().join("saved/own.fbones");
    let p = session
        .save_snapshot(session.prepare_save(true).unwrap(), path.clone())
        .unwrap();
    assert!(!p.dirty);
    session.close(false).unwrap();
    let p = session
        .replace(open_document(path).unwrap(), false)
        .unwrap();
    assert!(!p.inspection_only);
    assert!(!p.dirty);
    assert_eq!(p.slots[0].attachments[0].mesh.as_ref().unwrap(), &expected);
    assert_eq!(
        std::fs::read(directory.path().join("saved/images/own-fields.png")).unwrap(),
        png
    );
}
#[cfg(feature = "scene-editing")]
#[test]
fn clip_edge_and_offedge_insert_preserve_old_bits_and_extend_dormant_field_only_for_offedge() {
    use fbones_format::minimal::scene::Clipping;
    let (m, _, poses) = fixture();
    let source = Clipping {
        name: "own".into(),
        end_slot: Some(0),
        convex: false,
        inverse: false,
        color: [255; 4],
        weighted: true,
        bones: m.bones.clone(),
        vertices: m.vertices.clone(),
        edges: vec![0, 1, 1, 2, 2, 0],
    };
    for offedge in [false, true] {
        let mut c = source.clone();
        let worlds = crate::clip_edit::world_vertices(&c, &poses);
        let edge = [
            (worlds[0][0] + worlds[1][0]) * 0.5,
            (worlds[0][1] + worlds[1][1]) * 0.5,
        ];
        let target = [edge[0], edge[1] - if offedge { 10. } else { 0. }];
        crate::clip_edit::insert_vertex(
            &mut c,
            1,
            &rig::WorldPoint {
                x: target[0],
                y: target[1],
            },
            &poses,
        )
        .unwrap();
        for i in 0..3 {
            assert_eq!(
                row_bits(&c.vertices[if i == 0 { 0 } else { i + 1 }]),
                row_bits(&source.vertices[i])
            );
        }
        point(crate::clip_edit::world_vertices(&c, &poses)[1], target);
        let expected = poses[2].point(90., -40.);
        let actual = poses[2].point(c.vertices[1].positions[4], c.vertices[1].positions[5]);
        point(
            [actual.0, actual.1],
            [expected.0, expected.1 - if offedge { 10. } else { 0. }],
        );
    }
    let mut singular = poses;
    singular[2].a = 0.;
    singular[2].b = 0.;
    singular[2].c = 0.;
    singular[2].d = 0.;
    let mut c = source.clone();
    assert!(crate::clip_edit::insert_vertex(
        &mut c,
        1,
        &rig::WorldPoint { x: 40., y: -10. },
        &singular
    )
    .is_err());
    assert_eq!(c, source);
}
