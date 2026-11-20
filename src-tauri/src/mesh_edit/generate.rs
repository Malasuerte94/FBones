use super::{invalid, uv_points, valid_uvs, Point};
use crate::{
    mesh,
    project::AppError,
    triangulation::{cross, EPS},
};
use fbones_format::minimal::meshes::{Mesh, Vertex};
use std::collections::{btree_map::Entry, BTreeMap, HashSet};

type Edge = (usize, usize);

fn edge(a: usize, b: usize) -> Edge {
    (a.min(b), a.max(b))
}

struct EdgeUse {
    positive_side: bool,
    boundary: bool,
}

struct Segment {
    edge: Edge,
    min: Point,
    max: Point,
}

impl Segment {
    fn new(edge: Edge, points: &[Point]) -> Self {
        let (a, b) = (points[edge.0], points[edge.1]);
        Self {
            edge,
            min: [a[0].min(b[0]), a[1].min(b[1])],
            max: [a[0].max(b[0]), a[1].max(b[1])],
        }
    }

    fn contains(&self, point: Point) -> bool {
        (self.min[0]..=self.max[0]).contains(&point[0])
            && (self.min[1]..=self.max[1]).contains(&point[1])
    }
}

fn segments_conflict(first: &Segment, second: &Segment, points: &[Point]) -> bool {
    let (a, b) = first.edge;
    let (c, d) = second.edge;
    let [pa, pb, pc, pd] = [a, b, c, d].map(|i| points[i]);
    let [u, v] = [cross(pa, pb, pc), cross(pa, pb, pd)];
    let [s, t] = [cross(pc, pd, pa), cross(pc, pd, pb)];
    (u * v < 0.0 && s * t < 0.0)
        || (c != a && c != b && u == 0.0 && first.contains(pc))
        || (d != a && d != b && v == 0.0 && first.contains(pd))
        || (a != c && a != d && s == 0.0 && second.contains(pa))
        || (b != c && b != d && t == 0.0 && second.contains(pb))
}

/// Walk existing edges on the straight segment, including stored constraints
/// split by intermediate vertices. In a planar mesh there is at most one
/// forward edge along the line at each vertex.
fn visit_chain(
    a: usize,
    b: usize,
    points: &[Point],
    neighbors: &[Vec<usize>],
    mut visit: impl FnMut(Edge) -> bool,
) -> bool {
    let (start, end) = (points[a], points[b]);
    if start == end {
        return false;
    }
    let axis = if (end[0] - start[0]).abs() < (end[1] - start[1]).abs() {
        1
    } else {
        0
    };
    let direction = (end[axis] - start[axis]).signum();
    let coordinate = |vertex: usize| points[vertex][axis] * direction;
    let mut current = a;
    while current != b {
        let Some(next) = neighbors[current].iter().copied().find(|&next| {
            coordinate(next) > coordinate(current)
                && coordinate(next) <= coordinate(b)
                && cross(start, end, points[next]).abs() < EPS
        }) else {
            return false;
        };
        if !visit(edge(current, next)) {
            return false;
        }
        current = next;
    }
    true
}

