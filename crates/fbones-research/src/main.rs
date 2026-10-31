//! Optional, user-run reference collection. Original Spine is used only as a
//! research oracle; FBones project persistence never delegates to this tool.
mod candidate;
mod mesh_cases;
mod regions;

use fbones_format::{crc64_ecma, encode_envelope, ProjectEnvelope, TARGET_VERSION};
use serde::Serialize;
use serde_json::{json, Value};
use std::{
    env, fs,
    io::{self, Write},
    path::{Path, PathBuf},
    process::{Command, ExitCode, Stdio},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

#[derive(Clone)]
struct Case {
    id: &'static str,
    skeleton_name: &'static str,
    recipe: Value,
}

fn cases() -> Vec<Case> {
    let base = json!({
        "skeleton": { "spine": TARGET_VERSION, "fps": 30, "images": "./images/" },
        "bones": [{ "name": "root" }],
        "slots": [], "skins": [{ "name": "default", "attachments": {} }],
        "animations": { "animation": {} }
    });
    let mut result = vec![
        Case {
            id: "00-empty",
            skeleton_name: "skeleton",
            recipe: base.clone(),
        },
        Case {
            id: "01-repeat",
            skeleton_name: "skeleton",
            recipe: base.clone(),
        },
    ];
    let mut shifted = base.clone();
    shifted["bones"][0]["x"] = json!(37);
    result.push(Case {
        id: "02-root-x",
        skeleton_name: "skeleton",
        recipe: shifted,
    });
    let mut rotated = base.clone();
    rotated["bones"][0]["rotation"] = json!(25);
    result.push(Case {
        id: "03-root-rotation",
        skeleton_name: "skeleton",
        recipe: rotated,
    });
    let mut child = base.clone();
    child["bones"].as_array_mut().unwrap().push(json!({
        "name": "arm", "parent": "root", "x": 16, "y": 8, "length": 100, "rotation": 25
    }));
    result.push(Case {
        id: "04-one-child",
        skeleton_name: "skeleton",
        recipe: child,
    });
    result.push(Case {
        id: "05-skeleton-name",
        skeleton_name: "renamed_skeleton",
        recipe: base.clone(),
    });
    let mut named = base.clone();
    named["bones"][0]["name"] = json!("root_changed");
    result.push(Case {
        id: "06-bone-name",
        skeleton_name: "skeleton",
        recipe: named,
    });
    let mut unicode = base;
    unicode["bones"][0]["name"] = json!("rădăcină");
    result.push(Case {
        id: "07-unicode-name",
        skeleton_name: "skeleton",
        recipe: unicode,
    });
    result
}

// Additional generated profiles exercise counts/reference indices beyond the
// earlier two-bone sample. They never replace the already accepted baseline.
fn bone_cases() -> Vec<Case> {
    let recipes = [
        (
            "B00-chain",
            json!([
                {"name":"root","x":15,"y":-8,"rotation":30},
                {"name":"body","parent":"root","rotation":15,"length":80},
                {"name":"arm","parent":"body","x":80,"rotation":-25,"length":60},
                {"name":"hand","parent":"arm","x":60,"rotation":40,"length":25}
            ]),
        ),
        (
            "B01-branches",
            json!([
                {"name":"root"},
                {"name":"left","parent":"root","x":-50,"y":30,"rotation":130,"length":90},
                {"name":"left_hand","parent":"left","x":90,"rotation":-20,"length":40},
                {"name":"right","parent":"root","x":50,"y":30,"rotation":30,"length":90},
                {"name":"right_hand","parent":"right","x":90,"rotation":20,"length":40}
            ]),
        ),
        (
            "B02-reparent",
            json!([
                {"name":"root"},
                {"name":"right","parent":"root","x":100,"length":100},
                {"name":"left","parent":"right","x":-90,"y":20,"rotation":30,"length":80},
                {"name":"hand","parent":"left","x":80,"rotation":15,"length":30}
            ]),
        ),
        (
            "B03-unicode",
            json!([
                {"name":"rădăcină"},
                {"name":"braț","parent":"rădăcină","x":-16,"y":8,"rotation":-45,"length":100},
                {"name":"mână","parent":"braț","x":100,"rotation":25,"length":40}
            ]),
        ),
    ];
    recipes
        .into_iter()
        .map(|(id, bones)| {
            let mut recipe = cases()[0].recipe.clone();
            recipe["bones"] = bones;
            Case {
                id,
                skeleton_name: "skeleton",
                recipe,
            }
        })
        .collect()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CaseReport {
    id: String,
    status: String,
    project_file: Option<String>,
    bytes: Option<usize>,
    payload_bytes: Option<usize>,
    file_crc64: Option<String>,
    runtime_json_files: usize,
    elapsed_ms: u128,
    error: Option<String>,
}

fn write_json(path: &Path, value: &impl Serialize) -> io::Result<()> {
    let bytes = serde_json::to_vec_pretty(value).map_err(io::Error::other)?;
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)?;
    file.write_all(&bytes)?;
    file.write_all(b"\n")
}

fn run_spine(executable: &Path, arguments: &[String], limit: Duration) -> Result<(), String> {
    // Hide license banner and use the precise target version. Never pass flags
    // that log out, force a download, clean a source, or modify an existing rig.
    let mut child = Command::new(executable)
        .args([
            "--update",
            TARGET_VERSION,
            "--disable-audio",
            "--hide-license",
        ])
        .args(arguments)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Spine could not be started: {e}"))?;
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) if status.success() => return Ok(()),
            Ok(Some(status)) => {
                return Err(format!(
                    "Spine returned {status}. Open the original Spine app and check its log."
                ))
            }
            Ok(None) if start.elapsed() < limit => thread::sleep(Duration::from_millis(100)),
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Spine timed out. Check that version 4.3.26 is installed and activated in the original application.".into());
            }
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(e.to_string());
            }
        }
    }
}

