//! Stable GUI entry point for existing shortcuts. The editor image is immutable.
#![cfg_attr(windows, windows_subsystem = "windows")]
use std::{
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
fn build_path(root: &Path, hash: &str) -> Result<PathBuf, String> {
    let hash = hash.trim();
    if hash.len() != 64
        || !hash
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err("FBones build pointer is invalid. Rebuild WINDOWS_TEST.".into());
    }
    let path = root.join("builds").join(hash).join("FBones.exe");
    if !path.is_file() {
        return Err("The current FBones build is missing. Rebuild WINDOWS_TEST.".into());
    }
    Ok(path)
}
fn launch() -> Result<(), String> {
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let root = executable
        .parent()
        .ok_or("Could not locate WINDOWS_TEST.")?;
    let hash = std::fs::read_to_string(root.join("current-build.txt"))
        .map_err(|_| "FBones build pointer is missing. Rebuild WINDOWS_TEST.")?;
    let program = build_path(root, &hash)?;
    let mut command = Command::new(program);
    command
        .args(std::env::args_os().skip(1))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    if let Some(directory) = std::env::var_os("SystemRoot") {
        command.current_dir(directory);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }
    command
        .spawn()
        .map_err(|e| format!("FBones could not start: {e}"))?;
    Ok(())
}
fn main() {
    if let Err(error) = launch() {
        #[cfg(windows)]
        {
            #[link(name = "user32")]
            unsafe extern "system" {
                fn MessageBoxW(
                    window: isize,
                    text: *const u16,
                    title: *const u16,
                    flags: u32,
                ) -> i32;
            }
            let message: Vec<u16> = error.encode_utf16().chain(Some(0)).collect();
            let title: Vec<u16> = "FBones".encode_utf16().chain(Some(0)).collect();
            unsafe {
                MessageBoxW(0, message.as_ptr(), title.as_ptr(), 0x10);
            }
        }
        #[cfg(not(windows))]
        eprintln!("{error}");
        std::process::exit(1);
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn a_pointer_cannot_escape_the_build_directory() {
        for value in [
            "../FBones.exe",
            "",
            &"f".repeat(63),
            &"G".repeat(64),
            &format!("{}../", "f".repeat(61)),
        ] {
            assert!(build_path(Path::new("."), value).is_err());
        }
    }
    #[test]
    fn a_valid_but_missing_build_is_an_error() {
        assert!(build_path(Path::new(".local/no-such-bootstrap-root"), &"a".repeat(64)).is_err());
    }
}
