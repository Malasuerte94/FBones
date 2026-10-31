//! Deterministic alpha silhouette and image-detail tracing. This is our own
//! bounded algorithm, not a claim to reproduce Spine's proprietary tracer.
use crate::{images::ImageAsset, project::AppError, triangulation};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeSet, HashMap},
    io::Cursor,
};

type Point = [f64; 2];
const MAX_VERTICES: usize = 256;
const MAX_BOUNDARY_EDGES: usize = 131_072;
const EPS: f64 = 1e-7;

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct TraceOptions {
    /// Pixels with alpha <= this value are ignored, including low-alpha shadows.
    pub alpha_threshold: u8,
    /// Maximum silhouette simplification deviation in source pixels.
    pub tolerance: f32,
    /// Desired maximum boundary segment length in source pixels.
    pub spacing: f32,
    pub inner: bool,
    /// Minimum RGB edge contrast, 0..1.
    pub inner_threshold: f32,
    pub inner_tolerance: f32,
    pub inner_spacing: f32,
    pub max_vertices: usize,
}
impl Default for TraceOptions {
    fn default() -> Self {
        Self {
            alpha_threshold: 16,
            tolerance: 2.0,
            spacing: 24.0,
            inner: false,
            inner_threshold: 0.2,
            inner_tolerance: 2.0,
            inner_spacing: 24.0,
            max_vertices: 256,
        }
    }
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TraceGeometry {
    pub uvs: Vec<f32>,
    pub triangles: Vec<u16>,
    pub edges: Vec<u32>,
    pub hull: usize,
    pub inner_count: usize,
    /// Alpha holes remain texture-transparent, but are filled by mesh geometry.
    pub filled_holes: usize,
    /// Disconnected islands are retained within a transparent convex bridge.
    pub bridged_islands: usize,
    pub used_tolerance: f32,
    pub used_spacing: f32,
    pub budget_adjusted: bool,
}
fn invalid(message: &str) -> AppError {
    AppError::new("InvalidTrace", message)
}
fn distance(a: Point, b: Point) -> f64 {
    (a[0] - b[0]).hypot(a[1] - b[1])
}
fn cross(a: Point, b: Point, c: Point) -> f64 {
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}
fn segment_distance(p: Point, a: Point, b: Point) -> f64 {
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    let len = dx * dx + dy * dy;
    let t = if len > 0.0 {
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len
    } else {
        0.0
    }
    .clamp(0.0, 1.0);
    distance(p, [a[0] + dx * t, a[1] + dy * t])
}
fn area(points: &[Point]) -> f64 {
    (0..points.len())
        .map(|i| {
            let a = points[i];
            let b = points[(i + 1) % points.len()];
            a[0] * b[1] - a[1] * b[0]
        })
        .sum::<f64>()
        / 2.0
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
fn simple(points: &[Point]) -> bool {
    if points.len() < 3 || area(points).abs() < EPS {
        return false;
    }
    for i in 0..points.len() {
        for j in 0..i {
            if distance(points[i], points[j]) < EPS {
                return false;
            }
            if intersects(
                points[i],
                points[(i + 1) % points.len()],
                points[j],
                points[(j + 1) % points.len()],
            ) {
                return false;
            }
        }
    }
    true
}
fn inside(p: Point, polygon: &[Point], clearance: f64) -> bool {
    let mut included = false;
    for i in 0..polygon.len() {
        let a = polygon[i];
        let b = polygon[(i + 1) % polygon.len()];
        if segment_distance(p, a, b) < clearance.max(EPS) {
            return false;
        }
        if (a[1] > p[1]) != (b[1] > p[1])
            && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]
        {
            included = !included;
        }
    }
    included
}
fn convex_hull(mut points: Vec<Point>) -> Vec<Point> {
    points.sort_by(|a, b| a[0].total_cmp(&b[0]).then(a[1].total_cmp(&b[1])));
    points.dedup();
    if points.len() < 3 {
        return points;
    }
    let mut lower: Vec<Point> = vec![];
    for p in &points {
        while lower.len() > 1 && cross(lower[lower.len() - 2], lower[lower.len() - 1], *p) <= 0.0 {
            lower.pop();
        }
        lower.push(*p);
    }
    let mut upper: Vec<Point> = vec![];
    for p in points.iter().rev() {
        while upper.len() > 1 && cross(upper[upper.len() - 2], upper[upper.len() - 1], *p) <= 0.0 {
            upper.pop();
        }
        upper.push(*p);
    }
    lower.pop();
    upper.pop();
    lower.extend(upper);
    lower
}
fn rdp(points: &[Point], tolerance: f64, work: &mut usize) -> Option<Vec<Point>> {
    if points.len() < 3 {
        return Some(points.to_vec());
    }
    let mut keep = vec![false; points.len()];
    keep[0] = true;
    keep[points.len() - 1] = true;
    let mut pending = vec![(0, points.len() - 1)];
    while let Some((a, b)) = pending.pop() {
        let mut far = None;
        let mut maximum = tolerance;
        for i in a + 1..b {
            if *work == 0 {
                return None;
            }
            *work -= 1;
            let d = segment_distance(points[i], points[a], points[b]);
            if d > maximum {
                maximum = d;
                far = Some(i);
            }
        }
        if let Some(i) = far {
            keep[i] = true;
            pending.push((a, i));
            pending.push((i, b));
        }
    }
    Some(
        points
            .iter()
            .zip(keep)
            .filter_map(|(p, k)| k.then_some(*p))
            .collect(),
    )
}
fn simplify(points: &[Point], tolerance: f64) -> Option<Vec<Point>> {
    let mut work = 1_000_000;
    let pivot = (1..points.len())
        .max_by(|a, b| distance(points[0], points[*a]).total_cmp(&distance(points[0], points[*b])))
        .unwrap_or(1);
    let a = rdp(&points[..=pivot], tolerance, &mut work)?;
    let mut chain = points[pivot..].to_vec();
    chain.push(points[0]);
    let b = rdp(&chain, tolerance, &mut work)?;
    Some(
        a[..a.len() - 1]
            .iter()
            .chain(&b[..b.len() - 1])
            .copied()
            .collect(),
    )
}

fn contours(mask: &[u8], width: usize, height: usize) -> Result<Vec<Vec<Point>>, AppError> {
    let stride = (width + 1) as u32;
    let node = |x: usize, y: usize| y as u32 * stride + x as u32;
    let mut segments = vec![];
    for y in 0..height {
        for x in 0..width {
            if mask[y * width + x] == 0 {
                continue;
            }
            if y == 0 || mask[(y - 1) * width + x] == 0 {
                segments.push((node(x, y), node(x + 1, y)));
            }
            if x + 1 == width || mask[y * width + x + 1] == 0 {
                segments.push((node(x + 1, y), node(x + 1, y + 1)));
            }
            if y + 1 == height || mask[(y + 1) * width + x] == 0 {
                segments.push((node(x + 1, y + 1), node(x, y + 1)));
            }
            if x == 0 || mask[y * width + x - 1] == 0 {
                segments.push((node(x, y + 1), node(x, y)));
            }
            if segments.len() > MAX_BOUNDARY_EDGES {
                return Err(invalid("The alpha contour is too complex. Increase Alpha ignore or simplify the source image."));
            }
        }
    }
    if segments.is_empty() {
        return Err(invalid("No pixels remain above Alpha ignore."));
    }
    let mut outgoing: HashMap<u32, Vec<usize>> = HashMap::new();
    for (i, (a, _)) in segments.iter().enumerate() {
        outgoing.entry(*a).or_default().push(i);
    }
    let direction = |a: u32, b: u32| -> u8 {
        if b == a + 1 {
            0
        } else if b == a + stride {
            1
        } else if a == b + 1 {
            2
        } else {
            3
        }
    };
    let mut used = vec![false; segments.len()];
    let mut result = vec![];
    for first in 0..segments.len() {
        if used[first] {
            continue;
        }
        let start = segments[first].0;
        let mut current = first;
        let mut polygon = vec![];
        loop {
            if used[current] {
                return Err(invalid("The alpha boundary could not be closed."));
            }
            used[current] = true;
            let (a, b) = segments[current];
            polygon.push([f64::from(a % stride), f64::from(a / stride)]);
            if b == start {
                break;
            }
            let incoming = direction(a, b);
            current = *outgoing
                .get(&b)
                .and_then(|next| {
                    next.iter().filter(|i| !used[**i]).min_by_key(|i| {
                        let turn = (direction(b, segments[**i].1) + 4 - incoming) % 4;
                        match turn {
                            1 => 0,
                            0 => 1,
                            3 => 2,
                            _ => 3,
                        }
                    })
                })
                .ok_or_else(|| invalid("The alpha boundary is incomplete."))?;
        }
        // Removing only exactly straight raster runs is lossless and bounds
        // simplification work on large rectangular images.
        let compact: Vec<_> = (0..polygon.len())
            .filter_map(|i| {
                (cross(
                    polygon[(i + polygon.len() - 1) % polygon.len()],
                    polygon[i],
                    polygon[(i + 1) % polygon.len()],
                )
                .abs()
                    > EPS)
                    .then_some(polygon[i])
            })
            .collect();
        if compact.len() >= 3 {
            result.push(compact);
        }
    }
    Ok(result)
}

fn rgba(image: &ImageAsset) -> Result<Vec<u8>, AppError> {
    let mut decoder = png::Decoder::new_with_limits(
        Cursor::new(image.bytes()),
        png::Limits {
            bytes: 64 * 1024 * 1024,
        },
    );
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder
        .read_info()
        .map_err(|_| invalid("The PNG could not be decoded for tracing."))?;
    let count = reader
        .output_buffer_size()
        .filter(|n| *n <= 64 * 1024 * 1024)
        .ok_or_else(|| invalid("PNG trace data exceeds the decoded image limit."))?;
    let mut bytes = vec![0; count];
    let info = reader
        .next_frame(&mut bytes)
        .map_err(|_| invalid("The PNG pixels could not be decoded for tracing."))?;
    bytes.truncate(info.buffer_size());
    let mut output = Vec::with_capacity(image.width as usize * image.height as usize * 4);
    match info.color_type {
        png::ColorType::Rgba => return Ok(bytes),
        png::ColorType::Rgb => {
            for p in bytes.chunks_exact(3) {
                output.extend([p[0], p[1], p[2], 255]);
            }
        }
        png::ColorType::Grayscale => {
            for p in bytes {
                output.extend([p, p, p, 255]);
            }
        }
        png::ColorType::GrayscaleAlpha => {
            for p in bytes.chunks_exact(2) {
                output.extend([p[0], p[0], p[0], p[1]]);
            }
        }
        png::ColorType::Indexed => {
            return Err(invalid("Indexed PNG expansion failed during tracing."))
        }
    }
    Ok(output)
}

#[derive(Clone, Copy)]
struct Feature {
    point: Point,
    strength: u8,
    normal: Point,
}
fn features(
    pixels: &[u8],
    mask: &[u8],
    width: usize,
    height: usize,
    threshold: f64,
) -> (Vec<Feature>, usize) {
    if width < 3 || height < 3 {
        return (vec![], 1);
    }
    let step = ((width as f64 * height as f64 / 65_536.0).sqrt().ceil() as usize).max(1);
    let columns = width.div_ceil(step);
    let rows = height.div_ceil(step);
    let mut cells: Vec<Option<Feature>> = vec![None; columns * rows];
    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let i = y * width + x;
            if [i, i - 1, i + 1, i - width, i + width]
                .iter()
                .any(|i| mask[*i] == 0)
            {
                continue;
            }
            let mut gradient = (0i32, 0i32, 0i32);
            for c in 0..3 {
                let value = |index: usize| i32::from(pixels[index * 4 + c]);
                let gx = value(i - width + 1) + 2 * value(i + 1) + value(i + width + 1)
                    - value(i - width - 1)
                    - 2 * value(i - 1)
                    - value(i + width - 1);
                let gy = value(i + width - 1) + 2 * value(i + width) + value(i + width + 1)
                    - value(i - width - 1)
                    - 2 * value(i - width)
                    - value(i - width + 1);
                let length = gx * gx + gy * gy;
                if length > gradient.0 {
                    gradient = (length, gx, gy);
                }
            }
            let strength = (gradient.1.abs().max(gradient.2.abs()) / 4) as u8;
            if f64::from(strength) < threshold * 255.0 || strength == 0 {
                continue;
            }
            let cell = y / step * columns + x / step;
            if cells[cell].is_none_or(|f| strength > f.strength) {
                cells[cell] = Some(Feature {
                    point: [x as f64 + 0.5, y as f64 + 0.5],
                    strength,
                    normal: {
                        let length = f64::from(gradient.0).sqrt();
                        [
                            f64::from(gradient.1) / length,
                            f64::from(gradient.2) / length,
                        ]
                    },
                });
            }
        }
    }
    (cells.into_iter().flatten().collect(), step)
}
fn occupied(p: Point, mask: &[u8], width: usize, height: usize) -> bool {
    p[0] >= 0.0
        && p[1] >= 0.0
        && p[0] < (width as f64)
        && p[1] < (height as f64)
        && mask[p[1] as usize * width + p[0] as usize] != 0
}
fn point_index(points: &mut Vec<Point>, p: Point) -> usize {
    if let Some(i) = points.iter().position(|q| distance(*q, p) < 1e-4) {
        i
    } else {
        points.push(p);
        points.len() - 1
    }
}
fn line_intersection(a: Point, b: Point, c: Point, d: Point) -> Option<Point> {
    let (rx, ry, sx, sy) = (b[0] - a[0], b[1] - a[1], d[0] - c[0], d[1] - c[1]);
    let denom = rx * sy - ry * sx;
    if denom.abs() < EPS {
        return None;
    }
    let t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / denom;
    let u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / denom;
    (t > EPS && t < 1.0 - EPS && u > EPS && u < 1.0 - EPS).then_some([a[0] + rx * t, a[1] + ry * t])
}
/// Retain dominant straight internal image edges as constraints, then add
/// contrast samples and sparse surface coverage. All decisions are deterministic.
fn inner_points(
    points: &mut Vec<Point>,
    hull: usize,
    pixels: &[u8],
    mask: &[u8],
    width: usize,
    height: usize,
    options: TraceOptions,
) -> (Vec<[usize; 2]>, bool) {
    let (mut feature, sample_step) = features(
        pixels,
        mask,
        width,
        height,
        f64::from(options.inner_threshold),
    );
    let boundary = points[..hull].to_vec();
    let spacing = f64::from(options.inner_spacing);
    let tolerance = f64::from(options.inner_tolerance).max(0.5);
    let clearance = (spacing * 0.3).max(1.0);
    let valid = |p: Point| occupied(p, mask, width, height) && inside(p, &boundary, clearance);
    feature.retain(|f| valid(f.point));
    let diagonal = (width as f64).hypot(height as f64);
    let bins = (2.0 * diagonal / tolerance).ceil() as usize + 3;
    let directions: Vec<_> = (0..180)
        .map(|i| {
            let theta = (i as f64).to_radians();
            [theta.cos(), theta.sin()]
        })
        .collect();
    let mut histogram = if feature.is_empty() {
        vec![]
    } else {
        vec![0u32; 180 * bins]
    };
    for f in &feature {
        for (angle, n) in directions.iter().enumerate() {
            if (f.normal[0] * n[0] + f.normal[1] * n[1]).abs() < 0.965_925_826 {
                continue;
            }
            let rho =
                ((f.point[0] * n[0] + f.point[1] * n[1] + diagonal) / tolerance).round() as usize;
            if rho < bins {
                histogram[angle * bins + rho] += 1;
            }
        }
    }
    let mut peaks: Vec<_> = histogram
        .iter()
        .enumerate()
        .filter_map(|(i, count)| (*count >= 4).then_some((*count, i / bins, i % bins)))
        .collect();
    peaks.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)).then(a.2.cmp(&b.2)));
    let mut adjusted = false;
    let mut selected: Vec<(usize, f64)> = vec![];
    let mut segments: Vec<[Point; 2]> = vec![];
    for (_, angle, bin) in peaks.into_iter().take(1024) {
        if segments.len() >= 8 || points.len() + 2 > options.max_vertices {
            break;
        }
        let rho = bin as f64 * tolerance - diagonal;
        let n = directions[angle];
        let direction = [-n[1], n[0]];
        if selected.iter().any(|(a, r)| {
            angle.abs_diff(*a) <= 3 && (rho - r).abs() < tolerance * 3.0 + sample_step as f64
        }) {
            continue;
        }
        for polarity in [1.0, -1.0] {
            let nearby: Vec<_> = feature
                .iter()
                .filter(|f| {
                    (f.normal[0] * n[0] + f.normal[1] * n[1]) * polarity >= 0.965_925_826
                        && (f.point[0] * n[0] + f.point[1] * n[1] - rho).abs() <= tolerance * 1.25
                })
                .collect();
            let origin = (rho - tolerance * 1.25).floor();
            let mut fine = vec![0u32; (tolerance * 2.5).ceil() as usize + 3];
            for f in &nearby {
                let bin = (f.point[0] * n[0] + f.point[1] * n[1] - origin).floor() as usize;
                if bin < fine.len() {
                    fine[bin] += 1;
                }
            }
            let Some((best, count)) = fine.iter().enumerate().max_by_key(|(_, count)| **count)
            else {
                continue;
            };
            if *count == 0 {
                continue;
            }
            let rho = origin + best as f64 + 0.5;
            let mut positions: Vec<_> = nearby
                .into_iter()
                .filter(|f| (f.point[0] * n[0] + f.point[1] * n[1] - rho).abs() <= 1.25)
                .map(|f| f.point[0] * direction[0] + f.point[1] * direction[1])
                .collect();
            positions.sort_by(f64::total_cmp);
            let mut start = 0;
            while start < positions.len()
                && segments.len() < 8
                && points.len() + 2 <= options.max_vertices
            {
                let mut end = start + 1;
                while end < positions.len()
                    && positions[end] - positions[end - 1] < spacing.max(sample_step as f64 * 2.5)
                {
                    end += 1;
                }
                let (low, high) = (positions[start], positions[end - 1]);
                let length = high - low;
                if end - start >= 4
                    && length >= spacing * 2.0
                    && ((end - start) as f64 * sample_step as f64 / length) >= 0.9
                {
                    let a = [
                        n[0] * rho + direction[0] * low,
                        n[1] * rho + direction[1] * low,
                    ];
                    let b = [
                        n[0] * rho + direction[0] * high,
                        n[1] * rho + direction[1] * high,
                    ];
                    let middle = [(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0];
                    if !segments
                        .iter()
                        .any(|s| segment_distance(middle, s[0], s[1]) < spacing * 0.4)
                    {
                        let wanted = (length / spacing).ceil().max(1.0) as usize;
                        let segment_budget = options
                            .max_vertices
                            .saturating_sub(points.len())
                            .min((options.max_vertices / 6).max(2));
                        let samples = wanted.min(segment_budget.saturating_sub(1).max(1));
                        if samples < wanted {
                            adjusted = true;
                        }
                        let proposed: Vec<_> = (0..=samples)
                            .map(|i| {
                                let t = i as f64 / samples as f64;
                                [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
                            })
                            .collect();
                        let opaque = (0..=(length.ceil() as usize)).all(|i| {
                            let t = i as f64 / length.ceil().max(1.0);
                            valid([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
                        });
                        if opaque && proposed.iter().all(|p| valid(*p)) {
                            let intersections: Vec<_> = segments
                                .iter()
                                .filter_map(|s| line_intersection(a, b, s[0], s[1]))
                                .collect();
                            let additions: Vec<_> =
                                proposed.iter().chain(&intersections).copied().collect();
                            let clean = additions.iter().enumerate().all(|(i, p)| {
                                points.iter().chain(&additions[..i]).all(|q| {
                                    let d = distance(*p, *q);
                                    d < 1e-4 || d >= spacing * 0.15
                                })
                            });
                            if clean
                                && points.len() + proposed.len() + intersections.len()
                                    <= options.max_vertices
                            {
                                for p in proposed.into_iter().chain(intersections) {
                                    point_index(points, p);
                                }
                                segments.push([a, b]);
                                selected.push((angle, rho));
                            }
                        }
                    }
                }
                start = end;
            }
        }
    }
    feature.sort_by(|a, b| {
        b.strength
            .cmp(&a.strength)
            .then(a.point[1].total_cmp(&b.point[1]))
            .then(a.point[0].total_cmp(&b.point[0]))
    });
    for f in feature {
        if points.len() >= options.max_vertices {
            break;
        }
        if points.iter().all(|p| distance(*p, f.point) >= spacing)
            && segments
                .iter()
                .all(|line| segment_distance(f.point, line[0], line[1]) >= spacing * 0.4)
        {
            points.push(f.point);
        }
    }
    let remaining = options.max_vertices.saturating_sub(points.len());
    if remaining > 0 {
        let solid = mask.iter().filter(|v| **v != 0).count() as f64;
        let step = spacing.max((solid / remaining as f64).sqrt());
        let mut y = step / 2.0;
        while y < height as f64 && points.len() < options.max_vertices {
            let mut x = step / 2.0;
            while x < width as f64 && points.len() < options.max_vertices {
                let p = [x, y];
                if valid(p) && points.iter().all(|q| distance(*q, p) >= step * 0.65) {
                    points.push(p);
                }
                x += step;
            }
            y += step;
        }
    }
    let mut edges = BTreeSet::new();
    for [a, b] in segments {
        let dx = b[0] - a[0];
        let dy = b[1] - a[1];
        let length = dx * dx + dy * dy;
        let mut chain: Vec<_> = points
            .iter()
            .enumerate()
            .filter_map(|(i, p)| {
                let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length;
                ((-EPS..=1.0 + EPS).contains(&t) && segment_distance(*p, a, b) < 1e-4)
                    .then_some((t, i))
            })
            .collect();
        chain.sort_by(|a, b| a.0.total_cmp(&b.0));
        for pair in chain.windows(2) {
            let (a, b) = (pair[0].1, pair[1].1);
            edges.insert([a.min(b), a.max(b)]);
        }
    }
    (edges.into_iter().collect(), adjusted)
}

pub(crate) fn trace_png(
    image: &ImageAsset,
    options: TraceOptions,
) -> Result<TraceGeometry, AppError> {
    trace_rgba(
        image.width as usize,
        image.height as usize,
        &rgba(image)?,
        options,
    )
}
fn trace_rgba(
    width: usize,
    height: usize,
    pixels: &[u8],
    options: TraceOptions,
) -> Result<TraceGeometry, AppError> {
    if width == 0
        || height == 0
        || width > 4096
        || height > 4096
        || pixels.len() != width * height * 4
    {
        return Err(invalid("Use a valid bounded RGBA image for tracing."));
    }
    if !(3..=MAX_VERTICES).contains(&options.max_vertices)
        || options.alpha_threshold == 255
        || !options.tolerance.is_finite()
        || !(0.0..=128.0).contains(&options.tolerance)
        || !options.spacing.is_finite()
        || !(0.5..=4096.0).contains(&options.spacing)
        || !options.inner_threshold.is_finite()
        || !(0.0..=1.0).contains(&options.inner_threshold)
        || !options.inner_tolerance.is_finite()
        || !(0.5..=32.0).contains(&options.inner_tolerance)
        || !options.inner_spacing.is_finite()
        || !(2.0..=1024.0).contains(&options.inner_spacing)
    {
        return Err(invalid("Trace parameters are outside the supported range."));
    }
    let mask: Vec<u8> = pixels
        .chunks_exact(4)
        .map(|p| u8::from(p[3] > options.alpha_threshold))
        .collect();
    let loops = contours(&mask, width, height)?;
    let filled_holes = loops.iter().filter(|p| area(p) < 0.0).count();
    let mut outer: Vec<_> = loops.into_iter().filter(|p| area(p) > 0.0).collect();
    if outer.is_empty() {
        return Err(invalid("No closed opaque silhouette was found."));
    }
    let bridged_islands = outer.len() - 1;
    let original = if outer.len() == 1 {
        outer.pop().unwrap()
    } else {
        convex_hull(outer.into_iter().flatten().collect())
    };
    let reserve = if options.inner {
        (options.max_vertices / 3).min(96)
    } else {
        0
    };
    let budget = options.max_vertices.saturating_sub(reserve).max(3);
    let mut tolerance = f64::from(options.tolerance);
    let mut polygon = vec![];
    let mut adjusted = false;
    // Pathological sawtooth contours cannot make RDP quadratic without bound.
    // A work-limited attempt raises tolerance before trying again.
    for _ in 0..32 {
        if let Some(mut candidate) = simplify(&original, tolerance) {
            if candidate.len() < 3 {
                candidate = convex_hull(original.clone());
            }
            if candidate.len() >= 3 && candidate.len() <= budget {
                polygon = candidate;
                break;
            }
        }
        adjusted = true;
        tolerance = tolerance.max(0.25) * 1.5;
    }
    if polygon.len() < 3 || polygon.len() > budget || !simple(&polygon) {
        return Err(invalid(
            "This contour needs a smaller tolerance or a larger vertex budget.",
        ));
    }
    let mut spacing = f64::from(options.spacing);
    let count = |spacing: f64| -> usize {
        (0..polygon.len())
            .map(|i| {
                (distance(polygon[i], polygon[(i + 1) % polygon.len()]) / spacing)
                    .ceil()
                    .max(1.0) as usize
            })
            .sum()
    };
    while count(spacing) > budget {
        spacing *= 1.25;
        adjusted = true;
    }
    let mut points = vec![];
    for i in 0..polygon.len() {
        let a = polygon[i];
        let b = polygon[(i + 1) % polygon.len()];
        let samples = (distance(a, b) / spacing).ceil().max(1.0) as usize;
        for j in 0..samples {
            let t = j as f64 / samples as f64;
            points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
    }
    let hull = points.len();
    let mut edges: Vec<u32> = (0..hull)
        .flat_map(|i| [i as u32, ((i + 1) % hull) as u32])
        .collect();
    if options.inner {
        let (inner_edges, inner_adjusted) =
            inner_points(&mut points, hull, pixels, &mask, width, height, options);
        adjusted |= inner_adjusted;
        edges.extend(inner_edges.into_iter().flatten().map(|i| i as u32));
    }
    let uvs: Vec<f32> = points
        .iter()
        .flat_map(|p| [(p[0] / width as f64) as f32, (p[1] / height as f64) as f32])
        .collect();
    let triangles =
        triangulation::triangulate_with_metric(&uvs, hull, &edges, [width as f64, height as f64])?;
    Ok(TraceGeometry {
        uvs,
        triangles,
        edges,
        hull,
        inner_count: points.len() - hull,
        filled_holes,
        bridged_islands,
        used_tolerance: tolerance as f32,
        used_spacing: spacing as f32,
        budget_adjusted: adjusted,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn image(width: usize, height: usize, f: impl Fn(usize, usize) -> [u8; 4]) -> Vec<u8> {
        (0..height)
            .flat_map(|y| {
                (0..width).flat_map({
                    let f = &f;
                    move |x| f(x, y)
                })
            })
            .collect()
    }
    fn points(result: &TraceGeometry) -> Vec<Point> {
        result
            .uvs
            .chunks_exact(2)
            .map(|p| [f64::from(p[0]), f64::from(p[1])])
            .collect()
    }
    #[test]
    fn transparent_images_fail_and_alpha_ignore_removes_a_shadow() {
        assert!(trace_rgba(8, 8, &vec![0; 8 * 8 * 4], TraceOptions::default()).is_err());
        let pixels = image(20, 20, |x, y| {
            if (4..16).contains(&x) && (4..16).contains(&y) {
                [255, 0, 0, 255]
            } else if (1..19).contains(&x) && (1..19).contains(&y) {
                [0, 0, 0, 40]
            } else {
                [0; 4]
            }
        });
        let result = trace_rgba(
            20,
            20,
            &pixels,
            TraceOptions {
                alpha_threshold: 64,
                spacing: 100.,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        assert_eq!(result.hull, 4);
        let p = points(&result);
        assert!(p
            .iter()
            .all(|p| p[0] >= 0.199 && p[0] <= 0.801 && p[1] >= 0.199 && p[1] <= 0.801));
        let shadow = trace_rgba(
            20,
            20,
            &pixels,
            TraceOptions {
                alpha_threshold: 0,
                spacing: 100.,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        assert!(points(&shadow).iter().any(|p| p[0] < 0.1));
    }
    #[test]
    fn concave_shapes_remain_concave_and_holes_are_explicitly_reported() {
        let pixels = image(
            32,
            32,
            |x, y| if x < 10 || y > 21 { [255; 4] } else { [0; 4] },
        );
        let result = trace_rgba(
            32,
            32,
            &pixels,
            TraceOptions {
                tolerance: 0.5,
                spacing: 100.,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        assert_eq!(result.hull, 6);
        assert!(area(&points(&result)) < 0.6);
        let pixels = image(32, 32, |x, y| {
            if (10..22).contains(&x) && (10..22).contains(&y) {
                [0; 4]
            } else {
                [255; 4]
            }
        });
        let result = trace_rgba(32, 32, &pixels, TraceOptions::default()).unwrap();
        assert_eq!(result.filled_holes, 1);
    }
    #[test]
    fn disconnected_islands_are_retained_with_a_reported_transparent_bridge() {
        let pixels = image(32, 16, |x, y| {
            if ((2..8).contains(&x) || (24..30).contains(&x)) && (4..12).contains(&y) {
                [255; 4]
            } else {
                [0; 4]
            }
        });
        let result = trace_rgba(32, 16, &pixels, TraceOptions::default()).unwrap();
        assert_eq!(result.bridged_islands, 1);
        let p = points(&result);
        assert!(p.iter().any(|p| p[0] < 0.1) && p.iter().any(|p| p[0] > 0.9));
    }
    #[test]
    fn inner_trace_finds_a_straight_color_boundary_and_is_deterministic() {
        let pixels = image(64, 64, |x, _| {
            if x < 32 {
                [30, 40, 60, 255]
            } else {
                [240, 220, 100, 255]
            }
        });
        let options = TraceOptions {
            inner: true,
            inner_spacing: 12.,
            spacing: 20.,
            ..TraceOptions::default()
        };
        let result = trace_rgba(64, 64, &pixels, options).unwrap();
        assert!(result.inner_count > 0);
        let p = points(&result);
        assert!(result.edges.chunks_exact(2).any(|e| {
            let a = p[e[0] as usize];
            let b = p[e[1] as usize];
            e[0] as usize >= result.hull
                && e[1] as usize >= result.hull
                && (a[0] - 0.5).abs() < 0.04
                && (b[0] - 0.5).abs() < 0.04
                && (a[1] - b[1]).abs() > 0.05
        }));
        let again = trace_rgba(64, 64, &pixels, options).unwrap();
        assert_eq!(result.uvs, again.uvs);
        assert_eq!(result.edges, again.edges);
        assert_eq!(result.triangles, again.triangles);
    }
    #[test]
    fn budgets_bound_complex_contours_and_uniform_surface_scaffolding() {
        let pixels = image(128, 128, |x, y| {
            if (16..112).contains(&x) && (16..112).contains(&y) {
                [200, 180, 150, 255]
            } else {
                [0; 4]
            }
        });
        let result = trace_rgba(
            128,
            128,
            &pixels,
            TraceOptions {
                inner: true,
                max_vertices: 32,
                spacing: 2.,
                inner_spacing: 4.,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        assert!(result.uvs.len() / 2 <= 32);
        assert!(result.budget_adjusted);
        assert!(result.inner_count > 0);
        assert!(!result.triangles.is_empty());
        assert!(trace_rgba(
            128,
            128,
            &pixels,
            TraceOptions {
                spacing: f32::NAN,
                ..TraceOptions::default()
            }
        )
        .is_err());
    }
    #[test]
    fn diagonal_and_crossing_inner_features_produce_valid_constrained_meshes() {
        for pattern in 0..2 {
            let pixels = image(64, 64, |x, y| {
                let light = if pattern == 0 {
                    x + y < 64
                } else {
                    (x < 32) == (y < 32)
                };
                if light {
                    [230, 180, 80, 255]
                } else {
                    [20, 40, 80, 255]
                }
            });
            let result = trace_rgba(
                64,
                64,
                &pixels,
                TraceOptions {
                    inner: true,
                    inner_spacing: 12.0,
                    spacing: 20.0,
                    ..TraceOptions::default()
                },
            )
            .unwrap();
            assert!(result.inner_count > 0);
            let p = points(&result);
            if pattern == 0 {
                assert!(result.edges.chunks_exact(2).any(|e| {
                    let (a, b) = (p[e[0] as usize], p[e[1] as usize]);
                    e[0] as usize >= result.hull
                        && e[1] as usize >= result.hull
                        && (a[0] + a[1] - 1.0).abs() < 0.06
                        && (b[0] + b[1] - 1.0).abs() < 0.06
                }));
            }
            use fbones_format::minimal::{
                meshes::{Mesh, Vertex},
                regions::{
                    decode_regions, encode_region_payload, Attachment, Region, RegionProject, Slot,
                },
                MinimalProject,
            };
            let region = Region {
                name: "own".into(),
                path: String::new(),
                x: 0.,
                y: 0.,
                rotation: 0.,
                scale_x: 1.,
                scale_y: 1.,
                width: 64.,
                height: 64.,
            };
            let mesh = Mesh {
                image: region,
                weighted: false,
                uvs: result.uvs.clone(),
                triangles: result.triangles.clone(),
                edges: result.edges.clone(),
                hull: result.hull,
                bones: vec![0],
                vertices: result
                    .uvs
                    .chunks_exact(2)
                    .map(|uv| Vertex {
                        weights: vec![1.],
                        positions: vec![(uv[0] - 0.5) * 64., (0.5 - uv[1]) * 64.],
                    })
                    .collect(),
            };
            let project = RegionProject {
                rig: MinimalProject::new("own trace".into(), [1; 16]),
                images_root: "./images/".into(),
                slots: vec![Slot {
                    blend: fbones_format::minimal::regions::BlendMode::Normal,
                    name: "own".into(),
                    bone: 0,
                    attachment: Some(Attachment::Mesh(Box::new(mesh))),
                    visible: true,
                    color: [255; 4],
                }],
                region_order: vec![0],
            };
            let payload = encode_region_payload(&project).unwrap();
            assert_eq!(decode_regions(&payload).unwrap(), project);
        }
    }
    #[test]
    fn public_png_path_decodes_alpha_and_matches_raw_trace() {
        let pixels = image(16, 16, |x, y| {
            if (3..13).contains(&x) && (4..12).contains(&y) {
                [10, 30, 50, 255]
            } else {
                [0; 4]
            }
        });
        let mut bytes = vec![];
        {
            let mut encoder = png::Encoder::new(&mut bytes, 16, 16);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            encoder
                .write_header()
                .unwrap()
                .write_image_data(&pixels)
                .unwrap();
        }
        let image = ImageAsset::from_bytes(bytes).unwrap();
        let expected = trace_rgba(16, 16, &pixels, TraceOptions::default()).unwrap();
        let traced = trace_png(&image, TraceOptions::default()).unwrap();
        assert_eq!(traced.uvs, expected.uvs);
        assert_eq!(traced.triangles, expected.triangles);
    }
    #[test]
    #[ignore = "explicit release-mode 4K memory/time check"]
    fn bounded_4k_trace_benchmark() {
        let pixels = image(4096, 4096, |x, _| {
            if x < 2048 {
                [20, 40, 60, 255]
            } else {
                [220, 180, 90, 255]
            }
        });
        let started = std::time::Instant::now();
        let result = trace_rgba(
            4096,
            4096,
            &pixels,
            TraceOptions {
                inner: true,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        assert!(result.uvs.len() / 2 <= 256);
        assert!(result.inner_count > 0);
        assert!(result.edges.len() / 2 > result.hull);
        assert!(result.budget_adjusted);
        println!(
            "4K opaque+straight detail: {:?}, {} vertices, {} triangles",
            started.elapsed(),
            result.uvs.len() / 2,
            result.triangles.len() / 3
        );
        // A large typed roundtrip also covers array/ref counts above 127.
        use fbones_format::minimal::{
            meshes::{Mesh, Vertex},
            regions::{
                decode_regions, encode_region_payload, encode_regions, Attachment, Region,
                RegionProject, Slot,
            },
            MinimalProject,
        };
        let region = Region {
            name: "own".into(),
            path: String::new(),
            x: 0.,
            y: 0.,
            rotation: 0.,
            scale_x: 1.,
            scale_y: 1.,
            width: 4096.,
            height: 4096.,
        };
        let mesh = Mesh {
            image: region,
            weighted: false,
            uvs: result.uvs.clone(),
            triangles: result.triangles.clone(),
            edges: result.edges.clone(),
            hull: result.hull,
            bones: vec![0],
            vertices: result
                .uvs
                .chunks_exact(2)
                .map(|uv| Vertex {
                    weights: vec![1.],
                    positions: vec![(uv[0] - 0.5) * 4096., (0.5 - uv[1]) * 4096.],
                })
                .collect(),
        };
        let project = RegionProject {
            rig: MinimalProject::new("own trace".into(), [19; 16]),
            images_root: "./images/".into(),
            slots: vec![Slot {
                blend: fbones_format::minimal::regions::BlendMode::Normal,
                name: "own".into(),
                bone: 0,
                attachment: Some(Attachment::Mesh(Box::new(mesh))),
                visible: true,
                color: [255; 4],
            }],
            region_order: vec![0],
        };
        let payload = encode_region_payload(&project).unwrap();
        assert_eq!(decode_regions(&payload).unwrap(), project);
        if let Some(folder) = std::env::var_os("FBONES_TRACE_FIXTURE_DIR") {
            let root = std::path::PathBuf::from(folder);
            std::fs::create_dir_all(root.join("images")).unwrap();
            let bytes = encode_regions(&project).unwrap();
            std::fs::write(root.join("own-trace.fbones"), &bytes).unwrap();
            std::fs::write(root.join("own-trace.spine"), &bytes).unwrap();
            let file = std::fs::File::create(root.join("images/own.png")).unwrap();
            let mut encoder = png::Encoder::new(file, 4096, 4096);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            encoder
                .write_header()
                .unwrap()
                .write_image_data(&pixels)
                .unwrap();
        }
        drop(pixels);
        let pixels = image(
            4096,
            4096,
            |x, y| if (x + y) % 2 == 0 { [255; 4] } else { [0; 4] },
        );
        let started = std::time::Instant::now();
        assert!(trace_rgba(4096, 4096, &pixels, TraceOptions::default()).is_err());
        println!("4K pathological alpha rejected: {:?}", started.elapsed());
        drop(pixels);
        let pixels = image(4096, 4096, |x, y| {
            let mut v = (x as u32)
                .wrapping_mul(0x9e37_79b9)
                .wrapping_add((y as u32).wrapping_mul(0x85eb_ca6b));
            v ^= v >> 16;
            v = v.wrapping_mul(0xc2b2_ae35);
            v ^= v >> 13;
            [v as u8, (v >> 8) as u8, (v >> 16) as u8, 255]
        });
        let started = std::time::Instant::now();
        let result = trace_rgba(
            4096,
            4096,
            &pixels,
            TraceOptions {
                inner: true,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        assert!(result.uvs.len() / 2 <= 256);
        println!(
            "4K dense RGB noise: {:?}, {} vertices",
            started.elapsed(),
            result.uvs.len() / 2
        );
    }
    #[test]
    fn uncorrelated_color_texture_is_not_invented_as_long_straight_features() {
        let pixels = image(128, 128, |x, y| {
            let mut v = (x as u32)
                .wrapping_mul(0x9e37_79b9)
                .wrapping_add((y as u32).wrapping_mul(0x85eb_ca6b));
            v ^= v >> 16;
            v = v.wrapping_mul(0xc2b2_ae35);
            v ^= v >> 13;
            [v as u8, (v >> 8) as u8, (v >> 16) as u8, 255]
        });
        let result = trace_rgba(
            128,
            128,
            &pixels,
            TraceOptions {
                inner: true,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        assert!(result.inner_count > 0);
        assert!(result.uvs.len() / 2 <= 256);
        assert_eq!(result.edges.len() / 2, result.hull);
    }
    #[test]
    fn oblique_internal_lines_and_zero_tolerance_sawtooth_are_bounded() {
        let pixels = image(128, 128, |x, y| {
            if (y as f64) < x as f64 * 0.3 + 40.0 {
                [20, 30, 40, 255]
            } else {
                [230, 200, 120, 255]
            }
        });
        let result = trace_rgba(
            128,
            128,
            &pixels,
            TraceOptions {
                inner: true,
                inner_spacing: 12.,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        let p = points(&result);
        assert!(result.edges.chunks_exact(2).any(|edge| {
            let (a, b) = (p[edge[0] as usize], p[edge[1] as usize]);
            edge[0] as usize >= result.hull
                && edge[1] as usize >= result.hull
                && (a[1] - 0.3 * a[0] - 40. / 128.).abs() < 0.04
                && (b[1] - 0.3 * b[0] - 40. / 128.).abs() < 0.04
        }));
        let pixels = image(4096, 16, |x, y| {
            if y >= 8 || x % 2 == 0 {
                [255; 4]
            } else {
                [0; 4]
            }
        });
        let result = trace_rgba(
            4096,
            16,
            &pixels,
            TraceOptions {
                tolerance: 0.,
                ..TraceOptions::default()
            },
        )
        .unwrap();
        assert!(result.uvs.len() / 2 <= 256);
        assert!(result.budget_adjusted);
    }
}
