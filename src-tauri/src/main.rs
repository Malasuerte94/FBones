#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    configure_wslg_webkit_painting();

    fbones_desktop::run();
}

#[cfg(target_os = "linux")]
fn configure_wslg_webkit_painting() {
    use std::{env, fs, path::Path};

    const CPU_PAINT: &str = "WEBKIT_SKIA_ENABLE_CPU_RENDERING";
    if env::var_os(CPU_PAINT).is_some()
        || !env::var_os("WSL2_GUI_APPS_ENABLED").is_some_and(|value| value == "1")
        || !fs::exists("/dev/dri").is_ok_and(|exists| !exists)
    {
        return;
    }

    let wslg = Path::new("/mnt/wslg");
    let backend = env::var("GDK_BACKEND").ok();
    let on_wslg_x11 = matches!(backend.as_deref(), None | Some("*" | "x11"))
        && matches!(env::var("DISPLAY").as_deref(), Ok(":0" | ":0.0"))
        && same_socket(Path::new("/tmp/.X11-unix/X0"), &wslg.join(".X11-unix/X0"));
    let on_wslg_wayland = matches!(backend.as_deref(), None | Some("*" | "wayland"))
        && env::var_os("XDG_RUNTIME_DIR").is_some_and(|runtime| {
            let display = env::var_os("WAYLAND_DISPLAY").unwrap_or_else(|| "wayland-0".into());
            same_socket(
                &Path::new(&runtime).join(display),
                &wslg.join("runtime-dir/wayland-0"),
            )
        });

    if on_wslg_x11 || on_wslg_wayland {
        // This runs before GTK, Tauri or any application threads are started.
        // In this WSLg configuration WebKit's accelerated Skia buffers use
        // Mesa software rasterization. Paint directly in Skia instead.
        env::set_var(CPU_PAINT, "1");
    }
}

#[cfg(target_os = "linux")]
fn same_socket(display: &std::path::Path, wslg: &std::path::Path) -> bool {
    use std::{
        fs,
        os::unix::fs::{FileTypeExt, MetadataExt},
    };

    let (Ok(display), Ok(wslg)) = (fs::metadata(display), fs::metadata(wslg)) else {
        return false;
    };
    display.file_type().is_socket() && display.dev() == wslg.dev() && display.ino() == wslg.ino()
}
