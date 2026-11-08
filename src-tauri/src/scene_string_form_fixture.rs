//! Own known string bodies in both accepted forms; no private text or assets.
use fbones_format::minimal::{scene::*, Bone};

pub(crate) const SOURCE_IMAGES: &str = "./source-images";
pub(crate) fn project() -> SceneProject {
    let mut p = crate::scene_partial_translate_fixture::project();
    p.rig.name = "Own lexical string forms".into();
    p.images_root = SOURCE_IMAGES.into();
    p.rig.bones[1].name = "A".repeat(64);
    p.slots[0].name = p.rig.bones[1].name.clone();
    for character in ['B', 'C'] {
        let mut bone = Bone::root();
        bone.name = character.to_string().repeat(64);
        bone.parent = Some(0);
        p.rig.bones.push(bone);
    }
    // Name and explicit path share a marked body. Renaming the attachment
    // must retain the old resource/path marker while retiring its name marker.
    p.slots[0].attachments[0].image_mut().unwrap().path = "red".into();
    let fields = [
        (WireStringOwner::Bone(1), 1, 100),
        (WireStringOwner::Slot(0), 1, 100),
        (WireStringOwner::Bone(3), 1, 101),
        (WireStringOwner::Skeleton, 3, 102),
        (
            WireStringOwner::Attachment(AttachmentAddress {
                slot: 0,
                attachment: 0,
            }),
            1,
            103,
        ),
        (
            WireStringOwner::Attachment(AttachmentAddress {
                slot: 0,
                attachment: 0,
            }),
            13,
            103,
        ),
    ];
    for (owner, tag, group) in fields {
        let source_text = string_field_value(&p, &owner, tag).unwrap().to_owned();
        let strings = &mut p.wire.as_mut().unwrap().strings;
        strings.retain(|s| s.owner != owner || s.tag != tag);
        strings.push(WireStringAlias {
            owner,
            tag,
            group,
            encoding: Some(WireStringEncoding {
                form: WireStringForm::Utf8Length,
                source_text,
            }),
        });
    }
    // Bone4's C×64 is deliberately unmarked old-canonical terminated ASCII.
    normalize_wire_strings(&mut p).unwrap();
    p
}
