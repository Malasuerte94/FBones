"""ONE stock AppImage upgrade. Root runs only on the dedicated disposable CI VM."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys,time
from session import ControlSession,close_window,main_window,require,wait,write
from lifecycle import SuccessorObserver,enable_subreaper,process,same,tree,wait_adopted_exit
from native_access import NativePicker,native_successor_current_version
from appimage_identity import associate,installed_path,native_candidate

ROOT=Path(sys.argv[1]).resolve();BASE=Path(__file__).resolve().parent
require(sys.platform=='linux'and os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Linux','Dedicated hosted Linux only; no filesystem/process work elsewhere')
require(ROOT.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve())and ROOT!=Path(os.environ['RUNNER_TEMP']).resolve()and(ROOT/'reports').is_dir(),'Verified private existing run reports required')
report={'passed':False,'route':'linux-appimage','stage':'actual-upgrade-and-separate-open','automaticUpgradePassed':False,'persistencePassed':False,'dirtyCancelPassed':False,'secondSessionBeforeAutomaticClose':False,'signalsSentToNativeApps':0,'productMutationsThroughIPC':0}
old=fresh=observer=picker=None;started=time.monotonic()
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def stage(name):
 report['currentStage']=name;report.setdefault('stages',[]).append({'name':name,'seconds':time.monotonic()-started});(ROOT/'reports/progress.json').write_text(json.dumps(report,indent=2)+'\n')
def read(path):return json.loads(Path(path).read_text())
def checkpoint(path,bone,tag):
 result=subprocess.run([sys.executable,str(BASE/'own-minimal-checkpoint.py'),str(path),'--project-name',PROJECT,'--bone-name',bone,'--root-x','37.5','--out',str(ROOT/'reports'/tag)],stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=20)
 require(result.returncode==0,'Independent checkpoint failed: '+result.stderr.decode(errors='replace')[:2048]);proof=read(ROOT/'reports'/tag);require(proof['passed']and proof['sha256']==sha(path),'Independent checkpoint identity mismatch');return proof
def stable_file(path):
 last=None;count=0;end=time.monotonic()+5
 while time.monotonic()<end:
  if path.is_file():
   require(0<path.stat().st_size<=1024*1024,'Own tiny project file bound');current=sha(path);count=count+1 if current==last else 1;last=current
   if count==4:return current
  time.sleep(.1)
 raise TimeoutError('Own file did not stabilize')
def project_clean(s,name):
 state=s.state();return state if state['x']=='37.5'and state['boneName']==name and' * — FBones'not in state['title']and PROJECT in state['title']and state['dialog']is None else None
def updates(s):
 if not s.script("return document.querySelector('[data-testid=app-updates-toggle]')?.getAttribute('aria-expanded')==='true'"):s.click('[data-testid=app-updates-toggle]')
 return s.state()
def stop_tool(s):
 if s:s.stop_driver_after_native_exit()
def reap_known_aux(pids):
 rows=[]
 for pid in sorted(set(pids)):
  if pid==os.getpid():continue
  try:
   waited,status=os.waitpid(pid,os.WNOHANG);rows.append({'pid':pid,'waitedPid':waited,'rawWaitStatus':status,'knownOwnedHelperOnly':True})
  except ChildProcessError:pass
 return rows
def retain_session_receipts(phase):
 folder=ROOT/'sessions'/phase
 if not folder.exists():return[]
 output=ROOT/'reports'/('session-'+phase);output.mkdir();retained=[]
 for source in[folder/'launch-input.json',folder/'native-bound.json',folder/'appimage-bound.json',folder/'w3c-trace.json',folder/'controller-terminal.json',*sorted((folder/'reports').glob('*.json'))]:
  if source.is_file():
   data=source.read_bytes();require(len(data)<=2*1024*1024,'Session receipt bound');(output/source.name).write_bytes(data);retained.append(str(Path(output.name)/source.name))
 for name in['native-spool.log','driver-spool.log']:
  source=folder/name
  if source.exists():
   with source.open('rb')as stream:data=stream.read(65536)
   (output/name.replace('spool','prefix')).write_bytes(data)
 return retained

PROJECT='Own AppImage installed upgrade';BONE='Upgrade root'
try:
 require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Linux','Fresh hosted Linux only')
 require(ROOT.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve())and ROOT!=Path(os.environ['RUNNER_TEMP']).resolve(),'Private run root required')
 stock=read(ROOT/'reports/stock-package.json');target=read(ROOT/'reports/target-member.json');require(stock['route']==target['route']=='linux-appimage'and target['passed']and target['version']=='0.9.6','Verified old stock and independently premeasured target required')
 package=ROOT/stock['asset']['name'];require(sha(package)==stock['asset']['sha256'],'Old stock package changed');require(not(ROOT/'sessions').exists(),'No consumed prior control sessions')
 stage('initial-stock-0.9.5-install');require(Path('/dev/fuse').exists(),'Native AppImage FUSE unavailable; no extract-and-run fallback');installed=ROOT/'installed';installed.mkdir();image=installed_path(ROOT);package.rename(image);image.chmod(0o755);require(sha(image)==stock['asset']['sha256'],'Initial installed stock AppImage differs');report['installation']={'path':str(image),'outerSha256':sha(image),'nativeFUSERequired':True,'extractAndRun':False}
 report['subreaper']=enable_subreaper();stage('old-stock-native-control');old=ControlSession(ROOT,'old-0.9.5',stock['executableSha256'],9515);report['oldNative']=old.native
 stage('ordinary-new-project');old.click('button[aria-label="New project"]');wait(lambda:old.script("return !!document.querySelector('[role=dialog] #project-name')"));old.fill('#project-name',PROJECT);old.click('[role=dialog] form button[type=submit]');wait(lambda:old.script("return document.title.includes("+json.dumps(PROJECT)+")&&!!document.querySelector('[data-testid=bone-x]')"));old.fill('[data-testid=bone-x]','37.5\ue007');wait(lambda:old.state()['x']=='37.5')
 stage('native-baseline-save');projects=ROOT/'projects';projects.mkdir();saved=projects/'own-upgrade.fbones';require(not saved.exists(),'New initial Save path required');old.click('header button[aria-label="Save"]');picker=NativePicker(ROOT,old.native['pid'],old.native['startTicks'],old.window['window'],lambda p:process(p)['startTicks'],stock['executableSha256'],'Save','initial-save');picker.discover();picker.submit_once(saved);baseline_dom=wait(lambda:project_clean(old,'root'));baseline_sha=stable_file(saved);baseline=checkpoint(saved,'root','baseline-checkpoint.json');shutil.copyfile(saved,ROOT/'reports/baseline-own.fbones');report['baseline']={'sha256':baseline_sha,'dom':baseline_dom,'checkpoint':baseline};picker=None
 stage('actual-stock-ready-0.9.6');state=updates(old)
 if state['updatePhase']=='idle':old.click('[data-testid=app-update-check]')
 def ready():
  state=old.state();require(state['updatePhase']not in['error','unsupported'],'Stock updater failed: '+str(state['panel']))
  if state['updatePhase']=='available'and not report.get('manualDownloadIssued'):
   report['manualDownloadIssued']=True;old.click('[data-testid=app-update-download]')
  return state if state['updatePhase']=='ready'and state['updateStatus']=='Version 0.9.6 is ready to install.'and state['panel']and'Current version: 0.9.5'in state['panel']else None
 ready_state=wait(ready,120);report['ready']=ready_state
 stage('pending-name-then-dirty-install-cancel');old.fill('[data-testid=bone-name]',BONE);pending=old.state();require(pending['boneName']==BONE and pending['focused']=='bone-name','Valid pending bone-name input unobserved');report['pendingNameBeforeFlush']=pending;updates(old);old.click('[data-testid=app-update-install]');leave=wait(lambda:old.state()if old.state()['dialog']and'Leave this project?'in old.state()['dialog']else None);require('Save and continue'in leave['dialog']and'Discard changes'in leave['dialog']and'Cancel'in leave['dialog'],'Normal dirty lifecycle guard missing');old.click("//*[@role='dialog']//button[normalize-space(.)='Cancel']",'xpath')
 def canceled():
  state=old.state();return state if state['dialog']is None and state['boneName']==BONE and any(BONE in text for text in state['boneRows'])and state['x']=='37.5'and' * — FBones'in state['title']and state['updatePhase']=='ready'else None
 cancel_state=wait(canceled);cancel_ready=updates(old);require(cancel_ready['updatePhase']=='ready'and cancel_ready['updateStatus']=='Version 0.9.6 is ready to install.'and cancel_ready['panel']and'Current version: 0.9.5'in cancel_ready['panel'],'Cancel did not retain observed old/Ready target versions');old.identity();require(sha(saved)==baseline_sha,'Dirty Cancel changed the saved baseline');report['dirtyCancelPassed']=True;report['afterCancel']={'native':process(old.native['pid'],True),'dom':cancel_state,'ready':cancel_ready,'baselineFileUnchanged':True};old.screenshot('dirty-cancel.png')
 stage('ordinary-existing-path-save');old.click('header button[aria-label="Save"]');clean=wait(lambda:project_clean(old,BONE));renamed_sha=stable_file(saved);require(renamed_sha!=baseline_sha,'Authored rename was not saved');renamed=checkpoint(saved,BONE,'renamed-checkpoint.json');shutil.copyfile(saved,ROOT/'reports/renamed-own.fbones');report['savedBeforeInstall']={'sha256':renamed_sha,'dom':clean,'checkpoint':renamed}
 stage('one-clean-install-observe-owned-successor');updates(old);state=old.state();require(state['updatePhase']=='ready'and state['updateStatus']=='Version 0.9.6 is ready to install.'and state['dialog']is None and project_clean(old,BONE),'Clean Ready checkpoint required');report['stockAuthorizationTools']={name:shutil.which(name)for name in['pkexec','zenity','kdialog','sudo']};observer=SuccessorObserver(old.native['pid'],target['nativeSha256'],ROOT,target['package']['sha256']);observer.start();write(ROOT/'reports/clean-install-intent.json',{'oneCleanInstall':True,'oldNative':old.native,'savedSha256':renamed_sha,'independentTargetMemberSha256':target['nativeSha256'],'observerStartedBeforeInstall':True,'manualNewSessionCreated':False})
 report['cleanInstallIssued']=True
 try:old.click('[data-testid=app-update-install]');report['cleanInstallActionReturned']=True
 except Exception as response_error:report['cleanInstallResponseError']=type(response_error).__name__+': '+str(response_error)[:2048]
 adopted=wait(observer.adopted,180);old_terminal=old.wait_terminal();observer.finish();report['automaticProvenance']=observer.receipt();report['oldRetainedTerminal']=old_terminal;live_native=[r for r in tree().values()if native_candidate(r)];require(len(live_native)==1 and live_native[0]['pid']==adopted['pid'],'Automatic native descendants became ambiguous');require(sha(image)==target['package']['sha256'],'Actual installed0.9.6 outer AppImage differs');report['automaticAppImage']=associate(adopted['pid'],ROOT,target['nativeSha256'],target['package']['sha256']);auto_window=wait(lambda:main_window(adopted['pid']));require(' * — FBones'not in auto_window['title'],'Automatically launched app unexpectedly dirty')
 stage('one-native-updates-press-current-0.9.6-version');require(sha(saved)==renamed_sha,'Own checkpoint changed before native Updates action');native_version=native_successor_current_version(ROOT,adopted,target['nativeSha256'],auto_window['window']);require(same(process(adopted['pid'],True),adopted)and main_window(adopted['pid'])['window']==auto_window['window'],'Automatic native identity/window changed before close');close_window(auto_window['window']);auto_terminal=wait_adopted_exit(adopted);report['automaticSuccessor']={'native':adopted,'window':auto_window,'nativeCurrentVersion':native_version,'exactWaitTerminal':auto_terminal};require(sha(saved)==renamed_sha,'Upgrade changed own project bytes');stop_tool(old);report['automaticUpgradePassed']=True
 stage('separate-fresh-installed-0.9.6-persistence-session');require(not any(native_candidate(r)for r in tree().values()),'Another FBones descendant remains; no fresh session');report['freshSessionExplicitlyAfterAutomaticNormalExit']=True;fresh=ControlSession(ROOT,'fresh-0.9.6-persistence',target['nativeSha256'],9516);fresh.click('header button[aria-label="Open project"]');picker=NativePicker(ROOT,fresh.native['pid'],fresh.native['startTicks'],fresh.window['window'],lambda p:process(p)['startTicks'],target['nativeSha256'],'Open','fresh-open');picker.discover();picker.submit_once(saved,renamed_sha)
 reopened=wait(lambda:project_clean(fresh,BONE));require(any(BONE in text for text in reopened['boneRows'])and sha(saved)==renamed_sha,'Fresh installed Open semantic/byte preservation failed');fresh.screenshot('installed-0.9.6-reopened.png');report['freshPersistenceSession']={'native':fresh.native,'dom':reopened,'savedBytesUnchanged':True,'notAutomaticRebind':True};report['freshRetainedTerminal']=fresh.normal_close();stop_tool(fresh);report['persistencePassed']=True;picker=None
 report['passed']=report['dirtyCancelPassed']and report['automaticUpgradePassed']and report['persistencePassed'];stage('passed-native-appimage-upgrade-and-separate-open')
except Exception as error:
 report['error']=type(error).__name__+': '+str(error)
 if picker:
  try:picker.output('failure-inventory.json',{'error':report['error'],'intentReserved':picker.submitted,'controls':picker.rows[:200]})
  except Exception as receipt_error:report['pickerReceiptError']=str(receipt_error)
  try:report['pickerFailureCancel']=picker.cancel_before_submit()
  except Exception as cancel_error:report['pickerFailureCancelError']=str(cancel_error)
finally:
 if observer:
  try:observer.finish()
  except Exception as observer_error:report['observerError']=str(observer_error);report['passed']=False
  finally:report['automaticProvenance']=observer.receipt()
 report['failureCleanups']=[]
 for s in[old,fresh]:
  if s:
   if not report['passed']and(picker is None or report.get('pickerFailureCancel'))and(s is fresh or not report.get('cleanInstallIssued')):
    try:
     if process(s.native['pid'])['startTicks']==s.native['startTicks']:
      state=s.state()
      if state['dialog']is None and' * — FBones'not in state['title']:
       terminal=s.normal_close();s.stop_driver_after_native_exit();report['failureCleanups'].append({'phase':s.phase,'normalNativeTerminal':terminal,'capabilityStillFailed':True})
    except Exception as cleanup_error:report['failureCleanups'].append({'phase':s.phase,'error':str(cleanup_error),'forced':False})
   try:s.retain_prefixes()
   except Exception as log_error:report.setdefault('logErrors',[]).append(str(log_error))
 report['rawSpoolHardByteCap']=False
 if 'saved'in locals()and saved.is_file():
  try:
   require(0<saved.stat().st_size<=1024*1024,'Own checkpoint artifact size bound');report['finalOwnCheckpointSha256']=sha(saved)
   if 'renamed_sha'in locals():report['renamedCheckpointBytesUnchanged']=report['finalOwnCheckpointSha256']==renamed_sha;require(report['renamedCheckpointBytesUnchanged'],'Own renamed checkpoint changed')
  except Exception as checkpoint_error:report['finalCheckpointError']=str(checkpoint_error);report['passed']=False
 report['retainedSessionReceipts']=[]
 for phase in['old-0.9.5','fresh-0.9.6-persistence']:
  try:report['retainedSessionReceipts']+=retain_session_receipts(phase)
  except Exception as receipt_error:report.setdefault('sessionReceiptErrors',[]).append(str(receipt_error));report['passed']=False
 try:report['knownAuxReaps']=reap_known_aux([s.bound['wrapperPid']for s in[old,fresh]if s]);report['remainingOwnDirectChildren']=list(tree())
 except Exception as cleanup_error:report['auxCleanupError']=str(cleanup_error)
 write(ROOT/'reports/result.json',report)
print(json.dumps({'passed':report['passed'],'automaticUpgradePassed':report['automaticUpgradePassed'],'persistencePassed':report['persistencePassed'],'result':'result.json'}));raise SystemExit(0 if report['passed']else 2)
