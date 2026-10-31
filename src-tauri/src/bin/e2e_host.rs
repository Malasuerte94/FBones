fn main() {
    if let Err(error) = fbones_desktop::e2e_host::run() {
        eprintln!("{}: {}", error.code, error.message);
        std::process::exit(1);
    }
}
