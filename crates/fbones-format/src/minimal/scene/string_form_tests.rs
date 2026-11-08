use super::*;
use crate::minimal::Bone;

fn encoding(text: &str) -> Option<WireStringEncoding> {
    Some(WireStringEncoding {
        form: WireStringForm::Utf8Length,
        source_text: text.into(),
    })
}
fn model() -> SceneProject {
    let text = "A".repeat(64);
    let mut rig = MinimalProject::new("old canonical".repeat(6), [97; 16]);
    for name in [&text, &"B".repeat(64)] {
        rig.bones.push(Bone {
            name: name.clone(),
            parent: Some(0),
            ..Bone::root()
        });
    }
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images".into(),
        slots: vec![],
        region_order: vec![],
    });
    p.slots.push(SceneSlot {
        name: text.clone(),
        bone: 1,
        color: [255; 4],
        blend: BlendMode::Normal,
        active_attachment: Some(0),
        attachments: vec![SceneAttachment::Region(Region {
            // Same text, independent identity with canonical terminated ASCII.
            name: text.clone(),
            path: "own".into(),
            x: 0.,
            y: -0.,
            rotation: 0.,
            scale_x: 1.,
            scale_y: 1.,
            width: 8.,
            height: 8.,
        })],
    });
    p.attachment_order.push(AttachmentAddress {
        slot: 0,
        attachment: 0,
    });
    p
}
fn source() -> SceneProject {
    let mut p = model();
    p.wire = Some(SceneWire {
        source_state: None,
        slot_references_8: vec![],
        editor_metadata: None,
        constraint_declarations: None,
        editor_scalar_46: FiniteF32::new(100.).unwrap(),
        skeleton_bounds_24: [FiniteF32::new(0.).unwrap(); 4],
        zero_size_meshes: vec![],
        animation_layouts: vec![animation_layout(&p, 0).unwrap()],
        strings: vec![
            WireStringAlias {
                owner: WireStringOwner::Bone(1),
                tag: 1,
                group: 9,
                encoding: encoding(&p.rig.bones[1].name),
            },
            WireStringAlias {
                owner: WireStringOwner::Slot(0),
                tag: 1,
                group: 9,
                encoding: encoding(&p.slots[0].name),
            },
            WireStringAlias {
                owner: WireStringOwner::Bone(2),
                tag: 1,
                group: 5,
                encoding: encoding(&p.rig.bones[2].name),
            },
        ],
    });
    normalize_wire_strings(&mut p).unwrap();
    p
}
fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let payload = encode_scene_payload(p).unwrap();
    let q = decode_scene(&payload).unwrap();
    assert_eq!(&q, p);
    assert_eq!(encode_scene_payload(&q).unwrap(), payload);
    assert_eq!(encode_scene(&q).unwrap(), encode_scene(p).unwrap());
    payload
}

#[test]
fn source_utf8_ascii_singletons_and_aliases_preserve_both_known_forms() {
    let p = source();
    let bytes = roundtrip(&p);
    for text in ["A".repeat(64), "B".repeat(64)] {
        let mut header = vec![0xc1, 0x01];
        header.extend_from_slice(text.as_bytes());
        assert_eq!(
            bytes.windows(header.len()).filter(|w| *w == header).count(),
            1
        );
    }
    let mut terminated = vec![b'A'; 64];
    terminated[63] |= 128;
    assert_eq!(bytes.windows(64).filter(|w| *w == terminated).count(), 1);
    assert_eq!(p.wire.as_ref().unwrap().strings.len(), 3);
    let mut unrelated = p.clone();
    unrelated.rig.bones[0].x = 7.;
    assert_eq!(unrelated.wire, p.wire);
    roundtrip(&unrelated);
    // Existing long terminated-ASCII files continue to use the old default.
    let canonical = model();
    let bytes = roundtrip(&canonical);
    assert_eq!(decode_scene(&bytes).unwrap().wire, None);
    assert_ne!(bytes, encode_scene_payload(&p).unwrap());
}

#[test]
fn renamed_alias_detaches_and_same_length_rename_clears_only_its_form() {
    let original = source();
    let mut changed = original.clone();
    changed.rig.bones[1].name = "C".repeat(64);
    assert!(
        encode_scene_payload(&changed).is_err(),
        "Stale metadata must normalize before publishing"
    );
    normalize_wire_strings(&mut changed).unwrap();
    let strings = &changed.wire.as_ref().unwrap().strings;
    assert_eq!(strings.len(), 2);
    assert!(!strings.iter().any(|s| s.owner == WireStringOwner::Bone(1)));
    assert!(strings
        .iter()
        .any(|s| s.owner == WireStringOwner::Slot(0) && s.encoding.is_some()));
    roundtrip(&changed);
    // A snapshot restores exact form and bytes, independently of an edited value.
    assert_eq!(
        roundtrip(&original),
        encode_scene_payload(&original).unwrap()
    );
    changed.slots[0].name = "D".repeat(64);
    changed.rig.bones[2].name = "E".repeat(64);
    normalize_wire_strings(&mut changed).unwrap();
    assert!(changed.wire.as_ref().is_none_or(|w| w.strings.is_empty()));
    roundtrip(&changed);
}

#[test]
fn string_form_normalization_rejects_conflicts_and_prunes_removed_sites() {
    let p = source();
    let mut bad = p.clone();
    bad.wire
        .as_mut()
        .unwrap()
        .strings
        .iter_mut()
        .find(|s| s.owner == WireStringOwner::Slot(0))
        .unwrap()
        .encoding = None;
    assert!(normalize_wire_strings(&mut bad).is_err());
    assert!(encode_scene_payload(&bad).is_err());
    let mut bad = p.clone();
    bad.rig.bones[2].name = "é".into();
    bad.wire
        .as_mut()
        .unwrap()
        .strings
        .iter_mut()
        .find(|s| s.owner == WireStringOwner::Bone(2))
        .unwrap()
        .encoding = encoding("é");
    assert!(normalize_wire_strings(&mut bad).is_err());
    let mut removed = p.clone();
    removed.rig.bones.pop();
    assert!(normalize_wire_strings(&mut removed).is_err());
    removed
        .wire
        .as_mut()
        .unwrap()
        .strings
        .retain(|s| s.owner != WireStringOwner::Bone(2));
    normalize_wire_strings(&mut removed).unwrap();
    roundtrip(&removed);
    let mut duplicated_site = p;
    let alias = duplicated_site.wire.as_ref().unwrap().strings[0].clone();
    duplicated_site.wire.as_mut().unwrap().strings.push(alias);
    assert!(normalize_wire_strings(&mut duplicated_site).is_err());
}
