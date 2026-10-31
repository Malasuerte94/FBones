//! Adapter from controlled JSON recipes to the independent typed Rust codec.
use fbones_format::minimal::{encode_minimal, Bone, MinimalProject};
use serde_json::Value;
use std::collections::HashMap;

pub fn encode(recipe: &Value, skeleton_name: &str, identity: [u8; 16]) -> Result<Vec<u8>, String> {
    encode_minimal(&rig_model(recipe, skeleton_name, identity)?).map_err(|e| e.to_string())
}

fn color(value: Option<&Value>, fallback: [u8; 4]) -> Result<[u8; 4], String> {
    let Some(value) = value else {
        return Ok(fallback);
    };
    let value = value.as_str().ok_or("Invalid color")?;
    if value.len() != 8 || !value.is_ascii() {
        return Err("Use RGBA color".into());
    }
    let mut rgba = [0; 4];
    for (i, c) in rgba.iter_mut().enumerate() {
        *c = u8::from_str_radix(&value[i * 2..i * 2 + 2], 16).map_err(|_| "Invalid color")?;
    }
    Ok(rgba)
}
fn rig_model(
    recipe: &Value,
    skeleton_name: &str,
    identity: [u8; 16],
) -> Result<MinimalProject, String> {
    let inputs = recipe["bones"].as_array().ok_or("Missing bones")?;
    let mut project = MinimalProject {
        name: skeleton_name.into(),
        identity,
        bones: vec![],
    };
    let mut names = HashMap::new();
    for (index, input) in inputs.iter().enumerate() {
        let name = input["name"].as_str().ok_or("Invalid bone name")?;
        let parent = match input["parent"].as_str() {
            None if index == 0 => None,
            Some(name) if names.contains_key(name) => Some(names[name]),
            _ => return Err("Parents must precede children".into()),
        };
        let number = |key: &str| -> Result<f32, String> {
            match input.get(key) {
                None => Ok(0.0),
                Some(value) => value
                    .as_f64()
                    .map(|v| v as f32)
                    .ok_or_else(|| "Invalid transform".into()),
            }
        };
        project.bones.push(Bone {
            name: name.into(),
            parent,
            x: number("x")?,
            y: number("y")?,
            rotation: number("rotation")?,
            length: number("length")?,
            scale_x: input.get("scaleX").map_or(Ok(1.0), |_| number("scaleX"))?,
            scale_y: input.get("scaleY").map_or(Ok(1.0), |_| number("scaleY"))?,
            shear_x: number("shearX")?,
            shear_y: number("shearY")?,
            color: color(input.get("color"), [155, 155, 155, 255])?,
        });
        names.insert(name, index);
    }
    Ok(project)
}

pub fn region_model(
    recipe: &Value,
    identity: [u8; 16],
) -> Result<fbones_format::minimal::regions::RegionProject, String> {
    use fbones_format::minimal::regions::{Attachment, Region, RegionProject, Slot};
    let rig = rig_model(recipe, "skeleton", identity)?;
    let mut slots = vec![];
    for input in recipe["slots"].as_array().ok_or("Missing slots")? {
        let name = input["name"].as_str().ok_or("Missing slot name")?;
        let bone_name = input["bone"].as_str().ok_or("Missing slot bone")?;
        let bone = rig
            .bones
            .iter()
            .position(|b| b.name == bone_name)
            .ok_or("Unknown slot bone")?;
        let attachments = &recipe["skins"][0]["attachments"][name];
        let mut attachment: Option<Attachment> = None;
        if let Some(entries) = attachments.as_object() {
            if entries.len() > 1 {
                return Err("Only one region per slot is supported".into());
            }
            for (name, data) in entries {
                if data
                    .get("type")
                    .is_some_and(|t| t != "region" && t != "mesh")
                {
                    return Err("Expected region".into());
                }
                let number = |key: &str, default: f32| -> Result<f32, String> {
                    match data.get(key) {
                        None => Ok(default),
                        Some(v) => v
                            .as_f64()
                            .map(|n| n as f32)
                            .ok_or_else(|| "Invalid region transform".into()),
                    }
                };
                let image = Region {
                    name: name.clone(),
                    path: data["path"].as_str().unwrap_or("").into(),
                    x: number("x", 0.0)?,
                    y: number("y", 0.0)?,
                    rotation: number("rotation", 0.0)?,
                    scale_x: number("scaleX", 1.0)?,
                    scale_y: number("scaleY", 1.0)?,
                    width: number("width", 0.0)?,
                    height: number("height", 0.0)?,
                };
                attachment = Some(if data["type"] == "mesh" {
                    Attachment::Mesh(Box::new(mesh_model(data, image, bone, rig.bones.len())?))
                } else {
                    image.into()
                });
            }
        }
        let visible = match input["attachment"].as_str() {
            None => false,
            Some(active) => {
                if attachment.as_ref().is_none_or(|a| a.name != active) {
                    return Err("Unknown active attachment".into());
                }
                true
            }
        };
        slots.push(Slot {
            blend: fbones_format::minimal::regions::BlendMode::from_name(input.get("blend").and_then(Value::as_str).unwrap_or("normal")).ok_or("Unsupported slot blend")?,
            color: color(input.get("color"), [255; 4])?,
            name: name.into(),
            bone,
            attachment,
            visible,
        });
    }
    // These controlled imports have an alphabetical attachment inventory,
    // independent of draw order. This adapter is not a general Spine importer;
    // the binary reader preserves the actual inventory order explicitly.
    let mut region_order: Vec<_> = slots
        .iter()
        .enumerate()
        .filter_map(|(i, s)| s.attachment.as_ref().map(|_| i))
        .collect();
    region_order.sort_by_key(|i| &slots[*i].attachment.as_ref().unwrap().name);
    Ok(RegionProject {
        images_root: recipe["skeleton"]["images"]
            .as_str()
            .unwrap_or("./images/")
            .into(),
        rig,
        slots,
        region_order,
    })
}

