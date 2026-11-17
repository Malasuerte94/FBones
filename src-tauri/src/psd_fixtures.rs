//! Owned small PSD fixture encoder for tests only; no Photoshop/original bytes.
use super::*;
#[derive(Clone)]
pub(crate) struct LayerSpec {
    pub name: String,
    pub left: i32,
    pub top: i32,
    pub width: u32,
    pub height: u32,
    pub visible: bool,
    pub opacity: u8,
    pub color: [u8; 4],
}
fn sample_layers() -> Vec<LayerSpec> {
    vec![
        LayerSpec {
            name: "Back".into(),
            left: 0,
            top: 0,
            width: 100,
            height: 80,
            visible: true,
            opacity: 255,
            color: [255, 0, 0, 255],
        },
        LayerSpec {
            name: "Front".into(),
            left: 20,
            top: 10,
            width: 20,
            height: 20,
            visible: true,
            opacity: 128,
            color: [0, 0, 255, 255],
        },
        LayerSpec {
            name: "Hidden".into(),
            left: -3,
            top: 7,
            width: 4,
            height: 6,
            visible: false,
            opacity: 255,
            color: [0, 255, 0, 255],
        },
    ]
}
pub(crate) fn fixture() -> Vec<u8> {
    build(100, 80, &sample_layers(), false, None)
}
pub(crate) fn rle_fixture() -> Vec<u8> {
    build(100, 80, &sample_layers(), true, None)
}
fn push32(out: &mut Vec<u8>, n: u32) {
    out.extend(n.to_be_bytes());
}
fn section(data: &[u8]) -> Vec<u8> {
    let mut out = Vec::new();
    push32(&mut out, data.len() as u32);
    out.extend(data);
    out
}
fn tagged(out: &mut Vec<u8>, key: &[u8; 4], data: &[u8]) {
    out.extend(b"8BIM");
    out.extend(key);
    push32(out, data.len() as u32);
    out.extend(data);
    if !data.len().is_multiple_of(2) {
        out.push(0);
    }
}
pub(crate) fn build(
    width: u32,
    height: u32,
    layers: &[LayerSpec],
    rle: bool,
    first_tag: Option<([u8; 4], &[u8])>,
) -> Vec<u8> {
    let mut records = Vec::new();
    let mut channels = Vec::new();
    for (index, layer) in layers.iter().enumerate() {
        let planes: Vec<Vec<u8>> = (0..4)
            .map(|c| {
                let mut out = Vec::new();
                out.extend(u16::from(rle).to_be_bytes());
                if rle {
                    let mut row = Vec::new();
                    let mut remaining = layer.width as usize;
                    while remaining != 0 {
                        let n = remaining.min(128);
                        row.push((1i16 - n as i16) as i8 as u8);
                        row.push(layer.color[c]);
                        remaining -= n;
                    }
                    for _ in 0..layer.height {
                        out.extend((row.len() as u16).to_be_bytes());
                    }
                    for _ in 0..layer.height {
                        out.extend(&row);
                    }
                } else {
                    out.resize(
                        2 + layer.width as usize * layer.height as usize,
                        layer.color[c],
                    );
                }
                out
            })
            .collect();
        for n in [
            layer.top,
            layer.left,
            layer.top + layer.height as i32,
            layer.left + layer.width as i32,
        ] {
            records.extend(n.to_be_bytes());
        }
        records.extend(4u16.to_be_bytes());
        for (c, plane) in planes.iter().enumerate() {
            let id = if c == 3 { -1i16 } else { c as i16 };
            records.extend(id.to_be_bytes());
            push32(&mut records, plane.len() as u32);
        }
        records.extend(b"8BIMnorm");
        records.extend([layer.opacity, 0, if layer.visible { 0 } else { 2 }, 0]);
        let mut extra = vec![0u8; 8]; // no layer mask or custom blending ranges
        let name = b"Layer";
        extra.push(name.len() as u8);
        extra.extend(name);
        while !(extra.len() - 8).is_multiple_of(4) {
            extra.push(0);
        }
        let units: Vec<u16> = layer.name.encode_utf16().collect();
        let mut unicode = Vec::new();
        push32(&mut unicode, units.len() as u32);
        for unit in units {
            unicode.extend(unit.to_be_bytes());
        }
        tagged(&mut extra, b"luni", &unicode);
        if index == 0 {
            if let Some((tag, data)) = first_tag {
                tagged(&mut extra, &tag, data);
            }
        }
        records.extend(section(&extra));
        for plane in planes {
            channels.extend(plane);
        }
    }
    let mut info = Vec::new();
    info.extend((layers.len() as i16).to_be_bytes());
    info.extend(records);
    info.extend(channels);
    if info.len() % 2 != 0 {
        info.push(0);
    }
    let mut layer_mask = section(&info);
    layer_mask.extend(0u32.to_be_bytes());
    let mut output = b"8BPS".to_vec();
    output.extend(1u16.to_be_bytes());
    output.extend([0u8; 6]);
    output.extend(4u16.to_be_bytes());
    push32(&mut output, height);
    push32(&mut output, width);
    output.extend(8u16.to_be_bytes());
    output.extend(3u16.to_be_bytes());
    output.extend([0u8; 8]);
    output.extend(section(&layer_mask));
    output
}
fn pixels(layer: &PsdLayer) -> Vec<u8> {
    let mut reader = png::Decoder::new(std::io::Cursor::new(layer.image.bytes()))
        .read_info()
        .unwrap();
    let mut out = vec![0; reader.output_buffer_size().unwrap()];
    let info = reader.next_frame(&mut out).unwrap();
    out.truncate(info.buffer_size());
    out
}
#[test]
fn raw_rle_order_bounds_visibility_and_unbaked_opacity() {
    let raw = parse(&fixture()).unwrap();
    let rle = parse(&rle_fixture()).unwrap();
    assert_eq!((raw.width, raw.height), (100, 80));
    assert_eq!(
        raw.layers
            .iter()
            .map(|l| l.name.as_str())
            .collect::<Vec<_>>(),
        ["Back", "Front", "Hidden"]
    );
    for (a, b) in raw.layers.iter().zip(&rle.layers) {
        assert_eq!(pixels(a), pixels(b));
    }
    assert_eq!(
        (
            raw.layers[1].left,
            raw.layers[1].top,
            raw.layers[1].width,
            raw.layers[1].height
        ),
        (20, 10, 20, 20)
    );
    assert_eq!(raw.layers[1].opacity, 128);
    assert_eq!(&pixels(&raw.layers[1])[..4], &[0, 0, 255, 255]);
    assert!(!raw.layers[2].visible);
    assert_eq!((raw.layers[2].left, raw.layers[2].top), (-3, 7));
    // At the overlap, Back is behind Front; hidden inventory is not discarded.
    assert_eq!(&pixels(&raw.layers[0])[..4], &[255, 0, 0, 255]);
    assert_eq!(raw.layers.len(), 3);
}
#[test]
fn unicode_duplicate_names_and_straight_alpha() {
    let mut layers = sample_layers();
    layers[0].name = "Braț 🦴".into();
    layers[1].name = layers[0].name.clone();
    layers[1].color = [15, 25, 35, 77];
    let doc = parse(&build(100, 80, &layers, false, None)).unwrap();
    assert_eq!(doc.layers[0].name, "Braț 🦴");
    assert_eq!(doc.layers[1].name, doc.layers[0].name);
    assert_eq!(&pixels(&doc.layers[1])[..4], &[15, 25, 35, 77]);
}
#[test]
fn every_truncated_prefix_rejects_without_panicking() {
    // The merged preview is optional, so the complete layer/mask prefix is valid.
    let bytes = build(
        2,
        2,
        &[LayerSpec {
            name: "x".into(),
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            visible: true,
            opacity: 255,
            color: [1, 2, 3, 4],
        }],
        false,
        None,
    );
    for n in 0..bytes.len() {
        assert!(parse(&bytes[..n]).is_err(), "accepted prefix {n}");
    }
}
#[test]
fn unsupported_appearance_tags_and_profiles_reject() {
    for tag in [
        *b"lsct", *b"lsdk", *b"TySh", *b"vmsk", *b"lfx2", *b"SoLd", *b"brit", *b"zzzz",
    ] {
        assert!(parse(&build(
            100,
            80,
            &sample_layers(),
            false,
            Some((tag, &[0; 4]))
        ))
        .is_err());
    }
    assert!(parse(&build(
        100,
        80,
        &sample_layers(),
        false,
        Some((*b"iOpa", &[128, 0, 0, 0]))
    ))
    .is_err());
    for (offset, value) in [(5, 2), (23, 16), (25, 4)] {
        let mut b = fixture();
        b[offset] = value;
        assert!(parse(&b).is_err());
    }
}
#[test]
fn inert_metadata_is_shape_checked() {
    assert!(parse(&build(
        100,
        80,
        &sample_layers(),
        false,
        Some((*b"lyid", &[0, 0, 0, 9]))
    ))
    .is_ok());
    assert!(parse(&build(
        100,
        80,
        &sample_layers(),
        false,
        Some((*b"lyid", &[0, 0, 9]))
    ))
    .is_err());
    assert!(parse(&build(
        100,
        80,
        &sample_layers(),
        false,
        Some((*b"knko", &[0, 0, 0, 0]))
    ))
    .is_ok());
    assert!(parse(&build(
        100,
        80,
        &sample_layers(),
        false,
        Some((*b"knko", &[1, 0, 0, 0]))
    ))
    .is_err());
}
#[test]
fn packbits_exact_rows_noop_and_malformed_input() {
    let mut out = Vec::new();
    unpack(&[128, 1, 4, 5, 255, 6, 128], 4, |_, v| out.push(v)).unwrap();
    assert_eq!(out, [4, 5, 6, 6]);
    for row in [&[0][..], &[0, 1][..], &[254, 8][..], &[2, 1, 2, 3][..]] {
        assert!(unpack(row, 2, |_, _| {}).is_err());
    }
}
#[test]
fn dimensions_counts_and_aggregate_are_checked_before_channel_reads() {
    let mut b = fixture();
    b[18..22].copy_from_slice(&4097u32.to_be_bytes());
    assert!(parse(&b).is_err());
    let mut b = fixture();
    b[42..44].copy_from_slice(&129i16.to_be_bytes());
    assert!(parse(&b).is_err());
    let mut b = fixture();
    b[44..48].copy_from_slice(&i32::MIN.to_be_bytes());
    assert!(parse(&b).is_err());
    assert!(parse(&build(100, 80, &[], false, None)).is_err());
}
#[test]
fn embedded_icc_is_explicitly_unsupported_and_resources_are_bounded() {
    let mut bytes = fixture();
    let mut resource = b"8BIM".to_vec();
    resource.extend(1039u16.to_be_bytes());
    resource.extend([0, 0]);
    resource.extend(1u32.to_be_bytes());
    resource.extend([42, 0]);
    bytes[30..34].copy_from_slice(&(resource.len() as u32).to_be_bytes());
    bytes.splice(34..34, resource);
    assert!(parse(&bytes).unwrap_err().message.contains("ICC"));
    bytes[30..34].copy_from_slice(&u32::MAX.to_be_bytes());
    assert!(parse(&bytes).is_err());
}
#[test]
fn document_channel_display_metadata_never_silently_drops_an_overlay() {
    for id in [1007u16, 1077] {
        let mut bytes = fixture();
        let mut resource = b"8BIM".to_vec();
        resource.extend(id.to_be_bytes());
        resource.extend([0, 0]);
        resource.extend(4u32.to_be_bytes());
        resource.extend([0; 4]);
        bytes[30..34].copy_from_slice(&(resource.len() as u32).to_be_bytes());
        bytes.splice(34..34, resource);
        let error = parse(&bytes).unwrap_err();
        assert_eq!(error.code, "UnsupportedPsd");
        assert!(error.message.contains("Extra-channel display"));
        // An empty descriptor declares no overlay. Do not guess any kind byte.
        bytes[30..34].copy_from_slice(&12u32.to_be_bytes());
        bytes[42..46].copy_from_slice(&0u32.to_be_bytes());
        bytes.drain(46..50);
        assert!(parse(&bytes).is_ok());
    }
}
#[test]
fn aggregate_pixels_reject_before_allocating_declared_planes() {
    let mut bytes = fixture();
    let offsets = {
        let mut records = Reader::new(&bytes[44..]);
        let mut offsets = Vec::new();
        for _ in 0..3 {
            offsets.push(44 + records.at);
            records.take(16).unwrap();
            let n = records.u16().unwrap();
            records.take(n as usize * 6 + 12).unwrap();
            records.section().unwrap();
        }
        offsets
    };
    for start in offsets {
        for (offset, value) in [(0, 0i32), (4, 0), (8, 4096), (12, 4096)] {
            bytes[start + offset..start + offset + 4].copy_from_slice(&value.to_be_bytes());
        }
    }
    assert!(parse(&bytes).unwrap_err().message.contains("aggregate"));
}
