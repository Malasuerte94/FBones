use super::*;
use fbones_format::minimal::scene::{TransformFrom, TransformTo};

fn finite(v: f32) -> Option<FiniteF32> {
    Some(FiniteF32::new(v).unwrap())
}
fn to(property: P, start: f32, end: f32, scale: f32) -> TransformTo {
    TransformTo {
        property,
        offset: start,
        max: end,
        scale,
    }
}
fn baseline() -> TransformConstraint {
    let mut c = TransformConstraint::new("Own range graph".into(), vec![3, 2], 1);
    c.local_source = true;
    c.additive = true;
    c.clamp = true;
    c.offsets = [-0., 11., -13., 0.2, -0.1, 19.];
    c.mix = [0.25, 0.5, 0.75, -0., 0.125, 1.];
    c.properties = vec![
        TransformFrom {
            property: P::X,
            offset: 2.,
            to: vec![to(P::Rotate, 20., 28., 2.), to(P::Y, 35., 47., 3.)],
        },
        TransformFrom {
            property: P::ScaleY,
            offset: 0.5,
            to: vec![to(P::ScaleX, 1., 3., 2.), to(P::Rotate, 20., 28., 8.)],
        },
    ];
    c
}
fn runtime_bits(c: &TransformConstraint) -> Vec<u32> {
    c.properties
        .iter()
        .flat_map(|from| {
            std::iter::once(from.offset.to_bits()).chain(
                from.to
                    .iter()
                    .flat_map(|to| [to.offset.to_bits(), to.max.to_bits(), to.scale.to_bits()]),
            )
        })
        .collect()
}
fn unchanged_settings(old: &TransformConstraint, next: &TransformConstraint) {
    let mut restored = next.clone();
    restored.properties = old.properties.clone();
    restored.editor_ranges = old.editor_ranges;
    assert_eq!(&restored, old);
    assert_eq!(
        restored.offsets.map(f32::to_bits),
        old.offsets.map(f32::to_bits)
    );
    assert_eq!(restored.mix.map(f32::to_bits), old.mix.map(f32::to_bits));
    assert_eq!(
        old.properties
            .iter()
            .map(|r| (
                r.property,
                r.to.iter().map(|t| t.property).collect::<Vec<_>>()
            ))
            .collect::<Vec<_>>(),
        next.properties
            .iter()
            .map(|r| (
                r.property,
                r.to.iter().map(|t| t.property).collect::<Vec<_>>()
            ))
            .collect::<Vec<_>>()
    );
}

#[test]
fn all_24_mapped_positions_hold_peers_and_rebuild_only_required_rows() {
    let mut old = baseline();
    old.properties = P::ALL.into_iter().map(TransformFrom::identity).collect();
    let before = resolved_endpoints(&old).unwrap();
    for index in 0..24 {
        let requested = if index % 2 == 0 { -2.5_f32 } else { 3.25 };
        let next = edited(&old, index, Some(requested.to_bits())).unwrap();
        let bits = next.editor_range_bits();
        for i in 0..24 {
            assert_eq!(
                bits[i],
                Some(if i == index {
                    requested.to_bits()
                } else {
                    (before[i] as f32).to_bits()
                })
            );
        }
        for (i, (a, b)) in old.properties.iter().zip(&next.properties).enumerate() {
            if i != index / 4 {
                assert_eq!(a, b);
            }
        }
        let row = &next.properties[index / 4];
        let values = resolved_endpoints(&next).unwrap();
        let i = index / 4 * 4;
        assert_eq!(row.offset.to_bits(), (values[i] as f32).to_bits());
        assert_eq!(
            row.to[0].scale.to_bits(),
            (((values[i + 3] as f32) - (values[i + 2] as f32))
                / ((values[i + 1] as f32) - (values[i] as f32)))
                .to_bits()
        );
        unchanged_settings(&old, &next);
    }
    assert_eq!(old.editor_range_bits(), [None; 24]);
}

