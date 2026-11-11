#!/usr/bin/env python3
"""One explicit old/fresh-persistence native launch, retained wait, no feature API."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,time
from appimage_identity import associate,expected_outer,installed_path
def require(ok,message):
 if not ok:raise ValueError(message)
require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Linux','Hosted Linux only')
run=Path(os.environ['FBONES_UPGRADE_RUN']).resolve();session=Path(os.environ['FBONES_UPGRADE_SESSION']).resolve();require(run.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve())and session.parent==run/'sessions','Exact private session required')
config=json.loads((session/'launch-input.json').read_text());require(config['phase']in['old-0.9.5','fresh-0.9.6-persistence']and config['image']==str(installed_path(run)),'Fixed stock AppImage phase/image required')
stock=json.loads((run/'reports/stock-package.json').read_text());target=json.loads((run/'reports/target-member.json').read_text());expected=stock['executableSha256']if config['phase']=='old-0.9.5'else target['nativeSha256'];require(config['expectedNativeSha256']==expected,'Phase member proof mismatch')
reports=session/'reports';reports.mkdir();started=time.monotonic()
with(reports/'app-lifecycle-started.json').open('x')as f:json.dump({'wrapperPid':os.getpid(),'phase':config['phase']},f)
log=(session/'native-spool.log').open('xb');child=subprocess.Popen([config['image'],*sys.argv[1:]],stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,close_fds=True)
raw=(Path('/proc')/str(child.pid)/'stat').read_text();start=raw[raw.rfind(')')+2:].split()[19];actual=None;end=time.monotonic()+20
while child.poll()is None and time.monotonic()<end:
 try:actual=hashlib.sha256((Path('/proc')/str(child.pid)/'exe').read_bytes()).hexdigest()
 except(FileNotFoundError,PermissionError,ProcessLookupError):actual=None
 if actual==expected:break
 time.sleep(.1)
association=None;association_error=None
if actual==expected:
 try:association=associate(child.pid,run,expected,expected_outer(run,config['phase']));require(association['startTicks']==start,'Retained child kernel start differs during AppImage binding')
 except Exception as error:association_error=type(error).__name__+': '+str(error)
bound={'appimageAssociation':association,'associationError':association_error,'wrapperPid':os.getpid(),'phase':config['phase'],'processId':child.pid,'creationStartTicks':start,'actualExecutableSha256':actual,'imageIdentityVerified':actual==expected and association is not None,'stdio':'NULstdin/direct-own-file-stdout-stderr'}
with(reports/'app-lifecycle-bound.json').open('x')as f:json.dump(bound,f)
code=child.wait()
with(reports/'app-lifecycle.json').open('x')as f:json.dump(dict(bound,terminalObserved=True,exitCode=code,terminationKind='exit'if code>=0 else'signal',signal=-code if code<0 else None,seconds=time.monotonic()-started),f)
raise SystemExit(code if code>=0 else 128-code)
