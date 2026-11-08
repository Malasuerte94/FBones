//! Mesh setup editing is distinct from deformation. Setup edits follow the
//! existing image mapping while deformation preserves UVs and triangle topology.
use crate::{mesh, project::AppError, rig::Pose, triangulation};
use fbones_format::minimal::meshes::Mesh;
type Point = [f64; 2];
const EPS: f64 = 1e-8;
fn invalid(message: &str) -> AppError {
    AppError::new("InvalidMesh", message)
}
fn uv_points(mesh: &Mesh) -> Vec<Point> {
    mesh.uvs
        .chunks_exact(2)
        .map(|p| [f64::from(p[0]), f64::from(p[1])])
        .collect()
}
fn sq_distance(a: Point, b: Point) -> f64 {
    (a[0] - b[0]).powi(2) + (a[1] - b[1]).powi(2)
}
fn barycentric(p: Point, a: Point, b: Point, c: Point) -> Option<[f64; 3]> {
    let area = triangulation::cross(a, b, c);
    if area.abs() < 1e-12 {
        return None;
    }
    let x = triangulation::cross(p, b, c) / area;
    let y = triangulation::cross(a, p, c) / area;
    Some([x, y, 1. - x - y])
}
fn face(points: &[Point], triangles: &[u16], p: Point) -> Option<([usize; 3], [f64; 3])> {
    triangles.chunks_exact(3).rev().find_map(|t| {
        let ids = [t[0] as usize, t[1] as usize, t[2] as usize];
        if ids.iter().any(|i| *i >= points.len()) {
            return None;
        }
        let b = barycentric(p, points[ids[0]], points[ids[1]], points[ids[2]])?;
        b.iter().all(|v| *v >= -EPS).then_some((ids, b))
    })
}
#[derive(Clone, Copy)]
struct Plane {
    x: [f64; 3],
    y: [f64; 3],
}
impl Plane {
    fn fit(uvs: &[Point], world: &[Point]) -> Result<Self, AppError> {
        let mut matrix = [[0.; 5]; 3];
        for (p, q) in uvs.iter().zip(world) {
            let v = [p[0], p[1], 1.];
            for i in 0..3 {
                for j in 0..3 {
                    matrix[i][j] += v[i] * v[j];
                }
                matrix[i][3] += v[i] * q[0];
                matrix[i][4] += v[i] * q[1];
            }
        }
        for column in 0..3 {
            let pivot = (column..3)
                .max_by(|a, b| {
                    matrix[*a][column]
                        .abs()
                        .total_cmp(&matrix[*b][column].abs())
                })
                .unwrap();
            matrix.swap(column, pivot);
            let divisor = matrix[column][column];
            if !divisor.is_finite() || divisor.abs() < 1e-12 {
                return Err(invalid(
                    "The current image plane is collapsed and cannot be edited.",
                ));
            }
            for value in &mut matrix[column][column..] {
                *value /= divisor;
            }
            let pivot_row = matrix[column];
            for (i, row) in matrix.iter_mut().enumerate() {
                if i == column {
                    continue;
                }
                let factor = row[column];
                for (value, pivot) in row[column..].iter_mut().zip(&pivot_row[column..]) {
                    *value -= factor * pivot;
                }
            }
        }
        Ok(Self {
            x: [matrix[0][3], matrix[1][3], matrix[2][3]],
            y: [matrix[0][4], matrix[1][4], matrix[2][4]],
        })
    }
    fn point(self, p: Point) -> Point {
        [
            self.x[0] * p[0] + self.x[1] * p[1] + self.x[2],
            self.y[0] * p[0] + self.y[1] * p[1] + self.y[2],
        ]
    }
    fn inverse(self, p: Point) -> Result<Point, AppError> {
        let det = self.x[0] * self.y[1] - self.x[1] * self.y[0];
        if !det.is_finite() || det.abs() < 1e-12 {
            return Err(invalid(
                "The current image plane is collapsed and cannot be edited.",
            ));
        }
        let (x, y) = (p[0] - self.x[2], p[1] - self.y[2]);
        Ok([
            (x * self.y[1] - y * self.x[1]) / det,
            (y * self.x[0] - x * self.y[0]) / det,
        ])
    }
}
struct Mapping {
    uvs: Vec<Point>,
    world: Vec<Point>,
    plane: Plane,
    triangles: Vec<u16>,
}
impl Mapping {
    fn new(mesh: &Mesh, poses: &[Pose]) -> Result<Self, AppError> {
        let uvs = uv_points(mesh);
        let world: Vec<_> = mesh::world_vertices(mesh, poses)
            .into_iter()
            .map(|p| p.map(f64::from))
            .collect();
        let plane = Plane::fit(&uvs, &world)?;
        Ok(Self {
            uvs,
            world,
            plane,
            triangles: mesh.triangles.clone(),
        })
    }
    fn world(&self, uv: Point) -> Point {
        if let Some((t, b)) = face(&self.uvs, &self.triangles, uv) {
            let mut p = [0.; 2];
            for i in 0..3 {
                for (axis, v) in p.iter_mut().enumerate() {
                    *v += self.world[t[i]][axis] * b[i];
                }
            }
            p
        } else {
            self.plane.point(uv)
        }
    }
    fn uv(&self, world: Point) -> Result<Point, AppError> {
        if let Some((t, b)) = face(&self.world, &self.triangles, world) {
            let mut p = [0.; 2];
            for i in 0..3 {
                for (axis, v) in p.iter_mut().enumerate() {
                    *v += self.uvs[t[i]][axis] * b[i];
                }
            }
            Ok(p)
        } else {
            self.plane.inverse(world)
        }
    }
}
fn valid_uvs(uvs: &[f32], hull: usize, edges: &[u32], triangles: &[u16]) -> Result<(), AppError> {
    let n = uvs.len() / 2;
    if !uvs.len().is_multiple_of(2)
        || !(3..=mesh::MAX_VERTICES).contains(&n)
        || !(3..=n).contains(&hull)
        || uvs
            .iter()
            .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
        || !edges.len().is_multiple_of(2)
        || edges.iter().any(|v| *v as usize >= n)
        || triangles.is_empty()
        || !triangles.len().is_multiple_of(3)
        || triangles.iter().any(|v| *v as usize >= n)
    {
        return Err(invalid(&format!(
            "Use valid mesh UVs, topology and at most {} vertices.",
            mesh::MAX_VERTICES
        )));
    }
    Ok(())
}
/// Preserve exact existing rows; interpolate dense weighted local positions in
/// old UV faces, including the plain dormant local field. Outside the old hull,
/// extend the nearest complete row by inverse world-delta vectors on ALL columns.
/// This is an explicit bounded FBones creation policy, not original parity.
pub(crate) fn remesh(
    mesh: &Mesh,
    uvs: Vec<f32>,
    triangles: Vec<u16>,
    edges: Vec<u32>,
    hull: usize,
    poses: &[Pose],
) -> Result<Mesh, AppError> {
    valid_uvs(&uvs, hull, &edges, &triangles)?;
    let mapping = Mapping::new(mesh, poses)?;
    let mut result = mesh.clone();
    result.uvs = uvs;
    result.triangles = triangles;
    result.edges = edges;
    result.hull = hull;
    result.vertices.clear();
    let mut targets = vec![];
    for pair in result.uvs.chunks_exact(2) {
        let uv = [f64::from(pair[0]), f64::from(pair[1])];
        if let Some(index) = mapping.uvs.iter().position(|p| *p == uv) {
            result.vertices.push(mesh.vertices[index].clone());
            targets.push(None);
            continue;
        }
        let target = mapping.world(uv).map(|v| v as f32);
        let row = if let Some((t, b)) = face(&mapping.uvs, &mesh.triangles, uv) {
            let sources = t.into_iter().zip(b).collect::<Vec<_>>();
            crate::binding::interpolate_vertex(
                crate::binding::DenseBindingRef {
                    weighted: mesh.weighted,
                    bones: &mesh.bones,
                    vertices: &mesh.vertices,
                },
                &sources,
                poses,
            )?
        } else {
            let nearest = mapping
                .uvs
                .iter()
                .enumerate()
                .min_by(|a, b| sq_distance(*a.1, uv).total_cmp(&sq_distance(*b.1, uv)))
                .unwrap()
                .0;
            mesh.vertices[nearest].clone()
        };
        result.vertices.push(row);
        targets.push(Some((
            target,
            face(&mapping.uvs, &mesh.triangles, uv).is_none(),
        )));
    }
    for (i, target) in targets.into_iter().enumerate() {
        if let Some((point, outside)) = target {
            crate::binding::position_new_vertex(
                &mut result.vertices[i],
                &result.bones,
                point,
                poses,
                outside,
            )?;
        }
    }
    // Validate the geometry independently even when callers supply triangles.
    triangulation::triangulate_with_metric(
        &result.uvs,
        result.hull,
        &result.edges,
        [
            f64::from(result.image.width),
            f64::from(result.image.height),
        ],
    )?;
    Ok(result)
}

