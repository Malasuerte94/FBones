//! Event definitions and materialized key payloads; playback is transient output.
use crate::{animation, project::AppError, scene_edit::SceneFrame};
use fbones_format::minimal::scene::{Animation, EventDefinition, EventKeyframe, EventTimeline};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
fn invalid(s: &str) -> AppError {
    AppError::new("InvalidEvent", s)
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EventKeyInput {
    pub event: u64,
    pub frame: f32,
    pub int: i32,
    pub float: f32,
    pub string: String,
    pub volume: f32,
    pub balance: f32,
    #[serde(default)]
    pub payload_bits: Option<[u32; 3]>,
    #[serde(default)]
    pub key_id: Option<u64>,
}
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EventPatch {
    pub int: Option<i32>,
    pub float: Option<f32>,
    pub string: Option<String>,
    pub audio: Option<String>,
    pub volume: Option<f32>,
    pub balance: Option<f32>,
    pub float_bits: Option<u32>,
    pub volume_bits: Option<u32>,
    pub balance_bits: Option<u32>,
}
#[derive(Clone, Debug, Serialize)]
pub struct EventView {
    pub id: u64,
    pub name: String,
    pub int: i32,
    pub float: f32,
    pub string: String,
    pub audio: String,
    pub volume: f32,
    pub balance: f32,
}
#[derive(Clone, Debug, Serialize)]
pub struct EventKeyView {
    pub id: u64,
    pub frame: f32,
    pub int: i32,
    pub float: f32,
    pub string: String,
    pub volume: f32,
    pub balance: f32,
}
#[derive(Clone, Debug, Serialize)]
pub struct EventTrackView {
    pub event: u64,
    pub keys: Vec<EventKeyView>,
}
pub(crate) fn definitions(frame: &SceneFrame) -> Vec<EventView> {
    frame
        .project
        .events
        .iter()
        .zip(&frame.event_ids)
        .map(|(e, id)| EventView {
            id: *id,
            name: e.name.clone(),
            int: e.int,
            float: e.float,
            string: e.string.clone(),
            audio: e.audio.clone(),
            volume: e.volume,
            balance: e.balance,
        })
        .collect()
}
pub(crate) fn views(frame: &SceneFrame, a: usize) -> Vec<EventTrackView> {
    frame.project.animations[a]
        .event_tracks
        .iter()
        .enumerate()
        .map(|(t, track)| EventTrackView {
            event: frame.event_ids[track.event],
            keys: track
                .keys
                .iter()
                .enumerate()
                .map(|(k, key)| EventKeyView {
                    id: frame.animation_event_key_ids[a][t][k],
                    frame: key.frame,
                    int: key.int,
                    float: key.float,
                    string: key.string.clone(),
                    volume: key.volume,
                    balance: key.balance,
                })
                .collect(),
        })
        .collect()
}
pub(crate) fn allocate_ids(clip: &Animation, next: &mut u64) -> Result<Vec<Vec<u64>>, AppError> {
    clip.event_tracks
        .iter()
        .map(|t| t.keys.iter().map(|_| animation::allocate(next)).collect())
        .collect()
}
pub(crate) fn duration(clip: &Animation) -> f32 {
    clip.event_tracks
        .iter()
        .flat_map(|t| &t.keys)
        .map(|k| k.frame)
        .fold(0., f32::max)
}
pub(crate) fn canonicalize(frame: &mut SceneFrame) -> Result<(), AppError> {
    for (a, clip) in frame.project.animations.iter_mut().enumerate() {
        let order = clip.event_track_permutation(frame.project.events.len())?;
        let old = clip.event_tracks.clone();
        let ids = frame.animation_event_key_ids[a].clone();
        clip.event_tracks = order.iter().map(|i| old[*i].clone()).collect();
        frame.animation_event_key_ids[a] = order.iter().map(|i| ids[*i].clone()).collect();
    }
    Ok(())
}
fn string(value: &str) -> Result<(), AppError> {
    if value.len() > 1024 || value.contains('\0') {
        return Err(invalid(
            "Use a bounded event string without NUL characters.",
        ));
    }
    Ok(())
}
fn numeric(values: &[f32]) -> Result<(), AppError> {
    if values
        .iter()
        .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
    {
        return Err(invalid("Use finite event values within supported bounds."));
    }
    Ok(())
}
fn name(frame: &SceneFrame, value: &str, except: Option<usize>) -> Result<String, AppError> {
    let value = value.trim();
    if value.is_empty()
        || value.len() > 1024
        || value.chars().any(char::is_control)
        || frame
            .project
            .events
            .iter()
            .enumerate()
            .any(|(i, e)| Some(i) != except && e.name == value)
    {
        return Err(invalid(
            "Use a unique nonempty event name without control characters.",
        ));
    }
    Ok(value.into())
}
fn index(frame: &SceneFrame, id: u64) -> Result<usize, AppError> {
    frame
        .event_ids
        .iter()
        .position(|v| *v == id)
        .ok_or_else(|| invalid("Choose an existing event definition."))
}
pub(crate) fn create(
    frame: &mut SceneFrame,
    next: &mut u64,
    value: String,
) -> Result<(), AppError> {
    if frame.project.events.len() >= 128 {
        return Err(invalid(
            "This authoring profile supports at most 128 event definitions.",
        ));
    }
    let name = name(frame, &value, None)?;
    let id = animation::allocate(next)?;
    frame.project.events.push(EventDefinition {
        name,
        int: 0,
        float: 0.,
        string: String::new(),
        audio: String::new(),
        volume: 0.,
        balance: 0.,
    });
    frame.event_ids.push(id);
    frame.focus.event = Some(id);
    Ok(())
}
pub(crate) fn rename(frame: &mut SceneFrame, id: u64, value: String) -> Result<(), AppError> {
    let e = index(frame, id)?;
    let value = name(frame, &value, Some(e))?;
    frame.project.events[e].name = value;
    frame.focus.event = Some(id);
    Ok(())
}
fn patch_float(value: Option<f32>, bits: Option<u32>, stored: &mut f32) -> Result<(), AppError> {
    match (value, bits) {
        (None, None) => Ok(()),
        (Some(value), bits) => {
            let values = crate::animation_constraints::restore(vec![value], bits.map(|v| vec![v]))?;
            numeric(&values)?;
            *stored = values[0];
            Ok(())
        }
        (None, Some(_)) => Err(invalid(
            "Event numeric bits require the matching numeric field.",
        )),
    }
}
pub(crate) fn update(frame: &mut SceneFrame, id: u64, patch: EventPatch) -> Result<(), AppError> {
    let e = index(frame, id)?;
    let def = &mut frame.project.events[e];
    if let Some(int) = patch.int {
        def.int = int;
    }
    patch_float(patch.float, patch.float_bits, &mut def.float)?;
    patch_float(patch.volume, patch.volume_bits, &mut def.volume)?;
    patch_float(patch.balance, patch.balance_bits, &mut def.balance)?;
    if let Some(value) = patch.string {
        string(&value)?;
        def.string = value;
    }
    if let Some(audio) = patch.audio {
        if audio.len() > 1024
            || audio.contains('\\')
            || audio.contains(':')
            || audio.starts_with('/')
            || (!audio.is_empty()
                && audio.split('/').any(|p| {
                    p.is_empty() || p == "." || p == ".." || p.chars().any(char::is_control)
                }))
        {
            return Err(invalid("Choose a portable relative audio path."));
        }
        def.audio = audio;
    }
    frame.focus.event = Some(id);
    Ok(())
}
pub(crate) fn delete(frame: &mut SceneFrame, id: u64) -> Result<(), AppError> {
    let e = index(frame, id)?;
    if frame
        .project
        .animations
        .iter()
        .any(|a| a.event_tracks.iter().any(|t| t.event == e))
    {
        return Err(invalid(
            "Delete this event's animation keys before deleting the definition.",
        ));
    }
    frame.project.events.remove(e);
    frame.event_ids.remove(e);
    for a in &mut frame.project.animations {
        for t in &mut a.event_tracks {
            if t.event > e {
                t.event -= 1;
            }
        }
    }
    if frame.focus.event == Some(id) {
        frame.focus.event = None;
    }
    Ok(())
}
pub(crate) fn set_keys(
    frame: &mut SceneFrame,
    next: &mut u64,
    a: usize,
    inputs: Vec<EventKeyInput>,
) -> Result<(), AppError> {
    if inputs.is_empty() || inputs.len() > 4096 {
        return Err(invalid("Choose a bounded nonempty event-key batch."));
    }
    let mut seen = HashSet::new();
    for input in inputs {
        let event = index(frame, input.event)?;
        let position = animation::checked_frame(input.frame)?;
        let values = crate::animation_constraints::restore(
            vec![input.float, input.volume, input.balance],
            input.payload_bits.map(Vec::from),
        )?;
        numeric(&values)?;
        string(&input.string)?;
        let t = if let Some(t) = frame.project.animations[a]
            .event_tracks
            .iter()
            .position(|t| t.event == event)
        {
            t
        } else {
            let t = frame.project.animations[a].event_tracks.len();
            frame.project.animations[a]
                .event_tracks
                .push(EventTimeline {
                    event,
                    keys: vec![],
                });
            frame.animation_event_key_ids[a].push(vec![]);
            t
        };
        let track = &mut frame.project.animations[a].event_tracks[t];
        let ids = &mut frame.animation_event_key_ids[a][t];
        let selected = if let Some(id) = input.key_id {
            let k = ids
                .iter()
                .position(|v| *v == id)
                .ok_or_else(|| invalid("The selected event key no longer exists."))?;
            if track.keys[k].frame != position {
                return Err(invalid("The selected event key moved to another frame."));
            }
            Some(k)
        } else {
            None
        };
        if let Some(id) = input.key_id {
            if !seen.insert(id) {
                return Err(invalid("An event batch repeats the same selected key."));
            }
        }
        let key = EventKeyframe {
            frame: position,
            int: input.int,
            float: values[0],
            string: input.string,
            volume: values[1],
            balance: values[2],
        };
        if let Some(k) = selected {
            track.keys[k] = key;
        } else {
            let k = track.keys.partition_point(|k| k.frame <= position);
            track.keys.insert(k, key);
            ids.insert(k, animation::allocate(next)?);
        }
    }
    Ok(())
}
pub(crate) fn delete_keys(frame: &mut SceneFrame, a: usize, selected: &HashSet<u64>) {
    for t in (0..frame.project.animations[a].event_tracks.len()).rev() {
        let keys = &mut frame.project.animations[a].event_tracks[t].keys;
        let ids = &mut frame.animation_event_key_ids[a][t];
        for k in (0..ids.len()).rev() {
            if selected.contains(&ids[k]) {
                keys.remove(k);
                ids.remove(k);
            }
        }
        if keys.is_empty() {
            frame.project.animations[a].event_tracks.remove(t);
            frame.animation_event_key_ids[a].remove(t);
        }
    }
}
pub(crate) fn move_keys(
    frame: &mut SceneFrame,
    a: usize,
    selected: &HashSet<u64>,
    delta: f32,
) -> Result<(), AppError> {
    for (t, track) in frame.project.animations[a]
        .event_tracks
        .iter_mut()
        .enumerate()
    {
        let ids = &mut frame.animation_event_key_ids[a][t];
        let mut values = track
            .keys
            .iter()
            .cloned()
            .zip(ids.iter().copied())
            .collect::<Vec<_>>();
        for (k, id) in &mut values {
            if selected.contains(id) {
                k.frame = animation::checked_frame(k.frame + delta)?;
            }
        }
        values.sort_by(|a, b| a.0.frame.total_cmp(&b.0.frame));
        track.keys = values.iter().map(|(k, _)| k.clone()).collect();
        *ids = values.into_iter().map(|(_, id)| id).collect();
    }
    Ok(())
}
