//! Controlled region fixtures and independent writer acceptance in original
//! Spine. No user project, copied payload or template is a generation input.
use super::*;
use fbones_format::minimal::regions::{decode_regions, encode_region_payload, encode_regions};

fn cases() -> Vec<Case> {
    let base = json!({
        "skeleton":{"spine":TARGET_VERSION,"images":"./images/"},
        "bones":[{"name":"root"}],
        "slots":[{"name":"slot","bone":"root","attachment":"checker"}],
        "skins":[{"name":"default","attachments":{"slot":{"checker":{"width":32,"height":24}}}}],
        "animations":{"animation":{}}
    });
    let mut result = vec![];
    let mut add = |id, recipe| {
        result.push(Case {
            id,
            recipe,
            skeleton_name: "skeleton",
        })
    };
    add("R00-region", base.clone());
    let mut empty = base.clone();
    empty["slots"][0]
        .as_object_mut()
        .unwrap()
        .remove("attachment");
    empty["skins"][0]["attachments"] = json!({});
    add("R01-empty-slot", empty);
    let mut moved = base.clone();
    moved["skins"][0]["attachments"]["slot"]["checker"] = json!({
        "width":32,"height":24,"x":17,"y":-9,"rotation":25,"scaleX":1.5,"scaleY":0.75
    });
    add("R02-transform", moved);
    let mut two = base.clone();
    two["slots"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"front","bone":"root","attachment":"checker2"}));
    two["skins"][0]["attachments"]["front"] =
        json!({"checker2":{"path":"checker","width":32,"height":24}});
    add("R03-two-slots", two.clone());
    let mut child = base.clone();
    child["bones"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"arm","parent":"root","x":40,"rotation":25,"length":100}));
    child["slots"][0]["bone"] = json!("arm");
    add("R04-child-bone", child);
    let mut hidden = base.clone();
    hidden["slots"][0]
        .as_object_mut()
        .unwrap()
        .remove("attachment");
    add("R05-hidden-region", hidden);
    two["slots"].as_array_mut().unwrap().reverse();
    add("R06-draw-order", two);
    let mut unicode = base;
    unicode["slots"][0]["name"] = json!("față");
    unicode["slots"][0]["attachment"] = json!("imagine");
    unicode["skins"][0]["attachments"] =
        json!({"față":{"imagine":{"path":"checker","width":32,"height":24}}});
    add("R07-unicode", unicode);
    result
}

fn verify_regions(case: &Case, output: &Value) -> Result<(), String> {
    verify_export(case, std::slice::from_ref(output))?;
    if output["animations"] != case.recipe["animations"] {
        return Err("Animation differs".into());
    }
    let mut expected = candidate::region_model(&case.recipe, [0; 16])?;
    let mut actual = candidate::region_model(output, [0; 16])?;
    for (wanted, found) in expected.slots.iter_mut().zip(&mut actual.slots) {
        let slot_name = found.name.clone();
        if let (Some(wanted), Some(found)) = (&mut wanted.attachment, &mut found.attachment) {
            if found.mesh().is_some() {
                // Mesh export dimensions describe the current PNG (our 32x24
                // checker), even when stored import metadata is 96x24 (M04).
                // Geometry is unchanged. Full binary comparison checks that
                // stored metadata too; no project field is discarded by the codec.
                let attachment = &output["skins"][0]["attachments"][&slot_name][&found.name];
                if attachment.get("width").is_some() && found.width != 32.0 {
                    return Err("Exported mesh PNG width differs".into());
                }
                if attachment.get("height").is_some() && found.height != 24.0 {
                    return Err("Exported mesh PNG height differs".into());
                }
                wanted.width = found.width;
                wanted.height = found.height;
            }
        }
    }
    if expected.slots != actual.slots {
        return Err("Slot order, binding, visibility or region transforms differ".into());
    }
    Ok(())
}

// Our own 32x24 opaque checker image. Stored DEFLATE, PNG CRC32 and zlib Adler32
// avoid adding image/runtime dependencies to this standalone research utility.
fn checker_png() -> Vec<u8> {
    fn chunk(output: &mut Vec<u8>, kind: &[u8; 4], data: &[u8]) {
        output.extend_from_slice(&(data.len() as u32).to_be_bytes());
        let start = output.len();
        output.extend_from_slice(kind);
        output.extend_from_slice(data);
        let mut crc = u32::MAX;
        for byte in &output[start..] {
            crc ^= u32::from(*byte);
            for _ in 0..8 {
                crc = (crc >> 1) ^ if crc & 1 == 1 { 0xedb88320 } else { 0 };
            }
        }
        output.extend_from_slice(&(!crc).to_be_bytes());
    }
    let mut rows = vec![];
    for y in 0..24 {
        rows.push(0);
        for x in 0..32 {
            rows.extend_from_slice(if (x / 4 + y / 4) % 2 == 0 {
                &[220, 100, 40, 255]
            } else {
                &[40, 120, 220, 255]
            });
        }
    }
    let count = rows.len() as u16;
    let mut zlib = vec![0x78, 0x01, 0x01];
    zlib.extend_from_slice(&count.to_le_bytes());
    zlib.extend_from_slice(&(!count).to_le_bytes());
    zlib.extend_from_slice(&rows);
    let (mut a, mut b) = (1_u32, 0_u32);
    for byte in rows {
        a = (a + u32::from(byte)) % 65521;
        b = (b + a) % 65521;
    }
    zlib.extend_from_slice(&((b << 16) | a).to_be_bytes());
    let mut png = b"\x89PNG\r\n\x1a\n".to_vec();
    chunk(
        &mut png,
        b"IHDR",
        &[0, 0, 0, 32, 0, 0, 0, 24, 8, 6, 0, 0, 0],
    );
    chunk(&mut png, b"IDAT", &zlib);
    chunk(&mut png, b"IEND", &[]);
    png
}

