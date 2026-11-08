//! Authoritative typed scene transactions. Kept behind the migration gate until
//! the application view/command bridge supports the complete attachment model.
use crate::{
    images::valid_image_stem,
    project::AppError,
    rig::{poses, ImagePlacement},
};
use fbones_format::minimal::{
    regions::{BlendMode, Region},
    scene::{
        encode_scene_payload, AttachmentAddress, Constraint, SceneAttachment, SceneProject,
        SceneSlot,
    },
    Bone,
};
use std::collections::{HashMap, HashSet};

fn invalid(message: &str) -> AppError {
    AppError::new("InvalidSceneEdit", message)
}
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct SceneFocus {
    pub bone: u64,
    pub slot: Option<u64>,
    pub attachment: Option<u64>,
    pub constraint: Option<u64>,
    pub vertex: Option<usize>,
    pub animation: Option<u64>,
    pub event: Option<u64>,
}
#[derive(Clone, Debug)]
pub struct SceneFrame {
    pub project: SceneProject,
    pub bone_ids: Vec<u64>,
    pub slot_ids: Vec<u64>,
    pub attachment_ids: Vec<Vec<u64>>,
    pub constraint_ids: Vec<u64>,
    pub animation_ids: Vec<u64>,
    pub animation_key_ids: Vec<Vec<Vec<u64>>>,
    pub animation_slot_key_ids: Vec<Vec<Vec<u64>>>,
    pub animation_draw_key_ids: Vec<Vec<u64>>,
    pub animation_deform_key_ids: Vec<Vec<Vec<u64>>>,
    pub event_ids: Vec<u64>,
    pub animation_constraint_key_ids: Vec<Vec<Vec<u64>>>,
    pub animation_event_key_ids: Vec<Vec<Vec<u64>>>,
    pub animation_sequence_key_ids: Vec<Vec<Vec<u64>>>,
    /// Session/history provenance, never encoded as an invented format field.
    /// On open, the documented generated-name convention is inferred again.
    pub auto_physics_names: HashMap<u64, String>,
    pub focus: SceneFocus,
}
#[derive(Clone, Copy, Default)]
struct Ids {
    bone: u64,
    slot: u64,
    attachment: u64,
    constraint: u64,
    animation: u64,
    animation_key: u64,
    event: u64,
}
fn allocate(next: &mut u64) -> Result<u64, AppError> {
    let id = *next;
    *next = next
        .checked_add(1)
        .ok_or_else(|| invalid("Session identity space exhausted."))?;
    Ok(id)
}

