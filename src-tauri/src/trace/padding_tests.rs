use super::{area, inside, trace_rgba, Point, TraceGeometry, TraceOptions};

fn image(width: usize, height: usize, color: impl Fn(usize, usize) -> [u8; 4]) -> Vec<u8> {
    let mut pixels = Vec::with_capacity(width * height * 4);
    for y in 0..height {
        for x in 0..width {
            pixels.extend_from_slice(&color(x, y));
        }
    }
    pixels
}

fn source_points(geometry: &TraceGeometry, size: [usize; 2]) -> Vec<Point> {
    geometry
        .uvs
        .chunks_exact(2)
        .map(|uv| {
            [
                f64::from(uv[0]) * size[0] as f64,
                f64::from(uv[1]) * size[1] as f64,
            ]
        })
        .collect()
}

fn bounds(points: &[Point]) -> [f64; 4] {
    let [mut min_x, mut min_y] = points[0];
    let (mut max_x, mut max_y) = (min_x, min_y);
    for &[x, y] in &points[1..] {
        min_x = min_x.min(x);
        min_y = min_y.min(y);
        max_x = max_x.max(x);
        max_y = max_y.max(y);
    }
    [min_x, min_y, max_x, max_y]
}

#[test]
fn zero_padding_retains_the_existing_geometry_and_positive_padding_adds_a_margin() {
    let pixels = image(32, 16, |x, y| {
        let alpha = if (5..21).contains(&x) && (4..12).contains(&y) {
            17
        } else {
            16
        };
        [108, 64, 180, alpha]
    });
    let options: TraceOptions = serde_json::from_value(serde_json::json!({
        "tolerance": 0, "spacing": 4096,
    }))
    .unwrap();
    assert_eq!(options.padding, 0);
    let zero = trace_rgba(32, 16, &pixels, options).unwrap();
    assert_eq!(zero.hull, 4);
    assert_eq!(zero.inner_count, 0);
    assert_eq!(
        source_points(&zero, [32, 16]),
        [[5., 4.], [21., 4.], [21., 12.], [5., 12.]]
    );
    assert_eq!(zero.edges, [0, 1, 1, 2, 2, 3, 3, 0]);
    assert_eq!(zero.triangles, [0, 1, 2, 2, 3, 0]);
    assert!(!zero.budget_adjusted);

    let padded = trace_rgba(
        32,
        16,
        &pixels,
        TraceOptions {
            padding: 3,
            ..options
        },
    )
    .unwrap();
    let original_hull = source_points(&zero, [32, 16]);
    let padded_hull = source_points(&padded, [32, 16]);
    assert_eq!(bounds(&padded_hull), [2., 1., 24., 15.]);
    assert!(area(&padded_hull) > area(&original_hull));
    let extra_margin = [3.5, 8.5];
    assert!(!inside(extra_margin, &original_hull, 0.));
    assert!(inside(extra_margin, &padded_hull, 0.));
}

#[test]
fn padding_clips_to_the_image_and_needs_an_above_threshold_seed() {
    let pixels = image(16, 16, |x, y| {
        [255, 0, 120, if x < 4 && y >= 12 { 255 } else { 0 }]
    });
    let options = TraceOptions {
        tolerance: 0.,
        spacing: 4096.,
        ..TraceOptions::default()
    };
    for (padding, expected) in [(3, [0., 9., 7., 16.]), (32, [0., 0., 16., 16.])] {
        let result = trace_rgba(16, 16, &pixels, TraceOptions { padding, ..options }).unwrap();
        assert_eq!(bounds(&source_points(&result, [16, 16])), expected);
        assert!(result.uvs.iter().all(|&uv| (0. ..=1.).contains(&uv)));
    }
    assert!(trace_rgba(
        16,
        16,
        &pixels,
        TraceOptions {
            padding: 33,
            ..options
        },
    )
    .is_err());
    let rejected = image(16, 16, |x, _| {
        [255, 0, 120, if x % 2 == 0 { 0 } else { 16 }]
    });
    assert!(trace_rgba(
        16,
        16,
        &rejected,
        TraceOptions {
            padding: 32,
            ..options
        },
    )
    .is_err());
}

