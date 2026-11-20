//! Authored Scene data in the Spine 4.3 game JSON schema.
use crate::{
    images::valid_image_stem,
    project::AppError,
    rig::{image_stem, poses, Pose},
};
use fbones_format::{
    minimal::{
        meshes::Vertex,
        scene::{
            Animation, AttachmentAddress, BoneChannel, Constraint, ConstraintTimeline, DeformCurve,
            IkKeyCurve, KeyCurve, PathKeyCurve, PathKeyframe, PhysicsCurve, PhysicsProperty, SceneAttachment,
            SceneProject, SlotColorCurve, SlotColorKey, SlotRgbaCurve, SlotTimeline, TransformFrom,
            TransformMixCurve, TransformProperty, TransformTo,
        },
    },
    TARGET_VERSION,
};
use serde::{ser::SerializeMap, Serialize, Serializer};
use serde_json::{json, Map, Value};
use std::collections::{BTreeSet, HashSet};

pub(crate) struct SpineJson {
    pub(crate) bytes: Vec<u8>,
    pub(crate) image_keys: Vec<String>,
    pub(crate) audio_keys: Vec<String>,
}

fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("SpineExport", message)
}

fn place(map: &mut Map<String, Value>, key: &str, value: Value) -> Result<(), AppError> {
    if key.is_empty() || map.insert(key.to_owned(), value).is_some() {
        return Err(invalid(format!(
            "Empty or duplicate Spine export name: {key}"
        )));
    }
    Ok(())
}

fn field_map<'a>(value: &'a mut Value, field: &str) -> &'a mut Map<String, Value> {
    value
        .as_object_mut()
        .expect("export builder object")
        .entry(field)
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .expect("export builder section")
}

fn child_map<'a>(map: &'a mut Map<String, Value>, name: &str) -> &'a mut Map<String, Value> {
    map.entry(name)
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .expect("export builder subsection")
}

fn bone_name(scene: &SceneProject, bone: usize) -> Result<&str, AppError> {
    scene
        .rig
        .bones
        .get(bone)
        .map(|b| b.name.as_str())
        .ok_or_else(|| invalid("A Spine export references a missing bone."))
}

fn slot_name(scene: &SceneProject, slot: usize) -> Result<&str, AppError> {
    scene
        .slots
        .get(slot)
        .map(|slot| slot.name.as_str())
        .ok_or_else(|| invalid("A Spine export references a missing slot."))
}

fn attachment(
    scene: &SceneProject,
    address: AttachmentAddress,
) -> Result<&SceneAttachment, AppError> {
    scene
        .slots
        .get(address.slot)
        .and_then(|slot| slot.attachments.get(address.attachment))
        .ok_or_else(|| invalid("A Spine export references a missing attachment."))
}

fn color(bytes: &[u8]) -> String {
    use std::fmt::Write;
    let mut result = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        write!(&mut result, "{byte:02x}").expect("writing to String");
    }
    result
}

fn color_byte(value: f32) -> u8 {
    (value.clamp(0.0, 1.0) * 255.0).round() as u8
}

fn animated_color(values: &[f32]) -> String {
    color(&values.iter().copied().map(color_byte).collect::<Vec<_>>())
}

fn named_array<'a, T>(
    values: impl Iterator<Item = (&'a str, Result<T, AppError>)>,
) -> Result<Vec<T>, AppError> {
    let mut names = HashSet::new();
    values
        .map(|(name, value)| {
            if name.is_empty() || !names.insert(name) {
                return Err(invalid(format!(
                    "Empty or duplicate Spine export name: {name}"
                )));
            }
            value
        })
        .collect()
}

fn add_image(keys: &mut BTreeSet<String>, key: &str) -> Result<(), AppError> {
    // A text atlas reader trims region-name lines.
    if !valid_image_stem(key) || key.trim() != key {
        return Err(invalid(format!(
            "Image key cannot be represented in a Spine atlas: {key}"
        )));
    }
    keys.insert(key.to_owned());
    Ok(())
}

fn mesh_vertices(
    scene: &SceneProject,
    vertices: &[Vertex],
    bones: &[usize],
    weighted: bool,
) -> Result<Vec<Value>, AppError> {
    let mut result = Vec::new();
    for vertex in vertices {
        if vertex.positions.len() != bones.len() * 2 || vertex.weights.len() != bones.len() {
            return Err(invalid("A mesh contains an inconsistent vertex binding."));
        }
        if weighted {
            let count = vertex
                .weights
                .iter()
                .filter(|&&weight| weight != 0.0)
                .count();
            if count == 0 {
                return Err(invalid("A weighted mesh vertex has no influences."));
            }
            result.push(json!(count));
            for (column, (&bone, &weight)) in bones.iter().zip(&vertex.weights).enumerate() {
                if weight == 0.0 {
                    continue;
                }
                bone_name(scene, bone)?;
                result.extend([
                    json!(bone),
                    json!(vertex.positions[column * 2]),
                    json!(vertex.positions[column * 2 + 1]),
                    json!(weight),
                ]);
            }
        } else {
            if bones.len() != 1 {
                return Err(invalid("An unweighted mesh vertex needs one owner bone."));
            }
            result.extend(vertex.positions.iter().map(|value| json!(value)));
        }
    }
    Ok(result)
}