fn file_argument(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_owned)
        .ok_or_else(|| "A file path could not be represented as Unicode.".into())
}

fn exported_json(folder: &Path) -> Result<Vec<Value>, String> {
    let mut paths: Vec<_> = fs::read_dir(folder)
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .is_some_and(|e| e.eq_ignore_ascii_case("json"))
        })
        .collect();
    paths.sort();
    if paths.is_empty() {
        return Err("Spine did not produce any JSON exports.".into());
    }
    paths
        .iter()
        .map(|p| {
            serde_json::from_slice(&fs::read(p).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())
        })
        .collect()
}

fn verify_export(case: &Case, exported: &[Value]) -> Result<(), String> {
    if exported.len() != 1 {
        return Err("Expected exactly one skeleton export for this controlled case.".into());
    }
    let output = &exported[0];
    if output["skeleton"]["spine"] != TARGET_VERSION {
        return Err("The JSON export does not identify Spine 4.3.26.".into());
    }
    let expected = case.recipe["bones"].as_array().unwrap();
    let actual = output["bones"]
        .as_array()
        .ok_or("The JSON export has no bones array.")?;
    if expected.len() != actual.len() {
        return Err("The imported project's bone count differs from its recipe.".into());
    }
    for input in expected {
        let result = actual
            .iter()
            .find(|bone| bone["name"] == input["name"])
            .ok_or("The exported bone name differs from the recipe.")?;
        for field in ["name", "parent"] {
            if input[field] != result[field] {
                return Err(format!(
                    "The imported bone's {field} differs from its recipe."
                ));
            }
        }
        // Runtime exports omit zero/default transforms. Check the resulting
        // values so an ignored import option cannot count as a useful fixture.
        for field in ["x", "y", "length", "rotation"] {
            let expected = input[field].as_f64().unwrap_or(0.0);
            let actual = match &result[field] {
                Value::Null => 0.0,
                value => value.as_f64().ok_or("Exported transform is not numeric.")?,
            };
            if !actual.is_finite() || (expected - actual).abs() > 0.001 {
                return Err(format!(
                    "The imported bone's {field} differs from its recipe."
                ));
            }
        }
    }
    Ok(())
}

