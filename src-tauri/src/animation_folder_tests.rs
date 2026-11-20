use crate::{
    project::{new_document, open_document, Document, Session},
    rig::RigEdit,
};
use fbones_format::{
    minimal::scene::{
        encode_scene, Animation, AnimationFolder, AnimationFolderEntry, AnimationFolderLayout,
    },
    ProjectEnvelope,
};

#[test]
fn foldered_clip_lifecycle_preserves_qualified_names_and_independent_order() {
    let directory = tempfile::tempdir().unwrap();
    let source = directory.path().join("own-folders.spine");
    let Document::Editable { mut project, .. } = new_document("Folder lifecycle".into()).unwrap()
    else {
        panic!("new project is editable");
    };
    project.animations = ["initial", "stride", "run"]
        .map(|name| Animation::new(name.into()))
        .into();
    project.animation_folders = Some(AnimationFolderLayout {
        entries: vec![
            AnimationFolderEntry::Folder(AnimationFolder {
                name: "movement".into(),
                clips: vec![2, 1],
            }),
            AnimationFolderEntry::Clip(0),
        ],
    });
    let original = encode_scene(&project).unwrap();
    std::fs::write(&source, &original).unwrap();
    let session = Session::default();
    let opened = session
        .replace(open_document(source.clone()).unwrap(), false)
        .unwrap();
    assert!(!opened.inspection_only);
    let initial = opened.animations[0].id;
    let stride = opened.animations[1].id;
    assert_eq!(opened.animations[1].name, "movement/stride");
    assert_eq!(opened.animations[1].folder.as_deref(), Some("movement"));
    assert_eq!(opened.animations[0].folder, None);

    let renamed = session
        .edit(
            opened.revision,
            RigEdit::RenameAnimation {
                id: stride,
                name: "movement/walk".into(),
            },
        )
        .unwrap();
    assert_eq!(renamed.animations[1].id, stride);
    assert_eq!(renamed.animations[1].name, "movement/walk");
    for operation in [
        RigEdit::CreateAnimation {
            name: "movement/walk".into(),
        },
        RigEdit::RenameAnimation {
            id: stride,
            name: "other/walk".into(),
        },
    ] {
        assert!(session.edit(renamed.revision, operation).is_err());
    }
    assert_eq!(
        session.summary().unwrap().unwrap().revision,
        renamed.revision
    );

    let duplicated = session
        .edit(
            renamed.revision,
            RigEdit::DuplicateAnimation {
                id: stride,
                name: "movement/walk copy".into(),
            },
        )
        .unwrap();
    assert_ne!(duplicated.animations[3].id, stride);
    assert_eq!(duplicated.animations[3].folder.as_deref(), Some("movement"));
    let removed = session
        .edit(
            duplicated.revision,
            RigEdit::DeleteAnimation { id: initial },
        )
        .unwrap();
    assert_eq!(removed.animations[0].id, stride);
    let undone = session.edit(removed.revision, RigEdit::Undo).unwrap();
    assert_eq!(undone.animations[1].id, stride);
    let redone = session.edit(undone.revision, RigEdit::Redo).unwrap();
    assert_eq!(redone.animations[0].id, stride);

    let root = session
        .edit(
            redone.revision,
            RigEdit::CreateAnimation {
                name: "walk".into(),
            },
        )
        .unwrap();
    assert_eq!(root.animations[3].name, "walk");
    assert_eq!(root.animations[3].folder, None);
    let target = directory.path().join("own-folders.fbones");
    session
        .save_snapshot(session.prepare_save(true).unwrap(), target.clone())
        .unwrap();
    let envelope = ProjectEnvelope::inspect(std::fs::read(&target).unwrap()).unwrap();
    let saved =
        fbones_format::minimal::scene::decode_scene(&envelope.decoded_payload().unwrap()).unwrap();
    assert_eq!(
        saved
            .animations
            .iter()
            .map(|clip| clip.name.as_str())
            .collect::<Vec<_>>(),
        ["walk", "run", "walk copy", "walk"]
    );
    assert_eq!(
        saved.animation_folders.unwrap().entries,
        [
            AnimationFolderEntry::Folder(AnimationFolder {
                name: "movement".into(),
                clips: vec![1, 0, 2],
            }),
            AnimationFolderEntry::Clip(3),
        ]
    );
    session.close(false).unwrap();
    let reopened = session
        .replace(open_document(target).unwrap(), false)
        .unwrap();
    assert!(!reopened.inspection_only && !reopened.dirty);
    assert_eq!(
        reopened
            .animations
            .iter()
            .map(|clip| clip.name.as_str())
            .collect::<Vec<_>>(),
        [
            "movement/walk",
            "movement/run",
            "movement/walk copy",
            "walk"
        ]
    );
    assert_eq!(std::fs::read(source).unwrap(), original);
}