pub(crate) fn retessellate(mesh: &mut Mesh, poses: &[Pose]) -> Result<(), AppError> {
    mesh.triangles = triangulation::triangulate_for_positions(
        &mesh.uvs,
        mesh.hull,
        &mesh.edges,
        &mesh::world_vertices(mesh, poses),
    )?;
    Ok(())
}
pub(crate) fn move_vertices(
    mesh: &mut Mesh,
    targets: &[(usize, [f32; 2])],
    poses: &[Pose],
    edit_uvs: bool,
) -> Result<(), AppError> {
    if targets.is_empty() || targets.len() > mesh::MAX_VERTICES {
        return Err(invalid(&format!(
            "Choose 1–{} mesh vertices.",
            mesh::MAX_VERTICES
        )));
    }
    let mut seen = std::collections::HashSet::new();
    if targets.iter().any(|(i, p)| {
        *i >= mesh.vertices.len()
            || !seen.insert(*i)
            || p.iter().any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
    }) {
        return Err(invalid(
            "Use distinct vertices and finite coordinates within ±1,000,000.",
        ));
    }
    let mut candidate = mesh.clone();
    if !edit_uvs {
        for (index, point) in targets {
            mesh::move_vertex(&mut candidate, *index, *point, poses)?;
        }
        *mesh = candidate;
        return Ok(());
    }
    let mapping = Mapping::new(mesh, poses)?;
    for (index, point) in targets {
        let uv = mapping.uv(point.map(f64::from))?.map(|v| v.clamp(0., 1.));
        candidate.uvs[*index * 2] = uv[0] as f32;
        candidate.uvs[*index * 2 + 1] = uv[1] as f32;
        mesh::move_vertex(
            &mut candidate,
            *index,
            mapping.world(uv).map(|v| v as f32),
            poses,
        )?;
    }
    retessellate(&mut candidate, poses)?;
    *mesh = candidate;
    Ok(())
}
fn edge_distance(p: Point, a: Point, b: Point) -> f64 {
    let (dx, dy) = (b[0] - a[0], b[1] - a[1]);
    let length = dx * dx + dy * dy;
    let t = if length > 0. {
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length
    } else {
        0.
    }
    .clamp(0., 1.);
    sq_distance(p, [a[0] + dx * t, a[1] + dy * t]).sqrt()
}
fn polygon_contains(p: Point, polygon: &[Point]) -> bool {
    let mut inside = false;
    for i in 0..polygon.len() {
        let a = polygon[i];
        let b = polygon[(i + 1) % polygon.len()];
        if edge_distance(p, a, b) < EPS {
            return true;
        }
        if (a[1] > p[1]) != (b[1] > p[1])
            && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]
        {
            inside = !inside;
        }
    }
    inside
}
fn push_uv(mesh: &Mesh, uv: Point, poses: &[Pose]) -> Result<(Mesh, usize, Vec<usize>), AppError> {
    let n = mesh.vertices.len();
    if n >= mesh::MAX_VERTICES {
        return Err(invalid(&format!(
            "This mesh already has {} vertices.",
            mesh::MAX_VERTICES
        )));
    }
    let old = uv_points(mesh);
    let mut raw = mesh.uvs.clone();
    raw.extend([uv[0] as f32, uv[1] as f32]);
    let boundary =
        (0..mesh.hull).find(|i| edge_distance(uv, old[*i], old[(*i + 1) % mesh.hull]) < EPS);
    if polygon_contains(uv, &old[..mesh.hull]) && boundary.is_none() {
        let triangles = triangulation::triangulate_with_metric(
            &raw,
            mesh.hull,
            &mesh.edges,
            [f64::from(mesh.image.width), f64::from(mesh.image.height)],
        )?;
        return Ok((
            remesh(mesh, raw, triangles, mesh.edges.clone(), mesh.hull, poses)?,
            n,
            (0..n).collect(),
        ));
    }
    let mut choices: Vec<_> = (0..mesh.hull).collect();
    choices.sort_by(|a, b| {
        edge_distance(uv, old[*a], old[(*a + 1) % mesh.hull]).total_cmp(&edge_distance(
            uv,
            old[*b],
            old[(*b + 1) % mesh.hull],
        ))
    });
    if let Some(edge) = boundary {
        choices = vec![edge];
    }
    for edge in choices {
        let at = edge + 1;
        let mut order: Vec<_> = (0..n).collect();
        order.insert(at, n);
        let mut remap = vec![0; n + 1];
        for (new, old) in order.iter().enumerate() {
            remap[*old] = new;
        }
        let uvs: Vec<_> = order
            .iter()
            .flat_map(|i| [raw[i * 2], raw[i * 2 + 1]])
            .collect();
        let mut constraints = vec![];
        for pair in mesh.edges.chunks_exact(2) {
            let (a, b) = (pair[0] as usize, pair[1] as usize);
            if (a == edge && b == (edge + 1) % mesh.hull)
                || (b == edge && a == (edge + 1) % mesh.hull)
            {
                continue;
            }
            constraints.extend([remap[a] as u32, remap[b] as u32]);
        }
        constraints.extend([
            remap[edge] as u32,
            at as u32,
            at as u32,
            remap[(edge + 1) % mesh.hull] as u32,
        ]);
        let Ok(triangles) = triangulation::triangulate_with_metric(
            &uvs,
            mesh.hull + 1,
            &constraints,
            [f64::from(mesh.image.width), f64::from(mesh.image.height)],
        ) else {
            continue;
        };
        let result = remesh(mesh, uvs, triangles, constraints, mesh.hull + 1, poses)?;
        remap.truncate(n);
        return Ok((result, at, remap));
    }
    Err(invalid(
        "This point cannot extend the mesh boundary without crossing an edge.",
    ))
}
/// One stroke is one atomic mutation. Setup endpoints can grow a cropped hull;
/// existing rows/influences survive reorder. The returned index is the endpoint.
pub(crate) fn stroke(
    mesh: &mut Mesh,
    from: Option<usize>,
    points: &[[f32; 2]],
    poses: &[Pose],
    edit_uvs: bool,
) -> Result<usize, AppError> {
    if points.is_empty()
        || points.len() > 128
        || from.is_some_and(|i| i >= mesh.vertices.len())
        || points
            .iter()
            .flatten()
            .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
    {
        return Err(invalid(
            "Use valid stroke endpoints and finite coordinates.",
        ));
    }
    let mut candidate = mesh.clone();
    let mapping = Mapping::new(mesh, poses)?;
    let mut anchor = from;
    let mut last = from.unwrap_or(0);
    for point in points {
        if !edit_uvs {
            let previous_len = candidate.vertices.len();
            let index = mesh::add_vertex(&mut candidate, *point, None, poses)?;
            if index < previous_len {
                anchor = anchor.map(|a| if a >= index { a + 1 } else { a });
            }
            if let Some(a) = anchor {
                mesh::edge(&mut candidate, a, index, false)?;
            }
            anchor = Some(index);
            last = index;
            continue;
        }
        let uv = mapping.uv(point.map(f64::from))?.map(|v| v.clamp(0., 1.));
        let existing = uv_points(&candidate)
            .iter()
            .position(|p| sq_distance(*p, uv) < 1e-12);
        let index = if let Some(i) = existing {
            i
        } else {
            let (next, index, remap) = push_uv(&candidate, uv, poses)?;
            anchor = anchor.map(|i| remap[i]);
            candidate = next;
            index
        };
        if let Some(a) = anchor {
            if a != index {
                mesh::edge(&mut candidate, a, index, false)?;
            }
        }
        last = index;
        anchor = Some(index);
    }
    if edit_uvs {
        retessellate(&mut candidate, poses)?;
    }
    *mesh = candidate;
    Ok(last)
}

