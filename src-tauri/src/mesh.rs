//! Mesh editing and linear blend skinning. Persistent vertices use bone-local
//! positions; screen previews never become authoritative geometry by themselves.
use crate::{
    project::AppError,
    rig::{local, Pose},
    triangulation,
};
use fbones_format::minimal::{
    meshes::{Mesh, Vertex},
    regions::Region,
    Bone,
};
use std::collections::HashMap;
pub(crate) type Point = [f32; 2];
// Shared arithmetic envelope; public legacy/Clip format and request guards stay256.
#[cfg(feature = "scene-editing")]
pub(crate) const MAX_VERTICES: usize = fbones_format::minimal::scene::MAX_SCENE_MESH_VERTICES;
#[cfg(not(feature = "scene-editing"))]
pub(crate) const MAX_VERTICES: usize = 256;
#[cfg(feature = "scene-editing")]
pub(crate) const MAX_TRIANGLE_INDICES: usize =
    fbones_format::minimal::scene::MAX_SCENE_MESH_TRIANGLE_INDICES;
#[cfg(not(feature = "scene-editing"))]
pub(crate) const MAX_TRIANGLE_INDICES: usize = 1536;
#[cfg(all(test, feature = "scene-editing"))]
#[path = "large_mesh_core_tests.rs"]
mod large_mesh_core_tests;
fn invalid(message: &str) -> AppError {
    AppError::new("InvalidMesh", message)
}

