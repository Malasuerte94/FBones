//! Own passive editor metadata alongside a real editable five-bone scene.
//! Compiled only for tests/e2e-host. No personal paths, source text or assets.
use fbones_format::minimal::scene::*;
use serde_json::{json, Value};

fn f(value: f32) -> FiniteF32 {
    FiniteF32::new(value).unwrap()
}
fn text(value: &str, group: Option<u32>) -> WireEditorString {
    WireEditorString {
        value: value.into(),
        group,
        encoding: None,
    }
}

pub(crate) fn project() -> SceneProject {
    let mut p = crate::scene_string_form_fixture::project();
    p.rig.name = "Own passive import metadata".into();
    // Measured source profile: independent8 initially equals accepted active9.
    // Runtime still uses9; native lifecycle tests cover the independent policy.
    p.wire.as_mut().unwrap().slot_references_8 = vec![
        AttachmentAddress {
            slot: 0,
            attachment: 0,
        },
        AttachmentAddress {
            slot: 1,
            attachment: 0,
        },
    ];
    // A spare bone makes the actual Simulate control available without moving art.
    if !p
        .constraints
        .iter()
        .any(|c| matches!(c, Constraint::Physics(_)))
    {
        let mut spring = PhysicsConstraint::new("Own metadata spring".into(), 3);
        spring.y = 1.;
        spring.gravity = 10.;
        p.constraints.push(Constraint::Physics(spring));
    }
    if !p.constraints.iter().any(|c| matches!(c, Constraint::Ik(_))) {
        let mut reach = IkConstraint::new("Own source-state IK".into(), vec![4], 1);
        reach.mix = 0.875;
        p.constraints.push(Constraint::Ik(reach));
    }
    // These are retained source values, not a second set of solver inputs.
    let mut source_state = WireSourceState {
        skeleton_126: true,
        bone_126: vec![1, 3],
        slot_126: vec![0, 1],
        bone_labels_28: vec![(4, "ik".into())],
        animation_3: vec![0],
        group_2: [9; 5],
        skeleton_toggles: [true, false, true, false, false, false, true],
        mesh_19: vec![(
            AttachmentAddress {
                slot: 1,
                attachment: 0,
            },
            f(103.5),
        )],
        ..WireSourceState::default()
    };
    for (constraint, value) in p.constraints.iter().enumerate() {
        match value {
            Constraint::Ik(value) => source_state.ik.push(WireIkSourceState {
                constraint,
                mix_6: f(value.mix),
                uint_17: 1,
            }),
            Constraint::Transform(value) => source_state.transform.push(WireTransformSourceState {
                constraint,
                values: [3, 2, 5, 4, 0, 1].map(|index| f(value.mix[index])),
            }),
            Constraint::Physics(value) => source_state.physics.push(WirePhysicsSourceState {
                constraint,
                values: [
                    f(-0.),
                    f(value.strength),
                    f(value.mix),
                    f(value.damping),
                    f(value.inertia),
                    f(value.mass),
                    f(value.gravity),
                ],
            }),
        }
    }
    p.wire.as_mut().unwrap().source_state = Some(source_state);
    let source_path = text("./remembered-only/own-design.psd", Some(500));
    let mut metadata = WireEditorMetadata {
        flag_4: true,
        uint_42: 7,
        scalar_8: f(0.9),
        scalar_34: f(-0.),
        format: Some(text("json", Some(501))),
        vectors: std::array::from_fn(|i| [f(i as f32 + 0.25), f(-0.), f(1.5)]),
        ..WireEditorMetadata::default()
    };
    metadata.directories = ["exportDir", "imagesDir", "dirs"]
        .into_iter()
        .enumerate()
        .map(|(i, key)| WireHistoryEntry {
            key: text(key, None),
            kind: 2,
            paths: vec![WireHistoryPath {
                path: text(&format!("./remembered-only/own-folder-{i}"), None),
                stamp: (1u64 << 40) + i as u64 + 7,
                flag: i % 2 == 0,
            }],
        })
        .collect();
    metadata.imports = vec![WireHistoryEntry {
        key: text("psd", None),
        kind: 2,
        paths: vec![WireHistoryPath {
            path: source_path.clone(),
            stamp: (1u64 << 41) + 9,
            flag: false,
        }],
    }];
    metadata.sources = vec![WireSourceImage {
        path: source_path,
        values: [f(-0.), f(0.9)],
        flags: [true, false],
    }];
    let mut settings = WireJsonSettings {
        flags: [true, false, true, false, false, true],
        texts: ["own-export", "own-prefix", "own-pack", "", ""].map(|s| text(s, None)),
        ..WireJsonSettings::default()
    };
    let marked = "M".repeat(64);
    settings.texts[4] = WireEditorString {
        value: marked.clone(),
        group: None,
        encoding: Some(WireStringEncoding {
            form: WireStringForm::Utf8Length,
            source_text: marked,
        }),
    };
    let packing = &mut settings.packing;
    packing.flags = std::array::from_fn(|i| i % 3 == 0);
    packing.uints = [16, 64, 0, 1, 2, 4];
    // Closed known enum values. Pairs28/29 and27/26 retain shared bodies.
    packing.enums = [
        WireEditorEnum {
            value: 2,
            group: Some(600),
        },
        WireEditorEnum {
            value: 2,
            group: Some(600),
        },
        WireEditorEnum {
            value: 5,
            group: None,
        },
        WireEditorEnum {
            value: 7,
            group: Some(601),
        },
        WireEditorEnum {
            value: 0,
            group: None,
        },
        WireEditorEnum {
            value: 7,
            group: Some(601),
        },
    ];
    packing.strings = Some(vec!["own-packed".into(), "own-alternate".into()]);
    packing.enum_array = Some(vec![
        WireEditorEnum {
            value: 0,
            group: None,
        },
        WireEditorEnum {
            value: 2,
            group: None,
        },
    ]);
    packing.float_array = Some(vec![f(-0.), f(0.5), f(2.)]);
    packing.text_31 = text("own-output", None);
    packing.text_14 = text("own-texture-prefix", None);
    packing.float_15 = f(0.9);
    metadata.exports = vec![WireExportEntry {
        key: text("json", Some(501)),
        settings,
    }];
    p.wire.as_mut().unwrap().editor_metadata = Some(metadata);
    normalize_wire_strings(&mut p).unwrap();
    p
}

