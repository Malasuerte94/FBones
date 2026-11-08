use super::*;
use crate::minimal::Bone;

fn model() -> SceneProject {
    let mut rig = MinimalProject::new("own declaration order".into(), [103; 16]);
    for i in 1..5 {
        rig.bones.push(Bone {
            name: format!("bone{i}"),
            parent: Some(0),
            x: i as f32 * 10.,
            length: 20.,
            ..Bone::root()
        });
    }
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images/".into(),
        slots: vec![],
        region_order: vec![],
    });
    p.constraints = vec![
        Constraint::Transform(TransformConstraint::new("transform1".into(), vec![1], 2)),
        Constraint::Physics(PhysicsConstraint::new("physics1".into(), 1)),
        Constraint::Ik(IkConstraint::new("ik1".into(), vec![1], 2)),
        Constraint::Transform(TransformConstraint::new("transform2".into(), vec![3], 4)),
        Constraint::Ik(IkConstraint::new("ik2".into(), vec![3], 4)),
        Constraint::Physics(PhysicsConstraint::new("physics2".into(), 3)),
    ];
    p.events.push(EventDefinition {
        name: "event".into(),
        int: 7,
        float: -0.,
        string: "shared event default".into(),
        audio: String::new(),
        volume: 0.,
        balance: 0.,
    });
    p.animations[0].event_tracks.push(EventTimeline {
        event: 0,
        keys: vec![EventKeyframe {
            frame: 0.,
            int: 7,
            float: -0.,
            string: "shared event default".into(),
            volume: 0.,
            balance: 0.,
        }],
    });
    p
}
fn noncanonical() -> WireConstraintDeclarations {
    WireConstraintDeclarations {
        ik: vec![4, 2],
        transform: vec![3, 0],
        physics: vec![5, 1],
    }
}
fn source() -> SceneProject {
    let mut p = model();
    let mut wire = materialize_wire(&p).unwrap();
    wire.constraint_declarations = Some(noncanonical());
    p.wire = Some(wire);
    normalize_wire_strings(&mut p).unwrap();
    p
}
fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let bytes = encode_scene_payload(p).unwrap();
    let q = decode_scene(&bytes).unwrap();
    assert_eq!(&q, p);
    assert_eq!(encode_scene_payload(&q).unwrap(), bytes);
    assert_eq!(encode_scene(&q).unwrap(), encode_scene(p).unwrap());
    bytes
}
#[test]
fn materialization_preserves_complete_canonical_aliases_layout_and_event_links() {
    let p = model();
    let bytes = roundtrip(&p);
    assert!(p.wire.is_none());
    let wire = materialize_wire(&p).unwrap();
    assert_eq!(wire.constraint_declarations, None);
    let aliases: Vec<_> = wire.strings.iter().filter(|s| s.tag == 28).collect();
    assert_eq!(aliases.len(), p.rig.bones.len());
    assert!(aliases.iter().all(|s| s.group == aliases[0].group));
    let mut materialized = p.clone();
    materialized.wire = Some(wire);
    assert_eq!(encode_scene_payload(&materialized).unwrap(), bytes);
    // The intermediate helper intentionally retains provenance until publication.
    normalize_wire_strings(&mut materialized).unwrap();
    assert!(materialized.wire.is_none());
    assert_eq!(materialized, p);
    let mut invalid = p;
    invalid.rig.bones[1].x = f32::NAN;
    assert!(materialize_wire(&invalid).is_err());
}
#[test]
fn mixed_declarations_change_only_inventory_order_not_authored_execution() {
    let canonical = model();
    assert_eq!(
        canonical_constraint_declarations(&canonical),
        WireConstraintDeclarations {
            ik: vec![2, 4],
            transform: vec![0, 3],
            physics: vec![1, 5],
        }
    );
    let p = source();
    assert_eq!(p.constraints, canonical.constraints);
    assert_ne!(roundtrip(&p), encode_scene_payload(&canonical).unwrap());
    let mut changed = p.clone();
    let Constraint::Physics(c) = &mut changed.constraints[1] else {
        unreachable!()
    };
    c.name = "renamed physics".into();
    c.wind = -3.25;
    normalize_wire_strings(&mut changed).unwrap();
    assert_eq!(
        changed.wire.as_ref().unwrap().constraint_declarations,
        Some(noncanonical())
    );
    roundtrip(&changed);
    assert_eq!(
        materialize_wire(&changed).unwrap(),
        *changed.wire.as_ref().unwrap()
    );
}
#[test]
fn canonical_before_execution_reorder_can_preserve_semantic_declarations() {
    let before = model();
    let mut p = before.clone();
    let mut wire = materialize_wire(&before).unwrap();
    // Own stable-ID simulation: swap same-family execution indices 0 and 3.
    p.constraints.swap(0, 3);
    wire.constraint_declarations = Some(WireConstraintDeclarations {
        ik: vec![2, 4],
        transform: vec![3, 0],
        physics: vec![1, 5],
    });
    p.wire = Some(wire);
    normalize_wire_strings(&mut p).unwrap();
    roundtrip(&p);
    // Dropping only declaration provenance changes serialization, not execution.
    let mut dropped = p.clone();
    dropped.wire.as_mut().unwrap().constraint_declarations = None;
    assert_eq!(p.constraints, dropped.constraints);
    assert_ne!(
        encode_scene_payload(&p).unwrap(),
        encode_scene_payload(&dropped).unwrap()
    );
    p.constraints.swap(0, 3);
    p.wire.as_mut().unwrap().constraint_declarations = Some(canonical_constraint_declarations(&p));
    normalize_wire_strings(&mut p).unwrap();
    assert_eq!(p, before);
}
#[test]
fn declaration_validation_rejects_missing_duplicate_wrong_kind_and_stale_indices() {
    let p = source();
    for declarations in [
        WireConstraintDeclarations {
            ik: vec![4],
            ..noncanonical()
        },
        WireConstraintDeclarations {
            ik: vec![4, 4],
            ..noncanonical()
        },
        WireConstraintDeclarations {
            ik: vec![4, 0],
            ..noncanonical()
        },
        WireConstraintDeclarations {
            ik: vec![4, 128],
            ..noncanonical()
        },
        WireConstraintDeclarations {
            physics: vec![5, 1, 2],
            ..noncanonical()
        },
    ] {
        let mut bad = p.clone();
        bad.wire.as_mut().unwrap().constraint_declarations = Some(declarations);
        assert!(encode_scene_payload(&bad).is_err());
        assert!(normalize_wire_strings(&mut bad).is_err());
        assert!(materialize_wire(&bad).is_err());
    }
    let mut canonical = model();
    let mut wire = materialize_wire(&canonical).unwrap();
    wire.constraint_declarations = Some(canonical_constraint_declarations(&canonical));
    canonical.wire = Some(wire);
    assert!(
        encode_scene_payload(&canonical).is_err(),
        "Redundant metadata must normalize before publishing"
    );
    normalize_wire_strings(&mut canonical).unwrap();
    assert!(canonical.wire.is_none());
    roundtrip(&canonical);
}

#[test]
fn existing_materialized_wire_retains_source_scalar_bits_and_lexical_markers() {
    let mut p = source();
    let source_text = p.rig.bones[1].name.clone();
    let wire = p.wire.as_mut().unwrap();
    wire.editor_scalar_46 = FiniteF32::new(50.).unwrap();
    wire.skeleton_bounds_24 = [-0., 1.25, -2., 3.].map(|v| FiniteF32::new(v).unwrap());
    wire.strings.push(WireStringAlias {
        owner: WireStringOwner::Bone(1),
        tag: 1,
        group: 100,
        encoding: Some(WireStringEncoding {
            form: WireStringForm::Utf8Length,
            source_text,
        }),
    });
    normalize_wire_strings(&mut p).unwrap();
    let bytes = roundtrip(&p);
    let captured = materialize_wire(&p).unwrap();
    assert_eq!(&captured, p.wire.as_ref().unwrap());
    assert_eq!(
        captured.skeleton_bounds_24[0].to_bits(),
        (-0.0f32).to_bits()
    );
    let mut attached = p.clone();
    attached.wire = Some(captured);
    assert_eq!(encode_scene_payload(&attached).unwrap(), bytes);
    assert_eq!(attached.constraints, p.constraints);
}