pub(crate) fn world_vertices(mesh: &Mesh, poses: &[Pose]) -> Vec<Point> {
    crate::binding::world_vertices(
        crate::binding::DenseBindingRef {
            weighted: mesh.weighted,
            bones: &mesh.bones,
            vertices: &mesh.vertices,
        },
        poses,
    )
}
fn normalized(weights: &mut [f32]) {
    crate::binding::normalize_row(weights);
}
pub(crate) fn set_vertex(
    mesh: &mut Mesh,
    index: usize,
    point: Point,
    poses: &[Pose],
) -> Result<(), AppError> {
    if index >= mesh.vertices.len()
        || point
            .iter()
            .any(|p| !p.is_finite() || p.abs() > 1_000_000.0)
    {
        return Err(invalid(
            "Use a valid vertex and finite world coordinates within ±1,000,000.",
        ));
    }
    let vertex = &mut mesh.vertices[index];
    let sum: f32 = vertex.weights.iter().sum();
    for (i, bone) in mesh.bones.iter().enumerate() {
        let (x, y) = if vertex.weights[i] > 0.0 {
            local(poses[*bone], point[0] / sum, point[1] / sum)?
        } else {
            (0.0, 0.0)
        };
        vertex.positions[i * 2] = x;
        vertex.positions[i * 2 + 1] = y;
    }
    Ok(())
}
pub(crate) fn translate(mesh: &mut Mesh, delta: Point, poses: &[Pose]) -> Result<(), AppError> {
    let points = world_vertices(mesh, poses);
    for (i, p) in points.into_iter().enumerate() {
        move_vertex(mesh, i, [p[0] + delta[0], p[1] + delta[1]], poses)?;
    }
    Ok(())
}
pub(crate) fn move_vertex(
    mesh: &mut Mesh,
    index: usize,
    point: Point,
    poses: &[Pose],
) -> Result<(), AppError> {
    if index >= mesh.vertices.len()
        || point
            .iter()
            .any(|p| !p.is_finite() || p.abs() > 1_000_000.0)
    {
        return Err(invalid(
            "Use a valid vertex and finite world coordinates within ±1,000,000.",
        ));
    }
    let current = crate::binding::world_vertex(&mesh.vertices[index], &mesh.bones, poses);
    crate::binding::move_vertex(
        &mut mesh.vertices[index],
        &mesh.bones,
        current,
        point,
        poses,
    )
}
pub(crate) fn from_region(region: &Region, owner: usize) -> Mesh {
    let mut image = region.clone();
    image.x = 0.0;
    image.y = 0.0;
    image.rotation = 0.0;
    image.scale_x = 1.0;
    image.scale_y = 1.0;
    let mut mesh = fbones_format::minimal::meshes::quad(image, owner);
    let (sin, cos) = region.rotation.to_radians().sin_cos();
    for vertex in &mut mesh.vertices {
        let (x, y) = (
            vertex.positions[0] * region.scale_x,
            vertex.positions[1] * region.scale_y,
        );
        vertex.positions = [region.x + cos * x - sin * y, region.y + sin * x + cos * y].to_vec();
    }
    mesh
}
fn segment_distance(p: Point, a: Point, b: Point) -> f64 {
    let (dx, dy) = (f64::from(b[0] - a[0]), f64::from(b[1] - a[1]));
    let length = dx * dx + dy * dy;
    let t = if length > 0.0 {
        ((f64::from(p[0] - a[0]) * dx + f64::from(p[1] - a[1]) * dy) / length).clamp(0.0, 1.0)
    } else {
        0.0
    };
    (f64::from(p[0] - a[0]) - dx * t).hypot(f64::from(p[1] - a[1]) - dy * t)
}
pub(crate) fn bind(
    mesh: &mut Mesh,
    bound: Vec<usize>,
    owner: usize,
    bones: &[Bone],
    poses: &[Pose],
) -> Result<(), AppError> {
    let points = world_vertices(mesh, poses);
    let mut unique = std::collections::HashSet::new();
    if bound
        .iter()
        .any(|i| *i >= bones.len() || !unique.insert(*i))
    {
        return Err(invalid("Choose distinct bones that exist in the project."));
    }
    mesh.weighted = !bound.is_empty();
    mesh.bones = if bound.is_empty() { vec![owner] } else { bound };
    for (index, point) in points.into_iter().enumerate() {
        let mut weights = vec![0.0; mesh.bones.len()];
        if !mesh.weighted {
            weights[0] = 1.0;
        } else {
            let mut nearest: Vec<_> = mesh
                .bones
                .iter()
                .enumerate()
                .map(|(i, b)| {
                    let pose = poses[*b];
                    let (x, y) = pose.point(bones[*b].length, 0.0);
                    let end = [x, y];
                    (i, segment_distance(point, [pose.x, pose.y], end))
                })
                .collect();
            nearest.sort_by(|a, b| a.1.total_cmp(&b.1));
            for (i, d) in nearest.into_iter().take(4) {
                weights[i] = (1.0 / (d.max(1.0).powi(2))) as f32;
            }
            normalized(&mut weights);
        }
        mesh.vertices[index] = Vertex {
            positions: vec![0.0; weights.len() * 2],
            weights,
        };
        set_vertex(mesh, index, point, poses)?;
    }
    Ok(())
}
pub(crate) fn set_weight(
    mesh: &mut Mesh,
    vertex: usize,
    bone: usize,
    value: f32,
    poses: &[Pose],
) -> Result<(), AppError> {
    crate::binding::set_weight(
        crate::binding::DenseBindingMut {
            weighted: &mut mesh.weighted,
            bones: &mut mesh.bones,
            vertices: &mut mesh.vertices,
        },
        vertex,
        bone,
        value,
        poses,
        crate::binding::PositionPolicy::LegacyInitializeDormant,
    )
}
pub(crate) fn normalize(mesh: &mut Mesh) {
    crate::binding::normalize(crate::binding::DenseBindingMut {
        weighted: &mut mesh.weighted,
        bones: &mut mesh.bones,
        vertices: &mut mesh.vertices,
    });
}