fn bits(value: FiniteF32) -> String {
    format!("{:08x}", value.to_bits())
}
fn string_view(value: &WireEditorString) -> Value {
    json!({"value":value.value,"group":value.group,"encoding":value.encoding.as_ref().map(|e|
        json!({"form":format!("{:?}",e.form),"sourceText":e.source_text}))})
}
fn enum_view(value: &WireEditorEnum) -> Value {
    json!({"value":value.value,"group":value.group})
}
fn history_view(entries: &[WireHistoryEntry]) -> Value {
    Value::Array(
        entries
            .iter()
            .map(|entry| {
                json!({
                    "key":string_view(&entry.key),"kind":entry.kind,
                    "paths":entry.paths.iter().map(|path| json!({"path":string_view(&path.path),
                        "stamp":path.stamp.to_string(),"flag":path.flag})).collect::<Vec<_>>()
                })
            })
            .collect(),
    )
}

/// Native codec projection for bounded test artifacts, not an independent encoder.
/// Keep float bits and large counters lossless across the JSON test transport.
fn source_state_view(project: &SceneProject) -> Value {
    let Some(state) = project
        .wire
        .as_ref()
        .and_then(|wire| wire.source_state.as_ref())
    else {
        return Value::Null;
    };
    json!({
        "skeleton126":state.skeleton_126,"bone126":state.bone_126,"slot126":state.slot_126,
        "boneLabels28":state.bone_labels_28,"animation3":state.animation_3,"group2":state.group_2,"skeletonToggles":state.skeleton_toggles,
        "mesh19":state.mesh_19.iter().map(|(address,value)|json!({"slot":address.slot,"attachment":address.attachment,"bits":bits(*value)})).collect::<Vec<_>>(),
        "ik":state.ik.iter().map(|row|json!({"constraint":row.constraint,"mix6Bits":bits(row.mix_6),"uint17":row.uint_17})).collect::<Vec<_>>(),
        "transform":state.transform.iter().map(|row|json!({"constraint":row.constraint,"valueBits":row.values.map(bits)})).collect::<Vec<_>>(),
        "physics":state.physics.iter().map(|row|json!({"constraint":row.constraint,"valueBits":row.values.map(bits)})).collect::<Vec<_>>()
    })
}
pub(crate) fn metadata_view(project: &SceneProject) -> Value {
    let retained = |mut value: Value| {
        value["sourceState"] = source_state_view(project);
        value["slotReferences8"] = json!(project
            .wire
            .as_ref()
            .map(|wire| wire
                .slot_references_8
                .iter()
                .map(|address| json!({"slot":address.slot,"attachment":address.attachment}))
                .collect::<Vec<_>>())
            .unwrap_or_default());
        value
    };
    let Some(metadata) = project
        .wire
        .as_ref()
        .and_then(|wire| wire.editor_metadata.as_ref())
    else {
        return retained(json!({}));
    };
    retained(json!({
        "directories":history_view(&metadata.directories),"imports":history_view(&metadata.imports),
        "format":metadata.format.as_ref().map(string_view),"flag4":metadata.flag_4,"uint42":metadata.uint_42,
        "scalar8Bits":bits(metadata.scalar_8),"scalar34Bits":bits(metadata.scalar_34),
        "vectorsBits":metadata.vectors.map(|values| values.map(bits)),
        "sources":metadata.sources.iter().map(|source| json!({"path":string_view(&source.path),
            "valuesBits":source.values.map(bits),"flags":source.flags})).collect::<Vec<_>>(),
        "exports":metadata.exports.iter().map(|entry| {
            let s=&entry.settings;let p=&s.packing;
            json!({"key":string_view(&entry.key),"flags":s.flags,
                "texts":s.texts.iter().map(string_view).collect::<Vec<_>>(),
                "packing":{"flags":p.flags,"uints":p.uints,"enums":p.enums.iter().map(enum_view).collect::<Vec<_>>(),
                    "strings":p.strings,"enumArray":p.enum_array.as_ref().map(|values| values.iter().map(enum_view).collect::<Vec<_>>()),
                    "floatArrayBits":p.float_array.as_ref().map(|values| values.iter().copied().map(bits).collect::<Vec<_>>()),
                    "text31":string_view(&p.text_31),"text14":string_view(&p.text_14),"float15Bits":bits(p.float_15)}})
        }).collect::<Vec<_>>()
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        rig::RigEdit,
        scene_edit::SceneRigHistory,
        solve::{evaluate, PhysicsState, StepMode},
    };
    use std::collections::BTreeMap;

    fn roundtrip(project: &SceneProject) -> Vec<u8> {
        let bytes = encode_scene_payload(project).unwrap();
        let decoded = decode_scene(&bytes).unwrap();
        assert_eq!(&decoded, project);
        assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
        assert_eq!(
            encode_scene(&decoded).unwrap(),
            encode_scene(project).unwrap()
        );
        bytes
    }
    // Groups are abstract identities in a shared scene namespace. Removing an
    // unrelated scene-root alias may renumber them; compare equivalence classes.
    fn semantic_metadata(project: &SceneProject) -> Value {
        fn visit(value: &mut Value, groups: &mut BTreeMap<(bool, u64), u64>) {
            match value {
                Value::Array(values) => {
                    for value in values {
                        visit(value, groups);
                    }
                }
                Value::Object(fields) => {
                    if let Some(group) = fields.get("group").and_then(Value::as_u64) {
                        let key = (fields.get("value").is_some_and(Value::is_string), group);
                        let fresh = groups.len() as u64;
                        let normalized = *groups.entry(key).or_insert(fresh);
                        fields.insert("group".into(), json!(normalized));
                    }
                    for value in fields.values_mut() {
                        visit(value, groups);
                    }
                }
                _ => (),
            }
        }
        let mut value = metadata_view(project);
        visit(&mut value, &mut BTreeMap::new());
        value
    }

    #[test]
    fn passive_import_metadata_roundtrip_preserves_bits_aliases_and_none_evaluation() {
        let project = project();
        roundtrip(&project);
        let metadata = metadata_view(&project);
        assert!(metadata["sources"][0]["path"]["group"].as_u64().is_some());
        assert!(metadata["exports"][0]["packing"]["enums"][0]["group"]
            .as_u64()
            .is_some());
        assert_eq!(metadata["scalar8Bits"], "3f666666");
        assert_eq!(metadata["scalar34Bits"], "80000000");
        assert_eq!(metadata["sourceState"]["skeleton126"], true);
        assert_eq!(metadata["sourceState"]["bone126"], json!([1, 3]));
        assert_eq!(metadata["sourceState"]["slot126"], json!([0, 1]));
        assert_eq!(metadata["sourceState"]["boneLabels28"], json!([[4, "ik"]]));
        assert_eq!(metadata["sourceState"]["animation3"], json!([0]));
        assert_eq!(metadata["sourceState"]["group2"], json!([9, 9, 9, 9, 9]));
        assert_eq!(metadata["sourceState"]["mesh19"][0]["bits"], "42cf0000");
        assert_eq!(
            metadata["sourceState"]["physics"][0]["valueBits"][0],
            "80000000"
        );
        assert_eq!(
            metadata["slotReferences8"],
            json!([{"slot":0,"attachment":0},{"slot":1,"attachment":0}])
        );
        assert_eq!(
            metadata["sources"][0]["valuesBits"],
            json!(["80000000", "3f666666"])
        );
        assert_eq!(
            metadata["imports"][0]["paths"][0]["path"]["group"],
            metadata["sources"][0]["path"]["group"]
        );
        assert_eq!(
            metadata["exports"][0]["packing"]["enums"][0]["group"],
            metadata["exports"][0]["packing"]["enums"][1]["group"]
        );
        assert_eq!(
            metadata["exports"][0]["packing"]["enums"][3]["group"],
            metadata["exports"][0]["packing"]["enums"][5]["group"]
        );
        let mut baseline = project.clone();
        baseline.wire.as_mut().unwrap().editor_metadata = None;
        baseline.wire.as_mut().unwrap().source_state = None;
        normalize_wire_strings(&mut baseline).unwrap();
        assert_ne!(
            roundtrip(&baseline),
            encode_scene_payload(&project).unwrap()
        );
        assert_eq!(baseline.rig, project.rig);
        assert_eq!(baseline.slots, project.slots);
        assert_eq!(baseline.constraints, project.constraints);
        let before = project.clone();
        let a = evaluate(&project, None, &mut PhysicsState::default(), StepMode::None).unwrap();
        let b = evaluate(
            &baseline,
            None,
            &mut PhysicsState::default(),
            StepMode::None,
        )
        .unwrap();
        assert_eq!(a, b);
        assert_eq!(
            project, before,
            "Evaluation must not bake runtime or execute remembered paths"
        );
    }

    #[test]
    fn passive_import_metadata_survives_native_history_and_prepared_resource_rebase() {
        let mut project = project();
        let original = project.clone();
        let expected = semantic_metadata(&project);
        let mut rig = SceneRigHistory::new(&project, true);
        let id = rig.history.frame().bone_ids[1];
        assert!(rig
            .apply(
                &mut project,
                RigEdit::SetBoneColor {
                    id,
                    color: 0x335577ff
                }
            )
            .unwrap());
        assert_eq!(semantic_metadata(&project), expected);
        roundtrip(&project);
        rig.apply(&mut project, RigEdit::Undo).unwrap();
        assert_eq!(project, original);
        rig.apply(&mut project, RigEdit::Redo).unwrap();
        // A primary authored change must not refresh or bake retained snapshots.
        let physics = project
            .constraints
            .iter()
            .position(|c| matches!(c, Constraint::Physics(_)))
            .unwrap();
        let constraint = rig.history.frame().constraint_ids[physics];
        let mut input = rig.constraint_views()[physics].clone();
        input["gravity"] = json!(20.);
        let before_primary = project.clone();
        rig.apply(
            &mut project,
            serde_json::from_value(
                json!({"type":"updateConstraint","id":constraint,"constraint":input}),
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(semantic_metadata(&project), expected);
        let Constraint::Physics(changed) = &project.constraints[physics] else {
            unreachable!()
        };
        assert_eq!(changed.gravity, 20.);
        roundtrip(&project);
        rig.apply(&mut project, RigEdit::Undo).unwrap();
        assert_eq!(project, before_primary);
        let before_plan = project.clone();
        let plan = rig
            .prepare_resource_rebase(
                &project.images_root,
                "./images/",
                &project.audio_root,
                "./audio",
            )
            .unwrap();
        assert_eq!(project, before_plan);
        let mut saved = project.clone();
        saved.images_root = "./images/".into();
        saved.audio_root = "./audio".into();
        normalize_wire_strings(&mut saved).unwrap();
        rig.apply_resource_rebase(plan);
        rig.mark_saved(&saved);
        project = saved;
        assert_eq!(semantic_metadata(&project), expected);
        roundtrip(&project);
        rig.apply(&mut project, RigEdit::Undo).unwrap();
        assert_eq!(project.images_root, "./images/");
        assert_eq!(project.audio_root, "./audio");
        assert_eq!(semantic_metadata(&project), expected);
        roundtrip(&project);
        rig.apply(&mut project, RigEdit::Redo).unwrap();
        assert_eq!(semantic_metadata(&project), expected);
        assert!(!rig.dirty(&project));
        roundtrip(&project);
    }
}
