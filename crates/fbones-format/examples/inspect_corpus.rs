//! Local, read-only aggregate check. Never prints paths or project content.
use fbones_format::ProjectEnvelope;
use std::{env, fs, process};

fn main() {
    let Some(root) = env::args_os().nth(1) else {
        eprintln!("Usage: cargo run -p fbones-format --example inspect_corpus -- <backup-dir>");
        process::exit(2);
    };
    let mut accepted = 0;
    let mut excluded = 0;
    for entry in fs::read_dir(root).expect("Cannot read corpus directory") {
        let entry = entry.expect("Cannot read directory entry");
        if !entry
            .file_name()
            .to_string_lossy()
            .ends_with("4.3.26.spine")
        {
            continue;
        }
        let bytes = fs::read(entry.path()).expect("Cannot read corpus file");
        match ProjectEnvelope::inspect(bytes) {
            Ok(_) => accepted += 1,
            Err(_) => excluded += 1,
        }
    }
    println!("{{\"inspectedEnvelopes\":{accepted},\"excludedFiles\":{excluded},\"semanticCodecVerified\":false}}");
    if accepted == 0 {
        process::exit(1);
    }
}
