//! Deterministic alpha silhouette and image-detail tracing. This is our own
//! bounded algorithm, not a claim to reproduce Spine's proprietary tracer.
use crate::{images::ImageAsset, project::AppError, triangulation};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeSet, HashMap},
    io::Cursor,
};

mod coarse;
mod padding;
mod ridges;
#[cfg(test)]
#[path = "trace/padding_tests.rs"]
mod padding_tests;

type Point = [f64; 2];
const MAX_VERTICES: usize = 256;
const MAX_BOUNDARY_EDGES: usize = 131_072;
const EPS: f64 = 1e-7;

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct TraceOptions {
    /// Pixels with alpha <= this value are ignored, including low-alpha shadows.
    pub alpha_threshold: u8,
    /// Outward dilation radius in source pixels, clipped to the image bounds.
    pub padding: u8,
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
            padding: 0,
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
    strength: f64,
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
    // Compare squared Sobel magnitudes at the same integer contrast cutoff
    // that the stored strength uses. This leaves square roots to edge samples.
    let minimum_gradient = (threshold * 255.0).ceil().max(1.0) as i32 * 4;
    let minimum_squared = minimum_gradient * minimum_gradient;
    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let i = y * width + x;
            if [i, i - 1, i + 1, i - width, i + width]
                .iter()
                .any(|i| mask[*i] == 0)
            {
                continue;
            }
            // Ignore RGB underneath alpha-rejected diagonal taps. Sampling
            // the opaque center there avoids injecting an artificial edge.
            let [nw, ne, sw, se] = [i - width - 1, i - width + 1, i + width - 1, i + width + 1]
                .map(|index| if mask[index] == 0 { i } else { index });
            let mut gradient = (0i32, 0i32, 0i32);
            for c in 0..3 {
                let value = |index: usize| i32::from(pixels[index * 4 + c]);
                let gx = value(ne) + 2 * value(i + 1) + value(se)
                    - value(nw)
                    - 2 * value(i - 1)
                    - value(sw);
                let gy = value(sw) + 2 * value(i + width) + value(se)
                    - value(nw)
                    - 2 * value(i - width)
                    - value(ne);
                let length = gx * gx + gy * gy;
                if length > gradient.0 {
                    gradient = (length, gx, gy);
                }
            }
            if gradient.0 < minimum_squared {
                continue;
            }
            let length = f64::from(gradient.0).sqrt();
            let strength = (length / 4.0).floor().min(255.0);
            let cell = y / step * columns + x / step;
            if cells[cell].is_none_or(|f| strength > f.strength) {
                cells[cell] = Some(Feature {
                    point: [x as f64 + 0.5, y as f64 + 0.5],
                    strength,
                    normal: [
                        f64::from(gradient.1) / length,
                        f64::from(gradient.2) / length,
                    ],
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
/// Retain dominant straight edges, then try residual contrast curves before
/// adding isolated contrast samples and sparse surface coverage.
fn inner_points(
    points: &mut Vec<Point>,
    hull: usize,
    pixels: &[u8],
    mask: &[u8],
    width: usize,
    height: usize,
    options: TraceOptions,
) -> (Vec<[usize; 2]>, bool, Option<Vec<u16>>) {
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
            .total_cmp(&a.strength)
            .then(a.point[1].total_cmp(&b.point[1]))
            .then(a.point[0].total_cmp(&b.point[0]))
    });
    let mut candidate = points.clone();
    let raster = ridges::Raster {
        mask,
        width,
        height,
    };
    let mut curves = ridges::add_paths(
        &mut candidate,
        &boundary,
        ridges::Samples::Fine(&feature, sample_step),
        &segments,
        raster,
        options,
    );
    if curves.is_empty()
        && segments.is_empty()
        && feature.len() >= 8
        && feature.len() * sample_step * sample_step * 8 >= mask.iter().filter(|&&v| v != 0).count()
    {
        // Dense detail can hide a persistent edge from the fine detector.
        // Try broader color support only after the exact fine path fails.
        let mut coarse = coarse::features(
            pixels,
            raster,
            sample_step,
            spacing,
            f64::from(options.inner_threshold),
        );
        coarse.retain(|f| valid(f.point));
        curves = ridges::add_paths(
            &mut candidate,
            &boundary,
            ridges::Samples::Coarse(&coarse, sample_step),
            &segments,
            raster,
            options,
        );
    }
    if !curves.is_empty() {
        let edges = finish_inner(&mut candidate, &feature, &segments, &curves, raster, options, &valid);
        let uvs = trace_uvs(&candidate, width, height);
        let constraints = trace_constraints(hull, &edges);
        let pixel = |i: usize| {
            [
                f64::from(uvs[2 * i]) * width as f64,
                f64::from(uvs[2 * i + 1]) * height as f64,
            ]
        };
        let triangles = if curves.iter().all(|&[a, b]| raster.opaque(pixel(a), pixel(b))) {
            triangulation::triangulate_with_metric(
                &uvs,
                hull,
                &constraints,
                [width as f64, height as f64],
            )
            .ok()
        } else {
            None
        };
        if let Some(triangles) = triangles {
            // f32 UVs can produce a collinear split that was absent in pixel
            // space. Publish a curve only when every serialized edge is real.
            let actual: BTreeSet<_> = triangles
                .chunks_exact(3)
                .flat_map(|face| {
                    [[face[0], face[1]], [face[1], face[2]], [face[2], face[0]]]
                        .map(|[a, b]| [a.min(b) as usize, a.max(b) as usize])
                })
                .collect();
            if curves.iter().all(|edge| actual.contains(edge)) {
                *points = candidate;
                return (edges, adjusted, Some(triangles));
            }
        }
    }
    // The optional pass can fall back without changing the straight trace.
    (
        finish_inner(points, &feature, &segments, &[], raster, options, &valid),
        adjusted,
        None,
    )
}

fn finish_inner(
    points: &mut Vec<Point>,
    feature: &[Feature],
    segments: &[[Point; 2]],
    curves: &[[usize; 2]],
    raster: ridges::Raster<'_>,
    options: TraceOptions,
    valid: impl Fn(Point) -> bool,
) -> Vec<[usize; 2]> {
    let spacing = f64::from(options.inner_spacing);
    let curves_in_pixels: Vec<_> = curves.iter().map(|&[a, b]| [points[a], points[b]]).collect();
    let away_from_curves = |p| {
        curves_in_pixels
            .iter()
            .all(|&[a, b]| segment_distance(p, a, b) >= spacing * 0.4)
    };
    for f in feature {
        if points.len() >= options.max_vertices {
            break;
        }
        if points.iter().all(|p| distance(*p, f.point) >= spacing)
            && away_from_curves(f.point)
            && segments
                .iter()
                .all(|line| segment_distance(f.point, line[0], line[1]) >= spacing * 0.4)
        {
            points.push(f.point);
        }
    }
    let remaining = options.max_vertices.saturating_sub(points.len());
    if remaining > 0 {
        let solid = raster.mask.iter().filter(|v| **v != 0).count() as f64;
        let step = spacing.max((solid / remaining as f64).sqrt());
        let mut y = step / 2.0;
        while y < raster.height as f64 && points.len() < options.max_vertices {
            let mut x = step / 2.0;
            while x < raster.width as f64 && points.len() < options.max_vertices {
                let p = [x, y];
                if valid(p)
                    && away_from_curves(p)
                    && points.iter().all(|q| distance(*q, p) >= step * 0.65)
                {
                    points.push(p);
                }
                x += step;
            }
            y += step;
        }
    }
    let mut edges: BTreeSet<_> = curves.iter().copied().collect();
    for &[a, b] in segments {
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
    edges.into_iter().collect()
}

fn trace_uvs(points: &[Point], width: usize, height: usize) -> Vec<f32> {
    points
        .iter()
        .flat_map(|p| [(p[0] / width as f64) as f32, (p[1] / height as f64) as f32])
        .collect()
}

fn trace_constraints(hull: usize, inner: &[[usize; 2]]) -> Vec<u32> {
    (0..hull)
        .flat_map(|i| [i as u32, ((i + 1) % hull) as u32])
        .chain(inner.iter().flatten().map(|&index| index as u32))
        .collect()
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
        || options.padding > 32
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
    // Padding changes the traced outline. Inner features still require pixels
    // from the original alpha mask.
    let loops = if options.padding == 0 {
        contours(&mask, width, height)?
    } else {
        let expanded = padding::expand(&mask, width, height, options.padding);
        contours(&expanded, width, height)?
    };
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
    // The alpha outline uses the same budget whether or not inner detail is on.
    let budget = options.max_vertices;
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
    let (inner_edges, inner_adjusted, validated_triangles) = if options.inner && hull < budget {
        inner_points(&mut points, hull, pixels, &mask, width, height, options)
    } else {
        (vec![], false, None)
    };
    adjusted |= inner_adjusted;
    let edges = trace_constraints(hull, &inner_edges);
    let uvs = trace_uvs(&points, width, height);
    let triangles = match validated_triangles {
        Some(triangles) => triangles,
        None => {
            triangulation::triangulate_with_metric(&uvs, hull, &edges, [width as f64, height as f64])?
        }
    };
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
    fn inner_detail_uses_only_capacity_left_by_the_exact_notched_outline() {
        let opaque = |x: usize, y: usize| {
            (8..120).contains(&x)
                && (8..120).contains(&y)
                && !(y < 24
                    && [(20, 30), (44, 54), (68, 78), (92, 102)]
                        .into_iter()
                        .any(|(start, end)| (start..end).contains(&x)))
        };
        let pixels = image(128, 128, |x, y| {
            [108, 108, 108, if opaque(x, y) { 255 } else { 0 }]
        });
        for max_vertices in [24, 20] {
            let options = TraceOptions {
                tolerance: 0.,
                spacing: 4096.,
                max_vertices,
                ..TraceOptions::default()
            };
            let outline = trace_rgba(128, 128, &pixels, options).unwrap();
            let detailed = trace_rgba(
                128,
                128,
                &pixels,
                TraceOptions {
                    inner: true,
                    ..options
                },
            )
            .unwrap();
            assert_eq!(outline.hull, 20);
            assert_eq!(detailed.hull, outline.hull);
            assert_eq!(&detailed.uvs[..2 * detailed.hull], outline.uvs.as_slice());
            assert_eq!(
                &detailed.edges[..outline.edges.len()],
                outline.edges.as_slice()
            );
            assert_eq!(outline.used_tolerance.to_bits(), 0.0_f32.to_bits());
            assert_eq!(outline.used_spacing.to_bits(), 4096.0_f32.to_bits());
            assert_eq!(
                detailed.used_tolerance.to_bits(),
                outline.used_tolerance.to_bits()
            );
            assert_eq!(detailed.used_spacing.to_bits(), outline.used_spacing.to_bits());
            assert!(detailed.uvs.len() / 2 <= max_vertices);
            let boundary: Vec<_> = points(&outline)
                .into_iter()
                .map(|[x, y]| [x * 128., y * 128.])
                .collect();
            for y in 0..128 {
                for x in 0..128 {
                    assert_eq!(
                        inside([x as f64 + 0.5, y as f64 + 0.5], &boundary, 0.),
                        opaque(x, y),
                        "Outline changed opacity coverage at ({x}, {y})"
                    );
                }
            }
            if max_vertices == outline.hull {
                assert_eq!(detailed.inner_count, 0);
                assert_eq!(
                    serde_json::to_value(detailed).unwrap(),
                    serde_json::to_value(outline).unwrap()
                );
            } else {
                assert!(detailed.inner_count > 0);
            }
        }
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
    fn hidden_diagonal_rgb_does_not_change_outer_or_inner_geometry() {
        let pixel = |x, y, hidden_red| {
            if x == y && (12..84).contains(&x) {
                [hidden_red, 0, 0, if x % 2 == 0 { 0 } else { 16 }]
            } else {
                [0, 0, 0, 255]
            }
        };
        let ordinary = image(96, 96, |x, y| pixel(x, y, 0));
        let hidden_diagonal = image(96, 96, |x, y| pixel(x, y, 255));
        for inner in [false, true] {
            let options = TraceOptions {
                alpha_threshold: 16,
                inner,
                inner_spacing: 8.,
                inner_tolerance: 1.5,
                max_vertices: 64,
                ..TraceOptions::default()
            };
            let baseline = trace_rgba(96, 96, &ordinary, options).unwrap();
            let changed = trace_rgba(96, 96, &hidden_diagonal, options).unwrap();
            assert!(baseline.filled_holes > 0);
            assert_eq!(baseline.inner_count > 0, inner);
            assert_eq!(baseline.edges.len(), baseline.hull * 2);
            assert_eq!(
                serde_json::to_value(changed).unwrap(),
                serde_json::to_value(baseline).unwrap(),
                "Invisible diagonal RGB changed the full trace with inner={inner}"
            );
        }
    }
    #[test]
    fn near_threshold_visible_steps_keep_vertical_and_diagonal_edges_within_budget() {
        for diagonal in [false, true] {
            let pixels = image(128, 128, |x, y| {
                let high = if diagonal { x >= y } else { x >= 64 };
                let channel = if high { 168 } else { 108 };
                [channel, channel, channel, 255]
            });
            let options = TraceOptions {
                inner: true,
                inner_threshold: 0.2,
                inner_spacing: 16.,
                inner_tolerance: 1.5,
                max_vertices: 48,
                ..TraceOptions::default()
            };
            let result = trace_rgba(128, 128, &pixels, options).unwrap();
            let positions = points(&result);
            let near_step = |[x, y]: Point| {
                let offset = if diagonal { x - y } else { x - 0.5 };
                offset.abs() < 0.035
            };
            assert!(positions.len() <= options.max_vertices);
            assert!(
                result.edges.chunks_exact(2).any(|edge| {
                    let (a, b) = (edge[0] as usize, edge[1] as usize);
                    a >= result.hull
                        && b >= result.hull
                        && near_step(positions[a])
                        && near_step(positions[b])
                        && distance(positions[a], positions[b]) > 0.06
                }),
                "Missing an internal constraint on the visible step with diagonal={diagonal}"
            );

            let below_threshold = trace_rgba(
                128,
                128,
                &pixels,
                TraceOptions {
                    inner_threshold: 0.28,
                    ..options
                },
            )
            .unwrap();
            assert_eq!(below_threshold.edges.len(), below_threshold.hull * 2);
        }
    }
    fn weak_rim_pixel(x: usize, y: usize, alpha: u8) -> [u8; 4] {
        let color = if distance([x as f64 + 0.5, y as f64 + 0.5], [64., 64.]) <= 34. {
            168
        } else {
            108
        };
        [color, color, color, alpha]
    }
    fn weak_rim_options() -> TraceOptions {
        TraceOptions {
            inner: true,
            tolerance: 1.5,
            spacing: 24.,
            inner_threshold: 0.2,
            inner_tolerance: 1.5,
            inner_spacing: 16.,
            max_vertices: 192,
            ..TraceOptions::default()
        }
    }
    #[test]
    fn inner_trace_links_a_weak_curved_rim_and_preserves_fixed_controls() {
        let circle = image(128, 128, |x, y| weak_rim_pixel(x, y, 255));
        let straight = image(128, 128, |x, _| {
            let color = if x >= 64 { 168 } else { 108 };
            [color, color, color, 255]
        });
        let options = weak_rim_options();
        let outer_options = TraceOptions {
            inner: false,
            ..options
        };
        let outline = trace_rgba(128, 128, &circle, outer_options).unwrap();
        let straight_outline = trace_rgba(128, 128, &straight, outer_options).unwrap();
        assert_eq!(
            serde_json::to_value(&outline).unwrap(),
            serde_json::to_value(straight_outline).unwrap()
        );
        let straight = trace_rgba(128, 128, &straight, options).unwrap();
        assert_eq!(
            (
                straight.hull,
                straight.inner_count,
                straight.edges.len() / 2 - straight.hull
            ),
            (24, 43, 8)
        );
        assert_eq!(&straight.uvs[..2 * straight.hull], outline.uvs.as_slice());

        let curved = trace_rgba(128, 128, &circle, options).unwrap();
        assert_eq!(curved.hull, outline.hull);
        assert_eq!(&curved.uvs[..2 * curved.hull], outline.uvs.as_slice());
        assert!(curved.uvs.len() / 2 <= options.max_vertices);
        assert_eq!(
            serde_json::to_value(&curved).unwrap(),
            serde_json::to_value(trace_rgba(128, 128, &circle, options).unwrap()).unwrap()
        );

        let coverage = connected_weak_rim_coverage(&curved, |_| true);
        assert!(
            coverage >= 180,
            "The largest connected component covered {coverage}/720 rim samples"
        );
    }
    fn connected_weak_rim_coverage(result: &TraceGeometry, visible: impl Fn(Point) -> bool) -> usize {
        let vertices: Vec<_> = points(result)
            .into_iter()
            .map(|[x, y]| [x * 128., y * 128.])
            .collect();
        let center = [64., 64.];
        let mut edges: Vec<_> = result
            .edges
            .chunks_exact(2)
            .map(|edge| [edge[0] as usize, edge[1] as usize])
            .filter(|&[a, b]| {
                let [start, end] = [vertices[a], vertices[b]];
                (a >= result.hull || b >= result.hull)
                    && distance(center, start) <= 37.
                    && distance(center, end) <= 37.
                    && segment_distance(center, start, end) >= 31.
            })
            .collect();
        let samples: Vec<_> = (0..720)
            .map(|i| {
                let angle = f64::from(i) * std::f64::consts::TAU / 720.;
                [64. + 34. * angle.cos(), 64. + 34. * angle.sin()]
            })
            .collect();
        let mut largest_coverage = 0;
        while let Some(edge) = edges.pop() {
            let mut connected = vec![edge];
            let mut index = 0;
            while let Some(&[a, b]) = connected.get(index) {
                for other in (0..edges.len()).rev() {
                    if edges[other].contains(&a) || edges[other].contains(&b) {
                        connected.push(edges.swap_remove(other));
                    }
                }
                index += 1;
            }
            let mut run = 0;
            for point in samples
                .iter()
                .cycle()
                .take(2 * samples.len())
                .copied()
            {
                if visible(point)
                    && connected
                        .iter()
                        .any(|&[a, b]| segment_distance(point, vertices[a], vertices[b]) <= 3.)
                {
                    run += 1;
                    largest_coverage = largest_coverage.max(run.min(samples.len()));
                } else {
                    run = 0;
                }
            }
        }
        largest_coverage
    }
    fn edge_stays_visible(a: Point, b: Point, visible: impl Fn(Point) -> bool) -> bool {
        // Split at pixel boundaries to detect any interval inside a rejected pixel.
        let mut cuts = vec![0., 1.];
        for axis in 0..2 {
            let delta = b[axis] - a[axis];
            if delta == 0. {
                continue;
            }
            let low = a[axis].min(b[axis]).ceil() as usize;
            let high = a[axis].max(b[axis]).ceil() as usize;
            cuts.extend((low..high).filter_map(|i| {
                let t = (i as f64 - a[axis]) / delta;
                (t > 0. && t < 1.).then_some(t)
            }));
        }
        cuts.sort_by(f64::total_cmp);
        cuts.windows(2).all(|pair| {
            if pair[1] - pair[0] <= 1e-12 {
                return true;
            }
            let t = (pair[0] + pair[1]) * 0.5;
            visible([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
        })
    }
    #[test]
    fn dense_texture_keeps_connected_contrast_only_where_the_seam_exists() {
        let options = weak_rim_options();
        for shaped in [false, true] {
            let alpha = |[x, y]: Point| {
                if shaped && ((x - 64.) / 57.).powi(2) + ((y - 64.) / 52.).powi(2) > 1. {
                    0
                } else if shaped && (94. ..104.).contains(&x) && (56. ..72.).contains(&y) {
                    12
                } else {
                    255
                }
            };
            let visible = |[x, y]: Point| {
                (0. ..128.).contains(&x)
                    && (0. ..128.).contains(&y)
                    && alpha([x.floor() + 0.5, y.floor() + 0.5]) > options.alpha_threshold
            };
            let mut outline_control = None;
            for has_seam in [false, true] {
                let pixels = image(128, 128, |x, y| {
                    let (px, py) = (x as f64 + 0.5, y as f64 + 0.5);
                    let ink = if (px % 12. - 6.).abs() + (py % 12. - 6.).abs() < 4.75 {
                        38
                    } else if (px + py) % 4. < 2. {
                        -26
                    } else {
                        -14
                    };
                    let alpha = alpha([px, py]);
                    let base = if has_seam {
                        weak_rim_pixel(x, y, alpha)[0]
                    } else {
                        108
                    };
                    let gray = (i16::from(base) + ink) as u8;
                    [gray, gray, gray, alpha]
                });
                let outline = trace_rgba(
                    128,
                    128,
                    &pixels,
                    TraceOptions {
                        inner: false,
                        ..options
                    },
                )
                .unwrap();
                let result = trace_rgba(128, 128, &pixels, options).unwrap();
                assert_eq!(&result.uvs[..2 * result.hull], outline.uvs.as_slice());
                assert_eq!(outline.filled_holes, usize::from(shaped));
                assert!(result.uvs.len() / 2 <= options.max_vertices);
                let outline = serde_json::to_value(outline).unwrap();
                if let Some(control) = &outline_control {
                    assert_eq!(&outline, control);
                } else {
                    outline_control = Some(outline);
                }
                if has_seam {
                    let vertices: Vec<_> = points(&result)
                        .into_iter()
                        .map(|[x, y]| [x * 128., y * 128.])
                        .collect();
                    for edge in result.edges.chunks_exact(2).skip(result.hull) {
                        assert!(edge_stays_visible(
                            vertices[edge[0] as usize],
                            vertices[edge[1] as usize],
                            visible
                        ));
                        assert!(result.triangles.chunks_exact(3).any(|face| {
                            face.contains(&(edge[0] as u16)) && face.contains(&(edge[1] as u16))
                        }));
                    }
                    let coverage = connected_weak_rim_coverage(&result, visible);
                    assert!(
                        coverage >= 180,
                        "Dense fixture with shaped={shaped} covered {coverage}/720 samples"
                    );
                    assert_eq!(
                        serde_json::to_value(&result).unwrap(),
                        serde_json::to_value(trace_rgba(128, 128, &pixels, options).unwrap()).unwrap()
                    );
                } else {
                    assert_eq!(
                        result.edges.len(),
                        result.hull * 2,
                        "Texture alone added internal constraints with shaped={shaped}"
                    );
                }
            }
        }
    }
    #[test]
    fn curved_trace_respects_a_transparent_gap_and_the_existing_vertex_cap() {
        let pixels = image(128, 128, |x, y| {
            let alpha = if (60..68).contains(&x) && (18..45).contains(&y) {
                0
            } else {
                255
            };
            weak_rim_pixel(x, y, alpha)
        });
        let mask: Vec<_> = pixels
            .chunks_exact(4)
            .map(|pixel| u8::from(pixel[3] > 16))
            .collect();
        let options = TraceOptions {
            max_vertices: 64,
            ..weak_rim_options()
        };
        let result = trace_rgba(128, 128, &pixels, options).unwrap();
        assert_eq!(result.filled_holes, 1);
        let vertices: Vec<_> = points(&result)
            .into_iter()
            .map(|[x, y]| [x * 128., y * 128.])
            .collect();
        assert!(vertices.len() <= options.max_vertices);
        for pair in result.edges.chunks_exact(2) {
            let [a, b] = [pair[0] as usize, pair[1] as usize];
            if a < result.hull && b < result.hull {
                continue;
            }
            let [start, end] = [vertices[a], vertices[b]];
            let steps = (distance(start, end).ceil() as usize).max(1);
            for i in 0..=steps {
                let t = i as f64 / steps as f64;
                let point = [
                    start[0] + (end[0] - start[0]) * t,
                    start[1] + (end[1] - start[1]) * t,
                ];
                assert!(
                    occupied(point, &mask, 128, 128),
                    "An internal edge crossed a transparent gap"
                );
            }
        }
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
