#!/usr/bin/env python3
"""Own native launch/wait receipt only; unchanged stock app, no feature transport."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,time
if os.environ.get('GITHUB_ACTIONS')!='true'or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise ValueError('Dedicated hosted runner only')
root=Path(os.environ['FBONES_NATIVE_ROOT']).resolve()
if not root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()):raise ValueError('Own runner root required')
config=json.loads((root/'launch-input.json').read_text());image=Path(config['image']);stock=json.loads((root/'reports/stock-package.json').read_text())
if config['route']!=stock['route']or not(config['route']=='linux-deb'and image==Path('/usr/bin/fbones')or config['route']=='linux-appimage'and image==root/'installed/FBones.AppImage'):raise ValueError('Exact own stock installation path required')
reports=root/'reports';started=time.monotonic()
with(reports/'app-lifecycle-started.json').open('x')as f:json.dump({'wrapperPid':os.getpid(),'stage':'starting'},f)
nativeLog=(root/'native-spool.log').open('xb')
child=subprocess.Popen([str(image),*sys.argv[1:]],stdin=subprocess.DEVNULL,stdout=nativeLog,stderr=subprocess.STDOUT)
try:
 stat=(Path('/proc')/str(child.pid)/'stat').read_text();start=stat[stat.rfind(')')+2:].split()[19]
except FileNotFoundError:start=None
actual=None;deadline=time.monotonic()+20
while child.poll()is None and time.monotonic()<deadline:
 try:actual=hashlib.sha256((Path('/proc')/str(child.pid)/'exe').read_bytes()).hexdigest()
 except (FileNotFoundError,PermissionError,ProcessLookupError):actual=None
 if actual==stock['executableSha256']:break
 time.sleep(.1)
bound={'actualExecutableSha256':actual,'imageIdentityVerified':actual==stock['executableSha256'],'wrapperPid':os.getpid(),'processId':child.pid,'creationStartTicks':start,'route':config['route'],'stdio':'stdin-NUL-stdout-stderr-direct-own-file-no-pipes'}
with(reports/'app-lifecycle-bound.json').open('x')as f:json.dump(bound,f)
code=child.wait()
with(reports/'app-lifecycle.json').open('x')as f:json.dump(dict(bound,terminalObserved=True,exitCode=code,terminationKind='exit'if code>=0 else'signal',signal=-code if code<0 else None,seconds=time.monotonic()-started),f)
raise SystemExit(code if code>=0 else 128-code)