#[cfg_attr(feature = "scene-editing", allow(dead_code))]
pub(crate) fn remap_deleted_bones(
    mesh: &mut Mesh,
    poses: &[Pose],
    indices: &HashMap<usize, usize>,
    owner: usize,
) -> Result<(), AppError> {
    let points = world_vertices(mesh, poses);
    let kept: Vec<_> = mesh
        .bones
        .iter()
        .enumerate()
        .filter(|(_, b)| indices.contains_key(b))
        .map(|(i, b)| (i, *b))
        .collect();
    let old_bones: Vec<_> = if kept.is_empty() {
        vec![owner]
    } else {
        kept.iter().map(|(_, b)| *b).collect()
    };
    for (v, point) in mesh.vertices.iter_mut().zip(points) {
        v.weights = if kept.is_empty() {
            vec![1.0]
        } else {
            kept.iter().map(|(i, _)| v.weights[*i]).collect()
        };
        normalized(&mut v.weights);
        v.positions = vec![0.0; old_bones.len() * 2];
        for (i, b) in old_bones.iter().enumerate() {
            if v.weights[i] > 0.0 {
                let (x, y) = local(poses[*b], point[0], point[1])?;
                v.positions[i * 2] = x;
                v.positions[i * 2 + 1] = y;
            }
        }
    }
    mesh.bones = old_bones.iter().map(|b| indices[b]).collect();
    Ok(())
}

