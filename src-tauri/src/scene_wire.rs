//! Reconcile known wire metadata through native stable identities after an edit.
//! This retains serialization provenance, never an original byte/template cache.
use crate::{project::AppError, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{
    animation_layout, canonical_constraint_declarations, materialize_wire, normalize_wire_strings,
    AttachmentAddress, Constraint, ConstraintTimeline, SceneAttachment, SlotTimeline,
    WireAnimationGroup, WireAnimationLayout, WireAnimationOwner, WireConstraintChannel,
    WireConstraintDeclarations, WireStringOwner, WireTrack,
};
use std::collections::HashSet;

#[cfg(test)]
#[path = "scene_wire_mixed_tests.rs"]
mod mixed_tests;
#[cfg(test)]
#[path = "scene_source_attachment_tests.rs"]
mod source_attachment_tests;
#[cfg(test)]
#[path = "scene_wire_tests.rs"]
mod tests;

struct Remap<'a> {
    before: &'a SceneFrame,
    next: &'a SceneFrame,
}
fn index(old: usize, before: &[u64], next: &[u64]) -> Option<usize> {
    let id = before.get(old)?;
    next.iter().position(|candidate| candidate == id)
}
impl Remap<'_> {
    fn bone(&self, old: usize) -> Option<usize> {
        index(old, &self.before.bone_ids, &self.next.bone_ids)
    }
    fn slot(&self, old: usize) -> Option<usize> {
        index(old, &self.before.slot_ids, &self.next.slot_ids)
    }
    fn attachment(&self, old: AttachmentAddress) -> Option<AttachmentAddress> {
        let id = self
            .before
            .attachment_ids
            .get(old.slot)?
            .get(old.attachment)?;
        self.next
            .attachment_ids
            .iter()
            .enumerate()
            .find_map(|(slot, ids)| {
                ids.iter()
                    .position(|candidate| candidate == id)
                    .map(|attachment| AttachmentAddress { slot, attachment })
            })
    }
    fn constraint(&self, old: usize) -> Option<usize> {
        index(old, &self.before.constraint_ids, &self.next.constraint_ids)
    }
    fn animation(&self, old: usize) -> Option<usize> {
        index(old, &self.before.animation_ids, &self.next.animation_ids)
    }
    fn event(&self, old: usize) -> Option<usize> {
        index(old, &self.before.event_ids, &self.next.event_ids)
    }
    fn string(&self, owner: &WireStringOwner, tag: u32) -> Option<(WireStringOwner, u32)> {
        let mut tag = tag;
        let owner = match owner {
            WireStringOwner::Project => WireStringOwner::Project,
            WireStringOwner::Skeleton => WireStringOwner::Skeleton,
            WireStringOwner::Bone(i) => WireStringOwner::Bone(self.bone(*i)?),
            WireStringOwner::Slot(i) => WireStringOwner::Slot(self.slot(*i)?),
            WireStringOwner::Attachment(a) => {
                let address = self.attachment(*a)?;
                // Region and Mesh use different tags for the same image path.
                if matches!(tag, 13 | 14) {
                    tag = match &self.next.project.slots[address.slot].attachments
                        [address.attachment]
                    {
                        SceneAttachment::Region(_) => 13,
                        SceneAttachment::Mesh(_) => 14,
                        SceneAttachment::Clipping(_) | SceneAttachment::Path(_) => return None,
                    };
                }
                WireStringOwner::Attachment(address)
            }
            WireStringOwner::Animation(i) => WireStringOwner::Animation(self.animation(*i)?),
            WireStringOwner::AnimationFolder(i) => WireStringOwner::AnimationFolder(*i),
            WireStringOwner::Constraint(i) => WireStringOwner::Constraint(self.constraint(*i)?),
            WireStringOwner::Event(i) => WireStringOwner::Event(self.event(*i)?),
        };
        Some((owner, tag))
    }
    fn owner(&self, owner: WireAnimationOwner) -> Option<WireAnimationOwner> {
        Some(match owner {
            WireAnimationOwner::Bone(bone) => WireAnimationOwner::Bone(self.bone(bone)?),
            other => other,
        })
    }
    fn track(&self, track: WireTrack) -> Option<WireTrack> {
        Some(match track {
            WireTrack::Bone { bone, channel } => WireTrack::Bone {
                bone: self.bone(bone)?,
                channel,
            },
            WireTrack::Slot { slot, channel } => WireTrack::Slot {
                slot: self.slot(slot)?,
                channel,
            },
            WireTrack::Sequence { attachment } => WireTrack::Sequence {
                attachment: self.attachment(attachment)?,
            },
            WireTrack::Deform { attachment } => WireTrack::Deform {
                attachment: self.attachment(attachment)?,
            },
            WireTrack::Constraint {
                constraint,
                channel,
            } => WireTrack::Constraint {
                constraint: self.constraint(constraint)?,
                channel,
            },
            WireTrack::Event { event } => WireTrack::Event {
                event: self.event(event)?,
            },
            WireTrack::DrawOrder => WireTrack::DrawOrder,
        })
    }
}

