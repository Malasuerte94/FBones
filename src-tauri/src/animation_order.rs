//! Draw order is a sampled permutation, independent of Setup slot inventory.
use crate::{animation, project::AppError, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{
    draw_order_offsets, draw_order_permutation, Animation, DrawOrderKey, SceneProject,
};
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::HashSet;
fn invalid(message: &str) -> AppError {
    AppError::new("InvalidAnimation", message)
}
fn required_order<'de, D: Deserializer<'de>>(d: D) -> Result<Option<Vec<u64>>, D::Error> {
    Option::deserialize(d)
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OrderKeyInput {
    pub frame: f32,
    #[serde(deserialize_with = "required_order")]
    pub order: Option<Vec<u64>>,
    #[serde(default)]
    pub key_id: Option<u64>,
}
#[derive(Clone, Debug, Serialize)]
pub struct OrderKeyView {
    pub id: u64,
    pub frame: f32,
    pub order: Option<Vec<u64>>,
}
pub(crate) fn allocate_ids(clip: &Animation, next: &mut u64) -> Result<Vec<u64>, AppError> {
    clip.draw_order
        .iter()
        .map(|_| animation::allocate(next))
        .collect()
}
pub(crate) fn views(frame: &SceneFrame, a: usize) -> Vec<OrderKeyView> {
    frame.project.animations[a]
        .draw_order
        .iter()
        .enumerate()
        .map(|(k, key)| OrderKeyView {
            id: frame.animation_draw_key_ids[a][k],
            frame: key.frame,
            order: (!key.offsets.is_empty()).then(|| {
                draw_order_permutation(frame.slot_ids.len(), &key.offsets)
                    .expect("validated draw order")
                    .iter()
                    .map(|i| frame.slot_ids[*i])
                    .collect()
            }),
        })
        .collect()
}
pub(crate) fn sample_indices(
    scene: &SceneProject,
    clip: Option<&Animation>,
    position: f64,
) -> Result<Vec<usize>, AppError> {
    if let Some(clip) = clip {
        let end = clip
            .draw_order
            .partition_point(|key| f64::from(key.frame) <= position);
        if end > 0 {
            return Ok(draw_order_permutation(
                scene.slots.len(),
                &clip.draw_order[end - 1].offsets,
            )?);
        }
    }
    Ok((0..scene.slots.len()).collect())
}
pub(crate) fn resolve_ids(frame: &SceneFrame, order: &[u64]) -> Result<Vec<usize>, AppError> {
    if order.len() != frame.slot_ids.len() {
        return Err(invalid("Draw order must contain every slot exactly once."));
    }
    let mut seen = HashSet::new();
    order
        .iter()
        .map(|id| {
            if !seen.insert(*id) {
                return Err(invalid("Draw order repeats a slot."));
            }
            frame.slot_index(*id)
        })
        .collect()
}
pub(crate) fn set_keys(
    frame: &mut SceneFrame,
    next: &mut u64,
    a: usize,
    inputs: Vec<OrderKeyInput>,
) -> Result<(), AppError> {
    if inputs.is_empty() || inputs.len() > 4096 {
        return Err(invalid("Choose a nonempty bounded draw-order batch."));
    }
    let old = &frame.project.animations[a].draw_order;
    let old_ids = &frame.animation_draw_key_ids[a];
    let mut checked = Vec::new();
    let mut seen = HashSet::new();
    for input in inputs {
        let position = animation::checked_frame(input.frame)?;
        let target = if let Some(id) = input.key_id {
            let k = old_ids
                .iter()
                .position(|n| *n == id)
                .ok_or_else(|| invalid("The selected draw-order key no longer exists."))?;
            if old[k].frame != position {
                return Err(invalid(
                    "The selected draw-order key moved to another frame.",
                ));
            }
            Some(id)
        } else {
            let end = old.partition_point(|k| k.frame <= position);
            (end > 0 && old[end - 1].frame == position).then(|| old_ids[end - 1])
        };
        if !seen.insert((position.to_bits(), target)) {
            return Err(invalid("A draw-order batch repeats the same key."));
        }
        let offsets = if let Some(order) = input.order {
            draw_order_offsets(&resolve_ids(frame, &order)?)?
        } else {
            vec![]
        };
        checked.push((position, offsets, target));
    }
    for (position, offsets, target) in checked {
        let keys = &mut frame.project.animations[a].draw_order;
        let ids = &mut frame.animation_draw_key_ids[a];
        if let Some(id) = target {
            let k = ids.iter().position(|n| *n == id).unwrap();
            keys[k] = DrawOrderKey {
                frame: keys[k].frame,
                offsets,
            };
        } else {
            let k = keys.partition_point(|key| key.frame <= position);
            keys.insert(
                k,
                DrawOrderKey {
                    frame: position,
                    offsets,
                },
            );
            ids.insert(k, animation::allocate(next)?);
        }
    }
    Ok(())
}
pub(crate) fn delete_keys(frame: &mut SceneFrame, a: usize, wanted: &HashSet<u64>) {
    let ids = &mut frame.animation_draw_key_ids[a];
    let keys = &mut frame.project.animations[a].draw_order;
    for k in (0..ids.len()).rev() {
        if wanted.contains(&ids[k]) {
            ids.remove(k);
            keys.remove(k);
        }
    }
}
pub(crate) fn move_keys(
    frame: &mut SceneFrame,
    a: usize,
    wanted: &HashSet<u64>,
    delta: f32,
) -> Result<(), AppError> {
    let mut moved = frame.project.animations[a]
        .draw_order
        .iter()
        .cloned()
        .zip(frame.animation_draw_key_ids[a].iter().copied())
        .map(|(mut key, id)| {
            if wanted.contains(&id) {
                key.frame = animation::checked_frame(key.frame + delta)?;
            }
            Ok((key, id))
        })
        .collect::<Result<Vec<_>, AppError>>()?;
    moved.sort_by(|a, b| a.0.frame.total_cmp(&b.0.frame));
    if moved.windows(2).any(|p| {
        p[0].0.frame == p[1].0.frame && (wanted.contains(&p[0].1) || wanted.contains(&p[1].1))
    }) {
        return Err(invalid("Moving keys would collide with a draw-order key."));
    }
    frame.project.animations[a].draw_order = moved.iter().map(|(key, _)| key.clone()).collect();
    frame.animation_draw_key_ids[a] = moved.iter().map(|(_, id)| *id).collect();
    Ok(())
}
pub(crate) fn remap_references(before: &SceneFrame, next: &mut SceneFrame) -> Result<(), AppError> {
    if before.slot_ids == next.slot_ids {
        return Ok(());
    }
    for clip in &mut next.project.animations {
        for key in &mut clip.draw_order {
            if key.offsets.is_empty() {
                continue;
            }
            let previous = draw_order_permutation(before.slot_ids.len(), &key.offsets)?;
            if before.slot_ids.len() != next.slot_ids.len()
                || before.slot_ids.iter().any(|id| !next.slot_ids.contains(id))
            {
                return Err(invalid(
                    "Clear explicit draw-order keys before adding or deleting slots.",
                ));
            }
            let order = previous
                .iter()
                .map(|i| {
                    next.slot_ids
                        .iter()
                        .position(|id| *id == before.slot_ids[*i])
                        .unwrap()
                })
                .collect::<Vec<_>>();
            let offsets = draw_order_offsets(&order)?;
            key.offsets = if offsets.is_empty() {
                let mut retained = key
                    .offsets
                    .iter()
                    .map(|offset| fbones_format::minimal::scene::SlotOffset {
                        slot: next
                            .slot_ids
                            .iter()
                            .position(|id| *id == before.slot_ids[offset.slot])
                            .unwrap(),
                        offset: 0,
                    })
                    .collect::<Vec<_>>();
                retained.sort_by_key(|offset| offset.slot);
                retained
            } else {
                offsets
            };
        }
    }
    Ok(())
}
