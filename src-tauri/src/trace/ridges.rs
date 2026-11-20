//! Optional residual contrast curves. Straight constraints take precedence.
use super::{
    distance, intersects, occupied, rdp, segment_distance, simplify, Feature, Point, TraceOptions,
    EPS,
};

const MAX_CURVES: usize = 4;
const MAX_CURVE_POINTS: usize = 48;
const MAX_CANDIDATE_CURVES: usize = MAX_CURVES * 2;

#[derive(Clone, Copy)]
pub(super) struct Raster<'a> {
    pub mask: &'a [u8],
    pub width: usize,
    pub height: usize,
}

impl Raster<'_> {
    // Walk the raster cells crossed by a chord. Endpoint and midpoint tests
    // alone could connect a curve across a small alpha-rejected gap.
    pub(super) fn opaque(self, a: Point, b: Point) -> bool {
        let mut x = a[0].floor() as isize;
        let mut y = a[1].floor() as isize;
        let end_x = b[0].floor() as isize;
        let end_y = b[1].floor() as isize;
        let dx = b[0] - a[0];
        let dy = b[1] - a[1];
        let sx = (end_x - x).signum();
        let sy = (end_y - y).signum();
        let occupied_at =
            |x: isize, y: isize| occupied([x as f64, y as f64], self.mask, self.width, self.height);
        if !occupied_at(x, y) {
            return false;
        }
        while x != end_x || y != end_y {
            let tx = if x == end_x {
                f64::INFINITY
            } else {
                ((x + (sx > 0) as isize) as f64 - a[0]) / dx
            };
            let ty = if y == end_y {
                f64::INFINITY
            } else {
                ((y + (sy > 0) as isize) as f64 - a[1]) / dy
            };
            if (tx - ty).abs() <= EPS && (!occupied_at(x, y + sy) || !occupied_at(x + sx, y)) {
                return false;
            }
            if tx <= ty {
                x += sx;
            } else {
                y += sy;
            }
            if !occupied_at(x, y) {
                return false;
            }
        }
        true
    }
}

pub(super) enum Samples<'a> {
    Fine(&'a [Feature], usize),
    Coarse(&'a [Feature], usize),
}

impl<'a> Samples<'a> {
    fn values(&self) -> (&'a [Feature], usize) {
        match *self {
            Self::Fine(features, step) | Self::Coarse(features, step) => (features, step),
        }
    }
}

fn ridge_paths(
    samples: Samples<'_>,
    raster: Raster<'_>,
    straight: &[[Point; 2]],
    spacing: f64,
) -> Vec<Vec<Point>> {
    let (features, sample_step) = samples.values();
    let columns = raster.width.div_ceil(sample_step);
    let rows = raster.height.div_ceil(sample_step);
    let cell = |p: Point| {
        [
            (p[0] as usize / sample_step) as isize,
            (p[1] as usize / sample_step) as isize,
        ]
    };
    let mut cells = vec![None; columns * rows];
    for (index, feature) in features.iter().enumerate() {
        let [x, y] = cell(feature.point);
        cells[y as usize * columns + x as usize] = Some(index);
    }
    let at = |x: isize, y: isize| {
        if x < 0 || y < 0 || x >= columns as isize || y >= rows as isize {
            return None;
        }
        cells[y as usize * columns + x as usize]
    };
    let strength = |x, y| at(x, y).map_or(0.0, |index| features[index].strength);
    let ridge: Vec<_> = features
        .iter()
        .map(|feature| {
            let [x, y] = cell(feature.point);
            let [nx, ny] = feature.normal;
            let (mut dx, mut dy) = (nx.round() as isize, ny.round() as isize);
            if matches!(samples, Samples::Coarse(..)) {
                // The broad masks form a wider ridge. Its dominant grid
                // axis avoids diagonal nonmax decisions fragmenting it.
                if nx.abs() >= ny.abs() {
                    dy = 0;
                } else {
                    dx = 0;
                }
            }
            feature.strength > strength(x + dx, y + dy)
                && feature.strength >= strength(x - dx, y - dy)
                && straight
                    .iter()
                    .all(|&[a, b]| segment_distance(feature.point, a, b) >= spacing * 0.4)
        })
        .collect();

    let mut links = vec![[None; 2]; features.len()];
    for (index, feature) in features
        .iter()
        .enumerate()
        .filter(|(index, _)| ridge[*index])
    {
        let [x, y] = cell(feature.point);
        let [nx, ny] = feature.normal;
        let mut best = [None::<(f64, f64, f64, usize)>; 2];
        for (ox, oy) in [
            (-1, -1),
            (0, -1),
            (1, -1),
            (-1, 0),
            (1, 0),
            (-1, 1),
            (0, 1),
            (1, 1),
        ] {
            let Some(other) = at(x + ox, y + oy).filter(|other| ridge[*other]) else {
                continue;
            };
            let neighbor = features[other];
            let [mx, my] = neighbor.normal;
            if nx * mx + ny * my < 0.705 {
                continue;
            }
            let (dx, dy) = (
                neighbor.point[0] - feature.point[0],
                neighbor.point[1] - feature.point[1],
            );
            let length = dx.hypot(dy);
            let cross_normal = ((dx * nx + dy * ny).abs().max((dx * mx + dy * my).abs())) / length;
            if length > sample_step as f64 * 1.5 || cross_normal > 0.78 {
                continue;
            }
            let side = usize::from(nx * dy - ny * dx > 0.0);
            let key = (length, cross_normal, -neighbor.strength, other);
            if best[side].is_none_or(|old| key < old)
                && raster.opaque(feature.point, neighbor.point)
            {
                best[side] = Some(key);
            }
        }
        links[index] = best.map(|choice| choice.map(|entry| entry.3));
    }
    for index in 0..links.len() {
        links[index] = links[index]
            .map(|neighbor| neighbor.filter(|other| links[*other].contains(&Some(index))));
    }

    let mut seen = vec![false; features.len()];
    let mut paths = Vec::new();
    // Follow paths from endpoints before visiting closed components.
    for endpoints in [true, false] {
        for (start, entry) in links.iter().enumerate() {
            let degree = entry.iter().flatten().count();
            if seen[start] || degree == 0 || endpoints != (degree == 1) {
                continue;
            }
            let mut path = vec![features[start].point];
            let mut current = start;
            let mut previous = None;
            let mut length = 0.0;
            seen[start] = true;
            while let Some(next) = links[current]
                .into_iter()
                .flatten()
                .find(|i| Some(*i) != previous)
            {
                if seen[next] && next != start {
                    break;
                }
                path.push(features[next].point);
                length += distance(features[current].point, features[next].point);
                if next == start {
                    break;
                }
                seen[next] = true;
                previous = Some(current);
                current = next;
            }
            if path.len() >= 8 && length >= 2.0 * spacing {
                paths.push((length, start, path));
            }
        }
    }
    paths.sort_by(|a, b| b.0.total_cmp(&a.0).then(a.1.cmp(&b.1)));
    paths
        .into_iter()
        .take(MAX_CANDIDATE_CURVES)
        .map(|(_, _, path)| path)
        .collect()
}

fn close_to(a: Point, b: Point, c: Point, d: Point, spacing: f64) -> bool {
    intersects(a, b, c, d)
        || segment_distance(a, c, d) < spacing
        || segment_distance(b, c, d) < spacing
        || segment_distance(c, a, b) < spacing
        || segment_distance(d, a, b) < spacing
}

fn outline_segments(points: &[Point]) -> impl Iterator<Item = [Point; 2]> + '_ {
    points
        .iter()
        .copied()
        .zip(points.iter().copied().cycle().skip(1))
        .map(|(a, b)| [a, b])
}