fn overlaps_transparent_gap([a, b]: [Point; 2]) -> bool {
    let (mut entry, mut exit) = (0_f64, 1_f64);
    for (axis, [min, max]) in [[54., 74.], [56., 72.]].into_iter().enumerate() {
        let delta = b[axis] - a[axis];
        if delta == 0. {
            if !(min..max).contains(&a[axis]) {
                return false;
            }
            continue;
        }
        let first = (min - a[axis]) / delta;
        let last = (max - a[axis]) / delta;
        entry = entry.max(first.min(last));
        exit = exit.min(first.max(last));
    }
    exit - entry > 1e-9
}

#[test]
fn inner_detail_uses_original_visible_pixels_with_or_without_padding() {
    let visible = |x, y| {
        (16..112).contains(&x)
            && (16..112).contains(&y)
            && !((54..74).contains(&x) && (56..72).contains(&y))
    };
    let make_pixels = |hidden_rgb| {
        image(128, 128, |x, y| {
            if visible(x, y) {
                let value = if x < 64 { 30 } else { 230 };
                [value, value, value, 255]
            } else {
                let value = if (x < 64) == hidden_rgb { 255 } else { 0 };
                [value, 255 - value, value, 16]
            }
        })
    };
    let pixels = make_pixels(false);
    let changed_hidden_rgb = make_pixels(true);
    for padding in [0, 8] {
        let options = TraceOptions {
            padding,
            tolerance: 0.,
            spacing: 4096.,
            inner_spacing: 8.,
            max_vertices: 96,
            ..TraceOptions::default()
        };
        let outline = trace_rgba(128, 128, &pixels, options).unwrap();
        let inner_options = TraceOptions {
            inner: true,
            ..options
        };
        let detailed = trace_rgba(128, 128, &pixels, inner_options).unwrap();
        let hidden = trace_rgba(128, 128, &changed_hidden_rgb, inner_options).unwrap();
        assert_eq!(outline.filled_holes, usize::from(padding == 0));
        assert_eq!(outline.filled_holes, detailed.filled_holes);
        assert_eq!(detailed.hull, outline.hull);
        assert_eq!(&detailed.uvs[..2 * detailed.hull], outline.uvs.as_slice());
        assert_eq!(
            &detailed.edges[..2 * detailed.hull],
            outline.edges.as_slice()
        );
        assert_eq!(
            serde_json::to_value(&detailed).unwrap(),
            serde_json::to_value(&hidden).unwrap()
        );
        let padded_extent = f64::from(padding);
        assert_eq!(
            bounds(&source_points(&outline, [128, 128])),
            [
                16. - padded_extent,
                16. - padded_extent,
                112. + padded_extent,
                112. + padded_extent,
            ]
        );

        let points = source_points(&detailed, [128, 128]);
        assert!(points.len() <= options.max_vertices);
        assert!(points[detailed.hull..]
            .iter()
            .all(|&[x, y]| visible(x as usize, y as usize)));
        let mut found_seam = false;
        for edge in detailed.edges.chunks_exact(2).skip(detailed.hull) {
            let [a, b] = [points[edge[0] as usize], points[edge[1] as usize]];
            assert!([a, b]
                .into_iter()
                .all(|[x, y]| visible(x as usize, y as usize)));
            assert!(!overlaps_transparent_gap([a, b]));
            assert!(detailed.triangles.chunks_exact(3).any(|face| {
                face.contains(&(edge[0] as u16)) && face.contains(&(edge[1] as u16))
            }));
            found_seam |=
                (a[0] - 64.).abs() < 3. && (b[0] - 64.).abs() < 3. && (a[1] - b[1]).abs() > 4.;
        }
        assert!(
            found_seam,
            "Padding {padding} lost the visible contrast edge"
        );
    }

    let tight = TraceOptions {
        padding: 8,
        spacing: 2.,
        max_vertices: 16,
        ..TraceOptions::default()
    };
    let outline = trace_rgba(128, 128, &pixels, tight).unwrap();
    let detailed = trace_rgba(
        128,
        128,
        &pixels,
        TraceOptions {
            inner: true,
            ..tight
        },
    )
    .unwrap();
    assert!(outline.budget_adjusted);
    assert!(detailed.uvs.len() / 2 <= tight.max_vertices);
    assert_eq!(detailed.hull, outline.hull);
    assert_eq!(&detailed.uvs[..2 * detailed.hull], outline.uvs.as_slice());
    assert!(trace_rgba(
        128,
        128,
        &pixels,
        TraceOptions {
            max_vertices: 2,
            ..tight
        },
    )
    .is_err());
}
