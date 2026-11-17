//! Production PSD decoding plus real Session/resource/history/Save semantics.
use super::*;
use fbones_format::minimal::scene::{
    decode_scene, encode_scene, encode_scene_payload, SceneProject,
};

fn model(session: &Session) -> SceneProject {
    let state = session.lock().unwrap();
    let Some(Document::Editable { project, .. }) = &state.document else {
        panic!("editable")
    };
    (**project).clone()
}
fn current(session: &Session) -> ProjectSummary {
    session.summary().unwrap().unwrap()
}
type SessionSnapshot = (serde_json::Value, Vec<u8>, Vec<(String, Vec<u8>)>);
fn snapshot(session: &Session) -> SessionSnapshot {
    let summary = serde_json::to_value(current(session)).unwrap();
    let payload = encode_scene_payload(&model(session)).unwrap();
    let state = session.lock().unwrap();
    let Some(Document::Editable { images, .. }) = &state.document else {
        panic!("editable")
    };
    let assets = images
        .entries()
        .map(|(key, asset)| (key.clone(), asset.bytes().to_vec()))
        .collect();
    (summary, payload, assets)
}
fn fixture(directory: &Path) -> PathBuf {
    let path = directory.join("own-layers.psd");
    std::fs::write(&path, crate::psd::fixtures::fixture()).unwrap();
    path
}
fn rgba(bytes: &[u8]) -> Vec<u8> {
    let mut reader = png::Decoder::new(std::io::Cursor::new(bytes))
        .read_info()
        .unwrap();
    let mut pixels = vec![0; reader.output_buffer_size().unwrap()];
    let info = reader.next_frame(&mut pixels).unwrap();
    pixels.truncate(info.buffer_size());
    pixels
}

