//! Bounded constrained triangulation in UV space. The hull is a simple polygon;
//! interior vertices split its faces, and explicit edges are inserted by flips.
use crate::project::AppError;
use std::collections::{BTreeMap, BTreeSet};
type Point = [f64; 2];
const EPS: f64 = 1e-10;
fn invalid() -> AppError {
    AppError::new(
        "InvalidMesh",
        "Use a simple mesh boundary and edges that do not cross.",
    )
}
pub(crate) fn cross(a: Point, b: Point, c: Point) -> f64 {
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}
pub(crate) fn barycentric(p: Point, a: Point, b: Point, c: Point) -> Option<[f64; 3]> {
    let area = cross(a, b, c);
    if area.abs() < EPS {
        return None;
    }
    let x = cross(p, b, c) / area;
    let y = cross(a, p, c) / area;
    let z = 1.0 - x - y;
    (x >= -EPS && y >= -EPS && z >= -EPS).then_some([x, y, z])
}
fn key(a: usize, b: usize) -> (usize, usize) {
    (a.min(b), a.max(b))
}
fn intersects(a: Point, b: Point, c: Point, d: Point) -> bool {
    let (u, v, s, t) = (
        cross(a, b, c),
        cross(a, b, d),
        cross(c, d, a),
        cross(c, d, b),
    );
    ((u > EPS && v < -EPS) || (u < -EPS && v > EPS))
        && ((s > EPS && t < -EPS) || (s < -EPS && t > EPS))
}
fn oriented(mut triangle: [usize; 3], points: &[Point]) -> [usize; 3] {
    if cross(
        points[triangle[0]],
        points[triangle[1]],
        points[triangle[2]],
    ) < 0.0
    {
        triangle.swap(1, 2);
    }
    triangle
}
fn edges(triangles: &[[usize; 3]]) -> BTreeMap<(usize, usize), Vec<usize>> {
    let mut result = BTreeMap::new();
    for (i, t) in triangles.iter().enumerate() {
        for j in 0..3 {
            result
                .entry(key(t[j], t[(j + 1) % 3]))
                .or_insert_with(Vec::new)
                .push(i);
        }
    }
    result
}

fn minimum_angle(t: [usize; 3], points: &[Point]) -> f64 {
    (0..3)
        .map(|i| {
            let a = points[t[i]];
            let b = points[t[(i + 1) % 3]];
            let c = points[t[(i + 2) % 3]];
            let (ux, uy, vx, vy) = (b[0] - a[0], b[1] - a[1], c[0] - a[0], c[1] - a[1]);
            (ux * vy - uy * vx).abs().atan2(ux * vx + uy * vy)
        })
        .fold(f64::INFINITY, f64::min)
}
/// Lawson-style max-min-angle flips. Explicit edges and hull segments remain
/// fixed; only convex adjacent faces can change. The monotonic quality test
/// avoids diagonal oscillation for cocircular points.
fn improve(
    triangles: &mut [[usize; 3]],
    points: &[Point],
    fixed: &BTreeSet<(usize, usize)>,
    metric: [f64; 2],
) {
    let longest = metric[0].max(metric[1]);
    let measured: Vec<_> = points
        .iter()
        .map(|p| [p[0] * metric[0] / longest, p[1] * metric[1] / longest])
        .collect();
    improve_measured(triangles, points, fixed, &measured);
}
fn improve_measured(
    triangles: &mut [[usize; 3]],
    points: &[Point],
    fixed: &BTreeSet<(usize, usize)>,
    measured: &[Point],
) {
    for _ in 0..points.len() * points.len() * 2 {
        let adjacent = edges(triangles);
        let mut changed = false;
        for (&(u, v), faces) in &adjacent {
            if faces.len() != 2 || fixed.contains(&(u, v)) {
                continue;
            }
            let a = triangles[faces[0]];
            let b = triangles[faces[1]];
            let p = *a.iter().find(|i| **i != u && **i != v).unwrap();
            let q = *b.iter().find(|i| **i != u && **i != v).unwrap();
            if p == q
                || adjacent.contains_key(&key(p, q))
                || !intersects(points[p], points[q], points[u], points[v])
                || !intersects(measured[p], measured[q], measured[u], measured[v])
            {
                continue;
            }
            let first = oriented([p, q, u], points);
            let second = oriented([q, p, v], points);
            let before = minimum_angle(a, measured).min(minimum_angle(b, measured));
            let after = minimum_angle(first, measured).min(minimum_angle(second, measured));
            if after > before + 1e-9 || ((after - before).abs() <= 1e-9 && key(p, q) < key(u, v)) {
                triangles[faces[0]] = first;
                triangles[faces[1]] = second;
                changed = true;
                break;
            }
        }
        if !changed {
            break;
        }
    }
}