fn collect_case(spine: &Path, root: &Path, case: &Case) -> Result<CaseReport, String> {
    let start = Instant::now();
    let folder = root.join(case.id);
    fs::create_dir(&folder).map_err(|e| e.to_string())?;
    fs::create_dir(folder.join("images")).map_err(|e| e.to_string())?;
    let input = folder.join("recipe.json");
    let project = folder.join("project.spine");
    write_json(&input, &case.recipe).map_err(|e| e.to_string())?;
    run_spine(
        spine,
        &[
            "--input".into(),
            file_argument(&input)?,
            "--output".into(),
            file_argument(&project)?,
            "--import".into(),
            case.skeleton_name.into(),
        ],
        Duration::from_secs(120),
    )?;
    let bytes =
        fs::read(&project).map_err(|e| format!("The imported project was not produced: {e}"))?;
    let envelope = ProjectEnvelope::inspect(bytes.clone()).map_err(|e| e.to_string())?;
    let exports = folder.join("export");
    fs::create_dir(&exports).map_err(|e| e.to_string())?;
    run_spine(
        spine,
        &[
            "--input".into(),
            file_argument(&project)?,
            "--output".into(),
            file_argument(&exports)?,
            "--export".into(),
            "json".into(),
        ],
        Duration::from_secs(120),
    )?;
    let values = exported_json(&exports)?;
    verify_export(case, &values)?;
    Ok(CaseReport {
        id: case.id.into(),
        status: "collected".into(),
        project_file: Some(format!("{}/project.spine", case.id)),
        bytes: Some(bytes.len()),
        payload_bytes: Some(envelope.decoded_bytes()),
        file_crc64: Some(format!("{:016x}", crc64_ecma(&bytes))),
        runtime_json_files: values.len(),
        elapsed_ms: start.elapsed().as_millis(),
        error: None,
    })
}

fn repack_probe(spine: &Path, root: &Path) -> Result<Value, String> {
    let input = root.join("00-empty/project.spine");
    let inspected = ProjectEnvelope::inspect(fs::read(input).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    let payload = inspected.decoded_payload().map_err(|e| e.to_string())?;
    let bytes = encode_envelope(&payload).map_err(|e| e.to_string())?;
    let path = root.join("repacked-existing.spine");
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    let exports = root.join("repacked-export");
    fs::create_dir(&exports).map_err(|e| e.to_string())?;
    run_spine(
        spine,
        &[
            "--input".into(),
            file_argument(&path)?,
            "--output".into(),
            file_argument(&exports)?,
            "--export".into(),
            "json".into(),
        ],
        Duration::from_secs(120),
    )?;
    let original = exported_json(&root.join("00-empty/export"))?;
    let repacked = exported_json(&exports)?;
    if original != repacked {
        return Err(
            "Spine's exports differ after repacking; retain the results for investigation.".into(),
        );
    }
    Ok(
        json!({ "acceptedByOriginalSpine": true, "identicalJsonExports": true,
               "scope": "compression/checksum envelope only; not a generated project" }),
    )
}

fn discover_spine(override_path: Option<PathBuf>) -> Result<PathBuf, String> {
    if let Some(path) = override_path {
        if path.is_file() {
            return Ok(path);
        }
        return Err("The supplied Spine executable does not exist.".into());
    }
    for variable in ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"] {
        if let Some(base) = env::var_os(variable) {
            for relative in ["Spine/Spine.com", "Programs/Spine/Spine.com"] {
                let path = PathBuf::from(&base).join(relative);
                if path.is_file() {
                    return Ok(path);
                }
            }
        }
    }
    Err("Original Spine.com was not found. Run fbones-reference.exe --spine \"C:\\path\\to\\Spine.com\".".into())
}