#[cfg(test)]
mod tests {
    use super::*;
    use fbones_format::minimal::{meshes::quad, regions::Region, Bone};
    fn setup() -> (Mesh, Vec<Pose>) {
        let image = Region {
            name: "own".into(),
            path: String::new(),
            x: 0.,
            y: 0.,
            rotation: 0.,
            scale_x: 1.,
            scale_y: 1.,
            width: 100.,
            height: 100.,
        };
        (quad(image, 0), crate::rig::poses(&[Bone::root()]))
    }
    #[test]
    fn setup_move_follows_pixels_while_deformation_keeps_uvs() {
        let (mut mesh, poses) = setup();
        move_vertices(&mut mesh, &[(0, [-30., 40.])], &poses, true).unwrap();
        assert!((mesh.uvs[0] - 0.2).abs() < 1e-6);
        assert!((mesh.uvs[1] - 0.1).abs() < 1e-6);
        let before = mesh.uvs.clone();
        move_vertices(&mut mesh, &[(0, [-50., 70.])], &poses, false).unwrap();
        assert_eq!(mesh.uvs, before);
        let p = mesh::world_vertices(&mesh, &poses);
        assert!((p[0][0] + 50.).abs() < 1e-4 && (p[0][1] - 70.).abs() < 1e-4);
    }
    #[test]
    fn remesh_preserves_weighted_posed_shape_and_extends_the_image_plane() {
        let (mut mesh, _) = setup();
        let mut arm = Bone::root();
        arm.name = "arm".into();
        arm.parent = Some(0);
        arm.x = 20.;
        arm.length = 100.;
        let bones = vec![Bone::root(), arm];
        let mut poses = crate::rig::poses(&bones);
        mesh::bind(&mut mesh, vec![0, 1], 0, &bones, &poses).unwrap();
        mesh::set_weight(&mut mesh, 0, 1, 0.8, &poses).unwrap();
        poses[1].x += 20.;
        let before = mesh::world_vertices(&mesh, &poses);
        let mut uvs = mesh.uvs.clone();
        uvs.extend([0.25, 0.25]);
        let triangles = triangulation::triangulate(&uvs, 4, &mesh.edges).unwrap();
        let result = remesh(&mesh, uvs, triangles, mesh.edges.clone(), 4, &poses).unwrap();
        assert_eq!(&result.vertices[..4], &mesh.vertices);
        let mapped = Mapping::new(&mesh, &poses).unwrap().world([0.25, 0.25]);
        let after = mesh::world_vertices(&result, &poses);
        assert!(
            (after[4][0] - mapped[0] as f32).abs() < 1e-4
                && (after[4][1] - mapped[1] as f32).abs() < 1e-4
        );
        assert_eq!(&after[..4], &before);
    }
    #[test]
    fn strokes_connect_vertices_and_grow_a_trimmed_hull_without_losing_rows() {
        let (mesh, poses) = setup();
        let uvs = vec![0.2, 0.2, 0.8, 0.2, 0.8, 0.8, 0.2, 0.8];
        let triangles = triangulation::triangulate(&uvs, 4, &mesh.edges).unwrap();
        let mut mesh = remesh(&mesh, uvs, triangles, mesh.edges.clone(), 4, &poses).unwrap();
        let index = stroke(&mut mesh, Some(0), &[[0., 0.]], &poses, true).unwrap();
        assert_eq!(index, 4);
        assert!(mesh
            .edges
            .chunks_exact(2)
            .any(|e| e == [0, 4] || e == [4, 0]));
        let index = stroke(&mut mesh, Some(index), &[[45., 0.]], &poses, true).unwrap();
        assert_eq!(mesh.hull, 5);
        assert_eq!(mesh.vertices.len(), 6);
        let world = mesh::world_vertices(&mesh, &poses);
        assert!((world[index][0] - 45.).abs() < 1e-4);
    }
    #[test]
    fn failed_setup_edits_are_atomic() {
        let (mut mesh, poses) = setup();
        let before = mesh.clone();
        assert!(move_vertices(&mut mesh, &[(0, [50., -50.])], &poses, true).is_err());
        assert_eq!(mesh, before);
    }
    #[test]
    fn deformed_stroke_remaps_an_anchor_when_splitting_a_boundary_edge() {
        let (mut mesh, poses) = setup();
        let endpoint = stroke(&mut mesh, Some(1), &[[0., 50.]], &poses, false).unwrap();
        assert_eq!(endpoint, 1);
        assert_eq!(mesh.hull, 5);
        let points = mesh::world_vertices(&mesh, &poses);
        assert_eq!(points[2], [50., 50.]);
        assert!(mesh
            .edges
            .chunks_exact(2)
            .any(|e| e == [1, 2] || e == [2, 1]));
    }
    #[test]
    fn setup_uv_mapping_respects_full_affine_bone_scale_and_shear() {
        let (mut mesh, _) = setup();
        let mut bone = Bone::root();
        bone.x = 12.;
        bone.y = -7.;
        bone.rotation = 30.;
        bone.scale_x = 1.7;
        bone.scale_y = 0.8;
        bone.shear_x = 20.;
        bone.shear_y = -10.;
        let poses = crate::rig::poses(&[bone]);
        let (x, y) = poses[0].point(-30., 40.);
        move_vertices(&mut mesh, &[(0, [x, y])], &poses, true).unwrap();
        assert!((mesh.uvs[0] - 0.2).abs() < 1e-5 && (mesh.uvs[1] - 0.1).abs() < 1e-5);
        let point = mesh::world_vertices(&mesh, &poses)[0];
        assert!((point[0] - x).abs() < 1e-4 && (point[1] - y).abs() < 1e-4);
    }
}
