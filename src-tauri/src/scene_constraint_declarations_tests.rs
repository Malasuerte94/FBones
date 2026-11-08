//! Declaration order is persistence metadata, never the runtime execution list.
use super::*;
use fbones_format::minimal::scene::*;
use serde_json::{json, Value};
use std::collections::BTreeMap;
fn summary(s: &Session) -> ProjectSummary {
    s.summary().unwrap().unwrap()
}
fn model(s: &Session) -> SceneProject {
    let state = s.lock().unwrap();
    let Some(Document::Editable { project, .. }) = &state.document else {
        panic!("editable")
    };
    (**project).clone()
}
fn payload(s: &Session) -> Vec<u8> {
    roundtrip(&model(s))
}
fn command(s: &Session, v: Value) -> ProjectSummary {
    s.edit(summary(s).revision, serde_json::from_value(v).unwrap())
        .unwrap()
}
fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let b = encode_scene_payload(p).unwrap();
    let q = decode_scene(&b).unwrap();
    assert_eq!(&q, p);
    assert_eq!(encode_scene_payload(&q).unwrap(), b);
    b
}
fn ids(p: &ProjectSummary) -> Vec<u64> {
    p.constraints
        .iter()
        .map(|c| c["id"].as_u64().unwrap())
        .collect()
}
fn declaration_ids(s: &Session) -> [Vec<u64>; 3] {
    let p = model(s);
    let ids = ids(&summary(s));
    let d = p
        .wire
        .as_ref()
        .and_then(|w| w.constraint_declarations.clone())
        .unwrap_or_else(|| canonical_constraint_declarations(&p));
    [d.ik, d.transform, d.physics].map(|v| v.into_iter().map(|i| ids[i]).collect())
}
fn key_map(p: &ProjectSummary) -> BTreeMap<u64, Value> {
    let mut result = BTreeMap::new();
    let animations = serde_json::to_value(&p.animations).unwrap();
    for clip in animations.as_array().unwrap() {
        for family in [
            "tracks",
            "slotTracks",
            "constraintTracks",
            "deformTracks",
            "sequenceTracks",
            "eventTracks",
        ] {
            for track in clip[family].as_array().unwrap() {
                for key in track["keys"].as_array().unwrap() {
                    let mut row = track.clone();
                    row.as_object_mut().unwrap().remove("keys");
                    row["key"] = key.clone();
                    assert!(result.insert(key["id"].as_u64().unwrap(), row).is_none());
                }
            }
        }
        for key in clip["drawOrder"].as_array().unwrap() {
            assert!(result
                .insert(key["id"].as_u64().unwrap(), key.clone())
                .is_none());
        }
    }
    result
}
fn open(canonical: bool) -> (tempfile::TempDir, Session, Vec<u8>, Vec<u8>) {
    let dir = tempfile::tempdir().unwrap();
    let p = if canonical {
        crate::scene_constraint_declarations_fixture::canonical_project()
    } else {
        crate::scene_constraint_declarations_fixture::project()
    };
    std::fs::create_dir_all(dir.path().join(&p.images_root)).unwrap();
    let png = crate::images::tests::png([140, 80, 210, 255]);
    for name in crate::animation_sequence::all_image_keys(&p).unwrap() {
        std::fs::write(
            dir.path().join(&p.images_root).join(format!("{name}.png")),
            &png,
        )
        .unwrap();
    }
    let bytes = encode_scene(&p).unwrap();
    let path = dir.path().join("source.spine");
    std::fs::write(&path, &bytes).unwrap();
    let s = Session::default();
    let view = s.replace(open_document(path).unwrap(), false).unwrap();
    assert!(!view.inspection_only);
    assert!(view.slots.iter().all(|s| s.image_available));
    (dir, s, bytes, png)
}
fn rejected(s: &Session, v: Value) {
    let before = serde_json::to_value(summary(s)).unwrap();
    let b = payload(s);
    assert!(s
        .edit(summary(s).revision, serde_json::from_value(v).unwrap())
        .is_err());
    assert_eq!(serde_json::to_value(summary(s)).unwrap(), before);
    assert_eq!(payload(s), b);
}

#[test]
fn declaration_only_metadata_preserves_execution_dto_and_evaluated_pose() {
    let (dir, s, _, _) = open(false);
    let original = model(&s);
    let before = summary(&s);
    let mut other = original.clone();
    other.wire.as_mut().unwrap().constraint_declarations = None;
    normalize_wire_strings(&mut other).unwrap();
    assert_eq!(other.constraints, original.constraints);
    assert_ne!(roundtrip(&other), payload(&s));
    // Reopen a second own source using the same safe resource directory.
    let path = dir.path().join("other.spine");
    std::fs::write(&path, encode_scene(&other).unwrap()).unwrap();
    let second = Session::default();
    second.replace(open_document(path).unwrap(), false).unwrap();
    let after = summary(&second);
    assert_eq!(
        serde_json::to_value(&before.bones).unwrap(),
        serde_json::to_value(&after.bones).unwrap()
    );
    assert_eq!(before.constraints, after.constraints);
    for frame in [0., 6., 15.] {
        let request = || {
            serde_json::from_value(json!({"mode":"none","time":frame/before.animation_fps,"animationId":before.animations[0].id})).unwrap()
        };
        let a = s.evaluate(before.revision, request()).unwrap();
        let b = second.evaluate(after.revision, request()).unwrap();
        assert_eq!(
            serde_json::to_value(a.bones).unwrap(),
            serde_json::to_value(b.bones).unwrap()
        );
    }
    assert_eq!(model(&s), original);
}

