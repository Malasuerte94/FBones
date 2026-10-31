//! Geometry-preserving existing-library PNG replacement is an explicit FBones
//! policy. Original path-swap resizing/gesture parity remains unknown.
use super::*;

fn image_bytes(width: u32, height: u32, color: [u8; 4]) -> Vec<u8> {
    let mut bytes = vec![];
    {
        let mut encoder = png::Encoder::new(&mut bytes, width, height);
        encoder.set_color(png::ColorType::Rgba);
        let mut writer = encoder.write_header().unwrap();
        writer
            .write_image_data(&color.repeat(width as usize * height as usize))
            .unwrap();
    }
    bytes
}
fn fixture() -> (tempfile::TempDir, Session, ProjectSummary) {
    let (d, s, p) = setup();
    std::fs::write(
        d.path().join("source/wide.png"),
        image_bytes(8, 2, [30, 90, 240, 255]),
    )
    .unwrap();
    std::fs::write(
        d.path().join("source/nested/dot.png.png"),
        image_bytes(3, 9, [240, 50, 30, 255]),
    )
    .unwrap();
    let p = s
        .select_images_folder(p.revision, &d.path().join("source"))
        .unwrap();
    (d, s, p)
}
fn edit(id: u64, path: &str) -> RigEdit {
    RigEdit::SetAttachmentImagePath {
        id,
        path: path.into(),
    }
}
fn assert_unchanged(
    s: &Session,
    p: &ProjectSummary,
    model: &fbones_format::minimal::scene::SceneProject,
) {
    assert_eq!(&scene_model(s), model);
    assert_eq!(
        serde_json::to_value(s.summary().unwrap().unwrap()).unwrap(),
        serde_json::to_value(p).unwrap()
    );
}
fn image_bits(attachment: &SceneAttachment) -> Vec<u32> {
    let r = attachment.image().unwrap();
    let mut bits = [
        r.x, r.y, r.rotation, r.scale_x, r.scale_y, r.width, r.height,
    ]
    .map(f32::to_bits)
    .to_vec();
    if let Some(m) = attachment.mesh() {
        bits.extend(m.uvs.iter().map(|v| v.to_bits()));
    }
    bits.extend(attachment_binding_bits(attachment));
    bits
}

#[test]
fn image_path_region_and_weighted_mesh_all_sizes_keep_geometry_inventory_and_activation() {
    for mesh in [false, true] {
        for active in [None, Some(0), Some(1)] {
            let (_d, s, p) = fixture();
            let p = add_bone(&s, &p, 0);
            let child = p.edited_bone.unwrap();
            let p = s
                .place_images(p.revision, &["A".into()], child, 25., -14.)
                .unwrap();
            let slot = p.slots[0].id;
            let p = s
                .place_attachments(p.revision, &["B".into()], slot)
                .unwrap();
            let id = p.slots[0].attachments[1].id;
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"updateAttachment","id":id,"x":-0.0,"y":7,"rotation":23,"scaleX":1.2,"scaleY":-0.7}),
            );
            let p = if mesh {
                let p = command(
                    &s,
                    &p,
                    serde_json::json!({"type":"attachmentEdit","id":id,"edit":{"type":"convertMesh","id":slot}}),
                );
                let p = command(
                    &s,
                    &p,
                    serde_json::json!({"type":"bindAttachment","id":id,"bones":[child,0]}),
                );
                command(
                    &s,
                    &p,
                    serde_json::json!({"type":"setAttachmentWeight","id":id,"vertex":0,"bone":0,"value":0.37}),
                )
            } else {
                p
            };
            let ids = p.slots[0]
                .attachments
                .iter()
                .map(|a| a.id)
                .collect::<Vec<_>>();
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":active.map(|i|ids[i])}),
            );
            // Pure resource changes do not require/freeze evaluated constraint poses.
            let p = command(
                &s,
                &p,
                serde_json::json!({"type":"addConstraint","constraint":{"type":"physics","name":"retained preview settings","bone":child,"x":1,"wind":20}}),
            );
            let before = scene_model(&s);
            let bits = image_bits(&moved_attachment(&s, id).1);
            let order = inventory_ids(&s);
            let old_world = crate::rig::poses(&before.rig.bones);
            let (owner, a) = moved_attachment(&s, id);
            let points = geometry_points(&a, owner, &old_world);
            let mut expected = before.clone();
            expected.slots[0].attachments[1].image_mut().unwrap().path = "wide".into();
            let p = s.edit(p.revision, edit(id, "wide")).unwrap();
            assert_eq!(scene_model(&s), expected);
            assert_eq!(inventory_ids(&s), order);
            assert_eq!(p.slots[0].active_attachment_id, active.map(|i| ids[i]));
            assert_eq!(image_bits(&moved_attachment(&s, id).1), bits);
            let dto = p.slots[0].attachments[1].region.as_ref().unwrap();
            assert_eq!(dto.image, "wide");
            assert_eq!(dto.image_path, "wide");
            assert_eq!((dto.width, dto.height), (4., 4.));
            let (owner, a) = moved_attachment(&s, id);
            same_world_points(&points, &geometry_points(&a, owner, &old_world));
            let p = s.edit(p.revision, RigEdit::Undo).unwrap();
            assert_eq!(scene_model(&s), before);
            let p = s.edit(p.revision, RigEdit::Redo).unwrap();
            assert_eq!(scene_model(&s), expected);
            assert!(p.slots[0].attachments[1].image_available);
        }
    }
}

