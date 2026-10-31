use super::*;

fn model() -> SceneProject {
    let mut rig = MinimalProject::new("Own Match discriminator".into(), [73; 16]);
    let root = &mut rig.bones[0];
    root.x = 11.0;
    root.y = -9.0;
    root.rotation = 23.0;
    root.scale_x = 1.3;
    root.scale_y = 0.8;
    root.shear_x = 7.0;
    root.shear_y = -12.0;
    for (name, x, y, rotation, scale_x, scale_y, shear_y, length) in [
        ("source", 13., -7., 31., 1.2, 0.8, 17., 35.),
        ("firstTarget", 70., 35., -25., 0.9, 1.3, -11., 45.),
        ("secondTarget", -40., 15., 80., 1.5, 0.6, 9., 30.),
    ] {
        let mut bone = super::super::Bone::root();
        bone.name = name.into();
        bone.parent = Some(0);
        bone.x = x;
        bone.y = y;
        bone.rotation = rotation;
        bone.scale_x = scale_x;
        bone.scale_y = scale_y;
        bone.shear_y = shear_y;
        bone.length = length;
        rig.bones.push(bone);
    }
    let mut constraint = TransformConstraint::new("match-probe".into(), vec![2, 3], 1);
    constraint.local_source = true;
    constraint.local_target = true;
    constraint.mix = [0.; 6];
    constraint.offsets = [7., 11., -13., 0.2, -0.1, 19.];
    constraint.properties = [
        TransformProperty::Rotate,
        TransformProperty::ScaleX,
        TransformProperty::ScaleY,
        TransformProperty::ShearY,
        TransformProperty::X,
        TransformProperty::Y,
    ]
    .map(TransformFrom::identity)
    .into();
    SceneProject {
        rig,
        images_root: "./images/".into(),
        audio_root: "./audio".into(),
        events: Vec::new(),
        editor_flag_53: false,
        slots: vec![],
        attachment_order: vec![],
        animations: vec![Animation::new("animation".into())],
        fps: 30.0,
        constraints: vec![Constraint::Transform(constraint)],
    }
}
fn constraint(p: &SceneProject) -> &TransformConstraint {
    let Constraint::Transform(c) = &p.constraints[0] else {
        panic!("transform fixture")
    };
    c
}
fn constraint_mut(p: &mut SceneProject) -> &mut TransformConstraint {
    let Constraint::Transform(c) = &mut p.constraints[0] else {
        panic!("transform fixture")
    };
    c
}
fn set_bits(p: &mut SceneProject, cells: [Option<u32>; 24]) {
    constraint_mut(p).editor_ranges = std::array::from_fn(|i| {
        TransformEditorRange::from_bits(std::array::from_fn(|j| cells[i * 4 + j])).unwrap()
    });
}
fn cache_wire(cells: [Option<u32>; 24]) -> Vec<u8> {
    // Independent known tag31 wire contract: generic-new1, count24+1,
    // each cell absent0 or present1 followed by exactly four big-endian bytes.
    let mut bytes = vec![31, 1, 25];
    for cell in cells {
        match cell {
            None => bytes.push(0),
            Some(bits) => {
                bytes.push(1);
                bytes.extend(bits.to_be_bytes());
            }
        }
    }
    bytes
}
fn cache_offset(payload: &[u8], cells: [Option<u32>; 24]) -> usize {
    let needle = cache_wire(cells);
    let offsets = payload
        .windows(needle.len())
        .enumerate()
        .filter_map(|(i, b)| (b == needle).then_some(i))
        .collect::<Vec<_>>();
    assert_eq!(offsets.len(), 1);
    offsets[0]
}

#[test]
fn nullable_range_default_retains_the_pre_extension_whole_payload_golden() {
    // Golden is our independently generated pre-extension local Match recipe,
    // not a copied original binary. Its original identity is the fixed own [73;16].
    let p = model();
    let payload = encode_scene_payload(&p).unwrap();
    assert_eq!(payload.len(), 1214);
    assert_eq!(crate::crc64_ecma(&payload), 0x8ef6_0f0a_ae3a_316a);
    cache_offset(&payload, [None; 24]);
    assert_eq!(decode_scene(&payload).unwrap(), p);
}

#[test]
fn finite_cells_preserve_signed_zero_subnormals_and_extremes_and_reject_nonfinite() {
    let bits = [0, 0x8000_0000, 1, 0x8000_0001, 0x7f7f_ffff, 0xff7f_ffff];
    for value in bits {
        let cell = FiniteF32::from_bits(value).unwrap();
        assert_eq!(cell.to_bits(), value);
        assert_eq!(cell.get().to_bits(), value);
        assert_eq!(FiniteF32::new(cell.get()).unwrap(), cell);
    }
    assert_ne!(FiniteF32::new(0.).unwrap(), FiniteF32::new(-0.).unwrap());
    for value in [0x7f80_0000, 0xff80_0000, 0x7fc0_0000, 0x7f80_0001] {
        assert!(FiniteF32::from_bits(value).is_err());
        assert!(TransformEditorRange::from_bits([None, Some(value), None, None]).is_err());
    }
    let mut p = model();
    let cells = std::array::from_fn(|i| Some(bits[i % bits.len()]));
    set_bits(&mut p, cells);
    let bytes = encode_scene_payload(&p).unwrap();
    let decoded = decode_scene(&bytes).unwrap();
    assert_eq!(constraint(&decoded).editor_range_bits(), cells);
    assert_eq!(decoded, p);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
}