pub(crate) fn triangulate(
    uvs: &[f32],
    hull: usize,
    constraints: &[u32],
) -> Result<Vec<u16>, AppError> {
    triangulate_with_metric(uvs, hull, constraints, [1.0, 1.0])
}
/// Use image dimensions or another positive axis metric to evaluate triangle
/// quality without changing UV-space topology/constraints.
pub(crate) fn triangulate_with_metric(
    uvs: &[f32],
    hull: usize,
    constraints: &[u32],
    metric: [f64; 2],
) -> Result<Vec<u16>, AppError> {
    let points: Vec<Point> = uvs
        .chunks_exact(2)
        .map(|p| [f64::from(p[0]), f64::from(p[1])])
        .collect();
    let n = points.len();
    if !uvs.len().is_multiple_of(2)
        || uvs.iter().any(|v| !v.is_finite())
        || metric.iter().any(|v| !v.is_finite() || *v <= 0.0)
    {
        return Err(invalid());
    }
    if !(3..=256).contains(&n) || hull < 3 || hull > n || !constraints.len().is_multiple_of(2) {
        return Err(invalid());
    }
    for i in 0..n {
        for j in 0..i {
            if (points[i][0] - points[j][0]).abs() < EPS
                && (points[i][1] - points[j][1]).abs() < EPS
            {
                return Err(invalid());
            }
        }
    }
    let mut fixed = BTreeSet::new();
    let mut requested: Vec<_> = (0..hull).map(|i| key(i, (i + 1) % hull)).collect();
    for edge in constraints.chunks_exact(2) {
        let (a, b) = (edge[0] as usize, edge[1] as usize);
        if a >= n || b >= n || a == b {
            return Err(invalid());
        }
        requested.push(key(a, b));
    }
    for &(a, b) in &requested {
        for &(c, d) in &requested {
            if intersects(points[a], points[b], points[c], points[d]) {
                return Err(invalid());
            }
        }
    }
    let area = (0..hull)
        .map(|i| {
            let a = points[i];
            let b = points[(i + 1) % hull];
            a[0] * b[1] - a[1] * b[0]
        })
        .sum::<f64>();
    if area.abs() < EPS {
        return Err(invalid());
    }
    let mut polygon: Vec<_> = (0..hull).collect();
    if area < 0.0 {
        polygon.reverse();
    }
    let mut triangles = vec![];
    while polygon.len() > 3 {
        let mut found = false;
        for i in 0..polygon.len() {
            let (a, b, c) = (
                polygon[(i + polygon.len() - 1) % polygon.len()],
                polygon[i],
                polygon[(i + 1) % polygon.len()],
            );
            if cross(points[a], points[b], points[c]) <= EPS {
                continue;
            }
            if polygon.iter().any(|j| {
                *j != a
                    && *j != b
                    && *j != c
                    && barycentric(points[*j], points[a], points[b], points[c]).is_some()
            }) {
                continue;
            }
            triangles.push([a, b, c]);
            polygon.remove(i);
            found = true;
            break;
        }
        if !found {
            return Err(invalid());
        }
    }
    triangles.push(oriented([polygon[0], polygon[1], polygon[2]], &points));
    for vertex in hull..n {
        let face = triangles
            .iter()
            .enumerate()
            .find_map(|(i, t)| {
                barycentric(points[vertex], points[t[0]], points[t[1]], points[t[2]])
                    .map(|b| (i, *t, b))
            })
            .ok_or_else(invalid)?;
        if let Some(zero) = face.2.iter().position(|b| b.abs() < EPS) {
            let (a, b) = (face.1[(zero + 1) % 3], face.1[(zero + 2) % 3]);
            let mut split = vec![];
            for t in triangles {
                if t.contains(&a) && t.contains(&b) {
                    let c = *t.iter().find(|i| **i != a && **i != b).unwrap();
                    split.push(oriented([a, vertex, c], &points));
                    split.push(oriented([vertex, b, c], &points));
                } else {
                    split.push(t);
                }
            }
            triangles = split;
        } else {
            triangles.remove(face.0);
            for i in 0..3 {
                triangles.push(oriented([face.1[i], face.1[(i + 1) % 3], vertex], &points));
            }
        }
    }
    // Split constraints at collinear vertices rather than letting an edge pass
    // through a vertex without an incidence. This also supports edge splits.
    for (a, b) in requested {
        let dx = points[b][0] - points[a][0];
        let dy = points[b][1] - points[a][1];
        let length = dx * dx + dy * dy;
        let mut chain: Vec<_> = (0..n)
            .filter_map(|i| {
                let t = ((points[i][0] - points[a][0]) * dx + (points[i][1] - points[a][1]) * dy)
                    / length;
                ((-EPS..=1.0 + EPS).contains(&t)
                    && cross(points[a], points[b], points[i]).abs() < EPS)
                    .then_some((t, i))
            })
            .collect();
        chain.sort_by(|a, b| a.0.total_cmp(&b.0));
        for pair in chain.windows(2) {
            let segment = key(pair[0].1, pair[1].1);
            let mut seen = BTreeSet::new();
            for _ in 0..n * n * 4 {
                let adjacent = edges(&triangles);
                if adjacent.contains_key(&segment) {
                    fixed.insert(segment);
                    break;
                }
                let signature: Vec<_> = adjacent.keys().copied().collect();
                if !seen.insert(signature) {
                    return Err(invalid());
                }
                let mut choices = vec![];
                for (&(u, v), faces) in &adjacent {
                    if faces.len() != 2
                        || fixed.contains(&(u, v))
                        || !intersects(points[segment.0], points[segment.1], points[u], points[v])
                    {
                        continue;
                    }
                    let p = *triangles[faces[0]]
                        .iter()
                        .find(|i| **i != u && **i != v)
                        .unwrap();
                    let q = *triangles[faces[1]]
                        .iter()
                        .find(|i| **i != u && **i != v)
                        .unwrap();
                    if p == q || !intersects(points[p], points[q], points[u], points[v]) {
                        continue;
                    }
                    if fixed
                        .iter()
                        .any(|(a, b)| intersects(points[p], points[q], points[*a], points[*b]))
                    {
                        continue;
                    }
                    choices.push((
                        intersects(points[segment.0], points[segment.1], points[p], points[q]),
                        faces[0],
                        faces[1],
                        p,
                        q,
                        u,
                        v,
                    ));
                }
                choices.sort_by_key(|c| c.0);
                let Some((_, first, second, p, q, u, v)) = choices.first().copied() else {
                    return Err(invalid());
                };
                triangles[first] = oriented([p, q, u], &points);
                triangles[second] = oriented([q, p, v], &points);
            }
            if !fixed.contains(&segment) {
                return Err(invalid());
            }
        }
    }
    improve(&mut triangles, &points, &fixed, metric);
    Ok(triangles.into_iter().flatten().map(|i| i as u16).collect())
}