fn skin_attachment(
    scene: &SceneProject,
    address: AttachmentAddress,
    images: &mut BTreeSet<String>,
    path_poses: &[Pose],
) -> Result<Value, AppError> {
    let item = attachment(scene, address)?;
    let mut data = match item {
        SceneAttachment::Region(region) => json!({
            "type": "region", "x": region.x, "y": region.y,
            "rotation": region.rotation, "scaleX": region.scale_x,
            "scaleY": region.scale_y, "width": region.width, "height": region.height,
        }),
        SceneAttachment::Mesh(mesh) if scene.linked_mesh(address).is_some() => {
            let link = scene.linked_mesh(address).expect("linked mesh guard");
            let mut data = json!({
                "type": "linkedmesh", "source": attachment(scene, link.source)?.name(),
                "width": mesh.image.width, "height": mesh.image.height,
            });
            if link.source.slot != address.slot {
                data["slot"] = json!(slot_name(scene, link.source.slot)?);
            }
            if !link.inherit_timelines {
                data["timelines"] = json!(false);
            }
            data
        }
        SceneAttachment::Mesh(mesh) => json!({
            "type": "mesh", "width": mesh.image.width, "height": mesh.image.height,
            "uvs": mesh.uvs, "triangles": mesh.triangles,
            "vertices": mesh_vertices(scene, &mesh.vertices, &mesh.bones, mesh.weighted)?,
            "hull": mesh.hull,
            "edges": mesh.edges.iter().map(|&index| index * 2).collect::<Vec<_>>(),
        }),
        SceneAttachment::Clipping(clip) => {
            let mut data = json!({
                "type": "clipping", "convex": clip.convex, "inverse": clip.inverse,
                "vertexCount": clip.vertices.len(), "color": color(&clip.color),
                "vertices": mesh_vertices(scene, &clip.vertices, &clip.bones, clip.weighted)?,
            });
            if let Some(end) = clip.end_slot {
                data["end"] = json!(slot_name(scene, end)?);
            }
            data
        }
        SceneAttachment::Path(path) => json!({
            "type": "path",
            "closed": path.closed,
            "constantSpeed": path.constant_speed,
            "color": color(&path.color),
            "vertexCount": path.vertices.len(),
            "vertices": mesh_vertices(scene, &path.vertices, &path.bones, path.weighted)?,
            "lengths": crate::solve::path::setup_lengths(path, path_poses)
                .map_err(|_| invalid("A Path curve length exceeds the runtime range."))?,
        }),
    };
    if let Some(image) = item.image() {
        let base = image_stem(image);
        data["path"] = json!(base);
        data["color"] = json!(color(&scene.attachment_color(address)));
        if let Some(sequence) = scene.sequence(address) {
            sequence.validate()?;
            for index in 0..sequence.count {
                add_image(images, &sequence.path(base, index)?)?;
            }
            data["sequence"] = json!({
                "count": sequence.count, "start": sequence.start,
                "digits": sequence.digits, "setup": sequence.setup_index,
            });
        } else {
            add_image(images, base)?;
        }
    }
    Ok(data)
}

const PHYSICS_PROPERTIES: [&str; 7] = [
    "inertia", "strength", "damping", "mass", "wind", "gravity", "mix",
];
const TRANSFORM_MIX: [&str; 6] = [
    "mixRotate",
    "mixX",
    "mixY",
    "mixScaleX",
    "mixScaleY",
    "mixShearY",
];

fn transform_property(property: TransformProperty) -> &'static str {
    match property {
        TransformProperty::Rotate => "rotate",
        TransformProperty::X => "x",
        TransformProperty::Y => "y",
        TransformProperty::ScaleX => "scaleX",
        TransformProperty::ScaleY => "scaleY",
        TransformProperty::ShearY => "shearY",
    }
}

struct ConstraintJson<'a> {
    fields: Value,
    properties: Option<&'a [TransformFrom]>,
}

impl Serialize for ConstraintJson<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let fields = self.fields.as_object().expect("export constraint fields");
        let mut map = serializer
            .serialize_map(Some(fields.len() + usize::from(self.properties.is_some())))?;
        for (key, value) in fields {
            map.serialize_entry(key, value)?;
        }
        if let Some(properties) = self.properties {
            map.serialize_entry("properties", &PropertySources(properties))?;
        }
        map.end()
    }
}

// The runtime applies these maps in encounter order. serde_json::Value maps
// sort keys in this crate, so the authored arrays need direct serialization.
struct PropertySources<'a>(&'a [TransformFrom]);
struct PropertyTargets<'a>(&'a [TransformTo]);

#[derive(Serialize)]
struct PropertySource<'a> {
    offset: f32,
    to: PropertyTargets<'a>,
}

impl Serialize for PropertySources<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(self.0.len()))?;
        for from in self.0 {
            map.serialize_entry(
                transform_property(from.property),
                &PropertySource {
                    offset: from.offset,
                    to: PropertyTargets(&from.to),
                },
            )?;
        }
        map.end()
    }
}

impl Serialize for PropertyTargets<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(self.0.len()))?;
        for target in self.0 {
            map.serialize_entry(
                transform_property(target.property),
                &json!({"offset": target.offset, "max": target.max, "scale": target.scale}),
            )?;
        }
        map.end()
    }
}