fn validate_tessellation(mesh: &Mesh, points: &[Point]) -> Result<(), AppError> {
    let mut edges = BTreeMap::<Edge, EdgeUse>::new();
    for face in mesh.triangles.chunks_exact(3) {
        let (a, b, c) = (face[0] as usize, face[1] as usize, face[2] as usize);
        if cross(points[a], points[b], points[c]) == 0.0 {
            return Err(invalid("Generate requires nondegenerate UV triangles."));
        }
        for (u, v, other) in [(a, b, c), (b, c, a), (c, a, b)] {
            let key = edge(u, v);
            let side = cross(points[key.0], points[key.1], points[other]);
            if side == 0.0 {
                return Err(invalid("Generate requires nondegenerate UV triangles."));
            }
            let positive_side = side > 0.0;
            match edges.entry(key) {
                Entry::Vacant(entry) => {
                    entry.insert(EdgeUse {
                        positive_side,
                        boundary: true,
                    });
                }
                Entry::Occupied(mut entry) => {
                    let incidence = entry.get_mut();
                    if !incidence.boundary || incidence.positive_side == positive_side {
                        return Err(invalid(
                            "Generate requires UV faces with distinct interiors.",
                        ));
                    }
                    incidence.boundary = false;
                }
            }
        }
    }

    let mut segments: Vec<_> = edges.keys().map(|&key| Segment::new(key, points)).collect();
    segments.sort_by(|a, b| a.min[0].total_cmp(&b.min[0]));
    for (i, first) in segments.iter().enumerate() {
        for second in &segments[i + 1..] {
            if second.min[0] > first.max[0] {
                break;
            }
            if second.min[1] <= first.max[1]
                && first.min[1] <= second.max[1]
                && segments_conflict(first, second, points)
            {
                return Err(invalid(
                    "Generate requires a mesh without intersecting UV edges.",
                ));
            }
        }
    }

    let mut neighbors = vec![Vec::new(); points.len()];
    let mut boundary = vec![Vec::new(); points.len()];
    let mut boundary_count = 0;
    for (&(a, b), usage) in &edges {
        neighbors[a].push(b);
        neighbors[b].push(a);
        if usage.boundary {
            boundary[a].push(b);
            boundary[b].push(a);
            boundary_count += 1;
        }
    }
    // Nonoverlapping incident faces and a single ordered boundary establish
    // complete coverage, including concave hulls and mixed stored windings.
    let mut visited = HashSet::new();
    if boundary.iter().any(|row| !row.is_empty() && row.len() != 2)
        || !(0..mesh.hull).all(|a| {
            visit_chain(a, (a + 1) % mesh.hull, points, &boundary, |key| {
                visited.insert(key)
            })
        })
        || visited.len() != boundary_count
    {
        return Err(invalid(
            "Generate requires the UV triangles to cover the stored hull.",
        ));
    }
    for requested in mesh.edges.chunks_exact(2) {
        let (a, b) = (requested[0] as usize, requested[1] as usize);
        if !edges.contains_key(&edge(a, b)) && !visit_chain(a, b, points, &neighbors, |_| true) {
            return Err(invalid(
                "Generate requires each authored edge to be present in the UV mesh.",
            ));
        }
    }
    Ok(())
}

fn uv_words(uv: [f32; 2]) -> [u32; 2] {
    uv.map(|value| if value == 0.0 { 0 } else { value.to_bits() })
}