/// Preserve the authored relationship when either attachment changes its wire
/// address. The child's mesh is a derived view with its own image identity.
pub(super) fn reconcile_linked_meshes(
    before: &SceneFrame,
    next: &mut SceneFrame,
) -> Result<(), AppError> {
    if next.project.linked_meshes.is_empty() {
        return Ok(());
    }
    let remap = Remap { before, next };
    let mut reconciled = Vec::with_capacity(next.project.linked_meshes.len());
    // The pending relationships retain their previous addresses until this pass.
    for original in &next.project.linked_meshes {
        let Some(attachment) = remap.attachment(original.attachment) else {
            continue;
        };
        let invalid_source = || {
            AppError::new(
                "InvalidSceneEdit",
                "Remove linked children before deleting or replacing their source mesh.",
            )
        };
        let source = remap
            .attachment(original.source)
            .ok_or_else(invalid_source)?;
        let source_mesh = next.project.slots[source.slot].attachments[source.attachment]
            .mesh()
            .ok_or_else(invalid_source)?;
        let previous_owner = before.project.slots[original.attachment.slot].bone;
        let owner = next.project.slots[attachment.slot].bone;
        if !source_mesh.weighted && next.bone_ids[owner] != before.bone_ids[previous_owner] {
            return Err(AppError::new(
                "InvalidSceneEdit",
                "Changing the owner of an unweighted linked mesh would move its shared geometry.",
            ));
        }
        let child = next.project.slots[attachment.slot].attachments[attachment.attachment]
            .mesh()
            .ok_or_else(|| {
                AppError::new(
                    "InvalidSceneEdit",
                    "A linked attachment must remain a mesh.",
                )
            })?;
        let mut mesh = source_mesh.clone();
        mesh.image = child.image.clone();
        let mut link = original.clone();
        link.attachment = attachment;
        link.source = source;
        reconciled.push((link, mesh));
    }
    next.project.linked_meshes.clear();
    for (link, mesh) in reconciled {
        next.project.slots[link.attachment.slot].attachments[link.attachment.attachment] =
            SceneAttachment::Mesh(Box::new(mesh));
        next.project.linked_meshes.push(link);
    }
    Ok(())
}

fn append(groups: &mut Vec<WireAnimationGroup>, owner: WireAnimationOwner, track: WireTrack) {
    if let Some(group) = groups.iter_mut().find(|group| group.owner == owner) {
        group.tracks.push(track);
    } else {
        groups.push(WireAnimationGroup {
            owner,
            tracks: vec![track],
        });
    }
}