fn encode_constraint<'a>(
    scene: &SceneProject,
    item: &'a Constraint,
) -> Result<ConstraintJson<'a>, AppError> {
    let bones = |items: &[usize]| {
        items
            .iter()
            .map(|&index| bone_name(scene, index))
            .collect::<Result<Vec<_>, _>>()
    };
    let mut properties = None;
    let fields = match item {
        Constraint::Ik(ik) => json!({
            "type": "ik", "name": ik.name, "bones": bones(&ik.bones)?,
            "target": bone_name(scene, ik.target)?, "mix": ik.mix, "softness": ik.softness,
            "bendPositive": ik.bend_positive, "compress": ik.compress, "stretch": ik.stretch,
        }),
        Constraint::Transform(transform) => {
            properties = Some(transform.properties.as_slice());
            let mut data = json!({
                "type": "transform", "name": transform.name, "bones": bones(&transform.bones)?,
                "source": bone_name(scene, transform.source)?, "localSource": transform.local_source,
                "localTarget": transform.local_target, "additive": transform.additive,
                "clamp": transform.clamp,
            });
            for (key, value) in ["rotation", "x", "y", "scaleX", "scaleY", "shearY"]
                .into_iter()
                .zip(transform.offsets)
            {
                data[key] = json!(value);
            }
            for (key, value) in TRANSFORM_MIX.into_iter().zip(transform.mix) {
                data[key] = json!(value);
            }
            data
        }
        Constraint::Path(path) => json!({
            "type": "path", "name": path.name, "bones": bones(&path.bones)?,
            "slot": slot_name(scene, path.slot)?, "positionMode": path.position_mode.name(),
            "spacingMode": path.spacing_mode.name(), "rotateMode": path.rotate_mode.name(),
            "rotation": path.rotation, "position": path.position, "spacing": path.spacing,
            "mixRotate": path.mix_rotate, "mixX": path.mix_x, "mixY": path.mix_y,
        }),
        Constraint::Physics(physics) => {
            let [rotate, shear] = physics.angular.effective();
            let fps = f64::from(physics.step).recip();
            if !fps.is_finite() || fps <= 0.0 {
                return Err(invalid("A Physics constraint has an invalid step."));
            }
            let globals = physics.globals;
            json!({
                "type": "physics", "name": physics.name, "bone": bone_name(scene, physics.bone)?,
                "x": physics.x, "y": physics.y, "rotate": rotate, "scaleX": physics.scale_x,
                "shearX": shear, "limit": physics.limit, "fps": fps, "inertia": physics.inertia,
                "strength": physics.strength, "damping": physics.damping, "mass": physics.mass,
                "wind": physics.wind, "gravity": physics.gravity, "mix": physics.mix,
                "inertiaGlobal": globals.inertia, "strengthGlobal": globals.strength,
                "dampingGlobal": globals.damping, "massGlobal": globals.mass,
                "windGlobal": globals.wind, "gravityGlobal": globals.gravity, "mixGlobal": globals.mix,
            })
        }
    };
    Ok(ConstraintJson { fields, properties })
}

fn seconds(frame: f32, fps: f32) -> f64 {
    f64::from(frame) / f64::from(fps)
}

fn bezier(fps: f32, lanes: &[[f32; 4]]) -> Value {
    json!(lanes
        .iter()
        .flat_map(|&[x1, y1, x2, y2]| [seconds(x1, fps), y1.into(), seconds(x2, fps), y2.into()])
        .collect::<Vec<_>>())
}

fn curve(key: &mut Value, value: Option<Value>) {
    if let Some(value) = value {
        key["curve"] = value;
    }
}

fn split_color_curve<const N: usize>(
    fps: f32,
    curve: &SlotColorCurve<N>,
    lanes: usize,
) -> Option<Value> {
    match curve {
        SlotColorCurve::Linear => None,
        SlotColorCurve::Stepped => Some(json!("stepped")),
        SlotColorCurve::Bezier { controls } => Some(bezier(fps, &controls[..lanes])),
    }
}

fn light_rgb_stays_at_setup(keys: &[SlotColorKey<6>], setup: &[u8; 4]) -> bool {
    let [r, g, b, _] = setup.map(|v| f32::from(v) / 255.0);
    let setup = [r, g, b];
    keys.iter().enumerate().all(|(index, key)| {
        key.values[..3] == setup
            && (index + 1 == keys.len()
                || match &key.curve {
                    SlotColorCurve::Linear | SlotColorCurve::Stepped => true,
                    SlotColorCurve::Bezier { controls } => controls[..3]
                        .iter()
                        .zip(setup)
                        .all(|(control, value)| control[1] == value && control[3] == value),
                })
    })
}

fn is_setup_rgb(scene: &SceneProject, track: &SlotTimeline) -> bool {
    let SlotTimeline::Rgb2 { slot, keys } = track else {
        return false;
    };
    !scene.slot_dark_color(*slot).enabled
        && scene
            .slots
            .get(*slot)
            .is_some_and(|slot| light_rgb_stays_at_setup(keys, &slot.color))
}