fn resample(path: &[Point], closed: bool, spacing: f64, budget: usize) -> Option<Vec<Point>> {
    let spans = path.windows(2).map(|w| [w[0], w[1]]);
    let closing = closed.then(|| [path[path.len() - 1], path[0]]);
    let mut points = Vec::new();
    for [a, b] in spans.chain(closing) {
        let samples = (distance(a, b) / spacing).ceil().max(1.0) as usize;
        if points.len() + samples + usize::from(!closed) > budget {
            return None;
        }
        for index in 0..samples {
            let t = index as f64 / samples as f64;
            points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
    }
    if !closed {
        points.push(*path.last()?);
    }
    Some(points)
}

pub(super) fn add_paths(
    points: &mut Vec<Point>,
    boundary: &[Point],
    samples: Samples<'_>,
    straight: &[[Point; 2]],
    raster: Raster<'_>,
    options: TraceOptions,
) -> Vec<[usize; 2]> {
    let limit = options.max_vertices.min(points.len() + MAX_CURVE_POINTS);
    if samples.values().0.len() < 8 || limit.saturating_sub(points.len()) < 3 {
        return vec![];
    }
    let spacing = f64::from(options.inner_spacing);
    let tolerance = f64::from(options.inner_tolerance);
    let margin = spacing * 0.15;
    let clearance = (spacing * 0.3).max(1.0);
    let hull_segments: Vec<_> = outline_segments(boundary).collect();
    let mut accepted_segments = straight.to_vec();
    let mut edges = vec![];
    let mut accepted = 0;
    let mut simplify_work = 1_000_000;
    for path in ridge_paths(samples, raster, straight, spacing) {
        let closed = path.first() == path.last();
        let simplified = if closed {
            simplify(&path[..path.len() - 1], tolerance)
        } else {
            rdp(&path, tolerance, &mut simplify_work)
        };
        let Some(simplified) = simplified.filter(|trail| trail.len() >= 3) else {
            continue;
        };
        let Some(candidate) = resample(&simplified, closed, spacing, limit - points.len()) else {
            continue;
        };
        if candidate.iter().enumerate().any(|(i, p)| {
            points
                .iter()
                .chain(&candidate[..i])
                .any(|&other| distance(*p, other) < margin)
        }) {
            continue;
        }

        let mut chords: Vec<_> = candidate.windows(2).map(|w| [w[0], w[1]]).collect();
        if closed {
            chords.push([candidate[candidate.len() - 1], candidate[0]]);
        }
        let valid = chords.iter().enumerate().all(|(i, &[a, b])| {
            raster.opaque(a, b)
                && hull_segments
                    .iter()
                    .all(|&[c, d]| !close_to(a, b, c, d, clearance))
                && accepted_segments
                    .iter()
                    .all(|&[c, d]| !close_to(a, b, c, d, margin))
                && chords[..i].iter().enumerate().all(|(j, &[c, d])| {
                    if j + 1 == i {
                        segment_distance(b, c, d) >= margin && segment_distance(c, a, b) >= margin
                    } else if closed && i + 1 == chords.len() && j == 0 {
                        segment_distance(a, c, d) >= margin && segment_distance(d, a, b) >= margin
                    } else {
                        !close_to(a, b, c, d, margin)
                    }
                })
        });
        if !valid {
            continue;
        }

        let offset = points.len();
        edges.extend((1..candidate.len()).map(|i| [offset + i - 1, offset + i]));
        if closed {
            edges.push([offset, offset + candidate.len() - 1]);
        }
        points.extend(candidate);
        accepted_segments.extend(chords);
        accepted += 1;
        if accepted == MAX_CURVES || limit.saturating_sub(points.len()) < 3 {
            break;
        }
    }
    edges
}
