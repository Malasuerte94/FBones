#!/bin/bash
set -euo pipefail
root="$1"
[[ "${GITHUB_ACTIONS:-}" == true && "${RUNNER_ENVIRONMENT:-}" == github-hosted && "${RUNNER_OS:-}" == macOS ]]
script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
asset_name=FBones_0.9.5_universal.dmg
python3 - "$root" <<'PYMAC'
from pathlib import Path
import os,json,hashlib,sys
root=Path(sys.argv[1]).resolve()
assert root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve())
r=json.loads((root/'reports/stock-package.json').read_text())
assert r['route']=='mac-dmg' and r['tag']=='v0.9.5-beta.2'
with (root/r['asset']['name']).open('rb')as f: assert hashlib.file_digest(f,'sha256').hexdigest()==r['asset']['sha256']
PYMAC
mkdir "$root/mount"
hdiutil attach -readonly -nobrowse -mountpoint "$root/mount" "$root/$asset_name" > "$root/reports/dmg-mount.txt"
trap 'hdiutil detach "$root/mount" > "$root/reports/dmg-detach.txt" || true' EXIT
[[ -d "$root/mount/FBones.app" && ! -e "$root/Applications" ]]
mkdir "$root/Applications"
ditto "$root/mount/FBones.app" "$root/Applications/FBones.app"
hdiutil detach "$root/mount" > "$root/reports/dmg-detach.txt"
trap - EXIT
expected=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["executableSha256"])' "$root/reports/stock-package.json")
swiftc -swift-version 5 "$script_dir/mac.swift" -o "$root/mac-capability"
"$root/mac-capability" "$root/Applications/FBones.app" "$root/reports" "$expected"
