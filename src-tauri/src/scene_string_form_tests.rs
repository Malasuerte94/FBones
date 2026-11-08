//! Lexical provenance through the real Session, history and portable Save.
use super::*;
use fbones_format::minimal::scene::*;
use serde_json::{json, Value};

fn model(session: &Session) -> SceneProject {
    let state = session.lock().unwrap();
    let Some(Document::Editable { project, .. }) = &state.document else {
        panic!("editable")
    };
    (**project).clone()
}
fn summary(session: &Session) -> ProjectSummary {
    session.summary().unwrap().unwrap()
}
fn bytes(session: &Session) -> Vec<u8> {
    encode_scene_payload(&model(session)).unwrap()
}
fn command(session: &Session, value: Value) -> ProjectSummary {
    session
        .edit(
            summary(session).revision,
            serde_json::from_value(value).unwrap(),
        )
        .unwrap()
}
fn update(p: &ProjectSummary, index: usize, name: String, rotation: f32) -> Value {
    let bone = &p.bones[index];
    json!({"type":"update","id":bone.id,"name":name,"x":bone.x,"y":bone.y,"rotation":rotation,"length":bone.length})
}
fn marker(p: &SceneProject, owner: WireStringOwner, tag: u32) -> bool {
    p.wire.as_ref().is_some_and(|w| {
        w.strings
            .iter()
            .any(|s| s.owner == owner && s.tag == tag && s.encoding.is_some())
    })
}
fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let bytes = encode_scene_payload(p).unwrap();
    let decoded = decode_scene(&bytes).unwrap();
    assert_eq!(&decoded, p);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
    bytes
}
fn contains(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|v| v == needle)
}
fn utf64(character: u8) -> Vec<u8> {
    let mut value = vec![0xc1, 1];
    value.extend([character; 64]);
    value
}
fn ascii64(character: u8) -> Vec<u8> {
    let mut value = vec![character; 64];
    value[63] |= 128;
    value
}
fn open() -> (tempfile::TempDir, Session, Vec<u8>, Vec<u8>) {
    let directory = tempfile::tempdir().unwrap();
    let source = crate::scene_string_form_fixture::project();
    std::fs::create_dir_all(directory.path().join(&source.images_root)).unwrap();
    let png = crate::images::tests::png([30, 140, 210, 255]);
    for name in crate::animation_sequence::all_image_keys(&source).unwrap() {
        std::fs::write(
            directory
                .path()
                .join(&source.images_root)
                .join(format!("{name}.png")),
            &png,
        )
        .unwrap();
    }
    let original = encode_scene(&source).unwrap();
    let path = directory.path().join("source.spine");
    std::fs::write(&path, &original).unwrap();
    let session = Session::default();
    let p = session
        .replace(open_document(path).unwrap(), false)
        .unwrap();
    assert!(!p.inspection_only);
    assert!(p.slots.iter().all(|s| s.image_available));
    (directory, session, original, png)
}

#[test]
fn string_forms_source_model_payload_and_old_canonical_ascii64_both_roundtrip() {
    let p = crate::scene_string_form_fixture::project();
    let raw = roundtrip(&p);
    assert!(contains(&raw, &utf64(b'A')) && contains(&raw, &utf64(b'B')));
    assert!(!contains(&raw, &ascii64(b'A')) && !contains(&raw, &ascii64(b'B')));
    assert!(contains(&raw, &ascii64(b'C')) && !contains(&raw, &utf64(b'C')));
    let a = p
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .find(|s| s.owner == WireStringOwner::Bone(1) && s.tag == 1)
        .unwrap();
    let b = p
        .wire
        .as_ref()
        .unwrap()
        .strings
        .iter()
        .find(|s| s.owner == WireStringOwner::Slot(0) && s.tag == 1)
        .unwrap();
    assert_eq!(a.group, b.group);
    let mut canonical = p.clone();
    for s in &mut canonical.wire.as_mut().unwrap().strings {
        s.encoding = None;
    }
    normalize_wire_strings(&mut canonical).unwrap();
    let old = roundtrip(&canonical);
    assert!(contains(&old, &ascii64(b'A')) && contains(&old, &ascii64(b'B')));
    assert_ne!(old, raw);
}