#[test]
fn declaration_reorder_rename_and_constraint_key_keep_stable_inventory_and_history() {
    let (_dir, s, _, _) = open(false);
    let initial = summary(&s);
    let before = payload(&s);
    let inventory = declaration_ids(&s);
    let keys = key_map(&initial);
    let c = ids(&initial);
    let moved = command(&s, json!({"type":"reorderConstraint","id":c[2],"index":0}));
    assert_eq!(moved.revision, initial.revision + 1);
    assert_eq!(ids(&moved), vec![c[2], c[0], c[1], c[3], c[4], c[5]]);
    assert_eq!(declaration_ids(&s), inventory);
    assert_eq!(key_map(&moved), keys);
    let mut renamed = initial.constraints[5].clone();
    renamed["name"] = json!("Own renamed IK");
    command(
        &s,
        json!({"type":"updateConstraint","id":c[5],"constraint":renamed}),
    );
    assert_eq!(declaration_ids(&s), inventory);
    assert_eq!(key_map(&summary(&s)), keys);
    let p = summary(&s);
    command(
        &s,
        json!({"type":"setAnimationConstraintKeys","animation":p.animations[0].id,"keys":[{"channel":"physics","constraint":c[1],"property":"wind","frame":10,"value":2.5,"curve":"linear"}]}),
    );
    assert_eq!(declaration_ids(&s), inventory);
    let with_key = payload(&s);
    let now = key_map(&summary(&s));
    for (id, key) in keys {
        assert_eq!(now.get(&id), Some(&key));
    }
    command(&s, json!({"type":"undo"}));
    command(&s, json!({"type":"undo"}));
    command(&s, json!({"type":"undo"}));
    assert_eq!(payload(&s), before);
    command(&s, json!({"type":"redo"}));
    command(&s, json!({"type":"redo"}));
    command(&s, json!({"type":"redo"}));
    assert_eq!(payload(&s), with_key);
    rejected(&s, json!({"type":"deleteConstraint","id":c[2]}));
}

#[test]
fn declaration_delete_recreate_and_kind_change_prune_append_without_index_reuse() {
    let (_dir, s, _, _) = open(false);
    let p = summary(&s);
    let c = ids(&p);
    let inventory = declaration_ids(&s);
    let before = payload(&s);
    let keys = key_map(&p);
    command(&s, json!({"type":"deleteConstraint","id":c[4]}));
    let after_delete = declaration_ids(&s);
    assert_eq!(after_delete[2], vec![c[1]]);
    assert_eq!(after_delete[0], inventory[0]);
    let p = summary(&s);
    assert_eq!(ids(&p)[4], c[5]);
    command(
        &s,
        json!({"type":"addConstraint","constraint":{"type":"physics","name":"Own new physics","bone":p.bones[2].id}}),
    );
    let p = summary(&s);
    let fresh = *ids(&p).last().unwrap();
    assert_ne!(fresh, c[4]);
    assert_eq!(declaration_ids(&s)[2], vec![c[1], fresh]);
    assert_eq!(key_map(&p), keys);
    // Existing same-ID type replacement joins its new declaration family once.
    command(
        &s,
        json!({"type":"updateConstraint","id":c[5],"constraint":{"type":"transform","name":"Own changed kind","source":p.bones[2].id,"bones":[p.bones[1].id],"mix":[0,0,0,0,0,0]}}),
    );
    let d = declaration_ids(&s);
    assert_eq!(d[0], vec![c[2]]);
    assert_eq!(d[1], vec![c[3], c[0], c[5]]);
    assert_eq!(d[2], vec![c[1], fresh]);
    command(&s, json!({"type":"undo"}));
    command(&s, json!({"type":"undo"}));
    command(&s, json!({"type":"undo"}));
    assert_eq!(payload(&s), before);
    assert_eq!(ids(&summary(&s)), c);
}