/// Native internal operations, not a public plugin ABI or a raw frontend model.
#[derive(Clone, Debug)]
pub enum SceneEdit {
    Animation(crate::rig::RigEdit),
    Rig(crate::rig::RigEdit),
    RigInPose {
        edit: crate::rig::RigEdit,
        poses: Vec<crate::rig::Pose>,
    },
    CreateSlot {
        bone: u64,
        name: Option<String>,
    },
    AddImages {
        bone: u64,
        slot: Option<u64>,
        images: Vec<ImagePlacement>,
    },
    InsertAttachment {
        slot: u64,
        attachment: SceneAttachment,
        activate: bool,
    },
    ReplaceAttachment {
        id: u64,
        attachment: SceneAttachment,
    },
    SetAttachmentColor {
        id: u64,
        color: u32,
    },
    SetAttachmentSequence {
        id: u64,
        sequence: Option<crate::animation_sequence::SettingsInput>,
    },
    SetActive {
        slot: u64,
        attachment: Option<u64>,
    },
    RenameAttachment {
        id: u64,
        name: String,
    },
    DeleteAttachment {
        id: u64,
    },
    RenameSlot {
        id: u64,
        name: String,
    },
    DeleteSlot {
        id: u64,
    },
    ReorderSlot {
        id: u64,
        index: usize,
    },
    SetSlotDarkColor {
        id: u64,
        enabled: bool,
        color: u32,
    },
    SetSlotColor {
        id: u64,
        color: [u8; 4],
    },
    SetSlotBlend {
        id: u64,
        blend: BlendMode,
    },
    SetBone {
        id: u64,
        bone: Bone,
    },
    AddConstraint {
        constraint: Constraint,
    },
    SetConstraint {
        id: u64,
        constraint: Constraint,
    },
    DeleteConstraint {
        id: u64,
    },
    ReorderConstraint {
        id: u64,
        index: usize,
    },
    SetImagesRoot {
        path: String,
    },
    Undo,
    Redo,
}
pub struct SceneHistory {
    frame: SceneFrame,
    undo: Vec<SceneFrame>,
    redo: Vec<SceneFrame>,
    saved: Option<SceneProject>,
    // Typed float equality treats -0 as +0. Retain canonical bytes so exact
    // authored bits participate without encoding on every summary/dirty read.
    encoded: Vec<u8>,
    saved_encoded: Option<Vec<u8>>,
    ids: Ids,
}
impl SceneFrame {
    pub fn bone_index(&self, id: u64) -> Result<usize, AppError> {
        self.bone_ids
            .iter()
            .position(|v| *v == id)
            .ok_or_else(|| invalid("Choose an existing bone."))
    }
    pub fn slot_index(&self, id: u64) -> Result<usize, AppError> {
        self.slot_ids
            .iter()
            .position(|v| *v == id)
            .ok_or_else(|| invalid("Choose an existing slot."))
    }
    pub fn attachment_address(&self, id: u64) -> Result<AttachmentAddress, AppError> {
        self.attachment_ids
            .iter()
            .enumerate()
            .find_map(|(slot, ids)| {
                ids.iter()
                    .position(|v| *v == id)
                    .map(|attachment| AttachmentAddress { slot, attachment })
            })
            .ok_or_else(|| invalid("Choose an existing attachment."))
    }
    pub fn constraint_index(&self, id: u64) -> Result<usize, AppError> {
        self.constraint_ids
            .iter()
            .position(|v| *v == id)
            .ok_or_else(|| invalid("Choose an existing constraint."))
    }
    pub fn attachment(&self, id: u64) -> Result<&SceneAttachment, AppError> {
        let a = self.attachment_address(id)?;
        Ok(&self.project.slots[a.slot].attachments[a.attachment])
    }
    fn add_physics_to_bones(&mut self, ids: &mut Ids, bones: &[u64]) -> Result<(), AppError> {
        if bones.is_empty() || bones.len() > 128 {
            return Err(invalid("Choose 1–128 distinct bones for Physics."));
        }
        let mut seen = HashSet::new();
        let mut indices = Vec::with_capacity(bones.len());
        for id in bones {
            if !seen.insert(*id) {
                return Err(invalid("Choose each Physics bone only once."));
            }
            indices.push(self.bone_index(*id)?);
        }
        if self.project.constraints.len() + indices.len() > 128 {
            return Err(invalid(
                "This project supports at most 128 total constraints.",
            ));
        }
        indices.sort_unstable();
        let first = self.bone_ids[indices[0]];
        let mut names: HashSet<_> = self
            .project
            .constraints
            .iter()
            .map(|c| c.name().to_owned())
            .collect();
        let mut focus = None;
        for index in indices {
            let bone = &self.project.rig.bones[index];
            let name = unique_physics_name(&bone.name, &names);
            let mut constraint =
                fbones_format::minimal::scene::PhysicsConstraint::new(name.clone(), index);
            constraint.inertia = 1.;
            if bone.length > 0. {
                constraint.angular =
                    fbones_format::minimal::scene::PhysicsAngular::from_effective(1., 0.)
                        .map_err(|_| invalid("The Physics rotation preset is invalid."))?;
            } else {
                constraint.x = 1.;
                constraint.y = 1.;
            }
            let id = allocate(&mut ids.constraint)?;
            self.project
                .constraints
                .push(Constraint::Physics(constraint));
            self.constraint_ids.push(id);
            self.auto_physics_names.insert(id, name.clone());
            names.insert(name);
            focus = Some(id);
        }
        self.focus = SceneFocus {
            bone: first,
            constraint: focus,
            ..SceneFocus::default()
        };
        Ok(())
    }

    /// A name or member edit detaches automatic following. Bone rename and
    /// constraint reorder preserve ownership through stable native identities.
    fn follow_physics_bone_names(&mut self, before: &SceneFrame) {
        for (old_index, id) in before.constraint_ids.iter().enumerate() {
            let Some(last_name) = before.auto_physics_names.get(id) else {
                continue;
            };
            let old = &before.project.constraints[old_index];
            let Some(index) = self.constraint_ids.iter().position(|value| value == id) else {
                self.auto_physics_names.remove(id);
                continue;
            };
            let (Constraint::Physics(old), Constraint::Physics(current)) =
                (old, &self.project.constraints[index])
            else {
                self.auto_physics_names.remove(id);
                continue;
            };
            if current.name != *last_name
                || before.bone_ids.get(old.bone) != self.bone_ids.get(current.bone)
            {
                self.auto_physics_names.remove(id);
                continue;
            }
            let Some(bone) = self.project.rig.bones.get(current.bone) else {
                self.auto_physics_names.remove(id);
                continue;
            };
            if before.project.rig.bones[old.bone].name == bone.name {
                continue;
            }
            let names = self
                .project
                .constraints
                .iter()
                .enumerate()
                .filter(|(i, _)| *i != index)
                .map(|(_, c)| c.name().to_owned())
                .collect();
            let name = unique_physics_name(&bone.name, &names);
            let Constraint::Physics(current) = &mut self.project.constraints[index] else {
                unreachable!()
            };
            current.name = name.clone();
            self.auto_physics_names.insert(*id, name);
        }
    }
}