#[test]
fn image_path_dotted_keys_raw_empty_and_explicit_name_stay_distinct_without_renaming() {
    let (_d, s, p) = fixture();
    let p = s
        .place_images(p.revision, &["B".into(), "A".into()], 0, 0., 0.)
        .unwrap();
    let id = p.slots[0].attachments[0].id;
    let p = s.edit(p.revision, edit(id, "nested/dot.png")).unwrap();
    assert_eq!(p.slots[0].region.as_ref().unwrap().image, "nested/dot.png");
    assert_eq!(
        p.slots[0].region.as_ref().unwrap().image_path,
        "nested/dot.png"
    );
    let p = s.edit(p.revision, edit(id, "")).unwrap();
    let empty = scene_model(&s);
    let raw = empty.slots[0].attachments[0].image().unwrap();
    assert_eq!(raw.name, "B");
    assert_eq!(raw.path, "");
    assert_eq!(p.slots[0].region.as_ref().unwrap().image, "B");
    assert_eq!(p.slots[0].region.as_ref().unwrap().image_path, "");
    let p = s.edit(p.revision, edit(id, "B")).unwrap();
    let explicit = scene_model(&s);
    assert_ne!(
        encode_scene_payload(&empty).unwrap(),
        encode_scene_payload(&explicit).unwrap()
    );
    assert_eq!(
        decode_scene(&encode_scene_payload(&explicit).unwrap()).unwrap(),
        explicit
    );
    let other = p.slots[1].attachments[0].id;
    let p = s.edit(p.revision, edit(other, "B")).unwrap();
    assert_eq!(p.slots[0].attachments[0].name, "B");
    assert_eq!(p.slots[1].attachments[0].name, "A");
    assert_eq!(
        p.slots[0].region.as_ref().unwrap().image,
        p.slots[1].region.as_ref().unwrap().image
    );
}

#[test]
fn image_path_identical_raw_is_noop_and_does_not_restore_historical_focus_or_history() {
    let (_d, s, p) = fixture();
    let p = s
        .place_images(p.revision, &["A".into(), "B".into()], 0, 0., 0.)
        .unwrap();
    let a = p.slots[0].attachments[0].id;
    let b = p.slots[1].attachments[0].id;
    let p = s.edit(p.revision, edit(b, "wide")).unwrap();
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"updateAttachment","id":a,"x":11,"y":7,"rotation":0,"scaleX":1,"scaleY":1}),
    );
    assert_eq!(p.edited_attachment, Some(a));
    let before = scene_model(&s);
    let same = s.edit(p.revision, edit(b, "wide")).unwrap();
    assert_eq!(
        serde_json::to_value(&same).unwrap(),
        serde_json::to_value(&p).unwrap()
    );
    assert_unchanged(&s, &p, &before);
    let _p = s.edit(p.revision, RigEdit::Undo).unwrap();
    let model = scene_model(&s);
    assert_eq!(model.slots[1].attachments[0].image().unwrap().path, "wide");
    assert_ne!(model.slots[0].attachments[0].image().unwrap().x, 11.);
}