#[test]
fn string_form_noop_unrelated_edit_same_length_rename_and_history_preserve_sibling() {
    let (_directory, session, _, _) = open();
    let initial = summary(&session);
    let source = bytes(&session);
    let original = model(&session);
    let unchanged = command(
        &session,
        update(
            &initial,
            1,
            initial.bones[1].name.clone(),
            initial.bones[1].rotation,
        ),
    );
    assert_eq!(unchanged.revision, initial.revision);
    assert!(!unchanged.can_undo);
    assert_eq!(bytes(&session), source);
    command(
        &session,
        update(&unchanged, 2, unchanged.bones[2].name.clone(), 9.),
    );
    assert_eq!(model(&session).wire, original.wire);
    command(&session, json!({"type":"undo"}));
    assert_eq!(bytes(&session), source);
    let p = summary(&session);
    command(&session, update(&p, 1, "D".repeat(64), p.bones[1].rotation));
    let renamed = model(&session);
    assert!(!marker(&renamed, WireStringOwner::Bone(1), 1));
    assert!(marker(&renamed, WireStringOwner::Slot(0), 1));
    let raw = roundtrip(&renamed);
    assert!(contains(&raw, &ascii64(b'D')) && contains(&raw, &utf64(b'A')));
    command(&session, json!({"type":"undo"}));
    assert_eq!(bytes(&session), source);
    command(&session, json!({"type":"redo"}));
    assert_eq!(bytes(&session), raw);
    let p = summary(&session);
    command(&session, update(&p, 1, "A".repeat(64), p.bones[1].rotation));
    // Explicit rename-away/back follows canonical authoring; Undo restores source provenance.
    assert!(!marker(&model(&session), WireStringOwner::Bone(1), 1));
    assert!(marker(&model(&session), WireStringOwner::Slot(0), 1));
    roundtrip(&model(&session));
    let p = summary(&session);
    let state = serde_json::to_value(&p).unwrap();
    let preserved = bytes(&session);
    let duplicate = update(&p, 1, p.bones[4].name.clone(), p.bones[1].rotation);
    assert!(session
        .edit(p.revision, serde_json::from_value(duplicate).unwrap())
        .is_err());
    assert_eq!(serde_json::to_value(summary(&session)).unwrap(), state);
    assert_eq!(bytes(&session), preserved);
    let stale = update(&p, 1, "E".repeat(64), p.bones[1].rotation);
    assert_eq!(
        session
            .edit(p.revision - 1, serde_json::from_value(stale).unwrap())
            .unwrap_err()
            .code,
        "ProjectChanged"
    );
    assert_eq!(serde_json::to_value(summary(&session)).unwrap(), state);
    assert_eq!(bytes(&session), preserved);
}

#[test]
fn string_form_owner_delete_index_reuse_and_attachment_path_tag_remap_follow_stable_ids() {
    let (_directory, session, _, _) = open();
    let p = summary(&session);
    let source = bytes(&session);
    let deleted = p.bones[3].id;
    let survivor = p.bones[4].id;
    command(&session, json!({"type":"delete","id":deleted}));
    let p = summary(&session);
    assert_eq!(p.bones[3].id, survivor);
    assert!(!marker(&model(&session), WireStringOwner::Bone(3), 1));
    command(
        &session,
        json!({"type":"create","parent":p.bones[0].id,"x":0,"y":0,"rotation":0,"length":0}),
    );
    let p = summary(&session);
    assert_ne!(p.bones[4].id, deleted);
    assert!(!marker(&model(&session), WireStringOwner::Bone(4), 1));
    command(&session, json!({"type":"undo"}));
    command(&session, json!({"type":"undo"}));
    assert_eq!(bytes(&session), source);
    assert_eq!(summary(&session).bones[3].id, deleted);
    let p = summary(&session);
    let attachment = p.slots[0].attachments[0].id;
    command(
        &session,
        json!({"type":"renameAttachment","id":attachment,"name":"renamed image"}),
    );
    let address = AttachmentAddress {
        slot: 0,
        attachment: 0,
    };
    let renamed = model(&session);
    assert!(!marker(&renamed, WireStringOwner::Attachment(address), 1));
    assert!(marker(&renamed, WireStringOwner::Attachment(address), 13));
    assert_eq!(renamed.slots[0].attachments[0].image().unwrap().path, "red");
    let conversion = json!({"type":"attachmentEdit","id":attachment,"edit":{"type":"convertMesh","id":p.slots[0].id}});
    let revision = summary(&session).revision;
    let before_conversion = bytes(&session);
    assert_eq!(
        session
            .edit(
                revision,
                serde_json::from_value(conversion.clone()).unwrap()
            )
            .unwrap_err()
            .code,
        "PoseRequired"
    );
    assert_eq!(bytes(&session), before_conversion);
    let frozen = session
        .evaluate(
            revision,
            serde_json::from_value(json!({"mode":"none","time":0})).unwrap(),
        )
        .unwrap();
    session
        .edit_in_pose(
            revision,
            frozen.pose_epoch,
            serde_json::from_value(conversion).unwrap(),
        )
        .unwrap();
    let converted = model(&session);
    assert!(converted.slots[0].attachments[0].mesh().is_some());
    assert!(marker(&converted, WireStringOwner::Attachment(address), 14));
    assert!(!marker(
        &converted,
        WireStringOwner::Attachment(address),
        13
    ));
    roundtrip(&converted);
    command(&session, json!({"type":"undo"}));
    command(&session, json!({"type":"undo"}));
    assert_eq!(bytes(&session), source);
}