#[test]
fn psd_batch_preserves_local_collage_order_hidden_opacity_and_one_history_transaction() {
    let directory = tempfile::tempdir().unwrap();
    let input = fixture(directory.path());
    let source = std::fs::read(&input).unwrap();
    let session = Session::default();
    let initial = session
        .replace(new_document("PSD collage".into()).unwrap(), true)
        .unwrap();
    let transformed = session
        .edit(
            initial.revision,
            RigEdit::Update {
                id: initial.bones[0].id,
                name: "root".into(),
                x: 30.,
                y: -17.,
                rotation: 35.,
                length: 0.,
                scale_x: Some(-2.),
                scale_y: Some(0.75),
                shear_x: Some(11.),
                shear_y: Some(-9.),
            },
        )
        .unwrap();
    let before = model(&session);
    let imported = session
        .import_psd(transformed.revision, transformed.bones[0].id, &input)
        .unwrap();
    assert_eq!(imported.revision, transformed.revision + 1);
    assert!(imported.dirty && imported.can_undo);
    let expected = model(&session);
    assert_eq!(
        expected.rig, before.rig,
        "import never changes/samples the owner"
    );
    assert_eq!(expected.animations, before.animations);
    assert_eq!(expected.constraints, before.constraints);
    assert_eq!(
        expected
            .slots
            .iter()
            .map(|s| s.name.as_str())
            .collect::<Vec<_>>(),
        ["Back", "Front", "Hidden"]
    );
    assert_eq!(expected.slots[0].active_attachment, Some(0));
    assert_eq!(expected.slots[1].active_attachment, Some(0));
    assert_eq!(expected.slots[2].active_attachment, None);
    assert_eq!(expected.slots[1].color, [255, 255, 255, 128]);
    let vectors = [
        (0., 0., 100., 80.),
        (-20., 20., 20., 20.),
        (-51., 30., 4., 6.),
    ];
    for (slot, (x, y, width, height)) in expected.slots.iter().zip(vectors) {
        let region = slot.attachments[0].image().unwrap();
        assert_eq!(
            (region.x, region.y, region.width, region.height),
            (x, y, width, height)
        );
        assert_eq!(
            (region.rotation, region.scale_x, region.scale_y),
            (0., 1., 1.)
        );
        assert_eq!(slot.bone, 0);
    }
    {
        let state = session.lock().unwrap();
        let Some(Document::Editable { images, .. }) = &state.document else {
            panic!("editable")
        };
        let blue = images.get("Front").unwrap();
        assert_eq!(
            &rgba(blue.bytes())[..4],
            &[0, 0, 255, 255],
            "opacity must not also be baked into PNG alpha"
        );
        assert!(
            images.get("Hidden").is_some(),
            "inactive layers remain resources"
        );
    }
    assert_eq!(
        expected
            .attachment_order
            .iter()
            .map(|a| (a.slot, a.attachment))
            .collect::<Vec<_>>(),
        [(0, 0), (1, 0), (2, 0)]
    );
    let undone = session.edit(imported.revision, RigEdit::Undo).unwrap();
    assert_eq!(
        model(&session),
        before,
        "one Undo removes the complete import"
    );
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(model(&session), expected);
    assert_eq!(
        serde_json::to_value(&redone.slots).unwrap(),
        serde_json::to_value(&imported.slots).unwrap(),
        "stable IDs survive Redo"
    );
    let destination = directory.path().join("portable/own.fbones");
    std::fs::create_dir(destination.parent().unwrap()).unwrap();
    let saved = session
        .save_snapshot(session.prepare_save(true).unwrap(), destination.clone())
        .unwrap();
    assert!(!saved.dirty && saved.path.is_some());
    let encoded = std::fs::read(&destination).unwrap();
    let envelope = ProjectEnvelope::inspect(encoded).unwrap();
    assert_eq!(
        decode_scene(&envelope.decoded_payload().unwrap()).unwrap(),
        expected
    );
    assert_eq!(std::fs::read(&input).unwrap(), source);
    assert_eq!(
        std::fs::read(directory.path().join("portable/images/Front.png")).unwrap(),
        {
            let state = session.lock().unwrap();
            let Some(Document::Editable { images, .. }) = &state.document else {
                panic!("editable")
            };
            images.get("Front").unwrap().bytes().to_vec()
        }
    );
    session.close(false).unwrap();
    let reopened = session
        .replace(open_document(destination).unwrap(), false)
        .unwrap();
    assert!(!reopened.dirty && !reopened.inspection_only);
    assert_eq!(model(&session), expected);
    assert!(
        reopened.slots[2].attachments[0].image_available,
        "hidden inventory resources reopen too"
    );
}

#[test]
fn psd_rejections_preserve_scene_cache_ids_revision_and_history() {
    let directory = tempfile::tempdir().unwrap();
    let input = fixture(directory.path());
    let session = Session::default();
    let initial = session
        .replace(new_document("PSD rejects".into()).unwrap(), true)
        .unwrap();
    let baseline = snapshot(&session);
    assert_eq!(
        session
            .import_psd(initial.revision + 1, initial.bones[0].id, &input)
            .unwrap_err()
            .code,
        "ProjectChanged"
    );
    assert_eq!(snapshot(&session), baseline);
    assert!(session
        .import_psd(initial.revision, u64::MAX, &input)
        .is_err());
    assert_eq!(snapshot(&session), baseline);
    let bad = directory.path().join("broken.psd");
    std::fs::write(&bad, [b'8', b'B', b'P', b'S']).unwrap();
    assert!(session
        .import_psd(initial.revision, initial.bones[0].id, &bad)
        .is_err());
    assert_eq!(snapshot(&session), baseline);
    let p = session
        .select_images_folder(initial.revision, directory.path())
        .unwrap();
    let external = snapshot(&session);
    assert_eq!(
        session
            .import_psd(p.revision, p.bones[0].id, &input)
            .unwrap_err()
            .code,
        "PsdImagesRoot"
    );
    assert_eq!(snapshot(&session), external);
    assert_eq!(
        std::fs::read(&input).unwrap(),
        crate::psd::fixtures::fixture()
    );
    assert!(
        !directory.path().join("images").exists(),
        "failed imports never publish PNGs to disk"
    );
}