fn physics_name(bone: &str, number: Option<u32>) -> String {
    let suffix = number.map_or_else(|| "_physics".into(), |n| format!("_physics{n}"));
    let mut end = bone.len().min(1024 - suffix.len());
    while !bone.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}{suffix}", &bone[..end])
}
fn unique_physics_name(bone: &str, names: &HashSet<String>) -> String {
    let first = physics_name(bone, None);
    if !names.contains(&first) {
        return first;
    }
    (2..)
        .map(|n| physics_name(bone, Some(n)))
        .find(|name| !names.contains(name))
        .expect("bounded constraint inventory leaves a generated name available")
}
fn generated_physics_name(bone: &str, name: &str) -> bool {
    if name == physics_name(bone, None) {
        return true;
    }
    let Some((_, suffix)) = name.rsplit_once("_physics") else {
        return false;
    };
    let Ok(number) = suffix.parse::<u32>() else {
        return false;
    };
    number >= 2 && suffix == number.to_string() && name == physics_name(bone, Some(number))
}
impl SceneHistory {
    pub fn new(project: SceneProject, saved: bool) -> Result<Self, AppError> {
        check_active_clipping(&project)?;
        let encoded = encode_scene_payload(&project)?;
        let mut ids = Ids::default();
        let mut bone_ids = vec![];
        let mut slot_ids = vec![];
        let mut attachment_ids = vec![];
        let mut constraint_ids = vec![];
        let mut animation_ids = vec![];
        let mut animation_key_ids = vec![];
        let mut animation_slot_key_ids = vec![];
        let mut animation_draw_key_ids = vec![];
        let mut animation_deform_key_ids = vec![];
        for _ in &project.rig.bones {
            bone_ids.push(allocate(&mut ids.bone)?);
        }
        for slot in &project.slots {
            slot_ids.push(allocate(&mut ids.slot)?);
            let mut list = vec![];
            for _ in &slot.attachments {
                list.push(allocate(&mut ids.attachment)?);
            }
            attachment_ids.push(list);
        }
        for _ in &project.constraints {
            constraint_ids.push(allocate(&mut ids.constraint)?);
        }
        let event_ids = project
            .events
            .iter()
            .map(|_| allocate(&mut ids.event))
            .collect::<Result<Vec<_>, _>>()?;
        let mut animation_constraint_key_ids = vec![];
        let mut animation_event_key_ids = vec![];
        let mut animation_sequence_key_ids = vec![];
        for animation in &project.animations {
            animation_ids.push(allocate(&mut ids.animation)?);
            let mut tracks = vec![];
            for track in &animation.tracks {
                let mut keys = vec![];
                for _ in &track.keys {
                    keys.push(allocate(&mut ids.animation_key)?);
                }
                tracks.push(keys);
            }
            animation_key_ids.push(tracks);
            animation_slot_key_ids.push(crate::animation_slots::allocate_ids(
                animation,
                &mut ids.animation_key,
            )?);
            animation_draw_key_ids.push(crate::animation_order::allocate_ids(
                animation,
                &mut ids.animation_key,
            )?);
            animation_deform_key_ids.push(crate::animation_deform::allocate_ids(
                animation,
                &mut ids.animation_key,
            )?);
            animation_constraint_key_ids.push(crate::animation_constraints::allocate_ids(
                animation,
                &mut ids.animation_key,
            )?);
            animation_sequence_key_ids.push(crate::animation_sequence::allocate_ids(
                animation,
                &mut ids.animation_key,
            )?);
            animation_event_key_ids.push(crate::animation_events::allocate_ids(
                animation,
                &mut ids.animation_key,
            )?);
        }
        let auto_physics_names = project
            .constraints
            .iter()
            .zip(&constraint_ids)
            .filter_map(|(c, id)| match c {
                Constraint::Physics(c)
                    if generated_physics_name(&project.rig.bones[c.bone].name, &c.name) =>
                {
                    Some((*id, c.name.clone()))
                }
                _ => None,
            })
            .collect();
        let focus = SceneFocus {
            bone: bone_ids[0],
            ..SceneFocus::default()
        };
        let checkpoint = saved.then(|| project.clone());
        let history = Self {
            frame: SceneFrame {
                project,
                bone_ids,
                slot_ids,
                attachment_ids,
                constraint_ids,
                animation_ids,
                animation_key_ids,
                animation_slot_key_ids,
                animation_draw_key_ids,
                animation_deform_key_ids,
                event_ids,
                animation_constraint_key_ids,
                animation_event_key_ids,
                animation_sequence_key_ids,
                auto_physics_names,
                focus,
            },
            undo: vec![],
            redo: vec![],
            saved: checkpoint,
            saved_encoded: saved.then(|| encoded.clone()),
            encoded,
            ids,
        };
        crate::animation_slots::validate(&history.frame)?;
        crate::animation_deform::validate(&history.frame)?;
        Ok(history)
    }
    pub fn frame(&self) -> &SceneFrame {
        &self.frame
    }
    pub fn dirty(&self) -> bool {
        self.saved.as_ref() != Some(&self.frame.project)
            || self.saved_encoded.as_ref() != Some(&self.encoded)
    }
    pub fn can_undo(&self) -> bool {
        !self.undo.is_empty()
    }
    pub fn can_redo(&self) -> bool {
        !self.redo.is_empty()
    }
    pub fn mark_saved(&mut self) {
        self.saved = Some(self.frame.project.clone());
        // Saves have already validated this snapshot. An unexpected failure
        // keeps the checkpoint dirty rather than hiding it or panicking.
        self.saved_encoded = encode_scene_payload(&self.frame.project).ok();
        if let Some(encoded) = &self.saved_encoded {
            self.encoded.clone_from(encoded);
        }
    }
    pub fn apply(&mut self, edit: SceneEdit) -> Result<bool, AppError> {
        match edit {
            SceneEdit::Undo => {
                if let Some(previous) = self.undo.last() {
                    let encoded = encode_scene_payload(&previous.project)?;
                    let previous = self.undo.pop().unwrap();
                    self.redo.push(std::mem::replace(&mut self.frame, previous));
                    self.encoded = encoded;
                    return Ok(true);
                }
                return Ok(false);
            }
            SceneEdit::Redo => {
                if let Some(next) = self.redo.last() {
                    let encoded = encode_scene_payload(&next.project)?;
                    let next = self.redo.pop().unwrap();
                    self.undo.push(std::mem::replace(&mut self.frame, next));
                    self.encoded = encoded;
                    return Ok(true);
                }
                return Ok(false);
            }
            _ => (),
        }
        let mut before = self.frame.clone();
        let mut next = before.clone();
        let mut ids = self.ids;
        let structural = !matches!(&edit, SceneEdit::Animation(_));
        // Selection is frontend state. Targeted authored edits capture their
        // explicit address for Undo without relying on the last native gesture.
        if let SceneEdit::RenameAttachment { id, .. }
        | SceneEdit::DeleteAttachment { id }
        | SceneEdit::ReplaceAttachment { id, .. }
        | SceneEdit::SetAttachmentSequence { id, .. }
        | SceneEdit::SetAttachmentColor { id, .. } = &edit
        {
            let a = next.attachment_address(*id)?;
            let focus = SceneFocus {
                bone: next.bone_ids[next.project.slots[a.slot].bone],
                slot: Some(next.slot_ids[a.slot]),
                attachment: Some(*id),
                ..SceneFocus::default()
            };
            before.focus = focus.clone();
            next.focus = focus;
        }
        match edit {
            SceneEdit::Animation(edit) => crate::animation::apply(
                &mut next,
                &mut ids.animation,
                &mut ids.animation_key,
                &mut ids.event,
                edit,
            )?,
            SceneEdit::SetAttachmentColor { id, color } => {
                crate::attachment_color::set(&mut next, id, color)?
            }
            SceneEdit::SetAttachmentSequence { id, sequence } => {
                crate::animation_sequence::set_settings(&mut next, id, sequence)?
            }
            SceneEdit::CreateSlot { bone, name } => {
                let bone_index = next.bone_index(bone)?;
                let name = unique_name(
                    name.as_deref().unwrap_or("slot"),
                    next.project.slots.iter().map(|s| s.name.as_str()),
                );
                let id = allocate(&mut ids.slot)?;
                next.project.slots.push(SceneSlot {
                    name,
                    bone: bone_index,
                    color: [255; 4],
                    blend: BlendMode::Normal,
                    attachments: vec![],
                    active_attachment: None,
                });
                next.slot_ids.push(id);
                next.attachment_ids.push(vec![]);
                next.focus = SceneFocus {
                    bone,
                    slot: Some(id),
                    ..SceneFocus::default()
                };
                before.focus = SceneFocus {
                    bone,
                    ..SceneFocus::default()
                };
            }
            SceneEdit::RigInPose { edit, poses } => {
                bridge::apply(&mut before, &mut next, &mut ids, edit, Some(&poses))?
            }
            SceneEdit::Rig(edit) => bridge::apply(&mut before, &mut next, &mut ids, edit, None)?,
            SceneEdit::AddImages { bone, slot, images } => {
                if images.is_empty() || images.len() > 128 {
                    return Err(invalid("Choose a nonempty bounded image batch."));
                }
                let bone_index = next.bone_index(bone)?;
                before.focus = SceneFocus {
                    bone,
                    ..SceneFocus::default()
                };
                let target = slot.map(|id| next.slot_index(id)).transpose()?;
                if target.is_some_and(|i| next.project.slots[i].bone != bone_index) {
                    return Err(invalid(
                        "The attachment destination belongs to a different bone.",
                    ));
                }
                let slot_limit = fbones_format::minimal::scene::MAX_SCENE_SLOTS;
                if target.is_none() && next.project.slots.len() + images.len() > slot_limit {
                    return Err(invalid(&format!(
                        "This profile supports {slot_limit} slots."
                    )));
                }
                let inverse = poses(&next.project.rig.bones)[bone_index].inverse()?;
                for image in images {
                    if !valid_image_stem(&image.path)
                        || image.image.trim().is_empty()
                        || [image.x, image.y, image.width, image.height]
                            .iter()
                            .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
                        || image.width <= 0.0
                        || image.height <= 0.0
                    {
                        return Err(invalid(
                            "Use validated images and finite placement coordinates.",
                        ));
                    }
                    let slot_index = if let Some(index) = target {
                        index
                    } else {
                        let name = unique_name(
                            &image.image,
                            next.project.slots.iter().map(|s| s.name.as_str()),
                        );
                        next.project.slots.push(SceneSlot {
                            name,
                            bone: bone_index,
                            color: [255; 4],
                            blend: BlendMode::Normal,
                            attachments: vec![],
                            active_attachment: None,
                        });
                        next.slot_ids.push(allocate(&mut ids.slot)?);
                        next.attachment_ids.push(vec![]);
                        next.project.slots.len() - 1
                    };
                    let destination = &mut next.project.slots[slot_index];
                    let name = unique_name(
                        &image.image,
                        destination.attachments.iter().map(SceneAttachment::name),
                    );
                    let (x, y) = inverse.point(image.x, image.y);
                    let path = if name == image.path {
                        String::new()
                    } else {
                        image.path
                    };
                    destination
                        .attachments
                        .push(SceneAttachment::Region(Region {
                            name,
                            path,
                            x,
                            y,
                            rotation: 0.0,
                            scale_x: 1.0,
                            scale_y: 1.0,
                            width: image.width,
                            height: image.height,
                        }));
                    let index = destination.attachments.len() - 1;
                    destination.active_attachment = Some(index);
                    let id = allocate(&mut ids.attachment)?;
                    next.attachment_ids[slot_index].push(id);
                    next.project.attachment_order.push(AttachmentAddress {
                        slot: slot_index,
                        attachment: index,
                    });
                    next.focus = SceneFocus {
                        bone,
                        slot: Some(next.slot_ids[slot_index]),
                        attachment: Some(id),
                        constraint: None,
                        vertex: None,
                        animation: next.focus.animation,
                        event: next.focus.event,
                    };
                }
            }
            SceneEdit::InsertAttachment {
                slot,
                attachment,
                activate,
            } => {
                let s = next.slot_index(slot)?;
                let a = next.project.slots[s].attachments.len();
                next.project.slots[s].attachments.push(attachment);
                let id = allocate(&mut ids.attachment)?;
                next.attachment_ids[s].push(id);
                next.project.attachment_order.push(AttachmentAddress {
                    slot: s,
                    attachment: a,
                });
                if activate {
                    next.project.slots[s].active_attachment = Some(a);
                }
                next.focus = SceneFocus {
                    bone: next.bone_ids[next.project.slots[s].bone],
                    slot: Some(slot),
                    attachment: Some(id),
                    constraint: None,
                    vertex: None,
                    animation: next.focus.animation,
                    event: next.focus.event,
                };
            }
            SceneEdit::ReplaceAttachment { id, attachment } => {
                let a = next.attachment_address(id)?;
                next.project.slots[a.slot].attachments[a.attachment] = attachment;
            }
            SceneEdit::SetActive { slot, attachment } => {
                let s = next.slot_index(slot)?;
                let active = attachment
                    .map(|id| next.attachment_address(id))
                    .transpose()?;
                if active.is_some_and(|a| a.slot != s) {
                    return Err(invalid("An active attachment must belong to its slot."));
                }
                next.project.slots[s].active_attachment = active.map(|a| a.attachment);
                // A paperclip changes activation, never which row is inspected.
            }
            SceneEdit::RenameAttachment { id, name } => {
                let a = next.attachment_address(id)?;
                let attachment = &mut next.project.slots[a.slot].attachments[a.attachment];
                // Keep the image resource when a formerly implicit image name changes.
                if let Some(image) = attachment.image_mut() {
                    if image.path.is_empty() && image.name != name {
                        image.path = image.name.clone();
                    }
                    image.name = name;
                } else if let SceneAttachment::Clipping(clip) = attachment {
                    clip.name = name;
                }
            }
            SceneEdit::DeleteAttachment { id } => {
                let a = next.attachment_address(id)?;
                let slot = &mut next.project.slots[a.slot];
                slot.attachments.remove(a.attachment);
                next.attachment_ids[a.slot].remove(a.attachment);
                slot.active_attachment = slot.active_attachment.and_then(|index| {
                    if index == a.attachment {
                        None
                    } else {
                        Some(index - usize::from(index > a.attachment))
                    }
                });
                next.project.attachment_order.retain(|entry| *entry != a);
                for entry in &mut next.project.attachment_order {
                    if entry.slot == a.slot && entry.attachment > a.attachment {
                        entry.attachment -= 1;
                    }
                }
                if next.focus.attachment == Some(id) {
                    next.focus.attachment = None;
                    next.focus.vertex = None;
                }
            }
            SceneEdit::RenameSlot { id, name } => {
                let i = next.slot_index(id)?;
                next.project.slots[i].name = name;
            }
            SceneEdit::SetSlotDarkColor { id, enabled, color } => {
                let slot = next.slot_index(id)?;
                let focus = SceneFocus {
                    bone: next.bone_ids[next.project.slots[slot].bone],
                    slot: Some(id),
                    ..SceneFocus::default()
                };
                before.focus = focus.clone();
                next.focus = focus;
                crate::slot_dark_color::set(&mut next, id, enabled, color)?;
            }
            SceneEdit::SetSlotColor { id, color } => {
                let i = next.slot_index(id)?;
                next.project.slots[i].color = color;
            }
            SceneEdit::SetSlotBlend { id, blend } => {
                let i = next.slot_index(id)?;
                next.project.slots[i].blend = blend;
            }
            SceneEdit::DeleteSlot { id } => {
                let i = next.slot_index(id)?;
                if next.project.slots.iter().enumerate().any(|(s, slot)| {
                    s != i
                        && slot
                            .attachments
                            .iter()
                            .any(|a| a.clipping().is_some_and(|clip| clip.end_slot == Some(i)))
                }) {
                    return Err(invalid(
                        "Choose another clipping end before deleting this slot.",
                    ));
                }
                let removed = next.attachment_ids.remove(i);
                next.slot_ids.remove(i);
                next.project.slots.remove(i);
                next.project.attachment_order.retain(|a| a.slot != i);
                for a in &mut next.project.attachment_order {
                    if a.slot > i {
                        a.slot -= 1;
                    }
                }
                for slot in &mut next.project.slots {
                    for a in &mut slot.attachments {
                        if let Some(c) = a.clipping_mut() {
                            if c.end_slot.is_some_and(|end| end > i) {
                                c.end_slot = c.end_slot.map(|end| end - 1);
                            }
                        }
                    }
                }
                if next.focus.slot == Some(id) {
                    next.focus.slot = None;
                }
                if next
                    .focus
                    .attachment
                    .is_some_and(|id| removed.contains(&id))
                {
                    next.focus.attachment = None;
                    next.focus.vertex = None;
                }
            }
            SceneEdit::ReorderSlot { id, index } => {
                let old = next.slot_index(id)?;
                if index >= next.slot_ids.len() {
                    return Err(invalid("Choose a valid draw-order position."));
                }
                let old_ids = next.slot_ids.clone();
                let slot = next.project.slots.remove(old);
                next.project.slots.insert(index, slot);
                let stable = next.slot_ids.remove(old);
                next.slot_ids.insert(index, stable);
                let attachments = next.attachment_ids.remove(old);
                next.attachment_ids.insert(index, attachments);
                let remap: Vec<_> = old_ids
                    .iter()
                    .map(|id| next.slot_ids.iter().position(|n| n == id).unwrap())
                    .collect();
                for address in &mut next.project.attachment_order {
                    address.slot = remap[address.slot];
                }
                for slot in &mut next.project.slots {
                    for a in &mut slot.attachments {
                        if let Some(c) = a.clipping_mut() {
                            c.end_slot = c.end_slot.map(|end| remap[end]);
                        }
                    }
                }
            }
            SceneEdit::SetBone { id, bone } => {
                let i = next.bone_index(id)?;
                if bone.parent != next.project.rig.bones[i].parent {
                    return Err(invalid(
                        "Use a pose-preserving reparent operation to change the parent.",
                    ));
                }
                next.project.rig.bones[i] = bone;
                next.focus.bone = id;
            }
            SceneEdit::AddConstraint { constraint } => {
                next.project.constraints.push(constraint);
                let id = allocate(&mut ids.constraint)?;
                next.constraint_ids.push(id);
                next.focus.constraint = Some(id);
            }
            SceneEdit::SetConstraint { id, constraint } => {
                let i = next.constraint_index(id)?;
                next.project.constraints[i] = constraint;
            }
            SceneEdit::DeleteConstraint { id } => {
                let i = next.constraint_index(id)?;
                next.project.constraints.remove(i);
                next.constraint_ids.remove(i);
                if next.focus.constraint == Some(id) {
                    next.focus.constraint = None;
                }
            }
            SceneEdit::ReorderConstraint { id, index } => {
                let old = next.constraint_index(id)?;
                if index >= next.constraint_ids.len() {
                    return Err(invalid("Choose a valid constraint order."));
                }
                let c = next.project.constraints.remove(old);
                next.project.constraints.insert(index, c);
                let stable = next.constraint_ids.remove(old);
                next.constraint_ids.insert(index, stable);
            }
            SceneEdit::SetImagesRoot { path } => next.project.images_root = path,
            SceneEdit::Undo | SceneEdit::Redo => unreachable!(),
        }
        if structural {
            crate::animation_order::remap_references(&before, &mut next)?;
            crate::animation_deform::remap_references(&before, &mut next)?;
            crate::animation_slots::remap_references(&before, &mut next)?;
            crate::animation_constraints::remap(&before, &mut next)?;
            crate::animation_sequence::remap_references(&before, &mut next)?;
            crate::attachment_color::remap(&before, &mut next)?;
            crate::slot_dark_color::remap(&before, &mut next)?;
        }
        crate::animation_slots::canonicalize(&mut next)?;
        crate::animation_deform::canonicalize(&mut next)?;
        crate::animation_constraints::canonicalize(&mut next)?;
        crate::animation_events::canonicalize(&mut next)?;
        crate::animation_sequence::canonicalize(&mut next)?;
        crate::animation_slots::validate(&next)?;
        crate::animation_deform::validate(&next)?;
        next.follow_physics_bone_names(&before);
        crate::scene_wire::reconcile(&before, &mut next)?;
        check_active_clipping(&next.project)?;
        let encoded = encode_scene_payload(&next.project)?;
        if next.project == self.frame.project && encoded == self.encoded {
            return Ok(false);
        }
        self.frame = next;
        self.encoded = encoded;
        self.undo.push(before);
        if self.undo.len() > 100 {
            self.undo.remove(0);
        }
        self.redo.clear();
        self.ids = ids;
        Ok(true)
    }
}
fn unique_name<'a>(base: &str, names: impl Iterator<Item = &'a str>) -> String {
    let used: std::collections::HashSet<_> = names.collect();
    if !used.contains(base) {
        return base.into();
    }
    (1..)
        .map(|i| format!("{base}_{i}"))
        .find(|name| !used.contains(name.as_str()))
        .unwrap()
}

