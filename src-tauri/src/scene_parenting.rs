//! Atomic own parenting policy; original P group/slot allocation is unknown.
use super::*;
use std::collections::HashSet;

pub(super) fn apply(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    ids: &mut Ids,
    bones: &[u64],
    attachments: &[u64],
    parent: u64,
    world: &[Pose],
) -> Result<(), AppError> {
    if bones.len() > MAX_SCENE_BONES
        || attachments.len() > 512
        || (bones.is_empty() && attachments.is_empty())
    {
        return Err(invalid("Choose a bounded bone or attachment selection."));
    }
    let target = next.bone_index(parent)?;
    let mut chosen_bones = HashSet::new();
    for id in bones {
        let index = next.bone_index(*id)?;
        if index == 0 || !chosen_bones.insert(index) {
            return Err(invalid("Choose distinct non-root bones."));
        }
    }
    let mut chosen_attachments = HashSet::new();
    for id in attachments {
        next.attachment_address(*id)?;
        if !chosen_attachments.insert(*id) {
            return Err(invalid("Choose distinct attachment identities."));
        }
    }
    let top = (0..next.project.rig.bones.len())
        .filter(|i| chosen_bones.contains(i))
        .filter(|i| {
            let mut ancestor = next.project.rig.bones[*i].parent;
            while let Some(p) = ancestor {
                if chosen_bones.contains(&p) {
                    return false;
                }
                ancestor = next.project.rig.bones[p].parent;
            }
            true
        })
        .collect::<Vec<_>>();
    for source in &top {
        let mut ancestor = Some(target);
        while let Some(p) = ancestor {
            if p == *source {
                return Err(invalid(
                    "A selected bone cannot be parented inside its own subtree.",
                ));
            }
            ancestor = next.project.rig.bones[p].parent;
        }
    }
    let split_count = next
        .project
        .slots
        .iter()
        .enumerate()
        .filter(|(i, slot)| {
            let selected = next.attachment_ids[*i]
                .iter()
                .filter(|id| chosen_attachments.contains(id))
                .count();
            slot.bone != target && selected > 0 && selected < slot.attachments.len()
        })
        .count();
    let slot_limit = fbones_format::minimal::scene::MAX_SCENE_SLOTS;
    if next.project.slots.len() + split_count > slot_limit {
        return Err(invalid(&format!(
            "This profile supports at most {slot_limit} slots."
        )));
    }
    let old_slot_ids = next.slot_ids.clone();
    let traversal = next
        .project
        .attachment_order
        .iter()
        .map(|a| next.attachment_ids[a.slot][a.attachment])
        .collect::<Vec<_>>();
    let selected_focus = traversal
        .iter()
        .copied()
        .find(|id| chosen_attachments.contains(id));
    if let Some(id) = selected_focus {
        let a = next.attachment_address(id)?;
        before.focus = SceneFocus {
            bone: next.bone_ids[next.project.slots[a.slot].bone],
            slot: Some(next.slot_ids[a.slot]),
            attachment: Some(id),
            ..Default::default()
        };
    } else if let Some(i) = top.first() {
        before.focus = SceneFocus {
            bone: next.bone_ids[*i],
            ..Default::default()
        };
    }

    let mut used_names = next
        .project
        .slots
        .iter()
        .map(|s| s.name.clone())
        .collect::<HashSet<_>>();
    let old_slots = std::mem::take(&mut next.project.slots);
    let old_attachment_ids = std::mem::take(&mut next.attachment_ids);
    let mut slots = Vec::with_capacity(old_slots.len() + split_count);
    let mut slot_ids = Vec::with_capacity(slots.capacity());
    let mut attachment_ids = Vec::with_capacity(slots.capacity());
    for (i, (mut slot, inventory)) in old_slots.into_iter().zip(old_attachment_ids).enumerate() {
        let selected = inventory
            .iter()
            .filter(|id| chosen_attachments.contains(id))
            .count();
        if selected == 0 || slot.bone == target {
            slots.push(slot);
            slot_ids.push(old_slot_ids[i]);
            attachment_ids.push(inventory);
            continue;
        }
        let old_owner = slot.bone;
        if selected == slot.attachments.len() {
            for attachment in &mut slot.attachments {
                super::reparent_attachment(attachment, old_owner, target, world)?;
            }
            slot.bone = target;
            slots.push(slot);
            slot_ids.push(old_slot_ids[i]);
            attachment_ids.push(inventory);
            continue;
        }
        let base = format!("{}_parent", slot.name.chars().take(108).collect::<String>());
        let name = super::super::unique_name(&base, used_names.iter().map(String::as_str));
        used_names.insert(name.clone());
        let new_id = super::super::allocate(&mut ids.slot)?;
        let old_active = slot.active_attachment.map(|index| inventory[index]);
        let mut kept = vec![];
        let mut moved = vec![];
        let mut kept_ids = vec![];
        let mut moved_ids = vec![];
        for (mut attachment, id) in std::mem::take(&mut slot.attachments)
            .into_iter()
            .zip(inventory)
        {
            if chosen_attachments.contains(&id) {
                super::reparent_attachment(&mut attachment, old_owner, target, world)?;
                moved.push(attachment);
                moved_ids.push(id);
            } else {
                kept.push(attachment);
                kept_ids.push(id);
            }
        }
        slot.attachments = kept;
        slot.active_attachment = old_active.and_then(|id| kept_ids.iter().position(|v| *v == id));
        let destination = SceneSlot {
            name,
            bone: target,
            color: slot.color,
            blend: slot.blend,
            attachments: moved,
            active_attachment: old_active.and_then(|id| moved_ids.iter().position(|v| *v == id)),
        };
        slots.push(slot);
        slot_ids.push(old_slot_ids[i]);
        attachment_ids.push(kept_ids);
        slots.push(destination);
        slot_ids.push(new_id);
        attachment_ids.push(moved_ids);
    }
    let new_slot_index = old_slot_ids
        .iter()
        .map(|id| slot_ids.iter().position(|v| v == id).unwrap())
        .collect::<Vec<_>>();
    for slot in &mut slots {
        for attachment in &mut slot.attachments {
            if let Some(clip) = attachment.clipping_mut() {
                clip.end_slot = clip
                    .end_slot
                    .map(|old| {
                        new_slot_index
                            .get(old)
                            .copied()
                            .ok_or_else(|| invalid("A clipping endpoint no longer exists."))
                    })
                    .transpose()?;
            }
        }
    }
    next.project.slots = slots;
    next.slot_ids = slot_ids;
    next.attachment_ids = attachment_ids;
    next.project.attachment_order = traversal
        .into_iter()
        .map(|id| next.attachment_address(id))
        .collect::<Result<Vec<_>, _>>()?;

    let mut moved = false;
    for source in top {
        if next.project.rig.bones[source].parent == Some(target) {
            continue;
        }
        let bone = &mut next.project.rig.bones[source];
        bone.parent = Some(target);
        set_pose(bone, world[target], world[source])?;
        moved = true;
    }
    if moved {
        fn visit(i: usize, bones: &[Bone], out: &mut Vec<usize>) {
            out.push(i);
            for child in 0..bones.len() {
                if bones[child].parent == Some(i) {
                    visit(child, bones, out);
                }
            }
        }
        let mut order = vec![];
        visit(0, &next.project.rig.bones, &mut order);
        if order.len() != next.project.rig.bones.len() {
            return Err(invalid(
                "The selected parenting graph is not a rooted tree.",
            ));
        }
        let mut map = vec![0; order.len()];
        for (new, old) in order.iter().enumerate() {
            map[*old] = new;
        }
        next.project.rig.bones = order
            .iter()
            .map(|old| {
                let mut b = next.project.rig.bones[*old].clone();
                b.parent = b.parent.map(|p| map[p]);
                b
            })
            .collect();
        next.bone_ids = order.iter().map(|old| next.bone_ids[*old]).collect();
    }
    next.focus = SceneFocus {
        bone: parent,
        ..Default::default()
    };
    if let Some(id) = selected_focus {
        let a = next.attachment_address(id)?;
        next.focus.slot = Some(next.slot_ids[a.slot]);
        next.focus.attachment = Some(id);
    }
    Ok(())
}