#[test]
fn string_form_portable_save_normalizes_only_changed_root_across_history_and_rejects_stale() {
    let (directory, session, source, png) = open();
    let source_payload = bytes(&session);
    let snapshot = session.prepare_save(true).unwrap();
    assert_eq!(bytes(&session), source_payload);
    let p = summary(&session);
    command(&session, update(&p, 2, p.bones[2].name.clone(), 12.));
    let target = directory.path().join("portable/result.fbones");
    std::fs::create_dir_all(target.parent().unwrap()).unwrap();
    std::fs::write(&target, b"existing target").unwrap();
    let before = serde_json::to_value(summary(&session)).unwrap();
    let before_payload = bytes(&session);
    assert_eq!(
        session
            .save_snapshot(snapshot, target.clone())
            .unwrap_err()
            .code,
        "ProjectChanged"
    );
    assert_eq!(std::fs::read(&target).unwrap(), b"existing target");
    assert_eq!(bytes(&session), before_payload);
    assert_eq!(serde_json::to_value(summary(&session)).unwrap(), before);
    session
        .save_snapshot(session.prepare_save(true).unwrap(), target.clone())
        .unwrap();
    let saved = model(&session);
    assert_eq!(saved.images_root, "./images/");
    assert!(!marker(&saved, WireStringOwner::Skeleton, 3));
    for owner in [
        WireStringOwner::Bone(1),
        WireStringOwner::Slot(0),
        WireStringOwner::Bone(3),
    ] {
        assert!(marker(&saved, owner, 1));
    }
    let saved_payload = roundtrip(&saved);
    command(&session, json!({"type":"undo"}));
    let undone = model(&session);
    assert_eq!(undone.images_root, "./images/");
    assert!(!marker(&undone, WireStringOwner::Skeleton, 3));
    assert!(marker(&undone, WireStringOwner::Bone(3), 1));
    roundtrip(&undone);
    command(&session, json!({"type":"redo"}));
    assert_eq!(bytes(&session), saved_payload);
    session.close(false).unwrap();
    session
        .replace(open_document(target).unwrap(), false)
        .unwrap();
    assert_eq!(model(&session), saved);
    for name in
        crate::animation_sequence::all_image_keys(&crate::scene_string_form_fixture::project())
            .unwrap()
    {
        assert_eq!(
            std::fs::read(
                directory
                    .path()
                    .join("source-images")
                    .join(format!("{name}.png"))
            )
            .unwrap(),
            png
        );
        assert_eq!(
            std::fs::read(
                directory
                    .path()
                    .join("portable/images")
                    .join(format!("{name}.png"))
            )
            .unwrap(),
            png
        );
    }
    assert_eq!(
        std::fs::read(directory.path().join("source.spine")).unwrap(),
        source
    );
}