fn clip_end_without_setup_rgb(clip: &Animation, scene: &SceneProject) -> f32 {
    let retained_slot_ends = clip.slot_tracks.iter().filter_map(|track| match track {
        SlotTimeline::Attachment { keys, .. } => keys.last().map(|key| key.frame),
        SlotTimeline::Rgba { keys, .. } => keys.last().map(|key| key.frame),
        SlotTimeline::Alpha { keys, .. } => keys.last().map(|key| key.frame),
        SlotTimeline::Rgb2 { keys, .. } if !is_setup_rgb(scene, track) => {
            keys.last().map(|key| key.frame)
        }
        SlotTimeline::Rgb2 { .. } => None,
    });
    clip.tracks
        .iter()
        .filter_map(|track| track.keys.last().map(|key| key.frame))
        .chain(clip.draw_order.last().map(|key| key.frame))
        .chain(
            clip.deform_tracks
                .iter()
                .filter_map(|track| track.keys.last().map(|key| key.frame)),
        )
        .chain(retained_slot_ends)
        .fold(
            crate::animation_constraints::duration(clip)
                .max(crate::animation_events::duration(clip))
                .max(crate::animation_sequence::duration(clip)),
            f32::max,
        )
}

fn bone_track_name(channel: BoneChannel) -> &'static str {
    match channel {
        BoneChannel::Rotate => "rotate",
        BoneChannel::Translate => "translate",
        BoneChannel::TranslateX => "translatex",
        BoneChannel::TranslateY => "translatey",
        BoneChannel::Scale => "scale",
        BoneChannel::ScaleX => "scalex",
        BoneChannel::ScaleY => "scaley",
        BoneChannel::Shear => "shear",
    }
}

fn offsets(
    scene: &SceneProject,
    address: AttachmentAddress,
    values: &[f32],
) -> Result<Vec<f32>, AppError> {
    let item = attachment(scene, address)?;
    let (weighted, vertices, width) = match item {
        SceneAttachment::Mesh(mesh) => (mesh.weighted, &mesh.vertices, mesh.bones.len()),
        SceneAttachment::Clipping(clip) => (clip.weighted, &clip.vertices, clip.bones.len()),
        SceneAttachment::Region(_) => return Err(invalid("A deform track targets a region.")),
        SceneAttachment::Path(_) => return Err(invalid("A Path Deform track is unsupported.")),
    };
    if !weighted {
        if values.len() != vertices.len() * 2 {
            return Err(invalid(
                "An unweighted deform key has inconsistent vertex coordinates.",
            ));
        }
        return Ok(values.to_vec());
    }
    if values.len() != vertices.len() * width * 2 {
        return Err(invalid(
            "A weighted deform key has inconsistent vertex coordinates.",
        ));
    }
    let mut sparse = Vec::new();
    for (vertex_index, vertex) in vertices.iter().enumerate() {
        if vertex.weights.len() != width {
            return Err(invalid(
                "A deform texture has inconsistent binding weights.",
            ));
        }
        for (column, &weight) in vertex.weights.iter().enumerate() {
            if weight != 0.0 {
                let offset = (vertex_index * width + column) * 2;
                sparse.extend_from_slice(&values[offset..offset + 2]);
            }
        }
    }
    Ok(sparse)
}

fn attachment_track<'a>(
    data: &'a mut Value,
    scene: &SceneProject,
    address: AttachmentAddress,
) -> Result<&'a mut Map<String, Value>, AppError> {
    let name = attachment(scene, address)?.name();
    let skin = child_map(field_map(data, "attachments"), "default");
    Ok(child_map(
        child_map(skin, slot_name(scene, address.slot)?),
        name,
    ))
}