fn reorder<T: Clone>(
    items: &mut Vec<T>,
    ids: &mut Vec<Vec<u64>>,
    order: &[WireTrack],
    selector: impl Fn(&T) -> WireTrack,
) -> Result<(), AppError> {
    if items.len() != ids.len() || items.len() != order.len() {
        return Err(AppError::new(
            "InvalidSceneEdit",
            "Wire track/key identity counts do not match.",
        ));
    }
    let indices = order
        .iter()
        .map(|track| {
            items
                .iter()
                .position(|item| selector(item) == *track)
                .ok_or_else(|| {
                    AppError::new(
                        "InvalidSceneEdit",
                        "A retained wire track no longer exists.",
                    )
                })
        })
        .collect::<Result<Vec<_>, _>>()?;
    if indices.iter().copied().collect::<HashSet<_>>().len() != indices.len() {
        return Err(AppError::new(
            "InvalidSceneEdit",
            "Wire track order repeats an identity.",
        ));
    }
    *items = indices.iter().map(|i| items[*i].clone()).collect();
    *ids = indices.iter().map(|i| ids[*i].clone()).collect();
    Ok(())
}

fn slot_selector(track: &SlotTimeline) -> WireTrack {
    WireTrack::Slot {
        slot: track.slot(),
        channel: crate::animation_slots::channel(track),
    }
}
fn constraint_selector(track: &ConstraintTimeline) -> WireTrack {
    WireTrack::Constraint {
        constraint: track.constraint(),
        channel: match track {
            ConstraintTimeline::Ik { .. } => WireConstraintChannel::Ik,
            ConstraintTimeline::TransformMix { .. } => WireConstraintChannel::TransformMix,
            ConstraintTimeline::PathPosition { .. } => WireConstraintChannel::PathPosition,
            ConstraintTimeline::PathSpacing { .. } => WireConstraintChannel::PathSpacing,
            ConstraintTimeline::PathMix { .. } => WireConstraintChannel::PathMix,
            ConstraintTimeline::Physics { property, .. } => {
                WireConstraintChannel::Physics(*property)
            }
            ConstraintTimeline::PhysicsReset { .. } => WireConstraintChannel::PhysicsReset,
        },
    }
}

