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
python3 - "$script_dir" "$root" <<'PYFIXTURE'
from pathlib import Path
import base64,json,hashlib,sys
source,root=map(Path,sys.argv[1:]);fixture=json.loads((source/'own-existing-project.json').read_text())
raw=base64.b64decode(fixture['base64'],validate=True)
assert len(raw)==fixture['bytes']==405 and hashlib.sha256(raw).hexdigest()==fixture['sha256']=='e74a15b08b9cbc85f943ddde46c37c5cbceed3eb70968932ccd416697c6ecb5d'
(root/'projects').mkdir();(root/'projects/own-upgrade.fbones').write_bytes(raw)
with(root/'reports/fixture.json').open('x')as out:json.dump({k:v for k,v in fixture.items()if k!='base64'},out,indent=2)
PYFIXTURE
python3 "$script_dir/own-minimal-checkpoint.py" "$root/projects/own-upgrade.fbones" --project-name 'Own Debian installed upgrade' --bone-name 'Upgrade root' --root-x 37.5 --out "$root/reports/before-app-checkpoint.json"
xcrun --sdk macosx --show-sdk-version > "$root/reports/sdk-version.txt"
own_sdk="$(xcrun --sdk macosx --show-sdk-path)"
own_clang="$(xcrun --sdk macosx --find clang)"
own_swift="$(xcrun --sdk macosx --find swiftc)"
python3 - "$own_sdk" "$own_clang" "$own_swift" "$root/reports/compiler-sdk.json" <<'PYSDK'
from pathlib import Path
import hashlib,json,sys
sdk=Path(sys.argv[1]);paths=[Path(sys.argv[2]),Path(sys.argv[3]),Path('/usr/bin/osascript')]+[sdk/'usr/include'/name for name in ['libproc.h','sys/proc_info.h','sys/proc.h','sys/sysctl.h','sys/stat.h','sys/event.h','sys/wait.h']]
carbon_candidates=[sdk/'System/Library/Frameworks/Carbon.framework/Frameworks/HIToolbox.framework/Headers/Events.h',sdk/'System/Library/Frameworks/Carbon.framework/Versions/A/Frameworks/HIToolbox.framework/Versions/A/Headers/Events.h']
carbon=sorted({p.resolve()for p in carbon_candidates if p.is_file()})
paths+=carbon
ax_header=sdk/'System/Library/Frameworks/ApplicationServices.framework/Frameworks/HIServices.framework/Headers/AXUIElement.h'
assert ax_header.is_file(),'Actual selected public AXUIElement.h required'
paths.append(ax_header)
pins={str(p):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in paths}
with Path(sys.argv[4]).open('x')as out:json.dump({'pins':pins,'source':'Actual xcrun SDK/compiler files; no private layouts','deprecatedPublicAXHeader':str(ax_header),'carbonEventsHeaderPins':[str(p)for p in carbon],'carbonHeaderPinAvailability':'selected-header-pinned'if carbon else'not-resolved-by-two-known-SDK-paths; actual typed import/compile remains required'},out,indent=2)
PYSDK
python3 - "$own_sdk" "$own_clang" "$own_swift" "$script_dir" "$root" <<'PYCOMMANDS'
from pathlib import Path
import json,sys
sdk,clang,swift,source,run=sys.argv[1:];source=Path(source);run=Path(run)
commands=[[clang,'-isysroot',sdk,'-std=gnu11','-Wall','-Wextra','-Werror','-c',str(source/name),'-o',str(run/obj)]for name,obj in [('own-process-identity.c','own-process-identity.o'),('picker-child.c','picker-child.o'),('native-exit.c','native-exit.o'),('keyboard-bridge.c','keyboard-bridge.o')]]
commands.append([swift,'-sdk',sdk,'-swift-version','5','-import-objc-header',str(source/'own-core.h'),str(source/'mac.swift'),str(run/'own-process-identity.o'),str(run/'picker-child.o'),str(run/'native-exit.o'),str(run/'keyboard-bridge.o'),'-lproc','-o',str(run/'mac-upgrade')])
with(run/'reports/compile-commands.json').open('x')as out:json.dump({'commands':commands,'sameSelectedSDK':sdk},out,indent=2)
PYCOMMANDS
"$own_clang" -isysroot "$own_sdk" -std=gnu11 -Wall -Wextra -Werror -c "$script_dir/own-process-identity.c" -o "$root/own-process-identity.o"
"$own_clang" -isysroot "$own_sdk" -std=gnu11 -Wall -Wextra -Werror -c "$script_dir/picker-child.c" -o "$root/picker-child.o"
"$own_clang" -isysroot "$own_sdk" -std=gnu11 -Wall -Wextra -Werror -c "$script_dir/native-exit.c" -o "$root/native-exit.o"
"$own_clang" -isysroot "$own_sdk" -std=gnu11 -Wall -Wextra -Werror -c "$script_dir/keyboard-bridge.c" -o "$root/keyboard-bridge.o"
"$own_swift" -sdk "$own_sdk" -swift-version 5 -import-objc-header "$script_dir/own-core.h" "$script_dir/mac.swift" "$root/own-process-identity.o" "$root/picker-child.o" "$root/native-exit.o" "$root/keyboard-bridge.o" -lproc -o "$root/mac-upgrade"
"$root/mac-upgrade" "$root/Applications/FBones.app" "$root/reports" "$expected" "$script_dir"