fn encode_animation(scene: &SceneProject, clip: &Animation) -> Result<Value, AppError> {
    let fps = scene.fps;
    let mut data = json!({});
    let mut preserved_clip_end = None;
    for track in &clip.tracks {
        if track.keys.is_empty() {
            continue;
        }
        let dimensions = track.channel.dimensions();
        let keys: Vec<_> = track
            .keys
            .iter()
            .enumerate()
            .map(|(index, key)| {
                let [x, y] = key.values;
                let time = seconds(key.frame, fps);
                let mut data = if dimensions == 1 {
                    json!({"time": time, "value": x})
                } else {
                    json!({"time": time, "x": x, "y": y})
                };
                if index + 1 < track.keys.len() {
                    curve(
                        &mut data,
                        match &key.curve {
                            KeyCurve::Linear => None,
                            KeyCurve::Stepped => Some(json!("stepped")),
                            KeyCurve::Bezier { controls } => {
                                Some(bezier(fps, &controls[..dimensions]))
                            }
                        },
                    );
                }
                data
            })
            .collect();
        place(
            child_map(field_map(&mut data, "bones"), bone_name(scene, track.bone)?),
            bone_track_name(track.channel),
            json!(keys),
        )?;
    }
    for track in &clip.slot_tracks {
        let slot = track.slot();
        let name = slot_name(scene, slot)?;
        let (kind, keys) = match track {
            SlotTimeline::Attachment { keys, .. } => {
                let keys = keys
                    .iter()
                    .map(|key| {
                        let item = key
                            .attachment
                            .map(|attachment_index| {
                                attachment(
                                    scene,
                                    AttachmentAddress {
                                        slot,
                                        attachment: attachment_index,
                                    },
                                )
                                .map(SceneAttachment::name)
                            })
                            .transpose()?;
                        Ok(json!({"time": seconds(key.frame, fps), "name": item}))
                    })
                    .collect::<Result<Vec<_>, AppError>>()?;
                ("attachment", keys)
            }
            SlotTimeline::Rgba { keys, .. } => {
                let two_color = scene.slot_dark_color(slot).enabled;
                // Spine supports float alpha keys separately from hex colors.
                let split_alpha = keys.iter().any(|key| {
                    let alpha = key.values[3];
                    f32::from(color_byte(alpha)) / 255.0 != alpha
                });
                let light_lanes = if split_alpha { 3 } else { 4 };
                let mut colors = Vec::with_capacity(keys.len());
                let mut alphas = Vec::new();
                for (index, key) in keys.iter().enumerate() {
                    let time = seconds(key.frame, fps);
                    let light = animated_color(&key.values[..light_lanes]);
                    let mut color_key = if two_color {
                        json!({"time": time, "light": light, "dark": animated_color(&key.dark_values)})
                    } else {
                        json!({"time": time, "color": light})
                    };
                    let mut alpha_key = json!({"time": time, "value": key.values[3]});
                    if index + 1 < keys.len() {
                        match &key.curve {
                            SlotRgbaCurve::Linear => {}
                            SlotRgbaCurve::Stepped => {
                                color_key["curve"] = json!("stepped");
                                if split_alpha {
                                    alpha_key["curve"] = json!("stepped");
                                }
                            }
                            SlotRgbaCurve::Bezier {
                                controls,
                                dark_controls,
                            } => {
                                let light = &controls[..light_lanes];
                                color_key["curve"] = if two_color {
                                    let dark = dark_controls.as_ref().ok_or_else(|| invalid("A two-color Bézier track needs its dark channel handles."))?;
                                    let all = light.iter().chain(dark).copied().collect::<Vec<_>>();
                                    bezier(fps, &all)
                                } else {
                                    bezier(fps, light)
                                };
                                if split_alpha {
                                    alpha_key["curve"] = bezier(fps, &controls[3..]);
                                }
                            }
                        }
                    }
                    colors.push(color_key);
                    if split_alpha {
                        alphas.push(alpha_key);
                    }
                }
                if split_alpha {
                    place(
                        child_map(field_map(&mut data, "slots"), name),
                        "alpha",
                        json!(alphas),
                    )?;
                }
                let kind = match (split_alpha, two_color) {
                    (false, false) => "rgba",
                    (false, true) => "rgba2",
                    (true, false) => "rgb",
                    (true, true) => "rgb2",
                };
                (kind, colors)
            }
            SlotTimeline::Rgb2 { keys, .. } => {
                let two_color = scene.slot_dark_color(slot).enabled;
                // Stock omits constant Setup RGB tracks with Tint Black off.
                // A runtime RGB track would otherwise reset a lower track's tint.
                if is_setup_rgb(scene, track) {
                    let clip_end = preserved_clip_end
                        .get_or_insert_with(|| clip_end_without_setup_rgb(clip, scene));
                    if keys.last().is_none_or(|key| key.frame <= *clip_end) {
                        continue;
                    }
                }
                let keys = keys
                    .iter()
                    .enumerate()
                    .map(|(index, key)| {
                        let time = seconds(key.frame, fps);
                        let light = animated_color(&key.values[..3]);
                        let mut data = if two_color {
                            json!({"time": time, "light": light, "dark": animated_color(&key.values[3..])})
                        } else {
                            json!({"time": time, "color": light})
                        };
                        if index + 1 < keys.len() {
                            let lanes = if two_color { 6 } else { 3 };
                            curve(&mut data, split_color_curve(fps, &key.curve, lanes));
                        }
                        data
                    })
                    .collect();
                (if two_color { "rgb2" } else { "rgb" }, keys)
            }
            SlotTimeline::Alpha { keys, .. } => {
                let keys = keys
                    .iter()
                    .enumerate()
                    .map(|(index, key)| {
                        let mut data =
                            json!({"time": seconds(key.frame, fps), "value": key.values[0]});
                        if index + 1 < keys.len() {
                            curve(&mut data, split_color_curve(fps, &key.curve, 1));
                        }
                        data
                    })
                    .collect();
                ("alpha", keys)
            }
        };
        if !keys.is_empty() {
            place(
                child_map(field_map(&mut data, "slots"), name),
                kind,
                json!(keys),
            )?;
        }
    }
    for track in &clip.deform_tracks {
        let keys = track
            .keys
            .iter()
            .enumerate()
            .map(|(index, key)| {
                let mut data = json!({"time": seconds(key.frame, fps)});
                if key.data_present {
                    data["vertices"] = json!(offsets(scene, track.attachment, &key.offsets)?);
                }
                if index + 1 < track.keys.len() {
                    curve(
                        &mut data,
                        match &key.curve {
                            DeformCurve::Linear => None,
                            DeformCurve::Stepped => Some(json!("stepped")),
                            DeformCurve::Bezier { controls } => Some(bezier(fps, &[*controls])),
                        },
                    );
                }
                Ok(data)
            })
            .collect::<Result<Vec<_>, AppError>>()?;
        if !keys.is_empty() {
            place(
                attachment_track(&mut data, scene, track.attachment)?,
                "deform",
                json!(keys),
            )?;
        }
    }
    for track in &clip.sequence_tracks {
        if !track.keys.is_empty() {
            let keys: Vec<_> = track
                .keys
                .iter()
                .map(|key| {
                    json!({
                        "time": seconds(key.frame, fps), "mode": key.mode.name(),
                        "index": key.index, "delay": key.delay.get(),
                    })
                })
                .collect();
            place(
                attachment_track(&mut data, scene, track.attachment)?,
                "sequence",
                json!(keys),
            )?;
        }
    }
    if !clip.draw_order.is_empty() {
        let keys = clip
            .draw_order
            .iter()
            .map(|key| {
                let mut data = json!({"time": seconds(key.frame, fps)});
                if !key.offsets.is_empty() {
                    let offsets = key
                        .offsets
                        .iter()
                        .map(|offset| {
                            Ok(json!({
                                "slot": slot_name(scene, offset.slot)?, "offset": offset.offset,
                            }))
                        })
                        .collect::<Result<Vec<_>, AppError>>()?;
                    data["offsets"] = json!(offsets);
                }
                Ok(data)
            })
            .collect::<Result<Vec<_>, AppError>>()?;
        data["drawOrder"] = json!(keys);
    }
    encode_constraint_keys(scene, clip, &mut data)?;
    let mut events = Vec::new();
    for track in &clip.event_tracks {
        let event = scene
            .events
            .get(track.event)
            .ok_or_else(|| invalid("An animation refers to a missing event."))?;
        for key in &track.keys {
            let mut value = json!({"time": seconds(key.frame, fps), "name": event.name,
                "int": key.int, "float": key.float, "string": key.string});
            if !event.audio.is_empty() {
                value["volume"] = json!(key.volume);
                value["balance"] = json!(key.balance);
            }
            events.push((key.frame, value));
        }
    }
    if !events.is_empty() {
        events.sort_by(|left, right| left.0.total_cmp(&right.0));
        data["events"] = json!(events
            .into_iter()
            .map(|(_, value)| value)
            .collect::<Vec<_>>());
    }
    Ok(data)
}

