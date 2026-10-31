use super::*;

#[test]
fn world_image_batch_uses_the_published_evaluated_owner_and_rejects_missing_stale_or_invalid_pose()
{
    let dir = tempfile::tempdir().unwrap();
    let mut bytes = vec![];
    {
        let mut encoder = png::Encoder::new(&mut bytes, 4, 4);
        encoder.set_color(png::ColorType::Rgba);
        encoder
            .write_header()
            .unwrap()
            .write_image_data(&[255; 64])
            .unwrap();
    }
    for name in ["A", "B"] {
        std::fs::write(dir.path().join(format!("{name}.png")), &bytes).unwrap();
    }
    let session = Session::default();
    let p = session
        .replace(new_document("placement".into()).unwrap(), true)
        .unwrap();
    let p = session
        .select_images_folder(p.revision, dir.path())
        .unwrap();
    let p = session.edit(p.revision, serde_json::from_value(serde_json::json!({"type":"create","parent":0,"x":30,"y":40,"rotation":0,"length":60})).unwrap()).unwrap();
    let bone = p.edited_bone.unwrap();
    let p = session.edit(p.revision, serde_json::from_value(serde_json::json!({"type":"addConstraint","constraint":{"type":"ik","name":"aim","bones":[bone],"target":0,"mix":1}})).unwrap()).unwrap();
    let before = serde_json::to_value(&p).unwrap();
    let keys = vec!["A".into(), "B".into()];
    assert_eq!(
        session
            .place_images(p.revision, &keys, bone, 100.0, 200.0)
            .unwrap_err()
            .code,
        "PoseRequired"
    );
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        before
    );
    let snapshot = session
        .evaluate(
            p.revision,
            serde_json::from_value(serde_json::json!({"mode":"replay","time":0})).unwrap(),
        )
        .unwrap();
    let owner = snapshot.bones.iter().find(|b| b.id == bone).unwrap().world;
    assert!(owner.b.abs() > 0.1, "IK really changed the owner basis");
    assert!(session
        .place_images_in_pose(
            p.revision,
            &keys,
            bone,
            f32::NAN,
            200.0,
            Some(snapshot.pose_epoch)
        )
        .is_err());
    assert_eq!(
        serde_json::to_value(session.summary().unwrap().unwrap()).unwrap(),
        before
    );
    let placed = session
        .place_images_in_pose(
            p.revision,
            &keys,
            bone,
            100.0,
            200.0,
            Some(snapshot.pose_epoch),
        )
        .unwrap();
    assert_eq!(placed.slots.len(), 2);
    assert_eq!(
        serde_json::to_value(&placed.bones).unwrap(),
        serde_json::to_value(&p.bones).unwrap()
    );
    for (index, slot) in placed.slots.iter().enumerate() {
        let r = slot.region.as_ref().unwrap();
        let x = owner.x + owner.a * r.x + owner.c * r.y;
        let y = owner.y + owner.b * r.x + owner.d * r.y;
        assert!((x - (100.0 + index as f32 * 20.0)).abs() < 0.0001);
        assert!((y - 200.0).abs() < 0.0001);
    }
    assert_eq!(
        session
            .place_images_in_pose(
                placed.revision,
                &keys,
                bone,
                0.0,
                0.0,
                Some(snapshot.pose_epoch)
            )
            .unwrap_err()
            .code,
        "StalePose"
    );
    let undone = session.edit(placed.revision, RigEdit::Undo).unwrap();
    assert!(undone.slots.is_empty());
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(
        serde_json::to_value(redone.slots).unwrap(),
        serde_json::to_value(placed.slots).unwrap()
    );
}
