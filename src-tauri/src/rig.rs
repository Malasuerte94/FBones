use crate::project::AppError;
use fbones_format::minimal::regions::{encode_region_payload, Region, RegionProject, Slot};
use fbones_format::minimal::Bone;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[cfg(feature = "scene-editing")]
fn required_range_bits<'de, D>(deserializer: D) -> Result<Option<u32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Option::<u32>::deserialize(deserializer)
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoneView {
    pub id: u64,
    pub parent: Option<u64>,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub rotation: f32,
    pub length: f32,
    pub scale_x: f32,
    pub scale_y: f32,
    pub shear_x: f32,
    pub shear_y: f32,
    pub color: u32,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegionView {
    pub image: String,
    /// Authored override; empty falls back to the attachment name.
    pub image_path: String,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub rotation: f32,
    pub scale_x: f32,
    pub scale_y: f32,
    pub width: f32,
    pub height: f32,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SlotView {
    pub id: u64,
    pub name: String,
    pub bone: u64,
    pub visible: bool,
    pub color: u32,
    pub blend: String,
    pub tint_black: bool,
    pub dark_color: u32,
    pub region: Option<RegionView>,
    pub image_available: bool,
    pub mesh: Option<MeshView>,
    #[cfg(feature = "scene-editing")]
    pub attachments: Vec<crate::scene_edit::AttachmentView>,
    #[cfg(feature = "scene-editing")]
    pub active_attachment_id: Option<u64>,
}
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct VertexView {
    pub weights: Vec<f32>,
    pub positions: Vec<f32>,
}
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct MeshView {
    pub weighted: bool,
    pub uvs: Vec<f32>,
    pub triangles: Vec<u16>,
    pub edges: Vec<u32>,
    pub hull: usize,
    pub bones: Vec<u64>,
    pub vertices: Vec<VertexView>,
}

pub fn image_stem(region: &Region) -> &str {
    if region.path.is_empty() {
        &region.name
    } else {
        &region.path
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct VertexMove {
    pub vertex: usize,
    pub x: f32,
    pub y: f32,
}
#[derive(Clone, Debug, Deserialize)]
pub struct WeightChange {
    pub vertex: usize,
    pub value: f32,
}

/// Ephemeral Auto selection/protection, never a canonical project field.
/// Public bone values are stable session IDs; the Scene bridge resolves them.
#[cfg(feature = "scene-editing")]
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AutoWeightScope {
    pub vertices: Option<Vec<usize>>,
    pub bones: Option<Vec<u64>>,
    pub locked_bones: Option<Vec<u64>>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct WorldPoint {
    pub x: f32,
    pub y: f32,
}
#[derive(Clone, Debug, Deserialize)]
pub struct BoneColorEdit {
    pub id: u64,
    pub color: u32,
}
#[derive(Clone, Debug)]
pub struct ImagePlacement {
    pub image: String,
    pub path: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}
#[cfg(feature = "scene-editing")]
fn default_true() -> bool {
    true
}
#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum RigEdit {
    #[cfg(feature = "scene-editing")]
    SetAudioRoot {
        path: String,
    },
    #[cfg(feature = "scene-editing")]
    CreateEvent {
        name: String,
    },
    #[cfg(feature = "scene-editing")]
    RenameEvent {
        id: u64,
        name: String,
    },
    #[cfg(feature = "scene-editing")]
    UpdateEvent {
        id: u64,
        #[serde(flatten)]
        patch: crate::animation_events::EventPatch,
    },
    #[cfg(feature = "scene-editing")]
    DeleteEvent {
        id: u64,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationConstraintKeys {
        animation: u64,
        keys: Vec<crate::animation_constraints::ConstraintKeyInput>,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationSequenceKeys {
        animation: u64,
        keys: Vec<crate::animation_sequence::SequenceKeyInput>,
    },
    #[cfg(feature = "scene-editing")]
    SetSlotDarkColor {
        id: u64,
        enabled: bool,
        color: u32,
    },
    #[cfg(feature = "scene-editing")]
    SetAttachmentColor {
        id: u64,
        color: u32,
    },
    #[cfg(feature = "scene-editing")]
    SetAttachmentSequence {
        id: u64,
        sequence: Option<crate::animation_sequence::SettingsInput>,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationEventKeys {
        animation: u64,
        keys: Vec<crate::animation_events::EventKeyInput>,
    },
    #[cfg(feature = "scene-editing")]
    CreateAnimation {
        name: String,
    },
    #[cfg(feature = "scene-editing")]
    DuplicateAnimation {
        id: u64,
        name: String,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationFps {
        fps: f32,
    },
    #[cfg(feature = "scene-editing")]
    RenameAnimation {
        id: u64,
        name: String,
    },
    #[cfg(feature = "scene-editing")]
    DeleteAnimation {
        id: u64,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationKey {
        animation: u64,
        #[serde(flatten)]
        key: crate::animation::KeyInput,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationKeys {
        animation: u64,
        keys: Vec<crate::animation::KeyInput>,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationSlotKeys {
        animation: u64,
        keys: Vec<crate::animation_slots::SlotKeyInput>,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationKeyBatch {
        animation: u64,
        bone_keys: Vec<crate::animation::KeyInput>,
        slot_keys: Vec<crate::animation_slots::SlotKeyInput>,
        #[serde(default)]
        draw_order_keys: Vec<crate::animation_order::OrderKeyInput>,
        #[serde(default)]
        deform_keys: Vec<crate::animation_deform::DeformKeyInput>,
        #[serde(default)]
        constraint_keys: Vec<crate::animation_constraints::ConstraintKeyInput>,
        #[serde(default)]
        event_keys: Vec<crate::animation_events::EventKeyInput>,
        #[serde(default)]
        sequence_keys: Vec<crate::animation_sequence::SequenceKeyInput>,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationDrawOrderKeys {
        animation: u64,
        keys: Vec<crate::animation_order::OrderKeyInput>,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationDeformKeys {
        animation: u64,
        keys: Vec<crate::animation_deform::DeformKeyInput>,
    },
    #[cfg(feature = "scene-editing")]
    SetAnimationDeformVertices {
        animation: u64,
        attachment: u64,
        frame: f32,
        vertices: Vec<crate::animation_deform::WorldVertexMove>,
        #[serde(default)]
        curve: Option<crate::animation::CurveInput>,
        #[serde(default)]
        controls: Option<[f32; 4]>,
    },
    #[cfg(feature = "scene-editing")]
    DeleteAnimationKeys {
        animation: u64,
        keys: Vec<u64>,
    },
    #[cfg(feature = "scene-editing")]
    MoveAnimationKeys {
        animation: u64,
        keys: Vec<u64>,
        delta_frames: f32,
    },
    #[cfg(feature = "scene-editing")]
    BindAttachment {
        id: u64,
        bones: Vec<u64>,
    },
    #[cfg(feature = "scene-editing")]
    SetAttachmentWeight {
        id: u64,
        vertex: usize,
        bone: u64,
        value: f32,
        #[serde(default)]
        locked_bones: Option<Vec<u64>>,
    },
    #[cfg(feature = "scene-editing")]
    PaintAttachmentWeights {
        id: u64,
        bone: u64,
        changes: Vec<WeightChange>,
        #[serde(default)]
        locked_bones: Option<Vec<u64>>,
    },
    #[cfg(feature = "scene-editing")]
    NormalizeAttachmentWeights {
        id: u64,
        #[serde(default)]
        locked_bones: Option<Vec<u64>>,
    },
    #[cfg(feature = "scene-editing")]
    AutoAttachmentWeights {
        id: u64,
        #[serde(default)]
        scope: Option<AutoWeightScope>,
    },
    #[cfg(feature = "scene-editing")]
    TransformAttachments {
        ids: Vec<u64>,
        mode: TransformMode,
        pivot_x: f32,
        pivot_y: f32,
        dx: f32,
        dy: f32,
        rotation: f32,
        scale_x: f32,
        scale_y: f32,
    },
    #[cfg(feature = "scene-editing")]
    MoveClippingVertices {
        id: u64,
        vertices: Vec<VertexMove>,
    },
    #[cfg(feature = "scene-editing")]
    InsertClippingVertex {
        id: u64,
        index: usize,
        point: WorldPoint,
    },
    #[cfg(feature = "scene-editing")]
    DeleteClippingVertex {
        id: u64,
        vertex: usize,
    },
    #[cfg(feature = "scene-editing")]
    CreateSlot {
        bone: u64,
        name: Option<String>,
    },
    #[cfg(feature = "scene-editing")]
    CreateClipping {
        slot: u64,
        name: String,
        end_slot: u64,
        vertices: Vec<WorldPoint>,
        #[serde(default = "default_true")]
        convex: bool,
        #[serde(default)]
        inverse: bool,
    },
    #[cfg(feature = "scene-editing")]
    SetClipping {
        id: u64,
        end_slot: u64,
        convex: bool,
        inverse: bool,
        color: u32,
    },
    #[cfg(feature = "scene-editing")]
    AddConstraint {
        constraint: Box<crate::scene_edit::ConstraintInput>,
    },
    #[cfg(feature = "scene-editing")]
    AddPhysicsToBones {
        bones: Vec<u64>,
    },
    #[cfg(feature = "scene-editing")]
    UpdateConstraint {
        id: u64,
        constraint: Box<crate::scene_edit::ConstraintInput>,
    },
    #[cfg(feature = "scene-editing")]
    MatchTransform {
        id: u64,
        section: crate::transform_match::MatchSection,
    },
    #[cfg(feature = "scene-editing")]
    SetTransformRange {
        id: u64,
        index: usize,
        #[serde(deserialize_with = "required_range_bits")]
        bits: Option<u32>,
    },
    #[cfg(feature = "scene-editing")]
    DeleteConstraint {
        id: u64,
    },
    #[cfg(feature = "scene-editing")]
    ReorderConstraint {
        id: u64,
        index: usize,
    },
    #[cfg(feature = "scene-editing")]
    SetActiveAttachment {
        slot: u64,
        attachment: Option<u64>,
    },
    #[cfg(feature = "scene-editing")]
    RenameAttachment {
        id: u64,
        name: String,
    },
    #[cfg(feature = "scene-editing")]
    SetAttachmentImagePath {
        id: u64,
        path: String,
    },
    #[cfg(feature = "scene-editing")]
    DeleteAttachment {
        id: u64,
    },
    #[cfg(feature = "scene-editing")]
    MoveAttachment {
        id: u64,
        slot: u64,
    },
    #[cfg(feature = "scene-editing")]
    AttachmentEdit {
        id: u64,
        edit: Box<RigEdit>,
    },
    #[cfg(feature = "scene-editing")]
    UpdateAttachment {
        id: u64,
        x: f32,
        y: f32,
        rotation: f32,
        scale_x: f32,
        scale_y: f32,
    },
    #[cfg(feature = "scene-editing")]
    #[serde(skip_deserializing)]
    AddAttachments {
        bone: u64,
        slot: u64,
        images: Vec<ImagePlacement>,
    },
    Create {
        #[serde(default)]
        color: Option<u32>,
        parent: u64,
        x: f32,
        y: f32,
        rotation: f32,
        length: f32,
    },
    Update {
        id: u64,
        name: String,
        x: f32,
        y: f32,
        rotation: f32,
        length: f32,
        #[serde(default)]
        scale_x: Option<f32>,
        #[serde(default)]
        scale_y: Option<f32>,
        #[serde(default)]
        shear_x: Option<f32>,
        #[serde(default)]
        shear_y: Option<f32>,
    },
    SetImagesRoot {
        path: String,
    },
    SetBoneColors {
        colors: Vec<BoneColorEdit>,
    },
    SetBoneColor {
        id: u64,
        color: u32,
    },
    SetSlotColor {
        id: u64,
        color: u32,
    },
    SetSlotBlend {
        id: u64,
        blend: String,
    },
    TransformBones {
        #[serde(default)]
        individual: bool,
        #[serde(default)]
        local_axes: bool,
        ids: Vec<u64>,
        mode: TransformMode,
        pivot_x: f32,
        pivot_y: f32,
        dx: f32,
        dy: f32,
        rotation: f32,
        scale_x: f32,
        scale_y: f32,
        shear_x: f32,
        shear_y: f32,
    },
    Length {
        id: u64,
        x: f32,
        y: f32,
    },
    Move {
        id: u64,
        x: f32,
        y: f32,
    }, // World position of the origin.
    Tip {
        id: u64,
        x: f32,
        y: f32,
    }, // World position of the tip.
    Reparent {
        id: u64,
        parent: u64,
    },
    #[cfg(feature = "scene-editing")]
    ReparentSelection {
        #[serde(default)]
        bones: Vec<u64>,
        #[serde(default)]
        attachments: Vec<u64>,
        parent: u64,
    },
    Delete {
        id: u64,
    },
    #[serde(skip_deserializing)]
    AddImage {
        path: String,
        x: f32,
        y: f32,
        bone: u64,
        image: String,
        width: f32,
        height: f32,
    },
    #[serde(skip_deserializing)]
    AddImages {
        bone: u64,
        images: Vec<ImagePlacement>,
    },
    UpdateSlot {
        id: u64,
        name: String,
        bone: u64,
        visible: bool,
        x: f32,
        y: f32,
        rotation: f32,
        scale_x: f32,
        scale_y: f32,
    },
    ReorderSlot {
        id: u64,
        index: usize,
    },
    DeleteSlot {
        id: u64,
    },
    #[serde(skip_deserializing)]
    ReplaceMesh {
        id: u64,
        mesh: Box<fbones_format::minimal::meshes::Mesh>,
    },
    ConvertMesh {
        id: u64,
    },
    MoveMesh {
        id: u64,
        dx: f32,
        dy: f32,
    },
    MoveVertex {
        id: u64,
        vertex: usize,
        x: f32,
        y: f32,
    },
    MoveVertices {
        id: u64,
        vertices: Vec<VertexMove>,
        #[serde(default)]
        edit_uvs: bool,
    },
    MeshStroke {
        id: u64,
        from: Option<usize>,
        points: Vec<WorldPoint>,
        #[serde(default)]
        edit_uvs: bool,
    },
    PaintWeights {
        id: u64,
        bone: u64,
        changes: Vec<WeightChange>,
    },
    AddVertex {
        id: u64,
        x: f32,
        y: f32,
        edge_a: Option<usize>,
        edge_b: Option<usize>,
    },
    DeleteVertex {
        id: u64,
        vertex: usize,
    },
    MeshEdge {
        id: u64,
        a: usize,
        b: usize,
        remove: bool,
    },
    TriangulateMesh {
        id: u64,
    },
    ResetMesh {
        id: u64,
    },
    BindMesh {
        id: u64,
        bones: Vec<u64>,
    },
    AutoWeights {
        id: u64,
    },
    NormalizeWeights {
        id: u64,
    },
    SetWeight {
        id: u64,
        vertex: usize,
        bone: u64,
        value: f32,
    },
    Undo,
    Redo,
}

#[derive(Clone)]
#[cfg_attr(feature = "scene-editing", allow(dead_code))]
struct Frame {
    bones: Vec<Bone>,
    slots: Vec<Slot>,
    images_root: String,
    region_order: Vec<usize>,
    slot_ids: Vec<u64>,
    slot_focus: Option<u64>,
    vertex_focus: Option<usize>,
    ids: Vec<u64>,
    focus: u64,
}
#[cfg_attr(feature = "scene-editing", allow(dead_code))]
pub struct RigHistory {
    ids: Vec<u64>,
    next_id: u64,
    focus: u64,
    undo: Vec<Frame>,
    redo: Vec<Frame>,
    saved: Option<RegionProject>,
    slot_ids: Vec<u64>,
    next_slot_id: u64,
    slot_focus: Option<u64>,
    vertex_focus: Option<usize>,
}
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TransformMode {
    Translate,
    Rotate,
    Scale,
    Shear,
    Pose,
}
#[derive(Clone, Copy, Debug)]
pub struct Pose {
    pub x: f32,
    pub y: f32,
    pub angle: f32,
    pub a: f32,
    pub b: f32,
    pub c: f32,
    pub d: f32,
}
fn invalid(message: &str) -> AppError {
    AppError::new("InvalidBone", message)
}
pub(crate) fn zero() -> Pose {
    Pose {
        x: 0.0,
        y: 0.0,
        angle: 0.0,
        a: 1.0,
        b: 0.0,
        c: 0.0,
        d: 1.0,
    }
}
impl Pose {
    pub(crate) fn point(self, x: f32, y: f32) -> (f32, f32) {
        (
            self.x + self.a * x + self.c * y,
            self.y + self.b * x + self.d * y,
        )
    }
    pub(crate) fn compose(self, p: Pose) -> Pose {
        let (x, y) = self.point(p.x, p.y);
        let a = self.a * p.a + self.c * p.b;
        let b = self.b * p.a + self.d * p.b;
        Pose {
            x,
            y,
            a,
            b,
            c: self.a * p.c + self.c * p.d,
            d: self.b * p.c + self.d * p.d,
            angle: b.atan2(a).to_degrees(),
        }
    }
    pub(crate) fn inverse(self) -> Result<Pose, AppError> {
        let det = self.a * self.d - self.b * self.c;
        if !det.is_finite() || det.abs() < 1e-8 {
            return Err(invalid(
                "This transform cannot be inverted. Use nonzero scale and nonparallel bone axes.",
            ));
        }
        let a = self.d / det;
        let b = -self.b / det;
        let c = -self.c / det;
        let d = self.a / det;
        Ok(Pose {
            x: -a * self.x - c * self.y,
            y: -b * self.x - d * self.y,
            a,
            b,
            c,
            d,
            angle: b.atan2(a).to_degrees(),
        })
    }
}
pub(crate) fn poses(bones: &[Bone]) -> Vec<Pose> {
    let mut result: Vec<Pose> = Vec::with_capacity(bones.len());
    for b in bones {
        let (rx, ry) = (
            (b.rotation + b.shear_x).to_radians(),
            (b.rotation + b.shear_y).to_radians(),
        );
        let local = Pose {
            x: b.x,
            y: b.y,
            a: rx.cos() * b.scale_x,
            b: rx.sin() * b.scale_x,
            c: -ry.sin() * b.scale_y,
            d: ry.cos() * b.scale_y,
            angle: b.rotation,
        };
        result.push(b.parent.map_or(zero(), |i| result[i]).compose(local));
    }
    result
}
pub(crate) fn local(parent: Pose, x: f32, y: f32) -> Result<(f32, f32), AppError> {
    Ok(parent.inverse()?.point(x, y))
}
pub(crate) fn set_pose(bone: &mut Bone, parent: Pose, world: Pose) -> Result<(), AppError> {
    let p = parent.inverse()?.compose(world);
    bone.x = p.x;
    bone.y = p.y;
    let sx = if bone.scale_x < 0.0 { -1.0 } else { 1.0 };
    let sy = if bone.scale_y < 0.0 { -1.0 } else { 1.0 };
    let ax = (p.b * sx).atan2(p.a * sx).to_degrees();
    let ay = (-p.c * sy).atan2(p.d * sy).to_degrees();
    bone.rotation = ax - bone.shear_x;
    bone.scale_x = p.a.hypot(p.b) * sx;
    bone.scale_y = p.c.hypot(p.d) * sy;
    bone.shear_y = ay - bone.rotation;
    Ok(())
}

#[cfg_attr(feature = "scene-editing", allow(dead_code))]
impl RigHistory {
    pub fn vertex_focus(&self) -> Option<usize> {
        self.vertex_focus
    }
    pub fn slot_focus(&self) -> Option<u64> {
        self.slot_focus
    }
    pub fn slot_views(
        &self,
        project: &RegionProject,
        cache: &crate::images::ImageCache,
    ) -> Vec<SlotView> {
        project
            .slots
            .iter()
            .enumerate()
            .map(|(i, slot)| SlotView {
                #[cfg(feature = "scene-editing")]
                attachments: vec![],
                #[cfg(feature = "scene-editing")]
                active_attachment_id: None,
                id: self.slot_ids[i],
                name: slot.name.clone(),
                bone: self.ids[slot.bone],
                visible: slot.visible,
                color: u32::from_be_bytes(slot.color),
                blend: slot.blend.as_str().into(),
                tint_black: false,
                dark_color: 255,
                image_available: slot
                    .attachment
                    .as_ref()
                    .is_some_and(|a| cache.get(image_stem(a)).is_some()),
                mesh: slot
                    .attachment
                    .as_ref()
                    .and_then(|a| a.mesh())
                    .map(|m| MeshView {
                        weighted: m.weighted,
                        uvs: m.uvs.clone(),
                        triangles: m.triangles.clone(),
                        edges: m.edges.clone(),
                        hull: m.hull,
                        bones: m.bones.iter().map(|i| self.ids[*i]).collect(),
                        vertices: m
                            .vertices
                            .iter()
                            .map(|v| VertexView {
                                weights: v.weights.clone(),
                                positions: v.positions.clone(),
                            })
                            .collect(),
                    }),
                region: slot.attachment.as_ref().map(|r| RegionView {
                    image: image_stem(r).into(),
                    image_path: r.path.clone(),
                    name: r.name.clone(),
                    x: r.x,
                    y: r.y,
                    rotation: r.rotation,
                    scale_x: r.scale_x,
                    scale_y: r.scale_y,
                    width: r.width,
                    height: r.height,
                }),
            })
            .collect()
    }
    pub fn new(project: &RegionProject, saved: bool) -> Self {
        let bones = &project.rig.bones;
        Self {
            ids: (0..bones.len() as u64).collect(),
            next_id: bones.len() as u64,
            focus: 0,
            undo: vec![],
            redo: vec![],
            saved: saved.then(|| project.clone()),
            slot_ids: (0..project.slots.len() as u64).collect(),
            next_slot_id: project.slots.len() as u64,
            slot_focus: None,
            vertex_focus: None,
        }
    }
    pub fn views(&self, bones: &[Bone]) -> Vec<BoneView> {
        bones
            .iter()
            .enumerate()
            .map(|(i, b)| BoneView {
                id: self.ids[i],
                parent: b.parent.map(|p| self.ids[p]),
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
    pub fn can_undo(&self) -> bool {
        !self.undo.is_empty()
    }
    pub fn can_redo(&self) -> bool {
        !self.redo.is_empty()
    }
    pub fn focus(&self) -> u64 {
        self.focus
    }
    pub fn dirty(&self, project: &RegionProject) -> bool {
        self.saved.as_ref() != Some(project)
    }
    pub fn mark_saved(&mut self, project: &RegionProject) {
        self.saved = Some(project.clone());
    }
    /// Save As relocates the current image root without being an editing
    /// action. Undoing an unrelated edit must keep that portable relocation;
    /// deliberate switches to other image folders remain in history.
    pub fn rebase_images_root(&mut self, old: &str, new: &str) {
        for frame in self.undo.iter_mut().chain(self.redo.iter_mut()) {
            if frame.images_root == old {
                frame.images_root = new.to_owned();
            }
        }
    }
    fn frame(&self, project: &RegionProject) -> Frame {
        let bones = &project.rig.bones;
        Frame {
            bones: bones.to_vec(),
            images_root: project.images_root.clone(),
            slots: project.slots.clone(),
            region_order: project.region_order.clone(),
            slot_ids: self.slot_ids.clone(),
            slot_focus: self.slot_focus,
            vertex_focus: self.vertex_focus,
            ids: self.ids.clone(),
            focus: self.focus,
        }
    }
    fn restore(&mut self, project: &mut RegionProject, frame: Frame) {
        project.rig.bones = frame.bones;
        project.images_root = frame.images_root;
        project.slots = frame.slots;
        project.region_order = frame.region_order;
        self.slot_ids = frame.slot_ids;
        self.slot_focus = frame.slot_focus;
        self.vertex_focus = frame.vertex_focus;
        self.ids = frame.ids;
        self.focus = frame.focus;
    }
    pub fn apply(&mut self, project: &mut RegionProject, edit: RigEdit) -> Result<bool, AppError> {
        let edit = match edit {
            RigEdit::AddImage {
                bone,
                image,
                path,
                x,
                y,
                width,
                height,
            } => RigEdit::AddImages {
                bone,
                images: vec![ImagePlacement {
                    image,
                    path,
                    x,
                    y,
                    width,
                    height,
                }],
            },
            edit => edit,
        };
        match edit {
            RigEdit::Undo => {
                if let Some(frame) = self.undo.pop() {
                    self.redo.push(self.frame(project));
                    self.restore(project, frame);
                    return Ok(true);
                }
                return Ok(false);
            }
            RigEdit::Redo => {
                if let Some(frame) = self.redo.pop() {
                    self.undo.push(self.frame(project));
                    self.restore(project, frame);
                    return Ok(true);
                }
                return Ok(false);
            }
            _ => (),
        }
        let mut before = self.frame(project);
        let mut next = before.clone();
        if !matches!(
            edit,
            RigEdit::AddImages { .. }
                | RigEdit::UpdateSlot { .. }
                | RigEdit::ReorderSlot { .. }
                | RigEdit::DeleteSlot { .. }
        ) {
            next.slot_focus = None;
            next.vertex_focus = None;
        }
        let find = |id| {
            self.ids
                .iter()
                .position(|i| *i == id)
                .ok_or_else(|| invalid("The selected bone no longer exists."))
        };
        let world = poses(&next.bones);
        match edit {
            RigEdit::SetImagesRoot { path } => {
                next.images_root = path;
            }
            RigEdit::SetBoneColors { colors } => {
                if colors.is_empty() || colors.len() > 128 {
                    return Err(invalid("Choose 1–128 bone colors."));
                }
                let mut seen = std::collections::HashSet::new();
                for c in &colors {
                    if !seen.insert(c.id) {
                        return Err(invalid("Choose each bone once."));
                    }
                    let i = find(c.id)?;
                    next.bones[i].color = c.color.to_be_bytes();
                }
                before.focus = colors[0].id;
                next.focus = colors[0].id;
            }
            RigEdit::SetBoneColor { id, color } => {
                let i = find(id)?;
                next.bones[i].color = color.to_be_bytes();
                before.focus = id;
                next.focus = id;
            }
            RigEdit::SetSlotColor { id, color } => {
                let i = next
                    .slot_ids
                    .iter()
                    .position(|s| *s == id)
                    .ok_or_else(|| invalid("Select a slot."))?;
                next.slots[i].color = color.to_be_bytes();
                next.slot_focus = Some(id);
                before.slot_focus = Some(id);
            }
            RigEdit::SetSlotBlend { id, blend } => {
                let blend = fbones_format::minimal::regions::BlendMode::from_name(&blend)
                    .ok_or_else(|| invalid("Choose Normal, Additive, Multiply or Screen."))?;
                let i = next
                    .slot_ids
                    .iter()
                    .position(|slot| *slot == id)
                    .ok_or_else(|| invalid("Select a slot."))?;
                next.slots[i].blend = blend;
                next.slot_focus = Some(id);
                before.slot_focus = Some(id);
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
                    || ids.len() > 128
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
                        let mut p = next.bones[*i].parent;
                        while let Some(id) = p {
                            if selected.contains(&id) {
                                return false;
                            }
                            p = next.bones[id].parent;
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
                        next.bones[i].scale_x *= scale_x;
                        next.bones[i].scale_y *= scale_y;
                        continue;
                    }
                    let parent = next.bones[i].parent.map_or(zero(), |j| world[j]);
                    if matches!(mode, TransformMode::Translate) {
                        (next.bones[i].x, next.bones[i].y) =
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
                        set_pose(&mut next.bones[i], parent, transform.compose(world[i]))?;
                    }
                }
                before.focus = ids[0];
                next.focus = ids[0];
            }
            RigEdit::Length { id, x, y } => {
                let i = find(id)?;
                let p = world[i];
                let axis = p.a.hypot(p.b);
                if axis < 1e-8 {
                    return Err(invalid("Use nonzero X scale before changing length."));
                }
                let a = p.angle.to_radians();
                next.bones[i].length =
                    (((x - p.x) * a.cos() + (y - p.y) * a.sin()) / axis).max(0.0);
                before.focus = id;
                next.focus = id;
            }

            RigEdit::Create {
                color,
                parent,
                x,
                y,
                rotation,
                length,
            } => {
                if next.bones.len() >= 128 {
                    return Err(invalid("This version supports up to 128 bones."));
                }
                let parent_index = find(parent)?;
                let name = (1..)
                    .map(|i| format!("bone{i}"))
                    .find(|n| next.bones.iter().all(|b| b.name != *n))
                    .unwrap();
                next.bones.push(Bone {
                    name,
                    parent: Some(parent_index),
                    x,
                    y,
                    rotation,
                    length,
                    color: color.map(u32::to_be_bytes).unwrap_or([155, 155, 155, 255]),
                    ..Bone::root()
                });
                next.ids.push(self.next_id);
                next.focus = self.next_id;
                before.focus = parent;
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
                before.focus = id;
                next.focus = id;
                next.bones[index] = Bone {
                    name: name.trim().into(),
                    parent: next.bones[index].parent,
                    x,
                    y,
                    rotation,
                    length,
                    scale_x: scale_x.unwrap_or(next.bones[index].scale_x),
                    scale_y: scale_y.unwrap_or(next.bones[index].scale_y),
                    shear_x: shear_x.unwrap_or(next.bones[index].shear_x),
                    shear_y: shear_y.unwrap_or(next.bones[index].shear_y),
                    ..next.bones[index].clone()
                };
            }
            RigEdit::Move { id, x, y } => {
                let index = find(id)?;
                before.focus = id;
                next.focus = id;
                let parent = next.bones[index].parent.map(|p| world[p]).unwrap_or(zero());
                (next.bones[index].x, next.bones[index].y) = local(parent, x, y)?;
            }
            RigEdit::Tip { id, x, y } => {
                let index = find(id)?;
                before.focus = id;
                next.focus = id;
                let parent = next.bones[index].parent.map(|p| world[p]).unwrap_or(zero());
                let (tx, ty) = local(parent, x, y)?;
                let bone = &mut next.bones[index];
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
                    ancestor = next.bones[i].parent;
                }
                if next.bones[index].parent == Some(parent_index) {
                    return Ok(false);
                }
                before.focus = id;
                next.focus = id;
                let original = world[index];
                let bone = &mut next.bones[index];
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
                visit(0, &next.bones, &mut order);
                let indices: HashMap<_, _> = order
                    .iter()
                    .enumerate()
                    .map(|(new, old)| (*old, new))
                    .collect();
                next.bones = order
                    .iter()
                    .map(|old| {
                        let mut b = next.bones[*old].clone();
                        b.parent = b.parent.map(|p| indices[&p]);
                        b
                    })
                    .collect();
                next.ids = order.iter().map(|old| next.ids[*old]).collect();
                for slot in &mut next.slots {
                    slot.bone = indices[&slot.bone];
                    if let Some(mesh) = slot.attachment.as_mut().and_then(|a| a.mesh_mut()) {
                        for bone in &mut mesh.bones {
                            *bone = indices[bone];
                        }
                    }
                }
            }
            RigEdit::Delete { id } => {
                let index = find(id)?;
                if index == 0 {
                    return Err(invalid("The root bone cannot be deleted."));
                }
                before.focus = id;
                next.focus = next.ids[next.bones[index].parent.unwrap()];
                let mut removed = vec![false; next.bones.len()];
                for i in 0..next.bones.len() {
                    removed[i] = i == index || next.bones[i].parent.is_some_and(|p| removed[p]);
                }
                let kept: Vec<_> = (0..next.bones.len()).filter(|i| !removed[*i]).collect();
                let indices: HashMap<_, _> = kept
                    .iter()
                    .enumerate()
                    .map(|(new, old)| (*old, new))
                    .collect();
                next.bones = kept
                    .iter()
                    .map(|i| {
                        let mut b = next.bones[*i].clone();
                        b.parent = b.parent.map(|p| indices[&p]);
                        b
                    })
                    .collect();
                next.ids = kept.iter().map(|i| next.ids[*i]).collect();
                let kept_slots: Vec<_> = (0..next.slots.len())
                    .filter(|i| indices.contains_key(&next.slots[*i].bone))
                    .collect();
                let slot_indices: HashMap<_, _> = kept_slots
                    .iter()
                    .enumerate()
                    .map(|(new, old)| (*old, new))
                    .collect();
                next.region_order = next
                    .region_order
                    .iter()
                    .filter_map(|i| slot_indices.get(i).copied())
                    .collect();
                next.slot_ids = kept_slots.iter().map(|i| next.slot_ids[*i]).collect();
                next.slots = kept_slots
                    .iter()
                    .map(|i| {
                        let mut s = next.slots[*i].clone();
                        if let Some(mesh) = s.attachment.as_mut().and_then(|a| a.mesh_mut()) {
                            crate::mesh::remap_deleted_bones(mesh, &world, &indices, s.bone)?;
                        }
                        s.bone = indices[&s.bone];
                        Ok(s)
                    })
                    .collect::<Result<Vec<_>, AppError>>()?;
            }
            RigEdit::AddImages { bone, images } => {
                if images.is_empty() || images.len() > 128 || next.slots.len() + images.len() > 128
                {
                    return Err(invalid("This version supports up to 128 slots."));
                }
                let destination_id = bone;
                let bone = find(bone)?;
                let inverse = world[bone].inverse()?;
                // Validate the full batch before staging any slot or allocating an ID.
                for item in &images {
                    if !crate::images::valid_image_stem(&item.path)
                        || item.image.trim().is_empty()
                        || [item.x, item.y, item.width, item.height]
                            .iter()
                            .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
                        || item.width <= 0.0
                        || item.height <= 0.0
                    {
                        return Err(invalid(
                            "Choose valid image paths, dimensions and placement coordinates.",
                        ));
                    }
                }
                // Session focus may still be the last created bone. Record the
                // actual drop destination on both sides so Undo/Redo restores
                // the same bone for the next drag of the preserved asset set.
                before.focus = destination_id;
                next.focus = destination_id;
                for (offset, item) in images.into_iter().enumerate() {
                    let ImagePlacement {
                        image,
                        path,
                        x,
                        y,
                        width,
                        height,
                    } = item;
                    let name = (0..)
                        .map(|i| {
                            if i == 0 {
                                image.clone()
                            } else {
                                format!("{image}_{i}")
                            }
                        })
                        .find(|n| next.slots.iter().all(|s| s.name != *n))
                        .unwrap();
                    let (x, y) = inverse.point(x, y);
                    next.region_order.push(next.slots.len());
                    next.slots.push(Slot {
                        blend: fbones_format::minimal::regions::BlendMode::Normal,
                        color: [255; 4],
                        name,
                        bone,
                        visible: true,
                        attachment: Some(
                            Region {
                                name: image.clone(),
                                path: if path == image { String::new() } else { path },
                                x,
                                y,
                                rotation: 0.0,
                                scale_x: 1.0,
                                scale_y: 1.0,
                                width,
                                height,
                            }
                            .into(),
                        ),
                    });
                    let id = self.next_slot_id + offset as u64;
                    next.slot_ids.push(id);
                    next.slot_focus = Some(id);
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
                let index = next
                    .slot_ids
                    .iter()
                    .position(|i| *i == id)
                    .ok_or_else(|| invalid("The selected slot no longer exists."))?;
                let bone = find(bone)?;
                let slot = &mut next.slots[index];
                let name = name.trim();
                if name.is_empty() || name.chars().any(char::is_control) {
                    return Err(invalid("Use a unique, nonempty slot name."));
                }
                before.slot_focus = Some(id);
                next.slot_focus = Some(id);
                slot.name = name.into();
                slot.visible = visible;
                if let Some(region) = slot.attachment.as_mut() {
                    if let Some(mesh) = region.mesh_mut() {
                        if bone != slot.bone && !mesh.weighted {
                            let points = crate::mesh::world_vertices(mesh, &world);
                            mesh.bones = vec![bone];
                            for (i, p) in points.into_iter().enumerate() {
                                crate::mesh::set_vertex(mesh, i, p, &world)?;
                            }
                        }
                        slot.bone = bone;
                        // Mesh translation/rotation is geometry, not region metadata.
                    } else {
                        region.x = x;
                        region.y = y;
                        region.rotation = rotation;
                        region.scale_x = scale_x;
                        region.scale_y = scale_y;
                        if bone != slot.bone {
                            let old = world[slot.bone];
                            let angle = region.rotation.to_radians();
                            let local_region = Pose {
                                x: region.x,
                                y: region.y,
                                a: angle.cos() * region.scale_x,
                                b: angle.sin() * region.scale_x,
                                c: -angle.sin() * region.scale_y,
                                d: angle.cos() * region.scale_y,
                                angle: region.rotation,
                            };
                            let new = world[bone].inverse()?.compose(old.compose(local_region));
                            let sx = new.a.hypot(new.b);
                            let sy = new.c.hypot(new.d);
                            if sx < 1e-8
                                || sy < 1e-8
                                || (new.a * new.c + new.b * new.d).abs() > 1e-4 * sx * sy
                            {
                                // Region transforms cannot store shear. A canonical
                                // rigid quad mesh preserves every world-space corner
                                // when assigning its slot to the new bone.
                                let mut mesh = crate::mesh::from_region(region, slot.bone);
                                let points = crate::mesh::world_vertices(&mesh, &world);
                                mesh.bones = vec![bone];
                                for (i, p) in points.into_iter().enumerate() {
                                    crate::mesh::set_vertex(&mut mesh, i, p, &world)?;
                                }
                                *region = fbones_format::minimal::regions::Attachment::Mesh(
                                    Box::new(mesh),
                                );
                            } else {
                                region.x = new.x;
                                region.y = new.y;
                                region.rotation = new.b.atan2(new.a).to_degrees();
                                region.scale_x = sx;
                                region.scale_y = (new.a * new.d - new.b * new.c) / sx;
                            }
                        }
                    }
                }
                slot.bone = bone;
            }
            RigEdit::ReorderSlot { id, index } => {
                if index >= next.slots.len() {
                    return Err(invalid("Invalid draw order."));
                }
                let old = next
                    .slot_ids
                    .iter()
                    .position(|i| *i == id)
                    .ok_or_else(|| invalid("The selected slot no longer exists."))?;
                let mut order: Vec<_> = (0..next.slots.len()).collect();
                let moved = order.remove(old);
                order.insert(index, moved);
                let indices: HashMap<_, _> =
                    order.iter().enumerate().map(|(n, o)| (*o, n)).collect();
                next.slots = order.iter().map(|i| next.slots[*i].clone()).collect();
                next.slot_ids = order.iter().map(|i| next.slot_ids[*i]).collect();
                next.region_order = next.region_order.iter().map(|i| indices[i]).collect();
                before.slot_focus = Some(id);
                next.slot_focus = Some(id);
            }
            RigEdit::DeleteSlot { id } => {
                let index = next
                    .slot_ids
                    .iter()
                    .position(|i| *i == id)
                    .ok_or_else(|| invalid("The selected slot no longer exists."))?;
                before.slot_focus = Some(id);
                next.slot_focus = None;
                next.slots.remove(index);
                next.slot_ids.remove(index);
                next.region_order = next
                    .region_order
                    .iter()
                    .filter(|i| **i != index)
                    .map(|i| if *i > index { i - 1 } else { *i })
                    .collect();
            }
            edit @ (RigEdit::ReplaceMesh { .. }
            | RigEdit::ConvertMesh { .. }
            | RigEdit::MoveMesh { .. }
            | RigEdit::MoveVertex { .. }
            | RigEdit::MoveVertices { .. }
            | RigEdit::MeshStroke { .. }
            | RigEdit::PaintWeights { .. }
            | RigEdit::AddVertex { .. }
            | RigEdit::DeleteVertex { .. }
            | RigEdit::MeshEdge { .. }
            | RigEdit::TriangulateMesh { .. }
            | RigEdit::ResetMesh { .. }
            | RigEdit::BindMesh { .. }
            | RigEdit::AutoWeights { .. }
            | RigEdit::NormalizeWeights { .. }
            | RigEdit::SetWeight { .. }) => {
                let id = match &edit {
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
                    | RigEdit::SetWeight { id, .. } => *id,
                    _ => unreachable!(),
                };
                let index = next
                    .slot_ids
                    .iter()
                    .position(|i| *i == id)
                    .ok_or_else(|| invalid("Select an image slot first."))?;
                before.slot_focus = Some(id);
                next.slot_focus = Some(id);
                let slot = &mut next.slots[index];
                let owner = slot.bone;
                let attachment = slot
                    .attachment
                    .as_mut()
                    .ok_or_else(|| invalid("This slot has no attachment."))?;
                if let RigEdit::ReplaceMesh { mesh, .. } = edit {
                    *attachment = fbones_format::minimal::regions::Attachment::Mesh(mesh);
                    next.vertex_focus = None;
                } else if matches!(edit, RigEdit::ConvertMesh { .. }) {
                    if attachment.mesh().is_some() {
                        return Ok(false);
                    }
                    let mesh = crate::mesh::from_region(attachment, owner);
                    *attachment = fbones_format::minimal::regions::Attachment::Mesh(Box::new(mesh));
                    next.vertex_focus = None;
                } else {
                    let mesh = attachment
                        .mesh_mut()
                        .ok_or_else(|| invalid("Convert the image to a mesh first."))?;
                    match edit {
                        RigEdit::MoveMesh { dx, dy, .. } => {
                            crate::mesh::translate(mesh, [dx, dy], &world)?;
                            next.vertex_focus = None;
                        }
                        RigEdit::MoveVertex { vertex, x, y, .. } => {
                            before.vertex_focus = Some(vertex);
                            next.vertex_focus = Some(vertex);
                            crate::mesh::move_vertex(mesh, vertex, [x, y], &world)?;
                        }
                        RigEdit::MoveVertices {
                            vertices, edit_uvs, ..
                        } => {
                            if vertices.is_empty() || vertices.len() > 256 {
                                return Err(invalid("Choose 1–256 vertices."));
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
                            next.vertex_focus = Some(crate::mesh_edit::stroke(
                                mesh, from, &points, &world, edit_uvs,
                            )?);
                        }
                        RigEdit::PaintWeights { bone, changes, .. } => {
                            if changes.is_empty() || changes.len() > 256 {
                                return Err(invalid("Choose 1–256 weight changes."));
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
                            next.vertex_focus = Some(crate::mesh::add_vertex(
                                mesh,
                                [x, y],
                                edge_a.zip(edge_b).map(|(a, b)| [a, b]),
                                &world,
                            )?);
                        }
                        RigEdit::DeleteVertex { vertex, .. } => {
                            before.vertex_focus = Some(vertex);
                            crate::mesh::delete_vertex(mesh, vertex)?;
                            next.vertex_focus = Some(vertex.min(mesh.vertices.len() - 1));
                        }
                        RigEdit::MeshEdge { a, b, remove, .. } => {
                            before.vertex_focus = Some(a);
                            next.vertex_focus = Some(b);
                            crate::mesh::edge(mesh, a, b, remove)?
                        }
                        RigEdit::TriangulateMesh { .. } => {
                            crate::mesh_edit::retessellate(mesh, &world)?;
                        }
                        RigEdit::ResetMesh { .. } => {
                            *mesh = fbones_format::minimal::meshes::quad(mesh.image.clone(), owner);
                            next.vertex_focus = None;
                        }
                        RigEdit::BindMesh { bones, .. } => {
                            let bound =
                                bones.into_iter().map(find).collect::<Result<Vec<_>, _>>()?;
                            crate::mesh::bind(mesh, bound, owner, &next.bones, &world)?;
                            if mesh.weighted {
                                crate::auto_weights::apply(mesh, &next.bones, &world)?;
                            }
                        }
                        RigEdit::AutoWeights { .. } => {
                            crate::auto_weights::apply(mesh, &next.bones, &world)?
                        }
                        RigEdit::NormalizeWeights { .. } => crate::mesh::normalize(mesh),
                        RigEdit::SetWeight {
                            vertex,
                            bone,
                            value,
                            ..
                        } => {
                            before.vertex_focus = Some(vertex);
                            next.vertex_focus = Some(vertex);
                            crate::mesh::set_weight(mesh, vertex, find(bone)?, value, &world)?;
                        }
                        _ => unreachable!(),
                    }
                }
            }
            #[cfg(feature = "scene-editing")]
            RigEdit::SetAudioRoot { .. }
            | RigEdit::CreateEvent { .. }
            | RigEdit::RenameEvent { .. }
            | RigEdit::UpdateEvent { .. }
            | RigEdit::DeleteEvent { .. }
            | RigEdit::SetAnimationConstraintKeys { .. }
            | RigEdit::SetAnimationEventKeys { .. }
            | RigEdit::SetAnimationSequenceKeys { .. }
            | RigEdit::SetAttachmentSequence { .. }
            | RigEdit::SetAttachmentColor { .. }
            | RigEdit::SetSlotDarkColor { .. }
            | RigEdit::CreateAnimation { .. }
            | RigEdit::DuplicateAnimation { .. }
            | RigEdit::SetAnimationFps { .. }
            | RigEdit::RenameAnimation { .. }
            | RigEdit::DeleteAnimation { .. }
            | RigEdit::SetAnimationKey { .. }
            | RigEdit::SetAnimationKeys { .. }
            | RigEdit::SetAnimationSlotKeys { .. }
            | RigEdit::SetAnimationKeyBatch { .. }
            | RigEdit::SetAnimationDrawOrderKeys { .. }
            | RigEdit::SetAnimationDeformKeys { .. }
            | RigEdit::SetAnimationDeformVertices { .. }
            | RigEdit::DeleteAnimationKeys { .. }
            | RigEdit::MoveAnimationKeys { .. }
            | RigEdit::TransformAttachments { .. }
            | RigEdit::BindAttachment { .. }
            | RigEdit::SetAttachmentWeight { .. }
            | RigEdit::PaintAttachmentWeights { .. }
            | RigEdit::NormalizeAttachmentWeights { .. }
            | RigEdit::AutoAttachmentWeights { .. }
            | RigEdit::MoveClippingVertices { .. }
            | RigEdit::InsertClippingVertex { .. }
            | RigEdit::DeleteClippingVertex { .. }
            | RigEdit::CreateSlot { .. }
            | RigEdit::CreateClipping { .. }
            | RigEdit::SetClipping { .. }
            | RigEdit::AddConstraint { .. }
            | RigEdit::AddPhysicsToBones { .. }
            | RigEdit::UpdateConstraint { .. }
            | RigEdit::MatchTransform { .. }
            | RigEdit::SetTransformRange { .. }
            | RigEdit::DeleteConstraint { .. }
            | RigEdit::ReorderConstraint { .. }
            | RigEdit::SetActiveAttachment { .. }
            | RigEdit::RenameAttachment { .. }
            | RigEdit::SetAttachmentImagePath { .. }
            | RigEdit::DeleteAttachment { .. }
            | RigEdit::MoveAttachment { .. }
            | RigEdit::ReparentSelection { .. }
            | RigEdit::AttachmentEdit { .. }
            | RigEdit::UpdateAttachment { .. }
            | RigEdit::AddAttachments { .. } => {
                return Err(invalid("This command requires the typed scene history."))
            }
            RigEdit::Undo | RigEdit::Redo | RigEdit::AddImage { .. } => unreachable!(),
        }
        for bone in &next.bones {
            if bone.name.trim().is_empty()
                || bone.name.chars().any(char::is_control)
                || bone.length < 0.0
                || [
                    bone.x,
                    bone.y,
                    bone.rotation,
                    bone.length,
                    bone.scale_x,
                    bone.scale_y,
                    bone.shear_x,
                    bone.shear_y,
                ]
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
            {
                return Err(invalid("Use a unique bone name, finite transforms within ±1,000,000, and a nonnegative length."));
            }
        }
        for region in next.slots.iter().filter_map(|s| s.attachment.as_ref()) {
            if [
                region.x,
                region.y,
                region.rotation,
                region.scale_x,
                region.scale_y,
            ]
            .iter()
            .any(|v| !v.is_finite() || v.abs() > 1_000_000.0)
            {
                return Err(invalid("Use finite image transforms within ±1,000,000."));
            }
        }
        if poses(&next.bones).iter().any(|p| {
            [p.x, p.y, p.a, p.b, p.c, p.d]
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1e12)
        }) {
            return Err(invalid("Bone transforms produce an invalid world pose."));
        }
        let mut candidate = project.clone();
        candidate.rig.bones = next.bones.clone();
        candidate.images_root = next.images_root.clone();
        candidate.slots = next.slots.clone();
        candidate.region_order = next.region_order.clone();
        encode_region_payload(&candidate).map_err(|_| {
            invalid("Use unique bone/slot names, a valid hierarchy and supported mesh geometry (256 vertices per mesh, 4096 total).")
        })?;
        if next.bones == before.bones
            && next.slots == before.slots
            && next.images_root == before.images_root
            && next.region_order == before.region_order
        {
            return Ok(false);
        }
        if next.ids.contains(&self.next_id) {
            self.next_id += 1;
        }
        while next.slot_ids.contains(&self.next_slot_id) {
            self.next_slot_id += 1;
        }
        self.undo.push(before);
        if self.undo.len() > 100 {
            self.undo.remove(0);
        }
        self.redo.clear();
        self.restore(project, next);
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use fbones_format::minimal::MinimalProject;
    #[test]
    fn legacy_auto_weights_preserves_existing_positive_binding_coordinates_and_one_undo() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("auto".into(), [51; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut h = RigHistory::new(&p, true);
        let b1 = add(&mut h, &mut p, 0);
        let b2 = add(&mut h, &mut p, 0);
        h.apply(
            &mut p,
            RigEdit::AddImage {
                bone: b1,
                image: "image".into(),
                path: "image".into(),
                x: 25.,
                y: 30.,
                width: 32.,
                height: 24.,
            },
        )
        .unwrap();
        let id = h.slot_ids[0];
        h.apply(&mut p, RigEdit::ConvertMesh { id }).unwrap();
        let poses = poses(&p.rig.bones);
        let mut mesh = p.slots[0]
            .attachment
            .as_ref()
            .unwrap()
            .mesh()
            .unwrap()
            .clone();
        let points = crate::mesh::world_vertices(&mesh, &poses);
        mesh.weighted = true;
        mesh.bones = vec![0, 1, 2];
        for (row, point) in mesh.vertices.iter_mut().zip(points) {
            row.weights = vec![0.2, 0.3, 0.5];
            row.positions = poses
                .iter()
                .flat_map(|p| {
                    let inv = p.inverse().unwrap();
                    let p = inv.point(point[0], point[1]);
                    [p.0, p.1]
                })
                .collect();
        }
        h.apply(
            &mut p,
            RigEdit::ReplaceMesh {
                id,
                mesh: Box::new(mesh),
            },
        )
        .unwrap();
        let before = p.clone();
        let original = before.slots[0].attachment.as_ref().unwrap().mesh().unwrap();
        let bits = original
            .vertices
            .iter()
            .flat_map(|v| v.positions.iter().map(|v| v.to_bits()))
            .collect::<Vec<_>>();
        h.apply(&mut p, RigEdit::AutoWeights { id }).unwrap();
        let after = p.clone();
        let actual = p.slots[0].attachment.as_ref().unwrap().mesh().unwrap();
        assert_eq!(
            actual
                .vertices
                .iter()
                .flat_map(|v| v.positions.iter().map(|v| v.to_bits()))
                .collect::<Vec<_>>(),
            bits
        );
        assert!(actual
            .vertices
            .iter()
            .all(|v| (v.weights.iter().sum::<f32>() - 1.).abs() < 0.00001));
        assert_eq!(actual.bones, vec![0, 1, 2]);
        assert_eq!(
            h.slot_views(&p, &crate::images::ImageCache::default())[0]
                .mesh
                .as_ref()
                .unwrap()
                .bones,
            vec![0, b1, b2]
        );
        let bytes = encode_region_payload(&p).unwrap();
        assert_eq!(
            fbones_format::minimal::regions::decode_regions(&bytes).unwrap(),
            p
        );
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p, before);
        h.apply(&mut p, RigEdit::Redo).unwrap();
        assert_eq!(p, after);
    }
    #[test]
    fn slot_blend_edits_preserve_rgba_geometry_and_stable_focus_through_history() {
        use fbones_format::minimal::regions::BlendMode;
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("blends".into(), [47; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut h = RigHistory::new(&p, true);
        h.apply(
            &mut p,
            RigEdit::AddImage {
                bone: 0,
                image: "owned".into(),
                path: "owned".into(),
                x: 10.0,
                y: 15.0,
                width: 32.0,
                height: 24.0,
            },
        )
        .unwrap();
        h.apply(
            &mut p,
            RigEdit::SetSlotColor {
                id: 0,
                color: 0x4488cc77,
            },
        )
        .unwrap();
        h.apply(&mut p, RigEdit::ConvertMesh { id: 0 }).unwrap();
        h.mark_saved(&p);
        let baseline = p.clone();
        for (name, mode) in [
            ("additive", BlendMode::Additive),
            ("multiply", BlendMode::Multiply),
            ("screen", BlendMode::Screen),
        ] {
            h.apply(
                &mut p,
                RigEdit::SetSlotBlend {
                    id: 0,
                    blend: name.into(),
                },
            )
            .unwrap();
            assert_eq!(p.slots[0].blend, mode);
            assert_eq!(p.slots[0].color, baseline.slots[0].color);
            assert_eq!(p.slots[0].attachment, baseline.slots[0].attachment);
            assert_eq!(h.slot_focus(), Some(0));
            let changed = p.clone();
            let payload = encode_region_payload(&p).unwrap();
            assert_eq!(
                fbones_format::minimal::regions::decode_regions(&payload).unwrap(),
                p
            );
            let undo_count = h.undo.len();
            assert!(!h
                .apply(
                    &mut p,
                    RigEdit::SetSlotBlend {
                        id: 0,
                        blend: name.into()
                    }
                )
                .unwrap());
            assert_eq!(h.undo.len(), undo_count);
            h.apply(&mut p, RigEdit::Undo).unwrap();
            assert_eq!(p, baseline);
            assert_eq!(h.slot_focus(), Some(0));
            assert!(!h.dirty(&p));
            h.apply(&mut p, RigEdit::Redo).unwrap();
            assert_eq!(p, changed);
            assert_eq!(h.slot_focus(), Some(0));
            h.apply(&mut p, RigEdit::Undo).unwrap();
        }
        let before = p.clone();
        let count = h.undo.len();
        for (id, blend) in [(0, "darken"), (999, "normal")] {
            assert!(h
                .apply(
                    &mut p,
                    RigEdit::SetSlotBlend {
                        id,
                        blend: blend.into()
                    }
                )
                .is_err());
        }
        assert_eq!(p, before);
        assert_eq!(h.undo.len(), count);
    }
    #[test]
    fn local_scale_factors_follow_each_bones_axes_under_rotated_sheared_parent() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("local scale".into(), [41; 16]),
            slots: vec![],
            region_order: vec![],
        };
        p.rig.bones[0].rotation = 22.0;
        p.rig.bones[0].scale_x = 1.6;
        p.rig.bones[0].scale_y = 0.7;
        p.rig.bones[0].shear_x = 13.0;
        p.rig.bones[0].shear_y = -9.0;
        p.rig.bones.extend([
            Bone {
                name: "tilted".into(),
                parent: Some(0),
                x: 30.0,
                y: -10.0,
                rotation: 35.0,
                scale_x: 0.9,
                scale_y: 1.4,
                shear_x: 8.0,
                shear_y: 19.0,
                length: 50.0,
                ..Bone::root()
            },
            Bone {
                name: "child".into(),
                parent: Some(1),
                x: 50.0,
                y: 4.0,
                length: 5.0,
                ..Bone::root()
            },
            Bone {
                name: "other".into(),
                parent: Some(0),
                x: -40.0,
                y: 25.0,
                rotation: -45.0,
                length: 100.0,
                ..Bone::root()
            },
        ]);
        let original = p.clone();
        let before = poses(&p.rig.bones);
        let mut h = RigHistory::new(&p, true);
        let edit=serde_json::from_str(r#"{"type":"transformBones","ids":[1,2,3],"mode":"scale","localAxes":true,"individual":true,"pivotX":999,"pivotY":999,"dx":0,"dy":0,"rotation":0,"scaleX":1.5,"scaleY":0.6,"shearX":0,"shearY":0}"#).unwrap();
        h.apply(&mut p, edit).unwrap();
        let after = poses(&p.rig.bones);
        for i in [1, 3] {
            for (actual, expected) in [
                (after[i].a, before[i].a * 1.5),
                (after[i].b, before[i].b * 1.5),
                (after[i].c, before[i].c * 0.6),
                (after[i].d, before[i].d * 0.6),
                (after[i].x, before[i].x),
                (after[i].y, before[i].y),
            ] {
                assert!((actual - expected).abs() < 1e-5);
            }
            let a = &p.rig.bones[i];
            let b = &original.rig.bones[i];
            assert_eq!(
                (a.x, a.y, a.rotation, a.shear_x, a.shear_y, a.length),
                (b.x, b.y, b.rotation, b.shear_x, b.shear_y, b.length)
            );
        }
        assert_eq!(p.rig.bones[2], original.rig.bones[2]);
        let payload = encode_region_payload(&p).unwrap();
        assert_eq!(
            fbones_format::minimal::regions::decode_regions(&payload).unwrap(),
            p
        );
        let scaled = p.clone();
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p, original);
        assert!(!h.can_undo());
        h.apply(&mut p, RigEdit::Redo).unwrap();
        assert_eq!(p, scaled);
    }
    #[test]
    fn local_scale_rejects_zero_singular_wrong_mode_and_excessive_factors_without_mutation() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("local scale limits".into(), [43; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut h = RigHistory::new(&p, true);
        for (mode, sx, sy) in [
            ("scale", 0.0, 1.0),
            ("rotate", 1.0, 1.0),
            ("scale", 1_000_001.0, 1.0),
            ("scale", 0.00001, 0.00001),
        ] {
            let original = p.clone();
            let json = serde_json::json!({"type":"transformBones","ids":[0],"mode":mode,"localAxes":true,"pivotX":0,"pivotY":0,"dx":0,"dy":0,"rotation":10,"scaleX":sx,"scaleY":sy,"shearX":0,"shearY":0});
            assert!(h
                .apply(&mut p, serde_json::from_value(json).unwrap())
                .is_err());
            assert_eq!(p, original);
            assert!(!h.can_undo());
        }
        p.rig.bones[0].scale_x = 0.0;
        let original = p.clone();
        let mut edit = transform_edit(vec![0], TransformMode::Scale, 0.0);
        if let RigEdit::TransformBones { local_axes, .. } = &mut edit {
            *local_axes = true;
        }
        assert!(h.apply(&mut p, edit).is_err());
        assert_eq!(p, original);
        assert!(!h.can_undo());
    }
    #[test]
    fn batch_history_restores_drop_destination_when_native_focus_was_another_bone() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("batch focus".into(), [37; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut h = RigHistory::new(&p, true);
        for x in [30.0, -40.0] {
            h.apply(
                &mut p,
                RigEdit::Create {
                    parent: 0,
                    x,
                    y: 0.0,
                    rotation: 0.0,
                    length: 20.0,
                    color: None,
                },
            )
            .unwrap();
        }
        assert_eq!(h.focus(), 2);
        let image = ImagePlacement {
            image: "arm".into(),
            path: "parts/arm".into(),
            x: 10.0,
            y: 15.0,
            width: 32.0,
            height: 24.0,
        };
        h.apply(
            &mut p,
            RigEdit::AddImages {
                bone: 1,
                images: vec![image.clone(), image.clone()],
            },
        )
        .unwrap();
        assert_eq!(h.focus(), 1);
        assert!(p.slots.iter().all(|s| s.bone == 1));
        let ids = h.slot_ids.clone();
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(h.focus(), 1);
        assert!(p.slots.is_empty());
        h.apply(&mut p, RigEdit::Redo).unwrap();
        assert_eq!(h.focus(), 1);
        assert_eq!(h.slot_ids, ids);
        h.apply(
            &mut p,
            RigEdit::AddImages {
                bone: h.focus(),
                images: vec![image],
            },
        )
        .unwrap();
        assert_eq!(p.slots.len(), 3);
        assert!(p.slots.iter().all(|s| s.bone == 1));
    }
    #[test]
    fn individual_rotation_preserves_each_origin_and_lengths_and_skips_selected_descendants() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("individual".into(), [31; 16]),
            slots: vec![],
            region_order: vec![],
        };
        p.rig.bones.extend([
            Bone {
                name: "short".into(),
                parent: Some(0),
                x: 30.0,
                y: 10.0,
                length: 20.0,
                ..Bone::root()
            },
            Bone {
                name: "child".into(),
                parent: Some(1),
                x: 20.0,
                length: 5.0,
                ..Bone::root()
            },
            Bone {
                name: "long".into(),
                parent: Some(0),
                x: -40.0,
                y: -25.0,
                length: 110.0,
                ..Bone::root()
            },
        ]);
        let original = p.clone();
        let mut h = RigHistory::new(&p, true);
        let json = r#"{"type":"transformBones","ids":[1,2,3],"mode":"rotate","individual":true,"pivotX":999,"pivotY":999,"dx":0,"dy":0,"rotation":90,"scaleX":1,"scaleY":1,"shearX":0,"shearY":0}"#;
        h.apply(&mut p, serde_json::from_str(json).unwrap())
            .unwrap();
        let world = poses(&p.rig.bones);
        assert!((world[1].x - 30.0).abs() < 1e-4 && (world[1].y - 10.0).abs() < 1e-4);
        assert!((world[3].x + 40.0).abs() < 1e-4 && (world[3].y + 25.0).abs() < 1e-4);
        assert!((world[2].x - 30.0).abs() < 1e-4 && (world[2].y - 30.0).abs() < 1e-4);
        assert_eq!(
            p.rig.bones.iter().map(|b| b.length).collect::<Vec<_>>(),
            vec![0.0, 20.0, 5.0, 110.0]
        );
        assert_eq!(p.rig.bones[2].rotation, 0.0);
        let payload = encode_region_payload(&p).unwrap();
        assert_eq!(
            fbones_format::minimal::regions::decode_regions(&payload).unwrap(),
            p
        );
        let rotated = p.clone();
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p, original);
        assert!(!h.can_undo());
        h.apply(&mut p, RigEdit::Redo).unwrap();
        assert_eq!(p, rotated);
        h.apply(&mut p, RigEdit::Undo).unwrap();
        let legacy = json.replace(",\"individual\":true", "");
        h.apply(&mut p, serde_json::from_str(&legacy).unwrap())
            .unwrap();
        let grouped = poses(&p.rig.bones);
        assert!((grouped[1].x - 30.0).abs() > 1.0);
    }

    #[test]
    fn batch_image_capacity_invalid_dimensions_and_singular_target_are_atomic() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("batch".into(), [29; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut h = RigHistory::new(&p, true);
        let image = ImagePlacement {
            image: "sprite".into(),
            path: "parts/sprite".into(),
            x: 0.0,
            y: 0.0,
            width: 32.0,
            height: 24.0,
        };
        let mut invalid = image.clone();
        invalid.width = -1.0;
        for images in [vec![image.clone(); 129], vec![image.clone(), invalid]] {
            let original = p.clone();
            assert!(h
                .apply(&mut p, RigEdit::AddImages { bone: 0, images })
                .is_err());
            assert_eq!(p, original);
            assert!(!h.can_undo());
        }
        p.rig.bones[0].scale_x = 0.0;
        let original = p.clone();
        assert!(h
            .apply(
                &mut p,
                RigEdit::AddImages {
                    bone: 0,
                    images: vec![image.clone(), image.clone()]
                }
            )
            .is_err());
        assert_eq!(p, original);
        assert!(!h.can_undo());
        p.rig.bones[0].scale_x = 1.0;
        h.apply(
            &mut p,
            RigEdit::AddImages {
                bone: 0,
                images: vec![image.clone(), image.clone()],
            },
        )
        .unwrap();
        assert_eq!(h.slot_ids, vec![0, 1]);
        assert_eq!(p.slots[0].name, "sprite");
        assert_eq!(p.slots[1].name, "sprite_1");
        h.apply(
            &mut p,
            RigEdit::AddImage {
                bone: 0,
                image: image.image,
                path: image.path,
                x: 0.0,
                y: 0.0,
                width: 32.0,
                height: 24.0,
            },
        )
        .unwrap();
        assert_eq!(h.slot_ids, vec![0, 1, 2]);
    }
    #[test]
    fn changing_slot_bone_preserves_image_world_pose_and_accepts_camel_case_fields() {
        let mut project = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [0; 16]),
            slots: vec![],
            region_order: vec![],
        };
        project.rig.bones[0].rotation = 30.0;
        let mut history = RigHistory::new(&project, false);
        let a = add(&mut history, &mut project, 0);
        let b = add(&mut history, &mut project, a);
        history
            .apply(
                &mut project,
                RigEdit::AddImage {
                    path: "image".into(),
                    x: 0.0,
                    y: 0.0,
                    bone: a,
                    image: "image".into(),
                    width: 32.0,
                    height: 24.0,
                },
            )
            .unwrap();
        let id = history.slot_ids[0];
        let pose = |p: &RegionProject| {
            let s = &p.slots[0];
            let r = s.attachment.as_ref().unwrap();
            let b = poses(&p.rig.bones)[s.bone];
            let (sin, cos) = b.angle.to_radians().sin_cos();
            (
                b.x + cos * r.x - sin * r.y,
                b.y + sin * r.x + cos * r.y,
                b.angle + r.rotation,
            )
        };
        let edit:RigEdit=serde_json::from_value(serde_json::json!({"type":"updateSlot","id":id,"bone":a,"name":"image","visible":true,"x":20,"y":-10,"rotation":25,"scaleX":1.5,"scaleY":0.75})).unwrap();
        history.apply(&mut project, edit).unwrap();
        let before = pose(&project);
        history
            .apply(
                &mut project,
                RigEdit::UpdateSlot {
                    id,
                    name: "image".into(),
                    bone: b,
                    visible: true,
                    x: 20.0,
                    y: -10.0,
                    rotation: 25.0,
                    scale_x: 1.5,
                    scale_y: 0.75,
                },
            )
            .unwrap();
        let after = pose(&project);
        assert!(
            (before.0 - after.0).abs() < 0.001
                && (before.1 - after.1).abs() < 0.001
                && (before.2 - after.2).abs() < 0.001
        );
        assert_eq!(project.slots[0].attachment.as_ref().unwrap().scale_x, 1.5);
    }
    #[test]
    fn slots_preserve_bindings_inventory_and_ids_through_reorder_delete_and_history() {
        let mut project = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [0; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut history = RigHistory::new(&project, false);
        let a = add(&mut history, &mut project, 0);
        let b = add(&mut history, &mut project, 0);
        for (bone, name) in [(a, "arm"), (b, "body")] {
            history
                .apply(
                    &mut project,
                    RigEdit::AddImage {
                        path: "image".into(),
                        x: 0.0,
                        y: 0.0,
                        bone,
                        image: name.into(),
                        width: 32.0,
                        height: 24.0,
                    },
                )
                .unwrap();
        }
        let slot_id = history.slot_ids[0];
        history
            .apply(
                &mut project,
                RigEdit::ReorderSlot {
                    id: slot_id,
                    index: 1,
                },
            )
            .unwrap();
        assert_eq!(project.region_order, [1, 0]);
        history
            .apply(&mut project, RigEdit::Reparent { id: a, parent: b })
            .unwrap();
        let view = history.slot_views(&project, &crate::images::ImageCache::default());
        assert_eq!(view.iter().find(|s| s.id == slot_id).unwrap().bone, a);
        history.mark_saved(&project);
        let saved = project.clone();
        history
            .apply(&mut project, RigEdit::Delete { id: b })
            .unwrap();
        assert!(project.slots.is_empty() && project.region_order.is_empty());
        history.apply(&mut project, RigEdit::Undo).unwrap();
        assert_eq!(project, saved);
        assert!(!history.dirty(&project));
        assert!(history.slot_ids.contains(&slot_id));
        history
            .apply(&mut project, RigEdit::DeleteSlot { id: slot_id })
            .unwrap();
        assert_eq!(project.slots.len(), 1);
        assert_eq!(project.region_order, [0]);
        history.apply(&mut project, RigEdit::Undo).unwrap();
        assert_eq!(project, saved);
        let mut invalid = project.slots[0].clone();
        invalid.attachment.as_mut().unwrap().x = f32::NAN;
        let edit = RigEdit::UpdateSlot {
            id: history.slot_ids[0],
            name: invalid.name,
            bone: b,
            visible: true,
            x: f32::NAN,
            y: 0.0,
            rotation: 0.0,
            scale_x: 1.0,
            scale_y: 1.0,
        };
        assert!(history.apply(&mut project, edit).is_err());
        assert_eq!(project, saved);
    }
    fn add(history: &mut RigHistory, project: &mut RegionProject, parent: u64) -> u64 {
        history
            .apply(
                project,
                RigEdit::Create {
                    color: None,
                    parent,
                    x: 30.0,
                    y: 10.0,
                    rotation: 25.0,
                    length: 80.0,
                },
            )
            .unwrap();
        history.focus()
    }
    #[test]
    fn reparent_preserves_world_pose_and_stable_ids_even_when_parent_was_later() {
        let mut project = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [0; 16]),
            slots: vec![],
            region_order: vec![],
        };
        project.rig.bones[0].rotation = 30.0;
        let mut history = RigHistory::new(&project, true);
        let a = add(&mut history, &mut project, 0);
        let child = add(&mut history, &mut project, a);
        let b = add(&mut history, &mut project, 0);
        let before: HashMap<_, _> = history
            .ids
            .iter()
            .copied()
            .zip(poses(&project.rig.bones))
            .collect();
        history
            .apply(&mut project, RigEdit::Reparent { id: a, parent: b })
            .unwrap();
        for (id, pose) in history.ids.iter().zip(poses(&project.rig.bones)) {
            assert!((before[id].x - pose.x).abs() < 0.001);
            assert!((before[id].y - pose.y).abs() < 0.001);
            assert!((before[id].angle - pose.angle).abs() < 0.001);
        }
        let views = history.views(&project.rig.bones);
        assert_eq!(
            views.iter().find(|v| v.id == child).unwrap().parent,
            Some(a)
        );
        assert_eq!(views.iter().find(|v| v.id == a).unwrap().parent, Some(b));
        assert!(project
            .rig
            .bones
            .iter()
            .enumerate()
            .all(|(i, b)| b.parent.is_none_or(|p| p < i)));
    }
    #[test]
    fn undo_redo_delete_and_saved_checkpoint_preserve_graph_and_dirty_state() {
        let mut project = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [0; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut history = RigHistory::new(&project, true);
        let a = add(&mut history, &mut project, 0);
        let child = add(&mut history, &mut project, a);
        history.mark_saved(&project);
        let saved = project.clone();
        history
            .apply(&mut project, RigEdit::Delete { id: a })
            .unwrap();
        assert_eq!(project.rig.bones.len(), 1);
        assert!(history.dirty(&project));
        history.apply(&mut project, RigEdit::Undo).unwrap();
        assert_eq!(project, saved);
        assert!(!history.dirty(&project));
        assert!(history
            .views(&project.rig.bones)
            .iter()
            .any(|v| v.id == child));
        history.apply(&mut project, RigEdit::Redo).unwrap();
        assert_eq!(project.rig.bones.len(), 1);
        history.apply(&mut project, RigEdit::Undo).unwrap();
        add(&mut history, &mut project, 0);
        assert!(!history.can_redo());
    }
    #[test]
    fn world_move_and_tip_under_rotated_parent_roundtrip_through_codec() {
        let mut project = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [0; 16]),
            slots: vec![],
            region_order: vec![],
        };
        project.rig.bones[0].rotation = 90.0;
        let mut history = RigHistory::new(&project, true);
        let id = add(&mut history, &mut project, 0);
        history
            .apply(
                &mut project,
                RigEdit::Move {
                    id,
                    x: 125.0,
                    y: -40.0,
                },
            )
            .unwrap();
        let world = poses(&project.rig.bones);
        assert!((world[1].x - 125.0).abs() < 0.001);
        assert!((world[1].y + 40.0).abs() < 0.001);
        history
            .apply(
                &mut project,
                RigEdit::Tip {
                    id,
                    x: 125.0,
                    y: 60.0,
                },
            )
            .unwrap();
        assert!((project.rig.bones[1].length - 100.0).abs() < 0.001);
        assert!(project.rig.bones[1].rotation.abs() < 0.001);
        let payload = encode_region_payload(&project).unwrap();
        assert_eq!(
            fbones_format::minimal::regions::decode_regions(&payload).unwrap(),
            project
        );
    }
    #[test]
    fn invalid_edits_and_cycles_leave_project_and_history_unchanged() {
        let mut project = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [0; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut history = RigHistory::new(&project, true);
        let a = add(&mut history, &mut project, 0);
        let child = add(&mut history, &mut project, a);
        let saved = project.clone();
        for edit in [
            RigEdit::Reparent {
                id: a,
                parent: child,
            },
            RigEdit::Delete { id: 0 },
            RigEdit::Move {
                id: a,
                x: f32::NAN,
                y: 0.0,
            },
            RigEdit::Update {
                scale_x: None,
                scale_y: None,
                shear_x: None,
                shear_y: None,
                id: a,
                name: "root".into(),
                x: 0.0,
                y: 0.0,
                rotation: 0.0,
                length: 10.0,
            },
        ] {
            assert!(history.apply(&mut project, edit).is_err());
            assert_eq!(project, saved);
        }
    }
    fn transform_edit(ids: Vec<u64>, mode: TransformMode, rotation: f32) -> RigEdit {
        RigEdit::TransformBones {
            individual: false,
            local_axes: false,
            ids,
            mode,
            pivot_x: 10.0,
            pivot_y: 0.0,
            dx: 0.0,
            dy: 0.0,
            rotation,
            scale_x: 1.0,
            scale_y: 1.0,
            shear_x: 0.0,
            shear_y: 0.0,
        }
    }
    #[test]
    fn affine_multiselection_pose_length_and_reparent_keep_world_geometry() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [9; 16]),
            slots: vec![],
            region_order: vec![],
        };
        p.rig.bones.extend([
            Bone {
                name: "arm".into(),
                parent: Some(0),
                x: 10.0,
                length: 40.0,
                ..Bone::root()
            },
            Bone {
                name: "hand".into(),
                parent: Some(1),
                x: 10.0,
                length: 20.0,
                ..Bone::root()
            },
            Bone {
                name: "other".into(),
                parent: Some(0),
                y: 20.0,
                scale_x: 1.75,
                scale_y: -0.6,
                shear_x: 17.0,
                shear_y: -23.0,
                ..Bone::root()
            },
        ]);
        let mut h = RigHistory::new(&p, true);
        let original = p.clone();
        h.apply(
            &mut p,
            transform_edit(vec![1, 2], TransformMode::Rotate, 90.0),
        )
        .unwrap();
        let world = poses(&p.rig.bones);
        assert!((world[1].x - 10.0).abs() < 1e-4 && world[1].y.abs() < 1e-4);
        assert!((world[2].x - 10.0).abs() < 1e-4 && (world[2].y - 10.0).abs() < 1e-4);
        assert_eq!(p.rig.bones[2].x, 10.0);
        assert_eq!(p.rig.bones[1].length, 40.0);
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p, original);
        h.apply(
            &mut p,
            transform_edit(vec![1, 3], TransformMode::Pose, 45.0),
        )
        .unwrap();
        let world = poses(&p.rig.bones);
        assert!((world[1].x - 10.0).abs() < 1e-4 && world[1].y.abs() < 1e-4);
        assert!(world[3].x.abs() < 1e-4 && (world[3].y - 20.0).abs() < 1e-4);
        let before: HashMap<_, _> = h.ids.iter().copied().zip(world).collect();
        h.apply(&mut p, RigEdit::Reparent { id: 1, parent: 3 })
            .unwrap();
        for (id, pose) in h.ids.iter().zip(poses(&p.rig.bones)) {
            let old = before[id];
            for (x, y) in [pose.x, pose.y, pose.a, pose.b, pose.c, pose.d]
                .into_iter()
                .zip([old.x, old.y, old.a, old.b, old.c, old.d])
            {
                assert!((x - y).abs() < 2e-4, "world matrix changed: {x} != {y}");
            }
        }
        let index = h.ids.iter().position(|i| *i == 1).unwrap();
        let pose = poses(&p.rig.bones)[index];
        let rotation = p.rig.bones[index].rotation;
        let (x, y) = pose.point(70.0, 0.0);
        h.apply(&mut p, RigEdit::Length { id: 1, x, y }).unwrap();
        assert!((p.rig.bones[index].length - 70.0).abs() < 1e-4);
        assert_eq!(p.rig.bones[index].rotation, rotation);
        let bytes = encode_region_payload(&p).unwrap();
        assert_eq!(
            fbones_format::minimal::regions::decode_regions(&bytes).unwrap(),
            p
        );
    }
    #[test]
    fn folder_colors_and_world_placement_are_atomic_and_undoable() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [8; 16]),
            slots: vec![],
            region_order: vec![],
        };
        p.rig.bones[0].scale_x = 1.75;
        p.rig.bones[0].scale_y = -0.6;
        p.rig.bones[0].shear_x = 17.0;
        p.rig.bones[0].shear_y = -23.0;
        let mut h = RigHistory::new(&p, true);
        let original = p.clone();
        h.apply(
            &mut p,
            RigEdit::SetImagesRoot {
                path: "./art/library/".into(),
            },
        )
        .unwrap();
        assert!(h.dirty(&p));
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p, original);
        assert!(h
            .apply(
                &mut p,
                RigEdit::SetBoneColors {
                    colors: vec![
                        BoneColorEdit {
                            id: 0,
                            color: 0x22bb66ff
                        },
                        BoneColorEdit {
                            id: 999,
                            color: 0xff0000ff
                        }
                    ]
                }
            )
            .is_err());
        assert_eq!(p, original);
        h.apply(
            &mut p,
            RigEdit::SetBoneColor {
                id: 0,
                color: 0x22bb66ff,
            },
        )
        .unwrap();
        assert_eq!(p.rig.bones[0].color, [0x22, 0xbb, 0x66, 0xff]);
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p, original);
        h.apply(
            &mut p,
            RigEdit::AddImage {
                bone: 0,
                image: "arm".into(),
                path: "parts/arm".into(),
                x: 43.0,
                y: -17.0,
                width: 32.0,
                height: 24.0,
            },
        )
        .unwrap();
        let r = p.slots[0].attachment.as_ref().unwrap();
        let (x, y) = poses(&p.rig.bones)[0].point(r.x, r.y);
        assert!((x - 43.0).abs() < 1e-4 && (y + 17.0).abs() < 1e-4);
        assert_eq!(r.path, "parts/arm");
        p.rig.bones[0].scale_x = 0.0;
        let singular = p.clone();
        assert!(h
            .apply(
                &mut p,
                RigEdit::AddImage {
                    bone: 0,
                    image: "bad".into(),
                    path: "bad".into(),
                    x: 1.0,
                    y: 1.0,
                    width: 32.0,
                    height: 24.0
                }
            )
            .is_err());
        assert_eq!(p, singular);
    }
    #[test]
    fn save_as_rebases_unrelated_undo_roots_but_keeps_deliberate_folder_switches() {
        let mut p = RegionProject {
            images_root: "./source/".into(),
            rig: MinimalProject::new("rig".into(), [3; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut h = RigHistory::new(&p, true);
        h.apply(
            &mut p,
            RigEdit::Move {
                id: 0,
                x: 10.0,
                y: 0.0,
            },
        )
        .unwrap();
        h.apply(
            &mut p,
            RigEdit::SetImagesRoot {
                path: "./other/".into(),
            },
        )
        .unwrap();
        h.apply(
            &mut p,
            RigEdit::Move {
                id: 0,
                x: 10.0,
                y: 20.0,
            },
        )
        .unwrap();
        h.apply(&mut p, RigEdit::Undo).unwrap();
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p.images_root, "./source/");
        h.rebase_images_root("./source/", "./images/");
        p.images_root = "./images/".into();
        h.mark_saved(&p);
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p.images_root, "./images/");
        assert_eq!(p.rig.bones[0].x, 0.0);
        h.apply(&mut p, RigEdit::Redo).unwrap();
        assert_eq!(p.images_root, "./images/");
        assert_eq!(p.rig.bones[0].x, 10.0);
        h.apply(&mut p, RigEdit::Redo).unwrap();
        assert_eq!(p.images_root, "./other/");
        h.apply(&mut p, RigEdit::Redo).unwrap();
        assert_eq!(p.images_root, "./other/");
        assert_eq!(p.rig.bones[0].y, 20.0);
    }
    #[test]
    fn slot_drag_across_shear_preserves_world_image_as_a_canonical_mesh() {
        let mut p = RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("slot".into(), [23; 16]),
            slots: vec![],
            region_order: vec![],
        };
        let mut h = RigHistory::new(&p, true);
        h.apply(
            &mut p,
            RigEdit::Create {
                parent: 0,
                x: 20.0,
                y: 15.0,
                rotation: 25.0,
                length: 30.0,
                color: None,
            },
        )
        .unwrap();
        p.rig.bones[1].shear_y = 30.0;
        p.rig.bones[1].scale_x = 1.5;
        h.apply(
            &mut p,
            RigEdit::AddImage {
                bone: 0,
                image: "sprite".into(),
                path: "parts/sprite".into(),
                x: 10.0,
                y: -12.0,
                width: 32.0,
                height: 24.0,
            },
        )
        .unwrap();
        let original = p.clone();
        let expected = crate::mesh::world_vertices(
            &crate::mesh::from_region(p.slots[0].attachment.as_ref().unwrap(), 0),
            &poses(&p.rig.bones),
        );
        h.apply(
            &mut p,
            RigEdit::UpdateSlot {
                id: 0,
                name: "sprite".into(),
                bone: 1,
                visible: true,
                x: 10.0,
                y: -12.0,
                rotation: 0.0,
                scale_x: 1.0,
                scale_y: 1.0,
            },
        )
        .unwrap();
        assert_eq!(p.slots[0].bone, 1);
        let mesh = p.slots[0].attachment.as_ref().unwrap().mesh().unwrap();
        let actual = crate::mesh::world_vertices(mesh, &poses(&p.rig.bones));
        for (a, b) in expected.iter().zip(actual) {
            assert!((a[0] - b[0]).abs() < 1e-4 && (a[1] - b[1]).abs() < 1e-4);
        }
        let bytes = encode_region_payload(&p).unwrap();
        assert_eq!(
            fbones_format::minimal::regions::decode_regions(&bytes).unwrap(),
            p
        );
        h.apply(&mut p, RigEdit::Undo).unwrap();
        assert_eq!(p, original);
    }
}