/// Retain surviving relative order; prune deleted targets, relocate changed
/// owners and append genuinely new tracks. No old index can target a new ID.
pub(crate) fn reconcile(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    let declarations = reconcile_declarations(before, next);
    let mut wire = match next.project.wire.take() {
        Some(wire) => wire,
        None if declarations.is_some() => materialize_wire(&before.project)?,
        None => return Ok(()),
    };
    wire.constraint_declarations = declarations;
    let remap = Remap { before, next };
    if let Some(state) = &mut wire.source_state {
        state.bone_126 = state
            .bone_126
            .iter()
            .filter_map(|index| remap.bone(*index))
            .collect();
        state.bone_126.sort_unstable();
        state.slot_126 = state
            .slot_126
            .iter()
            .filter_map(|index| remap.slot(*index))
            .collect();
        state.slot_126.sort_unstable();
        state.bone_labels_28 = std::mem::take(&mut state.bone_labels_28)
            .into_iter()
            .filter_map(|(index, value)| Some((remap.bone(index)?, value)))
            .collect();
        state.bone_labels_28.sort_by_key(|(index, _)| *index);
        state.animation_3 = state
            .animation_3
            .iter()
            .filter_map(|index| remap.animation(*index))
            .collect();
        state.animation_3.sort_unstable();
        state.region_43_order = std::mem::take(&mut state.region_43_order)
            .into_iter()
            .filter_map(|address| {
                let address = remap.attachment(address)?;
                matches!(
                    next.project.slots[address.slot].attachments[address.attachment],
                    SceneAttachment::Region(_)
                )
                .then_some(address)
            })
            .collect();
        state
            .region_43_order
            .sort_by_key(|address| (address.slot, address.attachment));
        state.mesh_19 = std::mem::take(&mut state.mesh_19)
            .into_iter()
            .filter_map(|(address, value)| {
                let address = remap.attachment(address)?;
                matches!(
                    next.project.slots[address.slot].attachments[address.attachment],
                    SceneAttachment::Mesh(_)
                )
                .then_some((address, value))
            })
            .collect();
        state
            .mesh_19
            .sort_by_key(|(address, _)| (address.slot, address.attachment));
        state.ik_56_order = state
            .ik_56_order
            .iter()
            .filter_map(|index| remap.constraint(*index))
            .filter(|index| matches!(next.project.constraints[*index], Constraint::Ik(_)))
            .collect();
        state.ik_56_order.sort_unstable();
        state.ik = std::mem::take(&mut state.ik)
            .into_iter()
            .filter_map(|mut value| {
                value.constraint = remap.constraint(value.constraint)?;
                matches!(
                    next.project.constraints[value.constraint],
                    Constraint::Ik(_)
                )
                .then_some(value)
            })
            .collect();
        state.ik.sort_by_key(|value| value.constraint);
        state.transform = std::mem::take(&mut state.transform)
            .into_iter()
            .filter_map(|mut value| {
                value.constraint = remap.constraint(value.constraint)?;
                matches!(
                    next.project.constraints[value.constraint],
                    Constraint::Transform(_)
                )
                .then_some(value)
            })
            .collect();
        state.transform.sort_by_key(|value| value.constraint);
        state.physics = std::mem::take(&mut state.physics)
            .into_iter()
            .filter_map(|mut value| {
                value.constraint = remap.constraint(value.constraint)?;
                matches!(
                    next.project.constraints[value.constraint],
                    Constraint::Physics(_)
                )
                .then_some(value)
            })
            .collect();
        state.physics.sort_by_key(|value| value.constraint);
    }
    // Source Slot/tag8 is an independent retained attachment reference. Its
    // owner and target follow stable identities; an explicit move out of that
    // owner or deletion clears it, without retargeting an unrelated attachment.
    wire.slot_references_8 = wire
        .slot_references_8
        .into_iter()
        .filter_map(|address| {
            let owner = remap.slot(address.slot)?;
            let address = remap.attachment(address)?;
            (address.slot == owner
                && next.project.slots[address.slot].attachments[address.attachment]
                    .image()
                    .is_some())
            .then_some(address)
        })
        .collect();
    wire.slot_references_8.sort_by_key(|address| address.slot);
    wire.zero_size_meshes = wire
        .zero_size_meshes
        .into_iter()
        .filter_map(|address| {
            let address = remap.attachment(address)?;
            let mesh = next.project.slots[address.slot].attachments[address.attachment].mesh()?;
            (mesh.image.width == 0.0 || mesh.image.height == 0.0).then_some(address)
        })
        .collect();
    wire.strings = wire
        .strings
        .into_iter()
        .filter_map(|mut alias| {
            let (owner, tag) = remap.string(&alias.owner, alias.tag)?;
            alias.owner = owner;
            alias.tag = tag;
            Some(alias)
        })
        .collect();
    let mut layouts = Vec::with_capacity(next.project.animations.len());
    for animation in 0..next.project.animations.len() {
        let canonical = animation_layout(&next.project, animation)?;
        let retained = wire
            .animation_layouts
            .iter()
            .find(|layout| remap.animation(layout.animation) == Some(animation));
        let Some(retained) = retained else {
            layouts.push(canonical);
            continue;
        };
        let current: HashSet<_> = canonical
            .groups
            .iter()
            .flat_map(|group| group.tracks.iter().copied())
            .collect();
        let mut groups = Vec::new();
        // Reserve surviving group positions before relocating any track.
        for group in &retained.groups {
            if let Some(owner) = remap.owner(group.owner) {
                groups.push(WireAnimationGroup {
                    owner,
                    tracks: vec![],
                });
            }
        }
        let mut seen = HashSet::new();
        for group in &retained.groups {
            for &track in &group.tracks {
                let Some(track) = remap.track(track).filter(|track| current.contains(track)) else {
                    continue;
                };
                if !seen.insert(track) {
                    return Err(AppError::new(
                        "InvalidSceneEdit",
                        "Wire track identity was repeated while reconciling the edit.",
                    ));
                }
                append(&mut groups, track.owner(&next.project)?, track);
            }
        }
        for group in canonical.groups {
            for track in group.tracks {
                if seen.insert(track) {
                    append(&mut groups, group.owner, track);
                }
            }
        }
        groups.retain(|group| !group.tracks.is_empty());
        layouts.push(WireAnimationLayout { animation, groups });
    }
    wire.animation_layouts = layouts;
    // Decoding extracts each family in wire traversal order. Keep its native
    // parallel key identities in precisely the same order before publication.
    for layout in &wire.animation_layouts {
        let a = layout.animation;
        let order: Vec<_> = layout
            .groups
            .iter()
            .flat_map(|g| g.tracks.iter().copied())
            .collect();
        let clip = &mut next.project.animations[a];
        let family = |predicate: fn(&WireTrack) -> bool| {
            order.iter().copied().filter(predicate).collect::<Vec<_>>()
        };
        reorder(
            &mut clip.tracks,
            &mut next.animation_key_ids[a],
            &family(|t| matches!(t, WireTrack::Bone { .. })),
            |t| WireTrack::Bone {
                bone: t.bone,
                channel: t.channel,
            },
        )?;
        reorder(
            &mut clip.slot_tracks,
            &mut next.animation_slot_key_ids[a],
            &family(|t| matches!(t, WireTrack::Slot { .. })),
            slot_selector,
        )?;
        reorder(
            &mut clip.deform_tracks,
            &mut next.animation_deform_key_ids[a],
            &family(|t| matches!(t, WireTrack::Deform { .. })),
            |t| WireTrack::Deform {
                attachment: t.attachment,
            },
        )?;
        reorder(
            &mut clip.constraint_tracks,
            &mut next.animation_constraint_key_ids[a],
            &family(|t| matches!(t, WireTrack::Constraint { .. })),
            constraint_selector,
        )?;
        reorder(
            &mut clip.sequence_tracks,
            &mut next.animation_sequence_key_ids[a],
            &family(|t| matches!(t, WireTrack::Sequence { .. })),
            |t| WireTrack::Sequence {
                attachment: t.attachment,
            },
        )?;
        reorder(
            &mut clip.event_tracks,
            &mut next.animation_event_key_ids[a],
            &family(|t| matches!(t, WireTrack::Event { .. })),
            |t| WireTrack::Event { event: t.event },
        )?;
    }
    next.project.wire = Some(wire);
    normalize_wire_strings(&mut next.project)?;
    Ok(())
}

/// Declaration inventories follow semantic IDs independently of execution order.
/// A changed kind is removed from its old family and appended to its new family.
fn reconcile_declarations(
    before: &SceneFrame,
    next: &SceneFrame,
) -> Option<WireConstraintDeclarations> {
    let previous = before
        .project
        .wire
        .as_ref()
        .and_then(|wire| wire.constraint_declarations.clone())
        .unwrap_or_else(|| canonical_constraint_declarations(&before.project));
    let canonical = canonical_constraint_declarations(&next.project);
    let remap = Remap { before, next };
    let family = |old: &[usize], current: &[usize]| {
        let mut mapped: Vec<_> = old
            .iter()
            .filter_map(|i| remap.constraint(*i))
            .filter(|i| current.contains(i))
            .collect();
        for index in current {
            if !mapped.contains(index) {
                mapped.push(*index);
            }
        }
        mapped
    };
    let mapped = WireConstraintDeclarations {
        ik: family(&previous.ik, &canonical.ik),
        transform: family(&previous.transform, &canonical.transform),
        path: family(&previous.path, &canonical.path),
        physics: family(&previous.physics, &canonical.physics),
    };
    (mapped != canonical).then_some(mapped)
}