fn normalize_bindings(project: &mut fbones_format::minimal::regions::RegionProject) {
    for attachment in project
        .slots
        .iter_mut()
        .filter_map(|s| s.attachment.as_mut())
    {
        if let Some(mesh) = attachment.mesh_mut() {
            let mut order: Vec<_> = (0..mesh.bones.len()).collect();
            order.sort_by_key(|i| mesh.bones[*i]);
            mesh.bones = order.iter().map(|i| mesh.bones[*i]).collect();
            for vertex in &mut mesh.vertices {
                vertex.weights = order.iter().map(|i| vertex.weights[*i]).collect();
                vertex.positions = order
                    .iter()
                    .flat_map(|i| [vertex.positions[*i * 2], vertex.positions[*i * 2 + 1]])
                    .collect();
            }
        }
    }
}

fn runtime_equivalent(mut left: Value, mut right: Value) -> Result<bool, String> {
    fn normalize(value: &mut Value) -> Result<(), String> {
        if let Some(skeleton) = value["skeleton"].as_object_mut() {
            skeleton.remove("hash");
        }
        for skin in value["skins"].as_array_mut().into_iter().flatten() {
            for slot in skin["attachments"]
                .as_object_mut()
                .into_iter()
                .flat_map(|o| o.values_mut())
            {
                for attachment in slot
                    .as_object_mut()
                    .into_iter()
                    .flat_map(|o| o.values_mut())
                {
                    if attachment["type"] != "mesh" {
                        continue;
                    }
                    let uv_count = attachment["uvs"].as_array().ok_or("Missing UVs")?.len();
                    let vertices = attachment["vertices"]
                        .as_array_mut()
                        .ok_or("Missing vertices")?;
                    if vertices.len() == uv_count {
                        continue;
                    }
                    let mut normalized = vec![];
                    let mut offset = 0;
                    for _ in 0..uv_count / 2 {
                        let count = vertices
                            .get(offset)
                            .and_then(Value::as_f64)
                            .filter(|n| n.fract() == 0.0 && *n >= 1.0 && *n <= 128.0)
                            .ok_or("Invalid influences")?
                            as usize;
                        offset += 1;
                        let mut influences = vec![];
                        for _ in 0..count {
                            let tuple = vertices
                                .get(offset..offset + 4)
                                .ok_or("Truncated influence")?
                                .to_vec();
                            offset += 4;
                            influences.push(tuple);
                        }
                        influences.sort_by(|a, b| {
                            a[0].as_f64().unwrap().total_cmp(&b[0].as_f64().unwrap())
                        });
                        normalized.push(json!(count as f64));
                        for tuple in influences {
                            normalized.extend(tuple);
                        }
                    }
                    if offset != vertices.len() {
                        return Err("Unexpected influence data".into());
                    }
                    *vertices = normalized;
                }
            }
        }
        Ok(())
    }
    normalize(&mut left)?;
    normalize(&mut right)?;
    Ok(left == right)
}

fn compare(case: &Case, source: &[u8]) -> Result<bool, String> {
    let mut actual = decode_regions(source).map_err(|e| format!("{} reader: {e}", case.id))?;
    actual.rig.identity = [0; 16];
    let expected = candidate::region_model(&case.recipe, [0; 16])?;
    let mut normalized = actual.clone();
    normalize_bindings(&mut normalized);
    if normalized != expected {
        return Err(format!("{} decoded model differs", case.id));
    }
    let encoded = encode_region_payload(&expected).map_err(|e| e.to_string())?;
    // Reader recognition already required full, byte-identical source
    // reserialization. Binding-column permutations are preserved by that reader
    // and normalized ONLY here to compare independently generated semantics.
    Ok(encoded.len() == source.len()
        && encoded[..12] == source[..12]
        && encoded[28..] == source[28..])
}

pub(super) fn verify(spine: PathBuf) -> Result<bool, String> {
    verify_suite(spine, cases(), "regions-v1")
}

