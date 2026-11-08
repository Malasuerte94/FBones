//! Own large-surface arithmetic checks; Session/profile boundaries are separate.
use crate::{auto_weights, binding, mesh, mesh_edit, rig, scene_large_mesh_fixture, triangulation};
use fbones_format::minimal::{meshes::Vertex, Bone};

fn positions(rows: &[Vertex]) -> Vec<u32> {
    rows.iter()
        .flat_map(|row| row.positions.iter().map(|v| v.to_bits()))
        .collect()
}

#[test]
fn large_mesh_dense_weight_edits_preserve_every_position_and_reject_overflow() {
    let mut surface = scene_large_mesh_fixture::mesh(32, 16, true);
    let poses = vec![rig::zero(); 3];
    surface.vertices[511].positions[3] = -0.;
    let before = positions(&surface.vertices);
    for vertex in 0..512 {
        binding::set_weight_locked(
            binding::DenseBindingMut {
                weighted: &mut surface.weighted,
                bones: &mut surface.bones,
                vertices: &mut surface.vertices,
            },
            vertex,
            1,
            0.6,
            &poses,
            &[],
        )
        .unwrap();
    }
    assert_eq!(positions(&surface.vertices), before);
    assert!(surface
        .vertices
        .iter()
        .all(|v| (v.weights[0] - 0.6).abs() < 1e-6));
    surface.vertices.push(surface.vertices[511].clone());
    let oversized = surface.clone();
    assert!(binding::set_weight_locked(
        binding::DenseBindingMut {
            weighted: &mut surface.weighted,
            bones: &mut surface.bones,
            vertices: &mut surface.vertices,
        },
        511,
        1,
        0.4,
        &poses,
        &[]
    )
    .is_err());
    assert_eq!(surface, oversized);
}

#[test]
fn large_mesh_auto_uses_all_topology_and_retains_dormant_position_bits() {
    // 22×14 has exactly the retained large shape's 308 rows/1638 indices.
    let mut surface = scene_large_mesh_fixture::mesh(22, 14, true);
    let bones = vec![Bone::root(); 3];
    let poses = rig::poses(&bones);
    assert_eq!(surface.triangles.len(), 1638);
    surface.vertices[307].weights = vec![1., 0.];
    surface.vertices[307].positions[2] = -0.;
    let before = positions(&surface.vertices);
    auto_weights::apply_binding_scoped(
        binding::DenseBindingMut {
            weighted: &mut surface.weighted,
            bones: &mut surface.bones,
            vertices: &mut surface.vertices,
        },
        auto_weights::BindingTopology {
            triangles: &surface.triangles,
            edges: &surface.edges,
        },
        &bones,
        &poses,
        binding::PositionPolicy::PreserveAll,
        &auto_weights::AutoScope::default(),
    )
    .unwrap();
    assert_eq!(positions(&surface.vertices), before);
    assert!(surface.vertices.iter().all(|row| row
        .weights
        .iter()
        .all(|v| v.is_finite() && *v >= 0.)
        && (row.weights.iter().sum::<f32>() - 1.).abs() < 1e-5));
    let before = surface.clone();
    let mut excessive = surface.triangles.clone();
    while excessive.len() <= mesh::MAX_TRIANGLE_INDICES {
        excessive.extend([0, 1, 2]);
    }
    assert!(auto_weights::apply_binding_scoped(
        binding::DenseBindingMut {
            weighted: &mut surface.weighted,
            bones: &mut surface.bones,
            vertices: &mut surface.vertices,
        },
        auto_weights::BindingTopology {
            triangles: &excessive,
            edges: &surface.edges
        },
        &bones,
        &poses,
        binding::PositionPolicy::PreserveAll,
        &auto_weights::AutoScope::default()
    )
    .is_err());
    assert_eq!(surface, before);
}

#[test]
fn large_mesh_full_deformed_move_keeps_uv_topology_and_rejects_duplicate_targets() {
    let mut surface = scene_large_mesh_fixture::mesh(32, 16, true);
    let poses = vec![rig::zero(); 3];
    let before = surface.clone();
    let points = mesh::world_vertices(&surface, &poses);
    let targets: Vec<_> = points
        .iter()
        .enumerate()
        .map(|(i, p)| (i, [p[0] + 2., p[1] - 3.]))
        .collect();
    mesh_edit::move_vertices(&mut surface, &targets, &poses, false).unwrap();
    assert_eq!(surface.uvs, before.uvs);
    assert_eq!(surface.triangles, before.triangles);
    assert_eq!(surface.edges, before.edges);
    for (p, old) in mesh::world_vertices(&surface, &poses).iter().zip(&points) {
        assert!((p[0] - old[0] - 2.).abs() < 1e-4 && (p[1] - old[1] + 3.).abs() < 1e-4);
    }
    let before = surface.clone();
    let mut too_many = targets.clone();
    too_many.push(targets[511]);
    assert!(mesh_edit::move_vertices(&mut surface, &too_many, &poses, false).is_err());
    assert!(
        mesh_edit::move_vertices(&mut surface, &[targets[511], targets[511]], &poses, false)
            .is_err()
    );
    assert!(mesh::add_vertex(&mut surface, [0., 0.], None, &poses).is_err());
    assert_eq!(surface, before);
    // Internal Scene stroke sample budget remains128 even with a large mesh.
    assert!(mesh_edit::stroke(&mut surface, None, &[[0., 0.]; 129], &poses, false).is_err());
    assert_eq!(surface, before);
}

#[test]
fn large_mesh_triangulation_keeps_high_constraints_area_and_513_guard() {
    let surface = scene_large_mesh_fixture::mesh(32, 16, false);
    let triangles = triangulation::triangulate(&surface.uvs, surface.hull, &surface.edges).unwrap();
    assert_eq!(triangles.len(), (2 * 512 - surface.hull - 2) * 3);
    assert!(triangles.contains(&511));
    let mut edges = std::collections::BTreeSet::new();
    let mut area = 0.;
    for t in triangles.chunks_exact(3) {
        let p: Vec<_> = t
            .iter()
            .map(|i| {
                [
                    f64::from(surface.uvs[*i as usize * 2]),
                    f64::from(surface.uvs[*i as usize * 2 + 1]),
                ]
            })
            .collect();
        let cross = triangulation::cross(p[0], p[1], p[2]);
        assert!(cross > 0.);
        area += cross / 2.;
        for i in 0..3 {
            edges.insert((t[i].min(t[(i + 1) % 3]), t[i].max(t[(i + 1) % 3])));
        }
    }
    assert!((area - 1.).abs() < 1e-6);
    for e in surface.edges.chunks_exact(2) {
        assert!(edges.contains(&(
            (e[0] as u16).min(e[1] as u16),
            (e[0] as u16).max(e[1] as u16)
        )));
    }
    let mut excessive = surface.uvs.clone();
    excessive.extend([0.3, 0.4]);
    assert!(triangulation::triangulate(&excessive, surface.hull, &surface.edges).is_err());
}