fn face(mesh: &Mesh, points: &[Point], p: Point) -> Option<(usize, [usize; 3], [f64; 3])> {
    mesh.triangles
        .chunks_exact(3)
        .enumerate()
        .rev()
        .find_map(|(i, t)| {
            let v = [t[0] as usize, t[1] as usize, t[2] as usize];
            triangulation::barycentric(
                [f64::from(p[0]), f64::from(p[1])],
                points[v[0]].map(f64::from),
                points[v[1]].map(f64::from),
                points[v[2]].map(f64::from),
            )
            .map(|b| (i, v, b))
        })
}
pub(crate) fn add_vertex(
    mesh: &mut Mesh,
    point: Point,
    hint: Option<[usize; 2]>,
    poses: &[Pose],
) -> Result<usize, AppError> {
    let mut candidate = mesh.clone();
    let selected = add_vertex_inner(&mut candidate, point, hint, poses)?;
    *mesh = candidate;
    Ok(selected)
}
fn add_vertex_inner(
    mesh: &mut Mesh,
    point: Point,
    hint: Option<[usize; 2]>,
    poses: &[Pose],
) -> Result<usize, AppError> {
    let n = mesh.vertices.len();
    if n >= MAX_VERTICES {
        return Err(invalid(&format!(
            "This profile supports up to {MAX_VERTICES} vertices per mesh."
        )));
    }
    let points = world_vertices(mesh, poses);
    let mut hint = hint;
    let mut inside = None;
    if hint.is_none() {
        let f = face(mesh, &points, point)
            .ok_or_else(|| invalid("Add vertices inside a mesh face or on an edge."))?;
        if let Some(zero) = f.2.iter().position(|w| w.abs() < 1e-6) {
            hint = Some([f.1[(zero + 1) % 3], f.1[(zero + 2) % 3]]);
        } else {
            inside = Some(f);
        }
    }
    let sources;
    let (uv, target);
    if let Some([a, b]) = hint {
        if a >= n
            || b >= n
            || a == b
            || !mesh
                .triangles
                .chunks_exact(3)
                .any(|t| t.contains(&(a as u16)) && t.contains(&(b as u16)))
        {
            return Err(invalid("Choose an existing mesh edge."));
        }
        let (dx, dy) = (points[b][0] - points[a][0], points[b][1] - points[a][1]);
        let length = dx * dx + dy * dy;
        if length < 1e-10 {
            return Err(invalid("This edge is collapsed in the current pose."));
        }
        let t = (((point[0] - points[a][0]) * dx + (point[1] - points[a][1]) * dy) / length)
            .clamp(0.001, 0.999);
        uv = [
            mesh.uvs[a * 2] * (1.0 - t) + mesh.uvs[b * 2] * t,
            mesh.uvs[a * 2 + 1] * (1.0 - t) + mesh.uvs[b * 2 + 1] * t,
        ];
        target = [points[a][0] + dx * t, points[a][1] + dy * t];
        sources = vec![(a, f64::from(1.0 - t)), (b, f64::from(t))];
        let mut triangles = vec![];
        for triangle in mesh.triangles.chunks_exact(3) {
            if triangle.contains(&(a as u16)) && triangle.contains(&(b as u16)) {
                let k = (0..3)
                    .find(|k| {
                        let u = triangle[*k] as usize;
                        let v = triangle[(*k + 1) % 3] as usize;
                        (u == a && v == b) || (u == b && v == a)
                    })
                    .unwrap();
                let (u, v, c) = (triangle[k], triangle[(k + 1) % 3], triangle[(k + 2) % 3]);
                triangles.extend([u, n as u16, c, n as u16, v, c]);
            } else {
                triangles.extend_from_slice(triangle);
            }
        }
        mesh.triangles = triangles;
        let mut edges = vec![];
        for edge in mesh.edges.chunks_exact(2) {
            if (edge[0] as usize == a && edge[1] as usize == b)
                || (edge[0] as usize == b && edge[1] as usize == a)
            {
                edges.extend([a as u32, n as u32, n as u32, b as u32]);
            } else {
                edges.extend_from_slice(edge);
            }
        }
        mesh.edges = edges;
    } else {
        let (index, triangle, bary) = inside.unwrap();
        let mut mapped = [0.0; 2];
        for j in 0..3 {
            for (axis, value) in mapped.iter_mut().enumerate() {
                *value += f64::from(mesh.uvs[triangle[j] * 2 + axis]) * bary[j];
            }
        }
        uv = [mapped[0] as f32, mapped[1] as f32];
        target = point;
        sources = triangle.into_iter().zip(bary).collect();
        mesh.triangles.splice(
            index * 3..index * 3 + 3,
            [
                triangle[0] as u16,
                triangle[1] as u16,
                n as u16,
                triangle[1] as u16,
                triangle[2] as u16,
                n as u16,
                triangle[2] as u16,
                triangle[0] as u16,
                n as u16,
            ],
        );
    }
    let mut row = crate::binding::interpolate_vertex(
        crate::binding::DenseBindingRef {
            weighted: mesh.weighted,
            bones: &mesh.bones,
            vertices: &mesh.vertices,
        },
        &sources,
        poses,
    )?;
    crate::binding::position_new_vertex(&mut row, &mesh.bones, target, poses, false)?;
    mesh.vertices.push(row);
    mesh.uvs.extend(uv);
    let mut selected = n;
    if let Some([a, b]) = hint {
        let h = mesh.hull;
        let insert = if a < h && b < h && (a + 1) % h == b {
            Some(if b == 0 { h } else { b })
        } else if a < h && b < h && (b + 1) % h == a {
            Some(if a == 0 { h } else { a })
        } else {
            None
        };
        if let Some(index) = insert {
            let mut order: Vec<_> = (0..n).collect();
            order.insert(index, n);
            let mut remap = vec![0; n + 1];
            for (new, old) in order.iter().enumerate() {
                remap[*old] = new;
            }
            mesh.vertices = order.iter().map(|i| mesh.vertices[*i].clone()).collect();
            mesh.uvs = order
                .iter()
                .flat_map(|i| [mesh.uvs[i * 2], mesh.uvs[i * 2 + 1]])
                .collect();
            for i in &mut mesh.triangles {
                *i = remap[*i as usize] as u16;
            }
            for i in &mut mesh.edges {
                *i = remap[*i as usize] as u32;
            }
            mesh.hull += 1;
            selected = index;
        }
    }
    Ok(selected)
}
pub(crate) fn delete_vertex(mesh: &mut Mesh, index: usize) -> Result<(), AppError> {
    if index >= mesh.vertices.len()
        || mesh.vertices.len() <= 3
        || (index < mesh.hull && mesh.hull <= 3)
    {
        return Err(invalid("Keep at least three boundary vertices."));
    }
    mesh.vertices.remove(index);
    mesh.uvs.drain(index * 2..index * 2 + 2);
    if index < mesh.hull {
        mesh.hull -= 1;
    }
    mesh.edges = mesh
        .edges
        .chunks_exact(2)
        .filter(|e| e[0] as usize != index && e[1] as usize != index)
        .flat_map(|e| {
            [
                if e[0] as usize > index {
                    e[0] - 1
                } else {
                    e[0]
                },
                if e[1] as usize > index {
                    e[1] - 1
                } else {
                    e[1]
                },
            ]
        })
        .collect();
    for i in 0..mesh.hull {
        let a = i as u32;
        let b = ((i + 1) % mesh.hull) as u32;
        if !mesh
            .edges
            .chunks_exact(2)
            .any(|e| (e[0] == a && e[1] == b) || (e[0] == b && e[1] == a))
        {
            mesh.edges.extend([a, b]);
        }
    }
    mesh.triangles = triangulation::triangulate(&mesh.uvs, mesh.hull, &mesh.edges)?;
    Ok(())
}
pub(crate) fn edge(mesh: &mut Mesh, a: usize, b: usize, remove: bool) -> Result<(), AppError> {
    if a >= mesh.vertices.len() || b >= mesh.vertices.len() || a == b {
        return Err(invalid("Choose two distinct mesh vertices."));
    }
    if remove
        && a < mesh.hull
        && b < mesh.hull
        && ((a + 1) % mesh.hull == b || (b + 1) % mesh.hull == a)
    {
        return Err(invalid("Boundary edges are required."));
    }
    let existing = mesh.edges.chunks_exact(2).position(|e| {
        (e[0] as usize == a && e[1] as usize == b) || (e[0] as usize == b && e[1] as usize == a)
    });
    if let Some(index) = existing {
        if remove {
            mesh.edges.drain(index * 2..index * 2 + 2);
        }
    } else if !remove {
        mesh.edges.extend([a as u32, b as u32]);
    }
    mesh.triangles = triangulation::triangulate(&mesh.uvs, mesh.hull, &mesh.edges)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn image() -> Region {
        Region {
            name: "image".into(),
            path: String::new(),
            x: 0.0,
            y: 0.0,
            rotation: 0.0,
            scale_x: 1.0,
            scale_y: 1.0,
            width: 100.0,
            height: 100.0,
        }
    }
    #[test]
    fn converting_binding_and_bone_motion_keep_setup_shape_then_deform_with_weights() {
        let bones = vec![
            Bone::root(),
            Bone {
                name: "arm".into(),
                parent: Some(0),
                x: 20.0,
                y: 0.0,
                rotation: 0.0,
                length: 100.0,
                ..Bone::root()
            },
        ];
        let poses = crate::rig::poses(&bones);
        let mut mesh = from_region(&image(), 0);
        let before = world_vertices(&mesh, &poses);
        bind(&mut mesh, vec![0, 1], 0, &bones, &poses).unwrap();
        for (a, b) in world_vertices(&mesh, &poses).iter().zip(&before) {
            assert!((a[0] - b[0]).abs() < 0.0001 && (a[1] - b[1]).abs() < 0.0001);
        }
        set_weight(&mut mesh, 0, 1, 0.75, &poses).unwrap();
        let mut changed = poses.clone();
        changed[1].x += 40.0;
        let after = world_vertices(&mesh, &changed);
        assert!((after[0][0] - before[0][0] - 30.0).abs() < 0.001);
        assert!(mesh
            .vertices
            .iter()
            .all(|v| (v.weights.iter().sum::<f32>() - 1.0).abs() < 1e-6));
    }
    #[test]
    fn inserting_vertices_splits_faces_or_boundary_edges_and_deletion_retriangulates() {
        let poses = vec![Pose {
            a: 1.0,
            b: 0.0,
            c: 0.0,
            d: 1.0,
            x: 0.0,
            y: 0.0,
            angle: 0.0,
        }];
        let mut mesh = from_region(&image(), 0);
        let center = add_vertex(&mut mesh, [0.0, 0.0], None, &poses).unwrap();
        assert_eq!(center, 4);
        assert_eq!(mesh.hull, 4);
        assert_eq!(mesh.vertices.len(), 5);
        let boundary = add_vertex(&mut mesh, [0.0, 50.0], Some([0, 1]), &poses).unwrap();
        assert_eq!(boundary, 1);
        assert_eq!(mesh.hull, 5);
        delete_vertex(&mut mesh, boundary).unwrap();
        assert_eq!(mesh.hull, 4);
        assert_eq!(mesh.vertices.len(), 5);
        mesh.triangles = triangulation::triangulate(&mesh.uvs, mesh.hull, &mesh.edges).unwrap();
        assert_eq!(mesh.triangles.len(), 12);
    }
}
