//! Direct complete-scene view and rig bridge. No attachment inventory is collapsed
//! into the legacy one-image-per-slot model for an edit or save.
use super::*;
use crate::project::{PruneWeightsPreviewRow, PruneWeightsPreviewTarget};
use crate::rig::{
    local, poses, set_pose, zero, AutoWeightScope, BoneRename, BoneView, MeshView, Pose,
    PruneWeightsRequest, RegionView, RigEdit, SlotView, TransformMode, VertexView,
};
use fbones_format::minimal::{
    meshes::Vertex,
    scene::{MAX_SCENE_BONES, MAX_SCENE_VERTICES},
};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
#[path = "scene_affine_compensation.rs"]
mod affine_compensation;
#[path = "scene_compensation.rs"]
mod compensation;
#[path = "scene_parenting.rs"]
mod parenting;
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClippingView {
    pub end_slot: u64,
    pub convex: bool,
    pub inverse: bool,
    pub color: u32,
    pub weighted: bool,
    pub bones: Vec<u64>,
    pub vertices: Vec<VertexView>,
    pub edges: Vec<u32>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PathView {
    pub closed: bool,
    pub constant_speed: bool,
    pub color: u32,
    pub weighted: bool,
    pub bones: Vec<u64>,
    pub vertices: Vec<VertexView>,
    pub edges: Vec<u32>,
    pub lengths: Vec<f32>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentView {
    pub id: u64,
    pub slot: u64,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub region: Option<RegionView>,
    pub mesh: Option<MeshView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linked_mesh_source_id: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linked_mesh_inherits_timelines: Option<bool>,
    pub clipping: Option<ClippingView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<PathView>,
    pub image_available: bool,
    pub color: u32,
    pub sequence: Option<crate::animation_sequence::SettingsInput>,
    pub sequence_available_frames: Vec<u32>,
}
fn image_key(r: &Region) -> &str {
    if r.path.is_empty() {
        &r.name
    } else {
        &r.path
    }
}
fn mesh_view(m: &fbones_format::minimal::meshes::Mesh, ids: &[u64]) -> MeshView {
    MeshView {
        weighted: m.weighted,
        uvs: m.uvs.clone(),
        triangles: m.triangles.clone(),
        edges: m.edges.clone(),
        hull: m.hull,
        bones: m.bones.iter().map(|i| ids[*i]).collect(),
        vertices: m
            .vertices
            .iter()
            .map(|v| VertexView {
                weights: v.weights.clone(),
                positions: v.positions.clone(),
            })
            .collect(),
    }
}
fn region_view(r: &Region) -> RegionView {
    RegionView {
        image: image_key(r).into(),
        image_path: r.path.clone(),
        name: r.name.clone(),
        x: r.x,
        y: r.y,
        rotation: r.rotation,
        scale_x: r.scale_x,
        scale_y: r.scale_y,
        width: r.width,
        height: r.height,
    }
}
struct ResourceFrameRebase {
    images: bool,
    audio: bool,
    wire: Option<fbones_format::minimal::scene::SceneWire>,
}
pub(crate) struct ResourceRebase {
    images_root: String,
    audio_root: String,
    undo: Vec<ResourceFrameRebase>,
    redo: Vec<ResourceFrameRebase>,
}

pub(crate) struct AutoWeightWork {
    id: u64,
    attachment: SceneAttachment,
    bones: Vec<Bone>,
    world: Vec<Pose>,
    operation: AutoWeightOperation,
}

enum AutoWeightOperation {
    Attachment(crate::auto_weights::AutoScope),
    SlotMesh,
}

impl AutoWeightWork {
    pub(crate) fn solve(mut self) -> Result<SceneEdit, AppError> {
        let clear_vertex = match self.operation {
            AutoWeightOperation::Attachment(scope) => {
                auto_attachment_weights(&mut self.attachment, &self.bones, &self.world, &scope)?;
                if let Some(clip) = self.attachment.clipping() {
                    crate::clip_edit::validate_polygon(clip, &self.world)?;
                }
                true
            }
            AutoWeightOperation::SlotMesh => {
                // Match the slot command's legacy dormant-position policy.
                let mesh = self
                    .attachment
                    .mesh_mut()
                    .ok_or_else(|| invalid("Convert the image to a mesh first."))?;
                crate::auto_weights::apply(mesh, &self.bones, &self.world)?;
                false
            }
        };
        Ok(SceneEdit::ApplyAutoWeights {
            id: self.id,
            attachment: self.attachment,
            clear_vertex,
        })
    }
}

pub struct SceneRigHistory {
    pub history: SceneHistory,
}
impl SceneRigHistory {
    pub fn new(project: &SceneProject, saved: bool) -> Self {
        Self {
            history: SceneHistory::new(project.clone(), saved)
                .expect("new/open validated complete scene"),
        }
    }
    pub fn views(&self, bones: &[Bone]) -> Vec<BoneView> {
        bones
            .iter()
            .enumerate()
            .map(|(i, b)| BoneView {
                id: self.history.frame.bone_ids[i],
                parent: b.parent.map(|p| self.history.frame.bone_ids[p]),
                name: b.name.clone(),
                x: b.x,
                y: b.y,
                rotation: b.rotation,
                length: b.length,
                scale_x: b.scale_x,
                scale_y: b.scale_y,
                shear_x: b.shear_x,
                shear_y: b.shear_y,
                color: u32::from_be_bytes(b.color),
            })
            .collect()
    }
    pub fn slot_views(&self, p: &SceneProject, cache: &crate::images::ImageCache) -> Vec<SlotView> {
        let f = &self.history.frame;
        p.slots
            .iter()
            .enumerate()
            .map(|(s, slot)| {
                let attachments = slot
                    .attachments
                    .iter()
                    .enumerate()
                    .map(|(a, attachment)| {
                        let link = p.linked_mesh(AttachmentAddress {
                            slot: s,
                            attachment: a,
                        });
                        let mesh = attachment.mesh().map(|m| {
                            let mut view = mesh_view(m, &f.bone_ids);
                            if link.is_some() && !view.weighted {
                                view.bones[0] = f.bone_ids[slot.bone];
                            }
                            view
                        });
                        AttachmentView {
                            id: f.attachment_ids[s][a],
                            slot: f.slot_ids[s],
                            name: attachment.name().into(),
                            kind: match attachment {
                                SceneAttachment::Region(_) => "region",
                                SceneAttachment::Mesh(_) => "mesh",
                                SceneAttachment::Clipping(_) => "clipping",
                                SceneAttachment::Path(_) => "path",
                            },
                            region: attachment.image().map(region_view),
                            mesh,
                            linked_mesh_source_id: link.map(|link| {
                                f.attachment_ids[link.source.slot][link.source.attachment]
                            }),
                            linked_mesh_inherits_timelines: link.map(|link| link.inherit_timelines),
                            clipping: attachment.clipping().map(|c| ClippingView {
                                end_slot: f.slot_ids[c.end_slot.expect("validated endpoint")],
                                convex: c.convex,
                                inverse: c.inverse,
                                color: u32::from_be_bytes(c.color),
                                weighted: c.weighted,
                                bones: c.bones.iter().map(|i| f.bone_ids[*i]).collect(),
                                vertices: c
                                    .vertices
                                    .iter()
                                    .map(|v| VertexView {
                                        weights: v.weights.clone(),
                                        positions: v.positions.clone(),
                                    })
                                    .collect(),
                                edges: c.edges.clone(),
                            }),
                            path: attachment.path().map(|path| PathView {
                                closed: path.closed,
                                constant_speed: path.constant_speed,
                                color: u32::from_be_bytes(path.color),
                                weighted: path.weighted,
                                bones: path.bones.iter().map(|i| f.bone_ids[*i]).collect(),
                                vertices: path
                                    .vertices
                                    .iter()
                                    .map(|v| VertexView {
                                        weights: v.weights.clone(),
                                        positions: v.positions.clone(),
                                    })
                                    .collect(),
                                edges: path.edges.clone(),
                                lengths: path.lengths.iter().map(|length| length.get()).collect(),
                            }),
                            color: u32::from_be_bytes(p.attachment_color(AttachmentAddress {
                                slot: s,
                                attachment: a,
                            })),
                            sequence: crate::animation_sequence::settings(
                                p,
                                AttachmentAddress {
                                    slot: s,
                                    attachment: a,
                                },
                            )
                            .map(Into::into),
                            sequence_available_frames: crate::animation_sequence::available_frames(
                                p,
                                AttachmentAddress {
                                    slot: s,
                                    attachment: a,
                                },
                                cache,
                            ),
                            image_available: crate::animation_sequence::setup_available(
                                p,
                                AttachmentAddress {
                                    slot: s,
                                    attachment: a,
                                },
                                cache,
                            ),
                        }
                    })
                    .collect::<Vec<_>>();
                let active = slot.active_attachment.map(|a| &attachments[a]);
                SlotView {
                    id: f.slot_ids[s],
                    name: slot.name.clone(),
                    bone: f.bone_ids[slot.bone],
                    visible: active.is_some(),
                    color: u32::from_be_bytes(slot.color),
                    blend: slot.blend.as_str().into(),
                    tint_black: p.slot_dark_color(s).enabled,
                    dark_color: u32::from_be_bytes(p.slot_dark_color(s).color),
                    region: active.and_then(|a| a.region.clone()),
                    mesh: active.and_then(|a| a.mesh.clone()),
                    image_available: active.is_some_and(|a| a.image_available),
                    active_attachment_id: slot.active_attachment.map(|a| f.attachment_ids[s][a]),
                    attachments,
                }
            })
            .collect()
    }
    pub fn can_undo(&self) -> bool {
        self.history.can_undo()
    }
    pub fn can_redo(&self) -> bool {
        self.history.can_redo()
    }
    pub fn focus(&self) -> u64 {
        self.history.frame.focus.bone
    }
    pub fn slot_focus(&self) -> Option<u64> {
        self.history.frame.focus.slot
    }
    pub fn vertex_focus(&self) -> Option<usize> {
        self.history.frame.focus.vertex
    }
    pub fn attachment_focus(&self) -> Option<u64> {
        self.history.frame.focus.attachment
    }
    pub fn dirty(&self, _: &SceneProject) -> bool {
        self.history.dirty()
    }
    pub fn mark_saved(&mut self, project: &SceneProject) {
        self.history.frame.project = project.clone();
        self.history.mark_saved();
    }
    /// Prepare every history metadata change before filesystem replacement.
    pub(crate) fn prepare_resource_rebase(
        &self,
        old_images: &str,
        new_images: &str,
        old_audio: &str,
        new_audio: &str,
    ) -> Result<ResourceRebase, AppError> {
        let prepare = |frame: &SceneFrame| -> Result<ResourceFrameRebase, AppError> {
            let images = old_images != new_images && frame.project.images_root == old_images;
            let audio = old_audio != new_audio && frame.project.audio_root == old_audio;
            let wire = if images || audio {
                let mut project = frame.project.clone();
                if images {
                    project.images_root = new_images.into();
                }
                if audio {
                    project.audio_root = new_audio.into();
                }
                fbones_format::minimal::scene::normalize_wire_strings(&mut project)?;
                encode_scene_payload(&project)?;
                project.wire
            } else {
                frame.project.wire.clone()
            };
            Ok(ResourceFrameRebase {
                images,
                audio,
                wire,
            })
        };
        Ok(ResourceRebase {
            images_root: new_images.into(),
            audio_root: new_audio.into(),
            undo: self
                .history
                .undo
                .iter()
                .map(prepare)
                .collect::<Result<_, _>>()?,
            redo: self
                .history
                .redo
                .iter()
                .map(prepare)
                .collect::<Result<_, _>>()?,
        })
    }
    /// The Session holds its lock between preparing this plan and applying it.
    /// No fallible encoding/metadata work is allowed after the file is written.
    pub(crate) fn apply_resource_rebase(&mut self, plan: ResourceRebase) {
        debug_assert_eq!(self.history.undo.len(), plan.undo.len());
        debug_assert_eq!(self.history.redo.len(), plan.redo.len());
        let apply = |frame: &mut SceneFrame, prepared: ResourceFrameRebase| {
            if prepared.images {
                frame.project.images_root = plan.images_root.clone();
            }
            if prepared.audio {
                frame.project.audio_root = plan.audio_root.clone();
            }
            frame.project.wire = prepared.wire;
        };
        for (frame, prepared) in self.history.undo.iter_mut().zip(plan.undo) {
            apply(frame, prepared);
        }
        for (frame, prepared) in self.history.redo.iter_mut().zip(plan.redo) {
            apply(frame, prepared);
        }
    }
    pub fn apply(&mut self, project: &mut SceneProject, edit: RigEdit) -> Result<bool, AppError> {
        self.apply_in_pose(project, edit, None)
    }
    pub(crate) fn match_transform(
        &mut self,
        project: &mut SceneProject,
        id: u64,
        section: crate::transform_match::MatchSection,
        evaluated: &crate::solve::Evaluation,
    ) -> Result<bool, AppError> {
        let frame = self.history.frame();
        let index = frame.constraint_index(id)?;
        let Constraint::Transform(constraint) = &frame.project.constraints[index] else {
            return Err(invalid("Choose a Transform constraint to match."));
        };
        let matched =
            crate::transform_match::matched(&frame.project, constraint, evaluated, section)?;
        let changed = self.history.apply(SceneEdit::SetConstraint {
            id,
            constraint: Constraint::Transform(matched),
        })?;
        *project = self.history.frame.project.clone();
        Ok(changed)
    }
    pub(crate) fn apply_in_pose(
        &mut self,
        project: &mut SceneProject,
        edit: RigEdit,
        poses: Option<Vec<Pose>>,
    ) -> Result<bool, AppError> {
        let changed = self.history.apply(match edit {
            RigEdit::CreateSlot { bone, name } => SceneEdit::CreateSlot { bone, name },
            RigEdit::Undo => SceneEdit::Undo,
            RigEdit::Redo => SceneEdit::Redo,
            RigEdit::AddImage {
                bone,
                image,
                path,
                x,
                y,
                width,
                height,
            } => SceneEdit::AddImages {
                bone,
                slot: None,
                images: vec![ImagePlacement {
                    image,
                    path,
                    x,
                    y,
                    width,
                    height,
                }],
            },
            RigEdit::AddImages { bone, images } => SceneEdit::AddImages {
                bone,
                slot: None,
                images,
            },
            RigEdit::AddAttachments { bone, slot, images } => SceneEdit::AddImages {
                bone,
                slot: Some(slot),
                images,
            },
            RigEdit::SetActiveAttachment { slot, attachment } => {
                SceneEdit::SetActive { slot, attachment }
            }
            RigEdit::SetAttachmentColor { id, color } => {
                SceneEdit::SetAttachmentColor { id, color }
            }
            RigEdit::SetAttachmentSequence { id, sequence } => {
                SceneEdit::SetAttachmentSequence { id, sequence }
            }
            RigEdit::SetLinkedMeshInheritance {
                id,
                inherit_timelines,
            } => SceneEdit::SetLinkedMeshInheritance {
                id,
                inherit_timelines,
            },
            RigEdit::CreateLinkedMesh { source, slot, name } => {
                SceneEdit::CreateLinkedMesh { source, slot, name }
            }
            RigEdit::RenameAttachment { id, name } => SceneEdit::RenameAttachment { id, name },
            RigEdit::DeleteAttachment { id } => SceneEdit::DeleteAttachment { id },
            RigEdit::ReorderSlot { id, index } => SceneEdit::ReorderSlot { id, index },
            RigEdit::DeleteSlot { id } => SceneEdit::DeleteSlot { id },
            RigEdit::SetSlotDarkColor { id, enabled, color } => {
                SceneEdit::SetSlotDarkColor { id, enabled, color }
            }
            RigEdit::SetSlotColor { id, color } => SceneEdit::SetSlotColor {
                id,
                color: color.to_be_bytes(),
            },
            RigEdit::SetSlotBlend { id, blend } => SceneEdit::SetSlotBlend {
                id,
                blend: BlendMode::from_name(&blend)
                    .ok_or_else(|| invalid("Choose a known blend mode."))?,
            },
            RigEdit::SetImagesRoot { path } => SceneEdit::SetImagesRoot { path },
            edit if crate::animation::is_edit(&edit) => SceneEdit::Animation(edit),
            edit => {
                if let Some(poses) = poses {
                    SceneEdit::RigInPose { edit, poses }
                } else {
                    SceneEdit::Rig(edit)
                }
            }
        })?;
        *project = self.history.frame.project.clone();
        Ok(changed)
    }
    pub(crate) fn geometry_edit(edit: &RigEdit) -> bool {
        geometry_edit(edit)
    }

    pub(crate) fn scratch_for_prune_preview(&self) -> Self {
        Self {
            history: SceneHistory {
                frame: self.history.frame.clone(),
                undo: Vec::new(),
                redo: Vec::new(),
                saved: None,
                encoded: self.history.encoded.clone(),
                saved_encoded: None,
                stored_animation: None,
                offset_basis: None,
                ids: self.history.ids,
            },
        }
    }

    pub(crate) fn preview_prune_weights(
        mut self,
        request: PruneWeightsRequest,
        frozen: Option<Vec<Pose>>,
    ) -> Result<(usize, Vec<PruneWeightsPreviewTarget>), AppError> {
        let ids: Vec<_> = request.targets.iter().map(|target| target.id).collect();
        let edit = RigEdit::PruneAttachmentWeights { request };
        let candidate = match frozen {
            Some(poses) => SceneEdit::RigInPose { edit, poses },
            None => SceneEdit::Rig(edit),
        };
        if !self.history.apply(candidate)? {
            return Ok((0, Vec::new()));
        }
        // The scratch transaction records the exact unchanged baseline rows.
        let before = self
            .history
            .undo
            .last()
            .expect("changed Prune has an undo frame");
        let mut removed = 0;
        let mut targets = Vec::new();
        for id in ids {
            let original = attachment_weight_rows(before.attachment(id)?)?;
            let pruned = attachment_weight_rows(self.history.frame.attachment(id)?)?;
            let mut rows = Vec::new();
            for (vertex, (old, new)) in original.iter().zip(pruned).enumerate() {
                if old
                    .weights
                    .iter()
                    .zip(&new.weights)
                    .any(|(a, b)| a.to_bits() != b.to_bits())
                {
                    removed += old
                        .weights
                        .iter()
                        .zip(&new.weights)
                        .filter(|(a, b)| **a > 0.0 && **b == 0.0)
                        .count();
                    rows.push(PruneWeightsPreviewRow {
                        vertex,
                        weights: new.weights.clone(),
                    });
                }
            }
            if !rows.is_empty() {
                targets.push(PruneWeightsPreviewTarget { id, rows });
            }
        }
        Ok((removed, targets))
    }

    pub(crate) fn prepare_auto_weights(
        &self,
        edit: RigEdit,
        frozen: Option<Vec<Pose>>,
    ) -> Result<AutoWeightWork, AppError> {
        let frame = self.history.frame();
        let bones = &frame.project.rig.bones;
        let world = frozen.unwrap_or_else(|| poses(bones));
        if world.len() != bones.len() {
            return Err(invalid(
                "This frozen pose may only be used for geometry edits.",
            ));
        }
        let (address, operation) = match &edit {
            RigEdit::AutoAttachmentWeights { id, scope } => (
                frame.attachment_address(*id)?,
                AutoWeightOperation::Attachment(resolve_auto_scope(frame, scope.as_ref())?),
            ),
            _ => {
                let address =
                    mesh_address(frame, &edit)?.ok_or_else(|| invalid("Choose a mesh."))?;
                (address, AutoWeightOperation::SlotMesh)
            }
        };
        frame.require_editable_geometry(address)?;
        Ok(AutoWeightWork {
            id: frame.attachment_ids[address.slot][address.attachment],
            attachment: frame.project.slots[address.slot].attachments[address.attachment].clone(),
            bones: bones.clone(),
            world,
            operation,
        })
    }

    pub(crate) fn commit_auto_weights(
        &mut self,
        project: &mut SceneProject,
        edit: SceneEdit,
    ) -> Result<bool, AppError> {
        let changed = self.history.apply(edit)?;
        *project = self.history.frame.project.clone();
        Ok(changed)
    }

    pub fn attachment_address(&self, id: u64) -> Result<AttachmentAddress, AppError> {
        self.history.frame.attachment_address(id)
    }
}
fn resolve_active(f: &SceneFrame, slot: u64) -> Result<AttachmentAddress, AppError> {
    let s = f.slot_index(slot)?;
    Ok(AttachmentAddress {
        slot: s,
        attachment: f.project.slots[s].active_attachment.ok_or_else(|| {
            invalid("The slot has no active attachment. Select an inventory attachment.")
        })?,
    })
}
fn mesh_id(edit: &RigEdit) -> Option<u64> {
    match edit {
        RigEdit::ReplaceMesh { id, .. }
        | RigEdit::ConvertMesh { id }
        | RigEdit::MoveMesh { id, .. }
        | RigEdit::MoveVertex { id, .. }
        | RigEdit::MoveVertices { id, .. }
        | RigEdit::MeshStroke { id, .. }
        | RigEdit::PaintWeights { id, .. }
        | RigEdit::AddVertex { id, .. }
        | RigEdit::DeleteVertex { id, .. }
        | RigEdit::MeshEdge { id, .. }
        | RigEdit::TriangulateMesh { id }
        | RigEdit::ResetMesh { id }
        | RigEdit::BindMesh { id, .. }
        | RigEdit::AutoWeights { id }
        | RigEdit::NormalizeWeights { id }
        | RigEdit::SetWeight { id, .. } => Some(*id),
        _ => None,
    }
}

fn mesh_address(frame: &SceneFrame, edit: &RigEdit) -> Result<Option<AttachmentAddress>, AppError> {
    if let RigEdit::AttachmentEdit { id, edit } = edit {
        let slot = mesh_id(edit)
            .ok_or_else(|| invalid("Only image mesh edits can be wrapped in attachmentEdit."))?;
        let address = frame.attachment_address(*id)?;
        if slot != frame.slot_ids[address.slot] {
            return Err(invalid(
                "The inner mesh command must address the attachment owner slot.",
            ));
        }
        Ok(Some(address))
    } else {
        mesh_id(edit)
            .map(|id| resolve_active(frame, id))
            .transpose()
    }
}

pub(super) fn focus_binding(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    address: AttachmentAddress,
    clear_vertex: bool,
) {
    before.focus.bone = next.bone_ids[next.project.slots[address.slot].bone];
    before.focus.slot = Some(next.slot_ids[address.slot]);
    before.focus.attachment = Some(next.attachment_ids[address.slot][address.attachment]);
    if clear_vertex {
        before.focus.vertex = None;
    }
    next.focus = before.focus.clone();
}

fn resolve_auto_scope(
    frame: &SceneFrame,
    scope: Option<&AutoWeightScope>,
) -> Result<crate::auto_weights::AutoScope, AppError> {
    let Some(scope) = scope else {
        return Ok(crate::auto_weights::AutoScope::default());
    };
    let resolve = |ids: &[u64]| {
        ids.iter()
            .map(|id| frame.bone_index(*id))
            .collect::<Result<Vec<_>, _>>()
    };
    Ok(crate::auto_weights::AutoScope {
        vertices: scope.vertices.clone(),
        bones: scope.bones.as_deref().map(resolve).transpose()?,
        locked_bones: resolve(scope.locked_bones.as_deref().unwrap_or_default())?,
    })
}

fn auto_attachment_weights(
    attachment: &mut SceneAttachment,
    bones: &[Bone],
    world: &[Pose],
    scope: &crate::auto_weights::AutoScope,
) -> Result<(), AppError> {
    let (triangles, edges) = match &*attachment {
        SceneAttachment::Mesh(mesh) => (mesh.triangles.clone(), mesh.edges.clone()),
        SceneAttachment::Clipping(clip) => (
            vec![],
            (0..clip.vertices.len())
                .flat_map(|i| [i as u32, ((i + 1) % clip.vertices.len()) as u32])
                .collect(),
        ),
        _ => return Err(invalid("Choose a mesh or clipping attachment.")),
    };
    crate::auto_weights::apply_binding_scoped(
        dense_binding_mut(attachment)?,
        crate::auto_weights::BindingTopology {
            triangles: &triangles,
            edges: &edges,
        },
        bones,
        world,
        crate::binding::PositionPolicy::PreserveAll,
        scope,
    )
}

fn prune_attachment_weights(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    request: PruneWeightsRequest,
    world: &[Pose],
) -> Result<(), AppError> {
    if request.targets.is_empty() || request.targets.len() > MAX_SCENE_VERTICES / 3 {
        return Err(invalid("Choose existing weighted attachments to prune."));
    }
    let mut seen = HashSet::with_capacity(request.targets.len());
    let mut targets = Vec::with_capacity(request.targets.len());
    for target in request.targets {
        if !seen.insert(target.id) {
            return Err(invalid("Choose distinct attachments to prune."));
        }
        let address = next.attachment_address(target.id)?;
        next.require_editable_geometry(address)?;
        let locks = target
            .locked_bones
            .unwrap_or_default()
            .into_iter()
            .map(|id| next.bone_index(id))
            .collect::<Result<Vec<_>, _>>()?;
        targets.push((address, locks));
    }
    focus_binding(before, next, targets[0].0, true);
    for (address, locks) in targets {
        let attachment = &mut next.project.slots[address.slot].attachments[address.attachment];
        crate::binding::prune_weights(
            dense_binding_mut(attachment)?,
            world,
            &locks,
            request.max_influences,
            request.threshold,
        )?;
        if let Some(clip) = attachment.clipping() {
            crate::clip_edit::validate_polygon(clip, world)?;
        }
    }
    Ok(())
}

fn rename_bones(next: &mut SceneFrame, renames: &[BoneRename]) -> Result<(), AppError> {
    if renames.is_empty() || renames.len() > MAX_SCENE_BONES {
        return Err(invalid(&format!(
            "Choose 1–{MAX_SCENE_BONES} bones to rename."
        )));
    }
    let mut replacements = HashMap::with_capacity(renames.len());
    for rename in renames {
        let index = next.bone_index(rename.id)?;
        let name = rename.name.trim();
        if name.is_empty() || name.len() > 1024 {
            return Err(invalid(
                "Use nonempty bone names of at most 1024 UTF-8 bytes.",
            ));
        }
        if replacements.insert(index, name).is_some() {
            return Err(invalid("Choose each bone once."));
        }
    }
    // Validate the complete namespace before writing any row, including name swaps.
    let bones = &mut next.project.rig.bones;
    let mut names = HashSet::with_capacity(bones.len());
    for (index, bone) in bones.iter().enumerate() {
        if !names.insert(replacements.get(&index).copied().unwrap_or(&bone.name)) {
            return Err(invalid("Use a unique name for each bone."));
        }
    }
    for (index, name) in replacements {
        bones[index].name = name.to_owned();
    }
    Ok(())
}

pub(super) fn apply(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    ids: &mut Ids,
    edit: RigEdit,
    geometry_poses: Option<&[Pose]>,
) -> Result<(), AppError> {
    if let RigEdit::RenameBones { renames } = &edit {
        if geometry_poses.is_some() {
            return Err(AppError::new(
                "InvalidPose",
                "Bone names do not use an evaluated pose.",
            ));
        }
        return rename_bones(next, renames);
    }
    if matches!(
        &edit,
        RigEdit::Create { .. }
            | RigEdit::Update { .. }
            | RigEdit::SetBoneParentPosition { .. }
            | RigEdit::SetBoneLocalPosition { .. }
            | RigEdit::SetBoneWorldPosition { .. }
            | RigEdit::SetBoneWorldRotation { .. }
            | RigEdit::SetBoneColors { .. }
            | RigEdit::SetBoneColor { .. }
            | RigEdit::TransformBones { .. }
            | RigEdit::TranslateBoneWithCompensation { .. }
            | RigEdit::RotateBoneWithCompensation { .. }
            | RigEdit::ScaleBoneWithCompensation { .. }
            | RigEdit::ShearBoneWithCompensation { .. }
            | RigEdit::Length { .. }
            | RigEdit::Move { .. }
            | RigEdit::Tip { .. }
            | RigEdit::Reparent { .. }
            | RigEdit::Delete { .. }
    ) {
        next.focus.slot = None;
        next.focus.attachment = None;
        next.focus.vertex = None;
        next.focus.constraint = None;
    }
    let world = if let Some(p) = geometry_poses {
        if p.len() != next.project.rig.bones.len() || !geometry_edit(&edit) {
            return Err(invalid(
                "This frozen pose may only be used for geometry edits.",
            ));
        }
        p.to_vec()
    } else {
        poses(&next.project.rig.bones)
    };
    let mesh_topology = match &edit {
        RigEdit::GenerateMeshVertices { id } => Some((*id, None)),
        RigEdit::ReplaceMeshOutline { id, uvs } => Some((*id, Some(uvs.as_slice()))),
        _ => None,
    };
    if let Some((id, outline)) = mesh_topology {
        let address = next.attachment_address(id)?;
        next.require_editable_geometry(address)?;
        let mesh = next.project.slots[address.slot].attachments[address.attachment]
            .mesh_mut()
            .filter(|mesh| !mesh.weighted)
            .ok_or_else(|| {
                AppError::new(
                    "InvalidMesh",
                    "Choose an unweighted mesh to change its topology.",
                )
            })?;
        if next.project.animations.iter().any(|clip| {
            clip.deform_tracks
                .iter()
                .any(|track| track.attachment == address && !track.keys.is_empty())
        }) {
            return Err(AppError::new(
                "InvalidAnimation",
                "Clear this attachment's deformation keys before changing its topology.",
            ));
        }
        *mesh = if let Some(uvs) = outline {
            if !(mesh.image.width > 0.0 && mesh.image.height > 0.0) {
                return Err(AppError::new(
                    "InvalidMesh",
                    "Use a mesh with a positive stored image size to replace its outline.",
                ));
            }
            crate::mesh_edit::replace_outline(mesh, uvs)?
        } else {
            crate::mesh_edit::generate_vertices(mesh)?
        };
        focus_binding(before, next, address, true);
        return Ok(());
    }
    if let RigEdit::PruneAttachmentWeights { request } = edit {
        return prune_attachment_weights(before, next, request, &world);
    }
    let stable_bones = next.bone_ids.clone();
    let find = |id| {
        stable_bones
            .iter()
            .position(|i| *i == id)
            .ok_or_else(|| invalid("Choose an existing bone."))
    };
    let binding_id = match &edit {
        RigEdit::BindAttachment { id, .. }
        | RigEdit::UpdateAttachmentBindings { id }
        | RigEdit::SetAttachmentWeight { id, .. }
        | RigEdit::PaintAttachmentWeights { id, .. }
        | RigEdit::NormalizeAttachmentWeights { id, .. }
        | RigEdit::SmoothAttachmentWeights { id, .. }
        | RigEdit::SwapAttachmentWeights { id, .. }
        | RigEdit::PasteAttachmentWeights { id, .. }
        | RigEdit::AutoAttachmentWeights { id, .. } => Some(*id),
        _ => None,
    };
    if let Some(id) = binding_id {
        let address = next.attachment_address(id)?;
        next.require_editable_geometry(address)?;
        let owner = next.project.slots[address.slot].bone;
        focus_binding(before, next, address, true);
        let auto_scope = if let RigEdit::AutoAttachmentWeights { scope, .. } = &edit {
            Some(resolve_auto_scope(next, scope.as_ref())?)
        } else {
            None
        };
        let manual_locks = match &edit {
            RigEdit::SetAttachmentWeight { locked_bones, .. }
            | RigEdit::PaintAttachmentWeights { locked_bones, .. }
            | RigEdit::SmoothAttachmentWeights { locked_bones, .. }
            | RigEdit::SwapAttachmentWeights { locked_bones, .. }
            | RigEdit::PasteAttachmentWeights { locked_bones, .. }
            | RigEdit::NormalizeAttachmentWeights { locked_bones, .. } => locked_bones
                .as_deref()
                .unwrap_or(&[])
                .iter()
                .map(|id| next.bone_index(*id))
                .collect::<Result<Vec<_>, _>>()?,
            _ => vec![],
        };
        let attachment = &mut next.project.slots[address.slot].attachments[address.attachment];
        match edit {
            RigEdit::BindAttachment { bones, .. } => {
                let bound = bones.into_iter().map(find).collect::<Result<Vec<_>, _>>()?;
                crate::binding::set_membership(
                    dense_binding_mut(attachment)?,
                    bound,
                    owner,
                    &world,
                )?;
            }
            RigEdit::UpdateAttachmentBindings { .. } => {
                crate::binding::update_bindings(dense_binding_mut(attachment)?, &world)?;
            }
            RigEdit::SetAttachmentWeight {
                vertex,
                bone,
                value,
                ..
            } => {
                let binding = dense_binding_mut(attachment)?;
                if !*binding.weighted {
                    return Err(invalid("Bind this attachment before editing weights."));
                }
                crate::binding::set_weight_locked(
                    binding,
                    vertex,
                    find(bone)?,
                    value,
                    &world,
                    &manual_locks,
                )?;
                before.focus.vertex = Some(vertex);
                next.focus.vertex = Some(vertex);
            }
            RigEdit::PaintAttachmentWeights { bone, changes, .. } => {
                let limit = if attachment.mesh().is_some() {
                    crate::mesh::MAX_VERTICES
                } else {
                    256
                };
                if changes.is_empty() || changes.len() > limit {
                    return Err(invalid(&format!(
                        "Choose 1–{limit} distinct weight changes."
                    )));
                }
                let bone = find(bone)?;
                let mut seen = std::collections::HashSet::new();
                for change in changes {
                    if !seen.insert(change.vertex) {
                        return Err(invalid("Duplicate vertex in brush stroke."));
                    }
                    let binding = dense_binding_mut(attachment)?;
                    if !*binding.weighted {
                        return Err(invalid("Bind this attachment before painting weights."));
                    }
                    crate::binding::set_weight_locked(
                        binding,
                        change.vertex,
                        bone,
                        change.value,
                        &world,
                        &manual_locks,
                    )?;
                }
            }
            RigEdit::NormalizeAttachmentWeights { .. } => crate::binding::normalize_locked(
                dense_binding_mut(attachment)?,
                &world,
                &manual_locks,
            )?,
            RigEdit::SmoothAttachmentWeights { vertices, .. } => {
                let mesh = attachment
                    .mesh_mut()
                    .ok_or_else(|| invalid("Choose a mesh to smooth its weights."))?;
                crate::binding::smooth_mesh(mesh, &world, vertices.as_deref(), &manual_locks)?;
            }
            RigEdit::SwapAttachmentWeights {
                bones: [first, second],
                ..
            } => {
                crate::binding::swap_weights(
                    dense_binding_mut(attachment)?,
                    [find(first)?, find(second)?],
                    &world,
                    &manual_locks,
                )?;
            }
            RigEdit::PasteAttachmentWeights { bones, rows, .. } => {
                let source_bones = bones.into_iter().map(find).collect::<Result<Vec<_>, _>>()?;
                crate::binding::paste_weights(
                    dense_binding_mut(attachment)?,
                    &world,
                    &source_bones,
                    &rows,
                    &manual_locks,
                )?;
            }
            RigEdit::AutoAttachmentWeights { .. } => {
                auto_attachment_weights(
                    attachment,
                    &next.project.rig.bones,
                    &world,
                    &auto_scope.expect("Auto scope resolved before attachment mutation"),
                )?;
            }
            _ => unreachable!(),
        }
        if let Some(clip) = attachment.clipping() {
            crate::clip_edit::validate_polygon(clip, &world)?;
        }
        return Ok(());
    }
    let address = mesh_address(next, &edit)?;
    let edit = match edit {
        RigEdit::AttachmentEdit { edit, .. } => *edit,
        edit => edit,
    };
    if let Some(address) = address {
        next.require_editable_geometry(address)?;
        let owner = next.project.slots[address.slot].bone;
        focus_binding(before, next, address, false);
        let attachment = &mut next.project.slots[address.slot].attachments[address.attachment];
        if let RigEdit::ReplaceMesh { mesh, .. } = edit {
            *attachment = SceneAttachment::Mesh(mesh);
            next.focus.vertex = None;
        } else if matches!(edit, RigEdit::ConvertMesh { .. }) {
            if attachment.mesh().is_some() {
                return Ok(());
            }
            let image = attachment
                .image()
                .ok_or_else(|| invalid("Choose an image attachment to convert to a mesh."))?;
            let mesh = crate::mesh::from_region(image, owner);
            *attachment = SceneAttachment::Mesh(Box::new(mesh));
            next.focus.vertex = None;
        } else {
            let mesh = attachment
                .mesh_mut()
                .ok_or_else(|| invalid("Convert the image to a mesh first."))?;
            match edit {
                RigEdit::MoveMesh { dx, dy, .. } => {
                    crate::mesh::translate(mesh, [dx, dy], &world)?;
                    next.focus.vertex = None;
                }
                RigEdit::MoveVertex { vertex, x, y, .. } => {
                    before.focus.vertex = Some(vertex);
                    next.focus.vertex = Some(vertex);
                    crate::mesh::move_vertex(mesh, vertex, [x, y], &world)?;
                }
                RigEdit::MoveVertices {
                    vertices, edit_uvs, ..
                } => {
                    if vertices.is_empty() || vertices.len() > crate::mesh::MAX_VERTICES {
                        return Err(invalid(&format!(
                            "Choose 1–{} vertices.",
                            crate::mesh::MAX_VERTICES
                        )));
                    }
                    let mut seen = std::collections::HashSet::new();
                    if vertices.iter().any(|v| !seen.insert(v.vertex)) {
                        return Err(invalid("Duplicate vertex in drag."));
                    }
                    let targets: Vec<_> = vertices
                        .into_iter()
                        .map(|v| (v.vertex, [v.x, v.y]))
                        .collect();
                    crate::mesh_edit::move_vertices(mesh, &targets, &world, edit_uvs)?;
                }
                RigEdit::MeshStroke {
                    from,
                    points,
                    edit_uvs,
                    ..
                } => {
                    if points.is_empty() || points.len() > 256 {
                        return Err(invalid("Draw 1–256 points per stroke."));
                    }
                    let points: Vec<_> = points.into_iter().map(|p| [p.x, p.y]).collect();
                    next.focus.vertex = Some(crate::mesh_edit::stroke(
                        mesh, from, &points, &world, edit_uvs,
                    )?);
                }
                RigEdit::PaintWeights { bone, changes, .. } => {
                    if changes.is_empty() || changes.len() > crate::mesh::MAX_VERTICES {
                        return Err(invalid(&format!(
                            "Choose 1–{} weight changes.",
                            crate::mesh::MAX_VERTICES
                        )));
                    }
                    let bone = find(bone)?;
                    let mut seen = std::collections::HashSet::new();
                    for c in changes {
                        if !seen.insert(c.vertex) {
                            return Err(invalid("Duplicate vertex in brush stroke."));
                        }
                        crate::mesh::set_weight(mesh, c.vertex, bone, c.value, &world)?;
                    }
                }
                RigEdit::AddVertex {
                    x,
                    y,
                    edge_a,
                    edge_b,
                    ..
                } => {
                    if edge_a.is_some() != edge_b.is_some() {
                        return Err(invalid("Choose a complete edge."));
                    }
                    next.focus.vertex = Some(crate::mesh::add_vertex(
                        mesh,
                        [x, y],
                        edge_a.zip(edge_b).map(|(a, b)| [a, b]),
                        &world,
                    )?);
                }
                RigEdit::DeleteVertex { vertex, .. } => {
                    before.focus.vertex = Some(vertex);
                    crate::mesh::delete_vertex(mesh, vertex)?;
                    next.focus.vertex = Some(vertex.min(mesh.vertices.len() - 1));
                }
                RigEdit::MeshEdge { a, b, remove, .. } => {
                    before.focus.vertex = Some(a);
                    next.focus.vertex = Some(b);
                    crate::mesh::edge(mesh, a, b, remove)?
                }
                RigEdit::TriangulateMesh { .. } => {
                    crate::mesh_edit::retessellate(mesh, &world)?;
                }
                RigEdit::ResetMesh { .. } => {
                    if mesh.image.width <= 0.0 || mesh.image.height <= 0.0 {
                        return Err(invalid(
                            "A mesh with zero stored image size cannot be reset to a quad.",
                        ));
                    }
                    *mesh = fbones_format::minimal::meshes::quad(mesh.image.clone(), owner);
                    next.focus.vertex = None;
                }
                RigEdit::BindMesh { bones, .. } => {
                    let bound = bones.into_iter().map(find).collect::<Result<Vec<_>, _>>()?;
                    crate::mesh::bind(mesh, bound, owner, &next.project.rig.bones, &world)?;
                    if mesh.weighted {
                        crate::auto_weights::apply(mesh, &next.project.rig.bones, &world)?;
                    }
                }
                RigEdit::AutoWeights { .. } => {
                    crate::auto_weights::apply(mesh, &next.project.rig.bones, &world)?
                }
                RigEdit::NormalizeWeights { .. } => crate::mesh::normalize(mesh),
                RigEdit::SetWeight {
                    vertex,
                    bone,
                    value,
                    ..
                } => {
                    before.focus.vertex = Some(vertex);
                    next.focus.vertex = Some(vertex);
                    crate::mesh::set_weight(mesh, vertex, find(bone)?, value, &world)?;
                }
                _ => unreachable!(),
            }
        }
        return Ok(());
    }
    match edit {
        RigEdit::MoveAttachment { id, slot } => {
            move_attachment(before, next, id, slot, &world)?;
        }
        RigEdit::TransformAttachments {
            ids,
            mode,
            pivot_x,
            pivot_y,
            dx,
            dy,
            rotation,
            scale_x,
            scale_y,
        } => {
            transform_attachments(
                next,
                &ids,
                mode,
                [pivot_x, pivot_y],
                [dx, dy],
                rotation,
                [scale_x, scale_y],
                &world,
            )?;
        }
        RigEdit::SetRegionPosition { id, x, y } => {
            if (x.is_none() && y.is_none())
                || [x, y].into_iter().flatten().any(|value| {
                    !value.is_finite() || value.abs() > 1_000_000.0 || (value * 2.0).fract() != 0.0
                })
            {
                return Err(invalid(
                    "Choose at least one Region coordinate in half-unit steps within supported bounds.",
                ));
            }
            let address = next.attachment_address(id)?;
            let slot = &mut next.project.slots[address.slot];
            if slot.active_attachment != Some(address.attachment) {
                return Err(invalid("Choose the slot's active Region attachment."));
            }
            let SceneAttachment::Region(region) = &mut slot.attachments[address.attachment] else {
                return Err(invalid("Choose the slot's active Region attachment."));
            };
            if let Some(value) = x
                .map(|value| value as f32)
                .filter(|&value| value != region.x)
            {
                region.x = value;
            }
            if let Some(value) = y
                .map(|value| value as f32)
                .filter(|&value| value != region.y)
            {
                region.y = value;
            }
            before.focus.bone = next.bone_ids[slot.bone];
            before.focus.slot = Some(next.slot_ids[address.slot]);
            before.focus.attachment = Some(id);
            before.focus.vertex = None;
            next.focus = before.focus.clone();
        }
        edit @ (RigEdit::MoveClippingVertices { id, .. }
        | RigEdit::InsertClippingVertex { id, .. }
        | RigEdit::DeleteClippingVertex { id, .. }) => {
            let a = next.attachment_address(id)?;
            let owner = next.project.slots[a.slot].bone;
            before.focus.bone = next.bone_ids[owner];
            before.focus.slot = Some(next.slot_ids[a.slot]);
            before.focus.attachment = Some(id);
            next.focus = before.focus.clone();
            let c = next.project.slots[a.slot].attachments[a.attachment]
                .clipping_mut()
                .ok_or_else(|| invalid("Choose a clipping attachment."))?;
            match edit {
                RigEdit::MoveClippingVertices { vertices, .. } => {
                    crate::clip_edit::move_vertices(c, &vertices, &world)?
                }
                RigEdit::InsertClippingVertex { index, point, .. } => {
                    crate::clip_edit::insert_vertex(c, index, &point, &world)?;
                    next.focus.vertex = Some(index);
                }
                RigEdit::DeleteClippingVertex { vertex, .. } => {
                    crate::clip_edit::delete_vertex(c, vertex, &world)?;
                    next.focus.vertex = None;
                }
                _ => unreachable!(),
            }
        }
        RigEdit::AddConstraint { constraint } => {
            let c = constraint.build(next)?;
            next.project.constraints.push(c);
            let id = allocate(&mut ids.constraint)?;
            next.constraint_ids.push(id);
            next.focus.constraint = Some(id);
        }
        RigEdit::AddPhysicsToBones { bones } => {
            next.add_physics_to_bones(ids, &bones)?;
        }
        RigEdit::UpdateConstraint { id, constraint } => {
            let i = next.constraint_index(id)?;
            next.project.constraints[i] =
                constraint.build_update(next, &next.project.constraints[i])?;
            next.focus.constraint = Some(id);
        }
        RigEdit::PatchConstraints { ids, field, value } => {
            crate::scene_constraint_batch::apply(next, &ids, field, value)?;
        }
        RigEdit::SetTransformRange { id, index, bits } => {
            let i = next.constraint_index(id)?;
            let Constraint::Transform(constraint) = &next.project.constraints[i] else {
                return Err(invalid("Choose a Transform constraint to edit its ranges."));
            };
            let constraint = crate::transform_ranges::edited(constraint, index, bits)?;
            next.project.constraints[i] = Constraint::Transform(constraint);
            next.focus.constraint = Some(id);
        }
        RigEdit::MatchTransform { .. } => {
            return Err(invalid(
                "Match requires a current evaluated authoring context.",
            ));
        }
        RigEdit::DeleteConstraint { id } => {
            let i = next.constraint_index(id)?;
            next.project.constraints.remove(i);
            next.constraint_ids.remove(i);
            if next.focus.constraint == Some(id) {
                next.focus.constraint = None;
            }
        }
        RigEdit::ReorderConstraint { id, index } => {
            let i = next.constraint_index(id)?;
            if index >= next.constraint_ids.len() {
                return Err(invalid("Choose a valid constraint order."));
            }
            let c = next.project.constraints.remove(i);
            next.project.constraints.insert(index, c);
            let id = next.constraint_ids.remove(i);
            next.constraint_ids.insert(index, id);
        }
        RigEdit::CreateClipping {
            slot,
            name,
            end_slot,
            vertices,
            convex,
            inverse,
        } => {
            let s = next.slot_index(slot)?;
            let end = next.slot_index(end_slot)?;
            let owner = next.project.slots[s].bone;
            let inv = world[owner].inverse()?;
            if !(3..=256).contains(&vertices.len()) {
                return Err(invalid("Use 3–256 clipping vertices."));
            }
            if vertices.iter().any(|v| {
                !v.x.is_finite()
                    || !v.y.is_finite()
                    || v.x.abs() > 1_000_000.0
                    || v.y.abs() > 1_000_000.0
            }) {
                return Err(invalid(
                    "Use finite clipping points within supported bounds.",
                ));
            }
            let n = vertices.len();
            let vertices = vertices
                .into_iter()
                .map(|v| {
                    let p = inv.point(v.x, v.y);
                    fbones_format::minimal::meshes::Vertex {
                        weights: vec![1.0],
                        positions: vec![p.0, p.1],
                    }
                })
                .collect();
            let c = fbones_format::minimal::scene::Clipping {
                name,
                end_slot: Some(end),
                convex,
                inverse,
                color: [58, 112, 255, 255],
                weighted: false,
                bones: vec![owner],
                vertices,
                edges: (0..n)
                    .flat_map(|i| [i as u32, ((i + 1) % n) as u32])
                    .collect(),
            };
            crate::clip_edit::validate_polygon(&c, &world)?;
            let a = next.project.slots[s].attachments.len();
            next.project.slots[s]
                .attachments
                .push(SceneAttachment::Clipping(c));
            next.project.slots[s].active_attachment = Some(a);
            let id = allocate(&mut ids.attachment)?;
            next.attachment_ids[s].push(id);
            next.project.attachment_order.push(AttachmentAddress {
                slot: s,
                attachment: a,
            });
            next.focus.attachment = Some(id);
            next.focus.slot = Some(slot);
        }
        RigEdit::SetClipping {
            id,
            end_slot,
            convex,
            inverse,
            color,
        } => {
            let end = next.slot_index(end_slot)?;
            let a = next.attachment_address(id)?;
            let c = next.project.slots[a.slot].attachments[a.attachment]
                .clipping_mut()
                .ok_or_else(|| invalid("Choose a clipping attachment."))?;
            c.end_slot = Some(end);
            c.convex = convex;
            c.inverse = inverse;
            c.color = color.to_be_bytes();
        }
        RigEdit::SetBoneColors { colors } => {
            if colors.is_empty() || colors.len() > MAX_SCENE_BONES {
                return Err(invalid(&format!("Choose 1–{MAX_SCENE_BONES} bone colors.")));
            }
            let mut seen = std::collections::HashSet::new();
            for c in &colors {
                if !seen.insert(c.id) {
                    return Err(invalid("Choose each bone once."));
                }
                let i = find(c.id)?;
                next.project.rig.bones[i].color = c.color.to_be_bytes();
            }
            before.focus.bone = colors[0].id;
            next.focus.bone = colors[0].id;
        }
        RigEdit::SetBoneColor { id, color } => {
            let i = find(id)?;
            next.project.rig.bones[i].color = color.to_be_bytes();
            before.focus.bone = id;
            next.focus.bone = id;
        }
        RigEdit::TransformBones {
            individual,
            local_axes,
            ids,
            mode,
            pivot_x,
            pivot_y,
            dx,
            dy,
            rotation,
            scale_x,
            scale_y,
            shear_x,
            shear_y,
        } => {
            if ids.is_empty()
                || ids.len() > MAX_SCENE_BONES
                || [
                    pivot_x, pivot_y, dx, dy, rotation, scale_x, scale_y, shear_x, shear_y,
                ]
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
            {
                return Err(invalid("Choose bones and finite transforms."));
            }
            if local_axes && !matches!(mode, TransformMode::Scale) {
                return Err(invalid("Local-axis factors are supported by Scale only."));
            }
            if local_axes && (scale_x.abs() < 1e-8 || scale_y.abs() < 1e-8) {
                return Err(invalid("Use nonzero scale factors."));
            }
            let selected = ids
                .iter()
                .map(|id| find(*id))
                .collect::<Result<std::collections::HashSet<_>, _>>()?;
            let top: Vec<_> = selected
                .iter()
                .copied()
                .filter(|i| {
                    let mut p = next.project.rig.bones[*i].parent;
                    while let Some(id) = p {
                        if selected.contains(&id) {
                            return false;
                        }
                        p = next.project.rig.bones[id].parent;
                    }
                    true
                })
                .collect();
            for i in top {
                if local_axes {
                    world[i].inverse()?;
                    let determinant =
                        (world[i].a * world[i].d - world[i].b * world[i].c) * scale_x * scale_y;
                    if !determinant.is_finite() || determinant.abs() < 1e-8 {
                        return Err(invalid(
                            "Scale factors would produce a singular bone transform.",
                        ));
                    }
                    next.project.rig.bones[i].scale_x *= scale_x;
                    next.project.rig.bones[i].scale_y *= scale_y;
                    continue;
                }
                let parent = next.project.rig.bones[i]
                    .parent
                    .map_or(zero(), |j| world[j]);
                if matches!(mode, TransformMode::Translate) {
                    (next.project.rig.bones[i].x, next.project.rig.bones[i].y) =
                        local(parent, world[i].x + dx, world[i].y + dy)?;
                } else {
                    let angle = rotation.to_radians();
                    let (sin, cos) = angle.sin_cos();
                    let (a, b, c, d) = match mode {
                        TransformMode::Scale => (scale_x, 0.0, 0.0, scale_y),
                        TransformMode::Shear => {
                            let x = shear_x.to_radians();
                            let y = shear_y.to_radians();
                            (x.cos(), x.sin(), -y.sin(), y.cos())
                        }
                        _ => (cos, sin, -sin, cos),
                    };
                    let (px, py) = if individual || matches!(mode, TransformMode::Pose) {
                        (world[i].x, world[i].y)
                    } else {
                        (pivot_x, pivot_y)
                    };
                    let transform = Pose {
                        x: px - a * px - c * py,
                        y: py - b * px - d * py,
                        a,
                        b,
                        c,
                        d,
                        angle: rotation,
                    };
                    set_pose(
                        &mut next.project.rig.bones[i],
                        parent,
                        transform.compose(world[i]),
                    )?;
                }
            }
            before.focus.bone = ids[0];
            next.focus.bone = ids[0];
        }
        RigEdit::TranslateBoneWithCompensation {
            id,
            dx,
            dy,
            compensate_bones,
            compensate_images,
        } => compensation::translate(
            before,
            next,
            id,
            compensation::Translation::WorldDelta(dx, dy),
            compensate_bones,
            compensate_images,
        )?,
        RigEdit::RotateBoneWithCompensation {
            id,
            mode,
            angle,
            compensate_bones,
            compensate_images,
        } => affine_compensation::rotate(
            before,
            next,
            id,
            mode,
            angle,
            compensate_bones,
            compensate_images,
        )?,
        RigEdit::ScaleBoneWithCompensation {
            id,
            mode,
            x,
            y,
            compensate_bones,
            compensate_images,
        } => affine_compensation::scale(
            before,
            next,
            id,
            mode,
            [x, y],
            compensate_bones,
            compensate_images,
        )?,
        RigEdit::ShearBoneWithCompensation {
            id,
            mode,
            axis,
            angle,
            compensate_bones,
            compensate_images,
        } => affine_compensation::shear(
            before,
            next,
            id,
            mode,
            axis,
            angle,
            compensate_bones,
            compensate_images,
        )?,
        RigEdit::Length { id, x, y } => {
            let i = find(id)?;
            let p = world[i];
            let axis = p.a.hypot(p.b);
            if axis < 1e-8 {
                return Err(invalid("Use nonzero X scale before changing length."));
            }
            let a = p.angle.to_radians();
            next.project.rig.bones[i].length =
                (((x - p.x) * a.cos() + (y - p.y) * a.sin()) / axis).max(0.0);
            before.focus.bone = id;
            next.focus.bone = id;
        }

        RigEdit::Create {
            color,
            parent,
            x,
            y,
            rotation,
            length,
        } => {
            if next.project.rig.bones.len() >= MAX_SCENE_BONES {
                return Err(invalid(&format!(
                    "This profile supports up to {MAX_SCENE_BONES} bones."
                )));
            }
            let parent_index = find(parent)?;
            let name = (1..)
                .map(|i| format!("bone{i}"))
                .find(|n| next.project.rig.bones.iter().all(|b| b.name != *n))
                .unwrap();
            next.project.rig.bones.push(Bone {
                name,
                parent: Some(parent_index),
                x,
                y,
                rotation,
                length,
                color: color.map(u32::to_be_bytes).unwrap_or([155, 155, 155, 255]),
                ..Bone::root()
            });
            next.bone_ids.push(ids.bone);
            next.focus.bone = ids.bone;
            before.focus.bone = parent;
        }
        RigEdit::Update {
            id,
            name,
            x,
            y,
            rotation,
            length,
            scale_x,
            scale_y,
            shear_x,
            shear_y,
        } => {
            let index = find(id)?;
            before.focus.bone = id;
            next.focus.bone = id;
            next.project.rig.bones[index] = Bone {
                name: name.trim().into(),
                parent: next.project.rig.bones[index].parent,
                x,
                y,
                rotation,
                length,
                scale_x: scale_x.unwrap_or(next.project.rig.bones[index].scale_x),
                scale_y: scale_y.unwrap_or(next.project.rig.bones[index].scale_y),
                shear_x: shear_x.unwrap_or(next.project.rig.bones[index].shear_x),
                shear_y: shear_y.unwrap_or(next.project.rig.bones[index].shear_y),
                ..next.project.rig.bones[index].clone()
            };
        }
        RigEdit::SetBoneParentPosition {
            id,
            x,
            y,
            compensate_bones,
            compensate_images,
        } => {
            let index = find(id)?;
            if (x.is_none() && y.is_none())
                || [x, y]
                    .into_iter()
                    .flatten()
                    .any(|value| !value.is_finite() || value.abs() > 1_000_000.0)
            {
                return Err(invalid(
                    "Choose at least one finite parent-space coordinate within ±1,000,000.",
                ));
            }
            if compensate_bones || compensate_images {
                compensation::translate(
                    before,
                    next,
                    id,
                    compensation::Translation::ParentPosition(x, y),
                    compensate_bones,
                    compensate_images,
                )?;
            } else {
                let bone = &mut next.project.rig.bones[index];
                if let Some(x) = x {
                    bone.x = x;
                }
                if let Some(y) = y {
                    bone.y = y;
                }
                before.focus.bone = id;
                next.focus.bone = id;
            }
        }
        RigEdit::SetBoneLocalPosition {
            id,
            x,
            y,
            compensate_bones,
            compensate_images,
        } => compensation::translate(
            before,
            next,
            id,
            compensation::Translation::LocalPosition { x, y },
            compensate_bones,
            compensate_images,
        )?,
        RigEdit::SetBoneWorldPosition {
            id,
            axis,
            position,
            compensate_bones,
            compensate_images,
        } => compensation::translate(
            before,
            next,
            id,
            compensation::Translation::WorldPosition { axis, position },
            compensate_bones,
            compensate_images,
        )?,
        RigEdit::SetBoneWorldRotation {
            id,
            angle,
            compensate_bones,
            compensate_images,
        } => affine_compensation::set_world_rotation(
            before,
            next,
            id,
            angle,
            compensate_bones,
            compensate_images,
        )?,
        RigEdit::Move { id, x, y } => {
            let index = find(id)?;
            before.focus.bone = id;
            next.focus.bone = id;
            let parent = next.project.rig.bones[index]
                .parent
                .map(|p| world[p])
                .unwrap_or(zero());
            (
                next.project.rig.bones[index].x,
                next.project.rig.bones[index].y,
            ) = local(parent, x, y)?;
        }
        RigEdit::Tip { id, x, y } => {
            let index = find(id)?;
            before.focus.bone = id;
            next.focus.bone = id;
            let parent = next.project.rig.bones[index]
                .parent
                .map(|p| world[p])
                .unwrap_or(zero());
            let (tx, ty) = local(parent, x, y)?;
            let bone = &mut next.project.rig.bones[index];
            let (dx, dy) = (tx - bone.x, ty - bone.y);
            if bone.scale_x.abs() < 1e-8 {
                return Err(invalid("Use nonzero X scale."));
            }
            bone.length = dx.hypot(dy) / bone.scale_x.abs();
            bone.rotation = dy.atan2(dx).to_degrees()
                - bone.shear_x
                - if bone.scale_x < 0.0 { 180.0 } else { 0.0 };
        }
        RigEdit::Reparent { id, parent } => {
            let index = find(id)?;
            let parent_index = find(parent)?;
            if index == 0 {
                return Err(invalid("The root bone cannot be reparented."));
            }
            let mut ancestor = Some(parent_index);
            while let Some(i) = ancestor {
                if i == index {
                    return Err(invalid(
                        "A bone cannot be parented to itself or one of its descendants.",
                    ));
                }
                ancestor = next.project.rig.bones[i].parent;
            }
            if next.project.rig.bones[index].parent == Some(parent_index) {
                return Ok(());
            }
            before.focus.bone = id;
            next.focus.bone = id;
            let original = world[index];
            let bone = &mut next.project.rig.bones[index];
            bone.parent = Some(parent_index);
            set_pose(bone, world[parent_index], original)?;
            // Parent must precede child on the wire. Stable editor IDs
            // survive this reorder and history restoration.
            let mut order = vec![];
            fn visit(index: usize, bones: &[Bone], out: &mut Vec<usize>) {
                out.push(index);
                for child in 0..bones.len() {
                    if bones[child].parent == Some(index) {
                        visit(child, bones, out);
                    }
                }
            }
            visit(0, &next.project.rig.bones, &mut order);
            let indices: HashMap<_, _> = order
                .iter()
                .enumerate()
                .map(|(new, old)| (*old, new))
                .collect();
            next.project.rig.bones = order
                .iter()
                .map(|old| {
                    let mut b = next.project.rig.bones[*old].clone();
                    b.parent = b.parent.map(|p| indices[&p]);
                    b
                })
                .collect();
            next.bone_ids = order.iter().map(|old| next.bone_ids[*old]).collect();
        }
        RigEdit::ReparentSelection {
            bones,
            attachments,
            parent,
        } => {
            parenting::apply(before, next, ids, &bones, &attachments, parent, &world)?;
        }
        RigEdit::Delete { id } => {
            let index = find(id)?;
            if index == 0 {
                return Err(invalid("The root bone cannot be deleted."));
            }
            before.focus.bone = id;
            next.focus.bone = next.bone_ids[next.project.rig.bones[index].parent.unwrap()];
            let mut removed = vec![false; next.project.rig.bones.len()];
            for i in 0..next.project.rig.bones.len() {
                removed[i] =
                    i == index || next.project.rig.bones[i].parent.is_some_and(|p| removed[p]);
            }
            let kept: Vec<_> = (0..next.project.rig.bones.len())
                .filter(|i| !removed[*i])
                .collect();
            let indices: HashMap<_, _> = kept
                .iter()
                .enumerate()
                .map(|(new, old)| (*old, new))
                .collect();
            next.project.rig.bones = kept
                .iter()
                .map(|i| {
                    let mut b = next.project.rig.bones[*i].clone();
                    b.parent = b.parent.map(|p| indices[&p]);
                    b
                })
                .collect();
            next.bone_ids = kept.iter().map(|i| next.bone_ids[*i]).collect();
        }

        RigEdit::SetAttachmentImagePath { id, path } => {
            let address = next.attachment_address(id)?;
            let image = next.project.slots[address.slot].attachments[address.attachment]
                .image_mut()
                .ok_or_else(|| invalid("Choose an image attachment to edit its PNG path."))?;
            // The Session additionally requires this exact key in its loaded
            // image cache before staging. This lower boundary still protects
            // canonical portable keys for internal callers.
            let key = if path.is_empty() { &image.name } else { &path };
            if !crate::images::valid_image_stem(key) {
                return Err(invalid("Choose a portable PNG key from Images."));
            }
            if image.path == path {
                return Ok(());
            }
            image.path = path;
            let focus = SceneFocus {
                bone: next.bone_ids[next.project.slots[address.slot].bone],
                slot: Some(next.slot_ids[address.slot]),
                attachment: Some(id),
                ..Default::default()
            };
            before.focus = focus.clone();
            next.focus = focus;
        }
        RigEdit::UpdateAttachment {
            id,
            x,
            y,
            rotation,
            scale_x,
            scale_y,
        } => {
            let channels = [x, y, rotation, scale_x, scale_y];
            if channels.iter().all(Option::is_none) {
                return Err(invalid("Choose at least one image transform channel."));
            }
            if channels
                .iter()
                .flatten()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
            {
                return Err(invalid(
                    "Use finite image channels within supported bounds.",
                ));
            }
            let a = next.attachment_address(id)?;
            let attachment = &mut next.project.slots[a.slot].attachments[a.attachment];
            let sparse = channels.iter().any(Option::is_none);
            if sparse && !matches!(attachment, SceneAttachment::Region(_)) {
                return Err(invalid(
                    "Choose a Region to edit individual image transform channels.",
                ));
            }
            let r = attachment
                .image_mut()
                .ok_or_else(|| invalid("Choose an image attachment to edit its transform."))?;
            for (field, value) in [
                &mut r.x,
                &mut r.y,
                &mut r.rotation,
                &mut r.scale_x,
                &mut r.scale_y,
            ]
            .into_iter()
            .zip(channels)
            {
                if let Some(value) = value {
                    *field = value;
                }
            }
            next.focus.attachment = Some(id);
            next.focus.slot = Some(next.slot_ids[a.slot]);
            if sparse {
                // Undo restores the inspected Region, even when a sibling
                // was the last native focus. Bone focus remains independent.
                before.focus.attachment = next.focus.attachment;
                before.focus.slot = next.focus.slot;
                before.focus.vertex = None;
                next.focus.vertex = None;
            }
        }
        RigEdit::UpdateSlot {
            id,
            name,
            bone,
            visible,
            x,
            y,
            rotation,
            scale_x,
            scale_y,
        } => {
            update_slot(
                next,
                id,
                name,
                bone,
                visible,
                [x, y, rotation, scale_x, scale_y],
                &world,
            )?;
        }
        _ => return Err(invalid("Unsupported scene operation.")),
    }
    if next.bone_ids.contains(&ids.bone) {
        allocate(&mut ids.bone)?;
    }
    remap_bones(before, next)?;
    for b in &next.project.rig.bones {
        if b.length < 0.0
            || [
                b.x, b.y, b.rotation, b.length, b.scale_x, b.scale_y, b.shear_x, b.shear_y,
            ]
            .iter()
            .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
        {
            return Err(invalid(
                "Use finite bone channels within the supported bounds.",
            ));
        }
    }
    if poses(&next.project.rig.bones).iter().any(|p| {
        [p.x, p.y, p.a, p.b, p.c, p.d]
            .iter()
            .any(|v| !v.is_finite() || v.abs() > 1e12)
    }) {
        return Err(invalid("Bone transforms produce an invalid world pose."));
    }
    Ok(())
}
fn remap_bones(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    let map = before
        .bone_ids
        .iter()
        .map(|id| next.bone_ids.iter().position(|v| v == id))
        .collect::<Vec<_>>();
    let index = |i: usize| {
        map.get(i).copied().flatten().ok_or_else(||invalid("The bone is used by a slot, inactive attachment, constraint or animation. Reassign those references before deleting it."))
    };
    for animation in &mut next.project.animations {
        for track in &mut animation.tracks {
            track.bone = index(track.bone)?;
        }
        // Mode rows carry bone identities independently of owner/track order.
        // Keep surviving rows in their original order; ordinary dangling-key
        // deletion remains rejected above rather than dropping animation data.
        animation.split_modes.retain_mut(|row| {
            let fbones_format::minimal::scene::SplitModeConfig::Bone(row) = row else {
                return true;
            };
            if let Some(Some(bone)) = map.get(row.bone) {
                row.bone = *bone;
                true
            } else {
                false
            }
        });
    }
    for slot in &mut next.project.slots {
        slot.bone = index(slot.bone)?;
        for a in &mut slot.attachments {
            if let Some(m) = a.mesh_mut() {
                for b in &mut m.bones {
                    *b = index(*b)?;
                }
            }
            if let Some(c) = a.clipping_mut() {
                for b in &mut c.bones {
                    *b = index(*b)?;
                }
            }
            if let Some(path) = a.path_mut() {
                for bone in &mut path.bones {
                    *bone = index(*bone)?;
                }
            }
        }
    }
    for c in &mut next.project.constraints {
        match c {
            Constraint::Ik(c) => {
                c.target = index(c.target)?;
                for b in &mut c.bones {
                    *b = index(*b)?;
                }
            }
            Constraint::Transform(c) => {
                c.source = index(c.source)?;
                for b in &mut c.bones {
                    *b = index(*b)?;
                }
            }
            Constraint::Path(c) => {
                for bone in &mut c.bones {
                    *bone = index(*bone)?;
                }
            }
            Constraint::Physics(c) => c.bone = index(c.bone)?,
        }
    }
    Ok(())
}
fn update_slot(
    next: &mut SceneFrame,
    id: u64,
    name: String,
    bone: u64,
    visible: bool,
    channels: [f32; 5],
    world: &[Pose],
) -> Result<(), AppError> {
    if channels
        .iter()
        .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
    {
        return Err(invalid(
            "Use finite image channels within supported bounds.",
        ));
    }
    let s = next.slot_index(id)?;
    let bone = next.bone_index(bone)?;
    let slot = &mut next.project.slots[s];
    let old = slot.bone;
    slot.name = name.trim().into();
    if !visible {
        slot.active_attachment = None;
    } else if slot.active_attachment.is_none() && slot.attachments.len() == 1 {
        slot.active_attachment = Some(0);
    }
    if let Some(a) = slot.active_attachment {
        if slot.attachments[a].mesh().is_none() {
            if let Some(r) = slot.attachments[a].image_mut() {
                r.x = channels[0];
                r.y = channels[1];
                r.rotation = channels[2];
                r.scale_x = channels[3];
                r.scale_y = channels[4];
            }
        }
    }
    if old != bone {
        if slot.attachments.iter().any(|attachment| attachment.path().is_some()) {
            return Err(invalid(
                "A slot with an imported Path cannot change its owning bone.",
            ));
        }
        world[bone].inverse()?;
        for a in &mut slot.attachments {
            reparent_attachment(a, old, bone, world)?;
        }
        slot.bone = bone;
    }
    next.focus.slot = Some(id);
    next.focus.bone = next.bone_ids[bone];
    Ok(())
}
fn reparent_attachment(
    a: &mut SceneAttachment,
    old: usize,
    new: usize,
    world: &[Pose],
) -> Result<(), AppError> {
    if let Some(c) = a.clipping_mut() {
        if !c.weighted {
            let inv = world[new].inverse()?;
            for v in &mut c.vertices {
                let p = world[old].point(v.positions[0], v.positions[1]);
                let p = inv.point(p.0, p.1);
                v.positions = vec![p.0, p.1];
            }
            c.bones = vec![new];
        }
        return Ok(());
    }
    if let Some(m) = a.mesh_mut() {
        if !m.weighted {
            let points = crate::mesh::world_vertices(m, world);
            m.bones = vec![new];
            for (i, p) in points.into_iter().enumerate() {
                crate::mesh::set_vertex(m, i, p, world)?;
            }
        }
        return Ok(());
    }
    let r = a
        .image()
        .ok_or_else(|| invalid("This attachment cannot change its owning bone."))?;
    let mut m = crate::mesh::from_region(r, old);
    let points = crate::mesh::world_vertices(&m, world);
    let angle = r.rotation.to_radians();
    let local = Pose {
        x: r.x,
        y: r.y,
        a: angle.cos() * r.scale_x,
        b: angle.sin() * r.scale_x,
        c: -angle.sin() * r.scale_y,
        d: angle.cos() * r.scale_y,
        angle: r.rotation,
    };
    let new_pose = world[new].inverse()?.compose(world[old].compose(local));
    let sx = new_pose.a.hypot(new_pose.b);
    let sy = new_pose.c.hypot(new_pose.d);
    if sx < 1e-8
        || sy < 1e-8
        || (new_pose.a * new_pose.c + new_pose.b * new_pose.d).abs() > 1e-4 * sx * sy
    {
        m.bones = vec![new];
        for (i, p) in points.into_iter().enumerate() {
            crate::mesh::set_vertex(&mut m, i, p, world)?;
        }
        *a = SceneAttachment::Mesh(Box::new(m));
    } else {
        let r = a.image_mut().unwrap();
        r.x = new_pose.x;
        r.y = new_pose.y;
        r.rotation = new_pose.b.atan2(new_pose.a).to_degrees();
        r.scale_x = sx;
        r.scale_y = (new_pose.a * new_pose.d - new_pose.b * new_pose.c) / sx;
    }
    Ok(())
}
impl SceneRigHistory {
    pub fn constraint_views(&self) -> Vec<serde_json::Value> {
        use serde_json::json;
        let f = &self.history.frame;
        f.project.constraints.iter().enumerate().map(|(i,c)|{let id=f.constraint_ids[i];match c{
 Constraint::Ik(c)=>json!({"id":id,"order":i,"type":"ik","name":c.name,"bones":c.bones.iter().map(|b|f.bone_ids[*b]).collect::<Vec<_>>(),"target":f.bone_ids[c.target],"mix":c.mix,"softness":c.softness,"bendPositive":c.bend_positive,"compress":c.compress,"stretch":c.stretch}),
 Constraint::Transform(c)=>json!({"id":id,"order":i,"type":"transform","name":c.name,"source":f.bone_ids[c.source],"bones":c.bones.iter().map(|b|f.bone_ids[*b]).collect::<Vec<_>>(),"localSource":c.local_source,"localTarget":c.local_target,"additive":c.additive,"clamp":c.clamp,"offsets":c.offsets,"mix":c.mix,"editorRangeBits":c.editor_range_bits(),"editorRangeValues":crate::transform_ranges::resolved_endpoints(c).ok(),"properties":c.properties.iter().map(|p|json!({"property":constraint_input::property_name(p.property),"offset":p.offset,"to":p.to.iter().map(|t|json!({"property":constraint_input::property_name(t.property),"offset":t.offset,"max":t.max,"scale":t.scale})).collect::<Vec<_>>()})).collect::<Vec<_>>()}),
 Constraint::Path(c) => json!({
     "id": id, "order": i, "type": "path", "name": c.name,
     "bones": c.bones.iter().map(|&bone| f.bone_ids[bone]).collect::<Vec<_>>(),
     "slot": f.slot_ids[c.slot], "positionMode": c.position_mode.name(),
     "spacingMode": c.spacing_mode.name(), "rotateMode": c.rotate_mode.name(),
     "rotation": c.rotation, "position": c.position, "spacing": c.spacing,
     "mixRotate": c.mix_rotate, "mixX": c.mix_x, "mixY": c.mix_y,
 }),
 Constraint::Physics(c)=>{let(r,s)=c.angular.wire_bits();json!({"id":id,"order":i,"type":"physics","name":c.name,"bone":f.bone_ids[c.bone],"x":c.x,"y":c.y,"scaleX":c.scale_x,"rotate":if r==0x7fc00000{None}else{Some(f32::from_bits(r))},"shearX":f32::from_bits(s),"step":c.step,"inertia":c.inertia,"strength":c.strength,"damping":c.damping,"mass":c.mass,"wind":c.wind,"gravity":c.gravity,"mix":c.mix,"limit":c.limit,"globals":{"inertia":c.globals.inertia,"strength":c.globals.strength,"damping":c.globals.damping,"mass":c.globals.mass,"wind":c.globals.wind,"gravity":c.globals.gravity,"mix":c.globals.mix}})}
 }}).collect()
    }
}

pub(super) fn geometry_edit(edit: &RigEdit) -> bool {
    matches!(
        edit,
        RigEdit::TransformAttachments { .. }
            | RigEdit::SetRegionPosition { .. }
            | RigEdit::GenerateMeshVertices { .. }
            | RigEdit::ReplaceMeshOutline { .. }
            | RigEdit::BindAttachment { .. }
            | RigEdit::UpdateAttachmentBindings { .. }
            | RigEdit::SetAttachmentWeight { .. }
            | RigEdit::PaintAttachmentWeights { .. }
            | RigEdit::PasteAttachmentWeights { .. }
            | RigEdit::NormalizeAttachmentWeights { .. }
            | RigEdit::AutoAttachmentWeights { .. }
            | RigEdit::PruneAttachmentWeights { .. }
            | RigEdit::MoveAttachment { .. }
            | RigEdit::CreateClipping { .. }
            | RigEdit::AttachmentEdit { .. }
            | RigEdit::MoveClippingVertices { .. }
            | RigEdit::InsertClippingVertex { .. }
            | RigEdit::DeleteClippingVertex { .. }
    ) || mesh_id(edit).is_some()
}

fn attachment_weight_rows(attachment: &SceneAttachment) -> Result<&[Vertex], AppError> {
    match attachment {
        SceneAttachment::Mesh(mesh) => Ok(&mesh.vertices),
        SceneAttachment::Clipping(clip) => Ok(&clip.vertices),
        SceneAttachment::Region(_) | SceneAttachment::Path(_) => {
            Err(invalid("Choose a mesh or clipping attachment."))
        }
    }
}

fn dense_binding_mut(
    attachment: &mut SceneAttachment,
) -> Result<crate::binding::DenseBindingMut<'_>, AppError> {
    match attachment {
        SceneAttachment::Mesh(m) => Ok(crate::binding::DenseBindingMut {
            weighted: &mut m.weighted,
            bones: &mut m.bones,
            vertices: &mut m.vertices,
        }),
        SceneAttachment::Clipping(c) => Ok(crate::binding::DenseBindingMut {
            weighted: &mut c.weighted,
            bones: &mut c.bones,
            vertices: &mut c.vertices,
        }),
        SceneAttachment::Region(_) | SceneAttachment::Path(_) => {
            Err(invalid("Choose a mesh or clipping attachment."))
        }
    }
}

fn move_attachment(
    before: &mut SceneFrame,
    next: &mut SceneFrame,
    id: u64,
    slot: u64,
    world: &[Pose],
) -> Result<(), AppError> {
    let source = next.attachment_address(id)?;
    let destination = next.slot_index(slot)?;
    if source.slot == destination {
        return Ok(());
    }
    let attachment = &next.project.slots[source.slot].attachments[source.attachment];
    if attachment.path().is_some() {
        return Err(invalid("An imported Path cannot move to another slot."));
    }
    if next.project.slots[destination]
        .attachments
        .iter()
        .any(|candidate| candidate.name() == attachment.name())
    {
        return Err(invalid(
            "An attachment with this name already belongs to the destination slot. Rename it before moving.",
        ));
    }
    let old_owner = next.project.slots[source.slot].bone;
    let new_owner = next.project.slots[destination].bone;
    // Attachment inventory traversal is separate from slot draw order. Keep its
    // stable item order while every changed owning-slot address is rebuilt.
    let order = next
        .project
        .attachment_order
        .iter()
        .map(|address| next.attachment_ids[address.slot][address.attachment])
        .collect::<Vec<_>>();
    let mut attachment = next.project.slots[source.slot]
        .attachments
        .remove(source.attachment);
    next.attachment_ids[source.slot].remove(source.attachment);
    let source_slot = &mut next.project.slots[source.slot];
    source_slot.active_attachment = source_slot.active_attachment.and_then(|index| {
        if index == source.attachment {
            None
        } else {
            Some(index - usize::from(index > source.attachment))
        }
    });
    if old_owner != new_owner {
        reparent_attachment(&mut attachment, old_owner, new_owner, world)?;
    }
    // Explicit FBones policy: retain destination activation, including none.
    // Selecting the moved item must not replace a different rendered image.
    // Local inventory indices are reconstructed from global inventory order on
    // decode. Insert at that same rank so Save/reopen preserves typed addresses.
    let insertion = order
        .iter()
        .take_while(|candidate| **candidate != id)
        .filter(|candidate| next.attachment_ids[destination].contains(candidate))
        .count();
    next.project.slots[destination]
        .attachments
        .insert(insertion, attachment);
    next.attachment_ids[destination].insert(insertion, id);
    if let Some(active) = &mut next.project.slots[destination].active_attachment {
        if *active >= insertion {
            *active += 1;
        }
    }
    next.project.attachment_order = order
        .into_iter()
        .map(|id| next.attachment_address(id))
        .collect::<Result<Vec<_>, _>>()?;
    before.focus = SceneFocus {
        bone: next.bone_ids[old_owner],
        slot: Some(next.slot_ids[source.slot]),
        attachment: Some(id),
        ..SceneFocus::default()
    };
    next.focus = SceneFocus {
        bone: next.bone_ids[new_owner],
        slot: Some(slot),
        attachment: Some(id),
        ..SceneFocus::default()
    };
    Ok(())
}
#[allow(clippy::too_many_arguments)]
fn transform_attachments(
    next: &mut SceneFrame,
    ids: &[u64],
    mode: TransformMode,
    pivot: [f32; 2],
    delta: [f32; 2],
    rotation: f32,
    scale: [f32; 2],
    world: &[Pose],
) -> Result<(), AppError> {
    if ids.is_empty()
        || ids.len() > 512
        || [
            pivot[0], pivot[1], delta[0], delta[1], rotation, scale[0], scale[1],
        ]
        .iter()
        .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
    {
        return Err(invalid(
            "Choose attachments and finite bounded group channels.",
        ));
    }
    let (a, b, c, d) = match mode {
        TransformMode::Translate => (1.0, 0.0, 0.0, 1.0),
        TransformMode::Rotate => {
            let (s, c) = rotation.to_radians().sin_cos();
            (c, s, -s, c)
        }
        TransformMode::Scale => (scale[0], 0.0, 0.0, scale[1]),
        _ => {
            return Err(invalid(
                "Attachment groups support Translate, Rotate and Scale.",
            ))
        }
    };
    if (a * d - b * c).abs() < 1e-8 {
        return Err(invalid("Use a nonsingular attachment transform."));
    }
    let transform = Pose {
        x: pivot[0] - a * pivot[0] - c * pivot[1]
            + if matches!(mode, TransformMode::Translate) {
                delta[0]
            } else {
                0.0
            },
        y: pivot[1] - b * pivot[0] - d * pivot[1]
            + if matches!(mode, TransformMode::Translate) {
                delta[1]
            } else {
                0.0
            },
        a,
        b,
        c,
        d,
        angle: rotation,
    };
    let mut seen = std::collections::HashSet::new();
    let addresses = ids
        .iter()
        .map(|id| {
            if !seen.insert(*id) {
                return Err(invalid("Choose distinct attachments."));
            }
            next.attachment_address(*id)
        })
        .collect::<Result<Vec<_>, _>>()?;
    for address in addresses {
        next.require_editable_geometry(address)?;
        let owner = next.project.slots[address.slot].bone;
        let attachment = &mut next.project.slots[address.slot].attachments[address.attachment];
        if let Some(clip) = attachment.clipping_mut() {
            let points = crate::clip_edit::world_vertices(clip, world);
            let targets = points
                .into_iter()
                .enumerate()
                .map(|(vertex, p)| {
                    let p = transform.point(p[0], p[1]);
                    crate::rig::VertexMove {
                        vertex,
                        x: p.0,
                        y: p.1,
                    }
                })
                .collect::<Vec<_>>();
            crate::clip_edit::move_vertices(clip, &targets, world)?;
            continue;
        }
        if let Some(mesh) = attachment.mesh_mut() {
            let points = crate::mesh::world_vertices(mesh, world);
            for (i, p) in points.into_iter().enumerate() {
                let p = transform.point(p[0], p[1]);
                crate::mesh::move_vertex(mesh, i, [p.0, p.1], world)?;
            }
            continue;
        }
        let r = attachment
            .image()
            .ok_or_else(|| invalid("Choose an image attachment."))?;
        let angle = r.rotation.to_radians();
        let local = Pose {
            x: r.x,
            y: r.y,
            a: angle.cos() * r.scale_x,
            b: angle.sin() * r.scale_x,
            c: -angle.sin() * r.scale_y,
            d: angle.cos() * r.scale_y,
            angle: r.rotation,
        };
        let pose = world[owner]
            .inverse()?
            .compose(transform.compose(world[owner].compose(local)));
        let sx = pose.a.hypot(pose.b);
        let sy = pose.c.hypot(pose.d);
        if sx < 1e-8 || sy < 1e-8 || (pose.a * pose.c + pose.b * pose.d).abs() > 1e-4 * sx * sy {
            let mut mesh = crate::mesh::from_region(r, owner);
            let points = crate::mesh::world_vertices(&mesh, world);
            for (i, p) in points.into_iter().enumerate() {
                let p = transform.point(p[0], p[1]);
                crate::mesh::move_vertex(&mut mesh, i, [p.0, p.1], world)?;
            }
            *attachment = SceneAttachment::Mesh(Box::new(mesh));
        } else {
            let r = attachment.image_mut().unwrap();
            r.x = pose.x;
            r.y = pose.y;
            r.rotation = pose.b.atan2(pose.a).to_degrees();
            r.scale_x = sx;
            r.scale_y = (pose.a * pose.d - pose.b * pose.c) / sx;
            if [r.x, r.y, r.rotation, r.scale_x, r.scale_y]
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
            {
                return Err(invalid(
                    "The group transform exceeds supported image channels.",
                ));
            }
        }
    }
    let address = next.attachment_address(ids[0])?;
    next.focus.bone = next.bone_ids[next.project.slots[address.slot].bone];
    next.focus.slot = Some(next.slot_ids[address.slot]);
    next.focus.attachment = Some(ids[0]);
    next.focus.vertex = None;
    Ok(())
}
