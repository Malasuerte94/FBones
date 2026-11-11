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
xcrun --sdk macosx --show-sdk-version > "$root/reports/sdk-version.txt"
own_sdk="$(xcrun --sdk macosx --show-sdk-path)"
own_clang="$(xcrun --sdk macosx --find clang)"
own_swift="$(xcrun --sdk macosx --find swiftc)"
python3 - "$own_sdk" "$own_clang" "$own_swift" "$root/reports/compiler-sdk.json" <<'PYSDK'
from pathlib import Path
import hashlib,json,sys
sdk=Path(sys.argv[1]);paths=[Path(sys.argv[2]),Path(sys.argv[3]),Path('/usr/bin/osascript')]+[sdk/'usr/include'/name for name in ['libproc.h','sys/proc_info.h','sys/proc.h','sys/sysctl.h','sys/stat.h']]
pins={str(p):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in paths}
with Path(sys.argv[4]).open('x')as out:json.dump({'pins':pins,'source':'Actual xcrun SDK/compiler files; no private layouts'},out,indent=2)
PYSDK
python3 - "$own_sdk" "$own_clang" "$own_swift" "$script_dir" "$root" <<'PYCOMMANDS'
from pathlib import Path
import json,sys
sdk,clang,swift,source,run=sys.argv[1:];source=Path(source);run=Path(run)
commands=[[clang,'-isysroot',sdk,'-std=gnu11','-Wall','-Wextra','-Werror','-c',str(source/name),'-o',str(run/obj)]for name,obj in [('own-process-identity.c','own-process-identity.o'),('picker-child.c','picker-child.o')]]
commands.append([swift,'-sdk',sdk,'-swift-version','5','-import-objc-header',str(source/'picker-child.h'),str(source/'mac.swift'),str(run/'own-process-identity.o'),str(run/'picker-child.o'),'-lproc','-o',str(run/'mac-picker')])
with(run/'reports/compile-commands.json').open('x')as out:json.dump({'commands':commands,'sameSelectedSDK':sdk},out,indent=2)
PYCOMMANDS
"$own_clang" -isysroot "$own_sdk" -std=gnu11 -Wall -Wextra -Werror -c "$script_dir/own-process-identity.c" -o "$root/own-process-identity.o"
"$own_clang" -isysroot "$own_sdk" -std=gnu11 -Wall -Wextra -Werror -c "$script_dir/picker-child.c" -o "$root/picker-child.o"
"$own_swift" -sdk "$own_sdk" -swift-version 5 -import-objc-header "$script_dir/picker-child.h" "$script_dir/mac.swift" "$root/own-process-identity.o" "$root/picker-child.o" -lproc -o "$root/mac-picker"
"$root/mac-picker" "$root/Applications/FBones.app" "$root/reports" "$expected" "$script_dir"
