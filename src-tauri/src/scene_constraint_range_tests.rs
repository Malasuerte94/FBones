//! Preserve the independently stored editor cache without inventing Match or
//! allowing generic numeric/JSON updates to author nullable cells.
use super::*;
use fbones_format::minimal::scene::{encode_scene, TransformEditorRange};

fn expected_bits() -> [Option<u32>; 24] {
    [
        Some(0x80000000),
        Some(0),
        Some(0x3dcccccd),
        None,
        Some(0x00800000),
        Some(1),
        None,
        Some(0x80000001),
        Some(0x7f7fffff),
        Some(0xff7fffff),
        Some(0x3eaaaaab),
        Some(0xc0000000),
        Some(0x40000000),
        Some(0xc0000000),
        Some(0),
        Some(0x3f800000),
        None,
        None,
        None,
        None,
        Some(0x3f800001),
        None,
        Some(0xbf800001),
        Some(0x41234567),
    ]
}
fn fixture() -> (tempfile::TempDir, Session, ProjectSummary) {
    let (d, s, p) = setup();
    let p = add_bone(&s, &p, 0);
    let source = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let target = p.edited_bone.unwrap();
    let p = add_bone(&s, &p, 0);
    let other = p.edited_bone.unwrap();
    let mut p = p;
    for name in ["Stored ranges", "All absent"] {
        p = command(
            &s,
            &p,
            serde_json::json!({"type":"addConstraint","constraint":{"type":"transform","name":name,"source":source,"bones":[target,other],"mix":[0,0,0,0,0,0],"properties":[{"property":"x","offset":2,"to":[{"property":"y","offset":-3,"max":8,"scale":0.7}]}]}}),
        );
    }
    assert!(p
        .constraints
        .iter()
        .all(|c| c["editorRangeBits"] == serde_json::to_value([None::<u32>; 24]).unwrap()));
    let mut model = scene_model(&s);
    let Constraint::Transform(stored) = &mut model.constraints[0] else {
        panic!("own Transform fixture")
    };
    let bits = expected_bits();
    for (row, cells) in stored.editor_ranges.iter_mut().zip(bits.chunks_exact(4)) {
        *row = TransformEditorRange::from_bits(cells.try_into().unwrap()).unwrap();
    }
    let file = d.path().join("own-ranges.fbones");
    std::fs::write(&file, encode_scene(&model).unwrap()).unwrap();
    let p = s.replace(open_document(file).unwrap(), true).unwrap();
    assert!(!p.inspection_only);
    assert!(!p.dirty);
    (d, s, p)
}
fn bits(s: &Session, id: u64) -> [Option<u32>; 24] {
    let state = s.lock().unwrap();
    let Some(Document::Editable { rig, .. }) = &state.document else {
        panic!("editable ranges")
    };
    let f = rig.history.frame();
    let Constraint::Transform(c) = &f.project.constraints[f.constraint_index(id).unwrap()] else {
        panic!("Transform kind")
    };
    c.editor_range_bits()
}
fn assert_bits(s: &Session, p: &ProjectSummary, id: u64, expected: [Option<u32>; 24]) {
    assert_eq!(bits(s, id), expected);
    let view = p.constraints.iter().find(|c| c["id"] == id).unwrap();
    assert_eq!(
        serde_json::from_value::<[Option<u32>; 24]>(view["editorRangeBits"].clone()).unwrap(),
        expected
    );
}
fn update(s: &Session, p: &ProjectSummary, id: u64, patch: serde_json::Value) -> ProjectSummary {
    let mut input = p
        .constraints
        .iter()
        .find(|c| c["id"] == id)
        .unwrap()
        .clone();
    let fields = input.as_object_mut().unwrap();
    for key in ["id", "order", "editorRangeBits"] {
        fields.remove(key);
    }
    for (key, value) in patch.as_object().unwrap() {
        fields.insert(key.clone(), value.clone());
    }
    command(
        s,
        p,
        serde_json::json!({"type":"updateConstraint","id":id,"constraint":input}),
    )
}
fn unchanged(s: &Session, p: &ProjectSummary, model: &fbones_format::minimal::scene::SceneProject) {
    assert_eq!(&scene_model(s), model);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        serde_json::to_value(p).unwrap()
    );
}