fn execute() -> Result<bool, String> {
    let mut override_path = None;
    let mut compare = None;
    let mut generate = false;
    let mut verify_generated = false;
    let mut verify_bones = false;
    let mut verify_regions = false;
    let mut verify_meshes = false;
    let mut arguments = env::args_os().skip(1);
    while let Some(argument) = arguments.next() {
        if argument == "--spine" {
            override_path = Some(PathBuf::from(
                arguments
                    .next()
                    .ok_or("--spine requires an executable path")?,
            ));
        } else if argument == "--compare-candidates" {
            compare = Some(PathBuf::from(
                arguments.next().ok_or("Missing reference results folder")?,
            ));
        } else if argument == "--generate-candidates" {
            generate = true;
        } else if argument == "--verify-generated" {
            verify_generated = true;
        } else if argument == "--verify-bones" {
            verify_bones = true;
        } else if argument == "--verify-regions" {
            verify_regions = true;
        } else if argument == "--verify-meshes" {
            verify_meshes = true;
        } else if argument == "--help" || argument == "-h" {
            println!("FBones reference collector\nUsage: fbones-reference.exe [--spine <Spine.com>]\n  --compare-candidates <results-folder>: independent writer differential check\n  --generate-candidates: write experimental projects without original Spine\n  --verify-generated: generate projects, then verify exports in original Spine\n  --verify-bones: compare chains, branches, reparented and Unicode bones\n  --verify-regions: verify region/slot codec against controlled original imports\n  --verify-meshes: compare mesh geometry, mixed attachments and weights\nCreates fresh local results using original Spine 4.3.26. Existing projects are not changed.");
            return Ok(true);
        } else {
            return Err("Unknown argument. Use --help for usage.".into());
        }
    }
    if let Some(root) = compare {
        if generate
            || verify_generated
            || verify_bones
            || verify_regions
            || verify_meshes
            || override_path.is_some()
        {
            return Err("Candidate comparison cannot be combined with other modes.".into());
        }
        let report: Value =
            serde_json::from_slice(&fs::read(root.join("report.json")).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
        let samples = if report["caseSet"] == "bones-v1" {
            bone_cases()
        } else {
            cases()
        };
        for case in samples {
            let encoded = candidate::encode(&case.recipe, case.skeleton_name, [0; 16])?;
            let ours = ProjectEnvelope::inspect(encoded)
                .map_err(|e| e.to_string())?
                .decoded_payload()
                .map_err(|e| e.to_string())?;
            let source = ProjectEnvelope::inspect(
                fs::read(root.join(case.id).join("project.spine")).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?
            .decoded_payload()
            .map_err(|e| e.to_string())?;
            let mut decoded = fbones_format::minimal::decode_minimal(&source).map_err(|e| {
                format!(
                    "{}: semantic reader rejected the controlled fixture: {e}",
                    case.id
                )
            })?;
            decoded.identity = [0; 16];
            if fbones_format::minimal::encode_minimal_payload(&decoded)
                .map_err(|e| e.to_string())?
                != ours
            {
                return Err(format!(
                    "{}: decoded semantic model differs from the controlled recipe",
                    case.id
                ));
            }
            if ours.len() != source.len()
                || ours[..12] != source[..12]
                || ours[28..] != source[28..]
            {
                let offset = ours
                    .iter()
                    .zip(&source)
                    .enumerate()
                    .find(|(i, (a, b))| !(12..28).contains(i) && a != b)
                    .map(|(i, _)| i);
                return Err(format!(
                    "{}: generated payload differs (sizes {} / {}, first offset {offset:?})",
                    case.id,
                    ours.len(),
                    source.len()
                ));
            }
            println!("{}: independent serialization matches {} decoded bytes outside the unknown 16-byte identity block", case.id, ours.len());
        }
        return Ok(true);
    }
    if generate || verify_generated || verify_bones || verify_regions || verify_meshes {
        if [
            generate,
            verify_generated,
            verify_bones,
            verify_regions,
            verify_meshes,
        ]
        .into_iter()
        .filter(|v| *v)
        .count()
            > 1
        {
            return Err("Choose generation or original-Spine verification.".into());
        }
        if verify_meshes {
            return regions::verify_suite(
                discover_spine(override_path)?,
                mesh_cases::cases(),
                "meshes-v1",
            );
        }
        if verify_regions {
            return regions::verify(discover_spine(override_path)?);
        }
        return generated_candidates(
            if verify_generated || verify_bones {
                Some(discover_spine(override_path)?)
            } else {
                None
            },
            verify_bones,
        );
    }
    let spine = discover_spine(override_path)?;
    let parent = env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Executable folder unavailable")?
        .to_path_buf();
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let root = parent.join(format!("reference-results-{stamp}"));
    fs::create_dir(&root).map_err(|e| e.to_string())?;
    println!("Reference: Spine {TARGET_VERSION}.\nGenerating controlled projects in a new results folder.");
    let mut reports = Vec::new();
    for case in cases() {
        println!("Collecting {}...", case.id);
        match collect_case(&spine, &root, &case) {
            Ok(report) => reports.push(report),
            Err(error) => {
                eprintln!("{}: {error}", case.id);
                reports.push(CaseReport {
                    id: case.id.into(),
                    status: "failed".into(),
                    project_file: None,
                    bytes: None,
                    payload_bytes: None,
                    file_crc64: None,
                    runtime_json_files: 0,
                    elapsed_ms: 0,
                    error: Some(error),
                });
                break;
            }
        }
    }
    let collection_ok =
        reports.len() == cases().len() && reports.iter().all(|r| r.status == "collected");
    let repack = if collection_ok {
        println!("Checking our compression/checksum encoder in original Spine...");
        match repack_probe(&spine, &root) {
            Ok(value) => value,
            Err(e) => json!({ "acceptedByOriginalSpine": false, "error": e }),
        }
    } else {
        json!({ "skipped": true, "reason": "Case collection did not complete" })
    };
    let success = collection_ok && repack["acceptedByOriginalSpine"] == true;
    write_json(
        &root.join("report.json"),
        &json!({ "referenceVersion": TARGET_VERSION,
        "cases": reports, "envelopeProbe": repack, "semanticEncoderVerified": false,
        "success": success }),
    )
    .map_err(|e| e.to_string())?;
    println!("\nResults: {}\nResults are available directly in the shared workspace. No manual copying is needed.", root.file_name().unwrap().to_string_lossy());
    Ok(success)
}

fn generated_candidates(spine: Option<PathBuf>, bones: bool) -> Result<bool, String> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let root = env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Executable folder unavailable")?
        .join(format!("candidate-results-{stamp}"));
    fs::create_dir(&root).map_err(|e| e.to_string())?;
    let mut reports = vec![];
    let samples = if bones { bone_cases() } else { cases() };
    let count = samples.len();
    for (index, case) in samples.into_iter().enumerate() {
        println!("Generating {} from our own model...", case.id);
        let folder = root.join(case.id);
        fs::create_dir(&folder).map_err(|e| e.to_string())?;
        let bytes = candidate::encode(
            &case.recipe,
            case.skeleton_name,
            (stamp + index as u128).to_be_bytes(),
        )?;
        for extension in ["fbones", "spine"] {
            fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(folder.join(format!("project.{extension}")))
                .and_then(|mut f| f.write_all(&bytes))
                .map_err(|e| e.to_string())?;
        }
        write_json(&folder.join("expected.json"), &case.recipe).map_err(|e| e.to_string())?;
        let verification = if let Some(spine) = &spine {
            let exports = folder.join("export");
            fs::create_dir(&exports).map_err(|e| e.to_string())?;
            run_spine(
                spine,
                &[
                    "--input".into(),
                    file_argument(&folder.join("project.spine"))?,
                    "--output".into(),
                    file_argument(&exports)?,
                    "--export".into(),
                    "json".into(),
                ],
                Duration::from_secs(120),
            )
            .and_then(|()| {
                let values = exported_json(&exports)?;
                verify_export(&case, &values)?;
                if values[0]["animations"] != case.recipe["animations"] {
                    return Err("Generated candidate animation export differs.".into());
                }
                if !exports
                    .join(format!("{}.json", case.skeleton_name))
                    .is_file()
                {
                    return Err("Generated candidate skeleton name differs.".into());
                }
                Ok(())
            })
        } else {
            Ok(())
        };
        let succeeded = verification.is_ok();
        if let Err(error) = &verification {
            eprintln!("{}: {error}", case.id);
        }
        reports.push(json!({ "id": case.id, "bytes": bytes.len(),
            "fileCrc64": format!("{:016x}", crc64_ecma(&bytes)),
            "generatedWithoutSourceProject": true,
            "originalSpineExportVerified": spine.is_some() && succeeded,
            "error": verification.err() }));
        if !succeeded {
            break;
        }
    }
    let accepted = spine.is_some()
        && reports.len() == count
        && reports
            .iter()
            .all(|entry| entry["originalSpineExportVerified"] == true);
    write_json(&root.join("report.json"), &json!({
        "referenceVersion": TARGET_VERSION, "experimentalProfile": "empty skeleton and bones only",
        "caseSet": if bones { "bones-v1" } else { "minimal-v1" },
        "cases": reports, "independentGeneration": true,
        "minimalProfileCliAccepted": accepted, "interactiveOpenVerified": false,
        "researchToolControlsApplicationSaving": false,
        "limitations": ["Identity block and footer semantics remain unknown", "No attachments or animation tracks are supported"],
    })).map_err(|e| e.to_string())?;
    println!(
        "Results: {}\nResults are available directly in the shared workspace. No manual copying is needed.",
        root.file_name().unwrap().to_string_lossy()
    );
    Ok(spine.is_none() || accepted)
}

fn main() -> ExitCode {
    match execute() {
        Ok(true) => ExitCode::SUCCESS,
        Ok(false) => ExitCode::FAILURE,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extended_bone_cases_encode_and_decode_chains_branches_and_unicode() {
        for case in bone_cases() {
            let bytes = candidate::encode(&case.recipe, case.skeleton_name, [0; 16]).unwrap();
            let payload = ProjectEnvelope::inspect(bytes)
                .unwrap()
                .decoded_payload()
                .unwrap();
            let model = fbones_format::minimal::decode_minimal(&payload).unwrap();
            let expected = case.recipe["bones"].as_array().unwrap();
            assert_eq!(model.bones.len(), expected.len());
            for (bone, wanted) in model.bones.iter().zip(expected) {
                assert_eq!(bone.name, wanted["name"].as_str().unwrap());
                if let Some(parent) = bone.parent {
                    assert_eq!(model.bones[parent].name, wanted["parent"].as_str().unwrap());
                }
                assert_eq!(bone.x, wanted["x"].as_f64().unwrap_or(0.0) as f32);
                assert_eq!(
                    bone.rotation,
                    wanted["rotation"].as_f64().unwrap_or(0.0) as f32
                );
            }
        }
    }
    #[test]
    fn cases_isolate_transform_and_naming_changes_without_invalid_parents() {
        let cases = cases();
        assert_eq!(cases[0].recipe, cases[1].recipe);
        assert_eq!(cases[2].recipe["bones"][0]["x"], 37);
        assert_eq!(cases[3].recipe["bones"][0]["rotation"], 25);
        let bones = cases[4].recipe["bones"].as_array().unwrap();
        assert_eq!(bones.len(), 2);
        assert_eq!(bones[1]["parent"], bones[0]["name"]);
        assert_eq!(cases[7].recipe["bones"][0]["name"], "rădăcină");
        for case in cases {
            assert_eq!(case.recipe["skeleton"]["spine"], TARGET_VERSION);
        }
    }

    #[test]
    fn result_files_never_replace_existing_data() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("report.json");
        write_json(&path, &json!({ "original": true })).unwrap();
        assert!(write_json(&path, &json!({ "replacement": true })).is_err());
        let value: Value = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
        assert_eq!(value["original"], true);
    }

    #[test]
    fn exports_must_preserve_the_controlled_change_and_version() {
        let cases = cases();
        for case in &cases {
            verify_export(case, std::slice::from_ref(&case.recipe)).unwrap();
        }
        let mut incorrect = cases[2].recipe.clone();
        incorrect["bones"][0].as_object_mut().unwrap().remove("x");
        assert!(verify_export(&cases[2], &[incorrect]).is_err());
        let mut defaults = cases[0].recipe.clone();
        defaults["bones"][0]["x"] = json!(0);
        verify_export(&cases[0], &[defaults]).unwrap();
        let mut wrong_version = cases[0].recipe.clone();
        wrong_version["skeleton"]["spine"] = json!("unsupported");
        assert!(verify_export(&cases[0], &[wrong_version]).is_err());
        assert!(verify_export(&cases[0], &[]).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn process_failure_and_timeout_are_reported() {
        assert!(run_spine(Path::new("/usr/bin/false"), &[], Duration::from_secs(1)).is_err());
        // The shell script deliberately ignores the Spine arguments supplied
        // by the runner and stays alive until its timeout terminates it.
        use std::os::unix::fs::PermissionsExt;
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("slow-spine");
        fs::write(&path, "#!/bin/sh\nexec sleep 5\n").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
        assert!(run_spine(&path, &[], Duration::from_millis(20))
            .unwrap_err()
            .contains("timed out"));
    }
}
