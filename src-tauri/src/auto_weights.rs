//! FBones' bounded automatic-weight solver, independently implemented.
//!
//! Evidence: FEATURE-UI/DATA-4.3.26 record one original Auto operation changing
//! weights while retaining all binding-position bits. The current official
//! Weights/Auto guide describes topology, selected scopes and a separate Update
//! Bindings action, but publishes no solver. Numerical Spine parity is unknown.
//!
//! FBones policy, recorded before implementation: triangle/manual-edge graph;
//! positive inverse-length conductances; segment-near seeds on each bone's
//! nearest connected surface(s); graph travel distances and screened diffusion;
//! deterministic largest-four normalization. Unseeded islands choose their
//! nearest bone. No diffusion crosses disconnected components. This is neither
//! visibility-aware surface voxelization nor a proprietary-algorithm claim.
//!
//! AUTO-SCOPE-DATA/UI-4.3.26 prove vertex isolation, selected-candidate zeroing
//! of outside weights, protected lock mass, and an empty eligible set no-op.
//! Scope uses the full original posed surface; up to four editable influences
//! may coexist with locked positives. These numerical/budget choices are our
//! algorithm, not proprietary solver parity. Locks are transient view state.
//!
//! Typed Scene operations preserve ALL binding-position bits, including dormant
//! [0,0] and negative zero. Only the explicit legacy wrapper initializes an old
//! zero-weight [0,0] placeholder if it becomes positive. That legacy fallback
//! cannot distinguish a genuine origin and is not reference-proven behavior.
//! Already posed bindings may move when weights change.
use crate::{project::AppError, rig::Pose};
use fbones_format::minimal::{meshes::Mesh, Bone};

const MAX_VERTICES: usize = 256;
const MAX_BONES: usize = 128;
const DIFFUSION_STEPS: usize = 48;
type Point = [f64; 2];
type Graph = Vec<Vec<(usize, f64)>>;

fn invalid(message: &str) -> AppError {
    AppError::new("InvalidAutoWeights", message)
}
fn distance(a: Point, b: Point) -> f64 {
    (a[0] - b[0]).hypot(a[1] - b[1])
}
fn segment_distance(p: Point, a: Point, b: Point) -> f64 {
    let d = [b[0] - a[0], b[1] - a[1]];
    let square = d[0] * d[0] + d[1] * d[1];
    let t = if square > 0.0 {
        ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / square
    } else {
        0.0
    }
    .clamp(0.0, 1.0);
    distance(p, [a[0] + d[0] * t, a[1] + d[1] * t])
}
fn median(values: &mut [f64], fallback: f64) -> f64 {
    if values.is_empty() {
        fallback
    } else {
        values.sort_by(f64::total_cmp);
        values[values.len() / 2]
    }
}
fn geometry(
    mesh: crate::binding::DenseBindingRef<'_>,
    poses: &[Pose],
) -> Result<Vec<Point>, AppError> {
    if mesh.vertices.len() < 3
        || mesh.vertices.len() > MAX_VERTICES
        || mesh.bones.is_empty()
        || mesh.bones.len() > MAX_BONES
        || mesh
            .bones
            .iter()
            .enumerate()
            .any(|(column, bone)| *bone >= poses.len() || mesh.bones[..column].contains(bone))
        || mesh.bones.iter().any(|bone| {
            poses.get(*bone).is_some_and(|pose| {
                [pose.x, pose.y, pose.a, pose.b, pose.c, pose.d]
                    .iter()
                    .any(|value| !value.is_finite())
            })
        })
        || mesh.vertices.iter().any(|row| {
            row.weights.len() != mesh.bones.len()
                || row.positions.len() != mesh.bones.len() * 2
                || row.weights.iter().any(|w| !w.is_finite() || *w < 0.0)
                || row.positions.iter().any(|p| !p.is_finite())
                || (row.weights.iter().sum::<f32>() - 1.0).abs() > 0.0001
        })
    {
        return Err(invalid(
            "Use a valid bounded mesh with normalized binding rows.",
        ));
    }
    let points: Vec<Point> = mesh
        .vertices
        .iter()
        .map(|row| {
            let mut point = [0.0; 2];
            for (column, weight) in row.weights.iter().enumerate() {
                if *weight == 0.0 {
                    continue;
                }
                let pose = poses[mesh.bones[column]];
                let x = f64::from(row.positions[column * 2]);
                let y = f64::from(row.positions[column * 2 + 1]);
                point[0] += (f64::from(pose.x) + f64::from(pose.a) * x + f64::from(pose.c) * y)
                    * f64::from(*weight);
                point[1] += (f64::from(pose.y) + f64::from(pose.b) * x + f64::from(pose.d) * y)
                    * f64::from(*weight);
            }
            point
        })
        .collect();
    if points.iter().flatten().any(|v| !v.is_finite()) {
        return Err(invalid(
            "The mesh's current world positions must be finite.",
        ));
    }
    Ok(points)
}
fn graph(mesh: BindingTopology<'_>, points: &[Point]) -> Result<Graph, AppError> {
    if !mesh.triangles.len().is_multiple_of(3)
        || !mesh.edges.len().is_multiple_of(2)
        || mesh.triangles.len() > 1536
        || mesh.edges.len() > 4096
    {
        return Err(invalid("Use valid triangle and edge arrays."));
    }
    let n = points.len();
    let mut connected = vec![vec![false; n]; n];
    let mut connect = |a: usize, b: usize| -> Result<(), AppError> {
        if a >= n || b >= n || a == b {
            return Err(invalid("A mesh edge references an invalid vertex."));
        }
        connected[a][b] = true;
        connected[b][a] = true;
        Ok(())
    };
    for triangle in mesh.triangles.chunks_exact(3) {
        connect(triangle[0] as usize, triangle[1] as usize)?;
        connect(triangle[1] as usize, triangle[2] as usize)?;
        connect(triangle[2] as usize, triangle[0] as usize)?;
    }
    for edge in mesh.edges.chunks_exact(2) {
        connect(edge[0] as usize, edge[1] as usize)?;
    }
    Ok(connected
        .iter()
        .enumerate()
        .map(|(i, row)| {
            row.iter()
                .enumerate()
                .filter(|(_, linked)| **linked)
                .map(|(j, _)| (j, distance(points[i], points[j])))
                .collect()
        })
        .collect())
}
fn components(graph: &Graph) -> Vec<Vec<usize>> {
    let mut visited = vec![false; graph.len()];
    let mut result = Vec::new();
    for start in 0..graph.len() {
        if visited[start] {
            continue;
        }
        let mut component = vec![start];
        visited[start] = true;
        let mut cursor = 0;
        while cursor < component.len() {
            let vertex = component[cursor];
            for (neighbor, _) in &graph[vertex] {
                if !visited[*neighbor] {
                    visited[*neighbor] = true;
                    component.push(*neighbor);
                }
            }
            cursor += 1;
        }
        component.sort_unstable();
        result.push(component);
    }
    result
}
fn travel_distances(
    graph: &Graph,
    component: &[usize],
    mut distances: Vec<f64>,
    floor: f64,
) -> Vec<f64> {
    let mut visited = vec![false; graph.len()];
    for _ in component {
        let next = component
            .iter()
            .copied()
            .filter(|v| !visited[*v])
            .min_by(|a, b| {
                distances[*a]
                    .total_cmp(&distances[*b])
                    .then_with(|| a.cmp(b))
            });
        let Some(vertex) = next else { break };
        if !distances[vertex].is_finite() {
            break;
        }
        visited[vertex] = true;
        for (neighbor, length) in &graph[vertex] {
            let candidate = distances[vertex] + length.max(floor);
            if candidate < distances[*neighbor] {
                distances[*neighbor] = candidate;
            }
        }
    }
    distances
}
fn normalize(weights: &mut [f32]) {
    let total: f64 = weights.iter().map(|w| f64::from(*w)).sum();
    for weight in weights.iter_mut() {
        *weight = (f64::from(*weight) / total) as f32;
    }
    let sum: f32 = weights.iter().sum();
    let largest = weights
        .iter()
        .enumerate()
        .max_by(|a, b| a.1.total_cmp(b.1))
        .map(|(i, _)| i)
        .unwrap_or(0);
    weights[largest] += 1.0 - sum;
}