#[test]
fn observed_v4_saved_zero_diagnostic_materializes_exact_ten_cells_without_typing_claim() {
    // Own numeric projection of saved7bbd49b7…ee50be after a→Escape→0,
    // not a successful finite-entry, clear or universal Escape observation.
    let old = baseline();
    let next = edited(&old, 5, Some(0_f32.to_bits())).unwrap();
    let expected = [
        (2, 20_f32),
        (3, 28.),
        (4, 2.),
        (5, 0.),
        (10, 35.),
        (11, 47.),
        (14, 1.),
        (15, 3.),
        (16, 0.5),
        (17, 1.5),
    ];
    let mut bits = [None; 24];
    for (index, value) in expected {
        bits[index] = Some(value.to_bits());
    }
    assert_eq!(next.editor_range_bits(), bits);
    assert_eq!(next.properties[0].offset.to_bits(), 2_f32.to_bits());
    assert_eq!(next.properties[0].to[0].scale.to_bits(), (-4_f32).to_bits());
    assert_eq!(next.properties[0].to[1].scale.to_bits(), (-6_f32).to_bits());
    assert_eq!(next.properties[1], old.properties[1]);
    unchanged_settings(&old, &next);
    assert_eq!(old.editor_range_bits(), [None; 24]);
}

#[test]
fn one_resolver_uses_explicit_bits_first_stored_routes_and_zero_scale_fallback() {
    let mut c = baseline();
    assert_eq!(resolved_endpoints(&c).unwrap()[4..6], [2., 6.]);
    c.properties[0].to[1].scale = 6.;
    c.properties[0].to.swap(0, 1);
    assert_eq!(resolved_endpoints(&c).unwrap()[4..6], [2., 4.]);
    c.properties[0].to.swap(0, 1);
    c.properties[1].to[1] = to(P::Rotate, 100., 160., 8.);
    let values = resolved_endpoints(&c).unwrap();
    assert_eq!(values[2..4], [20., 28.]);
    c.editor_ranges[0].destination_start = finite(100.);
    c.editor_ranges[1].source_start = finite(-0.);
    let values = resolved_endpoints(&c).unwrap();
    assert_eq!(values[4].to_bits(), (-0_f64).to_bits());
    assert_eq!(values[5], -36.);
    c.editor_ranges[1].source_end = finite(7.);
    assert_eq!(resolved_endpoints(&c).unwrap()[5], 7.);
    c.editor_ranges[1].source_end = None;
    c.properties[0].to[0].scale = 0.;
    assert_eq!(resolved_endpoints(&c).unwrap()[5], 1.);
    assert_eq!(resolved_endpoints(&c).unwrap()[20..24], [0., 1., 0., 1.]);
    assert_eq!(
        c.editor_range_bits().iter().filter(|v| v.is_some()).count(),
        2
    );
}

#[test]
fn fanin_destination_closure_and_source_fanout_preserve_disconnected_runtime_bits() {
    let mut old = baseline();
    old.properties[1].to[1] = to(P::Rotate, 30., 70., 8.);
    old.properties.push(TransformFrom {
        property: P::ShearY,
        offset: -0.,
        to: vec![to(P::ShearY, -0., 1., 1.)],
    });
    let next = edited(&old, 2, Some(12_f32.to_bits())).unwrap();
    assert_eq!(next.properties[0].to[0], to(P::Rotate, 12., 28., 4.));
    assert_eq!(next.properties[0].to[1], old.properties[0].to[1]);
    assert_eq!(next.properties[1].to[0], old.properties[1].to[0]);
    assert_eq!(next.properties[1].to[1], to(P::Rotate, 12., 28., 16.));
    assert_eq!(
        runtime_bits(&TransformConstraint {
            properties: vec![next.properties[2].clone()],
            ..old.clone()
        }),
        runtime_bits(&TransformConstraint {
            properties: vec![old.properties[2].clone()],
            ..old.clone()
        })
    );
    let source_only = edited(&old, 5, Some(0_f32.to_bits())).unwrap();
    assert_eq!(
        source_only.properties[1], old.properties[1],
        "Source edit must not normalize another incoming row"
    );
    assert_eq!(
        source_only.editor_ranges[0]
            .destination_start
            .unwrap()
            .get(),
        20.
    );
    unchanged_settings(&old, &next);
}