fn encode_constraint_keys(
    scene: &SceneProject,
    clip: &Animation,
    data: &mut Value,
) -> Result<(), AppError> {
    let fps = scene.fps;
    for track in &clip.constraint_tracks {
        let name = scene
            .constraints
            .get(track.constraint())
            .ok_or_else(|| invalid("An animation refers to a missing constraint."))?
            .name();
        let (family, subfamily, keys) = match track {
            ConstraintTimeline::Ik { keys, .. } => {
                let keys = keys.iter().enumerate().map(|(index, key)| {
                    let mut result = json!({
                        "time": seconds(key.frame, fps), "mix": key.mix, "softness": key.softness,
                        "bendPositive": key.bend_positive, "compress": key.compress, "stretch": key.stretch,
                    });
                    if index + 1 < keys.len() {
                        curve(&mut result, match &key.curve {
                            IkKeyCurve::Linear => None,
                            IkKeyCurve::Stepped => Some(json!("stepped")),
                            IkKeyCurve::Bezier { controls } => Some(bezier(fps, controls)),
                        });
                    }
                    result
                }).collect::<Vec<_>>();
                ("ik", None, keys)
            }
            ConstraintTimeline::TransformMix { keys, .. } => {
                let keys = keys
                    .iter()
                    .enumerate()
                    .map(|(index, key)| {
                        let mut result = json!({"time": seconds(key.frame, fps)});
                        for (name, value) in TRANSFORM_MIX.into_iter().zip(key.values) {
                            result[name] = json!(value);
                        }
                        if index + 1 < keys.len() {
                            curve(
                                &mut result,
                                match &key.curve {
                                    TransformMixCurve::Linear => None,
                                    TransformMixCurve::Stepped => Some(json!("stepped")),
                                    TransformMixCurve::Bezier { controls } => {
                                        Some(bezier(fps, controls))
                                    }
                                },
                            );
                        }
                        result
                    })
                    .collect::<Vec<_>>();
                ("transform", None, keys)
            }
            ConstraintTimeline::PathPosition { keys, .. } => (
                "path",
                Some("position"),
                path_constraint_keys(fps, keys, ["value"]),
            ),
            ConstraintTimeline::PathSpacing { keys, .. } => (
                "path",
                Some("spacing"),
                path_constraint_keys(fps, keys, ["value"]),
            ),
            ConstraintTimeline::PathMix { keys, .. } => (
                "path",
                Some("mix"),
                path_constraint_keys(fps, keys, ["mixRotate", "mixX", "mixY"]),
            ),
            ConstraintTimeline::Physics { property, keys, .. } => {
                let keys = keys
                    .iter()
                    .enumerate()
                    .map(|(index, key)| {
                        let mut result =
                            json!({"time": seconds(key.frame, fps), "value": key.value});
                        if index + 1 < keys.len() {
                            curve(
                                &mut result,
                                match &key.curve {
                                    PhysicsCurve::Linear => None,
                                    PhysicsCurve::Stepped => Some(json!("stepped")),
                                    PhysicsCurve::Bezier { controls } => {
                                        Some(bezier(fps, &[*controls]))
                                    }
                                },
                            );
                        }
                        result
                    })
                    .collect::<Vec<_>>();
                (
                    "physics",
                    Some(PHYSICS_PROPERTIES[PhysicsProperty::index(*property)]),
                    keys,
                )
            }
            ConstraintTimeline::PhysicsReset { keys, .. } => {
                let keys = keys
                    .iter()
                    .map(|key| json!({"time": seconds(key.frame, fps)}))
                    .collect();
                ("physics", Some("reset"), keys)
            }
        };
        if keys.is_empty() {
            continue;
        }
        let section = field_map(data, family);
        if let Some(subfamily) = subfamily {
            place(child_map(section, name), subfamily, json!(keys))?;
        } else {
            place(section, name, json!(keys))?;
        }
    }
    Ok(())
}