#[cfg(test)]
#[path = "scene_physics_batch_tests.rs"]
mod physics_batch_tests;
#[cfg(test)]
mod tests {
    use super::*;
    use fbones_format::minimal::{regions::RegionProject, scene::decode_scene, MinimalProject};
    fn initial() -> SceneHistory {
        SceneHistory::new(
            SceneProject::from(&RegionProject {
                rig: MinimalProject::new("inventory".into(), [27; 16]),
                images_root: "./images/".into(),
                slots: vec![],
                region_order: vec![],
            }),
            true,
        )
        .unwrap()
    }
    fn image(name: &str) -> ImagePlacement {
        ImagePlacement {
            image: name.into(),
            path: format!("parts/{name}"),
            x: 25.0,
            y: -10.0,
            width: 32.0,
            height: 24.0,
        }
    }
    #[test]
    fn alternatives_activation_focus_and_history_are_independent() {
        let mut h = initial();
        h.apply(SceneEdit::AddImages {
            bone: 0,
            slot: None,
            images: vec![image("A")],
        })
        .unwrap();
        let slot = h.frame.slot_ids[0];
        let a = h.frame.attachment_ids[0][0];
        h.apply(SceneEdit::AddImages {
            bone: 0,
            slot: Some(slot),
            images: vec![image("B")],
        })
        .unwrap();
        let b = h.frame.attachment_ids[0][1];
        assert_ne!(a, b);
        h.apply(SceneEdit::SetActive {
            slot,
            attachment: Some(a),
        })
        .unwrap();
        let focus = h.frame.focus.clone();
        assert_eq!(focus.attachment, Some(b));
        assert_eq!(h.frame.project.slots[0].active().unwrap().name(), "A");
        h.apply(SceneEdit::SetActive {
            slot,
            attachment: None,
        })
        .unwrap();
        assert_eq!(h.frame.focus, focus);
        assert_eq!(h.frame.project.slots[0].attachments.len(), 2);
        let payload = encode_scene_payload(&h.frame.project).unwrap();
        assert_eq!(decode_scene(&payload).unwrap(), h.frame.project);
        h.mark_saved();
        assert!(!h.dirty());
        h.apply(SceneEdit::Undo).unwrap();
        assert!(h.dirty());
        assert_eq!(h.frame.project.slots[0].active().unwrap().name(), "A");
        h.apply(SceneEdit::Redo).unwrap();
        assert!(!h.dirty());
        assert_eq!(h.frame.attachment_ids[0], vec![a, b]);
    }
    #[test]
    fn invalid_batch_or_cross_slot_activation_does_not_consume_ids_or_history() {
        let mut h = initial();
        let before = h.frame.project.clone();
        let mut bad = image("bad");
        bad.width = 0.0;
        assert!(h
            .apply(SceneEdit::AddImages {
                bone: 0,
                slot: None,
                images: vec![image("A"), bad]
            })
            .is_err());
        assert_eq!(h.frame.project, before);
        assert!(!h.can_undo());
        h.apply(SceneEdit::AddImages {
            bone: 0,
            slot: None,
            images: vec![image("A"), image("B")],
        })
        .unwrap();
        assert_eq!(h.frame.slot_ids, vec![0, 1]);
        assert_eq!(h.frame.attachment_ids, vec![vec![0], vec![1]]);
        let project = h.frame.project.clone();
        assert!(h
            .apply(SceneEdit::SetActive {
                slot: 0,
                attachment: Some(1)
            })
            .is_err());
        assert_eq!(h.frame.project, project);
        h.apply(SceneEdit::Undo).unwrap();
        h.apply(SceneEdit::AddImages {
            bone: 0,
            slot: None,
            images: vec![image("C")],
        })
        .unwrap();
        assert_eq!(h.frame.attachment_ids[0], vec![2]);
        assert!(!h.can_redo());
    }
    #[test]
    fn reorder_and_delete_preserve_inventory_ids_and_inactive_edits() {
        let mut h = initial();
        h.apply(SceneEdit::AddImages {
            bone: 0,
            slot: None,
            images: vec![image("A"), image("C")],
        })
        .unwrap();
        h.apply(SceneEdit::AddImages {
            bone: 0,
            slot: Some(0),
            images: vec![image("B")],
        })
        .unwrap();
        let a = h.frame.attachment_ids[0][0];
        let b = h.frame.attachment_ids[0][1];
        h.apply(SceneEdit::SetActive {
            slot: 0,
            attachment: Some(a),
        })
        .unwrap();
        h.apply(SceneEdit::RenameAttachment {
            id: b,
            name: "inactive".into(),
        })
        .unwrap();
        assert_eq!(h.frame.project.slots[0].active().unwrap().name(), "A");
        h.apply(SceneEdit::ReorderSlot { id: 0, index: 1 }).unwrap();
        assert_eq!(h.frame.slot_ids, vec![1, 0]);
        assert_eq!(h.frame.attachment_ids[1], vec![a, b]);
        assert_eq!(
            h.frame.project.attachment_order[0],
            AttachmentAddress {
                slot: 1,
                attachment: 0
            }
        );
        h.apply(SceneEdit::DeleteAttachment { id: b }).unwrap();
        assert_eq!(h.frame.project.slots[1].active().unwrap().name(), "A");
        h.apply(SceneEdit::Undo).unwrap();
        assert_eq!(h.frame.attachment(b).unwrap().name(), "inactive");
        h.apply(SceneEdit::DeleteAttachment { id: a }).unwrap();
        assert!(h.frame.project.slots[1].active().is_none());
        assert_eq!(h.frame.project.slots[1].attachments.len(), 1);
    }
}

