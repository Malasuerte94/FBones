//! Read-only evaluated pose snapshots. A gesture freezes one returned epoch;
//! only its exact published matrices may interpret that gesture's world targets.
#[cfg(test)]
#[path = "animation_physics_preview_tests.rs"]
mod animation_physics_preview_tests;
#[cfg(test)]
#[path = "evaluation_continuation_tests.rs"]
mod continuation_tests;
use crate::{
    project::AppError,
    rig::Pose,
    solve::{self, PhysicsState, StepMode},
};
use fbones_format::minimal::scene::{Constraint, SceneProject};
use serde::{Deserialize, Serialize};
#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum EvaluationMode {
    Reset,
    Update,
    Pose,
    None,
    /// FBones setup preview: rebuild unchanged authored state on fixed 60 Hz ticks.
    /// This is an internal snapshot mode, not a Spine animation-scrub claim.
    Replay,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluationRequest {
    pub mode: EvaluationMode,
    pub time: f64,
    #[serde(default)]
    pub animation_id: Option<u64>,
    /// Explicit transient Animate endpoint pose, accepted by None/Replay freezes.
    #[serde(default)]
    pub animation_pose: Option<Vec<LocalPoseView>>,
    #[serde(default)]
    pub constraint_pose: Option<Vec<crate::animation_constraints::ConstraintPose>>,
    #[serde(default)]
    pub draw_order_pose: Option<Vec<u64>>,
    #[serde(default)]
    pub deform_pose: Option<Vec<crate::animation_deform::TemporaryDeformPose>>,
    #[serde(default)]
    pub deform_targets: Vec<u64>,
    #[serde(default)]
    pub motion: Option<ReplayMotion>,
    #[serde(default)]
    pub from_pose_epoch: Option<u64>,
}
#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalPoseView {
    pub x: f64,
    pub y: f64,
    pub rotation: f64,
    pub scale_x: f64,
    pub scale_y: f64,
    pub shear_x: f64,
    pub shear_y: f64,
}
impl From<LocalPoseView> for solve::LocalPose {
    fn from(p: LocalPoseView) -> Self {
        Self {
            x: p.x,
            y: p.y,
            rotation: p.rotation,
            scale_x: p.scale_x,
            scale_y: p.scale_y,
            shear_x: p.shear_x,
            shear_y: p.shear_y,
        }
    }
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReplayMotion {
    pub initial: Vec<LocalPoseView>,
    pub changes: Vec<ReplayMotionChange>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReplayMotionChange {
    pub tick: u32,
    pub poses: Vec<LocalPoseView>,
}
const MAX_MOTION_POSES: usize = 262_144;
fn validate_motion(
    request: &EvaluationRequest,
    bone_count: usize,
    start_tick: u32,
) -> Result<(), AppError> {
    let Some(motion) = &request.motion else {
        return Ok(());
    };
    let invalid = || {
        AppError::new("InvalidReplayMotion","Use complete finite bounded poses and strictly increasing recorded ticks within the preview time.")
    };
    if !matches!(request.mode, EvaluationMode::Replay) || motion.initial.len() != bone_count {
        return Err(invalid());
    }
    if motion.changes.len() > 7200
        || bone_count
            .checked_mul(motion.changes.len() + 1)
            .is_none_or(|count| count > MAX_MOTION_POSES)
    {
        return Err(AppError::new("PreviewReplayLimit","Recorded setup motion reached its memory budget. Reset the preview before editing geometry."));
    }
    let valid_pose = |pose: &LocalPoseView| {
        [
            pose.x,
            pose.y,
            pose.rotation,
            pose.scale_x,
            pose.scale_y,
            pose.shear_x,
            pose.shear_y,
        ]
        .iter()
        .all(|v| v.is_finite() && v.abs() <= 1_000_000.0)
    };
    if !motion.initial.iter().all(valid_pose) {
        return Err(invalid());
    }
    let max_tick = (request.time * 60.0 + 1e-7).floor() as u32;
    let mut previous = start_tick;
    for change in &motion.changes {
        if change.tick <= previous
            || change.tick > max_tick
            || change.poses.len() != bone_count
            || !change.poses.iter().all(valid_pose)
        {
            return Err(invalid());
        }
        previous = change.tick;
    }
    Ok(())
}
impl From<solve::LocalPose> for LocalPoseView {
    fn from(p: solve::LocalPose) -> Self {
        Self {
            x: p.x,
            y: p.y,
            rotation: p.rotation,
            scale_x: p.scale_x,
            scale_y: p.scale_y,
            shear_x: p.shear_x,
            shear_y: p.shear_y,
        }
    }
}
#[derive(Clone, Copy, Debug, Serialize)]
pub struct WorldPoseView {
    pub x: f32,
    pub y: f32,
    pub a: f32,
    pub b: f32,
    pub c: f32,
    pub d: f32,
}
#[derive(Clone, Debug, Serialize)]
pub struct EvaluatedBoneView {
    pub id: u64,
    pub authored: LocalPoseView,
    pub applied: LocalPoseView,
    pub world: WorldPoseView,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluationSnapshot {
    pub revision: u64,
    pub document_id: u64,
    pub pose_epoch: u64,
    pub time: f64,
    pub mode: EvaluationMode,
    pub animation_id: Option<u64>,
    pub local_bones: Vec<crate::rig::BoneView>,
    pub slot_pose: Vec<crate::animation_slots::SlotPoseView>,
    pub constraint_pose: Vec<crate::animation_constraints::ConstraintPose>,
    pub draw_order: Vec<u64>,
    pub deform_pose: Vec<crate::animation_deform::DeformPoseView>,
    pub bones: Vec<EvaluatedBoneView>,
}
pub(crate) struct CachedEvaluation {
    pub snapshot: EvaluationSnapshot,
    /// Keep precise authoring axes: geometry rounding can hide singularity.
    pub evaluated: solve::Evaluation,
    pub physics: PhysicsState,
    pub poses: Vec<Pose>,
    // Independent of the immutable public revision/geometry epoch. Authored
    // channels may change while this structural signature remains compatible.
    layout: ContinuationLayout,
}
#[derive(PartialEq)]
struct ContinuationLayout {
    fps_bits: u32,
    bones: Vec<(u64, Option<usize>, u32)>,
    constraints: Vec<Constraint>,
    animation: Option<fbones_format::minimal::scene::Animation>,
    animation_pose: Option<Vec<[u64; 7]>>,
    constraint_pose: Option<Vec<(u64, Vec<u64>)>>,
    constraint_ids: Vec<u64>,
    draw_order_pose: Option<Vec<u64>>,
    deform_pose: Option<Vec<(u64, Vec<u64>)>>,
    geometry: Vec<(
        u64,
        fbones_format::minimal::scene::AttachmentAddress,
        fbones_format::minimal::scene::SceneAttachment,
    )>,
}
impl ContinuationLayout {
    fn new(scene: &SceneProject, ids: &[u64]) -> Self {
        Self {
            fps_bits: scene.fps.to_bits(),
            bones: scene
                .rig
                .bones
                .iter()
                .zip(ids)
                .map(|(b, id)| (*id, b.parent, b.length.to_bits()))
                .collect(),
            constraints: scene.constraints.clone(),
            animation: None,
            animation_pose: None,
            constraint_pose: None,
            constraint_ids: vec![],
            draw_order_pose: None,
            deform_pose: None,
            geometry: vec![],
        }
    }
}
fn tick_floor(time: f64) -> u32 {
    if let Some(tick) = exact_tick(time) {
        return tick;
    }
    let mut tick = (time * 60.0).floor() as u32;
    // Multiplication can round a time just below a boundary to an integer.
    // A completed tick must never lie after the requested timestamp.
    if tick as f64 / 60.0 > time {
        tick = tick.saturating_sub(1);
    }
    tick
}
fn exact_tick(time: f64) -> Option<u32> {
    let tick = (time * 60.0).round();
    (tick >= 0.0 && tick <= u32::MAX as f64 && time == tick / 60.0).then_some(tick as u32)
}
fn tick_ceil(time: f64) -> u32 {
    let ticks = time * 60.0;
    if (ticks - ticks.round()).abs() <= 1e-7 {
        ticks.round() as u32
    } else {
        ticks.ceil() as u32
    }
}
#[cfg(test)]
pub(crate) fn evaluate(
    scene: &SceneProject,
    ids: &[u64],
    previous: Option<&CachedEvaluation>,
    revision: u64,
    document_id: u64,
    pose_epoch: u64,
    request: EvaluationRequest,
) -> Result<CachedEvaluation, AppError> {
    evaluate_animation(
        scene,
        ids,
        previous,
        revision,
        document_id,
        pose_epoch,
        &request,
        &(0..scene.constraints.len() as u64).collect::<Vec<_>>(),
        None,
        &[],
    )
}
#[allow(clippy::too_many_arguments)]
pub(crate) fn evaluate_animation(
    scene: &SceneProject,
    ids: &[u64],
    previous: Option<&CachedEvaluation>,
    revision: u64,
    document_id: u64,
    pose_epoch: u64,
    request: &EvaluationRequest,
    constraint_ids: &[u64],
    animation: Option<&fbones_format::minimal::scene::Animation>,
    geometry_targets: &[(u64, fbones_format::minimal::scene::AttachmentAddress)],
) -> Result<CachedEvaluation, AppError> {
    if request.animation_id.is_some() != animation.is_some()
        || (animation.is_some() && request.motion.is_some())
    {
        return Err(AppError::new(
            "InvalidAnimation",
            "Choose one existing animation without recorded Setup motion.",
        ));
    }
    if (request.draw_order_pose.is_some()
        || request.deform_pose.is_some()
        || request.constraint_pose.is_some())
        && (animation.is_none()
            || !matches!(request.mode, EvaluationMode::None | EvaluationMode::Replay)
            || request.motion.is_some()
            || request.from_pose_epoch.is_some())
    {
        return Err(AppError::new("InvalidAnimationPose","Temporary working poses require a selected animation and a None or complete Replay freeze."));
    }
    let previous = previous.filter(|p| p.snapshot.animation_id == request.animation_id);
    let animation_pose = if let Some(poses) = &request.animation_pose {
        if animation.is_none()
            || !matches!(request.mode, EvaluationMode::None | EvaluationMode::Replay)
            || request.motion.is_some()
            || request.from_pose_epoch.is_some()
            || poses.len() != scene.rig.bones.len()
            || poses.iter().any(|pose| {
                [
                    pose.x,
                    pose.y,
                    pose.rotation,
                    pose.scale_x,
                    pose.scale_y,
                    pose.shear_x,
                    pose.shear_y,
                ]
                .iter()
                .any(|value| !value.is_finite() || value.abs() > 1_000_000.)
            })
        {
            return Err(AppError::new(
                "InvalidAnimationPose",
                "Use a complete finite temporary animation pose only for a None or complete Replay freeze.",
            ));
        }
        Some(
            poses
                .iter()
                .copied()
                .map(Into::into)
                .collect::<Vec<solve::LocalPose>>(),
        )
    } else {
        None
    };
    if !request.time.is_finite() || request.time < 0.0 {
        return Err(AppError::new(
            "InvalidTime",
            "Use a finite nonnegative evaluation time.",
        ));
    }
    let constraint_pose = crate::animation_constraints::sample(
        scene,
        constraint_ids,
        animation,
        request.time,
        request.constraint_pose.as_deref(),
    )?;
    let mut layout = ContinuationLayout::new(scene, ids);
    layout.constraint_ids = constraint_ids.to_vec();
    layout.constraint_pose = request
        .constraint_pose
        .as_ref()
        .map(|v| v.iter().map(|p| (p.id(), p.bits())).collect());
    layout.geometry = geometry_targets
        .iter()
        .map(|(id, address)| {
            (
                *id,
                *address,
                scene.slots[address.slot].attachments[address.attachment].clone(),
            )
        })
        .collect();
    layout.draw_order_pose = request.draw_order_pose.clone();
    layout.deform_pose = request.deform_pose.as_ref().map(|poses| {
        poses
            .iter()
            .map(|pose| {
                (
                    pose.attachment,
                    pose.offsets.iter().map(|v| v.to_bits()).collect(),
                )
            })
            .collect()
    });
    layout.animation = animation.cloned();
    layout.animation_pose = request.animation_pose.as_ref().map(|poses| {
        poses
            .iter()
            .map(|pose| {
                [
                    pose.x,
                    pose.y,
                    pose.rotation,
                    pose.scale_x,
                    pose.scale_y,
                    pose.shear_x,
                    pose.shear_y,
                ]
                .map(f64::to_bits)
            })
            .collect()
    });
    if request.from_pose_epoch.is_some() && !matches!(request.mode, EvaluationMode::Replay) {
        return Err(AppError::new(
            "InvalidReplayMotion",
            "Only Replay can continue a native checkpoint.",
        ));
    }
    let checkpoint = if let Some(epoch) = request.from_pose_epoch {
        Some(
            previous
                .filter(|p| {
                    p.snapshot.pose_epoch == epoch
                        && p.snapshot.document_id == document_id
                        && matches!(p.snapshot.mode, EvaluationMode::Replay)
                        && p.layout == layout
                })
                .ok_or_else(|| {
                    AppError::new(
                        "StalePose",
                        "The native physics checkpoint no longer matches this document or layout.",
                    )
                })?,
        )
    } else {
        None
    };
    let start_time = checkpoint.map_or(0.0, |p| p.snapshot.time);
    let bounded_tick_span = matches!((exact_tick(start_time),exact_tick(request.time)),(Some(start),Some(end)) if end>=start && end-start<=7200);
    if matches!(request.mode, EvaluationMode::Replay)
        && (request.time < start_time
            || request.time * 60.0 > u32::MAX as f64
            || (request.time - start_time > 120.0 && !bounded_tick_span))
    {
        return Err(AppError::new(
            "PreviewReplayLimit",
            "Use a monotonic replay segment of at most 120 seconds from a current checkpoint.",
        ));
    }
    let start_tick = tick_floor(start_time);
    validate_motion(request, scene.rig.bones.len(), start_tick)?;
    let mut physics = previous
        .filter(|p| p.snapshot.revision == revision && p.snapshot.document_id == document_id)
        .map(|p| p.physics.clone())
        .unwrap_or_default();
    let evaluate_at = |authored: Option<&[solve::LocalPose]>,
                       physics: &mut PhysicsState,
                       mode: StepMode,
                       time: f64,
                       previous: f64,
                       initial: bool|
     -> Result<solve::Evaluation, solve::SolveError> {
        if animation.is_none() && request.constraint_pose.is_none() {
            return solve::evaluate(scene, authored, physics, mode);
        }
        let sampled = crate::animation_constraints::sample(
            scene,
            constraint_ids,
            animation,
            time,
            if matches!(mode, StepMode::Pose | StepMode::None) {
                request.constraint_pose.as_deref()
            } else {
                None
            },
        )
        .map_err(|_| solve::SolveError::InvalidConstraint)?;
        let values = sampled.iter().map(|p| p.value()).collect::<Vec<_>>();
        let resets = if matches!(mode, StepMode::Reset { .. } | StepMode::Update { .. }) {
            crate::animation_constraints::reset_crossings(
                animation, scene.fps, previous, time, initial,
            )
        } else {
            vec![]
        };
        solve::evaluate_sampled(scene, authored, physics, mode, &values, &resets)
    };
    let evaluated = match request.mode {
        EvaluationMode::Replay => {
            physics = checkpoint.map(|p| p.physics.clone()).unwrap_or_default();
            let mut authored = request.motion.as_ref().map(|motion| {
                motion
                    .initial
                    .iter()
                    .copied()
                    .map(Into::into)
                    .collect::<Vec<solve::LocalPose>>()
            });
            if let Some(clip) = animation {
                authored = Some(crate::animation::sample(scene, clip, start_time)?);
            }
            let mut next_change = 0;
            let mut evaluated = if checkpoint.is_some() {
                // Pose does not advance or rewrite spring state. It also gives
                // the zero-step continuation a valid evaluation result.
                evaluate_at(
                    authored.as_deref(),
                    &mut physics,
                    StepMode::Pose,
                    start_time,
                    start_time,
                    false,
                )
            } else {
                evaluate_at(
                    authored.as_deref(),
                    &mut physics,
                    StepMode::Reset { time: 0. },
                    0.,
                    0.,
                    true,
                )
            };
            let ticks = if request.time == start_time {
                start_tick
            } else {
                tick_ceil(request.time)
            };
            for previous_tick in start_tick..ticks {
                let tick = previous_tick + 1;
                if let Some(motion) = &request.motion {
                    while let Some(change) = motion
                        .changes
                        .get(next_change)
                        .filter(|change| change.tick <= tick)
                    {
                        authored = Some(change.poses.iter().copied().map(Into::into).collect());
                        next_change += 1;
                    }
                }
                if let Some(clip) = animation {
                    authored = Some(crate::animation::sample(
                        scene,
                        clip,
                        (f64::from(tick) / 60.0).min(request.time),
                    )?);
                }
                // Include a final fractional tick if explicitly requested; ordinary
                // setup preview supplies integer ticks, with no accumulated drift.
                evaluated = evaluated.and_then(|_| {
                    evaluate_at(
                        authored.as_deref(),
                        &mut physics,
                        StepMode::Update {
                            time: (f64::from(tick) / 60.).min(request.time),
                        },
                        (f64::from(tick) / 60.).min(request.time),
                        (f64::from(previous_tick) / 60.).max(start_time),
                        false,
                    )
                });
                if evaluated.is_err() {
                    break;
                }
            }
            if request.motion.is_some()
                || checkpoint.is_some()
                || animation_pose.is_some()
                || request
                    .constraint_pose
                    .as_ref()
                    .is_some_and(|poses| !poses.is_empty())
            {
                evaluated = evaluated.and_then(|_| {
                    evaluate_at(
                        if animation.is_some() {
                            animation_pose.as_deref().or(authored.as_deref())
                        } else {
                            None
                        },
                        &mut physics,
                        StepMode::Pose,
                        request.time,
                        request.time,
                        false,
                    )
                });
            }
            evaluated
        }
        mode => {
            let authored = if let Some(poses) = animation_pose {
                Some(poses)
            } else {
                animation
                    .map(|clip| crate::animation::sample(scene, clip, request.time))
                    .transpose()?
            };
            evaluate_at(
                authored.as_deref(),
                &mut physics,
                match mode {
                    EvaluationMode::Reset => StepMode::Reset { time: request.time },
                    EvaluationMode::Update => StepMode::Update { time: request.time },
                    EvaluationMode::Pose => StepMode::Pose,
                    EvaluationMode::None => StepMode::None,
                    EvaluationMode::Replay => unreachable!(),
                },
                request.time,
                previous.map_or(0., |p| p.snapshot.time),
                matches!(mode, EvaluationMode::Reset),
            )
        }
    }
    .map_err(|e| AppError::new("ConstraintEvaluation", e.to_string()))?;
    if ids.len() != evaluated.bones.len() {
        return Err(AppError::new(
            "InvalidPose",
            "Evaluation identities do not match the project.",
        ));
    }
    let mut poses = Vec::with_capacity(ids.len());
    let mut bones = Vec::with_capacity(ids.len());
    let mut local_bones = Vec::with_capacity(ids.len());
    for (i, b) in evaluated.bones.iter().enumerate() {
        let w = b.world;
        let pose = Pose {
            x: w.x as f32,
            y: w.y as f32,
            a: w.a as f32,
            b: w.b as f32,
            c: w.c as f32,
            d: w.d as f32,
            angle: w.b.atan2(w.a).to_degrees() as f32,
        };
        if [pose.x, pose.y, pose.a, pose.b, pose.c, pose.d]
            .iter()
            .any(|v| !v.is_finite() || v.abs() > 1e12)
        {
            return Err(AppError::new(
                "InvalidPose",
                "The evaluated world pose exceeds supported geometry bounds.",
            ));
        }
        poses.push(pose);
        let setup = &scene.rig.bones[i];
        let local = b.authored;
        local_bones.push(crate::rig::BoneView {
            id: ids[i],
            parent: setup.parent.map(|p| ids[p]),
            name: setup.name.clone(),
            x: local.x as f32,
            y: local.y as f32,
            rotation: local.rotation as f32,
            scale_x: local.scale_x as f32,
            scale_y: local.scale_y as f32,
            shear_x: local.shear_x as f32,
            shear_y: local.shear_y as f32,
            length: setup.length,
            color: u32::from_be_bytes(setup.color),
        });
        bones.push(EvaluatedBoneView {
            id: ids[i],
            authored: b.authored.into(),
            applied: b.applied.into(),
            world: WorldPoseView {
                x: pose.x,
                y: pose.y,
                a: pose.a,
                b: pose.b,
                c: pose.c,
                d: pose.d,
            },
        });
    }
    Ok(CachedEvaluation {
        snapshot: EvaluationSnapshot {
            revision,
            document_id,
            pose_epoch,
            time: request.time,
            mode: request.mode,
            animation_id: request.animation_id,
            local_bones,
            slot_pose: vec![],
            constraint_pose,
            draw_order: vec![],
            deform_pose: vec![],
            bones,
        },
        evaluated,
        physics,
        poses,
        layout,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn recorded_motion_memory_and_tick_budgets_are_checked_before_replay() {
        let pose =
            LocalPoseView::from(solve::LocalPose::from(&fbones_format::minimal::Bone::root()));
        let bone_count = 40;
        let max_changes = MAX_MOTION_POSES / bone_count - 1;
        let mut motion = ReplayMotion {
            initial: vec![pose; bone_count],
            changes: (1..=max_changes as u32)
                .map(|tick| ReplayMotionChange {
                    tick,
                    poses: vec![pose; bone_count],
                })
                .collect(),
        };
        let valid = EvaluationRequest {
            animation_pose: None,
            constraint_pose: None,
            draw_order_pose: None,
            deform_targets: vec![],
            deform_pose: None,
            animation_id: None,
            from_pose_epoch: None,
            mode: EvaluationMode::Replay,
            time: 120.0,
            motion: Some(motion.clone()),
        };
        validate_motion(&valid, bone_count, 0).unwrap();
        motion.changes.push(ReplayMotionChange {
            tick: max_changes as u32 + 1,
            poses: vec![pose; bone_count],
        });
        let invalid = EvaluationRequest {
            animation_pose: None,
            constraint_pose: None,
            draw_order_pose: None,
            deform_targets: vec![],
            deform_pose: None,
            animation_id: None,
            from_pose_epoch: None,
            mode: EvaluationMode::Replay,
            time: 120.0,
            motion: Some(motion),
        };
        assert_eq!(
            validate_motion(&invalid, bone_count, 0).unwrap_err().code,
            "PreviewReplayLimit"
        );
        let count = EvaluationRequest {
            animation_pose: None,
            constraint_pose: None,
            draw_order_pose: None,
            deform_targets: vec![],
            deform_pose: None,
            animation_id: None,
            from_pose_epoch: None,
            mode: EvaluationMode::Replay,
            time: 120.0,
            motion: Some(ReplayMotion {
                initial: vec![pose],
                changes: (1..=7201)
                    .map(|tick| ReplayMotionChange {
                        tick,
                        poses: vec![pose],
                    })
                    .collect(),
            }),
        };
        assert_eq!(
            validate_motion(&count, 1, 0).unwrap_err().code,
            "PreviewReplayLimit"
        );
    }
}