pub(super) fn verify_suite(
    spine: PathBuf,
    samples: Vec<Case>,
    case_set: &str,
) -> Result<bool, String> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let root = env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("No executable folder")?
        .join(format!(
            "{}-results-{stamp}",
            if case_set == "regions-v1" {
                "region"
            } else {
                "mesh"
            }
        ));
    fs::create_dir(&root).map_err(|e| e.to_string())?;
    let mut entries = vec![];
    let count = samples.len();
    for (index, case) in samples.into_iter().enumerate() {
        let folder = root.join(case.id);
        fs::create_dir(&folder).map_err(|e| e.to_string())?;
        fs::create_dir(folder.join("images")).map_err(|e| e.to_string())?;
        fs::write(folder.join("images/checker.png"), checker_png()).map_err(|e| e.to_string())?;
        write_json(&folder.join("recipe.json"), &case.recipe).map_err(|e| e.to_string())?;
        let model = candidate::region_model(&case.recipe, (stamp + index as u128).to_be_bytes())?;
        let encoded = encode_regions(&model).map_err(|e| e.to_string())?;
        fs::write(folder.join("project.fbones"), &encoded).map_err(|e| e.to_string())?;
        fs::write(folder.join("project.spine"), &encoded).map_err(|e| e.to_string())?;
        for name in ["original-export", "export"] {
            fs::create_dir(folder.join(name)).map_err(|e| e.to_string())?;
        }
        println!(
            "{}: importing controlled reference and exporting independent candidate...",
            case.id
        );
        let mut exact = true;
        let check = (|| -> Result<(), String> {
            run_spine(
                &spine,
                &[
                    "--input".into(),
                    file_argument(&folder.join("recipe.json"))?,
                    "--output".into(),
                    file_argument(&folder.join("reference.spine"))?,
                    "--import".into(),
                    "skeleton".into(),
                    "--input".into(),
                    file_argument(&folder.join("reference.spine"))?,
                    "--output".into(),
                    file_argument(&folder.join("original-export"))?,
                    "--export".into(),
                    "json".into(),
                    "--input".into(),
                    file_argument(&folder.join("project.spine"))?,
                    "--output".into(),
                    file_argument(&folder.join("export"))?,
                    "--export".into(),
                    "json".into(),
                ],
                Duration::from_secs(120),
            )?;
            let original = exported_json(&folder.join("original-export"))?;
            let candidate = exported_json(&folder.join("export"))?;
            if original.len() != 1 || candidate.len() != 1 {
                return Err("Expected exactly one skeleton".into());
            }
            verify_regions(&case, &original[0])?;
            verify_regions(&case, &candidate[0])?;
            if !runtime_equivalent(original[0].clone(), candidate[0].clone())? {
                return Err("Candidate JSON differs from controlled original export".into());
            }
            for name in ["reference.spine", "project.spine"] {
                let payload = ProjectEnvelope::inspect(
                    fs::read(folder.join(name)).map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?
                .decoded_payload()
                .map_err(|e| e.to_string())?;
                let matches = compare(&case, &payload)?;
                if name == "reference.spine" {
                    exact = matches;
                }
            }
            Ok(())
        })();
        entries.push(json!({"id":case.id,"originalSpineExportVerified":check.is_ok(),"canonicalReferenceMatches":check.is_ok(),"payloadEqualOutsideIdentity":exact && check.is_ok(),"bindingOrderEquivalent":!exact && check.is_ok(),"error":check.as_ref().err()}));
        write_json(&folder.join("result.json"), entries.last().unwrap())
            .map_err(|e| e.to_string())?;
        if let Err(error) = check {
            eprintln!("{error}");
            break;
        }
    }
    let accepted = entries.len() == count
        && entries
            .iter()
            .all(|e| e["originalSpineExportVerified"] == true);
    write_json(&root.join("report.json"), &json!({"referenceVersion":TARGET_VERSION,"caseSet":case_set,"cases":entries,"profileCliAccepted":accepted,"regionProfileCliAccepted":accepted && case_set=="regions-v1","meshProfileCliAccepted":accepted && case_set=="meshes-v1","researchToolControlsApplicationSaving":false})).map_err(|e| e.to_string())?;
    println!("Results: {}", root.display());
    Ok(accepted)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn region_models_roundtrip_while_desktop_recognizer_keeps_them_inspection_only() {
        for case in cases() {
            let project = candidate::region_model(&case.recipe, [7; 16]).unwrap();
            let payload = encode_region_payload(&project).unwrap();
            assert_eq!(decode_regions(&payload).unwrap(), project);
            assert!(fbones_format::minimal::decode_minimal(&payload).is_err());
            verify_regions(&case, &case.recipe).unwrap();
            let mut wrong = case.recipe.clone();
            wrong["slots"][0]["bone"] = json!("missing");
            assert!(verify_regions(&case, &wrong).is_err());
        }
    }
}