fn distribute_scoped(
    weights: &mut [f32],
    ranked: &[(usize, f64)],
    locked: &[bool],
) -> Result<(), AppError> {
    let protected: f64 = weights
        .iter()
        .zip(locked)
        .filter(|(_, locked)| **locked)
        .map(|(weight, _)| f64::from(*weight))
        .sum();
    let remaining = (1.0 - protected).max(0.0);
    for (column, weight) in weights.iter_mut().enumerate() {
        if !locked[column] {
            *weight = 0.0;
        }
    }
    if remaining > 0.0 {
        // The four-editable budget never prunes a protected influence.
        let total: f64 = ranked.iter().take(4).map(|(_, weight)| *weight).sum();
        if !total.is_finite() || total <= 0.0 {
            return Err(invalid(
                "Scoped Auto needs finite positive candidate scores.",
            ));
        }
        for (column, weight) in ranked.iter().take(4) {
            weights[*column] = (*weight / total * remaining) as f32;
        }
        let largest = ranked[0].0;
        let residual = 1.0 - weights.iter().sum::<f32>();
        // Correct only an editable value. If protected f32 summation exceeds
        // one by a rounding ulp, do not manufacture a negative tiny weight.
        weights[largest] += residual.clamp(-weights[largest], 1.0 - weights[largest]);
    }
    if weights
        .iter()
        .any(|weight| !weight.is_finite() || *weight < 0.0)
        || (weights.iter().sum::<f32>() - 1.0).abs() > 0.0001
    {
        return Err(invalid(
            "Scoped Auto could not normalize without changing locked weights.",
        ));
    }
    Ok(())
}

/// Recompute a mesh's complete existing binding list. Does not bind new bones.
/// Changes are staged and committed only after every required inverse succeeds.
#[derive(Clone, Copy)]
pub(crate) struct BindingTopology<'a> {
    pub triangles: &'a [u16],
    pub edges: &'a [u32],
}

/// Vertices are row indices; bone values are global project indices, not dense
/// binding columns or public stable IDs. The Scene bridge resolves those IDs.
/// Omitted selections mean all; explicit empty selections are invalid.
#[derive(Clone, Debug, Default)]
pub(crate) struct AutoScope {
    pub vertices: Option<Vec<usize>>,
    pub bones: Option<Vec<usize>>,
    pub locked_bones: Vec<usize>,
}

struct ScopeMasks {
    vertices: Vec<bool>,
    candidates: Vec<usize>,
    locked: Vec<bool>,
    full: bool,
}

fn scope_masks(
    scope: &AutoScope,
    mesh: crate::binding::DenseBindingRef<'_>,
) -> Result<ScopeMasks, AppError> {
    let mut vertices = vec![true; mesh.vertices.len()];
    if let Some(selected) = &scope.vertices {
        vertices.fill(false);
        if selected.is_empty() {
            return Err(invalid("An explicit vertex scope cannot be empty."));
        }
        for vertex in selected {
            let Some(entry) = vertices.get_mut(*vertex) else {
                return Err(invalid("A scoped vertex no longer exists."));
            };
            if *entry {
                return Err(invalid("A vertex scope cannot contain duplicates."));
            }
            *entry = true;
        }
    }
    let columns = |indices: &[usize], allow_empty: bool| -> Result<Vec<bool>, AppError> {
        if !allow_empty && indices.is_empty() {
            return Err(invalid("An explicit bone scope cannot be empty."));
        }
        let mut result = vec![false; mesh.bones.len()];
        for bone in indices {
            let Some(column) = mesh.bones.iter().position(|member| member == bone) else {
                return Err(invalid("A scoped bone must belong to this binding."));
            };
            if result[column] {
                return Err(invalid("A bone scope cannot contain duplicates."));
            }
            result[column] = true;
        }
        Ok(result)
    };
    let selected = match &scope.bones {
        Some(bones) => columns(bones, false)?,
        None => vec![true; mesh.bones.len()],
    };
    let locked = columns(&scope.locked_bones, true)?;
    let candidates = selected
        .iter()
        .enumerate()
        .filter_map(|(i, selected)| (*selected && !locked[i]).then_some(i))
        .collect::<Vec<_>>();
    let full = candidates.len() == mesh.bones.len();
    Ok(ScopeMasks {
        vertices,
        candidates,
        locked,
        full,
    })
}