#[test]
fn psd_cache_keys_do_not_replace_existing_assets_and_save_collision_stays_dirty() {
    let directory = tempfile::tempdir().unwrap();
    let input = fixture(directory.path());
    let session = Session::default();
    let p = session
        .replace(new_document("PSD collision".into()).unwrap(), true)
        .unwrap();
    let first = session
        .import_psd(p.revision, p.bones[0].id, &input)
        .unwrap();
    let first_model = model(&session);
    let second = session
        .import_psd(first.revision, first.bones[0].id, &input)
        .unwrap();
    let second_model = model(&session);
    assert_eq!(&second_model.slots[..3], first_model.slots);
    assert_eq!(second.slots.len(), 6);
    let keys = second
        .library
        .images
        .iter()
        .map(|a| a.key.as_str())
        .collect::<std::collections::HashSet<_>>();
    assert_eq!(keys.len(), 6);
    let undone = session.edit(second.revision, RigEdit::Undo).unwrap();
    assert_eq!(model(&session), first_model);
    session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(model(&session), second_model);
    let target = directory.path().join("destination");
    std::fs::create_dir_all(target.join("images")).unwrap();
    std::fs::write(
        target.join("images/Back.png"),
        crate::images::tests::png([1, 2, 3, 255]),
    )
    .unwrap();
    let source = std::fs::read(target.join("images/Back.png")).unwrap();
    let before = snapshot(&session);
    assert!(session
        .save_snapshot(
            session.prepare_save(true).unwrap(),
            target.join("own.fbones")
        )
        .is_err());
    assert_eq!(snapshot(&session), before);
    assert!(!target.join("own.fbones").exists());
    assert_eq!(
        std::fs::read(target.join("images/Back.png")).unwrap(),
        source
    );
}

#[test]
fn psd_slot_capacity_failure_never_installs_staged_resources_or_history() {
    let directory = tempfile::tempdir().unwrap();
    let input = fixture(directory.path());
    let mut project = crate::scene_slot_capacity_fixture::project(512, false);
    project.images_root = "./images/".into();
    let path = directory.path().join("full.fbones");
    std::fs::write(&path, encode_scene(&project).unwrap()).unwrap();
    let session = Session::default();
    let p = session
        .replace(open_document(path).unwrap(), false)
        .unwrap();
    assert!(!p.inspection_only);
    let before = snapshot(&session);
    let error = session
        .import_psd(p.revision, p.bones[0].id, &input)
        .unwrap_err();
    assert_eq!(error.code, "InvalidPsd");
    assert!(error.message.contains("slot limit"));
    assert_eq!(snapshot(&session), before);
}

#[test]
fn psd_late_animation_order_guard_rolls_back_all_staged_pngs_and_ids() {
    let directory = tempfile::tempdir().unwrap();
    let input = fixture(directory.path());
    let mut project = crate::scene_slot_capacity_fixture::project(3, true);
    project.images_root = "./images/".into();
    let source = encode_scene(&project).unwrap();
    let path = directory.path().join("keyed.fbones");
    std::fs::create_dir(directory.path().join("images")).unwrap();
    for key in crate::animation_sequence::all_image_keys(&project).unwrap() {
        std::fs::write(
            directory.path().join("images").join(format!("{key}.png")),
            crate::images::tests::png([40, 50, 60, 255]),
        )
        .unwrap();
    }
    std::fs::write(&path, &source).unwrap();
    let session = Session::default();
    let p = session
        .replace(open_document(path.clone()).unwrap(), false)
        .unwrap();
    let before = snapshot(&session);
    let error = session
        .import_psd(p.revision, p.bones[0].id, &input)
        .unwrap_err();
    assert!(error.message.contains("draw-order"));
    assert_eq!(
        snapshot(&session),
        before,
        "even encoder/remap-stage failure publishes no scene/resources/IDs"
    );
    assert_eq!(std::fs::read(path).unwrap(), source);
    assert!(!directory.path().join("images/Back.png").exists());
}
