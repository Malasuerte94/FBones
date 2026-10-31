//! Bounded polygon edits on actual clipping attachments, without image/UV proxies.
use crate::{
    binding,
    project::AppError,
    rig::{Pose, VertexMove, WorldPoint},
};
#[cfg(test)]
use fbones_format::minimal::meshes::Vertex;
use fbones_format::minimal::scene::Clipping;
fn invalid() -> AppError {
    AppError::new(
        "InvalidClipping",
        "Use a noncrossing polygon with 3–256 distinct finite vertices.",
    )
}
pub(crate) fn world_vertices(c: &Clipping, poses: &[Pose]) -> Vec<[f32; 2]> {
    c.vertices
        .iter()
        .map(|v| binding::world_vertex(v, &c.bones, poses))
        .collect()
}
fn cross(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> f64 {
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}
fn on_segment(a: [f64; 2], b: [f64; 2], p: [f64; 2]) -> bool {
    cross(a, b, p).abs() < 1e-8
        && (0..2).all(|i| p[i] >= a[i].min(b[i]) - 1e-8 && p[i] <= a[i].max(b[i]) + 1e-8)
}
fn intersects(a: [f64; 2], b: [f64; 2], c: [f64; 2], d: [f64; 2]) -> bool {
    let (x, y, u, v) = (
        cross(a, b, c),
        cross(a, b, d),
        cross(c, d, a),
        cross(c, d, b),
    );
    ((x > 0.0 && y < 0.0) || (x < 0.0 && y > 0.0)) && ((u > 0.0 && v < 0.0) || (u < 0.0 && v > 0.0))
        || on_segment(a, b, c)
        || on_segment(a, b, d)
        || on_segment(c, d, a)
        || on_segment(c, d, b)
}
pub(crate) fn validate_polygon(c: &Clipping, poses: &[Pose]) -> Result<(), AppError> {
    let points = world_vertices(c, poses);
    let n = points.len();
    if !(3..=256).contains(&n)
        || points
            .iter()
            .flatten()
            .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
    {
        return Err(invalid());
    }
    let p: Vec<_> = points.iter().map(|p| p.map(f64::from)).collect();
    let mut area = 0.0;
    for i in 0..n {
        let j = (i + 1) % n;
        let previous = (i + n - 1) % n;
        if cross(p[previous], p[i], p[j]).abs() < 1e-8
            && (p[i][0] - p[previous][0]) * (p[j][0] - p[i][0])
                + (p[i][1] - p[previous][1]) * (p[j][1] - p[i][1])
                < 0.0
        {
            return Err(invalid());
        }
        area += p[i][0] * p[j][1] - p[i][1] * p[j][0];
        for k in 0..i {
            if (p[i][0] - p[k][0]).hypot(p[i][1] - p[k][1]) < 1e-6 {
                return Err(invalid());
            }
        }
        for k in i + 1..n {
            let l = (k + 1) % n;
            if j == k || l == i {
                continue;
            }
            if intersects(p[i], p[j], p[k], p[l]) {
                return Err(invalid());
            }
        }
    }
    if area.abs() < 1e-8 {
        return Err(invalid());
    }
    Ok(())
}
fn boundary(c: &mut Clipping) {
    let n = c.vertices.len();
    c.edges = (0..n)
        .flat_map(|i| [i as u32, ((i + 1) % n) as u32])
        .collect();
}
pub(crate) fn move_vertices(
    c: &mut Clipping,
    targets: &[VertexMove],
    poses: &[Pose],
) -> Result<(), AppError> {
    if targets.is_empty() || targets.len() > 256 {
        return Err(invalid());
    }
    let mut seen = std::collections::HashSet::new();
    let mut next = c.clone();
    let points = world_vertices(c, poses);
    for t in targets {
        if t.vertex >= c.vertices.len() || !seen.insert(t.vertex) {
            return Err(invalid());
        }
        binding::move_vertex(
            &mut next.vertices[t.vertex],
            &next.bones,
            points[t.vertex],
            [t.x, t.y],
            poses,
        )?;
    }
    boundary(&mut next);
    validate_polygon(&next, poses)?;
    *c = next;
    Ok(())
}
pub(crate) fn insert_vertex(
    c: &mut Clipping,
    index: usize,
    point: &WorldPoint,
    poses: &[Pose],
) -> Result<(), AppError> {
    let n = c.vertices.len();
    if n >= 256
        || index > n
        || !point.x.is_finite()
        || !point.y.is_finite()
        || point.x.abs() > 1_000_000.0
        || point.y.abs() > 1_000_000.0
    {
        return Err(invalid());
    }
    let points = world_vertices(c, poses);
    let a = (index + n - 1) % n;
    let b = index % n;
    let delta = [points[b][0] - points[a][0], points[b][1] - points[a][1]];
    let length = delta[0] * delta[0] + delta[1] * delta[1];
    if length < 1e-12 {
        return Err(invalid());
    }
    let t = (((point.x - points[a][0]) * delta[0] + (point.y - points[a][1]) * delta[1]) / length)
        .clamp(0.0, 1.0);
    let projected = [points[a][0] + delta[0] * t, points[a][1] + delta[1] * t];
    let mut row = binding::interpolate_vertex(
        binding::DenseBindingRef {
            weighted: c.weighted,
            bones: &c.bones,
            vertices: &c.vertices,
        },
        &[(a, f64::from(1. - t)), (b, f64::from(t))],
        poses,
    )?;
    let target = [point.x, point.y];
    binding::position_new_vertex(&mut row, &c.bones, target, poses, target != projected)?;
    let mut next = c.clone();
    next.vertices.insert(index, row);
    boundary(&mut next);
    validate_polygon(&next, poses)?;
    *c = next;
    Ok(())
}
pub(crate) fn delete_vertex(
    c: &mut Clipping,
    index: usize,
    poses: &[Pose],
) -> Result<(), AppError> {
    if c.vertices.len() <= 3 || index >= c.vertices.len() {
        return Err(invalid());
    }
    let mut next = c.clone();
    next.vertices.remove(index);
    boundary(&mut next);
    validate_polygon(&next, poses)?;
    *c = next;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::rig::poses;
    use fbones_format::minimal::Bone;
    fn sample() -> (Clipping, Vec<Pose>) {
        let mut root = Bone::root();
        root.rotation = 27.0;
        root.shear_y = 12.0;
        root.scale_x = 1.3;
        let mut b = Bone::root();
        b.name = "child".into();
        b.parent = Some(0);
        b.x = 16.0;
        b.y = 7.0;
        b.rotation = -38.0;
        b.scale_y = 0.8;
        let ps = poses(&[root, b]);
        let vertices = [[0.0, 0.0], [40.0, 0.0], [40.0, 40.0], [0.0, 40.0]]
            .iter()
            .map(|p| {
                let a = ps[0].inverse().unwrap().point(p[0], p[1]);
                let b = ps[1].inverse().unwrap().point(p[0], p[1]);
                Vertex {
                    weights: vec![0.4, 0.6],
                    positions: vec![a.0, a.1, b.0, b.1],
                }
            })
            .collect();
        (
            Clipping {
                name: "mask".into(),
                end_slot: Some(0),
                convex: false,
                inverse: false,
                color: [255; 4],
                weighted: true,
                bones: vec![0, 1],
                vertices,
                edges: vec![0, 1, 1, 2, 2, 3, 3, 0],
            },
            ps,
        )
    }
    #[test]
    fn weighted_moves_use_linear_deltas_without_rebasing_other_rows_or_weights() {
        let (mut c, ps) = sample();
        let before = c.clone();
        let target = VertexMove {
            vertex: 1,
            x: 50.0,
            y: 0.0,
        };
        move_vertices(&mut c, &[target], &ps).unwrap();
        assert!((world_vertices(&c, &ps)[1][0] - 50.0).abs() < 1e-4);
        assert_eq!(c.vertices[0], before.vertices[0]);
        assert_eq!(c.vertices[2..], before.vertices[2..]);
        assert_eq!(c.vertices[1].weights, before.vertices[1].weights);
        for (i, b) in c.bones.iter().enumerate() {
            let inverse = ps[*b].inverse().unwrap();
            assert!(
                (c.vertices[1].positions[i * 2]
                    - before.vertices[1].positions[i * 2]
                    - inverse.a * 10.0)
                    .abs()
                    < 1e-4
            );
            assert!(
                (c.vertices[1].positions[i * 2 + 1]
                    - before.vertices[1].positions[i * 2 + 1]
                    - inverse.b * 10.0)
                    .abs()
                    < 1e-4
            );
        }
    }
    #[test]
    fn insertion_and_deletion_preserve_existing_dense_rows_and_rebuild_boundary() {
        let (mut c, ps) = sample();
        c.vertices[1].weights = vec![0.7, 0.3];
        let before = c.clone();
        insert_vertex(&mut c, 1, &WorldPoint { x: 20.0, y: 0.0 }, &ps).unwrap();
        assert_eq!(c.vertices[0], before.vertices[0]);
        assert_eq!(c.vertices[2..], before.vertices[1..]);
        assert!((c.vertices[1].weights[0] - 0.55).abs() < 1e-5);
        let p = world_vertices(&c, &ps)[1];
        assert!((p[0] - 20.0).abs() < 1e-4 && p[1].abs() < 1e-4);
        assert_eq!(c.edges, vec![0, 1, 1, 2, 2, 3, 3, 4, 4, 0]);
        delete_vertex(&mut c, 1, &ps).unwrap();
        assert_eq!(c, before);
        delete_vertex(&mut c, 0, &ps).unwrap();
        let before = c.clone();
        assert!(delete_vertex(&mut c, 0, &ps).is_err());
        assert_eq!(c, before);
    }
    #[test]
    fn invalid_crossed_duplicate_and_singular_edits_are_atomic() {
        let (mut c, mut ps) = sample();
        let before = c.clone();
        for targets in [
            vec![VertexMove {
                vertex: 0,
                x: 50.0,
                y: 20.0,
            }],
            vec![VertexMove {
                vertex: 0,
                x: 40.0,
                y: 0.0,
            }],
            vec![
                VertexMove {
                    vertex: 0,
                    x: 1.0,
                    y: 1.0,
                },
                VertexMove {
                    vertex: 0,
                    x: 2.0,
                    y: 2.0,
                },
            ],
        ] {
            assert!(move_vertices(&mut c, &targets, &ps).is_err());
            assert_eq!(c, before);
        }
        assert!(insert_vertex(&mut c, 8, &WorldPoint { x: 0.0, y: 0.0 }, &ps).is_err());
        assert_eq!(c, before);
        ps[1].a = 0.0;
        ps[1].b = 0.0;
        ps[1].c = 0.0;
        ps[1].d = 0.0;
        assert!(move_vertices(
            &mut c,
            &[VertexMove {
                vertex: 1,
                x: 60.0,
                y: 0.0
            }],
            &ps
        )
        .is_err());
        assert_eq!(c, before);
    }
}