/// Keep UV-space topology valid, but choose free diagonals using the actual
/// posed setup geometry. Deformation mode must not call this routine.
pub(crate) fn triangulate_for_positions(
    uvs: &[f32],
    hull: usize,
    constraints: &[u32],
    positions: &[[f32; 2]],
) -> Result<Vec<u16>, AppError> {
    let mut triangles: Vec<_> = triangulate(uvs, hull, constraints)?
        .chunks_exact(3)
        .map(|t| [t[0] as usize, t[1] as usize, t[2] as usize])
        .collect();
    let points: Vec<Point> = uvs
        .chunks_exact(2)
        .map(|p| [f64::from(p[0]), f64::from(p[1])])
        .collect();
    if positions.len() != points.len() || positions.iter().flatten().any(|v| !v.is_finite()) {
        return Err(invalid());
    }
    let xmin = positions
        .iter()
        .map(|p| f64::from(p[0]))
        .fold(f64::INFINITY, f64::min);
    let ymin = positions
        .iter()
        .map(|p| f64::from(p[1]))
        .fold(f64::INFINITY, f64::min);
    let xmax = positions
        .iter()
        .map(|p| f64::from(p[0]))
        .fold(f64::NEG_INFINITY, f64::max);
    let ymax = positions
        .iter()
        .map(|p| f64::from(p[1]))
        .fold(f64::NEG_INFINITY, f64::max);
    let scale = (xmax - xmin).max(ymax - ymin);
    if !scale.is_finite() || scale <= 0.0 {
        return Err(invalid());
    }
    let measured: Vec<_> = positions
        .iter()
        .map(|p| {
            [
                (f64::from(p[0]) - xmin) / scale,
                (f64::from(p[1]) - ymin) / scale,
            ]
        })
        .collect();
    let requested: Vec<_> = (0..hull)
        .map(|i| (i, (i + 1) % hull))
        .chain(
            constraints
                .chunks_exact(2)
                .map(|e| (e[0] as usize, e[1] as usize)),
        )
        .collect();
    let mut fixed = BTreeSet::new();
    for (a, b) in requested {
        let dx = points[b][0] - points[a][0];
        let dy = points[b][1] - points[a][1];
        let length = dx * dx + dy * dy;
        let mut chain: Vec<_> = (0..points.len())
            .filter_map(|i| {
                let t = ((points[i][0] - points[a][0]) * dx + (points[i][1] - points[a][1]) * dy)
                    / length;
                ((-EPS..=1.0 + EPS).contains(&t)
                    && cross(points[a], points[b], points[i]).abs() < EPS)
                    .then_some((t, i))
            })
            .collect();
        chain.sort_by(|a, b| a.0.total_cmp(&b.0));
        for pair in chain.windows(2) {
            fixed.insert(key(pair[0].1, pair[1].1));
        }
    }
    improve_measured(&mut triangles, &points, &fixed, &measured);
    Ok(triangles.into_iter().flatten().map(|i| i as u16).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn covers_concave_hulls_and_interior_points_without_crossing_constraints() {
        let uvs = [0., 0., 1., 0., 0.6, 0.5, 1., 1., 0., 1., 0.3, 0.5];
        let tris = triangulate(&uvs, 5, &[0, 5, 5, 4]).unwrap();
        assert_eq!(tris.len(), 15);
        let tuples: Vec<_> = tris
            .chunks_exact(3)
            .map(|t| [t[0] as usize, t[1] as usize, t[2] as usize])
            .collect();
        let e = edges(&tuples);
        assert!(e.contains_key(&(0, 5)) && e.contains_key(&(4, 5)));
        let points: Vec<_> = uvs
            .chunks_exact(2)
            .map(|p| [f64::from(p[0]), f64::from(p[1])])
            .collect();
        let area: f64 = tuples
            .iter()
            .map(|t| cross(points[t[0]], points[t[1]], points[t[2]]) / 2.0)
            .sum();
        assert!((area - 0.8).abs() < 1e-6);
    }
    #[test]
    fn inserts_a_requested_diagonal_and_rejects_crossed_edges_and_outside_points() {
        let square = [0., 0., 1., 0., 1., 1., 0., 1.];
        let tris = triangulate(&square, 4, &[0, 2]).unwrap();
        let tuples: Vec<_> = tris
            .chunks_exact(3)
            .map(|t| [t[0] as usize, t[1] as usize, t[2] as usize])
            .collect();
        assert!(edges(&tuples).contains_key(&(0, 2)));
        assert!(triangulate(&square, 4, &[0, 2, 1, 3]).is_err());
        assert!(triangulate(&[0., 0., 1., 0., 1., 1., 0., 1., 2., 2.], 4, &[]).is_err());
    }
    #[test]
    fn improves_a_skinny_free_diagonal_but_keeps_a_requested_one() {
        // Initial ear clipping chooses 1--3, whose smallest angle is tiny.
        let uvs = [0., 0., 1., 0., 1., 0.1, 0., 1.];
        let free = triangulate(&uvs, 4, &[]).unwrap();
        let triangles: Vec<_> = free
            .chunks_exact(3)
            .map(|t| [t[0] as usize, t[1] as usize, t[2] as usize])
            .collect();
        assert!(edges(&triangles).contains_key(&(0, 2)));
        let constrained = triangulate(&uvs, 4, &[1, 3]).unwrap();
        let triangles: Vec<_> = constrained
            .chunks_exact(3)
            .map(|t| [t[0] as usize, t[1] as usize, t[2] as usize])
            .collect();
        assert!(edges(&triangles).contains_key(&(1, 3)));
        assert!(triangulate(&[0., 0., 1., 0., 0., 1., 0.], 3, &[]).is_err());
        assert!(triangulate_with_metric(&uvs, 4, &[], [0., 1.]).is_err());
    }
}