fn path_constraint_keys<const N: usize>(
    fps: f32,
    keys: &[PathKeyframe<N>],
    fields: [&str; N],
) -> Vec<Value> {
    keys.iter()
        .enumerate()
        .map(|(index, key)| {
            let mut data = json!({"time": seconds(key.frame, fps)});
            for (field, value) in fields.into_iter().zip(key.values) {
                data[field] = json!(value);
            }
            if index + 1 < keys.len() {
                curve(
                    &mut data,
                    match &key.curve {
                        PathKeyCurve::Linear => None,
                        PathKeyCurve::Stepped => Some(json!("stepped")),
                        PathKeyCurve::Bezier { controls } => Some(bezier(fps, controls)),
                    },
                );
            }
            data
        })
        .collect()
}

pub(crate) fn serialize(scene: &SceneProject) -> Result<SpineJson, AppError> {
    if !scene.fps.is_finite() || scene.fps <= 0.0 {
        return Err(invalid("The project has an invalid animation frame rate."));
    }
    let bones = named_array(scene.rig.bones.iter().enumerate().map(|(index, bone)| {
        (
            bone.name.as_str(),
            (|| {
                let mut entry = json!({
                    "name": bone.name, "x": bone.x, "y": bone.y, "rotation": bone.rotation,
                    "length": bone.length, "scaleX": bone.scale_x, "scaleY": bone.scale_y,
                    "shearX": bone.shear_x, "shearY": bone.shear_y, "color": color(&bone.color),
                });
                if let Some(parent) = bone.parent {
                    if parent >= index {
                        return Err(invalid(
                            "A Spine export needs every parent bone before its children.",
                        ));
                    }
                    entry["parent"] = json!(bone_name(scene, parent)?);
                }
                Ok(entry)
            })(),
        )
    }))?;
    let mut image_keys = BTreeSet::new();
    let mut attachments = Map::new();
    let path_poses = if scene
        .slots
        .iter()
        .flat_map(|slot| &slot.attachments)
        .any(|attachment| attachment.path().is_some())
    {
        poses(&scene.rig.bones)
    } else {
        Vec::new()
    };
    let slots = named_array(scene.slots.iter().enumerate().map(|(slot_index, slot)| (slot.name.as_str(), (|| {
        let mut entry = json!({
            "name": slot.name, "bone": bone_name(scene, slot.bone)?, "color": color(&slot.color),
            "blend": slot.blend.as_str(),
        });
        let dark = scene.slot_dark_color(slot_index);
        if dark.enabled {
            entry["dark"] = json!(color(&dark.color[..3]));
        }
        if let Some(index) = slot.active_attachment {
            entry["attachment"] = json!(attachment(scene, AttachmentAddress{slot: slot_index, attachment: index})?.name());
        }
        let mut inventory = Map::new();
        for (index, item) in slot.attachments.iter().enumerate() {
            let address = AttachmentAddress {slot: slot_index, attachment: index};
            let value = skin_attachment(scene, address, &mut image_keys, &path_poses)?;
            place(&mut inventory, item.name(), value)?;
        }
        if !inventory.is_empty() {
            place(&mut attachments, &slot.name, Value::Object(inventory))?;
        }
        Ok(entry)
    })())))?;
    let constraints = named_array(
        scene
            .constraints
            .iter()
            .map(|item| (item.name(), encode_constraint(scene, item))),
    )?;
    let mut audio_keys = BTreeSet::new();
    let mut events = Map::new();
    for event in &scene.events {
        let mut entry = json!({"int": event.int, "float": event.float, "string": event.string});
        if !event.audio.is_empty() {
            if !crate::audio::valid_key(&event.audio) {
                return Err(invalid(format!(
                    "An event audio path is not portable: {}",
                    event.audio
                )));
            }
            audio_keys.insert(event.audio.clone());
            entry["audio"] = json!(event.audio);
            entry["volume"] = json!(event.volume);
            entry["balance"] = json!(event.balance);
        }
        place(&mut events, &event.name, entry)?;
    }
    let mut animations = Map::new();
    for (index, animation) in scene.animations.iter().enumerate() {
        let name = scene
            .qualified_animation_name(index)
            .ok_or_else(|| invalid("A Spine export references a missing animation name."))?;
        place(
            &mut animations,
            name.as_ref(),
            encode_animation(scene, animation)?,
        )?;
    }
    #[derive(Serialize)]
    struct SkeletonJson<'a> {
        skeleton: Value,
        bones: Vec<Value>,
        slots: Vec<Value>,
        constraints: Vec<ConstraintJson<'a>>,
        skins: Value,
        events: Map<String, Value>,
        animations: Map<String, Value>,
    }
    let output = SkeletonJson {
        skeleton: json!({"spine": TARGET_VERSION, "fps": scene.fps, "audio": "./audio"}),
        bones,
        slots,
        constraints,
        skins: json!([{"name": "default", "attachments": attachments}]),
        events,
        animations,
    };
    let bytes = serde_json::to_vec_pretty(&output)
        .map_err(|error| invalid(format!("Spine game JSON could not be serialized: {error}")))?;
    Ok(SpineJson {
        bytes,
        image_keys: image_keys.into_iter().collect(),
        audio_keys: audio_keys.into_iter().collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use fbones_format::minimal::{
        regions::RegionProject,
        scene::{SceneSlot, SlotDarkColor},
        MinimalProject,
    };

    #[test]
    fn split_slot_color_keeps_float_alpha_and_only_emits_enabled_rgb_channels() {
        let mut scene = SceneProject::from(&RegionProject {
            rig: MinimalProject::new("setup".into(), [7; 16]),
            images_root: "./images/".into(),
            slots: vec![],
            region_order: vec![],
        });
        scene.slots.push(SceneSlot {
            name: "slot".into(),
            bone: 0,
            color: [255; 4],
            blend: Default::default(),
            attachments: vec![],
            active_attachment: None,
        });
        let controls = std::array::from_fn(|lane| [12., lane as f32 * 0.125, 18., 0.75]);
        scene.animations[0].slot_tracks = vec![
            SlotTimeline::Rgb2 {
                slot: 0,
                keys: vec![
                    SlotColorKey {
                        frame: 0.,
                        values: [1., 0.5, 0., 0., 0.25, 1.],
                        curve: SlotColorCurve::Bezier { controls },
                    },
                    SlotColorKey {
                        frame: 30.,
                        values: [1.; 6],
                        curve: SlotColorCurve::Linear,
                    },
                ],
            },
            SlotTimeline::Alpha {
                slot: 0,
                keys: vec![
                    SlotColorKey {
                        frame: 0.,
                        values: [0.37],
                        curve: SlotColorCurve::Bezier {
                            controls: [[6., 0.25, 12., 0.75]],
                        },
                    },
                    SlotColorKey {
                        frame: 15.,
                        values: [0.83],
                        curve: SlotColorCurve::Linear,
                    },
                ],
            },
        ];
        let clip = &scene.animations[0];
        let light_only = encode_animation(&scene, clip).unwrap();
        let rgb = &light_only["slots"]["slot"]["rgb"][0];
        assert_eq!(rgb["color"], "ff8000");
        assert_eq!(rgb["curve"], bezier(30., &controls[..3]));
        let alpha = &light_only["slots"]["slot"]["alpha"];
        assert_eq!(alpha[0]["value"].as_f64().unwrap() as f32, 0.37);
        assert_eq!(alpha[0]["curve"], json!([0.2, 0.25, 0.4, 0.75]));
        assert_eq!(alpha[1]["time"], 0.5);

        scene.slot_dark_colors.push(SlotDarkColor {
            slot: 0,
            enabled: true,
            color: [0, 0, 0, 255],
        });
        let two_color = encode_animation(&scene, &scene.animations[0]).unwrap();
        let rgb2 = &two_color["slots"]["slot"]["rgb2"][0];
        assert_eq!(rgb2["light"], "ff8000");
        assert_eq!(rgb2["dark"], "0040ff");
        assert_eq!(rgb2["curve"], bezier(30., &controls));
        assert_eq!(&two_color["slots"]["slot"]["alpha"], alpha);

        scene.slot_dark_colors.clear();
        let SlotTimeline::Rgb2 { keys, .. } = &mut scene.animations[0].slot_tracks[0] else {
            unreachable!();
        };
        keys[0].values[..3].fill(1.);
        let moving_handles = encode_animation(&scene, &scene.animations[0]).unwrap();
        assert!(moving_handles["slots"]["slot"]["rgb"].is_array());

        let SlotTimeline::Rgb2 { keys, .. } = &mut scene.animations[0].slot_tracks[0] else {
            unreachable!();
        };
        keys[0].curve = SlotColorCurve::Linear;
        let only_duration_key = encode_animation(&scene, &scene.animations[0]).unwrap();
        assert!(only_duration_key["slots"]["slot"]["rgb"].is_array());

        let SlotTimeline::Rgb2 { keys, .. } = &mut scene.animations[0].slot_tracks[0] else {
            unreachable!();
        };
        keys[1].frame = 15.;
        let setup_rgb = encode_animation(&scene, &scene.animations[0]).unwrap();
        assert!(setup_rgb["slots"]["slot"].get("rgb").is_none());
        assert_eq!(&setup_rgb["slots"]["slot"]["alpha"], alpha);
    }
}