#[test]
fn constraint_ranges_every_same_kind_generic_patch_preserves_all_cell_bits() {
    let (_d, s, mut p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let other = p.constraints[1].clone();
    let source = p.bones[3].id;
    let targets = [p.bones[2].id, p.bones[1].id];
    for patch in [
        serde_json::json!({"name":"Renamed range cache"}),
        serde_json::json!({"mix":[0.2,0.3,0.4,0.5,0.6,0.7]}),
        serde_json::json!({"offsets":[17,-4,3,1.2,0.7,-9]}),
        serde_json::json!({"localSource":true,"localTarget":true,"additive":true,"clamp":true}),
        serde_json::json!({"source":source,"bones":targets}),
        serde_json::json!({"properties":[{"property":"y","offset":-7,"to":[{"property":"rotate","offset":20,"max":-8,"scale":0.25}]}]}),
        serde_json::json!({"properties":[]}),
    ] {
        p = update(&s, &p, id, patch);
        assert_bits(&s, &p, id, expected_bits());
        assert_eq!(
            p.constraints[1], other,
            "unrelated all-none constraint is unchanged"
        );
    }
    let model = scene_model(&s);
    assert_eq!(
        decode_scene(&encode_scene_payload(&model).unwrap()).unwrap(),
        model
    );
}

#[test]
fn constraint_ranges_view_only_echo_cannot_clear_cache_and_noop_preserves_clean_history() {
    let (_d, s, p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let before = scene_model(&s);
    let mut input = p.constraints[0].clone();
    input["editorRangeBits"] = serde_json::to_value([None::<u32>; 24]).unwrap();
    input["editorRanges"] = serde_json::to_value([None::<u32>; 24]).unwrap();
    let same = command(
        &s,
        &p,
        serde_json::json!({"type":"updateConstraint","id":id,"constraint":input}),
    );
    unchanged(&s, &p, &before);
    assert_eq!(same.revision, p.revision);
    assert!(!same.can_undo);
    assert!(!same.dirty);
    assert_bits(&s, &same, id, expected_bits());
    let encoded = serde_json::to_vec(&same).unwrap();
    let decoded: serde_json::Value = serde_json::from_slice(&encoded).unwrap();
    assert_eq!(
        decoded["constraints"][0]["editorRangeBits"][0],
        0x80000000u32
    );
    assert!(decoded["constraints"][0]["editorRangeBits"][3].is_null());
}

#[test]
fn constraint_ranges_new_constraints_and_kind_changes_do_not_carry_or_accept_range_authoring() {
    let (_d, s, p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let source = p.bones[1].id;
    let target = p.bones[2].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"addConstraint","constraint":{"type":"transform","name":"New default ranges","source":source,"bones":[target],"editorRangeBits":expected_bits(),"editorRanges":expected_bits()}}),
    );
    let new_id = p.constraints[2]["id"].as_u64().unwrap();
    assert_bits(&s, &p, new_id, [None; 24]);
    let before = scene_model(&s);
    let p = update(
        &s,
        &p,
        id,
        serde_json::json!({"type":"physics","name":"Changed kind","bone":0,"mix":1}),
    );
    assert_eq!(p.constraints[0]["type"], "physics");
    assert!(p.constraints[0].get("editorRangeBits").is_none());
    let p = update(
        &s,
        &p,
        id,
        serde_json::json!({"type":"transform","source":source,"bones":[target],"mix":[0,0,0,0,0,0]}),
    );
    assert_bits(&s, &p, id, [None; 24]);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(p.constraints[0]["type"], "physics");
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    assert_bits(&s, &p, id, expected_bits());
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_bits(&s, &p, id, [None; 24]);
}

#[test]
fn constraint_ranges_invalid_stale_and_wrong_mapping_edits_keep_data_revision_and_history() {
    let (_d, s, p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let before = scene_model(&s);
    for patch in [
        serde_json::json!({"source":u64::MAX}),
        serde_json::json!({"bones":[p.bones[2].id,p.bones[2].id]}),
        serde_json::json!({"properties":[{"property":"not a channel","to":[]}]}),
    ] {
        let mut input = p.constraints[0].clone();
        for (k, v) in patch.as_object().unwrap() {
            input[k] = v.clone();
        }
        let edit = serde_json::from_value(
            serde_json::json!({"type":"updateConstraint","id":id,"constraint":input}),
        )
        .unwrap();
        assert!(s.edit(p.revision, edit).is_err());
        unchanged(&s, &p, &before);
        assert_bits(&s, &p, id, expected_bits());
    }
    let edit = serde_json::from_value(
        serde_json::json!({"type":"updateConstraint","id":id,"constraint":p.constraints[0]}),
    )
    .unwrap();
    assert_eq!(
        s.edit(p.revision - 1, edit).unwrap_err().code,
        "ProjectChanged"
    );
    unchanged(&s, &p, &before);
}

#[test]
fn constraint_ranges_bone_remap_reorder_one_step_history_and_native_save_close_reopen_are_lossless()
{
    let (d, s, p) = fixture();
    let id = p.constraints[0]["id"].as_u64().unwrap();
    let before = scene_model(&s);
    let source = p.constraints[0]["source"].clone();
    let targets = p.constraints[0]["bones"].clone();
    let p = s
        .edit(
            p.revision,
            RigEdit::Reparent {
                id: p.bones[1].id,
                parent: p.bones[3].id,
            },
        )
        .unwrap();
    assert_bits(&s, &p, id, expected_bits());
    assert_eq!(p.constraints[0]["source"], source);
    assert_eq!(p.constraints[0]["bones"], targets);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"reorderConstraint","id":id,"index":1}),
    );
    assert_bits(&s, &p, id, expected_bits());
    let after = scene_model(&s);
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(p.constraints[0]["id"], id);
    assert_bits(&s, &p, id, expected_bits());
    let p = s.edit(p.revision, RigEdit::Undo).unwrap();
    assert_eq!(scene_model(&s), before);
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    let _p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert_eq!(scene_model(&s), after);
    let saved = s
        .save_snapshot(
            s.prepare_save(true).unwrap(),
            d.path().join("portable/ranges.fbones"),
        )
        .unwrap();
    s.close(false).unwrap();
    let p = s
        .replace(
            open_document(PathBuf::from(saved.path.unwrap())).unwrap(),
            false,
        )
        .unwrap();
    assert!(!p.inspection_only);
    assert!(!p.dirty);
    let id = p
        .constraints
        .iter()
        .find(|c| c["name"] == "Stored ranges")
        .unwrap()["id"]
        .as_u64()
        .unwrap();
    assert_bits(&s, &p, id, expected_bits());
    let mut expected = after;
    expected.images_root = "./images/".into();
    assert_eq!(scene_model(&s), expected);
}