#[test]
fn observed_full_ranges_and_independent_runtime_maps_survive_roundtrip() {
    let mut p = model();
    // Owned exact4.3.26 Properties Match observation; runtime consistency is
    // deliberately not synthesized by the codec from these editor values.
    let values = [
        31., 32., -25., -24., 2., 3., 70., 71., 6., 7., 35., 36., 1.2, 2.2, 0.9, 1.9, 0.8, 1.8,
        1.3, 2.3, -73., -72., -101., -100.,
    ];
    let cells = values.map(|v: f32| Some(v.to_bits()));
    set_bits(&mut p, cells);
    let maps = constraint(&p).properties.clone();
    let payload = encode_scene_payload(&p).unwrap();
    cache_offset(&payload, cells);
    let decoded = decode_scene(&payload).unwrap();
    assert_eq!(constraint(&decoded).editor_range_bits(), cells);
    assert_eq!(constraint(&decoded).properties, maps);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), payload);
    assert!(regions::decode_regions(&payload).is_err());
}

#[test]
fn sparse_reversed_equal_and_unpaired_cells_are_not_normalized_or_materialized() {
    let mut p = model();
    let mut cells = [None; 24];
    for (i, value) in [
        (2usize, -25.0f32),
        (3, 78.),
        (4, 15.70436),
        (5, 60.487),
        (16, 0.7518),
        (17, -2.3149),
    ] {
        cells[i] = Some(value.to_bits());
    }
    cells[8] = Some((-0.0f32).to_bits()); // absent partner is intentional
    cells[12] = Some(1.0f32.to_bits());
    cells[13] = cells[12]; // zero span is editor metadata, not an invalid map
    set_bits(&mut p, cells);
    let encoded = encode_scene_payload(&p).unwrap();
    let decoded = decode_scene(&encoded).unwrap();
    assert_eq!(constraint(&decoded).editor_range_bits(), cells);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), encoded);
    let mut positive_zero = p.clone();
    cells[8] = Some(0);
    set_bits(&mut positive_zero, cells);
    assert_ne!(positive_zero, p);
    assert_ne!(encode_scene_payload(&positive_zero).unwrap(), encoded);
}

#[test]
fn range_parser_rejects_bad_count_presence_references_nonfinite_and_truncation() {
    let mut p = model();
    let cells = [Some(1.25f32.to_bits()); 24];
    set_bits(&mut p, cells);
    let bytes = encode_scene_payload(&p).unwrap();
    let at = cache_offset(&bytes, cells);
    for count in [0, 1, 24, 26, 129] {
        let mut bad = bytes.clone();
        bad[at + 2] = count;
        assert!(decode_scene(&bad).is_err());
    }
    for marker in [2, 128, 255] {
        let mut bad = bytes.clone();
        bad[at + 3] = marker;
        assert!(decode_scene(&bad).is_err());
    }
    for reference in [0, 2, 255] {
        let mut bad = bytes.clone();
        bad[at + 1] = reference;
        assert!(decode_scene(&bad).is_err());
    }
    for bits in [0x7f80_0000u32, 0xff80_0000, 0x7fc0_0000] {
        let mut bad = bytes.clone();
        bad[at + 4..at + 8].copy_from_slice(&bits.to_be_bytes());
        assert!(decode_scene(&bad).is_err());
    }
    for end in at + 1..at + cache_wire(cells).len() {
        assert!(decode_scene(&bytes[..end]).is_err());
    }
}

#[test]
fn two_different_caches_keep_generic_arena_accounting_and_complete_payload_guard() {
    let mut p = model();
    set_bits(&mut p, [Some((-0.0f32).to_bits()); 24]);
    let mut second = TransformConstraint::new("second cache".into(), vec![1], 0);
    second.editor_ranges[5] =
        TransformEditorRange::from_bits([None, Some(1), None, Some(0)]).unwrap();
    p.constraints.push(Constraint::Transform(second));
    let bytes = encode_scene_payload(&p).unwrap();
    assert_eq!(decode_scene(&bytes).unwrap(), p);
    for end in [bytes.len() - 1, bytes.len() - 3] {
        assert!(decode_scene(&bytes[..end]).is_err());
    }
    // An unknown canonical reserved setting remains unsupported even when its
    // surrounding range data is representable; no partial field acceptance.
    let mut record = write::project_record(&p);
    record.fields.push((127, super::super::Field::Bool(true)));
    let richer = super::super::encode_record_payload(&record, p.rig.identity);
    assert!(decode_scene(&richer).is_err());
}
