/// Dilate a binary mask by a pixel-center disk clipped to the image.
pub(super) fn expand(mask: &[u8], width: usize, height: usize, radius: u8) -> Vec<u8> {
    debug_assert!((1..=32).contains(&radius));
    debug_assert_eq!(mask.len(), width * height);
    if mask.is_empty() {
        return Vec::new();
    }
    let capped = radius + 1;
    let radius = usize::from(radius);
    let squared = radius * radius;
    let mut reaches = [0; 33];
    let reaches = &mut reaches[..=radius.min(width - 1)];
    let mut dy = radius;
    for (dx, reach) in reaches.iter_mut().enumerate() {
        while dx * dx + dy * dy > squared {
            dy -= 1;
        }
        *reach = dy;
    }

    let mut nearest = vec![capped; width];
    // A source row adds runs to rows y-r through y+r+1. Once y arrives,
    // the result at y-r is final, so its event row can be recycled.
    let event_rows = (2 * radius + 2).min(height);
    let mut events = vec![0i8; event_rows * width];
    let mut active = vec![0i8; width];
    let mut output = vec![0u8; mask.len()];
    let mut runs = [(0, None); 33];
    let runs = &mut runs[..reaches.len()];
    let mut write_row = |y: usize, events: &mut [i8]| {
        let slot = y % event_rows * width;
        let row = &mut output[y * width..(y + 1) * width];
        for ((pixel, count), change) in row
            .iter_mut()
            .zip(&mut active)
            .zip(&mut events[slot..slot + width])
        {
            // At most 65 source rows can cover a pixel at the largest radius.
            *count += *change;
            *pixel = u8::from(*count > 0);
            *change = 0;
        }
    };

    for (y, row) in mask.chunks_exact(width).enumerate() {
        nearest_horizontal(row, &mut nearest, capped);
        // Hoist the ring addressing out of the pixel loop. There are at most
        // width distinct horizontal distances even for a thin image.
        for (run, &reach) in runs.iter_mut().zip(reaches.iter()) {
            let start = y.saturating_sub(reach) % event_rows * width;
            let end = y + reach + 1;
            *run = (start, (end < height).then(|| end % event_rows * width));
        }
        for (x, &distance) in nearest.iter().enumerate() {
            let Some(&(start, end)) = runs.get(usize::from(distance)) else {
                continue;
            };
            // The nearest opaque X in this row supplies its entire possible
            // vertical run. Unioning those runs gives the exact disk mask.
            events[start + x] += 1;
            if let Some(end) = end {
                events[end + x] -= 1;
            }
        }
        if let Some(done) = y.checked_sub(radius) {
            write_row(done, &mut events);
        }
    }
    for y in height.saturating_sub(radius)..height {
        write_row(y, &mut events);
    }
    output
}

fn nearest_horizontal(row: &[u8], nearest: &mut [u8], capped: u8) {
    let mut distance = capped;
    for (&pixel, nearest) in row.iter().zip(nearest.iter_mut()) {
        distance = if pixel == 0 {
            (distance + 1).min(capped)
        } else {
            0
        };
        *nearest = distance;
    }
    distance = capped;
    for (&pixel, nearest) in row.iter().zip(nearest.iter_mut()).rev() {
        distance = if pixel == 0 {
            (distance + 1).min(capped)
        } else {
            0
        };
        *nearest = (*nearest).min(distance);
    }
}

#[cfg(test)]
mod tests {
    use super::expand;

    #[test]
    fn disk_is_euclidean_and_clipped_at_image_edges() {
        let mut mask = vec![0; 7 * 7];
        mask[0] = 1;
        let padded = expand(&mask, 7, 7, 2);
        assert_eq!(
            &padded[..21],
            &[1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]
        );
        assert!(padded[21..].iter().all(|&pixel| pixel == 0));
    }

    #[test]
    fn streaming_runs_match_direct_disk_at_small_and_thin_dimensions() {
        for pixel in [0, 1] {
            let mask = vec![pixel; 79];
            assert_eq!(expand(&mask, 1, 79, 32), mask);
        }
        for (width, height) in [(1, 1), (1, 79), (79, 1), (7, 69), (13, 9)] {
            let mask: Vec<_> = (0..width * height)
                .map(|i| u8::from((i * 7 + i / width * 13) % 23 < 3))
                .collect();
            for radius in [1, 2, 5, 16, 32] {
                let padded = expand(&mask, width, height, radius);
                let squared = usize::from(radius).pow(2);
                let direct: Vec<_> = (0..mask.len())
                    .map(|i| {
                        u8::from(mask.iter().enumerate().any(|(j, &pixel)| {
                            pixel != 0
                                && (i % width).abs_diff(j % width).pow(2)
                                    + (i / width).abs_diff(j / width).pow(2)
                                    <= squared
                        }))
                    })
                    .collect();
                assert_eq!(padded, direct, "{width}×{height} radius {radius}");
            }
        }
    }
}