pub(crate) fn apply(mesh: &mut Mesh, bones: &[Bone], poses: &[Pose]) -> Result<(), AppError> {
    apply_binding(
        crate::binding::DenseBindingMut {
            weighted: &mut mesh.weighted,
            bones: &mut mesh.bones,
            vertices: &mut mesh.vertices,
        },
        BindingTopology {
            triangles: &mesh.triangles,
            edges: &mesh.edges,
        },
        bones,
        poses,
        crate::binding::PositionPolicy::LegacyInitializeDormant,
    )
}

pub(crate) fn apply_binding(
    binding: crate::binding::DenseBindingMut<'_>,
    topology: BindingTopology<'_>,
    bones: &[Bone],
    poses: &[Pose],
    policy: crate::binding::PositionPolicy,
) -> Result<(), AppError> {
    apply_binding_scoped(
        binding,
        topology,
        bones,
        poses,
        policy,
        &AutoScope::default(),
    )
}

pub(crate) fn apply_binding_scoped(
    binding: crate::binding::DenseBindingMut<'_>,
    topology: BindingTopology<'_>,
    bones: &[Bone],
    poses: &[Pose],
    policy: crate::binding::PositionPolicy,
    scope: &AutoScope,
) -> Result<(), AppError> {
    let mesh = binding.as_ref();
    if mesh.bones.iter().any(|bone| *bone >= bones.len()) {
        return Err(invalid("Bind only bones that exist in this project."));
    }
    let points = geometry(mesh, poses)?;
    let scope = scope_masks(scope, mesh)?;
    if !mesh.weighted {
        return Ok(());
    }
    let graph = graph(topology, &points)?;
    if scope.candidates.is_empty() {
        // Exact selected-B/locked-B observation: no clear, rebind or fallback.
        return Ok(());
    }
    let components = components(&graph);
    let columns = mesh.bones.len();
    let mut edges: Vec<_> = graph
        .iter()
        .flatten()
        .map(|(_, length)| *length)
        .filter(|d| *d > 0.0)
        .collect();
    let global_scale = median(&mut edges, 1.0).max(f64::MIN_POSITIVE);
    let mut scales = Vec::new();
    let mut direct = vec![vec![0.0; columns]; points.len()];
    for (column, bone) in mesh.bones.iter().enumerate() {
        let p = poses[*bone];
        let origin = [f64::from(p.x), f64::from(p.y)];
        let length = f64::from(bones[*bone].length);
        let tip = [
            origin[0] + f64::from(p.a) * length,
            origin[1] + f64::from(p.b) * length,
        ];
        if origin.iter().chain(tip.iter()).any(|v| !v.is_finite()) {
            return Err(invalid(
                "Binding bone segments must have finite world coordinates.",
            ));
        }
        for (vertex, point) in points.iter().enumerate() {
            direct[vertex][column] = segment_distance(*point, origin, tip);
        }
    }
    let minima: Vec<Vec<f64>> = components
        .iter()
        .map(|vertices| {
            (0..columns)
                .map(|bone| {
                    vertices
                        .iter()
                        .map(|v| direct[*v][bone])
                        .fold(f64::INFINITY, f64::min)
                })
                .collect()
        })
        .collect();
    let nearest_component: Vec<f64> = (0..columns)
        .map(|bone| {
            minima
                .iter()
                .map(|row| row[bone])
                .fold(f64::INFINITY, f64::min)
        })
        .collect();
    let mut prior = vec![vec![0.0; columns]; points.len()];
    for (component_index, vertices) in components.iter().enumerate() {
        let mut lengths: Vec<_> = vertices
            .iter()
            .flat_map(|v| graph[*v].iter().map(|(_, d)| *d))
            .filter(|d| *d > 0.0)
            .collect();
        let scale = median(&mut lengths, global_scale).max(global_scale * 1e-6);
        scales.push(scale);
        let epsilon = scale * 1e-6;
        let mut eligible: Vec<_> = scope
            .candidates
            .iter()
            .copied()
            .filter(|bone| minima[component_index][*bone] <= nearest_component[*bone] + epsilon)
            .collect();
        if eligible.is_empty() {
            let bone = scope
                .candidates
                .iter()
                .copied()
                .min_by(|a, b| {
                    minima[component_index][*a]
                        .total_cmp(&minima[component_index][*b])
                        .then_with(|| mesh.bones[*a].cmp(&mesh.bones[*b]))
                })
                .unwrap();
            eligible.push(bone);
        }
        for bone in eligible {
            let mut distances = vec![f64::INFINITY; points.len()];
            let threshold = minima[component_index][bone] + scale * 0.25;
            for vertex in vertices {
                if direct[*vertex][bone] <= threshold {
                    distances[*vertex] = direct[*vertex][bone];
                }
            }
            let distances = travel_distances(&graph, vertices, distances, epsilon);
            for vertex in vertices {
                prior[*vertex][bone] = 1.0 / (distances[*vertex] / scale + 0.5).powi(2);
            }
        }
        for vertex in vertices {
            let sum: f64 = prior[*vertex].iter().sum();
            for weight in &mut prior[*vertex] {
                *weight /= sum;
            }
        }
    }
    let mut weights = prior.clone();
    for _ in 0..DIFFUSION_STEPS {
        let mut next = prior.clone();
        let mut change: f64 = 0.0;
        for (component, scale) in components.iter().zip(&scales) {
            for vertex in component {
                if graph[*vertex].is_empty() {
                    continue;
                }
                let total: f64 = graph[*vertex]
                    .iter()
                    .map(|(_, length)| 1.0 / length.max(scale * 1e-6))
                    .sum();
                for bone in 0..columns {
                    let neighbor: f64 = graph[*vertex]
                        .iter()
                        .map(|(v, length)| weights[*v][bone] / length.max(scale * 1e-6))
                        .sum::<f64>()
                        / total;
                    next[*vertex][bone] = (prior[*vertex][bone] + 1.5 * neighbor) / 2.5;
                    change = change.max((next[*vertex][bone] - weights[*vertex][bone]).abs());
                }
            }
        }
        weights = next;
        if change < 1e-9 {
            break;
        }
    }
    let mut vertices = mesh.vertices.to_vec();
    for (index, row) in vertices.iter_mut().enumerate() {
        if !scope.vertices[index] {
            continue;
        }
        let mut ranked: Vec<_> = scope
            .candidates
            .iter()
            .map(|column| (*column, weights[index][*column]))
            .collect();
        ranked.sort_by(|a, b| {
            b.1.total_cmp(&a.1)
                .then_with(|| mesh.bones[a.0].cmp(&mesh.bones[b.0]))
        });
        if scope.full {
            // Retain the old complete-Auto cast/sum/correction order exactly.
            row.weights.fill(0.0);
            for (bone, weight) in ranked.into_iter().take(4) {
                row.weights[bone] = weight as f32;
            }
            normalize(&mut row.weights);
        } else {
            distribute_scoped(&mut row.weights, &ranked, &scope.locked)?;
        }
        for (column, bone) in mesh.bones.iter().enumerate() {
            let old = &mesh.vertices[index];
            let x = column * 2;
            if matches!(
                policy,
                crate::binding::PositionPolicy::LegacyInitializeDormant
            ) && row.weights[column] > 0.0
                && old.weights[column] == 0.0
                && old.positions[x] == 0.0
                && old.positions[x + 1] == 0.0
            {
                let inverse = poses[*bone].inverse()?;
                let point = inverse.point(points[index][0] as f32, points[index][1] as f32);
                if !point.0.is_finite() || !point.1.is_finite() {
                    return Err(invalid(
                        "A new influence cannot represent this vertex's world position.",
                    ));
                }
                row.positions[x] = point.0;
                row.positions[x + 1] = point.1;
            }
        }
    }
    *binding.vertices = vertices;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rig::{poses, zero};
    use fbones_format::minimal::{meshes::Vertex, regions::Region};

    fn bone(x: f32, y: f32, length: f32) -> Bone {
        Bone {
            x,
            y,
            length,
            ..Bone::root()
        }
    }
    #[test]
    fn full_mode_pre_scope_output_bits_are_stable() {
        let bones = [bone(0., 0., 4.), bone(6., 2., 4.)];
        let mut surface = mesh(&[[0., 1.], [5., 2.], [10., 1.]], vec![0, 1, 2], &bones);
        apply(&mut surface, &bones, &poses(&bones)).unwrap();
        // Captured from the pre-scope full solver before this extension.
        assert_eq!(
            weights(&surface),
            [1058161774, 1054570275, 1053970597, 1058461613, 1051082161, 1059905831]
        );
    }
    #[test]
    fn typed_polygon_auto_preserves_legitimate_dormant_origins_without_an_image() {
        let bones = vec![bone(0., 0., 40.), bone(50., 0., 40.)];
        let poses = poses(&bones);
        let mut weighted = true;
        let mut bound = vec![0, 1];
        let mut rows = [[0., 0.], [30., 0.], [30., 60.], [0., 60.]]
            .into_iter()
            .map(|p| Vertex {
                weights: vec![0.5, 0.5],
                positions: vec![p[0], p[1], p[0] - 50., p[1]],
            })
            .collect::<Vec<_>>();
        rows[0].weights = vec![1., 0.];
        rows[0].positions = vec![-0.0, 0., 0., 0.];
        let bits = rows
            .iter()
            .flat_map(|r| r.positions.iter().map(|p| p.to_bits()))
            .collect::<Vec<_>>();
        apply_binding(
            crate::binding::DenseBindingMut {
                weighted: &mut weighted,
                bones: &mut bound,
                vertices: &mut rows,
            },
            BindingTopology {
                triangles: &[],
                edges: &[0, 1, 1, 2, 2, 3, 3, 0],
            },
            &bones,
            &poses,
            crate::binding::PositionPolicy::PreserveAll,
        )
        .unwrap();
        assert!(
            rows[0].weights[1] > 0.,
            "The dormant origin must actually become influential"
        );
        assert_eq!(
            rows.iter()
                .flat_map(|r| r.positions.iter().map(|p| p.to_bits()))
                .collect::<Vec<_>>(),
            bits
        );
        assert!(rows
            .iter()
            .all(|r| (r.weights.iter().sum::<f32>() - 1.).abs() < 1e-6));
    }
    fn mesh(points: &[[f32; 2]], triangles: Vec<u16>, bones: &[Bone]) -> Mesh {
        let poses = poses(bones);
        let mut result = Mesh {
            image: Region {
                name: "own-auto-surface".into(),
                path: String::new(),
                x: 0.0,
                y: 0.0,
                rotation: 0.0,
                scale_x: 1.0,
                scale_y: 1.0,
                width: 200.0,
                height: 200.0,
            },
            weighted: true,
            bones: (0..bones.len()).collect(),
            vertices: points
                .iter()
                .map(|p| Vertex {
                    weights: vec![1.0 / bones.len() as f32; bones.len()],
                    positions: poses
                        .iter()
                        .flat_map(|pose| {
                            let local = pose.inverse().unwrap().point(p[0], p[1]);
                            [local.0, local.1]
                        })
                        .collect(),
                })
                .collect(),
            uvs: points
                .iter()
                .flat_map(|p| [(p[0] + 500.0) / 1000.0, (p[1] + 500.0) / 1000.0])
                .collect(),
            triangles,
            edges: Vec::new(),
            hull: points.len(),
        };
        for row in &mut result.vertices {
            normalize(&mut row.weights);
        }
        result
    }
    fn strip(centers: &[[f32; 2]], bones: &[Bone]) -> Mesh {
        let points: Vec<_> = centers
            .iter()
            .enumerate()
            .flat_map(|(index, p)| {
                let previous = centers[index.saturating_sub(1)];
                let next = centers[(index + 1).min(centers.len() - 1)];
                let dx = next[0] - previous[0];
                let dy = next[1] - previous[1];
                let length = dx.hypot(dy).max(f32::MIN_POSITIVE);
                let nx = -dy / length * 0.1;
                let ny = dx / length * 0.1;
                [[p[0] - nx, p[1] - ny], [p[0] + nx, p[1] + ny]]
            })
            .collect();
        let triangles = (0..centers.len() - 1)
            .flat_map(|i| {
                let a = (i * 2) as u16;
                [a, a + 1, a + 2, a + 1, a + 3, a + 2]
            })
            .collect();
        mesh(&points, triangles, bones)
    }
    fn positions(mesh: &Mesh) -> Vec<u32> {
        mesh.vertices
            .iter()
            .flat_map(|v| v.positions.iter().map(|p| p.to_bits()))
            .collect()
    }
    fn weights(mesh: &Mesh) -> Vec<u32> {
        mesh.vertices
            .iter()
            .flat_map(|v| v.weights.iter().map(|w| w.to_bits()))
            .collect()
    }
    fn assert_normalized(mesh: &Mesh) {
        for vertex in &mesh.vertices {
            assert!(vertex
                .weights
                .iter()
                .all(|w| w.is_finite() && *w >= 0.0 && *w <= 1.0));
            assert!((vertex.weights.iter().sum::<f32>() - 1.0).abs() < 0.000_001);
            assert!(vertex.weights.iter().filter(|w| **w > 0.0).count() <= 4);
        }
    }
    fn scoped(
        surface: &mut Mesh,
        bones: &[Bone],
        poses: &[Pose],
        scope: &AutoScope,
    ) -> Result<(), AppError> {
        apply_binding_scoped(
            crate::binding::DenseBindingMut {
                weighted: &mut surface.weighted,
                bones: &mut surface.bones,
                vertices: &mut surface.vertices,
            },
            BindingTopology {
                triangles: &surface.triangles,
                edges: &surface.edges,
            },
            bones,
            poses,
            crate::binding::PositionPolicy::PreserveAll,
            scope,
        )
    }
    #[test]
    fn explicit_full_scope_preserves_full_output_bits_independent_of_selection_order() {
        let bones = [bone(0., 0., 4.), bone(6., 2., 4.)];
        let source = mesh(&[[0., 1.], [5., 2.], [10., 1.]], vec![0, 1, 2], &bones);
        let poses = poses(&bones);
        let mut old_full = source.clone();
        apply(&mut old_full, &bones, &poses).unwrap();
        for scope in [
            AutoScope::default(),
            AutoScope {
                vertices: Some(vec![2, 0, 1]),
                bones: Some(vec![1, 0]),
                locked_bones: vec![],
            },
        ] {
            let mut result = source.clone();
            scoped(&mut result, &bones, &poses, &scope).unwrap();
            assert_eq!(weights(&result), weights(&old_full));
            assert_eq!(positions(&result), positions(&old_full));
            assert_eq!(result, old_full);
        }
    }
    #[test]
    fn combined_zero_mass_single_candidate_changes_only_selected_row_and_keeps_all_position_bits() {
        let bones = [bone(0., 0., 0.), bone(10., 0., 0.), bone(30., 0., 0.)];
        let mut surface = mesh(&[[0., 1.], [5., 2.], [10., 1.]], vec![0, 1, 2], &bones);
        surface.vertices[1].weights = vec![0.6, 0., 0.4];
        surface.vertices[1].positions[2] = -0.;
        surface.vertices[1].positions[3] = 0.;
        let before = surface.clone();
        let mut posed = poses(&bones);
        posed[1].y += 25.;
        scoped(
            &mut surface,
            &bones,
            &posed,
            &AutoScope {
                vertices: Some(vec![1]),
                bones: Some(vec![1]),
                locked_bones: vec![],
            },
        )
        .unwrap();
        assert_eq!(surface.vertices[1].weights, [0., 1., 0.]);
        for row in [0, 2] {
            assert_eq!(surface.vertices[row], before.vertices[row]);
        }
        assert_eq!(positions(&surface), positions(&before));
        assert_eq!(surface.bones, before.bones);
        assert_eq!(surface.triangles, before.triangles);
        assert_eq!(surface.uvs, before.uvs);
        // The genuine dormant origin is not rebound: its new world location
        // exposes the stored coordinate under the already posed candidate.
        assert_eq!(crate::mesh::world_vertices(&surface, &posed)[1], [10., 25.]);
    }
    #[test]
    fn vertex_scope_keeps_entire_bent_surface_for_travel_and_diffusion() {
        let bones = [bone(0., 0., 0.), bone(2., 10., 0.), bone(100., 0., 0.)];
        let mut surface = strip(
            &[
                [0., 10.],
                [0., 8.],
                [0., 6.],
                [0., 4.],
                [0., 2.],
                [0., 0.],
                [2., 0.],
                [2., 2.],
                [2., 4.],
                [2., 6.],
                [2., 8.],
                [2., 10.],
            ],
            &bones,
        );
        for row in &mut surface.vertices {
            row.weights = vec![0.2, 0.3, 0.5];
        }
        let before = surface.clone();
        let last = surface.vertices.len() - 1;
        let scope = AutoScope {
            vertices: Some(vec![last, 0]),
            bones: Some(vec![1, 0]),
            locked_bones: vec![2],
        };
        scoped(&mut surface, &bones, &poses(&bones), &scope).unwrap();
        assert!(
            surface.vertices[0].weights[0] > 0.325,
            "The nearby opposite branch cannot replace the full graph: {:?}",
            surface.vertices[0].weights
        );
        assert!(surface.vertices[last].weights[1] > 0.425);
        for i in 0..surface.vertices.len() {
            assert_eq!(
                surface.vertices[i].weights[2].to_bits(),
                before.vertices[i].weights[2].to_bits()
            );
            if i != 0 && i != last {
                assert_eq!(surface.vertices[i], before.vertices[i]);
            }
        }
        assert_eq!(positions(&surface), positions(&before));
        assert_normalized(&surface);
    }
    #[test]
    fn restriction_precedes_top_four_and_locks_do_not_consume_editable_budget() {
        let bones = vec![Bone::root(); 8];
        let source = mesh(&[[0., 0.], [0., 0.], [0., 0.]], vec![0, 1, 2], &bones);
        let mut restricted = source.clone();
        scoped(
            &mut restricted,
            &bones,
            &poses(&bones),
            &AutoScope {
                bones: Some(vec![7, 6]),
                ..AutoScope::default()
            },
        )
        .unwrap();
        for row in &restricted.vertices {
            assert_eq!(row.weights, [0., 0., 0., 0., 0., 0., 0.5, 0.5]);
        }
        let mut protected = source.clone();
        for row in &mut protected.vertices {
            row.weights = vec![0.1, 0.1, 0.1, 0.1, 0.15, 0.15, 0.15, 0.15];
        }
        let before = weights(&protected);
        scoped(
            &mut protected,
            &bones,
            &poses(&bones),
            &AutoScope {
                locked_bones: vec![3, 1, 0, 2],
                ..AutoScope::default()
            },
        )
        .unwrap();
        for (i, row) in protected.vertices.iter().enumerate() {
            for (column, weight) in row.weights.iter().enumerate().take(4) {
                assert_eq!(weight.to_bits(), before[i * 8 + column]);
            }
            assert_eq!(row.weights.iter().filter(|w| **w > 0.).count(), 8);
            assert!((row.weights.iter().sum::<f32>() - 1.).abs() < 1e-6);
        }
        assert_eq!(positions(&protected), positions(&source));
    }
    #[test]
    fn lock_bits_include_negative_zero_and_empty_eligible_selection_is_a_true_noop() {
        let bones = [bone(0., 0., 0.), bone(10., 0., 0.), bone(30., 0., 0.)];
        let mut source = mesh(&[[0., 1.], [5., 2.], [10., 1.]], vec![0, 1, 2], &bones);
        source.vertices[0].weights = vec![-0., 0.4, 0.6];
        source.vertices[1].weights = vec![1., 0., 0.];
        let bits = weights(&source);
        let mut protected = source.clone();
        scoped(
            &mut protected,
            &bones,
            &poses(&bones),
            &AutoScope {
                locked_bones: vec![0],
                ..AutoScope::default()
            },
        )
        .unwrap();
        for (i, row) in protected.vertices.iter().enumerate() {
            assert_eq!(row.weights[0].to_bits(), bits[i * 3]);
        }
        assert_eq!(protected.vertices[1].weights, [1., 0., 0.]);
        for scope in [
            AutoScope {
                bones: Some(vec![1]),
                locked_bones: vec![1],
                ..AutoScope::default()
            },
            AutoScope {
                locked_bones: vec![2, 0, 1],
                ..AutoScope::default()
            },
        ] {
            let mut result = source.clone();
            scoped(&mut result, &bones, &poses(&bones), &scope).unwrap();
            assert_eq!(weights(&result), bits);
            assert_eq!(positions(&result), positions(&source));
            assert_eq!(result, source);
        }
    }
    #[test]
    fn scoped_project_indices_resolve_binding_columns_and_disconnected_islands_stay_separate() {
        let bones = [
            bone(-100., 0., 0.),
            bone(-50., 0., 0.),
            bone(0., 0., 0.),
            bone(10., 0., 0.),
        ];
        let mut source = mesh(
            &[
                [0., 0.],
                [0.1, 0.],
                [0., 0.1],
                [10., 0.],
                [10.1, 0.],
                [10., 0.1],
            ],
            vec![0, 1, 2, 3, 4, 5],
            &bones,
        );
        source.bones = vec![3, 2];
        for row in &mut source.vertices {
            row.positions = vec![
                row.positions[6],
                row.positions[7],
                row.positions[4],
                row.positions[5],
            ];
            row.weights = vec![0.5, 0.5];
        }
        let mut restricted = source.clone();
        scoped(
            &mut restricted,
            &bones,
            &poses(&bones),
            &AutoScope {
                bones: Some(vec![2]),
                ..AutoScope::default()
            },
        )
        .unwrap();
        assert!(restricted
            .vertices
            .iter()
            .all(|row| row.weights == [0., 1.]));
        scoped(&mut source, &bones, &poses(&bones), &AutoScope::default()).unwrap();
        assert!(source.vertices[..3]
            .iter()
            .all(|row| row.weights == [0., 1.]));
        assert!(source.vertices[3..]
            .iter()
            .all(|row| row.weights == [1., 0.]));
    }
    #[test]
    fn malformed_scopes_and_invalid_graph_fail_without_partial_row_changes() {
        let bones = [bone(0., 0., 0.), bone(10., 0., 0.), bone(30., 0., 0.)];
        let source = mesh(&[[0., 1.], [5., 2.], [10., 1.]], vec![0, 1, 2], &bones[..2]);
        for scope in [
            AutoScope {
                vertices: Some(vec![]),
                ..AutoScope::default()
            },
            AutoScope {
                vertices: Some(vec![0, 0]),
                ..AutoScope::default()
            },
            AutoScope {
                vertices: Some(vec![3]),
                ..AutoScope::default()
            },
            AutoScope {
                bones: Some(vec![]),
                ..AutoScope::default()
            },
            AutoScope {
                bones: Some(vec![1, 1]),
                ..AutoScope::default()
            },
            AutoScope {
                bones: Some(vec![2]),
                ..AutoScope::default()
            },
            AutoScope {
                bones: Some(vec![usize::MAX]),
                ..AutoScope::default()
            },
            AutoScope {
                locked_bones: vec![0, 0],
                ..AutoScope::default()
            },
            AutoScope {
                locked_bones: vec![2],
                ..AutoScope::default()
            },
        ] {
            let mut result = source.clone();
            assert!(scoped(&mut result, &bones, &poses(&bones), &scope).is_err());
            assert_eq!(result, source);
            assert_eq!(positions(&result), positions(&source));
            assert_eq!(weights(&result), weights(&source));
        }
        let mut invalid = source;
        invalid.edges = vec![0, 9];
        let before = invalid.clone();
        assert!(scoped(
            &mut invalid,
            &bones,
            &poses(&bones),
            &AutoScope {
                bones: Some(vec![0]),
                ..AutoScope::default()
            }
        )
        .is_err());
        assert_eq!(invalid, before);
    }
    #[test]
    fn bent_connected_surface_uses_graph_distance_instead_of_cross_gap_proximity() {
        let bones = [bone(0.0, 0.0, 0.0), bone(2.0, 10.0, 0.0)];
        let mut surface = strip(
            &[
                [0.0, 10.0],
                [0.0, 8.0],
                [0.0, 6.0],
                [0.0, 4.0],
                [0.0, 2.0],
                [0.0, 0.0],
                [2.0, 0.0],
                [2.0, 2.0],
                [2.0, 4.0],
                [2.0, 6.0],
                [2.0, 8.0],
                [2.0, 10.0],
            ],
            &bones,
        );
        let input = surface.clone();
        let before = positions(&surface);
        let bind_poses = poses(&bones);
        let mut nearest_only = input.clone();
        crate::mesh::bind(&mut nearest_only, vec![0, 1], 0, &bones, &bind_poses).unwrap();
        apply(&mut surface, &bones, &bind_poses).unwrap();
        // Left top is only 2 units from the right tip across empty space, but
        // belongs to the left branch. Pure inverse-square distance gives it
        // <5% left influence. Connected surface travel must favor the left.
        assert!(
            surface.vertices[0].weights[0] > 0.65,
            "{:?}",
            surface.vertices[0].weights
        );
        assert!(nearest_only.vertices[0].weights[0] < 0.05);
        assert!(surface.vertices.last().unwrap().weights[1] > 0.85);
        let mut moved = bind_poses.clone();
        moved[1].y += 12.0;
        let current = crate::mesh::world_vertices(&surface, &bind_poses)[0];
        let topological = crate::mesh::world_vertices(&surface, &moved)[0];
        let nearest = crate::mesh::world_vertices(&nearest_only, &moved)[0];
        assert!(
            (topological[1] - current[1]).abs() < (nearest[1] - current[1]).abs() * 0.4,
            "Opposite branch motion must not pull this surface across its empty gap."
        );
        assert_eq!(positions(&surface), before);
        assert_normalized(&surface);
        let expected = surface.clone();
        let mut repeat = input;
        apply(&mut repeat, &bones, &poses(&bones)).unwrap();
        assert_eq!(
            repeat, expected,
            "Same pose/topology computes identical bits."
        );
    }
    #[test]
    fn disconnected_nearby_islands_do_not_share_diffusion_or_deformation() {
        let bones = [bone(0.0, 0.0, 0.0), bone(1.0, 0.0, 0.0)];
        let mut surface = mesh(
            &[
                [0.0, 0.0],
                [0.2, 0.0],
                [0.0, 0.2],
                [1.0, 0.0],
                [1.2, 0.0],
                [1.0, 0.2],
            ],
            vec![0, 1, 2, 3, 4, 5],
            &bones,
        );
        let bind_poses = poses(&bones);
        apply(&mut surface, &bones, &bind_poses).unwrap();
        for vertex in &surface.vertices[..3] {
            assert_eq!(vertex.weights, [1.0, 0.0]);
        }
        for vertex in &surface.vertices[3..] {
            assert_eq!(vertex.weights, [0.0, 1.0]);
        }
        let before = crate::mesh::world_vertices(&surface, &bind_poses);
        let mut moved = bind_poses.clone();
        moved[1].x += 50.0;
        let after = crate::mesh::world_vertices(&surface, &moved);
        for (index, (a, b)) in before.iter().zip(after.iter()).enumerate() {
            assert!((b[0] - a[0] - if index < 3 { 0.0 } else { 50.0 }).abs() < 0.00001);
            assert!((b[1] - a[1]).abs() < 0.00001);
        }
    }
    #[test]
    fn thin_chain_and_branch_joint_blend_locally_and_preserve_shape_at_bind_pose() {
        let bones = [
            bone(0.0, 0.0, 4.0),
            bone(4.0, 0.0, 4.0),
            bone(4.0, 0.0, 4.0),
        ];
        let mut bind_poses = poses(&bones);
        bind_poses[2] = Pose {
            a: 0.0,
            b: 1.0,
            c: -1.0,
            d: 0.0,
            ..bind_poses[2]
        };
        let mut surface = mesh(
            &[
                [0.0, 0.2],
                [0.0, -0.2],
                [3.8, 0.2],
                [4.2, -0.2],
                [8.0, 0.2],
                [8.0, -0.2],
                [3.8, 4.0],
                [4.2, 4.0],
            ],
            vec![0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 2, 3, 6, 3, 7, 6],
            &bones,
        );
        // Rebuild each binding against the actual vertical third bone.
        let original_points = crate::mesh::world_vertices(&surface, &poses(&bones));
        for (row, p) in surface.vertices.iter_mut().zip(&original_points) {
            for (column, pose) in bind_poses.iter().enumerate() {
                let local = pose.inverse().unwrap().point(p[0], p[1]);
                row.positions[column * 2] = local.0;
                row.positions[column * 2 + 1] = local.1;
            }
        }
        apply(&mut surface, &bones, &bind_poses).unwrap();
        assert!(surface.vertices[0].weights[0] > 0.65);
        assert!(surface.vertices[4].weights[1] > 0.65);
        assert!(surface.vertices[6].weights[2] > 0.65);
        assert!(
            surface.vertices[2]
                .weights
                .iter()
                .filter(|w| **w > 0.1)
                .count()
                >= 2
        );
        let after = crate::mesh::world_vertices(&surface, &bind_poses);
        for (a, b) in original_points.iter().zip(after.iter()) {
            assert!((a[0] - b[0]).hypot(a[1] - b[1]) < 0.00001);
        }
        assert_normalized(&surface);
    }
    #[test]
    fn posed_auto_preserves_existing_binding_bits_including_zero_origins() {
        let bones = [bone(0.0, 0.0, 10.0), bone(10.0, 0.0, 10.0)];
        let mut surface = mesh(
            &[
                [0.0, 0.0],
                [5.0, 0.0],
                [10.0, 2.0],
                [15.0, 0.0],
                [20.0, 0.0],
            ],
            vec![0, 1, 2, 1, 2, 3, 2, 3, 4],
            &bones,
        );
        let before = surface.clone();
        let mut posed = poses(&bones);
        posed[1].y += 30.0;
        let points_before = crate::mesh::world_vertices(&surface, &posed);
        apply(&mut surface, &bones, &posed).unwrap();
        assert_eq!(positions(&surface), positions(&before));
        assert_ne!(weights(&surface), weights(&before));
        assert_eq!(surface.uvs, before.uvs);
        assert_eq!(surface.triangles, before.triangles);
        assert_eq!(surface.bones, before.bones);
        let points_after = crate::mesh::world_vertices(&surface, &posed);
        assert!(points_before
            .iter()
            .zip(points_after)
            .any(|(a, b)| (a[0] - b[0]).hypot(a[1] - b[1]) > 1.0));
    }
    #[test]
    fn new_positive_placeholders_are_initialized_but_meaningful_dormant_rows_retained() {
        let bones = [bone(0.0, 0.0, 0.0), bone(10.0, 0.0, 10.0)];
        let mut surface = mesh(
            &[[10.0, 1.0], [15.0, 1.0], [20.0, 1.0]],
            vec![0, 1, 2],
            &bones,
        );
        for row in &mut surface.vertices {
            row.weights = vec![1.0, 0.0];
            row.positions[2] = 0.0;
            row.positions[3] = 0.0;
        }
        surface.vertices[1].positions[2] = 7.25;
        surface.vertices[1].positions[3] = -3.5;
        let preserved = surface.vertices[1].positions.clone();
        apply(&mut surface, &bones, &poses(&bones)).unwrap();
        assert!(surface.vertices.iter().all(|v| v.weights[1] > 0.0));
        assert_eq!(surface.vertices[0].positions[2..], [0.0, 1.0]);
        assert_eq!(surface.vertices[2].positions[2..], [10.0, 1.0]);
        assert_eq!(surface.vertices[1].positions, preserved);
    }
    #[test]
    fn affine_owners_and_global_reflection_keep_geometric_weight_assignment() {
        let bones = [bone(0.0, 0.0, 4.0), bone(6.0, 0.0, 4.0)];
        let centers = [
            [0.0, 0.0],
            [2.0, 0.0],
            [4.0, 0.0],
            [6.0, 0.0],
            [8.0, 0.0],
            [10.0, 0.0],
        ];
        let original = strip(&centers, &bones);
        let mut direct = original.clone();
        let poses = poses(&bones);
        apply(&mut direct, &bones, &poses).unwrap();
        let global = Pose {
            x: 17.0,
            y: -9.0,
            a: 0.0,
            b: -2.0,
            c: -2.0,
            d: 0.0,
            ..zero()
        };
        let reflected: Vec<_> = poses.iter().map(|p| global.compose(*p)).collect();
        let mut transformed = original;
        apply(&mut transformed, &bones, &reflected).unwrap();
        for (a, b) in direct.vertices.iter().zip(&transformed.vertices) {
            for (x, y) in a.weights.iter().zip(&b.weights) {
                assert!((x - y).abs() < 0.00001);
            }
        }
        assert_eq!(positions(&direct), positions(&transformed));
    }
    #[test]
    fn zero_length_coincident_bones_and_zero_edges_are_finite_and_deterministic() {
        let bones = vec![Bone::root(); 6];
        let original = mesh(&[[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]], vec![0, 1, 2], &bones);
        let mut a = original.clone();
        let mut b = original;
        apply(&mut a, &bones, &poses(&bones)).unwrap();
        apply(&mut b, &bones, &poses(&bones)).unwrap();
        assert_eq!(a, b);
        assert_normalized(&a);
        for row in a.vertices {
            assert_eq!(row.weights, [0.25, 0.25, 0.25, 0.25, 0.0, 0.0]);
        }
    }
    #[test]
    fn unseeded_islands_fallback_and_manual_connectivity_are_explicit() {
        let bones = [bone(0.0, 0.0, 0.0), bone(10.0, 0.0, 0.0)];
        let points = [
            [0.0, 0.0],
            [0.1, 0.0],
            [0.0, 0.1],
            [10.0, 0.0],
            [10.1, 0.0],
            [10.0, 0.1],
            [100.0, 0.0],
            [100.1, 0.0],
            [100.0, 0.1],
        ];
        let mut surface = mesh(&points, vec![0, 1, 2, 3, 4, 5, 6, 7, 8], &bones);
        apply(&mut surface, &bones, &poses(&bones)).unwrap();
        for row in &surface.vertices[6..] {
            assert_eq!(row.weights, [0.0, 1.0]);
        }
        let mut connected = mesh(&points, vec![0, 1, 2, 3, 4, 5, 6, 7, 8], &bones);
        connected.edges = vec![1, 3, 4, 6];
        apply(&mut connected, &bones, &poses(&bones)).unwrap();
        assert!(connected.vertices[0].weights[1] > 0.0);
        assert!(connected.vertices[8].weights[0] > 0.0);
    }
    #[test]
    fn invalid_graph_rows_bones_and_nonfinite_poses_fail_atomically() {
        let bones = [bone(0.0, 0.0, 0.0), bone(10.0, 0.0, 0.0)];
        let base = mesh(
            &[[0.0, 0.0], [5.0, 1.0], [10.0, 0.0]],
            vec![0, 1, 2],
            &bones,
        );
        let mut cases = vec![base.clone(); 5];
        cases[0].triangles[2] = 99;
        cases[1].edges = vec![1];
        cases[2].bones[1] = 0;
        cases[3].vertices[0].weights[1] = -0.2;
        cases[4].vertices[1].positions.pop();
        for mut invalid in cases {
            let before = invalid.clone();
            assert!(apply(&mut invalid, &bones, &poses(&bones)).is_err());
            assert_eq!(invalid, before);
        }
        let mut invalid_pose = poses(&bones);
        invalid_pose[1].d = f32::NAN;
        let mut surface = base.clone();
        assert!(apply(&mut surface, &bones, &invalid_pose).is_err());
        assert_eq!(surface, base);
    }
    #[test]
    fn inverse_failure_is_atomic_and_unweighted_mesh_is_unchanged() {
        let bones = [bone(0.0, 0.0, 0.0), bone(10.0, 0.0, 0.0)];
        let mut surface = mesh(
            &[[8.0, 1.0], [10.0, 1.0], [12.0, 1.0]],
            vec![0, 1, 2],
            &bones,
        );
        for row in &mut surface.vertices {
            row.weights = vec![1.0, 0.0];
            row.positions[2] = 0.0;
            row.positions[3] = 0.0;
        }
        let original = surface.clone();
        let mut singular = poses(&bones);
        singular[1].a = 0.0;
        assert!(apply(&mut surface, &bones, &singular).is_err());
        assert_eq!(surface, original);
        let mut unweighted = mesh(
            &[[8.0, 1.0], [10.0, 2.0], [12.0, 1.0]],
            vec![0, 1, 2],
            &bones[..1],
        );
        unweighted.weighted = false;
        let original = unweighted.clone();
        apply(&mut unweighted, &bones, &poses(&bones)).unwrap();
        assert_eq!(unweighted, original);
    }
}