#[test]
fn declaration_canonical_none_materializes_full_aliases_and_returns_to_exact_none() {
    let (_dir, s, _, _) = open(true);
    let original = model(&s);
    assert!(original.wire.is_none());
    let before = payload(&s);
    let initial = summary(&s);
    let c = ids(&initial);
    let inventory = declaration_ids(&s);
    let keys = key_map(&initial);
    let noop = command(&s, json!({"type":"reorderConstraint","id":c[3],"index":3}));
    assert_eq!(noop.revision, initial.revision);
    assert!(model(&s).wire.is_none());
    // Unrelated parameter authoring leaves the lazy canonical profile unmaterialized.
    command(
        &s,
        json!({"type":"setBoneColor","id":initial.bones[0].id,"color":0x224466ffu32}),
    );
    assert!(model(&s).wire.is_none());
    command(&s, json!({"type":"undo"}));
    assert_eq!(payload(&s), before);
    command(&s, json!({"type":"reorderConstraint","id":c[3],"index":0}));
    let materialized = model(&s);
    assert!(materialized
        .wire
        .as_ref()
        .unwrap()
        .constraint_declarations
        .is_some());
    assert_eq!(declaration_ids(&s), inventory);
    assert_eq!(key_map(&summary(&s)), keys);
    let aliases = &materialized.wire.as_ref().unwrap().strings;
    let labels: Vec<_> = aliases
        .iter()
        .filter(|a| matches!(a.owner, WireStringOwner::Bone(_)) && a.tag == 28)
        .collect();
    assert_eq!(labels.len(), original.rig.bones.len());
    assert!(labels.iter().all(|a| a.group == labels[0].group));
    assert_eq!(materialized.events, original.events);
    assert_eq!(
        materialized.animations[0].event_tracks,
        original.animations[0].event_tracks
    );
    roundtrip(&materialized);
    command(&s, json!({"type":"reorderConstraint","id":c[3],"index":3}));
    assert!(model(&s).wire.is_none());
    assert_eq!(payload(&s), before);
    command(&s, json!({"type":"undo"}));
    assert_eq!(model(&s), materialized);
    command(&s, json!({"type":"undo"}));
    assert!(model(&s).wire.is_none());
    assert_eq!(payload(&s), before);
    command(&s, json!({"type":"reorderConstraint","id":c[3],"index":0}));
    command(&s, json!({"type":"deleteConstraint","id":c[3]}));
    assert!(model(&s).wire.is_none());
    roundtrip(&model(&s));
    command(&s, json!({"type":"undo"}));
    assert_eq!(model(&s), materialized);
    command(&s, json!({"type":"undo"}));
    assert!(model(&s).wire.is_none());
    assert_eq!(payload(&s), before);
}

#[test]
fn declaration_portable_save_rebases_all_history_without_reordering_and_rejects_stale() {
    let (dir, s, source, png) = open(false);
    let c = ids(&summary(&s));
    let inventory = declaration_ids(&s);
    command(&s, json!({"type":"reorderConstraint","id":c[4],"index":0}));
    let edited = model(&s);
    let stale = s.prepare_save(true).unwrap();
    let p = summary(&s);
    command(
        &s,
        json!({"type":"setBoneColor","id":p.bones[0].id,"color":0x335577ffu32}),
    );
    let target = dir.path().join("portable/own.fbones");
    std::fs::create_dir_all(target.parent().unwrap()).unwrap();
    std::fs::write(&target, b"existing target").unwrap();
    let state = serde_json::to_value(summary(&s)).unwrap();
    let b = payload(&s);
    assert_eq!(
        s.save_snapshot(stale, target.clone()).unwrap_err().code,
        "ProjectChanged"
    );
    assert_eq!(std::fs::read(&target).unwrap(), b"existing target");
    assert_eq!(serde_json::to_value(summary(&s)).unwrap(), state);
    assert_eq!(payload(&s), b);
    let mut expected = model(&s);
    expected.images_root = "./images/".into();
    expected.audio_root = "./audio".into();
    normalize_wire_strings(&mut expected).unwrap();
    let expected_bytes = roundtrip(&expected);
    s.save_snapshot(s.prepare_save(true).unwrap(), target.clone())
        .unwrap();
    assert_eq!(model(&s), expected);
    assert_eq!(payload(&s), expected_bytes);
    assert_eq!(declaration_ids(&s), inventory);
    command(&s, json!({"type":"undo"}));
    let mut rebased_edited = edited;
    rebased_edited.images_root = "./images/".into();
    rebased_edited.audio_root = "./audio".into();
    normalize_wire_strings(&mut rebased_edited).unwrap();
    assert_eq!(model(&s), rebased_edited);
    assert_eq!(declaration_ids(&s), inventory);
    command(&s, json!({"type":"undo"}));
    assert_eq!(ids(&summary(&s)), c);
    assert_eq!(declaration_ids(&s), inventory);
    roundtrip(&model(&s));
    command(&s, json!({"type":"redo"}));
    command(&s, json!({"type":"redo"}));
    assert_eq!(payload(&s), expected_bytes);
    s.close(false).unwrap();
    s.replace(open_document(target).unwrap(), false).unwrap();
    assert_eq!(model(&s), expected);
    for key in crate::animation_sequence::all_image_keys(&expected).unwrap() {
        assert_eq!(
            std::fs::read(dir.path().join("source-images").join(format!("{key}.png"))).unwrap(),
            png
        );
        assert_eq!(
            std::fs::read(
                dir.path()
                    .join("portable/images")
                    .join(format!("{key}.png"))
            )
            .unwrap(),
            png
        );
    }
    assert_eq!(
        std::fs::read(dir.path().join("source.spine")).unwrap(),
        source
    );
}