#[test]
fn explicit_clear_uses_runtime_fallback_keeps_requested_none_and_old_peers_fixed() {
    let mut old = baseline();
    old.editor_ranges[1].source_start = finite(99.);
    old.editor_ranges[1].source_end = finite(20.);
    old.editor_ranges[5].source_start = finite(-0.);
    let next = edited(&old, 4, None).unwrap();
    assert_eq!(next.editor_range_bits()[4], None);
    assert_eq!(next.editor_ranges[1].source_end.unwrap().get(), 20.);
    assert_eq!(next.properties[0].offset, 2.);
    assert_eq!(next.properties[0].to[0].scale, 8_f32 / 18.);
    assert_eq!(next.properties[0].to[1].scale, 12_f32 / 18.);
    assert_eq!(next.editor_range_bits()[20], Some((-0_f32).to_bits()));
    assert_eq!(next.properties[1], old.properties[1]);
    let mut dest = baseline();
    dest.editor_ranges[0].destination_start = finite(99.);
    let cleared = edited(&dest, 2, None).unwrap();
    assert_eq!(cleared.editor_range_bits()[2], None);
    assert_eq!(cleared.properties[0].to[0].offset, 20.);
    assert_eq!(cleared.properties[1].to[1].offset, 20.);
    let mut end = baseline();
    end.editor_ranges[1].source_end = finite(6.);
    let cleared = edited(&end, 5, None).unwrap();
    assert_eq!(cleared.editor_range_bits()[5], None);
    assert_eq!(resolved_endpoints(&cleared).unwrap()[5], 6.);
    unchanged_settings(&old, &next);
}

#[test]
fn all_dormant_cells_support_every_finite_bit_and_clear_without_links_or_materialization() {
    let mut old = baseline();
    old.properties.clear();
    for index in 0..24 {
        for bits in [(-0_f32).to_bits(), 0, 1, 0x8000_0001, f32::MAX.to_bits()] {
            let next = edited(&old, index, Some(bits)).unwrap();
            let mut expected = [None; 24];
            expected[index] = Some(bits);
            assert_eq!(next.editor_range_bits(), expected);
            assert!(next.properties.is_empty());
            let cleared = edited(&next, index, None).unwrap();
            assert_eq!(cleared.editor_range_bits(), [None; 24]);
            unchanged_settings(&old, &next);
        }
    }
}

#[test]
fn exact_intent_noop_does_not_materialize_or_revalidate_loaded_zero_spans() {
    let old = baseline();
    assert_eq!(
        edited(&old, 5, None).unwrap().editor_range_bits(),
        [None; 24]
    );
    let mut zero = baseline();
    zero.editor_ranges[1].source_start = finite(-0.);
    zero.editor_ranges[1].source_end = finite(-0.);
    let next = edited(&zero, 4, Some((-0_f32).to_bits())).unwrap();
    assert_eq!(next.editor_range_bits(), zero.editor_range_bits());
    assert_eq!(runtime_bits(&next), runtime_bits(&zero));
    assert!(
        edited(&zero, 4, Some(0_f32.to_bits())).is_err(),
        "+0 is a different intent and requires a valid affected division"
    );
}

#[test]
fn invalid_zero_overflow_and_underflow_fail_atomically_but_equal_target_is_valid() {
    let old = baseline();
    for (index, bits) in [
        (24, Some(0)),
        (0, Some(0x7f80_0000)),
        (0, Some(0x7fc0_0000)),
        (5, Some(2_f32.to_bits())),
    ] {
        let error = edited(&old, index, bits).unwrap_err();
        assert_eq!(error.code, "InvalidTransformRange");
        assert_eq!(old.editor_range_bits(), [None; 24]);
    }
    let equal = edited(&old, 3, Some(20_f32.to_bits())).unwrap();
    assert_eq!(equal.properties[0].to[0].scale, 0.);
    assert_eq!(equal.properties[1].to[1].scale, 0.);
    let mut source = baseline();
    source.editor_ranges[1].source_start = finite(-f32::MAX);
    assert!(edited(&source, 5, Some(f32::MAX.to_bits())).is_err());
    let mut target = baseline();
    target.editor_ranges[0].destination_start = finite(-f32::MAX);
    assert!(edited(&target, 3, Some(f32::MAX.to_bits())).is_err());
    let mut underflow = baseline();
    underflow.editor_ranges[0].destination_start = finite(0.);
    assert!(
        edited(&underflow, 3, Some(1)).is_err(),
        "nonzero target span /4 must not silently collapse to0"
    );
    assert_eq!(
        edited(&underflow, 3, Some(0)).unwrap().properties[0].to[0].scale,
        0.
    );
    let mut peer_overflow = baseline();
    peer_overflow.properties[1].to[0].scale = f32::from_bits(1);
    assert!(resolved_endpoints(&peer_overflow).unwrap()[17].is_finite());
    assert!(
        edited(&peer_overflow, 5, Some(0)).is_err(),
        "all mapped peers must materialize at finite f32 precision"
    );
    let mut bad = baseline();
    bad.properties.push(bad.properties[0].clone());
    assert!(resolved_endpoints(&bad).is_err());
    bad = baseline();
    bad.properties[0].to[0].scale = f32::NAN;
    assert!(resolved_endpoints(&bad).is_err());
}