#[test]
fn image_path_missing_malformed_stale_wrong_type_and_pose_epoch_requests_are_atomic() {
    let (d, s, p) = fixture();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 0., 0.)
        .unwrap();
    let id = p.slots[0].attachments[0].id;
    // A valid filesystem PNG is insufficient until loaded into the current library.
    std::fs::write(d.path().join("source/late.png"), png()).unwrap();
    let before = scene_model(&s);
    for path in [
        "absent",
        "a",
        "A.png",
        "late",
        "../A",
        "/A",
        "C:/A",
        "nested\\C",
        "CON",
        "A ",
        "nested//C",
    ] {
        assert!(
            s.edit(p.revision, edit(id, path)).is_err(),
            "unexpected key acceptance: {path}"
        );
        assert_unchanged(&s, &p, &before);
    }
    assert_eq!(
        s.edit(p.revision, edit(id, "absent")).unwrap_err().code,
        "MissingImage"
    );
    assert!(s.edit(p.revision, edit(u64::MAX, "wide")).is_err());
    assert_unchanged(&s, &p, &before);
    assert_eq!(
        s.edit(p.revision - 1, edit(id, "wide")).unwrap_err().code,
        "ProjectChanged"
    );
    assert_unchanged(&s, &p, &before);
    assert_eq!(
        s.edit_in_pose(p.revision, 123, edit(id, "wide"))
            .unwrap_err()
            .code,
        "InvalidPose"
    );
    assert_unchanged(&s, &p, &before);
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"renameAttachment","id":id,"name":"no PNG named this"}),
    );
    let before = scene_model(&s);
    assert!(s.edit(p.revision, edit(id, "")).is_err());
    assert_unchanged(&s, &p, &before);
    let (_d, s, p) = inactive_weighted_clip_fixture();
    let clip = p.slots[0].attachments[0].id;
    let before = scene_model(&s);
    assert!(s.edit(p.revision, edit(clip, "A")).is_err());
    assert_unchanged(&s, &p, &before);
}

#[test]
fn image_path_save_as_undo_retains_old_and_new_pngs_without_original_folder_and_reopens_raw_path() {
    let (d, s, p) = fixture();
    let p = s
        .place_images(p.revision, &["A".into()], 0, 10., 20.)
        .unwrap();
    let slot = p.slots[0].id;
    let p = s
        .place_attachments(p.revision, &["B".into()], slot)
        .unwrap();
    let b = p.slots[0].attachments[1].id;
    let p = command(
        &s,
        &p,
        serde_json::json!({"type":"setActiveAttachment","slot":slot,"attachment":p.slots[0].attachments[0].id}),
    );
    let before = scene_model(&s);
    let stale = s.prepare_save(true).unwrap();
    let _p = s.edit(p.revision, edit(b, "nested/dot.png")).unwrap();
    assert!(s
        .save_snapshot(stale, d.path().join("stale.fbones"))
        .is_err());
    assert!(!d.path().join("stale.fbones").exists());
    let saved = s
        .save_snapshot(
            s.prepare_save(true).unwrap(),
            d.path().join("portable/edited.fbones"),
        )
        .unwrap();
    for (key, expected) in [
        ("A", png()),
        ("B", png()),
        ("nested/dot.png", image_bytes(3, 9, [240, 50, 30, 255])),
    ] {
        assert_eq!(
            std::fs::read(d.path().join(format!("portable/images/{key}.png"))).unwrap(),
            expected
        );
    }
    let Document::Editable { project, .. } =
        open_document(PathBuf::from(saved.path.clone().unwrap())).unwrap()
    else {
        panic!("editable image swap")
    };
    assert_eq!(
        project.slots[0].attachments[1].image().unwrap().path,
        "nested/dot.png"
    );
    assert_eq!(project.slots[0].active_attachment, Some(0));
    std::fs::remove_dir_all(d.path().join("source")).unwrap();
    let p = s.edit(saved.revision, RigEdit::Undo).unwrap();
    let mut expected = before;
    expected.images_root = "./images/".into();
    assert_eq!(scene_model(&s), expected);
    assert!(p.slots[0].attachments[1].image_available);
    let p = s.edit(p.revision, RigEdit::Redo).unwrap();
    assert!(p.slots[0].attachments[1].image_available);
    let p = s.edit(p.revision, edit(b, "")).unwrap();
    let saved = s
        .save_snapshot(
            s.prepare_save(true).unwrap(),
            d.path().join("second/empty.fbones"),
        )
        .unwrap();
    assert!(saved.revision >= p.revision);
    let Document::Editable { project, .. } =
        open_document(PathBuf::from(saved.path.unwrap())).unwrap()
    else {
        panic!("editable fallback")
    };
    assert_eq!(project.slots[0].attachments[1].image().unwrap().path, "");
    assert_eq!(project.slots[0].attachments[1].name(), "B");
}
