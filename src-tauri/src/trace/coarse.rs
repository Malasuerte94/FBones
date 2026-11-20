//! Masked color support for contrast edges obscured by fine texture.
use super::{ridges::Raster, Feature};

// Each cell stores the sum of its visible RGB values and the visible count.
type ColorSum = [u64; 4];

fn box_sums(
    input: &[ColorSum],
    columns: usize,
    rows: usize,
    span: usize,
    extra_after: bool,
) -> Vec<ColorSum> {
    let stride = columns + 1;
    let mut summed = vec![[0; 4]; stride * (rows + 1)];
    for y in 0..rows {
        let mut row = [0; 4];
        for x in 0..columns {
            let cell = input[y * columns + x];
            let above = summed[y * stride + x + 1];
            for channel in 0..4 {
                row[channel] += cell[channel];
            }
            summed[(y + 1) * stride + x + 1] = std::array::from_fn(|i| above[i] + row[i]);
        }
    }
    // Alternate the centering of an even support so the two passes do not
    // shift the location of the detected gradient.
    let before = span / 2 - usize::from(span % 2 == 0 && extra_after);
    let after = span - before;
    (0..rows)
        .flat_map(|y| {
            let summed = &summed;
            let top = y.saturating_sub(before) * stride;
            let bottom = (y + after).min(rows) * stride;
            (0..columns).map(move |x| {
                let left = x.saturating_sub(before);
                let right = (x + after).min(columns);
                std::array::from_fn(|i| {
                    (summed[bottom + right][i] - summed[bottom + left][i])
                        - (summed[top + right][i] - summed[top + left][i])
                })
            })
        })
        .collect()
}

pub(super) fn features(
    pixels: &[u8],
    raster: Raster<'_>,
    step: usize,
    spacing: f64,
    threshold: f64,
) -> Vec<Feature> {
    let columns = raster.width.div_ceil(step);
    let rows = raster.height.div_ceil(step);
    if columns < 3 || rows < 3 {
        return vec![];
    }
    let span = (spacing * 0.75 / step as f64).round().clamp(3.0, 16.0) as usize;
    let mut grid = vec![[0; 4]; columns * rows];
    for (y, (mask_row, rgba_row)) in raster
        .mask
        .chunks_exact(raster.width)
        .zip(pixels.chunks_exact(raster.width * 4))
        .enumerate()
    {
        for (x, (&opaque, rgb)) in mask_row.iter().zip(rgba_row.chunks_exact(4)).enumerate() {
            if opaque == 0 {
                continue;
            }
            let cell = &mut grid[y / step * columns + x / step];
            for channel in 0..3 {
                cell[channel] += u64::from(rgb[channel]);
            }
            cell[3] += 1;
        }
    }
    let broad = box_sums(
        &box_sums(&grid, columns, rows, span, false),
        columns,
        rows,
        span,
        true,
    );
    let minimum_count = (span.pow(4) * step * step) as f64 * 0.55;
    let contrast = (threshold * 255.0).ceil().max(1.0);
    let gain = span as f64 / 8.0;
    let average: Vec<_> = broad
        .iter()
        .map(|cell| {
            (cell[3] > 0)
                .then(|| std::array::from_fn::<_, 3, _>(|i| cell[i] as f64 / cell[3] as f64))
        })
        .collect();
    let mut result = vec![];
    for y in 1..rows - 1 {
        for x in 1..columns - 1 {
            let i = y * columns + x;
            if (broad[i][3] as f64) < minimum_count || grid[i][3] == 0 {
                continue;
            }
            let center = average[i].unwrap();
            let tap = |index: usize| average[index].unwrap_or(center);
            let [nw, n, ne, w, e, sw, s, se] = [
                i - columns - 1,
                i - columns,
                i - columns + 1,
                i - 1,
                i + 1,
                i + columns - 1,
                i + columns,
                i + columns + 1,
            ]
            .map(tap);
            let mut strongest = (0.0, 0.0, 0.0);
            for channel in 0..3 {
                let gx = ne[channel] + 2.0 * e[channel] + se[channel]
                    - nw[channel]
                    - 2.0 * w[channel]
                    - sw[channel];
                let gy = sw[channel] + 2.0 * s[channel] + se[channel]
                    - nw[channel]
                    - 2.0 * n[channel]
                    - ne[channel];
                let magnitude = gx.hypot(gy);
                if magnitude > strongest.0 {
                    strongest = (magnitude, gx, gy);
                }
            }
            // Compensate for the attenuation of an isolated step by the
            // triangular kernel. Retain the user's absolute contrast cutoff.
            let strength = (strongest.0 * gain).min(255.0);
            if strength >= contrast {
                result.push(Feature {
                    point: [
                        (x as f64 + 0.5) * step as f64,
                        (y as f64 + 0.5) * step as f64,
                    ],
                    strength,
                    normal: [strongest.1 / strongest.0, strongest.2 / strongest.0],
                });
            }
        }
    }
    result
}
