//! Exact time-monotonicity guard for stored f32 bone Bezier controls.

/// A monotone cubic has a unique time inverse even with an isolated zero slope.
/// The exact dyadic fallback avoids losing subnormal endpoint differences in f64.
pub fn bezier_time_monotone(first: f32, last: f32, outgoing: f32, incoming: f32) -> bool {
    if ![first, last, outgoing, incoming]
        .iter()
        .all(|v| v.is_finite())
        || last <= first
        || outgoing < first
        || incoming > last
    {
        return false;
    }
    // Preserve the entire old supported interval profile and ordered controls.
    if outgoing <= incoming || (outgoing <= last && incoming >= first) {
        return true;
    }
    let a = distance(outgoing, first);
    let c = distance(last, incoming);
    let negative_b = distance(outgoing, incoming);
    product(negative_b, negative_b)
        .iter()
        .rev()
        .cmp(product(a, c).iter().rev())
        != std::cmp::Ordering::Greater
}

// All finite f32 values are signed integer multiples of 2^-149. Their magnitude
// occupies at most 277 bits; one subtraction/addition fits five u64 limbs.
fn magnitude(value: f32) -> [u64; 5] {
    let bits = value.to_bits() & 0x7fff_ffff;
    let exponent = bits >> 23;
    let mantissa = (bits & 0x7f_ffff) | if exponent == 0 { 0 } else { 1 << 23 };
    let shift = exponent.saturating_sub(1) as usize;
    let wide = u128::from(mantissa) << (shift % 64);
    let mut limbs = [0; 5];
    limbs[shift / 64] = wide as u64;
    limbs[shift / 64 + 1] = (wide >> 64) as u64;
    limbs
}
fn subtract(a: [u64; 5], b: [u64; 5]) -> [u64; 5] {
    let mut result = [0; 5];
    let mut borrow = false;
    for (i, (&a, &b)) in a.iter().zip(&b).enumerate() {
        let (value, first_borrow) = a.overflowing_sub(b);
        let (value, second_borrow) = value.overflowing_sub(u64::from(borrow));
        result[i] = value;
        borrow = first_borrow || second_borrow;
    }
    debug_assert!(!borrow);
    result
}
fn distance(greater: f32, less: f32) -> [u64; 5] {
    debug_assert!(greater >= less);
    if greater == less {
        return [0; 5];
    }
    let a = magnitude(greater);
    let b = magnitude(less);
    if greater.is_sign_negative() == less.is_sign_negative() {
        return if greater.is_sign_negative() {
            subtract(b, a)
        } else {
            subtract(a, b)
        };
    }
    let mut result = [0; 5];
    let mut carry = 0u128;
    for (i, (&a, &b)) in a.iter().zip(&b).enumerate() {
        let sum = u128::from(a) + u128::from(b) + carry;
        result[i] = sum as u64;
        carry = sum >> 64;
    }
    debug_assert_eq!(carry, 0);
    result
}
fn product(a: [u64; 5], b: [u64; 5]) -> [u64; 10] {
    let mut result = [0; 10];
    for (i, &a) in a.iter().enumerate() {
        let mut carry = 0u128;
        for (j, &b) in b.iter().enumerate() {
            let value = u128::from(a) * u128::from(b) + u128::from(result[i + j]) + carry;
            result[i + j] = value as u64;
            carry = value >> 64;
        }
        result[i + 5] = carry as u64;
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_monotonic_bone_time_preserves_old_bounds_and_known_crossed_controls() {
        assert!(bezier_time_monotone(
            348.,
            353.,
            f32::from_bits(0x43b0_bbcd),
            f32::from_bits(0x43af_8b12)
        ));
        assert!(bezier_time_monotone(0., 1., 1., 0.)); // isolated stationary point
        assert!(bezier_time_monotone(0., 1., 1.1, 0.5));
        let tiny = f32::from_bits(1);
        assert!(bezier_time_monotone(tiny, 1., 1., tiny));
        assert!(bezier_time_monotone(-0., 1., 0., -0.));
        assert!(bezier_time_monotone(0., tiny * 3., tiny * 4., tiny * 2.));
        let offset = 1e20f32;
        assert!(bezier_time_monotone(
            offset,
            f32::from_bits(offset.to_bits() + 8),
            f32::from_bits(offset.to_bits() + 8),
            offset
        ));
        assert!(bezier_time_monotone(-4., 4., 5., 0.));
        assert!(bezier_time_monotone(
            -f32::MAX,
            f32::MAX,
            f32::MAX,
            -f32::MAX
        ));
    }
    #[test]
    fn exact_guard_rejects_rounded_false_positive_and_nonmonotone_or_invalid_time() {
        let tiny = f32::from_bits(1);
        assert!(!bezier_time_monotone(tiny, 1., 1., 0.));
        assert!(!bezier_time_monotone(0., 1., 1., -tiny));
        assert!(!bezier_time_monotone(
            0.,
            1.,
            f32::from_bits(1f32.to_bits() + 1),
            0.
        ));
        assert!(!bezier_time_monotone(0., tiny * 3., tiny * 5., tiny));
        assert!(!bezier_time_monotone(59., 61., 64., 60.344444));
        for args in [
            (0., 1., -0.1, 0.5),
            (0., 1., 0.5, 1.1),
            (1., 1., 1., 1.),
            (2., 1., 2., 1.),
            (0., 1., f32::NAN, 0.),
            (0., f32::INFINITY, 0., 1.),
        ] {
            assert!(!bezier_time_monotone(args.0, args.1, args.2, args.3));
        }
    }
}

#[cfg(test)]
mod wire_tests {
    use super::*;
    use crate::minimal::{
        regions::{BlendMode, RegionProject},
        scene::*,
        MinimalProject,
    };
    #[test]
    fn monotone_outside_control_roundtrips_bone_bits_without_relaxing_slot_curves() {
        let mut p = SceneProject::from(&RegionProject {
            rig: MinimalProject::new("own crossed time".into(), [43; 16]),
            images_root: "./images/".into(),
            slots: vec![],
            region_order: vec![],
        });
        let outgoing = f32::from_bits(0x43b0_bbcd);
        let incoming = f32::from_bits(0x43af_8b12);
        p.animations[0].tracks = vec![BoneTimeline {
            bone: 0,
            channel: BoneChannel::Rotate,
            keys: vec![
                BoneKeyframe {
                    frame: 348.,
                    values: [-20., 0.],
                    curve: KeyCurve::Bezier {
                        controls: [[outgoing, -20., incoming, -60.], [0.; 4]],
                    },
                },
                BoneKeyframe {
                    frame: 353.,
                    values: [-60., 0.],
                    curve: KeyCurve::Linear,
                },
            ],
        }];
        let bytes = encode_scene_payload(&p).unwrap();
        let decoded = decode_scene(&bytes).unwrap();
        assert_eq!(p, decoded);
        assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
        assert!(bezier_time_monotone(348., 353., outgoing, incoming));
        p.slots.push(SceneSlot {
            name: "slot".into(),
            bone: 0,
            color: [255; 4],
            blend: BlendMode::Normal,
            attachments: vec![],
            active_attachment: None,
        });
        p.animations[0].slot_tracks.push(SlotTimeline::Rgba {
            slot: 0,
            keys: vec![
                SlotRgbaKey {
                    frame: 348.,
                    values: [0.25; 4],
                    dark_values: [0.; 3],
                    curve: SlotRgbaCurve::Bezier {
                        controls: [[outgoing, 0.25, incoming, 0.75]; 4],
                        dark_controls: None,
                    },
                },
                SlotRgbaKey {
                    frame: 353.,
                    values: [0.75; 4],
                    dark_values: [0.; 3],
                    curve: SlotRgbaCurve::Linear,
                },
            ],
        });
        assert!(
            encode_scene_payload(&p).is_err(),
            "Slot control interval guard must remain unchanged"
        );
    }
}
