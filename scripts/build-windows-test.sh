#!/usr/bin/env bash
# Build a real Windows x64 PE executable using the cached Microsoft SDK and LLD.
set -euo pipefail
cd "$(dirname "$0")/.."
project_root="$PWD"
sdk_root="${FBONES_WINDOWS_SDK:-$(python3 -c 'from pathlib import Path; print(Path.home()/".cache/cargo-xwin/xwin")')}"
for sdk_part in crt/lib/x86_64 sdk/lib/um/x86_64 sdk/lib/ucrt/x86_64; do
  if [[ ! -d "$sdk_root/$sdk_part" ]]; then
    printf 'Missing Windows SDK directory: %s\n' "$sdk_root/$sdk_part" >&2
    exit 1
  fi
done
# cc-rs prefers the hyphenated target variable. Preserve that precedence while
# allowing an explicit FBones tool path; a wrapper may supply SDK include flags.
windows_cc="${FBONES_WINDOWS_CC:-}"
if [[ -z "$windows_cc" ]]; then windows_cc="$(printenv 'CC_x86_64-pc-windows-msvc' || true)"; fi
if [[ -z "$windows_cc" ]]; then windows_cc="${CC_x86_64_pc_windows_msvc:-}"; fi
if [[ -z "$windows_cc" ]]; then windows_cc="$(command -v clang-cl || true)"; fi
windows_ar="${FBONES_WINDOWS_AR:-}"
if [[ -z "$windows_ar" ]]; then windows_ar="$(printenv 'AR_x86_64-pc-windows-msvc' || true)"; fi
if [[ -z "$windows_ar" ]]; then windows_ar="${AR_x86_64_pc_windows_msvc:-}"; fi
if [[ -z "$windows_ar" ]]; then windows_ar="$(command -v llvm-lib || true)"; fi
for windows_tool in "$windows_cc" "$windows_ar"; do
  resolved_tool="$(command -v -- "$windows_tool" || true)"
  if [[ -z "$windows_tool" || -z "$resolved_tool" || ! -f "$resolved_tool" || ! -x "$resolved_tool" ]]; then
    echo 'Windows C tools are unavailable. Set FBONES_WINDOWS_CC to an executable SDK-aware clang-cl wrapper and FBONES_WINDOWS_AR to llvm-lib.' >&2
    exit 1
  fi
done
mkdir -p .tools/windows-bin WINDOWS_TEST
cat > .tools/windows-bin/link-fbones <<'SH'
#!/usr/bin/env bash
set -euo pipefail
toolchain_root="$(rustc --print sysroot)"
exec "$toolchain_root/lib/rustlib/x86_64-unknown-linux-gnu/bin/rust-lld" -flavor link "$@"
SH
chmod 755 .tools/windows-bin/link-fbones scripts/windows-resource.py
export CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER="$project_root/.tools/windows-bin/link-fbones"
export RC_x86_64_pc_windows_msvc="$project_root/scripts/windows-resource.py"
# The MSVC-targeting C compiler builds native dependencies (including ring) and
# preprocesses the header-free resource definition for our restricted converter.
export CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_RUSTFLAGS="-C target-feature=+crt-static -L native=$sdk_root/crt/lib/x86_64 -L native=$sdk_root/sdk/lib/um/x86_64 -L native=$sdk_root/sdk/lib/ucrt/x86_64"
if [[ -d "$project_root/.tools/cargo/registry" ]]; then
  export CARGO_HOME="$project_root/.tools/cargo"
  export CARGO_NET_OFFLINE=true
fi
pnpm build:web
build_features=fbones-desktop/custom-protocol
if [[ "${FBONES_SCENE_EDITING:-0}" == 1 ]]; then
  build_features+=,fbones-desktop/scene-editing
fi
env "CC_x86_64-pc-windows-msvc=$windows_cc" "CC_x86_64_pc_windows_msvc=$windows_cc" \
  "AR_x86_64-pc-windows-msvc=$windows_ar" "AR_x86_64_pc_windows_msvc=$windows_ar" \
  cargo build --locked --release --target x86_64-pc-windows-msvc -p fbones-desktop -p fbones-research --features "$build_features"
# Dedicated QA can compile an experimental profile without changing the shared
# shortcut's selected delivery. Publication follows its native acceptance check.
if [[ "${FBONES_BUILD_ONLY:-0}" == 1 ]]; then
  exit 0
fi
# The stable shortcut entry never maps the replaceable editor at the root path.
resource_file=$(python3 -c 'from pathlib import Path; print(max(Path("target/x86_64-pc-windows-msvc/release/build").glob("fbones-desktop-*/out/resource.lib"), key=lambda p:p.stat().st_mtime))')
rustc --edition=2021 --target x86_64-pc-windows-msvc scripts/windows-bootstrap.rs -C opt-level=s -C panic=abort -C strip=symbols -C target-feature=+crt-static -C linker="$CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER" -L "native=$sdk_root/crt/lib/x86_64" -L "native=$sdk_root/sdk/lib/um/x86_64" -L "native=$sdk_root/sdk/lib/ucrt/x86_64" -C "link-arg=$resource_file" -o target/x86_64-pc-windows-msvc/release/fbones-launcher.exe
python3 scripts/prepare-windows-test.py
printf 'Windows executable prepared: %s/WINDOWS_TEST/FBones.exe\n' "$project_root"