#[path = "scene_bridge.rs"]
mod bridge;
pub use bridge::{AttachmentView, ClippingView, SceneRigHistory};

#[path = "scene_constraints.rs"]
mod constraint_input;
pub use constraint_input::ConstraintInput;

/// Authoring/runtime support policy, distinct from binary structure acceptance.
/// End-before-start rendering is unproven; overlapping active intervals are
/// outside the renderer's documented single-clip model. Never rewrite either.
pub(crate) fn check_active_clipping(project: &SceneProject) -> Result<(), AppError> {
    check_clipping_activation(
        project,
        &project
            .slots
            .iter()
            .map(|slot| slot.active_attachment)
            .collect::<Vec<_>>(),
    )
}
/// The same interval policy applies to Setup and transient animated activation.
/// Geometry/inventory are borrowed; sampling does not clone or author the scene.
pub(crate) fn check_clipping_activation(
    project: &SceneProject,
    active: &[Option<usize>],
) -> Result<(), AppError> {
    check_clipping_activation_in_order(
        project,
        active,
        &(0..project.slots.len()).collect::<Vec<_>>(),
    )
}
pub(crate) fn check_clipping_activation_in_order(
    project: &SceneProject,
    active: &[Option<usize>],
    order: &[usize],
) -> Result<(), AppError> {
    if active.len() != project.slots.len() {
        return Err(invalid("The sampled slot inventory changed."));
    }
    if order.len() != project.slots.len() {
        return Err(invalid("The sampled draw order is incomplete."));
    }
    let mut ranks = vec![usize::MAX; order.len()];
    for (rank, index) in order.iter().enumerate() {
        if *index >= ranks.len() || ranks[*index] != usize::MAX {
            return Err(invalid(
                "The sampled draw order must contain every slot once.",
            ));
        }
        ranks[*index] = rank;
    }
    let mut previous_end = None;
    for (start, index) in order.iter().copied().enumerate() {
        let slot = &project.slots[index];
        let attachment = active[index]
            .map(|index| {
                slot.attachments.get(index).ok_or_else(|| {
                    invalid("The sampled attachment is missing from its owning slot.")
                })
            })
            .transpose()?;
        if let Some(clip) = attachment.and_then(|a| a.clipping()) {
            let end = clip
                .end_slot
                .ok_or_else(|| invalid("Choose an existing clipping end slot."))?;
            if end >= project.slots.len() || ranks[end] < start {
                return Err(AppError::new("UnsupportedClippingRange","Clipping ends before its start are not editable until their rendering is verified."));
            }
            if previous_end.is_some_and(|end| start <= end) {
                return Err(AppError::new("OverlappingClipping","Active clipping intervals must not overlap. Deactivate or move the other clip first."));
            }
            previous_end = Some(if end == index {
                project.slots.len() - 1
            } else {
                ranks[end]
            });
        }
    }
    Ok(())
}