fn mesh_model(
    data: &Value,
    image: fbones_format::minimal::regions::Region,
    owner: usize,
    bone_count: usize,
) -> Result<fbones_format::minimal::meshes::Mesh, String> {
    use fbones_format::minimal::meshes::{Mesh, Vertex};
    let integer = |value: &Value| {
        value
            .as_f64()
            .filter(|v| v.is_finite() && *v >= 0.0 && v.fract() == 0.0 && *v <= 65535.0)
            .map(|v| v as usize)
    };
    let floats = |key: &str| -> Result<Vec<f32>, String> {
        data[key]
            .as_array()
            .ok_or("Missing mesh array")?
            .iter()
            .map(|v| {
                v.as_f64()
                    .map(|f| f as f32)
                    .ok_or_else(|| "Expected mesh number".into())
            })
            .collect()
    };
    let uvs = floats("uvs")?;
    let triangles = data["triangles"]
        .as_array()
        .ok_or("Missing triangles")?
        .iter()
        .map(|v| {
            v.as_u64()
                .and_then(|n| u16::try_from(n).ok())
                .ok_or_else(|| "Invalid triangle index".into())
        })
        .collect::<Result<Vec<_>, String>>()?;
    let hull = data["hull"].as_u64().ok_or("Missing hull")? as usize;
    if !(3..=256).contains(&hull) {
        return Err("Invalid hull".into());
    }
    let mut edges = vec![];
    if let Some(input) = data.get("edges") {
        for value in input.as_array().ok_or("Invalid edge array")? {
            let raw = value
                .as_u64()
                .filter(|i| i % 2 == 0)
                .ok_or("Expected coordinate-pair edge offsets")?;
            edges.push(u32::try_from(raw / 2).map_err(|_| "Invalid edge index")?);
        }
    } else {
        for i in 0..hull {
            let previous = (i + hull - 1) % hull;
            edges.push(previous.min(i) as u32);
            edges.push(previous.max(i) as u32);
        }
    }
    let raw = data["vertices"].as_array().ok_or("Missing vertices")?;
    let weighted = raw.len() != uvs.len();
    let (bones, vertices) = if !weighted {
        let values = floats("vertices")?;
        (
            vec![owner],
            values
                .chunks_exact(2)
                .map(|xy| Vertex {
                    weights: vec![1.0],
                    positions: xy.to_vec(),
                })
                .collect(),
        )
    } else {
        let mut read = 0;
        let mut sparse = vec![];
        let mut used = std::collections::BTreeSet::new();
        for _ in 0..uvs.len() / 2 {
            let count = raw
                .get(read)
                .and_then(integer)
                .ok_or("Invalid influence count")?;
            read += 1;
            if count == 0 || count > bone_count {
                return Err("Invalid influence count".into());
            }
            let mut values = HashMap::new();
            for _ in 0..count {
                let bone = raw
                    .get(read)
                    .and_then(integer)
                    .ok_or("Invalid influence bone")?;
                read += 1;
                if bone >= bone_count || values.contains_key(&bone) {
                    return Err("Invalid influence bone".into());
                }
                let mut number = || -> Result<f32, String> {
                    let value = raw
                        .get(read)
                        .and_then(Value::as_f64)
                        .ok_or("Invalid influence value")? as f32;
                    read += 1;
                    Ok(value)
                };
                let (x, y, w) = (number()?, number()?, number()?);
                used.insert(bone);
                values.insert(bone, (x, y, w));
            }
            sparse.push(values);
        }
        if read != raw.len() {
            return Err("Unexpected vertex data".into());
        }
        let bones: Vec<_> = used.into_iter().collect();
        let vertices = sparse
            .iter()
            .map(|values| {
                let mut vertex = Vertex {
                    weights: vec![],
                    positions: vec![],
                };
                for bone in &bones {
                    let (x, y, w) = values.get(bone).copied().unwrap_or((0.0, 0.0, 0.0));
                    vertex.weights.push(w);
                    vertex.positions.extend_from_slice(&[x, y]);
                }
                vertex
            })
            .collect();
        (bones, vertices)
    };
    Ok(Mesh {
        image,
        weighted,
        uvs,
        triangles,
        edges,
        hull,
        bones,
        vertices,
    })
}