pub(crate) fn generate_vertices(source: &Mesh) -> Result<Mesh, AppError> {
    valid_uvs(&source.uvs, source.hull, &source.edges, &source.triangles)?;
    let count = source.uvs.len() / 2;
    if source.weighted
        || source.bones.len() != 1
        || source.vertices.len() != count
        || source.vertices.iter().any(|vertex| {
            vertex.weights != [1.0]
                || vertex.positions.len() != 2
                || vertex.positions.iter().any(|v| !v.is_finite())
        })
    {
        return Err(invalid(
            "Generate requires an unweighted mesh with finite local positions.",
        ));
    }
    if source.edges.len() > mesh::MAX_EDGE_INDICES
        || source.triangles.len() > mesh::MAX_TRIANGLE_INDICES
    {
        return Err(invalid(
            "The mesh already exceeds the supported topology limits.",
        ));
    }
    let capacity =
        (mesh::MAX_VERTICES - count).min((mesh::MAX_TRIANGLE_INDICES - source.triangles.len()) / 6);
    if capacity == 0 {
        return Err(invalid(
            "The mesh has no room for another vertex and its triangles.",
        ));
    }

    let points = uv_points(source);
    validate_tessellation(source, &points)?;
    let mut used: HashSet<_> = source
        .uvs
        .chunks_exact(2)
        .map(|uv| uv_words([uv[0], uv[1]]))
        .collect();
    let mut result = source.clone();
    result.triangles.clear();
    result
        .triangles
        .reserve(source.triangles.len() + 6 * capacity.min(source.triangles.len() / 3));
    for face in source.triangles.chunks_exact(3) {
        if result.vertices.len() - count == capacity {
            result.triangles.extend_from_slice(face);
            continue;
        }
        let ids = [face[0], face[1], face[2]].map(usize::from);
        let [a, b, c] = ids.map(|id| points[id]);
        let uv = [0, 1].map(|axis| ((a[axis] + b[axis] + c[axis]) / 3.0) as f32);
        let p = uv.map(f64::from);
        let winding = cross(a, b, c).signum();
        let areas = [cross(b, c, p), cross(c, a, p), cross(a, b, p)].map(|area| area * winding);
        if areas.iter().any(|&area| area <= 0.0) || !used.insert(uv_words(uv)) {
            result.triangles.extend_from_slice(face);
            continue;
        }
        // Use the three signed subareas at the UV that will actually be saved.
        let total: f64 = areas.iter().sum();
        let positions: [f32; 2] = [0, 1].map(|axis| {
            ids.into_iter()
                .zip(areas)
                .map(|(id, area)| f64::from(source.vertices[id].positions[axis]) * (area / total))
                .sum::<f64>() as f32
        });
        if positions.iter().any(|value| !value.is_finite()) {
            return Err(invalid(
                "Generate could not interpolate finite local positions.",
            ));
        }
        let new = result.vertices.len() as u16;
        result.uvs.extend_from_slice(&uv);
        result.vertices.push(Vertex {
            weights: vec![1.0],
            positions: positions.to_vec(),
        });
        let (a, b, c) = (face[0], face[1], face[2]);
        result
            .triangles
            .extend_from_slice(&[a, b, new, b, c, new, c, a, new]);
    }
    if result.vertices.len() == count {
        return Err(invalid(
            "No triangle has a distinct, representable interior vertex.",
        ));
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use fbones_format::minimal::{meshes::quad, regions::Region};

    fn square() -> Mesh {
        quad(
            Region {
                name: "square".into(),
                path: String::new(),
                x: 0.,
                y: 0.,
                rotation: 0.,
                scale_x: 1.,
                scale_y: 1.,
                width: 24.,
                height: 24.,
            },
            0,
        )
    }

    #[test]
    fn duplicate_uv_face_is_rejected_even_with_reversed_winding() {
        let mut mesh = square();
        mesh.triangles.extend_from_slice(&[2, 1, 0]);
        assert!(generate_vertices(&mesh).is_err());
    }

    #[test]
    fn mixed_winding_and_collinear_constraint_chains_are_preserved() {
        let mut mesh = square();
        mesh.uvs.extend_from_slice(&[0.5, 0.5, 0.5, 1e-11]);
        mesh.vertices.extend([[0., 0.], [0., 12.]].map(|p| Vertex {
            weights: vec![1.],
            positions: p.to_vec(),
        }));
        mesh.edges.extend_from_slice(&[0, 2]);
        mesh.triangles = vec![0, 5, 4, 5, 1, 4, 4, 2, 1, 2, 3, 4, 0, 3, 4];

        let generated = generate_vertices(&mesh).unwrap();
        assert_eq!(generated.hull, mesh.hull);
        assert_eq!(generated.edges, mesh.edges);
        assert_eq!(generated.vertices.len(), mesh.vertices.len() + 5);
        let points = uv_points(&generated);
        validate_tessellation(&generated, &points).unwrap();
        for (face, children) in mesh
            .triangles
            .chunks_exact(3)
            .zip(generated.triangles.chunks_exact(9))
        {
            let winding = |tri: &[u16]| {
                cross(
                    points[tri[0] as usize],
                    points[tri[1] as usize],
                    points[tri[2] as usize],
                )
                .signum()
            };
            assert!(children
                .chunks_exact(3)
                .all(|child| winding(child) == winding(face)));
        }
    }
}
